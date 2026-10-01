// P16 — gọi móc cổng xanh THẬT của nhánh trên worktree THẬT, đầu vào giống Claude Code gửi lúc AI định dừng.
import { spawnSync } from "node:child_process";

const GOC = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales";
const WT = `${GOC}/.claude/worktrees/ba-hook-moi`;
const cau = process.argv[2] ?? "Đã làm xong.";
const t = Date.now();
const r = spawnSync("node", [`${WT}/.claude/hooks/cong-xanh.mjs`], {
  input: JSON.stringify({ hook_event_name: "Stop", cwd: WT, stop_hook_active: false, last_assistant_message: cau }),
  encoding: "utf8",
  env: { ...process.env, CLAUDE_PROJECT_DIR: GOC },
});
console.log(`thoát ${r.status} sau ${Math.round((Date.now() - t) / 1000)} giây; câu trả lời cuối: ${JSON.stringify(cau)}`);
if (r.stderr) console.log(`stderr: ${r.stderr.trim()}`);
if (!r.stdout) console.log("KẾT QUẢ: im lặng ⇒ CHO DỪNG");
else {
  const o = JSON.parse(r.stdout);
  console.log(`KẾT QUẢ: ${o.decision === "block" ? "GIỮ LẠI" : "??"}\n${o.reason}`);
}
