// Luật thuần chọn vé (ADR-0153; kế hoạch Task 2). KHÔNG I/O. Ngày dân sự giờ Việt Nam `YYYY-MM-DD`, so chuỗi (cùng độ dài nên so chữ = so ngày).
export type Nhom = "ADULT" | "CHILD" | "SENIOR";
export const NHOM_VE: readonly Nhom[] = ["ADULT", "CHILD", "SENIOR"];
/** Loại khách của LÔ: thêm `ALL` cho vé không phân biệt loại khách (ADR-0157). Suất phân bổ vẫn chỉ mang `Nhom`. */
export type NhomLo = Nhom | "ALL";
export interface VeTrong { id: string; valid_from: string; valid_to: string }

const nguyenDuong = (x: number): number => (Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);

/** Số vé cần theo nhóm. Em bé miễn phí KHÔNG có vé (đặc tả §2, §4.5). */
export function canVe(pax: { adult: number; child: number; senior: number; infant: number }): Record<Nhom, number> {
  return { ADULT: nguyenDuong(pax.adult), CHILD: nguyenDuong(pax.child), SENIOR: nguyenDuong(pax.senior) };
}

/** Vé dùng được vào ngày đi: khoảng ngày của vé chứa ngày đi, hai đầu gồm (vé một ngày chỉ khớp đúng ngày). */
export const veDungDuoc = (v: { valid_from: string; valid_to: string }, ngayDi: string): boolean => v.valid_from <= ngayDi && ngayDi <= v.valid_to;

/** Chọn tối đa `can` vé dùng được, hết hạn sớm nhất trước, hoà thì theo id (kết quả xác định). Không đổi mảng đầu vào. */
export function chonVe(kho: readonly VeTrong[], can: number, ngayDi: string): VeTrong[] {
  const n = nguyenDuong(can);
  if (n === 0) return [];
  return kho
    .filter((v) => veDungDuoc(v, ngayDi))
    .sort((a, b) => (a.valid_to < b.valid_to ? -1 : a.valid_to > b.valid_to ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, n);
}

/** Số vé còn thiếu theo nhóm (không âm). */
export function thieuVe(can: Record<Nhom, number>, daGiu: Record<Nhom, number>): Record<Nhom, number> {
  return { ADULT: Math.max(0, can.ADULT - daGiu.ADULT), CHILD: Math.max(0, can.CHILD - daGiu.CHILD), SENIOR: Math.max(0, can.SENIOR - daGiu.SENIOR) };
}

/**
 * «Thu đủ» để mở khoá xem / giao vé (ADR-0153 Đ3): đã thu ròng ≥ phải thu VÀ phải thu > 0. `null` (không đọc được tiền, hoặc khung thử không tiêm) hoặc phải thu 0 ⇒ KHÔNG mở.
 * MỘT hàm cho mọi nơi so — route không tự viết lại phép so.
 */
export function thuDu(t: { daThu: number; phaiThu: number } | null): boolean {
  return t !== null && t.phaiThu > 0 && t.daThu >= t.phaiThu;
}

/** ADR-0159 Đ2 mục 2, ADR-0170 Đ2: chưa mở vé CHỈ vì tiền còn ở tay đối tác hoặc đang chờ Kế toán xác nhận (khách đã trả đủ trên sổ). Khách còn thiếu tiền thật thì là ca «chưa thu đủ» thường. Để nói đúng câu, không dùng để mở khoá. */
export function choDoiTacNop(t: { daThu: number; phaiThu: number; choNop?: number; choXacNhan?: number } | null): boolean {
  const cho = (t?.choNop ?? 0) + (t?.choXacNhan ?? 0);
  return t !== null && !thuDu(t) && cho > 0 && t.phaiThu > 0 && t.daThu + cho >= t.phaiThu;
}
