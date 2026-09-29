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

// ---------------------------------------------------------------------------------------------------------------------------------------------------
//   (2) "NƠI GỌI hàm công bố đứng sau `can()`" (ADR-0047 A3): `soKhachHieuLuc`, `hanhKhachChoChuyen` KHÔNG tự kiểm quyền (hàm hẹp có họ tên, năm sinh
//       khách). Ở module KHÁC `orders`: mỗi lời gọi phải nằm trong THÂN một `route(…)` của `src/modules/<m>/index.ts`, và trong thân đó có `can(` đứng TRƯỚC
//       lời gọi. Gọi ở tệp khác `index.ts` (service.ts, repository.ts…) → đỏ ("chỉ gọi trong thân route"). Quét trên bản che chuỗi + chú thích.
//       Hôm nay 0 nơi gọi. GIỚI HẠN: canh QUÊN, không canh CỐ Ý — không biết `can(` có đúng ô, có chặn thật (return) hay không; gọi qua bí danh
//       (`const f = soKhachHieuLuc; f(…)`) không thấy.
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ADR-0049 A11 (siết — kế hoạch mục 1.6): thêm hai hàm hẹp mới `lichChungChang`, `lienHeChoTaiXe` (liên hệ khách có SĐT) — cùng luật "chỉ trong thân route, sau can()".
const CONG_BO = /\b(soKhachHieuLuc|hanhKhachChoChuyen|lichChungChang|lienHeChoTaiXe)\s*\(/g;

/** Khoảng [mở, đóng] của thân `{…}` các handler `route(…, async (…) => { … })` trên bản ĐÃ CHE (chuỗi + chú thích). */
function routeBodies(masked: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const m of masked.matchAll(/\broute\(/g)) {
    const arrow = masked.indexOf("=>", m.index!);
    const open = arrow === -1 ? -1 : masked.indexOf("{", arrow);
    if (open === -1) continue;
    let depth = 0;
    for (let i = open; i < masked.length; i++) {
      if (masked[i] === "{") depth++;
      else if (masked[i] === "}" && --depth === 0) {
        out.push({ start: open, end: i });
        break;
      }
    }
  }
  return out;
}

/** Vị trí (`tệp:dòng`) gọi hàm công bố sai chỗ. `isIndex` = tệp là `index.ts` của module (nơi DUY NHẤT được gọi, và chỉ trong thân route sau `can(`). */
export function congBoCallHits(relPath: string, source: string, isIndex: boolean): string[] {
  const masked = maskSource(source);
  const bodies = isIndex ? routeBodies(masked) : [];
  const out: string[] = [];
  for (const m of masked.matchAll(CONG_BO)) {
    const where = `${relPath}:${masked.slice(0, m.index).split("\n").length}`;
    if (!isIndex) {
      out.push(`${where}: gọi ${m[1]} ngoài index.ts — chỉ gọi trong thân route, sau can()`);
      continue;
    }
    const b = bodies.find((x) => m.index! > x.start && m.index! < x.end);
    if (!b) out.push(`${where}: gọi ${m[1]} ngoài thân route — chỉ gọi trong thân route, sau can()`);
    else if (!/\bcan\s*\(/.test(masked.slice(b.start, m.index))) out.push(`${where}: gọi ${m[1]} mà không có can( đứng trước trong thân route`);
  }
  return out;
}

test("bộ bắt nơi gọi hàm công bố: có can( trước trong thân route → qua; không có / ngoài route / ngoài index.ts → bắt; chú thích và chuỗi không tính", () => {
  const ok = 'route("GET", "/x", "office", async ({ env, staff }) => {\n  if (!can(staff, "order.view")) return deny();\n  return json(await hanhKhachChoChuyen(env.DB, ids));\n});';
  assert.deepEqual(congBoCallHits("mau/index.ts", ok, true), []);
  const noCan = 'route("GET", "/x", "office", async ({ env }) => {\n  return json(await soKhachHieuLuc(env.DB, ids));\n});';
  assert.deepEqual(congBoCallHits("mau/index.ts", noCan, true), ["mau/index.ts:2: gọi soKhachHieuLuc mà không có can( đứng trước trong thân route"]);
  const canAfter = 'route("GET", "/x", "office", async ({ env, staff }) => {\n  const r = await hanhKhachChoChuyen(env.DB, ids);\n  if (!can(staff, "o")) return deny();\n  return json(r);\n});';
  assert.equal(congBoCallHits("mau/index.ts", canAfter, true).length, 1, "can( đứng SAU lời gọi không tính");
  assert.equal(congBoCallHits("mau/index.ts", "const x = await hanhKhachChoChuyen(db, ids);", true).length, 1, "ngoài thân route");
  assert.equal(congBoCallHits("mau/service.ts", "if (can(s, \"o\")) await soKhachHieuLuc(db, ids);", false).length, 1, "ngoài index.ts");
  assert.deepEqual(congBoCallHits("mau/index.ts", '// hanhKhachChoChuyen(db) — ví dụ\nconst s = "soKhachHieuLuc(";', true), [], "chú thích + chuỗi không tính");  // ADR-0049 A11: hai tên mới cũng bị bắt
  assert.equal(congBoCallHits("mau/dieu-phoi.ts", "await lichChungChang(db, a, b);", false).length, 1, "lichChungChang ngoài index.ts");
  assert.equal(congBoCallHits("mau/index.ts", 'route("GET", "/x", "office", async ({ env }) => {\n  return json(await lienHeChoTaiXe(env.DB, ids));\n});', true).length, 1, "lienHeChoTaiXe không có can(");
});

test("ADR-0047 A3: ở module KHÁC orders, mọi lời gọi soKhachHieuLuc / hanhKhachChoChuyen nằm trong thân route của index.ts, sau can() (hôm nay 0 nơi gọi)", () => {
  const files = walk(join(SRC, "modules")).filter((f) => !rel(f).startsWith("src/modules/orders/"));
  assert.ok(files.some((f) => rel(f) === "src/modules/dispatch/index.ts"), "chống bài kiểm rỗng: phải quét cả src/modules/dispatch/index.ts");
  const problems = files.flatMap((f) => congBoCallHits(rel(f), readFileSync(f, "utf8"), /\/index\.ts$/.test(f)));
  assert.deepEqual(problems, [], "hàm công bố của orders không tự kiểm quyền — module khác chỉ gọi trong thân route, SAU can()");
});
