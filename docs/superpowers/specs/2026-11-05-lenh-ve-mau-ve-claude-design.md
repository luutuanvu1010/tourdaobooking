# Lệnh vẽ mẫu vé Tour Đảo cho Claude Design (2026-11-05)

Dán khối dưới đây vào dự án Claude Design «Tour Đảo Booking Design System» (`https://claude.ai/design/p/34f284df-c97a-4672-bb66-d7df03a0d97a`), kèm tệp logo `public/icons/icon-512.png`. Vẽ xong gửi lại đường dẫn để đối chiếu với thiết kế `2026-11-05-ve-tour-dao-design.md`. Lệnh này chỉ vẽ tấm vé; các màn quản lý ở `2026-11-05-ve-dien-tu-danh-sach-man.md` vẽ sau khi chủ dự án chốt danh sách.

```
Thiết kế mẫu vé điện tử cho Công ty TNHH Tour Đảo (Nha Trang), công ty tổ chức tour đảo và dịch vụ du lịch biển. Dùng logo đính kèm và hệ thiết kế của dự án này: phông Be Vietnam Pro, xanh biển đậm #0C4A6E, màu cát #F5A623 làm điểm nhấn.

## CẢM GIÁC CẦN ĐẠT
Sang, tin cậy, tiết chế, ngang tầm tập đoàn du lịch và hàng không hàng đầu thế giới. Nghĩ tới thẻ lên tàu hạng cao cấp: nhiều khoảng trắng, thứ bậc chữ rõ, ít màu, mọi chi tiết đều có lý do. Không dùng ảnh nền, ảnh bãi biển, hoạ tiết rối, viền sặc sỡ, chữ nghiêng trang trí, hay kiểu tờ rơi khuyến mãi. Không bắt chước thương hiệu của công ty khác.

## TẤM VÉ LÀ GÌ
Tấm ảnh dọc khách nhận qua Zalo hoặc đường dẫn, mở trên điện thoại cho nhân viên quét, đôi khi in ra giấy. Vé là cam kết dịch vụ của công ty, không phải hóa đơn.

## RÀNG BUỘC KỸ THUẬT (bắt buộc)
1. Khổ 1080 x 1920 px. Nền phẳng, khối màu và đường nét đơn giản, vì vé được vẽ lại bằng canvas trên trình duyệt: không đổ bóng mờ, không kính mờ, không chuyển màu phức tạp.
2. Mã QR đen trên nền trắng, rộng ít nhất 520 px, viền trắng trống quanh mã rộng ít nhất 40 px. Không đặt logo, chữ hay hoạ tiết đè lên mã. Mã nằm ở nửa trên tấm vé. Trong bản vẽ dùng ô giả, ghi rõ là mã minh hoạ.
3. Vẫn đọc rõ khi thu nhỏ còn 360 px chiều rộng và khi in đen trắng. Chữ nhỏ nhất tương đương 28 px ở khổ gốc.
4. Không được có: giá tiền, số điện thoại khách, mã đơn. Vé từng khách không có tên khách, vì vé được tạo sẵn trước khi biết khách là ai.
5. Mọi dòng in hai thứ tiếng: tiếng Việt có dấu là chính, tiếng Anh nhỏ hơn ngay bên dưới, nhưng vẫn không nhỏ hơn 28 px. Tên công ty và số hotline giữ nguyên, không dịch. Không có mã kỹ thuật.

## NỘI DUNG (dùng đúng dữ liệu mẫu hư cấu này)
Vé từng khách:
- Logo và tên Công ty TNHH Tour Đảo
- Vé dịch vụ / Service ticket
- Tour 4 đảo Nha Trang / Nha Trang 4-Island Tour
- Người lớn / Adult
- Dùng vào ngày đi đã đặt. Hạn cuối 31/12/2026 / Valid on your booked date. Expires 31/12/2026
- Mã QR
- Số vé …K7QX / Ticket no. …K7QX
- Mỗi vé dùng một lần. Xuất trình mã cho nhân viên Tour Đảo. / Single use. Show this code to Tour Đảo staff.
- Vé này không phải hóa đơn. / This ticket is not an invoice.
- Hotline 0000 000 000

Vé đoàn (một mã cho cả đoàn):
- Logo và tên Công ty TNHH Tour Đảo
- Vé đoàn / Group ticket
- Tour 4 đảo Nha Trang / Nha Trang 4-Island Tour
- Đoàn Biển Xanh · 12 khách / Biển Xanh group · 12 guests
- Ngày đi 20/12/2026 / Travel date 20/12/2026
- Mã QR
- Số vé …M2PL / Ticket no. …M2PL
- Quét cho cả đoàn, được quét nhiều đợt đến đủ số khách. / One code for the whole group, scanned in rounds until all guests are in.
- Vé này không phải hóa đơn. / This ticket is not an invoice.
- Hotline 0000 000 000

## CẦN VẼ
A. Ba hướng thiết kế khác hẳn nhau, đặt cạnh nhau, mỗi hướng gồm cả vé từng khách và vé đoàn:
   1. «Thẻ lên tàu»: dải màu đầu vé, các ô thông tin chia cột, cảm giác hàng không cao cấp.
   2. «Hải trình»: một đường nét mảnh gợi hải đồ hoặc sóng làm điểm nhấn duy nhất, ấm và có bản sắc biển đảo.
   3. «Tối giản»: gần như toàn trắng, logo nhỏ, chữ làm chủ, một vạch màu duy nhất.
B. Một khung điện thoại rộng 390 px cho hướng 1, hiển thị vé trên màn hình, để kiểm tra vé có vừa một màn và mã đủ lớn để quét không, kể cả khi đã in hai thứ tiếng.

Ghi ngắn dưới mỗi hướng: điểm mạnh và điểm yếu của hướng đó khi khách mở trên điện thoại ở bến tàu ngoài nắng.
```
