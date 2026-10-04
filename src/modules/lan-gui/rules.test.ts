import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_LAN_GUI_SECRET, kiemCauHinhLanGui, vanTay } from "./rules.ts";

const K = "k".repeat(48);

test("kiemCauHinhLanGui (T15): thiếu / rỗng / 31 ký tự ⇒ lỗi (không in giá trị); 32 ⇒ null", () => {
  assert.equal(MIN_LAN_GUI_SECRET, 32);
  assert.match(kiemCauHinhLanGui(undefined)!, /Thiếu LAN_GUI_SECRET/);
  assert.match(kiemCauHinhLanGui("")!, /Thiếu LAN_GUI_SECRET/);
  const ngan = kiemCauHinhLanGui("z".repeat(31))!;
  assert.match(ngan, /quá ngắn \(31 < 32/);
  assert.ok(!ngan.includes("zzz"), "không in giá trị khoá");
  assert.equal(kiemCauHinhLanGui("z".repeat(32)), null);
});

test("vanTay: HMAC-SHA-256 hex 64 ký tự, ổn định", async () => {
  const a = await vanTay(K, "POST", "/api/orders", '{"a":1}');
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(await vanTay(K, "POST", "/api/orders", '{"a":1}'), a);
});

test("vanTay: đổi một byte thân, đổi khoá, đổi phương thức, đổi đường dẫn, đổi query ⇒ khác", async () => {
  const a = await vanTay(K, "POST", "/api/orders", '{"a":1}');
  assert.notEqual(await vanTay(K, "POST", "/api/orders", '{"a":2}'), a);
  assert.notEqual(await vanTay("q".repeat(48), "POST", "/api/orders", '{"a":1}'), a);
  assert.notEqual(await vanTay(K, "PUT", "/api/orders", '{"a":1}'), a);
  assert.notEqual(await vanTay(K, "POST", "/api/orders/x", '{"a":1}'), a);
  assert.notEqual(await vanTay(K, "POST", "/api/orders?x=1", '{"a":1}'), a);
});

test("vanTay: thân rỗng băm phương thức + đường dẫn; không lẫn ranh giới trường", async () => {
  const r = await vanTay(K, "DELETE", "/api/x", "");
  assert.match(r, /^[0-9a-f]{64}$/);
  assert.notEqual(await vanTay(K, "POST", "/api/x", ""), r);
  // "POST" + "/a" + "b" không được trùng "POST" + "/ab" + "" (ranh giới bằng ký tự xuống dòng).
  assert.notEqual(await vanTay(K, "POST", "/a", "b"), await vanTay(K, "POST", "/ab", ""));
});

test("vanTay: không phải SHA-256 trơn của nội dung (có khoá)", async () => {
  const tron = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("POST\n/api/x\n{}"))).toString("hex");
  assert.notEqual(await vanTay(K, "POST", "/api/x", "{}"), tron);
});
