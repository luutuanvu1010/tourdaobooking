#!/usr/bin/env node
// `npm run trien-khai` — CHỦ DỰ ÁN tự gõ trong terminal (AI không được chạy: CLAUDE.md §8, hook guard-remote chặn).
// Theo runbook docs/HANDOFF-N1.md: main = origin/main → cổng chỉ-đọc migration → cổng số phiên bản (1 thì hỏi, 2 thì dừng) → test/typecheck/build
// → e2e đủ bộ (đỏ thì hỏi) → Time Travel + áp migration (hỏi) → deploy (hỏi) → audit-invariants --db remote → cổng số phiên bản sau deploy
// (thử lại một lần) → khối tóm tắt. Đặc tả: docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md (phụ lục cổng số phiên bản).
import { APP_VERSION } from "../src/shared/app-info.ts";
import { trienKhai } from "./release-lib.mjs";
import { ask, isTTY, log, run } from "./release-shell.mjs";

if (process.argv.slice(2).filter((a) => a !== "--").length) {
  log("Dùng: npm run trien-khai (không nhận tham số)");
  process.exit(1);
}
// Số phiên bản ở máy đọc từ cùng nguồn với trang Hướng dẫn (mục đầu nhật ký thay đổi), như scripts/kiem-phien-ban.mjs; lib giữ thuần.
process.exitCode = await trienKhai({ run, ask, isTTY, log, version: APP_VERSION });
