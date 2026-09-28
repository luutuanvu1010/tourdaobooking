// Trang khởi đầu theo quyền — logic thuần, gọi từ web/home.ts (Trang chủ ở "/"); có test cạnh tệp.
//
// Từ Đợt D, "/" là Trang chủ, gọi `GET /api/orders/dashboard` (cổng "orders" + `can()` không ngữ cảnh trong thân — ADR-0019). Tài khoản dùng được Đơn hàng nhưng
// KHÔNG xem được mọi đơn (`seesAllOrders` sai — thực tế: chỉ có quyền Đối tác/Thực tập/Hướng dẫn viên, hoặc ghép các quyền đó) sẽ nhận 403 ở đó và không có mục "Đơn hàng"
// trên thanh điều hướng. Trước Đợt D, "/" chính là Đơn hàng nên họ vào thẳng danh sách đơn của mình — hàm này giữ lại
// hành vi đó (cách sửa A, chủ dự án chốt 2026-09-24): chuyển sang "/orders". Áp cho MỌI đường vào "/" (sau đăng nhập
// PIN/Face ID, mở app PWA, gõ thẳng địa chỉ, "/home" cũ tự chuyển về "/") vì chỉ đặt ở chính trang "/".
// KHÔNG đổi bản đồ quyền, KHÔNG đổi access của route: chỉ ghép hai hàm quyền sẵn có (ADR-0019: "thấy mọi đơn" là câu hỏi của bảng,
// tách khỏi cổng "vào Hồ sơ").
// Chỉ-FIELD: từ ADR-0030 S23-4/S23-5 (FIELD vào cổng "orders", danh sách = đơn mình đang phụ trách, KHÔNG xem được Trang chủ toàn công ty) cũng được
// chuyển sang "/orders" — mã không đổi, `canAccessOrders` tự đúng khi FIELD có trong ORDERS_GATE. Phải phát hành CÙNG lần với nhánh lọc thứ ba của
// `GET /api/orders` (thiếu nó thì HDV rơi vào trang lỗi 403). ADR-0017 ("FIELD xem mọi đơn", ở lại Trang chủ) không thi công nguyên dạng.
// Tài xế (ADR-0040 D3; Ruling R3, R10 của điều phối 2026-09-28): quyền DRIVER không qua cổng orders — ở lại "/" thì Trang chủ gọi dashboard đơn và nhận 403.
// Tài khoản không xem đơn nào mà có DRIVER được đưa sang trang đầu của tài xế. web/home.ts gọi hàm này và `location.replace` TRƯỚC khi tải dashboard
// (web/home.ts:255-258), nên tài khoản đó không bao giờ gọi route dashboard (trừ lời gọi sớm theo bản nhớ khung trên máy dùng chung — kết quả 403 bị bỏ).
import { canAccessOrders, hasPermission, seesAllOrders, type PermissionHolder } from "./permissions.ts";

/**
 * Trang đầu của tài khoản chỉ có phần Tài xế (ADR-0040 D3, Ruling R3). Ruling R10: màn "/tai-xe" (màn số 7 của danh sách màn) dựng ở Phần B theo bản vẽ —
 * TỚI KHI ĐÓ trang đầu tạm là trang Tài khoản có sẵn (không 404, không gọi dashboard đơn). Phần B đổi hằng này thành "/tai-xe" (cùng bài khoá ở start-page.test.ts).
 */
export const TRANG_DAU_TAI_XE = "/account";

/** Đường dẫn phải chuyển sang khi người dùng mở "/", hoặc `null` = ở lại Trang chủ. */
export function homeRedirect(who: PermissionHolder): string | null {
  if (seesAllOrders(who)) return null;
  if (canAccessOrders(who)) return "/orders";
  if (hasPermission(who, "DRIVER")) return TRANG_DAU_TAI_XE;
  return null;
}
