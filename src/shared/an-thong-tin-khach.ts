// Công tắc «Ẩn thông tin khách khi đối tác đặt vé» (ADR-0154 Đ2, C2): luật THUẦN «công tắc có áp cho tài khoản này không». Dùng chung máy chủ (lập đơn, lưu nháp, đường đọc công tắc)
// ↔ giao diện (chỉ ẩn / hiện form; máy chủ luôn quyết lại). Công tắc BẬT hay TẮT là chuyện của bảng chính sách (`orders/xac-nhan-repo.ts`), không ở đây.
import { holdsPartner, isExternalPermission, type PermissionHolder } from "./permissions.ts";

/**
 * C2 (chủ 2026-11-02: «nhân bán hàng thường không được cấp quyền đối tác»; luật dự phòng cho tài khoản lai, an toàn hơn và đảo được): công tắc chỉ áp cho tài khoản GIỮ quyền Đối tác
 * VÀ không giữ quyền nào ngoài nhóm bên ngoài (`EXTERNAL_PERMISSIONS`). Tài khoản lai (Bán hàng + Đối tác, …) vẫn nhập thông tin khách và đơn của họ không mang dấu miễn danh sách.
 * Mã quyền ở đây là điều kiện DỮ LIỆU của một luật SIẾT thông tin, không phải điều kiện cho phép.
 */
export const apCongTacAnKhach = (who: Pick<PermissionHolder, "permissions">): boolean => holdsPartner(who) && who.permissions.every(isExternalPermission);

/**
 * Form đang ẨN khối khách mà gửi bị máy chủ từ chối: có nên HIỆN LẠI khối không (ADR-0154 Đ2.3 «form đang ẩn mà công tắc vừa tắt: nhận lỗi thiếu tên thì đọc lại công tắc và hiện khối»)? Chỉ khi form đang ẩn,
 * lỗi là 400 (thiếu ô) VÀ công tắc đọc lại nay KHÔNG còn áp cho tài khoản (`apChoToi` từ `GET /api/cai-dat/an-thong-tin-khach`). Lỗi khác (409, 403…) không đọc lại; 400 mà công tắc vẫn áp là lỗi khác — giữ
 * nguyên khối ẩn và câu lỗi của máy chủ. Chỉ để HIỆN; máy chủ vẫn là nơi quyết.
 */
export const canHienLaiKhoiKhach = (v: { dangAn: boolean; loi: { status: number }; apChoToi: boolean }): boolean => v.dangAn && v.loi.status === 400 && !v.apChoToi;
