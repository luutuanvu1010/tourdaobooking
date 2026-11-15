# Trình chủ — đại lý nộp tiền kèm biên lai (lần duyệt 3, 13/11/2026)

Hồ sơ có ngày, viết xong là đóng băng. Nguồn: chat của chủ ngày 13/11, nguyên văn: «làm nốt phần đại lý bấm Đã chuyển tiền và kèm biên lai, bước này nên ở sau bước gửi đơn (để ưu tiên việc gửi đơn hàng, và coi phần bổ sung biên lai là bước sau». Văn bản được trình: `docs/adr/ADR-0182-cong-no-dai-ly-theo-gia-dai-ly.md`, phần B (Đ2 mục 4–13, Đ3).

## Đại lý sẽ làm thế nào

1. Đại lý lập đơn và bấm «Gửi đơn» như hôm nay. Lúc này không có ô biên lai, không hỏi gì về tiền nộp.
2. Gửi xong, màn hình nhắc chuyển tiền và gửi biên lai ở mục «Xem công nợ với Tour Đảo». Phần lớn đơn được xác nhận ngay khi gửi, nên làm được luôn. Đơn có dịch vụ cần văn phòng xác nhận thì phải chờ văn phòng xác nhận xong.
3. Khi đơn đã xác nhận, đại lý mở phiếu công nợ, quét mã QR theo giá đại lý để chuyển tiền, rồi bấm «Đã chuyển tiền», đính kèm ảnh biên lai.
4. Trong form này có một dòng «Khách đã trả bạn X ₫». Máy ghi luôn dòng này, vì đại lý là người thu tiền của khách. Nếu đại lý đã ghi trước một phần thì máy chỉ ghi phần còn thiếu. Với đơn Trả sau, xem thêm ở mục dưới.
5. Kế toán đối chiếu với sao kê ngân hàng, rồi bấm xác nhận hoặc từ chối có lý do. Khi xác nhận, khoản tiền được trừ vào nợ của đại lý.

Văn bản đã qua một vòng kiểm độc lập chỉ đọc ngày 13/11, đối chiếu với mã thật. Người kiểm xác nhận cách ghi sổ và cổng vé mới cho kết quả đúng, không trả hoa hồng hai lần. Người kiểm tìm ra bốn lỗi vừa, gồm câu nhắc sai nhánh, ô quyền xem phiếu, phạm vi tài khoản và chặn bấm hai lần; tôi đã sửa cả bốn. Chưa có mã nên chưa chạy thử.

## Ba quyết định cần bạn duyệt

**Quyết định 1 — Nộp tiền theo từng đơn, kèm biên lai, Kế toán xác nhận.** Cách làm như năm bước trên, ghi sổ theo cách 1 mà bạn đã chọn hôm 12/11. Máy chặn khai trùng: số tiền khai không được vượt số còn nợ, trừ đi các khoản đang chờ. Kế toán cũng không thể ghi lại lần chuyển tiền đó bằng đường cũ khi khoản này còn đang chờ. Phần này phải thêm hai bảng dữ liệu mới, một bảng cho khoản nộp và một bảng cho ảnh biên lai.

**Quyết định 2 — Vé của đơn đại lý mở khi Tour Đảo đã nhận đủ giá đại lý.** Hôm 13/11, khi đọc lại mã, tôi thấy bản trình hôm 12/11 viết sai một điểm. Với đơn do đối tác lập, hôm nay vé chỉ mở khi tiền về công ty đủ **giá lẻ**. Nếu đại lý chỉ nộp giá đại lý thì vé sẽ không bao giờ mở. Vì vậy cần đổi luật: vé mở khi khách đã trả đủ, và Tour Đảo đã nhận đủ giá đại lý đã được Kế toán xác nhận. Đây là chỗ duy nhất được nới ra: vé mở sớm hơn hôm nay, và phần hoa hồng ở lại tay đại lý trước khi giao dịch vụ. Đơn do văn phòng lập và đơn Trả sau không đổi.

**Quyết định 3 — Thêm ô quyền mới.** Đại lý được ghi khoản nộp của chính đơn mình. Kế toán và Toàn quyền được xác nhận. Quản trị chỉ được xem.

## Điều bạn cần biết trước khi duyệt

- Với đơn trả trước, vé mở sau khi Kế toán bấm xác nhận, không mở ngay lúc đại lý gửi biên lai.
- Với đơn Trả sau, nếu đại lý muốn nộp tiền trước khi khách trả thì vẫn phải khai «Khách đã trả bạn», vì sổ hôm nay không có chỗ ghi tiền đại lý tự ứng.
- Phần này đụng hai lỗi an toàn chưa sửa xong. Một là tiền của đơn đã huỷ: nếu đơn huỷ sau khi vé đã mở, phần hoa hồng còn ở tay đại lý. Hai là chưa diễn tập lấy lại dữ liệu khi có sự cố, trong khi phần này có thêm bảng dữ liệu mới. Lời bạn cho phép làm phần A hôm qua không áp sang phần này, nên bạn cần trả lời lại.
- Nếu Kế toán từ chối khoản nộp thì dòng «Khách đã trả bạn» vẫn được giữ, tức sổ vẫn ghi đại lý đang cầm tiền của khách.
- Mỗi đơn chỉ có một khoản nộp đang chờ Kế toán cùng lúc. Đại lý bấm hai lần thì lần sau bị chặn.
- Tôi hiểu «sau bước gửi đơn» là «sau khi gửi, và khi đơn đã được xác nhận». Lý do: trước lúc xác nhận, máy chưa có giá đại lý chốt để chặn khai trùng. Nếu bạn muốn cho gửi biên lai cả khi đơn còn chờ văn phòng thì nói một câu, nhưng tôi không khuyến nghị.
- Chữ trên giao diện dùng khuyến nghị trong bảng «Chữ chờ chủ chọn» của văn bản, như lời duyệt hôm 12/11.

## Câu duyệt mẫu (chép nguyên, hoặc sửa)

> Duyệt lần 3 theo khuyến nghị. Cho phép xây trên hai lỗi, có lý do. Phát hành sau diễn tập 25/11.

Nếu muốn phát hành ngay khi làm xong, không chờ diễn tập, bạn thay câu cuối bằng «Phát hành trước diễn tập».
