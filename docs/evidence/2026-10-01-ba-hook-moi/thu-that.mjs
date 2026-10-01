// P16 — gọi script móc THẬT của nhánh trên kho THẬT (không sửa gì): đầu vào giống Claude Code gửi.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const GOC = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales";
const WT = `${GOC}/.claude/worktrees/ba-hook-moi`;
const goi = (moc, input) => {
  const r = spawnSync("node", [`${WT}/.claude/hooks/${moc}`], { input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: GOC } });
  let q = "cho qua";
  try {
    const o = JSON.parse(r.stdout);
    q = o.hookSpecificOutput?.permissionDecision === "deny" ? `CHẶN — ${o.hookSpecificOutput.permissionDecisionReason.slice(0, 95)}…` : o.decision === "block" ? `GIỮ LẠI — ${o.reason.slice(0, 95)}…` : "cho qua";
  } catch {
    if (r.stdout) q = `?? ${r.stdout.slice(0, 80)}`;
  }
  return `${q}${r.status === 0 ? "" : ` [thoát ${r.status}: ${r.stderr.trim()}]`}`;
};
const migrationCu = readdirSync(`${WT}/migrations`).filter((f) => f.endsWith(".sql")).sort()[0];
const tep = (file_path, cwd = WT) => goi("guard-tep.mjs", { hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path }, cwd });
const lenh = (command, cwd = WT) => goi("guard-remote.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd });

console.log("── Hook 2 (tệp cấm sửa)");
for (const [mong, p, cwd] of [
  ["CHẶN", `${GOC}/src/index.ts`],
  ["CHẶN", `${GOC}/docs/BACKLOG.md`],
  ["CHẶN", `${WT}/migrations/${migrationCu}`],
  ["CHẶN", `${WT}/.dev.vars`],
  ["CHẶN", "src/index.ts", GOC],
  ["cho qua", `${WT}/src/index.ts`],
  ["cho qua", `${WT}/migrations/9999_moi.sql`],
  ["cho qua", `${WT}/.dev.vars.example`],
  ["cho qua", `${GOC}/public/js/home.js`],
  ["cho qua", "/Users/tuanbao/.claude/projects/-Users-tuanbao-Documents-Projects-ctytnhhtourdao-tourdao-sales/memory/x.md"],
  ["cho qua", "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdaovn/README.md"],
]) console.log(`  mong ${mong.padEnd(7)} | ${p.replace(GOC, "<gốc>")} → ${tep(p, cwd)}`);

console.log("── Hook 3 (sửa luật bằng dòng lệnh)");
for (const [mong, c, cwd] of [
  ["CHẶN", "sed -i '' 's/a/b/' CLAUDE.md"],
  ["CHẶN", "echo x >> .claude/settings.json"],
  ["CHẶN", `cp /tmp/x.md ${GOC}/docs/adr/0099-x.md`, "/tmp"],
  ["CHẶN", "git checkout main -- playbook/CONSTITUTION.md"],
  ["CHẶN", "git push origin main"],
  ["cho qua", "git add .claude/hooks CLAUDE.md && git commit -m 'đề xuất hook'"],
  ["cho qua", "cat CLAUDE.md | head -5"],
  ["cho qua", "rm -rf .claude/worktrees/thu"],
  ["cho qua", "npm test"],
]) console.log(`  mong ${mong.padEnd(7)} | ${c.replace(GOC, "<gốc>")} → ${lenh(c, cwd)}`);
