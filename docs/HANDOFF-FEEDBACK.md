# Bàn giao: Góp ý / Báo lỗi → Hỗ trợ (Vé hỗ trợ theo nhóm)

Spec: `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md` · Kế hoạch: `docs/superpowers/plans/2026-09-21-gop-y-bao-loi.md`.
Vé hỗ trợ đợt 1 (nhóm hỗ trợ, quyền theo nhóm): ADR-0119 · đặc tả `docs/superpowers/specs/2026-10-14-ve-ho-tro-design.md` · kế hoạch `docs/superpowers/plans/2026-10-15-ve-ho-tro-dot-1.md`.

## Vé hỗ trợ đợt 1 (2026-10-15, nhánh `claude/support-ticket-module-eb6445`, CHƯA gộp, CHƯA lên production)
- **Làm gì:** phiếu thuộc một nhóm hỗ trợ (gieo Kỹ thuật, Kế toán, Nhân sự, Điều hành; phiếu cũ vào Kỹ thuật). Người gửi chọn nhóm nhận; thành viên nhóm có tab «Hàng đợi nhóm» (lọc Tất cả / Của tôi / Chưa ai nhận, thống kê tuần riêng nhóm), «Nhận việc», đổi trạng thái; Trưởng nhóm thêm giao việc (qua `PATCH …/xu-ly`, chưa có ô chọn trên giao diện) và chuyển nhóm; Toàn quyền thấy và quản lý tất cả (tab «Quản lý nhóm»). Menu đổi nhãn «Góp ý / Báo lỗi» → «Hỗ trợ».
- **Quyền:** một hàm thuần `quyenPhieu` (`src/modules/feedback/quyen.ts`) cho mọi route theo id; tư cách thành viên là dữ liệu (`fbk_team_member`), không phải ô `MATRIX`. Ô mới duy nhất `feedback.team.manage` (chỉ Toàn quyền). Quản trị / Nhân sự không có đường tắt. Người gửi không xử lý phiếu mình và không thấy ghi chú nội bộ. Tài khoản bên ngoài chỉ gửi Kỹ thuật, không làm thành viên. Chi tiết route: `docs/SYSTEM-DESIGN.md` §7; ô quyền: §8; bảng: §5; lệch có chủ ý so với đặc tả: §16.
- **Migration:** `0100_ve_ho_tro_nhom.sql` (chỉ thêm). `admin_seen_at` thành cột chết — mốc đã xem nay riêng từng người (`fbk_ticket_read`).
- **Tuyến cũ giữ tới lần phát hành sau** (expand–contract, cho bản web cũ trong bộ nhớ đệm): `GET /api/feedback`, `PATCH /api/feedback/:id` (chỉ Toàn quyền). Thẻ «Hộp thư» Trang chủ còn đọc tuyến cũ nên chỉ Toàn quyền.
- **Email:** vẫn một địa chỉ chung `FEEDBACK_NOTIFY_EMAIL`, tiêu đề có tên nhóm; nhóm nhạy cảm không kèm tiêu đề / nội dung / tên người gửi. Không cần secret mới.
- **Kiểm:** bài thuần `quyen.test.ts`, bài đường thật `ve-ho-tro-route.test.ts`, e2e khối cuối `tests/e2e/feedback.mjs`, kịch bản Chrome `docs/evidence/2026-10-15-ve-ho-tro/kich-ban/ve-ho-tro-smoke.mjs`; hàng rào ở `docs/SO-HANG-RAO.md` (dòng `quyenPhieu`, dòng thư nhóm nhạy cảm).
- **Triển khai:** có migration + mã ⇒ cần `npm run trien-khai` sau khi gộp (không cần `wrangler secret`). Hoàn tác: `wrangler rollback` về bản trước — migration chỉ thêm, mã cũ chạy nguyên vẹn (phiếu tạo bằng bản mới ở nhóm khác Kỹ thuật vẫn hiện trong hàng đợi cũ của Toàn quyền vì tuyến cũ không lọc nhóm).
- **Nợ đợt sau:** `docs/BACKLOG.md` mục «Vé hỗ trợ — nợ đợt 1».

## Trạng thái mã (bản gốc Góp ý / Báo lỗi, 2026-09-21)
- Nhánh `worktree-feedback-spec`; Task 1–9 đã commit (từ `2cf5563` kế hoạch đến `c27eb4a`), Task 10 (binding email + tài liệu) là commit cuối.
- **2026-09-21: đã GỘP `origin/main` (bản v1.0 + chế độ bảo trì) vào nhánh này** bằng một commit gộp. Mọi xung đột đều cộng dồn hai phía (ma trận quyền, nhóm/hành động nhật ký, mảng `modules`, `ALLOWED_EDGES`/`STRICT`/`TABLE_PREFIX`, sổ dữ liệu, danh sách e2e, `web/account.ts`, `web/shell.ts`). Sau khi gộp: `npm test` 403/403, `npm run typecheck` 0 lỗi, `npm run build:web` sinh `public/js/feedback.js`.
- **Hai tệp migration cùng tiền tố `0016`:** `0016_feedback.sql` (nhánh này) và `0016_maintenance.sql` (đến từ `main`, đã áp production). Đây là điều CHẤP NHẬN ĐƯỢC: wrangler theo dõi migration theo **tên đầy đủ**, không theo số; thứ tự áp là thứ tự tên nên `0016_feedback` đi trước `0016_maintenance`. Hai tệp độc lập (bảng `fbk_*` ↔ `mnt_setting`), dựng schema theo thứ tự nào cũng chạy. **KHÔNG đổi tên `0016_feedback.sql`** — chủ dự án cho biết tệp này đã áp trên production đúng tên đó. Từ đó đã thêm `0017_order_status_audit_guards.sql` (trigger bảo vệ trạng thái đơn + nhật ký chỉ-thêm, đối chiếu Oracle TCA) và `0018_orders_booker_party.sql` (cột người đặt trên đơn, N2 lát 1); migration kế tiếp (B5 `staff_party_required`) lấy số `0019`.
- `npm test`: 251/251 đạt trước khi gộp (403/403 sau khi gộp). `npm run typecheck`: 0 lỗi. `npm run test:e2e`: 11/11 kịch bản xanh trước khi gộp, gồm `feedback` và `audit-invariants` (D1 local, `--strict`); sau khi gộp danh sách là 15 kịch bản, `feedback` xếp TRƯỚC `maintenance` vì cổng bảo trì của router chặn mọi route cần đăng nhập. `npx wrangler deploy --dry-run`: hợp lệ, liệt kê `env.EMAIL` (Send Email).
- `wrangler.jsonc` khai `"send_email": [{ "name": "EMAIL" }]` (mẫu tài liệu Email Service), CỐ Ý không có `remote`: tài liệu nói `wrangler dev` không dùng remote binding thì chạy bộ mô phỏng cục bộ, nên `npm run dev` và e2e chạy offline, không cần đăng nhập. (Mẫu get-started dùng `remote: true`, khi đó dev/e2e cần đăng nhập Cloudflare + mạng.) Muốn thử gửi thư thật khi dev: tạm thêm `"remote": true` (cần đăng nhập), không commit. Chưa kiểm chứng: `remote` có ảnh hưởng gì khi deploy (tài liệu không nói); bộ mô phỏng cục bộ chỉ được tài liệu nhắc gián tiếp, e2e xanh vì không gửi thư (chưa có secret nên email tự tắt).
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
3. `npm run db:migrate:remote` — chỉ THÊM bảng `fbk_*` (mã cũ chạy nguyên vẹn nên áp migration TRƯỚC deploy là an toàn). Kiểm danh sách migration chưa áp có ĐÚNG là `0016_feedback.sql` (không kéo theo file B5 nào; `0016_maintenance.sql` đã áp rồi — wrangler phân biệt hai tệp cùng số 0016 theo tên đầy đủ). Nếu wrangler báo KHÔNG còn migration nào chưa áp thì `0016_feedback` đã nằm trên production, bỏ qua bước này.
4. `npx wrangler deploy`. Nếu `wrangler deploy` báo lỗi vì binding `send_email`, gỡ khối `send_email` khỏi wrangler.jsonc rồi deploy lại; email tắt, yêu cầu vẫn lưu và hàng đợi báo "chưa gửi được email". CHƯA KIỂM CHỨNG (tài liệu không nói) việc deploy có thất bại khi tài khoản chưa bật Email Service / chưa xác minh tên miền hay không.
5. Kiểm sau deploy: gửi một yêu cầu thật bằng tài khoản thường; kiểm email đến hộp thư admin và hàng đợi không báo "chưa gửi được email"; nếu email không đến: xem log Worker (`console.error "Gửi email báo admin thất bại"`), sửa cấu hình rồi thử lại — yêu cầu không mất.
6. Chạy `node scripts/audit-invariants.mjs --remote` (chỉ đọc).

## Hoàn tác
Bảng `fbk_*` mới, không ai khác đọc: gỡ bản triển khai bằng `wrangler rollback` là đủ; KHÔNG cần xoá bảng (mã cũ không đụng tới).

## Điểm mở
- Thời hạn lưu giữ yêu cầu đã đóng (dữ liệu có thể chứa thông tin khách do người dùng gõ).
- Thống kê theo tuần dùng `strftime('%Y-%W')`: tách sai ở ranh giới năm (tuần chung giữa hai năm bị chia đôi).
- Việc sau v1: ảnh (R2), email cho người gửi, retry gửi thư bằng Cron, `duplicate_of`, ưu tiên/SLA, `tenant_id`.
