# Trang trình ADR-0113 — chặn "Từ chối chuyến" khi có khách chuyển vào (2026-10-12, đề xuất)

Tôi đã soạn đề xuất theo đúng lựa chọn bạn nói hôm nay: tài xế đối tác không được bấm "Từ chối chuyến" khi chuyến của họ đang có khách vừa được xe khác chuyển sang. Chưa sửa mã, chưa chép vào thư mục quyết định; chờ bạn duyệt.

**Vì sao cần chặn.** Khi tài xế xe nhận đã nhận khách rồi từ chối, chuyến đó mất tài xế và bị giữ lại không cho xuất bến. Khách thì đã rời xe cũ nên tài xế xe cũ không còn thấy họ, và không ai báo cho tài xế xe cũ biết. Văn phòng vẫn nhận tin "tài xế đã từ chối", nhưng tin không nói chuyến đó có khách vừa chuyển sang. Việc này chỉ xảy ra trong khoảng hẹp (xe cũ đã chạy, xe nhận còn trước hạn từ chối, mặc định 12 giờ), và hôm nay màn hình chưa đưa tài xế đối tác vào danh sách xe nhận, nên chủ yếu chỉ xảy ra khi gọi thẳng vào hệ thống. Mức Vừa, không mất dữ liệu.

**Sẽ làm gì.** Nền tảng trả lỗi "Chuyến này đang có khách được chuyển từ xe khác sang nên chưa từ chối được — hãy gọi văn phòng để đổi người", không nói tên khách hay mã đơn. Màn hình tài xế hiện câu đó thay vì nút Từ chối. Văn phòng xử lý bằng hai việc đã có: đổi người lái, hoặc dời khách khỏi chuyến; hết khách chuyển vào thì chặn tự hết. Không cần thêm bảng hay đổi quyền. Chưa có nút "huỷ chuyển"; muốn có là một việc mới.

**Một quyết định cần bạn.** Bạn có duyệt ADR-0113 như trên không? Khuyến nghị: duyệt.

Có một câu nữa, không gấp: danh sách xe nhận hôm nay chỉ có tài xế công ty, dù quyết định cũ ADR-0053 đã cho nhờ đón qua lại với tài xế đối tác. Tôi khuyên mở danh sách cho khớp, sau khi lệnh chặn trên chạy. Bạn chưa trả lời thì tôi giữ nguyên như hôm nay.

Chi tiết (tệp mã, cách kiểm, kế hoạch thử): `de-xuat-adr-0113.md` cùng thư mục.
