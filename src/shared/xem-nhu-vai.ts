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
  return acting === null ? [...real] : [acting];
}
