// Bẫy D1 (docs/CHANGE-GUIDE.md, ghi 2026-09-30; dính lại 2026-11-22 ở migration 0191): D1 từ chối câu SELECT ghép quá vài vế («too many terms in compound SELECT») dù `node:sqlite`
// của `npm test` chạy được — chỉ e2e / kịch bản Chrome (wrangler) bắt, quá muộn. Bài này chặn sớm: mỗi câu lệnh trong migration tối đa 3 từ khoá UNION (4 vế) — mức lớn nhất ĐÃ CHẠY
// trên D1 thật (0079, 0099, 0112). Gieo nhiều dòng thì viết từng câu INSERT riêng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const DIR = new URL("../migrations/", import.meta.url);
const TOI_DA_UNION = 3;

export function demUnionMoiCau(sql: string): number[] {
  const bo = sql.replace(/--[^\n]*/g, "").replace(/'(?:[^']|'')*'/g, "''");
  return bo.split(";").map((c) => (c.match(/\bUNION\b/gi) ?? []).length);
}

test("đếm UNION mỗi câu: bỏ chú thích và chuỗi", () => {
  assert.deepEqual(demUnionMoiCau("SELECT 1 UNION ALL SELECT 2; -- UNION\nSELECT 'UNION'"), [1, 0]);
});

test(`mỗi câu lệnh migration tối đa ${TOI_DA_UNION} UNION (D1 từ chối câu ghép dài)`, () => {
  const vuot: string[] = [];
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) {
    const n = Math.max(0, ...demUnionMoiCau(readFileSync(new URL(f, DIR), "utf8")));
    if (n > TOI_DA_UNION) vuot.push(`${f}: ${n} UNION trong một câu`);
  }
  assert.deepEqual(vuot, [], "gieo nhiều dòng bằng từng câu INSERT riêng");
});
