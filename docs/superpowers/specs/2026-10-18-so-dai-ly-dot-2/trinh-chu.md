# Trình chủ duyệt — Sổ đại lý đợt 2 (18/10/2026)

**Làm xong đợt 2 thì được gì.** Đơn do đại lý đặt (HDV độc lập, công ty lữ hành, lễ tân, taxi, cộng tác viên) bấm được «Đã giao – đã thu đủ». Hôm nay các đơn này bị chặn hẳn ở bước đó. Lúc bấm, sổ tự ghi ba khoản: Tour Đảo nợ đại lý tiền hoa hồng; đại lý nợ Tour Đảo phần giảm giá họ đã cho khách; Tour Đảo nợ nhà cung cấp tiền vé (ví dụ i-resort). Sau đó đơn «Hoàn thành» được bằng nút nộp / trả từng đơn đã có. Phần quyết toán gộp cả tháng và màn để đại lý tự xem sổ là **đợt 3**, sẽ trình riêng sau khi đợt 2 xong.

**Những gì người dùng sẽ thấy khác:**
- Khi ghi tiền, chọn được «khách trả cho đại lý» hoặc «khách trả tại quầy nhà cung cấp». HDV chọn thì đơn chờ Kế toán xác nhận rồi mới «Đã giao» được (lựa chọn của bạn hôm nay).
- Trên đơn đại lý, ai sửa đơn cũng chỉ được giảm giá tối đa bằng hoa hồng của đơn, **kể cả Bán hàng và Quản trị**.
- Kế toán có nút «Chụp bù» cho đơn đại lý xác nhận trước ngày có bảng mức, và nút «Bên kia đã nhận».
- Biên nhận gửi khách chia hai phần khi đơn có vé do nhà cung cấp bán.
- Đối tác không còn thấy tên người đã thu tiền và tiền người khác đang giữ.

## Ba điều cần bạn duyệt

1. **Đặc tả đợt 2 và trang ghép** (`README.md`, `trang-ghep.md` cùng thư mục). Đặc tả áp đúng các quyết định bạn đã duyệt ngày 1/10, chỉ cập nhật theo những quyết định ra sau đó. Tám chỗ tôi tự quyết, đảo được, nằm ở mục 3 của đặc tả, nên bạn soát mục đó.
2. **ADR-0130** (`de-xuat-adr-khach-tra-ben-kia.md`): biến lựa chọn «Chờ Kế toán xác nhận» của bạn hôm nay thành quyết định chính thức, thay lựa chọn cũ ngày 1/10.
3. **Cho phép xây trên bốn lỗ còn ghi trong sổ hoãn** (TNV-G1, TNV-G3, TNV-G4, HC-4.2, đều thuộc sổ tiền, hạn 30/11). Phần chính của ba lỗ TNV đã vá trong mã; chỗ còn lại chủ yếu là ca vàng chưa ai xác nhận. Luật dự án không cho duyệt đặc tả chạm vùng này nếu bạn chưa nói rõ cho phép kèm lý do. **Khuyến nghị:** cho phép, với lý do «phần chính đã vá; đợt 2 không đổi luật hoàn cọc, thay lần thu hay điều chỉnh». Bạn đồng ý thì tôi ghi đúng câu của bạn vào sổ.

## Rủi ro phải nói thẳng

- **Dữ liệu thật.** Nền tảng đã mở cho người dùng. Lần phát hành này ghi một chiều lên đơn thật (chụp bù đơn cũ, dòng sổ mới). Lưới an toàn duy nhất là điểm khôi phục Time Travel, mà **việc khôi phục chưa từng được diễn tập** (HC-5.19, hạn 5/11). **Khuyến nghị:** diễn tập khôi phục trước ngày phát hành đợt 2.
- Trước khi phát hành, bạn chạy vài câu đếm chỉ-đọc mà tôi soạn sẵn, để biết bao nhiêu đơn cũ bị ảnh hưởng.

## Việc của Kế toán (làm song song, không chờ thi công)

- Xác nhận sáu tình huống tính tiền ở `phieu-ke-toan.md`. **Chưa xác nhận thì phần mã sổ đợt 2 không được nhận.**
- Trước ngày phát hành: cài mức hoa hồng cho mọi đơn đại lý đang chờ.

## Cách thi công (tôi khuyến nghị, không cần bạn chọn)

Kế hoạch có 15 việc (`docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-ke-hoach.md`). Mỗi việc do một trợ lý thi công và một người kiểm độc lập đọc lại, vì đây là việc chạm tiền (luật dự án bắt buộc). Toàn bộ đi trong **một lần phát hành**. Thi công ở một phiên riêng, không ở phiên lập kế hoạch này.

## Ngoài phạm vi, báo một lần

ADR-0099 (bạn duyệt ngày 3/10) cho Bán hàng đang phụ trách đơn được ghi lần thu, nhưng bản đồ quyền hiện vẫn chỉ cho Bán hàng ghi trên đơn mình lập. Tôi không thấy chỗ nào ghi đây là lệch có chủ ý. Đây là một việc nhỏ riêng, không thuộc đợt 2.
