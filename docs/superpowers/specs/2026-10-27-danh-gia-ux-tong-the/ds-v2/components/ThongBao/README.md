Thông báo trong trang (dải lỗi chặn, cảnh báo, thông tin, xong) và **toast** báo xong ngắn — một cơ chế thay cho ≥ 9 cách của mã (H-THONG-BAO). Dải có biểu tượng + câu «chuyện gì / làm gì tiếp»; toast 3 giây, không che việc, có «Hoàn tác» khi được.

## Dải trong trang `.thong-bao[data-tong]`
- `loi` (`c-danger-soft`/`c-danger-text`, biểu tượng `alertCircle`): lỗi chặn việc; đặt **ngay trên nút chính** hoặc đầu thân bảng trượt; giữ dữ liệu đã gõ. Gộp `.alert`, `.banner`, `.vc-alert`.
- `canh-bao` (`c-sand-*`, `alert`): nhắc có hậu quả nhẹ (giá danh mục đã đổi, đặt gấp) kèm nút lối nhỏ («Duyệt đặt gấp»).
- `thong-tin` (`c-band-bg`/`c-on-band`): chú thích cách hoạt động («Tiền trả trước được ghi vào sổ ngay sau khi lưu đơn»).
- `xong` (`c-green-*`, `check`): kết quả tại chỗ cần ở lại màn (đã gửi tin cho khách).

## Toast `.toast`
Nền `c-primary-strong` chữ `c-on-dark`, đáy trên thanh tab + vùng an toàn, lớp `z-tren-cung`, tự ẩn sau 3 giây, một toast một lúc (toast mới thay toast cũ), đọc bằng trình đọc màn hình (`role="status"`). Chỉ cho việc **đã xong và hoàn tác được** («Đã xoá dịch vụ · Hoàn tác»). Không toast cho lỗi.

## Người dùng truyền gì
Tông, câu (chuyện gì xảy ra + làm gì tiếp), nút lối nhỏ tuỳ chọn, `role` (`alert` cho lỗi, `status` cho còn lại).

## Đừng
Không thông báo che thanh bước hay nút chính (lỗi của Tạo đơn cũ); không toast đỏ; không hai dải cùng lúc trong một vùng; không câu lỗi kỹ thuật.
