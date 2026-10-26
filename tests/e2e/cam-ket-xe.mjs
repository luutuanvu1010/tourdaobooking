// Cam kết "xe riêng" / "xe tối thiểu N chỗ" trên chặng đưa đón (ADR-0056 VK3-A, Vận chuyển Đợt 7, Task 7) trên API THẬT (wrangler dev, D1 local tạm).
// ADR-0128 Q2 (chủ duyệt 2026-10-17): XE RIÊNG KHÔNG AI GHÉP THÊM KHÁCH LẺ, kể cả khẩn cấp hay phá lệ (chặn cứng 409 chang_khong_hop_le, không có đường phá lệ);
// SỐ CHỖ TỐI THIỂU vẫn phá lệ được như cũ. Nên ống dẫn phá lệ (2)–(5) chạy bằng đơn đòi ≥ 16 chỗ (xe thử 15 chỗ), còn xe riêng canh ở (2a) và (5).
//   (1) Đối tác (PARTNER) lập đơn nháp có chặng XE RIÊNG → 201, cờ đọc lại đúng (tiêu chí 4); văn phòng xác nhận;
//   (2a) xếp A (xe riêng) → 200; xếp B (đơn khác) vào cùng chuyến → 409 chang_khong_hop_le (chặn cứng); Quản trị gửi camKetPhaLe cũng 409; hai cột phá lệ trống;
//   (2) [sau khi rút A] B đòi ≥ 16 chỗ: xếp B → 409 can_pha_le_cam_ket (canQuyen theo vai, lý do CAM_KET); Bán hàng gửi camKetPhaLe → 403
//       (không ghi); Quản trị gửi camKetPhaLe → 200, hai cột phá lệ của chuyến CÓ (lý do thuộc nhóm PHA_LE);
//   (3) xếp C (cũng đòi ≥ 16 chỗ) → 409; Quản trị phá lệ → 200; rút B và C → hết vi phạm → hai cột về trống (kiểm trực tiếp D1) và ghép lại B → 409 cần phá lệ MỚI;
//   (4) xếp lại A, bật minVehicleSeats = 30 trên chặng A (xe 15 chỗ; đường thật PUT /legs) → xuất bến 409 chua_du_dieu_kien_xuat_ben có lý do CAM_KET;
//   (5) ADR-0104 Đ1 (NỚI có tên N5): chuyến DƯỚI mốc (bắt đầu sau 2 giờ 30) — Bán hàng xếp đơn đòi ≥ 16 chỗ: 409 lớp KHAN_CAP (canQuyen
//       đúng); kèm điều chỉnh khẩn cấp (mốc + cam kết) → 200, cột phá lệ cam kết có; xe riêng ghép vào thì 409 chặn cứng dù đủ hai cờ. Vế (2) — chuyến NGÀY MAI, ngoài mốc — Bán hàng vẫn 403.
// Dữ liệu độc nhất theo lần chạy (SĐT ngẫu nhiên, biển số theo Date.now()). Chuyến chạy NGÀY MAI (xếp không vướng mốc 6 giờ). Tên khách, giấy tờ là GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate, moCuaSoXuatBen48Gio } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const D = vnDate(1); // ADR-0096 Đ2 (LC-20): chuyến NGÀY MAI + cửa sổ 48 giờ — xuất bến ngay được, giờ đón vẫn ngoài mốc 6 giờ
await moCuaSoXuatBen48Gio();
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const P = (n) => ({ fullName: `Khách Cam Kết E2E ${n}`, birthYear: 1933, paxCode: null });
const leg = (noi, extra = {}) => ({ direction: "OUT", pickupDate: D, pickupTime: "10:00", pickupLocationId: null, pickupPlace: noi, dropoffLocationId: LOC, dropoffPlace: "", ...extra });
const PL = { lyDo: "PHA_LE_SU_CO" }; // lý do thuộc nhóm PHA_LE (mã có sẵn của hộp phá lệ)
let r;

// --- Nền: Đối tác dùng một lần; tài xế công ty (GPLX D1); xe 15 chỗ có Kiểm định + Bảo hiểm ---
r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Đối Tác Cam Kết ${duoi}`, phone: randomPhone(), roles: ["COLLABORATOR"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const PARTNER = (await login(r.body.staff.phone, r.body.pin)).cookie;
r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế Cam Kết E2E", phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${r.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: `79${String(Date.now()).slice(-10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const xeId = uuid();
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const AT = new Date().toISOString();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xeId}', '79G-${duoi.slice(0, 3)}.${duoi.slice(3)}', '79G${duoi}', 'E2ECK${duoi}', 'E2ECK${duoi}', 'Xe cam kết E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
  await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${xeId}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
}
const cot = async (tripId) => (await sqlRows(`SELECT commitment_override_reason_code AS r, commitment_override_key AS k FROM vc_trip WHERE id = '${tripId}'`))[0];

// --- (1) Đối tác lập NHÁP có xe riêng (tiêu chí 4); Bán hàng lập hai đơn B, C thường; văn phòng xác nhận ---
r = await call(PARTNER, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [leg(`Khách sạn Cam Kết A ${duoi}`, { exclusiveVehicle: true })] })], passengers: [P(1), P(2)] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const a = r.body.order;
assert.equal(a.services[0].legs[0].exclusiveVehicle, true, "đọc lại: chặng của Đối tác mang cờ xe riêng");
assert.equal(a.services[0].legs[0].minVehicleSeats, null);
const donThuong = async (ten, noi, extra = {}) => {
  const x = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [leg(noi, extra)] })], passengers: ten }));
  assert.equal(x.status, 201, JSON.stringify(x.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${x.body.order.id}/status`, { status: "confirmed" })).status, 200);
  return x.body.order;
};
// ADR-0135 Đ2 + ADR-0136: nháp của Đối tác là riêng tư, Quản trị không xác nhận thay (404); Đối tác tự «Gửi đơn» (nhánh B, không dịch vụ cần xác nhận) → đơn đã xác nhận
r = await call(PARTNER, "POST", `/api/orders/${a.id}/gui-don`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
const b = await donThuong([P(3), P(4)], `Khách sạn Cam Kết B ${duoi}`, { minVehicleSeats: 16 }); // ADR-0128 Q2: đòi ≥ 16 chỗ (xe 15) — vi phạm phá lệ được
const c = await donThuong([P(5), P(6)], `Khách sạn Cam Kết C ${duoi}`, { minVehicleSeats: 16 });
const legA = a.services[0].legs[0].id, legB = b.services[0].legs[0].id, legC = c.services[0].legs[0].id;
console.log("✓ (1) Đối tác lập nháp có xe riêng → 201, cờ đọc lại đúng; Đối tác Gửi đơn A; B, C đòi ≥ 16 chỗ");

// --- (2a) xếp A (xe riêng); xếp B → 409 chặn cứng (ADR-0128 Q2); rút A. (2) xếp B (đòi ≥ 16 chỗ) → 409; Bán hàng phá lệ → 403 (chuyến NGÀY MAI — ngoài mốc, lớp QUAN_TRI; ADR-0104 Đ1); Quản trị phá lệ → 200 ---
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: txParty, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tripId = r.body.chuyen.id;
const xep = (as, chuyen, legId, extra = {}) => call(as, "POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { version: chuyen.version, requestId: uuid(), chang: [{ legId, soSuat: 2 }], ...extra });
r = await xep(SALES, r.body.chuyen, legA);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(await cot(tripId), { r: null, k: null }, "chuyến chỉ có đơn A: không vi phạm, không có dấu phá lệ");
let ch = r.body.chuyen;
// (2a) ADR-0128 Q2: xe riêng của A — ghép thêm đơn B: chặn cứng, Quản trị gửi camKetPhaLe cũng 409, không ghi gì.
r = await xep(SALES, ch, legB);
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "chang_khong_hop_le", "xe riêng: chặn cứng, không phải can_pha_le_cam_ket");
assert.ok(r.body.error.lyDo.every((l) => l.ma === "CAM_KET"), JSON.stringify(r.body.error.lyDo));
r = await xep(ADMIN, ch, legB, { camKetPhaLe: PL });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "chang_khong_hop_le");
assert.deepEqual(await cot(tripId), { r: null, k: null }, "xe riêng không phá lệ được: không ghi cột");
console.log("✓ (2a) xe riêng của A: ghép B → 409 chang_khong_hop_le (cả Quản trị kèm camKetPhaLe); hai cột trống");
const rutA = await sqlRows(`SELECT id FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND leg_id = '${legA}' AND valid_to_at IS NULL`);
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/rut`, { version: ch.version, requestId: uuid(), suatIds: rutA.map((x) => x.id) });
assert.equal(r.status, 200, JSON.stringify(r.body));
ch = r.body.chuyen;
r = await xep(SALES, ch, legB);
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "can_pha_le_cam_ket");
assert.equal(r.body.error.canQuyen, false, "Bán hàng không có quyền phá lệ");
assert.equal(r.body.error.lop, "QUAN_TRI", "ADR-0104 Đ1: chuyến ngoài mốc — cam kết chỉ Quản trị, Toàn quyền");
assert.ok(r.body.error.lyDo.length >= 1 && r.body.error.lyDo.every((l) => l.ma === "CAM_KET"), JSON.stringify(r.body.error.lyDo));
assert.equal((await xep(ADMIN, ch, legB)).body.error.canQuyen, true, "Quản trị có quyền phá lệ");
r = await xep(SALES, ch, legB, { camKetPhaLe: PL });
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.deepEqual(await cot(tripId), { r: null, k: null }, "403 không ghi gì");
r = await xep(ADMIN, ch, legB, { camKetPhaLe: PL });
assert.equal(r.status, 200, JSON.stringify(r.body));
ch = r.body.chuyen;
const sauB = await cot(tripId);
assert.equal(sauB.r, PL.lyDo);
assert.ok(typeof sauB.k === "string" && sauB.k.length > 0, "khoá cam kết được ghi");
assert.ok(!JSON.stringify(r.body).includes(sauB.k), "khoá không lộ ở phản hồi");
console.log("✓ (2) xếp B: 409 can_pha_le_cam_ket (canQuyen sai/đúng theo vai); Bán hàng phá lệ 403 không ghi; Quản trị phá lệ 200, hai cột phá lệ có");

// --- (3) xếp C (đòi ≥ 16 chỗ): 409 → Quản trị phá lệ; rút B và C → hai cột trống; ghép lại phải 409 ---
r = await xep(SALES, ch, legC);
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "can_pha_le_cam_ket");
r = await xep(ADMIN, ch, legC, { camKetPhaLe: PL });
assert.equal(r.status, 200, JSON.stringify(r.body));
ch = r.body.chuyen;
const suatMo = async (legId) => (await sqlRows(`SELECT id FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND leg_id = '${legId}' AND valid_to_at IS NULL`)).map((x) => x.id);
const rut = async (legId) => {
  const ids = await suatMo(legId);
  assert.equal(ids.length, 2, "hai suất mở của chặng");
  const x = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/rut`, { version: ch.version, requestId: uuid(), suatIds: ids });
  assert.equal(x.status, 200, JSON.stringify(x.body));
  ch = x.body.chuyen;
};
await rut(legB);
assert.notEqual((await cot(tripId)).r, null, "rút B nhưng C vẫn ghép: còn vi phạm, cột còn");
await rut(legC);
assert.deepEqual(await cot(tripId), { r: null, k: null }, "rút hết: không còn vi phạm, hai cột về trống");
r = await xep(SALES, ch, legB);
assert.equal(r.status, 409, "cột đã xoá: ghép lại phải cần phá lệ MỚI");
assert.equal(r.body.error.code, "can_pha_le_cam_ket");
console.log("✓ (3) xếp C 409 → phá lệ 200; rút B, rút C → hai cột trống (đọc D1); ghép lại B → 409 cần phá lệ mới");

// --- (4) xếp lại A (xe riêng, một mình trên chuyến trống → không vi phạm); số chỗ tối thiểu 30 trên chặng A (xe 15 chỗ) → xuất bến 409 CAM_KET ---
r = await xep(SALES, ch, legA);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(await cot(tripId), { r: null, k: null }, "A một mình: không vi phạm");
const la = (await call(SALES, "GET", `/api/orders/${a.id}`)).body.order.services[0].legs[0];
r = await call(ADMIN, "PUT", `/api/orders/${a.id}/legs/${la.id}`, {
  expectedUpdatedAt: la.updatedAt,
  leg: { ...leg(la.pickupPlace ?? `Khách sạn Cam Kết A ${duoi}`), pickupDate: la.pickupDate, pickupTime: la.pickupTime, exclusiveVehicle: true, minVehicleSeats: 30 },
});
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "chua_du_dieu_kien_xuat_ben");
assert.ok(r.body.error.lyDo.some((l) => l.ma === "CAM_KET"), JSON.stringify(r.body.error.lyDo));
assert.equal((await sqlRows(`SELECT status AS x FROM vc_trip WHERE id = '${tripId}'`))[0].x, "PLANNED", "chuyến chưa xuất bến");
console.log("✓ (4) bật minVehicleSeats 30 trên xe 15 chỗ → xuất bến 409 chua_du_dieu_kien_xuat_ben có lý do CAM_KET; chuyến vẫn PLANNED");

// --- (5) ADR-0104 Đ1: chuyến DƯỚI mốc — Bán hàng điều chỉnh khẩn cấp cả mốc lẫn cam kết ---
// Không phụ thuộc giờ chạy: đơn E, F đón NGÀY MAI 10:00 nên lúc xác nhận luôn còn ≥ 10 giờ (ngoài mốc, không cần đặt gấp); chuyến bắt đầu sau 2 giờ 30 (luôn
// dưới mốc) — chạy sau 21:30 giờ VN thì chuyến qua nửa đêm (máy chủ không chặn chuyến qua đêm) và vẫn cách chuyến (2) ngày mai 09:30 nhiều giờ.
const vnSau = (phut) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * 60e3).toISOString();
  return { ngay: iso.slice(0, 10), gio: iso.slice(11, 16) };
};
const e = await donThuong([P(9), P(10)], `Khách sạn Cam Kết E ${duoi}`, { minVehicleSeats: 16 }); // ADR-0128 Q2: đòi ≥ 16 chỗ thay cho xe riêng (phá lệ được)
const legE = e.services[0].legs[0].id;
const f = await donThuong([P(11), P(12)], `Khách sạn Cam Kết F ${duoi}`, { minVehicleSeats: 16 });
const legF = f.services[0].legs[0].id;
const g = await donThuong([P(13), P(14)], `Khách sạn Cam Kết G ${duoi}`, { exclusiveVehicle: true }); // xe riêng: chặn cứng
const legG = g.services[0].legs[0].id;
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: txParty, batDau: vnSau(150), ketThuc: vnSau(240) });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.chuyen.khoaMoc.dangKhoa, true, "chuyến dưới mốc 6 giờ");
const gan = r.body.chuyen.id;
const xepGan = (chuyen, legId, extra = {}) => call(SALES, "POST", `/api/van-chuyen/chuyen/${gan}/phan-bo`, { version: chuyen.version, requestId: uuid(), chang: [{ legId, soSuat: 2 }], ...extra });
const chMoi = r.body.chuyen;
r = await xepGan(chMoi, legE, { phaLe: PL });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual([r.body.error.code, r.body.error.lop, r.body.error.canQuyen], ["can_pha_le_cam_ket", "KHAN_CAP", true], "E đòi ≥ 16 chỗ: vi phạm ngay từ một đơn");
r = await xepGan(chMoi, legE, { phaLe: PL, camKetPhaLe: PL });
assert.equal(r.status, 200, JSON.stringify(r.body));
let chGan = r.body.chuyen;
r = await xepGan(chGan, legF, { phaLe: PL });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual([r.body.error.code, r.body.error.lop, r.body.error.canQuyen], ["can_pha_le_cam_ket", "KHAN_CAP", true]);
r = await xepGan(chGan, legF, { phaLe: PL, camKetPhaLe: PL });
assert.equal(r.status, 200, JSON.stringify(r.body));
chGan = r.body.chuyen;
const cotGan = await cot(gan);
assert.equal(cotGan.r, PL.lyDo, "cột phá lệ cam kết có (lớp điều chỉnh khẩn cấp)");
// ADR-0128 Q2: xe riêng của G ghép vào — chặn cứng dù đủ cả hai cờ (Bán hàng và Quản trị), cột phá lệ giữ nguyên.
r = await xepGan(chGan, legG, { phaLe: PL, camKetPhaLe: PL });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "chang_khong_hop_le", "xe riêng: chặn cứng, không còn lớp KHAN_CAP");
r = await call(ADMIN, "POST", `/api/van-chuyen/chuyen/${gan}/phan-bo`, { version: chGan.version, requestId: uuid(), chang: [{ legId: legG, soSuat: 2 }], phaLe: PL, camKetPhaLe: PL });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "chang_khong_hop_le");
assert.deepEqual(await cot(gan), cotGan, "cột phá lệ giữ nguyên");
console.log("✓ (5) chuyến dưới mốc: Bán hàng xếp đơn đòi ≥ 16 chỗ → 409 lớp KHAN_CAP (canQuyen đúng); kèm điều chỉnh khẩn cấp → 200, cột cam kết có; xe riêng ghép vào → 409 chặn cứng");
