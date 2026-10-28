/**
 * Ô nhập — một khuôn cho tám kiểu. Nhãn luôn trên ô (14/500), không nhãn nổi, không dấu *.
 */
export interface ONhapProps {
  /** Nhãn hiện trên ô — bắt buộc. */
  nhan: string;
  /** Kiểu ô. tien: canh phải + "₫"; ngay: dd/mm/yyyy; gio: hh:mm. */
  kieu?: "chu" | "so" | "tien" | "sdt" | "ngay" | "gio" | "chon" | "nhieu-dong";
  /** Thêm "(tuỳ chọn)" sau nhãn. Ô bắt buộc không ghi gì thêm. */
  tuyChon?: boolean;
  /** Chữ gợi ý trong ô — không thay nhãn. */
  goiY?: string;
  giaTri?: string;
  macDinh?: string;
  onDoi?: (giaTri: string) => void;
  /** Câu nói cách sửa, vd "Số điện thoại cần 10 chữ số, bắt đầu bằng 0". */
  loi?: string;
  /** Dòng gợi ý dưới ô. */
  huongDan?: string;
  tat?: boolean;
  /** Một dòng nói vì sao tắt. */
  lyDoTat?: string;
  /** Vòng quay cuối ô. */
  dangTai?: boolean;
  /** Cho kiểu "chon". */
  luaChon?: Array<string | { giaTri: string; nhan: string }>;
  /** "lon" = 52 ở chân dính. */
  co?: "thuong" | "lon";
  id?: string;
  ten?: string;
  className?: string;
}
export declare function ONhap(props: ONhapProps): JSX.Element;
/** Ghi tiền đủ "1.080.000 ₫". */
export declare function ghiTien(so: number | string): string;
