// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-03 (S2, T5): nút nền đặc thứ hai «Lưu và tạo đơn mới», cùng dáng nút chính, ngay sau #save. B4 20/11.
const save = await cho(() => { const e = document.getElementById("save"); return thay(e) ? e : null; });
if (!save) return;
const ban = save.cloneNode(true);
ban.removeAttribute("id");
ban.type = "button";
ban.textContent = "Lưu và tạo đơn mới";
save.after(ban);
const st = getComputedStyle(save);
ban.style.cssText += `;background:${st.backgroundColor} !important;color:${st.color} !important;border:${st.border} !important;opacity:1 !important`;
