// VAI VỚI TOUR ĐẢO → BỘ QUYỀN MẶC ĐỊNH (ADR-0018 điều 2–5) — NGUỒN DUY NHẤT trong mã; thuần, không I/O. Server (sinh quyền hiệu lực, kiểm luật
// cứng) và web/ (xem trước quyền khi gán vai) cùng import. Mã vai là DỮ LIỆU ở pty_role_type (migration 0024); src/roles-schema.test.ts giữ hai
// nơi khớp nhau. Vai KHÔNG phải cổng cho phép (ADR-0001 điều 4): vai chỉ đi vào đây để SINH bộ quyền; cổng vẫn là can() của permissions.ts.
// Đổi bảng này = đổi quyền của mọi tài khoản mang vai đó → chỉ qua chủ dự án duyệt + phát hành (ADR-0018 điều 2).
import { PERMISSION_CODES, PERMISSION_LABEL, isExternalPermission, isPermissionCode, type PermissionCode } from "./permissions.ts";

export const ROLE_CODES = [
  "DIRECTOR", "OPERATIONS_MANAGER", "GUIDE_INTERNAL", "SALES_STAFF", "INTERN", "ACCOUNTANT", "IT", "DRIVER_INTERNAL", "HR_STAFF",
  "TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR", "DRIVER_EXTERNAL",
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
  // ADR-0072 điều 1 (sửa ADR-0018 điều 4): Giám đốc = Quản trị (việc kinh doanh), KHÔNG Toàn quyền (việc kỹ thuật); vẫn chỉ Toàn quyền gán / gỡ vai. Cần thêm thì
  // Toàn quyền cộng tay có lý do (Kế toán, hoặc Toàn quyền). Quyền tính lúc gán vai rồi lưu: đổi dòng này KHÔNG tự bớt quyền người đang giữ vai (điều 3).
  DIRECTOR: { name: "Giám đốc", group: "INTERNAL", defaults: ["ADMIN"], handles: "substitute", superAdminOnly: true },
  OPERATIONS_MANAGER: { name: "Điều hành chung", group: "INTERNAL", defaults: ["ADMIN"], handles: "substitute", superAdminOnly: true },
  GUIDE_INTERNAL: { name: "Hướng dẫn viên nội bộ", group: "INTERNAL", defaults: ["FIELD"], handles: "primary", superAdminOnly: false },
  SALES_STAFF: { name: "Nhân viên kinh doanh", group: "INTERNAL", defaults: ["SALES"], handles: "substitute", superAdminOnly: false },
  INTERN: { name: "Thực tập sinh", group: "INTERNAL", defaults: ["INTERN"], handles: "ownOrGiven", superAdminOnly: false },
  ACCOUNTANT: { name: "Kế toán", group: "INTERNAL", defaults: ["ACCOUNTING"], handles: "ownOrGiven", superAdminOnly: false },
  // ADR-0044: vai hiện ra của tài khoản chủ (Toàn quyền là vai ẩn — người khác thấy "IT"); Quản trị + Toàn quyền (ADR-0072 điều 2: giữ nguyên), chỉ Toàn quyền gán.
  IT: { name: "IT", group: "INTERNAL", defaults: ["ADMIN", "SUPER_ADMIN"], handles: "substitute", superAdminOnly: true },
  // ADR-0040 D3 (Ruling R1, R12): tài xế là NHÂN VIÊN có tài khoản; không nhận đơn (không phải người phụ trách đơn). Mã vai hồ sơ cũ DRIVER (nhóm OTHER,
  // đã ngưng) KHÔNG phải vai này — không bao giờ sinh quyền. Quản trị gán được như "Hướng dẫn viên nội bộ".
  DRIVER_INTERNAL: { name: "Tài xế công ty", group: "INTERNAL", defaults: ["DRIVER"], handles: "never", superAdminOnly: false },
  // ADR-0071 điều 1a, 1d: Hành chính nhân sự — nhập MỌI tài khoản (nội bộ, đối tác, tài xế đối tác), không nhận đơn. CHỈ Toàn quyền gán (vai này tạo được mọi
  // tài khoản), như Giám đốc / Điều hành chung.
  HR_STAFF: { name: "Hành chính nhân sự", group: "INTERNAL", defaults: ["HR"], handles: "never", superAdminOnly: true },
  TRAVEL_AGENCY: { name: "Công ty lữ hành", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  GUIDE_FREELANCE: { name: "Hướng dẫn viên độc lập", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  HOTEL_RECEPTION: { name: "Lễ tân khách sạn", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  TAXI_DRIVER: { name: "Tài xế taxi (giới thiệu khách)", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  COLLABORATOR: { name: "Cộng tác viên", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  // ADR-0048 D2: tài xế của nhà xe đối tác — người lái chuyến, KHÔNG phải bên đặt (ADR-0018 điều 9 sửa bởi ADR-0048): sinh DRIVER_PARTNER, không PARTNER.
  // Không đi cùng vai bên ngoài khác (LC-1b — roleAssignmentProblem). Quản trị gán được.
  DRIVER_EXTERNAL: { name: "Tài xế đối tác", group: "EXTERNAL", defaults: ["DRIVER_PARTNER"], handles: "never", superAdminOnly: false },
};

export const ROLE_GROUP_LABEL: Readonly<Record<RoleGroup, string>> = { INTERNAL: "Nội bộ", EXTERNAL: "Bên ngoài" };
export const isRoleCode = (v: unknown): v is RoleCode => typeof v === "string" && (ROLE_CODES as readonly string[]).includes(v);

/** LC-4: quyền chỉ Toàn quyền được cấp hoặc gỡ — ADR-0071 điều 1d thêm HR (Nhân sự). */
export const SUPER_ADMIN_GRANTED: readonly PermissionCode[] = ["ADMIN", "SUPER_ADMIN", "HR"];

/**
 * ADR-0014 điều 8 (đính chính trực tiếp của chủ dự án) + ADR-0071 điều 1c: người giữ `ADMIN` hoặc `HR` chỉ quản lý được tài khoản "cấp dưới" — KHÔNG giữ
 * `ADMIN`, `SUPER_ADMIN` hay `HR` (Quản trị không sửa HCNS; HCNS không sửa HCNS khác, không sửa Quản trị). `SUPER_ADMIN` quản lý được mọi tài khoản. Không
 * phải một ô của MATRIX (Scope không diễn đạt được "so cấp bậc mục tiêu"). MỘT nguồn cho máy chủ (`accounts`, `staff`) và giao diện (web/staff.ts).
 */
export function canManageAccount(actor: readonly PermissionCode[], target: readonly PermissionCode[]): boolean {
  if (actor.includes("SUPER_ADMIN")) return true;
  if (!actor.includes("ADMIN") && !actor.includes("HR")) return false;
  return !target.some((p) => SUPER_ADMIN_GRANTED.includes(p));
}

/** Lời 403 khi gán / gỡ vai chỉ Toàn quyền được gán — liệt kê đúng các vai đó (đọc từ ROLES, không chép tay). */
const VAI_QUAN_LY_MESSAGE = `Chỉ người phụ trách hệ thống mới gán hoặc gỡ vai ${ROLE_CODES.filter((r) => ROLES[r].superAdminOnly).map((r) => ROLES[r].name).join(", ")}.`;
/** Lời 403 khi cấp / gỡ quyền chỉ Toàn quyền được cấp: nhắc Quản trị khi đụng Quản trị/Toàn quyền, nhắc Nhân sự khi chỉ đụng Nhân sự. */
const capCaoMessage = (changed: readonly PermissionCode[]): string =>
  `Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền ${changed.some((p) => p !== "HR") ? "Quản trị" : PERMISSION_LABEL.HR}.`;

/**
 * ADR-0048 B2.2 (Q4 = (a)): vai "Tài xế đối tác" đi cùng một vai BÊN NGOÀI khác (mọi vai bên ngoài khác sinh PARTNER) — một người chọn một. MỘT nguồn cho
 * roleAssignmentProblem (máy chủ, 400) và web/role-picker.ts (khoá chéo ô vai — Task B1). Vai nội bộ + bên ngoài là việc của LC-3 (groupOf → MIXED).
 */
export const vaiTaiXeDoiTacXungDot = (roles: readonly RoleCode[]): boolean =>
  roles.includes("DRIVER_EXTERNAL") && roles.some((r) => r !== "DRIVER_EXTERNAL" && ROLES[r].group === "EXTERNAL");

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
 * Quyền hiệu lực = mặc định của vai + cộng tay − bớt tay, rồi lọc LC-1 (nhóm bên ngoài chỉ giữ EXTERNAL_PERMISSIONS — ADR-0048 B2.1). `dropped` = quyền bị luật cứng gạt —
 * lưới phòng thủ: đầu vào đã qua roleAssignmentProblem thì rỗng.
 */
export function effectivePermissions(roles: readonly RoleCode[], adj: Adjustments): { permissions: PermissionCode[]; dropped: PermissionCode[] } {
  const want = new Set<PermissionCode>([...defaultPermissions(roles), ...adj.adds]);
  for (const p of adj.removes) want.delete(p);
  const ordered = PERMISSION_CODES.filter((p) => want.has(p));
  if (groupOf(roles) !== "EXTERNAL") return { permissions: ordered, dropped: [] };
  return { permissions: ordered.filter(isExternalPermission), dropped: ordered.filter((p) => !isExternalPermission(p)) };
}

/**
 * Chủ dự án 2026-10-01 (giữ luật "không tự đổi quyền của chính mình" — `checkAccountChange` ở máy chủ): màn Sửa tài khoản hỏi hàm này TRƯỚC khi lưu
 * tài khoản của chính người dùng, để báo rõ và không lưu gì (trước đây tên/SĐT lưu xong rồi vai mới bị máy chủ từ chối). Đổi vai mà quyền giữ nguyên
 * (ví dụ chuyển sang vai IT — ADR-0044) vẫn được. Máy chủ vẫn là chốt chặn.
 */
export function tuDoiQuyenCuaMinh(current: readonly PermissionCode[], next: Adjustments & { readonly roles: readonly RoleCode[] }): boolean {
  const sau = effectivePermissions(next.roles, next).permissions;
  return sau.length !== current.length || sau.some((p) => !current.includes(p));
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

/** LC-4 cho MỌI đường đổi quyền (gán vai, route cũ PUT …/permissions, tạo tài khoản): chỉ Toàn quyền cấp hoặc gỡ Quản trị/Toàn quyền/Nhân sự. */
export function highPermissionProblem(actorIsSuper: boolean, current: readonly PermissionCode[], next: readonly PermissionCode[]): RoleProblem | null {
  if (actorIsSuper) return null;
  const changed = SUPER_ADMIN_GRANTED.filter((p) => current.includes(p) !== next.includes(p));
  return changed.length ? { forbidden: true, message: capCaoMessage(changed) } : null;
}

/**
 * LC-3 + vai Tài xế đối tác đứng riêng (ADR-0048) + LC-1 (cộng tay) + LC-4 + LC-1b + "còn ít nhất một quyền" cho MỘT lần gán vai. LC-4 còn chặn khi THAY ĐỔI dòng chỉnh tay Quản trị/Toàn quyền dù
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
  // ADR-0048 B2.2 (Q4 = (a)): vai "Tài xế đối tác" không đi cùng vai bên ngoài khác (mọi vai bên ngoài khác sinh PARTNER) — báo câu theo VAI trước khi
  // LC-1b (taiKhoanLaiProblem ở dưới) báo câu chung theo quyền.
  if (vaiTaiXeDoiTacXungDot(a.next.roles)) {
    return { forbidden: false, message: "Vai Tài xế đối tác không đi cùng vai bên ngoài khác — một người chọn một: đối tác đặt đơn hoặc tài xế đối tác." };
  }
  if (group === "EXTERNAL" && a.next.adds.some((p) => !isExternalPermission(p))) {
    return { forbidden: false, message: "Tài khoản bên ngoài chỉ giữ quyền bên ngoài (Đối tác hoặc Tài xế đối tác) — bỏ phần cộng tay quyền khác." };
  }
  if (!a.actorIsSuper) {
    const touched = [...a.next.roles.filter((r) => !a.currentRoles.includes(r)), ...a.currentRoles.filter((r) => !a.next.roles.includes(r))];
    if (touched.some((r) => ROLES[r].superAdminOnly)) return { forbidden: true, message: VAI_QUAN_LY_MESSAGE };
    // I-1 (kiểm độc lập vòng 1): chặn cả khi chỉnh tay Quản trị/Toàn quyền "ngủ" — quyền hiệu lực hôm nay không đổi (vai hiện tại đã có sẵn hoặc
    // chưa từng cần đến quyền đó) nhưng dòng chỉnh tay sẽ phát tác khi vai đổi sau này. So danh sách chỉnh tay MUỐN với danh sách chỉnh tay ĐANG CÓ,
    // không so quyền hiệu lực ròng (highPermissionProblem ở dưới lo phần đó).
    const adjustmentChanged = SUPER_ADMIN_GRANTED.filter(
      (p) => a.next.adds.includes(p) !== a.currentAdjustments.adds.includes(p) || a.next.removes.includes(p) !== a.currentAdjustments.removes.includes(p),
    );
    if (adjustmentChanged.length) return { forbidden: true, message: capCaoMessage(adjustmentChanged) };
  }
  const next = effectivePermissions(a.next.roles, a.next).permissions;
  const high = highPermissionProblem(a.actorIsSuper, a.currentPermissions, next);
  if (high) return high;
  const lai = taiKhoanLaiProblem(next);
  if (lai) return lai;
  if (next.length === 0) return { forbidden: false, message: "Tài khoản phải còn ít nhất một quyền." };
  return null;
}

/**
 * LC-1b (ADR-0048 B2.2, Q4 = (a)) — MỘT hàm thuần cho MỌI đường ghi quyền (gán vai, POST /api/staff không vai, PUT /api/staff/:id/permissions): tài khoản giữ
 * "Tài xế đối tác" (DRIVER_PARTNER) không giữ quyền nào khác, cả Đối tác lẫn quyền nội bộ. Lớp CSDL: trigger lc1b_stf_permission_driver_partner_alone
 * (migration *_tai_xe_doi_tac). Máy chủ gọi TRƯỚC khi dựng câu lệnh (400 câu dễ hiểu thay vì lỗi trigger).
 */
export function taiKhoanLaiProblem(perms: readonly PermissionCode[]): RoleProblem | null {
  return perms.includes("DRIVER_PARTNER") && perms.length > 1 ? { forbidden: false, message: "Tài khoản Tài xế đối tác không giữ thêm quyền nào khác." } : null;
}

/**
 * ADR-0083 điều 1b — MỘT hàm thuần cho MỌI đường ghi quyền KHÔNG qua vai (PUT /api/staff/:id/permissions, POST /api/staff không vai): tập quyền không vừa có
 * quyền bên ngoài (isExternalPermission: Đối tác, Tài xế đối tác) vừa có quyền nội bộ. Đường gán vai đã có LC-3/LC-1 riêng (roleAssignmentProblem). Máy chủ
 * gọi SAU taiKhoanLaiProblem (LC-1b giữ câu riêng của nó). Không sửa dữ liệu đã có (điều 1c).
 */
export function laiNoiBoBenNgoaiProblem(perms: readonly PermissionCode[]): RoleProblem | null {
  return perms.some(isExternalPermission) && perms.some((p) => !isExternalPermission(p))
    ? { forbidden: false, message: "Một tài khoản không giữ cùng lúc quyền nội bộ và quyền bên ngoài (Đối tác, Tài xế đối tác) — chọn một phía." }
    : null;
}

/** Nhãn lời thường — dùng cho nhật ký và giao diện. */
export const rolesLabel = (roles: readonly RoleCode[]): string => (roles.length ? roles.map((r) => ROLES[r].name).join(", ") : "chưa gán vai");
export const permissionsLabel = (list: readonly PermissionCode[]): string => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "không có quyền");
