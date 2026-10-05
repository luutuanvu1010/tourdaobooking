#!/usr/bin/env node
// Móc PreToolUse cho công cụ Bash (đăng ký ở .claude/settings.json). Đọc JSON từ stdin, hỏi guard-remote-lib.mjs (lệnh cấm: push, deploy, ghi D1 remote…)
// rồi guard-luat-lib.mjs (sửa tệp luật bằng dòng lệnh — Hiến pháp N9), và nếu lệnh bị cấm thì trả quyết định "deny" cho Claude Code.
// Không bị cấm mà lệnh có dấu hiệu GHI vào docs/adr/ theo đường guard-luat không thấy (python/node heredoc, -c/-e, tệp script, vòng lặp, xargs)
// thì trả "ask" (hỏi chủ; luật `adr-bash-write`, chủ quyết "Siết lại" 30/9). THỨ TỰ CỐ ĐỊNH, deny luôn thắng ask:
//   (1) evaluateBash KHÔNG kèm script → deny thì in deny; (2) guard-luat → deny thì in deny; (3) chỉ khi đó mới đọc tệp script (I/O có thể chậm)
//   và gọi lại evaluateBash kèm nội dung script → ask thì in ask.
// Lỗi nội bộ/đầu vào hỏng → KHÔNG chặn (không khoá cả phiên); lớp thứ hai của lệnh cấm là permissions.deny, còn tệp luật thì cửa chính vẫn là luật `ask`
// cho công cụ sửa tệp.
import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { evaluateBash, mentionsGitMerge, scriptPaths } from "./guard-remote-lib.mjs";
import { danhGiaGhiLuat, gocKho } from "./guard-luat-lib.mjs";

const out = (decision, reason) =>
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: reason } }));

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

// (1) Lệnh cấm (push, deploy, D1 remote…) — chưa đọc tệp nào.
const remote = evaluateBash(command, { branch });
if (remote.deny) {
  out("deny", remote.reason);
  process.exit(0);
}

// (2) Sửa tệp luật bằng dòng lệnh — deny ở đây thắng mọi `ask`.
let luat = { deny: false };
try {
  luat = danhGiaGhiLuat(command, { cwd, root: gocKho(dirname(fileURLToPath(import.meta.url))) });
} catch {
  luat = { deny: false };
}
if (luat.deny) {
  out("deny", luat.reason);
  process.exit(0);
}

// (3) Luật HỎI docs/adr (30/9): đọc nội dung tệp script chạy bằng trình thông dịch (`python3 ~/.claude/jobs/…/duyet.py`) để thấy nó có ghi docs/adr không.
// Chỉ tệp thường (ống FIFO tên x.py sẽ làm treo), ≤ 256 KB; tệp lỗi/không có thì bỏ qua (không chặn).
const scripts = [];
for (const p of scriptPaths(command)) {
  try {
    const file = resolve(cwd, p.replace(/^~(?=\/)/, homedir()));
    const st = statSync(file);
    if (st.isFile() && st.size <= 256_000) scripts.push(readFileSync(file, "utf8"));
  } catch {
    /* bỏ qua */
  }
}
const verdict = scripts.length ? evaluateBash(command, { branch, scripts }) : remote;
if (verdict.deny) out("deny", verdict.reason);
else if (verdict.ask) out("ask", verdict.reason);
process.exit(0);
