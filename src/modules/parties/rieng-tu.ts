// Luật thuần: ai xem / ghi được NGÀY SINH và liên hệ ĐỊA CHỈ (ADDRESS) của một hồ sơ (ADR-0122 đ5; Hiến chương 5.20, 5.23). Không I/O.
// Xem: chính chủ, hoặc người giữ ô party.personal.view — với hồ sơ gắn tài khoản thì còn phải quản được tài khoản đó (cấp bậc, ruling R6).
// Ghi: như xem nhưng KHÔNG BAO GIỜ cho chính chủ (giá trị tự khai là đề xuất, người khác xác minh — 5.23; phiếu tự khai ở lát H-4).
import type { PartyDto } from "../../shared/contracts.ts";

export const LOAI_LIEN_HE_RIENG_TU = ["ADDRESS"] as const;
export interface NguoiXem {
  /** can(staff, "party.personal.view") — người gọi hỏi bằng chuỗi ô nguyên văn (bài permission-enforcement). */
  coO: boolean;
  /** staff.partyId === id hồ sơ. */
  laChinhChu: boolean;
  hoSoCoTaiKhoan: boolean;
  /** ctx.partyAccount(id).manageable — chỉ có nghĩa khi hoSoCoTaiKhoan. */
  quanDuocTaiKhoan: boolean;
}
const quaCapBac = (v: NguoiXem): boolean => !v.hoSoCoTaiKhoan || v.quanDuocTaiKhoan;
export const xemDuocRiengTu = (v: NguoiXem): boolean => v.laChinhChu || (v.coO && quaCapBac(v));
export const ghiDuocRiengTu = (v: NguoiXem): boolean => !v.laChinhChu && v.coO && quaCapBac(v);
export const laLienHeRiengTu = (kind: string): boolean => (LOAI_LIEN_HE_RIENG_TU as readonly string[]).includes(kind);

/** DTO cho người KHÔNG được xem: bỏ hẳn khoá birthDate (không để null — phân biệt "không được xem" với "chưa khai") và mọi dòng liên hệ riêng tư. */
export function anTruongRiengTu(p: PartyDto): PartyDto {
  const { birthDate: _boQua, ...con } = p;
  return { ...con, contacts: p.contacts.filter((c) => !laLienHeRiengTu(c.kind)) };
}
