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
  // Thị giác 1.70 (đặc tả 2026-10-02-thi-giac-nen-tang-design.md): nút phụ nền nhạt, dải tóm tắt đơn đậm, ô chức năng theo nhóm, tiêu điểm / chỉ báo.
  "--c-btn-soft-bg", "--c-btn-soft-text", "--c-btn-soft-border", "--c-btn-soft-hover-bg",
  "--c-summary-bg", "--c-summary-bg-2", "--c-on-summary", "--c-summary-due",
  "--c-tile-vc-bg", "--c-tile-vc", "--c-tile-toi-bg", "--c-tile-toi", "--c-tile-all-bg", "--c-tile-all",
  "--c-focus", "--c-focus-ring", "--c-indicator", "--c-input-border", "--c-input-border-hover",
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
    // Thị giác 1.70: dải tóm tắt đơn là dải màu chuyển — chữ phải đọc được trên CẢ HAI đầu dải.
    ["--c-btn-soft-text", "--c-btn-soft-bg"],
    ["--c-btn-soft-text", "--c-btn-soft-hover-bg"],
    ["--c-on-summary", "--c-summary-bg"],
    ["--c-on-summary", "--c-summary-bg-2"],
    ["--c-summary-due", "--c-summary-bg"],
    ["--c-summary-due", "--c-summary-bg-2"],
    ["--c-tile-vc", "--c-tile-vc-bg"],
    ["--c-tile-toi", "--c-tile-toi-bg"],
    ["--c-tile-all", "--c-tile-all-bg"],
  ];
  const loi = cap.map(([chu, nen]) => `${chu} trên ${nen}: ${tuongPhan(chu, nen).toFixed(2)}:1`).filter((_, i) => tuongPhan(...cap[i]!) < 4.5);
  assert.deepEqual(loi, []);
});

// Vòng sửa cuối ADR-0087: núm "Cỡ chữ nội dung" kéo --fs-step-5 xuống 14px; ô gõ phải KHÔNG bị kéo theo (chống zoom iOS, web/CLAUDE.md "Ô gõ 16px").
test("ô gõ: font-size đọc --fs-ui, và --fs-ui không bao giờ nhỏ hơn 16px dù --fs-step-5 bị núm kéo xuống", () => {
  const ui = tokens.get("--fs-ui");
  assert.ok(ui, "--fs-ui chưa khai ở :root");
  const literal = /^(\d+(?:\.\d+)?)px$/.exec(ui);
  const sanDuoi = /^max\(\s*16px\s*,/.test(ui);
  assert.ok(sanDuoi || (literal && Number(literal[1]) >= 16), `--fs-ui phải là max(16px, …) hoặc số ≥ 16px, hiện là ${ui}`);
  const luatO = [...luat.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => /(?:^|,)\s*input, select, textarea\s*(?:,|$)/.test(m[1]!.trim().split("\n").pop()!.trim()) && m[2]!.includes("font-size"));
  assert.ok(luatO, "không thấy luật `input, select, textarea` có font-size");
  assert.match(luatO[2]!, /font-size:\s*var\(--fs-ui\)/);
});

// Thị giác 1.70 (chủ dự án duyệt 2/10): CHỈ nút lưu / xác nhận chính đặc màu (núm "Nền/Chữ nút lưu, xác nhận" = --c-btn-primary-*);
// mọi .btn-primary khác giữ nền nhạt (--c-btn-soft-*). Đổi bộ chọn ngữ cảnh mà quên một nơi = nút chính nhạt lại hoặc mọi nút đặc hết.
test("nút chính đặc: nút gửi form, chân bảng trượt, Đăng nhập đọc --c-btn-primary-*; .btn-primary còn lại đọc --c-btn-soft-*", () => {
  const luatCua = (sel: RegExp) => [...luat.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => sel.test(m[1]!.trim().split("\n").pop()!.trim())).map((m) => m[2]!);
  const goc = luatCua(/^\.btn-primary$/);
  assert.equal(goc.length, 1, "phải có đúng một luật gốc `.btn-primary {`");
  assert.match(goc[0]!, /background:\s*var\(--c-btn-soft-bg\)/);
  assert.match(goc[0]!, /color:\s*var\(--c-btn-soft-text\)/);
  const dac = luatCua(/^\.btn-primary\[type="submit"\], \.btn-primary\.btn-chinh, \.sheet-foot \.btn-primary, \.login-actions \.login-submit$/);
  assert.equal(dac.length, 1, "thiếu luật nút chính đặc cho bốn ngữ cảnh (nút gửi form, lớp .btn-chinh, chân bảng trượt, Đăng nhập)");
  assert.match(dac[0]!, /background:\s*var\(--c-btn-primary-bg\)/);
  assert.match(dac[0]!, /color:\s*var\(--c-btn-primary-text\)/);
});

// Thị giác 1.70: thẻ nhấc khi rê, nút / ô chức năng lún khi bấm. Máy đặt "Giảm chuyển động" thì tắt CẢ chuyển tiếp lẫn độ nhấc / lún
// (luật toàn cục `* { transition: none !important }` có sẵn không gỡ transform). Mọi khối reduced-motion của app.css viết MỘT dòng.
test("chuyển động: máy đặt Giảm chuyển động thì tắt chuyển tiếp và mọi độ nhấc / lún mới", () => {
  const khoi = [...luat.matchAll(/^@media \(prefers-reduced-motion: reduce\) \{(.*)\}/gm)].map((m) => m[1]!);
  assert.ok(khoi.some((k) => /transition:\s*none/.test(k)), "thiếu luật tắt chuyển tiếp khi Giảm chuyển động");
  const tatTransform = khoi.filter((k) => /transform:\s*none/.test(k)).join(" ");
  for (const sel of [".btn:not(:disabled):active", ".order-card:hover", ".dash-o-muc:active", "#tabbar .tab:active .tab-icon"]) {
    assert.ok(tatTransform.includes(sel), `Giảm chuyển động chưa gỡ độ nhấc / lún của ${sel}`);
  }
});

// Kiểm độc lập thị giác 1.70 (2/10): ba lỗi thác CSS chỉ lộ khi đo trạng thái thật — canh để không tái phát.
test("thác CSS 1.70: ô tích giữ khung tiêu điểm, nút Vận chuyển khoá vẫn xám, ô Đăng nhập cùng viền ô nhập", () => {
  const bang = [...luat.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1]!.trim().split("\n").pop()!.trim(), m[2]!] as const);
  // TB-1: luật bỏ khung (outline: 0) của ô đang gõ không được áp vào ô tích / ô chọn một (chúng chỉ có khung 2px của :focus-visible chung).
  const boKhung = bang.filter(([sel, than]) => /:focus\b/.test(sel) && /outline:\s*(?:0|none)\b/.test(than) && /(?:^|,\s*)input(?::not\([^)]*\))*:focus/.test(sel));
  assert.ok(boKhung.length > 0, "không thấy luật tiêu điểm của ô gõ");
  for (const [sel] of boKhung) {
    for (const phan of sel.split(",").map((x) => x.trim()).filter((x) => /^input\b/.test(x))) {
      assert.ok(phan.includes(':not([type="checkbox"])') && phan.includes(':not([type="radio"])'), `luật bỏ khung tiêu điểm áp cả ô tích / ô chọn một: ${phan}`);
    }
  }
  // TB-2: kiểu "nhạt khi khoá" của nút chính đặc chừa .vc-btn; .vc-btn:disabled tắt bóng của nút đặc.
  const nhatKhiKhoa = bang.find(([sel]) => sel.startsWith(':is(.btn-primary[type="submit"]') && sel.includes(":disabled"));
  assert.ok(nhatKhiKhoa && nhatKhiKhoa[0].includes(":not(.vc-btn)"), "luật nhạt-khi-khoá của nút chính đặc phải chừa .vc-btn");
  const vcKhoa = bang.find(([sel]) => sel === ".vc-btn:disabled");
  assert.ok(vcKhoa && /box-shadow:\s*none/.test(vcKhoa[1]), ".vc-btn:disabled phải tắt bóng của nút đặc");
  // TB-3: ô Đăng nhập dùng cùng viền ô nhập và cùng màu tiêu điểm như mọi ô.
  const oDangNhap = bang.find(([sel]) => sel === ".login-field input");
  assert.ok(oDangNhap && /border:\s*1px solid var\(--c-input-border\)/.test(oDangNhap[1]), "ô Đăng nhập phải viền var(--c-input-border)");
  const oDangNhapGo = bang.find(([sel]) => sel.startsWith(".login-field input:focus"));
  assert.ok(oDangNhapGo && /border-color:\s*var\(--c-focus\)/.test(oDangNhapGo[1]) && /var\(--c-focus-ring\)/.test(oDangNhapGo[1]), "ô Đăng nhập đang gõ phải theo --c-focus / --c-focus-ring");
});

// Núm "Độ đậm chữ nội dung" chỉ có tác dụng nếu chữ gốc của trang đọc --fw-regular (viết tắt `font:` đặt lại độ đậm về thường).
test("body: độ đậm chữ gốc đọc token --fw-regular (sau viết tắt font)", () => {
  const body = /\nbody \{([^{}]*)\}/.exec(luat);
  assert.ok(body, "không thấy luật `body {`");
  assert.match(body[1]!, /font:[^;]*;[^}]*font-weight:\s*var\(--fw-regular\)/);
});
