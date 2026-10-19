# Bước Xác nhận đơn: luồng làm việc thực tế trước và sau thay đổi

- Ngày: 2026-10-19. Vai: phân tích viên nghiệp vụ, chỉ đọc mã. Đây là hồ sơ có ngày, viết xong thì đóng băng.
- Đối chiếu bản thiết kế chờ duyệt `2026-10-19-xac-nhan-don-design.md` với mã thật trên bản sửa riêng `worktree-xac-nhan-don` hôm nay.
- Quy ước: "đã kiểm" nghĩa là tôi đã đọc đúng chỗ mã đó (dẫn chứng ở cuối tệp). "Chưa kiểm" nghĩa là suy đoán hoặc phụ thuộc cấu hình thật trên production.

## 1. Tóm tắt

Thay đổi lớn nhất là đơn có dịch vụ "cần xác nhận" (ví dụ vé Vinpearl kèm buffet) không còn đi thẳng từ nháp sang đã xác nhận. Người lập phải bấm "Gửi xác nhận", rồi một người nội bộ kiểm vé và chọn Còn vé hoặc Hết vé. Khách chỉ nhận QR và email sau bước đó, và mỗi dịch vụ đều phải trả lời rõ "Đón" hay "Không đón" kèm khung giờ đón. Với Bán hàng nội bộ, nếu giữ mặc định cho tự xác nhận thì việc hằng ngày chỉ thêm một lần chọn Còn vé. Người thật sự phải chờ là Đối tác và Thực tập, vì hôm nay họ đang tự xác nhận được đơn của mình.

## 2. Hôm nay và sau thay đổi, theo từng người

Ca dùng xuyên suốt: chị Lan (Bán hàng) lập đơn vé Vinpearl kèm buffet trưa cho 4 khách, đón 08:00 sáng mai tại khách sạn ở Trần Phú.

**Người lập đơn nội bộ (chị Lan).** Hôm nay chị điền đơn rồi bấm lưu, Nền tảng chuyển sang trang đơn và tự bật hộp "Xác nhận đơn để gửi khách" kèm ảnh có tiêu đề "XÁC NHẬN ĐƠN DỊCH VỤ", dù đơn còn nháp. Chị có thể bấm "QR thanh toán" ngay, gửi khách, rồi bấm "Xác nhận đơn" lúc nào cũng được. Phần đưa đón chỉ tự mở với dịch vụ có mẫu một chiều hoặc khứ hồi; vé Vinpearl thì chỉ hiện dòng chữ nhỏ "Không đưa đón", nên chị dễ quên thêm lượt đón. Sau thay đổi, ở mỗi dịch vụ chị phải chọn "Đón" hoặc "Không đón". Chọn Đón thì chị chọn khung "08:00–08:30" hoặc "Giờ khác" để gõ giờ cụ thể. Chị bấm "Gửi xác nhận", đơn hiện "Chờ xác nhận", nút QR biến mất và chị không sửa được đơn nữa. Muốn sửa thì chị bấm "Rút lại" để đơn về nháp. Nếu công tắc tự xác nhận đang bật, chính chị mở hộp xác nhận, chọn Còn vé rồi bấm Xác nhận. Xong bước đó, chị và người bấm nhận thông báo trong Nền tảng, còn khách đứng tên đặt và chị nhận email có QR.

**Người lập là Đối tác hoặc Thực tập.** Hôm nay một đại lý đối tác lập đơn rồi tự bấm xác nhận được, miễn mọi dòng đúng giá danh mục (đã kiểm). Sau thay đổi, họ chỉ gửi xác nhận rồi chờ. Theo luật thông báo hiện nay, Đối tác và Thực tập không nhận tin về đơn khi đơn được xác nhận hay bị huỷ (đã kiểm). Vì vậy, nếu không làm thêm một loại tin riêng cho họ, họ sẽ không biết kết quả trừ khi tự mở lại đơn hoặc đọc email.

**Người xác nhận (Bán hàng khác, Kế toán, Hướng dẫn viên, Quản trị).** Hôm nay chỉ người lập, người phụ trách đơn, Quản trị và Toàn quyền xác nhận được. Kế toán và Hướng dẫn viên không xác nhận được đơn nào, còn Bán hàng không xác nhận được đơn của người khác (đã kiểm). Sau thay đổi, anh Minh (Bán hàng khác) thấy đơn của chị Lan trong danh sách chờ, gồm dịch vụ, ngày, 4 khách, khung giờ đón và tiền. Anh gọi Vinpearl hỏi chỗ, chọn Còn vé rồi bấm Xác nhận, hoặc chọn Hết vé để huỷ đơn kèm lý do "Hết chỗ". Anh được sửa ngày và giờ đón; tiền chỉ người có quyền sửa tiền mới sửa được, và phải ghi lý do. Nếu chặng đón đã sát mốc tối thiểu, nút Xác nhận bị khoá cho tới khi Quản trị hoặc Toàn quyền bấm "Đặt gấp", giống hôm nay. Hai người cùng bấm Xác nhận thì người sau nhận câu báo "vừa có người đổi", vì hôm nay máy chủ đã khoá theo lần cập nhật cuối (đã kiểm).

**Hướng dẫn viên nhận đơn tự do.** Hôm nay hàng chờ nhận của Hướng dẫn viên đã gồm cả đơn nháp chưa có người phụ trách, và nút Nhận chỉ chặn đơn đã huỷ (đã kiểm). Tức là anh Tùng (HDV) có thể nhận đơn của chị Lan ngay khi nó còn nháp. Theo thiết kế, đơn chỉ thành "đơn tự do" sau khi xác nhận, nên đơn đang chờ phải bị ẩn khỏi hàng chờ nhận; thiết kế chưa nói điều này. Ngoài ra anh Tùng còn được thấy danh sách chờ xác nhận (nới quyền xem có giới hạn), dù hôm nay anh chỉ xem được đơn mình phụ trách.

**Điều phối xe và tài xế.** Hôm nay phân hệ Vận chuyển chỉ nhận chặng của đơn đã xác nhận (đã kiểm), nên đơn chờ xác nhận tự động không lọt vào xếp xe. Sau thay đổi, điều phối thấy chặng có khung giờ đón và giờ hẹn bằng giờ đầu khung (08:00). Giờ đón thật vẫn do điều phối ghi, và khách được báo trước rằng giờ có thể điều chỉnh.

**Kế toán thu tiền.** Hôm nay ai có quyền thu đều ghi được khoản thu lên đơn nháp, vì Nền tảng chỉ chặn ghi thu ở đơn đã huỷ (đã kiểm). Sau thay đổi, đơn đang chờ không được ghi thu, và khách chỉ chuyển khoản sau khi nhận QR. Nội dung chuyển khoản vẫn mang mã đơn như hôm nay, nên việc đối soát không đổi.

**Khách hoặc đại lý nhận email QR.** Hôm nay không có email nào gửi khách; nhân viên tự gửi ảnh QR qua Zalo. Sau thay đổi, ngay khi xác nhận, người đứng tên đặt nhận email gồm mã đơn, dịch vụ, ngày đi, khung giờ đón kèm câu lưu ý, tổng tiền, ảnh QR và số tài khoản. Với đơn qua đại lý, đại lý nhận email chứ không phải khách lẻ. Khách không có email thì không nhận gì, và nhân viên tự gửi QR như cũ.

**Toàn quyền trên Bảng điều khiển.** Hôm nay các công tắc nằm rải rác ở trang Tôi, trang giao diện, trang trợ lý, trang chính sách điều phối và trang phiên đăng nhập. Sau thay đổi, một trang gom theo việc: đánh dấu dịch vụ cần xác nhận, công tắc tự xác nhận, khung giờ đón và câu lưu ý, cùng lối vào các trang cũ.

## 3. Các ca đi qua luồng theo bản thiết kế

| Ca | Điều xảy ra theo thiết kế |
|---|---|
| Còn vé | Người xác nhận chọn Còn vé, bấm Xác nhận; đơn thành đã xác nhận, gửi email QR và báo người lập. |
| Hết vé | Đơn bị huỷ với lý do "Hết chỗ" (nhóm Công ty huỷ), người lập nhận thông báo, khách không nhận email. |
| Quá 15 phút không ai xác nhận | Đơn hiện cảnh báo ở khối "Việc của bạn" trên Trang chủ; không tự huỷ, không có tin đẩy. |
| Chặng đón dưới mốc tối thiểu | Gửi được, nhưng nút Xác nhận khoá cho tới khi Quản trị/Toàn quyền bấm Đặt gấp. |
| Người lập muốn sửa khi đang chờ | Bấm Rút lại về nháp, sửa, gửi lại; đồng hồ 15 phút tính lại từ đầu. |
| Đơn có cả dịch vụ cần xác nhận và dịch vụ thường | Cả đơn phải chờ, kể cả dịch vụ thường như xe đưa đón. |
| Đơn đại lý | Email gửi đại lý (người đứng tên đặt), không gửi khách lẻ của đại lý. |
| Đơn có cọc | QR ghi số tiền cọc còn phải thu thay vì số còn lại; hôm nay QR chỉ biết số còn lại, nên đây là cách tính mới. |
| Khách không có email | Bỏ qua, ghi nhật ký "chưa gửi được"; việc xác nhận vẫn xong. |
| Đêm khuya, cuối tuần không ai trực | Thiết kế chưa nói; đơn nằm chờ, chỉ có cảnh báo trên Trang chủ máy tính. |
| Đã xác nhận rồi khách đổi ngày | Thiết kế chưa nói; theo mã hôm nay, đổi ngày đi luồng sửa thông tin chuyến, không ai kiểm lại vé ngày mới. |
| Sửa tiền khi xác nhận | Sửa như sửa nháp, bắt lý do khi tổng tiền đổi, ghi nhật ký. |

## 4. Chỗ còn hở hoặc dễ vướng khi chạy thật

**4.1. Đơn đang chờ đã có thể bị Hướng dẫn viên nhận (cao, đã kiểm).** Như mục 2, hàng chờ nhận hôm nay lấy cả đơn nháp, mà thiết kế lại lưu "Chờ xác nhận" dưới dạng nháp. Hệ quả là một HDV có thể nhận đơn rồi đơn bị huỷ vì Hết vé, hoặc đơn sau xác nhận không còn là "đơn tự do" như chủ muốn. Tôi đề xuất ẩn đơn đang chờ khỏi hàng chờ nhận và chặn nút Nhận với đơn đó ở cả máy chủ.

**4.2. Tiền có thể đã thu từ lúc nháp (cao, đã kiểm).** Thiết kế viết "không có lần thu nào trước xác nhận nên không chạm lỗ TNV-G1", nhưng hôm nay ghi thu lên đơn nháp vẫn được. Một đơn nháp đã thu cọc tiền mặt, sau đó gửi xác nhận và gặp Hết vé, sẽ thành đơn huỷ còn giữ tiền, đúng lỗ TNV-G1 đang hở. Tôi đề xuất chặn "Gửi xác nhận" khi đơn đã có khoản thu (hoặc bắt chọn cách xử lý), đồng thời chặn ghi thu trong lúc chờ. Nếu không làm vậy thì phần A phải ghi "xây trên lỗ đang hở: TNV-G1".

**4.3. Không ai được báo khi có đơn mới cần xác nhận (cao, đã kiểm một phần).** Thiết kế chỉ báo sau khi xác nhận xong, còn lúc gửi thì không báo ai. Cảnh báo quá 15 phút lại nằm ở khối "Việc của bạn", mà khối này chỉ có trên Trang chủ máy tính, điện thoại ẩn đi, và chỉ hiện cho người xem được mọi đơn, tức không có HDV (đã kiểm). Tin đẩy hiện nay cũng không rung trong giờ yên lặng 22:00–06:00 với tin thường (đã kiểm). Hệ quả là một đại lý gửi đơn lúc 21:00 cho chuyến 07:30 sáng hôm sau có thể không ai thấy tới sáng, và tới lúc đó chặng đã dưới mốc nên phải chờ thêm Quản trị bấm Đặt gấp. Tôi đề xuất gửi tin đẩy loại quan trọng cho nhóm người xác nhận ngay khi có đơn gửi lên, và chủ chỉ định người trực ngoài giờ.

**4.4. Mười lăm phút có thực tế không (vừa, chưa kiểm).** Gọi nhà cung cấp như Vinpearl ngoài giờ hành chính có thể mất lâu hơn 15 phút. Vì quá hạn chỉ hiện cảnh báo chứ không huỷ, rủi ro chủ yếu là cảnh báo đỏ thường xuyên đến mức mọi người bỏ qua. Tôi đề xuất chạy thử hai tuần rồi xem số đơn quá hạn trước khi chốt con số.

**4.5. Ai sửa được tiền ở bước xác nhận (vừa, đã kiểm).** Thiết kế nói "chỉ ai đang có quyền sửa tiền theo bản đồ quyền hiện nay", nhưng cũng nói "sửa thẳng như sửa nháp". Hôm nay hai quyền này khác nhau: sửa nháp thì Kế toán không có, còn sửa tiền sau xác nhận thì Kế toán có với mọi đơn, còn Bán hàng chỉ với đơn mình lập (đã kiểm). Hai câu trong thiết kế cho ra hai đáp án khác nhau cho Kế toán, nên cần chủ chốt.

**4.6. "Không thấy SĐT/email khách" thực chất chỉ áp cho HDV (thấp, đã kiểm).** Bán hàng, Kế toán và Quản trị hôm nay đã xem được liên hệ khách của mọi đơn, nên ẩn ở màn xác nhận không bảo vệ thêm gì với họ. Điều đáng lo hơn là thông tin dùng để kiểm vé: nếu nhà cung cấp đòi tên khách hoặc số giấy tờ (chưa kiểm), HDV sẽ không kiểm được.

**4.7. Ảnh "xác nhận" vẫn gửi được trước khi xác nhận (cao, đã kiểm).** Ngay sau khi lập đơn mới, Nền tảng tự bật hộp "Xác nhận đơn để gửi khách" với ảnh tiêu đề "XÁC NHẬN ĐƠN DỊCH VỤ" ở mọi trạng thái, chỉ có huy hiệu nhỏ ghi "Nháp" (đã kiểm). Ảnh không có số tài khoản hay QR (đã kiểm), nhưng khách vẫn có thể hiểu là đơn đã chắc chắn có vé. Thiết kế chưa nhắc chỗ này. Tôi đề xuất không tự bật hộp này với đơn cần xác nhận, và đổi tiêu đề ảnh của đơn chưa xác nhận.

**4.8. Email gửi đại lý ghi giá bán lẻ (vừa, chưa kiểm).** Số tiền của đơn là giá bán cho khách, còn hoa hồng đại lý tính riêng ở sổ đại lý. Nếu đại lý quen trả phần đã trừ hoa hồng, một QR ghi đủ giá bán lẻ có thể khiến họ trả thừa hoặc thắc mắc. Đại lý cũng có thể chuyển tiếp email (có giá bán lẻ và số tài khoản công ty) cho khách. Tôi đề xuất hỏi Kế toán cách đại lý thanh toán hôm nay trước khi chốt nội dung thư.

**4.9. Gửi email ra ngoài (vừa, chưa kiểm).** Chức năng gửi thư đang dùng là dịch vụ email của Cloudflare ở dạng thử nghiệm (đã kiểm ghi chú cấu hình). Tôi chưa kiểm nó có gửi tới hộp thư Gmail của khách bất kỳ ổn định không, và thư có QR cùng số tài khoản dễ bị lọc là thư rác. Tôi đề xuất gửi thử tới vài địa chỉ ngoài trước khi phát hành.

**4.10. Khung giờ đón và giờ hẹn của xe (thấp, đã kiểm một phần).** Lấy giờ đầu khung làm giờ hẹn khớp với việc xếp xe hôm nay vốn bắt buộc có giờ hẹn. Mốc tối thiểu cũng sẽ tính theo giờ đầu khung, nên đơn chọn khung 08:00–08:30 bị coi là đón lúc 08:00. Điều cần nói rõ với nhân viên là khung là lời hứa mềm với khách, còn giờ đầu khung là giờ xe phải có mặt.

**4.11. Đơn đã xác nhận trước ngày áp dụng và nháp đang dở (thấp, suy đoán).** Đơn đã xác nhận không bị đòi lại, đúng thiết kế. Nhưng nháp tạo trước ngày áp dụng, có dịch vụ vừa được đánh dấu "cần xác nhận", sẽ phải đi bước mới; nhân viên có thể ngạc nhiên vì nút "Xác nhận đơn" quen thuộc biến mất. Nên báo trước một ngày.

**4.12. Hết vé tính vào nhóm "Công ty huỷ" (thấp đến vừa, đã kiểm).** Lý do "Hết chỗ" thuộc nhóm Công ty huỷ. Thống kê huỷ sẽ dồn các ca nhà cung cấp hết chỗ vào lỗi của công ty, và luật hoàn cọc theo nhóm (hạn hoàn chỉ chặn nhóm khách huỷ) cũng áp theo đó. Vì đơn chờ không có tiền nên ảnh hưởng tiền thấp, nhưng con số thống kê sẽ lệch.

**4.13. Ảnh hưởng tới Bảng tin, thống kê, sổ tiền (thấp, suy đoán).** Vì đơn chờ vẫn là nháp, ô "Đơn nháp" trên Trang chủ sẽ đếm lẫn nháp thật và đơn đang chờ. Bảng tin cũng cần phát tin khi có đơn gửi hoặc rút lại để danh sách chờ của người khác tự làm mới. Sổ tiền không bị ảnh hưởng nếu chặn được ghi thu như 4.2.

**4.14. Người lập không tự huỷ được đơn đang chờ (thấp, suy đoán).** Thiết kế chỉ cho người xác nhận chọn Xác nhận hoặc Huỷ. Nếu khách đổi ý trong lúc chờ, người lập phải Rút lại rồi huỷ, nghĩa là thêm một bước. Ngoài ra khi khách đổi ngày sau xác nhận, không ai kiểm lại vé cho ngày mới.

**4.15. Đào tạo (vừa, suy đoán).** Có ba thói quen phải đổi cùng lúc: không gửi QR trước xác nhận, chọn Đón/Không đón, và kiểm danh sách chờ. Tôi đề xuất cập nhật hướng dẫn theo vai trong Trợ giúp và trợ lý Mai ngay trong lần phát hành, kèm một mục nhật ký thay đổi nói rõ "vì sao nút QR biến mất".

Hai điều thiết kế lo nhưng mã hôm nay đã đảm bảo: đơn chưa xác nhận không lọt vào xếp xe, và hai người cùng bấm Xác nhận không tạo ra hai lần xác nhận (đã kiểm).

## 5. Câu hỏi cho chủ trước khi duyệt

1. **Ai nhận báo khi có đơn gửi xác nhận, nhất là ngoài giờ và trên điện thoại?** Khuyến nghị: gửi tin đẩy loại quan trọng (vẫn rung trong giờ yên lặng) cho mọi người xác nhận ngay lúc gửi, và chủ chỉ định một người trực tối và cuối tuần.
2. **Đơn đang chờ có được ẩn khỏi hàng chờ nhận của Hướng dẫn viên không?** Khuyến nghị: ẩn và chặn Nhận cho tới khi xác nhận xong, đúng ý "xác nhận xong mới thành đơn tự do".
3. **Có chặn ghi thu và chặn ảnh "xác nhận gửi khách" ngay từ lúc gửi xác nhận không, và đơn đã có tiền thu từ lúc nháp thì sao?** Khuyến nghị: chặn cả hai; đơn đã có tiền thu thì không cho gửi xác nhận cho tới khi Kế toán xử lý.
4. **Kế toán có được sửa tiền ở bước xác nhận không?** Khuyến nghị: có, theo quyền sửa tiền sau xác nhận (Kế toán, Quản trị, Toàn quyền, Bán hàng với đơn mình lập), vì Kế toán là người hay phát hiện sai giá.
5. **Hết vé tính vào nhóm "Công ty huỷ" hay một nhóm riêng như "Nhà cung cấp hết chỗ"?** Khuyến nghị: dùng tạm "Hết chỗ" như thiết kế cho lần đầu, ghi vào danh sách việc để sau tách nhóm riêng nếu thống kê bị lệch.

## Dẫn chứng (tệp:dòng, đọc ngày 2026-10-19)

- Quyền xác nhận hôm nay dùng chung ô sửa đơn; Kế toán và HDV "không", Bán hàng chỉ đơn mình/phụ trách, Đối tác/Thực tập đơn mình: `src/shared/permissions.ts:93`. Xem đơn và tiền của HDV chỉ đơn phụ trách: `:88`, `:89`. Liên hệ khách: `:91`. Sửa tiền sau xác nhận: `:109`. Phân loại lý do huỷ chỉ Quản trị/Toàn quyền: `:113`. Hàng chờ nhận của HDV: `:194`.
- Route xác nhận: hỏi ô sửa đơn `src/modules/orders/index.ts:1394`; kiểm giá danh mục cho Đối tác/Thực tập `:1414-1417`; khoá theo lần cập nhật cuối và mốc tối thiểu `:1439`; phân biệt "người khác vừa đổi", thiếu thông tin chuyến, cần đặt gấp `:1452-1474`.
- Hàng chờ nhận lấy cả đơn nháp: `src/modules/orders/repository.ts:592-598`; lọc thêm chỉ bỏ đơn huỷ: `src/modules/orders/pool.ts:79`. Nút Nhận chỉ chặn đơn huỷ: `src/modules/dispatch/index.ts:157-180`.
- Ghi thu không chặn nháp: `src/modules/billing/index.ts:82`, `:91-98`.
- QR: route không kiểm trạng thái `src/modules/receipt/index.ts:39-55`; nút hiện cả ở nháp `web/order.ts:528`; số tiền QR = số còn lại `src/modules/receipt/rules.ts:50-56`; tiền cọc dự kiến của đơn `src/modules/orders/repository.ts:961`.
- Ảnh xác nhận tự bật sau khi lập đơn, mọi trạng thái: `web/order.ts:95-108`; tiêu đề ảnh `src/shared/order-confirmation.ts:178`.
- Vận chuyển chỉ nhận chặng của đơn đã xác nhận: `src/modules/van-chuyen/dieu-phoi-doc.ts:113`, `src/modules/van-chuyen/dieu-phoi-dieu-chinh.ts:54`.
- "Việc của bạn" chỉ cho người xem mọi đơn: `src/shared/viec-cua-ban.ts:56`; điện thoại ẩn khối: `web/home.ts:334-335`. Giờ yên lặng: `src/shared/web-push.ts:38-47`.
- Tin về đơn không tới Đối tác/Thực tập: `src/shared/bang-tin.ts:152-156`; các loại tin đơn: `src/shared/thong-bao.ts:10`.
- Gửi thư qua dịch vụ email Cloudflare dạng thử nghiệm: `src/shared/gui-thu.ts:1-4`, `wrangler.jsonc:44-45`.
- Lý do "Hết chỗ" thuộc nhóm Công ty huỷ: `src/shared/ly-do-huy.ts:30`; hạn hoàn cọc chỉ chặn nhóm khách huỷ: `src/shared/contracts.ts:2136`.
- Dòng "Không đưa đón" trong khối đưa đón: `web/khoi-dua-don.ts:368`.
