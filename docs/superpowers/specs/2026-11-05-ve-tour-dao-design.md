# Vé Tour Đảo và quét vé (bản đề xuất, 2026-11-05)

**Trạng thái:** chờ chủ dự án duyệt. Chưa có mã. Sau khi duyệt mới lập kế hoạch và soạn ADR. Việc lớn theo `CLAUDE.md` §3 vì chạm dữ liệu, quyền và cổng tiền.

**Xây trên lỗ đang hở:** `HC-5.19` (chưa diễn tập khôi phục, chỉ phát hành sau diễn tập), `TNV-G1` (đơn huỷ còn tiền; vé chạm đường huỷ đơn). Cần chủ thêm dòng `xay_tren_cho_phep` khi duyệt. Không chạm `HC-4.2`, `HC-5.11`.

## 1. Trang cho chủ dự án

### Làm gì

Nền tảng tạo được vé mang logo Tour Đảo, có mã QR, đưa vào kho, tự cấp cho đơn và gửi cho khách như vé Vinpearl. Nhân viên mở Nền tảng trên điện thoại, quét mã để biết vé đúng hay sai và đã dùng chưa. Văn phòng xem được số khách thực tế so với đơn và việc của từng người quét.

Với chủ dự án đây là phân hệ mới, nhưng về kỹ thuật người viết đề xuất dùng lại kho vé đang chạy thay vì dựng kho thứ hai, vì luồng giữ vé, trả vé khi huỷ, gửi Zalo, đường dẫn cho khách đã qua nhiều lần kiểm. Phần mới là: tạo vé, mở vé sớm, màn quét, đối chiếu, vé đoàn.

Điểm khác cốt lõi so với vé Vinpearl: vé Vinpearl lộ ra là không lấy lại được; vé của mình do chính máy chủ của mình quyết định còn giá trị hay không, nên huỷ đơn là vé chết ngay.

### Bản chất của vé theo góc kế toán

Chủ dự án nêu vé là cam kết dịch vụ, đồng thời là xác nhận dịch vụ, và lúc đó chưa giao nhận dịch vụ. Người viết đồng ý, và tách thêm một điểm: **lúc tạo vé vào kho chưa có cam kết nào**, vì chưa gắn với khách nào. Cam kết ra đời lúc vé được cấp cho đơn đã xác nhận. Tách ba thời điểm thì ai giữ quyền gì trở nên rõ:

| Thời điểm | Việc thật | Về sổ sách (chờ kế toán xác nhận) | Ai làm |
|---|---|---|---|
| Tạo vé vào kho | Vé trắng, chưa có khách, chưa có tiền | Chưa có gì để ghi; chỉ cần đếm được như giấy tờ in sẵn | **Đề xuất: Kế toán, Toàn quyền** |
| Cấp cho đơn đã xác nhận | Công ty cam kết phục vụ | Khách đã trả thì là khoản trả trước, chưa phải doanh thu. Chưa trả thì mới là cam kết | Máy tự cấp; cổng kiểm soát là việc xác nhận đơn (Bán hàng, Quản trị, Toàn quyền) |
| Quét, dịch vụ xong | Công ty đã thực hiện cam kết | Căn cứ để ghi doanh thu và xác định thời điểm hóa đơn | Hướng dẫn viên, Bán hàng, Quản trị, Toàn quyền |
| Đối chiếu | So vé tạo, vé cấp, vé quét và tiền | Sổ vé hỗ trợ kế toán, Nền tảng không tự ghi bút toán | Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng |

**Vì sao Kế toán tạo vé:** nguyên tắc kiểm soát nội bộ là tách người duyệt, người giữ, người ghi chép và người đối chiếu. Bán hàng và Hướng dẫn viên là người bán, thu tiền hoặc quét nên không nên tự tạo vé. Kế toán không xác nhận đơn và không quét, nên không bị vướng. Cách này khớp ô `ledger.write` hiện có (Kế toán, Toàn quyền). Giới hạn cần nói thẳng: Kế toán vừa tạo vừa đối chiếu nên chưa tách trọn; chấp nhận được vì vé trong kho chưa có giá trị và máy ghi hết. Hệ quả có lợi: vì vé trắng vô hại nên tạo dư được, giảm nỗi lo kho hết ngoài giờ làm việc.

### Chủ dự án đã chọn (5/11, hộp câu hỏi)

| Câu | Chọn |
|---|---|
| Dạng vé | Có cả hai: mỗi khách một mã và cả đoàn một mã. Làm loại mỗi khách một mã trước |
| Ai quét | Hướng dẫn viên, Tài xế công ty, Bán hàng và văn phòng; Quản trị, Toàn quyền luôn quét được |
| Tài xế | Chỉ xem vé đúng hay sai, không tính đã dùng |
| Mạng | Bản cần có mạng trước |
| Khách nhận vé từ lúc nào | Xác nhận đơn là mở (khác vé Vinpearl) |
| Đơn đối tác, đại lý | Vẫn theo luật đối tác đã duyệt, không mở ngay lúc xác nhận |
| Số đếm dùng để | Chặn dùng lại, so khách thực tế với đơn, theo dõi việc người quét. **Không** tính tiền, hoa hồng |
| Khách đến lệch ngày | Cảnh báo, người quét quyết, ghi lại |
| Kho hết vé | Báo thiếu, người có quyền tạo thêm; đơn vẫn xác nhận |
| Chọn vé đoàn | Nhân viên chọn trên từng đơn; mặc định vé từng khách |
| Giá trên vé | Không ghi giá; biên nhận vẫn là chứng từ tiền |

### Cần chủ dự án quyết khi duyệt bản này

1. **Ai tạo vé:** Kế toán và Toàn quyền (khuyến nghị), hay thêm Quản trị để có người trực ngoài giờ.
2. **Đơn đã có vé được tính đã dùng:** không huỷ được và không giảm số khách xuống dưới số đã dùng, trừ khi bỏ lượt quét trước (khuyến nghị), hay vẫn cho huỷ kèm cảnh báo. Khuyến nghị vì khách đã dùng dịch vụ thì huỷ đơn sẽ làm sai tiền và hoa hồng.
3. **Tiếng Anh trên vé:** khách nước ngoài nhiều thì in hai thứ tiếng như vé Vinpearl (khuyến nghị); luật «không chữ Anh» ở `CLAUDE.md` §7 nói về giao diện, nên vé gửi khách cần chủ dự án nói rõ.

### Cần hỏi kế toán, người viết chưa kiểm

Bốn câu dưới đây dựa trên trang tổng hợp, chưa đọc được văn bản gốc. Cổng `thuvienphapluat.vn` chặn máy đọc, và các nguồn nói khác nhau về văn bản năm 2026.

1. Vé không ghi giá, có dòng «không phải hóa đơn», có bị coi là «tem, vé, thẻ» theo Điều 8 khoản 5 Nghị định 123/2020 không?
2. Tiền cọc tour có phải lập hóa đơn ngay lúc thu không? Điều 9 khoản 2 chỉ miễn cọc cho một số dịch vụ không gồm du lịch; có nguồn nói Nghị định 254/2026 đổi phạm vi từ 1/7/2026, và Thuế Khánh Hòa có công văn 507/KHH-QLDN3 năm 2026 về tiền đặt cọc.
3. Công ty đang áp chế độ kế toán nào, và khoản trả trước ghi vào đâu? Hỏi đáp của Bộ Tài chính phân biệt theo một kỳ (TK 131) hay nhiều kỳ (TK 3387).
4. Vé hết hạn mà khách chưa dùng thì khoản đã trả xử lý thế nào? Bản này chỉ báo số, không tự đổi tiền.

### Thứ tự làm

Tất cả làm **sau khi** nhánh ADR-0168, ADR-0170, ADR-0171 nhập, vì các nhánh đó viết lại đúng cổng mở vé. Phát hành sau diễn tập khôi phục.

- **Bước 0:** thử camera trên iPhone thật (khoảng một giờ, chủ dự án cầm máy). Hỏng thì đổi cách quét trước khi làm tiếp.
- **Đợt 1:** tạo vé vào kho, mở vé khi xác nhận, gửi khách, báo thiếu.
- **Đợt 2:** màn quét, số đã dùng trên đơn, đối chiếu.
- **Đợt 3:** vé đoàn.

## 2. Phần cho người thi công

### 2.1 Không làm và điều không được xảy ra

**Không làm:** quét khi mất mạng; đối tác hoặc nhà cung cấp quét; tính tiền hay hoa hồng theo số quét; tự đổi số khách, trạng thái đơn hay «Xong và đủ tiền» theo số quét; bán vé ngoài đơn; quét vé Vinpearl; mã QR đổi theo thời gian; nối với nút lên xe của Tài xế (`PASSENGER_BOARDED`).

**Không được xảy ra:** một vé từng khách được tính hai lần; vé Vinpearl lộ sớm vì luật mở vé Tour Đảo; quét làm hỏng xác nhận đơn; mã vé lọt vào nhật ký, URL, phản hồi lệnh ghi hay câu lỗi; lộ tên khách, số điện thoại, giá cho người quét không có quyền xem đơn; mở `camera` cho trang khác `/quet-ve`.

### 2.2 Dữ liệu (dùng lại module `ve-dien-tu`)

- `vdt_batch` thêm `source` (`NCC`, `TOUR_DAO`), mặc định `NCC`, không đổi sau khi tạo.
- Vé Tour Đảo vẫn là dòng `vdt_ticket` đủ `storage_key`, `content_hash`, `byte_size`: không phải dựng lại bảng, nên đường dẫn khách và gửi vé chạy nguyên.
- Bảng mới `vdt_scan`, chỉ thêm: vé, phân bổ, đơn, dòng dịch vụ, `ket_qua` (`DA_TINH`, `CHI_XEM`, `TU_CHOI`), lý do, số khách, cờ đã xác nhận lệch ngày / chưa thu đủ / vượt số khách, giờ và người quét, giờ / người / lý do bỏ lượt (ghi một lần). «Đã dùng» suy ra từ bảng này, không thêm trạng thái vào `vdt_ticket`.
- Chặn trùng ở CSDL: chỉ mục duy nhất một phần cho vé từng khách trên lượt `DA_TINH` chưa bị bỏ, và phải chừa đường cho vé đoàn (nhiều lượt trên một vé).
- Số migration và số ADR tạm: migration ≥ `0142` (`0141` thuộc nhánh Trả sau), ADR ≥ `0172`. Kiểm lại mọi nhánh trước khi đặt. Cột mới cập nhật `docs/data-dictionary.json` kèm hạng dữ liệu.

### 2.3 Tạo vé

- Người có ô `ve.phat-hanh` chọn dịch vụ, loại khách (`ALL` được), khoảng ngày, số lượng. Trần số vé mỗi lô dùng chung `vdt_setting`.
- **Mã vé:** `TD1.` + 26 ký tự base32 (130 bit) do trình duyệt sinh bằng `crypto.getRandomValues`, gửi kèm ảnh qua đường `POST /api/ve/lo/:id/ve` hiện có. Lý do: ADR-0153 Đ1 mục 5 cấm mã vé trong phản hồi lệnh ghi, nên máy chủ không trả mã về được. Người tạo vốn thấy mã trên ảnh, nên trình duyệt sinh mã không thêm rủi ro. Đây là mã bí mật như `ticket_code` hiện nay; mã bản ghi vẫn là `vdt_ticket.id`, nên không thuộc Hiến chương 5.26.
- Máy chủ kiểm: lô `TOUR_DAO` chỉ nhận đúng dạng trên; lô `NCC` từ chối tiền tố `TD1.`.
- **Ảnh vé** vẽ bằng canvas trên trình duyệt người tạo, dùng lại `veMaQr` và cách nạp phông của `web/qr-ve.ts`, `web/confirmation-image.ts`. Vẽ xong tự đọc lại QR bằng `web/qr-doc-ve.ts`; đọc không ra hoặc lệch mã thì không gửi. Máy chủ không đọc lại QR, như ADR-0156. Kết quả quét luôn lấy từ máy chủ, nên ảnh sai chữ không làm sai việc kiểm.
- **Nội dung vé:** logo, tên công ty và Hotline (qua `ownerCompany`), «VÉ DỊCH VỤ», tên dịch vụ, loại khách, hạn cuối kèm chữ «dùng vào ngày đi đã đặt», QR đen trên nền trắng, 4 ký tự cuối của mã, «Mỗi vé dùng một lần», «Không phải hóa đơn». **Không** giá, tên khách, số điện thoại, mã đơn. Bố cục dọc như vé Vinpearl mẫu.
- Một dịch vụ chỉ dùng một nguồn: máy chặn tạo lô `TOUR_DAO` cho dịch vụ còn lô `NCC` đang hoạt động, và ngược lại.
- Mọi route theo lô (`/ve`, `/xac-nhan`, `/bo`, `/sua-ma-tour`) phải hỏi ô theo `source` của lô. Hôm nay chúng chỉ hỏi `ve.kho.manage`, nên không sửa thì Bán hàng thao tác được lô Tour Đảo.
- Sau khi lô vào kho, máy cấp bù cho các đơn đã xác nhận còn thiếu, ngày đi gần trước. Thiếu vé thì báo người giữ `ve.phat-hanh` qua `thongbao`. Cả hai việc này hiện chưa có, ghi ở `docs/SYSTEM-DESIGN.md` mục kho vé.

### 2.4 Mở vé

- Thêm vào hàm duy nhất quyết định mở vé (`veMoDuoc` của ADR-0168): vé `TOUR_DAO` của đơn đã xác nhận thì mở được; nếu đơn thuộc diện đối tác thì đi luật đối tác như vé thường. **Diện đối tác** gồm đơn người giữ quyền Đối tác lập và đơn nhân viên lập mà bên đặt là đối tác, vì lý do tiền như nhau. Đơn huỷ thì không mở.
- Việc quyết định phải **theo từng vé**, không theo đơn. Đơn có cả vé Vinpearl và vé Tour Đảo: chỉ vé Tour Đảo mở.
- **Bẫy lớn nhất:** `POST /api/ve/duong-dan`, `/giao`, trang `/ve/:token` và `cauDanhDauLo` hôm nay coi mọi vé của đơn như nhau. Tạo đường dẫn lúc chưa thu đủ mà không lọc thì vé Vinpearl bị đóng dấu đã lộ và không về kho được. Phải có bài đỏ trước, xanh sau cho đơn lẫn hai nguồn.
- Vé `TOUR_DAO` đã mở **không tính** vào `coVeDaMo` của ADR-0168 Đ3 mục 3, ADR-0170 Đ3, ADR-0171 Đ1, vì luật đó bảo vệ vé không lấy lại được. Thay vào đó là chặn theo vé đã dùng (2.5).
- Huỷ đơn: vé đã lộ thành `VOID` như hiện nay, nên quét ra đỏ. Giảm số khách: giữ cách hiện tại, trả vé chưa lộ trước; vé đã lộ còn thừa bắt ở bước quét bằng cảnh báo vượt số khách.

### 2.5 Quét

Một route `POST /api/ve/quet`, access `staff` (cổng `office` không có Hướng dẫn viên, Tài xế), kiểm Origin, có mã lần gửi theo ADR-0094, khai `GHI_NHIEU_LAN` nếu e2e H5 đòi. Mã ở thân yêu cầu, không ở URL. Thân gồm mã, các cờ đã xác nhận, số khách (vé đoàn).

Thứ tự kiểm ở máy chủ, một mốc giờ cho cả yêu cầu:

| Kiểm | Kết quả cho người quét |
|---|---|
| Quyền | 403 |
| Mã lạ, hoặc vé nguồn `NCC` | Đỏ, cùng một câu: «Không phải vé Tour Đảo» (không để dò mã Vinpearl) |
| Vé `VOID`, đơn huỷ | Đỏ: «Vé đã huỷ» |
| Chưa cấp cho đơn, chưa lộ (`revealed_at` trống) | Đỏ: «Vé chưa được giao cho khách, báo văn phòng» |
| Hôm nay ngoài `valid_from`..`valid_to` | Đỏ: «Vé hết hạn» hoặc «Chưa tới ngày dùng» |
| Đã có lượt `DA_TINH` chưa bỏ | Đỏ: «Đã dùng lúc … bởi …» |
| Lệch ngày đi, chưa thu đủ, số lượt đạt số khách hiệu lực | Vàng, cần bấm xác nhận; gửi lại kèm cờ |
| Còn lại | Xanh; tính đã dùng ngay, không cần bấm |

- Yêu cầu `revealed_at` không trống bảo đảm vé đã tính không bao giờ về kho. Lô ghi gồm: câu chèn có gác, nhật ký `changes() > 0`; thua cạnh tranh thì đọc lại và trả câu «Đã dùng». Hai máy cùng quét chỉ một bên thắng.
- **Tài xế** (`ve.quet.xem`): chạy đủ các kiểm, ghi `CHI_XEM`, không bao giờ `DA_TINH`, câu nói rõ «chưa tính đã dùng». Lượt `TU_CHOI` có vé thật cũng ghi để phát hiện dùng lại; mã lạ không ghi.
- **Chưa thu đủ:** chỉ người có `money.view` trên đơn đó mới thấy số tiền; người khác thấy «Đơn chưa thu đủ, báo văn phòng trước khi thu khách». Câu này tránh cảnh khách đã trả đại lý mà bị đòi tiền ở bến.
- **Dữ liệu trả về:** tên dịch vụ, loại khách, ngày đi, số khách vé đoàn, 4 ký tự cuối của mã. Mã đơn chỉ hiện khi có `order.view` trên đơn. Không tên, số điện thoại, giá. Quét không mở quyền xem đơn cho Hướng dẫn viên.
- **Bỏ lượt quét:** người quét trong 5 phút, hoặc Quản trị, Toàn quyền bất kỳ lúc nào; bắt buộc lý do; ghi nhật ký.
- **Đơn có vé đã tính** (chờ chủ duyệt câu 2 ở phần 1): chặn huỷ ở mọi đường huỷ và rút xác nhận; chặn sửa số khách xuống dưới số đã tính.

### 2.6 Camera và trang quét

- Trang `/quet-ve` (`public/quet-ve.html`, `web/quet-ve.ts`), khai `PAGES`, `PRECACHE`, `build:web`, mục menu.
- `public/_headers` đang đặt `camera=()` cho `/*`. Thêm khối riêng cho `/quet-ve`: dòng `! Permissions-Policy`, rồi đặt lại với `camera=(self)`. Tài liệu Workers xác nhận cú pháp `!`; **chưa kiểm** việc tháo và đặt lại cùng một khối, phải đọc đầu phản hồi thật trên `wrangler dev`. Thêm bài khoá: `/*` vẫn `camera=()`, chỉ một đường mở, và bài `src/chi-duong-tinh.test.ts` vẫn giữ `geolocation=()`.
- Hai cách quét: (a) video trực tiếp bằng `getUserMedia`, đọc khung bằng jsQR; (b) nút chụp ảnh `<input type="file" accept="image/*" capture="environment">`, đọc bằng `docQrTuTep` hiện có. Cách (b) là đường dự phòng phải luôn có. iPhone không có `BarcodeDetector` bật sẵn, nên không dựa vào nó.
- `src/vendor-jsqr.test.ts` chỉ cho `web/qr-doc-ve.ts` import jsQR: thêm hàm đọc khung vào tệp đó, không tạo nơi import thứ hai. jsQR nặng khoảng 257 KB, nên chỉ gói vào trang này và trang kho.
- **Bước 0:** báo lỗi WebKit cũ cho thấy ứng dụng cài lên màn hình iPhone có thể hỏi lại quyền camera; **chưa kiểm trên iOS hiện tại**. Camera cần HTTPS, nên thử bằng `node scripts/dev-iphone.mjs --tunnel`, không dùng địa chỉ LAN thường.
- Giao diện: kết quả chiếm cả màn, ba màu kèm chữ rõ (không chỉ dựa vào màu), cỡ chữ lớn; bộ đệm chống đọc lặp cùng mã trong vài giây ở trình duyệt.

### 2.7 Đối chiếu

- Khối «Vé điện tử» trên đơn: «Đã dùng x/y» theo dịch vụ.
- Màn đối chiếu theo ngày: dịch vụ, số khách theo đơn, số đã tính, chênh lệch. Chỉ báo, không tự sửa.
- Theo người quét: số lượt tính, xem, bị từ chối theo ngày.
- Sổ vé Tour Đảo: đã tạo = trong kho + đang giữ + đã huỷ; đã cấp = đã dùng + chưa dùng. «Chưa dùng» chính là số cam kết còn phải phục vụ. Thêm bất biến `R-VDT-*` kiểm các đẳng thức này và kiểm `DA_TINH` chỉ trên vé `TOUR_DAO` đã lộ.

### 2.8 Vé đoàn (đợt 3)

- Trên đơn đã xác nhận, người giữ `ve.cap.send` chọn chuyển một dòng dịch vụ sang vé đoàn. Vé từng khách chưa lộ về kho; vé đã lộ thành `VOID`, máy hỏi lại vì khách có thể đang giữ.
- Một mã cho cả dòng dịch vụ; số khách không gồm em bé, như vé từng khách. Ảnh in tên đoàn và số khách, không số điện thoại. Vé đoàn gắn ngay vào đơn nên không qua `ve.phat-hanh`, nhưng có trong sổ vé.
- Quét: nhập số người vào; quét được nhiều đợt; tổng không vượt số khách hiệu lực. Đủ thì đỏ «Đã đủ 12/12». Tài xế chỉ thấy số, không tính.
- Sửa số khách: mã giữ nguyên, máy theo số mới, ảnh cũ hiện nhãn «cần vẽ lại».
- Tên đoàn là dữ liệu cá nhân khi là tên người: người soạn đợt 3 phải xếp hạng dữ liệu và rà luật hiện tên khách cho Tài xế (chỉ trong ngày chạy). Hình dạng bảng do kế hoạch đợt 3 quyết.

### 2.9 Quyền (bốn ô mới, không thêm mã quyền)

| Ô | Được |
|---|---|
| `ve.phat-hanh` (tạo vé, lô Tour Đảo) | Kế toán, Toàn quyền (chờ chủ duyệt) |
| `ve.quet.tinh` (tính đã dùng) | Hướng dẫn viên, Bán hàng, Quản lý bán hàng, Quản trị, Toàn quyền, phạm vi `any` |
| `ve.quet.xem` (chỉ xem) | Tài xế công ty và mọi người giữ `ve.quet.tinh` |
| `ve.doi-chieu.view` | Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng |

«Văn phòng» ở câu trả lời của chủ, người viết hiểu là không gồm Kế toán (để giữ tách việc) và không gồm Thực tập, Nhân sự. `ve.kho.manage` giữ nguyên; `web/ve-kho` hiện với `ve.kho.manage` hoặc `ve.phat-hanh`, và Kế toán chỉ thấy lô Tour Đảo. Mỗi ô sửa bài ghim hàng ở `permissions.test.ts`.

### 2.10 Bảng tóm tắt để lập trang ghép (`CLAUDE.md` §9)

Bảng dùng chung `vdt_batch`, `vdt_ticket` nhận thêm loại vé Tour Đảo, nên phải có trang ghép khi trình ADR. Tối đa ba quyết định một lượt: (1) nguồn vé và ô tạo vé, (2) mở vé khi xác nhận kèm ngoại lệ ở ADR-0153, 0168, 0170, 0171, (3) quét vé, camera, ô quét, chặn huỷ khi đã dùng. Vé đoàn là lượt sau.

| Cửa | Cổng máy chủ | Giao diện đổi nghĩa |
|---|---|---|
| Tạo vé, thao tác lô Tour Đảo | `ve.phat-hanh` theo `source` của lô | Mục «Kho vé» hiện cho Kế toán; Bán hàng thấy số nhưng không nút tạo |
| Xem ảnh, gửi, đường dẫn vé Tour Đảo | `ve.cap.send` + hàm mở vé theo từng vé | Khối vé trên đơn hiện nút trước khi thu đủ cho riêng vé Tour Đảo |
| Trang khách `/ve/:token` | Mã đường dẫn + hàm mở vé theo từng vé | Khách có thể thấy vé Tour Đảo mà chưa thấy vé Vinpearl cùng đơn |
| Quét | `ve.quet.tinh` hoặc `ve.quet.xem` | Mục mới «Quét vé» cho Hướng dẫn viên, Tài xế |
| Đối chiếu | `ve.doi-chieu.view` | Màn mới |
| Huỷ đơn, sửa số khách | Cổng cũ + chặn khi có vé đã tính; `coVeDaMo` bỏ vé Tour Đảo | Nút huỷ của đối tác có thể hiện lại trên đơn chỉ có vé Tour Đảo đã mở |

### 2.11 Tên trên giao diện

Theo Hiến chương 5.27, chủ dự án chọn tên, bảng tham chiếu ghi. Khai *chờ chọn* để không chặn việc. Gợi ý: «Quét vé», «Tạo vé», «Vé từng khách», «Vé đoàn», «Bỏ lượt quét». **Tránh «Kiểm vé», «Soát vé»:** «Kiểm vé» đã có nghĩa là kiểm còn chỗ trước khi xác nhận đơn.

### 2.12 Tiêu chí nghiệm thu

1. Đơn nội bộ xác nhận: nhận vé Tour Đảo, gửi được cho khách khi chưa thu đủ. Đơn đối tác cùng tình huống: chưa gửi được.
2. Đơn lẫn hai nguồn chưa thu đủ: tạo đường dẫn, gửi vé không làm vé Vinpearl đổi `revealed_at`, khách chỉ thấy vé Tour Đảo.
3. Hai yêu cầu quét đồng thời cùng một vé: đúng một `DA_TINH`; bên kia nhận «Đã dùng» kèm giờ và người.
4. Tài xế quét vé hợp lệ: thấy hợp lệ, không có `DA_TINH`; Hướng dẫn viên quét sau vẫn tính được.
5. Huỷ đơn có vé đã lộ chưa dùng: quét ra «Vé đã huỷ». Đơn có vé đã tính: huỷ bị chặn, bỏ lượt rồi huỷ được.
6. Vé trong kho chưa cấp, vé Vinpearl, mã lạ: đều đỏ, không có `DA_TINH`, vé Vinpearl và mã lạ cùng một câu.
7. Lệch ngày, chưa thu đủ, vượt số khách: vàng, chưa ghi `DA_TINH` khi chưa bấm; bấm thì ghi kèm cờ.
8. Bán hàng gọi route lô Tour Đảo: 403. Kế toán tạo được lô, không thấy lô Vinpearl.
9. `Permissions-Policy` thật: `/quet-ve` có `camera=(self)`, trang khác `camera=()`; mở camera được trên iPhone thật, và cách chụp ảnh chạy được khi từ chối quyền camera.
10. Bài khoá không lộ mã vé thêm ca cho mọi route mới. Người quét không quyền xem đơn không nhận tên, số điện thoại, giá, mã đơn.
11. Hàng rào mới ghi vào `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật. Người kiểm độc lập đọc mã và chạy lại lệnh, e2e đủ bộ, kịch bản Chrome, thử iPhone thật.

### 2.13 Để người thi công tự quyết

Bố cục màn quét, âm báo, độ phân giải ảnh vé, tần suất đọc khung, chia task, tên cột và hàm, ngưỡng báo thiếu, cách gom số ở màn đối chiếu.

## 3. Nguồn đã tra

Trong kho: `docs/adr/ADR-0153`, `ADR-0156`, `ADR-0157`; nhánh `claude/adr-0170-doi-tac-xem-ve` (ADR-0170, ADR-0171); nhánh `claude/partner-type-ta-oracle-18-efd687` (ADR-0168); `src/modules/ve-dien-tu/`; `src/shared/permissions.ts`; `public/_headers`; mẫu vé của chủ ở `~/Desktop/Ve Vinpearl/`.

Bên ngoài (đọc qua kết quả tìm kiếm; `thuvienphapluat.vn` trả 403 nên chưa đọc được bản gốc):

- Hóa đơn, tem vé: [MISA về Nghị định 70/2025](https://www.meinvoice.vn/tin-tuc/31439/nghi-dinh-70-2025-nd-cp-sua-doi-nghi-dinh-123/), [ihoadon về tem vé có mệnh giá](https://ihoadon.vn/hddt/tem-ve-co-menh-gia-co-phai-chuyen-doi-sang-hoa-don-dien-tu.html), [Hỏi đáp Bộ Tài chính về đặt cọc](https://m-portal.mof.gov.vn/hoidapcstc/home/cthoidap/137654), [Gonnapass về tạm ứng, đặt cọc](https://gonnapass.com/tam-ung-dat-coc-co-phai-lap-hoa-don-khong/), [Công văn 507 Thuế Khánh Hòa, chưa đọc được](https://thuvienphapluat.vn/cong-van/Thue-Phi-Le-Phi/Cong-van-507-KHH-QLDN3-2026-thoi-diem-lap-hoa-don-Khanh-Hoa-696612.aspx).
- Khoản trả trước: [MISA về TK 3387](https://amis.misa.vn/29959/doanh-thu-chua-thuc-hien/), [Hỏi đáp Bộ Tài chính](https://portal.mof.gov.vn/hoidapcstc/home/cthoidap/160518), [TK 131 theo Thông tư 99/2025](https://amis.misa.vn/252681/tai-khoan-131-theo-thong-tu-99/).
- Tách việc: [UC Berkeley](https://cfo.berkeley.edu/node/1962), [UCSD](https://blink.ucsd.edu/finance/cash/handling/critical/index.html). Đây là chính sách của tổ chức, không phải chuẩn kiểm toán.
- Mã QR, chống dùng lại: [pretix về mã vé](https://docs.pretix.eu/en/latest/user/events/ticket_secrets.html), [eventyay](https://docs.eventyay.com/user/events/ticket_secrets.html), [Digittrix](https://www.digittrix.com/event-management-guides/qr-check-in-testing).
- Camera iPhone: [caniuse BarcodeDetector](https://caniuse.com/mdn-api_barcodedetector_barcodedetector), [WebKit 215884](https://bugs.webkit.org/show_bug.cgi?id=215884), [WebKit 185448](https://bugs.webkit.org/show_bug.cgi?id=185448).
- `_headers`: [Workers](https://developers.cloudflare.com/workers/static-assets/headers/), [Pages](https://developers.cloudflare.com/pages/configuration/headers/).
