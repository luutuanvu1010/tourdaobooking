# Bằng chứng giao diện — Vận chuyển lượt 1a (ADR-0040), Phần B

- **Bản vẽ gốc:** `docs/design/van-chuyen-1a/` (Claude Design, chủ dự án vẽ 2026-09-28). Ảnh ở `anh/` đặt cạnh các màn 00–07 của bản vẽ để so.
- **Người chụp:** người thi công Phần B (chưa phải kiểm độc lập). Mọi số giấy tờ, SĐT, biển số là **số GIẢ** (README bản vẽ, điểm đoán 4).
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
| `xe-smoke.mjs` | 00, 01, 02 | 13 | menu "Vận chuyển" (mục cha + Xe + Sắp hết hạn), nhóm VẬN CHUYỂN ở trang Tôi, Bán hàng không thấy / không gọi API; danh sách trống, thẻ / bảng, bộ lọc có số; thêm xe (bộ đếm), biển trùng, sửa, Ngừng dùng (hộp xác nhận), Dùng lại xe khi biển đã có chủ |
| `xe-chi-tiet-smoke.mjs` | 03 + bảng trượt + form giấy tờ | 7 | đầu thẻ, tóm tắt, thứ tự giấy tờ, chip, nút theo giấy; Lịch sử (N); Gia hạn (thiếu ngày hết hạn → câu lỗi); Sửa sai (Lưu khoá tới khi chọn lý do, nhật ký không số); Thêm giấy tờ (loại không hạn ẩn ô hết hạn); xe đã ngừng |
| `giay-to-nguoi-smoke.mjs` | 04 | 7 | mục "Giấy tờ" ở hồ sơ Danh bạ (mở theo `?id=`), số che, số đủ không trong DOM; "Xem đủ số" → xác nhận → hiện + đếm ngược + "Che lại"; tự che theo token `--t-reveal`; số đủ không vào localStorage / sessionStorage / bộ nhớ đệm service worker / IndexedDB (lúc hiện và sau khi che); nhật ký một dòng không số; Bán hàng không có mục; hồ sơ tài khoản cấp trên chỉ xem; Gia hạn giấy phép (để trống số → giữ số cũ); ô Hạng chỉ với giấy phép lái xe |
| `giay-to-cua-toi-smoke.mjs` | 05 | 5 | khối "Giấy tờ của tôi" dưới thẻ hồ sơ, số che, không nút; Bán hàng chưa có giấy: không khối; Đối tác và tài khoản LAI Tài xế + Đối tác (Ruling R18): không khối, không gọi route |
| `sap-het-han-smoke.mjs` | 06 + huy hiệu | 7 | trạng thái trống; một danh sách xe + người theo hạn, vòng biểu tượng, chip, không số; huy hiệu thanh bên / trang Tôi; bấm dòng mở xe / hồ sơ; KHÔNG ai thấy ô đổi mốc, kể cả Toàn quyền (Ruling R23 — bản vẽ không có; mốc chỉ đổi ở máy chủ, lượt 1b làm lại); Bán hàng bị từ chối |
| `danh-muc-giay-to-smoke.mjs` | (không vẽ — khuôn sẵn Địa điểm, Task A19) | 6 | ba khối 6 / 4 / 8 dòng; thêm, sửa (tải lại vẫn đúng), ngưng loại hệ thống cần → câu tiếng Việt; Bán hàng không thấy |
| `nhan-tai-xe-smoke.mjs` | (trang có sẵn) | 4 | màn Quản lý tài khoản: vai "Tài xế công ty" ở nhóm Nội bộ, xem trước "Tài xế"; Gửi thông báo: nhóm "Tài xế"; không lộ mã `DRIVER` |
| `vc-lib.mjs` | — | — | phần dùng chung (tài khoản 0900000411–0900000415, dựng dữ liệu bằng API của Quản trị) |

Kết quả từng lần chạy, số ✓, dòng ĐỎ trước khi làm và phép đột biến P16 cho mỗi điều kiện ẩn / hiện: nhật ký thi công, mục 11.

## Ảnh (`anh/`)

Tên ảnh bắt đầu bằng số màn của bản vẽ (`00-` … `06-`; màn 07 là `tai-xe-trang-dau-`), hoặc tên kịch bản cho hai phần bản vẽ không vẽ (`danh-muc-giay-to-`, `nhan-tai-xe-`); đuôi `-390` hoặc `-1040` là khổ chụp. 49 ảnh, chụp 2026-09-28 (ảnh "Đổi mốc" đã bỏ theo Ruling R23). Ảnh bảng trượt / hộp thoại chụp đúng khung nhìn; ảnh trang chụp cả trang (thanh tab dưới đáy điện thoại có thể nằm giữa ảnh — là thanh cố định của khung nhìn lúc chụp).
