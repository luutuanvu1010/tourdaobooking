// ADR-0217 (kế hoạch 2026-11-17 Phần A): số sê-ri, gõ số sê-ri ở Quét vé, huỷ vé lẻ, huỷ lô đã cấp, danh sách vé của lô — qua ứng dụng THẬT (khung thử dieu-phoi-khung, SQLite tạm).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, FIELD, SALES, SUP, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { CHECKS } from "../../../scripts/audit-checks.mjs";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const AT = "2026-01-01T00:00:00.000Z";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MA_TD = /TD1\.[A-Z2-7]{26}/;
const SERI = /^VE_[A-Z]{8}$/;
const NGUON = (w: any, nguon: string) =>
  w.sqlite.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', ?, ?, ?, ?)").run(crypto.randomUUID(), nguon, AT, AT, AT);

/** Lô vào kho (đã xác nhận). Tour Đảo do Kế toán nhập (có số sê-ri cấp lúc mở lô), hãng ngoài do Bán hàng. `lech` tránh trùng mã vé giữa các lô. Trả mã lô và số sê-ri của các vé. */
async function loVaoKho(w: any, nguon: "TOUR_DAO" | "HANG_NGOAI", soVe: number, lech: number) {
  const as = nguon === "TOUR_DAO" ? ACC : SALES;
  const lo = await w.call("POST", "/api/ve/lo", { as, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon, ...(nguon === "TOUR_DAO" ? { soVeDuKien: soVe } : {}) } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(i + 1 + lech), maVe: nguon === "TOUR_DAO" ? "TD1." + B32[i + lech]!.repeat(26) : `HN${i + 1 + lech}`, tuNgay: "2027-01-01", denNgay: "2027-12-31", ...(nguon === "TOUR_DAO" ? { soSeri: lo.json.soSeri[i] } : {}) }));
  const them = await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as, body: { ve } });
  assert.equal(them.json.themDuoc, soVe, them.text);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as, body: {} })).status, 200);
  return { loId: lo.json.loId as string, soSeri: them.json.veDaNhap.map((v: any) => v.soSeri) as string[] };
}
const thu = async (w: any, d: any) => {
  const tong = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.total as number;
  assert.equal((await w.call("POST", `/api/orders/${d.id}/payments`, { as: ADM, body: { soTien: tong, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
};
const giao = async (w: any, d: any) => assert.equal((await w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId: d.id, requestId: crypto.randomUUID() } })).status, 200);
/** Đơn thu đủ; `mo` = đã giao (vé có dấu lộ). */
async function donCoVe(w: any, soNguoi: number, mo: boolean) {
  const d = await don(w, { soNguoi });
  await thu(w, d);
  if (mo) await giao(w, d);
  return d;
}
const veCuaDon = (w: any, id: string): { serial: string; ma: string }[] =>
  w.q("SELECT t.serial AS serial, t.ticket_code AS ma FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL ORDER BY a.slot_no", id);
const quet = (w: any, as: string, ma: string, xacNhan?: object) => w.call("POST", "/api/ve/quet", { as, body: { ma, ...(xacNhan ? { xacNhan } : {}) } });
const huy = (w: any, as: string, soSeri: string, lyDo = "In sai ngày, huỷ vé", extra: object = {}) => w.call("POST", "/api/ve/huy-ve", { as, body: { soSeri, lyDo, ...extra } });
/** Huỷ vé ĐÃ GỬI khách: kèm bốn chữ cuối số sê-ri (chủ chốt 18/11). */
const huyDaGui = (w: any, as: string, soSeri: string, lyDo = "In sai ngày, huỷ vé") => huy(w, as, soSeri, lyDo, { xacNhanBonCuoi: soSeri.slice(-4) });
const trangThai = (w: any, serial: string) => w.q("SELECT status, voided_at, voided_by, void_reason FROM vdt_ticket WHERE serial = ?", serial)[0];
const luot = (w: any): any[] => w.q("SELECT * FROM vdt_scan ORDER BY scanned_at, id");
/** Mọi bất biến R-VDT-* (scripts/audit-checks.mjs) vẫn bằng 0 sau các trạng thái MỚI của ADR-0217: lô VOID còn vé giữ nguyên, vé VOID có dấu huỷ, suất trả THU_HOI. */
const batBienVeSach = (w: any) => {
  const ds = CHECKS.filter((c: { code: string; level: string }) => c.code.startsWith("R-VDT-") && c.level === "fail");
  assert.ok(ds.length >= 7, "có đủ bất biến kho vé để kiểm");
  for (const c of ds) assert.equal(Number(Object.values(w.sqlite.prepare(c.sql).get() as Record<string, unknown>)[0]), 0, c.code);
};
const khongLoMa = (text: string) => { assert.doesNotMatch(text, MA_TD); assert.doesNotMatch(text, /vdt\/|storage_key|ticket_code/); };

// ======================================================================= A2: cấp số ==================================================================================
test("mở lô Tour Đảo: bắt buộc soVeDuKien; máy chủ cấp đúng số sê-ri vào sổ cho lô; lô hãng ngoài không cấp trước", async () => {
  const w = setup();
  const thieu = await w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon: "TOUR_DAO" } });
  assert.equal(thieu.status, 400, thieu.text);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_batch")[0].n, 0, "không để lại lô dở");
  const lo = await w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon: "TOUR_DAO", soVeDuKien: 3 } });
  assert.equal(lo.status, 201, lo.text);
  assert.equal(lo.json.soSeri.length, 3);
  for (const s of lo.json.soSeri) assert.match(s, SERI);
  assert.equal(new Set(lo.json.soSeri).size, 3);
  assert.deepEqual(w.q("SELECT serial FROM vdt_serial WHERE batch_id = ? ORDER BY serial", lo.json.loId).map((r: any) => r.serial), [...lo.json.soSeri].sort());
  const hn = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Hãng ngoài", soVeDuKien: 5 } });
  assert.equal(hn.status, 201, hn.text);
  assert.deepEqual(hn.json.soSeri, []);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_serial WHERE batch_id = ?", hn.json.loId)[0].n, 0);
});

test("thêm vé vào lô Tour Đảo: phải mang số sê-ri đã cấp cho CHÍNH lô, chưa vé nào dùng; sai ⇒ loại vé đó với lý do thường", async () => {
  const w = setup();
  const a = await w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon: "TOUR_DAO", soVeDuKien: 3 } });
  const b = await w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo 2", nguon: "TOUR_DAO", soVeDuKien: 1 } });
  const v = (i: number, soSeri?: string) => ({ noiDung: PNG(i), maVe: "TD1." + B32[i]!.repeat(26), tuNgay: "2027-01-01", denNgay: "2027-12-31", ...(soSeri ? { soSeri } : {}) });
  const r = await w.call("POST", `/api/ve/lo/${a.json.loId}/ve`, { as: ACC, body: { ve: [v(1), v(2, "VE_ZZZZZZZZ"), v(3, b.json.soSeri[0]), v(4, a.json.soSeri[0].toLowerCase()), v(5, a.json.soSeri[0])] } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.loai.length, 4, JSON.stringify(r.json.loai));
  for (const l of r.json.loai) assert.ok(l.lyDo.length > 5);
  // vé thứ tư (chữ thường) khớp số đầu và vé thứ năm dùng lại đúng số đó: cái đứng trước vào, cái sau bị loại vì trùng trong đợt
  assert.equal(r.json.themDuoc, 1);
  assert.equal(r.json.veDaNhap.length, 1);
  assert.equal(r.json.veDaNhap[0].soSeri, a.json.soSeri[0]);
  assert.equal(w.q("SELECT serial FROM vdt_ticket")[0].serial, a.json.soSeri[0]);
  khongLoMa(r.text);
  // số đã có vé dùng thì không dùng lại ở đợt sau
  const lai = await w.call("POST", `/api/ve/lo/${a.json.loId}/ve`, { as: ACC, body: { ve: [v(6, a.json.soSeri[0])] } });
  assert.equal(lai.json.themDuoc, 0);
  assert.equal(lai.json.loai.length, 1);
  const tiep = await w.call("POST", `/api/ve/lo/${a.json.loId}/ve`, { as: ACC, body: { ve: [v(6, a.json.soSeri[1])] } });
  assert.equal(tiep.json.themDuoc, 1, tiep.text);
});

test("thêm vé vào lô hãng ngoài: máy chủ cấp số sê-ri cho từng vé (vào sổ trước, vé sau), trả về ở veDaNhap; không nhận số do máy khách gửi", async () => {
  const w = setup();
  const lo = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Hãng ngoài" } });
  const r = await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: SALES, body: { ve: [1, 2, 3].map((i) => ({ noiDung: PNG(i), maVe: `HN${i}`, tuNgay: "2027-01-01", denNgay: "2027-12-31", soSeri: "VE_AAAAAAAA" })) } });
  assert.equal(r.json.themDuoc, 3, r.text);
  const so = r.json.veDaNhap.map((v: any) => v.soSeri);
  for (const s of so) { assert.match(s, SERI); assert.notEqual(s, "VE_AAAAAAAA"); }
  assert.equal(new Set(so).size, 3);
  assert.deepEqual(w.q("SELECT serial FROM vdt_ticket ORDER BY serial").map((x: any) => x.serial), [...so].sort());
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_serial WHERE batch_id = ?", lo.json.loId)[0].n, 3);
});

// ======================================================================= A3: gõ số sê-ri ============================================================================
test("gõ số sê-ri (chữ thường, có khoảng trắng): vàng NHẬP TAY chưa ghi; xác nhận ⇒ xanh, DA_TINH, nhap_tay = 1, nhật ký «nhập tay» kèm số sê-ri; quét QR cùng vé không có cờ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 4, 0);
    const d = await donCoVe(w, 2, true);
    const [v1, v2] = veCuaDon(w, d.id);
    const go = ` ${v1!.serial.toLowerCase().slice(0, 5)} ${v1!.serial.toLowerCase().slice(5)} `;
    const a = await quet(w, FIELD, go);
    assert.equal(a.status, 200, a.text);
    assert.equal(a.json.mau, "VANG");
    assert.equal(a.json.ma, "NHAP_TAY");
    assert.equal(a.json.ghi, null);
    assert.equal(a.json.soSeri, v1!.serial);
    assert.equal(a.json.dichVu, "Tour đảo");
    assert.equal(luot(w).length, 0, "chưa xác nhận thì chưa ghi gì");
    const b = await quet(w, FIELD, v1!.serial, { nhapTay: true });
    assert.equal(b.json.mau, "XANH");
    assert.equal(b.json.ghi, "DA_TINH");
    assert.ok(b.json.lanQuetId);
    assert.equal(luot(w).length, 1);
    assert.equal(luot(w)[0].nhap_tay, 1);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 've_quet'")[0].detail as string;
    assert.match(nk, /nhập tay/);
    assert.ok(nk.includes(v1!.serial));
    khongLoMa(a.text + b.text + nk);
    // quét lại bằng số sê-ri: đã dùng (đỏ), không cần xác nhận
    const c = await quet(w, FIELD, v1!.serial);
    assert.equal(c.json.ma, "DA_DUNG");
    // quét QR vé còn lại: không vàng nhập tay, cờ 0
    const q = await quet(w, FIELD, v2!.ma);
    assert.equal(q.json.ma, "HOP_LE");
    assert.equal(w.q("SELECT s.nhap_tay AS n FROM vdt_scan s JOIN vdt_ticket t ON t.id = s.ticket_id WHERE t.serial = ?", v2!.serial)[0].n, 0, "quét QR không mang cờ nhập tay");
    assert.equal(q.json.soSeri, v2!.serial);
  } finally { tat(); }
});

test("gõ số sê-ri: số lạ và số của vé hãng ngoài trả CÙNG một câu đỏ, không ghi lượt; Tài xế công ty chỉ xem (CHI_XEM) sau khi xác nhận", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    const hn = await loVaoKho(w, "HANG_NGOAI", 1, 0);
    await loVaoKho(w, "TOUR_DAO", 3, 5);
    const la = await quet(w, FIELD, "VE_ZZZZZZZZ");
    const h = await quet(w, FIELD, hn.soSeri[0]!);
    assert.equal(la.json.ma, "KHONG_PHAI_VE_TD");
    assert.deepEqual({ ...h.json, soSeri: undefined }, { ...la.json, soSeri: undefined });
    assert.equal(luot(w).length, 0);
    const d = await donCoVe(w, 1, true);
    const [v] = veCuaDon(w, d.id);
    assert.equal((await quet(w, DRIVER, v!.serial)).json.ma, "NHAP_TAY");
    const x = await quet(w, DRIVER, v!.serial, { nhapTay: true });
    assert.equal(x.json.ghi, "CHI_XEM");
    assert.equal(luot(w)[0].ket_qua, "CHI_XEM");
    assert.equal(luot(w)[0].nhap_tay, 1);
  } finally { tat(); }
});

test("gõ số sê-ri của vé chưa giao: đỏ CHUA_GIAO (đỏ đứng trước vàng nhập tay), vẫn có lượt TU_CHOI mang cờ nhập tay", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    const kho = await loVaoKho(w, "TOUR_DAO", 2, 0);
    const r = await quet(w, FIELD, kho.soSeri[0]!);
    assert.equal(r.json.mau, "DO");
    assert.equal(r.json.ma, "CHUA_GIAO");
    assert.equal(luot(w).length, 1);
    assert.equal(luot(w)[0].ket_qua, "TU_CHOI");
    assert.equal(luot(w)[0].nhap_tay, 1);
  } finally { tat(); }
});

// ======================================================================= A4: huỷ vé lẻ ===============================================================================
test("huỷ vé trong kho: VOID, dấu huỷ, nhật ký có số sê-ri và lý do; quét ra «Vé đã huỷ»; không lộ mã vé", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    const kho = await loVaoKho(w, "TOUR_DAO", 3, 0);
    const r = await huy(w, ACC, kho.soSeri[0]!);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, { soSeri: kho.soSeri[0], trangThai: "DA_HUY", traSuat: false, veThay: null, canGuiLai: false });
    const t = trangThai(w, kho.soSeri[0]!);
    assert.equal(t.status, "VOID");
    assert.equal(t.voided_by, ACC);
    assert.equal(t.void_reason, "In sai ngày, huỷ vé");
    const nk = w.q("SELECT detail, target_id FROM audit_log WHERE action = 've_huy_ve'");
    assert.equal(nk.length, 1);
    assert.ok(nk[0].detail.includes(kho.soSeri[0]) && nk[0].detail.includes("In sai ngày"));
    assert.equal(nk[0].target_id, kho.soSeri[0]);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_allocation")[0].n, 0);
    khongLoMa(r.text + JSON.stringify(nk));
    assert.equal((await quet(w, FIELD, kho.soSeri[0]!)).json.ma, "VE_DA_HUY");
    // vé huỷ không được giữ cho đơn sau này
    const d = await don(w, { soNguoi: 2 });
    const giu = veCuaDon(w, d.id).map((v) => v.serial);
    assert.equal(giu.length, 2);
    assert.ok(!giu.includes(kho.soSeri[0]!));
    // huỷ lần hai: 409 đã huỷ
    const lai = await huy(w, ACC, kho.soSeri[0]!);
    assert.equal(lai.status, 409);
    assert.equal(lai.json.error?.code ?? lai.json.code, "ve_da_huy");
  } finally { tat(); }
});

test("huỷ vé đã giữ cho đơn (chưa mở): trả suất THU_HOI, vé VOID, máy tự cấp vé thay từ kho (chưa gửi); đơn vẫn đủ suất", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 4, 0);
    const d = await donCoVe(w, 2, false);
    const [v1, v2] = veCuaDon(w, d.id);
    const r = await huy(w, ACC, v1!.serial);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.traSuat, true);
    assert.equal(r.json.veThay, "DA_CAP");
    assert.equal(r.json.canGuiLai, false);
    assert.equal(trangThai(w, v1!.serial).status, "VOID");
    assert.equal(w.q("SELECT release_reason FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE t.serial = ?", v1!.serial)[0].release_reason, "THU_HOI");
    const sau = veCuaDon(w, d.id);
    assert.equal(sau.length, 2, "đơn vẫn đủ hai suất");
    assert.ok(sau.some((v) => v.serial === v2!.serial));
    assert.ok(!sau.some((v) => v.serial === v1!.serial));
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_allocation a WHERE a.order_id = ? AND a.revealed_at IS NOT NULL", d.id)[0].n, 0, "vé thay chưa gửi");
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_tra_ve' AND order_id = ?", d.id)[0].n >= 1, true);
  } finally { tat(); }
});

test("huỷ vé đã mở (Tour Đảo): được, canGuiLai = true, vé cũ quét ra đỏ, vé thay cấp cho đơn; hết vé thì veThay = THIEU và ghi «thiếu vé»", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 3, 0);
    const d = await donCoVe(w, 2, true);
    const [v1, v2] = veCuaDon(w, d.id);
    const r = await huyDaGui(w, ACC, v1!.serial);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.canGuiLai, true);
    assert.equal(r.json.veThay, "DA_CAP"); // còn 1 vé trong kho
    assert.equal((await quet(w, FIELD, v1!.ma)).json.ma, "VE_DA_HUY", "vé cũ quét ra đỏ");
    // huỷ tiếp vé còn lại của đơn: kho đã hết
    const r2 = await huyDaGui(w, ACC, v2!.serial);
    assert.equal(r2.json.veThay, "THIEU");
    assert.equal(veCuaDon(w, d.id).length, 1);
    assert.ok(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_thieu'")[0].n >= 1);
    batBienVeSach(w);
  } finally { tat(); }
});

test("huỷ vé hãng ngoài: trong kho và đã giữ được; đã mở ⇒ 409 ve_hang_ngoai_da_mo, vé giữ nguyên", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const kho = await loVaoKho(w, "HANG_NGOAI", 4, 0);
    const d = await donCoVe(w, 1, true);
    const [mo] = veCuaDon(w, d.id);
    const x = await huy(w, ADM, mo!.serial);
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error?.code ?? x.json.code, "ve_hang_ngoai_da_mo");
    assert.equal(trangThai(w, mo!.serial).status, "ALLOCATED");
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_allocation WHERE released_at IS NULL")[0].n, 1);
    const conLai = kho.soSeri.filter((s) => s !== mo!.serial);
    assert.equal((await huy(w, ADM, conLai[0]!)).status, 200, "trong kho thì được");
    const d2 = await donCoVe(w, 1, false);
    const [giu] = veCuaDon(w, d2.id);
    const r = await huy(w, ADM, giu!.serial);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.traSuat, true);
    assert.equal(r.json.canGuiLai, false);
  } finally { tat(); }
});

test("huỷ vé đã dùng ⇒ 409 ve_da_dung, không đổi gì; bỏ lượt quét rồi huỷ được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 3, 0);
    const d = await donCoVe(w, 1, true);
    const [v] = veCuaDon(w, d.id);
    const q = await quet(w, FIELD, v!.ma);
    assert.equal(q.json.ghi, "DA_TINH");
    const x = await huyDaGui(w, ACC, v!.serial);
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error?.code ?? x.json.code, "ve_da_dung");
    assert.equal(trangThai(w, v!.serial).status, "ALLOCATED");
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_huy_ve'")[0].n, 0);
    const bo = await w.call("POST", `/api/ve/quet/${q.json.lanQuetId}/bo`, { as: ADM, body: { lyDo: "quét nhầm vé" } });
    assert.equal(bo.status, 200, bo.text);
    assert.equal((await huyDaGui(w, ACC, v!.serial)).status, 200);
  } finally { tat(); }
});

test("huỷ vé: kiểm đầu vào và quyền — số sai dạng 400; số không có 404; lý do ngắn / chứa số điện thoại / mã vé 400; Bán hàng không huỷ vé Tour Đảo, Kế toán không huỷ vé hãng ngoài; Hướng dẫn viên 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    const td = await loVaoKho(w, "TOUR_DAO", 2, 0);
    const hn = await loVaoKho(w, "HANG_NGOAI", 2, 10);
    assert.equal((await huy(w, ACC, "VE_123")).status, 400);
    assert.equal((await huy(w, ACC, "VE_ZZZZZZZZ")).status, 404);
    assert.equal((await huy(w, ACC, td.soSeri[0]!, "ngắn")).status, 400);
    assert.equal((await huy(w, ACC, td.soSeri[0]!, "x".repeat(301))).status, 400);
    assert.equal((await huy(w, ACC, td.soSeri[0]!, "gọi 0912345678 báo huỷ")).status, 400);
    assert.equal((await huy(w, ACC, td.soSeri[0]!, "mã " + "TD1." + "A".repeat(26))).status, 400);
    assert.equal((await huy(w, ACC, td.soSeri[0]!, "lý do hợp lệ", { lenhId: "khong-phai-uuid" })).status, 400);
    assert.equal((await huy(w, SALES, td.soSeri[0]!)).status, 403);
    assert.equal((await huy(w, ACC, hn.soSeri[0]!)).status, 403);
    assert.equal((await huy(w, FIELD, td.soSeri[0]!)).status, 403);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE status = 'VOID'")[0].n, 0, "không lần nào làm đổi vé");
    assert.equal((await huy(w, ACC, td.soSeri[0]!, "lý do hợp lệ", { lenhId: crypto.randomUUID() })).status, 200);
    assert.equal((await huy(w, ADM, hn.soSeri[0]!)).status, 200);
  } finally { tat(); }
});

test("cạnh tranh: vé vừa bị quét «đã dùng» giữa lúc đọc và lúc ghi ⇒ 409 ve_da_dung, cả lô huỷ lui (vé, phân bổ, nhật ký giữ nguyên)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 3, 0);
    const d = await donCoVe(w, 1, true);
    const [v] = veCuaDon(w, d.id);
    const goc = w.sqlite.prepare.bind(w.sqlite);
    let xong = false;
    w.sqlite.prepare = (sql: string) => {
      if (!xong && /huy_ve_khong_duoc/.test(sql)) {
        xong = true;
        const id = w.q("SELECT id FROM vdt_ticket WHERE serial = ?", v!.serial)[0].id;
        w.sqlite.prepare("INSERT INTO vdt_scan (id, ticket_id, ket_qua, scanned_at, scanned_by, created_at, updated_at) VALUES (?, ?, 'DA_TINH', ?, ?, ?, ?)").run(crypto.randomUUID(), id, "2027-03-11T00:00:00.000Z", SALES, "2027-03-11T00:00:00.000Z", "2027-03-11T00:00:00.000Z");
      }
      return goc(sql);
    };
    const r = await huyDaGui(w, ACC, v!.serial);
    assert.equal(r.status, 409, r.text);
    assert.equal(trangThai(w, v!.serial).status, "ALLOCATED");
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_allocation WHERE released_at IS NOT NULL")[0].n, 0, "phân bổ không bị trả");
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action IN ('ve_huy_ve')")[0].n, 0);
  } finally { tat(); }
});

// ======================================================================= A5: huỷ lô đã cấp ===========================================================================
async function loDaCap(w: any) {
  NGUON(w, "TOUR_DAO");
  const a = await loVaoKho(w, "TOUR_DAO", 4, 0);
  const d1 = await donCoVe(w, 2, true); // hai vé đã mở (lô A)
  const [u1, u2] = veCuaDon(w, d1.id);
  const q = await quet(w, FIELD, u1!.ma); // u1 đã dùng
  assert.equal(q.json.ghi, "DA_TINH", q.text);
  const d2 = await donCoVe(w, 1, false); // một vé giữ chưa mở
  const b = await loVaoKho(w, "TOUR_DAO", 4, 10); // kho thay (lô B) vào SAU nên đơn ở trên chắc chắn đang giữ vé lô A
  return { a, b, d1, d2, u1: u1!, u2: u2! };
}

test("xem trước huỷ lô đã cấp: máy chủ đếm — huỷ được, giữ nguyên vì đã dùng, đơn cấp thay, vé đã gửi phải gửi lại; không lộ mã vé", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a } = await loDaCap(w);
    const r = await w.call("GET", `/api/ve/lo/${a.loId}/xem-truoc-huy`, { as: ACC });
    assert.equal(r.status, 200, r.text);
    // lô A 4 vé: 1 đã dùng (giữ nguyên), 1 đã mở chưa dùng, 1 giữ chưa mở, 1 trong kho ⇒ huỷ được 3, đơn cấp thay 2, gửi lại 1
    assert.deepEqual(r.json, { loId: a.loId, daCap: true, tongVe: 4, huyDuoc: 3, giuNguyenDaDung: 1, giuNguyenHangNgoaiDaMo: 0, donCapThay: 2, daGuiPhaiGuiLai: 1 });
    khongLoMa(r.text);
    assert.equal((await w.call("GET", `/api/ve/lo/${a.loId}/xem-truoc-huy`, { as: SALES })).status, 403);
    assert.equal((await w.call("GET", `/api/ve/lo/${crypto.randomUUID()}/xem-truoc-huy`, { as: ACC })).status, 404);
  } finally { tat(); }
});

test("huỷ lô đã cấp: bắt buộc lý do; huỷ mọi vé huỷ được, vé đã dùng giữ nguyên và vẫn quét được; lô VOID; đơn được cấp vé thay từ lô khác; nhật ký ghi số vé huỷ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b, d1, d2, u1, u2 } = await loDaCap(w);
    const bo = (as: string, body: object = {}) => w.call("POST", `/api/ve/lo/${a.loId}/bo`, { as, body });
    assert.equal((await bo(ACC)).status, 400, "không lý do");
    assert.equal((await bo(ACC, { lyDo: "ngắn" })).status, 400);
    assert.equal((await bo(ACC, { lyDo: "gọi 0912345678" })).status, 400);
    assert.equal((await bo(SALES, { lyDo: "Nhà cung cấp thu hồi lô" })).status, 403);
    assert.equal(w.q("SELECT status FROM vdt_batch WHERE id = ?", a.loId)[0].status, "ACTIVE", "các lần từ chối không đổi gì");
    const r = await bo(ACC, { lyDo: "Nhà cung cấp thu hồi lô", xacNhanSoVeDaGui: 1 });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trangThai, "VOID");
    assert.equal(r.json.veDaHuy, 3);
    assert.deepEqual(r.json.veGiuNguyen, { daDung: 1, hangNgoaiDaMo: 0 });
    assert.equal(r.json.donXetCapThay, 2);
    assert.equal(r.json.conDonChuaCapThay, false);
    assert.equal(r.json.canGuiLai, 1);
    khongLoMa(r.text);
    assert.equal(w.q("SELECT status FROM vdt_batch WHERE id = ?", a.loId)[0].status, "VOID");
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE batch_id = ? AND status = 'VOID'", a.loId)[0].n, 3);
    assert.equal(trangThai(w, u1.serial).status, "ALLOCATED", "vé đã dùng giữ nguyên");
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE batch_id = ? AND withdrawn_at IS NOT NULL", a.loId)[0].n, 0);
    // vé giữ nguyên vẫn quét được như cũ (đã dùng); vé đã mở bị huỷ quét ra đỏ
    assert.equal((await quet(w, FIELD, u1.ma)).json.ma, "DA_DUNG");
    assert.equal((await quet(w, FIELD, u2.ma)).json.ma, "VE_DA_HUY");
    // đơn được cấp vé thay từ lô B (chưa gửi)
    const vd1 = w.q("SELECT t.batch_id AS lo, a.revealed_at AS lo_at FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL", d1.id);
    assert.equal(vd1.length, 2, "đơn 1 vẫn đủ hai suất");
    assert.ok(vd1.some((x: any) => x.lo === b.loId && x.lo_at === null));
    const vd2 = w.q("SELECT t.batch_id AS lo FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL", d2.id);
    assert.deepEqual(vd2.map((x: any) => x.lo), [b.loId]);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 've_bo_lo'");
    assert.equal(nk.length, 1);
    assert.match(nk[0].detail, /huỷ 3 vé/);
    assert.equal((await bo(ACC, { lyDo: "Nhà cung cấp thu hồi lô" })).status, 409, "huỷ lần hai");
    // lô VOID không cấp thêm vé: đơn mới lấy từ lô B
    const d3 = await don(w, { soNguoi: 1 });
    assert.deepEqual(w.q("SELECT t.batch_id AS lo FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ?", d3.id).map((x: any) => x.lo), [b.loId]);
    batBienVeSach(w); // lô VOID còn vé đã dùng ALLOCATED, vé huỷ có dấu huỷ, suất THU_HOI: các bất biến kho vé vẫn sạch
  } finally { tat(); }
});

test("huỷ lô hãng ngoài đã cấp: vé đã mở giữ nguyên (đếm riêng), vé chưa mở và vé trong kho huỷ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await loVaoKho(w, "HANG_NGOAI", 4, 0);
    const d1 = await donCoVe(w, 1, true); // đã mở
    const d2 = await donCoVe(w, 1, false); // giữ chưa mở
    const xem = await w.call("GET", `/api/ve/lo/${a.loId}/xem-truoc-huy`, { as: ADM });
    assert.equal(xem.status, 200, xem.text);
    assert.deepEqual({ ...xem.json, loId: undefined }, { loId: undefined, daCap: true, tongVe: 4, huyDuoc: 3, giuNguyenDaDung: 0, giuNguyenHangNgoaiDaMo: 1, donCapThay: 1, daGuiPhaiGuiLai: 0 });
    const r = await w.call("POST", `/api/ve/lo/${a.loId}/bo`, { as: ADM, body: { lyDo: "Nhà cung cấp đổi lô vé" } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.veDaHuy, 3, "một vé giữ chưa mở và hai vé trong kho");
    assert.deepEqual(r.json.veGiuNguyen, { daDung: 0, hangNgoaiDaMo: 1 });
    assert.equal(veCuaDon(w, d1.id).length, 1, "vé đã mở của đơn 1 còn nguyên");
    assert.equal(trangThai(w, veCuaDon(w, d1.id)[0]!.serial).status, "ALLOCATED");
    assert.equal(veCuaDon(w, d2.id).length, 0, "đơn 2 mất suất, không còn lô nào cấp thay");
    assert.ok(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_thieu'")[0].n >= 1);
    batBienVeSach(w);
  } finally { tat(); }
});

test("lô chưa từng cấp: huỷ lô vẫn đi đường cũ (không cần lý do, vé mang dấu rút, nhập lại được); xem trước báo daCap = false", async () => {
  const w = setup();
  NGUON(w, "TOUR_DAO");
  const kho = await loVaoKho(w, "TOUR_DAO", 2, 0);
  const xem = await w.call("GET", `/api/ve/lo/${kho.loId}/xem-truoc-huy`, { as: ACC });
  assert.equal(xem.json.daCap, false);
  assert.equal(xem.json.huyDuoc, 2);
  const r = await w.call("POST", `/api/ve/lo/${kho.loId}/bo`, { as: ACC, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.veDaRut, 2);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE withdrawn_at IS NOT NULL")[0].n, 2);
});

// ======================================================================= A6: danh sách vé của lô, tìm theo số sê-ri ==================================================================
test("danh sách vé của lô và tìm theo số sê-ri: số sê-ri, hạn, tình trạng; mã đơn chỉ khi người xem có order.view; không mã vé, không khoá kho; quyền xem như GET /lo", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, d1, u1, u2 } = await loDaCap(w);
    const r = await w.call("GET", `/api/ve/lo/${a.loId}/ve-trong-lo`, { as: ADM });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.nguon, "TOUR_DAO");
    assert.equal(r.json.ve.length, 4);
    const theo = Object.fromEntries(r.json.ve.map((v: any) => [v.soSeri, v]));
    assert.equal(theo[u1.serial].tinhTrang, "DA_DUNG");
    assert.equal(theo[u1.serial].nhan, "Đã dùng");
    assert.equal(theo[u2.serial].tinhTrang, "DA_GUI");
    assert.equal(theo[u2.serial].nhan, "Đã gửi khách");
    assert.deepEqual(r.json.ve.map((v: any) => v.tinhTrang).sort(), ["DA_DUNG", "DA_GIU", "DA_GUI", "TRONG_KHO"]);
    for (const v of r.json.ve) { assert.match(v.soSeri, SERI); assert.equal(v.tuNgay, "2027-01-01"); assert.equal(v.denNgay, "2027-12-31"); }
    assert.ok(theo[u1.serial].maDon, "Quản trị có order.view ⇒ thấy mã đơn");
    assert.equal(r.json.ve.filter((v: any) => v.tinhTrang === "TRONG_KHO")[0].maDon, undefined, "vé trong kho không có đơn");
    khongLoMa(r.text);
    // Kế toán xem được số lượng lô Tour Đảo nhưng không có order.view trên đơn của Bán hàng ⇒ không mã đơn
    const kt = await w.call("GET", `/api/ve/lo/${a.loId}/ve-trong-lo`, { as: ACC });
    assert.equal(kt.status, 200, kt.text);
    assert.ok(kt.json.ve.every((v: any) => v.soSeri), "danh sách đủ");
    // Hướng dẫn viên 403; lô lạ 404
    assert.equal((await w.call("GET", `/api/ve/lo/${a.loId}/ve-trong-lo`, { as: FIELD })).status, 403);
    assert.equal((await w.call("GET", `/api/ve/lo/${crypto.randomUUID()}/ve-trong-lo`, { as: ADM })).status, 404);
    // tìm
    const t = await w.call("GET", `/api/ve/tim?soSeri=${u2.serial.toLowerCase()}`, { as: ADM });
    assert.equal(t.status, 200, t.text);
    assert.equal(t.json.ve.soSeri, u2.serial);
    assert.equal(t.json.ve.tinhTrang, "DA_GUI");
    assert.equal(t.json.ve.loId, a.loId);
    assert.equal(t.json.ve.nguon, "TOUR_DAO");
    assert.equal(t.json.ve.tenSanPham, "Tour đảo");
    assert.ok(t.json.ve.maDon);
    khongLoMa(t.text);
    assert.equal((await w.call("GET", "/api/ve/tim?soSeri=VE_ZZZZZZZZ", { as: ADM })).status, 404);
    assert.equal((await w.call("GET", "/api/ve/tim?soSeri=abc", { as: ADM })).status, 400);
    assert.equal((await w.call("GET", "/api/ve/tim", { as: ADM })).status, 400);
    assert.equal((await w.call("GET", `/api/ve/tim?soSeri=${u2.serial}`, { as: FIELD })).status, 403);
    // Bán hàng (ve.kho.manage, không ve.phat-hanh) chỉ xem SỐ LƯỢNG lô Tour Đảo (GET /api/ve/lo); KHÔNG xem danh sách số sê-ri, KHÔNG tìm vé Tour Đảo theo số sê-ri.
    // Lý do (kiểm độc lập M1, 17/11): Bán hàng có ve.quet.tinh — thấy số sê-ri cả lô là gõ được «Đã dùng» cho vé chưa từng cầm (ADR-0175 Đ1.3: Bán hàng không thao tác lô Tour Đảo).
    assert.equal((await w.call("GET", `/api/ve/tim?soSeri=${u2.serial}`, { as: SALES })).status, 403);
    assert.equal((await w.call("GET", `/api/ve/lo/${a.loId}/ve-trong-lo`, { as: SALES })).status, 403);
    void d1;
  } finally { tat(); }
});

// ======================================================================= Phần B: ba vá máy chủ ======================================================================
test("danh sách lô: mặc định chỉ lô chưa từng cấp; ?tatCa=1 liệt kê cả lô đã cấp kèm cờ daCap (để màn kho mở được lô đã cấp)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await loDaCap(w);
    const mac = await w.call("GET", "/api/ve/lo", { as: ACC });
    assert.deepEqual(mac.json.lo.map((l: any) => l.loId), [b.loId], "mặc định giữ nguyên: lô A đã cấp không hiện");
    assert.ok(!("daCap" in mac.json.lo[0]) || mac.json.lo[0].daCap === false);
    const het = await w.call("GET", "/api/ve/lo?tatCa=1", { as: ACC });
    assert.equal(het.status, 200, het.text);
    const theo = new Map<string, any>(het.json.lo.map((l: any) => [l.loId, l]));
    assert.equal(theo.get(a.loId).daCap, true);
    assert.equal(theo.get(b.loId).daCap, false);
    khongLoMa(het.text);
    assert.equal((await w.call("GET", "/api/ve/lo?tatCa=1", { as: DRIVER })).status, 403);
    // lô đã huỷ không hiện
    assert.equal((await w.call("POST", `/api/ve/lo/${a.loId}/bo`, { as: ACC, body: { lyDo: "Nhà cung cấp thu hồi lô", xacNhanSoVeDaGui: 1 } })).status, 200);
    const sau = await w.call("GET", "/api/ve/lo?tatCa=1", { as: ACC });
    assert.deepEqual(sau.json.lo.map((l: any) => l.loId), [b.loId]);
  } finally { tat(); }
});

test("huỷ lô đã cấp cho nhiều đơn hơn trần cấp bù (31 đơn): MỌI đơn bị trả suất đều được ghi «trả vé» và được cấp vé thay", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    const SO = 31;
    const loLon = async (lech: number) => {
      const lo = await w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon: "TOUR_DAO", soVeDuKien: SO } });
      assert.equal(lo.status, 201, lo.text);
      const ve = Array.from({ length: SO }, (_x, i) => ({ noiDung: PNG(i + 1 + lech * 40), maVe: "TD1." + B32[i % 32]!.repeat(13) + B32[lech]!.repeat(13), tuNgay: "2027-01-01", denNgay: "2027-12-31", soSeri: lo.json.soSeri[i] }));
      let them = 0;
      for (let i = 0; i < SO; i += 10) them += (await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: ACC, body: { ve: ve.slice(i, i + 10) } })).json.themDuoc;
      assert.equal(them, SO);
      assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: ACC, body: {} })).status, 200);
      return lo.json.loId as string;
    };
    const a = await loLon(0);
    const dons: string[] = [];
    for (let i = 0; i < SO; i++) dons.push((await donCoVe(w, 1, false)).id);
    const b = await loLon(1);
    const r = await w.call("POST", `/api/ve/lo/${a}/bo`, { as: ACC, body: { lyDo: "Nhà cung cấp thu hồi lô" } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.donXetCapThay, SO);
    assert.equal(r.json.conDonChuaCapThay, false);
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_tra_ve'")[0].n, SO, "mỗi đơn bị trả suất có một dòng nhật ký");
    for (const id of dons) assert.deepEqual(w.q("SELECT t.batch_id AS lo FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL", id).map((x: any) => x.lo), [b], "đơn nào cũng có vé thay từ lô B");
  } finally { tat(); }
});

test("hai vé tranh một số sê-ri giữa lúc kiểm và lúc ghi: vé thua bị loại bằng câu thường, không ném lỗi, vé khác trong đợt vẫn vào", async () => {
  const w = setup();
  const a = await w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon: "TOUR_DAO", soVeDuKien: 2 } });
  const v = (i: number, soSeri: string) => ({ noiDung: PNG(i), maVe: "TD1." + B32[i]!.repeat(26), tuNgay: "2027-01-01", denNgay: "2027-12-31", soSeri });
  const goc = w.sqlite.prepare.bind(w.sqlite);
  let xong = false;
  w.sqlite.prepare = (sql: string) => {
    if (!xong && /^INSERT INTO vdt_ticket \(id, batch_id, ticket_code/.test(sql.trim())) {
      xong = true; // người khác chèn vé mang số thứ nhất ngay trước khi lô lệnh của ta chạy
      w.sqlite.prepare("INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, created_at, created_by, updated_at, updated_by, serial) VALUES (?, ?, 'KHAC1', '2027-01-01', '2027-12-31', 'k', 'IMAGE_PNG', 1, 'h-khac', 'AVAILABLE', ?, ?, ?, ?, ?)")
        .run(crypto.randomUUID(), a.json.loId, AT, ACC, AT, ACC, a.json.soSeri[0]);
    }
    return goc(sql);
  };
  const r = await w.call("POST", `/api/ve/lo/${a.json.loId}/ve`, { as: ACC, body: { ve: [v(1, a.json.soSeri[0]), v(2, a.json.soSeri[1])] } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.themDuoc, 1);
  assert.equal(r.json.loai.length, 1);
  assert.equal(r.json.loai[0].thuTu, 0);
  assert.match(r.json.loai[0].lyDo, /[à-ỹ]/);
});

// ======================================================================= Đợt chủ duyệt 18/11: ai huỷ vé hãng ngoài, gõ bốn chữ cuối, nhập lại vé huỷ nhầm, chia trang =============================
const QL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const themQuanLy = (w: any) => seedStaff(w.sqlite, { id: QL, phone: "0900000031", name: "Quản Lý Bán", perms: ["SALES_MANAGER", "SALES"] });
const huyLo = (w: any, as: string, loId: string, body: object) => w.call("POST", `/api/ve/lo/${loId}/bo`, { as, body });
const dsVe = (w: any, as: string, loId: string, q = "") => w.call("GET", `/api/ve/lo/${loId}/ve-trong-lo${q}`, { as });

test("Việc 1: huỷ vé lẻ hãng ngoài — Bán hàng 403; Quản lý bán hàng, Quản trị, Toàn quyền 200; vé Tour Đảo vẫn do Kế toán huỷ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themQuanLy(w);
    NGUON(w, "TOUR_DAO");
    const hn = await loVaoKho(w, "HANG_NGOAI", 4, 0);
    const td = await loVaoKho(w, "TOUR_DAO", 1, 10);
    assert.equal((await huy(w, SALES, hn.soSeri[0]!)).status, 403);
    assert.equal(trangThai(w, hn.soSeri[0]!).status, "AVAILABLE", "Bán hàng bị từ chối thì vé không đổi");
    assert.equal((await huy(w, QL, hn.soSeri[0]!)).status, 200);
    assert.equal((await huy(w, ADM, hn.soSeri[1]!)).status, 200);
    assert.equal((await huy(w, SUP, hn.soSeri[2]!)).status, 200);
    assert.equal((await huy(w, ACC, td.soSeri[0]!)).status, 200);
  } finally { tat(); }
});

test("Việc 1: huỷ lô hãng ngoài ĐÃ cấp (xem trước và huỷ) — Bán hàng 403, Quản lý bán hàng 200; lô hãng ngoài CHƯA cấp Bán hàng vẫn huỷ được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themQuanLy(w);
    const a = await loVaoKho(w, "HANG_NGOAI", 3, 0);
    await donCoVe(w, 1, false);
    assert.equal((await w.call("GET", `/api/ve/lo/${a.loId}/xem-truoc-huy`, { as: SALES })).status, 403);
    assert.equal((await huyLo(w, SALES, a.loId, { lyDo: "Nhà cung cấp đổi lô vé" })).status, 403);
    assert.equal(w.q("SELECT status FROM vdt_batch WHERE id = ?", a.loId)[0].status, "ACTIVE");
    assert.equal((await w.call("GET", `/api/ve/lo/${a.loId}/xem-truoc-huy`, { as: QL })).status, 200);
    assert.equal((await huyLo(w, QL, a.loId, { lyDo: "Nhà cung cấp đổi lô vé" })).status, 200);
    const w2 = setup();
    const c = await loVaoKho(w2, "HANG_NGOAI", 2, 20); // lô chưa từng cấp (thế giới riêng: lô nhập sau sẽ được cấp bù cho đơn đang thiếu vé)
    assert.equal(w2.q("SELECT count(*) AS n FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE t.batch_id = ?", c.loId)[0].n, 0);
    assert.equal((await w2.call("GET", `/api/ve/lo/${c.loId}/xem-truoc-huy`, { as: SALES })).status, 200, "xem trước lô chưa cấp: như cũ");
    const r = await huyLo(w2, SALES, c.loId, {});
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.veDaRut, 2);
  } finally { tat(); }
});

test("Việc 2: huỷ vé đã gửi khách (Tour Đảo) phải gõ lại bốn chữ cuối số sê-ri; thiếu hoặc sai ⇒ 400 và không ghi gì; đúng (chữ thường, có khoảng trắng) ⇒ 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    NGUON(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 3, 0);
    const d = await donCoVe(w, 1, true);
    const [v] = veCuaDon(w, d.id);
    const so = v!.serial;
    const thieu = await huy(w, ACC, so);
    assert.equal(thieu.status, 400, thieu.text);
    assert.match(thieu.text, /bốn chữ cuối/);
    assert.equal((await huy(w, ACC, so, "In sai ngày, huỷ vé", { xacNhanBonCuoi: "ZZZZ" })).status, 400);
    assert.equal((await huy(w, ACC, so, "In sai ngày, huỷ vé", { xacNhanBonCuoi: 1234 })).status, 400);
    assert.equal(trangThai(w, so).status, "ALLOCATED");
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 've_huy_ve'")[0].n, 0);
    const go = ` ${so.slice(-4).toLowerCase().slice(0, 2)} ${so.slice(-2).toLowerCase()} `;
    const ok = await huy(w, ACC, so, "In sai ngày, huỷ vé", { xacNhanBonCuoi: go });
    assert.equal(ok.status, 200, ok.text);
    // vé trong kho hoặc mới giữ chưa gửi: không đòi
    const d2 = await donCoVe(w, 1, false);
    assert.equal((await huy(w, ACC, veCuaDon(w, d2.id)[0]!.serial)).status, 200);
  } finally { tat(); }
});

test("Việc 2: huỷ lô đã cấp có vé đã gửi khách ⇒ phải gửi xacNhanSoVeDaGui đúng con số máy chủ đếm; thiếu 400, lệch 409, đúng 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a } = await loDaCap(w);
    const lyDo = "Nhà cung cấp thu hồi lô";
    const t = await huyLo(w, ACC, a.loId, { lyDo });
    assert.equal(t.status, 400, t.text);
    assert.equal((await huyLo(w, ACC, a.loId, { lyDo, xacNhanSoVeDaGui: 5 })).status, 409);
    assert.equal((await huyLo(w, ACC, a.loId, { lyDo, xacNhanSoVeDaGui: "1" })).status, 400);
    assert.equal(w.q("SELECT status FROM vdt_batch WHERE id = ?", a.loId)[0].status, "ACTIVE");
    const ok = await huyLo(w, ACC, a.loId, { lyDo, xacNhanSoVeDaGui: 1 });
    assert.equal(ok.status, 200, ok.text);
    assert.equal(ok.json.canGuiLai, 1);
  } finally { tat(); }
});

test("Việc 3: vé hãng ngoài chưa từng giữ cho đơn, huỷ nhầm ⇒ có dấu rút, nhập lại đúng ảnh và mã được; dòng cũ hiện «đã nhập lại»; đủ giờ huỷ, người huỷ, lý do", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themQuanLy(w);
    const hn = await loVaoKho(w, "HANG_NGOAI", 3, 0);
    assert.equal((await huy(w, QL, hn.soSeri[0]!, "Huỷ nhầm vé thử")).status, 200);
    const t = w.q("SELECT withdrawn_at, purged_at, status FROM vdt_ticket WHERE serial = ?", hn.soSeri[0]!)[0];
    assert.equal(t.status, "VOID");
    assert.ok(t.withdrawn_at && t.purged_at);
    const dong = (r: any, so: string) => r.json.ve.find((v: any) => v.soSeri === so);
    let ds = await dsVe(w, ADM, hn.loId);
    assert.equal(ds.status, 200, ds.text);
    assert.equal(ds.json.ve.length, 3, "vé đã huỷ (đã rút) vẫn hiện trong danh sách");
    const d1 = dong(ds, hn.soSeri[0]!);
    assert.equal(d1.tinhTrang, "DA_HUY");
    assert.equal(d1.huyBoi, "Quản Lý Bán");
    assert.equal(d1.lyDoHuy, "Huỷ nhầm vé thử");
    assert.ok(d1.huyLuc);
    assert.equal(d1.nhapLai, "NHAP_LAI_DUOC");
    assert.equal(dong(ds, hn.soSeri[1]!).nhapLai, undefined);
    assert.equal(dong(ds, hn.soSeri[1]!).nhapLaiNeuHuy, true, "vé hãng ngoài chưa từng giữ: huỷ nhầm nhập lại được");
    khongLoMa(ds.text);
    // nhập lại đúng ảnh và mã vé đó (vé 1 của loVaoKho lech 0: PNG(1), «HN1»)
    const lo2 = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
    const lai = await w.call("POST", `/api/ve/lo/${lo2.json.loId}/ve`, { as: SALES, body: { ve: [{ noiDung: PNG(1), maVe: "HN1", tuNgay: "2027-01-01", denNgay: "2027-12-31" }] } });
    assert.equal(lai.json.themDuoc, 1, lai.text);
    ds = await dsVe(w, ADM, hn.loId);
    assert.equal(dong(ds, hn.soSeri[0]!).nhapLai, "DA_NHAP_LAI");
    // vé từng giữ cho đơn: huỷ ⇒ không dấu rút, không nhập lại được
    const d = await donCoVe(w, 1, false);
    const giu = veCuaDon(w, d.id)[0]!;
    assert.equal((await huy(w, QL, giu.serial)).status, 200);
    assert.equal(w.q("SELECT withdrawn_at FROM vdt_ticket WHERE serial = ?", giu.serial)[0].withdrawn_at, null);
    const loGiu = w.q("SELECT batch_id FROM vdt_ticket WHERE serial = ?", giu.serial)[0].batch_id;
    const dg = dong(await dsVe(w, ADM, loGiu), giu.serial);
    assert.equal(dg.nhapLai, "KHONG_NHAP_LAI_DUOC");
    const loai = await w.call("POST", `/api/ve/lo/${lo2.json.loId}/ve`, { as: SALES, body: { ve: [{ noiDung: PNG(9), maVe: giu.ma, tuNgay: "2027-01-01", denNgay: "2027-12-31" }] } });
    assert.equal(loai.json.themDuoc, 0, "vé từng giữ cho đơn không nhập lại được");
    // tìm theo số sê-ri cũng thấy vé đã rút + đủ ba mục
    const tim = await w.call("GET", `/api/ve/tim?soSeri=${hn.soSeri[0]}`, { as: QL });
    assert.equal(tim.status, 200, tim.text);
    assert.equal(tim.json.ve.nhapLai, "DA_NHAP_LAI");
    assert.equal(tim.json.ve.huyBoi, "Quản Lý Bán");
    batBienVeSach(w);
  } finally { tat(); }
});

test("Việc 3: vé Tour Đảo huỷ không có dấu rút; huỷ lô hãng ngoài đã cấp chỉ rút vé chưa từng giữ; vé rút theo đường cũ (lô chưa cấp) vẫn ẩn khỏi danh sách vé", async () => {
  const tat = batDongHo();
  try {
    const w0 = setup();
    NGUON(w0, "TOUR_DAO");
    const td = await loVaoKho(w0, "TOUR_DAO", 2, 0);
    assert.equal((await huy(w0, ACC, td.soSeri[0]!)).status, 200);
    assert.equal(w0.q("SELECT withdrawn_at FROM vdt_ticket WHERE serial = ?", td.soSeri[0]!)[0].withdrawn_at, null);
    const w = setup();
    themQuanLy(w);
    const a = await loVaoKho(w, "HANG_NGOAI", 3, 10);
    const d = await donCoVe(w, 1, false);
    const giu = veCuaDon(w, d.id)[0]!;
    assert.equal((await huyLo(w, QL, a.loId, { lyDo: "Nhà cung cấp đổi lô vé" })).status, 200);
    const rut = w.q("SELECT serial, withdrawn_at, status FROM vdt_ticket WHERE batch_id = ? ORDER BY serial", a.loId);
    assert.equal(rut.length, 3);
    for (const r of rut) {
      assert.equal(r.status, "VOID");
      assert.equal(r.withdrawn_at !== null, r.serial !== giu.serial, "chỉ vé chưa từng giữ cho đơn được rút");
    }
    // lô chưa cấp huỷ bằng đường cũ: vé rút, không có dấu huỷ ⇒ ẩn
    batBienVeSach(w);
    const w2 = setup();
    const c = await loVaoKho(w2, "HANG_NGOAI", 2, 20);
    assert.equal((await huyLo(w2, SALES, c.loId, {})).status, 200);
    assert.equal((await dsVe(w2, ADM, c.loId)).json.ve.length, 0);
    batBienVeSach(w2);
  } finally { tat(); }
});

test("Việc 5: danh sách lô chia trang 50 (55 lô ⇒ trang 2 có 5); không tham số tatCa thì như cũ", async () => {
  const w = setup();
  for (let i = 0; i < 55; i++) {
    const t = new Date(Date.parse(AT) + i * 1000).toISOString();
    w.sqlite.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, source, created_at, updated_at) VALUES (?, 'ZA1', 'ADULT', 'Vé thử', 'ACTIVE', 'HANG_NGOAI', ?, ?)").run(crypto.randomUUID(), t, t);
  }
  const p1 = await w.call("GET", "/api/ve/lo?tatCa=1", { as: ADM });
  assert.equal(p1.json.lo.length, 50);
  assert.equal(p1.json.trang, 1);
  assert.equal(p1.json.coTrangSau, true);
  const p2 = await w.call("GET", "/api/ve/lo?tatCa=1&trang=2", { as: ADM });
  assert.equal(p2.json.lo.length, 5);
  assert.equal(p2.json.trang, 2);
  assert.equal(p2.json.coTrangSau, false);
  const ids = new Set([...p1.json.lo, ...p2.json.lo].map((l: any) => l.loId));
  assert.equal(ids.size, 55, "hai trang không trùng, không sót");
  assert.equal((await w.call("GET", "/api/ve/lo?tatCa=1&trang=0", { as: ADM })).status, 400);
  assert.equal((await w.call("GET", "/api/ve/lo?tatCa=1&trang=abc", { as: ADM })).status, 400);
  const mac = await w.call("GET", "/api/ve/lo", { as: ADM });
  assert.equal(mac.json.lo.length, 50);
  assert.equal(mac.json.trang, undefined);
});

test("Việc 5: danh sách vé của lô chia trang 50 (lô 60 vé ⇒ trang 2 có 10), kèm tổng số vé", async () => {
  const w = setup();
  const lo = crypto.randomUUID();
  w.sqlite.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, source, created_at, updated_at) VALUES (?, 'ZA1', 'ADULT', 'Vé thử', 'ACTIVE', 'HANG_NGOAI', ?, ?)").run(lo, AT, AT);
  for (let i = 0; i < 60; i++) {
    const id = crypto.randomUUID();
    w.sqlite.prepare("INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, stored_at, created_at, updated_at) VALUES (?, ?, ?, '2027-01-01', '2027-12-31', ?, 'image/png', 1, ?, 'AVAILABLE', ?, ?, ?)").run(id, lo, `HN${i}`, `vdt/${id}`, `B${i}`, AT, AT, AT);
  }
  const p1 = await dsVe(w, ADM, lo);
  assert.equal(p1.json.ve.length, 50);
  assert.equal(p1.json.tongVe, 60);
  assert.equal(p1.json.trang, 1);
  assert.equal(p1.json.coTrangSau, true);
  const p2 = await dsVe(w, ADM, lo, "?trang=2");
  assert.equal(p2.json.ve.length, 10);
  assert.equal(p2.json.coTrangSau, false);
  assert.equal(new Set([...p1.json.ve, ...p2.json.ve].map((v: any) => v.soSeri)).size, 60);
  assert.equal((await dsVe(w, ADM, lo, "?trang=0")).status, 400);
});
