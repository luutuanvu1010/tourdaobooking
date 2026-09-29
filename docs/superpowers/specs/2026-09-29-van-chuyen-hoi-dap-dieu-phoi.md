# Vận chuyển — hỏi đáp với chủ về chuyến xe và bảng điều phối (2026-09-28 khuya → 29/9)

- **Mục đích:** ghi NGUYÊN VĂN câu trả lời của chủ dự án (trực tiếp với phiên điều phối) để người thiết kế "Bảng điều phối chung" và ADR chuyến xe (đề xuất 1b lượt duyệt 2, B1–B3) dùng làm căn cứ. Đây là tài liệu mô tả, ghi lời chủ, chưa phải ADR.
- **Trạng thái đề xuất 1b lượt duyệt 2 (B1–B3):** chủ **CHƯA duyệt**; chủ nói *"hãy hỏi tôi thêm để thiết kế tính năng và kiến trúc thật chuẩn nhé"*.

## Đã trả lời (câu của đề xuất 1b)

| Câu | Chủ chọn |
|---|---|
| Q1: ai xếp xe | **Bán hàng + Quản trị** (và Toàn quyền); Kế toán chỉ xem; HDV, Đối tác không thấy lịch xe |
| Q2: tài xế tự bấm Xuất bến / Đã đón / Khách vắng / Kết thúc | **Có** (giờ theo máy chủ; văn phòng bấm thay được, ghi ai bấm) |
| Q3: tài xế thấy SĐT người liên hệ | **Có, chỉ trong ngày chạy**, chỉ đơn có khách trên chuyến mình |

## Cách xe chạy thật (lời chủ)

1. **Hình chuyến:** đón **nhiều khách sạn → nhiều điểm đến** (cảng Vinpearl, Bến Tàu Du lịch, cáp treo, sân bay…).
2. **Giờ đón:** văn phòng hẹn lúc lập đơn, nhưng **có thể thay đổi giờ đón hoặc lịch trình trước và trong lúc chạy**. Nguyên văn:
   > "xe A có lịch đón tại khách sạn Sheraton -> Amiana- > Mường Thanh rồi đưa đến cangr Vinpearl, và 1 nhóm khách đến Bến Tàu Du lịch. Xe B có lịch đón : INtercontinential-> AB Square-> Alibu. Nhưng vì lý do nào đó (kẹt xe, thêm khách bổ sung trong lịch so với ban đầu,...) thì lại có sự thay đổi của A và B trước-trong lúc đi đón/trả khách. LÚc này, Xe A có thể đón Sheraton-> Amiana-> Alibu. Xe B lại đón Intercontinential -Absquare-Mường Thanh. . Tóm lại, có những thứ được tuỳ chọn qua cấu hình, có những luồng cố định (lõi) , có những luồng quyết định trong logic. Hãy bàn thêm nhé"
3. **Chiều về:** tuỳ dịch vụ → **khai theo từng dịch vụ trong danh mục** (không đưa đón / một chiều / hai chiều; lập đơn tự tạo đúng số chặng, sửa tay được).
4. **Lúc xếp xe:** *"Xếp xe bất cứ lúc nào, nhưng tối thiểu phải là 6 giờ trước giờ khởi hành"*.
5. **Mốc 6 giờ:** chặn, có ngoại lệ (người có quyền phá lệ kèm lý do). Áp **cả hai** lúc: lúc khách đặt (biểu mẫu) và lúc xếp xe. Nguyên văn thêm:
   > "luật này đưọc ghép điều kiện chung với TOur/dịch vụ. Nghĩa là : nếu khách đặt vé đi Vinpearl mà yêu cầu đón thì giờ đón trên biểu mẫu đặt tour chính là giờ đón được gán cho lịch chung. Căn cứ lịch chung đó, có 1 worker/module để điều phối chung cho xe."
6. **Bộ điều phối chung** (nguyên văn):
   > "Nghĩ thật kỹ bộ điều phối chung này giúp mình, đây vừa là bảng điều khiển, vừa là nơi để xử lý tính toán một cách logic và trực quan hoá luồng dữ liêụ của phân hệ Vận Chuyển"
7. **Chuyển điểm đón giữa hai xe khi xe đang chạy:** văn phòng chỉ thêm điểm đón; **tài xế đề nghị với nhau**. Nguyên văn:
   > "Tôi nghĩ về phương án B, bảng điều phối chung sẽ nhận được thống tin này, tự động kích hoạt các logic có sẵn để tính toán, Ưu tiên luồng B nhận -> Điều phối xác nhận tự động"
8. **Bớt/huỷ điểm đón khi xe đang chạy:** nguyên văn:
   > "Được, kèm lý do, nhưng mặc định là tài xế hoàn thành điểm đón (trên thực tế có thể không đón được khách đã huỷ nhưng tài xế đang đến đó và không làm được việc khác.)"
9. **Không** tự báo khách khi đổi giờ đón: hệ thống ghi giờ mới, nhắc người phụ trách / tài xế gọi.

## Nguyên tắc chủ nhấn mạnh (28/9 tối, đã vào ADR-0047/0048)

- Vận chuyển vừa là dịch vụ độc lập vừa là thành phần chuỗi dịch vụ → một khái niệm "chặng".
- Phương tiện là thực thể độc lập, tài sản công ty hoặc đối tác; xe và tài xế có hồ sơ riêng.
- Đúng Hiến pháp và triết lý Oracle.

## Ba tầng điều phối đã trình chủ (chủ chưa phản đối; chờ duyệt trong thiết kế)

- **Lõi cố định:** mỗi khách tại một thời điểm ở đúng một xe; tổng người ≤ số chỗ mọi lúc (kể cả sau chuyển điểm); xe/tài xế không chồng giờ; mọi thay đổi ghi thêm (ai, lúc nào, vì sao), không sửa đè; qua cổng mới xuất bến; chuyến kết thúc không sửa; tài xế chỉ thấy chuyến mình.
- **Cấu hình (có ngày hiệu lực):** mốc tối thiểu 6 giờ; khoảng nghỉ; điều kiện xuất bến; danh sách lý do đổi; chiều về theo dịch vụ; bảng hạng bằng ↔ số khách.
- **Máy tự quyết theo luật (người quyết cuối, trừ luồng tự xác nhận chủ đã chọn):** gợi ý xe/tài xế; kiểm lại cả hai xe khi chuyển điểm; cảnh báo trùng giờ, sát mốc 6 giờ.

## Trả lời lần 2 (29/9, câu ĐP của bản thiết kế Bảng điều phối)

| Câu | Chủ chọn |
|---|---|
| ĐP2 mốc 6 giờ | **"Theo 4 khuyến nghị"**: (i) lúc xếp tính tới giờ xe xuất bến của chuyến; (ii) chặng đã phá lệ lúc đặt thì lúc xếp không ghi lý do lần nữa; (iii) trong 6 giờ chỉ khoá "ai đi xe nào", đổi xe, đổi tài xế (chỉnh thứ tự điểm, giờ xe tới vẫn làm được, có ghi); (iv) kiểm lại mốc lúc xác nhận đơn và khi sửa nơi đón/trả |
| ĐP3 ai phá lệ mốc 6 giờ và khoảng nghỉ | **"Chỉ Quản trị, Toàn quyền"** (cả lúc đặt lẫn lúc xếp — chặt hơn khuyến nghị) |
| ĐP6 người xếp xe đổi giờ hẹn khách trên đơn người khác | **"Không, nhắc người phụ trách"** |
| ĐP7 hợp đồng vận chuyển + ĐP8 cách xử lý nhiều người cùng thao tác | **"Đồng ý cả hai"**: hợp đồng để lượt riêng sau (công tắc khoá ở tắt); kiểm và ghi ngay trong một lần, đụng nhau thì tải lại (không trạm theo ngày, không hàng đợi) |

## Trả lời lần 3 (29/9, câu của hai kế hoạch thi công ADR-0047 và ADR-0048)

Điều phối hỏi chủ trực tiếp, rồi chuyển lại cho người thi công; ghi ở đây để có một nơi lưu bền (nhật ký thi công của từng nhánh cũng có).

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| Khi đơn còn là NHÁP, sửa phần đưa đón / danh sách hành khách thì máy làm theo cách nào? (hỏi lại lần hai cho rõ, sau khi chủ đề nghị "Hãy hỏi lại và rõ ý hơn") | **"Cách 1: chỉ giữ bản cuối"** — đơn nháp xoá hẳn rồi ghi lại chặng + danh sách khách cùng lô khi lưu; đơn đã xác nhận cấm xoá (ADR-0047 kế hoạch Q0) |
| Ngày đón được cách ngày đi của tour/dịch vụ bao xa? | **"Sớm 1 ngày, muộn 7 ngày"** — ngày đón trong [ngày đi − 1, ngày đi + 7], ngoài khoảng máy chặn. Đây là con số điền cho câu "khoảng cho phép (luật đổi được, ở mã)" mà ADR-0047 để cho mã, không phải sửa câu ADR (ADR-0047 kế hoạch Q2) |
| Khi đã thêm xe, có sửa được "chủ xe" (công ty ↔ nhà xe, hoặc nhà xe A → B) không? | **"Sửa được, ghi nhật ký"** — sửa nhập nhầm, nhật ký ghi "chủ xe A → B" (ADR-0048 kế hoạch Q1) |
| Hai chuyện giao diện, gộp: (a) "Chuyến đón hôm nay" ở Trang chủ vẫn lấy theo ngày đi như hiện nay; (b) không làm màn riêng "Nhà xe" — tìm nhà xe ở Danh bạ bằng ô lọc, danh sách xe lọc theo chủ xe. Đồng ý? | **"Đồng ý cả hai"** (ADR-0047 kế hoạch Q3; ADR-0048 kế hoạch Q2) |
