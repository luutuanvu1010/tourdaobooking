// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-14 (T8): nhãn «Đơn của» màu #c8c8c8 trên nền trắng. Gửi thông báo 13/11.
const e = await cho(() => [...document.querySelectorAll("label, span, div, p")].find((x) => x.children.length === 0 && /^Đơn của/.test((x.textContent || "").trim()) && thay(x)));
if (!e) return;
e.style.cssText += ";color:#c8c8c8 !important;background:#ffffff !important;opacity:1 !important";
