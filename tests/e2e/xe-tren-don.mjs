// ADR-0059 — XE TRÊN CHI TIẾT ĐƠN trên API THẬT (wrangler dev, D1 local tạm): `GET /api/van-chuyen/xe-cua-don/:orderId`.
//   (1) đơn 4 khách chia HAI xe (2 + 2) → Bán hàng thấy hai dòng: biển số, tên tài xế, số khách, trạng thái; chặng chưa xếp → xe rỗng;
//   (2) chuyến huỷ → không hiện;
//   (3) quyền: Kế toán, Quản trị, Toàn quyền, lai Bán hàng + HDV → 200; HDV ĐANG PHỤ TRÁCH đơn, Đối tác, Thực tập (cả với đơn mình lập), Tài xế ĐANG LÁI
//       chuyến của đơn, lai HDV + Thực tập → 403; đơn lạ → 404;
//   (4) danh sách trắng: đúng khoá, không SĐT, không tên khách, không khoá nơi; lịch sử đơn không có dòng trip_*.
// Dữ liệu độc nhất theo lần chạy (SĐT ngẫu nhiên, biển số theo Date.now()). Chuyến chạy NGÀY KIA (không vướng mốc 6 giờ). Tên khách, số giấy tờ GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const SUP = await session(ACCOUNTS.superAdmin);
const FIELD = await session(ACCOUNTS.field);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const D = vnDate(2);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const P = (n) => ({ fullName: `Khách Xe Trên Đơn E2E ${n}`, birthYear: 1944, paxCode: null });
const leg = (gio) => ({ direction: "OUT", pickupDate: D, pickupTime: gio, pickupLocationId: null, pickupPlace: `Khách sạn Xe Trên Đơn ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "" });
let r;

/** Tài khoản dùng một lần: `quyen` (mảng mã quyền) hoặc `vai` (mảng mã vai). Trả id, hồ sơ, cookie, SĐT. */
async function taiKhoan(ten, { quyen, vai }) {
  const phone = randomPhone();
  const x = await call(ADMIN, "POST", "/api/staff", { fullName: ten, phone, ...(quyen ? { permissions: quyen } : { roles: vai }) });
  assert.equal(x.status, 201, JSON.stringify(x.body));
  const cookie = (await login(phone, x.body.pin)).cookie;
  assert.ok(cookie, `đăng nhập ${ten}`);
  return { id: x.body.staff.id, partyId: x.body.staff.partyId, cookie, phone };
}

// --- Nền: hai tài xế công ty (vai DRIVER_INTERNAL + GPLX D1), ba xe 15 chỗ có Kiểm định + Bảo hiểm ---
const TX1 = await taiKhoan(`Tài Xế Một Xe Đơn ${duoi}`, { vai: ["DRIVER_INTERNAL"] });
const TX2 = await taiKhoan(`Tài Xế Hai Xe Đơn ${duoi}`, { vai: ["DRIVER_INTERNAL"] });
for (const [i, t] of [TX1, TX2].entries()) {
  const [{ party_id }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${t.id}'`);
  t.partyId = party_id;
  r = await call(ADMIN, "POST", `/api/parties/${party_id}/documents`, { typeCode: "GPLX", number: `79${i}${String(Date.now()).slice(-9)}`, classCode: "D1", expiryDate: vnDate(400) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
}
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const AT = new Date().toISOString();
const bien = [];
const xeIds = [];
for (let i = 0; i < 3; i++) {
  const id = uuid();
  const b = `79G-${i}${duoi.slice(0, 2)}.${duoi.slice(2)}`;
  await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES ('${id}', '${b}', '79G${i}${duoi}', 'E2EXD${i}${duoi}', 'E2EXD${i}${duoi}', 'Xe trên đơn E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${id}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
  }
  bien.push(b);
  xeIds.push(id);
}

// --- Đơn A (4 khách, HDV `field` phụ trách), đơn B (2 khách), đơn C (1 khách, chưa xếp) — đã xác nhận ---
const fieldId = (await call(FIELD, "GET", "/api/auth/me")).body.staff.id;
const donXacNhan = async (soKhach, gio, extra = {}) => {
  const x = await call(SALES, "POST", "/api/orders", orderInput({
    services: [catalogService({ pax: { adult: soKhach }, departDate: D, legs: [leg(gio)] })], passengers: Array.from({ length: soKhach }, (_v, i) => P(i + 1)), ...extra,
  }));
  assert.equal(x.status, 201, JSON.stringify(x.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${x.body.order.id}/status`, { status: "confirmed" })).status, 200);
  return x.body.order;
};
const A = await donXacNhan(4, "10:00", { handlerStaffId: fieldId });
const B = await donXacNhan(2, "14:00");
const C = await donXacNhan(1, "10:00");
const legA = A.services[0].legs[0].id;
const taoChuyen = async (xeId, tx, bd, kt) => {
  const x = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: tx.partyId, batDau: { ngay: D, gio: bd }, ketThuc: { ngay: D, gio: kt } });
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return x.body.chuyen;
};
const xep = async (chuyen, legId, soSuat) => {
  const x = await call(SALES, "POST", `/api/van-chuyen/chuyen/${chuyen.id}/phan-bo`, { version: chuyen.version, requestId: uuid(), chang: [{ legId, soSuat }] });
  assert.equal(x.status, 200, JSON.stringify(x.body));
  return x.body.chuyen;
};
const T1 = await taoChuyen(xeIds[0], TX1, "09:30", "12:00");
const T2 = await taoChuyen(xeIds[1], TX2, "09:30", "12:00");
await xep(T1, legA, 2);
await xep(T2, legA, 2);

// --- (1) Bán hàng: hai xe; chặng chưa xếp → xe rỗng ---
r = await call(SALES, "GET", `/api/van-chuyen/xe-cua-don/${A.id}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chang.length, 1);
assert.equal(r.body.chang[0].legId, legA);
const dong = [...r.body.chang[0].xe].sort((x, y) => x.bienSo.localeCompare(y.bienSo));
assert.deepEqual(dong, [
  { bienSo: bien[0], tenTaiXe: `Tài Xế Một Xe Đơn ${duoi}`, soKhach: 2, trangThai: "PLANNED" },
  { bienSo: bien[1], tenTaiXe: `Tài Xế Hai Xe Đơn ${duoi}`, soKhach: 2, trangThai: "PLANNED" },
]);
const textA = JSON.stringify(r.body);
r = await call(SALES, "GET", `/api/van-chuyen/xe-cua-don/${C.id}`);
assert.deepEqual(r.body, { chang: [{ legId: C.services[0].legs[0].id, xe: [] }] });
console.log(`✓ (1) đơn ${A.orderCode} chia hai xe (${bien[0]}, ${bien[1]}): biển số, tên tài xế, 2 + 2 khách, trạng thái; đơn chưa xếp → "chưa xếp xe"`);

// --- (2) Chuyến huỷ không hiện ---
const T3 = await taoChuyen(xeIds[2], TX1, "13:30", "15:30");
const t3 = await xep(T3, B.services[0].legs[0].id, 2);
assert.equal((await call(SALES, "GET", `/api/van-chuyen/xe-cua-don/${B.id}`)).body.chang[0].xe.length, 1, "đối chứng: trước khi huỷ có một xe");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${T3.id}/huy`, { version: t3.version, requestId: uuid(), lyDo: "HUY_KHAC" });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SALES, "GET", `/api/van-chuyen/xe-cua-don/${B.id}`);
assert.deepEqual(r.body.chang[0].xe, [], "chuyến huỷ không hiện");
console.log("✓ (2) chuyến huỷ → không hiện trên đơn");

// --- (3) Quyền từng vai + tài khoản lai ---
const LAI_BAN_HDV = await taiKhoan(`Lai Bán HDV Xe Đơn ${duoi}`, { quyen: ["SALES", "FIELD"] });
const LAI_HDV_TT = await taiKhoan(`Lai HDV Thực Tập Xe Đơn ${duoi}`, { quyen: ["FIELD", "INTERN"] });
const DT = await taiKhoan(`Đối Tác Xe Đơn ${duoi}`, { quyen: ["PARTNER"] });
const TT = await taiKhoan(`Thực Tập Xe Đơn ${duoi}`, { quyen: ["INTERN"] });
for (const [ten, ck] of [["Kế toán", ACC], ["Quản trị", ADMIN], ["Toàn quyền", SUP], ["lai Bán hàng + HDV", LAI_BAN_HDV.cookie]]) {
  r = await call(ck, "GET", `/api/van-chuyen/xe-cua-don/${A.id}`);
  assert.equal(r.status, 200, `${ten}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.chang[0].xe.length, 2, ten);
}
assert.equal((await call(FIELD, "GET", `/api/orders/${A.id}`)).status, 200, "đối chứng: HDV phụ trách xem được đơn A");
// Thực tập lập đơn của mình (đơn nháp) — route vẫn 403.
r = await call(TT.cookie, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 1 }, departDate: D, legs: [leg("10:00")] })], passengers: [P(9)] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const donTT = r.body.order.id;
for (const [ten, ck, orderId] of [
  ["HDV đang phụ trách", FIELD, A.id], ["Đối tác", DT.cookie, A.id], ["Thực tập (đơn người khác)", TT.cookie, A.id], ["Thực tập (đơn mình lập)", TT.cookie, donTT],
  ["Tài xế đang lái chuyến của đơn", TX1.cookie, A.id], ["lai HDV + Thực tập", LAI_HDV_TT.cookie, A.id],
]) {
  r = await call(ck, "GET", `/api/van-chuyen/xe-cua-don/${orderId}`);
  assert.equal(r.status, 403, `${ten}: ${r.status} ${JSON.stringify(r.body)}`);
  assert.ok(!JSON.stringify(r.body).includes(bien[0]), `${ten}: 403 không kèm biển số`);
}
assert.equal((await call(SALES, "GET", `/api/van-chuyen/xe-cua-don/${uuid()}`)).status, 404, "đơn lạ → 404");
console.log("✓ (3) Kế toán, Quản trị, Toàn quyền, lai Bán hàng + HDV → 200; HDV phụ trách, Đối tác, Thực tập (cả đơn mình lập), tài xế đang lái, lai HDV + Thực tập → 403; đơn lạ → 404");

// --- (4) Danh sách trắng + lịch sử đơn ---
r = await call(SALES, "GET", `/api/van-chuyen/xe-cua-don/${A.id}`);
assert.deepEqual(Object.keys(r.body), ["chang"]);
for (const c of r.body.chang) {
  assert.deepEqual(Object.keys(c).sort(), ["legId", "xe"]);
  for (const x of c.xe) assert.deepEqual(Object.keys(x).sort(), ["bienSo", "soKhach", "tenTaiXe", "trangThai"]);
}
for (const s of [TX1.phone, TX2.phone, "Khách Xe Trên Đơn", "Khách sạn Xe Trên Đơn", T1.id, T1.ma, T2.id, T2.ma]) assert.ok(!textA.includes(s), `không lộ: ${s}`);
assert.doesNotMatch(textA, /\b[LT]:[0-9a-f-]{8,}/, "không khoá so sánh nơi");
const nkChuyen = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action LIKE 'trip_%' AND target_id IN ('${T1.id}', '${T2.id}')`);
assert.ok(nkChuyen[0].n >= 4, "chống bài rỗng: có nhật ký chuyến");
const lichSu = (await call(SUP, "GET", `/api/orders/${A.id}`)).body.history;
assert.ok(lichSu.length > 0 && !lichSu.some((h) => String(h.action).startsWith("trip_")), JSON.stringify(lichSu.map((h) => h.action)));
console.log("✓ (4) thân đúng 4 khoá mỗi xe, không SĐT / tên khách / khoá nơi / mã chuyến; lịch sử đơn không có dòng trip_*");
