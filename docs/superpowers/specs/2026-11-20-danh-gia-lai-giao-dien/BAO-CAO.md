# Báo cáo đánh giá lại giao diện Nền tảng — 20/11/2026

> Hồ sơ có ngày. Lượt đo lại của bước 0 trong kế hoạch 13/11; phiên điều phối và kiểm, không sửa giao diện, không chạm bản chạy thật.
> Bản được chấm: mã giao diện của bản chính `31d4c0174` (ảnh chụp ở nhánh đợt này, chỉ thêm tài liệu). Chi tiết: `PHAT-HIEN.md`, `BANG-PHU.md`, đề bài `DE-BAI.md`. Ảnh, số đo, báo cáo từng màn: `~/tourdao-danh-gia-2026-11-20/` (ngoài kho).

## 1. Kết luận

Trợ lý đánh giá giao diện đã chấm **87 màn** (63 trên 65 trang, đủ 11 bộ quyền và người chưa đăng nhập, hai khổ điện thoại và máy tính) trên máy thử có dữ liệu giả và đúng bộ màu, cỡ chữ của bản chạy thật. Kết quả: **1 điểm chặn việc, 70 điểm nặng, 405 điểm nhỏ**. Nền của giao diện vẫn chắc: không màn nào kéo ngang, không cắt mất số tiền, lưới bề rộng đã vào nếp. Chỗ yếu nhất là **họ màn Đơn hàng và Chi tiết đơn**, nơi nhiều người dùng nhất: hai số tiền cùng tô đỏ, việc thu tiền nằm cuối trang ở điện thoại, một con số ở Trang chủ ra hai giá trị giữa hai khổ, tiền bị viết gọn. Riêng hai lỗi của khung chung (tên đọc của chuông, phép đếm kiểu nút) đã chiếm 162 trên 405 điểm nhỏ, nên sửa một lần là nhiều màn cùng tốt lên. Đề nghị sửa họ Đơn hàng và Chi tiết đơn trước (đi cùng đợt Lập đơn đã duyệt), sau một đợt ngắn cho các chỗ dùng chung.

## 2. Mười điểm đáng sửa nhất (số ảnh là số tệp gửi kèm trong phiên)

1. **Chi tiết đơn** (mọi vai): «Tổng cộng» và «Còn lại» cùng tô đỏ, cùng đậm; khi chưa thu đồng nào hai số bằng nhau và nổi ngang nhau. Ảnh 1.
2. **Trang chủ** (5 vai): ô «Chưa phụ trách» ghi 18 ở điện thoại, cùng chỉ số ấy ghi 9 ở máy tính. Ảnh 2.
3. **Chi tiết đơn ở điện thoại**: nút «Ghi khoản thu» nằm gần cuối một trang rất dài, sau khối hoa hồng toàn số 0. Ảnh 3.
4. **Đơn hàng** (Kế toán, Bán hàng, Hướng dẫn viên): tiền viết gọn «1,43tr đ», đơn đã huỷ chen lên từ dòng thứ ba, trước nhiều đơn còn phải thu. Ảnh 4.
5. **Chính sách điều phối ở điện thoại** (Quản trị): đổi số xong không có nút lưu. Đây là điểm chặn việc duy nhất. Ảnh 5.
6. **Chi tiết chuyến ở điện thoại**: chữ nút «Chuyển sang xe khác» tràn khỏi viền; «Huỷ chuyến» là nút đỏ đặc nổi nhất màn. Ảnh 6.
7. **Quản lý tài khoản của Nhân sự** (máy tính): tiêu đề cột lệch dữ liệu, ngày tạo nằm dưới «Cấp độ đại lý». Ảnh 7.
8. **Máy đang đăng nhập** (máy tính): bảng bị cắt mất cột tên người, không biết đăng xuất máy của ai. Ảnh 8.
9. **Báo bận của tài xế đối tác**: nút «Lưu khung bận» mờ mà không nói phải làm gì trước (đã ghi từ 27/10 và 13/11). Ảnh 9.
10. **Phí đưa đón**: lộ mã nội bộ «ADR-0214» kèm câu «bảng này không còn dùng», còn danh sách mức phí bị đẩy xuống cuối. Ảnh 10.

## 3. Sửa một chỗ, nhiều màn tốt lên

- **Tên đọc của chuông và ảnh đại diện ở thanh trên**: 66 màn hết lỗi trợ năng.
- **Vùng chạm của liên kết nằm trong câu chữ, ô tích và ô chọn**: 18 màn ở điện thoại.
- **Một cách viết tiền và một tên cho số còn phải thu** (nay có «Còn thiếu», «Còn phải thu», «Còn thu», «Còn lại»): Trang chủ, Đơn hàng, Chi tiết đơn, khoảng 15 màn.
- **Một khuôn cho trạng thái rỗng và màn không có quyền**, có lối đi tiếp: 15 màn.
- **Khối Thanh toán của Chi tiết đơn** (màu số, vị trí ở điện thoại, bỏ dòng «0 ₫»): cả 5 bộ quyền.
- **Thành phần chọn dịch vụ** (tiêu đề dính cắt dòng đầu): 4 màn. **Đệm đáy cho thanh nút dính**: Sửa chuyến, Sửa xe.

## 4. Theo họ màn

| Họ màn | Chặn việc / Nặng | Nhận định | Thứ tự đề nghị |
|---|---|---|---|
| Đơn hàng + chi tiết (13 màn) | 0 / 16 | Yếu nhất tính theo số người dùng: tiền và việc thu tiền chưa rõ | 1 |
| Lập đơn (4 màn) | 0 / 2 | Đã gọn hơn: đợt sửa Tạo đơn 20/11 đã nằm trong bản được chấm (chưa lên bản chạy thật); còn bốn ý sửa của chủ ở `PHAT-HIEN.md` mục H | 1 (cùng đợt) |
| Tài xế, chuyến (7 màn) | 0 / 4 | Màn đầu rõ việc; chuyến bị giữ không cho tài xế lối đi tiếp | 2 |
| Điều phối xe (13 màn) | 0 / 8 | Dày; lỗi tập trung ở Chi tiết chuyến và vùng chạm | 2 |
| Tiền (12 màn) | 0 / 8 | Đọc được; nhiều màn chấm lúc rỗng, liên kết nhỏ, hai nút «Thêm giá» | 3 |
| Quản trị, Thiết lập (21 màn) | 1 / 23 | Nhiều điểm nhất nhưng ít người dùng; mỗi màn một thứ tự khối | 4 |
| Màn của đối tác bên ngoài (5 màn) | 0 / 5 | Gọn; còn chữ của văn phòng lộ ra cho đối tác | 5 |
| Vé điện tử, Trợ giúp và Của tôi, Đăng nhập và trạng thái (12 màn) | 0 / 4 | Ổn; trang Hỗ trợ có dòng chữ cụt | sau cùng |

## 5. So với 13/11

Đã hết: hộp hỏi của hệ điều hành, bề rộng không theo lưới (phần lớn), vùng chạm của ảnh đại diện, ô chọn ảnh không nhãn ở Quét vé. Còn: tiền hai kiểu viết, mã thô ở các trang danh mục, nút «Lưu khung bận» mờ, Thiết lập là danh sách phẳng, trang tài khoản dài, nhiều kiểu nút, vùng chạm của liên kết chữ, và năm điểm chặn lên kho (chính sách riêng tư, tên Nền tảng ba kiểu, biểu tượng). Không kiểm lại được bằng công cụ đợt này: chữ cỡ lớn, xoay ngang, iPad, nhảy bố cục. Bảng đủ từng mã ở `PHAT-HIEN.md` mục D.

## 6. Độ tin

- Kiểm lại độc lập trên mười mẫu tự chọn (sáu phát hiện của trợ lý, bốn nhận định so chéo): **8 trên 10 xác nhận, 2 xác nhận một phần, 0 bác**; bảng phủ khớp thư mục bằng chứng. Báo cáo đã sửa theo kết quả đó (ghi đúng lần lưu lúc chụp, thêm trang chưa chụp hết, gắn nhãn hai phát hiện nghi báo nhầm, bớt ba chỗ nói quá).
- Mười điểm ở mục 2 phiên điều phối đã tự mở ảnh xác nhận; điểm 5 còn đối chiếu thêm với mã.
- Chấm trên màn rỗng hoặc gần rỗng (15 màn): Xe đang chạy, Đề nghị chuyển khách, Bảng giá thuê xe, Khoá sổ tháng, Phân định, Cấp độ đại lý, Hạn mức trả sau, Chụp bù mức, Phí đưa đón, Phiếu đăng ký, Luật bán, Đặc điểm dịch vụ, Vé điện tử, Đối chiếu vé, Hồ sơ tổ chức. Đăng ký chấm ở trạng thái «tạm ngừng nhận». Sáu trang dài chưa chụp hết ở ít nhất một khổ (Chi tiết đơn chỉ thiếu đoạn cuối ở điện thoại; Nhật ký thay đổi mới chụp khoảng 4 %).
- Chưa kiểm: mọi thứ sau khi bấm, hộp thoại và bảng trượt, iPad, iPhone thật, tốc độ, chữ cỡ lớn. Phần so chéo là nhận định của phiên điều phối, chưa được thử như trợ lý.

## 7. Nợ công cụ

- Phép đếm kiểu nút và cỡ chữ tính cả khung chung nên «không đạt» ở 83 trên 87 màn, không còn giá trị phân loại.
- Trợ lý chấm không đều cho cùng một điều ở các màn khác nhau (ba trường hợp), và có hai phát hiện Nặng nghi báo nhầm (một do dữ liệu thử, một do đề bài của phiên điều phối ghi sai).
- Máy bỏ sót: chữ nút tràn viền, nút có ở khổ này mà mất ở khổ kia. Lệnh chụp dừng ở 10 ảnh và chỉ tự mở được Chi tiết đơn.
- Trợ lý gọi được bằng đúng tên, 74 lượt, mỗi lượt khoảng một phút. Chi tiết ở `PHAT-HIEN.md` mục F.

## 8. Cần bạn quyết

1. **Sửa riêng, sớm, lỗi mất nút lưu ở Chính sách điều phối trên điện thoại?** Khuyến nghị: có, làm thành một việc nhỏ, không chờ đợt họ màn.
2. **Bước 3 bắt đầu bằng họ Đơn hàng và Chi tiết đơn, sau một đợt ngắn sửa các chỗ dùng chung ở mục 3?** Khuyến nghị: có.
3. **Giữ hay đổi chữ «(văn phòng lo)» trên màn tài xế** (chữ đã duyệt 29/9, nay tiêu chí coi là chữ nội bộ)? Khuyến nghị: để tới đợt Tài xế, quyết bằng ảnh xem trước.
