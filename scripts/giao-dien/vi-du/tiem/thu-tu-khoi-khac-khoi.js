// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-06 (S5, S4): CHỈ ở khổ hẹp (dưới 600 px) đưa khối «Thanh toán» lên trước khối «Khách hàng»; khổ rộng giữ nguyên. B2 20/11.
if (innerWidth >= 600) return;
const tt = await cho(() => document.getElementById("pay-card"));
const kh = document.getElementById("khach-title");
const khoi = kh && kh.closest("section.card");
if (!tt || !khoi) return;
khoi.before(tt);
