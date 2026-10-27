# Kiểm kê — đánh giá UX tổng thể 27/10/2026

Hồ sơ có ngày (`PROMPT.md` mục 6.5 sản phẩm số 3). Bảng số liệu đầy đủ do máy sinh ở `docs/evidence/2026-10-27-danh-gia-ux-tong-the/so-lieu/tong-hop.md` (từ `tong-hop.mjs`); tệp này chỉ giữ phần người đọc cần để kiểm phụ lục và báo cáo, kèm số tổng. Quy ước ảnh và viết tắt bộ quyền như `PHU-LUC-PHAT-HIEN.md`.

## 1. Phạm vi đã phủ

| Hạng mục | Đề bài yêu cầu | Đã làm | Ghi chú |
|---|---|---|---|
| Trang | mọi trang trong `PAGES` trừ `/home`, `/danh-muc-giay-to` | 45 trang (+ `/login`) | danh sách ở mục 5 |
| Bộ quyền | 15 vai gộp theo bộ quyền | 10 bộ (mục 2) | mỗi bộ một tài khoản giả |
| Khổ | 390 / 1040; 768 / 1440 cho danh sách, bảng điều khiển | đúng | thêm 768/1440 cho 20 trang họ danh sách + bảng điều khiển |
| Trạng thái dữ liệu | rỗng / ít / nhiều | ba kho D1 riêng (`d1-rong`, `d1-it`, `d1`) | gieo qua API, nhật ký gieo giữ ở `kich-ban/` |
| Trạng thái lỗi | 403 / 404 / mất mạng | mỗi bộ một trang 403, một 404, một mất mạng ở 390 + 1040 | mất mạng giả lập bằng CDP `Network.emulateNetworkConditions offline` sau khi đã cache |
| Đo máy | hit-test, getComputedStyle, vùng chạm, ô gõ, tràn, axe, focus | đúng (`do-trong-trang.js`) | axe-core 4.13 ngoài kho |
| Tốc độ | 4G chậm + CPU ×4, lạnh/nóng, chuyển trang, chạm, CLS | (điền: số trang đo) | `do-toc-do.mjs` |
| Hành trình | mỗi bộ một hành trình thật, đếm chạm/cuộn/đoán | 10 hành trình ở 390; 3 ở 1040 | `hanh-trinh.mjs` |
| Số ô đã quét | — | NHIỀU (điền) · ÍT (điền) · RỖNG 474 · lỗi kịch bản 0/0/0 | một ô = trang × bộ × khổ (× trạng thái lỗi) |

## 2. Mười lăm vai gộp thành mười bộ quyền (sinh từ mã bằng `ma-tran-quyen.mjs`, không chép tay)

Vai cùng bộ quyền nhìn thấy cùng trang và cùng thanh điều hướng, nên đánh giá theo bộ là đủ. "Chỉ Toàn quyền gán" = vai Toàn quyền mới gán được (ADR-0038, ADR-0071).

| Bộ quyền (quyền) | Vai thuộc bộ | Trang đầu | Số trang có lối vào | Mục thanh bên (máy tính) |
|---|---|---|---|---|
| **TQ** Toàn quyền (`ADMIN`+`SUPER_ADMIN`) | IT | `/` | 40 (không vào 7 trang tài xế/đăng nhập) | 28 (nhóm Thiết lập gập 15) |
| **QT** Quản trị (`ADMIN`) | Giám đốc, Điều hành chung | `/` | 33 | 22 |
| **KT** Kế toán (`ACCOUNTING`) | Kế toán | `/` | 20 | 14 |
| **BH** Bán hàng (`SALES`) | Nhân viên kinh doanh | `/` | 14 | 9 |
| **TT** Thực tập (`INTERN`) | Thực tập sinh | `/orders` | 6 | 4 |
| **HDV** Hướng dẫn viên (`FIELD`) | Hướng dẫn viên nội bộ | `/orders` | 6 | 4 |
| **ĐT** Đối tác (`PARTNER`) | Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi (giới thiệu khách), Cộng tác viên | `/orders` | 6 | 4 |
| **NS** Nhân sự (`HR`) | Hành chính nhân sự | `/staff` | 4 | 4 |
| **TX** Tài xế công ty (`DRIVER`) | Tài xế công ty | `/cuoc` | 6 | 5 |
| **TXĐT** Tài xế đối tác (`DRIVER_PARTNER`) | Tài xế đối tác | `/cuoc` | 7 | 6 |

Ghi chú cho ràng buộc "thanh bên trần 10 mục" (PROMPT mục 5): bốn bộ vượt khi đếm mọi mục (TQ 28, QT 22, KT 14); nếu đếm nhóm gập làm một mục thì TQ 14, QT 11, KT 9. Cách đếm nào là ý chủ: **câu hỏi gom số 6** ở `LO-TRINH.md` mục 5.

## 3. Cỡ gói tĩnh từng trang (đo `wc -c` / `gzip -c | wc -c` trên `public/` sau `npm run build:web`; đủ 45 tệp ở `so-lieu/co-goi.txt`)

| Gói | Thô (byte) | Nén gzip (byte) | Ghi chú |
|---|---|---|---|
| `help.js` | 364.888 | 84.577 | nặng nhất: chứa trọn nhật ký thay đổi |
| `order.js` | 320.571 | 98.590 | Chi tiết đơn |
| `order-form.js` | 200.141 | 64.678 | Tạo đơn |
| `account.js` | 176.642 | 55.512 | Tôi |
| `chuyen.js` | 171.464 | 51.944 | Chi tiết chuyến |
| `orders.js` | **96.683** | 31.532 | Đơn hàng — **vượt trần 96.000** của ràng buộc 683 byte |
| `cho-xac-nhan.js` | 77.239 | 24.763 | nhẹ nhất = cỡ khung chung |
| 45 gói cộng lại | ≈ 5,1 MB | ≈ 1,5 MB | mỗi gói lặp lại khung chung ≈ 77 KB |
| `app.css` | 426.455 | 90.154 | nạp ở cả 47 trang |
| `sw.js` | 4.992 | 1.821 | |
| 47 HTML | 110.235 | — | mỗi HTML 1 `<script type="module">` + 1 stylesheet |
| Phông | 352.617 (17 tệp woff2 + giấy phép) | — | 18 `@font-face`, 4 họ, 4–5 độ đậm mỗi họ |

Kiểm HTML: 0/47 có `preload`, 0 `modulepreload`, 0 `prefetch`, 0 Speculation Rules; `app.css` 0 lần `view-transition`. Service worker nạp sẵn 102 mục (`src/shared/sw-policy.ts`).

## 4. Token thiết kế (`public/app.css` `:root`, đếm bằng `dem-token.mjs`; kết quả đủ ở `so-lieu/token.txt`)

| Số đo | Giá trị |
|---|---|
| Token khai ở `:root` | 464 |
| Không dùng ở đâu | 3 (`--fs-stat`, `--lh-28`, `--lh-32`) |
| Chỉ dùng đúng 1 lần | 201 |
| Bí danh (giá trị là `var(--khác)`) | 92 |
| Số đo riêng một màn (`--w-*`, `--h-*`) | 126 (92 + 34) |
| Giá trị có ≥ 3 token trùng | 36 |
| Token độ đậm chữ | 5, cùng bằng 500 |
| Bậc cỡ chữ | 14 |
| Tiền tố lớp theo trang/đợt | 64 |

Phân tích chi tiết và số dòng: `SO-LECH-TU-MA.md`.

## 5. Trang × họ màn × bộ quyền có lối vào × ảnh

44 trang trong Nền tảng (mọi mục `PAGES` trừ `/home`, `/danh-muc-giay-to`) cộng Đăng nhập (chỉ đo tốc độ, không cần phiên). Năm họ màn: bảng điều khiển 8, danh sách 12, chi tiết 4, biểu mẫu 6, thiết lập 14. Ảnh màn đầu 390 và 1040 (trạng thái NHIỀU, bộ quyền rộng nhất có trang) chép vào `docs/evidence/2026-10-27-danh-gia-ux-tong-the/anh/nhieu-<bộ>-<trang>-<khổ>.jpg`; bộ đầy đủ (ba trạng thái, mọi bộ, ảnh cả trang, 768/1440) ở `~/tourdao-ux-2026-10-27-v2/anh/`, đường dẫn từng ô trong `so-lieu/<trạng thái>.json`. "Màn cuộn" = chiều cao trang chia chiều cao màn (1 = vừa một màn).

| Trang | Tiêu đề | Họ | Bộ có lối vào | Ảnh (bộ) | Màn cuộn 390 | Màn cuộn 1040 |
|---|---|---|---|---|---|---|
| `/` | Trang chủ | bảng điều khiển | TQ, QT, KT, BH | SUPER_ADMIN | 2,2 | 3 |
| `/bang-ke-xe` | Bảng kê chi phí xe thuê | bảng điều khiển | TQ, QT, KT | SUPER_ADMIN | 1,1 | 1,1 |
| `/dieu-phoi` | Điều phối xe | bảng điều khiển | TQ, QT, KT, BH | SUPER_ADMIN | 1 | 1,5 |
| `/hoa-hong` | Hoa hồng đối tác | bảng điều khiển | TQ, QT, KT, BH | SUPER_ADMIN | 1,6 | 1,5 |
| `/khoa-thang` | Khoá sổ tháng | bảng điều khiển | TQ, KT | SUPER_ADMIN | 1 | 1 |
| `/lich-xe-ban` | Lịch xe bận | bảng điều khiển | TQ, QT | SUPER_ADMIN | 1,4 | 1,3 |
| `/so-cong-no` | Sổ công nợ | bảng điều khiển | TQ, KT | SUPER_ADMIN | 1 | 1 |
| `/tai-xe` | Trang chủ (tài xế) | bảng điều khiển | TX, TXĐT | DRIVER | 1 | 1 |
| `/audit` | Nhật ký | danh sách | TQ | SUPER_ADMIN | 9,5 | 5,7 |
| `/cho-xac-nhan` | Đơn chờ xác nhận | danh sách | TQ, QT, KT, BH, HDV | SUPER_ADMIN | 1,7 | 1,6 |
| `/cuoc` | Cuốc của tôi | danh sách | TX, TXĐT | DRIVER | 1,3 | 1 |
| `/de-nghi` | Đề nghị chuyển khách | danh sách | TQ, QT | SUPER_ADMIN | 1 | 1 |
| `/feedback` | Hỗ trợ | danh sách | mọi bộ | SUPER_ADMIN | 1,1 | 1,2 |
| `/giay-to-sap-het-han` | Giấy tờ sắp hết hạn | danh sách | TQ, QT | SUPER_ADMIN | 1 | 1 |
| `/orders` | Đơn hàng | danh sách | TQ, QT, KT, BH, HDV, ĐT, TT | SUPER_ADMIN | 3,6 | 3,8 |
| `/parties` | Danh bạ | danh sách | TQ, QT, KT, BH | SUPER_ADMIN | 5,2 | 2,7 |
| `/sessions` | Máy đang đăng nhập | danh sách | TQ | SUPER_ADMIN | 7,8 | 4 |
| `/staff` | Quản lý tài khoản | danh sách | TQ, QT, NS | SUPER_ADMIN | 5,8 | 3,8 |
| `/xe` | Xe | danh sách | TQ, QT | SUPER_ADMIN | 1,4 | 1,2 |
| `/xe-dang-chay` | Xe đang chạy | danh sách | TQ, QT, KT, BH | SUPER_ADMIN | 1 | 1 |
| `/chuyen` | Chi tiết chuyến | chi tiết | TQ, QT, KT, BH | SUPER_ADMIN | 3,4 | 2,9 |
| `/cuoc-chuyen` | Chuyến của tôi | chi tiết | TX, TXĐT | DRIVER | 1 (*) | 1 (*) |
| `/order` | Chi tiết đơn | chi tiết | TQ, QT, KT, BH, HDV, ĐT, TT | SUPER_ADMIN | 4,9 | 3,8 |
| `/xe-chi-tiet` | Chi tiết xe | chi tiết | TQ, QT | SUPER_ADMIN | 1,1 | 1 |
| `/ban` | Báo bận của tôi | biểu mẫu | TXĐT | DRIVER_PARTNER | 1,1 | 1 |
| `/chup-bu` | Chụp bù mức | biểu mẫu | TQ, QT, KT | SUPER_ADMIN | 1 | 1 |
| `/chuyen-sua` | Chuyến mới / sửa chuyến | biểu mẫu | TQ, QT, KT, BH | SUPER_ADMIN | 1 | 1 |
| `/dieu-chinh-cong-no` | Điều chỉnh công nợ | biểu mẫu | TQ, QT, KT | SUPER_ADMIN | 1,9 | 1,8 |
| `/order-form` | Tạo đơn | biểu mẫu | TQ, QT, BH, ĐT, TT | SUPER_ADMIN | 2,6 | 2,5 |
| `/xe-sua` | Thêm / sửa xe | biểu mẫu | TQ, QT | SUPER_ADMIN | 1,1 | 1 |
| `/account` | Tôi | thiết lập | mọi bộ | SUPER_ADMIN | 6 | 5,5 |
| `/bang-gia-xe` | Bảng giá thuê xe | thiết lập | TQ, QT, KT | SUPER_ADMIN | 1 | 1 |
| `/catalog` | Dịch vụ | thiết lập | TQ, QT | SUPER_ADMIN | 43,5 | 24,8 |
| `/chinh-sach-dieu-phoi` | Chính sách điều phối | thiết lập | TQ, QT | SUPER_ADMIN | 3,9 | 2,9 |
| `/dieu-kien-xuat-ben` | Điều kiện cho xe chạy | thiết lập | TQ, QT | SUPER_ADMIN | 1,7 | 1,5 |
| `/giao-dien` | Giao diện | thiết lập | TQ | SUPER_ADMIN | 3,2 | 2,5 |
| `/gui-thong-bao` | Gửi thông báo | thiết lập | TQ | SUPER_ADMIN | 1,7 | 1,2 |
| `/help` | Hướng dẫn | thiết lập | mọi bộ | SUPER_ADMIN | 66 | 39,8 |
| `/loai-giay-to-nguoi` | Loại giấy tờ cá nhân | thiết lập | TQ, QT | SUPER_ADMIN | 2,8 | 2,3 |
| `/loai-giay-to-xe` | Loại giấy tờ xe | thiết lập | TQ, QT | SUPER_ADMIN | 1,6 | 1,3 |
| `/locations` | Địa điểm | thiết lập | TQ, QT | SUPER_ADMIN | 1,8 | 1,4 |
| `/ly-do-dieu-phoi` | Lý do điều phối | thiết lập | TQ, QT | SUPER_ADMIN | 4,4 | 4,5 |
| `/nguoi-ban` | Người bán dịch vụ | thiết lập | TQ, QT, KT | SUPER_ADMIN | 1,7 | 1,5 |
| `/tro-ly-cai-dat` | Trợ lý Hỗ trợ | thiết lập | TQ | SUPER_ADMIN | 6,3 | 5,4 |

(*) Lượt quét mở `/cuoc-chuyen` của tài xế bằng mã chuyến không thuộc tài xế đó nên chỉ chụp được hộp "Không tìm thấy chuyến."; màn chuyến đang chạy thật của tài xế lấy từ ảnh bước hành trình (`anh/ht-390-DRIVER-*.jpg`).

## 6. Số đo từng trang (390 và 1040, trạng thái NHIỀU, bộ rộng nhất; bảng đủ 44 dòng × 15 cột ở `tong-hop.md` B1, B2)

| Cột đo | Kết quả chung | Trang xấu nhất (số) | Ghi ở phụ lục |
|---|---|---|---|
| Ô gõ < 16 px | **0 ở 44/44 trang, cả hai khổ** — ràng buộc giữ đúng | — | H-O-NHAP (đã tốt) |
| Tiêu điểm phím Tab (1040, 12 lần Tab) | **12/12 thấy được ở 44/44 trang** | — | H-FOCUS (đã tốt) |
| Lỗi console | 0 ở mọi ô | — | — |
| Tràn ngang (390) | 1/44 trang | Nhật ký (CÓ) | H-TRAN / C-AUDIT-TRAN |
| Vùng chạm < 44 px (390) | 36/44 trang có 0–1 | Lý do điều phối 43 · Quản lý tài khoản 33 · Nhật ký 25 · Trợ lý 11 · Điều kiện cho xe chạy 8 · Chờ xác nhận 4 | H-CHAM-44 |
| Vùng chạm < 44 px (1040) | 14 ở mọi trang (mục thanh bên 36 px) | Quản lý tài khoản 59 · Trợ lý 38 · Chính sách điều phối 30 · Gửi thông báo 29 | H-CHAM-44 |
| Ô nhập không nhãn | 5 trang | Tôi 4 · Nhật ký, Đơn hàng, Quản lý tài khoản, Dịch vụ 1 | H-O-NHAP |
| axe (WCAG 2.1 A/AA) | 1 lỗi `meta-viewport` (chặn phóng to) ở mọi trang có vỏ | Gửi thông báo 11 (tương phản nhãn ×10); trang 404: thiếu tiêu đề, thiếu `lang` | H-AXE, H-404 |
| Chữ Anh / mã thô | 5/44 trang | Loại giấy tờ cá nhân (5 mã) · Loại giấy tờ xe (4) · Địa điểm (3) · Hướng dẫn (`Admin`) · 404 (`error`, `not_found`) | H-CHU-ANH, H-MA-THO |
| Màn cuộn (390) | 30/44 trang ≤ 2 màn | Hướng dẫn 66 · Dịch vụ 43,5 · Nhật ký 9,5 · Máy đang đăng nhập 7,8 · Trợ lý 6,3 · Tôi 6 · Quản lý tài khoản 5,8 · Danh bạ 5,2 · Chi tiết đơn 4,9 | C-HUONG-DAN, H-TIM-LOC |
| Nút chính thấy ở màn đầu (390) | 24/44 trang không có nút chính ở màn đầu | Bảng giá 3 ("Thêm giá" ×2 + "Giá thuê") · Chờ xác nhận 2 ("Kiểm vé" ×2) · Hoa hồng 2 | H-NUT-CHINH-TRUNG, H-DAU-TRANG |
| h1 (cỡ / đậm) | 4 cỡ, tất cả đậm 500 | 24 px ở 88 ô · 26 px ở 34 ô · 28 px (Chi tiết xe 1040) · 18 px (Giấy tờ sắp hết hạn 390) · không h1 ở Hỗ trợ, Chuyến của tôi | H-DAU-TRANG, H-DO-DAM |
| Phông thân trang | Be Vietnam Pro ở 44/44 (tông mặc định) | — | — |

## 7. Sổ lệch thành phần đo trên màn hình (mọi ô NHIỀU, 390 + 1040; chữ ký = chiều cao · bo góc · nền · chữ · viền · cỡ/đậm; bảng đủ ở `tong-hop.md` E)

| Thành phần | Từ mã (`SO-LECH-TU-MA.md`) | Đo trên màn hình | Ví dụ lệch rõ nhất |
|---|---|---|---|
| Nút | ≈ 48 kiểu | **86 chữ ký** / 8.704 lần đo | nút đỏ "Tạo đơn / + Chuyến mới / Cho xe chạy" 3 chiều cao (46/44/52), 2 cỡ chữ (16/17); nút viền primary 5 chữ ký (chữ 14/15/16/19/20) |
| Huy hiệu / thẻ trạng thái | 7 họ | **24 chữ ký** / 2.806 lần đo; **10 chữ cùng nghĩa khác hình** | "Đã xác nhận" (xanh lá 12,8 px bo 999 ở Đơn hàng vs xanh biển 14 px bo 12 có viền ở Việc của tôi); "Đang chạy" (navy đặc vs xanh nhạt); "Mới" 3 hình |
| Thẻ / khối | ≈ 14 kiểu | **26 chữ ký** / 3.065 lần đo | bo 0/8/12/18; viền 0/1/2 px; đệm 0/8/12/16/24/32/48 |
| Ô gõ | 2 cỡ chữ, 3 chiều cao | **16 chữ ký** / 459 lần đo | cao 44/46/48/52/54/56/72/78 (+ ô nhiều dòng 94–358); viền 2 màu; chữ 16/17 |
| Tiêu đề h1 | 6 giá trị trong CSS | 4 cỡ thấy (18/24/26/28), cùng đậm 500 | cụm Vận chuyển 26, phần còn lại 24 |
| Vùng dính / nổi | 5 kiểu thanh dính, 13 z-index | **21 kiểu** | nút nổi Trợ lý ở 128/128 ô; 3 biến thể `vc-bottom-bar`; 2 `form-actions` |
| Câu trạng thái rỗng | 20 lớp | 13 câu khác nhau (NHIỀU) + 5 trang rỗng không có câu (RỖNG) | "Chưa có đơn nào khớp." vs "Chưa có xe nào. Thêm xe để…" |
| Phông | 4 họ khai | 1 họ dùng (Be Vietnam Pro) | — |

## 8. Tốc độ (4G chậm + CPU ×4, 390×844; `so-lieu/toc-do.json`)

(điền từ `tong-hop.md` K: bảng lạnh / nóng từng trang; chuyển trang; chạm; CLS; vượt ngân sách in đậm)

## 9. Hành trình thật (`so-lieu/hanh-trinh-390.json`, `-1040.json`; ảnh bước `~/tourdao-ux-2026-10-27-v2/anh/hanh-trinh/<khổ>/<bộ>/`, ảnh trích dẫn chép vào `anh/ht-*.jpg`)

Chạy trên máy chủ NHIỀU (8795) sau khi lượt quét xong (luật một máy ADR-0075). Chạm gồm 3 chạm đăng nhập; gõ gồm 16 ký tự SĐT + PIN.

| Bộ | Chạm 390 | Chạm 1040 | Gõ | Cuộn (màn) | Đoán | Không thấy nhãn | Bước | Tới đích? |
|---|---|---|---|---|---|---|---|---|
| BH | 12 | 11 | 46 | 1,0 | 1 | 0 | 19 | có — đơn lập xong, biên nhận tự mở |
| TT | 10 | — | 44 | 0,9 | 1 | 0 | 15 | có |
| KT | 6 | 6 | 16 | 0 | 1 | 0 | 12 | có — Còn vé + đối chiếu công nợ |
| QT | 8 | 7 | 16 | 0 | 2 | 0 | 15 | có — Chuyến mới (bảng trượt), Sửa thông tin chuyến |
| HDV | 4 | — | 16 | 7,6 | 1 | 0 | 9 | có — nhưng cuộn 7,6 màn tới đơn của mình |
| ĐT | 10 | — | 47 | 0,8 | 2 | 1 | 18 | **không** — đơn thành nháp, chưa gửi (thiếu Đón/Không đón) |
| TQ | 8 | — | 48 | 0,7 | 1 | 1 | 14 | một nửa — tạo tài khoản có PIN; vé Hỗ trợ không mở được từ tab mặc định |
| TX | 5 | — | 16 | 0,8 | 1 | 1 | 9 | tới chuyến đang chạy; nút kế tiếp "Đã tới" (kịch bản không bấm) |
| TXĐT | 9 | — | 36 | 0 | 2 | 0 | 13 | **không** — khung bận chưa lưu (nút tắt vì chưa chọn lý do) |
| NS | 8 | — | 43 | 0,5 | 0 | 0 | 11 | có — 0 đoán |

Đọc chi tiết từng bước, ảnh và kết luận hai câu hỏi ở `PHU-LUC-PHAT-HIEN.md` mục F.

## 10. Giới hạn của số đo

- Cột "thanh điều hướng" của số đo trong trang (`nav`, `coTabbar`) dùng bộ chọn `.tabbar/.topbar` không khớp DOM thật (`#tabbar`, `#topbar`) nên rỗng; không sửa giữa lượt quét để ba lượt cùng một thước. Thanh điều hướng nhìn thấy được bù bằng bước "sau đăng nhập" của hành trình (`HT.dieuHuong`) và mục I của `tong-hop.md` (từ thanh bên 1040).
- Chrome headless không đo được vùng an toàn iPhone, bàn phím iOS, Face ID, cài PWA: danh sách thử tay `docs/PWA-IPHONE.md` mục 8–15.
- Mạng và CPU chậm là giả lập, đọc tương đối giữa các trang; số tuyệt đối trên iPhone thật sẽ khác.
- Trạng thái ÍT và NHIỀU khác nhau về số đơn, chuyến, vé; tỉ lệ cuộn ở trang danh sách phụ thuộc số dòng gieo (NHIỀU: ≈ 45 đơn).
