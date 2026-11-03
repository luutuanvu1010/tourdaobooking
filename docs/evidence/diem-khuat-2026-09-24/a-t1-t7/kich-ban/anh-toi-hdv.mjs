// Chụp trang "Tôi" của tài khoản Hướng dẫn viên TRƯỚC và SAU khi khối "Việc của tôi" về (nhảy bố cục). cwd = gốc repo.
import { pathToFileURL } from "node:url";
const A2 = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
const { ACCOUNTS, startEnv, vnDate, sleep } = await import(pathToFileURL(A2).href);
const OUTDIR = process.argv[2];
const env = await startEnv();
try {
  const c = await env.login(ACCOUNTS.admin); const cs = await env.login(ACCOUNTS.salesA);
  const call = async (ck, method, path, body) => { const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${ck.name}=${ck.value}` }, body: body && JSON.stringify(body) }); return r.json(); };
  const f = await call(c, "POST", "/api/staff", { fullName: "Hướng Dẫn Ảnh", phone: "0900000297", permissions: ["FIELD"] });
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  for (let i = 0; i < 3; i++) {
    const o = await call(cs, "POST", "/api/orders", { customerName: `Khách ${i}`, customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "", services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, unitPrices: { adult: 1350000 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: vnDate(1), pickupTime: "06:00", pickupPlace: "Bến Cầu Đá" }] });
    await call(cs, "POST", `/api/orders/${o.order.id}/status`, { status: "confirmed" });
    await call(c, "PUT", `/api/orders/${o.order.id}/handler`, { staffId: f.staff.id });
  }
  const page = await env.openPage({ width: 375, height: 812, mobile: true });
  const fc = await env.login({ phone: "0900000297", pin: f.pin });
  await page.send("Network.setCookie", { name: fc.name, value: fc.value, url: env.base, httpOnly: true });
  await page.send("Network.emulateNetworkConditions", { offline: false, latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 });
  await page.send("Page.navigate", { url: env.base + "/account" });
  await page.waitFor("(document.getElementById('me')?.textContent||'').trim().length>0 && document.getElementById('myjobs').hidden", "khối Tôi đã vẽ, Việc của tôi chưa về", 30000);
  const y1 = await page.ev("Math.round(document.getElementById('pin-form').getBoundingClientRect().top)");
  const r1 = await page.send("Page.captureScreenshot", { format: "png" }); (await import("node:fs")).writeFileSync(`${OUTDIR}/toi-hdv-1-truoc-khi-viec-ve.png`, Buffer.from(r1.result.data, "base64"));
  await page.waitFor("document.getElementById('myjobs').hidden === false", "Việc của tôi về", 30000);
  await sleep(300);
  const y2 = await page.ev("Math.round(document.getElementById('pin-form').getBoundingClientRect().top)");
  const r2 = await page.send("Page.captureScreenshot", { format: "png" }); (await import("node:fs")).writeFileSync(`${OUTDIR}/toi-hdv-2-sau-khi-viec-ve.png`, Buffer.from(r2.result.data, "base64"));
  console.log(JSON.stringify({ pinFormTopBefore: y1, pinFormTopAfter: y2 }));
} finally { await env.stop(); }
