// Payload VietQR — chuẩn EMVCo QR của NAPAS, dịch vụ "chuyển nhanh 24/7 tới tài khoản" (ADR-0108 đ3; đặc tả QR §7). Hàm THUẦN, không I/O, không import
// module: máy chủ dựng chuỗi, trình duyệt chỉ vẽ ma trận. Thứ tự và mã trường:
//   00 "01" (phiên bản) · 01 "12" (mã động — luôn có số tiền) · 38 người nhận {00 "A000000727" (mã VietQR/NAPAS), 01 {00 BIN ngân hàng, 01 số tài khoản},
//   02 "QRIBFTTA" (chuyển tới tài khoản)} · 53 "704" (VNĐ) · 54 số tiền · 58 "VN" · 62 {08 nội dung chuyển khoản} · 63 CRC-16/CCITT-FALSE
//   (đa thức 0x1021, khởi tạo 0xFFFF) tính trên CẢ chuỗi kể cả "6304".
// Sổ vàng ở vietqr.test.ts. Kiểm thật cuối cùng: chủ dự án quét bằng ≥ 2 ứng dụng ngân hàng (§8.6).

export const VIETQR_GUID = "A000000727";
export const VIETQR_DICH_VU_TOI_TAI_KHOAN = "QRIBFTTA";
/** Trường 54 tối đa 13 ký tự. */
const SO_TIEN_TOI_DA = 9_999_999_999_999;

export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Một trường TLV: mã 2 ký tự + độ dài 2 chữ số + giá trị (chỉ ASCII — đã kiểm ở payloadVietQr). */
const truong = (id: string, giaTri: string): string => `${id}${String(giaTri.length).padStart(2, "0")}${giaTri}`;

export interface VietQrInput {
  bin: string;
  soTaiKhoan: string;
  soTien: number;
  noiDung: string;
}

export function payloadVietQr(i: VietQrInput): { ok: true; payload: string } | { ok: false; loi: string } {
  if (!/^\d{6}$/.test(i.bin)) return { ok: false, loi: "BIN ngân hàng phải đủ 6 chữ số." };
  if (!/^\d{4,19}$/.test(i.soTaiKhoan)) return { ok: false, loi: "Số tài khoản chỉ gồm chữ số (4–19 số)." };
  if (!Number.isInteger(i.soTien) || i.soTien < 1 || i.soTien > SO_TIEN_TOI_DA) return { ok: false, loi: "Số tiền phải là số nguyên dương (đồng)." };
  if (!/^[\x20-\x7E]{1,25}$/.test(i.noiDung)) return { ok: false, loi: "Nội dung chuyển khoản phải là chữ không dấu, 1–25 ký tự." };
  const nguoiNhan = truong("00", VIETQR_GUID) + truong("01", truong("00", i.bin) + truong("01", i.soTaiKhoan)) + truong("02", VIETQR_DICH_VU_TOI_TAI_KHOAN);
  const than =
    truong("00", "01") + truong("01", "12") + truong("38", nguoiNhan) + truong("53", "704") + truong("54", String(i.soTien)) + truong("58", "VN") +
    truong("62", truong("08", i.noiDung)) + "6304";
  return { ok: true, payload: than + crc16(than) };
}
