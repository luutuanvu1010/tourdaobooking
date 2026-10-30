# Phiếu kiểm độc lập — Luật khung 30/10/2026 (bản 2.49)

> Cho **phiên kiểm độc lập, chỉ đọc** (CLAUDE.md §3: việc lớn — chạm chỗ hiển thị tiền — phải có người kiểm khác người thi công; người thi công không tự nghiệm thu).
> Người kiểm KHÔNG sửa mã: đọc, chạy lại lệnh, ghi báo cáo vào cuối tệp này (mục «Kết quả kiểm»), trả về ĐẠT / KHÔNG ĐẠT kèm lý do.
> Nhánh: `claude/danh-gia-khung-giao-dien` (worktree `.claude/worktrees/danh-gia-khung-giao-dien`), dựng trên `main` = `3468fc1` (GitHub `origin/main` 30/10 tối — nối thẳng được).
> Tài liệu: báo cáo `BAO-CAO.md`, bản xem trước `XEM-TRUOC.md` (cùng thư mục), kế hoạch + nhật ký thi công `docs/superpowers/plans/2026-10-30-sua-hien-thi-va-luat-khung.md`.
> Chủ đã duyệt: gói khuyến nghị (30/10), bản xem trước 15 ảnh và nới trần gói trang Đơn hàng 101.719 → 101.933 (nguyên văn «đồng ý theo đề xuất của bạn, thi công»).

## Phạm vi thay đổi (đọc `git diff 3468fc1..HEAD -- public web src scripts`)

- `public/app.css`: token mới cuối nhóm «Riêng» (`--c-heading`, `--w-kv-nhan`, `--w-don-*`, `--w-home-chart-max`, `--w-cot-bao`, `--w-tim-thanh-tren-hep`, `--w-nhom-ten`);
  đổi giá trị `--fs-step-4` 15→14, `--fs-step-8` 19→18, `--fs-old-*` → bậc thang; `h1, h2, h3` và bốn tiêu đề khối theo `--c-heading`; khối «Luật khung 30/10» cuối tệp.
- `public/order.html`: bọc `#actions` + `#send` trong `.thanh-cong-cu-don`. `public/orders.html`: hàng tiêu đề cột tĩnh `.don-bang-dau`.
- `web/shell.ts`: cuộn vùng `.sidebar-groups` tới mục `aria-current=page` (đặt `scrollTop`, không `scrollIntoView`); dải nhắc bảo mật truyền tông.
- `web/dai.ts`: `NoiDungDai.tong` tuỳ chọn. `web/so-cong-no.ts`: tự chọn bên đầu ở màn ≥ 1024px. `web/order-card.ts`: chỉ chú thích.
- `src/shared/hai-lop-hien-thi.ts` (+ test): bỏ «— Bật ngay»; `tongDaiNhacHaiLop`. `src/shared/giao-dien.ts`: nhãn núm «Màu chính (liên kết, nút, chữ nhấn)».
- `src/shared/changelog.ts` + `app-info.test.ts`: mục 2.49. `src/goi-trang-nhe.test.ts`: trần 101.933 (chủ duyệt). `docs/SO-HANG-RAO.md`: dòng «Gói giao diện gọn».
- Tấm gương bộ v2: `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/ds-v2/{components/bundle.css,tokens.json}`.

## Việc kiểm (mỗi dòng: lệnh / chỗ đọc → kỳ vọng)

1. `npm test` → bước 1 và bước 2 thoát 0 (người thi công đo: 6.785+ xanh sau khi nới trần).
2. `npm run typecheck` → 0 lỗi. `node scripts/kiem-phien-ban.mjs` → «ĐẠT: bản ở máy 2.49 mới hơn production 2.48».
3. **Tiền** (lý do «việc lớn»): đọc khối CSS [1], [2], [14] — chỉ đổi BỐ CỤC chỗ hiện tiền (dải tóm tắt, «Còn thu»), không đổi số, không đổi cách định dạng, không ẩn
   số tiền nào ở khổ nào. Đối chiếu: `web/order.ts` `summaryBand`, `web/order-card.ts` `dienTien` không đổi (`git diff` rỗng ngoài chú thích).
4. **Quyền**: không tệp nào đổi `can(` / `permissions.ts`; ẩn nút trùng ở Đơn hàng dùng `:has(#topbar .topbar-new)` nên người không lập được đơn không mất gì.
   Kiểm: `git diff 3468fc1..HEAD -- src/shared/permissions.ts src/modules` rỗng.
5. **Trợ năng**: h1 bị ẩn khỏi mắt bằng kỹ thuật 1px + clip (không `display:none`) — trình đọc màn hình vẫn có h1 mỗi trang; phím Tab đầu tiên vẫn vào «Bỏ qua tới
   nội dung chính» (dot-0-smoke bước 4 — người thi công từng làm đỏ bước này bằng `scrollIntoView` rồi sửa).
6. **CSS sau dấu mốc PWA chỉ token**: không hex / rgb / px (trừ `1px`, điểm gãy @media một điều kiện) / rem / em; không z-index số
   (`node --test src/thanh-phan-v2-css.test.ts src/token-dot-0.test.ts`; quét `tests/e2e/pwa.mjs` dùng cùng biểu thức).
7. **Phạm vi luật bảng Đơn hàng**: chỉ `#list > .order-card` (trang Đơn hàng); thẻ đơn ở «Việc của tôi» và ô xem trước màn Giao diện giữ dạng thẻ
   (người thi công từng để lọt — phép dò bắt tràn ngang ở `/giao-dien` 1440, đã sửa).
8. **Kịch bản Chrome** (cần `AXE_JS` = axe-core 4.13 ngoài kho, `CHROME_BIN`): kết quả người thi công (nhánh và mã gốc) ở mục «Kịch bản Chrome đã chạy» của kế hoạch;
   người kiểm chạy lại ít nhất `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/dot-0-smoke.mjs` (bước 4: Tab đầu vào «Bỏ qua»),
   `docs/evidence/2026-10-26-xac-nhan-don/kich-ban/xac-nhan-smoke.mjs` và **bản chép** `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/v1-nguoi-phu-trach.mjs`;
   xác nhận các kịch bản đỏ được ghi «y hệt trên mã gốc» đúng là đỏ cả trên `3468fc1`. Hai bản chép đổi phép kiểm — đọc kỹ phần đổi ở đầu mỗi tệp, kiểm không nới
   phép kiểm nào ngoài phần luật 6 / cột báo đòi hỏi. Đề xuất sửa `web/CLAUDE.md`: `DE-XUAT-SUA-WEB-CLAUDE.md` (tệp luật, chờ chủ).
9. **Số đo**: chạy lại `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi.py` và `soi-thanh-ben.py` trên máy thử có tệp giao diện giống production
   (cách dựng ở `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/README.md`) → chữ bị cắt ≈ 11 (6 địa chỉ, 4 tên tài xế ở Điều phối, 1 tiêu đề dài), tràn ngang 0,
   thanh bên 0/32 · 0/14.
10. **Lệch quyết định cũ** (đã nêu cho chủ trong `XEM-TRUOC.md`): thẻ đơn bỏ «đúng 2 dòng» của Đợt E; dải nhắc bảo mật cát khi còn > 3 ngày (đặc tả đợt 0 §5 ghi «Đỏ»);
    tiêu đề lớn trong thân bị ẩn ở máy tính (đúng quyết định cổng 2b). Người kiểm xác nhận các lệch này có ghi ở kế hoạch và bản xem trước.

## Kết quả kiểm

**Kết luận: ĐẠT CÓ ĐIỀU KIỆN** (người kiểm độc lập, 31/10/2026, chỉ đọc, máy macOS, mã `e1295452`; không đọc `.env`, không dùng khoá nào).

Điều kiện bắt buộc trước khi day-len: **nhánh đã lỗi thời so với `origin/main`.** `git rev-list --count HEAD..origin/main` = 41 commit; `git merge-tree --write-tree HEAD origin/main`
báo xung đột nội dung ở `public/app.css`, `src/goi-trang-nhe.test.ts`, `src/shared/app-info.test.ts`, `src/shared/changelog.ts` (`web/shell.ts` tự gộp được). Dòng đầu phiếu
«nối thẳng được `origin/main`» không còn đúng. Hệ quả: trên `origin/main` mục đầu CHANGELOG nay đã là **2.50** (và production báo **2.49**, đo `GET /api/auth/config` 31/10),
nên mục 2.49 của nhánh này trùng số đã phát hành. Cần gộp `main` vào nhánh, giải xung đột, đánh lại số bản, nới trần gói Đơn hàng tính lại trên mã đã gộp, rồi chạy lại mục 1–2 và 6.

| # | Mục | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | `npm test` | ĐẠT | «bước 1 thoát 0, bước 2 thoát 0»; `# fail 0` ở cả hai bước (bước 1 chạy 187 s) |
| 2a | `npm run typecheck` | ĐẠT | 3 lượt `tsc --noEmit` thoát 0 |
| 2b | `kiem-phien-ban.mjs` | **LỆCH** | in «CHƯA ĐẠT: bản ở máy 2.49 không mới hơn production 2.49» — vì production đã lên 2.49 sau khi phiếu viết. Đây là hệ quả của điều kiện trên, không phải lỗi mã nhánh |
| 3 | Tiền | ĐẠT | `git diff 3468fc1..HEAD -- web/order.ts` rỗng; `web/order-card.ts` chỉ thêm 3 dòng chú thích; khối CSS [1], [2], [14] chỉ xếp lại ô (grid, wrap); `.order-row-remaining`, `.grid4` không bị `display:none`; chỉ ẩn nhãn chữ «MÃ ĐƠN» (≥ 641px), giá trị mã đơn + trạng thái vẫn hiện; 4 ô tiền của dải tóm tắt còn đủ |
| 4 | Quyền | ĐẠT | `git diff 3468fc1..HEAD -- src/shared/permissions.ts src/modules` rỗng; không dòng thêm/bớt nào chứa `can(` hay `permissions`. Quy tắc ẩn `#new-order` dùng `:has(#topbar .topbar-new)` đúng như phiếu |
| 5 | Trợ năng | ĐẠT | h1 ẩn bằng 1px + clip + `overflow:hidden` (không `display:none`); `dot-0-smoke.mjs` 20/20 «SMOKE OK (có axe)» gồm bước 4 (Tab đầu vào «Bỏ qua»); thanh bên cuộn bằng `scrollTop`, không `scrollIntoView` |
| 6 | CSS chỉ token | ĐẠT | `node --test src/thanh-phan-v2-css.test.ts src/token-dot-0.test.ts`: 11/11 |
| 7 | Phạm vi luật bảng | ĐẠT | mọi quy tắc bảng ở [14] đều `#list > .order-card …` hoặc `.don-bang-dau`, bọc `@media (min-width:1100px)`; `v1-nguoi-phu-trach` bản chép 17/17 (thẻ ở «Việc của tôi» giữ dạng thẻ) |
| 8 | Kịch bản Chrome | ĐẠT (có lưu ý flake) | Chromium: Google Chrome macOS, axe-core 4.13.0. `dot-0-smoke` 20/20 OK; `xac-nhan-smoke` OK 10 bước; bản chép `v1-nguoi-phu-trach` **17/17** ở lượt 3 (lượt 1 đỏ ở bước o, lượt 2 đỏ ở p, q — cả hai là `wrangler d1 execute` gieo dữ liệu thất bại, bẫy đã ghi ở kế hoạch; không phải phép kiểm). Bản gốc `2026-09-21-v1-0` trên mã gốc `3468fc1`: 17 ✓; trên nhánh: đỏ a và m — đúng như người thi công nêu. `xe-smoke` (đợt 0): đỏ bước 2, 8b, 9 **y hệt** ở cả nhánh và mã gốc. `a2-smoke-order`: «hết giờ chờ: banner thiếu mã» **y hệt** ở cả hai. Hai bản chép chỉ đổi phép kiểm a, m (v1) theo luật 6 — đọc đầu tệp thấy khớp mô tả, không nới ngoài phạm vi. Chưa chạy lại: `dot-c-smoke` bản chép, `chuyen-smoke`, `hdv-viec-cua-toi-smoke`, `mat-mang`, `trang-chu`, `quyen-thieu-quan-tri`, `hoa-hong`, `giao-dien`, `ho-tro`, `a2-smoke-form` (ngoài phạm vi tối thiểu phiếu) |
| 9 | Số đo `do-loi.py`, `soi-thanh-ben.py` | **CHƯA KIỂM ĐƯỢC** | cần Python Playwright (máy kiểm chưa có), Chromium của Playwright, kho D1 giống production và gieo dữ liệu qua mạng (bản CSV Google Sheet) — không dựng được trong phiên này; chủ hoặc phiên khác chạy theo `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/README.md`. Chỉ đối chiếu được tệp số liệu đã commit: `loi-hien-thi-sau.json` có đúng 11 chỗ chữ cắt (6 địa chỉ `order-row-place`, 4 tên tài xế `dp-tl-tx` ở Điều phối, 1 tiêu đề `bar-title` «Điều kiện cho xe chạy»), 0 trang tràn ngang; `thanh-ben-1366x650-sau.txt` 0/32 · 0/14 (và 0/7 Bán hàng). Đây chỉ là đọc lại số của người thi công, không phải đo độc lập |
| 10 | Lệch quyết định cũ | ĐẠT | cả ba lệch có ghi: «đúng 2 dòng» (kế hoạch mục [2] + `XEM-TRUOC.md` dòng 37), dải nhắc cát/đỏ (kế hoạch nhật ký [23] + `XEM-TRUOC.md` dòng 39), tiêu đề lớn ẩn ở máy tính (kế hoạch [7] + `XEM-TRUOC.md` dòng 40). Mã `tongDaiNhacHaiLop` khớp: > 3 ngày → cát, ≤ 3 ngày hoặc quá hạn → đỏ |

Ghi chú nhỏ, không chặn (để người thi công / chủ quyết):
- `XEM-TRUOC.md` dòng 18 và 45 còn ghi «1 đỏ chờ chủ duyệt» và «chưa chạy các kịch bản Chrome cũ» — lỗi thời so với kế hoạch (trần đã nới, kịch bản đã chạy). Hồ sơ có ngày nên chỉ cần biết, không cần sửa.
- Mục [15] kế hoạch viết «bỏ ô tìm và nút + Tạo đơn trùng với thanh trên», nhưng mã CSS ẩn ô tìm **của thanh trên** (`#topbar > .topbar-search`) và giữ ô `#q` của trang, còn nút «+ Tạo đơn» của trang bị ẩn khi thanh trên có `.topbar-new`. Hai kịch bản cùng hợp lý; nên ghi rõ bên nào bị bỏ để người đọc không đoán.
- Không có kịch bản nào được sửa mã sản phẩm trong lúc kiểm; worktree chỉ build `dist` (không theo dõi bởi git).

