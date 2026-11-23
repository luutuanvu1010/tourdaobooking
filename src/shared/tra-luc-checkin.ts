// Hình thức «Trả lúc check-in» (ADR-0230 Đ2): khách trả tiền mặt khi check-in, cho hướng dẫn viên hoặc nhân viên Tour Đảo tại nơi đón. Lưu ở bảng chỉ thêm `ord_checkin_payment`
// (migration 0187 phần B); đơn vẫn `payment_term = 'PREPAID'`. Thuần, không I/O — dùng CHUNG máy chủ (cổng lưu đơn của `orders`, cổng người thu của `billing`) và giao diện
// (form Tạo đơn, trang đơn, «Việc của tôi»). Lớp CSDL cùng luật: trigger `ord_checkin_payment_*`, `orders_checkin_payment_prepaid`, `bil_receipt_checkin_cash_only`.
import type { HinhThucThanhToan } from "./tra-sau.ts";

/** Mã nội bộ (bảng tham chiếu, ADR-0167). */
export const TRA_LUC_CHECKIN = "TRA_LUC_CHECKIN";
/** Tên đã chốt (chủ 22/11, ADR-0230). */
export const NHAN_TRA_LUC_CHECKIN = "Trả lúc check-in";
/** Câu ngắn trên form khi chọn hình thức này (thay ô cọc / câu chuyển khoản). */
export const CAU_TRA_LUC_CHECKIN_FORM = "Khách trả tiền mặt khi check-in.";

/** Form: đơn đã chọn «Trả lúc check-in» mà lựa chọn không còn dùng được (đổi bên đặt, công tắc Tắt…) ⇒ về Thanh toán ngay, có báo (không đổi âm thầm). */
export const CAU_CHECKIN_VE_TRA_TRUOC = "Đơn này không còn chọn được «Trả lúc check-in» nên chuyển về Thanh toán ngay. Kiểm lại rồi lưu.";
export const CAU_CHECKIN_CHI_THANH_TOAN_NGAY = "«Trả lúc check-in» chỉ dùng cho đơn Thanh toán ngay. Chọn lại hình thức thanh toán rồi lưu.";
export const CAU_CHECKIN_CONG_TAC_TAT = "Đơn này lập lúc khách của đối tác trả tiền cho đối tác, nên không chọn được «Trả lúc check-in».";
export const CAU_CHECKIN_CHI_TIEN_MAT = "Đơn «Trả lúc check-in» chỉ nhận tiền mặt. Không nhận chuyển khoản hay mã QR cho đơn này.";

export type KetQuaTraLucCheckin = { ok: true } | { ok: false; ma: "tra_luc_checkin_chi_thanh_toan_ngay" | "tra_luc_checkin_cong_tac_tat"; cau: string };

/**
 * Cổng lưu đơn (lập mới, lưu nháp) của máy chủ. `congTyThuLucLap` = dấu «Khách của đối tác trả cho Công ty» chụp trên đơn (`company_collects_snapshot`): null = đơn văn phòng lập,
 * 1 = đơn tài khoản Đối tác lập lúc Bật, 0 = lúc Tắt. Đối tác CÓ Trả sau dùng được không ở đây: «Trả lúc check-in» là đơn Thanh toán ngay nên luật ADR-0224 (cổng `congTraSauKhiLuu`)
 * đã từ chối như mọi đơn Thanh toán ngay của đối tác đó (ADR-0230 Đ1 mục 5: «không đủ ⇒ như hôm nay cộng Trả lúc check-in»).
 */
export function traLucCheckinHopLe(i: { chon: boolean; hinhThuc: HinhThucThanhToan; congTyThuLucLap: 0 | 1 | null }): KetQuaTraLucCheckin {
  if (!i.chon) return { ok: true };
  if (i.hinhThuc !== "PREPAID") return { ok: false, ma: "tra_luc_checkin_chi_thanh_toan_ngay", cau: CAU_CHECKIN_CHI_THANH_TOAN_NGAY };
  if (i.congTyThuLucLap === 0) return { ok: false, ma: "tra_luc_checkin_cong_tac_tat", cau: CAU_CHECKIN_CONG_TAC_TAT };
  return { ok: true };
}

/**
 * Form Tạo đơn: có hiện lựa chọn «Trả lúc check-in» không. Văn phòng: luôn. Đối tác (`laDoiTacTraSau`): công tắc hiện hành Bật (`congTyThu` từ `con-duoc-dung`; null = chưa biết ⇒
 * không hiện) VÀ luật ADR-0224 (`hinhThucDuocNhan`) còn nhận «Thanh toán ngay» — cùng điều kiện máy chủ áp ở `traLucCheckinHopLe` + `congTraSauKhiLuu`.
 */
export function traLucCheckinDuocChon(i: { laDoiTac: boolean; congTyThu: boolean | null; chonDuoc: readonly HinhThucThanhToan[] }): boolean {
  if (!i.laDoiTac) return true;
  return i.congTyThu === true && i.chonDuoc.includes("PREPAID");
}

export type KetQuaCheckinChiTienMat = { ok: true } | { ok: false; ma: "tra_luc_checkin_chi_tien_mat"; cau: string };

/**
 * Cổng người thu (billing `kiemNguoiThuKenh`): đơn «Trả lúc check-in», khoản khách trả MỚI có người thu phía Tour Đảo (Công ty, nhân viên / HDV) chỉ được là tiền mặt. Miễn GIỐNG luật
 * ADR-0225 (`thuHoChiTienMat`) và trigger 0187 mục 10: bên đặt (BOOKER), quầy nhà cung cấp (SUPPLIER), người thu là chính hồ sơ của tài khoản Đối tác đã lập đơn.
 */
export function checkinChiTienMat(i: { traLucCheckin: boolean; collectorRole: "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER"; method: string; nguoiThuLaDoiTacLapDon: boolean }): KetQuaCheckinChiTienMat {
  if (!i.traLucCheckin) return { ok: true };
  if (i.collectorRole !== "COMPANY" && i.collectorRole !== "STAFF") return { ok: true };
  if (i.collectorRole === "STAFF" && i.nguoiThuLaDoiTacLapDon) return { ok: true };
  if (i.method === "CASH") return { ok: true };
  return { ok: false, ma: "tra_luc_checkin_chi_tien_mat", cau: CAU_CHECKIN_CHI_TIEN_MAT };
}

/** Dòng nhắc ở «Việc của tôi» của hướng dẫn viên: số lấy từ sổ tiền (`conLai`); chưa tải được ⇒ không số. */
export const cauNhacCheckin = (conLai: number | null, dongTien: (n: number) => string): string =>
  conLai === null ? `${NHAN_TRA_LUC_CHECKIN} — cần thu tiền mặt` : conLai > 0 ? `${NHAN_TRA_LUC_CHECKIN} — cần thu ${dongTien(conLai)}` : `${NHAN_TRA_LUC_CHECKIN} — khách đã trả đủ`;
