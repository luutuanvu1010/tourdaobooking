# Bằng chứng: Đợt E — thẻ đơn rút gọn + biểu tượng (ảnh chụp thời điểm)

**Đây KHÔNG phải thư mục chính của kịch bản.** Thư mục chính (nơi kịch bản Chrome tự ghi ảnh + JSON kết quả theo
mặc định, và nơi đọc số liệu/khẳng định đầy đủ) là:
- `docs/evidence/2026-09-21-v1-0/` cho `kich-ban/v1-nguoi-phu-trach.mjs` (thẻ đơn, danh sách `/orders`) — xem
  `ket-qua-nguoi-phu-trach.json` và `README.md` ở đó.
- `docs/evidence/2026-09-23-trang-chu-moi/` cho `kich-ban/trang-chu-smoke.mjs` (Trang chủ) — xem `README.md` ở đó.

Thư mục `2026-09-24-dot-e/` này chỉ giữ **sáu ảnh chụp thời điểm** của vòng sửa Đợt E sau kiểm độc lập
(2026-09-24), chụp LẦN CUỐI từ cây mã sạch (đã hoàn nguyên mọi phép đột biến dùng để chứng minh đỏ) sau khi làm
xong mục A (dòng "Khách" trong phần xổ) và mục B (bàn phím) — trước đó thư mục này chỉ chụp ở một bước giữa chừng,
chưa có bốn lần sửa cuối (kể cả dòng "Số khách"), nên đã LỆCH với giao diện thật; nay đã chụp lại đồng bộ. Ảnh
chép lại NGUYÊN VĂN (không sửa) từ hai thư mục chính ở trên, cùng lần chạy `node --test`/Chrome đã xanh toàn bộ.

## Sáu ảnh và mỗi ảnh chứng minh gì

| Tệp | Nguồn | Chứng minh |
|---|---|---|
| `nguoi-phu-trach-the-dong-390.png` | `2026-09-21-v1-0/anh/` (bước a) | Thẻ đơn ĐÓNG ở khổ điện thoại (390px): đúng 2 dòng thật, cao 76px — không hồi quy sau khi thêm hai dòng "Khách"/"Số khách" vào phần xổ (phần xổ chỉ ảnh hưởng khi MỞ). |
| `nguoi-phu-trach-the-dong-1040.png` | như trên | Thẻ đơn ĐÓNG ở khổ máy tính (1040px): cùng kết luận, cao 76px. |
| `nguoi-phu-trach-the-mo-390.png` | `2026-09-21-v1-0/anh/` (bước a, sau khi bấm nút xổ) | Thẻ đơn MỞ ở 390px: phần xổ có đủ "Khách: <tên đầy đủ>" (ngay trước "Mã đơn"), "Số khách", "Đã trả", "Tổng", người phụ trách — đúng bố cục sau cả hai mục sửa A và B. |
| `nguoi-phu-trach-the-mo-1040.png` | như trên | Thẻ đơn MỞ ở 1040px: cùng bố cục, khổ rộng. |
| `task-5-dot-e-bieu-tuong-390.png` | `2026-09-23-trang-chu-moi/anh/` (mục I) | Trang chủ ở 390px: biểu tượng ở ba ô số liệu (gồm "Còn thiếu tiền" — biểu tượng đã vẽ lại ở mục D, nay là hai tờ tiền chồng lên nhau, không còn giống máy ảnh), ba tiêu đề khối, dòng "Cần xem lại", SĐT/nơi đón ở "Chuyến đón hôm nay". |
| `task-5-dot-e-bieu-tuong-1040.png` | như trên | Trang chủ ở 1040px: cùng các biểu tượng, khổ máy tính. |

## Vì sao KHÔNG có ảnh "Khách" bị cắt ở dòng 1 (tên dài)

Ca đó (tên khách rất dài, dòng 1 cắt bằng "…", phần xổ vẫn hiện tên đầy đủ) được đo bằng **số** (đối chiếu
`scrollWidth`/`clientWidth` thật + so khớp chuỗi), không bằng mắt — xem bước **m** của `v1-nguoi-phu-trach.mjs` và
`ket-qua-nguoi-phu-trach.json` ở `2026-09-21-v1-0/` (không chụp ảnh riêng cho ca này, đơn tên dài không nằm trong
bộ dữ liệu mẫu của các ảnh trên).

## Mã được đo

Nhánh `dot-e-the-don-gon-va-bieu-tuong`, sau khi sửa `web/order-card.ts` (mục A) và `web/icons.ts` (mục D); mục B
(bàn phím) không đổi mã sản phẩm, chỉ thêm phép đo ở kịch bản. Xem chi tiết trong `git log` của nhánh.
