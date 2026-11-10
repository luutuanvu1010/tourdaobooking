# Trình chủ — ADR lượt C (biên lai chuyển khoản, ô cọc của khách cho đơn Trả sau)

> Đề xuất, chờ chủ duyệt. Chi tiết: ADR-0196, ADR-0197 ở `docs/adr/`, trang ghép `docs/superpowers/specs/2026-11-10-trang-ghep-adr-luot-c.md`. Hồ sơ có ngày: duyệt xong thì đóng băng. Việc thứ ba bạn nêu 8/11 (mặc định Trả sau hay Thanh toán ngay) chưa vào lượt này, vì còn lời cấm cấp hạn mức Trả sau thật.

**Kết luận.** Lượt này gồm hai việc bạn yêu cầu hôm 8/11. Việc thứ nhất: Đối tác báo đã chuyển khoản cho Công ty thì bắt buộc kèm ảnh biên lai, Kế toán bấm xem ngay cạnh nút xác nhận đã nhận tiền. Việc thứ hai: ô tiền khách đặt cọc luôn có trên đơn Đối tác lập, kể cả đơn Trả sau, và tiền cọc ở tay Đối tác không làm giảm nợ với Công ty. Bạn cần trả lời ba câu dưới đây; mỗi câu có sẵn phương án tôi khuyến nghị ở dòng đầu, hết giờ không trả lời thì máy theo dòng đó.

## Câu (a) — Bắt buộc ảnh biên lai khi nào?

- **(Khuyến nghị) Chỉ khi tài khoản Đối tác ghi khoản thu chọn «Công ty» và «Chuyển khoản».** Đây đúng là bước Đối tác báo đã chuyển tiền cho Công ty. Đối tác chỉ có một chỗ để ghi khoản này nên luật gọn, khó lách. Nhân viên Công ty ghi thì không bị đòi ảnh.
- Mọi người không phải Kế toán ghi «Công ty, chuyển khoản» đều phải kèm ảnh (thêm Bán hàng, Hướng dẫn viên, Quản trị). Chặt hơn, nhưng nhân viên phải chụp ảnh cả khi khách chuyển thẳng vào tài khoản Công ty.
- Như trên, cộng thêm khoản «khách trả cho đại lý hoặc tại quầy nhà cung cấp». Chặt nhất, việc nhập nặng nhất.

Ảnh chỉ để Kế toán xem: tiền vẫn ở trạng thái chờ Kế toán xác nhận như hôm nay. Người xem được ảnh là Kế toán, Toàn quyền và chính Đối tác đã gửi; Quản trị và Bán hàng không xem được. Ảnh gửi nhầm thì Toàn quyền gỡ, phải ghi lý do.

## Câu (b) — Tên ô tiền cọc

- **(Khuyến nghị) «Khách đặt cọc cho đối tác»** — giữ ý của bạn, dùng đúng chữ «đối tác» như tên tài khoản, ngắn hơn cho màn điện thoại.
- «Khách hàng đặt cọc cho đối tác» — đúng nguyên văn bạn viết hôm 8/11.
- «Khách đặt cọc cho đại lý» — tên trong một đề xuất cũ (ADR-0183, chưa duyệt); «đại lý» khác chữ tên tài khoản.

Tên mới áp cho mọi chỗ người dùng thấy. Biên nhận gửi khách vẫn ghi «Khách đã trả trước» như hôm nay. Đề xuất cũ ADR-0183 tôi đã sửa để dùng chung đúng tên bạn chọn ở đây, không còn hai tên.

## Câu (c) — Đơn Trả sau còn tiền cọc ở tay Đối tác mà khách huỷ thì sao?

Tôi đã kiểm trong mã: cách «cấm huỷ tới khi Kế toán xử lý» không làm Nền tảng kẹt hẳn, vì Kế toán ghi được «Đối tác đã nộp về Công ty» trên đơn chưa huỷ. Nhưng lối thoát đó phụ thuộc Đối tác chịu nộp tiền. Nếu Đối tác không nộp thì đơn cứ ở «Đã xác nhận», xe vẫn được xếp cho chuyến khách đã bỏ.

- **(Khuyến nghị) Đối tác không tự huỷ được; văn phòng huỷ được.** Văn phòng huỷ thì tiền cọc đi đúng đường của đơn huỷ đang chạy: mặc định Công ty giữ cọc, Đối tác còn nợ số đó trên sổ; Công ty muốn hoàn cho khách thì một người duyệt, một người khác chi. Trong lúc chờ Kế toán kết luận, Đối tác đó không khai được cọc mới. Có người của Công ty nhìn đơn trước khi huỷ, mà đơn không bao giờ bị kẹt.
- Cấm mọi người huỷ tới khi Kế toán ghi Đối tác đã nộp đủ tiền cọc. Chặt nhất về tiền, nhưng có thể kẹt đơn như đã nói ở trên. Khách đổi ý cũng phải chờ tiền về Công ty rồi mới hoàn được.
- Cho huỷ như đơn thanh toán ngay, kể cả Đối tác tự huỷ. Không cần thêm luật nào, nhưng không ai ở Công ty nhìn đơn lúc huỷ.

**Phải biết:** khi một đơn Trả sau đã huỷ, số cọc Đối tác còn nợ không hiện ở màn «Hạn mức trả sau» mà chỉ hiện ở sổ giữ hộ và màn cọc đơn huỷ. Ngoài ra còn một kẽ có sẵn mà lượt này chưa đóng: Đối tác tự ghi «Tôi thu» rồi tự huỷ đơn Trả sau khi vé chưa mở thì hạn mức cũng được trả lại phần đó. Muốn đóng kẽ này thì cần một quyết định riêng.

## Hai lỗi đang mở mà lượt này đi qua

Việc biên lai cần thêm một bảng và một kho ảnh mới, trong khi dữ liệu chưa từng được diễn tập khôi phục (lỗi HC-5.19, hạn 31/12). Việc ô cọc không thêm bảng nào, nhưng đơn Trả sau có cọc mà bị huỷ sẽ đi đường tiền của đơn huỷ (lỗi TNV-G1, hạn 31/12). Cả hai việc chỉ thêm chặn, không nới luật của hai lỗi đó, nên tôi xin bạn cho phép.

Riêng việc biên lai, bạn cần tự chạy một lệnh tạo kho ảnh trước lần triển khai. Tôi sẽ đưa nguyên lệnh khi tới bước đó.

## Câu duyệt mẫu (chép nguyên rồi gửi, hoặc sửa)

> Duyệt ADR-0196 và ADR-0197 theo khuyến nghị: (a) chỉ Đối tác ghi «Công ty, chuyển khoản» mới bắt buộc ảnh; (b) tên ô «Khách đặt cọc cho đối tác»; (c) Đối tác không tự huỷ đơn Trả sau còn cọc, văn phòng huỷ được. Với ADR-0196: Cho phép, có ghi lý do (xây trên lỗi HC-5.19, vì chỉ thêm một bảng ảnh và một kho mới), phát hành sau diễn tập khôi phục. Với ADR-0197: Cho phép, có ghi lý do (xây trên lỗi TNV-G1, vì không thêm bảng, chỉ siết đường huỷ), phát hành ngay khi xong, không chờ diễn tập.

Muốn biên lai lên sớm hơn thì đổi cụm cuối của ADR-0196 thành «phát hành trước diễn tập» (như bạn đã cho với công tắc thu tiền đối tác hôm 6/11). Nếu chưa muốn cho xây trên lỗi đang mở, gửi câu: «Duyệt ADR-0197; ADR-0196 chờ diễn tập khôi phục.»
