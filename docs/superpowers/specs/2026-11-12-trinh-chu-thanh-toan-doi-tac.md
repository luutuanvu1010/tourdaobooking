# Trình chủ — thanh toán của đối tác: hai lượt duyệt (12/11/2026)

Hồ sơ có ngày; viết xong là đóng băng. Nguồn yêu cầu: chat của chủ ngày 12/11 (phiên `claude/partner-payment-system-e3f939`), chủ đã bấm «Đồng ý cả ba» cho hướng soạn. Trang này trình **văn bản**, chưa phải lời duyệt.

Mỗi lượt duyệt tối đa ba quyết định chạm tiền hoặc dữ liệu (`CLAUDE.md` §9), nên chia hai lượt. Hai lượt độc lập, duyệt lượt nào trước cũng được.

## Lượt 1 — ADR-0198: Trả sau gọn cho đối tác (2 quyết định, việc nhỏ)

Văn bản: `docs/adr/ADR-0198-doi-tac-tra-sau-gon-mac-dinh-tra-sau.md` (trang ghép ở cuối tệp).

- **Đ1.** Đối tác không còn thấy con số hạn mức ở bất cứ đâu: ô lập đơn, mục «Trả sau của tôi», câu báo khi vượt mức. Họ chỉ thấy «Bạn được trả sau…» và giờ hạn trả của từng đơn. Văn phòng vẫn thấy đủ. Máy chủ vẫn chặn vượt mức như cũ.
- **Đ2.** Đơn mới do tài khoản đối tác lập, khi được trả sau, chọn sẵn «Trả sau». Văn phòng lập đơn hộ thì vẫn chọn sẵn «Thanh toán ngay».

Không đổi dữ liệu, không đổi quyền, không xây trên lỗi đang mở. Phát hành được ngay khi xong.

## Lượt 2 — bản sửa ADR-0182: công nợ theo giá đại lý, hai phiếu, biên lai nộp tiền (3 quyết định, việc lớn)

Văn bản: `docs/adr/ADR-0182-cong-no-dai-ly-theo-gia-dai-ly.md` (bản 7/11 chưa duyệt, sửa 12/11; trang ghép ở cuối tệp).

- **Đ1 (không đổi so với bản 7/11).** Nợ của đại lý với Tour Đảo = tổng giá đại lý của đơn, trừ số Tour Đảo thật sự đã nhận và Kế toán đã xác nhận.
- **Đ2 (viết lại).** Mỗi đơn đại lý có hai phiếu với hai nút riêng:
  - «Tạo biên nhận cho khách»: mẫu 02, giá lẻ, không QR, không số tài khoản. Phiếu này hôm nay đã đúng; bản sửa thêm bài kiểm để giữ nguyên như vậy.
  - «Xem công nợ với Tour Đảo»: giá đại lý, kèm QR đúng số còn nợ. Máy chủ tính số tiền.

  Bỏ nút QR giá lẻ khỏi màn của đối tác. Sau khi đơn được xác nhận, đại lý bấm «Đã chuyển tiền» và bắt buộc kèm ảnh biên lai, cho đúng đơn đó. Khoản này chờ Kế toán xác nhận rồi mới trừ nợ.
- **Đ3.** Thêm ô quyền: đại lý ghi khoản nộp; Kế toán và Toàn quyền xác nhận; người xem phiếu và biên lai là Kế toán, Toàn quyền, Quản trị và chính đại lý.

**Xây trên lỗi đang mở:** bản 7/11 ghi lượt này chạm vùng của hai lỗi `TNV-G1` (sổ tiền đơn huỷ) và `HC-5.19` (chưa diễn tập khôi phục dữ liệu). Bản sửa thêm một bảng khoản nộp, một bảng ảnh và dòng sổ mới, nên chủ phải nói rõ có cho xây hay không, và phát hành trước hay sau buổi diễn tập 25/11.

**Điều chưa xây và chủ cần biết:** đường ghi sổ hiện nay từ chối khoản nộp lớn hơn số đại lý đang giữ, nên phải làm cách ghi mới (Đ2 mục 9). Đây là phần nặng nhất của lượt 2.

## Chữ chờ chủ chọn

Hai nút «Tạo biên nhận cho khách» và «Xem công nợ với Tour Đảo» dùng nguyên chữ chủ. Các chữ còn lại để ở bảng «Chữ chờ chủ chọn» của từng văn bản, kèm khuyến nghị; chủ không sửa thì dùng khuyến nghị.

## Câu duyệt mẫu (chép, hoặc sửa)

> Duyệt ADR-0198 theo văn bản, chữ theo khuyến nghị.
>
> Duyệt bản sửa ADR-0182 theo văn bản, chữ theo khuyến nghị. Cho phép, có ghi lý do (xây trên lỗi TNV-G1 và HC-5.19, vì chỉ thêm bảng mới và dòng sổ mới, không nới luật của lỗi); chỉ phát hành sau diễn tập khôi phục 25/11.

Khuyến nghị «sau diễn tập» cho lượt 2 vì lượt này ghi dòng sổ tiền mới. Chủ muốn phát hành trước thì sửa vế cuối.
