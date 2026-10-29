# Bản chụp bộ «Island Booking System — Design System v2»

Đây là **bản chụp trong kho** của bộ trên Claude: <https://claude.ai/artifact/R7vYe6PdU85WCSYkanWNP5>. Từ 7c (29/10/2026) bộ là **tấm gương của mã** (`public/app.css` trên `main` là nguồn duy nhất) và bản chụp này là thứ máy kiểm: `node scripts/so-bo-v2-voi-ma.mjs` (chạy trong `npm test` qua `src/bo-v2-khop-ma.test.ts`) so nó với mã. Đồng bộ: sửa mã → sinh lại phần chép của `components/bundle.css` (`node scripts/sinh-bundle-bo-v2.mjs`) → sửa `tokens.json` tới 0 lệch → xuất bản lên Claude từ bản chụp (README bộ mục 12). Không sửa bộ trên Claude mà bỏ qua bản chụp.

Lịch sử: bản 8 `1793155409-bf46` (28/10, tờ BO-SUNG-BO-V2-2026-10-28 và -lan-2); **bản 11 `1793279979-deae`** (29/10, 7c, tờ `BO-SUNG-BO-V2-2026-10-29-7c.md`) đồng bộ từ `main@25f127d1`.

Gồm: `tokens.json` (240 token, một chủ đề sáng), `README.md` (sổ tay 12 mục), `design-system.json` (chỉ mục, có mã tài sản đã tải lên), `components/bundle.css`, 26 thành phần `components/<Tên>/README.md` + `preview.html`, bìa `components/Cover/preview.html`, hai README nhóm tài sản. **Không chép:** 17 tệp phông (`public/fonts/` đã có), 43 SVG biểu tượng (sinh từ `SHAPES` của `web/icons.ts`), 4 PNG logo (`public/icons/`), `tokens.css` (trang trên Claude tự sinh từ `tokens.json`).

Ảnh xem trước: bản 8 ở `docs/evidence/2026-10-28-ds-v2/anh-kiem/`; bản 11 ở `docs/evidence/2026-10-29-7c-dong-bo-bo-v2/`.
