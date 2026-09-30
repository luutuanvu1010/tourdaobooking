// Phông và thang cỡ chữ (rà soát 2026-09-30, chủ dự án báo "lỗi phông nhẹ trên Windows"). Đọc thẳng public/app.css.
// Gốc lỗi đã đo: (1) phông tách hai tệp theo unicode-range → chữ gõ kiểu "Unicode tổ hợp" có chữ gốc ở tệp Latin, dấu ở tệp tiếng Việt, trình duyệt
// không ghép được → dấu lệch; (2) nút/ô của trình duyệt không kế thừa phông → Windows vẽ Arial giữa trang; (3) ký tự phông không có (→ ✓ ✕) rơi
// về phông tuỳ máy. Bài này giữ ba lỗ đó đóng và giữ mọi cỡ chữ trên MỘT thang.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { PRECACHE } from "./shared/sw-policy.ts";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("\n}", css.indexOf(":root")));
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]!);

test("mỗi @font-face là MỘT tệp đủ chữ, không tách theo unicode-range", () => {
  assert.ok(faces.length > 0, "không thấy @font-face nào");
  for (const f of faces) assert.doesNotMatch(f, /unicode-range/, `@font-face còn tách unicode-range: ${f.trim().slice(0, 90)}`);
});

test("tệp phông khai trong CSS có thật, đủ lớn để chứa chữ Việt, và được service worker nạp sẵn", () => {
  for (const f of faces) {
    const url = /url\("([^"]+)"\)/.exec(f)?.[1];
    assert.ok(url, "@font-face thiếu url");
    const file = new URL(`../public${url}`, import.meta.url);
    assert.ok(existsSync(file), `thiếu tệp ${url}`);
    assert.ok(statSync(file).size > 20_000, `${url} quá nhỏ — có thể chỉ là tập con Latin hoặc tiếng Việt`);
    assert.ok(PRECACHE.includes(url), `${url} chưa có trong PRECACHE (src/shared/sw-policy.ts)`);
  }
  for (const p of PRECACHE.filter((x) => x.startsWith("/fonts/"))) {
    assert.ok(faces.some((f) => f.includes(`url("${p}")`)), `PRECACHE nạp ${p} nhưng CSS không dùng`);
  }
});

test("mọi độ đậm CSS dùng đều có tệp phông riêng (không để trình duyệt tự tô đậm giả)", () => {
  const khai = new Set(faces.map((f) => /font-weight:\s*(\d+)/.exec(f)?.[1]));
  const dung = new Set([...css.matchAll(/font-weight:\s*(\d{3})/g), ...css.matchAll(/font:\s*(\d{3})\s/g)].map((m) => m[1]));
  dung.add("400"); // chữ thường của body
  for (const w of dung) assert.ok(khai.has(w), `độ đậm ${w} được dùng nhưng không có @font-face`);
});

test("chồng phông: Be Vietnam Pro trước, có dự phòng Windows cho ký tự phông không có", () => {
  for (const name of ["--font", "--font-display"]) {
    const v = new RegExp(`\\n\\s*${name}:\\s*([^;]+);`).exec(root)?.[1] ?? "";
    assert.match(v, /^"Be Vietnam Pro",/, `${name} phải mở đầu bằng "Be Vietnam Pro"`);
    assert.match(v, /"Segoe UI",\s*"Segoe UI Symbol"/, `${name} thiếu dự phòng Windows`);
  }
});

test("nút và ô gõ kế thừa phông của trang", () => {
  assert.match(css, /\nbutton, input, select, textarea \{ font-family: inherit; \}/);
});

test("thang cỡ chữ: mọi cỡ chữ đi qua token, token theo vai trỏ một bậc, bậc nhỏ nhất ≥ 12px", () => {
  const steps = [...root.matchAll(/--fs-step-(\d+):\s*(\d+)px;/g)].map((m) => Number(m[2]));
  assert.ok(steps.length >= 5, "thiếu thang --fs-step-*");
  assert.ok(Math.min(...steps) >= 12, `bậc nhỏ nhất ${Math.min(...steps)}px < 12px`);
  assert.deepEqual(steps, [...steps].sort((a, b) => a - b), "thang phải tăng dần");
  const cu = new Set(["--fs-h1", "--fs-h2", "--fs-old-muted", "--fs-old-label", "--fs-old-badge", "--fs-pin"]); // khối cũ bằng rem, giữ giá trị
  for (const m of root.matchAll(/\n\s*(--fs-[\w-]+):\s*([^;]+);/g)) {
    const [, name, v] = m as unknown as [string, string, string];
    if (name.startsWith("--fs-step-") || cu.has(name)) continue;
    assert.match(v.trim(), /^var\(--fs-(step-\d+|h2)\)$/, `${name}: ${v} — phải trỏ một bậc var(--fs-step-N)`);
  }
  const luat = css.slice(css.indexOf("\n}", css.indexOf(":root")));
  const cung = [...luat.matchAll(/font(?:-size)?:\s*[^;]*?\b\d+(?:\.\d+)?(?:px|rem|em)\b[^;]*;/g)].map((m) => m[0]);
  assert.deepEqual(cung, [], "cỡ chữ viết cứng ngoài :root");
});
