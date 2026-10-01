#!/usr/bin/env node
// Móc PreToolUse cho công cụ Bash (đăng ký ở .claude/settings.json). Đọc JSON từ stdin, hỏi guard-remote-lib.mjs (lệnh cấm: push, deploy, ghi D1 remote…)
// rồi guard-luat-lib.mjs (sửa tệp luật bằng dòng lệnh — Hiến pháp N9), và nếu lệnh bị cấm thì trả quyết định "deny" cho Claude Code.
// Lỗi nội bộ/đầu vào hỏng → KHÔNG chặn (không khoá cả phiên); lớp thứ hai của lệnh cấm là permissions.deny, còn tệp luật thì cửa chính vẫn là luật `ask`
// cho công cụ sửa tệp.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateBash, mentionsGitMerge } from "./guard-remote-lib.mjs";
import { danhGiaGhiLuat, gocKho } from "./guard-luat-lib.mjs";

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
if (input?.tool_name !== "Bash") process.exit(0);

const command = String(input?.tool_input?.command ?? "");
const cwd = input.cwd || process.cwd();
let branch = null;
if (mentionsGitMerge(command)) {
  try {
    branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    branch = null;
  }
}

let verdict = evaluateBash(command, { branch });
if (!verdict.deny) {
  try {
    verdict = danhGiaGhiLuat(command, { cwd, root: gocKho(dirname(fileURLToPath(import.meta.url))) });
  } catch {
    verdict = { deny: false };
  }
}
if (verdict.deny) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: verdict.reason } }));
}
process.exit(0);
