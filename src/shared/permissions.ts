// BẢN ĐỒ QUYỀN → THAO TÁC (ADR-0007) — MỘT NƠI DUY NHẤT trong mã (P6). Logic thuần: server (kiểm quyền) và web/ (ẩn/hiện) cùng import.
// Mặc định từ chối (Điều 8.5): thao tác lạ hoặc ô không khai = không được. Quyền app KHÔNG phải vai trò hồ sơ (ADR-0005): vai trò
// hồ sơ (HDV, tài xế…) không bao giờ là điều kiện ở đây (R-N1-12).

export const PERMISSION_CODES = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN"] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const PERMISSION_LABEL: Record<PermissionCode, string> = {
  SALES: "Bán hàng",
  ACCOUNTING: "Kế toán",
  ADMIN: "Quản trị",
  FIELD: "Hướng dẫn viên",
  PARTNER: "Đối tác",
  SUPER_ADMIN: "Toàn quyền", // ADR-0018 điều 4: bỏ chữ Anh "Super Admin" lộ ra người dùng
  INTERN: "Thực tập", // ADR-0018 điều 4
};

export const isPermissionCode = (v: unknown): v is PermissionCode => typeof v === "string" && (PERMISSION_CODES as readonly string[]).includes(v);

/**
 * Phạm vi của một ô: `none` không được; `own` chỉ đơn của mình (`orders.staff_id`); `assigned` chỉ việc đang được giao (N2);
 * `ownOrAssigned` một trong hai; `any` tất cả.
 */
export type Scope = "none" | "own" | "assigned" | "ownOrAssigned" | "any";

/** Thứ tự cột của mỗi hàng ở MATRIX. `INTERN` thêm CUỐI (ADR-0018) để thứ tự các mảng quyền cũ không đổi. */
type Row = Record<PermissionCode, Scope>;
const row = (SALES: Scope, ACCOUNTING: Scope, ADMIN: Scope, FIELD: Scope, PARTNER: Scope, SUPER_ADMIN: Scope, INTERN: Scope): Row => ({
  SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN,
});

/**
 * Bản đồ ADR-0007 điều 1 (ADMIN làm được mọi thao tác) đã đổi theo ADR-0009, ADR-0014 (thêm PARTNER/SUPER_ADMIN, bốn thao tác mới), cộng 3 thao tác
 * Góp ý (`feedback.*` — mở rộng của module Góp ý, không thuộc bảng ADR-0007 gốc).
 * "Của mình" = người lập đơn (với `feedback.view` là người GỬI yêu cầu); "được giao" = người phụ trách đang mở của đơn
 * (do `dispatch` cung cấp hàm `isOrderHandler`, gốc lắp ráp `src/index.ts` tiêm vào `ctx.isAssigned` — ADR-0007 điều 4(b); route nào cần thì gọi và truyền kết quả vào
 * `can(who, op, { ownerId, assigned })`). Route KHÔNG truyền `assigned` thì ô `ownOrAssigned` chạy như `own`.
 * Có route dùng: order.create/history.view/modify/trip.edit/money.edit (module orders), dispatch.assign/claim/cancel (module dispatch),
 * feedback.submit/view/triage (module feedback), party.view/write/staff.write (module parties).
 * `SUPER_ADMIN` = `any` ở MỌI thao tác, không ngoại lệ (ADR-0014 điều 2) — kể cả các thao tác dưới đây chưa có route dùng.
 * Thao tác của N2/N3 (task.progress, payment.*, invoice.*) và ADR-0014 Phase C (dispatch.guides.view, dispatch.request) có mặt để test khoá bản
 * đồ; CHƯA có route dùng (thi công ở phiên sau). `order.cancel`/`order.money.edit` (FIELD) đã có route thật (`POST /api/orders/:id/handler-cancel`,
 * `POST /api/orders/:id/handler-money-edit`, module dispatch — ADR-0014 điều 11/6, Phase B; `order.money.edit` ghi qua "dòng điều chỉnh" chỉ-thêm
 * ở bảng `order_money_adjustment`, không sửa đè `order_service`/`order_item`/cột tiền của `orders`).
 * ADR-0018 giai đoạn 1: cột INTERN TẠM HẸP (lập đơn; xem/sửa đơn của mình); giai đoạn 2 đổi sang giá trị đích của đặc tả §5.
 */
export const MATRIX = {
  "order.view": row("any", "any", "any", "none", "own", "any", "own"), // xem đơn
  "money.view": row("any", "any", "any", "none", "own", "any", "own"), // xem tiền, bảng giá danh mục
  "order.history.view": row("ownOrAssigned", "any", "any", "none", "own", "any", "own"), // nhật ký/lịch sử sửa đơn (ADR-0009: cả người phụ trách)
  "contact.view": row("any", "any", "any", "assigned", "ownOrAssigned", "any", "own"), // tên/SĐT khách, điểm đón, giờ — PARTNER: own (đơn tự lập) + assigned (đơn được duyệt "xin nhận", ADR-0014 điều 10)
  "order.create": row("any", "none", "any", "none", "any", "any", "any"), // lập đơn (đơn mới luôn là của người lập)
  "order.modify": row("ownOrAssigned", "none", "any", "none", "own", "any", "own"), // sửa, xác nhận, huỷ đơn (ADR-0009: cả người phụ trách; ADR-0014: PARTNER của mình)
  "order.trip.edit": row("ownOrAssigned", "none", "any", "none", "none", "any", "none"), // thông tin vận hành sau xác nhận
  "task.progress": row("none", "none", "any", "assigned", "assigned", "any", "none"), // cập nhật trạng thái việc được giao — PARTNER chỉ có tác dụng khi đang phụ trách (ADR-0014 điều 10)
  "order.money.edit": row("own", "any", "any", "assigned", "none", "any", "none"), // số khách, dịch vụ, tiền sau xác nhận — ADR-0014 điều 6, route: POST /api/orders/:id/handler-money-edit (module dispatch, FIELD)
  "order.cancel": row("none", "none", "none", "assigned", "none", "any", "none"), // huỷ đơn đang phụ trách, lý do bắt buộc — ADR-0014 điều 11, route: POST /api/orders/:id/handler-cancel (module dispatch)
  "dispatch.assign": row("ownOrAssigned", "none", "any", "none", "none", "any", "none"), // đặt/đổi người phụ trách và nhiệm vụ (ADR-0009: cả người phụ trách hiện tại)
  "dispatch.claim": row("any", "none", "any", "none", "none", "any", "none"), // nhận phụ trách đơn CHƯA có người (ADR-0009; điều kiện "chưa có người" do dịch vụ của dispatch kiểm, không phải ô này)
  "dispatch.guides.view": row("none", "none", "none", "none", "any", "any", "none"), // danh sách hẹp hướng dẫn viên nội bộ — thao tác MỚI (ADR-0014 điều 9, chưa có route)
  "dispatch.request": row("none", "none", "none", "none", "any", "any", "none"), // xin nhận việc (chưa đổi người phụ trách) — thao tác MỚI (ADR-0014 điều 10, chưa có route)
  "payment.receive": row("own", "any", "any", "none", "none", "any", "none"), // ghi thu tiền
  "payment.refund": row("none", "any", "any", "none", "none", "any", "none"), // ghi hoàn tiền
  "invoice.request": row("own", "any", "any", "none", "none", "any", "none"), // ghi yêu cầu hoá đơn + thông tin xuất
  "invoice.issue": row("none", "any", "any", "none", "none", "any", "none"), // đánh dấu hoá đơn đã xuất
  "party.view": row("any", "any", "any", "none", "none", "any", "none"), // xem hồ sơ khách/đại lý
  "party.write": row("any", "any", "any", "none", "none", "any", "none"), // tạo/sửa hồ sơ KHÔNG gắn tài khoản (khách, đại lý, HDV/tài xế chưa có tài khoản) — ADR-0007, ADR-0013
  "party.staff.write": row("none", "none", "any", "none", "none", "any", "none"), // sửa hồ sơ GẮN TÀI KHOẢN (tên, liên hệ) — ADR-0013; ADMIN còn phải quản được tài khoản đó (cấp bậc, ADR-0014 điều 8: ctx.partyAccount)
  "admin.manage": row("none", "none", "any", "none", "none", "any", "none"), // tài khoản, quyền, địa điểm, danh mục, vai trò hồ sơ, gộp hồ sơ — ADR-0014 điều 8: "cấp dưới" nằm NGOÀI MATRIX (canManageAccount)
  "admin.manage.superadmin": row("none", "none", "none", "none", "none", "any", "none"), // gán/gỡ quyền SUPER_ADMIN của một tài khoản — thao tác MỚI (ADR-0014 điều 2/8)
  "feedback.submit": row("any", "any", "any", "any", "any", "any", "any"), // gửi báo lỗi/đề xuất (mọi tài khoản đăng nhập)
  "feedback.view": row("own", "own", "any", "own", "own", "any", "own"), // xem yêu cầu: người thường chỉ của mình (ownerId = người gửi)
  "feedback.triage": row("none", "none", "any", "none", "none", "any", "none"), // tiếp nhận: đổi trạng thái/người xử lý, ghi chú nội bộ, hàng đợi
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

/**
 * Tài khoản dùng được route đơn (`/api/orders*`): nhân sự văn phòng (ADR-0007) HOẶC bất kỳ quyền nào xem được đơn CỦA MÌNH (Đối tác — ADR-0014; Thực tập —
 * ADR-0018). Mỗi route đơn vẫn tự gọi `can()` để kiểm phạm vi. Router dùng cho access "orders". KHÔNG dùng để hiện/ẩn mục của nhân sự văn phòng (dùng `isOffice`).
 */
export const canAccessOrders = (who: PermissionHolder): boolean => isOffice(who) || can(who, "order.view", { ownerId: who.id });

/**
 * Tài khoản CÓ quyền Đối tác (`PARTNER`), kể cả khi kèm quyền khác — chủ dự án chốt 2026-09-26: "Có quyền Đối tác là áp". Đường quản trị cũ
 * (`POST /api/staff` không kèm vai, `PUT /api/staff/:id/permissions`) vẫn gán được PARTNER cùng quyền nội bộ mà luật LC-1 của mô hình vai không
 * chạy; nếu chỉ xét "mọi quyền đều là PARTNER" thì tài khoản lai lọt R2/R3 (người kiểm độc lập chứng minh 26/9: PARTNER+FIELD lập đơn 1đ → 201).
 * Chỉ xét MÃ QUYỀN, không xét vai hồ sơ (vai hồ sơ không bao giờ là điều kiện — `src/CLAUDE.md`).
 * Dùng ở máy chủ (`orders/price-guards.ts`: R2 đơn giá = giá danh mục, R3 trần giảm giá) và ở form lập đơn (khoá ô đơn giá, ô giảm giá).
 */
export const holdsPartner = (who: Pick<PermissionHolder, "permissions">): boolean => who.permissions.includes("PARTNER");
