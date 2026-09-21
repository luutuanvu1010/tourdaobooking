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

- `fbk_ticket`: `id`, `seq` (số thứ tự duy nhất; mã người đọc `YC-0007` tính từ `seq` ở code), `kind`, `status`, `title`, `context` (JSON), `submitter_id`, `assignee_id` (NULL được), `client_request_id` (UUID do client sinh; **duy nhất** theo `(submitter_id, client_request_id)`), `resolved_in` (NULL được, mã bản dựng khi chuyển `DONE`), `submitter_seen_at`, `admin_seen_at`, `last_activity_at`, `last_public_reply_at`, `notified_at` (NULL = chưa gửi email được), cột kiểm toán theo chuẩn N1, khoá lạc quan `updated_at`.
- `fbk_message`: `id`, `ticket_id` (FK), `author_id`, `body`, `internal` (0/1: ghi chú nội bộ, chỉ admin thấy), `created_at`. Mô tả ban đầu là tin đầu tiên.
- `fbk_kind` (`BUG`, `IDEA`, `QUESTION`), `fbk_status` (`NEW`, `ACK`, `IN_PROGRESS`, `DONE`, `DECLINED`): bảng tra cứu khoá `code`, không `CHECK` liệt kê.
- Cột WHO (`submitter_id` và `author_id` là `TEXT NOT NULL` vì luôn có người; `assignee_id` là `TEXT NULL`), không khoá ngoại, không `CASCADE` (chuẩn ADR-0002/N1 cho bảng mới). Lưu ý `audit_log.staff_id` thì vẫn `REFERENCES staff(id)` (migration 0007): hai chuẩn khác nhau là có chủ ý, không đồng bộ lại. Tên hiển thị đọc qua `v_stf_staff_label`. Không JOIN thẳng bảng module khác.
- Danh sách kind/status ở v1 là **cố định do hệ thống sở hữu** (không có màn hình admin sửa danh sách).
- **Chuyển trạng thái là luật thuần** trong `rules.ts` (có bảng và test); `PATCH` không được đặt trạng thái tuỳ ý:

  | Từ | Sang được | Ai |
  |---|---|---|
  | `NEW` | `ACK` | admin |
  | `ACK` | `IN_PROGRESS`, `DONE`, `DECLINED` | admin |
  | `IN_PROGRESS` | `DONE`, `DECLINED` | admin |
  | `DONE`, `DECLINED` | `ACK` | người gửi trả lời, hoặc admin mở lại |

  Mọi chuyển khác bị từ chối (`409`). Chuyển sang `DONE` có thể kèm `resolved_in` (tuỳ chọn).
- Chấm đỏ admin: ticket có `last_activity_at` > `admin_seen_at`. Chấm đỏ người gửi: ticket có `last_public_reply_at` > `submitter_seen_at`.
- Sau này: bảng `fbk_attachment` thêm bằng migration "mở rộng", không đổi bảng cũ.
- Số migration: `0013` là migration siết của B5 và **không được nằm trong `migrations/` ở lần phát hành đầu** (`docs/HANDOFF-N1.md`: `wrangler d1 migrations apply` áp mọi file chưa áp); nhánh v1.0 đã dùng `0014`, B5 lấy số sau đó. Nên `fbk_*` lấy **số kế tiếp sau B5**, kiểm số thật lúc thi công, và **deploy độc lập, không gộp với B5**. Chỉ thêm file mới.

## API và quyền

| Route | Truy cập | Việc |
|---|---|---|
| `POST /api/feedback` | staff | tạo yêu cầu (idempotent theo `client_request_id`: gửi lại thì trả ticket cũ, không tạo thêm, không gửi thêm email) |
| `GET /api/feedback/mine` | staff | yêu cầu của tôi |
| `GET /api/feedback/badge` | staff | số chấm đỏ |
| `GET /api/feedback/:id` | chủ hoặc admin | xem luồng (ẩn `internal` với người gửi); đánh dấu đã xem |
| `POST /api/feedback/:id/messages` | chủ hoặc admin | trả lời; `internal` chỉ admin đặt được |
| `GET /api/feedback` | admin | hàng đợi, lọc trạng thái/loại; kèm số đếm theo kind × status × tuần (từ `created_at`, `last_activity_at`); ticket có `notified_at` NULL hiện nhãn "chưa gửi được mail" |
| `PATCH /api/feedback/:id` | admin | đổi trạng thái, người xử lý (khoá lạc quan theo trạng thái cũ: đổi từ trạng thái đã khác → 409) |

- `MATRIX` (`src/shared/permissions.ts`; cột quyền: SALES, ACCOUNTING, ADMIN, FIELD) thêm: `feedback.submit` (cả 4 quyền = `any`), `feedback.view` (SALES/ACCOUNTING/FIELD = `own`, ADMIN = `any`), `feedback.triage` (chỉ ADMIN). Test khoá bản đồ cập nhật theo.
- Đầu vào: `title` ≤ 120, `body` ≤ 4000 ký tự; kiểm ở luật thuần.
- **Chống spam**: một câu `INSERT … SELECT … WHERE (SELECT count(*) … trong 1 giờ) < trần` trên chính `fbk_ticket` / `fbk_message` — đếm và chèn cùng MỘT câu lệnh nên hai request song song không cùng qua trần (không tự viết `SELECT count` rồi `INSERT` ở hai bước). Không dùng `login_attempt`/`reserveAttempts`: đó là bảng của `auth`, và mẫu ấy có `DELETE` mà bài kiểm R-N1-9 cấm với bảng mới. Trần áp cho **cả** `POST /api/feedback` (5/giờ/tài khoản) **và** `POST /api/feedback/:id/messages` (30/giờ/tài khoản, tính cả tin mô tả ban đầu); chỉnh ở `rules.ts`.
- **Phạm vi truy vấn**: SQL của module phải tĩnh nên KHÔNG có hàm phạm vi dùng chung; phạm vi được quyết định ở một tập nhỏ, liệt kê đủ trong chú thích đầu nhóm câu lệnh của `repository.ts`: `LIST_MINE` (lọc `submitter_id`), `LIST_QUEUE` (không lọc chủ, dựa vào route `access: "admin"`), `BADGE` (đếm theo người xem), và các route đọc theo id (`GET`, `messages`) qua `canRead()` trong `index.ts`.
- `context.appVersion` phải là **mã bản dựng thật**. Hiện `__BUILD_ID__` chỉ được esbuild nhúng vào service worker (`build:web`, `sw.ts`), chưa vào các bundle trang: thi công phải thêm `--define:__BUILD_ID__` cho bước bundle trang (hoặc lấy từ `CACHE_VERSION`); nếu chưa làm được thì bỏ khoá `appVersion` khỏi v1 chứ không ghi giá trị giả.
- Không lưu nội dung đơn, **chỉ mã đơn** (`orderCode`, chuỗi thường; v1 giao diện chưa tự điền, chưa đọc `v_ord_order_label` nên không có cạnh `feedback → orders`).
- `context`: **không đáng tin**. Server chỉ nhận bộ khoá cố định (`path`, `orderCode`, `device`, `standalone`, `appVersion`), cắt độ dài, bỏ khoá lạ. Giao diện dựng bằng `h()`, không `innerHTML`.
- Nhật ký: dùng `audit_log` chung (`order_id` NULL, `target_type = 'feedback'`, `target_id` = id ticket). Thêm nhóm `feedback` và hành động `feedback_created`, `feedback_replied`, `feedback_status_changed`, `feedback_assigned` vào `src/shared/audit-actions.ts`; không cần migration.
- DTO khai ở `src/shared/contracts.ts`. Module đăng ký trong `src/index.ts`; ghi bảng chỉ qua module chủ; `repository.ts` đi qua `defineSql` (ranh giới SQL nghiêm, như `parties`).

## Giao diện

- Mục "Góp ý" trong menu chung (`web/shell.ts`, kèm chấm đỏ) và ở tab Tôi mở trang `/feedback` (v1 dùng trang, bảng trượt dưới để sau): loại, tiêu đề, mô tả, cùng dòng liệt kê những gì sẽ được đính kèm tự động. Client sinh `client_request_id` một lần khi mở form và giữ nguyên khi bấm lại/thử lại (PWA, mạng đảo yếu), nút Gửi bị khoá khi đang gửi.
- Trang `public/feedback.html` + `web/feedback.ts` (thêm vào `build:web`): "Yêu cầu của tôi" và luồng trả lời; ADMIN có tab "Hàng đợi" (lọc, đổi trạng thái, ghi chú nội bộ). Chấm đỏ trên menu.
- Tiếng Việt có dấu đầy đủ; bám khuôn `web/parties.ts` cho danh sách/chi tiết.

## Email

- Kích hoạt khi tạo yêu cầu mới và khi **người gửi** trả lời (không gửi khi admin tự trả lời).
- Mọi email đi qua MỘT hàm `notifyAdmins(event)` trong module `feedback`; chỉ bên trong đó mới gọi `env.EMAIL`. Gửi **sau** khi D1 ghi xong, qua `ctx.exec.waitUntil` (`ctx.exec` có ở `src/shared/router.ts`), nên `notifyAdmins` có `try/catch` riêng và **tự ghi kết quả**: thành công → đặt `notified_at`; lỗi → để NULL. Lỗi gửi **không** làm hỏng yêu cầu; hàng đợi admin hiện "chưa gửi được mail" cho ticket có `notified_at` NULL để admin biết thư rơi. Retry bằng Cron là việc sau v1.
- Nội dung: loại, tiêu đề, tên người gửi, đoạn đầu mô tả (cắt), đường dẫn vào app. Không nhúng dữ liệu người dùng vào tiêu đề dạng có thể chèn header (làm sạch xuống dòng).
- Cấu hình: binding `EMAIL` (wrangler), biến `FEEDBACK_NOTIFY_EMAIL`, địa chỉ gửi trên tên miền đã xác minh.
- **Việc chủ dự án làm trước khi deploy**: bật Email Service trên tài khoản Cloudflare, xác minh tên miền gửi thư (SPF/DKIM; tài liệu chưa nêu rõ, kiểm khi thi công), đặt địa chỉ nhận.

## Kiểm thử

- `rules.test.ts` (luật thuần): kiểm đầu vào, lọc `context`, **bảng chuyển trạng thái** (mọi cặp hợp lệ và không hợp lệ), mở lại khi trả lời, tính chấm đỏ.
- e2e (`tests/e2e/`): trạng thái tuỳ ý bị `409`; trần tần suất giữ được khi gửi song song (cả tạo mới và trả lời); gửi lại cùng `client_request_id` không tạo ticket/email thứ hai; người A không đọc/trả lời được yêu cầu của B; người gửi không thấy `internal`; chỉ admin đổi trạng thái; email dùng bản giả (mock) và lỗi gửi không làm hỏng yêu cầu.
- `npm test` phải xanh, gồm `architecture.test.ts` (tiền tố bảng, sổ dữ liệu `docs/data-dictionary.json` + `npm run dict`, ranh giới SQL, cột kiểm toán); `npm run typecheck`; `scripts/audit-invariants.mjs`.
- Sổ dữ liệu cập nhật: bảng `fbk_*`, module chủ `feedback`, cạnh đọc tới `v_stf_staff_label`/`v_ord_order_label`.

## Đường lên Ticket

Đã có thread, trạng thái, người xử lý, nhật ký. Còn thiếu và thêm dần, không đổi cấu trúc: ưu tiên, SLA, ảnh (`fbk_attachment` + R2), gán nhóm, email cho người gửi, kênh vào từ email/Zalo, retry gửi thư bằng Cron, `duplicate_of` (gộp yêu cầu trùng; **không làm ở v1**).

## Rủi ro và điểm mở

- Email Service còn **beta**: chấp nhận vì email chỉ là thông báo phụ; nếu bị đổi/ngừng thì đổi nhà cung cấp mà không đụng dữ liệu.
- Người dùng gõ nội dung nhạy cảm (SĐT khách…) vào yêu cầu: chỉ admin và chính họ thấy; email cắt đoạn đầu. Nếu chủ dự án muốn email không kèm nội dung, chỉ để tiêu đề + đường dẫn, đổi ở một chỗ.
- Trần tần suất/giờ và độ dài chỉ là đề xuất, chốt lúc lập kế hoạch.
- **Tenant**: repo chưa có khái niệm tenant nên **không** thêm `tenant_id` bây giờ. `fbk_*` sẽ nhận `tenant_id` cùng đợt với các module khác; phạm vi được quyết định ở một tập nhỏ, đã liệt kê (`LIST_MINE`, `LIST_QUEUE` + route admin, `BADGE`, `canRead()` ở các route đọc theo id), nên đợt đó phải thêm điều kiện tenant vào từng chỗ ấy.
- **Thời hạn lưu giữ** ticket đã đóng (và tin nhắn) chưa chốt: cần quyết định trước khi có dữ liệu nhiều (giữ vô hạn, hay ẩn/xoá sau N tháng). Vì dữ liệu có thể chứa thông tin khách do người dùng gõ vào, quyết định này cần chủ dự án.
