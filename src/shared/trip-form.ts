// Thông tin chuyến phía form (A2, đặc tả §4/§5): giá trị ô nhập từ DTO, cảnh báo ngày/giờ, dòng tóm tắt của accordion, các dòng hiển thị ở trang đơn,
// kiểm bảng "Sửa thông tin chuyến" và thân PUT /trip. Logic thuần, không DOM. Ngày "YYYY-MM-DD", giờ "HH:MM" theo giờ Việt Nam.
// `today` luôn do nơi gọi cấp (vnToday(new Date())): không dùng ngày UTC (00:00–07:00 giờ VN sẽ lệch ngày).
import type { TripInfoDto, TripInput, TripUpdateInput } from "./contracts.ts";
import { MAX_DAYS_AHEAD, confirmWindow, sameDepartDate } from "./trip-rules.ts";
import { isISODate, ngayDayDu } from "./vn-date.ts";

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

/**
 * Ô "Ngày khách có mặt" (cột `checkin_date`; trống = cùng ngày khởi hành) chỉ hiện khi ĐÃ CÓ giá trị — không giấu một giá trị đang có; còn trống thì chỉ có lối nhỏ "Có mặt khác ngày".
 * Dùng chung form Tạo/sửa đơn và bảng "Sửa thông tin chuyến". (Khác `canHienNgayDon` của chặng: ô này không tự điền ngày đi, nên giá trị trùng ngày đi vẫn hiện.)
 */
export const canHienNgayCoMat = (checkinDate: string): boolean => checkinDate !== "";

/**
 * Khối "Thông tin chuyến" của thẻ dịch vụ có giá trị khác mặc định (mặc định = trống hết) không → phải TỰ MỞ khi dựng (nháp đã lưu, bản sửa): không giấu giá trị đang có. Ngày khởi hành bỏ qua:
 * cả đơn một ngày (ADR-0021), chọn ở đầu form. Hai ô cũ `pickupTime`/`pickupPlace` không còn ô ở khối này (sang chặng đưa đón).
 */
export const coGiaTriChuyen = (t: Pick<TripInput, "departTime" | "checkinDate" | "checkinTime" | "checkinPlace" | "note">): boolean =>
  t.departTime !== "" || t.checkinDate !== "" || t.checkinTime !== "" || t.checkinPlace.trim() !== "" || t.note.trim() !== "";

/** "2026-09-20" → "20/09/2026"; giá trị lạ trả nguyên. */
export const formatDmy = (iso: string): string => (isISODate(iso) ? ngayDayDu(iso) : iso);
// Kiểu D (V1.5b): `formatDm` ("dd/mm" không năm) đã bỏ — ngày ngắn dùng `ngayNgan(iso, thamChieu)` của vn-date.ts (tự thêm năm khi khác năm).

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
    if (d < today) out.push({ code: "past_date", message: "Ngày khởi hành đã qua — vẫn lưu được, nhưng chưa thể xác nhận." });
    else if (d > confirmWindow(today).to) out.push({ code: "too_far", message: `Ngày khởi hành quá ${MAX_DAYS_AHEAD} ngày — vẫn lưu được, nhưng chưa thể xác nhận.` });
  }
  if (trip.pickupTime !== "" && trip.departTime !== "" && trip.pickupTime > trip.departTime) {
    out.push({ code: "pickup_after_depart", message: "Giờ đón sau giờ khởi hành — kiểm tra lại." });
  }
  return out;
}

// ---- Hiển thị ----------------------------------------------------------------------------------------------------

/**
 * Dòng tóm tắt của khối "Thông tin chuyến" khi thu gọn. ADR-0047 Phần B (bản vẽ M1, D4): giờ / nơi đón đã sang khối "Đưa đón" của thẻ — dòng này chỉ còn
 * "Khởi hành <giờ> · Khách có mặt <giờ>" (không ghi ngày — cả đơn một ngày, ADR-0021); không có gì → "". Không còn cảnh báo (`warn` luôn false).
 */
export function tripSummaryLine(trip: TripInput): { text: string; warn: boolean } {
  const text = [trip.departTime !== "" ? `Khởi hành ${trip.departTime}` : "", trip.checkinTime !== "" ? `Có mặt ${trip.checkinTime}` : ""].filter(Boolean).join(" · ");
  return { text, warn: false };
}

export interface TripRow {
  label: string;
  value: string;
  warn: boolean;
}

/**
 * Các dòng thông tin chuyến ở trang đơn (chỉ dòng có nội dung). Khách có mặt trống ngày = "Cùng ngày khởi hành".
 * `orderDate` (bản 1.39) = ngày của đơn đã hiện ở dải đầu trang: dịch vụ có ngày khởi hành TRÙNG ngày đó thì không lặp dòng "Khởi hành" — chỉ còn dòng
 * "Giờ khởi hành" nếu có giờ. Khác ngày (đơn cũ lệch ngày), chưa có ngày, hay không truyền `orderDate` → luôn có dòng "Khởi hành" như cũ.
 */
export function tripRows(t: TripInfoDto, orderDate: string | null = null): TripRow[] {
  const rows: TripRow[] = [];
  if (t.departDate !== null && t.departDate === orderDate) {
    if (t.departTime) rows.push({ label: "Giờ khởi hành", value: t.departTime, warn: false });
  } else rows.push(
    t.departDate === null
      ? { label: "Khởi hành", value: "Chưa có ngày khởi hành", warn: true }
      : { label: "Khởi hành", value: [formatDmy(t.departDate), t.departTime].filter(Boolean).join(" · "), warn: false },
  );
  // D4 (bản vẽ M3): KHÔNG còn dòng "Đón" — giờ / nơi đón hiện ở khối "Đưa đón" của trang đơn.
  if (t.checkinDate !== null || t.checkinTime !== null || t.checkinPlace !== null) {
    const day = t.checkinDate === null ? "Cùng ngày khởi hành" : formatDmy(t.checkinDate);
    rows.push({ label: "Khách có mặt", value: [day, t.checkinTime, t.checkinPlace].filter(Boolean).join(" · "), warn: false });
  }
  if (t.note) rows.push({ label: "Ghi chú", value: t.note, warn: false });
  return rows;
}

// ---- Bảng "Sửa thông tin chuyến" (đơn đã xác nhận) -----------------------------------------------------------------

/**
 * Lỗi chặn Lưu ở bảng sửa — MỘT ô ngày cho cả đơn (ADR-0021; đặc tả 2026-09-25-mot-ngay-ca-don.md), báo một lần chứ không lặp theo dịch vụ.
 * Ngày không được xoá; nếu ĐỔI ngày của dịch vụ nào thì ngày mới phải trong khoảng xác nhận (giống máy chủ, `validateTripUpdate`);
 * ngày đã lưu (kể cả đã qua) giữ nguyên thì vẫn sửa được ghi chú/giờ. Đơn cũ đang lệch ngày: để trống ô = giữ ngày cũ từng dịch vụ.
 */
export function tripSheetDateIssues(orderDate: string, savedDates: readonly (string | null)[], today: string): string[] {
  if (orderDate === "") return sameDepartDate(savedDates) ? ["Ngày khởi hành không được để trống."] : [];
  if (!isISODate(orderDate)) return ["Ngày khởi hành không hợp lệ."];
  const { from, to } = confirmWindow(today);
  const changes = savedDates.some((d) => d !== orderDate);
  if (changes && (orderDate < from || orderDate > to)) return [`Ngày khởi hành phải từ ${formatDmy(from)} đến ${formatDmy(to)}.`];
  return [];
}

/** Ngày gửi lên cho một dịch vụ: ô cả đơn có ngày → ngày đó; ô trống (chỉ gặp ở đơn cũ lệch ngày) → giữ ngày đã lưu. */
export const tripSheetRowDate = (orderDate: string, savedDepartDate: string | null): string => orderDate || (savedDepartDate ?? "");

/**
 * Thân `PUT /api/orders/:id/trip`: MỌI dịch vụ, MỌI trường (máy chủ thay toàn bộ — trường vắng = xoá) TRỪ hai khoá cũ `pickupTime`/`pickupPlace`: ADR-0047
 * Phần B — giờ / nơi đón sửa ở bảng "Sửa đưa đón" (route chặng); khoá vắng = máy chủ không đụng chặng (R2c).
 */
export function tripPayload(services: readonly { id: string; trip: TripInput }[], expectedUpdatedAt: string): TripUpdateInput {
  return {
    expectedUpdatedAt,
    services: services.map((s) => {
      const { pickupTime: _gio, pickupPlace: _noi, ...con } = s.trip;
      return { id: s.id, ...con };
    }),
  };
}
