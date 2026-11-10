// Dòng nhắc "chuyến chưa bấm Kết thúc" trên màn tài xế (ADR-0189 Quyết định 4): ba ca của ADR + ca tài xế đối tác trước hạn Từ chối.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_NHAC_KET_THUC, hienNhacKetThuc } from "./nhac-ket-thuc.ts";

test("câu nhắc đúng nguyên văn ADR-0189", () => {
  assert.equal(CAU_NHAC_KET_THUC, "Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.");
});

test("hienNhacKetThuc: trong khung → không; ngoài khung sau ngày chạy → hiện; xuất bến tối hôm trước → không", () => {
  const D = "2026-10-20";
  assert.equal(hienNhacKetThuc({ trangThai: "RUNNING", trongNgayChay: true, ngayChay: D }, "2026-10-21"), false, "trong khung");
  assert.equal(hienNhacKetThuc({ trangThai: "RUNNING", trongNgayChay: false, ngayChay: D }, "2026-10-22"), true, "quên Kết thúc, D+2");
  assert.equal(hienNhacKetThuc({ trangThai: "RUNNING", trongNgayChay: false, ngayChay: D }, "2026-10-19"), false, "xuất bến tối hôm trước ngày chạy");
  // tài xế đối tác xuất bến trong ngày chạy nhưng trước hạn Từ chối: ngoài khung, hôm nay = ngày chạy → không nhắc
  assert.equal(hienNhacKetThuc({ trangThai: "RUNNING", trongNgayChay: false, ngayChay: D }, D), false, "ngày chạy, trước hạn Từ chối");
  // chuyến không chạy → không nhắc
  assert.equal(hienNhacKetThuc({ trangThai: "ENDED", trongNgayChay: false, ngayChay: D }, "2026-10-22"), false);
  assert.equal(hienNhacKetThuc({ trangThai: "PLANNED", trongNgayChay: false, ngayChay: D }, "2026-10-22"), false);
});
