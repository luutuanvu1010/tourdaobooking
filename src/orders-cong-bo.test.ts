// HÀNG RÀO của hai hàm công bố của `orders` (ADR-0047 A3) — phân tích TĨNH mã nguồn:
//   (1) "CHỈ `orders` đọc số khách sau điều chỉnh": ngoài src/modules/orders/, không tệp mã nào (src/**/*.ts, web/**/*.ts, trừ *.test.ts) nhắc
//       `order_money_adjustment` hay `after_json` — module khác muốn số khách hiệu lực thì gọi `soKhachHieuLuc` (một nguồn, bài học Đợt E: hai bộ
//       phân tích `after_json` ở hai nơi từng lệch nhau). Quét trên bản CHE CHÚ THÍCH nhưng GIỮ CHUỖI (SQL nằm trong chuỗi): chú thích nhắc tên bảng
//       (vd src/shared/permissions.ts) không bị bắt nhầm.
//       NGOÀI PHẠM VI CÓ CHỦ ĐÍCH: scripts/ (kiểm định kỳ R-ORD-4/5 đọc `after_json` để kiểm bất biến — chỉ đọc, không phục vụ người dùng) và tests/.
// GIỚI HẠN (ghi ở docs/SO-HANG-RAO.md): canh QUÊN, không canh CỐ Ý — tên ghép động ("after_" + "json"), đọc qua view mới của orders, không thấy được.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(ROOT, "src");
const WEB = join(ROOT, "web");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}
const rel = (file: string): string => relative(ROOT, file).split(sep).join("/");

/** Vị trí (`tệp:dòng`) nhắc bảng/cột điều chỉnh ngoài chú thích (giữ chuỗi). */
export function adjustmentHits(relPath: string, source: string): string[] {
  const code = maskSource(source, { strings: false, comments: true });
  const out: string[] = [];
  const re = /order_money_adjustment|after_json/gi;
  for (let m = re.exec(code); m; m = re.exec(code)) out.push(`${relPath}:${code.slice(0, m.index).split("\n").length}`);
  return out;
}

test("bộ bắt `after_json`/`order_money_adjustment`: bắt trong chuỗi/SQL (mọi kiểu chữ), cho qua chú thích, báo đúng tệp:dòng", () => {
  const cases: [string, boolean][] = [
    ['const q = "SELECT after_json FROM x";', true],
    ["db.prepare(`SELECT 1 FROM order_money_adjustment`)", true],
    ["const k = 'AFTER_JSON';", true],
    ["// đọc after_json ở orders — lời giải thích", false],
    ["/** bảng `order_money_adjustment` */ const x = 1;", false],
    ["const x = 1; // after_json ở chú thích cuối dòng", false],
  ];
  for (const [src, caught] of cases) assert.equal(adjustmentHits("mau.ts", src).length > 0, caught, src);
  assert.deepEqual(adjustmentHits("mau.ts", "const a = 1;\n// after_json\nconst q = `after_json`;"), ["mau.ts:3"], "báo đúng tệp:dòng");
});

test("ADR-0047 A3: ngoài src/modules/orders/, không tệp mã nào (src, web; trừ test) đọc `order_money_adjustment`/`after_json` — dùng soKhachHieuLuc", () => {
  const files = [...walk(SRC), ...walk(WEB)].filter((f) => !rel(f).startsWith("src/modules/orders/"));
  assert.ok(files.some((f) => rel(f) === "src/shared/permissions.ts"), "chống bài kiểm rỗng: phải quét cả src/shared/permissions.ts (có nhắc bảng trong chú thích)");
  const problems = files.flatMap((f) => adjustmentHits(rel(f), readFileSync(f, "utf8")));
  assert.deepEqual(problems, [], "chỉ `orders` đọc số khách sau điều chỉnh — module khác gọi soKhachHieuLuc (src/modules/orders/index.ts)");
});
