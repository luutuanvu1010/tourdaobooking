import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUS_LABEL, trangThaiHienThi } from "./order-status-label.ts";

test("STATUS_LABEL (ADR-0030 điều 3, Q-A2): 'Chờ xác nhận' thay 'Nháp' — đơn mới không tự gắn người phụ trách", () => {
  assert.equal(STATUS_LABEL.draft, "Chờ xác nhận");
  assert.deepEqual(STATUS_LABEL, { draft: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" });
});

test("trangThaiHienThi (ADR-0025 đ9): hai mốc sổ tiền suy ra nhãn 'Đã giao – đã thu đủ' / 'Hoàn thành'; không lộ mã delivered/completed ra chữ", () => {
  assert.deepEqual(trangThaiHienThi({ status: "draft" }), { khoa: "draft", nhan: "Chờ xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: null }), { khoa: "confirmed", nhan: "Đã xác nhận" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: "x" }), { khoa: "delivered", nhan: "Đã giao – đã thu đủ" });
  assert.deepEqual(trangThaiHienThi({ status: "confirmed", deliveredAt: "x", completedAt: "y" }), { khoa: "completed", nhan: "Hoàn thành" });
  assert.deepEqual(trangThaiHienThi({ status: "cancelled" }), { khoa: "cancelled", nhan: "Đã huỷ" });
});
