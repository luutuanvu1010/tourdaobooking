// Phép quét «giá trị viết cứng» của khối app iPhone (PWA) trong public/app.css — MỘT nguồn cho tests/e2e/pwa.mjs và bài đơn vị src/quet-gia-tri-cung.test.ts.
// Luật cứng tầng giao diện: giá trị giao diện đi vào token, không viết cứng trong luật. Từ dấu mốc MARK tới cuối tệp không được có: màu hex, rgb()/hsl(), số px, cỡ rem/em.
// Ngoại lệ có lý do (chủ duyệt; CSS không cho dùng var() trong ĐIỀU KIỆN của at-rule):
//   - điều kiện `@media (...)` (có từ trước);
//   - điều kiện `@container (...)` — chủ dự án duyệt 2026-10-31 (docs/SO-HANG-RAO.md), CÙNG lý do kỹ thuật với @media, KHÔNG nới gì khác;
//   - viền / ẩn-khỏi-mắt đúng 1px.
// Chỉ ĐIỀU KIỆN được miễn: thân rule bên trong @media / @container vẫn bị quét.
export const MARK = "/* ---------- app iPhone (PWA)";

export function quetGiaTriCung(css) {
  if (!css.includes(MARK)) throw new Error("app.css mất dấu mốc khối PWA");
  const pwaCss = css
    .slice(css.indexOf(MARK))
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media\s*\([^)]*\)/g, "")
    .replace(/@container\s+(?:[A-Za-z_][\w-]*\s+)?\([^)]*\)/g, "");
  return pwaCss.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(|(?<![\w.-])(?!1px\b)\d+(?:\.\d+)?px\b|(?<![\w.-])\d+(?:\.\d+)?r?em\b/g) ?? [];
}
