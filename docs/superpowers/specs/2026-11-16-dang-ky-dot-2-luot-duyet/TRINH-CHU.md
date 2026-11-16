# Trình chủ: đăng ký đối tác đợt 2 (ADR-0212, ADR-0213)

> Hồ sơ có ngày 16/11/2026. Hai ADR ở trạng thái đề xuất, chờ chủ duyệt. Trang ghép: `TRANG-GHEP.md` cùng thư mục.

**Kết luận.** Hai văn bản đã sẵn để bạn duyệt. Văn bản thứ nhất cho biểu mẫu đăng ký tự lấy danh sách vai từ hệ thống, hỏi đúng những gì máy lưu, và có thêm phần tổ chức. Văn bản thứ hai cho một người đăng nhập bằng tài khoản của mình rồi đặt đơn thay mặt công ty, với đúng một người quản lý và nhiều thành viên như bạn đính chính. Luật tính tiền không đổi, chỉ đổi «ai là bên đặt». Bạn cần chọn ba điều dưới đây; mọi điều khác AI đã áp theo lời bạn hoặc tự đặt mặc định có ghi.

## Người dùng sẽ thấy gì

**ADR-0212 (biểu mẫu).** Kế toán thêm một loại đối tác thì loại đó tự hiện trong khối «Nhận đăng ký mới» của Toàn quyền, không phải sửa mã; vai nội bộ không bao giờ hiện. Người đăng ký điền phần của mình như cũ, có thêm ô Giới tính, và gạt «Tôi đăng ký cho cả tổ chức» thì khai thêm tên, tên pháp lý, mã số thuế, địa chỉ, email nhận hoá đơn, giấy đăng ký kinh doanh. Quản trị xác minh thấy hai nhóm mục và soát Danh bạ cho cả người lẫn tổ chức; Nhân sự duyệt một lần là có cả hai hồ sơ. Một bài kiểm của máy sẽ báo đỏ nếu biểu mẫu hỏi điều máy không lưu, hoặc máy lưu điều biểu mẫu không hỏi.

**ADR-0213 (thay mặt tổ chức).** Công ty là một hồ sơ, không có số điện thoại hay PIN riêng. Người của công ty đăng nhập bằng tài khoản cá nhân, chọn «Đang thao tác với tư cách: tên mình / tên công ty» rồi lập đơn; đơn thay mặt công ty thì hoa hồng và công nợ tính cho công ty. Mỗi công ty có đúng một người quản lý: người này mời thành viên bằng số điện thoại (máy đưa một mã để gửi cho người kia), gỡ thành viên, chuyển quyền quản lý cho một thành viên, và thấy mọi đơn cùng sổ công nợ của công ty. Quản lý bán hàng, Quản trị, Toàn quyền đổi được người quản lý. Lời mời không bao giờ cho biết số nào đã có tài khoản.

## Ba điều bạn chọn

**1. Thành viên làm được gì, và «duyệt đơn» nghĩa là gì?**
- **(a) Khuyến nghị:** thành viên chỉ soạn nháp; người quản lý xem rồi bấm «Gửi đơn». Được: không đơn nào lên Tour Đảo hay làm tăng nợ của công ty mà người quản lý chưa thấy. Mất: đơn gấp phải chờ người quản lý.
- (b) Thành viên tự gửi; người quản lý chỉ xem và huỷ được. Nhanh hơn, nhưng nợ của công ty tăng trước khi ai duyệt.
- (c) Mỗi công ty tự bật một trong hai cách. Linh hoạt, nhưng thêm một cài đặt và hai luồng phải kiểm.

**2. Loại đối tác Kế toán thêm, và «Tài xế đối tác», trên phiếu đăng ký.**
- **Khuyến nghị:** loại Kế toán thêm mở được ngay; khi duyệt, máy chỉ gắn đúng loại đó (không gắn kèm «Cộng tác viên», vì hai loại cùng có mức thì đơn bị giữ). «Tài xế đối tác» có trong danh sách nhưng hiện «chưa mở được» cho tới khi phiếu có ô bằng lái và bước chọn nhà xe, làm ở đợt sau.
- Phương án khác: làm luôn ô bằng lái và bước chọn nhà xe trong đợt này (việc to hơn, chạm phân hệ Vận chuyển).

**3. Người chỉ làm việc cho công ty, không tự làm đối tác riêng, có tài khoản thế nào?**
- **Khuyến nghị:** sửa một luật ở tầng dữ liệu để người có liên kết «người quản lý» hoặc «thành viên» với một công ty đối tác được vào Nền tảng; họ không có hoa hồng riêng và chỉ thao tác thay mặt công ty.
- Phương án khác: bắt mỗi người phải có một vai riêng như «Cộng tác viên». Bị loại vì máy sẽ tính hoa hồng cá nhân không có thật.

**Mặc định AI đã đặt (bạn bác được):** chuyển quyền quản lý thì người quản lý cũ thành thành viên; mã mời sống 7 ngày, mỗi công ty tối đa 10 lời mời một ngày; không chuyển quyền qua lại cùng một người trong một ngày; email người đăng ký đã được ghi vào hồ sơ từ đợt 1 (đặc tả ghi nhầm là chưa).

## Chữ đề xuất (bạn chọn, tên đầu là khuyến nghị)

| Khái niệm | Đề xuất | Ghi chú |
|---|---|---|
| Tổ chức không đăng nhập | **Hồ sơ tổ chức** · Công ty đối tác · Tài khoản tổ chức | «tài khoản» đang có nghĩa là cách đăng nhập, nên tránh |
| Người cao nhất của tổ chức | **Người quản lý** · Chủ tổ chức · Quản lý đại lý | không dùng «phụ trách» (đã là người lo đơn) |
| Người còn lại | **Thành viên** · Nhân viên của tổ chức · Người của tổ chức | «Thành viên» đã dùng ở nhóm Hỗ trợ, cùng nghĩa «người trong nhóm» |
| Ô chọn khi lập đơn | **Đang thao tác với tư cách** · Đặt đơn cho · Đang làm cho | |
| Nút đổi người cao nhất | **Chuyển quyền quản lý** · Đổi người quản lý | |
| Lời mời | **Mời thành viên** · Mã mời | |
| Công tắc trên phiếu | **Tôi đăng ký cho cả tổ chức** | đặc tả đã dùng |

## Cần biết trước khi duyệt

Cả hai văn bản xây khi buổi diễn tập khôi phục dữ liệu chưa làm; lý do xin phép là chỉ thêm bảng và cột mới, không sửa dữ liệu đang có. Chính sách riêng tư phải có thêm phần dữ liệu tổ chức và được luật sư duyệt trước khi mở đăng ký cho công ty. Người quản lý bị lộ PIN thì kẻ gian chuyển được quyền quản lý, nhưng chỉ cho một thành viên đã có, và có nhật ký. Tài khoản công ty lữ hành đang dùng hôm nay không bị đổi; số lượng tài khoản đó trên bản chính thức chưa kiểm.

## Câu mẫu để duyệt

«Duyệt ADR-0212 và ADR-0213; chữ và mặc định theo khuyến nghị; quyết định 1 chọn (a), quyết định 2 và 3 theo khuyến nghị. Cho phép xây trên lỗi HC-5.19 vì chỉ thêm bảng và cột mới.»
