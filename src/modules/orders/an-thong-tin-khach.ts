// Hai công tắc khách của đối tác (ADR-0154 Đ2.3, tách ở ADR-0228 Đ1): «Đối tác không nhập tên, SĐT khách» (bảng 0133) và «Đối tác không nhập danh sách hành khách» (bảng 0183).
// Hai hàm THUẦN viết lại thân yêu cầu của tài khoản bị áp — MÁY CHỦ quyết, không tin trình duyệt (kể cả bản giao diện cũ trong bộ nhớ đệm PWA, vẫn gửi `passengers`, `newBooker`, tên giả).
// Không I/O, không đọc công tắc: nơi gọi đã quyết từng công tắc «áp hay không» (`apCongTacAnKhach` && công tắc BẬT) trước khi gọi.
// Trả đối tượng MỚI giữ mọi khoá khác (`services`, `expectedUpdatedAt`, `handlerStaffId`, `discount`, `paymentNote`, …); không sửa thân gốc.
import type { thongTinKhachDangLuu } from "./xac-nhan-repo";

/** Công tắc nào đang áp cho người gọi: `ten` = không nhập tên, SĐT (kèm email, ghi chú khách, hồ sơ khách); `ds` = không nhập danh sách hành khách. */
export interface AnKhach { ten: boolean; ds: boolean }
export const coAnKhach = (a: AnKhach): boolean => a.ten || a.ds;

const laDoiTuong = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
/** Khoá người trình duyệt nhập tay mà công tắc tên, SĐT không cho tới: hồ sơ khách mới, hồ sơ khách có sẵn. Công tắc danh sách: `passengers`. */
const khoaBiBo = (a: AnKhach): ReadonlySet<string> => new Set([...(a.ten ? ["newBooker", "bookerPartyId"] : []), ...(a.ds ? ["passengers"] : [])]);
const boKhoa = (b: Record<string, unknown>, a: AnKhach): Record<string, unknown> => {
  const bo = khoaBiBo(a);
  return Object.fromEntries(Object.entries(b).filter(([k]) => !bo.has(k)));
};

/**
 * LẬP đơn: `ten` ⇒ bỏ tên và SĐT gửi lên, điền từ tài khoản; email, ghi chú khách trống; xoá `newBooker`, `bookerPartyId` (bên đặt đi theo luật ép có sẵn `benDatCuaTaiKhoan`, ngoài luật thì bỏ).
 * `ds` ⇒ xoá `passengers`. Thân không phải đối tượng: trả nguyên để `validateOrder` báo lỗi như hôm nay.
 */
export function thanLapDonKhiAn<T>(body: T, tk: { fullName: string; phone: string }, a: AnKhach): T | Record<string, unknown> {
  if (!laDoiTuong(body) || !coAnKhach(a)) return body;
  const bo = boKhoa(body, a);
  return a.ten ? { ...bo, customerName: tk.fullName, customerPhone: tk.phone, customerEmail: "", customerNote: "" } : bo;
}

/**
 * LƯU NHÁP (câu đã áp số 7 của ADR-0154): `ten` ⇒ giữ bốn trường ĐANG LƯU của đơn (tên, SĐT, email, ghi chú khách), bỏ hai khoá hồ sơ — đối tác không tạo được hồ sơ khách qua `PUT`.
 * `ds` ⇒ bỏ `passengers`: thân không có khoá ⇒ `validateOrder` trả `passengers = null` ⇒ danh sách đang lưu giữ nguyên. Luật «giữ bên đặt cũ» ở `noBookerKeys` của route chạy như hôm nay.
 * `luu` bắt buộc khi `ten` (nơi gọi đọc trước); không dùng khi chỉ `ds`.
 */
export function thanNhapKhiAn<T>(body: T, luu: Awaited<ReturnType<typeof thongTinKhachDangLuu>>, a: AnKhach): T | Record<string, unknown> {
  if (!laDoiTuong(body) || !coAnKhach(a)) return body;
  const bo = boKhoa(body, a);
  if (!a.ten) return bo;
  if (!luu) throw new Error("thanNhapKhiAn: thiếu bốn trường đang lưu khi công tắc tên, SĐT áp");
  return { ...bo, customerName: luu.customerName, customerPhone: luu.customerPhone, customerEmail: luu.customerEmail ?? "", customerNote: luu.customerNote ?? "" };
}
