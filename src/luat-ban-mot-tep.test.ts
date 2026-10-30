// HÀNG RÀO (a) của ADR-0146 Đ6 (kế hoạch 2026-10-30 T6; ghi ở docs/SO-HANG-RAO.md): ngoài tệp luật bán của `pricing` (`pricing/luat-ban-repo.ts`), KHÔNG tệp mã chạy nào của
// `src/` hay `web/` nhắc bảng `prc_sales_block`. Miễn (ADR-0146 Đ6 (a)): tài liệu, migration, kịch bản kiểm dữ liệu (`scripts/audit-checks.mjs` — không nằm trong vùng quét).
// Quét bản đã bỏ chú thích. Tên bảng đứng trước `_` (tên hành động nhật ký `prc_sales_block_added`, mã lỗi trigger `prc_sales_block_value:`) không khớp `\b`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const MIEN = "src/modules/pricing/luat-ban-repo.ts";
/** Bỏ chú thích `/* … *\/` và `//` (không đụng `//` trong chuỗi URL kiểu `https://`). Cùng cách với dac-diem-chi-mot-tep.test.ts. */
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const BANG = /\bprc_sales_block\b/g;
const quet = (s: string): string[] => [...boChuThich(s).matchAll(BANG)].map((m) => m[0]);

function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? tepTs(p) : f.endsWith(".ts") && !f.endsWith(".test.ts") ? [p] : [];
  });
}

test("(a) ADR-0146 Đ6: ngoài pricing/luat-ban-repo.ts, mã chạy của src/ và web/ không nhắc bảng prc_sales_block", () => {
  const sai: string[] = [];
  for (const p of [...tepTs(join(ROOT, "src")), ...tepTs(join(ROOT, "web"))]) {
    const rel = p.slice(ROOT.length);
    if (rel === MIEN) continue;
    for (const ten of quet(readFileSync(p, "utf8"))) sai.push(`${rel}: ${ten}`);
  }
  assert.deepEqual(sai, [], `nhắc thẳng bảng luật bán ngoài tệp luật bán: ${sai.join("; ")}`);
  assert.ok(quet(readFileSync(join(ROOT, MIEN), "utf8")).length > 0, "tệp luật bán phải có câu SQL trên bảng (nếu không, bài đang canh nhầm tệp)");
});

test("(a) tự kiểm bộ quét: bắt tên bảng trần; bỏ qua tên hành động nhật ký, mã lỗi trigger, chú thích", () => {
  assert.deepEqual(quet("SELECT id FROM prc_sales_block WHERE 1"), ["prc_sales_block"]);
  assert.deepEqual(quet(`const t = "prc_sales_block";`), ["prc_sales_block"]);
  assert.deepEqual(quet(`const a = "prc_sales_block_added"; const b = "prc_sales_block_ended";`), [], "tên hành động nhật ký");
  assert.deepEqual(quet(`if (/\\bprc_sales_block_value:/.test(m)) {}`), [], "mã lỗi của trigger");
  assert.deepEqual(quet("// đọc prc_sales_block\n/* prc_sales_block */ const x = 1;"), []);
});
