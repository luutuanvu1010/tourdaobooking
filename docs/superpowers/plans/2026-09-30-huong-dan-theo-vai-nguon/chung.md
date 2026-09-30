# Nguồn đối chiếu — Hướng dẫn Phần chung (bản 1.40, main 3d0d2fe5)

Nội dung ở `src/shared/huong-dan-chung.ts`. Đường dẫn tính từ gốc repo. Chỉ đọc mã, **chưa thử trên trình duyệt thật**, chưa có người kiểm độc lập.

## Đối chiếu theo mục

- **Đăng nhập**: public/login.html:15-16 (Số điện thoại), :19-22 (Mã PIN 6 số, Hiện), :26-27 (Turnstile, Thử lại), :29 (Đăng nhập), :31 (nút Face ID chỉ có biểu tượng); web/login.ts:108-110 (Hiện/Ẩn), :303, :313 (lỗi xác minh), :414-440 (gửi; 401 xoá PIN); src/modules/auth/index.ts:70 (nhập sai quá nhiều lần… hoặc nhờ người phụ trách hệ thống mở khoá), :77 (sai SĐT/PIN); web/staff.ts:100 (Mở khoá — Quản trị làm được, ô account.access.manage ở src/shared/permissions.ts:103).
- **Face ID**: web/login.ts:141-222 (nút Face ID, lời mời "Bật đăng nhập bằng Face ID?", Để sau); web/passkey.ts:56-93 (Bật, Tiếp tục với Face ID, Nhập lại PIN để xác nhận, "Chỉ bật trên điện thoại riêng của bạn."); web/account.ts:206-278 (Đăng nhập bằng Face ID, Gỡ, Gỡ tất cả).
- **Cài iPhone**: web/account.ts:327-329 (câu "bấm Chia sẻ → Thêm vào MH chính, rồi mở app từ biểu tượng"); public/manifest.webmanifest:2-3 (Island Booking System / Island Booking); docs/PWA-IPHONE.md:3 (tên cũ dưới biểu tượng), :20 (iOS tách cookie → đăng nhập lại một lần).
- **Thông báo**: web/account.ts:284-397 (Thông báo trên điện thoại, Bật thông báo trên điện thoại, "Đang bật trên máy này.", Tắt, câu bị chặn → Cài đặt → Thông báo → Island Booking); web/shell.ts:100-125 (đăng xuất chỉ tắt máy này); src/shared/changelog.ts mục 1.36 (đổi PIN, gỡ Face ID, ngưng → tắt) và mục có "Từ 22:00 đến 6:00"; docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md:7.
- **Chuông, Bảng tin**: web/thong-bao-ui.ts:28-29 (hai ngăn), :105-107 (Để sau, Đã hiểu), :168 (Đọc và bấm Đã hiểu), :256-257 (Tất cả, Của tôi), :313 (giữ tin 30 ngày); web/bangtin.ts:14-38; src/shared/bang-tin.ts:106-120 (câu báo, chỉ văn phòng + HDV).
- **Trang Tôi, đổi PIN, quên PIN, đăng xuất**: public/account.html (Đổi mã PIN, PIN hiện tại, PIN mới (6 số), Nhập lại PIN mới, Đổi PIN, "Đã đổi PIN…"); web/account.ts:24-90 (hồ sơ, liên kết, Đăng xuất), :95-124 (Giấy tờ của tôi), :148-204 (Quên PIN? Đặt PIN mới bằng Face ID, Xác nhận bằng Face ID); web/shell.ts:242 (mục "Của tôi" trên máy tính), :303 (Đăng xuất ở menu).
- **Trợ giúp**: public/help.html (Nhật ký thay đổi, nút Góp ý / Báo lỗi); web/help.ts:18 (Mới cập nhật); web/shell.ts:66, :244 (chấm đỏ).
- **Góp ý**: public/feedback.html (Loại, Tiêu đề, Mô tả, Gửi); src/shared/feedback-catalog.ts:6 (Báo lỗi, Đề xuất, Câu hỏi); web/feedback.ts:56 (tự đính kèm), :96-98 (Yêu cầu của tôi); src/shared/permissions.ts:106-108 (chỉ Toàn quyền đọc mọi yêu cầu).
- **Bảo trì**: web/maintenance-screen.ts:63-92 (Đang bảo trì, Thử lại, Tải lại trang, Đăng xuất); src/shared/maintenance.ts:89-100.
- **FAQ mất mạng**: web/shell.ts:460-466.

## Điểm chưa chắc / chưa kiểm

- Ô xác minh người thật (Turnstile): viết "nếu có". Chưa kiểm production đang bật hay tắt.
- "Đăng nhập lại khoảng mỗi tuần" (phiên 7 ngày, theo docs/PWA-IPHONE.md) chưa đối chiếu trong mã nên đã **bỏ khỏi** nội dung.
- Quên PIN bằng Face ID phải đang đăng nhập: suy ra vì mục này nằm ở trang Tôi, chưa thử.
- Câu PIN dễ đoán: bản gốc ghi "123456 hoặc 111111" (public/account.html). Trong hướng dẫn viết lại bằng lời vì ví dụ số dài 6 chữ số dễ bị hiểu nhầm; không vi phạm luật A3.
- Nút Face ID ở màn đăng nhập chỉ có biểu tượng, không có chữ, nên không dùng [[…]].
- Tên màn đăng nhập ghi "Tour Đảo Booking", tên app/biểu tượng ghi "Island Booking System" / "Island Booking" — chủ có thể muốn thống nhất một tên.
- Chưa thử trên iPhone thật.
