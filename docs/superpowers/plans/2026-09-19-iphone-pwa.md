# App iPhone (PWA) "Tour Đảo Desk" — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến giao diện web hiện có thành app cài được trên iPhone (Thêm vào Màn hình chính): icon riêng, toàn màn hình, mở tức thì, điều hướng kiểu app.

**Architecture:** Thêm manifest + icon + thẻ meta iOS + service worker (stale-while-revalidate cho khung, `/api/*` không qua cache) và một lớp giao diện ≤640px dùng chung (thanh đầu trang có "‹", thanh tab dưới đáy) do `web/shell.ts` dựng và CSS quyết định hiển thị. Máy tính giữ nguyên.

**Tech Stack:** TypeScript vanilla + esbuild (`web/` → `public/js`, `public/sw.js`), Cloudflare Workers Assets, `node:test`, e2e qua `wrangler dev`, ImageMagick (`magick`) để dựng icon một lần.

**Spec:** `docs/superpowers/specs/2026-09-19-iphone-pwa-design.md`

## Global Constraints

- Tên hiển thị "Tour Đảo Desk"; nhãn dưới icon và `short_name` "Tour Đảo". Chỉ đổi chuỗi UI/manifest, KHÔNG đổi tên Worker/D1 `tourdao-sales`.
- Màu: navy `#0c4a6e` (theme, thanh trên), san hô `#c0392b`, nền icon `#993333`.
- `/api/*` KHÔNG BAO GIỜ qua cache của service worker.
- CSP giữ nguyên (`script-src 'self'`, không script inline); dựng DOM bằng `h()`/`createElementNS`, không dùng `innerHTML`.
- Điểm gãy giao diện điện thoại: `@media (max-width: 640px)`; máy tính không đổi.
- Chữ tiếng Việt có đủ dấu; chú thích mã bằng tiếng Việt như phần còn lại của repo.
- Mỗi task kết thúc bằng một commit; thông điệp commit kết thúc bằng dòng `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Chạy mọi lệnh từ thư mục gốc worktree.

---

### Task 1: Icon, manifest, `_headers` và test e2e tĩnh

**Files:**
- Create: `public/icons/icon-512.png`, `icon-192.png`, `apple-touch-icon.png`, `logo-96.png`, `public/manifest.webmanifest`, `tests/e2e/pwa.mjs`
- Modify: `tests/e2e/run.mjs` (danh sách `ALL`), `tests/e2e/README.md` (bảng kịch bản)

**Interfaces:**
- Produces: các URL `/manifest.webmanifest`, `/icons/{icon-192,icon-512,apple-touch-icon,logo-96}.png` mà Task 3–5 tham chiếu; kịch bản e2e `pwa` mà Task 3 và 4 mở rộng.

- [ ] **Step 1: Viết test e2e (sẽ đỏ)** — tạo `tests/e2e/pwa.mjs`:

```js
// PWA: manifest, icon, service worker và thẻ meta iOS được phục vụ đúng (không cần đăng nhập).
import assert from "node:assert/strict";
import { BASE } from "./lib.mjs";

const get = (path) => fetch(BASE + path);

/** Đọc kích thước và kiểu màu từ header PNG (IHDR): colorType 2 = RGB, không kênh alpha. */
async function png(path) {
  const res = await get(path);
  assert.equal(res.status, 200, `${path} → ${res.status}`);
  assert.equal(res.headers.get("content-type"), "image/png", `${path} sai content-type`);
  const b = Buffer.from(await res.arrayBuffer());
  assert.equal(b.subarray(1, 4).toString(), "PNG", `${path} không phải PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
}

// manifest: phục vụ đúng content-type, đúng nội dung
const res = await get("/manifest.webmanifest");
assert.equal(res.status, 200, "manifest phải có");
assert.match(res.headers.get("content-type") ?? "", /^application\/(manifest\+)?json/, "manifest sai content-type — nếu Workers Assets phục vụ sai, đổi tên file thành manifest.json");
const manifest = await res.json();
assert.equal(manifest.name, "Tour Đảo Desk");
assert.equal(manifest.short_name, "Tour Đảo");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.theme_color, "#0c4a6e");
for (const icon of manifest.icons) {
  const size = Number(icon.sizes.split("x")[0]);
  const p = await png(icon.src);
  assert.deepEqual([p.width, p.height], [size, size], `${icon.src} khai ${icon.sizes}`);
}
assert.ok(manifest.icons.some((i) => i.sizes === "192x192") && manifest.icons.some((i) => i.sizes === "512x512"), "manifest cần icon 192 và 512");
console.log("✓ manifest");

// icon: đúng kích thước và KHÔNG có kênh alpha (iOS tô đen vùng trong suốt)
for (const [path, size] of [["/icons/apple-touch-icon.png", 180], ["/icons/icon-192.png", 192], ["/icons/icon-512.png", 512], ["/icons/logo-96.png", 96]]) {
  const p = await png(path);
  assert.deepEqual([p.width, p.height], [size, size], `${path} phải ${size}×${size}`);
  assert.equal(p.colorType, 2, `${path} phải là RGB không alpha`);
}
console.log("✓ icon");
console.log("E2E PWA OK");
```

- [ ] **Step 2: Đăng ký kịch bản** — trong `tests/e2e/run.mjs` đổi dòng `ALL`:

```js
const ALL = ["platform", "pwa", "orders", "admin", "catalog", "admin-race"];
```

Trong `tests/e2e/README.md`, thêm một dòng vào bảng (sau dòng `platform.mjs`):

```
| `pwa.mjs` | manifest đúng content-type/nội dung, icon đúng kích thước và không alpha, `/sw.js` không cache, đủ thẻ meta iOS + tên mới trên cả 8 trang, `/api/*` là `no-store` |
```

- [ ] **Step 3: Chạy để thấy test đỏ**

Run: `npm run test:e2e -- pwa`
Expected: FAIL, `manifest phải có` (404).

- [ ] **Step 4: Dựng icon** (ImageMagick; nguồn `Logo-Cty-Tour-Dao.png` 500×500 từ Sanity của tourdaovn; nền `#993333` là màu vòng tròn của logo; `PNG24:` ép RGB không alpha):

```bash
mkdir -p public/icons "$CLAUDE_JOB_DIR/tmp/logo"
[ -f "$CLAUDE_JOB_DIR/tmp/logo/logo500.png" ] || curl -fsSL -o "$CLAUDE_JOB_DIR/tmp/logo/logo500.png" "https://cdn.sanity.io/images/pgedy374/production/ee4443a89ddd67a2187a8c6b34d37f6f31678fe3-500x500.png"
magick -size 512x512 xc:"#993333" \( "$CLAUDE_JOB_DIR/tmp/logo/logo500.png" -crop 300x280+100+60 +repage -resize 348x \) -gravity center -composite -alpha off PNG24:public/icons/icon-512.png
magick public/icons/icon-512.png -resize 192x192 PNG24:public/icons/icon-192.png
magick public/icons/icon-512.png -resize 180x180 PNG24:public/icons/apple-touch-icon.png
magick public/icons/icon-512.png -resize 96x96 PNG24:public/icons/logo-96.png
```

- [ ] **Step 5: Tạo `public/manifest.webmanifest`**

```json
{
  "name": "Tour Đảo Desk",
  "short_name": "Tour Đảo",
  "description": "Lập và quản lý đơn hàng tour cho nhân viên Tour Đảo.",
  "lang": "vi",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0c4a6e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
```

- [ ] **Step 6: Chạy lại, phải xanh**

Run: `npm run test:e2e -- pwa`
Expected: `✓ manifest`, `✓ icon`, `E2E PWA OK`. Nếu content-type manifest sai: đổi tên file thành `public/manifest.json`, sửa test và mọi `href` cho khớp (Task 4).

- [ ] **Step 7: Commit**

```bash
git add public/icons public/manifest.webmanifest tests/e2e/pwa.mjs tests/e2e/run.mjs tests/e2e/README.md
git commit -m "PWA: icon từ logo thật, manifest và test e2e tĩnh

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Chính sách cache của service worker (hàm thuần + test)

**Files:**
- Create: `src/shared/sw-policy.ts`, `src/shared/sw-policy.test.ts`

**Interfaces:**
- Produces (Task 3 dùng): `CACHE_VERSION: string`, `CACHE_NAME: string`, `PRECACHE: readonly string[]`, `type Route = "pass" | "shell"`, `routeFor(method: string, url: string, origin: string): Route`, `cacheKey(url: string): string`, `isCacheable(res: { status: number; type: string; redirected: boolean }): boolean`.

- [ ] **Step 1: Viết test (đỏ)** — `src/shared/sw-policy.test.ts`:

```ts
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

test("tên cache gắn với phiên bản", () => {
  assert.ok(CACHE_NAME.endsWith(CACHE_VERSION));
});
```

- [ ] **Step 2: Chạy, phải đỏ**

Run: `node --test src/shared/sw-policy.test.ts`
Expected: FAIL, không tìm thấy `./sw-policy.ts`.

- [ ] **Step 3: Cài đặt** — `src/shared/sw-policy.ts`:

```ts
// Chính sách bộ nhớ đệm của service worker — hàm thuần để kiểm thử được; web/sw/sw.ts chỉ nối vào sự kiện.

/** Tăng tay khi một lần deploy đổi API không tương thích: cache cũ bị xoá, khung phải tải lại. */
export const CACHE_VERSION = "v1";
export const CACHE_NAME = `td-shell-${CACHE_VERSION}`;

/** Nạp sẵn lúc cài (đường dẫn đúng như trình duyệt yêu cầu, không có .html). Trang admin tự vào cache ở lần mở đầu. */
export const PRECACHE: readonly string[] = [
  "/", "/login", "/order-form", "/order", "/account",
  "/app.css",
  "/js/login.js", "/js/orders.js", "/js/order-form.js", "/js/order.js", "/js/account.js",
  "/manifest.webmanifest",
  "/icons/logo-96.png", "/icons/icon-192.png",
];

export type Route = "pass" | "shell";

/** "pass" = service worker không đụng vào (mạng xử lý như bình thường). /api/* luôn "pass": có dữ liệu khách và phiên. */
export function routeFor(method: string, url: string, origin: string): Route {
  if (method !== "GET") return "pass";
  const u = new URL(url);
  if (u.origin !== origin) return "pass";
  if (u.pathname === "/api" || u.pathname.startsWith("/api/")) return "pass";
  if (u.pathname === "/sw.js") return "pass";
  return "shell";
}

/** Bỏ query/hash: mọi /order?id=… dùng chung một mục cache (cùng một file HTML). */
export function cacheKey(url: string): string {
  const u = new URL(url);
  return u.origin + u.pathname;
}

/** Không lưu lỗi, phản hồi khác origin hay chuyển hướng (trả lại cho yêu cầu điều hướng sẽ lỗi). */
export function isCacheable(res: { status: number; type: string; redirected: boolean }): boolean {
  return res.status === 200 && res.type === "basic" && !res.redirected;
}
```

- [ ] **Step 4: Chạy, phải xanh**

Run: `node --test src/shared/sw-policy.test.ts && npm run typecheck`
Expected: 10 test pass; typecheck không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/shared/sw-policy.ts src/shared/sw-policy.test.ts
git commit -m "PWA: chính sách cache service worker (hàm thuần có test)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Service worker, build, đăng ký, `_headers`

**Files:**
- Create: `web/sw/sw.ts`, `web/sw/tsconfig.json`, `web/pwa.ts`
- Modify: `package.json` (scripts `build:web`, `typecheck`), `.gitignore`, `web/tsconfig.json`, `public/_headers`, `web/shell.ts`, `web/login.ts`, `tests/e2e/pwa.mjs`

**Interfaces:**
- Consumes: `CACHE_NAME`, `PRECACHE`, `cacheKey`, `isCacheable`, `routeFor` (Task 2).
- Produces: `registerServiceWorker(): void` từ `web/pwa.ts` (Task 5 giữ lời gọi trong `initShell`); file build `public/sw.js`.

- [ ] **Step 1: Mở rộng test e2e (đỏ)** — thêm vào cuối `tests/e2e/pwa.mjs`, TRƯỚC dòng `console.log("E2E PWA OK");`, và thêm `call` vào import (`import { BASE, call } from "./lib.mjs";`):

```js
// service worker: có file, không bị cache cứng (để bản mới được nhận), API là no-store
const sw = await get("/sw.js");
assert.equal(sw.status, 200, "/sw.js phải có (npm run build:web)");
assert.match(sw.headers.get("content-type") ?? "", /javascript/);
assert.match(sw.headers.get("cache-control") ?? "", /no-cache/, "/sw.js phải Cache-Control: no-cache (public/_headers)");
assert.match(await sw.text(), /td-shell-v/, "sw.js phải chứa tên cache");
const me = await call(null, "GET", "/api/auth/me");
assert.equal(me.headers.get("cache-control"), "no-store", "API phải no-store");
console.log("✓ service worker + API no-store");
```

Run: `npm run test:e2e -- pwa` → Expected FAIL `/sw.js phải có`.

- [ ] **Step 2: Tạo `web/sw/sw.ts`**

```ts
/// <reference lib="webworker" />
// Service worker: khung app (HTML/CSS/JS/icon) mở tức thì từ cache, tải bản mới ngầm; /api/* không bao giờ qua đây.
import { CACHE_NAME, PRECACHE, cacheKey, isCacheable, routeFor } from "../../src/shared/sw-policy";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  // Lỗi một mục (vd chưa build) không làm hỏng cả lần cài.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url)))));
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name !== CACHE_NAME) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // Thoát sớm, KHÔNG gọi respondWith: mạng xử lý như bình thường (bắt buộc với /api/*).
  if (routeFor(event.request.method, event.request.url, self.location.origin) === "pass") return;
  event.respondWith(staleWhileRevalidate(event));
});

async function staleWhileRevalidate(event: FetchEvent): Promise<Response> {
  const key = cacheKey(event.request.url);
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(key);
  const refresh = fetch(event.request).then(async (res) => {
    if (isCacheable(res)) await cache.put(key, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }
  return refresh.catch(() => new Response("Không có kết nối mạng.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }));
}
```

- [ ] **Step 2b: Tạo `web/sw/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "WebWorker"],
    "types": [],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["."]
}
```

- [ ] **Step 3: Cấu hình build/typecheck**

`web/tsconfig.json`: thêm sau `"include": ["."]` → `"include": ["."],\n  "exclude": ["sw"]`.

`package.json`: đổi hai script:

```json
"typecheck": "tsc --noEmit && tsc --noEmit -p web && tsc --noEmit -p web/sw",
"build:web": "esbuild web/login.ts web/orders.ts web/order-form.ts web/order.ts web/audit.ts web/staff.ts web/account.ts web/catalog.ts --bundle --format=esm --target=es2022 --minify --outdir=public/js && esbuild web/sw/sw.ts --bundle --format=iife --target=es2022 --minify --outfile=public/sw.js",
```

`.gitignore`: thêm dòng `public/sw.js` (sau `public/js`).

`public/_headers`: thêm vào cuối file:

```
/sw.js
  Cache-Control: no-cache
```

- [ ] **Step 4: Đăng ký** — tạo `web/pwa.ts`:

```ts
/** Đăng ký service worker (khung app mở tức thì). Không hỗ trợ hoặc lỗi thì bỏ qua: app vẫn chạy như web thường. */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
```

`web/shell.ts`: thêm import `import { registerServiceWorker } from "./pwa";` và dòng đầu tiên trong `initShell()`: `registerServiceWorker();`.
`web/login.ts`: thêm import `import { registerServiceWorker } from "./pwa";` và dòng `registerServiceWorker();` ngay sau các dòng `import`.

- [ ] **Step 5: Kiểm tra**

Run: `npm run typecheck && npm run build:web && ls -la public/sw.js && npm run test:e2e -- pwa`
Expected: typecheck sạch; có `public/sw.js`; e2e in `✓ service worker + API no-store` và `E2E PWA OK`.

- [ ] **Step 6: Commit**

```bash
git add web/sw web/pwa.ts web/tsconfig.json web/shell.ts web/login.ts package.json .gitignore public/_headers tests/e2e/pwa.mjs
git commit -m "PWA: service worker stale-while-revalidate, /api/* không qua cache

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Thẻ meta iOS, tên mới và thuộc tính trang trên 8 file HTML

**Files:**
- Modify: `public/index.html`, `login.html`, `order-form.html`, `order.html`, `account.html`, `catalog.html`, `staff.html`, `audit.html`, `tests/e2e/pwa.mjs`

**Interfaces:**
- Produces (Task 5 đọc): thuộc tính `<body data-title data-back data-tabbar>`; `class="login-page"` cho trang đăng nhập.

- [ ] **Step 1: Mở rộng test (đỏ)** — thêm vào `tests/e2e/pwa.mjs` trước `console.log("E2E PWA OK");`:

```js
// 8 trang: đủ thẻ meta iOS + tên mới, không còn tên cũ
const NEEDLES = [
  "viewport-fit=cover",
  'rel="manifest"',
  'rel="apple-touch-icon"',
  'name="apple-mobile-web-app-capable" content="yes"',
  'content="black-translucent"',
  'name="apple-mobile-web-app-title" content="Tour Đảo"',
  "— Tour Đảo Desk</title>",
];
for (const path of ["/", "/login", "/order-form", "/order", "/account", "/catalog", "/staff", "/audit"]) {
  const html = await (await get(path)).text();
  for (const needle of NEEDLES) assert.ok(html.includes(needle), `${path} thiếu ${needle}`);
  assert.ok(!html.includes("Tour Đảo Sales"), `${path} còn tên cũ`);
}
console.log("✓ thẻ meta iOS trên 8 trang");
```

Run: `npm run test:e2e -- pwa` → Expected FAIL `/ thiếu viewport-fit=cover`.

- [ ] **Step 2: Viết script viết lại phần `<head>`** (chạy một lần, không commit) — lưu vào `$CLAUDE_JOB_DIR/tmp/rewrite-heads.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs";

const PAGES = {
  "index.html": { title: "Đơn hàng", body: "" },
  "login.html": { title: "Đăng nhập", body: ' class="login-page"' },
  "order-form.html": { title: "Lập đơn", body: ' data-title="Tạo đơn mới" data-back="/" data-tabbar="off"' },
  "order.html": { title: "Chi tiết đơn", body: ' data-title="Chi tiết đơn" data-back="/"' },
  "account.html": { title: "Tôi", body: ' data-title="Tôi"' },
  "catalog.html": { title: "Dịch vụ", body: ' data-title="Dịch vụ"' },
  "staff.html": { title: "Nhân viên", body: ' data-title="Nhân viên"' },
  "audit.html": { title: "Nhật ký", body: ' data-title="Nhật ký" data-back="/account"' },
};

const head = (t) =>
  '<head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<meta name="robots" content="noindex">' +
  '<meta name="theme-color" content="#0c4a6e">' +
  '<meta name="apple-mobile-web-app-capable" content="yes">' +
  '<meta name="mobile-web-app-capable" content="yes">' +
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' +
  '<meta name="apple-mobile-web-app-title" content="Tour Đảo">' +
  '<link rel="manifest" href="/manifest.webmanifest">' +
  '<link rel="icon" type="image/png" href="/icons/icon-192.png">' +
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">' +
  '<link rel="stylesheet" href="/app.css">' +
  `<title>${t} — Tour Đảo Desk</title></head>`;

for (const [file, p] of Object.entries(PAGES)) {
  const path = `public/${file}`;
  const before = readFileSync(path, "utf8");
  const after = before.replace(/<head>.*<\/head>/, () => head(p.title)).replace("<body>", () => `<body${p.body}>`);
  if (after === before) throw new Error(`${path}: không đổi gì`);
  writeFileSync(path, after);
  console.log("đã sửa", path);
}
```

- [ ] **Step 3: Đổi tên trong chuỗi UI của trang đăng nhập** — `public/login.html`: đổi `<h1>Tour Đảo Sales</h1>` thành `<h1>Tour Đảo Desk</h1>` (test ở Step 1 cấm còn tên cũ). `web/shell.ts` còn chữ "Tour Đảo Sales" trong brand cho tới khi được viết lại ở Task 5 — bình thường, vì test chỉ quét HTML.

- [ ] **Step 4: Chạy script và test**

Run: `node "$CLAUDE_JOB_DIR/tmp/rewrite-heads.mjs" && git diff --stat public/*.html && npm run test:e2e -- pwa`
Expected: 8 dòng `đã sửa`, diff 8 file; e2e in `✓ thẻ meta iOS trên 8 trang` và `E2E PWA OK`.

- [ ] **Step 5: Commit**

```bash
git add public/*.html
git commit -m "PWA: thẻ meta iOS, tên Tour Đảo Desk và thuộc tính trang trên 8 trang

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Khung điện thoại — thanh đầu trang, thanh tab, vùng an toàn

**Files:**
- Create: `web/icons.ts`
- Modify: `web/shell.ts` (viết lại), `public/app.css`

**Interfaces:**
- Consumes: `registerServiceWorker` (Task 3); `data-title/data-back/data-tabbar` (Task 4); `Staff`, `Api` từ `web/api.ts`; `h`, `byId`, `replaceChildren` từ `web/dom.ts`.
- Produces (Task 6, 7 dùng): `icon(name: IconName, size?: number): SVGSVGElement`, `type IconName = "orders" | "plus" | "me" | "services" | "staff" | "back" | "next"`; từ `web/shell.ts`: `initShell(): Promise<Staff>`, `showError(el, message)`, `setBarTitle(text: string): void`, `logout(): Promise<void>`.

- [ ] **Step 1: Tạo `web/icons.ts`**

```ts
// Biểu tượng nét vẽ (SVG) dựng bằng createElementNS — repo cấm innerHTML. Màu theo `currentColor`.
const NS = "http://www.w3.org/2000/svg";
type Shape = readonly [tag: string, attrs: Record<string, string | number>];

const SHAPES = {
  orders: [["rect", { x: 5, y: 4, width: 14, height: 17, rx: 2 }], ["path", { d: "M9 9h6M9 13h6M9 17h3" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  me: [["circle", { cx: 12, cy: 8, r: 4 }], ["path", { d: "M4 21c0-4 3.5-6 8-6s8 2 8 6" }]],
  services: [["path", { d: "M3 12V4h8l10 10-8 8L3 12z" }], ["circle", { cx: 7.5, cy: 8.5, r: 1.2 }]],
  staff: [
    ["circle", { cx: 9, cy: 8, r: 3.5 }],
    ["path", { d: "M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" }],
    ["circle", { cx: 17, cy: 9, r: 2.5 }],
    ["path", { d: "M17.5 14.5c2.5.3 4 2 4 4.5" }],
  ],
  back: [["path", { d: "M15 5l-7 7 7 7" }]],
  next: [["path", { d: "M9 5l7 7-7 7" }]],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof SHAPES;

export function icon(name: IconName, size = 24): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  const bold = name === "plus" || name === "back";
  const attrs = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": bold ? 2.2 : 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, String(v));
  for (const [tag, shape] of SHAPES[name]) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(shape)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}
```

- [ ] **Step 2: Viết lại `web/shell.ts`**

```ts
import { api, type Staff, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { icon, type IconName } from "./icons";
import { registerServiceWorker } from "./pwa";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  active: (path: string) => boolean;
}

/** Thanh tab dưới đáy (điện thoại): nhân viên 3 tab, admin 5 tab. /order thuộc tab Đơn hàng, /audit thuộc tab Tôi. */
function tabsFor(staff: Staff): Tab[] {
  const adminTabs: Tab[] =
    staff.role === "admin"
      ? [
          { href: "/catalog", label: "Dịch vụ", icon: "services", active: (p) => p === "/catalog" },
          { href: "/staff", label: "Nhân viên", icon: "staff", active: (p) => p === "/staff" },
        ]
      : [];
  return [
    { href: "/", label: "Đơn hàng", icon: "orders", active: (p) => p === "/" || p === "/order" },
    { href: "/order-form", label: "Đơn mới", icon: "plus", active: (p) => p === "/order-form" },
    ...adminTabs,
    { href: "/account", label: "Tôi", icon: "me", active: (p) => p === "/account" || p === "/audit" },
  ];
}

function tabBar(staff: Staff, path: string): HTMLElement {
  return h(
    "nav",
    { id: "tabbar", "aria-label": "Điều hướng chính" },
    ...tabsFor(staff).map((t) =>
      h("a", { href: t.href, class: t.icon === "plus" ? "tab tab-new" : "tab", "aria-current": t.active(path) ? "page" : false }, h("span", { class: "tab-icon" }, icon(t.icon)), h("span", null, t.label)),
    ),
  );
}

export async function logout(): Promise<void> {
  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  location.assign("/login");
}

/** Đổi tiêu đề trên thanh đầu trang (điện thoại) sau khi trang biết nội dung, vd mã đơn. */
export function setBarTitle(text: string): void {
  const el = document.getElementById("bar-title");
  if (el) el.textContent = text;
}

/** Khung chung các trang sau đăng nhập: vẽ ngay phần không cần biết người dùng (khỏi nháy trắng), rồi xác thực phiên và điền phần còn lại. Trả nhân viên hiện tại. */
export async function initShell(): Promise<Staff> {
  registerServiceWorker();
  const { title, back, tabbar } = document.body.dataset;
  const path = location.pathname.replace(/\/+$/, "") || "/";

  const backLink = back ? h("a", { class: "bar-back", href: back, "aria-label": "Quay lại" }, icon("back", 26)) : null;
  backLink?.addEventListener("click", (e) => {
    if (history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
  const nav = h("nav", { class: "topnav" });
  const who = h("div", { class: "who" });
  replaceChildren(
    byId("topbar"),
    backLink,
    h("a", { class: "brand", href: "/" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30 }), "Tour Đảo ", h("span", null, "Desk")),
    title ? h("span", { class: "bar-title", id: "bar-title" }, title) : null,
    nav,
    who,
  );

  const { staff } = await api<Api.MeResponse>("/api/auth/me");
  const admin = staff.role === "admin";
  const logoutBtn = h("button", { class: "btn btn-link", type: "button" }, "Đăng xuất");
  logoutBtn.addEventListener("click", () => void logout());
  replaceChildren(
    nav,
    h("a", { href: "/" }, "Đơn hàng"),
    h("a", { href: "/order-form" }, "+ Đơn mới"),
    admin && h("a", { href: "/catalog" }, "Dịch vụ"),
    admin && h("a", { href: "/staff" }, "Nhân viên"),
    admin && h("a", { href: "/audit" }, "Nhật ký"),
  );
  replaceChildren(who, h("a", { href: "/account", title: "Tôi" }, staff.fullName), logoutBtn);
  if (tabbar !== "off") {
    document.body.append(tabBar(staff, path));
    document.body.classList.add("has-tabbar");
  }
  return staff;
}

export function showError(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? "";
  el.hidden = !message;
}
```

- [ ] **Step 3: Sửa hai dòng có sẵn trong `public/app.css`**

Thay dòng `#topbar { … }` (dòng đang có `padding: var(--s3) var(--s4);`) bằng:

```css
#topbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s3) var(--s5); padding: calc(var(--s3) + env(safe-area-inset-top)) max(var(--s4), env(safe-area-inset-right)) var(--s3) max(var(--s4), env(safe-area-inset-left)); background: var(--c-primary); color: #fff; }
```

Thay dòng `main { max-width: 960px; margin: 0 auto; padding: var(--s4); }` bằng:

```css
main { max-width: 960px; margin: 0 auto; padding: var(--s4) max(var(--s4), env(safe-area-inset-right)) var(--s4) max(var(--s4), env(safe-area-inset-left)); }
```

Thay dòng `.brand { font-weight: 800; font-size: 1.1rem; } .brand span { font-weight: 400; opacity: .8; }` bằng:

```css
.brand { display: flex; align-items: center; gap: var(--s2); font-weight: 800; font-size: 1.1rem; } .brand span { font-weight: 400; opacity: .8; }
.brand-logo { width: 30px; height: 30px; border-radius: 8px; display: block; }
```

- [ ] **Step 4: Thêm vào CUỐI `public/app.css`**

```css

/* ---------- app iPhone (PWA) ---------- */
html { -webkit-text-size-adjust: 100%; overscroll-behavior-y: none; }
body { -webkit-tap-highlight-color: transparent; }
.bar-back, .bar-title, #tabbar { display: none; }
/* Trang không có thanh đầu trang (đăng nhập): dải navy để chữ trắng của thanh trạng thái iOS đọc được. */
body.login-page::before { content: ""; display: block; height: env(safe-area-inset-top); background: var(--c-primary); }

@media (max-width: 640px) {
  #topbar { position: sticky; top: 0; z-index: 20; flex-wrap: nowrap; gap: var(--s2); min-height: calc(52px + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top); padding-bottom: 0; }
  #topbar .topnav, #topbar .who { display: none; }
  body[data-title] #topbar .brand { display: none; }
  .bar-title { display: block; flex: 1; min-width: 0; margin: 0; font-size: 1.125rem; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-back { display: flex; align-items: center; justify-content: center; flex: none; width: 44px; height: 44px; margin-left: calc(-1 * var(--s3)); color: #fff; }
  body[data-title] main > h1 { display: none; }

  #tabbar { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; padding: 0 var(--s1) env(safe-area-inset-bottom); background: #fff; border-top: 1px solid var(--c-line); }
  #tabbar .tab { flex: 1 1 0; min-width: 0; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 11px; font-weight: 600; color: var(--c-muted); text-decoration: none; }
  #tabbar .tab[aria-current="page"] { color: var(--c-primary); font-weight: 800; }
  #tabbar .tab-icon { display: flex; }
  #tabbar .tab-new .tab-icon { width: 36px; height: 36px; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: var(--c-accent); }
  body.has-tabbar main { padding-bottom: calc(56px + env(safe-area-inset-bottom) + var(--s4)); }
}
```

- [ ] **Step 5: Kiểm tra**

Run: `npm run typecheck && npm run build:web && npm test`
Expected: typecheck sạch, build xong, test đơn vị pass.

- [ ] **Step 6: Commit**

```bash
git add web/icons.ts web/shell.ts public/app.css
git commit -m "PWA: thanh đầu trang có '‹', thanh tab dưới đáy và vùng an toàn cho điện thoại

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Trang "Tôi" (hồ sơ, Nhật ký, Đăng xuất, đổi PIN)

**Files:**
- Modify: `public/account.html`, `web/account.ts`, `web/format.ts`, `public/app.css`

**Interfaces:**
- Consumes: `initShell`, `logout`, `showError` (`web/shell.ts`); `icon` (`web/icons.ts`); `StaffProfile` gồm `fullName`, `phone`, `role`.
- Produces: `initials(name: string): string` trong `web/format.ts`.

- [ ] **Step 1: `web/format.ts`** — thêm ở cuối file:

```ts
/** "Hoàng Gia Huy" → "HH": chữ cái đầu của họ và tên (từ đầu + từ cuối); một từ thì lấy chữ đầu. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toLocaleUpperCase("vi-VN");
}
```

- [ ] **Step 2: `public/account.html`** — thay toàn bộ phần `<main>…</main>` bằng:

```html
<main>
  <h1>Tôi</h1>
  <div id="error" class="alert" role="alert" hidden></div>
  <div id="ok" class="alert ok" hidden>Đã đổi PIN. Các thiết bị khác đang đăng nhập bằng tài khoản này sẽ bị đăng xuất.</div>
  <section id="me" class="card" style="max-width:420px"></section>
  <section id="links" class="card list-card" style="max-width:420px"></section>
  <form id="pin-form" class="card" style="max-width:420px" autocomplete="off">
    <h2>Đổi mã PIN</h2>
    <label>PIN hiện tại<input id="current" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>
    <label style="margin-top:12px">PIN mới (6 số)<input id="new" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>
    <label style="margin-top:12px">Nhập lại PIN mới<input id="confirm" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>
    <p class="muted">Không dùng PIN dễ đoán như 123456 hoặc 111111.</p>
    <button class="btn btn-primary" type="submit">Đổi PIN</button>
  </form>
</main>
```

(Giữ nguyên dòng `<script type="module" src="/js/account.js"></script>` bên dưới.)

- [ ] **Step 2b: `web/account.ts`** — đổi ba chỗ:

Thay cả khối `import` ở đầu file (ba dòng đang có) bằng:

```ts
import { ApiError, api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initials } from "./format";
import { icon } from "./icons";
import { initShell, logout, showError } from "./shell";
```

Đổi dòng `await initShell();` thành:

```ts
const staff = await initShell();
replaceChildren(
  byId("me"),
  h(
    "div",
    { class: "profile" },
    h("span", { class: "avatar", "aria-hidden": "true" }, initials(staff.fullName)),
    h("div", null, h("div", { class: "profile-name" }, staff.fullName), h("div", { class: "muted" }, `${staff.phone} · ${staff.role === "admin" ? "Quản trị viên" : "Nhân viên"}`)),
  ),
);
const logoutBtn = h("button", { class: "row-link danger", type: "button" }, "Đăng xuất");
logoutBtn.addEventListener("click", () => void logout());
replaceChildren(byId("links"), staff.role === "admin" && h("a", { class: "row-link", href: "/audit" }, "Nhật ký", icon("next", 20)), logoutBtn);
```

- [ ] **Step 3: CSS** — thêm vào cuối `public/app.css`:

```css

/* trang "Tôi" */
.profile { display: flex; align-items: center; gap: var(--s3); }
.avatar { flex: none; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; color: #fff; background: var(--c-primary); font-weight: 800; font-size: 1.1rem; }
.profile-name { font-weight: 800; font-size: 1.1rem; }
.list-card { padding-top: 0; padding-bottom: 0; }
.row-link { display: flex; justify-content: space-between; align-items: center; width: 100%; min-height: 48px; padding: 0; font: inherit; color: var(--c-text); text-decoration: none; text-align: left; background: none; border: 0; border-bottom: 1px solid var(--c-line); cursor: pointer; }
.row-link:last-child { border-bottom: 0; }
button.row-link.danger { color: var(--c-accent); font-weight: 700; }
```

- [ ] **Step 4: Kiểm tra**

Run: `npm run typecheck && npm run build:web`
Expected: sạch, build xong.

- [ ] **Step 5: Commit**

```bash
git add public/account.html web/account.ts web/format.ts public/app.css
git commit -m "PWA: trang Tôi có hồ sơ, Nhật ký (admin), Đăng xuất và đổi PIN

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Chỉnh từng trang cho điện thoại (danh sách, chi tiết đơn, form, đăng nhập)

**Files:**
- Modify: `public/index.html`, `public/login.html`, `web/order.ts`, `web/order-form.ts`, `public/app.css`

**Interfaces:**
- Consumes: `setBarTitle` (Task 5), `body[data-title]`/`data-tabbar` (Task 4).

- [ ] **Step 1: Ô tìm đơn** — `public/index.html`: đổi `placeholder="Tìm theo mã đơn, tên/SĐT khách, nhân viên…"` thành `placeholder="Tìm mã đơn, tên, SĐT…"`.

- [ ] **Step 2: Logo trên trang đăng nhập** — `public/login.html`: thêm dòng ngay sau `<main class="login">`:

```html
  <img class="login-logo" src="/icons/icon-192.png" alt="" width="72" height="72">
```

- [ ] **Step 3: `web/order.ts`**

Đổi `import { initShell, showError } from "./shell";` thành `import { initShell, setBarTitle, showError } from "./shell";`.
Thay dòng `document.title = \`${order.orderCode} — Tour Đảo Sales\`;` bằng hai dòng:

```ts
  document.title = `${order.orderCode} — Tour Đảo Desk`;
  setBarTitle(order.orderCode);
```
Đổi `{ class: "items" },` (bảng dịch vụ, duy nhất một chỗ) thành `{ class: "items order-lines" },`.

- [ ] **Step 4: `web/order-form.ts`**

Đổi `import { initShell, showError } from "./shell";` thành `import { initShell, setBarTitle, showError } from "./shell";`.
Sau `byId("form-title").textContent = "Sửa đơn";` thêm dòng `setBarTitle("Sửa đơn");`.
Sau `byId("form-title").textContent = \`Sửa đơn ${order.orderCode}\`;` thêm dòng `setBarTitle(\`Sửa đơn ${order.orderCode}\`);`.

- [ ] **Step 5: CSS** — thêm vào cuối `public/app.css`:

```css

/* đăng nhập */
.login-logo { display: block; width: 72px; height: 72px; margin: 0 auto var(--s3); border-radius: 22.37%; }
.login h1 { text-align: center; }

@media (max-width: 640px) {
  .btn:not(.btn-link) { min-height: 44px; }
  .toolbar input { flex: 1 1 0; min-width: 0; }
  .toolbar .btn-primary { display: none; } /* "+ Đơn mới" đã có ở thanh tab */

  /* chi tiết đơn: ba nút hành động chia đều; mã đơn đã nằm trên thanh đầu trang */
  .actions .btn { flex: 1 1 0; }
  .detail-head h1 { display: none; }

  /* bảng dịch vụ thành từng khối: tên + chi tiết / "SL × đơn giá … thành tiền" */
  table.items.order-lines, table.items.order-lines tbody { display: block; }
  table.items.order-lines thead { display: none; }
  table.items.order-lines tr { display: grid; grid-template-columns: auto auto 1fr auto; column-gap: 6px; padding: var(--s2) 0; border-bottom: 1px solid var(--c-line); }
  table.items.order-lines tr:last-child { border-bottom: 0; }
  table.items.order-lines td { padding: 0; border: 0; text-align: left; }
  table.items.order-lines td:first-child { grid-column: 1 / -1; font-weight: 700; }
  table.items.order-lines td:first-child .muted { font-weight: 400; }
  table.items.order-lines td:nth-child(2)::after { content: " ×"; }
  table.items.order-lines td:nth-child(2), table.items.order-lines td:nth-child(3) { color: var(--c-muted); white-space: nowrap; }
  table.items.order-lines td:nth-child(4) { grid-column: 4; text-align: right; font-weight: 700; white-space: nowrap; }

  /* form lập đơn: màn hình tập trung, không thanh tab; nút Lưu dính đáy, chừa thanh home */
  body[data-tabbar="off"] main { padding-bottom: 0; }
  .form-actions { position: sticky; bottom: 0; margin: 0 calc(-1 * var(--s4)); padding: var(--s3) var(--s4) calc(var(--s3) + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid var(--c-line); }
  .form-actions .btn-primary { flex: 1; }
  .form-actions .btn:not(.btn-primary) { display: none; } /* "Quay lại" đã có nút ‹ */
}
```

- [ ] **Step 6: Kiểm tra**

Run: `npm run typecheck && npm run build:web && npm test && grep -rn "Tour Đảo Sales" public web | grep -v "public/js/" || echo "không còn tên cũ trong public/ và web/"`
Expected: sạch; dòng cuối in `không còn tên cũ trong public/ và web/`.

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/login.html web/order.ts web/order-form.ts public/app.css
git commit -m "PWA: chỉnh danh sách, chi tiết đơn (khối xếp dọc), form (nút dính đáy) và đăng nhập cho điện thoại

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Tài liệu, kiểm tra trên trình duyệt và chạy toàn bộ

**Files:**
- Create: `docs/PWA-IPHONE.md`
- Modify: `README.md`, `docs/ARCHITECTURE.md`

- [ ] **Step 1: Chạy toàn bộ kiểm tra tự động**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: mọi bước xanh. `admin` và `catalog` cần mạng (đọc Google Sheet thật); nếu mạng lỗi, ghi lại đúng thông báo và chạy `npm run test:e2e -- platform pwa orders admin-race` để có kết quả các kịch bản không cần mạng.

- [ ] **Step 2: Chạy `wrangler dev` cục bộ để xem giao diện**

```bash
openssl rand -base64 48 | tr -d '\n' | sed 's/^/SESSION_SECRET=/' > .dev.vars
npm run db:migrate:local
node scripts/create-staff.mjs "Hoàng Gia Huy" 0901000001 482913 admin > "$CLAUDE_JOB_DIR/tmp/staff.local.sql"
node scripts/create-staff.mjs "Nguyễn Thị Mai" 0901000002 736154 sales >> "$CLAUDE_JOB_DIR/tmp/staff.local.sql"
npx wrangler d1 execute tourdao-sales-db --local --file "$CLAUDE_JOB_DIR/tmp/staff.local.sql"
npx wrangler dev --port 8787
```
(`wrangler dev` chạy nền; `.dev.vars` bị gitignore.)

- [ ] **Step 3: Kiểm tra trên Chrome (bộ công cụ claude-in-chrome)** — mở `http://localhost:8787/login`, `resize_window` 390×844, rồi:
  1. Đăng nhập nhân viên `0901000002` / PIN `736154` và chụp: danh sách đơn (thanh tab 3 mục, đầu trang có logo), `/order-form` (không thanh tab, nút Lưu dính đáy), `/account`. Lập một đơn nháp mẫu rồi chụp `/order?id=…` (nút "‹", ba nút hành động, dịch vụ xếp dọc).
  2. Chạy trong trang bằng `javascript_tool`: `(async()=>{const r=await navigator.serviceWorker.getRegistration();const keys=(await caches.keys());const c=await caches.open(keys[0]);const urls=(await c.keys()).map(k=>new URL(k.url).pathname);return JSON.stringify({sw:!!r,keys,api:urls.filter(u=>u.startsWith('/api')),count:urls.length});})()`
  Expected: `sw: true`, `keys: ["td-shell-v1"]`, `api: []` (không có mục nào của `/api`), `count` ≥ 10.
  3. Đăng nhập admin `0901000001` / PIN `482913`: thanh tab 5 mục; `/account` có dòng Nhật ký; bấm "Đăng xuất" về `/login`.
  4. Mở rộng cửa sổ ≥ 1024px: thanh điều hướng máy tính vẫn như cũ, không thấy thanh tab.
  Đối chiếu ảnh chụp với mockup https://claude.ai/artifact/UJhmHqivTKaGVZr3m98Aoc.

- [ ] **Step 4: Tài liệu** — tạo `docs/PWA-IPHONE.md`:

```markdown
# App iPhone (PWA) — "Tour Đảo Desk"

Thiết kế: `docs/superpowers/specs/2026-09-19-iphone-pwa-design.md`. Mockup: https://claude.ai/artifact/UJhmHqivTKaGVZr3m98Aoc

## Cách hoạt động

- `public/manifest.webmanifest` + `public/icons/*` + thẻ meta iOS trong 8 trang HTML → Safari cho "Thêm vào Màn hình chính", app chạy toàn màn hình.
- `public/sw.js` (sinh từ `web/sw/sw.ts` bởi `npm run build:web`, gitignored): khung app (HTML/CSS/JS/icon) mở từ cache rồi tải bản mới ngầm. **`/api/*` không bao giờ qua cache.** Chính sách ở `src/shared/sw-policy.ts` (có test).
- Sau mỗi lần deploy, lần mở đầu vẫn chạy khung cũ, lần sau là khung mới. **Nếu một lần deploy đổi API không tương thích, tăng `CACHE_VERSION` trong `src/shared/sw-policy.ts` ngay trong lần deploy đó.**
- Giao diện ≤640px: thanh đầu trang (nút "‹" ở trang con) + thanh tab dưới đáy do `web/shell.ts` dựng; cấu hình theo trang bằng `<body data-title data-back data-tabbar>`. Máy tính giữ nguyên.

## Chưa làm (cố ý)

- Hướng dẫn cài cho nhân viên: chờ chốt tên miền (`sales.tourdao.vn`). App gắn với origin: đổi tên miền thì phải cài và đăng nhập lại.
- Chế độ offline (mở được khung nhưng không có dữ liệu).
- Phiên vẫn 7 ngày cố định → nhân viên đăng nhập lại khoảng mỗi tuần; iOS còn tách cookie giữa Safari và app đã cài nên phải đăng nhập lại một lần khi cài.
- Trang admin (`/catalog`, `/staff`, `/audit`) trên điện thoại vẫn là bảng cuộn ngang.

## Danh sách kiểm trên iPhone thật (chỉ máy thật mới kiểm được)

1. Safari mở link → Chia sẻ → Thêm vào Màn hình chính: tên dưới icon là "Tour Đảo", icon là buồm vàng + thuyền xanh trên nền nâu đỏ, không có góc đen.
2. Mở từ icon: toàn màn hình, thanh trạng thái có nền navy, chữ giờ/pin đọc được (kể cả ở màn hình đăng nhập).
3. Đăng nhập → thanh tab dưới đáy không đè lên thanh home; vào một đơn → nút "‹" quay lại danh sách; vuốt từ mép trái cũng quay lại.
4. Lập đơn: không có thanh tab, nút "Lưu đơn nháp" dính đáy và không bị bàn phím/thanh home che khi nhập xong; ô SĐT và tiền hiện bàn phím số.
5. Tắt hẳn app rồi mở lại: màn hình hiện gần như tức thì (khung từ cache), dữ liệu tải sau.
6. Tab Tôi → Đăng xuất về màn hình đăng nhập.

## Dựng lại icon

Nguồn: `Logo-Cty-Tour-Dao.png` 500×500 (Sanity của tourdaovn, project `pgedy374`): https://cdn.sanity.io/images/pgedy374/production/ee4443a89ddd67a2187a8c6b34d37f6f31678fe3-500x500.png
iOS tô đen vùng trong suốt và tự bo góc nên icon là hình vuông đặc, không alpha. Cắt buồm + thuyền, đặt giữa nền `#993333` (màu vòng tròn của logo):

    magick -size 512x512 xc:"#993333" \( logo500.png -crop 300x280+100+60 +repage -resize 348x \) -gravity center -composite -alpha off PNG24:public/icons/icon-512.png
    magick public/icons/icon-512.png -resize 192x192 PNG24:public/icons/icon-192.png
    magick public/icons/icon-512.png -resize 180x180 PNG24:public/icons/apple-touch-icon.png
    magick public/icons/icon-512.png -resize 96x96 PNG24:public/icons/logo-96.png

## Đổi tên hiển thị

Tên nằm trong: `public/manifest.webmanifest` (`name`, `short_name`), `<title>` và `apple-mobile-web-app-title` của 8 trang, `web/shell.ts` (brand), `public/login.html` (h1), `tests/e2e/pwa.mjs`. Không đổi tên Worker/D1 `tourdao-sales`.
```

`README.md`: đổi câu "Cấu trúc UI: …" thêm cuối: ` Ứng dụng iPhone (PWA "Tour Đảo Desk"): xem \`docs/PWA-IPHONE.md\`.` và thêm vào danh sách tài liệu một dòng `- \`docs/PWA-IPHONE.md\` — app iPhone (PWA): cách hoạt động, danh sách kiểm trên máy thật, dựng lại icon.`

`docs/ARCHITECTURE.md`: thêm một mục ngắn cuối file:

```markdown
## Ứng dụng iPhone (PWA)

Giao diện tĩnh là PWA: `manifest` + icon + service worker (`web/sw/sw.ts` → `public/sw.js`). Quy tắc bất biến: `/api/*` không bao giờ qua cache của service worker (`src/shared/sw-policy.ts`, có test). Chi tiết và danh sách kiểm trên máy thật: `docs/PWA-IPHONE.md`.
```

- [ ] **Step 5: Commit tài liệu và đóng nhánh**

```bash
git add docs/PWA-IPHONE.md README.md docs/ARCHITECTURE.md
git commit -m "PWA: tài liệu, danh sách kiểm trên iPhone thật, công thức dựng icon

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git status -sb
```
Expected: cây làm việc sạch (`.dev.vars` và `public/js`, `public/sw.js` đã gitignore).

- [ ] **Step 6: Đẩy nhánh** (nếu repo có remote): `git remote -v` → nếu có, `git push -u origin worktree-pwa-iphone` (không đẩy `main`, không force). Không deploy: việc deploy là quyết định của chủ dự án.
