// ADR-0175 Đ3 (kế hoạch vé Tour Đảo Task 12): route quét vé và bỏ lượt quét, qua ứng dụng THẬT (khung thử dieu-phoi-khung, SQLite tạm, đồng hồ giả).
import { test, mock } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER_PARTNER, FIELD, INTERN, NGAY_SAU, PARTNER, SALES, SUP, batDongHo, don, donDoiTac, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { datQuaHan } from "../../../tests/audit/tra-sau-moc.mjs";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const AT = "2026-01-01T00:00:00.000Z";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MA_TD = /TD1\.[A-Z2-7]{26}/;
const NGUON = (w: any, nguon: string) =>
  w.sqlite.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', ?, ?, ?, ?)").run(crypto.randomUUID(), nguon, AT, AT, AT);

async function loVaoKho(w: any, nguon: "TOUR_DAO" | "HANG_NGOAI", soVe: number, lech: number) {
  const as = nguon === "TOUR_DAO" ? ACC : SALES;
  const lo = await w.call("POST", "/api/ve/lo", { as, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(i + 1 + lech), maVe: nguon === "TOUR_DAO" ? "TD1." + B32[i + lech]!.repeat(26) : `HN${i + 1 + lech}`, tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as, body: {} })).status, 200);
}
/** Kho Tour Đảo 4 vé, đơn 2 khách đã xác nhận (giữ 2 vé), vé đã mở (giao). `ngay` = ngày đi. `thu` = đã thu ĐỦ tiền (mặc định có: đặc tả 2.5 báo vàng «chưa thu đủ» theo cổng tiền, nên ca xanh phải gieo đơn thu đủ). */
async function donDaMo(w: any, ngay?: string, mo = true, thu = true) {
  NGUON(w, "TOUR_DAO");
  await loVaoKho(w, "TOUR_DAO", 4, 0);
  const d = await don(w, { soNguoi: 2, ...(ngay ? { ngay } : {}) });
  if (thu) {
    const tong = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.total as number;
    assert.equal((await w.call("POST", `/api/orders/${d.id}/payments`, { as: ADM, body: { soTien: tong, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  }
  if (mo) assert.equal((await w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId: d.id, requestId: crypto.randomUUID() } })).status, 200);
  return d;
}
const maCuaDon = (w: any, id: string): string[] =>
  w.q("SELECT t.ticket_code AS ma FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL ORDER BY a.slot_no", id).map((r: { ma: string }) => r.ma);
const quet = (w: any, as: string, ma: string, xacNhan?: object) => w.call("POST", "/api/ve/quet", { as, body: { ma, ...(xacNhan ? { xacNhan } : {}) } });
/** Chen một lượt DA_TINH của người khác thẳng vào sổ (mô phỏng hai máy quét cùng lúc). */
const chenDaTinh = (w: any, ticketId: string, by = SALES) =>
  w.sqlite.prepare(`INSERT INTO vdt_scan (id, ticket_id, ket_qua, scanned_at, scanned_by, created_at, updated_at) VALUES (?, ?, 'DA_TINH', ?, ?, ?, ?)`).run(crypto.randomUUID(), ticketId, new Date(Date.now() - 1000).toISOString(), by, "2027-03-11T00:00:00.000Z", "2027-03-11T00:00:00.000Z");
/** Chạy `viec` MỘT lần ngay trước câu SQL khớp `mau` đầu tiên của route (giữa lúc route đọc và lúc ghi). */
function truocCau(w: any, mau: RegExp, viec: () => void) {
  const goc = w.sqlite.prepare.bind(w.sqlite);
  let xong = false;
  w.sqlite.prepare = (sql: string) => { if (!xong && mau.test(sql)) { xong = true; viec(); } return goc(sql); };
}
const veId = (w: any, ma: string) => w.q("SELECT id FROM vdt_ticket WHERE ticket_code = ?", ma)[0].id as string;
const luot = (w: any, kq?: string): any[] => w.q(`SELECT * FROM vdt_scan ${kq ? "WHERE ket_qua = ?" : ""} ORDER BY scanned_at, id`, ...(kq ? [kq] : []));

test("Hướng dẫn viên quét vé đã mở hợp lệ → xanh, một DA_TINH; quét lại → đỏ «Đã dùng»; không lộ tên khách, SĐT, giá, mã vé", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    const r = await quet(w, FIELD, ma!);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.mau, "XANH");
    assert.equal(r.json.dichVu, "Tour đảo");
    assert.equal(r.json.nhomKhach, "Người lớn");
    assert.equal(r.json.soCuoi, ma!.slice(-4));
    assert.ok(r.json.lanQuetId);
    assert.equal(luot(w, "DA_TINH").length, 1);
    assert.equal(r.json.maDon, undefined, "Hướng dẫn viên không phụ trách đơn: không có order.view ⇒ không nhận mã đơn");
    assert.doesNotMatch(r.text, /Khách Liên Hệ|0912345678|777000|Khách Dò Tìm/);
    assert.doesNotMatch(r.text, MA_TD);
    const lai = await quet(w, FIELD, ma!);
    assert.equal(lai.status, 200);
    assert.equal(lai.json.mau, "DO");
    assert.equal(lai.json.ma, "DA_DUNG");
    assert.match(lai.json.cau, /^Đã dùng lúc \d\d:\d\d ngày \d\d\/\d\d bởi Hướng Dẫn$/);
    assert.equal(luot(w, "DA_TINH").length, 1, "quét lại không tính thêm");
    assert.equal(luot(w, "TU_CHOI").length, 1, "lượt từ chối có vé thật được ghi");
    assert.doesNotMatch(lai.text, MA_TD);
  } finally { tat(); }
});

test("người có order.view trên đơn (Bán hàng lập đơn, Quản trị) nhận mã đơn; Kế toán quét được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [m1, m2] = maCuaDon(w, d.id);
    const a = await quet(w, SALES, m1!);
    assert.equal(a.json.mau, "XANH");
    assert.equal(a.json.maDon, d.code);
    const b = await quet(w, ACC, m2!);
    assert.equal(b.status, 200, b.text);
    assert.equal(b.json.mau, "XANH");
    assert.equal(luot(w, "DA_TINH").length, 2);
  } finally { tat(); }
});

test("Tài xế công ty quét → xanh nhưng CHI_XEM, câu nói chưa tính; sau đó Hướng dẫn viên vẫn tính được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    const x = await quet(w, DRIVER, ma!);
    assert.equal(x.status, 200, x.text);
    assert.equal(x.json.mau, "XANH");
    assert.equal(x.json.ghi, "CHI_XEM");
    assert.match(x.json.cau, /chưa tính đã dùng/);
    assert.equal(luot(w, "DA_TINH").length, 0);
    assert.equal(luot(w, "CHI_XEM").length, 1);
    const t = await quet(w, FIELD, ma!);
    assert.equal(t.json.mau, "XANH");
    assert.equal(luot(w, "DA_TINH").length, 1, "Tài xế quét trước không làm vé thành đã dùng");
  } finally { tat(); }
});

test("hai yêu cầu quét song song cùng một vé → đúng một DA_TINH", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    const [a, b] = await Promise.all([quet(w, FIELD, ma!), quet(w, SALES, ma!)]);
    assert.equal(a.status, 200, a.text);
    assert.equal(b.status, 200, b.text);
    assert.deepEqual([a.json.ma, b.json.ma].sort(), ["DA_DUNG", "HOP_LE"]);
    assert.equal(luot(w, "DA_TINH").length, 1);
  } finally { tat(); }
});

test("vé hãng ngoài và mã lạ trả CÙNG một câu, không ghi dòng vdt_scan", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await loVaoKho(w, "HANG_NGOAI", 1, 0);
    const hn = w.q("SELECT ticket_code AS ma FROM vdt_ticket")[0].ma as string;
    const a = await quet(w, FIELD, hn);
    const b = await quet(w, FIELD, "TD1." + "Z".repeat(26));
    const c = await w.call("POST", "/api/ve/quet", { as: FIELD, body: { ma: 12345 } });
    const e = await quet(w, FIELD, "x".repeat(500));
    for (const r of [a, b, c, e]) {
      assert.equal(r.status, 200, r.text);
      assert.deepEqual(r.json, a.json);
    }
    assert.equal(a.json.cau, "Không phải vé Tour Đảo");
    assert.equal(a.json.mau, "DO");
    assert.equal(luot(w).length, 0);
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_quet'")[0].n, 0);
  } finally { tat(); }
});

test("vé còn trong kho (chưa cấp cho đơn) → đỏ CHUA_GIAO, có lượt TU_CHOI; vé đã cấp mà chưa mở cũng đỏ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w, undefined, false);
    const [chuaMo] = maCuaDon(w, d.id);
    const trong = w.q("SELECT t.ticket_code AS ma FROM vdt_ticket t WHERE t.status = 'AVAILABLE' LIMIT 1")[0].ma as string;
    const r = await quet(w, FIELD, trong);
    assert.equal(r.json.mau, "DO");
    assert.equal(r.json.ma, "CHUA_GIAO");
    assert.equal(r.json.cau, "Vé chưa được giao cho khách, báo văn phòng");
    const r2 = await quet(w, FIELD, chuaMo!);
    assert.equal(r2.json.ma, "CHUA_GIAO");
    assert.equal(luot(w, "TU_CHOI").length, 2);
    assert.equal(luot(w, "DA_TINH").length, 0);
    assert.equal(luot(w, "TU_CHOI").filter((l) => l.allocation_id === null).length, 1, "vé trong kho: không có phân bổ");
  } finally { tat(); }
});

test("đơn huỷ → vé chết, quét ra đỏ «Vé đã huỷ»", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    const h = await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    assert.equal(h.status, 200, h.text);
    const r = await quet(w, FIELD, ma!);
    assert.equal(r.json.ma, "VE_DA_HUY");
    assert.equal(r.json.cau, "Vé đã huỷ");
  } finally { tat(); }
});

test("lệch ngày đi → vàng, chưa ghi; gửi lại kèm xacNhan.lechNgay → ghi DA_TINH kèm cờ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w, NGAY_SAU);
    const [ma] = maCuaDon(w, d.id);
    const v = await quet(w, FIELD, ma!);
    assert.equal(v.status, 200, v.text);
    assert.equal(v.json.mau, "VANG");
    assert.equal(v.json.ma, "LECH_NGAY");
    assert.equal(v.json.ngayDi, NGAY_SAU);
    assert.equal(luot(w).length, 0, "vàng chưa xác nhận thì chưa ghi");
    const x = await quet(w, FIELD, ma!, { lechNgay: true });
    assert.equal(x.json.mau, "XANH");
    const [l] = luot(w, "DA_TINH");
    assert.equal(l.xac_nhan_lech_ngay, 1);
    assert.equal(l.xac_nhan_chua_thu, 0);
    assert.equal(l.xac_nhan_vuot_khach, 0);
  } finally { tat(); }
});

test("Đối tác, Thực tập, Tài xế đối tác → 403 ở cả hai route", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    for (const as of [PARTNER, INTERN, DRIVER_PARTNER]) {
      assert.equal((await quet(w, as, ma!)).status, 403, as);
      assert.equal((await w.call("POST", `/api/ve/quet/${crypto.randomUUID()}/bo`, { as, body: { lyDo: "quét nhầm vé" } })).status, 403, as);
    }
    assert.equal(luot(w).length, 0);
  } finally { tat(); }
});

test("bỏ lượt quét: người quét trong 5 phút được, sau 5 phút 403, Quản trị bất kỳ lúc nào; vé trở lại chưa dùng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [m1, m2] = maCuaDon(w, d.id);
    const q1 = await quet(w, FIELD, m1!);
    const q2 = await quet(w, FIELD, m2!);
    const bo = (as: string, id: string, lyDo = "quét nhầm vé") => w.call("POST", `/api/ve/quet/${id}/bo`, { as, body: { lyDo } });
    assert.equal((await bo(SALES, q1.json.lanQuetId)).status, 403, "người khác (không phải người quét, không phải Quản trị)");
    assert.equal((await bo(FIELD, q1.json.lanQuetId, "ngắn")).status, 400, "lý do dưới 5 ký tự");
    assert.equal((await bo(FIELD, q1.json.lanQuetId, `nhầm ${m1}`)).status, 400, "lý do không được chứa mã vé");
    const ok = await bo(FIELD, q1.json.lanQuetId);
    assert.equal(ok.status, 200, ok.text);
    assert.equal((await bo(FIELD, q1.json.lanQuetId)).status, 409, "bỏ lần hai");
    assert.equal((await quet(w, SALES, m1!)).json.mau, "XANH", "vé trở lại chưa dùng");
    mock.timers.tick(5 * 60_000 + 1000);
    assert.equal((await bo(FIELD, q2.json.lanQuetId)).status, 403, "quá 5 phút");
    assert.equal((await bo(ADM, q2.json.lanQuetId)).status, 200, "Quản trị bất kỳ lúc nào");
    assert.equal((await quet(w, FIELD, m2!)).json.mau, "XANH");
    assert.equal((await bo(ADM, crypto.randomUUID())).status, 404);
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_bo_luot_quet'")[0].n, 2);
  } finally { tat(); }
});

test("nhật ký quét và mọi phản hồi không chứa mã vé đủ; nhật ký chỉ có 4 ký tự cuối", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    const texts: string[] = [];
    texts.push((await quet(w, FIELD, ma!)).text, (await quet(w, FIELD, ma!)).text, (await quet(w, DRIVER, ma!)).text);
    const nk = w.q("SELECT action, detail, target_id FROM audit_log WHERE action IN ('ve_quet', 've_bo_luot_quet')");
    assert.ok(nk.length >= 1);
    for (const r of nk) assert.doesNotMatch(`${r.detail} ${r.target_id}`, MA_TD);
    for (const t of texts) assert.doesNotMatch(t, MA_TD);
    assert.match(nk.find((r: any) => r.action === "ve_quet").detail, new RegExp(`số cuối ${ma!.slice(-4)}`));
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_scan WHERE ticket_id IN (SELECT id FROM vdt_ticket WHERE ticket_code = ?)", ma)[0].n, 3);
  } finally { tat(); }
});

test("vàng «chưa thu đủ» theo cổng tiền: người có money.view thấy số còn thiếu, người khác chỉ thấy câu chung; xác nhận rồi mới ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w, undefined, true, false);
    const [m1] = maCuaDon(w, d.id);
    const cu = await quet(w, FIELD, m1!);
    assert.equal(cu.json.mau, "VANG");
    assert.equal(cu.json.ma, "CHUA_THU_DU");
    assert.equal(cu.json.cau, "Đơn chưa thu đủ, báo văn phòng trước khi thu khách", "Hướng dẫn viên không có money.view: không thấy số tiền");
    const co = await quet(w, SALES, m1!);
    assert.equal(co.json.ma, "CHUA_THU_DU");
    assert.match(co.json.cau, /^Đơn chưa thu đủ, còn thiếu [\d.]+ đ, báo văn phòng/);
    assert.equal(luot(w).length, 0, "vàng chưa xác nhận thì chưa ghi");
    const x = await quet(w, FIELD, m1!, { chuaThu: true });
    assert.equal(x.json.mau, "XANH");
    const [l] = luot(w, "DA_TINH");
    assert.equal(l.xac_nhan_chua_thu, 1);
    assert.equal(l.xac_nhan_lech_ngay, 0);
  } finally { tat(); }
});

test("đơn đối tác chưa thu: vé chưa được mở nên ra «chưa giao» trước, không phải vàng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 2, 0);
    const d = await donDoiTac(w, { soNguoi: 2 });
    const [ma] = maCuaDon(w, d.id);
    assert.ok(ma, "chống bài rỗng: đơn đối tác có vé Tour Đảo");
    const r = await quet(w, FIELD, ma!);
    assert.equal(r.json.ma, "CHUA_GIAO");
    assert.equal(r.json.mau, "DO");
  } finally { tat(); }
});

test("thua cạnh tranh (có chỉ mục): lượt DA_TINH của người khác chen giữa lúc đọc và lúc ghi → bên thua nhận «Đã dùng lúc … bởi …», không lanQuetId, không nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    truocCau(w, /INSERT OR IGNORE INTO vdt_scan/, () => chenDaTinh(w, veId(w, ma!)));
    const r = await quet(w, FIELD, ma!);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ma, "DA_DUNG");
    assert.match(r.json.cau, /^Đã dùng lúc \d\d:\d\d ngày \d\d\/\d\d bởi An$/);
    assert.equal(r.json.lanQuetId, undefined);
    assert.equal(luot(w, "DA_TINH").length, 1, "chỉ lượt của bên thắng");
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_quet'")[0].n, 0, "gác changes() > 0: bên thua không có dòng nhật ký");
  } finally { tat(); }
});

test("thua cạnh tranh (gác chèn đứng một mình, chỉ mục bị gỡ): vẫn một DA_TINH, không nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    w.sqlite.exec("DROP INDEX vdt_scan_mot_lan");
    truocCau(w, /INSERT OR IGNORE INTO vdt_scan/, () => chenDaTinh(w, veId(w, ma!)));
    const r = await quet(w, FIELD, ma!);
    assert.equal(r.json.ma, "DA_DUNG");
    assert.equal(r.json.lanQuetId, undefined);
    assert.equal(luot(w, "DA_TINH").length, 1);
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_quet'")[0].n, 0);
  } finally { tat(); }
});

test("gác chèn: vé vừa bị vô hiệu giữa lúc đọc và lúc ghi → 409, không có lượt, không nhật ký, không lanQuetId", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    truocCau(w, /INSERT OR IGNORE INTO vdt_scan/, () => w.sqlite.prepare("UPDATE vdt_ticket SET status = 'VOID', updated_at = ? WHERE ticket_code = ?").run("2027-03-11T00:00:00.000Z", ma));
    const r = await quet(w, FIELD, ma!);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.lanQuetId, undefined);
    assert.equal(luot(w).length, 0);
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_quet'")[0].n, 0);
  } finally { tat(); }
});

test("gác nhật ký bỏ lượt: hai người cùng bỏ một lượt, bên thua nhận 409 và không có dòng nhật ký thứ hai", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    const q = await quet(w, FIELD, ma!);
    truocCau(w, /UPDATE vdt_scan SET voided_at/, () => w.sqlite.prepare("UPDATE vdt_scan SET voided_at = ?, voided_by = ?, void_reason = 'bỏ trước', updated_at = ?, updated_by = ? WHERE id = ?").run("2027-03-11T00:00:00.000Z", ADM, "2027-03-11T00:00:00.000Z", ADM, q.json.lanQuetId));
    const r = await w.call("POST", `/api/ve/quet/${q.json.lanQuetId}/bo`, { as: FIELD, body: { lyDo: "quét nhầm vé" } });
    assert.equal(r.status, 409, r.text);
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_bo_luot_quet'")[0].n, 0, "gác changes() > 0");
    assert.equal(luot(w)[0].voided_by, ADM);
  } finally { tat(); }
});

test("lý do bỏ lượt: không chứa mã vé (cả khi tách hoặc viết thường) hay chuỗi 9 chữ số trở lên", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const [ma] = maCuaDon(w, d.id);
    const q = await quet(w, FIELD, ma!);
    const bo = (lyDo: string) => w.call("POST", `/api/ve/quet/${q.json.lanQuetId}/bo`, { as: FIELD, body: { lyDo } });
    const tach = ma!.toLowerCase().replace(/(.{6})/g, "$1 - ");
    for (const lyDo of [`nhầm ${ma}`, `nhầm ${ma!.toLowerCase()}`, `nhầm ${tach}`, "khách đọc số 0912 345 678", "số 091-234-5678 nhầm"]) {
      const r = await bo(lyDo);
      assert.equal(r.status, 400, lyDo);
      assert.equal(r.json.error.message, "Lý do không được chứa số điện thoại hoặc mã vé.");
    }
    assert.equal((await bo("nhầm 12345678 chữ số")).status, 200, "8 chữ số thì được");
  } finally { tat(); }
});

test("ranh giới 5 phút: đúng 5:00 người quét bỏ được, 5:01 thì không; Toàn quyền bất kỳ lúc nào; Quản lý bán hàng và Nhân sự bỏ lượt người khác → 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    for (const [id, phone, perms] of [["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "0900000041", ["SALES_MANAGER", "SALES"]], ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "0900000042", ["HR"]]] as [string, string, string[]][]) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-2)}`, perms });
    const QLBH = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
    const HCNS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
    const d = await donDaMo(w);
    const [m1, m2] = maCuaDon(w, d.id);
    const bo = (as: string, id: string) => w.call("POST", `/api/ve/quet/${id}/bo`, { as, body: { lyDo: "quét nhầm vé" } });
    const q1 = await quet(w, FIELD, m1!);
    const q2 = await quet(w, FIELD, m2!);
    mock.timers.tick(5 * 60_000);
    assert.equal((await bo(QLBH, q1.json.lanQuetId)).status, 403, "Quản lý bán hàng bỏ lượt của người khác");
    assert.equal((await bo(HCNS, q1.json.lanQuetId)).status, 403, "Nhân sự không có ô quét");
    assert.equal((await bo(FIELD, q1.json.lanQuetId)).status, 200, "đúng 5:00 vẫn trong hạn");
    mock.timers.tick(1000);
    assert.equal((await bo(FIELD, q2.json.lanQuetId)).status, 403, "5:01 ngoài hạn");
    assert.equal((await bo(SUP, q2.json.lanQuetId)).status, 200, "Toàn quyền bất kỳ lúc nào");
  } finally { tat(); }
});

// ===== I-4 (người kiểm cuối đợt): cổng tiền khi quét theo ĐƠN TRẢ SAU — `moTheoTien`, không phải `thuDu` =====
/** Đơn Trả sau của Đối tác (hạn mức do Toàn quyền cấp) đã xác nhận, vé Tour Đảo đã mở (giao). Chưa thu đồng nào. */
async function donTraSauDaMo(w: any) {
  NGUON(w, "TOUR_DAO");
  await loVaoKho(w, "TOUR_DAO", 2, 0);
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: `pty-${PARTNER}`, hanMuc: 50_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: { customerName: "Khách Thử", customerPhone: "0912345678", paymentTerm: "CREDIT",
    services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: "2027-03-11", pickupChoice: "DON",
      legs: [{ direction: "OUT", pickupDate: "2027-03-11", pickupTime: null, pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: null, dropoffPlace: "" }] }] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  assert.ok(g.status < 300, g.text);
  const yc = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0];
  if (yc) {
    const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", id)[0].u;
    const x = await w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: ADM, body: { yeuCauId: yc.id, updatedAt: moc, ketQua: "CON_VE", gioDon: [{ legId: r.json.order.services[0].legs[0].id, pickupTime: "13:00" }] } });
    assert.equal(x.status, 200, x.text);
  }
  assert.equal(w.q("SELECT payment_term t FROM orders WHERE id = ?", id)[0].t, "CREDIT");
  assert.equal(w.q("SELECT count(*) n FROM bil_payment_receipt WHERE order_id = ?", id)[0].n, 0, "chưa thu đồng nào");
  const giao = await w.call("POST", "/api/ve/giao", { as: ADM, body: { orderId: id, requestId: crypto.randomUUID() } });
  assert.equal(giao.status, 200, giao.text);
  return id;
}

test("cổng tiền khi quét: đơn Trả sau TRONG hạn, chưa thu đồng nào → XANH (không vàng «chưa thu đủ»)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const id = await donTraSauDaMo(w);
    const [ma] = maCuaDon(w, id);
    assert.ok(ma, "chống bài rỗng: đơn có vé Tour Đảo");
    const r = await quet(w, FIELD, ma!);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ma, "HOP_LE");
    assert.equal(r.json.mau, "XANH");
    assert.equal(luot(w, "DA_TINH").length, 1);
  } finally { tat(); }
});

test("cổng tiền khi quét: đơn Trả sau QUÁ hạn còn nợ → VÀNG «chưa thu đủ», chưa ghi lượt", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const id = await donTraSauDaMo(w);
    datQuaHan(w.sqlite, id);
    const [ma] = maCuaDon(w, id);
    assert.ok(ma, "chống bài rỗng: đơn có vé Tour Đảo");
    const r = await quet(w, FIELD, ma!);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ma, "CHUA_THU_DU");
    assert.equal(r.json.mau, "VANG");
    assert.equal(luot(w).length, 0, "vàng chưa xác nhận thì không ghi");
  } finally { tat(); }
});

test("GET /api/ve/don/:id: lỗi đọc số vé đã dùng không làm hỏng cả khối vé — vẫn 200, «đã dùng» về 0", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDaMo(w);
    const loi = mock.method(console, "error", () => {});
    const goc = w.sqlite.prepare.bind(w.sqlite);
    w.sqlite.prepare = (sql: string) => { if (/vdt_scan/.test(sql)) throw new Error("đọc hỏng"); return goc(sql); };
    const r = await w.call("GET", `/api/ve/don/${d.id}`, { as: ADM });
    w.sqlite.prepare = goc;
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.dichVu[0].daDung, 0);
    assert.ok(loi.mock.calls.some((c: any) => c.arguments[0] === "ve_da_dung_loi"), "chống bài rỗng: lỗi có bị đọc (đã ghi log) chứ không phải nhánh khác");
    loi.mock.restore();
  } finally { tat(); }
});
