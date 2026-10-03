// Kiểu D (kiểm theo vai 2/10 — lộ trình 3/10 V1.5b): ngày hiển thị đi qua MỘT hàm (`ngayNgan` / `ngayDayDu` / `thuNgayNgan` ở src/shared/vn-date.ts — tự
// thêm năm khi khác năm tham chiếu). Bài quét: mã nguồn (src/, web/, trừ tệp test) không cắt chuỗi ngày bằng `slice(8, 10)` / `slice(5, 7)` — kể cả vn-date.ts
// (dùng biểu thức khuôn ngày).
// Ngoại lệ CÓ TÊN, có lý do; thêm ngoại lệ = nới luật — người kiểm soi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const NGOAI_LE: Record<string, string> = {
  "src/modules/billing/rules.ts": "vùng sổ tiền — ngoài phạm vi V1 (không chạm billing); đã có năm (dd/mm/yyyy). Chuyển sang ngayDayDu ở đợt chạm billing",
  "src/modules/van-chuyen/index.ts": "mã chuyến CX-ddmm-NN là MÃ dữ liệu (đã cấp, không đổi khuôn), không phải ngày hiển thị",
};
const CAT = /\.slice\(\s*8\s*,\s*10\s*\)|\.slice\(\s*5\s*,\s*7\s*\)/;

function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return tepTs(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

test("ngày hiển thị qua MỘT hàm: không slice(8, 10) / slice(5, 7) trong src/ và web/ (trừ ngoại lệ có tên)", () => {
  const vipham: string[] = [];
  for (const p of [...tepTs(join(ROOT, "src")), ...tepTs(join(ROOT, "web"))]) {
    const ten = relative(ROOT, p).split("\\").join("/");
    if (Object.hasOwn(NGOAI_LE, ten)) continue;
    readFileSync(p, "utf8").split("\n").forEach((dong, i) => {
      if (CAT.test(dong)) vipham.push(`${ten}:${i + 1}`);
    });
  }
  assert.deepEqual(vipham, [], "dùng ngayNgan(iso, thamChieu) / ngayDayDu(iso) của src/shared/vn-date.ts");
});

test("ngoại lệ còn sống: tệp có thật và vẫn còn cắt chuỗi (ngoại lệ chết phải xoá)", () => {
  for (const ten of Object.keys(NGOAI_LE)) assert.match(readFileSync(join(ROOT, ten), "utf8"), CAT, ten);
});

test("ba hàm nhân bản cũ đã bỏ: dayMonth (web/format.ts), formatDm (src/shared/trip-form.ts), ngayNgan riêng của tin-chuyen.ts", () => {
  assert.doesNotMatch(readFileSync(join(ROOT, "web", "format.ts"), "utf8"), /export function dayMonth/);
  assert.doesNotMatch(readFileSync(join(ROOT, "src", "shared", "trip-form.ts"), "utf8"), /export const formatDm\b/);
  assert.doesNotMatch(readFileSync(join(ROOT, "src", "shared", "tin-chuyen.ts"), "utf8"), /const ngayNgan =/);
});
