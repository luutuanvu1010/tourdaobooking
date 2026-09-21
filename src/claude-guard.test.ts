// Bộ kiểm cho đường ray CLAUDE.md §6 (.claude/hooks/guard-remote-lib.mjs + .claude/settings.json). Hiến pháp P16: một cơ chế chỉ được coi là
// đang hoạt động khi đã QUAN SÁT được nó chặn thật — nên bảng dưới có cả ca PHẢI CHẶN lẫn ca PHẢI CHO QUA (chặn nhầm cả phiên còn tệ hơn không chặn).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateBash } from "../.claude/hooks/guard-remote-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const MUST_DENY = [
  "git push",
  "git push origin main",
  "git push --force origin HEAD",
  "git -C /tmp/x push",
  "git -c user.name=x push",
  "git --no-pager push",
  "/usr/bin/git push origin main",
  "cd web && git push",
  "echo xong; git push",
  'bash -c "git push"',
  "sh -c 'git push origin main'",
  'eval "git push"',
  'echo "$(git push)"',
  "echo `git push`",
  "ls | xargs -I{} git push {}",
  "wrangler deploy",
  "CI=1 npx wrangler deploy",
  "npx wrangler versions deploy",
  "wrangler --env prod deploy",
  "wrangler secret put SESSION_SECRET",
  "npx wrangler secret list",
  "wrangler rollback",
  "wrangler d1 migrations apply tourdao-sales-db --remote",
  'wrangler d1 execute tourdao-sales-db --remote --command "SELECT 1"',
  'wrangler d1 execute tourdao-sales-db --command "SELECT 1"',
  "npm run db:migrate:remote",
  "node scripts/import-staff.mjs sheet.csv --db remote",
  "curl -X POST https://booking.tourdao.vn/api/auth/login -d '{}'",
  "curl -d x https://booking.tourdao.vn/api/x",
  `curl --data-raw '{"a":1}' "https://booking.tourdao.vn/api/x"`,
  "curl -X DELETE 'https://booking.tourdao.vn/api/orders/1'",
  "wget --post-data=a https://booking.tourdao.vn/",
  "gh pr merge 12",
];

const MUST_ALLOW = [
  "git status",
  "git add -A",
  "git commit -F msg.txt",
  'git commit -m "không dùng git push ở đây"',
  "git log --oneline -3",
  "git diff",
  "git worktree add -b nhanh-moi ../x origin/main",
  "git branch --unset-upstream",
  "git fetch",
  "git rebase main",
  "git checkout -b nhanh-moi",
  "npm test",
  "npm run typecheck",
  "npm run dict",
  "npm run db:migrate:local",
  "npm run build:web",
  "wrangler dev",
  "npx wrangler types",
  "npx wrangler d1 migrations apply tourdao-sales-db --local",
  "wrangler d1 execute tourdao-sales-db --local --file seed.sql",
  "wrangler d1 migrations list tourdao-sales-db --remote",
  "wrangler whoami",
  "wrangler tail",
  "node scripts/audit-invariants.mjs --db remote",
  "node scripts/audit-invariants.mjs --db local",
  "node scripts/import-staff.mjs sheet.csv --db local",
  "curl -s https://booking.tourdao.vn/api/auth/config",
  "curl -s -o /dev/null -w '%{http_code}' https://booking.tourdao.vn/api/company",
  "curl -I https://booking.tourdao.vn",
  "curl -X POST https://example.com/hook -d x",
  "gh pr view 3",
  'echo "wrangler deploy"',
  'grep -n "git push" CLAUDE.md',
  "ls -la",
];

test("guard-remote: mọi lệnh cấm đều bị chặn", () => {
  for (const cmd of MUST_DENY) {
    const v = evaluateBash(cmd, { branch: "worktree-x" });
    assert.equal(v.deny, true, `phải CHẶN: ${cmd}`);
    if (v.deny) assert.match(v.reason, /CLAUDE\.md §6/, `lý do phải trỏ CLAUDE.md §6: ${cmd}`);
  }
});

test("guard-remote: lệnh thường ngày cho qua (chặn nhầm là lỗi)", () => {
  for (const cmd of MUST_ALLOW) assert.equal(evaluateBash(cmd, { branch: "worktree-x" }).deny, false, `phải CHO QUA: ${cmd}`);
});

test("guard-remote: git merge chỉ bị chặn ở main/master hoặc khi không rõ nhánh", () => {
  assert.equal(evaluateBash("git merge worktree-x", { branch: "main" }).deny, true);
  assert.equal(evaluateBash("git merge worktree-x", { branch: "master" }).deny, true);
  assert.equal(evaluateBash("git merge worktree-x", { branch: null }).deny, true);
  assert.equal(evaluateBash("git merge main", { branch: "worktree-x" }).deny, false);
  assert.equal(evaluateBash("git merge --abort", { branch: "worktree-x" }).deny, false);
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

test("settings.json: khai móc PreToolUse cho Bash và hai lớp chặn độc lập (P21)", () => {
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
