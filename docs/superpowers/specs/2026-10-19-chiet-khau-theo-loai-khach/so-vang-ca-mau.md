# Sổ vàng — ca mẫu chiết khấu "mỗi khách" theo loại (ADR-0133)

Trạng thái: **chờ Kế toán xác nhận đáp án** (chưa phát hành khi chưa có chữ ký). Mức dùng trong mọi ca: người lớn 50.000 đ, trẻ em 30.000 đ, người cao tuổi 40.000 đ, em bé không có ô (luôn 0).

| Ca | Số khách | Đáp án (đ) | Kế toán |
|---|---|---|---|
| SV-LK-01 | 2 người lớn, 1 trẻ em, 1 người cao tuổi, 1 em bé | 170.000 | chờ |
| SV-LK-02 | 1 người lớn | 50.000 | chờ |
| SV-LK-03 | 3 trẻ em (ô trẻ em để trống = 0) | 0 | chờ |
| SV-LK-04 | 0 khách | 0 | chờ |
| SV-LK-05 | dịch vụ theo nhóm/lượt, 3 lượt (lấy số tiền người lớn) | 150.000 | chờ — **chủ xem lại cách lấy số tiền người lớn cho dịch vụ theo lượt** |
| SV-LK-06 | đơn đã xác nhận với mức trên; sau đó mức đổi thành 60.000/40.000/50.000; văn phòng sửa số khách thành 3 người lớn | 150.000 (theo mức đã chụp, không phải 180.000) | chờ |

Ca SV-LK-06 cần bài kiểm ở Task 4 (chụp lúc Xác nhận); Task 1 chỉ khoá SV-LK-01 đến 05 bằng bài `src/shared/hoa-hong-theo-loai.test.ts`.
