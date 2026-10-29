import { HEADER_PHAT_LAI, HEADER_VE } from "../src/shared/lan-gui-luat";
import { taoVongDoiVe, type VeMo } from "../src/shared/lan-gui-ve";
import { MAINTENANCE_CODE } from "../src/shared/maintenance";
import { safeNext } from "../src/shared/safe-next";
import { SESSION_ENDED_KEY, parseSessionEnded } from "../src/shared/session-ended";
import { donTuDuongDan, laTaoDonMoi, taoSoTuLam } from "./bangtin-logic";
import { goDaiNgoaiMang } from "./dai";
import { xoaKhungNho } from "./khung-nho";
import { endsAtFrom, showMaintenanceScreen } from "./maintenance-screen";
import { hienBaoNgan } from "./toast";

// Kiểu dữ liệu API lấy từ hợp đồng dùng chung với Worker (src/shared/contracts.ts) — không chép tay ở đây.
export type {
  AuditAction,
  AuditEntryDto as AuditEntry,
  AuditRecordDto as AuditRecord,
  CatalogAdminItemDto as CatalogAdminItem,
  CatalogServiceDto as CatalogService,
  CatalogSyncStateDto as CatalogSyncState,
  OrderDetailDto as Order,
  OrderInput,
  OrderItemDto as OrderItem,
  OrderStatus,
  OrderSummaryDto as OrderSummary,
  PaxCode,
  Prices,
  StaffAccountDto as StaffAccount,
  StaffProfile as Staff,
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

/**
 * Hỏi máy chủ vì sao phiên này vừa kết thúc (ADR-0075) và để lại cho trang đăng nhập hiện lời báo. Cookie cũ vẫn còn lúc này. Hạn chờ ngắn; mọi lỗi (mạng, sessionStorage bị chặn) bị nuốt —
 * không bao giờ được cản việc đưa người dùng về đăng nhập.
 */
async function ghiNhoLyDoDangXuat(): Promise<void> {
  try {
    const res = await fetch("/api/auth/session-ended", { method: "POST", credentials: "same-origin", signal: AbortSignal.timeout(3000) });
    const notice = parseSessionEnded(await res.json());
    if (notice) sessionStorage.setItem(SESSION_ENDED_KEY, JSON.stringify(notice));
    else sessionStorage.removeItem(SESSION_ENDED_KEY);
  } catch {
    // bỏ qua
  }
}

/** Chuyển về trang đăng nhập rồi giữ lời gọi treo (trang sắp bị thay), tránh chạy tiếp code giả định đã đăng nhập. */
export async function goLogin(): Promise<never> {
  await ghiNhoLyDoDangXuat();
  xoaKhungNho(); // ADR-0035: hết phiên → người đăng nhập kế tiếp (có thể là người khác) không thấy khung của phiên cũ
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

/**
 * LỚP CHỐNG GHI TRÙNG (ADR-0094 đ5; đặc tả §3.2): MỌI lệnh ghi đi qua `api()` mang vé `Idempotency-Key` — vòng đời vé (mở / đóng / giữ) ở mô-đun thuần
 * src/shared/lan-gui-ve.ts; không màn nào phải tự làm gì. Kho lưu: localStorage (lỗi ⇒ bộ nhớ trang). Không xoá vé khi bị đá về đăng nhập.
 */
const vongDoiVe = taoVongDoiVe({
  kho: () => {
    try {
      return localStorage;
    } catch {
      return null;
    }
  },
  dongHo: () => Date.now(),
  sinhVe: () => crypto.randomUUID(),
});
/** Người đang đăng nhập (shell gọi sau /api/auth/me) — vé được giữ qua "tải lại trang" theo ngăn `lg:<id>`. Trước đó: chỉ bộ nhớ trang. */
export function datNguoiDangNhap(id: string | null): void {
  vongDoiVe.datNguoi(id);
}
/** Gặp 409 `dang_xu_ly` (lần bấm trước cùng nội dung đang được ghi): chờ rồi gửi lại CÙNG vé, tối đa 3 lần. */
const CHO_DANG_XU_LY_MS = 1500;
const SO_LAN_CHO_DANG_XU_LY = 3;

/** Máy chủ nói lần bấm trước (cùng vé) ĐÃ được ghi: báo, rồi mở trang kết quả (đường dẫn nội bộ) hoặc tải lại. Màn gọi không nhận thân này (lời gọi treo). */
function baoDaGhi(ketQua: unknown): Promise<never> {
  try {
    hienBaoNgan("Lần bấm trước đã được ghi.");
  } catch {
    // bỏ qua
  }
  const dich = typeof ketQua === "string" ? safeNext(ketQua) : "/";
  setTimeout(() => (dich !== "/" ? location.replace(dich) : location.reload()), 1200);
  return new Promise<never>(() => undefined);
}

/** `henGioMs`: hạn chờ riêng (vd 120 giây cho tin kèm tệp — ADR-0144 đ7); vắng ⇒ `REQUEST_TIMEOUT_MS`. Không đổi vòng đời vé. */
export async function api<T>(path: string, init?: { method?: string; body?: unknown; henGioMs?: number }): Promise<T> {
  const method = init?.method ?? "GET";
  const than = init?.body === undefined ? undefined : JSON.stringify(init.body);
  // Vé (ADR-0094): mở TRƯỚC khi gửi; không mở được (máy không có crypto.subtle — vd trang http qua IP LAN) ⇒ gửi không vé (giai đoạn 1 cho qua).
  let ve: VeMo | null = null;
  try {
    ve = await vongDoiVe.moVe(method, path, than ?? "");
  } catch {
    ve = null;
  }
  for (let lan = 0; ; lan++) {
    try {
      const r = await guiMotLan<T>(path, method, than, ve, init?.henGioMs ?? REQUEST_TIMEOUT_MS);
      if (r.dangXuLy && lan < SO_LAN_CHO_DANG_XU_LY) {
        await new Promise((res) => setTimeout(res, CHO_DANG_XU_LY_MS));
        continue;
      }
      return r.ket();
    } catch (e) {
      // Mất mạng / hết giờ: GIỮ vé (lần bấm lại cùng nội dung dùng lại vé).
      if (!(e instanceof ApiError)) vongDoiVe.ketThuc(ve, { matMang: true });
      throw e;
    }
  }
}

/** Một lần gửi. Trả `dangXuLy` khi gặp 409 `dang_xu_ly` (người gọi chờ rồi gửi lại cùng vé); `ket()` trả kết quả hoặc ném như cũ. */
async function guiMotLan<T>(path: string, method: string, than: string | undefined, ve: VeMo | null, henGioMs: number): Promise<{ dangXuLy: boolean; ket: () => Promise<T> }> {
  const controller = new AbortController();
  // Bảng tin: id lấy từ ĐƯỜNG DẪN thì ghi dấu ngay khi GỬI (máy chủ phát tin trước khi trả phản hồi nên tin có thể tới trước). Ghi thất bại thì không có tin nào — chặn thừa vô hại. Không bao giờ được làm hỏng lời gọi.
  try {
    const donTruoc = donTuDuongDan(method, path);
    if (donTruoc !== null) soTuLam.ghiNho(donTruoc);
  } catch {
    // bỏ qua
  }
  const timer = setTimeout(() => controller.abort(), henGioMs); // hết giờ: `fetch`/đọc thân ném AbortError (không phải ApiError) → nơi gọi xử lý như mất mạng
  try {
    const headers: Record<string, string> = {};
    if (than !== undefined) headers["content-type"] = "application/json";
    if (ve) headers[HEADER_VE] = ve.ve;
    const res = await fetch(path, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: than,
      credentials: "same-origin",
      signal: controller.signal,
    });
    goDaiNgoaiMang(); // máy chủ đã trả lời ⇒ gỡ dải «ngoài mạng» (vd sau một lần hết giờ)
    const data = (await res.json().catch((e: unknown) => {
      if (controller.signal.aborted) throw e; // hết giờ giữa lúc đọc thân: đừng nuốt thành "thân rỗng"
      return null;
    })) as { error?: { code: string; message: string }; da_ghi_truoc_do?: unknown; ket_qua?: unknown } | null;
    // Máy chủ đã trả lời: đóng vé khi rõ (2xx, 4xx trừ 409 dang_xu_ly), giữ khi không rõ (5xx, 409 dang_xu_ly).
    vongDoiVe.ketThuc(ve, { status: res.status, code: data?.error?.code });
    if (res.status === 409 && data?.error?.code === "dang_xu_ly" && ve) {
      const loi = new ApiError(409, "dang_xu_ly", "Đang xử lý lần bấm trước, chờ chút rồi bấm lại.", data.error);
      return { dangXuLy: true, ket: () => Promise.reject(loi) };
    }
    if (res.ok && res.headers.get(HEADER_PHAT_LAI) === "true" && data?.da_ghi_truoc_do === true) return { dangXuLy: false, ket: () => baoDaGhi(data.ket_qua) };
    if (!res.ok) {
      // Chế độ bảo trì: máy chủ chặn tài khoản này (kể cả phiên đang mở) → lớp phủ toàn trang có đồng hồ đếm ngược, không hiện lỗi thô. Riêng trang đăng nhập tự xử lý (chủ vẫn cần đăng nhập được).
      if (data?.error?.code === MAINTENANCE_CODE && !location.pathname.startsWith("/login")) {
        const loi = data.error;
        return { dangXuLy: false, ket: () => showMaintenanceScreen(endsAtFrom(loi)) };
      }
      // Phiên hết hạn (mã "unauthenticated" của router) ở màn hình khác /login → đưa về đăng nhập; riêng chính /login thì để hiện lỗi.
      // B-3 (giả định bề mặt, đảo ngược được): thu hẹp còn đúng mã "unauthenticated" — các route Face ID ở trang "Tôi" (vd pin-by-passkey) trả 401 với mã khác (passkey_invalid/passkey_unknown) và phải hiện lỗi tại chỗ, không được đưa thẳng về /login.
      if (res.status === 401 && path !== "/api/auth/login" && data?.error?.code === "unauthenticated" && !location.pathname.startsWith("/login")) return { dangXuLy: false, ket: () => goLogin() };
      throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? "Có lỗi xảy ra, thử lại sau.", data?.error);
    }
    // Ghi thành công tới một đơn → nhớ để tin Bảng tin về chính đơn đó (do mình gây ra) không hiện thông báo nổi. Tạo đơn mới: id nằm trong phản hồi. Không bao giờ làm một lần ghi thành công thành lỗi.
    try {
      const donDaGhi = donTuDuongDan(method, path) ?? (laTaoDonMoi(method, path) ? (data as { order?: { id?: unknown } } | null)?.order?.id : null);
      if (typeof donDaGhi === "string") soTuLam.ghiNho(donDaGhi);
    } catch {
      // bỏ qua
    }
    return { dangXuLy: false, ket: () => Promise.resolve(data as T) };
  } catch (e) {
    // Mất mạng (TypeError của fetch) hoặc hết giờ: báo cho dải «ngoài mạng» (web/dai.ts) rồi ném lại như cũ.
    if (!(e instanceof ApiError) && (e instanceof TypeError || controller.signal.aborted) && typeof window !== "undefined") window.dispatchEvent(new Event("ngoai-mang"));
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
