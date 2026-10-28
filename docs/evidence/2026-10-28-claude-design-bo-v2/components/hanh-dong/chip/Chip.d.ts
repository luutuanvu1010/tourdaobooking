import type { TenBieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong";
/** Chip bấm được — lọc nhanh, chọn nhiều. Đang chọn: nền biển nhạt + dấu tích. */
export interface ChipProps {
  chon?: boolean;
  /** Tắt: xám phẳng; lý do ghi ở dòng kết quả. */
  tat?: boolean;
  /** Số đếm sau nhãn. */
  dem?: number;
  /** Hình 16 khi chưa chọn (khi chọn luôn là dấu tích). */
  bieuTuong?: TenBieuTuong;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
}
export declare function Chip(props: ChipProps): JSX.Element;
