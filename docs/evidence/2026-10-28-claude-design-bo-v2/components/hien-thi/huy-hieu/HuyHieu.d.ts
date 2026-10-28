/** Huy hiệu trạng thái — năm tông, mỗi trạng thái đúng một chữ, một tông, một biểu tượng. Không bấm được. */
export type KhoaTrangThai =
  | "cho-xac-nhan" | "chua-xep" | "sap-het-han" | "chua-ai-nhan" | "ve-moi"
  | "dang-xu-ly" | "dang-chay" | "da-xep" | "da-giao"
  | "da-xac-nhan" | "hoan-tat" | "con-han" | "da-thu-du" | "ve-xong"
  | "da-huy" | "tu-choi" | "het-han" | "qua-han" | "giu-lai"
  | "nhap" | "ngung-dung" | "da-khoa" | "khong-con-trong-sheet";
export type Tong = "cat" | "bien" | "la" | "do" | "xam";
export interface HuyHieuProps {
  /** Khoá trong từ vựng — bộ tự chọn chữ, tông, hình. Luôn ưu tiên. */
  trangThai?: KhoaTrangThai;
  /** Chỉ khi trạng thái chưa có trong từ vựng (và báo để thêm). */
  ton?: Tong;
  children?: React.ReactNode;
  className?: string;
}
export declare function HuyHieu(props: HuyHieuProps): JSX.Element;
export declare const TU_VUNG_TRANG_THAI: Record<KhoaTrangThai, [Tong, string]>;
export declare const BIEU_TUONG_TONG: Record<Tong, "clock" | "swap" | "check" | "alert" | "ban">;
