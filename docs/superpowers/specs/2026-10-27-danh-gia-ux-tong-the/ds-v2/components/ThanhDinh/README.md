Hai thanh dính của mọi trang: **đầu trang** (một kiểu thay cho ≈ 12 kiểu — H-DAU-TRANG) và **chân dính** (một thanh dính đáy duy nhất, thay 5 kiểu — H-DINH). Không trang nào có hai thanh dính dưới chồng nhau.

## Khi nào dùng
Đầu trang ở **mọi** trang; chân dính chỉ ở điện thoại, khuôn Chi tiết và Biểu mẫu khi có việc tiếp theo.

**Đầu trang** `.dau-trang`: Cao `bar-h` 60, nền `c-bar-bg`, chữ `c-on-bar`, đường mảnh `c-bar-border` vẽ bằng bóng trong, lớp `z-dinh`. Trái = nút quay lại (điện thoại, `.nut-bieu-tuong` 44) hoặc đường dẫn một cấp (máy tính, `.duong-dan`); giữa = tiêu đề `tieu-de-trang` 18/600 cắt một dòng (căn giữa ở điện thoại, trái ở máy tính); phải = **tối đa một** hành động chính + chuông (`.huy-hieu-so` số chưa đọc) + biểu tượng Trợ lý (chuyển từ nút nổi lên đây — câu 4 cổng 1). Trang chủ là ngoại lệ có dải chào (giữ bản vẽ 1.73). Mục đang mở ở thanh tab/thanh bên sáng (`aria-current="page"`), tiêu đề trùng nhãn mục.

**Chân dính** `.chan-dinh`: Chỉ ở điện thoại cho khuôn Chi tiết (việc tiếp theo: «Xác nhận đơn», «Cho xe chạy») và Biểu mẫu (một nút chính `h-control-lon` 52 + tuỳ chọn nút phụ). Bên trái có `.tong` (dòng «3 dịch vụ · Tổng 9.300.000 ₫»; chạm mở bảng chi tiết trên thanh). Đệm đáy cộng `safe-area-inset-bottom`; bóng `shadow-overlay`; lớp `z-dinh`. Cảnh báo về tiền hiện ngay trên nút (ThongBao), luôn thấy. Khi có chân dính, trang chừa đệm đáy bằng chiều cao thanh. Thanh tab vẫn còn và nằm dưới chân dính (thanh tab là khung, chân dính là của trang); ngoài hai thứ đó không có thanh nào khác dính ở đáy.

## Trạng thái
Tiêu điểm trên nút vành `c-focus`; nút chính đang gửi `data-dang-tai`; chân dính lỗi: dải lỗi phía trên nút, thanh cao thêm, không che thân.

## Người dùng truyền gì
Tiêu đề, đích quay lại, hành động chính (nếu có), số thông báo; chân dính: dòng tổng, nhãn nút.

## Đừng
Không hai nút chính trên thanh trên; không nút nổi đè nội dung; không thanh dính thứ hai (ví dụ ô trả lời Hỗ trợ đè thanh tab); không tiêu đề khác nhãn mục.
