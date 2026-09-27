# ADR-0038 — Thao tác "im lặng" của Toàn quyền (vẫn ghi nhật ký, chỉ Toàn quyền xem); Góp ý/Báo lỗi chỉ Toàn quyền đọc và xử lý

- **Trạng thái:** **accepted** — chủ dự án quyết trong chat 2026-09-27: chọn phương án **A** ("vẫn ghi, chỉ Toàn quyền xem được") cho câu hỏi "thao tác của Super Admin diễn ra trong im lặng, không hiện Nhật ký"; liệt kê thêm *"ẩn thêm bật/tắt bảo trì, đặt lại PIN, gỡ Face ID. Đồng thời gỡ tính năng cho phép Gửi thông báo, và đọc Góp ý, Báo lỗi khỏi tài khoản Giám đốc"*. AI ghi lại, không tự quyết (tiền lệ ADR-0021, ADR-0027, ADR-0033, ADR-0034).
- **Ngày:** 2026-09-27   **Loại:** **hai chiều** — chỉ đổi quyền XEM và hai ô của bản đồ quyền; không xoá, không sửa dòng dữ liệu nào; migration chỉ thêm một view.
- **Liên quan:**
  - **Hiến chương** (`docs/ARCHITECTURE.md` Phần I, đã duyệt): **5.12** (mọi thay đổi để lại ai/làm gì/lúc nào) — **giữ nguyên**: dòng nhật ký vẫn ghi đủ, chỉ đổi AI ĐƯỢC ĐỌC. Phương án B (không ghi) bị loại vì trái 5.12.
  - **ADR-0019** (bảng quyền là nguồn duy nhất): **giữ**; hai ô `feedback.view`, `feedback.triage` đổi giá trị cột ADMIN.
  - **ADR-0034 điều 7** (`notice.send` chỉ Toàn quyền): **không sửa** — đã đúng ý chủ; Giám đốc gửi được thông báo trước đây là do tài khoản đó giữ quyền Toàn quyền (dữ liệu), không do bản đồ.
  - **ADR-0018** (vai Giám đốc = Quản trị + Toàn quyền): **không sửa**. Tài khoản 0914095939 giữ vai "Giám đốc" (đúng thực tế) và chủ tự "bớt tay" quyền Toàn quyền trên màn Sửa tài khoản (luật chỉnh tay có sẵn, ADR-0018).
  - **ADR-0002** (đọc xuyên module chỉ qua view `v_<tiền tố>_*`): view mới `v_stf_toan_quyen` do module `staff` công bố, `audit` đọc ở tầng SQL (cùng kiểu `v_stf_staff_label` đang đọc).
  - Số 0037 do điều phối giữ cho phân hệ Vận chuyển → 0038.

## Bối cảnh

Hệ thống có hai tài khoản giữ Toàn quyền; chủ muốn chỉ một (0989929373). Tài khoản còn lại mang chức danh Giám đốc nhưng không phụ trách phân quyền, kỹ thuật. Mọi Quản trị đang xem được toàn bộ trang Nhật ký, nên việc chủ hạ quyền, đặt lại PIN, gỡ Face ID hay bật/tắt bảo trì đều hiện ra cho Quản trị. Quản trị cũng đang đọc và xử lý được mọi Góp ý/Báo lỗi.

## Quyết định

1. **Thao tác im lặng** — `SILENT_AUDIT_ACTIONS` ở `src/shared/audit-actions.ts`: `account_roles_changed`, `permission_changed`, `staff_role_changed` (đổi vai/quyền), `maintenance_changed` (bật/tắt bảo trì), `pin_reset` (đặt lại PIN), `passkey_removed` (gỡ Face ID). Dòng nhật ký **vẫn ghi như cũ** (cùng lô, đủ ai/làm gì/lúc nào/lý do).
2. **Ai thấy**: ở `GET /api/audit`, người xem **không** có ô `admin.manage.superadmin` (hôm nay: không giữ Toàn quyền) thì **không nhận** các dòng có hành động ở điều 1 **và** người làm đang giữ Toàn quyền. Lọc trong SQL, trước `LIMIT`, nên phân trang và `hasMore` không để lộ số dòng bị giấu. Thao tác im lặng do **Quản trị** làm (ví dụ đặt lại PIN cho cấp dưới) vẫn hiện cho Quản trị.
3. **Theo quyền hiện tại của người làm** (lúc đọc, qua view `v_stf_toan_quyen` — migration `0027`). Hệ quả chấp nhận: người bị gỡ Toàn quyền thì các thao tác im lặng họ làm trước đó hiện lại cho Quản trị. Dòng của người đang giữ Toàn quyền (kể cả những dòng ghi trước ngày phát hành) bị giấu ngay khi bản này lên.
4. **Góp ý/Báo lỗi**: `feedback.view` cột ADMIN `any` → `own` (chỉ yêu cầu của chính mình); `feedback.triage` cột ADMIN `any` → `none`. Mọi tài khoản vẫn gửi được. Khối "Góp ý đang chờ" trên Trang chủ chỉ hiện khi có `feedback.triage`; Trang chủ không gọi hàng đợi Góp ý khi không có ô đó.
5. **Gửi thông báo**: không đổi mã (điều 7 ADR-0034 đã chỉ Toàn quyền).

## Trang ghép (CLAUDE.md §9 — lượt duyệt gồm 2 quyết định chạm quyền)

1. **Bảng chạm tới:** `audit_log` (không thêm loại thực thể, chỉ đổi ai đọc được dòng nào); `fbk_ticket`/`fbk_message` (không đổi dữ liệu, chỉ đổi ai đọc/xử lý); `stf_permission` chỉ được ĐỌC qua view mới.
2. **Dòng bản đồ quyền chạm các bảng này:** `admin.manage` (cổng đọc `GET /api/audit` — giữ), `admin.manage.superadmin` (MỚI dùng để quyết "thấy dòng im lặng"), `feedback.submit` (giữ, mọi quyền), `feedback.view` (đổi cột ADMIN), `feedback.triage` (đổi cột ADMIN). Áp cho mọi tài khoản theo quyền; tài khoản giữ cả ADMIN và SUPER_ADMIN (vai Giám đốc chưa bớt tay) vẫn thấy hết.
3. **Cổng canh cửa:** `GET /api/audit` — cổng `admin` + `can(admin.manage)` + bộ lọc `hideSilent` (thân handler); `GET /api/feedback`, `PATCH /api/feedback/:id` — cổng `admin` + `can(feedback.triage)`; `GET /api/feedback/:id`, `POST …/messages` — cổng `staff` + `can(feedback.view, { ownerId })` (404 khi không được xem). Kiểm: `src/modules/audit/an-toan-quyen.test.ts`, `src/shared/permissions.test.ts`, `src/shared/dashboard-review.test.ts`, `tests/audit/redteam.test.mjs`, e2e `tests/e2e/feedback.mjs`.

## Hệ quả

- Quản trị không còn thấy thao tác nhạy cảm của Toàn quyền, cũng không đọc/xử lý Góp ý. Yêu cầu Góp ý đang giao cho Quản trị làm người xử lý: Quản trị không mở được nữa (Toàn quyền giao lại nếu cần).
- Chưa làm (chờ chủ quyết riêng): tách phần "kỹ thuật" khỏi `admin.manage` của Quản trị (tài khoản, PIN, Face ID, đồng bộ nhân viên…).
- Hoàn tác: đảo hai ô ở `permissions.ts` và bỏ `hideSilent`; view `v_stf_toan_quyen` để lại vô hại.
