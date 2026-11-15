# Kiểm toán tiền, vé, thông tin, an toàn dữ liệu; đối chiếu chuẩn Oracle và hai kho ứng dụng (14/11/2026)

> Hồ sơ có ngày: viết xong là đóng băng. Có gì mới thì viết bản mới trỏ về bản này.
> Mã được rà: bản chính 3.5 (lần lưu `8b5c45e8d`). Chỉ đọc mã và tài liệu; **không** chạy bộ kiểm, **không** thử trên máy thật, **không** xem production.

## 1. Tóm tắt một trang

**Kết luận.** Phần lõi của Nền tảng chắc: sổ tiền chỉ ghi thêm và được canh hai lớp (mã và cơ sở dữ liệu), hai người không lấy trùng được một vé, một vé không quét được hai lần, hai người cùng sửa một đơn thì người sau được báo chứ không đè lên người trước. Không tìm thấy lỗi nào mức nghiêm trọng (mất tiền hàng loạt hay lộ dữ liệu hàng loạt) trong phần đã đọc.

**Chỗ yếu nằm ở bốn nơi**, xếp theo mức đáng lo:

1. **Nếu dữ liệu hỏng hoặc mất tài khoản Cloudflare thì chưa có đường lấy lại đã được thử.** Chưa từng khôi phục thử, không có bản sao nào ngoài Cloudflare, kho ảnh biên lai và giấy tờ không thấy sao lưu, máy hỏng không ai được báo.
2. **Tiền đại lý nộp về công ty (phần mới làm 13/11) chưa nối với sao kê ngân hàng.** Một lần chuyển khoản có thể được ghi nhận hai lần.
3. **Vé và danh mục có ba chỗ đứt gãy**: dời ngày đi thì vé không đổi theo; nhập nhầm lô vé thì không rút lại được; gõ sai một ô trên Sheet làm dịch vụ biến khỏi form lập đơn.
4. **Tài khoản Đối tác (khoảng 1.000) chỉ được bảo vệ bằng PIN 6 số**, và dò PIN không để lại dấu vết.

**Việc gấp theo lịch.** Mục «duyệt hai người cho bút toán điều chỉnh» trong sổ lỗi có hạn **30/11/2026**. Tới 1/12 mà chưa quyết thì bộ kiểm báo đỏ và mọi lần phát hành bị chặn, kể cả bản sửa gấp.

**Ba quyết định cần chủ dự án** (mục 8 nói rõ hơn):

- Q1. Mục hạn 30/11: đóng hay gia hạn. Cần quyết trước 25/11.
- Q2. Có cho làm ngay Đợt 1 (năm việc sửa nhỏ chặn sai tiền, sai vé) không.
- Q3. Tài khoản Đối tác: bắt xác thực hai lớp qua thư, hay chỉ khoá lâu dần khi gõ sai nhiều.

**Độ tin của bản này.** Sáu trợ lý chỉ đọc rà sáu mảng; mười phát hiện nặng nhất đã được người điều phối mở mã kiểm lại (đánh dấu ✔ ở các bảng dưới). Phần còn lại là lời khai của trợ lý sau khi đọc mã, chưa ai thử thật. Mục 9 liệt kê phần chưa đọc.

## 2. Tiền: chỗ có thể sai hoặc mất

| Mã | Mức | Chuyện gì có thể xảy ra | Hướng sửa |
|---|---|---|---|
| T1 ✔ | Trung bình | Đại lý chuyển **một** lần 5 triệu, gửi cùng ảnh biên lai cho khoản nộp của hai đơn. Kế toán xác nhận cả hai thì sổ ghi công ty đã nhận 10 triệu, công nợ đại lý giảm thừa 5 triệu. Khoản nộp không bắt mã giao dịch ngân hàng, máy không so ảnh trùng. Kế toán ghi «Nộp / trả» cũng không cần mã, không cần ảnh, không cần người thứ hai. | Bắt mã giao dịch khi xác nhận khoản nộp bằng chuyển khoản (đã có sẵn cách kiểm cho khoản công ty tự thu); cảnh báo khi ảnh trùng ảnh đã dùng. |
| T2 ✔ | Trung bình | Kế toán huỷ được dòng sổ của một khoản nộp đã xác nhận: sổ đảo lại, đại lý nợ lại, nhưng phiếu vẫn hiện «đã xác nhận». Bước soát số liệu tự động chưa có luật nào cho khoản nộp đại lý nên không báo. | Thêm luật soát «khoản nộp đã xác nhận phải còn dòng sổ có hiệu lực»; chặn huỷ lẻ dòng thuộc khoản nộp. |
| T3 | Trung bình, **nghi ngờ** | Nháp lưu trước ngày Sheet tăng giá, sau đó mới bấm Gửi đơn hoặc xác nhận: đơn có thể chốt theo giá cũ, không ai được báo. Đã thấy bước xác nhận so với giá lưu trong nháp; chưa đọc hết xem còn lớp nào khác. | Viết một bài thử trước. Nếu đúng: lúc xác nhận đọc lại giá hiện hành, lệch thì báo. |
| T4 | Thấp | Kế toán hạ hoa hồng trên đơn Trả sau làm nợ đại lý tăng, có thể vượt hạn mức mà không bị chặn hay báo. | Cho thao tác này đi qua cùng bước kiểm hạn mức như các thao tác khác. |
| T5 | Thấp | Khoản nộp ghi ngày chuyển thuộc tháng đã khoá sổ thì kẹt: không xác nhận được, chỉ từ chối được. Tiền không sai. | Báo ngay lúc đại lý ghi, hoặc ghi phiếu theo ngày xác nhận. |
| T6 | Thấp, đã ghi sổ | Hai người cùng ghi một khoản tiền mặt trong cùng một giây thành hai khoản thu. Lộ ra dưới dạng «dư chờ hoàn», không mất tiền. | Thêm lớp chặn ở cơ sở dữ liệu khi làm giai đoạn 2 của lớp chống ghi trùng. |
| TNV-G1 ✔ | Cao, đã ghi sổ, hạn 31/12 | Đơn huỷ còn tiền đã thu: sổ, trang đơn và biên nhận vẫn tính «phải thu» như đơn chưa huỷ. | Theo kế hoạch đã có trong sổ lỗi. |
| HC-4.2 ✔ | Cao, đã ghi sổ, **hạn 30/11** | Bút toán điều chỉnh công nợ và chi phí chuyến chưa buộc người duyệt khác người tạo ở mọi đường. | Chủ quyết (Q1). |

**Đã kiểm và thấy ổn:** mọi bảng sổ tiền bị cơ sở dữ liệu cấm sửa, cấm xoá; huỷ một dòng luôn sinh dòng đối ứng. Hoàn quá số đã thu, nộp quá số đang giữ đều bị cơ sở dữ liệu từ chối dù hai lệnh tới cùng lúc. Hạn mức Trả sau có số phiên bản nên hai đơn không cùng lọt qua (trừ T4). Tiền gửi từ trình duyệt chỉ nhận số nguyên dương, thành tiền tính ở máy chủ. Hoa hồng làm tròn bằng số nguyên.

## 3. Vé: chỗ có thể mất hoặc sai

| Mã | Mức | Chuyện gì có thể xảy ra | Hướng sửa |
|---|---|---|---|
| V1 ✔ | Cao | Đơn đi 15/11 đã giữ vé hạn 15/11, nhân viên dời sang 18/11. Vé cũ vẫn gắn đơn, màn đơn báo đủ vé, khách vẫn thấy vé cũ. Ra cổng vé bị từ chối («hết hạn» hoặc «chưa tới ngày dùng»), người soát không có nút cho qua. Sửa số khách thì đã có bước cân lại vé; sửa ngày thì chưa. | Sau khi đổi ngày của đơn đã xác nhận: trả vé chưa mở không còn hợp ngày mới rồi cấp lại; vé đã mở mà lệch ngày thì báo thiếu vé. |
| V2 | Cao | Nhập nhầm lô vé (sai dịch vụ, sai hạn, hãng báo huỷ) mà đã có một đơn giữ vé của lô: phần còn lại không rút được và tiếp tục cấp cho khách mới. Màn hình lại hướng dẫn «hãy vô hiệu lô», việc không làm được. Một vé bị lộ ảnh cũng không vô hiệu riêng được, trừ khi huỷ cả đơn. | Thêm lệnh «Ngừng cấp lô» và lệnh vô hiệu từng vé, có nhật ký. Tên nút chờ chủ chọn. |
| V3 | Trung bình | Huỷ đơn có thể thành công mà vé không được trả về kho (khi bước soạn lệnh trả vé gặp lỗi). Khả năng xảy ra thấp, nhưng không có luật soát nào bắt «đơn huỷ còn giữ vé». | Lỗi thì dừng cả lệnh huỷ; thêm luật soát. |
| V4 ✔ | Trung bình | Người ngoài gửi nhiều mã sai từ khoảng 20 địa chỉ mạng thì đường dẫn xem vé của **mọi** khách bị khoá 15 phút, lặp lại được. Đơn đoàn trên 20 vé cũng có thể tự vấp giới hạn này và hiện ảnh vé vỡ (phần này nghi ngờ). | Bỏ giới hạn chung cho mọi khách (mã đường dẫn đã đủ dài), giữ giới hạn theo từng địa chỉ. |
| V5 | Trung bình | Vé trở lại kho (do đơn khác huỷ hoặc giảm khách) không tự cấp cho đơn đã thu tiền đang thiếu vé; phải có người bấm «Cấp vé». Tin «thiếu vé» chỉ nhắc 12 giờ một lần. | Gọi cấp bù sau mỗi lần vé về kho, hoặc thêm việc chạy định kỳ. |
| V6 | Thấp | Khe rất hẹp: khách mở ảnh vé đúng lúc đơn bị huỷ thì vé có thể về kho và cấp cho người khác trong khi khách cũ đã có ảnh. | Thêm một bước đọc lại, như đường của nhân viên đã có. |
| V7 | Thấp, vận hành | Nơi không có sóng thì không quét được vé và khách không mở được vé. Người quét tự bỏ được lượt quét trong 5 phút (có nhật ký). | Chủ cân nhắc: cho khách lưu ảnh vé về máy; theo dõi số lượt bỏ quét. |

**Đã kiểm và thấy ổn:** hai người không lấy trùng một vé (luật nằm trong cơ sở dữ liệu). Vé đã mở không bao giờ quay về kho. Quét hai máy cùng lúc thì một bên nhận «Đã dùng». Mã vé và mã đường dẫn khách đủ dài, không đoán được, không nằm trong địa chỉ hay nhật ký. Đối tác chỉ thấy vé của đơn mình lập.

## 4. Thông tin: chỗ có thể thất lạc hoặc đứt gãy

| Mã | Mức | Chuyện gì có thể xảy ra | Hướng sửa |
|---|---|---|---|
| TT1 ✔ | Cao | Ai đó gõ «850k» vào ô giá hoặc xoá nhầm ô Đơn vị trên Sheet. Trong 15 phút dịch vụ đó biến khỏi form lập đơn. Máy chỉ dừng khi mất quá nửa danh mục, nên một dòng hỏng lọt qua. Dấu vết duy nhất là dòng chữ mờ ở màn Danh mục. | Dòng hỏng định dạng mà dịch vụ đang có thì giữ bản đã lưu, báo đỏ và gửi tin cho Quản trị. |
| TT2 ✔ | Trung bình | Đang lập đơn bốn bước mà bấm nhầm thanh dưới, vuốt lùi trên iPhone hoặc tải lại trang thì mất hết phần đã gõ. Bản lưu tạm hiện chỉ chạy khi hết phiên đăng nhập. | Lưu tạm ở mọi lần rời trang khi form đã có chữ, dùng lại cơ chế 30 phút đã có. |
| TT3 | Trung bình | Bấm vào một thông báo đẩy trong lúc đang lập đơn thì trang bị chuyển đi, mất form. Chưa thử trên iPhone thật. | Để trang tự hỏi lại trước khi chuyển, hoặc mở cửa sổ mới. |
| TT4 | Trung bình, có chủ ý | Đổi giờ đón của đơn đã xác nhận khi khách đã xếp xe: chỉ có cảnh báo và tin nhắn, xe cũ vẫn cho chạy được với khách đó. Đúng theo quyết định trước đây; nêu để chủ biết. | Nếu muốn chặt hơn: giữ xe khi giờ hẹn mới nằm ngoài giờ chuyến, cho phá lệ có lý do. |
| TT5 | Thấp | Nhật ký đồng bộ Sheet chỉ ghi 6 dịch vụ đầu; giá cũ của phần còn lại không còn ở đâu. Đồng bộ hỏng giữa chừng không để lại dấu. | Ghi đủ danh sách thay đổi; ghi nhận mọi lỗi của lần chạy tự động. |
| TT6 | Thấp | Thư báo vé hỗ trợ và thông báo đẩy chỉ gửi một lần, hỏng thì không gửi lại. Hộp thư trong Nền tảng không mất, người nhận chỉ biết trễ. | Màn liệt kê thư chưa gửi được. |
| TT7 | Thấp | Sửa giá ghi đè và bấm Ngừng bán cùng lúc trên một dịch vụ: một bên có thể bị đè. | Thêm kiểm «bản đang sửa có còn mới không» như các màn khác. |

**Đã kiểm và thấy ổn:** đơn, chuyến, hồ sơ, xe, địa điểm đều báo khi hai người sửa chồng nhau. Lưu nháp là một lô trọn vẹn, không mất dòng giữa chừng. Bấm hai lần không sinh hai lệnh. Đơn chụp lại tên và giá dịch vụ lúc lập nên Sheet đổi không làm đơn cũ mất tên hay giá. Tệp kèm có trạng thái «tải dở dang» và lệnh chạy lại.

## 5. An toàn, bảo mật, độ liên tục của dữ liệu (xếp nặng → nhẹ)

| Mã | Mức | Vấn đề | Hướng sửa |
|---|---|---|---|
| LT1 ✔ | Cao, đã ghi sổ (HC-5.19), hạn 31/12, đã dời ba lần | Chưa từng khôi phục thử. Không có bản xuất định kỳ ra ngoài Cloudflare. Tài liệu dự án ghi bản xuất nguyên khối không nạp lại được nếu không tách ba tệp, và chưa thử với dữ liệu thật. | Diễn tập một lần vào cơ sở dữ liệu tạm; đặt lịch xuất hằng tuần ra nơi ngoài Cloudflare; chạy bộ soát số liệu trên bản nạp lại. |
| LT2 | Cao, nghi ngờ | Năm kho tệp (giấy tờ, tệp vé hỗ trợ, vé, ảnh biên lai, ảnh dịch vụ) không thấy sao lưu. Tính năng «quay lại thời điểm cũ» không phủ kho tệp. Chưa xem được cấu hình thật trên Cloudflare. | Chủ xem cấu hình; bật giữ phiên bản cho kho biên lai và giấy tờ; thêm bước đối chiếu dòng dữ liệu với tệp vào diễn tập. |
| LT3 ✔ | Cao | Máy hỏng, việc chạy tự động 15 phút một lần bị lỗi: không ai được báo. Bộ soát số liệu (khoảng 185 luật) chỉ chạy lúc phát hành, không chạy hằng ngày. | Thêm việc chạy hằng ngày soát nhóm luật tiền và gửi thư khi lệch hoặc khi có lỗi máy chủ. |
| LT4 | Cao | Mọi thứ phụ thuộc một người. Chưa có trang «mất tài khoản Cloudflare / chủ vắng mặt». Bản Development dùng chung tài khoản Cloudflare với bản thật. Mức mất dữ liệu chấp nhận được và thời gian phải chạy lại chưa được duyệt, chưa đo. | Một trang kịch bản; người thứ hai có quyền khẩn; nơi cất bản xuất. |
| BM1 ✔ | Trung bình | Tài khoản Đối tác chỉ có PIN 6 số, không bắt hai lớp. Gõ sai 5 lần thì khoá 15 phút rồi tự mở, không khoá lâu dần. Kẻ đổi được địa chỉ mạng thử khoảng 480 PIN một ngày cho mỗi số điện thoại. | Khoá lâu dần và báo Toàn quyền; hoặc bắt hai lớp qua thư (Q3). |
| BM2 | Trung bình | Đăng nhập sai và bị khoá không để lại dấu lâu dài (dọn sau 15 phút). Một đợt dò PIN sẽ không ai thấy. | Ghi nhật ký khi một tài khoản chạm giới hạn, đưa vào hộp thông báo của Toàn quyền. |
| BM3 | Trung bình | Biết số điện thoại của Kế toán thì cứ 15 phút gõ sai 5 lần là người đó không vào được bằng PIN (Face ID vẫn vào được). | Máy đã được tin thì đếm riêng. |
| LT5 ✔ | Trung bình | Hạn sổ tự chặn đường phát hành: 1/12 (HC-4.2), rồi 1/1/2027 (ba mục khác). | Q1; lên lịch quyết các mục 31/12 trước 20/12. |
| LT6 | Trung bình | Sau khi đổi cấu trúc dữ liệu thì chỉ quay lại bản mã cũ được trong một khoảng ngắn; sau đó chỉ còn «quay lại thời điểm cũ», tức mất dữ liệu mới. Hai lần phát hành 2.98, 2.99 không lưu điểm khôi phục trong hồ sơ. | Luôn phát hành bằng lệnh chuẩn; diễn tập sẽ trả lời phần còn lại. |
| BM4 | Thấp | Số căn cước, bằng lái lưu dạng đọc được trong cơ sở dữ liệu. Ai có quyền Cloudflare hoặc cầm bản xuất đều đọc được. | Mã hoá cột này trước khi có bản xuất ra ngoài (đi cùng LT1). |
| BM5 | Thấp | Không giới hạn tần suất cho người đã đăng nhập: một tài khoản Bán hàng tải được hết Danh bạ trong vài phút, không có nhật ký đọc. | Đếm lượt đọc danh sách, vượt ngưỡng thì báo. |
| BM6 | Thấp | Trợ lý gửi câu hỏi sang OpenAI; bộ che không che được tên khách do người dùng tự gõ. Bước chống máy tự động ở Đăng nhập tự tắt nếu thiếu khoá bí mật. Thiếu một dòng bắt buộc dùng kết nối an toàn trong mã (có thể đã bật ở Cloudflare, chưa kiểm). | Ba sửa nhỏ, gom một lần. |

**Đã kiểm và thấy ổn:** PIN được băm đúng chuẩn, có muối riêng. Ngưng tài khoản hay đổi quyền có hiệu lực ngay ở lệnh kế tiếp. Nội bộ bắt buộc hai lớp. Không có chỗ chèn mã vào trang hay vào câu lệnh dữ liệu trong phần đã rà. Tệp tải lên được kiểm loại thật, tên kho không đoán được. Không có khoá bí mật trong kho mã. Nhật ký bị cơ sở dữ liệu cấm sửa, cấm xoá, chỉ Toàn quyền đọc.

## 6. Chiếu theo chuẩn Oracle: đã có gì, cần thêm gì

Thước đo là cách Oracle làm phần mềm tài chính và cơ sở dữ liệu. Đề nghị dưới đây vừa sức một hệ nhỏ, không đề nghị chuyển nền.

| # | Chuẩn mực | Hiện trạng | Cần điều chỉnh hoặc bổ sung |
|---|---|---|---|
| 1 | Sổ kép, không sửa, huỷ bằng bút toán đối ứng | Có một phần (là sổ phụ, chưa có sổ cái) | Thêm luật soát «tổng hai bên bằng 0 theo ngày». |
| 2 | Khoá kỳ kế toán | **Đã có** | Thêm bảng kiểm trước khi khoá. |
| 3 | Số chứng từ liên tục, không hở | **Chưa có** | Cấp số biên nhận và phiếu thu theo năm, cùng lô với lần ghi tiền; số đã huỷ vẫn giữ. |
| 4 | Tách nhiệm vụ, hai người duyệt | Có một phần | Đóng HC-4.2 bằng luật trong cơ sở dữ liệu. |
| 5 | Dấu vết ai làm gì, giá trị trước và sau | Có một phần (nhật ký là chữ tự do) | Thêm giá trị trước/sau có cấu trúc cho việc về tiền và quyền; xuất nhật ký ra ngoài hằng tuần. |
| 6 | Đối soát sổ với sao kê ngân hàng | Có một phần (làm tay) | Sửa T1 trước; sau đó nhập tệp sao kê và khớp tự động theo mã giao dịch. |
| 7 | Giao dịch trọn vẹn, chống ghi trùng, chống đè | Có một phần | Thêm kiểm «bản đang sửa còn mới không» cho hạn mức và giá ghi đè. |
| 8 | Luật nằm trong cơ sở dữ liệu | **Đã có**, mạnh | Soát khoá ngoại hằng ngày (đi cùng LT3). |
| 9 | Mô hình bên liên quan | Có một phần | Cảnh báo trùng mã số thuế lúc tạo hồ sơ. |
| 10 | Hiệu lực theo ngày cho giá và chính sách | Có một phần | Bảng giá có ngày bắt đầu, ngày kết thúc, chỉ ghi thêm (cũng chữa TT5). |
| 11 | Sao lưu, diễn tập, bản sao ngoài vùng | **Chưa có** | LT1, LT2, LT4. |
| 12 | Mã hoá dữ liệu nhạy cảm khi lưu | Có một phần | BM4. |
| 13 | Phân quyền tới từng dòng, quyền tối thiểu | Có một phần (ở mã) | Bài kiểm máy «mọi đường đọc của Đối tác đều có lọc phạm vi». |
| 14 | Môi trường thử tách khỏi bản thật | Có một phần | Hoàn tất bản Development; thử đổi cấu trúc trên bản sao dữ liệu đã che. |
| 15 | Giám sát và cảnh báo | **Chưa có cảnh báo** | LT3. |
| 16 | Thời hạn giữ và xoá dữ liệu cá nhân | Có một phần | Bảng thời hạn giữ theo loại dữ liệu; việc dọn định kỳ có nhật ký. |

## 7. Chiếu theo chuẩn App Store và CH Play

Quyết định lên kho (ADR-0200, 13/11) đã liệt kê phần lớn điều kiện. Số điều khoản của hai kho dưới đây ghi theo trí nhớ: **phải đọc lại văn bản gốc trước khi nộp**.

**Ba điểm quyết định 13/11 chưa tính tới:**

- K1. **Thông báo đẩy sẽ mất trên bản iPhone từ App Store.** Loại thông báo đang dùng không chạy trong vỏ ứng dụng. Đây cũng là lý lẽ mạnh nhất để Apple không coi ứng dụng là «trang web bọc lại». Cần một quyết định riêng về thông báo đẩy gốc.
- K2. **Trợ lý gửi dữ liệu sang OpenAI** phải khai với hai kho; Apple có thể đòi hỏi đồng ý riêng trước lần dùng đầu. Lựa chọn: hỏi đồng ý, hoặc tắt Trợ lý trên bản kho.
- K3. **Bước chống máy tự động ở Đăng nhập có thể chặn người duyệt** của Apple và Google. Phải thử trong vỏ và ghi cách đăng nhập vào ghi chú nộp duyệt.

**Bắt buộc để được duyệt, hiện chưa có:** vỏ ứng dụng cho hai kho; hai tệp chứng minh tên miền; trang chính sách quyền riêng tư công khai (hiện nằm sau đăng nhập); trang hỗ trợ công khai và thư hỗ trợ; bảng khai dữ liệu thu thập cho hai kho; tài khoản thử cho người duyệt; câu xin quyền camera bằng tiếng Việt; tệp khai quyền riêng tư của Apple; tài khoản nhà phát triển dạng tổ chức (cần mã D-U-N-S); biểu tượng, ảnh chụp, mô tả; màn báo lỗi khi mất mạng trong vỏ.

**Bắt buộc, đã có một nửa:** xoá tài khoản. Đã có «Yêu cầu xoá dữ liệu» và ẩn danh hoá. Cách dung hoà với luật «không xoá cứng»: ngưng tài khoản, đăng xuất mọi máy, ẩn danh hồ sơ; giữ đơn, sổ tiền, nhật ký theo luật kế toán và nói rõ phần giữ lại trong chính sách. Còn chờ diễn tập khôi phục (LT1).

**Thanh toán:** đạt về bản chất. Chuyển khoản bằng mã QR cho dịch vụ tour ngoài đời không phải dùng cổng thanh toán của kho, với điều kiện không bán hay mở khoá tính năng số trong ứng dụng.

**Nên có:** phần giới thiệu cho người lạ ở màn Đăng nhập (giảm rủi ro bị xếp là ứng dụng nội bộ); sửa dòng mô tả «cho nhân viên Tour Đảo»; liên kết ngoài mở bằng trình duyệt của máy; luật sư xác nhận về luật bảo vệ dữ liệu cá nhân của Việt Nam (căn cước có là dữ liệu nhạy cảm không, chuyển dữ liệu ra nước ngoài, hồ sơ đánh giá tác động).

**Không cần:** đăng nhập bằng Apple; lưu bí mật vào kho khoá của máy (phiên đã là cookie trình duyệt không đọc được); chế độ tối.

## 8. Kế hoạch hành động

Mỗi đợt là một lần giao việc riêng, có người kiểm độc lập vì đều chạm tiền, dữ liệu hoặc quyền. Thời lượng là ước lượng, chưa đo.

**Đợt 0 — Chủ quyết, không cần viết mã (trong tuần này)**

- Q1. Mục hạn 30/11 (HC-4.2): đóng sau khi đối chiếu, hoặc gia hạn có lý do. Khuyến nghị: quyết trước 25/11.
- Q2. Cho làm Đợt 1. Khuyến nghị: có.
- Q3. Đối tác: hai lớp qua thư, hay khoá lâu dần. Khuyến nghị: khoá lâu dần trước (không đổi cách 1.000 đối tác đăng nhập), hai lớp để sau.
- Xem trên Cloudflare: thời hạn «quay lại thời điểm cũ» của gói đang dùng, và năm kho tệp có bật giữ phiên bản không.

**Đợt 1 — Chặn sai tiền, sai vé (khoảng một tuần)**

| Việc | Xong khi |
|---|---|
| T1: bắt mã giao dịch cho khoản nộp bằng chuyển khoản; cảnh báo ảnh trùng | Xác nhận khoản nộp thứ hai với cùng mã bị từ chối; có bài thử đỏ trước, xanh sau. |
| T2: luật soát khoản nộp; chặn huỷ lẻ dòng nộp | Cố ý làm lệch thì bộ soát báo; huỷ lẻ bị từ chối. |
| V1: dời ngày thì cân lại vé | Dời ngày đơn đã có vé thì màn đơn báo đúng số vé thiếu hoặc vé mới đúng ngày. |
| TT1: dòng Sheet hỏng không làm mất dịch vụ | Gõ «850k» vào Sheet thử thì dịch vụ vẫn bán theo giá cũ và Quản trị nhận tin. |
| T3: bài thử «nháp cũ, giá mới» | Biết chắc có lỗi hay không; có thì sửa trong đợt này. |

**Đợt 2 — Lấy lại được dữ liệu (xong trước 15/12, trước hạn sổ 31/12)**

- Diễn tập khôi phục một lần, ghi lại thời gian và chỗ vướng (LT1).
- Xuất dữ liệu hằng tuần ra một nơi ngoài Cloudflare; mã hoá số giấy tờ trước lần xuất đầu (BM4).
- Giữ phiên bản cho kho biên lai và giấy tờ (LT2).
- Soát số liệu tiền hằng ngày, gửi thư khi lệch hoặc khi máy lỗi (LT3).
- Một trang «mất tài khoản / chủ vắng mặt» và người thứ hai có quyền khẩn (LT4).

**Đợt 3 — Bảo mật đăng nhập và vé (tháng 12)**

- Khoá lâu dần, nhật ký dò PIN, bộ đếm riêng cho máy được tin (BM1–BM3).
- Bỏ giới hạn chung của đường dẫn vé khách (V4).
- «Ngừng cấp lô», vô hiệu từng vé, cấp bù tự động, luật soát «đơn huỷ còn giữ vé» (V2, V3, V5, V6).
- Giữ form lập đơn khi rời trang (TT2, TT3).

**Đợt 4 — Nâng lên chuẩn Oracle (quý 1/2027)**

- Số chứng từ liên tục (mục 6, dòng 3).
- Nhập sao kê và khớp tự động (dòng 6).
- Giá trị trước/sau trong nhật ký (dòng 5).
- Bảng giá có hiệu lực theo ngày (dòng 10).
- Bài kiểm máy cho mọi đường đọc của Đối tác (dòng 13).

**Đợt 5 — Lên hai kho (theo lộ trình ADR-0200)**

- Trước khi dựng vỏ: quyết K1 (thông báo đẩy gốc), K2 (Trợ lý trên bản kho), thử K3.
- Chủ làm song song từ bây giờ vì chờ lâu: mã D-U-N-S, tài khoản nhà phát triển tổ chức, luật sư.
- Điều kiện trước: Đợt 2 xong (xoá tài khoản chờ diễn tập khôi phục) và Đợt 3 phần đăng nhập xong (ứng dụng công khai sẽ bị dò PIN nhiều hơn).

## 9. Phần chưa đọc, chưa kiểm

- Bảo mật: mới đọc kỹ khoảng 25 trên 504 đường gọi máy chủ. Kết luận «đối tác không xem được dữ liệu của nhau» là theo mẫu, chưa phải toàn bộ.
- Tiền: chưa đọc phần đặt cọc, phân định trách nhiệm, thay khoản thu, điều chỉnh, biên nhận, giá và phí đưa đón, nội dung từng luật trong cơ sở dữ liệu.
- Vé: chưa đọc các màn giao diện vé, phần ký số, nguyên văn các quyết định về vé.
- Chưa chạy bộ kiểm, chưa dựng hai lệnh đua nhau trên cơ sở dữ liệu thật, chưa thử iPhone thật.
- Chưa xem production và cấu hình thật trên Cloudflare.
- Chính sách hiện hành của hai kho và luật dữ liệu cá nhân Việt Nam: theo trí nhớ, cần văn bản gốc và luật sư.

## Phụ lục — Chỗ trong mã (cho người kiểm sau)

| Mã | Tệp |
|---|---|
| T1 | `src/modules/billing/khoan-nop.ts` (`xacNhanKhoanNop`), `src/modules/billing/service.ts` (`ghiQuyetToan`; so với khoản công ty thu có `kiemCacMa`), `migrations/0159_khoan_nop_dai_ly.sql` |
| T2 | `src/modules/billing/service.ts` nhánh `dao_dong` (chỉ chặn dòng thương mại, `ATTRIBUTION`, `HELD`); `scripts/audit-checks.mjs` không có `bil_agent_remittance` |
| T3 | `src/modules/orders/xac-nhan-chung.ts` (`viPhamGiaDanhMuc` nhận dòng đã lưu), `src/modules/orders/service-rules.ts` (`catalog_changed` lúc lưu) |
| T4 | `src/modules/orders/index.ts` (lô ghi mức tay: `cauGhiTayKemPax`), `src/modules/billing/cong-no-dai-ly.ts` |
| T5 | `src/modules/billing/khoan-nop.ts` (ngày chuyển làm ngày phát sinh) |
| V1 | `src/modules/orders/index.ts` route `PUT /api/orders/:id/trip` (không nhận hàm vé; so với `money-edit` có `canBangVeSauSuaKhach`), `src/shared/ket-qua-quet.ts` |
| V2 | `src/modules/ve-dien-tu/repository.ts` (`BO_LO`, `cauDatChoXoa` không nơi gọi), `src/modules/ve-dien-tu/index.ts` (câu «Hãy vô hiệu lô») |
| V3 | `src/index.ts` (nhánh soạn câu trả vé khi huỷ), `scripts/audit-checks.mjs` nhóm R-VDT |
| V4, V6 | `src/modules/ve-dien-tu/index.ts` (`HAN_MUC_TONG`, `mocDuongDanKhach`, route ảnh công khai), `src/modules/auth/throttle.ts` |
| V5 | `src/modules/ve-dien-tu/index.ts` (cấp bù chỉ sau khi nhập lô), `src/modules/ve-dien-tu/noi-orders.ts` |
| TT1, TT5 | `src/modules/catalog/sheet.ts`, `rules.ts` (`planSync`, `syncGuard`, `toEffective`), `repository.ts`, `service.ts` |
| TT2, TT3 | `web/order-form.ts` (`pagehide` chỉ chụp khi có `SESSION_ENDED_KEY`), `web/sw/sw.ts` (`notificationclick`) |
| TT4 | `src/shared/dieu-phoi-lich-chung.ts`, `src/shared/dieu-phoi-kiem.ts` |
| BM1–BM3 | `src/modules/auth/mfa-rules.ts` (`loginStep`), `src/modules/auth/throttle.ts`, `src/modules/auth/index.ts`, `src/shared/audit-actions.ts` |
| BM4 | `migrations/0032_giay_to_cua_nguoi.sql` (`document_number`) |
| BM5, BM6 | `src/modules/parties/index.ts` (danh sách), `src/modules/tro-ly/goi-mau.ts`, `src/modules/auth/turnstile.ts`, `public/_headers` |
| LT1–LT6 | `docs/quyen-hoan.json` (HC-5.19, HC-4.2, TNV-G1), `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md`, `scripts/tach-ban-xuat-d1.mjs`, `wrangler.jsonc` (`r2_buckets`, `triggers`, `observability`), `scripts/release-lib.mjs`, `docs/HANDOFF-N1.md` |
| Kho ứng dụng | `docs/adr/ADR-0200-len-kho-ung-dung-cong-khai.md`, `docs/superpowers/specs/2026-11-13-len-kho-ung-dung-phuong-an.md`, `public/manifest.webmanifest`, `public/_headers`, `src/shared/web-push.ts`, `src/modules/parties/xoa-an-danh.ts` |
