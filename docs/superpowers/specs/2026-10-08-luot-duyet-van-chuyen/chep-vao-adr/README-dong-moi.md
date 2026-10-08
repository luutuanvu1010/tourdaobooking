# Dòng mới cho `docs/adr/README.md` (bản chép lượt 8a, 2026-10-08)

> Người soạn chuẩn bị; **điều phối chép** bằng công cụ sửa tệp để chủ được hỏi. Không sửa `docs/adr/` ở đây. Dòng "cũ" chép nguyên văn từ `docs/adr/README.md` @ `4fd27fe1` (nhánh `claude/van-chuyen-goi-a-c`) để dùng làm chuỗi tìm khi thay. Dòng mới theo khuôn cột của dòng 0099 (`:108`): liên kết | quyết định | cửa | trạng thái.

## 1. Thay dòng 0063 (`:93`, bảng "Số đã giữ chỗ")

Cũ:

```
| 0063 | Sửa đơn sau xác nhận: số khách (Quản trị, Kế toán, người lập — lát riêng ngay SAU Sổ tiền lượt 1) + đổi giờ tối đa 2 lần mỗi đơn, bắt buộc ghi chú | `docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/ADR-0063-sua-don-sau-xac-nhan.md` | proposed — lượt duyệt 2a |
```

Mới:

```
| [0063](ADR-0063-sua-don-sau-xac-nhan.md) | **Sửa đơn sau xác nhận — D1 văn phòng sửa số khách:** route mới cổng `office`, ô `order.money.edit` không đổi (Bán hàng đơn mình lập; Kế toán, Quản trị, Toàn quyền mọi đơn); một luật tiền `planMoneyEdit`; lý do mã đóng (ADR-0023 điều 4); tổng tiền âm cảnh báo, không chặn; không phải đường thêm dịch vụ nhập tay; HC-4.2 không áp (chủ xác nhận); phát hành sau Sổ tiền. Sửa ADR-0061 điều 5 (không áp cho route D1), chữ ADR-0014 `:86` (người phụ trách Bán hàng trừ ô `order.money.edit`). D3 "đổi giờ tối đa 2 lần mỗi đơn" còn ở đề xuất `docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/ADR-0063-sua-don-sau-xac-nhan.md` | hai chiều (route, chữ, mã lý do); một chiều nhẹ (dòng điều chỉnh đã ghi) | **accepted một phần** 2026-10-08: D1 (chủ, lượt 8a, "Duyệt (Recommended)"); phần đổi giờ tối đa 2 lần vẫn proposed |
```

## 2. Thêm dòng 0104 (ngay sau dòng 0102, `:111`)

Chèn sau dòng này (không đổi nó):

```
| [0102](ADR-0102-toc-do-dot-1.md) | **Tốc độ đợt 1:** tệp màu giao diện ra khỏi `/api` (`/giao-dien.css`, service worker nạp sẵn "dùng ngay, làm mới ở nền") thay vì chặn mọi trang; gói giao diện không nhập nhật ký thay đổi trừ Trợ giúp; huy hiệu thanh bên qua hai route đếm nhẹ (`/api/orders/dem-nhap`, `/api/catalog/dem-xung-dot`); hiện lại app chỉ kiểm kết nối bằng ping; phiên + nhân viên + bảo trì hỏi song song, `last_seen_at` ghi ở nền; bật Smart Placement. Sửa ADR-0087 điều 3, ADR-0022 điều 7, ADR-0075 điều 9 | hai chiều | **accepted** 2026-10-05 |
```

Dòng thêm:

```
| [0104](ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md) | **Điều chỉnh khẩn cấp sát giờ + Đồng bộ chuyến theo đơn:** ô mới `trip.urgent_adjust` (Bán hàng, Quản trị, Toàn quyền) vượt mốc 6 giờ ở mọi lệnh bị khoá (xếp, rút, dời, thêm khách khi xe chạy, đổi xe, đổi tài xế, huỷ chuyến còn khách) và vượt khoảng nghỉ, cam kết khi chuyến dưới mốc (ngoài mốc vẫn `trip.override`); lý do nhóm `PHA_LE`; nhãn "Điều chỉnh khẩn cấp". Máy trả ghế, thêm ghế khi còn chỗ (Q-2 a) trên chuyến `PLANNED`, cùng lô lệnh sửa đơn của người, gác qua view `v_aud_order_cmd`; xe đang chạy chỉ nhắc Báo huỷ; nới có tên bài thứ tự lô. Thay phần xếp xe của đề xuất ADR-0091; sửa ADR-0049, ADR-0050, ADR-0052, ADR-0056, ADR-0007 điều 4(b) | một chiều nhẹ (hành động nhật ký, loại sự kiện, view `v_aud_order_cmd`, danh sách tin chuyến); còn lại hai chiều | **accepted** 2026-10-08 (chủ, lượt 8a: Đ1 "Duyệt, Bán hàng cũng được" = Q-1 b; Đ2 "Duyệt, máy tự thêm ghế khi còn chỗ (Recommended)" = Q-2 a) |
```

## 3. Thay dòng "số ADR mới kế tiếp" (`:112`)

Cũ:

```
| — | (số ADR mới kế tiếp là **0103** — 0102 tốc độ đợt 1; 0101 nguồn bản ghim là kho luật gốc; 0096–0100 đợt V0 kiểm theo vai 3/10; 0095 tiền xe thuê sửa ADR-0057; 0074, 0075 đăng nhập 2FA / sổ phiên; 0076–0081 đã dùng trên main; 0082 trợ lý tìm theo nghĩa; 0083 nợ rà soát vai ↔ quyền; 0084 trợ lý Mai; 0085 chính sách đăng nhập; 0086 bỏ hai ô quyền chưa có route — bị bác; 0087 giao diện công ty; 0088–0094 đợt quyết định sau thử nghiệp vụ 2/10) | | |
```

Mới:

```
| — | (số ADR mới kế tiếp là **0109** — 0108 QR thanh toán VietQR (nhánh `claude/ticket-sales-qr-payment-cf8e18`, chủ duyệt 2026-10-08, chưa gộp `main`); 0105–0107 số tạm của lượt duyệt Vận chuyển 8b (nút Chỉ đường, mốc chụp khoảng nghỉ, Bán hàng đặt gấp); 0104 điều chỉnh khẩn cấp + đồng bộ chuyến; 0103 chưa dùng (từng là số tạm của lượt Vận chuyển, đổi sang 0104 vì trùng một bản nháp QR cũ) — điều phối quyết dùng lại hay bỏ trống; 0102 tốc độ đợt 1; 0101 nguồn bản ghim là kho luật gốc; 0096–0100 đợt V0 kiểm theo vai 3/10; 0095 tiền xe thuê sửa ADR-0057; 0074, 0075 đăng nhập 2FA / sổ phiên; 0076–0081 đã dùng trên main; 0082 trợ lý tìm theo nghĩa; 0083 nợ rà soát vai ↔ quyền; 0084 trợ lý Mai; 0085 chính sách đăng nhập; 0086 bỏ hai ô quyền chưa có route — bị bác; 0087 giao diện công ty; 0088–0094 đợt quyết định sau thử nghiệp vụ 2/10) | | |
```

**Lưu ý về số hiệu (khác lời giao việc):** lời giao việc ghi "0103 đã giữ cho VietQR ở nhánh khác". Đo ngày 2026-10-08 trên nhánh `claude/ticket-sales-qr-payment-cf8e18` @ `9eb11668`: VietQR là **ADR-0108**, đã chủ duyệt và đã chép vào `docs/adr/ADR-0108-qr-thanh-toan-vietqr.md` của nhánh đó; `docs/adr/README.md:113` của nhánh đó ghi "0103–0107 đang là số tạm của lượt duyệt Vận chuyển 2026-10-08, 0108 QR thanh toán". Vì vậy dòng mới ghi kế tiếp là **0109** và để 0103 cho điều phối quyết. Hai nhánh cùng sửa dòng "số kế tiếp" này, nên sẽ vướng nhau lúc gộp; ai gộp sau phải ghép tay.

## 4. Tuỳ chọn — dòng 0091 (`:100`)

Đề xuất ADR-0091 nay bị ADR-0104 thay ở phần xếp xe. Nếu điều phối muốn bảng phản ánh điều đó:

Cũ:

```
| 0091 | Bán hàng phá lệ mốc 6 giờ, nhãn "Ngoại lệ 6 giờ" | `docs/superpowers/specs/2026-10-02-luot-duyet-3-pin-tam-va-ngoai-le-6-gio.md` | proposed — lượt duyệt 3; Q-B3…Q-B9 áp theo khuyến nghị; chờ "Duyệt" |
```

Mới:

```
| 0091 | Bán hàng phá lệ mốc 6 giờ, nhãn "Ngoại lệ 6 giờ" | `docs/superpowers/specs/2026-10-02-luot-duyet-3-pin-tam-va-ngoai-le-6-gio.md` | proposed — lượt duyệt 3; **phần xếp xe bị ADR-0104 thay** (2026-10-08); phần đặt gấp chuyển sang ADR-0107 (số tạm, lượt 8b) |
```
