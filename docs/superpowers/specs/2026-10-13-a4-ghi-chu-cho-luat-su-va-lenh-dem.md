# 2026-10-13 — Gói A4: ghi chú gửi người hiểu luật và hai lệnh đếm

> Hồ sơ có ngày, chủ dùng để gửi người hiểu luật và tự chạy lệnh đếm. Viết 2026-10-13 từ đặc tả `2026-10-09-a4-tai-xe-doi-tac-cho-chu.md`, ADR-0053 và mã tại thời điểm viết. Chưa có người kiểm độc lập.

## Phần 1. Ghi chú gửi người hiểu luật

Nền tảng là phần mềm nội bộ của Công ty TNHH Tour Đảo (Nha Trang). Nhân viên dùng nó để lập đơn dịch vụ tour, điều xe và xếp tài xế cho từng chuyến. Đơn có tên và năm sinh từng khách đi, cùng tên và số điện thoại của người đặt (có khi là nhân viên một đại lý lữ hành). Công ty đang cho phép tài xế của nhà xe ngoài, tức người không phải nhân viên công ty, có tài khoản riêng để xem và bấm tiến độ các chuyến được xếp cho mình.

Tài xế nhà xe ngoài chỉ thấy chuyến của chính mình, không thấy chuyến xe khác, không thấy tiền hay giá, và không thấy giấy tờ đầy đủ của ai. Họ thấy hai nhóm thông tin. Nhóm thứ nhất thấy mọi lúc: giờ chạy, biển số xe, số khách, tên điểm đón và điểm trả (đây là chữ nhân viên gõ tay nên đôi khi có thể chứa tên người), số hiệu chuyến bay và tên hướng dẫn viên đi cùng. Nhóm thứ hai là dữ liệu cá nhân của khách: họ tên và năm sinh từng khách, tên và số điện thoại người đặt, mã đơn, và địa chỉ điểm đón và trả để bấm chỉ đường. Nhóm này chỉ hiện khi cùng lúc có hai điều kiện: một là tài xế đã qua hạn được Từ chối chuyến (mặc định là 12 giờ trước giờ chạy, công ty đổi được con số này), hai là đang đúng ngày chạy hoặc chuyến đang chạy dở. Ngoài khung đó các trường này vắng hẳn chứ không hiện rỗng. Lý do thiết kế: tài xế không được "xem khách rồi mới từ chối". Tài xế công ty cũng bị siết theo, chỉ thấy trong ngày chạy.

Về việc ghi lại và lưu: trong mã tôi đọc không thấy Nền tảng ghi nhật ký mỗi lần tài xế mở màn hình xem danh sách khách; chỉ các lệnh tài xế bấm (tiến độ, từ chối chuyến) có nhật ký, và nhật ký đó cố ý không chứa tên hay số điện thoại khách. Nền tảng không xoá dữ liệu đơn theo thời hạn, nên dữ liệu khách nằm trong hệ thống của công ty vô thời hạn như mọi đơn khác. Thiết kế nói máy của tài xế không lưu sẵn danh sách khách khi mất mạng, chỉ lưu hàng đợi lệnh; điều này chưa ai thử trên iPhone thật. Tài xế có thể chụp màn hình hoặc chép tay thông tin đang hiện, và Nền tảng không ngăn được việc đó (tôi chưa kiểm xem có chức năng tải hay xuất danh sách nào dành cho tài xế không).

Chủ dự án đã duyệt chuyện này ngày 30/9/2026 (ADR-0053) sau khi được báo rằng đây là "cửa một chiều": thông tin đã hiện cho người ngoài thì không lấy lại được. Chủ đồng thời ghi nhận chưa có ai chuyên môn kiểm về pháp lý. Tra cứu sơ bộ ngày 27/9 chỉ cho thấy xe chở khách phải mang danh sách hành khách; chưa ai đối chiếu với quy định bảo vệ dữ liệu cá nhân.

Ba câu hỏi cần ý kiến của người hiểu luật:

1. Công ty có cần khách (hoặc đại lý đặt thay khách) đồng ý trước, hoặc có cần ghi vào điều khoản đặt tour rằng tên, năm sinh khách được chuyển cho nhà xe vận chuyển hay không? Còn số điện thoại người đặt, nhất là khi đó là nhân viên đại lý chứ không phải khách, thì sao?
2. Có cần ký với từng nhà xe một văn bản cam kết bảo mật và chỉ dùng dữ liệu cho chuyến đó (và cam kết không chụp, không lưu, không chuyển tiếp) trước khi cấp tài khoản cho tài xế của họ không? Nếu cần, văn bản này nên có những nội dung tối thiểu nào, và trách nhiệm của công ty khi tài xế làm lộ dữ liệu là gì?
3. Thời hạn lưu: tài xế nhà xe nên được xem dữ liệu khách bao lâu (hiện là từ khi qua hạn từ chối đến hết ngày chạy) và có cần quy định thời hạn công ty giữ dữ liệu khách nói chung, kèm cách xoá, không? Hiện chưa có quy định nào trong Nền tảng.

## Phần 2. Hai lệnh đếm chỉ đọc cho chủ chạy

Hai lệnh dưới đây chỉ đếm, không sửa gì (tôi đã kiểm cả hai chỉ là câu SELECT, không có INSERT, UPDATE hay DELETE). Chạy ở thư mục gốc dự án (thư mục có tệp `wrangler.jsonc`, tức `tourdao-sales`, không phải thư mục `playbook`). Nếu máy hỏi đăng nhập Cloudflare, chạy `npx wrangler whoami` trước; tiền tố `CI=1` để wrangler khỏi hỏi lại giữa chừng. Đừng dùng `--file` vì cổng nhập tệp hay lỗi đăng nhập; chỉ dùng `--command` như dưới đây.

Lệnh 1 đếm tài khoản Tài xế đối tác đang hoạt động. Tôi kiểm tên bảng, tên cột (`staff.active`, `stf_permission.staff_id`, `permission_type_code`, `valid_to_at`) khớp `migrations/` hiện hành; không phải sửa gì so với đặc tả.

```bash
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS tai_khoan FROM staff s JOIN stf_permission p ON p.staff_id = s.id WHERE s.active = 1 AND p.permission_type_code = 'DRIVER_PARTNER' AND p.valid_to_at IS NULL"
```

Lệnh 2 đếm số chuyến chưa kết thúc mà các tài xế đó đang được xếp lái, trong đó bao nhiêu chuyến đã qua hạn Từ chối, và bao nhiêu chuyến vừa qua hạn vừa chạy hôm nay (đây mới là những chuyến mà tài xế thật sự thấy tên khách ngay lúc này).

Gói A4 đã lên production từ bản 1.88 (13/10/2026), nên bảng hạn từ chối đã có và lệnh đọc đúng hạn của từng cặp tài xế – chuyến (kể cả khi công ty đã đổi số giờ). So với đặc tả tôi chỉ thêm cột `thay_khach_hom_nay`: tài xế còn phải đúng ngày chạy mới thấy tên khách, nên cột `da_qua_han` một mình dễ đọc lớn hơn thực tế. Lệnh đã chạy thử trên cơ sở dữ liệu trống dựng từ toàn bộ migration (kết quả 0, đúng cú pháp); chưa chạy trên production vì AI không được chạy lệnh remote.

```bash
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS dong_lai_mo, coalesce(sum(CASE WHEN h.deadline_ms < CAST(strftime('%s','now') AS INTEGER) * 1000 THEN 1 ELSE 0 END), 0) AS da_qua_han, coalesce(sum(CASE WHEN h.deadline_ms < CAST(strftime('%s','now') AS INTEGER) * 1000 AND t.service_date = date('now', '+7 hours') THEN 1 ELSE 0 END), 0) AS thay_khach_hom_nay FROM vc_trip_driver d JOIN vc_trip t ON t.id = d.trip_id JOIN staff s ON s.party_id = d.driver_party_id JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'DRIVER_PARTNER' AND p.valid_to_at IS NULL LEFT JOIN vc_refuse_deadline h ON h.trip_id = d.trip_id AND h.driver_party_id = d.driver_party_id WHERE s.active = 1 AND d.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')"
```

Cách đọc kết quả. Nếu lệnh 1 ra 0 thì chưa có tài xế nhà xe nào có tài khoản, lệnh 2 chắc chắn ra 0, và câu hỏi pháp lý chỉ cần giải quyết trước khi tạo tài khoản đầu tiên; đó là tình huống bình thường lúc này, dữ liệu production nhiều khả năng mới là dữ liệu thử. Nếu lệnh 1 ra từ 1 trở lên thì có người đã có tài khoản, và bạn cần xem lệnh 2. Cột `dong_lai_mo` là tổng số dòng lái đang mở, số lớn không đáng lo. Cột `da_qua_han` lớn hơn 0 nghĩa là những tài xế đó sẽ thấy tên khách khi đến ngày chạy. Cột `thay_khach_hom_nay` lớn hơn 0 là điều cần báo lại cho AI ngay: có người ngoài công ty đang thấy tên, năm sinh khách hôm nay, và bạn cần quyết xử lý (ví dụ tạm khoá tài khoản đó) trước khi tiếp tục dùng, vì gói A4 đã chạy trên production. Nếu lệnh báo lỗi đăng nhập hoặc "no such table" ở lệnh 1 hoặc 2, dán nguyên văn lỗi cho AI để soạn cách khác.

## Điều chưa chắc

A4 đã lên production cùng bản 1.88 (migration 0092 đã áp, kiểm bằng lệnh chỉ đọc ngày 13/10). Tôi chưa kiểm hết mọi đường truy cập để khẳng định chắc chắn không có nhật ký xem. Việc máy tài xế không lưu danh sách khách ngoại tuyến là theo thiết kế, chưa thử trên iPhone thật.
