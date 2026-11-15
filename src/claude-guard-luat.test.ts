// Bộ kiểm cho hàng rào "không sửa tệp luật bằng dòng lệnh" (.claude/hooks/guard-luat-lib.mjs, gọi từ móc guard-remote.mjs) — Hiến pháp N9, CLAUDE.md §3.
// Luật `ask` ở .claude/settings.json chỉ hỏi chủ khi AI sửa tệp luật bằng CÔNG CỤ SỬA TỆP; cùng tệp đó sửa bằng `sed -i`, `>`, `cp`, `rm`, `git checkout -- …`
// thì trước đây không ai hỏi. Hàng rào này chặn đường vòng đó và trỏ AI về công cụ sửa tệp (để chủ được hỏi). Có cả ca PHẢI CHẶN lẫn ca PHẢI CHO QUA
// (đọc, commit, chép RA ngoài, dọn worktree… — chặn nhầm là lỗi). Đặc tả: docs/superpowers/specs/2026-10-01-ba-hook-moi.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { danhGiaGhiLuat, danhGiaScriptLuat, gocKho } from "../.claude/hooks/guard-luat-lib.mjs";

const HERE = fileURLToPath(new URL("../", import.meta.url));
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const ROOT = "/repo";
const WT = "/repo/.claude/worktrees/x";
const danhGia = (cmd: string, cwd = ROOT) => danhGiaGhiLuat(cmd, { cwd, root: ROOT });

const PHAI_CHAN: [string, string?][] = [
  // Bảng tham chiếu ngôn ngữ (ADR-0167): thêm hay đổi tên chỉ khi chủ đã chọn, nên sửa bằng công cụ để chủ được hỏi.
  ["sed -i '' 's/a/b/' src/shared/bang-tham-chieu-viec.ts"],
  ["echo x > src/shared/bang-tham-chieu-khai-niem.ts"],
  ["cp /tmp/x.ts src/shared/bang-tham-chieu.ts"],
  // Máy canh của bảng: nới nó mà chủ không được hỏi thì bảng không còn được canh.
  ["sed -i '' 's/a/b/' scripts/quet-nut-lib.mjs"],
  ["echo x > scripts/bang-tham-chieu-lib.mjs"],
  ["cp /tmp/x.ts src/bang-tham-chieu.test.ts"],
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
  ["cat src/shared/bang-tham-chieu-viec.ts"],
  ["cat scripts/quet-nut-lib.mjs"],
  ["node --test src/bang-tham-chieu.test.ts"],
  ["node scripts/gen-bang-tham-chieu.mjs"],
  ["npm run tham-chieu"],
  ["git add src/shared/bang-tham-chieu-viec.ts"],
  ["echo x > docs/BANG-THAM-CHIEU.md"],
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

test("guard-luat (ADR-0179 Đ2.6): .github/workflows/ là TỆP LUẬT (sửa bằng dòng lệnh bị chặn); .git/tourdao-kiem/ (bản ghi kết luận kiểm) AI không ghi được", () => {
  for (const [cmd, cwd] of [["sed -i '' 's/a/b/' .github/workflows/kiem.yml"], ["echo x > .github/workflows/kiem.yml"], ["rm .github/workflows/kiem.yml", WT], ["cp /tmp/x.yml .github/workflows/"], ["git checkout -- .github/workflows/kiem.yml"]] as [string, string?][]) {
    const v = danhGia(cmd, cwd);
    assert.equal(v.deny, true, `phải CHẶN: ${cmd}`);
    if (v.deny) assert.equal(v.rule, "sua-luat-bang-lenh");
  }
  for (const [cmd, cwd] of [["echo '{}' > .git/tourdao-kiem/abc.json"], ["cp /tmp/x.json .git/tourdao-kiem/"], ["tee /repo/.git/tourdao-kiem/abc.json < /tmp/x", WT], ["rm -rf .git/tourdao-kiem"], ["sed -i '' 's/do/xanh/' ../../../.git/tourdao-kiem/abc.json", WT]] as [string, string?][]) {
    const v = danhGia(cmd, cwd);
    assert.equal(v.deny, true, `phải CHẶN: ${cmd}`);
    if (v.deny) {
      assert.equal(v.rule, "ghi-ban-ghi-kiem");
      assert.match(v.reason, /npm run day-len/);
    }
  }
  for (const cmd of ["cat .github/workflows/kiem.yml", "git add .github/workflows/kiem.yml", "ls .git/tourdao-kiem", "cat .git/tourdao-kiem/abc.json", "git diff origin/main main -- .github/workflows"]) {
    assert.equal(danhGia(cmd).deny, false, `phải CHO QUA: ${cmd}`);
  }
  const s = read(".claude/settings.json");
  assert.ok(s.includes('"Edit(.github/workflows/**)"'), "settings.json: sửa quy trình GitHub bằng công cụ sửa tệp phải HỎI chủ");
});

// ─── Trình thông dịch (node/python/perl/ruby/bun/deno/php) ghi tệp luật — vá chỗ hở 15/11/2026 ─────────────────────────────────────
// Sự cố 15/11: một phiên chạy `node -e '…fs.writeFileSync("docs/adr/README.md", …)'` qua Bash; guard-luat không thấy (mã trong chuỗi), luật HỎI
// `adr-bash-write` chỉ trả `ask` (chế độ tự động / trợ lý con bấm qua được), còn `CLAUDE.md`, `.claude/**`, `playbook/**` thì không ai hỏi.
// Nay: mã chạy bằng trình thông dịch (-e/-c/-p/--eval, heredoc nạp vào trình thông dịch) nhắc đường dẫn tệp luật VÀ có dấu hiệu ghi ⇒ CHẶN.
const SU_CO_15_11 = `node -e 'const fs=require("fs");const p="docs/adr/README.md";const s=fs.readFileSync(p,"utf8");fs.writeFileSync(p,s.replace("a","b"))'`;
const TRINH_PHAI_CHAN: [string, string?][] = [
  [SU_CO_15_11],
  [`node -e "require('fs').appendFileSync('CLAUDE.md', 'x')"`],
  [`node --input-type=module -e "import {writeFileSync} from 'node:fs'; writeFileSync('.claude/settings.json', '{}')"`],
  [`node -p "require('fs').writeFileSync('src/CLAUDE.md','x')"`],
  [`node -e "require('fs').rmSync('.claude/hooks', {recursive:true})"`],
  [`node -e "require('fs').unlinkSync('playbook/CONSTITUTION.md')"`],
  [`node -e "require('fs').renameSync('/tmp/x.md','docs/adr/0300-x.md')"`],
  [`node -e "require('fs').copyFileSync('/tmp/x.mjs','.claude/hooks/guard-tep.mjs')"`],
  [`node -e "const fs=require('fs'),path=require('path'); fs.writeFileSync(path.join('docs','adr','README.md'),'x')"`],
  [`node -e "require('fs').writeFileSync(process.argv[1],'x')" CLAUDE.md`],
  [`bun -e "await Bun.write('CLAUDE.md','x')"`],
  [`deno eval "Deno.writeTextFileSync('.github/workflows/kiem.yml','x')"`],
  [`python3 -c "open('CLAUDE.md','w').write('x')"`],
  [`python3 -c "open('docs/adr/README.md','a').write('x')"`],
  [`python3 -c "import os; os.remove('.claude/settings.local.json')"`],
  [`python3 -c "import shutil; shutil.copy('/tmp/x', '.claude/agents/nguoi-kiem-doc-lap.md')"`],
  [`python3 -c "from pathlib import Path; Path('playbook/PIN-README.md').write_text('x')"`],
  [`python3 -c "import os; open(os.path.join('.claude','settings.json'),'w')"`],
  [`python3 -c "from pathlib import Path; (Path('.') / 'docs' / 'adr' / 'README.md').write_text('x')"`],
  [`python -c "import subprocess; subprocess.run(['rm','CLAUDE.md'])"`],
  [`perl -e 'open(my $f, ">", "CLAUDE.md"); print $f "x"'`],
  [`perl -e 'open(F, ">>docs/adr/README.md"); print F "x"'`],
  [`perl -e 'unlink "playbook/CONSTITUTION.md"'`],
  [`ruby -e 'File.write("CLAUDE.md", "x")'`],
  [`php -r 'file_put_contents("CLAUDE.md", "x");'`],
  ["python3 - <<'EOF'\np='CLAUDE.md'\ns=open(p,encoding='utf-8').read()\nopen(p,'w',encoding='utf-8').write(s)\nEOF"],
  ["cat <<'EOF' | node\nrequire('fs').appendFileSync('.claude/settings.json', 'x')\nEOF"],
  ["node <<'EOF'\nconst fs = require('fs');\nfs.writeFileSync('docs/adr/README.md', 'x');\nEOF"],
  ["npm test && node -e \"require('fs').writeFileSync('CLAUDE.md','x')\""],
  [`bash -c "node -e \\"require('fs').writeFileSync('CLAUDE.md','x')\\""`],
  [`env FOO=1 /usr/bin/python3 -c "open('CLAUDE.md','w')"`],
  // cd rồi đường dẫn tương đối; worktree; đường dẫn tuyệt đối vào kho.
  [`cd docs && node -e "require('fs').writeFileSync('adr/README.md','x')"`],
  [`node -e "require('fs').writeFileSync('CLAUDE.md','x')"`, WT],
  [`node -e "require('fs').writeFileSync('/repo/.claude/worktrees/x/.claude/settings.json','x')"`, "/tmp"],
  [`node -e "require('fs').writeFileSync(\`\${process.cwd()}/.claude/settings.json\`,'x')"`],
];
const TRINH_PHAI_CHO_QUA: [string, string?][] = [
  [`node -e "console.log(require('fs').readFileSync('CLAUDE.md','utf8').length)"`],
  [`node -e "process.stdout.write(require('fs').readFileSync('docs/adr/README.md','utf8').slice(0,200))"`],
  [`node -e "const s=require('./.claude/settings.json'); console.log(JSON.stringify(s.permissions.deny))"`],
  [`node -p "require('fs').readdirSync('docs/adr').length"`],
  [`python3 -c "print(open('CLAUDE.md').read()[:100])"`],
  [`python3 -c "print(open('playbook/CONSTITUTION.md', 'r', encoding='utf-8').read().count('N9'))"`],
  [`python3 -c "import json; print(json.load(open('.claude/settings.json'))['hooks'].keys())"`],
  [`perl -ne 'print if /N9/' playbook/CONSTITUTION.md`],
  [`ruby -e 'puts File.read("CLAUDE.md").lines.count'`],
  // Ghi ra NGOÀI tệp luật (tệp thường, /tmp) thì không phải việc của hàng rào này.
  [`node -e "require('fs').writeFileSync('docs/BACKLOG.md','x')"`],
  [`python3 -c "open('/tmp/x.md','w').write('x')"`],
  [`node -e "require('fs').writeFileSync('/tmp/thu/CLAUDE.md','x')"`],
  // Chạy tệp trong kho, bài kiểm, móc: không đọc mã (luật khác lo), không chặn.
  ["node --test src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts"],
  ["node scripts/gen-bang-tham-chieu.mjs"],
  ["node .claude/hooks/guard-remote.mjs < /tmp/in.json"],
  // Thông điệp commit / tài liệu nhắc lại đúng câu lệnh sự cố — dữ liệu, không phải lệnh.
  [`git commit -m "Vá: node -e 'fs.writeFileSync(\\"CLAUDE.md\\")' trước đây lọt"`],
  ["git commit -m \"$(cat <<'EOF'\nVá chỗ hở: node -e writeFileSync('docs/adr/README.md') và python3 open('CLAUDE.md','w')\nEOF\n)\""],
  ["cat > docs/superpowers/specs/x.md <<'EOF'\nTrợ lý chạy node -e \"require('fs').writeFileSync('CLAUDE.md','x')\" qua Bash\nEOF"],
  [`grep -n "writeFileSync('CLAUDE.md'" docs/SO-HANG-RAO.md`],
];

test("guard-luat (15/11): mã chạy bằng trình thông dịch GHI tệp luật bị chặn, lý do trỏ về công cụ sửa tệp", () => {
  for (const [cmd, cwd] of TRINH_PHAI_CHAN) {
    const v = danhGia(cmd, cwd);
    assert.equal(v.deny, true, `phải CHẶN (cwd ${cwd ?? ROOT}): ${cmd}`);
    if (v.deny) {
      assert.equal(v.rule, "sua-luat-bang-lenh", cmd);
      assert.match(v.reason, /công cụ sửa tệp/, cmd);
    }
  }
  // Bản ghi kết luận kiểm của day-len: ghi bằng trình thông dịch cũng giữ đúng luật riêng của nó.
  const k = danhGia(`node -e "require('fs').writeFileSync('.git/tourdao-kiem/abc.json','{}')"`);
  assert.equal(k.deny, true);
  if (k.deny) assert.equal(k.rule, "ghi-ban-ghi-kiem");
});

test("guard-luat (15/11): mã trình thông dịch CHỈ ĐỌC tệp luật, ghi ra ngoài, chạy tệp trong kho, thông điệp commit đều cho qua", () => {
  for (const [cmd, cwd] of TRINH_PHAI_CHO_QUA) assert.equal(danhGia(cmd, cwd).deny, false, `phải CHO QUA (cwd ${cwd ?? ROOT}): ${cmd}`);
});

test("guard-luat (15/11): tệp script NGOÀI thư mục mã của kho (/tmp, ~/.claude/jobs, tệp tạm ở gốc worktree) ghi tệp luật bị chặn; script của kho và script chỉ đọc cho qua", () => {
  const ghi = 'const fs = require("fs");\nconst p = "docs/adr/README.md";\nfs.writeFileSync(p, fs.readFileSync(p, "utf8") + "x");\n';
  const ghiPy = 'D = "CLAUDE.md"\nopen(D, "w", encoding="utf-8").write("x")\n';
  const ghiArgv = 'import sys\nopen(sys.argv[1], "w").write("x")\n';
  const doc = 'print(open("CLAUDE.md", encoding="utf-8").read())\n';
  const dg = (command: string, scripts: { path: string; content: string }[], cwd = ROOT) => danhGiaScriptLuat(command, scripts, { cwd, root: ROOT });
  assert.equal(dg("node /tmp/sua.mjs", [{ path: "/tmp/sua.mjs", content: ghi }]).deny, true);
  assert.equal(dg("python3 ~/.claude/jobs/a/duyet.py", [{ path: "/Users/ai/.claude/jobs/a/duyet.py", content: ghiPy }]).deny, true);
  assert.equal(dg("node tam.mjs", [{ path: `${WT}/tam.mjs`, content: ghi }], WT).deny, true, "tệp tạm đặt ở gốc worktree vẫn bị đọc");
  assert.equal(dg("python3 /tmp/w.py CLAUDE.md", [{ path: "/tmp/w.py", content: ghiArgv }]).deny, true, "đường dẫn tệp luật đi qua đối số dòng lệnh");
  assert.equal(dg("python3 /tmp/doc.py", [{ path: "/tmp/doc.py", content: doc }]).deny, false, "script chỉ đọc");
  assert.equal(dg("node scripts/gen-bang-tham-chieu.mjs", [{ path: `${ROOT}/scripts/gen-bang-tham-chieu.mjs`, content: ghi }]).deny, false, "script của kho (scripts/) không bị đọc");
  assert.equal(dg("node scripts/x.mjs", [{ path: `${WT}/scripts/x.mjs`, content: ghi }], WT).deny, false, "script của kho trong worktree");
  assert.equal(dg("node /tmp/sua.mjs", [{ path: "/tmp/sua.mjs", content: 'require("fs").writeFileSync("/tmp/out.md", "x")\n' }]).deny, false, "ghi ra ngoài");
  assert.equal(danhGiaScriptLuat("node /tmp/sua.mjs", [{ path: "/tmp/sua.mjs", content: ghi }], { cwd: ROOT, root: null }).deny, false, "thiếu gốc kho thì không phán");
});

test("guard-remote (15/11): script móc thật CHẶN đúng lệnh sự cố 15/11 và ghi tệp luật bằng trình thông dịch; im lặng với lệnh chỉ đọc", () => {
  const run = (command: string) => spawnSync("node", [".claude/hooks/guard-remote.mjs"], { cwd: HERE, input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd: HERE }), encoding: "utf8" });
  const quyet = (command: string) => JSON.parse(run(command).stdout || "{}").hookSpecificOutput;
  for (const command of [SU_CO_15_11, `node -e "require('fs').appendFileSync('CLAUDE.md','x')"`, `python3 -c "open('.claude/settings.json','w').write('x')"`]) {
    const o = quyet(command);
    assert.equal(o?.permissionDecision, "deny", `móc phải CHẶN: ${command}`);
    assert.match(o?.permissionDecisionReason ?? "", /công cụ sửa tệp/);
  }
  const dir = mkdtempSync(join(tmpdir(), "guard-luat-"));
  const tep = join(dir, "sua.mjs");
  writeFileSync(tep, 'import { writeFileSync } from "node:fs";\nwriteFileSync(".claude/settings.json", "{}");\n');
  assert.equal(quyet(`node ${tep}`)?.permissionDecision, "deny", "tệp script tạm ghi tệp luật phải bị chặn");
  writeFileSync(tep, 'import { readFileSync } from "node:fs";\nconsole.log(readFileSync("CLAUDE.md", "utf8").length);\n');
  assert.equal(run(`node ${tep}`).stdout, "", "tệp script tạm chỉ đọc phải im lặng");
  rmSync(dir, { recursive: true, force: true });
  for (const command of [`node -e "console.log(require('fs').readFileSync('CLAUDE.md','utf8').length)"`, `python3 -c "print(open('docs/adr/README.md').read()[:50])"`, "node scripts/gen-bang-tham-chieu.mjs --kiem"]) {
    assert.equal(run(command).stdout, "", `phải im lặng với: ${command}`);
  }
});

test("guard-luat (15/11): quét chặn nhầm — mọi script của kho, mọi lệnh trong package.json đều cho qua (kể cả khi móc đọc nội dung script)", () => {
  const goc = HERE.replace(/\/$/, "");
  const pkg = JSON.parse(read("package.json")).scripts as Record<string, string>;
  const lenh = [...readdirSync(new URL("../scripts/", import.meta.url)).filter((f) => /\.m?js$/.test(f)).map((f) => `node scripts/${f}`), ...Object.values(pkg)];
  const chanNham = lenh.filter((cmd) => {
    if (danhGiaGhiLuat(cmd, { cwd: goc, root: goc }).deny) return true;
    const tep = (cmd.match(/(?:^|\s)node\s+(scripts\/[\w.-]+\.m?js)/g) ?? []).map((m) => m.trim().split(/\s+/)[1]);
    return danhGiaScriptLuat(cmd, tep.map((p) => ({ path: p, content: read(p) })), { cwd: goc, root: goc }).deny;
  });
  assert.deepEqual(chanNham, []);
});
