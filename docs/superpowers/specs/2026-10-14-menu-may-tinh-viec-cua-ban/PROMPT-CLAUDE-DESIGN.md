# Lời nhắc gửi Claude Design

> Đã được chủ duyệt đặc tả ngày 2026-10-14, có thể gửi. Chép từ dòng "BẮT ĐẦU" đến dòng "HẾT" vào Claude Design. Gửi kèm (đính kèm) ảnh chụp Trang chủ máy tính hiện tại và tệp `public/app.css` (đầu tệp có token) nếu Claude Design nhận tệp.

---- BẮT ĐẦU ----

Bạn là nhà thiết kế sản phẩm cao cấp. Hãy thiết kế lại **menu bên trái** và **Trang chủ** của một phần mềm nội bộ trên **máy tính (rộng 1440px, kiểm thêm 1024px)**. Chỉ máy tính, không làm điện thoại.

## Bối cảnh
"Island Booking System" là phần mềm của Công ty TNHH Tour Đảo (Nha Trang) để lập đơn dịch vụ tour, xác nhận đơn, điều phối xe, thu tiền, đối soát. Khoảng 30 nhân viên dùng mỗi ngày, hầu hết không rành máy tính. Giao diện **tiếng Việt có dấu**, không chữ Anh lộ ra.

## Vấn đề cần giải
Menu hiện có tới 24 mục (Quản trị) hoặc 31 mục (Toàn quyền), xếp theo tên trang, nên người dùng phải căng mắt tìm. Trang chủ có số liệu nhưng không nói "việc dang dở của tôi là gì và bước tiếp theo là gì".

## Mục tiêu thị giác
Nhìn vào Trang chủ trong 5 giây, người dùng biết: (1) có việc gì chờ mình, (2) việc nào gấp nhất, (3) bấm đâu để làm tiếp. Phong cách **yên tĩnh, tối giản, kiểu Anthropic**: nhiều khoảng trắng, chữ rõ, một ưu tiên mỗi lúc, màu dùng có nghĩa chứ không trang trí.

## Hệ thống thiết kế (BẮT BUỘC dùng, không tự đặt màu/chữ mới)
- Phông: **Be Vietnam Pro** (400/500/600/700).
- Màu: chủ đạo xanh `#0c4a6e` (đậm `#082f49`, nhạt `#dcebf6`); nhấn san hô `#c0392b` CHỈ cho hành động chốt (xác nhận, tạo đơn); cát `#f5a623` (nền `#fbe3b3`, chữ `#5a4109`) cho "cần để ý"; nền trang `#f2f5f9`; thẻ `#ffffff`; viền `#e1e7ef`; chữ `#0f172a`, chữ phụ `#475569`; xanh lá `#dcfce7`/`#166534` cho "đã xong"; nguy hiểm `#b01235`.
- Khoảng cách theo bậc 4/8/12/16/24/32/48px. Bo góc 8/12/18px. Bóng đổ rất nhẹ (`0 1px 2px rgba(15,23,42,.04), 0 3px 10px rgba(15,23,42,.05)`).
- Chữ menu ≥ 14px, ô gõ 16px, vùng bấm ≥ 36px, tương phản đạt WCAG AA, dùng được bằng bàn phím (trạng thái focus rõ).
- Biểu tượng nét đơn giản một kiểu (như bộ biểu tượng đường nét), không emoji.

## Cấu trúc menu bên trái (rộng ~248px, nền tối xanh đậm hoặc sáng — chọn một và giải thích; giữ logo "Island Booking System" ở đầu)
Nhóm có tiêu đề chữ nhỏ viết hoa; nhóm không có mục nào thì ẩn cả tiêu đề.
1. (không tiêu đề) Trang chủ · Đơn hàng (huy hiệu số: đơn nháp) · **Tạo đơn** (nút nổi bật màu san hô) · Danh bạ
2. VẬN CHUYỂN: Điều phối xe · Xe đang chạy · Đề nghị chuyển khách · Xe & giấy tờ (huy hiệu cát: giấy sắp hết hạn) · Giá & chi phí
3. TIỀN: Điều chỉnh công nợ · Khoá sổ tháng · Hoa hồng đối tác · Người bán dịch vụ
4. THIẾT LẬP (**thu gọn, mặc định đóng**, có mũi tên mở/đóng): Dịch vụ & giá · Địa điểm · Loại giấy tờ cá nhân · Loại giấy tờ xe · Lý do điều phối · Chính sách điều phối · Quản lý tài khoản · Phiên đăng nhập · Nhật ký · Gửi thông báo · Trợ lý Hỗ trợ · Giao diện
5. Chân menu cố định: Của tôi · Góp ý / Báo lỗi · Trợ giúp, rồi avatar + tên + vai + Đăng xuất.
Mục đang mở: nền sáng + vạch màu bên trái. Mỗi vai chỉ thấy phần mình được phép (xem bảng bên dưới).

## Trang chủ (vùng nội dung bên phải)
Từ trên xuống: lời chào theo giờ + một câu tóm tắt ngày → **khối "Việc của bạn"** (tối đa 4 thẻ xếp theo độ gấp, mỗi thẻ gồm: biểu tượng nhỏ, nhãn việc, **số lớn**, một dòng giải thích, **một nút duy nhất** là động từ như "Xác nhận đơn", "Ghi thu", "Duyệt") → "Chuyến đón" hôm nay/mai/kia (danh sách, có giờ, nơi đón, tên khách, số khách, còn lại bao nhiêu tiền) → "Doanh thu tuần của tôi" (biểu đồ cột 7 ngày) → "Lối tắt" nhỏ gọn.
Quy tắc số: **chỉ hiện thẻ khi số > 0**. Không có việc nào → một dòng dịu "Hôm nay không có việc chờ bạn" + nút Tạo đơn. Nguồn số lỗi → hiện "—" và nút "Thử lại" ngay trong thẻ đó, không làm hỏng cả khối. Số chưa có nguồn thật thì KHÔNG bịa.

## Vai và thẻ "Việc của bạn" (dữ liệu thật, dùng đúng các nhãn này)
- **Bán hàng**: Đơn nháp chờ xác nhận (3) · Đơn chưa có người phụ trách (2) · Còn thiếu tiền (5 đơn, 18.400.000 ₫) · Chuyến đón hôm nay (4). Menu: nhóm 1 + Vận chuyển (Điều phối xe, Xe đang chạy) + Hoa hồng đối tác.
- **Kế toán**: Còn thiếu tiền (nút Ghi thu) · Đề nghị điều chỉnh chờ duyệt (nút Duyệt) · Cọc cần chi hoàn · Đơn nháp. Menu: Trang chủ, Đơn hàng, Danh bạ (KHÔNG có Tạo đơn) + Vận chuyển (xem) + TIỀN đầy đủ.
- **Quản trị**: Cần xem lại (giấy tờ xe sắp hết hạn, dịch vụ lệch giá) · Đề nghị chuyển khách (Duyệt) · Đơn nháp · Chưa phụ trách. Menu: nhóm 1 + Vận chuyển đầy đủ + TIỀN + Thiết lập (không có Phiên đăng nhập, Nhật ký, Chính sách, Gửi thông báo, Trợ lý, Giao diện).
- **Toàn quyền**: như Quản trị + thẻ Góp ý chưa xử lý; Thiết lập đầy đủ.
- **Tài xế**: trang riêng, KHÔNG có menu nhóm 1–4; chỉ Trang chủ tài xế · Cuốc của tôi · (Báo bận nếu là tài xế đối tác) + chân menu. Thẻ: Cuốc hôm nay (Mở cuốc) · Giấy tờ sắp hết hạn.
- **Hướng dẫn viên**: menu có **Đơn hàng** (hiện đơn tự do — đơn chưa có hướng dẫn viên nào phụ trách, có nút Nhận — và đơn của chính mình) + chân menu (Của tôi, Góp ý, Trợ giúp). Thẻ: Đơn tự do chờ nhận (Nhận đơn) · Đơn của tôi còn thu tiền (Ghi thu).
- **Đối tác / Thực tập**: Đơn hàng · Tạo đơn + chân menu; không thẻ số.
- **Nhân sự**: Quản lý tài khoản + chân menu.

## Sản phẩm cần giao
1. Một **file HTML tương tác** (hoặc bộ khung) gồm: menu + Trang chủ, có **công tắc chọn vai** ở góc (Bán hàng / Kế toán / Quản trị / Toàn quyền / Tài xế / Hướng dẫn viên / Đối tác / Nhân sự) để đổi menu và thẻ theo vai; dữ liệu giả hợp lý, tên khách/địa điểm Việt Nam (Nha Trang: Hòn Mun, Hòn Tằm, Bãi Dài, Vinpearl…).
2. Trạng thái: bình thường, **không có việc**, **một thẻ lỗi nguồn**, **nhóm Thiết lập mở**, **rê chuột/focus bàn phím**, và khổ **1024px**.
3. Ba dòng giải thích vì sao bố cục này giúp người dùng không phải tìm kiếm.

## Đừng làm
Không thêm tính năng ngoài mô tả; không thêm màu/phông mới; không dùng số giả cho việc chưa có nguồn; không làm điện thoại; không dùng chữ Anh trên giao diện; không làm menu hơn 10 mục hiện sẵn cho bất kỳ vai nào.

---- HẾT ----
