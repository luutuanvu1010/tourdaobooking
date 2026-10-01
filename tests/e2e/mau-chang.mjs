// Mẫu đưa đón theo dịch vụ ở màn Danh mục (bản vẽ M7; ADR-0054 D10.1–D10.2, ADR-0076 nơi trả gợi ý) trên API THẬT (wrangler dev, D1 local tạm) — nợ nhỏ
// 2026-10-01 (docs/superpowers/plans/2026-10-01-dua-don-no-nho-nhat-ky.md, việc 6). Bài đơn vị cùng luật: src/modules/van-chuyen/mau-chang.test.ts.
//   (1) Quản trị ghi lần lượt Không đưa đón → Một chiều (+ nơi trả gợi ý) → Hai chiều (+ giờ về) → 201; lịch sử mới trước, mỗi lần một bản MỚI, bản cũ còn;
//       mỗi bản mang `createdBy` = id tài khoản người ghi (không SĐT); bản hiện hành = bản cuối.
//   (2) Người không phải Quản trị (Bán hàng, Kế toán, Hướng dẫn viên) → 403 cả đọc lịch sử lẫn ghi; không thêm bản.
//   (3) Nơi trả gợi ý là điểm đã ngưng / không có → 400; không thêm bản.
//   (4) Route form GET /api/van-chuyen/mau-chang: Bán hàng 200, mã của kịch bản có ĐÚNG ba khoá, nơi trả { id, ten }; Kế toán, Hướng dẫn viên 403.
// Mã dịch vụ riêng `ZMC1` (không trùng ZE*/ZT*/ZZ*/ZH* của kịch bản khác); điểm đã ngưng gieo một lần (mã theo Date.now()). Bảng mẫu chỉ-thêm: không dọn.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sql, sqlRows } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const KE_TOAN = await session(ACCOUNTS.accountant);
const HDV = await session(ACCOUNTS.field);
const MA = "ZMC1";
const BEN_TAU = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const NGUNG = crypto.randomUUID();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,in_sheet,first_seen_at,updated_at) VALUES ('${MA}','Dịch vụ mẫu đưa đón e2e','perPax',100000,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET in_sheet = 1`);
await sql(`INSERT INTO loc_location (id, code, name, location_type_code, active, created_at, updated_at) VALUES ('${NGUNG}', 'E2E_MC_${Date.now()}', 'Bến cũ e2e', 'PIER', 0, ${AT}, ${AT})`);
const adminId = (await call(ADMIN, "GET", "/api/auth/me")).body.staff.id;
const soBan = async () => (await sqlRows(`SELECT count(*) AS n FROM vc_leg_template WHERE code = '${MA}'`))[0].n;
const ghi = async (as, body) => {
  await new Promise((ok) => setTimeout(ok, 5)); // hai bản cùng mili-giây → 409 stale (UNIQUE (code, valid_from_at) — đúng thiết kế)
  return call(as, "POST", `/api/van-chuyen/mau-chang/${MA}`, body);
};
let r;

// --- (1) Quản trị ghi ba bản ---
const truoc = await soBan();
const cacBan = [
  { mode: "NONE", returnTimeHint: null, noiTraMacDinhId: null },
  { mode: "ONE_WAY", returnTimeHint: null, noiTraMacDinhId: BEN_TAU },
  { mode: "ROUND_TRIP", returnTimeHint: "16:30", noiTraMacDinhId: BEN_TAU },
];
for (const [i, b] of cacBan.entries()) {
  r = await ghi(ADMIN, b);
  assert.equal(r.status, 201, `bản ${i + 1} (${b.mode}): ${JSON.stringify(r.body)}`);
  assert.equal(r.body.lichSu.length, truoc + i + 1, "mỗi lần lưu thêm ĐÚNG một bản, bản cũ còn");
  assert.equal(r.body.hienHanh.mode, b.mode);
}
r = await call(ADMIN, "GET", `/api/van-chuyen/mau-chang/${MA}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.lichSu.slice(0, 3).map((x) => [x.mode, x.returnTimeHint, x.noiTraMacDinh?.id ?? null]), [
  ["ROUND_TRIP", "16:30", BEN_TAU], ["ONE_WAY", null, BEN_TAU], ["NONE", null, null],
], "mới trước");
assert.deepEqual(r.body.hienHanh, r.body.lichSu[0]);
assert.deepEqual(r.body.hienHanh.noiTraMacDinh, { id: BEN_TAU, ten: "Bến tàu du lịch Nha Trang", dangDung: true });
for (const ban of r.body.lichSu) assert.deepEqual(Object.keys(ban).sort(), ["createdBy", "mode", "noiTraMacDinh", "returnTimeHint", "tuLuc"]);
assert.deepEqual(r.body.lichSu.slice(0, 3).map((x) => x.createdBy), [adminId, adminId, adminId], "người đổi = id tài khoản Quản trị");
assert.doesNotMatch(JSON.stringify(r.body), new RegExp(ACCOUNTS.admin.phone), "không SĐT người ghi");
const [nk] = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'transfer_template_set' AND detail LIKE 'Mẫu đưa đón ${MA}:%'`);
assert.ok(nk.n >= 3, `nhật ký transfer_template_set cho ${MA}: ${nk.n}`);
console.log("✓ Quản trị ghi Không / Một / Hai chiều + nơi trả gợi ý → 201; lịch sử mới trước, mỗi lần một bản mới, người đổi = id tài khoản");

// --- (2) Người không phải Quản trị → 403, không thêm bản ---
const sauGhi = await soBan();
for (const [ten, as] of [["Bán hàng", SALES], ["Kế toán", KE_TOAN], ["Hướng dẫn viên", HDV]]) {
  assert.equal((await ghi(as, { mode: "ONE_WAY", returnTimeHint: null })).status, 403, `${ten} ghi mẫu`);
  assert.equal((await call(as, "GET", `/api/van-chuyen/mau-chang/${MA}`)).status, 403, `${ten} đọc lịch sử mẫu`);
}
assert.equal(await soBan(), sauGhi, "403 không ghi gì");
console.log("✓ Bán hàng, Kế toán, Hướng dẫn viên → 403 cả ghi lẫn đọc lịch sử; không thêm bản");

// --- (3) Điểm đã ngưng / không có → 400 ---
r = await ghi(ADMIN, { mode: "ONE_WAY", returnTimeHint: null, noiTraMacDinhId: NGUNG });
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.match(r.body.error.message, /đã ngưng/);
r = await ghi(ADMIN, { mode: "ONE_WAY", returnTimeHint: null, noiTraMacDinhId: crypto.randomUUID() });
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.equal(await soBan(), sauGhi, "400 không ghi gì");
console.log("✓ nơi trả gợi ý là điểm đã ngưng / không có → 400, không thêm bản");

// --- (4) Route form cho người lập đơn ---
r = await call(SALES, "GET", "/api/van-chuyen/mau-chang");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.mauChang[MA], { mode: "ROUND_TRIP", returnTimeHint: "16:30", noiTraMacDinh: { id: BEN_TAU, ten: "Bến tàu du lịch Nha Trang" } });
for (const m of Object.values(r.body.mauChang)) assert.deepEqual(Object.keys(m).sort(), ["mode", "noiTraMacDinh", "returnTimeHint"], "route form ĐÚNG ba khoá (không createdBy)");
for (const [ten, as] of [["Kế toán", KE_TOAN], ["Hướng dẫn viên", HDV]]) assert.equal((await call(as, "GET", "/api/van-chuyen/mau-chang")).status, 403, `${ten} đọc route form`);
console.log("✓ route form GET /api/van-chuyen/mau-chang: Bán hàng 200 (ba khoá, nơi trả gợi ý đúng); Kế toán, Hướng dẫn viên 403");
