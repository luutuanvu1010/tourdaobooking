// BẢN ĐỒ QUYỀN → THAO TÁC (ADR-0007) — MỘT NƠI DUY NHẤT trong mã (P6). Logic thuần: server (kiểm quyền) và web/ (ẩn/hiện) cùng import.
// Mặc định từ chối (Điều 8.5): thao tác lạ hoặc ô không khai = không được. Quyền app KHÔNG phải vai trò hồ sơ (ADR-0005): vai trò
// hồ sơ (HDV, tài xế…) không bao giờ là điều kiện ở đây (R-N1-12).

export const PERMISSION_CODES = ["SALES", "ACCOUNTING", "ADMIN", "FIELD"] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const PERMISSION_LABEL: Record<PermissionCode, string> = {
  SALES: "Bán hàng",
  ACCOUNTING: "Kế toán",
  ADMIN: "Quản trị",
  FIELD: "Thực hiện",
};

export const isPermissionCode = (v: unknown): v is PermissionCode => typeof v === "string" && (PERMISSION_CODES as readonly string[]).includes(v);

/**
 * Phạm vi của một ô: `none` không được; `own` chỉ đơn của mình (`orders.staff_id`); `assigned` chỉ việc đang được giao (N2);
 * `ownOrAssigned` một trong hai; `any` tất cả.
 */
export type Scope = "none" | "own" | "assigned" | "ownOrAssigned" | "any";

/** Thứ tự cột của mỗi hàng ở MATRIX. */
type Row = Record<PermissionCode, Scope>;
const row = (SALES: Scope, ACCOUNTING: Scope, ADMIN: Scope, FIELD: Scope): Row => ({ SALES, ACCOUNTING, ADMIN, FIELD });

/**
 * Bản đồ ADR-0007 điều 1 + 3 thao tác Góp ý (feedback.*) (ADMIN làm được mọi thao tác). "Của mình" = người lập đơn.
 * Thao tác của N2/N3 (task.progress, order.money.edit, dispatch.assign, payment.*, invoice.*) có mặt để test khoá bản đồ; chưa có route dùng.
 */
export const MATRIX = {
  "order.view": row("any", "any", "any", "none"), // xem đơn
  "money.view": row("any", "any", "any", "none"), // xem tiền, bảng giá danh mục
  "order.history.view": row("own", "any", "any", "none"), // nhật ký/lịch sử sửa đơn
  "contact.view": row("any", "any", "any", "assigned"), // tên/SĐT khách, điểm đón, giờ
  "order.create": row("any", "none", "any", "none"), // lập đơn (đơn mới luôn là của người lập)
  "order.modify": row("own", "none", "any", "none"), // sửa, xác nhận, huỷ đơn
  "order.trip.edit": row("ownOrAssigned", "none", "any", "none"), // thông tin vận hành sau xác nhận
  "task.progress": row("none", "none", "any", "assigned"), // cập nhật trạng thái việc được giao
  "order.money.edit": row("own", "any", "any", "none"), // số khách, dịch vụ, tiền sau xác nhận
  "dispatch.assign": row("own", "none", "any", "none"), // đặt/đổi người phụ trách và nhiệm vụ
  "payment.receive": row("own", "any", "any", "none"), // ghi thu tiền
  "payment.refund": row("none", "any", "any", "none"), // ghi hoàn tiền
  "invoice.request": row("own", "any", "any", "none"), // ghi yêu cầu hoá đơn + thông tin xuất
  "invoice.issue": row("none", "any", "any", "none"), // đánh dấu hoá đơn đã xuất
  "party.view": row("any", "any", "any", "none"), // xem hồ sơ khách/đại lý
  "party.write": row("any", "any", "any", "none"), // tạo/sửa hồ sơ khách/đại lý
  "admin.manage": row("none", "none", "any", "none"), // tài khoản, quyền, địa điểm, danh mục, vai trò hồ sơ, gộp hồ sơ
  "feedback.submit": row("any", "any", "any", "any"), // gửi báo lỗi/đề xuất (mọi tài khoản đăng nhập)
  "feedback.view": row("own", "own", "any", "own"), // xem yêu cầu: người thường chỉ của mình (ownerId = người gửi)
  "feedback.triage": row("none", "none", "any", "none"), // tiếp nhận: đổi trạng thái/người xử lý, ghi chú nội bộ, hàng đợi
} as const satisfies Record<string, Row>;

export type OperationCode = keyof typeof MATRIX;

export interface PermissionHolder {
  readonly id: string;
  readonly permissions: readonly PermissionCode[];
}

/** Ngữ cảnh của một thao tác: `ownerId` = người lập đơn; `assigned` = người dùng đang được giao (N2, do gốc lắp ráp tiêm). */
export interface OperationContext {
  readonly ownerId?: string;
  readonly assigned?: boolean;
}

export const hasPermission = (who: { readonly permissions: readonly PermissionCode[] }, code: PermissionCode): boolean => who.permissions.includes(code);

function allows(scope: Scope | undefined, whoId: string, ctx: OperationContext): boolean {
  const own = ctx.ownerId !== undefined && ctx.ownerId === whoId;
  switch (scope) {
    case "any":
      return true;
    case "own":
      return own;
    case "assigned":
      return ctx.assigned === true;
    case "ownOrAssigned":
      return own || ctx.assigned === true;
    default:
      return false;
  }
}

/** Người dùng được làm thao tác `op` không — hợp các ô của mọi quyền họ có. Thao tác lạ → false. */
export function can(who: PermissionHolder, op: OperationCode, ctx: OperationContext = {}): boolean {
  const cells = (MATRIX as Record<string, Row | undefined>)[op];
  if (!cells) return false;
  return who.permissions.some((p) => allows(cells[p], who.id, ctx));
}

/** Nhân sự "văn phòng": dùng được màn hình/API đơn (mọi quyền trừ chỉ-FIELD). Router dùng cho access "office". */
export const isOffice = (who: PermissionHolder): boolean => can(who, "order.view");
