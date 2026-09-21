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
 * Bản đồ ADR-0007 điều 1 (ADMIN làm được mọi thao tác) đã đổi theo ADR-0009. "Của mình" = người lập đơn; "được giao" = người phụ trách đang mở của đơn
 * (do `dispatch` cung cấp hàm, gốc lắp ráp tiêm vào `ctx.assigned` — ADR-0007 điều 4(b)). Chưa có nơi nào tiêm `assigned` thì ô `ownOrAssigned` chạy như `own`.
 * Thao tác của N2/N3 (task.progress, order.money.edit, payment.*, invoice.*) có mặt để test khoá bản đồ; chưa có route dùng.
 */
export const MATRIX = {
  "order.view": row("any", "any", "any", "none"), // xem đơn
  "money.view": row("any", "any", "any", "none"), // xem tiền, bảng giá danh mục
  "order.history.view": row("ownOrAssigned", "any", "any", "none"), // nhật ký/lịch sử sửa đơn (ADR-0009: cả người phụ trách)
  "contact.view": row("any", "any", "any", "assigned"), // tên/SĐT khách, điểm đón, giờ
  "order.create": row("any", "none", "any", "none"), // lập đơn (đơn mới luôn là của người lập)
  "order.modify": row("ownOrAssigned", "none", "any", "none"), // sửa, xác nhận, huỷ đơn (ADR-0009: cả người phụ trách)
  "order.trip.edit": row("ownOrAssigned", "none", "any", "none"), // thông tin vận hành sau xác nhận
  "task.progress": row("none", "none", "any", "assigned"), // cập nhật trạng thái việc được giao
  "order.money.edit": row("own", "any", "any", "none"), // số khách, dịch vụ, tiền sau xác nhận — ADR-0009 KHÔNG đổi (thuộc N3)
  "dispatch.assign": row("ownOrAssigned", "none", "any", "none"), // đặt/đổi người phụ trách và nhiệm vụ (ADR-0009: cả người phụ trách hiện tại)
  "dispatch.claim": row("any", "none", "any", "none"), // nhận phụ trách đơn CHƯA có người (ADR-0009; điều kiện "chưa có người" do dịch vụ của dispatch kiểm, không phải ô này)
  "payment.receive": row("own", "any", "any", "none"), // ghi thu tiền
  "payment.refund": row("none", "any", "any", "none"), // ghi hoàn tiền
  "invoice.request": row("own", "any", "any", "none"), // ghi yêu cầu hoá đơn + thông tin xuất
  "invoice.issue": row("none", "any", "any", "none"), // đánh dấu hoá đơn đã xuất
  "party.view": row("any", "any", "any", "none"), // xem hồ sơ khách/đại lý
  "party.write": row("any", "any", "any", "none"), // tạo/sửa hồ sơ khách/đại lý
  "admin.manage": row("none", "none", "any", "none"), // tài khoản, quyền, địa điểm, danh mục, vai trò hồ sơ, gộp hồ sơ
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
