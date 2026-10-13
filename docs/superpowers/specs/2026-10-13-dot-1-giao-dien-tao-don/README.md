# Đợt 1 giao diện màn Tạo đơn: đánh giá và phần đã làm (2026-10-13)

Hồ sơ có ngày (đóng băng sau khi chủ duyệt). Chỉ đổi cách VẼ; không đụng dữ liệu, quyền, tiền, luật máy chủ. Ảnh thật: `docs/evidence/2026-10-13-dot-1/truoc/` (trước) và `.../sau/` (sau), 4 vai (Bán hàng, Thực tập, Đối tác, Toàn quyền) x 2 khổ (390, 1040) x các trạng thái (vào, một dịch vụ, đón khác ngày, danh sách mở; thêm trang Sửa đơn).

## 1. Đánh giá thẳng (dựa trên ảnh "trước")

- Màn dài: một đơn một dịch vụ ở khổ 390 cao khoảng 4.740 px, người lập phải cuộn nhiều và lặp lại nhãn phía trên mỗi ô, tốn khoảng một phần ba chiều cao chỉ cho chữ nhãn.
- Ô "Chọn từ danh mục" nằm dưới một hàng "Lọc sẵn có" (ba chip) rồi hàng "Nhóm dịch vụ": người dùng phải đi qua hai hàng lọc mới tới ô gõ; chạm lại vào ô trên iPhone không mở danh sách.
- Mỗi chặng đưa đón luôn hiện ô "Ngày đón" dù 90% trường hợp bằng ngày khởi hành.
- Khối "Khởi hành" và "Check-in" mỗi khối một tiêu đề riêng, ăn chỗ nhưng không thêm thông tin.
- "Đặt qua đối tác" là nút lẻ, chủ dễ tưởng một tính năng phụ, trong khi nó là một lựa chọn song song với "Khách tự đặt".
- Thứ tự khối: Ngày, Dịch vụ, Thanh toán, Khách. Khách (thứ người lập hỏi đầu tiên khi có điện thoại) nằm gần cuối.

## 2. Đã làm (hướng nhẹ, mỗi mục một commit)

1. Ô chọn dịch vụ: nhóm dịch vụ lên trên ô gõ; chạm ô là mở danh sách; dấu sao lên đầu dòng; mỗi dòng có tên to, mã và đơn vị ở dòng phụ. **Bổ sung theo ý chủ cùng ngày** ("bỏ hết sự rườm rà, chỉ để lại việc lọc theo nhóm sản phẩm bằng nút xổ xuống + tick chọn"): hàng chip, chip "Hay dùng", "Theo người", "Giá theo nhóm" đều bỏ; thay bằng MỘT nút xổ xuống "Nhóm dịch vụ · N" với ô tick chọn nhiều nhóm (không tick = tất cả), dịch vụ gắn sao xếp lên đầu danh sách.
2. Nhãn nổi trong ô thay nhãn phía trên (ngày, giờ, khách, thanh toán, thông tin chuyến, đưa đón).
3. Ô "Ngày đón" ẩn khi cùng ngày khởi hành, có nút "Đón khác ngày" (máy chủ vẫn tự điền ngày đón khi trống: ruling R4b không đổi).
4. "Khách tự đặt | Đặt qua đối tác" thành một hàng hai lựa chọn (chỉ bố cục; vị từ `coODatQuaDoiTac` giữ nguyên).
5. Chỉnh thị giác nhẹ: khoảng cách ô chọn, thanh "Đóng" của danh sách, ô thanh toán tự co theo khổ.
6. Đồng bộ chữ: hướng dẫn Bán hàng/Đối tác, `docs/SYSTEM-DESIGN.md` §9, nhật ký thay đổi 1.91 (số TẠM), kho trợ lý đo lại.

Kết quả: cùng đơn mẫu ở 390, Bán hàng cao 4.741 px thành 4.144 px (giảm khoảng 13%).

## 3. Hướng khuyến nghị (CHỈ ĐỀ XUẤT, chưa làm, chờ chủ duyệt)

Ảnh phác: `docs/evidence/2026-10-13-dot-1/sau/huong-khuyen-nghi-390.png` (tiêm CSS lên form thật, nút "Thêm chi tiết" chỉ là chữ vẽ).

- Bốn bước: Ngày và Khách (khách lên đầu) / Dịch vụ / Thanh toán / Người phụ trách.
- Gập các ô ít dùng (Email, Ghi chú, Xe riêng, Xe tối thiểu) sau dòng "Thêm chi tiết".
- Chặng đưa đón mặc định gọn một dòng nếu dịch vụ có mẫu đón.
- Tiêu chí duyệt gợi ý: số lần cuộn để lập đơn một dịch vụ; không mất ô nào mà bài kiểm hiện đang đòi.

Phần này đổi cấu trúc nên cần chủ duyệt riêng, kèm đặc tả và kịch bản Chrome mới.

## 4. Giả định và điều chưa chắc

- Mọi bộ lọc phụ ("Hay dùng", "Theo người", "Giá theo nhóm") bị bỏ; bản nhớ lọc cũ trên máy người dùng (kể cả nhóm kiểu một chuỗi) được đọc an toàn: bỏ qua phần lọc, giữ mã gắn sao, không ai bị kẹt trong bộ lọc ẩn.
- Giả định của người thi công (chủ chưa nói): dấu sao có tác dụng bằng cách xếp dịch vụ gắn sao lên trước, giữ thứ tự cũ trong từng phần; nhiều nhóm tick là HOẶC giữa các nhóm, VÀ với ô gõ; trần danh sách đổi từ 40 lên 150 dòng vì không còn hàng lọc để thu hẹp.
- Số phiên bản 1.91 là số tạm; phiên phát hành quyết ở bước A.0.
- Chưa kiểm trên iPhone thật; thử bằng `node scripts/dev-iphone.mjs`.
- Ba kịch bản Chrome đỏ sẵn trên bản trước khi sửa (đã dựng lại bản gốc để so): `a2-smoke-sheet` (nhật ký `order_leg_updated` khác `trip_updated`), `v1-xac-nhan-png` (2 bước), `dat-gap-smoke` bước 4.
- Chưa có người kiểm độc lập.
