// 7c (29/10/2026): phần "CHÉP TỪ MÃ" của `components/bundle.css` trong bộ «Island Booking System — Design System v2» sinh từ `public/app.css`, chép NGUYÊN
// (không viết lại): `@keyframes skeleton-pulse`, khối bảng trượt `.sheet*`, và từ dấu mốc "Thành phần chung v2" tới cuối tệp. Neo bằng dòng chú thích mốc,
// không bằng số dòng. Phần "RIÊNG CỦA BỘ" (lớp xem trước, đề xuất chưa có trong mã) nằm sau dấu hết và được giữ nguyên.
// Chạy: `node scripts/sinh-bundle-bo-v2.mjs` — ghi lại bản chụp trong kho; rồi xuất bản bộ (README bộ mục 12). Bài `src/bo-v2-khop-ma.test.ts` đỏ khi lệch.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TEP_BUNDLE = "docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/ds-v2/components/bundle.css";
export const DAU_CHEP = "/* ===== CHÉP TỪ MÃ — bắt đầu (sinh bằng scripts/sinh-bundle-bo-v2.mjs; không sửa tay) ===== */";
export const HET_CHEP = "/* ===== CHÉP TỪ MÃ — hết ===== */";

const MOC_SHEET = '/* ---------- A2: bảng trượt "Sửa thông tin chuyến"';
const MOC_CHUNG_V2 = "/* ---------- Thành phần chung v2";

function khoiTuMoc(css, moc) {
  const dau = css.indexOf(moc);
  if (dau < 0) throw new Error(`không thấy dấu mốc ${moc} trong public/app.css`);
  const sau = css.indexOf("\n/* ----------", dau + moc.length);
  return css.slice(dau, sau < 0 ? css.length : sau + 1).trimEnd();
}

/** Phần chép nguyên từ `app.css` (chuỗi, không gồm hai dòng dấu). */
export function phanChepTuMa(css) {
  const keyframes = /^@keyframes skeleton-pulse .*$/m.exec(css);
  if (!keyframes) throw new Error("không thấy @keyframes skeleton-pulse trong public/app.css");
  const chungV2 = css.slice(css.indexOf(MOC_CHUNG_V2)).trimEnd();
  if (css.indexOf(MOC_CHUNG_V2) < 0) throw new Error(`không thấy dấu mốc ${MOC_CHUNG_V2}`);
  return [keyframes[0], khoiTuMoc(css, MOC_SHEET), chungV2].join("\n\n");
}

/** Bundle mới = phần đầu cũ + dấu + phần chép + dấu + phần riêng của bộ cũ. */
export function dungBundle(bundleCu, css) {
  const a = bundleCu.indexOf(DAU_CHEP);
  const b = bundleCu.indexOf(HET_CHEP);
  if (a < 0 || b < a) throw new Error("bundle.css thiếu cặp dấu CHÉP TỪ MÃ");
  return `${bundleCu.slice(0, a)}${DAU_CHEP}\n${phanChepTuMa(css)}\n${bundleCu.slice(b)}`;
}

/** Phần chép đang nằm trong bundle (để bài kiểm so với mã). */
export function phanChepTrongBundle(bundle) {
  const a = bundle.indexOf(DAU_CHEP);
  const b = bundle.indexOf(HET_CHEP);
  if (a < 0 || b < a) return null;
  return bundle.slice(a + DAU_CHEP.length + 1, b).replace(/\n$/, "");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const tep = join(ROOT, TEP_BUNDLE);
  const moi = dungBundle(readFileSync(tep, "utf8"), readFileSync(join(ROOT, "public/app.css"), "utf8"));
  writeFileSync(tep, moi);
  console.log(`✔ đã sinh lại phần CHÉP TỪ MÃ của ${TEP_BUNDLE}`);
}
