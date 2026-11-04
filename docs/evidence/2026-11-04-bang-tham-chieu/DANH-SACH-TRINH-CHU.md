# Danh sách trình chủ: bảng tham chiếu ngôn ngữ (đợt 1)

Hồ sơ có ngày, viết 2026-11-04 khi dựng bảng (ADR-0167). Người soạn giải nghĩa theo thứ tự ADR đã duyệt rồi mã hiện hành; chỗ nào hai nơi nói khác nhau thì ghi ở đây và không tự hoà giải. Bản đọc đầy đủ của bảng là `docs/BANG-THAM-CHIEU.md`. Chủ chỉ cần đọc phần «Khái niệm» của bản đó và tệp này; phần «Thuật ngữ trong mã» và 299 việc quan trọng đã có nơi đặt nút kèm tệp để người kiểm tra.

## 1. Hai việc khác nhau đang mang cùng một tên (nên quyết trước)

Máy đã khai các chỗ này để không chặn việc. Chủ chọn tên thì AI sửa nút và bảng trong cùng một lần lưu.

1. **«Sửa giá».** Ở màn Dịch vụ & giá, nút này mở hộp nhập giá để ghi đè giá của dịch vụ cho mọi đơn lập sau. Ở thẻ dịch vụ trong lúc lập đơn, cũng nút «Sửa giá» nhưng chỉ mở khối sửa đơn giá của dòng trong đơn đang lập, bấm chưa ghi gì. Hai bên đều thấy tên dịch vụ ngay cạnh, nhưng hậu quả khác xa nhau. Bảng ghi việc thứ hai là «chờ chọn».
2. **«Gửi yêu cầu».** Ở Hỗ trợ và ở trang Hướng dẫn là cùng một việc: mở hộp gửi yêu cầu hỗ trợ (bảng đã gộp hai nơi vào một hàng). Nhưng ở Tôi › Hồ sơ của tôi, nút xác nhận trong hộp «Yêu cầu xoá dữ liệu» cũng ghi «Gửi yêu cầu» và việc đó là xin xoá dữ liệu cá nhân, không hoàn tác. Hộp có câu hỏi riêng nói rõ nên tôi để nguyên và hỏi chủ có muốn đổi chữ nút trong hộp xoá không.
3. **«Ngừng dùng».** Chủ chọn cho nút kết thúc dòng liên hệ ở Danh bạ (ADR-0166 câu 9). Xe cũng có nút «Ngừng dùng» từ trước ở màn sửa xe, cùng một cách đọc (đứng cạnh tên xe). Hai nơi hợp lý nhưng là hai việc, nên ghi để chủ biết.
4. **Các tên còn lại nằm ở nhiều hàng việc đã được xếp hết** (46 tên): 21 tên vào chữ dùng chung vì đối tượng đứng ngay cạnh nút (như «Sửa», «Từ chối», «Xác nhận»); 23 tên là cùng một việc có nhiều lối vào, hoặc một nút đổi chữ theo bước (như «Huỷ đơn», «Cho xe chạy»); 2 tên chờ chủ là «Sửa giá», «Gửi yêu cầu» ở trên. Danh sách và lý do ở mục «Tên dùng ở nhiều hàng việc» của bản đọc. Từ giờ tên mới rơi vào diện này mà chưa xếp thì máy báo đỏ.

## 2. Chữ dùng chung: đã xếp 34 chữ, nhờ chủ xem có đồng ý

Mỗi chữ được xếp vì đối tượng đứng ngay cạnh nút hoặc trong tiêu đề hộp. Mười ba chữ đầu đã đọc từng chỗ trong mã: **Đóng, Huỷ, Quay lại, Thôi, Thử lại, Lưu, Đổi, Đổi tên, Tắt, Bật, Dùng lại, Gỡ, Để sau.** Hai mươi mốt chữ sau xếp theo cột «thật sự làm gì» của từng hàng, chưa mở từng chỗ trong mã: **Sửa, Thêm, Từ chối, Xác nhận, Xác nhận từ chối, Xác nhận đã nhận, Xác nhận bật, Kết thúc, Gửi, Gửi từ chối, Gửi đề nghị, Rút lại, Rút yêu cầu, Nhận, Thu hồi, Duyệt, Điều chỉnh, Lưu sửa, Ngừng dùng, Thêm nhóm, Lưu thành bản mới.** Riêng «Đóng» chỉ còn nghĩa gập khung hoặc thoát hộp, vì ba nơi «Đóng» từng nghĩa là ngừng đã đổi tên ở ADR-0166 câu 9. Lý do từng chữ ở mục «Chữ dùng chung» của bản đọc.

## 3. Khái niệm chưa tìm thấy ngày chủ chọn tên (26)

Bảng ghi các khái niệm này là «chờ chọn» vì không tìm thấy ngày chủ chọn tên trong ADR hay đặc tả, và không bịa ngày. Đây là các tên đang dùng, chưa ai đề nghị đổi. Chủ chỉ cần nói «đúng hết», hoặc nêu tên muốn đổi, thì chuyển thành đã chốt: **Đơn, Dịch vụ trong đơn, Loại khách, Chuyến xe, Giấy tờ, Công việc tại đâu, Thông tin chuyến, Dịch vụ & giá, Người liên hệ tài xế, Tài xế của, Quyền, Nhật ký, Chế độ bảo trì, Gia hạn, Sửa sai, Xem đủ số, Mốc nhắc, Trạng thái xe, Điều chỉnh khẩn cấp, Chuyến bị giữ, Chính sách điều phối, Điều kiện cho xe chạy, Hạng bằng và số khách, Lý do điều phối, Giá đại lý, Người bán dịch vụ.** Hai khái niệm khác («Hồ sơ», «Tài khoản») có ngày 2026-09-25 lấy từ nhật ký thay đổi bản 1.10, là ngày đổi tên chứ chưa thấy lời chủ chọn riêng; tôi ghi rõ như vậy ở cột «Chủ chọn».

## 4. Chỗ ADR, mã và tài liệu nói khác nhau (không tự hoà giải)

- **Hạn chốt.** Giao diện đã dùng «Hạn chốt» từ 2026-10-18, nhưng `docs/SYSTEM-DESIGN.md` §15, `CLAUDE.md` và tên cột trong mã vẫn nói «mốc tối thiểu» hay «mốc 6 giờ». Bảng ghi «Hạn chốt» là tên chuẩn, chữ cũ ở cột chữ đã loại. Sửa tài liệu mô tả để Task 4 làm; `CLAUDE.md` do chủ duyệt.
- **«Vai trò» có ba nghĩa.** (a) Vai gán cho tài khoản, ví dụ Giám đốc, sinh bộ quyền mặc định. (b) Mục «Công việc tại đâu» trên hồ sơ, trong mã gọi là vai trò hồ sơ. (c) Ở trang Hoa hồng đối tác, mỗi mục trong thẻ «Vai người dùng» cũng gọi gọn là «vai trò». Bảng tách thành ba khái niệm: «Vai trò», «Công việc tại đâu», «Vai người dùng». Nên chủ xem có muốn đặt tên khác cho nghĩa (c).
- **Quyền «Hướng dẫn viên».** Nhãn trong mã là «Hướng dẫn viên», còn hồ sơ rà soát gọi quyền này là «Hiện trường» ở các danh sách ai thấy trang. Bảng dùng «Hướng dẫn viên» theo mã.
- **Ô «Đơn nháp» ở Trang chủ** vẫn gọi đơn chưa xác nhận bằng tên khác, trái ADR-0166 mục 4 (chữ «Nháp» không dùng lại). ADR-0166 đã ghi giữ nguyên tới khi chủ chọn tên (`docs/BACKLOG.md` mục 64).
- **«Phiên».** Sản phẩm bỏ chữ «Phiên» cho nghĩa máy đang đăng nhập (đổi thành «Máy đang đăng nhập»). Phụ lục B của `playbook/FRAMEWORK.md` (chỉ đọc) dùng «phiên» cho một lần làm việc với AI. Khác lĩnh vực nên không xung đột, chỉ ghi để biết.
- **ADR-0166 và `QUYET-DINH-CHU.md`.** Tôi đối chiếu 12 tên, không thấy chỗ nào lệch nhau.

## 5. Điều nên biết về dữ liệu nạp

- 299 hàng việc quan trọng: 200 đã chốt, 99 chờ chọn (chờ chọn là các tên rà soát cho là chưa rõ hoặc gây hiểu lầm, trình chủ theo lô ở đợt 2). 66 mục bỏ qua. Máy chỉ nạp 66 trong 74 mục bỏ qua của hồ sơ vì tám mục trùng khoá với mục khác cùng tệp hoặc với một việc đã khai.
- Đường lệnh chỉ nối khi còn route thật trong mã. Nhiều hàng có đường lệnh gồm cả đường đọc (tải lại danh sách) lẫn đường ghi, vì bộ quét lần theo hai bước hàm. Một hàng ghi dữ liệu chưa nối được là «Đã lên xe / Đã xuống (người đi kèm)». Danh sách chi tiết ở `chua-noi.txt` cùng thư mục.
- Mã nhật ký: 260/299 hàng có; năm hàng không khớp nhãn nào, năm hàng khớp một phần. Tôi để trống thay vì đoán.
- Lời mô tả của bốn hàng đổi cách chạy (ADR-0166 câu 1, 2, 4, 5) đã sửa tay theo mã hiện tại; các hàng còn lại giữ nguyên lời rà soát ngày 4/11.
- Giới hạn đã nói trong bản đọc: máy kiểm tên có nhất quán, không kiểm có đúng sự thật.
