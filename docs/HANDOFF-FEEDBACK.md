# Bàn giao: Góp ý / Báo lỗi → Hỗ trợ (Vé hỗ trợ theo nhóm)

Spec: `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md` · Kế hoạch: `docs/superpowers/plans/2026-09-21-gop-y-bao-loi.md`.
Vé hỗ trợ đợt 1 (nhóm hỗ trợ, quyền theo nhóm): ADR-0119 · đặc tả `docs/superpowers/specs/2026-10-14-ve-ho-tro-design.md` · kế hoạch `docs/superpowers/plans/2026-10-15-ve-ho-tro-dot-1.md`.
Vé hỗ trợ đợt 2a (trò chuyện tự làm mới, mức ưu tiên, đơn liên quan, giao việc): ADR-0127 · đặc tả `docs/superpowers/specs/2026-10-16-ve-ho-tro-dot-2a-design.md` · kế hoạch `docs/superpowers/plans/2026-10-16-ve-ho-tro-dot-2a.md` · nhật ký thi công `docs/superpowers/plans/2026-10-16-ve-ho-tro-dot-2a-thi-cong-nhat-ky.md`.

Tệp kèm tin vé hỗ trợ: ADR-0144 · đặc tả `docs/superpowers/specs/2026-10-28-dinh-kem-ve-ho-tro/README.md` (kèm trang ghép) · kế hoạch `docs/superpowers/plans/2026-10-28-dinh-kem-ve-ho-tro.md`.

## Tệp kèm tin vé hỗ trợ (2026-10-28, nhánh `claude/modest-sanderson-b148ce`, CHƯA gộp, CHƯA lên production)
- **Làm gì:** nút «Đính kèm» ở hộp «Gửi yêu cầu» và ô trả lời; tối đa 5 tệp, tổng 10 MB một tin, 20 tệp / giờ / tài khoản; ảnh JPG, PNG, HEIC và PDF. Ảnh được vẽ lại trên máy người gửi (cạnh dài 2000, JPG — bỏ toạ độ chụp); HEIC trình duyệt không mở được và PDF gửi nguyên. Mọi tài khoản gửi được tin thì đính kèm được (chủ dự án 28/10), kể cả Đối tác và Tài xế đối tác (vẫn chỉ gửi nhóm Kỹ thuật). Ai đọc được tin thì xem được tệp. Toàn quyền gỡ được tệp gửi nhầm.
- **Tuyến** (chi tiết `docs/SYSTEM-DESIGN.md` §7): `POST /api/feedback` và `POST /api/feedback/:id/messages` nhận thêm `tep`, phản hồi 201 kèm `tepLoi`; mới: `GET /api/feedback/:id/tep/:tid`, `POST /api/feedback/:id/tep/:tid/go`, `GET /api/feedback/tep-cho-xoa`, `POST /api/feedback/tep-cho-xoa/chay-lai`.
- **Dữ liệu và kho:** migration `0124_ve_ho_tro_tep.sql` (bảng `fbk_attachment`); kho R2 MỚI `tourdao-sales-ho-tro` (binding `HO_TRO`). Công thức sửa: `docs/CHANGE-GUIDE.md` z29.
- **Kiểm:** bài `src/modules/feedback/{kho-tep,tep-route,tep-xem-route,rules}.test.ts`, `src/shared/tep-{dinh-kem,hien-thi}.test.ts`, `src/migrations-ve-ho-tro-tep.test.ts`, hàng rào `src/kho-tep-ho-tro.test.ts`; e2e `npm run test:e2e -- feedback ve-ho-tro-tep`; Chrome `ho-tro-smoke.mjs` bước T1, T2. Dòng hàng rào ở `docs/SO-HANG-RAO.md` (các dòng ADR-0144).
- **Kiểm tay trên iPhone thật — CHƯA làm:** (1) chọn ảnh từ Thư viện (ảnh HEIC của iPhone) rồi gửi → ảnh hiện xem trước; (2) chụp ảnh mới bằng máy ảnh ngay trong hộp chọn; (3) chọn PDF từ ứng dụng Tệp, bấm «Tải về» trong Nền tảng đã cài; (4) mạng yếu: hiện «Đang gửi tệp…», tắt mạng giữa chừng rồi bấm Gửi lại → chỉ MỘT tin.
- **Việc của chủ:** tạo kho TRƯỚC `npm run trien-khai` (lệnh ở `docs/HANDOFF-N1.md`, mục «ĐANG CHỜ PHÁT HÀNH 2.40 (số tạm) — Tệp kèm vé hỗ trợ»), rồi `npm run day-len` và `npm run trien-khai` (có migration ⇒ cần triển khai).
- **Nợ:** `docs/BACKLOG.md` mục 52 (`BL-VE-TEP-…`).

## Vé hỗ trợ đợt 2a (2026-10-17, nhánh `claude/support-ticket-module-eb6445`, CHƯA gộp, CHƯA lên production)
- **Làm gì:** khung trao đổi dạng bong bóng tự hiện tin mới (gọi ngầm 5 giây một lần khi tab đang mở, 30 giây khi phiếu đã đóng, dừng khi tab ẩn); người xử lý đặt mức ưu tiên Thường / Cao / Khẩn (hàng đợi nhóm và hàng đợi Toàn quyền xếp Khẩn → Cao → Thường); người gửi gắn được MỘT đơn do chính mình lập lúc gửi (mã đơn chụp vào phiếu); Trưởng nhóm / Toàn quyền có nút «Giao cho người khác» với danh sách thành viên nhóm.
- **Tuyến mới** (cổng `staff`, khai trước `GET /api/feedback/:id`; chi tiết `docs/SYSTEM-DESIGN.md` §7):
  - `GET /api/feedback/:id/messages?since=<ISO>` — chỉ đọc, tin `created_at > since` (tối đa 100, cũ trước mới sau) + đầu phiếu gọn; cùng quyền đọc và lọc ghi chú nội bộ như tuyến chi tiết; **không ghi mốc đã xem**; người không đọc được 404 (trước khi xét `since`), thiếu / sai `since` 400. Giao diện lấy mốc từ tin máy chủ đã trả, lùi 30 giây, bỏ trùng theo id; nhận đủ 100 tin thì gọi tiếp ngay với mốc là tin cuối (không lùi).
  - `GET /api/feedback/my-orders` — tối đa 30 đơn gần nhất do người gọi lập (`id`, `orderCode`, `status`); cần ô `order.view` với chính mình (Nhân sự, tài xế ⇒ 403).
  - `GET /api/feedback/teams/:id/members?ticket=<id>` — thành viên đang hiệu lực, còn hoạt động, KHÔNG phải tài khoản bên ngoài; `?ticket=` loại người gửi phiếu đó nếu phiếu thuộc đúng nhóm này. Chỉ người có `quyenPhieu.giaoViecChoNguoiKhac` (Trưởng nhóm của nhóm, Toàn quyền); khác ⇒ 403.
- **Tuyến đổi:** `PATCH /api/feedback/:id/xu-ly` nhận thêm `priority` (nhật ký `feedback_priority_changed`, chỉ mã phiếu + mức cũ → mới); `POST /api/feedback` nhận `orderId` tuỳ chọn (đơn người khác, đơn không có, sai dạng, không có quyền xem đơn ⇒ CÙNG một câu 400) và bỏ qua `priority` của người gửi. Giao việc (cả `/xu-ly` lẫn tuyến cũ của Toàn quyền) cho tài khoản bên ngoài còn dòng thành viên cũ ⇒ 400 (vá lỗ đợt 1, Ruling R6).
- **Migration:** `0106_ve_ho_tro_2a.sql` (ADR-0127 ghi dự kiến 0104; số thật lấy lúc thi công): ba cột mới ở `fbk_ticket` — `priority` (mặc định `NORMAL`), `order_id`, `order_code` (cùng có hoặc cùng trống). Chỉ thêm cột; mã cũ chạy nguyên vẹn.
- **Cạnh mới** `feedback → orders`: chỉ đọc ba view `v_ord_order_owner`, `v_ord_order_label`, `v_ord_order_state`, không import `../orders` (hàng rào ở `src/architecture.test.ts`).
- **Kiểm:** bài đường thật `ve-ho-tro-route.test.ts`, bài thuần `rules.test.ts` + `src/shared/ve-ho-tro-hien-thi.test.ts`, bài migration `src/migrations-ve-ho-tro-2a.test.ts`, e2e khối «Vé hỗ trợ đợt 2a» cuối `tests/e2e/feedback.mjs`, kịch bản Chrome `docs/evidence/2026-10-16-ve-ho-tro-2a/kich-ban/ve-ho-tro-2a-smoke.mjs`; hàng rào ở `docs/SO-HANG-RAO.md` (các dòng «Vé hỗ trợ đợt 2a»).
- **Việc của chủ:** gộp bằng `npm run day-len` rồi `npm run trien-khai` (có migration ⇒ cần triển khai; không cần secret mới). Hoàn tác: `wrangler rollback` — ba cột mới thừa ra không làm hỏng mã cũ. Quyết định còn chờ: danh sách chọn đơn có cả đơn nháp / đã huỷ; vá phiếu kẹt cũ giao cho tài khoản bên ngoài (đụng R6) — `docs/BACKLOG.md` mục «Vé hỗ trợ — nợ đợt 1».
- **Nợ đợt sau:** đợt 2b («Chờ người gửi bổ sung», loại «Yêu cầu hỗ trợ», thông báo đẩy cho thành viên) và các dòng `BL-VE-…` ở `docs/BACKLOG.md`.

## Vé hỗ trợ đợt 1 (2026-10-15; đã vào bản chính và lên production ở bản 2.1 — `main` có `0100_ve_ho_tro_nhom.sql`, production báo 2.9, kiểm 2026-10-17)
- **Làm gì:** phiếu thuộc một nhóm hỗ trợ (gieo Kỹ thuật, Kế toán, Nhân sự, Điều hành; phiếu cũ vào Kỹ thuật). Người gửi chọn nhóm nhận; thành viên nhóm có tab «Hàng đợi nhóm» (lọc Tất cả / Của tôi / Chưa ai nhận, thống kê tuần riêng nhóm), «Nhận việc», đổi trạng thái; Trưởng nhóm thêm giao việc (qua `PATCH …/xu-ly`; ô chọn «Giao cho người khác» có từ đợt 2a) và chuyển nhóm; Toàn quyền thấy và quản lý tất cả (tab «Quản lý nhóm»). Menu đổi nhãn «Góp ý / Báo lỗi» → «Hỗ trợ».
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
- Việc sau v1: ảnh (R2), email cho người gửi, retry gửi thư bằng Cron, `duplicate_of`, hạn xử lý (SLA), `tenant_id`. (Mức ưu tiên: có từ đợt 2a.)
