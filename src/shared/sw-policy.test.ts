import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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

// Màn đăng nhập v1.0 nạp script và khung của Cloudflare Turnstile (public/_headers cho phép challenges.cloudflare.com). Chúng KHÔNG bao giờ được nằm trong cache khung của app:
// bản cũ của script/khung xác minh là bản không còn được Cloudflare chấp nhận, và cache là nơi tài nguyên của bên thứ ba âm thầm ở lại. Đây là bài kiểm mô tả hành vi: chốt cả hai lớp
// (quyết định theo nguồn ở `routeFor`, quyết định theo nội dung ở `isCacheable`) — ai đó sửa `routeFor` sang khớp theo đường dẫn thay vì theo nguồn thì bài này đỏ.
const CF = "https://challenges.cloudflare.com";
test("script, khung và mọi yêu cầu của Cloudflare Turnstile không bao giờ vào cache của service worker", () => {
  for (const u of [
    `${CF}/turnstile/v0/api.js`,
    `${CF}/turnstile/v0/api.js?render=explicit`,
    `${CF}/turnstile/v0/g/330e41bb475c/api.js`, // đích của lần chuyển hướng 302 thật
    `${CF}/cdn-cgi/challenge-platform/h/g/turnstile/if/ov2/av0/rcv/abcd/0x4AAAAAAA/auto/fbE/normal/auto/`, // khung (iframe) của widget
    `${CF}/cdn-cgi/challenge-platform/h/g/orchestrate/chl_api/v1`,
    `${CF}/turnstile/v0/siteverify`,
  ]) assert.equal(routeFor("GET", u, ORIGIN), "pass", u);
});

test("khác nguồn thì 'pass' kể cả khi đường dẫn TRÔNG GIỐNG tệp của khung app (quyết định theo nguồn, không theo đường dẫn)", () => {
  for (const p of ["/", "/login", "/app.css", "/js/login.js", "/fonts/nunito-latin-viet-var.woff2", "/icons/icon-192.png", "/manifest.webmanifest"]) {
    assert.equal(routeFor("GET", CF + p, ORIGIN), "pass", CF + p);
    assert.equal(routeFor("GET", "http://booking.tourdao.vn" + p, ORIGIN), "pass", "khác giao thức là khác nguồn: http://" + p);
    assert.equal(routeFor("GET", "https://sub.booking.tourdao.vn" + p, ORIGIN), "pass", "tên miền con là khác nguồn: " + p);
  }
});

test("lớp thứ hai: phản hồi khác nguồn hoặc không đọc được (script/khung của Cloudflare) không bao giờ qua isCacheable", () => {
  for (const contentType of ["text/javascript; charset=utf-8", "application/javascript", "text/html; charset=utf-8", "text/css"]) {
    assert.equal(isCacheable({ status: 200, type: "cors", redirected: false, contentType }), false, `cors ${contentType}`);
    assert.equal(isCacheable({ status: 200, type: "opaque", redirected: false, contentType }), false, `opaque ${contentType}`);
    assert.equal(isCacheable({ status: 0, type: "opaque", redirected: false, contentType }), false, `opaque status 0 ${contentType}`);
  }
  // api.js được phục vụ qua chuyển hướng 302 → phản hồi đã chuyển hướng cũng không được lưu
  assert.equal(isCacheable({ status: 200, type: "basic", redirected: true, contentType: "text/javascript" }), false);
});

test("danh sách nạp sẵn và trang chỉ chứa đường dẫn tương đối của app (không có địa chỉ tuyệt đối, không có Cloudflare)", () => {
  for (const p of [...PRECACHE, ...PAGES]) assert.ok(p.startsWith("/") && !p.startsWith("//") && !p.includes("://") && !/cloudflare/i.test(p), p);
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

// Tối ưu tải 2026-09-27: mọi trang và mọi tệp JS của trang phải nằm sẵn trong máy ngay khi cài bản mới — không để lần bấm đầu tiên sau mỗi lần
// triển khai phải kéo cả trang qua mạng. Đọc danh sách tệp từ chính script `build:web` nên thêm trang mới mà quên nạp sẵn thì bài này đỏ.
test("nạp sẵn đủ mọi trang và mọi tệp JS do build:web sinh ra", () => {
  const script: string = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).scripts["build:web"];
  const bundles = [...script.matchAll(/web\/([A-Za-z0-9_-]+)\.ts/g)].map((m) => `/js/${m[1]}.js`);
  assert.ok(bundles.length >= 10, "không đọc được danh sách trang từ build:web");
  for (const p of [...PAGES, ...bundles]) assert.ok(PRECACHE.includes(p), `thiếu trong PRECACHE: ${p}`);
});

test("mã phiên bản do build chèn; ngoài bản build (như test này) là 'dev'; tên cache gắn với phiên bản", () => {
  assert.equal(CACHE_VERSION, "dev");
  assert.equal(CACHE_NAME, "td-shell-dev");
});
