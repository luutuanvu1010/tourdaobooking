// XE ĐANG CHẠY (ADR-0052 D5.1, D5.2, D5.3a — Vận chuyển Đợt 5) trên API THẬT (wrangler dev, D1 local tạm): chuyến NGÀY MAI, tài xế công ty bấm Xuất bến sớm
// (xe đang chạy); văn phòng thêm đơn thứ hai vào xe (Bán hàng không phá lệ → 409 "cần Quản trị phá lệ"; Quản trị phá lệ → 200, điểm mới mang cờ, bản chốt
// thêm dòng sau xuất bến); Bán hàng báo huỷ một khách (suất vẫn chiếm chỗ; lần hai 409; Kế toán 403); cập nhật điểm khi xe chạy không có gì lệch → 200 / 0;
// dọn: tài xế kết thúc gián đoạn. Dữ liệu dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()). Tên, số GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate, moCuaSoXuatBen48Gio } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);
const KE_TOAN = await session(ACCOUNTS.accountant);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const D = vnDate(1); // ADR-0096 Đ2 (LC-20): chuyến NGÀY MAI + cửa sổ 48 giờ — xuất bến ngay được, giờ đón vẫn ngoài mốc 6 giờ
await moCuaSoXuatBen48Gio();
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
let r;

// Tài xế công ty (tài khoản thật, đăng nhập PIN) + GPLX D1.
const tk = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Xe Chạy E2E ${duoi}`, phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(tk.status, 201, JSON.stringify(tk.body));
const lg = await login(tk.body.staff.phone, tk.body.pin);
assert.equal(lg.status, 200, JSON.stringify(lg.body));
const TX = lg.cookie;
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${tk.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: `77${String(Date.now()).slice(-9)}${Math.floor(Math.random() * 10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
// Xe công ty 15 chỗ, đủ Kiểm định + Bảo hiểm.
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const xeId = uuid();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xeId}', '79H-${duoi.slice(0, 3)}.${duoi.slice(3)}', '79H${duoi}', 'E2EXECHAY${duoi}', 'E2EXECHAY${duoi}', 'Xe chạy E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
  await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${xeId}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
}
const donMoi = async (gio, noi, ten) => {
  const o = await call(SALES, "POST", "/api/orders", orderInput({
    customerName: "Liên Hệ Xe Chạy E2E", customerPhone: "0913579248",
    services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [{ direction: "OUT", pickupDate: D, pickupTime: gio, pickupLocationId: null, pickupPlace: `${noi} ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "" }] })],
    passengers: ten.map((t, i) => ({ fullName: t, birthYear: 1960 + i, paxCode: null })),
  }));
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" })).status, 200);
  return { id: o.body.order.id, code: o.body.order.orderCode, legId: o.body.order.services[0].legs[0].id };
};
const dA = await donMoi("10:00", "Khách sạn Xe Chạy A", ["Khách Xe Chạy A1", "Khách Xe Chạy A2"]);
const dB = await donMoi("10:30", "Khách sạn Xe Chạy B", ["Khách Xe Chạy B1"]);
let c = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: txParty, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
assert.equal(c.status, 201, JSON.stringify(c.body));
const id = c.body.chuyen.id;
c = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { version: c.body.chuyen.version, requestId: uuid(), chang: [{ legId: dA.legId, soSuat: 2 }] });
assert.equal(c.status, 200, JSON.stringify(c.body));
const version = async () => (await call(SALES, "GET", `/api/van-chuyen/chuyen/${id}`)).body.chuyen.version;

// --- 0. Chưa xuất bến: thêm điểm / báo huỷ → 409 chuyen_chua_chay ---
r = await call(ADMIN, "POST", `/api/van-chuyen/chuyen/${id}/them-diem`, { version: await version(), requestId: uuid(), chang: [{ legId: dB.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.deepEqual([r.status, r.body.error?.code], [409, "chuyen_chua_chay"], JSON.stringify(r.body));
r = await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "RUNNING");
console.log("✓ chưa xuất bến → thêm điểm 409 chuyen_chua_chay; tài xế xuất bến sớm → xe đang chạy");

// --- 1. D5.1 thêm điểm (ADR-0104 Đ1 — NỚI có tên N4: xe đang chạy luôn dưới mốc ⇒ "điều chỉnh khẩn cấp", Bán hàng làm được; Kế toán vẫn 403) ---
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/them-diem`, { version: await version(), requestId: uuid(), chang: [{ legId: dB.legId, soSuat: 2 }] });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual([r.body.error.code, r.body.error.canQuyen, r.body.error.lop], ["can_pha_le", true, "KHAN_CAP"]);
assert.match(r.body.error.message, /Khách không đặt gấp — cần điều chỉnh khẩn cấp/);
assert.equal((await call(KE_TOAN, "POST", `/api/van-chuyen/chuyen/${id}/them-diem`, { version: await version(), requestId: uuid(), chang: [{ legId: dB.legId, soSuat: 2 }] })).status, 403);
assert.equal((await call(KE_TOAN, "POST", `/api/van-chuyen/chuyen/${id}/them-diem`, { version: await version(), requestId: uuid(), chang: [{ legId: dB.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } })).status, 403);
const ridThem = uuid();
const thanThem = { version: await version(), requestId: ridThem, chang: [{ legId: dB.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } };
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/them-diem`, thanThem);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.tai, 4);
assert.deepEqual(r.body.diem.filter((d) => d.themKhiChay).map((d) => d.loai), ["PICKUP"]);
assert.doesNotMatch(JSON.stringify(r.body), /Khách Xe Chạy|0913579248/, "phản hồi lệnh ghi không kèm tên / SĐT");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/them-diem`, thanThem);
assert.equal(r.status, 200, "gửi lại cùng requestId → kết quả cũ");
const [ev] = await sqlRows(`SELECT count(*) AS n, max(override_rule_code) AS luat FROM vc_trip_event WHERE trip_id = '${id}' AND kind = 'STOP_ADDED_RUNNING'`);
assert.deepEqual([ev.n, ev.luat], [1, "MOC_TOI_THIEU"], "một sự kiện, có phá lệ mốc");
const [mf] = await sqlRows(`SELECT count(*) AS n FROM vc_trip_manifest WHERE trip_id = '${id}' AND check_id IS NULL AND added_after_departure = 1`);
assert.equal(mf.n, 1, "bản chốt thêm đúng một dòng (một khách có tên)");
console.log("✓ thêm điểm: Bán hàng 409 lớp điều chỉnh khẩn cấp (canQuyen đúng); Kế toán 403; Bán hàng điều chỉnh khẩn cấp 200, cờ điểm mới, bản chốt; lặp requestId → một sự kiện");

// --- 2. D5.2 báo huỷ ---
const suatB = r.body.suat.filter((s) => s.maDon === dB.code).map((s) => s.id);
assert.equal(suatB.length, 2);
assert.equal((await call(KE_TOAN, "POST", `/api/van-chuyen/chuyen/${id}/phan-bo/${suatB[0]}/bao-huy`, { version: await version(), requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" })).status, 403);
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/phan-bo/${suatB[0]}/bao-huy`, { version: await version(), requestId: uuid(), lyDo: "PHA_LE_SU_CO" });
assert.equal(r.status, 400, JSON.stringify(r.body));
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/phan-bo/${suatB[0]}/bao-huy`, { version: await version(), requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.tai, 4, "báo huỷ chưa trả chỗ");
assert.equal(r.body.suat.find((s) => s.id === suatB[0]).vanPhongBaoHuy.lyDoNhan, "Khách báo không đi");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/phan-bo/${suatB[0]}/bao-huy`, { version: await version(), requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" });
assert.deepEqual([r.status, r.body.error?.code], [409, "da_bao_huy"]);
r = await call(TX, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`);
assert.equal(r.status, 200);
assert.deepEqual(Object.keys(r.body.suat.find((s) => s.id === suatB[0]).vanPhongBaoHuy).sort(), ["luc", "lyDoNhan"], "DTO tài xế: giờ + lý do, không người bấm");
console.log("✓ báo huỷ: Kế toán 403; lý do ngoài nhóm 400; 200 vẫn chiếm chỗ; lần hai 409; tài xế thấy giờ + lý do, không người bấm");

// --- 3. D5.3a cập nhật điểm khi xe đang chạy: không gì lệch → 200 / 0, không ghi ---
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/cap-nhat-diem`, { version: await version(), requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual([r.body.daCapNhat, r.body.boQua], [0, 0]);
console.log("✓ cập nhật điểm khi xe chạy: không lệch → 200 / 0");

// --- 4. Cứu hộ đơn giản (D5c, A-1b — lời chủ 5.2b): GET …/cuu-ho chỉ đọc. Xe nhận: chuyến thứ hai cùng ngày, cùng tài xế công ty (14:00, sau giờ chuyến này). ---
const c2 = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: txParty, batDau: { ngay: D, gio: "14:00" }, ketThuc: { ngay: D, gio: "15:00" } });
assert.equal(c2.status, 201, JSON.stringify(c2.body));
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${id}/cuu-ho`);
assert.deepEqual([r.status, r.body.error?.code], [409, "chua_gian_doan"], JSON.stringify(r.body));
console.log("✓ cứu hộ: xe còn chạy → 409 chua_gian_doan");

// --- Dọn: kết thúc gián đoạn (đóng mọi suất). ---
r = await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/ket-thuc-gian-doan`, { requestId: uuid(), lyDo: "GIAN_DOAN_KHAC" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await call(KE_TOAN, "GET", `/api/van-chuyen/chuyen/${id}/cuu-ho`)).status, 403);
assert.equal((await call(TX, "GET", `/api/van-chuyen/chuyen/${id}/cuu-ho`)).status, 403);
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${id}/cuu-ho`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyenHong.id, id);
const changCH = Object.fromEntries(r.body.changChoXep.map((x) => [x.legId, x.soNguoi]));
assert.equal(changCH[dA.legId], 2, JSON.stringify(r.body.changChoXep));
assert.ok(changCH[dB.legId] >= 1, "chặng B (một suất đã báo huỷ, vẫn đóng gián đoạn) cần chuyển");
assert.equal(r.body.chuyenHong.soKhachCanChuyen, r.body.changChoXep.reduce((a, x) => a + x.soNguoi, 0));
assert.ok(r.body.xeNhan.some((x) => x.tripId === c2.body.chuyen.id && x.trangThai === "PLANNED" && x.choTrong === 15), JSON.stringify(r.body.xeNhan));
assert.ok(!r.body.xeNhan.some((x) => x.tripId === id), "chuyến hỏng không là xe nhận");
assert.doesNotMatch(JSON.stringify(r.body), /Khách Xe Chạy|0913579248|TD-\d{8}/, "DTO cứu hộ không tên, SĐT, mã đơn");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${c2.body.chuyen.id}/huy`, { version: c2.body.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" });
console.log(`✓ cứu hộ: Kế toán / tài xế 403; sau gián đoạn 200 — chặng cần chuyển, xe nhận cùng ngày (tài xế công ty), không tên / SĐT / mã đơn; dọn chuyến thứ hai: ${r.status}`);
const [nk] = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE target_id = '${id}' AND action IN ('trip_stop_added_running', 'trip_allocation_office_cancelled') AND (detail LIKE '%Khách Xe Chạy%' OR detail LIKE '%0913579248%')`);
assert.equal(nk.n, 0, "nhật ký không tên / SĐT");
console.log("✓ dọn: kết thúc gián đoạn; nhật ký thêm điểm / báo huỷ không tên, không SĐT");
