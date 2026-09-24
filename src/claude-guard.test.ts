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

// Hai lệnh chủ dự án tự gõ (đặc tả docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md, tiêu chí 6): AI không được chạy dưới mọi dạng hook nhận diện.
const RELEASE_MUST_DENY = [
  "npm run day-len",
  "npm run day-len -- worktree-thi-cong-passkey",
  "npm run trien-khai",
  "npm run -s trien-khai",
  "npm run-script day-len",
  "npm --prefix /repo run trien-khai",
  "CI=1 npm run trien-khai",
  "pnpm day-len",
  "yarn trien-khai",
  "bun run day-len",
  "node scripts/day-len.mjs",
  "node scripts/trien-khai.mjs",
  "node ./scripts/day-len.mjs worktree-x",
  "node --no-warnings scripts/trien-khai.mjs",
  "node /Users/x/tourdao-sales/scripts/trien-khai.mjs",
  "./scripts/day-len.mjs",
  "cd /repo && ./scripts/trien-khai.mjs",
  "npm test && npm run day-len",
  "cd /repo && npm run trien-khai",
  'bash -c "npm run day-len"',
  "echo $(node scripts/trien-khai.mjs)",
  "echo `npm run trien-khai`",
];
const RELEASE_MUST_ALLOW = [
  "git add scripts/day-len.mjs scripts/trien-khai.mjs scripts/release-lib.mjs",
  "cat scripts/day-len.mjs",
  "ls -la scripts/trien-khai.mjs",
  "sed -n 1,40p scripts/release-lib.mjs",
  'grep -n "npm run day-len" docs/HANDOFF-N1.md',
  'git commit -m "thêm npm run trien-khai và node scripts/day-len.mjs"',
  "cat > docs/x.md <<'EOF'\nChủ chạy npm run trien-khai rồi node scripts/day-len.mjs\nEOF",
  "node --test src/release-lib.test.ts",
  "npm test",
  "npm run typecheck",
  "npm run build:web",
  "node scripts/audit-invariants.mjs --db local",
  "git log --oneline -- scripts/day-len.mjs",
];

test("guard-remote: chặn AI chạy `npm run day-len`/`trien-khai` và `node scripts/day-len.mjs`/`trien-khai.mjs` (tiêu chí 6)", () => {
  for (const cmd of RELEASE_MUST_DENY) {
    const v = evaluateBash(cmd, { branch: "worktree-x" });
    assert.equal(v.deny, true, `phải CHẶN: ${cmd}`);
    if (v.deny) {
      assert.equal(v.rule, "release-owner-only", `sai luật: ${cmd}`);
      assert.match(v.reason, /CLAUDE\.md/);
      // Hai lệnh cần TTY thật: lý do phải chỉ chủ sang ứng dụng Terminal của macOS, KHÔNG gợi ý `! <lệnh>` như các luật khác.
      assert.match(v.reason, /ứng dụng Terminal/, `lý do phải chỉ sang Terminal: ${cmd}`);
      assert.doesNotMatch(v.reason, /`! <lệnh>`/, `lý do không được gợi ý \`! <lệnh>\`: ${cmd}`);
    }
  }
});

test("guard-remote: đọc/sửa/commit/test hai kịch bản đẩy/triển khai vẫn cho qua (chặn nhầm là lỗi)", () => {
  for (const cmd of RELEASE_MUST_ALLOW) assert.equal(evaluateBash(cmd, { branch: "worktree-x" }).deny, false, `phải CHO QUA: ${cmd}`);
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
  assert.ok(groups("C").length >= 100 && groups("A").length >= 50 && groups("H").length >= 5 && groups("F").length >= 4, "kho ca bị cắt bớt?");
  const wrong: string[] = [];
  for (const c of CORPUS) {
    if (c.group === "E") continue; // cố ý lách: chấp nhận lọt (ghi ở đầu guard-remote-lib.mjs)
    const denied = evaluateBash(c.cmd, { branch: "worktree-x" }).deny;
    if (denied !== (c.expect === "deny")) wrong.push(`[${c.group}] ${denied ? "chặn nhầm" : "lọt"}: ${JSON.stringify(c.cmd)}`);
  }
  assert.deepEqual(wrong, [], `${wrong.length} ca sai:\n${wrong.slice(0, 15).join("\n")}`);
});

test("guard-remote: lệnh dị dạng không làm hook quá giờ (timeout 10 s của hook)", () => {
  // Đo thời gian CPU của chính tiến trình (process.cpuUsage), không đo đồng hồ: máy bận vì việc khác (nhiều phiên song song)
  // từng đẩy thời gian đồng hồ lên 2–2,3 s và chặn nhầm `day-len`/`trien-khai`, trong khi hook vẫn chạy ~0,6 s. evaluateBash chạy
  // đồng bộ, không chờ I/O, nên chậm thật của hook = tốn CPU và vẫn bị bắt. Ngưỡng giữ 1500 ms (chủ chọn 2026-09-24).
  // TIỀN ĐỀ: guard-remote-lib.mjs thuần, không import, không đọc tệp/execSync/Atomics.wait. Thêm chờ đồng bộ vào đó thì test
  // này BỎ LỌT (kiểm độc lập đã chứng minh bằng Atomics.wait 1 s) — khi ấy phải đo lại bằng đồng hồ hoặc thêm test riêng.
  const cpu = process.cpuUsage();
  evaluateBash("echo " + "$(".repeat(3000), { branch: "worktree-x" });
  evaluateBash("x".repeat(500_000), { branch: "worktree-x" });
  const used = process.cpuUsage(cpu);
  const ms = Math.round((used.user + used.system) / 1000);
  assert.ok(ms < 1500, `quá chậm: ${ms} ms CPU`);
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
  for (const cmd of ["npm run day-len", "npm run trien-khai", "node scripts/day-len.mjs", "node scripts/trien-khai.mjs"]) {
    for (const rule of [`Bash(${cmd})`, `Bash(${cmd} *)`]) assert.ok(deny.includes(rule), `thiếu luật deny: ${rule}`);
  }
});

test("guard-remote: script móc thật trả deny cho `npm run day-len` và `node scripts/trien-khai.mjs`", () => {
  for (const command of ["npm run day-len", "node scripts/trien-khai.mjs"]) {
    const r = spawnSync("node", [".claude/hooks/guard-remote.mjs"], { cwd: ROOT, input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd: ROOT }), encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout || "{}").hookSpecificOutput?.permissionDecision, "deny", `móc phải chặn: ${command}`);
  }
});

test(".gitignore: settings và móc phải được commit (không còn bỏ qua cả thư mục .claude/)", () => {
  const lines = read(".gitignore").split("\n").map((l) => l.trim());
  assert.ok(!lines.includes(".claude/") && !lines.includes(".claude"), ".claude/ đang bị bỏ qua nguyên thư mục");
  for (const keep of [".claude/settings.json", ".claude/hooks"]) assert.ok(!lines.some((l) => l === keep || l === `${keep}/`), `${keep} đang bị bỏ qua`);
  assert.ok(lines.includes(".claude/worktrees/"), "phải bỏ qua .claude/worktrees/");
});
