# ADR-0176 — Quản trị được gán mọi vai trừ Toàn quyền

- **Trạng thái:** **accepted** — chủ dự án quyết trong chat 2026-11-06. Số 0176: kiểm `ls docs/adr` và mọi nhánh trước khi nhập (0174 ở nhánh «Có vé», 0175 đang đề xuất).
- **Ngày:** 2026-11-06   **Loại:** **hai chiều** về quyền; chạm **tiền**.
- **Lời chủ dự án (chat 2026-11-06, AI chép lại):** *"cho phép Quản trị được gắn mọi vai (ngoại trừ gắn vai SuperAdmin)"*.
- **Sửa:** **ADR-0090 Đ1(ii)** (chỉ Toàn quyền gán vai Kế toán / cộng tay quyền tiền), **ADR-0072 Đ1** (vai Giám đốc, Điều hành chung chỉ Toàn quyền gán), **ADR-0071 Đ1d** (vai Hành chính nhân sự chỉ Toàn quyền gán), LC-4 của ADR-0018 Đ5 (chỉ Toàn quyền cấp Quản trị, Nhân sự). Chỉ phần «ai được gán»; các phần khác của các ADR đó giữ nguyên.

## Quyết định
1. Người giữ `admin.manage` (Quản trị) gán hoặc gỡ được **mọi vai**, trừ vai sinh quyền Toàn quyền (hôm nay: **IT**). Cộng tay quyền Toàn quyền cũng chỉ Toàn quyền.
2. Hệ quả có chủ ý: Quản trị gán được Kế toán, Giám đốc, Điều hành chung, Hành chính nhân sự; và cộng tay Quản trị, Nhân sự, quyền tiền (cùng một luật, cùng một hàm).
3. **Không đổi:** Nhân sự (không giữ Quản trị) vẫn bị các chặn cũ; Quản trị vẫn không quản lý được tài khoản đang giữ Quản trị/Nhân sự/Toàn quyền (`canManageAccount`); đặt lại PIN và tắt bảo mật hai lớp của tài khoản có quyền tiền vẫn chỉ Toàn quyền (ADR-0090 Đ1 i, iv).
4. Giao diện (`web/role-picker.ts`) và máy chủ (`src/shared/roles.ts`) dùng chung một hàm; lời 403 cho việc còn bị chặn: «Chỉ người phụ trách hệ thống mới gán vai trò IT.» (không viết «Toàn quyền» ra cho Quản trị — ADR-0044: vai ẩn).

## Rủi ro đã nói với chủ
Kịch bản ADR-0090 (Quản trị đặt lại PIN một Bán hàng, đổi PIN, gán thêm Kế toán) nay đi được vì Đ1(ii) mở. Đ1(i) (PIN của tài khoản đã giữ tiền) vẫn chặn, nên chỉ còn đường qua tài khoản chưa giữ tiền. Chủ đã nghe và vẫn quyết (P18).
