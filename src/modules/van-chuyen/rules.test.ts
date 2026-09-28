// Luật thuần của phân hệ Vận chuyển (ADR-0040 D1): biển số / số khung, kiểm thêm / sửa xe (Ruling R9: số khung bắt buộc ở máy chủ), cảnh báo giấy tờ của xe,
// ánh xạ lỗi CSDL của xe (Ruling R15 điểm 1, 3: mã lớp CSDL khác mã lớp route).
import { test } from "node:test";
import assert from "node:assert/strict";
import { canhBaoXe, chuanHoaBienSo, chuanHoaSoKhung, kiemSuaXe, kiemXeMoi, loiRangBuocXe } from "./rules.ts";

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
    modelYear: 2019, passengerCapacity: 15, status: "active", validFrom: HOM_NAY,
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
});
