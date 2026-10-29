Huy hiệu trạng thái `.huy-hieu[data-tong]` **không bấm được**: một chữ + một tông + một biểu tượng 14 (Q-11, luôn có hình); chữ `fs-badge` 12 / `fw-semibold`, dòng `lh-16`, đệm `pad-huy-hieu-doc` × `pad-huy-hieu-ngang`, bo `radius-pill`, không viền.

**Trong mã:** khối «Thành phần chung v2» của `public/app.css`. Bảy họ huy hiệu cũ giữ tới Chặng 3.

## Năm tông
| `data-tong` | Chữ · nền | Biểu tượng | Dùng cho |
|---|---|---|---|
| `cat` | `c-sand-text` · `c-sand-soft` (7,6:1) | `clock` | Chờ xác nhận, Chưa xếp, Sắp hết hạn |
| `bien` | `c-primary-strong` · `c-primary-soft` (11,4:1) | `history` | Đang xử lý, Đang chạy, Đã xếp |
| `la` | `c-green-text` · `c-green-soft` (6,5:1) | `check` | Đã xác nhận, Hoàn tất, Đã thu đủ |
| `do` | `c-danger` · `c-danger-soft` (6,1:1) | `alertCircle` | Đã huỷ, Từ chối, Quá hạn |
| `xam` | `c-text-muted` · `c-surface-alt` (6,9:1) | `minus` | Nháp, Ngưng dùng, Đã khoá |

## Người dùng truyền gì
Chữ trạng thái lấy từ một nguồn ở `src/shared/` (như `order-status-label.ts`); biểu tượng theo bảng (`icon(name, 14)`).

## Chưa có trong mã
Tông `gia` (nhãn «Khác giá danh mục») và số đếm tròn `huy-hieu-so` của bộ bản 8 chưa có lớp v2; mã còn dùng lớp cũ. Chặng 3 quyết.
