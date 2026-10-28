Ô ngày và ô giờ dùng `<input type="date">` / `<input type="time">` của trình duyệt trong lớp `.o-nhap`, hiện giá trị dd/mm/yyyy và hh:mm theo máy người dùng; không vẽ lịch riêng.

## Khi nào dùng
«Ngày khởi hành» (một ngày cho cả đơn, đứng đầu biểu mẫu), «Giờ đón», «Hiệu lực từ», chọn ngày điều phối. Hai ô liền nhau khi cần cả ngày lẫn giờ (`.hang-truong`). Ngày đã qua hay ngoài khoảng cho phép thì chặn bằng `min`/`max` và báo lỗi dưới ô như ONhap, không để máy chủ báo sau.

## Trạng thái
Như ONhap: viền `c-input-border` → đang gõ `c-focus` → lỗi `c-danger`. Chữ số đều cột. Ô «Chưa chốt giờ» là một ô chọn (OChon) đứng cạnh ô giờ, không phải giá trị rỗng.

## Người dùng truyền gì
`value` dạng ISO (`2026-10-28`, `07:30`); `min`, `max`; nhãn nói rõ phạm vi («Áp cho mọi dịch vụ trong đơn»). Lịch bật ra theo ngôn ngữ giao diện của trình duyệt (máy chủ dự án đang để tiếng Anh nên lịch hiện tiếng Anh — không phải lỗi của Nền tảng).

## Đừng
Không thư viện lịch; không ô gõ tự do cho ngày; không ghi ngày kiểu mm/dd.
