import type { TenBieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong";
/**
 * Thanh bên nhóm gập — máy tính ≥ 900: rộng 248, nhóm gập, mục đang chọn có vạch đầm phá. Chân: Của tôi, Hỗ trợ, Hướng dẫn, tên người.
 */
export interface ThanhBenMuc { id: string; nhan: string; bieuTuong?: TenBieuTuong; dem?: number; href?: string; }
export interface ThanhBenNhom { id: string; /** Trống = nhóm đầu không tiêu đề. */ nhan?: string; muc: ThanhBenMuc[]; }
export interface ThanhBenProps {
  nhom: ThanhBenNhom[];
  chon?: string;
  onChon?: (id: string) => void;
  /** id nhóm mở sẵn; mặc định nhóm chứa mục đang chọn. */
  moSan?: string[];
  /** Mặc định Của tôi · Hỗ trợ · Hướng dẫn. */
  chan?: ThanhBenMuc[];
  nguoi?: { ten: string; vaiTro: string; chuTat: string };
  className?: string;
}
export declare function ThanhBen(props: ThanhBenProps): JSX.Element;
