# Nguyên nhân gốc: vì sao có trang hỏi "có phải Quản trị không" thay vì hỏi bảng quyền — 2026-10-01

Chủ dự án yêu cầu (2026-10-01): *"truy tìm nguyên nhân gốc, vì sao có trang lại hỏi có phải quản trị không? trong khi trang khác không hỏi vậy, lỗi gốc nằm ở đâu? khắc phục thế nào"*. Số liệu đọc trên `main` fd77987a.

## 1. Triệu chứng

Giao diện có hai cách hỏi quyền:
- **Hỏi bảng quyền:** `can(staff, "<thao tác>")`. Máy chủ cũng hỏi đúng bảng này.
- **Hỏi thẳng mã quyền:** `hasPermission(staff, "<MÃ>")`.

Có 9 chỗ dùng cách hỏi thẳng mã để quyết "được làm việc X không":

| Chỗ | Đang hỏi | Nên hỏi |
|---|---|---|
| `web/shell.ts:476` (cờ `admin` → các mục Dịch vụ & giá, Quản lý tài khoản, Địa điểm) | `"ADMIN"` | `can(admin.manage)` |
| `web/shell.ts:490` (Gửi thông báo, Nhật ký) | `"SUPER_ADMIN"` | `can(notice.send)`, `can(audit.view)` |
| `web/account.ts:46` (Địa điểm) | `"ADMIN"` | `can(admin.manage)` |
| `web/account.ts:53` (Gửi thông báo) | `"SUPER_ADMIN"` | `can(notice.send)` |
| `web/account.ts:530` (công tắc bảo trì) | `"ADMIN"` | `can(settings.ops)` — ADR-0071 |
| `web/catalog.ts:570` | `"ADMIN"` | `can(admin.manage)` |
| `web/locations.ts:142` | `"ADMIN"` | `can(admin.manage)` |
| `web/staff.ts:438` (`meSuper`) | `"SUPER_ADMIN"` | `can(admin.manage.superadmin)` |
| `web/help.ts:59` | `"ADMIN"` hoặc `"SUPER_ADMIN"` | `can(admin.manage)` |
| `src/shared/dashboard-review.ts:44` (`canSeeReviewAlerts`, Trang chủ) | `"ADMIN"` hoặc `"SUPER_ADMIN"` | `can(admin.manage)` |

Các chỗ hỏi mã để biết **"người này là ai"** vẫn hợp lệ, vì đó không phải câu hỏi "được làm gì":
- `web/account.ts:545` (FIELD → "Việc của tôi");
- `src/shared/start-page.ts` (DRIVER);
- `src/shared/thong-bao.ts` (nhóm nhận theo quyền);
- `src/shared/bang-tin.ts:122`;
- `src/shared/assignee-pick.ts` (nhãn).

Cấp bậc tài khoản (`src/modules/staff/rules.ts`) và luật "còn ít nhất một quản trị viên" nằm ngoài bảng quyền **có chủ ý** (ADR-0014 điều 8).

Hôm nay **chưa ai bị ảnh hưởng**, vì mọi tài khoản giữ Toàn quyền đều kèm Quản trị.

## 2. Dòng thời gian

1. **2026-09-20** (`f4901ae3`, N1 B2): giao diện bỏ cột `staff.role`, chuyển sang `hasPermission(staff, "ADMIN")`. Lúc đó đúng: ADR-0007 điều 1 nói Quản trị làm được mọi thao tác, nên hỏi mã ADMIN cũng là hỏi bảng quyền.
2. **2026-09-22** (`a53cbb57`, ADR-0014): thêm `SUPER_ADMIN` = `any` ở mọi thao tác, không thay ADMIN. Bảng quyền và cổng máy chủ được sửa (`router.ts:171`); **các trang thì không ai rà lại**.
3. **2026-09-24** (ADR-0018 điều 4): vai Giám đốc được cho **kèm Quản trị** để chốt "còn ít nhất một quản trị viên" đếm đúng. Mẹo này cũng làm mọi tài khoản Toàn quyền đều có ADMIN, nên lỗi ở giao diện **bị che** và không bao giờ lộ ra.
4. **2026-09-24 trở đi:** trang mới viết bằng `can()` (`4684dc20`, `a8007461`…); trang cũ giữ nguyên. Từ đó giao diện lẫn hai kiểu.
5. **2026-09-26** (ADR-0019): rà toàn bộ cổng **máy chủ** và dựng hàng rào 2, hàng rào cổng quản trị; giao diện không thuộc phạm vi.
6. **2026-09-28** (ADR-0038, `d8165e3a`): tách việc kỹ thuật khỏi Quản trị. Trang Gửi thông báo, Nhật ký được thêm bằng `hasPermission("SUPER_ADMIN")`. Trang chủ được **vá từng chỗ**: lớp trong hỏi `can(feedback.triage)`, lớp ngoài vẫn hỏi `ADMIN`/`SUPER_ADMIN` (`web/home.ts:218-221`).

## 3. Nguyên nhân gốc (ba tầng)

1. **Thiết kế: hai câu hỏi khác nghĩa dùng chung một cửa, không phân biệt.**
   - `src/shared/permissions.ts` công khai cả `hasPermission` (hỏi danh tính: "giữ mã X không") lẫn `can` (hỏi bảng quyền: "được làm việc Y không").
   - Không có gì đánh dấu hàm nào dùng cho câu hỏi nào.
   - `web/CLAUDE.md:17` chỉ ghi "Giao diện chỉ ẩn/hiện theo quyền", không nói ẩn/hiện phải hỏi bảng quyền.
   - Luật "bản đồ quyền chỉ ở một nơi, hỏi bằng `can()`" chỉ được viết cho máy chủ (`src/CLAUDE.md:21`).
2. **Hàng rào: mọi hàng rào quyền cố ý bỏ qua giao diện.**
   - `docs/SO-HANG-RAO.md` hàng rào 1 ghi nguyên văn: *"Không đếm lời gọi ở `web/` (ẩn/hiện giao diện không phải thi hành)"*. Hàng rào 2 và hàng rào cổng quản trị chỉ đọc `src/modules/*/index.ts`.
   - Lý lẽ đó đúng **về an ninh**: máy chủ luôn kiểm lại. Nhưng nó bỏ trống **tính thống nhất**: không máy nào kiểm giao diện có đọc cùng bảng với máy chủ không.
   - Kịch bản Chrome chỉ chạy bằng tài khoản giữ cả ADMIN lẫn SUPER_ADMIN, nên cũng không thấy.
3. **Quy trình: mỗi lần nghĩa của một quyền đổi, chỉ máy chủ được rà.**
   - ADR-0014, ADR-0019, ADR-0038 đều đổi nghĩa ADMIN/SUPER_ADMIN.
   - "Trang ghép" (CLAUDE.md §9) mục 3 hỏi "cổng nào canh cửa nào", nhưng thực tế chỉ liệt kê route máy chủ, không liệt kê chỗ giao diện ẩn/hiện.
   - Mẹo "Giám đốc kèm Quản trị" (ADR-0018 điều 4) che lỗi, nên không ai có lý do rà lại.

**Vì sao giờ phải sửa:** ADR-0071 thêm quyền `HR` đứng riêng, **không** kèm ADMIN. Đây là tài khoản đầu tiên vào trang quản trị mà không có ADMIN, nên cùng loại lỗi này sẽ lộ ra ngay nếu không sửa gốc.

## 4. Khắc phục

1. **Sửa mã** (đã nằm trong ADR-0072 mục 4a, phần `account.ts:530` trong ADR-0071): đổi 10 chỗ ở bảng mục 1 sang `can(...)`.
2. **Hàng rào mới — chỉ siết, AI được tự dựng (CLAUDE.md §3, Điều 9.4):**
   - Bài kiểm `src/giao-dien-hoi-bang-quyen.test.ts` quét `web/**/*.ts` và các tệp `src/shared/*` mà `web/` import.
   - Bài kiểm **đỏ** khi gặp `hasPermission(…, "<MÃ>")` với mã thuộc nhóm quyền **văn phòng/quản trị**: `ADMIN`, `SUPER_ADMIN`, `HR`, `SALES`, `ACCOUNTING`, `INTERN`.
   - Ngoại lệ là danh sách trắng, mỗi dòng có lý do, chỉ cho câu hỏi danh tính (FIELD, DRIVER, DRIVER_PARTNER, PARTNER ở các chỗ mục 1 đã liệt kê).
   - Quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên. Rồi thêm dòng vào `docs/SO-HANG-RAO.md`.
3. **Kiểm bằng tài khoản không kèm Quản trị:** e2e/kịch bản Chrome có một tài khoản **chỉ Toàn quyền** và một tài khoản **chỉ HCNS** (ADR-0071), đếm mục menu và vào từng trang quản trị.
4. **Đề xuất sửa luật — chờ chủ duyệt (N9, AI không tự sửa):**
   - a. `web/CLAUDE.md` thêm một dòng: *"Ẩn/hiện theo `can(staff, "<thao tác>")` — cùng bảng với máy chủ. `hasPermission` chỉ để hỏi danh tính ("người này là hướng dẫn viên/tài xế/đối tác"), không để hỏi "được làm gì"; bài `src/giao-dien-hoi-bang-quyen.test.ts` ép."*
   - b. Mục 3 của "Trang ghép" (CLAUDE.md §9) ghi rõ: liệt kê cả **chỗ giao diện ẩn/hiện** theo quyền bị đổi nghĩa, không chỉ route máy chủ.
