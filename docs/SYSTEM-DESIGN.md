# Thiết kế hệ thống — tourdao-sales

> Mô tả **hiện trạng mã tại HEAD của nhánh này**, cho kỹ sư (hoặc một phiên Claude mới) chưa biết dự án và cần sửa nhanh, đúng.
> Luật kiến trúc: `docs/ARCHITECTURE.md` + `docs/adr/`. Đặc tả nghiệp vụ: `docs/SPEC-tourdao-sales.md`. Bảng/cột/view: `docs/DATA-DICTIONARY.md` (sinh từ `docs/data-dictionary.json`). Triển khai/hoàn tác: `docs/HANDOFF-N1.md`. PWA: `docs/PWA-IPHONE.md`.
> Tài liệu này KHÔNG chép lại các tệp đó; khi mâu thuẫn thì **mã thắng** — xem §16.

## Mục lục

1. [Mục đích, người dùng, phạm vi, ràng buộc nền tảng](#1-mục-đích-người-dùng-phạm-vi-ràng-buộc-nền-tảng)
2. [Bối cảnh và topology chạy thật](#2-bối-cảnh-và-topology-chạy-thật)
3. [Vòng đời một request](#3-vòng-đời-một-request)
4. [Xác thực và phiên](#4-xác-thực-và-phiên)
5. [Mô hình dữ liệu](#5-mô-hình-dữ-liệu)
6. [Luồng nghiệp vụ chính](#6-luồng-nghiệp-vụ-chính)
7. [Danh mục API](#7-danh-mục-api)
8. [Phân quyền](#8-phân-quyền)
9. [Giao diện](#9-giao-diện)
10. [Build, kiểm thử, triển khai](#10-build-kiểm-thử-triển-khai)
11. [Bảo mật](#11-bảo-mật)
12. [Giới hạn và hiệu năng](#12-giới-hạn-và-hiệu-năng)
13. [Quan sát và vận hành](#13-quan-sát-và-vận-hành)
14. [Lộ trình và điểm gắn tính năng tiếp theo](#14-lộ-trình-và-điểm-gắn-tính-năng-tiếp-theo)
15. [Thuật ngữ](#15-thuật-ngữ)
16. [Sai lệch tài liệu ↔ mã](#16-sai-lệch-tài-liệu--mã)

---

## 1. Mục đích, người dùng, phạm vi, ràng buộc nền tảng

**Mục đích.** Sổ đơn hàng nội bộ của Công ty TNHH Tour Đảo: nhân viên lập đơn dịch vụ tour, ghi thông tin chuyến (ngày giờ khởi hành, đón, check-in), xác nhận hoặc huỷ đơn; quản trị viên quản lý tài khoản + quyền, danh mục dịch vụ (đồng bộ từ Google Sheet), hồ sơ khách/đại lý và địa điểm.

**Người dùng** = nhân viên có tài khoản trong D1 (không có đăng ký công khai). Bốn quyền app (`src/shared/permissions.ts`): `SALES` (Bán hàng), `ACCOUNTING` (Kế toán), `ADMIN` (Quản trị), `FIELD` (Thực hiện). Một tài khoản mang **nhiều** quyền (ADR-0005).

**Trong phạm vi hiện tại:** đăng nhập, sổ đơn (nháp → xác nhận/huỷ), sửa thông tin chuyến sau xác nhận, danh mục dịch vụ + ghi đè giá, tài khoản/quyền, hồ sơ (party) và địa điểm, nhật ký.
**Chưa có trong mã:** xuất PNG/PDF bản xác nhận, thu tiền/hoá đơn, phân công người phụ trách, màn hình cho tài khoản chỉ-`FIELD` (xem §14).

**Ràng buộc nền tảng.**

| Ràng buộc | Chi tiết |
|---|---|
| Runtime và CSDL | Cloudflare Workers, một Worker duy nhất tên `tourdao-sales` (`wrangler.jsonc`), `compatibility_date` `2026-09-01`; Cloudflare D1 `tourdao-sales-db`, binding `DB`, `migrations_dir: migrations` |
| Tệp tĩnh | Workers Assets: thư mục `./public`, binding `ASSETS`, `run_worker_first: ["/api/*"]` |
| Ngôn ngữ và giao diện | TypeScript `strict` + `noUncheckedIndexedAccess` (`tsconfig.json`), không framework, không thư viện router; HTML tĩnh `public/*.html` + TypeScript thuần `web/*.ts` gom bằng **esbuild** vào `public/js/` (gitignored) |
| Phụ thuộc | Chỉ `devDependencies`: `esbuild`, `typescript`, `wrangler`. Không có dependency runtime. |

---

## 2. Bối cảnh và topology chạy thật

```mermaid
flowchart LR
  U["Nhân viên - Safari iPhone PWA hoặc trình duyệt máy tính"]
  SW["Service worker - public/sw.js"]
  A["Workers Assets - public/"]
  W["Worker - src/index.ts"]
  D["D1 - tourdao-sales-db"]
  S1["Google Sheet dịch vụ - SERVICES_SHEET_ID"]
  S2["Google Sheet nhân viên - STAFF_SHEET_ID"]
  C["Cron 15 phút"]
  U --> SW
  SW -->|"trang và tệp tĩnh"| A
  SW -->|"/api/* không qua cache"| W
  W --> D
  W -->|"CSV chỉ đọc"| S1
  W -->|"CSV chỉ đọc"| S2
  C --> W
```

*Một tên miền `booking.tourdao.vn` (`routes` + `custom_domain: true`); vì khai `routes` mà không khai `workers_dev`, địa chỉ `workers.dev` đã bị TẮT có chủ ý. `run_worker_first: ["/api/*"]` khiến mọi `/api/*` vào Worker trước, còn lại do Workers Assets phục vụ.*

**Cron.** `triggers.crons: ["*/15 * * * *"]` → `scheduled()` trong `src/index.ts` gọi `ctx.waitUntil(runScheduledSync(env))` (module `catalog`) để kéo danh mục dịch vụ.

**Google Sheet — chỉ ĐỌC, công khai.** `src/shared/sheets.ts#fetchSheetCsv` gọi `https://docs.google.com/spreadsheets/d/<id>/export?format=csv`, `AbortSignal.timeout(8000)`. App **không bao giờ** ghi ngược vào Sheet.

**Biến và bí mật.**

| Tên | Loại | Đặt ở đâu | Dùng ở đâu |
|---|---|---|---|
| `STAFF_SHEET_ID` | biến công khai (`vars`) | `wrangler.jsonc` | `accounts`: `GET /api/staff/sheet`, `POST /api/staff/sheet/apply` |
| `SERVICES_SHEET_ID` | biến công khai (`vars`) | `wrangler.jsonc` | `catalog`: `syncCatalog` |
| `SESSION_SECRET` | **bí mật** | `wrangler secret put SESSION_SECRET` (production), `.dev.vars` (local — xem `.dev.vars.example`) | ký/kiểm cookie phiên (`src/modules/auth/session.ts`) |
| `TURNSTILE_SITE_KEY` | biến công khai, **tuỳ chọn** | `vars` của `wrangler.jsonc` khi có khoá thật (chưa thêm), `.dev.vars` (local) | `auth`: `GET /api/auth/config` trả cho trang đăng nhập dựng widget Turnstile |
| `TURNSTILE_SECRET_KEY` | **bí mật, tuỳ chọn** | `wrangler secret put TURNSTILE_SECRET_KEY` (production, chỉ khi chủ dự án ra lệnh), `.dev.vars` (local) | `auth`: `verifyTurnstile` (`POST /api/auth/login`). Vắng ⇒ Turnstile TẮT (xem mục 4) |
| `DB` / `ASSETS` | binding D1 / binding Workers Assets | `wrangler.jsonc` | `env.DB` ở mọi module; `ASSETS` do nền tảng dùng |

`SESSION_SECRET` ngắn hơn `MIN_SECRET_LENGTH` = 32 ký tự → **mọi** route trả 500 `server_misconfigured` (`checkAuthConfig`). Hai biến Turnstile KHÔNG đi qua `checkAuthConfig` (vắng là trạng thái hợp lệ "tắt"). Kiểu của `Env` ở `worker-configuration.d.ts` (sinh bởi `npm run types` khi `.dev.vars` có đủ bí mật; hai biến Turnstile đang khai tay dạng tuỳ chọn — xem `docs/CHANGE-GUIDE.md` công thức l).

---

## 3. Vòng đời một request

```mermaid
sequenceDiagram
  participant B as Trình duyệt
  participant CF as Workers Assets
  participant R as createApp.fetch
  participant H as Handler module
  B->>CF: GET /order-form
  CF-->>B: public/order-form.html cộng public/_headers
  B->>R: PUT /api/orders/:id
  R->>R: match đường dẫn, 404 hoặc 405
  R->>R: checkConfig, checkWriteRequest
  R->>R: currentStaff, kiểm access
  R->>H: ctx request env exec url params staff
  H-->>B: JSON cache-control no-store
```

*Tệp tĩnh không chạm Worker; `/api/*` đi qua `createApp` rồi mới tới handler của module.*

**`src/shared/router.ts`** — router tối giản, không import module nào (gốc lắp ráp `src/index.ts` tiêm `currentStaff` và `checkConfig`):

- `route(method, path, access, handler)`; `Access = "public" | "staff" | "office" | "admin"`.
- Khớp đường dẫn bằng `split("/").filter(Boolean)`, tham số `:tên` giải mã bằng `decodeURIComponent`. Không khớp đường dẫn nào → **404** `not_found`; khớp đường dẫn nhưng sai phương thức → **405** `method_not_allowed` kèm header `allow`.
- `checkConfig` lỗi → **500** `server_misconfigured` (ghi log, không bao giờ in giá trị bí mật).
- `checkWriteRequest` với `POST/PUT/PATCH/DELETE`: so `Origin` với `url.origin` (thiếu `Origin` thì xét `Sec-Fetch-Site === "same-origin"`) → sai thì **403** `cross_origin`; thân không phải `application/json` → **415** `unsupported_media_type`.
- `access !== "public"` mà không có phiên → **401** `unauthenticated`; `admin` mà thiếu quyền `ADMIN` → **403** `forbidden`; `office` mà `isOffice(staff)` sai → **403** `forbidden`.
- Bọc toàn cục: ngoại lệ → **500** `internal` kèm `requestId` (`cf-ray` hoặc `crypto.randomUUID()`), log JSON một dòng `{level, event: "unhandled", requestId, method, path, error}`.

**`src/shared/http.ts`** — `json()` (luôn `content-type: application/json; charset=utf-8` + `cache-control: no-store`), `error(status, code, message)`, `readJson()`, `intParam(v, fallback, min, max)`, `escapeLike()`, `getCookie()`, `UUID_RE`.

**`public/_headers`** (chỉ áp cho tệp tĩnh): CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`; riêng `/sw.js` là `Cache-Control: no-store` (KHÔNG `no-cache` — lý do ở `docs/PWA-IPHONE.md`).

---

## 4. Xác thực và phiên

**Đăng nhập = số điện thoại + PIN 6 số.** `normalizePhone` (`src/shared/phone.ts`) chuẩn hoá về `0xxxxxxxxx`; `isValidPin` và `isWeakPin` (`src/modules/staff/rules.ts`) chặn PIN toàn số giống nhau hoặc chạy liên tiếp (kể cả cuộn vòng).

**Băm PIN** — `src/modules/staff/password.ts`: PBKDF2-SHA256, `PBKDF2_ITERATIONS = 100_000` (trần của Workers), muối 16 byte ngẫu nhiên, khoá 256 bit; chuỗi lưu `pbkdf2$sha256$<iter>$<salt>$<hash>` (base64url). So sánh bằng `timingSafeEqual`. `verifyDummy()` chạy một phép băm giả khi SĐT không tồn tại để thời gian phản hồi không lộ tài khoản nào có thật.

**Cookie phiên** — `src/modules/auth/session.ts`: tên `td_session`; token `"<staffId>.<issuedAt ms>.<HMAC-SHA256 base64url>"` ký bằng `SESSION_SECRET`; `SESSION_TTL_SECONDS = 60*60*24*7` (7 ngày). Thuộc tính: `Path=/; Max-Age=604800; HttpOnly; SameSite=Lax` và `Secure` khi request là `https:`. Chữ ký đúng nhưng `issuedAt > now + 60_000` → từ chối (đồng hồ lạ).

**Thu hồi phiên.** `currentStaff` → `getActiveStaff(db, id, issuedAt)`: tài khoản phải `active = 1`, và nếu `staff.credentials_changed_at` (mili-giây) **lớn hơn** thời điểm phát hành phiên thì phiên bị từ chối. Đổi PIN / đặt lại PIN cập nhật cột này ⇒ mọi thiết bị cũ bị đăng xuất; route đổi PIN cấp ngay cookie mới cho thiết bị hiện tại (`newSessionCookie`).

**Cloudflare Turnstile (chỉ ở đăng nhập)** — `src/modules/auth/turnstile.ts` (thuần, có test). `POST /api/auth/login` nhận thêm `turnstileToken`; sau khi đầu vào hợp lệ (400 nếu thiếu SĐT/PIN) và **TRƯỚC** `verifyPinThrottled`, máy chủ gọi `https://challenges.cloudflare.com/turnstile/v0/siteverify` (POST form `secret`, `response`, `remoteip` — chỉ khi `cf-connecting-ip` đúng là IP), hạn chót `TURNSTILE_TIMEOUT_MS` = 5 giây, token dài tối đa 2048 ký tự. Kẻ tấn công không có token nhận **403 `turnstile_failed`** ("Chưa xác minh được bạn là người thật. Hãy thử lại.") mà **không tiêu hao lượt thử** của SĐT nạn nhân (cũng không của IP). **Đóng khi lỗi**: siteverify không trả lời/HTTP lỗi/hết giờ/thân lạ/secret sai (`invalid-input-secret`, trả HTTP 400) → **503 `turnstile_unavailable`** ("Chưa kết nối được dịch vụ xác minh. Hãy thử lại sau ít phút."), ghi log `turnstile_unavailable` kèm mã ngắn `detail`. `GET /api/auth/config` (public) → `{ turnstileSiteKey }`: khoá site khi có CẢ secret lẫn khoá site, ngược lại `null`.
**Chưa đặt `TURNSTILE_SECRET_KEY` ⇒ TẮT**: bỏ qua kiểm (không khoá chết local/e2e/lần deploy đầu), `config` trả `null`, và mỗi lần đăng nhập máy chủ `console.warn` `turnstile_disabled` để mất secret không thành tắt lặng lẽ — sau deploy phải kiểm `GET /api/auth/config` khác `null`. Có secret mà thiếu khoá site ⇒ vẫn kiểm, trang không có widget nên không ai đăng nhập được (log `turnstile_misconfigured`). Widget ở trang đăng nhập và CSP cho `challenges.cloudflare.com` là task 3 của kế hoạch v1.0 (**chưa có**): đặt secret ở production trước đó sẽ làm đăng nhập bằng trình duyệt hỏng. Đổi PIN không đòi Turnstile.

**Chống dò PIN** — `src/modules/auth/throttle.ts`, bảng `login_attempt`, cửa sổ trượt `LOGIN_WINDOW_MS = 15 * 60 * 1000`:

| Khoá | Hằng | Giá trị |
|---|---|---|
| `phone:<SĐT chuẩn hoá>` | `PHONE_LIMIT` | 5 lần / 15 phút |
| `ip:<cf-connecting-ip>` | `IP_LIMIT` | 30 lần / 15 phút |

Cơ chế **đặt chỗ trước khi kiểm**: đếm → nếu đã đủ thì chặn ngay và KHÔNG ghi thêm (kẻ tấn công không kéo dài khoá của nạn nhân) → chèn dòng → đếm lại; nếu vượt thì xoá dòng vừa chèn và chặn. Vượt → **429** `too_many_attempts` kèm `retry-after` giây. Thành công → `clearAttempts` xoá mọi lần thử của SĐT đó. `verifyPinThrottled` dùng chung cho **đăng nhập và đổi PIN** (đổi PIN không thành đường vòng dò PIN hiện tại). Admin mở khoá bằng `POST /api/staff/:id/unlock` (`unlockPhone`); danh sách đang khoá do `lockedPhones` trả về.

**`safeNext`** (`src/shared/safe-next.ts`): `/login?next=…` chỉ nhận đường dẫn nội bộ; chặn `//evil.com`, `/\evil.com`, ký tự điều khiển. Dùng ở `web/login.ts` và `goLogin()` của `web/api.ts`.

---

## 5. Mô hình dữ liệu

Module chủ sở hữu bảng của mình; bảng mới mang tiền tố module (`pty_`, `loc_`, `stf_`), bảng cũ giữ nguyên tên và được đánh dấu `legacy` trong `docs/data-dictionary.json` (**nguồn sự thật**, `src/architecture.test.ts` đối chiếu với schema thật).

| Bảng / view | Module | Mục đích |
|---|---|---|
| `staff` | staff | tài khoản đăng nhập (SĐT, `pin_hash`, `active`, `credentials_changed_at`, `party_id`); `role` và `full_name` là **cột chết** |
| `stf_permission_type` | staff | tra cứu 4 quyền app: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD` |
| `stf_permission` | staff | quyền của một tài khoản, có hiệu lực `valid_from_at` / `valid_to_at` |
| `v_stf_staff_label` | staff | view công bố: `id, label, active, party_id` (`label` = tên hồ sơ, dự phòng `(chưa có hồ sơ)`) |
| `pty_party` | parties | hồ sơ: `party_kind` `PERSON` hoặc `ORGANIZATION`, `display_name`, `active` |
| `pty_person` / `pty_organization` | parties | phần cá nhân (`family_name`, `middle_name`, `given_name`) / phần tổ chức (`legal_name`, `tax_code`, `address`, `invoice_email`) |
| `pty_contact_kind` / `pty_role_type` / `pty_relationship_type` | parties | tra cứu: loại liên hệ (`PHONE`, `EMAIL`); vai trò hồ sơ (`STAFF`, `GUIDE`, `DRIVER`, `AGENT`, `CUSTOMER`…); loại quan hệ |
| `pty_contact_point` | parties | điểm liên hệ của hồ sơ, có `is_primary` và hiệu lực theo ngày |
| `pty_party_role` | parties | hồ sơ giữ vai trò nào, ở nơi nào, trong khoảng nào |
| `pty_party_relationship` | parties | quan hệ hồ sơ ↔ hồ sơ, có hiệu lực |
| `v_pty_party_label` | parties | view công bố: `id, display_name, party_kind, active, sort_key` |
| `loc_location_type` | locations | tra cứu loại địa điểm (`OFFICE`, `TICKET_COUNTER`, `PIER`, `PORT`) |
| `loc_location` | locations | địa điểm (`code`, `name`, `sort_order`, `active`); 0010 nạp sẵn 8 dòng |
| `v_loc_location_label` | locations | view công bố: `id, code, name, location_type_code, active` |
| `dsp_task_kind` | dispatch | tra cứu loại việc: `HANDLE` (phụ trách), `PICKUP`, `DROPOFF`, `BOAT`; **bản v1.0 chỉ dùng `HANDLE`** (migration 0014, chưa có module/mã) |
| `dsp_assignment_status` | dispatch | tra cứu trạng thái việc: chỉ `PENDING`, `DONE` (huỷ = đóng dòng, không có `CANCELLED`) |
| `dsp_assignment` | dispatch | một dòng = một người được giao một việc, thuộc ĐÚNG MỘT hạt: cả đơn (`order_id`) hoặc một dịch vụ (`order_service_id`); hiệu lực `valid_from_at`/`valid_to_at` (UTC, NULL = đang mở). Người phụ trách = dòng `HANDLE` hạt đơn đang mở (ADR-0006/0009). Mã ghi hạt dịch vụ chưa có (chờ N2) |
| `v_dsp_order_handler` | dispatch | view công bố: `order_id, party_id, staff_id, label, since` — người phụ trách ĐANG MỞ của đơn (`staff_id` NULL nếu hồ sơ không có tài khoản) |
| `orders` | orders | đơn: `order_code`, `staff_id`, `status`, thông tin khách, các số tiền, `updated_at`, `confirmed_at` |
| `order_service` | orders | một dịch vụ trong đơn: số khách 4 loại + thông tin chuyến (ngày giờ, đón, check-in, ghi chú) |
| `order_item` | orders | dòng tiền: `description`, `quantity`, `unit_price`, `line_total`, `catalog_code`, `catalog_price`, `pax_code`, `service_id` |
| `v_ord_order_label` | orders | view công bố: `id, order_code` |
| `catalog_item` | catalog | dịch vụ lấy từ Sheet: `code`, `name`, `unit`, 4 mức giá, ghi chú, `in_sheet` |
| `catalog_override` / `catalog_sync` | catalog | ghi đè của admin (`hidden`, `prices_json`, `base_json` = giá Sheet lúc ghi đè) / trạng thái lần kéo gần nhất (đúng một dòng `default`) |
| `audit_log` | audit | nhật ký chỉ-thêm: `action`, `staff_id` (NULL = hệ thống), `order_id`, `target_type`, `target_id`, `detail` |
| `login_attempt` | auth | lần thử PIN theo `key` (`phone:`/`ip:`) và `at` (mili-giây) |
| `company_profile` | company | hồ sơ công ty (singleton `default`); module `company` đọc qua `GET /api/company` (chỉ đọc, không lộ `zalo_number`/`logo_url`/`updated_by`) |

### Quan hệ cốt lõi

```mermaid
erDiagram
  staff ||--o{ orders : "lập"
  staff ||--o{ stf_permission : "được cấp"
  staff |o--|| pty_party : "hồ sơ"
  orders ||--o{ order_service : "gồm"
  orders ||--o{ order_item : "gồm"
  order_service ||--o{ order_item : "sinh ra"
  catalog_item ||--o| catalog_override : "bị ghi đè"
  pty_party ||--o{ pty_contact_point : "liên hệ"
  pty_party ||--o{ pty_party_role : "giữ vai"
  pty_party_role }o--o| loc_location : "tại"
  pty_party ||--o{ pty_party_relationship : "quan hệ"
  orders ||--o{ audit_log : "nhật ký"
  orders ||--o{ dsp_assignment : "người phụ trách (HANDLE)"
  order_service ||--o{ dsp_assignment : "nhiệm vụ (N2, chưa ghi)"
  pty_party ||--o{ dsp_assignment : "được giao"
```

*Ba nhánh chính: đơn → dịch vụ → dòng tiền; tài khoản → hồ sơ → vai trò/liên hệ/quan hệ; vai trò → địa điểm. `order_item.catalog_code` cố ý KHÔNG có khoá ngoại tới `catalog_item` (nhập tay luôn phải chạy được).*

### Bất biến do SQL giữ (lưới cuối, luật chính vẫn ở code)

| Cơ chế | Nơi | Giữ điều gì |
|---|---|---|
| `orders_money_insert` / `_update`, `order_item_money_insert` / `_update` | 0007 | `total = subtotal − discount`, `remaining = total − deposit`, không âm, có cọc phải có `deposit_method`; `line_total = quantity * unit_price` |
| `order_item_service_scope_insert` / `_update` | 0008 | `service_id` phải thuộc đúng đơn đó |
| `order_service_frozen_insert` / `_delete` / `_update` | 0008 | đơn không còn `draft` thì không thêm/xoá dịch vụ, không đổi dịch vụ hay số khách (trường vận hành vẫn sửa được) |
| `order_service_confirmed_keeps_date` | 0008 | đơn đã xác nhận không được xoá `depart_date` |
| `orders_confirm_requires_trip` | 0008 | lúc chuyển sang `confirmed`: có ≥ 1 dịch vụ, mọi dịch vụ có ngày khởi hành và ≥ 1 khách |
| `pty_party_role_no_overlap_ins` / `_upd`, `pty_relationship_no_overlap_ins` / `_upd`; `pty_contact_primary_uq` | 0011 | vai trò và quan hệ không chồng lấn khoảng hiệu lực; chỉ mục duy nhất **một phần**: mỗi hồ sơ tối đa một liên hệ chính cho mỗi loại (dòng còn mở) |
| `pty_party_role_open_uq`, `pty_relationship_open_uq`, `stf_permission_open_uq` | 0011/0012 | mỗi bộ khoá tối đa **một dòng đang mở** (`valid_to… IS NULL`) |
| `staff_party_uq` | 0012 | một hồ sơ tối đa một tài khoản (`WHERE party_id IS NOT NULL`) |
| `dsp_assignment_handler_open_uq`, `dsp_assignment_grain_ck`, `dsp_assignment_handle_grain_ck` | 0014 | mỗi đơn tối đa **một `HANDLE` đang mở** (chỉ mục duy nhất một phần); đúng MỘT trong `order_id`/`order_service_id`; `HANDLE` chỉ ở hạt đơn (không thì `order_id` NULL lọt chỉ mục). Cố ý KHÔNG có trigger chống chồng lấn khoảng đã đóng: đổi người đóng dòng cũ và mở dòng mới cùng một thời điểm |
| `CHECK` | 0003/0011… | tập ĐÓNG: `orders.status`, `deposit_method`, `party_kind`, khuôn dạng ngày `YYYY-MM-DD` / giờ `HH:MM` |

### Migration

| # | Tệp | Nội dung |
|---|---|---|
| 0001 | `0001_staff.sql` | bảng `staff` |
| 0002 | `0002_company_profile.sql` | bảng `company_profile` (singleton `default`) |
| 0003 | `0003_orders.sql` | bảng `orders`, `order_item` và chỉ mục |
| 0004 | `0004_audit_log.sql` | bảng `audit_log` (ban đầu bắt buộc gắn đơn) |
| 0005 | `0005_admin_and_login_throttle.sql` | dựng lại `audit_log` cho hành động không thuộc đơn; `staff.credentials_changed_at`; bảng `login_attempt` |
| 0006 | `0006_catalog.sql` | `audit_log.staff_id` cho phép NULL (hệ thống); `catalog_item`, `catalog_override`, `catalog_sync` |
| 0007 | `0007_audit_open_actions_catalog_code_money_guards.sql` | bỏ `CHECK` liệt kê của `audit_log` (danh sách chuyển về code); `order_item.catalog_code`; 4 trigger bất biến tiền |
| 0008 | `0008_order_service.sql` | bảng `order_service`; `order_item.service_id/catalog_price/pax_code`; di trú đơn cũ; 6 trigger đóng băng và điều kiện xác nhận |
| 0009 | `0009_orders_label_view.sql` | view công bố `v_ord_order_label` |
| 0010 | `0010_locations.sql` | `loc_location_type`, `loc_location` (8 dòng nạp sẵn), `v_loc_location_label` |
| 0011 | `0011_parties.sql` | toàn bộ `pty_*` + trigger không chồng lấn + `v_pty_party_label` |
| 0012 | `0012_staff_permissions_party.sql` | `stf_permission_type`, `stf_permission`, `staff.party_id`, `v_stf_staff_label`, backfill hồ sơ/vai trò `STAFF`/quyền cho tài khoản có sẵn |
| 0013 | `0013_company_email.sql` | bản v1.0, CHƯA lên production: chỉ dữ liệu — điền `company_profile.email` (không đổi cấu trúc) |
| 0014 | `0014_dispatch.sql` | bản v1.0, CHƯA lên production: chỉ THÊM — `dsp_task_kind`, `dsp_assignment_status`, `dsp_assignment` (đủ cột cả hạt dịch vụ), `v_dsp_order_handler`; **backfill** mỗi đơn hiện có một dòng `HANDLE` đang mở = người lập đơn (qua `staff.party_id`; tài khoản chưa có hồ sơ thì đơn đó tạm chưa có người phụ trách) |

Migration siết B5 (`staff_party_required`: bắt buộc `staff.party_id`) **chưa có trong `migrations/`** — cố ý, theo expand–contract (`docs/HANDOFF-N1.md`); số thứ tự của nó là số kế tiếp sau `0014` (không còn là `0013`).

---

## 6. Luồng nghiệp vụ chính

### (a) Đăng nhập

```mermaid
sequenceDiagram
  participant W as web/login.ts
  participant R as POST /api/auth/login
  participant C as Cloudflare siteverify
  participant T as throttle
  participant S as staff.authenticate
  W->>R: phone, pin và turnstileToken
  R->>C: turnstileGate (bỏ qua nếu chưa đặt TURNSTILE_SECRET_KEY)
  C-->>R: đạt (không đạt thì R trả W ngay 403 turnstile_failed hoặc 503 turnstile_unavailable)
  R->>T: reserveAttempts theo ip và phone
  T-->>R: allowed hoặc 429 too_many_attempts
  R->>S: normalizePhone rồi verifyPin
  S-->>R: StaffProfile hoặc null
  R-->>W: 200 set-cookie td_session hoặc 401 invalid_credentials
```

*Turnstile đứng TRƯỚC bộ chống dò: không có token thì không chạm bộ đếm. Trạng thái hiện tại của mã: máy chủ đã có bước này, `web/login.ts` CHƯA gửi `turnstileToken` (task 3). SĐT không tồn tại vẫn chạy `verifyDummy` để không lộ tài khoản; thành công thì `clearAttempts` xoá bộ đếm của SĐT.*

### (b) Lập đơn nháp

`web/order-form.ts` (thẻ dịch vụ + bộ đếm + đơn giá) → `POST /api/orders` → `validationContext(db, null)` nạp danh mục hiệu lực → `validateOrder` (`orders/rules.ts`) → với mỗi dịch vụ `validateService` (`orders/service-rules.ts`) → `buildLines` (`shared/order-lines.ts`) sinh dòng tiền → `createOrder` (`orders/repository.ts`) ghi **một `db.batch`**: `INSERT orders` (mã đơn `TD-YYYYMMDD-NNNN` sinh ngay trong câu `INSERT` bằng `MAX(...)+1`, thử lại tối đa 3 lần nếu đụng `UNIQUE`) + `INSERT order_service`… + `INSERT order_item`… + `auditStatement(action: "created", detail: summarizeDeviations(...))`. Mọi số tiền do **server** tính, không nhận từ client.

### (c) Sửa đơn nháp

`PUT /api/orders/:id` kiểm `can(staff, "order.modify", {ownerId})`, `status === "draft"`, và **khoá lạc quan** `expectedUpdatedAt`. `updateDraftOrder` chạy một `db.batch`: `UPDATE orders … WHERE status = 'draft' AND updated_at = ?` → dòng nhật ký `updated` có `id` riêng chỉ chèn khi `changes() > 0` → `DELETE order_item` → `DELETE order_service` → chèn lại, mọi câu sau mang `wonGuard` = `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`. Thua → route đọc lại và trả **409 `stale`** (hoặc `not_editable` nếu đơn đã đổi trạng thái).
Xung đột giá: nếu `catalogPriceSeen` của form khác giá danh mục hiện tại, `validateService` trả **409 `catalog_changed`** kèm `changes[]` (`serviceIndex`, `catalogCode`, `pax`, `seen`, `current`); `classifyOrderError` (`shared/order-errors.ts`) biến nó thành banner "Giá danh mục vừa đổi". Nháp cũ giữ **bản chụp** (`snapshotService`): dịch vụ đã lưu, cùng mã và cùng số khách thì không tra lại danh mục nên dịch vụ đã ẩn/đổi giá vẫn sửa được.

### (d) Xác nhận và huỷ đơn

`POST /api/orders/:id/status` với `status: "confirmed" | "cancelled"`; `canTransition` cho `draft → confirmed|cancelled` và `confirmed → cancelled`, không có đường quay lại.
`confirmOrder` đặt điều kiện **trong chính câu `UPDATE`**: còn `draft`, có ≥ 1 dịch vụ, không dịch vụ nào thiếu ngày khởi hành, ngoài khoảng `[hôm nay, hôm nay + MAX_DAYS_AHEAD]` hoặc có tổng khách < 1. Thua → route đọc lại: đã đổi trạng thái thì **409 `invalid_transition`**, thiếu chuyến thì **409 `incomplete_trip`** kèm `missing[]` do `confirmGaps` dựng (`no_date`, `past_date`, `too_far`, `no_guests`). Trigger `orders_confirm_requires_trip` là lưới thứ hai.
`cancelOrder` dùng điều kiện `status = <from>`; thua → **409 `invalid_transition`**. Cả hai ghi nhật ký với `changes() > 0`.

### (e) Sửa thông tin chuyến sau xác nhận

`PUT /api/orders/:id/trip` (quyền `order.trip.edit`) chấp nhận cả đơn `draft` và `confirmed`, từ chối đơn `cancelled`. `validateTripUpdate` bắt gửi **mọi** dịch vụ của đơn (thân thay toàn bộ); với đơn đã xác nhận, `departDate` không được xoá và nếu **đổi** thì ngày mới phải nằm trong cửa sổ cho phép. `describeTripUpdates` dựng dòng nhật ký `trip_updated` — ngày/giờ ghi "trước → sau", còn điểm đón / nơi check-in / ghi chú **chỉ ghi "đổi"** (không đưa dữ liệu cá nhân vào nhật ký). `updateTrip` dùng cùng cặp khoá lạc quan + `wonGuard`. Giao diện: `web/trip-sheet.ts`.

### (f) Đồng bộ danh mục dịch vụ

Hai lối vào cùng một hàm `syncCatalog(env, actorId, {force})` (`catalog/service.ts`): Cron 15 phút (`actorId = null` → nhật ký ghi là hệ thống) và `POST /api/catalog/sync` của admin. Ngoài ra `GET /api/catalog` gọi `bootstrapIfNeverSynced` — chỉ request giành được quyền (`claimFirstSync`) mới kéo Sheet lần đầu.
Các bước: `markAttempt` → `fetchSheetCsv` → `parseCatalogSheet` (cột bắt buộc `Mã tour`, `Tên tour`, `Đơn vị`, `Giá người lớn`; **cố ý không đọc** `Khoá giá`, `Đường dẫn`, `Ghi chú nội bộ`) → `planSync` (`added` / `changed` / `missing` / `unchanged`) → **chốt chặn `syncGuard`**: Sheet không còn dịch vụ hợp lệ nào, hoặc sẽ ẩn quá nửa số dịch vụ khi đang có ≥ 4 → **409 `sync_guard`**, chưa áp thay đổi nào (admin có thể gửi `force: true`). Lỗi mạng → 502 `sheet_unreachable`; mất quyền chia sẻ / sai định dạng → 424. Dịch vụ biến mất khỏi Sheet chỉ bị **đặt `in_sheet = 0`**, không xoá.
**Ghi đè của admin không bị lần đồng bộ sau đè mất**: nằm ở bảng riêng `catalog_override`; `applyOverride` phủ lên giá Sheet và so `base_json` để báo `conflicts` khi Sheet đổi giá; `acknowledge` ("Giữ ghi đè") chụp lại mốc mới; `DELETE /api/catalog/:code/override` quay về theo Sheet.

### (g) Nạp nhân viên từ Sheet

`GET /api/staff/sheet` đọc Sheet nhân viên, đối chiếu với D1 và trả `candidates[]` với `status` `new` / `same` / `name_differs`, `problems[]`, `notInSheet[]` (chỉ **xem trước**, không ghi gì).
`POST /api/staff/sheet/apply` nhận `phones[]`, **tải lại Sheet** và chỉ tin dữ liệu Sheet (không tin tên/SĐT do client gửi), bỏ SĐT đã có tài khoản, rồi ghi **một `db.batch`**: với mỗi người `createAccountStatements` (hồ sơ `pty_party` → `pty_person` → vai trò `pty_party_role` `STAFF` → `staff` → `stf_permission` `SALES`) + nhật ký `staff_created`, cuối cùng một dòng `staff_synced`. Tài khoản mới **chỉ có quyền `SALES`**; PIN sinh ngẫu nhiên và trả về một lần trong phản hồi (không bao giờ vào nhật ký). Dự phòng dòng lệnh: `scripts/import-staff.mjs`.

### (h) Cấp/đổi quyền và đổi PIN

- `PUT /api/staff/:id/permissions`: `cleanPermissions` (mảng không rỗng, mã hợp lệ, theo thứ tự chuẩn) → `checkAccountChange` chặn tự đổi quyền của chính mình và chặn mất quản trị viên cuối → `setPermissionStatements` đóng dòng cũ (`valid_to_at`) và mở dòng mới; khi bỏ `ADMIN`, câu chốt đứng đầu batch và mọi câu sau mang `changes() > 0` → thua trả **409 `account_rule`**.
- `PATCH /api/staff/:id` (tên, SĐT, ngưng/kích hoạt): `patchStaffStatements` giữ thứ tự chốt → nhật ký → đổi tên ở hồ sơ (`renameAccountStatements`); SĐT trùng → **409 `phone_taken`**; chưa có hồ sơ → **409 `no_party`**. `POST /api/staff/:id/reset-pin` sinh PIN mới, ghi `pin_reset` **không chứa PIN**, mở khoá đăng nhập, trả PIN một lần.
- `POST /api/account/change-pin`: kiểm PIN hiện tại qua `verifyPinThrottled` (PIN sai → 403 `invalid_credentials`), `validateNewPin` chặn PIN yếu và trùng PIN cũ, ghi `pin_changed`, rồi cấp cookie phiên mới.

### (i) Hồ sơ và địa điểm

`web/parties.ts` → `/api/parties*`: `GET /api/parties/meta` (loại vai trò + loại quan hệ), `GET /api/parties/lookup?phone=` cảnh báo trùng SĐT trước khi tạo, `GET/POST /api/parties`, `GET/PUT /api/parties/:id` (khoá lạc quan → 409 `stale`). Liên hệ: thêm và **đóng** (`/contacts`, `/contacts/:cid/end`) — nhân sự văn phòng làm được. Vai trò và quan hệ (`/roles`, `/relationships` và hai đường `…/end`) chỉ **admin**; đụng ràng buộc chồng lấn → 409 `role_overlap` / `relationship_overlap`.
`web/locations.ts` → `/api/locations`: mọi tài khoản đăng nhập **đọc** được (nhãn không nhạy cảm, người làm hiện trường cũng cần), chỉ admin thêm/sửa; mã trùng → 409 `code_taken`. Không có đường xoá cứng — ngưng dùng bằng `active = 0`.

---

## 7. Danh mục API

Tất cả 42 route khai bằng `route(...)` trong `src/modules/*/index.ts`.

| Phương thức | Đường dẫn | Mức truy cập | Module | Mục đích |
|---|---|---|---|---|
| GET | `/api/auth/config` | public | auth | `{ turnstileSiteKey }` — khoá site để trang đăng nhập dựng widget; `null` = Turnstile tắt |
| POST | `/api/auth/login` | public | auth | đăng nhập SĐT + PIN (+ `turnstileToken` khi Turnstile bật), đặt cookie phiên; 403 `turnstile_failed` / 503 `turnstile_unavailable` |
| GET | `/api/auth/me` | staff | auth | hồ sơ nhân viên của phiên hiện tại |
| POST | `/api/auth/logout` | public | auth | xoá cookie phiên |
| POST | `/api/account/change-pin` | staff | accounts | tự đổi PIN (thu hồi phiên cũ, cấp phiên mới) |
| GET | `/api/staff` | admin | accounts | danh sách tài khoản kèm cờ đang bị khoá đăng nhập |
| POST | `/api/staff` | admin | accounts | tạo tài khoản thủ công (kèm hồ sơ, trả PIN một lần) |
| GET | `/api/staff/sheet` | admin | accounts | xem trước danh sách nhân viên từ Google Sheet |
| POST | `/api/staff/sheet/apply` | admin | accounts | tạo tài khoản cho các SĐT đã chọn (quyền `SALES`) |
| PATCH | `/api/staff/:id` | admin | accounts | sửa tên, SĐT đăng nhập, ngưng/kích hoạt |
| PUT | `/api/staff/:id/permissions` | admin | accounts | đặt tập quyền app của tài khoản |
| POST | `/api/staff/:id/reset-pin` | admin | accounts | đặt lại PIN và mở khoá đăng nhập |
| POST | `/api/staff/:id/unlock` | admin | accounts | mở khoá đăng nhập (xoá bộ đếm theo SĐT) |
| GET | `/api/orders` | office | orders | danh sách đơn, lọc `q` / `status`, phân trang `limit`/`offset` |
| POST | `/api/orders` | office | orders | lập đơn nháp |
| GET | `/api/orders/:id` | office | orders | chi tiết đơn + lịch sử + cờ `canModify` |
| PUT | `/api/orders/:id` | office | orders | sửa đơn nháp (khoá lạc quan `expectedUpdatedAt`) |
| PUT | `/api/orders/:id/trip` | office | orders | sửa thông tin chuyến (kể cả đơn đã xác nhận) |
| POST | `/api/orders/:id/status` | office | orders | xác nhận hoặc huỷ đơn |
| GET | `/api/catalog` | office | catalog | danh mục dịch vụ đang bán (giá hiệu lực) + trạng thái đồng bộ |
| GET | `/api/catalog/admin` | admin | catalog | danh mục đầy đủ: giá Sheet, ghi đè, ẩn, xung đột |
| POST | `/api/catalog/sync` | admin | catalog | "Đồng bộ ngay" (nhận `force` để vượt chốt chặn) |
| PATCH | `/api/catalog/:code` | admin | catalog | ghi đè giá và/hoặc ẩn/hiện một dịch vụ |
| POST | `/api/catalog/:code/ack` | admin | catalog | "Giữ ghi đè" sau khi Sheet đổi giá |
| DELETE | `/api/catalog/:code/override` | admin | catalog | bỏ toàn bộ ghi đè, quay về theo Sheet |
| GET | `/api/audit` | admin | audit | nhật ký toàn hệ thống, lọc `action` / `q`, phân trang |
| GET | `/api/locations` | staff | locations | danh sách địa điểm + loại địa điểm |
| POST | `/api/locations` | admin | locations | thêm địa điểm |
| PUT | `/api/locations/:id` | admin | locations | sửa địa điểm (khoá lạc quan) |
| GET | `/api/company` | public | company | hồ sơ công ty công khai `{ company }`: tên, MST, địa chỉ, hotline, email (không Zalo/logo/người sửa) |
| GET | `/api/parties/meta` | office | parties | loại vai trò và loại quan hệ |
| GET | `/api/parties/lookup` | office | parties | tra hồ sơ theo SĐT (cảnh báo trùng) |
| GET | `/api/parties` | office | parties | danh sách hồ sơ, tìm/lọc, phân trang |
| POST | `/api/parties` | office | parties | tạo hồ sơ cá nhân hoặc tổ chức |
| GET | `/api/parties/:id` | office | parties | chi tiết hồ sơ (liên hệ, vai trò, quan hệ) |
| PUT | `/api/parties/:id` | office | parties | sửa hồ sơ (khoá lạc quan) |
| POST | `/api/parties/:id/contacts` | office | parties | thêm điểm liên hệ |
| POST | `/api/parties/:id/contacts/:cid/end` | office | parties | đóng một điểm liên hệ |
| POST | `/api/parties/:id/roles` | admin | parties | gán vai trò hồ sơ (kèm nơi, khoảng hiệu lực) |
| POST | `/api/parties/:id/roles/:rid/end` | admin | parties | kết thúc một vai trò |
| POST | `/api/parties/:id/relationships` | admin | parties | thêm quan hệ giữa hai hồ sơ |
| POST | `/api/parties/:id/relationships/:rid/end` | admin | parties | kết thúc một quan hệ |

---

## 8. Phân quyền

Hai tầng, cả hai **mặc định từ chối**:

1. **Router** (`access` của từng route) — lớp thô: `public` / `staff` (mọi tài khoản đăng nhập) / `office` (`isOffice(staff)` = `can(staff, "order.view")`, tức mọi quyền trừ chỉ-`FIELD`) / `admin` (`hasPermission(staff, "ADMIN")`).
2. **`can(who, op, ctx)`** (`src/shared/permissions.ts`) — bản đồ ADR-0007, MỘT nguồn dùng chung server ↔ `web/`. Thao tác lạ hoặc ô không khai → `false`.

**Phạm vi (`Scope`)**: `none` không được · `own` chỉ đơn của mình (`orders.staff_id`) · `assigned` chỉ việc đang được giao (N2, chưa có nguồn dữ liệu) · `ownOrAssigned` một trong hai · `any` tất cả. Quyền của một người là **hợp** các ô của mọi quyền họ có.

| Thao tác | SALES | ACCOUNTING | ADMIN | FIELD | Thi hành ở đâu |
|---|---|---|---|---|---|
| `order.view` | any | any | any | none | gián tiếp qua `isOffice` (router `office`) |
| `money.view` | any | any | any | none | `web/` (hiển thị tiền, bảng giá) |
| `order.history.view` | ownOrAssigned | any | any | none | `GET /api/orders/:id` (rỗng nếu không được) |
| `contact.view` | any | any | any | assigned | **chưa có route** dùng |
| `order.create` | any | none | any | none | `POST /api/orders`; `web/shell.ts`, `web/orders.ts`, `web/order-form.ts` |
| `order.modify` | ownOrAssigned | none | any | none | `PUT /api/orders/:id`, `POST /api/orders/:id/status`, cờ `canModify` |
| `order.trip.edit` | ownOrAssigned | none | any | none | `PUT /api/orders/:id/trip` |
| `task.progress` | none | none | any | assigned | **chưa có route** (N2) |
| `order.money.edit` | own | any | any | none | **chưa có route** (N3) |
| `dispatch.assign` | ownOrAssigned | none | any | none | **chưa có route** (module `dispatch`, kế hoạch bản v1.0) |
| `dispatch.claim` | any | none | any | none | **chưa có route** (như trên); nhận phụ trách đơn chưa có người — điều kiện "chưa có người" do dịch vụ của `dispatch` kiểm, không phải ô này |
| `payment.receive` | own | any | any | none | **chưa có route** (N3) |
| `payment.refund` | none | any | any | none | **chưa có route** (N3) |
| `invoice.request` | own | any | any | none | **chưa có route** (N3) |
| `invoice.issue` | none | any | any | none | **chưa có route** (N3) |
| `party.view` | any | any | any | none | router `office` trên `/api/parties*` |
| `party.write` | any | any | any | none | router `office` trên `/api/parties*` |
| `admin.manage` | none | none | any | none | router `access: "admin"` |

Các ô "chưa có route" có mặt để **khoá bản đồ bằng test** (`src/shared/permissions.test.ts`) trước khi N2/N3 tới.
Nơi `can()` thực sự được gọi trong mã: `src/modules/orders/index.ts` (5 chỗ), `web/shell.ts`, `web/orders.ts`, `web/order-form.ts`. Giao diện chỉ **ẩn/hiện**; máy chủ luôn kiểm lại.
Vai trò hồ sơ (HDV, tài xế…) **không bao giờ** là điều kiện cho phép — `src/architecture.test.ts` bắt mọi tệp ngoài `src/modules/parties/` nhắc tới `pty_party_role`.

---

## 9. Giao diện

| Trang | HTML | Bundle | API gọi | Ai vào được |
|---|---|---|---|---|
| Đơn hàng (danh sách) | `public/index.html` | `web/orders.ts` | `/api/auth/me`, `/api/orders` | office |
| Đăng nhập | `public/login.html` | `web/login.ts` | `/api/auth/login`, `/api/auth/me` | công khai |
| Lập/sửa đơn | `public/order-form.html` | `web/order-form.ts` | `/api/catalog`, `/api/orders` | có `order.create` |
| Chi tiết đơn | `public/order.html` | `web/order.ts` | `/api/orders/:id`, `/api/orders/:id/status`, `/api/orders/:id/trip` | office |
| Tôi | `public/account.html` | `web/account.ts` | `/api/auth/me`, `/api/account/change-pin` | mọi tài khoản |
| Hồ sơ | `public/parties.html` | `web/parties.ts` | `/api/parties*`, `/api/locations` | office (vai trò/quan hệ: admin) |
| Địa điểm | `public/locations.html` | `web/locations.ts` | `/api/locations` | admin |
| Dịch vụ | `public/catalog.html` | `web/catalog.ts` | `/api/catalog/admin`, `/api/catalog/sync`, `/api/catalog/:code*` | admin |
| Nhân viên | `public/staff.html` | `web/staff.ts` | `/api/staff*` | admin |
| Nhật ký | `public/audit.html` | `web/audit.ts` | `/api/audit` | admin |

**Lớp logic thuần dùng chung server ↔ `web/`** (`src/shared/`, không import `src/modules/` — `src/architecture.test.ts` kiểm):

| Tệp | Vai trò |
|---|---|
| `contracts.ts` | hợp đồng API: **chỉ kiểu**, `web/api.ts` re-export |
| `permissions.ts` | bản đồ quyền → thao tác, `can`, `isOffice`, `hasPermission` |
| `order-lines.ts` | `buildLines`, `parseUnit`, `PAX_*`, `priceDeviation`, `MAX_AMOUNT_VND`, `MAX_GUESTS_PER_SERVICE`, `CATALOG_CODE_RE` |
| `trip-rules.ts` | `MAX_SERVICES`, `MAX_LINES_PER_ORDER`, `MAX_DAYS_AHEAD`, `confirmWindow`, `MISSING_LABEL` |
| `trip-form.ts` | giá trị ô thông tin chuyến, cảnh báo ngày/giờ, thân `PUT /trip` |
| `service-form.ts` | bản nháp một thẻ dịch vụ, dòng tiền xem trước, lỗi chặn Lưu |
| `order-errors.ts` | `classifyOrderError`: phản hồi lỗi → một banner (giọng, tiêu đề, dòng, hành động) |
| `order-view.ts` | DTO → mô hình hiển thị trang đơn, bộ nút theo trạng thái và quyền |
| `audit-actions.ts` | nguồn duy nhất của `audit_log.action` và `target_type` + nhãn tiếng Việt |
| `vn-date.ts` | `vnToday`, `addDays`, `isISODate`, `isHHMM` theo giờ Việt Nam (UTC+7) |
| `phone.ts` / `safe-next.ts` | chuẩn hoá SĐT Việt Nam / chặn open redirect cho `?next=` |
| `sw-policy.ts` | `PAGES`, `PRECACHE`, `routeFor`, `isCacheable`, `CACHE_NAME` |
| `router.ts`, `http.ts`, `csv.ts`, `encoding.ts`, `sheets.ts`, `sql-registry.ts` | hạ tầng chỉ dùng ở server |

**Thành phần DOM** (`web/`): `dom.ts` (`h()` — chỉ `textContent`/`createTextNode`, **không bao giờ `innerHTML`**), `icons.ts` (SVG bằng `createElementNS`), `shell.ts` (thanh đầu trang + thanh tab + điều hướng theo quyền), `banner.ts`, `counter.ts` (− / ô số / +), `money-input.ts`, `service-card.ts`, `catalog-picker.ts`, `order-services.ts`, `trip-fields.ts`, `trip-sheet.ts`, `format.ts`, `pwa.ts`.

**PWA.** `public/manifest.webmanifest` (`name` "Tour Đảo Booking", `short_name` "Tour Đảo", `display: standalone`, `theme_color` `#0c4a6e`), `public/icons/*` (RGB, không alpha), service worker `web/sw/sw.ts` → `public/sw.js` với `__BUILD_ID__` 14 chữ số. Chính sách ở `src/shared/sw-policy.ts`: **danh sách cho phép đóng theo mặc định** (`PAGES` 10 đường dẫn + `STATIC_FILE` đúng mẫu) và **lớp chắn theo content-type** (`isCacheable`) ⇒ `/api/*` không bao giờ vào cache, kể cả `//api/…`.

**CSS.** `public/app.css` khai toàn bộ token ở `:root` (màu `--c-*`, bo góc, bóng, font, `--tap-min: 44px`, `--bar-h`, `--tabbar-h`, các cỡ chữ `--fs-*`…). **Từ dấu mốc `/* ---------- app iPhone (PWA)` đến cuối tệp chỉ được dùng token**: `tests/e2e/pwa.mjs` cắt phần đó, bỏ chú thích và điều kiện `@media`, rồi bắt lỗi nếu còn màu hex, `rgb()/hsl()`, số `px` (trừ đúng `1px`) hay `rem/em`. Bộ quét này **không** bắt tên màu (`red`), `%`, `vw/vh/ch`, `color-mix()` — vẫn phải tự kiểm. `theme_color` của manifest phải bằng token `--c-primary`, cũng do `pwa.mjs` đối chiếu. Font tự lưu trữ: 6 tệp `public/fonts/*.woff2` (Nunito, Be Vietnam Pro), mỗi tệp phải có thật, đúng `content-type: font/woff2` và nằm trong `PRECACHE`.

---

## 10. Build, kiểm thử, triển khai

**Script (`package.json`).**

| Lệnh | Làm gì |
|---|---|
| `npm run dev` | `wrangler dev` (tự chạy `build:web` nhờ `build.command` + `watch_dir: web`) |
| `npm run build:web` | esbuild 10 trang `web/*.ts` → `public/js/` (`--bundle --format=esm --target=es2022 --minify`), rồi `web/sw/sw.ts` → `public/sw.js` (`--format=iife`, `--define:__BUILD_ID__` = dấu thời gian 14 chữ số) |
| `npm run typecheck` | `tsc --noEmit` cho server, `-p web`, `-p web/sw` |
| `npm test` | `node --test "src/**/*.test.ts"` |
| `npm run test:e2e` | `node tests/e2e/run.mjs` |
| `npm run types` / `npm run dict` | sinh `worker-configuration.d.ts` / sinh lại `docs/DATA-DICTIONARY.md` từ `docs/data-dictionary.json` |
| `npm run db:migrate:local` / `:remote` | `wrangler d1 migrations apply tourdao-sales-db --local` / `--remote` |

**Thêm một trang mới phải khai ở 4 nơi** (không có nơi nào tự suy ra):
`public/<tên>.html` → mục `esbuild` của `build:web` trong `package.json` → `PAGES` (và nếu cần, `PRECACHE`) trong `src/shared/sw-policy.ts` → điều hướng trong `web/shell.ts`. Hai bài kiểm bắt lỗi nếu quên: `src/shared/sw-policy.test.ts` đối chiếu `PAGES` với các tệp HTML trong `public/`, và `tests/e2e/pwa.mjs` yêu cầu mọi đường dẫn trong `PAGES ∪ PRECACHE` trả 200 với content-type qua được `isCacheable`, đồng thời kiểm thẻ meta iOS và tên/màu trên 8 trang.

**Các lớp kiểm.**

- **Unit** `src/**/*.test.ts` (`node --test`, chạy thẳng TypeScript nên tệp thuần import nhau bằng đuôi `.ts`). Nổi bật: `src/architecture.test.ts` — dựng schema thật từ `migrations/*.sql` bằng `node:sqlite`, kiểm ranh giới import theo `ALLOWED_EDGES`, đồ thị không vòng, `shared/` và `web/` không import module, sổ dữ liệu ↔ schema, tiền tố bảng, khoá ngoại xuyên module, view công bố đúng cột và không `INSTEAD OF`, cột kiểm toán của bảng mới, và **ranh giới SQL bằng `EXPLAIN`** cho module "nghiêm" (`company`, `locations`, `parties`, `staff` — SQL phải đi qua `defineSql` của `src/shared/sql-registry.ts`, và `.prepare(` không được nhận chuỗi/template thô).
- **E2E** `tests/e2e/*.mjs` qua `tests/e2e/run.mjs`: dựng D1 local **tạm** trong `mktemp` (không đụng `.wrangler/state`), áp migration, seed tài khoản, chạy `wrangler dev` trên cổng tự do với `SESSION_SECRET` ngẫu nhiên và Turnstile BẬT bằng khoá thử của Cloudflare (`--var TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY`; mọi đăng nhập trong kịch bản gửi token thử), rồi chạy 12 kịch bản `platform, pwa, orders, trip, admin, turnstile, catalog, admin-race, locations, parties, permissions, company`. **Cần mạng**: `admin.mjs` và `catalog.mjs` đọc Google Sheet thật; mọi đăng nhập gọi siteverify của Cloudflare, và `turnstile.mjs` kiểm thêm hợp đồng với siteverify thật. Chạy đủ bộ thì bước cuối là `scripts/audit-invariants.mjs --strict`.
- **Bất biến dữ liệu**: `scripts/audit-invariants.mjs --db local|remote [--strict]` — **chỉ đọc** (`SELECT`/`PRAGMA`), mỗi kiểm `R-N1-*` / `R-DSP-*` (người phụ trách đơn) là một câu SQL đếm dòng vi phạm, thoát mã 1 nếu có; mức `warn` (R-DSP-2) chỉ cảnh báo, không bao giờ đỏ.
- **Kịch bản Chrome thật**: `docs/evidence/2026-09-20-a2/kich-ban/` (`a2-smoke-form.mjs`, `a2-smoke-order.mjs`, `a2-smoke-sheet.mjs`, `a2-cdp.mjs`, `a2-evidence.mjs`, `chrome-wrap.sh`) — **không nằm trong CI**; bắt buộc chạy lại khi sửa `web/order-form.ts`, `web/order.ts`, `web/trip-sheet.ts` (ba tệp này không có kiểm tự động trong repo).

**Môi trường.** Local: `cp .dev.vars.example .dev.vars` (điền `SESSION_SECRET` ≥ 32 ký tự) → `npm run db:migrate:local` → `scripts/create-staff.mjs` in SQL tạo tài khoản → `npm run dev`. Thử trên iPhone thật với D1 tạm: `node scripts/dev-iphone.mjs` (thêm `--tunnel` để có HTTPS tạm, mới có service worker). Production: Cloudflare **không nối GitHub** — `git push` không deploy; quy trình áp migration rồi `wrangler deploy` ngay trong cùng lượt, cổng chỉ-đọc trước khi áp, điểm khôi phục Time Travel, cửa sổ đóng băng thao tác tài khoản và cách hoàn tác: **xem `docs/HANDOFF-N1.md`** (không chép lại ở đây).

---

## 11. Bảo mật

| Mối đe doạ | Biện pháp | Nơi trong mã |
|---|---|---|
| CSRF / ghi từ trang khác | Cookie `SameSite=Lax` + kiểm `Origin` (dự phòng `Sec-Fetch-Site`) cho mọi phương thức ghi → 403 `cross_origin`; thân bắt buộc `application/json` → chặn form `enctype="text/plain"` giả JSON | `src/shared/router.ts#checkWriteRequest`, `session.ts#sessionCookie` |
| Dò PIN (1 triệu tổ hợp) | Giới hạn 5 lần/SĐT và 30 lần/IP trong 15 phút, đặt chỗ trước khi kiểm; PBKDF2 100k vòng; dùng chung bộ đếm cho đổi PIN | `src/modules/auth/throttle.ts`, `verifyPinThrottled`, `staff/password.ts` |
| Bot dò PIN / khoá SĐT của người khác | Cloudflare Turnstile kiểm ở `POST /api/auth/login` TRƯỚC bộ chống dò: không có token thì 403 mà không tiêu hao lượt thử của SĐT; đóng khi Cloudflare lỗi (503). Chỉ có tác dụng khi `TURNSTILE_SECRET_KEY` được đặt (mục 4) | `src/modules/auth/turnstile.ts`, `auth/index.ts` |
| Chiếm phiên / phiên cũ sống dai | Token ký HMAC-SHA256, so bằng `timingSafeEqual`, TTL 7 ngày, cookie `HttpOnly` + `Secure` trên https; đổi/đặt lại PIN đẩy `credentials_changed_at` ⇒ mọi phiên cũ bị từ chối | `auth/session.ts`, `staff/index.ts#getActiveStaff` |
| Vượt quyền | Mặc định từ chối hai tầng: `access` của route (401/403) và `can()` theo phạm vi `own`/`any`; ô không khai = không được; giao diện chỉ ẩn/hiện, máy chủ luôn kiểm lại | `src/shared/router.ts`, `src/shared/permissions.ts` |
| XSS | `web/dom.ts` chỉ dựng DOM qua `textContent`/`createTextNode`, repo không dùng `innerHTML`; CSP `script-src 'self'` (không inline, không CDN), `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'` | `web/dom.ts`, `web/icons.ts`, `public/_headers` |
| Lộ PII trong nhật ký | Nhật ký chuyến **chỉ ghi "đổi"** cho điểm đón / nơi check-in / ghi chú; `pin_reset` và `staff_created` không chứa PIN; log lỗi chỉ có `requestId`, method, path; `checkAuthConfig` không in giá trị bí mật | `orders/service-rules.ts#describeTripChange`, `accounts/index.ts`, `router.ts` |
| Tin tiền từ trình duyệt | Mọi `line_total`, `subtotal`, `total`, `remaining_amount` do server tính từ danh mục + số khách; `catalogPriceSeen` của form chỉ dùng để phát hiện lệch giá → 409 `catalog_changed`; trigger tiền ở 0007 là lưới cuối | `orders/rules.ts`, `orders/service-rules.ts`, `migrations/0007…` |
| Sheet độc hại hoặc hỏng | Chỉ đọc, timeout 8 giây, kiểm `content-type` và phát hiện trang HTML trả về với mã 200 (mất quyền chia sẻ); `syncGuard` chặn lần đồng bộ sẽ ẩn hàng loạt; dịch vụ biến mất chỉ bị ẩn; dữ liệu Sheet được tải lại và **không** tin thân request khi áp dụng | `src/shared/sheets.ts`, `catalog/rules.ts#syncGuard`, `accounts/index.ts` |
| Open redirect; SQL injection | `safeNext` chỉ nhận đường dẫn nội bộ; mọi câu SQL tham số hoá, tên bảng trong `insertRow` là union literal, module nghiêm phải `defineSql` và bị `EXPLAIN` soi | `src/shared/safe-next.ts`, `orders/repository.ts`, `src/shared/sql-registry.ts` |

---

## 12. Giới hạn và hiệu năng

**Hằng nghiệp vụ (giá trị thật trong mã).**

| Hằng | Giá trị | Nơi |
|---|---|---|
| `MAX_SERVICES` | 20 dịch vụ / đơn | `src/shared/trip-rules.ts` |
| `MAX_LINES_PER_ORDER` | 50 dòng tiền / đơn (cũng là trần dòng nhập tay của một dịch vụ) | `src/shared/trip-rules.ts` |
| `MAX_DAYS_AHEAD` | 365 ngày (cửa sổ xác nhận) | `src/shared/trip-rules.ts` |
| `MAX_GUESTS_PER_SERVICE` | 50 khách / dịch vụ | `src/shared/order-lines.ts` |
| `MAX_AMOUNT_VND` / `MAX_QUANTITY` | 100 000 000 000 ₫ / 100 000 (số lượng một dòng nhập tay) | `shared/order-lines.ts`, `orders/service-rules.ts` |
| `PBKDF2_ITERATIONS` | 100 000 | `src/modules/staff/password.ts` |
| `SESSION_TTL_SECONDS` / `MIN_SECRET_LENGTH` | 604 800 s (7 ngày) / 32 ký tự | `auth/session.ts`, `auth/index.ts` |
| `LOGIN_WINDOW_MS` / `PHONE_LIMIT` / `IP_LIMIT` | 900 000 ms / 5 / 30 | `src/modules/auth/throttle.ts` |
| `REQUEST_TIMEOUT_MS` / timeout đọc Sheet | 45 000 ms / 8 000 ms | `web/api.ts`, `src/shared/sheets.ts` |

**Số câu D1 — đếm từ mã, hai đơn vị khác nhau, đừng lẫn.**

*Một `db.batch()` lớn nhất:* `createOrder` = 1 `INSERT orders` + tối đa 20 `INSERT order_service` + tối đa 50 `INSERT order_item` + 1 nhật ký = **72**. `updateDraftOrder` = 1 `UPDATE` + 1 nhật ký + 2 `DELETE` + (20 + 50) `INSERT` = **74**. `updateTrip` = 1 + 1 + tối đa 20 = **22**. `POST /api/staff/sheet/apply` = **6N + 1** câu cho N tài khoản (`docs/HANDOFF-N1.md`).

*Một lần gọi Worker (tổng mọi câu, kể cả ngoài batch)* — đây mới là đơn vị của giới hạn D1 theo gói: `POST /api/orders` = 1 (`getActiveStaff`) + 1 (`loadAll` danh mục) + 72 + 3 (`findOrder`) + 1 (`loadAll` lần hai trong `loadOrderView`) = **≈ 78**; `PUT /api/orders/:id` = 1 + 1 (`getMeta`) + 1 + 2 (`getStoredServices`) + 74 + 3 + 1 = **≈ 83**.

**Gói Workers: TRẢ PHÍ (chủ dự án xác nhận 2026-09-21).** Mối lo ở A1/N1 (`docs/HANDOFF-M4.md`, `docs/HANDOFF-N1.md`) là giới hạn số truy vấn D1 mỗi lần gọi Worker của gói Free; ở gói trả phí đơn cỡ tối đa (≈ 78 khi tạo, ≈ 83 khi sửa) nằm xa giới hạn, nên KHÔNG cần hạ `MAX_SERVICES`/`MAX_LINES_PER_ORDER`. Vẫn phải đối chiếu trang giới hạn D1 hiện hành của Cloudflare trước khi TĂNG các hằng đó, và (riêng) kích thước/số tham số của một câu và một batch trước lần nạp nhân viên đầu tiên qua Sheet (`docs/HANDOFF-N1.md` "Cổng bổ sung" §2). Tài liệu này **không chép lại con số nào của Cloudflare** để tránh tin nhầm khi gói hoặc chính sách đổi.

**Phân trang và hiệu năng khác.** `GET /api/orders`: `limit` mặc định 30, kẹp `[1, 100]`; `offset` kẹp `[0, 100000]`; `q` cắt còn 100 ký tự. `GET /api/audit`: `limit` mặc định 50, kẹp `[1, 100]`. `GET /api/parties` cũng dùng `intParam`. Tìm kiếm dùng `LIKE` với `escapeLike` (`ESCAPE '\'`). `getActiveStaff` xác thực lại mỗi request bằng **một** truy vấn (kèm tên và quyền); chi tiết đơn đọc bằng `db.batch` ba câu. Khung app mở từ cache service worker (stale-while-revalidate) nên lần mở thứ hai gần như tức thì; dữ liệu vẫn luôn đi mạng.

---

## 13. Quan sát và vận hành

- **Observability**: `wrangler.jsonc` bật `"observability": { "enabled": true }` ⇒ log của Worker xem trong Cloudflare dashboard (Workers → `tourdao-sales` → Logs) hoặc `npx wrangler tail`. Lỗi chưa bắt được ghi một dòng JSON `{level:"error", event:"unhandled", requestId, method, path, error}`; `requestId` cũng nằm trong thân 500 trả về người dùng, nên nhân viên đọc mã đó là tra được. Turnstile ghi thêm các dòng JSON (không bao giờ có secret/token): `turnstile_disabled` (cảnh báo, MỖI lần đăng nhập khi chưa đặt `TURNSTILE_SECRET_KEY`), `turnstile_misconfigured` (có secret thiếu khoá site), `turnstile_unavailable` (kèm `detail`: `network`, `timeout`, `http_<mã>`, `bad_response`, `invalid-input-secret`…) — sau deploy hãy kiểm `GET /api/auth/config` và tìm ba sự kiện này.
- **`audit_log`** — nhật ký chỉ-thêm. **Ghi**: `action` (danh sách ở `src/shared/audit-actions.ts`, không còn `CHECK` trong SQL từ 0007), ai (`staff_id`, NULL = hệ thống/Cron), khi nào, đối tượng (`target_type` + `target_id`), đơn liên quan, và `detail` ngắn gọn — lệch giá danh mục (mã + loại khách + số tiền), thay đổi tên/SĐT, đổi quyền, tóm tắt lần đồng bộ. **KHÔNG ghi**: PIN, giá trị chuỗi tự do của khách (điểm đón, nơi check-in, ghi chú — chỉ ghi "đổi"), nội dung phiên, giá trị bí mật. Dòng nhật ký được gộp vào cùng `db.batch` với thay đổi dữ liệu và thường mang `changes() > 0` ⇒ không có dấu vết cho thao tác đã bị chặn.
- **Xem nhật ký**: `GET /api/audit` (admin) hoặc trang `/audit`; lịch sử một đơn nằm trong `GET /api/orders/:id` (chỉ khi `can(staff, "order.history.view")`). Trạng thái đồng bộ danh mục nằm ở bảng `catalog_sync` (`last_attempt_at`, `last_success_at`, `last_error_code`, `last_error`, `item_count`, `problems_json`), hiện ở `/catalog`. Bất biến dữ liệu: `node scripts/audit-invariants.mjs --db remote` (chỉ đọc, an toàn trên production).
- **D1 Time Travel**: `npx wrangler d1 time-travel info tourdao-sales-db` để ghi điểm khôi phục **trước** mỗi lần áp migration; khôi phục bằng `npx wrangler d1 time-travel restore tourdao-sales-db --bookmark=<điểm>`. Migration không có `down`; hoàn tác chỉ Worker **chỉ** an toàn khi chưa có thao tác tài khoản/quyền/hồ sơ nào dưới mã mới — đánh đổi và cửa sổ đóng băng mô tả đầy đủ ở `docs/HANDOFF-N1.md`.
- **Tắt khẩn cấp service worker** (khung hỏng bị cache trên máy nhân viên): thay `web/sw/sw.ts` bằng đoạn `unregister()` + xoá cache rồi deploy; được phép vì `/sw.js` luôn `no-store`. Quy trình ở `docs/PWA-IPHONE.md`.

---

## 14. Lộ trình và điểm gắn tính năng tiếp theo

> Mục này là **KẾ HOẠCH — chưa có trong mã**. Các ô tương ứng trong `MATRIX` và vài hành động nhật ký đã có sẵn để khoá bản đồ, nhưng **không route nào dùng**.
> `docs/adr/ADR-0009-nguoi-phu-trach-duoc-sua-don.md` (accepted 2026-09-21) đã quyết đổi ba ô của `SALES` — `order.modify`, `order.history.view`, `dispatch.assign` — từ `own` sang `ownOrAssigned` và thêm thao tác `dispatch.claim`; **`MATRIX` ĐÃ đổi** (task 4 của bản v1.0; §8 là hiện trạng) nhưng chưa nơi nào tiêm `ctx.assigned` (việc của module `dispatch`, task 6–7) nên ba ô đó tạm chạy như `own`. Đặc tả ba việc dưới đây: `docs/superpowers/specs/2026-09-21-v1-0-dang-nhap-xac-nhan-phu-trach-design.md`.

- **N2 — phân công / người phụ trách** (ADR-0006): module mới `dispatch`, bảng `dsp_assignment` (+ `dsp_task_kind`, `dsp_assignment_status`, `dsp_call_log`, `dsp_service_progress`). Tiền tố `dsp_` đã được khai sẵn trong `TABLE_PREFIX`/`VIEW_PREFIX` của `src/architecture.test.ts`. **Đã có (migration 0014, bản v1.0):** `dsp_task_kind`, `dsp_assignment_status`, `dsp_assignment`, `v_dsp_order_handler` và backfill người phụ trách cho đơn hiện có; **chưa có:** mã module `dispatch`, `dsp_call_log`, `dsp_service_progress`. Tiền đề bắt buộc: `updateDraftOrder` phải đổi từ "xoá hết rồi chèn lại" sang so khớp theo `id` để `order_service.id` bền. Khi có N2, `OperationContext.assigned` mới có nguồn dữ liệu thật ⇒ các ô `assigned`/`ownOrAssigned` mới có tác dụng.
- **N3 — sổ thu tiền, hoá đơn, sửa sau xác nhận** (ADR-0004): tiền tố `bil_` đã khai sẵn; các thao tác `payment.receive`, `payment.refund`, `invoice.request`, `invoice.issue`, `order.money.edit` đã có trong `MATRIX`, chưa có route.
- **N4 — giá net HDV/Guide**: cột `Ghi chú nội bộ` của Sheet dịch vụ hiện **cố ý không đọc** (`src/modules/catalog/sheet.ts`).

**Ba việc sắp làm — sẽ chạm những chỗ nào (dựa trên mã hiện tại):**

| Việc | Sẽ chạm |
|---|---|
| Cloudflare Turnstile ở màn hình đăng nhập | **Phía máy chủ ĐÃ XONG (task 2):** `src/modules/auth/turnstile.ts` + `POST /api/auth/login` kiểm token trước `verifyPinThrottled`, `GET /api/auth/config`, biến `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` (mục 2 và mục 4). **Còn lại (task 3):** `public/login.html` + `web/login.ts` (gọi `GET /api/auth/config`, dựng widget, gửi `turnstileToken`, `reset()` sau lần thất bại) và **`public/_headers`**: CSP hiện là `script-src 'self'` không có `frame-src` — phải nới cho `challenges.cloudflare.com` thì widget mới chạy. Cân nhắc với `src/shared/sw-policy.ts` (script ngoài origin luôn `pass`, không cache). Khoá site thật thêm vào `vars` của `wrangler.jsonc` lúc deploy. |
| Bản xác nhận đơn dạng PNG tải xuống | Trang `/order` (`public/order.html`, `web/order.ts`, `web/order-services.ts`) dựng ảnh ngay trong trình duyệt — CSP đã cho `img-src 'self' data: blob:` sẵn cho việc này; mô hình hiển thị lấy từ `src/shared/order-view.ts`; cần route ghi nhật ký cho hành động `exported_png` (đã có trong `AUDIT_ACTIONS` nhưng **không nơi nào dùng**) và có thể một module `exports` mới theo `docs/ARCHITECTURE.md` mục "Thêm một module mới"; thông tin công ty lấy từ `GET /api/company` (module `company`, đã có, chỉ đọc). |
| Cột "Người phụ trách" ở danh sách đơn | `listOrders` trong `src/modules/orders/repository.ts`, DTO `OrderSummaryDto` trong `src/shared/contracts.ts`, `web/orders.ts`. Nguồn dữ liệu là `dsp_assignment`/`v_dsp_order_handler` (migration 0014 đã có bảng, view và backfill; **chưa có module `dispatch` và API** — kế hoạch bản v1.0, task 6); đọc tên người phải đi qua view công bố `v_pty_party_label` hoặc `v_stf_staff_label`, không JOIN thẳng bảng của module khác (`src/architecture.test.ts` sẽ đỏ). |

---

## 15. Thuật ngữ

| Tiếng Việt | Định danh mã | Ghi chú |
|---|---|---|
| đơn (booking) | bảng `orders`, DTO `OrderDto` | `ORDER` là từ khoá SQL nên bảng số nhiều; mã đơn `orders.order_code` dạng `TD-YYYYMMDD-NNNN` theo giờ VN |
| trạng thái đơn | `orders.status` | `draft` nháp · `confirmed` đã xác nhận · `cancelled` đã huỷ |
| dịch vụ trong đơn | bảng `order_service` | số khách 4 loại + thông tin chuyến |
| dòng tiền | bảng `order_item` | `quantity × unit_price = line_total` |
| thông tin chuyến | `TripInfoDto`, `validateTrip` | ngày/giờ khởi hành, đón, check-in, ghi chú |
| loại khách | `PaxCode` | `adult`, `child`, `senior`, `infant` |
| bản chụp | `snapshotService` | dựng lại dịch vụ danh mục từ dữ liệu đã lưu của đơn |
| danh mục dịch vụ, ghi đè | `catalog_item`, `catalog_override`, `applyOverride` | "giá hiệu lực" = giá Sheet đã áp ghi đè; ghi đè không bị đồng bộ sau đè mất |
| hồ sơ | bảng `pty_party` ("party") | cá nhân `PERSON` hoặc tổ chức `ORGANIZATION` |
| vai trò hồ sơ | `pty_party_role`, `pty_role_type` | HDV, tài xế, `STAFF`… — **không** dùng để cho/chặn thao tác |
| quyền app | `stf_permission`, `PermissionCode` | `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD` |
| thao tác | `OperationCode`, `MATRIX`, `can()` | ô của bản đồ ADR-0007 |
| nhân sự văn phòng; nhật ký | `isOffice` / `access: "office"`; `audit_log`, `AUDIT_ACTIONS` | mọi quyền trừ chỉ-`FIELD`; nhật ký chỉ-thêm |
| khoá lạc quan; view công bố | `expectedUpdatedAt` / `updated_at`; `v_<tiền tố>_<tên>` | lệch → 409 `stale`; view là cách duy nhất đọc nhãn của module khác |

---

## 16. Sai lệch tài liệu ↔ mã

| Tệp tài liệu | Câu sai | Sự thật trong mã |
|---|---|---|
| `docs/SPEC-tourdao-sales.md` §1 ("Là gì", bước 3–4) | "Xem trước bản xác nhận theo mẫu chuẩn công ty" và "Xuất PNG … và/hoặc PDF" như năng lực của ứng dụng | Chưa có trong mã: không route, không mô-đun, không mã dựng ảnh. Chỉ có hai **tên** hành động nhật ký `exported_png` / `exported_pdf` trong `src/shared/audit-actions.ts`, không nơi nào ghi. Thông tin công ty đã có module `company` (`GET /api/company`, chỉ đọc) nhưng chưa hiện ở giao diện nào. |
| `docs/SPEC-tourdao-sales.md` §2.1 (bảng `staff`) | mô tả `full_name` là "tên hiển thị trên đơn" trong dòng trường | Cùng bảng đã chú thích đúng ở dòng `role` rằng `full_name` là **cột chết**; mã đọc tên từ `v_stf_staff_label` (hồ sơ `pty_party`) và `src/architecture.test.ts` (R-N1-14) bắt mọi chỗ đọc `staff.full_name`. Mâu thuẫn nội bộ trong chính bảng đó. |
