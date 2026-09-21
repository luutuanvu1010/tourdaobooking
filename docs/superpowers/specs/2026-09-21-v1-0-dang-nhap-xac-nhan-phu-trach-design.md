# Đặc tả bản v1.0 — đăng nhập an toàn + thông tin công ty, xác nhận đơn PNG, người phụ trách

Ngày 2026-09-21. Nguồn: yêu cầu trực tiếp của chủ dự án (phiên 2026-09-21). Đọc kèm `CLAUDE.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/SPEC-tourdao-sales.md` §4 (mẫu xác nhận đơn, M4), ADR-0006 (phân công), ADR-0007 (bản đồ quyền), ADR-0009 (mới, kèm đặc tả này).

Đặc tả này ghi **giả định** ở những chỗ yêu cầu chưa nói rõ (mục "Giả định" của từng việc). Giả định sai thì sửa ở đây rồi sửa mã; mỗi giả định được chọn theo hướng **rẻ nhất để đổi**.

## Việc 1 — Màn hình đăng nhập: Cloudflare Turnstile + tên/phiên bản/thông tin công ty

### Yêu cầu
1. Thêm **Cloudflare Turnstile** vào màn hình đăng nhập.
2. Hiển thị: tên ứng dụng, **số hiệu phiên bản "v1.0 — ngày 21 tháng 9 năm 2026"**, **Công ty TNHH Tour Đảo**, địa chỉ **19 Đường B2, khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, tỉnh Khánh Hoà**, email **Tourdaotravel@gmail.com**, **MST 4201969169**.

### Thiết kế
**Thông tin công ty — một nguồn sự thật (P6).** Bảng `company_profile` (migration `0002`, singleton `id='default'`) đã có đúng tên/MST/địa chỉ/hotline nhưng **chưa module nào đọc**, và `email` đang NULL. Không chép cứng vào HTML.
- Migration `0013_company_email.sql`: `UPDATE company_profile SET email = 'Tourdaotravel@gmail.com', updated_at = … WHERE id = 'default' AND email IS NULL`. (Chỉ dữ liệu, không đổi cấu trúc; không `ALTER`.)
- Module mới **`company`** (`src/modules/company/`): chủ của `company_profile` (thêm vào `data-dictionary.json` với module chủ `company`). Route **`GET /api/company`**, mức `public`, trả `CompanyDto { name, taxCode, address, hotline, email }` (KHÔNG trả `zalo_number`/`logo_url`/`updated_by`). Chỉ đọc; sửa hồ sơ công ty là M5 (ngoài phạm vi).
- `web/login.ts` gọi `GET /api/company` và dựng khối thông tin ở chân trang đăng nhập. API lỗi/chậm → khối ẩn, **không chặn đăng nhập**.

**Phiên bản** — hằng trong mã (thuộc về bản phát hành, không phải dữ liệu): `src/shared/app-info.ts` xuất `APP_NAME = "Tour Đảo Booking"`, `APP_VERSION = "1.0"`, `APP_RELEASE_DATE = "2026-09-21"` và `formatReleaseLine()` → `"Phiên bản 1.0 · ngày 21 tháng 9 năm 2026"` (thuần, có test; ngày dài tiếng Việt). Khi phát hành mới chỉ sửa tệp này (ghi vào CHANGE-GUIDE).

**Turnstile**
- Widget nhúng bằng script của Cloudflare, dựng tường minh (`turnstile.render`) trong `web/login.ts`; chế độ *managed*; chủ đề theo hệ thống. Sau mỗi lần đăng nhập THẤT BẠI phải `turnstile.reset()` (token dùng một lần).
- Cấu hình: `TURNSTILE_SITE_KEY` (công khai; `vars` trong `wrangler.jsonc` cho production, `.dev.vars` cho local) và `TURNSTILE_SECRET_KEY` (**bí mật**: `wrangler secret put`, `.dev.vars`). Khai kiểu trong `worker-configuration.d.ts` (`wrangler types`) và `.dev.vars.example`.
- `GET /api/auth/config` (public) → `{ turnstileSiteKey: string | null }` để trang biết có dựng widget không và dùng khoá nào. (Khoá site không hard-code vào HTML: local dùng khoá thử của Cloudflare.)
- `POST /api/auth/login` nhận thêm `turnstileToken` (string). Máy chủ gọi `https://challenges.cloudflare.com/turnstile/v0/siteverify` (POST, `secret`, `response`, `remoteip` = `CF-Connecting-IP`) **TRƯỚC** khi đụng bộ chống dò PIN — kẻ tấn công không có token thì không tiêu hao lượt thử của SĐT nạn nhân. Chức năng ở `src/modules/auth/turnstile.ts`: `verifyTurnstile({ secret, token, ip }, fetchImpl)`; `fetchImpl` tiêm được để test; hết giờ 5 giây.
- Lỗi: 403 `turnstile_failed` — "Chưa xác minh được bạn là người thật. Hãy thử lại." (thiếu/sai/hết hạn token); 503 `turnstile_unavailable` — "Chưa kết nối được dịch vụ xác minh. Hãy thử lại sau ít phút." (siteverify không trả lời/lỗi mạng). **Đóng khi lỗi** (không cho qua).
- **Chưa cấu hình `TURNSTILE_SECRET_KEY`** ⇒ bỏ qua kiểm và `GET /api/auth/config` trả `null` (widget không hiện). Lý do: không khoá chết local/e2e/lần deploy đầu. Rủi ro (mất secret ⇒ tắt lặng lẽ) giảm bằng: máy chủ `console.warn` mỗi lần đăng nhập không có secret, và checklist deploy (bên dưới) bắt buộc kiểm `GET /api/auth/config` khác `null` SAU khi đặt secret. Ghi nhận thêm khi thi công: 403 `turnstile_failed` cũng có một dòng log ngắn (chỉ mã lý do đã lọc) để thấy 403 hàng loạt.
- CSP ở `public/_headers` mở tối thiểu cho Cloudflare: `script-src 'self' https://challenges.cloudflare.com`, `frame-src https://challenges.cloudflare.com`, `connect-src 'self' https://challenges.cloudflare.com` (thêm `style-src`/`img-src` nếu widget cần — kiểm bằng Chrome thật). Service worker: `sw-policy.ts` chỉ cache khung tĩnh của app, KHÔNG cache script/khung của Cloudflare (đã đúng vì chỉ cache cùng nguồn — thêm test).
- Kiểm thử: e2e dùng **khoá thử chính thức của Cloudflare** qua `--var`: site `1x00000000000000000000AA` / secret `1x0000000000000000000000000000000AA` (luôn đạt) và secret `2x0000000000000000000000000000000AA` (luôn hỏng); token giả `XXXX.DUMMY.TOKEN.XXXX`. Cần mạng (đã cần cho e2e).

### Giả định (việc 1)
- "Thêm tên" = tên ứng dụng "Tour Đảo Booking" (đã là `<h1>`) + tên công ty; không thêm logo mới.
- Tên công ty hiển thị đúng như trong `company_profile` ("CÔNG TY TNHH TOUR ĐẢO", theo SPEC §2.1); không đổi hoa/thường.
- Widget chỉ ở màn đăng nhập (không ở đổi PIN).
- Chủ dự án (hoặc người có quyền Cloudflare) tạo widget Turnstile cho `booking.tourdao.vn` và cung cấp/đặt khoá — Claude không tự tạo tài nguyên trên Cloudflare nếu chưa được lệnh riêng.

## Việc 2 — Xác nhận đơn dịch vụ dạng PNG, hiện ngay sau khi tạo đơn

### Yêu cầu
Sau khi tạo đơn, hiện ngay **xác nhận đơn giao dịch vụ** để gửi cho khách, **lưu dạng PNG, tải xuống được**.

### Thiết kế (bám SPEC §4 "Mẫu xác nhận đơn hàng"; ADR ngắn về cơ chế PNG client-side ghi ở đây)
**Cơ chế: dựng PNG hoàn toàn ở trình duyệt** (Canvas 2D), không ở máy chủ. Lý do: Worker không có canvas/font; dữ liệu đã ở trình duyệt; font tự lưu trữ sẵn (`public/fonts`); CSP đã cho `img-src blob:` (chuẩn bị từ đầu cho M4). PDF ngoài phạm vi.
- **Mô hình nội dung thuần** `src/shared/order-confirmation.ts`: `buildConfirmation(order: OrderDetailDto, company: CompanyDto, handlerName: string | null): ConfirmationModel` — danh sách khối/dòng đã định dạng chữ (tiền `1.350.000 ₫`, ngày `dd/mm/yyyy`, giờ `HH:MM`, số khách "2 người lớn, 1 trẻ em"), **không** biết canvas. Có test đơn vị (đủ trường, ẩn trường rỗng, ẩn nội bộ, nhiều dịch vụ, đơn nhập tay).
- **Bộ vẽ** `web/confirmation-image.ts`: `renderConfirmationPng(model): Promise<Blob>` — khổ rộng 720 CSS px, vẽ ở `devicePixelRatio` ≥ 2 (ảnh 1440 px), cao theo nội dung; chờ `document.fonts.load()` cho hai họ font trước khi vẽ; tự ngắt dòng tiếng Việt theo `measureText`; nền trắng, màu theo token (đọc `getComputedStyle` từ `:root`, không hex cứng trong TS); logo `/icons/icon-192.png` cùng nguồn (canvas không bị "tainted").
- **Nội dung (theo SPEC §4, thêm thông tin chuyến):** (1) đầu trang: logo + tên công ty + MST + địa chỉ + hotline/email (từ `GET /api/company`); (2) tiêu đề "XÁC NHẬN ĐƠN DỊCH VỤ", mã đơn, ngày lập, trạng thái ("Chờ xác nhận"/"Đã xác nhận"/"Đã huỷ"), **nhân viên phụ trách** (= người phụ trách của việc 3; chưa có thì người lập); (3) khách: tên, SĐT, email (nếu có), ghi chú/yêu cầu của khách; (4) từng dịch vụ: tên, số khách theo loại, **ngày & giờ khởi hành**, **giờ & điểm đón**, **check-in**, và các dòng tiền (mô tả, số lượng, đơn giá, thành tiền); (5) tổng kết: tạm tính, giảm giá, **tổng cộng**, đã cọc, **còn lại** (nổi bật bằng `--c-accent`); (6) chân trang: lời cảm ơn + hotline/Zalo. **KHÔNG** in: ghi chú vận hành nội bộ của dịch vụ, nhãn "khác giá danh mục", mã danh mục, id, tên/SĐT nhân viên ngoài "nhân viên phụ trách".
- **Giao diện:** sau khi lưu đơn **mới** thành công, `web/order-form.ts` chuyển tới `/order?id=<id>&moi=1` (vẫn `location.replace`); `web/order.ts` thấy `moi=1` thì mở ngay hộp thoại "Xác nhận đơn để gửi khách" (`role=dialog`, cùng khuôn với `trip-sheet`: `aria-modal`, `inert` nền, Esc đóng, trả focus) hiện ảnh xem trước + nút **"Tải ảnh PNG"** (`<a download="xac-nhan-<mã đơn>.png">` từ `blob:` URL, thu hồi khi đóng) + nút **"Chia sẻ"** khi `navigator.canShare({ files })` (iPhone → Zalo). Trang đơn luôn có nút "Xác nhận gửi khách" để mở lại (mọi trạng thái, kể cả đơn đã xác nhận/huỷ). Bỏ `moi=1` khỏi URL sau khi mở (`history.replaceState`) để tải lại trang không bật lại hộp thoại.
- Đơn **sửa** (không phải mới) không tự bật hộp thoại.
- Tên tệp: `xac-nhan-<order_code>.png` (mã đơn chỉ có chữ/số/gạch).

### Giả định (việc 2)
- "Xác nhận đơn giao dịch vụ" = mẫu SPEC §4 (khách nhận để xác nhận dịch vụ đã đặt), có cả tiền.
- Đơn nháp cũng xuất được (dòng trạng thái ghi rõ "Chờ xác nhận") vì yêu cầu là hiện ngay sau khi TẠO (lúc đó luôn là nháp).
- Chỉ PNG; PDF/in A4 để sau. Không lưu ảnh lên máy chủ (dựng lại mỗi lần mở).

## Việc 3 — Người phụ trách đơn (ai chăm sóc khách, sửa được đơn)

### Yêu cầu
Ở danh sách đơn (hàng loạt) cho biết **ai là người phụ trách** — người nhận trách nhiệm chăm sóc: gọi điện cho khách để đón; và người đó **sửa được đơn** (dịch vụ, số lượng khách…).

### Thiết kế (thi hành ADR-0006 điều 1–4 và 8, ADR-0007 điều 4(b); thay đổi ma trận ở ADR-0009)
**Dữ liệu — migration `0014_dispatch.sql`** (module mới **`dispatch`**, tiền tố `dsp_`; sổ dữ liệu cập nhật):
- `dsp_task_kind` (bảng tra cứu khoá mã): hạt giống `HANDLE` "Phụ trách", `PICKUP` "Đón khách", `DROPOFF` "Tiễn khách", `BOAT` "Lái cano". **Chỉ `HANDLE` được dùng ở đợt này.**
- `dsp_assignment_status` (bảng tra cứu) và `dsp_assignment` — **đúng cấu trúc ADR-0006 điều 2** (cửa một chiều: dựng đủ cột một lần, cả hạt `order_service_id`); chỉ mục duy nhất một phần "tối đa một `HANDLE` đang mở cho mỗi `order_id`" (điều 3); `CHECK ((order_id IS NULL) <> (order_service_id IS NULL))`; khoá ngoại `NO ACTION`. Tuân ADR-0003 (cột kiểm toán, hiệu lực `valid_from_at`/`valid_to_at`, không xoá cứng). Đợt này mã CHỈ ghi hạt `order_id` (điều kiện tiên quyết của hạt dịch vụ chưa làm).
- View công bố `v_dsp_order_handler` (order_id, party_id, staff_id, label, since) cho các nơi cần nhãn.
- **Backfill:** mỗi đơn đã có → một dòng `HANDLE` đang mở với người lập đơn (qua `staff.party_id`), để đơn cũ hiển thị người phụ trách.
- Nếu số `0013`/`0014` bị chiếm bởi việc khác lúc thi công: đánh số tiếp và cập nhật CLAUDE.md/HANDOFF-N1. **B5 (siết `party_id`) dời thành số tiếp theo** — ghi vào HANDOFF-N1 và CLAUDE.md.

**Quy tắc nghiệp vụ**
- **Đơn mới → người lập là người phụ trách mặc định**: dòng `HANDLE` được chèn trong cùng `db.batch()` tạo đơn (`orders/service.ts` nhận câu lệnh do `dispatch` cung cấp, đúng mẫu `auditStatement`; `orders` KHÔNG viết SQL đụng `dsp_*`).
- **Đổi người = đóng dòng cũ + mở dòng mới trong MỘT `db.batch()`** kèm dòng nhật ký (`order_handler_changed`: "từ A sang B" — chỉ tên, không SĐT). Đổi sang chính người đang phụ trách = 409 `no_change`.
- **Ai được làm gì** (`src/shared/permissions.ts`, ADR-0009): `order.modify` (sửa nháp, xác nhận, huỷ) — SALES `own` → **`ownOrAssigned`**; `order.history.view` SALES `own` → **`ownOrAssigned`**; `dispatch.assign` (đặt/đổi người phụ trách) SALES `own` → **`ownOrAssigned`**, ADMIN `any`; **thao tác mới `dispatch.claim`** (nhận đơn CHƯA có người phụ trách): SALES `any`, ADMIN `any`, ACCOUNTING/FIELD không. ("Được giao" = là người phụ trách đang mở của đơn đó, xét qua hàm `dispatch` cung cấp và gốc lắp ráp tiêm vào `ctx.assigned`.)
- Người được chọn phải là **nhân sự đang hoạt động có quyền `SALES` hoặc `ADMIN`** (có tài khoản, có `party_id`) — để "người phụ trách" luôn sửa được đơn. Không nhận `FIELD`/kế toán.
- **Quyền sửa đơn của người phụ trách = quyền của người lập** (`order.modify`, `order.trip.edit`): sửa đơn **nháp** đầy đủ (dịch vụ, số khách, tiền), xác nhận/huỷ, sửa thông tin chuyến sau xác nhận. **Sửa dịch vụ/số khách/tiền SAU khi đã xác nhận vẫn là N3** (cần lý do + lịch sử; ADR-0007 điều 3) — ngoài phạm vi.
- `canModify` trong `OrderDetailResponse` phản ánh cả người phụ trách; mã lỗi/thông điệp của các route sửa dùng đúng cơ chế hiện có (403 `forbidden`).

**API (`dispatch`, mức `office` trừ khi nêu)**
- `GET /api/dispatch/handlers?orderIds=a,b,c` → `{ handlers: { [orderId]: { partyId, staffId, name } | null } }` (tối đa 100 id; giá trị lạ → 400). Danh sách đơn gọi kèm với danh sách để hiện cột.
- `PUT /api/orders/:id/handler` — hoặc `POST /api/dispatch/orders/:id/handler` (chọn một, thống nhất trong `contracts.ts`; ưu tiên đường dẫn dưới `/api/orders/:id/…` nếu router cho module `dispatch` khai được): thân `{ staffId }`, đặt/đổi; yêu cầu `dispatch.assign` (hoặc `dispatch.claim` khi `staffId` = chính mình và đơn chưa có người); trả người phụ trách mới. Xung đột song song (`stale`) → 409, giao diện tải lại.
- `GET /api/dispatch/assignees` → danh sách nhân sự có thể được giao: `{ staffId, partyId, name }` (nguồn: view công bố `v_stf_staff_label` + quyền hiệu lực).

**Giao diện**
- **Danh sách đơn** (`web/orders.ts`, `public/index.html`): mỗi đơn hiện "**Phụ trách: <tên>**" (hoặc chip "Chưa có người phụ trách"); dữ liệu lấy bằng `GET /api/dispatch/handlers` cho các đơn đang hiển thị (một lời gọi mỗi trang danh sách). Hiển thị cả ở bảng máy tính và thẻ điện thoại.
- **Trang đơn** (`web/order.ts`): khối "Người phụ trách": tên hiện tại; nút "**Đổi người phụ trách**" (mở bảng chọn từ `assignees`, cùng khuôn `trip-sheet`) khi có `dispatch.assign`; nút "**Nhận phụ trách**" khi đơn chưa có người và có `dispatch.claim`. Sau đổi thì tải lại đơn.
- Xác nhận PNG (việc 2) lấy `handlerName` từ đây.

### Giả định (việc 3)
- "Người phụ trách" = một người mỗi đơn (ADR-0006), mặc định là người lập đơn; đổi được; lịch sử nằm ở `dsp_assignment` (đóng/mở dòng) và nhật ký.
- Lọc/sắp xếp danh sách theo người phụ trách **chưa làm** (chỉ hiển thị).
- "Sửa được đơn hàng" = cùng quyền với người lập (nháp: đủ; đã xác nhận: thông tin chuyến). Nếu chủ dự án muốn người phụ trách sửa cả dịch vụ/số khách/tiền SAU xác nhận thì đó là N3 — cần đặc tả riêng.
- Nhiệm vụ `PICKUP`/`BOAT`, gán theo dịch vụ, nhật ký gọi điện, "việc của tôi" cho FIELD: N2 phần sau, không làm ở đây.

## Thứ tự thi công và triển khai
Thi công theo ba việc (mỗi việc nhiều task, mỗi task test đỏ→xanh, rà soát độc lập): **1 → 3 → 2** (việc 2 dùng tên người phụ trách của việc 3 và `GET /api/company` của việc 1). Kế hoạch: `docs/superpowers/plans/2026-09-21-v1-0-thi-cong.md`.

**Triển khai** (chỉ khi chủ dự án ra lệnh; runbook đầy đủ ở `docs/HANDOFF-N1.md`, mục "Lần phát hành v1.0"). **Thứ tự Turnstile đã SỬA (2026-09-21, sau rà soát Task 3; bản đầu của mục này ghi "đặt secret cùng lượt/trước deploy" là SAI):** service worker phục vụ `/login` và `login.js` từ cache (stale-while-revalidate), nên một iPhone đã cài PWA có thể còn chạy `login.js` cũ — không gửi token — ở lần mở đầu; nếu máy chủ đã bật kiểm thì người đó bị 403. Thứ tự đúng: (1) chủ dự án tạo widget Turnstile cho `booking.tourdao.vn` ở dashboard Cloudflare, ghi `TURNSTILE_SITE_KEY` (công khai) vào `vars` của `wrangler.jsonc` — CHƯA đặt secret; đối chiếu `MAX_TOKEN_LENGTH` (ngưỡng giả định 2048) với tài liệu Cloudflare; (2) điểm Time Travel; (3) `npm run db:migrate:remote` (áp `0013`, `0014`) rồi `wrangler deploy` ngay — Turnstile còn TẮT vì chưa có secret (`GET /api/auth/config` trả `null`, đăng nhập như cũ); (4) đối chiếu số đơn với số dòng người phụ trách đang mở, `audit-invariants --db remote` (chạy SAU khi áp `0014`), `GET /api/company` và một lời gọi `GET /api/dispatch/handlers` (`json_each` chưa thử trên D1 production); (5) để nhân viên mở app một lần cho máy khách nạp `login.js` mới; (6) `wrangler secret put TURNSTILE_SECRET_KEY` (không cần deploy lại) rồi kiểm `GET /api/auth/config` trả khoá site (KHÁC `null`), đăng nhập thử qua Turnstile ở trình duyệt thật, danh sách đơn hiện người phụ trách, tạo đơn thử → hộp thoại PNG.

## Ngoài phạm vi
PDF/in A4; sửa `company_profile` bằng giao diện (M5); tải logo; Turnstile ở đổi PIN; lọc theo người phụ trách; nhiệm vụ đón/lái cano; gán theo dịch vụ; sửa dịch vụ/số khách/tiền sau xác nhận (N3); giá net HDV (N4).
