# Trang ghép — ADR-0114 (sửa số khách)

> Bắt buộc theo `CLAUDE.md` §9 vì lượt duyệt có ≥ 2 quyết định. Văn bản trình duyệt: `01-de-xuat-adr-0114.md`. Mã đo @ `origin/main` 80506915 (bản 1.90). Chưa kiểm số dòng; kế hoạch dùng tên hàm, không số dòng.

## 1. Bảng nào, loại thực thể nào
Không bảng mới, không cột mới, không migration. Đọc `order_money_adjustment` (chỉ-thêm, mỗi dòng có `before_json`, `after_json`, `subtotal_*`), số khách đã chụp của `order_service` (khoá sau xác nhận), `audit_log` (ai, lúc nào, lý do). Chỉ có **đơn** (`orders`, đã xác nhận) và **dòng điều chỉnh số khách**. Không chạm hồ sơ khách, đối tác, tài xế, sổ tiền.

## 2. Dòng bản đồ quyền chạm bảng này
Không thêm, không đổi ô nào của `src/shared/permissions.ts`. Sửa số khách vẫn qua ô `order.money.edit` (văn phòng: Bán hàng đơn của mình, Kế toán, Quản trị, Toàn quyền) và route hẹp của hướng dẫn viên. Dòng lịch sử mới (D2) nằm trong khối "Lịch sử" đã canh bằng `order.history.view`: SALES vẫn không thấy lịch sử đơn người khác.

## 3. Cổng nào canh cửa nào
| Việc | Cổng máy chủ | Chỗ giao diện ẩn/hiện bị đổi nghĩa |
|---|---|---|
| D1 cảnh báo giảm giá | không cổng mới (chỉ thêm khoá vào phản hồi) | khối Thanh toán và banner sau lệnh sửa số khách: thêm câu đỏ; câu vàng cũ giữ nguyên |
| D2 dòng lịch sử | thêm vào chi tiết đơn, chỉ trả khi người xem có `order.history.view` (null nếu không) | khối "Lịch sử": thêm dòng lúc khởi tạo; ai thấy khối không đổi |
| D3 người lớn | `validateOrder` (lập, lưu nháp), chuyển trạng thái xác nhận, `planMoneyEdit` (một luật cho hai đường) | form lập đơn: báo sớm khi số người lớn về 0 (chỉ báo sớm; máy chủ mới quyết); bảng "Sửa số khách" |

Bất biến mới (chỉ cảnh báo): đơn đã xác nhận có tổng người lớn (kèm người cao tuổi) bằng 0. Sổ hàng rào `docs/SO-HANG-RAO.md` phải có dòng và ngày quan sát chặn thật trước khi coi là hàng rào.
