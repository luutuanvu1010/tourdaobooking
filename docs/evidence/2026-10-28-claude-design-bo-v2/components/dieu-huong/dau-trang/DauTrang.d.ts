/** Đầu trang — tiêu đề 20/24 · 600, dòng phụ, lối quay lại; máy tính có nút bên phải. */
export interface DauTrangProps {
  tieuDe: React.ReactNode;
  phu?: React.ReactNode;
  quayLai?: { nhan: string; href?: string; onClick?: () => void };
  huyHieu?: React.ReactNode;
  /** Tối đa 1 Chính + 1 Phụ; điện thoại thì để ở ThanhDinhDay. */
  hanhDong?: React.ReactNode;
  className?: string;
}
export declare function DauTrang(props: DauTrangProps): JSX.Element;
