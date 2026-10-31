// Chữ hiện mã định danh và dấu vết (ai tạo / ai sửa) ở hộp «Sửa» của thẻ «Loại đối tác» và «Các cấp đại lý» (đặc tả 2026-10-31-ma-dinh-danh-va-sua-loai-doi-tac §3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_MA_CO_SAN, cauDangDungCap, cauDangDungLoai, nhanDauVet, nhanMa } from "./hien-thi-ma.ts";

test("nhanMa: loại Có sẵn không lộ mã tiếng Anh; loại tự thêm và cấp hiện nguyên mã", () => {
  assert.equal(nhanMa("TRAVEL_AGENCY", true), "Loại có sẵn của hệ thống — mã cố định");
  assert.equal(CAU_MA_CO_SAN, "Loại có sẵn của hệ thống — mã cố định");
  assert.equal(nhanMa("LDT_ABCDEFGH", false), "LDT_ABCDEFGH");
  assert.equal(nhanMa("CAP_QWERTYUI", false), "CAP_QWERTYUI");
});

test("nhanDauVet: chưa có dấu vết tạo ⇒ câu «Tạo trước 31/10/2026»", () => {
  assert.equal(nhanDauVet(null, null, "tao"), "Tạo trước 31/10/2026 — chưa có dấu vết");
  assert.equal(nhanDauVet(null, "Lan Kế Toán", "tao"), "Tạo trước 31/10/2026 — chưa có dấu vết");
});

test("nhanDauVet: có mốc ⇒ người + giờ Việt Nam (UTC+7), kể cả khi qua ngày", () => {
  assert.equal(nhanDauVet("2026-10-31T07:05:00.000Z", "Lan Kế Toán", "tao"), "Tạo bởi Lan Kế Toán lúc 14:05 31/10/2026");
  assert.equal(nhanDauVet("2026-10-31T18:30:00.000Z", "Minh", "sua"), "Sửa gần nhất bởi Minh lúc 01:30 01/11/2026");
  assert.equal(nhanDauVet("2026-10-31T07:05:00.000Z", null, "tao"), "Tạo lúc 14:05 31/10/2026");
  assert.equal(nhanDauVet("2026-10-31T07:05:00.000Z", null, "sua"), "Sửa gần nhất lúc 14:05 31/10/2026");
});

test("nhanDauVet: chưa sửa lần nào", () => {
  assert.equal(nhanDauVet(null, null, "sua"), "Chưa sửa lần nào");
});

test("câu «Đang dùng»", () => {
  assert.equal(cauDangDungLoai(3), "Đang dùng: 3 hồ sơ");
  assert.equal(cauDangDungLoai(0), "Đang dùng: 0 hồ sơ");
  assert.equal(cauDangDungCap(2, 5), "Đang dùng: 2 loại · 5 đối tác");
});
