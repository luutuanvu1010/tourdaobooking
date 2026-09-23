// Chứng minh cơ chế tự làm mới cache qua hai "lần deploy" giả lập: mỗi lần build (mã bản dựng đổi) → service worker mới tự xoá cache cũ, khung chạy bản mới.
// Vì sao không chỉ build lại rồi update() trên MỘT máy chủ: `wrangler dev` băm file một lần lúc khởi động nên phục vụ nội dung mới nhưng giữ ETag cũ → trình duyệt nhận 304
// và không thấy bản mới (đo được). Workers Assets thật băm lại theo từng deploy, nên ở đây mỗi "deploy" là một lần khởi động máy chủ (đúng mô hình thật).
// BẰNG CHỨNG (docs/evidence/2026-09-19-pwa). Chạy: ROOT=<gốc worktree> node kiem-tra-nang-cap-sw.mjs (cần puppeteer-core, D1 local có tài khoản thử như kiem-tra-giao-dien.mjs, .dev.vars).
import puppeteer from "puppeteer-core";
import { execSync, spawn } from "node:child_process";

const PORT = Number(process.env.PORT ?? 8788);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = process.env.ROOT;
if (!ROOT) throw new Error("Thiếu ROOT (gốc worktree, nơi chạy npm run build:web và wrangler dev)");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const build = () => execSync("npm run build:web", { cwd: ROOT, stdio: "ignore" });
async function startServer() {
  // PASSKEY_RP_ID/PASSKEY_ORIGIN rỗng = TẮT Face ID (B-22): không ghi đè thì `vars` production của wrangler.jsonc lọt vào, hiện nút Face ID và gửi thêm một POST mỗi lần mở trang.
  const child = spawn("npx", ["wrangler", "dev", "--port", String(PORT), "--ip", "127.0.0.1", "--inspector-port", String(PORT + 1000), "--var", "PASSKEY_RP_ID:", "--var", "PASSKEY_ORIGIN:"], { cwd: ROOT, detached: true, stdio: "ignore", env: { ...process.env, CI: "1" } });
  for (let i = 0; i < 90; i++) {
    const r = await fetch(`${BASE}/api/auth/me`).catch(() => null);
    if (r?.status === 401) return child;
    await sleep(1000);
  }
  throw new Error("wrangler dev không lên được");
}
async function stopServer(child) {
  try { process.kill(-child.pid, "SIGTERM"); } catch {}
  await sleep(3000);
  try { process.kill(-child.pid, "SIGKILL"); } catch {}
  await sleep(1000);
}

const problems = [];
let server = null;
let browser = null;
try {
  // wrangler dev tự chạy lại `build` khi khởi động nên mã bản dựng thực sự được phục vụ có thể lệch vài giây so với lúc build tay: luôn đọc mã từ máy chủ.
  const servedId = async () => (await (await fetch(`${BASE}/sw.js`)).text()).match(/"(\d{14})"/)?.[1];
  build(); // "deploy" A
  server = await startServer();
  const idA = await servedId();

  browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on("pageerror", (e) => problems.push(String(e).slice(0, 160)));
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#phone", "0901000002");
  await page.type("#pin", "736154");
  await page.click("#submit");
  await page.waitForFunction(() => location.pathname === "/");
  await page.waitForSelector("#tabbar");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "networkidle0" });
  const keys = () => page.evaluate(async () => (await caches.keys()).sort());
  const before = await keys();

  await stopServer(server); // tắt bản A
  await sleep(2000);
  build(); // "deploy" B: mã bản dựng mới
  server = await startServer();
  const idB = await servedId();

  let after = [];
  for (let i = 0; i < 30; i++) {
    // trình duyệt thật kiểm tra sw.js mỗi lần điều hướng
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); }).catch(() => {});
    await sleep(700);
    after = await keys();
    if (after.length === 1 && after[0] !== before[0]) break;
  }
  await page.reload({ waitUntil: "networkidle0" });
  const still = await page.evaluate(() => ({ brand: !!document.querySelector("#topbar .brand"), tabbar: !!document.querySelector("#tabbar"), controlled: !!navigator.serviceWorker.controller }));

  const ok = idA && idB && idA !== idB && before.join() === `td-shell-${idA}` && after.join() === `td-shell-${idB}` && still.brand && still.tabbar && still.controlled && problems.length === 0;
  console.log(JSON.stringify({ banA: idA, banB: idB, cacheTruoc: before, cacheSau: after, saukhiTaiLai: still, loi: problems, KETLUAN: ok ? "ĐẠT: cache của bản A bị xoá, cache bản B thay thế, app chạy bình thường" : "KHÔNG ĐẠT" }, null, 1));
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser?.close().catch(() => {});
  if (server) await stopServer(server);
}
