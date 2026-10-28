/** Thẻ — nền trắng, bo 12, một bóng nhẹ, không viền. Thường (có chân nút) hoặc bấm được (cả thẻ là liên kết). */
export interface TheProps {
  tieuDe?: React.ReactNode;
  phu?: React.ReactNode;
  /** Góc phải đầu thẻ: huy hiệu, tiền. */
  sau?: React.ReactNode;
  /** Chân thẻ: 1 Phụ + Lối nhỏ. Không dùng với bamDuoc. */
  chan?: React.ReactNode;
  /** Cả thẻ là vùng bấm, có mũi tên; không chứa nút bên trong. */
  bamDuoc?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  /** Ruột là Khung xương. */
  dangTai?: boolean;
  className?: string;
  children?: React.ReactNode;
}
export declare function The(props: TheProps): JSX.Element;
