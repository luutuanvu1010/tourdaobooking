# Trả lời gợi ý cho tệp câu hỏi Vận chuyển Đợt 3–7 (2/10)

Tệp gốc: `docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md`. Tôi đọc kho ở `main` (fc268abe) và nhánh Đợt 4 `worktree-agent-a76ababaa4a5b3183` @ 8094df2b. Tôi chỉ đọc, không sửa tệp nào.

Cách đọc: 🔒 = phải chốt trước khi tạo bảng dữ liệu. 💰 = câu về tiền: AI không chọn thay, chỉ nêu những điểm anh phải chốt.

Bối cảnh tôi dùng để soi các khuyến nghị: 5 xe (2 xe 16 chỗ, 3 xe 4–7 chỗ); cao điểm thì thuê xe theo chuyến; sắp có taxi đối tác chia doanh thu; sau này có thể lên hợp tác xã vài chục – vài trăm xe, vừa giao chuyến vừa cho tài xế tự nhận.

---

## ⚠ Phát hiện quan trọng nhất (liên quan 0.2, 5.2b, Đợt 6)

**Taxi đối tác sẽ bị chặn xuất bến nếu không có giá theo chuyến.**
- Kế hoạch Đợt 6 khai mỗi taxi là "một nhà xe một xe một tài xế" (`docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-06-tai-xe-doi-tac.md:20`).
- Theo ADR-0057 C1, chuyến của xe có chủ đang là nhà xe và không phải công ty chủ thì là **chuyến xe thuê** (`rented = 1`) (`docs/adr/ADR-0057-van-chuyen-tien-xe-thue.md:117`).
- Chuyến xe thuê thiếu giá thì không được xuất bến, và "không ngoại lệ, không phá lệ" (ADR-0052:133).

**Ví dụ:** văn phòng xếp taxi anh Hùng đón khách sân bay. Bảng giá thuê không có dòng cho taxi đó, cũng không ai nhập giá thoả thuận. Chuyến bị giữ "Chuyến xe thuê chưa có giá" và không xuất bến được.

**Nếu taxi ăn chia theo %:** hôm nay hệ thống chưa có chỗ ghi điều đó. ADR chia doanh thu (câu 0.2) phải nói rõ chuyến taxi đi qua cổng giá này thế nào. Việc này cần xong **trước khi Đợt 6 phát hành**, không phải sau.

---

## Câu chung

### 0.1 🔒 Toạ độ điểm đón/trả = bảng phụ có kiểu (cách A)
- **Lời thường:** lưu vĩ độ, kinh độ của "Sân bay Cam Ranh", "Bến Cầu Đá" vào một bảng nhỏ đi kèm danh mục địa điểm. Mỗi ô có kiểu rõ ràng, không bắt buộc nhập. Cách này không dùng "trường linh động".
- **Căn cứ:**
  - Hiến chương 5.2 "**Không** dùng cơ chế 'trường mở rộng tự do' (flexfield/JSON không lược đồ) cho dữ liệu nghiệp vụ" (`docs/ARCHITECTURE.md:93`).
  - Lộ trình ghi "bảng chỉ thêm, vĩ độ −90…90 / kinh độ −180…180 `CHECK`, nguồn, không bắt buộc" (`…-00-lo-trinh.md:27`, `:155`).
  - Anh đã giữ luật này ở ADR-0060 ("không dùng 'trường mở rộng tự do' — Hiến chương 5.2", `docs/adr/ADR-0060-dau-nhap-phan-mem-ke-toan.md:3`).
- **Hợp bối cảnh?** Có, và hợp hơn cả cho giai đoạn hợp tác xã.
  - Khi tài xế tự nhận chuyến, máy cần biết xe nào gần điểm đón.
  - Hôm nay ADR ghi "máy không biết đường đi (G-05)" (`ADR-0052:75`). Bảng toạ độ có kiểu là nền để làm việc đó sau này.
  - Thêm bảng phụ không đụng bảng lõi.
- **Đề xuất:** Đồng ý A. Cần soạn một ADR nhỏ trước khi tạo bảng.
- **Nếu chọn khác:**
  - B (sửa Hiến chương): mở cửa cho flexfield ở mọi nơi, đảo luật anh đã giữ.
  - C (chưa làm): không hại gì, nhưng mốc hợp tác xã đến thì phải làm gấp.
- **Có phải cửa một chiều?** Có (🔒): tên bảng và kiểu cột chốt lúc tạo bảng.

### 0.2 💰 Chia doanh thu với taxi đối tác. Chỉ nêu điểm cần chốt, không chọn thay
- **Lời thường:** khách của Tour Đảo đi taxi đối tác. Tài xế taxi được bao nhiêu, ai thu tiền khách, bao giờ trả cho tài xế.
- **Ví dụ:** chặng đón sân bay bán 300.000 ₫. Taxi chở rồi được 70%, tức 210.000 ₫, nhưng 70% tính trên giá bán hay trên phần còn lại sau phí?
- **Căn cứ:**
  - Lộ trình mục 4 nêu (a)–(d) (`…-00-lo-trinh.md:157`).
  - Đợt 6 "không thêm số tiền nào cho tài xế đối tác" (`…-06-tai-xe-doi-tac.md:20`).
- **Điểm anh phải chốt** (đã có trong tệp, tôi giữ):
  - (a) % tính trên giá bán chặng hay sau phí;
  - (b) ai thu tiền khách (Tour Đảo thu rồi trả taxi, hay taxi thu tiền mặt rồi nộp lại);
  - (c) trả theo chuyến hay theo kỳ (nối sổ công nợ, khoá kỳ ADR-0080);
  - (d) hợp đồng, hoá đơn, thuế với tài xế cá nhân (hỏi Kế toán).
- **Điểm tôi đề nghị thêm, có căn cứ:**
  - (e) **Cổng "thiếu giá thì không xuất bến"** (xem mục ⚠ ở đầu tệp). Taxi ăn chia % đi đường nào? Có giá bảng, có ngoại lệ, hay không phải "xe thuê"? Đổi luật C1 của ADR-0057 là việc của ADR mới.
  - (f) ADR-0057 ghi "dòng dịch vụ đưa đón mà chuyến do Tour Đảo điều (xe công ty hoặc xe thuê) **không** mang giá vốn a%; tiền xe là chi phí chuyến" (`ADR-0057:256`). Chia % cho taxi về bản chất là một a%. ADR mới phải nói rõ có đảo câu này không.
  - (g) Một chuyến có thể chở khách nhiều đơn, và "Chuyến gom nhiều đơn: **không** chia vào đơn" (`ADR-0057:117`). Nếu tính % trên giá bán chặng thì phải cộng chặng của nhiều đơn trên cùng xe. Cần chủ cho biết: taxi thường chở một đơn hay ghép nhiều đơn?
  - (h) Nếu taxi thu tiền mặt của khách thì tài xế nợ lại Tour Đảo, tức thành công nợ phải thu từ tài xế.
- **Khuyến nghị cách làm** (không chạm số tiền): ADR riêng, sổ riêng, không chen vào bảng chi phí xe thuê. Tôi thấy hợp lý.

---

## Đợt 3: Lịch xe bận

### 3.1 Lưới tuần hiện cả chuyến đã xếp, chỉ mã CX-… + giờ
- **Lời thường:**
  - Mở trang "Lịch xe bận" tuần này, hàng xe 16 chỗ 79B-… thấy ô "CX-0012 08:00–11:30" (chuyến đã xếp, màu khác).
  - Lịch bận chỉ ghi việc của xe như "Bảo dưỡng" hay "Đăng kiểm".
  - Chuyến không phải gõ lại thành lịch bận.
- **Căn cứ:**
  - Đánh giá Đợt 3 Câu 1: "Bắt người dùng gõ lại là hai nguồn, dễ lệch. ADR-0055 đã loại cách 'sổ giữ chỗ riêng'" (`docs/design/van-chuyen-dot-3-7/danh-gia/dot-3.md:58-67`).
  - Anh đã chọn "Lịch xe vào xưởng trùng chuyến đã xếp: không cho ghi" (`docs/adr/ADR-0055-van-chuyen-kernel-luot-2.md:10`, `:66`).
- **Hợp bối cảnh?** Có. Với 5 xe, nhìn một tuần thấy ngay xe nào trống để nhận đoàn.
- **Đề xuất:** Đồng ý.
- **Nếu chọn khác** (gõ tour thành lịch bận): cần ADR mới đảo Q-L2-1. Lịch bận và chuyến thật sẽ lệch nhau khi chuyến dời.
- **Có phải cửa một chiều?** Không.

### 3.2 🔒 Lý do bận chọn từ danh mục (Bảo dưỡng, Đăng kiểm, Sửa chữa, Khác)
- **Lời thường:** khi xe 7 chỗ vào gara thì chọn "Sửa chữa", không gõ "Gara Minh Phát thay lốp".
- **Căn cứ:**
  - ADR-0055: "`reason_code` FK `vc_reason`; nhóm mới `BAN_XE` gieo 'Bảo dưỡng', 'Đăng kiểm', 'Sửa chữa', 'Khác'" (`ADR-0055:54`).
  - Đánh giá: "Kế hoạch cố ý không có cột chữ tự do, để không ai gõ tên hay SĐT khách vào nhật ký xe" (`dot-3.md:73`).
  - Quản trị đổi được tên lý do.
- **Hợp bối cảnh?** Có. Đội 5 xe ít khi vào xưởng, bốn lý do là đủ.
- **Đề xuất:** Đồng ý danh mục.
- **Cần chủ cho biết:** Kế toán có cần ghi tên gara hay số tiền sửa ở đây không? Nếu cần thì phải nói **trước** khi tạo bảng. Chi phí sửa xe nên thuộc sổ khác, không thuộc lịch bận.
- **Nếu chọn khác** (thêm ô ghi chú tự do):
  - Thêm cột và cần ADR bổ sung.
  - Phải che dãy số.
  - Quyết sau thì tốn thêm một migration (`dot-3.md:75-78`).
- **Có phải cửa một chiều?** Có (🔒).

### 3.3 Thêm ô "Đến ngày"
- **Lời thường:**
  - Xe 16 chỗ vào xưởng từ thứ Hai đến thứ Tư thì ghi một lần, không phải ghi ba lần.
  - "Cả ngày" lưu thành 00:00 hôm đó → 00:00 hôm sau, nên chuyến 23:59 không lọt.
- **Căn cứ:**
  - "Bản vẽ ghi 'Cả ngày' = 00:00–23:59 … còn hở 1 phút"; "ADR cho phép khung tới 31 ngày" (`dot-3.md:80-92`).
  - ADR-0055: "Độ dài tối đa một khung: 31 ngày" (`ADR-0055:60`).
- **Hợp bối cảnh?** Có. Đăng kiểm hay sửa lớn thường kéo nhiều ngày.
- **Đề xuất:** Đồng ý.
- **Nếu chọn khác:** phải ghi nhiều lần, và bận qua đêm phải tách thành hai dòng.
- **Có phải cửa một chiều?** Không (chỉ là giao diện cộng một ô).

### 3.4 Ai mở trang "Lịch xe bận": Quản trị + Toàn quyền
- **Lời thường:** chỉ người quản lý xe được thêm hoặc rút lịch bận. Bán hàng xếp xe vẫn thấy xe bận ngay trên "Điều phối xe".
- **Căn cứ:**
  - "Bán hàng và Kế toán vẫn thấy xe bận ngay trên 'Điều phối xe' (dải bận), đúng ADR-0055 A4" (`dot-3.md:94-102`).
  - Route dùng ô `vehicle.manage` (`…-03-khung-ban-gio-lai.md:19`).
- **Hợp bối cảnh?** Hợp. Mở thêm cho người khác là việc hai chiều.
- **Đề xuất:** Đồng ý.
- **Cần chủ cho biết:** Bán hàng nhận đoàn trước vài ngày có cần xem lịch **cả tuần** của 5 xe không? Nếu cần thì mở chỉ-đọc, thêm một dòng kiểm quyền.
- **Nếu chọn khác:** Kế toán sẽ thấy lịch xe cả tuần (`dot-3.md:99-102`).
- **Có phải cửa một chiều?** Không.

---

## Đợt 4: Tiền xe thuê

### 4.1 Nút "Tải bảng kê": chưa làm lượt này
- **Lời thường:** Kế toán xem bảng kê tiền trả nhà xe Phúc Thành trên màn hình, chưa có nút tải về Excel.
- **Căn cứ:** "tệp tải về chứa toàn bộ số tiền trả nhà xe, rời khỏi app. Ai được tải, tải định dạng gì, có ghi nhật ký không … chưa có trong ADR" (`dot-4.md:110-113`). Phần tải tệp sẽ làm cùng lúc đưa nợ nhà xe vào sổ công nợ (ADR-0057 T4).
- **Hợp bối cảnh?** Hợp. Hiện chỉ thuê xe theo chuyến lúc cao điểm, mỗi tháng ít dòng nên xem trên màn là đủ.
- **Đề xuất:** Đồng ý.
- **Nếu chọn khác:** cần một ADR nhỏ (route mới và luật nhật ký), Đợt 4 dài thêm.
- **Có phải cửa một chiều?** Không.

### 4.2 Cột "Điều chỉnh" = số tiền (máy chủ tính)
- **Lời thường:** dòng chuyến CX-0031 ghi "+ 150.000 ₫" (phụ thu chờ thêm giờ), không chỉ ghi "2 điều chỉnh".
- **Căn cứ:**
  - "Kế toán trả tay cho nhà xe cần biết phần tiền chênh so với giá gốc; số lần không giúp đối chiếu hoá đơn" (`dot-4.md:115-119`).
  - Số này do máy chủ tính, có ca sổ vàng.
- **Hợp bối cảnh?** Có.
- **Đề xuất:** Đồng ý. Đây là cách hiện một số tiền do máy chủ tính, không đổi luật tiền.
- **Nếu chọn khác:** Kế toán phải mở từng chuyến để xem số.
- **Có phải cửa một chiều?** Không.

### 4.3 💰 Gợi ý "Bảng giá vừa có giá 450.000 ₫…". Chỉ nêu điểm cần chốt
- **Lời thường:**
  - Chuyến xe thuê đang "chưa có giá". Quản trị vừa thêm giá tuyến vào bảng.
  - Khối Chi phí chuyến báo trước con số sẽ lấy, rồi mới cho bấm "Lấy lại giá bảng".
- **Căn cứ:** trường mới `giaBangCoThe` "**chỉ** nằm trong phản hồi chi phí chuyến (`transport.cost.view`)"; bài kiểm "gọi bằng Bán hàng không được thấy số này" (`dot-4.md:121-125`).
- **Điểm anh phải chốt:**
  - (1) Có muốn hiện con số trước khi bấm không, hay chỉ có nút?
  - (2) Con số chỉ cho người đã được xem tiền xe (Quản trị / Kế toán / Toàn quyền), anh đồng ý giữ phạm vi này chứ?
- **Nếu không làm:** không thêm trường tiền nào. Màn lệch bản vẽ, và đôi khi bấm nút sẽ nhận lỗi 409 "không có giá".
- **Có phải cửa một chiều?** Không (thêm hoặc bỏ một trường trả về).

### 4.4 Bán hàng KHÔNG thấy dải "chưa có giá"
- **Lời thường:**
  - Bán hàng mở chuyến xe thuê thấy dòng "Chuyến xe thuê chưa có giá" trong thẻ Điều kiện xuất bến, không có số tiền.
  - Dải lớn kèm nút "Nhập giá thoả thuận" chỉ hiện cho người nhập được giá.
- **Căn cứ:**
  - ADR-0057: "Nhãn 'thiếu giá' là **lý do giữ**, hiện cho người xem chuyến (kể cả Bán hàng) … **không kèm số tiền**" (`ADR-0057:164`).
  - Đánh giá: "lời trong dải bảo người xem 'nhập giá thoả thuận…', nhưng Bán hàng không làm được việc đó" (`dot-4.md:127-131`).
- **Hợp bối cảnh?** Có.
- **Đề xuất:** Đồng ý.
- **Nếu chọn khác:** thêm một biến thể lời, và Bán hàng thấy cùng một tin ở hai chỗ.
- **Có phải cửa một chiều?** Không.

### 4.5 Nền thanh bên toàn app = màu nền trang (#eaf2f8) + viền phải
- **Lời thường:** đổi màu thanh menu trái giống màu nền trang, có đường viền ngăn cách. Đây là lời anh dặn khi gửi bản vẽ.
- **Căn cứ:**
  - Lời chủ "nhớ đổi lại nền cho thanh bên trái … thành màu nền toàn trang".
  - "production **không có** ghi đè 'Nền thanh bên'" (`…-04-tien-xe-thue.md:1491-1496`).
  - Token `--c-surface-alt: #eaf2f8` (`public/app.css:39`).
- **Hợp bối cảnh?** Đây là việc bề mặt.
- **Đề xuất:** Đồng ý. Có thể tách ra phát hành trước (`:1495`).
- **Có phải cửa một chiều?** Không.

### 4.6 💰 Xác nhận 19 ca sổ vàng: việc của anh hoặc Kế toán
- **Lời thường:** 19 ví dụ tính tiền xe thuê đã có đáp án viết sẵn. Ví dụ: thuê 16 chỗ giá bảng, rồi phụ thu, rồi đổi xe, rồi huỷ. Kế toán đọc từng ca, thấy đúng thì ghi tên + ngày.
- **Căn cứ:**
  - Trên nhánh @8094df2b, `golden/van-chuyen-chi-phi.json` có đủ 19 mã `SV-CPX-01 … SV-CPX-14b`, **tất cả** `cho_xac_nhan`.
  - Kế hoạch: "chưa có ca xác nhận thì chưa nhận mã tiền" (`…-04-tien-xe-thue.md:84`, `:1593`).
  - Lệch nhỏ: kế hoạch dòng 161 còn ghi "V1–V13", trong khi tệp thật có 19 ca. Nên sửa chữ.
- **Điểm anh phải chốt:** ai xác nhận (anh hay Kế toán), và hạn xác nhận. Đây là việc chặn phát hành Đợt 4.
- **Có phải cửa một chiều?** Không, nhưng chặn phát hành.

### 4.7 💰 Chuyến đã đổi từ xe nhà xe sang xe công ty (chưa huỷ): có ghi phí cho nhà xe cũ không? Chỉ nêu điểm cần chốt
- **Lời thường:**
  - Đã xếp 16 chỗ của nhà xe Phúc Thành cho đoàn ngày 10/10. Ngày 9/10 văn phòng đổi sang xe 16 chỗ của công ty.
  - Phúc Thành đòi 200.000 ₫ phí huỷ muộn.
  - Khuyến nghị "chặn" nghĩa là không ghi khoản đó vào chuyến này.
- **Căn cứ, kèm một chỗ lệch cần anh biết:**
  - Mã trên nhánh (chưa gộp main): `worktree-agent-a76ababaa4a5b3183@8094df2b:src/modules/van-chuyen/tien-xe-chi-phi.ts:92` trả 409 "Chuyến này không còn là xe thuê — không ghi chi phí xe thuê." khi chuyến đã thành xe công ty và chưa huỷ.
  - Nhưng bảng tự chốt TC-11 của chính kế hoạch ghi "Phí huỷ muộn cho chuyến đã đổi sang xe công ty **vẫn ghi được**" (`…-04-tien-xe-thue.md:123`). Hai chỗ nói ngược nhau.
  - ADR-0057 chỉ nói "Phí huỷ với nhà xe Kế toán ghi tay" (`ADR-0057:40`, Q7 `:14`).
- **Điểm anh phải chốt:**
  - (1) Đổi nhà xe sang xe công ty có tính là "huỷ với nhà xe" không?
  - (2) Nếu chặn trên chuyến thì phí đó Kế toán ghi ở đâu (sổ công nợ sau này, hay ngoài app)?
  - (3) Bảng TC-11 hay mã nhánh, cái nào đúng ý anh? Cái kia phải sửa theo.
- **Có phải cửa một chiều?** Không (luật máy chủ), nhưng chạm tiền.

### 4.8 Thêm dòng trạng thái ADR-0057 "dời ngày chạy thì tính lại giá"
- **Lời thường:**
  - Anh đã chọn: dời đoàn từ 10/10 sang 15/10 thì giá xe thuê lấy theo bảng giá ngày 15/10 ("900.000đ — giá ngày chạy").
  - ADR-0057 mới liệt kê đổi nhà xe / xe / tuyến, chưa ghi đổi ngày.
- **Căn cứ:** lộ trình `:134`; ADR-0057 C4 (`ADR-0057:144-148`); kế hoạch `…-04-tien-xe-thue.md:86`, `:1594`.
- **Hợp bối cảnh?** Có. Đây là ghi lại quyết định anh đã chốt.
- **Đề xuất:** Đồng ý. Anh cần bấm cho phép khi máy hỏi quyền sửa ADR.
- **Có phải cửa một chiều?** Không.

---

## Đợt 5: Xe đang chạy (bản thu gọn)

> Cả ba câu 5.x trong tệp được viết khi còn luồng "tài xế nhờ xe khác" (D4). D4 nay đã **hoãn**. Kế hoạch Đợt 5 đã viết lại theo luồng đơn giản (`…-05-xe-dang-chay.md:21`, `:474`). Tôi diễn lại từng câu theo luồng mới.

### 5.2b 💰 Cứu hộ khi xe hỏng. Chỉ nêu điểm cần chốt
- **Lời thường** (luồng thu gọn):
  - Xe 16 chỗ hỏng giữa đường, tài xế bấm "Kết thúc gián đoạn", khách quay về "chưa xếp".
  - Văn phòng bấm "Tạo chuyến cứu hộ" theo một trong hai cách:
    - (a) thêm khách vào xe 7 chỗ công ty đang chạy cùng ngày;
    - (b) tạo chuyến mới bằng xe công ty hoặc xe nhà xe.
  - Ô giá thoả thuận chỉ Quản trị / Kế toán / Toàn quyền thấy.
- **Căn cứ:**
  - ADR-0052 D5c: "A kết thúc gián đoạn → chặng về 'chưa xếp' → văn phòng tạo chuyến cứu hộ mới…"; xe nhà xe "chỉ xuất bến khi có **nguồn giá** … do Quản trị / Kế toán / Toàn quyền nhập … không ngoại lệ, không phá lệ" (`ADR-0052:128-134`).
  - Kế hoạch `…-05-xe-dang-chay.md:21`, `:39`.
  - Lộ trình L5: "xe có tài xế dùng app" = tài xế công ty ở Đợt 5 (`…-00-lo-trinh.md:96`).
- **Điểm cần biết:** nếu bảng giá thuê có sẵn tuyến đó thì khi xếp xe nhà xe, máy **tự chụp giá bảng** ngay trong lệnh (ADR-0057 C4, `:144-146`). Bán hàng tạo chuyến cứu hộ không bị kẹt.
  - Chỉ khi tuyến không có trong bảng giá mới cần Quản trị / Kế toán nhập giá thoả thuận.
- **Điểm anh phải chốt:**
  - (1) Xe hỏng ngoài giờ hành chính (tối, cuối tuần) thì ai trực có quyền nhập giá? Không ai trực thì xe nhà xe không xuất bến được, chỉ còn xe công ty.
  - (2) Có muốn bảng giá thuê phủ sẵn các tuyến hay đi (sân bay, bến tàu) để giảm ca phải nhập giá không?
  - (3) Taxi đối tác (sau Đợt 6) làm xe cứu hộ cũng vướng cổng giá này (xem mục ⚠).
- **Có phải cửa một chiều?** Không.

### 5.2c Câu chữ khi tài xế báo xe hỏng
- **Lời thường:** tài xế xe 16 chỗ hỏng xe, đọc thấy câu gì trên điện thoại.
- **Căn cứ:**
  - Câu đề xuất trong tệp ("Tài xế xe được chọn sẽ nhận tin; nếu không ai nhận…") giả định tài xế tự chọn xe cứu hộ. Đó là luồng D4, đã **hoãn**.
  - Kế hoạch thu gọn đã dùng câu khác: "Xe hỏng? Bấm Kết thúc gián đoạn — văn phòng nhận tin ngay và xếp xe cứu hộ." (`…-05-xe-dang-chay.md:474`).
  - Câu này đúng sự thật vì ADR-0052 D6.2 gửi tin "kết thúc gián đoạn" tới "người có `trip.dispatch = any` (tạo chuyến cứu hộ)" (`ADR-0052:161`).
  - Đợt 2 có `trip_ended_interrupted` trong danh sách sinh tin (`…-02-tin-bao-chuyen.md:95`).
- **Đề xuất:** **Chọn khác:** dùng câu của kế hoạch Đợt 5 dòng 474. Câu trong tệp câu hỏi đã cũ, nói về một nút chưa tồn tại.
- **Hệ quả:** không thêm người nhận tin nào. Lời hứa "văn phòng được báo ngay" thành đúng nhờ Đợt 2.
- **Có phải cửa một chiều?** Không (chỉ là chữ).

### 5.3 Tài xế thấy giờ đón + tổng khách, không tách người lớn / trẻ em
- **Lời thường** (luồng thu gọn): văn phòng thêm điểm đón khi xe đang chạy. Tài xế thấy dải "Văn phòng vừa thêm điểm — Điểm 3 · Bến Cầu Đá · 09:10 · 3 khách", không ghi "2 NL · 1 TE".
- **Căn cứ:**
  - Kế hoạch `…-05-xe-dang-chay.md:301`, `:342`.
  - Ở bản D4 cũ, ADR chỉ có `pax_count` (`ADR-0052:59`, `:90`).
- **Hợp bối cảnh?** Phần lớn hợp. Riêng xe 4–7 chỗ chở trẻ nhỏ có thể cần ghế trẻ em.
- **Đề xuất:** Đồng ý (tổng khách). Thêm phần tách sau là việc hai chiều.
- **Cần chủ cho biết:** tài xế có thật sự cần biết trước số trẻ em (để mang ghế trẻ em) không?
- **Có phải cửa một chiều?** Không.

---

## Đợt 6: Tài xế đối tác (taxi / nhà xe)

> Mục ⚠ ở đầu tệp (taxi bị cổng "thiếu giá") không đổi các câu 6.1–6.5. Nhưng anh cần chốt 0.2 **trước khi Đợt 6 phát hành**.

### 6.1 Chỉ tổng số khách
- **Lời thường:** taxi anh Hùng thấy "Số khách 4", không thấy "3 NL · 1 TE".
- **Căn cứ:**
  - ADR-0053 D7.3: tài xế đối tác thấy "số người mỗi điểm" (`docs/adr/ADR-0053-dieu-phoi-luot-3-tai-xe-doi-tac.md:69`).
  - Đánh giá: "tài xế đối tác là người ngoài và thấy cả **trước** giờ xem khách" (`dot-6.md:61-64`).
- **Hợp bối cảnh?** Hợp với nguyên tắc "người ngoài thấy ít nhất". Taxi 4–7 chỗ chở trẻ nhỏ có thể cần ghế, giống câu 5.3.
- **Đề xuất:** Đồng ý.
- **Cần chủ cho biết:** như 5.3, cần biết trước trẻ em để mang ghế hay không. Nếu cần thì thêm một dòng ADR-0053, khoảng nửa ngày.
- **Có phải cửa một chiều?** Không.

### 6.2 Dải "Tài xế bận" bỏ hẳn lý do
- **Lời thường:** Bán hàng xếp xe thấy "Hùng (taxi) bận 13:00–18:00", không thấy "Ốm".
- **Căn cứ:**
  - ADR-0053 D9.2 cho người xếp xe xem khung bận, và đã loại Kế toán vì "lý do có thể là 'Ốm'" (`ADR-0053:147`).
  - Đánh giá: "'Ốm' là thông tin sức khoẻ của người ngoài công ty" (`dot-6.md:66-69`).
  - Kế hoạch gọi đây là "siết ADR-0053 D9.2" (`…-06-tai-xe-doi-tac.md:482`).
- **Hợp bối cảnh?** Có, càng hợp khi lên hợp tác xã trăm xe: người xếp xe chỉ cần biết ai rảnh.
- **Đề xuất:** Đồng ý.
- **Nếu chọn khác:** giữ trường lý do, và phải vẽ thêm chỗ hiện.
- **Có phải cửa một chiều?** Không (bớt dữ liệu trả về).

### 6.3 🔒 Thêm ô "Số điện thoại văn phòng" vào Chính sách điều phối
- **Lời thường:** taxi quá hạn từ chối chuyến thì bấm "Gọi văn phòng" là gọi đúng số người xếp xe, không phải số hỗ trợ kỹ thuật ở trang đăng nhập.
- **Căn cứ:**
  - "hệ thống chưa có số văn phòng nào … Một ô có tên, do Toàn quyền đặt, thì đổi được mà không cần sửa mã" (`dot-6.md:71-74`).
  - Lộ trình: Đợt 6 thêm `office_phone` vào `vc_dispatch_policy` (`…-00-lo-trinh.md:83`).
- **Hợp bối cảnh?** Với 5 xe và một văn phòng thì một số là đủ.
- **Đề xuất:** Đồng ý (một số).
- **Cần chủ cho biết:** lên hợp tác xã có cần **nhiều số** không (theo ca trực, theo khu vực)? Nếu có thì một cột không đủ. Chuyện này phải biết trước khi tạo cột, đó là lý do câu mang dấu 🔒.
- **Nếu chọn khác:**
  - Viết cứng số vào mã: mỗi lần đổi số phải phát hành lại.
  - Bỏ nút: tài xế phải tự tìm số.
- **Có phải cửa một chiều?** Có (🔒).

### 6.4 Không làm kéo thả; câu chặn ở ô chọn tài xế
- **Lời thường:** khi xếp taxi Hùng đang bận, ô chọn tài xế ghi "Bận" cạnh tên, máy báo "Không thể xếp: tài xế đang bận". Không làm thao tác kéo chuyến thả vào tên tài xế.
- **Căn cứ:** "lịch hiện xếp theo **xe**, không có hàng tài xế … Làm thêm kéo chuyến vào tài xế là một tính năng mới … vượt Đợt 6" (`dot-6.md:76-79`).
- **Hợp bối cảnh?** Có. Khi lên hợp tác xã, kiểu "phát chuyến cho tài xế tự nhận" sẽ có ADR riêng tới mốc (`…-00-lo-trinh.md:154-156`), không cần kéo thả bây giờ.
- **Đề xuất:** Đồng ý.
- **Có phải cửa một chiều?** Không.

### 6.5 Tên mục "Cuốc của tôi"; nút Xuất bến giữ màu
- **Lời thường:** menu tài xế vẫn ghi "Cuốc của tôi" như hôm nay (bản vẽ ghi "Chuyến của tôi"). Nút Xuất bến giữ màu cam như cũ.
- **Căn cứ:**
  - Nhãn "Cuốc của tôi" đã chốt ở Q5 ADR-0049 (`web/shell.ts:29`, `:50`).
  - Kế hoạch `…-06-tai-xe-doi-tac.md:402`, `:422`.
- **Hợp bối cảnh?** Có. "Cuốc" là chữ quen của tài xế, nhất là taxi.
- **Đề xuất:** Đồng ý.
- **Có phải cửa một chiều?** Không.

---

## Đợt 7: Xe riêng / số chỗ tối thiểu

### 7.1 Chỉ chen hai ô vào form đưa đón có sẵn
- **Lời thường:** khi lập đơn, mỗi chặng đưa đón có thêm công tắc "Xe riêng" và ô "Xe tối thiểu … chỗ". Ví dụ đoàn 9 người đặt "≥ 16 chỗ" để chắc chắn được xe 16 chỗ. Phần còn lại của form giữ nguyên.
- **Căn cứ:** lệnh vẽ "giữ nguyên mọi thứ đang có"; ô "Số khách" từng chặng chạm dữ liệu, cần ADR mới (`dot-7.md:53-72`); kế hoạch `…-07-xe-rieng-so-cho.md:31`.
- **Hợp bối cảnh?** Có. Với 2 xe 16 chỗ + 3 xe 7 chỗ, hai ô này đủ để văn phòng không xếp nhầm đoàn lớn vào xe 7 chỗ.
- **Đề xuất:** Đồng ý.
- **Nếu chọn khác:** phải có ADR số khách từng chặng, phải làm lại form M1/M4, Đợt 7 chậm nhiều.
- **Có phải cửa một chiều?** Không.

### 7.2 Ai xem chặng thì thấy nhãn "Xe riêng / ≥ N chỗ"; tài xế không nhận
- **Lời thường:** Kế toán, Hướng dẫn viên và Đối tác lập đơn đều thấy nhãn "XE RIÊNG", "≥ 16 chỗ" trên trang đơn.
- **Căn cứ:** "Đây là lời hứa với khách, không chứa tiền hay tên. Đối tác là người tự bật nó trên nháp. Hướng dẫn viên cần biết đoàn có xe riêng" (`dot-7.md:74-84`).
- **Hợp bối cảnh?** Có.
- **Đề xuất:** Đồng ý.
- **Nếu chọn khác:** phải thêm luật che theo vai kèm bài test, và Đối tác không thấy lại điều chính mình ghi.
- **Có phải cửa một chiều?** Không.

---

## Bảng tóm tắt

| Câu | Đề xuất | Mức chắc chắn | Cần chủ cho biết gì |
|---|---|---|---|
| 0.1 🔒 | Đồng ý A (bảng phụ có kiểu) + ADR nhỏ | cao | — |
| 0.2 💰 | Không chọn thay; thêm điểm (e)–(h) | — | a–d + taxi qua cổng "thiếu giá" thế nào; chia % có đảo câu "không giá vốn a%" không; taxi chở một đơn hay ghép; taxi có thu tiền mặt không |
| 3.1 | Đồng ý | cao | — |
| 3.2 🔒 | Đồng ý danh mục | cao | Có cần ghi tên gara / tiền sửa ở lịch bận không (nói trước khi tạo bảng) |
| 3.3 | Đồng ý | cao | — |
| 3.4 | Đồng ý (Quản trị + Toàn quyền) | vừa | Bán hàng có cần xem lịch xe cả tuần không |
| 4.1 | Đồng ý (chưa làm) | cao | — |
| 4.2 | Đồng ý (số tiền) | cao | — |
| 4.3 💰 | Không chọn thay | — | Có hiện số trước khi bấm không; giữ phạm vi chỉ người xem tiền xe |
| 4.4 | Đồng ý | cao | — |
| 4.5 | Đồng ý | cao | — |
| 4.6 💰 | Việc của người | — | Ai xác nhận 19 ca, hạn khi nào (chặn phát hành) |
| 4.7 💰 | Không chọn thay; báo lệch TC-11 ↔ mã nhánh | — | Đổi sang xe công ty có tính là huỷ với nhà xe không; phí ghi ở đâu |
| 4.8 | Đồng ý | cao | — (bấm cho phép sửa ADR) |
| 5.2b 💰 | Không chọn thay | — | Ai trực nhập giá ngoài giờ; có phủ sẵn bảng giá các tuyến hay đi không |
| 5.2c | **Chọn khác:** dùng câu kế hoạch 05:474 | cao | — |
| 5.3 | Đồng ý | vừa | Tài xế có cần biết trước số trẻ em (ghế trẻ em) không |
| 6.1 | Đồng ý | vừa | Như 5.3 |
| 6.2 | Đồng ý | cao | — |
| 6.3 🔒 | Đồng ý (một số) | vừa | Hợp tác xã sau này có cần nhiều số (ca / khu vực) không |
| 6.4 | Đồng ý | cao | — |
| 6.5 | Đồng ý | cao | — |
| 7.1 | Đồng ý | cao | — |
| 7.2 | Đồng ý | cao | — |

**Đếm:**
- Đồng ý khuyến nghị: 18 câu (0.1, 3.1–3.4, 4.1, 4.2, 4.4, 4.5, 4.8, 5.3, 6.1–6.5, 7.1, 7.2).
- Đề xuất đổi: 1 câu (5.2c).
- 💰 không chọn thay: 5 câu (0.2, 4.3, 4.6, 4.7, 5.2b).
- Có điểm "cần chủ cho biết": 10 câu (0.2, 3.2, 3.4, 4.3, 4.6, 4.7, 5.2b, 5.3, 6.1, 6.3). Riêng 0.2 phải chốt trước khi Đợt 6 phát hành.

**Chưa kiểm:**
- Tôi không mở 5 tệp bản vẽ `.dc.html`. Tôi dựa vào bản đánh giá đối chiếu.
- Tôi không chạy test.
- Số dòng trên nhánh Đợt 4 là ở @8094df2b, nhánh chưa gộp main.
