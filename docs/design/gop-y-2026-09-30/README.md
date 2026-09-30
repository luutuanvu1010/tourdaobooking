# Ảnh phác — góp ý người dùng 30/9 (đợt giao diện G1)

Nguồn: `docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md` §7.2. Ảnh phác là **HTML tĩnh, tự chứa** (mở thẳng bằng trình duyệt), dùng giá trị token màu/chữ ở đầu `public/app.css`, khổ điện thoại 390px (và 1040px khi có ý nghĩa). Số liệu, tên, mã đơn là giả. **Chưa dựng màn thật** cho các ảnh dưới đây — chủ duyệt trước (bài học Đợt D: thứ nhìn thấy trên màn hình phải hỏi).

| Tệp | Nội dung | Góp ý |
|---|---|---|
| `a-bo-loc-don.html` | Bộ lọc đơn nhiều điều kiện: chip đang lọc + "Xoá lọc"; bảng trượt chọn ngày đi, trạng thái, dịch vụ, người lập (390); thanh lọc ngang (1040) | T4, YC-0008, YC-0012 |
| `b-trang-chu-ngay-mai-ngay-kia.html` | Trang chủ thêm chuyến đón ngày mai, ngày kia — cách A (một khối, ba nút chuyển ngày) và cách B (ba khối xếp chồng) | YC-0007 |
| `c-gop-y-thanh-buoc.html` | Màn Góp ý: thanh bước Mới → Đã tiếp nhận → Đang xử lý → Đã xong; Từ chối là nhánh rẽ; nút "Mở lại"; nhãn màu ở danh sách | T2 |
| `d-loc-san-pham-lap-don.html` | Ô chọn dịch vụ khi lập đơn có hàng lọc ("Hay dùng" ghim trên máy, đơn vị, đầu mã), nhớ trên máy | YC-0003 |

## Đã làm luôn (không cần ảnh phác, đảo lại được)

- Máy chủ nhận bộ lọc đơn (ngày đi, dịch vụ, trạng thái, người lập) — chưa có màn, chờ ảnh `a`.
- "Cuốc của tôi" của tài xế thêm nhóm "Ngày kia".
- Chuyến đang chạy: điểm đón hiện thêm "XE TỚI hh:mm" khi khác giờ hẹn (giờ hẹn vốn đã hiện).
- Thẻ đơn: dòng 3 "Đón tại …" luôn thấy (một hàng, cắt "…").
- Góp ý: nút ở Đã xong / Từ chối ghi "Mở lại".

## Câu hỏi cho chủ (gom một lần)

1. **Bộ lọc đơn (ảnh a):** nhớ bộ lọc lần trước trên máy? (khuyến nghị: có); nút chọn nhanh ngày đủ chưa; ô "Người lập" chỉ cho người xem mọi đơn; "Người phụ trách" để lượt sau.
2. **Trang chủ (ảnh b):** cách A hay B? (khuyến nghị A); ngày mai/ngày kia có hiện tên khách không?
3. **Góp ý (ảnh c):** đồng ý thanh bước + khối trạng thái có màu + nhãn màu ở danh sách?
4. **Lọc sản phẩm (ảnh d):** lọc bằng thứ đã có ("Hay dùng", đơn vị, đầu mã — làm được ngay) hay theo loại dịch vụ (cần thêm cột "Loại" ở Sheet = thay đổi dữ liệu, quyết định riêng)? Khuyến nghị: làm cách đầu trước.
5. **Thẻ đơn nay 3 dòng khi có nơi đón** (đã làm theo góp ý T5, nới quyết định "đúng 2 dòng" của Đợt E) — đồng ý giữ? Không đồng ý thì hoàn tác một commit.
6. **Màn "Xuất bến" của tài xế** (chuyến chưa chạy — cũng là màn tài xế mở khi bấm cuốc ngày mai / ngày kia) hiện chỉ có điều kiện xuất bến, **không có danh sách điểm đón + giờ**. Có thêm danh sách điểm (tên nơi, giờ hẹn, giờ xe tới, số khách — không tên khách) vào màn đó không? Chưa làm vì đó là khối mới trên màn đã có bản vẽ duyệt (bản vẽ 6b/6c).
