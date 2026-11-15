# Phụ lục — chữ và con số của đợt 1, lượt A (15/11/2026)

Hồ sơ có ngày, đi kèm `TRINH-CHU.md`. Bạn không sửa thì dùng cột khuyến nghị.

## Chữ chờ bạn chọn

| Chỗ dùng | Khuyến nghị | Phương án khác |
|---|---|---|
| Tên của thứ người đăng ký điền | «Phiếu đăng ký» | «Đơn đăng ký» (dễ lẫn với đơn hàng); «Hồ sơ đăng ký» (dễ lẫn với hồ sơ ở Danh bạ) |
| Lối vào ở màn Đăng nhập | «Đăng ký làm đối tác» | «Đăng ký tài khoản»; «Chưa có tài khoản? Đăng ký» |
| Trạng thái người đăng ký thấy | «Đang điền», «Đang chờ xác minh», «Cần bổ sung», «Đang chờ duyệt», «Đã duyệt», «Bị từ chối», «Đã rút», «Hết hạn» | «Chờ xét duyệt» thay cho hai trạng thái chờ |
| Nút của người đăng ký | «Gửi phiếu», «Gửi lại», «Rút phiếu», «Đặt PIN» | «Nộp phiếu»; «Huỷ đăng ký» |
| Kết luận từng mục của Quản trị | «Đạt», «Không đạt» | «Chấp nhận», «Từ chối» (đang dùng ở phiếu tự khai) |
| Ba nút kết thúc xác minh | «Xác minh đạt», «Yêu cầu bổ sung», «Từ chối» | «Chuyển duyệt»; «Trả lại» |
| Nút của Nhân sự | «Duyệt mở tài khoản» | «Duyệt»; «Mở tài khoản» |
| Công tắc của Toàn quyền | «Nhận đăng ký mới» (Bật, Tắt) | «Mở đăng ký» |
| Tài khoản đã duyệt, chưa đặt PIN | «Chưa kích hoạt» | «Chờ đặt PIN» |
| Câu khi đang đóng đăng ký | «Tour Đảo tạm ngừng nhận đăng ký mới.» | — |

**Câu lý do người đăng ký nhìn thấy:**

1. «Ảnh hoặc thông tin không đọc được. Vui lòng gửi lại bản rõ hơn.»
2. «Thông tin khai không khớp với giấy tờ.»
3. «Giấy tờ đã hết hạn.»
4. «Giấy tờ gửi không đúng loại được yêu cầu.»
5. «Giấy tờ không phải của người đăng ký.»
6. «Chưa đối chiếu được giấy tờ. Vui lòng liên hệ Tour Đảo.»
7. «Không liên lạc được số điện thoại đã khai.»
8. «Thông tin này đã có trong hệ thống. Vui lòng liên hệ Tour Đảo.»
9. «Đăng ký không thuộc diện đối tác của Tour Đảo.»

Câu 8 cố ý không nói «đã có tài khoản», để người lạ không dò được ai đang là đối tác.

## Con số đề xuất

Đây là dữ liệu cài đặt, Toàn quyền đổi được sau; không viết cứng trong mã.

| Việc | Số đề xuất |
|---|---|
| Mã gửi qua thư | 6 số, dùng trong 10 phút, nhập sai tối đa 5 lần |
| Xin mã | 3 lần mỗi 15 phút cho một email; 10 lần mỗi 15 phút cho một địa chỉ mạng; cả Nền tảng tối đa 60 thư mỗi giờ |
| Phiên của người đăng ký | hết sau 30 phút không thao tác, tối đa 12 giờ |
| Phiếu đang điền bỏ dở | hết hạn sau 7 ngày |
| Phiếu cần bổ sung mà không sửa | hết hạn sau 14 ngày |
| Hạn đặt PIN sau khi được duyệt | 14 ngày; quá hạn thì Nhân sự bấm gửi lại lời mời |
| Ảnh | tối đa 5 MB mỗi ảnh, 8 ảnh mỗi phiếu |
| Phần chữ của phiếu không được duyệt | ẩn danh sau 30 ngày (ảnh thì xoá ngay). **Đổi số này là đổi thời gian giữ dữ liệu cá nhân của người lạ** |
