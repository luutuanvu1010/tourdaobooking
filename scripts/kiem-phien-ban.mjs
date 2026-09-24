// Cổng phát hành CHỈ ĐỌC (đặc tả nhật ký thay đổi §4): so số phiên bản ở máy (mục đầu src/shared/changelog.ts) với production (GET /api/auth/config).
//   node scripts/kiem-phien-ban.mjs              trước deploy: ĐẠT khi bản ở máy MỚI HƠN production (bắt lỗi quên ghi nhật ký)
//   node scripts/kiem-phien-ban.mjs --sau-deploy  sau deploy: ĐẠT khi production BẰNG bản ở máy
// Mã thoát: 0 ĐẠT · 1 CHƯA ĐẠT · 2 KHÔNG CHẠY ĐƯỢC (mạng/HTTP/thân lạ — không phải "đạt"). PROD_URL=… để thử trên máy.
import { CHANGELOG, releaseGate } from "../src/shared/changelog.ts";

const base = process.env.PROD_URL ?? "https://booking.tourdao.vn";
const mode = process.argv.includes("--sau-deploy") ? "sau" : "truoc";
const local = CHANGELOG[0]?.version;
if (!local) {
  console.error("KHÔNG CHẠY ĐƯỢC: nhật ký thay đổi rỗng.");
  process.exit(2);
}
let remote;
try {
  const r = await fetch(`${base}/api/auth/config`, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const body = await r.json();
  remote = typeof body?.version === "string" ? body.version : null;
} catch (e) {
  console.error(`KHÔNG CHẠY ĐƯỢC: không đọc được ${base}/api/auth/config (${e?.message ?? e}).`);
  process.exit(2);
}
const gate = releaseGate(local, remote, mode);
console.log(gate.message);
process.exit(gate.ok ? 0 : 1);
