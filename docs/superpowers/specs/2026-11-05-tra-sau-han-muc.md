# Thanh toán trả sau theo hạn mức riêng của đối tác

Trạng thái: **đề xuất, chờ chủ duyệt**. Quyết định và luật chi tiết: `docs/adr/ADR-0168-thanh-toan-tra-sau-va-han-muc.md`.

Chủ 4/11/2026, nguyên văn: «Hình thức thanh toán mặc định dành cho tất cả TA là trả trước, tức công ty nhận đủ tiền rồi mới trả vé. Bây giờ thêm 1 hình thức nữa là Trả sau/ Credit dành cho một số đối tác cụ thể (chọn riêng giống như cách thiết lập mức chiết khấu riêng bên cạnh mức chiết khấu chung). Trong bảng điều khiển của Super Admin, thiết lập tổng hạn mức, thời gian hiệu lực (Ngày). Ví dụ tổng hạn mức là 50 triêụ, khách hàng cần phải trả khi tới hạn mức hoặc trả trước khi tới hạn để tiếp tục được đặt vé với hình thức trả sau.»

Chủ chọn ở hộp hỏi cùng ngày: «Mỗi đơn một hạn», «Toàn bộ tiền phải thu», «Chọn từng đơn, mặc định trả trước», «Cả đơn, mọi dịch vụ».

## Làm gì

1. **Cấp hạn mức.** Toàn quyền có màn «Hạn mức trả sau»: chọn một hồ sơ mang loại đối tác được hưởng, có hay chưa có tài khoản; đặt tổng hạn mức (VNĐ) và số ngày được nợ của mỗi đơn. Đổi hoặc ngừng thì thêm dòng mới. Không có dòng còn hiệu lực nghĩa là chỉ trả trước.
2. **Theo dõi nợ.** Cũng màn đó, mỗi đối tác có hạn mức hiện: hạn mức, đang nợ, còn được dùng, số đơn quá hạn, danh sách đơn còn nợ với hạn trả. Toàn quyền sửa được; Kế toán chỉ xem.
3. **Chọn trên đơn.** Đơn có hình thức Trả trước (mặc định) hoặc Trả sau. Ô Trả sau chỉ hiện khi bên đặt có hạn mức còn hiệu lực, kèm số còn được dùng. Tài khoản Đối tác chỉ thấy số của mình; văn phòng đặt hộ cũng chọn được.
4. **Tính nợ.** Theo ADR-0168 Đ2 mục 2. Khoản đối tác tự ghi «Tôi thu» chưa nộp về công ty không làm giảm nợ.
5. **Hạn trả.** Lúc xác nhận, đơn được ghi hạn trả = ngày xác nhận + số ngày đang áp (giờ Việt Nam).
6. **Khoá.** Không xác nhận được đơn Trả sau khi không còn hạn mức, khi nợ + đơn này vượt hạn mức, hoặc khi có đơn Trả sau quá hạn còn nợ. Câu báo nói rõ lý do và số tiền. Đơn Trả trước của đối tác đó vẫn đặt được.
7. **Mở vé.** Đơn Trả sau đã xác nhận mở được vé dù chưa thu tiền. Đơn Trả trước giữ luật thu đủ.
8. **Thu tiền.** Ghi trên từng đơn như hôm nay, không có lệnh riêng.

## Không đổi

«Đã giao» vẫn nghĩa là đã thu đủ. Đơn Trả sau ở «Đã xác nhận» tới khi thu đủ, rồi bấm «Đã giao» như thường, và hoa hồng được ghi sổ từ lúc đó. Câu giữ ở bước «Đã giao» của đơn Trả sau đổi thành: «Đơn trả sau còn nợ … — chờ đối tác thanh toán», người xử lý là Kế toán.

**Đổi tên, việc riêng:** chủ 5/11/2026 («chốt hướng», sau đề nghị của người soạn) đổi chữ «Đã giao» trên giao diện thành «Đã thu đủ sau dịch vụ»; chỗ chật ghi «Xong và đủ tiền», nút ghi «Xác nhận đã thu đủ sau dịch vụ». Mã và cơ sở dữ liệu giữ tên cũ. Bản này còn viết «Đã giao» cho tới khi việc đổi tên xong.

## Giả định của người soạn, chủ sửa được

- Đơn đã quá hạn còn nợ: không mở thêm vé chưa mở của đơn đó; vé đã mở không thu hồi.
- Đơn Trả sau còn nợ đã có vé mở: không huỷ được, kể cả huỷ để lập lại, tới khi thu đủ hoặc Kế toán xử lý.
- Hạ hoặc ngừng hạn mức khi đang nợ: được phép, chỉ chặn đơn mới.
- Sửa đơn Trả sau đã xác nhận làm tăng tiền quá hạn mức: chặn. Giảm tiền: được.
- Đơn Trả sau không nhận ô «Khách đặt cọc trước» (409). Khách trả thẳng cho công ty vẫn ghi khoản thu và làm giảm nợ.
- Đổi hình thức chỉ được khi đơn còn nháp hoặc chờ duyệt.

## Không làm lượt này

Không tính lãi hay phí phạt. Không tự nhắc nợ bằng thông báo. Không có màn nợ riêng cho đối tác ngoài dòng số còn được dùng và nhãn hạn trả trên đơn. Không thu gộp mới. Không tự đóng băng tài khoản, không thu hồi vé.

## Tiêu chí nghiệm thu

1. Đối tác chưa được cấp: gọi lưu đơn với hình thức Trả sau nhận 409; màn đặt vé không có ô chọn.
2. Hạn mức 50.000.000, đang nợ 45.000.000: đơn 5.000.000 xác nhận được, đơn 5.000.001 nhận 409 với câu có số tiền. Bài chạy trên cả ba đường xác nhận (`/status`, `quyet-dinh`, `gui-don`).
3. Hai đơn cùng xác nhận mà tổng vượt hạn mức: đúng một đơn qua, đơn kia không để lại dòng nào của lô.
4. Công ty thu 10.000.000 trên đơn nợ: số còn được dùng tăng đúng 10.000.000. Đảo khoản thu thì giảm lại. Khách trả dư ở đơn A không làm giảm nợ đơn B.
5. Đối tác tự ghi «Tôi thu» đủ tiền đơn A rồi đặt đơn B Trả sau: nợ đơn A vẫn tính; vượt hạn mức thì đơn B 409. Sau khi Kế toán ghi đối tác đã nộp thì nợ giảm. Đơn đã «Đã giao» mà tiền còn ở tay đối tác vẫn tính nợ.
6. Đơn quá hạn còn nợ: đơn Trả sau mới của bên đó 409, đơn Trả trước vẫn qua. Trả hết: Trả sau mở lại. Đúng ngày hạn trả chưa tính là quá hạn.
7. Đơn Trả sau đã xác nhận chưa thu: xem ảnh, giao vé, đường dẫn đều mở. Đơn Trả trước chưa thu: vẫn bị chặn như cũ. Đơn Trả sau quá hạn còn nợ: vé chưa mở bị chặn, vé đã mở vẫn xem được.
8. «Đã giao» của đơn Trả sau còn nợ 409 với câu mới; thu đủ thì qua; «Hoàn thành» không đổi.
9. Mọi đường sửa làm tăng tiền (sửa tiền, sửa tiền của hướng dẫn viên, sửa số khách) vượt hạn mức đều 409; có bài quét nơi gọi để đường mới không lọt.
10. Đơn Trả sau đã xác nhận còn nợ: đổi bên đặt 409; gộp hồ sơ đang giữ đơn đó 409.
11. Đơn Trả sau còn nợ có vé đã mở: huỷ và huỷ để lập lại đều 409. Chưa có vé mở: huỷ được, nợ về 0.
12. Bán hàng, Quản trị, Nhân sự, Đối tác, Tài xế đối tác gọi lệnh đặt hạn mức nhận 403. Đối tác đọc số của hồ sơ khác không lộ số. Người lập đơn chỉ đọc được số còn được dùng của bên đặt trên đơn đang lập.
13. Đổi số ngày sau khi xác nhận: hạn trả của đơn cũ không đổi. Đổi hạn mức có dòng nhật ký, không chứa SĐT, email, MST.
14. Cột mới bị khoá sau «Đã giao» (đã thử sửa, bị chặn). Đơn cũ sau migration đều là Trả trước và không đổi một đồng nào trên sổ.
15. Kiểm dữ liệu định kỳ có phép: đơn Trả sau đã xác nhận thiếu hạn trả (lỗi); đơn Trả trước có hạn trả (lỗi); hồ sơ nợ vượt hạn mức hiện hành (chỉ cảnh báo, vì được phép hạ hạn mức).
16. Giao diện theo `web/CLAUDE.md`; không chữ Anh; tên nút mới vào bảng tham chiếu ngôn ngữ (ADR-0167).

## Trang ghép (CLAUDE.md §9)

**Bảng dùng chung nhận loại dữ liệu mới:** `orders` thêm hình thức và hạn trả, cho mọi loại đơn nhưng chỉ đơn có bên đặt được cấp mới mang `CREDIT`. Bảng mới của `billing` chứa hạn mức và dòng phiên bản, đối tượng là hồ sơ loại đối tác được hưởng, không chứa hồ sơ nội bộ.

| Cửa | Cổng trên máy chủ | Chỗ giao diện đổi nghĩa |
|---|---|---|
| Đặt, đổi, ngừng hạn mức | ô quyền mới, chỉ Toàn quyền | mục menu và nút theo ô này |
| Xem hạn mức và nợ mọi đối tác | ô quyền mới, Toàn quyền và Kế toán | như trên; Kế toán không thấy nút sửa |
| Đối tác xem số của mình | theo hồ sơ của phiên, không nhận id từ trình duyệt | dòng số trên màn đặt vé |
| Người lập đơn xem số còn được dùng | quyền lập đơn cho đúng bên đặt | ô chọn trên màn đặt vé |
| Chọn Trả sau | kiểm khi lưu để báo sớm, gác phiên bản trong lô xác nhận | ô ẩn khi không có hạn mức; ẩn không phải cổng |
| Mở vé | `ctx` do gốc lắp ráp tiêm; một hàm thuần quyết định | nút vé theo cùng hàm đó; lời hiện ở `web/ve-don.ts` đổi theo |
| Đổi bên đặt, gộp hồ sơ, huỷ đơn | chặn thêm với đơn Trả sau theo ADR-0168 | câu báo nói rõ lý do |
| «Đã giao», «Hoàn thành» | luật và trigger giữ nguyên | chỉ đổi câu giữ |

## Điểm dễ sai

- `soanXacNhan` là đường xác nhận duy nhất của cả ba route; đặt cổng tại đó, đừng rải theo route.
- `orders` không được import `billing`: số nợ do gốc lắp ráp tiêm, theo khuôn `tienDonVe`.
- Tiền hiện hành của đơn chưa «Đã giao» tính bằng JS, không có view; đừng cố viết tổng nợ bằng một câu SQL.
- `conLai` cộng cả khoản đối tác tự ghi; không dùng thẳng để tính nợ. Mở vé không đọc số nợ của cả đối tác, chỉ đọc hình thức và hạn của chính đơn.
- Các câu trigger đóng băng sau «Đã giao» là danh sách cột liệt kê tường minh, phải tạo lại bằng migration mới. Migration kế tiếp: kiểm lại số trên mọi nhánh trước khi đặt.
- Thêm ô quyền thì cập nhật các bài khoá bản đồ quyền; hàng rào mới mà AI dựa vào thì ghi `docs/SO-HANG-RAO.md`.

## Xây trên lỗ đang hở

`TNV-G1` (đơn huỷ còn tiền), `HC-5.19` (chưa diễn tập khôi phục), `HC-4.2`, đều hạn 30/11: chủ cần ghi «Cho phép, có ghi lý do» hoặc chờ đóng lỗ. Việc này cho đối tác nhận vé trước khi trả tiền, nên người soạn đề nghị **chỉ phát hành sau diễn tập khôi phục**.
