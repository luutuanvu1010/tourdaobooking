// ADR-0217 Đ1, Đ2: chuẩn hoá số sê-ri người gõ (chữ hoa, bỏ khoảng trắng) — MỘT hàm cho máy chủ và ô «Tra số sê-ri» ở giao diện.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DANG_SO_SERI, chuanHoaSoSeri } from "./so-seri-ve.ts";

test("chuanHoaSoSeri: chữ thường thành chữ hoa, bỏ khoảng trắng đầu, cuối, giữa", () => {
  assert.equal(chuanHoaSoSeri("ve_abcdefgh"), "VE_ABCDEFGH");
  assert.equal(chuanHoaSoSeri("  VE_ABCD EFGH \n"), "VE_ABCDEFGH");
  assert.equal(chuanHoaSoSeri("Ve_AbCdEfGh"), "VE_ABCDEFGH");
});
test("chuanHoaSoSeri: sai dạng thì null — không đoán, không cắt", () => {
  for (const x of ["", "VE_ABCDEFG", "VE_ABCDEFGHI", "VE_ABCDEFG1", "XX_ABCDEFGH", "VEABCDEFGH", "TD1.AAAAAAAAAAAAAAAAAAAAAAAAAA", null, undefined, 12, {}]) assert.equal(chuanHoaSoSeri(x), null, String(x));
});
test("DANG_SO_SERI khớp đúng VE_ + 8 chữ hoa", () => {
  assert.ok(DANG_SO_SERI.test("VE_ABCDEFGH"));
  assert.ok(!DANG_SO_SERI.test("VE_abcdefgh"));
});
