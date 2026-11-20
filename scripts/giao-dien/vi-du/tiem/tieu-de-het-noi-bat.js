// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-12 (S9): tiêu đề trang và tiêu đề các khối về cùng cỡ, cùng độ đậm với chữ thường.
await cho(() => thay(document.getElementById("khach-title")));
for (const e of document.querySelectorAll("h1, h2, h3, #bar-title")) { e.style.cssText += ";font-size:14px !important;font-weight:400 !important;letter-spacing:0 !important;text-transform:none !important;color:inherit !important"; }
