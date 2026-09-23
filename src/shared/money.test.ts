import { test } from "node:test";
import assert from "node:assert/strict";
import { vndShort } from "./money.ts";

test("vndShort — tiền rút gọn cho khổ điện thoại", () => {
  assert.equal(vndShort(0), "0");
  assert.equal(vndShort(500), "500");
  assert.equal(vndShort(999), "999");
  assert.equal(vndShort(900_000), "900k");
  assert.equal(vndShort(1_200_000), "1,2tr");
  assert.equal(vndShort(8_780_000), "8,78tr");
  assert.equal(vndShort(24_150_000), "24,15tr");
  assert.equal(vndShort(10_000_000), "10tr"); // tròn triệu: không kéo theo ",00"
  assert.equal(vndShort(-900_000), "-900k");
  assert.equal(vndShort(-8_780_000), "-8,78tr");
});

test("vndShort — không bao giờ làm tròn LÊN (luôn cắt bớt)", () => {
  assert.equal(vndShort(1_999), "1k"); // 1.999k thật ra là 1,999 nghìn — cắt bớt còn 1k, không lên 2k
  assert.equal(vndShort(8_789_999), "8,78tr"); // 8,789999tr — cắt bớt còn 8,78tr, không lên 8,79tr
});
