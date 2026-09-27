// VAI VỚI TOUR ĐẢO → BỘ QUYỀN MẶC ĐỊNH (ADR-0018 điều 2–5) — NGUỒN DUY NHẤT trong mã; thuần, không I/O. Server (sinh quyền hiệu lực, kiểm luật
// cứng) và web/ (xem trước quyền khi gán vai) cùng import. Mã vai là DỮ LIỆU ở pty_role_type (migration 0024); src/roles-schema.test.ts giữ hai
// nơi khớp nhau. Vai KHÔNG phải cổng cho phép (ADR-0001 điều 4): vai chỉ đi vào đây để SINH bộ quyền; cổng vẫn là can() của permissions.ts.
// Đổi bảng này = đổi quyền của mọi tài khoản mang vai đó → chỉ qua chủ dự án duyệt + phát hành (ADR-0018 điều 2).
import { PERMISSION_CODES, PERMISSION_LABEL, isPermissionCode, type PermissionCode } from "./permissions.ts";

export const ROLE_CODES = [
  "DIRECTOR", "OPERATIONS_MANAGER", "GUIDE_INTERNAL", "SALES_STAFF", "INTERN", "ACCOUNTANT", "IT",
  "TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR",
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];
export type RoleGroup = "INTERNAL" | "EXTERNAL";
/** Nhận (phụ trách) đơn — đặc tả §4: chính / thay khi cần / chỉ đơn mình lập hoặc được cấp trên giao / không bao giờ. Giai đoạn 2 dùng cho luật người nhận. */
export type HandlesOrders = "primary" | "substitute" | "ownOrGiven" | "never";

export interface RoleDef {
  readonly name: string;
  readonly group: RoleGroup;
  readonly defaults: readonly PermissionCode[];
  readonly handles: HandlesOrders;
  /** LC-4: chỉ Toàn quyền được gán hoặc gỡ vai này. */
  readonly superAdminOnly: boolean;
}

export const ROLES: Readonly<Record<RoleCode, RoleDef>> = {
  // Giám đốc = Toàn quyền; kèm Quản trị để các chốt "còn ít nhất một quản trị viên" (đếm quyền ADMIN) vẫn đếm đúng (ADR-0018 điều 4).
  DIRECTOR: { name: "Giám đốc", group: "INTERNAL", defaults: ["ADMIN", "SUPER_ADMIN"], handles: "substitute", superAdminOnly: true },
  OPERATIONS_MANAGER: { name: "Điều hành chung", group: "INTERNAL", defaults: ["ADMIN"], handles: "substitute", superAdminOnly: true },
  GUIDE_INTERNAL: { name: "Hướng dẫn viên nội bộ", group: "INTERNAL", defaults: ["FIELD"], handles: "primary", superAdminOnly: false },
  SALES_STAFF: { name: "Nhân viên kinh doanh", group: "INTERNAL", defaults: ["SALES"], handles: "substitute", superAdminOnly: false },
  INTERN: { name: "Thực tập sinh", group: "INTERNAL", defaults: ["INTERN"], handles: "ownOrGiven", superAdminOnly: false },
  ACCOUNTANT: { name: "Kế toán", group: "INTERNAL", defaults: ["ACCOUNTING"], handles: "ownOrGiven", superAdminOnly: false },
  // ADR-0044: vai hiện ra của tài khoản chủ (Toàn quyền là vai ẩn — người khác thấy "IT"); cùng bộ quyền Giám đốc, chỉ Toàn quyền gán.
  IT: { name: "IT", group: "INTERNAL", defaults: ["ADMIN", "SUPER_ADMIN"], handles: "substitute", superAdminOnly: true },
  TRAVEL_AGENCY: { name: "Công ty lữ hành", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  GUIDE_FREELANCE: { name: "Hướng dẫn viên độc lập", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  HOTEL_RECEPTION: { name: "Lễ tân khách sạn", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  TAXI_DRIVER: { name: "Tài xế taxi", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  COLLABORATOR: { name: "Cộng tác viên", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
};

export const ROLE_GROUP_LABEL: Readonly<Record<RoleGroup, string>> = { INTERNAL: "Nội bộ", EXTERNAL: "Bên ngoài" };
export const isRoleCode = (v: unknown): v is RoleCode => typeof v === "string" && (ROLE_CODES as readonly string[]).includes(v);

/** LC-1: tài khoản mang vai bên ngoài chỉ giữ các quyền này. */
export const EXTERNAL_ALLOWED: readonly PermissionCode[] = ["PARTNER"];
/** LC-4: quyền chỉ Toàn quyền được cấp hoặc gỡ. */
export const SUPER_ADMIN_GRANTED: readonly PermissionCode[] = ["ADMIN", "SUPER_ADMIN"];

/** Nhóm của một tập vai: "NONE" khi chưa có vai mô hình mới; "MIXED" khi lẫn nội bộ và bên ngoài (LC-3 cấm). */
export function groupOf(roles: readonly RoleCode[]): RoleGroup | "NONE" | "MIXED" {
  const groups = new Set(roles.map((r) => ROLES[r].group));
  if (groups.size === 0) return "NONE";
  return groups.size > 1 ? "MIXED" : [...groups][0]!;
}

/** Hợp bộ quyền mặc định của các vai, theo thứ tự chuẩn PERMISSION_CODES. */
export function defaultPermissions(roles: readonly RoleCode[]): PermissionCode[] {
  const set = new Set<PermissionCode>(roles.flatMap((r) => ROLES[r].defaults));
  return PERMISSION_CODES.filter((p) => set.has(p));
}

export interface Adjustments {
  readonly adds: readonly PermissionCode[];
  readonly removes: readonly PermissionCode[];
}

/**
 * Quyền hiệu lực = mặc định của vai + cộng tay − bớt tay, rồi lọc LC-1 (nhóm bên ngoài chỉ giữ EXTERNAL_ALLOWED). `dropped` = quyền bị luật cứng gạt —
 * lưới phòng thủ: đầu vào đã qua roleAssignmentProblem thì rỗng.
 */
export function effectivePermissions(roles: readonly RoleCode[], adj: Adjustments): { permissions: PermissionCode[]; dropped: PermissionCode[] } {
  const want = new Set<PermissionCode>([...defaultPermissions(roles), ...adj.adds]);
  for (const p of adj.removes) want.delete(p);
  const ordered = PERMISSION_CODES.filter((p) => want.has(p));
  if (groupOf(roles) !== "EXTERNAL") return { permissions: ordered, dropped: [] };
  return { permissions: ordered.filter((p) => EXTERNAL_ALLOWED.includes(p)), dropped: ordered.filter((p) => !EXTERNAL_ALLOWED.includes(p)) };
}

export interface RoleAssignment extends Adjustments {
  readonly roles: readonly RoleCode[];
  /** Bắt buộc khi có cộng/bớt tay (LC-6: nhật ký ghi lý do); null khi không chỉnh tay. */
  readonly reason: string | null;
}

/** Mảng mã hợp lệ, không trùng → sắp theo thứ tự chuẩn; `undefined` → mảng rỗng; sai dạng → null. */
function listOf<T extends string>(v: unknown, ok: (x: unknown) => x is T, order: readonly T[]): T[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every(ok) || new Set(v).size !== v.length) return null;
  return order.filter((x) => (v as unknown[]).includes(x));
}

/** Đọc thân PUT /api/staff/:id/roles (và phần vai của POST /api/staff). Thuần — không tin thứ tự hay khoảng trắng của trình duyệt. */
export function parseRoleAssignment(body: unknown): { ok: true; value: RoleAssignment } | { ok: false; message: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const roles = listOf(b.roles, isRoleCode, ROLE_CODES);
  if (!roles || roles.length === 0) return { ok: false, message: "Chọn ít nhất một vai (mỗi vai một lần)." };
  const adds = listOf(b.adds, isPermissionCode, PERMISSION_CODES);
  const removes = listOf(b.removes, isPermissionCode, PERMISSION_CODES);
  if (!adds || !removes) return { ok: false, message: "Danh sách quyền cộng/bớt tay không hợp lệ." };
  if (adds.some((p) => removes.includes(p))) return { ok: false, message: "Một quyền không thể vừa cộng vừa bớt." };
  const adjusted = adds.length > 0 || removes.length > 0;
  const reason = typeof b.reason === "string" ? b.reason.trim().replace(/\s+/g, " ") : "";
  if (adjusted && !reason) return { ok: false, message: "Cần ghi lý do khi chỉnh quyền tay." };
  if (reason.length > 200) return { ok: false, message: "Lý do tối đa 200 ký tự." };
  return { ok: true, value: { roles, adds, removes, reason: adjusted ? reason : null } };
}

export interface RoleProblem {
  /** true → 403 (thiếu thẩm quyền); false → 400 (đầu vào vi phạm luật). */
  readonly forbidden: boolean;
  readonly message: string;
}

/** LC-4 cho MỌI đường đổi quyền (gán vai, route cũ PUT …/permissions, tạo tài khoản): chỉ Toàn quyền cấp hoặc gỡ Quản trị/Toàn quyền. */
export function highPermissionProblem(actorIsSuper: boolean, current: readonly PermissionCode[], next: readonly PermissionCode[]): RoleProblem | null {
  if (actorIsSuper) return null;
  const changed = SUPER_ADMIN_GRANTED.some((p) => current.includes(p) !== next.includes(p));
  return changed ? { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị." } : null;
}

/**
 * LC-3 + LC-1 (cộng tay) + LC-4 + "còn ít nhất một quyền" cho MỘT lần gán vai. LC-4 còn chặn khi THAY ĐỔI dòng chỉnh tay Quản trị/Toàn quyền dù
 * quyền hiệu lực hôm nay chưa đổi (chỉnh tay "ngủ", phát tác khi vai đổi sau này) — chỉ Toàn quyền được thêm/bớt một dòng như vậy; giữ NGUYÊN một
 * dòng đã có (không sửa) vẫn được phép (giao diện tự điền lại chỉnh tay hiện có). Máy chủ gọi TRƯỚC khi dựng câu lệnh.
 */
export function roleAssignmentProblem(a: {
  actorIsSuper: boolean;
  currentRoles: readonly RoleCode[];
  currentPermissions: readonly PermissionCode[];
  currentAdjustments: Adjustments;
  next: RoleAssignment;
}): RoleProblem | null {
  const group = groupOf(a.next.roles);
  if (group === "MIXED") return { forbidden: false, message: "Một tài khoản không giữ cùng lúc vai nội bộ và vai bên ngoài." };
  if (group === "EXTERNAL" && a.next.adds.some((p) => !EXTERNAL_ALLOWED.includes(p))) {
    return { forbidden: false, message: "Tài khoản bên ngoài chỉ giữ quyền Đối tác — bỏ phần cộng tay quyền khác." };
  }
  if (!a.actorIsSuper) {
    const touched = [...a.next.roles.filter((r) => !a.currentRoles.includes(r)), ...a.currentRoles.filter((r) => !a.next.roles.includes(r))];
    if (touched.some((r) => ROLES[r].superAdminOnly)) return { forbidden: true, message: "Chỉ người phụ trách hệ thống mới gán hoặc gỡ vai Giám đốc, Điều hành chung." };
    // I-1 (kiểm độc lập vòng 1): chặn cả khi chỉnh tay Quản trị/Toàn quyền "ngủ" — quyền hiệu lực hôm nay không đổi (vai hiện tại đã có sẵn hoặc
    // chưa từng cần đến quyền đó) nhưng dòng chỉnh tay sẽ phát tác khi vai đổi sau này. So danh sách chỉnh tay MUỐN với danh sách chỉnh tay ĐANG CÓ,
    // không so quyền hiệu lực ròng (highPermissionProblem ở dưới lo phần đó).
    const adjustmentChanged = SUPER_ADMIN_GRANTED.some(
      (p) => a.next.adds.includes(p) !== a.currentAdjustments.adds.includes(p) || a.next.removes.includes(p) !== a.currentAdjustments.removes.includes(p),
    );
    if (adjustmentChanged) return { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị." };
  }
  const next = effectivePermissions(a.next.roles, a.next).permissions;
  const high = highPermissionProblem(a.actorIsSuper, a.currentPermissions, next);
  if (high) return high;
  if (next.length === 0) return { forbidden: false, message: "Tài khoản phải còn ít nhất một quyền." };
  return null;
}

/** Nhãn lời thường — dùng cho nhật ký và giao diện. */
export const rolesLabel = (roles: readonly RoleCode[]): string => (roles.length ? roles.map((r) => ROLES[r].name).join(", ") : "chưa gán vai");
export const permissionsLabel = (list: readonly PermissionCode[]): string => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "không có quyền");
