# ADR-0009 — Người phụ trách được sửa đơn: đổi ba ô của bản đồ quyền và thêm thao tác `dispatch.claim`

- **Trạng thái:** **accepted** theo yêu cầu trực tiếp của chủ dự án ngày 2026-09-21 ("người phụ trách … có thể sửa được đơn hàng: cả dịch vụ, số lượng khách"). Chờ chủ dự án đọc lại văn bản; sau khi accepted chỉ sửa trạng thái, thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-21   **Người phê chuẩn:** chủ dự án (yêu cầu ngày 2026-09-21)
- **Loại quyết định:** **cửa hai chiều** — đổi ô ma trận và thêm một thao tác là thay đổi ở mã (`src/shared/permissions.ts`) và test; không đổi cấu trúc dữ liệu của ADR này (cấu trúc `dsp_assignment` thuộc ADR-0006)
- **Liên quan:** ADR-0006 (phân công; người phụ trách = dòng `HANDLE` đang mở), ADR-0007 (bản đồ quyền; điều 1 và điều 4), ADR-0002 (ranh giới; `orders` không đọc `dsp_*`)

## Bối cảnh
ADR-0006 định nghĩa "người phụ trách" (nhận xử lý: gọi điện xác nhận, đón khách; một người mỗi đơn, khác người lập được, đổi được). ADR-0007 điều 1 cho thao tác `order.modify` (sửa nháp, xác nhận, huỷ), `order.history.view` và `dispatch.assign` của `SALES` chỉ ở phạm vi `own` ("của mình" = `orders.staff_id`), và điều 4 loại phương án đưa người phụ trách vào "của mình" trong `orders` (buộc `orders` đọc `dispatch` hoặc thêm cột phụ trách). Điều 4(b) đã dành sẵn cơ chế cho thao tác "đang được giao": `dispatch` cung cấp một hàm, gốc lắp ráp tiêm vào `ctx.assigned`; ô `ownOrAssigned` đã có (dùng cho `order.trip.edit`).

Chủ dự án (2026-09-21) muốn người phụ trách — người đã nhận chăm sóc khách — **sửa được đơn** (dịch vụ, số khách), thay vì chỉ người lập đơn.

## Quyết định
1. Đổi ba ô của `SALES` trong `MATRIX` (`src/shared/permissions.ts`) từ `own` sang **`ownOrAssigned`**: `order.modify`, `order.history.view`, `dispatch.assign`. Cột `ADMIN` (`any`), `ACCOUNTING` và `FIELD` không đổi. **`order.money.edit` KHÔNG đổi** (`own`): sửa tiền/số khách/dịch vụ **sau khi xác nhận** vẫn thuộc N3 (ADR-0007 điều 3).
2. Thêm thao tác **`dispatch.claim`** — nhận phụ trách một đơn **chưa có người phụ trách đang mở**: `SALES` `any`, `ADMIN` `any`, `ACCOUNTING` `none`, `FIELD` `none`. Điều kiện "chưa có người phụ trách" do dịch vụ của `dispatch` kiểm (trong cùng `db.batch()` bằng câu điều kiện), không phải ô ma trận.
3. **Cơ chế tiêm giữ nguyên ADR-0007 điều 4(b):** `dispatch` xuất một hàm `isHandler(db, staffId, orderId)`; `src/index.ts` tiêm kết quả vào `ctx.assigned` cho các route của `orders` cần; `orders` **không** import `dispatch` và **không** có SQL đọc `dsp_*`. Ý nghĩa của `own` trong `orders` (`orders.staff_id = ctx.staff.id`) **không đổi**.
4. **Đơn mới**: người lập đơn được đặt làm người phụ trách mặc định trong cùng `db.batch()` tạo đơn (câu lệnh do `dispatch` cung cấp, gộp bởi `orders/service.ts` như `auditStatement`). **Đơn đã có** được backfill người lập làm người phụ trách ở migration của `dispatch`.
5. Người được giao phải là nhân sự **đang hoạt động, có quyền `SALES` hoặc `ADMIN`, có `party_id`** — để người phụ trách luôn có quyền sửa đơn (điều 1). Không giao cho tài khoản chỉ `FIELD` hoặc chỉ `ACCOUNTING`.
6. Nhật ký: hành động `order_handler_changed` (`src/shared/audit-actions.ts`) ghi chuyển giao dạng "từ A sang B" — **tên**, không SĐT.

## Lý do
- Đáp ứng yêu cầu của chủ dự án bằng thay đổi nhỏ nhất: ba ô ma trận + một thao tác; dùng đúng cơ chế đã duyệt (`ownOrAssigned`, `ctx.assigned`) nên không đảo chiều phụ thuộc và không thêm cột vào `orders`.
- Người phụ trách là người gọi điện, đón khách và chịu trách nhiệm trước khách nên cần sửa được đơn của khách mình chăm sóc; giữ lại quyền của người lập (không mất quyền khi giao lại) tránh làm hỏng luồng hiện có.
- `order.money.edit` giữ nguyên để không mở đường sửa tiền sau xác nhận khi chưa có cơ chế lý do + lịch sử (N3).

## Phương án bị loại
- **Thêm cột `handler_id` vào `orders`** (hoặc để `orders` đọc `dsp_*`): đã bị ADR-0006/0007 loại (mất lịch sử đổi người; đảo chiều phụ thuộc).
- **Chỉ ADMIN được giao/đổi người phụ trách:** không đáp ứng "người nhận trách nhiệm" tự nhận đơn; bắt admin làm mọi việc.
- **Cho mọi SALES sửa mọi đơn (`any`):** mất phạm vi "của mình / được giao", trái ADR-0007 và nguyên tắc từ chối mặc định.
- **Người phụ trách sửa cả tiền sau xác nhận ngay bây giờ:** cần lý do + lịch sử (N3); làm sớm sẽ để lỗ hổng sửa tiền không dấu vết.

## Hệ quả
- `src/shared/permissions.ts` và test khoá bản đồ (`permissions.test.ts`) đổi theo; `web/` dùng `can()` nên tự đúng.
- Người lập đơn **giữ** quyền sửa đơn sau khi giao lại (ô `ownOrAssigned` = của mình HOẶC được giao). Nếu chủ dự án muốn người lập mất quyền khi đã giao, đó là ADR mới.
- `canModify` ở `OrderDetailResponse` và các route `PUT /api/orders/:id`, `POST /api/orders/:id/status`, `PUT /api/orders/:id/trip` phải nhận `ctx.assigned`.
- Migration của `dispatch` phải backfill người phụ trách cho đơn đã có; `docs/data-dictionary.json` thêm module `dispatch`; `HANDOFF-N1.md`/`CLAUDE.md` ghi lại số migration đã dùng và B5 dời số.
