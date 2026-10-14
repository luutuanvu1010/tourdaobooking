// Ma trận lỗi phía client (A2, đặc tả 5.2): phản hồi lỗi của máy chủ → MỘT banner (giọng, tiêu đề, danh sách dòng, hành động). Thuần, không DOM.
import { nhanThoiLuong } from "./chinh-sach-hien-thi.ts";
import type { CatalogChangeDto, TripGapDto } from "./contracts.ts";
import { cauMoc } from "./dat-gap-hien-thi.ts";
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
  /** ADR-0049 (409 `short_notice_required`): tên chặng theo id ("Chiều đi · <dịch vụ>") — trang đơn tra từ `order.services[].legs`; vắng → "Chặng đưa đón". */
  tenChang?: (legId: string) => string | null;
  /** Mốc tối thiểu đang hiệu lực (phút) — để câu có "dưới mốc 6 giờ"; vắng / null → câu ngắn không nói mốc. */
  mocPhut?: number | null;
}

/** Dựng một banner (dùng chung với trang lập đơn và trang đơn cho các câu ngắn không đi qua ma trận). */
export const banner = (tone: BannerTone, title: string, extra: Partial<Omit<Banner, "tone" | "title">> = {}): Banner => ({
  tone, title, lines: [], action: "none", focusService: null, refreshCatalog: false, ...extra,
});

/**
 * 409 mà MÀN HÌNH KHÔNG CŨ: lỗi nghiệp vụ người dùng sửa ngay tại chỗ (ADR-0114 D3: "thieu_nguoi_lon" — thêm người lớn rồi lưu lại; ADR-0118 Đ3: "transfer_disabled" — nhóm dịch vụ đã tắt đưa đón, câu máy chủ nói rõ bỏ chặng nào / nhờ ai bật lại). Nơi gọi thường đổi mọi 409 thành
 * nút "Tải lại đơn" (đơn vừa đổi ở nơi khác); với mã trong tập này thì KHÔNG: tải lại sẽ xoá số khách vừa nhập, và câu máy chủ gửi đã nói đủ việc cần làm.
 */
export const LOI_409_KHONG_CU: ReadonlySet<string> = new Set(["thieu_nguoi_lon", "transfer_disabled"]);

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
  // ADR-0049 D2: xác nhận đơn còn chặng dưới mốc chưa đặt gấp (kèm `legs[]`); lệnh sửa chuyến đơn đã xác nhận dưới mốc (I14 — không kèm danh sách).
  if (e.status === 409 && e.code === "short_notice_required") {
    const legs = asArray<{ legId: string; phutConLai: number }>(e.details, "legs");
    if (legs.length === 0) return banner("warning", fallback);
    const moc = ctx.mocPhut ?? null;
    const cau = (p: number) => (moc !== null ? cauMoc(p, moc) : p > 0 ? `giờ đón cách bây giờ ${nhanThoiLuong(p)}` : "giờ đón đã qua");
    return banner("warning", "Còn chặng đón dưới mốc tối thiểu — cần Quản trị duyệt đặt gấp trước khi xác nhận.", {
      lines: legs.map((l) => ({ text: `${ctx.tenChang?.(l.legId) ?? "Chặng đưa đón"}: ${cau(l.phutConLai)}` })),
    });
  }
  if (e.status === 503 && e.code === "moc_toi_thieu_chua_co") {
    return banner("danger", fallback, { lines: [{ text: "Chưa lưu, xác nhận hay sửa chuyến có giờ đón được cho tới khi Toàn quyền đặt chính sách điều phối." }] });
  }
  if (e.status === 400 && e.code === "catalog_unavailable") {
    return banner("danger", fallback, { lines: [{ text: "Chọn lại dịch vụ này từ danh mục." }], focusService: serviceIndexOf(e.message) });
  }
  if (e.status === 400 && /^Dịch vụ \d+: không thuộc đơn này/.test(e.message)) {
    return banner("info", "Đơn vừa được lưu lại ở nơi khác. Đã tải lại đơn — hãy kiểm tra rồi sửa tiếp.", { action: "reload_order" });
  }
  // Lập đơn kèm người phụ trách không còn đủ điều kiện (vừa nghỉ, mất quyền giữa lúc điền form — Task 1.8 phần b ADR-0030): máy chủ KHÔNG tạo đơn. Giữ
  // nguyên form (không khoá, không tải lại) để người dùng bỏ chọn hoặc chọn người khác rồi lưu lại; tiêu đề là đúng lời máy chủ (lý do cụ thể).
  if (e.status === 400 && e.code === "invalid_assignee") {
    return banner("danger", fallback, { lines: [{ text: "Đơn chưa được lưu. Bỏ chọn hoặc chọn người phụ trách khác rồi bấm Lưu lại." }] });
  }
  if (e.status === 400) return banner("danger", fallback, { focusService: serviceIndexOf(e.message) });
  return banner("danger", fallback);
}
