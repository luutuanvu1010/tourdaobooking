// Chữ hiện của màn «Hạn mức trả sau» và khối Thanh toán trên đơn (ADR-0168). Thuần, không DOM. Lý do khoá lấy từ `CAU_KHOA_QUA_HAN` — cùng ý với câu máy chủ (`lyDoKhongTraSau`).
import { NHAN_HINH_THUC, dongTien, type HinhThucThanhToan } from "./tra-sau.ts";
import { ngayDayDu } from "./vn-date.ts";
import { boDau } from "./so-cong-no-hien-thi.ts";

const CAU_KHOA_QUA_HAN = "Bên đặt còn đơn trả sau quá hạn chưa thanh toán nên chưa đặt thêm đơn trả sau được.";

/** Cảnh báo ở màn hạn mức khi nợ vượt hạn mức hiện hành (thay R-CRD-3); `null` = không có gì cần báo. */
export function canhBaoVuotHanMuc(d: { hanMuc: number | null; dangNo: number }): string | null {
  if (d.hanMuc === null) return d.dangNo > 0 ? `Đang nợ ${dongTien(d.dangNo)} nhưng không còn hạn mức trả sau đang hiệu lực.` : null;
  return d.dangNo > d.hanMuc ? `Đang nợ ${dongTien(d.dangNo)}, vượt hạn mức hiện hành ${dongTien(d.hanMuc)}.` : null;
}

export const cauHanMuc = (d: { hanMuc: number | null; soNgay: number | null }): string =>
  d.hanMuc === null || d.soNgay === null ? "Chưa có hạn mức" : `${dongTien(d.hanMuc)} · ${d.soNgay} ngày`;

export const nhanQuaHan = (soDon: number): string | null => (soDon > 0 ? `${soDon} đơn quá hạn` : null);

/** Nhãn hình thức thanh toán ở chi tiết đơn: «Trả trước», «Trả sau · hạn trả 10/11/2026». */
export const nhanHinhThucDon = (hinh: HinhThucThanhToan, hanTra: string | null): string =>
  hinh === "CREDIT" && hanTra ? `${NHAN_HINH_THUC.CREDIT} · hạn trả ${ngayDayDu(hanTra)}` : NHAN_HINH_THUC[hinh];

/** Khối chọn hình thức ở màn đặt đơn: ẩn khi bên đặt không có hạn mức; khoá (kèm lý do) khi còn đơn quá hạn. */
export function cauChonTraSau(r: { coHanMuc: boolean; conDuocDung: number; coDonQuaHan: boolean }): { hien: boolean; khoa: string | null; cau: string } {
  if (!r.coHanMuc) return { hien: false, khoa: null, cau: "" };
  return { hien: true, khoa: r.coDonQuaHan ? CAU_KHOA_QUA_HAN : null, cau: `Còn được dùng ${dongTien(r.conDuocDung)}` };
}

const HAN_MUC_TOI_DA = 10_000_000_000; // cùng trần `MAX_SO_TIEN` của máy chủ (billing/service.ts)

export function docHanMuc(raw: string): { ok: true; dong: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/\./g, "");
  if (!/^\d+$/.test(s) || Number(s) < 1) return { ok: false, message: "Hạn mức là số tiền nguyên đồng lớn hơn 0 (vd 50.000.000)." };
  return Number(s) > HAN_MUC_TOI_DA ? { ok: false, message: `Hạn mức không quá ${dongTien(HAN_MUC_TOI_DA)}.` } : { ok: true, dong: Number(s) };
}

export function docSoNgay(raw: string): { ok: true; ngay: number } | { ok: false; message: string } {
  const s = raw.trim();
  return /^\d{1,3}$/.test(s) && Number(s) >= 1 && Number(s) <= 365 ? { ok: true, ngay: Number(s) } : { ok: false, message: "Số ngày được nợ là số nguyên từ 1 đến 365." };
}

export const CAU_VE_TRA_TRUOC = "Bên đặt không còn hạn mức trả sau dùng được nên đơn này chuyển về Trả trước. Kiểm lại rồi lưu.";

/**
 * Sau khi biết hạn mức của bên đặt, đơn đang chọn hình thức nào: dùng được thì giữ nguyên; không dùng được (không hạn mức, hoặc còn đơn quá hạn)
 * thì về Trả trước KÈM câu báo nếu đang là Trả sau — không bao giờ đổi âm thầm, và luôn có một hình thức rõ ràng để gửi lên máy chủ.
 */
export function quyetHinhThuc(i: { dangChon: HinhThucThanhToan; c: ReturnType<typeof cauChonTraSau>; benDatChuaNap?: boolean }): { chon: HinhThucThanhToan; bao: string | null } {
  if (i.dangChon === "PREPAID" || i.benDatChuaNap) return { chon: i.dangChon, bao: null }; // bên đặt chưa nạp xong (đang mở nháp): chưa đủ căn cứ để đổi lựa chọn của người dùng
  return i.c.hien && i.c.khoa === null ? { chon: "CREDIT", bao: null } : { chon: "PREPAID", bao: CAU_VE_TRA_TRUOC };
}

/**
 * Danh sách hồ sơ để chọn ở biểu mẫu «Đặt hạn mức»: lọc theo tên không phân biệt dấu và hoa thường (ô tìm chung của Danh bạ dùng LIKE của SQLite,
 * nên «đại lý» không ra «Đại Lý»), xếp theo tên tiếng Việt, hiện tối đa `toiDa` dòng; `conLai` = số hồ sơ khớp chưa hiện, để màn nhắc gõ thêm.
 */
export function locHoSoTraSau<T extends { ten: string }>(ds: readonly T[], tu: string, toiDa = 20): { hien: T[]; conLai: number } {
  const q = boDau(tu.trim());
  const khop = ds.filter((x) => q === "" || boDau(x.ten).includes(q)).sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  return { hien: khop.slice(0, toiDa), conLai: Math.max(0, khop.length - toiDa) };
}
