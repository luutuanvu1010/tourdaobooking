// Tiền xe thuê (ADR-0057 T1 + T2 — kế hoạch Đợt 4 Task 4, 9, 10) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) T1: Kế toán thêm tuyến, cỡ xe, giá thuê cho nhà xe; Bán hàng đọc TÊN tuyến 200, bảng giá 403; thêm giá chồng 409; tiền lưu INTEGER trên D1.
//   (2) T2: Bán hàng tạo chuyến xe nhà xe có giá → một SNAPSHOT, xuất bến được; chuyến xe nhà xe không giá → xuất bến 409 "Chuyến xe thuê chưa có giá";
//       đổi tuyến → đảo + chụp lại (V7 rút gọn); dòng chi phí INTEGER trên D1.
//   (3) Kế toán nhập giá thoả thuận cho chuyến thiếu giá → xuất bến được; bảng kê có hai chuyến, tổng do máy chủ; Bán hàng xem chi phí → 403.
// Dữ liệu độc nhất theo lần chạy (tên theo Date.now()). Tên nhà xe là GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sql, sqlRows, vnDate } from "./lib.mjs";

const ACC = await session(ACCOUNTS.accountant);
const SALES = await session(ACCOUNTS.salesA);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
let r;

// --- Nền: nhà xe đối tác đang hợp tác (hồ sơ tổ chức + vai CARRIER) ---
const nx = uuid();
await sql(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${nx}', 'ORGANIZATION', 'Nhà xe E2E ${duoi}', 1, '${AT}', '${AT}')`);
await sql(`INSERT INTO pty_organization (party_id, legal_name, created_at, updated_at) VALUES ('${nx}', 'Nhà xe E2E ${duoi}', '${AT}', '${AT}')`); // R-N1-2: tổ chức có pty_organization
await sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('${uuid()}', '${nx}', 'CARRIER', NULL, '2026-09-01', '${AT}', '${AT}')`);

// --- (1) T1 ---
r = await call(ACC, "POST", "/api/van-chuyen/tuyen", { ten: `Nha Trang – Cam Ranh E2E ${duoi}` });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tuyen = r.body.tuyen.find((t) => t.ten === `Nha Trang – Cam Ranh E2E ${duoi}`).ma;
r = await call(ACC, "POST", "/api/van-chuyen/bang-gia", { requestId: uuid(), nhaXePartyId: nx, tuyen, coXe: null, soTien: 1200000, tuNgay: "2026-10-01", denNgay: null, ghiChu: null, thayDongId: null });
assert.equal(r.status, 201, JSON.stringify(r.body));
const giaId = r.body.dong.id;
r = await call(ACC, "POST", "/api/van-chuyen/bang-gia", { requestId: uuid(), nhaXePartyId: nx, tuyen, coXe: null, soTien: 1300000, tuNgay: "2026-12-01", denNgay: null, ghiChu: null, thayDongId: null });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "gia_chong");
r = await call(SALES, "GET", "/api/van-chuyen/tuyen");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok(r.body.tuyen.some((t) => t.ma === tuyen));
assert.ok(!JSON.stringify(r.body).includes("1200000"), "Bán hàng đọc tên tuyến, không thấy giá");
assert.equal((await call(SALES, "GET", "/api/van-chuyen/bang-gia")).status, 403);
r = await call(ACC, "GET", `/api/van-chuyen/bang-gia?nha-xe=${nx}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok(r.body.dong.some((d) => d.id === giaId && d.soTien === 1200000));
const [{ t }] = await sqlRows(`SELECT typeof(amount) AS t FROM vc_rental_rate WHERE id = '${giaId}'`);
assert.equal(t, "integer", "tiền là INTEGER trên D1");

console.log("✓ (1) bảng giá thuê xe: tuyến, giá, chồng 409, Bán hàng chỉ đọc tên tuyến");

// --- (2) T2 ---
const D = vnDate(2);
const tx = uuid();
await sql(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${tx}', 'PERSON', 'Tài xế nhà xe E2E ${duoi}', 1, '${AT}', '${AT}')`);
await sql(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${tx}', 'Tài xế nhà xe E2E ${duoi}', '${AT}', '${AT}')`);
await sql(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('${uuid()}', '${tx}', '${nx}', 'DRIVES_FOR', '2026-09-01', '${AT}', '${AT}')`);
await sql(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
  VALUES ('${uuid()}', '${tx}', 'GPLX', '79${String(Date.now()).slice(-10)}', '79${String(Date.now()).slice(-10)}', 'Nơi cấp E2E', 'D', '${vnDate(400)}', '${AT}', '${AT}')`);
const xeNx = async (cho, bienDuoi) => {
  const id = uuid();
  await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES ('${id}', '79N-${bienDuoi}', '79N${bienDuoi}', 'E2ENX${bienDuoi}', 'E2ENX${bienDuoi}', 'Xe nhà xe E2E', 2021, ${cho}, '${nx}', 'active', '2026-09-01', '${AT}', '${AT}')`);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${id}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
  }
  return id;
};
const x16 = await xeNx(16, `${duoi.slice(0, 3)}1${duoi.slice(3)}`);
const x29 = await xeNx(29, `${duoi.slice(0, 3)}2${duoi.slice(3)}`);
r = await call(ACC, "POST", "/api/van-chuyen/co-xe", { tuSoKhach: 10, denSoKhach: 16 });
const c16 = r.status === 201 ? r.body.coXe.find((c) => c.tuSoKhach === 10 && c.denSoKhach === 16 && c.dangDung).ma : (await call(ACC, "GET", "/api/van-chuyen/co-xe")).body.coXe.find((c) => c.tuSoKhach <= 16 && c.denSoKhach >= 16 && c.dangDung)?.ma;
assert.ok(c16, JSON.stringify(r.body));
r = await call(ACC, "POST", "/api/van-chuyen/tuyen", { ten: `Nha Trang – Đà Lạt E2E ${duoi}` });
const dl = r.body.tuyen.find((t) => t.ten === `Nha Trang – Đà Lạt E2E ${duoi}`).ma;
assert.equal((await call(ACC, "POST", "/api/van-chuyen/bang-gia", { requestId: uuid(), nhaXePartyId: nx, tuyen: null, coXe: c16, soTien: 900000, tuNgay: "2026-10-01", denNgay: null, ghiChu: null, thayDongId: null })).status, 201);
// Chuyến có giá (16 chỗ, tuyến có giá 1.200.000) → một SNAPSHOT; xuất bến 200.
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: x16, taiXePartyId: tx, tuyen, batDau: { ngay: D, gio: "07:00" }, ketThuc: { ngay: D, gio: "08:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.ok(!JSON.stringify(r.body).includes("1200000"), "phản hồi lệnh xếp không mang tiền");
const tA = r.body.chuyen.id;
let rows = await sqlRows(`SELECT kind, amount, typeof(amount) AS t FROM vc_trip_cost_line WHERE trip_id = '${tA}' ORDER BY rowid`);
assert.deepEqual(rows.map((x) => [x.kind, x.amount, x.t]), [["SNAPSHOT", 1200000, "integer"]]);
// Đổi tuyến → đảo + chụp lại (giá theo cỡ 16 chỗ: 900.000).
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${tA}`);
r = await call(SALES, "PUT", `/api/van-chuyen/chuyen/${tA}`, { version: r.body.chuyen.version, requestId: uuid(), tuyen: dl });
assert.equal(r.status, 200, JSON.stringify(r.body));
rows = await sqlRows(`SELECT kind, amount FROM vc_trip_cost_line WHERE trip_id = '${tA}' ORDER BY rowid`);
assert.deepEqual(rows.map((x) => [x.kind, x.amount]), [["SNAPSHOT", 1200000], ["REVERSAL", -1200000], ["SNAPSHOT", 900000]]);
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${tA}`);
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tA}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
// Chuyến 29 chỗ không tuyến (không giá nào khớp) → không dòng; xuất bến 409 có lý do "Chuyến xe thuê chưa có giá".
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: x29, taiXePartyId: tx, batDau: { ngay: D, gio: "10:00" }, ketThuc: { ngay: D, gio: "11:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tB = r.body.chuyen.id;
assert.deepEqual(await sqlRows(`SELECT id FROM vc_trip_cost_line WHERE trip_id = '${tB}'`), []);
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tB}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.ok(r.body.error.lyDo.some((l) => l.ma === "THIEU_GIA" && /Chuyến xe thuê chưa có giá/.test(l.loiNhan)), JSON.stringify(r.body));
console.log("✓ (2) chi phí chuyến: chụp lúc xếp, đảo + chụp lại khi đổi tuyến, thiếu giá không xuất bến");

// --- (3) Giá thoả thuận + bảng kê ---
r = await call(ACC, "GET", `/api/van-chuyen/chuyen/${tB}/chi-phi`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chiPhi.coTheNhapThoaThuan, true);
r = await call(ACC, "POST", `/api/van-chuyen/chuyen/${tB}/chi-phi/gia-thoa-thuan`, { requestId: uuid(), phienBanChiPhi: r.body.chiPhi.phienBanChiPhi, soTien: 1350000, ghiChu: "Thoả thuận E2E" });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.chiPhi.tong, 1350000);
assert.equal((await call(SALES, "POST", `/api/van-chuyen/chuyen/${tA}/ket-thuc`, { requestId: uuid() })).status, 200, "tài xế xong chuyến trước");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tB}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await call(SALES, "GET", `/api/van-chuyen/chuyen/${tB}/chi-phi`)).status, 403);
r = await call(ACC, "GET", `/api/van-chuyen/chi-phi?tu=${D}&den=${D}&nha-xe=${nx}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual([r.body.soChuyen, r.body.tongCong], [2, 900000 + 1350000]);
const [{ t: tt }] = await sqlRows(`SELECT typeof(amount) AS t FROM vc_trip_cost_line WHERE trip_id = '${tB}'`);
assert.equal(tt, "integer");
console.log("✓ (3) giá thoả thuận → xuất bến; bảng kê tổng do máy chủ; Bán hàng không xem chi phí");

console.log("tien-xe-thue: OK");
