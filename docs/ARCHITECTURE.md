# Kiến trúc đích — tourdao-sales (≤ 1 trang)

> Từ phiên rà soát 2026-09-19 (`docs/AUDIT-FINDINGS.md`), đã thi công theo `docs/REFACTOR-PLAN.md` (chủ dự án duyệt 2026-09-19). Mô tả **hiện trạng**; mã lệch khỏi đây là lỗi cần sửa.

## Các tầng và chiều phụ thuộc (chỉ đi xuống, không vòng)

```
src/index.ts            gốc lắp ráp: danh sách module, nối auth vào router, Cron
   │
src/modules/<tên>/      module nghiệp vụ: accounts, orders, catalog, audit, locations, parties, (M4/M5: company…)
   │   ↳ chỉ import module khác qua index.ts của nó
src/modules/auth, staff năng lực nền: phiên, đăng nhập, tài khoản + quyền app (accounts dùng trực tiếp); staff không có route
   │
src/shared/             router, http, contracts (kiểu API), audit-actions, order-lines… — không import module nào; web/ được import
```

1. **Module khác chỉ import `index.ts`** của module đó. Không chạm `repository.ts`, `rules.ts`… của module khác. Cạnh `orders → catalog` chỉ qua hàm công khai `getEffectiveServices` (giá hiệu lực + cờ `visible`); `GET /api/catalog` dùng cùng nguồn `toEffective` để lọc "đang hiện" — không có hai nguồn "giá hiệu lực". Đồ thị vẫn không vòng (`catalog` không import `orders`).
2. **Kiểm quyền không phải là phụ thuộc**: route khai `access: "public" | "staff" | "office" | "admin"` (`office` = mọi quyền trừ chỉ-FIELD; `admin` = quyền ADMIN); router ở gốc lắp ráp xác thực rồi đưa `ctx.staff` (có `permissions`) vào handler. Bản đồ quyền → thao tác (ADR-0007) nằm ở MỘT nơi: `src/shared/permissions.ts` (`can(staff, op, ctx)`). Module không import `auth` chỉ để lấy `requireStaff/requireAdmin`. Nhờ vậy `audit` không còn phụ thuộc gì và `auth` sau này ghi nhật ký được mà không tạo vòng.
3. **Ghi dữ liệu**: chỉ module chủ ghi bảng của mình. Module khác muốn ghi cùng giao dịch thì nhận **câu lệnh D1 chưa chạy** từ `index.ts` của module chủ (`auditStatement`, `createAccountStatements`…) rồi gộp vào một `db.batch()`.
4. **Đọc xuyên module**: chỉ để lấy nhãn hiển thị (tên nhân viên, mã đơn, tên hồ sơ, tên nơi) và **chỉ qua view công bố** `v_<tiền tố>_<tên>` của module chủ (`v_stf_staff_label`, `v_pty_party_label`, `v_loc_location_label`, `v_ord_order_label`) — chỉ-đọc, chỉ khoá + nhãn + cờ, danh sách cột nằm trong sổ dữ liệu. Không JOIN thẳng bảng gốc của module khác, không ghi, không dựa vào cột nội bộ. Ngoại lệ có hạn: `wonGuard` của `orders` đọc `audit_log` (tới N2).
5. **`src/shared/`** không import từ `src/modules/`. Kiểu/hằng dùng chung giữa server và `web/` nằm ở `src/shared/contracts.ts` và `src/shared/audit-actions.ts` — một nguồn, không chép tay.

## Chuẩn dữ liệu và kiểm máy (ADR-0002, ADR-0003, N1)

- **Sổ dữ liệu** `docs/data-dictionary.json` là nguồn sự thật: mọi bảng/view, module chủ, cột chết, cột của view, "cạnh toàn vẹn". `docs/DATA-DICTIONARY.md` được **sinh** (`npm run dict`); bài kiểm báo lỗi nếu lệch.
- **`src/architecture.test.ts`** (chạy trong `npm test`) kiểm: import chỉ qua `index.ts` và đúng chiều `ALLOWED_EDGES`, không vòng; `shared/` và `web/` không import module; sổ ↔ schema; tiền tố bảng ↔ module; khoá ngoại xuyên module đúng chiều (hoặc là cạnh toàn vẹn khai báo); view công bố đúng cột, không `INSTEAD OF`; bảng mới có cột kiểm toán, cột WHO `TEXT NULL` không khoá ngoại, không `CASCADE`, bảng tra cứu khoá `code`; R-N1-14 (không đọc cột chết `staff.role`/`staff.full_name`).
- **Ranh giới SQL của module nghiêm** (`locations`, `parties`, `staff`): mọi câu SQL của `repository.ts` đi qua `defineSql` (`src/shared/sql-registry.ts`) và **tĩnh** (tham số tuỳ chọn viết `?N IS NULL OR …`); bài kiểm hỏi CHÍNH SQLite (`EXPLAIN` trên schema "ranh giới", view công bố thay bằng bảng rỗng) câu đó đọc/ghi bảng nào — ghi bảng module khác, hay đọc thẳng bảng gốc module khác, đều đỏ. `repository.ts` của module nghiêm import bằng đuôi `.ts`. Module cũ (`accounts`, `audit`, `auth`, `catalog`, `orders`) còn ở `LEGACY` (ngoại lệ có hạn, gỡ khi được chạm).
- **Bảng mới**: tiền tố module (`pty_`, `loc_`, `stf_`, sau này `dsp_`, `bil_`); tra cứu dùng khoá mã `TEXT code`; tập giá trị mở là bảng tra cứu, không `CHECK` liệt kê; hiệu lực `valid_from/to_date` (ngày dân sự VN) hoặc `valid_from/to_at` (UTC); không xoá cứng — đóng hiệu lực hoặc `active = 0`; khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at`.
- **`scripts/audit-invariants.mjs`** kiểm bất biến dữ liệu (R-N1-*) trên D1 local/remote, chỉ đọc; `npm run test:e2e` chạy nó cuối bộ (`--strict`).

## Nơi đặt code trong một module

| File | Chứa | Được import |
|---|---|---|
| `index.ts` | `routes` (khai bằng `route(method, path, access, handler)`) + API công khai của module | module khác, gốc lắp ráp |
| `rules.ts` | luật thuần (không I/O), có `*.test.ts` bên cạnh | chỉ trong module |
| `repository.ts` | SQL của các bảng module sở hữu | chỉ trong module |
| `service.ts` | điều phối nhiều bước có I/O (vd đồng bộ Sheet) | chỉ trong module |
| `sheet.ts`… | bộ đọc thuần cho nguồn ngoài | chỉ trong module (scripts được import) |

File thuần (`rules.ts`, `sheet.ts`, mọi file trong `shared/`) import bằng đuôi `.ts` tường minh để `node --test` và `scripts/*.mjs` chạy trực tiếp.

## Luật dữ liệu

- Tiền: `INTEGER` VNĐ. Số dẫn xuất (`line_total`, `subtotal`, `total`, `remaining_amount`) chỉ tính ở server: `line_total` sinh ở `orders/service-rules.ts` (`validateService`, dùng `buildLines` của `shared/order-lines.ts`); `orders/rules.ts` chỉ cộng tổng đơn (`subtotal`, `total`, `remaining_amount`).
- Thời gian: `TEXT` ISO-8601 UTC cho dấu thời gian người đọc; `INTEGER` mili-giây **chỉ** cho mốc máy so sánh số học (`staff.credentials_changed_at` so với thời điểm phát hành phiên, `login_attempt.at`).
- Ngày/giờ **dân sự** (ngày khởi hành, giờ đón, check-in): `TEXT` `YYYY-MM-DD` / `HH:MM` theo **giờ Việt Nam**, không phải UTC. "Hôm nay" luôn là `vnToday(new Date())` (`src/shared/vn-date.ts`) truyền vào SQL làm tham số; không dùng `date('now')` (UTC, sai ngày trong 00:00–07:00 giờ VN). `CHECK` chỉ kiểm khuôn dạng (bất biến); khoảng cho phép (không quá khứ, ≤ 365 ngày) là luật đổi được nên nằm ở code.
- Batch ghi nhiều bảng sau một `UPDATE` điều kiện (vd sửa đơn nháp): các câu sau mang `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với id nhật ký do request tự sinh (`AuditInput.id`) — dòng chỉ được chèn khi `changes() > 0`, nên có mặt ⇔ UPDATE của chính request đó đã thắng. Không so mốc thời gian để suy ra ai thắng.
- Tên bảng: số ít, trừ `orders` (`ORDER` là từ khoá SQL). Không đổi tên bảng đã có.
- Danh sách giá trị mở rộng theo thời gian (hành động nhật ký, loại đối tượng) kiểm ở **code**, không `CHECK` trong SQL. `CHECK` dành cho bất biến không bao giờ đổi (trạng thái đơn, vai trò, tiền không âm).
- Migration: chỉ thêm file mới, không sửa file đã áp remote. Thử local → e2e xanh → hỏi chủ dự án → remote. Thay đổi phá vỡ theo **expand–contract** trong HAI lần phát hành: migration "mở rộng" (chỉ thêm) trước, mã mới chạy, rồi migration "siết" (trigger bắt buộc…) ở lần sau — vì `wrangler d1 migrations apply` áp MỌI migration chưa áp nên migration siết KHÔNG được có mặt trong `migrations/` ở lần phát hành đầu (N1: `0013`, xem `docs/HANDOFF-N1.md`).
- Mọi đường XOÁ đơn trong tương lai phải tự chặn đơn không còn nháp: `ON DELETE CASCADE` từ `orders` xoá cả dịch vụ mà trigger `order_service_frozen_delete` KHÔNG chặn được (đã kiểm trên SQLite: xoá thẳng dịch vụ của đơn đã xác nhận bị chặn, nhưng xoá chính đơn đó thì dịch vụ đi theo). Hiện mã không có đường xoá đơn.

## Thêm một module mới (vd M4 `exports`, M5 `company`)

1. Tạo `src/modules/<tên>/` với `index.ts` export `<tên>Module: AppModule = { name, routes: [route("GET", "/api/<tên>/:id", "staff", async (ctx) => …)] }`. Handler nhận `ctx.staff` (đã xác thực), `ctx.params`, `ctx.exec` (`waitUntil`).
2. Bảng mới → migration mới; module mới là chủ duy nhất của bảng đó.
3. Hành động nhật ký mới → thêm một dòng vào `src/shared/audit-actions.ts` (kèm nhãn tiếng Việt, nhóm). Không cần migration.
4. DTO trả cho giao diện → khai trong `src/shared/contracts.ts`; `web/` import từ đó.
5. Thêm một dòng vào mảng `modules` trong `src/index.ts`.
6. Luật thuần có test `node --test`; hành vi API có kịch bản trong `tests/e2e/`.

## Ứng dụng iPhone (PWA)

Giao diện tĩnh là PWA: `manifest` + icon + service worker (`web/sw/sw.ts` → `public/sw.js`). Quy tắc bất biến: `/api/*` không bao giờ qua cache của service worker (`src/shared/sw-policy.ts`, có test). Chi tiết, danh sách kiểm trên máy thật và cách tăng `CACHE_VERSION`: `docs/PWA-IPHONE.md`.
