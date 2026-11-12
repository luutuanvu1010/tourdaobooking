# Ô tích mục «Nút thanh dưới» ở trang Tôi — vùng chạm 44px (12/11/2026)

Lỗi: ba ô tích của khối «Nút thanh dưới» (ADR-0187 Đ2.3) chỉ 13×13 ở khổ 390, làm bước `P1-390` của kịch bản Chrome Trả sau
(`docs/evidence/2026-11-05-tra-sau/kich-ban/tra-sau-smoke.mjs`) đỏ (`o-tick 13×13` ×3). Kịch bản đo chính phần tử ô, không đo nhãn bao quanh.

Sửa (chỉ CSS, `public/app.css` khối `#thanh-duoi`): ô tích tự vẽ (`appearance: none`), chính ô rộng/cao `--tap-min`, hộp nhìn thấy cỡ `--s5` ở giữa,
dấu tích vẽ bằng viền; ô bị khoá (đã đủ 4 nút) mờ đi. Chỉ áp trong `#thanh-duoi`; các màn khác dùng `.o-tick` không đổi.

Ảnh (Đối tác, trang Tôi):
- `truoc-390.png`, `sau-390.png` — toàn trang khổ 390; `truoc-390-cat.png`, `sau-390-cat.png` — cắt riêng khối «Nút thanh dưới».
- `truoc-1280.png`, `sau-1280.png` — khổ 1280 (ảnh «sau» 1280 từ lần chạy đầu, trước khi dời luật CSS lên trước khối «Thành phần chung v2»; khối ẩn ở máy tính nên không đổi): giống nhau là đúng, vì khối này ẩn ở máy tính (≥ 900).
- `sau-375-chua-chon-va-khoa-cat.png` — tài khoản Bán hàng + Kế toán (kịch bản ADR-0187): ô đã chọn, ô chưa chọn bị khoá khi đủ 4.

Kết quả chạy (kèm `AXE_JS`): `TRA SAU SMOKE OK`; `THANH DUOI SMOKE OK (5 bước)`.
Ảnh «trước» chụp bằng bản sao tạm của kịch bản Trả sau (chụp trước bước đo, khổ 1280 thay 1440), bản sao đã xoá.
