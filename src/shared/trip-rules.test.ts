import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_DAYS_AHEAD, MAX_LINES_PER_ORDER, MAX_SERVICES, MISSING_LABEL, confirmWindow } from "./trip-rules.ts";

test("hằng trần đúng đặc tả (Q9): 20 dịch vụ, 50 dòng tiền, 365 ngày", () => {
  assert.equal(MAX_SERVICES, 20);
  assert.equal(MAX_LINES_PER_ORDER, 50);
  assert.equal(MAX_DAYS_AHEAD, 365);
});

test("confirmWindow: từ hôm nay đến +365 ngày (hai đầu đều hợp lệ), kể cả qua năm nhuận", () => {
  assert.deepEqual(confirmWindow("2026-09-19"), { from: "2026-09-19", to: "2027-09-19" });
  assert.deepEqual(confirmWindow("2027-03-01"), { from: "2027-03-01", to: "2028-02-29" });
});

test("MISSING_LABEL: đủ bốn lý do và đúng chữ của banner incomplete_trip", () => {
  assert.deepEqual(MISSING_LABEL, {
    no_date: "chưa có ngày khởi hành",
    past_date: "ngày khởi hành đã qua",
    too_far: "ngày khởi hành quá xa (trên 365 ngày)",
    no_guests: "chưa có khách",
  });
});
