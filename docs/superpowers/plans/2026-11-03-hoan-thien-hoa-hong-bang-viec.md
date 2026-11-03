# Hoàn thiện phân hệ hoa hồng — bảng việc

Chủ dự án 3/11/2026, nguyên văn: «để diễn tập sau, giờ là lúc cần hoàn thiện phân hệ hoa hồng»; chốt thứ tự dưới đây: «Chốt, gồm dời hạn». Thêm việc vào bảng phải hỏi chủ. Phát hiện không chặn phát hành ghi vào mục Nợ. Mỗi việc lớn có đặc tả và người kiểm độc lập riêng.

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 1 | Công ty lữ hành chưa có tài khoản hưởng theo cấp (ADR-0155 Đ1, câu C3, C4, C6). Điều kiện trước: đóng `TNV-G3`, `TNV-G4` | Công ty không tài khoản gắn vai trò, gắn cấp, văn phòng chọn «Qua đối tác», xác nhận đơn, hoa hồng đúng cấp, Đã giao ghi sổ đúng; đạt tiêu chí nghiệm thu của ADR-0155 | đang đối chiếu điều kiện; chờ chủ duyệt |
| 2 | Nhập mức từ tệp bảng tính (`BL-CK-NHAP-TEP`) | Kế toán nhập một tệp đủ dịch vụ và cấp, thấy xem trước; dòng sai bị từ chối theo đúng cổng `kiemSoMucMoi`; Sheet bảng giá không dùng làm nguồn | chưa |
| 3 | Trả tiền theo tháng (ADR-0080 phần D2, ADR-0081): gộp nhiều đơn vào một phiếu, bảng kê tháng, đối tác tự xem sổ | Ca sổ vàng qua; khoá tháng vẫn đúng; đối tác chỉ thấy phần của mình | chưa; đọc nhanh, chưa kiểm kỹ phần đã có |
| 4 | Nhập bằng giá đại lý (ADR-0148 Đ2, Đ3) | Kế toán đã xác nhận ca mẫu; giá đại lý cao hơn giá bán lẻ vào «thiếu mức»; hoa hồng không âm | chưa |
| 5 | Dọn chỗ nhỏ: chữ «/khách» còn sót với dịch vụ theo lượt, `BL-SDL-TAY-BI-DE`, `BL-SDL2-CHUP-BU-TRAN`, `BL-SDL2-DON-LAI` | Mỗi mục có bài đỏ trước, xanh sau | chưa |

## Ngoài bảng

`BL-CK-DIEU-KIEN` (cần quyết định mới), `BL-CK-BANG-DONG-BO`, `BL-CK-BANG-QUYEN`, `BL-DAI-LY-TO-CHUC` giữ ở `docs/BACKLOG.md`.

## Việc của chủ và Kế toán

- Diễn tập khôi phục `HC-5.19`: hạn 2026-11-30.
- Kế toán nhập mức thật, nên làm sau Việc 2. Năm vai trò đang thiếu mức.
- Xác nhận ca sổ vàng SV-TG-01…03.
- Thử bảng nhập trên iPhone thật.

## Nợ

Chưa có.
