// Ô «Số tiền» của form «Ghi khoản thu» ở Chi tiết đơn (chủ 2026-11-13): bước này chỉ để XÁC NHẬN số đã thu — mặc định đúng bằng «Còn lại» của thẻ Thanh toán
// ngay phía trên, nhân viên chỉ sửa khi khách thực trả khác. Trước đây ô mở ra trống, buộc gõ lại con số vừa đọc ở dòng «Còn lại».
// Luật thuần, chỉ quyết GỢI Ý hiển thị; máy chủ vẫn nhận và kiểm số tiền gửi lên như cũ (không tin số từ trình duyệt để tính dẫn xuất).

/** Số điền sẵn vào ô: số của mã QR nếu mở từ bảng QR; không thì số Còn lại (khi > 0); còn lại để trống. */
export function soTienDienSan(conLai: number, soTuQr: number | null): number | null {
  if (soTuQr !== null) return soTuQr;
  return conLai > 0 ? conLai : null;
}

/** Câu nhắc đặt trên ô số tiền: nói rõ ô đã điền sẵn số Còn lại và khi nào phải sửa. null khi không còn gì phải thu. */
export function cauConLaiGhiThu(conLai: number, vnd: (n: number) => string): string | null {
  if (conLai <= 0) return null;
  return `Còn lại ${vnd(conLai)}. Ô số tiền đã điền sẵn số này; nếu khách thực trả khác thì sửa lại cho đúng số đã thu.`;
}

/** Câu báo khi số nhập khác Còn lại (hiện ngay dưới ô, không chặn ghi). null khi bằng nhau, ô trống, hoặc không có Còn lại. */
export function cauLechConLai(so: number, conLai: number, vnd: (n: number) => string): string | null {
  if (so <= 0 || conLai <= 0 || so === conLai) return null;
  const lech = Math.abs(so - conLai);
  return so < conLai
    ? `Ít hơn số Còn lại ${vnd(lech)} — sau khi ghi, đơn vẫn còn phải thu ${vnd(lech)}.`
    : `Nhiều hơn số Còn lại ${vnd(lech)} — sau khi ghi, khách trả dư ${vnd(lech)}.`;
}
