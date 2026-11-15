// Dấu «đã xác minh» của hồ sơ (ADR-0210): TẬP ĐÓNG của mục bắt buộc (Task 5, migration 0168) và hàm THUẦN tính ba trạng thái (Task 10), dùng chung máy chủ và giao diện.
// Tập này phải khớp trigger `pty_verification_requirement_item_closed` (bài src/modules/parties/tep-cho.test.ts đối chiếu): muốn thêm mục thì thêm ô vào phiếu đăng ký
// trước (một lần sửa mã), rồi sửa tập này và tạo lại trigger bằng migration mới.

export const MUC_XAC_MINH_MO = {
  ATTRIBUTE: ["HO_TEN", "NGAY_SINH"],
  DOCUMENT: ["CCCD"],
} as const;

export type LoaiMucXacMinh = keyof typeof MUC_XAC_MINH_MO;

/** Ba dấu. Tên hiển thị do chủ chốt 15/11 (ADR-0210, nguyên văn lời chủ). */
export type DauXacMinh = "DA" | "CHUA" | "CAN_LAI";
export const TEN_DAU_XAC_MINH: Record<DauXacMinh, string> = { DA: "Đã xác minh", CHUA: "Chưa xác minh", CAN_LAI: "Cần xác minh lại" };

/** Một hàng của view `v_pty_verification_facts` (ADR-0210 Đ2) đã đổi sang chữ camelCase: dữ kiện của MỘT mục bắt buộc. `loaiMuc` null = loại hồ sơ này chưa có mục bắt buộc nào. */
export interface DuKienXacMinh {
  loaiMuc: LoaiMucXacMinh | null;
  maMuc: string | null;
  /** Kết luận mới nhất của mục (thuộc tính; hoặc dòng giấy tờ hiện hành). null = chưa có. */
  ketLuanMoiNhat: string | null;
  /** Đã từng có kết luận «đạt» cho mục này (kể cả trên dòng giấy tờ cũ cùng loại). */
  tungDat: boolean;
  /** Mã dòng giấy tờ hiện hành (chưa huỷ, chưa thay bằng dòng gia hạn, chưa ẩn danh). null = không có (mục thuộc tính, hoặc giấy tờ đã huỷ / chưa khai). */
  maGiayTo: string | null;
  /** Ngày hết hạn 'YYYY-MM-DD' của dòng giấy tờ hiện hành; null = không hạn. */
  hetHan: string | null;
  laDoiTac: boolean;
  anDanh: boolean;
}

const bool = (v: unknown): boolean => v === 1 || v === true || v === "1";
/** Hàng thô của view (tên cột snake_case) → dữ kiện cho hàm. Không đọc cột nào khác. */
export function dkienTuView(r: Record<string, unknown>): DuKienXacMinh {
  return {
    loaiMuc: (r.item_kind as LoaiMucXacMinh | null) ?? null, maMuc: (r.item_code as string | null) ?? null,
    ketLuanMoiNhat: (r.last_outcome as string | null) ?? null, tungDat: bool(r.ever_passed),
    maGiayTo: (r.doc_id as string | null) ?? null, hetHan: (r.expiry_date as string | null) ?? null,
    laDoiTac: bool(r.is_partner), anDanh: bool(r.anonymized),
  };
}

/**
 * Luật dấu xác minh (ADR-0210 Đ2), thuần. `dkien` = mọi hàng view của MỘT hồ sơ; `homNay` = ngày hôm nay giờ Việt Nam (`vnToday`) — hàm không tự đọc đồng hồ.
 * `coTaiKhoan`: hồ sơ này có tài khoản (view không đọc bảng tài khoản của module khác, nên người gọi truyền vào). Trả null (không hiện dấu) khi không có tài khoản
 * và không mang vai đối tác — khách lẻ. Hồ sơ đã ẩn danh: «Chưa». Danh sách mục bắt buộc rỗng: «Chưa» (không có gì để khẳng định). Giấy tờ còn hạn tới hết ngày `hetHan`.
 */
export function tinhDauXacMinh(dkien: readonly DuKienXacMinh[], homNay: string, coTaiKhoan: boolean): DauXacMinh | null {
  if (!coTaiKhoan && !dkien.some((d) => d.laDoiTac)) return null;
  if (dkien.some((d) => d.anDanh)) return "CHUA";
  const muc = dkien.filter((d) => d.loaiMuc !== null);
  if (muc.length === 0) return "CHUA";
  const dat = (d: DuKienXacMinh): boolean =>
    d.ketLuanMoiNhat === "DA_XAC_MINH" && (d.loaiMuc !== "DOCUMENT" || (d.maGiayTo !== null && (d.hetHan === null || d.hetHan >= homNay)));
  if (muc.every(dat)) return "DA";
  return muc.some((d) => d.tungDat) ? "CAN_LAI" : "CHUA";
}
