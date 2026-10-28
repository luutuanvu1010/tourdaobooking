// Đợt 0 khung chung, Task 2 (đặc tả 2026-10-28): ba hình MỚI trong `web/icons.ts` — `alertCircle` (cảnh báo trạng thái), `minus` (dải trên trang),
// `settings` (bánh răng của thanh tab Thiết lập). Sáu hình cũ vẫn phải còn, không ai xoá nhầm khi chép bảng hình.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const icons = readFileSync(new URL("../web/icons.ts", import.meta.url), "utf8");

test("ba hình mới có mặt trong SHAPES", () => {
  assert.match(icons, /^\s{2}alertCircle: \[/m);
  assert.match(icons, /^\s{2}minus: \[/m);
  assert.match(icons, /^\s{2}settings: \[/m);
});

test("sáu hình cũ vẫn còn", () => {
  for (const ten of ["history", "clock", "check", "chat", "lock", "handset"]) {
    assert.match(icons, new RegExp(`^\\s{2}${ten}: \\[`, "m"), `thiếu hình ${ten}`);
  }
});
