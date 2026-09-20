// Luật thuần dùng chung giữa máy chủ (orders/service-rules.ts) và giao diện (web/): trần số dịch vụ/dòng, cửa sổ xác nhận, nhãn lý do thiếu.
// Một nguồn (P6): trước A2 các hằng này nằm trong orders/service-rules.ts nên web/ không import được (web/ không import src/modules/).
import type { MissingReason } from "./contracts.ts";
import { addDays } from "./vn-date.ts";

export const MAX_SERVICES = 20;
/** Tổng số dòng tiền của một đơn (cũng là trần số dòng nhập tay của một dịch vụ). */
export const MAX_LINES_PER_ORDER = 50;
/** Xác nhận đơn: ngày khởi hành không quá khứ và không xa hơn số ngày này (Q12). */
export const MAX_DAYS_AHEAD = 365;

/** Khoảng ngày khởi hành cho phép khi xác nhận (bao gồm hai đầu). Repository bind hai giá trị này vào câu UPDATE xác nhận. */
export const confirmWindow = (today: string): { from: string; to: string } => ({ from: today, to: addDays(today, MAX_DAYS_AHEAD) });

/** Lý do một dịch vụ chưa đủ điều kiện xác nhận → chữ tiếng Việt cho banner `incomplete_trip` (mỗi dòng hiện "<tên dịch vụ> — <nhãn>"). */
export const MISSING_LABEL: Record<MissingReason, string> = {
  no_date: "chưa có ngày khởi hành",
  past_date: "ngày khởi hành đã qua",
  too_far: `ngày khởi hành quá xa (trên ${MAX_DAYS_AHEAD} ngày)`,
  no_guests: "chưa có khách",
};
