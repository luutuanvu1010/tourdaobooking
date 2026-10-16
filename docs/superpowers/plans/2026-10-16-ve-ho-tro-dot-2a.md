# Vé hỗ trợ đợt 2a (trò chuyện tự làm mới, mức ưu tiên, mã đơn, giao việc) — Kế hoạch thi công

> **Cho người thi công:** dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans`, làm từng việc, đánh dấu `- [ ]`. **Người thi công không tự nghiệm thu** (Hiến pháp N8): xong Việc 6 phải có người kiểm độc lập chỉ đọc cho cả nhánh (việc lớn: dữ liệu, quyền, cạnh kiến trúc).

**Mục tiêu:** khung trả lời kiểu bong bóng tự làm mới, người xử lý đặt mức ưu tiên, người gửi gắn mã đơn của mình vào phiếu, Trưởng nhóm giao việc cho thành viên bằng ô chọn.

**Kiến trúc:** mở rộng module `feedback`, không thêm module. Ba cột mới ở `fbk_ticket`; ba tuyến mới cổng `staff`; một cạnh kiến trúc mới `feedback → orders` chỉ đọc ba view có sẵn. `quyenPhieu` không đổi chữ ký.

**Công nghệ:** TypeScript, SQLite/D1, esbuild, `node --test`, khung thử `tests/audit/harness.mjs` (`world()`, `seedStaff`). Không dependency runtime mới.

**Đặc tả:** `docs/superpowers/specs/2026-10-16-ve-ho-tro-dot-2a-design.md` (bản 2). **ADR:** `docs/adr/ADR-0127-ve-ho-tro-dot-2a-tro-chuyen-uu-tien-ma-don-giao-viec.md` (accepted, chỉ đợt 2a). **Nền:** đợt 1 (`docs/superpowers/plans/2026-10-15-ve-ho-tro-dot-1.md`, ADR-0119) đã lên production; đọc `docs/HANDOFF-FEEDBACK.md` trước khi bắt đầu.

## Ràng buộc chung (áp cho mọi việc)

- Giao diện, thông báo lỗi, commit, tài liệu: **tiếng Việt CÓ DẤU**; gọi hệ thống là «Nền tảng».
- Không `innerHTML` (dựng bằng `h()`); ô gõ 16px; giá trị CSS qua token.
- SQL chỉ qua `defineSql("feedback", …)` trong `src/modules/feedback/repository.ts`; **không tạo tệp mới có `defineSql(`**. Đọc đơn của `orders` **chỉ qua view** `v_ord_order_owner`, `v_ord_order_label`, `v_ord_order_state`; không import `src/modules/orders/`.
- Nhật ký (`audit`) không ghi nội dung tin, SĐT, email, tiêu đề phiếu nhóm nhạy cảm, mã đơn.
- Migration chỉ THÊM; không sửa tệp đã có. Số = số lớn nhất trên **mọi nhánh** + 1 (lúc soạn dự kiến `0104`; kiểm lại ở Việc 1: `git ls-tree --name-only <nhánh> migrations/`).
- Mỗi lệnh ghi một `db.batch` theo thứ tự cổng → sự kiện → nhật ký → mốc đã xem; **không ghi hai lần trong một route** (lớp chống ghi trùng ADR-0094); tuyến GET mới không ghi gì.
- Tuyến tĩnh mới (`my-orders`, `teams/:id/members`, `:id/messages`) khai **trước** `GET /api/feedback/:id`.
- Mọi route cổng `staff` kể cả GET phải gọi `can(...)` hoặc `quyenPhieu(...)` trong thân và DÙNG kết quả (bài `route-write-guard.test.ts` luật 1c). Không thêm tên vào `GUARDS`/`TU_PHUC_VU_STAFF` (đó là nới hàng rào).
- AI không chạy: `git push`, merge `main`, `wrangler deploy`, migration/ghi D1 remote. Cuối kế hoạch chỉ đưa **nguyên lệnh** cho chủ.
- Commit nhỏ, tiêu đề tiếng Việt nói việc, thân nói vì sao, kết thúc `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Đổi hành vi: viết bài **đỏ trước, xanh sau**; `typecheck` không phủ `*.test.ts` nên tự đọc lại.

## Review Focus (mỗi dòng có bài ở việc ghi trong ngoặc)

1. Tuyến làm mới không mất tin khi hai lệnh ghi chồng nhau (tin ghi xong sau mang dấu giờ sớm hơn): bài ca lệch thứ tự (Việc 4).
2. Tuyến làm mới KHÔNG ghi `fbk_ticket_read` (đếm hàng trước/sau) và người gửi không bao giờ thấy ghi chú nội bộ qua nó (Việc 4).
3. Gắn đơn của người khác và gắn đơn không tồn tại trả **cùng một** câu lỗi (không dò đơn) (Việc 3).
4. Tài khoản bị rút quyền xem đơn không còn lấy được `my-orders` (Việc 3).
5. Người gửi gửi kèm `priority` khi tạo phiếu: bị bỏ qua, phiếu vẫn `NORMAL` (Việc 2).
6. Danh sách thành viên để giao không có người gửi phiếu, tài khoản bị khoá, tài khoản bên ngoài còn dòng cũ (Việc 4).
7. Người ngoài nhóm gọi `…/messages` hoặc `…/members`: 404/403 và không lộ gì (Việc 4).

---

### Việc 1: Migration, hằng chung, DTO, cạnh kiến trúc, từ điển

**Files:** Create `migrations/0104_ve_ho_tro_2a.sql` (số thật kiểm lại); `src/migrations-ve-ho-tro-2a.test.ts`. Modify `src/shared/ve-ho-tro.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/architecture.test.ts` (`ALLOWED_EDGES`: `feedback: ["staff", "audit", "orders"]` kèm chú thích ADR-0127), `docs/data-dictionary.json` + `npm run dict`.

**Produces:** cột `fbk_ticket.priority TEXT NOT NULL DEFAULT 'NORMAL'`, `order_id TEXT`, `order_code TEXT`; hằng `PRIORITIES = ["NORMAL","HIGH","URGENT"]`, `PRIORITY_NAME`, `isPriority()` trong `ve-ho-tro.ts`; DTO: `FeedbackTicketDto` thêm `priority`, `orderId`, `orderCode`; `FeedbackMessagesSinceResponse { messages: FeedbackMessageDto[]; ticket: { status; assigneeId; assigneeName; priority; teamId } }`; `FeedbackMembersResponse { members: { staffId; name; role: TeamRole }[] }`; `FeedbackMyOrdersResponse { orders: { id; orderCode; status }[] }`; `FeedbackCreateRequest` thêm `orderId?: string`; `FeedbackPatchRequest` (xu-ly) thêm `priority?`; hành động nhật ký `feedback_priority_changed` (nhãn tiếng Việt).

- [ ] Bài **đỏ** trước (`migrations-ve-ho-tro-2a.test.ts`, khuôn `migrations-ve-ho-tro.test.ts` của đợt 1): sau migration phiếu cũ có `priority='NORMAL'`, `order_id`/`order_code` NULL, chèn `order_id` mà `order_code` NULL → bị `CHECK` từ chối, chèn cả hai → được; chèn bằng câu `INSERT` của mã cũ (không nêu cột mới) vẫn thành công (mã cũ chạy trên cấu trúc mới); không có `CHECK` liệt kê trên `priority`.
- [ ] Viết migration: **ba câu `ALTER TABLE … ADD COLUMN` riêng lẻ**, thêm `order_id` trước, `order_code` sau cùng kèm `CHECK ((order_id IS NULL) = (order_code IS NULL))`. Không view mới, không chỉ mục mới.
- [ ] `docs/data-dictionary.json`: mô tả ba cột; khai `logicalRefs` cho `order_id` (khuôn các tham chiếu logic khác, R-P19); `npm run dict`.
- [ ] Thêm hằng/DTO/hành động nhật ký như ở **Produces**; sửa mọi bảng `Record<…>` mà typecheck bắt.
- [ ] Mở cạnh ở `ALLOWED_EDGES`; chạy `node --test src/architecture.test.ts src/audit-actions.test.ts` và sửa đúng chỗ đỏ.
- [ ] `npm run typecheck`, các bài vừa sửa xanh; commit.

### Việc 2: Mức ưu tiên (luật, ghi, sắp hàng đợi)

**Files:** Modify `src/modules/feedback/rules.ts` (+ `rules.test.ts`), `repository.ts` (câu `PATCH_TICKET`, `COLS`, các câu hàng đợi `LIST_QUEUE_TEAM`/`LIST_QUEUE`), `index.ts` (route `PATCH /api/feedback/:id/xu-ly` và `POST /api/feedback`), `src/modules/feedback/ve-ho-tro-route.test.ts`.

- [ ] Bài thuần **đỏ**: `validatePatchInput` nhận thân chỉ có `priority` hợp lệ (không còn «Không có thay đổi nào để lưu»); từ chối giá trị lạ; `validateTicketInput` bỏ qua `priority` do người gửi gửi.
- [ ] Bài đường thật **đỏ**: thành viên nhóm đặt `HIGH` → 200, DTO `priority`, đúng một dòng nhật ký `feedback_priority_changed` (mã phiếu, mức cũ → mới, không tiêu đề); người gửi (không phải người xử lý) → 403; người ngoài nhóm → 404; phiếu nhóm nhạy cảm vẫn không lộ tiêu đề ở nhật ký; hàng đợi nhóm trả URGENT trước HIGH trước NORMAL rồi tới `last_activity_at DESC` (`ORDER BY CASE priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 ELSE 2 END`, **không** sắp theo chữ).
- [ ] Sửa `PATCH_TICKET` nhận `priority` (cùng khoá lạc quan trạng thái + `team_id` như đợt 1); sửa câu chọn hành động nhật ký ở route để thân chỉ có `priority` ghi `feedback_priority_changed`, không ghi nhầm `feedback_assigned`; tuyến cũ `PATCH /api/feedback/:id` dùng chung câu nên chấp nhận trường này (chỉ Toàn quyền).
- [ ] `POST /api/feedback`: bỏ qua `priority` của người gửi; phiếu mới luôn `NORMAL`.
- [ ] Chạy `node --test src/modules/feedback/` và `src/route-write-guard.test.ts`; commit.

### Việc 3: Gắn mã đơn liên quan (danh sách chọn + kiểm lúc gửi)

**Files:** Modify `repository.ts` (hai câu `defineSql`: danh sách đơn của một người, kiểm một đơn của một người — đọc các view `v_ord_order_owner`, `v_ord_order_label`, `v_ord_order_state`), `index.ts` (`GET /api/feedback/my-orders`; `POST /api/feedback` nhận `orderId`), `rules.ts` (`validateTicketInput` nhận `orderId` tuỳ chọn), `src/shared/ve-ho-tro-hien-thi.ts` nếu cần nhãn, `src/route-access.test.ts`, `src/tai-xe-cong.test.ts`, `src/modules/feedback/ve-ho-tro-route.test.ts`, `src/architecture.test.ts` (nếu bài EXPLAIN ranh giới đòi).

- [ ] Xác định **tên ô quyền xem đơn của chính mình** trong `MATRIX` (`src/shared/permissions.ts`, đọc `can(`); dùng đúng ô đó. KHÔNG thêm ô, KHÔNG thêm `TU_PHUC_VU_STAFF`.
- [ ] Bài đường thật **đỏ**: người gửi có 2 đơn do mình lập và 1 đơn của người khác → `my-orders` chỉ trả 2 đơn của mình, sắp `order_code DESC`, tối đa 30, các khoá chỉ `id`, `orderCode`, `status` (không có tiền/khách/SĐT); `status` trả cho giao diện là mã, nhãn tiếng Việt lấy từ `trangThaiHienThi` ở lớp giao diện; tài khoản bị rút quyền xem đơn → `my-orders` bị từ chối; Đối tác chỉ thấy đơn họ lập; gửi phiếu kèm `orderId` hợp lệ → phiếu có `orderId` + `orderCode` chụp; gửi kèm đơn của người khác và kèm id không tồn tại → **cùng** mã 400 và **cùng** câu lỗi, không tạo phiếu; DTO phiếu trả `orderCode` cho người gửi và người xử lý nhóm.
- [ ] Viết hai câu SQL trong `repository.ts` + hàm dùng chung (một nơi duy nhất cho `my-orders` và kiểm lúc gửi); route `my-orders` gọi `can(...)` và dùng kết quả; khai route trước `/:id`.
- [ ] Cập nhật `route-access.test.ts` (bảng + tổng số route), `tai-xe-cong.test.ts` (`BANG_STAFF`).
- [ ] `node --test` các bài trên + `src/architecture.test.ts`; commit.

### Việc 4: Tuyến làm mới và tuyến thành viên (hai tuyến chỉ đọc)

**Files:** Modify `repository.ts`, `index.ts`, `quyen.ts` chỉ nếu cần (không đổi chữ ký), `route-access.test.ts`, `tai-xe-cong.test.ts`, `ve-ho-tro-route.test.ts`.

- [ ] Bài **đỏ** cho `GET /api/feedback/:id/messages?since=`: thiếu `since` → 400; trả đúng các tin `created_at > since` (tối đa 100, cũ trước mới sau), kèm `ticket {status, assigneeId, assigneeName, priority, teamId}`; người gửi không thấy ghi chú nội bộ; thành viên nhóm giữ phiếu thấy ghi chú nội bộ của nhóm mình, không thấy của nhóm cũ (như tuyến chi tiết); người ngoài nhóm → 404; sau khi phiếu chuyển nhóm, thành viên nhóm cũ → 404; **bài lệch thứ tự**: chèn tin B (dấu T2) rồi tin A (dấu T1 < T2) xong sau, gọi với `since` = T2 lùi 30 giây thì thấy cả A và B (tin không mất); **bài không ghi mốc**: đếm `fbk_ticket_read` trước/sau nhiều lần gọi → không đổi.
- [ ] Bài **đỏ** cho `GET /api/feedback/teams/:id/members`: Trưởng nhóm đúng nhóm và Toàn quyền → 200, chỉ thành viên đang hiệu lực + tài khoản còn hoạt động, loại tài khoản bên ngoài còn dòng cũ, loại người gửi phiếu khi truyền `?ticket=<id>`; thành viên thường → 403; Trưởng nhóm của nhóm khác → 403; nhóm không có → 404; tên qua `v_stf_staff_label`.
- [ ] Viết hai câu SQL + route (gọi `quyenPhieu` trực tiếp: `…/members` dùng `quyenPhieu({ who: staff, submitterId: "", ticketTeamId: <nhóm>, memberships })` rồi `.giaoViecChoNguoiKhac`); **tuyến làm mới KHÔNG gọi `markSeen`**; khai trước `/:id`.
- [ ] Cập nhật `route-access.test.ts`, `tai-xe-cong.test.ts`; chạy `src/route-write-guard.test.ts`; commit.

### Việc 5: Giao diện

**Files:** Modify `web/feedback.ts`, `public/feedback.html` (nếu cần), `public/app.css` (chỉ token), `src/shared/ve-ho-tro-hien-thi.ts` (+ bài thuần nếu thêm luật), `src/shared/huong-dan-*.ts` mục Hỗ trợ, `src/shared/tro-ly-cau-truc-ten.ts`; Create kịch bản Chrome `docs/evidence/2026-10-16-ve-ho-tro-2a/kich-ban/ve-ho-tro-2a-smoke.mjs` (khuôn `docs/evidence/2026-10-15-ve-ho-tro/kich-ban/ve-ho-tro-smoke.mjs`; cần `AXE_JS`).

- [ ] Khung bong bóng: tin mình bên phải, người khác bên trái, ghi chú nội bộ viền riêng; làm mới 5 giây khi `document.visibilityState === "visible"`, 30 giây khi phiếu đã đóng, dừng khi ẩn; mốc `since` lấy từ tin cuối máy chủ trả, lùi 30 giây, bỏ tin trùng theo `id`; cập nhật phần đầu phiếu (trạng thái/người xử lý/mức ưu tiên) từ `ticket` của phản hồi; 404 → dừng và hiện «Phiếu này không còn trong nhóm của bạn»; lỗi mạng bỏ qua lần đó. Không `innerHTML`.
- [ ] Ô mức ưu tiên (chỉ khi `perms.xuLy`; người gửi chỉ thấy nhãn); sắp hàng đợi đã do máy chủ làm.
- [ ] Form gửi: ô «Đơn liên quan» tuỳ chọn (danh sách từ `my-orders`, trạng thái đổi sang nhãn tiếng Việt qua `trangThaiHienThi`, không lộ mã thô như `confirmed`); ẩn khi danh sách rỗng.
- [ ] Phiếu: hiện mã đơn dạng chữ + liên kết mở đơn (mở theo quyền người bấm).
- [ ] Ô «Giao cho người khác» trong khối Người xử lý khi `perms.giaoViec`: tải `…/members?ticket=<id>`; chọn xong gọi `PATCH …/xu-ly {assigneeId}`.
- [ ] Hướng dẫn/Trợ giúp: một câu về mức ưu tiên, đơn liên quan, tự làm mới (kiểm bài giới hạn 30 phút đọc và bài A2 tên nút); `tro-ly-cau-truc-ten.ts` mô tả đúng.
- [ ] `npm run typecheck`, `npm run build:web`, `node --test` các bài giao diện; chạy kịch bản Chrome nếu máy có (nếu không, ghi rõ «chưa chạy»; hai người cùng lúc cần hai hồ sơ trình duyệt vì kho cookie chung). Commit.

### Việc 6: Hàng rào, e2e, tài liệu, nhật ký, kiểm độc lập, bàn giao

**Files:** Modify `tests/e2e/feedback.mjs`, `docs/SO-HANG-RAO.md`, `docs/HANDOFF-FEEDBACK.md`, `docs/SYSTEM-DESIGN.md` (§5, §7, §8), `docs/CHANGE-GUIDE.md`, `docs/BACKLOG.md` (đóng BL-VE-GIAO-VIEC; nhắc đợt 2b), `src/shared/changelog.ts` + `src/shared/app-info.test.ts` (phiên bản kế tiếp, số tạm — kiểm `node scripts/kiem-phien-ban.mjs`).

- [ ] e2e thêm khối đợt 2a trên route thật: hai người, tin mới hiện qua `…/messages`, không ghi mốc, ưu tiên, gắn đơn (ca đúng/sai), giao việc qua `…/members`; đăng nhập qua `login()`/`session()` của `tests/e2e/lib.mjs`. Chạy `npm run test:e2e -- feedback` (cần mạng) nếu được; nếu không, ghi rõ «e2e chưa chạy».
- [ ] `docs/SO-HANG-RAO.md`: dòng mới cho (a) bài «tuyến làm mới không ghi mốc đã xem», (b) bài ca ghi lệch thứ tự dấu giờ, (c) bài «gắn đơn người khác = đơn không tồn tại», mỗi dòng có ngày + đột biến đã quan sát thật (sửa cố ý → đỏ → hoàn nguyên): ví dụ gọi `markSeen` trong tuyến làm mới ⇒ bài (a) đỏ; bỏ lùi 30 giây ⇒ bài (b) đỏ; phân biệt hai câu lỗi ⇒ bài (c) đỏ.
- [ ] Tài liệu mô tả khớp mã (HANDOFF-FEEDBACK, SYSTEM-DESIGN, CHANGE-GUIDE: công thức thêm mức ưu tiên / thêm cột tham chiếu); nhật ký thay đổi cho người dùng; nợ còn lại (đợt 2b, BL-VE-GO-TUYEN-CU, BL-VE-NHOM-CU…) giữ ở BACKLOG.
- [ ] `npm test`, `npm run typecheck`, `npm run build:web`, `node scripts/kiem-phien-ban.mjs`; chạy riêng bài đo giờ hook khi máy rảnh (`node --test --test-concurrency=1 src/claude-guard-thoi-gian.test.ts`).
- [ ] **Người kiểm độc lập (`nguoi-kiem-doc-lap`) cho cả nhánh**, rồi sửa phát hiện; dòng chỉ mục ADR (`docs/adr/README.md`) chỉ thêm khi gộp, sau khi kiểm lại số ADR/migration/phiên bản trên mọi nhánh.
- [ ] Bàn giao cho chủ (nguyên lệnh): `npm run day-len -- <nhánh>` (từ thư mục chính), kiểm migration `0104…` bằng `npx wrangler d1 migrations list tourdao-sales-db --remote`, rồi `npm run trien-khai` — **cần triển khai** (có migration). Hoàn tác: `wrangler rollback`; mã cũ chạy bình thường trên cấu trúc mới.

## Điểm cần chủ biết khi nhận bàn giao
Nêu rõ: đợt 2b (trạng thái «Chờ người gửi bổ sung», loại «Yêu cầu hỗ trợ», thông báo đẩy cho thành viên) chưa làm; các quyết định đợt 1 còn chờ chủ (ghi chú nội bộ cũ, phiếu của tài khoản bên ngoài, tên trang «Trợ lý Hỗ trợ») vẫn nguyên.
