# Câu hỏi gửi luật sư: ảnh chụp lúc làm việc gắn vào đơn, giữ 5 năm (bản nháp)

Hồ sơ có ngày 21/11/2026. BẢN NHÁP do AI soạn cho chủ dự án gửi luật sư; chưa phải ý kiến pháp lý. Đi kèm ADR-0232 (đề xuất) và phần thêm chính sách riêng tư cùng thư mục. Có thể gửi chung với các câu còn mở ở `docs/superpowers/specs/2026-11-16-chinh-sach-rieng-tu-ban-nhap/BAN-NHAP.md` mục 4 để luật sư trả lời một lần.

## Bối cảnh (gửi kèm, lời thường)

Công ty TNHH Tour Đảo (Nha Trang) bán tour biển đảo, có hướng dẫn viên và tài xế của công ty đi giao vé, đón khách, bàn giao khách cho tài xế taxi hoặc xe đối tác. Công ty muốn nhân viên chụp ảnh ngay lúc làm việc (ví dụ lúc trao vé cho khách, lúc khách lên xe) và lưu vào đơn hàng trên hệ thống nội bộ, để khi khách hoặc đại lý nói «chưa nhận vé», «không ai đón» thì có cái để đối chiếu.

Ảnh thường có mặt khách, có thể có trẻ em, có mặt nhân viên và tài xế. Ảnh không có vị trí GPS; giờ ghi theo máy chủ. Chỉ nhân viên văn phòng, kế toán và quản trị của công ty xem được; đại lý và khách không xem được. Mỗi lần mở ảnh đều được ghi lại ai mở, lúc nào. Ảnh lưu trên kho tệp của Cloudflare (nhà cung cấp hạ tầng, máy chủ có thể ở ngoài Việt Nam). Chủ muốn giữ ảnh **tối thiểu 5 năm**.

## Câu hỏi

1. **Căn cứ để chụp và lưu ảnh.** Công ty xử lý ảnh này dựa trên căn cứ nào theo Luật Bảo vệ dữ liệu cá nhân 2025 và văn bản hướng dẫn: sự đồng ý của khách, thực hiện hợp đồng dịch vụ tour, hay căn cứ khác? Nếu cần đồng ý của khách thì phải lấy thế nào khi khách mua qua đại lý và không có tài khoản trên hệ thống (ví dụ: ghi trong điều kiện đặt tour, nói miệng trước khi chụp, biển thông báo)?
2. **Ảnh mặt người thuộc loại dữ liệu nào.** Ảnh chụp thường (không dùng để nhận diện khuôn mặt bằng máy) có phải là dữ liệu cá nhân nhạy cảm không? Ảnh có trẻ em có cần điều kiện riêng (đồng ý của cha mẹ) không?
3. **Giữ 5 năm có được không, căn cứ gì.** Có văn bản nào bắt buộc hoặc cho phép công ty giữ loại ảnh này 5 năm (ví dụ thời hiệu khởi kiện tranh chấp hợp đồng, nghĩa vụ lưu chứng từ)? Nếu không có, thời hạn hợp lý anh/chị đề xuất là bao lâu?
4. **Khi người trong ảnh yêu cầu xoá trước 5 năm** (đây là câu quyết định cách làm). Chúng tôi có hai cách:
   - (A) Từ chối xoá, giữ ảnh tới hết 5 năm, trả lời người yêu cầu «ảnh được giữ tới ngày …, căn cứ …».
   - (B) Xoá ảnh khi có yêu cầu hợp lệ (trừ khi đang có tranh chấp đang giải quyết).

   Cách nào đúng luật? Nếu (A) thì căn cứ cụ thể là gì để ghi vào câu trả lời? Có ngoại lệ «đang tranh chấp thì được giữ» không và thời hạn của ngoại lệ đó?

   Lưu ý: phần lớn người trong ảnh là **khách mua qua đại lý, không có tài khoản** trên hệ thống, nên không dùng được nút «Yêu cầu xoá dữ liệu» trong tài khoản. Nếu câu trả lời là (B), công ty định nhận yêu cầu của khách qua email/điện thoại ghi trong chính sách, và quản trị tự tìm, xoá ảnh. Cách nhận yêu cầu như vậy có đủ không (cần xác minh người yêu cầu đúng là người trong ảnh thế nào)?
5. **Ảnh chụp nhầm giấy tờ tuỳ thân** (căn cước, hộ chiếu lọt vào khung): công ty định xoá ngay khi phát hiện. Như vậy có đúng không, hay có lý do phải giữ?
6. **Nhân viên và tài xế trong ảnh.** Nhân viên, tài xế của công ty xuất hiện trong ảnh: cần ghi điều gì trong hợp đồng lao động hoặc nội quy? Tài xế đối tác (không phải nhân viên) thì sao?
7. **Lưu trên máy chủ ở nước ngoài.** Kho ảnh của Cloudflare có thể đặt ngoài Việt Nam. Việc này có cần thủ tục chuyển dữ liệu ra nước ngoài (hồ sơ đánh giá tác động) không? Nếu đã cần cho phần dữ liệu khác của hệ thống thì phần ảnh có cần bổ sung gì không?
8. **Bản sao lưu.** Công ty sẽ sao lưu kho ảnh hằng tuần (đã mã hoá, cất trên Google Drive của công ty), bản cũ nhất giữ khoảng 12 tháng (có thể rút xuống khoảng 1 tháng cho riêng kho ảnh). Ảnh đã xoá theo yêu cầu vẫn nằm trong bản sao lưu tới khi bản đó hết hạn. Chỉ cần nói rõ điều này trong chính sách riêng tư là đủ, hay phải xoá cả trong bản sao lưu?
9. **Chữ trong chính sách riêng tư.** Nhờ anh/chị soát đoạn thêm ở `PHAN-THEM-CHINH-SACH.md` (gửi kèm): mục đích, ai xem, giữ bao lâu, quyền của người trong ảnh.

## Câu trả lời đổi cách làm thế nào (để chủ đọc)

- Câu 4 trả lời (A) và có căn cứ cụ thể ⇒ ADR-0232 dùng biến thể 7A: không ai gỡ được ảnh trước 5 năm.
- Câu 4 trả lời (B), hoặc không chắc ⇒ biến thể 7B (khuyến nghị): xoá được ảnh trước hạn khi có yêu cầu, cả của người có tài khoản lẫn khách gửi qua email/điện thoại; mọi đường khác vẫn bị chặn.
- Câu 3 cho số khác 5 năm ⇒ chỉ cần ghi số đó khi đăng chính sách (con số không nằm trong mã).
- Câu 5 trả lời «được giữ» ⇒ bỏ lệnh xoá ngay ảnh giấy tờ chụp nhầm (mặc định đang có).
- Câu 1 đòi đồng ý của khách ⇒ cần thêm bước ghi nhận đồng ý (việc riêng, chưa có trong ADR-0232).
