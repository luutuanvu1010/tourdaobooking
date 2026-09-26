import { MAINTENANCE_CODE } from "../src/shared/maintenance";
import { donTuDuongDan, laTaoDonMoi, taoSoTuLam } from "./bangtin-logic";
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

/** Bảng tin (ADR-0022, TD-4): đơn nào CHÍNH tab này vừa ghi — trong bộ nhớ của trang, không lưu localStorage. */
const soTuLam = taoSoTuLam();
/** Tab này vừa ghi (thành công) đơn `orderId` trong vòng 5 giây? Dùng để không hiện thông báo nổi cho việc mình vừa làm. */
export function vuaLamBoiTabNay(orderId: string): boolean {
  return soTuLam.vuaLam(orderId);
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const controller = new AbortController();
  // Bảng tin: id lấy từ ĐƯỜNG DẪN thì ghi dấu ngay khi GỬI (máy chủ phát tin trước khi trả phản hồi nên tin có thể tới trước). Ghi thất bại thì không có tin nào — chặn thừa vô hại. Không bao giờ được làm hỏng lời gọi.
  try {
    const donTruoc = donTuDuongDan(init?.method ?? "GET", path);
    if (donTruoc !== null) soTuLam.ghiNho(donTruoc);
  } catch {
    // bỏ qua
  }
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
      // Phiên hết hạn (mã "unauthenticated" của router) ở màn hình khác /login → đưa về đăng nhập; riêng chính /login thì để hiện lỗi.
      // B-3 (giả định bề mặt, đảo ngược được): thu hẹp còn đúng mã "unauthenticated" — các route Face ID ở trang "Tôi" (vd pin-by-passkey) trả 401 với mã khác (passkey_invalid/passkey_unknown) và phải hiện lỗi tại chỗ, không được đưa thẳng về /login.
      if (res.status === 401 && path !== "/api/auth/login" && data?.error?.code === "unauthenticated" && !location.pathname.startsWith("/login")) return goLogin();
      throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? "Có lỗi xảy ra, thử lại sau.", data?.error);
    }
    // Ghi thành công tới một đơn → nhớ để tin Bảng tin về chính đơn đó (do mình gây ra) không hiện thông báo nổi. Tạo đơn mới: id nằm trong phản hồi. Không bao giờ làm một lần ghi thành công thành lỗi.
    try {
      const method = init?.method ?? "GET";
      const donDaGhi = donTuDuongDan(method, path) ?? (laTaoDonMoi(method, path) ? (data as { order?: { id?: unknown } } | null)?.order?.id : null);
      if (typeof donDaGhi === "string") soTuLam.ghiNho(donDaGhi);
    } catch {
      // bỏ qua
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}
