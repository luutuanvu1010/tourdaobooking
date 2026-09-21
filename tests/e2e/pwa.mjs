// PWA: manifest, icon, service worker và thẻ meta iOS được phục vụ đúng (không cần đăng nhập).
import assert from "node:assert/strict";
import { PAGES, PRECACHE, isCacheable } from "../../src/shared/sw-policy.ts";
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
// Nguồn sự thật của tên là manifest, của màu chính là token --c-primary trong app.css; mọi nơi khác chỉ là bản sao phải khớp (P6/N7 của tourdaovn).
assert.ok(manifest.name.startsWith(manifest.short_name) && manifest.name.length > manifest.short_name.length, "name phải bắt đầu bằng short_name");
const NAME = manifest.name;
const SHORT = manifest.short_name;
const css = await (await get("/app.css")).text();
const PRIMARY = css.match(/--c-primary:\s*(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
assert.ok(PRIMARY, "không đọc được --c-primary trong app.css");
// Luật cứng tầng giao diện của tourdaovn (CLAUDE.md §8): giá trị giao diện đi vào token, không viết cứng trong luật. Quét khối PWA của app.css.
// Quét: màu hex, rgb()/hsl(), số px, và cỡ rem/em (cỡ chữ, chiều cao, khoảng cách). Ngoại lệ có lý do: điểm gãy trong @media (CSS không cho dùng biến ở đó) và viền/ẩn-khỏi-mắt 1px.
const MARK = "/* ---------- app iPhone (PWA)";
assert.ok(css.includes(MARK), "app.css mất dấu mốc khối PWA");
const pwaCss = css.slice(css.indexOf(MARK)).replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media\s*\([^)]*\)/g, "");
const hardcoded = pwaCss.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(|(?<![\w.-])(?!1px\b)\d+(?:\.\d+)?px\b|(?<![\w.-])\d+(?:\.\d+)?r?em\b/g) ?? [];
assert.deepEqual(hardcoded, [], `khối PWA của app.css còn giá trị viết cứng (đưa vào token ở :root): ${hardcoded.join(", ")}`);
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.theme_color, PRIMARY, "theme_color của manifest phải bằng token --c-primary");
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

// font tự lưu trữ (A2 Q4): mọi @font-face trỏ tới tệp CÓ THẬT, đúng content-type font/woff2 (Workers Assets), và nằm trong PRECACHE
// (nếu không, mở ngoại tuyến rơi về system-ui mà không ai biết).
const fontUrls = [...new Set([...css.matchAll(/url\(["']?(\/fonts\/[^"')]+)["']?\)/g)].map((m) => m[1]))];
assert.equal(fontUrls.length, 6, `app.css phải khai đủ 6 tệp font (đang ${fontUrls.length})`);
for (const path of fontUrls) {
  const r = await get(path);
  assert.equal(r.status, 200, `${path} → ${r.status}`);
  assert.equal(r.headers.get("content-type"), "font/woff2", `${path} sai content-type`);
  assert.ok(PRECACHE.includes(path), `${path} phải nằm trong PRECACHE (src/shared/sw-policy.ts)`);
}
console.log("✓ font tự lưu trữ");

// service worker: có file, không bị cache cứng (để bản mới được nhận), API là no-store
const sw = await get("/sw.js");
assert.equal(sw.status, 200, "/sw.js phải có (npm run build:web)");
assert.match(sw.headers.get("content-type") ?? "", /javascript/);
// no-store (không phải no-cache): no-cache vẫn cho trình duyệt giữ bản cũ và gửi If-None-Match → nhận 304 và không thấy bản mới (đo được ở wrangler dev). Cách tắt khẩn cấp cũng đi qua /sw.js nên đường này không được phép kẹt.
assert.match(sw.headers.get("cache-control") ?? "", /no-store/, "/sw.js phải Cache-Control: no-store (public/_headers)");
// Mã phiên bản do npm run build:web chèn (AAAAMMDDGGPPSS): mỗi lần build/deploy đổi thì cache cũ bị xoá, khung không lệch API sau deploy.
const swText = await sw.text();
assert.ok(swText.includes("td-shell-"), "sw.js phải chứa tiền tố tên cache");
assert.match(swText, /"\d{14}"/, "sw.js phải mang mã bản dựng 14 chữ số (--define:__BUILD_ID__ trong build:web)");
const me = await call(null, "GET", "/api/auth/me");
assert.equal(me.headers.get("cache-control"), "no-store", "API phải no-store");
// Lớp chắn theo content-type (src/shared/sw-policy.ts): mọi trang và tệp nạp sẵn phải THOẢ isCacheable với Content-Type mà Workers Assets thực sự phục vụ,
// nếu không service worker âm thầm không cache gì; còn phản hồi API (JSON) tuyệt đối không được thoả.
for (const path of new Set([...PAGES, ...PRECACHE])) {
  const r = await get(path);
  assert.equal(r.status, 200, `${path} → ${r.status}`);
  const contentType = r.headers.get("content-type");
  assert.ok(isCacheable({ status: r.status, type: "basic", redirected: false, contentType }), `${path}: content-type "${contentType}" không qua isCacheable`);
}
assert.equal(isCacheable({ status: 200, type: "basic", redirected: false, contentType: me.headers.get("content-type") }), false, "phản hồi API không được phép thoả isCacheable");
console.log("✓ service worker + API no-store + content-type của khung");

// Mọi trang của PAGES (nguồn duy nhất, sw-policy.ts): đủ thẻ meta iOS + tên mới, không còn tên cũ
const NEEDLES = [
  "viewport-fit=cover",
  'rel="manifest"',
  'rel="apple-touch-icon"',
  'name="apple-mobile-web-app-capable" content="yes"',
  'content="black-translucent"',
  `name="apple-mobile-web-app-title" content="${SHORT}"`,
  `<meta name="theme-color" content="${PRIMARY}">`,
  `— ${NAME}</title>`,
];
for (const path of PAGES) {
  const html = await (await get(path)).text();
  for (const needle of NEEDLES) assert.ok(html.includes(needle), `${path} thiếu ${needle}`);
  for (const old of ["Tour Đảo Sales", "Tour Đảo Desk"]) assert.ok(!html.includes(old), `${path} còn tên cũ "${old}"`);
}
assert.ok((await (await get("/login")).text()).includes(`<h1>${NAME}</h1>`), "trang đăng nhập phải có h1 đúng tên trong manifest");
// thanh đầu trang do web/shell.ts dựng: tên tách thành "Tour Đảo " + <span>phần còn lại</span>
const shellBundle = await (await get("/js/orders.js")).text();
const REST = NAME.slice(SHORT.length).trim();
// esbuild mặc định mã hoá ký tự không-ASCII thành \uXXXX (chữ HOA) trong bản build
const esc = (s) => s.replace(/[^\x00-\x7f]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));
assert.ok(shellBundle.includes(`"${esc(SHORT)} "`) && shellBundle.includes(`"${esc(REST)}"`), "web/shell.ts phải dựng brand đúng tên trong manifest");
console.log(`✓ thẻ meta iOS, tên và màu nhất quán trên ${PAGES.length} trang`);
console.log("E2E PWA OK");
