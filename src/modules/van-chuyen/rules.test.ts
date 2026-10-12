// Luật thuần của phân hệ Vận chuyển (ADR-0040 D1): biển số / số khung, kiểm thêm / sửa xe (Ruling R9: số khung bắt buộc ở máy chủ), cảnh báo giấy tờ của xe,
// ánh xạ lỗi CSDL của xe (Ruling R15 điểm 1, 3: mã lớp CSDL khác mã lớp route).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canhBaoXe, chiTietNhatKyXe, chuanHoaBienSo, chuanHoaSoKhung, kiemGiaHanXe, kiemSuaSaiXe, kiemSuaXe, kiemThemGiayToXe, kiemXeMoi, loiRangBuocChuyen, loiRangBuocXe, type DanhMucGiayToXe,
} from "./rules.ts";

const HOM_NAY = "2026-09-28";
const ok = <T,>(r: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.ok(r.ok, r.ok ? "" : r.message);
  return (r as { ok: true; value: T }).value;
};
const loi = (r: { ok: boolean; message?: string }): string => {
  assert.equal(r.ok, false, "phải bị từ chối");
  return (r as { message: string }).message;
};
const XE = { plateNumber: "79B-012.34", chassisNumber: "RL4GA3FV0M1027734", name: "Ford Transit", modelYear: 2019, passengerCapacity: 15 };

test("chuanHoaBienSo / chuanHoaSoKhung: chữ HOA, bỏ khoảng trắng . -", () => {
  assert.equal(chuanHoaBienSo("79b-012.34"), "79B01234");
  assert.equal(chuanHoaBienSo(" 79B 012 34 "), "79B01234");
  assert.equal(chuanHoaSoKhung("rl4-ga3 fv0m"), "RL4GA3FV0M");
});

test("kiemXeMoi: đủ trường → giá trị chuẩn; mặc định trạng thái Đang dùng, ngày bắt đầu hôm nay", () => {
  const v = ok(kiemXeMoi({ ...XE, name: "  Ford   Transit " }, HOM_NAY));
  assert.deepEqual(v, {
    plateNumber: "79B-012.34", plateKey: "79B01234", chassisNumber: "RL4GA3FV0M1027734", chassisKey: "RL4GA3FV0M1027734", name: "Ford Transit",
    modelYear: 2019, passengerCapacity: 15, status: "active", validFrom: HOM_NAY, ownerPartyId: null,
  });
  assert.equal(ok(kiemXeMoi({ ...XE, modelYear: null, status: "maintenance", validFrom: "2026-01-01" }, HOM_NAY)).status, "maintenance");
});

test("kiemXeMoi: biển số rỗng / ký tự lạ / dài quá; thiếu số khung (R9); số người 0 / 101 / 15.5 / '15'; đời xe 1949 / năm sau + 2; xe mới 'Ngừng dùng'; ngày bắt đầu sau hôm nay → từ chối", () => {
  for (const bien of ["", "  ", "79B#01234", "7".repeat(21), null]) loi(kiemXeMoi({ ...XE, plateNumber: bien }, HOM_NAY));
  for (const khung of [undefined, null, "", "   "]) assert.equal(loi(kiemXeMoi({ ...XE, chassisNumber: khung }, HOM_NAY)), "Cần số khung (in trên giấy đăng ký xe).");
  for (const khung of ["AB12", "Đ12345", "A".repeat(31)]) loi(kiemXeMoi({ ...XE, chassisNumber: khung }, HOM_NAY));
  for (const cho of [0, 101, 15.5, "15", null]) loi(kiemXeMoi({ ...XE, passengerCapacity: cho }, HOM_NAY));
  for (const nam of [1949, 2028, "2019"]) loi(kiemXeMoi({ ...XE, modelYear: nam }, HOM_NAY));
  ok(kiemXeMoi({ ...XE, modelYear: 2027 }, HOM_NAY)); // năm sau: xe đời mới bán sớm
  loi(kiemXeMoi({ ...XE, status: "retired" }, HOM_NAY));
  loi(kiemXeMoi({ ...XE, status: "broken" }, HOM_NAY));
  loi(kiemXeMoi({ ...XE, validFrom: "2026-09-29" }, HOM_NAY));
  loi(kiemXeMoi({ ...XE, name: "" }, HOM_NAY));
  loi(kiemXeMoi(null, HOM_NAY));
});

test("kiemSuaXe: Đang dùng → Ngừng dùng đặt ngày ngừng = hôm nay; Ngừng → Đang dùng (dùng lại) bỏ ngày ngừng; trạng thái lạ, thiếu mốc cập nhật → từ chối", () => {
  const hienTai = { status: "active" as const, validFrom: "2026-01-01", validTo: null };
  const ngung = ok(kiemSuaXe({ ...XE, status: "retired", expectedUpdatedAt: "t1" }, hienTai, HOM_NAY));
  assert.deepEqual([ngung.status, ngung.validTo, ngung.validFrom, ngung.expectedUpdatedAt], ["retired", HOM_NAY, "2026-01-01", "t1"]);
  const daNgung = { status: "retired" as const, validFrom: "2026-01-01", validTo: "2026-05-01" };
  const dungLai = ok(kiemSuaXe({ ...XE, status: "active", expectedUpdatedAt: "t2" }, daNgung, HOM_NAY));
  assert.deepEqual([dungLai.status, dungLai.validTo], ["active", null]);
  assert.equal(ok(kiemSuaXe({ ...XE, status: "retired", expectedUpdatedAt: "t2" }, daNgung, HOM_NAY)).validTo, "2026-05-01", "ngừng rồi thì giữ ngày ngừng cũ");
  assert.equal(ok(kiemSuaXe({ ...XE, status: "maintenance", expectedUpdatedAt: "t1" }, hienTai, HOM_NAY)).validTo, null);
  loi(kiemSuaXe({ ...XE, status: "broken", expectedUpdatedAt: "t1" }, hienTai, HOM_NAY));
  assert.match(loi(kiemSuaXe({ ...XE, status: "active" }, hienTai, HOM_NAY)), /mốc cập nhật/);
  assert.equal(loi(kiemSuaXe({ ...XE, chassisNumber: "", status: "active", expectedUpdatedAt: "t1" }, hienTai, HOM_NAY)), "Cần số khung (in trên giấy đăng ký xe).", "không xoá được số khung (R9)");
});

test("canhBaoXe: giấy hiện hành gần hạn nhất quyết mức; đếm số giấy đã hết + sắp hết (cho dòng 'Phù hiệu đã hết hạn 8 ngày · 2 giấy sắp hết hạn' của bản vẽ)", () => {
  assert.deepEqual(canhBaoXe([], HOM_NAY, 30), { alert: "none", alertTypeName: null, alertDaysLeft: null, alertCount: 0 });
  assert.deepEqual(canhBaoXe([{ typeName: "Kiểm định", expiryDate: "2026-12-31" }], HOM_NAY, 30), { alert: "none", alertTypeName: null, alertDaysLeft: null, alertCount: 0 });
  assert.deepEqual(canhBaoXe([{ typeName: "Kiểm định", expiryDate: "2026-10-03" }, { typeName: "Bảo hiểm", expiryDate: "2027-01-01" }], HOM_NAY, 30), {
    alert: "soon", alertTypeName: "Kiểm định", alertDaysLeft: 5, alertCount: 1,
  });
  assert.deepEqual(
    canhBaoXe([{ typeName: "Kiểm định", expiryDate: "2026-10-03" }, { typeName: "Phù hiệu xe hợp đồng", expiryDate: "2026-09-20" }, { typeName: "Bảo hiểm", expiryDate: "2026-10-20" }], HOM_NAY, 30),
    { alert: "expired", alertTypeName: "Phù hiệu xe hợp đồng", alertDaysLeft: -8, alertCount: 3 },
  );
});

test("loiRangBuocXe: lỗi CSDL của xe → mã lớp CSDL RIÊNG (khác mã lớp route vehicle_plate_taken / vehicle_chassis_taken — R15 điểm 1, 3), cùng câu báo; lỗi lạ → null", () => {
  assert.deepEqual(loiRangBuocXe("D1_ERROR: UNIQUE constraint failed: vc_vehicle.plate_key: SQLITE_CONSTRAINT"), { status: 409, code: "vehicle_plate_conflict", message: "Biển số này đang dùng cho xe khác." });
  assert.deepEqual(loiRangBuocXe("UNIQUE constraint failed: vc_vehicle.chassis_key"), { status: 409, code: "vehicle_chassis_conflict", message: "Số khung này đã có ở xe khác." });
  assert.equal(loiRangBuocXe("FOREIGN KEY constraint failed")?.status, 400);
  assert.equal(loiRangBuocXe("không liên quan"), null);
  // ADR-0048 B1.1 lớp CSDL (trigger vc_vehicle_owner_* của migration *_chu_xe_nha_xe): mã RIÊNG, khác vehicle_owner_not_carrier của lớp route; KHÔNG rơi vào
  // nhánh khoá ngoại (trigger BEFORE INSERT đứng trước khoá ngoại nên chủ không tồn tại cũng ra thông báo này).
  assert.deepEqual(loiRangBuocXe("D1_ERROR: vehicle_owner_not_allowed: chủ xe phải là công ty chủ hoặc nhà xe đối tác đang hợp tác: SQLITE_CONSTRAINT"), {
    status: 409, code: "vehicle_owner_conflict", message: "Chủ xe phải là công ty chủ hoặc nhà xe đối tác đang hợp tác.",
  });
  assert.deepEqual(loiRangBuocXe("D1_ERROR: vehicle_document_type_current: xe đã có giấy tờ loại này đang dùng — gia hạn hoặc sửa sai: SQLITE_CONSTRAINT"), {
    status: 409, code: "document_type_conflict", message: "Xe vừa có giấy tờ loại này — tải lại rồi bấm Gia hạn hoặc Sửa sai.",
  });
});

// ---- Giấy tờ xe (Task A14) — khuôn giấy tờ của người, KHÁC ở ba chỗ: không CCCD, không che số, chỉ lý do sửa sai `choXe` ----------------------------------
const DM_XE: DanhMucGiayToXe = {
  loai: new Map([["REGISTRATION", { hasExpiry: false, active: true }], ["INSPECTION", { hasExpiry: true, active: true }], ["DA_NGUNG", { hasExpiry: true, active: false }]]),
  homNay: HOM_NAY,
};
const GT_HH = { typeCode: "INSPECTION", number: "KD-0456", issuedDate: "2026-04-15", expiryDate: "2026-10-15" };

test("kiemThemGiayToXe: loại có trong danh mục và đang dùng; số tuỳ chọn ≤ 60 ký tự; ngày cấp / hết hạn theo luật chung (loại không hạn thì không có ngày hết hạn)", () => {
  assert.deepEqual(ok(kiemThemGiayToXe({ typeCode: "INSPECTION", number: "  KD - 0456 ", issuedDate: "2026-04-15", expiryDate: "2026-10-15" }, DM_XE)), { typeCode: "INSPECTION", number: "KD - 0456", issuedDate: "2026-04-15", expiryDate: "2026-10-15" });
  assert.deepEqual(ok(kiemThemGiayToXe({ typeCode: "REGISTRATION" }, DM_XE)), { typeCode: "REGISTRATION", number: null, issuedDate: null, expiryDate: null });
  assert.match(loi(kiemThemGiayToXe({ typeCode: "REGISTRATION", expiryDate: "2030-01-01" }, DM_XE)), /không có ngày hết hạn/);
  for (const body of [{ typeCode: "KHONG_CO" }, { typeCode: "DA_NGUNG" }, { typeCode: "INSPECTION", number: "x".repeat(61) }, { typeCode: "INSPECTION", issuedDate: "2026-09-29" }, null]) {
    loi(kiemThemGiayToXe(body as Record<string, unknown> | null, DM_XE));
  }
});

test("kiemGiaHanXe: KHÔNG gửi số ⇒ chép số dòng trước; gửi số mới thì dùng số mới", () => {
  assert.equal(ok(kiemGiaHanXe({ expiryDate: "2027-10-15" }, GT_HH, DM_XE)).number, "KD-0456");
  assert.equal(ok(kiemGiaHanXe({ number: "KD-0999", expiryDate: "2027-10-15" }, GT_HH, DM_XE)).number, "KD-0999");
  loi(kiemGiaHanXe({ issuedDate: "2026-09-10", expiryDate: "2026-09-01" }, GT_HH, DM_XE));
});

test("kiemSuaSaiXe: chỉ lý do dùng cho xe (không nơi cấp, không hạng); giá trị mới phải khác; huỷ dòng không nhận giá trị; bắt buộc mốc cập nhật", () => {
  assert.equal(ok(kiemSuaSaiXe({ reason: "SAI_NGAY_HET_HAN", value: "2026-11-15", expectedUpdatedAt: "t1" }, GT_HH, DM_XE)).lyDo, "SAI_NGAY_HET_HAN");
  assert.equal(ok(kiemSuaSaiXe({ reason: "SAI_SO", value: "KD-0457", expectedUpdatedAt: "t1" }, GT_HH, DM_XE)).lyDo, "SAI_SO");
  assert.deepEqual(ok(kiemSuaSaiXe({ reason: "NHAP_NHAM_DONG", expectedUpdatedAt: "t1" }, GT_HH, DM_XE)), { lyDo: "NHAP_NHAM_DONG", huy: true, expectedUpdatedAt: "t1" });
  for (const reason of ["SAI_NOI_CAP", "SAI_HANG"]) assert.match(loi(kiemSuaSaiXe({ reason, value: "x", expectedUpdatedAt: "t1" }, GT_HH, DM_XE)), /giấy tờ xe/);
  // Ruling R22: lý do thuộc danh sách đóng — thiếu / ngoài danh sách → lỗi có câu, không ném.
  assert.match(loi(kiemSuaSaiXe({ reason: "KHAC", value: "x", expectedUpdatedAt: "t1" }, GT_HH, DM_XE)), /Lý do/);
  assert.match(loi(kiemSuaSaiXe({ value: "2026-11-15", expectedUpdatedAt: "t1" }, GT_HH, DM_XE)), /Lý do/);
  loi(kiemSuaSaiXe({ reason: "SAI_SO", value: "KD-0456", expectedUpdatedAt: "t1" }, GT_HH, DM_XE)); // không đổi
  loi(kiemSuaSaiXe({ reason: "SAI_NGAY_HET_HAN", value: "2026-11-15" }, GT_HH, DM_XE)); // thiếu mốc
  loi(kiemSuaSaiXe({ reason: "NHAP_NHAM_DONG", value: "x", expectedUpdatedAt: "t1" }, GT_HH, DM_XE));
});

test("chiTietNhatKyXe: mở đầu bằng biển số; KHÔNG BAO GIỜ số giấy tờ (kể cả lỡ truyền vào); ngày trước → sau cho lý do về ngày", () => {
  assert.equal(chiTietNhatKyXe("79B-012.34", { loai: "Kiểm định", hetHan: "2026-10-15" }), "xe 79B-012.34: Kiểm định, hết hạn 2026-10-15");
  assert.equal(chiTietNhatKyXe("79B-012.34", { loai: "Đăng ký xe", hetHan: null }), "xe 79B-012.34: Đăng ký xe, không hạn");
  assert.equal(chiTietNhatKyXe("79B-012.34", { loai: "Kiểm định", giaHan: true, truoc: "2026-10-15", sau: "2027-10-15" }), "xe 79B-012.34: Kiểm định: gia hạn, hết hạn 2026-10-15 → 2027-10-15");
  assert.equal(chiTietNhatKyXe("79B-012.34", { loai: "Kiểm định", lyDo: "SAI_NGAY_HET_HAN", truoc: "2026-10-15", sau: "2026-11-15" }), "xe 79B-012.34: Kiểm định: Nhập sai ngày hết hạn (2026-10-15 → 2026-11-15)");
  assert.equal(chiTietNhatKyXe("79B-012.34", { loai: "Kiểm định", lyDo: "SAI_SO", truoc: "KD-0456", sau: "KD-0457" }), "xe 79B-012.34: Kiểm định: Nhập sai số");
});

test("kiemXeMoi (ADR-0048 D1): ownerPartyId tuỳ chọn — vắng / null / rỗng = mặc định công ty chủ (null); id hồ sơ đúng khuôn → giữ; sai khuôn → từ chối", () => {
  assert.equal(ok(kiemXeMoi(XE, HOM_NAY)).ownerPartyId, null);
  assert.equal(ok(kiemXeMoi({ ...XE, ownerPartyId: null }, HOM_NAY)).ownerPartyId, null);
  assert.equal(ok(kiemXeMoi({ ...XE, ownerPartyId: "" }, HOM_NAY)).ownerPartyId, null);
  const id = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
  assert.equal(ok(kiemXeMoi({ ...XE, ownerPartyId: id }, HOM_NAY)).ownerPartyId, id);
  for (const sai of ["abc", 12, "3F1C2B4A-5D6E-4F70-8A9B-0C1D2E3F4A5B!"]) assert.equal(loi(kiemXeMoi({ ...XE, ownerPartyId: sai }, HOM_NAY)), "Chủ xe không hợp lệ.");
});

test("kiemSuaXe (ADR-0048 D1, Q1 = (a) — chủ trả lời 29/9 'Sửa được, ghi nhật ký'): ownerPartyId vắng / null / rỗng = GIỮ chủ (null); id đúng khuôn → giữ; sai khuôn → từ chối", () => {
  const hienTai = { status: "active" as const, validFrom: "2026-01-01", validTo: null };
  assert.equal(ok(kiemSuaXe({ ...XE, status: "active", expectedUpdatedAt: "t1" }, hienTai, HOM_NAY)).ownerPartyId, null);
  const id = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
  assert.equal(ok(kiemSuaXe({ ...XE, status: "active", expectedUpdatedAt: "t1", ownerPartyId: id }, hienTai, HOM_NAY)).ownerPartyId, id);
  assert.equal(loi(kiemSuaXe({ ...XE, status: "active", expectedUpdatedAt: "t1", ownerPartyId: "abc" }, hienTai, HOM_NAY)), "Chủ xe không hợp lệ.");
});

test("loiRangBuocChuyen: bản chụp 'Bỏ đánh dấu' sai (GA-59 — trigger gb_snapshot / CHECK của 0043) → 409 trip_rule như gb_needs_appt; chuỗi mốc thua đua vẫn gio_hen_vua_doi; lỗi lạ → null", () => {
  const luat = { status: 409, code: "trip_rule", message: "Chuyến vừa thay đổi hoặc lệnh vi phạm luật chuyến xe — tải lại rồi làm lại." };
  assert.deepEqual(loiRangBuocChuyen('D1_ERROR: gb_snapshot: bản chụp "bỏ đánh dấu" chỉ chứa mã chuyến có thật: SQLITE_CONSTRAINT'), luat);
  assert.deepEqual(loiRangBuocChuyen("D1_ERROR: gb_needs_appt: chặng chưa có mốc giờ hẹn: SQLITE_CONSTRAINT"), luat);
  assert.deepEqual(loiRangBuocChuyen("CHECK constraint failed: vc_leg_appt_ack"), luat);
  assert.equal(loiRangBuocChuyen("gb_chain: chuỗi mốc giờ hẹn không liền mạch")?.code, "gio_hen_vua_doi");
  assert.equal(loiRangBuocChuyen("không liên quan"), null);
});

test("ADR-0096 (gói A1): RAISE lc19_ / lc20_ của trigger cổng xuất bến (0084) → 409 trip_rule mang ĐÚNG câu của lý do giữ (không câu chung)", () => {
  const r19 = loiRangBuocChuyen("D1_ERROR: lc19_tra_truoc_don: điểm trả đứng trước điểm đón của khách chờ lên — đổi thứ tự điểm rồi xuất bến: SQLITE_CONSTRAINT");
  assert.deepEqual(r19, { status: 409, code: "trip_rule", message: "Điểm trả đứng trước điểm đón — đổi thứ tự điểm rồi xuất bến." });
  const r20 = loiRangBuocChuyen("D1_ERROR: lc20_ngoai_cua_so: chưa tới giờ được xuất bến theo cửa sổ của chính sách điều phối: SQLITE_CONSTRAINT");
  assert.deepEqual(r20, { status: 409, code: "trip_rule", message: "Chưa tới giờ được xuất bến. Xe thật sự chạy sớm thì văn phòng sửa giờ chuyến." });
});

test("ADR-0097 (gói A1, V3-B): RAISE dc_revoke_progress → câu chỉ đường riêng; dc_scope / dc_balance → câu chung 'tải lại'; không lộ mã", () => {
  const thuHoi = loiRangBuocChuyen("D1_ERROR: dc_revoke_progress: chuyến đã có tiến độ sau xuất bến — không thu hồi được: SQLITE_CONSTRAINT");
  assert.equal(thuHoi?.status, 409);
  assert.equal(thuHoi?.code, "trip_rule");
  assert.match(thuHoi!.message, /^Chuyến vừa có tiến độ sau xuất bến nên không thu hồi được — tải lại, rồi sửa từng khách bằng "Điều chỉnh…" hoặc "Kết thúc gián đoạn"\.$/);
  for (const m of ["dc_scope: điều chỉnh chỉ trên chuyến đang chạy", "dc_balance: điều chỉnh phải đóng đúng một suất"]) {
    assert.deepEqual(loiRangBuocChuyen(`D1_ERROR: ${m}: SQLITE_CONSTRAINT`), { status: 409, code: "trip_rule", message: "Chuyến vừa thay đổi hoặc lệnh vi phạm luật chuyến xe — tải lại rồi làm lại." }, m);
  }
});
