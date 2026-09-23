#!/usr/bin/env node
// `npm run trien-khai` — CHỦ DỰ ÁN tự gõ trong terminal (AI không được chạy: CLAUDE.md §8, hook guard-remote chặn).
// Theo runbook docs/HANDOFF-N1.md: main = origin/main → cổng chỉ-đọc migration → test/typecheck/build → e2e đủ bộ (đỏ thì hỏi) → Time Travel + áp migration (hỏi)
// → deploy (hỏi) → audit-invariants --db remote → khối tóm tắt. Đặc tả: docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md.
import { trienKhai } from "./release-lib.mjs";
import { ask, isTTY, log, run } from "./release-shell.mjs";

if (process.argv.slice(2).filter((a) => a !== "--").length) {
  log("Dùng: npm run trien-khai (không nhận tham số)");
  process.exit(1);
}
process.exitCode = await trienKhai({ run, ask, isTTY, log });
