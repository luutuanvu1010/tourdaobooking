# Báo cáo Chặng 1 — đánh giá toàn bộ trải nghiệm Nền tảng (27/10/2026)

Hồ sơ có ngày, một trang cho chủ dự án. Mọi con số có ảnh hoặc số liệu kèm đường dẫn ở `PHU-LUC-PHAT-HIEN.md` (63 phát hiện, mã H-… hệ thống / C-… cục bộ), `KIEM-KE.md` và `docs/evidence/2026-10-27-danh-gia-ux-tong-the/`. Đã đo trên máy thử với dữ liệu giả: 44 trang + Đăng nhập, 10 bộ quyền, khổ điện thoại và máy tính (thêm hai khổ cho danh sách, bảng điều khiển), ba trạng thái dữ liệu, ba trạng thái lỗi, 10 hành trình thật, tốc độ trên 4G chậm giả lập; tổng 1.422 ô quét, không ô nào lỗi kịch bản.

## Kết luận chính

Giả thuyết của bạn **đúng**: Nền tảng không nói cùng một ngôn ngữ, và nguyên nhân nằm ở chỗ **chưa có lớp "thành phần dùng chung" giữa bảng màu và các trang**, không phải ở từng màn. Máy đo trên màn hình thấy 86 hình nút, 24 hình huy hiệu (10 chữ cùng nghĩa mà khác hình, ví dụ "Đã xác nhận", "Đang chạy"), 26 hình thẻ, 16 hình ô nhập; trong mã có 64 họ tên lớp riêng theo từng đợt vẽ, phần dùng chung chỉ chiếm 6 % luật giao diện. Mỗi đợt Claude Design vì thế lại tự tạo nút, chip, thẻ riêng. Phần đã tốt và cần giữ: bảng màu thương hiệu, thang cỡ chữ, ô gõ 16 px ở 100 % trang, đi bằng phím Tab thấy đủ tiêu điểm, trạng thái đơn hàng có đúng một nguồn chữ và màu.

## Bảy phát hiện hệ thống quan trọng nhất (sửa một lần ở khung chung là hết ở mọi trang)

1. **Mở trang lần đầu chưa đạt 1 giây** (tiêu chí 1): trên 4G chậm, khung vỏ hiện sau gần 1 giây nhưng nội dung thật xong sau 1,1–2,0 giây ở cả 45 trang; mở lại thì nhanh (0,2–0,9 giây), bấm nút phản hồi tức thì. 12 trang nhảy bố cục khi nội dung đến vì thiếu khung xương. Thủ phạm là cách đóng gói (mỗi trang chứa lặp khung chung, tệp giao diện 426 KB nạp ở mọi trang, tải sẵn gần 2 MB lần đầu) và 5–14 lời gọi dữ liệu mỗi trang; bộ xử lý không phải nút thắt (H-GOI, H-TOC-DO).
2. **Hai dải báo chồng lên đầu mọi trang** chiếm gần một phần ba màn điện thoại, kể cả khi đang lập đơn; ở Trang chủ, ô tìm đè lên dải bảo mật làm nút "Bật ngay" không bấm được (H-DAI-TREN, C-TRANG-CHU-DAI-DE).
3. **Nút nổi "Trợ lý" che nội dung ở mọi trang**: che số tổng cộng 900.000 ₫ của Bảng kê, che nút "Chọn người phụ trách" khi tạo đơn, che nút "Nhận" của hướng dẫn viên (H-FAB).
4. **Nút, huy hiệu, ô nhập, hộp thoại mỗi nơi một kiểu**; hành động chính lúc xanh đậm lúc đỏ, có màn ba lối "Tạo đơn" cùng lúc; 17 chỗ còn dùng hộp hỏi của hệ điều hành (H-NUT, H-CHIP, H-O-NHAP, H-HOP-THOAI, H-NUT-CHINH-TRUNG).
5. **Người dùng không biết mình đang ở đâu**: thanh tab sáng nhầm mục "Tôi" ở Điều phối, Khoá sổ, Xe…; số mục thanh tab từ 2 đến 6 tuỳ vai; tiêu đề lặp hai lần ở nhiều trang; Kế toán không có Sổ công nợ trên thanh tab (H-DIEU-HUONG, H-DAU-TRANG).
6. **Trang không có quyền, không tồn tại, mất mạng chưa được thiết kế**: địa chỉ sai hiện nguyên dòng mã lỗi; trang không quyền vẫn dựng ô tìm, bộ lọc rồi thêm một câu đỏ; mất mạng thì khung xương nhấp nháy mãi, không nút thử lại (H-404, H-403, H-MAT-MANG).
7. **Cả năm mức độ đậm chữ cùng bằng 500**, nên tiêu đề, nhãn, nút, nội dung chỉ khác nhau bằng cỡ, bảng dày khó quét mắt (H-DO-DAM). Có thể là lựa chọn của bạn ở đợt "Thị giác 1.70", nên tôi chỉ nêu.

**Mười hành trình thật**: 8/10 tới đích — Bán hàng lập đơn 3 dịch vụ hết 9 chạm sau đăng nhập, Kế toán kiểm vé và đối chiếu công nợ hết 3 chạm, Nhân sự tạo tài khoản không phải đoán bước nào. Hai hành trình kẹt đều là **người ngoài công ty**: Cộng tác viên gửi đơn bị chặn *sau khi* đã lưu vì chưa chọn "Đón / Không đón" mà biểu mẫu không hỏi trước; Tài xế đối tác điền xong giờ bận thì nút "Lưu" xám lại, không nói thiếu gì. Hướng dẫn viên phải cuộn gần 8 màn qua 19 đơn chờ nhận mới thấy đơn của mình.

**Ba màn mới nhất** (Tạo đơn, Hoa hồng + Hỗ trợ, Sổ công nợ) có mẫu đáng nhân rộng: một nút chính ở chân màn kèm tóm tắt tiền, danh sách trái + chi tiết phải trên máy tính, trạng thái rỗng có câu và chỗ bấm tiếp. Nhưng mỗi màn vẫn tự mang tab, chip, nhãn ô, mốc bề rộng riêng: làm đúng từng màn không tạo ra ngôn ngữ chung.

## Nền công nghệ giao diện có cản chuẩn mực không?

**Không cản, nhưng thiếu một tầng.** HTML + CSS + TypeScript thuần dựng được mọi thứ Oracle Redwood đòi hỏi: khuôn bảng trượt chung đã được 31 tệp dùng lại ổn, ba màn mới nhất đạt mẫu danh sách–chi tiết, chân dính, rỗng có hướng dẫn mà không cần thư viện. Cái cản là **không có tầng thành phần dùng chung**, nên mỗi phiên Claude thêm trang là thêm một họ tên lớp mới. Về tốc độ, 45 trang đều vẽ khung trong khoảng 1 giây và bộ xử lý không bị chặn; chỗ chậm nằm ở đóng gói, tải sẵn, số lời gọi dữ liệu — sửa được trong khung hiện có. Tôi **không đề xuất đổi khuôn hay thêm thư viện**; nếu bạn muốn cân nhắc thì cần một ADR riêng với hai lựa chọn: (a) dựng lớp thành phần bằng chính HTML/CSS/TS hiện có (đợt 0 ở `LO-TRINH.md`), (b) đổi sang khuôn có sẵn thành phần (vi phạm ràng buộc, viết lại 127 tệp giao diện, không khuyến nghị).

## Ba quyết định cần bạn chốt trước Chặng 2

1. **Duyệt đề cương hệ thống hợp nhất** (`HE-THONG-HOP-NHAT.md`): giữ mô hình điều hướng, dựng bộ "Island Booking System — Design System v2" ba tầng với lớp thành phần dùng chung. Khuyến nghị: duyệt, vì không chạm nghiệp vụ, dữ liệu hay tiền.
2. **Độ đậm chữ**: giữ một mức 500, hay mở lại ba mức (400 nội dung / 500 nhãn, nút / 600 tiêu đề, số lớn). Khuyến nghị: mở lại, đổi bằng token, không chạm mã trang.
3. **Khung tải**: cho đợt thi công đầu sửa đóng gói và tải sẵn qua một ADR nhỏ sửa ADR-0035. Khuyến nghị: đồng ý, với điều kiện đo trước/sau bằng chính kịch bản của đợt này; riêng việc gộp lời gọi dữ liệu chạm API, để riêng chờ bạn.

Việc chạm nghiệp vụ (câu lỗi máy chủ nói sai lý do; luật xác nhận đơn ngày đã qua) ghi ở `PHU-LUC-PHAT-HIEN.md` mục A, chờ bạn quyết riêng. Tám câu hỏi nhỏ (nút nổi Trợ lý, nhãn nổi ở Tạo đơn, cách đếm thanh bên, cách ghi tiền, dải nhắc bảo mật, trang 404, nhật ký trên Hướng dẫn) gom ở `LO-TRINH.md` mục 5, mỗi câu đã có đề xuất; bạn không trả lời thì làm theo đề xuất.
