# Quyết định của chủ về 12 tên nút (2026-11-04)

Hồ sơ có ngày. Chủ dự án trả lời trang `TOM-TAT-CHO-CHU.md`, bản có câu 12 (lần lưu 8a031e28), nguyên văn: *«Về cơ bản tôi đồng ý với tất cả những đề xuất của bạn ở trên»*. Tệp này ghi lại, chưa sửa gì trên giao diện.

| Câu | Nút hiện tại | Tên chủ đồng ý | Loại việc |
|---|---|---|---|
| 1 | Thêm vai trò vào cấp này | Hai nút «Gán cho vai trò» và «Gán cho đối tác» (phương án C). Ô chọn trong hộp giữ «Vai người dùng» | Thêm nút mới, nút thứ hai mở hộp cấp riêng và chọn sẵn cấp |
| 2 | Bỏ ghi đè | Bỏ ghi đè giá, dấu Ẩn được giữ nguyên | **Đổi cách nút chạy, chạm dữ liệu** |
| 3 | Chuẩn bị N vé để gửi | Mở vé để gửi khách, kèm câu báo vé sẽ không về kho (cả ở «Tạo đường dẫn cho khách») | Đổi chữ, thêm câu báo |
| 4 | Còn vé | Còn vé, xác nhận đơn, kèm hộp hỏi lại nói rõ hậu quả | Đổi chữ, thêm một bước hỏi |
| 5 | Lưu, chờ xác nhận | Lưu đơn (chưa xác nhận). Nhãn đơn chưa gửi thành «Chưa xác nhận», hộp ảnh thành «Ảnh gửi khách» | Đổi chữ; **tách nhãn trạng thái là đổi logic hiển thị** |
| 6 | Đòi được khách / huỷ khoản | Ghi khoản thu đòi được | Đổi chữ |
| 7 | Cứu hộ | Kết thúc gián đoạn (xe hỏng) | Đổi chữ |
| 8 | Gửi xác nhận | Gửi kiểm vé | Đổi chữ |
| 9 | Đóng | Ngừng dùng (liên hệ), Ngừng điều kiện, Ngừng điều khoản | Đổi chữ |
| 10 | Khách đã chuyển khoản | Ghi khoản thu này | Đổi chữ |
| 11 | Hẹn ngày kết thúc | Đặt ngày kết thúc, kèm câu «chỉ đặt được một lần» | Đổi chữ, thêm câu báo |
| 12 | Ẩn / Hiện lại ở Dịch vụ & giá | Ngừng bán / Mở bán lại, nhãn và bộ lọc «Đã ngừng bán». Nút «Ẩn» mới của Toàn quyền giữ «Ẩn» / «Hiện lại», trang «Dữ liệu đã ẩn», chỉ làm nếu ADR-0164 được duyệt | Đổi chữ ở nút có sẵn; nút mới thuộc phiên của ADR-0164 |

## Cách hiểu của người ghi (chủ sửa được)

Tôi hiểu «những đề xuất ở trên» là 12 tên in đậm trong trang tóm tắt, chưa gồm bảng tham chiếu ngôn ngữ mà chủ hỏi cùng lúc, vì lúc đó tôi chưa đề xuất gì về bảng đó. Ở câu «muốn một chữ thống nhất thì nói», chủ chưa nói thêm nên hộp gán cấp vẫn dùng cả «vai trò» và «Vai người dùng» như hôm nay.

## Việc cần có trước khi sửa mã

ADR-0130 cho phép đổi tên thuần bằng cách thêm dòng vào bảng từ khi chủ đã chọn, không cần quyết định mới. Nhưng ba quyết định đã duyệt đang ghi tên cũ: ADR-0030 (nhãn «Chờ xác nhận», Q-A2), ADR-0108 điểm (f) («Khách đã chuyển khoản»), ADR-0136 (dòng 33 và 58, «Gửi xác nhận», «Lưu, chờ xác nhận»). Tài liệu chuẩn tắc thắng mã, nên cần một ADR ngắn ghi «thay câu của» như chính ADR-0130 đã làm, không sửa thân ADR cũ, chủ duyệt trước khi sửa. ADR đó ghi luôn phần đổi cách chạy ở câu 1, 2, 4 và phần tách nhãn ở câu 5. Bốn phần này là việc lớn: bài đỏ trước, xanh sau, có người kiểm độc lập.
