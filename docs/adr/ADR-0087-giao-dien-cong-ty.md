# ADR-0087 — Giao diện công ty do Toàn quyền chỉnh (màu, phông, cỡ chữ, độ đậm)

- **Trạng thái:** **accepted** 2026-10-02 (chủ dự án duyệt đặc tả kèm bản nháp này bằng lời "1- duyet", sau một hộp hỏi 4 câu — đều chọn phương án khuyến nghị). **Điều 3 (cách nạp tệp màu) được ADR-0102 sửa ngày 2026-10-05:** tệp nay ở `/giao-dien.css` và do service worker đệm; đường `/api/giao-dien.css` giữ làm đường cũ.
- **Ngày:** 2026-10-02.
- **Số:** 0087 — kiểm `git log --all` lúc chép (2026-10-02): còn trống; `ADR-0086` đã có trên nhánh `van-chuyen-dot-1` / `worktree-doi-chieu-phieu-giam-doc` (chưa gộp). Migration: số lớn nhất mọi nhánh + 1 lúc thi công (`0068` đã có trên `van-chuyen-dot-1` ⇒ dự kiến `0069`).
- **Đặc tả:** `docs/superpowers/specs/2026-10-02-giao-dien-cong-ty-design.md` (núm chỉnh, cách đưa tới trang, kiểm hợp lệ, màn, kiểm). Một quyết định, một bảng mới một loại dữ liệu, dùng lại ô quyền có sẵn ⇒ không cần trang ghép (CLAUDE.md §9).
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` không có phát hiện HIGH mở).
- **Nền:** bản 1.65 (nhánh `thanh-sang-chu-manh`) — màu thanh / nút / mục đang chọn và độ đậm chữ đã là token theo vai ở `:root` của `public/app.css`, canh bằng `src/token-giao-dien.test.ts`.
- **Liên quan:** ADR-0019 / ADR-0038 (ô `settings.ops`, Toàn quyền), ADR-0035 (bản nhớ khung — KHÔNG dùng), kế hoạch "3 tông theo người" (`docs/superpowers/specs/2026-10-01-giao-dien-mau-thu-hai-kieu-klook.md`, nhánh `worktree-trang-chu-momo-lenh-thiet-ke` — hoãn, sẽ là lớp đè lên lớp này).

## Bối cảnh

Chủ dự án muốn tự chỉnh giao diện (màu nền, thanh tác vụ, nút hành động, phông, cỡ chữ, độ đậm, tiêu đề, nội dung) ở bảng điều khiển, không cần lập trình viên, áp cho cả công ty. Đã chốt: một bộ chung (không theo từng người); màu tự do nhưng máy chặn chữ khó đọc; phông chọn trong danh sách phông tiếng Việt có sẵn trong app; cỡ chữ và độ đậm theo vai (tiêu đề, nội dung, nhãn, nút).

## Quyết định

1. Có MỘT bộ giao diện chung, lưu ở bảng một dòng `gd_setting` của module mới `giao-dien` (nghiêm). Giá trị là tập GHI ĐÈ token theo danh sách núm ĐÓNG; rỗng = mặc định của `app.css`. Khoá lạc quan bằng `version` (lưu chồng → 409).
2. Chỉ người giữ ô `settings.ops` (Toàn quyền) đổi được; không thêm mã thao tác quyền mới.
3. Giao diện đọc CÔNG KHAI qua `GET /api/giao-dien.css` (`text/css`, `ETag` = `version`), nạp bằng thẻ `link` ngay sau `/app.css` ở mọi trang (kể cả Đăng nhập, màn bảo trì); lỗi hoặc mất mạng = mặc định. Service worker vẫn không cache `/api/*`.
4. Máy chủ kiểm hợp lệ bằng CÙNG một tệp thuần với giao diện (`src/shared/giao-dien.ts`): khoá trong danh sách, giá trị đúng dạng / trong khoảng, độ đậm có tệp phông thật, tương phản ≥ 4,5:1 cho các cặp chữ/nền đã liệt kê; không đạt → 400, không lưu. CSS chỉ dựng từ giá trị đã kiểm (không chép chuỗi thô).
5. Phông chỉ chọn trong danh sách phông có tệp `woff2` đủ chữ Việt nằm trong app (`public/fonts/`); không nạp phông từ ngoài, CSP giữ nguyên.
6. Mỗi lần áp dụng ghi nhật ký `giao_dien_changed` (khoá đổi + giá trị cũ → mới; không có dữ liệu cá nhân).
7. Ngoài phạm vi: tuỳ chọn theo từng người (lớp đè sau), ảnh xác nhận gửi khách, biểu tượng app, thẻ meta thanh trạng thái iPhone (giữ `default`, `#ffffff`).

## Hệ quả

- (+) Chủ tự đổi giao diện tức thì, không cần phát hành; màn mới tự theo vì dùng token vai.
- (−) Mỗi lần mở trang thêm một yêu cầu nhỏ (phần lớn 304).
- (−) Một lựa chọn xấu nhưng vẫn đạt tương phản áp cho cả công ty ngay — giảm bằng khung xem trước và "Về mặc định".
- (−) Thêm vài phông làm kho tệp tĩnh lớn thêm (~0,5–1 MB; không tải nếu không dùng).
- (−) Nền thanh trên chọn màu đậm thì trên iPhone vẫn có dải trắng chứa giờ/pin.

## Phương án đã cân nhắc

- (a) Gửi giao diện trong `/api/auth/me` rồi áp bằng JS — nháy màu cũ khi mở trang; trang Đăng nhập không có phiên.
- (b) Lưu ở bộ nhớ máy (localStorage / bản nhớ khung ADR-0035) — không chung cho công ty.
- (c) Sinh lại `app.css` khi lưu — Workers Assets là tệp tĩnh lúc deploy, không ghi được.

## Một chiều / hai chiều

- Một chiều: bảng `gd_setting` + migration (chỉ thêm).
- Hai chiều: từng giá trị giao diện ("Về mặc định" trả về `app.css`).
