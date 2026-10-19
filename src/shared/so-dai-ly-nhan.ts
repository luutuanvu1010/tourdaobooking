// Nhãn tiếng Việt của sổ đại lý (đặc tả §11: không lộ mã thô). Thuần, dùng ở máy chủ (DTO) và giao diện.
export const NHAN_LY_DO_THIEU = {
  NO_RULE: "Chưa có mức cho dịch vụ này",
  RULE_CONFLICT: "Hai mức khác nhau cùng áp — Kế toán chọn một",
  MANUAL_LINE: "Dòng nhập tay — Kế toán ghi mức",
  BOOKER_NOT_BENEFICIARY: "Bên đặt không thuộc loại được hưởng hoa hồng",
  NOT_CAPTURED: "Đơn xác nhận trước khi có bảng mức",
} as const;
/** Đuôi câu của mọi cảnh báo thiếu mức (dòng đơn và «Thử tra»): nói rõ vì sao và hậu quả. */
export const CAU_THIEU_MUC = "cần cài mức (cấp) thì mới tính được hoa hồng";
export const CAU_DON_BI_GIU = "đơn bị giữ ở bước Đã giao";
/** Luật X3 (đặc tả Phần A điểm 2): dịch vụ đưa đón / nhóm Thuê xe không ghi nhà cung cấp mua lại. MỘT câu cho trigger `prc_supply_term_x3` (route điều khoản) và cho đường ghi mức tay của đơn. */
export const NHOM_THUE_XE = "TXE";
export const CAU_X3_THUE_XE = "Dịch vụ nhóm Thuê xe không ghi nhà cung cấp mua lại (để khỏi tính tiền xe hai lần).";
export const nhanDong = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const nhanTyLeBp = (bp: number): string => {
  const nguyen = Math.floor(bp / 100);
  const le = String(bp % 100).padStart(2, "0").replace(/0+$/, "");
  return le ? `${nguyen},${le}%` : `${nguyen}%`;
};
/** `theoLoai` (ADR-0133): mức đ/khách tách theo loại — nêu đủ ba số, ô khai 0 hiện «0đ» rõ ràng (điều 2). */
export const nhanMuc = (m: { kind: "RATE" | "PER_PAX"; rateBp: number | null; perPax: number | null; theoLoai?: { adult: number; child: number; senior: number } | null }): string =>
  m.kind === "RATE" ? nhanTyLeBp(m.rateBp ?? 0)
    : m.theoLoai ? `người lớn ${nhanDong(m.theoLoai.adult)}đ · trẻ em ${nhanDong(m.theoLoai.child)}đ · người cao tuổi ${nhanDong(m.theoLoai.senior)}đ/khách`
    : `${nhanDong(m.perPax ?? 0)}đ/khách`;
export const laDongThuongMai = (action: string): boolean => action.startsWith("order_terms_") || action.startsWith("ord_terms_");
