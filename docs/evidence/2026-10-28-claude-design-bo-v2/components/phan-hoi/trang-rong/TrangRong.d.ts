import type { TenBieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong";
/** Trạng thái rỗng — biểu tượng + một câu + một nút. */
export interface TrangRongProps {
  bieuTuong?: TenBieuTuong;
  cau: React.ReactNode;
  phu?: React.ReactNode;
  hanhDong?: { nhan: string; bieuTuong?: TenBieuTuong; onClick?: () => void; cap?: "chinh" | "phu" };
  className?: string;
}
export declare function TrangRong(props: TrangRongProps): JSX.Element;
