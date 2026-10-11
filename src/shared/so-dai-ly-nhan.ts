// Nhãn tiếng Việt của sổ đại lý (đặc tả §11: không lộ mã thô). Thuần, dùng ở máy chủ (DTO) và giao diện.
export const NHAN_LY_DO_THIEU = {
  NO_RULE: "Chưa có mức cho dịch vụ này",
  RULE_CONFLICT: "Hai mức khác nhau cùng áp — Kế toán chọn một",
  MANUAL_LINE: "Dòng nhập tay — Kế toán ghi mức",
  BOOKER_NOT_BENEFICIARY: "Bên đặt không thuộc loại được hưởng hoa hồng",
  NOT_CAPTURED: "Đơn xác nhận trước khi có bảng mức",
} as const;
export const CAU_THIEU_MUC = "Thiếu mức — Kế toán xử lý";
/** Luật X3 (đặc tả Phần A điểm 2): dịch vụ đưa đón / nhóm Thuê xe không ghi nhà cung cấp mua lại. MỘT câu cho trigger `prc_supply_term_x3` (route điều khoản) và cho đường ghi mức tay của đơn. */
export const NHOM_THUE_XE = "TXE";
export const CAU_X3_THUE_XE = "Dịch vụ nhóm Thuê xe không ghi nhà cung cấp mua lại (để khỏi tính tiền xe hai lần).";
export const nhanDong = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const nhanTyLeBp = (bp: number): string => {
  const nguyen = Math.floor(bp / 100);
  const le = String(bp % 100).padStart(2, "0").replace(/0+$/, "");
  return le ? `${nguyen},${le}%` : `${nguyen}%`;
};
export const nhanMuc = (m: { kind: "RATE" | "PER_PAX"; rateBp: number | null; perPax: number | null }): string =>
  m.kind === "RATE" ? nhanTyLeBp(m.rateBp ?? 0) : `${nhanDong(m.perPax ?? 0)}đ/khách`;
export const laDongThuongMai = (action: string): boolean => action.startsWith("order_terms_");
