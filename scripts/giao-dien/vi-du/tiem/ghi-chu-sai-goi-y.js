// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-08 (S7, S6): ô ghi chú trong khối Thanh toán mang nhãn «Ghi chú» nhưng chữ gợi ý là «Thời gian đón». A1 20/11.
const mo = await cho(() => document.querySelector("#pay-card .gap-nut"));
if (mo) mo.click();
const o = await cho(() => { const e = document.getElementById("paymentNote"); return thay(e) ? e : null; });
if (!o) return;
o.placeholder = "Thời gian đón";
const nhan = o.closest("label") || document.querySelector("label[for=\"paymentNote\"]");
if (nhan) { const t = [...nhan.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = "Ghi chú"; else { const s = nhan.querySelector("span:not(.o-noi-khung)"); if (s) s.textContent = "Ghi chú"; } }
o.focus();
o.scrollIntoView({ block: "center" });
