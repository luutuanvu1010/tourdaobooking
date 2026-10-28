Ô tích, ô chọn một và công tắc — ba cách chọn không gõ, gộp từ 6 cách dựng của mã hiện tại (H-O-NHAP). Dùng `.o-tich`, `.o-chon-mot`, `.cong-tac` bọc quanh `<input>` thật để bàn phím, trình đọc màn hình và biểu mẫu vẫn hoạt động.

## Khi nào dùng
- **Ô tích** (`.o-tich`, vuông `vc-check` 22): bật/tắt nhiều mục độc lập («Giấy này không có hạn», chọn nhiều dòng trong bảng).
- **Ô chọn một** (`.o-chon-mot`, tròn `vc-radio` 20): chọn đúng một trong 2–5 phương án hiện sẵn (lý do «Sửa sai», «Khách lẻ | Qua đối tác» khi có hơn hai). Hơn 5 phương án thì dùng ô chọn thả xuống (ONhap).
- **Công tắc** (`.cong-tac`, `w-switch` × `h-switch`): bật/tắt một thiết lập có hiệu lực ngay («Phải đủ danh sách khách»). Không dùng công tắc cho lựa chọn cần nút «Lưu».
- Nhóm nhiều ô đặt trong `<fieldset class="nhom-chon">` với `<legend>` là nhãn nhóm.

## Trạng thái
**Diện mạo lấy từ Claude Design (bảng gộp 28/10, dòng 04).** Chưa chọn: viền **2 px `c-check-border`** (= `c-text-muted`, 7,6:1 — mã đang 1,5:1 và 1,25:1, phát hiện B-VIEN-O-CHON-TUONG-PHAN) · ô tích bo `bo-control` 8 (bản xuất ghi cứng 6, không chép) · rê: nền `c-soft-hover` · đã chọn: nền/viền `c-primary`, dấu tích `c-on-dark`; ô chọn một viền dày `vc-radio-on` · công tắc tắt nền **`c-switch-off-bg`**, bật `c-primary`, núm trắng có bóng nhẹ, trượt `t-vua` 200 ms · tiêu điểm vành `focus-ring` màu `c-focus`, cách `vanh-cach` · tắt: nền `c-surface-alt`, viền `c-input-border`, chữ `c-text-muted` · lỗi viền `c-danger` + câu dưới nhóm, thụt theo ô.

Bố cục một dòng: cao tối thiểu `h-control` 44 (đệm dọc 10), ô đứng trước, nhãn 16 bên phải, **mô tả** 14 `c-text-muted` dưới nhãn (`.o-chon-chu` > `.o-chon-mo-ta`); công tắc đảo chiều — nhãn trái, công tắc sát phải.

## Người dùng truyền gì
Nhãn là chữ bên phải ô (toàn dòng bấm được, cao `h-control` 44); `name` chung cho một nhóm ô chọn một; `aria-describedby` trỏ câu lỗi của nhóm.

## Đừng
Không vẽ ô tích bằng ký tự ✓ hay emoji; không dùng công tắc kèm nút «Lưu»; không đặt nhãn bên trái ô (trừ bảng).
