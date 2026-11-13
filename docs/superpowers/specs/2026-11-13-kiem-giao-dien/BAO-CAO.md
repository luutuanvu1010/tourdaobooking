# Báo cáo kiểm giao diện toàn diện — bước 0 (13/11/2026)

> Hồ sơ có ngày. Phiên kiểm (chỉ đo, không sửa mã, không chạm bản thật). Đo trên bản chính mới nhất (bản 2.96), máy chủ thử với dữ liệu giả,
> đã áp đúng tệp giao diện công ty đang dùng trên bản thật. Danh sách đầy đủ: `PHAT-HIEN.md`. Ảnh so sánh: `docs/evidence/2026-11-13-kiem-giao-dien/so-sanh.html`.

## Kết luận

Nền tảng hiện **chắc ở phần nền**: không trang nào bị kéo ngang ở bất kỳ khổ nào, mọi nút đều có tên cho bộ đọc màn hình, thông tin chính (tên khách, mã đơn,
số tiền, số khách) không bị cắt, mở lại trang dưới 1 giây. Nhưng để **lên hai kho ở dạng công khai** thì còn **5 điểm chặn**, đều nằm ngoài các màn làm việc:
thiếu trang chính sách quyền riêng tư và trang hỗ trợ công khai, màn Đăng nhập không tự giới thiệu với người lạ hay người duyệt của kho, tên Nền tảng có ba kiểu,
biểu tượng và màn chờ khi mở chưa đủ chuẩn, và chưa có lối xin xoá tài khoản. Phần làm người dùng thấy «chưa chuyên nghiệp» tập trung ở **14 điểm nặng**,
phần lớn là lỗi chung của khung (một chỗ sửa, mọi trang cùng đẹp lên), đúng với bước 1 của kế hoạch.

## Đã đo gì

Tôi chạy máy đo trên **212 cặp trang × vai** (đủ 11 quyền và người chưa đăng nhập), mỗi cặp ở 8 khổ màn: ba khổ có chụp ảnh (điện thoại 390, iPad đứng 820,
máy tính 1280) và năm khổ chỉ đo số (360, 430, iPad nằm 1180, 1024, 1440); tổng **2.709 ô đo**, không ô nào lỗi kịch bản. Thêm: kho dữ liệu rỗng,
trang 403 / 404 / mất mạng, đo tốc độ trên mạng 4G chậm, 10 hành trình thật từ màn Đăng nhập, và hai phép xấp xỉ chữ cỡ lớn.

## Năm điểm chặn lên kho

1. **K1** Chưa có trang chính sách quyền riêng tư và trang hỗ trợ công khai; màn Đăng nhập không có liên kết tới chúng.
2. **K2** Người chưa có tài khoản gặp ngay ô số điện thoại và PIN, không một câu giới thiệu hay chỉ cách xin tài khoản; chưa có tài khoản thử cho người duyệt.
3. **K3** Tên Nền tảng có ba kiểu: «Tour Đảo Booking», «Island Booking System», «Island Booking» (tên dưới biểu tượng iPhone).
4. **K4** Biểu tượng chưa có loại dành cho Android cắt tròn, tệp khai báo thiếu mã định danh, chưa có màn chờ khi mở (mở lên là màn trắng).
5. **K5** Có «Yêu cầu xoá dữ liệu» trong trang Tôi, nhưng chưa có lối xin xoá tài khoản và chưa có địa chỉ web cho việc này (chạm dữ liệu nên cần ADR riêng).

## Các điểm nặng đáng sửa trước (chi tiết ở `PHAT-HIEN.md`)

- **Khoá phóng to** trên mọi trang (N1). Bạn đã quyết khoá từ 30/9; tôi nhắc lại một lần vì bản công khai sẽ bị chấm theo chuẩn trợ năng (P18). Bạn vẫn giữ thì giữ.
- **Chữ không theo cỡ chữ của điện thoại** (N2): khi tôi nhân đôi cỡ chữ, 188/212 trang bị cắt chữ và 78 trang bị kéo ngang. Cần thử trên iPhone thật.
- **Xoay ngang điện thoại, màn Tạo đơn gần như không dùng được** (N3): thanh nút dưới chiếm hơn một phần ba màn.
- **Máy tính: chữ thương hiệu đè mục «Trang chủ» ở thanh bên** (N4, 310 ô); **iPad đứng dùng bố cục điện thoại kéo giãn** (N7); **bề rộng nội dung mỗi trang
  một kiểu** (N8).
- **Nút nhỏ hơn cỡ ngón tay** ở 210/636 ô điện thoại, rõ nhất là nút ảnh đại diện trên mọi trang (N5); **trung bình 6,5 kiểu nút trên một màn** (N6).
- **Băng thông báo cao 3–4 dòng ở đầu mọi màn điện thoại** (N9); **nhảy bố cục khi dữ liệu về** ở 17/57 trang (N10); 16 hộp hỏi kiểu trình duyệt còn sót (N11).

## Bảng tiêu chí

| Đạt | Không đạt | Chưa kiểm |
|---|---|---|
| T1 không kéo ngang · T2 thông tin chính · T11 mở lại ≤ 1 s · T15 phần máy (0 nút không tên) · T17 chữ nút | T3 · T4 · T5 · T6 · T7 (số đo nền, chờ lưới) · T8 · T9 · T10 · T12 · T14 (6/10) · T16 · T18 (3 họ dưới 7) · T19 | T13 và VoiceOver (cần iPhone của bạn); Android, iPad thật |

## Giới hạn

Chrome giả lập không phải iPhone thật: vùng tai thỏ, bàn phím ảo, cỡ chữ của máy và VoiceOver phải thử tay. Ba kịch bản hành trình cũ đã lỗi thời vì luồng đổi
(Đối tác, Kế toán, Tài xế công ty) — ghi rõ, không tính là lỗi giao diện. Điểm Nielsen là nhận định của AI trên ảnh, không phải số đo máy.

## Bước kế (theo kế hoạch mục 5)

Bạn đọc báo cáo và chọn đợt. Tôi khuyến nghị: **bước 1 sửa khung chung** gồm N3, N4, N5, N9, N10, N11, N12, N13 (một chỗ sửa, mọi trang lợi), song song
**soạn ADR lên kho** để giải K1–K5; N6–N8 để bước 2 (lưới bố cục Chặng 3).
