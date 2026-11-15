# Vé Tour Đảo và quét vé (bản đề xuất, 2026-11-05)

**Trạng thái:** **chủ dự án duyệt 2026-11-05**, nguyên văn: «Duyệt, soạn ADR». Quyết định chính thức ở `docs/adr/ADR-0175-ve-tour-dao-va-quet-ve.md` (chủ duyệt 2026-11-08); chỗ nào khác nhau thì ADR thắng. Đã viết lại theo báo cáo người kiểm lần hai 5/11 (đọc mã, chưa chạy). Chưa có mã. Sau khi ADR được duyệt mới lập kế hoạch. Việc lớn theo `CLAUDE.md` §3 vì chạm dữ liệu, quyền và cổng tiền.

## 1. Trang cho chủ dự án

### Làm gì

Nền tảng tạo được vé mang logo Tour Đảo, có mã QR. Vé nằm trong kho, được cấp cho đơn đã xác nhận, nhân viên gửi cho khách. Tới nơi, nhân viên mở Nền tảng trên điện thoại và quét mã để biết vé đúng hay sai, đã dùng hay chưa. Văn phòng xem được số khách thực tế so với đơn và việc của từng người quét.

Về kỹ thuật, người viết dùng lại kho vé đang chạy thay vì dựng kho thứ hai, vì việc giữ vé, trả vé khi huỷ, gửi Zalo và đường dẫn cho khách đã qua nhiều lần kiểm. Phần mới là tạo vé, quét vé, đối chiếu và vé đoàn.

### Từ dùng trong bản này

| Từ | Nghĩa duy nhất ở đây |
|---|---|
| Vé hãng ngoài | Vé do bên khác phát, ví dụ Vinpearl, nhập vào kho. Máy không thu hồi được: nhân viên đã xem hoặc gửi là mất |
| Vé Tour Đảo | Vé do chính Tour Đảo phát. Máy mình kiểm được, nên huỷ đơn là vé chết ngay |
| Cấp vé | Máy giữ vé trong kho cho một đơn đã xác nhận. Khách chưa nhận được gì |
| Mở vé | Nhân viên tải ảnh vé hoặc tạo đường dẫn để gửi khách (đúng nghĩa nút «Mở vé để gửi khách»). Nhân viên bấm, máy không tự gửi |
| Quét | Đưa camera vào mã. Quét có thể ra ba kết quả: tính đã dùng, chỉ xem (Tài xế), hoặc bị từ chối |
| Vé đã dùng | Vé có một lượt quét được tính đã dùng và chưa bị bỏ. «Chỉ xem» và «bị từ chối» không làm vé thành đã dùng |

### Ba ô riêng, không suy ra nhau (chủ chốt 5/11)

Tour Đảo là một trong nhiều nhà cung cấp. Ba câu hỏi dưới đây độc lập với nhau:

| Ô | Trả lời câu | Nằm ở đâu |
|---|---|---|
| Nhà cung cấp dịch vụ | Ai cung cấp dịch vụ này? | Đã có: màn «Người bán dịch vụ». Bản này không đụng tới, đổi ô này không ảnh hưởng vé |
| Có vé hay không | Dịch vụ này có dùng vé không? | Mới, đặt được cho cả nhóm dịch vụ và từng dịch vụ (chủ chốt 5/11). «Không vé» thì máy không bao giờ báo thiếu vé. Ô này thuộc bản đề xuất ADR-0174 của phiên sửa nhãn «Thiếu vé», bản này chỉ dùng lại |
| Vé do ai phát | Vé của dịch vụ này là vé hãng ngoài hay vé Tour Đảo? | Mới, trên từng dịch vụ có vé, và ghi cố định trên từng lô |

Ví dụ: dịch vụ Tour Đảo cung cấp mà kèm vé Vinpearl thì Có vé, vé hãng ngoài. Dịch vụ của đối tác khác mà Tour Đảo tự in vé thì Có vé, vé Tour Đảo. Thuê xe thì Không vé. Mọi luật mở vé, quét và huỷ chỉ xét «vé do ai phát», không xét nhà cung cấp.

### Một vé đi qua những bước nào

| Bước | Việc thật | Về sổ sách (chờ kế toán xác nhận) | Ai làm |
|---|---|---|---|
| Tạo vé vào kho | Vé trắng, chưa có khách, chưa có tiền | Chưa có gì để ghi | Toàn quyền, Kế toán, Quản lý bán hàng, Quản trị |
| Cấp vé cho đơn đã xác nhận | Công ty cam kết phục vụ. Vé chưa quét được | Khách đã trả thì là khoản trả trước, chưa phải doanh thu | Máy tự làm khi đơn được xác nhận |
| Mở vé, gửi khách | Khách cầm vé. Từ lúc này vé mới quét được | Không đổi | Người có quyền gửi vé trên đơn đó |
| Quét, tính đã dùng | Công ty đã thực hiện cam kết | Căn cứ để ghi doanh thu | Hướng dẫn viên, Bán hàng, Quản lý bán hàng, Kế toán, Quản trị, Toàn quyền |
| Đối chiếu | So số vé tạo, cấp, đã dùng với tiền | Hỗ trợ kế toán, Nền tảng không tự ghi sổ | Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng |

### Khi huỷ đơn (chủ chốt 5/11)

| Tình huống của vé Tour Đảo | Huỷ đơn được không | Sau khi huỷ |
|---|---|---|
| Đã cấp, chưa mở | Được | Vé về kho |
| Đã mở hoặc đã gửi khách, chưa quét | Được | Vé chết ngay, quét ra đỏ |
| Tài xế đã quét nhưng chỉ xem | Được | Vé chết ngay, quét ra đỏ |
| Vé đã dùng | **Không được** | Muốn huỷ thì phải bỏ lượt quét trước, có ghi lý do |

Vé hãng ngoài giữ nguyên luật hiện hành. Đối tác vẫn không tự huỷ được đơn theo luật đối tác.

### Điều bạn cần biết khi duyệt

Bốn vai tạo vé và Kế toán được quét là lựa chọn của bạn, và người viết nói một lần về hệ quả. Người tạo vé nhìn thấy mã vé, nên có thể giữ lại ảnh. Vé trong kho chưa cấp thì quét ra đỏ nên vô hại, nhưng khi vé đó đã được cấp và mở cho một đơn, người giữ ảnh có thể đem dùng hoặc quét trước khách. Quản lý bán hàng, Kế toán, Quản trị đều có thể một mình tạo, quét và đối chiếu, nên máy không tách được người. Biện pháp bù là mọi lượt quét và bỏ lượt đều ghi tên, và hiện ở màn theo dõi người quét; không có biện pháp nào chặn hẳn.

Bản này được xây trong lúc hai rủi ro cũ chưa xong: chưa diễn tập khôi phục dữ liệu, và đơn đã huỷ mà còn tiền. Duyệt bản này nghĩa là bạn đồng ý xây trong lúc đó, và chỉ phát hành sau khi diễn tập xong.

### Chủ dự án đã chọn (5/11)

| Câu | Chọn |
|---|---|
| Dạng vé | Có cả hai: mỗi khách một mã và cả đoàn một mã. Làm vé từng khách trước |
| Ai quét | Hướng dẫn viên, Tài xế công ty, Bán hàng, Quản lý bán hàng, Kế toán, Quản trị, Toàn quyền. Thực tập, Nhân sự, Tài xế đối tác, Đối tác không quét |
| Tài xế công ty | Chỉ xem vé đúng hay sai, không tính đã dùng |
| Mạng | Bản cần có mạng trước |
| Vé Tour Đảo được mở từ lúc nào | Từ lúc đơn được xác nhận, kể cả khi chưa thu đủ (vé hãng ngoài thì khác) |
| Đơn đối tác lập | Theo luật đối tác đã duyệt, không được mở ngay lúc xác nhận |
| Đơn nhân viên lập mà bên đặt là đại lý | Thu đủ mới được mở, trừ đơn Trả sau trong hạn mức |
| Số đếm dùng để | Chặn dùng lại, so khách thực tế với đơn, theo dõi việc người quét. **Không** tính tiền, hoa hồng |
| Khách đến lệch ngày | Cảnh báo, người quét quyết, máy ghi lại |
| Kho hết vé | Báo thiếu, người có quyền tạo thêm; đơn vẫn xác nhận được |
| Chọn vé đoàn | Nhân viên chọn trên từng đơn; mặc định vé từng khách |
| Giá trên vé | Không ghi giá; biên nhận vẫn là chứng từ tiền |
| Ai đặt ô «Vé do ai phát» | Quản trị, Toàn quyền. Ai đặt ô «Có vé» do ADR-0174 quyết |
| Đơn Trả sau trong hạn mức khi quét | Không báo «chưa thu đủ», quét xanh; quá hạn còn nợ thì báo vàng |
| Tiếng Anh trên vé | In thêm: tiếng Việt là chính, tiếng Anh nhỏ hơn bên dưới. Chỉ áp cho tấm vé gửi khách; giao diện vẫn không có chữ Anh |
| Nhà cung cấp và giá mua theo lô | Không làm ở đây, thuộc phân hệ kế toán làm về sau |

### Người viết tự chọn, bạn sửa được khi duyệt

1. **Giảm số khách:** không giảm xuống dưới số vé đã dùng, trừ khi bỏ lượt quét trước. Cùng lý do với chặn huỷ, nhưng bạn chưa nói tới.
2. **Đổi ô «Vé do ai phát»:** chỉ áp cho đơn xác nhận sau lúc đổi; đơn cũ giữ nguyên vé đang có. Với ô «Có vé», câu này đang chờ bạn quyết trong ADR-0174.
3. **Bỏ lượt quét:** người quét tự bỏ được trong 5 phút; sau đó chỉ Quản trị, Toàn quyền. Luôn phải ghi lý do, và lượt bỏ hiện ở màn theo dõi người quét.
4. **Đơn đổi ngày đi:** vé từng khách không in ngày đi nên không phải vẽ lại; máy so với ngày đi mới nhất khi quét.
5. **Báo thiếu vé:** áp cho cả hai loại vé. Vé Tour Đảo báo người được tạo vé; vé hãng ngoài báo người quản lý kho.
6. **Tạo nhầm lô:** người được tạo vé huỷ được lô Tour Đảo chưa từng cấp cho đơn nào.
7. **Tên tiếng Anh của dịch vụ:** danh mục chưa có, nên màn tạo vé có ô không bắt buộc; để trống thì dòng này chỉ in tiếng Việt. Máy không tự dịch.

### Cần hỏi kế toán, người viết chưa kiểm

Bốn câu dưới đây dựa trên trang tổng hợp, chưa đọc được văn bản gốc. Tên văn bản để hỏi nằm ở mục 2.14.

1. Vé không ghi giá, có dòng «không phải hóa đơn», có bị coi là loại vé phải theo quy định về hóa đơn không?
2. Tiền cọc tour có phải lập hóa đơn ngay lúc thu không?
3. Khoản khách trả trước ghi vào đâu trong sổ kế toán?
4. Vé hết hạn mà khách chưa dùng thì khoản đã trả xử lý thế nào? Bản này chỉ báo số, không tự đổi tiền.

### Thứ tự làm

Tất cả làm **sau khi** phần đối tác xem vé nhập vào bản chính, vì phần đó viết lại đúng chỗ quyết định mở vé, và sau khi ô «Có vé» (ADR-0174, chủ duyệt cách (a) 5/11, chưa nhập bản chính) đã có. Phát hành sau diễn tập khôi phục và sau khi kế toán trả lời câu 1; thi công không phải chờ câu đó (lựa chọn của người viết).

- **Bước 0:** thử camera trên iPhone thật (khoảng một giờ, chủ dự án cầm máy). Hỏng thì đổi cách quét trước khi làm tiếp.
- **Đợt 1:** ô «Vé do ai phát», tạo vé vào kho, cho phép mở vé từ lúc xác nhận, gửi khách, báo thiếu.
- **Đợt 2:** màn quét, số vé đã dùng trên đơn, đối chiếu.
- **Đợt 3:** vé đoàn.

## 2. Phần cho người thi công

**Xây trên lỗ đang hở:** `HC-5.19` (chưa diễn tập khôi phục), `TNV-G1` (đơn huỷ còn tiền; vé chạm đường huỷ đơn). Cần chủ thêm dòng `xay_tren_cho_phep` khi duyệt. Không chạm `HC-4.2`, `HC-5.11`.

Trong phần này, «lộ» nghĩa là `revealed_at` có giá trị, tức vé đã mở; «`DA_TINH`» là lượt làm vé thành đã dùng.

### 2.1 Không làm và điều không được xảy ra

**Không làm:** quét khi mất mạng; đối tác, tài xế đối tác hoặc nhân viên của bên cung cấp dịch vụ quét; tính tiền hay hoa hồng theo số quét; tự đổi số khách, trạng thái đơn hay «Xong và đủ tiền» theo số quét; bán vé ngoài đơn; quét vé Vinpearl; mã QR đổi theo thời gian; nối với nút lên xe của Tài xế (`PASSENGER_BOARDED`); đọc `prc_supply_term` trong luật vé, vì nhà cung cấp độc lập với vé.

**Không được xảy ra:** một vé từng khách được tính hai lần; vé Vinpearl lộ sớm vì luật mở vé Tour Đảo; quét làm hỏng xác nhận đơn; mã vé lọt vào nhật ký, URL, phản hồi lệnh ghi hay câu lỗi; lộ tên khách, số điện thoại, giá cho người quét không có quyền xem đơn; mở `camera` cho trang khác `/quet-ve`.

### 2.2 Dữ liệu (dùng lại module `ve-dien-tu`)

- `vdt_batch` thêm `source` (`HANG_NGOAI`, `TOUR_DAO`; tên giá trị không được gợi «nhà cung cấp»), mặc định `HANG_NGOAI`, không đổi sau khi tạo. Đây là «vé do ai phát» của từng lô, và mọi luật mở vé, quét, huỷ, quyền đều đọc từ đây.
- Ô «Có vé»: theo ADR-0174 (đề xuất, nhánh `claude/interesting-hodgkin-cde2fd`, chưa duyệt), đặt được ở nhóm và từng dịch vụ; khai riêng ở dịch vụ thắng khai ở nhóm là khuyến nghị của phiên đó, chủ chưa nói riêng. Bản này không định nghĩa lại ô đó.
- Trên từng dịch vụ (thuộc `catalog`, có ngày hiệu lực như các đặc điểm dịch vụ khác; hình dạng do kế hoạch quyết): ô «Vé do ai phát» (`HANG_NGOAI`, `TOUR_DAO`), chỉ có nghĩa khi có vé. Đơn phải giữ được giá trị «Vé do ai phát» tại lúc xác nhận, nên đổi ô không làm đơn cũ đổi nghĩa; chỗ lưu do kế hoạch quyết, theo luật ranh giới module.
- Vé Tour Đảo vẫn là dòng `vdt_ticket` đủ `storage_key`, `content_hash`, `byte_size`: không phải dựng lại bảng, nên đường dẫn khách và gửi vé chạy nguyên.
- Bảng mới `vdt_scan`, chỉ thêm: vé, phân bổ, đơn, dòng dịch vụ, `ket_qua` (`DA_TINH`, `CHI_XEM`, `TU_CHOI`), lý do, số khách, cờ đã xác nhận lệch ngày / chưa thu đủ / vượt số khách, giờ và người quét, giờ / người / lý do bỏ lượt (ghi một lần). «Đã dùng» suy ra từ bảng này, không thêm trạng thái vào `vdt_ticket`.
- Chặn trùng ở CSDL: chỉ mục duy nhất một phần cho vé từng khách trên lượt `DA_TINH` chưa bị bỏ, và phải chừa đường cho vé đoàn (nhiều lượt trên một vé).
- Số migration và số ADR tạm: migration ≥ `0142` (`0141` thuộc nhánh Trả sau), ADR ≥ `0175` (`0172`, `0173` thuộc nhánh ADR-0170, `0174` là ô «Có vé» của phiên sửa nhãn). Kiểm lại mọi nhánh trước khi đặt. Cột mới cập nhật `docs/data-dictionary.json` kèm hạng dữ liệu.

### 2.3 Tạo vé

- Người có ô `ve.phat-hanh` chọn dịch vụ, loại khách (`ALL` được), khoảng ngày, số lượng. Trần số vé mỗi lô dùng chung `vdt_setting`.
- Người tạo vé thấy mã trên ảnh và biết mã trước khi vé vào kho; máy chủ chỉ kiểm dạng chuỗi. Rủi ro này đã nói với chủ ở phần 1.
- **Mã vé:** `TD1.` + 26 ký tự base32 (130 bit) do trình duyệt sinh bằng `crypto.getRandomValues`, gửi kèm ảnh qua đường `POST /api/ve/lo/:id/ve` hiện có. Lý do: ADR-0153 Đ1 mục 5 cấm mã vé trong phản hồi lệnh ghi, nên máy chủ không trả mã về được. Người tạo vốn thấy mã trên ảnh, nên trình duyệt sinh mã không thêm rủi ro. Đây là mã bí mật như `ticket_code` hiện nay; mã bản ghi vẫn là `vdt_ticket.id`, nên không thuộc Hiến chương 5.26.
- Máy chủ kiểm: lô `TOUR_DAO` chỉ nhận đúng dạng trên; lô `HANG_NGOAI` từ chối tiền tố `TD1.`.
- **Ảnh vé** vẽ bằng canvas trên trình duyệt người tạo, dùng lại `veMaQr` và cách nạp phông của `web/qr-ve.ts`, `web/confirmation-image.ts`. Vẽ xong tự đọc lại QR bằng `web/qr-doc-ve.ts`; đọc không ra hoặc lệch mã thì không gửi. Máy chủ không đọc lại QR, như ADR-0156. Kết quả quét luôn lấy từ máy chủ, nên ảnh sai chữ không làm sai việc kiểm.
- **Nội dung vé:** logo, tên công ty và Hotline (qua `ownerCompany`), «VÉ DỊCH VỤ», tên dịch vụ, loại khách, hạn cuối kèm chữ «dùng vào ngày đi đã đặt», QR đen trên nền trắng, 4 ký tự cuối của mã, «Mỗi vé dùng một lần», «Không phải hóa đơn». **Không** giá, tên khách, số điện thoại, mã đơn. Bố cục dọc như vé Vinpearl mẫu.
- **Hai thứ tiếng:** mọi dòng cố định có tiếng Anh nhỏ hơn bên dưới. Danh mục hiện không có tên dịch vụ tiếng Anh (đã tra `catalog`, migration, từ điển dữ liệu), nên lựa chọn của người viết là: màn tạo vé có ô tuỳ chọn «Tên tiếng Anh»; để trống thì dòng tên dịch vụ chỉ in tiếng Việt. Không tự dịch bằng máy. Chỗ lưu ô này do kế hoạch quyết.
- **Hai ô** («Vé do ai phát» do Quản trị, Toàn quyền đặt): «Không vé» thì không giữ vé, không báo thiếu; «Có vé» thì chỉ giữ vé từ lô đúng «Vé do ai phát». Không chặn đổi theo trạng thái lô, vì lô từng được cấp không bao giờ thành `VOID` (`BO_LO`), nên chặn kiểu đó khiến dịch vụ không đổi được loại vé.
- **«Thiếu vé» theo ô «Có vé», ở cả hai loại vé:** `SERVICE_CHO_VE` (`orders/chang-hanh-khach-repo.ts`) và `GET /api/ve/don/:orderId` hiện tính thiếu cho mọi dòng có mã danh mục và ngày đi, kể cả đơn huỷ (phiên sửa nhãn đã tái hiện trên dữ liệu thử). Báo thiếu, «Đã dùng x/y» và đối chiếu không được thừa hưởng cách tính đó, và đơn huỷ không tính.
- Mười route kho đang chỉ hỏi `ve.kho.manage`: `GET /kho`, `GET`/`POST /lo`, ba route lô đã huỷ, `/ve`, `/xac-nhan`, `/bo`, `/sua-ma-tour`. Route theo lô phải hỏi ô theo `source`; route danh sách phải lọc theo `source`, vì Kế toán đang là `none` và câu đọc chưa có nguồn. Không sửa thì Bán hàng thường thao tác được lô Tour Đảo. Lô Tour Đảo chưa từng cấp cho đơn nào thì người giữ `ve.phat-hanh` huỷ được.
- Sau khi lô vào kho, máy cấp bù cho các đơn đã xác nhận còn thiếu, ngày đi gần trước. Thiếu vé Tour Đảo thì báo người giữ `ve.phat-hanh`, thiếu vé hãng ngoài thì báo người giữ `ve.kho.manage`, qua `thongbao`. Cả hai việc này hiện chưa có, ghi ở `docs/SYSTEM-DESIGN.md` mục kho vé.

### 2.4 Mở vé

- Hàm duy nhất `veMoDuoc` (ADR-0168) hôm nay chỉ nhận tiền và một cờ, không biết vé do ai phát, trạng thái đơn hay đối tác; `/giao` và `/duong-dan` gọi một lần cho cả yêu cầu. Việc này là đổi chữ ký hàm và các điểm gọi, không phải thêm một nhánh. Luật mới: vé `TOUR_DAO` của đơn đã xác nhận thì mở được; nếu đơn thuộc **diện đối tác** thì đi luật như vé thường (đơn người giữ quyền Đối tác lập theo ADR-0170 Đ2; đơn nhân viên lập mà bên đặt là đối tác thì thu đủ mới mở, trừ Trả sau trong hạn mức). Nhận biết bên đặt là đối tác bằng cờ `bookerLaDoiTac` (vai được hưởng hoa hồng), cần hàm do gốc lắp ráp tiêm vì module vé không đọc `orders`. Đơn huỷ thì không mở.
- Việc quyết định phải **theo từng vé**, không theo đơn. Đơn có cả vé Vinpearl và vé Tour Đảo: chỉ vé Tour Đảo mở.
- **Bẫy lớn nhất:** `POST /api/ve/duong-dan`, `/giao`, `/api/ve/anh`, `veXem` ở `GET /api/ve/don`, và ảnh trang khách quyết theo đơn, rồi lặp `cauDanhDauLo` trên từng vé (nhánh ADR-0171 đã lọc một phần theo `revealed_at`). Tạo đường dẫn lúc chưa thu đủ mà không lọc thì vé Vinpearl bị đóng dấu đã lộ và không về kho được. Phải có bài đỏ trước, xanh sau cho đơn có cả hai loại vé.
- **Đã bị ADR-0175 Đ2 mục 6 thay:** chỉ ADR-0168 Đ3 mục 3 bỏ vé Tour Đảo; ADR-0170 Đ3 và ADR-0171 Đ1 **vẫn tính** vé Tour Đảo đã mở, nên đối tác vẫn không tự huỷ, không sửa số khách. Câu gốc giữ dưới đây để đối chiếu, đừng thi công theo nó. ~~Vé `TOUR_DAO` đã mở **không tính** vào luật chặn huỷ, chặn sửa số khách của ADR-0168 Đ3 mục 3, ADR-0170 Đ3, ADR-0171 Đ1, vì luật đó bảo vệ vé không lấy lại được. Phải sửa hai câu thật là `veDaMoCuaDon` và `cauChanVeDaMo` (nối `vdt_batch` để biết nguồn); `coVeDaMo` chỉ là cờ giao diện. Thay vào đó là chặn theo vé đã dùng (2.5).~~
- Huỷ đơn: vé đã lộ thành `VOID` như hiện nay, nên quét ra đỏ. Giảm số khách: giữ cách hiện tại, trả vé chưa lộ trước; vé đã lộ còn thừa bắt ở bước quét bằng cảnh báo vượt số khách.

### 2.5 Quét

Một route `POST /api/ve/quet`, access `staff` (cổng `office` không có Hướng dẫn viên, Tài xế), kiểm Origin, có mã lần gửi theo ADR-0094, khai `GHI_NHIEU_LAN` nếu e2e H5 đòi. Mã ở thân yêu cầu, không ở URL. Thân gồm mã, các cờ đã xác nhận, số khách (vé đoàn).

Thứ tự kiểm ở máy chủ, một mốc giờ cho cả yêu cầu:

| Kiểm | Kết quả cho người quét |
|---|---|
| Quyền | 403 |
| Mã lạ, hoặc vé `HANG_NGOAI` | Đỏ, cùng một câu: «Không phải vé Tour Đảo» (không để dò mã Vinpearl) |
| Vé `VOID`, đơn huỷ | Đỏ: «Vé đã huỷ» |
| Chưa cấp cho đơn, chưa lộ (`revealed_at` trống) | Đỏ: «Vé chưa được giao cho khách, báo văn phòng» |
| Hôm nay ngoài `valid_from`..`valid_to` | Đỏ: «Vé hết hạn» hoặc «Chưa tới ngày dùng» |
| Đã có lượt `DA_TINH` chưa bỏ | Đỏ: «Đã dùng lúc … bởi …» |
| Lệch ngày đi, chưa thu đủ, số lượt đạt số khách hiệu lực | Vàng, cần bấm xác nhận; gửi lại kèm cờ |
| Còn lại | Xanh; tính đã dùng ngay, không cần bấm |

- Yêu cầu `revealed_at` không trống bảo đảm vé đã tính không bao giờ về kho. Lô ghi gồm: câu chèn có gác, nhật ký `changes() > 0`; thua cạnh tranh thì đọc lại và trả câu «Đã dùng». Hai máy cùng quét chỉ một bên thắng.
- **Tài xế** (`ve.quet.xem`): chạy đủ các kiểm, ghi `CHI_XEM`, không bao giờ `DA_TINH`, câu nói rõ «chưa tính đã dùng». Lượt `TU_CHOI` có vé thật cũng ghi để phát hiện dùng lại; mã lạ không ghi.
- **Chưa thu đủ:** đơn Trả sau trong hạn mức không báo vàng (dùng cùng kết quả với `moVeDuoc`, không dùng `thuDu`); quá hạn còn nợ thì báo vàng. Chỉ người có `money.view` trên đơn đó mới thấy số tiền; người khác thấy «Đơn chưa thu đủ, báo văn phòng trước khi thu khách». Câu này tránh cảnh khách đã trả đại lý mà bị đòi tiền ở bến.
- **Dữ liệu trả về:** tên dịch vụ, loại khách, ngày đi, số khách vé đoàn, 4 ký tự cuối của mã. Mã đơn chỉ hiện khi có `order.view` trên đơn. Không tên, số điện thoại, giá. Quét không mở quyền xem đơn cho Hướng dẫn viên.
- **Bỏ lượt quét:** người quét trong 5 phút, hoặc Quản trị, Toàn quyền bất kỳ lúc nào; bắt buộc lý do; ghi nhật ký; hiện ở màn theo dõi người quét. Vé trở lại chưa dùng.
- **Đơn có vé đã dùng** (chủ chốt 5/11, khách đổi ý khi vé chưa quét thì huỷ được): chặn huỷ ở mọi đường huỷ và rút xác nhận. Chỉ lượt `DA_TINH` chưa bị bỏ mới chặn; `CHI_XEM`, `TU_CHOI` thì không. Chặn sửa số khách xuống dưới số vé đã dùng là lựa chọn của người viết (phần 1).
- **Ngày đi:** so với ngày đi hiện hành của dòng dịch vụ tại lúc quét.

### 2.6 Camera và trang quét

- Trang `/quet-ve` (`public/quet-ve.html`, `web/quet-ve.ts`), khai `PAGES`, `PRECACHE`, `build:web`, mục menu.
- `public/_headers` đang đặt `camera=()` cho `/*`. Thêm khối riêng cho `/quet-ve`: dòng `! Permissions-Policy`, rồi đặt lại với `camera=(self)`. Tài liệu Workers xác nhận cú pháp `!`; **chưa kiểm** việc tháo và đặt lại cùng một khối, phải đọc đầu phản hồi thật trên `wrangler dev`. Thêm bài khoá: `/*` vẫn `camera=()`, chỉ một đường mở, và bài `src/chi-duong-tinh.test.ts` vẫn giữ `geolocation=()`.
- Hai cách quét: (a) video trực tiếp bằng `getUserMedia`, đọc khung bằng jsQR; (b) nút chụp ảnh `<input type="file" accept="image/*" capture="environment">`, đọc bằng `docQrTuTep` hiện có. Cách (b) là đường dự phòng phải luôn có. iPhone không có `BarcodeDetector` bật sẵn, nên không dựa vào nó.
- `src/vendor-jsqr.test.ts` chỉ cho `web/qr-doc-ve.ts` import jsQR: thêm hàm đọc khung vào tệp đó, không tạo nơi import thứ hai. jsQR nặng khoảng 257 KB, nên chỉ gói vào trang này và trang kho.
- **Bước 0:** báo lỗi WebKit cũ cho thấy ứng dụng cài lên màn hình iPhone có thể hỏi lại quyền camera; **chưa kiểm trên iOS hiện tại**. Camera cần HTTPS, nên thử bằng `node scripts/dev-iphone.mjs --tunnel`, không dùng địa chỉ LAN thường.
- Giao diện: kết quả chiếm cả màn, ba màu kèm chữ rõ (không chỉ dựa vào màu), cỡ chữ lớn; bộ đệm chống đọc lặp cùng mã trong vài giây ở trình duyệt.

### 2.7 Đối chiếu

- Khối «Vé điện tử» trên đơn: «Đã dùng x/y» theo dịch vụ.
- Màn đối chiếu theo ngày: dịch vụ, số khách theo đơn, số vé đã dùng, chênh lệch. Chỉ báo, không tự sửa.
- Theo người quét: số lượt tính, xem, bị từ chối theo ngày.
- Sổ vé Tour Đảo: đã tạo = trong kho + đã cấp chưa mở + đã mở chưa dùng + đã dùng + đã huỷ. Mỗi vé thuộc đúng một ô; vé đã mở rồi chết vì huỷ đơn thuộc «đã huỷ». Số cam kết còn phải phục vụ = đã cấp chưa mở + đã mở chưa dùng. Thêm bất biến `R-VDT-*` kiểm các đẳng thức này và kiểm `DA_TINH` chỉ trên vé `TOUR_DAO` đã lộ.

### 2.8 Vé đoàn (đợt 3)

- Trên đơn đã xác nhận, người giữ `ve.cap.send` chọn chuyển một dòng dịch vụ sang vé đoàn. Vé từng khách chưa lộ về kho; vé đã lộ thành `VOID`, máy hỏi lại vì khách có thể đang giữ.
- Một mã cho cả dòng dịch vụ; số khách không gồm em bé, như vé từng khách. Ảnh in tên đoàn và số khách, không số điện thoại. Vé đoàn gắn ngay vào đơn nên không qua `ve.phat-hanh`, nhưng có trong sổ vé.
- Quét: nhập số người vào; quét được nhiều đợt; tổng không vượt số khách hiệu lực. Đủ thì đỏ «Đã đủ 12/12». Tài xế chỉ thấy số, không tính.
- Sửa số khách: mã giữ nguyên, máy theo số mới, ảnh cũ hiện nhãn «cần vẽ lại».
- Tên đoàn là dữ liệu cá nhân khi là tên người: người soạn đợt 3 phải xếp hạng dữ liệu và rà luật hiện tên khách cho Tài xế (chỉ trong ngày chạy). Hình dạng bảng do kế hoạch đợt 3 quyết.

### 2.9 Quyền (bốn ô mới, không thêm mã quyền)

| Ô | Được |
|---|---|
| `ve.phat-hanh` (tạo vé, lô Tour Đảo) | Toàn quyền, Kế toán, Quản lý bán hàng, Quản trị, phạm vi `any` (chủ chốt 5/11). Cột `SALES` là `none`, dù `SALES` đang có `ve.kho.manage`: quyền phải nằm ở cột `SALES_MANAGER`. Người thi công kiểm lại cổng route theo ADR-0169 Đ4, vì tài khoản bị bớt tay `SALES` không vào được cổng `office` |
| `ve.quet.tinh` (tính đã dùng) | Hướng dẫn viên, Bán hàng, Quản lý bán hàng, Kế toán, Quản trị, Toàn quyền, phạm vi `any` (chủ chốt Kế toán được quét 5/11) |
| `ve.quet.xem` (chỉ xem) | Tài xế công ty và mọi người giữ `ve.quet.tinh` |
| `ve.doi-chieu.view` | Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng |

Tài xế đối tác không có ô quét nào. Kế toán xem và quét được vé Tour Đảo, không thao tác lô hãng ngoài. Thực tập, Nhân sự không có ô quét. `ve.kho.manage` giữ nguyên; `web/ve-kho` hiện với `ve.kho.manage` hoặc `ve.phat-hanh`, và Kế toán chỉ thấy lô Tour Đảo. Mỗi ô sửa bài ghim hàng ở `permissions.test.ts`. Màn doanh thu cần ô riêng vì có tiền, do đợt làm màn đó quyết.

### 2.10 Bảng tóm tắt để lập trang ghép (`CLAUDE.md` §9)

Bảng dùng chung `vdt_batch`, `vdt_ticket` nhận thêm vé Tour Đảo, nên phải có trang ghép khi trình ADR. Trang ghép phải nói rõ ba ô độc lập. Tối đa ba quyết định một lượt: (1) ô «Vé do ai phát» và ô tạo vé, (2) mở vé khi xác nhận kèm ngoại lệ ở ADR-0153, 0168, 0170, 0171, (3) quét vé, camera, ô quét, chặn huỷ khi đã dùng. Vé đoàn là lượt sau.

| Cửa | Cổng máy chủ | Giao diện đổi nghĩa |
|---|---|---|
| Tạo vé, thao tác lô Tour Đảo | `ve.phat-hanh` theo `source` của lô | Mục «Kho vé» hiện cho Kế toán; Bán hàng thường thấy số nhưng không nút tạo; Quản lý bán hàng, Quản trị có nút tạo |
| Xem ảnh, gửi, đường dẫn vé Tour Đảo | `ve.cap.send` + hàm mở vé theo từng vé | Khối vé trên đơn hiện nút trước khi thu đủ cho riêng vé Tour Đảo |
| Trang khách `/ve/:token` | Mã đường dẫn + hàm mở vé theo từng vé | Khách có thể thấy vé Tour Đảo mà chưa thấy vé Vinpearl cùng đơn |
| Quét | `ve.quet.tinh` hoặc `ve.quet.xem` | Mục mới «Quét vé» cho Hướng dẫn viên, Tài xế công ty, Kế toán và văn phòng |
| Đối chiếu | `ve.doi-chieu.view` | Màn mới |
| Huỷ đơn, sửa số khách | Cổng cũ + chặn khi có vé đã dùng; `veDaMoCuaDon`, `cauChanVeDaMo` bỏ vé Tour Đảo | ~~Nút huỷ của đối tác có thể hiện lại trên đơn chỉ có vé Tour Đảo đã mở~~ Đã bị ADR-0175 Đ2 mục 6 thay: nút huỷ của đối tác vẫn ẩn khi đơn có vé đã mở, kể cả vé Tour Đảo |

### 2.11 Tên trên giao diện

Theo Hiến chương 5.27, chủ dự án chọn tên, bảng tham chiếu ghi. Khai *chờ chọn* để không chặn việc. Gợi ý: «Quét vé», «Tạo vé», «Vé từng khách», «Vé đoàn», «Bỏ lượt quét». **Tránh «Kiểm vé», «Soát vé»:** «Kiểm vé» đã có nghĩa là kiểm còn chỗ trước khi xác nhận đơn.

### 2.12 Tiêu chí nghiệm thu

1. Đơn nội bộ xác nhận: nhận vé Tour Đảo, gửi được cho khách khi chưa thu đủ. Đơn đối tác cùng tình huống: chưa gửi được.
2. Đơn có cả hai loại vé, chưa thu đủ: tạo đường dẫn, gửi vé không làm vé Vinpearl đổi `revealed_at`, khách chỉ thấy vé Tour Đảo.
3. Hai yêu cầu quét đồng thời cùng một vé: đúng một `DA_TINH`; bên kia nhận «Đã dùng» kèm giờ và người.
4. Tài xế quét vé hợp lệ: thấy hợp lệ, không có `DA_TINH`; Hướng dẫn viên quét sau vẫn tính được.
5. Huỷ đơn có vé đã mở chưa dùng: huỷ được, quét ra «Vé đã huỷ». Đơn có lượt `CHI_XEM`: huỷ được. Đơn có vé đã dùng: huỷ bị chặn, bỏ lượt rồi huỷ được.
6. Vé trong kho chưa cấp, vé Vinpearl, mã lạ: đều đỏ, không có `DA_TINH`, vé Vinpearl và mã lạ cùng một câu.
7. Lệch ngày, chưa thu đủ, vượt số khách: vàng, chưa ghi `DA_TINH` khi chưa bấm; bấm thì ghi kèm cờ.
8. Bán hàng thường gọi route lô Tour Đảo: 403 (Bán hàng thường không có `ve.phat-hanh`). Toàn quyền, Quản trị, Quản lý bán hàng tạo được lô. Kế toán tạo được lô, không thấy lô Vinpearl ở mọi route danh sách. Dịch vụ «Không vé» và đơn huỷ không bị báo thiếu ở cả hai loại vé. Dịch vụ do Tour Đảo cung cấp mà «vé hãng ngoài» chỉ giữ lô hãng ngoài. Dịch vụ của bên khác mà «vé Tour Đảo» chỉ giữ lô Tour Đảo. Đổi người bán dịch vụ không làm đổi vé hay luật vé. Đổi ô «Vé do ai phát» không làm đơn đã xác nhận đổi nghĩa.
9. `Permissions-Policy` thật: `/quet-ve` có `camera=(self)`, trang khác `camera=()`; mở camera được trên iPhone thật, và cách chụp ảnh chạy được khi từ chối quyền camera.
10. Bài khoá không lộ mã vé thêm ca cho mọi route mới. Người quét không quyền xem đơn không nhận tên, số điện thoại, giá, mã đơn.
11. Hàng rào mới ghi vào `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật. Người kiểm độc lập đọc mã và chạy lại lệnh, e2e đủ bộ, kịch bản Chrome, thử iPhone thật.

### 2.13 Để người thi công tự quyết

Bố cục màn quét, âm báo, độ phân giải ảnh vé, tần suất đọc khung, chia task, tên cột và hàm, ngưỡng báo thiếu, cách gom số ở màn đối chiếu.

### 2.14 Văn bản để hỏi kế toán

Chưa đọc được bản gốc vì `thuvienphapluat.vn` chặn máy đọc, và các nguồn nói khác nhau về văn bản năm 2026.

1. «Tem, vé, thẻ» theo Điều 8 khoản 5 Nghị định 123/2020.
2. Điều 9 khoản 2 chỉ miễn cọc cho một số dịch vụ không gồm du lịch; có nguồn nói Nghị định 254/2026 đổi phạm vi từ 1/7/2026; Thuế Khánh Hòa có công văn 507/KHH-QLDN3 năm 2026 về tiền đặt cọc.
3. Hỏi đáp của Bộ Tài chính phân biệt theo một kỳ (TK 131) hay nhiều kỳ (TK 3387).

## 3. Nguồn đã tra

Trong kho: `docs/adr/ADR-0153`, `ADR-0156`, `ADR-0157`; `docs/adr/ADR-0168`; nhánh `claude/adr-0170-doi-tac-xem-ve` (ADR-0170, ADR-0171); `migrations/0090*`, `prc_supply_term`; `src/modules/ve-dien-tu/`; `src/shared/permissions.ts`; `public/_headers`; mẫu vé của chủ ở `~/Desktop/Ve Vinpearl/`.

Bên ngoài (đọc qua kết quả tìm kiếm; `thuvienphapluat.vn` trả 403 nên chưa đọc được bản gốc):

- Hóa đơn, tem vé: [MISA về Nghị định 70/2025](https://www.meinvoice.vn/tin-tuc/31439/nghi-dinh-70-2025-nd-cp-sua-doi-nghi-dinh-123/), [ihoadon về tem vé có mệnh giá](https://ihoadon.vn/hddt/tem-ve-co-menh-gia-co-phai-chuyen-doi-sang-hoa-don-dien-tu.html), [Hỏi đáp Bộ Tài chính về đặt cọc](https://m-portal.mof.gov.vn/hoidapcstc/home/cthoidap/137654), [Gonnapass về tạm ứng, đặt cọc](https://gonnapass.com/tam-ung-dat-coc-co-phai-lap-hoa-don-khong/), [Công văn 507 Thuế Khánh Hòa, chưa đọc được](https://thuvienphapluat.vn/cong-van/Thue-Phi-Le-Phi/Cong-van-507-KHH-QLDN3-2026-thoi-diem-lap-hoa-don-Khanh-Hoa-696612.aspx).
- Khoản trả trước: [MISA về TK 3387](https://amis.misa.vn/29959/doanh-thu-chua-thuc-hien/), [Hỏi đáp Bộ Tài chính](https://portal.mof.gov.vn/hoidapcstc/home/cthoidap/160518), [TK 131 theo Thông tư 99/2025](https://amis.misa.vn/252681/tai-khoan-131-theo-thong-tu-99/).
- Tách việc: [UC Berkeley](https://cfo.berkeley.edu/node/1962), [UCSD](https://blink.ucsd.edu/finance/cash/handling/critical/index.html). Đây là chính sách của tổ chức, không phải chuẩn kiểm toán.
- Mã QR, chống dùng lại: [pretix về mã vé](https://docs.pretix.eu/en/latest/user/events/ticket_secrets.html), [eventyay](https://docs.eventyay.com/user/events/ticket_secrets.html), [Digittrix](https://www.digittrix.com/event-management-guides/qr-check-in-testing).
- Camera iPhone: [caniuse BarcodeDetector](https://caniuse.com/mdn-api_barcodedetector_barcodedetector), [WebKit 215884](https://bugs.webkit.org/show_bug.cgi?id=215884), [WebKit 185448](https://bugs.webkit.org/show_bug.cgi?id=185448).
- `_headers`: [Workers](https://developers.cloudflare.com/workers/static-assets/headers/), [Pages](https://developers.cloudflare.com/pages/configuration/headers/).
