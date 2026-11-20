// Lưu NGUYÊN VĂN báo cáo cuối của trợ lý ra <ra>/bao-cao/<tên lượt>.md, đọc từ bản ghi lượt chạy (JSONL) của phiên điều phối.
//   node luu-bao-cao.mjs <tên lượt>=<mã lượt chạy> [...]     (vd man-001=ad0e…)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const ra = join(homedir(), "tourdao-danh-gia-2026-11-20");
const TASKS = process.env.TASKS_DIR;
const soTep = join(ra, "luot.json");
const so = existsSync(soTep) ? JSON.parse(readFileSync(soTep, "utf8")) : {};
for (const cap of process.argv.slice(2)) {
  const [ten, ma] = cap.split("=");
  const tep = join(TASKS, `${ma}.output`);
  let cuoi = null, traQua = null;
  for (const dong of readFileSync(tep, "utf8").split("\n")) {
    if (!dong.trim()) continue;
    let j; try { j = JSON.parse(dong); } catch { continue; }
    const m = j.message ?? j;
    if ((j.type ?? m.role) !== "assistant" && m.role !== "assistant") continue;
    const chu = (Array.isArray(m.content) ? m.content : [{ type: "text", text: String(m.content ?? "") }]).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
    if (chu) cuoi = chu;
    // Báo cáo cuối có thể được trả qua lời gọi SubagentHandback (ô message) thay vì chữ thường: lấy bản đó nếu có.
    for (const c of (Array.isArray(m.content) ? m.content : [])) if (c.type === "tool_use" && /handback/i.test(c.name ?? "") && typeof c.input?.message === "string" && c.input.message.trim()) traQua = c.input.message.trim();
  }
  cuoi = traQua ?? cuoi;
  if (!cuoi) { console.log(`✗ ${ten}: không thấy báo cáo trong ${tep}`); continue; }
  writeFileSync(join(ra, "bao-cao", `${ten}.md`), cuoi + "\n");
  so[ten] = { ma, luc: new Date().toISOString(), kyTu: cuoi.length, soPhatHien: (cuoi.match(/^[-*>\s]*PHÁT HIỆN\s*\|/gm) ?? []).length, dong1: cuoi.split("\n").find((x) => x.trim())?.slice(0, 140) };
  console.log(`✓ ${ten}: ${cuoi.length} ký tự, ${so[ten].soPhatHien} phát hiện — ${so[ten].dong1}`);
}
writeFileSync(soTep, JSON.stringify(so, null, 1));
