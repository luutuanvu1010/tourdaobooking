// HÀNG RÀO ADR-0061 điều 5 — "mọi đường ghi dịch vụ đi qua cùng hàm": mọi route gọi `validateOrder` (phân tích dịch vụ của thân yêu cầu, kể cả dịch vụ nhập
// tay) PHẢI gọi `priceGuard` SAU đó, với công tắc đọc từ bảng chính sách (`manualPolicy(`) — và `priceGuard` PHẢI hỏi `lyDoKhongNhapTay` (MỘT hàm quyết
// "được nhập tay", Đối tác trước). Route sửa đơn sau xác nhận tương lai (C2) gọi `validateOrder` mà quên `priceGuard` → đỏ ở đây.
// Phân tích tĩnh trên mã đã che chuỗi/chú thích (scripts/source-mask-lib.mjs). GIỚI HẠN (ghi ở docs/SO-HANG-RAO.md): canh QUÊN, không canh CỐ Ý — chỉ biết
// lời gọi CÓ MẶT sau `validateOrder` trong cùng thân route, không biết kết quả có được `return` không; route khai ngoài src/modules/orders/index.ts mà gọi
// `validateOrder` thì luật (1) bắt (chỉ tệp đó được gọi).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(SRC, "..");
const INDEX = "src/modules/orders/index.ts";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}
const masked = (rel: string) => maskSource(readFileSync(join(ROOT, rel), "utf8"));

/** Đoạn từ `(` mở tại `open` tới `)` khớp (đã che chuỗi nên ngoặc trong chuỗi không tính). */
function doanNgoac(s: string, open: number): string {
  let d = 0;
  for (let k = open; k < s.length; k++) {
    if (s[k] === "(") d++;
    else if (s[k] === ")" && --d === 0) return s.slice(open, k + 1);
  }
  return s.slice(open);
}

test("ADR-0061 (1): chỉ src/modules/orders/index.ts gọi validateOrder (ngoài định nghĩa ở rules.ts) — chỗ gọi mới phải vào bài này", () => {
  const goi = walk(join(SRC, "modules"))
    .map((f) => relative(ROOT, f))
    .filter((rel) => /\bvalidateOrder\s*\(/.test(masked(rel).replace(/\bfunction\s+validateOrder\s*\(/g, "")));
  assert.deepEqual(goi, [INDEX]);
});

test("ADR-0061 (2): mọi route của orders gọi validateOrder đều gọi priceGuard SAU đó, truyền công tắc đọc bằng manualPolicy(…)", () => {
  const s = masked(INDEX);
  const moc = [...s.matchAll(/\broute\s*\(/g)].map((m) => m.index!);
  assert.ok(moc.length >= 15, `chống bài rỗng: ${moc.length} route`);
  let soRoute = 0;
  for (const [i, dau] of moc.entries()) {
    const than = s.slice(dau, moc[i + 1] ?? s.length);
    const v = than.search(/\bvalidateOrder\s*\(/);
    if (v === -1) continue;
    soRoute++;
    const tieuDe = than.slice(0, 80).replace(/\s+/g, " ");
    const g = than.slice(v).search(/\bpriceGuard\s*\(/);
    assert.notEqual(g, -1, `${tieuDe}: gọi validateOrder mà không gọi priceGuard sau đó`);
    const doi = doanNgoac(than, v + g + than.slice(v + g).indexOf("("));
    assert.match(doi, /\bmanualPolicy\s*\(/, `${tieuDe}: priceGuard phải nhận công tắc đọc bằng manualPolicy(…) trong cùng request`);
  }
  assert.ok(soRoute >= 2, `POST và PUT /api/orders phải có mặt (thấy ${soRoute})`);
});

test("ADR-0061 (3): priceGuard hỏi lyDoKhongNhapTay (Đối tác → công tắc → ô) trước manualFreezeViolation", () => {
  const s = masked(INDEX);
  const at = s.search(/\bfunction\s+priceGuard\s*\(/);
  assert.notEqual(at, -1, "không thấy function priceGuard");
  const than = s.slice(at, s.indexOf("\n}\n", at));
  const ly = than.search(/\blyDoKhongNhapTay\s*\(/);
  const dong = than.search(/\bmanualFreezeViolation\s*\(/);
  assert.ok(ly !== -1 && dong !== -1 && ly < dong, "priceGuard phải gọi lyDoKhongNhapTay rồi mới manualFreezeViolation");
});
