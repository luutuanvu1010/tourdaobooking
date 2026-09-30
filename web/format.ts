import { AUDIT_ACTIONS } from "../src/shared/audit-actions";
import { vndShort } from "../src/shared/money";
import { PAX_ORDER, type PaxCounts } from "../src/shared/order-lines";
import { STATUS_LABEL, trangThaiHienThi } from "../src/shared/order-status-label";
import type { AuditAction } from "./api";

const nf = new Intl.NumberFormat("vi-VN");

/** 1350000 → "1.350.000 ₫" */
export const vnd = (n: number): string => `${nf.format(n)} ₫`;
export const grouped = (n: number): string => nf.format(n);

export { STATUS_LABEL, trangThaiHienThi, vndShort };

/** "1.350.000 đ" / "1350000" → 1350000; rỗng → 0. */
export function parseMoney(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export const dateTime = (iso: string): string =>
  new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Hình thức thu của lần thu (sổ tiền lượt 1 — mã của bảng tra cứu `bil_payment_method`). Mặc định trên form: Chuyển khoản (chủ duyệt 30/9, YC-0001/0002). */
export const METHOD_LABEL: Record<"BANK_TRANSFER" | "CASH" | "OTHER", string> = { BANK_TRANSFER: "Chuyển khoản", CASH: "Tiền mặt", OTHER: "Khác" };

/** Nhãn hành động nhật ký — lấy từ nguồn duy nhất src/shared/audit-actions.ts. Hành động lạ (bản mới hơn giao diện) hiện mã thô. */
export const actionLabel = (a: AuditAction): string => AUDIT_ACTIONS[a]?.label ?? a;

/** "Hoàng Gia Huy" → "HH": chữ cái đầu của họ và tên (từ đầu + từ cuối); một từ thì lấy chữ đầu. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toLocaleUpperCase("vi-VN");
}

/** "2026-10-01" → "01/10" — thao tác chuỗi thuần, KHÔNG dùng `new Date()` (tránh lệch múi giờ khi ngày không kèm giờ). */
export function dayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

const PAX_ABBR: Record<(typeof PAX_ORDER)[number], string> = { adult: "NL", child: "TE", senior: "NCT", infant: "EB" };

/** "05 NL · 02 TE · 01 EB" — đếm 2 chữ số, bỏ loại có 0 khách, đúng thứ tự PAX_ORDER (đặc tả §7 mục 4). */
export function paxCounts(pax: PaxCounts): string {
  return PAX_ORDER.filter((c) => pax[c] > 0)
    .map((c) => `${String(pax[c]).padStart(2, "0")} ${PAX_ABBR[c]}`)
    .join(" · ");
}

/**
 * "2NL 1TE" — bản RÚT GỌN của paxCounts() riêng cho dòng 2 thẻ đơn (Đợt E vòng sửa 2026-09-24): không đệm số 0,
 * không dấu "·", số dính liền chữ viết tắt — nhường chỗ cho SĐT và "Còn thu" trên đúng một hàng ở khổ 390px.
 * KHÔNG đổi paxCounts() ở trên: hàm đó vẫn dùng ở trang đơn (web/order.ts) và Trang chủ (web/home.ts).
 */
export function paxCountsShort(pax: PaxCounts): string {
  return PAX_ORDER.filter((c) => pax[c] > 0)
    .map((c) => `${pax[c]}${PAX_ABBR[c]}`)
    .join(" ");
}
