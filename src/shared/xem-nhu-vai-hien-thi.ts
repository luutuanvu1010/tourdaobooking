// Chữ và luật HIỆN/ẨN của "Toàn quyền xem như vai trò khác" (ADR-0180 Đ2). Thuần: không DOM. Giao diện chỉ vẽ theo các hàm ở đây.
// Chữ lấy theo bảng tham chiếu (ADR-0167): chủ chọn «Xem như vai khác» / «Đang xem như vai khác» / «Thoát vai», đã đổi thành «vai trò» để theo ADR-0130 (đổi ở MỘT chỗ này).
import { PERMISSION_LABEL, type PermissionCode } from "./permissions.ts";
import { VAI_CHON_DUOC, quyenThat } from "./xem-nhu-vai.ts";

export const TIEU_DE_XEM_NHU = "Xem như vai trò khác";
export const NHAN_XEM_NHU = "Xem";
export const NHAN_THOAT_XEM_NHU = "Thoát";
export const NHAN_CHON_XEM_NHU = "Vai trò muốn xem";
export const CAU_GOI_Y_XEM_NHU = "Bạn sẽ thấy và thao tác đúng như người giữ quyền đó. Dữ liệu ghi là dữ liệu thật, tính cho tài khoản của bạn.";

/** Mục chọn chỉ dựng cho Toàn quyền THẬT (kể cả lúc đang xem như vai trò khác, để còn đổi / thoát được): hỏi quyền thật, không hỏi quyền hiệu lực. */
export function hienMucXemNhuVai(staff: { readonly permissions: readonly PermissionCode[]; readonly realPermissions?: readonly PermissionCode[] }): boolean {
  return quyenThat(staff).includes("SUPER_ADMIN");
}

/** Các lựa chọn của ô chọn: đúng `VAI_CHON_DUOC`, nhãn là tên quyền (không bao giờ mã thô). */
export function luaChonXemNhu(): { ma: PermissionCode; nhan: string }[] {
  return VAI_CHON_DUOC.map((ma) => ({ ma, nhan: PERMISSION_LABEL[ma] }));
}

export function cauThanhXemNhu(ma: PermissionCode): string {
  return `Đang xem như vai trò ${PERMISSION_LABEL[ma]}`;
}

/** Thanh báo cố định: có khi và chỉ khi phiên đang xem như vai trò khác; luôn có nút Thoát. */
export function hienThanhXemNhu(me: { readonly actingRole?: PermissionCode }): { cau: string; nutThoat: string } | null {
  return me.actingRole ? { cau: cauThanhXemNhu(me.actingRole), nutThoat: NHAN_THOAT_XEM_NHU } : null;
}
