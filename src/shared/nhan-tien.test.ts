// Nhãn tiền khách đã trả (ADR-0089 đ3, đ9b; lời chủ 4 câu 2, lời chủ 5 Đ-4, Đ-6) — một hàm thuần cho trang đơn, Việc của tôi, ảnh gửi khách (NT-V1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { nhanTienDaTra } from "./nhan-tien.ts";

test("NT-V1: chưa Đã giao → 'Khách hàng đã trả trước'; sau Đã giao → 'Đã thu'", () => {
  assert.deepEqual(nhanTienDaTra({ status: "confirmed", deliveredAt: null }), { nhan: "Khách hàng đã trả trước", phu: null });
  assert.deepEqual(nhanTienDaTra({ status: "draft", deliveredAt: null }), { nhan: "Khách hàng đã trả trước", phu: null });
  assert.deepEqual(nhanTienDaTra({ status: "confirmed", deliveredAt: "2026-10-01T00:00:00.000Z" }), { nhan: "Đã thu", phu: null });
});

test("NT-V1 (Đ-6): đơn khách huỷ trong hạn → 'Cọc giữ lại – khách huỷ' + hạn hoàn; quá hạn → 'Cọc giữ lại'; nhóm khác không ghi 'Cọc giữ lại'", () => {
  const huy = { status: "cancelled" as const, deliveredAt: null, han: "2027-01-09" };
  assert.deepEqual(nhanTienDaTra({ ...huy, nhom: "KHACH_HUY", homNay: "2027-01-09" }), { nhan: "Cọc giữ lại – khách huỷ", phu: "còn có thể hoàn tới 09/01/2027" });
  assert.deepEqual(nhanTienDaTra({ ...huy, nhom: "KHACH_HUY", homNay: "2027-01-10" }), { nhan: "Cọc giữ lại", phu: null });
  assert.deepEqual(nhanTienDaTra({ ...huy, nhom: "CONG_TY_HUY", homNay: "2027-01-20" }), { nhan: "Khách hàng đã trả trước", phu: null }, "SV-DH-04");
  assert.deepEqual(nhanTienDaTra({ ...huy, nhom: "LAP_LAI", homNay: "2026-11-01" }), { nhan: "Khách hàng đã trả trước", phu: null });
  assert.deepEqual(nhanTienDaTra({ ...huy, nhom: "CHUA_KET_LUAN", homNay: "2026-11-01" }), { nhan: "Khách hàng đã trả trước", phu: null }, "câu trung tính");
  assert.deepEqual(nhanTienDaTra({ status: "cancelled", deliveredAt: null }), { nhan: "Khách hàng đã trả trước", phu: null }, "thiếu nhóm/hạn: không đoán 'giữ cọc'");
});
