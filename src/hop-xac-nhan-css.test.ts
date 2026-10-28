// Hộp xác nhận hoiXacNhan (đợt 0, Task 11): luật rê chuột chung của `.btn` (nền --c-soft-hover) có độ ưu tiên cao hơn luật rê của nút nguy hiểm trong hộp,
// làm nút đỏ đặc chữ trắng thành nền gần trắng chữ trắng (không đọc được). Luật chung phải loại riêng nút này ra.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const css = readFileSync(join(import.meta.dirname, "..", "public", "app.css"), "utf8");

test("luật rê chung của .btn loại nút nguy hiểm của hộp xác nhận", () => {
  const dong = css.split("\n").find((d) => d.includes(".btn:not(:disabled):not(.btn-primary)") && d.includes(":hover") && d.includes("--c-soft-hover"));
  assert.ok(dong, "không thấy luật rê chung của .btn");
  assert.ok(dong.includes(":not(.sheet-foot-xac-nhan .btn-danger)"), "luật rê chung phải có :not(.sheet-foot-xac-nhan .btn-danger)");
});

test("luật rê của nút nguy hiểm trong hộp nằm trong @media (hover: hover)", () => {
  const i = css.indexOf(".sheet-foot-xac-nhan .btn-danger:hover");
  assert.ok(i > 0, "thiếu luật rê của nút nguy hiểm");
  const truoc = css.lastIndexOf("@media", i);
  assert.ok(css.slice(truoc, i).startsWith("@media (hover: hover)"), "luật rê phải nằm trong @media (hover: hover)");
});
