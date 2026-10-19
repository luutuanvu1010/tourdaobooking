// KHUNG THỬ dùng chung cho các bài lệnh TIẾN ĐỘ chuyến xe (ADR-0049 Task A15): cuoc-cua-toi, bam-thay, tai-xe-dto. Dựng MỘT lần, đúng luật, để mọi bài chạy
// trên dữ liệu có thể xuất bến thật (kế hoạch mục 4 điểm 19): tài khoản DRIVER có hồ sơ (party `pty-<id>`) mở vai Tài xế công ty + GPLX còn hạn; mọi xe có
// Kiểm định + Bảo hiểm hiện hành; đơn ĐÃ XÁC NHẬN, khách có tên; suất khách mở QUA ROUTE XẾP (không chèn thẳng bảng suất — một cửa, giữ rẻ cho ADR-0051).
// Giờ: bài bật `mock.timers` (Date) TRƯỚC khi dựng thế giới — NOW_GIA = 2027-03-11 06:00 giờ VN; `denGio(w, "HH:MM")` đổi đồng hồ giả sang giờ VN khác cùng ngày.
// LUẬT GIỜ XẤU NHẤT: bật theo GIỜ THẬT (`batDongHo(Date.now())`) thì `don()` / `taoChuyen()` tự ném lỗi khi giờ hẹn có thể lọt mốc 6 giờ ở một giờ nào đó trong ngày — gieo cho ngày thật + 2 (tests/audit/dong-ho-gio-xau.mjs).
// Tên khách, SĐT, số giấy tờ là GIẢ.
import { mock } from "node:test";
import assert from "node:assert/strict";
import { world, seedStaff } from "./harness.mjs";
import { MOC_MAC_DINH_PHUT, ghiNhanDongHo, kiemGioTheoDongHo, xoaDongHo } from "./dong-ho-gio-xau.mjs";

export const SALES = "11111111-1111-4111-8111-111111111111";
export const ADM = "33333333-3333-4333-8333-333333333333";
export const FIELD = "44444444-4444-4444-8444-444444444444";
export const ACC = "55555555-5555-4555-8555-555555555555";
export const DRIVER = "66666666-6666-4666-8666-666666666666";
export const DRIVER2 = "66666666-6666-4666-8666-666666666668";
export const DRIVER_PARTNER = "66666666-6666-4666-8666-666666666667";
export const SUP = "77777777-7777-4777-8777-777777777777";
export const PARTNER = "88888888-8888-4888-8888-888888888888";
export const INTERN = "99999999-9999-4999-8999-999999999999";
export const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
export const NGAY = "2027-03-11";
export const NGAY_SAU = "2027-03-12";
/** 2027-03-11 06:00 giờ VN. */
export const NOW_GIA = Date.parse(`${NGAY}T06:00:00+07:00`);
export const vnMs = (ngay, gio) => Date.parse(`${ngay}T${gio}:00+07:00`);
const AT = "2026-09-01T00:00:00.000Z";
export const uuid = () => crypto.randomUUID();
let so = 0;

/**
 * Bật đồng hồ giả (Date) ở NOW_GIA. Gọi TRƯỚC `setup()` (catalog_sync ghi "vừa đồng bộ" theo giờ lúc dựng). Trả hàm tắt.
 * LUẬT GIỜ XẤU NHẤT (tests/audit/dong-ho-gio-xau.mjs): bật theo GIỜ THẬT (`batDongHo(Date.now())`) thì `don()` / `taoChuyen()` từ chối gieo giờ hẹn mà ở một giờ nào đó
 * trong ngày sẽ lọt mốc tối thiểu (ngày mai trước 06:30, hôm nay…) — dùng ngày thật + 2. Đồng hồ cố định (không tham số) không bị ảnh hưởng.
 */
export function batDongHo(ms = NOW_GIA) {
  mock.timers.enable({ apis: ["Date"], now: ms });
  ghiNhanDongHo(ms);
  return () => {
    mock.timers.reset();
    xoaDongHo();
  };
}
/** Mốc tối thiểu (phút) đang hiệu lực của thế giới thử `w` — cùng câu chọn với `chinhSachHienHanh`; không đọc được thì mốc gieo 360. */
const mocPhutCua = (w) => w.q("SELECT min_lead_minutes m FROM vc_dispatch_policy WHERE valid_from_at <= ? ORDER BY valid_from_at DESC LIMIT 1", new Date().toISOString())[0]?.m ?? MOC_MAC_DINH_PHUT;
/** Đưa đồng hồ giả tới giờ VN `gio` của ngày `ngay` (chỉ tiến). */
export function denGio(gio, ngay = NGAY) {
  const dich = vnMs(ngay, gio);
  const d = dich - Date.now();
  assert.ok(d >= 0, `đồng hồ giả chỉ tiến: ${gio}`);
  mock.timers.tick(d);
}

/** Hồ sơ `partyId` (đã có) thành tài xế công ty: vai DRIVER_INTERNAL + GPLX hạng `hang` (số GIẢ). */
export function thanhTaiXe(w, partyId, v = {}) {
  so++;
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-k-${so}', '${partyId}', 'DRIVER_INTERNAL', NULL, '2026-09-01', '${AT}', '${AT}')`);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, 'Nơi cấp Dò Tìm', ?, ?, ?, ?)`).run(`g-k-${so}`, partyId, `7911000000${String(so).padStart(2, "0")}`, `7911000000${String(so).padStart(2, "0")}`, v.hang ?? "D1", v.het ?? "2030-12-31", AT, AT);
  return partyId;
}
/** Xe của công ty chủ `cho` chỗ, có Kiểm định + Bảo hiểm còn hạn (VK1-C). */
export function xe(w, cho = 15) {
  const id = uuid();
  const chu = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id;
  const bien = `79C${String(++so).padStart(5, "0")}`;
  w.sqlite.prepare(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, ?, ?, 'active', '2026-09-01', ?, ?)`).run(id, bien, bien, `KHUNGK${so}`, `KHUNGK${so}`, cho, chu, AT, AT);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    w.sqlite.prepare(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, ?, '2030-12-31', ?, ?)`).run(uuid(), id, loai, AT, AT);
  }
  return id;
}

/** ADR-0057 (Đợt 4): hồ sơ TỔ CHỨC mở vai Nhà xe (CARRIER) đang hợp tác. Trả partyId. */
export function nhaXeKhung(w, ten = "Nhà xe Hùng Phát") {
  const id = uuid();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, legal_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, ten, AT, AT); // R-N1-2
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, 'CARRIER', NULL, '2026-09-01', ?, ?)").run(uuid(), id, AT, AT);
  return id;
}
/** Nhà xe thôi hợp tác (đóng vai CARRIER). */
export const thoiHopTac = (w, carrierId) => w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2027-03-10' WHERE party_id = ? AND role_type_code = 'CARRIER' AND valid_to_date IS NULL").run(carrierId);
/** Tài xế "thuộc" nhà xe (quan hệ DRIVES_FOR) có GPLX hạng D (không giới hạn khách). Trả partyId. */
export function taiXeNhaXe(w, carrierId) {
  const id = uuid();
  so++;
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, `Tài xế nhà xe ${so}`, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, `Tài xế nhà xe ${so}`, AT, AT);
  w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), id, carrierId, AT, AT);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, 'Nơi cấp Dò Tìm', 'D', '2030-12-31', ?, ?)`).run(`g-nx-${so}`, id, `7922000000${String(so).padStart(2, "0")}`, `7922000000${String(so).padStart(2, "0")}`, AT, AT);
  return id;
}
/** Xe `cho` chỗ của nhà xe `carrierId`, có Kiểm định + Bảo hiểm còn hạn. */
export function xeNhaXe(w, carrierId, cho = 16) {
  const id = uuid();
  const bien = `79N${String(++so).padStart(5, "0")}`;
  w.sqlite.prepare(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe nhà xe', 2020, ?, ?, 'active', '2026-09-01', ?, ?)`).run(id, bien, bien, `KHUNGN${so}`, `KHUNGN${so}`, cho, carrierId, AT, AT);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    w.sqlite.prepare(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, ?, '2030-12-31', ?, ?)`).run(uuid(), id, loai, AT, AT);
  }
  return id;
}

export function setup(tuyChon = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài Xế Một", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: DRIVER2, phone: "0900000016", name: "Tài Xế Hai", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: DRIVER_PARTNER, phone: "0900000026", name: "Tài Xế Đối Tác", perms: ["DRIVER_PARTNER"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực Tập", perms: ["INTERN"] });
  thanhTaiXe(w, `pty-${DRIVER}`);
  thanhTaiXe(w, `pty-${DRIVER2}`);
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 777000, 1, '2026-01-01', '2026-01-01')");
  return w;
}

/** Đơn ĐÃ XÁC NHẬN (Bán hàng) — `soNguoi` người lớn, một chặng chiều đi đón `gio` ngày `ngay` tại chữ tự do, trả ở bến (điểm danh mục); `ten` khách có tên
 * "Khách Dò Tìm <i>", năm sinh `namSinh` + i (mặc định 1990). */
export async function don(w, v) {
  kiemGioTheoDongHo({ nhan: "don() (giờ đón)", ngay: v.ngay ?? NGAY, gio: v.gio ?? "13:00", mocPhut: mocPhutCua(w) });
  const soNguoi = v.soNguoi ?? 2;
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678", customerNote: "Ghi chú đơn Dò Tìm", paymentNote: "Thanh toán Dò Tìm",
      ...(v.handler ? { handlerStaffId: v.handler } : {}),
      services: [{
        kind: "catalog", catalogCode: "ZA1", pax: { adult: soNguoi, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: v.ngay ?? NGAY,
        pickupChoice: "DON", // ADR-0134 Đ2: có lượt đón → chọn Đón (cửa xác nhận đòi)
        legs: [{ direction: "OUT", pickupDate: v.ngay ?? NGAY, pickupTime: v.gio ?? "13:00", pickupLocationId: null, pickupPlace: v.noiDon ?? "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }],
      }],
      passengers: Array.from({ length: v.ten ?? soNguoi }, (_x, i) => ({ fullName: `Khách Dò Tìm ${i + 1}`, birthYear: (v.namSinh ?? 1990) + i, paxCode: "adult" })),
    },
  });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return { id: o.id, code: o.orderCode, legId: o.services[0].legs[0].id };
}

/** Tạo chuyến (Bán hàng) cho xe + tài xế `taiXePartyId`, bắt đầu `bd`, kết thúc `kt` (giờ VN) ngày `ngay`. */
export async function taoChuyen(w, v) {
  kiemGioTheoDongHo({ nhan: "taoChuyen() (giờ bắt đầu)", ngay: v.ngay ?? NGAY, gio: v.bd ?? "12:30", mocPhut: mocPhutCua(w) });
  const r = await w.call("POST", "/api/van-chuyen/chuyen", {
    as: v.as ?? SALES,
    body: { requestId: uuid(), xeId: v.xe, taiXePartyId: v.taiXe, batDau: { ngay: v.ngay ?? NGAY, gio: v.bd ?? "12:30" }, ketThuc: { ngay: v.ngayKt ?? v.ngay ?? NGAY, gio: v.kt ?? "15:00" } },
  });
  assert.equal(r.status, 201, r.text);
  return r.json;
}
export const chiTiet = async (w, id, as = SALES) => (await w.call("GET", `/api/van-chuyen/chuyen/${id}`, { as })).json;
/** Xếp MỌI người của chặng lên chuyến (qua route — một cửa mở suất). */
export async function xepHet(w, chuyen, d, soNguoi, as = SALES) {
  const c = await chiTiet(w, chuyen.chuyen.id);
  const r = await w.call("POST", `/api/van-chuyen/chuyen/${chuyen.chuyen.id}/phan-bo`, { as, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId: d.legId, soSuat: soNguoi }] } });
  assert.equal(r.status, 200, r.text);
  return r.json;
}
/**
 * Một chuyến sẵn sàng xuất bến: xe `cho` chỗ, tài xế = tài khoản `taiXe` (mặc định DRIVER), một đơn `soNguoi` khách có tên đón 13:00 (nơi đón `noiDon`), xếp hết. Trả id chuyến,
 * đơn, điểm đón / trả, suất.
 */
export async function chuyenSan(w, v = {}) {
  const taiXe = v.taiXe ?? DRIVER;
  const soNguoi = v.soNguoi ?? 2;
  const d = await don(w, { soNguoi, ten: v.ten ?? soNguoi, gio: v.gio ?? "13:00", ngay: v.ngay, noiDon: v.noiDon });
  const c = await taoChuyen(w, { xe: v.xe ?? xe(w), taiXe: `pty-${taiXe}`, ngay: v.ngay, bd: v.bd, kt: v.kt, ngayKt: v.ngayKt });
  const sau = await xepHet(w, c, d, soNguoi);
  return {
    id: c.chuyen.id, ma: c.chuyen.ma, don: d,
    diemDon: sau.diem.find((x) => x.loai === "PICKUP").id, diemTra: sau.diem.find((x) => x.loai === "DROPOFF").id,
    suat: sau.suat.filter((s) => s.loai === "PASSENGER").map((s) => s.id),
  };
}
/** Gọi một lệnh tiến độ: `ben` = "tai-xe" (route cuoc-cua-toi, mặc định tài khoản DRIVER) hoặc "van-phong" (route chuyen, mặc định Bán hàng). */
export function tienDo(w, ben, tripId, duoi, body = {}, as) {
  const goc = ben === "tai-xe" ? "cuoc-cua-toi" : "chuyen";
  return w.call("POST", `/api/van-chuyen/${goc}/${tripId}/${duoi}`, { as: as ?? (ben === "tai-xe" ? DRIVER : SALES), body: { requestId: uuid(), ...body } });
}
