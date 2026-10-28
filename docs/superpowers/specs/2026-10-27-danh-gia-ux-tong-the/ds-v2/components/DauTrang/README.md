Đầu nội dung trang kiểu **B**: tiêu đề trang nằm ở đầu thân (20 / 24 ở ≥ 900), tách khỏi thanh trên; thanh trên chỉ còn tên hệ thống + logo. **MỚI · diện mạo từ Claude Design (28/10), 7b có thể sửa.** Kiểu **A** (tiêu đề nằm trên thanh 60, như mã) là `.dau-trang` của ThanhDinh; 7b chọn A hay B khi nhìn thật ở 390 và 1040 (bảng gộp dòng 17).

## Khi nào dùng
Đầu mọi khuôn trang (Danh sách, Chi tiết, Biểu mẫu, Bảng điều khiển, Thiết lập) **nếu 7b chọn B**. Gồm: lối «‹ Quay lại» (chỉ khuôn Chi tiết / Biểu mẫu), tiêu đề `h1` có thể kèm huy hiệu trạng thái, một dòng phụ 14, và hàng hành động bên phải (tối đa 1 chính + 2 phụ, như luật năm khuôn).

## Trạng thái
Tĩnh. Hàng tiêu đề và hành động tự xuống dòng ở 390 (chữ trước, nút sau); tiêu đề không cắt «…» (khác kiểu A), dùng `text-wrap: balance`.

## Người dùng truyền gì
Tiêu đề, dòng phụ (mã đơn, ngày), huy hiệu (tuỳ chọn), đích quay lại (tuỳ chọn), hành động.

## Đừng
Không dùng cùng lúc kiểu A và B trên một trang (hai tiêu đề); không đặt nút chính ở hàng này khi trang đã có chân dính.
