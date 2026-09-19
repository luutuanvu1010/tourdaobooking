// Kiểu dữ liệu API lấy từ hợp đồng dùng chung với Worker (src/shared/contracts.ts) — không chép tay ở đây.
export type {
  AuditAction,
  AuditEntryDto as AuditEntry,
  AuditRecordDto as AuditRecord,
  CatalogAdminItemDto as CatalogAdminItem,
  CatalogServiceDto as CatalogService,
  CatalogSyncStateDto as CatalogSyncState,
  DepositMethod,
  OrderDetailDto as Order,
  OrderInput,
  OrderItemDto as OrderItem,
  OrderStatus,
  OrderSummaryDto as OrderSummary,
  PaxCode,
  Prices,
  StaffAccountDto as StaffAccount,
  StaffProfile as Staff,
  StaffSheetCandidateDto as SheetCandidate,
} from "../src/shared/contracts";
export type * as Api from "../src/shared/contracts";

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
