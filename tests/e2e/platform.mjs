// Hành vi chung của router (src/shared/router.ts): 404/405 JSON, chặn ghi cross-site (CSRF), chỉ nhận JSON.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, freshIp, manualService, orderInput, session } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const raw = (method, path, headers, body) =>
  fetch(BASE + path, { method, headers: { "cf-connecting-ip": freshIp(), ...headers }, body }).then(async (r) => ({ status: r.status, headers: r.headers, body: await r.json().catch(() => null) }));

// 404 / 405 thống nhất, thân JSON
let r = await call(SALES, "GET", "/api/khong-co");
assert.equal(r.status, 404); assert.equal(r.body.error.code, "not_found");
r = await call(SALES, "DELETE", "/api/orders");
assert.equal(r.status, 405); assert.equal(r.body.error.code, "method_not_allowed");
assert.match(r.headers.get("allow"), /GET/); assert.match(r.headers.get("allow"), /POST/);
r = await call(null, "GET", "/api/orders");
assert.equal(r.status, 401, "route cần đăng nhập → 401 trước handler");
r = await call(SALES, "GET", "/api/audit");
assert.equal(r.status, 403, "route admin với sales → 403");
console.log("✓ 404/405/401/403 thống nhất");

// CSRF: ghi mà không có Origin (và không có Sec-Fetch-Site same-origin) hoặc Origin lạ → 403, không có tác dụng
const input = orderInput({ customerName: "CSRF", customerPhone: "0901234567", services: [manualService([{ description: "x", quantity: 1, unitPrice: 1 }])] });
const before = (await call(SALES, "GET", "/api/orders?q=CSRF")).body.orders.length;
r = await raw("POST", "/api/orders", { cookie: SALES, "content-type": "application/json" }, JSON.stringify(input));
assert.equal(r.status, 403); assert.equal(r.body.error.code, "cross_origin");
r = await raw("POST", "/api/orders", { cookie: SALES, "content-type": "application/json", origin: "https://evil.tourdao.vn" }, JSON.stringify(input));
assert.equal(r.status, 403);
r = await raw("POST", "/api/orders", { cookie: SALES, "content-type": "application/json", "sec-fetch-site": "same-origin" }, JSON.stringify(input));
assert.equal(r.status, 201, "trình duyệt cùng trang không gửi Origin nhưng có Sec-Fetch-Site → cho qua");
// form enctype="text/plain" giả JSON
r = await raw("POST", "/api/orders", { cookie: SALES, "content-type": "text/plain", origin: BASE }, JSON.stringify(input));
assert.equal(r.status, 415); assert.equal(r.body.error.code, "unsupported_media_type");
assert.equal((await call(SALES, "GET", "/api/orders?q=CSRF")).body.orders.length, before + 1, "chỉ đúng request hợp lệ tạo đơn");
// POST không thân, đúng hình dạng trình duyệt gửi (web/api.ts: không content-type, không body) — đăng xuất, mở khoá, đặt lại PIN…
r = await raw("POST", "/api/auth/logout", { cookie: ADMIN, origin: BASE });
assert.equal(r.status, 200, `POST không thân phải qua: ${r.status} ${JSON.stringify(r.body)}`);
r = await call(ADMIN, "POST", "/api/auth/logout");
assert.equal(r.status, 200);
// GET không bị kiểm Origin
assert.equal((await raw("GET", "/api/orders", { cookie: SALES })).status, 200);
console.log("✓ chặn ghi cross-site và thân không phải JSON");
console.log("E2E PLATFORM OK");
