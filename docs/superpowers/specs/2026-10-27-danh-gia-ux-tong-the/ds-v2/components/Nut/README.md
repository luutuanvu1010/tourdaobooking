Nút ba cấp của Island Booking System: **Chính** cho việc tiếp theo duy nhất của màn, **Phụ** cho việc thay thế hay quay lại, **Lối nhỏ** cho việc phụ trong khối. Gộp ≈ 48 kiểu nút của mã hiện tại (H-NUT) về một lớp `.nut` với biến thể bằng thuộc tính.

## Khi nào dùng
- `data-cap="chinh"`: **tối đa một** mỗi vùng (đầu trang, chân dính, chân bảng trượt). Nền `c-btn-primary-bg`, chữ `c-btn-primary-text`, bóng `shadow-btn-solid`. Thêm `data-tong="chot"` (san hô `c-accent`) **chỉ** cho «Xác nhận đơn để gửi khách» và «+ Tạo đơn» ở thanh trên; `data-tong="nguy-hiem"` (đỏ đặc `c-danger`) **chỉ** trong hộp xác nhận hành động một chiều.
- `data-cap="phu"`: nền `c-surface`, viền và chữ `c-primary`; «Quay lại», «+ Chiều về», «Chọn người phụ trách». Biến thể `data-tong="nguy-hiem"` viền và chữ `c-danger` cho «Huỷ đơn» ngoài hộp xác nhận.
- `data-cap="loi-nho"`: không nền không viền, chữ `c-primary` 500, gạch chân khi rê; «Xem tất cả», «Sửa giá», «+ Email, ghi chú».
- `data-co="lon"`: cao `h-control-lon` 52 ở chân dính điện thoại và trang Đăng nhập. `data-rong="het"`: rộng hết.
- Nút chỉ biểu tượng trên thanh trên dùng `.nut-bieu-tuong` (44 × 44, cần `aria-label`).

## Trạng thái
Bình thường · rê chuột (chỉ khi `hover: hover`) · bấm lún `press` · tiêu điểm vành `focus-ring` màu `c-focus` · **tắt**: xám phẳng (`c-surface-alt`, chữ `c-text-muted`, không dùng opacity) và **phải kèm** `.nut-ly-do` nói vì sao tắt (C-BAO-BAN-NUT-TAT) · đang gửi `data-dang-tai="true"`: vòng quay `m-spin` trong nút, chữ ẩn, không bấm được.

## Người dùng truyền gì
Nhãn là động từ («Lưu, chờ xác nhận», «Tải thêm 50»); biểu tượng `icon-md` 20 đứng trước chữ (tuỳ chọn); `type="button"` hay `href`. Mọi nút cao `h-control` 44 từ lớp gốc, bo `bo-control` 8, chữ `nut` 16/500 — không vá `min-height` ở từng màn.

## Đừng
Không nút viên thuốc, không nền xanh nhạt làm nút (nền nhạt chỉ cho mục đang chọn), không nét đứt, không hai nút chính cạnh nhau, không lặp cùng một nút chính ở hai nơi trên một màn (H-NUT-CHINH-TRUNG).
