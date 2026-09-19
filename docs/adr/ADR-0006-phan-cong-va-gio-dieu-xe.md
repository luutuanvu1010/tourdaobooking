# ADR-0006 — Phân công (người phụ trách, nhiệm vụ) và tách giờ hẹn khách khỏi giờ điều xe

- **Trạng thái:** proposed (bản 3, sau rà soát độc lập lần 2)
- **Ngày:** 2026-09-20   **Người phê chuẩn:** chủ dự án (chờ duyệt)
- **Loại quyết định:** **cửa một chiều** — quyết định "hạt" (grain) và chiều khoá ngoại của bảng phân công; đổi sau khi có dữ liệu phải dựng lại
- **Liên quan:** ADR-0001 (vai trò không chặn việc chọn người), ADR-0002 (`dispatch` → `orders`, `parties`, `locations`), ADR-0003 (hiệu lực, cột kiểm toán, bảng tra cứu mã), ADR-0007 (quyền)

## Bối cảnh
Chủ dự án (2026-09-20) chốt: booking do một nhân viên đăng; **người phụ trách** (nhận xử lý: gọi điện xác nhận, đón khách) là **một người, có thể khác người lập, đổi được**; việc **đón khách, tài xế, lái cano** gắn ở **từng dịch vụ**, mỗi việc có nhãn, người, nơi, giờ riêng; **giờ hẹn với khách khác giờ tài xế đón**; theo dõi ba bước (đã gọi xác nhận với khách; đã đón khách theo từng nhiệm vụ; dịch vụ hoàn thành/đã khởi hành). Rà soát độc lập chỉ ra: hạt của bảng phân công chưa được phát biểu; `order_service` chỉ có **một** `pickup_time`; và `updateDraftOrder` hiện **xoá toàn bộ dịch vụ rồi chèn lại** mỗi lần lưu nháp (`orders/repository.ts`: `DELETE FROM order_service WHERE order_id = ?` rồi `serviceInserts`) — thí nghiệm SQLite xác nhận một khoá ngoại `NO ACTION` tới `order_service` **làm câu `DELETE` đó thất bại**.

## Quyết định
1. **Một bảng phân công `dsp_assignment`**, mỗi dòng thuộc **đúng một** phạm vi: hoặc `order_id` (cả booking) hoặc `order_service_id` (một dịch vụ): `CHECK ((order_id IS NULL) <> (order_service_id IS NULL))`. Khoá ngoại tới khoá chính `orders` / `order_service`, `NO ACTION`.
   - **Tiền đề bắt buộc cho hạt dịch vụ:** `order_service.id` phải là **định danh bền**. N2 phải đổi `updateDraftOrder` từ "xoá hết rồi chèn lại" sang **so khớp theo `id` do client gửi lại** (`UPDATE` dịch vụ còn, `INSERT` dịch vụ mới, `DELETE` dịch vụ bị bỏ), và e2e phải chứng minh id dịch vụ **không đổi** qua hai lần lưu nháp. Chừng nào chưa làm xong, `dsp_assignment` **chỉ được** dùng hạt `order_id`.
   - **Xoá dịch vụ đang có nhiệm vụ mở** phải bị chặn ở tầng ứng dụng bằng thông báo rõ (409), không để khoá ngoại nổ thành lỗi 500; hoặc đóng các nhiệm vụ mở trước trong cùng `db.batch()`. (Loại trừ `DEFERRABLE INITIALLY DEFERRED`: chỉ cứu được trường hợp xoá–chèn lại cùng id, và mọi lỗi khác hiện ra mờ ở `COMMIT`.)
2. **Cột:** `task_kind_code` (FK `dsp_task_kind`, mã `TEXT`: `HANDLE` phụ trách, `PICKUP` đón, `DROPOFF` tiễn, `BOAT` lái cano, …; thêm loại = thêm dòng); `party_id` (FK `pty_party`); `role_type_code` (FK `pty_role_type` — nhãn vai lúc gán, **không gating**, ADR-0001 mục 4); `location_id` (FK `loc_location`, NULL nếu là điểm tự do); `place_text` (điểm tự do, vd khách sạn); `scheduled_date`, `scheduled_time` (giờ Việt Nam; NULL = chưa chốt); `status_code` (FK `dsp_assignment_status`: **chỉ `PENDING`, `DONE`**) và `done_at` (UTC); hiệu lực `valid_from_at`, `valid_to_at` (UTC, ADR-0003 điều 7); cột kiểm toán. **Huỷ một nhiệm vụ = đóng dòng** (`valid_to_at`), không có trạng thái `CANCELLED` (hai cách nói cùng một điều sẽ lệch nhau).
3. **Người phụ trách** = dòng phạm vi `order_id` với `task_kind_code = 'HANDLE'`. Chỉ mục duy nhất có điều kiện: **tối đa một dòng đang mở** cho mỗi `order_id` với `HANDLE` (`WHERE task_kind_code = 'HANDLE' AND valid_to_at IS NULL`; viết được vì bảng tra cứu dùng mã làm khoá — ADR-0003 điều 1). **Đổi người = đóng dòng cũ và mở dòng mới trong một `db.batch()`** (kèm dòng nhật ký): lịch sử giữ nguyên, không ghi đè.
4. **Nhiệm vụ** = dòng phạm vi `order_service_id`; một dịch vụ có nhiều nhiệm vụ đang mở (vd tài xế đón ở khách sạn, HDV đón ở cảng, lái cano).
5. **Hai giờ, hai nơi, hai sự thật, hai chỗ lưu:** *giờ và nơi hẹn với khách* = `order_service.pickup_time` / `pickup_place` (A1: điều đã báo khách); *giờ và nơi điều xe/đón thực tế* = `dsp_assignment.scheduled_time` / `location_id` / `place_text` của nhiệm vụ `PICKUP`. Không sao chép giữa hai chỗ. Câu "khách có hẹn đón không, mấy giờ" đọc từ `order_service`; câu "tài xế đón mấy giờ" đọc từ nhiệm vụ `PICKUP` của dịch vụ đó.
6. **Cờ "có hẹn đón" là việc của N2, không phải tuỳ chọn:** A1 chỉ có `pickup_time`/`pickup_place`, nên chưa phân biệt được "không hẹn đón" với "có hẹn nhưng chưa chốt giờ"; câu hỏi số 6 của chủ dự án đòi phân biệt. N2 thêm một cột rõ ràng trên `order_service` bằng expand–contract.
7. **Nhật ký gọi xác nhận** và **tiến độ dịch vụ** là hai bảng **chỉ-thêm** của `dispatch`: `dsp_call_log` (đơn, người gọi, lúc gọi, kết quả tra cứu, ghi chú) và `dsp_service_progress` — **chỉ ghi tiến độ của dịch vụ** (đã khởi hành / hoàn thành). Tiến độ **của từng nhiệm vụ** (đã gọi, đã đón) nằm ở `dsp_assignment.status_code`/`done_at` — một nguồn duy nhất, `dsp_service_progress` không lặp lại.
8. **Chiều phụ thuộc:** `dispatch → orders, parties, locations`. `orders` **không** có cột người phụ trách, không import `dispatch`, không có SQL đọc bảng `dsp_*`; việc `orders` cần biết "người dùng đang được giao đơn" đi qua hàm do `dispatch` cung cấp, tiêm ở gốc lắp ráp (ADR-0007 điều 4).

## Lý do
- Trả lời trực tiếp câu 5 (ai xử lý), 6 (hẹn đón), 7 (tài xế đón mấy giờ) bằng khoá ngoại, một truy vấn mỗi câu, không phân tích chữ.
- Một bảng với `CHECK` một-trong-hai cho hai hạt tránh hai bảng gần giống nhau; đóng/mở dòng cho lịch sử đúng yêu cầu "người phụ trách đổi được".
- Tách giờ hẹn khách khỏi giờ điều xe vì là hai sự kiện của hai chủ thể có thể khác giá trị (khách hẹn 07:00, xe khởi hành 06:40).
- Một cách duy nhất để "không còn hiệu lực" (đóng dòng) và một nguồn cho tiến độ nhiệm vụ tránh hai câu trả lời khác nhau cho cùng một câu hỏi (N7).

## Phương án bị loại
- **Cột `handler_id` trên `orders`:** đổi người là ghi đè, mất lịch sử; và `orders` phải biết `dispatch` (đảo chiều phụ thuộc).
- **Mọi thứ ở mức booking:** không trả lời được đón dịch vụ nào lúc mấy giờ, ai đón.
- **Mọi thứ ở mức dịch vụ (kể cả người phụ trách):** đơn nhiều dịch vụ phải gán người gọi điện lặp lại cho từng dịch vụ.
- **Một cột giờ đón dùng chung:** không tách được hai giờ (câu 6 và 7 đều cần).
- **Hai bảng riêng cho phụ trách và nhiệm vụ:** trùng cấu trúc, gấp đôi chỗ phải giữ nhất quán.
- **Khoá ngoại `DEFERRABLE INITIALLY DEFERRED` để "cho qua" xoá–chèn lại:** mong manh, lỗi hiện mờ ở `COMMIT`.

## Hệ quả
- Đặc tả N2 ghi mô hình chi tiết và truy vấn cho câu 5, 6, 7, kèm việc đổi `updateDraftOrder` sang so khớp theo id (có test).
- **Không có ràng buộc "chỉ HDV mới được gán đón ở cảng":** vai trò chỉ được ghi và truy vấn (ADR-0001). Lọc gợi ý người theo vai/nơi là chuyện giao diện, không phải luật.
- **Câu "ai là HDV ở Bến cảng Vinpearl hôm nay" có hai nghĩa, hai nguồn, không được trộn:** "ai **giữ vai**" đọc `pty_party_role` (danh bạ, ADR-0001); "ai **trực hôm nay**" đọc `dsp_assignment` (điều hành). Giao diện phải ghi rõ đang hỏi cái nào; `role_type_code` trên phân công là **nhãn lúc gán**, không suy ngược ra danh bạ và không được dùng để cập nhật `pty_party_role`.
- Với `dsp_assignment → orders` `NO ACTION`, một `DELETE FROM orders` trong tương lai bị chặn khi còn phân công — điều tốt, và giảm nhẹ cảnh báo `CASCADE` ở `ARCHITECTURE.md` "Luật dữ liệu".
- Quyền xem/sửa phân công: ADR-0007.
