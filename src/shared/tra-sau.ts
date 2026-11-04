// Luật thuần của thanh toán trả sau theo hạn mức (ADR-0168). Không I/O; dùng chung máy chủ và giao diện.
// Tiền `INTEGER` VNĐ. Ngày dân sự "YYYY-MM-DD" theo giờ Việt Nam (người gọi truyền `homNay` = vnToday).
import { addDays } from "./vn-date.ts";

export type HinhThucThanhToan = "PREPAID" | "CREDIT";

/** Nhãn hiện cho người dùng (trạng thái thô không lộ ra giao diện). */
export const NHAN_HINH_THUC: Record<HinhThucThanhToan, string> = { PREPAID: "Trả trước", CREDIT: "Trả sau" };

export interface HanMucHieuLuc {
  readonly hanMuc: number;
  readonly soNgay: number;
  readonly tuNgay: string;
  readonly denNgay: string | null;
}

/** Số tiền hiện cho người dùng: «5.000.000 ₫». */
export const dongTien = (n: number): string => `${Math.trunc(n).toLocaleString("vi-VN")} ₫`;

/**
 * Nợ của MỘT đơn Trả sau đã xác nhận (ADR-0168 Đ2 mục 2) = max(0, phải thu − số đã về công ty).
 * Số đã về công ty = tổng đã thu ròng − khoản đang chờ đối chiếu − khoản bên đặt tự ghi mà chưa nộp về công ty (kẹp 0).
 * Trả dư ở đơn này không làm nhẹ đơn khác (hàm chỉ nhìn một đơn). Đơn huỷ: không nợ.
 */
export function noMotDon(i: { daHuy: boolean; phaiThu: number; daThuRong: number; dangDoiChieu: number; benDatDangGiu: number }): number {
  if (i.daHuy) return 0;
  const ve = Math.max(0, i.daThuRong - i.dangDoiChieu - i.benDatDangGiu);
  return Math.max(0, i.phaiThu - ve);
}

/** Quá hạn khi còn nợ và ngày hôm nay SAU ngày hạn trả (đúng ngày hạn chưa quá hạn). */
export function quaHan(hanTra: string | null, homNay: string, no: number): boolean {
  return no > 0 && hanTra !== null && homNay > hanTra;
}

/** Hạn trả = ngày xác nhận + số ngày đang áp (chụp một lần). */
export function hanTraTu(ngayXacNhan: string, soNgay: number): string {
  return addDays(ngayXacNhan, soNgay);
}

export type MaKhongTraSau = "khong_co_han_muc" | "vuot_han_muc" | "co_don_qua_han";

/** Lý do một đơn không được xác nhận theo Trả sau (ADR-0168 Đ2 mục 3); `null` = được. */
export function lyDoKhongTraSau(i: { hanMuc: HanMucHieuLuc | null; noHienTai: number; soTienDon: number; coDonQuaHan: boolean }): { ma: MaKhongTraSau; cau: string } | null {
  if (!i.hanMuc) return { ma: "khong_co_han_muc", cau: "Bên đặt chưa có hạn mức trả sau còn hiệu lực. Hãy chọn trả trước hoặc nhờ Toàn quyền cấp hạn mức." };
  if (i.coDonQuaHan) return { ma: "co_don_qua_han", cau: "Bên đặt còn đơn trả sau quá hạn chưa thanh toán. Cần thanh toán đủ các đơn đó trước khi đặt thêm đơn trả sau." };
  const conLai = Math.max(0, i.hanMuc.hanMuc - i.noHienTai);
  if (i.soTienDon > conLai) {
    return { ma: "vuot_han_muc", cau: `Đơn trả sau ${dongTien(i.soTienDon)} vượt hạn mức: bên đặt còn được dùng ${dongTien(conLai)} (hạn mức ${dongTien(i.hanMuc.hanMuc)}, đang nợ ${dongTien(i.noHienTai)}).` };
  }
  return null;
}

/**
 * MỘT hàm duy nhất quyết định vé có mở được không (ADR-0168 Đ3 mục 1), thay cho so `thuDu` ở các route vé và giao diện vé.
 * Đơn Trả trước: phải thu đủ. Đơn Trả sau: mở được, trừ khi đã quá hạn còn nợ mà vé CHƯA mở (vé đã mở vẫn xem được).
 */
export function moVeDuoc(i: { thuDu: boolean; traSau: { hanTra: string | null; no: number } | null; veDaMo: boolean; homNay: string }): boolean {
  if (!i.traSau) return i.thuDu;
  if (i.veDaMo) return true;
  return !quaHan(i.traSau.hanTra, i.homNay, i.traSau.no);
}
