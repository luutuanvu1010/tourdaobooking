// Đợt 0 Task 8: «Trang cha ›» của thanh trên máy tính lấy từ `cungSang` của bảng TRANG (không khai thêm ở shell).
import { test } from "node:test";
import assert from "node:assert/strict";
import { trangChaCua } from "./shared/muc-giao-dien.ts";

test("trangChaCua: trang con tra ra trang cha (nhãn + đường)", () => {
  assert.deepEqual(trangChaCua("/order"), { nhan: "Đơn hàng", href: "/orders" });
  assert.deepEqual(trangChaCua("/xe-sua"), { nhan: "Xe & giấy tờ", href: "/xe" });
});

test("trangChaCua: khoá đứng trước thắng khoá THIẾT LẬP chung", () => {
  assert.deepEqual(trangChaCua("/dieu-kien-xuat-ben"), { nhan: "Chính sách điều phối", href: "/chinh-sach-dieu-phoi" });
  assert.deepEqual(trangChaCua("/staff"), { nhan: "Thiết lập", href: "/thiet-lap" });
});

test("trangChaCua: trang cấp một / lạ → null", () => {
  assert.equal(trangChaCua("/orders"), null);
  assert.equal(trangChaCua("/khong-co-trang-nay"), null);
});
