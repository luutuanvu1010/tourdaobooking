// MỘT LUẬT SỐ NGƯỜI CỦA CHẶNG (ADR-0054 D10.3 "Hệ quả": bài kiểm "một luật" — khuôn bài học Đợt E "hai luật"; kế hoạch 2026-10-01-may-chu-o-moi-chang Task 5,
// TC-P9). Số người hiệu lực của một chặng CHỈ tính ở `soNguoiChang` (src/shared/so-nguoi-chang.ts); cộng bốn loại tuổi CHỈ ở `tongKhach` cùng tệp.
// Quét MỌI tệp chạy thật của `src/modules/orders/`, `src/modules/van-chuyen/`, `src/shared/dieu-phoi-*.ts` (trừ *.test.ts) trên bản đã che chú thích:
//   (1) biểu thức CỘNG bốn loại tuổi (`adult + child + senior + infant`, kể cả dạng cột `pax_adult + …`) — ngoài danh sách cho phép → đỏ;
//   (2) `paxTotal(` (một cách cộng khác) — ngoài danh sách cho phép → đỏ;
//   (3) ở `orders`, mọi khoá `soNguoi:` mang GIÁ TRỊ (không phải khai kiểu) phải là `soNguoiChang(` — chống "soNguoi: tongKhach(p)" bỏ qua số người về.
// DANH SÁCH CHO PHÉP chính xác (tệp + khuôn dòng + lý do); mục không còn khớp → đỏ ("cho phép thừa"). Chống bài rỗng: đúng MỘT định nghĩa `soNguoiChang`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CONG_BON = /\b(?:pax_)?adult\s*\+\s*[\w.]*?\b(?:pax_)?child\s*\+\s*[\w.]*?\b(?:pax_)?senior\s*\+\s*[\w.]*?\b(?:pax_)?infant\b/;
const PAX_TOTAL = /\bpaxTotal\(/;

/** Chỗ được cộng bốn loại tuổi / gọi `paxTotal` — đều là số khách của DỊCH VỤ (không phải số người của chặng). */
const CHO_PHEP: { file: string; khuon: RegExp; lyDo: string }[] = [
  { file: "src/modules/orders/chang-hanh-khach-repo.ts", khuon: /s\.pax_adult \+ s\.pax_child \+ s\.pax_senior \+ s\.pax_infant < 1/, lyDo: "order_confirm: mọi dịch vụ ≥ 1 khách (số khách dịch vụ)" },
  { file: "src/modules/orders/service-rules.ts", khuon: /if \(paxTotal\(value\) > MAX_GUESTS_PER_SERVICE\)/, lyDo: "trần số khách MỖI DỊCH VỤ" },
  { file: "src/modules/orders/service-rules.ts", khuon: /if \(paxTotal\(sv\.pax\) < 1\) reasons\.push\("no_guests"\)/, lyDo: "lý do chưa xác nhận được: dịch vụ chưa có khách" },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}
const tep = (): string[] => [
  ...walk(join(ROOT, "src/modules/orders")),
  ...walk(join(ROOT, "src/modules/van-chuyen")),
  ...readdirSync(join(ROOT, "src/shared")).filter((n) => /^dieu-phoi-.*\.ts$/.test(n) && !n.endsWith(".test.ts")).map((n) => join(ROOT, "src/shared", n)),
];
const rel = (f: string) => relative(ROOT, f).split(sep).join("/");

function hits(): { file: string; line: number; text: string }[] {
  const out: { file: string; line: number; text: string }[] = [];
  for (const f of tep()) {
    const giuChuoi = maskSource(readFileSync(f, "utf8"), { strings: false, comments: true }).split("\n");
    giuChuoi.forEach((l, i) => {
      if (CONG_BON.test(l) || PAX_TOTAL.test(l)) out.push({ file: rel(f), line: i + 1, text: l.trim() });
    });
  }
  return out;
}

test("ADR-0054 D10.3 (một luật): không tệp nào của orders / van-chuyen / dieu-phoi-* tự cộng bốn loại tuổi hay gọi paxTotal ngoài danh sách cho phép; mỗi mục cho phép còn khớp", () => {
  assert.ok(tep().length > 20, "chống bài rỗng: phải quét đủ tệp");
  const all = hits();
  const lot = all.filter((h) => !CHO_PHEP.some((c) => c.file === h.file && c.khuon.test(h.text)));
  assert.deepEqual(lot.map((h) => `${h.file}:${h.line}: ${h.text.slice(0, 160)}`), [], "số người của chặng chỉ tính ở soNguoiChang; số khách dịch vụ cộng bằng tongKhach (src/shared/so-nguoi-chang.ts)");
  for (const c of CHO_PHEP) assert.ok(all.some((h) => h.file === c.file && c.khuon.test(h.text)), `mục cho phép thừa (không còn dòng nào khớp): ${c.file} ${c.khuon}`);
});

test("ADR-0054 D10.3 (một luật): ở orders, mọi khoá `soNguoi:` mang giá trị đều đi qua soNguoiChang(; đúng MỘT định nghĩa soNguoiChang và tongKhach (ở src/shared/so-nguoi-chang.ts)", () => {
  let gan = 0;
  for (const f of walk(join(ROOT, "src/modules/orders"))) {
    const dong = maskSource(readFileSync(f, "utf8"), { strings: true, comments: true }).split("\n");
    dong.forEach((l, i) => {
      const m = /\bsoNguoi\s*:\s*(.+)$/.exec(l);
      if (!m || /^(number|string|boolean)\b/.test(m[1]!.trim())) return;
      gan++;
      assert.match(m[1]!, /^\s*soNguoiChang\(/, `${rel(f)}:${i + 1}: soNguoi phải là soNguoiChang(...) — ${l.trim()}`);
    });
  }
  assert.ok(gan >= 2, `chống bài rỗng: lichChungChang + hanhKhachChoChuyen phải gán soNguoi (thấy ${gan})`);
  const dinhNghia: string[] = [];
  for (const f of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))]) {
    const s = maskSource(readFileSync(f, "utf8"), { strings: true, comments: true });
    if (/\bfunction soNguoiChang\b|\bsoNguoiChang\s*=/.test(s)) dinhNghia.push(`${rel(f)}:soNguoiChang`);
    if (/\bfunction tongKhach\b|\btongKhach\s*=\s*\(/.test(s)) dinhNghia.push(`${rel(f)}:tongKhach`);
  }
  assert.deepEqual(dinhNghia.sort(), ["src/shared/so-nguoi-chang.ts:soNguoiChang", "src/shared/so-nguoi-chang.ts:tongKhach"]);
});
