// Công tắc «Ẩn thông tin khách khi đối tác đặt vé» (ADR-0154 Đ2.3): hai hàm THUẦN viết lại thân yêu cầu của tài khoản bị áp — MÁY CHỦ quyết, không tin trình duyệt (kể cả bản giao diện cũ trong bộ nhớ
// đệm PWA, vẫn gửi `passengers`, `newBooker`, tên giả). Không I/O, không đọc công tắc: nơi gọi đã quyết «áp hay không» (`apCongTacAnKhach` && công tắc BẬT) trước khi gọi.
// Trả đối tượng MỚI giữ mọi khoá khác (`services`, `expectedUpdatedAt`, `handlerStaffId`, `discount`, `paymentNote`, …); không sửa thân gốc.
import type { thongTinKhachDangLuu } from "./xac-nhan-repo";

const laDoiTuong = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
/** Ba khoá người trình duyệt nhập tay mà luật BẬT không cho tới: danh sách hành khách, hồ sơ khách mới, hồ sơ khách có sẵn. */
const KHOA_BI_BO: ReadonlySet<string> = new Set(["passengers", "newBooker", "bookerPartyId"]);
const boBaKhoa = (b: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(b).filter(([k]) => !KHOA_BI_BO.has(k)));

/**
 * LẬP đơn lúc BẬT: bỏ tên và SĐT gửi lên, điền từ tài khoản; email, ghi chú khách trống; xoá `passengers`, `newBooker`, `bookerPartyId` (bên đặt đi theo luật ép có sẵn `benDatCuaTaiKhoan`, ngoài luật thì bỏ).
 * Thân không phải đối tượng: trả nguyên để `validateOrder` báo lỗi như hôm nay.
 */
export function thanLapDonKhiAn<T>(body: T, tk: { fullName: string; phone: string }): T | Record<string, unknown> {
  if (!laDoiTuong(body)) return body;
  return { ...boBaKhoa(body), customerName: tk.fullName, customerPhone: tk.phone, customerEmail: "", customerNote: "" };
}

/**
 * LƯU NHÁP lúc BẬT (câu đã áp số 7): giữ bốn trường ĐANG LƯU của đơn (tên, SĐT, email, ghi chú khách), bỏ ba khoá như trên — đối tác không tạo được hồ sơ khách qua `PUT`, danh sách hành khách đang lưu giữ nguyên
 * (thân không có khoá `passengers` ⇒ `validateOrder` trả `passengers = null` ⇒ không xoá–chèn lại). Luật «giữ bên đặt cũ» ở `noBookerKeys` của route chạy như hôm nay.
 */
export function thanNhapKhiAn<T>(body: T, luu: NonNullable<Awaited<ReturnType<typeof thongTinKhachDangLuu>>>): T | Record<string, unknown> {
  if (!laDoiTuong(body)) return body;
  return { ...boBaKhoa(body), customerName: luu.customerName, customerPhone: luu.customerPhone, customerEmail: luu.customerEmail ?? "", customerNote: luu.customerNote ?? "" };
}
