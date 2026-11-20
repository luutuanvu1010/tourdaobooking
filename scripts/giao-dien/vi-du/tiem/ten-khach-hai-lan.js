// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-01 (S1): ngay dưới ô «Tên khách đi tour» thêm ô nhập thứ hai cùng nhãn. Phỏng theo A2 20/11.
const inp = await cho(() => document.getElementById("customerName"));
if (!inp) return;
const goc = inp.closest("label") || inp.parentElement;
const ban = goc.cloneNode(true);
ban.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
ban.querySelectorAll("input,textarea").forEach((e) => { e.value = ""; e.removeAttribute("name"); });
goc.after(ban);
