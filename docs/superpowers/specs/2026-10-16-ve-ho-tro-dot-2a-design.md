# Vé hỗ trợ — đợt 2a: trò chuyện, mức ưu tiên, mã đơn liên quan, giao việc

> Bản nháp 2 chờ chủ duyệt (2026-10-16; bản 1 đã qua một vòng kiểm độc lập, đã sửa theo — xem mục 10). Nối tiếp `docs/superpowers/specs/2026-10-14-ve-ho-tro-design.md` (đợt 1, đã lên production) và ADR-0119. Hồ sơ có ngày: không sửa lại cho khớp mã. Chưa có mã, chưa có migration.

## 1. Mục tiêu và điều chủ đã chốt

Làm cho việc trao đổi trên một phiếu dễ dùng như hệ thống phiếu thông thường, trong phạm vi nhỏ, đảo ngược được.

| # | Chủ chốt (chat 2026-10-16) | Kết quả |
|---|---|---|
| 1 | Làm phần nào trước | **Trò chuyện + giao việc** (đợt 2a). «Chờ người gửi bổ sung», loại «Yêu cầu hỗ trợ», thông báo đẩy cho thành viên: **đợt 2b**, chưa làm |
| 2 | Ai đặt mức ưu tiên | **Chỉ người xử lý** (thành viên nhóm giữ phiếu hoặc Toàn quyền); người gửi không chọn |
| 3 | Gắn mã đơn thế nào | **Người gửi chọn từ danh sách đơn của mình**, máy chủ kiểm lại; cần mở cạnh đọc view đơn |
| 4 | Cách làm mới khung chat | **Tải lại ngầm mỗi 5 giây** khi tab mở, không Durable Objects (BACKLOG mục 33 vẫn để sau) |

Vẫn ngoài phạm vi: hạn xử lý (SLA), câu trả lời mẫu, khảo sát, đính kèm tệp, chat thời gian thực, email hai chiều.

## 2. Thiết kế

### 2.1 Khung chat bong bóng tự làm mới (không đổi dữ liệu)
- Tuyến mới **chỉ đọc** `GET /api/feedback/:id/messages?since=<ISO>`: trả các tin có `created_at > since` của phiếu, theo **đúng** quyền đọc và lọc ghi chú nội bộ như `GET /api/feedback/:id` (gọi `quyenPhieu`; người không đọc được ⇒ 404; ghi chú nội bộ lọc theo `noiBo`/`team_id`). Giới hạn 100 tin mỗi lần; thiếu `since` ⇒ 400. Phải khai **trước** `GET /api/feedback/:id` (tuyến tĩnh trước tuyến có tham số).
- **Không để mất tin.** `created_at` của tin do Worker tính TRƯỚC khi lô ghi chạy, nên tin ghi xong sau có thể mang dấu giờ sớm hơn tin ghi xong trước. Vì vậy: trình duyệt lấy mốc từ **tin cuối cùng máy chủ đã trả** (không từ đồng hồ trình duyệt), gửi `since` **lùi 30 giây**, và bỏ tin trùng theo `id`. Trần 100 tin/lần vẫn đủ vì chỉ lấy phần chồng 30 giây.
- Kèm phần đầu phiếu gọn trong cùng phản hồi: `ticket {status, assigneeId, assigneeName, priority, teamId}`. Nhờ đó giao diện biết phiếu vừa được đóng, đổi người xử lý hay đổi mức ưu tiên mà không cần tải lại cả trang.
- **Không ghi mốc «đã xem»**. Tuyến chi tiết hiện gọi `markSeen` mỗi lần mở; tuyến làm mới thì không, nếu không chấm đỏ sẽ tắt oan khi tab chỉ để mở. Mốc «đã xem» chỉ ghi lúc mở phiếu và sau mỗi lệnh ghi của chính người đó (như đợt 1).
- Giao diện: tin hiện dạng bong bóng (tin của mình bên phải, của người khác bên trái, ghi chú nội bộ có viền riêng); 5 giây một lần khi `document.visibilityState === "visible"`, dừng khi tab ẩn, chạy lại khi hiện. **Phiếu đã đóng thì giảm còn 30 giây một lần** (không dừng hẳn, vì người gửi trả lời sẽ mở lại phiếu). Phản hồi 404 (phiếu vừa chuyển sang nhóm người xem không thuộc) ⇒ dừng và hiện «Phiếu này không còn trong nhóm của bạn». Lỗi mạng: bỏ qua lần đó.

### 2.2 Mức ưu tiên (chạm dữ liệu)
- Cột `fbk_ticket.priority TEXT NOT NULL DEFAULT 'NORMAL'`, **không `CHECK` liệt kê** (luật `src/CLAUDE.md`: danh sách giá trị mở kiểm ở code; thêm mức sau này không phải dựng lại bảng). Giá trị hợp lệ `NORMAL`/`HIGH`/`URGENT` kiểm ở `rules.ts`; nhãn tiếng Việt «Thường / Cao / Khẩn» ở code.
- Đổi bằng `PATCH /api/feedback/:id/xu-ly` thêm trường `priority` (cùng cổng `quyenPhieu.xuLy`, cùng khoá lạc quan theo trạng thái và `team_id` như đợt 1). Người gửi **không** đặt được (kể cả khi gửi phiếu: bỏ qua trường nếu có). Phải sửa `validatePatchInput` (`rules.ts`) để thân chỉ có `priority` là hợp lệ, và câu chọn hành động nhật ký ở route (`index.ts`) để không ghi nhầm `feedback_assigned`. Tuyến cũ `PATCH /api/feedback/:id` dùng chung bộ kiểm và câu SQL nên cũng nhận được trường này; chấp nhận (chỉ Toàn quyền, và tuyến này sắp gỡ).
- **Ghi nhận thay đổi: nhật ký `feedback_priority_changed` (mã phiếu, mức cũ → mới, không tiêu đề; khai ở `src/shared/audit-actions.ts` với nhãn tiếng Việt)**. Mức «cũ» đọc trước lô nên chỉ để tham khảo; không thêm khoá lạc quan riêng cho mức ưu tiên. KHÔNG thêm giá trị vào bảng `fbk_ticket_event`: cột `type` có `CHECK` liệt kê ba giá trị, SQLite không sửa được `CHECK` tại chỗ (phải dựng lại bảng chỉ-thêm có trigger — rủi ro không đáng cho một thông tin xem lại ít dùng).
- Hàng đợi nhóm sắp bằng `ORDER BY CASE priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 ELSE 2 END, last_activity_at DESC` (sắp theo chữ sẽ sai: HIGH < NORMAL < URGENT); hộp thư «của tôi» của người gửi giữ thứ tự cũ. Người gửi thấy mức ưu tiên (chỉ đọc) trên phiếu của mình.

### 2.3 Mã đơn liên quan (chạm dữ liệu + ranh giới phân hệ)
- Cột `fbk_ticket.order_id TEXT` và `order_code TEXT` (tham chiếu, **không** khoá ngoại; mã chụp lúc gửi để phiếu không phụ thuộc đơn). Cả hai NULL khi không gắn; đặt cùng nhau hoặc cùng NULL (`CHECK ((order_id IS NULL) = (order_code IS NULL))`, kiểm cả ở code). Khai `logicalRefs` cho `order_id` trong `docs/data-dictionary.json`.
- Khi gửi (`POST /api/feedback`, trường tuỳ chọn `orderId`): máy chủ kiểm đơn tồn tại và **do chính người gửi lập** (đọc `v_ord_order_owner`: `staff_id = người gửi`); sai ⇒ 400 với câu lời thường **giống hệt** nhau cho «không tồn tại» và «không phải của bạn» (không dò đơn). Chỉ gắn lúc gửi; sửa sau là ngoài phạm vi.
- Danh sách chọn: `GET /api/feedback/my-orders` (khai **trước** `GET /api/feedback/:id`) trả tối đa 30 đơn gần nhất do người gọi lập, sắp `order_code DESC` (mã dạng `TD-YYYYMMDD-NNNN` nên thứ tự mã là thứ tự thời gian): **chỉ** `id`, `orderCode`, `status`. Không tiền, không khách, không SĐT. Tài khoản bên ngoài (Đối tác) cũng chỉ thấy đơn họ lập.
- **Hàng rào quyền của tuyến này:** `route-write-guard` (1c) đòi mọi route cổng `staff`, kể cả GET, phải gọi `can(...)` rồi dùng kết quả. Tuyến gọi `can(staff, <ô xem đơn của chính mình>, { ownerId: staff.id })`; **tên ô lấy từ `MATRIX` lúc thi công** (không thêm ô mới, không thêm vào `TU_PHUC_VU_STAFF` — đó là nới hàng rào). Nhờ vậy tài khoản đã bị rút quyền xem đơn không còn thấy mã đơn cũ qua cửa sau.
- **Cạnh mới** `feedback → orders` ở `ALLOWED_EDGES`, chỉ đọc view công bố đã có (Hiến chương: đọc xuyên module chỉ qua view `v_ord_*`, chỉ khoá/nhãn/cờ — `docs/ARCHITECTURE.md`). **Không thêm view mới**: ghép ba view sẵn có `v_ord_order_owner (id, staff_id)`, `v_ord_order_label (id, order_code)` và `v_ord_order_state (id, status, delivered_at, completed_at)` là đủ; không cần `created_at`.
- Hiển thị: người xử lý thấy mã đơn dạng chữ kèm liên kết mở đơn; mở thì theo **quyền xem đơn riêng của người bấm** (có thể 404 — đúng). Trạng thái đơn trong danh sách chọn dùng nhãn tiếng Việt từ `trangThaiHienThi` (`src/shared/order-status-label.ts`), không để lộ mã thô như «confirmed». Nhật ký không ghi mã đơn.

### 2.4 Nút «Giao cho người khác» (không đổi dữ liệu)
- Tuyến mới `GET /api/feedback/teams/:id/members`: trả thành viên **đang hiệu lực, tài khoản còn hoạt động** của nhóm `:id` (`staffId`, `name`, `role`) cho **Trưởng nhóm của đúng nhóm đó và Toàn quyền**; người khác ⇒ 403; nhóm không có ⇒ 404. Tên đọc qua `v_stf_staff_label` như đợt 1. Danh sách **loại người gửi của phiếu đang giao** (nếu có `?ticket=`) và tài khoản mang quyền bên ngoài còn dòng cũ (R6b), vì chọn họ thì lệnh giao trả 400. Tuyến gọi thẳng `quyenPhieu({ submitterId: "", ticketTeamId })` rồi dùng `.giaoViecChoNguoiKhac` (như tuyến hàng đợi), **không thêm hàm mới vào `GUARDS`**.
- Giao diện: khối «Người xử lý» có ô chọn khi `perms.giaoViec`; chọn xong gọi lệnh đã có `PATCH …/xu-ly {assigneeId}` (luật giao việc, sự kiện `ASSIGNED`, khoá lạc quan: đã làm ở đợt 1).

## 3. Quyền, dữ liệu, cổng (trang ghép — bắt buộc khi duyệt)
- **Bảng `fbk_ticket`** nhận thêm hai loại dữ liệu: mức ưu tiên (người xử lý đặt) và tham chiếu đơn (người gửi chọn lúc gửi). `fbk_message`, `fbk_ticket_event`, `fbk_ticket_read` không đổi.
- **Ô quyền:** KHÔNG thêm ô vào `MATRIX`. Quyền đặt ưu tiên = `quyenPhieu(...).xuLy`; xem thành viên = `quyenPhieu(...).giaoViecChoNguoiKhac` của **nhóm** (Trưởng nhóm đúng nhóm hoặc Toàn quyền). Hàm thuần `quyenPhieu` không đổi chữ ký và không thêm hàm mới vào `GUARDS` (thêm tên vào `GUARDS` là sửa hàng rào).
- **Cổng:** ba tuyến mới đều `access: "staff"`, mặc định từ chối trong thân route; giao diện chỉ ẩn/hiện theo `perms`/`teams`. Cổng đọc đơn: một nơi duy nhất (`my-orders` và kiểm lúc gửi cùng dùng một hàm trong `repository.ts`).
- **Ai thấy mức ưu tiên và mã đơn:** người gửi và người xử lý của nhóm giữ phiếu; Toàn quyền thấy tất cả. Quản trị/Nhân sự **không** có đường tắt vào nhóm nhạy cảm (không đổi).

## 4. Dữ liệu — một migration chỉ THÊM
Ba câu `ALTER TABLE fbk_ticket ADD COLUMN` **riêng lẻ** (SQLite không nhận danh sách cột trong một câu): `priority`, `order_id`, rồi `order_code` mang `CHECK` hai cột (thêm `order_id` trước). **Không** tạo view mới. Phiếu cũ nhận `priority = 'NORMAL'`, `order_* = NULL`, không viết lại dòng nào. Không thêm chỉ mục mới: chỉ mục `fbk_ticket_team_ix` sẵn có đủ cho quy mô này. Số migration = số lớn nhất trong `migrations/` + 1, kiểm trên mọi nhánh chưa gộp lúc đặt. Cập nhật `docs/data-dictionary.json` + `npm run dict`.

## 5. Bài kiểm máy sẽ đỏ / cần thêm
- Chắc chắn đỏ và phải sửa cùng lúc: `route-access.test.ts` (danh sách và tổng số route), `tai-xe-cong.test.ts` (BANG_STAFF), `route-write-guard.test.ts` luật (1c) nếu `my-orders` không hỏi quyền (xem 2.3), `architecture.test.ts` (cạnh `feedback → orders`; sổ dữ liệu khớp schema; `DATA-DICTIONARY.md` khớp bản sinh; EXPLAIN ranh giới khi đọc `v_ord_*`), `audit-actions.test.ts` nếu quên khai hành động mới. `lan-gui-phu-route.test.ts` chỉ đếm route ghi nên không đổi (ba tuyến mới đều GET). Không đổi: `goi-trang-nhe.test.ts` (chỉ gói Đơn hàng), `tests/audit/redteam.test.mjs`.
- Thêm: bài thuần cho luật ưu tiên và `since`; bài đường thật cho từng ca người ngoài (không thuộc nhóm ⇒ 404 ở `…/messages`; không phải Trưởng nhóm ⇒ 403 ở `…/members`; gắn đơn của người khác ⇒ 400 giống hệt đơn không tồn tại; tài khoản bị rút quyền xem đơn ⇒ `my-orders` bị từ chối); bài khoá «tuyến làm mới không ghi mốc đã xem» (đếm `fbk_ticket_read` trước/sau); **bài ca ghi lệch thứ tự dấu giờ** (tin ghi xong sau mang dấu sớm hơn vẫn được tuyến làm mới trả); e2e `feedback` thêm khối đợt 2a. Kịch bản Chrome hai người cùng lúc cần hai hồ sơ trình duyệt (các trang dùng chung kho cookie) — nếu không thì dùng e2e.

## 6. Rủi ro và điều chưa chắc
- Tải lại 5 giây × ~30 người: ước vài chục yêu cầu đọc mỗi phút mỗi phiếu đang mở, rất nhỏ so với hạn mức; vẫn đặt giới hạn 100 tin/lần và dừng khi tab ẩn. Nếu sau này đông hơn thì chuyển sang BACKLOG mục 33.
- Cạnh `feedback → orders` là thay đổi kiến trúc (Điều 9.4): cần ADR riêng, chủ duyệt. Nó chỉ đọc ba view sẵn có, không import hàm của `orders` và không thêm view.
- Chưa đọc được «mã đơn có thật» khi đơn bị huỷ/ẩn: phiếu vẫn giữ mã chụp lúc gửi; không đồng bộ lại.

## 7. Quyết định chủ phải duyệt (ba, đều chạm dữ liệu/quyền)
1. Thêm cột mức ưu tiên, chỉ người xử lý đặt; ghi vào nhật ký, không vào bảng sự kiện.
2. Thêm cột tham chiếu đơn và **cạnh mới** `feedback → orders`, chỉ đọc ba view có sẵn (cần ADR).
3. Tuyến cho Trưởng nhóm xem danh sách thành viên nhóm mình (lộ tên thành viên cùng nhóm cho Trưởng nhóm — vốn đã thấy trong thực tế).

## 8. Tiêu chí nghiệm thu (viết trước khi làm, P20)
(a) Hai người cùng mở một phiếu: tin mới của người này hiện ở người kia trong ≤ 10 giây (tab đang hiện), không cần tải lại và **không mất tin dù hai lệnh ghi chồng nhau**; chấm đỏ của người xem không tắt vì tự làm mới; phiếu bị đóng/chuyển nhóm bởi người khác được phát hiện trong lần làm mới kế tiếp. (b) Người gửi không thấy ghi chú nội bộ qua tuyến làm mới. (c) Người ngoài nhóm gọi `…/messages` hoặc `…/members` nhận 404/403, không lộ gì. (d) Chỉ người xử lý đặt được mức ưu tiên; người gửi gửi kèm `priority` thì bị bỏ qua. (e) Gắn đơn của người khác ⇒ 400, và câu lỗi giống hệt khi đơn không tồn tại. (f) Hàng đợi nhóm xếp Khẩn trước Cao trước Thường. (g) Trưởng nhóm giao việc được cho thành viên nhóm mình qua ô chọn; thành viên thường không thấy ô. (h) Phiếu cũ trên production mở được, nội dung nguyên vẹn. (i) Mã cũ chạy bình thường trên cấu trúc dữ liệu mới (hoàn tác bằng `wrangler rollback`, không cần xoá cột).

## 9. Cách giao hàng
ADR mới (cạnh `feedback → orders` và hai cột) do chủ duyệt → kế hoạch thi công → mỗi việc một trợ lý + người kiểm độc lập (chạm dữ liệu và quyền) → nhật ký thay đổi cho người dùng → chủ tự `day-len` và `trien-khai`. Cần triển khai (có migration).

## 10. Lịch sử bản
- Bản 1 (bc9210ea) qua một vòng kiểm độc lập: ba lỗi sai sự thật (mất tin ở tuyến làm mới do dấu giờ tính trước lô ghi; `my-orders` làm đỏ hàng rào (1c) mà mục 5 không nêu; view mới vướng luật «chỉ khoá/nhãn/cờ» trong khi ba view sẵn có đủ dùng) và các lỗi nhỏ (cú pháp ALTER, CHECK liệt kê trái luật, sắp theo chữ, hành động nhật ký, thứ tự khai tuyến, danh sách thành viên). Bản 2 sửa tất cả.
