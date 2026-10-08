// H1 — "MỘT HÀM PHẢI THU" (ADR-0109 bài kiểm 1; Hiến chương 5.4 "một con số — một chỗ tính"; nới rộng hàng rào `src/buildlines-guard.test.ts`).
// Phải thu hiện hành = max(0, tạm tính hiện hành − giảm giá), kẹp trong MỘT hàm `effectiveMoney` (src/modules/orders/money-adjustment.ts). Bài này quét MỌI
// tệp chạy thật `src/**`, `web/**` (.ts) và `scripts/**` (.ts, .mjs) — trừ *.test.ts, *.d.ts, `web/vendor/**` — trên bản CHE CHÚ THÍCH nhưng GIỮ CHUỖI (để bắt
// cả SQL nằm trong chuỗi, vd `nguoi-dat-gop-repo.ts`), tìm bốn khuôn:
//   P1  toán tử - + < > <= >= (kể cả -= +=) đứng TRƯỚC một toán hạng kết thúc bằng `discount` (hoặc `discount.value`); `=>` không tính;
//   P2  `discount` / `discount.value` đứng TRƯỚC toán tử so sánh hay cộng trừ;
//   P3  `Math.min(…)` / `Math.max(…)` có đối số chứa `discount`;
//   P4  `subtotal` trừ một biểu thức kết thúc bằng `total` (suy giảm giá ngược từ tổng — chỗ tính thứ hai, phiếu phản biện M2).
// Mỗi lần khớp phải nằm trong DANH SÁCH CHO PHÉP (tệp + khuôn dòng + lý do, neo theo khuôn mã, không theo số dòng); mục cho phép không còn khớp dòng nào → đỏ
// "cho phép thừa". Lần khớp lạ: người thi công BÁO LẠI, không tự thêm vào danh sách (kế hoạch ADR-0109 C1).
//
// GIỚI HẠN ĐÃ BIẾT (dựa vào kỷ luật + lớp thứ hai là bài hành vi H2 — TC8/TC8b/TC8c/TC8d, dashboard, dispatch):
//   - bí danh biến lọt qua: `const g = o.discount; … s - g` không bị bắt;
//   - tên không chứa chữ `discount` (vd `giamGia`) lọt qua;
//   - P1/P2 đòi KHOẢNG TRẮNG giữa toán hạng và toán tử (mã repo định dạng có khoảng trắng); `a-discount` viết dính không bị bắt — đổi lại, chuỗi kiểu
//     `"discount-hint"` (id phần tử, `web/order-form.ts`) không bị bắt nhầm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

const OPERAND = String.raw`[\w$.?!]*discount(?:\.value)?(?![\w$])`;
const KHUON: { ma: string; re: RegExp }[] = [
  { ma: "P1", re: new RegExp(String.raw`(?:^|[\s(,?:])(?:[-+]=?|[<>]=?)\s*\(?\s*${OPERAND}`) },
  { ma: "P2", re: /\bdiscount(?:\.value)?\s+(?:[-+]=?|[<>]=?)(?!>)/ },
  { ma: "P3", re: /Math\.(?:min|max)\([^)]*discount/ },
  { ma: "P4", re: /subtotal\s*-\s*[\w$.?!]*total\b/ },
];
/** Khuôn nào khớp dòng (đã che chú thích) — xuất cho bài tự kiểm bên dưới. */
export const khuonKhop = (dong: string): string[] => KHUON.filter((k) => k.re.test(dong)).map((k) => k.ma);

/**
 * Chỗ DUY NHẤT được trừ / so / kẹp giảm giá. Mỗi mục MỘT dòng mã (tách riêng từng dòng để xoá một dòng là đỏ "cho phép thừa" — phiếu phản biện, thiếu 3).
 * Rộng hơn ADR-0109 "Bối cảnh mã" (chỉ nêu phép TRỪ): khuôn P2/P3 bắt cả phép SO SÁNH, nên các chỗ so giảm giá với tạm tính / trần cũng phải có tên ở đây.
 */
const CHO_PHEP: { file: string; khuon: RegExp; lyDo: string }[] = [
  { file: "src/modules/orders/money-adjustment.ts", khuon: /return \{ total: subtotal - discount \};/, lyDo: "effectiveMoney — ĐỊNH NGHĨA phải thu (một hàm)" },
  { file: "src/modules/orders/rules.ts", khuon: /if \(discount\.value > subtotal\) return fail\(/, lyDo: "lập / lưu nháp: chặn giảm giá > tạm tính (giảm giá ≤ tạm tính lúc lập)" },
  { file: "src/modules/orders/rules.ts", khuon: /const total = subtotal - discount\.value;/, lyDo: "lập / lưu nháp: total đã lưu (đã chặn giảm giá ≤ tạm tính ở dòng trên; trigger 0007 giữ total = subtotal − discount ≥ 0)" },
  { file: "src/shared/service-form.ts", khuon: /const total = subtotal - discount;/, lyDo: "xem trước trên biểu mẫu nháp (chưa lưu; máy chủ tính lại khi lưu)" },
  { file: "src/shared/service-form.ts", khuon: /const warning = discount > subtotal \?/, lyDo: "xem trước trên biểu mẫu nháp: câu nhắc giảm giá > tạm tính" },
  { file: "src/modules/orders/nguoi-dat-gop-repo.ts", khuon: /o\.total IS NOT o\.subtotal - o\.discount/, lyDo: "kiểm dữ liệu ĐÃ LƯU (SQL) — cùng luật trigger 0007, không phải phải thu hiện hành" },
  { file: "src/shared/order-confirmation.ts", khuon: /order\.discount > 0 \? -order\.discount : order\.discount/, lyDo: "đổi dấu để in dòng Giảm giá của biên nhận (số máy chủ đặt vào ReceiptDto)" },
  { file: "web/order-form.ts", khuon: /if \(s\.discount > s\.subtotal\) lines\.push\(/, lyDo: "báo lỗi biểu mẫu nháp (máy chủ chặn lại ở rules.ts)" },
  { file: "src/modules/orders/price-guards.ts", khuon: /discountWithinCap = \(discount: number, maxDiscount: number\): boolean => discount <= maxDiscount/, lyDo: "trần giảm giá của tài khoản Đối tác (ADR-0027), không phải phải thu" },
];

function walk(dir: string, exts: readonly string[]): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "vendor" ? [] : walk(p, exts);
    return exts.some((e) => p.endsWith(e)) && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

function hits(): { file: string; line: number; text: string; khuon: string[] }[] {
  const out: { file: string; line: number; text: string; khuon: string[] }[] = [];
  const files = [...walk(join(ROOT, "src"), [".ts"]), ...walk(join(ROOT, "web"), [".ts"]), ...walk(join(ROOT, "scripts"), [".ts", ".mjs"])];
  for (const f of files) {
    const rel = relative(ROOT, f).split(sep).join("/");
    const dong = maskSource(readFileSync(f, "utf8"), { strings: false, comments: true }).split("\n");
    dong.forEach((l, i) => {
      const k = khuonKhop(l);
      if (k.length) out.push({ file: rel, line: i + 1, text: l.trim(), khuon: k });
    });
  }
  return out;
}

test("H1 tự kiểm khuôn: bắt phép trừ / so / kẹp giảm giá và suy ngược từ tổng; không bắt chuỗi 'discount-hint', mũi tên, phép gán thường", () => {
  for (const dong of [
    "x = effectiveSubtotal(a, b) - r.discount;",
    "const t = subtotal - discount;",
    "if (o.discount > o.subtotal) warn();",
    "total -= discount;",
    "const g = Math.min(discount, subtotal);",
    "const x = order.subtotal - order.total;",
    "WHERE o.total IS NOT o.subtotal - o.discount",
  ]) assert.ok(khuonKhop(dong).length > 0, `phải bắt: ${dong}`);
  for (const dong of [
    'const hint = h("p", { class: "muted", id: "discount-hint" }, "x");',
    "discount: r.discount,",
    "const f = (discount: number) => discount;",
    "discount: order.giamGiaHieuLuc,",
  ]) assert.deepEqual(khuonKhop(dong), [], `không được bắt: ${dong}`);
});

test("H1 (ADR-0109 bài 1): không tệp chạy thật nào trừ / so / kẹp giảm giá ngoài danh sách cho phép; mỗi mục cho phép còn khớp", () => {
  const all = hits();
  assert.ok(all.some((h) => h.file === "src/modules/orders/money-adjustment.ts"), "tự kiểm: máy quét phải thấy định nghĩa trong effectiveMoney");
  const lot = all.filter((h) => !CHO_PHEP.some((c) => c.file === h.file && c.khuon.test(h.text)));
  assert.deepEqual(
    lot.map((h) => `${h.file}:${h.line} [${h.khuon.join(",")}] "${h.text.slice(0, 140)}"`),
    [],
    "Trừ / so giảm giá ngoài danh sách cho phép — phải thu chỉ tính bằng effectiveMoney (ADR-0109, Hiến chương 5.4)",
  );
  for (const c of CHO_PHEP) assert.ok(all.some((h) => h.file === c.file && c.khuon.test(h.text)), `mục cho phép thừa (không còn dòng nào khớp): ${c.file} ${c.khuon}`);
});
