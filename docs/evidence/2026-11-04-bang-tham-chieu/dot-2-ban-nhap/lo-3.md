# Lô 3: đề xuất tên cho 26 việc (chỉ số mảng 51 đến 76)

Khuôn đã dùng từ «Chữ dùng chung» của bảng: Gỡ, Bật, Tắt, Sửa, Kết thúc, Từ chối, Xác nhận bật, Dùng lại, Ngừng dùng, Đăng xuất (một việc nhiều lối vào).

### 147. Sửa chuyến đang chạy — hiện: «↑ / ↓»
- Nút làm gì: đổi thứ tự các điểm chưa tới, bấm là ghi ngay.
- Đề xuất: (a) giữ «↑» «↓» (đọc màn hình: «Đưa <điểm> lên trước / xuống sau») (b) «Lên» «Xuống» (c) «Đưa lên» «Đưa xuống» — Khuyến nghị: (a), vì mũi tên đã rõ nghĩa, nhãn đọc màn hình đã là lời thường, cả hai màn (chuyen.ts, cuoc-chuyen.ts) đang giống nhau.

### 149. Sửa chuyến đang chạy — hiện: «Báo huỷ»
- Nút làm gì: đánh dấu cho tài xế biết khách này đã huỷ; chỗ vẫn giữ cho tới khi tài xế bấm «Khách đã huỷ».
- Đề xuất: (a) «Báo khách huỷ» (b) «Báo huỷ suất» (c) giữ «Báo huỷ» — Khuyến nghị: (a), vì nói rõ là báo chứ không huỷ đơn, và khớp chữ «Khách đã huỷ» bên tài xế; «suất» là chữ nội bộ.
- Cần lưu ý: đổi theo ở link trong khối «Khách đang chờ», tiêu đề hộp «Báo huỷ một suất» (nên thành «Báo khách huỷ»), nút gửi trong hộp, câu «Đã báo huỷ …». Không trùng nghĩa với «Huỷ đơn» / «Huỷ chuyến».

### 150. Người đi kèm — hiện: «Thêm người đi kèm»
- Nút làm gì: mở hộp chọn một hướng dẫn viên có tài khoản gắn vào chuyến làm người đi kèm.
- Đề xuất: (a) giữ «Thêm người đi kèm» (b) «Thêm hướng dẫn viên đi kèm» (c) «Thêm người đi cùng» — Khuyến nghị: (a), vì đã trùng tiêu đề hộp và nhóm «Người đi kèm · N». Nút chốt trong hộp «Gắn lên xe» cũng giữ vì đối xứng với «Rút khỏi xe».

### 153. Huỷ chuyến — hiện: «Huỷ chuyến»
- Nút làm gì: đóng chuyến chưa chạy thành «Đã huỷ», khách trở về «Chưa xếp».
- Đề xuất: (a) giữ «Huỷ chuyến» (b) «Huỷ chuyến này» (c) «Đóng chuyến» — Khuyến nghị: (a), vì bảng chung đã nói việc ghi dữ liệu mang tên đầy đủ kiểu «Huỷ đơn»; «Đóng» chỉ dành cho gập khung nên (c) bị loại.
- Cần lưu ý: hộp hỏi hiện không nêu chuyện chi phí xe thuê bị huỷ về 0; có nên nêu hay không là câu hỏi về nội dung hộp, không phải về tên (tôi không đề xuất ở đây).

### 164. Giấy tờ: huỷ cả dòng — hiện: «Lưu sửa sai» (khi chọn lý do «Nhập nhầm cả dòng (huỷ dòng này)»)
- Nút làm gì: huỷ cả dòng giấy tờ hiện hành (không xoá hẳn); dòng cũ trước đó dùng lại nếu có.
- Đề xuất: (a) khi chọn lý do cuối, nút đổi thành «Huỷ dòng này» (b) giữ «Lưu sửa sai» (c) «Bỏ dòng này» — Khuyến nghị: (a), vì việc này khác hẳn sửa một ô (không hoàn tác được) mà nút vẫn ghi «Lưu sửa sai» dễ làm người dùng tưởng chỉ sửa. «Huỷ» ở đây là việc ghi dữ liệu có đối tượng rõ nên hợp luật «Huỷ».
- Cần lưu ý: chưa chắc: tôi chưa kiểm hộp có đổi chữ nút theo lý do hay không; nếu máy canh nhãn nút cố định thì (b) là phương án rẻ nhất. Dùng chung cho xe và Danh bạ (giay-to-ui.ts).

### 173. Bảng giá thuê xe — hiện: «Kết thúc» (ở dòng) · «Kết thúc giá» (trong hộp)
- Nút làm gì: đặt «Đến ngày» cho dòng giá, từ hôm sau không còn là giá bảng.
- Đề xuất: (a) giữ (b) «Ngừng giá» / «Ngừng áp giá» (c) «Đóng giá» — Khuyến nghị: (a), vì «Kết thúc» đã nằm trong chữ dùng chung cho dòng giá; (b) trùng khái niệm «Ngừng» của hoa hồng nhưng bảng chung đã chủ ý để hai tên cạnh nhau; (c) vi phạm nghĩa «Đóng».
- Cần lưu ý: nút «Đóng» trong hộp là gập khung, đúng nghĩa, giữ nguyên.

### 176. Bảng giá thuê xe: tuyến, cỡ xe — hiện: «Ngưng dùng / Dùng lại», xác nhận «Vẫn ngưng»
- Nút làm gì: tắt hoặc bật lại tuyến, cỡ xe trong danh mục.
- Đề xuất: (a) «Ngừng dùng» / «Dùng lại», xác nhận «Vẫn ngừng» (b) giữ «Ngưng dùng» (c) «Tắt» / «Bật» — Khuyến nghị: (a), vì bảng chung đã chốt chính tả «Ngừng dùng» (ADR-0166 câu 9), mỗi khái niệm một cách viết; «Tắt/Bật» đã dành cho mục có tên khác.
- Cần lưu ý: đây chỉ là sửa chính tả «Ngưng» thành «Ngừng»; cùng thay ở staff.ts (việc 235) và mọi chỗ còn «Ngưng».

### 183. Hạn mức Từ chối của hướng dẫn viên — hiện: «Lưu cài đặt»
- Nút làm gì: lưu chế độ (Tắt, Chỉ đo, Chặn) và hai số của hạn mức Từ chối.
- Đề xuất: (a) «Lưu hạn mức» (b) giữ «Lưu cài đặt» (c) «Lưu hạn mức Từ chối» — Khuyến nghị: (a), vì khác rõ với «Lưu thành bản mới» của form chính sách trên cùng trang, và nói đúng thứ đang lưu.

### 185. Danh mục loại giấy tờ — hiện: «Sửa» (dòng) · «Lưu» (khung «Sửa: <mã>»)
- Nút làm gì: sửa tên, cờ hết hạn, thứ tự, ô «Đang dùng» của một loại giấy tờ.
- Đề xuất: (a) giữ (b) «Lưu sửa» ở khung (c) «Sửa loại giấy tờ» — Khuyến nghị: (a), vì «Sửa» và «Lưu» đều có trong chữ dùng chung, tiêu đề khung nói đang sửa gì.

### 196. Đăng xuất — hiện: «Đăng xuất»
- Nút làm gì: đăng xuất máy đang dùng, các máy khác vẫn đăng nhập.
- Đề xuất: (a) giữ «Đăng xuất» (b) «Đăng xuất máy này» (c) «Thoát» — Khuyến nghị: (a), vì «Đăng xuất» đã nằm trong danh sách tên một việc nhiều lối vào (trang Tôi, thanh bên, màn bảo trì); quen thuộc nhất.

### 197. Đặt PIN mới bằng Face ID — hiện: «Xác nhận bằng Face ID»
- Nút làm gì: quét Face ID rồi đặt PIN mới không cần PIN cũ; đăng xuất mọi máy khác.
- Đề xuất: (a) «Đặt PIN mới» (b) «Quét Face ID và đặt PIN» (c) giữ — Khuyến nghị: (a), vì nói đúng điều xảy ra; chữ «Xác nhận» chỉ nên đứng khi câu hỏi cạnh nó nói đang xác nhận gì, ở đây dễ hiểu nhầm là xác nhận danh tính thôi.
- Cần lưu ý: câu «Bấm lại nút Xác nhận bằng Face ID.» (account.ts) phải đổi theo.

### 198. Gỡ Face ID một máy — hiện: «Gỡ»
- Nút làm gì: gỡ Face ID của một máy mình; mọi máy khác bị đăng xuất.
- Đề xuất: (a) giữ «Gỡ» (b) «Gỡ Face ID máy này» (c) «Tắt Face ID» — Khuyến nghị: (a), vì «Gỡ» đã định nghĩa cho dòng của thứ bị gỡ; mỗi dòng máy đã ghi tên máy.
- Cần lưu ý: việc này không hỏi lại dù đăng xuất các máy khác; nếu muốn thêm hộp hỏi thì là việc khác (hộp hỏi, không phải tên).

### 203. Máy được tin — hiện: «Quên máy này»
- Nút làm gì: thu hồi việc tin máy; lần đăng nhập PIN sau sẽ hỏi mã 6 số. Không đăng xuất máy.
- Đề xuất: (a) «Bỏ tin máy này» (b) «Gỡ máy được tin» (c) giữ «Quên máy này» — Khuyến nghị: (a), vì «Quên» dễ bị hiểu là đăng xuất hoặc xoá máy, còn «Bỏ tin» khớp tên khái niệm «Máy được tin».
- Cần lưu ý: chưa chắc: bảng chung ghi «Gỡ» dùng cho «máy đã nhớ»; tôi chưa xác định đó có phải chính khối này không. Nếu đúng thì (b) hợp luật hơn.

### 206. Mã dự phòng — hiện: «Tạo bộ mới» → «Tạo bộ mã mới»
- Nút làm gì: nhập mã 6 số, sinh 10 mã dự phòng mới, bộ cũ hết hiệu lực.
- Đề xuất: (a) «Tạo mã dự phòng mới» cho cả hai (b) «Tạo bộ mã mới» cho cả hai (c) giữ hai chữ khác nhau — Khuyến nghị: (a), vì cùng một việc thì cùng tên, và «mã dự phòng» là từ người dùng đã quen (các câu nhắc còn lại cũng nói «mã dự phòng»).
- Cần lưu ý: câu «Sắp hết mã dự phòng — bấm “Tạo bộ mới”» (account.ts) phải đổi theo.

### 209. Chế độ bảo trì — hiện: «Cập nhật giờ dự kiến»
- Nút làm gì: đổi giờ hoàn tất của đợt bảo trì đang bật; tới giờ thì máy tự mở lại.
- Đề xuất: (a) «Đổi giờ dự kiến» (b) giữ (c) «Đổi giờ mở lại» — Khuyến nghị: (c), vì giờ này thật sự là giờ tự mở lại cho mọi người, không chỉ là dự kiến.
- Cần lưu ý: nếu nhãn ô giờ trong màn vẫn gọi «giờ dự kiến» thì chọn (a) cho khớp.

### 211. Chế độ bảo trì — hiện: «Bật chế độ bảo trì» (hộp: «Xác nhận bật»)
- Nút làm gì: chặn ngay mọi tài khoản không giữ Toàn quyền, tự mở lại đúng giờ dự kiến.
- Đề xuất: (a) giữ (b) «Bắt đầu bảo trì» (c) «Bật bảo trì» — Khuyến nghị: (a), vì khớp tên khái niệm «Chế độ bảo trì», cặp với «Tắt chế độ bảo trì», và «Xác nhận bật» là chữ chung đã chốt.

### 212. Chính sách đăng nhập — hiện: «Lưu chính sách»
- Nút làm gì: bấm lần đầu chỉ đếm xem đăng xuất bao nhiêu máy, bấm «Xác nhận lưu» mới lưu.
- Đề xuất: (a) giữ (b) «Xem rồi lưu chính sách» (c) «Lưu chính sách đăng nhập» — Khuyến nghị: (a), vì hộp liền sau nói rõ «Sẽ đăng xuất N máy của M người. Lưu?», người dùng không bị bất ngờ.

### 213. Chính sách riêng tư của tôi — hiện: «Rút đồng ý»
- Nút làm gì: rút đồng ý một phiên bản chính sách và rút luôn các phiếu tự khai đang chờ theo phiên bản đó.
- Đề xuất: (a) giữ (b) «Rút đồng ý phiên bản này» (c) «Không đồng ý nữa» — Khuyến nghị: (a), vì rõ nghĩa, khớp «Rút lại / Rút yêu cầu» trong bảng chung, và hộp hỏi nêu hậu quả bằng lời thường.

### 223. Bật Face ID — hiện: «Bật» → «Tiếp tục với Face ID»
- Nút làm gì: lần chạm đầu kiểm PIN, lần hai đăng ký Face ID của máy.
- Đề xuất: (a) giữ cả hai (b) «Bật Face ID» → «Quét Face ID» (c) «Bật» → «Đăng ký Face ID» — Khuyến nghị: (a), vì «Bật» là chữ chung cho Face ID đứng trên dòng, và «Tiếp tục với Face ID» là cách nói quen của điện thoại.

### 224. Phiếu xoá — hiện: «Chạy lại»
- Nút làm gì: làm nốt phần còn thiếu của các phiếu xoá đã thực hiện (chép bản lưu ngoài còn thiếu, xoá các ảnh còn chờ). Lặp lại không sao.
- Đề xuất: (a) «Làm tiếp việc xoá» (b) «Xử lý nốt phiếu xoá» (c) giữ «Chạy lại» — Khuyến nghị: (a), vì «Chạy lại» là chữ máy, và khác «Thử lại» (tải lại lần lỗi) trong bảng chung.
- Cần lưu ý: câu «Bấm “Chạy lại” ở tab Đã xử lý» (phieu-xoa.ts) phải đổi theo.

### 228. Ẩn danh hoá máy cũ — hiện: «Ẩn danh hoá»
- Nút làm gì: xoá địa chỉ mạng và thông tin máy của các lần đăng nhập đã kết thúc quá số ngày giữ; không hoàn tác.
- Đề xuất: (a) «Xoá thông tin máy cũ» (b) «Xoá IP máy cũ» (c) giữ «Ẩn danh hoá» — Khuyến nghị: (a), vì lời thường và đúng việc (xoá IP và thông tin máy).
- Cần lưu ý: chưa chắc: «ẩn danh hoá» có thể là từ của chính sách riêng tư (pháp lý); chủ nên cho biết có cần giữ để khớp văn bản đó. Nếu cần giữ thì chọn (c).

### 229. Đăng xuất máy của người khác — hiện: «Đăng xuất máy này» · «Đăng xuất mọi máy + đặt lại PIN»
- Nút làm gì: đăng xuất một máy; hoặc đăng xuất mọi máy và đặt lại PIN cho người đó.
- Đề xuất: (a) «Đăng xuất máy này» và «Đăng xuất mọi máy và đặt lại PIN» (b) giữ nguyên dấu + (c) «Đăng xuất và đặt lại PIN» — Khuyến nghị: (a), vì chỉ bỏ dấu «+», giữ chữ «mọi máy» cho rõ phạm vi.
- Cần lưu ý: «Đăng xuất máy này» ở đây là máy của NGƯỜI KHÁC, khác với «Máy đang đăng nhập» của chính mình trong bảng chung; hộp hỏi đã ghi tên máy và người nên không nhầm.

### 230. Tắt bảo mật hai lớp của người khác — hiện: «Tắt bảo mật hai lớp»
- Nút làm gì: gỡ ứng dụng xác thực, email, mã dự phòng, máy được tin; nhân viên nội bộ phải bật lại trong 24 giờ.
- Đề xuất: (a) giữ (b) «Gỡ bảo mật hai lớp» (c) «Đặt lại bảo mật hai lớp» — Khuyến nghị: (a), vì «Tắt» là chữ chung, hộp xác nhận giải thích hậu quả và 24 giờ; (c) tả đúng hơn với nhân viên nội bộ nhưng sai với tài khoản bên ngoài (thật sự tắt).

### 232. Đặt lại PIN của người khác — hiện: «Đặt lại PIN»
- Nút làm gì: sinh PIN mới 6 số hiện một lần; PIN cũ, Face ID, mọi máy mất hiệu lực.
- Đề xuất: (a) giữ (b) «Cấp PIN mới» (c) «Đặt PIN mới cho họ» — Khuyến nghị: (a), vì ngắn, quen, khớp tên «Đặt lại PIN» đã dùng trong cả hộp ở việc 229.
- Cần lưu ý: hộp hỏi hiện là confirm() của trình duyệt (chữ Anh «OK/Cancel» của trình duyệt); không thuộc việc đặt tên.

### 235. Ngưng / kích hoạt lại tài khoản — hiện: «Ngưng» / «Kích hoạt lại»
- Nút làm gì: ngưng thì tài khoản không đăng nhập được và mọi máy bị đăng xuất; kích hoạt lại chỉ mở tài khoản.
- Đề xuất: (a) «Ngừng dùng» / «Dùng lại» (b) «Ngừng tài khoản» / «Mở lại tài khoản» (c) giữ «Ngưng» / «Kích hoạt lại» — Khuyến nghị: (a), vì khớp chữ chung «Ngừng dùng» (đứng trên dòng của mục) và «Dùng lại», cùng chính tả với việc 176; hộp hỏi «Ngưng tài khoản ‹tên›? Họ sẽ bị đăng xuất ngay.» đổi thành «Ngừng dùng tài khoản …».
- Cần lưu ý: nút «Mở khoá» (tài khoản bị khoá sai PIN) đứng cạnh, khác nghĩa; (a) không trùng nó.

### 237. Xác minh phiếu tự khai — hiện: «Chấp nhận»
- Nút làm gì: ghi nguyên văn thông tin người dùng khai vào hồ sơ và đánh dấu đã xác minh.
- Đề xuất: (a) giữ (b) «Xác minh» (c) «Duyệt» — Khuyến nghị: (a), vì cặp «Chấp nhận / Từ chối» rõ nghĩa; «Duyệt» đã dành cho yêu cầu đề nghị khác, «Xác minh» trùng tên hàng chờ.

## Điều tôi không chắc
- 164: chưa kiểm hộp sửa sai có thể đổi chữ nút theo lý do hay không (chỉ đọc tổng quan, không mở giay-to-ui.ts).
- 203: chưa xác định «máy đã nhớ» trong chữ chung «Gỡ» có phải khối «Máy được tin» này không.
- 228: chưa biết «ẩn danh hoá» có được văn bản chính sách riêng tư dùng nguyên chữ không.
- 150, 153, 209: chỉ đọc nhãn nút ở chuyen.ts và account.ts, chưa đọc kỹ toàn bộ hộp hỏi; các tệp bang-gia-xe.ts, xac-minh-hang-cho.ts, phieu-xoa.ts, sessions.ts, staff.ts chỉ tra các dòng chứa nhãn nút. Câu báo lỗi hoặc thành công có chứa chữ cũ ngoài những chỗ đã nêu có thể còn sót; nên chạy tìm chữ cũ khi chủ chốt tên.
- 183, 185, 198, 212, 213, 223: chưa mở tệp nguồn, dựa vào mô tả trong cho-chon.json.
