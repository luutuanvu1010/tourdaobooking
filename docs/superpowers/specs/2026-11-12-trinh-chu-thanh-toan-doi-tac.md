# Trình chủ — thanh toán của đối tác: ba lượt duyệt (12/11/2026)

Hồ sơ có ngày; viết xong là đóng băng. Nguồn yêu cầu: chat của chủ ngày 12/11 (phiên `claude/partner-payment-system-e3f939`). Chủ đã bấm «Đồng ý cả ba» cho hướng soạn. Trang này trình **văn bản**, chưa phải lời duyệt. Văn bản đã qua một vòng kiểm độc lập chỉ đọc (12/11); bốn phát hiện mức vừa đã sửa trong văn bản.

Mỗi lượt duyệt tối đa ba quyết định chạm tiền hoặc dữ liệu (`CLAUDE.md` §9), nên tôi chia làm ba lượt. Lượt 1 độc lập với hai lượt kia. Lượt 3 phải duyệt sau lượt 2. ADR-0183 (biên nhận, cọc, thu hộ) còn treo, sẽ trình ở lượt riêng sau.

## Lượt 1 — ADR-0198: Trả sau gọn cho đối tác (2 quyết định)

Văn bản: `docs/adr/ADR-0198-doi-tac-tra-sau-gon-mac-dinh-tra-sau.md`.

- **Đ1.** Đối tác không còn thấy con số hạn mức ở ô lập đơn, ở mục «Trả sau của tôi» và trong câu báo khi vượt mức. Họ chỉ thấy «Bạn được trả sau…» kèm giờ hạn trả. Văn phòng vẫn thấy đủ, và máy chủ vẫn chặn vượt mức như cũ.
- **Đ2.** Đơn mới do tài khoản đối tác lập, khi được trả sau, chọn sẵn «Trả sau». Văn phòng lập đơn hộ thì vẫn chọn sẵn «Thanh toán ngay».

Lượt này không đổi dữ liệu, không đổi quyền. Phát hành được ngay khi làm xong.

## Lượt 2 — ADR-0182 phần A: tính nợ theo giá đại lý, hai phiếu, QR (2 quyết định)

Văn bản: `docs/adr/ADR-0182-cong-no-dai-ly-theo-gia-dai-ly.md`, gồm Đ1 và Đ2 mục 1–3.

- **Đ1.** Nợ của đại lý với Tour Đảo = tổng giá đại lý, trừ số Tour Đảo thật sự đã nhận và Kế toán đã xác nhận.
- **Đ2 phần A.** Mỗi đơn đại lý có hai nút. Nút «Tạo biên nhận cho khách» mở mẫu 02: giá lẻ, không QR, không số tài khoản. Nút «Xem công nợ với Tour Đảo» mở phiếu theo giá đại lý, kèm QR đúng số còn nợ do máy chủ tính. Nút QR theo giá lẻ bị bỏ khỏi màn của đối tác; văn phòng vẫn giữ nút này.

## Lượt 3 — ADR-0182 phần B: đại lý nộp tiền kèm biên lai (2 quyết định + 1 câu về lỗi đang mở)

Văn bản: cùng tệp, Đ2 mục 4–10 và Đ3.

- **Đ2 phần B.** Sau khi đơn được xác nhận, đại lý bấm «Đã chuyển tiền» và kèm ảnh biên lai (bắt buộc) cho đúng đơn đó. Kế toán xác nhận thì nợ mới giảm. Máy chặn khai trùng: tổng các khoản đang chờ không được vượt số còn nợ. Phần này cần làm cách ghi sổ mới, vì đường ghi hiện nay từ chối khoản nộp lớn hơn số đại lý đang giữ. Đây là phần nặng nhất.
- **Đ3.** Thêm ô quyền: đại lý ghi khoản nộp; Kế toán và Toàn quyền xác nhận; người xem phiếu và biên lai là Kế toán, Toàn quyền, Quản trị và chính đại lý đó.
- **Lỗi đang mở:** lượt này thêm bảng mới và dòng sổ tiền mới trong vùng của hai lỗi chưa đóng: `TNV-G1` (sổ tiền đơn huỷ) và `HC-5.19` (chưa diễn tập khôi phục dữ liệu). Bạn cần nói rõ có cho xây trên vùng đó không.

## Chữ chờ chủ chọn

Hai nút «Tạo biên nhận cho khách» và «Xem công nợ với Tour Đảo» dùng nguyên chữ của bạn. Các chữ còn lại nằm ở bảng «Chữ chờ chủ chọn» trong từng văn bản, mỗi chữ có khuyến nghị. Bạn không sửa thì dùng khuyến nghị.

## Câu duyệt mẫu (chép nguyên, hoặc sửa)

> Duyệt ADR-0198, chữ theo khuyến nghị.
>
> Duyệt ADR-0182 phần A (Đ1, Đ2 mục 1–3), chữ theo khuyến nghị.
>
> Duyệt ADR-0182 phần B (Đ2 mục 4–10, Đ3). Cho phép, có ghi lý do (xây trên lỗi TNV-G1 và HC-5.19, vì chỉ thêm bảng mới và dòng sổ mới, không nới luật của lỗi); chỉ phát hành sau diễn tập khôi phục 25/11.

Tôi khuyến nghị lượt 3 phát hành «sau diễn tập» vì lượt này ghi dòng sổ tiền mới. Nếu bạn muốn phát hành sớm hơn thì sửa vế cuối của câu thứ ba.
