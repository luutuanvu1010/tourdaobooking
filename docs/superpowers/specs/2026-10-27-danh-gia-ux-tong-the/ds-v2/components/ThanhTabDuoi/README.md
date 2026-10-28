Thanh tab dưới của điện thoại: 4 mục + nút tròn san hô «+ Tạo đơn» ở giữa; cao `tabbar-h` 56 + vùng an toàn, nền kính `c-tabbar-glass` + `blur-glass`, mục đang mở có viên 56 × 32 `c-tab-active-bg`. **MỚI · diện mạo từ Claude Design (28/10), 7b có thể sửa.** Nút tròn giữa thanh **bản xuất Claude Design thiếu**; bộ vẽ lại từ mã (`c-tab-new-bg`, `c-tab-new-icon`, `shadow-tab-new`, E1 đã duyệt).

## Khi nào dùng
Chỉ ≤ 640 (điện thoại), lớp `z-tab`, dính đáy. 641–899: phương án A của bộ là thanh bên gọn 56 (E3 đã duyệt); Claude Design dùng thanh tab tới 899 = phương án B, 7b nhìn thật rồi chọn.

## Trạng thái
Mục thường chữ/biểu tượng `c-text-muted` · đang mở (`aria-current="page"`) `c-tab-active-text` + viên · số đếm đỏ 18 trên góc biểu tượng · chạm cả cột (vùng chạm ≥ 44). Nhãn 12/500 dưới biểu tượng 24.

## Người dùng truyền gì
4 mục theo vai (nhãn, biểu tượng, đích, số đếm), có hay không nút «+ Tạo đơn» (vai không tạo đơn thì 5 mục thường, không nút tròn).

## Đừng
Không quá 5 mục; không nhãn hai dòng; không thanh dính thứ hai đè thanh tab (chân dính của trang nằm trên nó).
