# Trang ghép: lượt duyệt 2 của đặt vé đối tác (ADR-0154, ADR-0155)

Theo `CLAUDE.md` §9. Hồ sơ có ngày 2026-11-02, viết lại cùng ngày theo người kiểm độc lập (`2026-11-02-ket-qua-kiem-adr-0154-0155.md`). Đọc cùng đặc tả `2026-11-01-dat-ve-doi-tac-design.md` §6; trang này ghi riêng cho lượt 2 và thêm phần ghép với kho vé điện tử, vì kho đó nhập vào `main` sau khi đặc tả viết xong. Đặt cọc (QĐ-A) là lượt 3, không thuộc lượt này; người soạn đọc lại trang này khi trình.

**Đếm:** 5 điều chạm quyền hoặc dữ liệu (ADR-0154 Đ1, Đ2, Đ3; ADR-0155 Đ1, Đ2), đếm theo điều như trang ghép 24/10 và 25/10; trần là 3. Chủ 2026-11-02 chọn cho vượt, nguyên văn: «Cho vượt mức, trình cả hai». **Sáu câu chờ chủ:** C1, C2 ở ADR-0154; C3 tới C6 ở ADR-0155.

## 1. Bảng dùng chung nhận loại dữ liệu mới

| Bảng | Trước đây chứa | Thêm |
|---|---|---|
| `pty_party_role` | Vai của hồ sơ; vai nhóm nội bộ và bên ngoài chỉ gắn qua tài khoản | Năm vai bên ngoài trên **hồ sơ chưa có tài khoản**, gồm cả tổ chức (ADR-0155 Đ1) |
| Bản chụp hoa hồng, dòng sổ đại lý | Bên hưởng có tài khoản, hoặc tổ chức mang loại tự thêm | Năm vai trên **hồ sơ không đăng nhập** (ADR-0155 Đ1; xây trên lỗ `TNV-G3`, `TNV-G4`, câu C5) |
| `orders` | Đơn mà tên, SĐT khách là của khách | Đơn lập lúc công tắc BẬT: tên, SĐT **là của đối tác**, kèm dấu `manifest_exempt` (ADR-0154 Đ2, Đ3) |
| `ord_confirm_request` | Yêu cầu xác nhận | Cờ «cần chốt giờ», chụp lúc gửi (ADR-0154 Đ1.2) |
| Bảng chính sách mới theo khuôn `ord_confirm_policy` | | Công tắc ẩn thông tin khách, chỉ thêm (ADR-0154 Đ2) |

## 2. Dòng bản đồ quyền chạm các bảng này

Không thêm ô, giá trị ô không đổi. **Việc mỗi ô mở ra thì đổi** ở các dòng dưới.

| Ô | Áp cho | Ghi chú |
|---|---|---|
| `admin.manage` | Gắn và gỡ vai ở Danh bạ, nay gồm năm vai trên hồ sơ chưa có tài khoản | Quản trị, Toàn quyền. Vai không sinh quyền vì không có tài khoản. Nới hàng rào `role_via_account`, câu C6 |
| `settings.ops` | Đổi công tắc | Chỉ Toàn quyền. Quản trị qua cổng nhưng 403 |
| `order.create` | Đọc công tắc khi lập đơn | Máy chủ dùng trường này, form ẩn theo cùng trường |
| `order.confirm.review` | Nay bắt buộc ghi giờ với yêu cầu mang cờ; thêm đọc route khung giờ | Bán hàng, Kế toán, Quản trị, HDV nội bộ, Toàn quyền. Sửa một phần ADR-0134 Đ6. Nếu chủ chọn khuyến nghị C1: thấy thêm SĐT của đối tác lập đơn |
| `order.leg.short_notice` | Còn vé nhận đặt gấp theo từng chặng | Bán hàng, Quản trị, Toàn quyền. Mở rộng ADR-0107. Kế toán, HDV nội bộ vẫn 409 |
| `contact.view` | SĐT đối tác tới HDV được giao và tài xế khi công tắc BẬT | Luật giữ (ADR-0053, ADR-0049 D3), số đổi chủ |
| `order.passenger.write` | Đối tác bổ sung danh sách sau xác nhận khi đơn trống tên | Không đổi |
| `partner.commission.view`, `partner.commission.write` | Đọc và sửa cột cấp | Hành chính nhân sự không có `view`. Tài khoản giữ quyền Đối tác bị chặn thêm bằng `holdsPartner`, ở cả giao diện |

## 3. Cổng nào canh cửa nào, kể cả chỗ giao diện ẩn hiện đổi nghĩa

- **Giờ đón:** Gửi đơn (nhánh A) và Còn vé ở máy chủ. Đơn nháp của đối tác không có đường xác nhận nào khác, trừ tài khoản đã thôi quyền Đối tác khi đơn còn nháp (chấp nhận, có kiểm định kỳ cảnh báo).
- **Công tắc:** `POST` lập đơn và `PUT` nháp ở máy chủ. Đổi công tắc không đổi đơn cũ.
- **Miễn thiếu tên:** chỉ lời gọi trong `kiemXuatBen`. Lúc xếp vốn chỉ cảnh báo. `THIEU_TEN` không có trigger.
- **Cột cấp:** giao diện theo `can()` và `!holdsPartner`, máy chủ kiểm lại ở route đọc mới và ba route ghi.
- **Gắn vai:** route Danh bạ. `R-PRC-6` và `nhanDoiTac` của gộp canh nhân viên cũ.
- **Ẩn hiện đổi nghĩa:**
  - Danh sách «Đặt qua đối tác» có thêm hồ sơ không tài khoản, đúng ý. Luật bán (ADR-0146) chặn cả đơn văn phòng lập cho các hồ sơ này.
  - Trang Danh bạ hiện năm vai trong ô gắn vai khi hồ sơ chưa có tài khoản; ô «Nơi làm» phải ẩn với các vai này.
  - Nút Gọi khách ở Việc của tôi và số liên hệ trên chuyến gọi tới đối tác khi đơn lập lúc BẬT.
  - «Đủ tên khách» ở chi tiết chuyến thành «Miễn danh sách» với đơn có dấu.
  - Hành chính nhân sự thấy thêm id, tên, vai của hồ sơ loại này khi tra số, câu C4.
  - Câu gộp `merge_source_account_role` phải trỏ đúng màn (ADR-0068).
  - Bộ lọc vai ở Quản lý tài khoản không thay đổi, vẫn chỉ thấy tài khoản.

## 4. Ghép giữa hai ADR và với phần khác

| Câu hỏi | Trả lời |
|---|---|
| ADR-0154 và ADR-0155 có chạm nhau không? | Có một chỗ: đơn đặt qua hồ sơ chưa có tài khoản do văn phòng lập, không phải tài khoản giữ quyền Đối tác, nên luật giờ đón, công tắc và dấu miễn không áp. Hai quyết định độc lập |
| ADR-0154 có đổi tiền không? | Không đổi cách tính. Dời mốc chụp hoa hồng và mốc thu của đơn có đón tới lúc Còn vé |
| Kho vé điện tử (ADR-0153) có đọc tên hay SĐT khách không? | Không, theo tìm trong mã ngoài bài kiểm của `src/modules/ve-dien-tu` (kiểm 2026-11-02). Vé chọn theo loại, nhóm khách, ngày nên đơn thiếu tên vẫn giữ được vé |
| Còn vé mới 409 khi thiếu giờ có đụng cấp vé không? | Không. Từ chối xảy ra trước lô xác nhận, nên `capVeSauXacNhan` không chạy |
| Đường dẫn vé cho khách khi SĐT là của đối tác? | Văn phòng gửi tay sau khi thu đủ, vì đối tác không có ô `ve.cap.send` và không có đường gửi tự động. SĐT trên đơn là của đối tác nên vé đi qua đối tác rồi mới tới khách |
| Tìm đơn theo SĐT khi công tắc BẬT? | Tìm số đối tác ra mọi đơn của người đó, không tìm được theo số khách thật. Hệ quả đã biết, chưa có cách khác |
| Đỏ `H5` hiện có đụng lượt 2 không? | Không do lượt 2, nhưng Gửi đơn và Còn vé nằm trong bốn route đang đỏ. Việc riêng phải xong trước lần phát hành kế tiếp |
| Lượt 3 (đặt cọc) có bị ảnh hưởng không? | Có hai chỗ: lần thu sẽ chủ yếu sinh tại Còn vé (ADR-0154 Đ1); tiền hồ sơ không tài khoản đi đường `ben_dat`, nên câu «kết quả giống nhau dù ai bấm» chỉ đúng với đối tác có tài khoản (ADR-0155) |

## Chưa kiểm

Người kiểm đã thử các lỗi nặng trên bản chép, chạy SQLite qua khung thử; chưa chạy D1 thật, `npm test`, e2e, kịch bản Chrome cho các chữ mới. Bản viết lại chưa kiểm vòng hai. Chưa kiểm production: có tài khoản lai không, `require_manifest`, số nháp đang mở, đủ bảy cấp chưa, hồ sơ vai cũ `STAFF`, loại tự thêm trùng tên. Pháp lý xe hợp đồng chưa có luật sư xác nhận. Các dòng trên thành bài kiểm khi thi công (đặc tả §8, tiêu chí nghiệm thu ở từng ADR).
