// Kịch bản gỡ lỗi MỘT máy chủ: nạp app, build lại (mã bản dựng mới), rồi ghi trạng thái service worker và tên cache trước/sau.
// Với `/sw.js` là `Cache-Control: no-cache` kịch bản này KHÔNG đạt (wrangler dev giữ ETag cũ, trình duyệt nhận 304 và không thấy bản mới); với `no-store` (public/_headers) nó ĐẠT:
// cache cũ bị xoá và chỉ còn cache mới. BẰNG CHỨNG (docs/evidence/2026-09-19-pwa). Chạy: ROOT=<gốc worktree> node kiem-tra-nang-cap-sw-mot-may-chu.mjs (cần wrangler dev cổng 8787, tài khoản thử như kiem-tra-giao-dien.mjs).
import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";
const BASE = process.env.BASE ?? "http://localhost:8787";
const ROOT = process.env.ROOT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
page.on("console", (m) => console.log("  [console]", m.type(), m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 200)));
await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
await page.type("#phone", "0901000002"); await page.type("#pin", "736154"); await page.click("#submit");
await page.waitForFunction(() => location.pathname === "/"); await page.waitForSelector("#tabbar");
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload({ waitUntil: "networkidle0" });
const state = () => page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  const txt = await (await fetch("/sw.js", { cache: "no-store" })).text();
  return { keys: (await caches.keys()), installing: r.installing?.state ?? null, waiting: r.waiting?.state ?? null, active: r.active?.state ?? null, servedId: (txt.match(/"(\d{14})"/) || [])[1] };
});
console.log("trước:", JSON.stringify(await state()));
execSync("npm run build:web", { cwd: ROOT, stdio: "ignore" });
await sleep(1500);
console.log("sau build:", JSON.stringify(await state()));
for (let i = 0; i < 6; i++) {
  const r = await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); try { await reg.update(); return "update() xong"; } catch (e) { return "update() LỖI: " + e.message; } });
  await sleep(1200);
  console.log(`lần ${i + 1}:`, r, JSON.stringify(await state()));
}
await browser.close();
