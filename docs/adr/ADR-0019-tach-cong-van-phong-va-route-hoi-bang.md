# ADR-0019 — Tách cổng "văn phòng" khỏi ô `order.view`; mọi route sau cổng hỏi bảng quyền ngay trong thân xử lý

- **Trạng thái:** **proposed** — AI soạn 2026-09-25 theo quyết định Q3 của chủ dự án (2026-09-24: "tách cổng `office` là điều kiện tiên quyết của ADR-0017 và mô hình 11 vai") và kế hoạch hàng rào quyền (`docs/superpowers/plans/2026-09-24-hang-rao-quyen-va-va-lo-hong-ho-so.md` §2 "GĐ2"). AI **không tự duyệt** (N3, Điều 7.2). Sau khi accepted chỉ sửa dòng trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-25   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa hai chiều.** Chỉ đổi mã (`src/shared/permissions.ts`, `src/shared/router.ts`, thân xử lý của route) và test; không migration, không đổi dữ liệu, không mở thêm quyền cho ai — chỉ **siết** (một route từ chối sớm hơn hoặc cùng lúc, không bao giờ cho qua điều hôm nay bị chặn). Gỡ được bằng một commit.
- **Liên quan:**
  - **Làm rõ ADR-0007 điều 4** (nơi thi hành "của mình / được giao"): cổng của router chỉ là **lọc thô**; ô của `MATRIX` phải được hỏi **trong thân xử lý** của route.
  - **Thi hành** ADR-0014 điều 2 (Toàn quyền = `any` mọi thao tác) và điều 8 (`admin.manage` + luật cấp bậc `canManageAccount`) bằng lời gọi `can()` thật, thay cho kiểm thô `hasPermission(ADMIN|SUPER_ADMIN)` và kiểm tay `permissions.includes("SUPER_ADMIN")`.
  - **Thi hành một phần** ADR-0018 điều 6: bỏ ô `dispatch.request`; dùng ô `settings.ops` (đặc tả mô hình vai §5, đã duyệt) cho chế độ bảo trì.
  - **Tiền đề của** ADR-0017 (accepted 2026-09-24) và ADR-0020 (proposed cùng lượt): ADR-0017 chỉ được thi công **sau** khi ADR-0019 đã lên production.
  - **Lệch có chủ ý so với đặc tả mô hình vai** (đã duyệt 2026-09-24) §5 ghi chú 3 và §19: *"Với ADR-0017, `FIELD` trở thành 'văn phòng'"*, *"`isOffice` tự đúng cho `FIELD`"*. Q3 của chủ (cùng ngày, sau đặc tả) thay **cơ chế** đó; **kết quả nhìn thấy** mà ADR-0017 hứa (Trang chủ, Đơn hàng, bấm "Nhận") giữ nguyên — xem điều 3.
  - Tên gọi cũ: `docs/quyen-hoan.json` và kế hoạch hàng rào gọi quyết định này là "GĐ2 ADR-0018" (viết trước khi số 0018 được dùng cho mô hình vai). Nay là **ADR-0019**.

## Bối cảnh

Router có năm mức cửa (`public`, `staff`, `office`, `orders`, `admin`). Hai sự thật đã được chứng minh ngày 2026-09-24:

1. **Cổng `office` suy ra từ một ô của bảng**: `isOffice(who) = can(who, "order.view")`. Ô đó nói "ai xem được mọi đơn", nhưng cổng lại canh cả **Hồ sơ** (`/api/parties*`), **danh mục giá**, **danh sách người được giao**. Ai đổi ô `order.view` của một mã quyền là **lặng lẽ mở luôn** mọi cửa đó. ADR-0017 đổi đúng ô này cho hướng dẫn viên (`FIELD` = `any`) — thí nghiệm `docs/evidence/2026-09-24-lo-hong-ho-so/kich-ban/lo-hong.mjs` cho thấy hướng dẫn viên khi đó qua được cổng vào Hồ sơ (lỗ L2).
2. **Nhiều route chỉ dựa vào cổng thô**, không hỏi bảng: hàng rào 1 (`src/permission-enforcement.test.ts`) đếm được các ô `admin.manage`, `admin.manage.superadmin`, `money.view`, `contact.view` không có nơi nào hỏi; hàng rào 2 (`src/route-write-guard.test.ts`) đếm được 14 đường ghi chỉ dựa cổng. Tất cả nằm trong `docs/quyen-hoan.json` với **hạn thật 2026-10-15** (chủ xác nhận 2026-09-24, Q4) — quá hạn thì `npm test` đỏ.

Bài học 24/9: bảng quyền được test khoá **giá trị**, nên ai cũng tưởng bảng **đang được thi hành**; thực tế 13/25 ô không được máy chủ hỏi.

## Quyết định

**1. Cổng của router là danh sách mã quyền khai tường minh, không suy ra từ ô nào.** Trong `src/shared/permissions.ts` (một nơi, P6):

| Cổng | Mã quyền qua cổng | Cửa nó canh (sau ADR-0019) |
|---|---|---|
| `admin` | `ADMIN`, `SUPER_ADMIN` | tài khoản, quyền, vai tài khoản, danh mục (quản trị), địa điểm (ghi), nhật ký hệ thống, hàng đợi Góp ý, chế độ bảo trì, vai/quan hệ của hồ sơ |
| `office` (văn phòng) | `SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN` | Hồ sơ (`/api/parties*` trừ vai/quan hệ), danh mục cho form lập đơn (`GET /api/catalog`), danh sách người có thể được giao (`GET /api/dispatch/assignees`) |
| `orders` (màn đơn) | `SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN`, `PARTNER`, `INTERN` — và `FIELD` **chỉ khi** ADR-0017 được thi công (điều 3) | `/api/orders*`, Trang chủ (`GET /api/orders/dashboard`), người phụ trách của đơn (`GET /api/dispatch/handlers`, `PUT /api/orders/:id/handler`) |
| `staff` | mọi tài khoản đang hoạt động | việc tự phục vụ của chính người gọi (điều 4) |
| `public` | không cần đăng nhập | đăng nhập, cấu hình trang đăng nhập, thông tin công ty |

Một bài kiểm **khoá** ba danh sách (đổi danh sách = sửa test trong cùng commit, người rà thấy ngay) và **đối chiếu** chúng với bảng: mọi mã trong `orders` phải có `order.view` khác `none` (route danh sách đơn dựa vào điều này để "không ngữ cảnh ⇒ không lọc" chỉ đúng với người xem mọi đơn); mọi mã trong `office` phải có `party.view = any`. Hai đối chiếu này là **lưới báo lệch**, không phải định nghĩa: đổi một ô của bảng **không** tự mở cổng nào nữa.

**2. Cổng chỉ lọc thô; mọi route sau cổng `office`, `orders`, `admin` — đọc lẫn ghi — hỏi ô của `MATRIX` bằng `can()` ngay trong thân xử lý, và dùng kết quả để từ chối.** Cụ thể:

| Nhóm route | Ô được hỏi |
|---|---|
| Quản trị không gắn một tài khoản mục tiêu (danh mục, địa điểm ghi, nhật ký hệ thống, đọc danh sách/Sheet nhân viên, áp Sheet) | `can(staff, "admin.manage")` |
| Quản trị trên **một tài khoản** (sửa, ngưng, quyền, vai, đặt lại PIN, gỡ Face ID, mở khoá) | `can(staff, "admin.manage")` **và** luật cấp bậc hiện có (`mayManage` → `canManageAccount`, ADR-0014 điều 8) |
| Cấp/gỡ quyền Quản trị, Toàn quyền (tạo tài khoản, đổi quyền, đổi vai) | `can(staff, "admin.manage.superadmin")` thay cho kiểm tay `includes("SUPER_ADMIN")` (luật LC-4 của ADR-0018 giữ nguyên nội dung) |
| Vai/quan hệ của hồ sơ (`/api/parties/:id/roles*`, `…/relationships*`) | `can(staff, "admin.manage")` (phạm vi luật cấp bậc ở đây: xem câu hỏi Q11 của kế hoạch — chủ quyết trước khi duyệt ADR này) |
| Hàng đợi Góp ý (`GET /api/feedback`, `PATCH /api/feedback/:id`) | `can(staff, "feedback.triage")` |
| Chế độ bảo trì (`GET`/`PUT /api/maintenance`) | `can(staff, "settings.ops")` (ô mới, chỉ Toàn quyền — đúng đặc tả mô hình vai §5), **cộng** kiểm SĐT được phép như hôm nay (hai điều kiện cùng đúng): `PUT` thiếu một trong hai → 403; `GET` vẫn trả trạng thái cho quản trị, cờ "được bật/tắt" = hai điều kiện cùng đúng |
| Nơi trả **tiền** (danh sách đơn, chi tiết đơn, Trang chủ, danh mục giá) | `can(staff, "money.view", phạm vi của đơn)` |
| Nơi trả **liên hệ khách** (danh sách đơn, chi tiết đơn, "Việc của tôi") | `can(staff, "contact.view", phạm vi của đơn)` |
| Trang chủ, người phụ trách của các đơn | `can(staff, "order.view")` (không ngữ cảnh = xem được mọi đơn) |
| Danh sách người có thể được giao | `can(staff, "dispatch.assign", { ownerId: staff.id })` (giao được ít nhất đơn của mình) |

Khi một lời gọi `can()` trả sai, route trả **403** — không cắt bớt trường. Hôm nay dòng `money.view` và dòng `order.view` có phạm vi **giống hệt nhau** ở mọi cột (cả trong bảng đích của đặc tả mô hình vai), còn `contact.view` rộng hơn hoặc bằng; một bài kiểm khoá điều đó. Ai muốn làm hai dòng khác nhau (ví dụ "thấy đơn nhưng không thấy tiền") phải đồng thời làm phần **bỏ trường tiền/liên hệ** khỏi phản hồi — bài kiểm sẽ đỏ để nhắc.

**3. Hệ quả cho hướng dẫn viên khi ADR-0017 được thi công** (không phải quyết định mới — chỉ cách ADR-0017 được hiện thực hoá dưới cơ chế mới): `FIELD` được thêm vào cổng `orders` (không phải `office`). Nhờ ba route ở điều 1 đã chuyển sang cổng `orders`, hướng dẫn viên có đủ những gì ADR-0017 hứa: Trang chủ, trang Đơn hàng, chi tiết đơn, thấy người phụ trách. Hướng dẫn viên **không** qua cổng `office` ⇒ **không** vào Hồ sơ, danh mục giá cho form lập đơn, danh sách người được giao — kể cả khi ô `order.view` của họ là `any`.

**4. Tự phục vụ là ngoại lệ vĩnh viễn, không thêm ô `account.self`.** Các route `/api/account/*` (đổi PIN, Face ID của chính mình) và các route đọc của chính mình ở cổng `staff` (`/api/auth/me`, `/api/feedback/mine`, `/api/dispatch/mine`…) tự khoanh phạm vi bằng **danh tính trong phiên**; một ô "`any` cho mọi mã quyền" chỉ là nghi thức, không chặn được gì thêm. Bảy route ghi `/api/account/*` giữ mục `"loai": "ngoại lệ"` trong `docs/quyen-hoan.json` (không hạn); hàng rào 2 đã chỉ cho phép loại này ở cổng `staff` + đường dẫn `/api/account/*`.

**5. Ô không có nghiệp vụ.** Bỏ `dispatch.request` khỏi `MATRIX` (ADR-0018 điều 6 đã quyết). `task.progress` và `dispatch.guides.view` có mặt trong bảng đích đã duyệt của mô hình vai (sẽ có route ở giai đoạn 5 của mô hình vai) — cách xử lý chờ chủ trả lời Q10 của kế hoạch. `payment.*`, `invoice.*` giữ hoãn tới đợt thu tiền N3 (hạn 2026-12-31).

**6. Hàng rào được siết thêm, không nới.** Hàng rào 2 mở rộng từ "mọi đường **ghi**" sang "mọi route (đọc lẫn ghi) sau cổng `office`, `orders`, `admin`"; danh sách hàm được công nhận (`GUARDS`) **không** thêm tên. Mỗi cơ chế mới có dòng trong `docs/SO-HANG-RAO.md` với ngày quan sát chặn thật (P16).

## Lý do

- Cổng suy từ một ô là **khớp nối ẩn**: người sửa bảng quyền không thấy mình đang mở cửa Hồ sơ. Danh sách tường minh đặt quyết định "ai qua cửa nào" ở chỗ người rà nhìn thấy, và test khoá nó.
- Hỏi bảng trong thân xử lý là cách duy nhất để một ô của bảng **có tác dụng**; cổng thô chỉ biết "có quyền X hay không", không biết "đơn này của ai", "tài khoản này cấp nào".
- Chuyển ba route hướng dẫn viên cần sang cổng `orders` thay vì cho hướng dẫn viên vào `office`: giữ nguyên lời hứa của ADR-0017 mà không mở Hồ sơ, danh mục giá, danh sách nhân viên.
- Làm trước ADR-0017: ADR-0017 là **cửa một chiều** (đã xem thì không thu lại). Mở nó khi cơ chế còn khớp nối ẩn là mở thêm những gì chưa ai định mở.

## Phương án bị loại

- **Giữ cổng suy từ `order.view`, chỉ thêm `can(party.view)` trong route Hồ sơ.** Hồ sơ đã được vá như vậy ở GĐ1 (ADR-0013), nên riêng Hồ sơ thì hướng dẫn viên vẫn bị chặn ở thân xử lý; nhưng danh mục giá và danh sách nhân viên vẫn mở theo ô `order.view`, và khớp nối ẩn còn nguyên cho lần đổi bảng sau.
- **Cho `FIELD` vào `office` như đặc tả mô hình vai §19 viết.** Mở cho hướng dẫn viên ba cửa mà ADR-0017 không nhắc tới (Hồ sơ đi qua được tới thân xử lý, danh mục giá, danh sách nhân viên) — Q3 của chủ đã bác cơ chế này.
- **Cổng khai theo ô (`access: { op: "party.view" }`), bỏ tên cổng.** Gọn hơn về lý thuyết, nhưng đổi chữ ký của mọi route (71 lời gọi `route(` hôm nay), đổi `src/route-access.test.ts` toàn bộ và vẫn phải hỏi lại trong thân xử lý vì cổng không biết đơn/tài khoản mục tiêu. Chi phí lớn, lợi ích không hơn danh sách tường minh + `can()` trong thân.
- **Thêm ô `account.self` (`any` cho mọi mã).** Không chặn thêm được gì (xem điều 4); chỉ làm bảng dài thêm và tạo cảm giác "đã thi hành" giả.
- **Khi `money.view` sai thì cắt trường tiền thay vì 403.** Hôm nay không có mã quyền nào "xem đơn mà không xem tiền", nên phần cắt trường là mã chết không test được; để dành cho ngày có nghiệp vụ thật (bài kiểm hai dòng bằng nhau sẽ nhắc).

## Hệ quả

- **`src/shared/permissions.ts`** (tệp "việc lớn" — bắt buộc người kiểm độc lập): thêm ba hằng danh sách cổng; `isOffice` đọc danh sách `office`; thêm hàm `seesAllOrders(who) = can(who, "order.view")` cho giao diện (Trang chủ, mục "Đơn hàng"); ô mới `settings.ops`; bỏ ô `dispatch.request`.
- **`src/shared/router.ts`:** ba cổng đọc ba danh sách; lời báo 403 của cổng không đổi.
- **Thân xử lý** của khoảng 30 route thêm một lời gọi `can()` (danh sách đủ ở kế hoạch thi công). Mức cửa của **ba** route đổi `office` → `orders` (`GET /api/orders/dashboard`, `GET /api/dispatch/handlers`, `PUT /api/orders/:id/handler`) — `src/route-access.test.ts` sửa ảnh chụp trong cùng commit. Với tài khoản Đối tác/Thực tập, ba route này nay trả 403 **ở thân xử lý** thay vì ở cổng (cùng mã 403, lời báo khác).
- **Giao diện:** `web/shell.ts` và `src/shared/start-page.ts` tách hai câu hỏi đang dùng chung `isOffice`: "vào Hồ sơ được không" (`isOffice`) và "thấy Trang chủ / mọi đơn không" (`seesAllOrders`). Trước ADR-0017 hai câu trả lời giống hệt nhau cho mọi tài khoản hiện có ⇒ không ai thấy menu đổi.
- **`docs/quyen-hoan.json` sau ADR-0019:** `thao_tac` chỉ còn bốn mục N3 (`payment.receive`, `payment.refund`, `invoice.request`, `invoice.issue`, hạn 2026-12-31) — cộng `task.progress`, `dispatch.guides.view` (hạn 2026-11-30) **nếu** chủ chọn giữ ở Q10; `cua_ghi` chỉ còn bảy mục "ngoại lệ" tự phục vụ `/api/account/*`. Mọi mục hạn **2026-10-15** và mục `PUT /api/maintenance` (hạn 2026-11-30) được gỡ — hàng rào tự đòi gỡ ("hoãn thừa") khi route đã hỏi bảng.
- **Tiền điều kiện vận hành:** trước khi phát hành, chủ xác nhận tài khoản của mình giữ quyền **Toàn quyền** (truy vấn chỉ đọc ở kế hoạch) — nếu không, chủ sẽ mất nút bật/tắt bảo trì.
- **Nợ đã thấy, không sửa ở đây (chưa kiểm trên trình duyệt):** form lập đơn gọi `GET /api/catalog` (cổng `office`), nên tài khoản Đối tác và Thực tập lập đơn có thể không nạp được danh mục. ADR-0019 **không** nới cổng đó; để giai đoạn đối tác của mô hình vai quyết.
- Không migration. Không đổi quyền của tài khoản nào. Phát hành trước **2026-10-15**.
