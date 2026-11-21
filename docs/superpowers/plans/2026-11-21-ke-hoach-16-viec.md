# Kế hoạch 16 việc chủ giao ngày 21/11/2026

> **Loại tệp:** hồ sơ có ngày (bản kế hoạch). Viết xong là đóng băng; có gì mới thì viết bản mới trỏ về đây.
> **Trạng thái:** đề xuất, chờ chủ duyệt. **Người lập:** phiên lập kế hoạch (vai lập kế hoạch — Hiến pháp P15), không thi công.
> **Cơ sở:** bốn lượt đọc mã chỉ-đọc trên bản chính `b0e992cb8` (21/11/2026). Chi tiết kỹ thuật dồn ở phụ lục cuối tệp.
> Mỗi việc, khi tới lượt thi công, sẽ có đặc tả ngắn một trang riêng (lần duyệt thứ hai theo ADR-0211); tệp này chỉ chốt thứ tự, hướng làm và câu hỏi.

## Tóm tắt

Trong 16 việc, có bốn việc đã có một phần sẵn trong Nền tảng (mục 1), nên bạn dùng được ngay mà không chờ sửa mã. Lỗi treo khi quét vé (việc 9) đã tìm ra hai chỗ sai chắc chắn trong mã; tôi xếp nó lên đầu và đề xuất mở một phiên riêng để sửa ngay. Bốn việc về tiền của đơn đối tác (2, 5, 6 và một phần việc 11) thực chất là **một chính sách**, nên tôi gom thành một câu hỏi để bạn xác nhận một lần (mục 4). Các việc lớn (giá mùa vụ, ảnh lưu 5 năm, bản dùng thử) cần ADR riêng và một số điều kiện trước (mục 3).

## 1. Có sẵn hôm nay — dùng được ngay

- **Việc 7 (giờ đón):** trang **Tôi** của Toàn quyền đã có công tắc «Bắt buộc giờ đón cho đơn đối tác». Tắt đi thì văn phòng xác nhận đơn đối tác mà không cần giờ đón. Riêng chặn «đơn sát ngày đón mà chưa có giờ» (áp mọi đơn) thì chưa có công tắc — việc 7 sẽ thêm.
- **Việc 8 (danh sách khách):** trang **Tôi** đã có «Ẩn thông tin khách khi đối tác đặt vé» và «Đối tác không nhập nơi đón». Công tắc thứ nhất ẩn **cùng lúc** tên/SĐT khách và danh sách hành khách — việc 8 sẽ tách ra.
- **Việc 11 (duyệt ngay):** đơn **đã tự xác nhận ngay** khi gửi nếu không dịch vụ nào bật cờ «cần xác nhận» (mặc định không bật). Vé Tour Đảo **đã hiện ngay** khi đơn xác nhận, chưa cần thu tiền — **trừ đơn của đối tác** (vẫn chờ tiền). Phần còn thiếu là đơn đối tác và hình thức trả với hướng dẫn viên.
- **Việc 3 (SĐT đối tác):** cách tạm: vào **Danh bạ**, thêm số điện thoại liên hệ cho hồ sơ đối tác, rồi nút «Điền thông tin đối tác» ở màn Tạo đơn sẽ điền được. Đây là khoảng trống do thiết kế (số đăng nhập cố ý không chép sang số liên hệ — ADR-0001 mục 5), không phải mã bị hỏng.

## 2. Bảng việc

Đợt sau chỉ bắt đầu khi đợt trước xong hoặc khi bạn cho chạy song song. «Lớn» = chạm dữ liệu, quyền, tiền, triển khai hay luật ⇒ có người kiểm độc lập (CLAUDE.md §3).

| # | Việc | Phát hiện chính | Loại | Đợt | Xong khi (rút gọn) | Trạng thái |
|---|---|---|---|---|---|---|
| 9 | Quét vé bị treo | Hai lỗi chắc chắn: «Quét tiếp» không bao giờ gửi lại vé còn trong khung; lỗi mạng làm trang kẹt rồi tự tải lại | Vừa | **0** | Quét lại vé đã dùng ⇒ ≤ 3 giây hiện đỏ «Đã dùng», không treo, kể cả trên iPhone thật | chờ mở phiên sửa |
| 3 | Tìm SĐT đối tác ở Tạo đơn | Đối tác tạo từ Quản lý tài khoản không có số liên hệ; ô tìm chỉ tìm theo tên | Vừa | **0** | Gõ SĐT đối tác ⇒ ra đúng đối tác; thiếu số ⇒ câu rõ + lối thêm số | chờ duyệt |
| 4 | Bộ lọc kho vé | «Lô trong kho» không có lọc và chia trang 50; bước nhập đã có bộ lọc nhóm + tìm | Nhỏ | **0** | Chọn nhóm ⇒ cả ba khối của Kho vé chỉ còn nhóm đó, kể cả lô ở trang sau | chờ duyệt |
| 16 | Biểu tượng menu Thiết lập | 25 mục chưa có hình; thiếu ~15 hình; trần gói trang dư 0 byte | Nhỏ | **0** | Mỗi mục Thiết lập có hình riêng, khổ 390 và 1280 | chờ duyệt + số trần |
| 15 | «Người bán dịch vụ» | Cần thiết cho giá vốn và sổ; có 6 điểm bất hợp lý | Báo cáo | **0** | Mục 6 của tệp này | **xong (báo cáo)** |
| 2 | Đối tác Trả sau chỉ thấy Trả sau | Hôm nay đối tác vẫn đổi được sang «Thanh toán ngay» (ADR-0198 Đ2.4) | Lớn | **1** | Đối tác có Trả sau chỉ thấy một lựa chọn; máy chủ từ chối lựa chọn khác | chờ câu hỏi 1 |
| 5 | Bỏ thu hộ chuyển khoản ở đơn đối tác | Chuyển khoản + mã QR còn mở ở đơn văn phòng lập «Qua đối tác»; nhánh ADR-0199 chưa nhập còn thêm lựa chọn chuyển khoản | Lớn | **1** | Đơn đối tác mới chỉ ghi thu tiền mặt, không QR | chờ câu hỏi 1 |
| 6 | Kế toán chỉ thấy nợ đối tác | Kế toán đang thấy giá bán lẻ; nợ đối tác chỉ có ở phiếu từng đơn | Lớn | **1** | Đơn đối tác hiện «Đối tác nợ Tour Đảo», không hiện số bán cho khách | chờ câu hỏi 1 |
| 7 | Công tắc chặn thiếu giờ đón | Đã có một công tắc; chặn «sát ngày đón» chưa có | Lớn | **2** | Toàn quyền tắt được chặn sát ngày; mặc định giữ như hôm nay | chờ duyệt ADR |
| 8 | Màn sau tạo đơn của đối tác | Trang đơn lặp Khách/Đón/Số khách; công tắc ẩn khách đang gộp hai thứ | Lớn | **2** | Không mục nào hiện hai lần; tắt riêng được danh sách khách và giờ đón | chờ duyệt ADR |
| 12 | SĐT hỗ trợ trên vé Tour Đảo | Số in là hotline công ty, đóng cứng vào ảnh vé | Vừa | **3** | Mỗi dịch vụ có số hỗ trợ, điền sẵn khi tạo vé, in lên vé | chờ duyệt ADR |
| 11 | Đơn toàn vé Tour Đảo hiện vé ngay; trả với hướng dẫn viên | Phần lớn đã có cho đơn văn phòng; thiếu đơn đối tác + hình thức mới | Lớn | **3** | Đơn đối tác toàn vé Tour Đảo hiện vé ngay; có hình thức trả với hướng dẫn viên theo sản phẩm/nhóm | chờ đợt 1 |
| 10 | Giá mùa vụ | Giá chưa có ngày hiệu lực; có khuôn «ngừng bán theo ngày» để chép | Lớn | **4** | Đặt +% / +tiền theo nhóm/dịch vụ × khoảng ngày đi; đơn tính đúng từng đồng theo sổ vàng | chờ ADR-0218 nhập |
| 13 | Ảnh bằng chứng công việc (R2, ≥ 5 năm) | Chưa có; có khuôn biên lai + hàm nén ảnh sẵn | Lớn | **5** | Hướng dẫn viên chụp ảnh gắn đơn; ảnh nén ≤ ~500 KB; không gỡ được trước 5 năm | chờ duyệt ADR |
| 14 | Thêm tệp khi đăng ký | 4 ô tệp cố định; chỉ JPG/PNG/HEIC/PDF | Lớn | **5** | Ô tệp theo vai đăng ký; thêm «Tệp khác» | chờ câu Word |
| 1 | Tài khoản dùng thử | Không làm được trên cơ sở dữ liệu thật (144 bảng cấm xoá) ⇒ cần bản dùng thử riêng | Lớn | **6** | Dữ liệu dùng thử tự xoá mỗi 2 giờ; bản chính không bị chạm | chờ duyệt ADR |

**Tiến độ:** xong 1 / 16 (việc 15 là báo cáo, nằm ở mục 6).

## 3. Điều kiện trước (bỏ qua thì đợt thi công bị chặn)

1. **Sổ hạn HC-4.2 hết hạn 30/11/2026** (9 ngày nữa): sau ngày đó `npm test` đỏ với mọi đợt. Cần vá hoặc bạn gia hạn có ghi lý do trước 30/11.
2. **HC-5.19 — chưa diễn tập khôi phục dữ liệu (hạn 31/12):** mỗi migration mới phải có dòng cho phép riêng. Gần như mọi đợt 1–6 đều có migration, nên **khuyến nghị bạn chạy diễn tập khôi phục sớm** để gỡ chặn một lần.
3. **Nhánh ADR-0199 (văn phòng nhập cọc, chưa nhập):** có lựa chọn «Khách chuyển khoản vào tài khoản Công ty» cho cả đơn «Qua đối tác» — ngược với việc 5. **Không nhập nhánh này nguyên trạng**; sửa theo câu trả lời câu hỏi 1 trước.
4. **Nhánh ADR-0218 (phí đón theo giá gốc, chưa nhập)** phải vào bản chính trước việc 10, vì cùng sửa khối tính giá và đang giữ số migration 0178–0179. Migration mới của kế hoạch này dự kiến bắt đầu từ **0182** (người thi công kiểm lại mọi nhánh trước khi đặt số).
5. **Trần dung lượng gói trang Đơn hàng đang dư 0 byte:** việc 2, 5, 8, 13, 16 đều thêm giao diện. Nới trần là nới hàng rào, nên mỗi đợt người thi công đo thật và trình bạn **một con số** để duyệt (không nới ngầm).
6. **Trang Quét vé và Kho vé chưa chuyển sang khung gốc (ADR-0222):** sửa lỗi không chờ chuyển khung. Khi chuyển khung, phải dời lớp kết quả quét ra ngoài vùng nội dung, nếu không lớp này bị bó trong khung.

## 4. Câu hỏi cần bạn trả lời bây giờ (2 câu)

**Câu 1 — Chính sách tiền của đơn đối tác** (cho việc 2, 5, 6 và một phần việc 11). Tôi đọc các yêu cầu của bạn thành một chính sách: *«Đơn của đối tác: đối tác nợ Tour Đảo theo giá đại lý. Tour Đảo chỉ chạm tiền khách lẻ của đối tác bằng tiền mặt thu hộ. Kế toán chỉ cần biết đối tác nợ Tour Đảo bao nhiêu.»* Nếu đúng, bốn hệ quả sau áp theo khuyến nghị — bạn chỉ cần nói «Đồng ý cả bốn» hoặc sửa điểm nào:
- (a) Đối tác có Trả sau chỉ thấy «Trả sau». Khi Trả sau tạm khoá (có đơn quá hạn hoặc vượt hạn mức), hiện lại «Thanh toán ngay» kèm câu lý do, để đối tác không bị kẹt không lập được đơn. *(Vì nếu chặn hẳn thì đối tác quá hạn một đơn sẽ không bán được gì.)*
- (b) Với **mọi đơn đối tác mới** (cả đơn văn phòng lập «Qua đối tác»): bỏ ghi thu «Chuyển khoản» vào tài khoản công ty và bỏ mã QR; ẩn ô «Khách đặt cọc cho đối tác» trên form tạo đơn của đối tác. Đơn cũ giữ nguyên. *(Vì Tour Đảo không còn thu hộ qua tài khoản.)*
- (c) Người thu hộ tiền mặt là hướng dẫn viên hoặc nhân viên Tour Đảo tại nơi đón; số đã thu hộ trừ vào nợ của đối tác. Tức là bật lại «Khách của đối tác trả cho Công ty» nhưng **chỉ tiền mặt**. *(Vì hôm nay công tắc này đang Tắt: hướng dẫn viên không thu được đơn đối tác.)*
- (d) Màn Đơn hàng của Kế toán: đơn đối tác hiện «Đối tác nợ Tour Đảo» và «Tour Đảo đã thu hộ tiền mặt»; **không** hiện giá đối tác bán cho khách hay giảm giá đối tác cho khách. Đơn khách lẻ hiện như cũ. *(Kế toán vẫn đối chiếu được vì chỉ còn tiền mặt thu hộ.)*

**Câu 2 — Màn Quét vé không tự tải lại trang** (cho việc 9). Lớp chống ghi trùng (ADR-0094) hôm nay xử lý «lần trước đã ghi» bằng cách báo rồi **tự tải lại trang** — trên iPhone, tải lại nghĩa là tắt camera, đúng chỗ gây cảm giác treo. Khuyến nghị: riêng màn Quét vé, gặp trường hợp này thì báo «Lần quét trước đã được ghi», cho quét tiếp ngay, không tải lại; chờ tối đa khoảng 15 giây rồi hiện nút «Thử lại». Máy chủ vẫn chặn một vé bị tính hai lần như hôm nay. Việc này cần một dòng bổ sung ADR-0175 (Đ3 mục 3). *(Vì nếu giữ cách cũ, lỗi treo khi mạng chập chờn vẫn còn sau khi sửa.)*

Các câu khác để tới đợt của nó (mục 5, mỗi đợt tối đa ba câu). Tên gọi mới gom ở mục 7.

## 5. Từng việc

### Việc 9 — Quét vé bị treo (Đợt 0, khẩn)
- **Nguyên nhân tìm được (có bằng chứng trong mã):**
  1. Sau «Quét tiếp», nếu vé vẫn nằm trong khung camera, máy cứ thấy lại vé đó và **dời mãi** mốc 3 giây chống đọc lặp, nên không bao giờ gửi lại và không báo gì. Chỉ đưa vé ra khỏi khung ≥ 3 giây hoặc tắt hẳn Nền tảng mới quét lại được. Đặc tả gốc chỉ nói «vài giây», nên đây là mã lệch đặc tả ⇒ sửa mã, không cần quyết định mới.
  2. Khi mạng chập chờn: lần gửi đầu mất phản hồi, lần quét sau mang cùng mã lần gửi, máy chủ trả «đã ghi trước đó», trang báo rồi **tự tải lại** (camera tắt), kết quả không bao giờ hiện. Cần câu hỏi 2.
  3. Lỗi máy chủ kéo dài: trang gửi lại liên tục mỗi ¼ giây, không giãn cách.
  4. Đặc thù iPhone (chưa kiểm được): đọc ảnh chụp 12 MP không thu nhỏ có thể làm đứng hình; camera bị iOS tạm dừng thì hình đứng mà trang không biết.
- **Cách làm:** mốc 3 giây cố định tính từ lúc bấm «Quét tiếp» (không trượt) kèm dòng nhắc và nút «Quét lại vé này»; xử lý «đã ghi» ngay tại màn quét (theo câu 2); giãn cách và giới hạn số lần gửi lại khi lỗi, rồi hiện «Thử lại»; tắt camera trước khi mở «Chụp ảnh»; thu nhỏ ảnh trước khi đọc mã; báo khi camera bị dừng.
- **Xong khi:** (a) quét vé A ra xanh → bấm «Quét tiếp», giữ nguyên vé A trước camera → trong ≤ 3 giây hiện đỏ «Đã dùng» kèm người quét và giờ, không treo; (b) tắt Wi-Fi giữa lúc quét → ≤ 15 giây hiện «Không gửi được» và nút «Thử lại»; bật lại mạng, bấm «Thử lại» → ra kết quả, trang không tự tải lại; (c) chụp ảnh vé → ra kết quả, không đứng hình; (d) bạn thử trên iPhone thật, cả bản cài ở màn hình chính lẫn tab Safari.
- **Không làm:** không chuyển trang Quét vé sang khung gốc; không đổi luật máy chủ «một vé chỉ tính một lần».
- **Loại:** vừa (mã máy khách + bài kiểm). Người đánh giá giao diện chấm màn; thử iPhone thật là bắt buộc (ADR-0175 Đ3 mục 10).

### Việc 3 — Tìm SĐT đối tác ở màn Tạo đơn (Đợt 0)
- **Hiện trạng:** Nền tảng **không có tự điền ở đâu cả**; số chỉ được điền khi bấm «Điền thông tin đối tác». Giả thuyết mạnh nhất: hồ sơ đối tác tạo từ Quản lý tài khoản không có số liên hệ, vì số đăng nhập cố ý không chép sang (ADR-0001 mục 5; có bất biến canh). Đối tác tự đăng ký thì có số ⇒ «lúc được lúc không». Ô «Tìm đối tác theo tên» chỉ so tên, gõ SĐT sẽ ra «Không có đối tác nào…».
- **Bước 1 (xác minh, bạn chạy):** một lệnh chỉ đọc đếm hồ sơ đối tác thiếu số liên hệ (phụ lục, việc 3).
- **Bước 2 (sửa):** ô tìm nhận cả SĐT (so với số liên hệ); khi đối tác chưa có số liên hệ, nút điền hiện câu rõ kèm đường dẫn mở hồ sơ để thêm số. Không để máy tự chép số đăng nhập (trái ADR-0001).
- **Xong khi:** nhân viên gõ số của một đối tác đã có số liên hệ → ra đúng đối tác → chọn → bấm «Điền thông tin đối tác» → ô SĐT khách có đúng số. Đối tác chưa có số → câu «Đối tác này chưa có số liên hệ» kèm lối thêm số.
- **Để sau (cần quyết riêng):** nút «Dùng số đăng nhập làm số liên hệ» do người bấm, có nhật ký — chạm ADR-0001 nên không làm trong đợt này.
- **Loại:** vừa (chỉ đọc thêm, giữ nguyên ô quyền xem hồ sơ).

### Việc 4 — Bộ lọc cho Kho vé (Đợt 0)
- **Hiện trạng:** «Số vé còn» đã có ô tìm + bốn nút; «Lô trong kho» không lọc, máy chủ chia trang 50 dòng; «Lô đã huỷ» không lọc. Bước nhập vé hãng ngoài dùng bộ chọn của Tạo đơn (tìm + hàng nút nhóm + «Hay dùng»); «Tạo vé Tour Đảo» chỉ là danh sách thả xuống.
- **Cách làm:** một bộ lọc dùng chung (nhóm dịch vụ + ô tìm không phân biệt dấu + nút «Bỏ lọc» khi ra rỗng) cho cả ba khối; «Lô trong kho» lọc ở máy chủ (vì chia trang); form «Tạo vé Tour Đảo» đổi sang cùng bộ chọn với bước nhập.
- **Xong khi:** người quản lý kho mở Kho vé, chọn một nhóm → «Số vé còn», «Lô trong kho» (kể cả lô ở trang 2 trở đi) và «Lô đã huỷ» chỉ còn dịch vụ nhóm đó; gõ «vin» hay «vịn» đều ra cùng kết quả; lọc ra rỗng có «Bỏ lọc».
- **Loại:** nhỏ (thêm điều kiện đọc ở một route, không ghi). Giữ nguyên phân quyền theo nguồn vé.

### Việc 16 — Biểu tượng cho menu Thiết lập (Đợt 0)
- **Hiện trạng:** nhóm Thiết lập có 25 mục, chưa mục nào có hình (các nhóm Hằng ngày, Vận chuyển, Tiền đã có). Thanh bên máy tính đã sẵn chỗ vẽ hình khi mục khai. Trong các màn còn ~13 thẻ con (Hoa hồng, Luật bán, Đặc điểm dịch vụ, Bảng giá xe).
- **Cách làm:** dùng lại ~10 hình sẵn có đúng nghĩa; vẽ ~15 hình mới cùng kiểu nét; mỗi nghĩa một hình (tiêu chí S6). Gắn cho 25 mục trước, rồi tới thẻ con. Mỗi hình thêm ~100–130 byte cho mọi trang ⇒ người thi công đo và trình bạn số nới trần (ước 2–3,5 KB).
- **Xong khi:** mở Thiết lập trên điện thoại → mỗi dòng có hình bên trái, không hai mục khác nghĩa chung một hình; thanh bên máy tính cũng vậy; người đánh giá giao diện chấm đạt ở khổ 390 và 1280.
- **Loại:** nhỏ (giao diện).

### Việc 2 — Đối tác Trả sau chỉ thấy «Trả sau» (Đợt 1)
- **Hiện trạng:** form hiện hai lựa chọn «Thanh toán ngay» / «Trả sau» khi bên đặt có hạn mức; đối tác được chọn sẵn Trả sau nhưng đổi được (ADR-0198 Đ2.4, bạn đã duyệt). Cả giao diện lẫn máy chủ không chặn.
- **Cách làm:** tài khoản Đối tác có Trả sau dùng được ⇒ chỉ hiện «Trả sau»; máy chủ từ chối «Thanh toán ngay» từ tài khoản đó bằng cùng một luật thuần. Trả sau tạm khoá ⇒ theo câu 1(a). Đơn văn phòng lập không đổi.
- **Xong khi:** đối tác A còn hạn mức, không quá hạn → Tạo đơn chỉ thấy «Trả sau»; đơn 3.000.000 đ lưu thành Trả sau; gửi thẳng lệnh «Thanh toán ngay» lên máy chủ → bị từ chối với câu tiếng Việt. Đối tác B có đơn quá hạn → thấy «Thanh toán ngay» kèm câu lý do. Văn phòng lập «Qua đối tác» vẫn thấy hai lựa chọn.
- **Loại:** lớn (tiền). ADR mới thay ADR-0198 Đ2.4. Dự kiến không cần migration.

### Việc 5 — Bỏ thu hộ chuyển khoản ở đơn đối tác (Đợt 1)
- **Hiện trạng:** màn Tạo đơn của đối tác có ô «Khách đặt cọc cho đối tác» (tiền đối tác đang giữ) và câu gợi ý «nội dung chuyển khoản». Ghi thu thật nằm ở trang đơn, nút «Nhập khoản thu» có «Chuyển khoản» và lựa chọn «Công ty (vào tài khoản công ty)», cùng mã QR. Công tắc «Khách của đối tác trả cho Công ty» đang Tắt nên đơn đối tác tự lập chỉ còn «Tôi thu»; nhưng **đơn văn phòng lập «Qua đối tác» không mang dấu công tắc**, nên vẫn thu chuyển khoản và QR được.
- **Cách làm:** theo câu 1(b), (c): một luật «đơn đối tác chỉ thu hộ tiền mặt» gắn dấu vào đơn lúc lập (như công tắc ADR-0178), áp cho cả đơn văn phòng lập; ẩn ô cọc trên form đối tác; sửa nhánh ADR-0199 trước khi nhập. Giữ nguyên «Khoản nộp» (đối tác trả nợ Tour Đảo) — đó không phải thu hộ.
- **Xong khi:** đối tác mở đơn mới của mình → khối tiền chỉ có «Tiền mặt», không có QR, không có «Công ty (vào tài khoản công ty)»; form tạo đơn đối tác không còn ô cọc và câu chuyển khoản; văn phòng lập «Qua đối tác» → cũng chỉ tiền mặt; đơn cũ trước ngày áp không đổi.
- **Loại:** lớn (tiền). Có migration (dấu trên đơn). Chặn ở máy chủ, không chỉ ẩn giao diện (còn sáu đường ghi thu khác).

### Việc 6 — Kế toán chỉ thấy nợ đối tác với Tour Đảo (Đợt 1)
- **Hiện trạng:** danh sách và trang đơn của Kế toán hiện số theo giá bán lẻ (Tổng, Đã trả, Còn thu, giảm giá); số đối tác nợ Tour Đảo chỉ ở «Phiếu công nợ với Tour Đảo» của từng đơn đã xác nhận; danh sách nợ gộp theo đối tác chỉ có cho đơn Trả sau.
- **Cách làm:** theo câu 1(d). Máy chủ tính sẵn theo lô (đã có hàm), không chỉ ẩn ở giao diện; nợ âm hiện thành «Tour Đảo cần trả lại đối tác».
- **Xong khi:** Kế toán mở Đơn hàng; đơn đối tác X có thành tiền theo giá công bố 5.000.000 đ, hoa hồng 800.000 đ, đối tác đã nộp 1.000.000 đ → dòng đơn hiện «Đối tác nợ Tour Đảo: 3.200.000 đ», không có con số 5.000.000 đ hay giảm giá cho khách; đơn khách lẻ vẫn hiện như cũ.
- **Loại:** lớn (tiền, quyền xem). Thêm ô quyền hoặc luật hiển thị theo vai ⇒ trang ghép (CLAUDE.md §9).

### Việc 7 — Công tắc chặn đơn thiếu giờ đón (Đợt 2)
- **Hiện trạng:** có bốn chỗ chặn. (1) Đơn đối tác có đón mà chưa giờ luôn qua văn phòng — không công tắc; (2) Bảng Còn vé đòi giờ — **đã có công tắc**; (3) mọi đơn chưa giờ mà đã sát ngày đón ⇒ chặn — không công tắc; (4) điều phối không xếp xe cho chặng chưa giờ — hợp lý, giữ.
- **Cách làm:** gom các công tắc lập đơn của Toàn quyền về một khối «Cài đặt lập đơn» (hôm nay rải trên trang Tôi); thêm công tắc cho chặn (3), mặc định **Bật** = như hôm nay. Chặn (1) thuộc công tắc giờ đón của việc 8.
- **Nói một lần:** tắt chặn (3) là mở lại lỗ ADR-0193 đã vá — đơn đón trong ngày chưa có giờ được xác nhận thẳng, vé mở khi chưa có giờ, điều phối chưa xếp được xe cho tới khi văn phòng chốt giờ.
- **Xong khi:** Toàn quyền tắt công tắc → nhân viên xác nhận đơn đón ngày mai chưa có giờ → được; bật lại → bị chặn với câu cũ. Tài khoản khác không thấy công tắc; gọi thẳng máy chủ → bị từ chối.
- **Loại:** lớn (luật đơn; bảng công tắc chỉ-thêm ⇒ migration). ADR mới sửa ADR-0193 câu (ii).

### Việc 8 — Màn sau tạo đơn của đối tác (Đợt 2)
- **Hiện trạng:** sau «Gửi đơn», đối tác về trang đơn. Dải tóm tắt đầu trang lặp «Khách» (tên + SĐT), «Đón», «Số khách» với các khối bên dưới; khi bật ẩn khách, Tên/SĐT chính là của đối tác nên lặp dòng «Bên đặt». Công tắc «Ẩn thông tin khách» ẩn cùng lúc tên/SĐT và danh sách hành khách.
- **Cách làm:** (a) bỏ trùng trên trang đơn (dải tóm tắt chỉ giữ điều không có bên dưới; ẩn dòng Khách khi trùng Bên đặt); (b) tách thành hai công tắc «Đối tác không nhập tên, SĐT khách» và «Đối tác không nhập danh sách hành khách»; (c) thêm «Đơn đối tác không cần giờ đón»: không hiện/nhắc giờ đón cho đối tác, đơn không bị đẩy sang văn phòng chỉ vì thiếu giờ; văn phòng chốt giờ sau.
- **Giữ an toàn:** chuyến xe vẫn đòi đủ tên khách trước khi xuất bến (danh sách hành khách là yêu cầu vận tải hợp đồng theo ADR-0047; chưa có luật sư xác nhận — ADR-0154).
- **Xong khi:** Toàn quyền tắt «danh sách hành khách» nhưng giữ «tên, SĐT» → đối tác vẫn nhập tên/SĐT khách, không thấy khối Hành khách; trang đơn sau khi gửi không có mục nào hiện hai lần; chuyến chở khách đơn đó vẫn đòi đủ tên trước khi xuất bến.
- **Loại:** lớn (dữ liệu, luật đơn). Cùng ADR với việc 7 (một lượt duyệt, hai quyết định).

### Việc 12 — Số điện thoại hỗ trợ trên vé Tour Đảo (Đợt 3)
- **Hiện trạng:** vé Tour Đảo là ảnh vẽ lúc tạo lô, in «Hotline <số của công ty chủ>»; số nằm cứng trong ảnh, không lưu ở đâu. ADR-0175 Đ1 mục 7 đang quy định in hotline công ty.
- **Cách làm:** mỗi dịch vụ có «số hỗ trợ» mặc định (sửa ở màn Dịch vụ & giá, cạnh «Vé do ai phát»); form Tạo vé có ô số hỗ trợ điền sẵn (số của dịch vụ, nếu trống thì hotline công ty), sửa được cho từng lô; số **thay** chỗ hotline trên vé; lưu số vào lô; nhận cả tổng đài 1900/1800 và số bàn; vé đã tạo không đổi.
- **Xong khi:** Quản trị đặt số hỗ trợ cho một dịch vụ; người quản lý kho tạo 10 vé dịch vụ đó → ô số đã điền sẵn, «Xem vé mẫu» và ảnh vé in đúng số đó; dịch vụ chưa đặt số → in hotline công ty như cũ; nhật ký không chứa số.
- **Loại:** vừa (một bảng nhỏ + một cột ở lô ⇒ migration). ADR ngắn ghi đổi ADR-0175 Đ1 mục 7.

### Việc 11 — Đơn toàn vé Tour Đảo hiện vé ngay; trả với hướng dẫn viên (Đợt 3)
- **Hiện trạng:** xem mục 1. Thiếu: (a) đơn **đối tác** toàn vé Tour Đảo vẫn chờ tiền mới hiện vé (ADR-0170 Đ2); (b) chưa có hình thức «trả với hướng dẫn viên»; (c) «Vé do ai phát» chỉ đặt theo từng dịch vụ, chưa theo nhóm.
- **Cách làm:** mở vé ngay cho đơn đối tác khi **mọi** dịch vụ có vé trong đơn là vé Tour Đảo (dịch vụ không vé không tính) và thuộc danh sách sản phẩm/nhóm bạn chọn; thêm hình thức trả với hướng dẫn viên (khách trả tiền mặt khi đi tour), lưu bằng cột/bảng riêng — **không** thêm giá trị vào danh sách hình thức cũ, vì việc đó buộc dựng lại cả bảng đơn hàng (rủi ro dữ liệu lớn nhất kế hoạch); cho đặt «Vé do ai phát» theo nhóm.
- **Xung đột phải chốt:** việc 2 nói đối tác Trả sau chỉ có một hình thức. Khuyến nghị: đối tác đang Trả sau vẫn chỉ «Trả sau»; hình thức trả với hướng dẫn viên dành cho đơn văn phòng và đối tác không có Trả sau. Áp cho đơn đối tác thì phải sửa ADR-0178 Đ1 (hôm nay hướng dẫn viên không thu được đơn đối tác khi công tắc Tắt) — câu 1(c) đã chạm điểm này.
- **Câu hỏi của đợt (≤ 3):** khách không trả hướng dẫn viên thì ai chịu nợ (khuyến nghị: đơn văn phòng — khách; đơn đối tác — đối tác); có áp cho đơn đối tác không; danh sách sản phẩm/nhóm đầu tiên.
- **Rủi ro:** vé mở trước khi thu tiền ở đơn đối tác ⇒ có thể mất tiền thật nếu khách không đi, không trả. «Khách đã trả đủ» vẫn đòi thu đủ như hôm nay.
- **Xong khi:** đối tác lập đơn 4 vé Tour 3 đảo (vé Tour Đảo, nằm trong danh sách) → gửi đơn → đơn xác nhận ngay, vé điện tử hiện ngay dù chưa trả; đơn có thêm một vé hãng ngoài → vé hãng ngoài vẫn chờ tiền như hôm nay; hướng dẫn viên mở đơn hình thức trả với hướng dẫn viên → ghi thu tiền mặt được.
- **Loại:** lớn (tiền, dữ liệu). ADR mới; sau đợt 1.

### Việc 10 — Giá mùa vụ (Đợt 4)
- **Hiện trạng:** giá lấy từ Google Sheet (cũng là nguồn của website), không có ngày hiệu lực; Quản trị ghi đè được; giá chụp vào dòng đơn lúc lưu; đơn đã xác nhận không đổi giá. Hôm nay giá **không theo ngày đi**. Đã có khuôn tốt để chép: «Ngừng bán theo ngày khởi hành» (dịch vụ hoặc nhóm × khoảng ngày) và chương trình phí đón theo ngày đi (nhánh ADR-0218). Màn Chi tiết dịch vụ đã chừa chỗ «Giá theo mùa». ADR-0201 đã ghi hướng của bạn: giá theo mùa tính theo ngày đi.
- **Cách làm:** bảng «giá mùa vụ» chỉ-thêm: phạm vi (dịch vụ hoặc nhóm) × khoảng ngày đi × tăng % và/hoặc tăng số tiền; **một hàm tính duy nhất** ở máy chủ, chèn sau ghi đè của Quản trị và trước đơn giá thoả thuận; chụp vào dòng đơn giá gốc + quy tắc đã áp + số tăng (Hiến chương 5.6); dịch vụ thắng nhóm, cùng mức chồng ngày bị chặn lúc nhập, không cộng dồn; chỉ tăng (≥ 0), trần % do Toàn quyền đặt; người đặt: Quản lý bán hàng, Quản trị, Kế toán qua một ô quyền mới. Ô này **không** thuộc nhóm «quyền tiền» của ADR-0090 (nếu xếp vào, luật PIN và gán vai của Quản trị, Quản lý bán hàng đổi hàng loạt) — ADR ghi rõ đây là «quyền tiền mềm» và Quản trị gán được vai Quản lý bán hàng. Sổ vàng ca mẫu do Kế toán xác nhận (5.17).
- **Lỗ phải vá cùng:** nháp đổi ngày đi vẫn giữ giá cũ ⇒ tính lại khi đổi ngày; đơn đã xác nhận dời sang mùa khác ⇒ chặn (tính lại tiền vướng HC-4.2).
- **Câu hỏi của đợt (≤ 3):** đại lý có hưởng hoa hồng trên phần tăng mùa vụ không (khuyến nghị: có, với hoa hồng tính theo %); một quy tắc có cả % và số tiền thì tính % trước rồi cộng, làm tròn lên 1.000 đ (khuyến nghị); đơn đã xác nhận đổi ngày sang mùa khác thì chặn (khuyến nghị). Kèm một điều cần biết: website đọc cùng Sheet nên sẽ không thấy giá mùa vụ.
- **Xong khi (ví dụ tiền):** Tour 3 đảo người lớn 450.000 đ; Quản lý bán hàng đặt +10% và +20.000 đ cho nhóm «Tour đảo» từ 01/02 đến 15/02/2027. Đơn 2 người lớn đi 05/02 → đơn giá 450.000 × 1,1 + 20.000 = 515.000 đ → 1.030.000 đ. Đơn đi 20/02 → 900.000 đ. Kế toán đặt được; Bán hàng không thấy nút. Đơn xác nhận 25/01 cho ngày 05/02 giữ 1.030.000 đ dù sau đó quy tắc bị kết thúc.
- **Loại:** lớn (tiền, quyền, dữ liệu). ADR mới + sổ vàng + người kiểm độc lập. Sau khi nhánh ADR-0218 nhập.

### Việc 13 — Ảnh bằng chứng công việc gắn đơn (Đợt 5)
- **Hiện trạng:** chưa có. Có sẵn khuôn biên lai chuyển khoản (kho riêng, tên tệp ngẫu nhiên, nhật ký trước khi xem, gỡ có lý do) và hàm thu nhỏ ảnh ở trình duyệt (đã bỏ vị trí GPS). Tên «ảnh bằng chứng» đang trùng nghĩa với ảnh bằng chứng giao diện của kho mã (ADR-0216) ⇒ cần tên khác (mục 7).
- **Cách làm:** kho R2 thứ sáu riêng (bạn tạo một lần); bảng ảnh gắn đơn (tuỳ chọn gắn dịch vụ hoặc lượt đón) + loại việc (giao khách, giao tài xế taxi, khác) + ghi chú ngắn; trình duyệt nén JPEG hai cỡ (ảnh nhỏ ~400 px cho danh sách, ảnh xem ~1600 px), ước 150–400 KB mỗi ảnh (chưa đo); máy chủ kiểm loại tệp theo nội dung; xem qua máy chủ sau kiểm quyền và ghi nhật ký; cơ sở dữ liệu chặn gỡ trước 5 năm — Toàn quyền chỉ **ẩn** có lý do, tệp vẫn giữ; thêm thời hạn giữ vào chính sách riêng tư phiên bản mới (Hiến chương 5.21, 5.25).
- **Ai làm được (đề xuất):** tải — văn phòng, hướng dẫn viên đang phụ trách đơn, tài xế công ty của chuyến (ô quyền mới theo chuyến); xem — văn phòng, Kế toán, Quản trị; đối tác không xem.
- **Câu hỏi của đợt (≤ 3):** tên tính năng; giữ 5 năm khi khách yêu cầu xoá dữ liệu (khuyến nghị: hỏi luật sư, Toàn quyền chỉ ẩn); có cần vị trí GPS không (khuyến nghị: không).
- **Cần biết:** ước 50 ảnh/ngày × 300 KB ≈ 27 GB sau 5 năm (giá R2 chưa kiểm); sao lưu hiện giữ ~1 năm, muốn chắc 5 năm phải quyết thêm cách sao lưu kho này; khoá giữ của R2 chưa kiểm.
- **Xong khi:** hướng dẫn viên mở đơn đang phụ trách, chụp 2 ảnh khi giao vé → đơn hiện 2 ảnh nhỏ, bấm xem ảnh lớn; mỗi ảnh ≤ 500 KB; Kế toán thấy, đối tác không thấy; thử gỡ ảnh một năm tuổi → bị chặn, chỉ Toàn quyền ẩn được có lý do và tệp vẫn còn trong kho.
- **Loại:** lớn (dữ liệu cá nhân, quyền, triển khai kho mới).

### Việc 14 — Thêm ảnh, tệp khi đăng ký tài khoản (Đợt 5)
- **Hiện trạng:** phiếu đăng ký có 4 ô tệp cố định (CCCD mặt trước, mặt sau, giấy phép kinh doanh, giấy phép thêm); chỉ nhận JPG, PNG, HEIC, PDF; 5 MB mỗi tệp, 8 tệp mỗi phiếu; không cấu hình theo vai.
- **Cách làm:** bảng dữ liệu «vai đăng ký ↔ loại giấy tờ ↔ bắt buộc hay tuỳ chọn» (có ngày hiệu lực) ⇒ phiếu hiện đúng ô theo vai; thêm ô «Tệp khác»; tăng số tệp mỗi phiếu (ví dụ 8 → 12) bằng một dòng chính sách.
- **Câu Word (.doc, .docx) — khuyến nghị trái lời bạn nên phải hỏi:** khuyến nghị **không nhận** tệp Word, phiếu ghi «Tệp Word, hãy lưu thành PDF rồi gửi». Lý do: tệp Word có thể chứa mã độc (macro) mà máy chủ không phân biệt được, người xác minh mở trên máy văn phòng là rủi ro; bảng lưu tệp hiện chỉ chấp nhận bốn loại, đổi phải dựng lại bảng (ADR-0208 đã loại). Nếu bạn vẫn cần: chỉ nhận .docx có kiểm không macro, bảng mới, ADR riêng.
- **Xong khi:** người đăng ký chọn một vai tổ chức → thấy ô giấy phép kinh doanh (bắt buộc), các ô tuỳ chọn theo vai và «Tệp khác»; chọn vai cá nhân → chỉ thấy ô CCCD và «Tệp khác»; gửi PDF 3 MB được; gửi tệp Word → câu «hãy lưu thành PDF».
- **Loại:** lớn (dữ liệu cá nhân, migration).

### Việc 1 — Tài khoản dùng thử (Đợt 6, chạy song song được)
- **Hiện trạng:** cơ sở dữ liệu thật có 144 bảng cấm xoá, sổ tiền chỉ-thêm, và «không xoá cứng» là luật nền (N5) ⇒ **không thể** để dữ liệu dùng thử trong bản chính rồi xoá mỗi 2 giờ; dữ liệu đó cũng sẽ lẫn vào sổ công nợ và lượt soát tiền 7 giờ sáng. «Xem như vai trò khác» chỉ cho Toàn quyền và ghi thật vào bản chính. Bản Development (ADR-0162) đã thiết kế nhưng chưa dựng.
- **Cách làm:** dựng **bản dùng thử riêng**: Worker + cơ sở dữ liệu + kho ảnh riêng, chạy đúng mã đang phát hành của bản chính, địa chỉ riêng (ví dụ một tên miền phụ của booking.tourdao.vn — bạn chọn). Dữ liệu mẫu: danh mục đọc từ Sheet thật (giá bán vốn đã công khai trên website), đối tác và hoa hồng là số giả. Mỗi 2 giờ: đưa cơ sở dữ liệu dùng thử về trạng thái sạch. Đăng nhập: một tài khoản dùng thử; sau mã PIN hiện «Bạn muốn dùng thử với vai nào?», chọn được mọi vai **trừ Toàn quyền**. Riêng bản dùng thử: cho nhiều máy cùng lúc, không bảo mật hai lớp, không gửi thư/thông báo/Zalo ra ngoài, dải «BẢN DÙNG THỬ — dữ liệu tự xoá lúc …». Khoá / mở: tài khoản Toàn quyền của bạn trên bản dùng thử có công tắc «Mở / Khoá tài khoản dùng thử»; trạng thái khoá nằm ngoài phần bị xoá mỗi 2 giờ.
- **Bước 0 (thử kỹ thuật, chưa kiểm):** cách đưa cơ sở dữ liệu về trạng thái sạch mỗi 2 giờ (quay về mốc bằng Time Travel qua API, hay xoá–tạo lại–nạp mẫu) và chi phí Cloudflare cho bản thứ ba. Kết quả bước này quyết cách làm, trước khi viết ADR.
- **Xong khi:** (a) mở địa chỉ dùng thử, đăng nhập tài khoản dùng thử, chọn «Đối tác», lập đơn → đơn chỉ có ở bản dùng thử, bản chính không có; (b) qua mốc 2 giờ, đơn đó biến mất, danh mục và tài khoản mẫu còn nguyên; (c) Toàn quyền bấm Khoá → đăng nhập dùng thử báo «đang tạm khoá»; Mở → vào lại được; (d) không thư, thông báo nào gửi ra ngoài từ bản dùng thử.
- **Không làm:** không chép dữ liệu thật (khách, đơn) sang; không khoá/mở từ bản chính (muốn vậy phải nối hai hệ thống — ADR riêng).
- **Loại:** lớn (triển khai, quyền). ADR mới: «chọn vai khi đăng nhập» là ngoại lệ của ADR-0187 Đ1, chỉ trên bản dùng thử. Bạn phải tự tạo tài nguyên Cloudflare và đặt bí mật (lệnh cấm AI chạy, CLAUDE.md §8).

## 6. Báo cáo việc 15 — «Người bán dịch vụ» trong Thiết lập

**Nó là gì.** Màn này lưu điều khoản «ai bán dịch vụ nào cho Tour Đảo, Tour Đảo mua lại theo tỷ lệ bao nhiêu, trong khoảng ngày nào» (phạm vi: một dịch vụ, một nhóm, hoặc mọi dịch vụ). Chỉ thêm và đóng, không sửa, không xoá. Có sẵn một dòng gieo: «công ty chủ bán mọi dịch vụ». Kế toán, Quản trị, Toàn quyền xem và ghi.

**Vì sao cần.** Dữ liệu này đi thẳng vào tiền: bản chụp thương mại lúc xác nhận đơn, biên nhận chia phần theo người bán, người thu «quầy nhà cung cấp», và dòng **giá vốn** ghi vào sổ lúc «Khách đã trả đủ» (công ty nợ nhà cung cấp). Dịch vụ không có người bán thì đơn bị giữ, không qua được «Khách đã trả đủ». Vậy chức năng **cần thiết** cho sổ đại lý và giá vốn — nhất là với dịch vụ do nơi khác cung cấp mà Tour Đảo bán lại (ví dụ tắm bùn).

**Điều bất hợp lý thấy được:**
1. Ba tên cho một thứ: màn gọi «Người bán», vai hồ sơ gọi «Nhà cung cấp», còn bảng và đường gọi máy gọi «cung ứng». Bảng tham chiếu ngôn ngữ vẫn để tên này «chờ chọn» (trái Hiến chương 5.27).
2. «Nhà cung cấp» còn mang nghĩa thứ hai ở ô «Vé do ai phát» (vé Tour Đảo hay vé hãng ngoài) — chính là nghĩa bạn dùng ở việc 11. Hai nghĩa khác nhau mà gần cùng tên, dễ nhầm.
3. Hai cột lưu cùng một giá trị (người bán và nhà cung cấp — máy buộc bằng nhau hoặc để trống).
4. Là điều khoản tiền ảnh hưởng tới sổ nhưng nằm trong Thiết lập; Bán hàng không xem được người bán của dịch vụ mình bán.
5. Đóng dòng «Mọi dịch vụ» mà chưa mở dòng thay thì mọi đơn mới kẹt ở bước «Khách đã trả đủ»; hiện chỉ có một hộp hỏi lại, không chặn.
6. Dòng gieo sẵn trỏ vào hồ sơ công ty chủ lúc gieo; nếu sau này đổi công ty chủ (ADR-0043), công ty cũ có thể bị coi là nhà cung cấp (suy ra từ mã, chưa chạy thử).

**Đề xuất (chưa làm; khi bạn muốn sẽ thành một đợt nhỏ):** chọn một tên (mục 7); chặn đóng dòng «Mọi dịch vụ» khi chưa có dòng thay; dòng gieo trỏ «công ty chủ hiện tại» thay cho hồ sơ cố định (kiểm thử trước); gộp hai cột trùng theo cách hai lần phát hành; cân nhắc chuyển mục sang nhóm Tiền trên menu. Không xoá chức năng.

## 7. Tên gọi cần bạn chọn (gom một lần, chọn khi tới đợt)

Theo Hiến chương 5.27, tên mới do bạn chọn từ 2–3 phương án:
- Việc 13 — tên tính năng ảnh: «Ảnh bàn giao» / «Ảnh giao việc» / «Ảnh xác nhận giao».
- Việc 11 — tên hình thức trả: «Trả với hướng dẫn viên» / «Trả tiền mặt khi đi tour» / «Thanh toán với hướng dẫn viên».
- Việc 12 — nhãn số trên vé: «Hỗ trợ» / «Hotline dịch vụ».
- Việc 15 — tên chung: «Nhà cung cấp» / «Người bán dịch vụ».
- Việc 1 — tên bản: «Bản dùng thử» / «Bản trải nghiệm».

## 8. Điều AI tự quyết (bạn bác được)

- Việc 2: đối tác thấy chữ **«Trả sau»**, không phải «Hạn mức trả sau» — vì ADR-0198 Đ1 bạn đã duyệt giấu chữ «hạn mức» với đối tác. Chặn ở cả máy chủ, chỉ áp cho tài khoản Đối tác.
- Việc 4: «bước nhập vé vào kho» hiểu là bộ chọn của form nhập vé hãng ngoài (tìm + nhóm); tìm không phân biệt dấu; lọc theo nguồn vé hay trạng thái lô để sau.
- Việc 7: công tắc mới mặc định **Bật** (giữ hành vi hôm nay); gom công tắc về một khối «Cài đặt lập đơn».
- Việc 8: «tắt danh sách khách» hiểu là tách khỏi «tên, SĐT khách»; vẫn đòi đủ tên lúc xuất bến.
- Việc 9: sửa lỗi «cửa sổ trượt» mà không hỏi, vì mã lệch đặc tả đã duyệt («vài giây»).
- Việc 10: chỉ tăng giá (≥ 0), xét theo ngày đi, dịch vụ thắng nhóm, không cộng dồn; phí đưa đón không chịu giá mùa vụ (đã có luật riêng ADR-0218).
- Việc 12: số dịch vụ **thay** hotline công ty (một số trên vé dễ hiểu, vừa bố cục); không tạo lại vé cũ.
- Việc 13: chỉ ảnh JPEG hai cỡ, không nhận PDF hay video; không giữ GPS trong ảnh, giờ lấy giờ máy chủ.
- Việc 16: «menu phụ» hiểu là 25 mục Thiết lập trước, thẻ con trong từng màn sau.
- Việc 1: khoá/mở ngay trên bản dùng thử; chọn được mọi vai trừ Toàn quyền.
- Thứ tự đợt như bảng mục 2; việc 1 chạy song song được vì không đụng mã các đợt khác.

---

## Phụ lục kỹ thuật (cho người thi công)

> Đường dẫn tính từ gốc kho. Không ghi số dòng (đổi liên tục). Kiểm lại trước khi dùng.

**Việc 9.** `web/quet-ve.ts` (`gui`, `nhanMa`, `docKhung`, `hienKetQua`, `dongKetQua`, `tatCamera`; vòng `setInterval(docKhung, 250)`); `src/shared/chong-doc-lap.ts` (`xetDocLap` trượt cửa sổ; `batDauDong` giữ mã khi đóng) + bài `chong-doc-lap.test.ts` (ca «cửa sổ trượt theo» đang khoá hành vi sai — sửa đỏ trước); `web/api.ts` (`baoDaGhi` trả `Promise<never>` và `location.reload()` sau 1,2 giây ⇒ `finally { dangGui = false }` không chạy; hạn chờ `REQUEST_TIMEOUT_MS = 45_000`; `api()` nhận `henGioMs`); `src/shared/lan-gui-ve.ts` (vé = băm phương thức + đường dẫn + thân; GIỮ vé khi mất mạng/5xx ⇒ quét lại cùng vé mang cùng vé); `src/shared/lan-gui-bi-mat.ts` (`/api/ve/quet` trong `BI_MAT`); `web/qr-doc-ve.ts` (`docQrTuTep` đọc ảnh gốc; jsQR `inversionAttempts: "attemptBoth"`). Máy chủ đúng: `ketQuaQuet` trả `DO/DA_DUNG` 200 và chèn lượt `TU_CHOI`. Thiếu bài máy trạng thái của `web/quet-ve.ts` (dùng `src/dom-gia.ts`). Tái hiện không cần iPhone: Chrome `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<y4m có QR>`. Rủi ro khung gốc: `body[data-khung-goc] main { container: … }` biến `main` thành khung chứa của `.qv-ket-qua` (`position: fixed`).

**Việc 3.** `web/order-form.ts` (`#use-partner` → `GET /api/parties/:id` đọc `party.primaryPhone`; `datBenDat`; `capNhatNutDienDoiTac`); `web/booker-picker.ts` (`GET /api/parties/lookup?phone=`, `timDoiTacTrung` → `GET /api/pricing/nguoi-huong?q=` chỉ so `display_name`); `web/dat-qua-doi-tac.ts`; `src/modules/parties/repository.ts` (`LOOKUP` chỉ `pty_contact_point` loại PHONE); `src/modules/staff/index.ts` (`createAccountWithRolesStatements` không truyền `contacts`); bất biến R-N1-13 ở `scripts/audit-checks.mjs`. Lệnh xác minh do chủ chạy (chỉ đọc; tên bảng vai/liên hệ người thi công kiểm lại trong `docs/DATA-DICTIONARY.md` trước khi đưa chủ): đếm hồ sơ mang vai được hưởng hoa hồng mà không có liên hệ PHONE chính đang mở. Dùng `wrangler d1 execute … --remote --command`, không dùng `--file` (lỗi OAuth đã biết).

**Việc 4.** `web/ve-kho.ts` (`taiKho`, `taiCacLo`, `taiLoDaHuy`, `dungForm`); `web/ve-kho-huy.ts`; `web/ve-tao.ts` (`<select>`); `web/catalog-picker.ts` (`createCatalogPicker`, `khoaNho:"ve-kho"`); `src/shared/loc-danh-muc.ts` (`locTheoNhom`, `CHUA_PHAN_LOAI`, `khoaNhoNhom`; tìm CÓ phân biệt dấu); `src/shared/loc-kho-ve.ts` (`khopTen` KHÔNG phân biệt dấu; dòng `KhoDong` không có `groupCode`). Máy chủ `src/modules/ve-dien-tu/index.ts` + `repository.ts`: `GET /api/ve/lo?tatCa=1&trang=` (`DS_LO_TAT_CA`, `DONG_MOI_TRANG = 50`) cần thêm tham số lọc (danh sách mã qua `json_each`, chữ tìm so `printed_name`), giữ `nguonDuocXem`.

**Việc 16.** `src/shared/muc-giao-dien.ts` (`THANH_BEN`, nhóm THIẾT LẬP 25 mục, trường `bieuTuong`); `web/shell.ts` (`sidebarItem` đã vẽ `icon(m.bieuTuong, 18)`); `web/thiet-lap.ts` + `public/thiet-lap.html`; `web/icons.ts` (`SHAPES`, 43 hình, lưới 24, nét 1.8); trần `TRAN_ORDERS` ở `src/goi-trang-nhe.test.ts` (dư 0). Tiêu chí S6 ở `docs/TIEU-CHI-GIAO-DIEN.md`.

**Việc 2.** `public/order-form.html` (`#tra-sau-khoi`); `web/order-form.ts` (`napTraSau`, `hinhThucChon`, `datHinhThuc`); `src/shared/han-muc-tra-sau-hien-thi.ts` (`quyetHinhThuc`, `duocChonSanTraSau`); `src/shared/tra-sau.ts` (`laDoiTacTraSau`, `lyDoKhongTraSau`); máy chủ `src/modules/orders/tra-sau-cong.ts` (`congTraSauKhiLuu` — thêm nhánh từ chối PREPAID), `GET /api/tra-sau/con-duoc-dung`. «Được Trả sau» xét theo bên đặt / tư cách (ADR-0213). Hình thức khoá sau nháp bằng trigger.

**Việc 5.** Form: `#dat-coc-o`, `#paymentNote` ở `public/order-form.html`; `coODatCoc` ở `web/order-form.ts`. Trang đơn: `web/order.ts` (`tienCard`, `nutGhiThu` — nút «Nhập khoản thu», chọn `BANK_TRANSFER/CASH/OTHER`; `nutQr`). Luật người thu: `src/shared/ben-kia-hien-thi.ts` (`luaChonNguoiThu`), `src/modules/billing/kenh-thu.ts` (`kiemNguoiThuKenh`, dấu `kenhThu` chụp lúc lập — đơn văn phòng «Qua đối tác» có `kenhThu = null`). Cọc lúc xác nhận: `src/modules/billing/dat-coc.ts`. Nhánh `worktree-adr-0199-van-phong-nhap-coc` (migration 0163, lựa chọn chuyển khoản vào tài khoản Công ty).

**Việc 6.** `web/orders.ts` (`fillTien` → `POST /api/ledger/balances`); `web/order-card.ts`; `web/order.ts` (`tienCard`, `nutCongNo`); `web/phan-doi-tac.ts` (`GET /api/orders/:id/thuong-mai`); `src/modules/billing/cong-no-dai-ly.ts` (`congNoNhieuDon` theo lô, `tinhConLai` — có thể âm); `src/modules/orders/gia-dai-ly.ts`; `src/shared/hoa-hong-dong.ts`. Kế toán giữ `order.view`, `money.view`, `credit.limit.view` phạm vi any. Công thức: nợ = Σ(thành tiền dòng − hoa hồng) + phí đưa đón − đã thu thật.

**Việc 7.** `src/modules/orders/xac-nhan-route.ts` (`canChotGioCuaNguoiLap`, `docBatBuocGioDon`, 409 `pickup_time_required` / `chua_gio_sat_ngay`, `GET/POST /api/cai-dat/bat-buoc-gio-don`); `src/modules/orders/xac-nhan-chung.ts` (`chanChuaGioSatNgay`, cũng gọi ở `/status`); `src/shared/moc-toi-thieu.ts` (`changChuaGioVaoHanChot`) + vế SQL trong `ORDER_CONFIRM` (`orders/chang-hanh-khach-repo.ts`); bảng mẫu `ord_pickup_time_policy` (0157), `ord_partner_pickup_place_policy` (0181); giao diện `web/gio-don-cai-dat.ts`, `web/noi-don-cai-dat.ts`, `web/an-khach-cai-dat.ts` trên `web/account.ts`.

**Việc 8.** `web/order.ts` (`render`, `summaryBand`, `khoiDuaDonDon`, `khoiHanhKhachDon`); `web/order-form.ts` (`guiDonKhiLuu`); `src/shared/buoc-tao-don.ts`; công tắc ẩn khách `ord_partner_customer_policy` (0133), dấu `manifest_exempt`; bảng điều khiển trường `web/bang-dieu-khien-truong.ts`, `src/shared/ui-truong.ts` (`gd_field_policy`, không có tên/SĐT, không có giờ đón); cờ `requireManifest` của chính sách điều phối. Đặc tả liên quan: `docs/superpowers/specs/2026-11-20-toi-uu-giao-dien-tao-don-va-xac-nhan.md` (A1–A5).

**Việc 12.** `web/ve-tao.ts` (`dungKhoiTaoVe`, `layCongTy` đọc `GET /api/company`); `web/ve-anh-tour-dao.ts` (`VeTourDaoVao`); `src/shared/ve-anh-tour-dao-bo-cuc.ts` (dòng `Hotline …`, `toiDa: 1`) + bài bố cục; lô `POST /api/ve/lo` (`kiemLo` ở `src/modules/ve-dien-tu/nhap-lo.ts`), bảng `vdt_batch` (0131, 0134) — thêm cột cho phép NULL; khuôn bảng theo dịch vụ `ctl_service_ticket_source` (`src/modules/catalog/nguon-ve-repo.ts`, giao diện `web/catalog-co-ve.ts`). `normalizePhone` loại 1900/1800 ⇒ cần luật kiểm riêng cho số hỗ trợ.

**Việc 11.** `src/shared/mo-ve-theo-ve.ts` (`veMoDuocTheoVe`: TOUR_DAO mở khi `confirmed` và ngoài diện đối tác); `src/shared/tra-sau.ts` (`moVeDuoc`); `src/modules/ve-dien-tu/index.ts` (`docDonVe`, `veMoDuoc`); `src/shared/nguon-ve.ts`, `src/modules/catalog/nguon-ve-route.ts` (`ctl_service_ticket_source`, chỉ theo dịch vụ); `src/shared/xac-nhan-don.ts`; `orders.payment_term` có `CHECK IN ('PREPAID','CREDIT')` (0141) ⇒ không mở rộng; khuôn cột `credit_basis` trong kế hoạch ADR-0178 Đ2 (chưa có mã).

**Việc 10.** Nguồn giá `src/modules/catalog/sheet.ts`, `service.ts` (`syncCatalog`), `repository.ts` (`applySync`, `catalog_override` xoá cứng — đừng chép); `src/modules/catalog/index.ts` (`getEffectiveServices` không nhận ngày); `src/shared/order-lines.ts` (`buildLines`); `src/modules/orders/service-rules.ts` (`catalogService` Q11 — điều kiện `kept` không xét ngày; BK5 `catalogPriceSeen`); `src/modules/orders/price-guards.ts` (R2); `xac-nhan-chung.ts` (`congGiaDanhMucDoi`); khuôn `ctl_sales_pause` (0180) + `src/modules/catalog/ngung-ban-ngay-*.ts`; quyền `keToanQuanLy()` ở `src/shared/permissions.ts`; KHÔNG thêm vào `O_GHI_TIEN`. Đơn đã xác nhận: trigger 0081 cấm sửa cột tiền; `PUT /api/orders/:id/trip` đổi ngày giữ tiền.

**Việc 13.** Năm kho R2 hiện có: `HO_SO`, `HO_TRO`, `VE_DIEN_TU`, `BIEN_LAI`, `ANH_DICH_VU`. Thêm kho thứ sáu: `wrangler.jsonc` (+ kiểm `wrangler.dev.jsonc`), kiểu binding, `KHO_R2` ở `scripts/sao-luu-lib.mjs` + `src/sao-luu.test.ts`, tiền tố mới trong `taoKhoaNgauNhien` (`src/shared/tep-dinh-kem.ts`), bài `src/kho-tep-<mới>.test.ts`, `docs/data-dictionary.json` + `npm run dict`, token R2 chỉ đọc ở `docs/KHOI-PHUC-DU-LIEU.md`. Khuôn: bảng 0158 + `GET /api/orders/:id/payments/:receiptId/bien-lai` (`src/modules/billing/index.ts`); `web/thu-nho-anh.ts` (`thuNhoAnh`, tham số `canhDai`). Nợ liên quan: BL-TEP-THAN-HAI-LAN, BL-TEP-PHAT-LAI-500, BL-BL-THU-THAT. Tài xế hôm nay không có ô quyền nào về đơn, chỉ `trip.*`.

**Việc 14.** `src/modules/dang-ky/tep-route.ts` (`taiTepPhieu`); `src/modules/dang-ky/rules.ts` (`O_TEP_PHIEU`, `kiemTepPhieu`); `src/modules/parties/tep-cho.ts`; `src/shared/dang-ky-vai.ts`, `src/shared/dang-ky-truong.ts`; `web/dang-ky.ts`; `dk_policy` (0170: `photo_max_mb` 5, `photo_max_count` 8); `content_kind` `CHECK ('jpg','png','heic','pdf')` ở cả `pty_registration_attachment` (0171) và `pty_attachment` (0104); trigger `pty_attachment_link_kind_ins` chỉ mở 2 loại nối.

**Việc 1.** `src/modules/auth/index.ts` (`POST /api/auth/login`, `issueLoginSession`), `auth/session-ledger.ts` (`isSingleDevice`); `src/modules/accounts/index.ts` (`PATCH /api/staff/:id` trường `active`, `POST /api/staff/:id/unlock`, `POST/DELETE /api/auth/xem-nhu-vai`); `src/shared/xem-nhu-vai.ts`; `wrangler.dev.jsonc` (D1 `000…`, chưa dựng); `scripts/lam-moi-dev.mjs`, `scripts/tai-khoan-thu.mjs`, `scripts/moi-truong-lib.mjs`; bộ lọc thư `src/shared/gui-thu.ts` (`MOI_TRUONG`, `THU_CHO_PHEP`). Bẫy: luật một máy, bảo mật hai lớp bắt buộc cho vai nội bộ, vai Đối tác cần hồ sơ mang vai đối tác (ADR-0185).

**Việc 15.** `web/nguoi-ban.ts`, `public/nguoi-ban.html`, `web/so-dai-ly-ui.ts`; `src/modules/pricing/index.ts` (`GET/POST /api/pricing/cung-ung`, `POST …/:id/dong`), `pricing/rules.ts` (`kiemThanDieuKhoan`, `nguoiBanCuaDong`); bảng `prc_supply_term` + view (0090), dòng gieo `prc-st-goc-all`; người đọc: `orders/thuong-mai*.ts`, `receipt/rules.ts`, `src/shared/chia-phan-nguoi-ban.ts`, `billing/rules.ts`, view `v_ord_terms_missing`, trigger `bil_posting_delivered_terms`.
