# ADR-0071 — Vai "Hành chính nhân sự" nhập tài khoản; gỡ đồng bộ nhân viên từ Google Sheet; bảo trì miễn trừ theo Toàn quyền

- **Trạng thái:** **accepted** — chủ dự án duyệt trong chat 2026-10-01 ("4-ok"), kèm ba câu trả lời ở mục "Câu hỏi đã được chủ trả lời". Số 0071: đã soát mọi nhánh cục bộ, chưa ai dùng 0071 trở lên; đã báo phiên điều phối.
- **Ngày:** 2026-10-01   **Loại:** **một chiều một phần** — gỡ hẳn đồng bộ Sheet (mã bị xoá; dữ liệu giữ nguyên); thêm mã quyền + mã vai bằng migration (chỉ thêm).
- **Lời chủ dự án (chat 2026-10-01, AI ghi lại, không tự quyết):**
  - Câu gốc: *"hạn chế bớt quyền của Admin (không phải Super Admin): không cho phép gửi thông báo, không cho phép đọc Góp ý, báo lỗi, không được đổi những cấu hình quan trọng, tức không can thiệp về mặt kỹ thuật, chỉ cho quyền liên quan đến kinh doanh thôi"* — phần gửi thông báo, Góp ý, Nhật ký, bật/tắt bảo trì **đã có** trên `main` (ADR-0034 điều 7, ADR-0038, ADR-0019); ADR này chỉ lo phần còn hở.
  - Trả lời câu hỏi lượt 1: Nhật ký chỉ Toàn quyền (đã có); hỗ trợ đăng nhập (PIN, Face ID, mở khoá) Quản trị vẫn làm (giữ ADR-0042); danh mục & giá, địa điểm, Danh bạ Quản trị vẫn làm (giữ).
  - *"1- Dừng chức năng Đồng bộ nhân viên từ Google Sheet. Chỉ nhập được với vai Hành Chính Nhân Sự (Chưa có thì thêm vào) trong ứng dụng, 2- Đúng, chỉ Toàn quyền mới có quyền cấp quyền quản trị cho người khác (đồng thời rà soát lại các quyền với từng vai trò để đảm bảo không chồng chéo và thống nhất), 3- Trạng thái Bảo trì có thể ẩn với Super Admin (nhưng đổi lại việc đếm lùi giờ sang Ngày …)"*.
  - Trả lời câu hỏi lượt 2: HCNS nhập **mọi tài khoản** (kể cả đối tác) — Quản trị **không tạo tài khoản nào nữa**; HCNS **gán được vai thường, trừ vai quản lý**; HCNS **không xem đơn/giá/tiền**; đồng bộ Sheet **gỡ hẳn**.
  - Câu 3 được chủ làm rõ (lượt 3): *"Khi bật chế độ bảo trì, áp dụng cho tất cả mọi người, trừ Super Admin (toàn quyền), hiện thông báo với tất cả mọi người (trừ Super Admin)"*.
- **Liên quan / sửa:**
  - **ADR-0042** (accepted): lời chủ ở đó *"Admin (Quản trị tài khoản mức cơ bản: tạo, ngưng, đặt lại PIN, đặt quyền …)"* — ADR này **bỏ "tạo"** khỏi Quản trị. Ngưng, đặt lại PIN, mở khoá, gỡ Face ID, gán vai thường: **giữ**.
  - **ADR-0038 điều 6** (`staff.sheet.sync` chỉ Toàn quyền): **thay** bằng gỡ hẳn.
  - **ADR-0019** (chốt chặn `GET /api/maintenance` là `admin.manage`; bật/tắt = Toàn quyền **và** SĐT trong danh sách): **đổi** — GET và PUT chỉ hỏi `settings.ops`; danh sách SĐT không còn dùng.
  - **Quyết định chủ dự án về bảo trì** (`docs/HANDOFF-CHE-DO-BAO-TRI.md` §2: miễn trừ theo SĐT trong `allowed_phones`): **thay** bằng miễn trừ theo quyền Toàn quyền (điều 3).
  - **ADR-0018 điều 2–5, LC-4** (vai sinh quyền; chỉ Toàn quyền cấp/gỡ Quản trị, Toàn quyền, vai Giám đốc/Điều hành chung/IT): **giữ**, và áp thêm cho vai mới (điều 1d).
  - **ADR-0014 điều 8** (cấp bậc `canManageAccount`): **mở rộng** cho quyền HR (điều 1c).

## Quyết định

1. **Vai và quyền "Hành chính nhân sự"**
   - a. Mã quyền mới `HR`, nhãn **"Nhân sự"**; mã vai mới `HR_STAFF`, tên **"Hành chính nhân sự"**, nhóm **Nội bộ**, bộ quyền mặc định `["HR"]`, không nhận đơn (`handles: "never"`). Migration **chỉ thêm** một dòng `stf_permission_type` + một dòng `pty_role_type`.
   - b. Thao tác mới trong bảng quyền:
     | Thao tác | HR | ADMIN | SUPER_ADMIN | khác |
     |---|---|---|---|---|
     | `account.create` — tạo tài khoản (mọi loại: nội bộ, đối tác, tài xế đối tác) | any | **none** | any | none |
     | `account.view` — xem danh sách Quản lý tài khoản | any | any | any | none |
     | `account.edit` — sửa tên/SĐT, ngưng/mở lại, gán vai (vai thường) | any | any | any | none |
     `POST /api/staff` hỏi `account.create` (không còn `admin.manage`). Các route `GET /api/staff`, `PATCH /api/staff/:id`, `GET|PUT /api/staff/:id/roles`, `PUT /api/staff/:id/permissions` đổi chốt từ `admin.manage` sang `account.view`/`account.edit`; cổng router đổi từ `admin` sang một cổng mới gồm `ADMIN`, `SUPER_ADMIN`, `HR`.
   - c. **Cấp bậc** (`canManageAccount`): HR quản được tài khoản **không** giữ `ADMIN`, `SUPER_ADMIN`, `HR` — như Quản trị, và HCNS không sửa HCNS khác. Quản trị cũng không sửa được tài khoản HCNS.
   - d. **Ai gán vai HCNS:** chỉ Toàn quyền (`superAdminOnly: true`, như Giám đốc/Điều hành chung) — vì vai này tạo được mọi tài khoản. HCNS và Quản trị **không** cấp `ADMIN`/`SUPER_ADMIN`/`HR` (LC-4 mở rộng thêm `HR` vào `SUPER_ADMIN_GRANTED`).
   - e. HCNS **không** có: xem đơn/giá/tiền, Danh bạ khách/đại lý, danh mục, địa điểm, hỗ trợ đăng nhập (đặt lại PIN, gỡ Face ID, mở khoá — vẫn Quản trị + Toàn quyền, ADR-0042), Nhật ký, Góp ý của người khác, cài đặt. Cần thêm việc nào thì gán thêm vai khác cho cùng người.
   - f. **PIN đầu tiên** khi HCNS tạo tài khoản: như Quản trị hiện nay (máy chủ sinh, hiện một lần cho người tạo).
2. **Gỡ hẳn đồng bộ nhân viên từ Google Sheet**
   - Xoá route `GET /api/staff/sheet`, `POST /api/staff/sheet/apply`, phần giao diện, mã đọc Sheet nhân viên, ô `staff.sheet.sync`, biến `STAFF_SHEET_ID` trong `wrangler.jsonc`.
   - Dữ liệu tài khoản đã nạp trước đây **giữ nguyên** (không migration xoá). Nhật ký cũ có dòng đồng bộ vẫn đọc được.
   - Đồng bộ **danh mục dịch vụ** từ Sheet (`SERVICES_SHEET_ID`) **không** đổi.
3. **Bảo trì: miễn trừ theo quyền Toàn quyền, không theo số điện thoại**
   - a. Khi bật: **mọi tài khoản không giữ `SUPER_ADMIN`** bị chặn (đăng nhập và mọi route cần đăng nhập, kể cả phiên đang mở) và thấy thông báo + đồng hồ; tài khoản giữ `SUPER_ADMIN` dùng bình thường, **không** thấy màn hình chặn.
   - b. Ở `POST /api/auth/login` (chặn TRƯỚC khi kiểm PIN, như hiện nay): tra tài khoản theo SĐT; không phải Toàn quyền đang hoạt động — kể cả SĐT không có tài khoản — nhận **cùng một** phản hồi 503 (không lộ ai có tài khoản). Banner trang đăng nhập (`GET /api/auth/config`) giữ nguyên.
   - c. `GET` và `PUT /api/maintenance` chỉ hỏi `settings.ops` (Toàn quyền); bỏ điều kiện SĐT trong danh sách. Mục "Chế độ bảo trì" ở trang Của tôi hiện theo `can(settings.ops)` — Quản trị không thấy mục này và không gọi route (không có lỗi 403 lộ ra màn hình).
   - d. Cột `mnt_setting.allowed_phones` **thôi được đọc** (giữ cột, không migration xoá — expand–contract; bỏ ở lần sau nếu chủ muốn). Luật chặn đổi SĐT của chủ (`phoneChangeProblem`) bỏ theo, vì không còn gắn với SĐT.
   - e. Dải nhắc "Đang ở chế độ bảo trì" cho Toàn quyền **giữ** (để chủ biết chế độ đang bật — giả định bề mặt, đảo ngược được).
   - f. Kèm (bề mặt, đã làm ở commit riêng): đồng hồ đếm lùi từ 1 ngày trở lên hiện "3 ngày 5 giờ 10 phút".
   - g. Rủi ro đã cân: chủ bị khoá ngoài khi bảo trì chỉ xảy ra nếu tài khoản chủ mất `SUPER_ADMIN`/bị ngưng — khi đó tắt bằng SQL như `docs/HANDOFF-N1.md` đã ghi; tự tắt khi hết giờ (đã có) vẫn giữ.
4. **Ghi nhận, không đổi:** chỉ Toàn quyền cấp quyền Quản trị (LC-4, đã có — chủ xác nhận 2026-10-01).

## Trang ghép (CLAUDE.md §9)

1. **Bảng chạm tới:**
   - `stf_permission_type`: thêm loại `HR` (ngoài 9 loại đang có). `pty_role_type`: thêm vai `HR_STAFF` (nhóm INTERNAL).
   - `stf_permission`: nay chứa thêm dòng quyền `HR`; các ràng buộc/trigger đang có: `HR` là quyền **nội bộ** → luật LC-1 (tài khoản có vai bên ngoài chỉ giữ quyền bên ngoài) gạt `HR` khỏi tài khoản đối tác như mọi quyền nội bộ khác. Chốt "còn ít nhất một quản trị viên" đếm `ADMIN` — **không** đếm `HR`.
   - `staff`, `pty_party`: HCNS tạo dòng mới qua cùng luồng tạo tài khoản hiện có (không đổi bảng).
   - `mnt_setting`: cột `allowed_phones` thôi được đọc; người đọc/ghi = Toàn quyền.
2. **Dòng bản đồ quyền chạm tới:** `account.create`, `account.view`, `account.edit` (mới); `admin.manage` (bỏ khỏi các route tài khoản, còn lo danh mục/địa điểm/vai Danh bạ); `staff.sheet.sync` (xoá); `settings.ops` (thêm route GET bảo trì); `account.access.manage` (giữ, HR none).
3. **Cổng canh cửa:**
   - Route tài khoản: cổng router mới (ADMIN/SUPER_ADMIN/HR) → `can(account.*)` → `mayManage` (cấp bậc) → luật vai (`superAdminOnly`, LC-4).
   - Route đăng nhập cấp dưới: giữ cổng `admin` + `admin.manage` + `account.access.manage` + `mayManage` (HR không qua cổng `admin`).
   - `GET|PUT /api/maintenance`: cổng `admin` + `settings.ops`. Chặn bảo trì: router (theo quyền của phiên) + đăng nhập (tra quyền theo SĐT trước PIN).
   - Giao diện: menu "Quản lý tài khoản" hiện theo `can(account.view)`, không theo `hasPermission("ADMIN")`.

## Hệ quả

- Người tạo tài khoản mới phải được Toàn quyền gán vai HCNS trước. Đến lúc đó **chỉ Toàn quyền** tạo được tài khoản — cần có ít nhất một người HCNS ngay khi phát hành.
- Quản trị mất nút "Thêm tài khoản" và nút "Nạp từ Sheet"; vẫn sửa/ngưng/gán vai thường/hỗ trợ đăng nhập cho cấp dưới.
- Kiểm (đỏ trước, xanh sau): bảng quyền khoá giá trị ba ô mới; kiểm route: Quản trị `POST /api/staff` → 403, HCNS → 201, HCNS gán vai Giám đốc/HCNS/Quản trị → 403, HCNS gọi `GET /api/orders` → 403, HCNS đặt lại PIN → 403, Quản trị `GET /api/maintenance` → 403, `/api/staff/sheet` → 404; bảo trì bật: Quản trị đăng nhập/gọi API → 503, Toàn quyền → 200, SĐT lạ và SĐT Quản trị cùng thân 503; e2e `admin`. Thêm dòng hàng rào vào `docs/SO-HANG-RAO.md` sau khi quan sát chặn thật.

## Câu hỏi đã được chủ trả lời (2026-10-01)

1. Bảo trì: xem điều 3 (lời chủ lượt 3).
2. HCNS **không** làm hỗ trợ đăng nhập (đặt lại PIN, mở khoá, gỡ Face ID) — "theo đề xuất".
3. Quản trị **giữ** sửa/ngưng tài khoản và gán vai thường; chỉ bỏ "tạo" — "đồng ý".
