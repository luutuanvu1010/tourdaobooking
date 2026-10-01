#!/usr/bin/env node
// Móc Stop / SubagentStop — "cổng xanh" (đăng ký ở .claude/settings.json). Đọc JSON từ stdin, hỏi cong-xanh-lib.mjs: cây làm việc khác main mà kiểm kiểu
// hoặc bộ kiểm chính chưa xanh thì trả {"decision":"block"} để Claude Code giữ AI lại (kèm tên bài đỏ). Xanh / không có gì đổi / đã khai → im lặng.
// Đầu vào hỏng hoặc sự kiện khác → im lặng cho qua. Lỗi nội bộ → cho qua CÓ KHAI (thoát 1 + một dòng stderr) — hàng rào hỏng thì phải kêu (P16).
// Không có công tắc tạm, không đọc biến môi trường nào ngoài CLAUDE_PROJECT_DIR (để biết kho của mình).
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canhCong } from "./cong-xanh-lib.mjs";
import { khoChungCua } from "./guard-tep-lib.mjs";

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
if (input?.hook_event_name !== "Stop" && input?.hook_event_name !== "SubagentStop") process.exit(0);

try {
  const khoChung = khoChungCua(process.env.CLAUDE_PROJECT_DIR || dirname(fileURLToPath(import.meta.url)));
  const v = canhCong(input, { khoChung });
  if (v.chan) process.stdout.write(JSON.stringify({ decision: "block", reason: v.lyDo }));
  else if (v.ghiChu) process.stderr.write(`${v.ghiChu}\n`);
} catch (e) {
  process.stderr.write(`cổng xanh: lỗi nội bộ, cho qua có khai — ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
process.exit(0);
