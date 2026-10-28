import type { TenBieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong";

/**
 * Nút — ba cấp (Chính, Phụ, Lối nhỏ) × hai cỡ (44, 52). Một vùng chỉ một nút Chính.
 */
export interface NutProps {
  /** Cấp nút. "chinh" tối đa một mỗi vùng; "san-ho" CHỈ cho "Xác nhận đơn để gửi khách" và "+ Tạo đơn" ở thanh trên; "do-dac" CHỈ trong Hộp xác nhận. */
  cap?: "chinh" | "san-ho" | "phu" | "phu-nguy-hiem" | "loi-nho" | "do-dac";
  /** "thuong" = 44; "lon" = 52 ở chân dính điện thoại và Đăng nhập. */
  co?: "thuong" | "lon";
  /** Biểu tượng 20 px đứng trước chữ. */
  bieuTuong?: TenBieuTuong;
  /** Đang chạy: vòng quay thế chỗ biểu tượng, chữ giữ nguyên, chặn bấm lần hai. */
  dangTai?: boolean;
  /** Tắt — xám phẳng, vẫn nhận tiêu điểm để trình đọc màn hình đọc được lý do. */
  tat?: boolean;
  /** Bắt buộc khi tat: một dòng nói vì sao tắt, vd "Chọn lý do để lưu". */
  lyDoTat?: string;
  /** Giãn hết bề ngang (chân dính điện thoại). */
  rong?: boolean;
  /** Nhãn cho nút chỉ có hình (không có children). */
  nhan?: string;
  /** Có href thì vẽ thành thẻ a. */
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}
export declare function Nut(props: NutProps): JSX.Element;
