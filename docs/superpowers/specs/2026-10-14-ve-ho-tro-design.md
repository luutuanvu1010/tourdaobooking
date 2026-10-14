# Vé hỗ trợ: nâng Góp ý / Báo lỗi thành hệ thống phiếu theo nhóm

> **Trạng thái: BẢN NHÁP 2 ĐỂ CHỦ DUYỆT (2026-10-14), đã qua một vòng kiểm độc lập.** Chưa có ADR, chưa có mã. Duyệt xong thì đóng băng; thay đổi về sau viết bản mới trỏ về đây.
> Nền: module `feedback` hiện có (`migrations/0016_feedback.sql`, `docs/HANDOFF-FEEDBACK.md`), ADR-0038 (Góp ý chỉ Toàn quyền xử lý), ADR-0002 (ranh giới module), ADR-0094 (chống ghi trùng).
> Vòng kiểm độc lập tìm 4 lỗi chặn ở bản 1 (thông báo, tài khoản bên ngoài, cột `team_id`, bài kiểm sẽ đỏ) và đề nghị tách đợt; bản này đã sửa cả bốn và tách hai đợt.

## 1. Mục tiêu và điều chủ đã chốt

Nhân viên gửi yêu cầu đúng bộ phận (Kỹ thuật, Kế toán, Nhân sự, Điều hành…); người thuộc bộ phận đó nhận và xử lý trong phạm vi việc của họ, như các SaaS vé hỗ trợ. Chủ đã chốt trong chat 2026-10-14:

| # | Quyết định | Chọn |
|---|---|---|
| 1 | «Bộ phận» là gì | **Nhóm hỗ trợ** do Toàn quyền tạo và gán người |
| 2 | Phạm vi | **Cơ bản kiểu SaaS**; chưa làm hạn xử lý (SLA), câu trả lời mẫu, khảo sát |
| 3 | Ai thấy phiếu của ai | **Người gửi + nhóm nhận**; Toàn quyền thấy tất cả; phiếu nhóm nhạy cảm chỉ thành viên nhóm đó (và Toàn quyền) thấy |
| 4 | Dữ liệu cũ | **Giữ bảng `fbk_*`, chỉ thêm cột**; phiếu cũ thành phiếu nhóm «Kỹ thuật» |
| 5 | Trò chuyện | **Không nhúng bên thứ ba.** Khung trả lời kiểu bong bóng chat, tự làm mới; chat thời gian thực (Durable Objects) để sau (`docs/BACKLOG.md`) |

**Hai đợt (theo đề nghị của người kiểm, để mỗi lượt duyệt vừa sức):**
- **Đợt 1 — nền nhóm và quyền:** nhóm, thành viên, gửi tới nhóm, hàng đợi nhóm, nhận việc/giao việc, chuyển nhóm, nhóm nhạy cảm, chưa đọc riêng từng người, màn quản lý nhóm. Đây là đợt chạm quyền và dữ liệu.
- **Đợt 2 — trải nghiệm vé:** khung chat bong bóng + tự làm mới, mức ưu tiên, mã đơn liên quan, trạng thái «Chờ người gửi bổ sung», loại «Yêu cầu hỗ trợ», thông báo đẩy cho thành viên nhóm. Cần đặc tả ngắn riêng sau khi đợt 1 chạy.

**Tiêu chí thành công đợt 1 (kiểm được):** (a) nhân viên gửi phiếu tới một nhóm và chỉ thấy phiếu của mình; (b) thành viên thấy hàng đợi nhóm mình, không thấy nhóm khác; (c) phiếu cũ trên production mở được, nội dung nguyên vẹn; (d) ghi chú nội bộ không bao giờ tới người gửi; (e) người ngoài nhóm gọi thẳng API vào phiếu nhóm khác nhận 404; (f) không số liệu nào (thống kê, huy hiệu, nhật ký) lộ sự tồn tại của phiếu nhóm mà mình không thuộc.

## 2. Giả định (chủ sửa nếu sai)

- Mỗi phiếu thuộc **đúng một nhóm**; chuyển nhóm là sự kiện ghi lại, không sao chép phiếu.
- Một người thuộc được nhiều nhóm, vai «Trưởng nhóm» hoặc «Thành viên». Trưởng nhóm giao phiếu cho người khác trong nhóm và chuyển phiếu sang nhóm khác; thành viên chỉ nhận cho mình.
- **Tài khoản bên ngoài** (`PARTNER`, `DRIVER_PARTNER`): hiện nay `feedback.submit` mở cho cả mười mã quyền ở cổng `staff` (`src/shared/permissions.ts`, được ghim ngoại lệ ở `permissions.test.ts`), tức gọi thẳng API vẫn gửi được. Giữ đúng hành vi đó nhưng **chỉ tới nhóm Kỹ thuật**; máy chủ từ chối (403) nếu họ chọn nhóm khác hoặc xem danh sách nhóm. Mở rộng cho bên ngoài là quyết định riêng sau này. *(Chưa kiểm: giao diện hiện có cho họ thấy màn Góp ý hay không.)*
- Nhóm không xoá, chỉ ngưng dùng. Phiếu nhóm đã ngưng vẫn đọc được; Toàn quyền chuyển sang nhóm khác.
- Mã phiếu giữ `YC-0007`.
- **Toàn quyền thấy mọi phiếu, kể cả nhóm nhạy cảm** (chủ là người chịu trách nhiệm cuối). Quản trị (`ADMIN`) và Nhân sự (`HR`) không có đường tắt.

## 3. Thiết kế đợt 1

### 3.1 Dữ liệu (một migration, chỉ THÊM)

Số migration: số lớn nhất trên **mọi nhánh** + 1. Hôm nay `main` dừng ở `0095`, nhánh `claude/phan-loai-dai-ly-hoa-hong-66d076` đã có `0096`; chốt số lúc nộp.

- `fbk_team(id, code, name, description, sensitive, active, sort_order, cột WHO/thời gian)`. Gieo bốn nhóm: **Kỹ thuật** (id **hằng cố định ghi cứng trong migration**), Kế toán (`sensitive=1`), Nhân sự (`sensitive=1`), Điều hành.
- `fbk_team_member(team_id, staff_id, role['LEAD'|'MEMBER'], hiệu lực từ/đến, WHO)`; `staff_id` không khoá ngoại (ADR-0002/N1). Một dòng đang hiệu lực mỗi cặp.
- `fbk_ticket` thêm `team_id TEXT NOT NULL DEFAULT '<id hằng của Kỹ thuật>'`, **không dùng REFERENCES trong ADD COLUMN** (SQLite buộc mặc định NULL khi có khoá ngoại; tính toàn vẹn kiểm bằng trigger/ở route, theo phong cách «WHO không khoá ngoại» của bảng này). *(Quy tắc SQLite theo tài liệu, chưa chạy thử: bài migration phải chạy thật trên D1 local.)*
- `fbk_message` thêm `team_id` (mặc định như trên): **ghi chú nội bộ thuộc về nhóm đã viết nó**; sau khi phiếu chuyển nhóm, nhóm mới không đọc ghi chú nội bộ của nhóm cũ (Toàn quyền đọc tất cả).
- `fbk_ticket_event(id, ticket_id, type['TEAM_CHANGED'|'ASSIGNED'|'CLAIMED'|'STATUS'], from, to, actor, at)`: lịch sử đọc được bằng mắt; nhật ký hệ thống (`audit`) ghi song song.
- `fbk_ticket_read(ticket_id, staff_id, seen_at)`: **chưa đọc tính riêng từng người**, thay mốc dùng chung `admin_seen_at` (hạn chế đã ghi ở `HANDOFF-FEEDBACK.md`, «Điểm mở»). Mốc `submitter_seen_at` của người gửi giữ. Cột `admin_seen_at` thành cột chết (không đọc nữa).
- Cập nhật `docs/data-dictionary.json` + `npm run dict`. `INSERT_TICKET` ở `repository.ts` liệt kê cột cố định nên phải sửa để nhận `team_id`.

**Phiếu cũ:** không viết lại dòng nào; cột mới tự mang giá trị mặc định (Kỹ thuật). Migration `0016_*` không đụng.

### 3.2 Quyền (phần chạm bản đồ quyền, cần ADR)

`MATRIX` vẫn trả lời «ai được gửi, ai đọc mọi phiếu»; **tư cách thành viên nhóm** là dữ liệu module `feedback` tự giữ (bảng `fbk_*` của chính nó, không phá cạnh `feedback → staff, audit` trong `src/architecture.test.ts`).

- `feedback.submit`, `feedback.view`: giữ nguyên ô. Thêm luật trong thân route: bên ngoài chỉ nhóm Kỹ thuật (mục 2).
- `feedback.triage`: ô `MATRIX` vẫn chỉ `SUPER_ADMIN = any`. Quyền thực tế = **Toàn quyền, hoặc thành viên đang hiệu lực (tài khoản còn hoạt động) của nhóm giữ phiếu**, do một hàm thuần `quyenXuLyPhieu(người, phiếu, thành viên)` quyết định, dùng cho mọi route.
- Ô mới `feedback.team.manage` (tạo/ngưng nhóm, gán/gỡ thành viên, đổi `sensitive`): chỉ `SUPER_ADMIN`. **Chuyển nhóm** không thêm ô: cho Toàn quyền và Trưởng nhóm của nhóm đang giữ phiếu, qua cùng hàm thuần.
- **Cổng router:** hàng đợi và các tuyến xử lý chuyển từ cổng `admin` sang `staff`, tự lọc trong thân (mặc định từ chối). Vì `can()` chỉ đọc `MATRIX` nên hàm thuần ở trên phải được khai vào `GUARDS` của `src/route-write-guard.test.ts` (đây là **sửa hàng rào**, cần dòng mới ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật).
- Nhóm `sensitive`: không đường tắt cho Quản trị/Nhân sự. Cờ `sensitive` đọc tại lúc truy vấn nên đổi cờ áp ngay cho mọi phiếu của nhóm (không có «áp ngược» riêng).
- **Ghi chú nội bộ**: chỉ người có quyền xử lý viết/đọc; **người gửi không bao giờ thấy**, kể cả khi người gửi cũng thuộc nhóm nhận: với phiếu do chính họ gửi, họ chỉ có tư cách người gửi (quyết định R2, chủ xác nhận khi duyệt).
- **Chuyển nhóm:** bỏ người xử lý hiện tại (người đó có thể không thuộc nhóm mới), trạng thái về «Mới» nếu đang «Đang xử lý»; ghi sự kiện và lý do (tin nội bộ của nhóm cũ).
- **Tài khoản bị khoá/ngưng:** truy vấn thành viên luôn nối tài khoản còn hoạt động nên mất quyền ngay; phiếu mà người đó đang giữ hiển thị «chưa ai nhận» (người xử lý không còn hoạt động coi như trống).
- **Nhận việc** là một câu cập nhật có điều kiện `assignee_id IS NULL` (hai người bấm cùng lúc chỉ một người thắng; người kia nhận 409 «vừa có người nhận»).

### 3.3 API (đợt 1)

Các tuyến tĩnh **khai trước** `/api/feedback/:id` (router khớp theo thứ tự khai; `UUID_RE` ở `:id` trả 404 nếu nhầm).

| Tuyến | Việc | Ai |
|---|---|---|
| `POST /api/feedback` | thêm `teamId` (thiếu ⇒ nhóm Kỹ thuật, để bản web cũ trong bộ nhớ đệm vẫn gửi được) | mọi tài khoản đăng nhập; bên ngoài chỉ Kỹ thuật |
| `GET /api/feedback/teams` | nhóm đang dùng để chọn khi gửi (tên + mô tả, không danh sách thành viên) | nội bộ; bên ngoài chỉ thấy Kỹ thuật |
| `GET /api/feedback/queue?team=…` | hàng đợi một nhóm (lọc: Mới / Của tôi / Chưa ai nhận, trạng thái); **kèm thống kê tuần chỉ của nhóm đó** | thành viên nhóm, Toàn quyền |
| `POST /api/feedback/:id/claim` | nhận việc | thành viên nhóm |
| `POST /api/feedback/:id/transfer` | chuyển nhóm (+ lý do) | Toàn quyền, Trưởng nhóm |
| `PATCH /api/feedback/:id` | trạng thái, người xử lý (cùng nhóm); khoá lạc quan như cũ | theo 3.2 |
| `GET/POST/PATCH /api/feedback/admin/teams*` | quản lý nhóm và thành viên | Toàn quyền |

`GET /api/feedback` (hàng đợi cũ) giữ cho tương thích, **chỉ Toàn quyền** nhận hàng đợi (đúng như nay); Quản trị và Nhân sự vẫn nhận 403. Gỡ ở lần phát hành sau (expand–contract). Thống kê tuần hiện đếm toàn bộ phiếu, nên bản mới **lọc theo nhóm** để không lộ số phiếu nhóm nhạy cảm.

Mọi tuyến ghi mới phải được xét trong lớp chống ghi trùng ADR-0094 (`src/shared/lan-gui-no.ts`, `src/lan-gui-phu-route.test.ts`).

### 3.4 Giao diện đợt 1 (`web/feedback.ts`; không `innerHTML`, token có sẵn)

Tạo yêu cầu có ô chọn nhóm nhận (kèm gợi ý một dòng «Việc này nên gửi đâu?»); «Yêu cầu của tôi»; «Hàng đợi nhóm» (chỉ hiện với thành viên và Toàn quyền, có nút «Nhận việc»); «Quản lý nhóm» (Toàn quyền). Giao diện chỉ là gợi ý, **máy chủ là cổng thật**. Mục menu đổi nhãn thành «Hỗ trợ»; huy hiệu = «chưa đọc của tôi + chưa ai nhận trong nhóm tôi». Thẻ «Hộp thư» ở Trang chủ (`web/home.ts`) hiện cho thành viên nhóm chứ không chỉ Toàn quyền (chủ ý, nêu ở trang ghép). Gọi hệ thống là «Nền tảng»; sửa luôn chữ «Mở trong app» ở `notify.ts` khi đụng tới email.

### 3.5 Thông báo và nhật ký (đợt 1)

- **Email: vẫn MỘT địa chỉ chung như nay** (`FEEDBACK_NOTIFY_EMAIL`); đợt 1 chỉ thêm tên nhóm vào tiêu đề. Lý do: bảng nhân viên và view `v_stf_staff_label` **không có email**, và thông báo đẩy nằm ở module `thongbao` mà cạnh `feedback → thongbao` chưa được khai trong `ALLOWED_EDGES`. Thông báo đẩy/email tới từng thành viên nhóm là **đợt 2**, qua quyết định riêng về cạnh phụ thuộc (hoặc cơ chế tiêm ở gốc lắp ráp).
- Nhật ký (`audit`): thêm `feedback_team_created`, `feedback_team_member_changed`, `feedback_team_changed`, `feedback_claimed` (đăng ký ở `src/shared/audit-actions.ts` và danh sách liên quan). **Không ghi nội dung tin, SĐT, email, số giấy tờ**; với phiếu nhóm nhạy cảm, nhật ký ghi **mã phiếu thay vì tiêu đề**.
- Trần chống lạm dụng: giữ 5 phiếu/giờ; trần tin 30/giờ tách làm hai: người gửi 30, người xử lý 120.

## 4. Đợt 2 (chỉ phác, sẽ có đặc tả riêng)

Khung chat bong bóng: tin mới hiện bằng **tuyến đọc thuần** `?since=` (không ghi), 5 giây khi tab mở, dừng khi tab ẩn; mốc «đã xem» chỉ ghi lúc mở phiếu hoặc khi có tin mới (tuyến chi tiết hiện gọi `markSeen` mỗi lần, nên không dùng làm tuyến làm mới). Mức ưu tiên, `order_code` (tham chiếu, không khoá ngoại), `WAITING` (cần luật chuyển, `statusAfterSubmitterReply`, SQL phản chiếu, thanh bước), loại `REQUEST`, thông báo đẩy cho thành viên nhóm. Cập nhật `tro-ly-cau-truc-ten.ts` để trợ lý mô tả đúng quyền Góp ý.

## 5. Ngoài phạm vi cả hai đợt

SLA và cảnh báo quá hạn; câu trả lời mẫu; khảo sát; đính kèm tệp/ảnh (cần kho tệp, ADR riêng); mở đầy đủ cho bên ngoài; chat thời gian thực và «đang soạn» (Durable Objects, ghi `docs/BACKLOG.md`); tự định tuyến theo nội dung; email hai chiều.

## 6. Bài kiểm máy hiện có sẽ đỏ (phải sửa cùng đợt 1)

Người kiểm độc lập liệt kê, đặc tả ghi lại để kế hoạch tính vào việc:
- `src/modules/feedback/rules.test.ts` (đối chiếu catalog với tệp `*_feedback.sql`: phải đọc mọi migration chạm `fbk_*`).
- `src/route-access.test.ts` (bảng route/cổng khoá cứng) và `src/route-write-guard.test.ts` (`GUARDS`, `ADMIN_OPS`).
- `src/shared/permissions.test.ts` (ghim từng dòng; thêm ô `feedback.team.manage`; số bài «tập con quyền» đổi).
- `src/modules/audit/an-toan-quyen.test.ts` và `src/modules/accounts/hanh-chinh-nhan-su.test.ts` (khẳng định Quản trị/Nhân sự nhận 403 ở hàng đợi: giữ đúng với tuyến cũ, thêm ca cho tuyến mới).
- Bài ADR-0094 (`lan-gui-phu-route`), bài sổ SQL `defineSql`, `architecture.test.ts` (không phải sửa nếu giữ cạnh như 3.5).
- `typecheck`: bảng `Record<FeedbackStatus,…>` khi thêm trạng thái (đợt 2).

## 7. Rủi ro và điều chưa chắc

- **R1 — bản đồ quyền bị đọc nhầm (bài học 24/9).** Quyền đọc phiếu nay phụ thuộc dữ liệu thành viên. Cần bài ở cả route lẫn giao diện (người ngoài nhóm, Quản trị với nhóm nhạy cảm, thành viên bị gỡ/khoá giữa chừng, người gửi vừa là thành viên, chuyển sang nhóm nhạy cảm, hai người nhận việc cùng lúc) và một dòng Sổ hàng rào có ngày quan sát chặn thật.
- **R2 — người gửi vừa là thành viên nhóm nhận:** ghi chú nội bộ của phiếu chính họ gửi **ẩn** (mục 3.2). Chủ xác nhận.
- **R3 — chặn dây chuyền:** người kiểm chỉ thấy dòng nhắc Góp ý ở `docs/SO-HANG-RAO.md`, chưa tự xác nhận `docs/quyen-hoan.json` không có mục dính Góp ý; tôi cũng chỉ tìm chuỗi `feedback` trong tệp này và không thấy. **Kiểm lại ngày duyệt**, ghi «xây trên lỗ đang hở: <mã>» nếu có.
- **R4 — nhóm không còn thành viên nào:** phiếu vẫn lưu; hàng đợi nhóm hiển thị «Nhóm chưa có người nhận» cho Toàn quyền; email chung vẫn báo.
- **Chưa kiểm:** quy tắc `ADD COLUMN` trên D1 thật; giao diện hiện có hiện Góp ý cho tài khoản bên ngoài hay không; số phiếu thật trên production (để biết nạp mặc định ảnh hưởng bao nhiêu dòng).

## 8. Quyết định chủ phải duyệt (đợt 1, ba nhóm chạm quyền/dữ liệu)

1. **Đổi nghĩa `feedback.triage`** (Toàn quyền **hoặc** thành viên nhóm giữ phiếu) kèm ô mới `feedback.team.manage`, đổi cổng hàng đợi `admin → staff` và khai hàm kiểm thành viên vào `GUARDS`. Sửa một phần ADR-0038. Một chiều ở chỗ quyền đã mở cho thành viên thì thu lại phải báo lại cho họ.
2. **Nhóm nhạy cảm và các quy tắc đi kèm:** Quản trị/Nhân sự không đường tắt, Toàn quyền thấy tất cả, người gửi-vừa-là-thành-viên (R2), tài khoản bên ngoài chỉ gửi nhóm Kỹ thuật.
3. **Migration thêm cột và bảng** (phiếu cũ nạp vào Kỹ thuật bằng giá trị mặc định cố định; chưa thấy cách nạp nào ghi đè dữ liệu).

## 9. Trang ghép (bắt buộc khi duyệt)

**(1) Bảng `fbk_ticket` chứa gì:** chỉ phiếu hỗ trợ (BUG/IDEA/QUESTION) của người dùng đăng nhập; không chứa hồ sơ khách, đối tác, tiền, giấy tờ. Sau thay đổi vẫn thế; chỉ thêm «thuộc nhóm nào».

**(2) Dòng quyền chạm bảng này, theo mười mã quyền:**

| Ô | Ai | Ghi chú |
|---|---|---|
| `feedback.submit` | cả 10 mã | bên ngoài chỉ nhóm Kỹ thuật (luật mới trong route) |
| `feedback.view` | `own` 9 mã, `any` Toàn quyền | thêm: thành viên nhóm đọc phiếu nhóm mình (qua hàm thuần) |
| `feedback.triage` | ô: Toàn quyền | thực tế: Toàn quyền hoặc thành viên nhóm giữ phiếu |
| `feedback.team.manage` (mới) | Toàn quyền | quản lý nhóm, thành viên, cờ nhạy cảm |
| chuyển nhóm | Toàn quyền, Trưởng nhóm | không có ô; qua hàm thuần |

**(3) Cổng nào canh cửa nào:** máy chủ — cổng `staff` cho mọi tuyến `/api/feedback*` rồi hàm thuần `quyenXuLyPhieu` trong thân; tuyến cũ `GET /api/feedback` giữ cổng `admin` + `feedback.triage`. Chỗ giao diện ẩn/hiện bị đổi nghĩa (không chỉ route): mục menu «Hỗ trợ» và huy hiệu (`web/shell.ts`), `GET /api/feedback/badge`, thẻ «Hộp thư» ở Trang chủ (`web/home.ts`), mục Góp ý ở `web/dashboard-review.ts` và `web/account.ts`, lời trợ lý (`tro-ly-cau-truc-ten.ts`), thống kê tuần của hàng đợi, nhật ký (tiêu đề phiếu nhạy cảm), email chung.

## 10. Tiêu chí nghiệm thu đợt 1 (viết trước khi làm, P20)

- Bài thuần cho `quyenXuLyPhieu` đủ ca ở R1; bài route đi đường thật, mỗi tuyến `/api/feedback*` có ca «người ngoài nhóm ⇒ 404/rỗng».
- Bài migration trên D1 local: phiếu cũ có `team_id` Kỹ thuật, số dòng không đổi.
- Kịch bản Chrome trên cỡ iPhone 375px: gửi phiếu tới nhóm, thành viên nhận việc, trả lời, người gửi thấy.
- Hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
- `npm test`, `npm run typecheck`, e2e xanh; **người kiểm độc lập** (việc lớn) trước khi báo xong; không tự nghiệm thu.

## 11. Cách giao hàng

Một ADR cho đợt 1 (số lớn nhất trên mọi nhánh + 1) kèm trang ghép này; thi công ba lát đỏ→xanh: (1) dữ liệu + hàm thuần quyền; (2) API + sửa các bài kiểm ở mục 6; (3) giao diện. Triển khai production do **chủ tự chạy** theo `docs/HANDOFF-N1.md` (AI chỉ chuẩn bị lệnh); bản phát hành cần mục nhật ký thay đổi mới.
