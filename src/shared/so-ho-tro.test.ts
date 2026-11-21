import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_SO_HO_TRO_SAI, chuanHoaSoHoTro, inSoHoTro, soDienSan } from "./so-ho-tro.ts";

test("nhận di động, số bàn, tổng đài 1900/1800 và bỏ dấu ngăn cách", () => {
  assert.deepEqual(chuanHoaSoHoTro("0905 123 456"), { ok: true, so: "0905123456" });
  assert.deepEqual(chuanHoaSoHoTro("+84 905.123.456"), { ok: true, so: "0905123456" });
  assert.deepEqual(chuanHoaSoHoTro("84905123456"), { ok: true, so: "0905123456" });
  assert.deepEqual(chuanHoaSoHoTro("(0258) 3812-345"), { ok: true, so: "02583812345" });
  assert.deepEqual(chuanHoaSoHoTro("1900 1234"), { ok: true, so: "19001234" });
  assert.deepEqual(chuanHoaSoHoTro("1800 123 456"), { ok: true, so: "1800123456" });
});

test("từ chối số sai dạng bằng câu tiếng Việt, không nhắc lại số", () => {
  for (const sai of ["", "123", "090512345", "09051234567", "1900123", "19001234567", "1700 1234", "abc", "0012345678", "+1 905 123 456", "0100000000", "0212345678"]) {
    const kq = chuanHoaSoHoTro(sai);
    assert.equal(kq.ok, false, sai);
    if (!kq.ok) assert.equal(kq.cau, CAU_SO_HO_TRO_SAI);
  }
});

test("in số cho dễ đọc", () => {
  assert.equal(inSoHoTro("0905123456"), "0905 123 456");
  assert.equal(inSoHoTro("02583812345"), "0258 3812 345");
  assert.equal(inSoHoTro("19001234"), "1900 1234");
  assert.equal(inSoHoTro("1800123456"), "1800 123 456");
  assert.equal(inSoHoTro("không chuẩn"), "không chuẩn");
});

test("điền sẵn: số dịch vụ thắng; trống thì hotline công ty", () => {
  assert.equal(soDienSan("19001234", "0258 3812 345"), "1900 1234");
  assert.equal(soDienSan(null, "0258.3812.345"), "0258 3812 345");
  assert.equal(soDienSan(null, " Hotline lạ "), "Hotline lạ");
});
