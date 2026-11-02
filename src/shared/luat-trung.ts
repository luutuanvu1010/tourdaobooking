// BẢNG LUẬT TRÙNG DÙNG CHUNG của lớp nghiệp vụ (ADR-0092 đ6, đ6a; đặc tả docs/superpowers/specs/2026-10-06-bang-luat-trung-dung-chung.md). Thuần, không I/O, dùng chung máy chủ ↔ web/.
// Mỗi loại dữ liệu một dòng; câu đọc ứng viên nằm ở module chủ bảng (billing). Chỉ CẢNH BÁO, không chặn: người có quyền bỏ qua bằng lý do, lý do và người bỏ qua vào nhật ký.
// Mã 409 riêng `co_the_trung`, KHÁC `dang_xu_ly` của lớp chống gửi trùng kỹ thuật (ADR-0094) — `api()` không tự gửi lại mã này mà trang hiện hộp thoại.

export const MA_LOI_TRUNG = "co_the_trung";
export const LY_DO_BO_QUA_TOI_THIEU = 10;

export type MaLuatTrung = "lan_thu_tien_mat" | "ma_giao_dich_khac_don";
export interface DongLuatTrung {
  /** Ai được bỏ qua: `nguoi_ghi` = người đang ghi (CT4); `ke_toan` = người có ô `ledger.write` (ADR-0092 đ6). */
  boQua: "nguoi_ghi" | "ke_toan";
  batLyDo: true;
  moTa: string;
}
export const LUAT_TRUNG: Record<MaLuatTrung, DongLuatTrung> = {
  lan_thu_tien_mat: { boQua: "nguoi_ghi", batLyDo: true, moTa: "Cùng đơn, cùng số tiền, cùng ngày, cùng tiền mặt" },
  ma_giao_dich_khac_don: { boQua: "ke_toan", batLyDo: true, moTa: "Cùng mã giao dịch ngân hàng, khác đơn" },
};

/** Một lần ghi cũ có thể trùng. `chiTiet` đã qua lọc theo người xem (không tên người với ai không có `ledger.view` phạm vi any). */
export interface UngVienTrung { soTien: number; ngay: string; maDon?: string; chiTiet?: string }
export interface CanhBaoTrung { ma: MaLuatTrung; cau: string; ungVien: UngVienTrung[]; tongDaGan?: number }
/** Thân `boQuaTrung` của lần gửi lại ("Vẫn ghi"). Thân đổi nên vân tay ADR-0094 tự đổi: đây là ý định mới. */
export interface BoQuaTrung { ma: MaLuatTrung; lyDo: string }

export type KetQuaTrung =
  | { ok: true; boQua: { ma: MaLuatTrung; lyDo: string } | null }
  | { ok: false; canhBao: CanhBaoTrung; lyDoLoi?: string };

const CAU_TRUNG: Record<MaLuatTrung, (n: number) => string> = {
  lan_thu_tien_mat: (n) => `Có thể trùng với ${n > 1 ? `${n} khoản thu tiền mặt` : "một khoản thu tiền mặt"} cùng số tiền, cùng ngày của đơn này.`,
  ma_giao_dich_khac_don: (n) => `Mã giao dịch này đã gắn với ${n > 1 ? `${n} khoản thu` : "một khoản thu"} ở đơn khác. Một lần chuyển có thể trả nhiều đơn, nhưng cần kiểm lại.`,
};

/** MỘT hàm so cho mọi dòng: có ứng viên mà không có lý do bỏ qua hợp lệ của ĐÚNG dòng đó ⇒ cảnh báo. */
export function kiemTrung(ma: MaLuatTrung, v: { ungVien: readonly UngVienTrung[]; boQua: unknown; tongDaGan?: number }): KetQuaTrung {
  if (v.ungVien.length === 0) return { ok: true, boQua: null };
  const canhBao: CanhBaoTrung = { ma, cau: CAU_TRUNG[ma](v.ungVien.length), ungVien: [...v.ungVien], ...(v.tongDaGan !== undefined ? { tongDaGan: v.tongDaGan } : {}) };
  const b = (v.boQua && typeof v.boQua === "object" ? v.boQua : {}) as Partial<BoQuaTrung>;
  if (b.ma !== ma) return { ok: false, canhBao };
  const lyDo = typeof b.lyDo === "string" ? b.lyDo.trim() : "";
  if (lyDo.length < LY_DO_BO_QUA_TOI_THIEU) return { ok: false, canhBao, lyDoLoi: `Lý do vẫn ghi tối thiểu ${LY_DO_BO_QUA_TOI_THIEU} ký tự.` };
  if (lyDo.length > 300) return { ok: false, canhBao, lyDoLoi: "Lý do tối đa 300 ký tự." };
  if (/\d{8,}/.test(lyDo.replace(/[\s.-]/g, ""))) return { ok: false, canhBao, lyDoLoi: "Lý do không được chứa số điện thoại / số tài khoản." };
  return { ok: true, boQua: { ma, lyDo } };
}
