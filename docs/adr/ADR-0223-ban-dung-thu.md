# ADR-0223 — Bản dùng thử riêng, tự làm sạch mỗi 2 giờ; chọn vai sau PIN chỉ trên bản dùng thử

- **Trạng thái:** **proposed** 2026-11-21 — AI soạn, chưa duyệt (Hiến pháp N3). Số 0223 do phiên điều phối kế hoạch 16 việc giữ trước cho Việc 1.
- **Lời giao việc của chủ dự án** (21/11/2026, qua kế hoạch 16 việc, mục 5 «Việc 1»): tài khoản dùng thử cho người ngoài, dữ liệu tự xoá mỗi 2 giờ, bản chính không bị chạm.
- **Nguồn:** `docs/superpowers/specs/2026-11-21-ban-dung-thu/DAC-TA.md` (kết quả bước 0, đo ở máy 21/11).
- **Loại:** việc lớn (triển khai, quyền). **Cửa:** hai chiều — tắt bản dùng thử (xoá Worker và tài nguyên của nó) không ảnh hưởng bản chính.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này:** 1. Trang ghép: mục «Trang ghép» cuối tệp.
- **Xây trên lỗ đang hở:** không chạm lỗ mới. Bản dùng thử chạy cùng lịch 15 phút nên mang cùng nợ HC-5.11 với bản chính, nhưng trên dữ liệu giả.
- **Quan hệ với quyết định cũ:** cùng khuôn với ADR-0162 (bản Development) về độc lập tài nguyên, nhưng là **bản thứ ba**: Development chạy nhánh đang thử, bản dùng thử chạy mã đang phát hành. Là **ngoại lệ chỉ trên bản dùng thử** của ADR-0187 Đ1.4 («xem như vai khác» chỉ Toàn quyền), luật một máy (ADR-0075, chính sách ở ADR-0085, `isSingleDevice`), bảo mật hai lớp bắt buộc cho vai nội bộ (ADR-0074) và chống dò PIN theo số điện thoại. Trên bản chính, mọi luật đó **giữ nguyên**.

## Đ1 — Bản riêng, độc lập hoàn toàn

Bản dùng thử là một Worker riêng ở một tên miền phụ của `tourdao.vn` (chủ chọn tên), với D1, các kho R2, trạm Bảng tin, bí mật và khoá Face ID riêng, giống ADR-0162 Đ1. Không chép dữ liệu thật sang. Danh mục dịch vụ đọc cùng Google Sheet (chỉ đọc). Bài kiểm máy so **ba** cấu hình (chính thức, Development, dùng thử): đỏ khi hai bản dùng chung bất kỳ tên hay mã tài nguyên nào ngoài Sheet.

Mã chạy trên bản dùng thử là **mã đang phát hành** của bản chính; mỗi lần phát hành bản chính thì đưa lên bản dùng thử cùng mã. Ai được gõ lệnh đưa lên (chủ, hay AI như `len-dev` ở ADR-0162 Đ5) quyết khi thi công; mặc định là chủ gõ.

## Đ2 — Tự làm sạch mỗi 2 giờ bằng «xoá hết – nạp lại bản mẫu» trong Worker

1. Lúc dựng bản dùng thử, máy sinh **bản mẫu sạch** từ cùng commit: toàn bộ lược đồ sau mọi migration, dữ liệu mẫu (đối tác, hoa hồng, hồ sơ là số giả; hồ sơ đối tác mẫu mang vai đối tác theo ADR-0185), không chứa PIN hay băm PIN. Bản mẫu chỉ nằm trong phần tĩnh riêng của bản dùng thử, người ngoài không tải được.
2. Lịch chạy của Worker, ở các giờ chẵn **giờ Việt Nam**, xoá mọi bảng và view rồi nạp bản mẫu trong **một lô** (một giao dịch: hỏng thì quay về trạng thái trước). Sau đó đặt PIN của tài khoản dùng thử và tài khoản Toàn quyền của chủ từ bí mật, dọn kho ảnh, đồng bộ danh mục từ Sheet.
3. **Hai khoá an toàn độc lập**, thiếu một là từ chối chạy: biến môi trường chỉ bản dùng thử có, và một bảng dấu chỉ bản mẫu tạo ra (bản chính không bao giờ có). Có bài kiểm máy cho cả hai, đã quan sát chặn thật một lần, có dòng ở `docs/SO-HANG-RAO.md`.
4. Không dùng Time Travel: cần khoá API trong Worker (chưa xác minh khoá giới hạn được vào một cơ sở dữ liệu), mốc cũ đi sau mỗi migration. Lý do đầy đủ ở đặc tả, mục 2.2.
5. Nếu D1 thật không nhận một lô cỡ đó (chưa kiểm, là bước nghiệm thu đầu tiên): chia vài lô kèm cờ «đang làm mới»; khi đó không còn nguyên tử và phải trình lại chủ.

## Đ3 — Đăng nhập dùng thử: chọn vai sau PIN (chỉ trên bản dùng thử)

1. Một tài khoản dùng thử. Sau PIN hiện «Bạn muốn dùng thử với vai nào?», chọn được **mọi vai trừ Toàn quyền**. Phiên mang vai đã chọn; máy chủ hỏi quyền theo vai đó như mọi tài khoản thường. Muốn đổi vai thì đăng xuất rồi chọn lại.
2. Riêng tài khoản dùng thử: nhiều máy cùng lúc, không bảo mật hai lớp, chống dò PIN đếm theo **địa chỉ mạng** thay vì theo số điện thoại (để một người gõ sai không khoá mọi người).
3. Toàn quyền của chủ trên bản dùng thử vẫn theo luật thường (một máy, bảo mật hai lớp).
4. Mọi nới lỏng ở mục 2 bật bằng cùng biến môi trường của Đ2.3; có bài kiểm máy chứng minh trên cấu hình bản chính không có màn chọn vai, vẫn một máy, vẫn bảo mật hai lớp.

## Đ4 — Không gì đi ra ngoài

Không thư (biến môi trường có + danh sách địa chỉ cho phép trống, như ADR-0162 Đ2), không thông báo đẩy, không Zalo. Mọi trang có dải cố định «BẢN DÙNG THỬ — dữ liệu tự xoá lúc …» (giờ tính từ cùng hằng với lịch làm mới; báo trước rằng mọi người sẽ bị đăng xuất). Máy tìm kiếm không lập chỉ mục.

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
6. Không thư, thông báo nào gửi ra ngoài.

## Trang ghép (CLAUDE.md §9)

(1) Bản dùng thử không thêm loại thực thể nào vào bảng chung của bản chính; trên bản dùng thử, bảng nhân viên có thêm đúng một tài khoản dùng thử. (2) Bản đồ quyền không đổi; phiên dùng thử mang **một** vai đã chọn, máy chủ hỏi bản đồ như cũ. (3) Cổng: màn chọn vai, luật nhiều máy, bỏ hai lớp, chống dò theo địa chỉ mạng và lệnh làm mới đều canh bằng biến môi trường + bảng dấu; giao diện ẩn/hiện theo vai đọc từ phiên như hiện nay, không có chỗ ẩn/hiện mới đổi nghĩa.
