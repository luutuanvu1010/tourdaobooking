// Trang khởi đầu theo quyền — logic thuần, gọi từ web/home.ts (Trang chủ ở "/"); có test cạnh tệp.
//
// Từ Đợt D, "/" là Trang chủ, gọi `GET /api/orders/dashboard` (cổng "orders" + `can()` không ngữ cảnh trong thân — ADR-0019). Tài khoản dùng được Đơn hàng nhưng
// KHÔNG xem được mọi đơn (`seesAllOrders` sai — thực tế: chỉ có quyền Đối tác/Thực tập, có thể kèm FIELD) sẽ nhận 403 ở đó và không có mục "Đơn hàng"
// trên thanh điều hướng. Trước Đợt D, "/" chính là Đơn hàng nên họ vào thẳng danh sách đơn của mình — hàm này giữ lại
// hành vi đó (cách sửa A, chủ dự án chốt 2026-09-24): chuyển sang "/orders". Áp cho MỌI đường vào "/" (sau đăng nhập
// PIN/Face ID, mở app PWA, gõ thẳng địa chỉ, "/home" cũ tự chuyển về "/") vì chỉ đặt ở chính trang "/".
// KHÔNG đổi bản đồ quyền, KHÔNG đổi access của route: chỉ ghép hai hàm quyền sẵn có (ADR-0019: "thấy mọi đơn" là câu hỏi của bảng,
// tách khỏi cổng "vào Hồ sơ").
// Chỉ-FIELD (không dùng được Đơn hàng) → null: hiện tại còn thấy banner lỗi đã thiết kế của Trang chủ; từ phần C (FIELD xem mọi đơn,
// ADR-0017) chỉ-FIELD ở lại Trang chủ và KHÔNG còn thấy banner lỗi.
import { canAccessOrders, seesAllOrders, type PermissionHolder } from "./permissions.ts";

/** Đường dẫn phải chuyển sang khi người dùng mở "/", hoặc `null` = ở lại Trang chủ. */
export function homeRedirect(who: PermissionHolder): string | null {
  return !seesAllOrders(who) && canAccessOrders(who) ? "/orders" : null;
}
