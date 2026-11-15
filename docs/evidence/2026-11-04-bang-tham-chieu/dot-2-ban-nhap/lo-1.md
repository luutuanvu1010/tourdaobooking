# Lô 1 (chỉ số 0–25): đề xuất tên

### 2. Chụp bù mức hoa hồng — hiện: «Chụp bù»
- Nút làm gì: ghi lại mức hoa hồng, giá đại lý và người bán cho đơn đã xác nhận mà chưa có bản ghi mức; đã chụp thì không chụp lại được.
- Đề xuất: (a) «Chụp bù» (b) «Ghi mức còn thiếu» (c) «Tính mức hoa hồng»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì tên trang, tên khối và câu hướng dẫn («Chụp bù lấy mức đang áp ở ngày xác nhận») đều dùng chữ này; đổi là phải đổi cả trang. «Ghi mức tay» đã chốt nên (b) dễ lẫn.
- Cần lưu ý: «Chụp bù» (web/chup-bu.ts, web/phan-doi-tac.ts) cùng một việc hai lối vào nên giữ cùng tên.

### 3. Chụp bù mức hoa hồng — hiện: «Chụp bù cả danh sách (‹n› đơn)»
- Nút làm gì: chụp bù lần lượt từng đơn trong danh sách; đơn thiếu mức thì báo ngay dưới đơn đó, các đơn khác vẫn chụp.
- Đề xuất: (a) «Chụp bù cả danh sách (‹n› đơn)» (b) «Chụp bù tất cả (‹n› đơn)» (c) «Chụp bù ‹n› đơn»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì đã nói rõ phạm vi và số đơn, đi cùng «Chụp bù».
- Cần lưu ý: chữ ghép từ mã (số đơn) nên khoá bảng đã đánh dấu ‹…›.

### 4. Ảnh gửi khách — hiện: «Tải ảnh PNG»
- Nút làm gì: tải ảnh xác nhận đơn về máy; không ghi gì, không gửi gì cho khách.
- Đề xuất: (a) «Tải ảnh về máy» (b) «Tải ảnh» (c) «Tải ảnh PNG»
- Khuyến nghị: (a), vì «PNG» là chữ kỹ thuật người bán hàng không cần biết; ngay cạnh có nút «Chia sẻ».
- Cần lưu ý: web/confirmation-dialog.ts còn câu báo «Hãy dùng nút “Tải ảnh PNG”.» (dòng ~220) phải đổi theo.

### 5. Ảnh gửi khách — hiện: «Xem biên nhận»
- Nút làm gì: dựng ảnh tóm tắt đơn trên máy để xem, tải hoặc chia sẻ; không thu tiền, không gửi gì cho khách. Mã gọi nó là «send-confirmation» nên dễ hiểu nhầm là «gửi».
- Đề xuất: (a) «Xem biên nhận» (b) «Xem ảnh gửi khách» (c) «Tạo ảnh gửi khách»
- Khuyến nghị: (b), vì hộp mở ra tên «Ảnh gửi khách», còn «biên nhận» dễ bị hiểu là giấy xác nhận đã thu tiền. Nếu chủ thấy «biên nhận» đã quen với nhân viên thì chọn (a), giữ nguyên.
- Cần lưu ý: bảng Khái niệm có nói «biên nhận» với khách luôn ghi «Chờ xác nhận» cho đơn chưa xác nhận; đổi tên nút phải xem hướng dẫn nào nhắc «Xem biên nhận».

### 7. Sửa đơn đã xác nhận — hiện: «Sửa danh sách»
- Nút làm gì: sửa tên, năm sinh, thêm bớt dòng người đi của đơn đã xác nhận; không đổi số khách tính tiền.
- Đề xuất: (a) «Sửa danh sách khách» (b) «Sửa danh sách hành khách» (c) «Sửa danh sách»
- Khuyến nghị: (b), vì thẻ và bảng đã gọi «Hành khách», và cạnh đó có «Sửa số khách dịch vụ» là việc đổi số tiền tính, cần phân biệt rõ.
- Cần lưu ý: cùng chữ ở hai chỗ trong web/order.ts (nút và liên kết ở form); đổi cả hai.

### 8. Người phụ trách — hiện: «Nhận phụ trách»
- Nút làm gì: người bấm tự nhận làm người phụ trách đơn đang chưa có ai.
- Đề xuất: (a) «Nhận phụ trách» (b) «Nhận đơn này» (c) «Tôi phụ trách»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì khớp «Từ chối đơn» và thẻ «Người phụ trách»; bảng luật chung có «Nhận» cho thẻ đơn chờ nhận.
- Cần lưu ý: «Từ chối đơn» (chốt) trả đơn lại hàng chờ, cặp với nút này.

### 10. Tiền của đơn huỷ — hiện: «Ghi chi hoàn»
- Nút làm gì: ghi sổ rằng công ty đã trả lại khách một khoản đã duyệt hoàn; Nền tảng không chuyển tiền.
- Đề xuất: (a) «Ghi đã hoàn cho khách» (b) «Ghi hoàn tiền» (c) «Ghi chi hoàn»
- Khuyến nghị: (a), vì «chi hoàn» là chữ kế toán ít quen và gần nghĩa với «Ghi hoàn cho khách» (khách trả dư) nên cần câu rõ là đã trả xong; khái niệm chuẩn là «Khoản hoàn tiền».
- Cần lưu ý: trùng gần nghĩa với «Ghi hoàn cho khách» (khách trả dư) và «Ghi đã hoàn ngoài hệ thống». Chưa chắc: nếu chủ muốn ba nút này cùng khuôn «Ghi hoàn …», cần chọn chung cả ba cùng lúc. Nhãn ô hiện là «Ghi chi hoàn» ở hai chỗ (nhan, nutGhi) trong web/order.ts.

### 13. Tiền của đơn huỷ — hiện: «Xác nhận · Từ chối»
- Nút làm gì: Toàn quyền xác nhận hay từ chối dòng «đã hoàn ngoài hệ thống» do người khác ghi; từ chối đòi lý do.
- Đề xuất: (a) «Xác nhận · Từ chối» (b) «Xác nhận đã hoàn · Từ chối» (c) «Xác nhận khoản hoàn · Từ chối»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì bảng chữ dùng chung đã chốt «Xác nhận» và «Từ chối» đứng trên dòng đang xem; hộp hỏi «Xác nhận công ty đã trả tay … cho khách?» nói rõ việc.
- Cần lưu ý: không ghi gì thêm trên nút để khỏi trùng «Xác nhận đã nhận» (là nhận tiền vào công ty).

### 14. Tiền của đơn huỷ — hiện: «Phân loại lý do»
- Nút làm gì: xếp lý do huỷ «chưa kết luận» vào một nhóm (Khách huỷ, Công ty huỷ, Huỷ để lập lại); chỉ làm một lần.
- Đề xuất: (a) «Phân loại lý do huỷ» (b) «Chọn nhóm lý do huỷ» (c) «Phân loại lý do»
- Khuyến nghị: (a), vì chữ «lý do» đứng một mình trong khối «Tiền của đơn huỷ» vẫn hiểu được nhưng trong danh sách nút chung thì không rõ lý do gì; giữ chữ «phân loại» vì đã dùng trong «Huỷ đơn» (câu «chỉ Quản trị, Toàn quyền đổi nhóm lý do»). Nếu chủ muốn gọn thì (c).
- Cần lưu ý: nhãn ô «Phân loại lý do» và nút ghi «Phân loại» (web/order.ts dòng ~797) cùng đổi; tài liệu Huỷ đơn nhắc tên này.

### 17. Đối chiếu khoản thu — hiện: «Xác nhận đã nhận»
- Nút làm gì: Kế toán xác nhận công ty thật sự đã nhận khoản «Công ty thu» do người khác khai; chuyển khoản phải nhập mã giao dịch.
- Đề xuất: (a) «Xác nhận đã nhận» (b) «Xác nhận công ty đã nhận» (c) «Đối chiếu đã nhận»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì bảng chữ dùng chung đã định nghĩa «Xác nhận đã nhận» là nút chốt trên dòng đúng khoản tiền, hộp nói rõ bên nào đã nhận.
- Cần lưu ý: phân biệt với «Bên kia đã nhận» (đại lý/nhà cung cấp giữ tiền); hai nút khác nghĩa, tên khác nhau là đúng. Hiện nút chốt trong hộp ghi «Công ty đã nhận».

### 21. Sau Đã giao — hiện: «Đề nghị phân định»
- Nút làm gì: gửi đề nghị (số tiền, lý do) để Quản trị hoặc Toàn quyền quyết ai chịu khoản hoàn hay bồi thường sau khi đơn đã giao; chưa trừ tiền ai.
- Đề xuất: (a) «Đề nghị phân định» (b) «Đề nghị xử lý trách nhiệm» (c) «Gửi đề nghị phân định»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì màn kế tiếp tên «Phân định trách nhiệm» và nút chốt đã là «Gửi đề nghị» (chữ chung); «phân định» là tên khái niệm đã dùng nhất quán.
- Cần lưu ý: chưa chắc nhân viên quen chữ «phân định»; nhưng tên màn đã chốt nên đổi nút một mình sẽ lệch màn.

### 25. Chốt đơn — hiện: «Đã giao – đã thu đủ»
- Nút làm gì: chốt tour đã xong và khách trả đủ; đơn bị khoá, ghi hoa hồng và giá vốn vào sổ; không mở lại.
- Đề xuất: (a) «Đã giao – đã thu đủ» (b) «Chốt đã giao, đã thu đủ» (c) «Chốt đơn đã giao»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì là tên trạng thái chuẩn trong Khái niệm, cùng chữ trên huy hiệu, hộp hỏi và câu báo nên người dùng thấy một tên ở mọi nơi.
- Cần lưu ý: đã nằm trong «Tên dùng ở nhiều hàng việc» là cùng một việc.

### 26. Chốt đơn — hiện: «Hoàn thành»
- Nút làm gì: Kế toán đóng sổ đơn đã giao khi mọi người đã nộp tiền; không mở lại.
- Đề xuất: (a) «Hoàn thành» (b) «Hoàn thành đơn» (c) «Đóng sổ đơn»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì là tên trạng thái chuẩn («Hoàn thành») ở huy hiệu và hộp hỏi «Xác nhận Hoàn thành đơn này?».
- Cần lưu ý: không dùng «Đóng sổ» vì chữ «Đóng» trong bảng chữ chung chỉ có nghĩa gập khung, và có «Khoá tháng» là việc khác.

### 27. Thu tiền — hiện: «Ghi khoản thu»
- Nút làm gì: ghi một khoản khách đã trả vào đơn; khoản do người không phải Kế toán khai là chuyển khoản «Công ty» thì chờ Kế toán đối chiếu.
- Đề xuất: (a) «Ghi khoản thu» (b) «Ghi tiền khách trả» (c) «Thêm khoản thu»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì «Khoản thu» là tên chuẩn trong Khái niệm và đã có «Sửa khoản thu đã ghi», «Huỷ khoản thu», «Ghi khoản thu này».
- Cần lưu ý: nút «Ghi» trong hàng mở là nút chốt, chữ chung. Chữ «Ghi» chung chưa có trong bảng chữ dùng chung (chưa chắc có nên thêm).

### 32. Sửa đơn đã xác nhận — hiện: «Đổi khách»
- Nút làm gì: mở bảng đổi tên, số điện thoại khách và bên đặt của đơn đã xác nhận.
- Đề xuất: (a) «Đổi khách» (b) «Đổi khách đặt» (c) «Sửa thông tin khách»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì tiêu đề bảng cũng là «Đổi khách» và khái niệm này đã dùng ở nhiều nơi (form tạo đơn, cảnh báo đối tác).
- Cần lưu ý: nút chốt trong bảng là «Lưu khách» (mục 50); hai nút này đi cặp.

### 35. Huỷ đơn — hiện: «Huỷ đơn»
- Nút làm gì: huỷ đơn kèm lý do bắt buộc; trả vé chưa mở về kho, huỷ vé đã mở; không hoàn tác.
- Đề xuất: (a) «Huỷ đơn» (b) «Huỷ đơn này» (c) «Huỷ đơn kèm lý do»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì bảng chữ chung ghi «Huỷ đơn» là tên có đầy đủ đối tượng và có nút «Không huỷ» đối ứng.
- Cần lưu ý: trong hộp kiểm vé còn nút «Huỷ» cùng nghĩa «huỷ đơn» nhưng ở bảng khác; đã có tên nhiều lối vào.

### 38. Xác nhận đơn — hiện: «Rút lại»
- Nút làm gì: người lập rút yêu cầu kiểm vé đang chờ; đơn trở về sửa được.
- Đề xuất: (a) «Rút lại» (b) «Rút yêu cầu» (c) «Rút lại yêu cầu»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì bảng chữ chung chốt «Rút lại» đứng cạnh yêu cầu hoặc đề nghị đang chờ của chính mình; «Rút yêu cầu» là nút khác nghĩa (đứng trên dòng yêu cầu).
- Cần lưu ý: hộp hỏi «Rút lại yêu cầu xác nhận? Đơn trở về nháp để bạn sửa tiếp.» còn chữ «nháp», trong khi bảng Khái niệm đã bỏ «Nháp» thay bằng «Chưa xác nhận». Chữ hộp hỏi nên đổi thành «Đơn trở về Chưa xác nhận để bạn sửa tiếp.» (chưa kiểm là có test khoá câu này không).

### 39. Xác nhận đơn — hiện: «Gửi đơn»
- Nút làm gì: Đối tác gửi đơn lên văn phòng; cần kiểm vé thì vào hàng chờ, không thì xác nhận ngay và cấp vé.
- Đề xuất: (a) «Gửi đơn» (b) «Gửi đơn lên văn phòng» (c) «Gửi đặt vé»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì ngắn, quen với đối tác và đã là «tên dùng ở nhiều hàng việc»; khác «Gửi kiểm vé» (người lập không phải Đối tác) về đối tượng.
- Cần lưu ý: tên «Gửi đơn» cho một nút mà kết quả có thể là «xác nhận ngay» hay «chờ kiểm vé»; dòng báo sau đó đã nói rõ (câu CAU_BAO_GUI_DON).

### 43. Người phụ trách — hiện: «Từ chối đơn»
- Nút làm gì: người đang phụ trách trả đơn lại hàng chờ, chọn lý do; có hạn mức mỗi tuần.
- Đề xuất: (a) «Từ chối đơn» (b) «Trả đơn lại» (c) «Không nhận đơn»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì chữ «Từ chối» là chữ chung đòi lý do ở bước sau; hộp đã ghi «Từ chối đơn ‹mã›?».
- Cần lưu ý: hơi khác nghĩa «Từ chối» của yêu cầu/đề nghị (nghĩa là quyết) nhưng bảng chữ chung chấp nhận; không đổi.

### 44. Kiểm vé — hiện: «Đặt gấp»
- Nút làm gì: trong bảng xác nhận đơn, mở khung chọn lý do cho lượt đón đã qua hạn chốt; chưa ghi gì cho tới khi bấm «Còn vé, xác nhận đơn».
- Đề xuất: (a) «Đặt gấp» (b) «Chọn lý do đặt gấp» (c) «Đặt gấp (mở khung)»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì cùng tên với nút mở khung ở form Tạo đơn (mục 52, một việc nhiều lối vào cùng tên). Khái niệm «Đặt gấp» đã chuẩn.
- Cần lưu ý: khung mở ra có tên «Đặt gấp» và nút «Duyệt đặt gấp» (xem mục 52). Ở đây nút chỉ nhớ lý do, không ghi ngay, khác với form Tạo đơn.

### 48. Cài đặt vận hành — hiện: «Bật ẩn thông tin khách · Tắt ẩn thông tin khách»
- Nút làm gì: bật hoặc tắt công tắc chung để form Tạo đơn của Đối tác không còn ô tên, điện thoại, danh sách khách.
- Đề xuất: (a) «Bật ẩn thông tin khách · Tắt ẩn thông tin khách» (b) «Bật ẩn khách · Tắt ẩn khách» (c) «Ẩn thông tin khách: Bật · Tắt»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì khớp tên khối «Ẩn thông tin khách khi đối tác đặt vé» và cùng khuôn với «Bật dịch vụ nhập tay / Tắt dịch vụ nhập tay».
- Cần lưu ý: một nút đổi chữ theo trạng thái; trong bảng chữ chung «Bật/Tắt» đứng trên dòng của mục có tên; ở đây là công tắc chung nên chữ dài có đối tượng, hợp lý.

### 50. Sửa đơn đã xác nhận: khách và bên đặt — hiện: «Lưu khách»
- Nút làm gì: lưu thay đổi tên, điện thoại, bên đặt của đơn; đơn đã xác nhận mà đổi bên đặt thì chụp lại mức hoa hồng.
- Đề xuất: (a) «Lưu khách» (b) «Lưu thay đổi khách» (c) «Lưu»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì cặp với nút «Đổi khách» và nói rõ đối tượng; bảng chữ chung bảo «Lưu» đứng một mình khi tiêu đề hộp nói đang sửa gì, ở đây có cả hai.
- Cần lưu ý: cảnh báo cố định trong bảng («bản xác nhận đã gửi khách có thể lỗi thời») giữ nguyên.

### 52. Đặt gấp (dưới hạn chốt) — hiện: «Đặt gấp (mở khung) · Duyệt đặt gấp»
- Nút làm gì: «Đặt gấp» mở khung; «Duyệt đặt gấp» ghi lý do và đóng dấu đặt gấp cho lượt dưới hạn chốt 6 giờ (ở form Tạo đơn còn lưu cả đơn). Người lập tự duyệt, không có người thứ hai.
- Đề xuất: (a) «Đặt gấp» và «Duyệt đặt gấp» (b) «Đặt gấp» và «Xác nhận đặt gấp» (c) «Đặt gấp» và «Ghi đặt gấp»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì khái niệm «Đặt gấp» chuẩn; chữ «Duyệt» ở bảng chung dành cho người thứ hai duyệt yêu cầu của người khác, nhưng ở đây tự đóng dấu nên đáng ngờ. Nếu chủ muốn chữ khớp luật hơn thì (b). Dù chọn gì, cần chủ biết chuyện «Duyệt» ở đây không có người thứ hai.
- Cần lưu ý: bảng chữ chung chốt «Duyệt» = đứng trên dòng yêu cầu đang chờ; nút này mở ra ngay trong form, không phải yêu cầu của ai. Đổi thì phải sửa web/dat-gap-ui.ts (ba chỗ) và tài liệu nhắc «Duyệt đặt gấp». Chưa chắc: bao nhiêu bài hướng dẫn nhắc chữ này.

### 54. Đối chiếu tiền — hiện: «Bên kia đã nhận»
- Nút làm gì: Kế toán ghi rằng đại lý hoặc nhà cung cấp đã thật sự nhận khoản khách trả; bên đó đang giữ tiền, chưa nộp về công ty.
- Đề xuất: (a) «Bên kia đã nhận» (b) «Đại lý đã nhận» (c) «Đối tác đã nhận»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì bên nhận có thể là đại lý hoặc nhà cung cấp (nên (b), (c) sai một nửa), còn hộp hỏi nêu đúng tên bên và số tiền.
- Cần lưu ý: ở trang chủ web/home.ts nút dùng hàm nutXacNhanDoiChieu chọn chữ theo loại khoản, và bảng ghi nơi đặt là «Xác nhận đã nhận» (chữ cho khoản Công ty thu). Chưa chắc: hai nơi (Trang chủ và Chi tiết đơn) có dùng đúng cùng chữ không; nên kiểm trước khi chốt.

### 55. Việc gấp của Trang chủ — hiện: «Xác nhận ngay»
- Nút làm gì: chỉ là liên kết mở trang «Đơn chờ xác nhận»; không xác nhận đơn nào.
- Đề xuất: (a) «Xem đơn chờ xác nhận» (b) «Mở đơn chờ xác nhận» (c) «Xét đơn ngay»
- Khuyến nghị: (a), vì tên hiện nói «xác nhận ngay» như thể bấm là xác nhận, trong khi chỉ là xem danh sách; «Xem …» là động từ đúng với việc không ghi gì.
- Cần lưu ý: gần nghĩa «Kiểm vé» (nút trên thẻ ở trang Đơn chờ xác nhận); đừng dùng chữ đó ở đây vì đó là nút xét từng đơn. Tên trang «Đơn chờ xác nhận» đã chuẩn.

### 56. Đưa đón: bỏ lượt — hiện: «Bỏ lượt (liên kết) · Bỏ lượt (nút đỏ xác nhận)»
- Nút làm gì: ở form Tạo đơn bỏ lượt khỏi danh sách đang gõ (chưa lưu); ở bảng «Sửa đưa đón» của đơn đã xác nhận, nút đỏ xoá lượt khỏi bảng và chỉ đóng thật khi bấm «Lưu».
- Đề xuất: (a) «Bỏ lượt» ở cả hai chỗ, nút xác nhận đỏ «Bỏ lượt» (b) liên kết «Bỏ lượt», nút xác nhận đỏ «Bỏ lượt này» (c) liên kết «Bỏ lượt», nút xác nhận đỏ «Xác nhận bỏ lượt»
- Khuyến nghị: (a) GIỮ NGUYÊN, vì cùng một việc nhiều lối vào thì cùng tên; hộp đã hỏi lý do và có câu «Lượt đã bỏ không mất — xem trong lịch sử đơn», còn «Thôi» là nút thoát đã chốt.
- Cần lưu ý: ở bảng sửa, bấm nút đỏ chưa ghi gì (cần «Lưu» của bảng); câu trong hộp nên nói «Lượt đã bỏ không mất» nhưng chưa nói rõ phải bấm «Lưu». Chưa chắc: câu đó đã đủ rõ cho người dùng hay chưa.

## Điều tôi không chắc
- Mục 2 và 3: chưa đọc kỹ phần máy chủ; chỉ đọc nhãn nút và chú thích đầu tệp.
- Mục 10: ba nút «Ghi chi hoàn», «Ghi hoàn cho khách», «Ghi đã hoàn ngoài hệ thống» nên chọn chung; chưa đọc hết ngữ cảnh để chắc (a) không làm lệch nghĩa.
- Mục 14, 17: nhãn trong web/order.ts dùng hai chuỗi (nhãn khung và nút chốt); chưa kiểm hết chỗ khác nhắc lại.
- Mục 38: chưa kiểm test khoá câu hộp hỏi có chữ «nháp».
- Mục 52, 54: chưa kiểm hết các bài Hướng dẫn nhắc các chữ này; mục 54 chưa chắc chữ nút thật ở Trang chủ.
- Mục 56: chưa mở lại cả luồng form Tạo đơn để chắc về hộp hỏi.
- Các mục «giữ nguyên» dựa chủ yếu vào bảng Khái niệm và bảng Chữ dùng chung; chưa đối chiếu với từng bài Hướng dẫn.
