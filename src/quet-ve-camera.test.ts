// Máy canh quyền camera (ADR-0175 Đ3, đặc tả §2.12): chỉ trang /quet-ve được mở camera; mọi nơi khác vẫn `camera=()`, định vị luôn tắt.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

interface Khoi { duong: string; dong: string[] }
const goc = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const khoi: Khoi[] = [];
for (const dong of goc.split("\n")) {
  if (dong.trim() === "" || dong.trimStart().startsWith("#")) continue;
  if (!/^\s/.test(dong)) khoi.push({ duong: dong.trim(), dong: [] });
  else khoi[khoi.length - 1]?.dong.push(dong.trim());
}
const chinhSach = (k: Khoi): string[] => k.dong.filter((d) => d.startsWith("Permissions-Policy:")).map((d) => d.slice("Permissions-Policy:".length).trim());

test("/* vẫn tắt camera, micro và định vị", () => {
  const k = khoi.find((x) => x.duong === "/*");
  assert.ok(k, "thiếu khối /*");
  assert.deepEqual(chinhSach(k), ["camera=(), microphone=(), geolocation=()"]);
});

test("đúng một khối mở camera và đó là /quet-ve", () => {
  const mo = khoi.filter((k) => chinhSach(k).some((c) => /camera=\(self\)/.test(c)));
  assert.equal(mo.length, 1);
  assert.equal(mo[0]!.duong, "/quet-ve");
  assert.deepEqual(chinhSach(mo[0]!), ["camera=(self), microphone=(), geolocation=()"]);
});

test("khối /quet-ve gỡ chính sách của /* trước khi đặt lại (Cloudflare nối đầu cùng tên)", () => {
  const k = khoi.find((x) => x.duong === "/quet-ve")!;
  const gỡ = k.dong.indexOf("! Permissions-Policy");
  const đặt = k.dong.findIndex((d) => d.startsWith("Permissions-Policy:"));
  assert.ok(gỡ >= 0 && đặt > gỡ, "phải có `! Permissions-Policy` rồi mới đặt giá trị mới");
});

test("geolocation=() ở mọi khối có Permissions-Policy, và micro luôn tắt", () => {
  for (const k of khoi) for (const c of chinhSach(k)) {
    assert.match(c, /geolocation=\(\)/, k.duong);
    assert.match(c, /microphone=\(\)/, k.duong);
  }
});
