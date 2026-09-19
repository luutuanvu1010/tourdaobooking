export interface Staff {
  id: string;
  fullName: string;
  phone: string;
  role: "sales" | "admin";
}

export type OrderStatus = "draft" | "confirmed" | "cancelled";
export type DepositMethod = "cash" | "bank_transfer" | "other";

export interface OrderItem {
  id: string;
  catalogCode: string | null;
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderCode: string;
  staffId: string;
  staffName: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  subtotal: number;
  discount: number;
  total: number;
  depositAmount: number;
  depositMethod: DepositMethod | null;
  remainingAmount: number;
  paymentNote: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  items: OrderItem[];
}

export type OrderSummary = Pick<
  Order,
  "id" | "orderCode" | "status" | "customerName" | "customerPhone" | "total" | "remainingAmount" | "staffName" | "createdAt"
>;

export type AuditAction =
  | "created" | "updated" | "confirmed" | "cancelled" | "exported_png" | "exported_pdf"
  | "staff_created" | "staff_updated" | "staff_suspended" | "staff_reactivated" | "staff_role_changed"
  | "pin_reset" | "pin_changed" | "login_unlocked" | "staff_synced"
  | "catalog_synced" | "catalog_overridden" | "catalog_override_cleared" | "catalog_hidden" | "catalog_unhidden";

export interface AuditEntry {
  action: AuditAction;
  staffName: string;
  at: string;
  detail: string | null;
}

export interface AuditRecord extends AuditEntry {
  id: string;
  targetType: "order" | "staff" | "catalog" | null;
  targetId: string | null;
  targetLabel: string | null;
  orderId: string | null;
}

export interface StaffAccount extends Staff {
  active: boolean;
  createdAt: string;
  locked: boolean;
}

export interface SheetCandidate {
  row: number;
  name: string;
  phone: string;
  status: "new" | "same" | "name_differs";
  currentName: string | null;
}

/** Dữ liệu client gửi lên: chỉ các trường nhập, không có tổng tiền — server tự tính. */
export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string;
  items: { catalogCode: string | null; description: string; detail: string; quantity: number; unitPrice: number }[];
  discount: number;
  depositAmount: number;
  depositMethod: DepositMethod | null;
  paymentNote: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Chỉ cho phép quay lại đường dẫn nội bộ (chặn open redirect). */
export function safeNext(raw: string | null): string {
  return raw && /^\/(?!\/)/.test(raw) ? raw : "/";
}

/** Chuyển về trang đăng nhập rồi giữ lời gọi treo (trang sắp bị thay), tránh chạy tiếp code giả định đã đăng nhập. */
export function goLogin(): Promise<never> {
  const next = location.pathname + location.search;
  location.replace(`/login?next=${encodeURIComponent(next)}`);
  return new Promise<never>(() => undefined);
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  if (!res.ok) {
    // Phiên hết hạn ở màn hình khác /login → đưa về đăng nhập; riêng chính /login thì để hiện lỗi.
    if (res.status === 401 && path !== "/api/auth/login" && !location.pathname.startsWith("/login")) return goLogin();
    throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? "Có lỗi xảy ra, thử lại sau.");
  }
  return data as T;
}

export type PaxCode = "adult" | "child" | "senior" | "infant";
export type Prices = Record<PaxCode, number | null>;

/** Dịch vụ như nhân viên bán hàng thấy (giá đã áp ghi đè của Admin). */
export interface CatalogService {
  code: string;
  name: string;
  unit: string;
  prices: Prices;
  notes: { child: string | null; senior: string | null; infant: string | null };
  supported: boolean;
}

export interface CatalogAdminItem {
  code: string;
  name: string;
  unit: string;
  supported: boolean;
  inSheet: boolean;
  sheetPrices: Prices;
  prices: Prices;
  hidden: boolean;
  overridden: PaxCode[];
  conflicts: { code: PaxCode; base: number | null; current: number | null; override: number }[];
  overrideUpdatedAt: string | null;
  updatedAt: string;
}

export interface CatalogSyncState {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  lastError: string | null;
  itemCount: number | null;
  problems: { row: number; message: string }[];
}
