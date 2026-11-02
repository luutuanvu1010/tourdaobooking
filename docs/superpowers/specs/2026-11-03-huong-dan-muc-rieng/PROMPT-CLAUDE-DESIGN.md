ĐỀ BÀI: VẼ MỤC «HƯỚNG DẪN» TRONG HỖ TRỢ VÀ TÁCH «NHẬT KÝ THAY ĐỔI» — Island Booking System (Công ty TNHH Tour Đảo)

0. NGUỒN VÀ CÁCH LÀM
- Dùng lại bộ thiết kế «Island Booking System — Design System v2» và khung chung (KhungApp: thanh trên, thanh bên, thanh tab) đã có trong dự án này. Theo đúng nguyên tắc vàng của bộ: một ý nghĩa một hình, mỗi vùng một nút Chính, chữ 16, điện thoại 390 trước rồi máy tính 1040 (kiểm thêm 768, 1440).
- Kho mã (chỉ đọc, để đối chiếu, không sửa): github.com/luutuanvu1010/tourdaobooking nhánh main.
  · public/help.html, web/help.ts — trang hiện tại đang để chung Hướng dẫn và Nhật ký thay đổi
  · src/shared/huong-dan.ts, src/shared/huong-dan-*.ts — toàn bộ chữ hướng dẫn theo vai
  · public/feedback.html, web/feedback.ts, src/shared/ve-ho-tro-hien-thi.ts — trang Hỗ trợ và các thẻ của nó
  · src/shared/muc-giao-dien.ts — menu, thanh tab
  · docs/design/hoa-hong-ho-tro-2026-10-25/ho-tro-ban-2.html — bản vẽ Hỗ trợ đã duyệt, giữ nguyên ngôn ngữ hình của nó
- Nền tảng viết bằng TypeScript thuần + HTML tĩnh (không React). Bản vẽ là ý định bố cục và chữ. Hạn chế thành phần mới; nếu cần thành phần mới thì nêu tên và lý do. Không thêm màu mới.

1. VIỆC NÀY ĐỂ LÀM GÌ, AI DÙNG
Công ty có khoảng 30 nhân viên và khoảng 1000 đối tác dùng Nền tảng, phần lớn trên iPhone. Khi không biết làm một việc, họ cần tìm ra đúng bài và làm theo được ngay, không phải đọc hết.
Ba câu người dùng hỏi, theo thứ tự hay gặp:
  (1) «Tôi muốn làm việc X thì bấm vào đâu, theo các bước nào?»
  (2) «Tôi mới vào, vai trò của tôi cần biết gì trước?»
  (3) «Làm theo rồi mà vẫn không được thì hỏi ai?»
Vai: Bán hàng, Kế toán, Quản trị, Toàn quyền, Hướng dẫn viên, Đối tác, Thực tập, Tài xế công ty, Tài xế đối tác, Hành chính nhân sự. Mỗi người chỉ thấy bài của vai mình và Phần chung. Quản trị và Toàn quyền xem thêm được bài của các vai khác để kèm người mới.

2. VÌ SAO TRANG HIỆN TẠI CHƯA ĐẠT
a) Hướng dẫn và Nhật ký thay đổi nằm chung một trang dài. Hai thứ này trả lời hai câu khác nhau: «làm thế nào» và «có gì mới». Chủ dự án yêu cầu tách hẳn.
b) Hướng dẫn xếp theo vai, mỗi vai là một chuỗi mục gập lại, dài 9 đến 21 phút đọc. Không có ô tìm, nên người cần một việc phải đoán nó nằm ở mục nào.
c) Không có dấu hiệu nào cho biết bài còn đúng với bản hiện tại không.
d) Trang Hỗ trợ và trang Hướng dẫn là hai lối vào rời nhau, nên người gặp vướng phải tự biết chọn lối nào.

3. LUẬT CỨNG, KHÔNG ĐƯỢC ĐỔI
3.1 «Hướng dẫn» là một mục riêng của Hỗ trợ, cạnh các thẻ đã có: Yêu cầu của tôi (mọi người), Việc của nhóm (chỉ thành viên nhóm hỗ trợ và Toàn quyền), Nhóm hỗ trợ (chỉ Toàn quyền).
    Về kỹ thuật, mỗi thẻ có thể là một trang tải riêng dùng chung thanh thẻ, vì chữ hướng dẫn rất nặng. Đừng vẽ theo giả định chuyển thẻ tức thì không tải lại.
3.2 «Nhật ký thay đổi» KHÔNG nằm trong mục Hướng dẫn. Nó là trang riêng, giữ dòng số phiên bản, nhãn Mới / Đã sửa / Thay đổi, và chấm đỏ báo có bản mới.
3.3 Vẫn giữ nút «＋ Gửi yêu cầu» của Hỗ trợ.
3.4 Mỗi bài có hai loại nội dung, phải nhìn ra được khác nhau:
    · Phần máy tự điền từ mã nguồn, luôn đúng với bản đang chạy: màn hình nằm ở đâu, những vai được dùng, các con số giới hạn, tên nút.
    · Phần viết sẵn: các bước làm, vì sao, điều dễ sai, khi gặp sự cố.
3.5 Mỗi bài hiện «Cập nhật theo bản 2.57 · ngày 2/11/2026». Bài vừa đổi ở bản mới nhất có nhãn báo. Không có ngày thì không vẽ dòng này giả.
3.6 Trích dẫn nguồn phải viết bằng lời thường. Không bao giờ hiện tên tệp, đường dẫn, tên bảng, mã quyền, tên công nghệ, chữ tiếng Anh. Không có giá tiền, số điện thoại, email, tên người thật, mã vé trong bài hay trong bản vẽ.
3.7 Tên nút trong bài hiện bằng khung xám đúng chữ như trên màn hình.
3.8 Từ dùng: «Nền tảng», không dùng «App». Tiếng Việt có dấu đầy đủ.
3.9 Phải đọc được khi mất mạng nếu trang đã mở một lần.

4. MỤC TIÊU THIẾT KẾ
- Xếp theo việc cần làm, không theo cách tài liệu được chia. Ô tìm đứng đầu.
- Vai của người xem ra trước, Phần chung sau. Người mới thấy ngay «Bắt đầu nhanh» của vai mình.
- Đọc một bài trên điện thoại không phải cuộn qua bài khác, và luôn có đường quay về danh sách.
- Cuối mỗi bài có đường đi tiếp khi vẫn vướng: gửi yêu cầu hỗ trợ, kèm sẵn tên bài đang đọc.
- ĐỀ XUẤT để chủ dự án chọn: bấm «Hỗ trợ» ở menu thì mở thẻ nào trước. Hiện nay bấm là mở ngay hộp gửi yêu cầu; có thể nên mở Hướng dẫn trước để người dùng tự tìm được câu trả lời. Nêu lý do.
- ĐỀ XUẤT để chủ dự án chọn: «Nhật ký thay đổi» đặt ở đâu trong chân menu để vẫn thấy chấm đỏ mà không chiếm chỗ của việc hằng ngày.

5. NỘI DUNG MẪU
Dùng bài «Kho vé điện tử» dưới đây làm bài mẫu đầy đủ, dài đúng như thật. Các bài khác chỉ cần tên: Lập đơn mới, Xác nhận đơn, Xem tiền của một đơn, Gửi ảnh biên nhận cho khách, Tìm và lọc đơn, Cuốc của tôi.

Phần máy điền: Ở đâu: Vé điện tử. Ai dùng được: Bán hàng, Quản trị, Toàn quyền. Giới hạn: mỗi lô mặc định tối đa 50 vé, Toàn quyền đổi được từ 1 đến 200; mỗi ảnh tối đa 3 MB; ảnh JPG hoặc PNG; ảnh của lô đã huỷ lưu 3 ngày; đường dẫn cho khách hết hạn sau ngày dùng cuối 7 ngày.

Phần viết sẵn:
Câu mở: Máy chống được trùng vé, nhưng không biết vé có đúng loại hay không, nên phần khai lô vẫn phụ thuộc vào người nhập.
Bước 1 Tải vé từ nhà cung cấp: mỗi lần chỉ tải đúng một sản phẩm, một loại khách, một khoảng ngày dùng; giữ nguyên ảnh gốc.
Bước 2 Nhập vào kho: chọn dịch vụ và loại khách, gõ tên sản phẩm, chọn ngày dùng, chọn các ảnh, bấm [Nhập lô vé]; xem danh sách ảnh bị loại.
Bước 3 Máy giữ vé cho đơn: tự giữ khi đơn được xác nhận; kho thiếu thì đơn báo thiếu, nhập thêm rồi bấm [Cấp vé].
Bước 4 Giao vé: chỉ mở khi đơn đã thu đủ; bấm [Chuẩn bị vé] rồi gửi Zalo, hoặc bấm [Tạo đường dẫn cho khách].
Điều dễ sai: đừng trộn loại vé trong một lô; chỉ chọn «Mọi loại khách» khi vé thật sự dùng chung; chưa chắc khách lấy thì đừng bấm [Chuẩn bị vé], vì vé đã lộ không về kho; không chụp màn hình vé gửi nhóm chat.
Khi gặp sự cố (bảng hai cột): lỗi giữa chừng thì bấm [Huỷ lô] rồi nhập lại; đã có vé được giữ thì không huỷ được lô, gửi yêu cầu hỗ trợ; ảnh không đọc được QR thì tải lại ảnh gốc.
Chưa làm được: nhập từ PDF, gõ tay mã vé, tự đọc loại vé trên ảnh, tự cấp cho đơn đang thiếu.
Không thể làm: thu hồi vé khách đã lưu; biết tình trạng vé bên nhà cung cấp; chặn bán ngoài Nền tảng.

6. CẦN VẼ (mỗi màn cả 390 và 1040)
A. Hỗ trợ, thẻ Hướng dẫn: ô tìm, nhóm bài của vai, Phần chung, Bắt đầu nhanh. Vẽ cho hai người: một Bán hàng, một Tài xế (ít bài).
B. Một bài: bài Kho vé điện tử đầy đủ, kèm phần máy điền, dòng cập nhật, cuối bài có đường gửi yêu cầu. Máy tính có mục lục bài bên cạnh.
C. Kết quả tìm: có kết quả (chỉ đúng đoạn khớp) và không có kết quả (đưa sang gửi yêu cầu).
D. Quản trị xem bài của vai khác.
E. Trang Nhật ký thay đổi riêng và chỗ đặt nó trong chân menu, có chấm đỏ.
F. Trạng thái: đang tải, mất mạng, bài có nhãn «vừa đổi ở bản mới».

7. KHI GIAO BẢN VẼ
Liệt kê: thành phần mới (nếu có) kèm lý do; các câu chữ mới; hai đề xuất ở mục 4 kèm khuyến nghị; chỗ nào bạn phải giả định.
