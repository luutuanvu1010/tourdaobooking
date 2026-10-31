// HÀNG RÀO (f) của ADR-0152 Đ6 (kế hoạch 2026-10-30 T2; ghi ở docs/SO-HANG-RAO.md): ngoài tệp nửa nghiêm `catalog/dac-diem-repo.ts`, KHÔNG tệp mã chạy nào của `src/`
// nhắc ba bảng `ctl_attribute`, `ctl_attribute_value`, `ctl_attribute_assignment`. Module khác đọc qua view công bố (`v_ctl_service_attribute`, `v_ctl_attribute_value`);
// bài 8(b) (EXPLAIN) chỉ thấy câu đã đăng ký của module nghiêm — bài này bắt cả câu thô ở module LEGACY (`catalog/repository.ts`, `orders`). Quét bản đã bỏ chú thích.
// Tên view có `ctl_attribute` nhưng đứng sau `_` (ký tự chữ) nên `\b` không khớp; tên hành động nhật ký kiểu `ctl_attribute_created` cũng không khớp (sau tên bảng là `_`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const MIEN = "src/modules/catalog/dac-diem-repo.ts";
/** Bỏ chú thích `/* … *\/` và `//` (không đụng `//` trong chuỗi URL kiểu `https://`). Cùng cách với orders-khong-doc-nhom-truc-tiep.test.ts. */
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const BANG = /\bctl_attribute(?:_value|_assignment)?\b/g;
const quet = (s: string): string[] => [...boChuThich(s).matchAll(BANG)].map((m) => m[0]);

function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? tepTs(p) : f.endsWith(".ts") && !f.endsWith(".test.ts") ? [p] : [];
  });
}

test("(f) ngoài catalog/dac-diem-repo.ts, mã chạy của src/ không nhắc ba bảng ctl_attribute* (chỉ view công bố)", () => {
  const sai: string[] = [];
  for (const p of tepTs(join(ROOT, "src"))) {
    const rel = p.slice(ROOT.length);
    if (rel === MIEN) continue;
    for (const ten of quet(readFileSync(p, "utf8"))) sai.push(`${rel}: ${ten}`);
  }
  assert.deepEqual(sai, [], `nhắc thẳng bảng đặc điểm ngoài tệp nửa nghiêm: ${sai.join("; ")}`);
  assert.ok(quet(readFileSync(join(ROOT, MIEN), "utf8")).length > 0, "tệp nửa nghiêm phải có câu SQL trên ba bảng (nếu không, bài đang canh nhầm tệp)");
});

test("(f) tự kiểm bộ quét: bắt tên bảng trần; bỏ qua view v_ctl_*, tên hành động nhật ký, mã lỗi trigger, chú thích", () => {
  assert.deepEqual(quet("SELECT 1 FROM ctl_attribute a"), ["ctl_attribute"]);
  assert.deepEqual(quet("JOIN ctl_attribute_value v ON 1"), ["ctl_attribute_value"]);
  assert.deepEqual(quet("UPDATE ctl_attribute_assignment SET x = 1"), ["ctl_attribute_assignment"]);
  assert.deepEqual(quet("SELECT value_code FROM v_ctl_service_attribute"), [], "view công bố");
  assert.deepEqual(quet("SELECT code FROM v_ctl_attribute_value"), [], "view công bố");
  assert.deepEqual(quet(`const a = "ctl_attribute_created"; const b = "prc_sales_block_added";`), [], "tên hành động nhật ký");
  assert.deepEqual(quet(`if (/ctl_attribute_in_use/.test(m)) {}`), [], "mã lỗi của trigger");
  assert.deepEqual(quet("// đọc ctl_attribute\n/* ctl_attribute_assignment */ const x = 1;"), []);
});
