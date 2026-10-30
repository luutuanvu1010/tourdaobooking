# Sổ thi công — ADR-0146 + ADR-0152 (luật bán theo loại đối tác; đặc điểm dịch vụ)

> Sổ sống của đợt thi công theo kế hoạch `2026-10-30-adr-0146-va-dac-diem-dich-vu-ke-hoach.md` (gọi tắt **KH**) và bàn giao `2026-10-30-HANDOFF-thi-cong-adr-0146-0151.md`. Người thi công ghi ruling, nợ, kết quả đo, ngày quan sát hàng rào. Vai phiên: THI CÔNG (không tự nghiệm thu).
> Worktree `.claude/worktrees/tinh-trang-ban-va-phu-thu`, nhánh `claude/tinh-trang-ban-va-phu-thu`.

## T0 — Chuẩn bị (30/10/2026)

### Số ADR: 0151 → 0152 (chủ chọn 30/10)
- Khi nhập `origin/main@3468fc14` vào nhánh (commit `78d1d244`), `main` đã cấp **ADR-0151** cho «Đổi cấp riêng của đối tác» (lên production bản 2.48). ADR đặc điểm dịch vụ của nhánh cũng mang 0151 ⇒ xung đột ở `docs/adr/README.md`.
- Chủ chọn trong chat (câu hỏi một lần, phương án khuyến nghị): **đổi ADR đặc điểm dịch vụ sang 0152**. Đã sửa bằng công cụ sửa tệp: dòng tiêu đề ADR + một dòng ghi lý do; dòng mục lục 0152 và dòng ghi chú số kế tiếp (0153). Nội dung ADR không đổi chữ nào khác.
- **Tên tệp chưa đổi**: hàng rào `guard-luat` cấm AI đổi tên tệp luật bằng dòng lệnh (`git mv`). Chủ tự chạy (ở thư mục worktree hoặc sau khi gộp):
  `git mv docs/adr/ADR-0151-dac-diem-dich-vu-va-luat-ban-theo-dac-diem.md docs/adr/ADR-0152-dac-diem-dich-vu-va-luat-ban-theo-dac-diem.md`
  Tới khi đó, đường dẫn ở mục lục (`ADR-0152-dac-diem-…`) trỏ tới tệp chưa tồn tại.
- **Quy ước đọc:** KH, bàn giao, báo cáo kiểm (`docs/superpowers/specs/2026-10-30-tinh-trang-ban-va-phu-thu/**`) là hồ sơ có ngày, giữ chữ «ADR-0151» / «A» — đọc là **ADR-0152**. Mã, chú thích, commit, tài liệu sống từ nay ghi **ADR-0152**.
- Số điều / tiêu chí dùng trong KH là số của ADR-0152 (báo cáo kiểm kế hoạch K-4 đã đối chiếu khớp).

### Câu trả lời Q-1…Q-8
Chủ đã trả lời 30/10, bảng «Chủ đã chọn» ở KH mục 3: Q-1 (a), Q-2 (a), Q-3 (a), Q-4 không chờ, Q-5 (a) diễn tập trước 05/11 (không kịp thì gia hạn), Q-6 duyệt, Q-7 dữ liệu sau phát hành, Q-8 (a). Áp dụng, không hỏi lại.
- **Q-1 (a) — bổ sung chỗ đặt cho ADR-0146 Đ3 do chủ chọn:** cổng luật bán đứng **trước** `tinhCanXacNhan` ở `/status` và trước chốt «cần xác nhận» ở Gửi xác nhận. Lời gọi ở đầu `kiemCongXacNhan` giữ (lặp, vô hại).

### Số migration (kiểm 30/10, sau khi nhập `main`)
- `main` / nhánh này: lớn nhất `0127_dua_don_theo_dich_vu.sql`.
- `git log --all` lọc `migrations/0128*`, `0129*`, `013*`: rỗng — không nhánh nào (kể cả nhánh trên GitHub đã `fetch`) giữ số ≥ 0128.
- Mọi thư mục `.claude/worktrees/*` (kể cả tệp chưa commit): lớn nhất 0127.
- ⇒ **M1 = `0128_dac_diem_dich_vu.sql`, M2 = `0129_luat_ban.sql`.** Lúc gộp phải kiểm lại (KH mục 9 bước 1).
- ADR: `git log --all` lọc `docs/adr/ADR-015[1-9]*`: chỉ hai tệp 0151 nói trên ⇒ 0152 trống.

### Rà lại điểm neo của KH sau khi nhập 2.48 (`git diff a129d3d HEAD -- src web tests scripts`: 38 tệp, phần lớn `pricing` + `web/hoa-hong*`)
- `doiTrangThaiLoai` còn ở `pricing/index.ts` (nay `:162`), route `/tat` `:380` — thân không đổi nghĩa; T6 thêm 409 vào nhánh `bat = false`.
- Hộp «Tắt loại» mới (`web/hoa-hong-hop.ts`) hiện **nguyên câu máy chủ** cho 400/409 trong `.sheet-warn` ⇒ câu `loai_con_luat_ban` hiện đúng, không cần sửa tệp Hoa hồng (không thêm `hoa-hong-smoke.mjs` vào danh sách Chrome).
- `STRICT` (`architecture.test.ts:79`), `NUA_NGHIEM`: còn, số dòng trôi — tìm theo tên.
- `THANH_BEN`: «Hoa hồng đối tác» ở nhóm THIẾT LẬP (`muc-giao-dien.ts:197`) — T11 chèn ngay sau.
- `audit-actions.ts`, `route-access.test.ts`, `so-do-trang.ts` có đổi ở 2.48 — người thi công đọc bản hiện tại, không theo số dòng KH.
- **Bài cấm từ mới (2.48, `src/bang-tu-giao-dien.test.ts` + `src/shared/bang-tu-giao-dien.ts`)** — KH viết trước nó:
  - `CAM_THEO_TEP`: chữ «chính sách» (trừ «chính sách riêng tư / điều phối / đăng nhập») **cấm trong mọi chuỗi** của `src/modules/pricing/*.ts` (trừ test), `src/shared/audit-actions.ts`, `web/hoa-hong*.ts`, `web/parties.ts`, `hoa-hong-hien-thi`, `huong-dan-ke-toan`, `so-dai-ly-nhap`. ⇒ câu lỗi, nhãn nhật ký luật bán gọi là **«luật bán»**, không «chính sách bán».
  - Toàn cục: «Đang áp» / «Sắp áp» phải kèm «dụng»; «Đã đóng», «Kết thúc gắn», «Đóng mức», «Gắn mức» cấm; «Mức TA», «chính sách hoa hồng», «chính sách riêng» cấm; «chặng» cấm.

### Đo nền (HEAD `78d1d244`, 30/10)
- `npm run typecheck`: thoát 0.
- `npm test`: thoát 0 — bước 1: 6789 bài, 6785 qua, 0 đỏ, 4 todo; bước 2 (bài đo giờ hook): 1/1 qua. Không có bài đỏ sẵn.

### Cách chạy bộ kiểm dài (ruling của người thi công)
KH ghi `npm test` sau từng task. Theo ý chủ 27/10 («bộ kiểm dài chạy một lần», bộ nhớ phiên), giữa chừng chỉ chạy `node --test <tệp liên quan>` + `npm run typecheck`; `npm test` chạy **một lần cuối mỗi đợt giao** (trước mỗi KĐL); người kiểm KĐL-1/2 dùng số đó và chạy bài liên quan; KĐL-3 chạy lại đủ bộ, kể cả e2e.

## Câu chờ gom (hỏi chủ một lần, chậm nhất đầu T15)
1. **Q-6 và số ADR:** các dòng đề xuất cho `src/CLAUDE.md`, `web/CLAUDE.md`, `docs/ARCHITECTURE.md` lấy từ ADR-0146 Hệ quả và `TRANG-GHEP.md` mục 7, có thể ghi «ADR-0151». Q-6 cho thêm **nguyên văn**; đổi chữ phải hỏi. Khuyến nghị: chỉ đổi «0151» → «0152», còn lại nguyên văn.

## Nhật ký theo task
