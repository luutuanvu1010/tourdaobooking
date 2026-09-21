# Góp ý / Báo lỗi (module `feedback`) — thiết kế

> Ngày 2026-09-21. Trạng thái: **bản thảo chờ chủ dự án duyệt**, chưa có mã. Đây là nền cho kênh hỗ trợ Ticket sau này.

## Mục tiêu và phạm vi

Người dùng đã đăng nhập gửi **báo lỗi / đề xuất / câu hỏi** cho quản trị viên ngay trong app; admin tiếp nhận, trả lời trong luồng và đổi trạng thái; người gửi theo dõi ở "Yêu cầu của tôi". Mô hình dữ liệu dạng ticket ngay từ đầu, giao diện v1 tối thiểu.

**Ngoài v1 (đã chốt):** ảnh đính kèm (cần R2), thông báo đẩy, email cho người gửi, ưu tiên/SLA/gán nhóm, đường email/Zalo vào hộp thư.

## Quyết định đã chốt

1. Admin **trả lời trong luồng**; người gửi thấy phản hồi trong app.
2. **Chưa có ảnh** ở v1; dữ liệu để sẵn chỗ mở rộng.
3. Báo tin: chấm đỏ trong app + **email cho admin** qua Cloudflare Email Service (binding `EMAIL`, beta, gói Workers Paid).
4. Email nhận: **một địa chỉ cố định** trong biến `FEEDBACK_NOTIFY_EMAIL` (không thêm cột email vào tài khoản).
5. Mọi tài khoản đăng nhập (kể cả FIELD) được gửi; người thường chỉ thấy yêu cầu của mình.

## Dữ liệu (module chủ `feedback`, tiền tố `fbk_`)

- `fbk_ticket`: `id`, `code` (dạng `YC-0007`, người đọc được), `kind`, `status`, `title`, `context` (JSON), `submitter_id`, `assignee_id` (NULL được), `submitter_seen_at`, `admin_seen_at`, `last_activity_at`, `last_public_reply_at`, `notified_at` (NULL = chưa gửi email được), cột kiểm toán theo chuẩn N1, khoá lạc quan `updated_at`.
- `fbk_message`: `id`, `ticket_id` (FK), `author_id`, `body`, `internal` (0/1: ghi chú nội bộ, chỉ admin thấy), `created_at`. Mô tả ban đầu là tin đầu tiên.
- `fbk_kind` (`BUG`, `IDEA`, `QUESTION`), `fbk_status` (`NEW`, `ACK`, `IN_PROGRESS`, `DONE`, `DECLINED`): bảng tra cứu khoá `code`, không `CHECK` liệt kê.
- Cột WHO (`submitter_id`, `assignee_id`, `author_id`) là `TEXT NULL`, không khoá ngoại, không `CASCADE`. Tên hiển thị đọc qua `v_stf_staff_label`; mã đơn qua `v_ord_order_label`. Không JOIN thẳng bảng module khác.
- Người gửi trả lời khi ticket đã `DONE`/`DECLINED` → tự chuyển về `ACK`.
- Chấm đỏ admin: ticket có `last_activity_at` > `admin_seen_at`. Chấm đỏ người gửi: ticket có `last_public_reply_at` > `submitter_seen_at`.
- Sau này: bảng `fbk_attachment` thêm bằng migration "mở rộng", không đổi bảng cũ.
- Số migration: lấy số kế tiếp còn trống lúc thi công (0013 hiện dành cho B5 — `docs/HANDOFF-N1.md`); chỉ thêm file mới.

## API và quyền

| Route | Truy cập | Việc |
|---|---|---|
| `POST /api/feedback` | staff | tạo yêu cầu |
| `GET /api/feedback/mine` | staff | yêu cầu của tôi |
| `GET /api/feedback/badge` | staff | số chấm đỏ |
| `GET /api/feedback/:id` | chủ hoặc admin | xem luồng (ẩn `internal` với người gửi); đánh dấu đã xem |
| `POST /api/feedback/:id/messages` | chủ hoặc admin | trả lời; `internal` chỉ admin đặt được |
| `GET /api/feedback` | admin | hàng đợi, lọc trạng thái/loại |
| `PATCH /api/feedback/:id` | admin | đổi trạng thái, người xử lý (khoá lạc quan) |

- `MATRIX` (`src/shared/permissions.ts`) thêm: `feedback.submit` (cả 4 quyền = `any`), `feedback.view` (SALES/ACCOUNTING/FIELD = `own`, ADMIN = `any`), `feedback.triage` (chỉ ADMIN). Test khoá bản đồ cập nhật theo.
- Đầu vào: `title` ≤ 120, `body` ≤ 4000 ký tự; trần số yêu cầu mới/giờ/tài khoản (đề xuất 5, chỉnh được ở `rules.ts`). Kiểm ở luật thuần.
- `context`: **không đáng tin**. Server chỉ nhận bộ khoá cố định (`path`, `orderCode`, `device`, `standalone`, `appVersion`), cắt độ dài, bỏ khoá lạ. Giao diện dựng bằng `h()`, không `innerHTML`.
- Nhật ký: dùng `audit_log` chung (`order_id` NULL, `target_type = 'feedback'`, `target_id` = id ticket). Thêm nhóm `feedback` và hành động `feedback_created`, `feedback_replied`, `feedback_status_changed` vào `src/shared/audit-actions.ts`; không cần migration.
- DTO khai ở `src/shared/contracts.ts`. Module đăng ký trong `src/index.ts`; ghi bảng chỉ qua module chủ; `repository.ts` đi qua `defineSql` (ranh giới SQL nghiêm, như `parties`).

## Giao diện

- Mục "Góp ý / Báo lỗi" trong menu chung (`web/shell.ts`) mở bảng trượt dưới (kiểu `trip-sheet`): loại, tiêu đề, mô tả, cùng dòng liệt kê những gì sẽ được đính kèm tự động.
- Trang `public/feedback.html` + `web/feedback.ts` (thêm vào `build:web`): "Yêu cầu của tôi" và luồng trả lời; ADMIN có tab "Hàng đợi" (lọc, đổi trạng thái, ghi chú nội bộ). Chấm đỏ trên menu.
- Tiếng Việt có dấu đầy đủ; bám khuôn `web/parties.ts` cho danh sách/chi tiết.

## Email

- Kích hoạt khi tạo yêu cầu mới và khi **người gửi** trả lời (không gửi khi admin tự trả lời).
- Gửi **sau** khi D1 ghi xong, qua `ctx.exec` (`waitUntil`). Lỗi gửi **không** làm hỏng yêu cầu: `notified_at` để NULL, chấm đỏ và hàng đợi vẫn đủ. Retry bằng Cron là việc sau v1.
- Nội dung: loại, tiêu đề, tên người gửi, đoạn đầu mô tả (cắt), đường dẫn vào app. Không nhúng dữ liệu người dùng vào tiêu đề dạng có thể chèn header (làm sạch xuống dòng).
- Cấu hình: binding `EMAIL` (wrangler), biến `FEEDBACK_NOTIFY_EMAIL`, địa chỉ gửi trên tên miền đã xác minh.
- **Việc chủ dự án làm trước khi deploy**: bật Email Service trên tài khoản Cloudflare, xác minh tên miền gửi thư (SPF/DKIM; tài liệu chưa nêu rõ, kiểm khi thi công), đặt địa chỉ nhận.

## Kiểm thử

- `rules.test.ts` (luật thuần): kiểm đầu vào, lọc `context`, mở lại khi trả lời, tính chấm đỏ, trần tần suất.
- e2e (`tests/e2e/`): người A không đọc/trả lời được yêu cầu của B; người gửi không thấy `internal`; chỉ admin đổi trạng thái; email dùng bản giả (mock) và lỗi gửi không làm hỏng yêu cầu.
- `npm test` phải xanh, gồm `architecture.test.ts` (tiền tố bảng, sổ dữ liệu `docs/data-dictionary.json` + `npm run dict`, ranh giới SQL, cột kiểm toán); `npm run typecheck`; `scripts/audit-invariants.mjs`.
- Sổ dữ liệu cập nhật: bảng `fbk_*`, module chủ `feedback`, cạnh đọc tới `v_stf_staff_label`/`v_ord_order_label`.

## Đường lên Ticket

Đã có thread, trạng thái, người xử lý, nhật ký. Còn thiếu và thêm dần, không đổi cấu trúc: ưu tiên, SLA, ảnh (`fbk_attachment` + R2), gán nhóm, email cho người gửi, kênh vào từ email/Zalo, retry gửi thư bằng Cron.

## Rủi ro và điểm mở

- Email Service còn **beta**: chấp nhận vì email chỉ là thông báo phụ; nếu bị đổi/ngừng thì đổi nhà cung cấp mà không đụng dữ liệu.
- Người dùng gõ nội dung nhạy cảm (SĐT khách…) vào yêu cầu: chỉ admin và chính họ thấy; email cắt đoạn đầu. Nếu chủ dự án muốn email không kèm nội dung, chỉ để tiêu đề + đường dẫn, đổi ở một chỗ.
- Trần tần suất/giờ và độ dài chỉ là đề xuất, chốt lúc lập kế hoạch.
