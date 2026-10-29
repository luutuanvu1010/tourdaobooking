Ô ngày và ô giờ là `.o` với `data-loai="ngay"` (`type="date"`) và `data-loai="gio"` (`type="time"`, chữ số đều cột): cùng chiều cao, chữ 16, viền và vành tiêu điểm với ô nhập.

**Trong mã:** khối «Thành phần chung v2» của `public/app.css` (`.o[data-loai]`). Lịch chọn ngày là của trình duyệt (theo ngôn ngữ giao diện trình duyệt, không theo `lang` trang).

## Người dùng truyền gì
Nhãn `.nhan`; giá trị `yyyy-mm-dd` / `HH:MM`; hiển thị chỉ đọc thì dd/mm/yyyy.

## Đừng
Không ô gõ tay ngày thay cho ô ngày.
