# Đặc tả ngắn: ngừng bán theo ngày khởi hành

> Ngày 2026-11-20. Trạng thái: **chủ duyệt 2026-11-20** trong chat, bấm nút trả lời «Duyệt theo khuyến nghị» (nút chỉ gửi đúng chữ đó): ba câu ở mục 5 lấy theo khuyến nghị, tức 1 = Quản trị và Quản lý bán hàng; 2 = nháp bị chặn ở lần lưu, gửi, xác nhận kế tiếp; 3 = tên «Ngừng bán theo ngày». Soạn theo `MAU-DAC-TA-NGAN.md`. Chưa thi công; chờ ADR ở `2026-11-20-DE-XUAT-ADR-ngung-ban-theo-ngay.md` cùng thư mục được duyệt.

## 1. Việc gì, cho ai, vì sao
Hôm nay nút «Ngừng bán» ở màn Dịch vụ & giá chỉ có bật hoặc tắt, có hiệu lực ngay và cho mọi ngày. Chủ muốn ngừng bán một dịch vụ, hoặc cả một nhóm dịch vụ, **chỉ cho những ngày khởi hành nhất định** (ví dụ tàu nghỉ bảo dưỡng 25/12 đến 5/1), còn các ngày khác vẫn bán bình thường. Người đặt là Quản trị và Quản lý bán hàng; người bị ảnh hưởng là mọi người lập đơn, kể cả Đối tác.

## 2. Xong khi (ví dụ nhìn thấy được)
- **Đặt cho dịch vụ.** Quản lý bán hàng mở Dịch vụ & giá, ở dòng «Tour 3 đảo» bấm nút mới, nhập từ 25/12/2026 đến 05/01/2027, ghi chú «Tàu bảo dưỡng», bấm Lưu. Dòng đó hiện nhãn «Ngừng bán 25/12 – 05/01».
- **Đặt cho nhóm.** Quản trị mở phần nhóm dịch vụ, làm tương tự cho nhóm «Tour đảo». Mọi dịch vụ đang thuộc nhóm đều bị chặn trong khoảng ngày đó.
- **Bị chặn.** Bán hàng lập đơn có «Tour 3 đảo», ngày khởi hành 28/12/2026, bấm lưu ⇒ máy báo «Tour 3 đảo ngừng bán từ 25/12/2026 đến 05/01/2027.» và không lưu. Đổi ngày sang 06/01/2027 ⇒ lưu được.
- **Đối tác cũng bị chặn** đúng như trên, ở cả lưu nháp, Gửi đơn và xác nhận.
- **Không ảnh hưởng ngày khác.** Đơn «Tour 3 đảo» ngày 20/12/2026 lập và xác nhận bình thường. Dịch vụ vẫn hiện trong danh sách chọn.
- **Đơn đã xác nhận** có ngày 28/12 từ trước khi đặt: giữ nguyên, không bị huỷ. Màn đặt khoảng ngày báo «Đang có N đơn đã xác nhận trong khoảng này» để người đặt biết mà gọi khách.
- **Gỡ.** Bấm «Kết thúc» trên khoảng ngày ⇒ bán lại ngay cho các ngày đó. Hết ngày cuối thì khoảng tự hết hiệu lực, không ai phải bấm.
- **Quyền.** Bán hàng thường, Kế toán, Thực tập, Đối tác: không thấy nút đặt, gọi thẳng máy chủ bị từ chối.
- Nhật ký ghi ai đặt, ai kết thúc, mã dịch vụ hoặc nhóm, khoảng ngày.

## 3. Không làm lần này
- Không đếm chỗ trống, không tự chặn khi hết chỗ (đó là «tồn kho», BACKLOG mục 49).
- Không hẹn giờ cho nút «Ngừng bán» cũ (ngừng mọi ngày, kể từ một ngày nào đó). Nút cũ giữ nguyên.
- Không chặn theo loại đối tác (đã có «Luật bán», ADR-0146); khoảng ngày này áp cho mọi bên đặt.
- Không lặp theo tuần (ví dụ «nghỉ mọi thứ Hai»). Mỗi lần đặt là một khoảng từ ngày đến ngày.
- Không có nút «vượt» cho Quản trị. Muốn bán ngoại lệ thì kết thúc khoảng ngày.
- Không tự đổi hay huỷ đơn đã xác nhận.

## 4. Loại việc
- [ ] Việc nhỏ.
- [x] **Việc lớn** (bảng dữ liệu mới, cổng chặn mới ở các cửa ghi đơn) ⇒ có người kiểm độc lập.
- Cần ADR: **có**, một ADR ngắn. Bảng mới chỉ thêm, ở lại lâu dài, và thêm một cổng ở mọi cửa ghi đơn (lập đơn, lưu nháp, Gửi xác nhận, Gửi đơn, Còn vé, xác nhận), cùng chỗ với cổng luật bán hiện có.

## 5. Câu hỏi cho chủ (ba câu)
1. **Ai đặt khoảng ngày cho cả nhóm?** Khuyến nghị: **Quản trị và Quản lý bán hàng, như với từng dịch vụ.** Lý do: việc này là «ngừng bán», đúng phần việc đã giao cho Quản lý bán hàng; nó không sửa tên hay thành phần nhóm. Phương án khác: chỉ Quản trị đặt cho nhóm (chặt hơn, nhưng Quản lý bán hàng phải đặt từng dịch vụ).
2. **Nháp đã có ngày rơi vào khoảng thì sao?** Khuyến nghị: **nháp bị chặn ở lần lưu, gửi hoặc xác nhận kế tiếp**; đơn đã xác nhận giữ nguyên. Lý do: giống cách luật bán theo loại đối tác đang chạy, không phải dạy nhân viên luật mới. Phương án khác: cho nháp cũ đi tiếp (dễ lọt đơn vào ngày nghỉ).
3. **Tên nút và nhãn.** Chưa có trong bảng từ ngữ nên chủ chọn một: (a) **«Ngừng bán theo ngày»** (khuyến nghị, nối với chữ «Ngừng bán» nhân viên đã quen); (b) «Nghỉ bán theo ngày»; (c) «Khoá ngày khởi hành».

## 6. Điều AI tự quyết (chủ bác được)
- Xét theo **ngày khởi hành của từng dịch vụ trên đơn**, không theo ngày lập đơn. Dịch vụ chưa nhập ngày thì chưa bị chặn; lúc xác nhận vốn đã bắt buộc có ngày.
- Dùng lại ô quyền «ngừng bán» đang có, không tạo mã quyền mới.
- Khoảng ngày của nhóm áp theo nhóm hiện hành của dịch vụ; chuyển dịch vụ sang nhóm khác thì theo nhóm mới.
- Bảng chỉ thêm: không xoá, không sửa; gỡ bằng «Kết thúc». Một dịch vụ có được nhiều khoảng.
- Ngày cuối không được trước ngày đầu; ngày cuối không được ở quá khứ; bắt buộc có ngày cuối (không có khoảng vô hạn, vì đó là việc của nút «Ngừng bán» cũ).
- Dịch vụ vẫn hiện trong danh sách chọn; chỉ báo lỗi khi ngày trúng khoảng. Lần này chưa tô mờ ngày trên ô chọn ngày.
- Máy chủ trả mã lỗi riêng, khác mã của luật bán theo loại đối tác, để câu báo nói đúng lý do.
- Dòng nhập tay (không có mã danh mục) không bị xét.
