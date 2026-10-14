// Luật thuần của quản lý tài khoản nhân viên, không I/O.
import { isExternalPermission, type PermissionCode } from "../../shared/permissions.ts";
import { isValidPin } from "./phone.ts";

import { ROLES, canManageAccount, type RoleCode } from "../../shared/roles.ts";

/**
 * Cấp bậc quản lý tài khoản (ADR-0014 điều 8 + ADR-0071 điều 1c) — luật ở `src/shared/roles.ts` (MỘT nguồn cho máy chủ và giao diện). Dùng cho:
 * mở/đình chỉ/sửa/khôi phục tài khoản, đặt lại mã/mở khoá, đổi tập quyền (`accounts/index.ts`).
 */
export { canManageAccount };

/** PIN quá dễ đoán: cả 6 số giống nhau hoặc chạy liên tiếp tăng/giảm, kể cả cuộn vòng (000000, 123456, 654321, 890123…). */
export function isWeakPin(pin: string): boolean {
  return /^(\d)\1{5}$/.test(pin) || "01234567890123456789".includes(pin) || "98765432109876543210".includes(pin);
}

/** PIN mới khi KHÔNG có PIN cũ để so (đặt PIN bằng Face ID, ADR-0016 điều 2b): vẫn chặn PIN sai dạng và PIN dễ đoán. */
export function validateFreshPin(pin: unknown): string | null {
  if (!isValidPin(pin)) return "PIN mới phải gồm đúng 6 chữ số.";
  if (isWeakPin(pin)) return "PIN mới quá dễ đoán (ví dụ 123456, 111111). Hãy chọn PIN khác.";
  return null;
}

/** Sinh PIN 6 chữ số ngẫu nhiên có kiểm soát (rejection sampling, không thiên lệch), bỏ PIN yếu. `random` để test được. */
export function generatePin(random: (max: number) => number = randomBelow): string {
  for (;;) {
    const pin = String(random(1_000_000)).padStart(6, "0");
    if (!isWeakPin(pin)) return pin;
  }
}

function randomBelow(max: number): number {
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Kiểm tra một thay đổi tài khoản do `actorId` thực hiện. Trả thông báo lỗi, hoặc null nếu hợp lệ.
 * - Không tự ngưng hoặc tự đổi quyền của chính mình (tránh tự khoá).
 * - Không để hệ thống hết quản trị viên hoạt động (không còn ai vào bảng Admin để sửa) — quản trị viên = tài khoản đang hoạt động có quyền ADMIN.
 */
export function checkAccountChange(
  actorId: string,
  target: { id: string; permissions: readonly PermissionCode[]; active: boolean },
  next: { permissions?: readonly PermissionCode[]; active?: boolean },
  activeAdminCount: number,
): string | null {
  const nextPermissions = next.permissions ?? target.permissions;
  const nextActive = next.active ?? target.active;
  const permissionsChanged = next.permissions !== undefined && !sameSet(next.permissions, target.permissions);
  const losesAdmin = target.permissions.includes("ADMIN") && target.active && (!nextPermissions.includes("ADMIN") || !nextActive);
  if (target.id === actorId && (nextActive === false || permissionsChanged)) {
    return "Không thể tự ngưng hoặc tự đổi quyền của chính mình. Hãy nhờ một quản trị viên khác.";
  }
  if (losesAdmin && activeAdminCount <= 1) return "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.";
  return null;
}

/**
 * ADR-0013 điều 2 + ADR-0014 điều 8: hồ sơ gắn tài khoản `target` (null = không gắn) — người gọi có quản được tài khoản đó không.
 * Cùng luật với `mayManage` ở màn Nhân viên: chính mình, hoặc `canManageAccount`. Chỉ là KẾT LUẬN cấp bậc; ô `party.staff.write`
 * vẫn phải được route hỏi bằng `can()` (SALES tự mình → manageable nhưng ô = none).
 */
export function partyAccountVerdict(
  actor: { id: string; permissions: readonly PermissionCode[] },
  target: { id: string; permissions: readonly PermissionCode[] } | null,
): { linked: false } | { linked: true; manageable: boolean } {
  if (!target) return { linked: false };
  return { linked: true, manageable: actor.id === target.id || canManageAccount(actor.permissions, target.permissions) };
}

/**
 * ADR-0117 lần 1, điều 4 — vế 3 của luật «hồ sơ nội bộ»: tài khoản mang ít nhất một quyền KHÔNG thuộc nhóm bên ngoài (đọc hằng EXTERNAL_PERMISSIONS qua
 * isExternalPermission — không tập thứ hai). Tài khoản Đối tác / Tài xế đối tác thuần → false (đối tác thuần vẫn mang được loại đối tác).
 */
export const coQuyenNoiBo = (perms: readonly PermissionCode[]): boolean => perms.some((p) => !isExternalPermission(p));

/** Câu chặn chiều 2 — KHÔNG nêu tên loại hay nhãn (Nhân sự không giữ party.view nhận đúng câu này — ADR-0117 điều 4). */
export const KHONG_NHAN_VAI_NOI_BO = "Hồ sơ này không nhận thêm vai nội bộ vào lúc này.";

/**
 * ADR-0117 điều 4, chiều 2: hồ sơ đang mang loại đối tác được hưởng (`nhanDoiTac`) không nhận vai nhóm INTERNAL hay quyền nội bộ. Máy chủ gọi TRƯỚC mọi
 * lô ghi (PUT /api/staff/:id/roles chạy hai lô ở nhánh gỡ ADMIN — trigger chỉ là lưới cuối). null = được.
 */
export function moNoiBoChoHoSoCoNhanProblem(v: { nhanDoiTac: boolean; vaiTiep: readonly RoleCode[]; quyenTiep: readonly PermissionCode[] }): string | null {
  if (!v.nhanDoiTac) return null;
  return v.vaiTiep.some((c) => ROLES[c].group === "INTERNAL") || coQuyenNoiBo(v.quyenTiep) ? KHONG_NHAN_VAI_NOI_BO : null;
}
