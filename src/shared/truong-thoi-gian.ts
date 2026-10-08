// TRƯỜNG THỜI GIAN CỦA ĐƠN (ADR-0062 Đ1) — MỘT bảng nhãn cho mọi trường ngày / giờ mà nhật ký chuyến (`describeTripChange` của orders) và nhật ký chặng
// (`moTaChang`) ghi "<nhãn> A → B", và hàm đọc tin (`phanDoiCuaTin`, tin-doi-don.ts) nhận ra. Không I/O, không import.
// Bảng là TẬP CHA: đủ năm trường của dịch vụ + hai trường của chặng (nếu "giờ" bị thu hẹp, nhật ký vẫn cần nhãn của mọi trường).

export const NHAN_TRUONG_THOI_GIAN = {
  departDate: "ngày khởi hành",
  departTime: "giờ khởi hành",
  pickupTime: "giờ đón", // ô cũ của dịch vụ (ghi kép từ chặng chiều đi đầu — ADR-0047 R3)
  checkinDate: "ngày check-in",
  checkinTime: "giờ check-in",
  legPickupDate: "ngày đón",
  legPickupTime: "giờ đón",
} as const;
export type TruongThoiGian = keyof typeof NHAN_TRUONG_THOI_GIAN;

/**
 * "GIỜ" của đơn (câu 3 của chủ = A, duyệt 30/9 cùng ADR-0062): MỌI ngày / giờ trên đơn — khởi hành, đón (dịch vụ + chặng), check-in. Đổi một trường trong tập
 * này sau xác nhận thì có tin (ADR-0062 Đ1). ADR-0063 (đếm lượt đổi giờ — chưa duyệt) sẽ DÙNG LẠI đúng hằng này; không nơi nào khác liệt kê trường "giờ".
 */
export const TRUONG_GIO_TINH_LUOT: readonly TruongThoiGian[] = [
  "departDate", "departTime", "pickupTime", "checkinDate", "checkinTime", "legPickupDate", "legPickupTime",
] as const;

/** Nhãn của các trường thuộc "giờ" (tập, có thể trùng chữ giữa dịch vụ và chặng — "giờ đón"). */
export const NHAN_GIO: ReadonlySet<string> = new Set(TRUONG_GIO_TINH_LUOT.map((k) => NHAN_TRUONG_THOI_GIAN[k]));
