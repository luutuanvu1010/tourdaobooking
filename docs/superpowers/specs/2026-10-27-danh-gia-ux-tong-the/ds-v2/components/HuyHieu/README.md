Huy hiệu trạng thái **không bấm được**: một chữ + một tông + một biểu tượng + một hình (12/500, `radius-pill`, nền nhạt chữ đậm, không viền). Gộp 7 họ huy hiệu của mã về một lớp `.huy-hieu[data-tong]` (H-CHIP, đề cương mục 5).

## Năm tông
| `data-tong` | Nền · chữ | Biểu tượng | Dùng cho |
|---|---|---|---|
| `cat` | `c-sand-soft` · `c-sand-text` | `clock` | Chờ xác nhận, Chưa xếp, Sắp hết hạn, Chưa ai nhận, Vé mới |
| `bien` | `c-primary-soft` · `c-primary` | `history` | Đang xử lý, Đang chạy, Đã xếp, Đã giao |
| `la` | `c-green-soft` · `c-green-text` | `check` | Đã xác nhận, Hoàn tất, Còn hạn, Đã thu đủ, Vé xong |
| `do` | `c-danger-soft` · `c-danger-text` | `alertCircle` | Đã huỷ, Từ chối, Hết hạn, Quá hạn, Giữ lại |
| `xam` | `c-surface-alt` · `c-text-muted` | `minus` | Nháp, Ngưng dùng, Đã khoá, Không còn trong Sheet |

Thêm `gia` (`c-accent-soft` · `c-accent-strong`) cho nhãn giá «Khác giá danh mục». Số đếm trên chuông và thanh bên dùng `.huy-hieu-so` (tròn `ntf-badge` 18, nền `c-danger` hoặc `data-tong="bien"`).

## Luật
Chữ trạng thái lấy từ **một nguồn** ở `src/shared/` (như `order-status-label.ts`), không tự đặt. Một trạng thái một huy hiệu; «Đã giao – đã thu đủ» là một trạng thái. Biểu tượng 14 đứng trước chữ để không chỉ dựa vào màu. Trong thẻ 390, huy hiệu xuống dòng hai, không cắt tên khách.

## Người dùng truyền gì
Chữ trạng thái và tông; biểu tượng theo bảng (không đổi). Không có trạng thái rê chuột, tiêu điểm, tắt.

## Đừng
Không mượn tông Cát (`.badge-draft` cũ) cho ý nghĩa khác; không huy hiệu có viền; không huy hiệu bấm được (đó là Chip).
