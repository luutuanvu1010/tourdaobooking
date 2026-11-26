// Đợt 0 khung chung, Task 3 (đặc tả 2026-10-28 mục 8): lớp thành phần chung v2 trong app.css, chỉ token.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MARK, quetGiaTriCung } from "../scripts/quet-gia-tri-cung.mjs";

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
  // Một nguồn: phép quét chuẩn `scripts/quet-gia-tri-cung.mjs` (tests/e2e/pwa.mjs cũng gọi nó). Tới 21/11/2026 bài này giữ một bản CHÉP regex có từ 28/10,
  // trước quyết định 31/10 của chủ dự án miễn điều kiện `@container (...)` như `@media (...)` (docs/SO-HANG-RAO.md) — nên bắt nhầm mốc khung chứa của bảng Đơn hàng.
  // Thân luật bên trong @media / @container vẫn bị quét như cũ.
  const cung = quetGiaTriCung(`${MARK} — khối v2 */\n${khoi}`);
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

test("dải trong trang (.dai ngoài #strips) không bị cắt hai dòng ở điện thoại — chỉ dải nhắc đầu trang mới cắt (lỗi 25/11: dải thiếu mức ở /hoa-hong mất danh sách vai trò)", () => {
  // Dải đầu trang (#strips, web/dai.ts) có nút để đọc đủ nên được cắt «…»; dải đặt trong trang (Hoa hồng, màn bảo trì) không có nút nào ⇒ phải hiện đủ.
  const luatCat = [...khoiSach.matchAll(/([^{}]+)\{[^}]*line-clamp[^}]*\}/g)].map((m) => m[1].trim());
  const luatCatDai = luatCat.filter((bc) => bc.includes(".dai-cau"));
  assert.ok(luatCatDai.length > 0, "không còn luật cắt hai dòng nào cho dải đầu trang");
  for (const bc of luatCatDai) for (const mot of bc.split(",")) assert.match(mot.trim(), /^#strips\b/, `luật cắt hai dòng áp cho dải ngoài #strips: «${mot.trim()}»`);
});
