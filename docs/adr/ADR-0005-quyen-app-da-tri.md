# ADR-0005 — Quyền trong app đa trị, tách khỏi vai trò hồ sơ (cấu trúc)

- **Trạng thái:** proposed (bản 3, sau hai lượt rà soát độc lập 2026-09-20)
- **Ngày:** 2026-09-20   **Người phê chuẩn:** chủ dự án (chờ duyệt)
- **Loại quyết định:** **cửa một chiều** — đụng vùng rủi ro cao nhất (đăng nhập, PIN, chống dò)
- **Liên quan:** ADR-0001, ADR-0003, ADR-0007 (bản đồ quyền → thao tác nằm ở ADR-0007, không ở đây)

## Bối cảnh
`staff.role TEXT NOT NULL CHECK (role IN ('sales','admin'))` (`migrations/0001_staff.sql:7`) là **đơn trị**, hai giá trị, không có giá trị mặc định; đổi `CHECK` hay gỡ cột đều phải dựng lại bảng. Chủ dự án (2026-09-20) chốt **bốn quyền trong app, một tài khoản có thể có nhiều**: Bán hàng, Kế toán, Quản trị, Thực hiện. "Vai trò" theo nghĩa hồ sơ (ADR-0001: nhân sự, đại lý, HDV, tài xế…) là khái niệm **khác** — để ghi và truy vấn, không để cho phép hay chặn.

`staff` bị **bốn** cột khoá ngoại tham chiếu (`orders.staff_id` NOT NULL, `audit_log.staff_id`, `company_profile.updated_by`, `catalog_override.updated_by`). Hai lần dựng lại bảng trước đây của dự án (`0005`, `0007`) đều dựng `audit_log` và tự ghi rõ an toàn vì không bảng nào tham chiếu nó; `0007` còn dùng trigger để **né** dựng lại bảng bị tham chiếu. Rà soát độc lập và thí nghiệm SQLite (3.51 và 3.53, 2026-09-20) cho thấy trình tự dựng lại `staff` kiểu "nạp bảng mới trước, `DROP` bảng cũ sau" **thất bại ở `COMMIT`**; trình tự an toàn (ADR-0003 điều 10) chỉ chạy được khi D1 hỗ trợ `defer_foreign_keys` và bọc migration trong một giao dịch — hai điều **chưa có bằng chứng** trên D1 thật.

## Quyết định
1. **Hai từ vựng, không dùng lẫn:** *quyền app* (`stf_permission_type`, thuộc module `staff`, gắn **tài khoản**) quyết định được làm gì trong app; *loại vai trò hồ sơ* (`pty_role_type`, thuộc `parties`, gắn **hồ sơ**) ghi ai đóng vai gì ở đâu và không bao giờ là điều kiện cho phép.
2. **Bảng tra cứu và bảng nối:** `stf_permission_type(code TEXT PRIMARY KEY, name, …)` với bốn mã `SALES` (Bán hàng), `ACCOUNTING` (Kế toán), `ADMIN` (Quản trị), `FIELD` (Thực hiện); `stf_permission(staff_id, permission_type_code, created_at, created_by)`, khoá duy nhất `(staff_id, permission_type_code)`. Thêm quyền mới = thêm một dòng tra cứu.
3. **KHÔNG dựng lại `staff`.** Di trú thành các bước độc lập, mỗi bước có cổng kiểm:
   1. Tạo `pty_*`, `stf_permission*`; tạo hồ sơ cho mỗi `staff`; backfill quyền `sales → SALES`, `admin → ADMIN` (**không** kèm `SALES`: `ADMIN` làm được mọi thao tác kể cả lập đơn — ADR-0007). **Cổng 1:** `npm test` xanh; số quyền khớp số tài khoản.
   2. `ALTER TABLE staff ADD COLUMN party_id TEXT REFERENCES pty_party(id)`; backfill; hai trigger `BEFORE INSERT` và `BEFORE UPDATE` chặn `party_id IS NULL` (`RAISE(ABORT, 'staff_party: thiếu hồ sơ')`) — idiom của `0007`. **Cổng 2:** thí nghiệm SQLite đã kiểm: chèn thiếu `party_id` bị chặn, `PRAGMA foreign_key_check` = 0 dòng; chạy lại trên D1 local (`wrangler d1 migrations apply --local`).
   3. Chuyển mã kiểm quyền (`canModify`, các route `admin`, bất biến admin cuối cùng ở `staff/index.ts`) sang bảng mới. **Cổng 3:** `npm test` + e2e `platform`, `orders`, `trip`, `admin`, `admin-race`, `catalog` xanh.
   4. `staff.role` trở thành **cột chết**: không đường mã nào đọc; `INSERT` mới ghi hằng `'sales'` (cột `NOT NULL` không mặc định); bài kiểm kiến trúc cấm mọi SQL khác nhắc tên cột; sổ dữ liệu đánh dấu `deprecated`. Đây là **nợ có chủ đích, không phải hai nguồn sự thật** (nguồn duy nhất về quyền là `stf_permission`), có điều kiện gỡ: lần đầu phải dựng lại `staff` vì lý do khác.
4. **Bất biến giữ nguyên, chuyển sang bảng mới:** luôn còn ít nhất một tài khoản hoạt động có quyền `ADMIN`, kiểm ngay trong câu `UPDATE` (chống đua) như hiện nay.
5. **Không có bản đồ quyền → thao tác trong ADR này.** Quyền nào làm được thao tác nào (đặc biệt liên quan tiền) là quyết định riêng ở **ADR-0007**, chủ dự án duyệt trước khi N1 hiện thực hoá quyền.
6. **Phụ thuộc vào cổng bằng chứng của ADR-0001:** các bước 1–4 không cần cửa sổ dữ liệu rỗng (không dựng lại bảng); bước gỡ cột `role` (nếu sau này chủ dự án muốn) mới cần điều kiện của ADR-0003 điều 10 và số đơn thật đã kiểm.

## Lý do
- Nhiều quyền/tài khoản là nhu cầu thật (một người vừa bán hàng vừa thực hiện) mà cột đơn trị không biểu diễn được; bảng nối + tra cứu cho phép thêm quyền mà không đụng `staff` nữa.
- Tránh dựng lại `staff` giữ nguyên rủi ro thấp cho phần đăng nhập, PIN, chống dò (P10) và đúng tiền lệ `0007`.
- Tách hai từ vựng chặn lỗi khái niệm ("là HDV" không tự cho quyền; "có quyền Thực hiện" không nói đóng vai gì).

## Phương án bị loại
- **Dựng lại `staff` để gỡ `role` ngay trong N1** theo trình tự "nạp bảng mới rồi `DROP` bảng cũ": **thất bại ở `COMMIT`** (đã kiểm). Trình tự chép–xoá–đổi tên–nạp lại chạy được nhưng cần bằng chứng D1 (giao dịch + `defer_foreign_keys`) mà hiện chưa có; chỉ xét lại khi chủ dự án muốn dọn cột chết và bằng chứng đã đủ.
- **Dựng lại bằng `PRAGMA foreign_keys = OFF`:** không đổi được trong giao dịch D1.
- **Mở rộng `CHECK` của `staff.role` lên bốn giá trị đơn trị:** không đa quyền; mỗi lần thêm quyền phải dựng lại bảng.
- **Cột bit/chuỗi ghép quyền trong `staff`:** vi phạm 1NF, không có khoá ngoại.
- **Dùng `pty_party_role` làm quyền:** trộn hai khái niệm; biến vai trò thành cổng — trái quyết định "không giới hạn".
- **Giữ `staff.role` làm nguồn quyền song song:** hai nguồn (N7). Cột chết không đọc thì không phải nguồn.

## Hệ quả
- Đổi mã ở `staff`, `accounts`, `auth`, `orders` (`canModify`): chạm phần đăng nhập nên **phải qua bộ kiểm hiện có** ở mỗi cổng; không gộp các bước vào một lần đổi mã.
- Quyền `ACCOUNTING` và `FIELD` chỉ có nghĩa khi N2/N3 thêm thao tác tương ứng; N1 dựng nền quyền và màn hình quản lý.
- `staff.party_id` là khoá ngoại `staff → parties` (đồ thị ADR-0002), dùng `NO ACTION`.
- Nợ: cột `staff.role` chết và câu `INSERT` ghi hằng `'sales'` — ghi vào sổ dữ liệu và danh sách nợ kỹ thuật (Điều 6.1: không có nợ ẩn).
