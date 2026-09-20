// Kiểm tra sau deploy trên booking.tourdao.vn: service worker có cài, cache có đúng khung, không có /api. Chỉ mở trang đăng nhập công khai.
// Cách chạy: cần puppeteer-core cài TẠM ngoài repo (CLAUDE.md §8 của tourdaovn), rồi chép tệp này cạnh node_modules đó và `node kiem-tra-san-xuat.mjs`.
import puppeteer from "puppeteer-core";
const B = "https://booking.tourdao.vn";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const page = await (await browser.createBrowserContext()).newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
page.on("console", (m) => { if (m.type() === "error" && !/401|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 160)); });
await page.goto(B + "/login", { waitUntil: "networkidle0" });
await page.evaluate(() => navigator.serviceWorker.ready);
await new Promise((r) => setTimeout(r, 2500)); // chờ nạp sẵn xong
await page.reload({ waitUntil: "networkidle0" });
const r = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  const urls = [];
  for (const k of keys) for (const req of await (await caches.open(k)).keys()) urls.push(new URL(req.url).pathname);
  return { registered: !!reg, active: reg?.active?.state, controlled: !!navigator.serviceWorker.controller, scope: reg?.scope, keys, count: urls.length, apiEntries: urls.filter((u) => /api/i.test(u)), sample: urls.slice(0, 4), title: document.title, logo: !!document.querySelector(".login-logo") };
});
await browser.close();
console.log(JSON.stringify({ ...r, loi: errors }, null, 1));
