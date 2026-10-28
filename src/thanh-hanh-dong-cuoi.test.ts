// Kiểu D (kiểm theo vai 2/10 — lộ trình 3/10 V1.5a): nút "Hỗ trợ" nổi né thanh nút cuối trang theo MỘT lớp chung `thanh-hanh-dong-cuoi`, không theo danh
// sách bộ chọn đóng (bài học: nút "Kết thúc chuyến" nằm trong `.dp-run-end` — không thuộc danh sách — bị nút nổi đè ở khổ 390).
// (1) web/tro-ly.ts không còn hàm né (đợt 0 Task 8: nút Trợ lý lên thanh trên; lớp chung vẫn dùng cho thanh dính khác); (2) mọi khối mang lớp thanh cuối trang đã biết (HTML tĩnh + chuỗi lớp trong h(…) của web/*.ts) đều mang lớp chung.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LOP_CHUNG = "thanh-hanh-dong-cuoi";
/** Lớp riêng của các thanh nút cuối trang / cuối danh sách hiện có. Thanh mới: thêm lớp chung (bài này không đoán được lớp mới — dựa vào kỷ luật). */
const LOP_THANH = ["form-actions", "vc-bottom-bar", "dp-run-end", "dp-ct-bottom", "ht-tra-loi"];

test("tro-ly.ts: nút Trợ lý ở thanh trên (đợt 0 K6) — không còn nút nổi nên không còn hàm né thanh nút cuối trang", () => {
  const src = readFileSync(join(ROOT, "web", "tro-ly.ts"), "utf8");
  assert.doesNotMatch(src, /nangTheoThanhDay|tl-fab|tl-nang/);
  assert.match(src, /getElementById\("topbar"\)/);
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

test("trang Hỗ trợ: ô trả lời dính đáy của luồng một yêu cầu mang lớp chung (nút nổi Hỗ trợ né được)", () => {
  const src = readFileSync(join(ROOT, "web", "ho-tro-luong.ts"), "utf8");
  assert.match(src, new RegExp(`class: "ht-tra-loi ${LOP_CHUNG}"`));
});
