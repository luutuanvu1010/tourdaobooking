import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemGhiChu } from "./ghi-chu-danh-muc.ts";

test("kiemGhiChu: trống ⇒ null", () => {
  for (const v of [undefined, "", "   "]) assert.deepEqual(kiemGhiChu(v), { ok: true, value: null });
});
test("kiemGhiChu: chỉ trim hai đầu, giữ xuống dòng", () => {
  assert.deepEqual(kiemGhiChu("  dòng 1\ndòng 2  "), { ok: true, value: "dòng 1\ndòng 2" });
});
test("kiemGhiChu: quá 500 ký tự", () => {
  assert.deepEqual(kiemGhiChu("a".repeat(501)), { ok: false, message: "Ghi chú dài tối đa 500 ký tự." });
  assert.equal(kiemGhiChu("a".repeat(500)).ok, true);
});
test("kiemGhiChu: số điện thoại / email bị chặn, năm thì qua", () => {
  const msg = "Ghi chú không được chứa số điện thoại, số tài khoản hay địa chỉ email.";
  for (const v of ["gọi 0905123456", "0905.123.456", "a@b.vn"]) assert.deepEqual(kiemGhiChu(v), { ok: false, message: msg });
  assert.equal(kiemGhiChu("Năm 2024-2025").ok, true);
});
test("kiemGhiChu: không phải chuỗi ⇒ lỗi", () => {
  assert.equal(kiemGhiChu(123).ok, false);
});
