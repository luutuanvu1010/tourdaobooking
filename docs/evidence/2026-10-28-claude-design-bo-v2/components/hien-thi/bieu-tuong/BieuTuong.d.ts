export type TenBieuTuong =
  | "home" | "orders" | "plus" | "me" | "services" | "staff" | "back" | "next" | "lock" | "alert"
  | "close" | "check" | "contact-card" | "pin" | "history" | "chat" | "palette" | "doc-check" | "money"
  | "assign" | "clock" | "chart" | "handset" | "guests" | "face" | "help" | "bell" | "megaphone" | "swap"
  | "ban" | "truck" | "eye" | "chevron-down" | "resize" | "search" | "grid" | "trash" | "minus";

/**
 * Biểu tượng nét của bộ — 37 hình từ mã + 1 MỚI (minus), lưới 24, nét 2, màu theo chữ xung quanh.
 */
export interface BieuTuongProps {
  /** Tên hình trong bộ 37. */
  ten: TenBieuTuong;
  /** Cỡ px. Mặc định 20 (--bt-co); 24 trên thanh trên, thanh tab, trạng thái rỗng. */
  co?: number;
  /** Chỉ điền khi biểu tượng đứng một mình và mang nghĩa (vd nút chỉ có hình). Bỏ trống = trang trí, bị trình đọc màn hình bỏ qua. */
  nhan?: string;
  className?: string;
  style?: React.CSSProperties;
}
export declare function BieuTuong(props: BieuTuongProps): JSX.Element | null;
export declare const TEN_BIEU_TUONG: TenBieuTuong[];
