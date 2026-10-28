Thẻ là khối nền trắng bo `radius-md` 12 cho một đơn vị nội dung: một đơn trong danh sách điện thoại, một ô số liệu, một khối của trang chi tiết. Gộp 14 kiểu thẻ của mã (H-THE) về một lớp `.the`.

## Khi nào dùng
- **Thẻ danh sách** (≤ 899): một đơn / xe / hồ sơ, 3 dòng: tên + huy hiệu, dòng phụ, tiền bên phải. Cả thẻ bấm được (`data-bam="true"`, là `<a>`), nhấc `lift` khi rê.
- **Thẻ số liệu** (`.the-so-lieu`): số lớn `so-lon` 26/600 + nhãn 14; ô số đếm ở bảng điều khiển **bấm được và nhảy tới khối tương ứng** (C-HDV-DON-CUA-TOI-XA). Mẫu: «Mức đang áp dụng», «Tra nhanh» của Hoa hồng.
- **Khối của trang chi tiết**: tiêu đề `.the-tieu-de` 16/600 rồi nội dung; thứ tự khối cố định theo khuôn Chi tiết.
- Lưới thẻ `.luoi-the` tự xếp cột ≥ 240 px.

## Trạng thái
Bình thường bóng `ring-card` + `shadow-card` · rê chuột (chỉ thẻ bấm được) `shadow-card-hover` + nhấc `lift` · tiêu điểm vành `c-focus` · lỗi (`data-loi="true"`) viền `c-danger` (thẻ dịch vụ có lỗi chặn lưu luôn mở) · đang tải: thẻ chứa khung xương cùng lưới (KhungXuong).

## Người dùng truyền gì
Nội dung; `href` nếu bấm được; huy hiệu trạng thái ở dòng hai khi tên dài (không cắt tên dưới 20 ký tự ở 390). Tiền ghi đủ «1.080.000 ₫».

## Đừng
Không viền màu bên trái; không thẻ lồng thẻ; không đệm khác `s4`; không thẻ chỉ để tạo nền cho một dòng chữ.
