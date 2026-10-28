# Thay chữ "Check-in" bằng cách nói rõ "khách có mặt ở đâu, lúc nào" (2026-10-13)

> Hồ sơ nghiên cứu có ngày, chờ chủ chọn phương án. Chưa sửa mã.

## 1. Hiện trạng (đọc từ mã thật)

Mỗi dịch vụ có ba ô check-in (ngày, giờ, nơi), lưu ở `order_service.checkin_*` dưới dạng chữ tự do, không bắt buộc. Chữ "Check-in" lộ ra ở **bốn nơi**, kể cả nơi khách đọc:

| Nơi | Ai đọc | Đang hiện |
|---|---|---|
| Form Tạo đơn / "Sửa thông tin chuyến" | nhân viên bán | nhóm "Check-in": Ngày check-in, Giờ check-in, Nơi check-in |
| Phiếu xác nhận đơn (`src/shared/order-confirmation.ts`) | **khách** | dòng "Đón khách: giờ · nơi" rồi dòng "Check-in: ngày · giờ · nơi" |
| Màn "Đơn của tôi" (`web/viec-cua-toi.ts`) | hướng dẫn viên | "Check-in: ngày · giờ · nơi" |
| Trang đơn, tin báo đổi đơn, bài kiểm giờ | nhân viên | "ngày/giờ check-in" |

Vì sao khó hiểu: khách và nhân viên mới không biết "check-in" ở đây là gì, và trên phiếu có **hai dòng gần giống nhau** ("Đón khách" và "Check-in") mà không nói cái nào áp cho khách nào.

Sự thật nghiệp vụ gồm **hai kiểu khách**:
- **Khách có xe đón:** khách chờ ở điểm đón (khách sạn, nhà), giờ cần có mặt chính là giờ đón. Không cần "check-in" nào khác; xe sẽ đưa họ tới bến.
- **Khách tự đến:** khách phải có mặt tại Cảng Vinpearl hoặc Bến tàu du lịch Nha Trang trước giờ tàu chạy. Đây mới là "check-in" đúng nghĩa.

## 2. Ba phương án

**A. Đổi chữ, giữ nguyên ô (nhỏ nhất, không đổi dữ liệu).** Gọi bằng câu khách hiểu được.
- Form: tên nhóm "Khách có mặt"; ô giờ "Có mặt lúc"; ô nơi "Có mặt tại" với chữ mờ "Ví dụ: Cảng Vinpearl"; ô ngày chỉ hiện khi bấm "Khác ngày khởi hành" (giống ô Ngày đón).
- Phiếu của khách: "Khách có mặt: 07:45 · Cảng Vinpearl" và "Xe đón khách: 06:30 · Khách sạn ABC" (hai dòng nói rõ việc của từng dòng).
- Hướng dẫn viên: "Hẹn khách: 07:45 · Cảng Vinpearl".
- Giá: chỉ đổi chữ ở bốn nơi trên, cập nhật bài kiểm phiếu và hướng dẫn. Phiếu là giấy tờ gửi khách nên cần người kiểm độc lập đọc lại bản in.

**B. A kèm nút chọn nhanh nơi có mặt (khuyến nghị).** Dưới ô "Có mặt tại" có hàng nút: **Cảng Vinpearl** · **Bến tàu du lịch Nha Trang** · **Tại điểm đón**.
- Bấm "Cảng Vinpearl" thì điền chữ vào ô nơi (vẫn là chữ tự do, không đổi bảng dữ liệu, gõ nơi khác được).
- "Tại điểm đón" dành cho khách có xe đón: ghi nhận khách có mặt tại điểm đón của chặng đón, nên giờ và nơi lấy từ chặng đón, nhân viên không phải gõ lại hai lần.
- Danh sách nút do Quản trị hoặc Toàn quyền đặt trong danh mục địa điểm (cờ "điểm chọn nhanh", cùng cờ đã dự kiến cho ô Nơi trả ở đợt 2), nên thêm bến mới không cần sửa mã. Việc này chạm danh mục địa điểm nên làm ở đợt 2, và là một lý do để làm cùng đợt với việc chọn nhanh Nơi trả.
- Nối với bản bốn bước: nhóm này hiển thị gọn một dòng "Khách có mặt: 07:45 · Cảng Vinpearl", bấm vào mới mở ô.

**C. Hỏi một câu thay vì ba ô.** Một nút phân đoạn: "Xe đón khách | Khách tự đến". Chọn "Xe đón khách" thì ẩn hẳn phần có mặt, phiếu chỉ hiện "Xe đón khách"; chọn "Khách tự đến" thì hiện giờ và nơi (có nút Cảng Vinpearl, Bến tàu).
- Rõ nghĩa nhất cho nhân viên. Nhưng đổi cái được ghi: cần thêm một cột hoặc quy ước (khách đón thì check-in để trống), phiếu và màn hướng dẫn viên phải đọc theo quy ước mới, và đơn cũ phải hiển thị được. Đây là đổi dữ liệu và hợp đồng giữa các phần, nên phải qua ADR chủ duyệt, kèm người kiểm độc lập. Chưa nên làm trước khi đưa vào sử dụng.

## 3. Khuyến nghị

Làm **A ngay** (cùng đợt giao diện, nhỏ, không đổi dữ liệu), **thêm B ở đợt 2** (cùng cờ điểm chọn nhanh), **để C lại** và chỉ làm nếu sau vài tuần dùng thật nhân viên vẫn nhập sai hai kiểu khách.

## 4. Điều cần chủ chọn

1. Phương án A, B hay C (khuyến nghị A bây giờ, B đợt 2).
2. Câu chữ: "Khách có mặt" hay "Khách tập trung" hay "Điểm hẹn của khách" (khuyến nghị "Khách có mặt", ngắn và đúng việc).
3. Trên phiếu gửi khách, đổi chữ "Đón khách" thành "Xe đón khách" cho khác hẳn dòng "Khách có mặt" có đồng ý không (khuyến nghị đồng ý).

## 5. Điều chưa kiểm

Chưa xem tận mắt phiếu in thật và màn hướng dẫn viên với dữ liệu thật; chưa hỏi hướng dẫn viên xem họ cần câu chữ nào. Nên cho hai ba hướng dẫn viên xem ảnh phác trước khi chốt chữ.
