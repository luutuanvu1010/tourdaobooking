# ADR-0168 — Thanh toán trả sau theo hạn mức riêng của đối tác

- **Trạng thái:** **accepted** 2026-11-05 — chủ dự án, nguyên văn: *«Duyệt cả ba điểm»*, trả lời câu hỏi nêu rõ: đơn còn nợ chưa qua bước thu đủ; không huỷ được khi còn nợ mà đã mở vé; được xây trên các lỗi đang mở nhưng chỉ phát hành sau diễn tập khôi phục. Người kiểm độc lập đã đọc một vòng, các phát hiện đã đưa vào bản này. Lời chủ và tiêu chí nghiệm thu: `docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md`. Lệch giữa hai nơi: ADR này thắng. **Đ2 mục 6 (đổi bên đặt đơn Trả sau đã xác nhận): chỉ sang bên có hạn mức còn hiệu lực, không đơn quá hạn, không sang khách lẻ, chặn cả cửa gộp hồ sơ — bởi ADR-0188** (accepted 2026-11-09); nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0188.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). Hai chiều về mã; đối tác đã nhận vé trên đơn Trả sau thì không lấy lại được tiền bằng cách hoàn mã.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 3** (Đ1, Đ2, Đ3). Trang ghép nằm trong đặc tả.
- **Xây trên lỗ đang hở:** `TNV-G1`, `HC-5.19`, `HC-4.2`; chủ đã cho phép ở lời duyệt trên. **Chỉ phát hành sau khi đã diễn tập khôi phục `HC-5.19`.** Lý do được xây: việc này không sinh dòng sổ mới và không nới luật của các lỗi đó.
- **Quan hệ với ADR cũ:**
  - Sửa cho riêng đơn Trả sau: ADR-0153 Đ1 mục 4(c) (thu đủ mới mở vé), ADR-0153 Đ2 (thu đủ mới tạo đường dẫn), ADR-0159 Đ1 mục 1–2 (không nhận lời khai đặt cọc).
  - Thêm điều kiện: cổng xác nhận chung của ADR-0136; các đường sửa tiền sau xác nhận (ADR-0063, ADR-0114); huỷ đơn và huỷ để lập lại (ADR-0089); đổi bên đặt và gộp hồ sơ (ADR-0068).
  - Giữ nguyên: «Đã giao» là đã thu đủ (ADR-0026 điều 13, ADR-0088), quyền tiền (ADR-0090).
  - Trả lời hệ quả «chưa có trần công nợ» của ADR-0159 cho riêng đơn Trả sau; đường khai đặt cọc vẫn chưa có trần.

## Bối cảnh

Mọi đối tác hiện trả trước: công ty thu đủ rồi mới giao vé. Chủ muốn một số đối tác được nhận vé trước và trả sau, trong một hạn mức và thời hạn do Toàn quyền đặt riêng.

## Đ1 — Hạn mức riêng từng đối tác

1. Bảng mới chỉ-thêm của `billing`, mỗi dòng: hồ sơ, tổng hạn mức (`INTEGER` VNĐ, lớn hơn 0), số ngày được nợ (số nguyên từ 1 đến 365), khoảng hiệu lực theo ngày. CSDL chặn hai dòng chồng ngày của cùng hồ sơ. Không xoá cứng.
2. Chỉ cấp cho hồ sơ đang mang loại đối tác được hưởng; hồ sơ nội bộ bị từ chối, theo ADR-0117 điều 4.
3. Hai ô quyền mới: đặt hạn mức (chỉ Toàn quyền); xem hạn mức và nợ của mọi đối tác (Toàn quyền, Kế toán). Hai đường đọc hẹp không cần ô mới: Đối tác đọc số của hồ sơ gắn với phiên; người đang có quyền lập đơn cho một bên đặt đọc được «số còn được dùng» của đúng bên đó, không kèm danh sách đơn.
4. Không có dòng hiệu lực thì đối tác chỉ trả trước. Đây là mặc định của mọi đối tác.

## Đ2 — Hình thức trên đơn, cách tính nợ, cổng xác nhận

1. `orders` thêm `payment_term` (`PREPAID` mặc định, `CREDIT`) và `credit_due_date`, cả hai vào danh sách cột bị khoá sau «Đã giao». Đơn cũ đều là `PREPAID`. Trạng thái thô không lộ ra giao diện. Nợ thuộc về `orders.booker_party_id`.
2. **Nợ của một đơn** = `max(0, phải thu − số đã về công ty)`, tính bằng JS từ số thật, không lưu cột. **Số đã về công ty** không gồm khoản đang chờ đối chiếu, không gồm khoản người thu là chính bên đặt mà chưa nộp về công ty; đơn huỷ theo Đ3 mục 3. **Nợ của đối tác** = tổng nợ các đơn `CREDIT` đã xác nhận, kể cả đơn đã «Đã giao» còn tiền ở tay đối tác. Trả dư ở đơn này không làm nhẹ nợ đơn khác. Tính trên toàn bộ tiền phải thu, không trừ hoa hồng.
3. Xác nhận đơn `CREDIT` bị từ chối khi: không có hạn mức hiệu lực; nợ + đơn này vượt hạn mức; hoặc có đơn `CREDIT` của bên đặt đã qua hạn trả còn nợ. Ngày hạn trả chưa tính là quá hạn.
4. **Chốt khi nhiều lệnh cùng lúc:** vì phải thu tính bằng JS, mỗi bên đặt có một dòng phiên bản. Lệnh đọc phiên bản, tính nợ, rồi trong lô có câu gác đúng phiên bản và tăng phiên bản; sai phiên bản thì cả lô huỷ. Mọi đường làm tăng nợ đều tăng phiên bản: xác nhận, sửa tăng tiền, đảo hoặc sửa khoản thu. Có bài kiểm quét nơi gọi các đường này.
5. Mọi đường ghi làm tăng phải thu của đơn `CREDIT` đã xác nhận (sửa tiền ở `orders`, sửa tiền của hướng dẫn viên ở `dispatch`, sửa số khách) phải qua cùng cổng hạn mức. Đảo khoản thu không bị chặn, vì đó là sửa sai; nợ tăng thì chỉ chặn đơn mới.
6. Đơn `CREDIT` đã xác nhận còn nợ không đổi được bên đặt, và hồ sơ đang có đơn như vậy không gộp vào hồ sơ khác được.
7. Hạn trả = ngày xác nhận + số ngày đang áp, chụp một lần. Đổi hạn mức về sau không đổi hạn đơn đã xác nhận.
8. Xác nhận đơn `CREDIT` không sinh dòng sổ. Nợ không phải một loại dòng sổ mới.

## Đ3 — Mở vé trước, «Đã giao» sau, huỷ đơn

1. Đơn `CREDIT` đã xác nhận mở được ba đường vé (xem ảnh, giao vé, tạo đường dẫn) dù chưa thu đủ, trừ khi đơn đó đã quá hạn còn nợ; khi đó vé chưa mở bị chặn, vé đã mở vẫn xem được. Một hàm thuần duy nhất quyết định, thay cho so `thuDu` ở ba route đó, ở `GET /api/ve/don/:orderId` và ở giao diện vé. `thuDu` giữ nguyên nghĩa.
2. «Đã giao» và «Hoàn thành» giữ nguyên luật và trigger. Đơn `CREDIT` còn nợ ở «Đã xác nhận»; hoa hồng ghi sổ khi đơn thu đủ và được bấm «Đã giao».
3. **Huỷ:** đơn `CREDIT` còn nợ mà đã có vé mở thì **không huỷ được**, kể cả huỷ để lập lại; câu báo nói phải thu đủ hoặc nhờ Kế toán. Đơn chưa có vé mở thì huỷ như thường và hết nợ.

## Phương án đã loại

- **Cho «Đã giao» đi qua khi còn nợ, nợ thành dòng sổ.** Khớp hơn với việc dịch vụ đã chạy và hoa hồng ghi đúng lúc. Nhưng phải gỡ `receipt_after_delivered`, khoá sửa đơn sau «Đã giao», phép so `completed_due` và câu chữ khắp nơi, tức viết lại lõi sổ tiền vì một tính năng. Lúc hỏi, câu hỏi gửi chủ có ghi «phải sửa thêm luật Đã giao»; đọc mã xong người soạn đề nghị không sửa, và nêu ở đây để chủ thấy.
- **Một hạn chung cho cả hạn mức.** Chủ không chọn.
- **Trừ khoản đối tác tự ghi vào nợ.** Đối tác sẽ tự ghi «Tôi thu» để làm trống hạn mức rồi đặt tiếp, hở gấp nhiều lần hạn mức.
- **Lưu số phải thu thành cột của đơn.** Thêm một nơi phải giữ khớp với cách tính sẵn có.
- **Huỷ thoải mái khi vé đã mở.** Vé đã mở không về kho, nên công ty mất tiền vé mà không còn khoản nợ nào.

## Hệ quả chủ cần biết

- Vé là tiền: đối tác nhận vé rồi không trả thì công ty mất tiền thật, cỡ hạn mức. Hạn mức là trần rủi ro chủ tự đặt.
- Đơn Trả sau đã chạy xong mà chưa trả vẫn ở «Đã xác nhận», nên báo cáo theo «Đã giao» chưa tính đơn đó và **hoa hồng của đối tác đến sau khi họ trả**.
- Khách đổi ý trên đơn Trả sau đã mở vé: văn phòng không tự huỷ được; Kế toán phải xử lý tiền trước.
- Hạ hạn mức không ép đối tác trả ngay; chỉ chặn đơn mới.
- Không có nhắc nợ tự động: Kế toán xem danh sách nợ trên màn «Hạn mức trả sau». Nợ không vào sổ công nợ và bảng kiểm khoá tháng.
- **Chưa kiểm:** màn việc còn lại của hướng dẫn viên khi đơn đọng ở «Đã xác nhận»; biên nhận của đơn còn nợ; đường dẫn vé của khách có tự thu hồi khi đơn huỷ không.
