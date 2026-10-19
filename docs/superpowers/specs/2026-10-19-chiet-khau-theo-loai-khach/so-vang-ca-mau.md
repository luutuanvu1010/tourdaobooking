# Sổ vàng — ca mẫu chiết khấu "mỗi khách" theo loại (ADR-0133)

Trạng thái: **chờ Kế toán ký xác nhận đáp án** (chưa phát hành khi chưa có chữ ký). Mức dùng trong mọi ca: người lớn 50.000 đ, trẻ em 30.000 đ, người cao tuổi 40.000 đ, em bé không có ô (luôn 0).

| Ca | Số khách | Đáp án (đ) | Kế toán |
|---|---|---|---|
| SV-LK-01 | 2 người lớn, 1 trẻ em, 1 người cao tuổi, 1 em bé | 170.000 | chờ ký |
| SV-LK-02 | 1 người lớn | 50.000 | chờ ký |
| SV-LK-03 | 3 trẻ em đi cùng người lớn (ở dịch vụ khác của đơn), ô trẻ em để trống = 0 | 0 | chờ ký |
| SV-LK-04 | 0 khách | 0 | chờ ký |
| SV-LK-05 | dịch vụ theo nhóm/lượt, 3 lượt (mỗi lượt lấy số tiền người lớn, không phụ thuộc số người trong lượt) | 150.000 | chờ ký |
| SV-LK-06 | đơn đã xác nhận với mức trên; sau đó mức đổi thành 60.000/40.000/50.000; văn phòng sửa số khách thành 3 người lớn | 150.000 (theo mức đã chụp, không phải 180.000) | chờ ký |
| SV-LK-07 | đơn như ca 01 (170.000); Kế toán ghi tay CHỈ đổi người bán, không đổi mức | 170.000 (giữ ba số; nếu ghi tay đổi cả mức thì bỏ ba số, tính cách cũ) | chờ ký |

## Chủ dự án đã trả lời (chat 2026-10-19)
1. **Ca 03 — ô trống:** *"đúng, trẻ em được miễn phí khi đi cùng người lớn"*. Ô trẻ em để trống thì hoa hồng của trẻ em là 0 đ.
2. **Ca 05 — dịch vụ theo nhóm/lượt:** *"tính nguyên chuyến, ví dụ Phao chuối dành cho 5 người, thì 1 người đi cũng tính tiền như 5"*. Một lượt (một chuyến) lấy đúng một lần số tiền người lớn, dù trong lượt có 1 hay 5 người, và dù có trẻ em hay người cao tuổi. Khớp với mã hiện tại: số lượt = tổng số lượng của các dòng tiền của dịch vụ, không phải số người.
3. **Ca 06 — mức đã chụp:** *"ok"*. Đơn đã xác nhận giữ mức đã chụp lúc xác nhận; mức đổi sau không làm đổi đơn cũ, kể cả khi văn phòng sửa số khách.

## Kiểm chéo bằng máy (người kiểm độc lập, 2026-10-19)
Sáu ca 01–06 được tự tính tay trước khi mở đáp án, rồi so với mã chạy thật: cả sáu KHỚP. Đây chưa phải chữ ký của Kế toán. Ca 07 được khoá bằng bài `src/modules/orders/chiet-khau-theo-loai.test.ts`.
