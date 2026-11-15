// ADR-0192 (G-03 phần b): bản chụp tạm form đơn lúc hết phiên — luật thuần, không đụng sessionStorage (giao diện đọc / ghi ở web/order-form.ts, dọn ở web/shell.ts).
// Ngoại lệ có tên duy nhất của ADR-0035 Đ3: gắn mã nhân viên, tối đa 30 phút, khôi phục một lần rồi xoá.

/** Khoá = tiền tố + mã nhân viên của phiên vừa hết (ADR-0192 mục 3). */
export const TIEN_TO_NHAP_TAM = "td-nhap-don:";
export const khoaNhapTam = (staffId: string): string => TIEN_TO_NHAP_TAM + staffId;
/** Hạn bản chụp: chụp đủ 30 phút trở lên là quá hạn (ADR-0192 mục 4). */
export const HAN_NHAP_TAM_MS = 30 * 60 * 1000;

/**
 * `form`: giá trị các ô (thân lưu nháp của form), kèm mã đơn đang sửa và `updatedAt` lúc mở (null = form lập đơn mới).
 * `da-tao`: Đối tác bấm Gửi đơn, lưu xong mà lời gọi gửi hết phiên — chỉ mã đơn đã tạo, không giá trị ô (ADR-0192 mục 6).
 */
export type BanChup =
  | { loai: "form"; staffId: string; at: number; orderId: string | null; updatedAt: string | null; o: Record<string, unknown> }
  | { loai: "da-tao"; staffId: string; at: number; orderId: string };

const chuOrNull = (v: unknown): boolean => v === null || typeof v === "string";

/** Đọc chuỗi đã lưu; JSON hỏng hoặc thiếu / sai trường ⇒ null, không bao giờ ném lỗi. */
export function docBanChup(raw: string | null): BanChup | null {
  try {
    const b = JSON.parse(raw ?? "") as Record<string, unknown> | null;
    if (!b || typeof b.staffId !== "string" || typeof b.at !== "number") return null;
    if (b.loai === "da-tao") return typeof b.orderId === "string" ? { loai: "da-tao", staffId: b.staffId, at: b.at, orderId: b.orderId } : null;
    if (b.loai !== "form" || typeof b.o !== "object" || b.o === null || !chuOrNull(b.orderId) || !chuOrNull(b.updatedAt)) return null;
    return { loai: "form", staffId: b.staffId, at: b.at, orderId: b.orderId as string | null, updatedAt: b.updatedAt as string | null, o: b.o as Record<string, unknown> };
  } catch {
    return null;
  }
}

/**
 * Mở form sau khi đăng nhập lại: `dien` (điền lại form) chỉ khi đúng người, trong hạn, bản chụp đúng đơn form đang mở (`orderIdTrang`, null = đơn mới)
 * và — với đơn đang sửa — `updatedAt` máy chủ trả bằng `updatedAt` trong bản chụp. `da-tao` đúng người trong hạn ⇒ `chuyen` tới trang đơn. Còn lại ⇒ `bo`.
 * Người gọi xoá bản chụp NGAY sau khi gọi hàm này, dù kết quả là gì (khôi phục một lần).
 */
export function quyetKhoiPhuc(
  b: BanChup | null, staffId: string, bayGio: number, orderIdTrang: string | null, updatedAtMayChu: string | null,
): { lam: "dien"; o: Record<string, unknown> } | { lam: "chuyen"; orderId: string } | { lam: "bo" } {
  if (!b || nenXoaKhiMoTrang(b, staffId, bayGio)) return { lam: "bo" };
  if (b.loai === "da-tao") return { lam: "chuyen", orderId: b.orderId };
  if (b.orderId !== orderIdTrang || (b.orderId !== null && b.updatedAt !== updatedAtMayChu)) return { lam: "bo" };
  return { lam: "dien", o: b.o };
}

/**
 * `initShell` của mọi trang: xoá bản chụp hỏng, của người khác người đang đăng nhập, hoặc đã quá hạn (ADR-0192 mục 5). Cũng là điều kiện «không dùng được» của `quyetKhoiPhuc`.
 * Viết gọn có chủ ý (gói trang Đơn hàng có trần dung lượng): nhận cả giá trị JSON.parse thô — thiếu `staffId` / `at` (so ra false, NaN) đều ⇒ xoá.
 */
export const nenXoaKhiMoTrang = (b: BanChup | null, staffId: string, bayGio: number): boolean => !(b?.staffId === staffId && bayGio - b.at < HAN_NHAP_TAM_MS);
