# ADR-0205 — Đơn nháp lưu giá danh mục cũ: chặn Đối tác và Thực tập khi xác nhận, nhân viên chỉ được nhắc

- **Trạng thái:** **accepted** 2026-11-15 — chủ dự án, nguyên văn: *«Duyệt cả hai»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt ADR-0204, ADR-0205 và ba câu chữ mới chứ?»; câu trình kèm nêu rõ hệ quả Đ1.6: văn phòng xác nhận hộ đơn của Đối tác cũng bị chặn). Trước đó, **đề xuất** 2026-11-15 — chủ dự án đã chọn hướng, nguyên văn: *«Chặn Đối tác, Thực tập»* (nút ở khung bước tiếp theo, trả lời câu «Giá cũ trên đơn nháp: chặn ai khi xác nhận?», sau khi được báo về Q11 bên dưới). Trước đó cùng ngày chủ chọn *«Chặn xác nhận»* khi chưa được báo về Q11; lựa chọn sau thay lựa chọn trước. Văn bản này chờ chủ duyệt; mã đã làm trên nhánh, chưa nhập bản chính.
- **Loại:** việc lớn (tiền: đổi điều kiện chốt giá của đơn). **Cửa:** hai chiều, không đổi dữ liệu, không migration.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 1** (Đ1; Đ2 chỉ là câu nhắc ở giao diện).
- **Xây trên lỗi an toàn chưa sửa:** không.
- **Quan hệ với quyết định cũ:** **thay một phần Q11** của đặc tả `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md` («Nháp cũ có dịch vụ đã ẩn / bị Sheet bỏ / đổi giá: giữ bản chụp đã lưu, chỉ cảnh báo»). Phần bị thay: trường hợp **đổi giá**, với tài khoản **Đối tác hoặc Thực tập**, ở bước **xác nhận**. Phần giữ nguyên: nhân viên nội bộ; dịch vụ đã ẩn hoặc bị Sheet bỏ; việc lưu lại nháp giữ bản chụp. Siết thêm luật R2 (ADR-0027 điều 2a, ADR-0100): tài khoản chỉ được bán đúng giá danh mục.
- **Nguồn:** kiểm toán 14/11/2026, phát hiện T3 (`docs/superpowers/specs/2026-11-14-kiem-toan-tien-ve-du-lieu-va-ke-hoach.md`). Bản kiểm toán đã gọi nhầm hành vi này là lỗi; với nhân viên nội bộ, đó là quyết định Q11.

## Bối cảnh

Đối tác và Thực tập chỉ được xác nhận đơn mà mọi dòng đúng giá danh mục. Phép kiểm đó so đơn giá với giá danh mục **đã lưu trong nháp**. Vì vậy một nháp lưu trước ngày tăng giá vẫn chốt được ở giá cũ: lưu 2 người × 300.000, bảng giá lên 360.000, xác nhận ra 600.000 thay vì 720.000. Với nhân viên nội bộ, giữ giá đã lưu là chủ ý (giá đã báo khách được tôn trọng, và nhân viên vốn được thỏa thuận giá). Với Đối tác và Thực tập thì đó là đường vòng qua luật «chỉ bán đúng giá danh mục».

## Đ1 — Chặn ở bước xác nhận khi người bấm hoặc người lập là Đối tác, Thực tập

1. Ở cả ba đường xác nhận (xác nhận đơn, Gửi đơn, Còn vé): nếu **người bấm** bị áp luật R2 (giữ quyền Đối tác hoặc Thực tập), hoặc **người lập đơn** đang giữ một trong hai quyền đó, thì máy so giá danh mục đã lưu của từng dòng với giá hiệu lực hôm nay (đã áp ghi đè của Quản trị). Lệch thì 409 `gia_danh_muc_da_doi`, đơn không chốt.
2. Phép so dùng lại đúng hàm đang hiện dấu «Giá danh mục đã đổi» trên form nháp, nên chỗ màn hình báo và chỗ máy chặn luôn khớp.
3. Câu báo nêu tên dịch vụ, giá cũ, giá mới và cách sửa: bỏ dịch vụ rồi chọn lại từ danh mục. Ở Còn vé, người xét không sửa được nháp của người khác nên câu bảo người lập Rút lại yêu cầu.
4. Không thuộc quyết định này: dịch vụ đã ẩn khỏi danh mục, dòng nhập tay, và đơn đã xác nhận (sửa sau xác nhận không đi qua bước chặn).
5. Quyền của người lập ở đây chỉ dùng để **siết**, không cho thêm quyền nào.
6. Ba hệ quả cần chủ biết khi duyệt:
   - Đơn do Đối tác hoặc Thực tập lập mà **văn phòng xác nhận hộ** cũng bị chặn (xét theo người lập). Văn phòng không giữ được giá cũ cho đơn đó; người lập phải chọn lại dịch vụ.
   - Tài khoản lai (vừa Bán hàng vừa Đối tác) và Toàn quyền đang «Xem như» Đối tác hoặc Thực tập đều bị áp, như luật R2 hiện có.
   - Quyền của người lập đọc theo **hiện trạng**. Người lập đã nghỉ hoặc đã bị gỡ quyền Đối tác, Thực tập thì đơn của họ được xét như đơn nhân viên: giữ giá đã lưu, chỉ nhắc.

## Đ2 — Nhân viên nội bộ: giữ giá đã lưu, thêm câu nhắc lúc xác nhận

Nhân viên nội bộ lập và xác nhận đơn thì đơn vẫn chốt theo giá đã lưu (Q11). Trang đơn thêm một câu nhắc trong nhóm cảnh báo trước khi xác nhận: «Giá danh mục của «…» đã đổi sau khi lưu đơn nháp — đơn sẽ xác nhận theo giá đã lưu». Chỉ nhắc, không chặn.

## Ngoài phạm vi, ghi nợ

- Chưa có nút nhận giá mới ngay trong nháp; người dùng phải bỏ dịch vụ rồi chọn lại. Nút mới cần chủ chọn tên.
- Câu nhắc ở Đ2 là câu mới, chờ chủ duyệt chữ.

## Hệ quả

- Đối tác và Thực tập có nháp lập trước một lần đổi giá sẽ không gửi hoặc xác nhận được cho tới khi chọn lại dịch vụ.
- Kịch bản thử đầu-cuối cũ của Q11 (nhân viên xác nhận nháp giữ giá 850.000 sau khi bảng giá về 700.000) giữ nguyên và vẫn phải xanh.
