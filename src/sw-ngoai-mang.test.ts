import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sw = readFileSync(new URL("../web/sw/sw.ts", import.meta.url), "utf8");
const api = readFileSync(new URL("../web/api.ts", import.meta.url), "utf8");

test("service worker: mở trang (navigate) mà hết bộ đệm và mất mạng ⇒ trả trang /ngoai-mang; thiếu nữa thì vẫn 503 chữ", () => {
  const nhanh = sw.slice(sw.indexOf("refresh.catch(async"));
  assert.ok(nhanh.length > 0, "nhánh catch cuối staleWhileRevalidate phải là hàm async");
  assert.match(nhanh, /request\.mode === "navigate"/);
  assert.match(nhanh, /\/ngoai-mang/);
  assert.match(nhanh, /status: 503/, "không có bản dự phòng thì phải rơi về 503 chữ, không ném");
});

test("service worker: install vẫn allSettled (một mục tiền nhớ hỏng không làm hỏng cả lần cài)", () => {
  assert.match(sw, /allSettled/);
});

test("api.ts: lỗi mạng hoặc hết giờ phát tín hiệu «ngoai-mang» trước khi ném lại", () => {
  assert.match(api, /new Event\("ngoai-mang"\)/);
});
