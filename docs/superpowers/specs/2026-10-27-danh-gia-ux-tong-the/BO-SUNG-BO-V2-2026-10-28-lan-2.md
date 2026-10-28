# Bổ sung bộ v2 lần 2: gộp Claude Design (28/10/2026)

Hồ sơ có ngày: viết xong là đóng băng. Tờ này nối tiếp `TOM-TAT-CONG-2A.md` và `BO-SUNG-BO-V2-2026-10-28.md` (không sửa hai tờ đó). Nguồn yêu cầu là bảng gộp `GOP-CLAUDE-DESIGN-VAO-BO-V2-2026-10-28.md` (phiên kiểm, nhánh `worktree-danh-gia-ux-tong-the-v2` commit 438e21c7), mục 9. Lời duyệt cổng 2a của chủ ngày 28/10 gồm phím tắt chỉ giữ `/` và `Esc`, phím `N` để sau.

**Bộ sau gộp:** <https://claude.ai/artifact/R7vYe6PdU85WCSYkanWNP5>. Các tệp lên ở bản 7 (`1793155393-d9e4`); chỉ mục ghi sau cùng, nên bản hiện hành là **bản 8 (`1793155409-bf46`)**. Trước khi ghi, bộ vẫn ở bản `1793148085-173e`, nghĩa là không ai sửa chen giữa. Bản chụp `ds-v2/` và 27 ảnh kiểm ở `docs/evidence/2026-10-28-ds-v2/anh-kiem/` đã chép lại theo bản này.

## Đã làm theo mục 9 của bảng gộp

| Việc | Đã làm |
|---|---|
| Token đệm | Họ mới `dem`, 14 token ghi «MỚI · từ Claude Design»: `pad-nut` 16 · `pad-o` 12 · `pad-chip` 12 · `pad-tab` 16 · `pad-huy-hieu-doc` 3 / `-ngang` 8 / `-bt` 6 · `pad-the` 16 / `pad-the-rong` 24 · `le-trang` 16 / `le-trang-rong` 32 · `nhip-khoi` 24 · `h-o-nhieu-dong` 96 · `vanh-cach` 2. Đệm huy hiệu `3 8 3 6` tách thành ba token, vì trang bộ chỉ đọc một độ dài mỗi token. |
| Màu | `c-check-border` = `{c-text-muted}` và `c-switch-off-bg` = `{c-input-border-hover}` ghi MỚI. `c-toast-bg` = `{c-primary-strong}` ghi **ĐỔI so với mã** kèm lý do. Tên token theo bộ, không đổi sang tiếng Việt. |
| BỎ bo 14 | Bảng gọi là «`radius-lg` 14», nhưng trong bộ `radius-lg` là 18 (góc bảng trượt). Bo 14 của ô số liệu mang tên **`radius-tile`**, nên tôi bỏ `radius-tile` và để ô số liệu dùng `radius-md` 12. `radius-lg` 18 giữ nguyên. |
| Sổ tay | Mục 1 bỏ ví dụ `radius-tile`. Mục 5 thêm gói đệm và bo ô số liệu. Mục 7 chỉ còn `/` và `Esc` (`N` để sau). Mục 10 nay có 26 thành phần. Mục 11 thêm khối «MỚI · từ Claude Design», ĐỔI toast nền tối, BỎ `radius-tile`. Mục 12 ghi sáu thành phần đã vào bộ; còn thiếu thanh bên gọn 56, trang bảo trì và năm khuôn trang (vẽ ở 7b). |
| Bốn thành phần lấy diện mạo Design | **OChon**: viền 2 px `c-check-border`, ô tích bo `bo-control` 8 (bản xuất ghi cứng 6, không chép), rê đổi nền, công tắc trượt `t-vua` với núm có bóng, dòng 44 có mô tả 14. **HopThoai**: vòng 44 tông Đỏ có biểu tượng `alert` + câu hậu quả 14/500 `c-danger-text`. **Toast**: nền tối, `check` màu xanh lá nhạt, «Hoàn tác» gạch chân, nút ✕, cao tối thiểu 52, dừng đếm khi rê hoặc có tiêu điểm; README bỏ câu «chờ tấm vẽ Claude Design». **TrangThaiRong**: vòng 56 nền `c-surface-alt`, biểu tượng 24, câu chính 16/500, câu phụ 14 dài tối đa 36 ký tự. |
| Áp đệm vào thành phần cũ | `bundle.css`: nút, ô, chip, tab (cả hai kiểu), huy hiệu (cao 24), thẻ, ô nhiều dòng 96, tay kéo bảng trượt 36 × 5. |
| Sáu thành phần MỚI | `DauTrang` (kiểu B, 7b chọn A hay B), `ThanhTren`, `ThanhTabDuoi` (có nút tròn san hô từ mã mà bản xuất thiếu), `ThanhBen` (nhóm viết thường theo bản xuất, ghi câu hỏi B-NHAN-IN-HOA; thanh bên gọn 56 chờ 7b), `TrangMatMang`, `TrangLoi` (một nút, không lấy hai lối nhỏ chưa có luồng). Mỗi thành phần có README theo khuôn bốn mục và một `preview.html` HTML tĩnh. Không có `.jsx` và không có lớp `.ib-*`. Lớp mới: `.dau-noi-dung` (vì `.dau-trang` đã là kiểu A), `.thanh-tren`, `.thanh-tab`, `.thanh-ben`, `.trang-bao`. |

## Giữ nguyên theo bảng

`c-focus-ring`, `shadow-card-hover`, `shadow-btn-solid`; năm tông `history` / `alertCircle` / `minus`; mốc 640; `skel-dong` 16; chip 44; Tab hai biến thể; TaiThem không số trang; ONgay `type=date`; bẫy tiêu điểm bảng trượt; phông mono chỉ cho PIN và mã hai lớp; `lh-heading` vẫn BỎ.

## Số đếm và kiểm

Máy đếm 220 token (lần 1: 204), trong đó **35 MỚI** = 19 cũ + 14 đệm + 2 màu, không trùng tên. Mọi `var(--…)` trong `bundle.css` đều có trong `tokens.css` biên dịch lại. Tôi đã xem lại 27 ảnh kiểm sau khi gộp. Một ảnh bị cắt (hộp xác nhận) đã được nới khung chụp lại. Logo trong ThanhTren chỉ hiện trên Claude vì trỏ tài sản `/_blob/…`; ảnh chụp trên máy không hiện logo.

**Phát hiện cho đợt 0** (theo bảng mục 7): B-VIEN-O-CHON-TUONG-PHAN. Vòng chọn một của mã ≈ 1,25:1, viền ô nhập 1,5:1, bộ sửa bằng `c-check-border`.

Đây là lần sửa cuối của phiên giữ bộ. Commit kèm tờ này là commit cuối của nhánh `chang-2-ds-v2`.
