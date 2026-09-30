// NT-R9 (sổ tiền lượt 1 — ADR-0026 điều 9, Hiến chương 5.4 "một nguồn tính tiền"; kế hoạch Task 7): ba cột cọc cũ của `orders` (`deposit_amount`,
// `deposit_method`, `remaining_amount`) NGỪNG được đọc — mọi bề mặt "đã trả / còn lại" lấy số từ billing (`billing/rules.ts:conLai`, HÀM DUY NHẤT).
// Quét MỌI tệp chạy thật `src/**`, `web/**` (trừ *.test.ts) trên bản đã che chú thích:
//   (1) tên cột / trường / kiểu cũ — GIỮ chuỗi (SQL nằm trong chuỗi): deposit_amount, deposit_method, remaining_amount, depositAmount, depositMethod,
//       remainingAmount, DEPOSIT_METHODS, DepositMethod;
//   (2) tên viết tắt `deposit` / `remaining` làm ĐỊNH DANH — che cả chuỗi (lớp CSS "order-row-remaining" không phải tiền).
// DANH SÁCH CHO PHÉP chính xác (tệp + khuôn dòng + lý do); mục cho phép không còn khớp dòng nào → đỏ ("cho phép thừa").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEN_CU = /\b(deposit_amount|deposit_method|remaining_amount|depositAmount|depositMethod|remainingAmount|DEPOSIT_METHODS|DepositMethod)\b/;
const TEN_TAT = /\b(deposit|remaining)\b/;

/** Chỗ DUY NHẤT còn được nhắc ba cột (ghi để thoả trigger 0007 / Q2 / từ chối trang lập đơn cũ) — không chỗ nào ĐỌC số ra để hiện hay tính. */
const CHO_PHEP: { file: string; khuon: RegExp; lyDo: string }[] = [
  { file: "src/modules/orders/repository.ts", khuon: /subtotal, discount, total, deposit_amount, deposit_method, remaining_amount, payment_note, created_at/, lyDo: "INSERT tạo đơn: ghi 0 / NULL / total để thoả trigger 0007 (ADR-0026 đ9)" },
  { file: "src/modules/orders/repository.ts", khuon: /deposit_amount = CASE WHEN \? < deposit_amount THEN 0 ELSE deposit_amount END/, lyDo: "UPDATE lưu nháp: Q2 — tổng < cọc cũ thì đưa cọc về 0" },
  { file: "src/modules/orders/repository.ts", khuon: /deposit_method = CASE WHEN \? < deposit_amount THEN NULL ELSE deposit_method END/, lyDo: "như trên" },
  { file: "src/modules/orders/repository.ts", khuon: /remaining_amount = CASE WHEN \? < deposit_amount THEN \? ELSE \? - deposit_amount END/, lyDo: "như trên (giữ phép trừ của 0007)" },
  { file: "src/modules/orders/repository.ts", khuon: /SELECT deposit_amount FROM orders WHERE id = \? AND status = 'draft'/, lyDo: "Q2: đọc cọc cũ CHỈ để ghi nhật ký khi đưa về 0" },
  { file: "src/modules/orders/repository.ts", khuon: /deposit_amount: number \}>\(\)\)\?\.deposit_amount/, lyDo: "như trên (kiểu dòng của câu Q2)" },
  { file: "src/modules/orders/rules.ts", khuon: /typeof b\.depositAmount === "number" && b\.depositAmount > 0/, lyDo: "từ chối (client_outdated) trang lập đơn CŨ còn gửi khoản trả trước trong thân đơn" },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

function hits(): { file: string; line: number; text: string }[] {
  const out: { file: string; line: number; text: string }[] = [];
  for (const f of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))]) {
    const rel = relative(ROOT, f).split(sep).join("/");
    const src = readFileSync(f, "utf8");
    const giuChuoi = maskSource(src, { strings: false, comments: true }).split("\n");
    const cheChuoi = maskSource(src, { strings: true, comments: true }).split("\n");
    giuChuoi.forEach((l, i) => {
      if (TEN_CU.test(l) || TEN_TAT.test(cheChuoi[i]!)) out.push({ file: rel, line: i + 1, text: l.trim() });
    });
  }
  return out;
}

test("NT-R9: không tệp chạy thật nào đọc ba cột cọc cũ / tên cũ ngoài danh sách cho phép; mỗi mục cho phép còn khớp", () => {
  const all = hits();
  const lot = all.filter((h) => !CHO_PHEP.some((c) => c.file === h.file && c.khuon.test(h.text)));
  assert.deepEqual(lot.map((h) => `${h.file}:${h.line}: ${h.text.slice(0, 140)}`), [], "bề mặt 'đã trả / còn lại' phải lấy số của billing (ADR-0026 đ9)");
  for (const c of CHO_PHEP) assert.ok(all.some((h) => h.file === c.file && c.khuon.test(h.text)), `mục cho phép thừa (không còn dòng nào khớp): ${c.file} ${c.khuon}`);
});
