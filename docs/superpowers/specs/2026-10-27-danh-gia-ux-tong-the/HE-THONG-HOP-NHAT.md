# Đề cương hệ thống thiết kế hợp nhất — "Island Booking System — Design System v2"

Hồ sơ có ngày: 27/10/2026, Chặng 1 của đề bài `PROMPT.md` (mục 6.5, sản phẩm số 4). Đây là **đề cương để chủ dự án duyệt ở cổng 1**; bộ v2 thật sẽ được dựng ở Chặng 2 (7a) theo đề cương này. Không phải mã, không phải bản vẽ. Mỗi mục trỏ về mã phát hiện trong `PHU-LUC-PHAT-HIEN.md` (H-… = hệ thống, C-… = cục bộ); số đo từ mã ở `SO-LECH-TU-MA.md` (kèm số dòng `app.css`), số đo trên màn hình ở `KIEM-KE.md`.

**Ràng buộc giữ nguyên** (PROMPT mục 5): không framework, không dependency; token là nguồn sự thật; nhóm "Bản sao từ tourdaovn" không đổi giá trị; chỉ giao diện sáng; quyền chỉ qua `can()`, thanh bên trần 10 mục; không đổi luật nghiệp vụ, API, dữ liệu, tiền; ô gõ 16px. Mọi "MỚI" dưới đây là đề xuất chờ chủ duyệt, chưa vào mã.

## 0. Ba kết luận định hướng cả đề cương

1. **Giữ mô hình điều hướng hiện có, chuẩn hoá vỏ.** Thanh tab dưới ở điện thoại + thanh bên 5 nhóm ở máy tính (ADR-0015, menu theo việc 15/10) hoạt động đúng và đã được chủ duyệt; cái lệch là **phần vỏ quanh nó** (12 kiểu đầu trang, 8 kiểu tab phụ, 5 kiểu thanh dính đáy — H-DAU-TRANG, H-TAB, H-DINH).
2. **Thiếu tầng "thành phần" giữa token và trang.** Token đã khá đủ (464, sau dòng 875 không còn px/hex cứng) nhưng không có lớp thành phần dùng chung: chỉ ≈ 6 % luật CSS là thành phần chung, 42 % là của một phân hệ (Vận chuyển – Điều phối), 64 tiền tố lớp, 126 token là số đo riêng của một màn (H-TOKEN). Vì thế mỗi đợt vẽ lại tự dựng nút, chip, thẻ, hộp thoại của riêng mình: ≈ 48 kiểu nút, 7 họ chip, 14 kiểu thẻ, 5 cách dựng hộp thoại (H-NUT, H-CHIP, H-THE, H-HOP-THOAI). Bộ v2 phải là **ba tầng: gốc → ý nghĩa → thành phần**, và lớp thành phần là thứ Chặng 2–3 thi công trước.
3. **"Nhanh và mượt" là việc của khung tải, không phải của từng màn.** Mỗi trang là một tệp HTML + một gói JS riêng chứa lặp lại toàn bộ khung chung (trang nhẹ nhất 77 KB thô / 25 KB nén, nặng nhất 365 KB / 85 KB), CSS 426 KB / 90 KB nén nạp ở cả 47 trang, service worker nạp sẵn ≈ 1,9 MB nén ngay lần mở đầu; chưa dùng preload, prefetch, Speculation Rules hay View Transitions (H-GOI). Số đo thật trên 4G chậm (H-TOC-DO): mở lần đầu khung vẽ ≈ 1 s nhưng nội dung 1,1–2,0 s (0/45 trang đạt 1 s), mở lại 0,2–0,9 s, chạm 10–13 ms, CLS > 0,1 ở 12 trang vì thiếu khung xương; bộ xử lý không bị chặn. Đòn bẩy nằm ở 6 chỗ trong khung chung (+ 1 chỗ gộp lời gọi API chờ chủ), không cần đổi kiến trúc "mỗi trang một HTML".

## 1. Mô hình điều hướng và kiến trúc thông tin (mặt 1)

**Giữ**: hai lớp điều hướng theo thiết bị — điện thoại: thanh tab dưới (tối đa 5 mục theo vai, từ `THANH_TAB` của `src/shared/muc-giao-dien.ts`) + thanh trên có nút quay lại; máy tính: thanh bên 5 nhóm (HẰNG NGÀY / VẬN CHUYỂN / TIỀN / THIẾT LẬP / chân menu), trần 10 mục hiện sẵn, mục hiện khi và chỉ khi trang mở được (`can()`). Trang đầu theo vai (`homeRedirect`). Lý do giữ: đã có ADR, đã được đo là đúng theo vai (bảng I trong `so-lieu/tong-hop.md`: mục thanh tab / thanh bên từng bộ quyền), và đổi mô hình là việc cần ADR mới (PROMPT mục 5).

**Chuẩn hoá** (đề xuất, không cần ADR vì chỉ là vỏ):
- **Một thanh trên duy nhất** cho mọi trang trong (khuôn "đầu trang" ở mục 2): trái = quay lại (điện thoại) hoặc đường dẫn 1 cấp (máy tính), giữa = tiêu đề trang 18/600 cắt một dòng, phải = **tối đa một** hành động chính + chuông. Trang chủ là ngoại lệ có dải chào (giữ bản vẽ 1.73). Thay cho ≈ 12 kiểu đầu trang hiện nay (H-DAU-TRANG).
- **Tab phụ trong trang** (Hỗ trợ, Thông báo, Điều phối, Tài xế, dải trang anh em, phân đoạn Xe): **một thành phần "Tab"** với hai biến thể: gạch chân (máy tính) và viên thuốc cuộn ngang (điện thoại) có bóng mờ ở mép báo còn tab bên phải. Thay cho 8 kiểu từ mã / 11 kiểu đo được (H-TAB). **Tab mặc định là tab có việc của vai** (Hỗ trợ của người xử lý mở "Việc của nhóm", không mở "Yêu cầu của tôi" rỗng — C-FEEDBACK-TAB-MAC-DINH).
- **Người dùng biết mình ở đâu**: mục đang mở phải sáng ở thanh tab / thanh bên (`aria-current="page"`), tiêu đề trang trùng nhãn mục; trang con (chi tiết, biểu mẫu) sáng mục cha. Số đo hiện trạng: cột "mục sáng" bảng I `tong-hop.md` (H-DIEU-HUONG).
- **Không quá 2 chạm tới việc hằng ngày**: Bán hàng → Tạo đơn (1 chạm từ Trang chủ hoặc nút ở thanh trên), Kế toán → Đơn chờ xác nhận và Sổ công nợ (hiện phải qua Tôi → Của tôi, H-DIEU-HUONG), Tài xế → Chuyến hôm nay, Nhân sự → Thêm tài khoản. Số chạm đo thật ở `so-lieu/hanh-trinh-390.json` (H-HANH-TRINH).
- **Thanh tab điện thoại luôn 4–5 mục** cho mọi bộ quyền (hiện từ 2 đến 6 — H-DIEU-HUONG, C-TABBAR-6): bộ ít trang (HDV, Nhân sự) bù bằng mục "Hỗ trợ" và "Hướng dẫn" thay vì để 2 mục rộng 195 px; bộ nhiều trang (Quản trị, Toàn quyền) gom "Dịch vụ" và "Tài khoản" vào "Thiết lập" để còn 5. Trang không thuộc tab nào sáng mục **cha theo nhóm thanh bên** (Điều phối, Xe → nhóm Vận chuyển → mục "Đơn hàng"? không: mục gần nhất theo `THANH_TAB`; nếu không có thì **không sáng mục nào**, không mượn "Tôi").
- **Một hành động chính có đúng một lối trên mỗi màn** (H-NUT-CHINH-TRUNG): ở máy tính là nút ở thanh trên (giữ A2), ở điện thoại là nút "+" thanh tab hoặc chân dính; không lặp thêm nút cùng tên trong thân trang hay thanh bên.
- **Dải trên trang tối đa một dải** (H-DAI-TREN, C-TRANG-CHU-DAI-DE): bảo trì > thông báo quan trọng > nhắc bảo mật hai lớp theo thứ tự ưu tiên; dải cao một dòng (44 px) với nút "Xem" mở bảng trượt đọc đủ; sau khi bấm "Đã hiểu" hay đóng thì nhớ theo phiên; không hiện dải nhắc bảo mật khi đang ở biểu mẫu (Tạo đơn, Tạo chuyến). Ô tìm nổi của Trang chủ không được đè dải.
- **Không có nút nổi đè nội dung** (H-FAB): "Trợ lý" chuyển thành một biểu tượng ở thanh trên (cạnh chuông) ở cả hai khổ; nếu chủ muốn giữ nút nổi thì trang phải chừa đệm đáy 72 px và nút tự ẩn khi có chân dính hay bảng trượt mở — **câu hỏi gom số 4** ở `LO-TRINH.md`.

## 2. Đúng năm khuôn trang, mỗi khuôn có vùng cố định (mặt 2)

Mọi trang trong `PAGES` xếp vào đúng một khuôn (bảng trang × họ ở `KIEM-KE.md` mục A). Vùng cố định ghi theo thứ tự từ trên xuống; "chân dính" là thanh dính đáy duy nhất của trang (không chồng hai thanh dính).

| Khuôn | Trang (đại diện in đậm) | Đầu trang | Vùng hành động chính | Thân | Chân dính (điện thoại) | Máy tính 1040/1440 |
|---|---|---|---|---|---|---|
| **Danh sách** | **Đơn hàng**, **Danh bạ**, **Xe**, Đơn chờ xác nhận, Quản lý tài khoản, Cuốc của tôi, Xe đang chạy, Giấy tờ sắp hết hạn, Đề nghị, Nhật ký, Máy đang đăng nhập, Hỗ trợ | tiêu đề + nút "+ Tạo …" (một) | thanh tìm + nút Lọc (chip đang lọc dưới) | thẻ (≤899) / bảng (≥900), 50 dòng + "Tải thêm"; trạng thái rỗng có hướng dẫn | không có (nút "+" ở đầu trang) | bảng có cột số canh phải, hành động theo dòng ở cột cuối; ngăn chi tiết bên phải khi chọn (mẫu Sổ công nợ) cho Danh bạ, Hỗ trợ |
| **Chi tiết** | **Chi tiết đơn**, **Chi tiết chuyến**, Chi tiết xe, một hồ sơ Danh bạ, một vé Hỗ trợ, Chuyến của tôi | quay lại + mã/tên + huy hiệu trạng thái | dải hành động (tối đa 1 chính + 2 phụ, còn lại vào "⋯") | các khối thẻ theo thứ tự cố định: tóm tắt → nội dung chính → lịch sử | thanh hành động chính khi có việc tiếp theo (Xác nhận, Xuất bến) | hai cột ≥ 900: thân trái, tóm tắt/hành động phải dính |
| **Biểu mẫu** | **Tạo đơn**, **Tạo/sửa chuyến**, Thêm/sửa xe, Điều chỉnh công nợ, Chụp bù mức, Báo bận, form tạo tài khoản, form tạo hồ sơ, bảng trượt sửa nhanh | quay lại + tiêu đề + (thanh bước nếu ≥ 3 nhóm) | — | nhóm trường có tiêu đề; nhãn luôn thấy; lỗi dưới ô kèm cách sửa; **điều bắt buộc được đòi ngay trong biểu mẫu trước khi cho bấm nút chính**, không lưu nháp rồi mới báo (C-TAO-DON-DON-HAY-KHONG) | **một** nút chính + "Quay lại" | hai cột ≥ 960 → **đổi về 900** (H-MOC) |
| **Bảng điều khiển** | **Trang chủ** (theo vai), **Điều phối xe**, Trang đầu tài xế, Lịch xe bận, Sổ công nợ, Hoa hồng, Khoá sổ tháng, Bảng kê xe thuê, Việc của tôi (HDV) | dải chào (Trang chủ) hoặc tiêu đề + chọn ngày/kỳ | ô tìm / chọn ngày | lưới ô số liệu → khối việc hôm nay → lối tắt; **ô số đếm bấm được và nhảy tới khối tương ứng** (HDV: "Đơn của tôi 6" nhảy qua 19 thẻ chờ nhận — C-HDV-DON-CUA-TOI-XA) | không có | 2 cột ≥ 1200 (giữ), nhưng Trang chủ bỏ mốc 1400 riêng |
| **Thiết lập** | **Dịch vụ**, **Giao diện công ty**, Địa điểm, 2 loại giấy tờ, Chính sách điều phối, Điều kiện xuất bến, Lý do điều phối, Bảng giá xe, Người bán, Trợ lý, Gửi thông báo, Tôi, Hướng dẫn, Đăng nhập | tiêu đề + nút "+ Thêm" | thanh tìm (nếu > 20 mục) | danh sách thẻ/bảng hoặc nhóm công tắc; Tôi = nhóm dòng liên kết | nút "Lưu" nếu là trang công tắc | một cột tối đa 900 |

Luật chung cho cả năm khuôn: hành động chính **luôn** ở một trong hai chỗ — góc phải đầu trang (máy tính, danh sách/thiết lập) hoặc chân dính (điện thoại, chi tiết/biểu mẫu); không đặt nút chính giữa thân. **Biểu mẫu thêm mới không đứng trước danh sách** (H-TIM-LOC, C-STAFF-FORM-TRUOC, C-DANH-BA-LOC-390): danh sách là mục đích của trang nên thấy ngay ở màn đầu; "Thêm" mở bảng trượt (điện thoại) hoặc trang/ngăn riêng (máy tính); bộ lọc nhiều ô gập lại sau nút "Lọc" với chip đang lọc hiện dưới ô tìm (mẫu Đơn hàng). Ở khổ ≥ 900 danh sách là **bảng cột** (H-DANH-SACH-BANG), nội dung rộng tối đa 1280 căn giữa. Trạng thái **rỗng / ít / nhiều / đang tải / lỗi / mất mạng / không quyền** là bắt buộc của mỗi khuôn (mục 3). Phát hiện tương ứng: H-DAU-TRANG, H-DINH, H-TAI-RONG, bảng D và C của `tong-hop.md`.

## 3. Thành phần dùng chung và trạng thái (mặt 3–7)

Mỗi thành phần: **một tên lớp gốc + biến thể bằng thuộc tính** (`data-cap`, `data-tong`, `data-co`), thay cho tiền tố theo trang. Bảng trạng thái: ✔ bắt buộc có kiểu riêng; — không áp dụng. "Mất mạng" và "không quyền" là trạng thái của **trang** (khuôn), không của từng thành phần, nên ghi ở dòng cuối.

| Thành phần (gộp từ) | Bình thường | Rê chuột | Focus | Tắt | Lỗi | Đang tải | Rỗng | Phát hiện |
|---|---|---|---|---|---|---|---|---|
| Nút 3 cấp × 2 cỡ (gộp ≈ 48 kiểu từ mã, 86 chữ ký đo được) | ✔ | ✔ (chỉ `hover: hover`) | ✔ vành 3px `--c-focus` | ✔ xám phẳng, không opacity, **kèm một dòng nói vì sao tắt** ("Chọn lý do để lưu") — hiện hai kiểu tắt và không giải thích (C-BAO-BAN-NUT-TAT) | — | ✔ vòng quay trong nút | — | H-NUT |
| Tab (gộp 8 kiểu từ mã, 11 kiểu thấy trên màn hình) | ✔ | ✔ | ✔ | — | — | — | — | H-TAB |
| Nút nổi (chỉ nếu chủ giữ "Trợ lý" dạng nổi; mặc định: vào thanh trên) | ✔ 56, góc phải, đệm đáy 72 cho trang | ✔ | ✔ | — | — | — | — | H-FAB |
| Ô nhập: chữ, số, tiền, SĐT, ngày, giờ, chọn, nhiều dòng (gộp 16/17 px, 46/44/52) | ✔ 16px, cao 44 (52 ở chân dính) | — | ✔ | ✔ | ✔ viền đỏ + câu dưới ô + cách sửa | — | — | H-O-NHAP |
| Nhãn ô: luôn thấy, 14/500 màu chữ; "(tuỳ chọn)" ghi sau nhãn; bắt buộc không dùng dấu * | ✔ | — | — | — | — | — | — | H-O-NHAP |
| Ô tích, ô chọn một, công tắc (gộp 6 cách) | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | H-O-NHAP |
| Bộ đếm − / + (giữ `counter.ts`) | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — |
| Chip (bấm được: lọc, chọn nhóm) | ✔ 44 cao | ✔ | ✔ | ✔ | — | — | — | H-CHIP |
| Huy hiệu trạng thái (không bấm; gộp 7 họ) | ✔ 12/500, bo 999, **có biểu tượng** | — | — | — | — | — | — | H-CHIP, mục 5 |
| Thẻ (gộp 14 kiểu) | ✔ nền `--c-surface`, viền `--c-border`, bo 12 | ✔ (chỉ thẻ bấm được) | ✔ | — | ✔ viền đỏ | ✔ khung xương | — | H-THE |
| Dòng danh sách (gộp ≈ 25 lớp dòng kẻ) | ✔ kẻ dưới 1px, đệm 12×16, cao ≥ 44 | ✔ | ✔ | — | — | ✔ | — | H-DONG |
| Bảng (máy tính) | ✔ số canh phải, tiêu đề dính, hành động cột cuối | ✔ dòng | ✔ | — | — | ✔ 3 dòng xương | ✔ câu + nút | H-DONG |
| Tìm + Lọc + Sắp xếp + Tải thêm (một cụm) | ✔ | — | ✔ | — | — | ✔ | ✔ "Không khớp" + "Xoá lọc" | H-DONG |
| Bảng trượt (điện thoại) / hộp thoại (máy tính) — **một khuôn** `moBangTruot`, chân 1 chính + 1 phụ | ✔ | — | ✔ bẫy focus | — | ✔ dải lỗi đầu bảng | ✔ nút chính quay | — | H-HOP-THOAI |
| Hộp xác nhận hành động một chiều (thay 17 `confirm()`) | ✔ câu nói hậu quả + nút nguy hiểm | — | ✔ | — | — | ✔ | — | H-HOP-THOAI |
| Thông báo: dải lỗi chặn (gộp `.alert`/`.banner`/`.vc-alert`), dải cảnh báo, dải thông tin | ✔ có biểu tượng + câu "chuyện gì / làm gì tiếp" | — | — | — | — | — | — | H-THONG-BAO |
| Báo xong ngắn (toast) — **một** cơ chế thay ≥ 9 | ✔ 3 giây, không che việc, có "Hoàn tác" khi được | — | — | — | — | — | — | H-THONG-BAO |
| Dải trên trang (gộp bảo trì / thông báo quan trọng / hai lớp) | ✔ một hình, 3 tông | — | ✔ | — | — | — | — | H-THONG-BAO |
| Đầu trang (một) + thanh dính đáy (một) | ✔ | — | ✔ | — | — | — | — | H-DAU-TRANG, H-DINH |
| Khung xương (gộp 4 cách đang tải) | — | — | — | — | — | ✔ theo khuôn trang | — | H-TAI-RONG |
| Trạng thái rỗng (gộp 20 lớp) | — | — | — | — | — | — | ✔ biểu tượng + câu + **một** nút việc tiếp | H-TAI-RONG |
| Phân trang / tải thêm | ✔ "Tải thêm 50" | ✔ | ✔ | ✔ hết | — | ✔ | — | H-DONG |
| **Trang** (khuôn): mất mạng | dải "Đang ngoài mạng — dữ liệu lần xem gần nhất" + nút Thử lại | | | | | | | bảng C `tong-hop.md`, H-MAT-MANG |
| **Trang**: không có quyền (403) / không có trang (404) | một trang chung: biểu tượng + câu + nút "Về trang đầu" | | | | | | | H-403, H-404 |

Giữ nguyên và nhân rộng (ba màn mới nhất tốt hơn phần còn lại): ô nhãn nổi của Tạo đơn (`o-nhan-noi.ts`) → **không** nhân rộng (lệch luật "nhãn luôn thấy", đổi về nhãn trên ô); khuôn bảng trượt `moBangTruot` (31 tệp) → chuẩn; danh sách + ngăn chi tiết của Sổ công nợ → mẫu cho Danh bạ, Hỗ trợ máy tính; thẻ "Mức đang áp dụng" + "Tra nhanh" của Hoa hồng → mẫu thẻ số liệu; cụm Tìm + Lọc + chip đang lọc của Đơn hàng → chuẩn cho mọi danh sách.

## 4. Luật đáp ứng theo 390 / 768 / 1040 / 1440 (mặt 8)

- **Chỉ ba mốc**: 640 (≤ 640 = điện thoại: thanh tab, chân dính, bảng trượt, một cột), 900 (≥ 900 = bảng thay thẻ, hai cột chi tiết/biểu mẫu, ô tìm lên thanh trên), 1200 (≥ 1200 = ba cột điều phối, hai cột Trang chủ). Bỏ 720/1024 (Sổ công nợ), 959/960 (Tạo đơn), 1400 (Trang chủ), và sửa khối `(min-width: 640px)` lệch 1 px (H-MOC). 768 (iPad dọc) rơi vào 641–899: thanh bên thu gọn (chỉ biểu tượng, 56px) + thẻ; 1440 rơi vào ≥ 1200: nội dung rộng tối đa 1280 căn giữa, không kéo giãn bảng.
- Điện thoại: vùng chạm ≥ 44 (đo thật: cột "vùng chạm < 44" bảng B1 `tong-hop.md`, H-CHAM-44); ô gõ 16px; thanh dính đáy chừa `safe-area`; bảng trượt từ đáy; không tràn ngang (H-TRAN); chữ cắt bằng "…" chỉ ở tiêu đề thanh trên, không ở số tiền hay tên khách.
- Máy tính: mọi việc làm được bằng Tab + Enter + Esc (đo: cột "focus thấy (Tab)" bảng B2, H-FOCUS); rê chuột chỉ thêm, không bắt buộc; phím tắt tối thiểu: `/` vào ô tìm, `Esc` đóng bảng trượt, `N` tạo mới ở trang danh sách (MỚI, chờ duyệt).
- Cùng từ vựng ở hai khổ: nhãn nút, tên mục, câu trạng thái không đổi theo khổ (chỉ bố cục đổi). **Tiền ghi một cách** "1.080.000 ₫" ở mọi khổ (H-TIEN-KHO); nếu thẻ 390 không đủ chỗ thì xuống dòng riêng, không viết "1,08tr". Số khách ghi "2 NL · 1 TE" với chú thích một lần ở đầu danh sách hoặc ghi đủ "2 người lớn, 1 trẻ em" ở chi tiết (H-VIET-TAT). Tên khách không bị cắt dưới 20 ký tự ở 390: huy hiệu xuống dòng hai, không chiếm chỗ dòng tên (H-CAT-CHU).

## 5. Từ vựng trạng thái (mặt 5)

Một trạng thái = **một chữ** (nguồn duy nhất trong `src/shared/`, như `order-status-label.ts` đã làm cho đơn) + **một tông màu ý nghĩa** + **một biểu tượng** (để không chỉ dựa vào màu) + **một hình huy hiệu** (12/500, bo 999, không viền, nền nhạt chữ đậm). Năm tông ý nghĩa, mỗi tông một cặp token nền/chữ đã có:

| Tông | Ý nghĩa | Token đã có | Biểu tượng (MỚI, chọn từ `web/icons.ts` hoặc thêm) | Trạng thái dùng |
|---|---|---|---|---|
| Cát | chờ, cần làm, cảnh báo nhẹ | `--c-sand*` | đồng hồ | Chờ xác nhận, Chưa xếp, Sắp hết hạn, Chưa ai nhận, Vé mới |
| Biển | đang diễn ra, thông tin | `--c-primary-soft` / `--c-primary` | mũi tên vòng | Đang xử lý, Đang chạy, Đã xếp, Đã giao |
| Xanh lá | xong, tốt | `--c-green*` | dấu tích | Đã xác nhận, Hoàn tất, Còn hạn, Đã thu đủ, Vé xong |
| Đỏ | lỗi, huỷ, quá hạn | `--c-danger*` | dấu chấm than | Đã huỷ, Từ chối, Hết hạn, Quá hạn, Giữ lại |
| Xám | nháp, ngưng, không áp dụng | `--c-surface-alt` / `--c-text-muted` | dấu gạch | Nháp, Ngưng dùng, Đã khoá, Không còn trong Sheet |

Luật: không mượn `.badge-draft` (cát) cho 12 ý nghĩa khác như hiện nay (H-CHIP); "Đã giao – đã thu đủ" là một trạng thái, không ghép hai; chữ Anh/mã thô không bao giờ lộ (H-CHU-ANH); trạng thái chuyến, vé, giấy tờ, công nợ đưa vào cùng một bảng nguồn ở `src/shared/` (việc thi công, Chặng 3).

## 6. Thang nút ba cấp (mặt 7)

| Cấp | Hình | Khi dùng | Số lượng mỗi vùng | Cỡ |
|---|---|---|---|---|
| **Chính** | nền đặc `--c-primary`, chữ `--c-on-dark` (san hô `--c-accent` chỉ cho "Xác nhận đơn để gửi khách" và "+ Tạo đơn" ở thanh trên — giữ quyết định A2) | việc tiếp theo duy nhất của màn | **tối đa 1** | 44 (52 ở chân dính điện thoại và Đăng nhập) |
| **Phụ** | nền trắng, viền 1px `--c-primary`, chữ primary; biến thể nguy hiểm: viền + chữ `--c-danger` | việc thay thế, huỷ, quay lại | nhiều | 44 |
| **Lối nhỏ** | không nền, không viền, chữ primary 500, gạch chân khi rê | việc phụ, "Xem tất cả", "+ Thêm …" trong khối | nhiều | 44 (vùng chạm), chữ 14–16 |

Mọi nút khai chiều cao ở lớp gốc (hết 21 chỗ vá `min-height`), bo góc **8** duy nhất (viên thuốc 999 chỉ cho chip/tab), chữ 16/500, biểu tượng 20 trước chữ. Ánh xạ 48 kiểu hiện có → 3 cấp ở `SO-LECH-TU-MA.md` mục 1 (cột "Kiểu / lớp"); nút đỏ đặc `.vc-btn-danger` (7 tệp) → về "Chính" tông nguy hiểm **chỉ trong hộp xác nhận**. Thứ bậc chữ: thang 14 bậc giữ; **độ đậm** cần chủ quyết (H-DO-DAM: cả 5 token độ đậm đang bằng 500, nên tiêu đề, nhãn, nút, thân chỉ khác nhau bằng cỡ; đề xuất 400 thân / 500 nhãn-nút / 600 tiêu đề-số lớn, Be Vietnam Pro có sẵn 400–800).

## 7. Token: ba tầng, MỚI và BỎ (mặt 7, 11)

Cấu trúc đề xuất (mượn từ bộ (b), xem mục 8): **gốc** (`--goc-*`: màu thương hiệu chép từ tourdaovn, thang cỡ chữ 14 bậc, khoảng cách 4/8/12/16/24/32/48, bo 8/12/18/999, bóng 3 mức, độ đậm, phông) → **ý nghĩa** (`--c-surface`, `--c-border`, `--c-text`, `--c-primary`, 5 tông trạng thái, `--c-focus`, `--h-control`, `--z-*`, chuyển động) → **thành phần** (`--nut-*`, `--the-*`, `--o-*`, `--huy-hieu-*`, `--bang-truot-*`: chỉ khi thành phần cần giá trị khác ý nghĩa). Tên token giữ tiếng Việt không dấu như mã hiện tại; tên gốc tourdaovn giữ nguyên.

**MỚI** (mỗi dòng kèm lý do; chưa vào mã):

| Token | Giá trị đề xuất | Lý do |
|---|---|---|
| `--t-nhanh`, `--t-vua` | 150 ms, 200 ms | mặt 11: chuyển động ngắn lấy từ token; hiện có 5 token chuyển động nhưng không có thang thời lượng chung |
| `--duong-cong` | `cubic-bezier(.2,.8,.2,1)` | một đường cong cho mọi chuyển động; `prefers-reduced-motion` đặt về 0 |
| `--h-control`, `--h-control-lon` | 44px, 52px | thay 9 token cùng họ (`--tap-min`, `--counter-btn`, `--h-field`, `--h-field-wide`, `--h-hdv-btn`, `--h-hdv-act`, `--search-h`, `--row-h`, `--h-dp-tab`) |
| `--z-dinh`, `--z-tab`, `--z-truot`, `--z-phu`, `--z-tren-cung` | 10, 20, 30, 40, 50 | thay 13 giá trị z-index rời (0…60) và 3 token `--z-*` lẻ |
| `--bo-control` | 8px | một bo góc cho nút và ô; hiện 4 giá trị |
| `--fw-than`, `--fw-nhan`, `--fw-tieu-de` | 400 / 500 / 600 | chỉ nếu chủ chọn mở lại thứ bậc độ đậm (H-DO-DAM) |
| `--w-noi-dung-max` | 1280px | giới hạn bề rộng ở 1440 |
| `--c-mat-mang-bg` | = `--c-sand-bg` | dải "ngoài mạng" chưa có token |
| Biểu tượng trạng thái (5) | SVG trong `web/icons.ts` | mặt 5: không chỉ dựa vào màu |

**BỎ hoặc gộp** (đề xuất; thi công theo expand–contract, giữ bí danh một phát hành):

| Nhóm | Số | Làm gì |
|---|---|---|
| Bí danh trỏ token khác | 92 (ví dụ `--c-bg→--c-surface`, `--c-line→--c-border`, 42 `--fs-<vai>→--fs-step-n`) | giữ 1 tên mỗi ý nghĩa; `--fs-<vai>` chỉ giữ ở tầng thành phần khi thật cần |
| Số đo riêng một màn `--w-*` / `--h-*` | 126 (27 % token), trong đó 201 token toàn bộ chỉ dùng 1 lần | chuyển thành luật bố cục trong CSS của thành phần (lưới cột), không phải token |
| Cỡ chữ rem lệch thang | 3 (`--fs-old-badge` 12,8 / `--fs-old-label` 13,6 / `--fs-old-muted` 14,4) + `--fs-h2` 17,6 | về bậc gần nhất của thang 14 bậc |
| Giá trị trùng ≥ 3 token | 36 giá trị (ví dụ `#ffffff` ← `--c-surface`, `--c-card`, `--c-on-dark`, `--c-status-bar`) | giữ theo ý nghĩa, không theo giá trị: `--c-on-dark` và `--c-status-bar` là ý nghĩa khác nên giữ; `--c-card` gộp vào `--c-surface` |
| Không dùng | 3 (`--fs-stat`, `--lh-28`, `--lh-32`) | bỏ |
| Khung xương `--skel-*` | 14 | thay bằng 3 token (dòng, số, viên) dùng chung cho mọi khung xương |
| Lớp nghi chết | 28 lớp (Góp ý cũ, Hoa hồng trước PR 2…) | kiểm bằng trình duyệt rồi bỏ |

Giữ nguyên giá trị: nhóm tourdaovn (dòng 27–38 `app.css`), 14 bậc cỡ chữ, khoảng cách, bo 8/12/18, bóng, Be Vietnam Pro + ba tông hiển thị (ADR-0087).

## 8. Bảng đối chiếu ba nguồn: mã hiện tại, bộ (a), bộ (b)

Bộ (a) "Tour Đảo Booking Design System" (dựng từ `app.css` tháng 9); bộ (b) "Tour Dao Travel ERP Design System" (SAP Fundamental, token `--td-*`, chỉ dùng ở Sổ công nợ 25/10). Cả hai là **đầu vào**, không phải chuẩn (PROMPT 6.1 điểm 8).

| Trục | Mã hiện tại (`app.css`) | Bộ (a) | Bộ (b) | Quyết định cho v2 |
|---|---|---|---|---|
| Màu thương hiệu | tourdaovn: navy/biển/san hô/cát (dòng 27–38), nền xám-xanh trung tính 1.70 | nền `#eaf2f8`, viền `#d3e1ec` (giá trị cũ, đã lệch mã) | đỏ rượu `#8B1E2D`, xám SAP | **Giữ mã**; bỏ giá trị (a) cũ; bỏ màu (b) (không phải thương hiệu) |
| Phông | Be Vietnam Pro tự lưu + 3 tông (Nunito/Lexend/Noto) | Nunito | Times / serif cho tiêu đề | **Giữ mã** |
| Độ đậm | 5 token = 500 | 400/600/700 | 400/600/700 | **Đổi** (chờ chủ, H-DO-DAM) |
| Thang cỡ chữ | 14 bậc 12→32 | lẻ (17px cơ sở) | 12/14/16/20/24/32 | **Giữ mã** |
| Khoảng cách, bo, bóng | 4…48; 8/12/18/999; 3 bóng | như mã | 4…32; 4/8 | **Giữ mã**, bỏ bo 6 và 4 của Điều phối |
| Cấu trúc token | 1 tầng phẳng + bí danh | 1 tầng | **3 tầng (gốc → ý nghĩa → thành phần)** | **Mượn (b)** |
| Mật độ | một mật độ | — | **chế độ "gọn / thoáng"** cho bảng | **Mượn (b) ở mức đề xuất**: bảng máy tính có hàng 40 (gọn) / 48 (thoáng), chủ chọn ở Giao diện công ty — cần duyệt |
| Trạng thái | màu đúng, hình lệch, không biểu tượng | màu | **huy hiệu có biểu tượng + chữ** | **Mượn (b)** (mục 5) |
| Danh sách–chi tiết máy tính | ngăn phải chỉ ở Sổ công nợ | — | **master–detail** | **Mượn (b)** cho Danh bạ, Hỗ trợ, Quản lý tài khoản |
| Biểu tượng | 37 SVG tự vẽ `web/icons.ts` | Lucide | Lucide | **Giữ mã** (không dependency), vẽ thêm 5 biểu tượng trạng thái |
| Thành phần có tài liệu | không | bundle Button/Chip/Banner/Sheet/Field/Sidebar/TabBar | đủ bộ SAP | **Viết mới theo mục 3**, mỗi thành phần một README + xem trước |
| Chuyển động | 5 token, không thang | — | có | **Thêm** (mục 7) |

## 9. Điều cần chủ quyết hoặc cần ADR (không đưa vào thiết kế mặc định)

1. Mở lại thứ bậc độ đậm chữ (H-DO-DAM) — chạm quyết định "Thị giác 1.70" của chủ.
2. Chế độ mật độ bảng (gọn/thoáng) — thêm một núm ở Giao diện công ty (ADR-0087 mở rộng).
3. Khung tải (H-GOI): tách gói chung bằng esbuild `--splitting`, chỉ nạp sẵn khung + trang đầu theo vai thay vì cả 47 trang, thêm `modulepreload`/Speculation Rules/View Transitions — không đổi kiến trúc nhưng đổi cách phát hành và service worker (ADR-0035) → **cần ADR nhỏ** với số đo trước/sau ở `LO-TRINH.md`.
4. Nhật ký thay đổi trên trang Hướng dẫn (65 màn) — giữ bao nhiêu phiên bản (C-HUONG-DAN).
5. Nút nổi "Trợ lý" (H-FAB): đưa vào thanh trên (đề xuất) hay giữ nổi có đệm — chạm quyết định ADR-0066/0084 về Trợ lý.
6. Ô nhãn nổi của Tạo đơn (quyết định 13/10): đổi về nhãn trên ô cho thống nhất (đề xuất) hay giữ.
7. Cách đếm "thanh bên trần 10 mục" (PROMPT mục 5): Toàn quyền hiện 28 mục khi đếm hết, 14 khi đếm nhóm gập là một.

Bảy điều trên gom thành **câu hỏi gom** ở `LO-TRINH.md` mục 5; ba điều đầu đã lên `BAO-CAO.md`.
