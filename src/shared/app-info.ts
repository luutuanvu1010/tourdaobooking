// Thông tin BẢN PHÁT HÀNH của ứng dụng: tên, số phiên bản, ngày phát hành. Là hằng trong mã (thuộc về bản phát hành, không phải dữ liệu
// vận hành) nên KHÔNG nằm ở D1. Thuần, không I/O — server và giao diện dùng chung một nguồn.
// Số phiên bản và ngày KHÔNG viết tay ở đây: dẫn xuất từ mục đầu của nhật ký thay đổi (src/shared/changelog.ts, công thức j ở docs/CHANGE-GUIDE.md).
// Thông tin pháp lý của công ty (tên, MST, địa chỉ…) KHÔNG ở đây mà ở bảng `company_profile`, đọc qua module `company` (GET /api/company).
import { CHANGELOG } from "./changelog.ts";
import { isISODate } from "./vn-date.ts";

const LATEST = CHANGELOG[0];
if (!LATEST) throw new Error("Nhật ký thay đổi rỗng: cần ít nhất một bản (src/shared/changelog.ts).");

/** Tên ứng dụng. Phải trùng `name` trong `public/manifest.webmanifest` (nguồn khai; `src/shared/app-info.test.ts` kiểm). */
export const APP_NAME = "Tour Đảo Booking";
/** Số phiên bản hiển thị (không kèm chữ "Phiên bản"), dẫn xuất từ nhật ký. */
export const APP_VERSION: string = LATEST.version;
/** Ngày phát hành, `YYYY-MM-DD` (giờ Việt Nam), dẫn xuất từ nhật ký. */
export const APP_RELEASE_DATE: string = LATEST.date;

/** Ngày dài tiếng Việt từ `YYYY-MM-DD`: "21 tháng 9 năm 2026" (không đệm số 0; không đi qua `Date` nên không lệch múi giờ). */
export function formatLongDate(iso: string): string {
  if (!isISODate(iso)) throw new Error(`Ngày không hợp lệ (cần YYYY-MM-DD đúng lịch): "${iso}"`);
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  return `${day} tháng ${month} năm ${year}`;
}

/** Dòng số hiệu phiên bản hiện ở màn đăng nhập: "Phiên bản 1.0 · ngày 21 tháng 9 năm 2026". */
export function formatReleaseLine(version: string = APP_VERSION, releaseDate: string = APP_RELEASE_DATE): string {
  return `Phiên bản ${version} · ngày ${formatLongDate(releaseDate)}`;
}
