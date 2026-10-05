#!/usr/bin/env node
// Móc PreToolUse cho công cụ Bash (đăng ký ở .claude/settings.json). Đọc JSON từ stdin, hỏi guard-remote-lib.mjs (lệnh cấm: push, deploy, ghi D1 remote…)
// rồi guard-luat-lib.mjs (sửa tệp luật bằng dòng lệnh — Hiến pháp N9), và nếu lệnh bị cấm thì trả quyết định "deny" cho Claude Code.
// Không bị cấm mà lệnh có dấu hiệu GHI vào docs/adr/ theo đường guard-luat không thấy (python/node heredoc, -c/-e, tệp script, vòng lặp, xargs)
// thì trả "ask" (hỏi chủ; luật `adr-bash-write`, chủ quyết "Siết lại" 30/9). THỨ TỰ CỐ ĐỊNH, deny luôn thắng ask:
//   (1) evaluateDenyOnly (KHÔNG chạy phần xét docs/adr) → deny thì in deny; (2) guard-luat → deny thì in deny; (3) chỉ khi CẢ HAI đã qua mới
//   chạy evaluateBash đầy đủ (xét docs/adr) không script → ask thì nhớ lại; (4) rồi mới đọc tệp script (I/O có thể chậm) và gọi lại evaluateBash
//   kèm nội dung script → ask thì in ask. Để phần xét docs/adr (có regex, có thể còn lỗ quay lui mũ chưa biết) không thể chặn đường vào bước
//   (2) của guard-luat — người kiểm độc lập 5/10 đo được một lỗ như vậy ở ADR_HINT (đã vá), chỗ này đổi THỨ TỰ để lớp phòng vệ không chỉ dựa
//   vào từng regex đúng, mà cấu trúc móc tự nó không cho lỗi ở (3)/(4) nuốt mất deny của (1)/(2).
// Lỗi nội bộ/đầu vào hỏng → KHÔNG chặn (không khoá cả phiên); lớp thứ hai của lệnh cấm là permissions.deny, còn tệp luật thì cửa chính vẫn là luật `ask`
// cho công cụ sửa tệp.
import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { evaluateBash, evaluateDenyOnly, mentionsGitMerge, scriptPaths } from "./guard-remote-lib.mjs";
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

// (1) Lệnh cấm thuần (push, deploy, D1 remote…) — KHÔNG chạy phần xét docs/adr, chưa đọc tệp nào.
const denyOnly = evaluateDenyOnly(command, { branch });
if (denyOnly.deny) {
  out("deny", denyOnly.reason);
  process.exit(0);
}

// (2) Sửa tệp luật bằng dòng lệnh — deny ở đây thắng mọi `ask`. Chạy TRƯỚC phần xét docs/adr (xem (3)) có chủ đích.
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

// (3) Chỉ bây giờ mới chạy evaluateBash đầy đủ (gồm phần xét docs/adr) — chưa kèm tệp script.
const remote = evaluateBash(command, { branch });
if (remote.deny) {
  out("deny", remote.reason); // phòng vệ: evaluateDenyOnly ở (1) đã dùng đúng luật deny này, không nên tới đây lần thứ hai
  process.exit(0);
}

// (4) Luật HỎI docs/adr (30/9): đọc nội dung tệp script chạy bằng trình thông dịch (`python3 ~/.claude/jobs/…/duyet.py`) để thấy nó có ghi docs/adr không.
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
