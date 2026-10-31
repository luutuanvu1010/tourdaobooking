// HÀNG RÀO (l1), (l2) của ADR-0152 Đ6 — giới hạn 4 của chỗ lệch Hiến chương 5.2: «mã không rẽ nhánh theo một đặc điểm / giá trị cụ thể» (kế hoạch 2026-10-30 T2;
// ghi ở docs/SO-HANG-RAO.md). Chỉ canh QUÊN, không canh cố ý (mã đọc từ nguồn khác thì bài không thấy). (l3) «không so tên đã đọc với chuỗi hằng» dựa vào kỷ luật.
//  (l1) Không chuỗi hằng dạng mã đặc điểm (`a` + 12 hex) / mã giá trị (`v` + 12 hex) trong mã chạy `src/**/*.ts` (trừ test) và `web/**/*.ts`, bản đã bỏ chú thích.
//  (l2) Không câu SQL đã đăng ký nào của `pricing` hay `orders` đọc cột tên của `ctl_attribute*`; hai view công bố không có cột tên (tên chỉ đi qua hàm công bố hẹp của catalog).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { registeredSql } from "./shared/sql-registry.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const MA_HANG = /["'`][av][0-9a-f]{12}["'`]/g;
const quetMa = (s: string): string[] => [...boChuThich(s).matchAll(MA_HANG)].map((m) => m[0]);

function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? tepTs(p) : f.endsWith(".ts") && !f.endsWith(".test.ts") ? [p] : [];
  });
}

test("(l1) mã chạy (src/, web/) không có chuỗi hằng dạng mã đặc điểm / mã giá trị", () => {
  const sai: string[] = [];
  for (const goc of ["src", "web"]) for (const p of tepTs(join(ROOT, goc))) for (const m of quetMa(readFileSync(p, "utf8"))) sai.push(`${p.slice(ROOT.length)}: ${m}`);
  assert.deepEqual(sai, [], `mã chạy viết cứng mã đặc điểm / giá trị: ${sai.join("; ")}`);
});

test("(l1) tự kiểm bộ quét: bắt `a…`/`v…` 12 hex trong nháy đơn, nháy kép, nháy ngược; bỏ qua mã nhóm `g…`, chuỗi dài hơn, chú thích", () => {
  assert.deepEqual(quetMa(`const x = "a0123456789ab";`), [`"a0123456789ab"`]);
  assert.deepEqual(quetMa(`f('v0123456789ab')`), [`'v0123456789ab'`]);
  assert.deepEqual(quetMa("const y = `afedcba987654`;"), ["`afedcba987654`"]);
  assert.deepEqual(quetMa(`const g = "g0123456789ab";`), [], "mã nhóm");
  assert.deepEqual(quetMa(`const z = "a0123456789abc";`), [], "13 hex");
  assert.deepEqual(quetMa(`// "a0123456789ab"\nconst k = 1;`), [], "chú thích");
});

test("(l2) SQL đã đăng ký của pricing / orders không đọc cột tên của ctl_attribute*", async () => {
  // Nạp mọi tệp có defineSql của hai module (tệp nạp thẳng được bằng Node — cùng tập STRICT / NUA_NGHIEM của architecture.test.ts).
  for (const mod of ["pricing", "orders"]) {
    const dir = join(ROOT, "src/modules", mod);
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".ts") || f.endsWith(".test.ts")) continue;
      if (!/defineSql\(/.test(readFileSync(join(dir, f), "utf8"))) continue;
      await import(pathToFileURL(join(dir, f)).href);
    }
  }
  const cau = registeredSql().filter((e) => e.module === "pricing" || e.module === "orders");
  assert.ok(cau.length > 0, "không nạp được câu nào — bài đang canh rỗng");
  const sai = cau.filter((e) => /ctl_attribute/.test(e.sql) && /\bname\b/.test(e.sql)).map((e) => `${e.module}.${e.name}`);
  assert.deepEqual(sai, [], `câu đọc tên đặc điểm ngoài catalog: ${sai.join(", ")}`);
});

test("(l2) hai view công bố của đặc điểm KHÔNG có cột tên (schema dựng từ migrations/ và sổ dữ liệu)", () => {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const dict = JSON.parse(readFileSync(join(ROOT, "docs/data-dictionary.json"), "utf8")) as { views: { name: string; columns: string[] }[] };
  for (const v of ["v_ctl_service_attribute", "v_ctl_attribute_value"]) {
    const cot = (db.prepare(`PRAGMA table_info(${v})`).all() as { name: string }[]).map((c) => c.name);
    assert.ok(cot.length > 0, `${v} chưa có`);
    assert.deepEqual(cot.filter((c) => /name|ten/.test(c)), [], `${v} có cột tên: ${cot.join(", ")}`);
    const so = dict.views.find((x) => x.name === v);
    assert.ok(so, `${v} chưa có trong sổ dữ liệu`);
    assert.deepEqual(so.columns.filter((c) => /name|ten/.test(c)), [], `${v} trong sổ có cột tên`);
  }
});
