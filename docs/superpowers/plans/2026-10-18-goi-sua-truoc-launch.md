# Gói sửa trước launch: bốn việc của chủ dự án

> Loại tài liệu: hồ sơ có ngày 18/10/2026, gói sửa trước launch; trỏ về hồ sơ rà soát 17/10 (`docs/superpowers/specs/2026-10-17-ket-qua-ra-soat-truoc-launch.md`, bảng «Điều kiện trước khi mở»). Viết xong là đóng băng; có gì mới thì viết bản mới trỏ về đây.

Hồ sơ rà soát 17/10 nêu sáu điều kiện trước khi mở Nền tảng cho nhân viên. Việc 2 (sửa câu thông báo giao đơn) và việc 3 (ghi trạng thái bản 2.16) do AI làm trên nhánh, nên việc 2 chỉ lên production sau khi bạn chạy lệnh gộp rồi lệnh triển khai theo thông lệ. Bốn việc còn lại (1, 4, 5, 6) là của bạn, các bước ở dưới. Vì chế độ bảo trì tự tắt lúc 07:17 sáng 19/10, bạn nên làm việc 1 trước, hoặc ít nhất đọc quy tắc quyết ở cuối mục đó.

| Việc | Ai làm | Xong khi nào |
|---|---|---|
| 1. Chế độ bảo trì tự tắt 07:17 sáng 19/10 | Bạn | Bạn đã quyết mở hay gia hạn, trước khoảng 06:00 sáng 19/10 |
| 2. Sửa câu thông báo giao đơn | AI làm; bạn gộp và triển khai | Bản sửa đã lên production (bạn chạy lệnh gộp, rồi lệnh triển khai) |
| 3. Ghi trạng thái bản 2.16 | AI làm trên nhánh | Bạn duyệt và gộp cùng đợt với việc 2 |
| 4. Giữ hay dọn dữ liệu thử | Bạn quyết | Bạn đã chọn phương án và ghi giờ làm điểm khôi phục |
| 5. Thử Góp ý và chốt người trực | Bạn | Thư báo về hộp thư, bảng người trực đã điền |
| 6. Chọn mức mở | Bạn | Bạn đã chọn mức mở và tạo xong tài khoản đợt đầu |

## Việc 1. Chế độ bảo trì tự tắt 07:17 sáng 19/10

Máy chủ tự coi chế độ bảo trì là tắt khi tới giờ dự kiến hoàn tất, nên đến lúc đó không cần ai bấm gì và mọi nhân viên đăng nhập được ngay (`src/shared/maintenance.ts:23-31`). Kiểm lúc soạn tài liệu bằng địa chỉ công khai `/api/auth/config`: chế độ đang bật, giờ kết thúc là `2026-10-19T00:17:00Z`, tức 07:17 sáng 19/10 giờ Việt Nam; phiên bản đang chạy là 2.16.

Chỉ tài khoản Toàn quyền bật, tắt hay gia hạn được (`src/shared/permissions.ts:190`, ô `settings.ops`; `CLAUDE.md` §10 cũng ghi chỉ chủ dùng được). Cách bấm: đăng nhập, mở trang của bạn (trên máy tính là mục «Của tôi» ở chân menu bên trái, trên điện thoại là tab «Tôi»; `src/shared/muc-giao-dien.ts`), kéo xuống mục «Chế độ bảo trì» (`web/account.ts:824`). Để gia hạn khi đang bật, chọn nút nhanh «30 phút», «60 phút», «120 phút» hoặc ô «Hoặc chọn giờ dự kiến hoàn tất (giờ Việt Nam)», rồi bấm «Cập nhật giờ dự kiến». Để tắt ngay, bấm «Tắt chế độ bảo trì». Giờ hoàn tất không được quá 7 ngày kể từ lúc bấm (`src/shared/maintenance.ts:14,58`).

Quy tắc quyết: nếu đến khoảng 06:00 sáng 19/10 mà việc 2 chưa lên production, hoặc việc 4, 5, 6 chưa xong, bạn hãy gia hạn thêm (ví dụ chọn giờ của chiều hoặc tối 19/10), vì sau 07:17 mọi người vào được và không còn gì giữ lại. Nếu đã mở rồi mà có sự cố, bật lại ngay trên cùng mục đó: chọn giờ, bấm «Bật chế độ bảo trì», rồi bấm «Xác nhận bật»; lúc đó mọi tài khoản khác bị chặn ngay, kể cả người đang mở Nền tảng. Nếu chính bạn bị khoá ngoài, đường dự phòng nằm ở mục «Chế độ bảo trì — đường thoát khẩn» của `docs/HANDOFF-N1.md`; đó là thao tác ghi lên dữ liệu thật, nên chỉ làm khi bạn ra lệnh cho AI soạn lệnh từ mục đó.

## Việc 4. Giữ hay dọn dữ liệu thử trên production

Tài liệu đang ghi rằng production chỉ có dữ liệu thử nhưng người viết chưa đọc được dữ liệu thật nên chưa kiểm (`docs/superpowers/specs/2026-10-13-nghiem-thu-phien-va-san-sang-su-dung.md`, mục 5 điểm 1 và mục 6); sổ hoãn mục TNV-G1 ghi «dữ liệu là demo» (`docs/HANDOFF-N1.md`, dòng ghi ngày 2/10) và đã gia hạn tới 30/11 (`docs/quyen-hoan.json`). Trước hết, chạy lệnh đếm chỉ-đọc sau trong thư mục `/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales`, nhánh main, để biết thực tế có bao nhiêu:

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT (SELECT COUNT(*) FROM orders WHERE status='draft') AS don_nhap, (SELECT COUNT(*) FROM orders WHERE status='confirmed') AS don_da_xac_nhan, (SELECT COUNT(*) FROM orders WHERE status='cancelled') AS don_da_huy, (SELECT COUNT(*) FROM staff WHERE active=1) AS tai_khoan_dang_dung, (SELECT COUNT(*) FROM staff) AS tai_khoan_tong, (SELECT COUNT(*) FROM bil_payment_receipt) AS dong_thu_tien, (SELECT COUNT(*) FROM pty_party WHERE party_kind='PERSON') AS ho_so_ca_nhan, (SELECT COUNT(*) FROM pty_party WHERE party_kind='ORGANIZATION') AS ho_so_to_chuc"
```

Phương án (a), khuyến nghị: giữ và đánh dấu. Nền tảng không xoá cứng dữ liệu (`CLAUDE.md` §7), nên phần «giữ nguyên dữ liệu và ghi một ngày mốc» đảo ngược được, không rủi ro: bạn ghi một ngày mốc «dữ liệu thật bắt đầu từ …» để Kế toán lọc báo cáo. Nếu muốn đơn thử khỏi lẫn vào danh sách việc, bạn có thể huỷ chúng bằng nút «Huỷ đơn» trên trang đơn, nhưng riêng bước huỷ thì KHÔNG đảo ngược được (phải chọn lý do, máy ghi rõ «Việc huỷ không hoàn tác được»; `web/order.ts:1408,1433`) và có chạm sổ tiền, nên chỉ huỷ đơn chắc chắn là thử. Với đơn đã thu tiền trước: theo ADR-0089 và sổ hoãn TNV-G1, đơn huỷ có tiền đã thu thì «còn phải thu» về 0 và tiền thu trước mặc định được giữ lại trong sổ, muốn đưa về 0 phải hoàn qua đường duyệt hai bước; tôi chưa thử đúng ca này trên production nên ghi «chưa kiểm». Nhớ rằng 6 ca sổ vàng «huỷ đơn có thu trước» còn chờ Kế toán xác nhận (hồ sơ 17/10, mục T-11), nên đừng tin số tiền của loại đơn này khi chưa có chữ ký đó.

Phương án (b): khôi phục Time Travel về một mốc trước dữ liệu thử. Cách này lùi cả cấu trúc dữ liệu, tức các migration áp sau mốc biến mất và phải lùi luôn mã Nền tảng tương ứng; chỉ lùi được trong khoảng thời gian Time Travel cho phép (chưa kiểm gói Cloudflare đang dùng); cần runbook riêng và người kiểm độc lập. Tôi không khuyến nghị.

Dù chọn gì, trước khi nạp dữ liệu thật hãy ghi lại giờ (theo giờ Việt Nam) làm điểm khôi phục, hoặc lấy điểm khôi phục bằng lệnh chỉ-đọc dưới đây rồi chép kết quả vào `docs/HANDOFF-N1.md`:

```
npx wrangler d1 time-travel info tourdao-sales-db
```

## Việc 5. Thử Góp ý trên production và chốt người trực

Thư báo Góp ý gửi tới địa chỉ nằm trong bí mật `FEEDBACK_NOTIFY_EMAIL`, từ địa chỉ trong bí mật `FEEDBACK_MAIL_FROM`, qua dịch vụ gửi thư của Cloudflare (`src/modules/feedback/notify.ts:30-34`; `docs/HANDOFF-FEEDBACK.md`, mục cấu hình). Thiếu một trong hai bí mật thì thư không đi mà Nền tảng không báo lỗi lúc gửi (hàm trả «skipped», yêu cầu vẫn được lưu; `notify.ts:68-71`), chỉ có một dòng nhỏ «Chưa gửi được email báo nhóm» hiện ở yêu cầu đó, và dòng này chỉ hiện trong hàng chờ xử lý của Toàn quyền, KHÔNG hiện ở tài khoản thường đã gửi thử (`web/feedback.ts:148`; `src/modules/feedback/index.ts:330`). Vì vậy sau khi gửi thử, bạn mở hàng chờ bằng tài khoản Toàn quyền để xem có dòng đó không. Phiếu thuộc nhóm nhạy cảm thì thư không kèm tiêu đề hay nội dung (`notify.ts:44-49`).

Các bước: đăng nhập bằng một tài khoản thường, mở mục «Hỗ trợ» ở chân menu, bấm «+ Gửi yêu cầu mới» (`src/shared/muc-giao-dien.ts:194`, `web/feedback.ts:158`), gửi một yêu cầu thử rồi chờ thư. Nếu không thấy thư sau vài phút, hãy kiểm tên bí mật bằng lệnh sau, chạy ở `/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales`, nhánh main; lệnh chỉ liệt kê TÊN, không hiện giá trị:

```
npx wrangler secret list
```

Thấy đủ `FEEDBACK_NOTIFY_EMAIL` và `FEEDBACK_MAIL_FROM` mà thư vẫn không về thì báo AI xem nhật ký Worker; chưa kiểm việc tên miền gửi thư đã xác minh trên Cloudflare. Một điểm cần biết: khi người dùng gửi phiếu xin xoá dữ liệu, hiện không có ai được báo, Quản trị chỉ thấy ở hàng chờ trong Danh bạ (`docs/BACKLOG.md`, mục `BL-XOA-BAO`), nên người trực phải mở hàng chờ đó mỗi ngày trong tuần đầu.

Bảng để bạn điền (không ghi số điện thoại cá nhân vào tài liệu này):

| Mục | Điền |
|---|---|
| Người trực chính | |
| Người trực dự phòng | |
| Khung giờ trực tuần đầu | |
| Kênh liên lạc (nhóm chat, hộp thư chung) | |

## Việc 6. Chọn mức mở

Khuyến nghị: mở cho khoảng 30 nhân viên nội bộ trước, Đối tác (khoảng 1.000 tài khoản) mở theo đợt sau. Lý do nằm ở ADR-0121 (đã duyệt 16/10): Đối tác cũng phải có lớp bảo mật thứ hai, bật theo đợt bằng một cờ của Toàn quyền, đợt đầu khoảng 5 người, sau đó khoảng 100 người mỗi đợt, và chỉ nên bắt đầu khi lớp email chạy ổn (`docs/adr/ADR-0121-lop-hai-bat-buoc-cho-tai-khoan-ben-ngoai.md`, điều 3). Hồ sơ rà soát 17/10 ghi phần bắt buộc này cho Đối tác chưa có mã; tôi cũng chưa thấy cờ đó trong mã, nên hiện Đối tác chưa bị bắt bật lớp hai (`mfa-rules.ts:35-40` chỉ chặn tài khoản nội bộ).

Tài khoản chỉ tạo được từng cái một: mở trang quản lý tài khoản (trên máy tính là «Quản lý tài khoản» trong nhóm Thiết lập, trên điện thoại là tab «Tài khoản»; `src/shared/muc-giao-dien.ts`), điền khung «Thêm tài khoản» (họ tên, số điện thoại, vai và quyền) rồi bấm «Tạo tài khoản» (`public/staff.html:10-19`). Chỉ Toàn quyền và Nhân sự tạo được; Quản trị thì không (`src/shared/permissions.ts:182`, `src/modules/accounts/index.ts:475`). PIN hiện đúng một lần ngay sau khi tạo, bạn gửi riêng cho từng người, không gửi vào nhóm chung, và họ nên tự đổi PIN sau khi đăng nhập (`web/staff.ts:52`). Quên PIN thì dùng nút «Đặt lại PIN» ở dòng người đó. Về «cửa sổ đóng băng» trong `docs/HANDOFF-N1.md` (mục «Triển khai — HAI lần phát hành (expand–contract)»): đó là quy tắc của lần phát hành N1 ngày 21/9, cấm tạo hoặc sửa tài khoản cho tới khi chắc không phải lùi Worker về bản trước N1. Tôi không thấy tài liệu hiện hành nào gia hạn quy tắc đó cho bản 2.16, và đã có hơn một trăm migration kể từ đó, nên không thấy gì đang cấm; tuy vậy, tạo tài khoản thật thì các tài khoản này sẽ mất nếu sau này khôi phục Time Travel, nên hãy lấy điểm khôi phục (việc 4) trước.

Bảo mật hai lớp (ADR-0074, migration `0101`): mọi tài khoản nội bộ đang hoạt động được ân hạn 14 ngày tính từ lúc migration áp (`migrations/0101_aut_mfa.sql`, câu `UPDATE staff SET mfa_grace_until`), tài khoản tạo mới có ân hạn 14 ngày riêng tính từ lúc tạo (`src/modules/staff/rules.ts:85-92`). Hết ân hạn mà chưa bật thì đăng nhập bằng PIN bị chặn với câu «Tài khoản cần bật bảo mật hai lớp. Liên hệ Quản trị để được hỗ trợ.» (`src/modules/auth/mfa-rules.ts:35-40`, `src/modules/auth/index.ts:310,540`). Đăng nhập bằng Face ID không bị chặn: cổng này chỉ được gọi ở đường đăng nhập PIN (một nơi gọi duy nhất, `index.ts:539`), tôi chưa thử trên máy thật. Quản trị, Toàn quyền và Kế toán chỉ được dùng ứng dụng xác thực, không dùng email (`mfa-rules.ts:12-15`). Ngày hết ân hạn: hạn tính từ lúc áp `0101`. Tệp `0101` ra đời tối 15/10 (commit `d26b733a`) và đã nằm sẵn trong mã của bản 2.11 (commit `01695a3c`, lên production 17/10 20:58, lúc đó production báo không còn migration nào chờ), nên `0101` được áp trong khoảng từ tối 15/10 tới chậm nhất 17/10 20:58. Vậy tài khoản cũ hết ân hạn trong khoảng từ tối 29/10 tới chậm nhất tối 31/10; đợt rà 17/10 ước khoảng 05:10 sáng 30/10. Khoảng này là suy luận từ lịch sử mã, chưa đọc dữ liệu thật; hãy chạy hai lệnh chỉ-đọc dưới đây để biết ngày thật (giờ lưu theo UTC, cộng 7 tiếng ra giờ Việt Nam), và cứ coi tối 29/10 là hạn chót cho tới khi có số thật. Lệnh thứ nhất đọc ngày áp `0101` (bảng `d1_migrations` do wrangler tạo, tên cột `applied_at` chưa kiểm trong mã):

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT name, applied_at FROM d1_migrations WHERE name LIKE '0101%'"
```

Lệnh thứ hai cho biết ngày hết ân hạn sớm nhất và muộn nhất, và số tài khoản đã hay chưa bật lớp hai (không in số điện thoại hay email):

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(*) AS tai_khoan_dang_hoat_dong, MIN(mfa_grace_until) AS han_som_nhat, MAX(mfa_grace_until) AS han_muon_nhat, SUM(CASE WHEN EXISTS (SELECT 1 FROM aut_mfa_factor f WHERE f.staff_id = staff.id AND f.valid_to_at IS NULL) THEN 1 ELSE 0 END) AS da_bat_lop_hai FROM staff WHERE active = 1"
```

Cột `da_bat_lop_hai` đếm mọi tài khoản có một yếu tố đang sống; trường hợp hiếm tài khoản Quản trị, Toàn quyền hoặc Kế toán chỉ có dòng email lệch thì máy vẫn coi là chưa bật (`mfa-rules.ts:17-23`), nên con số này có thể cao hơn thực tế một chút.

Khuyến nghị kèm: bạn tự bật lớp hai trước (trang của bạn — «Của tôi» trên máy tính, «Tôi» trên điện thoại — mục «Bảo mật đăng nhập»; `web/account.ts:702`), và tạo thêm một tài khoản Toàn quyền thứ hai trước tối 29/10, để nếu một người mất điện thoại hoặc hết ân hạn thì vẫn còn người vào tắt lớp hai giúp (nút «Tắt bảo mật hai lớp» ở trang «Tài khoản», `web/staff.ts:110`).

---
Nhắc cuối: trước lần bấm «Thực hiện» xoá dữ liệu đầu tiên trên production, phải làm bước 5 và bước 6 của runbook xoá dữ liệu (migration `0108`) ở đầu `docs/HANDOFF-N1.md`.
