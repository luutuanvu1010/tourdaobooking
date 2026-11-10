// Câu khoá vé (vé chưa mở được vì tiền) — MỘT nơi cho cả máy chủ (403 của route vé, `src/modules/ve-dien-tu/index.ts`) lẫn giao diện (khối vé, `web/ve-don.ts`). ADR-0170 Đ2 mục 5, Q-07 (Task 3.2 Đợt 3).
// Hàm thuần, chỉ nhận cờ do máy chủ tính; giao diện không tự suy cờ nào.
import { CAU_VE_QUA_HAN_TRA_SAU, CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC } from "./tra-sau.ts";

/** Người xem giữ quyền Đối tác, tiền đang chờ Công ty xác nhận (không phải ca chính họ lập đơn và còn số chờ nộp). */
export const CAU_CHO_CONG_TY_XAC_NHAN = "Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.";
/**
 * Người xem giữ quyền Đối tác, chính họ lập đơn, còn số chờ nộp, đơn chưa huỷ. Phiếu chữ B-2 phương án (2) — câu DỰ PHÒNG: bước dò của Task 3.2 thấy số chờ nộp (`choNop`) gộp cả
 * khoản đặt cọc do người KHÁC người lập cầm (Kế toán sửa người thu sang nhân viên khác, khoản vẫn mang dấu khoản khai), nên câu «Tiền khách ở tay bạn…» có thể nói sai người cầm tiền.
 */
export const CAU_DOI_TAC_CHO_NOP = "Vé mở sau khi Công ty ghi nhận bạn đã nộp tiền.";
/** Người xem là nhân viên văn phòng, tiền còn ở tay đối tác hoặc chờ Kế toán xác nhận. */
export const CAU_CHO_DOI_TAC_NOP = "Đang chờ đối tác nộp tiền về công ty nên chưa xem hoặc gửi được vé.";
/** Khách còn thiếu tiền thật. */
export const CAU_CHUA_THU_DU = "Đơn chưa thu đủ tiền nên chưa xem hoặc gửi được vé.";

export interface CoKhoaVe {
  /** Đơn Trả sau đã quá hạn còn nợ (câu riêng, mã lỗi riêng ở máy chủ). */
  traSauQuaHan: boolean;
  /** Người xem giữ quyền Đối tác. */
  nguoiXemLaDoiTac: boolean;
  /** `choDoiTacNop` của kho vé: chưa mở CHỈ vì tiền chưa về Công ty (khách đã trả đủ trên sổ). */
  choDoiTacNop: boolean;
  /** Người xem giữ quyền Đối tác, là người lập đơn, `tien.choNop > 0`, đơn chưa huỷ. */
  nguoiLapCamTien: boolean;
}

export function cauKhoaVe(d: CoKhoaVe): string {
  if (d.traSauQuaHan) return d.nguoiXemLaDoiTac ? CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC : CAU_VE_QUA_HAN_TRA_SAU;
  if (!d.choDoiTacNop) return CAU_CHUA_THU_DU;
  if (!d.nguoiXemLaDoiTac) return CAU_CHO_DOI_TAC_NOP;
  return d.nguoiLapCamTien ? CAU_DOI_TAC_CHO_NOP : CAU_CHO_CONG_TY_XAC_NHAN;
}
