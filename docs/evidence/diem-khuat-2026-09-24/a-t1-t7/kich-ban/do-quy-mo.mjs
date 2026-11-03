// Đo số lượt D1 theo QUY MÔ dữ liệu (chạy với cwd = bản sao có bọc đếm D1). node do-quy-mo.mjs [--orders 150] [--assign 150] [--out f.json]
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const A2 = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
const { ACCOUNTS, startEnv, vnDate } = await import(pathToFileURL(A2).href);
const argv = process.argv.slice(2); const arg = (n, d) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
const M = Number(arg("--orders", "150")), K = Number(arg("--assign", "150")), OUT = arg("--out", "do-quy-mo.json");
const env = await startEnv();
const out = { at: new Date().toISOString(), uptime: execSync("uptime").toString().trim(), M, K, probes: [] };
try {
  const cookies = new Map();
  const ck = async (a) => { if (!cookies.has(a.phone)) cookies.set(a.phone, await env.login(a)); return cookies.get(a.phone); };
  const call = async (a, method, path, body) => { const c = await ck(a); const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const f = await call(ACCOUNTS.admin, "POST", "/api/staff", { fullName: "Hướng Dẫn Quy Mô", phone: "0900000298", permissions: ["FIELD"] });
  const field = { phone: "0900000298", pin: f.json.pin };
  const d1 = () => env.logs.join("").split("\n").filter((l) => l.includes("D1COUNT ")).map((l) => JSON.parse(l.slice(l.indexOf("D1COUNT ") + 8)));
  const probe = async (label) => {
    for (const [acc, path] of [[field, "/api/dispatch/mine"], [ACCOUNTS.salesA, "/api/orders/dashboard"], [ACCOUNTS.salesA, "/api/orders?limit=30&offset=0"]]) {
      const mark = d1().length; const t0 = performance.now(); const r = await call(acc, "GET", path); const ms = performance.now() - t0;
      const x = d1().slice(mark).find((y) => y.p.startsWith(path.split("?")[0]));
      out.probes.push({ label, path, status: r.status, rt: x?.rt, stmts: x?.stmts, serial: x?.serial, bytes: x?.bytes, serverMs: x?.ms, clientMs: Math.round(ms), items: r.json?.assignments?.length ?? r.json?.orders?.length ?? null });
      console.log(label, path, r.status, JSON.stringify(out.probes.at(-1)));
    }
  };
  let made = 0;
  for (const target of [6, 40, M]) {
    for (; made < target; made++) {
      const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: `Khách ${made}`, customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
        services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, unitPrices: { adult: 1350000 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: vnDate(1 + (made % 30)), pickupPlace: "Bến" }] });
      await call(ACCOUNTS.salesA, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
      if (made < K) await call(ACCOUNTS.admin, "PUT", `/api/orders/${r.json.order.id}/handler`, { staffId: f.json.staff.id });
    }
    await probe(`${made} đơn đã xác nhận, ${Math.min(made, K)} giao cho HDV`);
  }
} finally { writeFileSync(OUT, JSON.stringify(out, null, 1)); await env.stop(); }
