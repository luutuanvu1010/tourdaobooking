# Kế hoạch: dựng môi trường thử giống thật cho CRM

> Hồ sơ đóng băng ngày 2026-10-05, dùng lại khi kích hoạt. Trạng thái hiện hành chỉ ghi ở đặc tả `docs/superpowers/specs/2026-10-05-moi-truong-thu.md`.

- Trạng thái: hoãn có điều kiện (chủ dự án quyết 2026-10-05, sau khi xem số liệu: khoảng 80 phiên bản trong 17 ngày, vài sự cố đều do khác biệt máy tính với Cloudflare, không có lần mất dữ liệu hay sai tiền). Dựng khi một trong ba điều xảy ra: (1) sắp phát hành một migration chạm tiền (ví dụ khoá kỳ sổ tiền); (2) sắp nâng ghim CRM lên bộ luật mới; (3) thêm một sự cố do khác biệt máy tính với Cloudflare. Kế hoạch giữ nguyên để dùng khi kích hoạt.
- Đặc tả: `docs/superpowers/specs/2026-10-05-moi-truong-thu.md` (chủ chọn đủ bốn câu 2026-10-05).
- Loại: việc lớn (triển khai). AI làm trên nhánh riêng, test đỏ trước xanh sau, người kiểm độc lập chỉ đọc; chủ chạy mọi lệnh tạo tài nguyên, đặt bí mật, deploy (CLAUDE.md §8).

## Tiêu chí nghiệm thu (kiểm được)
1. `https://thu.booking.tourdao.vn` mở được trang đăng nhập khi đã qua Cloudflare Access; người chưa qua Access bị chặn trước khi tới Worker.
2. Bản thử dùng D1 riêng; không câu nào của bản thử đọc hay ghi D1 thật (kiểm bằng `wrangler d1 execute tourdao-sales-staging-db --remote` chỉ đọc, đếm bảng có dữ liệu gieo; D1 thật không đổi số dòng).
3. Đăng nhập bằng PIN qua Turnstile thật; Face ID tạo và dùng được trên tên miền thử.
4. `npm run trien-khai` dừng ở chặng thử nếu bộ kiểm khói trên bản thử đỏ, và không bước nào của bản thật chạy (quan sát chặn thật một lần, ghi sổ hàng rào).
5. Không cron trên bản thử; email tắt; Web Push dùng cặp khoá riêng.

## Bước

| # | Việc | Ai | Ghi chú |
|---|---|---|---|
| 0 | Nhập nhánh tài liệu hiện tại (`npm run day-len -- worktree-cap-nhat-bo-luat-v2`) | Chủ | Không cần triển khai |
| 1 | Tạo D1 thử: `npx wrangler d1 create tourdao-sales-staging-db`, gửi AI dòng `database_id` | Chủ | Lệnh ghi lên Cloudflare |
| 2 | Cloudflare Access: tạo ứng dụng tự lưu trữ cho `thu.booking.tourdao.vn`, chính sách cho phép đúng email của chủ (mã gửi qua email) | Chủ | Trên bảng điều khiển Zero Trust; AI soạn hướng dẫn từng nút nếu cần |
| 3 | Turnstile: thêm tên miền `thu.booking.tourdao.vn` vào widget hiện có | Chủ | Dùng lại cặp khoá hiện có |
| 4 | Khối `env.staging` trong `wrangler.jsonc` (Worker `tourdao-sales-staging`, route `thu.booking.tourdao.vn`, D1 thử, Durable Object, không cron, vars passkey theo tên miền thử, VAPID công khai riêng); bài kiểm cấu hình (env thử không trỏ D1 thật, không có cron) | AI | Đỏ trước xanh sau |
| 5 | Chặng thử trong `scripts/release-lib.mjs`: migration D1 thử → deploy `--env staging` → bộ kiểm khói trên tên miền thử → `kiem-phien-ban` cho bản thử → chủ bấm qua → các bước bản thật như cũ; bài kiểm thứ tự chặng | AI | Hàng rào AI không đổi |
| 6 | Bộ kiểm khói chỉ dùng tài khoản gieo trên bản thử (đăng nhập, lập đơn, xác nhận, thu tiền, Bảng tin), từ chối chạy nếu tên miền là bản thật | AI | Thoát 0/1/2 |
| 7 | Kịch bản gieo dữ liệu mẫu cho D1 thử (từ dữ liệu gieo e2e), từ chối chạy với D1 thật | AI | |
| 8 | Đặt bí mật thử: `SESSION_SECRET`, `LAN_GUI_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `VAPID_PRIVATE_KEY` (cặp mới), tuỳ chọn `OPENAI_API_KEY`; mỗi khoá `npx wrangler secret put <TÊN> --env staging` | Chủ | Không đặt khoá email |
| 9 | Lần chạy đầu theo runbook AI soạn: migration D1 thử, gieo dữ liệu, deploy thử, kiểm khói | Chủ | |
| 10 | ADR "môi trường thử", dòng sổ hàng rào (chặng thử, ngày quan sát chặn thật), lời khai giống thật (H12a) trình chủ duyệt; cập nhật `docs/HANDOFF-N1.md`, `docs/QUY-TRINH-PHAT-HANH.md` | AI soạn, chủ duyệt | |
| 11 | Người kiểm độc lập chỉ đọc kiểm bước 4–7, 10 | Subagent | |

AI làm được bước 4–7 trước khi có `database_id` (để chỗ trống, bài kiểm đòi điền trước khi deploy); bước 9 chỉ chạy được sau bước 1–3 và 8.
