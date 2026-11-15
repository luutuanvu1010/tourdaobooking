// Route nhập lô và thống kê kho vé điện tử (ADR-0153; Task 4c) qua ứng dụng THẬT (tests/audit/harness.mjs + kho R2 giả `w.r2VeDienTu`).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT = U(3), PARTNER = U(7), FIELD = U(4);
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const AT = new Date().toISOString();

function setup() {
  const w = world();
  for (const [id, phone, perms] of [[SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT, "0900000003", ["ACCOUNTING"]], [PARTNER, "0900000007", ["PARTNER"]], [FIELD, "0900000004", ["FIELD"]]] as [string, string, string[]][]) {
    seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-2)}`, perms });
  }
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES ('V2D', 'Vinwonders 2 ngày', 'perPax', 100000, 1, 1, '${AT}', '${AT}'), ('VB350', 'Buffet 350K', 'perPax', 350000, 2, 1, '${AT}', '${AT}')`);
  return w;
}
const taoLo = (w: any, as: string, over: Record<string, unknown> = {}) =>
  w.call("POST", "/api/ve/lo", { as, body: { catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "VVC Multiday 2 lần 14 ngày", ...over } });
const them = (w: any, as: string, loId: string, ve: unknown[]) => w.call("POST", `/api/ve/lo/${loId}/ve`, { as, body: { ve } });
const ve = (n: number, over: Record<string, unknown> = {}) => ({ noiDung: b64(PNG(n)), maVe: `TA.10000000000${n}`, tuNgay: "2026-10-24", denNgay: "2026-11-23", ...over });

test("quyền: Bán hàng và Toàn quyền vào được; Đối tác, Hướng dẫn viên nhận 403 ở mọi route kho vé; Kế toán không tạo lô hãng ngoài, không thấy dòng hãng ngoài", async () => {
  const w = setup();
  for (const as of [PARTNER, FIELD]) {
    for (const [m, p, body] of [["GET", "/api/ve/kho", undefined], ["POST", "/api/ve/lo", { catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "x" }]] as const) {
      const r = await w.call(m, p, { as, body });
      assert.equal(r.status, 403, `${as} ${m} ${p} → ${r.status}`);
    }
  }
  // ADR-0175 Đ1.4: Kế toán giữ `ve.phat-hanh` (lô Tour Đảo) nên GET /kho trả 200 nhưng không có dòng hãng ngoài; tạo lô hãng ngoài vẫn 403.
  assert.equal((await w.call("POST", "/api/ve/lo", { as: KT, body: { catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "x" } })).status, 403);
  const kt = await w.call("GET", "/api/ve/kho", { as: KT });
  assert.equal(kt.status, 200, kt.text);
  assert.ok(kt.json.kho.every((d: any) => d.nguon === "TOUR_DAO"));
  assert.equal((await w.call("GET", "/api/ve/kho", { as: SALES })).status, 200);
  assert.equal((await w.call("GET", "/api/ve/kho", { as: SUPER })).status, 200);
  assert.equal((await w.call("GET", "/api/ve/kho")).status, 401, "chưa đăng nhập");
});

test("luồng nhập lô: tạo lô → thêm vé → xác nhận → thống kê; kho nhận đúng byte; lô lưu mã tour + nhóm khách đã chọn", async () => {
  const w = setup();
  const lo = await taoLo(w, SALES);
  assert.equal(lo.status, 201, lo.text);
  const loId = lo.json.loId;
  assert.match(lo.headers.get("location") ?? "", /^\/ve-kho\?lo=/);
  const r = await them(w, SALES, loId, [ve(1), ve(2), ve(3)]);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.themDuoc, 3);
  assert.equal(r.json.chuaLuuVaoKho, 0);
  assert.equal(r.json.veTrongLo, 3);
  assert.equal(w.r2VeDienTu.soLan.put, 3);
  assert.equal(w.r2.soLan.put + w.r2HoTro.soLan.put, 0, "không chạm hai kho kia");
  const xn = await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} });
  assert.equal(xn.status, 200, xn.text);
  const kho = await w.call("GET", "/api/ve/kho", { as: SALES });
  assert.deepEqual(kho.json.kho.map((d: any) => [d.catalogCode, d.tenDichVu, d.nhomKhach, d.conTrong, d.daGiu, d.daGiao]), [["V2D", "Vinwonders 2 ngày", "ADULT", 3, 0, 0]]);
  const khoa = w.q("SELECT storage_key FROM vdt_ticket").map((x: any) => x.storage_key);
  assert.ok(khoa.every((k: string) => /^vdt\/[0-9a-f]{32}$/.test(k) && w.r2VeDienTu.co(k)));
});

test("phản hồi và nhật ký KHÔNG chứa mã vé đầy đủ, khoá kho, băm; mã chỉ lộ 4 ký tự cuối", async () => {
  const w = setup();
  const loId = (await taoLo(w, SALES)).json.loId;
  const r = await them(w, SALES, loId, [ve(1)]);
  assert.doesNotMatch(r.text, /TA\.10000000000|vdt\/[0-9a-f]{32}|[0-9a-f]{64}/);
  assert.match(r.text, /…0001/);
  await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} });
  const nk = w.q("SELECT detail, target_id FROM audit_log WHERE action LIKE 've_%'").map((x: any) => `${x.detail} ${x.target_id}`).join("\n");
  assert.ok(nk.length > 0);
  assert.doesNotMatch(nk, /TA\.|vdt\/|[0-9a-f]{32}/);
});

test("lô Tour Đảo: phản hồi và nhật ký KHÔNG chứa mã TD1. đầy đủ; mã chỉ lộ 4 ký tự cuối (ADR-0175 Đ1.6)", async () => {
  const w = setup();
  const loId = (await taoLo(w, KT, { nguon: "TOUR_DAO" })).json.loId;
  const ma = "TD1." + "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const r = await them(w, KT, loId, [ve(1, { maVe: ma })]);
  assert.equal(r.json.themDuoc, 1, r.text);
  const xn = await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: KT, body: {} });
  const kho = await w.call("GET", "/api/ve/kho", { as: KT });
  const ds = await w.call("GET", "/api/ve/lo", { as: KT });
  const tatCa = [r.text, xn.text, kho.text, ds.text].join("\n");
  assert.doesNotMatch(tatCa, /TD1\.[A-Z2-7]{26}/);
  assert.match(r.text, /…WXYZ/);
  const nk = w.q("SELECT detail, target_id FROM audit_log WHERE action LIKE 've_%'").map((x: any) => `${x.detail} ${x.target_id}`).join("\n");
  assert.ok(nk.length > 0);
  assert.doesNotMatch(nk, /TD1\.[A-Z2-7]{26}|TD1\./);
});

test("vé trùng mã bị loại riêng (cả trong kho lẫn trong đợt); các vé khác vẫn vào", async () => {
  const w = setup();
  const loId = (await taoLo(w, SALES)).json.loId;
  await them(w, SALES, loId, [ve(1)]);
  const r = await them(w, SALES, loId, [ve(1, { noiDung: b64(PNG(9)) }), ve(2), ve(2, { noiDung: b64(PNG(8)) })]);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.themDuoc, 1);
  assert.deepEqual(r.json.loai.map((x: any) => x.thuTu).sort(), [0, 2]);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket")[0].n, 2);
});

test("tệp không phải ảnh JPG/PNG, ảnh quá 3 MB, ngày sai, lô sai: bị từ chối rõ ràng; không có dòng nào lọt vào kho", async () => {
  const w = setup();
  const loId = (await taoLo(w, SALES)).json.loId;
  const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
  const to = new Uint8Array(3 * 1024 * 1024 + 1); to.set(PNG(1));
  const r = await them(w, SALES, loId, [ve(1, { noiDung: b64(html) }), ve(2, { noiDung: b64(to) }), ve(3, { tuNgay: "2026-11-30" }), ve(4, { maVe: "có dấu cách" })]);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.themDuoc, 0);
  assert.equal(r.json.loai.length, 4);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket")[0].n, 0);
  assert.equal(w.r2VeDienTu.soLan.put, 0);
  assert.equal((await taoLo(w, SALES, { nhomKhach: "INFANT" })).status, 400, "em bé không có vé");
  assert.equal((await taoLo(w, SALES, { catalogCode: "KHONG-CO" })).status, 400);
  assert.equal((await them(w, SALES, loId, [])).status, 400);
  assert.equal((await them(w, SALES, "khong-phai-uuid", [ve(1)])).status, 404);
});

test("lô chưa có vé lưu được thì không xác nhận; đã ACTIVE thì không thêm vé nữa và không xác nhận lần hai", async () => {
  const w = setup();
  const loId = (await taoLo(w, SALES)).json.loId;
  assert.equal((await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} })).status, 409);
  await them(w, SALES, loId, [ve(1)]);
  assert.equal((await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} })).status, 200);
  assert.equal((await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} })).status, 409);
  assert.equal((await them(w, SALES, loId, [ve(2)])).status, 409);
});

test("kho chưa bật (thiếu binding) ⇒ 503, không ghi dòng vé nào", async () => {
  const w = setup();
  const loId = (await taoLo(w, SALES)).json.loId;
  delete w.env.VE_DIEN_TU;
  const r = await them(w, SALES, loId, [ve(1)]);
  assert.equal(r.status, 503);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket")[0].n, 0);
});

test("suaMaTourKhiChuaVeNaoGiuCho_thanhCong; suaMaTourKhiDaCoVeGiuCho_biTuChoi", async () => {
  const w = setup();
  const loId = (await taoLo(w, SALES)).json.loId;
  await them(w, SALES, loId, [ve(1)]);
  await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} });
  const sua = await w.call("POST", `/api/ve/lo/${loId}/sua-ma-tour`, { as: SALES, body: { catalogCode: "VB350" } });
  assert.equal(sua.status, 200, sua.text);
  assert.equal(w.q("SELECT catalog_code FROM vdt_batch")[0].catalog_code, "VB350");
  // giữ chỗ một vé bằng đường soạn câu thật rồi thử đổi lại
  w.sqlite.exec(`UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE 1=1`);
  const t = w.q("SELECT id FROM vdt_ticket")[0].id;
  w.sqlite.exec(`INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, created_at, updated_at) VALUES ('a1', '${t}', 'o', 's', 'ADULT', 1, '${AT}', '${AT}', '${AT}')`);
  const lai = await w.call("POST", `/api/ve/lo/${loId}/sua-ma-tour`, { as: SALES, body: { catalogCode: "V2D" } });
  assert.equal(lai.status, 409, lai.text);
  assert.equal(w.q("SELECT catalog_code FROM vdt_batch")[0].catalog_code, "VB350");
  assert.equal((await w.call("POST", `/api/ve/lo/${loId}/sua-ma-tour`, { as: KT, body: { catalogCode: "V2D" } })).status, 403);
});

test("thống kê kho: còn trống, sắp hết hạn trong 7 ngày, đã giữ", async () => {
  const w = setup();
  const loId = (await taoLo(w, SALES)).json.loId;
  const hom = new Date();
  const ngay = (d: number) => new Date(hom.getTime() + d * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
  await them(w, SALES, loId, [ve(1, { tuNgay: ngay(-3), denNgay: ngay(3) }), ve(2, { tuNgay: ngay(-3), denNgay: ngay(30) }), ve(3, { tuNgay: ngay(-30), denNgay: ngay(-1) })]);
  await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} });
  const d = (await w.call("GET", "/api/ve/kho", { as: SALES })).json.kho[0];
  assert.deepEqual([d.conTrong, d.sapHetHan, d.daGiu], [2, 1, 0], "vé hết hạn không tính còn trống");
});
