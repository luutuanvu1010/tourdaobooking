// Luật THUẦN của "Tài khoản nhận tiền" của công ty chủ (ADR-0108 đ2; đặc tả QR §4.1). Không I/O. Máy chủ chuẩn hoá rồi mới ghi; CHECK của migration 0087 là
// lớp 2. Tên chủ tài khoản ghi đúng kiểu ngân hàng in: chữ in hoa không dấu và số.

export const SO_TAI_KHOAN_RE = /^\d{4,19}$/;
export const TEN_CHU_TAI_KHOAN_RE = /^[A-Z0-9 ]{2,100}$/;
export const MA_NGAN_HANG_RE = /^[A-Z0-9]{2,12}$/;
const MA_DONG_RE = /^[0-9A-Za-z_-]{1,64}$/;

export function chuanHoaTenChuTaiKhoan(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "D").toUpperCase().replace(/\s+/g, " ").trim();
}

export interface TaiKhoanNhap {
  maNganHang: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
  /** Khoá lạc quan: id dòng đang mở mà người sửa đã thấy (null = chưa có tài khoản). Bắt buộc ghi rõ. */
  truocDo: string | null;
}

export function docTaiKhoanNhanTien(raw: unknown): { ok: true; value: TaiKhoanNhap } | { ok: false; cau: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, cau: "Thiếu thông tin tài khoản." };
  const b = raw as Record<string, unknown>;
  if (typeof b.maNganHang !== "string" || !MA_NGAN_HANG_RE.test(b.maNganHang)) return { ok: false, cau: "Chọn ngân hàng trong danh sách." };
  const so = typeof b.soTaiKhoan === "string" ? b.soTaiKhoan.replace(/[\s.-]/g, "") : "";
  if (!SO_TAI_KHOAN_RE.test(so)) return { ok: false, cau: "Số tài khoản chỉ gồm chữ số (4–19 số)." };
  const ten = typeof b.chuTaiKhoan === "string" ? chuanHoaTenChuTaiKhoan(b.chuTaiKhoan) : "";
  if (!TEN_CHU_TAI_KHOAN_RE.test(ten)) return { ok: false, cau: "Tên chủ tài khoản ghi đúng như ngân hàng in: chữ không dấu và số, 2–100 ký tự." };
  if (b.truocDo !== null && (typeof b.truocDo !== "string" || !MA_DONG_RE.test(b.truocDo))) return { ok: false, cau: "Thiếu mã tài khoản đang dùng — tải lại rồi thử lại." };
  return { ok: true, value: { maNganHang: b.maNganHang, soTaiKhoan: so, chuTaiKhoan: ten, truocDo: b.truocDo } };
}
