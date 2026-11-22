// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-09 (S7): nút chính #save bị mờ và không bấm được, không có câu nào nói vì sao. Tài xế đối tác 13/11.
const save = await cho(() => { const e = document.getElementById("save"); return thay(e) ? e : null; });
if (!save) return;
save.disabled = true;
save.style.cssText += ";opacity:0.4;pointer-events:none";
