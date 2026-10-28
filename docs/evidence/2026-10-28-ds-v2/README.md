# Bằng chứng dựng Design System v2 (28/10/2026)

`anh-kiem/`: 27 ảnh chụp bản xem trước của bộ «Island Booking System — Design System v2» (26 thành phần + bìa; chụp lại toàn bộ sau lần gộp Claude Design 28/10), chụp bằng Chrome headless trên máy chủ dự án sau khi sửa ba lỗi hiển thị (khung xem dọc không co theo chiều rộng, cột mã đơn bẻ dòng, toast bị cắt đỉnh trong khung xem). Mỗi ảnh = một tệp `components/<Tên>/preview.html` ở cỡ khai trong dòng `@dsCard`, nạp `tokens.css` (biên dịch từ `tokens.json`) và `components/bundle.css`.

Lệnh chụp một thành phần (đường dẫn tương đối tới bản chụp bộ ở `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/ds-v2/`):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --allow-file-access-from-files --virtual-time-budget=4000 \
  --window-size=960,320 --screenshot=Nut.png "file://<đường dẫn>/_kiem.html"
```

`_kiem.html` là `preview.html` chèn thêm hai thẻ `<link>` tới `../../tokens.css` và `../bundle.css` ngay sau `<head>`. Chrome headless không thu cửa sổ dưới 500 px, nên bản 420 px chụp với `body{max-width:420px}`.

Bộ sống: <https://claude.ai/artifact/R7vYe6PdU85WCSYkanWNP5>. Tờ tóm tắt cổng 2a: `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/TOM-TAT-CONG-2A.md`.
