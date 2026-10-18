# Trình chủ duyệt — Sổ đại lý đợt 2 (18/10/2026, bản 2.1)

**Làm xong đợt 2 thì được gì.** Đơn do đại lý đặt (HDV độc lập, công ty lữ hành, lễ tân, taxi, cộng tác viên) bấm được «Đã giao – đã thu đủ». Hôm nay các đơn này bị chặn hẳn ở bước đó. Lúc bấm, sổ tự ghi ba khoản: Tour Đảo nợ đại lý tiền hoa hồng; đại lý nợ Tour Đảo phần giảm giá họ đã cho khách; Tour Đảo nợ nhà cung cấp tiền vé (ví dụ i-resort). Sau đó đơn «Hoàn thành» được bằng nút nộp / trả từng đơn đã có. Phần quyết toán gộp cả tháng và màn để đại lý tự xem sổ là **đợt 3**, sẽ trình riêng sau khi đợt 2 xong.

Bản này đã sửa theo hai vòng người kiểm độc lập. Vòng 1 chỉ ra ba lỗi lớn ở bản 1: lý do xin xây trên lỗ đang hở nói chưa đúng, cách xử lý đơn cũ lệch chữ quyết định bạn đã duyệt, và danh sách chờ của Kế toán sẽ không thấy khoản mới. Cả ba đã sửa. Vòng 2 xác nhận đã sửa đúng và tìm thêm một hàng rào sẽ chặn nhầm việc sửa sai của Kế toán; chỗ đó cần bạn chọn ở điều 3.

## Người dùng sẽ thấy khác ở đâu

- Khi ghi tiền, chọn được «khách trả cho đại lý» hoặc «khách trả tại quầy nhà cung cấp». HDV chọn thì đơn chờ Kế toán xác nhận rồi mới «Đã giao» được (lựa chọn của bạn hôm nay).
- Trên đơn đại lý, ai sửa đơn cũng chỉ được giảm giá tối đa bằng hoa hồng của đơn, **kể cả Bán hàng và Quản trị**. Đơn khách lẻ giữ luật như hôm nay.
- Kế toán có nút «Chụp bù» cho đơn đại lý xác nhận trước ngày có bảng mức, và nút «Bên kia đã nhận». «Chụp bù» là ghi lại mức hoa hồng cho một đơn cũ, như máy vẫn tự ghi lúc xác nhận đơn mới; máy từ chối nếu còn dịch vụ chưa có mức, để không ghi một bản thiếu rồi khoá lại.
- Đổi bên đặt của đơn đã xác nhận sang một đại lý sẽ bị chặn nếu giảm giá trên đơn lớn hơn hoa hồng của đại lý đó.
- Biên nhận gửi khách chia phần theo người bán khi đơn có vé do nhà cung cấp bán (ví dụ một phần Tour Đảo, một phần i-resort).
- Đối tác không còn thấy tên người đã thu tiền và tiền người khác đang giữ. Chỗ lộ tên này **có từ hôm nay**, đợt 2 vá luôn. Số dư giữa Tour Đảo và nhà cung cấp mới xuất hiện từ đợt 2; Bán hàng và HDV sẽ không thấy số này, vì từ đó suy ra được giá vốn.

**Ba hệ quả bạn cần biết trước**, đều theo quyết định đã duyệt nhưng hôm nay chưa ai gặp:
1. Đơn **khách lẻ** có dịch vụ nhập tay (không có trong danh mục) sẽ bị giữ ở «Đã giao» tới khi Kế toán ghi tay «dòng này Tour Đảo bán». Bạn đã duyệt luật này ngày 1/10, nhưng mã chưa chạy nên hôm nay các đơn đó vẫn qua được.
2. Đơn khách lẻ cũ (xác nhận trước 12/10) được máy tự ghi «Tour Đảo bán» lúc phát hành, đúng chữ quyết định. Nếu trong đó có đơn mua vé mà nay Kế toán đã khai là nhà cung cấp bán, sổ sẽ không tự ghi tiền nợ nhà cung cấp; Kế toán bổ sung bằng điều chỉnh có người duyệt. Câu đếm sẽ liệt kê đúng các đơn này.
3. Đơn đại lý xác nhận sau 12/10 mà lúc đó một dịch vụ chưa có mức: mức đã ghi lại lúc xác nhận thì khoá, nên Kế toán ghi mức tay cho dòng đó; nút «Chụp bù» không dùng được cho đơn này.

## Ba điều cần bạn duyệt

1. **Đặc tả đợt 2 và trang ghép** (`README.md`, `trang-ghep.md` cùng thư mục). Đặc tả áp đúng các quyết định bạn đã duyệt ngày 1/10, chỉ cập nhật theo những quyết định ra sau đó. Sáu chỗ tôi tự quyết, đảo được, nằm ở mục 3 của đặc tả, nên bạn soát mục đó.
2. **ADR-0130** (`de-xuat-adr-khach-tra-ben-kia.md`): biến lựa chọn «Chờ Kế toán xác nhận» của bạn hôm nay thành quyết định chính thức, thay lựa chọn cũ ngày 1/10.
3. **Cho phép xây đợt 2 trên năm lỗ còn ghi trong sổ hoãn.** Sổ hoãn là danh sách lỗ an toàn đã biết, mỗi lỗ có người chịu trách nhiệm và hạn vá; quá hạn thì bộ kiểm của Nền tảng báo đỏ. Luật dự án không cho duyệt đặc tả chạm vùng đang hở nếu bạn chưa cho phép kèm lý do, và lời cho phép ngày 8/10 chỉ viết cho việc mã QR, không áp cho đợt này.

   | Lỗ | Còn hở gì | Đợt 2 chạm ở đâu |
   |---|---|---|
   | TNV-G1 (đơn huỷ còn tiền cọc) | Kế toán chưa xác nhận 13 ca tính cọc; tin báo «Đã duyệt hoàn cọc»; ô đếm Trang chủ | Khoản «khách trả cho đại lý» phải được tính đúng khi đơn huỷ |
   | TNV-G3 (sửa sai sau «Đã giao») | Bạn chưa quyết ai chịu khi ghi sai; tin báo người thu cũ / mới | Hàm đọc lần thu dùng chung với lệnh «Thay lần thu» |
   | TNV-G4 (sổ không đổi dấu) | Tin báo người bị đổi số dư; cảnh báo hai người khai trùng | Dấu chờ đối chiếu nhận loại mới; **một hàng rào phải sửa** (ngay dưới) |
   | HC-4.2 (điều chỉnh cần người thứ hai duyệt) | Phần lớn đã giải bằng ADR-0115; còn chờ người kiểm đối chiếu để đóng | Đường điều chỉnh nhận ba loại dòng mới |
   | HC-5.19 (chưa từng thử khôi phục dữ liệu) | Còn nguyên, hạn 5/11 | Lần phát hành ghi một chiều lên đơn thật |

   Đợt 2 không nới luật nào của năm lỗ, **trừ một chỗ cần bạn chọn**. Sổ có một hàng rào chặn việc «tất toán một khoản tiền giữ hộ hai lần». Nó tính số người giữ tiền còn nợ bằng cách cộng mọi khoản trên đơn. Khi đợt 2 thêm khoản hoa hồng và tiền vé nhà cung cấp, con số đó bị kéo xuống, nên hàng rào chặn nhầm hai việc sửa sai của Kế toán sau «Đã giao»: đổi người thu khỏi đại lý (hay quầy nhà cung cấp), và xác nhận «Công ty đã nhận» cho khoản tiền mặt mà chính đại lý khai.
   - **Sửa hàng rào cho chỉ cộng đúng các khoản nó vốn canh** (giữ hộ, nộp / trả, hoàn) — **khuyến nghị**. Với mọi dữ liệu hôm nay nó chạy y hệt; có bài kiểm chứng nó vẫn chặn việc tất toán hai lần; đảo lại được bằng một bản cập nhật cơ sở dữ liệu mới.
   - **Giữ nguyên hàng rào.** Không đụng gì, nhưng với đơn đại lý, Kế toán mất hai việc sửa sai trên; muốn sửa phải tạo hai ba yêu cầu điều chỉnh nối nhau, mỗi yêu cầu cần người thứ hai duyệt, và lần thu vẫn ghi sai tên người thu.

   Phần còn hở của bốn lỗ đầu là tin báo, ca vàng chờ Kế toán và một quyết định của bạn; đợt 2 không dựa vào các phần đó.

   **Khuyến nghị (an toàn):** cho phép **thi công** đợt 2 ngay, nhưng **chỉ phát hành sau khi đã diễn tập khôi phục dữ liệu một lần** (HC-5.19). Diễn tập là khôi phục điểm lưu của cơ sở dữ liệu vào một bản thử, không đụng dữ liệu thật, để biết khôi phục chạy được và mất bao lâu. Nếu bạn muốn phát hành trước khi diễn tập, như lần phát hành ADR-0117 lần 2, thì bạn nói rõ chấp nhận rủi ro đó; tôi ghi nguyên câu của bạn vào sổ.

## Rủi ro phải nói thẳng

- **Dữ liệu thật.** Nền tảng đã mở cho người dùng. Lần phát hành này ghi một chiều lên đơn thật (chụp bù đơn cũ, dòng sổ mới). Lưới an toàn duy nhất là điểm khôi phục mà Cloudflare tự lưu cho cơ sở dữ liệu (gọi là Time Travel), và việc khôi phục chưa từng được thử.
- **Lùi bản không gỡ hết.** Nếu lùi Nền tảng về bản trước, phần chặn mới trong cơ sở dữ liệu vẫn ở lại; bản cũ khi đó báo lỗi khó hiểu cho đơn khách lẻ có dịch vụ nhập tay. Cách xử lý đã ghi sẵn trong hướng dẫn phát hành.
- Trước khi phát hành, bạn chạy vài câu đếm chỉ-đọc mà tôi soạn sẵn, để biết bao nhiêu đơn cũ bị ảnh hưởng ở từng nhóm trên. Ngay sau phát hành chạy thêm một câu để chắc máy đã chụp bù đủ.

## Việc của Kế toán (làm song song, không chờ thi công)

- Xác nhận sáu tình huống tính tiền ở `phieu-ke-toan.md`. **Chưa xác nhận thì phần mã sổ đợt 2 không được nhận.**
- Trước ngày phát hành (công cụ ghi mức tay đã có sẵn): cài mức hoa hồng cho mọi đơn đại lý đang chờ, và ghi mức tay cho các đơn ở hệ quả 1 và 3, để người dùng không bị giữ đơn ngay sau khi phát hành.
- Sau phát hành: bổ sung giá vốn cho các đơn ở hệ quả 2, khi chúng đã «Đã giao».

## Cách thi công (tôi khuyến nghị, không cần bạn chọn)

Kế hoạch có 15 việc (`docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-ke-hoach.md`). Mỗi việc do một trợ lý thi công và một người kiểm độc lập đọc lại, vì đây là việc chạm tiền (luật dự án bắt buộc). Toàn bộ đi trong **một lần phát hành**. Thi công ở một phiên riêng, không ở phiên lập kế hoạch này.

## Ngoài phạm vi, báo một lần

ADR-0099 (bạn duyệt ngày 3/10) cho Bán hàng đang phụ trách đơn được ghi lần thu, nhưng bản đồ quyền hiện vẫn chỉ cho Bán hàng ghi trên đơn mình lập. Việc này đã nằm trong danh sách việc tồn («đã duyệt, chưa làm»), không thuộc đợt 2; tôi nhắc lại chỉ để bạn biết nó vẫn chưa làm.
