# Kiến trúc đích — tourdao-sales

> Từ phiên rà soát 2026-09-19 (`docs/AUDIT-FINDINGS.md`), đã thi công theo `docs/REFACTOR-PLAN.md` (chủ dự án duyệt 2026-09-19). Mô tả **hiện trạng**; mã lệch khỏi đây là lỗi cần sửa.
>
> **Bộ tài liệu nền (2026-09-21):** `CLAUDE.md` (cổng vào, quy tắc bắt buộc) · **tệp này = LUẬT kiến trúc** (ranh giới, dữ liệu, nơi đặt code) · `docs/SYSTEM-DESIGN.md` = thiết kế hệ thống (topology, luồng, API, quyền, dữ liệu, giao diện) · `docs/CHANGE-GUIDE.md` = cẩm nang "muốn đổi X thì sửa những đâu". Sửa cấu trúc → cập nhật cả bốn nơi liên quan trong cùng commit.

## Các tầng và chiều phụ thuộc (chỉ đi xuống, không vòng)

```
src/index.ts            gốc lắp ráp: danh sách module, nối auth vào router, Cron
   │
src/modules/<tên>/      module nghiệp vụ: accounts, orders, catalog, audit, locations, parties, company (chỉ đọc bảng `company_profile`, route `GET /api/company`; sửa hồ sơ công ty là M5, chưa làm), dispatch (người phụ trách đơn — bảng `dsp_*`; `orders` KHÔNG import nó, gốc lắp ráp tiêm hàm vào `ctx`), maintenance (chế độ bảo trì chỉ chủ dự án dùng được — bảng `mnt_setting`, route `/api/maintenance`; `auth` và `accounts` chỉ đọc trạng thái của nó, router nhận cổng chặn do gốc lắp ráp tiêm — `AppOptions.injected.maintenanceBlock`), feedback (Góp ý / Báo lỗi — bảng `fbk_*`, route `/api/feedback*`, trang `/feedback`; chỉ import `staff` (nhãn) và `audit`)
   │   ↳ chỉ import module khác qua index.ts của nó
src/modules/auth, staff năng lực nền: phiên, đăng nhập, tài khoản + quyền app (accounts dùng trực tiếp); staff không có route
   │
src/shared/             router, http, contracts (kiểu API), audit-actions, order-lines… — không import module nào; web/ được import
```

1. **Module khác chỉ import `index.ts`** của module đó. Không chạm `repository.ts`, `rules.ts`… của module khác. Cạnh `orders → catalog` chỉ qua hàm công khai `getEffectiveServices` (giá hiệu lực + cờ `visible`); `GET /api/catalog` dùng cùng nguồn `toEffective` để lọc "đang hiện" — không có hai nguồn "giá hiệu lực". Đồ thị vẫn không vòng (`catalog` không import `orders`).
2. **Kiểm quyền không phải là phụ thuộc**: route khai `access: "public" | "staff" | "office" | "admin"` (`office` = mọi quyền trừ chỉ-FIELD; `admin` = quyền ADMIN); router ở gốc lắp ráp xác thực rồi đưa `ctx.staff` (có `permissions`) vào handler. Bản đồ quyền → thao tác (ADR-0007) nằm ở MỘT nơi: `src/shared/permissions.ts` (`can(staff, op, ctx)`). Module không import `auth` chỉ để lấy `requireStaff/requireAdmin`. Nhờ vậy `audit` không còn phụ thuộc gì và `auth` sau này ghi nhật ký được mà không tạo vòng. Phạm vi "được giao" (`assigned`) đi cùng cách đó: `dispatch` cung cấp hàm, gốc lắp ráp `src/index.ts` tiêm vào `ctx` (`AppOptions.injected` → `ctx.isAssigned(orderId)`, `ctx.defaultHandlerStatement(orderId, at)`), `orders` gọi mà không import `dispatch` (dispatch → orders là chiều được phép; chiều ngược lại là vòng) và truyền kết quả vào `can(who, op, { ownerId, assigned })`.
3. **Ghi dữ liệu**: chỉ module chủ ghi bảng của mình. Module khác muốn ghi cùng giao dịch thì nhận **câu lệnh D1 chưa chạy** từ `index.ts` của module chủ (`auditStatement`, `createAccountStatements`…) rồi gộp vào một `db.batch()`.
4. **Đọc xuyên module**: chỉ để lấy nhãn hiển thị (tên nhân viên, mã đơn, tên hồ sơ, tên nơi) và **chỉ qua view công bố** `v_<tiền tố>_<tên>` của module chủ (`v_stf_staff_label`, `v_pty_party_label`, `v_loc_location_label`, `v_ord_order_label`, `v_dsp_order_handler`) — chỉ-đọc, chỉ khoá + nhãn + cờ, danh sách cột nằm trong sổ dữ liệu. Không JOIN thẳng bảng gốc của module khác, không ghi, không dựa vào cột nội bộ. Ngoại lệ có hạn: `wonGuard` của `orders` đọc `audit_log` (tới N2).
5. **`src/shared/`** không import từ `src/modules/`. Kiểu/hằng dùng chung giữa server và `web/` nằm ở `src/shared/contracts.ts` và `src/shared/audit-actions.ts` — một nguồn, không chép tay.

## Chuẩn dữ liệu và kiểm máy (ADR-0002, ADR-0003, N1)

- **Sổ dữ liệu** `docs/data-dictionary.json` là nguồn sự thật: mọi bảng/view, module chủ, cột chết, cột của view, "cạnh toàn vẹn". `docs/DATA-DICTIONARY.md` được **sinh** (`npm run dict`); bài kiểm báo lỗi nếu lệch.
- **`src/architecture.test.ts`** (chạy trong `npm test`) kiểm: import chỉ qua `index.ts` và đúng chiều `ALLOWED_EDGES`, không vòng; `shared/` và `web/` không import module; sổ ↔ schema; tiền tố bảng ↔ module; khoá ngoại xuyên module đúng chiều (hoặc là cạnh toàn vẹn khai báo); view công bố đúng cột, không `INSTEAD OF`; bảng mới có cột kiểm toán, cột WHO `TEXT NULL` không khoá ngoại, không `CASCADE`, bảng tra cứu khoá `code`; R-N1-14 (không đọc cột chết `staff.role`/`staff.full_name`).
- **Ranh giới SQL của module nghiêm** (`company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`): mọi câu SQL của `repository.ts` đi qua `defineSql` (`src/shared/sql-registry.ts`) và **tĩnh** (tham số tuỳ chọn viết `?N IS NULL OR …`); bài kiểm hỏi CHÍNH SQLite (`EXPLAIN` trên schema "ranh giới", view công bố thay bằng bảng rỗng) câu đó đọc/ghi bảng nào — ghi bảng module khác, hay đọc thẳng bảng gốc module khác, đều đỏ. `repository.ts` của module nghiêm import bằng đuôi `.ts`. Module cũ (`accounts`, `audit`, `auth`, `catalog`, `orders`) còn ở `LEGACY` (ngoại lệ có hạn, gỡ khi được chạm).
- **Bảng mới**: tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_` từ migration 0014, `mnt_` từ `0016_maintenance`, `fbk_` từ `0016_feedback`, sau này `bil_`); tra cứu dùng khoá mã `TEXT code`; tập giá trị mở là bảng tra cứu, không `CHECK` liệt kê; hiệu lực `valid_from/to_date` (ngày dân sự VN) hoặc `valid_from/to_at` (UTC); không xoá cứng — đóng hiệu lực hoặc `active = 0`; khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at`.
- **`scripts/audit-invariants.mjs`** kiểm bất biến dữ liệu (`R-N1-*`, `R-DSP-*`) trên D1 local/remote, chỉ đọc; `npm run test:e2e` chạy nó cuối bộ (`--strict`). Danh sách kiểm ở `scripts/audit-checks.mjs` (tệp thuần) để `src/audit-invariants.test.ts` chạy đúng các câu SQL trên schema đầy đủ; mức `fail` / `warn-unless-strict` / `warn`; thoát mã 2 = không chạy được (D1 chưa có `0014`…), không phải dữ liệu sạch.
- **Lệch ADR-0003 điều 7 có chủ ý (`dsp_assignment`, migration 0014):** không có trigger chống chồng lấn khoảng đã đóng, vì đổi người đóng dòng cũ và mở dòng mới cùng một thời điểm mà vị từ mẫu của ADR coi hai đầu mút trùng là chồng lấn. Lưới thay thế là kiểm `R-DSP-3` (khoảng nửa mở `[từ, đến)`) của `audit-invariants`. Chi tiết: `docs/SYSTEM-DESIGN.md` §5 và §16.

## Nơi đặt code trong một module

| File | Chứa | Được import |
|---|---|---|
| `index.ts` | `routes` (khai bằng `route(method, path, access, handler)`) + API công khai của module | module khác, gốc lắp ráp |
| `rules.ts` | luật thuần (không I/O), có `*.test.ts` bên cạnh | chỉ trong module |
| `repository.ts` | SQL của các bảng module sở hữu | chỉ trong module |
| `service.ts` | điều phối nhiều bước có I/O (vd đồng bộ Sheet) | chỉ trong module |
| `sheet.ts`… | bộ đọc thuần cho nguồn ngoài | chỉ trong module (scripts được import) |

File thuần (`rules.ts`, `sheet.ts`, các file trong `shared/` mà `node --test` hoặc `scripts/*.mjs` nạp trực tiếp) import bằng đuôi `.ts` tường minh để chạy trực tiếp; `src/shared/router.ts` chỉ chạy trong Worker (esbuild/wrangler) nên import không đuôi.

## Luật dữ liệu

- Tiền: `INTEGER` VNĐ. Số dẫn xuất (`line_total`, `subtotal`, `total`, `remaining_amount`) chỉ tính ở server: `line_total` sinh ở `orders/service-rules.ts` (`validateService`, dùng `buildLines` của `shared/order-lines.ts`); `orders/rules.ts` chỉ cộng tổng đơn (`subtotal`, `total`, `remaining_amount`).
- Thời gian: `TEXT` ISO-8601 UTC cho dấu thời gian người đọc; `INTEGER` mili-giây **chỉ** cho mốc máy so sánh số học (`staff.credentials_changed_at` so với thời điểm phát hành phiên, `login_attempt.at`).
- Ngày/giờ **dân sự** (ngày khởi hành, giờ đón, check-in): `TEXT` `YYYY-MM-DD` / `HH:MM` theo **giờ Việt Nam**, không phải UTC. "Hôm nay" luôn là `vnToday(new Date())` (`src/shared/vn-date.ts`) truyền vào SQL làm tham số; không dùng `date('now')` (UTC, sai ngày trong 00:00–07:00 giờ VN). `CHECK` chỉ kiểm khuôn dạng (bất biến); khoảng cho phép (không quá khứ, ≤ 365 ngày) là luật đổi được nên nằm ở code.
- Batch ghi nhiều bảng sau một `UPDATE` điều kiện (vd sửa đơn nháp): các câu sau mang `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với id nhật ký do request tự sinh (`AuditInput.id`) — dòng chỉ được chèn khi `changes() > 0`, nên có mặt ⇔ UPDATE của chính request đó đã thắng. Không so mốc thời gian để suy ra ai thắng.
- Tên bảng: số ít, trừ `orders` (`ORDER` là từ khoá SQL). Không đổi tên bảng đã có.
- Danh sách giá trị mở rộng theo thời gian (hành động nhật ký, loại đối tượng) kiểm ở **code**, không `CHECK` trong SQL. `CHECK` dành cho bất biến không bao giờ đổi (trạng thái đơn, vai trò, tiền không âm).
- Migration: chỉ thêm file mới, không sửa file đã áp remote. Thử local → e2e xanh → hỏi chủ dự án → remote. Thay đổi phá vỡ theo **expand–contract** trong HAI lần phát hành: migration "mở rộng" (chỉ thêm) trước, mã mới chạy, rồi migration "siết" (trigger bắt buộc…) ở lần sau — vì `wrangler d1 migrations apply` áp MỌI migration chưa áp nên migration siết KHÔNG được có mặt trong `migrations/` ở lần phát hành đầu (N1: B5 `staff_party_required`, xem `docs/HANDOFF-N1.md`; nhận biết theo tên tệp, không theo số thứ tự).
- Mọi đường XOÁ đơn trong tương lai phải tự chặn đơn không còn nháp: `ON DELETE CASCADE` từ `orders` xoá cả dịch vụ mà trigger `order_service_frozen_delete` KHÔNG chặn được (đã kiểm trên SQLite: xoá thẳng dịch vụ của đơn đã xác nhận bị chặn, nhưng xoá chính đơn đó thì dịch vụ đi theo). Hiện mã không có đường xoá đơn.
- **Trạng thái đơn chỉ đi tiến** (`draft → confirmed → cancelled`, không quay lại), kể cả SQL chạy tay: trigger `orders_status_transition` (`migrations/0017_order_status_audit_guards.sql`) chặn ở tầng CSDL, không chỉ ở `orders/rules.ts`.
- **`audit_log` chỉ-thêm**: trigger `audit_log_no_update` và `audit_log_no_delete` (cùng `0017`) chặn mọi `UPDATE`/`DELETE` trên bảng này, kể cả SQL chạy tay. Dựng lại `audit_log` (vd đổi cấu trúc theo expand–contract) phải tạo lại cả hai trigger trong cùng migration, không được bỏ sót.

## Thêm một module mới (vd M4 `exports`, M5 `company`)

1. Tạo `src/modules/<tên>/` với `index.ts` export `<tên>Module: AppModule = { name, routes: [route("GET", "/api/<tên>/:id", "staff", async (ctx) => …)] }`. Handler nhận `ctx.staff` (đã xác thực), `ctx.params`, `ctx.exec` (`waitUntil`).
2. Bảng mới → migration mới; module mới là chủ duy nhất của bảng đó.
3. Hành động nhật ký mới → thêm một dòng vào `src/shared/audit-actions.ts` (kèm nhãn tiếng Việt, nhóm). Không cần migration.
4. DTO trả cho giao diện → khai trong `src/shared/contracts.ts`; `web/` import từ đó.
5. Thêm một dòng vào mảng `modules` trong `src/index.ts`.
6. Luật thuần có test `node --test`; hành vi API có kịch bản trong `tests/e2e/` (khai kịch bản trong `run.mjs`).
7. **Bài kiểm kiến trúc ÉP thêm** (`src/architecture.test.ts` đỏ nếu thiếu): khai cạnh phụ thuộc của module trong `ALLOWED_EDGES`; đưa module vào `STRICT` (SQL đi qua `defineSql`) hoặc `LEGACY` (kèm lý do); có bảng/view mới thì thêm vào `modules`/`tables` của `docs/data-dictionary.json` rồi `npm run dict`.

## Giao diện đơn (A2)

Logic của form/trang đơn là luật THUẦN ở `src/shared/` (kiểm bằng `node --test`, dùng chung với máy chủ khi có thể): `trip-rules.ts` (hằng trần và cửa sổ xác nhận — máy chủ `orders/service-rules.ts` import lại), `trip-form.ts`, `service-form.ts` (bản nháp dịch vụ, dòng tiền xem trước bằng đúng `buildLines`, lỗi chặn Lưu, `ServiceInput`), `order-errors.ts` (ma trận lỗi → banner), `order-view.ts` (mô hình hiển thị trang đơn, nút theo quyền); bản v1.0 thêm cùng khuôn `handler-view.ts` (người phụ trách: ai thấy nút đổi/nhận, câu báo lỗi), `order-confirmation.ts` + `text-wrap.ts` (nội dung và ngắt dòng của ảnh xác nhận PNG; bộ vẽ canvas ở `web/`) và `app-info.ts` (tên/số phiên bản hiện ở màn đăng nhập). `web/` chỉ dựng DOM bằng `h()` (không `innerHTML`) và gọi API; `web/tsconfig.json` bật `allowImportingTsExtensions` vì các tệp thuần import nhau bằng đuôi `.ts`. Bằng chứng giao diện thật: `docs/evidence/2026-09-20-a2/`.

## Ứng dụng iPhone (PWA)

Giao diện tĩnh là PWA: `manifest` + icon + service worker (`web/sw/sw.ts` → `public/sw.js`). Quy tắc bất biến: `/api/*` không bao giờ qua cache của service worker (`src/shared/sw-policy.ts`, có test). Chi tiết, danh sách kiểm trên máy thật và cách tăng `CACHE_VERSION`: `docs/PWA-IPHONE.md`.

## Góp ý / Báo lỗi (module `feedback`)

Ticket một chiều-thành-hai-chiều: `fbk_ticket` + `fbk_message`. Luật chuyển trạng thái ở `src/shared/feedback-catalog.ts` (dùng chung với `web/`). Chống spam bằng MỘT câu `INSERT … SELECT … WHERE (đếm) < trần` (không có bước đếm-rồi-chèn tách rời). Email báo admin đi qua `notifyAdmins()` trong `waitUntil`, lỗi không làm hỏng yêu cầu (`notified_at` NULL → hàng đợi hiện "chưa gửi được email"). Thiết kế: `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md`; triển khai: `docs/HANDOFF-FEEDBACK.md`.
