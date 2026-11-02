// Luật thuần "Phân định trách nhiệm" (ADR-0116).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MA_TRUONG_HOP, TRUONG_HOP, congNgayLamViec, laMaTruongHop, quaHanNhac, quaHanT11 } from "./phan-dinh.ts";

test("bảng đúng T4, T6–T11 (T1, T2, T3, T5 đã có đường sẵn); T10, T11 công ty chịu; T4 không tiền ra", () => {
  assert.deepEqual([...MA_TRUONG_HOP], ["T4", "T6", "T7", "T8", "T9", "T10", "T11"]);
  assert.equal(laMaTruongHop("T1"), false);
  assert.equal(TRUONG_HOP.T10.benChiu, "cong_ty");
  assert.equal(TRUONG_HOP.T11.benChiu, "cong_ty");
  assert.equal(TRUONG_HOP.T4.tienRaDuoc, false);
  assert.equal(TRUONG_HOP.T6.benChiu, "ho_so");
});
test("T11 quá 7 ngày: đúng 7 ngày chưa đỏ, hơn thì đỏ", () => {
  assert.equal(quaHanT11("2026-11-01T00:00:00.000Z", "2026-11-08T00:00:00.000Z"), false);
  assert.equal(quaHanT11("2026-11-01T00:00:00.000Z", "2026-11-08T00:00:01.000Z"), true);
});
test("nhắc đơn đã giao quá 60 ngày", () => {
  assert.equal(quaHanNhac("2026-09-01", "2026-10-31"), false);
  assert.equal(quaHanNhac("2026-09-01", "2026-11-01"), true);
});
test("3 ngày làm việc bỏ thứ Bảy, Chủ nhật", () => {
  assert.equal(congNgayLamViec("2026-11-02", 3), "2026-11-05"); // thứ Hai → thứ Năm
  assert.equal(congNgayLamViec("2026-11-05", 3), "2026-11-10"); // thứ Năm → thứ Ba tuần sau
});
