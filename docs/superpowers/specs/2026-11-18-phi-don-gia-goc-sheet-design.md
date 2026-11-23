# Phí đưa đón: giá gốc từ Sheet, giảm theo cấp, chương trình miễn phí — đặc tả ngắn

- **Ngày:** 2026-11-18. **Trạng thái:** **chủ duyệt 2026-11-18** trong chat, nguyên văn: «1, 2, 3 theo khuyến nghị, duyệt đặc tả, viết dễ hiểu». Cùng tin nhắn chủ thêm một yêu cầu về biên nhận khách lẻ, rồi nói rõ cách hiểu ở tin nhắn sau; ghi ở mục 6.
- **Loại:** việc lớn (tiền, dữ liệu). Bước kế: soạn quyết định chính thức (ADR mới, thay một phần ADR-0214) để chủ duyệt; sau thi công có người kiểm độc lập.

## 1. Tóm tắt
Máy tự tính phí đưa đón cho từng lượt đón. Giá gốc lấy từ Sheet dịch vụ. Đại lý được giảm theo cấp. Công ty có thể mở chương trình miễn phí đón trong một khoảng ngày. Văn phòng đổi được số trong trường hợp đặc biệt, nhưng phải ghi lý do. Khách lẻ vẫn trả phí, nhưng biên nhận gửi khách cộng phí vào giá dịch vụ thay vì in dòng riêng; Toàn quyền có công tắc để in lại dòng riêng khi cần.

Lý do đổi: cách đang chạy (văn phòng chọn tay từ danh sách 5.000–100.000 đ) đã bỏ đúng cái sai là đoán khu vực từ ô nơi đón gõ tay. Nhưng nó bỏ luôn cả cấp đại lý và dịch vụ, nên đơn nào của Đối tác có đưa đón cũng phải chờ văn phòng, và Kế toán không có bảng giá để đối chiếu.

## 2. Phí của một lượt đón được tính thế nào
Máy xét lần lượt từ trên xuống và dừng ở bước đầu tiên khớp:

1. **Văn phòng đã đổi số và có ghi lý do** ⇒ lấy số đó.
2. **Đang có chương trình miễn phí** cho dịch vụ này, hoặc cho đối tác đặt đơn ⇒ 0 đồng.
3. **Còn lại:** lấy giá trên Sheet rồi trừ mức giảm theo cấp của đại lý. Giảm nhiều hơn giá gốc thì tính 0, không ra số âm.

Ví dụ: tour A ghi phí đón 50.000 đ trên Sheet, đại lý cấp 3 được giảm 20.000 đ. Đơn 2 người lớn + 1 em bé đi chung ⇒ (50.000 − 20.000) × 2 khách = **60.000 đ**. Em bé không tính.

- **Ô trên Sheet để trống** ⇒ đơn bị giữ lại với câu báo «Dịch vụ … chưa có phí đưa đón», không tự hiểu là 0 đồng. Muốn miễn phí thì ghi số **0**.
- **Khách lẻ** và **đối tác chưa có cấp** ⇒ trả đúng giá trên Sheet, không giảm.
- **Đối tác có hai vai trò mang hai cấp khác nhau** ⇒ đơn bị giữ cho tới khi văn phòng gán một cấp riêng cho đối tác đó (như luật hiện nay).
- **Xe riêng:** Sheet có cột thứ hai «Phí đưa đón xe riêng», tính cho cả chuyến. Mức giảm theo cấp **không** áp cho xe riêng. Ô trống thì đơn bị giữ, văn phòng đổi số.
- **Đối tác gửi đơn:** máy tính được phí thì đơn đi thẳng như mọi đơn khác. Bị giữ (ô trống, hai cấp) thì đơn vào «chờ xác nhận».

## 3. Chương trình miễn phí đón
- **Hai loại:** miễn phí cho một, nhiều hoặc tất cả **dịch vụ**; hoặc miễn phí cho một hay vài **đối tác** cụ thể. Mỗi chương trình có ngày bắt đầu và ngày kết thúc.
- **Ngày tính** là **ngày đi** của lượt đón. Ví dụ «miễn phí đón tour A từ 1/12 đến 31/12» thì lượt đón ngày 5/12 được miễn, kể cả khi đơn được đặt từ tháng 11.
- **Xe riêng mặc định không được miễn.** Muốn miễn cả xe riêng thì tích ô «gồm xe riêng» khi tạo chương trình.
- **Có hiệu lực ngay** khi tạo, không phải chờ đồng bộ Sheet. Chỉ áp cho đơn **chưa xác nhận**. Đơn đã xác nhận giữ nguyên phí đã chốt; ca nào cần thì văn phòng xử lý riêng.
- **Ai làm:** Toàn quyền và Quản trị tạo và kết thúc chương trình. Kết thúc sớm là đóng ngày, không xoá, nên lịch sử còn nguyên.
- Nhiều chương trình trùng nhau không gây rối, vì chương trình nào cũng ra 0 đồng.

## 4. Mức giảm theo cấp và việc đổi số
- **Mức giảm theo cấp:** mỗi cấp đại lý một số tiền giảm cho mỗi khách, áp chung cho mọi dịch vụ. **Kế toán** nhập, vì Kế toán đang đặt cấp hoa hồng.
- **Đổi số:** chỉ nhân viên văn phòng được đổi, trước khi xác nhận. Gõ một số từ 0 tới 5.000.000 đ và bắt buộc ghi lý do. Nhật ký lưu người đổi, số cũ, số mới và lý do. Đối tác không đổi được: gửi số lên thì máy từ chối.
- Danh sách cố định 5.000–100.000 đ hiện nay được bỏ, thay bằng ô nhập số này.

## 5. Giữ nguyên như hiện nay
Phí là một dòng riêng trên đơn và được chốt lúc xác nhận. Sửa số khách thì tính lại theo đơn giá đã chốt. Không tính hoa hồng trên phí. Phí cộng vào số đại lý nợ. Giảm giá của đơn không trừ vào phí. Trần 5.000.000 đ. Công tắc «ngày bắt đầu áp» vẫn là nút bật phí, nhưng dời sang màn mới.

## 6. Biên nhận khách lẻ gộp phí đưa đón vào giá (yêu cầu thêm 18/11)
- **Lời chủ, nguyên văn:** «với hóa đơn của khách lẻ được tạo bởi bất kỳ vai nào thì không hiển thị phí đưa đón (đưa tùy chọn này vào bảng điều khiển của Super Admin để có thể hiện thị sau này néu cần)». Chủ nói rõ thêm: «chỉ đổi cách hiển thị chứ không phỉa là không tính. Ví dụ: Giá vé là 1 triệu, phí đưa đón là 10,000 thì hiển thị 1,010,000đ, không hiển thị dòng phí đưa đón riêng lẻ để khách không cảm thấy là mắc».
- **Khách lẻ** là đơn mà người đặt không phải đối tác, dù nhân viên nào lập (Bán hàng, Quản lý bán hàng, Quản trị, Toàn quyền…).
- **Tiền không đổi.** Khách lẻ vẫn trả phí theo mục 2; tổng đơn, số đã thu, số còn lại, mã QR đều như khi tách dòng. Bên trong Nền tảng phí vẫn là một dòng riêng, nên trang đơn của văn phòng và sổ sách của Kế toán vẫn thấy phí tách riêng.
- **Chỉ đổi chỗ khách nhìn thấy:** biên nhận và ảnh xác nhận đơn gửi khách. Chữ «Phí đưa đón» không xuất hiện; phí được cộng vào giá của dịch vụ mà lượt đón đó thuộc về.
  - **Ca thường** (đi chung, chiều đi và chiều về cùng số khách): phí mỗi khách cộng thẳng vào đơn giá. Ví dụ vé người lớn 1.000.000 đ, trẻ em 700.000 đ, phí đón 10.000 đ mỗi khách mỗi chiều, đi và về ⇒ biên nhận in người lớn **1.020.000 đ**, trẻ em **720.000 đ**; em bé không tính phí nên giữ giá cũ.
  - **Ca không chia đều được** (xe riêng tính cả chuyến; chiều về ít khách hơn chiều đi; dịch vụ tính theo nhóm 5 người): dịch vụ đó in thành **một dòng trọn gói**, gồm số khách và thành tiền đã cộng phí, không in đơn giá. Như vậy các dòng vẫn cộng đúng ra tổng. *[AI tự quyết, chủ bác được]*
  - Dấu «giá khác giá công bố» trên biên nhận không được bật lên chỉ vì đã cộng phí vào đơn giá.
- **Biên nhận của đối tác không đổi:** vẫn in dòng «Phí đưa đón» riêng như hiện nay.
- **Công tắc mới** trên bảng điều khiển của Toàn quyền: «Hiện riêng phí đưa đón trên biên nhận khách lẻ», mặc định **Tắt** (tức là gộp vào giá). Chỉ Toàn quyền đổi được; mỗi lần đổi đều ghi nhật ký. Công tắc chỉ đổi cách in nên áp ngay cho mọi biên nhận in sau đó, kể cả đơn đã xác nhận; tiền của đơn không đổi.

## 7. Kẽ hở đã bịt
| Kẽ hở | Cách xử lý |
|---|---|
| Ai đó đổi tên hoặc xoá cột phí trên Sheet ⇒ máy tưởng mọi ô đều trống ⇒ mọi đơn bị giữ cùng lúc | Mất hẳn cột thì máy giữ nguyên phí cũ và báo lỗi đồng bộ |
| Gõ nhầm trên Sheet, ví dụ 500.000 thay vì 50.000 | Giá gốc từ Sheet có trần 500.000 đ mỗi khách; vượt trần thì báo lỗi dòng đó và giữ số cũ |
| Ai sửa được Sheet là đổi được giá gốc, Nền tảng không lưu lịch sử | Chấp nhận như giá dịch vụ hiện nay. Mỗi dòng phí ghi lại giá gốc đã dùng, nên đơn nào cũng truy được |
| Bật phí trong khi nhiều dịch vụ còn ô trống ⇒ đơn bị giữ hàng loạt | Màn bật phí liệt kê các dịch vụ có đưa đón mà chưa có phí; chỉ nhắc, không chặn |
| Màn bảng phí theo khu vực còn đó nhưng không còn tác dụng | Ẩn khỏi menu; dữ liệu cũ để nguyên |
| Sheet ai có đường dẫn cũng đọc được | Sheet chỉ ghi giá gốc chung. Mức giảm theo cấp và chương trình cho từng đối tác chỉ nằm trong Nền tảng |
| Kế toán cần biết vì sao ra số đó | Mỗi dòng phí ghi đủ: giá gốc, cấp và mức giảm, chương trình (nếu có), số đổi tay kèm lý do và người đổi |

## 8. Chưa kiểm (phải kiểm trước khi làm)
- Thêm hai cột vào Sheet có làm hỏng phần đặt tour của trang web công khai không (trang web dùng chung Sheet này).
- Đơn do thành viên của một tổ chức đối tác đặt mang tên tổ chức hay tên người đó. Câu này quyết định chương trình miễn phí theo đối tác áp cho ai; đề xuất áp theo người đặt ghi trên đơn.
- Trên bản chạy thật, phí vẫn chưa thu đồng nào (chưa đặt «ngày bắt đầu áp»). Đề xuất chưa bật cho tới khi bản mới lên.

## 9. Không làm lần này
Giảm theo phần trăm; chương trình chỉ giảm một phần (lần này chỉ có miễn phí); phí theo khu vực, giờ hay mùa; sửa phí sau khi đã xác nhận.

## 10. Xong khi
- Tour A phí 50.000, đại lý cấp 3 giảm 20.000, đơn 2 người lớn + 1 em bé ⇒ 60.000 đ. Cùng đơn đó của khách lẻ ⇒ phí 100.000 đ.
- Khách lẻ, vé người lớn 1.000.000 đ, phí đón 10.000 đ chỉ chiều đi, công tắc Tắt ⇒ biên nhận in người lớn 1.010.000 đ, không có chữ «Phí đưa đón», tổng đơn và mã QR đúng bằng khi tách dòng. Trang đơn của văn phòng vẫn thấy dòng phí riêng. Toàn quyền bật công tắc ⇒ biên nhận in lại thấy dòng phí riêng, tổng không đổi.
- Khách lẻ đi xe riêng ⇒ dịch vụ in một dòng trọn gói đã gồm phí; các dòng cộng đúng tổng.
- Tạo «miễn phí đón tour A, 1/12–31/12» ⇒ đơn tour A đi ngày 5/12 ra 0 đ; biên nhận đại lý in «Miễn phí»; nhật ký ghi tên chương trình. Lượt đón xe riêng của tour A vẫn tính tiền nếu không tích «gồm xe riêng».
- «Miễn phí cho đối tác X, 1/12–15/12» ⇒ đơn của X đi trong khoảng đó ra 0 đ; đơn của đối tác Y không đổi.
- Ô Sheet trống ⇒ văn phòng bấm xác nhận bị chặn, câu báo nêu tên dịch vụ; Đối tác gửi ⇒ đơn vào «chờ xác nhận». Ô có số ⇒ Đối tác gửi đi thẳng.
- Văn phòng đổi 30.000 → 80.000 mà không ghi lý do ⇒ bị từ chối; có lý do ⇒ nhận, nhật ký ghi đủ.
- Đổi tên cột trên Sheet ⇒ đồng bộ báo lỗi, phí cũ còn nguyên.
- Quản trị hoặc Kế toán bấm công tắc khách lẻ ⇒ bị từ chối; Toàn quyền bấm ⇒ được, nhật ký ghi lại.
- Bộ ví dụ tính phí mẫu viết lại theo luật này và được chủ hoặc Kế toán xác nhận đúng tới từng đồng trước khi viết mã.

---
**Chỗ tra cho người thi công** (không cần đọc nếu không làm mã): luật đang chạy ADR-0214 (`src/shared/phi-don-chon.ts`); bộ tính theo cấp và dịch vụ của ADR-0203 còn nguyên ở `src/modules/pricing/phi-don-rules.ts` (`capCuaHoSoNgay`, `tinhPhiChang`); bộ đọc Sheet `src/modules/catalog/sheet.ts` (cột vắng hiện bị đọc như ô trống); biên nhận `src/modules/receipt/rules.ts` (`dungBienNhan`, `chiaPhanBienNhan`, cờ `giaKhacCongBo`; khách lẻ = `bookerLaDoiTac` sai) và ảnh xác nhận đơn `src/shared/order-confirmation.ts` (khối «Phí đưa đón», bảng bốn cột) — gộp chỉ ở lớp dựng DTO gửi khách, không đổi dòng tiền (Hiến chương 5.4); công tắc của Toàn quyền dùng ô `settings.ops`; sổ vàng `golden/phi-dua-don.json` (Hiến chương 5.17); giữ đơn khi thiếu (Hiến chương 5.7).
