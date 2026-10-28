Thanh bên của máy tính (≥ 900): rộng `w-sidebar` 248, nền `c-sidebar-bg`, nhóm gập cao `h-muc-nho` 36, mục `h-muc-menu` 40, mục đang mở nền `c-sidebar-active` + vạch trái `bw-indicator` 3 màu `c-indicator`; chân có lối Của tôi · Hỗ trợ · Hướng dẫn và khối người dùng (chữ tắt 32). **MỚI · diện mạo từ Claude Design (28/10), 7b có thể sửa.**

## Khi nào dùng
Mọi trang ở ≥ 900, lớp `z-tab`. Phần giữa cuộn, chân dính đáy để nhóm gập khi mở không bị che (B-THIET-LAP-CHE). Tối đa 10 mục hiện sẵn, nhóm gập đếm là một (câu 6). 641–899: thanh bên gọn 56 chỉ biểu tượng (`w-sidebar-gon`, E3) — **Claude Design chưa vẽ**, 7b vẽ.

## Trạng thái
Mục thường biểu tượng `c-sidebar-item` · rê nền `c-sidebar-hover` · đang mở (`aria-current="page"`) chữ và biểu tượng `c-sidebar-text-on` · nhóm gập `aria-expanded`, mũi xoay `t-vua` · số đếm viên `c-sidebar-badge` (giữ của mã; bản xuất dùng tông Cát — không lấy).

## Người dùng truyền gì
Danh sách mục theo vai (nhãn, biểu tượng, đích, số đếm, nhóm), mục đang mở, tên + vai + chữ tắt người dùng.

## Đừng
Tên nhóm: bản xuất viết thường không giãn chữ, mã in hoa `eyebrow` — **câu hỏi B-NHAN-IN-HOA để 7b nhìn thật ở 1040**; preview này theo bản xuất (viết thường). Không thụt mục con quá một cấp; không giấu mục đang mở trong nhóm đóng.
