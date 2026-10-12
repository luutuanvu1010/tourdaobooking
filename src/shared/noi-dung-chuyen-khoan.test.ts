// Nội dung chuyển khoản = mã đơn bỏ dấu gạch (đặc tả QR §4.2); ô tìm đơn nhận lại nội dung đó (§4.3, §8.9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { maDonTuNoiDung, noiDungChuyenKhoan } from "./noi-dung-chuyen-khoan.ts";

test("mã đơn → nội dung chỉ [A-Z0-9]", () => {
  assert.equal(noiDungChuyenKhoan("TD-20261008-0012"), "TD202610080012");
  assert.equal(noiDungChuyenKhoan("td-20261008-0012"), "TD202610080012");
  assert.match(noiDungChuyenKhoan("TD-BN-1"), /^[A-Z0-9]+$/);
});

test("chữ tìm chứa nội dung chuyển khoản → mã đơn có gạch; chữ khác → null", () => {
  for (const q of ["td202610080012", "TD202610080012", "TD-20261008-0012", "TD20261008-0012", "MBVCB.12345.TD202610080012.CT tu An"]) {
    assert.equal(maDonTuNoiDung(q), "TD-20261008-0012", q);
  }
  for (const q of ["", "-", "0012", "TD2026100800", "Nguyễn Văn An", "0901234567", "TD2026100800123"]) assert.equal(maDonTuNoiDung(q), null, q);
});
