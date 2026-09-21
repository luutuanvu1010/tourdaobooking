#!/usr/bin/env node
// Móc PreToolUse cho công cụ Bash (đăng ký ở .claude/settings.json). Đọc JSON từ stdin, hỏi guard-remote-lib.mjs, và nếu lệnh bị cấm
// thì trả quyết định "deny" cho Claude Code. Lỗi nội bộ/đầu vào hỏng → KHÔNG chặn (không khoá cả phiên); lớp thứ hai là permissions.deny.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { evaluateBash, mentionsGitMerge } from "./guard-remote-lib.mjs";

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
if (input?.tool_name !== "Bash") process.exit(0);

const command = String(input?.tool_input?.command ?? "");
let branch = null;
if (mentionsGitMerge(command)) {
  try {
    branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: input.cwd || process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    branch = null;
  }
}

const verdict = evaluateBash(command, { branch });
if (verdict.deny) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: verdict.reason } }));
}
process.exit(0);
