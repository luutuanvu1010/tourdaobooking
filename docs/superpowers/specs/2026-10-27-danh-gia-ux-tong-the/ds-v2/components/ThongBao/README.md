Thông báo trong trang (dải lỗi chặn, cảnh báo, thông tin, xong) và **toast** báo xong ngắn — một cơ chế thay cho ≥ 9 cách của mã (H-THONG-BAO). Dải có biểu tượng + câu «chuyện gì / làm gì tiếp»; toast 3 giây, không che việc, có «Hoàn tác» khi được.

## Khi nào dùng
**Dải trong trang** `.thong-bao[data-tong]`:
- `loi` (`c-danger-soft`/`c-danger-text`, biểu tượng `alertCircle`): lỗi chặn việc; đặt **ngay trên nút chính** hoặc đầu thân bảng trượt; giữ dữ liệu đã gõ. Gộp `.alert`, `.banner`, `.vc-alert`.
- `canh-bao` (`c-sand-*`, `alert`): nhắc có hậu quả nhẹ (giá danh mục đã đổi, đặt gấp) kèm nút lối nhỏ («Duyệt đặt gấp»).
- `thong-tin` (`c-band-bg`/`c-on-band`): chú thích cách hoạt động («Tiền trả trước được ghi vào sổ ngay sau khi lưu đơn»).
- `xong` (`c-green-*`, `check`): kết quả tại chỗ cần ở lại màn (đã gửi tin cho khách).

**Toast** `.toast`: chỉ cho việc **đã xong và hoàn tác được** («Đã xoá dịch vụ · Hoàn tác»). Không toast cho lỗi.

## Trạng thái
Dải: hiện cố định tới khi điều kiện hết (lỗi sửa xong thì tự ẩn); không tự ẩn theo giờ. Toast: **ĐỔI so với mã** (mã: nền trắng, vạch trái `c-primary`) — **nền tối `c-toast-bg`** (= `c-primary-strong`), chữ `c-on-dark` 16, biểu tượng `check` màu `c-green-soft`, «Hoàn tác» lối nhỏ `c-primary-soft` gạch chân, nút đóng ✕ 44; cao tối thiểu `h-control-lon` 52, rộng tối đa `w-toast` 360, bo `radius-md`, bóng `shadow-overlay`. Lý do: nổi rõ trên nền trắng của Nền tảng, tách hẳn khỏi thẻ và dải thông báo; bộ v2 bản đầu và Claude Design cùng chọn (bảng gộp 28/10, dòng 15). Đáy trên thanh tab + vùng an toàn (≥ 900: cách đáy `s5`), lớp `z-tren-cung`, tự ẩn sau 3 giây và **dừng đếm khi rê chuột hoặc có tiêu điểm**, một toast một lúc (toast mới thay toast cũ), đọc bằng trình đọc màn hình (`role="status"`).

## Người dùng truyền gì
Tông, câu (chuyện gì xảy ra + làm gì tiếp), nút lối nhỏ tuỳ chọn, `role` (`alert` cho lỗi, `status` cho còn lại).

## Đừng
Không thông báo che thanh bước hay nút chính (lỗi của Tạo đơn cũ); không toast đỏ; không hai dải cùng lúc trong một vùng; không câu lỗi kỹ thuật.
