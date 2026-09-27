// Ma trận lỗi phía client (A2, đặc tả 5.2): phản hồi lỗi của máy chủ → MỘT banner (giọng, tiêu đề, danh sách dòng, hành động). Thuần, không DOM.
import type { CatalogChangeDto, TripGapDto } from "./contracts.ts";
import { PAX_LABEL, type PaxCode } from "./order-lines.ts";
import { MISSING_LABEL } from "./trip-rules.ts";

/** `details` = thân `error` của phản hồi (có thể mang `changes[]` của catalog_changed, `missing[]` của incomplete_trip). */
export interface ErrorInput {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export type BannerTone = "danger" | "warning" | "info";
/** none: chỉ hiện; reload_order: nút "Tải lại đơn"; reload_page: nút "Tải lại trang"; lock_form: khoá form. */
export type BannerAction = "none" | "reload_order" | "reload_page" | "lock_form";
export interface BannerLine {
  text: string;
  /** Có → dòng kèm liên kết "Sửa" tới đúng dịch vụ (banner incomplete_trip). */
  serviceId?: string;
}
export interface Banner {
  tone: BannerTone;
  title: string;
  lines: BannerLine[];
  action: BannerAction;
  /** Chỉ số (0-based) thẻ dịch vụ cần cuộn tới; null = không có. */
  focusService: number | null;
  /** true → tải lại `GET /api/catalog/for-order` (ADR-0033) rồi cập nhật giá đã xem (catalog_changed; giữ đơn giá đã thương lượng). */
  refreshCatalog: boolean;
}

export interface ErrorContext {
  /** Tên các thẻ dịch vụ theo thứ tự hiện tại (để dựng dòng "Tên · Loại: cũ → mới"). */
  serviceNames: readonly string[];
  formatMoney: (n: number) => string;
}

/** Dựng một banner (dùng chung với trang lập đơn và trang đơn cho các câu ngắn không đi qua ma trận). */
export const banner = (tone: BannerTone, title: string, extra: Partial<Omit<Banner, "tone" | "title">> = {}): Banner => ({
  tone, title, lines: [], action: "none", focusService: null, refreshCatalog: false, ...extra,
});

export const NETWORK_BANNER: Banner = banner("danger", "Không kết nối được máy chủ.", { lines: [{ text: "Dữ liệu bạn đã nhập vẫn còn — kiểm tra kết nối rồi bấm Lưu lại." }] });

/** "Dịch vụ 2: …" → 1 (chỉ số 0-based); không mở đầu bằng "Dịch vụ n" → null. */
function serviceIndexOf(message: string): number | null {
  const m = /^Dịch vụ (\d+)\b/.exec(message);
  return m ? Number(m[1]) - 1 : null;
}

const asArray = <T>(v: unknown, key: string): T[] => {
  const x = (v as Record<string, unknown> | null | undefined)?.[key];
  return Array.isArray(x) ? (x as T[]) : [];
};

export function classifyOrderError(e: ErrorInput, ctx: ErrorContext): Banner {
  const fallback = e.message || "Có lỗi xảy ra, thử lại sau.";
  if (e.status === 409 && e.code === "catalog_changed") {
    const changes = asArray<CatalogChangeDto>(e.details, "changes");
    return banner("warning", "Giá danh mục vừa đổi. Đã cập nhật giá mới — bạn xem lại rồi lưu.", {
      lines: changes.map((c) => ({ text: `${ctx.serviceNames[c.serviceIndex] ?? `Dịch vụ ${c.serviceIndex + 1}`} · ${PAX_LABEL[c.pax as PaxCode]}: ${ctx.formatMoney(c.seen)} → ${ctx.formatMoney(c.current)}` })),
      refreshCatalog: true,
      focusService: changes[0]?.serviceIndex ?? null,
    });
  }
  if (e.status === 409 && e.code === "stale") {
    return banner("danger", "Đơn vừa được người khác sửa. Hãy tải lại để xem bản mới.", { lines: [{ text: "Tải lại sẽ bỏ các thay đổi bạn đang gõ." }], action: "reload_order" });
  }
  if (e.status === 409 && e.code === "client_outdated") return banner("info", "Trang đã cũ. Hãy tải lại trang.", { action: "reload_page" });
  if (e.status === 409 && e.code === "not_editable") return banner("danger", fallback, { action: "lock_form" });
  if (e.status === 409 && e.code === "incomplete_trip") {
    const missing = asArray<TripGapDto>(e.details, "missing");
    return banner("danger", "Chưa đủ thông tin chuyến để xác nhận đơn.", {
      lines: missing.map((g) => ({ text: `${g.name} — ${g.reasons.map((r) => MISSING_LABEL[r]).join(", ")}`, serviceId: g.serviceId })),
    });
  }
  if (e.status === 400 && e.code === "catalog_unavailable") {
    return banner("danger", fallback, { lines: [{ text: "Chọn lại dịch vụ này từ danh mục." }], focusService: serviceIndexOf(e.message) });
  }
  if (e.status === 400 && /^Dịch vụ \d+: không thuộc đơn này/.test(e.message)) {
    return banner("info", "Đơn vừa được lưu lại ở nơi khác. Đã tải lại đơn — hãy kiểm tra rồi sửa tiếp.", { action: "reload_order" });
  }
  if (e.status === 400) return banner("danger", fallback, { focusService: serviceIndexOf(e.message) });
  return banner("danger", fallback);
}
