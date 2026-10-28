/** Phân trang / tải thêm — "tai-them" cho danh sách điện thoại, "so-trang" cho bảng máy tính. */
export interface PhanTrangProps {
  kieu?: "tai-them" | "so-trang";
  daHien?: number;
  tong: number;
  donVi?: string;
  dangTai?: boolean;
  onTaiThem?: () => void;
  trang?: number;
  coTrang?: number;
  onTrang?: (trang: number) => void;
  className?: string;
}
export declare function PhanTrang(props: PhanTrangProps): JSX.Element;
