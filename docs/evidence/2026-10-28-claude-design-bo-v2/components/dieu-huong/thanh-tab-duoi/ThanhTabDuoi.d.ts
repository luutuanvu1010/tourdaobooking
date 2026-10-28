import type { TenBieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong";
/** Thanh tab dưới — điện thoại và 768: 4–5 mục, kính mờ, viên chỉ báo quanh biểu tượng đang chọn. */
export interface TabDuoiMuc { id: string; nhan: string; bieuTuong: TenBieuTuong; dem?: number; href?: string; }
export interface ThanhTabDuoiProps {
  muc: TabDuoiMuc[];
  chon: string;
  onChon?: (id: string) => void;
  className?: string;
}
export declare function ThanhTabDuoi(props: ThanhTabDuoiProps): JSX.Element;
