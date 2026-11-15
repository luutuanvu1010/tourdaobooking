// dang-ky/rules.ts — luật thuần của phiếu đăng ký đối tác (ADR-0206 Đ4). Không I/O.
// Đồ thị phải khớp trigger `dk_registration_transition` (migration 0167); bài rules.test.ts đối chiếu hai bên.

export const TRANG_THAI = ["DANG_DIEN", "CHO_XAC_MINH", "CAN_BO_SUNG", "CHO_DUYET", "DA_DUYET", "TU_CHOI", "DA_RUT", "HET_HAN"] as const;
export type TrangThai = (typeof TRANG_THAI)[number];

/** Bốn trạng thái kết thúc: không đổi nữa. */
export const TRANG_THAI_KET_THUC: readonly TrangThai[] = ["DA_DUYET", "TU_CHOI", "DA_RUT", "HET_HAN"];

const DUONG_CHINH: Readonly<Record<TrangThai, readonly TrangThai[]>> = {
  DANG_DIEN: ["CHO_XAC_MINH"],
  CHO_XAC_MINH: ["CAN_BO_SUNG", "CHO_DUYET"],
  CAN_BO_SUNG: ["CHO_XAC_MINH"],
  CHO_DUYET: ["DA_DUYET"],
  DA_DUYET: [],
  TU_CHOI: [],
  DA_RUT: [],
  HET_HAN: [],
};
const THOAT: readonly TrangThai[] = ["TU_CHOI", "DA_RUT", "HET_HAN"];

export const daKetThuc = (t: TrangThai): boolean => TRANG_THAI_KET_THUC.includes(t);

/** Phiếu được đi từ `tu` sang `den` không? Mọi trạng thái chưa kết thúc được sang TỪ CHỐI, ĐÃ RÚT, HẾT HẠN; còn lại theo đường chính. Giữ nguyên chỗ (tu = den) là không phải chuyển. */
export function chuyenHopLe(tu: TrangThai, den: TrangThai): boolean {
  if (daKetThuc(tu)) return false;
  return DUONG_CHINH[tu].includes(den) || THOAT.includes(den);
}
