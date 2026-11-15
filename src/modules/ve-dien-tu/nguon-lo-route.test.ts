// Kho vé hỏi quyền theo nguồn của lô (ADR-0175 Đ1.4) qua ứng dụng THẬT (tests/audit/harness.mjs + kho R2 giả `w.r2VeDienTu`).
// Lô hãng ngoài: `ve.kho.manage`. Lô Tour Đảo: thao tác cần `ve.phat-hanh`; xem số lượng (GET /kho, /lo) thêm `ve.kho.manage`; lô đã huỷ chỉ `ve.phat-hanh`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT = U(3), FIELD = U(4), QLBH = U(5), QT = U(6);
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const AT = new Date().toISOString();
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const maTD = (n: number) => "TD1." + B32[n % 32]!.repeat(26);

function setup() {
  const w = world();
  for (const [id, phone, perms] of [[SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT, "0900000003", ["ACCOUNTING"]], [FIELD, "0900000004", ["FIELD"]], [QLBH, "0900000005", ["SALES_MANAGER", "SALES"]], [QT, "0900000006", ["ADMIN"]]] as [string, string, string[]][]) {
    seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-2)}`, perms });
  }
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES ('V2D', 'Vinwonders 2 ngày', 'perPax', 100000, 1, 1, '${AT}', '${AT}')`);
  return w;
}
const taoLo = (w: any, as: string, nguon?: string) =>
  w.call("POST", "/api/ve/lo", { as, body: { catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "Vé thử", ...(nguon ? { nguon } : {}) } });
const them = (w: any, as: string, loId: string, ve: unknown[]) => w.call("POST", `/api/ve/lo/${loId}/ve`, { as, body: { ve } });
const ve = (n: number, maVe: string) => ({ noiDung: b64(PNG(n)), maVe, tuNgay: "2026-10-24", denNgay: "2099-11-23" });
/** Lô đã vào kho: hãng ngoài do Bán hàng nhập, Tour Đảo do Kế toán nhập. */
async function loVaoKho(w: any, nguon: "HANG_NGOAI" | "TOUR_DAO", n: number, xacNhan = true): Promise<string> {
  const as = nguon === "TOUR_DAO" ? KT : SALES;
  const lo = await taoLo(w, as, nguon);
  assert.equal(lo.status, 201, lo.text);
  const r = await them(w, as, lo.json.loId, [ve(n, nguon === "TOUR_DAO" ? maTD(n) : `TA.1000000000${n}`)]);
  assert.equal(r.json.themDuoc, 1, r.text);
  if (xacNhan) assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as, body: {} })).status, 200);
  return lo.json.loId;
}

test("tạo lô Tour Đảo: Bán hàng 403; Quản lý bán hàng, Kế toán, Quản trị, Toàn quyền tạo được; lô ghi nguồn TOUR_DAO", async () => {
  const w = setup();
  const r = await taoLo(w, SALES, "TOUR_DAO");
  assert.equal(r.status, 403, r.text);
  for (const as of [QLBH, KT, QT, SUPER]) {
    const t = await taoLo(w, as, "TOUR_DAO");
    assert.equal(t.status, 201, `${as}: ${t.text}`);
  }
  assert.deepEqual(w.q("SELECT DISTINCT source FROM vdt_batch").map((x: any) => x.source), ["TOUR_DAO"]);
  assert.equal((await taoLo(w, SALES)).status, 201, "không gửi nguồn ⇒ hãng ngoài, như cũ");
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_batch WHERE source = 'HANG_NGOAI'")[0].n, 1);
  assert.equal((await taoLo(w, KT)).status, 403, "Kế toán không tạo lô hãng ngoài");
  assert.equal((await taoLo(w, SUPER, "KHAC")).status, 400, "nguồn lạ");
  assert.equal((await taoLo(w, FIELD, "TOUR_DAO")).status, 403);
});

test("Kế toán: GET /kho chỉ thấy dòng lô Tour Đảo; không xác nhận, không thêm vé, không huỷ, không sửa lô hãng ngoài", async () => {
  const w = setup();
  await loVaoKho(w, "HANG_NGOAI", 1);
  await loVaoKho(w, "TOUR_DAO", 2);
  const k = await w.call("GET", "/api/ve/kho", { as: KT });
  assert.equal(k.status, 200, k.text);
  assert.deepEqual(k.json.kho.map((d: any) => [d.nguon, d.conTrong]), [["TOUR_DAO", 1]]);
  const s = await w.call("GET", "/api/ve/kho", { as: SALES });
  assert.deepEqual(s.json.kho.map((d: any) => d.nguon).sort(), ["HANG_NGOAI", "TOUR_DAO"], "Bán hàng xem số lượng cả hai nguồn");
  const lo = (await taoLo(w, SALES)).json.loId;
  await them(w, SALES, lo, [ve(3, "TA.10000000003")]);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo}/xac-nhan`, { as: KT, body: {} })).status, 403);
  assert.equal((await them(w, KT, lo, [ve(4, "TA.10000000004")])).status, 403);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo}/bo`, { as: KT, body: {} })).status, 403);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo}/sua-ma-tour`, { as: KT, body: { catalogCode: "V2D" } })).status, 403);
  assert.ok(!(await w.call("GET", "/api/ve/lo", { as: KT })).json.lo.some((l: any) => l.loId === lo), "Kế toán không thấy lô hãng ngoài ở danh sách lô");
  assert.equal(w.q(`SELECT status FROM vdt_batch WHERE id = '${lo}'`)[0].status, "PENDING");
});

test("Bán hàng: GET /lo thấy lô Tour Đảo; không thêm vé, xác nhận, huỷ, sửa lô Tour Đảo; GET /lo-da-huy không có lô Tour Đảo", async () => {
  const w = setup();
  const td = await loVaoKho(w, "TOUR_DAO", 1, false);
  const ds = await w.call("GET", "/api/ve/lo", { as: SALES });
  assert.equal(ds.status, 200, ds.text);
  assert.deepEqual(ds.json.lo.map((l: any) => [l.loId, l.nguon, l.soVe]), [[td, "TOUR_DAO", 1]]);
  assert.equal((await them(w, SALES, td, [ve(2, maTD(2))])).status, 403);
  assert.equal((await w.call("POST", `/api/ve/lo/${td}/xac-nhan`, { as: SALES, body: {} })).status, 403);
  assert.equal((await w.call("POST", `/api/ve/lo/${td}/bo`, { as: SALES, body: {} })).status, 403);
  assert.equal((await w.call("POST", `/api/ve/lo/${td}/sua-ma-tour`, { as: SALES, body: { catalogCode: "V2D" } })).status, 403);
  // Huỷ một lô mỗi nguồn: lô đã huỷ Tour Đảo chỉ cho người giữ ve.phat-hanh.
  assert.equal((await w.call("POST", `/api/ve/lo/${td}/bo`, { as: KT, body: {} })).status, 200);
  const hn = await loVaoKho(w, "HANG_NGOAI", 3, false);
  assert.equal((await w.call("POST", `/api/ve/lo/${hn}/bo`, { as: SALES, body: {} })).status, 200);
  const huySales = await w.call("GET", "/api/ve/lo-da-huy", { as: SALES });
  assert.equal(huySales.status, 200, huySales.text);
  assert.deepEqual(huySales.json.lo.map((l: any) => l.loId), [hn]);
  const huyKt = await w.call("GET", "/api/ve/lo-da-huy", { as: KT });
  assert.deepEqual(huyKt.json.lo.map((l: any) => l.loId), [td]);
  const veTd = huyKt.json.lo[0].ve[0].veId;
  const veHn = huySales.json.lo[0].ve[0].veId;
  assert.equal((await w.call("POST", `/api/ve/lo-da-huy/${veTd}/mo`, { as: SALES, body: {} })).status, 403);
  assert.equal((await w.call("GET", `/api/ve/lo-da-huy/${veTd}/anh`, { as: SALES })).status, 403);
  assert.equal((await w.call("POST", `/api/ve/lo-da-huy/${veHn}/mo`, { as: KT, body: {} })).status, 403);
  assert.equal((await w.call("POST", `/api/ve/lo-da-huy/${veTd}/mo`, { as: KT, body: {} })).status, 200);
  assert.equal((await w.call("GET", `/api/ve/lo-da-huy/${veTd}/anh`, { as: KT })).status, 200);
});

test("dạng mã: lô Tour Đảo từ chối mã ABC123; lô hãng ngoài từ chối mã TD1.…; không vé nào vào kho", async () => {
  const w = setup();
  const td = (await taoLo(w, KT, "TOUR_DAO")).json.loId;
  const a = await them(w, KT, td, [ve(1, "ABC123")]);
  assert.equal(a.status, 200, a.text);
  assert.equal(a.json.themDuoc, 0);
  assert.equal(a.json.loai.length, 1);
  const hn = (await taoLo(w, SALES)).json.loId;
  const b = await them(w, SALES, hn, [ve(2, maTD(2))]);
  assert.equal(b.json.themDuoc, 0);
  assert.equal(b.json.loai.length, 1);
  assert.doesNotMatch(a.text + b.text, /TD1\.[A-Z2-7]{26}|ABC123/, "câu lỗi không nhắc lại mã");
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket")[0].n, 0);
  assert.equal((await them(w, KT, td, [ve(3, maTD(3))])).json.themDuoc, 1, "đúng dạng thì vào");
});

test("không giữ quyền nguồn nào ⇒ 403 ở GET /kho, /lo, /lo-da-huy", async () => {
  const w = setup();
  for (const u of ["/api/ve/kho", "/api/ve/lo", "/api/ve/lo-da-huy"]) assert.equal((await w.call("GET", u, { as: FIELD })).status, 403, u);
});
