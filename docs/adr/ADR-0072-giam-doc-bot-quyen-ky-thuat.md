# ADR-0072 — Vai "Giám đốc" bớt quyền kỹ thuật (Toàn quyền), theo thông lệ tổ chức

- **Trạng thái:** **accepted** — chủ dự án 2026-10-01: *"OK ta làm theo đúng khuyến nghị"* (sau khi đối chiếu bốn trục quản trị của Oracle: phân quyền theo chức năng, tách nhiệm vụ, nhân sự là nguồn tạo người dùng, rà quyền định kỳ). Số 0072 do phiên điều phối xác nhận còn trống. Lượt duyệt riêng, sau ADR-0071 (CLAUDE.md §9).
- **Ngày:** 2026-10-01   **Loại:** **hai chiều** về bảng vai; **một chiều** nếu chạy bước dữ liệu ở điều 3 (gỡ quyền khỏi tài khoản thật — vẫn gán lại được, nhưng có nhật ký).
- **Lời chủ dự án (chat 2026-10-01):** *"Rà soát để bớt quyền của Giám đốc để phản ánh đúng thông lệ tổ chức thông thường, (nếu muốn Quản trị có thêm quyền của IT thì gán thêm bằng cách thủ công)"*.
- **Bối cảnh:** `src/shared/roles.ts:27` — vai Giám đốc (`DIRECTOR`) sinh `ADMIN + SUPER_ADMIN`, giống hệt vai IT (`roles.ts:34`, ADR-0044). Báo cáo rà soát 2026-10-01 (`RA-SOAT-VAI-QUYEN.md`, mục A1) chỉ ra hai vai trùng nhau. Theo nguyên tắc chủ đã chốt cùng ngày (ADR-0071): Toàn quyền = việc **kỹ thuật** (cài đặt, bảo trì, gửi thông báo hệ thống, Góp ý, Nhật ký, cấp Quản trị); Quản trị = việc **kinh doanh**.
- **Liên quan / sửa:** ADR-0018 điều 4 (Giám đốc = Toàn quyền + Quản trị) — **sửa**. ADR-0044 (vai IT) — **giữ**.

## Quyết định (đề xuất)

1. **Vai Giám đốc sinh `ADMIN`** — bỏ `SUPER_ADMIN`. Giám đốc làm mọi việc kinh doanh của Quản trị: đơn, điều phối, danh mục & giá, Danh bạ, địa điểm, sửa/ngưng tài khoản, gán vai thường, hỗ trợ đăng nhập. Không làm việc kỹ thuật.
   - Vẫn chỉ Toàn quyền gán hoặc gỡ vai Giám đốc (`superAdminOnly: true`, giữ).
   - Giám đốc nào cần thêm, Toàn quyền **gán tay** (cộng quyền có ghi lý do, LC-6):
     - xem/ghi sổ công nợ, hoàn tiền: cộng `ACCOUNTING`;
     - việc kỹ thuật: cộng `SUPER_ADMIN`.
2. **Vai IT giữ nguyên** (`ADMIN + SUPER_ADMIN`, ADR-0044) — là vai của người phụ trách hệ thống. "Quản trị muốn có thêm quyền IT" = Toàn quyền gán tay theo điều 1.
3. **Tài khoản đang mang vai Giám đốc:**
   - Quyền được tính **lúc gán vai** rồi lưu, nên đổi bảng vai **không** tự bớt quyền của người đang giữ vai.
   - Trước khi phát hành: AI soạn một lệnh **chỉ đọc** liệt kê tài khoản đang có vai Giám đốc và đang giữ Toàn quyền. Chủ tự chạy lệnh đó.
   - Sau đó chủ chọn cho từng người: (a) giữ Toàn quyền bằng cộng tay có lý do, hoặc (b) Toàn quyền mở tài khoản đó và lưu lại vai trên trang Quản lý tài khoản, để quyền được tính lại.
   - AI **không** chạy lệnh ghi dữ liệu trên máy chủ thật.

## Trang ghép (CLAUDE.md §9)

1. **Bảng:** `pty_role_type` không đổi (mã vai giữ nguyên); `stf_permission` chỉ đổi khi chủ lưu lại vai theo điều 3b.
2. **Dòng bản đồ quyền:** không ô MATRIX nào đổi; chỉ đổi bộ quyền mặc định của vai Giám đốc (`ROLES.DIRECTOR.defaults`).
3. **Cổng:** không đổi. Luật "còn ít nhất một quản trị viên" đếm `ADMIN` — Giám đốc vẫn được đếm.

## Câu hỏi đã được chủ trả lời (2026-10-01, "theo khuyến nghị")

1. Giám đốc **không** mặc định có quyền Kế toán (Kế toán là quyền ghi sổ; tách nhiệm vụ). Cần thì Toàn quyền cộng tay `ACCOUNTING` kèm lý do. Quyền "chỉ xem sổ công nợ" riêng cho lãnh đạo: để lượt sau nếu chủ muốn.
2. Vai IT giữ nguyên, kể cả nhận đơn thay (tài khoản IT là của chủ doanh nghiệp). Người giữ vai IT vốn làm được mọi việc kế toán qua `SUPER_ADMIN`, không cần cộng `ACCOUNTING`. Nếu sau này giao vai IT cho người ngoài thì xem lại.
3. Rà người đang giữ vai Giám đốc theo điều 3: đồng ý.
4. **Kèm cùng lượt thi công** (chủ duyệt "sửa luôn"):
   - a. Giao diện hỏi bảng quyền bằng `can(...)` thay cho `hasPermission("ADMIN"/"SUPER_ADMIN")`, ở các chỗ của báo cáo rà soát mục B1–B4, B6–B8. Mục B5 đã nằm trong ADR-0071.
   - b. Trợ lý Hỗ trợ không mô tả các thao tác chưa có route: `task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue` (báo cáo mục 3D).
