Thanh trên `#topbar` **một kiểu** cho mọi trang trong: cao `bar-h` 60, nền `c-bar-bg`, kẻ dưới `c-bar-border`, dính (`z-dinh`). Tiêu đề trang nằm **trên thanh** (cổng 2b chọn A), `fs-title` 18 / `fw-heading` 600, một dòng, cắt «…».

**Trong mã:** `web/shell.ts` `initShell` (`.bar-back`, `.brand`, `.bar-duong`, `.bar-title`, `thanhCongViec`: `.bar-avatar`, `.topbar-search`, `.topbar-new`; chuông `ganThongBao`; Trợ lý `.bar-tro-ly` từ `web/tro-ly.ts`); mục do `THANH_TREN` của `src/shared/muc-giao-dien.ts` quyết. Bản xem trước vẽ lại bằng lớp riêng của bộ vì CSS thật gắn `#topbar` và `body.has-sidebar`.

## Trái → phải
Trang cấp một: logo + «Island Booking System». Trang con: điện thoại nút lùi `.bar-back` (26, vùng chạm 44); máy tính đường dẫn một cấp «Trang cha ›» (`.bar-duong`, `c-muted`). Tiêu đề. Ô «Tìm đơn» (≥ 900, chỉ người xem mọi đơn; `w-tim-thanh-tren` 280 co tới `w-tim-thanh-tren-min` 160 trước khi tiêu đề bị cắt). Nút «Tạo đơn» san hô (≥ 900, có `order.create`). Chuông. Trợ lý (hình `chat`, 44). Chữ tắt tài khoản (điện thoại).

## Đừng
Không nút chính thứ hai; không ô tìm trên thanh ở điện thoại (Trang chủ, Đơn hàng có ô tìm trong thân).
