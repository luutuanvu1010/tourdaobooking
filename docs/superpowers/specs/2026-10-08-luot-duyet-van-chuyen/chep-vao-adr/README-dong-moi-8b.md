# Dòng mới cho `docs/adr/README.md` (bản chép lượt 8b, 2026-10-08)

> Người soạn chuẩn bị; **điều phối chép** bằng công cụ sửa tệp để chủ được hỏi. Không sửa `docs/adr/` ở đây. Dòng "cũ" chép nguyên văn từ `docs/adr/README.md` @ `19de847a` (nhánh `claude/van-chuyen-goi-a-c`) để dùng làm chuỗi tìm khi thay. Dòng mới theo khuôn cột của dòng 0104 (`:112`): liên kết | quyết định | cửa | trạng thái.

## 1. Thêm ba dòng 0105, 0106, 0107 (ngay sau dòng 0104, `:112`)

Chèn sau dòng này (không đổi nó):

```
| [0104](ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md) | **Điều chỉnh khẩn cấp sát giờ + Đồng bộ chuyến theo đơn:** ô mới `trip.urgent_adjust` (Bán hàng, Quản trị, Toàn quyền) vượt mốc 6 giờ ở mọi lệnh bị khoá (xếp, rút, dời, thêm khách khi xe chạy, đổi xe, đổi tài xế, huỷ chuyến còn khách) và vượt khoảng nghỉ, cam kết khi chuyến dưới mốc (ngoài mốc vẫn `trip.override`); lý do nhóm `PHA_LE`; nhãn "Điều chỉnh khẩn cấp". Máy trả ghế, thêm ghế khi còn chỗ (Q-2 a) trên chuyến `PLANNED`, cùng lô lệnh sửa đơn của người, gác qua view `v_aud_order_cmd`; xe đang chạy chỉ nhắc Báo huỷ; nới có tên bài thứ tự lô. Thay phần xếp xe của đề xuất ADR-0091; sửa ADR-0049, ADR-0050, ADR-0052, ADR-0056, ADR-0007 điều 4(b) | một chiều nhẹ (hành động nhật ký, loại sự kiện, view `v_aud_order_cmd`, danh sách tin chuyến); còn lại hai chiều | **accepted** 2026-10-08 (chủ, lượt 8a: Đ1 "Duyệt, Bán hàng cũng được" = Q-1 b; Đ2 "Duyệt, máy tự thêm ghế khi còn chỗ (Recommended)" = Q-2 a) |
```

Ba dòng thêm, theo thứ tự:

```
| [0105](ADR-0105-nut-chi-duong.md) | **Hai nút "Chỉ đường" (Google Maps, Apple Maps) trên màn tài xế:** mỗi điểm đón / trả chưa xong có nút Google trên mọi máy và nút Apple chỉ trên máy Apple (iPhone, iPad, Mac), dựng trong trình duyệt từ cùng một chuỗi đích (địa chỉ danh mục, không có thì tên điểm; chữ tự do: tên nơi đã che); chỉ trong ngày chạy (tài xế đối tác: trong khung ADR-0053 D7.2, Q-2 a); không gửi vị trí tài xế, tên, SĐT; không khoá dịch vụ; một khoá DTO mới `diaChiChiDuong` (nới có tên bài khoá, đúng một khoá); view công bố mới `v_loc_location_dia_chi`. Sửa ADR-0049 D3 (`:234`, `:239`), ADR-0053 D7.2, D7.3 | một chiều (chuỗi đích đã gửi sang Google / Apple; view công bố); còn lại hai chiều | **accepted** 2026-10-08 (chủ, lượt 8b câu 1: "Duyệt, hai nút Google và Apple" = Q-1 b; câu 2: "Có, trong khung giờ đã được phép (Recommended)" = Q-2 a) |
| [0106](ADR-0106-moc-chup-khoang-nghi.md) | **Mốc chụp khoảng nghỉ của chuyến** (Hiến chương 5.6): `rest_minutes_snapshot` chụp lúc tạo chuyến; chụp lại khi lệnh sửa chuyến đổi giờ bắt đầu, giờ kết thúc, xe hoặc đổi sang tài xế khác; lệnh khác giữ số đã chụp; lý do phá lệ không đổi theo. Sửa ADR-0049 `:171` | hai chiều | **accepted** 2026-10-08 (chủ, lượt 8b câu 3: "Duyệt đúng như mã đang làm (Recommended)") |
| [0107](ADR-0107-ban-hang-dat-gap-sat-gio.md) | **Bán hàng tự đóng dấu đặt gấp; dấu chỉ ghi lên chặng đang dưới mốc:** ô `order.leg.short_notice` SALES `none` → `any` (lệnh sửa / thêm / thay chặng còn hỏi `order.trip.edit`); ở cả năm cửa đóng dấu, mọi người kể cả Quản trị: lệnh kèm lý do đặt gấp chỉ được khi chặng dưới mốc (lệnh sửa, thay chặng: giờ cũ hoặc mới; 409 mới `short_notice_not_needed`), còn dấu chỉ ghi lên chặng có giờ mới dưới mốc (dời ra xa: không dấu; `PUT …/trip` xét từng chặng) — điều kiện đặt trong `xetDatGapSua`; giữ bốn lý do `LY_DO_DAT_GAP`; nhãn dấu "Điều chỉnh khẩn cấp". Thay phần đặt gấp của đề xuất ADR-0091; sửa ADR-0049 (`:30`, `:161`, `:201`, `:266`, `:303`, `:339`), qua đó ADR-0047 A1 | hai chiều | **accepted** 2026-10-08 (chủ, lượt 8b, Q-3 (câu 4 của hộp hỏi): "Duyệt cả hai ý (Recommended)" = Q-3 a) |
```

## 2. Thay dòng "số ADR mới kế tiếp" (`:113`)

Cũ:

```
| — | (số ADR mới kế tiếp là **0109** — 0108 QR thanh toán VietQR (nhánh `claude/ticket-sales-qr-payment-cf8e18`, chủ duyệt 2026-10-08, chưa gộp `main`); 0105–0107 số tạm của lượt duyệt Vận chuyển 8b (nút Chỉ đường, mốc chụp khoảng nghỉ, Bán hàng đặt gấp); 0104 điều chỉnh khẩn cấp + đồng bộ chuyến; 0103 chưa dùng (từng là số tạm của lượt Vận chuyển, đổi sang 0104 vì trùng một bản nháp QR cũ) — điều phối quyết dùng lại hay bỏ trống; 0102 tốc độ đợt 1; 0101 nguồn bản ghim là kho luật gốc; 0096–0100 đợt V0 kiểm theo vai 3/10; 0095 tiền xe thuê sửa ADR-0057; 0074, 0075 đăng nhập 2FA / sổ phiên; 0076–0081 đã dùng trên main; 0082 trợ lý tìm theo nghĩa; 0083 nợ rà soát vai ↔ quyền; 0084 trợ lý Mai; 0085 chính sách đăng nhập; 0086 bỏ hai ô quyền chưa có route — bị bác; 0087 giao diện công ty; 0088–0094 đợt quyết định sau thử nghiệp vụ 2/10) | | |
```

Mới:

```
| — | (số ADR mới kế tiếp là **0109** — 0108 QR thanh toán VietQR (nhánh `claude/ticket-sales-qr-payment-cf8e18`, chủ duyệt 2026-10-08, chưa gộp `main`); 0107 Bán hàng tự đóng dấu đặt gấp; 0106 mốc chụp khoảng nghỉ; 0105 hai nút Chỉ đường; 0104 điều chỉnh khẩn cấp + đồng bộ chuyến; 0103 bỏ trống (từng là số tạm của lượt Vận chuyển, đổi sang 0104 vì trùng một bản nháp QR cũ; điều phối chốt bỏ trống — sổ thi công, mục "Lượt duyệt 8b"); 0102 tốc độ đợt 1; 0101 nguồn bản ghim là kho luật gốc; 0096–0100 đợt V0 kiểm theo vai 3/10; 0095 tiền xe thuê sửa ADR-0057; 0074, 0075 đăng nhập 2FA / sổ phiên; 0076–0081 đã dùng trên main; 0082 trợ lý tìm theo nghĩa; 0083 nợ rà soát vai ↔ quyền; 0084 trợ lý Mai; 0085 chính sách đăng nhập; 0086 bỏ hai ô quyền chưa có route — bị bác; 0087 giao diện công ty; 0088–0094 đợt quyết định sau thử nghiệp vụ 2/10) | | |
```

Số kế tiếp giữ **0109**. Đo ngày 2026-10-08: `main` (`4d98a205`) chưa có ADR-0108 trong `docs/adr/README.md`; nhánh `claude/ticket-sales-qr-payment-cf8e18` (`33cce00b`) có dòng 0108 (QR thanh toán VietQR) và dòng "số kế tiếp" của nhánh đó vẫn ghi "**0103** — 0103–0107 đang là số tạm của lượt duyệt Vận chuyển". Hai nhánh cùng sửa dòng này, nên sẽ vướng nhau lúc gộp; ai gộp sau phải ghép tay (giữ 0109, giữ dòng 0108). Việc "0103 bỏ trống" lấy theo sổ thi công, mục "Lượt duyệt 8b" ("0103 bỏ trống").

## 3. Thay dòng 0091 (`:100`)

Cũ:

```
| 0091 | Bán hàng phá lệ mốc 6 giờ, nhãn "Ngoại lệ 6 giờ" | `docs/superpowers/specs/2026-10-02-luot-duyet-3-pin-tam-va-ngoai-le-6-gio.md` | proposed — lượt duyệt 3; **phần xếp xe bị ADR-0104 thay** (2026-10-08); phần đặt gấp chuyển sang ADR-0107 (số tạm, lượt 8b) |
```

Mới:

```
| 0091 | Bán hàng phá lệ mốc 6 giờ, nhãn "Ngoại lệ 6 giờ" | `docs/superpowers/specs/2026-10-02-luot-duyet-3-pin-tam-va-ngoai-le-6-gio.md` | proposed — lượt duyệt 3; **phần xếp xe bị ADR-0104 thay** (2026-10-08); **phần đặt gấp bị ADR-0107 thay** (2026-10-08) |
```
