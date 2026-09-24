// Đo bằng số (Hiến pháp §6.2 của tourdaovn): accessibility (axe-core) và thời gian mở màn hình trên 4G giả lập (RTT 150 ms, 1,6 Mbps, CPU chậm 4 lần; trung vị 5 lần).
// BẰNG CHỨNG (docs/evidence/2026-09-19-pwa), KHÔNG phải một phần của npm scripts và KHÔNG thêm dependency vào package.json (CLAUDE.md §8 của tourdaovn).
// Chạy: cài tạm ngoài repo `npm --prefix <thư-mục-tạm> install puppeteer-core axe-core`, bật `npx wrangler dev --port 8787` với D1 local có hai tài khoản thử
//   (xem kiem-tra-giao-dien.mjs), rồi `node do-luong.mjs > ket-qua-do.json` từ thư mục tạm. AXE_ONLY=1 chỉ chạy phần axe.
// Ba tình huống: A = lần đầu nguội (chưa cache, chưa service worker); B = mở lại KHÔNG service worker; C = mở lại CÓ service worker.
// Số đo: brand = khung (thanh đầu trang) hiện; fcp = first-contentful-paint; data = dòng đơn đầu tiên hiện (dữ liệu sẵn sàng). Đơn vị ms từ lúc bắt đầu điều hướng.
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const BASE = process.env.BASE ?? "http://localhost:8787";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function newPage() {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(MOBILE);
  await page.setUserAgent(UA);
  await page.setBypassCSP(true); // chỉ để nhúng axe; không ảnh hưởng số đo
  return page;
}
async function login(page, phone, pin) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#phone", phone);
  await page.type("#pin", pin);
  await page.click("#submit");
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  // Đợt D Task 4 (ADR-0015): thanh ngang cũ (`.who`, chỉ dựng ở máy tính) đổi thành thanh điều hướng dọc
  // (`#sidebar`, cũng chỉ máy tính) + thanh tab dưới đáy (điện thoại, không đổi). Kịch bản này CHỈ chạy ở khổ
  // điện thoại (MOBILE viewport) — đổi mốc "khung đã tải xong" sang `#tabbar .tab`, luôn có ở khổ này.
  await page.waitForSelector("#tabbar .tab", { timeout: 15000 });
}
const api = (page, path, method = "GET", body) =>
  page.evaluate(async (path, method, body) => {
    const r = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  }, path, method, body);
const order = (name, phone) => ({ customerName: name, customerPhone: phone, customerEmail: "", customerNote: "", items: [{ catalogCode: null, description: "Tour 4 đảo Nha Trang", detail: "Khởi hành 20/09/2026", quantity: 2, unitPrice: 1350000 }], discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "" });

// ---------- 1. axe ----------
async function axe(page, label) {
  await page.evaluate(AXE);
  const res = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } }));
  return { page: label, violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes[0]?.target?.join(" ") })) };
}
const report = { axe: [], perf: {} };
{
  const p = await newPage();
  await p.goto(BASE + "/login", { waitUntil: "networkidle0" });
  report.axe.push(await axe(p, "/login (điện thoại)"));
  await login(p, "0901000002", "736154");
  const a = await api(p, "/api/orders", "POST", order("Trần Văn Bình", "0901234567"));
  await api(p, "/api/orders", "POST", order("Lê Minh Châu", "0912345678"));
  await api(p, "/api/orders", "POST", order("Phạm Quốc Đạt", "0933456789"));
  const id = a.json.order.id;
  for (const [path, label] of [["/orders", "/orders danh sách"], [`/order?id=${id}`, "/order chi tiết"], ["/order-form", "/order-form"], ["/account", "/account (nhân viên)"]]) {
    await p.goto(BASE + path, { waitUntil: "networkidle0" });
    await p.waitForSelector("#tabbar, .form-actions");
    report.axe.push(await axe(p, label + " (điện thoại)"));
  }
  await p.browserContext().close();
  const q = await newPage();
  await login(q, "0901000001", "482913");
  for (const [path, label] of [["/account", "/account (admin)"], ["/catalog", "/catalog"], ["/staff", "/staff"], ["/audit", "/audit"]]) {
    await q.goto(BASE + path, { waitUntil: "networkidle0" });
    await q.waitForSelector("#tabbar");
    report.axe.push(await axe(q, label + " (điện thoại)"));
  }
  await q.browserContext().close();
}

if (process.env.AXE_ONLY) {
  await browser.close();
  console.log(JSON.stringify(report.axe.map((a) => ({ page: a.page, violations: a.violations.map((v) => `${v.id}:${v.impact}`) })), null, 1));
  process.exit(0);
}
// ---------- 2. thời gian mở màn hình ----------
async function throttle(page) {
  const c = await page.createCDPSession();
  await c.send("Network.enable");
  await c.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await c.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  return c;
}
async function measure(page, clearHttpCache = false) {
  const c = await throttle(page);
  if (clearHttpCache) await c.send("Network.clearBrowserCache");
  await page.evaluateOnNewDocument(() => {
    const t = (window.__t = {});
    const mo = new MutationObserver(() => {
      if (!t.brand && document.querySelector("#topbar .brand")) t.brand = performance.now();
      if (!t.row && document.querySelector(".order-row")) t.row = performance.now();
    });
    mo.observe(document, { childList: true, subtree: true });
  });
  await page.goto(BASE + "/orders", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__t?.row, { timeout: 60000 });
  return page.evaluate(() => ({ brand: Math.round(__t.brand), data: Math.round(__t.row), fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? -1) }));
}
async function scenario(name, prepare) {
  const runs = [];
  for (let i = 0; i < 5; i++) runs.push(await prepare());
  report.perf[name] = { brand: median(runs.map((r) => r.brand)), fcp: median(runs.map((r) => r.fcp)), data: median(runs.map((r) => r.data)), runsData: runs.map((r) => r.data) };
}
async function warmContext() {
  const page = await newPage();
  await login(page, "0901000002", "736154");
  await page.goto(BASE + "/orders", { waitUntil: "networkidle0" });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "networkidle0" });
  return page;
}
// A. lần đầu, nguội: cookie đăng nhập có, nhưng chưa có cache, chưa có service worker
await scenario("A_lan_dau_nguoi", async () => {
  const src = await warmContext();
  const cookies = await src.cookies();
  await src.browserContext().close();
  const page = await newPage();
  await page.setCookie(...cookies);
  const r = await measure(page, true);
  await page.browserContext().close();
  return r;
});
// B. mở lại, KHÔNG service worker (chỉ cache HTTP thường của trình duyệt)
await scenario("B_mo_lai_khong_SW", async () => {
  const page = await warmContext();
  await page.evaluate(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); });
  const r = await measure(page, false);
  await page.browserContext().close();
  return r;
});
// C. mở lại, CÓ service worker
await scenario("C_mo_lai_co_SW", async () => {
  const page = await warmContext();
  const r = await measure(page, false);
  await page.browserContext().close();
  return r;
});

await browser.close();
console.log(JSON.stringify(report, null, 1));
