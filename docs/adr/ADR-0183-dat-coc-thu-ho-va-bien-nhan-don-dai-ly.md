# ADR-0183 — Đơn đại lý: «Khách đặt cọc cho đại lý», «Thu hộ đối tác», tên ô giảm giá và biên nhận HD-02-DT

- **Trạng thái:** **proposed** 2026-11-07. Chủ chốt hướng trong chat (phiên `claude/cong-no-0172-0173-372c0c`). Văn bản chờ chủ duyệt và trình **sau** ADR-0182, vì mỗi lượt duyệt chỉ được tối đa ba quyết định chạm tiền hoặc dữ liệu. Đã qua một vòng kiểm độc lập chỉ đọc (7/11).
- **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** hai chiều.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 2** (Đ2, Đ3). Đ1 chỉ đổi chữ.
- **Quan hệ với ADR cũ:**
  - **Sửa** ADR-0159 (Khách đặt cọc trước): đổi tên ô.
  - **Sửa** ADR-0168, phần sửa ADR-0159 Đ1 mục 1–2: ADR-0168 không nhận lời khai đặt cọc ở đơn Trả sau, nay đơn Trả sau nhận được. Hiện form gửi cọc bằng 0 và ẩn ô cọc khi chọn Trả sau.
  - **Sửa** luật QR (ADR-0108): số tiền QR theo «Thu hộ đối tác» còn lại (Đ3 mục 4), không còn theo toàn bộ số còn lại của đơn.
  - **Giữ** ADR-0178 Đ1 (công tắc «Khách của đối tác trả cho Công ty»): đơn mang dấu Tắt thì «Thu hộ đối tác» bằng 0 và bị khoá (chủ chọn).
  - **Dựa trên** ADR-0182: «Thu hộ đối tác» là số **dự kiến**, không bao giờ được trừ vào công nợ.
  - Biên nhận HD-02-DT (đặc tả 2026-11-06, bản 2.72) thêm hai dòng, phần còn lại giữ nguyên.

## Đ1 — Tên ô giảm giá (chỉ đổi chữ, theo nguyên văn chủ chọn)

Ở form lập đơn của đơn đại lý, ô «Giảm giá» đổi thành **«Đại lý giảm giá cho khách (trừ vào hoa hồng của đối tác)»**. Trên biên nhận gửi khách, dòng này vẫn là **«Giảm giá»** (chủ chọn), để khách không thấy hoa hồng. Khi thi công, tên này ghi vào bảng từ ngữ (ADR-0167) ở trạng thái «đã chốt».

Cần lưu ý một điểm: câu chủ chọn dùng cả «đại lý» lẫn «đối tác» cho cùng một bên. Bảng từ đòi mỗi khái niệm chỉ một tên, nên chủ có thể muốn chọn một chữ.

## Đ2 — «Khách đặt cọc cho đại lý»

1. Tên ô (chủ chọn): **«Khách đặt cọc cho đại lý»**, thay cho «Khách đặt cọc trước».
2. Ô có ở **mọi đơn đại lý, kể cả đơn Trả sau**.
3. Tiền cọc nằm ở tay đại lý. Khoản này làm giảm số khách còn phải trả, nhưng **không** làm giảm công nợ với Tour Đảo (ADR-0182 Đ1 mục 5). Luật ghi khoản cọc lúc xác nhận của ADR-0159 giữ nguyên.

## Đ3 — «Thu hộ đối tác»

1. Đây là số tiền khách **dự kiến** trả thẳng cho Tour Đảo. Máy tính sẵn giá trị mặc định: giá công bố − giảm giá − khách đặt cọc cho đại lý.
2. Đại lý được sửa tay trong khoảng **từ 0 tới số mặc định** (chủ chọn). Việc sửa tay có một công tắc cài đặt «Đại lý được sửa tay Thu hộ»: chỉ Toàn quyền đổi được, mặc định là Bật.
3. Với đơn mang dấu Tắt của ADR-0178, Thu hộ bằng 0 và ô bị khoá.
4. Mã QR thanh toán in theo phần Thu hộ còn lại: Thu hộ trừ số Tour Đảo đã nhận, và không vượt số còn lại của đơn. Đây là **luật QR mới**: luật hiện nay (`kiemSoTienQr`) không biết số Thu hộ.
5. Số này **không** vào Đã thu của công nợ. Chỉ khoản Tour Đảo thật sự nhận và được Kế toán xác nhận mới vào (ADR-0182 Đ1 mục 6).
6. Số này lưu ở một cột mới trên đơn (của `orders`) và sửa được tới lúc «Khách đã trả đủ».

## Biên nhận HD-02-DT (giấy cho khách)

Phần tiền in đúng thứ tự sau:

1. **Giá công bố** (hoặc «Tạm tính» khi có giá khác giá công bố);
2. **Giảm giá**;
3. **Khách đặt cọc cho đại lý**;
4. **Thu hộ đối tác**;
5. số khách còn phải trả.

Biên nhận **không** in giá đại lý, hoa hồng hay công nợ. Ba dòng công nợ chỉ đại lý thấy, ở chi tiết đơn và ở «Trả sau của tôi» (chủ chọn «tách riêng»).

## Phương án đã loại

- **In công nợ lên HD-02-DT:** khách cầm giấy sẽ biết hoa hồng của đại lý. Chủ không chọn.
- **Cho sửa Thu hộ tự do, không có trần:** các dòng trên biên nhận có thể không cộng khớp nhau. Chủ không chọn.
- **Bỏ công tắc của ADR-0178 để đơn nào cũng thu hộ được:** chủ không chọn.

## Hệ quả chủ cần biết

- Khách của đơn đại lý thấy rõ phần nào trả cho đại lý (tiền cọc), phần nào trả cho Tour Đảo (thu hộ). Phần còn lại khách trả cho đại lý.
- **Chưa kiểm:**
  - cách in «số khách còn phải trả» khi Thu hộ nhỏ hơn số mặc định, tức phần chênh lệch khách trả cho đại lý;
  - biên nhận của đơn đã huỷ.

## Trang ghép

1. **Bảng chạm:**
   - `orders`: thêm một cột Thu hộ; ô cọc sẵn có nay mở cho cả đơn Trả sau.
   - `billing`: thêm một công tắc cài đặt.

   Không thêm loại thực thể vào bảng dùng chung nào.
2. **Bản đồ quyền:** đại lý không có ô quyền mới (vẫn sửa đơn của mình như cũ). Công tắc «Đại lý được sửa tay Thu hộ» chỉ Toàn quyền đổi được.
3. **Cổng:** máy chủ kiểm trần Thu hộ và dấu Tắt khi lưu đơn, và kiểm số QR theo Đ3 mục 4.

   **Chỗ giao diện đổi nghĩa:** form lập đơn của đại lý (tên ô giảm giá, ô cọc hiện cả khi chọn Trả sau, ô Thu hộ mới), biên nhận HD-02-DT, và mã QR.
