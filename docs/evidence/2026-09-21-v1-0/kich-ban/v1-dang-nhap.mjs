// Kiểm màn đăng nhập v1.0 (thông tin công ty + số phiên bản + widget Cloudflare Turnstile) bằng Chrome thật. Nằm trong repo, không thêm dependency.
// Dựa trên môi trường của A2 (`../../2026-09-20-a2/kich-ban/a2-cdp.mjs`: D1 tạm + `wrangler dev` + Chrome headless qua CDP). Chạy từ GỐC repo, sau `npm run build:web`, CẦN MẠNG
// (widget tải script từ challenges.cloudflare.com; máy chủ gọi siteverify của Cloudflare bằng khoá THỬ — không có khoá thật, không tạo gì trên Cloudflare):
//   npm run build:web && AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs
// (`axe-core` lấy bằng `npm pack axe-core` NGOÀI repo; `ONLY=a,b` chỉ chạy vài bước; `OUT=…` đổi thư mục ghi.)
// Ghi: <OUT>/anh/dang-nhap-*.png và <OUT>/ket-qua-dang-nhap.json. Mỗi bước in một dòng "✓"/"✗"; thoát mã 1 nếu có bước ✗ (không dừng ở bước hỏng đầu tiên: để thấy được toàn bộ "đỏ" trước khi sửa).
//
// Hai máy chủ nối tiếp: A = Turnstile BẬT bằng khoá thử `1x…AA` (luôn đạt) — các bước a–e, g–o; B = Turnstile TẮT — bước f (không dựng giả lập được: máy chủ đang đòi token thì
// đăng nhập không kèm token luôn 403, nên "không có khoá" chỉ chứng minh được trên máy chủ thật sự không có khoá).
//   a  khối công ty hiện đủ 6 mục đúng chữ (tên app, dòng phiên bản, tên công ty, địa chỉ, email, MST) — so với chính dòng company_profile trong D1
//   b  CSP phục vụ đúng (tiền đề của g) · widget hiện, nút khoá tới khi có token, tự đạt bằng khoá thử, đăng nhập qua widget, token gửi đi đúng là token của widget
//   c  sai PIN → lỗi của máy chủ, widget được reset (ô token trống rồi có token mới), nút khoá suốt lúc chờ rồi mở lại, đăng nhập lại được
//   d  máy chủ trả 403 `turnstile_failed` (THẬT: gỡ token khỏi yêu cầu) và 503 `turnstile_unavailable` (giả lập) → chữ của máy chủ hiện nguyên văn ở #error; nút mở lại; thử lại được
//   e  API công ty lỗi/chậm; API cấu hình lỗi/chậm → trang vẫn đăng nhập được, khối công ty ẩn, không kẹt nút
//   f  (máy chủ B) không có khoá → không widget, không yêu cầu nào tới Cloudflare, đăng nhập bình thường
//   g  không lỗi CSP và console sạch ở mọi trang đã mở
//   h  axe-core: 0 vi phạm (MỌI mức) ở 4 trạng thái của máy chủ A + trạng thái không widget
//   i  vùng chạm ≥ 44 px, ô gõ ≥ 16 px, không tràn ngang, widget nằm trọn trong thẻ (390, 320, 1040) + ảnh 390×844 và 1040×800
//   j  service worker không lưu gì của Cloudflare (và không lưu /api/*) khi trang chạy dưới service worker thật
//   k  widget không dựng được (script bị chặn; khoá site sai) → thông báo + nút Thử lại, nút Đăng nhập khoá; bỏ chặn rồi Thử lại → dùng được; khung giữ chỗ không còn chữ chờ
//   l  (sửa sau rà soát) cấu hình lỗi lúc mở trang khi máy chủ ĐANG đòi token → đăng nhập 403 thì trang lấy lại cấu hình (có hạn, không lặp vô hạn, không giữ nút) rồi dựng widget: không kẹt 403 mãi
//   m  (sửa sau rà soát) chờ nạp script: khung có chữ “Đang tải xác minh…” (không trống), thay bằng widget khi xong
//   n  (sửa sau rà soát) theme “light”; error-callback của widget ghi mã lỗi Cloudflare bằng console.warn
//   o  (sửa sau rà soát) cấu hình lỗi ở lần hỏi đầu rồi ổn lại → lần hỏi lại lúc mở trang tự dựng widget, chưa cần bấm đăng nhập
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, TURNSTILE_TEST, ok, setInput, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-21-v1-0";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const AXE = readFileSync(process.env.AXE_JS ?? "", "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });

// Chữ đúng theo đặc tả (docs/superpowers/specs/2026-09-21-v1-0-dang-nhap-xac-nhan-phu-trach-design.md, việc 1) — bước a còn đối chiếu với chính D1.
const EXPECT = {
  app: "Tour Đảo Booking",
  release: "Phiên bản 1.0 · ngày 21 tháng 9 năm 2026",
  company: "CÔNG TY TNHH TOUR ĐẢO",
  address: "19 Đường B2, Khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, Tỉnh Khánh Hoà",
  email: "Tourdaotravel@gmail.com",
  taxCode: "4201969169",
};
// Thông báo lỗi Turnstile của MÁY CHỦ: đọc thẳng từ mã nguồn (một nguồn), đối chiếu với chữ của đặc tả.
const turnstileSource = readFileSync("src/modules/auth/turnstile.ts", "utf8");
const FAILED = turnstileSource.match(/const FAILED_MESSAGE = "([^"]+)"/)?.[1];
const UNAVAILABLE = turnstileSource.match(/const UNAVAILABLE_MESSAGE = "([^"]+)"/)?.[1];
const BAD_PIN = "Số điện thoại hoặc mã PIN không đúng.";

const M = { width: 390, height: 844, mobile: true };
const IPHONE_SE = { width: 375, height: 667, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const DUMMY = "XXXX.DUMMY.TOKEN.XXXX"; // token mà widget dùng khoá thử `1x…AA` phát ra

const results = { ghiChu: "Đo bằng Chrome headless trên wrangler dev cục bộ (D1 tạm), widget Turnstile dùng khoá THỬ của Cloudflare; không phải iPhone thật, không phải khoá/widget thật.", buoc: [], csp: null, axe: {}, do: {}, widget: {} };
let failures = 0;
let passed = 0;
async function step(id, name, fn) {
  if (ONLY && !ONLY.includes(id)) return;
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
    results.buoc.push({ id, name, dat: true });
  } catch (e) {
    failures++;
    const msg = String(e?.message ?? e).split("\n").slice(0, 10).join("\n    ");
    console.log(`✗ ${id}) ${name}\n    ${msg}`);
    results.buoc.push({ id, name, dat: false, loi: msg.slice(0, 800) });
  }
}

// ---- Ghi trong trang (chèn vào MỌI tài liệu mới, trước mã của trang): trạng thái nút Đăng nhập và ô token của widget theo thời gian ----
// `disabled`: mỗi lần trạng thái disabled của #submit ĐỔI (true/false); `enabledWithToken`: với mỗi lần nút MỞ, ô token lúc đó đã có giá trị chưa. `token`: mỗi lần ô ẩn `cf-turnstile-response` đổi giá trị. Chỉ ở khung chính (không chạy trong iframe của Cloudflare).
const RECORDER = `(() => {
  if (window.top !== window) return;
  const rec = (window.__rec = { disabled: [], enabledWithToken: [], token: [] });
  new MutationObserver((records) => {
    for (const r of records) {
      const el = r.target;
      // setAttribute cùng giá trị vẫn sinh một bản ghi: chỉ ghi khi trạng thái ĐỔI.
      if (el.id === 'submit' && r.attributeName === 'disabled') {
        const v = el.hasAttribute('disabled');
        if (rec.disabled.at(-1) !== v) {
          rec.disabled.push(v);
          // mỗi lần nút MỞ: ô token của widget đã có giá trị chưa? (chứng minh nút mở VÌ có token, không phải vì hết giờ chờ hay vì lý do khác)
          if (!v) rec.enabledWithToken.push((document.querySelector('#turnstile-widget input[name="cf-turnstile-response"]')?.value ?? '') !== '');
        }
      }
      if (el.name === 'cf-turnstile-response' && r.attributeName === 'value') { const v = el.getAttribute('value') || ''; if (rec.token.at(-1) !== v) rec.token.push(v); }
    }
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ['disabled', 'value'] });
})();`;
/** Trước mã của trang: `fetch` tới đường dẫn kết thúc bằng `suffix` bị chậm `ms` (rồi vẫn đi tiếp) hoặc trả `status` giả (kèm thân lỗi JSON). */
const slowFetch = (suffix, ms) => `(() => { if (window.top !== window) return; const of = window.fetch.bind(window); window.fetch = (u, i) => String(u).endsWith(${JSON.stringify(suffix)}) ? new Promise((r) => setTimeout(r, ${ms})).then(() => of(u, i)) : of(u, i); })();`;
const errorFetch = (suffix, status, code) => `(() => { if (window.top !== window) return; const of = window.fetch.bind(window); window.fetch = (u, i) => String(u).endsWith(${JSON.stringify(suffix)}) ? Promise.resolve(new Response(JSON.stringify({ error: { code: ${JSON.stringify(code)}, message: 'giả lập' } }), { status: ${status}, headers: { 'content-type': 'application/json' } })) : of(u, i); })();`;

/** Trước mã của trang: `GET /api/auth/config` trả khoá site GIẢ `key` (thay cho khoá thật của máy chủ). */
const fakeConfig = (key) => `(() => { if (window.top !== window) return; const of = window.fetch.bind(window); window.fetch = (u, i) => String(u).endsWith('/api/auth/config') ? Promise.resolve(new Response(JSON.stringify({ turnstileSiteKey: ${JSON.stringify(key)} }), { status: 200, headers: { 'content-type': 'application/json' } })) : of(u, i); })();`;

/** Trước mã của trang: `GET /api/auth/config` trả 500 GIẢ trong lúc `window.__cfgFail` còn true (đặt false = "cấu hình đã ổn lại"); `window.__cfgCalls` đếm số lần trang hỏi (lời gọi giả không qua mạng nên không có trong `p.requests`). */
const flagConfig = `(() => { if (window.top !== window) return; window.__cfgFail = true; window.__cfgCalls = 0; const of = window.fetch.bind(window); window.fetch = (u, i) => { if (!String(u).endsWith('/api/auth/config')) return of(u, i); window.__cfgCalls++; return window.__cfgFail ? Promise.resolve(new Response(JSON.stringify({ error: { code: 'internal', message: 'giả lập' } }), { status: 500, headers: { 'content-type': 'application/json' } })) : of(u, i); }; })();`;
/** Trước mã của trang: script Cloudflare được nạp CHẬM `ms` mili giây (trễ việc gán `src` của thẻ script tới challenges.cloudflare.com) — giữ trang ở trạng thái "đang chờ tải script" một cách xác định. */
const slowScript = (ms) => `(() => { if (window.top !== window) return; const d = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src'); Object.defineProperty(HTMLScriptElement.prototype, 'src', { configurable: true, get() { return d.get.call(this); }, set(v) { if (/challenges\\.cloudflare\\.com/.test(String(v))) setTimeout(() => d.set.call(this, v), ${ms}); else d.set.call(this, v); } }); })();`;
/** Trước mã của trang: bắt `console.warn` (`window.__warns`) và các tuỳ chọn trang đưa cho `turnstile.render` (`window.__opts`, gồm cả các callback) — để giả lập một lỗi widget giữa chừng. */
// (Không định nghĩa sẵn thuộc tính `window.turnstile`: api.js thấy nó tồn tại là báo "Turnstile already has been loaded". Móc bằng sự kiện `load` ở giai đoạn bắt trên `document` — nằm TRƯỚC thẻ script trong đường truyền sự kiện nên chạy trước trình nghe `load` của trang, tức trước lần `render` đầu.)
const hookTurnstile = `(() => { if (window.top !== window) return; window.__warns = []; const w = console.warn.bind(console); console.warn = (...a) => { window.__warns.push(a.map((x) => (typeof x === 'string' ? x : (x && x.message) || String(x))).join(' ')); w(...a); };
  document.addEventListener('load', (e) => { const t = window.turnstile; if (e.target && e.target.tagName === 'SCRIPT' && t && !t.__wrapped) { t.__wrapped = true; const r = t.render.bind(t); t.render = (el, o) => { window.__opts = o; return r(el, o); }; } }, true); })();`;
const TOKEN = "(document.querySelector('#turnstile-widget input[name=\"cf-turnstile-response\"]')?.value ?? '')";
const BTN_ENABLED = "!document.getElementById('submit').disabled";
const ERR_TEXT = "(document.getElementById('error').hidden ? '' : document.getElementById('error').textContent)";
// Widget đã dựng: Cloudflare đặt khung (iframe) trong một shadow root ĐÓNG nên không với tới được từ trang — dấu hiệu quan sát được là ô ẩn `cf-turnstile-response` và khối bọc có kích thước.
const WIDGET_BOX = "document.querySelector('#turnstile-widget > div')";
const WIDGET_UP = `(() => { const w = ${WIDGET_BOX}; return w !== null && w.getBoundingClientRect().height > 0 && document.querySelector('#turnstile-widget input[name="cf-turnstile-response"]') !== null; })()`;
const REC = "JSON.stringify(window.__rec)";

const opened = [];
/** Mở trang đăng nhập CHƯA có phiên (xoá cookie chung của Chrome), khổ `vp`, DPR 1 (ảnh đúng số điểm ảnh). `bypassSW`: bỏ qua service worker để chặn/giả lập request chắc chắn. */
async function openLogin(env, { vp = M, bypassSW = true, blocked = [], before = "", label = "" } = {}) {
  const p = await env.openPage(vp);
  opened.push(p);
  await p.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  p.vp = vp;
  p.label = label;
  await p.send("Network.clearBrowserCookies");
  if (bypassSW) await p.send("Network.setBypassServiceWorker", { bypass: true });
  if (blocked.length) await p.send("Network.setBlockedURLs", { urls: blocked });
  await p.send("Page.addScriptToEvaluateOnNewDocument", { source: RECORDER + before });
  p.t0 = Date.now();
  await p.send("Page.navigate", { url: env.base + "/login" });
  await p.waitFor("document.readyState === 'complete'", "trang đăng nhập tải xong");
  return p;
}
/** Chờ widget dựng xong và tự đạt: khung widget có mặt, ô token có giá trị, nút Đăng nhập mở. */
const widgetReady = (p) => p.waitFor(`${WIDGET_UP} && ${TOKEN} !== '' && ${BTN_ENABLED}`, "widget hiện và tự đạt (có token, nút mở)", 25000);
const hookReset = (p) => p.ev("(() => { const t = window.turnstile; window.__resets = 0; const r = t.reset.bind(t); t.reset = (...a) => { window.__resets++; return r(...a); }; return typeof t.reset === 'function'; })()");
const typeCreds = async (p, account, pin = account.pin) => { await p.ev(setInput("document.getElementById('phone')", account.phone)); await p.ev(setInput("document.getElementById('pin')", pin)); };
const submit = (p) => p.ev("document.getElementById('submit').click(); true");
const loggedIn = (p) => p.waitFor("location.pathname === '/' && document.readyState === 'complete'", "vào trang danh sách đơn sau khi đăng nhập", 15000);
const rec = async (p) => JSON.parse(await p.ev(REC));
const loginPosts = (p) => p.requests.filter((r) => r.method === "POST" && r.url.endsWith("/api/auth/login")).map((r) => JSON.parse(r.postData ?? "{}"));

/** Chụp cả trang (nới khung nhìn đúng chiều cao trang, như A2 — không dùng captureBeyondViewport vì nó vẽ chồng thanh dính). */
async function shoot(p, name) {
  await sleep(1500); // để widget kịp hiện trạng thái "Thành công" thay vì vòng xoay đang xác minh
  await p.ev("window.scrollTo(0, 0); true");
  const vp = p.vp;
  // Lề trên của trang là 12vh nên chiều cao trang phụ thuộc chiều cao khung nhìn: nới lặp tới khi ổn định (không thì ảnh bị cắt mất dòng cuối).
  let height = vp.height;
  for (let i = 0; i < 8; i++) {
    const h = Math.max(await p.ev("Math.ceil(document.documentElement.scrollHeight)"), vp.height);
    if (h === height && i > 0) break;
    height = h;
    await p.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height, deviceScaleFactor: 1, mobile: vp.mobile });
    await p.ev("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
  }
  try {
    const r = await p.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
  } finally {
    await p.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  }
}
/** axe-core: MỌI vi phạm (không chỉ critical/serious) được ghi lại; trả danh sách để nơi gọi khẳng định rỗng. */
async function axe(p, label) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, mau: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })))`);
  results.axe[label] = v;
  return v;
}
/** Vùng chạm ≥ 44 px (nút, liên kết, ô gõ), ô gõ ≥ 16 px, không tràn ngang, widget nằm trọn trong thẻ. */
async function measure(p, label) {
  const m = await p.ev(`(() => {
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
    const ctl = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary')].filter(shown);
    const card = document.querySelector('.card').getBoundingClientRect();
    const f = document.querySelector('#turnstile-widget > div')?.getBoundingClientRect();
    return {
      tapDuoi44: ctl.filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height)),
      oGoDuoi16: ctl.filter((el) => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id),
      trànNgang: document.documentElement.scrollWidth - innerWidth,
      widget: f ? { rong: Math.round(f.width), cao: Math.round(f.height), trongThe: f.left >= card.left - 0.5 && f.right <= card.right + 0.5 } : null,
    };
  })()`);
  results.do[label] = m;
  return m;
}
/** Vi phạm CSP + mọi dòng lỗi của trình duyệt/trang, trừ tiếng ồn ĐÃ BIẾT: `GET /api/auth/me` = 401 (trang đăng nhập dò phiên có sẵn) — và `expected` (số dòng "status of 4xx" đã biết trước, vd sai PIN). */
function consoleProblems(p, expected = []) {
  const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
  const noise = (e) => e.source === "network" && /status of (\d+)/.test(e.text) && (/\/api\/auth\/me$/.test(e.url ?? "") || expected.some((x) => (e.url ?? "").endsWith(x.url) && e.text.includes(`status of ${x.status}`)));
  const other = p.logEntries.filter((e) => e.level === "error" && !noise(e) && !csp.includes(e));
  return { csp: csp.map((e) => e.text), other: other.map((e) => `${e.source}: ${e.text} ${e.url ?? ""}`), consoleErrors: [...p.consoleErrors] };
}
const pages = []; // [nhãn, trang, dòng lỗi mạng đã biết, chỉ-kiểm-CSP] — bước g đọc lại ở cuối. `cspOnly`: trang cố ý làm hỏng API nên chỉ khẳng định KHÔNG có lỗi CSP.
const track = (p, label, expected = [], cspOnly = false) => pages.push([label, p, expected, cspOnly]);

// =====================================================================================================================
// MÁY CHỦ A: Turnstile BẬT (khoá thử)
// =====================================================================================================================
const envA = await startEnv({ turnstile: true });
try {
  const row = envA.sql("SELECT company_name, tax_code, address, email FROM company_profile WHERE id = 'default'")[0];

  // ---- a) khối công ty ----
  await step("a", "khối công ty hiện đủ 6 mục đúng chữ (tên app, dòng phiên bản, tên công ty, địa chỉ, email, MST), khớp dòng company_profile trong D1", async () => {
    assert.deepEqual(row, { company_name: EXPECT.company, tax_code: EXPECT.taxCode, address: EXPECT.address, email: EXPECT.email }, "D1 tạm phải có đúng dữ liệu công ty của đặc tả (0002 + 0013)");
    const p = await openLogin(envA, { label: "a" });
    track(p, "a");
    await p.waitFor("!document.getElementById('company').hidden", "khối công ty hiện", 10000);
    const ui = await p.ev(`({ app: document.querySelector('h1').textContent, tieuDe: document.title, release: document.getElementById('release').textContent, lines: [...document.querySelectorAll('#company p')].map((e) => e.textContent) })`);
    assert.deepEqual(ui, {
      app: EXPECT.app, tieuDe: `Đăng nhập — ${EXPECT.app}`, release: EXPECT.release,
      lines: [EXPECT.company, `Địa chỉ: ${EXPECT.address}`, `Email: ${EXPECT.email}`, `MST: ${EXPECT.taxCode}`],
    });
  });

  // ---- b) CSP + widget + đăng nhập qua widget ----
  await step("b", "CSP cho phép Cloudflare; widget hiện, nút khoá tới khi có token, tự đạt bằng khoá thử; đăng nhập qua widget với đúng token của widget", async () => {
    const res = await fetch(envA.base + "/login");
    const csp = res.headers.get("content-security-policy") ?? "";
    results.csp = csp;
    const directive = (name) => csp.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + " ")) ?? "";
    for (const d of ["script-src", "frame-src", "connect-src"]) assert.ok(directive(d).includes("https://challenges.cloudflare.com"), `CSP thiếu https://challenges.cloudflare.com ở ${d}: "${directive(d)}"`);
    assert.ok(directive("script-src").includes("'self'") && !directive("script-src").includes("unsafe-inline"), "script-src vẫn chỉ 'self' + Cloudflare, không inline");

    const p = await openLogin(envA, { label: "b" });
    track(p, "b");
    await widgetReady(p);
    await hookReset(p);
    const seq = (await rec(p)).disabled;
    assert.deepEqual(seq, [true, false], "nút Đăng nhập phải khoá (true) TRƯỚC khi có token rồi mới mở (false)");
    assert.deepEqual((await rec(p)).enabledWithToken, [true], "và nút chỉ mở KHI ô token của widget đã có giá trị");
    const size = await p.ev(`(() => { const r = ${WIDGET_BOX}.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    results.widget = { ...size, token: await p.ev(TOKEN) };
    assert.ok(size.w >= 250 && size.h >= 60, `widget quá nhỏ: ${JSON.stringify(size)}`);
    assert.equal(await p.ev(TOKEN), DUMMY, "khoá thử phát token giả XXXX.DUMMY.TOKEN.XXXX");
    await shoot(p, "dang-nhap-390.png");
    await typeCreds(p, ACCOUNTS.salesA);
    const before = await p.ev(TOKEN);
    await submit(p);
    await loggedIn(p);
    const posts = loginPosts(p);
    assert.equal(posts.length, 1, "đúng một yêu cầu đăng nhập");
    assert.deepEqual(posts[0], { phone: ACCOUNTS.salesA.phone, pin: ACCOUNTS.salesA.pin, turnstileToken: before }, "thân yêu cầu có đúng token của widget");
    assert.equal(await p.ev("fetch('/api/auth/me').then((r) => r.status)"), 200, "phiên đã được cấp");
  });

  // ---- c) sai PIN → reset widget ----
  await step("c", "sai PIN: lỗi của máy chủ; widget được reset (ô token trống rồi có token mới); nút khoá suốt lúc chờ rồi mở lại; đăng nhập lại được", async () => {
    const p = await openLogin(envA, { label: "c" });
    track(p, "c", [{ url: "/api/auth/login", status: 401 }]);
    await widgetReady(p);
    assert.equal(await hookReset(p), true, "móc được turnstile.reset để đếm");
    await typeCreds(p, ACCOUNTS.salesB, "999999"); // sai PIN (tài khoản riêng, để không khoá tài khoản dùng ở bước khác)
    await submit(p);
    await p.waitFor(`${ERR_TEXT} === ${JSON.stringify(BAD_PIN)}`, "lỗi sai PIN của máy chủ hiện nguyên văn");
    await p.waitFor("window.__resets === 1", "turnstile.reset được gọi đúng 1 lần sau lần thất bại");
    await p.waitFor(`${TOKEN} !== '' && ${BTN_ENABLED}`, "token mới và nút mở lại", 25000);
    const r = await rec(p);
    assert.deepEqual(r.disabled, [true, false, true, false], "nút: khoá → mở (token 1) → khoá (đang gửi, rồi chờ token mới) → mở (token 2); KHÔNG có lúc nào mở khi chưa có token");
    assert.deepEqual(r.enabledWithToken, [true, true], "cả hai lần mở nút đều vì widget đã có token (không mở sớm)");
    assert.ok(r.token.includes(""), `ô token phải bị xoá khi reset, thấy: ${JSON.stringify(r.token)}`);
    assert.equal(r.token.at(-1), DUMMY, "và được điền lại token mới");
    assert.ok((await p.ev(ERR_TEXT)) === BAD_PIN, "lỗi sai PIN vẫn còn hiện sau khi token mới về (không bị xoá nhầm)");
    await shoot(p, "dang-nhap-loi-390.png");
    await typeCreds(p, ACCOUNTS.salesB);
    await submit(p);
    await loggedIn(p);
    const posts = loginPosts(p);
    assert.deepEqual(posts.map((x) => x.pin), ["999999", ACCOUNTS.salesB.pin]);
    assert.ok(posts.every((x) => x.turnstileToken === DUMMY), "cả hai lần đều kèm token của widget");
  });

  // ---- d) 403 turnstile_failed (thật) và 503 turnstile_unavailable (giả lập) ----
  await step("d", "403 turnstile_failed (thật) và 503 turnstile_unavailable (giả lập): chữ của máy chủ hiện nguyên văn ở #error, nút mở lại sau khi widget reset, thử lại được", async () => {
    assert.equal(FAILED, "Chưa xác minh được bạn là người thật. Hãy thử lại.", "chữ 403 ở mã nguồn máy chủ khớp đặc tả");
    assert.equal(UNAVAILABLE, "Chưa kết nối được dịch vụ xác minh. Hãy thử lại sau ít phút.", "chữ 503 ở mã nguồn máy chủ khớp đặc tả");
    const p = await openLogin(envA, { label: "d" });
    track(p, "d", [{ url: "/api/auth/login", status: 403 }, { url: "/api/auth/login", status: 503 }]);
    await widgetReady(p);
    await hookReset(p);
    await typeCreds(p, ACCOUNTS.salesA);
    // 1) THẬT: gỡ token khỏi yêu cầu → máy chủ tự trả 403 turnstile_failed
    await p.ev("window.__realFetch = window.fetch; window.fetch = (u, i) => String(u).endsWith('/api/auth/login') ? window.__realFetch(u, { ...i, body: JSON.stringify({ ...JSON.parse(i.body), turnstileToken: undefined }) }) : window.__realFetch(u, i); true");
    await submit(p);
    await p.waitFor(`${ERR_TEXT} === ${JSON.stringify(FAILED)}`, "403 turnstile_failed: chữ của máy chủ hiện nguyên văn");
    assert.equal((await p.ev("document.getElementById('error').getAttribute('role')")), "alert");
    await p.waitFor("window.__resets === 1", "widget reset sau 403");
    await p.waitFor(`${TOKEN} !== '' && ${BTN_ENABLED}`, "token mới, nút mở lại sau 403", 25000);
    await shoot(p, "dang-nhap-turnstile-loi-390.png");
    // 2) GIẢ LẬP: máy chủ trả 503 turnstile_unavailable
    await p.ev(`window.fetch = (u, i) => String(u).endsWith('/api/auth/login') ? Promise.resolve(new Response(JSON.stringify({ error: { code: 'turnstile_unavailable', message: ${JSON.stringify(UNAVAILABLE)} } }), { status: 503, headers: { 'content-type': 'application/json' } })) : window.__realFetch(u, i); true`);
    await submit(p);
    await p.waitFor(`${ERR_TEXT} === ${JSON.stringify(UNAVAILABLE)}`, "503 turnstile_unavailable: chữ của máy chủ hiện nguyên văn");
    await p.waitFor("window.__resets === 2", "widget reset sau 503");
    await p.waitFor(`${TOKEN} !== '' && ${BTN_ENABLED}`, "token mới, nút mở lại sau 503", 25000);
    // 3) thử lại thật sự chạy: trả lại fetch thật → đăng nhập thành công, lỗi cũ được xoá khi gửi lại
    await p.ev("window.fetch = window.__realFetch; true");
    await submit(p);
    assert.equal(await p.ev(ERR_TEXT), "", "gửi lại thì lỗi cũ được xoá");
    await loggedIn(p);
    assert.equal(await p.ev("fetch('/api/auth/me').then((r) => r.status)"), 200);
  });

  // ---- e) API công ty / cấu hình lỗi hoặc chậm ----
  await step("e", "API công ty lỗi (chặn mạng, 500, 404) hoặc chậm; API cấu hình lỗi (chặn, 500) hoặc chậm: vẫn đăng nhập được, khối công ty ẩn, không kẹt nút", async () => {
    // e1) công ty: ba kiểu lỗi — widget vẫn chạy, đăng nhập qua widget được, khối công ty ẩn, dòng phiên bản (hằng trong mã) vẫn hiện
    for (const [name, opts] of [["chặn mạng", { blocked: ["*/api/company"] }], ["500", { before: errorFetch("/api/company", 500, "internal") }], ["404 (mất dòng)", { before: errorFetch("/api/company", 404, "not_found") }]]) {
      const p = await openLogin(envA, { label: `e-cong-ty-${name}`, ...opts });
      await widgetReady(p);
      const st = await p.ev("({ congTyAn: document.getElementById('company').hidden, chu: document.getElementById('company').textContent, release: document.getElementById('release').textContent })");
      assert.deepEqual(st, { congTyAn: true, chu: "", release: EXPECT.release }, `công ty ${name}: khối ẩn, không rò chữ, dòng phiên bản còn`);
      await typeCreds(p, ACCOUNTS.salesA);
      await submit(p);
      await loggedIn(p);
      if (name === "chặn mạng") assert.ok(p.failed.length >= 1, "chặn mạng thật sự làm hỏng một yêu cầu");
    }
    // e2) công ty CHẬM 5 giây: đăng nhập không phải chờ; khối hiện khi API về
    const slow = await openLogin(envA, { label: "e-cong-ty-cham", before: slowFetch("/api/company", 5000) });
    await widgetReady(slow);
    assert.equal(await slow.ev("document.getElementById('company').hidden"), true, "trong lúc chờ: khối ẩn");
    assert.equal(await slow.ev(BTN_ENABLED), true, "và nút không bị công ty chặn");
    await slow.waitFor("!document.getElementById('company').hidden && document.querySelectorAll('#company p').length === 4", "khối công ty hiện khi API về", 10000);
    await typeCreds(slow, ACCOUNTS.salesA);
    await submit(slow);
    await loggedIn(slow);
    // e3) cấu hình lỗi: KHÔNG widget (không thể có khoá), không yêu cầu nào tới Cloudflare, nút không kẹt; máy chủ A đang đòi token nên đăng nhập báo lỗi Turnstile của máy chủ
    for (const [name, opts] of [["chặn mạng", { blocked: ["*/api/auth/config"] }], ["500", { before: errorFetch("/api/auth/config", 500, "internal") }]]) {
      const p = await openLogin(envA, { label: `e-cau-hinh-${name}`, ...opts });
      track(p, `e-cau-hinh-${name}`, [], true);
      await p.waitFor(BTN_ENABLED, "nút Đăng nhập mở dù không lấy được cấu hình", 8000);
      const st = await p.ev(`({ khungAn: document.getElementById('turnstile-widget').hidden, widget: ${WIDGET_UP}, script: [...document.scripts].some((s) => s.src.includes('cloudflare')) })`);
      assert.deepEqual(st, { khungAn: true, widget: false, script: false }, `cấu hình ${name}: không widget, không script Cloudflare`);
      assert.deepEqual(p.requests.filter((r) => r.url.includes("cloudflare")), [], "không yêu cầu nào tới Cloudflare");
      await p.waitFor("!document.getElementById('company').hidden", "khối công ty vẫn hiện", 10000);
      await typeCreds(p, ACCOUNTS.salesA);
      await submit(p);
      await p.waitFor(`${ERR_TEXT} === ${JSON.stringify(FAILED)}`, "máy chủ (đang bật Turnstile) từ chối vì thiếu token: chữ của máy chủ hiện, không treo");
      assert.equal(await p.ev(BTN_ENABLED), true, "và nút mở lại ngay (không có widget để chờ)");
    }
    // e4) cấu hình CHẬM 5 giây: nút tự mở sau ~3 giây (không kẹt), widget dựng khi cấu hình về muộn rồi khoá nút tới khi có token
    const late = await openLogin(envA, { label: "e-cau-hinh-cham", before: slowFetch("/api/auth/config", 5000) });
    track(late, "e-cau-hinh-cham");
    await late.waitFor(BTN_ENABLED, "nút mở khi cấu hình chậm", 6000);
    const waited = Date.now() - late.t0;
    assert.ok(waited < 4800, `nút phải mở TRƯỚC khi cấu hình về (5 giây), thực tế ${waited} ms`);
    assert.equal(await late.ev("document.getElementById('turnstile-widget').hidden"), true, "lúc đó chưa có widget");
    await widgetReady(late);
    assert.deepEqual((await rec(late)).disabled, [true, false, true, false], "nút: khoá lúc đầu → mở (quá hạn chờ) → khoá khi widget dựng → mở khi có token");
    await typeCreds(late, ACCOUNTS.salesA);
    await submit(late);
    await loggedIn(late);
    results.do["cau-hinh-cham-ms-den-khi-nut-mo"] = waited;
  });

  // ---- j) service worker ----
  await step("j", "service worker thật không lưu gì của Cloudflare và không lưu /api/*; khung đăng nhập vẫn được lưu", async () => {
    const p = await openLogin(envA, { label: "j", bypassSW: false });
    track(p, "j");
    await p.ev("navigator.serviceWorker.ready.then(() => true)");
    await p.send("Page.reload");
    await p.waitFor("navigator.serviceWorker.controller !== null && document.readyState === 'complete'", "trang do service worker kiểm soát", 15000);
    await widgetReady(p);
    const cached = await p.ev(`caches.keys().then((ks) => Promise.all(ks.map((k) => caches.open(k).then((c) => c.keys().then((rs) => rs.map((r) => r.url)))))).then((a) => a.flat())`);
    assert.ok(cached.some((u) => u.endsWith("/login")) && cached.some((u) => u.endsWith("/js/login.js")), `khung đăng nhập phải nằm trong cache: ${cached.length} mục`);
    assert.deepEqual(cached.filter((u) => !u.startsWith(envA.base + "/")), [], "mọi mục trong cache đều cùng nguồn với ứng dụng");
    assert.deepEqual(cached.filter((u) => /cloudflare|\/api\//i.test(u)), [], "không có gì của Cloudflare hay /api/* trong cache");
    assert.ok(p.requests.some((r) => r.url.includes("challenges.cloudflare.com")), "và widget thật sự đã tải từ Cloudflare (bằng chứng không rỗng)");
    results.widget.cacheServiceWorker = cached.length;
  });

  // ---- k) widget không dựng được: không bao giờ kẹt nút không lời giải thích ----
  await step("k", "widget không dựng được (script Cloudflare bị chặn; khoá site sai): thông báo tiếng Việt + nút Thử lại, nút Đăng nhập khoá; bỏ chặn rồi bấm Thử lại → widget dựng, lỗi biến mất, đăng nhập được", async () => {
    const LOAD_FAILED = "Chưa tải được bước xác minh người thật. Kiểm tra kết nối mạng rồi bấm “Thử lại”.";
    const p = await openLogin(envA, { label: "k", blocked: ["*challenges.cloudflare.com*"] });
    track(p, "k", [], true);
    await p.waitFor(`${ERR_TEXT} === ${JSON.stringify(LOAD_FAILED)}`, "thông báo không tải được bước xác minh");
    assert.deepEqual(await p.ev(`({ thuLai: !document.getElementById('turnstile-retry').hidden, nutKhoa: document.getElementById('submit').disabled, token: ${TOKEN} })`), { thuLai: true, nutKhoa: true, token: "" });
    assert.deepEqual(await p.ev("({ khungAn: document.getElementById('turnstile-widget').hidden, chuCho: document.getElementById('turnstile-widget').textContent })"), { khungAn: true, chuCho: "" }, "script không tải được: khung giữ chỗ ẩn và KHÔNG còn chữ “Đang tải xác minh…”");
    assert.ok(p.failed.length >= 1, "yêu cầu tới Cloudflare thật sự bị chặn");
    await shoot(p, "dang-nhap-khong-tai-duoc-widget-390.png");
    await p.send("Network.setBlockedURLs", { urls: [] });
    await p.ev("document.getElementById('turnstile-retry').click(); true");
    await widgetReady(p);
    assert.deepEqual(await p.ev(`({ loi: ${ERR_TEXT}, thuLai: !document.getElementById('turnstile-retry').hidden })`), { loi: "", thuLai: false }, "widget dựng được thì thông báo lỗi của widget và nút Thử lại biến mất");
    await typeCreds(p, ACCOUNTS.salesA);
    await submit(p);
    await loggedIn(p);
    // khoá site SAI (cấu hình bị sửa): widget từ chối dựng → vẫn có thông báo + Thử lại, nút khoá
    const bad = await openLogin(envA, { label: "k-khoa-sai", before: fakeConfig("khoa-site-sai") });
    track(bad, "k-khoa-sai", [], true);
    await bad.waitFor("!document.getElementById('error').hidden && !document.getElementById('turnstile-retry').hidden", "thông báo lỗi widget + nút Thử lại", 20000);
    assert.match(await bad.ev(ERR_TEXT), /^(Chưa tải được bước xác minh người thật|Bước xác minh người thật gặp sự cố)\./);
    assert.equal(await bad.ev("document.getElementById('submit').disabled"), true, "không có token thì nút vẫn khoá");
  });

  // ---- l) cấu hình lỗi lúc mở trang khi máy chủ ĐANG đòi token: tự phục hồi, không kẹt 403 mãi ----
  await step("l", "cấu hình lỗi lúc mở trang, máy chủ đang đòi token: đăng nhập 403 thì trang lấy lại cấu hình (có hạn, không giữ nút) rồi dựng widget — tự phục hồi, không kẹt 403 vĩnh viễn", async () => {
    // (1) cấu hình hỏng LIÊN TỤC: nút vẫn mở (không kẹt), không widget; trang hỏi lại vài lần rồi DỪNG
    const p = await openLogin(envA, { label: "l", before: flagConfig });
    track(p, "l", [{ url: "/api/auth/login", status: 403 }]); // các lần 403 của máy chủ ở đây là cố ý
    await p.waitFor(BTN_ENABLED, "nút Đăng nhập mở dù cấu hình hỏng", 6000);
    assert.equal(await p.ev("document.getElementById('turnstile-widget').hidden"), true, "chưa có widget");
    await sleep(8000); // chờ vòng hỏi lại lúc mở trang (nếu có) chạy hết — để phần dưới đo RIÊNG đường "sau 403"
    const calls1 = await p.ev("window.__cfgCalls");
    await sleep(2500);
    assert.equal(await p.ev("window.__cfgCalls"), calls1, `hết số lần thử thì dừng, không hỏi mãi (${calls1} lần)`);
    assert.ok(calls1 >= 1 && calls1 <= 6, `số lần hỏi cấu hình lúc mở trang có giới hạn: ${calls1}`);
    assert.equal(await p.ev(BTN_ENABLED), true, "và trong lúc hỏi lại nút không bị giữ");
    // (2) đăng nhập khi cấu hình VẪN hỏng: máy chủ 403 → chữ của máy chủ + hỏi lại vài lần rồi dừng (không lặp vô hạn)
    await typeCreds(p, ACCOUNTS.salesA);
    await submit(p);
    await p.waitFor(`${ERR_TEXT} === ${JSON.stringify(FAILED)}`, "403 thật của máy chủ: thiếu token");
    await p.waitFor(`window.__cfgCalls > ${calls1}`, "sau 403 trang hỏi lại cấu hình", 6000);
    await sleep(7500);
    const calls2 = await p.ev("window.__cfgCalls");
    await sleep(2500);
    assert.equal(await p.ev("window.__cfgCalls"), calls2, "hết số lần thử sau 403 thì dừng");
    assert.ok(calls2 > calls1 && calls2 - calls1 <= 6, `số lần hỏi lại sau 403 có giới hạn: ${calls2 - calls1}`);
    assert.equal(await p.ev(BTN_ENABLED), true, "nút vẫn không kẹt");
    // (3) cấu hình ổn lại (máy chủ vẫn đòi token): lần 403 kế tiếp → lấy lại cấu hình → widget được dựng, tự đạt, đăng nhập được
    await p.ev("window.__cfgFail = false; true");
    await submit(p);
    await widgetReady(p);
    assert.equal(await p.ev("document.getElementById('turnstile-widget').hidden"), false, "khung widget hiện");
    const r = await rec(p);
    // Đuôi dãy: 403 → nút mở lại (chưa có khoá nên chưa có widget) → có khoá: KHOÁ tới khi có token → MỞ khi token về (và lần MỞ cuối này ô token đã có giá trị).
    assert.deepEqual(r.disabled.slice(-3), [false, true, false], `nút sau 403 cuối: mở → khoá (có widget, chờ token) → mở khi có token: ${JSON.stringify(r.disabled)}`);
    assert.equal(r.enabledWithToken.at(-1), true, `lần MỞ cuối phải vì widget đã có token: ${JSON.stringify(r.enabledWithToken)}`);
    await typeCreds(p, ACCOUNTS.salesA);
    await submit(p);
    await loggedIn(p);
    const last = loginPosts(p).at(-1);
    assert.equal(last.turnstileToken, DUMMY, "lần đăng nhập cuối kèm token của widget");
  });

  // ---- o) tự phục hồi ngay khi mở trang (không cần bấm gì) ----
  await step("o", "cấu hình lỗi ở lần hỏi đầu rồi ổn lại: lần hỏi lại lúc mở trang (giãn cách, có hạn) dựng widget mà chưa ai bấm đăng nhập; nút không bị giữ trong lúc chờ và khoá tới khi có token", async () => {
    const q = await openLogin(envA, { label: "o", before: flagConfig });
    track(q, "o");
    await q.waitFor("window.__cfgCalls >= 1", "lần hỏi cấu hình đầu (lỗi)");
    await q.waitFor(BTN_ENABLED, "nút mở ngay sau lần lỗi đầu (không giữ tới hết hạn chờ)", 2500);
    assert.equal(await q.ev("document.getElementById('turnstile-widget').hidden"), true, "chưa có widget");
    await q.ev("window.__cfgFail = false; true");
    await widgetReady(q);
    assert.equal(loginPosts(q).length, 0, "widget tự dựng khi mở trang, chưa hề đăng nhập");
    const calls = await q.ev("window.__cfgCalls");
    assert.ok(calls >= 2 && calls <= 3, `đã hỏi lại ít lần (${calls})`);
    assert.deepEqual((await rec(q)).disabled, [true, false, true, false], "nút: khoá → mở (cấu hình lỗi) → khoá (có khoá, chờ token) → mở khi có token");
    await typeCreds(q, ACCOUNTS.salesA);
    await submit(q);
    await loggedIn(q);
  });

  // ---- m) chữ chờ trong khung widget ----
  await step("m", "trong lúc chờ nạp script Turnstile: khung không trống — có chữ tiếng Việt “Đang tải xác minh…” (một đoạn <p role=status>), nút Đăng nhập khoá; chữ biến mất khi widget dựng xong; axe 0 vi phạm và vùng chạm ≥ 44 px ở trạng thái này", async () => {
    const p = await openLogin(envA, { label: "m", before: slowScript(4000) });
    track(p, "m");
    await p.waitFor("!document.getElementById('turnstile-widget').hidden", "khung widget hiện (đang chờ script)", 6000);
    const wait = await p.ev(`(() => { const box = document.getElementById('turnstile-widget'); const ps = [...box.querySelectorAll('p')]; return { chu: box.textContent.trim(), soDoan: ps.length, vaiTro: ps[0]?.getAttribute('role') ?? null, widget: ${WIDGET_UP}, cao: Math.round(box.getBoundingClientRect().height), nutKhoa: document.getElementById('submit').disabled }; })()`);
    assert.deepEqual([wait.chu, wait.soDoan, wait.vaiTro, wait.widget, wait.nutKhoa], ["Đang tải xác minh…", 1, "status", false, true], `khung chờ: ${JSON.stringify(wait)}`);
    assert.ok(wait.cao >= 60, `khung giữ chỗ vẫn cao ${wait.cao} px (widget dựng xong không đẩy nút)`);
    results.widget.chuCho = wait;
    const v = await axe(p, "may-A-390-dang-tai-xac-minh");
    assert.deepEqual(v, [], `axe (đang tải): ${JSON.stringify(v)}`);
    const m = await measure(p, "may-A-390-dang-tai-xac-minh");
    assert.deepEqual([m.tapDuoi44, m.oGoDuoi16, m.trànNgang <= 0], [[], [], true]);
    await shoot(p, "dang-nhap-dang-tai-xac-minh-390.png");
    await widgetReady(p);
    assert.deepEqual(await p.ev("({ chu: document.getElementById('turnstile-widget').textContent.trim(), doan: document.querySelectorAll('#turnstile-widget p').length })"), { chu: "", doan: 0 }, "widget dựng xong: chữ chờ biến mất");
  });

  // ---- n) theme sáng + mã lỗi của Cloudflare ----
  await step("n", "widget dựng với theme “light” (app chỉ có giao diện sáng); khi widget báo lỗi giữa chừng, mã lỗi của Cloudflare được ghi bằng console.warn (không bí mật) và người dùng thấy thông báo tiếng Việt + Thử lại", async () => {
    const p = await openLogin(envA, { label: "n", before: hookTurnstile });
    track(p, "n");
    try {
      await widgetReady(p);
    } catch (e) {
      const d = await p.ev(`({ turnstile: typeof window.turnstile, opts: !!window.__opts, khung: document.getElementById('turnstile-widget').innerHTML.slice(0, 200), loi: ${ERR_TEXT}, canhBao: window.__warns })`);
      throw new Error(`${e.message.split("\n")[0]} — chẩn đoán: ${JSON.stringify(d)}`);
    }
    const opts = await p.ev("({ theme: window.__opts.theme, language: window.__opts.language, sitekey: window.__opts.sitekey, size: window.__opts.size })");
    assert.deepEqual(opts, { theme: "light", language: "vi-vn", sitekey: TURNSTILE_TEST.siteKey, size: "flexible" }, "tuỳ chọn đưa cho turnstile.render");
    assert.deepEqual(await p.ev("window.__warns.filter((w) => /Turnstile/.test(w))"), [], "chưa có lỗi thì chưa có cảnh báo");
    // giả lập đúng cách Cloudflare gọi khi widget hỏng: error-callback(mã)
    const returned = await p.ev("window.__opts['error-callback']('300030')");
    assert.equal(returned, true, "callback vẫn báo 'đã xử lý' (Cloudflare khỏi ghi lỗi ra console — nên trang tự ghi mã)");
    await p.waitFor(`${ERR_TEXT} === "Bước xác minh người thật gặp sự cố. Bấm “Thử lại”; nếu vẫn lỗi, hãy tải lại trang."`, "thông báo lỗi widget");
    assert.deepEqual(await p.ev(`({ thuLai: !document.getElementById('turnstile-retry').hidden, nutKhoa: document.getElementById('submit').disabled })`), { thuLai: true, nutKhoa: true });
    const warns = await p.ev("window.__warns.filter((w) => /Turnstile/.test(w))");
    assert.equal(warns.length, 1, `đúng một cảnh báo: ${JSON.stringify(warns)}`);
    assert.match(warns[0], /300030/, "cảnh báo mang mã lỗi của Cloudflare");
    assert.doesNotMatch(warns[0], new RegExp(`${TURNSTILE_TEST.siteKey}|${TURNSTILE_TEST.secret}|${DUMMY}`), "không lộ khoá hay token");
  });

  // ---- h, i) axe + đo + ảnh, ở các trạng thái ----
  const states = {};
  try {
    for (const [label, vp] of [["390", M], ["375", IPHONE_SE], ["320", NARROW], ["1040", DESK]]) {
      const p = await openLogin(envA, { vp, label: `hi-${label}` });
      track(p, `hi-${label}`, label === "390" ? [{ url: "/api/auth/login", status: 401 }] : []); // ở 390 có thêm một lần sai PIN cố ý (trạng thái lỗi)
      await p.waitFor("!document.getElementById('company').hidden", "khối công ty hiện", 10000);
      await widgetReady(p);
      states[label] = { axe: await axe(p, `may-A-${label}-widget-da-dat`), do: await measure(p, `may-A-${label}`) };
      if (label === "1040") await shoot(p, "dang-nhap-1040.png");
      if (label === "320") await shoot(p, "dang-nhap-320.png");
      if (label === "390") {
        // trạng thái lỗi trên cùng trang: sai PIN → alert hiện
        await typeCreds(p, ACCOUNTS.admin, "999998");
        await submit(p);
        await p.waitFor(`${ERR_TEXT} === ${JSON.stringify(BAD_PIN)}`, "lỗi sai PIN");
        await p.waitFor(`${TOKEN} !== '' && ${BTN_ENABLED}`, "token mới", 25000);
        states.loi = { axe: await axe(p, "may-A-390-loi-sai-pin"), do: await measure(p, "may-A-390-loi-sai-pin") };
      }
    }
  } catch (e) {
    states.loiChung = String(e?.message ?? e);
  }
  await step("h", "axe-core: 0 vi phạm (mọi mức) ở 390, 375, 320, 1040 (widget đã đạt) và ở trạng thái lỗi", async () => {
    assert.equal(states.loiChung, undefined, `không dựng được trạng thái để đo: ${states.loiChung}`);
    for (const k of ["390", "375", "320", "1040", "loi"]) assert.deepEqual(states[k]?.axe, [], `axe (${k}): ${JSON.stringify(states[k]?.axe)}`);
  });
  await step("i", "vùng chạm ≥ 44 px, ô gõ ≥ 16 px, không tràn ngang, widget nằm trọn trong thẻ (390, 375, 320, 1040, trạng thái lỗi); ảnh 390×844 và 1040×800 đã lưu", async () => {
    assert.equal(states.loiChung, undefined, `không dựng được trạng thái để đo: ${states.loiChung}`);
    for (const k of ["390", "375", "320", "1040", "loi"]) {
      const m = states[k]?.do;
      assert.ok(m, `thiếu số đo ${k}`);
      assert.deepEqual(m.tapDuoi44, [], `vùng chạm < 44 px (${k})`);
      assert.deepEqual(m.oGoDuoi16, [], `ô gõ < 16 px (${k})`);
      assert.ok(m.trànNgang <= 0, `tràn ngang ${m.trànNgang} px (${k})`);
      assert.ok(m.widget?.trongThe, `widget lệch khỏi thẻ (${k}): ${JSON.stringify(m.widget)}`);
    }
  });

  // ---- g) console và CSP: đọc lại mọi trang đã mở ở máy chủ A ----
  await step("g", "không có lỗi CSP và console sạch ở mọi trang đã mở với máy chủ A (chỉ còn các dòng mạng đã biết: dò phiên 401, và các lỗi đăng nhập cố ý)", async () => {
    assert.ok(pages.length >= 8, `đã theo dõi ${pages.length} trang`);
    for (const [label, p, expected, cspOnly] of pages) {
      const problems = consoleProblems(p, expected);
      results.do[`console-${label}`] = { logEntries: p.logEntries.length, ...problems };
      assert.deepEqual(cspOnly ? problems.csp : problems, cspOnly ? [] : { csp: [], other: [], consoleErrors: [] }, `trang ${label}: ${JSON.stringify(problems)}`);
    }
    // Tiền đề không rỗng: header CSP có thật (bước b) và widget đã tải + dựng khung THẬT (bước j/b); ở đây thêm: mỗi trang ở bước b đã yêu cầu script Cloudflare.
    const pb = pages.find(([label]) => label === "b")?.[1];
    assert.ok(pb.requests.some((r) => /challenges\.cloudflare\.com\/turnstile\/v0\/.*api\.js/.test(r.url)), "trang b đã tải api.js của Cloudflare (CSP không chặn)");
  });
} finally {
  for (const p of opened) p.close();
  await envA.stop();
}

// =====================================================================================================================
// MÁY CHỦ B: Turnstile TẮT (không khoá)
// =====================================================================================================================
opened.length = 0;
const envB = await startEnv();
try {
  await step("f", "máy chủ không có khoá Turnstile: /api/auth/config = null, không widget, không yêu cầu nào tới Cloudflare, đăng nhập bình thường (kể cả sai PIN không phải chờ token)", async () => {
    const cfg = await (await fetch(envB.base + "/api/auth/config")).json();
    assert.deepEqual(cfg, { turnstileSiteKey: null, maintenance: { on: false, endsAt: null } }); // + trạng thái chế độ bảo trì (tắt) kể từ migration 0016
    const p = await openLogin(envB, { label: "f" });
    await p.waitFor(`${BTN_ENABLED} && !document.getElementById('company').hidden`, "nút mở và khối công ty hiện", 10000);
    const st = await p.ev(`({ khungAn: document.getElementById('turnstile-widget').hidden, widget: ${WIDGET_UP}, script: [...document.scripts].some((s) => s.src.includes('cloudflare')), thuLai: document.getElementById('turnstile-retry').hidden })`);
    assert.deepEqual(st, { khungAn: true, widget: false, script: false, thuLai: true });
    await sleep(1500); // chờ để chắc chắn không có yêu cầu muộn nào tới Cloudflare
    assert.deepEqual(p.requests.filter((r) => r.url.includes("cloudflare")), [], "không yêu cầu nào tới Cloudflare");
    assert.deepEqual((await rec(p)).disabled, [true, false], "nút chỉ khoá trong lúc chờ cấu hình (ngắn), rồi mở, không chờ token");
    // ảnh + axe + đo ở trạng thái không widget
    const v = await axe(p, "may-B-390-khong-widget");
    assert.deepEqual(v, [], `axe (không widget): ${JSON.stringify(v)}`);
    const m = await measure(p, "may-B-390-khong-widget");
    assert.deepEqual([m.tapDuoi44, m.oGoDuoi16, m.trànNgang <= 0, m.widget], [[], [], true, null]);
    await shoot(p, "dang-nhap-khong-widget-390.png");
    // sai PIN: lỗi, nút mở lại ngay
    await typeCreds(p, ACCOUNTS.salesB, "999999");
    await submit(p);
    await p.waitFor(`${ERR_TEXT} === ${JSON.stringify(BAD_PIN)}`, "lỗi sai PIN");
    assert.equal(await p.ev(BTN_ENABLED), true);
    await typeCreds(p, ACCOUNTS.salesB);
    await submit(p);
    await loggedIn(p);
    assert.deepEqual(loginPosts(p).map((x) => x.turnstileToken), [undefined, undefined], "không gửi turnstileToken khi không có widget");
    const problems = consoleProblems(p, [{ url: "/api/auth/login", status: 401 }]);
    assert.deepEqual(problems, { csp: [], other: [], consoleErrors: [] }, `console (máy chủ B): ${JSON.stringify(problems)}`);
  });
} finally {
  for (const p of opened) p.close();
  await envB.stop();
}

results.tongKet = { dat: passed, hong: failures };
writeFileSync(join(OUT, "ket-qua-dang-nhap.json"), JSON.stringify(results, null, 2) + "\n");
console.log(failures ? `\n${failures} bước ✗ / ${passed} bước ✓` : `\nV1 DANG NHAP OK — ${passed} bước ✓`);
process.exitCode = failures ? 1 : 0;
