// Giờ dân sự hiện ra trên giao diện phải theo giờ Việt Nam (CLAUDE.md §7), không theo múi giờ của máy người xem
// (máy đặt múi giờ khác, hoặc trình duyệt thử nghiệm chạy UTC, sẽ thấy lệch giờ). Mọi chỗ định dạng NGÀY/GIỜ trong
// web/ bằng `toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` trên một Date, hoặc `Intl.DateTimeFormat`,
// phải khai `timeZone` trên cùng dòng. Định dạng SỐ (`n.toLocaleString("vi-VN")`) không thuộc diện này.
// Phát hiện gốc: báo cáo kiểm tra giao diện 2026-09-23 (trang Góp ý thiếu múi giờ), làm nốt 2026-10-05.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WEB = join(import.meta.dirname, "..", "web");
const DINH_DANG_NGAY = /(new Date\([^)]*\)|\bDate\b[^;]*)\.toLocale(String|DateString|TimeString)\(|Intl\.DateTimeFormat\(/u;

test("giờ trên giao diện: mọi chỗ định dạng ngày/giờ trong web/ khai timeZone (giờ Việt Nam)", () => {
  const thieu: string[] = [];
  for (const ten of readdirSync(WEB)) {
    if (!ten.endsWith(".ts")) continue;
    const dong = readFileSync(join(WEB, ten), "utf8").split("\n");
    dong.forEach((d, i) => {
      if (DINH_DANG_NGAY.test(d) && !d.includes("timeZone")) thieu.push(`web/${ten}:${i + 1}`);
    });
  }
  assert.deepEqual(thieu, [], `Thiếu timeZone: "Asia/Ho_Chi_Minh" ở: ${thieu.join(", ")}`);
});
