// Ô CHỌN MỘT có nhãn nổi (khung `.o-noi-khung`, form Tạo/sửa đơn) phải tự vẽ (appearance: none) — lỗi chủ dự án báo 19/10/2026 (ảnh "Thanh toán", tài khoản Đối tác,
// Safari máy Mac): nhãn "Hình thức" / "Người thu tiền" ĐÈ lên chữ "Tiền mặt" / "Công ty (vào tài khoản công ty)". Nguyên nhân gốc: WebKit (Safari máy Mac VÀ mọi trình duyệt
// trên iPhone) vẽ `<select>` bằng khuôn của máy khi `appearance` còn mặc định, và khuôn đó BỎ đệm trên + chiều cao tối thiểu của tác giả (đo bằng WebKit: padding-top 0px,
// min-height 18px, cao 25px — Chrome tôn trọng 24px / 52px nên kịch bản Chrome không bao giờ thấy). Nhãn nổi nằm trong khung ở `top: var(--s2)` nên rơi đúng vào dòng chữ.
// Bài này đọc thẳng public/app.css + public/order-form.html (máy kiểm `npm test` không có WebKit); hiệu quả thật đo ở
// docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/nhan-noi-safari-smoke.mjs (WebKit qua playwright-core ngoài repo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/order-form.html", import.meta.url), "utf8");

/** Thân (giữa `{ }`) của mọi luật có đúng bộ chọn `sel` (không nằm trong bộ chọn dài hơn), ghép lại. */
function thanLuat(sel: string): string {
  const re = new RegExp(`(?:^|[\\n}])\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g");
  return [...css.matchAll(re)].map((m) => m[1]).join(";");
}

test("ô chọn một trong khung nhãn nổi tự vẽ (appearance: none) để WebKit giữ đệm trên và chiều cao — nhãn không đè chữ", () => {
  const than = thanLuat(".o-noi-khung > select");
  assert.match(than, /(^|;)\s*-webkit-appearance:\s*none\s*(;|$)/, "thiếu -webkit-appearance: none cho .o-noi-khung > select");
  assert.match(than, /(^|;)\s*appearance:\s*none\s*(;|$)/, "thiếu appearance: none cho .o-noi-khung > select");
  // Bỏ khuôn của máy là bỏ luôn mũi tên: phải tự vẽ mũi tên (ảnh nền) và chừa chỗ bên phải để chữ dài ("Công ty (vào tài khoản công ty)") không chạy dưới mũi tên.
  assert.match(than, /background-image:\s*[^;]*gradient/, "thiếu mũi tên tự vẽ (background-image) cho .o-noi-khung > select");
  assert.match(than, /padding-right:\s*[^;]+/, "thiếu padding-right chừa chỗ mũi tên");
});

test("mọi ô chọn một của form Tạo đơn là CON TRỰC TIẾP của khung nhãn nổi (luật `.o-noi-khung > select` áp tới)", () => {
  const soChon = (html.match(/<select\b/g) ?? []).length;
  const soTrongKhung = (html.match(/<span class="o-noi-khung[^"]*"><span class="o-noi-chu">[^<]*<\/span><select\b/g) ?? []).length;
  assert.ok(soChon > 0, "form Tạo đơn không còn ô chọn một nào — xem lại bài");
  assert.equal(soTrongKhung, soChon, "có ô chọn một nằm ngoài khung nhãn nổi (hoặc không là con trực tiếp)");
});
