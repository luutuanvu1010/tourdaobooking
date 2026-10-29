// Đợt 0 Task 8: «Trang cha ›» của thanh trên máy tính lấy từ `cungSang` của bảng TRANG (không khai thêm ở shell).
// Lượt sửa cuối (I1): khoá `thietLap` không làm trang cha — `cungSang` của nó chỉ để tô sáng tab; trang là mục thanh bên không có đường dẫn (đặc tả 5.1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionHolder } from "./shared/permissions.ts";
import { KHOA_TRANG, TRANG, trangChaCua, type TrangDich } from "./shared/muc-giao-dien.ts";

test("trangChaCua: trang con tra ra trang cha (nhãn + đường)", () => {
  assert.deepEqual(trangChaCua("/order"), { nhan: "Đơn hàng", href: "/orders" });
  assert.deepEqual(trangChaCua("/xe-sua"), { nhan: "Xe & giấy tờ", href: "/xe" });
});

test("trangChaCua: khoá đứng trước thắng; mục THIẾT LẬP không có trang cha «Thiết lập»", () => {
  assert.deepEqual(trangChaCua("/dieu-kien-xuat-ben"), { nhan: "Chính sách điều phối", href: "/chinh-sach-dieu-phoi" });
  assert.equal(trangChaCua("/staff"), null);
  for (const k of KHOA_TRANG) assert.notEqual(trangChaCua(TRANG[k].duong)?.href, TRANG.thietLap.duong, `${TRANG[k].duong} không được dẫn về /thiet-lap`);
});

test("trangChaCua: trang cấp một / lạ → null", () => {
  assert.equal(trangChaCua("/orders"), null);
  assert.equal(trangChaCua("/khong-co-trang-nay"), null);
});

test("trangChaCua: mọi trang cha trả về phải hiện với bộ quyền mở được trang con (1024 tập)", () => {
  const khoaTheoDuong = new Map(KHOA_TRANG.map((k) => [TRANG[k].duong, k]));
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const s: PermissionHolder = { id: `tap-${m}`, permissions: PERMISSION_CODES.filter((_, i) => m & (1 << i)) };
    // Trang con mở được: trang có lối vào hiện cho s, và trang mở từ một trang hiện cho s.
    const moDuoc = new Set<string>();
    for (const k of KHOA_TRANG) {
      const t: TrangDich = TRANG[k];
      if (!t.hien(s)) continue;
      moDuoc.add(t.duong);
      for (const c of t.cungSang ?? []) moDuoc.add(c);
    }
    for (const duong of moDuoc) {
      const cha = trangChaCua(duong);
      if (!cha) continue;
      const k = khoaTheoDuong.get(cha.href);
      assert.ok(k && TRANG[k].hien(s), `tập [${s.permissions.join(",")}] ở ${duong}: trang cha ${cha.href} không hiện`);
    }
  }
});
