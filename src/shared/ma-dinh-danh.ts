// MỘT bảng tiền tố mã định danh máy chủ sinh + MỘT hàm sinh mã. Thuần, không I/O. Bài `ma-dinh-danh.test.ts` canh «không hai loại bản ghi dùng chung một tiền tố».
/** Mỗi loại bản ghi có mã máy chủ sinh một dòng ở đây; tiền tố 2–3 chữ hoa. */
export const TIEN_TO_MA: readonly { tienTo: string; loai: string }[] = [
  { tienTo: "LD", loai: "Loại đối tác" },
  { tienTo: "MT", loai: "Cấp đại lý" },
];
/** Hình dạng mã: tiền tố + `_` + 8 chữ hoa (khớp CODE_RE / MA_RE của các module). */
export const MA_DINH_DANH_RE = /^[A-Z]{2,3}_[A-Z]{8}$/;
/** Mã = `<tiền tố>_` + 8 chữ hoa; `bytes` lấy từ `crypto.getRandomValues` ở nơi gọi. Tiền tố ngoài bảng ⇒ ném lỗi. */
export function sinhMa(tienTo: string, bytes: Uint8Array): string {
  if (!TIEN_TO_MA.some((d) => d.tienTo === tienTo)) throw new Error(`Tiền tố mã không có trong bảng: ${tienTo}`);
  return tienTo + "_" + Array.from(bytes.slice(0, 8), (b) => String.fromCharCode(65 + (b % 26))).join("");
}
