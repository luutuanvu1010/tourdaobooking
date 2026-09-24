// Đo tốc độ từng trang của tourdao-sales bằng Chrome headless + CDP trên wrangler dev CỤC BỘ (D1 tạm của startEnv). KHÔNG đụng production.
// Kiểm toán điểm khuất 2026-09-24, trục T7. Người viết: kiểm toán viên (a) T1+T7.
//
// CÁCH CHẠY (cwd PHẢI là gốc repo vì a2-cdp.mjs lấy ROOT = process.cwd(); giao diện phải build sẵn: public/js + public/sw.js):
//   cd <gốc repo hoặc bản sao>
//   node /đường/dẫn/do-toc-do.mjs [--out ket-qua.json] [--no-throttle] [--only home,orders] [--orders 60] [--rounds 1]
// Mặc định: viewport 375×812 mobile; mạng "Fast 3G" giả lập (latency 562,5 ms, xuống 180 000 B/s, lên 84 375 B/s); CPU chậm 4 lần;
// mỗi trang đo 2 lần: LẠNH (xoá service worker + Cache Storage + HTTP cache) rồi ẤM (service worker đã cài, cache đã nạp).
// Nếu cwd là bản sao có bọc đếm D1 (src/index.ts in dòng "D1COUNT {...}" mỗi request) thì kết quả có thêm số lượt D1 từng request API.
// Chạy ở gốc repo thật (không bọc) thì phần D1 để trống, các số khác vẫn đủ.
//
// Số TẤT ĐỊNH (không phụ thuộc tải máy): số request API/tĩnh, byte, độ sâu chuỗi API nối đuôi, request ra mạng khi mở ấm, số nút DOM, CLS + nguồn, số lượt D1.
// Số THỜI GIAN (FCP, lúc nội dung chính hiện, long task, TBT) CHỈ đáng tin khi máy rảnh — kịch bản tự ghi `uptime` vào kết quả.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const A2 = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
const { ACCOUNTS, startEnv, sleep, vnDate } = await import(pathToFileURL(A2).href);

const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(name); return i === -1 ? def : argv[i + 1]; };
const OUT = arg("--out", "do-toc-do-ket-qua.json");
const THROTTLE = !argv.includes("--no-throttle");
const ONLY = arg("--only", null)?.split(",");
const N_ORDERS = Number(arg("--orders", "60"));
const ROUNDS = Number(arg("--rounds", "1"));
const NET = { offline: false, latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 };
const uptime = () => { try { return execSync("uptime").toString().trim(); } catch { return "?"; } };

const env = await startEnv();
const result = { at: new Date().toISOString(), cwd: process.cwd(), throttle: THROTTLE ? { ...NET, cpu: 4 } : null, uptimeStart: uptime(), seed: {}, pages: [], api: [] };
try {
  // ---------- phiên API (dựng dữ liệu, KHÔNG phải phép đo) ----------
  const cookies = new Map();
  const cookieOf = async (acc) => { if (!cookies.has(acc.phone)) cookies.set(acc.phone, await env.login(acc)); return cookies.get(acc.phone); };
  const call = async (acc, method, path, body) => {
    const c = await cookieOf(acc);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const pax = (adult, child = 0) => ({ adult, child, senior: 0, infant: 0 });
  const base = { customerName: "Khách Đo Tốc Độ", customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "" };
  const ids = [];
  for (let i = 0; i < N_ORDERS; i++) {
    const today = i % 6 === 0;
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      ...base, customerName: `Khách số ${i}`, depositAmount: i % 3 === 0 ? 500000 : 0, depositMethod: i % 3 === 0 ? "cash" : null,
      services: [
        { kind: "catalog", catalogCode: "TD101", pax: pax(2, 1), unitPrices: { adult: 1350000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departDate: today ? vnDate(0) : vnDate(3 + (i % 20)), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá" },
        { kind: "manual", name: "Xe đưa đón", pax: pax(3), items: [{ description: "Xe 7 chỗ", detail: "", quantity: 1, unitPrice: 800000 }], ...NO_TRIP, departDate: vnDate(3) },
      ],
    });
    if (r.status !== 201) throw new Error(`tạo đơn ${i}: ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
    ids.push(r.json.order.id);
    if (i % 3 !== 2) { const s = await call(ACCOUNTS.salesA, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" }); if (s.status !== 200) throw new Error(`xác nhận ${i}: ${s.status} ${JSON.stringify(s.json).slice(0, 200)}`); }
  }
  const draftId = ids.find((_, i) => i % 3 === 2);
  const confirmedId = ids[0];
  // Tài khoản Hướng dẫn viên (FIELD) — tạo như quản trị viên thật làm (API quản trị), rồi giao phụ trách vài đơn.
  const fieldRes = await call(ACCOUNTS.admin, "POST", "/api/staff", { fullName: "Hướng Dẫn Đo", phone: "0900000299", permissions: ["FIELD"] });
  const field = fieldRes.status === 201 || fieldRes.status === 200 ? { name: "Hướng Dẫn Đo", phone: "0900000299", pin: fieldRes.json.pin } : null;
  let assigned = 0;
  if (field) for (const id of ids.slice(0, 6)) { const r = await call(ACCOUNTS.admin, "PUT", `/api/orders/${id}/handler`, { staffId: fieldRes.json.staff.id }); if (r.status === 200) assigned++; }
  result.seed = { orders: ids.length, confirmed: ids.filter((_, i) => i % 3 !== 2).length, field: !!field, fieldStatus: fieldRes.status, assignedToField: assigned };

  // ---------- CDP riêng (cần sự kiện mạng có mốc thời gian; openPage của a2-cdp chỉ ghi URL) ----------
  const ps = execSync("ps -A -o pid=,ppid=,command=").toString().split("\n").map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean);
  const chromeLine = ps.find((m) => Number(m[2]) === process.pid && /--remote-debugging-port=(\d+)/.test(m[3]));
  if (!chromeLine) throw new Error("không tìm thấy Chrome của startEnv");
  const cdpPort = Number(chromeLine[3].match(/--remote-debugging-port=(\d+)/)[1]);

  async function openTab() {
    const t = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r));
    let id = 0; const pending = new Map(); const events = [];
    ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); });
    const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
    return { send, ev, events, close: async () => { ws.close(); await fetch(`http://127.0.0.1:${cdpPort}/json/close/${t.id}`).catch(() => null); } };
  }

  // Bộ thu trong trang: long task, layout shift (kèm nguồn), số lần đổi DOM, lúc "nội dung chính hiện" (READY do từng kịch bản khai).
  const collector = (ready) => `(() => {
    const m = window.__m = { lt: [], cls: 0, shifts: [], mutations: 0, readyAt: null };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; m.cls += e.value; m.shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: (e.sources || []).map((s) => s.node ? (s.node.id ? '#' + s.node.id : (s.node.className && typeof s.node.className === 'string' ? s.node.nodeName + '.' + s.node.className.split(' ')[0] : s.node.nodeName)) : '?').slice(0, 4) }); } }).observe({ type: 'layout-shift', buffered: true }); } catch {}
    new MutationObserver((recs) => { m.mutations += recs.length; }).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
    const iv = setInterval(() => { try { if (m.readyAt === null && (${ready})) { m.readyAt = Math.round(performance.now()); clearInterval(iv); } } catch {} }, 25);
  })();`;

  const apiCount = (n) => `performance.getEntriesByType('resource').filter((e) => e.name.includes('/api/')).length >= ${n}`;
  const S = [
    { key: "login", label: "Đăng nhập", acc: null, path: "/login", ready: `!!document.querySelector('form') && ${apiCount(1)}` },
    { key: "home", label: "Trang chủ (Sales)", acc: ACCOUNTS.salesA, path: "/", ready: `document.getElementById('loading')?.hidden === true && document.getElementById('dash-grid')?.hidden === false` },
    { key: "home-admin", label: "Trang chủ (Admin)", acc: ACCOUNTS.admin, path: "/", ready: `document.getElementById('loading')?.hidden === true && document.getElementById('dash-grid')?.hidden === false` },
    { key: "orders", label: "Danh sách đơn", acc: ACCOUNTS.salesA, path: "/orders", ready: `document.querySelectorAll('#list > *').length > 0` },
    { key: "order", label: "Một đơn", acc: ACCOUNTS.salesA, path: `/order?id=${confirmedId}`, ready: `!!document.querySelector('#order .svc-view')` },
    { key: "order-form-new", label: "Form lập đơn", acc: ACCOUNTS.salesA, path: "/order-form", ready: `${apiCount(2)} && !!document.querySelector('#catalog-slot *')` },
    { key: "order-form-edit", label: "Form sửa đơn nháp", acc: ACCOUNTS.salesA, path: `/order-form?id=${draftId}`, ready: `document.querySelectorAll('#services > *').length > 0` },
    { key: "account-sales", label: "Tôi (Sales)", acc: ACCOUNTS.salesA, path: "/account", ready: `(document.getElementById('me')?.textContent || '').trim().length > 0` },
    ...(field ? [{ key: "account-field", label: "Tôi/Việc của tôi (HDV)", acc: field, path: "/account", ready: `document.getElementById('myjobs')?.hidden === false` }] : []),
    { key: "staff", label: "Nhân viên", acc: ACCOUNTS.admin, path: "/staff", ready: `document.querySelectorAll('#list-cards > *, #list tbody tr').length > 0` },
    { key: "catalog", label: "Danh mục", acc: ACCOUNTS.admin, path: "/catalog", ready: apiCount(2) },
    { key: "parties", label: "Hồ sơ", acc: ACCOUNTS.admin, path: "/parties", ready: apiCount(4) },
    { key: "audit", label: "Nhật ký", acc: ACCOUNTS.admin, path: "/audit", ready: apiCount(2) },
    { key: "feedback", label: "Góp ý", acc: ACCOUNTS.salesA, path: "/feedback", ready: apiCount(2) },
    { key: "help", label: "Trợ giúp", acc: ACCOUNTS.salesA, path: "/help", ready: apiCount(1) },
    { key: "locations", label: "Địa điểm", acc: ACCOUNTS.admin, path: "/locations", ready: apiCount(2) },
    { key: "home-admin-desktop", label: "Trang chủ Admin (máy tính 1280×800, có thanh bên + huy hiệu)", acc: ACCOUNTS.admin, path: "/", desktop: true, ready: `document.getElementById('loading')?.hidden === true && document.getElementById('dash-grid')?.hidden === false` },
    { key: "orders-admin-desktop", label: "Đơn hàng Admin (máy tính 1280×800)", acc: ACCOUNTS.admin, path: "/orders", desktop: true, ready: `document.querySelectorAll('#list > *').length > 0` },
  ].filter((s) => !ONLY || ONLY.includes(s.key));

  const d1Lines = () => env.logs.join("").split("\n").filter((l) => l.includes("D1COUNT ")).map((l) => { try { return JSON.parse(l.slice(l.indexOf("D1COUNT ") + 8)); } catch { return null; } }).filter(Boolean);
  const reqLogLines = () => env.logs.join("").split("\n").filter((l) => /\b(GET|POST|PUT|PATCH|DELETE) \/\S* \d{3}/.test(l));

  async function measure(tab, sc, phase) {
    const logMark = env.logs.join("").length;
    const d1Mark = d1Lines().length;
    const reqMark = reqLogLines().length;
    tab.events.length = 0;
    const { identifier } = (await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: collector(sc.ready) })).result;
    const t0 = Date.now();
    await tab.send("Page.navigate", { url: env.base + sc.path });
    // chờ nội dung chính (tối đa 90 s khi bóp mạng), rồi chờ mạng lặng 1,5 s để bắt request đuôi (huy hiệu, người phụ trách…)
    let readyAt = null;
    for (;;) {
      readyAt = await tab.ev("window.__m && window.__m.readyAt").catch(() => null);
      if (readyAt) break;
      if (Date.now() - t0 > 90000) break;
      await sleep(200);
    }
    let lastCount = -1, quietSince = Date.now();
    while (Date.now() - quietSince < 1500 && Date.now() - t0 < 120000) {
      const n = tab.events.filter((e) => e.method === "Network.loadingFinished" || e.method === "Network.loadingFailed").length;
      if (n !== lastCount) { lastCount = n; quietSince = Date.now(); }
      await sleep(250);
    }
    await tab.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
    const page = await tab.ev(`(() => { const nav = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; const m = window.__m || {};
      const tbt = (m.lt || []).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
      return { fcp: fcp ? Math.round(fcp.startTime) : null, dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null, load: nav ? Math.round(nav.loadEventEnd) : null, readyAt: m.readyAt ?? null,
        longTasks: (m.lt || []).length, longTaskMs: (m.lt || []).reduce((a, [, d]) => a + d, 0), tbt, cls: +(m.cls || 0).toFixed(4), shifts: (m.shifts || []).slice(0, 6), mutations: m.mutations,
        domNodes: document.getElementsByTagName('*').length, swControlled: !!navigator.serviceWorker?.controller }; })()`);
    // mạng: ghép sự kiện theo requestId
    const byId = new Map();
    for (const e of tab.events) {
      const p = e.params ?? {};
      if (e.method === "Network.requestWillBeSent") byId.set(p.requestId, { url: p.request.url, method: p.request.method, start: p.timestamp, type: p.type, initiator: p.initiator?.type, bytesDecoded: 0 });
      const r = byId.get(p.requestId);
      if (!r) continue;
      if (e.method === "Network.responseReceived") { r.status = p.response.status; r.fromSW = !!p.response.fromServiceWorker; r.fromDisk = !!p.response.fromDiskCache; r.mime = p.response.mimeType; r.encoding = p.response.headers?.["content-encoding"] ?? p.response.headers?.["Content-Encoding"] ?? null; }
      if (e.method === "Network.dataReceived") r.bytesDecoded += p.dataLength;
      if (e.method === "Network.loadingFinished") { r.end = p.timestamp; r.bytesTransfer = p.encodedDataLength; }
      if (e.method === "Network.loadingFailed") { r.end = p.timestamp; r.failed = p.errorText; }
    }
    const reqs = [...byId.values()].filter((r) => r.url.startsWith(env.base));
    const t00 = Math.min(...reqs.map((r) => r.start));
    const rel = (x) => (x === undefined ? null : Math.round((x - t00) * 1000));
    const api = reqs.filter((r) => new URL(r.url).pathname.startsWith("/api/"));
    const stat = reqs.filter((r) => !new URL(r.url).pathname.startsWith("/api/"));
    // độ sâu chuỗi nối đuôi: request API j "đứng sau" i nếu j bắt đầu SAU khi i xong. Tính chuỗi dài nhất (kể cả HTML/JS của trang: bắt đầu từ tài liệu).
    // CHỈ xét request API (tệp tĩnh tải song song/ngầm nên xếp theo giờ dễ ra chuỗi giả). Độ sâu 2 = "me xong mới gọi dữ liệu trang".
    const nodes = api.filter((r) => r.end !== undefined).map((r) => ({ ...r, path: new URL(r.url).pathname + (new URL(r.url).search ? "?…" : "") })).sort((a, b) => a.start - b.start);
    const depth = new Map();
    for (const n of nodes) { let best = 0, via = null; for (const m of nodes) if (m !== n && m.end <= n.start && (depth.get(m)?.d ?? 1) > best) { best = depth.get(m)?.d ?? 1; via = m; } depth.set(n, { d: best + 1, via }); }
    let deepest = null; for (const n of nodes.filter((x) => x.path.startsWith("/api/"))) if (!deepest || depth.get(n).d > depth.get(deepest).d) deepest = n;
    const chain = []; for (let n = deepest; n; n = depth.get(n)?.via) chain.unshift(n.path);
    const sum = (a, k) => a.reduce((s, r) => s + (r[k] ?? 0), 0);
    // lượt D1 phía máy chủ ứng với các request API của lần tải này (chỉ khi cwd là bản sao có bọc đếm)
    const d1 = d1Lines().slice(d1Mark).map((x) => ({ req: `${x.m} ${x.p}`, status: x.s, d1RoundTrips: x.rt, d1Stmts: x.stmts, d1SerialRounds: x.serial, bytes: x.bytes, ms: x.ms }));
    const serverReqs = reqLogLines().slice(reqMark).length;
    return {
      phase, ...page, wallMs: Date.now() - t0,
      requests: { total: reqs.length, api: api.length, static: stat.length, staticFromSW: stat.filter((r) => r.fromSW).length, staticFromDisk: stat.filter((r) => r.fromDisk).length, serverSawRequests: serverReqs || null },
      bytes: { transfer: sum(reqs, "bytesTransfer"), decoded: sum(reqs, "bytesDecoded"), jsDecoded: sum(stat.filter((r) => r.type === "Script"), "bytesDecoded"), cssDecoded: sum(stat.filter((r) => r.type === "Stylesheet"), "bytesDecoded"), fontDecoded: sum(stat.filter((r) => r.type === "Font"), "bytesDecoded"), htmlDecoded: sum(stat.filter((r) => r.type === "Document"), "bytesDecoded"), apiDecoded: sum(api, "bytesDecoded") },
      apiChainDepth: deepest ? depth.get(deepest).d : 0, apiChain: chain, firstApiStartMs: api.length ? rel(Math.min(...api.map((r) => r.start))) : null, docEndMs: rel(reqs.find((r) => r.type === "Document")?.end),
      apiTimeline: api.map((r) => ({ path: new URL(r.url).pathname + (new URL(r.url).search ? "?…" : ""), start: rel(r.start), end: rel(r.end), status: r.status ?? null })),
      d1,
    };
  }

  for (let round = 0; round < ROUNDS; round++) for (const sc of S) {
    const tab = await openTab();
    try {
      await tab.send("Network.enable"); await tab.send("Page.enable"); await tab.send("Runtime.enable");
      const vp = sc.desktop ? { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false } : { width: 375, height: 812, deviceScaleFactor: 2, mobile: true };
      await tab.send("Emulation.setDeviceMetricsOverride", vp);
      if (!sc.desktop) await tab.send("Emulation.setTouchEmulationEnabled", { enabled: true });
      await tab.send("Emulation.setFocusEmulationEnabled", { enabled: true });
      // LẠNH: xoá service worker + Cache Storage + HTTP cache + cookie
      await tab.send("Network.clearBrowserCache"); await tab.send("Network.clearBrowserCookies");
      await tab.send("Storage.clearDataForOrigin", { origin: env.base, storageTypes: "service_workers,cache_storage" });
      if (sc.acc) { const c = await cookieOf(sc.acc); await tab.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true }); }
      if (THROTTLE) { await tab.send("Network.emulateNetworkConditions", NET); await tab.send("Emulation.setCPUThrottlingRate", { rate: 4 }); }
      const cold = await measure(tab, sc, "lạnh");
      // chờ service worker cài xong + nạp sẵn (PRECACHE) để lần sau là "ấm"
      const swEnd = Date.now() + 60000;
      let cacheEntries = 0;
      while (Date.now() < swEnd) {
        cacheEntries = await tab.ev(`(async () => { if (!navigator.serviceWorker?.controller) { await navigator.serviceWorker?.ready; } const ks = await caches.keys(); let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; return n; })()`).catch(() => 0);
        if (cacheEntries >= 20) break;
        await sleep(500);
      }
      await sleep(800);
      const warm = await measure(tab, sc, "ấm");
      warm.swCacheEntriesBefore = cacheEntries;
      result.pages.push({ key: sc.key, label: sc.label, path: sc.path.replace(/id=[0-9a-f-]+/, "id=…"), viewport: sc.desktop ? "1280×800" : "375×812", round, cold, warm });
      console.log(`✓ ${sc.key}: lạnh ready=${cold.readyAt}ms api=${cold.requests.api} tĩnh=${cold.requests.static} chuỗiAPI=${cold.apiChainDepth} | ấm ready=${warm.readyAt}ms tĩnh-từ-SW=${warm.requests.staticFromSW}/${warm.requests.static} serverSaw=${warm.requests.serverSawRequests}`);
    } finally { await tab.close(); }
  }
  result.uptimeEnd = uptime();
  result.note = "Thời gian (ms) đo khi máy BẬN nếu uptime cho tải > 2 — chỉ dùng số tất định. bytes.* đo trên wrangler dev cục bộ (không nén br/gzip như Cloudflare thật).";
} finally {
  writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log(`Đã ghi ${OUT}`);
  await env.stop();
}
