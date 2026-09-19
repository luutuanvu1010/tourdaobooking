# Kế hoạch tái cấu trúc — ĐÃ THI CÔNG bước 0–10 (2026-09-19)

> Chủ dự án duyệt 2026-09-19. Trạng thái từng mục + commit: `docs/AUDIT-FINDINGS.md` → "Trạng thái thi công". Việc còn lại ngoài kế hoạch: áp `0007` lên D1 remote (cần chủ dự án cho phép), deploy.

Nguồn: `docs/AUDIT-FINDINGS.md` (mã A1…A20), kiến trúc đích: `docs/ARCHITECTURE.md`.
Nguyên tắc: mỗi bước **giữ hành vi** (trừ khi ghi rõ), nhỏ, kết thúc bằng `npm run typecheck` + `npm test` + `npm run test:e2e` xanh → commit. Không deploy, không chạm D1 remote nếu chưa hỏi chủ dự án. Migration mới từ `0007_`.

Thứ tự bắt buộc: **0 → 1 → 2** phải xong trước khi có dữ liệu thật. Các bước sau làm trước M4 nếu được, không phụ thuộc chặt vào nhau (trừ 3 cần 2, 5 nên trước 6).

---

### Bước 0 — `git init` + commit gốc *(cần chủ dự án đồng ý; A20)*
- `git init`, kiểm `git status --ignored` thấy `.dev.vars`, `*.local.*`, `public/js`, `.wrangler`, `node_modules` bị loại; commit gốc.
- **Kiểm chứng:** `git ls-files | grep -E "dev.vars$|local\.(sql|txt)$"` rỗng.

### Bước 1 — Lưới an toàn: e2e tự động chạy một lệnh *(A19, A12)*
- Mỗi script đọc `BASE_URL` từ biến môi trường (mặc định `http://localhost:8787`).
- `tests/e2e/run.mjs`: tạo thư mục tạm → `wrangler d1 migrations apply tourdao-sales-db --local --persist-to <tmp>` → nạp tài khoản test bằng `scripts/staff-lib.mjs` (SĐT/PIN cố định trong một file `tests/e2e/fixtures.mjs`) → `wrangler dev --persist-to <tmp> --port <cổng trống> --test-scheduled` → chờ `GET /api/auth/me` trả 401 → chạy lần lượt 4 script → tắt server, xoá thư mục tạm. D1 local mặc định của người dùng **không bị đụng**.
- Theo quyết định C4: kịch bản cần Sheet dùng CSV mẫu cục bộ (cần thêm biến `SHEETS_BASE_URL` — thay đổi mã nhỏ duy nhất của bước này) hoặc tách thành `npm run test:e2e:online`.
- Thêm assertion: thao tác bị chặn khi tranh chấp (đổi trạng thái đơn đua nhau, hạ quyền admin cuối) **không sinh dòng nhật ký** (A12).
- `run.mjs` tự sinh `SESSION_SECRET` tạm (≥ 32 ký tự) và truyền bằng `wrangler dev --var`, để bộ test không phụ thuộc `.dev.vars` của máy.
- `package.json`: `"test:e2e": "node tests/e2e/run.mjs"`. Bỏ phần "dọn D1 local" trong `tests/e2e/README.md`.
- **Kiểm chứng:** chạy `npm run test:e2e` hai lần liên tiếp đều xanh; `.wrangler/state` mặc định không đổi (so `ls -la` trước/sau).

### Bước 2 — Migration `0007` gộp mọi cửa một chiều *(A1, A3; kèm A4 cho gọn — phạm vi theo quyết định C2)*
- (a) Dựng lại `audit_log` không có `CHECK` ở `action`/`target_type` (giữ FK, index `idx_audit_order`, `idx_audit_created`, chép dữ liệu).
- (b) `ALTER TABLE order_item ADD COLUMN catalog_code TEXT;`
- (c) Nếu được duyệt: `CREATE TRIGGER … BEFORE INSERT` và `… BEFORE UPDATE` trên `order_item` (`line_total`) và `orders` (`total`, `remaining_amount`, không âm) → `RAISE(ABORT, 'vi phạm bất biến tiền (spec §2.3)')`. **Không** dựng lại `orders`/`order_item`. Kiểm trước khi viết: dữ liệu local hiện có không vi phạm (một `SELECT` đếm dòng sai phải ra 0), vì trigger không kiểm dữ liệu cũ.
- Mã đi kèm (b): `ValidItem.catalogCode` (tuỳ chọn, cùng dạng `CODE_RE` của catalog), `itemInserts` ghi cột mới, `OrderItemDto.catalogCode`, `web/order-form.ts` gửi mã khi dòng sinh từ chọn nhanh (nhập tay → `null`). Test thuần cho `validateOrder` với/không có `catalogCode`.
- Mã đi kèm (a): `isAuditAction` vẫn chặn giá trị lạ ở code (đã có).
- **Kiểm chứng:** áp lên D1 tạm của bước 1 → e2e xanh; áp lên D1 local thật (có dữ liệu test) → đếm dòng trước/sau khớp; thử `INSERT`/`UPDATE` sai bất biến tiền bằng `wrangler d1 execute --local` phải bị từ chối (nếu làm c); tạo + sửa đơn qua API vẫn thành công. Sau đó **hỏi** rồi mới `npm run db:migrate:remote`.

### Bước 3 — Một nguồn danh sách hành động nhật ký *(A2; cần bước 2a)*
- `src/shared/audit-actions.ts` (đuôi `.ts`, thuần): `AUDIT_ACTIONS = { created: { label: "Tạo đơn", group: "order" }, … } as const`, `type AuditAction = keyof typeof AUDIT_ACTIONS`, `AUDIT_GROUPS`.
- Server: `audit/repository.ts` dùng file này thay danh sách riêng. Web: `format.ts` lấy nhãn từ đây; `web/audit.ts` sinh `<option>`/`<optgroup>`; xoá `<option>` trong `public/audit.html`.
- **Kiểm chứng:** typecheck; test thuần "mọi action có nhãn và nhóm"; mở `/audit`, lọc từng nhóm bằng tay.

### Bước 4 — Hợp đồng kiểu dùng chung *(A9)*
- `src/shared/contracts.ts` chỉ chứa `type`/`interface`: `StaffProfile`, `StaffAccountDto`, `OrderDto`, `OrderItemDto`, `OrderSummaryDto`, `AuditEntryDto`, `AuditRecordDto`, `CatalogServiceDto`, `CatalogAdminItemDto`, `CatalogSyncStateDto`, `OrderInput`.
- Server: các hàm map (`toDto`, `adminItem`, `publicItem`, `toAccount`…) khai kiểu trả về từ file này. `web/api.ts` chỉ còn `api()`, `ApiError`, `safeNext`, `goLogin` + re-export kiểu.
- **Kiểm chứng:** typecheck cả hai phía; `npm run build:web`; e2e xanh (hành vi không đổi).

### Bước 5 — Router + bắt lỗi toàn cục + `ExecutionContext` *(A7, A8, A13; nên trước M4)*
- 5a. `src/shared/router.ts`: `route({ method, path: "/api/orders/:id/status", auth: "staff", handler })`; khớp đường dẫn, trả 404/405 thống nhất; `ctx = { request, env, exec, url, params, staff }`. `src/index.ts` bọc toàn bộ: lỗi bất ngờ → `500 {error:{code:"internal",message,requestId}}` (`requestId` = `cf-ray`), `console.error(JSON.stringify({requestId, path, error}))`. Với `POST/PUT/PATCH/DELETE` dưới `/api/`: đòi `content-type: application/json` và `Origin` trùng host → 403 nếu sai. Giao diện hiện có đã gửi đúng cả hai.
- 5b. Chuyển **từng module một** sang khai báo route (thứ tự gợi ý: `audit` → `catalog` → `orders` → `accounts` → `auth`), mỗi module một commit. Chuyển `intParam`, `escapeLike`, `UUID_RE`, `MAX_AMOUNT`, `money` về `src/shared/`. Bỏ `staffModule` rỗng khỏi danh sách.
- Hành vi đổi có chủ đích: 500 có thân JSON; request ghi thiếu `Origin`/sai `Content-Type` bị 403 (e2e phải gửi `Origin`).
- **Kiểm chứng:** e2e xanh sau mỗi module; thêm e2e: route lạ → 404 JSON, sai method → 405, POST không `Origin` → 403, `text/plain` → 403.

### Bước 6 — Siết bảo mật nhỏ *(A5, A6, A14)*
- `safeNext`: chặn `\` và `//` + test thuần với `"/\\evil.com"`, `"//evil.com"`, `"/order?id=…"`.
- `SESSION_SECRET` thiếu hoặc < 32 ký tự → router trả 500 `server_misconfigured`, log rõ. Đồng thời sửa `.dev.vars.example`: chuỗi mẫu hiện tại (`replace-with-long-random-string`) chỉ 31 ký tự nên sẽ bị chốt chặn từ chối — thay bằng hướng dẫn `openssl rand -base64 48`.
- `public/_headers` với CSP/`X-Content-Type-Options: nosniff`/`Referrer-Policy: same-origin`/`frame-ancestors 'none'`. Đã xác nhận (wrangler 4.135): header có trên trang tĩnh, CSS, JS.
- **Kiểm chứng:** test thuần; `curl -I` các trang tĩnh thấy header; mở từng trang **và thao tác** (hộp Sửa ở `/staff`, `/catalog`; chọn nhanh dịch vụ ở `/order-form`) — console không có vi phạm CSP; e2e xanh.

### Bước 7 — Danh mục: đồng bộ lần đầu không trùng *(A10, A11)*
- `bootstrapIfNeverSynced` giành quyền bằng `UPDATE … WHERE last_attempt_at IS NULL` + `meta.changes`; người thua dùng dữ liệu đang có (có thể rỗng → cảnh báo nhập tay như hiện nay).
- Comment ở `applySync`: không nguyên tử xuyên lô; tự lành ở lần sau.
- **Kiểm chứng:** e2e bắn 5 `GET /api/catalog` song song trên D1 rỗng → đúng **một** dòng `catalog_synced`.

### Bước 8 — Scripts dùng chung băm PIN *(A15)*
- `password.ts` import `../../shared/encoding.ts`; `staff-lib.mjs` dùng `hashPin` của `password.ts` (hàm async → `insertStaffSql` thành async). `create-staff.mjs` từ chối PIN yếu (`isWeakPin`).
- Test thuần: hash tạo ở scripts được `verifyPin` chấp nhận.
- **Kiểm chứng:** `npm test`; tạo 1 tài khoản bằng script trên D1 tạm và đăng nhập được.

### Bước 9 — Dọn nhỏ *(A17)*
- Xoá `PRICE_COLUMNS`; `StaffRole` khai một chỗ (`staff/rules.ts`), `repository.ts` import lại.
- **Kiểm chứng:** typecheck, test.

### Bước 10 — Hợp nhất tài liệu *(A18)*
- Viết lại tại chỗ spec §2.1 (bảng thật sau 0007), §2.2 (thêm catalog), §2.5 (bản sao D1), §5, §6 (thứ tự thực tế), §7; thêm "Lịch sử thay đổi" cuối spec. Sửa README (lệnh test, `test:e2e`, trỏ `ARCHITECTURE.md`), HANDOFF-M4 (e2e đã ở repo). Cập nhật `AUDIT-FINDINGS.md`: đánh dấu mục đã xong.
- **Kiểm chứng:** đọc chéo spec với `migrations/` và `src/`: mọi bảng/cột/action trong mã có trong spec và ngược lại.

---

**Ước lượng:** bước 0–2 là phần "phải trước dữ liệu thật" (~1 phiên). Bước 3–10 ~1–2 phiên, có thể xen với M4 nhưng bước 5 nên xong trước khi thêm module của M4.
