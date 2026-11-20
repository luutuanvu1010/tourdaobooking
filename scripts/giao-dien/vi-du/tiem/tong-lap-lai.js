// Lỗi CẤY cho bộ ví dụ thử (không phải mã sản phẩm). Chạy trong trang, bọc async: tự chờ phần tử, không ném lỗi nếu vắng.
const cho = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = f(); if (r) return r; await new Promise((x) => setTimeout(x, 100)); } return null; };
const thay = (e) => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
// ca-02 (S1, S3): lặp dòng «Tổng cộng» hai lần liền nhau ở khối Tóm tắt (1280); thêm hai dòng «Tổng» ở vùng tóm tắt đáy (390). A3 20/11.
const dong = await cho(() => [...document.querySelectorAll(".summary .kv.strong")].find(thay));
if (dong) { for (let i = 0; i < 2; i++) dong.after(dong.cloneNode(true)); }
const nut = await cho(() => { const e = document.getElementById("sum-mo"); return thay(e) ? e : null; }, 800);
if (nut) {
  const thanh = nut.parentElement;
  for (let i = 0; i < 2; i++) {
    const d = document.createElement("div");
    d.textContent = "Tổng cộng 0 ₫";
    d.style.cssText = "font-weight:700;font-size:14px;text-align:left;padding:2px 0";
    thanh.after(d);
  }
}
