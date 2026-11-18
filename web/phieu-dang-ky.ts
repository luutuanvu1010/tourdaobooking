// Trang «Phiếu đăng ký đối tác» (ADR-0219 Đ3). Hàng chờ phiếu đăng ký rời trang Quản lý tài khoản vì người xác minh (Quản lý bán hàng) không vào được trang đó,
// và không cổng nào chứa cả Quản lý bán hàng lẫn Nhân sự. Mở cho người giữ ô `registration.queue.view` — CÙNG ô với route `GET /api/dang-ky/hang-cho` (bảng TRANG ở
// src/shared/muc-giao-dien.ts). Hai khối dựng sẵn ở tệp riêng: chỗ mở, đóng đăng ký (chỉ Toàn quyền — `registration.policy.write`) và hàng chờ (mỗi bước hỏi ô riêng).
// Giao diện chỉ ẩn/hiện; máy chủ kiểm lại từng route.
import { can } from "../src/shared/permissions";
import { byId } from "./dom";
import { initShell, showError } from "./shell";
import { dungChinhSachDangKy } from "./dang-ky-chinh-sach";
import { dungHangChoDangKy } from "./dang-ky-hang-cho";

const staff = await initShell();
if (!can(staff, "registration.queue.view")) showError(byId("error"), "Tài khoản này không xử lý phiếu đăng ký đối tác.");
else {
  if (can(staff, "registration.policy.write")) dungChinhSachDangKy(byId("dang-ky-cs"), staff);
  dungHangChoDangKy(byId("dang-ky-hc"), staff);
}
