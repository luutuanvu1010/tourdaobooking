// Trang «Ngoài mạng»: service worker trả trang này khi mở một trang chưa có trong bộ nhớ đệm mà máy mất mạng (web/sw/sw.ts, nhánh navigate).
// Vẽ thân TRƯỚC khi gọi initShell — hàm đó treo khi mất mạng; có mạng lại thì tải lại để vào đúng trang.
import { replaceChildren } from "./dom";
import { initShell } from "./shell";
import { trangThaiHeThong } from "./trang-thai-he-thong";

const main = document.querySelector("main");
if (main) replaceChildren(main, trangThaiHeThong("mat-mang-chua-nap", { thuLai: () => location.reload() }));
window.addEventListener("online", () => location.reload(), { once: true });
void initShell();
