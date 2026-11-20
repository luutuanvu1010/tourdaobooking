# Danh sách phát hiện — đánh giá lại giao diện 20/11/2026

> **Hồ sơ có ngày, đóng băng khi xong.** Vai: phiên điều phối và kiểm (chỉ chụp, đo, chấm, báo cáo; không sửa giao diện). Bản được chấm: mã giao diện của bản chính `31d4c0174`. Ảnh chụp ở bốn lần lưu của nhánh đợt này (`468f4525e` 13 màn, `907b96674` 71 màn, `3208587db` 2 màn, `0e95d1b72` 1 màn), các lần lưu đó chỉ thêm tài liệu: `git diff` cho `public`, `web`, `src` so với `31d4c0174` đều rỗng (người kiểm độc lập đã tự chạy).
> Đề bài: `DE-BAI.md`. Báo cáo một trang: `BAO-CAO.md`. Bảng phủ: `BANG-PHU.md`. Kịch bản: `docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/`.
> Ảnh, số đo và báo cáo nguyên văn của từng màn ở ngoài kho: `~/tourdao-danh-gia-2026-11-20/` (`bang-chung/man-NNN/`, `bao-cao/`, `phat-hien-gop.md`).
> Mã S, T, M ở đây là tiêu chí của `docs/TIEU-CHI-GIAO-DIEN.md`. Mã của lượt 13/11 viết kiểu «13/11-S4».

**Số liệu:** 87 màn (65 trang trong `PAGES`, 63 trang được chấm), 74 lượt chấm của trợ lý `nguoi-danh-gia-giao-dien`, **476 phát hiện: 1 Chặn việc, 70 Nặng, 405 Nhỏ**. Mức ghi đúng như trợ lý xếp; phiên điều phối không bỏ, không hạ mức.
Cột «Tự xem ảnh»: phiên điều phối đã tự mở tệp ảnh đó và thấy đúng điều được tả.

## A. Phát hiện mức Chặn việc và Nặng của trợ lý, theo họ màn

### Lập đơn — 0 Chặn việc, 2 Nặng, 18 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 13 | PARTNER:/order-form @390 | M2 | Nặng | `PARTNER-order-form-390-man-2-y506.jpg` | Hộp danh sách dịch vụ, ngay dưới thanh «119 dịch vụ» (khoảng y 270–300 trong ảnh) | Dòng dịch vụ đầu bị cắt nửa dưới thanh tiêu đề, chỉ thấy mã «VTC». Máy đo ghi «119 dịch vụ» chồng lên «Thêm vào Hay dùng…». Ở 1280 cũng cắt nửa dòng «VHB», giá «200.000»… |  |
| 15 | SALES:/order-form @390 | M2 | Nặng | `SALES-order-form_id_242be16e-395d-404f-a132-8985169f65d5-390-man-1-y0.jpg` | Thanh trên, tiêu đề «Sửa đơn TD-20261113…» cạnh chuông có huy hiệu «9+» | Máy đo báo hai chữ chồng nhau. Trên ảnh tiêu đề cắt bằng dấu ba chấm sát chuông, mã đơn không đọc hết, huy hiệu đè gần chữ. |  |

### Đơn hàng + chi tiết — 0 Chặn việc, 16 Nặng, 71 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 1 | SALES:/ @390 | S5 | Nặng | `SALES-trang-chu-390-man-1-y0.jpg` | Ô «Chưa phụ trách», hàng thứ hai của khối thẻ số liệu | Ô ghi «Chưa phụ trách · Toàn công ty · 18 · Chờ người nhận». Ở 1280, «Đơn chưa có người phụ trách» là 9, còn 18 thuộc «Đơn chưa có HDV nhận» (SALES-trang-chu-1280-man-1-… | có |
| 2 | SALES_MANAGER:/ @390 | S5 | Nặng | `SALES_MANAGER-trang-chu-390-man-1-y0.jpg` | Ô «Chưa phụ trách» (390), hàng «Đơn chưa có người phụ trách» và «Đơn chưa có HDV nhận» (1… | Ở 390 ô «Chưa phụ trách · Toàn công ty · Chờ người nhận» ghi 18. Ở 1280 «Đơn chưa có người phụ trách» ghi 9, còn con số 18 thuộc «Đơn chưa có HDV nhận». |  |
| 2 | SALES_MANAGER:/ @390 | S5 | Nặng | `SALES_MANAGER-trang-chu-390-man-2-y281.jpg` | Dải hồng «4 đơn chờ xác nhận · 4 quá hạn» | Ở 1280 cùng dải này (màu cam) có nút nền đặc «Xem đơn chờ xác nhận», ở 390 chỉ thấy chữ, không có nút nào. Có thể cả dải bấm được, ảnh tĩnh không cho biết. |  |
| 7 | FIELD:/orders @390 | S9 | Nặng | `FIELD-orders-390-man-1-y0.jpg` | Danh sách đơn, bốn thẻ đầu (số 1 đến 4) | Màn đầu chỉ có đơn «Khách đã trả đủ», «Hoàn thành» và «Đã huỷ». Ba đơn «Đã xác nhận» (23/11, 15/11, 14/11) còn tiền thu và cần làm nằm ở thẻ số 8 đến 10, phải cuộn mới t… |  |
| 17 | ACCOUNTING:/orders @1280 | S9 | Nặng | `ACCOUNTING-orders-1280-man-1-y0.jpg` | Đầu danh sách, từ dòng 3 trở xuống | Các dòng đầu là đơn «Đã huỷ» và «Hoàn thành» với «Còn thu 0 đ». Đơn còn nợ xuất hiện từ khoảng giữa danh sách (ảnh man-2, man-3). Ngày đi nhảy lung tung (13/11, 23/11, 2… | có |
| 17 | ACCOUNTING:/orders @390 | S9 | Nặng | `ACCOUNTING-orders-390-man-1-y0.jpg` | Thẻ đơn số 3, 4 trở đi (man-2) | Ở điện thoại, mỗi thẻ cao nhưng chỉ có «Còn thu». Không có «đã thu», không có tổng tiền đơn, nên không trả lời được «đã thu» của việc soát đơn. | có |
| 17 | ACCOUNTING:/orders @390 | S5 | Nặng | `ACCOUNTING-orders-390-man-1-y0.jpg` | Dòng «Còn thu» của thẻ 1 và 2 | Điện thoại viết «1,43tr đ» và «700k đ». Máy tính viết «1.430.000 đ» và «700.000 đ». Ảnh man-9 còn có «2,4tr đ» và «250k đ». | có |
| 18 | SALES:/order @1280 | S3 | Nặng | `SALES-order-1280-man-2-y480.jpg` | Khối Thanh toán, cột phải | Dòng "Tổng cộng" 5.445.000 ₫ và dòng "Còn lại" 5.445.000 ₫ cùng chữ đỏ, cùng đậm. Ở điện thoại cũng vậy (SALES-order-390-man-8-y3542.jpg). Số "Còn lại" ở khối đầu trang … | có |
| 18 | SALES:/order @390 | S9 | Nặng | `SALES-order-390-man-8-y3542.jpg` | Khối Thanh toán nằm sau khối "Phần đối tác" và ba thẻ dịch vụ | Việc người dùng đến để làm là thu tiền và gửi biên nhận. Nút "QR thanh toán" và "Ghi khoản thu" nằm ở khoảng y 4300–4900 trên trang cao 5498 px. Trước đó là khối "Phần đ… | có |
| 19 | PARTNER:/order @390 | S3 | Nặng | `PARTNER-order-390-man-4-y1518.jpg` | Khối «Thanh toán», hai dòng «Tổng cộng» và «Còn lại» | Cả hai số 750.000 ₫ và 250.000 ₫ cùng chữ đỏ, cùng cỡ, cùng đậm. Ảnh 1280 cũng giống vậy, ở PARTNER-order-1280-man-1-y0.jpg. |  |
| 20 | ACCOUNTING:/order @1280 | S3 | Nặng | `ACCOUNTING-order-1280-man-2-y480.jpg` | Khối «Thanh toán» ở cột phải, hai dòng «Tổng cộng» và «Còn lại» | Hai số 5.445.000 ₫ cùng tô đỏ, cùng đậm, đứng cách nhau hai dòng. Khổ 390 cũng vậy (ACCOUNTING-order-390-man-9-y4048.jpg). |  |
| 20 | ACCOUNTING:/order @390 | S9 | Nặng | `ACCOUNTING-order-390-man-10-y4554.jpg` | Khối «Thanh toán» và nút «Ghi khoản thu» ở gần cuối trang | Nút «Ghi khoản thu» chỉ hiện ở ảnh số 9 và 10, tức khoảng y 4.700 trên trang cao 5.499 px. Trước nó là Người phụ trách, Hướng dẫn viên, Khách hàng, Đưa đón, Hành khách, … |  |
| 21 | FIELD:/order @390 | S3 | Nặng | `FIELD-order-390-man-8-y3542.jpg` | Khối Thanh toán, hai dòng «Tổng cộng» và «Còn lại» | Cả hai số 5.445.000 ₫ cùng tô đỏ, cùng đậm. Ảnh man-7 cho thấy ở 1280 cũng vậy (FIELD-order-1280-man-2-y480.jpg) |  |
| 22 | ADMIN:/order @1280 | S3 | Nặng | `ADMIN-order-1280-man-1-y0.jpg` | Khối «Thanh toán», cột phải | «Tổng cộng» 5.445.000 ₫ và «Còn lại» 5.445.000 ₫ cùng tô đỏ, cùng cỡ chữ. Ở 390 cũng vậy (ADMIN-order-390-man-9-y4048.jpg). |  |
| 23 | SALES_MANAGER:/cho-xac-nhan @390 | T4 | Nặng | `SALES_MANAGER-cho-xac-nhan-390-man-1-y0.jpg` | Đầu mỗi thẻ đơn, liên kết mã đơn (TD-20261113-0002, -0014, -0015, -0016) | Mã đơn là liên kết gạch chân cao khoảng 26 px, rộng khoảng 166 px, nhỏ hơn 44 px chiều cao. |  |
| 24 | SALES:/parties @390 | T4 | Nặng | `SALES-parties-390-man-1-y0.jpg` | Hàng ô chọn «Gồm cả hồ sơ đã ngưng», phía trên nút «Tìm» | Ô chọn nằm trong dòng cao khoảng 34 px (máy đo ghi input 326×34), thấp hơn mức 44 px |  |

### Tài xế, chuyến — 0 Chặn việc, 4 Nặng, 26 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 10 | DRIVER_PARTNER:/cuoc @390 | S10 | Nặng (chữ đã duyệt, mục E1) | `DRIVER_PARTNER-cuoc-390-man-1-y0.jpg` | Thẻ «13:00 CX-2011-01 Bị giữ», ba khung vàng cảnh báo | Khung vàng ghi «Chuyến xe thuê chưa có giá — Quản trị hoặc Kế toán nhập giá bảng…», «Xe trùng giờ…» và «Tài xế trùng giờ…», cuối mỗi câu có «(văn phòng lo)». Thẻ không c… | có |
| 26 | DRIVER:/cuoc-chuyen @390 | S10 | Nặng (chữ đã duyệt, mục E1) | `DRIVER-cuoc-chuyen_id_a392dfae-6448-4fb4-a78d-782728ee4105-390-man-2-y242.jpg` | Khối «Điều kiện cho xe chạy», cả ba dòng đỏ | Mỗi dòng kết thúc bằng «(văn phòng lo)», kể cả «Xe trùng giờ…» và «Tài xế trùng giờ…». Tài xế không có cách nào liên hệ hay làm tiếp. Dòng ở cuối màn chỉ lặp lại «văn ph… |  |
| 29 | DRIVER_PARTNER:/ban @390 | S7 | Nặng | `DRIVER_PARTNER-ban-390-man-1-y0.jpg` | Nút «Lưu khung bận» cuối khối Ghi khung bận | Nút nền xám nhạt, chữ xám nhạt, giống nút bị mờ. Chưa chọn lý do và không có câu nào nói vì sao chưa bấm được hoặc phải làm gì trước. Ảnh chỉ có một nút nên không có nút… | có |
| 29 | DRIVER_PARTNER:/ban @1280 | S7 | Nặng | `DRIVER_PARTNER-ban-1280-man-1-y0.jpg` | Nút «Lưu khung bận» góc phải dưới thẻ Ghi khung bận | Nút nền xám nhạt, chữ xám nhạt, không có câu giải thích đi kèm. | có |

### Điều phối xe — 0 Chặn việc, 8 Nặng, 65 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 30 | ADMIN:/dieu-phoi @390 | T4 | Nặng | `ADMIN-dieu-phoi-390-man-1-y0.jpg` | Dải tab «Chưa xếp 0 / Xe 1 / Cần xử lý 1», dưới hàng thẻ số liệu | Ba nút tab cao 40 px (114×40), thấp hơn 44 px |  |
| 31 | SALES:/dieu-phoi @390 | T4 | Nặng | `SALES-dieu-phoi-390-man-1-y0.jpg` | thanh ba tab «Chưa xếp 0», «Xe 1», «Cần xử lý 1» dưới dải ngày | ba nút tab cao 40 px, rộng 114 px (máy đo) |  |
| 32 | ADMIN:/chuyen @1280 | S7 | Nặng | `ADMIN-chuyen_id_4d6060c7-83ef-454b-8395-b3ad5f7cbe76-1280-man-1-y0.jpg` | Cụm nút đầu khối chi tiết chuyến, nút giữa «Cho xe chạy thay tài xế» | Nút nền, viền và chữ cùng nhạt hơn «Sửa chuyến» và «Huỷ chuyến», không có câu nào nói vì sao mờ hay phải làm gì trước |  |
| 32 | ADMIN:/chuyen @1280 | S2 | Nặng | `ADMIN-chuyen_id_4d6060c7-83ef-454b-8395-b3ad5f7cbe76-1280-man-1-y0.jpg` | Nút «Huỷ chuyến» cạnh «Sửa chuyến» ở đầu trang | Nút nguy hiểm tô đỏ đặc, đậm và nổi nhất trên màn; «Nhập giá thoả thuận» nền xanh đậm đặc cũng đứng cạnh |  |
| 32 | ADMIN:/chuyen @390 | S8 | Nặng | `ADMIN-chuyen_id_4d6060c7-83ef-454b-8395-b3ad5f7cbe76-390-man-2-y506.jpg` | Khối «Khách trong chuyến», nút «Chuyển sang xe khác» cạnh «Rút khỏi xe» | Chữ «Chuyển sang xe khác» rộng hơn nút, chạm và vượt viền phải (nhìn thấy chữ đè lên đường viền); ảnh man-4 «Cho xe chạy thay tài xế» cũng chạm mép | có |
| 38 | ADMIN:/xe-sua @390 | S7 | Nặng (nghi báo nhầm, mục F) | `ADMIN-xe-sua_id_b297adae-d7e8-46f9-a84a-c616b73bb58a-390-man-1-y0.jpg` | Khối «Số người được chở (không kể tài xế)», dòng gợi ý dưới ô đếm | Ô đếm đang là 16, nhưng dòng dưới ghi «Xe 16 chỗ nhập 15.» (1280 cũng vậy, ở ảnh 1280-man-1-y0) |  |
| 41 | ACCOUNTING:/bang-gia-xe @390 | S2 | Nặng | `ACCOUNTING-bang-gia-xe-390-man-1-y0.jpg` | Nút đỏ «Thêm giá» ở góc phải dòng mô tả và nút đỏ «Thêm giá» giữa khối «Nhà xe này chưa c… | Hai nút nền đặc cùng màu, cùng nhãn, cùng hành động hiện cùng một màn đầu |  |
| 41 | ACCOUNTING:/bang-gia-xe @1280 | S2 | Nặng | `ACCOUNTING-bang-gia-xe-1280-man-1-y0.jpg` | Nút «Thêm giá» ở góc phải trên khối chọn nhà xe và nút «Thêm giá» giữa khối trống phía dư… | Hai nút đỏ nền đặc cùng dáng, cùng nhãn xuất hiện đồng thời |  |

### Tiền — 0 Chặn việc, 8 Nặng, 46 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 3 | ACCOUNTING:/ @390 | S5 | Nặng | `ACCOUNTING-trang-chu-390-man-1-y0.jpg` | Thẻ «Chưa phụ trách – Toàn công ty» ở 390; ô «Đơn chưa có người phụ trách – Toàn công ty»… | Điện thoại ghi 18 (cỡ lớn, chữ đen); máy tính ghi 9, và lời chào «gấp nhất» cũng ghi (9). Cả hai đều có nhãn «Toàn công ty» |  |
| 43 | ACCOUNTING:/so-cong-no @390 | T4 | Nặng | `ACCOUNTING-so-cong-no-390-man-1-y0.jpg` | Câu giải thích đầu trang, cuối câu: liên kết «Khoá sổ tháng ›» | Liên kết chỉ rộng 107 px, cao 18 px, nằm lẫn trong đoạn chữ |  |
| 47 | ACCOUNTING:/hoa-hong @390 | M2 | Nặng | `ACCOUNTING-hoa-hong-390-man-1-y0.jpg` | Khối cảnh báo vàng «Có 3 vai trò còn thiếu mức hôm nay», ngay trên nút «Kiểm tra hoa hồng» | Máy đo báo 4 cặp chữ chồng nhau. Trên ảnh không thấy chồng thật, nhưng đoạn «Đối tác chỉ thuộc vai trò này và chưa có…» bị cắt giữa câu, không thấy cách mở rộng |  |
| 48 | ACCOUNTING:/cap-dai-ly @390 | T4 | Nặng | `ACCOUNTING-cap-dai-ly-390-man-1-y0.jpg` | Dải đỏ báo rỗng, đường dẫn «Hoa hồng đối tác» (khoảng y 245) | Liên kết cao khoảng 22 px, rộng 143 px, nhỏ hơn 44×44 |  |
| 49 | ACCOUNTING:/han-muc-tra-sau @390 | T4 | Nặng | `ACCOUNTING-han-muc-tra-sau-390-man-1-y0.jpg` | Liên kết «Cấp độ đại lý» trong dòng giới thiệu (y 160) | Liên kết cao khoảng 18 px, rộng 92 px |  |
| 53 | ADMIN:/phi-don @390 | S10 | Nặng | `ADMIN-phi-don-390-man-1-y0.jpg` | khung vàng ngay dưới dòng «Mức phí đưa đón theo khu vực đón.» | câu «Từ ADR-0214 phí trên đơn do văn phòng chọn; bảng này không còn dùng cho đơn.»; màn vẫn có «Đặt ngày bắt đầu áp», «Thêm mức phí» | có |
| 53 | ADMIN:/phi-don @390 | S9 | Nặng | `ADMIN-phi-don-390-man-1-y0.jpg` | thứ tự khối: khung vàng, «Chưa áp phí đưa đón», «Thử tra», rồi mới tới «Ngoài khu vực» | khối «Thử tra» (6 ô và một nút) chiếm gần hết màn đầu và phần còn lại; danh sách mức phí chỉ hiện ở cuối trang ảnh 2, sau khi cuộn | có |
| 53 | ADMIN:/phi-don @390 | S5 | Nặng | `ADMIN-phi-don-390-man-2-y478.jpg` | giữa khối «Thử tra» và tiêu đề «Ngoài khu vực» | ở 1280 có nút «+ Thêm mức phí» giữa hai khối này; ở 390 ảnh cuối trang không có nút đó | có |

### Quản trị, Thiết lập — 1 Chặn việc, 23 Nặng, 112 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 62 | ADMIN:/chinh-sach-dieu-phoi @390 | S5 | Chặn việc | `ADMIN-chinh-sach-dieu-phoi-390-man-1-y0.jpg` | Cuối thẻ cài đặt, sau dòng «Bản mới có hiệu lực ngay khi lưu.» | Ở 1280 có nút «Lưu hạn chốt», ở 390 hai ô đã có sẵn số 360 và 120 nhưng thẻ kết thúc ngay sau dòng chữ, không có nút nào (kiểm cả ảnh 390-man-2 và man-3; chuẩn xác nhận … | có |
| 4 | ADMIN:/ @390 | S5 | Nặng | `ADMIN-trang-chu-390-man-2-y372.jpg; ADMIN-trang-chu-1280-man-1-y0.jpg` | cột chính, hai khối «Cần xem lại» và «Đơn đi» | Ở 390, «Cần xem lại» đứng trước «Đơn đi». Ở 1280, «Đơn đi» đứng trước, «Cần xem lại» nằm sau (ảnh 1280-man-2). Dòng chào ở 1280 còn nói «gấp nhất: cần xem lại (2)» mà kh… |  |
| 4 | ADMIN:/ @390 | S5 | Nặng | `ADMIN-trang-chu-390-man-1-y0.jpg; ADMIN-trang-chu-1280-man-1-y0.jpg` | ô «Chưa phụ trách» (390) và danh sách «Đang chờ bạn» (1280) | Ở 390 ô «Chưa phụ trách – Toàn công ty» ghi 18, phụ đề «Chờ người nhận». Ở 1280 «Đơn chưa có người phụ trách» ghi 9, còn 18 thuộc «Đơn chưa có HDV nhận». Cùng con số 18 … |  |
| 5 | SUPER_ADMIN:/ @390 | S6 | Nặng | `SUPER_ADMIN-trang-chu-390-man-1-y0.jpg` | Ô chỉ số hàng hai bên phải: «Chưa phụ trách · Toàn công ty» | Ô ghi số 18, chú thích «Chờ người nhận». Ở 1280 (SUPER_ADMIN-trang-chu-1280-man-1-y0.jpg), «Đơn chưa có người phụ trách» ghi 9 còn «Đơn chưa có HDV nhận» ghi 18. |  |
| 11 | HR:/staff @390 | T4 | Nặng | `HR-staff-390-man-1-y0.jpg` | liên kết «Phiếu đăng ký đối tác» đầu trang và các hàng chọn vai trò | Máy đo ghi 10 chỗ dưới 44×44: liên kết cao 22 px, các hàng chọn vai trò cao 34 px. Ảnh man-1 thấy các hàng chọn nằm sát nhau. |  |
| 11 | HR:/staff @1280 | S7 | Nặng | `HR-staff-1280-man-2-y480.jpg` | hàng tiêu đề bảng danh sách tài khoản | Sáu tiêu đề cột nhưng dữ liệu chỉ có năm ô cộng nút. Dưới «Cấp độ đại lý» là ngày tạo (05:58 13/11/2026). Dưới «Tạo lúc» là giờ đăng nhập (kể cả «Chưa ghi nhận»). Dưới «… | có |
| 54 | ADMIN:/staff @390 | T4 | Nặng | `ADMIN-staff-390-man-1-y0.jpg` | Liên kết «Phiếu đăng ký đối tác» ngay dưới liên kết «Đặt cấp độ đại lý…», đầu trang | Máy đo: vùng chạm 179×22, thấp hơn 44 px |  |
| 54 | ADMIN:/staff @390 | S9 | Nặng | `ADMIN-staff-390-man-2-y506.jpg` | Đầu trang: khối «Hàng chờ xác minh» rỗng rồi 11 nút lọc vai trò, thẻ tài khoản đầu tiên c… | Phải cuộn qua hơn một màn mới thấy tài khoản đầu tiên. Khối chờ xác minh đang rỗng và bộ lọc chiếm gần hết màn đầu; ở ảnh 1280 cũng vậy (ADMIN-staff-1280-man-1-y0.jpg, b… |  |
| 54 | ADMIN:/staff @1280 | S9 | Nặng (nghi báo nhầm, mục E4 và F) | `ADMIN-staff-1280-man-1-y0.jpg` | Thanh trên và vùng đầu trang, không thấy nút tạo tài khoản ở bất kỳ ảnh nào của hai khổ | Quản trị tới đây để tạo tài khoản nhưng trên cả mười ảnh 390 và sáu ảnh 1280 không có nút hay liên kết tạo mới (chỉ có «Sửa», «Đặt lại PIN», «Tắt bảo mật hai lớp», «Ngưn… |  |
| 56 | SALES_MANAGER:/catalog @1280 | S9 | Nặng | `SALES_MANAGER-catalog-1280-man-1-y0.jpg` | Toàn danh sách dịch vụ, từ đầu trang | Mỗi dòng dịch vụ chỉ có tên, hai nút ngừng bán và công tắc «Cần kiểm vé». Trong các ảnh đã chụp, từ đầu tới y5120 ở 1280 và y5398 ở 390, không có giá nào. Tiêu đề trang … |  |
| 56 | SALES_MANAGER:/catalog @1280 | S8 | Nặng | `SALES_MANAGER-catalog-1280-man-1-y0.jpg` | Dòng dịch vụ, nút «Ngừng bán» | Nút «Ngừng bán» nằm ở các vị trí ngang khác nhau (từ khoảng x=735 đến x=822) tuỳ độ dài tên. «Ngừng bán theo ngày» dạt sát mép phải, giữa hai nút là khoảng trống rộng. C… |  |
| 56 | SALES_MANAGER:/catalog @390 | S7 | Nặng | `SALES_MANAGER-catalog-390-man-1-y0.jpg` | Hai nút xếp dọc dưới tên dịch vụ | Hai nút «Ngừng bán» và «Ngừng bán theo ngày» cùng dáng, cùng nền, sát nhau. Ảnh không có câu giải thích khác nhau thế nào hay có hoàn tác được không. |  |
| 58 | ADMIN:/locations @390 | S9 | Nặng | `ADMIN-locations-390-man-1-y0.jpg` | Đầu trang, hai khối «Thêm địa điểm» và «Khu vực đón» | Màn đầu và ảnh thứ hai toàn biểu mẫu thêm; danh sách địa điểm để sửa chỉ hiện từ ảnh y1012 trở đi, sau hơn 1000 px |  |
| 59 | ADMIN:/loai-giay-to-nguoi @390 | T4 | Nặng | `ADMIN-loai-giay-to-nguoi-390-man-2-y506.jpg` | Ô tích «Có ngày hết hạn» trong biểu mẫu thêm loại giấy tờ | Hàng ô tích cao khoảng 34 px, ô tích rất nhỏ; máy đo ghi input «on» 326×34 |  |
| 60 | ADMIN:/loai-giay-to-xe @390 | T4 | Nặng | `ADMIN-loai-giay-to-xe-390-man-2-y431.jpg` | Ô tích «Có ngày hết hạn» trong biểu mẫu «Thêm loại giấy tờ xe» | Hàng ô tích cao khoảng 34 px, ô tích nhỏ; máy đo ghi input «on» 326×34 |  |
| 63 | ADMIN:/dieu-kien-xuat-ben @390 | S10 | Nặng | `ADMIN-dieu-kien-xuat-ben-390-man-1-y0.jpg` | Dải đỏ «Chỉ Toàn quyền xem và đổi được điều kiện cho xe chạy.» và khoảng trống bên dưới | Quản trị mở màn chỉ thấy một câu từ chối, không có liên kết, không có nút đi tiếp; phần trên và dưới đều trống |  |
| 65 | ADMIN:/dac-diem-dich-vu @390 | S9 | Nặng | `ADMIN-dac-diem-dich-vu-390-man-1-y0.jpg` | Hàng thẻ lọc, phía trên ô «Tìm dịch vụ» | Hàng thẻ đã cuộn ngang sẵn: thẻ «Gắn cho dịch vụ» (đang chọn) nằm ngoài màn, thẻ đầu hiện là «…eo nhóm (0)» bị cắt mép trái, thẻ cuối «Định nghĩa» bị cắt mép phải |  |
| 67 | SUPER_ADMIN:/sessions @1280 | S5 | Nặng | `SUPER_ADMIN-sessions-1280-man-3-y960.jpg` | Bảng danh sách máy đang đăng nhập, các cột bên trái | Tiêu đề bảng bắt đầu từ «Cách đăng nhập», cột tên người và thiết bị bị cắt khỏi khung; ô IP chỉ còn đuôi như «4.115», «26.138» | có |
| 67 | SUPER_ADMIN:/sessions @390 | S9 | Nặng | `SUPER_ADMIN-sessions-390-man-3-y1012.jpg` | Từ đầu trang đến danh sách máy | Bảng «Chính sách đăng nhập» 11 hàng cùng hai nút «Tất cả …» chiếm gần hai màn, danh sách máy chỉ bắt đầu sau khoảng 1100 px |  |
| 68 | SUPER_ADMIN:/audit @390 | T4 | Nặng | `SUPER_ADMIN-audit-390-man-1-y0.jpg` | Cột «Đối tượng» của mỗi thẻ: liên kết mã đơn như TD-20261113-0048 (cùng kiểu ở các ảnh y5… | Liên kết mã đơn chỉ cao khoảng 22 px. Máy đo đếm 22 liên kết ở khổ 390, ví dụ cỡ 166×22 |  |
| 69 | SUPER_ADMIN:/gui-thong-bao @390 | T4 | Nặng | `SUPER_ADMIN-gui-thong-bao-390-man-2-y506.jpg` | Các ô chọn «Gửi cho» và ô tích «Tin quan trọng» | Máy đo báo hai ô nhập (nút chọn) có vùng chạm 326×26 và 326×44; ô tích «Tin quan trọng» và các ô tích nhóm có ô vuông nhỏ chỉ cỡ chục px |  |
| 70 | SUPER_ADMIN:/tro-ly-cai-dat @390 | T4 | Nặng | `SUPER_ADMIN-tro-ly-cai-dat-390-man-2-y506.jpg` | Khối «Ai được dùng», danh sách 11 ô chọn vai trò (Bán hàng đến Quản lý bán hàng); thêm ô … | Mỗi ô chọn cao khoảng 21 px, hàng cách nhau khoảng 29 px, vùng chạm chỉ gồm ô vuông và chữ nhỏ; máy đo đếm 12 chỗ (326×21) |  |
| 87 | SUPER_ADMIN:/dieu-kien-xuat-ben @390 | S8 | Nặng | `SUPER_ADMIN-dieu-kien-xuat-ben-390-man-1-y0.jpg` | Khối «Điều kiện theo cỡ xe», hai dòng điều kiện đang áp dụng | Tên điều kiện bị ép vào cột rộng khoảng 60 px, vỡ thành 4–6 dòng (ví dụ «Bảo / hiểm / trách / nhiệm / dân sự / — mọi / xe»), trong khi nhãn «Đang áp dụng» và nút «Ngừng … |  |
| 87 | SUPER_ADMIN:/dieu-kien-xuat-ben @390 | T4 | Nặng | `SUPER_ADMIN-dieu-kien-xuat-ben-390-man-3-y749.jpg` | Cột nút «Đổi» của khối «Số khách theo hạng bằng» (8 nút) | Máy đo báo 8 nút «Đổi số khách hạng …» không đạt vùng chạm 44 × 44 (số đo ghi 44×44, có thể lệch lẻ pixel); trên ảnh nút chỉ là chữ liên kết nhỏ ở mép phải |  |

### Vé điện tử (họ mới) — 0 Chặn việc, 1 Nặng, 18 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 72 | ADMIN:/ve-kho @1280 | M2 | Nặng | `ADMIN-ve-kho-1280-man-1-y0.jpg` | Khối «Nhập lô mới», ngay dưới thanh «119 dịch vụ» | Dưới thanh «119 dịch vụ» có một dải hàng dịch vụ bị cắt dở (~14 px) rồi mới tới «Vé Vinpearl: Harbour». Máy đo báo chồng chữ với «Thêm vào Hay dùng: Vé Vinwonders NT…». |  |

### Màn của đối tác bên ngoài — 0 Chặn việc, 5 Nặng, 17 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 75 | PARTNER:/account @390 | T4 | Nặng | `PARTNER-account-390-man-1-y0.jpg` | Dòng «Xác minh», huy hiệu «Chưa xác minh» ở đầu khối Hồ sơ của tôi | Liên kết «Chưa xác minh» (chữ gạch chân) cao khoảng 22 px, rộng 121 px |  |
| 76 | PARTNER:/to-chuc @390 | S10 | Nặng | `PARTNER-to-chuc_id_ad64b510-e362-4af0-b31c-4dca2bc7574f-390-man-1-y0.jpg` | Khối hồng ngay dưới thanh tiêu đề, và toàn bộ vùng trống bên dưới | Màn chỉ có câu «Chỉ người quản lý của tổ chức xem được màn này.» Dưới đó trống hết tới thanh tab đáy, không có nút hay liên kết nào để đi tiếp. |  |
| 76 | PARTNER:/to-chuc @1280 | S10 | Nặng | `PARTNER-to-chuc_id_ad64b510-e362-4af0-b31c-4dca2bc7574f-1280-man-1-y0.jpg` | Khối hồng dưới dải thông báo và vùng trống bên dưới (khoảng ba phần tư chiều cao màn) | Cùng một dòng báo, không có lối đi tiếp. Phần còn lại của cột nội dung để trống (có thể do dữ liệu thử). |  |
| 78 | KHACH:/dang-ky @390 | T4 | Nặng | `KHACH-dang-ky-390-man-1-y0.jpg` | Liên kết «Quay lại màn Đăng nhập» dưới khối Email | Liên kết cao khoảng 22 px, rộng 203 px, thấp hơn 44 px |  |
| 78 | KHACH:/dang-ky @390 | S10 | Nặng | `KHACH-dang-ky-390-man-1-y0.jpg` | Dải vàng đầu trang «Tour Đảo tạm ngừng nhận đăng ký mới» | Người chưa có phiếu chỉ thấy câu tạm ngừng, không có cách liên hệ và không có thông tin khi nào mở lại. Lối đi duy nhất là «Quay lại màn Đăng nhập», mà họ chưa có tài kh… |  |

### Trợ giúp, Của tôi (họ mới) — 0 Chặn việc, 3 Nặng, 20 Nhỏ

| Màn | Ô | Mã | Mức | Tệp ảnh | Chỗ trên màn | Điều nhìn thấy | Tự xem ảnh |
|---|---|---|---|---|---|---|---|
| 79 | SALES:/account @390 | T4 | Nặng | `SALES-account-390-man-1-y0.jpg` | Khối «Hồ sơ của tôi», dòng «Xác minh», liên kết «Chưa xác minh» | Liên kết chỉ cao khoảng 22 px, rộng 121 px; máy đo ghi 121×22 |  |
| 79 | SALES:/account @390 | S7 | Nặng | `SALES-account-390-man-2-y506.jpg` | Khối «Yêu cầu xoá dữ liệu», nút «Gửi yêu cầu xoá» và dòng chữ nhỏ dưới nút | Nút viền đỏ trông bấm được, trong khi dòng dưới nói «Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.» |  |
| 80 | SALES:/huong-dan @390 | S7 | Nặng | `SALES-huong-dan-390-man-2-y506.jpg` | Dòng «Lập đơn mới», danh sách nhóm «Đơn hàng» | Chữ phụ dưới tên dòng chỉ có chữ «Ở», không nói ở đâu. Ảnh 1280-man-2, 1280-man-3 và 390-man-3 cũng thế. |  |

### Đăng nhập, trạng thái — 0 Chặn việc, 0 Nặng, 12 Nhỏ

Không có phát hiện mức Nặng trở lên.

Phát hiện mức Nhỏ (405 dòng) không chép vào kho: xem `phat-hien-gop.md` ngoài kho; phần gộp theo nguyên nhân ở mục B.

## B. Gộp theo nguyên nhân gốc (một dòng một nguyên nhân, kèm số màn)

| Mã gộp | Nguyên nhân | Tiêu chí | Số màn | Ghi chú |
|---|---|---|---|---|
| G1 | Ở điện thoại, Quản trị mở Chính sách điều phối **không có nút lưu**: khối nút bị ẩn ở khổ hẹp, thanh nút đáy lại không bật cho vai này | S5 (Chặn việc) | 1 | Tự xem ảnh và đọc mã (`.dp-cs-actions` ẩn dưới 640 px; `cs-bottom` để ẩn ở nhánh Quản trị) |
| G2 | Trang chủ: ô «Chưa phụ trách» ghi 18 ở điện thoại, «Đơn chưa có người phụ trách» ghi 9 ở máy tính (18 là số «chưa có HDV nhận») | S5, S6 (Nặng) | 5 (mọi vai có Trang chủ) | Tự xem ảnh màn 1 |
| G3 | Chi tiết đơn: «Tổng cộng» và «Còn lại» cùng tô đỏ, cùng đậm | S3 (Nặng) | 5 (mọi bộ quyền mở Chi tiết đơn) | Tự xem ảnh màn 18. Đã ghi 20/11, chưa sửa |
| G4 | Chi tiết đơn ở điện thoại: khối Thanh toán và nút «Ghi khoản thu» nằm gần cuối trang, sau khối «Phần đối tác» dài | S9 (Nặng 2, Nhỏ 3) | 5 | Tự xem ảnh màn 18 |
| G5 | Vùng chạm dưới 44 px ở điện thoại: liên kết nằm trong câu chữ (cao 18–26 px), ô tích và ô chọn (21–34 px), ba tab của Điều phối xe (40 px) | T4 (Nặng) | 18 | Ảnh đại diện ở thanh trên không còn bị báo |
| G6 | Tiền viết gọn ở điện thoại («1,43tr đ», «700k đ»), viết đủ ở máy tính | S5 | 10 (Trang chủ 5, Đơn hàng 5) | Tự xem ảnh màn 17. Một lượt nâng lên Nặng cho Kế toán |
| G7 | Tên truy cập của chuông và ảnh đại diện ở thanh trên không khớp chữ đang hiện | T8 | 66 | Một chỗ sửa ở khung chung |
| G8 | Quá 3 hình nút, quá 5 cỡ chữ | T6 | 83 | Máy đếm cả nút của khung chung: xem nợ công cụ |
| G9 | Số tiền lặp nhiều lần, dòng «0 ₫», dòng «—» không mang thông tin | S1 | 40 | Nặng nhất ở Chi tiết đơn (một số hiện 6–8 lần) và Đơn hàng («Còn thu 0 đ») |
| G10 | Khối giải thích dài, biểu mẫu thêm mới hoặc thứ ít dùng đứng trước việc chính | S9 | 36 | Tài khoản, Địa điểm, Máy đang đăng nhập, Phí đưa đón, Dịch vụ, Hoa hồng, Danh bạ, Sổ công nợ… |
| G11 | Trạng thái rỗng hoặc không quyền chỉ một dòng chữ, không lối đi tiếp | S10 | 15 | |
| G12 | Danh sách Đơn hàng: đơn đã huỷ, đã xong chen lên trước nhiều đơn còn việc; thứ tự ngày không nhìn ra | S9 | 3 (Hướng dẫn viên, Kế toán, Bán hàng) | |
| G13 | Nút mờ không nói vì sao | S7 | 6 | «Lưu khung bận» (tự xem ảnh màn 29), «Cho xe chạy thay tài xế», Giao diện, Gửi thông báo, Tôi, Đăng nhập |
| G14 | Bảng hỏng ở máy tính: Quản lý tài khoản của Nhân sự lệch tiêu đề cột với dữ liệu; Máy đang đăng nhập bị cắt mất cột tên người | S7, S5 (Nặng) | 2 | Tự xem ảnh màn 11 và 67 |
| G15 | Chữ nút tràn viền ở điện thoại; nút «Huỷ chuyến» đỏ đặc nổi nhất màn | S8, S2 (Nặng) | 1 (Chi tiết chuyến) | Tự xem ảnh màn 32 |
| G16 | Danh sách chọn dịch vụ: tiêu đề dính «119 dịch vụ» cắt nửa dòng đầu | M2 | 4 (Tạo đơn 3, Vé điện tử) | Cùng một thành phần |
| G17 | Lộ mã thô hoặc mã nội bộ: Địa điểm, hai trang Loại giấy tờ, «Admin» ở Nhật ký thay đổi, «ADR-0214» ở Phí đưa đón | T9, S10 | 5 | Tự xem ảnh màn 53 |
| G18 | Thanh nút dính ở đáy che dòng cuối của trang | S8 | 2 (Sửa chuyến, Sửa xe) | |
| G19 | Trang Hỗ trợ: dòng phụ chỉ có chữ «Ở» bị cụt; «Câu hỏi thường gặp» có hai lần | S7, S10, S1 | 2 (Bán hàng, Đối tác) | |
| G20 | Ô tìm chỉ có chữ gợi ý, không nhãn | M3 | 6 | Đơn hàng và Nhật ký |

## C. Nhận định so chéo (nhận định của phiên điều phối, chưa được thử như trợ lý)

Mỗi nhận định dẫn ít nhất hai màn. Tên tệp ảnh nằm trong `bang-chung/man-NNN/anh/`. «(đã xem)» là ảnh phiên điều phối tự mở; còn lại dựa trên báo cáo của trợ lý và số đọc từ mã.

**a) Lối đi theo vai**

- **C1. Tên mục menu không trùng tiêu đề trang nó mở.** Đọc từ mã (`THANH_BEN` so với tiêu đề trong `public/*.html`): «Của tôi» mở trang «Tôi»; «Dịch vụ & giá» mở trang «Dịch vụ» (và trang không hiện giá nào); «Hỗ trợ» mở trang có tên tệp là Hướng dẫn; «Nhật ký» mở «Nhật ký hệ thống». Ảnh: màn 1 `SALES-trang-chu-1280-man-1-y0.jpg` (thanh bên ghi «Của tôi», đã xem), màn 79 `SALES-account-390-man-1-y0.jpg` (thanh tab ghi «Tôi»), màn 56 `SALES_MANAGER-catalog-1280-man-1-y0.jpg`. Ba tên gộp «Xe & giấy tờ», «Giá & chi phí», «Sổ công nợ & khoá sổ» xem mục E.
- **C2. Tài xế có hai «màn đầu».** Theo bảng quyền sinh từ mã, trang đầu sau đăng nhập của tài xế là «Cuốc của tôi» (chưa kiểm bằng kịch bản đăng nhập), trong khi menu còn mục «Trang chủ» riêng chỉ chứa một ô dẫn ngược về «Cuốc của tôi» và khối giấy tờ. Ảnh: màn 9 `DRIVER-cuoc-390-man-1-y0.jpg`, màn 25 `DRIVER-tai-xe-390-man-1-y0.jpg`, màn 10 `DRIVER_PARTNER-cuoc-390-man-1-y0.jpg` (đã xem).
- **C3. Quản trị được dẫn tới một trang rồi bị từ chối.** Bảng quyền sinh từ mã ghi Quản trị có lối vào `/dieu-kien-xuat-ben` (đi cùng Chính sách điều phối), nhưng trang chỉ hiện «Chỉ Toàn quyền xem và đổi được…». Ảnh: màn 63 `ADMIN-dieu-kien-xuat-ben-390-man-1-y0.jpg`, màn 87 `SUPER_ADMIN-dieu-kien-xuat-ben-390-man-1-y0.jpg`.
- **C4. Trang chủ xếp việc khác nhau giữa hai khổ.** Ở máy tính dòng chào nói «gấp nhất» và có danh sách «Đang chờ bạn»; ở điện thoại là bốn ô số khác bộ, dải việc gấp nằm sát đáy màn đầu, và «Cần xem lại» đổi chỗ với «Đơn đi». Ảnh: màn 1 `SALES-trang-chu-390-man-1-y0.jpg` và `SALES-trang-chu-1280-man-1-y0.jpg` (đã xem cả hai), màn 4 `ADMIN-trang-chu-390-man-2-y372.jpg`.
- **C5. Mục Thiết lập của Quản trị là 18 dòng phẳng**, không nhóm theo việc, trong khi thanh bên máy tính đã nhóm (Vận chuyển, Tiền, Thiết lập). Ảnh: màn 57 `ADMIN-thiet-lap-390-man-1-y0.jpg`, màn 67 `SUPER_ADMIN-sessions-1280-man-3-y960.jpg` (thanh bên, đã xem).

**b) Khuôn theo loại màn**

- **C6. Màn danh mục và thiết lập không cùng một thứ tự khối.** Khuôn đa số: danh sách trước, biểu mẫu thêm sau (Loại giấy tờ cá nhân màn 59, Loại giấy tờ xe màn 60, Người bán màn 50). Lệch: Địa điểm (màn 58, hai biểu mẫu thêm trước), Quản lý tài khoản (màn 11 và 54), Máy đang đăng nhập (màn 67, bảng chính sách trước), Phí đưa đón (màn 53, «Thử tra» trước, đã xem).
- **C7. Mức bề rộng: lưới đã có, còn vài trang khai chưa hợp nội dung.** Đọc từ mã: 29 trang mức vừa, 21 rộng, 11 hẹp, không trang nào quên khai ngoài Trang chủ và Đăng nhập (đúng danh sách giữ nguyên của lưới 15/11). Lệch: Máy đang đăng nhập khai hẹp nhưng chứa bảng sáu cột nên bị cắt cột (màn 67 `…-1280-man-3-y960.jpg`, đã xem); Hoa hồng đối tác khai rộng trong khi các trang thiết lập tiền cùng nhóm khai vừa (màn 47 so màn 48). Các trang mức hẹp ở máy tính có khoảng trống 85–100 px phía trên, trang khác thì không (trợ lý báo ở màn 29, 72, 74; điểm nhỏ ở 33, 45, 46).
- **C8. Trạng thái rỗng và «không có quyền» chưa có một khuôn.** Có màn kèm nút hoặc liên kết đi tiếp (Bảng giá thuê xe màn 41, Cấp độ đại lý màn 48), đa số chỉ một dòng chữ (màn 34, 35, 46, 49, 55, 65, 73). Màn không quyền có ba kiểu: dải đỏ (màn 63), khối hồng (màn 76), khối hồng kèm bảng rỗng ở máy tính (màn 86).
- **C9. Danh sách không cùng một khuôn tìm và lọc.** Đơn hàng: ô tìm và nút «Lọc» (màn 17 `ACCOUNTING-orders-390-man-1-y0.jpg`, đã xem); Danh bạ: bốn bộ lọc mở sẵn chiếm màn đầu (màn 24); Quản lý tài khoản: 13 chip vai (màn 11 `HR-staff-1280-man-3-y960.jpg`, đã xem); Sổ công nợ: chip ba hàng (màn 43).

**c) Một nghĩa, một tên, một hình**

- **C10. Số tiền còn phải thu mang bốn tên.** «Còn thiếu» (Trang chủ điện thoại), «Còn phải thu» và «còn lại» (Trang chủ máy tính), «Còn thu» (Đơn hàng), «Còn lại» (Chi tiết đơn; bảng tham chiếu dùng «Còn lại»). Ảnh: màn 1 hai khổ, màn 17 `ACCOUNTING-orders-390-man-1-y0.jpg`, màn 18 `SALES-order-1280-man-2-y480.jpg` (đều đã xem).
- **C11. Tiền viết hai kiểu** (xem G6): màn 17 điện thoại «1,43tr đ», Chi tiết đơn «5.445.000 ₫» (màn 18); ngay trong Trang chủ điện thoại có cả «38.465.000 đ» lẫn «6,9tr».
- **C12. Số khách viết ba kiểu.** «2NL», «3NL» (Đơn hàng màn 17, Trang chủ màn 1, đã xem), «8 người lớn, 1 trẻ em» (Chi tiết đơn màn 18), «3 khách» (Chi tiết chuyến màn 32, đã xem).
- **C13. Ngày viết hai kiểu.** «2026-11-13» ở Điều chỉnh công nợ (màn 45 `ACCOUNTING-dieu-chinh-cong-no-390-man-3-y976.jpg`), «13/11/2026» ở mọi nơi khác (màn 11, đã xem).
- **C14. Nút cùng việc khác hình.** «Sửa»: chữ liên kết trong bảng tài khoản (màn 11, đã xem), nút nền nhạt hoặc nút viền ở Chi tiết đơn (màn 18, đã xem). Nút nguy hiểm: «Huỷ đơn» viền đỏ (màn 22), «Huỷ chuyến» đỏ đặc (màn 32), «Ngưng» chữ xám (màn 11, đã xem), «Đăng xuất máy này» chữ xám ở máy tính nhưng nền hồng ở điện thoại (màn 67, đã xem khổ 1280).
- **C15. Hai tên cho một thứ trên cùng màn.** «Vé» và «dịch vụ» ở trang Dịch vụ (màn 56); «Tổng» ở thanh đáy và «Tổng cộng» ở khối tóm tắt của Tạo đơn (màn 13); «app» trong câu chào mặc định của Trợ lý trong khi quy ước là «Nền tảng» (màn 70).

**d) Việc đi qua nhiều màn** (chỉ xét màn vừa tải; điều xảy ra sau khi bấm: chưa kiểm)

- **C16. Bán hàng lập đơn, xác nhận, thu tiền** (màn 1 → 12 → 18). Biết bước kế: Tạo đơn có thanh bước và đúng một nút chính; nhưng ở Chi tiết đơn trên điện thoại, việc thu tiền nằm gần cuối trang (G4). Nhập lại: không thấy trên màn vừa tải. Tên giữ nguyên: không, số tiền còn thu đổi tên qua ba màn (C10) và hai số cùng đỏ ở bước thu tiền (G3). Thanh bước có 5 bước với Bán hàng (màn 12) và 4 bước với Thực tập sinh, Đối tác (màn 14, 13).
- **C17. Đối tác tự lập đơn và theo dõi** (màn 8 → 13 → 19). Nút «Gửi đơn» rõ. Hai chỗ nói bằng chữ của văn phòng: khối «Người phụ trách — Chờ Bán hàng nhận» ở Tạo đơn (màn 13) và câu «Đang giữ đơn… Ai xử lý: Hướng dẫn viên» ở Chi tiết đơn (màn 19). Tiền viết gọn ở danh sách, viết đủ ở chi tiết.
- **C18. Kế toán soát và thu tiền** (màn 3 → 17 → 20 → 43). Danh sách không có lối lọc nhanh «còn thu», đơn đã huỷ chen lên từ dòng thứ ba, tiền bị làm tròn ở điện thoại (màn 17, đã xem); ở Chi tiết đơn điện thoại «Ghi khoản thu» ở cuối trang (màn 20); Sổ công nợ dùng bộ chữ khác («Đang giữ», «Số dư») và một số tiền hiện sáu lần (màn 43).
- **C19. Điều phối xếp chuyến xe** (màn 30 → 32 → 33). Ở điện thoại bảng mở sẵn tab «Chưa xếp 0» trong khi việc đang chờ nằm ở tab «Cần xử lý 1» (màn 30). Sang Chi tiết chuyến, nút «Nhập giá thoả thuận» có hai chỗ, «Cho xe chạy thay tài xế» mờ không nói vì sao, chữ nút tràn viền (màn 32, đã xem). Sửa chuyến ở điện thoại mất khối «xe này trong ngày» có ở máy tính (màn 33).
- **C20. Tài xế nhận và chạy chuyến** (màn 9, 10 → 26, 28). «Mở chuyến đang chạy» rõ. Chuyến bị giữ không cho tài xế lối đi tiếp nào (màn 10, đã xem). Trang chi tiết cuốc lấy tên hành động «Cho xe chạy CX-…» làm tiêu đề ở thanh trên và thân trang không có tiêu đề (T5 ở màn 26, 28).
- **Kịch bản hành trình cũ của lượt 13/11** chạy được một lần ở khổ 390 cho 10 vai, sau khi chụp xong. Năm vai đi hết các bước (Thực tập sinh, Quản trị, Hướng dẫn viên, Tài xế đối tác, Nhân sự); năm vai có bước «không tìm thấy», đều là bước kịch bản cũ tự đoán (Bán hàng: bảng trượt dịch vụ và nút lưu; Kế toán: «Kiểm vé»; Đối tác; Toàn quyền: mở vé đầu tiên; Tài xế công ty: «Cho xe chạy»). Không sửa kịch bản trong đợt này nên **không kết luận** lỗi giao diện từ năm vai đó: ghi «chưa kiểm».

## D. So với lượt 13/11

| Mã 13/11 | Trạng thái | Căn cứ |
|---|---|---|
| 13/11-K1 chưa có trang chính sách quyền riêng tư, hỗ trợ công khai | còn | `public/` không có trang nào; trang Tôi còn câu «Chưa có chính sách riêng tư…» (màn 75, 79) |
| 13/11-K2 Đăng nhập không tự giới thiệu | còn một phần | nay có lối «Đăng ký làm đối tác» (màn 83); chưa có câu giới thiệu |
| 13/11-K3 tên Nền tảng ba kiểu | còn | «Tour Đảo Booking» ở Đăng nhập (màn 83), «Island Booking System» ở thanh bên và tệp khai báo |
| 13/11-K4 biểu tượng, mã định danh, màn chờ | còn | tệp khai báo không có «maskable», không có `id`; không có ảnh màn chờ |
| 13/11-K5 lối xin xoá tài khoản | không kiểm lại được bằng công cụ đợt này | |
| 13/11-N1 khoá phóng to | còn (quyết định 30/9 của chủ) | thẻ viewport giữ nguyên |
| 13/11-N2 chữ không theo cỡ chữ của máy | không kiểm lại được | lệnh đo không có phép này |
| 13/11-N3 xoay ngang Tạo đơn | không kiểm lại được | chỉ đo 390 và 1280 |
| 13/11-N5 vùng chạm nhỏ | còn một phần | ảnh đại diện đã hết; còn liên kết chữ, ô tích, tab Điều phối (G5, 18 màn) |
| 13/11-N6 nhiều kiểu nút, cỡ chữ | còn | T6 không đạt ở 83 màn (số đếm gồm khung chung) |
| 13/11-N7 iPad đứng | không kiểm lại được | |
| 13/11-N8 bề rộng không theo lưới | đã hết phần lớn | mọi trang đã khai một trong ba mức; còn vài trang khai chưa hợp (C7) |
| 13/11-N9 băng thông báo cao | không chấm | thuộc khung chung đã duyệt |
| 13/11-N10 nhảy bố cục | không kiểm lại được | |
| 13/11-N11 hộp hỏi của hệ điều hành | đã hết | bài khoá nay đặt trần 0 |
| 13/11-N14 «Lưu khung bận» mờ không nói vì sao | còn về mặt nhìn | màn 29 (đã xem); kịch bản hành trình của vai này nay đi hết các bước |
| 13/11-S1 tương phản nhãn ở Gửi thông báo | còn | T8 color-contrast 11 chỗ (màn 69) |
| 13/11-S2 mã thô | còn | G17 |
| 13/11-S3 cắt chữ phụ | còn | địa chỉ đón ở Đơn hàng (màn 17, đã xem), dải tin ở điện thoại |
| 13/11-S4 tiền hai kiểu viết | còn | G6 |
| 13/11-S5 trạng thái rỗng, khối báo lỗi viền xanh | còn | G11; viền xanh ở trang không tìm thấy (điểm nhỏ màn 84). Đơn hàng rỗng: không kiểm lại (không chụp kho rỗng) |
| 13/11-S6 Điều phối: chữ đè trục giờ | còn một phần | nhãn «18:04» đè nhãn giờ «18» (màn 30, 31) |
| 13/11-S7 Thiết lập là danh sách phẳng | còn | màn 57 |
| 13/11-S8 Quản lý tài khoản dài ở điện thoại | còn | 10 ảnh mới hết trang (màn 11, 54) |
| 13/11-S9 màn ngoài mạng | không kiểm lại được | đợt này mở thẳng trang bằng tài khoản đã đăng nhập, không phải lúc mất mạng thật |
| 13/11-N4 thanh bên cắt mục đầu | còn | màn 3, 5; màn 67 (đã xem) |
| 13/11-N12 khối trạng thái thiếu tiêu đề chính | còn ở trang chi tiết cuốc | T5 «0 tiêu đề lớn» (màn 26, 28) |
| 13/11-N13 ô chọn ảnh ở Quét vé không nhãn | đã hết (theo máy đo) | T8 ở màn 71 chỉ còn lỗi chuông |

## E. Quyết định cũ nên xem lại (không gọi là lỗi)

- **E1. Chữ «(văn phòng lo)» trên màn tài xế.** Đây là chữ có trong đặc tả đã duyệt 29/9 (`docs/superpowers/specs/2026-09-29-bang-dieu-phoi-luot-1-man-hinh-can-ve.md`). Trợ lý xếp Nặng ở màn 10 và 26 vì tài liệu tiêu chí lấy chính chữ này làm ví dụ «chữ nội bộ». Lý do nên xem lại: tài xế đối tác thấy cả câu «Quản trị hoặc Kế toán nhập giá…» và chuyến bị giữ không có lối đi tiếp.
- **E2. Dải thẻ chuyển giữa các trang cùng nhóm chỉ có ở máy tính.** Ở điện thoại lối đi là danh sách trong tab «Tôi» (cách đã thiết kế). Trợ lý báo «mất ở 390» tại khoảng tám màn (Xe, Lịch xe bận, Giấy tờ sắp hết hạn, Bảng giá thuê xe, Bảng kê, Sổ công nợ, Khoá sổ tháng). Lý do nên xem lại: lối thay thế ở Sổ công nợ là một liên kết cao 18 px lẫn trong câu chữ.
- **E3. Tên mục menu gộp** («Xe & giấy tờ», «Giá & chi phí», «Sổ công nợ & khoá sổ») khác tiêu đề trang đầu của nhóm: theo menu máy tính theo việc đã làm 15/10. Lý do nên xem lại: người dùng bấm «Giá & chi phí» thì thấy tiêu đề «Bảng giá thuê xe».
- **E4. Quản trị không có nút tạo tài khoản** ở Quản lý tài khoản (trợ lý xếp Nặng ở màn 54). Việc ai được tạo tài khoản do các quyết định về vai Nhân sự và quyền tiền chi phối; đề bài của phiên điều phối ghi nhầm «tạo» trong việc của Quản trị. Chưa tra hết quyết định nên để ở đây, không gọi là lỗi.
- **E5. Khoá phóng to** (13/11-N1): chủ đã quyết 30/9, đã nhắc một lần ở 13/11; không nhắc lại.

## F. Nghi báo nhầm và chấm không đều (đưa vào nợ công cụ)

- **T6 đếm cả nút và cỡ chữ của khung chung** nên «không đạt» ở 83 trên 87 màn, kể cả màn không có nút riêng nào. Con số không phân biệt được màn tốt với màn xấu.
- **M2 ở danh sách chọn dịch vụ**: máy báo «chữ chồng chữ» với phần tử đã cuộn khuất; ba lượt hạ xuống Nhỏ, hai lượt giữ Nặng cho cùng một chỗ (màn 12, 14 so với 13, 72). Màn 47: máy báo chồng chữ do chữ tràn bị ẩn.
- **Chấm không đều giữa các lượt cho cùng một điều**: «(văn phòng lo)» Nặng ở màn 10, 26 nhưng Nhỏ ở màn 28; màn không quyền thiếu lối đi tiếp Nặng ở màn 63, 76 nhưng Nhỏ ở màn 86; tiền viết hai kiểu Nhỏ ở chín màn, Nặng ở màn 17.
- **Màn 38, S7 Nặng «Xe 16 chỗ nhập 15»**: nghi báo nhầm. Câu này là ví dụ chung của ô nhập; số 16 trong ô là do kịch bản gieo dữ liệu thử nhập.
- **Màn 54, S9 Nặng «không có lối tạo tài khoản»**: nghi báo nhầm do đề bài của phiên điều phối (xem E4). Màn 46: đề bài của phiên điều phối tả sai việc của trang Phân định; trợ lý tự nhận ra.
- **T4 ghi «44×44» mà vẫn không đạt** (màn 87, màn 69): có vẻ lệch số lẻ khi làm tròn.
- **T5 đếm nút lọc và nút lặp theo dòng** là «nút chính» (màn 23, 41, 56).
- **Máy bỏ sót**: chữ nút tràn viền ở màn 32 (T2 đạt); nhãn giờ đè nhau ở Điều phối (M2 đạt); nút lưu biến mất ở điện thoại (không có phép đo «hai khổ cùng bộ nút»).
- **Lõi chụp dừng ở 10 ảnh mỗi khổ**: sáu trang dài chưa chụp hết ở ít nhất một khổ (Chi tiết đơn, Dịch vụ, Máy đang đăng nhập, Nhật ký, Tôi, Nhật ký thay đổi; 9 màn, ghi ở bảng phủ). Chi tiết đơn chỉ thiếu khoảng 100–400 px cuối trang ở điện thoại (phần Lịch sử), nút «Ghi khoản thu» nằm trong vùng đã chụp. Nhật ký thay đổi cao 135.191 px ở điện thoại, mới chụp khoảng 4 %. Lõi chụp cũng không mở được trang chi tiết ngoài Chi tiết đơn nếu không truyền mã trên địa chỉ, và khi truyền thì ghi nhầm «trang tự chuyển».
- **Báo cáo trả về qua hai đường**: công cụ lưu ban đầu của phiên điều phối lấy nhầm bản chữ thường thay vì bản trả chính thức ở 20 lượt; đã lưu lại toàn bộ từ bản trả chính thức trước khi gom.
- Một lượt gộp có một dòng `PHÁT HIỆN` sai khuôn vì ô chứa dấu gạch đứng trích từ màn hình (màn 68): đã giao lại riêng màn đó một lần, đúng khuôn.

## G. Kiểm lại độc lập

Người kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc) tự chọn mười mẫu, mở đúng tệp ảnh được dẫn: **8 trên 10 xác nhận, 2 xác nhận một phần, 0 bác.**

| Mẫu | Kết luận | Ghi chú |
|---|---|---|
| Màn 62, Chặn việc (không có nút lưu ở điện thoại) | xác nhận | cả ảnh lẫn mã |
| Màn 13, Nặng M2 (dòng đầu danh sách dịch vụ bị cắt) | xác nhận | phần «chồng chữ» chỉ là số đo của máy |
| Màn 63, Nặng S10 (Quản trị chỉ thấy câu từ chối) | xác nhận | |
| Màn 38, Nặng S7 («Xe 16 chỗ nhập 15») | xác nhận một phần | ảnh đúng, nhưng không phải lỗi rõ: đã gắn nhãn nghi báo nhầm ở bảng A |
| Màn 41, Nặng S2 (hai nút «Thêm giá») | xác nhận | |
| Màn 76, Nặng S10 (Hồ sơ tổ chức chỉ một câu) | xác nhận | |
| C3 (Quản trị bị dẫn tới trang rồi bị từ chối) | xác nhận | ảnh màn 63, 87 và mã |
| C4 (Trang chủ xếp việc khác nhau giữa hai khổ) | xác nhận | kiểm trên ảnh của Quản trị |
| C10 (số tiền còn phải thu mang bốn tên) | xác nhận | còn thấy thêm «Còn thiếu» trong câu «Đang giữ đơn» |
| C2 (tài xế có hai «màn đầu») | xác nhận một phần | hai màn đúng như tả; câu «sau đăng nhập vào Cuốc của tôi» không thấy trên ảnh: đã sửa thành «theo bảng quyền sinh từ mã» |

Kiểm thêm ngoài mẫu, đều khớp: màn 4, 87, 18, 10, 23; màn 17 khớp một phần (đơn huỷ bắt đầu từ dòng 3, đã sửa câu chữ).
Đối chiếu bảng phủ với thư mục thật: 65 trang trong `PAGES` có đúng 65 dòng; 87 màn đều có `tom-tat.md` và ảnh hai khổ; 74 tệp báo cáo khớp; không dòng «đo thiếu» hay «ô hỏng» nào bị coi là đạt; số 1 / 70 / 405 khớp bảng gộp.
Đã sửa theo kết quả kiểm lại: ghi đúng các lần lưu lúc chụp; thêm Chi tiết đơn vào danh sách chưa chụp hết; gắn nhãn «nghi báo nhầm» và «chữ đã duyệt» vào bảng A; bớt chỗ nói quá ở C18, G12 và ở báo cáo.
Người kiểm không kiểm: các phép đo (chỉ đối chiếu `tom-tat.md`), C1, C5–C9, C11–C20, 405 điểm Nhỏ, mục E.

## H. Ý định sửa của chủ dự án (bốn ảnh chủ đánh dấu trên bản chạy thật, đọc 20/11 sau khi chấm)

Chủ đưa bốn ảnh chụp bản chạy thật (bản 3.18) có khoanh đỏ và ghi chú. Ảnh để ngoài kho. Bản chạy thật chưa có đợt sửa Tạo đơn 20/11; bản được chấm thì đã có (đề bài ghi «chưa thi công» là theo lúc soạn đề).

| Ảnh | Màn | Ý của chủ (đọc từ ghi chú trên ảnh) | Khớp với kết quả đợt này | Điều phải tra hoặc quyết trước khi vẽ ảnh đề xuất |
|---|---|---|---|---|
| H1 | Tạo đơn của Đối tác, máy tính | Ẩn tiêu đề «Thanh toán»; chuyển khối «Hình thức thanh toán» (Thanh toán ngay, Trả sau) sang cột phải ngay trên nút «Gửi đơn»; ẩn khối «Người phụ trách»; ẩn ba câu giải thích dưới ô giảm giá và đặt cọc | Khối «Người phụ trách» với đối tác: trợ lý báo ở màn 13 (S10), nhận định C17; đặc tả Tạo đơn 20/11 để mục này «chưa tra xong» | Ba câu giải thích nói về tiền (trần giảm giá theo hoa hồng, tiền cọc không làm giảm nợ) và có bài kiểm ghim chữ: ẩn hẳn hay gập lại là quyết định về hiển thị tiền. Tài khoản thử của đợt này không được bật Trả sau nên khối «Hình thức thanh toán» chưa từng được chụp |
| H2 | Tạo đơn của Đối tác, khối Đưa đón | Sau khi chọn «Đón», ẩn cả phần chi tiết lượt đón (dòng «Đã tạo sẵn chiều đi», Lượt 1, «Đón khác ngày», Nơi đón, Nơi trả, «Thêm chi tiết», «Thêm chiều về», «Thêm lượt»); chỉ giữ hai nút «Đón», «Không đón» và ô ghi chú | Cùng hướng với quyết định «đối tác đặt bằng vài thao tác, văn phòng lo phần còn lại» | Chạm dữ liệu và tiền: phí đưa đón tính theo nơi đón; không có nơi đón thì đơn của đối tác lưu chặng thế nào và ai điền. Không tự quyết ở mức giao diện |
| H3 | Chi tiết đơn của Đối tác | Đưa nút «Ghi khoản thu» lên ngay dưới dòng «Còn lại» (ghi chú: thu tiền khách); đưa nút «Xem công nợ với Tour Đảo» xuống cuối khối «Hoa hồng của bạn», dưới «Tổng giá đại lý» (ghi chú: chuyển khoản cho Tour Đảo) | Trùng hướng với G3, G4 và C10: nút tiền đứng cạnh con số nó xử lý, tách tiền khách trả với tiền nộp công ty | Chữ đỏ trên ảnh là tên nút mới hay chỉ là chú thích: đổi tên nút phải qua bảng tham chiếu. Ảnh ở bề rộng khoảng 940 px còn cho thấy chữ trong khối Thanh toán chồng lên nhau («Hình thức thanh toán», «Hạn trả», câu «Đang giữ đơn»): đợt này chỉ đo 390 và 1280 nên không bắt được |
| H4 | Vé điện tử (kho vé) | Thêm lọc phía trên «Số vé còn»: lọc theo sản phẩm và lọc theo số vé còn | Đợt này chấm màn 72 lúc kho rỗng nên không thấy danh sách dài; khớp nhận định C9 (danh sách chưa có một khuôn tìm và lọc) | Chỉ là giao diện; nên dùng luôn khuôn tìm và lọc chung khi làm họ màn có danh sách |

Nhận định của phiên điều phối: bốn ảnh cùng một hướng, là bớt thứ người dùng vai đó không cần, đưa lựa chọn và nút tới cạnh chỗ ra quyết định, và danh sách dài phải lọc được. Hai lỗ của đợt đo lộ ra từ bốn ảnh này: kho thử thiếu đối tác được Trả sau và thiếu vé, và thiếu khổ đo ở khoảng 900 đến 1040 px.

**Chủ trả lời ba điều phải quyết (20/11/2026, trong phiên, nguyên văn):**

1. Về H2: «Phí đưa đón tạm thời không được xác định bởi nơi đón, vì cào bằng luôn.» Tức ẩn nơi đón với đối tác không làm đổi số phí. Còn phải kiểm khi thi công: đơn của đối tác lưu lượt đón không có nơi đón thì máy chủ có nhận không, và văn phòng điền nơi đón ở đâu (chạm dữ liệu lượt đón, không tự quyết ở giao diện).
2. Về H1: «ok nên gập lại». Ba câu giải thích về tiền gập lại sau một nút, không bỏ hẳn.
3. Về H3: «sửa "Ghi khoản thu" thành "Nhập khoản thu" và đặt vào vị trí khung màu đỏ. Nút "Xem công nợ với tour đảo" chuyển thành "Thanh toán đơn này cho cty Tour Đảo".» Tức hai tên nút mới do chủ đặt, nút thứ nhất nằm ngay dưới dòng «Còn lại», nút thứ hai nằm cuối khối «Hoa hồng của bạn» dưới «Tổng giá đại lý». Đổi tên nút phải cập nhật bảng tham chiếu cùng lúc (chữ nút lệch bảng thì bộ kiểm đỏ).

Phiên này giữ vai điều phối và kiểm nên không thi công. Việc sửa đi theo cách đã chốt: ảnh xem trước «hiện tại / đề xuất» cho chủ duyệt, rồi mới sửa mã ở một phiên khác, có người kiểm độc lập vì chạm chỗ hiển thị tiền.

