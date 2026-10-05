// Bộ kiểm cho đường ray ở mục "Git, triển khai, an toàn" của CLAUDE.md (.claude/hooks/guard-remote-lib.mjs + .claude/settings.json).
// Hiến pháp P16: một cơ chế chỉ được coi là đang hoạt động khi đã QUAN SÁT được nó chặn thật — nên có cả ca PHẢI CHẶN lẫn ca PHẢI CHO QUA
// (chặn nhầm cả phiên còn tệ hơn không chặn: chủ sẽ tắt hook). Kho ca lớn ở src/claude-guard.cases.json (người kiểm độc lập D soạn).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateBash, scriptPaths } from "../.claude/hooks/guard-remote-lib.mjs";

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

// Bài ĐO GIỜ của hook ở tệp riêng src/claude-guard-thoi-gian.test.ts — `npm test` chạy nó MỘT MÌNH sau bộ chính (chủ "Trả lời lần 15", 30/9). Bài dưới canh
// cách chạy đó không bị lặng lẽ bỏ: `npm test` = scripts/chay-test.mjs; kịch bản chạy tệp đo giờ riêng, song song 1; tệp đo giờ giữ ngưỡng + cách đo.
test("guard-remote: bài đo giờ chạy RIÊNG trong npm test (chủ lần 15) — ngưỡng 1500 ms CPU, 3 lần lấy nhanh nhất, không công tắc bỏ qua", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts.test, "node scripts/chay-test.mjs", "npm test phải đi qua kịch bản tách bài đo giờ");
  const kb = read("scripts/chay-test.mjs");
  assert.match(kb, /const TEP_DO_GIO = "src\/claude-guard-thoi-gian\.test\.ts";/);
  assert.match(kb, /\["--test", "--test-concurrency=1", TEP_DO_GIO\]/, "bước 2 chạy tệp đo giờ một mình");
  assert.match(kb, /process\.exit\(ma\(b1\) !== 0 \? ma\(b1\) : ma\(b2\)\)/, "một trong hai bước đỏ ⇒ thoát ≠ 0");
  const doGio = read("src/claude-guard-thoi-gian.test.ts");
  assert.match(doGio, /assert\.ok\(ms < 1500,/, "ngưỡng giữ 1500 ms");
  assert.match(doGio, /for \(let i = 0; i < 3; i\+\+\)/, "đo 3 lần");
  assert.match(doGio, /const ms = Math\.min\(\.\.\.runs\);/, "lấy lần nhanh nhất");
  assert.match(doGio, /process\.cpuUsage\(/, "đo CPU, không đo đồng hồ");
  assert.doesNotMatch(doGio, /\b(skip|todo)\b|process\.env/, "không công tắc bỏ qua");
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

// ─── Luật HỎI: ghi vào docs/adr/ bằng Bash (chủ quyết "Siết lại" 30/9) ─────────────────────────────────────────────
// Sự cố thật 30/9 (nguyên văn rút gọn): trợ lý ghi docs/adr/README.md bằng python3 heredoc → hộp hỏi `ask: Edit(docs/adr/**)` không hiện.
const SU_CO_30_9 = `python3 - <<'EOF'
p='docs/adr/README.md';s=open(p,encoding='utf-8').read()
a="| — | (số ADR mới kế tiếp là 0062) | | |"
assert a in s
s=s.replace(a,"""| — | (số ADR mới kế tiếp là 0066) | | |""")
open(p,'w',encoding='utf-8').write(s)
EOF
echo done`;
const ADR_MUST_ASK = [
  SU_CO_30_9,
  "echo x > docs/adr/README.md",
  "echo x >> docs/adr/ADR-0001-x.md",
  'echo x > "docs/adr/a b.md"',
  "cat <<'EOF' > docs/adr/ADR-0099-moi.md\n# ADR\nEOF",
  "printf a | tee -a docs/adr/README.md",
  "sed -i '' 's/proposed/accepted/' docs/adr/ADR-0057-x.md",
  "cd /repo && sed -i.bak -e 's/a/b/' docs/adr/README.md",
  "perl -pi -e 's/a/b/' docs/adr/README.md",
  "cp /tmp/adr-nhap/ADR-0062.md docs/adr/",
  "mv docs/adr/ADR-0062-a.md docs/adr/ADR-0063-a.md",
  "rm docs/adr/ADR-0062-a.md",
  "touch docs/adr/ADR-0099.md",
  "git rm docs/adr/ADR-0062-a.md",
  "find docs/adr -name '*.bak' -delete",
  "python3 -c \"open('docs/adr/x.md','w').write('a')\"",
  "python3 -c \"import os; open(os.path.join('docs','adr','README.md'),'w')\"",
  "node -e \"require('fs').writeFileSync('docs/adr/README.md', 'x')\"",
  "cat <<'EOF' | node\nrequire('fs').appendFileSync('docs/adr/README.md', 'x')\nEOF",
  "python3 - <<'PY'\nfrom pathlib import Path\nPath('docs/adr/README.md').write_text('x')\nPY",
  "python3 -c \"from pathlib import Path; (Path('.') / 'docs' / 'adr' / 'README.md').write_text('x')\"",
  // Đường dẫn và lệnh ghi ở hai đoạn khác nhau (vòng lặp, xargs).
  "for f in docs/adr/*.md; do sed -i '' 's/a/b/' \"$f\"; done",
  "grep -l proposed docs/adr/*.md | xargs sed -i '' 's/proposed/accepted/'",
  "for f in docs/adr/ADR-00*.md; do echo x >> \"$f\"; done",
];
const ADR_MUST_PASS = [
  "cat docs/adr/README.md",
  "grep -rn accepted docs/adr",
  "git show HEAD:docs/adr/README.md",
  "git diff -- docs/adr",
  "git log --oneline -- docs/adr",
  "sed -n 1,40p docs/adr/ADR-0057-x.md",
  "cat docs/adr/README.md > /tmp/y.md",
  "cp docs/adr/ADR-0057-x.md /tmp/",
  "ls docs/adr | tail -4",
  "wc -l docs/adr/*.md",
  "grep -n rm docs/adr/README.md",
  "python3 -c \"print(open('docs/adr/README.md').read())\"",
  "node -e \"console.log(require('fs').readFileSync('docs/adr/README.md','utf8'))\"",
  "git add docs/adr/ADR-0099.md && git commit -F /tmp/msg.txt",
  // Thông điệp commit (heredoc nạp vào `cat`, không phải trình thông dịch) nhắc python/docs/adr/open(…,'w') — dữ liệu, không phải lệnh.
  "git commit -m \"$(cat <<'EOF'\nSiết: python3 ghi docs/adr bằng open(p,'w') hay writeFileSync phải hỏi chủ\nEOF\n)\"",
  "cat > docs/superpowers/specs/x.md <<'EOF'\nTrợ lý chạy python3 open('docs/adr/README.md','w') qua Bash\nEOF",
  "node --test src/claude-guard.test.ts",
  'for f in docs/adr/*.md; do grep -c accepted "$f"; done',
  "ls docs/adr | xargs -n1 basename",
  'for f in docs/adr/*.md; do head -3 "$f" > /tmp/dau.txt; done',
  // Giới hạn đã ghi (chặn nhầm/quên, không chống cố ý lách): git merge/checkout đưa thay đổi docs/adr vào KHÔNG bị luật HỎI bắt
  // (ở mức móc thật, `git checkout -- docs/adr/…` vẫn bị guard-luat DENY — xem bài "deny thắng ask" ở mức móc bên dưới).
  "git merge worktree-x",
  "git checkout main -- docs/adr/README.md",
];

test("guard-remote: lệnh Bash GHI vào docs/adr/ trả ask (không deny), lý do chỉ sang công cụ Edit/Write", () => {
  for (const cmd of ADR_MUST_ASK) {
    const v = evaluateBash(cmd, { branch: "worktree-x" });
    assert.equal(v.deny, false, `không được DENY: ${cmd}`);
    assert.equal(v.ask, true, `phải HỎI: ${cmd}`);
    assert.equal(v.rule, "adr-bash-write");
    assert.match(v.reason ?? "", /Sửa docs\/adr\/ phải qua công cụ Edit\/Write để chủ duyệt/);
  }
});

test("guard-remote: đọc docs/adr/ (cat, grep, git show/diff, sed -n, python chỉ đọc) và thông điệp commit không bị hỏi", () => {
  for (const cmd of ADR_MUST_PASS) {
    const v = evaluateBash(cmd, { branch: "worktree-x" });
    assert.equal(v.deny, false, `không được DENY: ${cmd}`);
    assert.ok(!v.ask, `không được HỎI: ${cmd}`);
  }
});

test("guard-remote: deny thắng ask khi lệnh vừa ghi docs/adr vừa git push", () => {
  const v = evaluateBash("echo x > docs/adr/README.md && git push origin main", { branch: "worktree-x" });
  assert.equal(v.deny, true);
  assert.equal(v.rule, "git-push");
});

test("guard-remote: luật docs/adr không làm lệnh nào trong các danh sách cho qua / kho ca nhóm A, H bị hỏi nhầm", () => {
  const pass = [...MUST_ALLOW, ...RELEASE_MUST_ALLOW, ...CORPUS.filter((c) => c.group === "A" || c.group === "H").map((c) => c.cmd)];
  const hoiNham = pass.filter((cmd) => evaluateBash(cmd, { branch: "worktree-x" }).ask);
  assert.deepEqual(hoiNham, []);
});

test("guard-remote: script tệp (`python3 /tmp/x.py`) ghi docs/adr → hỏi; script chỉ đọc hoặc `node --test` → không hỏi", () => {
  const ghi = 'D = "docs/adr/"\npath = D + "README.md"\ns = open(path, encoding="utf-8").read()\nopen(path, "w", encoding="utf-8").write(s)\n';
  const doc = 'print(open("docs/adr/README.md", encoding="utf-8").read())\n';
  assert.equal(evaluateBash("python3 /tmp/ghi_duyet.py && git status --short", { branch: "worktree-x", scripts: [ghi] }).ask, true);
  assert.ok(!evaluateBash("python3 /tmp/doc.py", { branch: "worktree-x", scripts: [doc] }).ask);
  assert.deepEqual(scriptPaths("python3 ~/.claude/jobs/x/tmp/duyet_0057.py && node --test src/a.test.ts && node scripts/b.mjs"), ["~/.claude/jobs/x/tmp/duyet_0057.py", "scripts/b.mjs"]);
});

test("guard-remote: script móc thật trả `ask` cho sự cố 30/9 và cho script tệp ghi ADR; im lặng khi chỉ đọc", () => {
  const run = (command: string) =>
    spawnSync("node", [".claude/hooks/guard-remote.mjs"], { cwd: ROOT, input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd: ROOT }), encoding: "utf8" });
  const hoi = (command: string) => JSON.parse(run(command).stdout || "{}").hookSpecificOutput;
  const o = hoi(SU_CO_30_9);
  assert.equal(o?.permissionDecision, "ask");
  assert.match(o?.permissionDecisionReason ?? "", /Sửa docs\/adr\/ phải qua công cụ Edit\/Write để chủ duyệt/);
  const dir = mkdtempSync(join(tmpdir(), "guard-adr-"));
  const tep = join(dir, "duyet.py");
  writeFileSync(tep, 'D = "docs/adr/"\nopen(D + "README.md", "w", encoding="utf-8").write("x")\n');
  assert.equal(hoi(`python3 ${tep} && git status --short`)?.permissionDecision, "ask", "script tệp ghi docs/adr phải hỏi");
  writeFileSync(tep, 'print(open("docs/adr/README.md").read())\n');
  assert.equal(run(`python3 ${tep}`).stdout, "", "script chỉ đọc phải im lặng");
  assert.equal(run("cat docs/adr/README.md").stdout, "");
  rmSync(dir, { recursive: true, force: true });
  // Các đường guard-luat nói rõ không thấy (vòng lặp, xargs, node -e) — ở mức móc thật vẫn phải HỎI (không im lặng).
  for (const command of [
    "for f in docs/adr/*.md; do sed -i '' 's/a/b/' \"$f\"; done",
    "grep -l proposed docs/adr/*.md | xargs sed -i '' 's/proposed/accepted/'",
    "node -e \"require('fs').writeFileSync('docs/adr/README.md', 'x')\"",
  ]) assert.equal(hoi(command)?.permissionDecision, "ask", `móc phải hỏi: ${command}`);
});

test("guard-remote: script móc thật — DENY (lệnh cấm hoặc guard-luat) luôn thắng ASK của luật docs/adr", () => {
  const quyet = (command: string) =>
    JSON.parse(
      spawnSync("node", [".claude/hooks/guard-remote.mjs"], { cwd: ROOT, input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd: ROOT }), encoding: "utf8" }).stdout || "{}",
    ).hookSpecificOutput;
  // Thư viện tự nó trả ask cho các lệnh này; ở mức móc, guard-luat (chặn hẳn sửa tệp luật bằng dòng lệnh) phải thắng.
  for (const command of [
    "echo x > docs/adr/README.md",
    "sed -i '' 's/proposed/accepted/' docs/adr/ADR-0057-x.md",
    "rm docs/adr/ADR-0062-a.md",
    "cp /tmp/adr-nhap/ADR-0062.md docs/adr/",
    `${SU_CO_30_9}\nsed -i '' 's/a/b/' CLAUDE.md`,
  ]) {
    assert.equal(evaluateBash(command, { branch: "worktree-x" }).ask, true, `tiền đề: thư viện phải HỎI: ${command.slice(-60)}`);
    const o = quyet(command);
    assert.equal(o?.permissionDecision, "deny", `guard-luat phải thắng ask: ${command.slice(-60)}`);
    assert.match(o?.permissionDecisionReason ?? "", /tệp luật/);
  }
  // Lệnh cấm của guard-remote (git push) đi kèm lệnh ghi ADR bằng python heredoc → deny, không ask.
  const p = quyet(`${SU_CO_30_9} && git push origin main`);
  assert.equal(p?.permissionDecision, "deny");
  assert.match(p?.permissionDecisionReason ?? "", /git push/);
  // `git checkout -- docs/adr/…` thư viện không hỏi, nhưng guard-luat chặn ⇒ móc deny (không bị nới).
  assert.equal(quyet("git checkout main -- docs/adr/README.md")?.permissionDecision, "deny");
});

test(".gitignore: settings và móc phải được commit (không còn bỏ qua cả thư mục .claude/)", () => {
  const lines = read(".gitignore").split("\n").map((l) => l.trim());
  assert.ok(!lines.includes(".claude/") && !lines.includes(".claude"), ".claude/ đang bị bỏ qua nguyên thư mục");
  for (const keep of [".claude/settings.json", ".claude/hooks"]) assert.ok(!lines.some((l) => l === keep || l === `${keep}/`), `${keep} đang bị bỏ qua`);
  assert.ok(lines.includes(".claude/worktrees/"), "phải bỏ qua .claude/worktrees/");
});
