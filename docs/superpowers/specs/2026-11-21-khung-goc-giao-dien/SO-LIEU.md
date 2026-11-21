# Số liệu — phân tích bố cục và khung gốc giao diện (21/11/2026)

> Hồ sơ có ngày. Máy sinh bằng `docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/lap-so-lieu.mjs` từ số đo ngoài kho (`~/tourdao-bo-cuc-2026-11-21/so-do/`); không chép tay.
> Bản được đo: bản chính `6e50cd18b` (bản 3.19), máy thử trên máy này với kho dữ liệu giả của đợt 20/11 và tệp giao diện công ty giống bản chạy thật. Không chạm bản chạy thật.
> 87 màn (bảng màn của đợt 20/11) × 4 bề rộng (điện thoại 390, cửa sổ 1.130, máy tính 1.440, màn lớn 1.920) = 348 ô, 0 ô hỏng. Bề rộng 1.130 là cỡ cửa sổ suy từ bốn ảnh chủ gửi 20/11 (ảnh rộng khoảng 2.260 điểm trên màn hai lần điểm ảnh).

## 1. Kiểm kê mã (không cần mở trang)

| Điều đếm | Con số |
|---|---|
| Tệp kiểu chung `public/app.css` | 490 nghìn ký tự, 3408 luật, 11741 khai báo, 2097 tên lớp |
| Họ lớp (tiền tố tên lớp) | 146 họ; luật thuộc bộ thành phần chung (đợt 0, 28/10): 135 trên 3408 |
| Sáu họ lớn nhất | dp 454 · dash 317 · vc 254 · hh 136 · dd 125 · ht 111 |
| Khai báo bề rộng | 194 chỗ, 123 giá trị khác nhau; 33 luật tự đặt trần bề rộng (23 giá trị) |
| Token bề rộng (`--w-*`) | 128 token, 97 token dùng không quá một lần |
| Cách chia cột (`grid-template-columns`) | 149 chỗ, 67 cách khác nhau |
| Mốc đổi bố cục theo bề rộng cửa sổ | 10 mốc («tới N» và «từ N+1» tính là một): 640 (1 chỗ) · 641 (58 chỗ) · 721 (1 chỗ) · 900 (72 chỗ) · 960 (6 chỗ) · 1024 (1 chỗ) · 1100 (3 chỗ) · 1180 (1 chỗ) · 1200 (3 chỗ) · 1400 (1 chỗ) |
| Khoảng cách (đệm, lề, khe) | 2255 khai báo, 186 giá trị khác nhau |
| Cỡ chữ | 663 khai báo, 53 giá trị khác nhau; 55 token cỡ chữ |
| Bo góc; bóng | bo góc 25 giá trị; bóng 23 giá trị |
| Token ở gốc | 544 token |
| Mã dựng trang `web/*.ts` | 187 tệp, 1807 tên lớp, trong đó 1505 tên chỉ một tệp dùng |
| Nút kiểu cũ và kiểu mới | `.btn`: 101 tệp; `.nut`: 23 tệp |
| Thẻ kiểu cũ và kiểu mới | `.card`: 20 tệp; `.the`: 9 tệp |
| Tệp dùng chung để dựng bố cục | không có: mỗi trang tự dựng bằng hàm `h()`; không có hàm dựng khuôn trang, khối hay lưới |

## 2. Viền ngoài của trang (phần lưới 15/11 đã quản)

| Bề rộng cửa sổ | Mức hẹp | Mức vừa | Mức rộng | Không khai (Trang chủ, Đăng nhập) | Số bề rộng khác nhau |
|---|---|---|---|---|---|
| điện thoại 390 | 358 × 11 màn | 358 × 42 màn | 358 × 28 màn | 366 × 5 màn, 350 × 1 màn | 3 |
| cửa sổ 1.130 | 720 × 11 màn | 834 × 42 màn | 834 × 28 màn | 834 × 5 màn, 1034 × 1 màn | 3 |
| máy tính 1.440 | 720 × 11 màn | 1120 × 42 màn | 1144 × 28 màn | 1144 × 5 màn, 1344 × 1 màn | 4 |
| màn lớn 1.920 | 720 × 11 màn | 1120 × 42 màn | 1624 × 28 màn | 1624 × 5 màn, 1824 × 1 màn | 4 |

Đọc: «834 × 42 màn» nghĩa là 42 màn có vùng nội dung rộng 834 điểm.

## 3. Bên trong trang (phần chưa có luật)

| Điều đo | điện thoại 390 | cửa sổ 1.130 | máy tính 1.440 |
|---|---|---|---|
| Thẻ tầng ngoài cùng: số bề rộng khác nhau trên toàn Nền tảng | 3 | 18 | 24 |
| Màn có từ 2 bề rộng thẻ; từ 3 bề rộng | 17; 0 | 20; 9 | 25; 14 |
| Kiểu vỏ thẻ khác nhau (đệm × bo góc × viền, nền, bóng) | 22 | 24 | 24 |
| Bộ đệm thẻ khác nhau | 12 | 11 | 11 |
| Màn có thẻ lồng trong thẻ; lồng từ hai tầng | 29; 4 | 24; 4 | 24; 4 |
| Khoảng cách giữa các khối lớn: số giá trị | 10 | 11 | 11 |
| … các giá trị (số màn) | 16 (61) · 12 (31) · 0 (11) · 24 (6) · 8 (3) · 41 (2) | 16 (54) · 12 (16) · 0 (15) · 24 (7) · 4 (4) · 20 (4) | 16 (54) · 12 (16) · 0 (15) · 24 (7) · 4 (4) · 20 (4) |
| Khoảng cách bên trong khối: số giá trị | 12 | 12 | 12 |
| Chỗ chia cột bên trong khối; số tỉ lệ khác nhau | 0; 0 | 79; 47 | 88; 52 |
| Tiêu đề khối (h2): cỡ chữ (số kiểu gặp) | 18 × 44 · 17 × 15 · 20 × 2 · 16 × 2 | 18 × 46 · 17 × 21 · 20 × 2 · 16 × 2 | 18 × 46 · 17 × 21 · 20 × 2 · 16 × 2 |
| Tiêu đề khối (h2): lề dưới | 12 × 33 · 0 × 29 · 8 × 1 | 0 × 37 · 12 × 33 · 8 × 1 | 0 × 37 · 12 × 33 · 8 × 1 |
| Ô nhập: chiều cao (số kiểu gặp) | 48 × 34 · 52 × 30 · 46 × 11 · 50 × 10 · 56 × 9 · 58 × 4 | 48 × 36 · 52 × 31 · 46 × 14 · 56 × 9 · 50 × 6 · 58 × 4 | 48 × 37 · 52 × 31 · 46 × 13 · 56 × 9 · 50 × 6 · 58 × 4 |
| Ô nhập: vị trí nhãn | trên ô × 62 · ẩn × 26 · nổi trong ô × 14 · bên trái × 3 · khác × 1 | trên ô × 67 · ẩn × 24 · nổi trong ô × 14 · bên trái × 3 · khác × 1 | trên ô × 67 · ẩn × 24 · nổi trong ô × 14 · bên trái × 3 · khác × 1 |
| Màn có ô nhập rộng hơn 600 điểm | 0 | 24 | 27 |
| Dáng nút khác nhau trong trang, trên toàn Nền tảng: bộ cũ; riêng của trang; bộ mới | 16; 46; 6 | 16; 41; 4 | 16; 40; 4 |
| Màn chỉ dùng nút kiểu cũ; chỉ kiểu mới; có nút riêng | 49; 8; 45 | 56; 8; 40 | 56; 8; 40 |
| Chiều cao nút (số kiểu gặp) | 44 × 96 · 48 × 65 · 52 × 22 · 73 × 10 · 107 × 8 | 44 × 106 · 48 × 68 · 52 × 19 · 61 × 8 · 84 × 6 | 44 × 106 · 48 × 68 · 52 × 19 · 61 × 8 · 78 × 6 |
| Màn không dùng lớp nào của bộ thành phần chung | 64 trên 87 | 64 trên 87 | 64 trên 87 |
| Tỉ lệ tên lớp riêng của trang trong một màn (trung vị) | 76 % | 76 % | 76 % |
| Số đường gióng trái của chữ đầu khối trong một màn | 0 đường: 4 màn · 1 đường: 30 màn · 2 đường: 32 màn · 3 đường: 19 màn · 4 đường: 2 màn | 0 đường: 4 màn · 1 đường: 23 màn · 2 đường: 37 màn · 3 đường: 20 màn · 4 đường: 3 màn | 0 đường: 4 màn · 1 đường: 23 màn · 2 đường: 35 màn · 3 đường: 22 màn · 4 đường: 3 màn |
| Màn điện thoại trộn khối sát mép với khối thụt lề | 12 | 0 | 0 |

Vỏ thẻ gặp nhiều nhất ở máy tính 1.440:

- đệm 16/16/16/16 · bo 12 · nền+bóng — 39 màn
- đệm 16/16/16/16 · bo 12 · viền+nền+bóng — 16 màn
- đệm 0/0/0/0 · bo 12 · viền+nền+bóng — 15 màn
- đệm 12/16/12/16 · bo 8 · viền+nền — 9 màn
- đệm 0/0/0/0 · bo 18 · viền+nền+bóng — 5 màn
- đệm 0/0/0/0 · bo 0 · viền+nền+bóng — 5 màn
- đệm 24/32/24/32 · bo 12 · nền+bóng — 5 màn
- đệm 12/12/12/12 · bo 8 · nền — 5 màn

Màn có từ ba bề rộng thẻ tầng ngoài cùng ở máy tính 1.440:

- màn 1 Trang chủ (Bán hàng): 400, 720, 1144
- màn 2 Trang chủ (Quản lý bán hàng): 400, 720, 1144
- màn 3 Trang chủ (Kế toán): 400, 720, 1144
- màn 4 Trang chủ (Quản trị): 400, 720, 1144
- màn 5 Trang chủ (Toàn quyền): 400, 720, 1144
- màn 18 TD-20261113-0003 (Bán hàng): 340, 756, 1120
- màn 19 TD-20261113-0005 (Đối tác): 340, 756, 1120
- màn 20 TD-20261113-0003 (Kế toán): 340, 756, 1120
- màn 21 TD-20261113-0003 (Hướng dẫn viên): 340, 756, 1120
- màn 22 TD-20261113-0003 (Quản trị): 340, 756, 1120
- màn 30 Vận chuyển › Điều phối xe (Quản trị): 188, 212, 720, 1144
- màn 31 Vận chuyển › Điều phối xe (Bán hàng): 188, 212, 720, 1144
- màn 43 Sổ công nợ (Kế toán): 373, 513, 615
- màn 66 Giao diện (Toàn quyền): 360, 740, 1120

Màn có ô nhập rộng hơn 600 điểm ở máy tính 1.440 (số trong ngoặc là ô rộng nhất):

màn 6 Đơn hàng (Thực tập sinh) (1062); màn 7 Đơn hàng (Hướng dẫn viên) (1062); màn 8 Đơn hàng (Đối tác) (1062); màn 12 Tạo đơn (Bán hàng) (732); màn 13 Tạo đơn (Đối tác) (732); màn 14 Tạo đơn (Thực tập sinh) (732); màn 15 Sửa đơn TD-20261113-0001 (Bán hàng) (732); màn 16 Đơn hàng (Bán hàng) (1062); màn 17 Đơn hàng (Kế toán) (1062); màn 33 Vận chuyển › Điều phối xe › Sửa CX-2011-01 (Quản trị) (810); màn 35 Vận chuyển › Đề nghị chuyển khách (Quản trị) (1144); màn 38 Vận chuyển › Xe › Sửa xe 79B-123.45 (Quản trị) (670); màn 45 Điều chỉnh công nợ (Kế toán) (688); màn 48 Cấp độ đại lý (Kế toán) (982); màn 50 Người bán dịch vụ (Kế toán) (1088); màn 52 Giới hạn nhập hoa hồng (Toàn quyền) (1088); màn 56 Dịch vụ (Quản lý bán hàng) (1120); màn 65 Đặc điểm dịch vụ (Quản trị) (1120); màn 68 Nhật ký (Toàn quyền) (606); màn 70 Trợ lý Hỗ trợ (Toàn quyền) (688); màn 71 Quét vé (Hướng dẫn viên) (688); màn 72 Vé điện tử (Quản trị) (1112); màn 73 Đối chiếu vé (Quản trị) (1144); màn 74 Cài đặt vé điện tử (Toàn quyền) (1088); màn 77 Hỗ trợ (Đối tác) (1120); màn 78 Đăng ký làm đối tác — Island Booking System (người chưa đăng nhập) (670); màn 80 Hỗ trợ (Bán hàng) (1120).

## 4. Trang cùng loại, bố cục khác nhau

Loại do phiên phân tích xếp theo việc người dùng làm ở trang đó (bảng ở mục 6). Mỗi trang tính một lần (trang có nhiều bộ quyền lấy màn đầu tiên; bỏ ba màn chấm lúc không có quyền hoặc báo lỗi). «Nút chính» là nút nền đặc hoặc nút gửi biểu mẫu đang hiện trong trang; một trang có thể có hơn một vị trí.

### Máy tính 1.440

| Loại | Số trang | Mức bề rộng đã khai | Khối mở đầu trang | Vị trí nút chính | Nút chính bên trái; bên phải |
|---|---|---|---|---|---|
| Tổng quan | 5 | rộng × 4, (không, khai) × 1 | 2 kiểu: khối khác × 4 · thanh lọc / tìm × 1 | 2 kiểu vị trí: giữa trang × 2 · không có nút chính × 2 · đầu trang, bên phải × 1 | 1; 2 |
| Danh sách | 18 | rộng × 13, vừa × 3, hẹp × 2 | 5 kiểu: đoạn chữ dẫn × 7 · dải tab × 5 · thanh lọc / tìm × 3 · thẻ × 2 · thanh nút × 1 | 4 kiểu vị trí: không có nút chính × 10 · giữa trang × 3 · đầu trang, bên phải × 3 · đầu trang, bên trái × 3 · cuối trang × 2 | 5; 3 |
| Chi tiết | 5 | vừa × 5 | 3 kiểu: khối khác × 3 · thanh nút × 1 · thẻ × 1 | 4 kiểu vị trí: giữa trang × 3 · cuối trang × 3 · đầu trang, bên trái × 1 · đầu trang, bên phải × 1 | 3; 2 |
| Biểu mẫu | 9 | hẹp × 6, vừa × 2, rộng × 1 | 4 kiểu: khối khác × 4 · đoạn chữ dẫn × 3 · thẻ × 1 · dải tab × 1 | 3 kiểu vị trí: giữa trang × 3 · cuối trang × 3 · không có nút chính × 2 · dính đáy × 1 | 3; 3 |
| Thiết lập | 19 | vừa × 17, rộng × 1, hẹp × 1 | 4 kiểu: đoạn chữ dẫn × 12 · khối khác × 4 · thanh nút × 2 · dải tab × 1 | 5 kiểu vị trí: giữa trang × 8 · không có nút chính × 5 · cuối trang × 5 · đầu trang, bên trái × 3 · đầu trang, bên phải × 1 · dính đáy × 1 | 13; 5 |
| Trang đọc | 2 | vừa × 1, hẹp × 1 | 2 kiểu: khối khác × 1 · đoạn chữ dẫn × 1 | 0 kiểu vị trí: không có nút chính × 2 | 0; 0 |
| Công cụ | 1 | hẹp × 1 | 1 kiểu: đoạn chữ dẫn × 1 | 2 kiểu vị trí: đầu trang, bên trái × 1 · giữa trang × 1 | 1; 0 |
| Trạng thái | 3 | rộng × 2, (không, khai) × 1 | 2 kiểu: thẻ × 2 · khối khác × 1 | 1 kiểu vị trí: giữa trang × 3 | 0; 0 |

### Điện thoại 390

| Loại | Số trang | Mức bề rộng đã khai | Khối mở đầu trang | Vị trí nút chính | Nút chính bên trái; bên phải |
|---|---|---|---|---|---|
| Tổng quan | 5 | rộng × 4, (không, khai) × 1 | 2 kiểu: khối khác × 3 · thanh lọc / tìm × 2 | 2 kiểu vị trí: không có nút chính × 3 · giữa trang × 1 · đầu trang, bên trái × 1 | 0; 0 |
| Danh sách | 18 | rộng × 13, vừa × 3, hẹp × 2 | 6 kiểu: đoạn chữ dẫn × 9 · thanh lọc / tìm × 2 · thanh nút × 2 · khối khác × 2 · thẻ × 2 · tiêu đề × 1 | 4 kiểu vị trí: không có nút chính × 10 · giữa trang × 4 · đầu trang, bên trái × 3 · cuối trang × 1 · dính đáy × 1 | 5; 0 |
| Chi tiết | 5 | vừa × 5 | 2 kiểu: khối khác × 3 · thẻ × 2 | 4 kiểu vị trí: giữa trang × 3 · dính đáy × 2 · đầu trang, bên trái × 1 · cuối trang × 1 | 3; 0 |
| Biểu mẫu | 9 | hẹp × 6, vừa × 2, rộng × 1 | 4 kiểu: đoạn chữ dẫn × 4 · thẻ × 2 · khối khác × 2 · thanh nút × 1 | 3 kiểu vị trí: dính đáy × 3 · giữa trang × 3 · không có nút chính × 2 · cuối trang × 1 | 0; 2 |
| Thiết lập | 19 | vừa × 17, rộng × 1, hẹp × 1 | 4 kiểu: đoạn chữ dẫn × 13 · khối khác × 3 · thanh nút × 2 · bảng × 1 | 5 kiểu vị trí: giữa trang × 7 · không có nút chính × 6 · cuối trang × 5 · dính đáy × 2 · đầu trang, bên trái × 2 · đầu trang, bên phải × 1 | 7; 1 |
| Trang đọc | 2 | vừa × 1, hẹp × 1 | 2 kiểu: khối khác × 1 · đoạn chữ dẫn × 1 | 0 kiểu vị trí: không có nút chính × 2 | 0; 0 |
| Công cụ | 1 | hẹp × 1 | 1 kiểu: đoạn chữ dẫn × 1 | 2 kiểu vị trí: đầu trang, bên trái × 1 · giữa trang × 1 | 1; 0 |
| Trạng thái | 3 | rộng × 2, (không, khai) × 1 | 2 kiểu: thẻ × 2 · khối khác × 1 | 1 kiểu vị trí: giữa trang × 3 | 0; 0 |

## 5. Bố cục vỡ ở bề rộng trung gian

Quét 87 màn ở các bề rộng 700, 820, 900, 1000, 1100, 1180 (522 ô, 0 ô không đo được). Phép đo: đoạn chữ bị bóp tới mức mỗi dòng còn một hai ký tự, và trang tràn ngang.

| Màn | Bề rộng bị lỗi | Hiện tượng |
|---|---|---|
| màn 6 Đơn hàng (Thực tập sinh) | 1100, 1180 | chữ bị bóp dọc (10 đoạn, ví dụ «Khách Thực Tập Thử») |
| màn 7 Đơn hàng (Hướng dẫn viên) | 1100, 1180 | chữ bị bóp dọc (10 đoạn, ví dụ «Vũ Mỹ Linh») |
| màn 8 Đơn hàng (Đối tác) | 1100, 1180 | chữ bị bóp dọc (4 đoạn, ví dụ «Khách của Cộng Tác Thử 1») |
| màn 16 Đơn hàng (Bán hàng) | 1100, 1180 | chữ bị bóp dọc (30 đoạn, ví dụ «Khách Thử Hành Trình») |
| màn 17 Đơn hàng (Kế toán) | 1100, 1180 | chữ bị bóp dọc (30 đoạn, ví dụ «Ngô Thị Mai») |

Quét mịn riêng màn Đơn hàng của Bán hàng (bước 20 điểm, 1.040 tới 1.400): cột tên khách bị bóp ở mọi bề rộng từ 1.100 tới 1.180, hết từ 1.200.

## 6. Bảng xếp loại 87 màn

| Loại | Màn |
|---|---|
| Tổng quan (12) | 1 Trang chủ (Bán hàng); 2 Trang chủ (Quản lý bán hàng); 3 Trang chủ (Kế toán); 4 Trang chủ (Quản trị); 5 Trang chủ (Toàn quyền); 9 Cuốc của tôi (Tài xế công ty); 10 Cuốc của tôi (Tài xế đối tác); 25 Trang chủ (Tài xế công ty); 27 Trang chủ (Tài xế đối tác); 30 Vận chuyển › Điều phối xe (Quản trị); 31 Vận chuyển › Điều phối xe (Bán hàng); 34 Vận chuyển › Xe đang chạy (Quản trị) |
| Danh sách (23) | 6 Đơn hàng (Thực tập sinh); 7 Đơn hàng (Hướng dẫn viên); 8 Đơn hàng (Đối tác); 11 Quản lý tài khoản (Nhân sự); 16 Đơn hàng (Bán hàng); 17 Đơn hàng (Kế toán); 23 Đơn chờ xác nhận (Quản lý bán hàng); 24 Danh bạ (Bán hàng); 35 Vận chuyển › Đề nghị chuyển khách (Quản trị); 36 Vận chuyển › Xe (Quản trị); 39 Vận chuyển › Lịch xe bận (Quản trị); 40 Vận chuyển › Sắp hết hạn (Quản trị); 42 Vận chuyển › Bảng kê chi phí xe (Kế toán); 43 Sổ công nợ (Kế toán); 46 Phân định trách nhiệm (Kế toán); 54 Quản lý tài khoản (Quản trị); 55 Phiếu đăng ký đối tác (Quản trị); 56 Dịch vụ (Quản lý bán hàng); 67 Máy đang đăng nhập (Toàn quyền); 68 Nhật ký (Toàn quyền); 72 Vé điện tử (Quản trị); 73 Đối chiếu vé (Quản trị); 81 Hỗ trợ (Bán hàng) |
| Biểu mẫu (12) | 12 Tạo đơn (Bán hàng); 13 Tạo đơn (Đối tác); 14 Tạo đơn (Thực tập sinh); 15 Sửa đơn TD-20261113-0001 (Bán hàng); 29 Báo bận của tôi (Tài xế đối tác); 33 Vận chuyển › Điều phối xe › Sửa CX-2011-01 (Quản trị); 38 Vận chuyển › Xe › Sửa xe 79B-123.45 (Quản trị); 44 Khoá sổ tháng (Kế toán); 45 Điều chỉnh công nợ (Kế toán); 51 Chụp bù mức (Kế toán); 69 Gửi thông báo (Toàn quyền); 78 Đăng ký làm đối tác — Island Booking System (người chưa đăng nhập) |
| Chi tiết (11) | 18 TD-20261113-0003 (Bán hàng); 19 TD-20261113-0005 (Đối tác); 20 TD-20261113-0003 (Kế toán); 21 TD-20261113-0003 (Hướng dẫn viên); 22 TD-20261113-0003 (Quản trị); 26 Cho xe chạy CX-2311-01 (Tài xế công ty); 28 Cho xe chạy CX-2011-01 (Tài xế đối tác); 32 Vận chuyển › Điều phối xe › CX-2011-01 (Quản trị); 37 Vận chuyển › Xe › 79B-123.45 (Quản trị); 75 Tôi (Đối tác); 79 Tôi (Bán hàng) |
| Thiết lập (19) | 41 Vận chuyển › Bảng giá thuê xe (Kế toán); 47 Hoa hồng đối tác (Kế toán); 48 Cấp độ đại lý (Kế toán); 49 Hạn mức trả sau (Kế toán); 50 Người bán dịch vụ (Kế toán); 52 Giới hạn nhập hoa hồng (Toàn quyền); 53 Phí đưa đón (Quản trị); 57 Thiết lập (Quản trị); 58 Địa điểm (Quản trị); 59 Loại giấy tờ cá nhân (Quản trị); 60 Vận chuyển › Loại giấy tờ xe (Quản trị); 61 Vận chuyển › Lý do điều phối (Quản trị); 62 Vận chuyển › Chính sách điều phối (Quản trị); 64 Luật bán (Quản trị); 65 Đặc điểm dịch vụ (Quản trị); 66 Giao diện (Toàn quyền); 70 Trợ lý Hỗ trợ (Toàn quyền); 74 Cài đặt vé điện tử (Toàn quyền); 87 Vận chuyển › Chính sách điều phối › Điều kiện cho xe chạy (Toàn quyền) |
| Trạng thái (6) | 63 Vận chuyển › Chính sách điều phối › Điều kiện cho xe chạy (Quản trị); 76 Hồ sơ tổ chức (Đối tác); 83 Đăng nhập — Island Booking System (người chưa đăng nhập); 84 Không có trang (Bán hàng); 85 Ngoài mạng (Bán hàng); 86 Quản lý tài khoản (Thực tập sinh) |
| Công cụ (1) | 71 Quét vé (Hướng dẫn viên) |
| Trang đọc (3) | 77 Hỗ trợ (Đối tác); 80 Hỗ trợ (Bán hàng); 82 Nhật ký thay đổi (Bán hàng) |

## 7. Giới hạn của phép đo

- Chỉ đo màn vừa tải, chưa đo sau khi bấm, hộp thoại, bảng trượt. Chrome giả lập, chưa phải iPhone, iPad, Android thật.
- 15 màn chấm lúc rỗng hoặc gần rỗng như đợt 20/11 (cùng kho dữ liệu thử), nên số khối và số thẻ của các màn đó thấp hơn lúc có dữ liệu.
- «Thẻ» là phần tử có viền từ ba cạnh, có nền khác nền cha hoặc có bóng, rộng từ 160 và cao từ 40 điểm; anh em cùng tên lớp gộp một dòng. Dòng của danh sách có vỏ cũng được tính.
- Loại màn và «vị trí nút chính» là cách xếp của phiên phân tích, chưa có người thứ hai xếp lại.
- Bề rộng 1.130 là suy đoán từ kích thước ảnh chủ gửi, chưa hỏi chủ.
