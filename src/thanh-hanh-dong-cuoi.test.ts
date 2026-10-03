// Kiểu D (kiểm theo vai 2/10 — lộ trình 3/10 V1.5a): nút "Hỗ trợ" nổi né thanh nút cuối trang theo MỘT lớp chung `thanh-hanh-dong-cuoi`, không theo danh
// sách bộ chọn đóng (bài học: nút "Kết thúc chuyến" nằm trong `.dp-run-end` — không thuộc danh sách — bị nút nổi đè ở khổ 390).
// (1) web/tro-ly.ts chỉ đo đúng lớp chung; (2) mọi khối mang lớp thanh cuối trang đã biết (HTML tĩnh + chuỗi lớp trong h(…) của web/*.ts) đều mang lớp chung.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LOP_CHUNG = "thanh-hanh-dong-cuoi";
/** Lớp riêng của các thanh nút cuối trang / cuối danh sách hiện có. Thanh mới: thêm lớp chung (bài này không đoán được lớp mới — dựa vào kỷ luật). */
const LOP_THANH = ["form-actions", "vc-bottom-bar", "dp-run-end", "dp-ct-bottom"];

test("tro-ly.ts: hàm né của nút nổi đo ĐÚNG lớp chung, không còn danh sách bộ chọn đóng", () => {
  const src = readFileSync(join(ROOT, "web", "tro-ly.ts"), "utf8");
  const ham = src.slice(src.indexOf("function nangTheoThanhDay"), src.indexOf("export async function ganTroLy"));
  assert.match(ham, new RegExp(`querySelectorAll<HTMLElement>\\("\\.${LOP_CHUNG}"\\)`));
  for (const lop of LOP_THANH) assert.doesNotMatch(ham, new RegExp(`querySelectorAll[^\\n]*\\.${lop}\\b`), `không đo riêng .${lop}`);
});

test("mọi khối mang lớp thanh cuối trang đã biết cũng mang lớp chung (HTML + h() của web/*.ts)", () => {
  const thieu: string[] = [];
  const quet = (tep: string, re: RegExp) => {
    const src = readFileSync(tep, "utf8");
    for (const m of src.matchAll(re)) {
      const lop = m[1]!.split(/\s+/);
      if (LOP_THANH.some((x) => lop.includes(x)) && !lop.includes(LOP_CHUNG)) thieu.push(`${tep.slice(ROOT.length)}: "${m[1]}"`);
    }
  };
  for (const f of readdirSync(join(ROOT, "public")).filter((x) => x.endsWith(".html"))) quet(join(ROOT, "public", f), /class="([^"]*)"/g);
  for (const f of readdirSync(join(ROOT, "web")).filter((x) => x.endsWith(".ts"))) quet(join(ROOT, "web", f), /class: "([^"]*)"/g);
  assert.deepEqual(thieu, []);
});
