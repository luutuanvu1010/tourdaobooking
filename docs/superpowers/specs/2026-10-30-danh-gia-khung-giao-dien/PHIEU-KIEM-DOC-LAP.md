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

(người kiểm độc lập ghi ở đây)
