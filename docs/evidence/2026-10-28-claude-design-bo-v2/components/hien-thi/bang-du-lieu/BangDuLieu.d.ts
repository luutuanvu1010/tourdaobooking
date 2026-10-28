/**
 * Bảng máy tính — bảng cột khi khung ứng dụng ≥ 900, hẹp hơn tự thành thẻ ba dòng. Hàng 44, tiêu đề dính, số canh phải, hành động cuối.
 */
export interface Cot<T = any> {
  khoa: string;
  nhan: string;
  /** "phai" cho số và tiền. */
  can?: "trai" | "phai";
  /** Không xuống dòng (mã, ngày, huy hiệu). */
  gon?: boolean;
  rong?: number | string;
  hien?: (dong: T) => React.ReactNode;
}
export interface TheBaDong { dong1: React.ReactNode; sau1?: React.ReactNode; dong2?: React.ReactNode; dong3?: React.ReactNode; }
export interface BangDuLieuProps<T = any> {
  cot: Cot<T>[];
  dong: T[];
  /** Khoá duy nhất của dòng. Mặc định "id". */
  khoa?: string;
  /** Cột hành động cuối — Lối nhỏ. */
  hanhDong?: (dong: T) => React.ReactNode;
  nhanHanhDong?: string;
  /** Ba dòng của thẻ ở khổ hẹp. */
  theBaDong?: (dong: T) => TheBaDong;
  dangTai?: boolean;
  soDongXuong?: number;
  /** Nội dung khi rỗng — thường là TrangRong. */
  rong?: React.ReactNode;
  /** Cuộn trong, tiêu đề dính. */
  caoToiDa?: number | string;
  nhan?: string;
  className?: string;
}
export declare function BangDuLieu<T = any>(props: BangDuLieuProps<T>): JSX.Element;
