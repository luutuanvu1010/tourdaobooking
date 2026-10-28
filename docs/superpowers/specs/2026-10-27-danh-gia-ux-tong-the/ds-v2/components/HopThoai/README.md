Hộp xác nhận hành động **một chiều** (huỷ đơn, xoá, đăng xuất mọi máy, khoá sổ): cùng khuôn với BangTruot nhưng thân chỉ có một câu nói **hậu quả**, chân là nút phụ «Quay lại» + nút chính tông nguy hiểm (`data-tong="nguy-hiem"`) mang động từ của việc. Thay 17 chỗ `confirm()` của trình duyệt (H-HOP-THOAI).

## Khi nào dùng
Mọi việc không hoàn tác được hoặc tốn tiền/ảnh hưởng người khác. Việc hoàn tác được thì **không hỏi**, làm ngay và cho «Hoàn tác» trong toast (ThongBao). Việc cần lý do (huỷ đơn) thêm một ô chọn lý do trong thân; nút chính tắt kèm «Chọn lý do để huỷ» cho tới khi chọn.

## Nội dung
**Diện mạo thân lấy từ Claude Design (bảng gộp 28/10, dòng 13):** đầu thân là **vòng tròn 44 tông Đỏ** (`c-danger-soft` · `c-danger-text`, biểu tượng `alert`) + khối chữ: câu nội dung 16 rồi **câu hậu quả 14/500 `c-danger-text`** — để hộp một chiều khác hẳn bảng trượt thường. Tiêu đề = câu hỏi ngắn («Huỷ đơn TD-26-0412?»); câu hậu quả bằng lời thường («Không hoàn tác được.»); nút chính = «Huỷ đơn», không «OK»/«Có». Máy tính rộng tối đa `w-sheet`; điện thoại vẫn trượt từ đáy.

## Trạng thái
Mở (bẫy tiêu điểm, tiêu điểm mặc định ở nút **phụ**) · đang gửi (nút chính `data-dang-tai`) · lỗi: dải lỗi đầu thân, giữ hộp mở.

## Người dùng truyền gì
Tiêu đề, câu hậu quả, nhãn nút chính, hàm thực hiện; tuỳ chọn ô lý do.

## Đừng
Không `confirm()`/`alert()` của trình duyệt; không nút đỏ đặc ở ngoài hộp xác nhận; không hộp xác nhận cho việc hoàn tác được.
