// BÀI KHOÁ DANH SÁCH ĐƯỜNG MỞ / ĐÓNG DÒNG PHỤ TRÁCH (ADR-0032 «Hệ quả»; kế hoạch 2026-10-23 mục 1b). Mỗi đường mở dòng `HANDLE` phải ghi sự kiện CLAIM/ASSIGN
// CÙNG LÔ, nếu không chuỗi «liên tiếp» không về 0 được cho người đó. Bài này đỏ khi có đường MỚI chạm `dsp_assignment` mà chưa được xét:
//  (a) câu SQL ghi `dsp_assignment` chỉ ở `src/modules/dispatch/repository.ts`, đúng tập tên defineSql đã liệt kê;
//  (b) hàm dựng câu mở / đóng chỉ được GỌI trong thân các hàm lô đã ghi sự kiện (`handlerChangeStatements`, `newOrderHandlerStatements`, `refuseStatements`);
//  (c) migration sau 0014 không chèn dòng phụ trách.
// (d) hành vi (mỗi nhánh lô → đúng một sự kiện) ở src/modules/dispatch/service.test.ts (các bài «HM-13»); (e) lưới lúc chạy: kiểm định kỳ R-DSP-6.
// GIỚI HẠN: (a)–(c) đọc VĂN BẢN — canh QUÊN, không canh CỐ Ý lách (vd dựng tên hàm động). Ghi ở docs/SO-HANG-RAO.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { registeredSql } from "./shared/sql-registry.ts";
import "./modules/dispatch/repository.ts";
import "./modules/dispatch/han-muc-repo.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const LOI = "Đường mới mở/đóng dòng phụ trách phải ghi sự kiện (ADR-0032) — thêm dòng vào bảng mục 1 của kế hoạch docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong.md rồi sửa bài này";

function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return tepTs(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}
const NGUON = tepTs(join(ROOT, "src")).map((p) => ({ rel: relative(ROOT, p), src: readFileSync(p, "utf8") }));

/** Thân `{…}` của hàm `ten` (khai `function ten(`) trên bản đã che chuỗi + chú thích; null nếu không có. */
function thanHam(masked: string, ten: string): [number, number] | null {
  const m = new RegExp(`function\\s+${ten}\\s*\\(`).exec(masked);
  if (!m) return null;
  let i = m.index + m[0].length - 1;
  let sau = 0;
  for (; i < masked.length; i++) {
    if (masked[i] === "(") sau++;
    else if (masked[i] === ")" && --sau === 0) break;
  }
  const mo = masked.indexOf("{", i);
  let sau2 = 0;
  for (let k = mo; k < masked.length; k++) {
    if (masked[k] === "{") sau2++;
    else if (masked[k] === "}" && --sau2 === 0) return [mo, k];
  }
  return null;
}

test("(a) câu SQL ghi dsp_assignment chỉ ở dispatch/repository.ts, đúng tập tên defineSql đã xét", () => {
  const coCau = NGUON.filter((t) => /\b(INSERT\s+INTO|UPDATE)\s+dsp_assignment\b/i.test(maskSource(t.src, { strings: false, comments: true }))).map((t) => t.rel);
  assert.deepEqual(coCau, ["src/modules/dispatch/repository.ts"], LOI);
  const ten = registeredSql().filter((e) => /\b(INSERT\s+INTO|UPDATE)\s+dsp_assignment\b/i.test(e.sql)).map((e) => `${e.module}.${e.name}`).sort();
  assert.deepEqual(
    ten,
    ["dispatch.close_handler", "dispatch.close_handler_sau_chot", "dispatch.guard_handler", "dispatch.insert_handler", "dispatch.insert_handler_after_close", "dispatch.insert_handler_if_none"],
    LOI,
  );
});

const HAM_MO = ["insertHandlerStatement", "insertHandlerAfterCloseStatement", "insertHandlerIfNoneStatement"];
const HAM_DONG = ["closeHandlerStatement", "closeHandlerSauChotStatement"];
const DUOC_GOI: Record<string, readonly string[]> = {
  ...Object.fromEntries(HAM_MO.map((h) => [h, ["handlerChangeStatements", "newOrderHandlerStatements"]])),
  ...Object.fromEntries(HAM_DONG.map((h) => [h, ["handlerChangeStatements", "refuseStatements"]])),
};

/** Mọi lời gọi `ham(` trong src/modules (trừ test) KHÔNG nằm trong thân một hàm được phép → danh sách «tệp: hàm». */
function goiLaChoKhac(nguon: { rel: string; src: string }[]): string[] {
  const la: string[] = [];
  for (const t of nguon.filter((x) => x.rel.startsWith("src/modules/"))) {
    const masked = maskSource(t.src);
    for (const [ham, choPhep] of Object.entries(DUOC_GOI)) {
      const than = choPhep.map((f) => thanHam(masked, f)).filter((x): x is [number, number] => x !== null);
      for (const m of masked.matchAll(new RegExp(`\\b${ham}\\s*\\(`, "g"))) {
        if (!than.some(([a, b]) => m.index! > a && m.index! < b)) la.push(`${t.rel}: ${ham}`);
      }
    }
  }
  return la;
}

test("(b) hàm dựng câu mở/đóng dòng phụ trách chỉ được gọi trong thân các hàm lô đã ghi sự kiện", () => {
  assert.deepEqual(goiLaChoKhac(NGUON), [], LOI);
  // Bài có cắn: các lời gọi hôm nay đều nằm trong thân hàm được phép (đếm > 0).
  const service = NGUON.find((t) => t.rel === "src/modules/dispatch/service.ts")!;
  assert.ok([...maskSource(service.src).matchAll(/\binsertHandler\w*Statement\s*\(/g)].length >= 3);
});

test("(b) tự kiểm: một hàm MỚI gọi insertHandlerStatement / closeHandlerStatement → bị bắt", () => {
  const gia = [{ rel: "src/modules/dispatch/moi.ts", src: "export function moTat(db) { return [insertHandlerStatement(db, x), closeHandlerStatement(db, 'o', 'p', 'a', 'b')]; }" }];
  assert.deepEqual(goiLaChoKhac(gia), ["src/modules/dispatch/moi.ts: insertHandlerStatement", "src/modules/dispatch/moi.ts: closeHandlerStatement"]);
});

test("(c) chỉ migration 0014 chèn dòng phụ trách (migration sau này chèn thẳng dsp_assignment → đỏ)", () => {
  const dir = join(ROOT, "migrations");
  const co = readdirSync(dir).filter((f) => f.endsWith(".sql") && /INSERT\s+INTO\s+dsp_assignment\b/i.test(readFileSync(join(dir, f), "utf8").replace(/--[^\n]*/g, "")));
  assert.deepEqual(co, ["0014_dispatch.sql"], LOI);
});
