import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { CACHE_NAME, CACHE_VERSION, PAGES, PRECACHE, cacheKey, isCacheable, routeFor } from "./sw-policy.ts";

const ORIGIN = "https://booking.tourdao.vn";
const shell = (p: string) => routeFor("GET", ORIGIN + p, ORIGIN);

test("/api/* không bao giờ qua cache, kể cả có query", () => {
  for (const p of ["/api/orders", "/api/orders?limit=30", "/api/auth/me", "/api/", "/api"]) {
    assert.equal(shell(p), "pass", p);
  }
});

// QA2 độc lập lần 1, Q2-01: router của Worker khớp đường dẫn bằng split("/").filter(Boolean) nên "//api/auth/me" VẪN chạm API thật;
// bộ lọc theo tiền tố "/api" của service worker từng phân loại nó là "shell" và cache phản hồi JSON có dữ liệu phiên.
test("mọi biến thể đường dẫn tới API đều không vào cache (dấu / lặp, mã hoá, chữ hoa, dấu chấm)", () => {
  for (const p of ["//api/auth/me", "///api/orders", "//api/orders?limit=30", "/%61pi/auth/me", "/API/auth/me", "/api%2Fauth/me", "/./api/auth/me", "/x/../api/auth/me", "/api;x/orders"]) {
    assert.equal(shell(p), "pass", p);
  }
});

test("đóng theo mặc định: đường dẫn lạ (kể cả giống /api) không vào cache", () => {
  for (const p of ["/apiary", "/api-docs", "/x.json", "/js/../secret", "/js/a/b.js", "/icons/x.svg", "/random", "/order/", "/login/", "/login.html", "/fonts/a/b.woff2", "/fonts/x.woff", "/fonts/x.ttf", "/fonts/../secret.woff2"]) {
    assert.equal(shell(p), "pass", p);
  }
});

test("chỉ GET mới vào cache khung", () => {
  for (const m of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) assert.equal(routeFor(m, ORIGIN + "/", ORIGIN), "pass", m);
});

test("khác origin thì không đụng tới", () => {
  assert.equal(routeFor("GET", "https://docs.google.com/x", ORIGIN), "pass");
});

test("/sw.js không tự cache chính nó", () => {
  assert.equal(shell("/sw.js"), "pass");
});

test("trang và tài nguyên tĩnh đã biết vào cache khung (query của trang bị bỏ qua khi khớp)", () => {
  for (const p of ["/", "/login", "/order?id=1", "/order-form?id=1", "/js/orders.js", "/js/order-form.js", "/app.css", "/icons/icon-192.png", "/icons/apple-touch-icon.png", "/manifest.webmanifest", "/fonts/nunito-latin-viet-var.woff2", "/fonts/be-vietnam-pro-latin-viet-800.woff2"]) {
    assert.equal(shell(p), "shell", p);
  }
});

test("danh sách trang khớp đúng các file HTML trong public/ (không lệch khi thêm hoặc bớt trang)", () => {
  const files = readdirSync(new URL("../../public/", import.meta.url)).filter((f) => f.endsWith(".html"));
  const routes = files.map((f) => (f === "index.html" ? "/" : "/" + f.replace(/\.html$/, ""))).sort();
  assert.deepEqual([...PAGES].sort(), routes);
});

test("khoá cache bỏ query và hash", () => {
  assert.equal(cacheKey(ORIGIN + "/order?id=abc#x"), ORIGIN + "/order");
  assert.equal(cacheKey(ORIGIN + "/"), ORIGIN + "/");
});

const ok = { status: 200, type: "basic", redirected: false };

test("chỉ cache phản hồi 200 cùng origin, không chuyển hướng", () => {
  assert.equal(isCacheable({ ...ok, contentType: "text/html; charset=utf-8" }), true);
  assert.equal(isCacheable({ ...ok, status: 404, contentType: "text/html" }), false);
  assert.equal(isCacheable({ status: 0, type: "opaqueredirect", redirected: false, contentType: "text/html" }), false);
  assert.equal(isCacheable({ ...ok, type: "cors", contentType: "text/html" }), false);
  assert.equal(isCacheable({ ...ok, redirected: true, contentType: "text/html" }), false);
});

// Lớp chắn thứ hai (Q2-01): dù đường dẫn có lọt qua bộ lọc, JSON/văn bản thường không bao giờ vào cache.
test("chỉ cache đúng các loại nội dung của khung; JSON, văn bản thường và không rõ loại thì không", () => {
  for (const t of ["text/html; charset=utf-8", "text/css; charset=utf-8", "text/javascript; charset=utf-8", "application/javascript", "image/png", "font/woff2", "application/manifest+json"]) {
    assert.equal(isCacheable({ ...ok, contentType: t }), true, t);
  }
  for (const t of ["application/json", "application/json; charset=utf-8", "text/plain; charset=utf-8", "application/octet-stream", "image/svg+xml", "font/woff", "font/ttf", "", null]) {
    assert.equal(isCacheable({ ...ok, contentType: t }), false, String(t));
  }
});

test("danh sách nạp sẵn: không trùng và đều thuộc cache khung", () => {
  assert.equal(new Set(PRECACHE).size, PRECACHE.length);
  for (const p of PRECACHE) assert.equal(shell(p), "shell", p);
});

test("mã phiên bản do build chèn; ngoài bản build (như test này) là 'dev'; tên cache gắn với phiên bản", () => {
  assert.equal(CACHE_VERSION, "dev");
  assert.equal(CACHE_NAME, "td-shell-dev");
});
