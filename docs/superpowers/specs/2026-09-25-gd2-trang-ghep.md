# Trang ghép — lượt duyệt GĐ2 (ADR-0019; thi công ADR-0017 đã accepted)

- **Ngày:** 2026-09-25 · **Người soạn:** AI (phiên lập kế hoạch GĐ2, nhánh `ke-hoach-gd2`) · **Trạng thái:** kèm lượt duyệt ADR-0019 — **chủ dự án đã duyệt ADR-0019 ngày 2026-09-25** (phiên chat).
- **Vì sao có trang này:** luật "bước ghép khi duyệt" (`CLAUDE.md` §9, chủ duyệt 2026-09-24): một lượt duyệt có ≥ 2 quyết định chạm quyền/dữ liệu phải kèm trang ghép; tối đa 3 quyết định mỗi lượt. Lượt này chỉ có 1 quyết định mới, nhưng vẫn kèm trang ghép vì cùng lượt thi công ADR-0017 — đổi ai đọc được bảng dùng chung `orders`.
- **Quyết định trong lượt:** **chỉ ADR-0019** (tách cổng văn phòng, route hỏi bảng — **accepted 2026-09-25**). **ADR-0017** đã accepted 2026-09-24 — **không tính** vào giới hạn 3 (không phải quyết định mới), nhưng **được ghép vào các bảng dưới** vì kế hoạch thi công nó ở Phần C và nó đổi ai đọc được `orders`. Câu trả lời Q10, Q11, Q13 của chủ (25/9) đã ghi **trong** ADR-0019 trước khi duyệt, không thêm quyết định. ⇒ lượt này = **1 quyết định** — **chủ đã duyệt ADR-0019 ngày 2026-09-25**.
- **Không thuộc lượt này:** **ADR-0020** (đơn mới chờ người bấm "Nhận") — **trình ở lượt duyệt sau, khi Phần B (ADR-0019) đã lên production**, theo luật "dừng dây chuyền" (`CLAUDE.md` §3): nó xây trên hai lỗ đang hở `money.view`, `contact.view`. Các dòng về ADR-0020 dưới đây (ký hiệu B3) chỉ để người duyệt thấy trước ảnh hưởng; sẽ được trình lại cùng ADR-0020.
- **Kế hoạch thi công:** `docs/superpowers/plans/2026-09-25-gd2-thi-cong.md`.

Ký hiệu: **B1** = bước ADR-0019 (Phần B của kế hoạch); **B2** = bước ADR-0017 + hướng dẫn viên bấm "Nhận" (Phần C, D — xây trên lỗ đang hở `money.view`, `contact.view`, vá ở Phần B); **B3** = bước ADR-0020 (Phần E, lượt duyệt sau). "Sau" = sau cả ba bước.

## (1) Các bảng/cửa bị chạm chứa những loại thực thể nào

| Bảng | Chứa | Lượt này thêm loại mới? |
|---|---|---|
| `orders` (+ `order_service`, `order_item`, `order_money_adjustment`) | đơn do **nhân viên nội bộ** lập (Bán hàng, Quản trị, Toàn quyền; Thực tập từ bản 1.8), đơn do **Đối tác** lập (bản 1.5+); mọi trạng thái nháp/đã xác nhận/đã huỷ | **Không** thêm loại. Đổi **người đọc**: hướng dẫn viên đọc được mọi đơn kể cả tiền (ADR-0017). |
| `dsp_assignment` (dòng `HANDLE` hạt đơn = người phụ trách) | người phụ trách hiện tại + lịch sử; người phụ trách là **hồ sơ nội bộ có tài khoản** (Bán hàng, Quản trị, Toàn quyền, Hướng dẫn viên) — không bao giờ Đối tác | **Không** thêm loại. Đổi **cách sinh dòng**: không còn dòng tự sinh lúc lập đơn (B3); hướng dẫn viên tự mở dòng cho mình bằng "Nhận" (B2). |
| `pty_party` (+ liên hệ, vai, quan hệ) | khách, nhân viên nội bộ, đối tác cá nhân, tổ chức (đại lý, công ty lữ hành), HDV/tài xế chưa có tài khoản | **Không.** Lượt này chỉ **siết** cửa vào (B1), không đổi ai được đọc/sửa. |
| `staff`, `stf_permission`, `stf_permission_adjustment` | tài khoản nội bộ và bên ngoài; quyền hiệu lực; chỉnh tay | **Không.** Route quản trị hỏi thêm `can(admin.manage)` / `can(admin.manage.superadmin)` (B1) — cùng kết quả hôm nay. |
| `mnt_setting` | một dòng cài đặt bảo trì | **Không.** Thêm điều kiện ô `settings.ops` (B1). |
| `fbk_*` (Góp ý) | yêu cầu, tin nhắn | **Không.** Hàng đợi hỏi `feedback.triage` (B1). |
| `catalog_item`, `catalog_override`, `catalog_sync` (danh mục) | dịch vụ và giá đồng bộ từ Sheet, ghi đè của quản trị | **Không.** Route quản trị hỏi `admin.manage`; `GET /api/catalog` (form lập đơn) hỏi `money.view` (B1). |
| `loc_location`, `loc_location_type` (địa điểm) | bến, điểm đón… | **Không.** Ghi hỏi `admin.manage` (B1); đọc giữ cổng `staff` cho mọi người. |
| `audit_log` (nhật ký hệ thống) | nhật ký chỉ-thêm của mọi module | **Không.** `GET /api/audit` hỏi `admin.manage` (B1). |

## (2) Dòng bản đồ quyền chạm các bảng này, áp cho loại nào (sau GĐ2)

Chỉ liệt kê dòng **đổi** hoặc **bắt đầu được hỏi** trong lượt này. Giá trị đầy đủ: `src/shared/permissions.ts` và đặc tả mô hình vai §5.

| Ô | Áp cho loại nào | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | Đổi ở |
|---|---|---|---|---|---|---|---|---|---|
| `order.view` | mọi đơn (nội bộ + Đối tác lập) | any | any | any | none → **any** | own | any | own | B2 (ADR-0017 điều 1) |
| `money.view` | tiền của mọi đơn + bảng giá | any | any | any | none → **any** | own | any | own | B2; **bắt đầu được hỏi** ở B1 |
| `order.history.view` | lịch sử sửa của đơn | ownOrAssigned | any | any | none → **any** | own | any | own | B2 (ADR-0017 điều 1, đặc tả §5 Q23) |
| `contact.view` | tên/SĐT khách, điểm đón | any | any | any | assigned → **any** | ownOrAssigned | any | own | B2; **bắt đầu được hỏi** ở B1 |
| `dispatch.claim` | đơn **chưa có người phụ trách**, nhận cho chính mình | any | none | any | none → **any** | none | any | none | B2 (đặc tả §5, Q9 của đặc tả) |
| `dispatch.assign` | đơn mình lập / đang phụ trách (SALES); mọi đơn (ADMIN) | ownOrAssigned | none | any | none | none | any | none | **không đổi** (FIELD giữ `none` tới giai đoạn 5 mô hình vai) |
| `order.modify`, `order.trip.edit`, `order.create` | đơn | không đổi | | | FIELD vẫn `none` (ADR-0017 điều 4) | | | | — |
| `order.money.edit`, `order.cancel` (cấp hẹp) | đơn đang phụ trách | không đổi | | | assigned | | | | — (hướng dẫn viên nay **tự nhận** được rồi dùng hai ô này) |
| `party.view`, `party.write`, `party.staff.write` | hồ sơ | không đổi | | | none | none | | none | — (cổng `office` nay **không** cho FIELD qua, dù `order.view` = any) |
| `admin.manage` | tài khoản, danh mục, địa điểm, nhật ký hệ thống, vai/quan hệ hồ sơ (`pty_party_role`, `pty_party_relationship`) | none | none | any (+ cấp bậc khi có tài khoản mục tiêu — **nay gồm cả vai/quan hệ của hồ sơ gắn tài khoản**, Q11) | none | none | any | none | **bắt đầu được hỏi** ở B1 |
| `admin.manage.superadmin` | cấp/gỡ Quản trị, Toàn quyền | none | none | none | none | none | any | none | **bắt đầu được hỏi** ở B1 |
| `feedback.triage` | hàng đợi Góp ý | none | none | any | none | none | any | none | **bắt đầu được hỏi** ở `PATCH`/`GET` hàng đợi (B1) |
| `settings.ops` (**mới**) | chế độ bảo trì (nay); thời hạn nhận, giờ làm việc (giai đoạn 5 mô hình vai) | none | none | none | none | none | any | none | B1 |
| `dispatch.request` | — | **bỏ khỏi bảng** | | | | | | | B1 (ADR-0018 điều 6) |

**Cố ý hẹp hơn ADR-0017:** `money.view` của `FIELD` = `any`, nhưng cổng `office` vẫn chặn `GET /api/catalog` (bảng giá cho form lập đơn) — hướng dẫn viên không lập đơn (ADR-0017 điều 4); giá từng dịch vụ trên đơn vẫn thấy.

**Điểm dễ trượt nhất (ADR-0017 "Hệ quả"):** mở `order.view`/`contact.view` cho `FIELD` **không** được đổi một ô nào của `PARTNER` — một bài kiểm ghim "FIELD thấy đơn người khác; PARTNER vẫn không" (B2).

## (3) Cổng nào canh cửa nào (sau GĐ2)

| Cửa | Cổng 1 (router — danh sách mã tường minh, ADR-0019) | Cổng 2 (thân xử lý — ô của bảng) | Canh thêm |
|---|---|---|---|
| `GET /api/orders` | `orders` (SALES, ACC, ADMIN, SA, PARTNER, INTERN, **FIELD từ B2**) | `can(order.view)` không ngữ cảnh → không lọc, sai → lọc đơn của mình; `can(money.view)`/`can(contact.view)` cùng phạm vi | bài kiểm "mọi mã trong cổng `orders` có `order.view` ≠ none" |
| `GET /api/orders/:id` | `orders` | `can(order.view, {ownerId, assigned})`, `can(money.view, …)`, `can(contact.view, …)`, `can(order.history.view, …)` | e2e `permissions.mjs`: FIELD 200, PARTNER đơn người khác 403 |
| `POST`/`PUT` đơn, `…/trip`, `…/booker`, `…/status` | `orders` | `order.create` / `order.modify` / `order.trip.edit` (không đổi) | hàng rào 2 |
| `GET /api/orders/dashboard` (Trang chủ) | `office` → **`orders`** (B1) | `if (!can(staff, "order.view") \|\| !can(staff, "money.view") \|\| !can(staff, "contact.view")) return 403` (không ngữ cảnh; phần `today` có tên/SĐT khách) ⇒ Đối tác/Thực tập 403 | `start-page.test.ts` (FIELD ở lại Trang chủ từ B2) |
| `GET /api/dispatch/handlers` | `office` → **`orders`** (B1) | `can(order.view)` không ngữ cảnh | — |
| `PUT /api/orders/:id/handler` (giao/nhận) | `office` → **`orders`** (B1) | sàng sớm `can(dispatch.claim) \|\| can(dispatch.assign, {ownerId: chính mình})` trước khi đọc đơn; rồi `handlerChangeVerdict` (không đổi) + `checkAssignee` | e2e `dispatch.mjs` (FIELD nhận 200; nhận đơn đã có người 409; Kế toán/Đối tác/Thực tập 403) |
| `GET /api/dispatch/assignees` | `office` (không có FIELD) | `can(dispatch.assign, {ownerId: chính mình})` | — |
| `GET /api/dispatch/mine`, `POST …/handler-cancel`, `…/handler-money-edit` | `staff` | tự khoanh theo phiên + `order.cancel`/`order.money.edit` cấp hẹp (không đổi); `mine` thêm `can(contact.view, {assigned: true})` | — |
| `/api/parties*` (trừ vai/quan hệ) | `office` (**FIELD không qua**, dù `order.view` = any) | `party.view` / `party.write` / `party.staff.write` + cấp bậc (GĐ1) | thí nghiệm `lo-hong.mjs`: FIELD 403 ở cổng |
| `/api/parties/:id/roles*`, `…/relationships*` | `admin` | `can(admin.manage)`; hồ sơ gắn tài khoản (với quan hệ: **cả hai đầu**) → thêm `ctx.partyAccount(…)` phải `manageable` (tự mình hoặc cấp dưới) | Q11 (chủ quyết 25/9): Quản trị 403 trên hồ sơ Quản trị khác/Toàn quyền; test hồi quy harness (kế hoạch Task B6) |
| `GET /api/catalog` | `office` (FIELD **cố ý** bị chặn dù `money.view` = any) | `can(money.view)` | không đổi cổng (ADR-0019 điều 1) |
| `GET /api/catalog/for-order` (**mới**, Phần A0 — Q13, chủ quyết 25/9) — form lập đơn | `orders` | `can(order.create)` (Kế toán, Hướng dẫn viên 403); từ Phần B thêm `can(money.view, { ownerId: chính mình })`; chữ lỗi đồng bộ Sheet chỉ cho người qua `office` | bài khoá "được lập đơn ⇒ `money.view` ≠ none"; test harness `danh-muc-lap-don.test.ts` |
| `/api/catalog/*` quản trị, `/api/locations` ghi, `GET /api/audit`, `/api/staff*` | `admin` | `can(admin.manage)` (+ `mayManage` khi có tài khoản mục tiêu; `admin.manage.superadmin` khi cấp quyền cao) | hàng rào 2 mở rộng cho route đọc; hàng rào mới "route `admin` phải có `can()` ô quản trị" (kế hoạch Task B7b) |
| `GET`/`PATCH /api/feedback` (hàng đợi) | `admin` | `can(feedback.triage)` | — |
| `GET /api/maintenance` | `admin` | chặn `can(admin.manage)`; cờ `canToggle = can(settings.ops) && SĐT được phép` (chỉ hiển thị) | — |
| `PUT /api/maintenance` | `admin` | chặn `can(settings.ops)`, rồi SĐT được phép | tiền điều kiện: tài khoản chủ giữ Toàn quyền; quản trị không Toàn quyền **mất** nút bảo trì |
| `/api/account/*` (tự phục vụ) | `staff` | ngoại lệ vĩnh viễn (phạm vi = chính người gọi) | hàng rào 2 chỉ cho "ngoại lệ" ở đường dẫn này |
| **CSDL** | — | chỉ mục duy nhất "một người phụ trách đang mở mỗi đơn" (`dsp_assignment_handler_open_uq`) — hai người bấm "Nhận" cùng lúc: một người thắng, người kia 409 | không đổi |

## (4) Hệ quả chéo đã thấy khi ghép

1. **Hướng dẫn viên nhận đơn nháp nhưng không xác nhận được** (ADR-0017 điều 4 × ADR-0020): người lập hoặc Quản trị xác nhận, tới khi mô hình vai tách ô `order.confirm`. Ghi ở ADR-0020 điều 5 và rủi ro.
2. **Trang chủ của hướng dẫn viên** (ADR-0017 × ADR-0019): ba ô số liệu toàn công ty — chủ đã đồng ý 24/9 (ADR-0017 Hệ quả). Nhưng Trang chủ còn gọi `/api/catalog/admin` và `/api/feedback` cho khối "cần xem lại" **chỉ khi là quản trị** (`web/home.ts:186-187`) — hướng dẫn viên không gọi; không mở thêm.
3. **Ô "Chưa phụ trách" trên Trang chủ** (ADR-0020 × Trang chủ): hôm nay chỉ đếm đơn **đã xác nhận** chưa có người. Sau B3, mọi đơn nháp mới đều chưa có người — theo câu hỏi mở M1 của ADR-0020 (lượt sau).
4. **Vai/quan hệ trên hồ sơ của một Quản trị khác** (ADR-0019 × ADR-0014 điều 8 miễn trừ "vai trò hồ sơ"): hôm nay một Quản trị kết thúc được vai trên hồ sơ của Quản trị khác (phát hiện ở GĐ1). **Chủ quyết 25/9 (Q11): chặn** — luật cấp bậc áp cho vai/quan hệ của hồ sơ gắn tài khoản (cả hai đầu quan hệ); hồ sơ không gắn tài khoản giữ nguyên.
5. **Người phụ trách cũ do tự gắn** (ADR-0020 × đơn cũ): đơn đã có người phụ trách giữ nguyên; chỉ đơn mới đổi. Không có câu dữ liệu.
