// HÀNG RÀO "MỘT LUẬT TIỀN" cho đường sửa số khách sau xác nhận (ADR-0063 D1 — gói A2; Hiến chương 5.4; khuôn NT-R9 / src/buildlines-guard.test.ts). Quét TĨNH mã
// chạy thật (bỏ *.test.ts) trên bản ĐÃ CHE chuỗi + chú thích (scripts/source-mask-lib.mjs):
//  (1) `planMoneyEdit(` chỉ được gọi ở MỘT chỗ: thân `soanSuaSoKhach` (src/modules/orders/index.ts) — đường chung của route HDV và route văn phòng.
//  (2) `insertMoneyAdjustment(` (cửa duy nhất chèn order_money_adjustment — NT-B3) chỉ được gọi trong `soanSuaSoKhach`, và hai số tiền truyền vào là ĐÚNG
//      `plan.subtotalBefore` / `plan.subtotalAfter` (không số tự tính, không số từ thân).
//  (3) Route `POST /api/orders/:id/money-edit`: hỏi `can(staff, "order.money.edit", { ownerId: meta.staffId })` KHÔNG kèm `assigned`; soạn qua
//      `soanSuaSoKhach(` rồi chạy MỘT lần `chayLoSuaSoKhach(` (chỗ cho ADR-0104 Đ2: câu đơn soạn trước, một db.batch); không tự gọi `.batch(`.
//  (4) KHÔNG thân route nào (mọi `route(…)` trong src/modules) làm phép tính trên định danh tiền dòng (đơn giá, thành tiền, tạm tính, giá danh mục) — tiền
//      chỉ tính trong luật (`planMoneyEdit`, `buildLines` qua `storedServiceLines` / `thanhTienDong`).
// GIỚI HẠN (ghi ở docs/SO-HANG-RAO.md): canh QUÊN, không canh CỐ Ý — tên biến khác (vd `gia * sl`) hay phép tính trong hàm phụ ngoài thân route không bị bắt
// bởi (4); hành vi tiền do bài route thật + sổ vàng canh (so-khach-van-phong-route.test.ts, so-vang-sua-so-khach.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ORDERS = "src/modules/orders/index.ts";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
const FILES = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))].map((abs) => ({ file: relative(ROOT, abs), src: readFileSync(abs, "utf8") }));

/** Khối `{…}` bắt đầu ở dấu `{` tại `open` (trên bản che) → chỉ số `}` khớp. */
function khop(m: string, open: number): number {
  let d = 0;
  for (let i = open; i < m.length; i++) {
    if (m[i] === "{") d++;
    else if (m[i] === "}" && --d === 0) return i;
  }
  throw new Error("ngoặc không khớp");
}
/** Thân hàm `function <ten>(` (async hay không) của một tệp, trên bản che. */
function thanHam(file: string, ten: string): { m: string; tu: number; den: number } {
  const src = FILES.find((f) => f.file === file)!.src;
  const m = maskSource(src);
  const at = m.search(new RegExp(`\\bfunction\\s+${ten}\\s*\\(`));
  assert.ok(at >= 0, `không thấy function ${ten} ở ${file}`);
  // `{` mở thân: sau `)` đóng tham số, dấu `{` đầu tiên NGOÀI ngoặc nhọn `<…>` (kiểu trả về như `Promise<{…}>`). Kiểu trả về là một khối `{…}` trần
  // (không có ở hàm đang canh) thì bài báo đỏ "không thấy" thay vì canh sai chỗ — chấp nhận.
  let i = m.indexOf("(", at), sau = 0;
  for (let d = 0; i < m.length; i++) {
    if (m[i] === "(") d++;
    else if (m[i] === ")" && --d === 0) { sau = i; break; }
  }
  let open = -1;
  for (let j = sau + 1, nhon = 0; j < m.length; j++) {
    if (m[j] === "<") nhon++;
    else if (m[j] === ">" && m[j - 1] !== "=") nhon--;
    else if (m[j] === "{" && nhon === 0) { open = j; break; }
  }
  assert.ok(open > sau, `không thấy thân function ${ten}`);
  return { m, tu: open, den: khop(m, open) };
}
/** Thân handler của route khai bằng `route("<METHOD>", "<path>"` (tìm trên bản gốc vì bản che xoá chữ đường dẫn). */
function thanRoute(file: string, method: string, path: string): string {
  const src = FILES.find((f) => f.file === file)!.src;
  const at = src.indexOf(`route("${method}", "${path}"`);
  assert.ok(at >= 0, `không thấy route ${method} ${path} ở ${file}`);
  const m = maskSource(src);
  const open = m.indexOf("=> {", at) + 3;
  return m.slice(open, khop(m, open) + 1);
}
const goi = (m: string, ten: string): number[] => [...m.matchAll(new RegExp(`\\b${ten}\\s*\\(`, "g"))].map((x) => x.index!);

test("(1) planMoneyEdit chỉ được gọi ở MỘT chỗ: thân soanSuaSoKhach (orders/index.ts) — đường chung của HDV và văn phòng", () => {
  const cho = FILES.flatMap((f) => {
    const m = maskSource(f.src);
    return goi(m, "planMoneyEdit").filter((i) => !/function\s+$/.test(m.slice(Math.max(0, i - 12), i))).map((i) => ({ file: f.file, i }));
  });
  assert.equal(cho.length, 1, `planMoneyEdit được gọi ${cho.length} chỗ: ${cho.map((c) => c.file).join(", ")}`);
  const t = thanHam(ORDERS, "soanSuaSoKhach");
  assert.equal(cho[0]!.file, ORDERS);
  assert.ok(cho[0]!.i > t.tu && cho[0]!.i < t.den, "lời gọi planMoneyEdit nằm trong thân soanSuaSoKhach");
});

test("(2) insertMoneyAdjustment chỉ được gọi trong soanSuaSoKhach, hai số tiền truyền vào là ĐÚNG plan.subtotalBefore / plan.subtotalAfter", () => {
  const cho = FILES.flatMap((f) => {
    const m = maskSource(f.src);
    return goi(m, "insertMoneyAdjustment").filter((i) => !/function\s+$/.test(m.slice(Math.max(0, i - 12), i))).map((i) => ({ file: f.file, i, src: f.src }));
  });
  assert.equal(cho.length, 1, `insertMoneyAdjustment được gọi ${cho.length} chỗ: ${cho.map((c) => c.file).join(", ")}`);
  const t = thanHam(ORDERS, "soanSuaSoKhach");
  assert.ok(cho[0]!.file === ORDERS && cho[0]!.i > t.tu && cho[0]!.i < t.den, "lời gọi nằm trong thân soanSuaSoKhach");
  // Tách đối số ở độ sâu ngoặc 0 (đối số thứ tư `(latest?.seq ?? 0) + 1` có ngoặc riêng).
  const src = cho[0]!.src, doi: string[] = [];
  let d = 0, tu = src.indexOf("(", cho[0]!.i) + 1;
  for (let j = tu; j < src.length; j++) {
    const c = src[j];
    if (c === "(" || c === "[" || c === "{") d++;
    else if ((c === ")" || c === "]" || c === "}") && d-- === 0) { doi.push(src.slice(tu, j).trim()); break; }
    else if (c === "," && d === 0) { doi.push(src.slice(tu, j).trim()); tu = j + 1; }
  }
  assert.equal(doi.length, 10, `insertMoneyAdjustment nhận 10 đối số: ${doi.join(" | ")}`);
  assert.deepEqual([doi[6], doi[7]], ["plan.subtotalBefore", "plan.subtotalAfter"], doi.join(" | "));
});

test("(3) route văn phòng: can(order.money.edit, { ownerId }) KHÔNG assigned; soạn soanSuaSoKhach rồi chạy MỘT lần chayLoSuaSoKhach; không tự gọi .batch(", () => {
  const goc = FILES.find((f) => f.file === ORDERS)!.src;
  const at = goc.indexOf('route("POST", "/api/orders/:id/money-edit"');
  const than = thanRoute(ORDERS, "POST", "/api/orders/:id/money-edit");
  const thanGoc = goc.slice(goc.indexOf("=> {", at) + 3, goc.indexOf("=> {", at) + 3 + than.length);
  const hoi = thanGoc.match(/can\(staff, "order\.money\.edit", \{[^}]*\}\)/g) ?? [];
  assert.deepEqual(hoi, ['can(staff, "order.money.edit", { ownerId: meta.staffId })'], "đúng một câu hỏi ô, không kèm assigned");
  const soan = goi(than, "soanSuaSoKhach");
  const chay = goi(than, "chayLoSuaSoKhach");
  assert.equal(soan.length, 1, "soạn đúng một lần");
  assert.equal(chay.length, 1, "chạy lô đúng một lần");
  assert.ok(soan[0]! < chay[0]!, "soạn TRƯỚC, chạy SAU (chỗ chèn đồng bộ chuyến nằm giữa)");
  assert.equal(goi(than, "batch").length, 0, "route không tự gọi db.batch — một lô qua chayLoSuaSoKhach");
  assert.equal(goi(than, "planMoneyEdit").length + goi(than, "insertMoneyAdjustment").length, 0, "route không tự gọi luật / cửa ghi — đi qua soanSuaSoKhach");
});

/** Định danh TIỀN DÒNG (đơn giá, thành tiền, tạm tính, giá danh mục) — phép tính trên chúng chỉ được nằm trong luật, không trong thân route. */
const TIEN_DONG = /\b(unitPrice|unit_price|lineTotal|line_total|subtotal|subtotalBefore|subtotalAfter|catalogPrice|catalog_price|price_adult|price_child|price_senior|price_infant)\b/;
const PHEP_TINH = /(\b(unitPrice|unit_price|lineTotal|line_total|subtotal|subtotalBefore|subtotalAfter|catalogPrice|catalog_price|price_adult|price_child|price_senior|price_infant)\b\s*[-+*/%]=?(?!>))|([-+*/%]=?\s*(\w+\.)*\b(unitPrice|unit_price|lineTotal|line_total|subtotal|subtotalBefore|subtotalAfter|catalogPrice|catalog_price|price_adult|price_child|price_senior|price_infant)\b)/;

test("(4) KHÔNG thân route nào làm phép tính trên định danh tiền dòng — tiền chỉ tính trong luật (planMoneyEdit, buildLines)", () => {
  let soRoute = 0;
  const vi: string[] = [];
  for (const f of FILES.filter((x) => x.file.startsWith("src/modules/"))) {
    const m = maskSource(f.src);
    for (const x of m.matchAll(/\broute\(/g)) {
      const mo = m.indexOf("=> {", x.index!);
      if (mo < 0) continue;
      const open = mo + 3;
      const than = m.slice(open, khop(m, open) + 1);
      soRoute++;
      than.split("\n").forEach((l, k) => {
        if (TIEN_DONG.test(l) && PHEP_TINH.test(l)) vi.push(`${f.file}:${m.slice(0, open).split("\n").length + k}: ${l.trim()}`);
      });
    }
  }
  assert.ok(soRoute >= 200, `chống bài rỗng: chỉ bóc được ${soRoute} route`);
  assert.deepEqual(vi, []);
});

test("(4) tự kiểm bộ bắt phép tính: bắt nhân / cộng / trừ trên tiền dòng; không bắt mũi tên, so sánh, gán thẳng", () => {
  for (const l of ["const t = it.unitPrice * q;", "total = subtotal - discount;", "x += lineTotal", "a.subtotalAfter-1", "n + r.price_adult"]) assert.ok(PHEP_TINH.test(l), l);
  for (const l of ["const s = plan.subtotalAfter;", "items.map((i) => i.lineTotal)", "if (o.subtotal === 0) return x;", "{ subtotal, total }"]) assert.ok(!PHEP_TINH.test(l), l);
});
