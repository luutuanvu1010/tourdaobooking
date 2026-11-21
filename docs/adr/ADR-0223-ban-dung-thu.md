# ADR-0223 — Bản dùng thử riêng, tự làm sạch mỗi 2 giờ; chọn vai sau PIN chỉ trên bản dùng thử

- **Trạng thái:** **proposed** 2026-11-21 — AI soạn, chưa duyệt (Hiến pháp N3). Số 0223 do phiên điều phối kế hoạch 16 việc giữ trước cho Việc 1.
- **Lời giao việc của chủ dự án** (21/11/2026, qua kế hoạch 16 việc, mục 5 «Việc 1»): tài khoản dùng thử cho người ngoài, dữ liệu tự xoá mỗi 2 giờ, bản chính không bị chạm.
- **Nguồn:** `docs/superpowers/specs/2026-11-21-ban-dung-thu/DAC-TA.md` (kết quả bước 0, đo ở máy 21/11).
- **Loại:** việc lớn (triển khai, quyền). **Cửa:** hai chiều — tắt bản dùng thử (xoá Worker và tài nguyên của nó) không ảnh hưởng bản chính.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này:** 1. Trang ghép: mục «Trang ghép» cuối tệp.
- **Xây trên lỗ đang hở:** không. Sổ hạn hiện mở HC-5.19 (diễn tập khôi phục D1) và HC-4.2; bản dùng thử không chạm hai mục đó vì D1 của nó độc lập và dữ liệu là giả, mất đi thì nạp lại từ bản mẫu.
- **Quan hệ với quyết định cũ:** cùng khuôn với ADR-0162 (bản Development) về độc lập tài nguyên, nhưng là **bản thứ ba**: Development chạy nhánh đang thử, bản dùng thử chạy mã đang phát hành. Là **ngoại lệ chỉ trên bản dùng thử** của ADR-0187 Đ1.4 («xem như vai khác» chỉ Toàn quyền), luật một máy (ADR-0075, chính sách ở ADR-0085, `isSingleDevice`), bảo mật hai lớp bắt buộc cho vai nội bộ (ADR-0074) và chống dò PIN theo số điện thoại. Trên bản chính, mọi luật đó **giữ nguyên**.

## Đ1 — Bản riêng, độc lập hoàn toàn

Bản dùng thử là một Worker riêng ở một tên miền phụ của `tourdao.vn` (chủ chọn tên), với hai D1 (dữ liệu dùng thử; trạng thái khoá ở Đ5), các kho R2, trạm Bảng tin, bí mật, khoá Turnstile và khoá Face ID riêng, giống ADR-0162 Đ1. Không chép dữ liệu thật sang. Danh mục dịch vụ đọc cùng Google Sheet (chỉ đọc). Bài kiểm máy so **ba** cấu hình (chính thức, Development, dùng thử): đỏ khi hai bản dùng chung bất kỳ tên hay mã tài nguyên nào ngoài Sheet.

Mã chạy trên bản dùng thử là **mã đang phát hành** của bản chính; mỗi lần phát hành bản chính thì đưa lên bản dùng thử cùng mã. Ai được gõ lệnh đưa lên (chủ, hay AI như `len-dev` ở ADR-0162 Đ5) quyết khi thi công; mặc định là chủ gõ.

## Đ2 — Tự làm sạch mỗi 2 giờ bằng «xoá hết – nạp lại bản mẫu» trong Worker

1. Mỗi lần đưa mã lên bản dùng thử, máy sinh **bản mẫu sạch** từ cùng commit: toàn bộ lược đồ sau mọi migration, dữ liệu mẫu (đối tác, hoa hồng, hồ sơ là số giả; hồ sơ đối tác mẫu mang vai đối tác theo ADR-0185), không chứa PIN hay băm PIN. Bài kiểm máy so số dòng `d1_migrations` trong bản mẫu với thư mục `migrations/`, lệch thì đỏ (để bản mẫu cũ không lùi lược đồ). Bản mẫu nằm ở một đường do Worker trả lời (`run_worker_first`), người ngoài gọi thì 404.
2. Lịch chạy của Worker, ở các giờ chẵn **giờ Việt Nam**, xoá mọi bảng và view rồi nạp bản mẫu **cùng các dòng tài khoản đã băm PIN từ bí mật** (tài khoản dùng thử, tài khoản Toàn quyền của chủ) trong **một lô** (một giao dịch: hỏng thì quay về trạng thái trước, không bao giờ để D1 trống tài khoản). Sau lô mới dọn kho ảnh và đồng bộ danh mục từ Sheet; hai việc này hỏng thì lần chạy sau làm lại, dữ liệu vẫn dùng được.
3. **Hai khoá an toàn độc lập**, thiếu một là từ chối chạy: một biến môi trường **riêng** chỉ bản dùng thử có (không dùng lại `MOI_TRUONG`, vì bản Development cũng đặt biến đó), và một bảng dấu chỉ bản mẫu tạo ra (không migration nào tạo nó, nên D1 chính không bao giờ có). Có bài kiểm máy cho cả hai, đã quan sát chặn thật một lần, có dòng ở `docs/SO-HANG-RAO.md`.
3a. **Lần nạp đầu:** D1 mới tạo chưa có bảng dấu nên lệnh làm mới từ chối. Lần đầu, chủ gõ một lệnh có tên (khuôn `lam-moi-dev`, ADR-0162 Đ2) nạp bản mẫu vào D1 dùng thử; lệnh đọc cấu hình bản dùng thử, kiểm tên D1 kết thúc bằng hậu tố riêng của bản dùng thử ngay trước mỗi câu ghi, và hàng rào chặn AI gõ nó.
4. Không dùng Time Travel: cần khoá API trong Worker (chưa xác minh khoá giới hạn được vào một cơ sở dữ liệu), mốc cũ đi sau mỗi migration. Lý do đầy đủ ở đặc tả, mục 2.2.
5. Nếu D1 thật không nhận một lô cỡ đó (chưa kiểm, là bước nghiệm thu đầu tiên): chia vài lô kèm cờ «đang làm mới»; khi đó không còn nguyên tử và phải trình lại chủ.

## Đ3 — Đăng nhập dùng thử: chọn vai sau PIN (chỉ trên bản dùng thử)

1. Một tài khoản dùng thử, quyền thật tối thiểu. Sau PIN hiện «Bạn muốn dùng thử với vai nào?», chọn được **mọi vai trừ Toàn quyền**. Vai đã chọn ghi vào **phiên** (không đổi quyền thật của tài khoản); máy chủ hỏi bản đồ quyền theo vai đó như mọi tài khoản thường. Đây là lớp riêng của bản dùng thử, không mượn «Xem như vai trò khác» của ADR-0180 (đòi quyền thật Toàn quyền, hạn 60 phút). Phiên sống tới mốc làm mới. Muốn đổi vai thì đăng xuất rồi chọn lại.
2. Riêng tài khoản dùng thử: nhiều máy cùng lúc (bật bằng dữ liệu chính sách ADR-0085 trong bản mẫu nếu đủ, không rẽ nhánh mã), không bảo mật hai lớp, chống dò PIN đếm theo **địa chỉ mạng** thay vì theo số điện thoại (để một người gõ sai không khoá mọi người).
3. Vai Quản trị, Nhân sự chọn được nhưng máy chủ chặn mọi thay đổi trên **chính** tài khoản dùng thử (PIN, quyền, khoá) và trên tài khoản Toàn quyền của chủ, để một người thử không khoá được người khác.
4. Toàn quyền của chủ trên bản dùng thử vẫn theo luật thường (một máy, bảo mật hai lớp).
5. Mọi nới lỏng ở mục 1–3 bật bằng biến môi trường riêng của Đ2.3; có bài kiểm máy chứng minh trên cấu hình bản chính không có màn chọn vai, vẫn một máy, vẫn bảo mật hai lớp.

## Đ4 — Không gì đi ra ngoài

Không thư (`MOI_TRUONG` có giá trị + danh sách địa chỉ cho phép trống, như ADR-0162 Đ2), không thông báo đẩy, không Zalo. Đăng ký đối tác công khai tắt (không xác minh được email khi không gửi thư). Turnstile dùng khoá riêng. Mọi trang có dải cố định «BẢN DÙNG THỬ — dữ liệu tự xoá lúc …» (giờ tính từ cùng hằng với lịch làm mới; báo trước rằng mọi người sẽ bị đăng xuất). Máy tìm kiếm không lập chỉ mục.

## Đ5 — Khoá / mở

Toàn quyền khoá hoặc mở đăng nhập dùng thử ở nơi chủ chọn (khuyến nghị: ngay trên bản dùng thử). Trạng thái khoá nằm ở một D1 nhỏ thứ hai của bản dùng thử, **ngoài** phần bị làm sạch, có hiệu lực ngay.

## Hệ quả chủ cần biết

- Chủ tự tạo tài nguyên Cloudflare và đặt bí mật một lần, theo danh sách lệnh AI soạn sẵn (AI bị cấm chạy, CLAUDE.md §8).
- Chi phí thêm ước 0 đồng/tháng vì tài khoản ở gói trả phí (chủ xác nhận 21/9); bản dùng thử không chạy được ở gói miễn phí.
- Người dùng thử bị đăng xuất mỗi 2 giờ; dữ liệu mẫu không lộ lỗi chỉ dữ liệu thật mới có.

## Tiêu chí nghiệm thu

1. Lập đơn ở bản dùng thử với vai Đối tác ⇒ đơn không có ở bản chính.
2. Qua mốc làm mới ⇒ đơn mất, danh mục và tài khoản mẫu còn; lần làm mới đầu trên D1 thật chạy xong trong một lô (ghi thời gian vào nhật ký thi công).
3. Sửa cố ý: bỏ một trong hai khoá an toàn ⇒ bài kiểm đỏ, lệnh làm mới từ chối; hoàn nguyên ⇒ xanh; ghi ngày vào sổ hàng rào.
4. Khoá ⇒ đăng nhập dùng thử báo «đang tạm khoá», vẫn khoá sau mốc làm mới; Mở ⇒ vào lại được.
5. Gõ sai PIN dùng thử 5 lần từ một máy ⇒ máy khác vẫn đăng nhập được.
6. Chọn vai Quản trị, thử đổi PIN của tài khoản dùng thử ⇒ máy chủ từ chối.
7. Không thư, thông báo nào gửi ra ngoài; trang đăng ký đối tác báo đang tắt.

## Trang ghép (CLAUDE.md §9)

(1) Bản dùng thử không thêm loại thực thể nào vào bảng chung của bản chính; trên bản dùng thử, bảng nhân viên có thêm đúng một tài khoản dùng thử. (2) Bản đồ quyền không đổi; phiên dùng thử mang **một** vai đã chọn, máy chủ hỏi bản đồ như cũ. (3) Cổng: màn chọn vai, luật nhiều máy, bỏ hai lớp, chống dò theo địa chỉ mạng, chặn sửa tài khoản dùng chung, tắt đăng ký công khai và lệnh làm mới đều canh bằng biến môi trường riêng (lệnh làm mới thêm bảng dấu); đường bản mẫu do Worker canh (404 cho người ngoài); thư canh bằng `MOI_TRUONG` + danh sách trống; giao diện ẩn/hiện theo vai đọc từ phiên như hiện nay, không có chỗ ẩn/hiện mới đổi nghĩa.
