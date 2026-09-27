# ADR-0033 — Danh mục dịch vụ cho người lập đơn đi qua một route RIÊNG có kiểm quyền (thay điều 1 của ADR-0028)

- **Trạng thái:** **accepted** — chủ dự án quyết trực tiếp trong phiên chat 2026-09-27, trả lời *"ok làm theo khuyến nghị"* cho phương án route riêng `GET /api/catalog/for-order`. AI ghi lại, không tự quyết (tiền lệ ghi quyết định trong chat: ADR-0021, ADR-0027, ADR-0028). Từ mốc này chỉ sửa dòng trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-27   **Loại:** cửa **hai chiều** — thêm một route đọc và đưa một route đọc về cổng cũ; không migration, không dữ liệu mới, không đổi ô nào của `MATRIX`; gỡ bằng một commit. Không mở thêm cho ai điều gì: người đọc được danh mục hôm nay (văn phòng, Đối tác, Thực tập) vẫn đọc được đúng nội dung đó.
- **Liên quan:**
  - **Thay điều 1 của ADR-0028** (accepted 2026-09-26). Điều 2, 3, 4 và mục đích của ADR-0028 (Đối tác, Thực tập lập được đơn bằng danh mục) **giữ nguyên**.
  - **Trả lại đúng ADR-0019 điều 1** (accepted 2026-09-25): `GET /api/catalog` thuộc cổng `office`. ADR-0019 không bị sửa — văn bản của nó nay lại khớp mã.
  - **Giữ lời hứa của ADR-0019 điều 3** cho Phần C (hướng dẫn viên vào cổng `orders` theo ADR-0017): hướng dẫn viên không đọc được bảng giá cho form lập đơn.
  - Cách làm này là phương án đã chốt từ trước ở kế hoạch GĐ2 (`docs/superpowers/plans/2026-09-25-gd2-thi-cong.md`, Phần A0, câu Q13 của chủ 2026-09-25); bản 1.15 (ADR-0028) đã đi đường khác — lệch được ghi ở `docs/HANDOFF-N1.md` "Việc còn treo" (mục gộp nhánh `a0-danh-muc-cho-lap-don`). Số 0030–0032 đã dành cho đặc tả Đơn tự do (`docs/superpowers/specs/2026-09-26-don-tu-do-hdv-nhan-tu-choi-design.md`) nên ADR này lấy số 0033.

## Bối cảnh

ADR-0028 điều 1 đổi `GET /api/catalog` từ cổng `office` sang cổng `orders` để Đối tác và Thực tập — hai mã quyền **không** qua cổng `office` — có danh mục khi lập đơn (bản 1.15, đang ở production).

ADR-0019 (accepted trước đó một ngày) ghi `GET /api/catalog` thuộc cổng `office`, và điều 3 nói: khi ADR-0017 được thi công ở Phần C, hướng dẫn viên (`FIELD`) được thêm vào cổng `orders` nhưng **không** đọc được "danh mục giá cho form lập đơn". Ô `money.view` của hướng dẫn viên theo ADR-0017 là `any`, nên lời hỏi `can(staff, "money.view", { ownerId: staff.id })` đang có trong route không chặn được họ.

Hai văn bản đã accepted vì vậy **mâu thuẫn ở Phần C**: ngày hướng dẫn viên vào cổng `orders`, họ đọc được bảng giá qua `GET /api/catalog` (ADR-0028 cho phép bằng cổng), điều ADR-0019 điều 3 cấm. Hôm nay chưa lộ gì (cổng `orders` chưa có `FIELD`), nhưng Phần C không được bắt đầu khi chưa giải mâu thuẫn này (`docs/superpowers/plans/2026-09-25-gd2-thi-cong-nhat-ky.md` §5).

Phương án đã trình (lời thường): (A) làm một đường riêng chỉ cho người được lập đơn — **khuyến nghị**; (B) giữ như 1.15 và chấp nhận hướng dẫn viên thấy bảng giá sau Phần C; (C) cho Đối tác/Thực tập vào cổng văn phòng. Chủ chọn A.

## Quyết định

1. **Route mới `GET /api/catalog/for-order`, cổng `orders`.** Thân xử lý hỏi `if (!can(staff, "order.create")) return 403` **trước mọi truy vấn** (kể cả `bootstrapIfNeverSynced`), rồi hỏi `can(staff, "money.view", { ownerId: staff.id })` (403 nếu sai), rồi mới đọc danh mục. Ai **không được lập đơn** (Kế toán, Hướng dẫn viên — kể cả sau Phần C) thì 403 ở đây.
2. **Nội dung trả về đúng `CatalogPublicResponse` như hôm nay** nhân viên văn phòng thấy: tên, đơn vị, giá bán lẻ hiệu lực theo loại khách (đã áp ghi đè của quản trị), ghi chú độ tuổi cho khách, cờ `supported`; chỉ dịch vụ đang hiện. Không giá vốn, không cột nội bộ của Sheet, không giá gốc Sheet/thông tin ghi đè. **Chữ lỗi đồng bộ Sheet** (`sync.error`) là chuyện vận hành nội bộ: trả nguyên cho người qua cổng `office`, trả `null` cho người **không** qua cổng `office` (Đối tác, Thực tập).
3. **`GET /api/catalog` trở về cổng `office`** (đúng ADR-0019 điều 1), nội dung không đổi với văn phòng (kể cả `sync.error`), vẫn hỏi `money.view` trong thân. Đối tác và Thực tập **không** còn gọi thẳng route này (403 ở cổng) — đây là đảo có chủ đích so với bản 1.15.
4. **Form lập/sửa đơn** gọi route mới. Người dùng không thấy gì khác.
5. Điều 2, 3, 4 của ADR-0028 giữ nguyên: danh mục chỉ đọc, cùng nội dung như văn phòng; quản trị danh mục (`/api/catalog/admin`, đồng bộ, sửa giá, ẩn/hiện, gỡ ghi đè, xác nhận) giữ cổng `admin`; luật giá ADR-0027 không đổi.

## Sửa gì của quyết định cũ

- **ADR-0028 điều 1** — nguyên văn: *"`GET /api/catalog` dùng cổng **`orders`** thay `office`: văn phòng + mọi tài khoản xem được đơn của chính mình (Đối tác, Thực tập). Hướng dẫn viên thuần (`order.view` = none) vẫn 403."* → **mới:** `GET /api/catalog` giữ cổng `office`; người lập đơn ngoài văn phòng (Đối tác, Thực tập) đọc danh mục qua `GET /api/catalog/for-order` (cổng `orders` + `can(staff, "order.create")` + `can(staff, "money.view", { ownerId: staff.id })` trong thân). Hướng dẫn viên và Kế toán 403 ở route mới vì không có `order.create`.
- **ADR-0028 mục "Trang ghép", dòng 3** — nguyên văn: *"**Cổng:** `GET /api/catalog` (cổng `orders`); ảnh chụp mức truy cập `src/route-access.test.ts` khoá giá trị mới."* → **mới:** `GET /api/catalog` (cổng `office`) và `GET /api/catalog/for-order` (cổng `orders`, chốt chặn thật là `can(order.create)` trong thân); ảnh chụp `src/route-access.test.ts` khoá cả hai.
- ADR-0028 **điều 2–4 giữ**; dòng 1–2 của Trang ghép ADR-0028 giữ (bảng đọc, `MATRIX` không đổi ô nào). ADR-0028 chỉ được sửa dòng trạng thái để trỏ về ADR này.

## Phương án bị loại

- **Giữ như bản 1.15** (`GET /api/catalog` ở cổng `orders`): sau Phần C hướng dẫn viên đọc được bảng giá — trái ADR-0019 điều 3; lời hỏi `money.view` trong route không chặn được vì ô của hướng dẫn viên là `any` (ADR-0017).
- **Cho Đối tác/Thực tập vào cổng `office`:** mở luôn Hồ sơ (`/api/parties*`) và danh sách người có thể được giao (`GET /api/dispatch/assignees`) cho tài khoản bên ngoài — trái ADR-0019 điều 1 (Q3 của chủ đã bác cơ chế "vào văn phòng để có một thứ").
- **Thêm mã quyền/ô mới cho "xem danh mục"** (ví dụ `catalog.view`): chưa cần — "được lập đơn" (`order.create`) đúng là câu hỏi nghiệp vụ ở đây (danh mục chỉ để chọn dịch vụ khi lập đơn); thêm ô là đổi bảng quyền, cần trang ghép và bài khoá riêng, không thêm được gì mà `order.create` chưa trả lời.

## Hệ quả

- **Sau Phần C** (hướng dẫn viên vào cổng `orders`): ô `money.view` của hướng dẫn viên là `any`, nên thứ **duy nhất** giữ họ khỏi bảng giá ở route mới là ô `order.create = none` của `FIELD`, không phải `money.view`. Ai đổi ô `order.create` của `FIELD` (cho hướng dẫn viên lập đơn) là đồng thời mở danh mục giá cho họ — việc đó cần quyết định riêng của chủ (ADR-0017 điều 4 nói hướng dẫn viên không lập đơn).
- Lời hỏi `can(staff, "money.view", { ownerId: staff.id })` dùng ngữ cảnh do route **tự dựng** (không phải của một đơn thật), nên chỉ bắt được ô `none`; ô `own`/`ownOrAssigned`/`any` đều qua như nhau. Một bài khoá **giá trị** của bảng (`src/shared/permissions.test.ts`: mọi mã có `order.create ≠ none` thì `money.view ≠ none`) giữ cho "được lập đơn ⇒ được xem giá bán lẻ" — không phải phép kiểm lúc chạy.
- Đối tác/Thực tập gọi thẳng `GET /api/catalog` nhận 403 (cổng văn phòng). Không màn nào của họ gọi route đó sau khi form đổi; bản giao diện cũ còn trong bộ nhớ đệm điện thoại (trước khi tải bản mới) sẽ báo "Không tải được danh mục dịch vụ" cho tới khi app tải bản mới — cùng hiện tượng mọi lần phát hành đổi route của giao diện.
- Hai route cùng một hàm dựng nội dung (một nguồn): nội dung văn phòng và người lập đơn không thể lệch nhau ngoài `sync.error`.
- Tài liệu mô tả (`docs/SYSTEM-DESIGN.md` §7, §8, §9; `docs/CHANGE-GUIDE.md`) sửa cùng commit mã; `docs/SO-HANG-RAO.md` có dòng cho chốt chặn `can(order.create)` ở route mới.

## Trang ghép (CLAUDE.md §9 — một quyết định chạm quyền)

1. **Bảng chứa loại thực thể nào:** chỉ **đọc** bảng danh mục của module `catalog` (`catalog_item`, `catalog_override`, `catalog_sync` — dịch vụ bán cho khách và trạng thái đồng bộ); không ghi. Lần gọi đầu tiên khi hệ thống **chưa từng** đồng bộ vẫn tự kéo Sheet (`bootstrapIfNeverSynced`, một lần nhờ `last_attempt_at IS NULL`) — nay chỉ khi người gọi đã qua `order.create` (route mới) hoặc cổng `office` (route cũ).
2. **Dòng bản đồ quyền chạm tới:** `order.create` (SALES any, ACCOUNTING none, ADMIN any, FIELD none, PARTNER any, SUPER_ADMIN any, INTERN any) là chốt chặn của route mới; `money.view` (SALES/ACCOUNTING/ADMIN/SUPER_ADMIN any, FIELD none — `any` sau ADR-0017, PARTNER/INTERN own) hỏi với ngữ cảnh "của mình" ở cả hai route. Không đổi ô nào của `MATRIX`.
3. **Cổng nào canh cửa nào:** `GET /api/catalog/for-order` — cổng `orders` (`ORDERS_GATE`: văn phòng, Đối tác, Thực tập; sau Phần C thêm `FIELD`) lọc thô, `can(order.create)` trong thân là chốt chặn thật; `GET /api/catalog` — cổng `office` (`OFFICE_GATE`: Bán hàng, Kế toán, Quản trị, Toàn quyền) + `can(money.view)` trong thân; quản trị danh mục — cổng `admin` + `can(admin.manage)` như cũ. Ảnh chụp `src/route-access.test.ts` khoá cả ba mức.
