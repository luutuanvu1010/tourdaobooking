# ADR-0182 — Đơn đại lý: «Khách đặt cọc cho đại lý», «Thu hộ đối tác», tên ô giảm giá và biên nhận HD-02-DT

- **Trạng thái:** **proposed** 2026-11-07. Chủ chốt hướng trong chat (phiên `claude/cong-no-0172-0173-372c0c`). Chờ chủ duyệt; trình **sau** ADR-0181 (mỗi lượt duyệt tối đa ba quyết định chạm tiền/dữ liệu).
- **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** hai chiều.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 2** (Đ2, Đ3). Đ1 chỉ là chữ.
- **Quan hệ với ADR cũ:**
  - **Sửa** ADR-0159 (Khách đặt cọc trước): đổi tên ô; cho cả đơn Trả sau (hôm nay đơn Trả sau gửi cọc = 0).
  - **Giữ** ADR-0178 Đ1 (công tắc «Khách của đối tác trả cho Công ty»): khi đơn mang dấu Tắt thì «Thu hộ đối tác» = 0 và khoá (chủ chọn).
  - **Dựa trên** ADR-0181: «Thu hộ đối tác» là số **dự kiến**, không bao giờ trừ công nợ.
  - Biên nhận HD-02-DT (đặc tả 2026-11-06, bản 2.72) thêm hai dòng; phần còn lại giữ.

## Đ1 — Tên ô giảm giá (chữ, chủ chọn nguyên văn)

Ở form lập đơn của đơn đại lý, ô «Giảm giá» đổi thành **«Đại lý giảm giá cho khách (trừ vào hoa hồng của đối tác)»**. Trên biên nhận gửi khách vẫn là **«Giảm giá»** (chủ chọn), để khách không thấy hoa hồng. Ghi vào bảng từ ngữ (ADR-0167) ở trạng thái «đã chốt» khi thi công. Lưu ý một lần: câu chủ chọn dùng cả «đại lý» lẫn «đối tác» cho cùng một bên; bảng từ đòi mỗi khái niệm một tên, chủ có thể muốn thống nhất một chữ.

## Đ2 — «Khách đặt cọc cho đại lý»

1. Tên ô (chủ chọn): **«Khách đặt cọc cho đại lý»**, thay «Khách đặt cọc trước».
2. Có ở **mọi đơn đại lý, kể cả Trả sau**.
3. Tiền cọc ở tay đại lý: làm giảm số khách còn phải trả, **không** làm giảm công nợ với Tour Đảo (ADR-0181 Đ1 mục 5). Luật ghi khoản cọc lúc xác nhận của ADR-0159 giữ nguyên.

## Đ3 — «Thu hộ đối tác»

1. Số tiền khách **dự kiến** trả thẳng cho Tour Đảo. Mặc định máy tính = giá công bố − giảm giá − khách đặt cọc cho đại lý.
2. Đại lý sửa tay được trong khoảng **0 tới số mặc định** (chủ chọn). Công tắc cài đặt «Đại lý được sửa tay Thu hộ» (chỉ Toàn quyền đổi, mặc định Bật).
3. Đơn mang dấu Tắt của ADR-0178: Thu hộ = 0, ô khoá.
4. Mã QR thanh toán in theo số Thu hộ còn lại (không vượt số khách còn phải trả như luật QR hiện có).
5. Số này **không** vào Đã thu của công nợ. Chỉ khoản Tour Đảo thật nhận và Kế toán xác nhận mới vào (ADR-0181 Đ1 mục 6).
6. Lưu một cột mới trên đơn (của `orders`), ghi được tới lúc «Xong và đủ tiền».

## Biên nhận HD-02-DT (giấy cho khách)

Phần tiền in đúng thứ tự: **Giá công bố** (hoặc «Tạm tính» khi có giá khác công bố) → **Giảm giá** → **Khách đặt cọc cho đại lý** → **Thu hộ đối tác** → số khách còn phải trả. **Không** in giá đại lý, hoa hồng, công nợ. Ba dòng công nợ chỉ đại lý thấy, ở chi tiết đơn và «Trả sau của tôi» (chủ chọn «tách riêng»).

## Phương án đã loại

- **In công nợ lên HD-02-DT:** khách cầm giấy sẽ biết hoa hồng của đại lý. Chủ không chọn.
- **Thu hộ sửa tự do, không trần:** biên nhận có thể không cộng khớp. Chủ không chọn.
- **Bỏ công tắc ADR-0178 để mọi đơn thu hộ được:** chủ không chọn.

## Hệ quả chủ cần biết

- Khách của đơn đại lý thấy rõ phần trả cho đại lý (cọc) và phần trả cho Tour Đảo (thu hộ); phần còn lại khách trả cho đại lý.
- **Chưa kiểm:** cách tính «số khách còn phải trả» khi Thu hộ < mặc định (phần chênh là khách trả cho đại lý); biên nhận khi đơn đã huỷ.

## Trang ghép

1. **Bảng chạm:** `orders` (một cột Thu hộ mới, ô cọc sẵn có mở cho đơn Trả sau); `billing` (một công tắc cài đặt). Không thêm loại thực thể vào bảng dùng chung.
2. **Bản đồ quyền:** không ô mới cho đại lý (sửa đơn của mình như cũ); đổi công tắc «Đại lý được sửa tay Thu hộ»: chỉ Toàn quyền.
3. **Cổng:** máy chủ kiểm trần Thu hộ và dấu Tắt lúc lưu. **Chỗ giao diện đổi nghĩa:** form lập đơn của đại lý (tên ô giảm giá, ô cọc hiện cả khi chọn Trả sau, ô Thu hộ mới), biên nhận HD-02-DT, QR.
