# Rà soát quyền theo vai trò — 2026-10-01

Báo cáo của trợ lý chỉ-đọc, đọc trên `main` 0c4309cd. Chủ dự án yêu cầu ngày 2026-10-01: "rà soát lại các quyền với từng vai trò để đảm bảo không chồng chéo và thống nhất". **Đây chỉ là đề xuất, chưa phải quyết định.** Số dòng là số dòng trên `main` tại thời điểm rà.

## Phát hiện chính (đã sắp theo mức)

### Trung bình
- **B1/B3/B4 — giao diện hỏi "có quyền ADMIN không" thay vì hỏi bảng quyền.**
  - Chỗ: `web/shell.ts:476`, `web/locations.ts:142`, `web/catalog.ts:570`.
  - Hệ quả: tài khoản chỉ giữ Toàn quyền (không kèm Quản trị) mất menu Dịch vụ & giá, Quản lý tài khoản, Địa điểm, và bị chặn trang. Máy chủ vẫn cho phép.
  - Hôm nay chưa xảy ra: Giám đốc và IT đều kèm Quản trị.
  - Sửa: `can(staff, "admin.manage")`.
- **B5 — công tắc bảo trì.** `web/account.ts:530` hỏi `hasPermission("ADMIN")`, nên tài khoản chỉ có Toàn quyền không thấy công tắc. Hôm nay chưa xảy ra. Điều 3 của bản nháp ADR sửa luôn: đổi sang `can(staff, "settings.ops")`.
- **A1 — vai trùng nhau.** Giám đốc (`roles.ts:27`) và IT (`roles.ts:34`) giống hệt nhau về quyền. IT còn có thể nhận đơn thay (`handles: "substitute"`).
- **A5 — đường gán quyền thẳng.** Route cũ `PUT /api/staff/:id/permissions` (`accounts/index.ts:517`) gán mã quyền thẳng, bỏ qua mô hình vai. Vì vậy tạo được tài khoản lai: Đối tác kèm quyền nội bộ. Chính mã nguồn đã thừa nhận ở `permissions.ts:258-260`.
- **C3 — đồng bộ danh mục từ Sheet.** `POST /api/catalog/sync` cho Quản trị chạy. Hai chiều đều hợp lý: kéo giá là việc kinh doanh, nhưng đồng bộ từ Sheet là thao tác kỹ thuật. Chủ đã chốt "danh mục & giá Quản trị vẫn làm" → **giữ**.
- **C4 — phạm vi tài khoản của Quản trị.** Ô `admin.manage` gánh nhiều nghĩa. Bản nháp ADR (điều 1) đã tách: tạo tài khoản → HCNS.
- **3D — thao tác không có route nào dùng.** Bốn thao tác `task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue` chưa có route, nhưng kho của trợ lý AI vẫn mô tả chúng cho người dùng (`tro-ly-cau-truc-ten.ts:77-90`).

### Thấp
- **A2 — câu báo lỗi thiếu vai.** Câu báo lỗi LC-4 (`roles.ts:157`) liệt kê các vai chỉ Toàn quyền gán được nhưng thiếu IT.
- **A3 — năm vai bên ngoài cùng một bộ quyền.** Năm vai này đều sinh quyền Đối tác, chỉ khác nhãn.
- **A4 — hai tên dễ nhầm.** "Tài xế taxi" (lập đơn giới thiệu) và "Tài xế đối tác" (lái chuyến).
- **B2, B6, B7, B8 — các kiểm tay khác.** `web/account.ts:46`, `web/shell.ts:490`, `web/account.ts:53`, `web/staff.ts:380`, `web/help.ts:59`. Hôm nay tương đương máy chủ, nên chuyển về `can(...)`.
- **C1 — trạng thái bảo trì.** Quản trị đọc được trạng thái bảo trì. Bản nháp ADR, điều 3.
- **C5 — giấy tờ tuỳ thân.** Quản trị xem đủ số CCCD/GPLX (`party.document.reveal`). Cần chủ xác nhận lại.
- **C6 — cổng không đồng nhất.** Các route `settings.ops` dùng lẫn cổng router `office` và `admin`. Không hở vì thân route vẫn hỏi `can`.
- **C7 — các bước tiền.** Quản trị có bước bàn giao/xuất hoá đơn nhưng không có hoàn thành/hoàn tiền. Đây là chủ ý theo ADR-0025/0026/0060.
- **Luật "còn ít nhất một quản trị viên".** `staff/rules.ts:61` chỉ đếm ADMIN, không đếm Toàn quyền.

### Đã đúng
- Cả 47 route cổng `admin` đều gọi `can(...)` ngay đầu thân.
- Quản trị = `none` ở: gửi thông báo, xử lý Góp ý, Nhật ký, cài đặt vận hành, cấp Toàn quyền, đồng bộ nhân viên.
- Chỉ Toàn quyền cấp được quyền Quản trị (`roles.ts:127-131`, `155-165`).

## Bảng vai → quyền mặc định

| Vai | Quyền mặc định |
|---|---|
| Giám đốc, IT | ADMIN + SUPER_ADMIN |
| Điều hành chung | ADMIN |
| HDV nội bộ | FIELD |
| NV kinh doanh | SALES |
| Thực tập sinh | INTERN |
| Kế toán | ACCOUNTING |
| Tài xế công ty | DRIVER |
| Công ty lữ hành, HDV độc lập, Lễ tân KS, Tài xế taxi, Cộng tác viên | PARTNER |
| Tài xế đối tác | DRIVER_PARTNER |

Chi tiết từng ô bảng quyền theo mã quyền: xem `src/shared/permissions.ts` MATRIX.
