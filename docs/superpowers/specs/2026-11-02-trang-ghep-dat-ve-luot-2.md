# Trang ghép: lượt duyệt 2 của đặt vé đối tác (ADR-0154, ADR-0155)

Theo `CLAUDE.md` §9. Hồ sơ có ngày 2026-11-02. Đọc cùng đặc tả `2026-11-01-dat-ve-doi-tac-design.md` §6; trang này ghi riêng cho lượt 2 và thêm phần ghép với kho vé điện tử, vì kho đó nhập vào `main` sau khi đặc tả viết xong. Đặt cọc (QĐ-A) là lượt 3, không thuộc lượt này; người soạn đọc lại trang này khi trình.

**Sửa 2026-11-02 theo người kiểm độc lập** (`2026-11-02-ket-qua-kiem-adr-0154-0155.md`). Lượt này có **5 điều** chạm quyền hoặc dữ liệu (đếm theo điều như trang ghép 24/10, 25/10), trần là 3, nên chưa đủ điều kiện duyệt một lần; chủ quyết cách chia. Trang này viết lại theo lượt chủ chọn.

## 1. Bảng dùng chung nhận loại dữ liệu mới

| Bảng | Trước đây chứa | Thêm |
|---|---|---|
| `pty_party_role` | Vai của hồ sơ; vai nhóm nội bộ và bên ngoài chỉ gắn qua tài khoản | Vai nhóm bên ngoài trên **hồ sơ chưa có tài khoản**, gồm cả tổ chức (ADR-0155 Đ1) |
| `orders` | Đơn mà tên, SĐT khách là của khách | Đơn lập lúc công tắc BẬT: tên, SĐT **là của đối tác**, kèm dấu `manifest_exempt` (ADR-0154 Đ2, Đ3) |
| Bảng chính sách mới theo khuôn `ord_confirm_policy` | | Công tắc ẩn thông tin khách, chỉ thêm (ADR-0154 Đ2) |
| Bản chụp hoa hồng, dòng sổ đại lý | Bên hưởng có tài khoản, hoặc tổ chức mang loại tự thêm | Thêm năm vai trên **hồ sơ không đăng nhập** (ADR-0155 Đ1; xây trên lỗ `TNV-G3`, `TNV-G4`) |

## 2. Dòng bản đồ quyền chạm các bảng này

Không thêm ô. Giá trị ô không đổi, nhưng **việc mỗi ô mở ra thì đổi** ở các dòng dưới.

| Ô | Áp cho | Ghi chú |
|---|---|---|
| `admin.manage` | Gắn và gỡ vai ở Danh bạ, nay gồm vai bên ngoài trên hồ sơ chưa có tài khoản | Quản trị, Toàn quyền. Vai không sinh quyền vì không có tài khoản |
| `settings.ops` | Đổi công tắc | Chỉ Toàn quyền. Quản trị qua cổng nhưng 403 |
| `order.create` | Đọc công tắc khi lập đơn | Máy chủ dùng trường này, form ẩn theo cùng trường |
| `partner.commission.view`, `partner.commission.write` | Đọc và sửa cột cấp | Hành chính nhân sự không có `view`. Tài khoản giữ quyền Đối tác bị chặn thêm bằng `holdsPartner` |
| `order.confirm.review` | Nay ghi giờ đón của đơn đối tác; bản sửa còn mở route khung giờ cho ô này | Sửa một phần ADR-0134 Đ6 |
| `order.leg.short_notice` | Bản sửa cho Còn vé nhận Đặt gấp theo từng chặng | Mở rộng ADR-0107 |
| `contact.view` | SĐT đối tác tới HDV, tài xế ngoài khi công tắc BẬT | ADR-0053 |
| `order.passenger.write` | Đối tác bổ sung danh sách sau xác nhận khi đơn trống tên | Không đổi ô |

## 3. Cổng nào canh cửa nào, kể cả chỗ giao diện ẩn hiện đổi nghĩa

- **Giờ đón:** Gửi đơn (nhánh A) và Còn vé ở máy chủ. Đơn nháp của đối tác không có đường xác nhận nào khác.
- **Công tắc:** lập đơn ở máy chủ. Đổi công tắc không đổi đơn cũ.
- **Miễn thiếu tên:** chỉ `lyDoThieuTen` và `kiemXuatBen`. `THIEU_TEN` không có trigger.
- **Cột cấp:** giao diện theo `can()`, máy chủ kiểm lại ở route đọc mới và ba route ghi.
- **Ẩn hiện đổi nghĩa:** danh sách «Đặt qua đối tác» có thêm hồ sơ không tài khoản, đúng ý. Trang Danh bạ hiện vai bên ngoài trong ô gắn vai khi hồ sơ chưa có tài khoản. Bộ lọc vai ở Quản lý tài khoản không thay đổi, vẫn chỉ thấy tài khoản.
- **Còn thiếu, người kiểm nêu:** `PUT` đơn nháp cũng phải qua luật công tắc. Nút Gọi khách đổi nghĩa khi SĐT là của đối tác. Cột cấp ở giao diện phải thêm `!holdsPartner`, nếu không tài khoản lai thấy cột rồi 403. Hành chính nhân sự thấy thêm id, tên, vai của hồ sơ loại này (ADR-0071 đ3b, chờ chủ quyết). Luật bán chặn cả đơn văn phòng lập cho các hồ sơ này (ADR-0146). Câu gộp `merge_source_account_role` trỏ sai màn với hồ sơ không tài khoản (ADR-0068).

## 4. Ghép giữa hai ADR và với phần khác

| Câu hỏi | Trả lời |
|---|---|
| ADR-0154 và ADR-0155 có chạm nhau không? | Có một chỗ: đơn đặt qua hồ sơ chưa có tài khoản do văn phòng lập, không phải tài khoản giữ quyền Đối tác, nên luật giờ đón, công tắc và dấu miễn không áp. Hai quyết định độc lập |
| Kho vé điện tử (ADR-0153) có đọc tên hay SĐT khách không? | Không, theo tìm trong mã ngoài bài kiểm của `src/modules/ve-dien-tu` (kiểm 2026-11-02). Vé chọn theo loại, nhóm khách, ngày nên đơn thiếu tên vẫn giữ được vé |
| Còn vé mới 409 khi thiếu giờ có đụng cấp vé không? | Không. Từ chối xảy ra trước lô xác nhận, nên `capVeSauXacNhan` không chạy |
| Đường dẫn vé cho khách khi SĐT là của đối tác? | Văn phòng gửi tay sau khi thu đủ, vì đối tác không có ô `ve.cap.send` và không có đường gửi tự động. SĐT trên đơn là của đối tác nên vé đi qua đối tác rồi mới tới khách |
| Tìm đơn theo SĐT khi công tắc BẬT? | Tìm số đối tác ra mọi đơn của người đó, không tìm được theo số khách thật. Hệ quả đã biết, chưa có cách khác |
| Đỏ `H5` hiện có đụng lượt 2 không? | Không do lượt 2, nhưng Gửi đơn và Còn vé nằm trong bốn route đang đỏ. Việc riêng phải xong trước lần phát hành kế tiếp |

## Chưa kiểm

Đọc mã theo đặc tả, chưa thử chạy. Các dòng trên sẽ thành bài kiểm khi thi công (đặc tả §8).
