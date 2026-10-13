// TRƯỜNG THỜI GIAN CỦA ĐƠN (ADR-0062 Đ1) — MỘT bảng nhãn cho mọi trường ngày / giờ mà nhật ký chuyến (`describeTripChange` của orders) và nhật ký chặng
// (`moTaChang`) ghi "<nhãn> A → B", và hàm đọc tin (`phanDoiCuaTin`, tin-doi-don.ts) nhận ra. Không I/O, không import.
// Bảng là TẬP CHA: đủ năm trường của dịch vụ + hai trường của chặng (nếu "giờ" bị thu hẹp, nhật ký vẫn cần nhãn của mọi trường).

export const NHAN_TRUONG_THOI_GIAN = {
  departDate: "ngày khởi hành",
  departTime: "giờ khởi hành",
  pickupTime: "giờ đón", // ô cũ của dịch vụ (ghi kép từ chặng chiều đi đầu — ADR-0047 R3)
  checkinDate: "ngày khách có mặt", // 14/10/2026: đổi từ "ngày check-in" (cột `checkin_date` giữ nguyên); dòng nhật ký CŨ vẫn mang chữ cũ — xem NHAN_CU_TRUONG_THOI_GIAN
  checkinTime: "giờ khách có mặt", // đổi từ "giờ check-in"
  legPickupDate: "ngày đón",
  legPickupTime: "giờ đón",
} as const;
export type TruongThoiGian = keyof typeof NHAN_TRUONG_THOI_GIAN;

/**
 * Nhãn CŨ đã nằm trong nhật ký chỉ-thêm (không sửa lại được): hàm đọc tin (`tin-doi-don.ts`) vẫn phải nhận để tin của lần đổi cũ không rơi mất. Từ 14/10/2026 nhật ký MỚI ghi nhãn mới ở
 * `NHAN_TRUONG_THOI_GIAN`; không ghi lại nhãn cũ ở đâu nữa.
 */
export const NHAN_CU_TRUONG_THOI_GIAN: Readonly<Partial<Record<TruongThoiGian, string>>> = {
  checkinDate: "ngày check-in",
  checkinTime: "giờ check-in",
};

/**
 * "GIỜ" của đơn (câu 3 của chủ = A, duyệt 30/9 cùng ADR-0062): MỌI ngày / giờ trên đơn — khởi hành, đón (dịch vụ + chặng), check-in. Đổi một trường trong tập
 * này sau xác nhận thì có tin (ADR-0062 Đ1). ADR-0063 (đếm lượt đổi giờ — chưa duyệt) sẽ DÙNG LẠI đúng hằng này; không nơi nào khác liệt kê trường "giờ".
 */
export const TRUONG_GIO_TINH_LUOT: readonly TruongThoiGian[] = [
  "departDate", "departTime", "pickupTime", "checkinDate", "checkinTime", "legPickupDate", "legPickupTime",
] as const;

/** Nhãn của các trường thuộc "giờ" (tập, có thể trùng chữ giữa dịch vụ và chặng — "giờ đón"). */
export const NHAN_GIO: ReadonlySet<string> = new Set(TRUONG_GIO_TINH_LUOT.map((k) => NHAN_TRUONG_THOI_GIAN[k]));
