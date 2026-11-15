// CHO CHẠY DÙ THIẾU GIẤY TỜ (ADR-0184 việc 3) trên API THẬT (wrangler dev, D1 local tạm). Xe công ty 15 chỗ chỉ có Kiểm định, THIẾU Bảo hiểm trách nhiệm dân sự;
// chuyến NGÀY MAI (cửa sổ xuất bến 48 giờ), một đơn đã xác nhận, tài khoản tài xế thật:
//   (1) chưa ai cho phép → chi tiết chuyến giữ DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN (Quản trị, Toàn quyền xử lý); tài xế bấm xuất bến → 409;
//   (2) Quản trị cho chạy Bảo hiểm (kèm lý do) → 403 «chỉ Toàn quyền», không dòng nào ghi; Bán hàng, Kế toán → 403;
//   (3) Toàn quyền cho chạy, không lý do → 200 / 201; dòng cho phép + một sự kiện + một nhật ký (không số giấy tờ, không ghi chú); chi tiết hết giữ;
//   (4) gửi lại cùng requestId → 200, không ghi thêm; cho lại cùng loại → 409;
//   (5) tài xế xuất bến → 200; bản chụp ĐẠT, dòng con DIEU_KIEN trỏ dòng cho phép; nhật ký xuất bến nêu «cho chạy dù thiếu Bảo hiểm trách nhiệm dân sự».
// Dọn: tài xế kết thúc gián đoạn. Dữ liệu dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()). Tên, số GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate, moCuaSoXuatBen48Gio } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);
const KE_TOAN = await session(ACCOUNTS.accountant);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const D = vnDate(1);
await moCuaSoXuatBen48Gio();
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
let r;

// Tài xế công ty (tài khoản thật, đăng nhập PIN) + GPLX D1.
const tk = await call(SUPER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Cho Chạy E2E ${duoi}`, phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(tk.status, 201, JSON.stringify(tk.body));
const lg = await login(tk.body.staff.phone, tk.body.pin);
assert.equal(lg.status, 200, JSON.stringify(lg.body));
const TX = lg.cookie;
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${tk.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: `76${String(Date.now()).slice(-9)}${Math.floor(Math.random() * 10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
// Xe công ty 15 chỗ: CHỈ có Kiểm định (thiếu Bảo hiểm).
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const xeId = uuid();
const bien = `79T-${duoi.slice(0, 3)}.${duoi.slice(3)}`;
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xeId}', '${bien}', '79T${duoi}', 'E2ECCT${duoi}', 'E2ECCT${duoi}', 'Xe thiếu bảo hiểm E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${xeId}', 'INSPECTION', '${vnDate(400)}', '${AT}', '${AT}')`);
const o = await call(SALES, "POST", "/api/orders", orderInput({
  customerName: "Liên Hệ Cho Chạy E2E", customerPhone: "0913579248",
  services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [{ direction: "OUT", pickupDate: D, pickupTime: "10:00", pickupLocationId: null, pickupPlace: `Khách sạn Cho Chạy ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "" }] })],
  passengers: [{ fullName: "Khách Cho Chạy A1", birthYear: 1960, paxCode: null }, { fullName: "Khách Cho Chạy A2", birthYear: 1961, paxCode: null }],
}));
assert.equal(o.status, 201, JSON.stringify(o.body));
assert.equal((await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" })).status, 200);
const legId = o.body.order.services[0].legs[0].id;
let c = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: txParty, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
assert.equal(c.status, 201, JSON.stringify(c.body));
const id = c.body.chuyen.id;
const ma = c.body.chuyen.ma;
c = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { version: c.body.chuyen.version, requestId: uuid(), chang: [{ legId, soSuat: 2 }] });
assert.equal(c.status, 200, JSON.stringify(c.body));
const chiTiet = async () => (await call(SALES, "GET", `/api/van-chuyen/chuyen/${id}`)).body.chuyen;
const choChay = (cookie, body) => call(cookie, "POST", `/api/van-chuyen/chuyen/${id}/cho-chay-thieu-giay`, body);
const dem = async (q) => (await sqlRows(q))[0].n;
const soDong = () => dem(`SELECT count(*) AS n FROM vc_trip_departure_waiver WHERE trip_id = '${id}'`);

// --- (1) Chưa ai cho phép: giữ mã Toàn quyền; tài xế xuất bến 409 ---
let ct = await chiTiet();
assert.ok(ct.lyDoGiu.some((l) => l.ma === "DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN" && l.aiXuLy === "QUAN_TRI_TOAN_QUYEN" && l.aiXuLyNhan === "Quản trị, Toàn quyền"), JSON.stringify(ct.lyDoGiu));
r = await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.ok(r.body.error.lyDo.some((l) => l.ma === "DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"), JSON.stringify(r.body.error.lyDo));
console.log(`✓ (1) ${ma}: xe thiếu Bảo hiểm, chưa cho phép → giữ DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN; tài xế xuất bến 409`);

// --- (2) Quản trị / Bán hàng / Kế toán: không cho chạy Bảo hiểm được ---
r = await choChay(ADMIN, { version: ct.version, requestId: uuid(), loaiGiayTo: ["TPL_INSURANCE"], lyDo: "THIEU_GIAY_GIA_HAN", ghiChu: null });
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(r.body.error.message, "Thiếu Kiểm định hoặc Bảo hiểm chỉ Toàn quyền cho chạy được.");
for (const [ten, cookie] of [["Bán hàng", SALES], ["Kế toán", KE_TOAN]]) {
  r = await choChay(cookie, { version: ct.version, requestId: uuid(), loaiGiayTo: ["TPL_INSURANCE"], lyDo: "THIEU_GIAY_GIA_HAN", ghiChu: null });
  assert.equal(r.status, 403, `${ten}: ${JSON.stringify(r.body)}`);
}
assert.equal(await soDong(), 0, "403 không ghi dòng cho phép");
assert.equal(await dem(`SELECT count(*) AS n FROM audit_log WHERE action = 'trip_departure_waived' AND target_id = '${id}'`), 0);
console.log("✓ (2) Quản trị cho chạy Bảo hiểm → 403 «chỉ Toàn quyền»; Bán hàng, Kế toán 403; không ghi gì");

// --- (3) Toàn quyền cho chạy, không lý do ---
const rid = uuid();
const than = { version: ct.version, requestId: rid, loaiGiayTo: ["TPL_INSURANCE"], lyDo: null, ghiChu: "   " };
r = await choChay(SUPER, than);
assert.ok(r.status === 200 || r.status === 201, JSON.stringify(r.body));
assert.ok(!r.body.chuyen.lyDoGiu.some((l) => l.ma === "DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"), "phản hồi: hết giữ");
const [dong] = await sqlRows(`SELECT id, vehicle_id, document_type_code, reason_code, note FROM vc_trip_departure_waiver WHERE trip_id = '${id}'`);
assert.deepEqual([dong.vehicle_id, dong.document_type_code, dong.reason_code, dong.note], [xeId, "TPL_INSURANCE", null, null]);
assert.equal(await dem(`SELECT count(*) AS n FROM vc_trip_event WHERE trip_id = '${id}' AND kind = 'DOCS_WAIVED'`), 1);
const nk = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'trip_departure_waived' AND target_id = '${id}'`);
assert.equal(nk.length, 1);
assert.match(nk[0].detail, /cho chạy dù thiếu giấy tờ · xe 79T-.* · Bảo hiểm trách nhiệm dân sự \(TPL_INSURANCE, hạn chưa có\) · lý do không nêu lý do$/);
assert.doesNotMatch(JSON.stringify(r.body), /0913579248|Khách Cho Chạy/, "phản hồi lệnh ghi không kèm tên / SĐT");
ct = await chiTiet();
assert.ok(!ct.lyDoGiu.some((l) => l.ma.startsWith("DIEU_KIEN_GIAY_TO_XE")), JSON.stringify(ct.lyDoGiu));
console.log("✓ (3) Toàn quyền cho chạy không lý do → có dòng cho phép, một sự kiện, một nhật ký sạch; chi tiết hết giữ");

// --- (4) Lệnh lặp và cho lại ---
r = await choChay(SUPER, than);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(await soDong(), 1, "gửi lại cùng requestId không ghi thêm");
r = await choChay(SUPER, { version: ct.version, requestId: uuid(), loaiGiayTo: ["TPL_INSURANCE"], lyDo: null, ghiChu: null });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.message, "Chuyến này đã được cho chạy dù thiếu Bảo hiểm trách nhiệm dân sự.");
console.log("✓ (4) gửi lại cùng requestId → 200 không ghi thêm; cho lại cùng loại → 409");

// --- (5) Tài xế xuất bến đạt ---
r = await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
const [chup] = await sqlRows(`SELECT id, ket_qua FROM vc_trip_departure_check WHERE trip_id = '${id}'`);
assert.equal(chup.ket_qua, "DAT");
const dk = await sqlRows(`SELECT document_type_code AS d, waiver_id AS w FROM vc_trip_departure_check_item WHERE check_id = '${chup.id}' AND item_kind = 'DIEU_KIEN'`);
assert.deepEqual(dk.map((x) => [x.d, x.w]), [["TPL_INSURANCE", dong.id]]);
const [nkXb] = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'trip_departed' AND target_id = '${id}'`);
assert.match(nkXb.detail, /cho chạy dù thiếu Bảo hiểm trách nhiệm dân sự/);
assert.doesNotMatch(nkXb.detail, /TPL_INSURANCE/, "nhật ký nêu tên loại, không mã");
console.log("✓ (5) tài xế xuất bến 200; bản chụp ĐẠT, dòng con trỏ dòng cho phép; nhật ký nêu loại giấy được cho chạy");

// --- Dọn: kết thúc gián đoạn ---
r = await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/ket-thuc-gian-doan`, { requestId: uuid(), lyDo: "GIAN_DOAN_KHAC" });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ cho-chay-thieu-giay: xong");
