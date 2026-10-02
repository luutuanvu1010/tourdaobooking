// Token giao diện theo VAI (2026-10-02, chủ dự án: "đổi trong token design luôn để sau này tạo giao diện mới thì mặc định đã tham chiếu đúng").
// Bài này giữ cho độ đậm chữ và màu thanh / nút chính chỉ được quyết ở :root — màn mới viết cứng số là đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { tuongPhan as tp } from "./shared/giao-dien.ts";

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
  assert.match(luat, /\nh1, h2, h3, h4, h5, h6 \{ font-weight: var\(--fw-heading\); \}/, "thiếu luật nền kéo độ đậm mặc định của tiêu đề h1–h6 về token --fw-heading");
  assert.match(luat, /\nb, strong, th \{ font-weight: var\(--fw-bold\); \}/, "thiếu luật nền kéo độ đậm mặc định của b/strong/th về token --fw-bold");
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

const VAI = [
  "--c-bar-bg", "--c-on-bar", "--c-bar-border", "--c-icon-hover-on-bar",
  "--c-sidebar-bg", "--c-sidebar-text-on", "--c-sidebar-title", "--c-sidebar-badge-text", "--c-sidebar-item", "--c-sidebar-active", "--c-sidebar-border", "--c-sidebar-badge",
  "--c-btn-primary-bg", "--c-btn-primary-text", "--c-btn-primary-border", "--c-btn-primary-hover-bg",
  "--c-selected-bg", "--c-selected-text", "--c-selected-border",
  "--c-tab-new-bg", "--c-tab-new-icon", "--c-band-bg", "--c-on-band", "--c-maint-bg",
  "--c-tab-active-bg", "--c-tab-active-text", "--c-fab-bg", "--c-fab-text", "--c-fab-hover-bg", "--c-avatar-bg", "--c-avatar-text",
];

test("màu theo vai: mọi token vai khai ở :root", () => {
  for (const t of VAI) assert.match(root, new RegExp(`\\n\\s*${t}:\\s*[^;]+;`), `${t} chưa khai ở :root`);
});

test("màu theo vai: thanh, nút chính, mảng đậm không trỏ thẳng màu thương hiệu", () => {
  const boChon = ["#topbar", "#sidebar", ".btn-primary", ".login-submit", ".ntf-panel-head", ".order-summary-band", "#tabbar .tab-new .tab-icon", ".bar-back", ".sidebar-", ".tl-fab", ".avatar", "#tabbar .tab["];
  const cam = /(?:^|[\s;{])(?:color|background|background-color|border-color|border-top-color):\s*(?:var\(--c-(?:primary|primary-strong|on-dark)\)|#fff\b|#ffffff\b)/;
  const loi: string[] = [];
  for (const m of luat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1]!.trim().split("\n").pop()!.trim();
    if (sel.startsWith("body.has-sidebar")) continue; // thanh trên máy tính: đã nền trắng theo token mặt (--c-surface)
    if (sel === ".sidebar-item-badge-accent") continue; // huy hiệu san hô "Góp ý / Báo lỗi": chữ trắng trên san hô cố định, giữ có chủ đích
    if (sel === ".ntf-panel-head h3" && m[2]!.includes("var(--c-primary)")) continue; // khối @media ≥641px: đầu bảng thông báo nền trắng, tiêu đề chữ xanh
    if (!boChon.some((b) => sel.includes(b))) continue;
    if (cam.test(m[2]!)) loi.push(sel);
  }
  assert.deepEqual(loi, [], "luật thanh/nút trỏ thẳng --c-primary/--c-primary-strong/--c-on-dark/#fff — dùng token vai");
});

test("màu chữ liên kết của thanh trên không đè màu chữ của nút nằm trên thanh", () => {
  // Bộ chọn có id (#topbar a) thắng .btn-accent/.btn-primary: nút san hô "Tạo đơn" ở thanh trên máy tính từng thành chữ xanh trên nền đỏ (1,73:1, axe 2026-10-02).
  const loi = [...luat.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => /(?:^|,)\s*#topbar a\s*(?:,|$)/.test(m[1]!.trim().split("\n").pop()!.trim()) && /(?:^|[\s;{])color:/.test(m[2]!))
    .map((m) => m[1]!.trim());
  assert.deepEqual(loi, [], "đặt màu chữ cho `#topbar a` phải loại nút: `#topbar a:not(.btn)`");
});

// Tương phản chữ/nền của các cặp token vai (chủ dự án 2026-10-02: chữ mảnh cần màu đủ tối). Dò chuỗi var() về hex rồi đo theo WCAG 2.x.
const tokens = new Map([...root.matchAll(/\n\s*(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()] as const));
function hex(v: string, sau = 0): string {
  const m = /^var\((--[\w-]+)\)$/.exec(v);
  if (m) {
    assert.ok(sau < 10, `chuỗi var() quá sâu ở ${v}`);
    const tiep = tokens.get(m[1]!);
    assert.ok(tiep, `${m[1]} chưa khai ở :root`);
    return hex(tiep, sau + 1);
  }
  assert.match(v, /^#[0-9a-fA-F]{6}$/, `giá trị ${v} không dò được về hex 6 chữ số`);
  return v.toLowerCase();
}
const tuongPhan = (chu: string, nen: string): number => tp(hex(`var(${chu})`), hex(`var(${nen})`));

test("màu theo vai: mọi cặp chữ/nền của thanh, nút chính, mục đang chọn đạt ≥ 4,5:1", () => {
  const cap: [string, string][] = [
    ["--c-on-bar", "--c-bar-bg"],
    ["--c-sidebar-item", "--c-sidebar-bg"],
    ["--c-sidebar-title", "--c-sidebar-bg"],
    ["--c-sidebar-text-on", "--c-sidebar-bg"],
    ["--c-sidebar-text-on", "--c-sidebar-active"],
    ["--c-sidebar-badge-text", "--c-sidebar-badge"],
    ["--c-btn-primary-text", "--c-btn-primary-bg"],
    ["--c-btn-primary-text", "--c-btn-primary-hover-bg"],
    ["--c-selected-text", "--c-selected-bg"],
    ["--c-tab-new-icon", "--c-tab-new-bg"],
    ["--c-on-band", "--c-band-bg"],
    ["--c-tab-active-text", "--c-tab-active-bg"],
    ["--c-fab-text", "--c-fab-bg"],
    ["--c-fab-text", "--c-fab-hover-bg"],
    ["--c-avatar-text", "--c-avatar-bg"],
  ];
  const loi = cap.map(([chu, nen]) => `${chu} trên ${nen}: ${tuongPhan(chu, nen).toFixed(2)}:1`).filter((_, i) => tuongPhan(...cap[i]!) < 4.5);
  assert.deepEqual(loi, []);
});
