import { test } from "node:test";
import assert from "node:assert/strict";
import { DIGIT_RUN, MIN_LONG_DIGIT_RUN, hasLongDigitRun } from "./text-guards.ts";

test("hasLongDigitRun: các cách viết số điện thoại thật (kể cả số bàn, số quốc tế) → true", () => {
  assert.equal(MIN_LONG_DIGIT_RUN, 8);
  for (const text of [
    "Gọi số 0905 123.456 không được",
    "SĐT: 0905123456",
    "(0258) 3521 234",
    "+84 905 123 456",
    "Liên hệ 0912-345-678 giúp",
    "Số nhà 12 – 0905123456 – Nha Trang",
  ]) {
    assert.ok(hasLongDigitRun(text), text);
  }
});

test("hasLongDigitRun: câu thường, không dãy số dài → false", () => {
  for (const text of ["Khách đổi ý vì bận việc", "Khách yêu cầu huỷ vì trời mưa", ""]) {
    assert.equal(hasLongDigitRun(text), false, text);
  }
});

test("hasLongDigitRun: dãy DƯỚI 8 chữ số (số phòng, giờ, số nhà) → false", () => {
  for (const text of ["Phòng 1234567", "Hẹn 6:30 sáng", "Số nhà 123 Trần Phú", "0905123"]) {
    assert.equal(hasLongDigitRun(text), false, text);
  }
});

test("hasLongDigitRun: dấu ngăn KHÔNG coi là dấu ngăn (/, ,, :) tách số thành các phần dưới ngưỡng → false", () => {
  assert.equal(hasLongDigitRun("6:30, ngày 12/05, số 123"), false);
});

test("DIGIT_RUN xuất ra cho nơi khác tái dùng (maskLongDigits) — vẫn khớp một dãy số đủ dài", () => {
  const m = "0905123456".match(DIGIT_RUN);
  assert.ok(m && m[0] === "0905123456");
});
