// Đo tốc độ mở trang (tối ưu tải 2026-09-27). Chạy từ GỐC một bản repo đã `npm run build:web`:
//   CHROME_BIN=<…/chrome-wrap.sh> node <đường dẫn tệp này>
// Giả lập mạng chậm (trễ 150 ms mỗi lượt), mở mỗi trang 5 lần (lần đầu làm nóng service worker), in trung vị thời gian tới lúc dữ liệu hiện.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
const { ACCOUNTS, startEnv, sleep } = await import(pathToFileURL(join(process.cwd(), "docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs")).href); // chạy từ GỐC repo

const MOB = { width: 390, height: 844, mobile: true };
const TRANG = [
  { path: "/orders", san: "document.querySelector('#list')?.children.length > 0 || !document.getElementById('empty').hidden" },
  { path: "/", san: "document.getElementById('dash-grid') && !document.getElementById('dash-grid').hidden" },
];
const env = await startEnv();
try {
  const acc = Object.values(ACCOUNTS).find((a) => /ADMIN/.test(JSON.stringify(a))) ?? Object.values(ACCOUNTS)[0];
  const page = await env.as(acc, "/orders", MOB);
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: "new MutationObserver((_, o) => { if (document.getElementById('tabbar')) { window.__khung = performance.now(); o.disconnect(); } }).observe(document, { childList: true, subtree: true });" });
  await sleep(1500); // service worker cài + nạp sẵn
  await page.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1_500_000 / 8 * 10, uploadThroughput: 750_000 / 8 * 10 });
  for (const t of TRANG) {
    const lan = [];
    let songSong = null;
    for (let i = 0; i < 5; i++) {
      await page.send("Page.navigate", { url: env.base + t.path });
      const t0 = Date.now();
      await page.waitFor(t.san, `dữ liệu ${t.path}`, 20000);
      lan.push(Date.now() - t0);
      const e = await page.ev(`JSON.stringify(performance.getEntriesByType('resource').filter(r => r.name.includes('/api/')).map(r => ({ u: new URL(r.name).pathname, s: Math.round(r.startTime), e: Math.round(r.responseEnd) })))`);
      const ds = JSON.parse(e);
      const me = ds.find((r) => r.u === "/api/auth/me");
      const du = ds.find((r) => r.u === (t.path === "/" ? "/api/orders/dashboard" : "/api/orders"));
      if (me && du) songSong = du.s < me.e;
      const khung = await page.ev("window.__khung ?? null");
      if (i === 4) console.log(`${t.path} khung (thanh tab) hiện lúc ${Math.round(khung)} ms; /api/auth/me xong lúc ${me?.e} ms → khung ${khung < me?.e ? "TRƯỚC" : "SAU"} câu trả lời đăng nhập`);
      if (i === 4) console.log(`${t.path} lời gọi:`, ds.map((r) => `${r.u}@${r.s}-${r.e}`).join(" "));
    }
    const sx = lan.slice(1).sort((a, b) => a - b);
    console.log(`${t.path}: trung vị ${sx[Math.floor(sx.length / 2)]} ms (các lần ${lan.join(", ")}), dữ liệu song song với /api/auth/me: ${songSong}`);
  }
} finally {
  await env.stop();
}
