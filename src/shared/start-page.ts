// Trang khởi đầu theo quyền — logic thuần, gọi từ web/home.ts (Trang chủ ở "/"); có test cạnh tệp.
//
// Từ Đợt D, "/" là Trang chủ, gọi `GET /api/orders/dashboard` (access "office"). Tài khoản dùng được Đơn hàng nhưng
// KHÔNG phải văn phòng (thực tế: chỉ có quyền Đối tác, có thể kèm FIELD) sẽ nhận 403 ở đó và không có mục "Đơn hàng"
// trên thanh điều hướng. Trước Đợt D, "/" chính là Đơn hàng nên họ vào thẳng danh sách đơn của mình — hàm này giữ lại
// hành vi đó (cách sửa A, chủ dự án chốt 2026-09-24): chuyển sang "/orders". Áp cho MỌI đường vào "/" (sau đăng nhập
// PIN/Face ID, mở app PWA, gõ thẳng địa chỉ, "/home" cũ tự chuyển về "/") vì chỉ đặt ở chính trang "/".
// KHÔNG đổi bản đồ quyền, KHÔNG đổi access của route: chỉ ghép hai hàm quyền sẵn có.
// Chỉ-FIELD (không dùng được Đơn hàng) → null: giữ nguyên banner lỗi đã thiết kế của Trang chủ.
import { canAccessOrders, isOffice, type PermissionHolder } from "./permissions.ts";

/** Đường dẫn phải chuyển sang khi người dùng mở "/", hoặc `null` = ở lại Trang chủ. */
export function homeRedirect(who: PermissionHolder): string | null {
  return !isOffice(who) && canAccessOrders(who) ? "/orders" : null;
}
