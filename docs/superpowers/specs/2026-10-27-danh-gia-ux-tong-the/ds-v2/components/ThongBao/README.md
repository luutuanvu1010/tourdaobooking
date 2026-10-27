Thông báo trong trang (dải lỗi chặn, cảnh báo, thông tin, xong) và **toast** báo xong ngắn — một cơ chế thay cho ≥ 9 cách của mã (H-THONG-BAO). Dải có biểu tượng + câu «chuyện gì / làm gì tiếp»; toast 3 giây, không che việc, có «Hoàn tác» khi được.

## Khi nào dùng
**Dải trong trang** `.thong-bao[data-tong]`:
- `loi` (`c-danger-soft`/`c-danger-text`, biểu tượng `alertCircle`): lỗi chặn việc; đặt **ngay trên nút chính** hoặc đầu thân bảng trượt; giữ dữ liệu đã gõ. Gộp `.alert`, `.banner`, `.vc-alert`.
- `canh-bao` (`c-sand-*`, `alert`): nhắc có hậu quả nhẹ (giá danh mục đã đổi, đặt gấp) kèm nút lối nhỏ («Duyệt đặt gấp»).
- `thong-tin` (`c-band-bg`/`c-on-band`): chú thích cách hoạt động («Tiền trả trước được ghi vào sổ ngay sau khi lưu đơn»).
- `xong` (`c-green-*`, `check`): kết quả tại chỗ cần ở lại màn (đã gửi tin cho khách).

**Toast** `.toast`: chỉ cho việc **đã xong và hoàn tác được** («Đã xoá dịch vụ · Hoàn tác»). Không toast cho lỗi.

## Trạng thái
Dải: hiện cố định tới khi điều kiện hết (lỗi sửa xong thì tự ẩn); không tự ẩn theo giờ. Toast: diện mạo **giữ theo mã** (app.css `.toast`): nền `c-surface`, viền `c-border`, vạch trái `s1` màu `c-primary`, chữ `c-text` 14/500, bo `radius-md`, bóng `shadow-overlay`; đáy trên thanh tab + vùng an toàn, lớp `z-tren-cung`, tự ẩn sau 3 giây, một toast một lúc (toast mới thay toast cũ), đọc bằng trình đọc màn hình (`role="status"`). Diện mạo cuối chờ tấm vẽ Claude Design rồi gộp (bảng lệch 2c F6).

## Người dùng truyền gì
Tông, câu (chuyện gì xảy ra + làm gì tiếp), nút lối nhỏ tuỳ chọn, `role` (`alert` cho lỗi, `status` cho còn lại).

## Đừng
Không thông báo che thanh bước hay nút chính (lỗi của Tạo đơn cũ); không toast đỏ; không hai dải cùng lúc trong một vùng; không câu lỗi kỹ thuật.
