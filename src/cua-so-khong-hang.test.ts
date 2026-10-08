// ADR-0096 Đ2.2 (gói A1): cửa sổ xuất bến là CHÍNH SÁCH có ngày hiệu lực — "12 giờ là mặc định trong bảng chính sách, không viết cứng" (lời chủ khi duyệt).
// Bài quét: trong src/ và web/ (trừ bài thử) không có hằng cửa sổ — không con số 720 / 12 giờ trên dòng nói về cửa sổ, không mili-giây 12 giờ, không "?? <số>"
// cho cột cửa sổ (thiếu → giữ CHINH_SACH_RONG, không tự điền). Con số mặc định CHỈ ở migration 0084 (DEFAULT của cột).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
function tep(dir: string): string[] {
  const out: string[] = [];
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) out.push(...tep(p));
    else if (/\.(ts|mjs|js)$/.test(ten) && !/\.test\.(ts|mjs)$/.test(ten)) out.push(p);
  }
  return out;
}
const NOI_CUA_SO = /cuaSo|cua_so|cửa sổ|departureWindow|departure_window|xuất bến sớm nhất/i;

test("ADR-0096 Đ2.2: không hằng cửa sổ xuất bến trong src/ và web/ (con số mặc định chỉ ở migration)", () => {
  const vi: string[] = [];
  for (const f of [...tep(join(ROOT, "src")), ...tep(join(ROOT, "web"))]) {
    readFileSync(f, "utf8").split("\n").forEach((dong, i) => {
      const cho = `${f.slice(ROOT.length + 1)}:${i + 1}`;
      if (NOI_CUA_SO.test(dong) && /\b720\b|\b12 giờ\b|\b12h\b/.test(dong)) vi.push(`${cho}: con số cửa sổ viết cứng`);
      if (/\b43_?200_?000\b|\b12 \* 3600e3\b|\b12 \* 60 \* 60/.test(dong)) vi.push(`${cho}: mili-giây 12 giờ`);
      if (/(departureWindowMinutes|departure_window_minutes)\s*(\?\?|\|\|)/.test(dong)) vi.push(`${cho}: tự điền cửa sổ khi thiếu`);
    });
  }
  assert.deepEqual(vi, []);
});
