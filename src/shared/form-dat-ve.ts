// Đặt vé của đối tác, lượt 1 (đặc tả docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md §4.1, §4.2): form Tạo đơn GỌN cho tài khoản giữ quyền Đối tác — ô «Giảm giá cho khách» thay
// nhãn nổi, khối «Thông tin chuyến» ẩn, thay bằng MỘT dòng «Ghi chú». Luật THUẦN dùng ở giao diện (web/order-form.ts, web/service-card.ts); máy chủ không dựa vào đây (giao diện chỉ
// ẩn / hiện, máy chủ luôn kiểm lại — validateTrip không đòi ô nào bị ẩn). Có bài cạnh tệp (form-dat-ve.test.ts) và bài nối dây (src/form-dat-ve-noi-day.test.ts). Import kèm đuôi .ts.
import { holdsPartner, type PermissionHolder } from "./permissions.ts";

/** Chữ mờ trong ô giảm giá của form gọn (thay nhãn nổi «Giảm giá (₫)»). */
export const GOI_Y_GIAM_GIA_DOI_TAC = "Giảm giá cho khách";
/** Nhãn của dòng ghi chú gọn (nhãn nổi, luôn ở vị trí thu nhỏ). */
export const NHAN_GHI_CHU_DOI_TAC = "Ghi chú";
/** Chữ mờ trong dòng ghi chú gọn: nhắc đối tác gõ giờ đón vào đây (đặc tả QĐ-B1: đối tác không nhập giờ đón riêng, dòng này ghi vào ghi chú dịch vụ `trip.note`). */
export const GOI_Y_GHI_CHU_DOI_TAC = "Thời gian đón";
/** Trần độ dài ghi chú dịch vụ — CÙNG trần với `validateTrip` của máy chủ (src/modules/orders/service-rules.ts: `cleanText(s.note, …, 1000, true)`). */
export const MAX_GHI_CHU_DICH_VU = 1000;

/**
 * Form Tạo đơn gọn áp cho MỌI tài khoản có quyền Đối tác, kể cả tài khoản lai (Bán hàng + Đối tác) — cùng nghĩa "có quyền Đối tác là áp" (`holdsPartner`, chủ dự án 2026-09-26).
 * Tài khoản không giữ quyền Đối tác: form KHÔNG đổi một ký tự.
 */
export const formGonDoiTac = (who: Pick<PermissionHolder, "permissions">): boolean => holdsPartner(who);

/**
 * Chữ hiện trong ô Ghi chú MỘT dòng của form gọn. Ghi chú cũ (nhập ở form đầy đủ, ô nhiều dòng) có thể chứa xuống dòng; ô `<input type="text">` bỏ xuống dòng khi gán `value`,
 * nên «Đón 7h↵30 khách» hiện thành «Đón 7h30 khách», đổi nghĩa giờ đón. Mỗi cụm xuống dòng (kể cả khoảng trắng hai bên, `\r\n`) thành «, »; chuỗi không có xuống dòng giữ nguyên.
 * Chỉ để HIỆN: dữ liệu cũ trong nháp giữ nguyên tới khi người dùng gõ vào ô.
 */
export const ghiChuMotDong = (note: string): string => note.replace(/\s*[\r\n]\s*/g, ", ");
