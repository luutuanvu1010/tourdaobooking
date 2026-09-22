# ADR-0013 — Hồ sơ gắn tài khoản nhân viên chỉ quản trị viên sửa; "đang hoạt động" của nhân viên có một nguồn

- **Trạng thái:** **proposed** (AI soạn 2026-09-22, chờ chủ dự án duyệt). Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-22   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa hai chiều**: thêm một thao tác vào bản đồ quyền (`src/shared/permissions.ts`) và một kiểm ở route; không đổi cấu trúc dữ liệu; gỡ được bằng một commit
- **Liên quan:** ADR-0007 (bản đồ quyền → thao tác; dòng "Tạo/sửa hồ sơ khách, đại lý (danh bạ)" ✓✓✓—), ADR-0001 (một danh tính nhiều vai; tài khoản trỏ hồ sơ), ADR-0005 (tên tài khoản đọc từ hồ sơ, `staff.full_name` là cột chết), ADR-0002 (ranh giới module), kiểm toán `docs/AUDIT-2026-09-22-KIEN-TRUC.md` F-01, F-07; đặc tả `docs/superpowers/specs/2026-09-22-ho-so-nhan-vien-chi-quan-tri-sua.md`

## Bối cảnh

ADR-0007 cấp thao tác "tạo/sửa hồ sơ **khách, đại lý** (danh bạ)" cho SALES, ACCOUNTING và ADMIN (mã: `party.write` = any/any/any/none). Khi ADR-0007 được viết, hồ sơ nhân viên chưa nằm chung bảng với khách. Migration 0012 (N1) sau đó tạo một hồ sơ `pty_party` cho **mỗi tài khoản nhân viên** và đặt tên tài khoản bằng tên hồ sơ (ADR-0005). Bản đồ quyền không được xét lại, nên các route `/api/parties*` dùng `party.write` cho **mọi** hồ sơ, kể cả hồ sơ của nhân viên.

Hệ quả đã chứng minh (`tests/audit/redteam.test.mjs` R3, R3b): một tài khoản chỉ có quyền Bán hàng đổi được tên và ngưng được hồ sơ của quản trị viên. Tên giả hiện ở "người lập", "người phụ trách" và trên ảnh xác nhận gửi khách. Không leo quyền được (quyền nằm ở `stf_permission`), nhưng đây là mạo danh nội bộ lộ ra bên ngoài.

Kèm theo đó là hai cờ "đang hoạt động" độc lập (D4): `staff.active` (đăng nhập, giao phụ trách) và `pty_party.active` (danh sách hồ sơ, chọn làm người đặt). Chưa có luật nói cái nào đúng khi chúng khác nhau.

## Quyết định

1. **Thao tác mới `party.staff.write`** = SALES none, ACCOUNTING none, ADMIN any, FIELD none: "sửa hồ sơ gắn một tài khoản nhân viên (tên, liên hệ, trạng thái)". `party.write` giữ nguyên và từ nay chỉ còn nghĩa là "hồ sơ **không** gắn tài khoản" (khách, đại lý, HDV/tài xế chưa có tài khoản), đúng như chữ của ADR-0007.
2. **Nơi thi hành:** mọi route ghi của `parties` chạm một hồ sơ có sẵn (`PUT /api/parties/:id`, `POST /api/parties/:id/contacts`, `POST /api/parties/:id/contacts/:cid/end`) hỏi "hồ sơ này có gắn tài khoản không" rồi gọi `can(staff, hasAccount ? "party.staff.write" : "party.write")`. Route vai trò và quan hệ vốn đã là `admin`, không đổi. **Mức truy cập route (`office`) không đổi**: kiểm nằm trong handler, như `order.modify`.
3. **Cách `parties` biết "có gắn tài khoản":** gốc lắp ráp (`src/index.ts`) **tiêm** một hàm của module `staff` vào `ctx` (`ctx.partyHasAccount(partyId)`), đúng cơ chế ADR-0007 điều 4(b) đang dùng cho `ctx.isAssigned`. `parties` **không** import `staff` và không đọc `v_stf_staff_label`: `staff → parties` là chiều đã có, chiều ngược lại sẽ thành vòng (`src/architecture.test.ts` chặn).
4. **Một nguồn cho "nhân viên đang hoạt động":** với hồ sơ gắn tài khoản, `staff.active` là nguồn. `pty_party.active` của hồ sơ đó được **ghi theo** trong cùng batch khi quản trị viên ngưng hoặc kích hoạt tài khoản (`PATCH /api/staff/:id`, dùng câu lệnh công khai của `parties` như `renameAccountStatements`). Route của `parties` **từ chối đổi `active`** của hồ sơ gắn tài khoản, kể cả với ADMIN, và báo "Ngưng/kích hoạt nhân viên ở màn Nhân sự". Kiểm bất biến mới trong `audit-invariants`: hồ sơ của tài khoản đang hoạt động phải đang hoạt động.

## Lý do
- Sửa đúng chỗ trôi: đưa bản đồ quyền về đúng chữ của ADR-0007 thay vì thêm ngoại lệ trong route (P6: bản đồ quyền một nơi).
- Tiêm hàm là cơ chế đã được duyệt và đã có test. Không thêm cạnh phụ thuộc, không tạo vòng.
- Giữ `pty_party.active` theo `staff.active` (thay vì bỏ hẳn một cờ) giữ được mô hình Party chung cho khách, và không cần dựng lại bảng.

## Phương án bị loại
- **Chuyển mọi sửa hồ sơ nhân viên sang màn Nhân sự và cấm hẳn ở `/api/parties`, kể cả với ADMIN:** an toàn tương đương nhưng ADMIN mất đường sửa liên hệ của nhân viên ở màn Hồ sơ. Không có lợi thêm.
- **Để `parties` đọc view `v_stf_staff_label`:** tạo vòng `parties ↔ staff`, bị test kiến trúc chặn.
- **Trigger CSDL chặn sửa hồ sơ nhân viên:** trigger không biết ai đang gọi, nên không phân biệt được ADMIN với SALES.
- **Cho nhân viên tự sửa hồ sơ của chính mình:** chủ chưa yêu cầu; và tên của mình cũng in lên ảnh gửi khách. Để chủ quyết riêng nếu cần (đặc tả §6).

## Hệ quả
- `src/shared/permissions.ts` thêm một dòng, kèm test khoá bản đồ. `AppOptions.injected` thêm một hàm bắt buộc (thiếu hàm = kiểu lỗi lúc typecheck).
- Nếu nhánh `siet-nen-mong` (bài kiểm chụp mức truy cập route) được gộp trước: không phải sửa ảnh chụp, vì mức truy cập không đổi.
- Giao diện: màn Hồ sơ ẩn nút sửa, thêm liên hệ, đóng liên hệ trên hồ sơ nhân viên với người không phải quản trị viên.
- Nhật ký `party_updated` của hồ sơ nhân viên ghi tên cũ → mới (tên không phải dữ liệu cấm ghi; vẫn không ghi SĐT, email hay MST).
