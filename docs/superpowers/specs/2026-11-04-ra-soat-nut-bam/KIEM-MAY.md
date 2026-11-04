# Kết quả máy kiểm (do máy sinh, đừng sửa tay)

Sinh bởi `kiem-va-sinh.mjs` từ `nut-quan-trong.json` và `danh-sach-day-du.json`.

- Nút thật trong mã: **874**. Máy coi là ứng viên (có ghi, tông nguy hiểm, hoặc nút chính): **422**.
- Hàng trong danh sách quan trọng: **298** (mỗi hàng một việc, nút mở và nút trong hộp tính một). Ứng viên có lý do bỏ qua: **74**.
- Kết luận: đúng 185 · chưa rõ 99 · gây hiểu lầm 14. Ưu tiên: cao 9 · vừa 58 · thấp 46.
- Số tên đề xuất đã kiểm với bảng từ: 179.

## Số hàng theo vai

| Vai | Số hàng |
|---|---:|
| Bán hàng | 118 |
| Kế toán | 113 |
| Quản trị | 216 |
| Hiện trường | 53 |
| Đối tác | 41 |
| Toàn quyền | 278 |
| Thực tập | 49 |
| Tài xế công ty | 47 |
| Tài xế đối tác | 45 |
| Nhân sự | 40 |

## Trang không có hàng (có lý do)

- `/so-cong-no`: chỉ đọc: danh sách số dư và chi tiết từng bên; các nút chỉ lọc, xem thêm và quay lại
- `/bang-ke-xe`: chỉ đọc: bảng kê chi phí xe thuê theo khoảng ngày; không có nút ghi hay nút tải (web/bang-ke-xe.ts ghi chú «chưa có nút Tải bảng kê»)
- `/audit`: Nhật ký chỉ đọc; chỉ có nút «Tải thêm» và bộ lọc
- `/help`: chỉ đọc nhật ký thay đổi; nút «Hướng dẫn: …» chỉ là liên kết
- `/home`: chỉ chuyển hướng về Trang chủ «/» (public/home.html); nút của Trang chủ nằm ở hàng của trang «/»
- `/danh-muc-giay-to`: chỉ chuyển hướng về /loai-giay-to-nguoi (public/danh-muc-giay-to.html)
- `/404`: trang báo không có trang (web/khong-co-trang.ts), chỉ có lối về trang đầu, không ghi gì
- `/ngoai-mang`: trang báo mất mạng (web/ngoai-mang.ts), nút Thử lại chỉ tải lại trang
- `/cuoc`: danh sách cuốc của tài xế, không có nút; mỗi dòng là liên kết mở /cuoc-chuyen, nơi có các nút đã có hàng
- `/tai-xe`: trang đầu của tài xế, chỉ có liên kết «Xem cuốc của tôi» (web/tai-xe.ts:25)
- `/xe-dang-chay`: danh sách xe đang chạy, không có nút; mỗi dòng là liên kết mở /chuyen (web/xe-dang-chay.ts:42)
- `/thiet-lap`: trang mục lục các trang cài đặt, chỉ có liên kết (web/thiet-lap.ts:15)

## Nguồn đọc tay (máy không tự xác nhận được, người đã đọc)


## Độ phủ: 0 mục


## Tệp:dòng: 0 mục


## Khuôn: 0 mục


## Tên đề xuất trúng chữ đã loại: 0 mục


## Tên đề xuất trùng tên nút khác (đọc tay, không tính là lỗi): 7 mục

- «Bên kia đã nhận» (đề xuất cho «Bên kia đã nhận», web/home.ts:346) đang là tên nút ở web/order.ts:887: đọc xem có chỉ cùng việc không
- «Lưu số khách» (đề xuất cho «Sửa số khách», web/viec-cua-toi.ts:528) đang là tên nút ở web/sheet-so-khach.ts:55: đọc xem có chỉ cùng việc không
- «Lưu cấp riêng» (đề xuất cho «Chữ trong ô cột «Cấp độ đại lý» (ví dụ «Đại lý cấp 2 (theo vai trò)»), bấm để mở hộp», web/cot-cap-dai-ly.ts:63) đang là tên nút ở web/parties.ts:801: đọc xem có chỉ cùng việc không
- «Tạo chuyến» (đề xuất cho «+ Chuyến mới», public/dieu-phoi.html:15) đang là tên nút ở web/dieu-phoi.ts:763: đọc xem có chỉ cùng việc không
- «Đăng xuất máy này» (đề xuất cho «Đăng xuất», web/account.ts:40) đang là tên nút ở web/sessions.ts:172: đọc xem có chỉ cùng việc không
- «Ngừng dùng» (đề xuất cho «Đóng», web/parties.ts:296) đang là tên nút ở web/xe-sua.ts:180: đọc xem có chỉ cùng việc không
- «Chọn cấp riêng cho đối tác» (đề xuất cho «Áp dụng cấp riêng», web/parties.ts:859) đang là tên nút ở web/hoa-hong-doi-tac.ts:75: đọc xem có chỉ cùng việc không

Đã đọc tay cả bảy mục: «Bên kia đã nhận», «Lưu số khách», «Lưu cấp riêng», «Tạo chuyến», «Đăng xuất máy này», «Chọn cấp riêng cho đối tác» đều đang chỉ cùng một việc, nên trùng là đúng ý. «Ngừng dùng» đang là nút của xe, đề xuất cho liên hệ: cùng kiểu việc, khác đối tượng, chấp nhận được.
