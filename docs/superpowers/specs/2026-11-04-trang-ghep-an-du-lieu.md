# Trang ghép — ADR-0162, ADR-0164, ADR-0165 (bản Development; ẩn dữ liệu; ẩn đơn có tiền)

> Trạng thái: **NHÁP, CHỜ CHỦ DUYỆT**. Bắt buộc theo `CLAUDE.md` §9 vì lượt duyệt có 3 quyết định, đúng trần cho phép. ADR-0163 (xoá hẳn) đã tạm gác, không thuộc lượt này. Hồ sơ có ngày: khi đã duyệt thì không sửa lại cho khớp hiện trạng.

## (1) Những bảng này chứa loại thực thể nào

ADR-0164 thêm trạng thái «đã ẩn» cho một số bản ghi gốc. Điều cần ghép là: một bảng dùng chung có thể chứa nhiều loại, và ẩn loại này kéo theo loại khác.

| Bản ghi gốc được ẩn | Chứa ai, chứa gì | Điều phải canh |
|---|---|---|
| `orders` và phần gắn đơn | đơn khách, đơn đối tác, đơn tự do | đơn có khách trên chuyến chưa xong hoặc vé chưa đóng bị từ chối; đơn còn tiền theo ADR-0165 |
| `pty_party` (hồ sơ) | **một hồ sơ có thể vừa là khách, vừa là đối tác, vừa là nhân viên**, kể cả tài xế và công ty chủ | ẩn hồ sơ là ẩn mọi vai của người đó; còn đơn chưa ẩn hoặc còn số dư thì từ chối; công ty chủ không ẩn được |
| `staff` (tài khoản) | nhân viên nội bộ và tài khoản bên ngoài | ẩn kéo theo ngưng, đóng phiên, tắt thông báo; `staff.phone` là duy nhất nên số vẫn bị giữ |
| Cấu hình `prc_*`, `pty_role_type`, `catalog_*` | loại đối tác, cấp, mức hoa hồng, dịch vụ | đơn cũ đọc bản chụp nên không đổi; `R-PRC-2` đã từng báo loại tắt còn mức đang áp, nên điều kiện «không còn gì đang áp» là bắt buộc |

ADR-0165 không thêm thực thể và không ghi dòng nào vào `bil_*`. ADR-0162 không thêm thực thể.

## (2) Dòng bản đồ quyền chạm vào

Thứ tự 10 cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR.

| Ô | Giá trị | Ghép |
|---|---|---|
| **`data.hide` (MỚI, đề xuất)** | `chiToanQuyen()`: chỉ SUPER_ADMIN là `any` | ẩn, hiện lại, xem trang «Dữ liệu đã ẩn» |
| `order.view`, `contact.view`, `party.*`, `admin.manage` | không đổi giá trị | **đổi nghĩa ngầm:** các ô này từ nay không cho xem bản ghi đã ẩn, kể cả với `any` |
| `ledger.write`, `ledger.adjust.approve` | không đổi | Kế toán vẫn xử lý dòng sổ của đơn đã ẩn, nhưng không mở được đơn và không tự ẩn được đơn |
| `admin.manage.superadmin` | `chiToanQuyen()` | cổng gián tiếp: ai được gán Toàn quyền thì có quyền ẩn |

**Chưa kiểm:** hôm nay có bao nhiêu tài khoản giữ Toàn quyền trên bản chính thức.

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | Ghi chú |
|---|---|---|
| Nút «Ẩn», mục «Dữ liệu đã ẩn» trên màn hình | chỉ hiện với Toàn quyền | chỉ để gọn, **không phải cổng** |
| Route ẩn, hiện lại | `can(data.hide)` + `Origin` + lý do bắt buộc + chống ghi trùng (ADR-0094) | một lô cùng nhật ký |
| Ghi vào bản ghi đã ẩn | trigger ở cơ sở dữ liệu, miễn các lệnh sổ tiền đã có dòng | lớp giữ thật, kể cả khi mã có lỗi |
| Đọc bản ghi đã ẩn | view của module chủ + bộ quét mới theo từng vai | |
| Đăng nhập tài khoản đã ẩn | máy chủ từ chối, đóng phiên đang mở | |
| Đường dẫn công khai (biên nhận, vé, QR) | máy chủ trả «không còn hiệu lực» | gửi rồi không thu hồi được, chỉ làm chết đường dẫn |
| Sổ công nợ | **không lọc**, chỉ đổi nhãn thành «Đơn đã ẩn» | số dư không đổi |

**View công bố đọc xuyên module phải mang được trạng thái đã ẩn hoặc nhãn thay thế**, vì đây là chỗ dễ sót nhất: `v_ord_order_label`, `v_pty_party_label`, `v_pty_party_partner_label`, `v_stf_staff_label`. Các view sổ `v_bil_party_balance`, `v_bil_order_paid` và các view trạng thái, chủ đơn `v_ord_order_state`, `v_ord_order_owner`, `v_ord_cancel_state` **giữ nguyên**, không lọc, vì lệnh sổ tiền và kiểm dữ liệu đọc qua đó.

**Dữ liệu máy chủ trả cho Đối tác và Tài xế đối tác** về dòng sổ của đơn đã ẩn phải bỏ cả mã đơn lẫn mã nội bộ của đơn, không chỉ che trên màn hình.

**Chỗ giao diện đổi nghĩa vì có dữ liệu đã ẩn** (không chỉ route máy chủ):

- Các ô chọn hồ sơ, loại đối tác, cấp, dịch vụ không còn thấy thứ đã ẩn. Danh sách «đã tắt» hiện có sẽ ngắn đi, người dùng có thể hỏi sao mất.
- Số đếm trên Trang chủ, Việc của bạn, «Doanh thu của tôi» và «Còn thiếu tiền» phải khớp danh sách sau khi lọc; đếm và lọc lệch nhau là lỗi dễ gặp nhất. Riêng «Còn thiếu tiền» có thể nhỏ hơn số sổ đang đòi, có chủ ý (ADR-0165 Đ2).
- Sổ cọc vẫn hiện đơn huỷ đã ẩn còn giữ cọc, ghi «Đơn đã ẩn», để nghĩa vụ hoàn tiền không biến mất.
- Tra trùng số điện thoại không còn báo hồ sơ đã ẩn, nên dễ sinh hồ sơ trùng.
- Sổ công nợ có dòng «Đơn đã ẩn»: bấm vào phải hiện câu giải thích, không phải trang lỗi.
- Chuyến đã kết thúc hiện «Đơn đã ẩn» thay cho tên khách, số khách giữ nguyên.
- Hai chữ «Ẩn» khác nghĩa: nút có sẵn của Quản trị (ngừng bán dịch vụ) và nút mới của Toàn quyền. Phải chốt nhãn trước khi thi công.

## Ghép ba quyết định

- ADR-0162 đứng một mình. Hai quyết định còn lại nên thử trên Development trước khi lên bản chính thức, nên làm 0162 trước sẽ an toàn hơn, nhưng không bắt buộc về mặt luật.
- ADR-0165 cần ADR-0164: nó chỉ bỏ điều kiện tiền về 0 và thêm nhãn ở Sổ công nợ.
- ADR-0164 duyệt và chạy được mà không cần ADR-0165: khi đó đơn còn tiền chỉ bị từ chối.
- Duyệt ADR-0165 cần chủ chọn «Cho phép, có ghi lý do» cho TNV-G1, TNV-G3, TNV-G4, HC-4.2 (`CLAUDE.md` §3).

## Câu duyệt

1. ADR-0162: bản Development, một lệnh lên bản chính thức, AI được tự đưa mã lên bản Development.
2. ADR-0164: ẩn đơn sạch tiền, hồ sơ, tài khoản, cấu hình.
3. ADR-0165: ẩn được cả đơn có tiền, Sổ công nợ giữ nguyên, kèm «Cho phép, có ghi lý do» cho bốn mã trên.
