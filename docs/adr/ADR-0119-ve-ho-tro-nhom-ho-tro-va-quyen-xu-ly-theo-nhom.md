# ADR-0119 — Vé hỗ trợ đợt 1: nhóm hỗ trợ và quyền xử lý phiếu theo tư cách thành viên nhóm

- **Trạng thái:** **accepted — chỉ đợt 1** — chủ dự án, chat 2026-10-15: *"Duyệt cả ba, viết ADR và kế hoạch đợt 1 đi"*, trả lời ba nhóm quyết định ở mục 8 của đặc tả `docs/superpowers/specs/2026-10-14-ve-ho-tro-design.md` (bản 2, commit `3ed20c45`, đã qua một vòng kiểm độc lập). Đợt 2 (khung chat, mức ưu tiên, mã đơn, trạng thái «Chờ người gửi bổ sung», thông báo đẩy cho thành viên) **chưa duyệt**, cần đặc tả riêng.
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Người kiểm độc lập đọc lại sau khi thi công (việc lớn: quyền, dữ liệu).
- **Ngày:** 2026-10-15.
- **Số:** 0119. Lúc soạn, `0118` đã dùng ở nhánh khác (đợt 2 giá đưa đón) nên số này là số kế tiếp trên mọi nhánh; **kiểm lại số trước khi gộp** (`git ls-tree --name-only <nhánh> docs/adr/` cho mọi nhánh). Migration dự kiến: `0099` (lúc soạn nhánh khác đã có đến `0098`); kiểm lại tương tự.
- **Loại:** việc lớn (dữ liệu: thêm bảng và cột; quyền: đổi nghĩa ô `feedback.triage`, đổi cổng router). Dữ liệu chỉ-thêm nên đảo được về cấu trúc; một chiều ở chỗ quyền đã mở cho thành viên nhóm thì thu lại phải báo lại cho họ.
- **Sửa/bổ sung:** sửa **một phần ADR-0038** (Góp ý chỉ Toàn quyền xử lý): Toàn quyền vẫn xử lý được tất cả, thêm thành viên nhóm xử lý phiếu của nhóm mình. Không sửa thân ADR cũ. Bổ sung ADR-0019 điều 2 (hàm kiểm quyền mới được khai vào `GUARDS`). Không chạm ADR-0094.
- **Xây trên lỗ đang hở:** không. `docs/quyen-hoan.json` không có mục nào dính Góp ý/`feedback` (chủ xác nhận lại khi gộp); đợt này không ghi tiền, không chạm Sổ đại lý.

## Quyết định

1. **Phiếu thuộc một nhóm hỗ trợ.** Toàn quyền tạo, ngưng nhóm và gán thành viên (vai Trưởng nhóm hoặc Thành viên). Gieo sẵn bốn nhóm: Kỹ thuật, Kế toán, Nhân sự, Điều hành; phiếu cũ nằm trong nhóm Kỹ thuật bằng giá trị mặc định cố định, không viết lại dòng nào.
2. **Quyền xử lý phiếu = Toàn quyền, hoặc thành viên đang hiệu lực (tài khoản còn hoạt động) của nhóm giữ phiếu và không phải người gửi phiếu đó.** Quyết định bằng một hàm thuần duy nhất (`quyenPhieu`), dùng cho mọi route; ô `feedback.triage` trong `MATRIX` giữ nguyên (chỉ Toàn quyền). Thêm ô `feedback.team.manage` (tạo/ngưng nhóm, gán/gỡ thành viên): chỉ Toàn quyền. Chuyển nhóm và giao việc cho người khác: Toàn quyền và Trưởng nhóm của nhóm đang giữ phiếu; nhận việc cho mình: thành viên.
3. **Cổng router đổi:** hàng đợi nhóm và các tuyến xử lý mới đứng ở cổng `staff` (không còn `admin`), mặc định từ chối trong thân route. Hàm `quyenPhieu` khai vào `GUARDS` của `src/route-write-guard.test.ts` (sửa hàng rào: dòng mới ở `docs/SO-HANG-RAO.md`, có ngày quan sát chặn thật). Tuyến cũ `GET /api/feedback` và `PATCH /api/feedback/:id` giữ nguyên cổng `admin` + `feedback.triage` (Quản trị và Nhân sự vẫn 403) và gỡ ở lần phát hành sau (expand–contract).
4. **Nhóm nhạy cảm (Kế toán, Nhân sự):** Quản trị và Nhân sự không có đường tắt (thiết kế không có đường tắt nào ngoài Toàn quyền); Toàn quyền thấy tất cả. Cờ `sensitive` đợt 1 làm hai việc cụ thể: nhật ký ghi **mã phiếu** thay vì tiêu đề, và email chung **không kèm tiêu đề/nội dung** (chỉ «Có phiếu mới cho nhóm …»).
5. **Ghi chú nội bộ thuộc về nhóm đã viết nó** (cột `team_id` trên tin): sau khi chuyển nhóm, nhóm mới không đọc ghi chú của nhóm cũ; Toàn quyền đọc tất cả. Người gửi **không bao giờ** thấy ghi chú nội bộ, kể cả khi người gửi cũng là thành viên nhóm nhận (với phiếu chính họ gửi, họ chỉ là người gửi).
6. **Tài khoản bên ngoài** (`PARTNER`, `DRIVER_PARTNER`) giữ hành vi hiện có (gửi và xem phiếu của mình), nhưng **chỉ tới nhóm Kỹ thuật**; máy chủ từ chối nhóm khác và danh sách nhóm của họ chỉ có Kỹ thuật.
7. **Chưa đọc tính riêng từng người** (bảng `fbk_ticket_read`), thay mốc `admin_seen_at` dùng chung. Thống kê tuần của hàng đợi lọc theo nhóm; huy hiệu đếm «chưa đọc của tôi + phiếu chưa đọc ở nhóm tôi».
8. **Chuyển nhóm** bỏ người xử lý hiện tại, đưa «Đang xử lý» về «Đã tiếp nhận» (do chính câu lệnh chuyển nhóm đặt, không đi qua bảng luật chuyển trạng thái thủ công, vì bảng đó không có đường «Đang xử lý» → «Đã tiếp nhận»; không thêm trạng thái mới ở đợt này), ghi sự kiện và nhật ký. **Nhận việc** là câu cập nhật có điều kiện `assignee_id` trống hoặc không còn hoạt động (hai người bấm cùng lúc: một thắng, một nhận 409). **Tài khoản bị khoá** mất quyền ngay vì truy vấn thành viên luôn nối tài khoản còn hoạt động.
9. **Email báo vẫn một địa chỉ chung** (`FEEDBACK_NOTIFY_EMAIL`, như nay); thêm tên nhóm vào tiêu đề. Email/thông báo đẩy tới từng thành viên nhóm là đợt 2 (bảng nhân viên không có email; thông báo đẩy nằm ở module `thongbao`, cạnh `feedback → thongbao` chưa khai trong `ALLOWED_EDGES`, nên cần quyết định riêng).

## Điều phải nói thẳng

- Đổi nghĩa `feedback.triage` nghĩa là **quyền đọc phiếu nay phụ thuộc dữ liệu thành viên**, không chỉ bản đồ `MATRIX`. Đây đúng là dạng lỗi bài học 24/9 («bản đồ được đọc nhầm là đang thi hành»), nên tiêu chí nghiệm thu bắt buộc có bài chạy đường thật cho từng ca người ngoài nhóm (kế hoạch ghi rõ).
- Cờ `sensitive` đợt này **không** phân biệt thêm quyền đọc (vì không có đường tắt nào để bỏ); nó chỉ che tiêu đề ở nhật ký và email. Nếu sau này có đường tắt cho Quản trị, cờ mới có thêm tác dụng.
- Chủ thấy phiếu mọi nhóm; chưa có che tên người gửi với phiếu Nhân sự. Nếu cần che thì là quyết định mới.

## Phương án bị loại

- **Nhóm = mã quyền có sẵn (Kế toán = quyền `ACCOUNTING`):** đơn giản nhưng cứng, không thêm được nhóm tuỳ ý; chủ chọn nhóm do Toàn quyền tạo.
- **Module `support` mới song song:** sạch hơn nhưng phải sống chung hai hệ thống phiếu và chuyển dữ liệu thật trên production; rủi ro cao hơn.
- **Chat nhúng của bên thứ ba:** hai nơi lưu hội thoại, nội dung nhạy cảm rời D1, không biết quy tắc nhóm. Chat thời gian thực thật (nếu cần) dùng Durable Objects, đã ghi `docs/BACKLOG.md` mục 30.
- **Thêm ô `feedback.transfer` vào `MATRIX`:** Trưởng nhóm không biểu diễn được bằng ô quyền; đi qua hàm thuần cho gọn và đúng chỗ.

## Hệ quả

- Thêm bảng `fbk_team`, `fbk_team_member`, `fbk_ticket_event`, `fbk_ticket_read` và cột `team_id` ở `fbk_ticket`, `fbk_message`; cập nhật `docs/data-dictionary.json` + `npm run dict`.
- Một hàng rào quyền mới (`quyenPhieu` trong `GUARDS`) phải có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
- Các bài kiểm máy sẽ đỏ và phải sửa cùng đợt (liệt kê ở mục 6 của đặc tả): `route-access.test.ts`, `route-write-guard.test.ts`, `permissions.test.ts`, `an-toan-quyen.test.ts`, `hanh-chinh-nhan-su.test.ts`.
- Cột `admin_seen_at` thành cột chết (không còn đọc); gỡ ở lần phát hành sau.
- Triển khai production do chủ tự chạy theo `docs/HANDOFF-N1.md`; migration chỉ thêm nên áp trước `wrangler deploy` là an toàn, hoàn tác bằng `wrangler rollback` (không cần xoá bảng).
- Kế hoạch thi công: `docs/superpowers/plans/2026-10-15-ve-ho-tro-dot-1.md`.
