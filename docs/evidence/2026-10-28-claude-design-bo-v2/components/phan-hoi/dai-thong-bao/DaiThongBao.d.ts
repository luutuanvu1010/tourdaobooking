import type { TenBieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong";
/** Dải thông báo ba tông — tại chỗ, Biển (đang diễn ra) / Cát (cần làm) / Đỏ (lỗi). Bo 12, không viền. */
export interface DaiThongBaoProps {
  ton?: "bien" | "cat" | "do";
  tieuDe?: React.ReactNode;
  hanhDong?: { nhan: string; onClick?: () => void; bieuTuong?: TenBieuTuong; dangTai?: boolean };
  /** Cho phép ẩn. */
  onDong?: () => void;
  className?: string;
  children?: React.ReactNode;
}
export declare function DaiThongBao(props: DaiThongBaoProps): JSX.Element;
