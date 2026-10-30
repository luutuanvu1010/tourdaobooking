# Đề xuất mở rộng: Khả dụng và Giá theo mùa — theo dịch vụ, nhóm dịch vụ và loại đối tác

> Bản phác thảo của người lập kế hoạch, 30/10/2026. **Chưa phải ADR, chưa được duyệt, chưa viết mã.**
> Mở rộng từ `DE-XUAT-TINH-TRANG-BAN-DICH-VU-2026-10-30.md` và đặt trên `KHUNG-CHINH-SACH-CHUNG-2026-10-30.md`.
> Đã đối chiếu mã `main` (bản trong máy) và ADR-0021, ADR-0077, ADR-0136, ADR-0146, ADR-0148, cùng cổng giá `src/modules/orders/price-guards.ts` và cách chọn mức `src/modules/pricing/rules.ts` (`chonMuc`).

## 0. Lời chủ (30/10)

> «quản lý Availability, Seasonal pricing (thường là các ngày nghỉ lớn trong năm với các ngày lễ được nghỉ theo luật lao động) của từng Danh mục dịch vụ và/hoặc dịch vụ cụ thể theo từng vai đối tác (ví dụ như công ty du lịch), và độ khả dụng của từng danh mục hoặc dịch vụ theo thời gian»

## 1. Kết luận

Yêu cầu gồm **bốn khối**, cùng dựa trên một nền là **lịch mùa**:

| Khối | Câu hỏi nó trả lời | Chạm tiền? |
|---|---|:-:|
| **1. Lịch mùa và ngày lễ** | Ngày đi này thuộc mùa nào (Tết, 30/4–1/5, 2/9, Cao điểm hè, Mùa mưa bão…)? | Không |
| **2. Khả dụng** | Dịch vụ này có bán cho bên đặt này, vào ngày đi này, ở thời điểm đặt này không? | Không |
| **3. Giá theo mùa** | Ngày đi này thì giá bán lẻ là bao nhiêu? | **Có** |
| **4. Hoa hồng / giá đại lý theo mùa và theo loại đối tác** | Ngày đi này, loại đối tác này được hưởng bao nhiêu? | **Có** |

Không cần bốn tính năng rời. Bốn khối là **bốn cách dùng của cùng một ngữ pháp quy tắc**: *Áp cho* [dịch vụ / nhóm] · *khi* [loại đối tác, ngày đi ∈ mùa, thời điểm đặt…] · *thì* [chặn bán / cần xác nhận / giá mùa / phụ thu / mức hoa hồng] · *trong* [hiệu lực] · *do* [người, lý do].

**Đề xuất làm theo ba lượt**: khả dụng trước (không chạm tiền), giá mùa sau, hoa hồng mùa cuối. Phần Hòn Tằm (ADR-0146, đã duyệt) vẫn làm ngay, độc lập với cả ba lượt.

## 2. Hiện trạng — những gì đã có và những gì sẽ vướng

| Đang có | Hệ quả khi thêm mùa |
|---|---|
| Giá bán lẻ là **một giá** cho mỗi loại khách (người lớn, trẻ em, người cao tuổi, em bé), lấy từ Google Sheet; Quản trị ghi đè được. **Không có chiều ngày.** | Phải biến giá danh mục thành *giá theo ngày đi* do máy chủ tính |
| Đối tác và Thực tập bắt buộc dùng **đúng giá danh mục** (cổng R2), kiểm ở lập đơn, sửa đơn **và xác nhận** | Cổng R2 phải so với *giá mùa*. Nháp lập trước khi đặt giá mùa sẽ bị chặn lúc xác nhận nếu không có cách cập nhật giá |
| Mỗi đơn có **một ngày đi** cho mọi dịch vụ (ADR-0021) | Thuận lợi: mỗi đơn chỉ thuộc một mùa |
| Hoa hồng có hiệu lực theo **ngày xác nhận**, không theo ngày đi (ADR-0077 điều 8) | Mùa tính theo ngày đi, hiệu lực hợp đồng tính theo ngày xác nhận: **hai trục khác nhau**, phải ghi rõ |
| Mức hoa hồng dạng tiền và "giá đại lý" **ghi kèm giá bán lẻ lúc đặt mức**. Giá bán lẻ của đơn khác giá ghi kèm thì dòng vào "thiếu mức — giá bán lẻ đã đổi", đơn bị giữ (ADR-0148 Đ3) | **Bẫy lớn nhất:** bật giá mùa mà không có mức hoa hồng theo mùa thì **mọi đơn mùa lễ dùng mức tiền / giá đại lý đều bị giữ** |
| ADR-0148 đã **bác** phương án "lưu lịch sử giá bán lẻ theo ngày ngay trong Nền tảng thay cho Sheet" | Giá mùa mở lại đúng câu hỏi này: cần quyết định mới |
| Chặn theo loại đối tác (ADR-0146, chưa xây) và cờ cần xác nhận (ADR-0136, đã có) | Là hai trường hợp đầu của khối Khả dụng |

## 3. Khối 1 — Lịch mùa và ngày lễ

### 3.1 Hai lớp

- **Ngày lễ theo luật.** Bộ luật Lao động 2019 Điều 112 có 11 ngày: Tết Dương lịch 1, Tết Nguyên đán 5, Giỗ Tổ Hùng Vương 1 (10/3 âm lịch), 30/4, 1/5, Quốc khánh 2 ngày. Ngày Văn hóa Việt Nam 24/11 được nghỉ hưởng lương theo Nghị quyết 28/2026/QH16 (hiệu lực 1/7/2026) và đang được đưa vào dự thảo sửa Bộ luật. Mỗi năm Nhà nước công bố lịch cụ thể, có **nghỉ bù và hoán đổi ngày làm việc**.
- **Mùa kinh doanh** do công ty tự đặt: Cao điểm hè, Mùa mưa bão Nha Trang, Lễ hội, sự kiện riêng của nhà cung cấp…

### 3.2 Vì sao lịch phải là dữ liệu, không phải mã

- Tết, Giỗ Tổ theo âm lịch; lịch nghỉ thực tế đổi hằng năm theo thông báo của Nhà nước; danh sách ngày lễ vừa đổi trong năm 2026.
- Viết cứng trong mã thì mỗi năm phải sửa và phát hành lại.

### 3.3 Mô hình

- **Mùa** gồm: tên (ví dụ "Tết Nguyên đán"), loại (Lễ theo luật / Mùa kinh doanh), **độ ưu tiên**, nhiều **khoảng ngày theo từng năm** (Tết 2027: …–…).
- Nền tảng **gợi ý sẵn** ngày chính lễ của năm sau, tính cả âm lịch. Quản trị chỉnh theo thông báo chính thức rồi bấm xác nhận. Chưa xác nhận thì mùa đó chưa có hiệu lực.
- Hai mùa chồng nhau: mùa có ưu tiên cao hơn thắng (ví dụ Tết thắng Cao điểm). Cùng ưu tiên thì không được chồng (máy chặn lúc nhập).
- Chỉ thêm dòng. Sửa một khoảng ngày đã có đơn chụp giá thì không làm thay đổi đơn đó.
- Chỗ ở: một phân hệ nhỏ dùng chung (lõi K10/K11), công bố qua cổng chung. Cần ADR vì là phân hệ mới.

## 4. Khối 2 — Khả dụng

| Điều kiện ("khi") | Ví dụ |
|---|---|
| Loại đối tác của bên đặt | Hòn Tằm không gồm đưa đón: không bán cho Lễ tân, Tài xế taxi (ADR-0146) |
| Ngày đi ∈ khoảng ngày | Vinwonders buffet hết 01–03/11 |
| Ngày đi ∈ mùa | Tết: không bán vé X cho Công ty du lịch |
| Thời điểm đặt | Hết nhận đặt sau 5 giờ nữa |
| Thứ trong tuần của ngày đi | Tour Y chỉ chạy thứ Ba, thứ Năm |
| Đặt trước tối thiểu | Phải đặt trước 24 giờ |

| Hiệu ứng ("thì") | Ghi chú |
|---|---|
| **Chặn bán** | Như đề xuất Đóng bán; cổng 409 ở mọi đường ghi |
| **Cần xác nhận** | Mở rộng cờ ADR-0136: có thể chỉ cần xác nhận *trong mùa lễ* |

- **Khung bán của dịch vụ** (ví dụ chỉ bán từ 01/05 đến 31/08) là tính chất của dịch vụ, áp cho mọi bên đặt. Được phép viết dạng "chỉ bán trong…", vì không cấp quyền cho vai nào.
- **Theo loại đối tác chỉ được chặn**, không bao giờ "mở thêm" (giữ ADR-0005, ADR-0146).

## 5. Khối 3 — Giá theo mùa (chạm tiền)

### 5.1 Mô hình

Bảng giá mùa: **dịch vụ hoặc nhóm × mùa**, mỗi dòng chọn một trong hai kiểu:

- **Giá mới**: bốn số cho người lớn, trẻ em, người cao tuổi, em bé. Chỉ dùng cho phạm vi một dịch vụ.
- **Phụ thu**: phần trăm trên giá thường, hoặc số tiền mỗi khách theo loại. Dùng được cho cả nhóm.

### 5.2 Luật

- Mùa xác định theo **ngày đi** của đơn.
- Phạm vi cụ thể hơn thắng (dịch vụ > nhóm). Mùa ưu tiên cao hơn thắng. Hai dòng cùng bậc mâu thuẫn thì **không lập được đơn**, kèm câu "giá mùa chưa rõ"; không tự đoán.
- Giá tính ở **máy chủ**. Form lập đơn hiện giá mùa ngay sau khi chọn ngày khởi hành (ngày đã là ô đầu tiên của bước 1).
- Cổng R2 của Đối tác so với giá mùa.
- Giá chụp vào đơn như hiện nay. Đơn đã xác nhận không đổi giá khi bảng giá mùa đổi.

### 5.3 Theo loại đối tác

Đề xuất **không làm bảng giá bán lẻ riêng cho từng loại đối tác**. Giữ nguyên tắc chủ chốt ngày 26/09: đối tác bán đúng giá công bố, phần của đối tác là hoa hồng. "Giá theo vai đối tác" vì thế nằm ở khối 4.

## 6. Khối 4 — Hoa hồng và giá đại lý theo mùa (chạm tiền)

- Thêm điều kiện **mùa** vào dòng mức hoa hồng. Ví dụ: Tết, Công ty du lịch, vé Vinwonders được 5 % thay vì 10 %.
- Mức **phần trăm** tự đi theo giá mùa, không cần dòng mới.
- Mức **tiền mỗi khách / giá đại lý** phải có dòng theo mùa. Nếu không, ADR-0148 Đ3 sẽ giữ đơn với lý do "giá bán lẻ đã đổi". Đề xuất: so với *giá thường* khi dòng không gắn mùa; so với *giá mùa* khi dòng gắn mùa. Thiếu dòng mùa cho mức tiền thì Nền tảng **cảnh báo ngay lúc đặt giá mùa**, không đợi tới khi đơn bị giữ.
- Hai trục giữ nguyên: hợp đồng (hiệu lực) theo ngày xác nhận, **mùa theo ngày đi**.

## 7. Lộ trình

| Lượt | Nội dung | Chạm | Ghi chú |
|---|---|---|---|
| Ngay | Thi công ADR-0146 (Hòn Tằm) | quyền, dữ liệu | Đã duyệt, chờ lệnh |
| 1 | Khung quy tắc + Lịch mùa + Khả dụng (đóng bán, theo mùa, thứ trong tuần, đặt trước tối thiểu) | dữ liệu, quyền | Có thể vượt trần 3 quyết định: hoặc tách lịch mùa thành lượt riêng, hoặc chủ cho vượt có ghi lý do |
| 2 | Giá theo mùa + cổng R2 theo giá mùa + nơi lưu giá mùa | **tiền** | Bộ ca mẫu Kế toán xác nhận trước khi bật (Hiến chương 5.17) |
| 3 | Hoa hồng / giá đại lý theo mùa, cảnh báo thiếu dòng mùa | **tiền** | Phải xong **trước** mùa lễ đầu tiên có giá mùa, nếu không đơn bị giữ hàng loạt |

Thứ tự bắt buộc: **lượt 3 phải bật cùng hoặc trước khi giá mùa có hiệu lực cho một mùa thật**.

## 8. Câu hỏi cho chủ (gom một lượt; trả lời «theo khuyến nghị» là đủ)

### Lịch

| # | Câu | Khuyến nghị |
|---|---|---|
| L1 | Ngoài ngày lễ theo luật, có cần mùa công ty tự đặt (Cao điểm hè, Mùa mưa bão…)? | Có |
| L2 | Ngày lễ tính theo lịch nghỉ Nhà nước công bố hằng năm (kể cả nghỉ bù, hoán đổi) hay chỉ ngày chính lễ? | Theo lịch công bố; Nền tảng gợi ý trước, Quản trị xác nhận |
| L3 | Ai quản lịch mùa? | Quản trị, Toàn quyền |

### Khả dụng

| # | Câu | Khuyến nghị |
|---|---|---|
| K1 | Ngoài đóng theo ngày, cần thêm: thứ trong tuần, đặt trước tối thiểu, khung bán theo mùa? | Cả ba ở lượt 1; số khách tối thiểu/tối đa để sau |
| K2 | Bảy câu B1–B7 của phiếu chốt trước (ai mở lại, có bán vượt không…) | Giữ khuyến nghị đã nêu |

### Giá mùa

| # | Câu | Khuyến nghị |
|---|---|---|
| G1 | Giá mùa nhập ở đâu: Google Sheet (thêm cột/tab theo mùa) hay ngay trên Nền tảng? | Trên Nền tảng; Sheet giữ giá thường như hiện nay |
| G2 | Kiểu giá mùa | Cả hai: giá mới (theo dịch vụ) và phụ thu % / số tiền mỗi khách (theo nhóm) |
| G3 | Mùa xác định theo ngày đi hay ngày đặt? | Ngày đi |
| G4 | Đơn đã xác nhận, đổi ngày sang mùa khác | Giữ giá cũ, báo người đổi |
| G5 | Biên nhận gửi khách: phụ thu lễ là dòng riêng hay gộp vào đơn giá? | Dòng riêng "Phụ thu lễ Tết", minh bạch với khách |
| G6 | Ai đặt giá mùa? | Kế toán, Quản trị, Toàn quyền (như mức hoa hồng) |

### Theo loại đối tác

| # | Câu | Khuyến nghị |
|---|---|---|
| H1 | Công ty du lịch có giá bán lẻ riêng, hay chỉ hoa hồng khác? | Chỉ hoa hồng khác; giữ nguyên tắc "bán đúng giá công bố" |
| H2 | Hoa hồng mùa lễ mặc định thế nào? | Phần trăm giữ nguyên (tự theo giá mùa); mức tiền bắt buộc có dòng theo mùa |

## 9. Điều chưa kiểm

- Chưa đọc dữ liệu thật: hiện có bao nhiêu mức hoa hồng dạng tiền / giá đại lý (số dòng sẽ phải thêm bản theo mùa).
- Chưa kiểm cổng R2 cụ thể ở bước xác nhận có đọc lại giá danh mục hiện hành hay giá đã lưu. Chú thích trong mã nói "xác nhận không kiểm lại giá"; cần đọc kỹ khi lập kế hoạch lượt 2.
- Tên bảng, tên phân hệ, tên thao tác quyền đều là tên tạm.
- Danh sách ngày lễ năm 2027 phải theo thông báo chính thức. Dự thảo sửa Bộ luật Lao động chưa thông qua; mô hình dữ liệu không phụ thuộc vào kết quả đó.
