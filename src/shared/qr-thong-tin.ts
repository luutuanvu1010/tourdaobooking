// Các dòng in dưới mã QR thanh toán, trên màn đơn VÀ trên ảnh lưu (ADR-0108 đ3; đặc tả QR §4.2): MỘT nơi định nghĩa, chỉ đọc các trường của DTO danh sách
// trắng, chép TỪNG trường (không trải đối tượng). Tiền theo dạng đặc tả "1.000.000đ". Hàm thuần.
import type { QrThanhToanDto } from "./contracts.ts";

export const soTienQr = (n: number): string => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;

export function dongThongTinQr(d: QrThanhToanDto): string[] {
  return [d.congTy, `${d.nganHang} · ${d.soTaiKhoan}`, `Chủ tài khoản: ${d.chuTaiKhoan}`, `Số tiền: ${soTienQr(d.soTien)}`, `Nội dung: ${d.noiDung}`, `Mã đơn: ${d.maDon}`];
}
