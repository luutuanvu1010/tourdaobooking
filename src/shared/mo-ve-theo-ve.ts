// ADR-0175 Đ2.1, Đ2.2 — cổng mở vé quyết THEO TỪNG VÉ (luật thuần, không I/O). Module vé gọi hàm này qua `veMoDuoc` (một cửa) cho mọi đường xem, gửi, tạo đường dẫn.
import type { NguonVe } from "./nguon-ve.ts";

/**
 * `moTheoTien` = kết quả `moVeDuoc` hiện hành (`tra-sau.ts`: Trả trước phải thu đủ; Trả sau mở trước trừ khi hết ân hạn còn nợ mà vé chưa mở). Vé hãng ngoài: đúng giá trị
 * đó, không thêm điều kiện nào (Đ2.1). Vé Tour Đảo (Đ2.2): đơn phải đã xác nhận (`confirmed`; «Khách đã trả đủ» là cờ riêng, đơn vẫn `confirmed`; đơn huỷ không bao giờ), rồi
 * đơn ngoài diện đối tác thì mở ngay, đơn thuộc diện đối tác (tài khoản Đối tác tự lập, hoặc bên đặt là hồ sơ đối tác) thì theo cổng tiền.
 */
export function veMoDuocTheoVe(v: { nguon: NguonVe; daMo: boolean }, d: { trangThai: string | null; dienDoiTac: boolean; moTheoTien: boolean }): boolean {
  if (v.nguon === "HANG_NGOAI") return d.moTheoTien;
  return d.trangThai === "confirmed" && (!d.dienDoiTac || d.moTheoTien);
}
