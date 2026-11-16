// Luật thuần dùng chung (máy chủ + giao diện) cho phí đưa đón do văn phòng chọn trên đơn (ADR-0214).
// Danh sách mức và trần CHỈ ở đây; trigger migration 0173 có bài so khớp (src/migrations-phi-don-chon.test.ts).
export const DANH_SACH_PHI_DON: readonly number[] = [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000];
export const TRAN_PHI_DON = 5_000_000;

export const CAU_VUOT_TRAN_PHI_DON = "Mức phí tối đa 5.000.000 đ.";
/** Câu tạm: chưa có trong docs/BANG-THAM-CHIEU.md (đưa vào ở Task 6). */
export const CAU_KHONG_HOP_LE_PHI_DON = "Chọn phí đưa đón trong danh sách hoặc gõ số tiền hợp lệ.";

export type MucChon = { loai: "DANH_SACH" | "SO_KHAC"; soTien: number };
export type LoiMucChon = "VUOT_TRAN" | "KHONG_HOP_LE";

/** Kiểm lại MỌI giá trị từ trình duyệt: chỉ nhận object {loai, soTien} với số nguyên thật (không chuỗi, NaN, âm, thập phân). */
export function kiemMucChon(v: unknown): { ok: true; muc: MucChon } | { ok: false; loi: LoiMucChon } {
  const sai = { ok: false, loi: "KHONG_HOP_LE" } as const;
  if (typeof v !== "object" || v === null || Array.isArray(v)) return sai;
  const { loai, soTien } = v as Record<string, unknown>;
  if (typeof soTien !== "number" || !Number.isInteger(soTien)) return sai;
  if (loai === "DANH_SACH") return DANH_SACH_PHI_DON.includes(soTien) ? { ok: true, muc: { loai, soTien } } : sai;
  if (loai === "SO_KHAC") {
    if (soTien > TRAN_PHI_DON) return { ok: false, loi: "VUOT_TRAN" };
    return soTien >= 1 ? { ok: true, muc: { loai, soTien } } : sai;
  }
  return sai;
}

/** Số lượng 0 ⇒ null (không dòng). Tích không phải số nguyên an toàn ⇒ ném RangeError (người gọi chặn số khách khổng lồ từ trước; không cắt, không làm tròn). */
export function tinhPhiChon(v: { muc: MucChon; xeRieng: boolean; direction: "OUT" | "RETURN"; soKhachTinhTien: number; paxOverride: number | null }): { donGia: number; soLuong: number; tien: number } | null {
  const soLuong = v.xeRieng ? 1 : v.direction === "RETURN" && v.paxOverride !== null ? Math.min(v.paxOverride, v.soKhachTinhTien) : v.soKhachTinhTien;
  if (soLuong <= 0) return null;
  const tien = v.muc.soTien * soLuong;
  if (!Number.isSafeInteger(tien)) throw new RangeError("Số khách hoặc số tiền quá lớn để tính phí đưa đón.");
  return { donGia: v.muc.soTien, soLuong, tien };
}
