// Đọc mã QR ở trang Quét vé (web/qr-doc-ve.ts) — Việc 9, 21/11/2026: ảnh chụp 12 MP của iPhone được thu nhỏ trước khi đọc (không đứng hình).
// Ca «khung camera không thử đảo màu» nằm ở src/vendor-jsqr.test.ts (chỉ tệp đó được dùng bộ vẽ QR để tạo ảnh thử — bài src/vendor-qr.test.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { CANH_ANH_QUET, coDoc } from "../web/qr-doc-ve.ts";

test("coDoc: ảnh lớn thu nhỏ theo cạnh dài, giữ tỉ lệ; ảnh nhỏ hoặc không đặt trần thì giữ nguyên", () => {
  assert.deepEqual(coDoc(4032, 3024, 1280), { rong: 1280, cao: 960 });
  assert.deepEqual(coDoc(3024, 4032, 1280), { rong: 960, cao: 1280 });
  assert.deepEqual(coDoc(800, 600, 1280), { rong: 800, cao: 600 });
  assert.deepEqual(coDoc(4032, 3024), { rong: 4032, cao: 3024 });
  assert.ok(CANH_ANH_QUET >= 1000 && CANH_ANH_QUET <= 2048);
});
