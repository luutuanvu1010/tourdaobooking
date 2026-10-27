Tab phụ trong trang — một thành phần, hai biến thể: **gạch chân** ở máy tính và **viên thuốc cuộn ngang** ở điện thoại (mép phải mờ báo còn tab). Thay 8 kiểu tab của mã / 11 kiểu đo được (H-TAB).

## Khi nào dùng
Hỗ trợ («Việc của nhóm · Yêu cầu của tôi»), Thông báo, Điều phối (Chưa xếp · Xe · Cần xử lý), Tài xế, dải trang anh em, phân đoạn Xe, hai tab của Hoa hồng. **Tab mặc định là tab có việc của vai** (người xử lý mở «Việc của nhóm», không mở tab rỗng — C-FEEDBACK-TAB-MAC-DINH). Không dùng tab cho điều hướng chính (đó là thanh tab / thanh bên).

## Biến thể
- Mặc định `.tab`: chữ 16/500 `c-text-muted`, tab đang chọn chữ `c-primary` + gạch `bw-indicator` màu `c-indicator`.
- `.tab[data-kieu="vien"]`: viên `radius-pill` 14/500, đang chọn nền `c-pill-on-bg` chữ `c-pill-on-text`; `data-mo-mep="true"` khi tràn; tab đang chọn luôn cuộn vào tầm nhìn.
- Số đếm trong tab bằng `.huy-hieu-so` (tông Biển).

## Trạng thái
Bình thường · rê chuột (chữ đậm hơn) · đang chọn `aria-selected="true"` · tiêu điểm vành `c-focus`; mũi tên ← → chuyển tab khi tiêu điểm ở tab.

## Người dùng truyền gì
Danh sách tab (nhãn, số đếm tuỳ chọn, `href` hay panel), tab mặc định theo vai; cùng nhãn ở cả hai khổ.

## Đừng
Không hơn 5 tab; không tab cho một mục duy nhất; không đổi nhãn theo khổ màn hình.
