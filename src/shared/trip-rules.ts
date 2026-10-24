// Luật thuần dùng chung giữa máy chủ (orders/service-rules.ts) và giao diện (web/): trần số dịch vụ/dòng, cửa sổ xác nhận, nhãn lý do thiếu.
// Một nguồn (P6): trước A2 các hằng này nằm trong orders/service-rules.ts nên web/ không import được (web/ không import src/modules/).
import type { MissingReason } from "./contracts.ts";
import { addDays } from "./vn-date.ts";

export const MAX_SERVICES = 20;
/** Tổng số dòng tiền của một đơn (cũng là trần số dòng nhập tay của một dịch vụ). */
export const MAX_LINES_PER_ORDER = 50;
/** Xác nhận đơn: ngày khởi hành không quá khứ và không xa hơn số ngày này (Q12). */
export const MAX_DAYS_AHEAD = 365;

// ---- Một ngày cho cả đơn (ADR-0021, đặc tả 2026-09-25-mot-ngay-ca-don.md) ----
export const ONE_DATE_MESSAGE = "Mọi dịch vụ trong đơn phải cùng một ngày khởi hành.";

/** Mọi dịch vụ cùng một giá trị ngày khởi hành; "chưa có ngày" (null/"") cũng là MỘT giá trị (tất cả trống thì đạt, trộn thì không). */
export const sameDepartDate = (dates: readonly (string | null)[]): boolean => new Set(dates.map((d) => d || null)).size <= 1;

/**
 * Sửa thông tin chuyến (API nhận gửi MỘT PHẦN dịch vụ): chỉ khi yêu cầu ĐỔI ngày của ít nhất một dịch vụ thì trạng thái SAU khi sửa
 * (dịch vụ vắng giữ ngày đã lưu) phải cùng một ngày. Không đổi ngày nào → luôn đạt, để đơn cũ (trước 1.11) đang lệch ngày vẫn sửa được ghi chú/giờ.
 */
export function tripUpdateKeepsOneDate(stored: readonly { id: string; departDate: string | null }[], updates: readonly { id: string; departDate: string | null }[]): boolean {
  const next = new Map(stored.map((s) => [s.id, s.departDate || null]));
  let changed = false;
  for (const u of updates) {
    if ((u.departDate || null) !== next.get(u.id)) changed = true;
    next.set(u.id, u.departDate || null);
  }
  return !changed || sameDepartDate([...next.values()]);
}

/**
 * Tour ĐÃ QUA NGÀY ĐI chưa (DK-T4-02, kiểm toán 24/9; chủ dự án chốt 2026-09-26): ngày đi của đơn = ngày khởi hành LỚN NHẤT trong các dịch vụ
 * (dữ liệu vẫn lưu ngày theo từng dịch vụ); đã qua ⇔ ngày đi < `today` (giờ VN, `vnToday`). Ngày đi = hôm nay → CHƯA qua (trong ngày đi hướng
 * dẫn viên vẫn huỷ được — khách không đến bến). Dịch vụ chưa có ngày (null/"") bị bỏ qua; KHÔNG dịch vụ nào có ngày → false (không chứng minh
 * được là đã qua, nên không chặn). Dùng chung: máy chủ chặn `POST /api/orders/:id/handler-cancel`, giao diện ẩn nút "Huỷ đơn này" (trang Tôi).
 */
export function tripDeparted(dates: readonly (string | null)[], today: string): boolean {
  let last: string | null = null;
  for (const d of dates) if (d && (last === null || d > last)) last = d;
  return last !== null && last < today;
}

/**
 * Hạn «Từ chối» đơn (ADR-0030 điều 1, Q-E): người phụ trách KHÔNG trả đơn được khi ngày đi ≤ ngày mai (kể cả đã qua) — phải gọi văn phòng để đổi người.
 * Ngày đi = ngày khởi hành LỚN NHẤT (cùng định nghĩa với `tripDeparted`); không dịch vụ nào có ngày → false (không chặn). `today` = `vnToday(new Date())`.
 * Dùng chung: máy chủ chặn `POST /api/orders/:id/handler-refuse` (409 `too_late`), giao diện ẩn nút "Từ chối đơn".
 */
export function tuChoiQuaMuon(dates: readonly (string | null)[], today: string): boolean {
  let last: string | null = null;
  for (const d of dates) if (d && (last === null || d > last)) last = d;
  return last !== null && last <= addDays(today, 1);
}

/** Khoảng ngày khởi hành cho phép khi xác nhận (bao gồm hai đầu). Repository bind hai giá trị này vào câu UPDATE xác nhận. */
export const confirmWindow = (today: string): { from: string; to: string } => ({ from: today, to: addDays(today, MAX_DAYS_AHEAD) });

/** Lý do một dịch vụ chưa đủ điều kiện xác nhận → chữ tiếng Việt cho banner `incomplete_trip` (mỗi dòng hiện "<tên dịch vụ> — <nhãn>"). */
export const MISSING_LABEL: Record<MissingReason, string> = {
  no_date: "chưa có ngày khởi hành",
  past_date: "ngày khởi hành đã qua",
  too_far: `ngày khởi hành quá xa (trên ${MAX_DAYS_AHEAD} ngày)`,
  no_guests: "chưa có khách",
};
