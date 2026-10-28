/** Báo xong ngắn — một câu "Đã …", 3 giây, có "Hoàn tác" khi quay lại được. Không dùng để báo lỗi. */
export interface BaoXongProps {
  mo?: boolean;
  hoanTac?: () => void;
  onDong?: () => void;
  /** ms, mặc định 3000. */
  thoiGian?: number;
  /** Chỉ cho bản xem trước: không tự đóng. */
  giuNguyen?: boolean;
  trongKhung?: boolean;
  className?: string;
  children: React.ReactNode;
}
export declare function BaoXong(props: BaoXongProps): JSX.Element | null;
