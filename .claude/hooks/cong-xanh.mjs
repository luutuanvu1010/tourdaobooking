#!/usr/bin/env node
// Móc Stop — "cổng xanh" bản nhẹ (đăng ký ở .claude/settings.json; kế hoạch 2026-11-15 việc 2.2). Đọc JSON từ stdin, hỏi cong-xanh-lib.mjs:
// đỏ ⇒ in {"decision":"block","reason":…} để Claude Code giữ AI lại (kèm tên bài đỏ); quá trần / lỗi nội bộ ⇒ in {"systemMessage":…} và cho dừng;
// xanh / không có gì đổi / stop_hook_active ⇒ im lặng. Luôn thoát 0: móc không bao giờ khoá phiên.
// Chỉ sự kiện Stop của phiên chính (không đăng ký cho SubagentStop). Không có công tắc tạm, không đọc biến môi trường nào ngoài CLAUDE_PROJECT_DIR.
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
if (!input || typeof input !== "object") process.exit(0);
if (input.hook_event_name !== undefined && input.hook_event_name !== "Stop") process.exit(0);
if (input.stop_hook_active === true) process.exit(0);

try {
  const khoChung = khoChungCua(process.env.CLAUDE_PROJECT_DIR || dirname(fileURLToPath(import.meta.url)));
  const v = canhCong(input, { khoChung });
  if (v.chan) process.stdout.write(JSON.stringify({ decision: "block", reason: v.lyDo }));
  else if (v.canhBao) process.stdout.write(JSON.stringify({ systemMessage: v.canhBao }));
} catch (e) {
  process.stdout.write(JSON.stringify({ systemMessage: `Cổng xanh: lỗi nội bộ, cho dừng — ${e instanceof Error ? e.message : String(e)}` }));
}
process.exit(0);
