// Hai câu báo của nút «Gửi đơn» (ADR-0136 Đ13.3): chủ duyệt NGUYÊN VĂN, bài ghim từng ký tự (kể cả dấu «&»).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_BAO_GUI_DON } from "./gui-don-cau-bao.ts";

test("câu báo nhánh A đúng nguyên văn", () => {
  assert.equal(CAU_BAO_GUI_DON.A, "Đơn của bạn đã được gửi và chờ xác nhận");
});

test("câu báo nhánh B đúng nguyên văn, giữ dấu «&»", () => {
  assert.equal(CAU_BAO_GUI_DON.B, "Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên");
});

test("chỉ có hai nhánh", () => {
  assert.deepEqual(Object.keys(CAU_BAO_GUI_DON).sort(), ["A", "B"]);
});
