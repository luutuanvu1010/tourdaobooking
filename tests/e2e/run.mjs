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
import { ACCOUNTS, TURNSTILE_TEST } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
// "feedback" đứng TRƯỚC "maintenance": cổng bảo trì của router chặn mọi route cần đăng nhập, nên kịch bản Góp ý không được chạy khi chế độ bảo trì còn đang bật dở.
// "bangtin" (ADR-0022) đứng SAU "company", TRƯỚC "maintenance": tự bật/tắt bảo trì ở ca 10 và khôi phục ở `finally`, không đụng salesB/field mà "passkey" đổi.
// "thongbao" (ADR-0034) đứng SAU "bangtin", TRƯỚC "maintenance": chỉ đọc hộp thông báo (không tự bật/tắt bảo trì); cổng bảo trì của router
// chặn mọi route cần đăng nhập nên phải chạy trước khi "maintenance" bật dở.
// "roles" (ADR-0018) đứng TRƯỚC "passkey": đổi vai của tài khoản superAdmin (quyền giữ nguyên) và tạo tài khoản mới — không đụng salesB/field của passkey.
// "van-chuyen" (ADR-0040) đứng SAU "roles", TRƯỚC "passkey": tạo tài khoản tài xế + hồ sơ + xe dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()), đổi ngưỡng
// "sắp hết hạn" rồi khôi phục 30 ở `finally`; không đụng salesB/field của passkey.
// "tai-xe-doi-tac" (ADR-0048) đứng SAU "van-chuyen", TRƯỚC "passkey": tạo tài khoản / hồ sơ / nhà xe / xe dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()),
// gửi hai tin thông báo KHÔNG quan trọng rồi thu hồi ở `finally`; chèn SQL thử trigger chỉ vào tài khoản của chính kịch bản (SQL vào salesA luôn bị chặn — không đổi gì).
// "passkey" đứng CUỐI CÙNG: đổi PIN của salesB, tạm ngưng rồi kích hoạt lại field — mọi kịch bản của một lần chạy dùng chung một D1 tạm.
const ALL = ["platform", "pwa", "orders", "trip", "nhap-tay-va-gia-doi-tac", "admin", "turnstile", "catalog", "dispatch", "admin-race", "locations", "parties", "booker", "permissions", "feedback", "company", "bangtin", "thongbao", "maintenance", "roles", "van-chuyen", "tai-xe-doi-tac", "passkey"];
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
let total = scripts.length;
try {
  console.log(`D1 tạm: ${persist}`);
  wrangler(["d1", "migrations", "apply", "tourdao-sales-db", "--local", "--persist-to", persist]);
  const seed = join(persist, "seed.sql");
  writeFileSync(seed, (await Promise.all(Object.values(ACCOUNTS).map((a) => insertStaffSql({ name: a.name, phone: a.phone, pin: a.pin, permissions: a.permissions })))).join("\n"));
  wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", persist, "--file", seed]);

  const [port, inspector] = [await freePort(), await freePort()];
  const base = `http://127.0.0.1:${port}`;
  const secret = randomBytes(48).toString("base64url"); // phiên chỉ sống trong lần chạy này
  server = spawn(
    "npx",
    [
      "wrangler", "dev", "--port", String(port), "--ip", "127.0.0.1", "--inspector-port", String(inspector), "--persist-to", persist, "--test-scheduled",
      "--var", `SESSION_SECRET:${secret}`,
      // Bật Turnstile bằng khoá THỬ của Cloudflare (luôn đạt) — lib.mjs login() gửi token thử; đặt tường minh để không phụ thuộc .dev.vars của máy.
      "--var", `TURNSTILE_SITE_KEY:${TURNSTILE_TEST.siteKey}`,
      "--var", `TURNSTILE_SECRET_KEY:${TURNSTILE_TEST.secret}`,
      // Bật Face ID (passkey, ADR-0016) cho server e2e — riêng cho lần chạy này, không lệ thuộc `vars` production của wrangler.jsonc.
      "--var", "PASSKEY_RP_ID:127.0.0.1",
      "--var", `PASSKEY_ORIGIN:${base}`,
      // Bảng tin (ADR-0022, KN-1): rút ngắn hạn sống kết nối cho e2e (mặc định production 900 giây) — đủ dài cho mỗi ca (kết nối mới mỗi ca)
      // mà ca "hạn sống" (Task 7 ca 8) chỉ cần chờ ~23 giây; đừng nới mốc "< 2 giây" (KN-2) nếu tăng số này.
      "--var", "BANG_TIN_HAN_GIAY:20",
      // Web Push (ADR-0036): ép khoá VAPID RỖNG — e2e không phụ thuộc .dev.vars của máy và KHÔNG BAO GIỜ gõ cửa dịch vụ đẩy thật bằng địa chỉ giả.
      "--var", "VAPID_PUBLIC_KEY:",
      "--var", "VAPID_PRIVATE_KEY:",
    ],
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

  // Đợt D Task 6 (F-4b): MỘT kịch bản đỏ (vd `catalog` khi Sheet thật đổi giá) không được che khuất các kịch bản
  // PHÍA SAU nó — `execFileSync` đã ném vào `try/catch` riêng của từng kịch bản từ trước (một tiến trình con lỗi
  // không tự làm hỏng `run.mjs` hay `wrangler dev` — đã tự đo: kịch bản đứng sau một kịch bản đỏ vẫn chạy đúng),
  // nhưng bản tóm tắt cuối cùng CHỈ in một con số (`E2E: N/M kịch bản LỖI`) — không nói bộ NÀO đỏ, nên một người đọc
  // nhanh dễ kết luận nhầm "e2e hỏng" cho cả lượt. Ghi lại danh sách từng bộ (`results`) để in đủ tên trước khi thoát.
  const results = [];
  for (const name of scripts) {
    const started = Date.now();
    console.log(`▶ ${name}`);
    try {
      execFileSync("node", [join(HERE, `${name}.mjs`)], { cwd: ROOT, stdio: "inherit", env: { ...process.env, E2E_BASE_URL: base, E2E_PERSIST_TO: persist } });
      console.log(`✔ ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)\n`);
      results.push({ name, ok: true });
    } catch {
      console.log(`✘ ${name}\n`);
      results.push({ name, ok: false });
    }
    // Phòng đúng kiểu lỗi brief mô tả (một kịch bản hạ luôn `wrangler dev` dùng chung): nếu tiến trình chung đã chết,
    // MỌI kịch bản còn lại chắc chắn sẽ đỏ vì không kết nối được — dừng ngay và ghi rõ "chưa chạy", đừng để chúng
    // biến thành N dòng "✘" trông như N lỗi độc lập (che mất sự thật chỉ có MỘT nguyên nhân gốc).
    if (server.exitCode !== null) {
      console.log(`⚠ wrangler dev dùng chung đã thoát (mã ${server.exitCode}) — dừng, không chạy tiếp các kịch bản còn lại.\n`);
      for (const skipped of scripts.slice(scripts.indexOf(name) + 1)) results.push({ name: skipped, ok: null });
      break;
    }
  }
  // Sau mọi kịch bản: bất biến dữ liệu N1 phải còn nguyên trên D1 tạm (chỉ khi chạy đủ bộ — chạy lẻ có thể để dữ liệu dở).
  if (!picked.length && server.exitCode === null) {
    console.log("▶ audit-invariants");
    try {
      execFileSync("node", [join(ROOT, "scripts", "audit-invariants.mjs"), "--db", "local", "--persist-to", persist, "--strict"], { cwd: ROOT, stdio: "inherit" });
      console.log("✔ audit-invariants\n");
      results.push({ name: "audit-invariants", ok: true });
    } catch {
      console.log("✘ audit-invariants\n");
      results.push({ name: "audit-invariants", ok: false });
    }
  }
  // Web Push (ADR-0036): khoá VAPID bị ép rỗng → không lượt gửi nào được chạy, nên log máy chủ KHÔNG được có dòng `day_loi` (gửi hỏng/lỗi lô).
  results.push({ name: "không có day_loi (thiếu khoá VAPID thì không gửi)", ok: !log.includes('"event":"day_loi"') });
  console.log("── Tóm tắt từng bộ ──");
  for (const x of results) console.log(`${x.ok === true ? "✔" : x.ok === false ? "✘" : "⏭ chưa chạy (wrangler dev dùng chung đã thoát)"} ${x.name}`);
  failed = results.filter((x) => x.ok !== true).length;
  total = results.length;
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
console.log(failed ? `E2E: ${failed}/${total} kịch bản LỖI` : `E2E: ${total}/${total} kịch bản xanh`);
process.exit(failed ? 1 : 0);
