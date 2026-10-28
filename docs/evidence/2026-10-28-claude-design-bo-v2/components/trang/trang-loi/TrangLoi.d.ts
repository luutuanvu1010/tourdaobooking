/** Trang không quyền / không có trang — một trang chung cho 403 và 404; mã lỗi chỉ là dòng nhỏ. */
export interface TrangLoiProps {
  loai?: "khong-co-trang" | "khong-quyen";
  /** Địa chỉ đã mở, hiện nhỏ chữ máy. */
  duongDan?: string;
  onVeTrangChu?: () => void;
  /** "Báo địa chỉ sai" / "Nhờ cấp quyền". */
  onPhu?: () => void;
  className?: string;
}
export declare function TrangLoi(props: TrangLoiProps): JSX.Element;
