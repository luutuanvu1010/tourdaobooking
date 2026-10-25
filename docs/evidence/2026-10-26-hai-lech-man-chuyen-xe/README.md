# Bằng chứng — hai chỗ lệch nhỏ của màn chuyến xe (26/10/2026)

Hồ sơ có ngày, giữ nguyên. Việc: (1) khối «Khách đang chờ» của màn văn phòng đếm «Khách i» theo từng điểm đón như thẻ điểm (trước: «Khách 3» chỗ này, «Khách 2» chỗ kia); (2) dòng «Dịch vụ: …» của màn tài xế thẳng cột với tên nơi đón (trước: lệch trái 56 px). Dòng «Dịch vụ» chỉ có ở màn tài xế; màn văn phòng không vẽ nó. Mọi tên, SĐT, biển số là GIẢ.

- `kich-ban/hai-lech-smoke.mjs` — kịch bản Chrome mới (5 bước, khổ 390 và 1040, axe). Chạy trước ~21:10 giờ VN (chuyến «hôm nay» tính theo giờ hiện tại). Lệnh chạy ở đầu tệp.
- `anh/*-truoc.png` — chụp trên mã cũ (hoàn nguyên tạm hai tệp rồi dựng lại web): cả 5 bước ĐỎ đúng chỗ lệch (log `log/hai-lech-truoc.log`). `anh/*-sau.png` — mã mới, 5/5 xanh (`log/hai-lech-sau.log`).
- `log/` còn: `cuoc-smoke.log` (18 bước), `tai-xe-thay-khach-smoke.log` (10 bước), `chuyen-smoke.log` (10 bước) — chạy trên mã mới, đều xanh.
- Kịch bản cũ `docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/ui/cuoc-smoke-va.mjs` KHÔNG chạy lại (chủ quyết 25/10; xem bẫy 84 ở `docs/CHANGE-GUIDE.md`).
