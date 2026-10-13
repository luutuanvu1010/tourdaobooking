# Kiểm toán trước khi đưa vào sử dụng (13/10/2026)

> Hồ sơ có ngày, viết xong là đóng băng. Mốc kiểm: `main` = `483b3aa0`, bản **1.90**, trùng bản đang chạy production (lần triển khai gần nhất 13/10 lúc 10:15 giờ Việt Nam). Nối tiếp `2026-10-12-kiem-toan-toan-nen-tang/` và `2026-10-13-nghiem-thu-phien-va-san-sang-su-dung.md`. Người kiểm chỉ đọc, không sửa mã.

## 1. Kết luận

**Mở với điều kiện.** Tôi không thấy lỗi mức Critical (mất tiền thật, lộ dữ liệu khách ra ngoài). Có **một lỗi High** mà tôi đã tự chạy lại và thấy đúng: tài khoản Đối tác đọc được lý do nội bộ và tên người duyệt về tiền (hoàn cọc, điều chỉnh sổ) của chính đơn mình. Lỗi này nên vá trước khi mở cho đại lý thật. Ngoài ra có 16 lỗi Medium, phần lớn nhỏ. Dùng thử với nhóm nhỏ toàn nhân viên nội bộ thì được ngay; mở cho đối tác và toàn bộ nhân viên chỉ nên làm sau khi vá lỗi High, xử lý mốc 31/10, và Kế toán xác nhận xong sổ vàng. Cơ sở dữ liệu, sổ tiền và điều phối xe chắc hơn mức tôi dự đoán: các cổng chặn đều có máy canh hoặc bài kiểm.

## 2. Phát hiện mức High

| Mã | Chuyện gì, nói thường | Tái hiện thế nào | Xử lý khuyến nghị | Cỡ việc |
|---|---|---|---|---|
| D-1 | Đối tác (đại lý) xem lịch sử đơn của mình thì thấy cả dòng nhật ký nội bộ: tên Kế toán, tên người duyệt hoàn cọc, và câu lý do tự do (ví dụ "hoàn thêm dù quá hạn, đừng báo đối tác"). Gốc lỗi: hệ thống chỉ *giấu* vài loại dòng đã biết, nên loại dòng nào thêm sau cũng tự lộ. | Đối tác lập và xác nhận đơn; Kế toán thu; Quản trị huỷ; chủ duyệt hoàn cọc kèm lý do. Đối tác gọi `GET /api/orders/:id` và `GET /api/orders/:id/payments`: cả hai trả đúng câu lý do và tên "Chủ". Tôi đã chạy lại trên khung thử, kết quả đúng. | Đổi sang kiểu chỉ *cho phép* vài loại dòng với Đối tác; bỏ lý do, người duyệt, người ghi khỏi phần cọc cho Đối tác; thêm bài kiểm tự bắt loại dòng mới. | Lớn (chạm quyền và tiền, cần người kiểm độc lập) |

## 3. Phát hiện Medium nên biết (chi tiết ở `phu-luc/`)

| Mã | Chuyện gì | Việc |
|---|---|---|
| D-2 | Nhân sự (HR) tạo được tài khoản Bán hàng, nhận mã PIN, đăng nhập và xem đơn kèm tên, SĐT khách (ADR-0071 nói HR không xem đơn). Đã chạy lại, đúng. | Chủ quyết |
| F-1 | Một ô giá gõ sai trong Google Sheet (chữ "1.200.000", số âm) làm dịch vụ biến mất khỏi form bán hàng trong 15 phút, không ai được báo. Đơn đã xác nhận không đổi tiền. | Nhỏ |
| A-3 | Giá đổi trong Sheet được áp thẳng, không có ngưỡng (gõ 8000 thay vì 800000 là áp ngay). Phụ thuộc ai sửa được Sheet (chưa kiểm). | Lớn |
| C-2 | Trần điều chỉnh sổ tiền chỉ tính từng lệnh, không cộng dồn; Kế toán gửi hai lệnh 500.000 trên đơn phải thu 500.000 đều qua. (Liên quan HC-4.2 đã biết.) | Nhỏ |
| C-1 | Mức hoa hồng "đ/khách" lớn hơn giá dịch vụ vẫn nhận, ra "giá đại lý" âm. Chưa thành tiền thật (đợt 1 chỉ hiển thị); phải sửa trước đợt 2. | Nhỏ, hỏi chủ |
| B-1 | Máy chủ không kiểm ba mốc giờ (đón sau khởi hành, ngày check-in năm 2001 đều được lưu). | Nhỏ |
| B-2 | Bấm đúp "ghi lần thu" mà thiếu mã chống trùng thì ra hai lần thu; web luôn gửi mã nên bình thường không dính. ADR-0094 đang ở giai đoạn 1. | Chủ chọn ngày bật giai đoạn 2 |
| D-3 | Người lạ gõ sai PIN 5 lần khoá được đăng nhập của người khác 15 phút (nợ ADR-0014 D-04). | Nhỏ |
| E-1 | Chuyến quên bấm "Kết thúc" thì tài xế vẫn thấy tên, SĐT khách nhiều ngày sau. | Vừa |
| E-2 | Tài xế đối tác thấy tên tài xế công ty và điểm đón của các chuyến công ty cùng ngày. | Nhỏ-vừa |
| A-1, A-2, G-1…G-4 | Dựng lại bảng `orders` bằng migration sẽ xoá im lặng dòng tiền; bài canh dữ liệu trên production không chạy chế độ nghiêm; 31/10 chặn phát hành (mục 5); báo lỗi giữa chừng khi triển khai chưa in lệnh cứu; chưa có bản xuất ngoài Cloudflare; số điện thoại thật nằm trong mã và tài liệu. | Nhỏ đến vừa |

## 4. Trạng thái các mục đã biết từ 12/10 và 13/10

K-B-1 (Thực tập giảm giá): đã vá trong mã. K-A-1 (rào SQL billing): đã vá. K-A-3 (một công thức hoa hồng): đã vá. K-A-2 (25 ca vàng): còn hở, chưa ca nào có người thật xác nhận. K-B-3 (Bán hàng đổi bên đặt thì đổi người hưởng hoa hồng): còn hở. K-B-4 (tài khoản vừa nội bộ vừa Đối tác): còn hở, trigger chỉ chạy lúc thêm mới. K-C-01 (phải thu không âm): đã vào mã. K-C-03 (khoá tháng chưa diễn tập khôi phục): còn hở. K-C-04: không kiểm được. TNV-G1/G3/G4: mã đã vá, còn chờ ca vàng và vài tin báo; chữ "chưa lên production" trong sổ hoãn đã cũ. HC-4.2: còn hở. HC-5.19: còn hở. HC-5.11: còn hở, có hai chỗ gọi (không phải một).

## 5. Thứ tự các bước đưa vào sử dụng

1. **Vá D-1** (AI thi công, người kiểm độc lập). Kèm F-1, C-2, A-2 nếu kịp (việc nhỏ). Sang bước sau khi test xanh và người kiểm xác nhận. Hoàn tác: quay về bản 1.90.
2. **Chủ quyết mốc 31/10** (chủ): vá hoặc gia hạn năm mục (TNV-G1, G3, G4, HC-4.2, HC-5.19). Không quyết thì từ 1/11 `npm test` đỏ và `npm run trien-khai` / `day-len` đều dừng, kể cả khi cần vá nóng. Nên làm *trước khi mở*.
3. **Diễn tập khôi phục trên bản sao** (chủ + AI chuẩn bị lệnh), cộng việc xuất dữ liệu D1 ra ngoài Cloudflare định kỳ. Điều kiện: khôi phục chạy được, ghi thời gian. Chưa ai làm lần nào.
4. **Kế toán xác nhận 25 ca vàng** (Kế toán). Điều kiện: JSON ca vàng chuyển sang "đã xác nhận".
5. **Chủ quyết dữ liệu thử trên production** (dọn hay giữ), tạo điểm Time Travel, rồi chạy `audit-invariants --db remote` và dán kết quả (tôi chưa chạy được, xem mục 6).
6. **Nạp nhân viên, danh mục, đối tác thật** (chủ; nhân viên nạp qua màn tài khoản, không còn qua Sheet). Bật Turnstile trên production nếu chưa; xác định ai có quyền sửa Sheet danh mục.
7. **Kiểm tay đủ vai** trên production, Face ID trên iPhone, thông báo (chủ + Kế toán).
8. **Dùng thử nhóm nhỏ 1–2 tuần** (nhân viên nội bộ). Mỗi ngày xem Góp ý / Báo lỗi và `audit-invariants --db remote`.
9. **Mở toàn bộ**: tắt bảo trì sau khi mọi người đã đăng nhập bằng bản mới. Hoàn tác: bật lại bảo trì.
10. **Sau khi mở**: không khoá tháng nào cho tới khi diễn tập khôi phục xong; Kế toán đảo 22 lần thu chưa rõ người thu; xử lý mốc 15/11, 30/11, 31/12 và 31/3/2027 trong sổ hoãn.

## 6. Điều chưa kiểm được

Máy phân quyền từ chối `audit-invariants --db remote` (đọc production), nên **chưa kiểm** dữ liệu thật; tôi cũng không có quyền xem Sheet, Workers Logs, thời hạn giữ Time Travel, Turnstile trên production có bật không. Không chạy được: D1 thật (chỉ sqlite giả lập), từng trang `web/` về nút ẩn/hiện, kịch bản Chrome. Chạy được và đã chạy: `npm run typecheck` (0 lỗi) và `npm test` (4.477 bài, 4.468 đạt, 9 chờ, 0 đỏ). `npm run test:e2e` (cần mạng, đọc Google Sheet thật): lần đầu 58/59 kịch bản đạt; kịch bản `catalog` lỗi ở bước chờ cố định 3 giây cho tác vụ tự động (xem G-9, lỗi chập chờn của bài kiểm), chạy lại riêng thì 4/4 xanh. Cuối e2e `audit-invariants --strict` trên D1 local: mọi bất biến đạt (5–8 cảnh báo), nhưng đó là dữ liệu thử vừa tạo, không nói gì về production.

## 7. Cần chủ quyết

1. **Mức mở**: dùng thử nhóm nhỏ nội bộ ngay (khuyến nghị) và mở rộng sau bước 4–7.
2. **D-1 và D-2**: Đối tác chỉ thấy một danh sách *cho phép* các dòng lịch sử (khuyến nghị); HR có được tự tạo tài khoản Bán hàng không (khuyến nghị: chỉ gán vai không mở đơn/tiền, hoặc duyệt ADR-0093 PIN tạm).
3. **Mốc 31/10**: vá hay gia hạn năm mục (khuyến nghị: gia hạn có ghi lý do cho HC-5.19 và HC-4.2, vá phần còn lại).
