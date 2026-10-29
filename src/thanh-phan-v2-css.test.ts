// Đợt 0 khung chung, Task 3 (đặc tả 2026-10-28 mục 8): lớp thành phần chung v2 trong app.css, chỉ token.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const dauMoc = css.indexOf("/* ---------- app iPhone (PWA)");
const sauMoc = css.slice(dauMoc);
const dauKhoi = css.indexOf("/* ---------- Thành phần chung v2");
const khoi = dauKhoi >= 0 ? css.slice(dauKhoi) : "";
const khoiSach = khoi.replace(/\/\*[\s\S]*?\*\//g, "");

const BO_CHON = [
  ".nut", ".o", ".nhan", ".o-loi", ".o-tich", ".o-chon-mot", ".cong-tac", ".vien", ".huy-hieu", ".the", ".dong", ".bang",
  ".tab-phu", ".dai", ".chan-dinh", ".xuong", ".rong", ".toast", ".bo-qua", ".trang-thai",
];

test("khối Thành phần chung v2 nằm sau dấu mốc PWA", () => {
  assert.ok(dauKhoi > dauMoc && dauMoc > 0, "thiếu khối 'Thành phần chung v2' sau dấu mốc PWA");
});

test("mỗi bộ chọn gốc mở đầu ít nhất một luật", () => {
  for (const bc of BO_CHON) {
    const re = new RegExp("\\n" + bc.replace(/[.]/g, "\\.") + "(?=[\\s,\\[:.{>])");
    assert.ok(re.test(khoiSach), `${bc} không đứng đầu luật nào trong khối v2`);
  }
});

test("khối v2 không viết cứng màu / px / rem (cùng regex tests/e2e/pwa.mjs)", () => {
  const nhanh = khoiSach.replace(/@media\s*\([^)]*\)/g, "");
  const cung = nhanh.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(|(?<![\w.-])(?!1px\b)\d+(?:\.\d+)?px\b|(?<![\w.-])\d+(?:\.\d+)?r?em\b/g) ?? [];
  assert.deepEqual(cung, []);
  assert.ok(khoiSach.length > 0 && !/z-index:\s*\d/.test(khoiSach), "z-index phải là token");
});

test(".huy-hieu khai đủ năm tông", () => {
  for (const t of ["bien", "la", "cat", "do", "xam"]) assert.ok(khoiSach.includes(`.huy-hieu[data-tong="${t}"]`), `thiếu tông ${t}`);
});

test(".dai, .chan-dinh, .bo-qua dùng đúng token", () => {
  const luat = (bc: string): string => khoiSach.match(new RegExp("\\n" + bc.replace(/[.]/g, "\\.") + "\\s*\\{[^}]*\\}"))?.[0] ?? "";
  assert.match(luat(".dai"), /var\(--h-dai-tren\)/);
  assert.match(luat(".chan-dinh"), /var\(--h-control-lon\)/);
  assert.match(luat(".chan-dinh"), /env\(safe-area-inset-bottom/);
  assert.match(khoiSach, /\n\.bo-qua:focus-visible/);
  assert.match(luat(".bo-qua"), /var\(--z-tren-cung\)/);
});

test("khối v2 không có bộ chọn .toast trần (tránh đè thông báo Bảng tin cũ)", () => {
  assert.ok(!/(^|\n)\.toast\s*[{,:]/.test(khoiSach), "khối v2 có .toast trần");
  assert.ok(!/(^|\n)\.toast\s+\./.test(khoiSach), "khối v2 có .toast con trần");
});

test("tông .dai và .toast đủ biến thể, nhịp .xuong tắt khi giảm chuyển động, vỏ .trang-thai", () => {
  assert.ok(khoiSach.includes(".dai[data-tong="), "thiếu .dai[data-tong]");
  assert.ok(khoiSach.includes(".toast[data-tong="), "thiếu .toast[data-tong]");
  assert.match(khoiSach, /prefers-reduced-motion[\s\S]*\.xuong/);
  assert.match(khoiSach, /\.trang-thai\[data-loai=/);
});
