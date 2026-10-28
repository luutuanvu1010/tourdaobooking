/** Ô tích — bật/tắt một điều kiện khi lưu biểu mẫu, hoặc chọn nhiều. */
export interface OTichProps {
  nhan: string;
  moTa?: string;
  chon?: boolean;
  macDinh?: boolean;
  onDoi?: (chon: boolean) => void;
  tat?: boolean;
  lyDoTat?: string;
  /** Câu lỗi dưới ô. */
  loi?: string;
  ten?: string;
  giaTri?: string;
  className?: string;
}
export declare function OTich(props: OTichProps): JSX.Element;
