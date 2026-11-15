// Bước 2 — lưới bố cục chung (docs/superpowers/plans/2026-11-14-buoc-2-luoi-bo-cuc.md, chủ duyệt 15/11 «Duyệt, bám trái»).
// Khoá ba điều: (a) mọi trang dùng khung chung khai ĐÚNG MỘT mức bề rộng ở <body data-rong>; (b) vùng nội dung lấy lề, bề rộng, nhịp từ token lưới;
// (c) không trang nào tự đặt bề rộng vùng nội dung bằng style nội tuyến. Trang mới thiếu `data-rong` ⇒ đỏ: chọn hep (biểu mẫu một cột, trang đọc),
// vua (chi tiết, biểu mẫu hai cột, thiết lập) hoặc rong (danh sách, bảng điều khiển).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const THU_MUC = new URL("../public/", import.meta.url);
const MUC = new Set(["hep", "vua", "rong"]);
// Ngoại lệ có tên: Trang chủ giữ bản vẽ riêng đã duyệt (lề 12 điện thoại, 24 máy tính); Đăng nhập không dùng khung chung.
const NGOAI_LE = new Set(["index.html", "login.html"]);

const trang = readdirSync(THU_MUC)
  .filter((t) => t.endsWith(".html"))
  .map((t) => ({ ten: t, html: readFileSync(new URL(t, THU_MUC), "utf8") }))
  .filter((t) => t.html.includes('id="topbar"') && !NGOAI_LE.has(t.ten));

test("lưới: mọi trang dùng khung chung khai đúng một mức bề rộng ở <body data-rong>", () => {
  assert.ok(trang.length >= 50, `chỉ thấy ${trang.length} trang có khung: bộ lọc hỏng`);
  const sai: string[] = [];
  for (const t of trang) {
    const body = /<body\b[^>]*>/.exec(t.html)?.[0] ?? "";
    const muc = /\bdata-rong="([^"]*)"/.exec(body)?.[1];
    if (!muc || !MUC.has(muc)) sai.push(`${t.ten}: data-rong=${muc === undefined ? "(thiếu)" : `"${muc}"`}`);
  }
  assert.deepEqual(sai, []);
});

test("lưới: không trang nào tự đặt bề rộng vùng nội dung bằng style nội tuyến", () => {
  const sai = trang.filter((t) => /<main\b[^>]*\bstyle=/.test(t.html)).map((t) => t.ten);
  assert.deepEqual(sai, []);
});

test("lưới: token lề 16 / 24, bề rộng hẹp 720, vừa 1120, nhịp 16", () => {
  assert.match(css, /\n  --luoi-le: 16px;/);
  assert.match(css, /\n  --luoi-rong-hep: 720px;/);
  assert.match(css, /\n  --luoi-rong-vua: 1120px;/);
  assert.match(css, /\n  --luoi-nhip: 16px;/);
  assert.match(css, /@media \(min-width: 641px\) \{ :root \{ --luoi-le: 24px; \} \}/);
});

test("lưới: vùng nội dung lấy lề từ token, mức hẹp và vừa lấy bề rộng từ token", () => {
  assert.match(css, /\nmain \{ max-width: var\(--w-main\); margin: 0 auto; padding: var\(--luoi-le\) max\(var\(--luoi-le\), env\(safe-area-inset-right\)\) var\(--s4\) max\(var\(--luoi-le\), env\(safe-area-inset-left\)\); \}/);
  assert.match(css, /\nbody\[data-rong="hep"\] main \{ max-width: calc\(var\(--luoi-rong-hep\) \+ 2 \* var\(--luoi-le\)\); \}/);
  assert.match(css, /\nbody\[data-rong="vua"\] main \{ max-width: calc\(var\(--luoi-rong-vua\) \+ 2 \* var\(--luoi-le\)\); \}/);
});

test("lưới: đoạn chữ con trực tiếp của vùng nội dung theo nhịp chung, không theo cỡ chữ", () => {
  assert.match(css, /\n:where\(body:not\(\.trang-chu\)\) main > p \{ margin: 0 0 var\(--luoi-nhip\); \}/);
});

test("lưới: máy tính có thanh bên thì vùng nội dung bám trái (chủ chọn 15/11), không căn giữa", () => {
  assert.match(css, /body\.has-sidebar main \{ grid-column: 2; grid-row: 3; align-self: start; margin-inline: 0; \}/);
});
