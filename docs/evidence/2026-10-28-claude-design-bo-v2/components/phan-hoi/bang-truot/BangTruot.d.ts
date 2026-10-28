import type { NutProps } from "../../hanh-dong/nut/Nut";
/**
 * Bảng trượt / hộp thoại — một khuôn: trượt từ đáy dưới 768, hộp thoại giữa màn (520) từ 768. Chân 1 Chính + 1 Phụ.
 */
export interface NutChan extends Omit<NutProps, "children"> { nhan: string; }
export interface BangTruotProps {
  mo?: boolean;
  tieuDe: React.ReactNode;
  moTa?: React.ReactNode;
  chinh?: NutChan;
  phu?: NutChan;
  onDong?: () => void;
  nhanDong?: string;
  /** Chỉ cho bản xem trước: nằm trong khung thay vì phủ cả cửa sổ. */
  trongKhung?: boolean;
  className?: string;
  children?: React.ReactNode;
}
export declare function BangTruot(props: BangTruotProps): JSX.Element | null;
