# Vé hỗ trợ: nâng Góp ý / Báo lỗi thành hệ thống phiếu theo nhóm

> **Trạng thái: BẢN NHÁP ĐỂ CHỦ DUYỆT (2026-10-14).** Chưa có ADR, chưa có mã. Đặc tả này là hồ sơ có ngày: duyệt xong thì đóng băng, thay đổi về sau viết bản mới trỏ về đây.
> Nền: module `feedback` hiện có (migration `0016_feedback`, `HANDOFF-FEEDBACK.md`), ADR-0038 (Góp ý chỉ Toàn quyền xử lý), ADR-0002 (ranh giới module), ADR-0045 (thông báo đẩy).

## 1. Mục tiêu và điều chủ đã chốt

Nhân viên gửi yêu cầu đúng bộ phận cần (Kỹ thuật, Kế toán, Nhân sự, Điều hành…) và người thuộc bộ phận đó nhận, xử lý yêu cầu trong phạm vi việc của họ, như các SaaS vé hỗ trợ. Chủ đã chốt trong chat 2026-10-14:

| # | Quyết định | Chọn |
|---|---|---|
| 1 | «Bộ phận» là gì | **Nhóm hỗ trợ** do Toàn quyền tạo và gán người (không dùng thẳng mã quyền) |
| 2 | Phạm vi đợt này | **Cơ bản kiểu SaaS**; chưa làm hạn xử lý (SLA), câu trả lời mẫu, khảo sát hài lòng |
| 3 | Ai thấy phiếu của ai | **Người gửi + nhóm nhận**; Toàn quyền thấy tất cả; phiếu nhóm nhạy cảm chỉ thành viên nhóm đó thấy |
| 4 | Dữ liệu cũ | **Giữ nguyên bảng `fbk_*`, chỉ thêm cột**; phiếu cũ thành phiếu của nhóm «Kỹ thuật» |
| 5 | Trò chuyện | **Không nhúng bên thứ ba.** Khung trả lời trong phiếu làm kiểu bong bóng chat, tự làm mới; chat thời gian thực (Durable Objects) để đợt sau (`docs/BACKLOG.md`) |

**Tiêu chí thành công (kiểm được):** (a) nhân viên gửi được phiếu tới một nhóm và chỉ thấy phiếu của mình; (b) thành viên nhóm thấy hàng đợi của nhóm mình và không thấy hàng đợi nhóm khác; (c) phiếu cũ trên production vẫn mở được, nội dung nguyên vẹn; (d) ghi chú nội bộ không bao giờ tới người gửi; (e) người ngoài nhóm gọi trực tiếp API vào phiếu nhóm khác nhận 404, không lộ sự tồn tại.

## 2. Giả định (chủ sửa nếu sai)

- Mỗi phiếu thuộc **đúng một nhóm** tại một thời điểm; chuyển nhóm là một sự kiện ghi nhật ký, không sao chép phiếu.
- Một người thuộc được nhiều nhóm. Mỗi thành viên có vai «Trưởng nhóm» hoặc «Thành viên»; trưởng nhóm thêm được việc giao phiếu cho người khác trong nhóm, thành viên thì chỉ nhận cho mình.
- Chỉ **nhân viên nội bộ** gửi phiếu. Tài khoản bên ngoài (`PARTNER`, `DRIVER_PARTNER`) giữ như hiện nay: không có màn Vé hỗ trợ. (Đối tác hỏi gì thì hỏi qua nhân viên phụ trách; mở cho bên ngoài là quyết định riêng sau này.)
- Nhóm không bị xoá, chỉ ngưng dùng (đúng luật «không xoá cứng»). Phiếu của nhóm đã ngưng vẫn đọc được, Toàn quyền chuyển sang nhóm khác.
- Mã phiếu giữ dạng `YC-0007` (một dãy số chung), người dùng đã quen.

## 3. Thiết kế

### 3.1 Dữ liệu (migration mới, chỉ THÊM; số = số lớn nhất trên mọi nhánh + 1, hiện thấy `0095`)

- `fbk_team(id, code, name, description, sensitive, active, sort_order, + cột WHO/thời gian chuẩn)`. `sensitive = 1` nghĩa là phiếu nhóm này **kể cả Quản trị cũng không đọc** nếu không phải thành viên (chỉ Toàn quyền ngoại lệ). Gieo sẵn bốn nhóm: Kỹ thuật, Kế toán (nhạy cảm), Nhân sự (nhạy cảm), Điều hành.
- `fbk_team_member(team_id, staff_id, role['LEAD'|'MEMBER'], active, hiệu lực, WHO)`; `staff_id` không khoá ngoại (ADR-0002/N1, như `submitter_id`). Một dòng đang hiệu lực mỗi cặp (nhóm, người).
- `fbk_ticket` thêm: `team_id` (NOT NULL, đặt mặc định bằng id nhóm «Kỹ thuật» khi nạp), `priority` (`LOW|NORMAL|HIGH|URGENT`, mặc định `NORMAL`), `order_code` (tuỳ chọn, chỉ để **tham chiếu**, không khoá ngoại, kiểm mẫu mã), `team_seen_at` thay vai trò `admin_seen_at` (xem 3.5).
- `fbk_status` thêm `WAITING` («Chờ người gửi bổ sung»); `fbk_kind` thêm `REQUEST` («Yêu cầu hỗ trợ») cho yêu cầu không phải lỗi/đề xuất/câu hỏi.
- Bảng chuyển nhóm: `fbk_ticket_event(id, ticket_id, type['TEAM_CHANGED'|'ASSIGNED'|'STATUS'], from, to, actor, at)` để lịch sử phiếu đọc được bằng mắt; nhật ký hệ thống (`audit`) vẫn ghi song song.
- Cập nhật `docs/data-dictionary.json` + `npm run dict`.

**Cách nạp dữ liệu cũ (an toàn, đảo ngược được):** thêm cột `team_id` với giá trị mặc định là nhóm Kỹ thuật, không viết lại dòng nào. Migration cũ `0016_*` không đụng.

### 3.2 Quyền (phần chạm bản đồ quyền, cần ADR)

Bản đồ `MATRIX` giữ vai «ai được gửi, ai đọc mọi phiếu», còn **tư cách thành viên nhóm** là dữ liệu của module `feedback` tự đọc (như cơ chế `ctx.assigned` của đơn). Cụ thể:

- `feedback.submit`: giữ (mọi tài khoản nội bộ gửi được; hai mã bên ngoài vẫn không có màn).
- `feedback.view`: ô `own` giữ cho người gửi; thêm kiểm «là thành viên đang hiệu lực của nhóm của phiếu» trong thân route; ô `any` giữ cho Toàn quyền.
- `feedback.triage`: **đổi nghĩa** từ «chỉ Toàn quyền» thành «Toàn quyền, hoặc thành viên nhóm của phiếu». Ô trong `MATRIX` vẫn chỉ `SUPER_ADMIN = any`; phần thành viên nhóm do route kiểm thêm. Vì vậy test «bản đồ quyền được thi hành» (bài học 24/9) phải thêm ca cho nhánh thành viên.
- Ô mới `feedback.team.manage` (tạo/ngưng nhóm, gán thành viên, đổi `sensitive`): chỉ `SUPER_ADMIN`. Ô mới `feedback.transfer` (chuyển phiếu sang nhóm khác): Toàn quyền và Trưởng nhóm của nhóm đang giữ phiếu.
- **Cổng router đổi:** hàng đợi hiện khai cổng `admin`, nên Kế toán hay Nhân sự (không thuộc cổng `admin`) không vào được. Hàng đợi nhóm chuyển sang cổng `staff` và tự lọc theo tư cách thành viên trong thân route; **mặc định từ chối**, người không phải thành viên và không phải Toàn quyền nhận danh sách rỗng ở hàng đợi, 404 ở chi tiết.
- Nhóm `sensitive`: Quản trị (`ADMIN`) không có đường tắt; chỉ thành viên và Toàn quyền.
- Ghi chú nội bộ (`internal = 1`): chỉ người có quyền xử lý phiếu viết và đọc; người gửi **không bao giờ** thấy, kể cả khi người gửi cũng là thành viên nhóm (khi đó họ thấy ở tư cách thành viên chỉ trong hàng đợi nhóm, nhưng phiếu họ tự gửi thì ghi chú nội bộ vẫn ẩn; xem rủi ro R2).

### 3.3 API (mở rộng `/api/feedback*`, giữ đường cũ chạy được)

| Tuyến | Việc | Ai |
|---|---|---|
| `POST /api/feedback` | thêm trường `teamId`, `priority`, `orderCode`; thiếu `teamId` ⇒ nhóm Kỹ thuật (để bản web cũ trong bộ nhớ đệm vẫn gửi được) | mọi nhân viên nội bộ |
| `GET /api/feedback/teams` | danh sách nhóm đang dùng để chọn khi gửi (chỉ tên và mô tả, không danh sách thành viên) | mọi nhân viên nội bộ |
| `GET /api/feedback/queue?team=…` | hàng đợi của một nhóm: lọc `Mới / Của tôi / Chưa ai nhận`, trạng thái, ưu tiên | thành viên nhóm, Toàn quyền |
| `PATCH /api/feedback/:id` | trạng thái, người xử lý (cùng nhóm), ưu tiên, `resolvedIn`; khoá lạc quan như cũ | người xử lý theo 3.2 |
| `POST /api/feedback/:id/transfer` | chuyển nhóm kèm lý do (ghi tin nội bộ tự động) | Toàn quyền, Trưởng nhóm |
| `POST /api/feedback/:id/claim` | «Nhận việc» một phiếu chưa ai nhận | thành viên nhóm |
| `GET/POST/PATCH /api/feedback/admin/teams*` | quản lý nhóm và thành viên | Toàn quyền |
| `GET /api/feedback/:id?since=…` | trả tin mới hơn mốc `since` để màn chat làm mới nhẹ | như đọc phiếu |

`GET /api/feedback` (hàng đợi cũ) giữ lại như đường tương thích: ai thuộc cổng cũ nhận hàng đợi nhóm Kỹ thuật; sẽ gỡ ở lần phát hành sau (expand–contract, theo CLAUDE.md §7).

### 3.4 Giao diện (`web/feedback.ts`, không `innerHTML`, tông và token có sẵn)

- Nút «Tạo yêu cầu»: chọn nhóm nhận (kèm một dòng gợi ý «Việc này nên gửi đâu?» cho mỗi nhóm), loại, ưu tiên, tiêu đề, nội dung, mã đơn liên quan (tuỳ chọn).
- «Yêu cầu của tôi»: danh sách, lọc theo trạng thái, chấm đỏ khi có phản hồi mới.
- «Hàng đợi nhóm» (chỉ thấy với thành viên và Toàn quyền): chọn nhóm, ba bộ lọc nhanh, nút «Nhận việc» ngay trên thẻ.
- **Chi tiết phiếu = khung trò chuyện:** tin hiện thành bong bóng (người gửi một bên, nhóm một bên, ghi chú nội bộ nền khác kèm nhãn «Chỉ nhóm thấy»), thanh trạng thái, ô gõ cố định phía dưới (16px, theo luật iPhone). Tin mới tự hiện: khi tab đang mở thì hỏi `?since=` mỗi 5 giây, **dừng khi tab ẩn**, tăng giãn cách khi mạng chậm; tab đóng thì có thông báo đẩy.
- Màn «Quản lý nhóm» (Toàn quyền): tạo/ngưng nhóm, thêm bớt thành viên, đặt Trưởng nhóm, bật «nhạy cảm».
- Chữ trên giao diện dùng từ quen thuộc: «Yêu cầu hỗ trợ», «nhóm», «Nhận việc» (không «assign», «triage»). Gọi hệ thống là «Nền tảng».

### 3.5 Chưa đọc, thông báo, nhật ký

- Chưa đọc tính **riêng từng người** thay vì dùng chung một mốc `admin_seen_at` (hiện mọi admin dùng chung — đã ghi là hạn chế ở bản v1). Thêm bảng nhỏ `fbk_ticket_read(ticket_id, staff_id, seen_at)`; mốc người gửi giữ như cũ.
- Thông báo: phiếu mới hoặc chuyển tới nhóm ⇒ thông báo đẩy và email (cơ chế `notify.ts` hiện có) cho **thành viên nhóm nhận**, không còn gửi chung một địa chỉ admin. Nhóm không có thành viên nào ⇒ phiếu vẫn lưu, Toàn quyền nhận thông báo thay và màn hình ghi «Nhóm chưa có người nhận».
- Nhật ký (`audit`): thêm `feedback_team_changed`, `feedback_claimed`, `feedback_team_member_changed`, `feedback_team_created`. **Không ghi nội dung tin nhắn, SĐT, email, số giấy tờ** vào nhật ký (như luật hiện hành).

### 3.6 Trần chống lạm dụng

Giữ trần 5 phiếu/giờ và 30 tin/giờ mỗi tài khoản (tin của người xử lý tính chung). Không làm trần theo nhóm.

## 4. Ngoài phạm vi (đợt này)

Hạn xử lý theo ưu tiên (SLA) và cảnh báo quá hạn; câu trả lời mẫu; khảo sát hài lòng; đính kèm tệp/ảnh (phải có kho tệp, ADR riêng); mở cho tài khoản bên ngoài; chat thời gian thực và «đang soạn» (Durable Objects, ghi `docs/BACKLOG.md`); tự định tuyến phiếu theo nội dung; email vào/ra hai chiều.

## 5. Rủi ro và điều chưa chắc

- **R1 — Bản đồ quyền bị đọc nhầm (bài học 24/9).** Quyền đọc phiếu nay phụ thuộc dữ liệu thành viên, không chỉ `MATRIX`. Cần bài kiểm ở cả route lẫn giao diện (ca: người ngoài nhóm, Quản trị với nhóm nhạy cảm, thành viên đã bị gỡ giữa chừng, người gửi vừa là thành viên) và một dòng **Sổ hàng rào** có ngày quan sát chặn thật.
- **R2 — Người gửi vừa là thành viên nhóm nhận** (ví dụ nhân viên Kế toán gửi phiếu tới nhóm Kế toán): phải quyết ghi chú nội bộ của chính phiếu họ gửi có hiện cho họ không. Đề xuất: **ẩn**, vì họ tự đặt mình vào vị trí người hỏi (đúng thực hành của các SaaS). Chủ xác nhận khi duyệt.
- **R3 — Chặn dây chuyền.** Đã tra `docs/quyen-hoan.json`: không có mục nào dính module Góp ý/`feedback`, nên đặc tả này **không** xây trên lỗ đang hở nào đã ghi nhận. (Kiểm lại ngày duyệt.)
- **R4 — Gỡ thành viên giữa lúc đang giữ phiếu:** phiếu của người đó quay về «Chưa ai nhận» của nhóm, ghi sự kiện; không để phiếu mồ côi.
- **R5 — Hiệu năng làm mới 5 giây:** 30 người, tối đa vài phiếu mở cùng lúc ⇒ vài request nhẹ mỗi phút; câu hỏi `?since=` có chỉ mục `(ticket_id, created_at)` đã có. Chấp nhận được; nếu số người tăng nhiều thì chuyển sang Durable Objects (đã ghi backlog).
- **Chưa kiểm:** nhóm `sensitive` có cần thêm lớp che tên người gửi với quản trị không; mẫu mã đơn hợp lệ để kiểm `order_code`; trạng thái `WAITING` có làm đồng hồ «Chưa ai trả lời» (nếu thêm sau) phức tạp thêm không.

## 6. Quyết định chủ phải duyệt (tối đa ba, có chạm quyền/dữ liệu)

1. **Đổi nghĩa `feedback.triage`** (từ «chỉ Toàn quyền» sang «Toàn quyền hoặc thành viên nhóm»), kèm hai ô mới `feedback.team.manage` và `feedback.transfer`, và cổng hàng đợi chuyển từ `admin` sang `staff`. Đây là quyết định sửa một phần ADR-0038; một chiều ở chỗ quyền đã mở cho thành viên nhóm thì thu lại phải thông báo lại cho họ.
2. **Mô hình nhóm nhạy cảm** (Kế toán, Nhân sự: Quản trị không có đường tắt) và quyết định R2.
3. **Migration thêm cột và bảng** (nạp phiếu cũ vào nhóm Kỹ thuật) — chỉ thêm, hoàn tác bằng gỡ bản triển khai.

## 7. Trang ghép (bắt buộc khi duyệt, bản nháp)

**(1) Bảng `fbk_ticket` chứa loại thực thể nào:** chỉ phiếu hỗ trợ của nhân viên nội bộ (loại BUG/IDEA/QUESTION/REQUEST). Không chứa hồ sơ khách, đối tác, tiền, giấy tờ.

**(2) Dòng quyền chạm bảng này:** `feedback.submit` (gửi), `feedback.view` (đọc phiếu của mình; đọc mọi phiếu: Toàn quyền), `feedback.triage` (xử lý: Toàn quyền hoặc thành viên nhóm), `feedback.team.manage` (Toàn quyền), `feedback.transfer` (Toàn quyền, Trưởng nhóm). Mười mã quyền đều xét; hai mã bên ngoài không có màn.

**(3) Cổng canh cửa nào:** máy chủ — cổng `staff` cho mọi tuyến `/api/feedback*`, rồi kiểm chủ phiếu hoặc thành viên nhóm hoặc Toàn quyền trong thân; nhóm `sensitive` bỏ qua đường tắt Quản trị. **Giao diện** — mục «Hàng đợi nhóm» và «Quản lý nhóm» ẩn/hiện theo tư cách thành viên và Toàn quyền (giao diện chỉ là gợi ý, máy chủ là cổng thật); mục menu Góp ý ở thanh bên đổi nhãn thành «Hỗ trợ» và huy hiệu số đếm gộp «chưa đọc của tôi + chưa ai nhận trong nhóm tôi».

## 8. Tiêu chí nghiệm thu (viết trước khi làm, P20)

- Bài thuần cho luật quyền (một hàm quyết định `ai đọc/xử lý được phiếu`) với đủ ca ở R1; bài route đi đường thật.
- Bài đối chiếu: mọi tuyến `/api/feedback*` có ca «người ngoài nhóm ⇒ 404/rỗng».
- Bài migration: phiếu cũ có `team_id` = Kỹ thuật, số dòng không đổi.
- Bài giao diện: Chrome kịch bản mới (gửi phiếu, nhóm nhận, trả lời, tin tự hiện) trên iPhone cỡ 375px.
- Hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên).
- `npm test`, `npm run typecheck`, e2e xanh; **người kiểm độc lập** (việc lớn: chạm quyền và dữ liệu) trước khi báo xong.

## 9. Cách giao hàng

Một ADR (mã đánh số khi nộp, kiểm số lớn nhất trên mọi nhánh) + trang ghép này; thi công theo ba lát đỏ→xanh: (1) dữ liệu + luật quyền thuần; (2) API + thông báo; (3) giao diện + chat làm mới. **Triển khai production do chủ tự chạy** theo `docs/HANDOFF-N1.md` (AI chỉ chuẩn bị lệnh); cần mục nhật ký thay đổi mới cho bản phát hành.
