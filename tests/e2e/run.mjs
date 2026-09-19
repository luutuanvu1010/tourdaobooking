// Chạy toàn bộ e2e trên một D1 local TẠM (không đụng .wrangler/state của máy) với wrangler dev riêng.
// Dùng: npm run test:e2e                 — mọi kịch bản
//       npm run test:e2e -- orders catalog — chỉ các kịch bản chỉ định
// Cần mạng: admin.mjs và catalog.mjs đọc Google Sheet thật (quyết định của chủ dự án 2026-09-19).
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { insertStaffSql } from "../../scripts/staff-lib.mjs";
import { ACCOUNTS } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const ALL = ["platform", "orders", "trip", "admin", "catalog", "admin-race"];
const picked = process.argv.slice(2);
const scripts = picked.length ? picked : ALL;
for (const s of scripts) if (!ALL.includes(s)) throw new Error(`Không có kịch bản "${s}" (có: ${ALL.join(", ")})`);

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

const wrangler = (args) => execFileSync("npx", ["wrangler", ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: { ...process.env, CI: "1" } });

const persist = mkdtempSync(join(tmpdir(), "tourdao-e2e-"));
let server;
let failed = 0;
try {
  console.log(`D1 tạm: ${persist}`);
  wrangler(["d1", "migrations", "apply", "tourdao-sales-db", "--local", "--persist-to", persist]);
  const seed = join(persist, "seed.sql");
  writeFileSync(seed, (await Promise.all(Object.values(ACCOUNTS).map((a) => insertStaffSql({ name: a.name, phone: a.phone, pin: a.pin, role: a.role })))).join("\n"));
  wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", persist, "--file", seed]);

  const [port, inspector] = [await freePort(), await freePort()];
  const base = `http://127.0.0.1:${port}`;
  const secret = randomBytes(48).toString("base64url"); // phiên chỉ sống trong lần chạy này
  server = spawn(
    "npx",
    ["wrangler", "dev", "--port", String(port), "--ip", "127.0.0.1", "--inspector-port", String(inspector), "--persist-to", persist, "--test-scheduled", "--var", `SESSION_SECRET:${secret}`],
    { cwd: ROOT, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1" } },
  );
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));

  // Sẵn sàng khi /api/auth/me trả 401 (chưa đăng nhập).
  const deadline = Date.now() + 90_000;
  for (;;) {
    const r = await fetch(`${base}/api/auth/me`).catch(() => null);
    if (r?.status === 401) break;
    if (Date.now() > deadline || server.exitCode !== null) throw new Error(`wrangler dev không lên được:\n${log.slice(-3000)}`);
    await new Promise((res) => setTimeout(res, 500));
  }
  console.log(`wrangler dev: ${base}\n`);

  for (const name of scripts) {
    const started = Date.now();
    console.log(`▶ ${name}`);
    try {
      execFileSync("node", [join(HERE, `${name}.mjs`)], { cwd: ROOT, stdio: "inherit", env: { ...process.env, E2E_BASE_URL: base, E2E_PERSIST_TO: persist } });
      console.log(`✔ ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)\n`);
    } catch {
      failed++;
      console.log(`✘ ${name}\n`);
    }
  }
} finally {
  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      /* đã tắt */
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  rmSync(persist, { recursive: true, force: true });
}
console.log(failed ? `E2E: ${failed}/${scripts.length} kịch bản LỖI` : `E2E: ${scripts.length}/${scripts.length} kịch bản xanh`);
process.exit(failed ? 1 : 0);
