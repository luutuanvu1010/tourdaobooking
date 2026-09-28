// Luật THUẦN (không DOM, không I/O) của màn "Việc của tôi" cho hướng dẫn viên — Task 1.8 ADR-0030, dựng theo bản thiết kế của chủ dự án
// `docs/design/tour-o-booking-hdv/project/Viec cua toi - HDV v2.dc.html` (nhãn ngày, số khách, chip trạng thái, thứ tự đơn). `web/viec-cua-toi.ts`
// dựng DOM. Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`, test cạnh tệp: viec-cua-toi.test.ts); `web/` import không đuôi.
// Ngày luôn là chuỗi dân sự "YYYY-MM-DD" giờ Việt Nam (`vnToday`) — mọi phép tính ngày làm trên chuỗi/UTC, KHÔNG dùng `new Date()` theo giờ máy.
import type { OrderStatus, PaxCode, PaxCounts } from "./contracts.ts";
import { PAX_LABEL, PAX_ORDER } from "./order-lines.ts";
import { STATUS_LABEL } from "./order-status-label.ts";

const DAY_MS = 86_400_000;
const WEEKDAY = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"] as const; // chỉ số = getUTCDay()
const utcMs = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`);

/**
 * Nhãn tương đối của ngày đi so với hôm nay (bản thiết kế: "Hôm nay" / "Ngày mai" / "Còn N ngày" / "Đã đi N ngày trước"). Đơn chưa có ngày đi → ""
 * (thẻ chỉ hiện mã đơn — không bịa nhãn). "Đã đi …" chỉ gặp ở "Đơn của tôi" (hàng chờ không có đơn đã qua ngày đi).
 */
export function relLabel(departDate: string | null, today: string): string {
  if (departDate === null) return "";
  const n = Math.round((utcMs(departDate) - utcMs(today)) / DAY_MS);
  if (n === 0) return "Hôm nay";
  if (n === 1) return "Ngày mai";
  if (n > 1) return `Còn ${n} ngày`;
  return `Đã đi ${-n} ngày trước`;
}

/** "Thứ Hai, 28/09" (bản thiết kế `fmtDate`); chưa có ngày → "Chưa có ngày đi". */
export function departLabel(departDate: string | null): string {
  if (departDate === null) return "Chưa có ngày đi";
  const [, m, d] = departDate.split("-");
  return `${WEEKDAY[new Date(utcMs(departDate)).getUTCDay()]}, ${d}/${m}`;
}

/** Ngày đi của đơn = ngày khởi hành LỚN NHẤT của các dịch vụ (cùng định nghĩa `tripDeparted` và hàng chờ `orders/pool.ts`); không dịch vụ nào có ngày → null. */
export function orderDepartDate(dates: readonly (string | null)[]): string | null {
  let last: string | null = null;
  for (const d of dates) if (d && (last === null || d > last)) last = d;
  return last;
}

/** "10 khách · 8 người lớn, 2 trẻ em" của bản thiết kế: tổng + chi tiết (chữ thường, bỏ loại 0, thứ tự `PAX_ORDER`). */
export function paxSummary(pax: PaxCounts): { total: number; detail: string } {
  const total = PAX_ORDER.reduce((n, c) => n + pax[c], 0);
  const detail = PAX_ORDER.filter((c) => pax[c] > 0)
    .map((c) => `${pax[c]} ${PAX_LABEL[c].toLocaleLowerCase("vi-VN")}`)
    .join(", ");
  return { total, detail };
}

export type MyJobChipTone = "warn" | "ok" | "muted";

/**
 * Chip trạng thái của thẻ "Đơn của tôi": chờ xác nhận (cát) / đã xác nhận (xanh) / đã xác nhận mà qua ngày đi → "Đã đi tour" (xám). Không có "Đã huỷ":
 * `GET /api/dispatch/mine` không bao giờ trả đơn đã huỷ (nhánh `isCancelled` của bản thiết kế không áp dụng ở đây).
 */
export function myJobChip(status: OrderStatus, departed: boolean): { label: string; tone: MyJobChipTone } {
  if (status !== "confirmed") return { label: STATUS_LABEL.draft, tone: "warn" };
  return departed ? { label: "Đã đi tour", tone: "muted" } : { label: STATUS_LABEL.confirmed, tone: "ok" };
}

/**
 * Thứ tự "Đơn của tôi" (bản thiết kế `sortMine`): đơn CHƯA đi tour (kể cả chờ xác nhận) lên trước, ngày đi gần nhất trước, chưa có ngày cuối nhóm; đơn đã
 * xác nhận và qua ngày đi xuống cuối, mới nhất trước. Hoà thì theo mã đơn. Trả mảng mới.
 */
export function sortMyJobs<T extends { orderCode: string; status: OrderStatus; departDate: string | null; departed: boolean }>(list: readonly T[]): T[] {
  const past = (o: T): boolean => o.status === "confirmed" && o.departed;
  return [...list].sort((a, b) => {
    if (past(a) !== past(b)) return past(a) ? 1 : -1;
    if (a.departDate !== b.departDate) {
      if (a.departDate === null) return 1;
      if (b.departDate === null) return -1;
      const asc = a.departDate < b.departDate ? -1 : 1;
      return past(a) ? -asc : asc;
    }
    return a.orderCode < b.orderCode ? -1 : a.orderCode > b.orderCode ? 1 : 0;
  });
}

/** Liên kết gọi điện: bỏ mọi ký tự không phải chữ số, giữ một dấu "+" ở đầu (số quốc tế). */
export function telHref(phone: string): string {
  const t = phone.trim();
  return `tel:${t.startsWith("+") ? "+" : ""}${t.replace(/\D/g, "")}`;
}

/**
 * Nút "chọn nhanh" điền sẵn ô lý do sửa số khách (quyết định C của chủ dự án 2026-09-27): chỉ ĐIỀN chữ vào ô, ô vẫn là chữ tự do bắt buộc như máy chủ
 * đòi hôm nay (`parseMoneyEditInput`). Cùng bộ chữ dự kiến cho danh sách đóng ADR-0030 S23-9 (lượt 2) để khi đổi sang mã lý do thì chữ không đổi.
 */
export const EDIT_REASON_QUICK = ["Khách thêm người", "Khách bớt người", "Đổi dịch vụ"] as const;

/** Một dịch vụ của "Việc của tôi" — phần mà thân sửa số khách cần. */
export interface MoneyEditSource {
  id: string;
  catalogCode: string | null;
  pax: PaxCounts;
  editablePaxCodes: readonly PaxCode[];
}

/**
 * Danh sách `services` của thân `POST /api/orders/:id/handler-money-edit`: máy chủ đòi liệt kê ĐỦ mọi dịch vụ TỪ DANH MỤC của đơn, không thiếu không thừa
 * (`parseMoneyEditInput`) — kể cả dịch vụ không sửa được loại khách nào (gửi y nguyên). Dịch vụ nhập tay (`catalogCode` null) không gửi. Số mới chỉ lấy
 * cho loại khách sửa được (`editablePaxCodes`); loại khác giữ số đang có.
 */
export function moneyEditServices(services: readonly MoneyEditSource[], draft: ReadonlyMap<string, Partial<Record<PaxCode, number>>>): { id: string; pax: PaxCounts }[] {
  return services
    .filter((s) => s.catalogCode !== null)
    .map((s) => {
      const d = draft.get(s.id) ?? {};
      const next: PaxCounts = { adult: s.pax.adult, child: s.pax.child, senior: s.pax.senior, infant: s.pax.infant };
      for (const code of s.editablePaxCodes) {
        const v = d[code];
        if (typeof v === "number") next[code] = v;
      }
      return { id: s.id, pax: next };
    });
}
