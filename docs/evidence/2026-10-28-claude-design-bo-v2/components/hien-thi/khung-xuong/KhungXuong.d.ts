/** Khung xương — giữ chỗ đúng kích thước thật khi đang tải: dòng, số, viên. */
export interface KhungXuongProps {
  kieu?: "dong" | "so" | "vien";
  soDong?: number;
  rong?: number | string;
  nhan?: string;
  className?: string;
}
export declare function KhungXuong(props: KhungXuongProps): JSX.Element;
