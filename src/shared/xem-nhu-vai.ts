// Luật thuần cho "Toàn quyền xem như vai khác" (ADR-0180).
// Tệp thuần: không import module máy chủ hay giao diện.
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";

/** Quá chừng này phút không hoạt động thì phiên tự thoát chế độ xem như vai khác. */
export const HAN_XEM_NHU_VAI_PHUT = 60;

/** Các mã quyền Toàn quyền được chọn để xem như: mọi mã trừ chính Toàn quyền. */
export const VAI_CHON_DUOC: readonly PermissionCode[] = PERMISSION_CODES.filter((p) => p !== "SUPER_ADMIN");

export function laVaiChonDuoc(x: unknown): x is PermissionCode {
  return typeof x === "string" && (VAI_CHON_DUOC as readonly string[]).includes(x);
}

/** Đã quá hạn chưa, tính từ lần hoạt động gần nhất (ISO UTC). Ngày hỏng thì coi là đã hết hạn. */
export function daHetHan(lastSeenIso: string, nowMs: number): boolean {
  const t = Date.parse(lastSeenIso);
  if (Number.isNaN(t)) return true;
  return nowMs - t > HAN_XEM_NHU_VAI_PHUT * 60 * 1000;
}

/** Quyền có hiệu lực của phiên: đang xem như vai nào thì chỉ còn vai đó, không thì giữ quyền thật. */
export function quyenHieuLuc(real: readonly PermissionCode[], acting: PermissionCode | null): PermissionCode[] {
  if (acting === null) return [...real];
  // ADR-0180 Đ1.2 "đúng bộ quyền của mã được chọn": tài khoản Quản lý bán hàng thật luôn kèm Bán hàng (ADR-0169 Đ1), thiếu SALES thì không qua cổng văn phòng / đơn.
  return acting === "SALES_MANAGER" ? ["SALES_MANAGER", "SALES"] : [acting];
}

/**
 * Quyền THẬT của tài khoản đang gọi, dù phiên có đang "xem như" vai khác (ADR-0180 Đ3). Dùng cho mọi quyết định không được đổi theo vai đang đóng:
 * cổng bảo trì, chính sách bảo mật hai lớp (cách được dùng, bắt buộc hay không, yếu tố cuối).
 */
export function quyenThat(staff: { readonly permissions: readonly PermissionCode[]; readonly realPermissions?: readonly PermissionCode[] }): readonly PermissionCode[] {
  return staff.realPermissions ?? staff.permissions;
}
