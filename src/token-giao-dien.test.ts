// Token giao diện theo VAI (2026-10-02, chủ dự án: "đổi trong token design luôn để sau này tạo giao diện mới thì mặc định đã tham chiếu đúng").
// Bài này giữ cho độ đậm chữ và màu thanh / nút chính chỉ được quyết ở :root — màn mới viết cứng số là đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const rootEnd = css.indexOf("\n}", css.indexOf(":root"));
const root = css.slice(css.indexOf(":root"), rootEnd);
const luat = css.slice(rootEnd);

test("độ đậm chữ: năm mức --fw-* khai ở :root, tăng dần", () => {
  const ten = ["--fw-regular", "--fw-medium", "--fw-semibold", "--fw-bold", "--fw-heavy"];
  const gt = ten.map((t) => Number(new RegExp(`\\n\\s*${t}:\\s*(\\d{3});`).exec(root)?.[1]));
  for (const [i, v] of gt.entries()) assert.ok(v >= 100 && v <= 900, `${ten[i]} chưa khai hoặc sai`);
  assert.deepEqual(gt, [...gt].sort((a, b) => a - b), "các mức phải không giảm từ regular tới heavy");
});

test("độ đậm chữ: luật CSS không viết số, chỉ trỏ token (ngoài @font-face)", () => {
  const cung = [...luat.matchAll(/font-weight:\s*(?:\d{3}|bold|bolder|lighter)\b|font:\s*\d{3}\s/g)].map((m) => m[0]);
  assert.deepEqual(cung, [], "độ đậm viết cứng trong luật app.css");
  assert.match(luat, /\nh1, h2, h3, h4, h5, h6, b, strong, th \{ font-weight: var\(--fw-bold\); \}/, "thiếu luật nền kéo độ đậm mặc định của tiêu đề/b/strong/th về token");
});

test("độ đậm chữ: kiểu viết thẳng trong web/*.ts và public/*.html cũng chỉ trỏ token", () => {
  const thuMuc = [["../web/", ".ts"], ["../public/", ".html"]] as const;
  const loi: string[] = [];
  for (const [dir, duoi] of thuMuc) {
    for (const f of readdirSync(new URL(dir, import.meta.url))) {
      if (!f.endsWith(duoi)) continue;
      const src = readFileSync(new URL(dir + f, import.meta.url), "utf8");
      for (const m of src.matchAll(/font-weight:\s*(?:\d{3}|bold)\b/g)) loi.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(loi, []);
});
