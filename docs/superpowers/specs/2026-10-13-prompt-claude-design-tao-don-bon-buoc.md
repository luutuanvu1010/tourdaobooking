# Prompt cho Claude Design: mockup màn "Tạo đơn" bốn bước trên điện thoại (2026-10-13)

> Chủ dự án chép phần giữa hai vạch dán vào Claude Design. Kèm theo, đính ba ảnh để nó thấy màn hiện tại: `docs/evidence/2026-10-13-dot-1/sau/ban-hang-390-don.png`, `.../sau/ban-hang-390-ds.png`, `.../sau/huong-khuyen-nghi-390.png` (trong bản sao của trợ lý, nhánh `worktree-agent-a4b3d8cf8bf251678`). Mockup chỉ là hình để chủ duyệt; sau khi duyệt mới thi công.

---

Hãy vẽ mockup độ trung thực cao cho màn **"Tạo đơn"** của Nền tảng nội bộ "Tour Đảo Booking" (CRM của một công ty tour đảo ở Nha Trang), **trên điện thoại 390 × 844 px**, tiếng Việt có dấu đầy đủ. Người dùng là nhân viên bán hàng đang cầm điện thoại, vừa nghe khách gọi vừa lập đơn, nên phải **nhanh, ít cuộn, biết ngay mình đang ở bước nào**. Hiện tại màn rất dài (khoảng 4.100 px cho một đơn một dịch vụ) và người mới nhìn vào không biết bắt đầu từ đâu; tôi đính kèm ảnh màn hiện tại.

## Nhận diện (dùng đúng, đừng đổi)
- Phông **Be Vietnam Pro**; ô gõ chữ **16 px** trở lên (iPhone sẽ phóng to trang nếu nhỏ hơn); chữ nhỏ nhất 12 px.
- Màu: xanh đậm chủ đạo `#0c4a6e` (nền thanh trên, nút chính, tiêu đề), xanh nhạt `#dcebf6` (nút/chip đang chọn), nền trang `#f2f5f9`, thẻ trắng `#ffffff`, viền `#e1e7ef`, chữ `#0f172a`, chữ phụ `#475569`. Màu san hô `#c0392b` CHỈ cho tiền cần chú ý ("Tổng cộng") và nút chốt. Cát `#f5a623` cho nhãn trạng thái ("Chờ nhận"). Lỗi dùng đỏ hồng `#b01235` trên nền `#fde9ee`.
- Bo góc: thẻ 18 px, ô và nút 12 px, chip dạng viên thuốc. Vùng bấm tối thiểu 44 px.
- Thanh trên có mũi tên quay lại, tiêu đề "Tạo đơn", chuông, ảnh đại diện. Cuối màn có **thanh dính** hiện "N dịch vụ · Tổng X đ" và nút chính.

## Cấu trúc bốn bước (một trang cuộn, có thanh tiến độ dính ở trên cho biết đang ở bước nào; bấm vào tên bước thì cuộn tới bước đó; bước đã đủ thông tin có dấu ✓)
1. **Ngày và Khách** (khách lên đầu vì đây là thứ nhân viên hỏi đầu tiên):
   - Ô ngày khởi hành (áp cho cả đơn).
   - Tên khách, số điện thoại (đánh dấu bắt buộc bằng dấu * trong chữ mờ, không có nhãn rời phía trên).
   - Một nút nhỏ "Dùng thông tin của tôi" (khi nhân viên đặt cho chính mình) và dòng chữ liên kết "+ Thêm chi tiết (email, ghi chú)" gập mặc định.
   - Hàng hai lựa chọn dạng nút phân đoạn: **Khách tự đặt | Đặt qua đối tác**. Chọn "Đặt qua đối tác" thì hiện ô tìm "Gõ tên đại lý / cộng tác viên" ngay bên dưới; dòng phụ nhỏ giải thích "Đơn của đại lý hoặc cộng tác viên: chọn tại đây, đừng nhập vào ô khách".
2. **Dịch vụ**:
   - Nút xổ xuống "Nhóm dịch vụ" (chọn nhiều nhóm bằng ô tick, có "Bỏ chọn hết"; ghi số nhóm đang chọn, ví dụ "Nhóm dịch vụ · 2"), nằm TRÊN ô gõ.
   - Ô gõ "Chọn từ danh mục — gõ tên hoặc mã"; bấm vào là mở cả danh sách, mỗi dòng: dấu sao ở ĐẦU dòng (đánh dấu dịch vụ hay dùng, dịch vụ có sao xếp lên trước), tên dịch vụ to, mã và đơn vị ("theo người") ở dòng phụ, giá bên phải.
   - Mỗi dịch vụ đã chọn là một **thẻ**: tên, nút Xoá, bộ đếm số khách (Người lớn, Trẻ em, Người cao tuổi, Em bé, mỗi loại có nút − / +), thành tiền.
   - Trong thẻ, khối **Đưa đón** hiển thị mặc định gọn thành MỘT dòng tóm tắt, ví dụ "Chiều đi · Đón 07:30 · Khách sạn ABC → Cảng Vinpearl", bấm vào để mở ra các ô: Giờ đón, Nơi đón, Nơi trả (chọn nhanh Cảng Vinpearl, Bến tàu du lịch Nha Trang hoặc tìm điểm khác), nút "Đón khác ngày", "+ Thêm chiều về", "+ Thêm chặng". Các ô ít dùng (Xe riêng, Xe tối thiểu N chỗ, số hiệu chuyến bay) nằm sau "+ Thêm chi tiết".
   - Khối **Thông tin chuyến** (giờ khởi hành, và nhóm "Tập trung / check-in" gồm ngày, giờ, nơi, ghi chú dịch vụ) gập mặc định, bấm mới mở.
   - Nút "+ Thêm dịch vụ khác".
3. **Thanh toán**: giảm giá (đ), thanh toán trước (đ), hình thức (Chuyển khoản…), người nhận tiền, ghi chú thanh toán; dưới là khối **Tóm tắt** (số dịch vụ, tạm tính, **Tổng cộng** bằng màu san hô) với dòng "Số trên đây chỉ để xem trước; hệ thống tính lại chính thức khi lưu".
4. **Người phụ trách**: thẻ có nhãn trạng thái "Chờ nhận", dòng "Chưa chọn ai — hướng dẫn viên nào cũng bấm Nhận được", nút "Chọn người phụ trách ›".

Thanh dính dưới đáy luôn có nút chính **"Lưu, chờ xác nhận"**.

## Điều tôi cần thấy trong mockup
- **Năm màn hình** (một khung điện thoại mỗi màn): (a) mở màn, bước 1 trống, thanh tiến độ ở bước 1; (b) bước 2 với nút nhóm xổ xuống đang mở; (c) bước 2 với danh sách dịch vụ đang mở; (d) bước 2 sau khi chọn "Tour 4 đảo Nha Trang", khối Đưa đón gọn một dòng, và một khung phóng to khối Đưa đón đang mở; (e) bước 3 và 4 cuối trang, nút chính ở đáy.
- Một màn riêng cho trạng thái **lỗi**: thiếu số điện thoại, ngày đón sớm hơn ngày khởi hành (thông báo đỏ ngay dưới ô, kèm câu hướng dẫn cách sửa).
- **Không dùng nhãn tiêu đề rời phía trên ô**; mỗi ô gõ dùng chữ mờ hướng dẫn, riêng ô ngày và giờ dùng nhãn nổi nhỏ nằm trong khung (vì iPhone không hiện chữ mờ cho ô ngày giờ).
- Chữ ngắn, từ quen thuộc của nhân viên bán tour; không có từ tiếng Anh lộ ra giao diện. Gọi hệ thống là "Nền tảng".

## Đừng làm
- Đừng thêm tính năng ngoài danh sách trên; đừng đổi tên các nút đã nêu; đừng dùng gradient, bóng đổ đậm, hình minh hoạ trang trí; đừng dùng chữ nhỏ hơn 12 px; đừng bỏ thanh dính dưới đáy.
- Cho **hai phương án** bố cục thanh tiến độ để tôi chọn: (A) bốn chấm tròn đánh số ở trên cùng, dính khi cuộn; (B) bốn tab chữ ngắn cuộn ngang ("Khách", "Dịch vụ", "Tiền", "Phụ trách"). Khuyến nghị của tôi là A; hãy nói ngắn vì sao B có hoặc không hợp.

Sau khi vẽ xong, ghi ra danh sách **những chỗ bạn đã phải giả định** vì thông tin chưa đủ, để tôi trả lời một lượt.
