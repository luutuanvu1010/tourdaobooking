// Đầu-cuối luồng xe chạy sau khi có giao diện Đưa đón + Hành khách (kế hoạch docs/superpowers/plans/2026-10-01-giao-dien-dua-don-hanh-khach.md, tiêu chí 5;
// vì sao: docs/superpowers/specs/2026-10-01-danh-gia-luong-xe-chay.md — chuyến kẹt CHUA_CO_NOI_TRA / THIEU_TEN ở xuất bến khi không màn nào nhập nơi trả, tên).
// Trên API THẬT (wrangler dev, D1 local tạm), đúng THÂN mà form đơn mới gửi (web/order-form.ts → toServiceInput / passengersNhap: `legs` có nơi trả — một
// chặng điểm danh mục, một chặng địa chỉ gõ tự do — `passengers` đủ tên, KHÔNG có pickupTime / pickupPlace):
//   (1) lập nháp → GET đơn có chặng đúng nơi trả, GET /passengers đủ tên → xác nhận 200;
//   (2) xếp chuyến: KHÔNG cảnh báo sớm (canhBaoXep rỗng), lý do giữ không có CHUA_CO_NOI_TRA / THIEU_TEN;
//   (3) "Cập nhật điểm theo đơn" 200 → xuất bến (văn phòng bấm thay) 200, RUNNING — không bị giữ CHUA_CO_NOI_TRA / THIEU_TEN;
//   (4) đối chứng (P16): đơn KHÔNG nơi trả, thiếu tên → xác nhận VẪN 200 (cảnh báo chỉ ở giao diện), xếp được kèm canhBaoXep, xuất bến 409 giữ đúng hai mã.
// Dữ liệu dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()); chuyến chạy NGÀY KIA (xếp không vướng mốc 6 giờ). Tên khách GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const D = vnDate(2);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const P = (n) => ({ fullName: `Khách Đầu Cuối E2E ${n}`, birthYear: 1990, paxCode: n === 1 ? "adult" : null });
let r;

// --- Nền: tài xế công ty + GPLX D1, xe 15 chỗ đủ Kiểm định + Bảo hiểm (khuôn tests/e2e/dieu-phoi.mjs) ---
r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế Đầu Cuối E2E", phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${r.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: `79${String(Date.now()).slice(-10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const taoXe = async (hau) => {
  const id = uuid();
  const AT = new Date().toISOString();
  await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES ('${id}', '79F-${hau}.${duoi.slice(3)}', '79F${hau}${duoi}', 'E2EDC${hau}${duoi}', 'E2EDC${hau}${duoi}', 'Xe đầu cuối E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${id}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
  }
  return id;
};
const xeA = await taoXe("11");
const xeB = await taoXe("22");

// --- (1) Lập nháp đúng thân form mới → xác nhận ---
const svc = catalogService({ pax: { adult: 2 }, departDate: D, legs: [
  { direction: "OUT", pickupDate: D, pickupTime: "10:00", pickupLocationId: null, pickupPlace: `Nhà riêng E2E ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "", flightCode: "" },
  { direction: "RETURN", pickupDate: D, pickupTime: "15:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: `Nhà riêng E2E ${duoi}`, flightCode: "", paxOverride: null },
] });
delete svc.pickupTime;
delete svc.pickupPlace;
r = await call(SALES, "POST", "/api/orders", orderInput({ services: [svc], passengers: [P(1), P(2)] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const don = r.body.order;
const legs = don.services[0].legs;
assert.deepEqual(legs.map((l) => [l.direction, l.dropoffLabel !== null]).sort(), [["OUT", true], ["RETURN", true]], "hai chặng đều có nơi trả");
assert.equal((await call(SALES, "GET", `/api/orders/${don.id}/passengers`)).body.soNguoiCoTen, 2);
r = await call(SALES, "POST", `/api/orders/${don.id}/status`, { status: "confirmed" });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ (1) lập nháp bằng thân form mới (legs có nơi trả: điểm + gõ tự do; passengers 2/2; không pickupTime/pickupPlace) → xác nhận 200");

// --- (2) Xếp chặng chiều đi: không cảnh báo, không giữ CHUA_CO_NOI_TRA / THIEU_TEN ---
const di = legs.find((l) => l.direction === "OUT");
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xeA, taiXePartyId: txParty, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tripId = r.body.chuyen.id;
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { version: r.body.chuyen.version, requestId: uuid(), chang: [{ legId: di.id, soSuat: 2 }] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.canhBaoXep ?? [], [], "không cảnh báo sớm khi đã đủ nơi trả, đủ tên");
const giu = (c) => c.lyDoGiu.map((l) => l.ma);
assert.ok(!giu(r.body.chuyen).some((m) => m === "CHUA_CO_NOI_TRA" || m === "THIEU_TEN"), JSON.stringify(r.body.chuyen.lyDoGiu));
console.log("✓ (2) xếp chặng chiều đi: canhBaoXep rỗng; lý do giữ không có CHUA_CO_NOI_TRA / THIEU_TEN");

// --- (3) Cập nhật điểm theo đơn → xuất bến ---
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${tripId}`);
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/cap-nhat-diem`, { version: r.body.chuyen.version, requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "RUNNING");
console.log("✓ (3) cập nhật điểm theo đơn 200 → xuất bến 200 (RUNNING) — không bị giữ CHUA_CO_NOI_TRA / THIEU_TEN");

// --- (4) Đối chứng: thiếu nơi trả + thiếu tên → xác nhận vẫn được; xếp kèm cảnh báo; xuất bến bị giữ đúng hai mã ---
const svc2 = catalogService({ pax: { adult: 2 }, departDate: D, legs: [{ direction: "OUT", pickupDate: D, pickupTime: "13:00", pickupLocationId: null, pickupPlace: `Khách sạn E2E ${duoi}`, dropoffLocationId: null, dropoffPlace: "" }] });
delete svc2.pickupTime;
delete svc2.pickupPlace;
r = await call(SALES, "POST", "/api/orders", orderInput({ services: [svc2], passengers: [P(3)] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const don2 = r.body.order;
assert.equal((await call(SALES, "POST", `/api/orders/${don2.id}/status`, { status: "confirmed" })).status, 200, "chỉ cảnh báo, không chặn xác nhận");
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xeB, taiXePartyId: txParty, batDau: { ngay: D, gio: "12:30" }, ketThuc: { ngay: D, gio: "14:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const trip2 = r.body.chuyen.id;
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${trip2}/phan-bo`, { version: r.body.chuyen.version, requestId: uuid(), chang: [{ legId: don2.services[0].legs[0].id, soSuat: 2 }] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual((r.body.canhBaoXep ?? []).map((x) => x.ma).sort(), ["CHUA_CO_NOI_TRA", "THIEU_TEN"], JSON.stringify(r.body.canhBaoXep));
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${trip2}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 409, JSON.stringify(r.body));
const ma2 = r.body.error.lyDo.map((l) => l.ma);
assert.ok(ma2.includes("CHUA_CO_NOI_TRA") && ma2.includes("THIEU_TEN"), JSON.stringify(ma2));
console.log("✓ (4) đối chứng: thiếu nơi trả + thiếu tên → xác nhận 200, xếp 200 kèm canhBaoXep [CHUA_CO_NOI_TRA, THIEU_TEN], xuất bến 409 giữ đúng hai mã");
