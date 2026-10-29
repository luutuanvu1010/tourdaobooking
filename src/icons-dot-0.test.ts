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

// Lượt sửa cuối (I4, đặc tả 5.8): Hỗ trợ dùng `handset`; `chat` dành cho nút Trợ lý ở thanh trên.
test("mục Hỗ trợ ở thanh bên và thanh tab dùng hình handset, không dùng chat", async () => {
  const { THANH_BEN, THANH_TAB } = await import("./shared/muc-giao-dien.ts");
  const hoTro = [...THANH_BEN, ...THANH_TAB].filter((c) => c.trang === "gopY");
  assert.equal(hoTro.length, 2);
  for (const c of hoTro) assert.equal(c.bieuTuong, "handset");
});

test("sáu hình cũ vẫn còn", () => {
  for (const ten of ["history", "clock", "check", "chat", "lock", "handset"]) {
    assert.match(icons, new RegExp(`^\\s{2}${ten}: \\[`, "m"), `thiếu hình ${ten}`);
  }
});
