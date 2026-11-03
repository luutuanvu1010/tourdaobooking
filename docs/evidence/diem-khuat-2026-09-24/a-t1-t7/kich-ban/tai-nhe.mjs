// Tải nhẹ vào wrangler dev CỤC BỘ của startEnv (D1 tạm). KHÔNG BAO GIỜ trỏ vào production.
// Kiểm toán điểm khuất 2026-09-24, trục T7.
//
// CÁCH CHẠY (cwd = gốc repo, như a2-cdp.mjs):
//   cd <gốc repo>
//   node /đường/dẫn/tai-nhe.mjs [--n 20] [--c 10] [--out tai-nhe-ket-qua.json] [--seed 30]
//   --n: số yêu cầu mỗi kịch bản; --c: số yêu cầu bay cùng lúc; --seed: số đơn dựng sẵn.
// Kịch bản: GET danh sách đơn, GET một đơn, GET Trang chủ (dashboard), POST tạo đơn đồng thời (kiểm trùng mã đơn + 5xx),
// PUT cùng một đơn nháp đồng thời (khoá lạc quan → 409, không 5xx), POST đăng nhập SAI PIN từ nhiều IP giả (cf-connecting-ip — chỉ giả được ở local;
// production Cloudflare ghi đè header này) vào (a) một SĐT thật (phải bị khoá sau 5 lần) và (b) SĐT ngẫu nhiên.
// LƯU Ý: startEnv() TẮT Turnstile, nên kịch bản đăng nhập đo phần SAU Turnstile (kẻ dò đã qua được Turnstile). workerd cục bộ ≠ mạng lưới Cloudflare:
// thông lượng/độ trễ ở đây KHÔNG suy ra được năng lực production; giá trị chính là mã lỗi, trùng mã, số dòng ghi.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const A2 = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
const { ACCOUNTS, startEnv, vnDate } = await import(pathToFileURL(A2).href);
const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(name); return i === -1 ? def : argv[i + 1]; };
const N = Number(arg("--n", "20"));
const C = Number(arg("--c", "10"));
const SEED = Number(arg("--seed", "30"));
const OUT = arg("--out", "tai-nhe-ket-qua.json");
const uptime = () => { try { return execSync("uptime").toString().trim(); } catch { return "?"; } };

const env = await startEnv();
const out = { at: new Date().toISOString(), cwd: process.cwd(), n: N, c: C, seed: SEED, uptimeStart: uptime(), scenarios: [] };
try {
  const cookies = new Map();
  const cookieOf = async (acc) => { if (!cookies.has(acc.phone)) cookies.set(acc.phone, await env.login(acc)); return cookies.get(acc.phone); };
  const req = async (acc, method, path, body, extraHeaders = {}) => {
    const headers = { "content-type": "application/json", origin: env.base, ...extraHeaders };
    if (acc) { const c = await cookieOf(acc); headers.cookie = `${c.name}=${c.value}`; }
    const t0 = performance.now();
    try {
      const r = await fetch(env.base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await r.text();
      return { status: r.status, ms: performance.now() - t0, bytes: text.length, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
    } catch (e) { return { status: 0, ms: performance.now() - t0, bytes: 0, error: String(e?.message ?? e) }; }
  };
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const pax = (adult, child = 0) => ({ adult, child, senior: 0, infant: 0 });
  const orderBody = (i) => ({ customerName: `Khách tải ${i}`, customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TD101", pax: pax(2), unitPrices: { adult: 1350000 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: vnDate(2), pickupPlace: "Bến" }] });

  // Đăng nhập TUẦN TỰ trước (đăng nhập song song cùng một SĐT vấp bộ chống dò PIN — PHONE_LIMIT 5 — dù PIN đúng).
  for (const a of [ACCOUNTS.salesA, ACCOUNTS.salesB, ACCOUNTS.admin]) await cookieOf(a);
  const ids = [];
  for (let i = 0; i < SEED; i++) {
    const r = await req(ACCOUNTS.salesA, "POST", "/api/orders", orderBody(i));
    if (r.status !== 201) throw new Error(`dựng đơn: ${r.status}`);
    ids.push(r.json.order.id);
    if (i % 2 === 0) await req(ACCOUNTS.salesA, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
  }

  async function run(name, makeReq) {
    const results = [];
    let next = 0;
    const t0 = performance.now();
    await Promise.all(Array.from({ length: Math.min(C, N) }, async () => { while (next < N) { const i = next++; results.push(await makeReq(i)); } }));
    const wall = performance.now() - t0;
    const lat = results.map((r) => r.ms).sort((a, b) => a - b);
    const q = (f) => +lat[Math.min(lat.length - 1, Math.floor(lat.length * f))].toFixed(1);
    const statuses = {}; for (const r of results) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
    const s = { name, n: results.length, concurrency: C, wallMs: +wall.toFixed(0), reqPerSec: +(results.length / (wall / 1000)).toFixed(1), p50: q(0.5), p95: q(0.95), max: q(1), statuses, errors5xx: results.filter((r) => r.status >= 500 || r.status === 0).length, avgBytes: Math.round(results.reduce((a, r) => a + r.bytes, 0) / results.length), sample5xx: results.filter((r) => r.status >= 500 || r.status === 0).slice(0, 2).map((r) => r.json ?? r.error) };
    out.scenarios.push(s);
    console.log(`✓ ${name}: ${JSON.stringify({ reqPerSec: s.reqPerSec, p50: s.p50, p95: s.p95, statuses })}`);
    return s;
  }

  await run("GET /api/orders (danh sách)", () => req(ACCOUNTS.salesA, "GET", "/api/orders?limit=30&offset=0"));
  await run("GET /api/orders/:id", (i) => req(ACCOUNTS.salesA, "GET", `/api/orders/${ids[i % ids.length]}`));
  await run("GET /api/orders/dashboard", () => req(ACCOUNTS.salesA, "GET", "/api/orders/dashboard"));
  await run("GET /api/auth/me", () => req(ACCOUNTS.salesB, "GET", "/api/auth/me"));
  const before = env.sql("SELECT COUNT(*) AS n FROM orders")[0].n;
  await run("POST /api/orders (tạo đồng thời)", (i) => req(i % 2 ? ACCOUNTS.salesA : ACCOUNTS.salesB, "POST", "/api/orders", orderBody(1000 + i)));
  const after = env.sql("SELECT COUNT(*) AS n FROM orders")[0].n;
  const dup = env.sql("SELECT order_code, COUNT(*) AS n FROM orders GROUP BY order_code HAVING n > 1");
  out.createCheck = { ordersBefore: before, ordersAfter: after, duplicateCodes: dup.length };
  // cùng một đơn nháp, nhiều người lưu cùng lúc với cùng mốc updatedAt: đúng ra 1 thắng, còn lại 409
  const draft = await req(ACCOUNTS.salesA, "POST", "/api/orders", orderBody(9999));
  const upd = draft.json.order.updatedAt;
  await run("PUT cùng một đơn nháp (khoá lạc quan)", (i) => req(ACCOUNTS.salesA, "PUT", `/api/orders/${draft.json.order.id}`, { ...orderBody(9999 + i), expectedUpdatedAt: upd }));
  const attemptsBefore = env.sql("SELECT COUNT(*) AS n FROM login_attempt")[0].n;
  await run("POST /api/auth/login SAI PIN, SĐT thật, IP giả khác nhau", (i) => req(null, "POST", "/api/auth/login", { phone: ACCOUNTS.salesB.phone, pin: String(100000 + i), turnstileToken: "x" }, { "cf-connecting-ip": `10.77.${i % 250}.${(i >> 8) + 1}` }));
  await run("POST /api/auth/login SAI PIN, SĐT ngẫu nhiên, IP giả khác nhau", (i) => req(null, "POST", "/api/auth/login", { phone: `09${String(10000000 + i * 7919).slice(-8)}`, pin: "123456", turnstileToken: "x" }, { "cf-connecting-ip": `10.88.${i % 250}.${(i >> 8) + 1}` }));
  out.loginAttemptRows = { before: attemptsBefore, after: env.sql("SELECT COUNT(*) AS n FROM login_attempt")[0].n };
  // SĐT thật đã bị khoá chưa? (đăng nhập ĐÚNG PIN từ IP mới)
  const locked = await req(null, "POST", "/api/auth/login", { phone: ACCOUNTS.salesB.phone, pin: ACCOUNTS.salesB.pin, turnstileToken: "x" }, { "cf-connecting-ip": "10.99.1.1" });
  out.realPhoneAfterAttack = { status: locked.status, code: locked.json?.error?.code ?? null };
  out.uptimeEnd = uptime();
  out.note = "Đo trên workerd cục bộ khi máy BẬN (xem uptime) — chỉ tin mã lỗi / trùng mã / số dòng; thời gian không đại diện production.";
} finally {
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`Đã ghi ${OUT}`);
  await env.stop();
}
