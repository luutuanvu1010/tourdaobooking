/** Thanh trên — cao 60: logo 30 + tên, Trợ lý, chuông, tài khoản; "+ Tạo đơn" San hô từ 768. Màu vỏ theo --vo-bg / --vo-chu / --vo-vien. */
export interface ThanhTrenProps {
  ten?: string;
  /** Đường dẫn tới assets/logo-96.png. */
  logo?: string;
  /** Có thì hiện "+ Tạo đơn" (≥ 768). */
  onTaoDon?: () => void;
  soThongBao?: number;
  chuTat?: string;
  onTroLy?: () => void;
  onChuong?: () => void;
  onTaiKhoan?: () => void;
  className?: string;
}
export declare function ThanhTren(props: ThanhTrenProps): JSX.Element;
