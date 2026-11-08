#!/usr/bin/env node
// `npm run len-chinh-thuc -- <nhánh>` — CHỦ DỰ ÁN tự gõ. Chỉ lên chính thức khi đúng bản đã thử trên Development (ADR-0162 Đ4, Đ5).
// Logic và bài kiểm nằm ở scripts/moi-truong-lib.mjs. Tệp này chỉ nối I/O thật.
import { docCommitDev, lenChinhThuc } from "./moi-truong-lib.mjs";
import { isTTY, log, run } from "./release-shell.mjs";

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length > 1) {
  log("Dùng: npm run len-chinh-thuc -- <tên-nhánh>");
  process.exit(1);
}
process.exitCode = await lenChinhThuc({ run, log, isTTY, target: args[0], docCommitDev });
