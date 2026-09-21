# Bàn giao: Góp ý / Báo lỗi

Spec: `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md` · Kế hoạch: `docs/superpowers/plans/2026-09-21-gop-y-bao-loi.md`.

## Trạng thái mã
- Nhánh `worktree-feedback-spec`; Task 1–9 đã commit (từ `2cf5563` kế hoạch đến `c27eb4a`), Task 10 (binding email + tài liệu) là commit cuối.
- `npm test`: 251/251 đạt. `npm run typecheck`: 0 lỗi. `npm run test:e2e`: 11/11 kịch bản xanh, gồm `feedback` và `audit-invariants` (D1 local, `--strict`). `npx wrangler deploy --dry-run`: hợp lệ, liệt kê `env.EMAIL` (Send Email).
- `wrangler.jsonc` đã khai `"send_email": [{ "name": "EMAIL", "remote": true }]` đúng mẫu tài liệu Cloudflare Email Service. `remote: true` nghĩa là `wrangler dev` nối tới dịch vụ thật; e2e vẫn xanh vì kịch bản không gửi thư thật (chưa có hai secret nên email tự tắt).
- Thử tay giao diện (Task 9 bước 6): CHƯA LÀM. Xem "Việc kiểm tay còn lại".

## Việc kiểm tay còn lại
1. `build:web`: cùng `BUILD_ID` trong `public/sw.js` và `public/js/feedback.js`; dòng "Sẽ đính kèm…" hiện phiên bản.
2. `/feedback` phục vụ không cần `.html`; cache service worker đúng.
3. Tài khoản thường: không có tab hàng đợi và không gọi `/api/feedback` hàng đợi; admin: có tab hàng đợi, bộ lọc, bảng thống kê hiển thị.
4. Luồng tạo: gửi lại dùng cùng `clientRequestId`, chuyển sang `?id=`.
5. Bấm đúp "Gửi" chỉ gửi một lần.
6. Luồng thảo luận: nút chuyển trạng thái khớp trạng thái hiện tại; lỗi 409 giữ banner và tải lại trạng thái; ghi chú nội bộ ẩn với người gửi.
7. Trau chuốt giao diện đã biết cần xem/sửa: class `list-row` chưa có CSS; ô chọn ghi chú nội bộ có thể bị kéo giãn (`app.css` có `input{display:block;width:100%}`); bảng thống kê chưa nằm trong khung cuộn (kiểm ở 375px).
8. Chấm đỏ ở menu desktop và dòng `/account`, ẩn khi bằng 0.
9. `?new=1&from=/order` mở form kèm ngữ cảnh đường dẫn; `?id=` sai hiện lỗi kèm liên kết quay lại.

## Việc của chủ dự án TRƯỚC khi triển khai
1. Bật Cloudflare Email Service trên tài khoản (beta, gói Workers Paid — đã trả phí).
2. Onboard tên miền gửi thư (vd `tourdao.vn`) trong dashboard: Compute > Email Service > Email Sending. Cloudflare tự thêm bản ghi MX (thư trả lại), SPF TXT, DKIM TXT và DMARC TXT (`_dmarc`); lan truyền thường 5–15 phút với DNS Cloudflare, tối đa 24 giờ.
3. Đặt hai secret: `npx wrangler secret put FEEDBACK_NOTIFY_EMAIL` (địa chỉ admin nhận) và `npx wrangler secret put FEEDBACK_MAIL_FROM` (địa chỉ gửi trên tên miền đã xác minh). Thiếu một trong hai/binding thì email tự tắt (yêu cầu vẫn lưu).
4. Câu hỏi mở: trang tài liệu chỉ nói binding `send_email` + `remote: true`; chưa thấy nêu chính thức việc `wrangler deploy` có cần thêm thao tác gì với binding này, hay giới hạn số thư/ngày. Kiểm trên dashboard khi onboard tên miền.

## Triển khai (làm khi được lệnh; ĐỘC LẬP với B5)
1. `npm test`, `npm run typecheck`, `npm run test:e2e` đều xanh (chạy riêng từng lệnh, ghi kết quả).
2. Ghi điểm khôi phục: `npx wrangler d1 time-travel info tourdao-sales-db`.
3. `npm run db:migrate:remote` — chỉ THÊM bảng `fbk_*` (mã cũ chạy nguyên vẹn nên áp migration TRƯỚC deploy là an toàn). Kiểm số migration chưa áp có ĐÚNG là `0016_feedback.sql` (không kéo theo file B5 nào).
4. `npx wrangler deploy`.
5. Kiểm sau deploy: gửi một yêu cầu thật bằng tài khoản thường; kiểm email đến hộp thư admin và hàng đợi không báo "chưa gửi được email"; nếu email không đến: xem log Worker (`console.error "Gửi email báo admin thất bại"`), sửa cấu hình rồi thử lại — yêu cầu không mất.
6. Chạy `node scripts/audit-invariants.mjs --remote` (chỉ đọc).

## Hoàn tác
Bảng `fbk_*` mới, không ai khác đọc: gỡ bản triển khai bằng `wrangler rollback` là đủ; KHÔNG cần xoá bảng (mã cũ không đụng tới).

## Điểm mở
- Thời hạn lưu giữ yêu cầu đã đóng (dữ liệu có thể chứa thông tin khách do người dùng gõ).
- `admin_seen_at` dùng chung mọi admin (một admin xem là các admin khác hết chấm đỏ).
- Mốc "đã xem" dùng chung mọi admin (cùng ý trên, áp cho chấm đỏ và cờ chưa đọc).
- Thống kê theo tuần dùng `strftime('%Y-%W')`: tách sai ở ranh giới năm (tuần chung giữa hai năm bị chia đôi).
- Việc sau v1: ảnh (R2), email cho người gửi, retry gửi thư bằng Cron, `duplicate_of`, ưu tiên/SLA, `tenant_id`.
