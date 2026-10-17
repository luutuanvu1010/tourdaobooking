# Đề bài đã dán vào Claude Design (18/10/2026)

Hồ sơ có ngày: không sửa. Chép nguyên văn từ trang Artifact "Đề bài vẽ lại Tạo đơn" (https://claude.ai/artifact/GkS8roeycQCtkdgCHFrZXX), mục "Đề bài", nơi chủ dự án chốt các quyết định 17–18/10/2026. Phần "Đã chốt thêm ngày 18/10" và "Phải nêu trong đặc tả" của lời bàn giao nằm ở `DAC-TA.md` cùng thư mục. Con số "113 dịch vụ" trong đề bài là sai: Sheet có 114 (xem DAC-TA mục 6).

---- BẮT ĐẦU ----

Bạn là nhà thiết kế sản phẩm cao cấp, chuyên phần mềm quản trị doanh nghiệp. Hãy thiết kế lại màn **Tạo đơn** của một phần mềm nội bộ: **điện thoại trước** (iPhone 390×844), rồi **máy tính** (1040px, kiểm thêm 1440px). Dùng hệ thống thiết kế **"Tour Đảo Booking — Design System"** (trong đó đã có bản dựng lại màn Tạo đơn hiện tại ở `ui_kits/booking-app/`); không dùng hệ thống khác, không tự đặt màu hay phông mới.

## Bối cảnh
"Island Booking System" là phần mềm của Công ty TNHH Tour Đảo (Nha Trang) để lập đơn dịch vụ tour, xác nhận đơn, điều phối xe, thu tiền. Tạo đơn là màn nhân viên văn phòng dùng nhiều nhất: khách hoặc đại lý nhắn Zalo hay gọi điện, nhân viên mở Tạo đơn, chọn dịch vụ, nhập số khách, giờ và nơi đón, rồi lưu. Khoảng 30 nhân viên, hầu hết không rành máy tính, thao tác bằng ngón cái trên iPhone. Giao diện **tiếng Việt có dấu**, không chữ Anh lộ ra.

## Bốn tiêu chí của chủ dự án (theo thứ tự ưu tiên)
1. Dễ nhìn. 2. Gọn mắt. 3. Đúng phong cách phần mềm quản trị chuyên nghiệp. 4. Đơn giản, nhìn là hiểu ngay.
Nguyên tắc vàng: **một lần chạm** là chọn được nhóm dịch vụ, **một lần chạm** là thêm được một dịch vụ.

## Hiện trạng (ảnh đính kèm, chụp ngày 14/10/2026)
- Lọc nhóm là nút xổ xuống mở bảng tick 14 nhóm; mở bảng thì danh sách dịch vụ biến mất; mỗi lần lọc tốn ba chạm.
- Danh sách dịch vụ chỉ hiện khi chạm vào ô tìm.
- Hai nút "Khách tự đặt | Đặt qua đối tác" bị đọc nhầm là khách tự thao tác trên ứng dụng (ứng dụng không cho khách lẻ tự đặt), và nằm sau ô tên, số điện thoại.
- Một thẻ dịch vụ dài gần hai màn hình điện thoại; đơn ba dịch vụ phải cuộn năm, sáu màn mới tới nút Lưu.
- Mỗi điểm đón, trả có hai ô (một ô gõ để lọc, một ô chọn) cho cùng một việc.
- Năm kiểu nút phụ khác nhau; thông báo "Đã thêm…" che thanh bước; trên điện thoại khối Tóm tắt lặp đúng con số của thanh cuối trang.

## Quyết định đã chốt
Vẽ đúng như dưới đây. Nếu bạn muốn đề xuất khác, ghi vào một ghi chú riêng, KHÔNG đưa lên các artboard.

### A. Chọn dịch vụ (phần quan trọng nhất)
- Thứ tự trong khối "Dịch vụ": ô tìm "Tìm theo tên hoặc mã dịch vụ" → **một hàng nút nhóm cuộn ngang** → **khung danh sách luôn mở** → các thẻ dịch vụ đã chọn nằm **bên dưới** khung.
- Hàng nhóm: nút "Tất cả" đứng đầu, rồi các nhóm theo thứ tự Quản trị đã sắp. **Chọn một nhóm mỗi lần.** Đây là thay đổi có chủ đích so với bảng tick nhiều nhóm của bản 13/10; chủ dự án duyệt ngày 17/10. Nút không có số đếm. Mép phải mờ dần kèm dấu "›" để báo còn nhóm phía sau; nhóm đang chọn luôn được cuộn vào tầm nhìn. Chạm nút là lọc liền, không có bảng, không có nút "Đóng". Máy nhớ nhóm chọn lần trước theo từng tài khoản.
- Khung danh sách: cao cố định khoảng 7 dòng trên điện thoại, cuộn bên trong khung. Đầu khung có dòng đếm "113 dịch vụ" hoặc "23 dịch vụ · Thể thao biển". Khi xem "Tất cả": dịch vụ gắn sao đứng đầu trong mục "★ Hay dùng", sau đó chia mục theo nhóm (tiêu đề mục chữ nhỏ viết hoa).
- Mỗi dòng cao ít nhất 44px: nút sao ☆/★ ở đầu (nút riêng, không lồng vào nút chọn); tên dịch vụ, trong đó phần trước dấu hai chấm ("Tour:", "Vé Hòn Tằm:", "Tháp Bà:") in màu chữ phụ, phần sau màu chữ chính, **không cắt bớt tên**; dòng phụ nhỏ là mã dịch vụ; giá người lớn thẳng cột bên phải, chữ số đều cột, không ghi "₫" trong danh sách; chỉ dịch vụ tính theo nhóm khách mới ghi đơn vị dưới giá ("/ nhóm 5 khách").
- Chạm một dòng là thêm dịch vụ. Khung **đứng yên**, dòng đó hiện nhãn "✓ đã thêm" (không chặn chọn trùng); thẻ dịch vụ mới hiện bên dưới khung. Không có thông báo nổi; chỉ báo cho trình đọc màn hình ("Đã thêm Jetski L2 30 phút").
- Gõ chữ: tìm trong **mọi** nhóm, kết quả chia mục theo nhóm. Trong lúc có chữ, hàng nhóm quay về "Tất cả", các nhóm không có kết quả **mờ đi** (không hiện số); chạm một nhóm còn sáng để thu hẹp. Ô tìm có nút ✕ xoá chữ.
- Dòng không chọn được ("chưa có giá", "chưa hỗ trợ") hiện mờ, chạm không có tác dụng, vẫn đọc được bằng trình đọc màn hình.
- Nút phụ "+ Dịch vụ nhập tay" ngay dưới khung danh sách, chỉ hiện với tài khoản được phép.
- Đơn đủ 20 dịch vụ: ô tìm và khung khoá, kèm câu "Đơn đã đủ 20 dịch vụ."

### B. Ngày đi và khối khách hàng
- Trên cùng form là một dòng riêng "Ngày khởi hành" kèm chữ nhỏ "Áp cho mọi dịch vụ trong đơn", tách khỏi khối Khách hàng.
- Khối "Khách hàng": tiêu đề, bên phải là liên kết chữ nhỏ "Điền thông tin của tôi".
- Hàng đầu tiên trong khối: nhãn "Đơn của" và công tắc hai lựa chọn **"Khách lẻ | Qua đối tác"** (rộng hết khối, cao 44px), mặc định "Khách lẻ".
- Chạm "Qua đối tác": ô "Tìm đối tác theo tên" mở ngay dưới công tắc, kèm danh sách kết quả (tên · "cá nhân" hoặc "tổ chức"). Chọn xong thu thành một dòng nền xanh nhạt "Lữ hành Biển Xanh · tổ chức · được hưởng hoa hồng" và liên kết "Đổi".
- Tiếp theo: ô "Tên khách đi tour *", ô "Số điện thoại *" (khi đã chọn đối tác thì ghi "Số điện thoại khách *"), liên kết "+ Email, ghi chú".
- Một dòng chữ xám "Hồ sơ khách: chưa liên kết (không bắt buộc)" thay cho nhãn vàng "Chưa gắn hồ sơ khách" cũ. Phần tra hồ sơ trùng số giữ nguyên hành vi: gõ đủ số điện thoại thì hiện các hồ sơ dùng số đó, với nút "Dùng hồ sơ này" và "Tạo hồ sơ mới".
- **Lớp chặn nhầm:** đang chọn "Khách lẻ" mà số điện thoại vừa gõ trùng hồ sơ một đối tác được hưởng hoa hồng, thì ngay dưới ô số điện thoại hiện khung cảnh báo nền cát: "Số này là của đối tác Minh Travel. Đơn này đặt qua đối tác đó?", với nút chính nhỏ "Đúng, qua Minh Travel" và nút phụ "Không". Chọn "Đúng": công tắc chuyển sang "Qua đối tác" với Minh Travel đã chọn, hai ô khách được xoá trống và con trỏ về ô tên để nhập người đi tour.

### C. Thẻ dịch vụ
- **Chỉ một thẻ mở tại một lúc.** Thêm dịch vụ mới hoặc chạm mở thẻ khác thì thẻ đang mở tự gập. Thẻ gập là một dòng: tên · số khách ("2 NL · 1 TE · 1 EB") · giờ và nơi đón ("đón 07:30 KS Biển Xanh") · thành tiền bên phải. Thông tin còn thiếu hiện thành chip nền cát ("Chưa chốt giờ đón", "Chưa có nơi đón"); các cảnh báo (giá danh mục đã đổi, ngày khởi hành đã qua, đặt gấp) cũng hiện thành chip trên dòng gập. Thẻ có **lỗi chặn lưu** (vd "Tối đa 50 khách.") luôn mở, kể cả khi đang có thẻ khác mở.
- Đầu thẻ mở: tên dịch vụ, mã, và biểu tượng thùng rác ở góc phải, thay cho chữ "Xoá" màu đỏ (tên cho trình đọc màn hình: "Xoá dịch vụ …"; hành vi xoá giữ như cũ).
- Số khách: các loại khách **có giá** xếp thành **lưới 2 cột**. Mỗi ô gồm tên loại (Người lớn, Trẻ em, Người cao tuổi, Em bé), một dòng chữ nhỏ giá và điều kiện ("1.200.000 · cao 1–1,4 m"), và bộ đếm − số + (nút 44px). Dịch vụ chỉ có giá người lớn thì chỉ một ô. Dịch vụ tính theo nhóm chỉ có một ô "Số khách" kèm dòng "7 khách = 2 lượt".
- Tiền: mỗi loại khách có người là một dòng "2 người lớn × 1.350.000 = 2.700.000", canh phải. Chỉ khi có từ hai dòng trở lên mới có thêm dòng "Thành tiền dịch vụ". Liên kết chữ "Sửa giá" mở ô đơn giá cho từng dòng; dòng đã sửa hiện nhãn giá "Khác giá danh mục" và giá danh mục gạch ngang.
- Đưa đón: mỗi chặng có "Giờ đón" (hoặc "Chưa chốt giờ"), liên kết "Đón khác ngày", **một ô "Nơi đón"** và **một ô "Nơi trả"**. Chạm vào ô thì ô thành ô gõ kèm danh sách gợi ý ngay dưới (tên điểm · loại điểm, vd "Khách sạn Biển Xanh · khách sạn", "Sân bay Cam Ranh · sân bay"); chạm một dòng là chọn; dòng cuối luôn là "Gõ tự do…". Chặng đủ thông tin gập thành một dòng như hiện nay. Nút phụ "+ Chiều về", "+ Chặng"; liên kết "Xe riêng, số chỗ"; dòng gập "Thông tin chuyến" (giờ khởi hành, có mặt lúc, có mặt tại, ghi chú dịch vụ).
- Dải cảnh báo đặt gấp ở cuối thẻ giữ nguyên (nền cát, nút "Duyệt đặt gấp").

### D. Phần còn lại
- **Thang nút ba cấp cho cả màn.** Chính (nền xanh đậm, chữ trắng): chỉ "Lưu, chờ xác nhận". Phụ (viền 1px, chữ thường): "+ Chiều về", "+ Chặng", "+ Hành khách", "+ Dịch vụ nhập tay", "Chọn người phụ trách". Lối nhỏ (chữ xanh): "Điền thông tin của tôi", "+ Email, ghi chú", "Sửa giá", "Đón khác ngày", "Bỏ chặng", "Đổi". Không còn nút viên thuốc, nút nền xanh nhạt hay nút nét đứt.
- **Thanh toán:** "Giảm giá (₫)", "Thanh toán trước (₫)". Hai ô "Hình thức" và "Người nhận tiền" cùng câu "Tiền trả trước được ghi vào sổ ngay sau khi lưu đơn." **chỉ hiện khi đã nhập số tiền trả trước**. Cuối khối là "Ghi chú thanh toán".
- **Điện thoại bỏ khối Tóm tắt.** Thanh dính cuối trang gồm dòng "3 dịch vụ · Tổng 9.300.000 ₫" (thêm "Trả trước 2.000.000 ₫" nếu có) và nút "Lưu, chờ xác nhận". Chạm dòng tổng thì mở bảng chi tiết ngay trên thanh: Tạm tính, Giảm giá, Tổng cộng, Thanh toán trước (ghi sau khi lưu), câu "Số này chỉ để xem trước; hệ thống tính lại khi lưu." Cảnh báo về tiền (nếu có) hiện ngay trên nút Lưu, luôn thấy.
- Không còn thông báo nổi che thanh bước. Lỗi khi lưu hiện ngay trên nút Lưu.
- Giữ nguyên: thanh bốn bước dính đầu trang "Khách · Dịch vụ · Thanh toán · Phụ trách" (dấu ✓ cho bước đã đủ, chạm để nhảy tới); khối "Hành khách" (chỉ hiện khi đơn đã có dịch vụ; "0/2 khách đã có tên", nút "+ Hành khách"); khối "Người phụ trách" (huy hiệu "Chờ nhận", nút "Chọn người phụ trách").
- **Máy tính (≥ 960px):** hai cột; cột phải dính gồm Tóm tắt, Người phụ trách, nút Lưu, nút "Quay lại"; khối Hành khách trải ngang dưới hai cột như hiện nay. Hàng nhóm vẫn là một hàng cuộn ngang; rê chuột thì hiện nút ‹ ›; đi được bằng bàn phím.

## Biến thể theo vai (mỗi biến thể một artboard)
- **Đối tác, Thực tập:** "Đơn của" là ô chỉ đọc "Minh Travel (tài khoản của bạn)"; đơn giá khoá theo giá danh mục (không có "Sửa giá"); ô giảm giá khoá kèm một dòng giải thích ngắn; không có "+ Dịch vụ nhập tay" nếu tài khoản không được phép.
- **Tài khoản lai** (vừa là đối tác vừa là nhân viên): không có công tắc "Đơn của"; chỉ có hai ô khách và dòng hồ sơ khách.
- **Bảng "Đổi khách"** ở trang đơn (bảng trượt từ đáy, dùng sau khi đơn đã xác nhận): cùng khối "Đơn của" và hai ô khách, câu cảnh báo "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại.", nút "Lưu khách".

## Dữ liệu mẫu (dùng đúng)
Khách: Trần Văn Bình, 0905 000 111 (số giả). Ngày khởi hành 20/10/2026.
Đơn ba dịch vụ:
1. TD2 · Tour 2 đảo: Hòn Mun + Hòn Tằm + buffet trưa. 2 người lớn × 1.350.000 = 2.700.000; 1 trẻ em × 1.200.000 = 1.200.000; 1 em bé × 0 = 0. Thành tiền 3.900.000. Đón 07:30 tại Khách sạn Biển Xanh.
2. TTBL230 · Motor nước: Jetski L2 (30 phút) Hòn Tằm. 2 người lớn × 1.400.000 = 2.800.000. Chưa chốt giờ đón.
3. TTBPC · Phao chuối (5 pax) Hòn Tằm. 7 khách = 2 lượt × 1.300.000 = 2.600.000.
Tổng 9.300.000 ₫. Trả trước 2.000.000 ₫, chuyển khoản, người nhận Công ty.
Giá theo loại khách của TD2: người lớn 1.350.000; trẻ em 1.200.000 (cao 1–1,4 m); người cao tuổi 1.350.000 (từ 60 tuổi); em bé 0 (dưới 1 m, miễn phí). Jetski chỉ có giá người lớn; Phao chuối tính theo nhóm 5 khách.
Đối tác mẫu: Lữ hành Biển Xanh (tổ chức), Minh Travel (tổ chức).

Danh mục thật: 113 dịch vụ, 14 nhóm. Thứ tự nhóm hiện có: Tour đảo (11), Long Phú (5), Hòn Tằm (4), Harbour (3), Vinwonders (7), Du thuyền (6), Thể thao biển (23), I Resort (14), Kong Forest (4), Trăm trứng (6), Nhà hát Đó (6), Tháp Bà (13), Thuê xe (6), Buýt City Tour (6). Số trong ngoặc chỉ để bạn biết độ dài danh sách, không hiện trên nút. Lưu ý "Thể thao biển" đứng thứ 7 nên trên điện thoại phải cuộn hàng nhóm mới thấy: hãy vẽ đúng trạng thái đó.

Mẫu dòng danh mục (mã · tên · giá người lớn · nhóm):
- TD2 · Tour 2 đảo: Hòn Mun + Hòn Tằm + buffet trưa · 1.350.000 · Tour đảo
- TDMCT1 · Tour: Hòn Mun + làng Chài + Hòn Tằm · 850.000 · Tour đảo
- TDTCSH · Tour: Bãi Tranh + làng Chài + Vịnh San Hô · 550.000 · Tour đảo
- LPCB · Cano + đảo Khỉ + hoa lan + ăn trưa · 600.000 · Long Phú
- SM3 · Vé Hòn Tằm: Cano + tắm bùn + tắm biển · 540.000 · Hòn Tằm
- SD1 · Vé Hòn Tằm: Cano + tắm biển + buffet trưa · 740.000 · Hòn Tằm
- VHBT · Vé Vinpearl: Harbour + tata show · 400.000 · Harbour
- VTC · Vé Vinwonders NT: tiêu chuẩn · 1.050.000 · Vinwonders
- V16 · Vé Vinwonders NT: sau 16:00 · 700.000 · Vinwonders
- DTE2 · Tour du thuyền Emperor: ngắm hoàng hôn Nha Trang · 2.300.000 · Du thuyền
- TTBL215 · Motor nước: Jetski L2 (15 phút) Hòn Tằm · 800.000 · Thể thao biển
- TTBL230 · Motor nước: Jetski L2 (30 phút) Hòn Tằm · 1.400.000 · Thể thao biển
- TTBSNO · Lặn với ống thở (snorkeling) Hòn Tằm · 400.000 · Thể thao biển
- TTBPC · Phao chuối (5 pax) Hòn Tằm · 1.300.000 / nhóm 5 khách · Thể thao biển
- TTBDD2 · Dù bay đôi (2 pax) · 1.300.000 · Thể thao biển
- IRTK · I Resort: tắm khoáng · 200.000 · I Resort
- ZIP · Tour trượt Zipline trong rừng Hòn Bà (90-120 phút) · 1.500.000 · Kong Forest
- TTKPA · Trăm trứng: khám phá + ẩm thực · 300.000 · Trăm trứng
- NHDRMT · Nhà hát Đó: show Rối Mơ - hạng ghế Tiger · 450.000 · Nhà hát Đó
- TBTB3 · Tháp Bà: tắm bùn khoáng (group 3 đến 5 pax) · 300.000 · Tháp Bà
- SB7D · Xe 7 chỗ đón sân bay · 350.000 · Thuê xe
- BCT4 · Bus city tour 4 tiếng (tour ngày) · 150.000 · Buýt City Tour
Để minh hoạ dòng mờ, được phép thêm một dòng ghi rõ "(ví dụ) … · chưa có giá".

## Hệ thống thiết kế (BẮT BUỘC, theo "Tour Đảo Booking — Design System")
- Phông: **Be Vietnam Pro** (400/500/600/700). Không dùng phông khác.
- Màu: chủ đạo xanh `#0c4a6e` (đậm `#082f49`, nhạt `#dcebf6`); san hô `#c0392b` CHỈ cho hành động chốt và nhãn giá; cát `#f5a623` (nền `#fbe3b3`, chữ `#5a4109`, viền `#e9d3a4`) cho "cần để ý", **không làm nền nút**; nền trang `#f2f5f9`; thẻ `#ffffff`; viền `#e1e7ef`; chữ `#0f172a`, chữ phụ `#475569`; xanh lá `#dcfce7` / `#166534` cho "đã xong"; nguy hiểm `#b01235` (nền `#fde9ee`, chữ `#8e0e2b`). Không dùng san hô cho lỗi hay xoá.
- Khoảng cách 4/8/12/16/24/32/48px. Bo góc 8/12/18px. Bóng rất nhẹ (`0 1px 2px rgba(15,23,42,.04), 0 3px 10px rgba(15,23,42,.05)`).
- Ô gõ chữ 16px (dưới 16px iPhone tự phóng to). Vùng chạm ≥ 44px trên điện thoại. Bộ đếm: nút 44px, ô số 48px; ô đơn giá rộng 112px.
- Tương phản đạt WCAG AA; trạng thái không chỉ dựa vào màu (kèm chữ hoặc biểu tượng); mọi phần tử bấm được có trạng thái focus rõ (vòng 2px xanh); không phụ thuộc rê chuột.
- Biểu tượng nét đơn giản một kiểu, lấy từ bộ biểu tượng của hệ thống thiết kế; không emoji (trừ dấu ☆/★ đang dùng).
- Không có token sẵn cho thứ cần vẽ thì đề xuất token mới, đánh dấu MỚI và ghi lý do.

## Sản phẩm cần giao
Một **file HTML tương tác** (bấm được thật: hàng nhóm, chạm thêm dịch vụ, gõ tìm, công tắc "Đơn của", gập mở thẻ, thanh dính mở chi tiết), gồm các artboard đặt tên rõ:
1. Điện thoại · form vừa mở (chưa có dịch vụ).
2. Điện thoại · chọn dịch vụ: hàng nhóm đã cuộn, đang chọn "Thể thao biển", khung danh sách lọc theo nhóm, một dòng mang nhãn "✓ đã thêm".
3. Điện thoại · gõ "hòn tằm": kết quả chia mục (Hòn Tằm 4, Tour đảo 6, Thể thao biển 21), các nhóm không có kết quả mờ đi.
4. Điện thoại · thẻ TD2 đang mở: lưới số khách 2 cột, dòng tiền, một chặng đưa đón với ô "Nơi đón" đang mở danh sách gợi ý.
5. Điện thoại · đơn ba dịch vụ: hai thẻ gập (Jetski có chip "Chưa chốt giờ đón"), thẻ Phao chuối đang mở (một ô "Số khách", "7 khách = 2 lượt").
6. Điện thoại · các trạng thái thẻ: đang sửa giá (nhãn "Khác giá danh mục"), lỗi "Tối đa 50 khách." (thẻ bị ép mở), dải đặt gấp, chip "Giá danh mục đã đổi".
7. Điện thoại · khối khách: mặc định "Khách lẻ"; đang tìm đối tác; đã chọn đối tác; lớp chặn nhầm.
8. Điện thoại · thanh toán: chưa trả trước (hai ô ẩn) và đã nhập 2.000.000 (hai ô hiện).
9. Điện thoại · thanh dính cuối trang: thu gọn và mở chi tiết; một biến thể có cảnh báo tiền và một biến thể có lỗi khi lưu.
10. Máy tính 1040 (và kiểm 1440) · toàn form đơn ba dịch vụ, cột phải dính.
11. Ba biến thể theo vai: Đối tác, tài khoản lai, bảng "Đổi khách".
12. Bảng "Thang nút ba cấp" và bảng "Token đã dùng" (token → nơi dùng → giá trị; đánh dấu token MỚI).
Kèm ba đến năm dòng giải thích vì sao bố cục này giúp nhân viên chọn dịch vụ nhanh hơn.

## Đừng làm
- Không đổi luật nghiệp vụ, không thêm trường hay tính năng ngoài mô tả.
- Không gộp các biến thể dịch vụ (vd Jetski 15/30/60 phút) thành một dòng; mỗi dịch vụ vẫn là một dòng riêng.
- Không đưa lại bảng tick nhiều nhóm, nút "★ Hay dùng" riêng hay hàng "Lọc sẵn có".
- Không thêm màu, phông mới; không dùng san hô cho lỗi; không dùng cát làm nền nút; không dark mode.
- Không dùng chữ tiếng Anh trên giao diện (trừ tên riêng như "Harbour", "Vinwonders"); không dùng dữ liệu khách thật.
- Không bỏ chức năng nào được nêu ở phần "Quyết định đã chốt" và "Biến thể theo vai".

Nếu thiếu thông tin quan trọng, hỏi tôi TRƯỚC khi vẽ, tối đa 3 câu.

---- HẾT ----
