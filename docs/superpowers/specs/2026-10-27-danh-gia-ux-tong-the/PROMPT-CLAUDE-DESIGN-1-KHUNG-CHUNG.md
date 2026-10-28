# Đề bài Claude Design số 1 — Khung chung của Island Booking System (28/10/2026)

Hồ sơ có ngày. Thuộc Chặng 2, phần 7b của đợt đánh giá UX tổng thể (`PROMPT.md` mục 7b, khuôn ở mục 9). Căn cứ: đề cương `HE-THONG-HOP-NHAT.md` (duyệt cả gói ở cổng 1), `QUYET-DINH-CONG-1.md`, `QUYET-DINH-CONG-2A-2026-10-28.md`, bảng gộp `GOP-CLAUDE-DESIGN-VAO-BO-V2-2026-10-28.md`, tờ bổ sung `2026-10-27-danh-gia-ux-bo-sung.md`, số đo thanh điều hướng theo bộ quyền ở `docs/evidence/2026-10-27-danh-gia-ux-tong-the/so-lieu/tong-hop.md` bảng I. Bộ thiết kế dùng để vẽ: "Island Booking System — Design System v2" trên Claude, bản sau gộp **bản 8, `1793155409-bf46`** (220 token, 35 MỚI; 6 thành phần khung thêm từ Claude Design: Đầu trang, Thanh trên, Thanh tab dưới, Thanh bên, Trang mất mạng, Trang lỗi). Người soạn: Main session; hai lượt kiểm độc lập chỉ đọc đối chiếu với mã và đề cương (lượt 1: 27 điểm, lượt 2: 5 điểm; đã sửa hết). Cổng 2b: chủ dự án duyệt bản vẽ khung chung trước khi viết đề bài họ màn (số 2–6).

Cách dùng: chủ dự án chép toàn bộ phần giữa hai dòng gạch dưới đây, dán vào dự án Claude Design đã có bộ "Island Booking System — Design System v2", đính kèm các ảnh ở mục 4 và mục 7. Các lựa chọn Main session tự quyết khi soạn (đảo được) ghi ở cuối tệp, ngoài phần dán.

---

## 1. Vai và nhiệm vụ

Bạn là nhà thiết kế sản phẩm cao cấp, chuyên phần mềm quản trị doanh nghiệp. Hãy thiết kế **khung chung** của Island Booking System và **năm khuôn trang** của nó: điện thoại trước (390×844, dùng một tay), rồi máy tính (1040), kiểm thêm 768 (máy tính bảng dọc) và 1440. Chưa vẽ màn nghiệp vụ nào; chỉ vẽ cái khung mà mọi màn sẽ nằm trong, với dữ liệu đại diện lấy đúng cấu trúc của trang đang chạy.

Dùng hệ thống thiết kế **"Island Booking System — Design System v2"** đã có trong dự án này, bản đã được chủ dự án duyệt ở cổng 2a ngày 28/10/2026, **kèm các điều chỉnh ở mục 8** (bộ bạn dựng đã được đối chiếu với mã đang chạy; chỗ nào mục 8 nói khác bộ thì theo mục 8). Không dùng hệ thống khác, không tự đặt màu hay phông mới.

## 2. Bối cảnh

Island Booking System là nền tảng đặt dịch vụ tour nội bộ của Công ty TNHH Tour Đảo (Nha Trang): chạy trên trình duyệt và cài lên iPhone như ứng dụng. Sắp ra mắt cho khoảng 30 nhân viên và tới 1.000 tài khoản đối tác bên ngoài (thí điểm 5 cộng tác viên). Mười bộ quyền dùng chung một khung: người bán hàng lập đơn trên điện thoại khi đang nói chuyện với khách; kế toán đối chiếu công nợ trên máy tính cả ngày; điều phối xếp xe và tài xế trên máy tính rồi theo dõi trên điện thoại; tài xế bấm "Đã đón / Đã trả" ngoài nắng bằng ngón cái; đối tác gửi đơn từ điện thoại, đôi khi mạng yếu. Khung hiện nay hoạt động đúng về điều hướng (thanh tab dưới ở điện thoại, thanh bên 5 nhóm ở máy tính) nhưng phần vỏ quanh nó lệch nhau: đo được 12 kiểu đầu trang, 8 kiểu tab phụ, 5 kiểu thanh dính đáy, 21 kiểu vùng dính hoặc nổi, 5 cách dựng hộp thoại, 4 cách "đang tải". Việc của đề bài này là **một khung duy nhất**, để mọi màn sau chỉ còn đổ nội dung vào.

## 3. Năm tiêu chí của chủ dự án và nguyên tắc vàng của khung

Thứ tự ưu tiên: (1) **nhanh và mượt** — mở trang có khung xương giữ chỗ, không nhảy bố cục, chuyển trang không chớp; (2) dễ nhìn; (3) gọn mắt; (4) chuyên nghiệp, chuẩn phần mềm quản trị; (5) đơn giản, ít phải đoán.

Nguyên tắc vàng của khung chung: **người dùng luôn biết mình đang ở đâu, hành động chính của màn ở đúng một chỗ, và khung không bao giờ che nội dung.** Mục đang mở sáng ở thanh tab hoặc thanh bên; tiêu đề trang trùng nhãn mục; nút chính ở góc phải thanh trên (máy tính) hoặc chân dính (điện thoại), không có nút nổi; mọi trang mở ra với khung xương đúng hình dạng nội dung sắp đến.

## 4. Hiện trạng (ảnh đính kèm, mỗi ảnh một dòng)

Ảnh lấy từ `docs/evidence/2026-10-27-danh-gia-ux-tong-the/anh/` của kho mã. Ba trạng thái lỗi chỉ được chụp ở 390 (ở 1040 cùng lỗi, chưa có ảnh).

1. `nhieu-SUPER_ADMIN-trang-chu-390.jpg` — Trang chủ điện thoại: nút nổi "Trợ lý" che chữ dòng cuối; dải nhắc bảo mật và dải thông báo quan trọng chồng nhau dưới thanh trên, chiếm gần 30 % màn.
2. `nhieu-ACCOUNTING-trang-chu-390.jpg` — ô tìm nổi của Trang chủ đè lên dải bảo mật, nút "Bật ngay" bị che không bấm được.
3. `nhieu-SUPER_ADMIN-trang-chu-1040.jpg` — máy tính: thanh bên 5 nhóm (đúng), nhưng hai lối "Tạo đơn" (thanh trên và thanh bên) và một dải bảo mật chiếm chỗ.
4. `nhieu-SUPER_ADMIN-orders-1440.jpg` — Đơn hàng màn rộng: **ba** lối "Tạo đơn" trên một màn (thanh trên, thanh bên, cạnh nút Lọc); bảng kéo giãn hết bề rộng.
5. `nhieu-SUPER_ADMIN-trang-chu-1440.jpg` — Trang chủ màn rộng có mốc riêng 1400 khác mọi trang.
6. `nhieu-SALES-403-audit-390.jpg` — mở trang không có quyền: dựng nguyên vỏ trang với ô tìm, bộ lọc còn bấm được, thêm một hộp đỏ, không nút về, thanh tab sáng nhầm "Tôi".
7. `nhieu-SALES-404-khong-co-trang-nay-390.jpg` — gõ địa chỉ sai: JSON thô chữ đen nền trắng, không vỏ, không lối về.
8. `nhieu-SALES-matmang-trang-chu-390.jpg` — mất mạng: câu lỗi đỏ nhưng khung xương vẫn nhấp nháy mãi bên dưới, không nút "Thử lại".
9. `nhieu-ADMIN-xe-390.jpg` — tiêu đề lặp hai lần (thanh trên và chữ to ngay dưới), nút nổi che huy hiệu xe thứ tư.
10. `nhieu-SUPER_ADMIN-xe-dang-chay-768.jpg` — máy tính bảng dọc: thanh bên 247 px vẫn hiện, nội dung còn khoảng 520 px.
11. `nhieu-ADMIN-lich-xe-ban-1040.jpg` — thanh bên cuộn: một mục bị cắt nửa chữ vì nhóm Thiết lập dính đáy đè lên; ba nút đỏ đặc cùng lúc.

## 5. Quyết định đã chốt (vẽ đúng như vậy; muốn khác thì ghi chú riêng, không đưa lên artboard)

### 5.1 Mô hình điều hướng — giữ, chỉ chuẩn hoá vỏ
- Điện thoại (≤ 640): **thanh tab dưới** 4–5 mục theo bộ quyền (mục 6) + **thanh trên**. Máy tính (≥ 900): **thanh bên** 5 nhóm HẰNG NGÀY / VẬN CHUYỂN / TIỀN / THIẾT LẬP / chân menu (Của tôi, Hỗ trợ, Hướng dẫn, tên người), **trần 10 mục hiện sẵn** không kể chân menu, **nhóm gập đếm là một**; mục chỉ hiện khi bộ quyền mở được trang (mục 6 liệt đúng theo mã). Mô hình này đã có quyết định kiến trúc, không đổi.
- Khổ 641–899 (768): **phương án A** thanh bên thu gọn 56 px chỉ còn biểu tượng, rê hoặc chạm vào mới xổ nhãn; **phương án B** giữ thanh tab dưới như điện thoại. Vẽ cả hai cạnh nhau với cùng bộ quyền Toàn quyền, trang Đơn hàng (nhiều); chủ dự án chọn sau khi nhìn thật.
- Mục đang mở sáng (`aria-current="page"`), trang con sáng mục cha; trang không thuộc mục nào thì **không sáng mục nào**, không mượn "Tôi".
- Không quá 2 chạm tới việc hằng ngày: Bán hàng → Tạo đơn (1 chạm), Kế toán → Sổ công nợ (1 chạm, mục trên thanh tab), Tài xế → Cuốc của tôi, Nhân sự → Thêm tài khoản.
- **Chân dính là thanh dính đáy duy nhất của trang**: trang con (chi tiết, biểu mẫu) có chân dính thì **không hiện thanh tab**; trang cấp một (mục của thanh tab) không có chân dính. Không bao giờ chồng hai thanh dính.

### 5.2 Thanh trên — một thanh duy nhất cho mọi trang trong
- Trái: **trang cấp một** hiện logo nhỏ, không nút quay lại; **trang con** hiện nút quay lại (điện thoại) hoặc đường dẫn **một cấp** (máy tính). Giữa: tiêu đề trang 18/600, cắt một dòng bằng "…" (chỗ duy nhất được cắt chữ). Phải: **tối đa một** hành động chính (máy tính: nút "+ Tạo đơn" màu san hô cho bộ có quyền tạo đơn) + biểu tượng **chuông** + biểu tượng **Trợ lý** (chuyển từ nút nổi lên đây, ở cả hai khổ).
- Trang chủ là ngoại lệ có dải chào (giữ bản đang chạy). Không còn tiêu đề lặp hai lần. **Phương án B cho riêng một artboard 1040**: tiêu đề trang tách khỏi thanh trên thành dòng 20–24 px dưới thanh (Claude Design từng đề xuất); phương án A (tiêu đề 18 trên thanh) là mặc định của mọi artboard khác.
- Máy tính từ 900: ô **"Tìm đơn"** (gợi ý "Tìm mã đơn, tên khách, SĐT…") nằm trên thanh trên **chỉ với bộ xem được mọi đơn** (Toàn quyền, Quản trị, Kế toán, Bán hàng); các bộ khác không có ô tìm trên thanh trên. Phím `/` nhảy vào ô tìm, `Esc` đóng bảng trượt hoặc hộp thoại (phím `N` để sau, không vẽ).

### 5.3 Dải trên trang — tối đa một dải
- Thứ tự ưu tiên: bảo trì > thông báo quan trọng > nhắc bảo mật hai lớp. Dải cao **một dòng (44 px)** với nút "Xem" mở bảng trượt đọc đủ. Sau "Đã hiểu" hoặc đóng thì nhớ theo phiên; thông báo quan trọng vẫn bắt bấm "Đã hiểu". Không hiện dải nhắc bảo mật khi đang ở biểu mẫu. Ô tìm của Trang chủ không được đè dải.
- Dải bảo trì **chỉ Toàn quyền thấy** (đang bảo trì, còn bao nhiêu phút). Người khác: đang mở phiên thì thấy **lớp phủ toàn trang** có đếm ngược và nút Đăng xuất (câu của máy: "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là 23:30…"); chưa đăng nhập thì màn Đăng nhập có dải đếm ngược cùng câu đó. Vẽ hai trạng thái này, không vẽ trang bảo trì riêng.

### 5.4 Thanh tab dưới (điện thoại)
- 4–5 mục, nhãn 12 px dưới biểu tượng, mục giữa là nút tròn **"+" màu san hô cho Tạo đơn** ở bộ có quyền tạo đơn (giữ như mã, quyết định cổng 2a). Chừa `safe-area` đáy. Ẩn trên trang con có chân dính (5.1).

### 5.5 Thanh bên (máy tính)
- 5 nhóm như trên; nhóm gập được; **mục con không bị khối chân thanh bên che**: phần giữa thanh bên cuộn, chân menu dính đáy riêng, mục cuối không bị cắt. Lối "Bỏ qua tới nội dung chính" hiện khi bấm Tab lần đầu (hiện nay 12 lần Tab đầu đều rơi vào logo và menu).
- Hành động chính của trang **không** lặp trong thanh bên (nút "Tạo đơn" chỉ ở thanh trên).
- Toàn quyền hiện 11 mục nếu chỉ bỏ "Tạo đơn" khỏi thanh bên; để về trần 10, **"Đề nghị chuyển khách" gộp vào nhóm gập "Điều phối"** cùng "Điều phối xe". Kết quả Toàn quyền: Trang chủ · Đơn hàng · Danh bạ | Điều phối (gập: Điều phối xe, Đề nghị chuyển khách) · Xe đang chạy · Xe & giấy tờ (gập) · Giá & chi phí (gập) | Điều chỉnh công nợ · Sổ công nợ & khoá sổ (gập) | Thiết lập (gập) = 10.

### 5.6 Đầu trang, vùng hành động, chân dính
- Hành động chính **luôn** ở một trong hai chỗ: góc phải thanh trên (máy tính; danh sách và thiết lập) hoặc chân dính (điện thoại; chi tiết và biểu mẫu). Không nút chính giữa thân, không nút nổi.
- Dải hành động của trang chi tiết: tối đa 1 chính + 2 phụ, còn lại vào "⋯".
- Chân dính (điện thoại): **một** kiểu nền và kẻ; nút cao **52** (`h-control-lon`); chứa một nút chính + "Quay lại" hoặc hành động tiếp theo; chừa `safe-area`.
- Tab phụ trong trang: **một thành phần Tab** với hai biến thể — gạch chân (máy tính) và viên thuốc cuộn ngang (điện thoại) có bóng mờ ở mép báo còn tab bên phải. Tab mặc định là tab có việc của vai.

### 5.7 Bảng trượt, hộp thoại, thông báo
- **Một khuôn** cho lớp phủ: điện thoại là **bảng trượt từ đáy**, máy tính là **hộp thoại giữa màn** (không có ngăn phải; ngăn phải chỉ là mẫu danh sách–chi tiết của khuôn Danh sách ở 5.10). Đầu có tiêu đề + nút đóng, thân cuộn, chân có một nút chính + một phụ; `Esc` đóng. Thay cho 5 cách dựng hiện nay, kể cả hộp xác nhận của hệ điều hành.
- Hộp thoại xác nhận hành động một chiều (xoá, khoá sổ, huỷ) phải **nói hậu quả**, có vòng cảnh báo tông Đỏ và đặt nút nguy hiểm tách riêng.
- Thông báo ngắn (toast): nền tối chữ trắng, nút "Hoàn tác" màu cát khi có, hiện trên bảng trượt, tự tắt sau **3 giây**, vị trí không đè chân dính.
- **Năm tông trạng thái**, mỗi tông kèm hình riêng để người mù màu phân biệt được: **Biển** (`history`, đang diễn ra) · **Xanh lá** (`check`, xong) · **Cát** (`clock`, đang chờ) · **Đỏ** (`alertCircle`, cần xử lý) · **Xám** (`minus`, đã huỷ hoặc không áp dụng).

### 5.8 Trạng thái hệ thống — mỗi trạng thái có vỏ
- **Mất mạng, trang đã nạp**: giữ vỏ và nội dung lần xem gần nhất, thêm **dải tông Cát** "Đang ngoài mạng — dữ liệu lần xem gần nhất" + nút "Thử lại"; khung xương **không chạy**; tự thử lại khi có mạng; thanh tab vẫn dùng được.
- **Mất mạng, trang chưa nạp**: vỏ + hình + câu "Không có kết nối mạng…" + nút "Thử lại" (trang ngoài mạng).
- **Không có quyền (403)**: vỏ + một câu chung "Bạn không có quyền xem trang này" + nút "Về trang đầu của bạn"; không dựng ô tìm hay bộ lọc của trang; thanh tab không sáng mục nào.
- **Không có trang (404)** và **thiếu mã** (mở chi tiết không có mã): vỏ + câu tiếng Việt + nút về; không bao giờ lộ JSON hay chữ Anh.
- **Đang tải**: khung xương đúng hình dạng nội dung sắp đến (thẻ, bảng, ô số liệu), cùng một bộ token khung xương cho mọi trang; không dùng chữ "Đang tải…" trần; vòng quay chỉ cho nút đang gửi.
- **Rỗng**: hình nhỏ trong vòng 56 + một câu nói vì sao rỗng + một nút làm việc kế tiếp. **Lỗi máy chủ**: câu nói đúng lý do + nút "Thử lại".

### 5.9 Luật đáp ứng và chữ
- Chỉ ba mốc: **640 / 900 / 1200**. Nội dung rộng tối đa **1280** căn giữa ở màn rộng, không kéo giãn bảng. Vùng chạm ≥ 44; ô gõ 16 px; không tràn ngang; vành tiêu điểm 3 px khi dùng bàn phím; mọi việc làm được bằng Tab + Enter + Esc.
- Cùng từ vựng ở hai khổ. Tiền ghi một cách **"1.080.000 ₫"** ở mọi khổ (xuống dòng riêng nếu thiếu chỗ, không viết "1,08tr"). Ngày `28/10/2026`. Nhãn in hoa chỉ dùng cho **tên nhóm** (thanh bên, tiêu đề nhóm trong trang); nhãn ô số liệu và cột viết thường.
- Độ đậm ba mức: 400 nội dung / 500 nhãn và nút / 600 tiêu đề và số lớn. Một mật độ bảng, không có núm gọn/thoáng.

### 5.10 Năm khuôn trang — vùng cố định từ trên xuống

| Khuôn | Trang đại diện (trường và khối lấy đúng ảnh ở mục 7) | Đầu trang | Vùng hành động | Thân | Chân dính (điện thoại) | Máy tính |
|---|---|---|---|---|---|---|
| Danh sách | Đơn hàng | tiêu đề + nút "+ Tạo đơn" ở thanh trên (máy tính) hoặc "+" thanh tab (điện thoại) | thanh tìm + nút Lọc; chip đang lọc hiện dưới | thẻ (≤ 899) / bảng (≥ 900), 50 dòng + "Tải thêm" (không phân trang số) | không có | bảng cột số canh phải, hành động theo dòng ở cột cuối; ngăn chi tiết phải khi chọn |
| Chi tiết | Chi tiết đơn | quay lại + mã đơn + huy hiệu trạng thái | dải hành động 1 chính + 2 phụ + "⋯" | khối thẻ: tóm tắt → nội dung chính → lịch sử | thanh hành động chính khi có việc tiếp theo (ví dụ "Xác nhận đơn") | hai cột ≥ 900: thân trái, tóm tắt và hành động phải dính |
| Biểu mẫu | Tạo / sửa chuyến | quay lại + tiêu đề | — | nhóm trường có tiêu đề; **nhãn nằm trên ô, luôn thấy**; lỗi dưới ô kèm cách sửa; đòi điều bắt buộc ngay trong biểu mẫu trước khi cho bấm nút chính | một nút chính + "Quay lại" | hai cột ≥ 900 |
| Bảng điều khiển | Trang chủ (Bán hàng) | dải chào | ô tìm đơn | lưới ô số liệu (ô bấm được, nhảy tới khối) → khối "Việc của bạn" (máy tính) → lối tắt | không có | 2 cột ≥ 1200 |
| Thiết lập | Dịch vụ & giá | tiêu đề + nút "+ Thêm" | thanh tìm nếu > 20 mục | danh sách thẻ/bảng hoặc nhóm công tắc | nút "Lưu" nếu là trang công tắc | một cột tối đa 900 |

Mỗi khuôn phải có đủ **rỗng / ít / nhiều / đang tải / lỗi**. Biểu mẫu thêm mới không đứng trước danh sách: "Thêm" mở bảng trượt (điện thoại) hoặc trang riêng (máy tính). Biến thể **thanh bước** của khuôn Biểu mẫu (khi ≥ 3 nhóm): vẽ một artboard riêng với ba nhóm ghi "Bước 1 · Bước 2 · Bước 3", chỉ để thấy hình dạng; trang Tạo / sửa chuyến vẽ **không** thanh bước.

## 6. Biến thể theo bộ quyền — mỗi bộ một artboard khung ở 390 và một ở 1040

Thanh bên máy tính dưới đây là **số đo thật** từ mã (bảng I), chỉ bỏ "Tạo đơn" (lên thanh trên) và gộp "Đề nghị chuyển khách" vào nhóm Điều phối (5.5). Thanh tab điện thoại là **đề xuất theo luật đề cương** (4–5 mục; bộ ít trang bù "Hỗ trợ", "Hướng dẫn"; bộ nhiều trang gom "Dịch vụ" và "Tài khoản" vào một mục "Thiết lập" mở trang mục lục thiết lập, khuôn Thiết lập): vẽ theo, mã sẽ chỉnh ở đợt thi công.

| Bộ quyền | Trang đầu | Thanh tab điện thoại (đề xuất) | Thanh bên máy tính (theo mã; nhóm gập ghi "gập") |
|---|---|---|---|
| Toàn quyền | Trang chủ | Trang chủ · Đơn hàng · **+ Tạo đơn** · Thiết lập · Tôi | Trang chủ · Đơn hàng · Danh bạ · Điều phối (gập) · Xe đang chạy · Xe & giấy tờ (gập) · Giá & chi phí (gập) · Điều chỉnh công nợ · Sổ công nợ & khoá sổ (gập) · Thiết lập (gập 15) · chân menu |
| Quản trị | Trang chủ | Trang chủ · Đơn hàng · **+ Tạo đơn** · Thiết lập · Tôi | như Toàn quyền nhưng **không có** Sổ công nợ & khoá sổ; Thiết lập 10 mục (không có Máy đang đăng nhập, Nhật ký, Gửi thông báo, Trợ lý Hỗ trợ, Giao diện) |
| Kế toán | Trang chủ | Trang chủ · Đơn hàng · Sổ công nợ · Tôi | Trang chủ · Đơn hàng · Danh bạ · Điều phối xe · Xe đang chạy · Giá & chi phí (gập) · Điều chỉnh công nợ · Sổ công nợ & khoá sổ (gập) · Thiết lập (gập: Hoa hồng đối tác, Người bán dịch vụ, Chụp bù mức) · chân menu |
| Bán hàng | Trang chủ | Trang chủ · Đơn hàng · **+ Tạo đơn** · Danh bạ · Tôi | Trang chủ · Đơn hàng · Danh bạ · Điều phối xe · Xe đang chạy · Thiết lập (gập: Hoa hồng đối tác) · chân menu |
| Thực tập | Đơn hàng | Đơn hàng · **+ Tạo đơn** · Hỗ trợ · Tôi | Đơn hàng · chân menu |
| Hướng dẫn viên | Đơn hàng | Đơn hàng · Hỗ trợ · Hướng dẫn · Tôi | Đơn hàng · chân menu |
| Đối tác | Đơn hàng | Đơn hàng · **+ Tạo đơn** · Hỗ trợ · Tôi | Đơn hàng · chân menu |
| Nhân sự | Quản lý tài khoản | Tài khoản · Hỗ trợ · Hướng dẫn · Tôi | Quản lý tài khoản · chân menu |
| Tài xế công ty | Cuốc của tôi | Trang chủ · Cuốc của tôi · Hỗ trợ · Tôi | Trang chủ (tài xế) · Cuốc của tôi · chân menu |
| Tài xế đối tác | Cuốc của tôi | Trang chủ · Cuốc của tôi · Báo bận · Hỗ trợ · Tôi | Trang chủ (tài xế) · Cuốc của tôi · Báo bận của tôi · chân menu |

Chân menu = Của tôi · Hỗ trợ · Hướng dẫn · tên người đang đăng nhập. Mục "+ Tạo đơn" chỉ hiện ở bộ có quyền tạo đơn (Toàn quyền, Quản trị, Bán hàng, Thực tập, Đối tác); Kế toán không tạo đơn.

## 7. Dữ liệu mẫu (giả, đúng cấu trúc thật; trường và khối lấy theo ảnh đính kèm)

- Người đang đăng nhập: "Nguyễn Văn An" (Bán hàng), "Trần Thị Bích" (Kế toán), "Lê Minh Châu" (Toàn quyền), "Phạm Quốc Dũng" (Hướng dẫn viên), "Võ Thanh Em" (Tài xế đối tác).
- **Trang chủ (Bán hàng)** — đúng như trang đang chạy: điện thoại có lưới ô số liệu **Còn thiếu 2** · **Doanh thu của tôi 18.450.000 ₫** · **Đơn nháp 1** · **Chưa phụ trách 1**; máy tính có một ô "Doanh thu của tôi · Tuần này · 27/10–02/11 · 9 đơn · **18.450.000 ₫**" và khối **"Việc của bạn"** gồm các thẻ Đơn chờ xác nhận 3 · Đơn nháp 1 · Đơn còn thiếu tiền 2 · Đơn chưa có người phụ trách 1 · Chuyến hôm nay 4 (Bán hàng **không** có thẻ "Cần xem lại"; thẻ đó chỉ Quản trị trở lên thấy). Ảnh đính kèm là của Toàn quyền, dùng để thấy bố cục: `nhieu-SUPER_ADMIN-trang-chu-390.jpg`, `nhieu-SUPER_ADMIN-trang-chu-1040.jpg`.
- **Đơn hàng** — dòng: mã `TD-20261029-0012`, khách "Hoàng Thị Gấm", dịch vụ "Tour 4 đảo · Cano", ngày đi `29/10/2026 07:30`, "2 NL · 1 TE", tiền **1.080.000 ₫**, huy hiệu "Chờ xác nhận" (Cát), "Đã xác nhận" (Xanh lá), "Đang đi" (Biển), "Quá hạn thanh toán" (Đỏ), "Đã huỷ" (Xám). Ảnh: `nhieu-SUPER_ADMIN-orders-390.jpg`, `nhieu-SUPER_ADMIN-orders-1040.jpg`.
- **Chi tiết đơn** — khối tóm tắt, nội dung, lịch sử đúng ảnh `nhieu-SALES-order-390.jpg`, `nhieu-SALES-order-1040.jpg`.
- **Tạo / sửa chuyến** — nhóm trường đúng ảnh `nhieu-SUPER_ADMIN-chuyen-sua-390.jpg`, `nhieu-SUPER_ADMIN-chuyen-sua-1040.jpg`; không thêm trường.
- **Dịch vụ & giá** — mục và cột đúng ảnh `nhieu-SUPER_ADMIN-catalog-390.jpg`, `nhieu-SUPER_ADMIN-catalog-1040.jpg`.
- Thông báo: dải quan trọng "Từ 1/11 đổi giờ đón tại Cảng Vinpearl — đọc và bấm Đã hiểu"; dải bảo mật "Còn 14 ngày để bật bảo mật hai lớp — Bật ngay"; dải bảo trì (Toàn quyền) "Đang bảo trì, dự kiến xong 23:30"; dải ngoài mạng "Đang ngoài mạng — dữ liệu lần xem gần nhất".
- Đủ ba trạng thái dữ liệu: rỗng (0 đơn, "Chưa có đơn nào hôm nay — Tạo đơn đầu tiên"), ít (3 đơn), nhiều (50 dòng + "Tải thêm").

## 8. Hệ thống thiết kế bắt buộc và các điều chỉnh đã chốt

Dùng bộ "Island Booking System — Design System v2" trong dự án này. Sau khi đối chiếu bộ với mã đang chạy, các điểm sau đã được chốt và **thắng bộ nếu lệch**:

- **Tên token theo mã** khi lập bảng "Token đã dùng": phông Be Vietnam Pro (trong bộ ghi ở họ phông `sans`, trong mã là `--font`; ba phông tuỳ chọn Nunito, Lexend, Noto Sans do chủ đổi ở Giao diện công ty, không vẽ); màu `--c-*` (`c-primary` biển, `c-accent` san hô, `c-sand` cát, nền `c-surface`, chữ `c-text`, `c-text-muted`, năm tông trạng thái); cỡ chữ `--fs-step-1…14`; độ đậm `--fw-regular/medium/semibold/bold` = 400/500/500/600; khoảng cách `--s1…s7` = 4/8/12/16/24/32/48; bo `--radius-sm/md/lg/pill`; bóng `--shadow-card`, `--shadow-card-hover`, `--shadow-overlay`, `--shadow-btn-solid`; tiêu điểm `--c-focus` / `--focus-ring` 3 px và vành mờ ô gõ `--c-focus-ring`; chiều cao `--h-control` 44 / `--h-control-lon` 52; lớp xếp `--z-dinh … --z-tren-cung`; chuyển động `--t-nhanh` 150 / `--t-vua` 200 với `ease-out`; bề rộng `--w-noi-dung-max` 1280; ba mốc 640/900/1200. Tên tiếng Việt trong bộ bạn dựng chỉ là tên hiển thị.
- Vành mờ ô gõ khi nhận tiêu điểm, bóng khi rê thẻ và bóng nút đặc: **giữ** (bộ bạn dựng đã bỏ ba thứ này; mã và bộ đã duyệt giữ).
- Năm tông trạng thái: Biển `history` · Xanh lá `check` · Cát `clock` · Đỏ `alertCircle` · Xám `minus` (không dùng `alert`, `swap`, `ban`).
- Phông mono chỉ cho mã PIN và mã hai lớp; mã đơn dùng phông thường.
- Mốc điện thoại là **640**, không phải 768.
- Thông báo ngắn nền tối (đã chốt là ĐỔI so với mã, không phải "từ mã"); tự tắt 3 giây.
- Ô gõ 16 px, vùng chạm 44, WCAG AA (chữ 4,5:1; viền và hình phi-chữ 3:1 — vòng chọn hiện nay không đạt, dùng `c-text-muted` làm viền ô chọn và công tắc), vành tiêu điểm 3 px, không emoji.
- **Không có token sẵn thì đề xuất token MỚI**, đánh dấu rõ và ghi lý do trong bảng; không viết cứng số hay mã màu.

## 9. Sản phẩm cần giao

Một HTML tương tác, artboard đặt tên rõ và đánh số:

- **K1** Khung điện thoại 390 × **10 bộ quyền** (mục 6), mỗi artboard ở trạng thái Trang đầu của bộ đó (hoặc một artboard tương tác có nút đổi bộ quyền, miễn xem được đủ 10).
- **K2** Khung 768: phương án A (thanh bên gọn 56) và B (thanh tab dưới), bộ Toàn quyền, trang Đơn hàng (nhiều).
- **K3** Khung máy tính 1040 × **10 bộ quyền**; thêm **một** artboard Toàn quyền với phương án B tiêu đề trang tách khỏi thanh trên (5.2).
- **K4** Khung 1440 cho Toàn quyền, Kế toán, Bán hàng (nội dung 1280 căn giữa).
- **K5** Trạng thái hệ thống × 390 và 1040 (một bộ ở 1440): mất mạng (hai trường hợp), lớp phủ bảo trì khi đang mở phiên, Đăng nhập đang bảo trì, dải bảo trì của Toàn quyền, không có quyền, không có trang, thiếu mã, đang tải (khung xương), lỗi máy chủ.
- **K6** Bảng trượt (390) và hộp thoại (1040, một bản 1440), hộp xác nhận một chiều, thông báo ngắn năm tông, dải trên trang bốn loại.
- **T1–T5** Năm khuôn trang × 390 và 1040, mỗi khuôn có công tắc chuyển rỗng / ít / nhiều / đang tải / lỗi (hoặc artboard riêng cho từng trạng thái nếu bạn thấy rõ hơn); thêm một artboard biến thể thanh bước của khuôn Biểu mẫu.
- Bảng **"Token đã dùng"** (tên theo mã) và bảng **"Token MỚI đề xuất"** kèm lý do.
- 3–5 dòng giải thích vì sao khung này giúp người bán hàng, kế toán và tài xế làm việc nhanh hơn.

## 10. Đừng làm

Không đổi mô hình điều hướng (thanh tab dưới + thanh bên 5 nhóm là quyết định kiến trúc đã có). Không vẽ màn nghiệp vụ cụ thể ngoài trang đại diện của năm khuôn. Không thêm trường, tính năng hay luật nghiệp vụ; không bỏ chức năng đã nêu. Không màu hay phông mới. Không chế độ tối. Không chữ Anh trên màn hình (kể cả "dd/mm/yyyy", "Loading"). Không dữ liệu thật. Không nút nổi đè nội dung. Không mã React hay mã chạy được: sản phẩm là bản vẽ tương tác để duyệt, mã sẽ do đội khác viết bằng HTML và TypeScript thuần.

## 11. Nếu thiếu thông tin quan trọng, hỏi tôi TRƯỚC khi vẽ, tối đa 3 câu.

---

## Bàn giao (đọc cùng bản vẽ, không dán vào Claude Design)

Thứ tự ưu tiên khi lệch: quyết định ở mục 5 thắng bản vẽ; token thật trong bộ v2 thắng màu và số trong bản vẽ; chữ thật của máy chủ thắng chữ đề xuất; dữ liệu trong bản vẽ là giả. Khi viết đặc tả thi công đợt 0 phải nêu riêng các điểm vượt ra ngoài bề mặt: khung tải và nạp sẵn theo vai (ADR-0143, chủ duyệt riêng); trang 404 cần Worker trả HTML (câu 10 cổng 1: chỉ bản thử, lên production qua lần triển khai chủ duyệt); câu lỗi máy chủ (câu 9: chủ duyệt danh sách trước); nhớ "đã đọc" dải theo phiên (cần lưu trữ, chạm API); lối "Bỏ qua tới nội dung" và `aria-current` (chạm `web/shell.ts`); thanh tab 4–5 mục theo bộ quyền và mục "Thiết lập" mở trang mục lục thiết lập (**đường dẫn mới**, chạm `PAGES`, `sw-policy.ts`, `muc-giao-dien.ts` `THANH_TAB`); gộp "Đề nghị chuyển khách" vào nhóm Điều phối ở thanh bên (chạm `THANH_BEN`); chân dính thay thanh tab ở trang con (chạm `shell.ts`); mất mạng hai trường hợp theo quyết định 3 cổng 1 (trang đã nạp giữ bản cũ, trang chưa nạp ra trang ngoài mạng — gắn với ADR-0143).

## Lựa chọn Main session tự quyết khi soạn (đảo được; chủ chỉ cần biết)

1. Danh sách mục **thanh tab** theo bộ quyền ở mục 6 là đề xuất suy từ luật của đề cương (4–5 mục; bù Hỗ trợ/Hướng dẫn; gom Dịch vụ + Tài khoản thành "Thiết lập"), không phải đã có trong mã; mục "Thiết lập" cần một trang mục lục mới ở đợt thi công. Hoàn tác: sửa bảng mục 6.
2. Để Toàn quyền về đúng trần 10 mục thanh bên: gộp "Đề nghị chuyển khách" vào nhóm gập "Điều phối". Hoàn tác: chọn mục khác để gộp.
3. Khổ 768 vẽ **cả hai phương án** (thanh bên gọn theo E3 đã duyệt; thanh tab dưới như Claude Design từng đề xuất); tiêu đề trang vẽ thêm **một** phương án B tách khỏi thanh trên. Chủ chọn ở cổng 2b.
4. Trang đại diện của năm khuôn: Đơn hàng, Chi tiết đơn, Tạo / sửa chuyến, Trang chủ Bán hàng, Dịch vụ & giá; Tạo / sửa chuyến thay Tạo đơn vì Tạo đơn đã vẽ lại tháng 10 và sẽ có đề bài riêng ở Chặng 3.
5. Chân dính thay thanh tab ở trang con (theo câu "thanh dính đáy duy nhất" của đề cương đã duyệt), khác hiện trạng Tạo đơn (chân dính đứng trên thanh tab).
