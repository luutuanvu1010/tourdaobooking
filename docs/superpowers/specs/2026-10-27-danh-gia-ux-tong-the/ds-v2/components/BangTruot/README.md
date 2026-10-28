Bảng trượt từ đáy ở điện thoại và hộp thoại giữa màn ở máy tính là **một khuôn** (`moBangTruot`, đã dùng ở 31 tệp): lớp phủ `c-scrim`, tay kéo, đầu có tiêu đề + nút đóng, thân cuộn, chân **một nút chính + một nút phụ**. Thay 5 cách dựng hộp thoại của mã (H-HOP-THOAI).

## Khi nào dùng
Sửa nhanh một phần (Sửa thông tin chuyến, Sửa danh sách hành khách), bộ lọc nhiều ô, thêm mới trong trang Thiết lập/Danh sách (điện thoại), đọc đủ nội dung của dải trên trang. Việc dài hơn một màn thì dùng trang riêng, không bảng trượt.

## Hành vi
Mở trượt lên `t-vua` theo `ease-out`; bẫy tiêu điểm bên trong; `Esc` và chạm lớp phủ đóng (nếu không có thay đổi chưa lưu — có thì hỏi bằng HopThoai); kéo tay kéo xuống để đóng; bàn phím hiện lên thì chân vẫn thấy (thân cuộn, chân dính). Rộng tối đa `w-sheet` 520 (`w-confirm` 640 cho hộp có ảnh xem trước); cao tối đa 92 % (80 % máy tính). Lớp `z-truot`.

## Trạng thái
Bình thường · lỗi khi lưu: dải ThongBao tông lỗi **ở đầu thân** (`.dai-loi-dau`), không toast · đang gửi: nút chính `data-dang-tai`, nút phụ tắt · tiêu điểm vành `c-focus`.

## Người dùng truyền gì
Tiêu đề (18/600), nội dung thân (các `.truong`), nhãn hai nút, hàm lưu. Nút chính là động từ của việc («Lưu chuyến»), không «OK».

## Đừng
Không hai nút chính; không bảng trượt lồng bảng trượt; không đóng mất dữ liệu đã gõ khi lỗi mạng (giữ nội dung, báo lỗi đầu thân); không thanh dính thứ hai dưới chân bảng.
