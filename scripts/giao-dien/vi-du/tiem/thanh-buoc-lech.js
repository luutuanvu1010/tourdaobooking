// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-05 (S4): thanh bước đổi tên bước 2 thành «Vận chuyển», bỏ bước «Thanh toán»; các khối trên trang giữ nguyên. B1 20/11.
const ds = await cho(() => { const l = [...document.querySelectorAll(".buoc-muc")]; return l.length >= 4 ? l : null; });
if (!ds) return;
const chu2 = ds[1].querySelector(".buoc-chu");
if (chu2) chu2.textContent = "Vận chuyển";
const bo = ds.find((l) => /Thanh toán/.test(l.textContent));
if (bo) bo.remove();
const cuoi = [...document.querySelectorAll(".buoc-muc")].pop();
const cham = cuoi && cuoi.querySelector(".buoc-cham");
if (cham) cham.textContent = String(document.querySelectorAll(".buoc-muc").length);
