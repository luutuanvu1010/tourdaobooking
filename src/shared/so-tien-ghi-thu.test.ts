import { test } from "node:test";
import assert from "node:assert/strict";
import { cauConLaiGhiThu, cauLechConLai, soTienDienSan } from "./so-tien-ghi-thu.ts";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

test("form Ghi khoản thu mở từ nút thường: điền sẵn số Còn lại (không bắt gõ lại)", () => {
  assert.equal(soTienDienSan(1_500_000, null), 1_500_000);
});

test("form mở từ bảng QR: giữ số của mã QR, không thay bằng Còn lại", () => {
  assert.equal(soTienDienSan(1_500_000, 500_000), 500_000);
});

test("Còn lại bằng 0 hoặc âm: để trống, không điền 0", () => {
  assert.equal(soTienDienSan(0, null), null);
  assert.equal(soTienDienSan(-10, null), null);
});

test("câu nhắc Còn lại chỉ hiện khi còn tiền phải thu", () => {
  assert.match(cauConLaiGhiThu(1_500_000, vnd) ?? "", /Còn lại 1\.500\.000 ₫/u);
  assert.equal(cauConLaiGhiThu(0, vnd), null);
});

test("số thu đúng bằng Còn lại: không có câu lệch", () => {
  assert.equal(cauLechConLai(1_500_000, 1_500_000, vnd), null);
});

test("số thu ít hơn Còn lại: báo khách còn thiếu bao nhiêu", () => {
  assert.equal(cauLechConLai(1_000_000, 1_500_000, vnd), "Ít hơn số Còn lại 500.000 ₫ — sau khi ghi, đơn vẫn còn phải thu 500.000 ₫.");
});

test("số thu nhiều hơn Còn lại: báo khách trả dư", () => {
  assert.equal(cauLechConLai(2_000_000, 1_500_000, vnd), "Nhiều hơn số Còn lại 500.000 ₫ — sau khi ghi, khách trả dư 500.000 ₫.");
});

test("ô trống (0) hoặc không có Còn lại: không báo lệch", () => {
  assert.equal(cauLechConLai(0, 1_500_000, vnd), null);
  assert.equal(cauLechConLai(500_000, 0, vnd), null);
});
