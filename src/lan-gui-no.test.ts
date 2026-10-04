// ADR-0094 (T17, nợ có tên): lối GHI NGOÀI VÉ `dbNgoaiVe(` (src/shared/lan-gui-boc.ts) chỉ được gọi trong hàm có tên ở `NGOAI_VE`
// (src/shared/lan-gui-no.ts); mục không còn lời gọi ⇒ đỏ (danh sách chỉ co lại khi trả nợ). Bài tĩnh trên mã đã che chuỗi/chú thích.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { GHI_NHIEU_LAN, NGOAI_VE } from "./shared/lan-gui-no.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });

/** `<tệp>#<hàm bao>` của mọi lời gọi `dbNgoaiVe(` (trừ chỗ khai báo). Hàm bao = khai báo `function X` / `const X =` gần nhất phía trên ở đầu dòng. */
function noiGoi(): string[] {
  const out: string[] = [];
  for (const f of walk(join(ROOT, "src"))) {
    const rel = relative(ROOT, f).split("\\").join("/");
    if (rel === "src/shared/lan-gui-boc.ts") continue;
    const masked = maskSource(readFileSync(f, "utf8"));
    for (const m of masked.matchAll(/\bdbNgoaiVe\(/g)) {
      const truoc = masked.slice(0, m.index);
      const khai = [...truoc.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*=)/gm)].at(-1);
      out.push(`${rel}#${khai ? (khai[1] ?? khai[2]) : "?"}`);
    }
  }
  return out;
}

test("T17: mọi lời gọi dbNgoaiVe( nằm trong hàm có tên ở NGOAI_VE; không mục thừa; mỗi mục có lý do", () => {
  const goi = noiGoi();
  const ten = NGOAI_VE.map((m) => m.noi);
  assert.deepEqual(goi.filter((g) => !ten.includes(g)), [], "lời gọi dbNgoaiVe ngoài danh sách nợ có tên (src/shared/lan-gui-no.ts)");
  assert.deepEqual(ten.filter((t) => !goi.includes(t)), [], "mục NGOAI_VE không còn lời gọi — xoá mục (danh sách chỉ co lại)");
  for (const m of NGOAI_VE) assert.ok(m.lyDo.trim().length > 20, `${m.noi}: thiếu lý do`);
});

test("GHI_NHIEU_LAN: mỗi mục là mẫu route ghi có thật, có lý do", () => {
  const routes = new Set<string>();
  for (const mod of readdirSync(join(ROOT, "src/modules"))) {
    let t = "";
    try {
      t = readFileSync(join(ROOT, "src/modules", mod, "index.ts"), "utf8");
    } catch {
      continue;
    }
    for (const h of t.matchAll(/route\(\s*"(POST|PUT|PATCH|DELETE)",\s*"([^"]+)"/g)) routes.add(`${h[1]} ${h[2]}`);
  }
  for (const m of GHI_NHIEU_LAN) {
    assert.ok(routes.has(m.duong), `${m.duong}: không phải route ghi có thật`);
    assert.ok(m.lyDo.trim().length > 10, `${m.duong}: thiếu lý do`);
  }
});
