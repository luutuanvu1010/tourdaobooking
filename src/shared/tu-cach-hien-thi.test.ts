import { test } from "node:test";
import assert from "node:assert/strict";
import { anTienNhapNguoiKhac, cheDoTuCach, laTuCachThanhVien, nhanMucTuCach, tuCachBanDau, type TuCachHienThi } from "./tu-cach-hien-thi.ts";

const NAM: TuCachHienThi = { partyId: "p-nam", ten: "Anh Nam", laToChuc: false };
const SUN: TuCachHienThi = { partyId: "p-sun", ten: "Khách sạn Sunrise", laToChuc: true };
const MOON: TuCachHienThi = { partyId: "p-moon", ten: "Công ty Moon", laToChuc: true };

test("cheDoTuCach: rỗng và chỉ cá nhân ⇒ không ô; một tổ chức ⇒ chỉ đọc; từ hai tư cách ⇒ ô chọn", () => {
  assert.equal(cheDoTuCach([]), "khong");
  assert.equal(cheDoTuCach([NAM]), "khong");
  assert.equal(cheDoTuCach([SUN]), "chi-doc");
  assert.equal(cheDoTuCach([NAM, SUN]), "chon");
  assert.equal(cheDoTuCach([SUN, MOON]), "chon");
});

test("tuCachBanDau: lần cuối nếu còn; hết thì cá nhân; không cá nhân thì mục đầu; rỗng thì null", () => {
  assert.equal(tuCachBanDau([NAM, SUN], "p-sun"), SUN);
  assert.equal(tuCachBanDau([NAM, SUN], "p-da-mat"), NAM);
  assert.equal(tuCachBanDau([NAM, SUN], null), NAM);
  assert.equal(tuCachBanDau([SUN, MOON], null), SUN);
  assert.equal(tuCachBanDau([], "p-sun"), null);
});

test("nhanMucTuCach: tổ chức chỉ tên; cá nhân kèm «(cá nhân)»", () => {
  assert.equal(nhanMucTuCach(SUN), "Khách sạn Sunrise");
  assert.equal(nhanMucTuCach(NAM), "Anh Nam (cá nhân)");
});

test("laTuCachThanhVien (Task 17): chỉ tư cách THÀNH VIÊN ẩn «Gửi đơn»; người quản lý, cá nhân, máy chủ cũ (vắng loai), không tư cách ⇒ không", () => {
  assert.equal(laTuCachThanhVien({ partyId: "o", ten: "Sunrise", laToChuc: true, loai: "MEMBER" }), true);
  assert.equal(laTuCachThanhVien({ partyId: "o", ten: "Sunrise", laToChuc: true, loai: "MANAGER" }), false);
  assert.equal(laTuCachThanhVien({ partyId: "p", ten: "Nam", laToChuc: false, loai: "CA_NHAN" }), false);
  assert.equal(laTuCachThanhVien({ partyId: "o", ten: "Sunrise", laToChuc: true }), false);
  assert.equal(laTuCachThanhVien(null), false);
});

// Task 18 phần 1b: người quản lý (giữ quyền Đối tác) mở nháp của người khác — route tiền của đơn từ chối (không mở quyền tiền), nên trang không hiện dòng «Chưa tải được».
test("anTienNhapNguoiKhac: chỉ nháp, người xem không phải người lập, giữ quyền Đối tác", () => {
  assert.equal(anTienNhapNguoiKhac({ status: "draft", laNguoiLap: false, giuDoiTac: true }), true);
  assert.equal(anTienNhapNguoiKhac({ status: "draft", laNguoiLap: true, giuDoiTac: true }), false, "nháp của chính mình: route tiền trả số");
  assert.equal(anTienNhapNguoiKhac({ status: "draft", laNguoiLap: false, giuDoiTac: false }), false, "văn phòng: giữ hành vi cũ");
  assert.equal(anTienNhapNguoiKhac({ status: "confirmed", laNguoiLap: false, giuDoiTac: true }), false, "đơn đã gửi lên: route tiền mở cho người quản lý bên đặt");
  assert.equal(anTienNhapNguoiKhac({ status: "cancelled", laNguoiLap: false, giuDoiTac: true }), false);
});
