// Hàng rào F-03 (GD-B-02; Hiến chương 5.4 "một luật một nơi"): công thức THÀNH TIỀN DÒNG (số lượng × đơn giá) chỉ ở MỘT hàm —
// `thanhTienDong` của src/shared/order-lines.ts. Trước bản vá có sáu chỗ tự nhân (form xem trước, luật đơn, điều chỉnh tiền, thẻ dịch vụ) — sửa một
// chỗ (vd làm tròn, giới hạn) thì chỗ khác lệch. Bài này quét MÃ CHẠY THẬT (`src/**`, `web/**`, bỏ `*.test.ts`), che chuỗi/chú thích (SQL trong chuỗi
// — trigger `0007` ép `line_total = quantity * unit_price` ở CSDL — không tính), và đỏ khi thấy phép nhân giữa một tên "quantity…" và "unitPrice…".
// Giới hạn: chỉ bắt cách viết dùng đúng hai tên trường đó (đổi tên biến trung gian thì lọt) — phần còn lại dựa vào người rà.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { thanhTienDong } from "./shared/order-lines.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const DEFINITION = "src/shared/order-lines.ts";
const NHAN = /\bquantity\b[\w.]*\s*\*\s*[\w.]*\bunitPrice\b|\bunitPrice\b[\w.]*\s*\*\s*[\w.]*\bquantity\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** Các dòng mã (đã che chuỗi/chú thích) tự nhân số lượng × đơn giá, ngoài chính định nghĩa. */
function choTuNhan(files: { file: string; src: string }[]): string[] {
  const bad: string[] = [];
  for (const { file, src } of files) {
    const lines = maskSource(src, { strings: true, comments: true }).split("\n");
    lines.forEach((l, i) => {
      if (NHAN.test(l) && file !== DEFINITION) bad.push(`${file}:${i + 1}`);
    });
  }
  return bad;
}

test("thanhTienDong: số lượng × đơn giá (cùng công thức trigger 0007 ép ở CSDL)", () => {
  assert.equal(thanhTienDong({ quantity: 3, unitPrice: 250_000 }), 750_000);
  assert.equal(thanhTienDong({ quantity: 1, unitPrice: 0 }), 0);
});

test("hàng rào F-03: bộ quét bắt được cách tự nhân (tự kiểm)", () => {
  assert.deepEqual(choTuNhan([{ file: "web/x.ts", src: "const t = l.quantity * l.unitPrice;\nconst u = unitPrice.value * quantity.value;" }]), ["web/x.ts:1", "web/x.ts:2"]);
  assert.deepEqual(choTuNhan([{ file: "web/x.ts", src: "// l.quantity * l.unitPrice\nconst s = \"quantity * unitPrice\";" }]), []);
});

test("hàng rào F-03: mã chạy thật không tự nhân số lượng × đơn giá — dùng thanhTienDong", () => {
  const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))].map((abs) => ({ file: relative(ROOT, abs), src: readFileSync(abs, "utf8") }));
  const bad = choTuNhan(files);
  assert.deepEqual(bad, [], `Thành tiền dòng phải gọi thanhTienDong (src/shared/order-lines.ts), không tự nhân: ${bad.join("; ")}`);
});
