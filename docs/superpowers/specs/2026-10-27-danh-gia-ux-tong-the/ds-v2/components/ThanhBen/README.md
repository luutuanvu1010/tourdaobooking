Thanh bên `#sidebar` cho khổ ≥ 900: rộng `w-sidebar` 248, nền `c-sidebar-bg`; đầu logo + tên; giữa cuộn riêng gồm nhóm HẰNG NGÀY (không tiêu đề) · VẬN CHUYỂN · TIỀN · nhóm gập Thiết lập; chân dính: Của tôi · Hỗ trợ · Hướng dẫn + người dùng + Đăng xuất.

**Trong mã:** `web/shell.ts` `sidebar`, `sidebarGroup`, `nutGap`; danh sách ở `THANH_BEN` (`src/shared/muc-giao-dien.ts`, mục khai `nhomGap` thì gập: «Điều phối» = Điều phối xe + Đề nghị chuyển khách khi cả hai hiện). Bản xem trước vẽ lại bằng lớp riêng của bộ.

## Trạng thái
Mục đang mở `aria-current` nền `c-sidebar-active` + vạch trái `bw-indicator` `c-indicator`; nhóm gập đang đóng mà chứa trang đang mở có chấm `c-sidebar-cham` (`dot-size` 8); nhóm Thiết lập có số đếm. Huy hiệu số chỉ nạp khi thanh bên đang hiện thật.

## Không dùng
Thanh bên thu gọn 56 chỉ biểu tượng ở 641–899 (`w-sidebar-gon`) — cổng 2b chọn B, mã không có.
