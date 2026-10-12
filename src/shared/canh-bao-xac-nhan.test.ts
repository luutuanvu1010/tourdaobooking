// Cảnh báo sớm LÚC XÁC NHẬN đơn (lời chủ 1/10 "2 — Có"; kế hoạch docs/superpowers/plans/2026-10-01-giao-dien-dua-don-hanh-khach.md mục "Cảnh báo sớm").
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_CAN_NOI_TRA, CAU_XE_RIENG_CHUA_GIA_NHOM, canhBaoXacNhan, cauThieuTen } from "./canh-bao-xac-nhan.ts";
import type { LegDto, OrderServiceDto } from "./contracts.ts";
import { lyDoNoiTra, lyDoThieuTen, soTenThieu } from "./dieu-phoi-kiem.ts";

const leg = (o: Partial<LegDto> = {}): LegDto => ({
  id: "l1", direction: "OUT", pickupDate: "2026-09-30", pickupTime: "07:30", pickupLocationId: null, pickupPlace: "Sheraton", pickupLabel: "Sheraton",
  dropoffLocationId: "d1", dropoffPlace: null, dropoffLabel: "Ga cáp treo", updatedAt: "t", flightCode: null, paxOverride: null, exclusiveVehicle: false, minVehicleSeats: null, datGap: null, ...o,
});
const ten = (n: number): string[] => Array.from({ length: n }, (_, i) => `pk${i}`);
const svc = (legs: LegDto[], adult = 3, child = 1, unit = "perPax"): Pick<OrderServiceDto, "pax" | "legs" | "unit"> => ({ pax: { adult, child, senior: 0, infant: 0 }, legs, unit });

test("câu chữ đúng bản vẽ", () => {
  assert.equal(CAU_CAN_NOI_TRA, "Cần nơi trả trước khi xếp xe");
  assert.equal(cauThieuTen(1), "Còn 1 khách chưa có tên — cần đủ trước khi xe chạy");
});

test("đủ nơi trả, đủ tên → không cảnh báo", () => {
  assert.deepEqual(canhBaoXacNhan([svc([leg()])], ten(4)), []);
});

test("chặng mở chưa có nơi trả (không điểm, không chữ) → 'Cần nơi trả trước khi xếp xe' một lần dù nhiều chặng thiếu", () => {
  const r = canhBaoXacNhan([svc([leg({ dropoffLocationId: null, dropoffLabel: null }), leg({ id: "l2", direction: "RETURN", dropoffLocationId: null, dropoffLabel: null })])], ten(4));
  assert.deepEqual(r, [CAU_CAN_NOI_TRA]);
  // Nơi trả gõ tự do = có nơi trả (cùng nghĩa coNoiTra của cổng xuất bến).
  assert.deepEqual(canhBaoXacNhan([svc([leg({ dropoffLocationId: null, dropoffPlace: "12 Số 5", dropoffLabel: "12 Số 5" })])], ten(4)), []);
});

test("thiếu tên: số người phải chở của chặng (soNguoiChang) lớn hơn số người có tên — lấy chặng thiếu nhiều nhất", () => {
  assert.deepEqual(canhBaoXacNhan([svc([leg()])], ten(3)), [cauThieuTen(1)]);
  // Chặng về chỉ 2 người, chặng đi 4 → thiếu theo chặng đi.
  assert.deepEqual(canhBaoXacNhan([svc([leg(), leg({ id: "l2", direction: "RETURN", paxOverride: 2 })])], ten(1)), [cauThieuTen(3)]);
  // Hai dịch vụ: lấy dịch vụ đông nhất.
  assert.deepEqual(canhBaoXacNhan([svc([leg()], 2, 0), svc([leg({ id: "l3" })], 5, 0)], ten(2)), [cauThieuTen(3)]);
});

test("không có chặng đưa đón → không cảnh báo tên (không có xe chạy); không biết số người có tên (null) → bỏ cảnh báo tên", () => {
  assert.deepEqual(canhBaoXacNhan([svc([])], ten(0)), []);
  assert.deepEqual(canhBaoXacNhan([svc([leg({ dropoffLocationId: null, dropoffLabel: null })])], null), [CAU_CAN_NOI_TRA]);
});

test("MỘT luật với cổng xuất bến: kết quả khớp lyDoNoiTra / lyDoThieuTen (src/shared/dieu-phoi-kiem.ts) trên cùng chặng", () => {
  const l = leg({ dropoffLocationId: null, dropoffLabel: null });
  const ch = { coNoiTra: false, orderCode: "TD-1", soNguoi: 4, nguoiCuaDon: ten(1) };
  assert.notEqual(lyDoNoiTra(ch), null);
  assert.equal(soTenThieu(ch), 3);
  assert.notEqual(lyDoThieuTen(ch, true), null);
  assert.deepEqual(canhBaoXacNhan([svc([l])], ten(1)), [CAU_CAN_NOI_TRA, cauThieuTen(3)]);
});

test("cả hai điều kiện → nơi trả trước, tên sau", () => {
  assert.deepEqual(canhBaoXacNhan([svc([leg({ dropoffLocationId: null, dropoffLabel: null })])], ten(0)), [CAU_CAN_NOI_TRA, cauThieuTen(4)]);
});

// C12 (đánh giá ERP 7/10; việc 11 — C4): cờ "Xe riêng" không mang tiền (ADR-0056 §3, ADR-0047 A1) — chỉ NHẮC người xác nhận kiểm lại tiền xe khi đơn chưa có
// dịch vụ "Giá theo nhóm" (đơn vị perNPax). Xét THEO ĐƠN (xe riêng hay bán thành một dịch vụ giá theo nhóm riêng trong cùng đơn), không theo từng dịch vụ.
test("C12: câu chữ cảnh báo xe riêng chưa có giá theo nhóm", () => {
  assert.equal(CAU_XE_RIENG_CHUA_GIA_NHOM, "Có chặng Xe riêng nhưng đơn chưa có dịch vụ Giá theo nhóm — kiểm lại tiền xe");
});

test("C12: chặng bật Xe riêng, đơn chỉ có dịch vụ theo người → cảnh báo MỘT lần dù nhiều chặng", () => {
  const r = canhBaoXacNhan([svc([leg({ exclusiveVehicle: true }), leg({ id: "l2", direction: "RETURN", exclusiveVehicle: true })])], ten(4));
  assert.deepEqual(r, [CAU_XE_RIENG_CHUA_GIA_NHOM]);
});

test("C12: đơn có một dịch vụ Giá theo nhóm (per5Pax) — kể cả dịch vụ khác chặng xe riêng → không cảnh báo", () => {
  assert.deepEqual(canhBaoXacNhan([svc([leg({ exclusiveVehicle: true })], 3, 1, "per5Pax")], ten(4)), []);
  assert.deepEqual(canhBaoXacNhan([svc([leg({ exclusiveVehicle: true })]), svc([], 4, 0, "per16Pax")], ten(4)), []);
});

test("C12: không chặng nào bật Xe riêng → không cảnh báo; đơn vị lạ / nhập tay không phải giá theo nhóm", () => {
  assert.deepEqual(canhBaoXacNhan([svc([leg(), leg({ id: "l2", direction: "RETURN" })])], ten(4)), []);
  assert.deepEqual(canhBaoXacNhan([svc([leg({ exclusiveVehicle: true })]), svc([], 4, 0, "manual")], ten(4)), [CAU_XE_RIENG_CHUA_GIA_NHOM]);
  assert.deepEqual(canhBaoXacNhan([svc([leg({ exclusiveVehicle: true })], 3, 1, "per1Pax")], ten(4)), [CAU_XE_RIENG_CHUA_GIA_NHOM]);
});

test("C12: câu xe riêng đứng SAU hai câu cũ (nơi trả, tên) — thứ tự cũ giữ nguyên", () => {
  const r = canhBaoXacNhan([svc([leg({ exclusiveVehicle: true, dropoffLocationId: null, dropoffLabel: null })])], ten(0));
  assert.deepEqual(r, [CAU_CAN_NOI_TRA, cauThieuTen(4), CAU_XE_RIENG_CHUA_GIA_NHOM]);
});
