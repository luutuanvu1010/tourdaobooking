#!/usr/bin/env node
// Móc PreToolUse cho công cụ sửa tệp (Edit, Write, MultiEdit, NotebookEdit — đăng ký ở .claude/settings.json). Đọc JSON từ stdin, hỏi guard-tep-lib.mjs
// (migration đã lên main, tệp bí mật, sửa thẳng ở checkout gốc), và nếu tệp bị cấm thì trả quyết định "deny" cho Claude Code.
// Đầu vào hỏng / không phải công cụ sửa tệp → im lặng cho qua. Lỗi nội bộ → cho qua CÓ KHAI (thoát 1 + một dòng stderr: Claude Code hiện "hook error" nhưng
// không chặn) — hàng rào hỏng thì phải kêu, không được vắng mặt trong im lặng (P16).
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { danhGiaSuaTep, khoChungCua } from "./guard-tep-lib.mjs";

const CONG_CU = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
if (!CONG_CU.has(input?.tool_name)) process.exit(0);

try {
  const filePath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  // Kho của mình: nơi phiên khởi động (Claude Code và lớp chuyển tiếp cấp máy đều đặt CLAUDE_PROJECT_DIR); thiếu thì lấy kho chứa chính tệp móc này.
  const khoChung = khoChungCua(process.env.CLAUDE_PROJECT_DIR || dirname(fileURLToPath(import.meta.url)));
  const verdict = danhGiaSuaTep(filePath, { cwd: input.cwd || process.cwd(), khoChung });
  if (verdict.deny) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: verdict.reason } }));
  }
} catch (e) {
  process.stderr.write(`guard-tep: lỗi nội bộ, cho qua có khai — ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
process.exit(0);
