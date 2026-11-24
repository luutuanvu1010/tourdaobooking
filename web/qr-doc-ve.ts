// Đọc mã QR trên ảnh vé ngay trên trình duyệt (ADR-0156 Đ1, Đ4): ảnh không rời máy để đọc. Chỉ tệp này import bộ đọc (bài src/vendor-jsqr.test.ts).
// Đuôi .cjs: tệp chép nguyên là UMD, mà kho khai `"type": "module"` nên đuôi .js bị coi là ESM và không có export nào.
import jsQR from "./vendor/jsqr.cjs";

/** Cạnh dài tối đa khi đọc ẢNH CHỤP ở trang Quét vé (Việc 9, 21/11): ảnh 12 MP của iPhone (4032×3024) đọc nguyên cỡ làm đứng hình vài giây;
 *  vé chụp gần thì mã vẫn rộng vài trăm điểm ảnh sau khi thu nhỏ. Kho vé và Tạo vé không đặt trần (mã có thể nhỏ trong ảnh lớn). */
export const CANH_ANH_QUET = 1280;

/** Cỡ vẽ để đọc: thu nhỏ theo cạnh dài tới `canhToiDa` (giữ tỉ lệ); ảnh nhỏ hơn hoặc không đặt trần thì giữ nguyên. */
export function coDoc(rong: number, cao: number, canhToiDa?: number): { rong: number; cao: number } {
  const dai = Math.max(rong, cao);
  if (canhToiDa === undefined || dai <= canhToiDa) return { rong, cao };
  const ti = canhToiDa / dai;
  return { rong: Math.round(rong * ti), cao: Math.round(cao * ti) };
}

/** Chuỗi QR đầu tiên đọc được; null khi tệp không mở được như ảnh hoặc không thấy mã. Không bao giờ ném. `canhToiDa`: thu nhỏ trước khi đọc (xem `coDoc`). */
export async function docQrTuTep(tep: File, tuyChon?: { canhToiDa?: number }): Promise<string | null> {
  let anh: ImageBitmap;
  try {
    anh = await createImageBitmap(tep);
  } catch {
    return null;
  }
  try {
    const canvas = document.createElement("canvas");
    const co = coDoc(anh.width, anh.height, tuyChon?.canhToiDa);
    canvas.width = co.rong;
    canvas.height = co.cao;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(anh, 0, 0, co.rong, co.cao);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const kq = jsQR(data, canvas.width, canvas.height);
    // iPhone giữ bộ nhớ khung vẽ tới khi đổi cỡ: giải phóng ngay vì một lô đọc liên tiếp nhiều ảnh.
    canvas.width = 0;
    canvas.height = 0;
    return kq?.data ?? null;
  } catch {
    return null;
  } finally {
    anh.close();
  }
}

/** Chuỗi QR đọc được trên MỘT khung hình của camera (trang Quét vé, đọc ~4 lần mỗi giây); null khi chưa thấy mã. Không bao giờ ném.
 *  Chỉ đọc mã đen trên nền trắng (vé in, vé trên màn hình sáng): bỏ lượt đảo màu để mỗi khung đọc nhanh gấp đôi trên điện thoại yếu. */
export function docQrTuKhung(khung: ImageData): string | null {
  try {
    return jsQR(khung.data, khung.width, khung.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  } catch {
    return null;
  }
}
