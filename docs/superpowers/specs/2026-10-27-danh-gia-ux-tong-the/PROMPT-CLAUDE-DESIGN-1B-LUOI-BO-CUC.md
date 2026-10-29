# Đề bài Claude Design số 1b — Lưới bố cục chung của Island Booking System (30/10/2026)

Hồ sơ có ngày. Mở đầu Chặng 3, đi **trước** ba đề bài họ màn Danh sách, Chi tiết, Biểu mẫu (`LO-TRINH.md` mục 1, bước 7–9). Căn cứ: quyết định của chủ dự án 30/10/2026 trong Main session (câu «Bạn muốn xử lý chuyện khoảng trống vô lý thế nào trong Chặng 3?» → **«Vẽ lưới chung trước»**: một đề bài ngắn cho lưới bố cục chung — bề rộng nội dung theo khuôn, nút đứng cạnh thứ nó tác động, ô rộng theo dữ liệu, ngăn chi tiết chỉ mở khi có nội dung, mỗi động từ một nghĩa — rồi ba họ vẽ trên lưới đó); lời chủ 29/10 «giao diện nhìn không được mạch lạc, có những khoảng trống vô lý» và phân tích ở `../2026-10-29-tai-cau-truc-giao-dien/BAN-GIAO.md` mục 3; đề cương `HE-THONG-HOP-NHAT.md` mục 2 và 4; `QUYET-DINH-CONG-2B-2026-10-28.md`; đề bài khung chung `PROMPT-CLAUDE-DESIGN-1-KHUNG-CHUNG.md` (khuôn, mục 5.9–5.10, 8–10 chép lại ở đây). Số đo hiện trạng: `docs/evidence/2026-10-30-luoi-bo-cuc/`. Người soạn: Main session.

Cách dùng: chủ dự án chép toàn bộ phần giữa hai dòng gạch dưới đây, dán vào dự án Claude Design đã vẽ khung chung (có bộ "Island Booking System — Design System v2"), đính kèm 27 ảnh trong thư mục `~/Desktop/De bai luoi bo cuc - anh/` theo đúng số thứ tự ở mục 4. Lựa chọn Main session tự quyết khi soạn ghi ở cuối tệp, ngoài phần dán.

---

## 1. Vai và nhiệm vụ

Bạn là nhà thiết kế sản phẩm cao cấp, chuyên phần mềm quản trị doanh nghiệp. Hãy thiết kế **lưới bố cục chung** của Island Booking System: lưới cột, bề rộng nội dung theo từng khuôn trang, luật đặt chỗ (cái gì đứng cạnh cái gì, rộng bao nhiêu), thang bề rộng ô nhập, và **đề xuất một từ điển động từ** cho nút để chủ dự án duyệt. Sau đó **minh hoạ** lưới trên mười trang đang chạy (ảnh mục 4) để thấy trước và sau. Máy tính trước (1040, 1440, kiểm thêm 1920), sau đó điện thoại (390); 768 dùng bố cục điện thoại.

Khung chung đã được duyệt và đã lên Nền tảng: thanh trên, thanh tab dưới, thanh bên, dải trên trang, bảng trượt, hộp thoại, năm khuôn trang (bạn đã vẽ ở đề bài trước trong dự án này). **Không vẽ lại khung.** Đề bài này chỉ quyết **vị trí, bề rộng và căn hàng** bên trong vùng nội dung. Màn nghiệp vụ sẽ được vẽ lại ở ba đề bài sau (Danh sách, Chi tiết, Biểu mẫu), và cả ba sẽ dựng trên lưới này.

Dùng hệ thống thiết kế **"Island Booking System — Design System v2"** đã có trong dự án này, bản đồng bộ từ mã ngày 29/10/2026. Không dùng hệ thống khác, không tự đặt màu hay phông mới.

## 2. Bối cảnh

Island Booking System là nền tảng đặt dịch vụ tour nội bộ của Công ty TNHH Tour Đảo (Nha Trang), chạy trên trình duyệt và cài lên iPhone. Khoảng 30 nhân viên và tới 1.000 tài khoản đối tác sẽ dùng. Kế toán và điều phối ngồi máy tính cả ngày (thanh bên 248 px luôn mở từ khổ 900); bán hàng và tài xế dùng điện thoại.

Chủ dự án chê giao diện **«nhìn không được mạch lạc, có những khoảng trống vô lý»**. Đo trên 45 trang (1040 và 1440, dữ liệu nhiều) cho thấy gốc là **không có lưới chung**: mã có 100 token bề rộng và 119 khai báo chia cột; nội dung giãn kín cột ở mọi trang (760 px ở khổ 1040, 1160 px ở khổ 1440) vì sau thanh bên vùng nội dung chưa bao giờ chạm trần 1280; chỉ vài chỗ có trần riêng (420, 640, 900, 1120) và một trang tự đặt 1200. Hậu quả: 28 trang có hàng «chữ một đầu, nút một đầu» với khoảng trống giữa lớn hơn 240 px ở 1440 (tới 1.014 px); ô số tiền rộng 1.128 px; ngăn chi tiết chiếm nửa màn chỉ để ghi «Chọn một bên…»; tên trang lặp hai lần ở 39/45 trang. Ở 390 thì ngược lại: thẻ đơn cắt mất tên khách.

## 3. Năm tiêu chí của chủ dự án và nguyên tắc vàng của lưới

Thứ tự ưu tiên: (1) nhanh và mượt — khung xương giữ chỗ đúng lưới, không nhảy bố cục; (2) dễ nhìn; (3) gọn mắt; (4) chuyên nghiệp, chuẩn phần mềm quản trị; (5) đơn giản, ít phải đoán.

Nguyên tắc vàng: **mọi khoảng trống đều có lý do** — chỉ để tách nhóm, không bao giờ là phần thừa của bề rộng màn hình. Mắt đọc một hàng từ trái sang phải không phải nhảy qua một vùng trống để tìm nút hay trạng thái của chính hàng đó.

## 4. Hiện trạng (ảnh đính kèm; 1–25 chụp 30/10/2026 trên bản đang chạy với dữ liệu thử, 26 chụp 27/10, 27 chụp 29/10; thanh bên và thanh trên trong ảnh là khung đã duyệt, chỉ xét phần nội dung; ảnh dài nên thanh bên có thể hiện lơ lửng giữa ảnh, đó là do cách chụp)

1–3. `orders-1040`, `orders-1440`, `orders-390` — Đơn hàng: ở 1440 thẻ đơn kéo dài 1.160 px, trạng thái dạt mép phải cách tên khách 851 px; tên trang hiện hai lần; «Tạo đơn» có hai nút (thanh trên và cạnh ô tìm). Ở 390 cùng thẻ thiếu chỗ, cắt tên khách và số khách (ảnh còn viết tiền tắt «1,08tr», «700k» — sai luật, phải ghi đủ).
4–5. `parties-1040`, `parties-1440` — Danh bạ: cột «Công việc hôm nay» chiếm khoảng 30% bề rộng, 12/30 ô có chữ.
6–7. `xe-1040`, `xe-1440` — Xe: đầu trang «Xe» trái, «Thêm xe» phải, giữa trống 614 px (1040) và 1.014 px (1440); ô chọn chủ xe tự giới hạn 420.
8–10. `order-1040`, `order-1440`, `order-390` — Chi tiết đơn: ở 1040 dải tóm tắt bóp bốn cột vào 381 px, chữ xuống dòng từng từ, cao 387 px (ở 1440 chỉ 183 px — cùng nội dung, bố cục khác hẳn theo khổ); hàng nút đầu trang bốn nút ngang nhau xuống hai dòng.
11–12. `chuyen-1040`, `chuyen-1440` — Chi tiết chuyến: đầu khối «Điểm dừng» trái, «Tải hiện tại 2/16» phải, giữa trống 564 px ở 1040.
13–15. `order-form-1040`, `order-form-1440`, `order-form-390` — Tạo đơn: ô ngày và ô giảm giá rộng 700 px; trang tự giới hạn 1120 chỉ có tác dụng ở 1440.
16–17. `staff-1040`, `staff-1440` — Quản lý tài khoản: hàng ba ô Họ tên / SĐT để trống phần cuối hàng (247 px trong khung 728 ở 1040).
18–19. `so-cong-no-1040`, `so-cong-no-1440` — Sổ công nợ: ngăn phải chiếm 51% bề rộng chỉ có câu «Chọn một bên…».
20–21. `hoa-hong-1040`, `hoa-hong-1440` — Hoa hồng: đầu trang «Hoa hồng đối tác» trái, «+ Thêm mức» phải, giữa trống 419 px ở 1040; ô «— Chọn dịch vụ —» của Tra nhanh rơi xuống dòng riêng; tên trang hiện hai lần.
22–23. `catalog-1040`, `catalog-1440` — Dịch vụ: trang tự đặt 1200 (lệch mức chung); tên nhóm trái, «0 dịch vụ · Đổi tên · Lên · Xuống · Tắt» dạt phải.
24–25. `trang-chu-1040`, `trang-chu-1440` — Trang chủ Toàn quyền: lưới ô số liệu và khối việc hôm nay.
26. `cuoc-chuyen-390` — Chuyến của tài xế (trang `/cuoc-chuyen`) ở điện thoại, chụp 27/10 trước khung chung: chỉ xét thân trang.
27. `khoang-trong-7-cho-1040` — ảnh ghép sáu trang máy tính (khổ 1040×800, 29/10), đánh số bảy chỗ trống vô lý.

## 5. Quyết định đã chốt (vẽ đúng như vậy; muốn khác thì ghi chú riêng, không đưa lên artboard)

### 5.1 Giữ nguyên từ khung chung đã duyệt
- Ba mốc **640 / 900 / 1200**; 641–899 dùng bố cục điện thoại (thanh tab dưới); thanh bên 248 từ 900. Khoảng cách chỉ lấy từ thang `--s1…--s7` = 4/8/12/16/24/32/48.
- **Nội dung rộng tối đa 1280, căn giữa vùng nội dung ở màn rộng, không kéo giãn bảng** (đã duyệt). Ở 1040 và 1440 trần này chưa chạm tới; vẽ thêm khổ 1920 để thấy nó (mục 9, L1 và L5). Mã đang lệch (bỏ căn giữa) — sẽ sửa khi thi công, bạn vẽ theo quyết định.
- Tên trang **chỉ ở thanh trên** (18/600, máy tính) — thân trang **không** có tiêu đề lớn lặp lại; tiêu đề trong thân chỉ dành cho tên nhóm/khối. Thanh trên của Chi tiết đơn ghi **«Đơn hàng»** cố định; mã đơn nằm ở thẻ tóm tắt (ảnh 8–10 còn hiện mã đơn trên thanh — đừng chép theo).
- Thanh trên có **tối đa một** nút chính toàn cục: «+ Tạo đơn» cho bộ có quyền tạo đơn. Không lặp nút đó trong thân (ảnh 1–3).
- **Thang nút ba cấp**: Chính (nền đặc, tối đa 1 mỗi vùng), Phụ (viền, nhiều), Lối nhỏ (chữ, nhiều). Dải hành động trang Chi tiết: tối đa 1 chính + 2 phụ, còn lại vào «⋯».
- Nhãn luôn nằm trên ô (không nhãn nổi), ô gõ 16 px, cao 44.
- Năm khuôn trang và vùng cố định của chúng giữ như bản vẽ khung chung.

### 5.2 Lưới và bề rộng nội dung
- Vẽ lưới cột cho 390 / 768 / 1040 / 1440 / 1920 (số cột, lề, khe), lấy khe và lề từ thang khoảng cách.
- **Tối đa ba mức bề rộng nội dung cho cả Nền tảng**, mỗi khuôn dùng đúng một mức, đặt tên thành token MỚI. Mức rộng nhất là 1280 (Danh sách, Bảng điều khiển). Gợi ý để bạn cân: mức «đọc» cho Thiết lập và biểu mẫu một cột (khung chung đã chốt Thiết lập một cột tối đa 900), mức «biểu mẫu» cho biểu mẫu hai cột và Chi tiết. Nội dung hẹp hơn vùng thì căn giữa vùng, như mức 1280.
- Chi tiết hai cột ≥ 900: cột phải **bề rộng cố định** (một token, dính khi cuộn), cột trái nhận phần còn lại; dải tóm tắt không được bóp chữ xuống dòng từng từ ở 1040: thiếu chỗ thì xếp lại thành lưới 2×2.

### 5.3 Luật đặt chỗ (mỗi luật vẽ một cặp sai/đúng ở L2)
- **Nút đứng cạnh thứ nó tác động.** Hành động của một hàng nằm ngay sau nội dung hàng đó hoặc trong cột hành động cố định của bảng — không dạt về mép phải một hàng rộng.
- **Nút chính riêng của trang** (ví dụ «Thêm xe», «+ Thêm mức», «+ Hồ sơ mới») ở máy tính nằm trong **hàng công cụ đầu thân** — cùng hàng với ô tìm và nút Lọc nếu có, đứng ngay sau chúng — không dạt về mép phải đầu trang. Trang không có ô tìm thì hàng công cụ chỉ có nút đó, căn trái. Ở điện thoại giữ như khung chung (chân dính hoặc nút «+» của thanh tab).
- **Trạng thái đứng cạnh tên** (huy hiệu ngay sau tên/mã), không dạt mép phải thẻ.
- **Danh sách ở ≥ 900 là dòng bảng** có cột (như khuôn Danh sách đã duyệt), không phải thẻ giãn kín bề rộng.
- **Vùng chỉ hiện khi có nội dung.** Ngăn chi tiết chỉ mở khi đã chọn một dòng; trước đó danh sách chiếm hết bề rộng. Cột bảng hầu như rỗng thì gộp vào cột khác hoặc thành dòng phụ.
- Các nút trong một hàng cùng chiều cao; ở 390 hàng nút không xuống dòng lộn xộn (quá hai nút thì xếp dọc, kín bề rộng).
- Đầu khối (tên khối + một hành động phụ hoặc một con số) giữ hai thứ sát nhau, hoặc con số ngay sau tên.

### 5.4 Ô nhập rộng theo dữ liệu
- Thang bề rộng ô (token MỚI): **ngắn** (mã PIN, số lượng, giờ), **vừa** (ngày, số điện thoại, số tiền, mã đơn), **dài** (họ tên, tên dịch vụ, email), **kín** (địa chỉ, ghi chú, ô tìm). Ở ≤ 899 mọi ô kín bề rộng.
- Ở ≥ 900, nhiều ô ngắn/vừa xếp cùng hàng theo lưới thay vì mỗi ô một hàng hay một ô giãn hết hàng; hàng ô không để trống phần cuối hàng (ảnh 16).

### 5.5 Đang tải phải trùng lưới
Khung xương của mỗi khuôn nằm đúng lưới và bề rộng của khuôn đó, cùng số mảnh trong kế hoạch đợt khung tải đã duyệt (chưa vào mã; «dòng» = vạch chữ, «khối số» = ô số liệu, «viền» = khối có viền): Danh sách 6 dòng + 1 viền; Chi tiết 10 dòng + 5 khối số + 1 viền; Biểu mẫu 5 khối số + 5 viền; Bảng điều khiển 2 dòng + 5 khối số; Thiết lập 4 dòng. Khi nội dung về, không mảnh nào đổi chỗ.

## 6. Đề xuất từ điển động từ (vẽ ở L4 để chủ dự án duyệt; **không** áp lên L5)

Mã hiện có khoảng 550 nút; nhiều động từ mang hai–năm nghĩa. Hãy trình bày bảng dưới đây (động từ → nghĩa → khi nào hỏi lại), góp ý chỗ nào chưa ổn, và vẽ một hộp xác nhận mẫu. Đây là đề xuất, chủ dự án quyết ở cổng duyệt bản vẽ.

- **Đóng** = đóng hộp/bảng trượt, không lưu (thay «Huỷ», «Thôi» khi nghĩa là đóng). Ngoại lệ đã duyệt: «Huỷ bỏ» trên thanh trên biểu mẫu máy tính (rời biểu mẫu không lưu).
- **Huỷ <đối tượng>** = huỷ một bản ghi nghiệp vụ (Huỷ đơn, Huỷ chuyến). Không dùng «Huỷ» trơn. Luôn hỏi lại.
- **Lưu** = ghi thay đổi. «Lưu ảnh» (chỉ tải ảnh QR) thành «Tải ảnh QR».
- **Sửa** = mở biểu mẫu sửa. Chữa chỗ ghi nhầm, bắt lý do: «Sửa sai» ở Danh bạ và Xe; ở Hoa hồng giữ «Sửa» như đã duyệt.
- **Đổi** = chọn lại một thứ khác (Đổi khách, Đổi người phụ trách); **Đổi tên** giữ.
- **Ngừng** = đặt ngày cuối hiệu lực, giữ lịch sử (Hoa hồng giữ «Ngừng / Ngừng áp dụng» như đã duyệt). **Kết thúc** giữ nghĩa riêng: kết thúc ngay (chuyến, gián đoạn, vai và quan hệ trong Danh bạ). Một cách viết «Ngừng» (bỏ «Ngưng») trên nút; chữ trạng thái giữ như máy chủ trả.
- **Tắt / Bật** = công tắc trạng thái đảo được; **tình trạng hiện bằng nhãn trạng thái, nút ghi hành động** — không trộn. Bật lại một thứ đã tắt thống nhất một chữ (đề xuất «Bật lại»), giữ «Ẩn / Hiện» cho việc ẩn khỏi danh sách bán.
- **Gỡ** = bỏ một thứ đang gắn (thiết bị, thành viên, giá riêng); **Bỏ** chỉ cho thao tác trên màn hình (Bỏ chọn, Bỏ lọc); **Xoá** chỉ cho dữ liệu chưa lưu và ảnh.
- **Duyệt / Từ chối** cho đề nghị và yêu cầu (gộp «Chấp nhận», «Bác»); «Đồng ý» chỉ cho đồng ý điều khoản.
- **+ Tạo …** cho bản ghi mới ở khuôn Danh sách (đơn, chuyến, tài khoản, hồ sơ); **+ Thêm …** cho mục thiết lập và dòng trong một khối (như đề cương đã duyệt). «+ Chuyến mới» và «Tạo chuyến» thành một chữ.
- **Rút** = lấy lại thứ mình đã gửi; **Thu hồi** = lấy lại thứ đã phát cho người khác. «Quay lại bản này» (khôi phục cấu hình) thành «Khôi phục bản này».
- **Giữ nguyên, không đề xuất đổi:** chữ chuyển trạng thái đơn («Xác nhận đơn», «Đã giao – đã thu đủ», «Hoàn thành»), «Đặt lại PIN», «Ẩn danh hoá», «Quên máy này», «Lấy lại giá bảng», «Đóng điều kiện».
- **Việc nguy** (giữ đơn, chạm tiền, mất dữ liệu, đăng xuất máy khác, không đảo được — ví dụ Tắt loại đối tác, Kết thúc vai, Đặt lại PIN, Ẩn danh hoá, Đóng điều kiện, Lấy lại giá bảng) luôn qua **hộp xác nhận của khung** đã vẽ, câu hỏi nói hậu quả bằng lời thường, nút xác nhận ghi đúng động từ. Không dùng hộp hỏi của trình duyệt. Vẽ mẫu «Tắt loại đối tác» với câu: «Đơn của mọi đối tác thuộc loại này sẽ bị giữ ở bước Đã giao, không tính hoa hồng, tới khi bật lại.»

## 7. Biến thể và dữ liệu mẫu

Biến thể theo khổ, không theo vai: lưới không đổi theo bộ quyền. Riêng trang ít nội dung chỉ cần chứng minh lưới vẫn đúng: Chuyến của tài xế ở 390 (ảnh 26).

Dữ liệu giữ đúng nội dung trong ảnh (giả, dữ liệu thử): mã đơn `TD-20261027-0003`, tiền `1.080.000 ₫` (ghi đủ ở mọi khổ), ngày `28/10/2026`, số khách «2 NL · 1 TE», tên khách tiếng Việt có dấu dài tới 24 ký tự. Mỗi trang ở L5 vẽ trạng thái nhiều; Đơn hàng vẽ thêm rỗng và đang tải.

## 8. Hệ thống thiết kế bắt buộc

Dùng bộ "Island Booking System — Design System v2" trong dự án này (bản đồng bộ từ mã ngày 29/10). Tên token theo mã khi lập bảng: khoảng cách `--s1…--s7`; chiều cao `--h-control` 44 / `--h-control-lon` 52; thanh bên `--w-sidebar` 248; bề rộng hiện có `--w-noi-dung-max` 1280, `--w-thiet-lap-max` 900, `--w-form` 1120, `--w-vc-mine` 720, `--w-vc-form` 640, `--w-narrow` 420 — trong đó 640 còn dùng chung giá trị với hộp xác nhận (`--w-confirm`) và bảng trượt (`--w-sheet-hk`), 420 với ngăn thông báo (`--w-ntf-panel`): ba mức MỚI của bạn chỉ thay bề rộng **nội dung trang**, không đổi bề rộng hộp, bảng trượt, ngăn của khung. Màu `--c-*`, cỡ chữ `--fs-step-*`, độ đậm 400/500/600, bo `--radius-*`. Ô gõ 16 px, vùng chạm 44, WCAG AA, vành tiêu điểm 3 px, không emoji. **Không có token sẵn thì đề xuất token MỚI**, đánh dấu rõ và ghi lý do; không viết cứng số.

## 9. Sản phẩm cần giao

Một HTML tương tác, artboard đặt tên rõ và đánh số:

- **L1** Lưới cột ở 390 / 768 / 1040 / 1440 / 1920 (cột, lề, khe), kèm bề rộng nội dung của năm khuôn ở mỗi khổ, vẽ chồng lên khung đã duyệt.
- **L2** Luật đặt chỗ mục 5.3: mỗi luật một cặp **sai** (cắt từ ảnh mục 4) / **đúng**, ở 1040.
- **L3** Thang bề rộng ô và lưới biểu mẫu (bao nhiêu ô một hàng ở 1040 và 1440), một biểu mẫu mẫu ở 390 / 1040 / 1440.
- **L4** Bảng đề xuất từ điển động từ mục 6 kèm góp ý của bạn, và hộp xác nhận mẫu «Tắt loại đối tác».
- **L5** **Minh hoạ** lưới trên mười trang ở ảnh 1–25 (Đơn hàng, Danh bạ, Xe, Chi tiết đơn, Chi tiết chuyến, Tạo đơn, Quản lý tài khoản, Sổ công nợ, Hoa hồng, Dịch vụ; Trang chủ nếu đủ sức), mỗi trang ở 1040 và 1440; Đơn hàng, Chi tiết đơn, Tạo đơn thêm 390; Đơn hàng thêm 1920. Được đổi: vị trí, bề rộng, căn hàng, và những gì luật mục 5.3–5.4 đòi (thẻ thành dòng bảng ở ≥ 900, ẩn vùng rỗng, ô theo thang, bỏ tiêu đề lặp). Giữ nguyên: khối, trường, dữ liệu, thứ tự khối và **chữ nút hiện có** (từ điển chưa duyệt). Khi luật lưới và «giữ nguyên» va nhau thì luật lưới thắng, ghi chú chỗ đó.
- **L6** Khung xương năm khuôn ở 1040 và 390 nằm đúng lưới (mục 5.5).
- Bảng **«Token đã dùng»** (tên theo mã) và bảng **«Token MỚI đề xuất»** (lưới, ba mức bề rộng, thang ô) kèm lý do.
- 3–5 dòng giải thích vì sao lưới này làm màn hình mạch lạc hơn cho kế toán ngồi máy tính và bán hàng cầm điện thoại.

## 10. Đừng làm

Không vẽ lại khung (thanh trên, thanh tab, thanh bên, dải, hộp thoại). Không đổi mô hình điều hướng. Không thiết kế lại nghĩa hay luồng của màn nghiệp vụ (kể cả Hoa hồng — trang đó sẽ có đề bài riêng; ở đây chỉ minh hoạ chỗ đặt). Không thêm hay bỏ trường, tính năng, luật nghiệp vụ, bước hỏi. Không màu hay phông mới. Không chế độ tối. Không chữ Anh trên màn hình. Không dữ liệu thật. Không nút nổi. Không mã React hay mã chạy được: sản phẩm là bản vẽ tương tác để duyệt.

## 11. Nếu thiếu thông tin quan trọng, hỏi tôi TRƯỚC khi vẽ, tối đa 3 câu.

---

## Bàn giao (đọc cùng bản vẽ, không dán vào Claude Design)

Thứ tự ưu tiên khi lệch: quyết định ở mục 5 thắng bản vẽ; token thật trong bộ v2 thắng số trong bản vẽ; chữ thật của máy chủ thắng chữ đề xuất; dữ liệu trong bản vẽ là giả. Bản vẽ lưới về thì Main session đối chiếu như cổng 2b (đạt / lệch / thiếu), đưa chủ một cổng duyệt (tối đa ba câu, trong đó có từ điển động từ). Qua cổng thì **L1–L4 và L6** thành đầu vào bắt buộc của ba đề bài họ màn số 2–4; **L5 chỉ là minh hoạ**, đề bài họ màn vẽ lại màn thật.

Điểm vượt ra ngoài bề mặt phải nêu khi viết đặc tả thi công lưới (và đợt thi công đó qua cổng phát hành như mọi đợt, `QUYET-DINH-CONG-2B-2026-10-28.md` mục B):
1. Ba token bề rộng MỚI theo expand–contract; không đổi `--w-confirm`, `--w-sheet-hk`, `--w-ntf-panel` cùng lúc. Sửa lệch quyết định «căn giữa» ở `public/app.css` (khối «chỉ BỎ CĂN GIỮA», đợt D, commit 4d5c6baf) và mốc 960 còn sống ở `main.form-page`.
2. Hàng rào máy cấm khai `max-width`, `grid-template-columns` riêng theo trang ngoài lưới chung (ứng viên `src/thanh-phan-v2-css.test.ts` hoặc tệp kiểm mới).
3. Từ điển động từ (nếu chủ duyệt) chạm nhiều tệp `web/` và bài kiểm khớp chữ, **và chữ phía máy chủ / chữ chung nhắc tên nút**: `src/modules/parties/index.ts` (câu bảo bấm «Kết thúc»), `src/modules/van-chuyen/chuyen-khach-lenh.ts` («chỉ Bác được»), các câu «hãy chọn Huỷ», `src/shared/hoa-hong-hien-thi.ts`, `src/shared/audit-actions.ts`. Đổi chữ máy chủ là chạm API: theo câu 9 cổng 1, chủ duyệt danh sách câu trước. Đổi chữ ở trang Hoa hồng phải khớp ADR-0148.
4. Chuyển các hộp hỏi của trình duyệt và các việc nguy chưa hỏi lại (`docs/evidence/2026-10-30-luoi-bo-cuc/so-lieu/dong-tu.md` mục 2–3) sang hộp xác nhận của khung. Riêng «Tắt loại đối tác» là rủi ro thật đang chạy trên production (bấm là giữ đơn cả loại) — đề xuất chủ cho sửa sớm, tách khỏi đợt lưới.
5. Bỏ tiêu đề lớn lặp ở 39 trang chạm `public/*.html` (sau đợt 0b là `web/html/`).
6. Khung xương 0b (`SO_MANH` trong kế hoạch 0b) chỉ đổi số mảnh nếu lưới đòi, kèm đo CLS lại.
7. Hàng công cụ đầu thân (5.3) là luật mới cho nút chính riêng của trang ở máy tính — khung chung chưa định nghĩa chỗ này; ghi vào cổng duyệt bản vẽ.

## Lựa chọn Main session tự quyết khi soạn (đảo được; chủ chỉ cần biết)

1. **Từ điển động từ** (mục 6) là đề xuất của Main session suy từ kiểm kê (`dong-tu.md`), đã chừa nguyên chữ đã duyệt của Hoa hồng (ADR-0148, đề bài Hoa hồng 29/10) và chữ chuyển trạng thái đơn. Chủ quyết ở cổng duyệt bản vẽ. Hoàn tác: bỏ mục 6.
2. **Nút chính riêng của trang ở máy tính** đặt ở hàng công cụ đầu thân, cạnh ô tìm (5.3) — lấp chỗ trống của khung chung (thanh trên chỉ một nút «+ Tạo đơn»). Hoàn tác: chọn chỗ khác ở cổng.
3. **Mười trang minh hoạ** chọn theo số đo (trang có nhiều khoảng trống nhất mỗi khuôn) cộng ba trang đại diện của khuôn; Hoa hồng chỉ minh hoạ chỗ đặt, phần nghĩa để đề bài họ Bảng điều khiển (số 5) dùng đề bài Hoa hồng 29/10 làm đầu vào.
4. **Khuôn đối tượng «bản ghi có hiệu lực theo ngày»** (gợi ý của bàn giao 29/10 mục 4) chưa đưa vào; làm ở đề bài họ màn khi gặp.
5. Đề bài đặt số **1b** (sau đề bài khung chung số 1, trước đề bài họ màn số 2) để giữ số 2–6 của `LO-TRINH.md`.

## Đối chiếu kiểm độc lập

**Lần 1 (bản 1 25ef6650) → bản 2.** KHÔNG ĐẠT, 5 chặn: (1) đề bài mở lại «1280 căn giữa» đã duyệt → ghi lại thành đã chốt, thêm khổ 1920, ghi chỗ mã lệch; (2) từ điển động từ đứng trong «đã chốt» và đè chữ đã duyệt của Hoa hồng → tách thành mục 6 «đề xuất», L5 giữ chữ hiện có, chừa chữ Hoa hồng; (3) gộp «Kết thúc» vào «Ngừng» đổi nghĩa → giữ «Kết thúc»; (4) mô tả ảnh Hoa hồng sai → viết lại theo ảnh 09; (5) nút chính riêng của trang không có chỗ ở máy tính → luật hàng công cụ đầu thân (tự quyết 2). Sửa: đủ ảnh hai khổ + 390 Tạo đơn + ảnh tài xế 27/10; thanh trên Chi tiết đơn «Đơn hàng»; L5 là minh hoạ, luật lưới thắng; bàn giao chỉ bắt buộc L1–L4, L6; thang nút ba cấp nêu rõ; từ điển bỏ mâu thuẫn «Dùng lại», thêm danh sách giữ nguyên; bàn giao thêm chữ máy chủ, ADR-0148, cổng phát hành; token đi kèm 640/420 và 720; sửa chữ số đo (119 khai báo, «vài chỗ», ảnh 16, ngày ảnh 27); ≤ 899 ô kín; khung xương ghi «kế hoạch 0b, chưa vào mã».
