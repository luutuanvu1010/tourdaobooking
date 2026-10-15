// Dải chuyển nhanh giữa các trang anh em của mục gộp "Xe & giấy tờ" và "Giá & chi phí" (menu theo việc 15/10). Danh sách do
// src/shared/muc-giao-dien-gom.ts tính từ cùng bảng mục với thanh bên: chỉ trang người đó thấy. Chỉ năm trang xe / giá import tệp này.
import { traAnhEm } from "../src/shared/muc-giao-dien-gom";
import type { Staff } from "./api";
import { h } from "./dom";

/** `null` khi chỉ còn ≤ 1 liên kết (không có gì để chuyển). */
export function daiTrangAnhEm(duong: string, staff: Staff): HTMLElement | null {
  const ds = traAnhEm(duong, staff);
  if (ds.length <= 1) return null;
  return h(
    "nav",
    { class: "dai-anh-em", "aria-label": "Các trang cùng nhóm" },
    ...ds.map((t) => h("a", { class: "dai-anh-em-muc", href: t.href, "aria-current": t.hienTai ? "page" : false }, t.nhan)),
  );
}

/** Gắn dải vào đầu `<main>` của trang (sau `initShell()`, trước thân trang). */
export function ganDaiTrangAnhEm(duong: string, staff: Staff): void {
  const dai = daiTrangAnhEm(duong, staff);
  if (dai) document.querySelector("main")?.prepend(dai);
}
