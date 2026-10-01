# ADR-0042 — Quản trị lấy lại đặt lại PIN, mở khoá, gỡ Face ID cho cấp dưới; Toàn quyền là vai ẩn

- **Trạng thái:** **accepted** — chủ dự án nói trong chat 2026-09-27 (sau khi hỏi về kẽ hở đổi SĐT): *"Các lớp tài khoản sẽ là: Super Admin (tôi), Admin (Quản trị tài khoản mức cơ bản: tạo, ngưng, đặt lại PIN, đặt quyền (trừ Super Admin) và ẩn quyền này đi) … Tóm lại là Super Admin giống như 1 vai ẩn, không ai nhìn thấy ngoài chính tôi, và cũng không ai có thể kiểm soát được Super Admin"*. Chủ chọn tiếp trong ba câu hỏi: Quản trị được **mở khoá đăng nhập** và **gỡ Face ID**; Quản trị **chỉ gán vai thường** (không cấp Quản trị); tài khoản Toàn quyền **hiện như Quản trị thường** với người khác. AI ghi lại, không tự quyết.
- **Sửa bởi:** [ADR-0071](ADR-0071-vai-hanh-chinh-nhan-su-go-dong-bo-sheet-bao-tri-theo-toan-quyen.md) — Quản trị **thôi tạo** tài khoản (vai Hành chính nhân sự tạo); ngưng, đặt lại PIN, mở khoá, gỡ Face ID, gán vai thường giữ nguyên.
- **Bổ sung bởi:** [ADR-0044](ADR-0044-vai-it-cho-tai-khoan-toan-quyen.md) — vai "IT" hiện ra cho tài khoản Toàn quyền; chủ chốt hai điểm chờ ở điều 5.
- **Ngày:** 2026-09-27   **Loại:** **hai chiều** — một ô bản đồ quyền và cách hiển thị; không đổi dữ liệu, không migration.
- **Liên quan:**
  - **ADR-0038** (accepted, lên production bản 1.26): **sửa điều 6** — ô `account.access.manage` cột ADMIN `none` → `any`. Các phần khác của ADR-0038 giữ nguyên (`staff.sheet.sync`, `audit.view` vẫn chỉ Toàn quyền; nhật ký im lặng; Góp ý; pháp lý Tour Đảo). Tệp ADR-0038 chỉ thêm một dòng trỏ về đây.
  - **ADR-0014 điều 8** (Quản trị chỉ quản lý tài khoản cấp dưới — `mayManage`): **giữ**, là thứ bảo đảm "không ai kiểm soát được Toàn quyền".
  - **ADR-0018 điều 5 / LC-4** (chỉ Toàn quyền cấp/gỡ Quản trị, Toàn quyền, vai Giám đốc/Điều hành chung): **giữ**.
  - Số 0040 (Vận chuyển), 0041 (Thông báo) do điều phối giữ → 0042.

## Quyết định

1. **Quản trị lấy lại việc đăng nhập của cấp dưới:** `account.access.manage` = ADMIN + SUPER_ADMIN. Các route `POST /api/staff/:id/reset-pin`, `…/unlock`, `…/passkeys/remove-all` vẫn hỏi `admin.manage` rồi ô này, rồi luật cấp bậc `mayManage` — Quản trị không tác động được tài khoản Quản trị khác hay Toàn quyền.
2. **Kẽ hở đổi SĐT** (khoá đăng nhập tính theo SĐT; Quản trị đổi SĐT của tài khoản đang bị khoá thì hết khoá): **không chặn** — Quản trị vốn đặt lại PIN (tự mở khoá) được cho cùng tài khoản, nên không có quyền nào thêm.
3. **Toàn quyền là vai ẩn:**
   - `GET /api/staff` trả quyền qua `quyenHienThi` (`src/shared/permissions.ts`): người không có `admin.manage.superadmin` thấy `SUPER_ADMIN` thành `ADMIN` (bỏ trùng).
   - Tin thông báo thủ công không ghi "(Toàn quyền)" sau tên người gửi; "Gửi cho" không liệt kê nhóm Toàn quyền.
   - Màn chọn vai ẩn ô Toàn quyền và các vai chỉ Toàn quyền gán (Giám đốc, Điều hành chung) với người không giữ Toàn quyền (ô vẫn tạo để đọc/ghi đủ mã); trang Quản lý tài khoản ẩn nút trên tài khoản không quản được.
   - Câu báo lỗi người khác có thể gặp nói "người phụ trách hệ thống", không nói "Toàn quyền".
   - `GET /api/staff/:id/roles` (vai + chỉnh riêng) thêm luật cấp bậc `mayManage` như `PUT` cùng route — trước đây Quản trị đọc được dòng chỉnh tay có mã `SUPER_ADMIN` của tài khoản khác (người kiểm độc lập phát hiện 28/9).
4. **Giới hạn chấp nhận (không ẩn):** nhật ký thay đổi cũ trong trang Trợ giúp (các bản đã phát hành) có nhắc "Toàn quyền" — nhật ký chỉ-thêm; tên tài khoản của chủ vẫn hiện ở đơn chủ lập/phụ trách.
5. **Chờ chủ quyết (người kiểm độc lập nêu 28/9, chưa làm):** (a) tên **vai** (ví dụ "Giám đốc") không được ẩn như quyền — hiện ở Quản lý tài khoản và Danh bạ (`GET /api/parties*`, mọi nhân viên văn phòng xem được); nếu tài khoản chủ mang vai Giám đốc thì mọi người thấy chủ là "Giám đốc" (không thấy Toàn quyền). (b) Quản trị vẫn đặt/đổi người phụ trách trên đơn do chủ lập (`dispatch.assign`) — việc kinh doanh.

## Trang ghép (CLAUDE.md §9)

1. **Bảng chạm tới:** không bảng nào đổi; `stf_permission` chỉ được đọc (đã có).
2. **Dòng bản đồ quyền:** `account.access.manage` (đổi cột ADMIN); `admin.manage.superadmin` (dùng để quyết "thấy vai ẩn"); `admin.manage` + `mayManage` (giữ).
3. **Cổng canh cửa:** `GET /api/staff/:id/roles` — cổng `admin` + `can(admin.manage)` + `mayManage`; ba route đăng nhập — cổng `admin` + `can(admin.manage)` + `can(account.access.manage)` + `mayManage`; `GET /api/staff` — cổng `admin` + `can(admin.manage)` + `quyenHienThi`. Kiểm: `src/modules/accounts/quan-tri-ky-thuat.test.ts`, `src/modules/accounts/reset-pin-self.test.ts`, `src/shared/permissions.test.ts`, e2e `admin`, `admin-race`.

## Hệ quả

- Quản trị giúp được nhân viên cấp dưới quên PIN, bị khoá, đổi máy.
- Hoàn tác: đảo ô `account.access.manage` cột ADMIN về `none`; bỏ `quyenHienThi` ở `GET /api/staff`.
