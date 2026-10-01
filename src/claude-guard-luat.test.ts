// Bộ kiểm cho hàng rào "không sửa tệp luật bằng dòng lệnh" (.claude/hooks/guard-luat-lib.mjs, gọi từ móc guard-remote.mjs) — Hiến pháp N9, CLAUDE.md §3.
// Luật `ask` ở .claude/settings.json chỉ hỏi chủ khi AI sửa tệp luật bằng CÔNG CỤ SỬA TỆP; cùng tệp đó sửa bằng `sed -i`, `>`, `cp`, `rm`, `git checkout -- …`
// thì trước đây không ai hỏi. Hàng rào này chặn đường vòng đó và trỏ AI về công cụ sửa tệp (để chủ được hỏi). Có cả ca PHẢI CHẶN lẫn ca PHẢI CHO QUA
// (đọc, commit, chép RA ngoài, dọn worktree… — chặn nhầm là lỗi). Đặc tả: docs/superpowers/specs/2026-10-01-ba-hook-moi.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { danhGiaGhiLuat, gocKho } from "../.claude/hooks/guard-luat-lib.mjs";

const HERE = fileURLToPath(new URL("../", import.meta.url));
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const ROOT = "/repo";
const WT = "/repo/.claude/worktrees/x";
const danhGia = (cmd: string, cwd = ROOT) => danhGiaGhiLuat(cmd, { cwd, root: ROOT });

const PHAI_CHAN: [string, string?][] = [
  ["sed -i '' 's/a/b/' CLAUDE.md"],
  ["sed -i.bak -e 's/a/b/' src/CLAUDE.md"],
  ["sed -E -i '' 's/a/b/' \"web/CLAUDE.md\""],
  ["perl -pi -e 's/a/b/' CLAUDE.md"],
  ["perl -MList::Util=sum -pi -e 's/a/b/' CLAUDE.md"],
  ["echo x >> CLAUDE.md"],
  ["echo x >CLAUDE.md"],
  ["cat > CLAUDE.md <<'EOF'\nluật mới\nEOF"],
  ["printf x | tee -a .claude/settings.json"],
  ["cp /tmp/x.mjs .claude/hooks/guard-remote.mjs"],
  ["cp /tmp/x.mjs .claude/hooks/"],
  ["cp /tmp/CLAUDE.md ."],
  ["cp -r /tmp/adr docs/"],
  ["mv .claude/hooks/guard-remote.mjs /tmp/"],
  ["mv /tmp/moi.md docs/adr/0099-moi.md"],
  ["rm playbook/CONSTITUTION.md"],
  ["rm -rf .claude"],
  ["rm -f .claude/hooks/*.mjs"],
  ["rm .claude/agents/nguoi-kiem-doc-lap.md"],
  ["truncate -s 0 .claude/settings.local.json"],
  ["git checkout main -- docs/adr/0001-x.md"],
  ["git restore CLAUDE.md"],
  ["git restore --staged --worktree CLAUDE.md"],
  ["git rm --cached playbook/PIN-README.md"],
  ["git mv docs/adr/0001-x.md docs/adr/0001-y.md"],
  ["git -C /repo checkout HEAD~1 -- .claude/settings.json"],
  ["dd if=/tmp/x of=CLAUDE.md"],
  ["patch CLAUDE.md /tmp/x.diff"],
  ["find docs/adr -name '*.md' -delete"],
  ["find playbook -type f -exec rm {} \\;"],
  ["npm test && sed -i '' 's/a/b/' CLAUDE.md"],
  ["npm test; echo x > docs/adr/0100.md"],
  ['bash -c "echo x >> CLAUDE.md"'],
  ["echo $(rm playbook/CONSTITUTION.md)"],
  ["(cd docs && rm -rf adr)"],
  ["cd .claude/hooks && rm guard-remote.mjs"],
  ["cd /repo/.claude/worktrees/x && sed -i '' 's/a/b/' CLAUDE.md", "/tmp"],
  ["sed -i '' 's/a/b/' /repo/.claude/worktrees/x/docs/adr/0001-x.md", "/tmp"],
  ["rm guard-remote.mjs", "/repo/.claude/hooks"],
  ["echo x > settings.json", `${WT}/.claude`],
  ["sed -i '' 's/a/b/' CLAUDE.md", WT],
  ["sed -i '' 's/a/b/' ../../../CLAUDE.md", WT],
  ["sudo rm playbook/CONSTITUTION.md"],
  ["FOO=1 tee CLAUDE.md"],
  ["echo x 2> CLAUDE.md"],
  ["echo x &> docs/adr/log.md"],
];

const PHAI_CHO_QUA: [string, string?][] = [
  ["cat CLAUDE.md"],
  ["sed -n 1,40p CLAUDE.md"],
  ["sed -n '/Điều/p' playbook/CONSTITUTION.md"],
  ["perl -MList::Util=sum -ne 'print' CLAUDE.md"], // -M… là nạp thư viện, không phải sửa tại chỗ (kiểm độc lập L-2)
  ["perl -Ilib -ne 'print if /hook/' CLAUDE.md"],
  ['grep -n "git push" CLAUDE.md'],
  ["grep -rn hook docs/adr | tee /tmp/out.txt"],
  ["cat CLAUDE.md > /tmp/a.md"],
  ["cp CLAUDE.md /tmp/CLAUDE-ban-sao.md"],
  ["cp -r .claude/hooks /tmp/hooks-ban-sao"],
  ["git add CLAUDE.md .claude/hooks/guard-tep.mjs .claude/settings.json docs/adr/0082-x.md"],
  ['git commit -m "sửa CLAUDE.md và rm playbook/x > docs/adr/y"'],
  ["git commit -m \"$(cat <<'EOF'\nĐề xuất hook\n\nrm -rf .claude; echo x > CLAUDE.md\nEOF\n)\""],
  ["git diff main -- CLAUDE.md .claude docs/adr playbook"],
  ["git log --oneline -- docs/adr"],
  ["git show main:CLAUDE.md > /tmp/claude-main.md"],
  ["git checkout -b doc-adr-moi"],
  ["git checkout main"],
  ["git restore --staged CLAUDE.md"],
  ["git status --short"],
  ["diff <(git show main:CLAUDE.md) CLAUDE.md"],
  ["ls -la .claude .claude/hooks playbook docs/adr"],
  ["wc -l docs/adr/*.md"],
  ["node .claude/hooks/guard-remote.mjs < /tmp/in.json"],
  ["node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts"],
  ["echo 'sửa CLAUDE.md sau' >> docs/BACKLOG.md"],
  ["cat > docs/x.md <<'EOF'\nĐừng chạy: rm -rf .claude; echo x > CLAUDE.md\nEOF"],
  ["rm -rf .claude/worktrees/thu-nghiem"],
  ["git worktree remove .claude/worktrees/thu-nghiem"],
  ["mkdir -p .claude/worktrees"],
  ["cd .claude/worktrees/x && npm test"],
  ["rm -rf node_modules/.cache"],
  ["sed -i '' 's/a/b/' src/shared/permissions.ts"],
  ["echo x > docs/adr-nhap/0099.md"],
  ["rm /tmp/thu/CLAUDE.md"],
  ["sed -i '' 's/a/b/' /Users/ai/.claude/jobs/abc/tmp/m/.claude/hooks/x.mjs"],
  ["rm -rf /tmp/kho-gia/.claude", "/tmp"],
  ["cp /tmp/x .claude/hooks/y.mjs", "/kho-khac"],
  ["find docs/adr -name '*.md'"],
  ["find docs/adr -name '*.md' -exec grep -l hook {} \\;"],
  ["echo xong 2>&1"],
  ["npm test > /tmp/log.txt 2>&1"],
  ["sed -i '' 's/a/b/' docs/adr.md"],
  ["tee /tmp/CLAUDE.md < CLAUDE.md"],
];

test("guard-luat: sửa/xoá/ghi đè tệp luật bằng dòng lệnh bị chặn, lý do trỏ về công cụ sửa tệp", () => {
  for (const [cmd, cwd] of PHAI_CHAN) {
    const v = danhGia(cmd, cwd);
    assert.equal(v.deny, true, `phải CHẶN (cwd ${cwd ?? ROOT}): ${cmd}`);
    if (v.deny) {
      assert.equal(v.rule, "sua-luat-bang-lenh");
      assert.match(v.reason, /công cụ sửa tệp/, `lý do phải trỏ về công cụ sửa tệp: ${cmd}`);
    }
  }
});

test("guard-luat: đọc, commit, chép RA ngoài, dọn worktree, tệp ngoài kho đều cho qua (chặn nhầm là lỗi)", () => {
  for (const [cmd, cwd] of PHAI_CHO_QUA) assert.equal(danhGia(cmd, cwd).deny, false, `phải CHO QUA (cwd ${cwd ?? ROOT}): ${cmd}`);
});

test("guard-luat: kho ca cho-qua của guard-remote (người kiểm D soạn) không bị hàng rào mới chặn nhầm — trừ đúng MỘT ca sửa CLAUDE.md bằng sed", () => {
  // Ca đó được ghi "allow" cho guard-remote vì nó chỉ NHẮC chuỗi cấm trong nháy (không phải push/deploy). Với hàng rào mới nó là đường vòng sửa luật → phải chặn.
  const corpus: { cmd: string; expect: "deny" | "allow" }[] = JSON.parse(read("src/claude-guard.cases.json")).cases;
  const biChan = corpus.filter((c) => c.expect === "allow" && danhGia(c.cmd).deny).map((c) => c.cmd);
  assert.deepEqual(biChan, ["sed -i '' 's|cũ|- CẤM: `git push`, `wrangler deploy`|' CLAUDE.md"]);
});

test("guard-luat: thiếu gốc kho hoặc thư mục hiện tại thì KHÔNG phán (không đoán)", () => {
  assert.equal(danhGiaGhiLuat("rm CLAUDE.md", { cwd: ROOT, root: null }).deny, false);
  assert.equal(danhGiaGhiLuat("rm CLAUDE.md", { cwd: null, root: ROOT }).deny, false);
});

test("guard-luat: đầu vào dị dạng không ném lỗi", () => {
  for (const cmd of ["echo " + "$(".repeat(300) + " CLAUDE.md", "'" + "x".repeat(10_000) + " > CLAUDE.md", "rm \"", "> > > CLAUDE.md", "", "cd", "git", "sed -i"]) {
    assert.doesNotThrow(() => danhGia(cmd), cmd.slice(0, 40));
  }
});

test("guard-luat: gocKho — móc nằm trong worktree thì gốc kho vẫn là checkout gốc", () => {
  assert.equal(gocKho("/repo/.claude/hooks"), "/repo");
  assert.equal(gocKho("/repo/.claude/worktrees/x/.claude/hooks"), "/repo");
  assert.equal(gocKho("/a/b"), null);
});

test("guard-remote: script móc thật chặn sửa tệp luật bằng dòng lệnh, vẫn chặn lệnh cấm cũ, im lặng với lệnh đọc", () => {
  const run = (command: string, cwd = HERE) => spawnSync("node", [".claude/hooks/guard-remote.mjs"], { cwd: HERE, input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd }), encoding: "utf8" });
  for (const command of ["sed -i '' 's/a/b/' CLAUDE.md", "echo x >> .claude/settings.json", "git push origin main"]) {
    const r = run(command);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout || "{}").hookSpecificOutput?.permissionDecision, "deny", `móc phải chặn: ${command}`);
  }
  assert.match(JSON.parse(run("rm CLAUDE.md").stdout).hookSpecificOutput.permissionDecisionReason, /công cụ sửa tệp/);
  for (const command of ["cat CLAUDE.md", "git add CLAUDE.md", "npm test"]) {
    const r = run(command);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "", `phải im lặng với: ${command}`);
  }
});
