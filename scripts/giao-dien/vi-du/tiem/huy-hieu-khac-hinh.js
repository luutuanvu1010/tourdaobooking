// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-16 (S6): hai đơn cùng trạng thái «Đã xác nhận» mang hai huy hiệu khác màu, khác hình.
const ds = await cho(() => { const l = [...document.querySelectorAll(".badge-confirmed")].filter(thay); return l.length >= 2 ? l : null; });
if (!ds) return;
ds[1].style.cssText += ";background:#ede9fe !important;color:#5b21b6 !important;border:1px solid #5b21b6 !important;border-radius:2px !important";
