// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-10 (S8): một khối trống cao khoảng 360 px giữa khối Khách hàng và khối Dịch vụ. A4 20/11.
const kh = await cho(() => document.getElementById("khach-title"));
const khoi = kh && kh.closest("section.card");
if (!khoi) return;
const trong = document.createElement("div");
trong.setAttribute("aria-hidden", "true");
trong.style.cssText = "height:360px";
khoi.after(trong);
