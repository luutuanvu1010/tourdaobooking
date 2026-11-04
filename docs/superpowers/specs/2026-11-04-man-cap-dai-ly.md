# Màn «Cấp đại lý»: gán cấp TA nhanh cho mọi đối tác

Chủ 4/11/2026, nguyên văn: «quan trọng nhất giờ là đã gán được các cấp từ ta1 cho đến ta6. Với mỗi TA thì có thể gán cho bất kỳ vai nào, và có thể thiết lập cấp TA nhanh ở trang Quản lý tài khoản (hoặc tương tự) mà không cần không cần truy cập trang Hoa hồng đối tác». Được hỏi có làm một màn gom mọi đối tác không, chủ trả lời: «Làm màn gom».

Đã thử trên dữ liệu thử 4/11: cột cấp ở Quản lý tài khoản chạy với năm vai. Còn hai chỗ hở: hồ sơ chưa có tài khoản không hiện ở trang đó; Kế toán không vào được trang đó (`GET /api/staff` 403).

## Làm gì

Một trang mới `/cap-dai-ly`. Danh sách lập theo **hồ sơ đang mang vai được hưởng**, có hay chưa có tài khoản, cá nhân hay tổ chức. Mỗi dòng: tên, loại hồ sơ, vai trò, có tài khoản hay chưa, cấp hiện hành. Bấm ô cấp mở đúng bảng đặt cấp của cột Quản lý tài khoản. Có ô tìm theo tên và lọc «Chưa có cấp». Điện thoại hiện dạng thẻ.

## Không làm

Không đổi dữ liệu, không migration, không ô quyền mới, không đổi cách tính hoa hồng, không thêm lệnh ghi (chỉ ba lệnh đặt, đổi, ngừng cấp riêng có sẵn). Không gán hàng loạt. Không tạo hay sửa tên cấp ở màn này. Không sửa mức hoa hồng. Không hiện SĐT, email, mã số thuế.

## Quyền

- Xem và sửa: người có `partner.commission.write`, không giữ quyền Đối tác: Kế toán, Quản trị, Toàn quyền.
- Giả định của người soạn, đảo ngược được: Bán hàng có `partner.commission.view` nhưng KHÔNG mở màn này, vì màn này mới gom tên đối tác với cấp của họ thành một danh sách.
- Route đọc mới cũng hỏi đúng ô đó; không dựa vào việc ẩn mục.

## Tiêu chí nghiệm thu

1. Kế toán mở màn, thấy cả hồ sơ có và chưa có tài khoản đang mang vai được hưởng; hồ sơ không mang vai đó không hiện.
2. Kế toán đặt TA3 cho công ty chưa có tài khoản ngay trên màn; đơn xác nhận sau đó tính theo TA3 (đúng hàm tính hiện có).
3. Đặt được bất kỳ cấp đang bật nào cho hồ sơ mang bất kỳ vai được hưởng nào, gồm loại đối tác tự thêm.
4. Bán hàng, Hành chính nhân sự, Đối tác, Tài xế đối tác gọi route đọc nhận 403; mục không hiện ở thanh bên của họ.
5. Phản hồi không có SĐT, email, mã số thuế, địa chỉ.
6. Không có câu truy vấn lặp theo từng hồ sơ.
7. Không có cấp nào thì màn nói rõ và trỏ sang trang Hoa hồng đối tác để tạo tên cấp, không để ô chọn rỗng.
8. Quản lý tài khoản có đường dẫn sang màn này. Cột cấp ở đó vẫn chạy như cũ.
9. Giao diện theo `web/CLAUDE.md`: dựng bằng `h()`, không `innerHTML`, ô gõ 16px, không chữ Anh lộ ra, không tạo token mới nếu đã có.

## Điểm dễ sai

- Bài `src/cot-cap-dai-ly-noi-day.test.ts` hiện ghim chỉ `web/staff.ts` nhập `web/cot-cap-dai-ly.ts`. Mở thêm đúng một tệp là `web/cap-dai-ly.ts`, không bỏ bài.
- `oCap` nhận dòng tài khoản (`permissions`, `fullName`) và nói «Chưa có vai trò» với dòng không giữ quyền Đối tác; hồ sơ không tài khoản không có `permissions`, nên phải đi đường phù hợp, không giả quyền.
- Trần gói trang: không làm vượt trần `src/goi-trang-nhe.test.ts`; biểu tượng mới có thể đẩy gói Đơn hàng vượt trần.
- Hàng nghìn đối tác: lọc ở trình duyệt được, nhưng không vẽ lại cả bảng theo từng phím nếu chậm rõ.
