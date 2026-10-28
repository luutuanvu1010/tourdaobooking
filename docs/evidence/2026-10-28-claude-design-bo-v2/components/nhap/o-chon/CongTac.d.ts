/** Công tắc — cài đặt có hiệu lực ngay, không cần Lưu. Chữ bên trái, công tắc bên phải. */
export interface CongTacProps {
  nhan: string;
  moTa?: string;
  bat?: boolean;
  macDinh?: boolean;
  onDoi?: (bat: boolean) => void;
  tat?: boolean;
  lyDoTat?: string;
  ten?: string;
  className?: string;
}
export declare function CongTac(props: CongTacProps): JSX.Element;
