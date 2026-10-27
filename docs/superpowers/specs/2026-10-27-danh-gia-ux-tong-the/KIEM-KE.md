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

(điền từ `tong-hop.md` mục A sau khi ba lượt quét xong — bảng 45 dòng: trang, tiêu đề, họ, bộ có lối vào, ảnh 390 / 1040 / khổ thêm)

## 6. Số đo từng trang (390 và 1040, trạng thái NHIỀU, bộ rộng nhất)

(điền từ `tong-hop.md` B1/B2: màn cuộn, số phần tử tương tác, vùng chạm < 44, ô gõ < 16 px, ô không nhãn, tràn ngang, axe, chữ Anh, console, nút chính màn đầu, h1, phông; kèm tóm tắt: trang nào xấu nhất mỗi cột)

## 7. Sổ lệch thành phần đo trên màn hình

(điền từ `tong-hop.md` E: số chữ ký nút / huy hiệu / thẻ / ô gõ; huy hiệu cùng chữ khác hình; h1; vùng dính; chữ rỗng; phông) — đối chiếu sổ lệch từ mã ở `SO-LECH-TU-MA.md`.

## 8. Tốc độ (4G chậm + CPU ×4, 390×844; `so-lieu/toc-do.json`)

(điền từ `tong-hop.md` K: bảng lạnh / nóng từng trang; chuyển trang; chạm; CLS; vượt ngân sách in đậm)

## 9. Hành trình thật (`so-lieu/hanh-trinh-390.json`, `-1040.json`)

(điền từ `tong-hop.md` L: 10 hành trình × chạm / gõ / cuộn / đoán / không thấy; bước đáng chú ý)

## 10. Giới hạn của số đo

- Cột "thanh điều hướng" của số đo trong trang (`nav`, `coTabbar`) dùng bộ chọn `.tabbar/.topbar` không khớp DOM thật (`#tabbar`, `#topbar`) nên rỗng; không sửa giữa lượt quét để ba lượt cùng một thước. Thanh điều hướng nhìn thấy được bù bằng bước "sau đăng nhập" của hành trình (`HT.dieuHuong`) và mục I của `tong-hop.md` (từ thanh bên 1040).
- Chrome headless không đo được vùng an toàn iPhone, bàn phím iOS, Face ID, cài PWA: danh sách thử tay `docs/PWA-IPHONE.md` mục 8–15.
- Mạng và CPU chậm là giả lập, đọc tương đối giữa các trang; số tuyệt đối trên iPhone thật sẽ khác.
- Trạng thái ÍT và NHIỀU khác nhau về số đơn, chuyến, vé; tỉ lệ cuộn ở trang danh sách phụ thuộc số dòng gieo (NHIỀU: ≈ 45 đơn).
