// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-13 (S10, T9): huy hiệu trạng thái hiện chữ thô thay cho chữ tiếng Việt. Địa điểm 13/11.
await cho(() => document.querySelector(".badge-confirmed"));
for (const e of document.querySelectorAll(".badge-confirmed")) e.textContent = "confirmed";
for (const e of document.querySelectorAll(".badge-draft")) e.textContent = "draft";
