# Trang ghép — ADR-0170 (đối tác xem và gửi vé của đơn mình lập)

> Trạng thái: **ĐÃ DUYỆT 2026-11-05** cùng ADR-0170, chủ dự án nguyên văn: *«Duyệt, đối tác tự mở»*. Bắt buộc theo `CLAUDE.md` §9 vì lượt duyệt có 3 quyết định, đúng trần.

## (1) Những bảng này chứa loại thực thể nào

| Bảng | Chứa | Điều phải canh |
|---|---|---|
| `vdt_*` (kho vé) | lô, vé, phân bổ, lần giao, đường dẫn khách. Không đổi | ảnh và mã vé có giá trị như tiền; đối tác chỉ đến được qua phân bổ của đơn mình |
| `bil_payment_receipt` | khoản do Kế toán, Bán hàng, Quản trị ghi **và** khoản đối tác tự ghi, cùng một bảng | Đ2 không phân biệt bằng người ghi (Kế toán sửa khoản làm đổi người ghi) mà bằng tình trạng tiền; đối tác ghi «Công ty thu» cũng mang vai `COMPANY` |
| `bil_debt_line`, `bil_receipt_recon` | dòng giữ hộ (tiền mặt), dấu `DECLARED`/`CONFIRMED` (chuyển khoản) | hai đường cùng nghĩa «chưa chắc tiền về công ty»; `khoanChoXacNhan` đọc cả hai, Đ2 dùng lại |
| `orders` | đơn của mọi người lập | `staff_id` là căn cứ của phạm vi `own`; đơn văn phòng lập hộ không thuộc đối tác |

## (2) Dòng bản đồ quyền chạm tới

| Ô | Việc | Đổi | Áp cho |
|---|---|---|---|
| `ve.cap.send` | cấp bù, xem ảnh, gửi, đường dẫn khách | cột `PARTNER`: `none` → `own` | đơn tài khoản đó lập |
| `ve.kho.manage` | nhập lô, kho, thống kê | không đổi | đối tác vẫn không |
| `order.view` | xem đơn; đang đủ để đọc danh sách vé | không đổi | cột `FIELD`, `INTERN` khác `none` nên `GET /api/ve/don/:orderId` cần câu chặn riêng (ADR-0170 Đ1 mục 4) |
| `order.cancel` | `handler-cancel` của người phụ trách | không đổi ô | Đ3 thêm luật ở route cho người giữ quyền Đối tác |
| `payment.receive` | ghi khoản thu | không đổi: đối tác vẫn tự ghi được | Đ2 đổi tác dụng của khoản đó với vé, không đổi quyền ghi |
| `order.modify` | sửa, huỷ đơn | không đổi ô | Đ3 thêm luật ở route, vì `can()` lấy hợp các ô và tài khoản lai vẫn phải bị áp |

## (3) Cổng nào canh cửa nào

| Cửa | Cổng máy chủ | Giao diện ẩn/hiện |
|---|---|---|
| Khối vé trên đơn | cổng `orders`, rồi `isOffice` hoặc `ve.cap.send`, rồi `order.view` | `#ve-don` chỉ dựng khi đơn đã xác nhận và có `order.view`; 403/404 thì ẩn lặng lẽ. Ẩn không thay cho cổng |
| Xem ảnh | `ve.cap.send`, rồi cổng mở vé (Đ2 hoặc `veMoDuoc` của ADR-0168), rồi nhật ký + dấu lộ, rồi mới đọc kho | nút «Mở N vé» chỉ hiện khi máy chủ trả mã phân bổ |
| Giao, đường dẫn | `ve.cap.send`, rồi cổng mở vé | như trên |
| Thu hồi đường dẫn | `ve.cap.send` | nút trên từng dòng đường dẫn |
| Cấp bù | `ve.cap.send`, đơn đã xác nhận | nút chỉ hiện khi thiếu; câu riêng cho đối tác |
| Kho vé, cài đặt vé | `ve.kho.manage`, `settings.ops` | đối tác không có mục menu; không đổi |
| Huỷ đơn | `order.modify` hoặc `order.cancel`, rồi luật Đ3 với người giữ quyền Đối tác; không đọc được thì chặn | ẩn nút theo cờ «đơn có vé đã mở» trong dữ liệu đơn (phần thêm vào hợp đồng `orders` – gốc lắp ráp); máy chủ vẫn là nơi chặn |

## Chỗ dễ nhầm

1. **Tài khoản lai** Đối tác + Bán hàng: cột `ve.cap.send` là hợp nên có `ownOrAssigned`; Đ2 và Đ3 vẫn áp nhờ `holdsPartner`. Đối tác + Kế toán: chủ quyết 23/10 không được tồn tại, máy chặn lúc tạo, còn mục `BL-SDL2-LAI-KT-DT` mở.
2. **`thuDu` không đổi nghĩa.** Số «đã thu» trên màn đơn, biên nhận, sổ vẫn cộng khoản đối tác tự ghi. Đối tác có thể thấy «đã thu đủ» ở khối tiền mà vé chưa mở; vì vậy khối vé phải nói rõ lý do.
3. **Tài xế đối tác** (`DRIVER_PARTNER`) không đổi, không qua cổng `orders`.
4. **Đường dẫn công khai** không đổi cách hoạt động; thêm người tạo là đối tác. `created_by` của đường dẫn và nhật ký vẫn ghi đúng người.
