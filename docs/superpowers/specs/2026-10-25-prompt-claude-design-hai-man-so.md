# Prompt gửi Claude Design — hai màn sổ công nợ (2026-10-25)

> Hồ sơ có ngày. Chủ dự án chốt 25/10 (trong chat): vẽ hai màn; Quản trị **không** xem màn Kế toán (muốn xem thì gán thêm quyền Kế toán); đại lý **không** thấy tỷ lệ %; điểm 4, 5 của kế hoạch `docs/superpowers/plans/2026-10-24-so-cong-no-doi-tac-ke-hoach-thi-cong.md` làm theo khuyến nghị.
> Cách dùng: dán nguyên khối dưới đây vào Claude Design. Gửi kèm (nếu có thể): `public/app.css` (đoạn `:root` token) và một ảnh chụp trang Khoá sổ tháng hiện có (`public/khoa-thang.html`) để đúng kiểu.

---

```
Hãy thiết kế HAI màn hình cho "Tour Đảo Booking" (CRM nội bộ của Công ty TNHH Tour Đảo, Nha Trang; cài lên iPhone như app, dùng cả trên máy tính). Giao diện SÁNG duy nhất, tiếng Việt có dấu đầy đủ, gọi hệ thống là "Nền tảng". Phông Be Vietnam Pro. Màu chủ đạo xanh biển đậm #0c4a6e (đậm hơn #082f49, nhạt #dcebf6), nền trắng/xám rất nhạt; số tiền luôn viết kiểu Việt "1.840.000 ₫", căn phải, chữ số đều nhau. Ô nhập và nút bấm cao, chạm được bằng ngón cái (ô gõ cỡ chữ 16px). Không dùng chữ Anh hay mã kỹ thuật trên màn hình.

Mỗi màn vẽ BA kích thước: iPhone (375 rộng), máy tính bảng, máy tính (1280 rộng). Vẽ đủ các trạng thái: có dữ liệu, đang tải, rỗng, lỗi tải.

════ MÀN 1 — "Sổ công nợ" (cho KẾ TOÁN và TOÀN QUYỀN; không ai khác thấy) ════
Mục đích: Kế toán nhìn một lần biết AI đang giữ tiền của công ty, AI đang được công ty nợ, rồi đối chiếu từng đơn.

Dữ liệu của danh sách (mỗi dòng một bên: nhân viên, hướng dẫn viên, đại lý, nhà cung cấp i-resort…):
- Tên bên.
- Số dư với công ty, MỘT số có dấu: dương = bên đó đang giữ tiền / còn nợ công ty; âm = công ty còn nợ bên đó. Hiển thị bằng chữ rõ nghĩa, không chỉ dấu +/−: "Đang giữ 1.750.000 ₫" / "Công ty nợ 90.000 ₫". Hai nghĩa khác màu nhưng KHÔNG chỉ dựa vào màu (có chữ).
- Bên có số dư bằng 0 thì không hiện.

Phía trên danh sách: ba ô tổng gọn — "Tổng các bên đang giữ", "Tổng công ty đang nợ", "Số bên"; kèm ô tìm theo tên bên, và bộ lọc nhanh: Tất cả / Đang giữ / Công ty nợ.

Bấm vào một bên: mở chi tiết (trang con trên iPhone, ngăn bên phải trên máy tính) gồm:
- Đầu: tên bên, số dư lớn.
- Danh sách TỪNG ĐƠN của bên đó: mã đơn, ngày đi, trạng thái đơn (nhãn tiếng Việt: Đã xác nhận, Đã giao, Đã huỷ…), số dư của bên trên đơn đó. Dòng cuối cố định: "Cộng các đơn = số dư" — thể hiện rõ hai số này luôn bằng nhau (đây là điều Kế toán cần tin tưởng).
- Bấm một đơn thì sang trang đơn có sẵn (chỉ vẽ nút/liên kết, không vẽ trang đơn).

Khối nhỏ ở đầu màn: "Khoản đang chờ Kế toán xác nhận" (số khoản, bấm vào đi tới màn chờ xác nhận có sẵn) và "Khoản chưa rõ người thu" — hai ô cảnh báo vàng nhạt, chỉ hiện khi > 0.

Màn này CHỈ ĐỌC: không có nút ghi, sửa, xoá nào.

Dữ liệu giả để vẽ: Nam HDV — đang giữ 1.750.000; Đại Lý A — đang giữ 1.840.000; Hương (lễ tân đại lý B) — công ty nợ 790.000; i-resort — công ty nợ 480.000; An Bán (bán hàng) — đang giữ 300.000.

════ MÀN 2 — "Sổ của tôi" (cho tài khoản ĐỐI TÁC / ĐẠI LÝ; chỉ thấy sổ của chính họ) ════
Mục đích: đại lý tự xem mình còn phải trả Tour Đảo bao nhiêu hoặc Tour Đảo còn phải trả mình bao nhiêu, và vì sao.

Đầu màn: một số tổng LỚN, nói bằng lời: "Bạn còn phải trả Tour Đảo 1.840.000 ₫" (hoặc "Tour Đảo còn phải trả bạn 120.000 ₫", hoặc "Bạn và Tour Đảo không còn nợ nhau"). Ba trạng thái này khác nhau về chữ và biểu tượng, không chỉ về màu.

Dưới đó: dải theo THÁNG (chọn được tháng): đầu kỳ, phát sinh, cuối kỳ; tháng đã khoá sổ có nhãn "Đã khoá" (biểu tượng khoá), tháng còn mở thì không.

Danh sách TỪNG ĐƠN của đại lý trong tháng. Mỗi đơn là một thẻ (iPhone) hoặc một hàng (máy tính) gồm: mã đơn, ngày đi, trạng thái; "Giá bán lẻ"; "Hoa hồng của bạn" (số tiền; nếu đơn chưa giao ghi "chưa tính — đơn chưa giao"); "Giảm giá bạn chịu"; "Bạn đã thu"; "Bạn khai, chờ Kế toán xác nhận"; "Khách trả nơi khác" (MỘT số gộp, không nói trả ở đâu, cho ai); "Đã quyết toán"; và kết quả cuối in đậm "Bạn trả 2.750.000 ₫" hoặc "Tour Đảo trả 120.000 ₫". Bấm thẻ thì mở rộng ngay tại chỗ (không sang trang) để xem các dòng trên.

QUY TẮC HIỂN THỊ BẮT BUỘC (đây là chỗ mật, đừng vẽ thừa):
- KHÔNG có bất kỳ chỗ nào hiện tỷ lệ phần trăm hoa hồng, giá vốn, tên nhà cung cấp, nợ của đại lý khác, tiền hướng dẫn viên đang giữ, tên hay số điện thoại người thu. Chỉ số tiền hoa hồng.
- Không có ô chọn "xem sổ của đại lý khác".
- Màn này không có nút ghi tiền; chỉ xem. Đại lý muốn khai khoản đã thu thì làm ở trang đơn có sẵn (có thể vẽ một dòng gợi ý nhỏ "Muốn ghi khoản đã thu? Vào đơn").
- Nhân viên nội bộ không thấy mục này trong menu.

Dữ liệu giả để vẽ (đại lý "Đại Lý A", tháng 10/2026, chưa khoá):
 TD-1001 | đi 20/10 | Đã giao | giá bán lẻ 5.000.000 | hoa hồng 500.000 | giảm giá bạn chịu 250.000 | bạn thu 3.000.000 | khách trả nơi khác 1.750.000 | còn lại: Bạn trả 2.750.000
 TD-1002 | đi 22/10 | Đã giao | 1.000.000 | hoa hồng 120.000 | giảm 0 | bạn thu 0 | khách trả nơi khác 1.000.000 | còn lại: Tour Đảo trả 120.000
 TD-1003 | đi 25/10 | Đã giao | 6.000.000 | hoa hồng 790.000 | giảm 0 | bạn thu 0 | khách trả nơi khác 6.000.000 | còn lại: Tour Đảo trả 790.000
 Tổng: Bạn còn phải trả Tour Đảo 1.840.000 ₫.
 (Kiểm: 2.750.000 − 120.000 − 790.000 = 1.840.000.)

════ Chung cho cả hai ════
- Menu: Màn 1 nằm trong nhóm "Kế toán"; Màn 2 là mục "Sổ của tôi" trong menu Đối tác. Cho tôi xem vị trí trong menu trên cả iPhone (thanh dưới/ngăn kéo) và máy tính (menu dọc bên trái).
- Mức tương phản đạt WCAG AA; vùng chạm tối thiểu 44px.
- Cho tôi 2 phương án bố cục cho mỗi màn nếu có, kèm một câu nói phương án nào bạn khuyến nghị và vì sao.
```
