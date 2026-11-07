// Thanh báo "Đang xem như vai trò …" (ADR-0180 Đ2): tệp nhỏ riêng vì đi vào gói của MỌI trang có khung (web/shell.ts); phần mục chọn ở xem-nhu-vai-hien-thi.ts.
import { PERMISSION_LABEL, type PermissionCode } from "./permissions.ts";

export const NHAN_THOAT_XEM_NHU = "Thoát";

export function cauThanhXemNhu(ma: PermissionCode): string {
  return `Đang xem như vai trò ${PERMISSION_LABEL[ma]}`;
}

/** Thanh báo cố định: có khi và chỉ khi phiên đang xem như vai trò khác; luôn có nút Thoát. */
export function hienThanhXemNhu(me: { readonly actingRole?: PermissionCode }): { cau: string; nutThoat: string } | null {
  return me.actingRole ? { cau: cauThanhXemNhu(me.actingRole), nutThoat: NHAN_THOAT_XEM_NHU } : null;
}
