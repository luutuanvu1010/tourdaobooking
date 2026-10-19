# Sổ vàng — ca mẫu chiết khấu "mỗi khách" theo loại (ADR-0133)

Trạng thái: **chủ dự án đang duyệt lần lượt từng ca trong chat** (chưa ca nào được duyệt; cột bên phải ghi "chờ chủ duyệt" cho tới khi chủ nói duyệt từng ca). Chữ ký của Kế toán là bước riêng, chưa có. Mức dùng trong mọi ca: người lớn 50.000 đ, trẻ em 30.000 đ, người cao tuổi 40.000 đ, em bé không có ô (luôn 0).

| Ca | Số khách | Đáp án (đ) | Kế toán |
|---|---|---|---|
| SV-LK-01 | 2 người lớn, 1 trẻ em, 1 người cao tuổi, 1 em bé | 170.000 | chủ đã duyệt 19/10 |
| SV-LK-02 | 1 người lớn | 50.000 | chủ đã duyệt 19/10 |
| SV-LK-03 | khai mức với ô trẻ em BỎ TRỐNG (người lớn 50.000, người cao tuổi 40.000) | máy chủ từ chối 400, câu «Nhập số tiền mỗi khách của trẻ em… Không trả thì gõ 0»; không lưu mức nào | chủ đã duyệt 19/10 (theo lựa chọn «Bắt buộc điền») |
| SV-LK-04 | 0 khách | 0 | chủ đã duyệt 19/10 |
| SV-LK-05 | dịch vụ «một cấp» tính theo lượt (Phao chuối 5 người/lượt, dù bay), 3 lượt; mỗi lượt lấy số tiền người lớn, không phụ thuộc số người trong lượt (1 người đi cũng một lượt) | 150.000 | chờ chủ duyệt |
| SV-LK-06 | đơn đã xác nhận với mức trên; sau đó mức đổi thành 60.000/40.000/50.000; văn phòng sửa số khách thành 3 người lớn | 150.000 (theo mức đã chụp, không phải 180.000) | chờ chủ duyệt |
| SV-LK-07 | đơn như ca 01 (170.000); Kế toán ghi tay CHỈ đổi người bán, không đổi mức | 170.000 (giữ ba số; nếu ghi tay đổi cả mức thì bỏ ba số, tính cách cũ) | chờ chủ duyệt |

## Chủ dự án đã trả lời (chat 2026-10-19)
1. **Ca 03 — ô trống:** làm lại 19/10. Lần đầu AI hiểu nhầm trẻ em miễn phí. Chủ đính chính: *"em bé được miễn phí khi đi cùng người lớn, trẻ em là khách hàng tính theo chiều cao… Trẻ em có giá riêng (khoảng 70% giá vé người lớn…), em bé mới là miễn phí"*, rồi chọn *"Bắt buộc điền: ô trẻ em và ô người cao tuổi không được bỏ trống, muốn 0 thì gõ 0"*. Ô bỏ trống ⇒ lỗi; gõ 0 ⇒ 0 đồng (xem ADR điều 2 sửa đổi).
2. **Ca 05 — dịch vụ theo nhóm/lượt:** *"tính nguyên chuyến, ví dụ Phao chuối dành cho 5 người, thì 1 người đi cũng tính tiền như 5"*. Một lượt (một chuyến) lấy đúng một lần số tiền người lớn, dù trong lượt có 1 hay 5 người, và dù có trẻ em hay người cao tuổi. Khớp với mã hiện tại: số lượt = tổng số lượng của các dòng tiền của dịch vụ, không phải số người.
3. **Ca 06 — mức đã chụp:** *"ok"*. Đơn đã xác nhận giữ mức đã chụp lúc xác nhận; mức đổi sau không làm đổi đơn cũ, kể cả khi văn phòng sửa số khách.

## Kiểm chéo bằng máy (người kiểm độc lập, 2026-10-19)
Sáu ca 01–06 được tự tính tay trước khi mở đáp án, rồi so với mã chạy thật: cả sáu KHỚP. Đây chưa phải chữ ký của Kế toán. Ca 07 được khoá bằng bài `src/modules/orders/chiet-khau-theo-loai.test.ts`.
