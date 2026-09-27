# ADR-0044 — Vai "IT" cho tài khoản Toàn quyền; giữ tên vai, giữ quyền đổi người phụ trách

- **Trạng thái:** **accepted** — chủ dự án nói trong chat 2026-09-28, trả lời hai điểm chờ ở ADR-0042 điều 5: *"giữ tên Giám đốc, chấp nhận đổi người phụ trách. Mọi người nhìn thấy tôi (Super Admin) với vai trò IT, các quyền khác giữ nguyên"*. AI ghi lại, không tự quyết.
- **Ngày:** 2026-09-28   **Loại:** **hai chiều** — một dòng danh mục vai (migration `0028_vai_it.sql`, chỉ thêm) và một mục trong `src/shared/roles.ts`; không đổi quyền nào đang có.
- **Liên quan:**
  - **ADR-0042** (accepted, lên production bản 1.27): **bổ sung**, không sửa. Điều 5 của ADR-0042 (hai điểm chờ chủ) được chốt ở đây. Tệp ADR-0042 chỉ thêm dòng "Bổ sung bởi".
  - **ADR-0018** (mô hình người–vai–quyền, 11 vai): thêm vai thứ 12 theo đúng khuôn — mã vai là dữ liệu ở `pty_role_type`, bộ quyền mặc định ở `roles.ts`, `src/roles-schema.test.ts` giữ hai nơi khớp nhau.
  - Số 0043 dùng cho T2b ("đổi công ty chủ") → 0044 (điều phối giữ chỗ). Migration 0028 điều phối giao cho nhánh này.

## Quyết định

1. **Tên vai không ẩn.** Vai "Giám đốc" của 0914095939 hiện như cũ ở Quản lý tài khoản và Danh bạ.
2. **Quản trị vẫn đặt/đổi người phụ trách** trên đơn do chủ lập (`dispatch.assign` không đổi) — việc kinh doanh.
3. **Vai "IT"** (mã `IT`, nhóm nội bộ): bộ quyền mặc định = Giám đốc (Quản trị + Toàn quyền), `superAdminOnly` — chỉ Toàn quyền gán hoặc gỡ (LC-4). Quản trị không thấy vai này ở màn chọn vai (ADR-0042) và nhận 403 nếu gọi thẳng.
4. Tài khoản chủ mang vai IT thì người khác thấy **"IT"** ở Quản lý tài khoản và Danh bạ; quyền hiện ra là Quản trị (`quyenHienThi`, ADR-0042). Chủ tự chuyển vai của mình sang IT trên màn Sửa tài khoản — được phép khi quyền không đổi (luật "không tự đổi quyền của chính mình" giữ nguyên). Hai trường hợp (người kiểm độc lập tái hiện 28/9): (a) tài khoản đang có Quản trị + Toàn quyền (ví dụ vai Giám đốc) → chọn IT, bỏ vai cũ, xem trước không có "Sẽ thêm"/"Sẽ mất" → Lưu; (b) tài khoản chỉ có Toàn quyền → xem trước báo "Sẽ thêm: Quản trị" và lưu sẽ bị 409 — mở "Chỉnh riêng", tick "Bớt đi: Quản trị", ghi lý do, để quyền giữ nguyên rồi mới Lưu (không ai khác làm hộ được vì Quản trị không quản tài khoản Toàn quyền).

## Trang ghép (CLAUDE.md §9)

1. **Bảng chạm tới:** `pty_role_type` thêm một dòng vai nội bộ `IT` (cùng loại thực thể với 11 vai có sẵn); `pty_party_role` nhận dòng vai IT khi Toàn quyền gán (đường gán vai có sẵn).
2. **Dòng bản đồ quyền:** không ô nào đổi. Vai chỉ SINH bộ quyền (`defaultPermissions`), không phải cổng cho phép.
3. **Cổng canh cửa:** `PUT /api/staff/:id/roles` — `admin.manage` + `mayManage` + `roleAssignmentProblem` (vai `superAdminOnly` → 403 với người không giữ Toàn quyền). Kiểm: `src/shared/roles.test.ts`, `src/roles-schema.test.ts`, `src/modules/accounts/quan-tri-ky-thuat.test.ts` (ca "vai IT"), e2e `parties` (danh mục vai).

## Hệ quả

- Danh bạ (`GET /api/parties/:id`, mọi nhân viên văn phòng) hiện **cả lịch sử vai** (vai đã kết thúc hiện mờ), không chỉ vai đang mở như Quản lý tài khoản. Nếu tài khoản chủ đang mang vai Giám đốc rồi chuyển sang IT, hồ sơ của chủ hiện cả "Giám đốc (đã kết thúc)" lẫn "IT". Người kiểm độc lập nêu 28/9 — chờ chủ quyết.
- Gói JavaScript của giao diện chứa nguyên bảng vai → quyền mặc định (kể cả IT = Quản trị + Toàn quyền) — giới hạn có từ trước (giao diện chỉ ẩn/hiện, máy chủ luôn kiểm lại), không phải hàng rào.

- Hoàn tác: gỡ vai IT khỏi tài khoản (Toàn quyền), bỏ mục `IT` ở `roles.ts` rồi migration mới đặt `pty_role_type.active = 0` cho `IT` (không xoá cứng).
