Dải trên trang: **tối đa một dải** ngay dưới thanh trên, cao một dòng (`h-control` 44), thứ tự ưu tiên bảo trì > thông báo quan trọng > nhắc bảo mật hai lớp > mất mạng; nút «Xem» mở BangTruot đọc đủ. Gộp dải bảo trì, thông báo quan trọng và nhắc hai lớp của mã (H-DAI-TREN, C-TRANG-CHU-DAI-DE).

## Tông
- `bao-tri` (`c-danger-soft`): «Đang bảo trì tới 22:00 — chỉ xem, không lưu được». Không đóng được.
- `quan-trong` (`c-sand-soft`, `megaphone`): thông báo quản trị gửi; **bắt bấm «Đã hiểu»** (câu 8 cổng 1), sau đó nhớ theo phiên.
- `nhac` (`c-band-bg`, `lock`): nhắc bật bảo mật hai lớp; đóng được, nhớ «đã đọc» theo phiên; **không hiện khi đang ở biểu mẫu** (Tạo đơn, Tạo chuyến).
- `mat-mang` (`c-mat-mang-bg` MỚI): «Đang ngoài mạng — dữ liệu lần xem gần nhất» + «Thử lại»; tự ẩn khi có mạng.

## Hành vi
Chữ một dòng cắt «…» (đọc đủ qua «Xem»); không đè ô tìm nổi của Trang chủ; không đẩy nội dung nhảy khi xuất hiện (giữ chỗ 44 nếu đã biết sẽ có). Lớp bình thường (không dính); dải bảo trì dính theo thanh trên.

## Người dùng truyền gì
Tông, câu ngắn, nội dung đủ cho bảng trượt, nhãn nút («Xem», «Đã hiểu», «Thử lại», «Bật ngay»), khoá nhớ theo phiên.

## Đừng
Không xếp chồng hai dải; không dải hai dòng; không dải nhắc trong biểu mẫu; không dùng dải thay toast.
