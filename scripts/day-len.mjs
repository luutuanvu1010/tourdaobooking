#!/usr/bin/env node
// `npm run day-len [-- <nhánh>]` — CHỦ DỰ ÁN tự gõ trong terminal (AI không được chạy: CLAUDE.md §8, hook guard-remote chặn).
// Gộp tiến thẳng <nhánh> vào main (nếu có), chạy test + typecheck, in tóm tắt (kể cả migration mới), hỏi, rồi `git push origin main`.
// Đặc tả: docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md. Logic: scripts/release-lib.mjs.
import { dayLen } from "./release-lib.mjs";
import { ask, isTTY, log, run } from "./release-shell.mjs";

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length > 1) {
  log("Dùng: npm run day-len [-- <tên-nhánh>]");
  process.exit(1);
}
process.exitCode = await dayLen({ run, ask, isTTY, log, target: args[0] });
