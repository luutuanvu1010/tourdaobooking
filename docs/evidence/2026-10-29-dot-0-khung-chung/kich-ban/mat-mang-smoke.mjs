// Kịch bản Chrome — mất mạng (đặc tả đợt 0 mục 6.3, tiêu chí 10.7; ADR-0150 đề xuất). Ba phần:
//   A) bộ đệm hụt trang /xe (xoá mục qua CDP CacheStorage.deleteEntry) + ngoài mạng + mở /xe ⇒ service worker trả trang «Ngoài mạng» có vỏ:
//      `[data-loai="mat-mang-chua-nap"]` + nút «Thử lại», không lỗi script;
//   B) trang /orders đã vẽ, ngoài mạng, làm mới dữ liệu (gõ ô tìm ⇒ api.ts gọi /api/orders) ⇒ `.dai[data-loai="ngoai-mang"]` hiện, danh sách cũ còn nguyên,
//      không khung xương; có mạng lại ⇒ dải tự mất;
//   C) xoá CẢ mục /ngoai-mang khỏi bộ đệm (Task 13 để lại) + ngoài mạng + mở /xe ⇒ rơi về chữ 503 «Không có kết nối mạng.», không lỗi script.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh [OUT=<thư mục>] node docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/mat-mang-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

if (!process.env.AXE_JS) throw new Error("Thiếu biến AXE_JS (axe.min.js ngoài repo).");
const AXE = readFileSync(process.env.AXE_JS, "utf8");
const OUT = process.env.OUT ?? "/tmp/mat-mang-smoke";
mkdirSync(join(OUT, "anh"), { recursive: true });

const loi = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    loi.push(`${id}) ${ten}: ${String(e?.message ?? e).split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${String(e?.stack ?? e).split("\n").slice(0, 12).join("\n    ")}`);
  }
}
const env = await startEnv();
const chup = async (p, ten) => {
  await sleep(500);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", `${ten}.png`), Buffer.from(r.result.data, "base64"));
};
// Ngoài mạng phải phủ CẢ tiến trình service worker: giả lập ở trang không chắc phủ worker (đo 29/10: worker vẫn lấy được /xe thật ở phần C). Nên đặt thêm
// trên chính đích `service_worker` qua cổng gỡ lỗi của Chrome (tìm cổng trong dòng lệnh của tiến trình Chrome con của kịch bản này; a2-cdp không xuất nó).
const DIEU_KIEN = (offline) => ({ offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
let congCdp = null;
async function timCong() {
  if (congCdp) return congCdp;
  const { execFileSync } = await import("node:child_process");
  const dong = execFileSync("ps", ["-axo", "ppid=,args="], { encoding: "utf8" }).split("\n").find((l) => l.trim().startsWith(`${process.pid} `) && l.includes("--remote-debugging-port="));
  assert.ok(dong, "không tìm thấy tiến trình Chrome con");
  congCdp = /--remote-debugging-port=(\d+)/.exec(dong)[1];
  return congCdp;
}
async function mangWorker(offline) {
  const ds = await (await fetch(`http://127.0.0.1:${await timCong()}/json/list`)).json();
  const sw = ds.filter((t) => t.type === "service_worker");
  for (const t of sw) {
    // Giữ kết nối mở (giả lập mất khi phiên gỡ lỗi đóng; phiên mở cũng giữ worker không ngủ).
    if (!phienWorker.has(t.id)) {
      const ws = new WebSocket(t.webSocketDebuggerUrl);
      await new Promise((r) => ws.addEventListener("open", r));
      let id = 0;
      const gui = (method, params = {}) => new Promise((res) => { const i = ++id; const nghe = (ev) => { const m = JSON.parse(ev.data); if (m.id === i) { ws.removeEventListener("message", nghe); res(m); } }; ws.addEventListener("message", nghe); ws.send(JSON.stringify({ id: i, method, params })); });
      await gui("Network.enable");
      phienWorker.set(t.id, { ws, gui });
    }
    const r = await phienWorker.get(t.id).gui("Network.emulateNetworkConditions", DIEU_KIEN(offline));
    assert.ok(!r.error, `giả lập mạng ở service worker: ${JSON.stringify(r.error)}`);
  }
  return sw.length;
}
const phienWorker = new Map();
const mang = async (p, offline) => {
  await p.send("Network.emulateNetworkConditions", DIEU_KIEN(offline));
  await mangWorker(offline);
};
async function xoaBoDem(p, duong) {
  const goc = new URL(env.base).origin;
  const { result } = await p.send("CacheStorage.requestCacheNames", { securityOrigin: goc });
  assert.ok(result?.caches?.length, `không thấy bộ đệm nào của ${goc}: ${JSON.stringify(result)}`);
  for (const c of result.caches) {
    const r = await p.send("CacheStorage.deleteEntry", { cacheId: c.cacheId, request: goc + duong });
    // «not found» = mục đã không còn (vd phần A đã xoá /xe và ngoài mạng thật nên worker không lấy lại được) — dòng kiểm dưới mới là phép thử.
    assert.ok(!r.error || /not found/.test(r.error.message), `xoá ${duong}: ${JSON.stringify(r.error)}`);
  }
  assert.equal(await p.ev(`caches.keys().then(async (ks) => { for (const k of ks) if (await (await caches.open(k)).match(${JSON.stringify(goc + duong)})) return true; return false; })`), false, `${duong} vẫn còn trong bộ đệm`);
}
async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }).then((r) => r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => v.id + ' ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')))`);
  assert.deepEqual(vi, [], `axe nghiêm trọng (${nhan})`);
}

try {
  // Một đơn để danh sách Đơn hàng có nội dung (phần B).
  const c = await env.login(ACCOUNTS.salesA);
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const r = await fetch(`${env.base}/api/orders`, { method: "POST", headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: JSON.stringify({
    customerName: "Khách Mất Mạng", customerPhone: "0903 111 444", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TTB06", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800000 }, ...NO_TRIP }],
  }) });
  assert.equal(r.status, 201);

  const p = await env.as(ACCOUNTS.salesA, "/orders");
  await p.waitFor("!!navigator.serviceWorker.controller", "service worker điều khiển trang", 20000).catch(async () => {
    // Lần mở đầu chưa có bộ điều khiển: chờ ready rồi tải lại để trang đi qua service worker.
    await p.ev("navigator.serviceWorker.ready.then(() => true)");
    await p.send("Page.reload");
    await p.waitFor("!!navigator.serviceWorker.controller", "service worker điều khiển trang (sau tải lại)", 20000);
  });
  await p.ev("navigator.serviceWorker.ready.then(() => true)");
  // Chờ nạp sẵn xong: /ngoai-mang và /xe có trong bộ đệm.
  await p.waitFor(`caches.keys().then(async (ks) => { for (const k of ks) { const c = await caches.open(k); if (await c.match(location.origin + '/ngoai-mang') && await c.match(location.origin + '/xe')) return true; } return false; })`, "nạp sẵn xong", 30000);

  await buoc("A", "bộ đệm hụt /xe + ngoài mạng ⇒ trang «Ngoài mạng» có vỏ, nút Thử lại, không lỗi script", async () => {
    await xoaBoDem(p, "/xe");
    await p.ev("fetch('/app.css').then((r) => r.status)"); // đánh thức service worker để giả lập ngoài mạng phủ được nó (xem mangWorker)
    await mang(p, true);
    assert.ok((await mangWorker(true)) >= 1, "có đích service worker để giả lập ngoài mạng");
    const loiTruoc = p.consoleErrors.length;
    await p.send("Page.navigate", { url: `${env.base}/xe` });
    await p.waitFor("!!document.querySelector('[data-loai=\"mat-mang-chua-nap\"]')", "trạng thái mất mạng chưa nạp", 10000);
    await sleep(800);
    assert.equal(await p.ev("location.pathname"), "/xe");
    // Phải là TRANG «Ngoài mạng» do service worker trả (ADR-0150), không phải trang /xe thật tải về rồi nhánh mất mạng của shell vẽ cùng khối:
    const tai = await p.ev("({ title: document.title, scripts: [...document.scripts].map((s) => s.getAttribute('src')) })");
    assert.deepEqual(tai.scripts, ["/js/ngoai-mang.js"], JSON.stringify(tai));
    assert.match(tai.title, /^Ngoài mạng/);
    assert.equal(await p.ev(`caches.keys().then(async (ks) => { for (const k of ks) if (await (await caches.open(k)).match(location.origin + '/xe')) return true; return false; })`), false, "service worker không lấy được /xe từ mạng (thật sự ngoài mạng)");
    assert.ok((await p.ev("[...document.querySelectorAll('main button, main a')].map((b) => b.textContent.trim())")).includes("Thử lại"));
    // Lượt sửa cuối (I2): thân đã có nút Thử lại ⇒ dải chỉ «Đang ngoài mạng», không nút (không hai nút Thử lại trên một màn).
    await p.waitFor("!!document.querySelector('.dai[data-loai=\"ngoai-mang\"]')", "dải ngoài mạng ở trang Ngoài mạng", 10000);
    assert.equal(await p.ev("document.querySelector('.dai .dai-cau').textContent"), "Đang ngoài mạng");
    assert.equal(await p.ev("document.querySelectorAll('.dai button, .dai a').length"), 0, "dải không có nút");
    assert.equal(await p.ev("[...document.querySelectorAll('button, a')].filter((b) => b.textContent.trim() === 'Thử lại').length"), 1, "đúng một nút Thử lại");
    assert.equal(await p.ev("document.getElementById('topbar')?.children.length > 0"), true, "có vỏ (thanh trên)");
    const loiScript = p.consoleErrors.slice(loiTruoc).filter((e) => !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED/.test(e));
    assert.deepEqual(loiScript, [], "không lỗi script");
    await axeKiem(p, "/ngoai-mang 390");
    await chup(p, "mm-a-ngoai-mang-390");
  });

  await buoc("B", "/orders đã vẽ + ngoài mạng + làm mới ⇒ dải ngoài mạng, danh sách còn; có mạng lại ⇒ dải mất", async () => {
    await mang(p, false);
    await p.send("Page.navigate", { url: `${env.base}/orders` });
    await p.waitFor("document.getElementById('loading').hidden && document.querySelectorAll('#list > *').length > 0", "danh sách đơn", 15000);
    const soDong = await p.ev("document.querySelectorAll('#list > *').length");
    await mang(p, true);
    await p.ev("document.getElementById('q').focus(); true");
    for (const k of "kh") {
      await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, text: k });
      await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: k });
    }
    await p.waitFor("!!document.querySelector('.dai[data-loai=\"ngoai-mang\"]')", "dải ngoài mạng", 10000);
    await sleep(600);
    assert.equal(await p.ev("document.querySelectorAll('#list > *').length"), soDong, "danh sách cũ còn nguyên");
    assert.equal(await p.ev("document.querySelectorAll('main .xuong, main .trang-thai-xuong').length"), 0, "không khung xương");
    assert.equal(await p.ev("getComputedStyle(document.getElementById('tabbar')).display !== 'none'"), true, "thanh tab còn");
    await chup(p, "mm-b-dai-ngoai-mang-390");
    await mang(p, false);
    await p.waitFor("!document.querySelector('.dai[data-loai=\"ngoai-mang\"]')", "dải tự mất khi có mạng", 8000);
  });

  await buoc("C", "xoá cả /ngoai-mang + /xe, ngoài mạng, mở /xe ⇒ chữ 503 «Không có kết nối mạng.», không lỗi script", async () => {
    await xoaBoDem(p, "/xe");
    await xoaBoDem(p, "/ngoai-mang");
    // Đánh thức service worker (để đích `service_worker` có trong /json/list) rồi mới giả lập ngoài mạng cho cả trang lẫn worker.
    await mang(p, false);
    await p.ev("fetch('/app.css').then((r) => r.status)");
    await mang(p, true);
    const truoc = p.consoleErrors.length;
    await p.send("Page.navigate", { url: `${env.base}/xe` });
    await p.waitFor("document.readyState === 'complete' && /Không có kết nối mạng\\./.test(document.body?.innerText ?? '')", "chữ 503", 10000).catch(async (e) => {
      await chup(p, "mm-c-loi");
      console.log("    · đang ở:", await p.ev("location.href + ' | ' + document.title + ' | ' + (document.body?.innerText ?? '').slice(0, 200)").catch((x) => String(x)));
      throw e;
    });
    assert.equal(await p.ev("document.querySelectorAll('script').length"), 0, "trang chữ trần, không chạy script");
    assert.deepEqual(p.consoleErrors.slice(truoc).filter((e) => !/Failed to load resource|503/.test(e)), [], "không lỗi script");
    await chup(p, "mm-c-503-chu-390");
    await mang(p, false);
  });
  p.close();
} finally {
  for (const { ws } of phienWorker.values()) ws.close();
  await env.stop();
}
if (loi.length) {
  console.log(`\n${loi.length} bước đỏ:\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nMAT MANG OK (có axe)");
