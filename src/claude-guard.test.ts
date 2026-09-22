// Bộ kiểm cho đường ray ở mục "Git, triển khai, an toàn" của CLAUDE.md (.claude/hooks/guard-remote-lib.mjs + .claude/settings.json).
// Hiến pháp P16: một cơ chế chỉ được coi là đang hoạt động khi đã QUAN SÁT được nó chặn thật — nên có cả ca PHẢI CHẶN lẫn ca PHẢI CHO QUA
// (chặn nhầm cả phiên còn tệ hơn không chặn: chủ sẽ tắt hook). Kho ca lớn ở src/claude-guard.cases.json (người kiểm độc lập D soạn).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateBash } from "../.claude/hooks/guard-remote-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const CORPUS: { cmd: string; expect: "deny" | "allow"; group: "C" | "A" | "H" | "E" | "F" }[] = JSON.parse(read("src/claude-guard.cases.json")).cases;

const MUST_DENY = [
  "git push",
  "git push origin main",
  "git -C /tmp/x push",
  "/usr/bin/git push origin main",
  'bash -c "git push"',
  'echo "$(git push)"',
  "wrangler deploy",
  "CI=1 npx wrangler deploy",
  "npx wrangler@latest deploy",
  "wrangler --env prod deploy",
  "npx wrangler versions deploy",
  "wrangler versions upload",
  "wrangler secret put SESSION_SECRET",
  "npx wrangler secret list",
  "wrangler rollback",
  "wrangler dev --remote",
  "wrangler d1 migrations apply tourdao-sales-db --remote",
  'wrangler d1 execute tourdao-sales-db --remote --command "SELECT 1"',
  'wrangler d1 execute tourdao-sales-db --command "SELECT 1"',
  "wrangler d1 migrations apply x --remote && wrangler d1 migrations apply y --local", // --local của lệnh SAU không miễn cho lệnh TRƯỚC
  "npm run db:migrate:remote",
  "npm run -s db:migrate:remote",
  "node scripts/import-staff.mjs sheet.csv --db remote",
  "curl -X POST https://booking.tourdao.vn/api/auth/login -d '{}'",
  'curl -X "POST" https://booking.tourdao.vn/api/x',
  "curl -sSX DELETE https://booking.tourdao.vn/api/orders/1",
  "E2E_BASE_URL=https://booking.tourdao.vn node tests/e2e/orders.mjs",
  "gh pr merge 12",
];

const MUST_ALLOW = [
  "git status",
  "git commit -F msg.txt",
  'git commit -m "không dùng git push ở đây"',
  "git commit -m \"$(cat <<'EOF'\nTiêu đề\n\nThân có nhắc git push và wrangler deploy.\nEOF\n)\"",
  "cat > docs/x.md <<'EOF'\nchạy wrangler deploy rồi git push\nEOF",
  "git worktree add -b nhanh-moi ../x origin/main",
  "git rebase main",
  "npm test",
  "npm run dict",
  "wrangler dev",
  "npx wrangler d1 migrations apply tourdao-sales-db --local",
  "wrangler d1 execute tourdao-sales-db --local --file seed.sql",
  "wrangler d1 migrations list tourdao-sales-db --remote",
  "wrangler versions list",
  "wrangler deployments list",
  "node scripts/audit-invariants.mjs --db remote",
  "curl -s https://booking.tourdao.vn/api/auth/config",
  "curl -sG --data-urlencode q=abc https://booking.tourdao.vn/api/company",
  "curl -X POST https://example.com/hook -d x",
  "gh pr view 3",
  'grep -n "git push" CLAUDE.md',
];

test("guard-remote: mọi lệnh cấm bị chặn, lý do trỏ về CLAUDE.md", () => {
  for (const cmd of MUST_DENY) {
    const v = evaluateBash(cmd, { branch: "worktree-x" });
    assert.equal(v.deny, true, `phải CHẶN: ${cmd}`);
    if (v.deny) assert.match(v.reason, /CLAUDE\.md/, `lý do phải trỏ CLAUDE.md: ${cmd}`);
  }
});

test("guard-remote: lệnh thường ngày và heredoc/thông điệp nhắc chuỗi cấm đều cho qua (chặn nhầm là lỗi)", () => {
  for (const cmd of MUST_ALLOW) assert.equal(evaluateBash(cmd, { branch: "worktree-x" }).deny, false, `phải CHO QUA: ${cmd}`);
});

test("guard-remote: git merge chỉ bị chặn ở main/master, khi không rõ nhánh, hoặc khi đổi thư mục/nhánh ngay trước đó", () => {
  assert.equal(evaluateBash("git merge worktree-x", { branch: "main" }).deny, true);
  assert.equal(evaluateBash("git merge worktree-x", { branch: null }).deny, true);
  assert.equal(evaluateBash("git checkout main && git merge worktree-x", { branch: "worktree-x" }).deny, true);
  assert.equal(evaluateBash("git -C /repo/goc merge worktree-x", { branch: "worktree-x" }).deny, true);
  assert.equal(evaluateBash("git merge main", { branch: "worktree-x" }).deny, false);
  assert.equal(evaluateBash("git merge --abort", { branch: "worktree-x" }).deny, false);
});

test("guard-remote: kho ca của người kiểm — nhóm C (quên/nhầm) phải chặn; nhóm A và H phải cho qua", () => {
  const groups = (g: string) => CORPUS.filter((c) => c.group === g);
  assert.ok(groups("C").length >= 100 && groups("A").length >= 50 && groups("H").length >= 5, "kho ca bị cắt bớt?");
  const wrong: string[] = [];
  for (const c of CORPUS) {
    if (c.group === "E") continue; // cố ý lách: chấp nhận lọt (ghi ở đầu guard-remote-lib.mjs)
    const denied = evaluateBash(c.cmd, { branch: "worktree-x" }).deny;
    if (denied !== (c.expect === "deny")) wrong.push(`[${c.group}] ${denied ? "chặn nhầm" : "lọt"}: ${JSON.stringify(c.cmd)}`);
  }
  assert.deepEqual(wrong, [], `${wrong.length} ca sai:\n${wrong.slice(0, 15).join("\n")}`);
});

test("guard-remote: lệnh dị dạng không làm hook quá giờ (timeout 10 s của hook)", () => {
  const started = Date.now();
  evaluateBash("echo " + "$(".repeat(3000), { branch: "worktree-x" });
  evaluateBash("x".repeat(500_000), { branch: "worktree-x" });
  assert.ok(Date.now() - started < 1500, `quá chậm: ${Date.now() - started} ms`);
});

test("guard-remote: script móc trả deny khi cấm, im lặng khi cho qua hoặc đầu vào hỏng", () => {
  const run = (stdin: string) => spawnSync("node", [".claude/hooks/guard-remote.mjs"], { cwd: ROOT, input: stdin, encoding: "utf8" });
  const denied = run(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git push origin main" }, cwd: ROOT }));
  assert.equal(denied.status, 0);
  const out = JSON.parse(denied.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  for (const stdin of [JSON.stringify({ tool_name: "Bash", tool_input: { command: "npm test" }, cwd: ROOT }), JSON.stringify({ tool_name: "Write", tool_input: { file_path: "x" } }), "không phải JSON", ""]) {
    const r = run(stdin);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "", `phải im lặng với: ${stdin.slice(0, 30)}`);
  }
});

test("settings.json: khai móc PreToolUse cho Bash và luật deny (lớp hai, P21)", () => {
  const s = JSON.parse(read(".claude/settings.json"));
  const hooks = s.hooks?.PreToolUse?.filter((h: { matcher: string }) => h.matcher === "Bash").flatMap((h: { hooks: { command: string }[] }) => h.hooks) ?? [];
  assert.ok(hooks.some((h: { command: string }) => h.command.includes(".claude/hooks/guard-remote.mjs")), "thiếu móc guard-remote cho matcher Bash");
  const deny: string[] = s.permissions?.deny ?? [];
  for (const rule of ["Bash(git push)", "Bash(git push *)", "Bash(wrangler deploy *)", "Bash(wrangler secret *)"]) assert.ok(deny.includes(rule), `thiếu luật deny: ${rule}`);
});

test(".gitignore: settings và móc phải được commit (không còn bỏ qua cả thư mục .claude/)", () => {
  const lines = read(".gitignore").split("\n").map((l) => l.trim());
  assert.ok(!lines.includes(".claude/") && !lines.includes(".claude"), ".claude/ đang bị bỏ qua nguyên thư mục");
  for (const keep of [".claude/settings.json", ".claude/hooks"]) assert.ok(!lines.some((l) => l === keep || l === `${keep}/`), `${keep} đang bị bỏ qua`);
  assert.ok(lines.includes(".claude/worktrees/"), "phải bỏ qua .claude/worktrees/");
});
