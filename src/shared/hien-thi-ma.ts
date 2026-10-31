// Chữ hiện mã định danh, dấu vết (ai tạo / ai sửa) và «đang dùng» ở hộp «Sửa» của thẻ «Loại đối tác» và «Các cấp đại lý» (đặc tả 2026-10-31-ma-dinh-danh-va-sua-loai-doi-tac §3).
// Thuần, dùng chung giao diện và bài kiểm. Giờ hiện theo giờ Việt Nam qua `vnDateTimeText`.
import { vnDateTimeText } from "./vn-date.ts";

/** Ô mã của năm loại Có sẵn: không hiện mã tiếng Anh (ràng buộc chung của đặc tả). */
export const CAU_MA_CO_SAN = "Loại có sẵn của hệ thống — mã cố định";
/** Câu nhắc trong hộp Sửa của loại Có sẵn (đặc tả §3b). */
export const CAU_TEN_CO_SAN = "Tên này cũng hiện trên màn tài khoản của đối tác.";
/** Câu khi trình duyệt không cho chép: mã đã được chọn sẵn để người dùng tự chép. */
export const CAU_KHONG_CHEP_DUOC = "Không chép được, hãy chọn mã và chép tay.";
export const CAU_DA_CHEP = "Đã chép mã.";
/** Trần ghi chú (máy chủ kiểm lại). */
export const GHI_CHU_TOI_DA = 500;

export function nhanMa(code: string, coSan: boolean): string {
  return coSan ? CAU_MA_CO_SAN : code;
}

/** Một dòng dấu vết. `luc` null: «tao» ⇒ loại tạo trước khi có cột dấu vết; «sua» ⇒ chưa sửa lần nào. */
export function nhanDauVet(luc: string | null, boi: string | null, kieu: "tao" | "sua"): string {
  if (luc === null) return kieu === "tao" ? "Tạo trước 31/10/2026 — chưa có dấu vết" : "Chưa sửa lần nào";
  const dau = kieu === "tao" ? "Tạo" : "Sửa gần nhất";
  return `${dau}${boi ? ` bởi ${boi}` : ""} lúc ${vnDateTimeText(luc)}`;
}

export const cauDangDungLoai = (soHoSo: number): string => `Đang dùng: ${soHoSo} hồ sơ`;
export const cauDangDungCap = (soLoai: number, soDoiTac: number): string => `Đang dùng: ${soLoai} loại · ${soDoiTac} đối tác`;
export const cauDemGhiChu = (n: number): string => `${n}/${GHI_CHU_TOI_DA}`;
