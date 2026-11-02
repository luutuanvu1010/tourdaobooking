# ADR-0159 — Khách đặt cọc trước trên đơn của đối tác

- **Trạng thái:** **accepted** 2026-11-02 — chủ dự án chọn ở hộp hỏi, nguyên văn: *«Duyệt ô đặt cọc»*, sau khi đọc báo cáo người kiểm và các hệ quả dưới đây. Lời chủ trước đó, nguyên văn: *«cần có phần thu phần trả trước của khách, gọi là Khách đặt cọc trước»*; chọn *«Thành khoản thu khi xác nhận (Recommended)»*; *«Duyệt thiết kế»*; *«ok tiếp tục sửa các lỗi sổ tiền sau đó làm phần đặt cọc trong cả backend và giao diện»*. Bản này đã sửa theo báo cáo người kiểm độc lập cùng ngày.
- **Nguồn thi công:** `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md`, mục QĐ-A và tiêu chí QĐ-A. Lệch giữa hai nơi: ADR này thắng.
- **Loại:** việc lớn (tiền, dữ liệu). Hai chiều về mã; khoản thu đã sinh thì chỉ đảo bằng dòng đảo.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 1.** Không thêm quyền.
- **Xây trên lỗ đang hở:** `TNV-G1`, `TNV-G3`, `TNV-G4`, `HC-5.19`. Đặc tả ghi chủ chọn «vá trước», tức các mục này đóng rồi mới làm. **Bản này đổi điều đó:** phần mã của `TNV-G3`, `TNV-G4` phải qua người kiểm trước khi làm; `TNV-G1` (chủ và Kế toán xác nhận sáu ca sổ vàng) được phép còn mở khi làm. **Chỉ phát hành sau khi đã diễn tập khôi phục `HC-5.19`.** Duyệt ADR này là cho phép xây trên các mục đó, chỉ cho phần này; dòng `xay_tren_cho_phep` ở `docs/quyen-hoan.json` do chủ duyệt bằng diff.
- **Quan hệ với ADR cũ:** **sửa ADR-0135 Đ8 cho riêng tài khoản Đối tác** (Đ8 đã bỏ ô trả trước khỏi màn Tạo đơn) và **nới ADR-0136 Đ6** (người xét được thấy số khai). Giữ nguyên ADR-0026 điều 9 (ba cột cọc cũ vẫn chết), ADR-0135 Đ7 (nháp không có khoản thu), ADR-0136 (đơn đã có khoản thu không gửi xác nhận được), ADR-0132 điều 3, ADR-0089.

## Bối cảnh

Đối tác thường đã cầm cọc của khách khi đặt vé. Hôm nay sau khi đơn được xác nhận, đối tác tự ghi được khoản thu («Tôi thu») và văn phòng cũng ghi được, nên cách này phụ thuộc vào việc có người nhớ ghi. Chủ muốn ô nhập ngay trên màn đặt vé.

ADR-0135 từng bác «giữ ô, ghi sau xác nhận» vì người lập dễ hiểu nhầm là đã ghi. Bản này trả lời bằng cách ghi rõ «chờ xác nhận» ở Đ1 mục 6, và máy tự sinh khoản thu khi xác nhận nên không còn bước phải nhớ.

## Đ1 — Quyết định

1. **Nhập:** tài khoản giữ quyền Đối tác có ô «Khách đặt cọc trước» ở khối Thanh toán, số nguyên VNĐ, mặc định trống. Tóm tắt thêm hai dòng xem trước: «Khách đặt cọc trước», «Khách còn phải trả». Văn phòng không có ô này và vẫn ghi khoản thu như hôm nay.
2. **Lưu:** cột mới `orders.declared_deposit` (`INTEGER NOT NULL DEFAULT 0`, `CHECK >= 0`, có trần như số tiền khác). Khi đơn còn nháp đây chỉ là **lời khai**: không vào sổ, không tính là khoản thu, không chặn gửi xác nhận. Khoá khi đơn chờ duyệt và sau xác nhận. Khai 0 thì không sinh khoản thu.
3. **Thành khoản thu:** khi đơn được xác nhận, **cùng một lô** sinh một khoản thu trả trước, tiền mặt, số tiền bằng lời khai. **Người thu và người ghi đều là người lập đơn**, kể cả khi người khác bấm xác nhận; người bấm ghi ở nhật ký. Vai người thu là `BOOKER` nếu người lập là bên đặt được hưởng theo bản chụp của chính lô, `STAFF` nếu không. Dòng tiền đang giữ hộ sinh ngay, không thành lời khai chờ Kế toán và không chặn «Đã giao». **Khoản thu chỉ được ghi khi câu xác nhận của chính lô đã thắng**; xác nhận thua vì khoá hoặc mốc 6 giờ thì không có khoản thu nào. Phải qua cả ba nơi gọi `soanXacNhan`, có bài kiểm quét nơi gọi. `orders` không đọc, không ghi `bil_*`: gốc lắp ráp tiêm hàm dựng câu; không dựng được thì 503 và không xác nhận.
4. **Chặn:** lời khai không vượt tổng sau giảm, kiểm lúc lưu, lúc người xét hạ tổng và lúc xác nhận. Người xét hạ tổng xuống dưới lời khai thì 409, câu lỗi nói rõ phải trả đơn để người lập sửa số khai. Tài khoản chưa gắn hồ sơ mà khai lớn hơn 0 thì 409, nhờ văn phòng.
5. **Đơn không qua xác nhận:** huỷ, hết vé, rút lại thì không sinh gì. Huỷ sau xác nhận đi luồng thu trước của đơn huỷ có sẵn.
6. **Hiển thị:** đơn nháp có dòng «Khách đặt cọc trước (chờ xác nhận)»; người xét thấy số này trước khi xác nhận. Sau xác nhận đọc từ sổ như mọi khoản thu, không đọc cột. Nhật ký chỉ ghi số tiền và mã đơn. Ca vàng mới ở trạng thái chờ Kế toán, AI không tự đánh dấu.

## Phương án đã loại

- **Giữ nút «Ghi khoản thu» sẵn có và nhắc sau xác nhận.** Rẻ hơn nhiều: không thêm cột, không chạm lô xác nhận, không xây trên lỗ đang hở. Đổi lại đối tác có thể quên, và không còn ô trên màn đặt vé như chủ yêu cầu. Chủ đã thấy phương án này và không chọn.

## Hệ quả chủ cần biết

- Khoản thu ghi theo lời đối tác, **không có người kiểm tiền thật ở bước này**. Rủi ro cùng loại với hôm nay vì đối tác đã tự ghi được, nhưng khoản thu nay tự sinh khi văn phòng bấm xác nhận. Khai thấp hơn thực giữ thì máy không phát hiện được.
- Khách đã trả đủ theo lời khai thì «Đã giao» đi qua mà không thu thêm: **công ty chạy dịch vụ dựa trên nợ của đối tác, và chưa có trần công nợ.** Đối tác nợ đủ số cọc tới khi nộp; hoa hồng chỉ cấn trừ từ lúc «Đã giao». «Hoàn thành» bị giữ khi còn người chưa nộp.
- Biên nhận mang tên công ty có thể ghi số khách đã trả theo lời khai; **chưa kiểm** bằng chạy thử.
- Có thể **ghi trùng** nếu văn phòng hoặc đối tác giữ thói quen tự ghi; cảnh báo trùng `TNV-G4` Đ6a giúp phát hiện với tiền mặt.
- Sửa đơn sau xác nhận làm tổng thấp hơn tiền đã thu: «Đã giao» bị giữ ở «khách trả dư» tới khi Kế toán hoàn.
- Hình thức luôn là tiền mặt, kể cả khi khách chuyển khoản cho đối tác, tức ghi sai hình thức với ca đó.
- Hồ sơ đại lý không có tài khoản không có ô này; tiền họ giữ vẫn do văn phòng ghi như hôm nay.
- **Chưa kiểm:** huỷ để lập lại đơn (ADR-0089 đ7) mà khai lại cọc trên đơn mới, trong khi cọc cũ còn giữ hộ hoặc được chuyển sang, có thể tính hai lần. Người thi công phải có bài cho ca này.
