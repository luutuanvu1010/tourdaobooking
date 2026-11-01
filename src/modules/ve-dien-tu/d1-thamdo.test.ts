// Thăm dò D1 (kế hoạch Task 3, Step 0): chạy lại tệp SQL bằng chứng `docs/evidence/2026-10-31-ve-dien-tu/d1-thamdo.sql` trên node:sqlite và so với kết quả đã quan sát trên
// D1 cục bộ của wrangler (xem d1-thamdo.md). Mục đích: nếu hai động cơ lệch nhau khi nâng phiên bản thì bài đỏ ngay.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

test("thăm dò D1: UPDATE … IN (SELECT … LIMIT biểu thức) + ROW_NUMBER gán vị trí + chạy lại không đổi + trả vé đã lộ thành VOID", () => {
  const d = new DatabaseSync(":memory:");
  const sql = readFileSync(new URL("../../../docs/evidence/2026-10-31-ve-dien-tu/d1-thamdo.sql", import.meta.url), "utf8");
  assert.ok(readdirSync(new URL("../../../migrations/", import.meta.url)).some((f) => f.endsWith("_ve_dien_tu.sql")));
  // Tách câu theo «;» cuối dòng; bỏ dòng chú thích.
  const cau = sql.split(/;\s*\n/).map((c) => c.replace(/^\s*--[^\n]*\n/gm, "").trim()).filter(Boolean);
  const doi: number[] = [];
  for (const c of cau) {
    if (/^SELECT changes\(\)/i.test(c)) doi.push(Number((d.prepare(c).get() as Record<string, number>)[Object.keys(d.prepare(c).get() as object)[0]!]));
    else d.exec(c);
  }
  assert.deepEqual(doi, [2, 2, 0], "lần 1 đổi 2 vé và ghi 2 phân bổ; lần 2 không đổi gì");
  assert.deepEqual(d.prepare("SELECT id, status FROM vdt_ticket ORDER BY id").all().map((r) => Object.values(r as object).join(":")), ["t1:AVAILABLE", "t2:VOID", "t3:AVAILABLE"]);
  assert.deepEqual(d.prepare("SELECT ticket_id, slot_no FROM vdt_allocation ORDER BY slot_no").all().map((r) => Object.values(r as object).join(":")), ["t2:1", "t1:2"], "vé hết hạn sớm nhất nhận vị trí nhỏ nhất");
});
