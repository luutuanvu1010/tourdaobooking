# Bằng chứng giao diện — Vận chuyển lượt 1a (ADR-0040), Phần B

- **Bản vẽ gốc:** `docs/design/van-chuyen-1a/` (Claude Design, chủ dự án vẽ 2026-09-28). Ảnh ở `anh/` đặt cạnh các màn 00–07 của bản vẽ để so.
- **Người chụp:** người thi công Phần B (chưa phải kiểm độc lập); 6 ảnh `loai-giay-to-*`: người thi công việc tách "Danh mục giấy tờ" theo chủ dữ liệu (2026-09-28 tối, chưa kiểm độc lập). Mọi số giấy tờ, SĐT, biển số là **số GIẢ** (README bản vẽ, điểm đoán 4).
- **Giới hạn:** Chrome headless trên máy phát triển (khổ 390×844 giả lập cảm ứng, 1040×820), D1 tạm, không mạng ngoài. **Chưa thử iPhone thật**, chưa thử dữ liệu thật trên production.
- **Chỗ lệch bản vẽ và lý do:** nhật ký thi công `docs/superpowers/plans/2026-09-28-van-chuyen-1a-thi-cong-nhat-ky.md`, mục 11.

## Cách chạy

Từ **gốc repo**, sau `npm run build:web`; cần Chrome và một bản `axe-core` NGOÀI repo (`tests/e2e/README.md`, mục "Kiểm giao diện bằng Chrome thật"):

```
AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/<kịch bản>.mjs
```

`OUT=<thư mục>` để ghi ảnh ra chỗ khác (không làm bẩn repo). Các trang dùng chung kho cookie của Chrome: mỗi kịch bản đóng trang của tài khoản này rồi mới mở tài khoản khác.

## Kịch bản

| Kịch bản | Màn bản vẽ | Số bước | Kiểm gì |
|---|---|---|---|
| `tai-xe-trang-dau-smoke.mjs` | 07 + thanh điều hướng tài xế | 4 | "/" → `/tai-xe`, không gọi `/api/orders*`; lời chào, khối cuốc xe giữ chỗ, HAI giấy gần hạn nhất đúng chip; số đủ không trong DOM; tab Trang chủ + Tôi / mục "Trang chủ" nhóm TÔI; tài xế chưa có giấy; người không phải tài xế về "/" |
| `xe-smoke.mjs` | 00, 01, 02 | 13 | menu "Vận chuyển" (mục cha + Xe + Sắp hết hạn; từ 2026-09-28 thêm mục con "Loại giấy tờ xe" và "Loại giấy tờ cá nhân" ngay sau "Địa điểm"), nhóm VẬN CHUYỂN ở trang Tôi, Bán hàng không thấy / không gọi API; danh sách trống, thẻ / bảng, bộ lọc có số; thêm xe (bộ đếm), biển trùng, sửa, Ngừng dùng (hộp xác nhận), Dùng lại xe khi biển đã có chủ |
| `xe-chi-tiet-smoke.mjs` | 03 + bảng trượt + form giấy tờ | 7 | đầu thẻ, tóm tắt, thứ tự giấy tờ, chip, nút theo giấy; Lịch sử (N); Gia hạn (thiếu ngày hết hạn → câu lỗi); Sửa sai (Lưu khoá tới khi chọn lý do, nhật ký không số); Thêm giấy tờ (loại không hạn ẩn ô hết hạn); xe đã ngừng |
| `giay-to-nguoi-smoke.mjs` | 04 | 7 | mục "Giấy tờ" ở hồ sơ Danh bạ (mở theo `?id=`), số che, số đủ không trong DOM; Quản trị KHÔNG có "Xem đủ số" (ADR-0083 điều 2 — bước 1); Toàn quyền "Xem đủ số" (bước 2, 3) → xác nhận → hiện + đếm ngược + "Che lại"; tự che theo token `--t-reveal`; số đủ không vào localStorage / sessionStorage / bộ nhớ đệm service worker / IndexedDB (lúc hiện và sau khi che); nhật ký một dòng không số; Bán hàng không có mục; hồ sơ tài khoản cấp trên chỉ xem; Gia hạn giấy phép (để trống số → giữ số cũ); ô Hạng chỉ với giấy phép lái xe |
| `giay-to-cua-toi-smoke.mjs` | 05 | 5 | khối "Giấy tờ của tôi" dưới thẻ hồ sơ, số che, không nút; Bán hàng chưa có giấy: không khối; Đối tác và tài khoản LAI Tài xế + Đối tác (Ruling R18): không khối, không gọi route |
| `sap-het-han-smoke.mjs` | 06 + huy hiệu | 7 | trạng thái trống; một danh sách xe + người theo hạn, vòng biểu tượng, chip, không số; huy hiệu thanh bên / trang Tôi; bấm dòng mở xe / hồ sơ; KHÔNG ai thấy ô đổi mốc, kể cả Toàn quyền (Ruling R23 — bản vẽ không có; mốc chỉ đổi ở máy chủ, lượt 1b làm lại); Bán hàng bị từ chối |
| `danh-muc-giay-to-smoke.mjs` | (không vẽ — khuôn sẵn Địa điểm, Task A19; tách theo chủ dữ liệu 2026-09-28, giữ tên tệp) | 10 | hai trang: "Loại giấy tờ cá nhân" (hai khối 4 / 8 dòng) và "Loại giấy tờ xe" (một khối 6 dòng); lối vào ở trang Tôi (390) và thanh bên (1040), mục đang mở sáng, breadcrumb; thêm, sửa (tải lại vẫn đúng), ngưng loại hệ thống cần → câu tiếng Việt, thêm loại giấy tờ xe; đường dẫn cũ `/danh-muc-giay-to` tự chuyển sang trang người; Bán hàng không thấy lối vào, mở thẳng bị từ chối, không gọi API danh mục |
| `nhan-tai-xe-smoke.mjs` | (trang có sẵn) | 4 | màn Quản lý tài khoản: vai "Tài xế công ty" ở nhóm Nội bộ, xem trước "Tài xế"; Gửi thông báo: nhóm "Tài xế"; không lộ mã `DRIVER` |
| `vc-lib.mjs` | — | — | phần dùng chung (tài khoản 0900000411–0900000415, dựng dữ liệu bằng API của Quản trị) |

Kết quả từng lần chạy, số ✓, dòng ĐỎ trước khi làm và phép đột biến P16 cho mỗi điều kiện ẩn / hiện: nhật ký thi công, mục 11; việc tách "Danh mục giấy tờ" (2026-09-28): `docs/superpowers/plans/2026-09-28-tach-danh-muc-giay-to-nhat-ky.md`.

## Ảnh (`anh/`)

Tên ảnh bắt đầu bằng số màn của bản vẽ (`00-` … `06-`; màn 07 là `tai-xe-trang-dau-`), hoặc tên phần bản vẽ không vẽ (`loai-giay-to-` — hai trang danh mục giấy tờ và trang Tôi có hai dòng mới; `nhan-tai-xe-`); đuôi `-390` hoặc `-1040` là khổ chụp. 52 ảnh, chụp 2026-09-28 (ảnh "Đổi mốc" đã bỏ theo Ruling R23; 3 ảnh `danh-muc-giay-to-*` của trang gộp cũ thay bằng 6 ảnh `loai-giay-to-*` khi tách trang). Ảnh `00-cho-vao-*` chụp TRƯỚC khi tách: còn dòng "Danh mục giấy tờ" ở trang Tôi và chưa có hai mục mới ở thanh bên — giữ nguyên để so với bản vẽ 00 (bản vẽ cũng không có các mục này); giao diện hiện tại ở `loai-giay-to-toi-390.png`, `loai-giay-to-nguoi-1040.png`, `loai-giay-to-xe-1040.png`. Ảnh bảng trượt / hộp thoại chụp đúng khung nhìn; ảnh trang chụp cả trang (thanh tab dưới đáy điện thoại có thể nằm giữa ảnh — là thanh cố định của khung nhìn lúc chụp).
