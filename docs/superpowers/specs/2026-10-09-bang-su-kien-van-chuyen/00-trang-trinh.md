# Bảng sự kiện Vận chuyển — trang trình chủ dự án (2026-10-09, đề xuất)

Tôi đã ghi lại mọi lệnh làm thay đổi một chuyến xe vào một bảng duy nhất, và cho máy tự so bảng đó với Nền tảng mỗi lần chạy bộ kiểm. Bảng có 40 lệnh: 33 lệnh đang chạy và 7 lệnh chuyển khách giữa hai xe đã duyệt nhưng chưa làm. Đối chiếu bảng với mã cho thấy 6 chỗ chưa khớp, trong đó 2 chỗ đã biết từ trước và đã nằm trong bảng việc; 4 chỗ còn lại là mới. Tất cả xếp theo nặng nhẹ bên dưới. Việc này không đổi gì trên Nền tảng, nên không cần triển khai; bạn chỉ cần quyết ba câu ở cuối trang.

## Bảng là gì, máy dùng thế nào

Mỗi dòng là một lệnh, ví dụ "Xếp khách lên xe". Dòng đó ghi ai được bấm, luật nào được bỏ qua khi gấp, Nền tảng ghi lại gì vào sổ, và ai nhận tin báo. Mỗi lần chạy bộ kiểm, máy đọc mã thật rồi so với từng dòng. Nếu ai đó thêm nút mới, đổi người được bấm hay đổi người nhận tin mà quên ghi vào bảng, bộ kiểm báo đỏ. Tôi đã cố ý làm sai ba lần (thêm một loại việc lạ, bỏ một người nhận tin, mở thêm quyền cho Kế toán), và cả ba lần máy đều báo đỏ.

Từ bảng, máy suy ra ba quy tắc chung rồi tự kiểm. Thứ nhất, văn phòng hay máy đổi một chuyến đã có tài xế thì tài xế đang lái phải được báo. Thứ hai, lệnh có bỏ qua luật thì tài xế phải được báo. Thứ ba, việc tài xế bấm trên đường thì văn phòng cũng bấm thay được, theo cùng một cách xử lý. Chỗ nào phá quy tắc mà chưa ghi lý do thì máy báo đỏ.

40 lệnh chia thành: 10 lệnh lập kế hoạch chuyến, 10 việc tài xế bấm trên đường, 2 lệnh văn phòng sửa sai, 8 lệnh sửa đơn làm máy tự cập nhật chuyến, 1 lệnh sửa đơn kiểu cũ, 2 lệnh đánh dấu "đã gọi báo khách", và 7 lệnh chuyển khách chưa làm (việc 8).

## Những chỗ chưa khớp (nặng trước)

1. **Nặng, đã biết, đang làm (việc 6):** khi đổi ngày đi hay giờ đón bằng bảng "Sửa thông tin chuyến" cũ, tài xế không được báo, dù văn bản đã duyệt nói phải báo.
2. **Vừa, chưa có quyết định:** người xếp xe bấm tay "Cập nhật khách theo đơn" thì tài xế không được báo, trong khi máy tự làm đúng việc đó thì tài xế có tin.
3. **Vừa, chưa có quyết định:** "Cập nhật điểm theo đơn" lúc xe chưa chạy làm đổi điểm đón, nhưng tài xế đã được xếp lái không được báo; tài xế chỉ được báo khi xe đã chạy.
4. **Nhẹ, chưa có quyết định:** khi văn phòng bấm thay cho tài xế (xuất bến, đã đón, kết thúc…), tài xế không có tin báo, chỉ màn hình đang mở tự cập nhật.
5. **Nhẹ:** khi tài xế bổ sung tên khách, màn văn phòng ghi là "sửa chuyến" vì việc này chưa có loại riêng. Tôi sẽ sửa khi nào đụng tới phần tin.
6. **Đã biết, đã có kế hoạch (việc 7):** tài xế đối tác chưa bổ sung tên khách được, vì bạn đã chọn làm phần này sau.

Có ba chỗ máy thấy khác quy tắc chung nhưng đã có quyết định, nên tôi ghi lại để biết chứ không coi là lỗi. Một là xếp, rút hay dời khách bình thường thì không báo tài xế, vì bạn chọn ngày 8/10 chỉ báo khi có bỏ qua luật. Hai là máy điện thoại còn dùng bản cũ của bảng "Sửa thông tin chuyến" có thể bỏ một chặng mà chuyến không tự cập nhật; ngày 8/10 đã quyết giữ như vậy, vì người xếp xe thấy dấu nhắc và bấm nút cập nhật, và đường cũ sẽ mất khi Nền tảng ngừng nhận bản cũ. Ba là chỉ tài xế mới có nút bổ sung tên khách, còn văn phòng nhập tên ở đơn.

## Cần bạn quyết

1. **Duyệt bảng này làm luật**, tức từ nay mọi lệnh mới làm đổi chuyến phải ghi dòng vào bảng trước khi viết mã. Việc 8 (chuyển khách) và việc 10 (bảng điều phối) sẽ là hai việc đầu tiên áp luật này. Bài kiểm cũng được ghi vào sổ các chốt chặn tự động của dự án, để từ đó được tính là chốt chặn thật chứ không chỉ là lời khuyên. *Khuyến nghị: duyệt.*
2. **Chỗ 2 và 3:** khi văn phòng bấm "Cập nhật khách / điểm theo đơn" lúc xe chưa chạy, có báo tài xế không? Nếu có, cần một quyết định mới, vì danh sách việc được báo tin chỉ mở thêm khi có văn bản. *Khuyến nghị: có, báo cùng câu với tin máy đang gửi.*
3. **Chỗ 4:** khi văn phòng bấm thay, có báo tài xế không? *Khuyến nghị: giữ như hiện tại, vì văn phòng thường chỉ bấm thay khi tài xế không bấm được; xem lại khi làm việc 9 (màn tài xế).*

Bảng đầy đủ cho người kiểm nằm ở tệp `01-bang-day-du.md` cùng thư mục.
