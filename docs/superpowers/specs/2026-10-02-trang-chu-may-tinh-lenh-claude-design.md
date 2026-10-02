# Trang chủ máy tính — lệnh cho Claude Design

- **Ngày:** 2026-10-02.
- **Việc:** thiết kế lại Trang chủ (`/`) ở **khổ máy tính** (≥ 641px — có thanh bên), cùng ngôn ngữ với Trang chủ điện thoại bản 1.66 (đã lên production 2/10, bản vẽ "Trang chu dien thoai.dc.html" 1a–1g).
- **Cách dùng:** chủ mở **cùng dự án Claude Design** đã vẽ "Trang chu dien thoai.dc.html" (dự án có sẵn hệ thống thiết kế Tour Đảo Booking và nối kho GitHub `luutuanvu1010/tourdaobooking`), dán nguyên phần **LỆNH** dưới đây, đính kèm 10 ảnh ở `docs/design/2026-10-02-trang-chu-may-tinh/tham-chieu/` (bảng ở cuối tệp). Vẽ xong gửi link; phiên thi công làm đúng bản vẽ (tiền lệ Đăng nhập 1.7, Trang chủ điện thoại 1.66).
- **Bản phác thảo của AI** (chủ xem 2/10, đồng ý giữ ý tưởng): Artifact https://claude.ai/artifact/T5YjBhtZngfaEf4TG1yBRA — riêng tư, Claude Design không mở được ⇒ ảnh 08–10 là bản chụp của nó.
- **Chủ đã chốt (2/10):**
  1. Giữ ý tưởng của bản phác thảo: dải chào, hàng ô **"Lối tắt"** theo quyền (giữ dù thanh bên đã có đủ mục — số nhắc hiện ngay giữa trang), thẻ số liệu 4 ô, Chuyến đón 3 ngày, Cần xem lại.
  2. Dải chào **theo màu thanh trên** (câu 2-B, 2/10 — thanh trên máy tính nền trắng ⇒ dải chào nền sáng).
  3. Để Claude Design **vẽ lại**, ưu tiên **sáng tạo trong khuôn phép**, hướng tới cảm giác **tinh tế · tin tưởng · năng động của du lịch**.
  - Từ trước (1/10): **chữ thường, nét mảnh** (nội dung 400, nhấn tối đa 500, 600 chỉ cho con số lớn nhất; bỏ 700/800; không viết HOA toàn bộ).
  - ADR-0087 (accepted 2/10): Toàn quyền tự chỉnh màu thanh, nút chính, mục đang chọn, phông, cỡ chữ, độ đậm ⇒ màn mới phải đi qua **token theo vai**.
- **Giả định (đảo ngược được):** ô tìm đơn giữ trên thanh trên (máy tính đã có — không lặp trong dải chào); tối đa 8 chỗ ở hàng Lối tắt (cùng luật điện thoại: hơn 8 chức năng ⇒ 7 ô + "Tất cả"); dải "Không tải được số liệu… Thử lại" hiện cả ở máy tính.
- **Ngoài phạm vi:** điện thoại (đã xong 1.66); thanh bên và thanh trên chung (dùng ở mọi trang — giữ mục, thứ tự, vị trí); Trang chủ riêng của Hướng dẫn viên / Đối tác (`docs/BACKLOG.md` mục 18, đợt sau); mọi số liệu mới cần máy chủ.

---

## LỆNH (dán vào Claude Design)

Thiết kế lại màn **Trang chủ** của app nội bộ **Island Booking System** (Công ty TNHH Tour Đảo, Nha Trang) **cho máy tính**, rộng chính **1280px**, kèm 1440px và cửa sổ hẹp 768px. Dự án này đã có bản **"Trang chu dien thoai.dc.html"** (1a–1g) — Trang chủ điện thoại đã chạy thật từ bản 1.66. Bản máy tính phải là **cùng một gia đình** với bản đó: cùng hệ thống thiết kế, cùng cách dựng ô lối tắt, thẻ số liệu, thẻ Chuyến đón, thẻ Cần xem lại — nhưng tận dụng bề ngang màn lớn, không phải điện thoại phóng to. Toàn bộ chữ tiếng Việt có dấu. Đính kèm 10 ảnh tham chiếu (xem cuối lệnh).

### 1. Ai dùng, cần gì đầu tiên
Nhân viên văn phòng mở máy tính đầu ca: **Bán hàng** (lập và theo dõi đơn tour), **Kế toán** (xem đơn, tiền — không lập đơn), **Quản trị** và **Toàn quyền** (thêm danh mục, tài khoản, vận chuyển). Câu hỏi đầu tiên mỗi sáng: *hôm nay có chuyến đón nào, mấy giờ, khách nào còn thiếu tiền, có đơn nào chờ xác nhận / chưa ai phụ trách, có gì cần xem lại*. Trang chủ trả lời các câu đó trong một cái nhìn, rồi đưa họ tới đúng chỗ bằng một cú bấm.

### 2. Tinh thần thiết kế — sáng tạo trong khuôn phép
Ba cảm giác phải đọc được ngay, **bằng bố cục, khoảng trắng, chữ và màu — không bằng trang trí**:
- **Tinh tế:** tiết chế. Nhiều khoảng trắng, nền sáng phân tầng nhẹ, đường kẻ mảnh, bóng rất mềm, **một** màu nhấn ấm dùng có chủ đích. Phân cấp bằng cỡ chữ, màu chữ chính / phụ và khoảng cách — không bằng chữ đậm.
- **Tin tưởng:** con số rõ ràng, thẳng hàng (chữ số đều nhau — `font-variant-numeric: tabular-nums` cho tiền, giờ, số đếm), đơn vị "₫" luôn dính số. Trạng thái nói thật: đang tải là khung xương, lỗi nói rõ và có "Thử lại", không con số giả, không màu báo động khi không có việc gì. Mỗi màu luôn mang đúng một nghĩa (mục 3.5).
- **Năng động của du lịch:** cảm giác biển, buổi sáng, chuyến đi đang diễn ra — gợi bằng **nhịp và chuyển động nhẹ**: chuyến đón sắp tới nổi bật hơn chuyến đã qua; một dòng thời gian / dải giờ trong ngày nếu giúp đọc nhanh; hiệu ứng rê chuột nhấc nhẹ, chuyển ngày mượt. Được dùng **một** hoạ tiết hình học rất nhẹ gợi đường chân trời / con sóng (nét mảnh, màu nhạt) ở dải chào. **Không** ảnh chụp, hình minh hoạ người, biểu tượng cảm xúc (emoji), logo hay màu thương hiệu của app khác.

### 3. KHUÔN PHÉP (bắt buộc)
1. **Hệ thống thiết kế của dự án** (Tour Đảo Booking) — không tự thêm màu. Màu: xanh biển `#0c4a6e`, xanh đậm `#082f49`, xanh nhạt `#dcebf6`; san hô `#c0392b` / nền `#fef2f0` — **chỉ** cho hành động chốt ("Tạo đơn") và nhãn giá; cát `#f5a623` / nền `#fbe3b3` / chữ `#5a4109` — nhắc nhở; nguy hiểm `#b01235` / nền `#fde9ee` — lỗi, tiền còn thiếu; xanh lá nền `#dcfce7` / chữ `#166534` — đã xác nhận, đủ tiền. Nền trang `#eaf2f8`, thẻ `#ffffff`, viền `#d3e1ec`, chữ `#0f172a`, chữ phụ `#475569`. Chỉ giao diện sáng.
2. **Màu theo vai (ADR-0087 — Toàn quyền sẽ tự đổi được):** nền và chữ của **dải chào lấy đúng màu thanh trên** (`--c-bar-bg` / `--c-on-bar`; hôm nay thanh trên máy tính nền trắng ⇒ dải chào nền sáng, chữ xanh biển); nút chính, mục đang chọn, viên thuốc ngày đang chọn đi qua token vai. Bản vẽ phải **đẹp ở cả hai tông thanh bên**: hiện tại (khối xanh đậm `#082f49`, chữ trắng mờ — ảnh 01, 02) và **"thanh sáng"** sắp lên (thanh bên nền trắng, mục đang chọn nền xanh nhạt — ảnh 07). Ghi rõ token vai nào dùng ở đâu.
3. **Chữ:** Be Vietnam Pro. **Chữ thường, nét mảnh:** nội dung và nhãn 400; tiêu đề, tên, số tiền, giờ đón, nút tối đa 500; 600 chỉ cho con số lớn nhất màn; không 700/800. Trong **vùng nội dung Trang chủ** không viết HOA toàn bộ (kể cả tiêu đề nhóm trong hộp "Tất cả", nhãn, huy hiệu, nút) — bản điện thoại 1.66 (ảnh 05) còn viết HOA tiêu đề nhóm, sẽ sửa theo bản máy tính. Tiêu đề nhóm của **thanh bên** ("BÁN HÀNG", "QUẢN TRỊ", "TÔI") giữ như ảnh 01–02 — thanh bên dùng chung mọi trang, ngoài phạm vi màn này. Cỡ chữ chỉ dùng 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32px; nội dung 16, nhãn 14, huy hiệu 12, ô gõ 16; không chữ dưới 12px.
4. Khoảng cách 4, 8, 12, 16, 24, 32, 48px. Bo góc 8, 12, 18px, viên thuốc 999px; ô vuông biểu tượng 14px. Bóng thẻ `0 1px 3px rgba(15,23,42,.08)`. Vùng bấm ≥ 44×44px. Tương phản chữ ≥ 4,5:1 (chữ ≥ 24px: ≥ 3:1) — chữ mảnh cần màu đủ tối; ghi tỉ lệ cạnh các cặp màu mới.
5. **Nghĩa màu cố định** (cùng bản điện thoại): san hô = hành động chốt; cát = nhắc nhở (giấy tờ sắp hết hạn, danh mục lệch Sheet); đỏ = lỗi / tiền còn thiếu; xanh lá = đủ tiền / đã xác nhận; xanh biển = điều hướng, số trung tính. Không dựa vào màu một mình — luôn có chữ hoặc biểu tượng đi kèm.
6. **Biểu tượng:** bộ nét mảnh 24×24 nét 1.8 đang dùng trong dự án (bản điện thoại): home, orders, plus, contact-card, swap, truck, clock, services, staff, lock, pin, guests, history, megaphone, chat, help, doc-check, checkCircle, filePlus, money, chart, assign, bell, search, grid, next, close, alert, handset. Biểu tượng mới (nếu cần) cùng khuôn.
7. **Giữ nguyên:** thanh bên trái (rộng 236px — mục, nhóm, tiêu đề nhóm viết HOA, thứ tự, huy hiệu như ảnh 01, 02) và thanh trên (cao 60px: chữ "Trang chủ", ô tìm "Tìm mã đơn, tên khách, SĐT…", chuông có số đỏ, nút san hô "Tạo đơn" cho người lập được đơn). Chỉ vùng nội dung bên phải là phần thiết kế lại. Nội dung rộng tối đa 1200px, bám mép trái sau thanh bên.
8. **Không thêm số liệu mới** — chỉ dùng dữ liệu ở mục 5. Không thêm nút / chức năng ngoài danh sách. Chữ tiếng Việt dài ("Giấy tờ sắp hết hạn", "Loại giấy tờ cá nhân", tên khách dài, nơi đón dài) phải xuống dòng đẹp, không cắt dấu.

### 4. Bố cục — giữ ý tưởng của bản phác thảo (ảnh 08–10), được tổ chức lại
Các khối bắt buộc có (thứ tự đọc từ trên xuống / trái sang): 
1. **Dải chào:** ảnh đại diện chữ cái đầu, "Xin chào," + tên, ngày ("Thứ Sáu, 02/10") + số chuyến đón hôm nay; viên thuốc cát "Đang ở chế độ bảo trì" khi bật (bấm → trang Tôi).
2. **Lối tắt:** ô vuông bo góc nền xanh nhạt, biểu tượng xanh biển, nhãn tối đa 2 dòng; "Tạo đơn" là ô duy nhất nền san hô nhạt. Tối đa **8 chỗ**; hơn 8 chức năng thì chỗ thứ 8 là **"Tất cả"** mở **hộp giữa màn** liệt kê đủ theo 4 nhóm: Bán hàng · Quản lý · Vận chuyển · Của tôi. Huy hiệu số / chấm như bản điện thoại.
3. **Số liệu (một thẻ, 4 ô):** Còn thiếu tiền · Doanh thu của tôi (kèm biểu đồ cột 7 ngày T2…CN — ngày đã qua và hôm nay đậm, ngày chưa tới nhạt) · Chờ xác nhận · Chưa phụ trách. Bấm một ô → danh sách Đơn hàng.
4. **Chuyến đón:** huy hiệu số, "Xem tất cả ›", ba nút ngày **Hôm nay · Ngày mai · Ngày kia** (kèm số), các dòng: giờ đón, nơi đón, tên khách · số khách ("2NL 1TE"), SĐT (bấm để gọi), tên dịch vụ ("+1 dịch vụ" khi nhiều), bên phải số tiền **còn lại** (đỏ) hoặc viên thuốc **"Đủ tiền"** (xanh lá). Trống: "Không có chuyến nào hôm nay."
5. **Cần xem lại** (chỉ Quản trị / Toàn quyền; ẩn hẳn khi không có gì): mỗi dòng ô biểu tượng màu theo loại + tiêu đề + dòng phụ + "›". Quản trị: "Sheet đã đổi giá TD101 — 1.200.000 ₫ → 1.350.000 ₫ · giá ghi đè vẫn đang bán". Toàn quyền thêm: "3 góp ý mới chưa trả lời — YC-0014 báo lỗi · YC-0013 góp ý · YC-0012 báo lỗi".

**Được sáng tạo:** tỉ lệ và cách xếp (một cột hay hai cột, khối nào đứng cạnh khối nào ở 1280 / 1440), cách gộp dải chào với số liệu hay lối tắt nếu đọc nhanh hơn, cách thể hiện "chuyến sắp tới", dòng thời gian trong ngày, biểu đồ, khung xương, trạng thái rê chuột / tiêu điểm, hoạ tiết nhẹ ở dải chào, lời chào theo buổi ("Chào buổi sáng,") nếu hay hơn. Giải thích ngắn mỗi lựa chọn lớn.

### 5. Dữ liệu có sẵn (chỉ dùng những thứ này)
- Người xem: họ tên, chữ cái đầu, vai; số tin chưa đọc (chuông); ngày hôm nay; chế độ bảo trì bật / tắt.
- Huy hiệu lối tắt: Đơn hàng = số đơn chờ xác nhận (xanh biển); Dịch vụ & giá = số dịch vụ lệch Sheet (cát); Giấy tờ sắp hết hạn = số giấy tờ (cát); Góp ý / Báo lỗi = số mới (san hô); Trợ giúp = chấm "có bản mới".
- Còn thiếu tiền: tổng, số đơn, ngày đón sớm nhất. Doanh thu của tôi tuần này: tổng, số đơn đã xác nhận, 7 ngày. Chờ xác nhận: số. Chưa phụ trách: số.
- Chuyến đón (3 ngày): giờ đón, nơi đón, tên khách, số khách theo loại (NL người lớn, TE trẻ em, NCT người cao tuổi, EB em bé), SĐT, tên dịch vụ đầu + số dịch vụ còn lại, số tiền còn lại.
- Ô lối tắt theo vai (thứ tự ưu tiên, đúng quyền thật):

| Vai | Ô hiện trên hàng Lối tắt | Trong hộp "Tất cả" |
|---|---|---|
| Bán hàng | Tạo đơn, Đơn hàng, Danh bạ, Điều phối xe, Góp ý / Báo lỗi, Trợ giúp (6 — không có "Tất cả") | — |
| Kế toán | Đơn hàng, Danh bạ, Điều phối xe, Góp ý / Báo lỗi, Trợ giúp (5) | — |
| Quản trị | Tạo đơn, Đơn hàng, Danh bạ, Điều phối xe, Xe, Giấy tờ sắp hết hạn, Dịch vụ & giá, **Tất cả** | Bán hàng: Tạo đơn, Đơn hàng, Danh bạ · Quản lý: Dịch vụ & giá, Quản lý tài khoản, Địa điểm, Loại giấy tờ cá nhân · Vận chuyển: Điều phối xe, Xe, Giấy tờ sắp hết hạn, Loại giấy tờ xe, Lý do điều phối · Của tôi: Góp ý / Báo lỗi, Trợ giúp |
| Toàn quyền | như Quản trị | như Quản trị, thêm Phiên đăng nhập, Nhật ký, Gửi thông báo, Trợ lý Hỗ trợ (Quản lý) và Chính sách điều phối (Vận chuyển) |

Dữ liệu mẫu: dùng đúng tên khách, giờ, nơi đón, số tiền của bản điện thoại trong dự án (Trần Văn Bình 06:30 Mường Thanh Luxury 1.200.000 ₫…); trên máy tính tiền viết đủ ("1.200.000 ₫").

### 6. Cần vẽ (mỗi bản một khung, rộng 1280 trừ khi ghi khác)
1. **Bán hàng** — 6 ô, không "Cần xem lại", 4 chuyến hôm nay.
2. **Quản trị** — 7 ô + "Tất cả", có "Cần xem lại" (1 dòng).
3. **Quản trị — hộp "Tất cả chức năng"** đang mở (giữa màn, nền mờ phía sau, ✕ đóng).
4. **Kế toán** — không có "Tạo đơn" (cả nút trên thanh trên lẫn ô).
5. **Toàn quyền** — "Cần xem lại" 2 dòng.
6. **Đang tải** — dải chào và lối tắt hiện ngay; số liệu và Chuyến đón là khung xương.
7. **Lỗi tải số liệu** — dải báo lỗi đỏ nhạt có "Thử lại"; ô Còn thiếu hiện "—" "Chưa tải được số".
8. **Đang bảo trì** (Toàn quyền) — viên thuốc cát ở dải chào.
9. **Ngày trống** — đang xem "Ngày kia (0)".
10. **Bán hàng và Quản trị ở tông "thanh sáng"** (thanh bên trắng — ảnh 07).
11. **Rộng 1440** (Quản trị) và **cửa sổ hẹp 768** (Bán hàng — vẫn có thanh bên, nội dung còn ~530px, không có ô tìm trên thanh trên).
12. **Bảng trạng thái thành phần:** ô lối tắt (thường / rê chuột / tiêu điểm / có huy hiệu / có chấm), viên thuốc ngày (chọn / không), dòng chuyến (rê chuột), nút "Thử lại".

### 7. Bàn giao kèm bản vẽ
- Đặt tên tệp **"Trang chu may tinh.dc.html"** trong cùng dự án; bản đồ màn → tệp kho: `web/home.ts`, `public/index.html`, `public/app.css`, `src/shared/trang-chu-o.ts`, `web/shell.ts`.
- Bảng **mọi giá trị mới** (kích thước, khoảng cách, màu nếu có) → tên token đề xuất; token vai dùng ở đâu.
- Danh sách **khác bản phác thảo** (ảnh 08–10) và lý do.
- Ghi chú cho người thi công: khối nào giống hệt bản điện thoại, khối nào chỉ có ở máy tính.

### Tham chiếu đính kèm
| Ảnh | Nội dung |
|---|---|
| 01 `01-may-tinh-hien-tai-ban-hang-1280.png` | Trang chủ máy tính đang chạy (bản 1.66), Bán hàng — thanh bên xanh đậm, thanh trên trắng |
| 02 `02-may-tinh-hien-tai-toan-quyen-1280.png` | Như trên, Toàn quyền — đủ mục thanh bên, "Cần xem lại" |
| 03 `03-dien-thoai-1-66-ban-hang.png` | Trang chủ điện thoại đang chạy (1.66), Bán hàng — ngôn ngữ thiết kế cần giữ |
| 04 `04-dien-thoai-1-66-quan-tri.png` | Điện thoại 1.66, Quản trị — 7 ô + "Tất cả", "Cần xem lại" |
| 05 `05-dien-thoai-1-66-tat-ca.png` | Điện thoại 1.66 — bảng trượt "Tất cả chức năng" |
| 06 `06-dien-thoai-khi-thanh-sang.png` | Điện thoại khi bản "thanh sáng" lên — dải chào theo thanh trên (trắng), chữ mảnh |
| 07 `07-may-tinh-khi-thanh-sang-1280.png` | Máy tính khi bản "thanh sáng" lên — thanh bên trắng (Trang chủ máy tính còn bố cục cũ) |
| 08 `08-phac-thao-ban-hang-1280.png` | Bản phác thảo của AI (chủ đồng ý giữ ý tưởng) — Bán hàng |
| 09 `09-phac-thao-quan-tri-1280.png` | Bản phác thảo — Quản trị |
| 10 `10-phac-thao-tat-ca-1280.png` | Bản phác thảo — hộp "Tất cả chức năng" |

Ảnh 01–07 chụp từ app thật trên dữ liệu thử (tên "Sales Một", "Quản Trị", "Chủ Thử" là tài khoản thử); ảnh 08–10 dùng dữ liệu mẫu. Ảnh chụp cả trang nên thanh tab / nút "Hỗ trợ" của điện thoại có thể nằm giữa ảnh — trên máy thật chúng ở đáy màn hình.
