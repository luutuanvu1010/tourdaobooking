Ô tích, ô chọn một và công tắc — ba cách chọn không gõ, gộp từ 6 cách dựng của mã hiện tại (H-O-NHAP). Dùng `.o-tich`, `.o-chon-mot`, `.cong-tac` bọc quanh `<input>` thật để bàn phím, trình đọc màn hình và biểu mẫu vẫn hoạt động.

## Khi nào dùng
- **Ô tích** (`.o-tich`, vuông `vc-check` 22): bật/tắt nhiều mục độc lập («Giấy này không có hạn», chọn nhiều dòng trong bảng).
- **Ô chọn một** (`.o-chon-mot`, tròn `vc-radio` 20): chọn đúng một trong 2–5 phương án hiện sẵn (lý do «Sửa sai», «Khách lẻ | Qua đối tác» khi có hơn hai). Hơn 5 phương án thì dùng ô chọn thả xuống (ONhap).
- **Công tắc** (`.cong-tac`, `w-switch` × `h-switch`): bật/tắt một thiết lập có hiệu lực ngay («Phải đủ danh sách khách»). Không dùng công tắc cho lựa chọn cần nút «Lưu».
- Nhóm nhiều ô đặt trong `<fieldset class="nhom-chon">` với `<legend>` là nhãn nhóm.

## Trạng thái
Bình thường viền `c-input-border` · đã chọn nền/viền `c-primary` (dấu tích `c-on-dark`; ô chọn một viền dày `vc-radio-on`; công tắc nền `c-primary`, núm `c-on-dark`) · tiêu điểm vành `c-focus` · tắt nền `c-surface-alt` · lỗi viền `c-danger` + câu dưới nhóm.

## Người dùng truyền gì
Nhãn là chữ bên phải ô (toàn dòng bấm được, cao `h-control` 44); `name` chung cho một nhóm ô chọn một; `aria-describedby` trỏ câu lỗi của nhóm.

## Đừng
Không vẽ ô tích bằng ký tự ✓ hay emoji; không dùng công tắc kèm nút «Lưu»; không đặt nhãn bên trái ô (trừ bảng).
