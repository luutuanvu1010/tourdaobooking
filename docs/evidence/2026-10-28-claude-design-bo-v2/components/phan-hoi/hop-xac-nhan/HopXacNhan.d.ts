/** Hộp xác nhận hành động một chiều — cùng khuôn Bảng trượt; chỗ duy nhất có nút đỏ đặc. */
export interface HopXacNhanProps {
  mo?: boolean;
  /** Câu hỏi, vd "Huỷ đơn TD-2026-10-0412?" */
  tieuDe: React.ReactNode;
  noiDung?: React.ReactNode;
  /** Điều xảy ra sau đó. */
  hauQua?: React.ReactNode;
  /** Động từ cụ thể, vd "Huỷ đơn". */
  nhanXacNhan: string;
  nhanHuy?: string;
  onXacNhan?: () => void;
  onHuy?: () => void;
  dangTai?: boolean;
  tatXacNhan?: boolean;
  lyDoTat?: string;
  trongKhung?: boolean;
  /** Vd chọn lý do. */
  children?: React.ReactNode;
}
export declare function HopXacNhan(props: HopXacNhanProps): JSX.Element | null;
