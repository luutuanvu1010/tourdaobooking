// Kiểm toán bất biến dữ liệu N1 (đặc tả N1 §6) trên D1 — CHỈ ĐỌC (chỉ SELECT/PRAGMA), an toàn để chạy trên remote.
// Dùng: node scripts/audit-invariants.mjs --db local|remote [--persist-to <thư mục>] [--strict]
//   --strict: coi tài khoản chưa có hồ sơ (R-N1-1) và các kiểm mức 'warn-unless-strict' là VI PHẠM. Không có --strict, chúng chỉ là CẢNH BÁO (khoảng giữa hai lần phát hành N1).
//   Kiểm mức "warn" (R-DSP-2b) là cảnh báo VĨNH VIỄN: không bao giờ làm hỏng kiểm, kể cả --strict (một tình trạng nghiệp vụ hợp lệ, vd người phụ trách đã nghỉ).
// Danh sách kiểm (câu SQL, mức) nằm ở scripts/audit-checks.mjs — tệp thuần để `src/audit-invariants.test.ts` chạy đúng các câu đó trên SQLite thật.
// Mỗi kiểm = một câu SQL trả SỐ dòng vi phạm (0 = đạt). Thoát mã 1 nếu có vi phạm. Một lần gọi wrangler cho mọi kiểm.
// Thoát mã 2 = không chạy được (D1 chưa áp đủ migration — vd chưa có bảng dsp_* của 0014 —, mất mạng, sai --db): KHÔNG có nghĩa là dữ liệu sạch.
import { execFileSync } from "node:child_process";
import { CHECKS, GHI_CHU } from "./audit-checks.mjs";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const db = opt("--db");
const persist = opt("--persist-to");
const strict = args.includes("--strict");
if (!["local", "remote"].includes(db)) {
  console.error("Dùng: node scripts/audit-invariants.mjs --db local|remote [--persist-to thư-mục] [--strict]");
  process.exit(1);
}

const DEFAULT_NOTE = "cảnh báo: khoảng giữa hai lần phát hành N1; dùng --strict sau lần phát hành 2";

const cmd = ["wrangler", "d1", "execute", "tourdao-sales-db", `--${db}`, "--json", ...(persist ? ["--persist-to", persist] : []), "--command", CHECKS.map(({ sql }) => `${sql.replace(/\s+/g, " ").trim()};`).join(" ")];
let results;
try {
  results = JSON.parse(execFileSync("npx", cmd, { encoding: "utf8", env: { ...process.env, CI: "1" }, stdio: ["ignore", "pipe", "pipe"] }));
} catch (e) {
  console.error(`Không chạy được truy vấn trên D1 (${db}): ${String(e.stderr ?? e.message).slice(0, 600)}`);
  process.exit(2);
}
if (!Array.isArray(results) || results.length !== CHECKS.length) {
  console.error(`Kết quả không khớp số kiểm (${results?.length} ≠ ${CHECKS.length}).`);
  process.exit(2);
}

let failed = 0;
let warned = 0;
CHECKS.forEach(({ code, what, level, mode, note }, i) => {
  const n = mode === "rows" ? results[i].results.length : Number(Object.values(results[i].results[0] ?? { n: 0 })[0]);
  const bad = n > 0;
  const isFail = bad && (level === "fail" || (strict && level === "warn-unless-strict"));
  if (isFail) failed++;
  else if (bad) warned++;
  const text = note ?? (level === "warn" ? "cảnh báo, không làm hỏng kiểm: cần người rà soát" : DEFAULT_NOTE);
  console.log(`${isFail ? "✗" : bad ? "⚠" : "✓"} ${code.padEnd(8)} ${what}${bad ? ` — ${n} vi phạm${isFail ? "" : ` (${text})`}` : ""}`);
});
for (const { code, text } of GHI_CHU) console.log(`· ${code.padEnd(8)} ${text}`);
console.log(`\n${failed ? `${failed} bất biến BỊ VI PHẠM` : "Mọi bất biến đạt"}${warned ? `, ${warned} cảnh báo` : ""} (D1 ${db}${strict ? ", --strict" : ""}).`);
process.exit(failed ? 1 : 0);
