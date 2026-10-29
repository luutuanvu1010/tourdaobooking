# Đề bài Claude Design số 1b — Lưới bố cục chung của Island Booking System (30/10/2026)

Hồ sơ có ngày. Mở đầu Chặng 3, đi **trước** ba đề bài họ màn Danh sách, Chi tiết, Biểu mẫu (`LO-TRINH.md` mục 1, bước 7–9). Căn cứ: quyết định của chủ dự án 30/10/2026 trong Main session (câu «Bạn muốn xử lý chuyện khoảng trống vô lý thế nào trong Chặng 3?» → **«Vẽ lưới chung trước»**: một đề bài ngắn cho lưới bố cục chung — bề rộng nội dung theo khuôn, nút đứng cạnh thứ nó tác động, ô rộng theo dữ liệu, ngăn chi tiết chỉ mở khi có nội dung, mỗi động từ một nghĩa — rồi ba họ vẽ trên lưới đó); lời chủ 29/10 «giao diện nhìn không được mạch lạc, có những khoảng trống vô lý» và phân tích ở `../2026-10-29-tai-cau-truc-giao-dien/BAN-GIAO.md` mục 3; đề cương `HE-THONG-HOP-NHAT.md` mục 2 và 4; `QUYET-DINH-CONG-2B-2026-10-28.md`; đề bài khung chung `PROMPT-CLAUDE-DESIGN-1-KHUNG-CHUNG.md` (khuôn, mục 5.9–5.10, 8–10 chép lại ở đây). Số đo hiện trạng: `docs/evidence/2026-10-30-luoi-bo-cuc/`. Người soạn: Main session.

Cách dùng: chủ dự án chép toàn bộ phần giữa hai dòng gạch dưới đây, dán vào dự án Claude Design đã vẽ khung chung (có bộ "Island Booking System — Design System v2"), đính kèm các ảnh trong thư mục `~/Desktop/De bai luoi bo cuc - anh/` theo đúng số thứ tự ở mục 4. Lựa chọn Main session tự quyết khi soạn ghi ở cuối tệp, ngoài phần dán.

---

## 1. Vai và nhiệm vụ

Bạn là nhà thiết kế sản phẩm cao cấp, chuyên phần mềm quản trị doanh nghiệp. Hãy thiết kế **lưới bố cục chung** của Island Booking System: lưới cột, bề rộng nội dung theo từng khuôn trang, luật đặt chỗ (cái gì đứng cạnh cái gì, rộng bao nhiêu, căn theo đâu), thang bề rộng ô nhập, và **từ điển động từ** cho nút. Sau đó áp lưới lên mười trang đang chạy (ảnh mục 4) để thấy trước và sau. Máy tính trước (1040, rồi 1440), sau đó điện thoại (390); 768 dùng bố cục điện thoại.

Khung chung đã được duyệt và đã lên Nền tảng: thanh trên, thanh tab dưới, thanh bên, dải trên trang, bảng trượt, hộp thoại, năm khuôn trang (bạn đã vẽ ở đề bài trước trong dự án này). **Không vẽ lại khung.** Đề bài này chỉ quyết **vị trí, bề rộng và căn hàng** bên trong vùng nội dung, cùng chữ trên nút. Màn nghiệp vụ sẽ được vẽ lại ở ba đề bài sau (Danh sách, Chi tiết, Biểu mẫu), và cả ba sẽ dựng trên lưới này.

Dùng hệ thống thiết kế **"Island Booking System — Design System v2"** đã có trong dự án này, bản đồng bộ từ mã ngày 29/10/2026. Không dùng hệ thống khác, không tự đặt màu hay phông mới.

## 2. Bối cảnh

Island Booking System là nền tảng đặt dịch vụ tour nội bộ của Công ty TNHH Tour Đảo (Nha Trang), chạy trên trình duyệt và cài lên iPhone. Khoảng 30 nhân viên và tới 1.000 tài khoản đối tác sẽ dùng. Kế toán và điều phối ngồi máy tính cả ngày (màn 1366–1920, thanh bên 248 px luôn mở); bán hàng, tài xế, đối tác dùng điện thoại.

Chủ dự án chê giao diện **«nhìn không được mạch lạc, có những khoảng trống vô lý»**. Đo trên 45 trang (1040 và 1440, dữ liệu nhiều) cho thấy gốc là **không có lưới chung**: mã có 100 token bề rộng và 119 cách chia cột khác nhau; nội dung giãn kín cột ở mọi trang (760 px ở khổ 1040, 1160 px ở khổ 1440), vì trần 1280 không bao giờ chạm tới sau thanh bên; chỉ bốn trang có trần riêng (420, 640, 900, 1120) và một trang tự đặt 1200. Hậu quả: 28 trang có hàng «chữ một đầu, nút một đầu» với khoảng trống giữa lớn hơn 240 px ở 1440 (tới 1.014 px); ô số tiền rộng 1.128 px; ngăn chi tiết chiếm nửa màn chỉ để ghi «Chọn một bên…»; tên trang lặp hai lần ở 39/45 trang. Ở 390 thì ngược lại: thẻ đơn cắt mất tên khách.

## 3. Năm tiêu chí của chủ dự án và nguyên tắc vàng của lưới

Thứ tự ưu tiên: (1) nhanh và mượt — khung xương giữ chỗ đúng lưới, không nhảy bố cục; (2) dễ nhìn; (3) gọn mắt; (4) chuyên nghiệp, chuẩn phần mềm quản trị; (5) đơn giản, ít phải đoán.

Nguyên tắc vàng: **mọi khoảng trống đều có lý do** — chỉ để tách nhóm, không bao giờ là phần thừa của bề rộng màn hình. Mắt đọc một hàng từ trái sang phải không phải nhảy qua một vùng trống để tìm nút hay trạng thái của chính hàng đó. Và **một động từ một nghĩa** trên toàn Nền tảng.

## 4. Hiện trạng (ảnh đính kèm, chụp ngày 30/10/2026 trên bản đang chạy với dữ liệu thử; thanh bên và thanh trên trong ảnh là khung đã duyệt, chỉ xét phần nội dung)

1. `01-orders-1440` — Đơn hàng: thẻ đơn kéo dài 1.160 px, trạng thái dạt mép phải cách tên khách 851 px; tên trang hiện hai lần; «Tạo đơn» có hai nút (thanh trên và cạnh ô tìm).
2. `01-orders-390` — Đơn hàng ở điện thoại: cùng thẻ đó thiếu chỗ, cắt tên khách và số khách.
3. `02-parties-1040` — Danh bạ: cột «Công việc hôm nay» chiếm 30% bảng, 12/30 ô có chữ.
4. `03-xe-1440` — Xe: đầu trang «Xe» trái, «Thêm xe» phải, giữa trống 1.014 px; ô chọn chủ xe tự giới hạn 420.
5. `04-order-1040` — Chi tiết đơn: dải tóm tắt bóp bốn cột vào 381 px, chữ xuống dòng từng từ, cao 387 px; hàng nút đầu trang bốn nút ngang nhau, xuống hai dòng.
6. `04-order-1440` — cùng trang ở 1440: dải tóm tắt cao 183 px — cùng nội dung, bố cục khác hẳn theo khổ.
7. `04-order-390` — Chi tiết đơn ở điện thoại.
8. `05-chuyen-1040` — Chi tiết chuyến: đầu khối «Điểm dừng» trái, «Tải hiện tại 2/16» phải, giữa trống 564 px.
9. `06-order-form-1440` — Tạo đơn: ô ngày và ô giảm giá rộng 700 px; trang tự giới hạn 1120 chỉ ở 1440.
10. `07-staff-1040` — Quản lý tài khoản: hai ô Họ tên và SĐT ngắn, nửa phải hàng trống.
11. `08-so-cong-no-1040` — Sổ công nợ: ngăn phải chiếm 51% bề rộng chỉ có câu «Chọn một bên…».
12. `09-hoa-hong-1040` — Hoa hồng: hàng chữ trái, nút trôi giữa, «Sửa» mép phải; ba kiểu xếp nút.
13. `10-catalog-1440` — Dịch vụ: trang tự đặt 1200 (lệch mức chung), tên nhóm trái, «0 dịch vụ · Đổi tên · Lên · Xuống · Tắt» dạt phải.
14. `11-trang-chu-1440` — Trang chủ Toàn quyền: lưới ô số liệu và khối việc hôm nay ở 1440.
15. `khoang-trong-7-cho-1040` — bảy chỗ trống vô lý đánh số trên sáu trang máy tính (ảnh ghép).

## 5. Quyết định đã chốt (vẽ đúng như vậy; muốn khác thì ghi chú riêng, không đưa lên artboard)

### 5.1 Giữ nguyên từ khung chung đã duyệt
- Ba mốc **640 / 900 / 1200**; 641–899 dùng bố cục điện thoại (thanh tab dưới); thanh bên 248 từ 900. Khoảng cách chỉ lấy từ thang `--s1…--s7` = 4/8/12/16/24/32/48.
- Tên trang **chỉ ở thanh trên** (18/600, máy tính) — thân trang **không** có tiêu đề lớn lặp lại. Tiêu đề trong thân chỉ dành cho tên nhóm/khối.
- Hành động chính của trang ở **đúng một chỗ**: góc phải thanh trên (máy tính) hoặc chân dính (điện thoại). Không nhân đôi nút chính trong thân (ví dụ «Tạo đơn» ở ảnh 1).
- Năm khuôn trang và vùng cố định của chúng giữ như bản vẽ khung chung (Danh sách, Chi tiết, Biểu mẫu, Bảng điều khiển, Thiết lập).

### 5.2 Lưới và bề rộng nội dung
- Vẽ lưới cột cho bốn khổ 390 / 768 / 1040 / 1440 (số cột, lề, khe), lấy khe và lề từ thang khoảng cách.
- **Tối đa ba mức bề rộng nội dung cho cả Nền tảng**, mỗi khuôn dùng đúng một mức, đặt tên thành token MỚI (thay sáu–bảy mức hiện có). Gợi ý để bạn cân, không bắt buộc: mức «đọc» cho Thiết lập và biểu mẫu một cột, mức «biểu mẫu» cho biểu mẫu hai cột và Chi tiết, mức «bảng» cho Danh sách và Bảng điều khiển (được giãn tới hết cột). Nêu rõ: nội dung hẹp hơn cột thì căn **trái theo mép vùng nội dung** hay căn giữa — chọn một và áp mọi khuôn.
- Chi tiết hai cột ≥ 900: cột phải **bề rộng cố định** (một token), cột trái nhận phần còn lại; dải tóm tắt không được bóp chữ xuống dòng từng từ ở 1040 (ảnh 5): khi thiếu chỗ thì xếp lại thành lưới 2×2, không co cột.

### 5.3 Luật đặt chỗ (mỗi luật vẽ một cặp sai/đúng ở L2)
- **Nút đứng cạnh thứ nó tác động.** Hành động của một hàng nằm ngay sau nội dung hàng đó hoặc trong cột hành động cố định của bảng — không dạt về mép phải một hàng rộng. Ở máy tính, không dùng kiểu «một đầu chữ, một đầu nút» trên hàng rộng hơn mức «đọc».
- **Trạng thái đứng cạnh tên** (huy hiệu ngay sau tên/mã), không dạt mép phải thẻ.
- **Thẻ danh sách ở ≥ 900 là dòng bảng** có cột (như khuôn Danh sách đã duyệt), không phải thẻ giãn kín bề rộng.
- **Vùng chỉ hiện khi có nội dung.** Ngăn chi tiết chỉ mở khi đã chọn một dòng; trước đó danh sách chiếm hết bề rộng. Cột bảng hầu như rỗng thì gộp vào cột khác hoặc thành dòng phụ.
- **Hàng nút:** tối đa một nút chính + hai nút phụ hiện sẵn, còn lại vào «⋯» (như khung chung); các nút trong một hàng cùng chiều cao, không xuống dòng lộn xộn ở 390.
- Đầu khối (tên khối + một hành động phụ hoặc một con số) giữ hai thứ sát nhau ở bên trái, hoặc con số ngay sau tên.

### 5.4 Ô nhập rộng theo dữ liệu
- Thang bề rộng ô (token MỚI): **ngắn** (mã PIN, số lượng, giờ), **vừa** (ngày, số điện thoại, số tiền, mã đơn), **dài** (họ tên, tên dịch vụ, email), **kín** (địa chỉ, ghi chú, ô tìm). Ở ≤ 640 mọi ô kín bề rộng.
- Ở máy tính, nhiều ô ngắn/vừa xếp cùng hàng theo lưới thay vì mỗi ô một hàng hay một ô giãn hết hàng; hàng ô không để trống nửa phải (ảnh 10).
- Nhãn luôn nằm trên ô (không nhãn nổi), ô gõ 16 px, cao `--h-control` 44.

### 5.5 Từ điển động từ (vẽ bảng ở L4; áp chữ này lên mười trang ở L5)
- **Đóng** = đóng hộp/bảng trượt, không lưu. Thay «Huỷ» và «Thôi» khi nghĩa là đóng.
- **Huỷ <đối tượng>** = huỷ một bản ghi nghiệp vụ (Huỷ đơn, Huỷ chuyến, Huỷ lượt đón). Không dùng «Huỷ» trơn. Luôn hỏi lại.
- **Lưu** = ghi thay đổi. «Lưu ảnh» (chỉ tải ảnh QR) đổi thành «Tải ảnh QR».
- **Sửa** = mở biểu mẫu sửa. **Sửa sai** = chữa chỗ ghi nhầm, bắt nhập lý do.
- **Đổi** = chọn lại một thứ khác (Đổi khách, Đổi người phụ trách).
- Bản ghi có hiệu lực theo ngày (mức hoa hồng, giá xe, vai trong Danh bạ): một lối vào **«Thay đổi…»** hỏi bằng lời thường «Từ một ngày áp mức mới» hay «Ghi nhầm, sửa lại»; **Ngừng** = đặt ngày cuối hiệu lực, giữ lịch sử. Gộp «Ngừng áp dụng», «Kết thúc», «Ngưng» vào «Ngừng» (một cách viết).
- **Tắt / Bật** = công tắc trạng thái đảo được; hiện **tình trạng** bằng công tắc kèm nhãn, không bằng chữ nút. Bật lại luôn là «Bật» (thay «Hiện lại», «Dùng lại», «Kích hoạt lại»), trừ «Ẩn/Hiện» cho việc ẩn khỏi danh sách bán.
- **Gỡ** = bỏ một thứ đang gắn (thiết bị, thành viên, giá riêng). **Bỏ** chỉ cho thao tác trên màn hình (Bỏ chọn, Bỏ lọc). **Xoá** chỉ cho dữ liệu chưa lưu và ảnh.
- **Duyệt / Từ chối** (bỏ «Chấp nhận», «Bác»; giữ «Đồng ý» cho việc người dùng đồng ý điều khoản).
- **Tạo** = bản ghi mới đứng riêng (đơn, chuyến, tài khoản); **Thêm** = thêm một dòng vào thứ đang có. «+ Chuyến mới» và «Tạo chuyến» thành một chữ.
- **Rút** = lấy lại thứ mình đã gửi; **Thu hồi** = lấy lại thứ đã phát cho người khác. «Quay lại bản này» đổi thành «Dùng lại bản này».
- **Việc nguy** (giữ đơn, chạm tiền, mất dữ liệu, đăng xuất máy khác, không đảo được) luôn qua **hộp xác nhận của khung** (đã vẽ), câu hỏi nói hậu quả bằng lời thường, nút xác nhận ghi đúng động từ (ví dụ «Tắt loại này»). Không dùng hộp hỏi của trình duyệt. Vẽ mẫu cho «Tắt loại đối tác» với câu hậu quả: «Đơn của mọi đối tác thuộc loại này sẽ bị giữ ở bước Đã giao, không tính hoa hồng, tới khi bật lại.»

### 5.6 Đang tải phải trùng lưới
Khung xương của mỗi khuôn nằm đúng lưới và bề rộng của khuôn đó, cùng số mảnh đã chốt trong mã đợt khung tải: Danh sách 6 dòng + 1 viền; Chi tiết 10 dòng + 5 khối số + 1 viền; Biểu mẫu 5 khối số + 5 viền; Bảng điều khiển 2 dòng + 5 khối số; Thiết lập 4 dòng. Khi nội dung về, không mảnh nào đổi chỗ.

## 6. Biến thể

Theo khổ, không theo vai: lưới không đổi theo bộ quyền. Riêng trang có ít nội dung (Tài xế, Đối tác) chỉ cần chứng minh lưới vẫn đúng khi trang hẹp: một artboard Chuyến của tài xế ở 390.

## 7. Dữ liệu mẫu

Giữ đúng nội dung trong ảnh (giả, dữ liệu thử): mã đơn `TD-20261027-0003`, tiền `1.080.000 ₫`, ngày `28/10/2026`, số khách «2 NL · 1 TE», tên khách tiếng Việt có dấu dài tới 24 ký tự. Mỗi trang ở L5 vẽ trạng thái nhiều; một trang danh sách vẽ thêm rỗng và đang tải.

## 8. Hệ thống thiết kế bắt buộc

Dùng bộ "Island Booking System — Design System v2" trong dự án này (bản đồng bộ từ mã ngày 29/10). Tên token theo mã khi lập bảng: khoảng cách `--s1…--s7`; chiều cao `--h-control` 44 / `--h-control-lon` 52; thanh bên `--w-sidebar` 248; bề rộng tối đa hiện có `--w-noi-dung-max` 1280, `--w-thiet-lap-max` 900, `--w-form` 1120, `--w-vc-form` 640, `--w-narrow` 420 (các mức này sẽ được thay bằng tối đa ba mức MỚI của bạn); màu `--c-*`, cỡ chữ `--fs-step-*`, độ đậm 400/500/600, bo `--radius-*`. Ô gõ 16 px, vùng chạm 44, WCAG AA, vành tiêu điểm 3 px, không emoji. **Không có token sẵn thì đề xuất token MỚI**, đánh dấu rõ và ghi lý do; không viết cứng số.

## 9. Sản phẩm cần giao

Một HTML tương tác, artboard đặt tên rõ và đánh số:

- **L1** Lưới cột ở 390 / 768 / 1040 / 1440 (cột, lề, khe), kèm bề rộng nội dung của năm khuôn ở mỗi khổ, vẽ chồng lên khung đã duyệt.
- **L2** Luật đặt chỗ mục 5.3: mỗi luật một cặp **sai** (cắt từ ảnh mục 4) / **đúng**, ở 1040.
- **L3** Thang bề rộng ô và lưới biểu mẫu (bao nhiêu ô một hàng ở 1040 và 1440), một biểu mẫu mẫu ở 390 / 1040 / 1440.
- **L4** Từ điển động từ mục 5.5 dạng bảng (động từ → nghĩa → khi nào hỏi lại), và hộp xác nhận mẫu «Tắt loại đối tác».
- **L5** Áp lưới lên mười trang ở ảnh 1–14 (Đơn hàng, Danh bạ, Xe, Chi tiết đơn, Chi tiết chuyến, Tạo đơn, Quản lý tài khoản, Sổ công nợ, Hoa hồng, Dịch vụ; thêm Trang chủ nếu đủ sức), mỗi trang ở 1040 và 1440; Đơn hàng, Chi tiết đơn, Tạo đơn thêm 390. Chỉ đổi vị trí, bề rộng, căn hàng và chữ nút theo L4; giữ thành phần, khối và dữ liệu như ảnh.
- **L6** Khung xương năm khuôn ở 1040 và 390 nằm đúng lưới (mục 5.6).
- Bảng **«Token đã dùng»** (tên theo mã) và bảng **«Token MỚI đề xuất»** (lưới, ba mức bề rộng, thang ô) kèm lý do.
- 3–5 dòng giải thích vì sao lưới này làm màn hình mạch lạc hơn cho kế toán ngồi máy tính và bán hàng cầm điện thoại.

## 10. Đừng làm

Không vẽ lại khung (thanh trên, thanh tab, thanh bên, dải, hộp thoại). Không đổi mô hình điều hướng. Không thiết kế lại nghĩa hay luồng của màn nghiệp vụ (kể cả Hoa hồng — trang đó sẽ có đề bài riêng; ở đây chỉ đặt lại chỗ và chữ nút). Không thêm hay bỏ trường, tính năng, luật nghiệp vụ. Không màu hay phông mới. Không chế độ tối. Không chữ Anh trên màn hình. Không dữ liệu thật. Không nút nổi. Không mã React hay mã chạy được: sản phẩm là bản vẽ tương tác để duyệt.

## 11. Nếu thiếu thông tin quan trọng, hỏi tôi TRƯỚC khi vẽ, tối đa 3 câu.

---

## Bàn giao (đọc cùng bản vẽ, không dán vào Claude Design)

Thứ tự ưu tiên khi lệch: quyết định ở mục 5 thắng bản vẽ; token thật trong bộ v2 thắng số trong bản vẽ; chữ thật của máy chủ thắng chữ đề xuất; dữ liệu trong bản vẽ là giả. Bản vẽ lưới về thì Main session đối chiếu như cổng 2b (đạt / lệch / thiếu), đưa chủ một cổng duyệt; qua cổng thì lưới thành đầu vào bắt buộc của ba đề bài họ màn số 2–4 (mục «Quyết định đã chốt» của mỗi đề bài trích L1–L5).

Điểm vượt ra ngoài bề mặt phải nêu khi viết đặc tả thi công lưới: (1) thay sáu–bảy mức bề rộng bằng ba token MỚI theo expand–contract (giữ bí danh cũ một lần phát hành); (2) hàng rào máy cấm khai `max-width`, `grid-template-columns` riêng theo trang ngoài lưới chung (ứng viên trong `src/thanh-phan-v2-css.test.ts` hoặc tệp kiểm mới); (3) đổi chữ nút theo từ điển động từ chạm nhiều tệp `web/` và vài bài kiểm khớp chữ — liệt kê trước; (4) chuyển các hộp hỏi `confirm()` và các việc nguy chưa hỏi lại (`docs/evidence/2026-10-30-luoi-bo-cuc/so-lieu/dong-tu.md` mục 2–3) sang hộp xác nhận của khung — riêng «Tắt loại đối tác» là rủi ro thật (giữ đơn), nên đề xuất sửa sớm trong đợt đầu; (5) bỏ tiêu đề lớn lặp ở 39 trang chạm `public/*.html` (sau đợt 0b là `web/html/`); (6) khung xương 0b (`SO_MANH`) chỉ được đổi số mảnh nếu lưới đòi, kèm đo CLS lại.

## Lựa chọn Main session tự quyết khi soạn (đảo được; chủ chỉ cần biết)

1. **Từ điển động từ mục 5.5** là đề xuất của Main session suy từ kiểm kê (`dong-tu.md`) và đề bài Hoa hồng 29/10 (`../2026-10-29-tai-cau-truc-giao-dien/PROMPT-CLAUDE-DESIGN-HOA-HONG.md` mục 3.11, lối vào «Thay đổi…»). Chủ xem ở cổng duyệt bản vẽ. Hoàn tác: sửa bảng trước khi đặc tả.
2. **Tối đa ba mức bề rộng** và **căn trái hay giữa** để Claude Design đề xuất, không chốt số trước. Hoàn tác: chốt số ở cổng.
3. **Mười trang đại diện** chọn theo số đo (trang có nhiều khoảng trống nhất mỗi khuôn) cộng ba trang đại diện của khuôn; Hoa hồng chỉ đặt lại chỗ, phần nghĩa để đề bài họ Bảng điều khiển (số 5) dùng đề bài Hoa hồng 29/10 làm đầu vào.
4. **Khuôn đối tượng «bản ghi có hiệu lực theo ngày»** (gợi ý của bàn giao 29/10 mục 4) chưa đưa vào đề bài này; chỉ đưa động từ «Thay đổi… / Ngừng». Làm ở đề bài họ màn khi gặp.
5. Đề bài đặt số **1b** (sau đề bài khung chung số 1, trước đề bài họ màn số 2) để giữ số 2–6 của `LO-TRINH.md`.
