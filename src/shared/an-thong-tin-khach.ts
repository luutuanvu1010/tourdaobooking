// Công tắc «Ẩn thông tin khách khi đối tác đặt vé» (ADR-0154 Đ2, C2): luật THUẦN «công tắc có áp cho tài khoản này không». Dùng chung máy chủ (lập đơn, lưu nháp, đường đọc công tắc)
// ↔ giao diện (chỉ ẩn / hiện form; máy chủ luôn quyết lại). Công tắc BẬT hay TẮT là chuyện của bảng chính sách (`orders/xac-nhan-repo.ts`), không ở đây.
import { holdsPartner, isExternalPermission, type PermissionHolder } from "./permissions.ts";

/**
 * C2 (chủ 2026-11-02: «nhân bán hàng thường không được cấp quyền đối tác»; luật dự phòng cho tài khoản lai, an toàn hơn và đảo được): công tắc chỉ áp cho tài khoản GIỮ quyền Đối tác
 * VÀ không giữ quyền nào ngoài nhóm bên ngoài (`EXTERNAL_PERMISSIONS`). Tài khoản lai (Bán hàng + Đối tác, …) vẫn nhập thông tin khách và đơn của họ không mang dấu miễn danh sách.
 * Mã quyền ở đây là điều kiện DỮ LIỆU của một luật SIẾT thông tin, không phải điều kiện cho phép.
 */
export const apCongTacAnKhach = (who: Pick<PermissionHolder, "permissions">): boolean => holdsPartner(who) && who.permissions.every(isExternalPermission);
