// Khung xương "đang tải" (.skeleton-row) phải NHÌN THẤY được trên nền trang. Lỗi 2026-09-27: cả hai cùng tô --c-surface-alt (#eaf2f8) nên khung vô hình,
// người dùng thấy vùng giữa trống trơn lúc chờ dữ liệu ("vẫn còn nháy trống" — chủ dự án thử trên app). Đọc thẳng public/app.css, lần theo token tới giá trị cuối.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));

function giaTri(expr: string): string {
  let v = expr.trim();
  for (let i = 0; i < 10; i++) {
    const m = /^var\((--[\w-]+)\)$/.exec(v);
    if (!m) return v.toLowerCase();
    const d = new RegExp(`${m[1]}:\\s*([^;]+);`).exec(root);
    assert.ok(d, `không tìm thấy token ${m[1]} trong :root`);
    v = d[1]!.trim();
  }
  return v.toLowerCase();
}

function nenCua(selector: string): string {
  const re = new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{[^}]*?background:\\s*([^;}]+)`);
  const m = re.exec(css);
  assert.ok(m, `không tìm thấy background của ${selector}`);
  return giaTri(m[1]!);
}

test("khung xương đang tải khác màu nền trang (không vô hình)", () => {
  assert.notEqual(nenCua(".skeleton-row"), nenCua("body"));
});
