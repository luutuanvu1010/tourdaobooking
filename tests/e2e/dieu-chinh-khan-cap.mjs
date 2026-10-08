// Điều chỉnh khẩn cấp (ADR-0104 Đ1, Q-1 b — chủ 2026-10-08; kế hoạch `docs/superpowers/plans/2026-10-08-adr-0104-ke-hoach.md` §8 "e2e mới") trên API THẬT
// (wrangler dev, D1 local tạm). Không đơn, không khách — chỉ xe, tài xế, chuyến dùng một lần:
//   (1) chuyến DƯỚI mốc (bắt đầu sau 2 giờ): Bán hàng đổi xe không kèm lý do → 409 can_pha_le lớp KHAN_CAP (canQuyen đúng); kèm lý do → 200, nhãn
//       "Điều chỉnh khẩn cấp" (khanCap) ở chi tiết và lịch; Kế toán gửi cùng lệnh → 403 ở ô điều phối (không ghi);
//   (2) chuyến NGOÀI mốc (sau 2 ngày): hai chuyến cùng xe cách 10 phút (khoảng nghỉ gieo 30 phút) — Bán hàng tạo chuyến thứ hai → 409 chua_du_nghi lớp
//       QUAN_TRI (canQuyen sai, câu cũ "cần Quản trị phá lệ"); Bán hàng gửi lý do → 403 "Chỉ Quản trị hoặc Toàn quyền phá lệ được." (không ghi);
//       Quản trị gửi lý do → 201, chuyến KHÔNG mang nhãn khẩn cấp.
// Dữ liệu độc nhất theo lần chạy (SĐT ngẫu nhiên, biển số theo Date.now()). Tên tài xế, số giấy tờ là GIẢ. Chuyến (1) có thể qua nửa đêm khi chạy sau 21:00 giờ VN —
// máy chủ không chặn chuyến qua đêm; chuyến (2) cách hiện tại ít nhất 24 giờ nên luôn ngoài mốc 6 giờ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const PL = { lyDo: "PHA_LE_SU_CO" }; // lý do thuộc nhóm PHA_LE ("Điều chỉnh khẩn cấp, phá lệ")
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const vnSau = (phut) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * 60e3).toISOString();
  return { ngay: iso.slice(0, 10), gio: iso.slice(11, 16) };
};
let r;

// --- Nền: tài xế công ty (GPLX D1); hai xe 15 chỗ có Kiểm định + Bảo hiểm, chủ = công ty ---
r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế Khẩn Cấp E2E", phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${r.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: `79${String(Date.now()).slice(-10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const AT = new Date().toISOString();
const xeMoi = async (so) => {
  const id = uuid();
  await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES ('${id}', '79K${so}-${duoi.slice(0, 3)}.${duoi.slice(3)}', '79K${so}${duoi}', 'E2EKC${so}${duoi}', 'E2EKC${so}${duoi}', 'Xe khẩn cấp E2E ${so}', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${id}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
  }
  return id;
};
const xe1 = await xeMoi(1);
const xe2 = await xeMoi(2);
const chiTiet = async (id) => (await call(SALES, "GET", `/api/van-chuyen/chuyen/${id}`)).body;
const soSuKien = async (id) => (await sqlRows(`SELECT COUNT(*) AS n FROM vc_trip_event WHERE trip_id = '${id}'`))[0].n;

// --- (1) Chuyến DƯỚI mốc: Bán hàng đổi xe = điều chỉnh khẩn cấp ---
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xe1, taiXePartyId: txParty, batDau: vnSau(120), ketThuc: vnSau(180) });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.chuyen.khoaMoc.dangKhoa, true, "chuyến dưới mốc 6 giờ");
assert.equal(r.body.chuyen.khanCap, false, "chuyến mới: chưa có nhãn khẩn cấp");
const gan = r.body.chuyen;
r = await call(SALES, "PUT", `/api/van-chuyen/chuyen/${gan.id}`, { requestId: uuid(), version: gan.version, xeId: xe2 });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual([r.body.error.code, r.body.error.lop, r.body.error.canQuyen], ["can_pha_le", "KHAN_CAP", true]);
assert.match(r.body.error.message, /cần điều chỉnh khẩn cấp kèm lý do/);
const truocAcc = await soSuKien(gan.id);
r = await call(ACC, "PUT", `/api/van-chuyen/chuyen/${gan.id}`, { requestId: uuid(), version: gan.version, xeId: xe2, phaLe: PL });
assert.equal(r.status, 403, "Kế toán không có ô điều phối");
assert.equal(await soSuKien(gan.id), truocAcc, "403 không ghi");
r = await call(SALES, "PUT", `/api/van-chuyen/chuyen/${gan.id}`, { requestId: uuid(), version: gan.version, xeId: xe2, phaLe: PL });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.xe.id, xe2);
const ct = await chiTiet(gan.id);
assert.equal(ct.chuyen.khanCap, true, "chi tiết: nhãn Điều chỉnh khẩn cấp");
const [{ luat, nguoi }] = await sqlRows(`SELECT override_rule_code AS luat, override_reason_code AS nguoi FROM vc_trip_event WHERE trip_id = '${gan.id}' AND kind = 'UPDATED' ORDER BY rowid DESC LIMIT 1`);
assert.deepEqual([luat, nguoi], ["MOC_TOI_THIEU", PL.lyDo], "sự kiện mang luật mốc + lý do");
const lich = (await call(SALES, "GET", `/api/van-chuyen/lich?ngay=${ct.chuyen.ngayChay}`)).body;
assert.equal(lich.chuyen.find((c) => c.id === gan.id)?.khanCap, true, "lịch: nhãn Điều chỉnh khẩn cấp");
console.log("✓ (1) chuyến dưới mốc: Bán hàng đổi xe 409 lớp KHAN_CAP (canQuyen đúng); Kế toán 403 không ghi; Bán hàng kèm lý do 200, nhãn khẩn cấp ở chi tiết và lịch");

// --- (2) Chuyến NGOÀI mốc: khoảng nghỉ chỉ Quản trị phá lệ ---
const D = vnDate(2);
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xe1, taiXePartyId: txParty, batDau: { ngay: D, gio: "08:00" }, ketThuc: { ngay: D, gio: "10:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const sau = { requestId: uuid(), xeId: xe1, taiXePartyId: txParty, batDau: { ngay: D, gio: "10:10" }, ketThuc: { ngay: D, gio: "11:00" } };
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", sau);
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual([r.body.error.code, r.body.error.lop, r.body.error.canQuyen], ["chua_du_nghi", "QUAN_TRI", false]);
assert.equal(r.body.error.message, "Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ.");
assert.deepEqual(r.body.error.lyDo.map((l) => [l.ma, l.aiXuLy]), [["KHOANG_NGHI", "QUAN_TRI"]], "lý do kèm theo: Quản trị (ngoài mốc — Đ1 mục 9)");
const demChuyen = async () => (await sqlRows(`SELECT COUNT(*) AS n FROM vc_trip WHERE vehicle_id = '${xe1}' AND service_date = '${D}'`))[0].n;
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { ...sau, requestId: uuid(), nghiPhaLe: PL });
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(r.body.error.message, "Chỉ Quản trị hoặc Toàn quyền phá lệ được.");
assert.equal(await demChuyen(), 1, "403 không ghi");
r = await call(ADMIN, "POST", "/api/van-chuyen/chuyen", { ...sau, requestId: uuid(), nghiPhaLe: PL });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.chuyen.khanCap, false, "phá lệ khoảng nghỉ ngoài mốc: không nhãn khẩn cấp");
assert.equal(await demChuyen(), 2);
console.log("✓ (2) chuyến ngoài mốc: Bán hàng 409 lớp QUAN_TRI (canQuyen sai, câu cũ); gửi lý do 403 không ghi; Quản trị 201, không nhãn khẩn cấp");
