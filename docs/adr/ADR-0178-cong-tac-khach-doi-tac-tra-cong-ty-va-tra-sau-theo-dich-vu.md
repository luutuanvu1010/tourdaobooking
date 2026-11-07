# ADR-0178 — Công tắc «Khách của đối tác trả cho Công ty» và «Trả sau theo dịch vụ»

- **Trạng thái:** **accepted** 2026-11-06 — chủ dự án, nguyên văn: *«Duyệt ADR-0178»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt ADR-0178 để giao thi công chứ?»), sau khi được báo: phần viết lại ở bản thứ hai chưa có người kiểm độc lập; nên đọc lại bảng «Chủ chọn» ở đặc tả vì các hàng về tiền trùng phương án khuyến nghị; ca rủi ro lớn nhất ở mục Hệ quả. Người ghi chép ghi lại lời chủ; không tự duyệt (Hiến pháp N3). Tám lựa chọn chủ đã chọn cùng ngày nằm trong đặc tả. Người kiểm độc lập đã đọc bản thứ nhất, các phát hiện đã đưa vào bản này.
- **Nguồn:** `docs/superpowers/specs/2026-11-06-thu-tien-doi-tac-va-tra-sau-theo-dich-vu-design.md` (lời chủ, bảng từng đường ghi tiền, tiêu chí nghiệm thu, trang ghép). Lệch giữa hai nơi: ADR này thắng.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). **Cửa:** hai chiều về hành vi (Bật lại công tắc, gỡ dấu); dữ liệu chụp trên đơn ở lại.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1, Đ2, Đ3). Trang ghép ở đặc tả.
- **Xây trên lỗ đang hở:** `TNV-G1`, `HC-5.19`, `HC-4.2`. Chủ đã trả lời, nguyên văn: *«không, câu cuối là cho xây, lên trước diễn tập»*, tức cho xây và cho phát hành trước diễn tập khôi phục, giống ADR-0172. Đã ghi dòng `xay_tren_cho_phep_adr_0178` ở ba mục của `docs/quyen-hoan.json` cùng ngày duyệt; chủ nói khác thì bỏ dòng đó.
- **Quan hệ với ADR cũ:**
  - **Sửa** ADR-0173 Đ1 mục 2 («không cho vượt hạn mức, không có ngoại lệ theo đơn»), ADR-0168 Đ1 mục 4 («không có dòng hiệu lực thì chỉ trả trước») và Đ2 mục 3 (từ chối khi không có hạn mức): đơn Trả sau theo dịch vụ đứng ngoài hạn mức.
  - **Đổi nghĩa** ADR-0058 Đ3 (Quản trị gán nhóm dịch vụ bằng `admin.manage`): gán dịch vụ vào nhóm có dấu là cho dịch vụ đó Trả sau theo dịch vụ. Chủ đã chọn điều này.
  - **Siết thêm** ADR-0078 điều 7, ADR-0132, ADR-0159 Đ1 mục 3, ADR-0108 (QR) cho riêng đơn mang dấu Tắt.
  - **Áp nguyên cho loại đơn mới:** phần còn lại của ADR-0168, ADR-0172, ADR-0173 (giờ, ân hạn, nhắc, nới hạn, chặn khi quá hạn, hoa hồng sau khi thu đủ), và ADR-0177 nếu được duyệt.
  - **Giữ:** ADR-0079 điều 3 (ai cầm tiền khách thì nợ Tour Đảo), ADR-0090 (quyền tiền), ADR-0153 (vé hãng ngoài đã lộ không về kho). ADR-0175 (proposed) không chồng: vé Tour Đảo của đơn đối tác vẫn đi nhánh Trả sau sẵn có của cổng mở vé.

## Bối cảnh

Hôm nay khách của đơn đại lý có thể trả cho Công ty (chuyển khoản, QR, nhân viên hoặc hướng dẫn viên thu); khi đó Công ty cầm tiền và nợ đại lý hoa hồng. Chủ muốn tắt được kênh này cho đơn đối tác tự lập, để Công ty không còn khoản nào thu giùm đối tác. Đồng thời chủ muốn một số dịch vụ (ví dụ vé tham quan tour đảo) cho đối tác trả sau mà không cần hạn mức.

## Đ1 — Công tắc và dấu trên đơn

1. Bảng cài đặt chỉ thêm của `billing`, một công tắc chung «Khách của đối tác trả cho Công ty», mặc định Bật. Đơn tài khoản giữ quyền Đối tác lập (kể cả nháp) thì `orders` chụp trạng thái công tắc lúc lập, một lần, CSDL cấm đổi. Đơn văn phòng lập không có dấu.
2. Đơn mang dấu Tắt: mọi khoản khách trả mới phải có người thu là **hồ sơ của tài khoản Đối tác đã lập đơn**, không theo ô bên đặt. Một hàm duy nhất của `billing` quyết, gọi ở mọi đường «chặn» trong bảng của đặc tả, **trước** lô ghi (lô xác nhận có khai cọc trả 409, không bỏ khoản cọc); có bài quét nơi gọi và lớp CSDL. Khoản hoàn cho khách, đảo khoản thu, chi hoàn cọc được miễn. Biên nhận không hiện QR công ty. `orders` không đọc `bil_*`: dấu sang `billing` qua view công bố của `orders`.
3. Bất biến mới trong `audit-invariants`: đơn mang dấu Tắt không có khoản khách trả còn hiệu lực nào có người thu khác hồ sơ người lập.

## Đ2 — Trả sau theo dịch vụ

1. Bảng cài đặt chỉ thêm của `billing`: dòng theo nhóm hoặc theo dịch vụ, thời hạn trả và ân hạn (giờ, khuôn ADR-0172 Đ3). Dịch vụ có dấu khi có dòng riêng hoặc nhóm hiện tại có dòng. Đánh dấu được mọi dịch vụ; dịch vụ có vé hãng ngoài chỉ hiện cảnh báo. Dịch vụ nhập tay không bao giờ có dấu.
2. Đơn đủ điều kiện khi bên đặt là hồ sơ mang loại đối tác được hưởng hoa hồng và mọi dịch vụ đều có dấu; khi đó chọn được Trả sau dù không có hạn mức. Lúc xác nhận: không kiểm hạn mức, không tính vào nợ dùng hạn mức; vẫn từ chối khi bên đặt có đơn Trả sau bất kỳ loại nào đã hết ân hạn còn nợ (kiểm độc lập với hạn mức); vẫn qua câu gác phiên bản của ADR-0168 Đ2 mục 4. Hạn trả = giờ xác nhận + số giờ nhỏ nhất của các dịch vụ. Loại Trả sau và hai mốc giờ chụp lúc xác nhận, khoá sau «Xong và đủ tiền».
3. Sau xác nhận, mọi luật Trả sau còn lại áp nguyên. Sửa làm đơn có dịch vụ không có dấu thì từ chối. Màn nợ tách «theo hạn mức» và «theo dịch vụ»; «còn được dùng» chỉ tính số thứ nhất.

## Đ3 — Hai ô quyền mới

Đổi công tắc và đánh dấu Trả sau theo dịch vụ: **chỉ Toàn quyền** (khuôn `chiToanQuyen()`). Xem hai cài đặt: Toàn quyền, Kế toán, Quản trị. Ô ghi khoản thu sẵn có bị siết thêm theo Đ1 mục 2; không nới ô nào. Ô gán nhóm của Quản trị giữ nguyên giá trị nhưng đổi nghĩa như ghi ở trên.

## Phương án đã loại

- **Chỉ giấu lựa chọn trên màn ghi khoản thu.** Rẻ, nhưng còn năm đường ghi khác và QR, nên «khoản thu giùm = 0» không đúng thật.
- **Người thu theo ô bên đặt.** Bên đặt có thể là khách lẻ hoặc bị văn phòng đổi sau xác nhận, làm đơn không ghi được tiền hoặc vỡ bất biến.
- **Áp công tắc theo giá trị hiện tại cho mọi đơn.** Chủ không chọn: khách đã được dặn chuyển khoản cho Công ty sẽ không ghi được.
- **Tính đơn theo dịch vụ vào hạn mức.** Chủ không chọn: đối tác không có hạn mức thì vẫn không dùng được.
- **Chặn đánh dấu dịch vụ có vé hãng ngoài; dấu nhóm chỉ áp cho dịch vụ có sẵn lúc đánh dấu.** Chủ chọn ngược lại ở cả hai câu.

## Hệ quả chủ cần biết

- **Ca rủi ro lớn nhất:** đơn đối tác lập lúc Tắt, toàn dịch vụ có dấu, chọn Trả sau. Đối tác cầm toàn bộ tiền khách, vé mở ngay, nợ không có trần, chỉ có hạn trả. Vé hãng ngoài đã gửi không lấy lại được. Quản trị chuyển dịch vụ vào nhóm có dấu là mở ca này cho dịch vụ đó.
- Đơn Trả trước mang dấu Tắt chỉ mở vé sau khi đối tác nộp tiền và Kế toán ghi nhận; hướng dẫn viên không ghi thu tại cảng cho đơn đó được; Kế toán không dùng được «Ghi khoản thu đòi được» cho đơn đó.
- Kế toán phải xem cả hai con số nợ để biết tổng rủi ro của một đối tác.
- Phát hành trước diễn tập khôi phục: lỡ hỏng dữ liệu thì chưa chắc khôi phục được, chủ đã chọn biết điều này.
- **Chưa kiểm:** biên nhận của đơn mang dấu Tắt khi đối tác đã ghi «Tôi thu»; báo cáo khoá tháng với đơn Trả sau theo dịch vụ; số đối tác thật trên production không mang vai được hưởng (họ không dùng được Việc 2).
