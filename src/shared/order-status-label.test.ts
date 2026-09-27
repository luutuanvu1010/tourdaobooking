import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUS_LABEL } from "./order-status-label.ts";

test("STATUS_LABEL (ADR-0030 điều 3, Q-A2): 'Chờ xác nhận' thay 'Nháp' — đơn mới không tự gắn người phụ trách", () => {
  assert.equal(STATUS_LABEL.draft, "Chờ xác nhận");
  assert.deepEqual(STATUS_LABEL, { draft: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" });
});
