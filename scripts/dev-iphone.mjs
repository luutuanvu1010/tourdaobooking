// Chạy app trên D1 TẠM để thử trên iPhone thật (dữ liệu mất khi thoát, không đụng D1 thật). Không cần .dev.vars.
//   node scripts/dev-iphone.mjs            → http://<IP-LAN>:8787, iPhone và máy cùng Wi-Fi. Không có service worker (chưa phải HTTPS),
//                                            đủ để thử icon, toàn màn hình, thanh trạng thái, tai thỏ, bàn phím, nút quay lại.
//   node scripts/dev-iphone.mjs --tunnel   → thêm địa chỉ HTTPS tạm của Cloudflare Quick Tunnel (wrangler in ra), có service worker.
//                                            Địa chỉ này công khai với ai có link cho tới khi bạn thoát (Ctrl+C); chỉ có dữ liệu thử.
import { execFileSync, spawn } from "node:child_process";
import { randomBytes, randomInt } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isWeakPin } from "../src/modules/staff/rules.ts";
import { insertStaffSql } from "./staff-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8787;
const tunnel = process.argv.includes("--tunnel");
const wrangler = (args) => execFileSync("npx", ["wrangler", ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: { ...process.env, CI: "1" } });

const pin = () => {
  for (;;) {
    const p = String(randomInt(100000, 1000000));
    if (!isWeakPin(p)) return p;
  }
};
const accounts = [
  { name: "Admin Thử", phone: "0900000001", pin: pin(), permissions: ["SALES", "ADMIN"] },
  { name: "Nhân viên Thử", phone: "0900000002", pin: pin(), permissions: ["SALES"] },
];
const lan = Object.values(networkInterfaces()).flat().find((i) => i && i.family === "IPv4" && !i.internal)?.address;

const persist = mkdtempSync(join(tmpdir(), "tourdao-iphone-"));
let server;
const cleanup = () => {
  try {
    if (server?.pid) process.kill(-server.pid, "SIGTERM");
  } catch {
    /* đã tắt */
  }
  rmSync(persist, { recursive: true, force: true });
};
process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });

try {
  console.log("Dựng D1 tạm…");
  wrangler(["d1", "migrations", "apply", "tourdao-sales-db", "--local", "--persist-to", persist]);
  const seed = join(persist, "seed.sql");
  writeFileSync(seed, (await Promise.all(accounts.map((a) => insertStaffSql(a)))).join("\n"));
  wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", persist, "--file", seed]);

  console.log("\n================ THỬ TRÊN iPHONE ================");
  console.log(lan ? `Mở bằng Safari trên iPhone (cùng Wi-Fi): http://${lan}:${PORT}` : `Không tìm thấy IP LAN; mở http://<IP-máy-này>:${PORT}`);
  if (tunnel) console.log("Địa chỉ HTTPS tạm sẽ hiện trong log của wrangler bên dưới (dòng có trycloudflare.com).");
  for (const a of accounts) console.log(`  ${a.permissions.join(",").padEnd(11)}  SĐT ${a.phone}  PIN ${a.pin}`);
  console.log("Thoát: Ctrl+C (D1 tạm bị xoá). Danh sách kiểm: docs/PWA-IPHONE.md, mục \"Danh sách kiểm trên iPhone thật\".");
  console.log("=================================================\n");

  // PASSKEY_RP_ID/PASSKEY_ORIGIN để trống = TẮT Face ID: trên IP LAN (http, không đúng tên miền), WebAuthn không chạy được, nên để nút hiện
  // ra rồi bấm là lỗi chắc chắn. Muốn thử Face ID thật trên iPhone: xem docs/evidence/2026-09-23-passkey/thu-iphone/HUONG-DAN.md (lát 0).
  const args = [
    "wrangler", "dev", "--port", String(PORT), "--ip", "0.0.0.0", "--persist-to", persist,
    "--var", `SESSION_SECRET:${randomBytes(48).toString("base64url")}`,
    "--var", "PASSKEY_RP_ID:", "--var", "PASSKEY_ORIGIN:",
  ];
  if (tunnel) args.push("--tunnel");
  server = spawn("npx", args, { cwd: ROOT, detached: true, stdio: "inherit", env: { ...process.env, CI: "1" } });
  await new Promise((res) => server.on("exit", res));
} finally {
  cleanup();
}
