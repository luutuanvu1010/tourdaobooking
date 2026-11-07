// Chữ và luật HIỆN/ẨN của "Toàn quyền xem như vai trò khác" (ADR-0180 Đ2). Thuần: không DOM. Giao diện chỉ vẽ theo các hàm ở đây.
// Chữ lấy theo bảng tham chiếu (ADR-0167): chủ chọn «Xem như vai khác» / «Đang xem như vai khác» / «Thoát vai», đã đổi thành «vai trò» để theo ADR-0130 (đổi ở MỘT chỗ này).
import { PERMISSION_LABEL, type PermissionCode } from "./permissions.ts";
export { NHAN_THOAT_XEM_NHU, cauThanhXemNhu, hienThanhXemNhu } from "./xem-nhu-vai-thanh.ts";
import { VAI_CHON_DUOC, laToanQuyenThat } from "./xem-nhu-vai.ts";

export const TIEU_DE_XEM_NHU = "Xem như vai trò khác";
export const NHAN_XEM_NHU = "Xem";
export const NHAN_CHON_XEM_NHU = "Vai trò muốn xem";
export const CAU_GOI_Y_XEM_NHU = "Bạn sẽ thấy và thao tác đúng như người giữ quyền đó. Dữ liệu ghi là dữ liệu thật, tính cho tài khoản của bạn.";

/** Mục chọn chỉ dựng cho Toàn quyền THẬT (kể cả lúc đang xem như vai trò khác, để còn đổi / thoát được): chính là `laToanQuyenThat`, không viết lại. */
export const hienMucXemNhuVai = laToanQuyenThat;

/** Các lựa chọn của ô chọn: đúng `VAI_CHON_DUOC`, nhãn là tên quyền (không bao giờ mã thô). */
export function luaChonXemNhu(): { ma: PermissionCode; nhan: string }[] {
  return VAI_CHON_DUOC.map((ma) => ({ ma, nhan: PERMISSION_LABEL[ma] }));
}

