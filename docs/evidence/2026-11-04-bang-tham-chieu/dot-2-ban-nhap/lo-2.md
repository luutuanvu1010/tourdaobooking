# Lô 2: đề xuất tên cho 25 việc (chỉ số mảng 26–50, stt 57–145)

Cách đọc: «Giữ» nghĩa là chữ đang hiện đã tốt; nhiều việc đã có chữ trong mục «Chữ dùng chung» của bảng tham chiếu (Sửa, Nhận, Rút lại, Điều chỉnh, Từ chối, Thôi, Thu hồi, Gửi đề nghị…) nên không cần đặt tên mới.

### 57. Hành khách trên đơn — hiện: «Huỷ người (đơn đã xác nhận) · Xoá (đơn nháp)»
- Nút làm gì: bỏ một dòng tên khách nhập nhầm khỏi danh sách hành khách; không đổi số khách đã tính tiền, không đổi tiền, không huỷ dịch vụ.
- Đề xuất: (a) «Bỏ khỏi danh sách» cho cả hai nơi (b) «Bỏ tên khách» (c) giữ «Huỷ người» / «Xoá» — Khuyến nghị: (a), vì một việc hai lối vào thì cùng một tên, và chữ «Huỷ» trong bảng chỉ dành cho việc ghi dữ liệu có tên đầy đủ (Huỷ đơn, Huỷ khoản thu) nên «Huỷ người» dễ bị hiểu là huỷ cả khách.
- Cần lưu ý: hộp hỏi đổi theo thành «Bỏ <tên> khỏi danh sách? (dùng khi nhập nhầm)»; nút chốt trong hộp cũng «Bỏ khỏi danh sách»; «Thôi» giữ (đã nằm trong chữ dùng chung). Mã gọi nút này là `huy-nguoi` / `xoa-khach`, không hiện cho người dùng.

### 62. Sửa thông tin chuyến — hiện: «Lưu thông tin chuyến»
- Nút làm gì: lưu ngày khởi hành, giờ, nơi khách có mặt, ghi chú từng dịch vụ của đơn đã xác nhận.
- Đề xuất: (a) giữ «Lưu thông tin chuyến» (b) «Lưu sửa» (c) «Lưu» — Khuyến nghị: (a), vì khớp đúng tiêu đề bảng «Sửa thông tin chuyến» và khái niệm «Thông tin chuyến» của bảng; (b) cũng hợp lệ nhưng mất chữ nói rõ đang lưu cái gì.
- Cần lưu ý: không nhầm với «Lưu chuyến» ở Điều phối (việc 121), đó là chuyến xe.

### 63. Việc của tôi: trả đơn — hiện: «Từ chối đơn»
- Nút làm gì: người đang phụ trách trả đơn lại để đơn về danh sách «Chờ nhận», người khác nhận; không huỷ đơn, không đổi gì với khách.
- Đề xuất: (a) «Trả đơn» (b) giữ «Từ chối đơn» (c) «Trả lại đơn» — Khuyến nghị: (a), vì màn hình đã nói «được trả lại», nhóm việc tên «trả đơn», và «Từ chối» dễ bị hiểu là từ chối khách hay huỷ đơn.
- Cần lưu ý: độ tin cậy vừa, chủ muốn ít đổi thì chọn (b). Nếu đổi: tiêu đề hộp «Từ chối đơn <mã>?» → «Trả đơn <mã>?», nút chốt «Xác nhận từ chối» → «Xác nhận trả đơn», nút thoát «Không từ chối» → «Thôi» (đúng chữ dùng chung); cùng nút ở Chi tiết đơn › khối Người phụ trách phải đổi theo; mục «Từ chối đơn» trong bảng «Tên dùng ở nhiều hàng việc» và các bài Hướng dẫn nhắc nút này.

### 64. Việc của tôi: nhận đơn — hiện: «Nhận · Đang nhận…»
- Nút làm gì: tự nhận làm người phụ trách một đơn chưa có ai; ai bấm trước được.
- Đề xuất: (a) giữ «Nhận» (b) «Nhận đơn» (c) «Nhận việc» — Khuyến nghị: (a), vì «Nhận» đã có trong chữ dùng chung (đứng trên thẻ đơn chờ nhận) và thẻ ngay cạnh nói rõ đơn nào.
- Cần lưu ý: cùng chữ với «Nhận» của đề nghị chuyển khách (việc 143), hai việc khác nghĩa nhưng bảng đã chấp nhận vì ngữ cảnh khác hẳn.

### 65. Việc của tôi: sửa số khách (hướng dẫn viên) — hiện: «Sửa số khách»
- Nút làm gì: hướng dẫn viên ghi số khách thực tế từng loại kèm lý do, máy tính lại tiền (người này không thấy giá).
- Đề xuất: (a) giữ «Sửa số khách» (b) «Báo số khách thực tế» (c) «Đổi số khách» — Khuyến nghị: (a), vì cùng việc với «Sửa số khách dịch vụ» của văn phòng nên cùng gốc chữ; «Sửa» là chữ dùng chung; «Đổi» chỉ dùng cạnh một giá trị đang chọn.
- Cần lưu ý: nút chốt «Xác nhận» và «Đóng» đã nằm trong chữ dùng chung.

### 66. Việc của tôi: huỷ đơn — hiện: «Huỷ đơn» / «Không huỷ»
- Nút làm gì: huỷ cả đơn của khách (không hoàn tác), có chọn lý do.
- Đề xuất: (a) giữ «Huỷ đơn» + «Không huỷ» (b) «Huỷ đơn» + «Thôi» (c) «Huỷ đơn này» — Khuyến nghị: (a), vì «Huỷ đơn» đã chốt cùng một việc ở ba lối vào, và vì việc không hoàn tác được nên nút thoát nói rõ «Không huỷ» an toàn hơn «Thôi»; chữ này lại đang dùng ở trang đơn và bảng kiểm vé.
- Cần lưu ý: «Giữ đơn» đã bị loại vì trùng «Đang giữ đơn».

### 70. Vé điện tử: giao vé — hiện: «Gửi Zalo»
- Nút làm gì: mở bảng chia sẻ của điện thoại với ảnh vé; người bấm chọn gửi cho ai, bằng ứng dụng nào.
- Đề xuất: (a) giữ «Gửi Zalo» (b) «Gửi vé cho khách» (c) «Chia sẻ vé» — Khuyến nghị: (a), vì cách làm thật của công ty là gửi qua Zalo và khớp cách nói thường ngày; (b) đúng hơn nếu chủ muốn chữ không nhắc Zalo.
- Cần lưu ý: chưa chắc: khi người bấm chọn ứng dụng khác Zalo, nhật ký vẫn ghi «Giao N vé qua Zalo» (theo mô tả của dòng việc, tôi chưa đọc mã ghi nhật ký). Đây là chữ nhật ký, không phải chữ nút; nếu chọn (b) thì nên đổi cả câu nhật ký.

### 71. Vé điện tử: giao vé — hiện: «Tạo đường dẫn cho khách · Sao chép»
- Nút làm gì: tạo đường dẫn riêng để khách tự mở vé (hiện đúng một lần); mọi vé của đơn bị đóng dấu «đã lộ».
- Đề xuất: (a) giữ cả hai (b) «Tạo đường dẫn vé» + «Chép đường dẫn» (c) «Lấy đường dẫn cho khách» — Khuyến nghị: (a), vì nói rõ đối tượng là khách, «Sao chép» đứng ngay cạnh đường dẫn vừa hiện và thông báo «Đã sao chép đường dẫn.» khớp.
- Cần lưu ý: «Thu hồi» ở cùng khối đã nằm trong chữ dùng chung.

### 80. Hoa hồng: ngừng một dòng mức — hiện: «Ngừng»
- Nút làm gì: đặt ngày cuối áp dụng cho một dòng mức hoa hồng.
- Đề xuất: (a) giữ «Ngừng» (b) «Ngừng mức» (c) «Kết thúc» — Khuyến nghị: (a), vì «Ngừng» đã là khái niệm chung của bảng (đặt ngày cuối cho dòng mức, cấp, điều kiện, điều khoản); «Kết thúc» dành cho dòng giá, công việc, quan hệ.
- Cần lưu ý: nút nằm trong menu «⋯» của dòng và hộp tiêu đề «Ngừng» nên dòng đang xem đứng ngay cạnh; không đổi gì.

### 84. Hoa hồng: vai trò thôi theo cấp — hiện: «Thôi theo cấp này»
- Nút làm gì: đặt ngày cuối cho lần cả vai trò theo một cấp; từ đó mọi đối tác của vai trò (trừ ai có mức/cấp riêng) không còn mức theo cấp.
- Đề xuất: (a) «Ngừng áp dụng cấp» (b) «Ngừng cấp cho vai trò» (c) giữ «Thôi theo cấp này» — Khuyến nghị: (a), vì «Ngừng» là chữ chung cho việc đặt ngày cuối, «Thôi theo cấp này» nghe như chỉ một người; vai trò là cả nhóm.
- Cần lưu ý: cùng chữ «Thôi theo cấp này» còn dùng cho cấp riêng của MỘT đối tác (hộp ở trang Hoa hồng và mục «Hoa hồng hiện hành» của hồ sơ). Hai việc khác tầm ảnh hưởng không được trùng tên; việc cấp riêng nên là «Ngừng cấp riêng» (khớp khái niệm «Cấp riêng»), phần đó thuộc lô khác nên cần phối hợp. Nút lưu trong hộp đang là «Lưu», giữ. Nếu đổi: `nhanViec` trong `src/shared/hoa-hong-hien-thi.ts` và tiêu đề hộp (`web/hoa-hong-hop.ts`) đổi theo; câu hoàn tác nhắc «Chọn cấp cho vai trò này» giữ.

### 90. Hoa hồng: sửa tên và ghi chú — hiện: «Sửa»
- Nút làm gì: chỉ đổi tên và ghi chú của một cấp hoặc một vai trò; không đổi mức, ngày, người theo.
- Đề xuất: (a) giữ «Sửa» (b) «Sửa tên» (c) «Sửa tên và ghi chú» — Khuyến nghị: (a), vì «Sửa» đứng trên dòng của mục cần sửa là chữ chung đã chốt, tiêu đề hộp («Sửa cấp độ đại lý» / «Sửa vai trò») nói rõ đối tượng; «Đổi tên» có nghĩa riêng (nhóm dịch vụ, tuyến) nên không dùng.
- Cần lưu ý: trong hộp còn nút «Mở lại» (hiện khi bản đang sửa đã cũ, mở lại bản mới). Chữ «Mở lại» dễ lẫn «mở lại cấp» đã khoá (câu «Đã mở lại cấp.»); chưa chắc có nên đổi, nên chỉ báo, không đề xuất tên.

### 96. Tài khoản: đặt cấp riêng cho một tài khoản — hiện: chữ trong ô cột «Cấp độ đại lý» (ví dụ «Đại lý cấp 2 (theo vai trò)»), bấm để mở hộp
- Nút làm gì: bấm chữ trong ô mở hộp đặt hoặc đổi cấp riêng cho đúng tài khoản đối tác đó.
- Đề xuất: (a) giữ chữ trong ô, tiêu đề hộp «Cấp độ đại lý: <tên>» (b) thêm chữ nhỏ «Đổi» cạnh ô (c) đổi chữ trong ô thành «Đặt cấp riêng» — Khuyến nghị: (a), vì chữ trong ô là DỮ LIỆU (tên cấp đang theo), không phải tên nút, bảng không đặt tên cho dữ liệu; hộp bên trong dùng lại «Chọn cấp riêng cho đối tác» / «Dùng cấp theo vai trò» / «Lưu» đã chốt.
- Cần lưu ý: chưa chắc: người dùng có biết chữ này bấm được hay không (tôi chưa nhìn giao diện thật); nếu chủ muốn rõ hơn thì chọn (b), «Đổi» đúng nghĩa chữ chung (đứng cạnh giá trị đang chọn).

### 98. Luật bán: thêm luật chặn — hiện: «＋ Thêm luật»
- Nút làm gì: mở hộp tạo luật chặn một vai trò đặt một dịch vụ, nhóm, hoặc giá trị đặc điểm.
- Đề xuất: (a) giữ «＋ Thêm luật» (b) «＋ Thêm luật chặn» (c) «＋ Thêm luật bán» — Khuyến nghị: (a), vì trang đã tên «Luật bán», hộp tiêu đề «Thêm luật bán», chốt «Thêm luật»; «Thêm» là chữ chung đứng ngay dưới danh sách.
- Cần lưu ý: dấu «＋» ở đây là ký tự rộng, còn «+ Chuyến mới» dùng dấu cộng thường; chỉ là hình thức, không thuộc tên.

### 107. Khoá sổ tháng — hiện: «Khoá tháng MM/YYYY» → «Xác nhận khoá tháng MM/YYYY»
- Nút làm gì: khoá một tháng đã qua; sau đó không ghi thêm tiền vào tháng đó, không mở lại.
- Đề xuất: (a) giữ cả hai (b) «Khoá sổ tháng MM/YYYY» + «Khoá luôn» (c) «Khoá tháng» + «Xác nhận» — Khuyến nghị: (a), vì «Khoá tháng» là khái niệm đã chốt (ADR-0080), có ngày tháng trong chữ nên không nhầm tháng, và hộp hỏi có câu cảnh báo «KHÔNG mở lại được».
- Cần lưu ý: không.

### 109. Phân định: ghi sổ — hiện: «Ghi sổ theo phân định» → «Ghi sổ»
- Nút làm gì: ghi tiền thật theo quyết định phân định: giảm trừ phải thu, ghi nợ bên chịu, hoàn tiền khách nếu có.
- Đề xuất: (a) giữ cả hai (b) «Ghi sổ phân định» (c) «Ghi sổ quyết định» — Khuyến nghị: (a), vì nút mở hộp tên đúng như hộp, nút chốt là «Ghi sổ» ngay trong hộp đó, và nó khác «Ghi sổ lần đổi bên chịu» (tên dài hơn nên không trùng).
- Cần lưu ý: «Ghi sổ» chung chung nhưng hộp luôn nói rõ phiếu nào; chưa chắc người dùng có nhầm với «Ghi khoản thu» không (tôi chưa thử).

### 113. Phân định: bên chịu phản hồi — hiện: «Phản hồi» → «Gửi phản hồi»
- Nút làm gì: bên chịu gửi một dòng chữ vào phiếu và nhắn người đã phân định; không đổi số nợ, không tạm dừng.
- Đề xuất: (a) giữ cả hai (b) «Trả lời» + «Gửi» (c) «Ý kiến của tôi» + «Gửi ý kiến» — Khuyến nghị: (a), vì chữ «Phản hồi» đã dùng khắp màn («Phản hồi của <tên>», «Phản hồi trong 3 ngày làm việc») nên đổi sẽ lệch; «Gửi phản hồi» khớp chữ chung «Gửi» đứng dưới ô đang gõ.
- Cần lưu ý: «Phản hồi» không được hiểu là «đòi xem xét lại» (không có); câu hướng dẫn hiện đã nói rõ hạn 3 ngày chỉ để nhắc.

### 120. Tạo chuyến — hiện: «+ Chuyến mới»
- Nút làm gì: mở hộp tạo một chuyến xe trống cho ngày đang xem (chọn xe, tài xế, giờ); nút chốt trong hộp là «Tạo chuyến».
- Đề xuất: (a) giữ «+ Chuyến mới» (b) «+ Thêm chuyến» (c) «+ Tạo chuyến» — Khuyến nghị: (a), vì tiêu đề hộp «Chuyến mới · ngày» khớp, lại có sẵn ở hộp «Xếp vào chuyến» và đã quen; khái niệm là «Chuyến xe».
- Cần lưu ý: cùng việc tạo chuyến có lối vào trang đầy đủ (trang `/chuyen-sua`) đang ghi «Lưu chuyến»; xem việc 121.

### 121. Tạo chuyến — hiện: «Lưu chuyến»
- Nút làm gì: ở trang Chuyến mới thì tạo chuyến, ở trang Sửa chuyến thì lưu lại xe, tài xế, tuyến, giờ.
- Đề xuất: (a) trang Chuyến mới ghi «Tạo chuyến», trang Sửa chuyến ghi «Lưu chuyến» (b) giữ «Lưu chuyến» cả hai (c) trang Sửa ghi «Lưu sửa» — Khuyến nghị: (a), vì hộp tạo chuyến ngay trên bảng điều phối đã ghi «Tạo chuyến» nên cùng một việc tạo chuyến phải cùng tên ở mọi lối vào; còn sửa thì «Lưu chuyến» đúng. Đã có tiền lệ đổi chữ theo việc (Lưu giá / Lưu giá mới).
- Cần lưu ý: một nút trong mã (`luu-chuyen`, `luu-chuyen-day`) dùng cho cả hai chế độ, nên chỉ cần đổi chữ theo chế độ ở nơi gán chữ (có chỗ gán lại chữ «Lưu chuyến» sau khi lỗi); khi sửa phải ghi tên mới vào «Tên dùng ở nhiều hàng việc». Chuyến đã có khách sửa xe/tuyến thì chi phí cũ bị huỷ: hậu quả lớn, nhưng chữ nút không cần đổi, câu cảnh báo (nếu có) nằm ở nơi khác (chưa đọc kỹ).

### 127. Sửa kết quả đón / trả khách — hiện: «Điều chỉnh…»
- Nút làm gì: sửa kết quả đã ghi cho một khách trên xe đang chạy; kết quả cũ không bị xoá, ghi thêm một lần điều chỉnh kèm lý do.
- Đề xuất: (a) giữ «Điều chỉnh…» (b) «Sửa kết quả» (c) «Đổi kết quả» — Khuyến nghị: (a), vì «Điều chỉnh» đã nằm trong chữ chung (đứng trên dòng khách) và đúng với bản chất «ghi thêm, không xoá»; dấu «…» báo sẽ mở hộp; hộp «Điều chỉnh kết quả» nút chốt «Điều chỉnh» khớp.
- Cần lưu ý: không nhầm với «Điều chỉnh khẩn cấp» (việc khác: xếp/rút khách khi sát giờ).

### 136. Tiến độ chuyến — hiện: «Khách đã huỷ»
- Nút làm gì: ghi khách huỷ tại điểm đón để trả chỗ trên xe; không huỷ đơn.
- Đề xuất: (a) giữ «Khách đã huỷ» (b) «Khách huỷ» (c) «Khách báo huỷ» — Khuyến nghị: (a), vì cùng loạt với «Đã đón» và «Vắng» (ghi kết quả từng khách) và chính là chữ kết quả hiện sau khi ghi; chữ «Báo huỷ» của văn phòng là việc khác (chỉ đánh dấu cho tài xế).
- Cần lưu ý: nút ghép chữ theo `NHAN_LENH_SUAT`, nên chữ ở cả hộp «Ghi “Khách đã huỷ”» đổi theo nếu đổi.

### 138. Tiến độ chuyến — hiện: «Kết thúc chuyến»
- Nút làm gì: tài xế báo chuyến đã chạy xong; sau đó không ai điều chỉnh kết quả được nữa.
- Đề xuất: (a) giữ «Kết thúc chuyến» (b) «Xong chuyến» (c) «Hết chuyến» — Khuyến nghị: (a), vì khớp trạng thái «Đã kết thúc», đứng cạnh «Kết thúc gián đoạn», và hộp hỏi lại đã có câu «không mở lại được».
- Cần lưu ý: không.

### 142. Chuyển khách giữa hai xe — hiện: «Nhờ xe khác đón» / «Chuyển khách sang xe khác»
- Nút làm gì: chỉ gửi một đề nghị tới tài xế xe khác; khách vẫn ở xe mình cho tới khi xe kia nhận.
- Đề xuất: (a) giữ cả hai (b) «Nhờ xe khác đón khách» + «Nhờ xe khác nhận khách» (c) «Gửi đề nghị» cho cả hai — Khuyến nghị: (a), vì hai tình huống khác nhau (một điểm đón chưa tới / khách đã trên xe) mà mỗi tên nói đúng tình huống; nút chốt chung là «Gửi đề nghị» (đã trong chữ chung).
- Cần lưu ý: «Chuyển khách sang xe khác» hứa nhiều hơn sự thật (chỉ gửi đề nghị); hộp và thẻ «đề nghị đã gửi» đã làm rõ, nên chưa đổi.

### 143. Chuyển khách giữa hai xe — hiện: «Nhận»
- Nút làm gì: tài xế xe nhận đồng ý nhận khách; hệ thống kiểm điều kiện, đạt thì khách vào chuyến ngay, không thì lên văn phòng duyệt.
- Đề xuất: (a) giữ «Nhận» (b) «Nhận khách» (c) «Đồng ý nhận» — Khuyến nghị: (a), vì «Nhận» là chữ chung (đứng trên đề nghị chuyển khách) và thẻ «Đề nghị gửi tới bạn» nói rõ khách nào.
- Cần lưu ý: một chạm không hỏi lại, không hoàn tác; nếu chủ lo bấm nhầm thì chọn (b) cho rõ nghĩa, đổi chữ bảng chung «Nhận» cho khớp.

### 144. Chuyển khách giữa hai xe — hiện: «Không nhận»
- Nút làm gì: từ chối đề nghị kèm lý do chọn sẵn; khách ở lại xe kia.
- Đề xuất: (a) giữ «Không nhận» và nút chốt «Gửi lý do» (b) «Từ chối» và «Gửi từ chối» (c) «Không nhận» và «Xác nhận không nhận» — Khuyến nghị: (a), vì cặp «Nhận / Không nhận» đối xứng và dễ bấm trên điện thoại; «Gửi lý do» nói đúng điều tài xế đang làm trong hộp (chọn lý do).
- Cần lưu ý: chữ chung «Từ chối» là cho yêu cầu, đề nghị, phiếu; nếu chủ muốn dùng chung thì chọn (b) nhưng phải đổi hộp «Không nhận đề nghị» thành «Từ chối đề nghị».

### 145. Chuyển khách giữa hai xe — hiện: «Rút lại»
- Nút làm gì: tài xế xe nhờ rút đề nghị còn chờ; khách vẫn ở xe mình.
- Đề xuất: (a) giữ «Rút lại» (b) «Rút đề nghị» (c) «Thu hồi» — Khuyến nghị: (a), vì «Rút lại» đã là chữ chung (đứng cạnh đề nghị đang chờ của chính mình); «Thu hồi» dành cho đường dẫn vé và tin đã gửi.
- Cần lưu ý: không.

## Điều tôi không chắc
- Việc 63 («Trả đơn»): đây là đề xuất đổi duy nhất có ảnh hưởng rộng (chi tiết đơn, hướng dẫn, bảng chung); tôi chưa đọc nút ở Chi tiết đơn › khối Người phụ trách nên chưa biết đủ mọi chữ phải đổi theo.
- Việc 70: chưa đọc mã ghi nhật ký «Giao N vé qua Zalo»; chỉ dựa vào mô tả dòng việc.
- Việc 96: chưa xem giao diện thật nên không biết chữ trong ô có nhìn ra là bấm được không.
- Việc 90: chưa quyết nên đổi «Mở lại» trong hộp hay không (chỉ nêu nguy cơ lẫn).
- Việc 84 / cấp riêng: chữ cho việc «Thôi theo cấp này» của cấp riêng một đối tác thuộc lô khác; hai bên phải chọn cùng nhau.
- Việc 121: chưa đọc kỹ mọi câu cảnh báo khi đổi xe/nhà xe của chuyến thuê (chi phí cũ bị huỷ) nên không biết có câu cảnh báo trước khi lưu không.
- Các việc 107, 109, 113, 138, 142–145: chỉ đọc nơi đặt nút và đối chiếu bảng chữ chung, chưa chạy giao diện thật.
