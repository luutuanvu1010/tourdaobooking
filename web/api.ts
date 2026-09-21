import { MAINTENANCE_CODE } from "../src/shared/maintenance";
import { endsAtFrom, showMaintenanceScreen } from "./maintenance-screen";

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
    /** Thân `error` của phản hồi (vd `changes[]` của catalog_changed, `missing[]` của incomplete_trip) — để `classifyOrderError` dựng banner. */
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Chỉ cho phép quay lại đường dẫn nội bộ (chặn open redirect) — logic + test ở src/shared/safe-next.ts. */
export { safeNext } from "../src/shared/safe-next";

/** Chuyển về trang đăng nhập rồi giữ lời gọi treo (trang sắp bị thay), tránh chạy tiếp code giả định đã đăng nhập. */
export function goLogin(): Promise<never> {
  const next = location.pathname + location.search;
  location.replace(`/login?next=${encodeURIComponent(next)}`);
  return new Promise<never>(() => undefined);
}

/** Hạn chờ một lời gọi API. Máy chủ im lặng (mạng chập chờn) thì báo lỗi mạng thay vì để nút "Đang lưu…" kẹt vĩnh viễn — PWA không có nút tải lại của trình duyệt. */
const REQUEST_TIMEOUT_MS = 45_000;

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); // hết giờ: `fetch`/đọc thân ném AbortError (không phải ApiError) → nơi gọi xử lý như mất mạng
  try {
    const res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      signal: controller.signal,
    });
    const data = (await res.json().catch((e: unknown) => {
      if (controller.signal.aborted) throw e; // hết giờ giữa lúc đọc thân: đừng nuốt thành "thân rỗng"
      return null;
    })) as { error?: { code: string; message: string } } | null;
    if (!res.ok) {
      // Chế độ bảo trì: máy chủ chặn tài khoản này (kể cả phiên đang mở) → lớp phủ toàn trang có đồng hồ đếm ngược, không hiện lỗi thô. Riêng trang đăng nhập tự xử lý (chủ vẫn cần đăng nhập được).
      if (data?.error?.code === MAINTENANCE_CODE && !location.pathname.startsWith("/login")) return showMaintenanceScreen(endsAtFrom(data.error));
      // Phiên hết hạn ở màn hình khác /login → đưa về đăng nhập; riêng chính /login thì để hiện lỗi.
      if (res.status === 401 && path !== "/api/auth/login" && !location.pathname.startsWith("/login")) return goLogin();
      throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? "Có lỗi xảy ra, thử lại sau.", data?.error);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}
