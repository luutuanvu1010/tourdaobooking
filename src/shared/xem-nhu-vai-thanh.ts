// Thanh báo "Đang xem như vai trò …" (ADR-0180 Đ2): tệp nhỏ riêng vì đi vào gói của MỌI trang có khung (web/shell.ts); phần mục chọn ở xem-nhu-vai-hien-thi.ts.
import { cauBaoTri } from "./dai-chu.ts";
import { PERMISSION_LABEL, type PermissionCode } from "./permissions.ts";

export const NHAN_THOAT_XEM_NHU = "Thoát";

export function cauThanhXemNhu(ma: PermissionCode): string {
  return "Đang xem như vai trò " + PERMISSION_LABEL[ma];
}

/** Thanh báo cố định: có khi và chỉ khi phiên đang xem như vai trò khác; luôn có nút Thoát. Bảo trì đang bật thì thêm « · Đang bảo trì» (thanh này che dải bảo trì, nên không để chủ mất tin). */
export function hienThanhXemNhu(me: { readonly actingRole?: PermissionCode; readonly maintenance?: { readonly on: boolean } }): { cau: string; nutThoat: string } | null {
  return me.actingRole ? { cau: cauThanhXemNhu(me.actingRole) + (me.maintenance?.on ? " · " + cauBaoTri(null) : ""), nutThoat: NHAN_THOAT_XEM_NHU } : null;
}
