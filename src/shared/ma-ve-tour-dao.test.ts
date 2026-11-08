// Mã vé Tour Đảo (ADR-0175 Đ1.6): `TD1.` + 26 ký tự base32 RFC 4648, sinh từ 16 byte ngẫu nhiên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DANG_MA_VE_TD, taoMaVeTourDao } from "./ma-ve-tour-dao.ts";

test("taoMaVeTourDao: 16 byte 0 ⇒ TD1. + 26 chữ A; 16 byte 0xFF ⇒ 25 chữ 7 và chữ 4 (3 bit cuối 111 + 2 bit đệm 0 = 11100)", () => {
  assert.equal(taoMaVeTourDao(() => new Uint8Array(16)), "TD1." + "A".repeat(26));
  assert.equal(taoMaVeTourDao(() => new Uint8Array(16).fill(255)), "TD1." + "7".repeat(25) + "4");
});

test("taoMaVeTourDao: kết quả luôn khớp DANG_MA_VE_TD; hỏi đúng 16 byte", () => {
  for (let i = 0; i < 200; i++) {
    const ma = taoMaVeTourDao((n) => { assert.equal(n, 16); return crypto.getRandomValues(new Uint8Array(n)); });
    assert.match(ma, DANG_MA_VE_TD);
  }
});

test("DANG_MA_VE_TD từ chối chữ thường, thiếu/thừa ký tự, ký tự ngoài base32", () => {
  for (const sai of ["TD1." + "A".repeat(25), "TD1." + "A".repeat(27), "td1." + "A".repeat(26), "TD1." + "a".repeat(26), "TD1." + "1".repeat(26), "TD2." + "A".repeat(26), "ABC123"]) {
    assert.doesNotMatch(sai, DANG_MA_VE_TD, sai);
  }
});
