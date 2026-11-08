// Tách nhiệm vụ (ADR-0187 Đ3 mức (a), chủ duyệt 2026-11-08 «Duyệt, mức a»): một người KHÔNG tự xác nhận tiền cho đơn mình lập — máy chủ vẫn cho ghi nhưng
// gắn dấu «tự ghi đơn mình lập»; Kế toán khác hoặc Toàn quyền bấm «Đã soát». Luật THUẦN dùng chung máy chủ (route của nhóm `O_GHI_TIEN`) và giao diện
// (Sổ công nợ, Trang chủ). Đổi luật tách nhiệm vụ = sửa tệp này + ADR mới (bảng «đổi gì kéo gì» của ADR-0187); bài quét `src/tach-nhiem-vu-route.test.ts`
// đòi mọi route ghi tiền gọi `tuGhiDonMinhLap` (hoặc `dauTuGhi` của billing/index.ts, cùng hàm) SAU `can()`. Không import gì.

/** Người gọi (`staffId`) có phải người lập đơn (`ownerId`) không. Đơn không rõ người lập ⇒ không dấu. */
export const tuGhiDonMinhLap = (ownerId: string | null | undefined, staffId: string): boolean => !!ownerId && ownerId === staffId;

/** Thân phản hồi của route ghi tiền: thêm cờ chỉ khi có dấu (không gửi `false` để thân cũ không đổi). */
export const dauTuGhiThan = (tuGhi: boolean): { tuGhiDonMinhLap?: true } => (tuGhi ? { tuGhiDonMinhLap: true } : {});

// Chữ (nguyên văn ADR-0187 Đ3 mức (a) đã duyệt — nguồn tên trong Bảng tham chiếu).
export const NHAN_TU_GHI = "Tự ghi đơn mình lập";
export const NHAN_CAN_SOAT = "Cần người thứ hai soát";
export const NUT_DA_SOAT = "Đã soát";
/** Dòng phụ của thẻ Trang chủ. */
export const PHU_CAN_SOAT = "Tiền do chính người lập đơn ghi — cần người thứ hai soát";
/** Mã lỗi khi người ghi tự bấm «Đã soát». */
export const MA_TU_SOAT = "tu_soat";
export const CAU_TU_SOAT = "Bạn là người đã ghi dòng tiền này nên không tự soát được. Nhờ Kế toán khác hoặc Toàn quyền bấm «Đã soát».";
export const CAU_DA_SOAT_ROI = "Dòng này đã có người soát.";
export const CAU_CHUA_CO_DONG = "Không có dòng tiền nào cần người thứ hai soát.";
/** Số ngày giữ dòng đã soát trong danh sách để Kế toán còn thấy ai đã soát. */
export const NGAY_GIU_DA_SOAT = 30;

/** Câu trạng thái một dòng: đã soát bởi ai lúc nào, hay còn chờ. */
export function cauTrangThaiSoat(d: { nguoiSoat: string | null; soatLuc: string | null }, dinhDangGio: (iso: string) => string): string {
  return d.nguoiSoat && d.soatLuc ? `${NUT_DA_SOAT} · ${d.nguoiSoat} · ${dinhDangGio(d.soatLuc)}` : "Chưa soát";
}
