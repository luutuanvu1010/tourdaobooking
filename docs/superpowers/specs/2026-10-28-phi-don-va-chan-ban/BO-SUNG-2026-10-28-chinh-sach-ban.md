# Bổ sung 28/10 cho đề xuất ADR «Chính sách bán theo loại đối tác» (bản 25/10)

**Trạng thái: đề xuất, chờ chủ duyệt** cùng bản gốc `../2026-10-25-chinh-sach-ban-va-gui-don/DE-XUAT-ADR-chinh-sach-ban-theo-loai-doi-tac.md` (lượt 2 của trang ghép 25/10). Bản gốc là hồ sơ có ngày nên không sửa; tờ này chỉ ghi những gì ngày 28/10 làm đổi. Khi duyệt, bản gốc cộng tờ này chép thành **một** ADR trong `docs/adr/`, số cấp lúc chép. AI soạn, không tự duyệt (Hiến pháp N3). Đọc kèm `TRANG-GHEP.md` cùng thư mục.

## Lời chủ 28/10
- Chủ nêu: tài khoản bên ngoài không đặt được vài dịch vụ Hòn Tằm; luật cho phép hiển thị và đặt theo nhóm tài khoản.
- Hộp chọn 28/10, câu (a) «Ai đặt và gỡ luật»: chủ gõ **«Quản trị, toàn quyền và bán hàng»** (nguyên văn), rộng hơn hai phương án được đưa ra là «Chỉ Toàn quyền» và «Quản trị và Toàn quyền».
- Câu (b) «Bên ngoài là ai»: chủ chọn **«Theo loại đối tác»**. Nghĩa giống hộp chọn 25/10: xét **bên đặt** của đơn, văn phòng đặt hộ cũng bị chặn, và người đặt luật chọn loại nào bị chặn.
- Lời 28/10 thay câu chủ viết ngày 13/10 (bảng việc yêu cầu 5, «Toàn quyền chọn nhóm dịch vụ nào hiện cho vai nào») ở hai chỗ. Thứ nhất, người đặt luật rộng hơn. Thứ hai, đối tượng bị chặn là loại đối tác, không phải mọi vai.
- Ví dụ Hòn Tằm làm như sau. Mỗi dịch vụ Hòn Tằm cần chặn là một dòng phạm vi `SERVICE`, lặp cho từng loại đối tác bị chặn. Chặn cả nhóm thì dùng một dòng phạm vi `GROUP`.

## Đổi so với bản 25/10
1. **Thay Đ5 (ai đặt luật).**
   - Bỏ ô `settings.ops`. Thêm ô quyền mới `sales.block.write` (tên tạm), phạm vi `any` cho Bán hàng, Quản trị và Toàn quyền, vì luật không có người sở hữu. Các nhóm còn lại không có ô này: Kế toán, Hiện trường, Đối tác, Thực tập, Tài xế, Tài xế đối tác, Nhân sự.
   - Route đọc, thêm và kết thúc luật đặt sau **cổng văn phòng**, vì Bán hàng không qua được cổng quản trị.
   - Màn «Luật bán» nằm trong menu văn phòng, không đặt chung màn với cờ «cần xác nhận» nữa. Cờ đó vẫn chỉ Toàn quyền đặt.
   - Nhật ký ghi tài khoản người thêm hoặc gỡ.
   - Ô này là một thao tác mới, không phải mã quyền mới. Vì vậy bài «mỗi ô được máy chủ hỏi» phải phủ nó, còn các bài tập con quyền không bị nhân đôi.
2. **Các cổng ở Đ3 nay là cửa thật.**
   - Ba cửa Gửi xác nhận, Còn vé và Gửi đơn đã có trên `main` từ bản 2.36 (ADR-0136). Cả ba dùng chung hàm cổng xác nhận `kiemCongXacNhan`.
   - Cổng luật bán đứng **đầu** danh sách cổng, trước luật giá danh mục R2: dịch vụ đã «không bán» thì các cổng sau không còn nghĩa.
   - Đối tác bấm Gửi đơn mà dính luật bán thì nhận 409 `sales_blocked` và đơn ở lại nháp (ADR-0136 Đ13.2). Đơn **không** chuyển sang «chờ xác nhận» như khi thiếu phí đón, vì văn phòng cũng không được bán dịch vụ đó cho bên đặt này.
3. **Việc bắt buộc trước khi đặt luật đầu tiên.** Bản 25/10 để mục này ở «Điều chưa chắc»; nay nó thành bước của runbook.
   - Toàn quyền gắn loại cho hồ sơ cá nhân của **mọi** tài khoản Đối tác.
   - Chủ chạy một câu đếm chỉ đọc: tài khoản Đối tác chưa gắn hồ sơ, hoặc hồ sơ chưa mang loại nào. Những tài khoản này **không bị luật nào chặn**.

Các điều còn lại của bản 25/10 giữ nguyên: Đ1 (bảng chỉ có dòng chặn), Đ2 (xét theo bên đặt), Đ3 (trừ phần thứ tự ở mục 2 trên), Đ4 (lọc danh mục), Đ6 (hàng rào máy), cùng các phương án bị bác.

## Điều chủ cần biết (nói một lần)
- Bán hàng gỡ được một luật rồi đặt đơn ngay cho bên đang bị chặn. Máy không ngăn việc này; chỉ nhật ký ghi tên người gỡ. Muốn ngăn thì bỏ Bán hàng khỏi ô mới: sửa một dòng mã, không cần migration.
- Lượt duyệt này vẫn có 4 điều chạm quyền hoặc dữ liệu (Đ1, Đ3, Đ4, Đ5 mới). Ngày 25/10 chủ đã cho lượt này vượt trần. Lượt này **không gộp** với lượt phí đón.

## Tiêu chí nghiệm thu thêm (cộng vào 9 tiêu chí của bản 25/10)
10. Bán hàng thêm luật nhận 201, kết thúc luật nhận 200, cả hai có nhật ký. Kế toán, Đối tác, Thực tập, Nhân sự làm hai việc đó thì nhận 403.
11. Luật chặn một dịch vụ Hòn Tằm cho loại X. Đối tác loại X không thấy dịch vụ đó trong danh mục lập đơn. Gọi thẳng Gửi đơn với dịch vụ đó thì nhận 409 `sales_blocked`, đơn vẫn là nháp. Dịch vụ Hòn Tằm khác vẫn đặt được.
12. Một đơn vừa dính luật bán vừa thiếu phí đón: câu trả về là `sales_blocked`, vì cổng này đứng đầu.
