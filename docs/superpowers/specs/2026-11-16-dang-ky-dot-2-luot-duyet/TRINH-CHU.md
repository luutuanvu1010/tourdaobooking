# Trình chủ: đăng ký đối tác đợt 2 (ADR-0212, ADR-0213)

> Hồ sơ có ngày 16/11/2026, bản sửa sau lượt soát độc lập lần 1 và sau ba câu trả lời của chủ cùng ngày. Hai ADR ở trạng thái đề xuất. Trang ghép: `TRANG-GHEP.md` cùng thư mục.

**Kết luận.** Ba câu bạn trả lời sáng nay đã được viết vào hai văn bản, kể cả phần nới luật «nháp chỉ người tạo xem» cho đơn của thành viên tổ chức. Còn ba câu nhỏ dưới đây; trả lời xong là văn bản đủ để duyệt. Luật tính tiền không đổi, chỉ đổi «ai là bên đặt» của đơn.

## Bạn đã chốt 16/11

1. **Đơn của thành viên:** mỗi tổ chức chọn một trong hai chế độ, do người quản lý (ở bảng điều khiển của họ) hoặc Toàn quyền đặt: «Chỉ soạn» hoặc «Soạn và gửi người quản lý xác nhận». Thành viên không bao giờ gửi thẳng lên Tour Đảo; người quản lý gửi lên hoặc trả lại. Phần nới luật nháp riêng tư ghi rõ ở ADR-0213.
2. **Loại đối tác:** mở cả loại Kế toán thêm, lấy từ một bảng duy nhất trong cơ sở dữ liệu; máy có bài kiểm báo đỏ nếu có chỗ nào giữ danh sách riêng hoặc hai cờ bật/tắt lệch nhau.
3. **Tư cách theo từng đơn:** lúc tạo đơn, người dùng chọn «Lễ tân» (đơn của chính anh Nam) hay «Khách sạn Sunrise» (đơn của khách sạn, tính theo cấp độ đại lý của khách sạn). AI hiểu «đối tác cấp 2» là tổ chức đối tác có cấp độ đại lý riêng, không phải một tầng đối tác con; nếu bạn có ý khác, chỉ cần nói một câu.

## Ba câu còn mở

**1. Bạn đồng ý hai mặc định bảo vệ tổ chức chứ?** (khuyến nghị: đồng ý)
Bạn từng nói người quản lý tự thêm, gỡ và chuyển quyền được; AI đề nghị bớt phần «tự chuyển», vì kẻ cầm được mã PIN của người quản lý có thể chiếm tổ chức trong vài phút. Người quản lý vẫn tự thêm và gỡ thành viên.
- Chỉ văn phòng (Quản lý bán hàng, Quản trị, Toàn quyền) chuyển quyền quản lý; người quản lý chỉ gửi yêu cầu. Lý do: nếu người quản lý tự chuyển được, kẻ lấy được mã PIN của họ chiếm cả tổ chức trong vài phút.
- Người đăng ký gắn vào một tổ chức đã có trong Danh bạ không bao giờ tự thành người quản lý; văn phòng giao. Lý do: người lạ khai trúng tên công ty không được nắm công nợ của công ty đó.

**2. Phát hành trước hay sau buổi diễn tập khôi phục dữ liệu (dự kiến 25/11)?** (khuyến nghị: **sau**)
Buổi diễn tập là lần thử khôi phục dữ liệu từ bản lưu, chưa ai làm lần nào. Hai văn bản này sửa lại một số luật đang chạy trong cơ sở dữ liệu và đổi cách chọn bên đặt, nên nếu phải khôi phục thì còn phải cài lại bản cũ của Nền tảng, bước chưa ai thử. Lên sau diễn tập thì an toàn hơn; lên trước thì nhanh hơn khoảng một tuần.

**3. «Chỉ soạn» có nghĩa là người quản lý thấy mọi nháp của thành viên, kể cả nháp thành viên chưa muốn gửi, đúng ý bạn chứ?** (khuyến nghị: đúng)
Chế độ còn lại thì người quản lý chỉ thấy nháp thành viên đã bấm gửi. Tổ chức mới mặc định ở chế độ «Soạn và gửi», vì ít lộ nháp nhất.

## Mặc định AI đã đặt (bạn bác được)

- Chuyển quyền quản lý xong, người quản lý cũ thành thành viên. Người quản lý không tự rời tổ chức; văn phòng cũng mời và gỡ được thành viên (để giúp tổ chức chưa có người quản lý).
- Người chỉ làm việc cho công ty, không tự làm đối tác riêng, vẫn có tài khoản: AI sửa một luật nằm sẵn trong cơ sở dữ liệu (nơi máy tự chặn dù mã có sai) để họ vào được; họ không có hoa hồng riêng.
- Loại Kế toán thêm: khi duyệt chỉ gắn đúng loại đó, không gắn kèm «Cộng tác viên» (hai loại cùng có mức thì đơn bị giữ).
- «Tài xế đối tác» có trong danh sách nhưng chưa mở được cho tới khi phiếu có ô bằng lái và bước chọn nhà xe (đợt sau).
- Mã mời sống 7 ngày; mỗi tổ chức tối đa 10 lời mời một ngày và 20 lời mời đang chờ; một số điện thoại tối đa 3 lời mời một ngày trên toàn Nền tảng; nhập sai mã tối đa 5 lần mỗi giờ.
- Không chuyển quyền qua lại giữa cùng hai người trong một ngày.
- Mã số thuế của tổ chức được coi là dữ liệu cần giữ kín như số căn cước.

## Người dùng sẽ thấy gì

Kế toán thêm một loại đối tác thì loại đó tự hiện trong khối «Nhận đăng ký mới». Người đăng ký có thêm ô Giới tính và có thể khai cả tổ chức. Người của công ty đăng nhập bằng tài khoản riêng, chọn tư cách ở từng đơn; người quản lý mời thành viên bằng số điện thoại (máy đưa một mã để gửi cho người kia), xác nhận đơn của thành viên, thấy đơn và công nợ của công ty. Lời mời không bao giờ cho biết số nào đã có tài khoản. Tài khoản công ty lữ hành đang dùng hôm nay không bị đổi; số lượng của chúng trên bản chính thức chưa kiểm.

## Chữ đề xuất (tên đầu là khuyến nghị)

| Khái niệm | Đề xuất |
|---|---|
| Tổ chức không đăng nhập | **Hồ sơ tổ chức** · Công ty đối tác |
| Người cao nhất của tổ chức | **Người quản lý tổ chức** · Người đứng đầu tổ chức (tránh lẫn với vai «Quản lý bán hàng») |
| Người còn lại | **Thành viên** · Nhân viên của tổ chức |
| Ô chọn khi tạo đơn | **Tư cách** · Đặt đơn cho |
| Hai chế độ | **Chỉ soạn** · **Soạn và gửi người quản lý xác nhận** |
| Mã gửi cho người được mời | **Mã vào tổ chức** · Mã tham gia (tránh chữ «lời mời» đã dùng cho mời đặt PIN và Face ID) |
| Nút đổi người cao nhất | **Chuyển quyền quản lý** |

## Câu mẫu để duyệt

«Duyệt ADR-0212 và ADR-0213; chữ và mặc định theo khuyến nghị; đồng ý hai mặc định bảo vệ tổ chức; "Chỉ soạn" đúng như mô tả; cho phép xây trên lỗi HC-5.19 và phát hành **sau** buổi diễn tập.»
(Muốn lên trước thì thay chữ «sau» bằng «trước».)
