/** Dòng danh sách — cao ≥ 44, đệm 12×16, kẻ dưới; tối đa ba dòng chữ; tên dài xuống dòng, không cắt. */
export interface DongDanhSachProps {
  tieuDe: React.ReactNode;
  phu?: React.ReactNode;
  dong3?: React.ReactNode;
  /** Bên trái: biểu tượng 20 hoặc chữ tắt. */
  truoc?: React.ReactNode;
  /** Bên phải: huy hiệu, tiền. */
  sau?: React.ReactNode;
  bamDuoc?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  /** Thông báo chưa đọc: nền riêng + chấm. */
  chuaDoc?: boolean;
  className?: string;
}
export declare function DongDanhSach(props: DongDanhSachProps): JSX.Element;
