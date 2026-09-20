// Thông tin chuyến phía form (A2, đặc tả §4/§5): giá trị ô nhập từ DTO, cảnh báo ngày/giờ, dòng tóm tắt của accordion, các dòng hiển thị ở trang đơn,
// kiểm bảng "Sửa thông tin chuyến" và thân PUT /trip. Logic thuần, không DOM. Ngày "YYYY-MM-DD", giờ "HH:MM" theo giờ Việt Nam.
// `today` luôn do nơi gọi cấp (vnToday(new Date())): không dùng ngày UTC (00:00–07:00 giờ VN sẽ lệch ngày).
import type { TripInfoDto, TripInput, TripUpdateInput } from "./contracts.ts";
import { MAX_DAYS_AHEAD, confirmWindow } from "./trip-rules.ts";
import { isISODate } from "./vn-date.ts";

/** Thông tin chuyến trống: "" = chưa có (máy chủ chuẩn hoá thành null). */
export const emptyTrip = (): TripInput => ({ departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" });

/** DTO → giá trị ô nhập. `checkinDate` null (= cùng ngày khởi hành) → "". */
export const tripFromDto = (t: TripInfoDto): TripInput => ({
  departDate: t.departDate ?? "",
  departTime: t.departTime ?? "",
  pickupTime: t.pickupTime ?? "",
  pickupPlace: t.pickupPlace ?? "",
  checkinDate: t.checkinDate ?? "",
  checkinTime: t.checkinTime ?? "",
  checkinPlace: t.checkinPlace ?? "",
  note: t.note ?? "",
});

/** "2026-09-20" → "20/09/2026"; giá trị lạ trả nguyên. */
export const formatDmy = (iso: string): string => (isISODate(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);

/** "2026-09-20" → "20/09"; giá trị lạ trả nguyên. */
export const formatDm = (iso: string): string => (isISODate(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso);

// ---- Cảnh báo (vàng, KHÔNG chặn Lưu nháp) ---------------------------------------------------------------------------

export type TripWarningCode = "past_date" | "too_far" | "pickup_after_depart";
export interface TripWarning {
  code: TripWarningCode;
  message: string;
}

export function tripWarnings(trip: TripInput, today: string): TripWarning[] {
  const out: TripWarning[] = [];
  const d = trip.departDate;
  if (isISODate(d)) {
    if (d < today) out.push({ code: "past_date", message: "Ngày khởi hành đã qua — lưu nháp được, nhưng chưa thể xác nhận." });
    else if (d > confirmWindow(today).to) out.push({ code: "too_far", message: `Ngày khởi hành quá ${MAX_DAYS_AHEAD} ngày — lưu nháp được, nhưng chưa thể xác nhận.` });
  }
  if (trip.pickupTime !== "" && trip.departTime !== "" && trip.pickupTime > trip.departTime) {
    out.push({ code: "pickup_after_depart", message: "Giờ đón sau giờ khởi hành — kiểm tra lại." });
  }
  return out;
}

// ---- Hiển thị ----------------------------------------------------------------------------------------------------

/** Dòng tóm tắt của accordion khi thu gọn: "20/09 · 07:30 · đón 07:00 · Khách sạn Sunrise". Chưa có ngày → `warn` (hiện kiểu cảnh báo). */
export function tripSummaryLine(trip: TripInput): { text: string; warn: boolean } {
  const parts: string[] = [];
  if (trip.departTime !== "") parts.push(trip.departTime);
  if (trip.pickupTime !== "") parts.push(`đón ${trip.pickupTime}`);
  if (trip.pickupPlace !== "") parts.push(trip.pickupTime !== "" ? trip.pickupPlace : `đón tại ${trip.pickupPlace}`);
  if (trip.departDate === "") return { text: ["Chưa có ngày khởi hành", ...parts].join(" · "), warn: true };
  return { text: [formatDm(trip.departDate), ...parts].join(" · "), warn: false };
}

export interface TripRow {
  label: string;
  value: string;
  warn: boolean;
}

/** Các dòng thông tin chuyến ở trang đơn (chỉ dòng có nội dung; luôn có "Khởi hành"). Check-in trống ngày = "Cùng ngày khởi hành". */
export function tripRows(t: TripInfoDto): TripRow[] {
  const rows: TripRow[] = [];
  rows.push(
    t.departDate === null
      ? { label: "Khởi hành", value: "Chưa có ngày khởi hành", warn: true }
      : { label: "Khởi hành", value: [formatDmy(t.departDate), t.departTime].filter(Boolean).join(" · "), warn: false },
  );
  const pickup = [t.pickupTime, t.pickupPlace].filter(Boolean).join(" · ");
  if (pickup) rows.push({ label: "Đón", value: pickup, warn: false });
  if (t.checkinDate !== null || t.checkinTime !== null || t.checkinPlace !== null) {
    const day = t.checkinDate === null ? "Cùng ngày khởi hành" : formatDmy(t.checkinDate);
    rows.push({ label: "Check-in", value: [day, t.checkinTime, t.checkinPlace].filter(Boolean).join(" · "), warn: false });
  }
  if (t.note) rows.push({ label: "Ghi chú", value: t.note, warn: false });
  return rows;
}

// ---- Bảng "Sửa thông tin chuyến" (đơn đã xác nhận) -----------------------------------------------------------------

/**
 * Lỗi chặn Lưu ở bảng sửa. Ngày khởi hành không được xoá; nếu ĐỔI ngày thì phải trong khoảng xác nhận (giống máy chủ, `validateTripUpdate`);
 * ngày đã lưu (kể cả đã qua) giữ nguyên thì vẫn sửa được ghi chú/giờ.
 */
export function tripSheetIssues(rows: readonly { name: string; savedDepartDate: string | null; trip: TripInput }[], today: string): string[] {
  const { from, to } = confirmWindow(today);
  const out: string[] = [];
  for (const r of rows) {
    const d = r.trip.departDate;
    if (d === "") out.push(`${r.name}: ngày khởi hành không được để trống.`);
    else if (!isISODate(d)) out.push(`${r.name}: ngày khởi hành không hợp lệ.`);
    else if (d !== r.savedDepartDate && (d < from || d > to)) out.push(`${r.name}: ngày khởi hành phải từ ${formatDmy(from)} đến ${formatDmy(to)}.`);
  }
  return out;
}

/** Thân `PUT /api/orders/:id/trip`: MỌI dịch vụ, MỌI trường (máy chủ thay toàn bộ — trường vắng = xoá). */
export function tripPayload(services: readonly { id: string; trip: TripInput }[], expectedUpdatedAt: string): TripUpdateInput {
  return { expectedUpdatedAt, services: services.map((s) => ({ id: s.id, ...s.trip })) };
}
