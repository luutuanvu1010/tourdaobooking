import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_DAYS_AHEAD, MAX_LINES_PER_ORDER, MAX_SERVICES, MISSING_LABEL, confirmWindow, tripDeparted } from "./trip-rules.ts";

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

// ---- DK-T4-02 (kiểm toán 24/9; chủ dự án chốt 2026-09-26): tour đã qua ngày đi thì hướng dẫn viên không huỷ được nữa ----
test("tripDeparted: ngày đi = hôm nay → CHƯA qua (ngay trong ngày đi vẫn huỷ được — khách không đến bến)", () => {
  assert.equal(tripDeparted(["2026-09-26"], "2026-09-26"), false);
});

test("tripDeparted: ngày đi = hôm qua → ĐÃ qua", () => {
  assert.equal(tripDeparted(["2026-09-25"], "2026-09-26"), true);
});

test("tripDeparted: nhiều dịch vụ — ngày đi là ngày LỚN NHẤT (một dịch vụ đã qua, một hôm nay → chưa qua)", () => {
  assert.equal(tripDeparted(["2026-09-20", "2026-09-26"], "2026-09-26"), false);
  assert.equal(tripDeparted(["2026-09-26", "2026-09-20"], "2026-09-26"), false, "không phụ thuộc thứ tự dịch vụ");
  assert.equal(tripDeparted(["2026-09-20", "2026-09-24"], "2026-09-26"), true, "mọi dịch vụ đã qua → đã qua");
});

test("tripDeparted: dịch vụ không có ngày bị bỏ qua; KHÔNG dịch vụ nào có ngày → không chặn (không chứng minh được là đã qua)", () => {
  assert.equal(tripDeparted([null, null], "2026-09-26"), false);
  assert.equal(tripDeparted([], "2026-09-26"), false);
  assert.equal(tripDeparted(["", null], "2026-09-26"), false, "chuỗi rỗng coi như chưa có ngày (cùng quy ước sameDepartDate)");
  assert.equal(tripDeparted([null, "2026-09-25"], "2026-09-26"), true, "bỏ qua dịch vụ không ngày, dịch vụ còn lại đã qua");
  assert.equal(tripDeparted([null, "2026-09-26"], "2026-09-26"), false);
});
