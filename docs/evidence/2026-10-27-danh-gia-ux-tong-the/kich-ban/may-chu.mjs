// Bật máy chủ thử (wrangler dev) trỏ vào kho D1 CỐ ĐỊNH của cuộc đánh giá UX 27/10/2026 — dữ liệu sống qua nhiều lần đo, không đụng D1 thật.
// Chạy từ GỐC kho: node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs [--turnstile] [--d1 <thư mục>] [--port <cổng>]
//   Mặc định: kho ~/tourdao-ux-2026-10-27/d1, cổng 8790, Turnstile TẮT, Face ID TẮT, Web Push TẮT (cùng cách ghi đè rỗng của a2-cdp.mjs).
//   --turnstile: bật bằng KHOÁ THỬ chính thức của Cloudflare (cần mạng) để đo trang Đăng nhập có ô kiểm người thật.
// Danh mục dịch vụ KHÔNG gieo giả: lần đọc đầu máy chủ tự tải bản CSV (chỉ đọc) của Google Sheet dịch vụ thật (quyết định (4) của chủ 27/10).
// SESSION_SECRET cố định theo biến UX_SESSION_SECRET (nếu có) để cookie đăng nhập còn dùng được sau khi bật lại máy chủ.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const persist = arg("--d1") ?? join(homedir(), "tourdao-ux-2026-10-27", "d1");
const port = arg("--port") ?? "8790";
const ts = process.argv.includes("--turnstile") ? ["1x00000000000000000000AA", "1x0000000000000000000000000000000AA"] : ["", ""];
const secret = process.env.UX_SESSION_SECRET ?? randomBytes(48).toString("base64url");
const args = ["wrangler", "dev", "--port", port, "--ip", "127.0.0.1", "--persist-to", persist,
  "--var", `SESSION_SECRET:${secret}`, "--var", `LAN_GUI_SECRET:${randomBytes(48).toString("base64url")}`,
  "--var", `TURNSTILE_SITE_KEY:${ts[0]}`, "--var", `TURNSTILE_SECRET_KEY:${ts[1]}`,
  "--var", "PASSKEY_RP_ID:", "--var", "PASSKEY_ORIGIN:", "--var", "VAPID_PUBLIC_KEY:", "--var", "VAPID_PRIVATE_KEY:"];
console.log(`Máy chủ thử: http://localhost:${port} — kho ${persist}`);
const p = spawn("npx", args, { stdio: "inherit", env: { ...process.env, CI: "1" } });
p.on("exit", (c) => process.exit(c ?? 0));
