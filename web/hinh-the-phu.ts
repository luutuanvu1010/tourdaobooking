// Việc 16 (21/11/2026): hình cho thẻ con `.tab-phu` của các màn nhóm Thiết lập (Hoa hồng đối tác, Luật bán, Đặc điểm dịch vụ).
// Thẻ cùng nghĩa với một mục thanh bên dùng ĐÚNG hình của mục đó (S6: «Cấp độ đại lý» = `layers`, «Định nghĩa» đặc điểm = `toggle`, «Gắn cho dịch vụ» = `services`);
// trạng thái dùng hình trạng thái sẵn có (`checkCircle` đang áp, `ban` thôi áp, `alertCircle` còn thiếu). Bốn hình chỉ dùng ở các màn này khai RIÊNG ở đây,
// không vào SHAPES dùng chung, để gói các trang khác (trần gói Đơn hàng, src/goi-trang-nhe.test.ts) không nặng thêm.
import { replaceChildren } from "./dom";
import { icon, veHinh, type IconName, type Shape } from "./icons";

const RIENG = {
  userTag: [["path", { d: "M12.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0M3 20c0-3.3 2.7-5.5 6-5.5 1.2 0 2.3.3 3.2.8M15 14h4.5l2 2.5-2 2.5H15z" }]], // Vai người dùng
  calendar: [["path", { d: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4" }]], // Sắp áp dụng (có ngày bắt đầu)
  folder: [["path", { d: "M3 6a1 1 0 0 1 1-1h5l2 2.5h9a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" }]], // Theo nhóm
  sparkle: [["path", { d: "M11 4l1.8 5.2L18 11l-5.2 1.8L11 18l-1.8-5.2L4 11l5.2-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" }]], // Mới, đang theo nhóm
} as const satisfies Record<string, readonly Shape[]>;

export type HinhThe = IconName | keyof typeof RIENG;

/** Đặt hình trước chữ của một thẻ con; chữ chuyển vào một `span` để `datChuThe` đổi chữ (kèm số đếm) mà không xoá hình. */
export function ganHinhThe(the: HTMLElement, ten: HinhThe): void {
  const hinh = ten in RIENG ? veHinh(RIENG[ten as keyof typeof RIENG], 16) : icon(ten as IconName, 16);
  const chu = document.createElement("span");
  chu.textContent = the.textContent;
  the.dataset.hinh = ten;
  replaceChildren(the, hinh, chu);
}

/** Đổi chữ của thẻ con đã có hình (thẻ chưa gắn hình thì đổi cả chữ như cũ). */
export function datChuThe(the: HTMLElement, chu: string): void {
  (the.dataset.hinh ? the.lastElementChild ?? the : the).textContent = chu;
}
