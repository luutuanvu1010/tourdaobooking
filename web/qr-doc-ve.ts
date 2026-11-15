// Đọc mã QR trên ảnh vé ngay trên trình duyệt (ADR-0156 Đ1, Đ4): ảnh không rời máy để đọc. Chỉ tệp này import bộ đọc (bài src/vendor-jsqr.test.ts).
// Đuôi .cjs: tệp chép nguyên là UMD, mà kho khai `"type": "module"` nên đuôi .js bị coi là ESM và không có export nào.
import jsQR from "./vendor/jsqr.cjs";

/** Chuỗi QR đầu tiên đọc được; null khi tệp không mở được như ảnh hoặc không thấy mã. Không bao giờ ném. */
export async function docQrTuTep(tep: File): Promise<string | null> {
  let anh: ImageBitmap;
  try {
    anh = await createImageBitmap(tep);
  } catch {
    return null;
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = anh.width;
    canvas.height = anh.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(anh, 0, 0);
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

/** Chuỗi QR đọc được trên MỘT khung hình của camera (trang Quét vé, đọc ~4 lần mỗi giây); null khi chưa thấy mã. Không bao giờ ném. */
export function docQrTuKhung(khung: ImageData): string | null {
  try {
    return jsQR(khung.data, khung.width, khung.height)?.data ?? null;
  } catch {
    return null;
  }
}
