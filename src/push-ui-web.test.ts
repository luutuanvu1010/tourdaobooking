// Bài kiểm LOGIC THUẦN của mục "Thông báo trên điện thoại" ở giao diện (Web Push, ADR-0036, Task 4): web/push-ui.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { b64uSangBytes, thietBiTu } from "../web/push-ui.ts";

test("thietBiTu: nhận diện iPhone/iPad, Android, còn lại coi là Máy tính", () => {
  assert.equal(thietBiTu("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)"), "iPhone");
  assert.equal(thietBiTu("Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)"), "iPhone");
  assert.equal(thietBiTu("Mozilla/5.0 (Linux; Android 14; Pixel 8)"), "Android");
  assert.equal(thietBiTu("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128"), "Máy tính");
  // iPadOS ≥13 tự nhận là "Macintosh" theo mặc định (chế độ tương thích máy tính) — coi là Máy tính, không cố đoán thêm.
  assert.equal(thietBiTu("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit"), "Máy tính");
});

test("b64uSangBytes: giải mã đúng khoá công khai VAPID (điểm EC chưa nén, 65 byte, byte đầu 0x04)", async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  assert.equal(raw.length, 65);
  assert.equal(raw[0], 0x04);
  const b64u = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const lai = b64uSangBytes(b64u);
  assert.deepEqual(lai, raw);
});

test("b64uSangBytes: chuỗi rỗng → mảng rỗng, không ném lỗi", () => {
  assert.deepEqual(b64uSangBytes(""), new Uint8Array(0));
});
