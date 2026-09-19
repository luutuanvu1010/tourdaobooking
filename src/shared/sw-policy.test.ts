import { test } from "node:test";
import assert from "node:assert/strict";
import { CACHE_NAME, CACHE_VERSION, PRECACHE, cacheKey, isCacheable, routeFor } from "./sw-policy.ts";

const ORIGIN = "https://sales.tourdao.vn";

test("/api/* không bao giờ qua cache, kể cả có query", () => {
  for (const p of ["/api/orders", "/api/orders?limit=30", "/api/auth/me", "/api/", "/api"]) {
    assert.equal(routeFor("GET", ORIGIN + p, ORIGIN), "pass", p);
  }
});

test("không nhầm đường dẫn chỉ bắt đầu giống /api", () => {
  assert.equal(routeFor("GET", ORIGIN + "/apiary", ORIGIN), "shell");
});

test("chỉ GET mới vào cache khung", () => {
  for (const m of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) assert.equal(routeFor(m, ORIGIN + "/", ORIGIN), "pass", m);
});

test("khác origin thì không đụng tới", () => {
  assert.equal(routeFor("GET", "https://docs.google.com/x", ORIGIN), "pass");
});

test("/sw.js không tự cache chính nó", () => {
  assert.equal(routeFor("GET", ORIGIN + "/sw.js", ORIGIN), "pass");
});

test("trang và tài nguyên tĩnh vào cache khung", () => {
  for (const p of ["/", "/login", "/order?id=1", "/js/orders.js", "/app.css", "/icons/icon-192.png", "/manifest.webmanifest"]) {
    assert.equal(routeFor("GET", ORIGIN + p, ORIGIN), "shell", p);
  }
});

test("khoá cache bỏ query và hash", () => {
  assert.equal(cacheKey(ORIGIN + "/order?id=abc#x"), ORIGIN + "/order");
  assert.equal(cacheKey(ORIGIN + "/"), ORIGIN + "/");
});

test("chỉ cache phản hồi 200 cùng origin, không chuyển hướng", () => {
  assert.equal(isCacheable({ status: 200, type: "basic", redirected: false }), true);
  assert.equal(isCacheable({ status: 404, type: "basic", redirected: false }), false);
  assert.equal(isCacheable({ status: 0, type: "opaqueredirect", redirected: false }), false);
  assert.equal(isCacheable({ status: 200, type: "cors", redirected: false }), false);
  assert.equal(isCacheable({ status: 200, type: "basic", redirected: true }), false);
});

test("danh sách nạp sẵn: không trùng và đều thuộc cache khung", () => {
  assert.equal(new Set(PRECACHE).size, PRECACHE.length);
  for (const p of PRECACHE) assert.equal(routeFor("GET", ORIGIN + p, ORIGIN), "shell", p);
});

test("mã phiên bản do build chèn; ngoài bản build (như test này) là 'dev'; tên cache gắn với phiên bản", () => {
  assert.equal(CACHE_VERSION, "dev");
  assert.equal(CACHE_NAME, "td-shell-dev");
});
