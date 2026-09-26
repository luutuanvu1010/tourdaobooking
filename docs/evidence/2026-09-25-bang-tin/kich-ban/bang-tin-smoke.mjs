// Kịch bản Chrome HAI TÀI KHOẢN ĐỒNG THỜI cho Bảng tin (ADR-0022, Task 10; tiêu chí TD-3, TD-4, TD-6, TD-1) — bằng chứng hành vi trình duyệt thật của
// tin thời gian thực: một người thao tác ở tab này, người kia thấy ngay ở tab kia, KHÔNG bấm tải lại.
//
// BẪY COOKIE DÙNG CHUNG (CLAUDE.md §10): các kịch bản Chrome cũ dùng CHUNG một kho cookie nên chỉ mở tài khoản này rồi tài khoản kia LẦN LƯỢT ("mở trang của tài khoản nào sau cùng").
// Ở đây hai người phải mở CÙNG LÚC → mỗi tài khoản có MỘT NGỮ CẢNH TRÌNH DUYỆT RIÊNG (`Target.createBrowserContext`, kho cookie tách biệt) trong một Chrome; khẳng định ĐẦU TIÊN
// là `/api/auth/me` ở hai ngữ cảnh trả hai người KHÁC nhau. Máy chủ + D1 tạm + đăng nhập dùng lại `startEnv()`/`ACCOUNTS`/`env.login()`/`env.sql()` của A2 (a2-cdp.mjs);
// Chrome của `startEnv` không dùng tới (không có cổng CDP xuất ra) — kịch bản tự bật một Chrome riêng và tự dọn nó.
//
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh \
//   ANH_DIR=docs/evidence/2026-09-25-bang-tin/anh node docs/evidence/2026-09-25-bang-tin/kich-ban/bang-tin-smoke.mjs
// (ANH_DIR mặc định là thư mục tạm; AXE_JS mặc định /private/tmp/tourdao-axe/package/axe.min.js hoặc bản axe mới nhất trong ~/.claude/jobs/*/tmp/axe.)
// Chạy toàn bộ kịch bản HAI LẦN — khổ điện thoại 390×844 rồi máy tính 1040×800 — mỗi lần với ngữ cảnh + đơn mới. Thoát 1 nếu có dòng ✗.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { ACCOUNTS, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ANH_DIR = process.env.ANH_DIR ?? mkdtempSync(join(tmpdir(), "bang-tin-anh-"));
mkdirSync(ANH_DIR, { recursive: true });

// axe-core: đường dẫn theo quy ước các kịch bản khác (biến môi trường, hoặc bản có sẵn trên máy).
const axePath = () => {
  if (process.env.AXE_JS) return process.env.AXE_JS;
  const co = "/private/tmp/tourdao-axe/package/axe.min.js";
  if (existsSync(co)) return co;
  const jobs = join(homedir(), ".claude", "jobs");
  const cands = existsSync(jobs) ? readdirSync(jobs).map((d) => join(jobs, d, "tmp", "axe", "package", "axe.min.js")).filter(existsSync) : [];
  if (cands.length === 0) throw new Error("không tìm thấy axe.min.js — đặt AXE_JS");
  return cands.sort().at(-1);
};
const AXE = readFileSync(axePath(), "utf8");

// ----- in kết quả: ✓/✗ tiếng Việt, đếm, thoát khác 0 nếu có ✗ -----
let nDat = 0;
let nHong = 0;
const dat = (m) => { nDat++; console.log(`✓ ${m}`); };
const hong = (m, e) => { nHong++; console.log(`✗ ${m} — ${String(e?.message ?? e).split("\n")[0].slice(0, 500)}`); };
/** Chạy một khẳng định: `fn` trả (hoặc không) một đoạn chi tiết nối vào dòng ✓; ném lỗi → dòng ✗ và đi tiếp (bước sau có thể đỏ theo). */
const step = async (label, fn) => {
  try {
    const chiTiet = await fn();
    dat(chiTiet ? `${label} — ${chiTiet}` : label);
    return true;
  } catch (e) {
    hong(label, e);
    return false;
  }
};

const freePort = () => new Promise((res, rej) => { const s = createServer(); s.unref(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); }); });

// Móc chèn TRƯỚC mã trang (Page.addScriptToEvaluateOnNewDocument): đếm mọi WebSocket do trang tạo, ghi mọi thông báo nổi (a.toast) ĐÃ TỪNG hiện (kể cả cái đã tự ẩn),
// và ghi sự kiện `don-thay-doi` / `can-tai-lai` mà bộ lắng nghe của Bảng tin phát ra.
const HOOK = `(() => {
  const W = window.WebSocket; window.__ws = [];
  window.WebSocket = function (...a) { const s = new W(...a); window.__ws.push({ url: String(a[0]), s }); return s; };
  window.WebSocket.prototype = W.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) window.WebSocket[k] = W[k];
  window.__toasts = []; window.__dot = []; window.__ctl = 0;
  window.addEventListener('don-thay-doi', (e) => { for (const x of e.detail) window.__dot.push(x); });
  window.addEventListener('can-tai-lai', () => { window.__ctl++; });
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const ds = n.matches && n.matches('a.toast') ? [n] : [...(n.querySelectorAll ? n.querySelectorAll('a.toast') : [])];
      for (const a of ds) window.__toasts.push({ text: a.textContent, href: a.getAttribute('href') });
    }
  }).observe(document, { childList: true, subtree: true });
})()`;

/** Tách kho cookie: một Chrome, mỗi tài khoản một ngữ cảnh (`browserContextId`). */
async function moChrome() {
  const profile = mkdtempSync(join(tmpdir(), "bang-tin-chrome-"));
  const cdpPort = await freePort();
  const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let ver = null;
  for (let i = 0; i < 80; i++) {
    ver = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`).catch(() => null))?.json().catch(() => null);
    if (ver) break;
    await sleep(250);
  }
  if (!ver) throw new Error("Chrome không lên");
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const browserSend = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

  /** Mở một trang trong ngữ cảnh `ctx` với khổ `vp`; trả các hàm điều khiển (cùng khuôn `openPage` của a2-cdp.mjs). */
  async function moTrang(ctx, vp, base, cookie) {
    const { result: r1 } = await browserSend("Target.createTarget", { url: "about:blank", browserContextId: ctx });
    const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
    const t = list.find((x) => x.id === r1.targetId);
    const pws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => pws.addEventListener("open", r));
    let pid = 0;
    const pend = new Map();
    const consoleErrors = [];
    const logEntries = [];
    const requests = [];
    pws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
      if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
      if (m.method === "Log.entryAdded") logEntries.push({ level: m.params.entry.level, source: m.params.entry.source, text: m.params.entry.text, url: m.params.entry.url });
      if (m.method === "Network.requestWillBeSent") requests.push({ url: m.params.request.url, method: m.params.request.method });
    });
    const send = (method, params = {}) => new Promise((res) => { const i = ++pid; pend.set(i, res); pws.send(JSON.stringify({ id: i, method, params })); });
    await send("Network.enable"); await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.mobile ? 2 : 1, mobile: vp.mobile });
    if (vp.mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Page.addScriptToEvaluateOnNewDocument", { source: HOOK });
    await send("Network.setCookie", { name: cookie.name, value: cookie.value, url: base, httpOnly: true });
    const ev = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(`evaluate lỗi: ${JSON.stringify(r.result.exceptionDetails).slice(0, 400)} ← ${expression.slice(0, 140)}`);
      return r.result.result.value;
    };
    /** Chờ biểu thức đúng; trả THỜI ĐIỂM (ms epoch) nó đúng lần đầu — để đo "trong bao lâu". */
    const doi = async (expression, what, ms = 8000) => {
      const end = Date.now() + ms;
      for (;;) {
        if (await ev(expression).catch(() => false)) return Date.now();
        if (Date.now() > end) throw new Error(`hết giờ chờ: ${what}`);
        await sleep(40);
      }
    };
    const dieuHuong = async (path) => {
      await send("Page.navigate", { url: base + path });
      await sleep(150);
      await doi("document.readyState === 'complete'", `trang ${path} tải xong`);
    };
    const chup = async (ten) => {
      const r = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(ANH_DIR, ten), Buffer.from(r.result.data, "base64"));
    };
    return { send, ev, doi, dieuHuong, chup, consoleErrors, logEntries, requests, close: () => pws.close() };
  }

  const dong = async () => {
    const exited = chrome.exitCode !== null ? Promise.resolve() : new Promise((r) => chrome.once("exit", r));
    try { ws.close(); } catch { /* đã đóng */ }
    try { chrome.kill("SIGTERM"); } catch { /* đã thoát */ }
    await Promise.race([exited, sleep(4000)]);
    await sleep(300);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* bỏ qua */ }
  };
  return { browserSend, moTrang, dong };
}

const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
let soDon = 0;
/** Thân yêu cầu lập đơn hợp lệ (đủ điểm đón để xác nhận được). */
const thanDon = (ten) => ({
  customerName: `${ten} ${++soDon}`, customerPhone: "0904 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
  services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, unitPrices: { adult: 1350000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departDate: vnDate(5), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá" }],
});
/** Gọi API TRONG trang (cùng nguồn → trình duyệt tự gửi cookie + Origin, đúng như người dùng thật). */
const goiApi = (p, method, path, body) =>
  p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);

// Toàn bộ trạng thái chuyển vào hàm chạy theo khổ: `tag` = hậu tố tên ảnh.
async function chayMotKho(env, chrome, vp, tag) {
  console.log(`\n=== Khổ ${tag} (${vp.width}×${vp.height}) — hai tài khoản mở CÙNG LÚC ===`);
  const ctxA = (await chrome.browserSend("Target.createBrowserContext", { disposeOnDetach: false })).result.browserContextId;
  const ctxB = (await chrome.browserSend("Target.createBrowserContext", { disposeOnDetach: false })).result.browserContextId;
  const cookieA = await env.login(ACCOUNTS.salesA);
  const cookieB = await env.login(ACCOUNTS.salesB);
  const A = await chrome.moTrang(ctxA, vp, env.base, cookieA);
  const B = await chrome.moTrang(ctxB, vp, env.base, cookieB);
  const ten = (p) => (p === A ? "A" : "B");

  const motSocket = async (p, nhan) => {
    await p.doi("window.__ws.length >= 1 && window.__ws[0].s.readyState === 1", `socket mở (${nhan})`);
    await sleep(1000);
    const st = await p.ev("({ n: window.__ws.length, url: window.__ws[0].url, rs: window.__ws.map((w) => w.s.readyState) })");
    assert.equal(st.n, 1, `${nhan}: phải đúng MỘT WebSocket, thực tế ${st.n}`);
    assert.match(st.url, /^ws:\/\/127\.0\.0\.1:\d+\/api\/bang-tin$/, `${nhan}: địa chỉ socket`);
    return `${nhan}: 1 socket tới /api/bang-tin`;
  };
  const tenTai = async (p) => (await p.ev("fetch('/api/auth/me').then((r) => r.json())")).staff;

  // ---------------------------------------------------------------- (a) mở trang + hai người khác nhau
  await A.dieuHuong("/orders");
  await B.dieuHuong("/");
  let nguoiA = null;
  let nguoiB = null;
  await step(`[${tag}] (a0) HAI NGỮ CẢNH, hai người KHÁC nhau: /api/auth/me ở ngữ cảnh A ≠ ngữ cảnh B (kho cookie tách biệt, cùng lúc)`, async () => {
    nguoiA = await tenTai(A);
    nguoiB = await tenTai(B);
    const a2 = await tenTai(A); // đọc lại A SAU khi B đã có cookie: nếu dùng chung kho, phiên B sẽ đè phiên A
    assert.ok(nguoiA?.id && nguoiB?.id, `thiếu id: ${JSON.stringify([nguoiA, nguoiB])}`);
    assert.notEqual(nguoiA.id, nguoiB.id, "hai ngữ cảnh trả CÙNG một người — cookie bị dùng chung");
    assert.equal(a2.id, nguoiA.id, "ngữ cảnh A đổi người sau khi B mở — cookie bị dùng chung");
    const tenNguoi = (s) => s.fullName ?? s.name;
    assert.equal(tenNguoi(nguoiA), ACCOUNTS.salesA.name);
    assert.equal(tenNguoi(nguoiB), ACCOUNTS.salesB.name);
    return `A = ${tenNguoi(nguoiA)}, B = ${tenNguoi(nguoiB)}`;
  });
  const tenA = ACCOUNTS.salesA.name;
  const tenB = ACCOUNTS.salesB.name;
  await step(`[${tag}] (a1) A mở /orders, B mở / (Trang chủ), cả hai đã đăng nhập`, async () => {
    assert.equal(await A.ev("location.pathname"), "/orders");
    assert.equal(await B.ev("location.pathname"), "/");
    await A.doi("document.querySelector('#loading')?.hidden !== false", "danh sách A tải xong");
    await B.doi("document.getElementById('loading').hidden && !document.getElementById('dash-grid').hidden", "Trang chủ B tải xong");
  });
  await step(`[${tag}] (f1) mỗi trang một socket: A (/orders)`, () => motSocket(A, "A /orders"));
  await step(`[${tag}] (f1) mỗi trang một socket: B (/)`, () => motSocket(B, "B /"));

  // ---------------------------------------------------------------- (b) B lập đơn X → A thấy dòng mới < 2 giây, KHÔNG có thông báo nổi
  let X = null;
  await step(`[${tag}] (b) B lập đơn X qua API trong ngữ cảnh B → dòng mới hiện ở /orders của A dưới 2 giây, KHÔNG thông báo nổi (tin "tao" chỉ làm mới)`, async () => {
    const r = await goiApi(B, "POST", "/api/orders", thanDon("Khách Bảng Tin B"));
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const t0 = Date.now();
    X = r.json.order;
    const t1 = await A.doi(`document.querySelector('#list a[href="/order?id=${X.id}"]') !== null`, "dòng đơn X hiện ở /orders của A", 6000);
    const ms = t1 - t0;
    assert.ok(ms < 2000, `dòng mới hiện sau ${ms} ms (≥ 2000)`);
    await sleep(1300); // qua hạn hoãn thông báo nổi (500 ms) và bộ gộp (1 s)
    assert.deepEqual(await A.ev("window.__toasts"), [], "A không được thấy thông báo nổi nào cho tin tao");
    assert.ok((await A.ev("window.__dot")).some((e) => e.orderId === X.id && e.thayDoi === "tao"), "A phải nhận tin thayDoi=tao về đơn X");
    assert.equal(await A.ev("document.querySelectorAll('.toast-vung a.toast').length"), 0);
    await A.chup(`bang-tin-b-don-moi-hien-ngay-${tag}.png`);
    return `${X.orderCode}: dòng hiện sau ${ms} ms, không thông báo nổi, ảnh bang-tin-b-don-moi-hien-ngay-${tag}.png`;
  });

  // ---------------------------------------------------------------- (c) B bấm "Nhận phụ trách" → A thấy thông báo nổi + danh sách đổi người phụ trách; B không thấy thông báo của chính mình
  // Đơn Y do A lập (người phụ trách ban đầu = A, hiện ở dòng xổ của danh sách); đóng dòng HANDLE bằng SQL (đơn "chưa có người", như tests/e2e/dispatch.mjs) — SQL không phát tin
  // nên danh sách của A vẫn ghi "Phụ trách: A" cho tới khi B nhận; sau khi B nhận phải đổi thành "Phụ trách: B" (đổi thấy được). Đơn X (của B) không dùng cho việc này
  // vì người lập cũng là người nhận → chữ trong danh sách không đổi, không phân biệt được "danh sách đã làm mới" với "chưa làm mới".
  let Y = null;
  const dongHandler = (id) => env.sql(`SELECT count(*) AS n FROM dsp_assignment WHERE order_id = '${id}' AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL`)[0].n;
  const slotSel = (id) => `document.querySelector('#list a[href="/order?id=${id}"]')?.closest('.order-card')?.querySelector('.order-row-handler')?.textContent ?? null`;
  await step(`[${tag}] (c0) chuẩn bị: A lập đơn Y (dòng hiện ở danh sách A, ghi "Phụ trách: ${tenA}"); đóng dòng HANDLE của Y bằng SQL → đơn chưa có người`, async () => {
    const r = await goiApi(A, "POST", "/api/orders", thanDon("Khách Nhận Việc"));
    assert.equal(r.status, 201, JSON.stringify(r.json));
    Y = r.json.order;
    await A.doi(`document.querySelector('#list a[href="/order?id=${Y.id}"]') !== null`, "dòng đơn Y ở A", 6000);
    await A.doi(`(${slotSel(Y.id)} ?? '').includes(${JSON.stringify(`Phụ trách: ${tenA}`)})`, `dòng Y ghi "Phụ trách: ${tenA}"`, 6000);
    assert.equal(dongHandler(Y.id), 1, "trước SQL: đúng một dòng HANDLE đang mở");
    env.sql(`UPDATE dsp_assignment SET valid_to_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE order_id = '${Y.id}' AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL`);
    assert.equal(dongHandler(Y.id), 0, "sau SQL: không còn dòng HANDLE đang mở");
    return `${Y.orderCode}`;
  });
  await B.dieuHuong(`/order?id=${Y.id}`);
  await step(`[${tag}] (f1) mỗi trang một socket: B (/order?id=Y)`, () => motSocket(B, "B /order?id=Y"));
  await step(`[${tag}] (c) B bấm "Nhận phụ trách" trên /order?id=Y → A thấy thông báo nổi có mã đơn (aria-live=polite) và dòng Y đổi sang "Phụ trách: ${tenB}", cả hai dưới 2 giây`, async () => {
    await B.doi(`document.querySelector('[data-action="claim-handler"]') !== null`, 'nút "Nhận phụ trách" hiện ở B');
    const t0 = Date.now();
    await B.ev(`document.querySelector('[data-action="claim-handler"]').click(); true`);
    const cau = `Đơn ${Y.orderCode} vừa có người nhận`;
    const [tToast, tSlot] = await Promise.all([
      A.doi(`[...document.querySelectorAll('.toast-vung a.toast')].some((a) => a.textContent === ${JSON.stringify(cau)})`, "thông báo nổi 'vừa có người nhận' ở A", 6000),
      A.doi(`(${slotSel(Y.id)} ?? '').includes(${JSON.stringify(`Phụ trách: ${tenB}`)})`, `dòng Y đổi sang "Phụ trách: ${tenB}"`, 6000),
    ]);
    const msToast = tToast - t0;
    const msSlot = tSlot - t0;
    assert.ok(msToast < 2000, `thông báo nổi sau ${msToast} ms (≥ 2000)`);
    assert.ok(msSlot < 2000, `danh sách đổi người phụ trách sau ${msSlot} ms (≥ 2000)`);
    const tb = await A.ev(`(() => { const v = document.querySelector('.toast-vung'); const a = [...v.querySelectorAll('a.toast')].find((x) => x.textContent === ${JSON.stringify(cau)}); return { live: v.getAttribute('aria-live'), href: a.getAttribute('href') }; })()`);
    assert.equal(tb.live, "polite");
    assert.equal(tb.href, `/order?id=${Y.id}`);
    // ảnh: xổ dòng Y ra để thấy chữ "Phụ trách" đã đổi (danh sách làm mới dựng lại thẻ nên phải xổ SAU khi làm mới)
    await A.ev(`document.querySelector('#list a[href="/order?id=${Y.id}"]').closest('.order-card').querySelector('.order-card-toggle').click(); true`);
    await A.doi(`[...document.querySelectorAll('.toast-vung a.toast')].some((a) => a.textContent === ${JSON.stringify(cau)})`, "thông báo còn hiện lúc chụp", 3000);
    await A.chup(`bang-tin-c-thong-bao-co-nguoi-nhan-${tag}.png`);
    return `thông báo "${cau}" sau ${msToast} ms, dòng Y "Phụ trách: ${tenB}" sau ${msSlot} ms, ảnh bang-tin-c-thong-bao-co-nguoi-nhan-${tag}.png`;
  });
  await step(`[${tag}] (c') B KHÔNG thấy thông báo nổi cho chính việc mình vừa làm (dấu "tab này vừa làm"), dù tin nhan về Y vẫn tới B`, async () => {
    await B.doi(`window.__dot.some((e) => e.orderId === ${JSON.stringify(Y.id)} && e.thayDoi === 'nhan')`, "tin nhan về Y tới B", 5000);
    await sleep(1500); // qua hạn hoãn 500 ms
    assert.deepEqual(await B.ev("window.__toasts"), [], "B thấy thông báo nổi cho việc chính mình làm");
    assert.equal(await B.ev("document.querySelectorAll('.toast-vung a.toast').length"), 0);
    await B.chup(`bang-tin-c-nguoi-nhan-khong-thay-thong-bao-${tag}.png`);
    return `tin nhan tới B nhưng 0 thông báo; ảnh bang-tin-c-nguoi-nhan-khong-thay-thong-bao-${tag}.png`;
  });

  // ---------------------------------------------------------------- (e) axe: so bản đo NỀN (trước khi vùng mới hiện) với bản đo khi có thông báo / dải
  // Mỗi nút vi phạm kèm cờ `trong` = nằm TRONG vùng thông báo nổi (.toast-vung) hoặc dải (#error) — đo bằng DOM (closest), không đoán qua chữ của bộ chọn axe trả về.
  const axeChay = async (p, ngucCanh) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    return p.ev(`axe.run(${ngucCanh ? JSON.stringify(ngucCanh) : "document"}).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.map((n) => { const t = n.target.join(' '); let el = null; try { el = document.querySelector(t); } catch { /* bộ chọn lồng iframe: coi như ngoài vùng */ } return { t, trong: !!(el && el.closest('.toast-vung, #error')) }; }) })))`);
  };
  const khoa = (vs) => new Map(vs.flatMap((v) => v.nodes.map((n) => [`${v.id} @ ${n.t}`, n.trong])));
  /** So bản đo lúc có vùng mới (toast/dải) với bản đo nền: vi phạm MỚI nằm trong vùng đó là ✗; vi phạm mới ngoài vùng chỉ ghi chú. */
  const soAxe = (nen, dang) => {
    const kn = khoa(nen);
    const kd = khoa(dang);
    const moi = [...kd.keys()].filter((k) => !kn.has(k));
    const trongVung = moi.filter((k) => kd.get(k));
    return { moi, trongVung, nen: kn.size, dang: kd.size };
  };
  const ghiAxe = (nhan, s, scoped) => {
    console.log(`  · axe ${nhan}: nền ${s.nen} điểm vi phạm sẵn có → khi có vùng mới ${s.dang}; MỚI ${s.moi.length} (trong vùng: ${s.trongVung.length}); chạy riêng trên vùng: ${scoped.length} vi phạm`);
    for (const k of s.moi) console.log(`    · mới: ${k}`);
    for (const v of scoped) console.log(`    · trên vùng: ${v.id} (${v.impact}) ${v.help} ← ${v.nodes.map((n) => n.t).join(" | ")}`);
  };
  await step(`[${tag}] (e0) ĐỐI CHỨNG axe: chèn cố ý một <img> không alt vào vùng .toast-vung → axe PHẢI thấy vi phạm image-alt ở đó và cách so nền bắt nó là "mới trong vùng" (nếu không, các dòng axe xanh bên dưới không có giá trị)`, async () => {
    const nen = await axeChay(A, null);
    await A.ev(`(() => { const i = document.createElement('img'); i.id = 'doi-chung-axe'; i.src = 'data:,'; document.querySelector('.toast-vung').append(i); return true; })()`);
    const dang = await axeChay(A, null);
    const scoped = await axeChay(A, ".toast-vung");
    await A.ev(`document.getElementById('doi-chung-axe').remove(); true`);
    assert.ok(scoped.some((v) => v.id === "image-alt"), `axe không thấy image-alt trên vùng: ${JSON.stringify(scoped)}`);
    assert.ok(soAxe(nen, dang).trongVung.length >= 1, "cách so nền không bắt được vi phạm mới trong vùng");
    return "axe thấy image-alt trong .toast-vung và soAxe báo là vi phạm mới trong vùng; đã gỡ phần tử thử";
  });
  await step(`[${tag}] (c2+e1) B bấm "Xác nhận đơn" Y → A thấy thông báo "đã được xác nhận" + huy hiệu Y đổi; axe: thông báo nổi không thêm vi phạm mới`, async () => {
    const nen = await axeChay(A, null); // nền: trang danh sách của A TRƯỚC khi thông báo hiện
    await B.doi(`[...document.querySelectorAll('#actions button')].some((b) => b.textContent.trim() === 'Xác nhận đơn')`, 'nút "Xác nhận đơn" ở B (B đã là người phụ trách)');
    await B.ev("window.confirm = () => true; true");
    const t0 = Date.now();
    await B.ev(`[...document.querySelectorAll('#actions button')].find((b) => b.textContent.trim() === 'Xác nhận đơn').click(); true`);
    const cau = `Đơn ${Y.orderCode} đã được xác nhận`;
    const t1 = await A.doi(`[...document.querySelectorAll('.toast-vung a.toast')].some((a) => a.textContent === ${JSON.stringify(cau)})`, "thông báo 'đã được xác nhận' ở A", 6000);
    const t2 = await A.doi(`document.querySelector('#list a[href="/order?id=${Y.id}"] .badge')?.textContent === 'Đã xác nhận'`, "huy hiệu Y đổi ở danh sách A", 6000);
    const dang = await axeChay(A, null);
    const scoped = await axeChay(A, ".toast-vung");
    const conToast = await A.ev("document.querySelectorAll('.toast-vung a.toast').length");
    assert.ok(conToast >= 1, "thông báo đã tự ẩn trước khi axe chạy xong — đo không hợp lệ");
    const s = soAxe(nen, dang);
    ghiAxe(`(thông báo nổi, khổ ${tag})`, s, scoped);
    assert.deepEqual(s.trongVung, [], `vi phạm axe MỚI trong vùng thông báo nổi: ${s.trongVung.join("; ")}`);
    assert.deepEqual(scoped, [], `axe chạy riêng trên .toast-vung: ${JSON.stringify(scoped.map((v) => v.id))}`);
    assert.equal(await B.ev("window.__toasts.length"), 0, "B thấy thông báo nổi cho việc chính mình làm (xác nhận)");
    return `thông báo sau ${t1 - t0} ms, huy hiệu đổi sau ${t2 - t0} ms; B 0 thông báo`;
  });

  // ---------------------------------------------------------------- (d1) A đang mở hộp "Xem biên nhận" trên đơn X (nháp) → B xác nhận X → dải "Đơn vừa được cập nhật — Tải lại", hộp KHÔNG bị đóng
  // (Đơn nháp không có bảng sửa chuyến — chỉ đơn ĐÃ xác nhận mới có — nên với cú "B xác nhận đơn" dùng hộp biên nhận, cùng khuôn `.sheet[role=dialog]`; bảng sửa chuyến kiểm ở (d2).)
  await A.dieuHuong(`/order?id=${X.id}`);
  await step(`[${tag}] (f1) mỗi trang một socket: A (/order?id=X)`, () => motSocket(A, "A /order?id=X"));
  await step(`[${tag}] (d1) A mở hộp "Xem biên nhận" trên X (nháp); B xác nhận X → A thấy dải "Đơn vừa được cập nhật — Tải lại", hộp vẫn MỞ; axe: dải không thêm vi phạm mới`, async () => {
    await A.doi(`document.querySelector('[data-action="send-confirmation"]') !== null`, 'nút "Xem biên nhận" ở A');
    await A.ev(`document.querySelector('[data-action="send-confirmation"]').click(); true`);
    await A.doi(`document.querySelector('.sheet[role="dialog"]') !== null`, "hộp biên nhận mở ở A");
    await sleep(1500); // hộp dựng ảnh xong (canvas) trước khi chụp
    const nen = await axeChay(A, null);
    await B.dieuHuong(`/order?id=${X.id}`);
    await B.doi(`[...document.querySelectorAll('#actions button')].some((b) => b.textContent.trim() === 'Xác nhận đơn')`, 'nút "Xác nhận đơn" ở B (B là người lập X)');
    await B.ev("window.confirm = () => true; true");
    const t0 = Date.now();
    await B.ev(`[...document.querySelectorAll('#actions button')].find((b) => b.textContent.trim() === 'Xác nhận đơn').click(); true`);
    const t1 = await A.doi(`!document.getElementById('error').hidden && /Đơn vừa được cập nhật — Tải lại/.test(document.getElementById('error').textContent)`, "dải 'Đơn vừa được cập nhật — Tải lại' ở A", 6000);
    assert.ok(t1 - t0 < 2500, `dải hiện sau ${t1 - t0} ms`);
    assert.equal(await A.ev(`document.querySelector('.sheet[role="dialog"]') !== null`), true, "hộp biên nhận đã bị ĐÓNG khi có tin");
    assert.equal(await A.ev(`!!document.querySelector('#error button')`), true, "dải phải có nút Tải lại");
    // thông báo nổi cho xac_nhan của X cũng phải tới A (A không phải người vừa làm)
    await A.doi(`[...document.querySelectorAll('.toast-vung a.toast')].some((a) => a.textContent === ${JSON.stringify(`Đơn ${X.orderCode} đã được xác nhận`)})`, "thông báo nổi xác nhận X ở A", 4000);
    const dang = await axeChay(A, null);
    const scoped = await axeChay(A, "#error");
    const s = soAxe(nen, dang);
    ghiAxe(`(dải "Tải lại" + thông báo, khổ ${tag})`, s, scoped);
    assert.deepEqual(s.trongVung, [], `vi phạm axe MỚI trong dải/thông báo: ${s.trongVung.join("; ")}`);
    assert.deepEqual(scoped, [], `axe chạy riêng trên #error: ${JSON.stringify(scoped.map((v) => v.id))}`);
    await A.chup(`bang-tin-d-dai-cap-nhat-hop-bien-nhan-${tag}.png`);
    return `dải hiện sau ${t1 - t0} ms, hộp còn mở, ảnh bang-tin-d-dai-cap-nhat-hop-bien-nhan-${tag}.png`;
  });

  // ---------------------------------------------------------------- (d2) A đang gõ trong bảng "Sửa thông tin chuyến" của Y (đã xác nhận) → B đổi chuyến → dải, bảng còn mở, chữ đang gõ còn nguyên
  await A.dieuHuong(`/order?id=${Y.id}`);
  await step(`[${tag}] (f1) mỗi trang một socket: A (/order?id=Y)`, () => motSocket(A, "A /order?id=Y"));
  const DAU = "GHI CHÚ A ĐANG GÕ DỞ 123";
  await step(`[${tag}] (d2) A mở bảng "Sửa thông tin chuyến" Y và gõ dở; B đổi điểm đón của Y → A thấy dải "Tải lại", bảng KHÔNG đóng, chữ đang gõ còn nguyên, KHÔNG thông báo nổi (tin chuyen)`, async () => {
    await A.doi(`document.querySelector('[data-action="edit-trip"]') !== null`, 'nút "Sửa thông tin chuyến" ở A (Y đã xác nhận)');
    await A.ev(`document.querySelector('[data-action="edit-trip"]').click(); true`);
    await A.doi(`document.querySelector('.sheet[role="dialog"] textarea') !== null`, "bảng sửa chuyến mở ở A");
    await A.ev(`(() => { const t = document.querySelector('.sheet[role="dialog"] textarea'); t.value = ${JSON.stringify(DAU)}; t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    assert.equal(await A.ev(`document.querySelector('.sheet[role="dialog"] textarea').value`), DAU);
    const nen = await axeChay(A, null);
    const g = await goiApi(B, "GET", `/api/orders/${Y.id}`);
    assert.equal(g.status, 200, JSON.stringify(g.json));
    const dh = g.json.order;
    const t0 = Date.now();
    const put = await goiApi(B, "PUT", `/api/orders/${Y.id}/trip`, { expectedUpdatedAt: dh.updatedAt, services: dh.services.map((s) => ({ id: s.id, departDate: s.departDate, departTime: s.departTime, pickupTime: s.pickupTime, pickupPlace: "Điểm đón do B đổi", checkinDate: s.checkinDate ?? "", checkinTime: s.checkinTime ?? "", checkinPlace: s.checkinPlace ?? "", note: s.note ?? "" })) });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    const t1 = await A.doi(`!document.getElementById('error').hidden && /Đơn vừa được cập nhật — Tải lại/.test(document.getElementById('error').textContent)`, "dải 'Tải lại' ở A khi bảng sửa chuyến đang mở", 6000);
    assert.ok(t1 - t0 < 2500, `dải hiện sau ${t1 - t0} ms`);
    assert.equal(await A.ev(`document.querySelector('.sheet[role="dialog"]') !== null`), true, "bảng sửa chuyến đã bị ĐÓNG khi có tin");
    assert.equal(await A.ev(`document.querySelector('.sheet[role="dialog"] textarea').value`), DAU, "chữ đang gõ đã MẤT");
    await sleep(800);
    assert.deepEqual(await A.ev("window.__toasts"), [], "tin chuyen không được hiện thông báo nổi");
    const dang = await axeChay(A, null);
    const scoped = await axeChay(A, "#error");
    const s = soAxe(nen, dang);
    ghiAxe(`(dải "Tải lại" trên bảng sửa chuyến, khổ ${tag})`, s, scoped);
    assert.deepEqual(s.trongVung, [], `vi phạm axe MỚI trong dải: ${s.trongVung.join("; ")}`);
    assert.deepEqual(scoped, [], `axe chạy riêng trên #error: ${JSON.stringify(scoped.map((v) => v.id))}`);
    await A.ev(`document.querySelector('.sheet[role="dialog"] textarea').scrollIntoView({ block: 'center' }); true`); // để ảnh thấy chữ đang gõ còn nguyên
    await sleep(200);
    await A.chup(`bang-tin-d-dai-cap-nhat-bang-sua-chuyen-${tag}.png`);
    return `dải hiện sau ${t1 - t0} ms, bảng còn mở, chữ "${DAU}" còn nguyên, 0 thông báo, ảnh bang-tin-d-dai-cap-nhat-bang-sua-chuyen-${tag}.png`;
  });
  await step(`[${tag}] (d3) đóng bảng, bấm "Tải lại" ở dải → dải mất, thấy điểm đón mới do B đổi (không phải tải trang)`, async () => {
    await A.ev(`document.querySelector('.sheet[role="dialog"] .sheet-close').click(); true`);
    await A.doi(`document.querySelector('.sheet[role="dialog"]') === null`, "bảng đóng");
    assert.equal(await A.ev("!document.getElementById('error').hidden"), true, "dải phải còn hiện sau khi đóng bảng");
    await sleep(300);
    await A.chup(`bang-tin-d-dai-hien-sau-khi-dong-bang-${tag}.png`); // dải nằm SAU bảng lúc bảng mở (bị che); ảnh này chụp ngay sau khi đóng bảng, trước khi bấm Tải lại
    await A.ev(`document.querySelector('#error button').click(); true`);
    await A.doi(`document.getElementById('error').hidden && /Điểm đón do B đổi/.test(document.getElementById('order').textContent)`, "dải mất + điểm đón mới hiện", 6000);
  });

  // ---------------------------------------------------------------- (f2) cuối kịch bản: mỗi trang vẫn đúng một socket (không nối lại thừa), console sạch, không lỗi CSP
  await step(`[${tag}] (f2) cuối kịch bản: A và B vẫn đúng MỘT socket ở trang hiện tại (không nối lại thừa) và không phát can-tai-lai`, async () => {
    for (const p of [A, B]) {
      assert.equal(await p.ev("window.__ws.length"), 1, `${ten(p)}: số socket ở trang cuối`);
      assert.equal(await p.ev("window.__ws[0].s.readyState"), 1, `${ten(p)}: socket còn mở`);
      assert.equal(await p.ev("window.__ctl"), 0, `${ten(p)}: can-tai-lai không được phát khi không mất kết nối`);
    }
  });
  await step(`[${tag}] (f3) console không lỗi, không vi phạm CSP (cả A và B, mọi trang đã mở)`, async () => {
    for (const p of [A, B]) {
      assert.deepEqual(p.consoleErrors, [], `${ten(p)}: lỗi console`);
      assert.deepEqual(p.logEntries.filter((e) => /Content Security Policy|CSP/i.test(e.text)), [], `${ten(p)}: lỗi CSP`);
      assert.deepEqual(p.logEntries.filter((e) => /bang-tin/.test(`${e.url} ${e.text}`) && e.level === "error"), [], `${ten(p)}: lỗi mạng ở /api/bang-tin`);
    }
  });
  A.close();
  B.close();
  await chrome.browserSend("Target.disposeBrowserContext", { browserContextId: ctxA });
  await chrome.browserSend("Target.disposeBrowserContext", { browserContextId: ctxB });
}

const env = await startEnv();
let chrome = null;
try {
  chrome = await moChrome();
  // KHO=390 hoặc KHO=1040 chỉ chạy một khổ (dùng khi thử đột biến cho nhanh); bản chính thức chạy cả hai.
  if (process.env.KHO !== "1040") await chayMotKho(env, chrome, { width: 390, height: 844, mobile: true }, "390");
  if (process.env.KHO !== "390") await chayMotKho(env, chrome, { width: 1040, height: 800, mobile: false }, "1040");
} catch (e) {
  hong("kịch bản dừng giữa chừng (lỗi hạ tầng)", e);
} finally {
  await chrome?.dong();
  await env.stop();
}
console.log(`\nTổng: ${nDat} ✓, ${nHong} ✗ — ảnh ở ${ANH_DIR}`);
if (nHong > 0) process.exit(1);
console.log("BẢNG TIN CHROME HAI TÀI KHOẢN OK");
