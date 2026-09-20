import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "./phone.ts";

test("chuẩn hoá về 0xxxxxxxxx", () => {
  assert.equal(normalizePhone("0901234567"), "0901234567");
  assert.equal(normalizePhone("0901 234 567"), "0901234567");
  assert.equal(normalizePhone("090.123.4567"), "0901234567");
  assert.equal(normalizePhone("(090) 123-4567"), "0901234567");
  assert.equal(normalizePhone("+84 901 234 567"), "0901234567");
  assert.equal(normalizePhone("84901234567"), "0901234567");
});

test("từ chối số sai", () => {
  for (const bad of ["", "123", "090123456", "09012345678", "+84901", "abc0901234567", "1901234567"]) assert.equal(normalizePhone(bad), null, bad);
});
