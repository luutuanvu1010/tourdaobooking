#!/usr/bin/env node
// `npm run len-dev` — áp migration và đưa mã lên bản Development (dev.tourdao.vn). Lệnh DUY NHẤT AI được chạy chạm wrangler (ADR-0162 Đ5).
// Logic và bài tự kiểm nằm ở scripts/moi-truong-lib.mjs (có test bằng bộ chạy giả). Tệp này chỉ nối I/O thật.
import { readdirSync, readFileSync } from "node:fs";
import { docCommitDev, lenDev } from "./moi-truong-lib.mjs";
import { log, ROOT, run } from "./release-shell.mjs";

process.exitCode = await lenDev({
  run,
  log,
  args: process.argv.slice(2),
  docTep: (ten) => readFileSync(new URL(ten, `file://${ROOT}`), "utf8"),
  tenMigration: readdirSync(new URL("migrations/", `file://${ROOT}`)).filter((t) => t.endsWith(".sql")),
  docCommitDev,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});
