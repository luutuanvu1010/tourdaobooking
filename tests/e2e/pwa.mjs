// PWA: manifest, icon, service worker và thẻ meta iOS được phục vụ đúng (không cần đăng nhập).
import assert from "node:assert/strict";
import { BASE, call } from "./lib.mjs";

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

// service worker: có file, không bị cache cứng (để bản mới được nhận), API là no-store
const sw = await get("/sw.js");
assert.equal(sw.status, 200, "/sw.js phải có (npm run build:web)");
assert.match(sw.headers.get("content-type") ?? "", /javascript/);
assert.match(sw.headers.get("cache-control") ?? "", /no-cache/, "/sw.js phải Cache-Control: no-cache (public/_headers)");
assert.match(await sw.text(), /td-shell-v/, "sw.js phải chứa tên cache");
const me = await call(null, "GET", "/api/auth/me");
assert.equal(me.headers.get("cache-control"), "no-store", "API phải no-store");
console.log("✓ service worker + API no-store");
console.log("E2E PWA OK");
