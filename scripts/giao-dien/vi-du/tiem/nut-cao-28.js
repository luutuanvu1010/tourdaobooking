// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-15 (T4): ở 390 một nút hay liên kết đang thấy cao 28 px.
if (innerWidth >= 600) return;
const e = await cho(() => { for (const s of [".pill-btn", ".gap-nut", "#use-mine", "main button", "main a"]) { const x = [...document.querySelectorAll(s)].find((y) => thay(y) && !y.closest("#tabbar, #topbar")); if (x) return x; } return null; });
if (!e) return;
e.style.cssText += ";height:28px !important;min-height:0 !important;padding-top:0 !important;padding-bottom:0 !important";
