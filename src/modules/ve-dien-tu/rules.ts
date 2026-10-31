// Luật thuần chọn vé (ADR-0153; kế hoạch Task 2). KHÔNG I/O. Ngày dân sự giờ Việt Nam `YYYY-MM-DD`, so chuỗi (cùng độ dài nên so chữ = so ngày).
export type Nhom = "ADULT" | "CHILD" | "SENIOR";
export const NHOM_VE: readonly Nhom[] = ["ADULT", "CHILD", "SENIOR"];
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
