# Cẩm nang thay đổi nhanh — tourdao-sales

> Đối chiếu với mã tại HEAD `6226539` (2026-09-21) cộng các sửa chưa commit của bộ tài liệu nền cùng đợt (gồm `tests/e2e/pwa.mjs`, nay duyệt mọi trang của `PAGES`).
> Tệp này KHÔNG giải thích kiến trúc (xem `docs/ARCHITECTURE.md`, `docs/SYSTEM-DESIGN.md`). Nó chỉ trả lời: **muốn đổi X thì sửa tệp nào, theo thứ tự nào, chạy kiểm gì, tránh bẫy nào.**
> Ký hiệu ghi bằng TÊN, không ghi số dòng — tìm bằng `grep -rn "<ký hiệu>" src web`.
> Mã thắng tài liệu: thấy lệch thì sửa tài liệu trong cùng commit (`CLAUDE.md` §6–7).

## 0. Cách dùng

1. Tra bảng §1 → làm công thức §2 đúng THỨ TỰ tệp → chạy đúng lệnh ở dòng **Kiểm**.
2. Mỗi nhóm tệp bạn chạm có bộ kiểm riêng: §3. Trước commit và trước deploy: §5.
3. Hành vi lạ → đọc §4 (bẫy) trước khi debug. Thấy tài liệu khác mã → §6.

Mục lục: §1 Bảng tra nhanh · §2 Công thức a1–a3, b–p · §3 Ma trận kiểm · §4 Bẫy · §5 Danh sách kiểm · §6 Sai lệch tài liệu ↔ mã.

## 1. Bảng tra nhanh "Muốn … → xem …"

| Muốn | Tệp chính | Công thức |
|---|---|---|
| Đổi chữ trên giao diện (nhãn, nút, tiêu đề) | `public/*.html`, `web/*.ts`, `web/format.ts` (`STATUS_LABEL`, `METHOD_LABEL`) | i (mục "Chữ"), m |
| Đổi tên app / thông tin công ty / số phiên bản | `public/manifest.webmanifest`, `public/*.html`, `web/shell.ts`, `public/login.html`, `src/shared/app-info.ts` (phiên bản), `src/modules/company/` + `company_profile` (thông tin công ty) | j |
| Thêm trường vào đơn (khách, thanh toán…) | `src/modules/orders/repository.ts`, `src/shared/contracts.ts`, `web/order-form.ts` | a1 |
| Thêm trường chuyến vào dịch vụ trong đơn | `src/modules/orders/service-rules.ts`, `src/shared/trip-form.ts`, `web/trip-fields.ts` | a2 |
| Đổi thành phần dịch vụ (loại khách, đơn vị tính) | `src/shared/order-lines.ts`, `migrations/0008_order_service.sql` (trigger) | a3, g |
| Đổi luật tính tiền / dịch vụ theo nhóm / theo người | `src/shared/order-lines.ts` (`buildLines`), `src/modules/orders/service-rules.ts` | g |
| Đổi giới hạn (số khách, số dịch vụ, ngày tối đa, độ dài chữ) | `src/shared/trip-rules.ts`, `src/shared/order-lines.ts` | h |
| Thêm/sửa route API trong module có sẵn | `src/modules/<tên>/index.ts`, `src/shared/contracts.ts` | b |
| Thêm module mới | `src/index.ts`, `src/architecture.test.ts` (`ALLOWED_EDGES`, `STRICT`/`LEGACY`) | b |
| Thêm trang web | `public/<tên>.html`, `web/<tên>.ts`, `package.json` (`build:web`), `src/shared/sw-policy.ts` (`PAGES`) | c |
| Thêm cột / bảng / view (migration) | `migrations/`, `docs/data-dictionary.json`, `src/architecture.test.ts` | d |
| Biết số migration kế tiếp | `docs/HANDOFF-N1.md` ("Lần 2"), `src/migrations-n1.test.ts` | d |
| Thêm mã quyền (vd `DISPATCH`) | `src/shared/permissions.ts`, `public/staff.html`, migration seed `stf_permission_type` | e |
| Thêm thao tác / đổi một ô của bản đồ quyền | `src/shared/permissions.ts` (`MATRIX`), `src/shared/permissions.test.ts` | e |
| Người phụ trách đơn (đặt/đổi, ai được làm gì, hàm tiêm vào `orders`) | `src/modules/dispatch/{rules,repository,service,index}.ts`, `src/index.ts` (`injected`), `src/shared/router.ts` (`Ctx`), `tests/e2e/dispatch.mjs` | b, e |
| Thêm hành động nhật ký | `src/shared/audit-actions.ts` (`AUDIT_ACTIONS`) | f |
| Thêm loại đối tượng nhật ký (nhóm mới) | `src/shared/audit-actions.ts` (`AUDIT_GROUPS`), `src/modules/audit/repository.ts` (`listAll`) | f |
| Đổi thông báo lỗi ở giao diện (banner) | `src/shared/order-errors.ts` (`classifyOrderError`), `web/banner.ts` | m |
| Đổi thông báo lỗi do máy chủ trả | `src/modules/*/index.ts` (`error(...)`) | m |
| Đổi mẫu ảnh xác nhận đơn gửi khách (PNG): nội dung, chữ, bố cục, màu, hộp thoại | `src/shared/order-confirmation.ts` (nội dung), `web/confirmation-image.ts` (bố cục/vẽ), `web/confirmation-dialog.ts` (hộp thoại), `src/shared/text-wrap.ts` | p |
| Đổi màu / font / token | `public/app.css` (`:root`), `public/manifest.webmanifest` | i |
| Thêm biểu tượng | `web/icons.ts` (`SHAPES`) | i |
| Đổi luật đăng nhập / PIN / chống dò / phiên / Turnstile (máy chủ + widget ở màn đăng nhập) | `src/modules/auth/*` (`turnstile.ts` cho Turnstile), `src/modules/staff/password.ts`, `src/modules/staff/rules.ts`, `web/login.ts`, `public/login.html`, `public/_headers` (CSP) | l |
| Thêm biến môi trường / bí mật | `wrangler.jsonc` (`vars`), `.dev.vars`, `worker-configuration.d.ts` | l |
| Đổi cách đồng bộ Sheet / danh mục / ghi đè admin | `src/modules/catalog/*`, `src/shared/sheets.ts` | k |
| Đổi cột Sheet nhân viên / cách nạp nhân viên | `src/modules/staff/sheet.ts`, `src/modules/accounts/index.ts` | k |
| Thêm bước vào Cron | `src/index.ts` (`scheduled`), `wrangler.jsonc` (`triggers.crons`) | k |
| Thêm cột vào danh sách đơn | `src/modules/orders/repository.ts` (`listOrders`), `src/shared/contracts.ts`, `web/orders.ts` | n |
| Thêm ô lọc / tìm ở danh sách đơn | `src/modules/orders/index.ts`, `public/index.html`, `web/orders.ts` | n |
| Đổi service worker / cache / danh sách nạp sẵn | `src/shared/sw-policy.ts`, `web/sw/sw.ts`, `public/_headers` | c, i |
| Đổi header bảo mật / CSP | `public/_headers` | i, l |
| Đổi trạng thái đơn / hình thức cọc (có `CHECK` trong SQL) | `migrations/0003_orders.sql` → migration dựng lại bảng | d, g |
| Thêm kịch bản e2e (API) | `tests/e2e/run.mjs` (`ALL`), `tests/e2e/lib.mjs` | o |
| Thêm kịch bản Chrome (giao diện) | `docs/evidence/2026-09-20-a2/kich-ban/` (`a2-cdp.mjs`, `a2-smoke-*.mjs`), `docs/evidence/2026-09-21-v1-0/kich-ban/` (`v1-dang-nhap.mjs`, `v1-xac-nhan-png.mjs`) | o |
| Cập nhật sổ dữ liệu | `docs/data-dictionary.json` → `npm run dict` | d |

## 2. Các công thức

Quy ước: **Kiểm** = lệnh chạy sau khi sửa. Phép kiểm mới viết ĐỎ trước, XANH sau (`CLAUDE.md` §5). Test nằm kề tệp: `src/**/X.test.ts`.

### a1. Thêm trường vào ĐƠN (cấp đơn)

**Khi nào:** thêm cột vào `orders` (tên khách, ghi chú, nguồn khách…). Trường tiền → xem thêm g.

**Sửa theo thứ tự:**
1. `migrations/NNNN_*.sql` (số: xem d): `ALTER TABLE orders ADD COLUMN …` cho phép NULL hoặc `DEFAULT` hằng. Giá trị mở rộng theo thời gian KHÔNG `CHECK` liệt kê.
2. `src/shared/contracts.ts`: `OrderDto` (+ `OrderInput`; + `OrderSummaryDto` nếu hiện ở danh sách — nó là `Pick<OrderDto, …>`).
3. `src/modules/orders/rules.ts`: `ValidOrder` + `validateOrder`. Đọc/kiểm bằng `text()`/`int()` của `src/modules/orders/fields.ts`; đặt giới hạn độ dài ở đây.
4. `src/modules/orders/repository.ts`: `OrderRow`, `toDto` (SELECT dùng `o.*` nên đọc tự có cột), `createOrder` (câu `INSERT … SELECT ?, …` đếm dấu `?` BẰNG TAY: thêm đúng một `?` và một đối số `.bind`), `updateDraftOrder` (`UPDATE orders SET …`).
5. `src/modules/orders/rules.test.ts`: ca hợp lệ, thiếu, quá dài, chuỗi trống → `null`.
6. Web: `public/order-form.html` (ô nhập, `maxlength` khớp máy chủ) → `web/order-form.ts` (`collect()` gửi, `fill()` nạp, `validate()` nếu bắt buộc) → `web/order.ts` (`render()`: thêm `kv("Nhãn", order.field)`).
7. `tests/e2e/orders.mjs`: assert tạo, sửa, đọc lại trường mới.

**Kiểm:** `node --test src/modules/orders/rules.test.ts` → `npm test` → `npm run typecheck` → `npm run test:e2e -- orders` → ba kịch bản Chrome (§3), vì chạm `web/order-form.ts` và `web/order.ts`.

**Bẫy:**
- `docs/data-dictionary.json` + `npm run dict` CHỈ cần khi thêm bảng/view/khoá ngoại xuyên module; sổ không liệt kê từng cột thường.
- Nhật ký không ghi SĐT/email/MST/nội dung khách gõ tự do.

### a2. Thêm trường CHUYẾN vào dịch vụ (sửa được cả sau xác nhận)

**Khi nào:** thêm ô như "số vé tàu" vào khối chuyến của mỗi dịch vụ (`order_service`).

**Sửa theo thứ tự:**
1. Migration: `ALTER TABLE order_service ADD COLUMN …`. KHÔNG thêm vào danh sách cột của trigger `order_service_frozen_update` (trigger đó chỉ chặn đổi *thành phần*; trường vận hành phải sửa được — Q9).
2. `src/shared/contracts.ts`: `TripInfoDto` và `TripInput` (`ServiceInput`, `TripUpdateInput`, `toServiceInput`, `tripPayload` dùng lại `TripInput` nên tự theo).
3. `src/modules/orders/service-rules.ts`: `validateTrip` (đọc + kiểm bằng `cleanText`/`dateField`/`timeField`); thêm khoá vào `TRIP_VALUE_FIELDS` hoặc `TRIP_TEXT_FIELDS` để `describeTripChange` ghi nhật ký (chuỗi tự do chỉ ghi "đổi …").
4. `src/modules/orders/repository.ts`: `ServiceRow`, `SERVICE_SELECT`, `tripOf`, `SERVICE_COLS` + giá trị trong `serviceInserts`, câu `UPDATE order_service SET …` trong `updateTrip`.
5. `src/shared/trip-form.ts`: `emptyTrip`, `tripFromDto`; thêm `tripRows` / `tripSummaryLine` nếu cần hiện; `tripWarnings` / `tripSheetIssues` nếu có luật.
6. Web: `web/trip-fields.ts` thêm `field(...)` (dùng chung cho thẻ dịch vụ ở form và bảng "Sửa thông tin chuyến"); CSS lưới `.trip-body` ở `public/app.css` nếu cần. Các nơi còn lại tự theo hoặc chỉ cần soát:
   - `web/service-card.ts` (thẻ dịch vụ ở form: `tripSummaryLine`, `tripWarnings`; `trip` nằm sẵn trong `DraftBase` của `src/shared/service-form.ts` nên `draftFromDto` và `toServiceInput` tự mang theo);
   - `web/order-services.ts` (trang đơn: lấy dòng từ `serviceView` → `tripRows`);
   - `web/trip-sheet.ts` (bảng sửa sau xác nhận: `tripFields` + `tripPayload` + `tripSheetIssues`).
7. Test: `src/shared/trip-form.test.ts`, `src/modules/orders/service-rules.test.ts`, `tests/e2e/trip.mjs`.

**Kiểm:** `npm test` → `npm run typecheck` → `npm run test:e2e -- trip orders` → BA kịch bản Chrome (`web/trip-sheet.ts`, `web/order-form.ts`, `web/order.ts` không có kiểm tự động).

**Bẫy:**
- Ở client `""` = chưa có; ở server/DB là `NULL`. `checkin_date` NULL = "cùng ngày khởi hành".
- `PUT /api/orders/:id/trip` THAY toàn bộ: `tripPayload` gửi MỌI dịch vụ, MỌI trường; trường vắng = xoá.
- Ngày/giờ có `CHECK` khuôn dạng ở SQL và tính theo giờ VN, không UTC.

### a3. Đổi THÀNH PHẦN dịch vụ (loại khách, đơn vị tính, cột `pax_*`)

**Khi nào:** rủi ro cao — hỏi chủ dự án trước.

**Sửa theo thứ tự:**
1. Bốn loại khách đang được hard-code ở SQL: `order_service.pax_adult/child/senior/infant`, `order_item.pax_code CHECK (…)`, trigger `order_service_frozen_update`, trigger `orders_confirm_requires_trip` (cộng bốn cột `pax_*`), câu `UPDATE` trong `confirmOrder`.
2. `CHECK` và trigger không `ALTER` được → migration `DROP TRIGGER` + `CREATE TRIGGER`, hoặc dựng lại bảng (hai lần phát hành, xem d).
3. Mã: `PaxCode`/`PAX_ORDER`/`PAX_LABEL` (`src/shared/order-lines.ts`), `paxOf` (`orders/repository.ts`), `validatePax` (`service-rules.ts`), `src/shared/service-form.ts`, `web/service-card.ts`.

**Kiểm:** như a2 + `npm run test:e2e` đủ bộ.

**Bẫy:** đơn cũ đã xác nhận bị trigger đóng băng thành phần — mọi thay đổi phải chạy được trên dữ liệu production hiện có (backfill trong migration, không sửa tay).

### b. Thêm route API / thêm module

**Route vào module có sẵn** — `src/modules/<tên>/index.ts`:

```ts
route("GET", "/api/foo/meta", "office", async ({ env }) => json({ … } satisfies FooMetaResponse)), // đường dẫn cố định KHAI TRƯỚC `:id`
route("PUT", "/api/foo/:id", "office", async ({ env, request, params, staff }) => { … }),          // ctx: request, env, exec, url, params, staff
```

**Sửa theo thứ tự:**
1. Mức `access`: `"public"` | `"staff"` (mọi tài khoản) | `"office"` (mọi quyền trừ chỉ-FIELD, tức `can(who, "order.view")`) | `"admin"` (quyền ADMIN). Phạm vi "của mình" → thêm `can(staff, "<thao tác>", { ownerId })` TRONG handler; "của mình HOẶC đang được giao" (ô `ownOrAssigned`) → lấy thêm `assigned` từ `ctx.isAssigned(id)` (mẫu `PUT /api/orders/:id`: `const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)])` rồi `can(staff, op, { ownerId: meta.staffId, assigned })`) — QUÊN truyền `assigned` thì ô đó lặng lẽ chạy như `own`; nếu cùng một route vừa trả cờ (`canModify`) vừa kiểm quyền thì dùng CÙNG một giá trị `assigned`.
2. Kiểu trả về khai ở `src/shared/contracts.ts`, trả bằng `json(x satisfies XResponse)`; web gọi `api<Api.XResponse>(…)` (`web/api.ts`).
3. Đầu vào: `readJson(request)` + hàm kiểm thuần ở `rules.ts`; lỗi `error(400, "invalid_input", "<tiếng Việt>")`; `UUID_RE.test(params.id!)` sai → 404; khoá lạc quan → 409 `stale`.
4. Ghi có nhật ký: `db.batch([câu ghi, auditStatement(env.DB, { staffId, action, at, targetType, targetId, detail }, "changes() > 0")])`, rồi đọc `results[0]!.meta.changes` để biết thắng/thua (mẫu `PUT /api/locations/:id`).
5. Ghi bảng của module khác → nhận CÂU LỆNH chưa chạy từ `index.ts` của module đó; không import `repository.ts` của nó.
6. Việc chạy nền sau khi trả lời: `ctx.exec.waitUntil(...)`.

**Module mới** — thêm:
1. `src/modules/<tên>/index.ts` export `<tên>Module: AppModule = { name, routes }`.
2. Một dòng vào mảng `modules` của `src/index.ts`.
3. `src/architecture.test.ts`: khai `ALLOWED_EDGES["<tên>"]` (mọi cạnh import) VÀ đưa vào `STRICT` (kèm `repository.ts` dùng `defineSql`, import `.ts`) hoặc `LEGACY`.
4. Có bảng → migration (d) + `docs/data-dictionary.json` (`modules`, `tables`).
5. `tests/e2e/<tên>.mjs` + `ALL` trong `tests/e2e/run.mjs` (o).

**Kiểm:** `npm test` (kiến trúc) → `npm run typecheck` → `npm run test:e2e -- <tên>`.

**Bẫy:**
- Router khớp theo THỨ TỰ khai (`createApp` gom mọi route cùng số đoạn rồi `find` theo phương thức): `/api/parties/meta` phải đứng trước `/api/parties/:id`.
- POST/PUT/PATCH/DELETE thiếu `Origin` cùng site → 403 `cross_origin`; thân không phải JSON → 415 (router chặn trước handler).
- `docs/ARCHITECTURE.md` mục "Thêm một module mới" thiếu bước 3 và sổ dữ liệu (§6).
- Module ở tầng dưới có thể khai route dưới đường dẫn của module ở tầng trên (`dispatch` khai `PUT /api/orders/:id/handler`): router khớp theo đoạn nên chỉ cần đoạn cuối khác route của `orders`. Đặt route theo module CHỦ của hành vi (đổi người phụ trách là việc của `dispatch`), không theo tiền tố đường dẫn.
- Cần gọi hàm của module ở tầng DƯỚI ngược chiều phụ thuộc (`orders` cần biết người phụ trách của `dispatch`): KHÔNG import (bài kiểm kiến trúc đỏ vì vòng) — thêm hàm vào `AppOptions.injected` (`src/shared/router.ts`), nối ở `src/index.ts`, và lấy từ `ctx` trong handler (mẫu `ctx.isAssigned`, `ctx.defaultHandlerStatement`). `injected` là BẮT BUỘC để thiếu là lỗi `tsc`, không phải lặng lẽ tụt quyền.

### c. Thêm trang web

**Sửa theo thứ tự:**
1. `public/<tên>.html`: copy nguyên `<head>` của `public/locations.html` (đủ thẻ meta iOS, `theme-color`, `manifest`, `apple-touch-icon`), đổi `<title>Tên — Tour Đảo Booking</title>`.
   - Thân: `<header id="topbar"></header>`, `<div id="error" class="alert" role="alert" hidden>`, `<script type="module" src="/js/<tên>.js">`.
   - `<body data-title data-back data-tabbar="off">` tuỳ trang. KHÔNG script inline (CSP `script-src 'self'`).
2. `web/<tên>.ts`: `const staff = await initShell();` (`web/shell.ts`) làm việc đầu; kiểm quyền bằng `hasPermission`/`can` (`src/shared/permissions`, import KHÔNG đuôi `.ts`); lỗi hiện bằng `showError`.
3. `package.json` → script `build:web`: thêm `web/<tên>.ts` vào lệnh esbuild đầu (danh sách liệt kê từng tệp).
4. `src/shared/sw-policy.ts`: thêm `"/<tên>"` (không `.html`) vào `PAGES`. Chỉ thêm `PRECACHE` nếu muốn nạp sẵn (hiện chỉ 5 trang lõi).
5. Điều hướng: `web/shell.ts` (`tabsFor` cho thanh tab điện thoại, `replaceChildren(nav, …)` cho thanh trên máy tính); mục ở tab "Tôi": `web/account.ts`.
6. Quyền: ẩn/hiện ở web KHÔNG thay cho `access` của route (e).
7. `tests/e2e/pwa.mjs` KHÔNG cần sửa: nó duyệt mọi trang của `PAGES` (thẻ meta iOS, `theme-color`, `— ${NAME}</title>`, không còn tên cũ) và vòng `PAGES ∪ PRECACHE` kiểm trang trả 200 + qua `isCacheable` — thêm vào `PAGES` là được kiểm ngay.

**Kiểm:** `npm test` (`sw-policy.test.ts` so `PAGES` với `readdirSync(public/*.html)` bằng `deepEqual`: thêm HTML mà quên `PAGES` là ĐỎ) → `npm run build:web` → `npm run typecheck` → `npm run test:e2e -- pwa`.

**Bẫy:**
- `public/js/` và `public/sw.js` không nằm trong git; `wrangler dev`/`deploy` tự chạy `build:web` (`wrangler.jsonc` → `build.command`).
- Chỉ `/api/*` chạy Worker trước (`run_worker_first`); phần còn lại do Workers Assets phục vụ (đường dẫn KHÔNG có `.html`).

### d. Migration (cột, bảng, view, trigger)

**Số kế tiếp (hiện tại):**
- Tệp cuối hiện là `0014_dispatch.sql` (bản v1.0, task 5: bảng/view phân công + backfill người phụ trách; trước đó `0013_company_email.sql`, task 1: chỉ điền email công ty). Cả hai đã có trong nhánh, CHƯA lên production — production mới tới `0012`. **Số kế tiếp:** `0015`; B5 (`staff_party_required`: trigger bắt buộc `party_id` + giữ quản trị viên cuối) lấy số KẾ TIẾP sau `0014` khi được làm (nay là `0015` nếu không có migration nào chen vào) — không còn gắn với `0013`. Trước khi thêm migration mới, kiểm `migrations/` và `docs/superpowers/plans/` xem số đã bị giữ chưa.
- **Bẫy (đã xử lý):** `src/migrations-n1.test.ts` nhận biết "migration siết" B5 theo TÊN tệp (`isContractMigration`: tên chứa `staff_party_required`), KHÔNG theo số thứ tự — nên B5 lấy số kế tiếp nào cũng được. Trước đây nhận biết bằng `startsWith("0013")`, và thêm một `0013_*` khác sẽ tắt lặng lẽ khẳng định "trước migration siết không có trigger siết". Nếu đổi tên tệp B5 thì phải sửa `isContractMigration`.

**Sửa theo thứ tự:**
1. Tên `NNNN_mô_tả_không_dấu.sql`; chỉ THÊM: `CREATE TABLE/INDEX/VIEW/TRIGGER`, `ALTER TABLE … ADD COLUMN` NULL hoặc `DEFAULT` hằng (`REFERENCES` chỉ được khi mặc định NULL).
   - Không sửa tệp đã áp remote (0001–0012 đều đã áp), kể cả chú thích.
   - Đổi `CHECK`/`NOT NULL`, xoá cột, thêm giá trị vào `CHECK` (vd `orders.status`) = dựng lại bảng = expand–contract HAI lần phát hành (`docs/ARCHITECTURE.md` "Luật dữ liệu") + chủ dự án duyệt. Trigger không `ALTER` được: `DROP TRIGGER` rồi `CREATE TRIGGER`.
2. Bảng mới: tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_` — từ `0014`; sau này `bil_` — khai ở `TABLE_PREFIX`/`VIEW_PREFIX` trong `src/architecture.test.ts`); `created_at`/`updated_at` `TEXT NOT NULL` + `created_by`/`updated_by` `TEXT NULL` (không khoá ngoại); khoá ngoại `NO ACTION`; tra cứu khoá `code TEXT`; không xoá cứng (`valid_from/to` hoặc `active`). Mẫu: `migrations/0010_locations.sql`, `0011_parties.sql`.
3. `docs/data-dictionary.json` (bảng: `name`, `module`, `kind`, `legacy?`; view: `columns`; `integrityEdges`; `deprecatedColumns`) → `npm run dict` (sinh `docs/DATA-DICTIONARY.md`).
4. `src/architecture.test.ts`: `ALLOWED_EDGES` nếu có cạnh mới; đọc xuyên module chỉ qua view công bố `v_<tiền tố>_*`.
5. Bất biến mới → thêm một phần tử vào mảng `CHECKS` của **`scripts/audit-checks.mjs`** (tệp thuần; `scripts/audit-invariants.mjs` chỉ import nó): `{ code, what, sql: "SQL đếm dòng vi phạm (một câu, KHÔNG dấu ;)", level: "fail" | "warn-unless-strict" | "warn", mode?: "rows", note? }` (`warn-unless-strict` đỏ khi chạy `--strict`, mức của e2e — vd R-DSP-2a "người phụ trách không còn tài khoản/quyền"; `warn` là cảnh báo vĩnh viễn, không bao giờ đỏ — dùng cho tình trạng nghiệp vụ hợp lệ như R-DSP-2b "người phụ trách đã ngưng"). **Bắt buộc kèm test** trong `src/audit-invariants.test.ts` (chạy đúng câu SQL trên schema đầy đủ bằng `node:sqlite`: ca xanh, ca đỏ, và "dữ liệu khoẻ ⇒ 0 vi phạm ở mọi kiểm"); chỉ thử tay trên D1 tạm thì đột biến nào cũng lọt. Khoảng hiệu lực UTC (`valid_*_at`) so theo nửa mở `[từ, đến)` như `R-DSP-3` (đổi người = đóng và mở cùng một thời điểm nên đầu mút chạm nhau là hợp lệ). Script thoát mã 2 nếu D1 chưa có bảng mà một kiểm cần (vd `dsp_*` khi chưa áp `0014`) — chạy nó SAU khi áp migration.
6. Test riêng cho migration: dựng schema bằng `node:sqlite` từ `migrations/*.sql` (mẫu `src/migrations-n1.test.ts`, `src/modules/orders/migration.test.ts` — dùng `upTo(...)` để cố định phiên bản khi kiểm).
7. Áp local: `npm run db:migrate:local`. `npm run test:e2e` tự áp lên D1 tạm; chạy đủ bộ thì kết thúc bằng `audit-invariants --strict`.
8. Remote: CHỈ khi chủ dự án ra lệnh, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → `npx wrangler d1 time-travel info tourdao-sales-db` → test + typecheck + e2e xanh → `npm run db:migrate:remote` rồi `npx wrangler deploy` NGAY → `node scripts/audit-invariants.mjs --db remote`.

**Kiểm:** `npm test` (mọi migration chạy trong một SQLite bộ nhớ có khoá ngoại; lỗi cú pháp/backfill đỏ ngay) → `npm run test:e2e` (đủ bộ) → `npm run dict` nếu đổi sổ.

**Bẫy:** `wrangler d1 migrations apply` áp MỌI tệp chưa áp — không để migration "siết" lọt vào `migrations/` sớm. Đổi bảng `orders` (có `ON DELETE CASCADE` xuống dịch vụ/dòng tiền; trigger đóng băng không chặn được xoá chính đơn) phải giữ mọi trigger hiện có.

### e. Thêm quyền / thao tác

**Thao tác mới hoặc đổi một ô** (bản đồ là quyết định ADR-0007 đã duyệt; đổi ô = ADR mới do chủ dự án duyệt, không sửa ADR cũ):
1. `src/shared/permissions.ts`: thêm khoá vào `MATRIX` bằng `row(SALES, ACCOUNTING, ADMIN, FIELD)` (đúng thứ tự cột; phạm vi `none|own|assigned|ownOrAssigned|any`).
2. `src/shared/permissions.test.ts`: cập nhật bảng `ADR` (bản đọc độc lập, viết tay; `deepEqual` khoá danh sách thao tác nên sửa một nơi là ĐỎ) + bảng chân lý nếu có phạm vi mới.
3. Route: `access` phù hợp (b) và/hoặc `can(staff, "<thao tác>", { ownerId })` trong handler.
4. Web: ẩn/hiện bằng `can(staff, …)`/`hasPermission` (`web/shell.ts` `tabsFor`, `web/orders.ts`, trang liên quan). Máy chủ vẫn là nơi quyết định.
5. `tests/e2e/permissions.mjs` (route thật, cả bốn quyền).

**MÃ quyền mới** (vd `DISPATCH`) — ba nơi + migration:
1. `src/shared/permissions.ts`: `PERMISSION_CODES`, `PERMISSION_LABEL`, helper `row(...)` (thêm tham số) và MỌI hàng của `MATRIX` (thiếu là lỗi `tsc`).
2. Migration `INSERT INTO stf_permission_type (code, name, description, sort_order)` (`stf_permission.permission_type_code` có khoá ngoại tới bảng này; mẫu `migrations/0012_staff_permissions_party.sql`).
3. `public/staff.html`: checkbox `add-perm-<MÃ>` viết TAY, trong khi `web/staff.ts` lặp `PERMISSION_CODES` và gọi `byId("add-perm-<MÃ>")` — thiếu ô là NÉM LỖI khi mở `/staff`.
4. `permissions.test.ts` (mảng `ORDER`, bảng `ADR`); `tests/e2e/lib.mjs` (`ACCOUNTS` nếu cần tài khoản thử). `cleanPermissions` ở `src/modules/accounts/index.ts` tự theo `PERMISSION_CODES`.

**Kiểm:** `npm test` → `npm run typecheck` → `npm run test:e2e -- permissions admin dispatch`.

**Bẫy:**
- Hiện `order.create`, `order.history.view`, `order.modify`, `order.trip.edit` (module `orders`) và `dispatch.assign`, `dispatch.claim` (module `dispatch`, `mayChangeHandler`) được `can()` dùng ở route; `task.progress`, `contact.view`, `order.money.edit`, `payment.*`, `invoice.*` (N2/N3) và `admin.manage` có mặt để khoá bản đồ, chưa route nào dùng.
- `access: "admin"` là `hasPermission(who, "ADMIN")`, không đi qua `MATRIX`.
- ADR-0009 (accepted 2026-09-21) ĐÃ thi hành: `MATRIX` và bảng `ADR` của `permissions.test.ts` (task 4 bản v1.0) có ba ô `SALES` (`order.modify`, `order.history.view`, `dispatch.assign`) là `ownOrAssigned`, thêm `dispatch.claim`; `order.money.edit` giữ `own`. Module `dispatch` (task 6) tiêm `ctx.isAssigned` cho các route của `orders` nên người phụ trách khác người lập sửa được đơn; người lập giữ quyền sau khi giao lại. Người được giao phải là SALES/ADMIN đang hoạt động có hồ sơ (`checkAssignee`, hỏi ô `order.modify` với `assigned: true`).

### f. Thêm hành động nhật ký

**Sửa theo thứ tự:**
1. `src/shared/audit-actions.ts`: thêm `AUDIT_ACTIONS.<mã_snake_case> = { label: "<tiếng Việt, không trùng nhãn khác>", group }` (`group` ∈ `AUDIT_GROUPS`). KHÔNG cần migration (bỏ `CHECK` từ `0007`). `web/audit.ts` (bộ lọc) và `web/format.ts` (`actionLabel`) tự lấy từ đây.
2. Ghi nhật ký: `auditStatement(db, { staffId, action, at, orderId?, targetType?, targetId?, detail?, id? }, onlyIf?)` từ `src/modules/audit/index.ts`, đặt TRONG cùng `db.batch()` với thay đổi dữ liệu. `onlyIf` (thường `"changes() > 0"`) chỉ ghi khi thao tác thắng tranh chấp.
3. `detail`: KHÔNG ghi PIN/SĐT/email/MST/nội dung khách gõ tự do; chỉ mã, số tiền, nhãn ("đổi điểm đón").
4. Nhóm/loại đối tượng MỚI: thêm khoá vào `AUDIT_GROUPS`, rồi một `LEFT JOIN` + nhánh `targetLabel` trong `listAll` (`src/modules/audit/repository.ts`) để hiện nhãn. Hiện có `order`, `staff`, `party`, `location`; riêng `catalog` nhãn là chính `target_id` (mã dịch vụ).

**Kiểm:** `node --test src/shared/audit-actions.test.ts` → `npm test` → `npm run typecheck` → `npm run test:e2e -- orders` (`orders.mjs` kiểm `/api/audit`).

**Bẫy:** chỉ số thứ tự câu trong batch quyết định `changes() > 0` áp cho câu nào — không chèn câu mới GIỮA câu chốt và câu nhật ký của nó. `changes()` luôn nói về câu ghi NGAY TRƯỚC, nên chuỗi "chốt → câu ghi kế `WHERE changes() > 0` → nhật ký `changes() > 0`" chỉ đi tiếp khi mắt xích trước thắng (mẫu `src/modules/dispatch/service.ts`, chạy trên SQLite thật ở `service.test.ts`); module "nghiêm" không được đọc `audit_log` nên không dùng `wonGuard` của `orders`. Câu `INSERT … SELECT … WHERE changes() > 0` chèn 0 dòng thì `changes()` = 0 cho câu sau. `audit_log.action` không còn `CHECK` nên gõ sai mã chỉ bị bắt ở `insertStatement` (ném `Hành động nhật ký không hợp lệ`), không ở SQL.

### g. Đổi luật tính tiền / dịch vụ theo nhóm / theo người

**Sửa theo thứ tự:**
1. `src/shared/order-lines.ts`: `buildLines` (theo người → tối đa 4 dòng; `per<N>Pax` → 1 dòng, `quantity = ceil(khách / N)`), `parseUnit` (regex `^per(\d{1,3})Pax$`), `availableCodes`, `priceDeviation`.
   - Đơn vị tính MỚI: thêm nhánh vào `Unit`, `parseUnit`, `availableCodes`, `buildLines`; rồi `unitLabel`/`paxSummary`/`groupInfo` (`src/shared/service-form.ts`) và cờ `supported` (`parseUnit(...).kind !== "unknown"` ở `src/modules/catalog/index.ts`).
2. `src/modules/orders/service-rules.ts`: `catalogService` (bản chụp `kept`/`snapshotService`; so `catalogPriceSeen` → 409 `catalog_changed`), `manualService`, `validateService`.
3. `src/modules/orders/rules.ts` `validateOrder`: `subtotal`, `discount`, `total`, `remainingAmount`, `depositMethod`.
4. Xem trước ở giao diện dùng CHÍNH `buildLines`: `src/shared/service-form.ts` (`previewLines`, `draftSubtotal`, `orderSummary`, `draftIssues`) và `src/shared/order-view.ts` (`serviceView`).
5. SQL giữ bất biến tiền (migration `0007`): trigger `order_item_money_*` (`line_total = quantity * unit_price`), `orders_money_*` (`total = subtotal - discount`, `remaining_amount = total - deposit_amount`, cọc > 0 phải có hình thức). Đổi công thức = migration `DROP TRIGGER` + `CREATE TRIGGER` mới; KHÔNG chỉ sửa mã.

**Kiểm:** `node --test src/shared/order-lines.test.ts src/shared/service-form.test.ts src/modules/orders/service-rules.test.ts src/modules/orders/rules.test.ts` → `npm test` → `npm run typecheck` → `npm run test:e2e -- orders trip` (`trip.mjs` dùng danh mục GIẢ `ZT*`) → ba kịch bản Chrome.

**Bẫy:**
- Số xem trước ở web phải luôn bằng số máy chủ tính (một nguồn `buildLines`); tiền dẫn xuất chỉ do máy chủ tính, không tin số từ trình duyệt.
- `MAX_AMOUNT_VND` chặn mọi phép nhân; thêm phép nhân mới phải kiểm trần trước khi cộng dồn.
- Bản chụp (`kept`) chỉ giữ khi CÙNG mã và CÙNG số khách; giao diện phản chiếu bằng `setPax`/`CatalogDraft.saved`.

### h. Đổi giới hạn nghiệp vụ

| Hằng | Nơi | Ghi chú |
|---|---|---|
| `MAX_SERVICES` (20), `MAX_LINES_PER_ORDER` (50), `MAX_DAYS_AHEAD` (365), `confirmWindow` | `src/shared/trip-rules.ts` | `service-rules.ts` import lại/xuất lại; giao diện import trực tiếp; `MISSING_LABEL` nhắc số 365 |
| `MAX_GUESTS_PER_SERVICE` (50), `MAX_AMOUNT_VND` (100 tỷ), `CATALOG_CODE_RE` | `src/shared/order-lines.ts` (KHÔNG ở `service-rules.ts`) | dùng ở `buildLines`, `validatePax`, `service-form.ts` |
| `MAX_QUANTITY` (100_000) | `src/modules/orders/service-rules.ts` (hằng cục bộ, không xuất) | số lượng dòng nhập tay |
| Độ dài chữ (200/30/2000/1000 ở `validateOrder`; 200/1000 ở `validateTrip`; 300/1000 dòng nhập tay) | `rules.ts`, `service-rules.ts` | RẢI RÁC: còn `maxlength` ở `public/order-form.html`, `web/trip-fields.ts`, `web/service-card.ts` — đổi cả hai phía |
| Phân trang | `intParam(…, mặc định, min, max)` trong route | đơn 30/100, nhật ký 50/100 |
| Chống dò PIN | `src/modules/auth/throttle.ts` | xem l |
| Hết giờ gọi API | `REQUEST_TIMEOUT_MS` (45_000) ở `web/api.ts` | `a2-smoke-sheet.mjs` phụ thuộc chính giá trị này |

**Phép tính số câu D1 (làm TRƯỚC khi nâng `MAX_SERVICES`/`MAX_LINES_PER_ORDER`)** — S = số dịch vụ, L = số dòng tiền:
- Batch `createOrder` = `2 + S + L`; `updateDraftOrder` = `4 + S + L`; `updateTrip` = `2 + S`; `confirmOrder` = 2.
- Tạo tài khoản = 6; `POST /api/staff/sheet/apply` = `6N + 1` (N tài khoản).
- Ngoài batch còn các truy vấn đọc của cùng request: xác thực phiên (1), `getMeta` (1, chỉ khi sửa), `validationContext` (1 khi tạo, 3 khi sửa), `loadOrderView` (4). Tính cả request: `POST /api/orders` = `8 + S + L`; `PUT /api/orders/:id` = `13 + S + L`.
- Với S = 20, L = 50: batch 72 (tạo) / 74 (sửa); cả request 78 / 83 (khớp `docs/HANDOFF-N1.md` "còn mở" mục 5).
- Đối chiếu với giới hạn D1/gói Workers HIỆN HÀNH theo cách đếm của HANDOFF-N1; không chép con số giới hạn vào tài liệu (`docs/HANDOFF-N1.md` "Cổng bổ sung" §2).

**Kiểm:** `npm test` (các `*.test.ts` chứa số cũ) → `npm run test:e2e -- orders trip` (`trip.mjs` có ca trần) → `a2-smoke-form.mjs` (nhóm kiểm trần 50 dòng).

**Bẫy:** hạ trần không xoá được đơn đã lưu vượt trần — `updateDraftOrder` sẽ từ chối sửa đơn nháp cũ đó cho tới khi người dùng bớt bớt dịch vụ/dòng.

### i. Đổi giao diện: token, font, biểu tượng, chữ

**Token/màu:**
- Đổi giá trị ở `:root` của `public/app.css` (nhóm "Riêng của Tour Đảo Booking" dành cho token mới).
- Khối SAU dấu mốc `/* ---------- app iPhone (PWA)` CHỈ dùng token: không hex, `rgb()`/`hsl()`, `px` (trừ `1px`), `rem`/`em`; `@media (…)` được phép. `tests/e2e/pwa.mjs` quét khối đó sau khi bỏ chú thích và `@media`.
- Cổng đó KHÔNG bắt: tên màu (`red`), `%`, `vw`/`vh`/`ch`, `color-mix()` — tự kiểm.
- Đổi `--c-primary` phải đổi KHỚP `theme_color` của `public/manifest.webmanifest` và `<meta name="theme-color">` trong từng `public/*.html` (`pwa.mjs` bắt lệch ở mọi trang của `PAGES`).
- Ô gõ 16px (chống zoom iOS). Không `innerHTML` (dựng bằng `h()` ở `web/dom.ts`).

**CSP (`public/_headers`, một chính sách chung cho MỌI trang tĩnh):**
- Mở nguồn ngoài chỉ khi có lý do, đúng directive tối thiểu. Hiện có DUY NHẤT `https://challenges.cloudflare.com` cho Turnstile ở màn đăng nhập: `script-src`, `frame-src`, `connect-src`. `style-src`/`img-src` KHÔNG cần nới (đã đo bằng Chrome thật; `style-src` vốn có `'unsafe-inline'`). Không có `frame-src` thì `default-src 'self'` chặn khung widget. Chú ý `frame-src` chỉ liệt kê Cloudflare nên khung cùng nguồn (`'self'`) cũng bị chặn — hiện app không dùng iframe nào (`grep -rn iframe public web`); cần khung cùng nguồn thì thêm `'self'` vào `frame-src`.
- Vi phạm CSP KHÔNG hiện ở `console.error` mà ở miền `Log` của CDP: dùng `logEntries` của `openPage()` (`a2-cdp.mjs`). Kiểm bằng `v1-dang-nhap.mjs` (bước b khẳng định header, bước g khẳng định không có vi phạm ở trình duyệt) — CSP chỉ có khi trang được phục vụ qua Workers Assets (`wrangler dev`/production), không có ở `file://`.
- Nguồn ngoài mới thì thêm test cạnh khối Cloudflare ở `src/shared/sw-policy.test.ts` (service worker chỉ cache cùng nguồn; bài đó là hàng rào).

**Font (tự lưu trữ):**
- Tệp `.woff2` ở `public/fonts/`, tên chỉ `[A-Za-z0-9_-]` (khớp `STATIC_FILE` trong `src/shared/sw-policy.ts`); `@font-face` ở `public/app.css`; thêm vào `PRECACHE`.
- `pwa.mjs` khẳng định ĐÚNG 6 tệp (`fontUrls.length === 6`): đổi số font phải sửa số đó.
- CSP `font-src 'self' data:` ở `public/_headers` đã cho font cùng origin; font từ CDN phải sửa CSP (và `STATIC_FILE`).

**Biểu tượng:** `web/icons.ts` → thêm `tên: [["path", { d: "…" }]]` vào `SHAPES` (lưới 24×24, nét `currentColor`; `IconName` tự theo; dùng `icon("tên", cỡ)`). Icon PWA (PNG, không kênh alpha): quy trình ImageMagick ở `docs/PWA-IPHONE.md` "Dựng lại icon".

**Chữ hiển thị:** nằm ở HTML tĩnh, chuỗi trong `web/*.ts`, nhãn liệt kê (`STATUS_LABEL`, `METHOD_LABEL` ở `web/format.ts`; `PERMISSION_LABEL`; `PAX_LABEL`; `AUDIT_ACTIONS.*.label`; `MISSING_LABEL`; `unitLabel`) và thông báo máy chủ (m). Luật: tiếng Việt CÓ DẤU, không mã thô tiếng Anh lộ ra.

**Kiểm:** `npm run build:web` → `npm test` → `npm run typecheck` → `npm run test:e2e -- pwa`; chạm `web/order-form.ts|order.ts|trip-sheet.ts` → ba kịch bản Chrome; chạm `web/login.ts`, `public/login.html`, CSS của màn đăng nhập hoặc CSP → `v1-dang-nhap.mjs` (Chrome thật, cần mạng).

**Bẫy:** `.counter { overflow: hidden }` xén vòng focus (§4 mục 8); `.row-off { opacity: .6 }` làm chữ dưới tương phản 4,5:1 ở `/catalog`, `/staff`, `/locations`, `/parties` (nợ có sẵn, xem README bằng chứng A2).

### j. Đổi thông tin công ty / tên app / số phiên bản

**Hiện trạng** (tên app còn nhiều bản sao phải khớp; thông tin công ty và số phiên bản mỗi thứ đã có MỘT nguồn):
- Tên app "Tour Đảo Booking": nguồn khai là `public/manifest.webmanifest` (`name`; `short_name` = "Tour Đảo"; `pwa.mjs` coi là nguồn). Bản sao phải khớp:
  - 10 × `public/*.html` (`<title>… — Tour Đảo Booking` và `apple-mobile-web-app-title`);
  - `public/login.html` (`<h1>`); `web/shell.ts` (brand: `"Tour Đảo "` + `<span>Booking</span>`); `web/order.ts` (`document.title`).
- Thông tin công ty (tên pháp lý, MST, địa chỉ, hotline, email): nguồn là bảng `company_profile` (migration `0002`, một dòng `'default'`; `0013_company_email` điền email). Module `company` (`src/modules/company/`) đọc nó qua `GET /api/company` (public, chỉ đọc, DTO `CompanyDto` không có Zalo/logo/người sửa). Màn đăng nhập (`web/login.ts`) dựng khối ở chân trang từ đó (`#company`): tên (đậm), "Địa chỉ: …", "Email: …" (ẩn khi `null`), "MST: …" — chữ đúng như dữ liệu (viết hoa như DB, không đổi hoa/thường); API lỗi hoặc chậm thì khối ẩn, KHÔNG chặn đăng nhập. Cũng là nguồn của đầu ảnh xác nhận đơn (`headerBlock` trong `src/shared/order-confirmation.ts`: tên, MST, địa chỉ, hotline, email) — công thức p.
- Số phiên bản: hằng ở `src/shared/app-info.ts` (`APP_NAME`, `APP_VERSION`, `APP_RELEASE_DATE`, `formatReleaseLine()` → "Phiên bản 1.0 · ngày 21 tháng 9 năm 2026"); phát hành mới chỉ sửa tệp này. `package.json` không có `version`. Mã bản dựng `__BUILD_ID__` (`build:web` chèn vào `public/sw.js` → tên cache `td-shell-<mã>`) là thứ khác, không hiển thị. Màn đăng nhập hiện `formatReleaseLine()` ở `#release` (luôn hiện, kể cả khi API công ty lỗi: là hằng trong mã, không đi qua API).

**Đổi tên app hôm nay:** sửa tất cả nơi trên rồi chạy `npm run test:e2e -- pwa` (đối chiếu manifest ↔ HTML ↔ bundle `web/shell.ts`). Không đổi tên Worker/D1 `tourdao-sales`.

**Đổi số phiên bản / ngày phát hành:** sửa `APP_VERSION`, `APP_RELEASE_DATE` ở `src/shared/app-info.ts` (và ô kỳ vọng ở `src/shared/app-info.test.ts`) — hằng trong mã, không đi qua esbuild `--define`. **Đổi thông tin công ty:** sửa dòng `company_profile` (migration dữ liệu như `0013_company_email.sql`; giao diện sửa hồ sơ là M5, chưa làm); `GET /api/company` chỉ trả năm trường của `CompanyDto`, muốn lộ thêm trường phải sửa `CompanyDto` + câu `SELECT` tường minh ở `src/modules/company/repository.ts` + `tests/e2e/company.mjs` (nó khoá đúng tập khoá).

**Kiểm:** `npm run build:web` → `npm test` → `npm run test:e2e -- pwa company`; đổi chữ hiển thị ở màn đăng nhập → `v1-dang-nhap.mjs`.

**Bẫy:** `pwa.mjs` kiểm tên/meta trên mọi trang của `PAGES` và tên trong bundle `web/shell.ts`, nhưng KHÔNG kiểm `document.title` ở `web/order.ts` — tự soát bằng `grep -rn "Tour Đảo" web public`. `APP_NAME` (`src/shared/app-info.ts`) phải trùng `name` của manifest (`app-info.test.ts` kiểm) nhưng CHƯA có nơi nào ở `web/` dùng nó — các bản sao tên app ở trên vẫn viết tay (`web/login.ts` mới dùng `formatReleaseLine()`). Kịch bản Chrome `v1-dang-nhap.mjs` (bước a) ghi CỨNG chữ kỳ vọng (`EXPECT`: dòng phiên bản, tên/địa chỉ/email/MST của công ty): đổi số phiên bản hoặc dữ liệu công ty thì sửa `EXPECT` ở đó. Kế hoạch v1.0 (`docs/superpowers/plans/2026-09-21-v1-0-thi-cong.md`): task 11 hoàn thiện mục này.

### k. Đồng bộ danh mục / Sheet / Cron

**Bản đồ `src/modules/catalog/`:**
- `sheet.ts`: `parseCatalogSheet` đọc CSV thuần. Cột đọc: "Mã tour", "Tên tour", "Đơn vị", "Giá người lớn/trẻ em/người cao tuổi/em bé", "Ghi chú trẻ em/…". CỐ Ý không đọc "Khoá giá", "Đường dẫn", "Ghi chú nội bộ".
- `rules.ts`: `planSync`; `syncGuard` (ẩn > 50% khi ≥ 4 dịch vụ, hoặc Sheet rỗng → 409 `sync_guard`; `force: true` để bỏ qua); `applyOverride`/`patchOverride`/`acknowledge`/`toEffective`.
- `service.ts`: `syncCatalog`, `bootstrapIfNeverSynced`.
- `repository.ts`: `applySync` chỉ chạm `catalog_item`, KHÔNG đụng `catalog_override`; ghi theo lô `CHUNK` = 40 câu, không nguyên tử xuyên lô (lần sau tự lành).
- `index.ts`: route + `getEffectiveServices` (đường DUY NHẤT `orders` đọc giá hiệu lực).

**Thêm một cột Sheet:**
1. Migration `ALTER TABLE catalog_item ADD COLUMN …`.
2. `sheet.ts`: `findColumn(header, "tên cột", …)` (so khớp không phân biệt hoa/thường, gộp khoảng trắng) + `CatalogInput`.
3. `rules.ts`: `CatalogRecord` + `planSync` (so sánh/nhật ký).
4. `repository.ts`: `Row`, `toStored`, VÀ câu `upsert` trong `applySync` (hai danh sách cột: `INSERT` và `ON CONFLICT DO UPDATE`).
5. `CatalogService` (`src/shared/order-lines.ts`) / DTO ở `contracts.ts`; `web/catalog.ts`, `web/catalog-picker.ts`.

**Ghi đè của admin:** bảng `catalog_override` (`hidden`, `prices_json`, `base_json` = giá Sheet lúc ghi đè, để phát hiện Sheet đổi giá sau ghi đè).

**Nhân viên từ Sheet:**
- `src/modules/staff/sheet.ts` `parseStaffSheet(csv, checkName)`; cột "Tên người dùng", "Số điện thoại"; mọi ứng viên chỉ có quyền `SALES`.
- Route ở `src/modules/accounts/index.ts`: `GET /api/staff/sheet` (xem trước), `POST /api/staff/sheet/apply` (gộp MỘT batch). Script dự phòng: `scripts/import-staff.mjs`.

**Cron:**
- Lịch ở `wrangler.jsonc` `triggers.crons` (hiện `*/15 * * * *`); ID Sheet ở `vars.SERVICES_SHEET_ID`, `vars.STAFF_SHEET_ID`.
- `src/index.ts` `scheduled(_event, env, ctx)` gọi `ctx.waitUntil(runScheduledSync(env))`.
- Thêm bước: export `runXxx(env)` từ `index.ts` của module (tự bắt lỗi, không ném — như `runScheduledSync`); gọi bằng `ctx.waitUntil` RIÊNG để một bước lỗi không huỷ bước khác; nhiều lịch → phân biệt bằng `event.cron`.
- Người thao tác `null` → nhật ký hiện "Hệ thống (tự động)" (`SYSTEM_ACTOR_NAME`).
- Thử: e2e bật `--test-scheduled`; `tests/e2e/catalog.mjs` gọi `/__scheduled?cron=*/15+*+*+*+*`.

**Kiểm:** `node --test src/modules/catalog/sheet.test.ts src/modules/catalog/rules.test.ts` (nhân viên: `src/modules/staff/sheet.test.ts`) → `npm test` → `npm run test:e2e -- catalog admin`.

**Bẫy:** e2e đọc Google Sheet THẬT (cần mạng); đổi dữ liệu Sheet thì sửa assertion `TD101`, `TD103` ở `catalog.mjs`. Sheet phải để chế độ "Bất kỳ ai có liên kết – Người xem"; app không bao giờ ghi ngược vào Sheet.

### l. Đăng nhập / PIN / phiên / biến môi trường / bí mật

**Luật (mọi con số là hằng trong mã):**
- PIN 6 số: `isValidPin` (`src/modules/staff/phone.ts`); PIN yếu `isWeakPin`, `generatePin` (`staff/rules.ts`); PIN mới `validateNewPin` (`staff/index.ts`).
- Băm PBKDF2: `PBKDF2_ITERATIONS` = 100_000 (trần của Workers) ở `staff/password.ts`; định dạng `pbkdf2$sha256$<vòng>$<salt>$<hash>` (hash cũ vẫn kiểm được vì lưu số vòng); `verifyDummy` cho SĐT lạ (chống lộ tồn tại).
- Phiên: cookie `td_session`, hạn `SESSION_TTL_SECONDS` = 7 ngày, `HttpOnly; SameSite=Lax` (+`Secure` khi https) ở `src/modules/auth/session.ts`; `staff.credentials_changed_at` làm mọi phiên cũ hết hiệu lực (`getActiveStaff`).
- Chống dò (`auth/throttle.ts`): `PHONE_LIMIT` 5, `IP_LIMIT` 30, `LOGIN_WINDOW_MS` 15 phút; ĐẶT CHỖ trước khi kiểm PIN; IP lấy từ header `cf-connecting-ip`; đổi PIN dùng chung bộ đếm qua `verifyPinThrottled`.

**Web:**
- `public/login.html` + `web/login.ts` (`safeNext` ở `src/shared/safe-next.ts` chặn open-redirect; còn lo widget Turnstile — mục dưới — và chân trang công ty/phiên bản — công thức j); `public/account.html` + `web/account.ts` (đổi PIN).
- `web/api.ts` `api()`: 401 ngoài `/api/auth/login` → `goLogin()` (giữ lời gọi treo).
- Header bảo mật/CSP ở `public/_headers` (`script-src 'self'` + `https://challenges.cloudflare.com` cho Turnstile, không inline; xem công thức i).

**Biến/bí mật:**
- Giá trị KHÔNG bí mật (ID Sheet) → `wrangler.jsonc` `vars`.
- Bí mật → `.dev.vars` cho local (gitignored; mẫu `.dev.vars.example` khai tên) và `npx wrangler secret put <TÊN>` cho production (CHỈ khi chủ dự án ra lệnh; không commit khoá).
- Sau khi thêm: cập nhật `worker-configuration.d.ts`. **Bẫy: `wrangler types` chỉ thấy bí mật có trong `.dev.vars` (tệp này gitignored, không có trong worktree mới)** — chạy `npm run types` khi thiếu tệp đó thì `SESSION_SECRET`/`TURNSTILE_SECRET_KEY` biến mất khỏi kiểu `Env` và `tsc` đỏ. Hoặc tạo `.dev.vars` tạm đủ tên rồi xoá sau khi sinh, hoặc khai tay hai chỗ đầu tệp (`__BaseEnv_Env` và `Pick<…>` của `NodeJS.ProcessEnv`) — `TURNSTILE_SITE_KEY?`/`TURNSTILE_SECRET_KEY?` hiện được khai tay, tuỳ chọn vì có thể vắng.
- Kiểm cấu hình lúc chạy theo mẫu `checkAuthConfig` (`auth/index.ts`, truyền vào `createApp({ checkConfig })`): thiếu → 500 `server_misconfigured` + log, không lộ giá trị. e2e đặt `SESSION_SECRET` qua `wrangler dev --var`. (Turnstile KHÔNG đi qua `checkAuthConfig`: chưa đặt secret là trạng thái hợp lệ "tắt", không phải lỗi cấu hình.)

**Turnstile (máy chủ + giao diện đã có):**
- `src/modules/auth/turnstile.ts` (thuần, có test): `verifyTurnstile({ secret, token, ip, timeoutMs? }, fetchImpl)` gọi siteverify (POST form `secret`/`response`/`remoteip`, `remoteip` chỉ khi đúng là IP), hạn chót `TURNSTILE_TIMEOUT_MS` = 5 giây; trả `ok` / `failed` (→ 403) / `unavailable` (→ 503). `turnstileGate(env, token, ip)` là quyết định của route; `turnstileSecret`/`turnstileSiteKey` đọc cấu hình.
- `POST /api/auth/login` nhận `turnstileToken` và kiểm Turnstile SAU khi xác nhận đầu vào (400) nhưng TRƯỚC `verifyPinThrottled`: thiếu/sai/hết hạn/đã dùng token → **403 `turnstile_failed`** (không tiêu hao lượt PIN của SĐT lẫn IP), siteverify không trả lời/lỗi/hết giờ/secret sai → **503 `turnstile_unavailable`** (đóng khi lỗi). Cả hai đều ghi MỘT dòng nhật ký (`turnstile_failed` warn / `turnstile_unavailable` error, kèm `detail` là mã lý do đã lọc; KHÔNG có secret/token/IP): dòng do `turnstileLog` (thuần, có test) dựng, route `turnstileBlockResponse` (`auth/index.ts`, chỗ duy nhất dựng Response — khác `turnstileGate` thuần) chỉ in ra. `MAX_TOKEN_LENGTH` (2048) là ngưỡng GIẢ ĐỊNH chưa đối chiếu với tài liệu Cloudflare: đối chiếu trước khi đặt khoá thật. Đổi PIN (`/api/account/change-pin`) KHÔNG đòi Turnstile.
- `GET /api/auth/config` (public, `AuthConfigResponse`): `{ turnstileSiteKey }` — khoá site khi có CẢ `TURNSTILE_SECRET_KEY` lẫn `TURNSTILE_SITE_KEY`, còn lại `null`.
- **Chưa đặt `TURNSTILE_SECRET_KEY` ⇒ TẮT**: đăng nhập bỏ qua bước này, `config` trả `null`, máy chủ `console.warn` (`turnstile_disabled`) MỖI lần đăng nhập. Có secret mà thiếu khoá site ⇒ VẪN kiểm nhưng không ai đăng nhập được (trang không dựng được widget) và log `turnstile_misconfigured` — luôn đặt đủ cả hai. Sau deploy phải kiểm `GET /api/auth/config` không còn `null` (checklist triển khai ở mục "Triển khai" của đặc tả v1.0).
- Cấu hình: `TURNSTILE_SITE_KEY` (công khai) → `vars` của `wrangler.jsonc` khi có khoá thật (CHƯA thêm — chờ khoá thật lúc deploy, xem checklist triển khai); `TURNSTILE_SECRET_KEY` (bí mật) → `wrangler secret put` (chỉ khi chủ dự án ra lệnh). Local/e2e dùng khoá thử của Cloudflare (`TURNSTILE_TEST` ở `tests/e2e/lib.mjs`: site `1x00000000000000000000AA`, secret luôn đạt `1x0000000000000000000000000000000AA`, luôn hỏng `2x…AA`, "token đã dùng" `3x…AA`; token thử `XXXX.DUMMY.TOKEN.XXXX`) — `.dev.vars.example` ghi cách.
- **Giao diện (`web/login.ts`, `public/login.html`):** trang gọi `GET /api/auth/config`; có khoá thì hiện khung `#turnstile-widget`, tải `api.js?render=explicit` BẰNG SCRIPT ĐỘNG (không nhúng trong HTML: lúc Turnstile tắt trang không chạm Cloudflare) rồi `turnstile.render` (chủ đề `auto`, `language: "vi-vn"`, cỡ `flexible`, hoặc `compact` khi lòng thẻ < 300 px). Nút Đăng nhập khoá khi chưa biết cấu hình (tối đa 3 giây, rồi coi như không có widget), khi đang gửi, và tới khi widget có token; `turnstile.reset()` sau MỌI lần đăng nhập thất bại (kể cả sai PIN: cổng Turnstile chạy trước PIN nên token đã bị đốt); lỗi 403/503 của máy chủ hiện NGUYÊN VĂN ở `#error`; script không tải/`render` lỗi/`error-callback` ⇒ thông báo tiếng Việt + nút "Thử lại" (không có nút khoá mà không lời giải thích); `expired-callback` xoá token (widget tự lấy token mới). Không có khoá site ⇒ không dựng widget và không gửi `turnstileToken`. Đặt secret ở production BẮT BUỘC kèm khoá site (`vars`): thiếu khoá site thì widget không dựng được và không ai đăng nhập được. **Thứ tự deploy: khoá site (`vars`) đi cùng MÃ, còn `wrangler secret put TURNSTILE_SECRET_KEY` đặt SAU, khi nhân viên đã mở app một lần** (service worker phục vụ `login.js` từ cache; iPhone đã cài PWA có thể còn `login.js` cũ không gửi token ⇒ 403 nếu bật kiểm quá sớm) — xem `docs/HANDOFF-N1.md` mục "Lần phát hành v1.0".
- **Bẫy widget (đã dính, đừng lặp lại):** (1) id của khung widget KHÔNG được là `turnstile` — phần tử có id thành `window.<id>` và che `window.turnstile` (khung dùng id `turnstile-widget`); (2) đừng gọi `turnstile.ready()` khi script nạp động/`async` — nó ném lỗi; gọi `render` sau sự kiện `load` của script; (3) khung iframe của widget nằm trong shadow root ĐÓNG: `querySelector('iframe')` không thấy — nhận biết widget bằng ô ẩn `cf-turnstile-response`; (4) khoá thử luôn phát token `XXXX.DUMMY.TOKEN.XXXX` nên "token mới" không so được bằng giá trị; (5) dải chữ đỏ trong khung widget là của khoá thử, không phải của app.

**Kiểm:** `node --test src/modules/staff/password.test.ts src/modules/staff/rules.test.ts src/modules/auth/turnstile.test.ts` → `npm test` → `npm run test:e2e -- admin turnstile platform`; chạm `web/login.ts`/`public/login.html`/CSP → `v1-dang-nhap.mjs` (Chrome thật, cần mạng; ghi rõ cách chạy ở đầu tệp).

**Bẫy:** e2e dùng `freshIp()` (header `cf-connecting-ip` giả) để không tự dính giới hạn theo IP; đổi số lần thử phải sửa `admin.mjs` (chống dò kể cả bắn song song). Server e2e BẬT Turnstile bằng khoá thử (`run.mjs`, `--var`) nên MỌI đăng nhập trong kịch bản phải đi qua `login()`/`session()` của `lib.mjs` (gửi token thử; đừng tự `call(… "/api/auth/login" …)`), và mỗi đăng nhập gọi siteverify thật (cần mạng). Kịch bản Chrome: `startEnv()` (`a2-cdp.mjs`) mặc định chạy máy chủ với Turnstile TẮT có chủ đích (`--var TURNSTILE_*:` rỗng ghi đè `.dev.vars`); `startEnv({ turnstile: true })` BẬT bằng khoá thử (`v1-dang-nhap.mjs`, cần mạng).

### m. Thông báo lỗi ở giao diện

**Sửa theo thứ tự:**
1. Máy chủ: `error(status, "<mã>", "<tiếng Việt>")` (`src/shared/http.ts`). Lỗi kèm dữ liệu → khai kiểu trong `contracts.ts` như `IncompleteTripBody`, `CatalogChangedBody` và trả bằng `satisfies`.
2. `src/shared/order-errors.ts` `classifyOrderError(e, ctx)`: nhánh theo `status` + `code` (`stale`, `not_editable`, `client_outdated`, `catalog_changed`, `incomplete_trip`, `catalog_unavailable`, 400 chung); dựng banner bằng `banner(tone, title, { lines, action, focusService, refreshCatalog })`; `NETWORK_BANNER` cho mất mạng. `web/api.ts` gói thân lỗi vào `ApiError.details` (`changes[]`, `missing[]`).
3. Vẽ: `web/banner.ts` `renderBanner` (nút "Tải lại đơn/trang" theo `action`). Trang đơn hậu xử lý ở `web/order.ts` `errorBanner` (409 mặc định → `reload_order`, TRỪ `incomplete_trip`).
4. Test `src/shared/order-errors.test.ts`; nhãn lý do ở `MISSING_LABEL` (`trip-rules.ts`).

**Kiểm:** `node --test src/shared/order-errors.test.ts` → `npm test` → `npm run typecheck` → `npm run test:e2e -- orders trip` → ba kịch bản Chrome (banner là hành vi web).

**Bẫy:** `serviceIndexOf` và nhánh `/^Dịch vụ \d+: không thuộc đơn này/` dựa vào TIỀN TỐ chữ "Dịch vụ N" mà `validateService`/`validateTripUpdate` sinh (`at = "Dịch vụ ${index + 1}"`). Đổi câu chữ ở máy chủ là làm hỏng cuộn-tới-thẻ mà `tsc` không báo.

### n. Thêm cột / ô lọc cho danh sách đơn

**Sửa theo thứ tự:**
1. Cột từ chính `orders`: `OrderSummaryDto` (thêm khoá vào `Pick<OrderDto, …>`) ở `contracts.ts`; ánh xạ trong `listOrders` (`src/modules/orders/repository.ts`, trả object tường minh từ `toDto(r)`); hiển thị ở `row()` của `web/orders.ts`; CSS `.order-row*` ở `public/app.css`.
2. Cột từ module khác (vd "Người phụ trách" của N2): chỉ qua VIEW công bố `v_<tiền tố>_*` của module chủ + `docs/data-dictionary.json` (`views`) + `ALLOWED_EDGES` (d); không JOIN thẳng bảng gốc.
3. Ô lọc/tìm: đọc tham số ở `GET /api/orders` (`src/modules/orders/index.ts`; giá trị sai → 400 `invalid_input`, mẫu `status`), truyền vào `listOrders(db, { q, status, limit, offset })`, thêm `where.push(…)` + `binds.push(…)` (dùng `escapeLike` và `ESCAPE '\'` cho `LIKE`); UI ở `public/index.html` (`.toolbar`) + `params.set(…)` trong `load()` của `web/orders.ts`.
4. Test: `tests/e2e/orders.mjs` (phân trang, lọc, `hasMore`).

**Kiểm:** `npm test` → `npm run typecheck` → `npm run test:e2e -- orders` → `npm run build:web`.

**Bẫy:** `orders` còn ở `LEGACY` (SQL chưa `defineSql`) nhưng vẫn không được đọc `staff.full_name`/`staff.role` (bài kiểm R-N1-14): tên người lập lấy từ `v_stf_staff_label`. Tìm kiếm `LIKE` không bỏ dấu tiếng Việt.

### o. Thêm kịch bản e2e (API) / kịch bản Chrome (giao diện)

**e2e API** — `tests/e2e/<tên>.mjs`, chạy bằng `node`:
1. `import { ACCOUNTS, call, login, session, sql, sqlRows, orderInput, manualService, randomPhone, vnDate } from "./lib.mjs"`. `call(cookie, method, path, body)` đã gắn `Origin` + `cf-connecting-ip` ngẫu nhiên. Đăng nhập luôn qua `login(phone, pin, ip?)`/`session(account)` (gửi token Turnstile thử — server e2e bật Turnstile).
2. `assert` từ `node:assert/strict`; in `✓ …` từng nhóm; kết thúc bằng một dòng `E2E … OK`; lỗi = thoát khác 0.
3. Thêm tên vào `ALL` ở `tests/e2e/run.mjs`. Thứ tự CÓ nghĩa: `admin-race` tạm ngưng admin khác nên chạy gần cuối; `catalog.mjs` cần D1 CHƯA từng đồng bộ danh mục (`tests/e2e/README.md`).
4. Thêm dòng vào bảng của `tests/e2e/README.md`. Tài khoản thử mới → `ACCOUNTS` trong `lib.mjs` (`run.mjs` nạp bằng `insertStaffSql`).
5. Mọi kịch bản dùng CHUNG một D1 tạm → dùng dữ liệu độc nhất (`randomPhone()`, mã có `Date.now()`), dọn ở `finally` (mẫu `trip.mjs`: danh mục giả `ZT*`).

**Chạy e2e:** `npm run test:e2e -- <tên>` (chạy lẻ KHÔNG chạy `audit-invariants`). Lẻ trên server có sẵn: đặt `E2E_BASE_URL`, `E2E_PERSIST_TO` rồi `node tests/e2e/<tên>.mjs`.

**Chrome (giao diện, ngoài CI)** — sao chép cấu trúc `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs`:
1. `const env = await startEnv()` (D1 tạm + `wrangler dev` + Chrome headless qua CDP, không thêm dependency).
2. `env.as(ACCOUNTS.x, "/đường-dẫn")` mở trang đã đăng nhập; `p.waitFor(biểu-thức, "mô tả")`, `p.ev(…)`, `setInput`, `clickText`, `ok("…")`.
3. Dựng dữ liệu bằng API (`env.login` + `fetch`), không dùng API để kiểm giao diện.
4. Chạy từ GỐC repo: `npm run build:web && node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-form.mjs`. `CHROME_BIN` mặc định là Chrome macOS; `chrome-wrap.sh` cứng đường dẫn macOS; `AXE_JS` cho `a2-evidence.mjs` và `v1-dang-nhap.mjs`.
5. Viết phép kiểm ĐỎ trên mã cũ trước khi sửa. Ghi kết quả vào `docs/evidence/…` nếu là bằng chứng nghiệm thu.
6. Mẫu cho trang có bên thứ ba hoặc nhiều trạng thái: `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` — mỗi bước là `step()` in ✓/✗ (không dừng ở bước hỏng đầu tiên nên thấy đủ "đỏ"), hai máy chủ nối tiếp (Turnstile bật/tắt), ghi trạng thái nút bằng `MutationObserver` chèn qua `Page.addScriptToEvaluateOnNewDocument` (chạy trước mã trang), chặn URL bằng `Network.setBlockedURLs`, làm chậm/giả lỗi API bằng cách bọc `window.fetch` trước mã trang, và nhớ `Network.clearBrowserCookies` (Chrome dùng chung cookie giữa các tab: phiên cũ làm `/login` chuyển đi ngay).

**Bẫy:** `a2-cdp.mjs` có `ACCOUNTS` riêng (không dùng chung `lib.mjs`); `startEnv()` lỗi giữa lúc khởi động có thể để mồ côi `wrangler dev`/Chrome. `startEnv()` chạy máy chủ với Turnstile TẮT (`--var TURNSTILE_*:` rỗng), `startEnv({ turnstile: true })` BẬT bằng khoá thử; `env.login` luôn gửi token thử — xem công thức l. `openPage()` trả thêm `logEntries` (thông điệp do trình duyệt tự ghi, gồm vi phạm CSP), `requests`, `failed`.

### p. Đổi mẫu ảnh xác nhận đơn gửi khách (PNG) / hộp thoại

Ba lớp, đổi đúng lớp:
1. **Nội dung** (chữ nào hiện, thứ tự, định dạng tiền/ngày, ẩn dòng rỗng, KHÔNG lộ dữ liệu nội bộ): `src/shared/order-confirmation.ts` (`buildConfirmation`) + `order-confirmation.test.ts`. Mọi chuỗi đi qua `clean()` (bỏ ký tự điều khiển/bidi, NFC). Thêm trường mới vào mô hình = thêm vào kiểu khối + test "đủ trường" + test "KHÔNG lộ nội bộ" + đọc nó ở bộ vẽ. Ghi chú vận hành của dịch vụ, nhãn khác giá, mã danh mục, id, ghi chú thanh toán, người lập KHÔNG bao giờ được in.
2. **Bố cục/màu/phông** (canvas): `web/confirmation-image.ts`. Hằng bố cục (khổ 720, lề 40, cỡ chữ, khoảng cách) ở đầu tệp và trong từng hàm khối; màu và họ phông CHỈ lấy từ token `:root` qua `readTheme()` (`COLOR_TOKENS`; thiếu token = lỗi, không màu dự phòng) — đổi màu = đổi token ở `public/app.css`. Muốn thêm màu mới thì thêm token, không viết hex vào `.ts`. Bố cục là `layoutConfirmation` (danh sách lệnh vẽ theo px CSS, đo bằng `canvas.measureText`) rồi mới `paint` — đổi bố cục không đụng phần vẽ. Ngắt dòng ở `src/shared/text-wrap.ts` (thuần, có test).
3. **Hộp thoại/luồng**: `web/confirmation-dialog.ts` (khuôn `trip-sheet.ts`, CSS `.confirm-*` + `.sheet-wide` ở cuối `public/app.css`, chỉ token), nút và `moi=1` ở `web/order.ts`, `web/order-form.ts`.

**Luật cần nhớ:**
- Tiền chỉ vẽ ở ô nguyên khối căn phải; không đưa chuỗi tiền vào bộ ngắt dòng. Cột số đo theo chuỗi dài nhất của MỌI dịch vụ; hết chỗ thì bảng chuyển hai hàng (`Cols.stacked`).
- Chờ phông TRƯỚC khi đo: `document.fonts.load` cho mọi họ × độ đậm KÈM chữ của mô hình (mỗi họ có hai tập con theo `unicode-range`; thiếu chữ mẫu thì tập tiếng Việt chưa nạp). Đo bằng phông dự phòng rồi vẽ bằng phông thật làm chữ đè nhau.
- Diện tích canvas ≤ 2²⁴ điểm ảnh (iOS Safari): `chooseScale` hạ độ phân giải cho đơn quá cao (> ~5.800 px CSS ở độ phân giải 2). Đơn cỡ tối đa (20 dịch vụ, 50 dòng, chữ rất dài) ra ảnh ~900 px ngang.
- Đơn nháp chưa có ngày khởi hành: ảnh KHÔNG có dòng "Khởi hành" (cố ý — không in cảnh báo nội bộ; nếu muốn báo trước khi gửi thì làm ở hộp thoại).
- CSP `connect-src` KHÔNG cho `blob:` nên không `fetch("blob:…")` (app không cần; kịch bản Chrome lấy Blob từ nơi tạo URL). `img-src blob:` đủ cho `<img>` và `<a download>`.
- Blob URL phải được thu hồi khi đóng/thử lại (kịch bản bước c kiểm).
- Nút "Xác nhận gửi khách" nằm ở `#send`, NGOÀI `#actions`, để bộ nút theo trạng thái/quyền (và ba kịch bản `a2-smoke-*`) không đổi; nút này luôn có cho mọi người xem được đơn.
- Tên người phụ trách qua `loadHandlerName` (không bao giờ ném lỗi, tối đa 3 giây); người phụ trách API chưa có → tên người lập.

**Kiểm:** `node --test src/shared/order-confirmation.test.ts src/shared/text-wrap.test.ts` → `npm test` → `npm run typecheck` → `npm run build:web` → `AXE_JS=… CHROME_BIN=… node docs/evidence/2026-09-21-v1-0/kich-ban/v1-xac-nhan-png.mjs` (11 dòng ✓; ghi ảnh mẫu vào `docs/evidence/2026-09-21-v1-0/anh/` — XEM ẢNH bằng mắt sau khi đổi bố cục) → ba `a2-smoke-*.mjs` nếu chạm `web/order.ts`/`web/order-form.ts` → `npm run test:e2e -- pwa` nếu chạm CSS.

**Bẫy:** ảnh có "₫" trông như "đ" gạch chân — đó là chữ ₫ của phông Nunito, không phải lỗi. Test giả lập lỗi phải đặt SAU lần mở thành công đầu tiên nếu lỗi nằm ở dữ liệu đã được nhớ (hồ sơ công ty được nhớ trong trang). `Runtime.evaluate` của CDP không bị CSP chặn nên kịch bản đóng gói bộ vẽ bằng esbuild và nạp thẳng vào trang; đó là công cụ kiểm, không phải mã chạy thật.

## 3. Ma trận "đổi cái gì → chạy kiểm nào"

| Bạn chạm | Chạy |
|---|---|
| `src/shared/*.ts`, `rules.ts`, `fields.ts`, `sheet.ts` (luật thuần) | `node --test <tệp>.test.ts` → `npm test` → `npm run typecheck` (mã dùng cả ở `web/` nên `tsc -p web` cũng kiểm) |
| `src/shared/contracts.ts` | `npm run typecheck` (cả ba tsconfig) → `npm run test:e2e` |
| `src/modules/*/index.ts`, `repository.ts`, `service.ts` (route, SQL) | `npm test` (kiến trúc) → `npm run typecheck` → `npm run test:e2e -- <module>` |
| `migrations/*.sql` | `npm test` → `npm run db:migrate:local` → `npm run test:e2e` ĐỦ BỘ (đuôi `audit-invariants`) → `npm run dict` nếu đổi bảng/view |
| `scripts/audit-invariants.mjs`, `scripts/audit-checks.mjs` | `node --test src/audit-invariants.test.ts` (chạy đúng các câu SQL trên schema đầy đủ) → `npm test` → `node scripts/audit-invariants.mjs --db local [--persist-to <thư mục>] [--strict]` (chỉ đọc; D1 local phải đã áp migration — thiếu bảng thì thoát mã 2) → `npm run test:e2e` đủ bộ (đuôi `audit-invariants --strict`) |
| `web/*.ts` (trừ ba tệp dưới) | `npm run typecheck` (`tsc -p web`) → `npm run build:web` → thử tay `npm run dev`; riêng `web/login.ts` thêm kịch bản Chrome `v1-dang-nhap.mjs`; riêng `web/confirmation-image.ts`, `web/confirmation-dialog.ts` (và `src/shared/order-confirmation.ts`, `src/shared/text-wrap.ts`) thêm `v1-xac-nhan-png.mjs` |
| `web/order-form.ts`, `web/order.ts`, `web/trip-sheet.ts` | như trên + BA kịch bản Chrome `a2-smoke-form.mjs`, `a2-smoke-order.mjs`, `a2-smoke-sheet.mjs` (KHÔNG có kiểm tự động trong CI; nên chạy cả khi chạm thành phần dùng chung `service-card`, `trip-fields`, `order-services`, `catalog-picker`, `counter`, `money-input`, `banner`); chạm phần `moi=1` hoặc nút "Xác nhận gửi khách" của `web/order.ts`/`web/order-form.ts` thì thêm `v1-xac-nhan-png.mjs` |
| `public/app.css`, `public/*.html`, `public/manifest.webmanifest`, `public/_headers`, `src/shared/sw-policy.ts`, `web/sw/sw.ts` | `npm run build:web` → `npm test` (`sw-policy.test.ts`) → `npm run typecheck` (gồm `-p web/sw`) → `npm run test:e2e -- pwa`; chạm `public/login.html`, `public/_headers` hoặc CSS màn đăng nhập → thêm `v1-dang-nhap.mjs` |
| `wrangler.jsonc`, `package.json` | `npm run types` (nếu đổi `vars`/bí mật; cần `.dev.vars` có đủ tên bí mật, xem công thức l) → `npm run typecheck` → `npm run test:e2e` |
| `docs/data-dictionary.json` | `npm run dict` → `npm test` (bài kiểm bắt `DATA-DICTIONARY.md` lệch bản sinh) |
| `scripts/*.mjs` | chạy thử lệnh đó trên D1 local/tạm; `npm test` (bài kiểm R-N1-14 quét cả `scripts/*.mjs` tìm `full_name`) |
| Chỉ tài liệu | không cần chạy gì; nhưng tài liệu phải khớp mã trong cùng commit |

**Thời gian ước lượng** (máy dev, đo 2026-09-21):
- `npm test` ≈ 1 giây (354 test; đo lại: dưới 1 giây).
- `npm run test:e2e` ≈ 2 phút: 13 kịch bản tổng ≈ 86 giây (`platform` 0,5 · `pwa` 0,1 · `orders` 5,2 · `trip` 15,4 · `admin` 9,1 · `turnstile` 3,9 · `catalog` 15,3 · `dispatch` 29,6 · `admin-race` 0,5 · `locations` 0,3 · `parties` 0,3 · `permissions` 0,7 · `company` 4,9 — đo 2026-09-21, có mạng) cộng thời gian áp migration, khởi động `wrangler dev` và `audit-invariants` (chưa đo riêng). Con số cũ (2026-09-20, chưa có `turnstile`/`dispatch`/`company`): `docs/evidence/2026-09-20-a2/kiem-tra-may.txt`.
- `npm run typecheck` và mỗi kịch bản Chrome: chưa có số đo.

## 4. Bẫy đã biết

1. **Đuôi import.** `src/shared/*`, các tệp thuần (`rules.ts`, `fields.ts`, `sheet.ts`, `password.ts`, `phone.ts`) và `repository.ts` của module nghiêm (`company`, `locations`, `parties`, `staff`) import nhau KÈM `.ts`; `index.ts`/`service.ts`/`repository.ts` cũ và MỌI tệp `web/` import KHÔNG đuôi. Thiếu `.ts` ở tệp mà `node --test`/`scripts/*.mjs` nạp → `ERR_MODULE_NOT_FOUND` chỉ ở test/script, `tsc` vẫn xanh.
2. **Cú pháp TS chạy trực tiếp bằng Node 22.** Tệp được `node --test`/script nạp chỉ được dùng cú pháp "xoá được" (không `enum`, `namespace`, tham số thuộc tính của constructor). Hiện chỉ `src/shared/sheets.ts` (`SheetError`) dùng tham số thuộc tính → không được import từ tệp thuần/test.
3. **`web/` không import `src/modules/`** (bài kiểm kiến trúc đỏ); chỉ import `src/shared/*`, không đuôi.
4. **`public/js/` và `public/sw.js` gitignored:** quên `npm run build:web` → trang hỏng/cũ khi thử bằng thứ khác `wrangler dev`/`deploy` (hai lệnh này tự build). `build:web` cần shell POSIX (`$(date …)` cho `__BUILD_ID__`).
5. **API ghi cần `Origin`:** thử bằng curl phải thêm `-H "Origin: <đúng origin>" -H "Content-Type: application/json"`, không thì 403 `cross_origin`/415 (`checkWriteRequest` ở `src/shared/router.ts`). e2e `call()` tự thêm.
6. **Sau lưu form phải `location.replace`** (không `assign`) — `web/order-form.ts` — để Back/bfcache không đưa về form đã lưu rồi bấm Lưu lần hai (đơn trùng); `pageshow` chỉ là đai an toàn.
7. **Enter trong ô tìm danh mục bị chặn có chủ đích** (`web/order-form.ts`; ô `input[type=search]` nằm trong `<form>`): không chặn thì Enter lưu cả form. Chưa kiểm `isComposing` khi gõ Telex/VNI.
8. **`.counter { overflow: hidden }`** trong `public/app.css` xén vòng focus mặc định → vòng focus của bộ đếm phải LÙI VÀO TRONG bằng luật riêng (`.counter .counter-btn:focus-visible`); đừng dùng `outline-offset` dương.
9. **Giờ Việt Nam ≠ UTC.** "Hôm nay" luôn là `vnToday(new Date())` (`src/shared/vn-date.ts`) truyền vào SQL làm tham số; không `date('now')` trong SQL, không `toISOString().slice(0, 10)` (sai ngày 00:00–07:00 giờ VN). e2e dùng `vnDate()` ở `lib.mjs`.
10. **Tên bảng `orders`** (không `order`; `ORDER` là từ khoá SQL); bảng số ít trừ `orders`; bảng cũ không tiền tố phải có `"legacy": true` trong sổ dữ liệu.
11. **Không sửa migration đã áp** (0001–0012 đều đã lên production 2026-09-21), kể cả chú thích; và không để migration "siết" (`staff_party_required`, B5) lọt vào `migrations/` trước lần phát hành 2.
12. **SQL của module nghiêm qua `defineSql`** (`src/shared/sql-registry.ts`): câu TĨNH (tham số tuỳ chọn viết `?N IS NULL OR …`), tên `module.tên` duy nhất (đăng ký lại KHÁC nội dung → ném lỗi). `.prepare("…")`/template thô trong `company|locations|parties|staff/repository.ts` làm `architecture.test.ts` đỏ; câu chạm bảng module khác hoặc đọc thẳng bảng gốc cũng đỏ (EXPLAIN của chính SQLite).
13. **Cột chết `staff.role` (`'sales'`) và `staff.full_name` (`''`):** bài kiểm R-N1-14 quét mọi mã (cả `scripts/*.mjs`) cấm chuỗi `full_name`, `SELECT * FROM staff`, `s.*` ngoài `staff/repository.ts` và `scripts/staff-lib.mjs`. Tên người lấy từ `v_stf_staff_label`/`v_pty_party_label`, quyền từ `stf_permission`.
14. **e2e cần mạng** (`admin.mjs`, `catalog.mjs` đọc Google Sheet thật): mất mạng → hai kịch bản đỏ; Sheet đổi giá (`TD101`, `TD103`) → sửa assertion.
15. **`wrangler dev` mồ côi** (Ctrl+C giữa chừng; `startEnv()` của `a2-cdp.mjs` lỗi giữa lúc khởi động) → "database is locked"/cổng bận: tắt tiến trình `workerd`/`wrangler` cũ trước khi chạy e2e.
16. **Idiom khoá lạc quan trong `orders/repository.ts`:** `nextStamp` (mốc `updated_at` luôn LỚN hơn mốc cũ), `wonGuard` (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với `AuditInput.id` do request tự sinh) và chuỗi `changes() > 0` — đúng nhờ VỊ TRÍ câu trong batch. Không so mốc thời gian để suy ra "ai thắng"; đổi thứ tự câu là làm hỏng.
17. **Nhật ký không ghi SĐT/email/MST/PIN.** Vi phạm đã biết: `patchStaffStatements` (`src/modules/accounts/index.ts`) ghi SĐT đăng nhập vào `staff_updated` (quyết định 4(b) của `docs/HANDOFF-N1.md` đang chờ chủ dự án).
18. **Lộ mã tiếng Anh ra người dùng:** nhánh `!canTransition(from, to)` của `POST /api/orders/:id/status` chèn mã trạng thái thô (`"cancelled"`) vào câu 409 `invalid_transition` — trái quy tắc "tiếng Việt có dấu"; sửa ở đó hoặc ở `classifyOrderError`.
19. **`POST /api/orders` không idempotent:** hết giờ 45 giây (`REQUEST_TIMEOUT_MS`) → người dùng bấm Lưu lại → có thể tạo đơn trùng (chưa có khoá idempotent).
20. **Bản đồ quyền ≠ `access`:** `office` = `can(who, "order.view")`; `admin` = `hasPermission(who, "ADMIN")` (không đi qua `MATRIX["admin.manage"]`). Tài khoản chỉ-FIELD đăng nhập được nhưng mọi route `office`/đơn/hồ sơ trả 403 (màn "việc của tôi" thuộc N2).
21. **CSP `script-src 'self'`** (`public/_headers`): không `<script>` inline/CDN; style inline được; ảnh `data:`/`blob:`. `/sw.js` phải `Cache-Control: no-store` (không phải `no-cache`) — `pwa.mjs` kiểm; khung có thể chạy bản cũ đúng lần mở đầu sau deploy (stale-while-revalidate).
22. **Nợ nhỏ đã ghi sổ** (đừng "phát hiện lại"): scrim bảng trượt chỉ chặn chạm ~2 khung hình đầu; `a2-smoke-sheet.mjs` phụ thuộc chuỗi `45000`; ảnh `tt-*` là ảnh khung nhìn (`docs/evidence/2026-09-20-a2/README.md` "Tồn đọng nhỏ").
23. **`GET /api/catalog` tự đồng bộ lần đầu** (`bootstrapIfNeverSynced` → `claimFirstSync`, điều kiện `catalog_sync.last_attempt_at IS NULL`) và gọi Sheet thật. Kịch bản cần danh mục giả phải chèn `catalog_item` VÀ đặt `catalog_sync.last_attempt_at`/`last_success_at` (mẫu `CATALOG_SQL` trong `a2-cdp.mjs`).

## 5. Danh sách kiểm

**Trước khi commit (mọi thay đổi):**
1. `npm test` (kiến trúc, sổ dữ liệu, luật thuần) và `npm run typecheck` (0 lỗi; ba tsconfig: server, `web`, `web/sw`) — chạy RIÊNG từng lệnh, đọc kết quả.
2. Chạm API/migration → `npm run test:e2e` (cần mạng; kỳ vọng `E2E: N/N kịch bản xanh` + `audit-invariants`). Chạm `web/order-form.ts|order.ts|trip-sheet.ts` → ba kịch bản Chrome (§3).
3. Chạm bảng/view → `docs/data-dictionary.json` + `npm run dict`. Đổi hành vi đã mô tả → sửa tài liệu liên quan trong CÙNG commit (mã thắng).
4. `git status`: không có `public/js/`, `public/sw.js`, `.dev.vars`, `*.local.sql`, `*.local.txt`; không khoá/bí mật; chuỗi hiển thị tiếng Việt có dấu; không `innerHTML`.
5. Thông điệp commit tiếng Việt: tiêu đề nói việc, thân nói VÌ SAO; thêm dòng đồng tác giả theo yêu cầu của môi trường.

**Trước khi deploy** (CHỈ khi chủ dự án ra lệnh trong phiên đó; chi tiết `docs/HANDOFF-N1.md`):
1. Cổng chỉ-đọc trên D1 remote (kỳ vọng 0 dòng) + ghi điểm khôi phục: `npx wrangler d1 time-travel info tourdao-sales-db`.
2. Ba lệnh xanh trên đúng mã sẽ deploy: `npm test`, `npm run typecheck`, `npm run test:e2e`.
3. Có migration mới: `npm run db:migrate:remote` rồi `npx wrangler deploy` NGAY trong cùng lượt (`CI=1` để wrangler không hỏi). Không tạo/sửa tài khoản, quyền, hồ sơ trong "cửa sổ đóng băng".
4. Sau deploy: `node scripts/audit-invariants.mjs --db remote` (chạy SAU khi đã áp `0014`; D1 chưa có `dsp_*` thì thoát mã 2 = không chạy được); `curl -sI https://booking.tourdao.vn/sw.js` (`no-store`); ghi trạng thái vào `docs/HANDOFF-N1.md` và `CLAUDE.md` §9.
5. Lần phát hành v1.0 có thêm Turnstile: theo `docs/HANDOFF-N1.md` mục "Lần phát hành v1.0" — khoá site vào `vars` trước, **deploy MÃ trước khi đặt `TURNSTILE_SECRET_KEY`** (service worker cache `login.js` cũ trên iPhone đã cài PWA), để nhân viên mở app một lần, rồi `wrangler secret put` và kiểm `GET /api/auth/config` khác `null`.

## 6. Sai lệch tài liệu ↔ mã (mã thắng)

1. **`docs/evidence/2026-09-20-a2/README.md` "Tồn đọng nhỏ"** còn ghi "PWA-IPHONE.md ghi 8 trang" và "`pwa.mjs` chỉ kiểm meta trên 8/10 trang": đã lỗi thời khi các sửa chưa commit của đợt tài liệu nền được đưa vào (`pwa.mjs` duyệt `PAGES`, PWA-IPHONE ghi 10 trang). Tài liệu bằng chứng là bản ghi lịch sử nên không sửa.
2. **`docs/HANDOFF-M2.md`, `docs/HANDOFF-M4.md`** là bàn giao đầu M2/M4 (2026-09-19): lịch sử, không phải hiện trạng (hiện trạng: `docs/HANDOFF-N1.md`, `CLAUDE.md` §9).
