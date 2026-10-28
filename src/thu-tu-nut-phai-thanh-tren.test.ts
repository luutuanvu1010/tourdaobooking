// Đợt 0 Task 8 (vòng sửa 1): thứ tự nút phải của thanh trên = ô tìm → «Tạo đơn» → chuông → Trợ lý (đặc tả 5.1). Khoá ở mức mã nguồn (không có DOM thật).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const doc = (t: string): string => readFileSync(fileURLToPath(new URL(`../${t}`, import.meta.url)), "utf8");

test("chuông chèn SAU nút «Tạo đơn» (không còn before)", () => {
  const src = doc("web/thong-bao-ui.ts");
  assert.match(src, /newBtn\.after\(bell\)/);
  assert.doesNotMatch(src, /newBtn\.before\(bell\)/);
});

test("Trợ lý được gắn cuối #topbar (sau chuông)", () => {
  assert.match(doc("web/tro-ly.ts"), /thanhTren\.append\(fab\)/);
});

test("lề tự động: chuông chỉ nhận khi vắng «Tạo đơn» (và ô tìm ≥ 900)", () => {
  const css = doc("public/app.css");
  assert.match(css, /#topbar:not\(:has\(> \.topbar-new\)\) \.bell \{ margin-left: auto; \}/);
});
