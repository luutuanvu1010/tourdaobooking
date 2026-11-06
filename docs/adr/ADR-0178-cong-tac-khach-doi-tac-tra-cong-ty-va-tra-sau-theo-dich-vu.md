# ADR-0178 — Công tắc «Khách của đối tác trả cho Công ty» và Trả sau theo dịch vụ

- **Trạng thái:** **proposed** 2026-11-06 — chờ chủ dự án duyệt. Bốn lựa chọn chủ đã chọn ở hộp hỏi cùng ngày nằm trong đặc tả; các lựa chọn đó không phải lời duyệt ADR này.
- **Nguồn:** `docs/superpowers/specs/2026-11-06-thu-tien-doi-tac-va-tra-sau-theo-dich-vu-design.md` (lời chủ, tiêu chí nghiệm thu, trang ghép). Lệch giữa hai nơi: ADR này thắng.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). **Cửa:** hai chiều về hành vi (Bật lại công tắc, gỡ dấu miễn); dữ liệu chụp trên đơn ở lại.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1, Đ2, Đ3). Trang ghép ở đặc tả.
- **Xây trên lỗ đang hở:** `TNV-G1`, `HC-5.19`, `HC-4.2`. Chưa có lời chủ cho phép thì ADR này chưa duyệt được (`CLAUDE.md` §3). Đề nghị của người soạn (phương án an toàn): cho xây, **chỉ phát hành sau diễn tập khôi phục `HC-5.19`**, như ADR-0168. Tiền lệ khác chủ đã chọn: ADR-0172 cho Trả sau lên trước diễn tập; chủ chọn một trong hai khi duyệt.
- **Quan hệ với ADR cũ:**
  - **Sửa** ADR-0173 Đ1 mục 2 («không cho vượt hạn mức, không có ngoại lệ theo đơn»): đơn Trả sau theo dịch vụ đứng ngoài hạn mức.
  - **Siết thêm** ADR-0078 điều 7, ADR-0132, ADR-0159 Đ1 mục 3, ADR-0108 (QR) cho riêng đơn mang dấu Tắt: chỉ bên đặt là người thu.
  - **Thêm loại đơn** vào ADR-0168 (Trả sau) và ADR-0172, ADR-0173 (giờ, ân hạn, nhắc, nới hạn, xem nợ); các luật đó áp nguyên cho loại mới, trừ phần hạn mức.
  - **Giữ:** ADR-0079 điều 3 (ai cầm tiền khách thì nợ Tour Đảo), ADR-0090 (quyền tiền), ADR-0153 (vé hãng ngoài đã lộ không về kho).

## Bối cảnh

Hôm nay khách của đơn đại lý có thể trả cho Công ty (chuyển khoản, QR, nhân viên hoặc hướng dẫn viên thu); khi đó Công ty cầm tiền và nợ đại lý hoa hồng. Chủ muốn tắt được kênh này cho đơn đối tác tự lập, để Công ty không còn khoản nào thu giùm đối tác. Đồng thời chủ muốn một số dịch vụ (ví dụ vé tham quan tour đảo) cho đối tác trả sau mà không cần hạn mức.

## Đ1 — Công tắc và dấu trên đơn

1. Bảng cài đặt chỉ thêm của `billing`, một công tắc chung «Khách của đối tác trả cho Công ty», mặc định Bật. Đơn tài khoản giữ quyền Đối tác lập thì `orders` chụp trạng thái công tắc lúc lập, một lần, CSDL cấm đổi. Đơn văn phòng lập không có dấu.
2. Đơn mang dấu Tắt: mọi khoản thu mới phải có người thu là bên đặt của đơn. Một hàm duy nhất của `billing` quyết, gọi ở **mọi** nơi chèn khoản thu (danh sách ở đặc tả), có bài quét nơi gọi và lớp CSDL. Biên nhận không hiện QR công ty. `orders` không đọc `bil_*`: dấu đi sang `billing` qua view công bố của `orders`.
3. Bất biến mới trong `audit-invariants`: đơn mang dấu Tắt không có khoản thu còn hiệu lực nào có người thu khác bên đặt.

## Đ2 — Trả sau theo dịch vụ

1. Bảng cài đặt chỉ thêm của `billing`: dòng theo nhóm hoặc theo dịch vụ, thời hạn trả và ân hạn (giờ, khuôn ADR-0172 Đ3). Đánh dấu được mọi dịch vụ; dịch vụ có vé hãng ngoài chỉ hiện cảnh báo.
2. Đơn đủ điều kiện khi bên đặt là hồ sơ đối tác và mọi dịch vụ đều được miễn. Đơn đủ điều kiện chọn được Trả sau dù không có hạn mức. Lúc xác nhận: không kiểm hạn mức, không tính vào nợ dùng hạn mức; vẫn từ chối khi đối tác có đơn Trả sau bất kỳ loại nào đã hết ân hạn còn nợ; vẫn đi qua câu gác phiên bản của ADR-0168 Đ2 mục 4. Hạn trả = giờ xác nhận + số giờ nhỏ nhất của các dịch vụ. Loại Trả sau và hai mốc giờ chụp lúc xác nhận.
3. Sau xác nhận, mọi luật Trả sau còn lại áp nguyên. Thêm dịch vụ không được miễn vào đơn đã xác nhận thì từ chối.

## Đ3 — Hai ô quyền mới

Đổi công tắc và đánh dấu miễn: **chỉ Toàn quyền** (khuôn `chiToanQuyen()`). Xem hai cài đặt: Toàn quyền, Kế toán, Quản trị. Ô ghi khoản thu sẵn có bị siết thêm theo Đ1 mục 2, không nới ô nào.

## Phương án đã loại

- **Chỉ giấu lựa chọn trên màn ghi khoản thu.** Rẻ, nhưng còn bốn đường ghi khác và QR, nên «khoản thu giùm = 0» không đúng thật.
- **Áp công tắc theo giá trị hiện tại cho mọi đơn.** Chủ không chọn: khách đã được dặn chuyển khoản cho Công ty sẽ không ghi được.
- **Tính đơn theo dịch vụ vào hạn mức.** Chủ không chọn: đối tác không có hạn mức thì vẫn không dùng được.
- **Chặn đánh dấu dịch vụ có vé hãng ngoài.** Chủ chọn «Mọi dịch vụ».

## Hệ quả chủ cần biết

- **Ca rủi ro lớn nhất:** đơn đối tác lập lúc Tắt, toàn dịch vụ được miễn, chọn Trả sau. Đối tác cầm toàn bộ tiền khách, vé mở ngay, nợ không có trần, chỉ có hạn trả. Vé hãng ngoài đã gửi không lấy lại được.
- Đơn Trả trước mang dấu Tắt chỉ mở vé sau khi đối tác nộp tiền và Kế toán ghi nhận; hướng dẫn viên không ghi thu tại cảng cho đơn đó được.
- Đơn Trả sau theo dịch vụ không hiện trong «còn được dùng» của hạn mức, nên Kế toán phải xem thêm danh sách nợ theo dịch vụ để biết tổng rủi ro của một đối tác.
- Quản trị đổi nhóm dịch vụ có thể gián tiếp mở Trả sau cho dịch vụ mới vào nhóm đang miễn; câu này đang chờ chủ (đặc tả, mục «Câu còn mở»).
- **Chưa kiểm:** biên nhận của đơn mang dấu Tắt khi đối tác đã ghi «Tôi thu»; báo cáo khoá tháng với đơn Trả sau theo dịch vụ.
