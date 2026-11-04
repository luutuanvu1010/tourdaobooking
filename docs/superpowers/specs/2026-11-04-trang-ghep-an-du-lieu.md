# Trang ghép — ADR-0162, ADR-0164, ADR-0165 (bản Development; ẩn dữ liệu; ẩn đơn có tiền)

> Trạng thái: **NHÁP, CHỜ CHỦ DUYỆT**. Bắt buộc theo `CLAUDE.md` §9 vì lượt duyệt có 3 quyết định, đúng trần cho phép. ADR-0163 (xoá hẳn) đã tạm gác, không thuộc lượt này. Hồ sơ có ngày: khi đã duyệt thì không sửa lại cho khớp hiện trạng.

## (1) Những bảng này chứa loại thực thể nào

ADR-0164 thêm trạng thái «đã ẩn» cho một số bản ghi gốc. Điều cần ghép là: một bảng dùng chung có thể chứa nhiều loại, và ẩn loại này kéo theo loại khác.

| Bản ghi gốc được ẩn | Chứa ai, chứa gì | Điều phải canh |
|---|---|---|
| `orders` và phần gắn đơn | đơn khách, đơn đối tác, đơn tự do | đơn còn tiền thì đi đường ADR-0165; đơn có khách trên chuyến chưa xong hoặc vé chưa đóng bị từ chối |
| `pty_party` (hồ sơ) | **một hồ sơ có thể vừa là khách, vừa là đối tác, vừa là nhân viên**, kể cả tài xế và công ty chủ | ẩn hồ sơ là ẩn mọi vai của người đó; còn đơn chưa ẩn thì từ chối; công ty chủ không ẩn được |
| `staff` (tài khoản) | nhân viên nội bộ và tài khoản bên ngoài | ẩn kéo theo ngưng, đóng phiên, tắt thông báo; `staff.phone` là duy nhất nên số vẫn bị giữ |
| Cấu hình `prc_*`, `pty_role_type`, `catalog_*` | loại đối tác, cấp, mức hoa hồng, dịch vụ | đơn cũ đọc bản chụp nên không đổi; `R-PRC-2` đã từng báo loại tắt còn mức đang áp, nên điều kiện «không còn gì đang áp» là bắt buộc |

ADR-0165 không thêm thực thể; nó ghi thêm dòng đảo vào `bil_payment_receipt`, `bil_debt_line`, `bil_posting` qua lệnh có sẵn. ADR-0162 không thêm thực thể.

## (2) Dòng bản đồ quyền chạm vào

Thứ tự 10 cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR.

| Ô | Giá trị | Ghép |
|---|---|---|
| **`data.hide` (MỚI, đề xuất)** | `chiToanQuyen()`: chỉ SUPER_ADMIN là `any` | ẩn, hiện lại, xem trang «Dữ liệu đã ẩn» |
| `order.view`, `contact.view`, `party.*`, `admin.manage` | không đổi giá trị | **đổi nghĩa ngầm:** các ô này từ nay không cho xem bản ghi đã ẩn, kể cả với `any` |
| `ledger.write` | không đổi | lệnh ẩn gọi phần ghi đảo bên trong với quyền `data.hide`; Kế toán không tự ẩn được đơn |
| `admin.manage.superadmin` | `chiToanQuyen()` | cổng gián tiếp: ai được gán Toàn quyền thì có quyền ẩn |
| Dòng xem sổ của Kế toán | không đổi | Kế toán thấy dòng đảo với «Đơn đã ẩn», không mở được đơn (ADR-0165 Đ6) |

**Chưa kiểm:** hôm nay có bao nhiêu tài khoản giữ Toàn quyền trên bản chính thức.

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | Ghi chú |
|---|---|---|
| Nút «Ẩn», mục «Dữ liệu đã ẩn» trên màn hình | chỉ hiện với Toàn quyền | chỉ để gọn, **không phải cổng** |
| Route ẩn, hiện lại | `can(data.hide)` + `Origin` + lý do bắt buộc + chống ghi trùng (ADR-0094) | một lô cùng nhật ký |
| Ghi vào bản ghi đã ẩn | trigger ở cơ sở dữ liệu | lớp giữ thật, kể cả khi mã có lỗi |
| Đọc bản ghi đã ẩn | view của module chủ + bài quét mọi route đọc theo từng vai | |
| Đăng nhập tài khoản đã ẩn | máy chủ từ chối, đóng phiên đang mở | |
| Đường dẫn công khai (biên nhận, vé, QR) | máy chủ trả «không còn hiệu lực» | gửi rồi không thu hồi được, chỉ làm chết đường dẫn |
| Dòng đảo do ẩn đơn | lô của ADR-0165, chỉ có lệnh ẩn mới được đảo đơn đã giao | route đảo cũ vẫn chặn sau Đã giao |
| Tháng đã khoá | luật khoá kỳ có sẵn, dòng đảo ghi ngày hôm nay | tháng đã khoá không đổi số |

**Chỗ giao diện đổi nghĩa vì có dữ liệu đã ẩn** (không chỉ route máy chủ):

- Các ô chọn hồ sơ, loại đối tác, cấp, dịch vụ không còn thấy thứ đã ẩn. Danh sách «đã tắt» hiện có sẽ ngắn đi, người dùng có thể hỏi sao mất.
- Số đếm trên Trang chủ và Việc của bạn phải khớp danh sách sau khi lọc; đếm và lọc lệch nhau là lỗi dễ gặp nhất.
- Tra trùng số điện thoại không còn báo hồ sơ đã ẩn, nên dễ sinh hồ sơ trùng.
- Trang sổ của Kế toán có dòng đảo trỏ tới «Đơn đã ẩn»: bấm vào phải hiện câu giải thích, không phải trang lỗi.
- Chuyến đã kết thúc hiện «Đơn đã ẩn» thay cho tên khách, số khách giữ nguyên.

## Ghép ba quyết định

- ADR-0162 đứng một mình. Hai quyết định còn lại nên thử trên Development trước khi lên bản chính thức, nên làm 0162 trước sẽ an toàn hơn, nhưng không bắt buộc về mặt luật.
- ADR-0165 cần ADR-0164: nó chỉ thêm đường cho đơn có tiền, phần ẩn dùng chung.
- ADR-0164 duyệt và chạy được mà không cần ADR-0165: khi đó đơn có tiền chỉ bị từ chối.
- ADR-0165 **chưa duyệt được** tới khi chủ quyết cho từng lỗ đang hở (`CLAUDE.md` §3).

## Câu duyệt

1. ADR-0162: bản Development, một lệnh lên bản chính thức, AI được tự đưa mã lên bản Development.
2. ADR-0164: ẩn đơn sạch tiền, hồ sơ, tài khoản, cấu hình.
3. ADR-0165: ẩn đơn có tiền bằng dòng đảo, kèm chọn «Cho phép, có ghi lý do» cho TNV-G1, TNV-G3, TNV-G4, HC-4.2, hoặc để sau.
