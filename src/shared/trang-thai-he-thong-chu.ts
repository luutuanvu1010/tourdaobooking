// Chữ của các trạng thái hệ thống dùng chung (đặc tả đợt 0, mục 6.1). Thuần: không DOM.
import { CAU_KHONG_CO_QUYEN_XEM } from "./hoa-hong-hien-thi.ts";

export const CAU_403 = CAU_KHONG_CO_QUYEN_XEM;
export const CAU_404 = "Không có trang này.";
export const CAU_404_PHU = "Địa chỉ có thể đã đổi hoặc gõ sai.";
export const CAU_MAT_MANG_TIEU_DE = "Không có kết nối mạng";
export const CAU_MAT_MANG_CHUA_NAP = "Trang này chưa mở lần nào trên máy nên chưa có dữ liệu để hiện. Kiểm tra Wi-Fi hoặc 4G rồi bấm Thử lại.";
/** Trang đã có trong bộ đệm nhưng không hỏi được máy chủ (nhánh mất mạng của initShell) — khác trang /ngoai-mang (chưa mở lần nào). */
export const CAU_MAT_MANG_CHUA_TAI = "Trang này chưa tải được dữ liệu. Kiểm tra Wi-Fi hoặc 4G rồi bấm Thử lại.";
export const CAU_MAT_MANG_TU_THU = "Nền tảng tự thử lại khi có mạng.";
export const NHAN_VE_TRANG_DAU = "Về trang đầu của bạn";
export const NHAN_THU_LAI = "Thử lại";

export function cauThieuMa(doiTuong: string): string {
  return `Thiếu mã ${doiTuong}. Mở từ danh sách để xem đúng ${doiTuong}.`;
}

/** Thông điệp của lỗi máy chủ nếu có (ApiError mang `status`); hết giờ → câu 45 giây; còn lại → câu chung. */
export function cauLoiMayChu(loi: unknown, hetGio: boolean): string {
  if (loi instanceof Error && typeof (loi as { status?: unknown }).status === "number" && loi.message) return loi.message;
  return hetGio ? "Máy chủ không trả lời trong 45 giây." : "Máy chủ không trả lời. Thử lại sau ít phút.";
}
