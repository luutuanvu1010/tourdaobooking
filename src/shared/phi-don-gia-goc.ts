// Hằng số dùng chung máy chủ + giao diện của phí đưa đón do máy tính (ADR-0218 Đ1.5). Trigger migration 0179 lặp lại trần đổi tay ở lưới CSDL.
/** Trần đơn giá số đổi tay (đi chung: mỗi khách; xe riêng: cả chuyến) — áp lên ĐƠN GIÁ, không phải thành tiền. */
export const TRAN_MUC_PHI_DON = 5_000_000;
/** Độ dài tối đa của lý do đổi phí. */
export const TOI_DA_LY_DO_DOI_PHI = 300;
export const CAU_LY_DO_DOI_PHI = "Nhập lý do đổi phí.";
export const CAU_LY_DO_DOI_PHI_DAI = `Lý do đổi phí tối đa ${TOI_DA_LY_DO_DOI_PHI} ký tự.`;
export const CAU_DON_GIA_DOI_PHI = "Đơn giá phí đưa đón phải là số nguyên từ 0 đến 5.000.000 đ.";
/** Câu 400 `client_outdated`: trình duyệt còn bản cũ gửi thân `phiDon` kiểu danh sách mức. */
export const CAU_BAN_CU = "Nền tảng vừa cập nhật. Tải lại trang rồi thử lại.";

/** Câu 400 `transfer_fee_not_allowed` (tài khoản Đối tác gửi số đổi phí) và lời nhắc trên biểu mẫu của Đối tác — MỘT nguồn (ADR-0214 Đ2 giữ, ADR-0218 Đ1.5). */
export const CAU_VAN_PHONG_DOI_PHI_DON = "Phí đưa đón do Nền tảng tự tính, chỉ văn phòng đổi được.";

export type DoiPhi = { donGia: number; lyDo: string };
export type LoiDoiPhi = "DON_GIA" | "LY_DO_RONG" | "LY_DO_DAI";
/** Kiểm MỌI giá trị từ trình duyệt: `donGia` là số nguyên thật 0–5.000.000 (0 được nhận); `lyDo` chuỗi không rỗng sau khi cắt khoảng trắng, ≤ 300 ký tự. */
export function kiemDoiPhi(v: unknown): { ok: true; doiPhi: DoiPhi } | { ok: false; loi: LoiDoiPhi; cau: string } {
  const sai = (loi: LoiDoiPhi, cau: string) => ({ ok: false, loi, cau }) as const;
  if (typeof v !== "object" || v === null || Array.isArray(v)) return sai("DON_GIA", CAU_DON_GIA_DOI_PHI);
  const { donGia, lyDo } = v as Record<string, unknown>;
  if (typeof donGia !== "number" || !Number.isInteger(donGia) || donGia < 0 || donGia > TRAN_MUC_PHI_DON) return sai("DON_GIA", CAU_DON_GIA_DOI_PHI);
  if (typeof lyDo !== "string" || lyDo.trim().length === 0) return sai("LY_DO_RONG", CAU_LY_DO_DOI_PHI);
  if (lyDo.trim().length > TOI_DA_LY_DO_DOI_PHI) return sai("LY_DO_DAI", CAU_LY_DO_DOI_PHI_DAI);
  return { ok: true, doiPhi: { donGia, lyDo: lyDo.trim() } };
}
