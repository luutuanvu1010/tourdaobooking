// ADR-0175 Đ3 (kế hoạch vé Tour Đảo Task 12): route quét vé và bỏ lượt quét, qua ứng dụng THẬT (khung thử dieu-phoi-khung, SQLite tạm, đồng hồ giả).
import { test, mock } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER_PARTNER, FIELD, INTERN, NGAY_SAU, PARTNER, SALES, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

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
/** Kho Tour Đảo 4 vé, đơn 2 khách đã xác nhận (giữ 2 vé), vé đã mở (giao). `ngay` = ngày đi. */
async function donDaMo(w: any, ngay?: string, mo = true) {
  NGUON(w, "TOUR_DAO");
  await loVaoKho(w, "TOUR_DAO", 4, 0);
  const d = await don(w, { soNguoi: 2, ...(ngay ? { ngay } : {}) });
  if (mo) assert.equal((await w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId: d.id, requestId: crypto.randomUUID() } })).status, 200);
  return d;
}
const maCuaDon = (w: any, id: string): string[] =>
  w.q("SELECT t.ticket_code AS ma FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL ORDER BY a.slot_no", id).map((r: { ma: string }) => r.ma);
const quet = (w: any, as: string, ma: string, xacNhan?: object) => w.call("POST", "/api/ve/quet", { as, body: { ma, ...(xacNhan ? { xacNhan } : {}) } });
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
