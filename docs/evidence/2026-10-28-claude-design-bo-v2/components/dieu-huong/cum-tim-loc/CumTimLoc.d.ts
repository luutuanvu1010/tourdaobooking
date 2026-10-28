/** Cụm Tìm + Lọc + Sắp xếp — đầu mọi danh sách dài. Đi cùng PhanTrang ở cuối. */
export interface LocMuc { id: string; nhan: string; dem?: number; }
export interface CumTimLocProps {
  nhanTim?: string;
  tuKhoa?: string;
  onTim?: (tuKhoa: string) => void;
  /** Mặc định "Tìm theo tên, số điện thoại, mã đơn". */
  goiY?: string;
  loc?: LocMuc[];
  locChon?: string[];
  onLoc?: (id: string) => void;
  sapXep?: string;
  luaChonSapXep?: { giaTri: string; nhan: string }[];
  onSapXep?: (giaTri: string) => void;
  /** Dòng kết quả, vd "3 đơn khớp". */
  ketQua?: React.ReactNode;
  onXoaLoc?: () => void;
  dangTim?: boolean;
  className?: string;
}
export declare function CumTimLoc(props: CumTimLocProps): JSX.Element;
