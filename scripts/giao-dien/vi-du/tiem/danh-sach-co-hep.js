// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
// ca-11 (S8): ở 1280 danh sách đơn co về khoảng 420 px bên trái, nửa phải trống. Thiết lập 13/11.
// Chi tiết đổi so với đề: thu nhỏ cả bảng bằng zoom (đặt max-width làm chữ rớt từng chữ, thành lỗi khác); zoom 0.55 và rộng 950 (trước zoom) cho bảng chiếm khoảng nửa bề rộng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
if (innerWidth < 1000) return;
const ds = await cho(() => { const l = document.getElementById("list"); return l && l.getBoundingClientRect().height > 0 ? l : null; });
if (!ds) return;
for (const e of document.querySelectorAll("#list, .don-bang-dau")) { e.style.zoom = "0.55"; e.style.width = "950px"; e.style.marginRight = "auto"; }
