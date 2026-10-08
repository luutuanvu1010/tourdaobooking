// Máy ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2; kế hoạch T2.17) trên API THẬT (wrangler dev, D1 local tạm) — lệnh đơn và khúc chuyến chạy CÙNG một lô D1:
//   (1) Bán hàng đổi khách của đơn A (huỷ một người đã gắn tên + thêm người mới, MỘT lệnh) → suất cũ đóng PASSENGER_CHANGED, suất mới mang khoá người mới,
//       chuyến KHÔNG giữ KHACH_DA_DOI; nhật ký `trip_order_synced` + sự kiện ALLOCATION_ORDER_SYNCED cùng id, mang người sửa đơn; câu không tên;
//   (2) HDV tăng số khách đơn B 2 → 3 (handler-money-edit, Q-2 = a) → mở thêm đúng 1 suất; phản hồi HDV chỉ `{ ok, dongBoChuyen }` (không dữ liệu chuyến);
//   (3) Bán hàng huỷ đơn A → mọi suất của A đóng REMOVED trong cùng lô, chuyến không giữ DON_DA_HUY;
//   (4) HDV huỷ đơn B (handler-cancel) → như văn phòng: suất của B đóng REMOVED, nhật ký mang HDV; phản hồi HDV chỉ `{ ok, dongBoChuyen }`;
//   (5) xe ĐANG CHẠY (tài xế xuất bến chuyến thứ hai) + Bán hàng huỷ đơn E → máy KHÔNG ghi gì lên chuyến đang chạy, phản hồi mang ĐÚNG câu nhắc
//       "Báo huỷ"; chi tiết chuyến `coKhachDonHuy`; dọn: tài xế kết thúc gián đoạn.
// Kiểm định kỳ (audit-invariants, gồm R-VC-6 phủ trip_order_synced) chạy cuối bộ e2e khi chạy ĐỦ bộ (chạy lẻ thì không). Dữ liệu dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()),
// chuyến NGÀY MAI. Tên khách GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, moCuaSoXuatBen48Gio, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);
const FIELD = await session(ACCOUNTS.field);
const [{ id: salesId }] = await sqlRows(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}'`);
const [{ id: fieldId }] = await sqlRows(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.field.phone}'`);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const D = vnDate(1); // ADR-0096 Đ2 (LC-20): chuyến NGÀY MAI + cửa sổ 48 giờ — bước (5) xuất bến ngay được, giờ đón vẫn ngoài mốc 6 giờ
await moCuaSoXuatBen48Gio();
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const P = (n) => ({ fullName: `Khách Đồng Bộ E2E ${n}`, birthYear: 1934, paxCode: null });
const leg = (noi) => ({ direction: "OUT", pickupDate: D, pickupTime: "10:00", pickupLocationId: null, pickupPlace: noi, dropoffLocationId: LOC, dropoffPlace: "" });
let r;

// --- Nền: tài xế công ty (GPLX D1), xe 15 chỗ có Kiểm định + Bảo hiểm ---
r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế Đồng Bộ E2E", phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const txDangNhap = await login(r.body.staff.phone, r.body.pin);
assert.equal(txDangNhap.status, 200, JSON.stringify(txDangNhap.body));
const TX = txDangNhap.cookie;
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${r.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: `79${String(Date.now()).slice(-10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const xeId = uuid();
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const AT = new Date().toISOString();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xeId}', '79G-${duoi.slice(0, 3)}.${duoi.slice(3)}', '79G${duoi}', 'E2EDB${duoi}', 'E2EDB${duoi}', 'Xe đồng bộ E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
  await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${xeId}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
}

// --- Hai đơn đã xác nhận (A: Bán hàng phụ trách; B: HDV phụ trách), mỗi đơn 2 khách có tên, xếp hết lên MỘT chuyến ---
const donXacNhan = async (ten, extra = {}) => {
  const x = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [leg(`Khách sạn Đồng Bộ E2E ${duoi}`)] })], passengers: ten, ...extra }));
  assert.equal(x.status, 201, JSON.stringify(x.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${x.body.order.id}/status`, { status: "confirmed" })).status, 200);
  return x.body.order;
};
const a = await donXacNhan([P(1), P(2)]);
const b = await donXacNhan([P(3), P(4)], { handlerStaffId: fieldId });
const legA = a.services[0].legs[0].id;
const legB = b.services[0].legs[0].id;
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: txParty, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tripId = r.body.chuyen.id;
const ma = r.body.chuyen.ma;
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { version: r.body.chuyen.version, requestId: uuid(), chang: [{ legId: legA, soSuat: 2 }, { legId: legB, soSuat: 2 }] });
assert.equal(r.status, 200, JSON.stringify(r.body));
const moCua = async (legId) => sqlRows(`SELECT id, passenger_key AS k FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND leg_id = '${legId}' AND valid_to_at IS NULL`);
const nhatKyMay = async () => sqlRows(`SELECT id, staff_id, detail FROM audit_log WHERE action = 'trip_order_synced' AND target_id = '${tripId}' ORDER BY rowid`);
const lyDoGiu = async () => (await call(SALES, "GET", `/api/van-chuyen/chuyen/${tripId}`)).body.chuyen.lyDoGiu.map((l) => l.ma);
assert.equal((await moCua(legA)).length, 2);

// --- (1) Bán hàng đổi khách của A trong MỘT lệnh ---
let ds = (await call(SALES, "GET", `/api/orders/${a.id}/passengers`)).body;
const boKhoa = ds.passengers.find((x) => x.fullName === P(1).fullName).personKey;
r = await call(SALES, "POST", `/api/orders/${a.id}/passengers`, { expectedUpdatedAt: ds.orderUpdatedAt, them: [P(5)], sua: [], huy: [boKhoa] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.dongBoChuyen, { nhac: null, capNhatTay: false });
ds = (await call(SALES, "GET", `/api/orders/${a.id}/passengers`)).body;
const khoaMoi = ds.passengers.find((x) => x.fullName === P(5).fullName).personKey;
const moA = await moCua(legA);
assert.ok(moA.some((x) => x.k === khoaMoi) && !moA.some((x) => x.k === boKhoa), "suất mở mang khoá người mới, không còn khoá đã bỏ");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND close_reason = 'PASSENGER_CHANGED'`))[0].n, 1);
assert.ok(!(await lyDoGiu()).includes("KHACH_DA_DOI"), "máy đã đồng bộ — không giữ KHACH_DA_DOI");
let nk = await nhatKyMay();
assert.equal(nk.length, 1);
assert.equal(nk[0].staff_id, salesId, "nhật ký mang người sửa đơn");
assert.equal(nk[0].detail, `${ma}: máy cập nhật theo đơn — ${a.orderCode} (đổi người): trả 1 ghế, thêm 1 ghế`);
const [ev1] = await sqlRows(`SELECT kind, created_by, count FROM vc_trip_event WHERE id = '${nk[0].id}'`);
assert.deepEqual({ ...ev1 }, { kind: "ALLOCATION_ORDER_SYNCED", created_by: salesId, count: 2 }, "sự kiện cùng id với nhật ký (R-VC-6)");
console.log(`✓ (1) ${ma}: đổi khách đơn A (một lệnh) → 1 suất PASSENGER_CHANGED + suất mới mang khoá mới cùng lô; không giữ KHACH_DA_DOI; nhật ký + sự kiện cùng id, người sửa đơn`);

// --- (2) HDV tăng số khách đơn B 2 → 3 ---
const svcB = (await sqlRows(`SELECT id FROM order_service WHERE order_id = '${b.id}'`))[0].id;
r = await call(FIELD, "POST", `/api/orders/${b.id}/handler-money-edit`, { reason: "Khách báo thêm 1 người", services: [{ id: svcB, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { ok: true, dongBoChuyen: { nhac: null, capNhatTay: false } }, "HDV: không dữ liệu chuyến, không giá");
assert.equal((await moCua(legB)).length, 3, "mở thêm đúng 1 suất");
nk = await nhatKyMay();
assert.equal(nk.length, 2);
assert.equal(nk[1].staff_id, fieldId);
assert.equal(nk[1].detail, `${ma}: máy cập nhật theo đơn — ${b.orderCode} (thêm khách): thêm 1 ghế`);
console.log("✓ (2) HDV tăng số khách đơn B 2 → 3 → máy mở thêm 1 suất; phản hồi HDV chỉ { ok, dongBoChuyen }");

// --- (3) Bán hàng huỷ đơn A ---
r = await call(SALES, "POST", `/api/orders/${a.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.dongBoChuyen, { nhac: null, capNhatTay: false });
assert.equal((await moCua(legA)).length, 0, "mọi suất của A đóng cùng lô");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND leg_id = '${legA}' AND close_reason = 'REMOVED'`))[0].n, 2);
assert.ok(!(await lyDoGiu()).includes("DON_DA_HUY"), "không giữ DON_DA_HUY");
nk = await nhatKyMay();
assert.equal(nk.length, 3);
assert.equal(nk[2].detail, `${ma}: máy cập nhật theo đơn — ${a.orderCode} (đơn huỷ): trả 2 ghế`);
for (const x of nk) assert.doesNotMatch(x.detail, /Khách Đồng Bộ E2E|1934|09\d{8}/, "nhật ký không tên, không năm sinh, không SĐT");
console.log("✓ (3) huỷ đơn A → 2 suất đóng REMOVED cùng lô; không giữ DON_DA_HUY; ba dòng nhật ký máy không tên");

// --- (4) HDV huỷ đơn B (handler-cancel) ---
r = await call(FIELD, "POST", `/api/orders/${b.id}/handler-cancel`, { reason: "customer_requested" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { ok: true, dongBoChuyen: { nhac: null, capNhatTay: false } }, "HDV: không dữ liệu chuyến");
assert.equal((await moCua(legB)).length, 0, "mọi suất của B đóng cùng lô");
nk = await nhatKyMay();
assert.equal(nk.length, 4);
assert.equal(nk[3].staff_id, fieldId, "nhật ký mang HDV");
assert.equal(nk[3].detail, `${ma}: máy cập nhật theo đơn — ${b.orderCode} (đơn huỷ): trả 3 ghế`);
assert.ok(!(await lyDoGiu()).includes("DON_DA_HUY"), "không giữ DON_DA_HUY");
console.log("✓ (4) HDV huỷ đơn B → 3 suất đóng REMOVED cùng lô, nhật ký mang HDV; phản hồi HDV chỉ { ok, dongBoChuyen }");

// --- (5) Xe ĐANG CHẠY: chuyến thứ hai (cùng xe, cùng tài xế, sau chuyến một), tài xế xuất bến sớm, Bán hàng huỷ đơn E ---
const legE0 = { ...leg(`Khách sạn Đồng Bộ E2E E ${duoi}`), pickupTime: "13:30" };
const e = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [legE0] })], passengers: [P(6), P(7)] }));
assert.equal(e.status, 201, JSON.stringify(e.body));
assert.equal((await call(SALES, "POST", `/api/orders/${e.body.order.id}/status`, { status: "confirmed" })).status, 200);
const legE = e.body.order.services[0].legs[0].id;
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: txParty, batDau: { ngay: D, gio: "13:00" }, ketThuc: { ngay: D, gio: "15:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const trip2 = r.body.chuyen.id;
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${trip2}/phan-bo`, { version: r.body.chuyen.version, requestId: uuid(), chang: [{ legId: legE, soSuat: 2 }] });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${trip2}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "RUNNING");
const [{ version: vTruoc }] = await sqlRows(`SELECT version FROM vc_trip WHERE id = '${trip2}'`);
r = await call(SALES, "POST", `/api/orders/${e.body.order.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.dongBoChuyen, { nhac: "Đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ", capNhatTay: false });
const moE = await sqlRows(`SELECT status, office_cancel_at FROM vc_trip_allocation WHERE trip_id = '${trip2}' AND leg_id = '${legE}' AND valid_to_at IS NULL`);
assert.deepEqual(moE.map((x) => [x.status, x.office_cancel_at]), [["WAITING", null], ["WAITING", null]], "máy không đóng suất, không đặt cờ báo huỷ trên xe đang chạy");
assert.equal((await sqlRows(`SELECT version FROM vc_trip WHERE id = '${trip2}'`))[0].version, vTruoc, "không câu nào ghi lên chuyến đang chạy");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'trip_order_synced' AND target_id = '${trip2}'`))[0].n, 0);
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${trip2}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.coKhachDonHuy, true, "màn Xe đang chạy có dòng nhắc Báo huỷ");
r = await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${trip2}/ket-thuc-gian-doan`, { requestId: uuid(), lyDo: "GIAN_DOAN_KHAC" });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ (5) xe đang chạy: huỷ đơn E → 200 + câu nhắc Báo huỷ; suất, cờ báo huỷ, phiên bản chuyến không đổi; chi tiết chuyến coKhachDonHuy; dọn bằng kết thúc gián đoạn");
