# Kiến trúc đích — tourdao-sales (≤ 1 trang)

> Từ phiên rà soát 2026-09-19 (`docs/AUDIT-FINDINGS.md`), đã thi công theo `docs/REFACTOR-PLAN.md` (chủ dự án duyệt 2026-09-19). Mô tả **hiện trạng**; mã lệch khỏi đây là lỗi cần sửa.

## Các tầng và chiều phụ thuộc (chỉ đi xuống, không vòng)

```
src/index.ts            gốc lắp ráp: danh sách module, nối auth vào router, Cron
   │
src/modules/<tên>/      module nghiệp vụ: accounts, orders, catalog, audit, (M4/M5: company…)
   │   ↳ chỉ import module khác qua index.ts của nó
src/modules/auth, staff năng lực nền: phiên, đăng nhập, dữ liệu nhân viên (accounts dùng trực tiếp)
   │
src/shared/             router, http, contracts (kiểu API), audit-actions, order-lines… — không import module nào; web/ được import
```

1. **Module khác chỉ import `index.ts`** của module đó. Không chạm `repository.ts`, `rules.ts`… của module khác.
2. **Kiểm quyền không phải là phụ thuộc**: route khai `auth: "public" | "staff" | "admin"`; router ở gốc lắp ráp xác thực rồi đưa `ctx.staff` vào handler. Module không import `auth` chỉ để lấy `requireStaff/requireAdmin`. Nhờ vậy `audit` không còn phụ thuộc gì và `auth` sau này ghi nhật ký được mà không tạo vòng.
3. **Ghi dữ liệu**: chỉ module chủ ghi bảng của mình. Module khác muốn ghi cùng giao dịch thì nhận **câu lệnh D1 chưa chạy** từ `index.ts` của module chủ (`auditStatement`, `newStaffStatement`…) rồi gộp vào một `db.batch()`.
4. **Đọc xuyên module**: được `JOIN` bảng của module khác **chỉ để lấy nhãn hiển thị** (tên nhân viên, mã đơn) trong truy vấn danh sách. Không bao giờ ghi, không dựa vào cột nội bộ khác ngoài khoá + nhãn.
5. **`src/shared/`** không import từ `src/modules/`. Kiểu/hằng dùng chung giữa server và `web/` nằm ở `src/shared/contracts.ts` và `src/shared/audit-actions.ts` — một nguồn, không chép tay.

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

- Tiền: `INTEGER` VNĐ. Số dẫn xuất (`line_total`, `subtotal`, `total`, `remaining_amount`) chỉ tính ở server (`orders/rules.ts`).
- Thời gian: `TEXT` ISO-8601 UTC cho dấu thời gian người đọc; `INTEGER` mili-giây **chỉ** cho mốc máy so sánh số học (`staff.credentials_changed_at` so với thời điểm phát hành phiên, `login_attempt.at`).
- Tên bảng: số ít, trừ `orders` (`ORDER` là từ khoá SQL). Không đổi tên bảng đã có.
- Danh sách giá trị mở rộng theo thời gian (hành động nhật ký, loại đối tượng) kiểm ở **code**, không `CHECK` trong SQL. `CHECK` dành cho bất biến không bao giờ đổi (trạng thái đơn, vai trò, tiền không âm).
- Migration: chỉ thêm file mới (`0007_…` trở đi), không sửa file đã áp remote. Thử local → e2e xanh → hỏi chủ dự án → remote.

## Thêm một module mới (vd M4 `exports`, M5 `company`)

1. Tạo `src/modules/<tên>/` với `index.ts` export `<tên>Module: AppModule = { name, routes: [route("GET", "/api/<tên>/:id", "staff", async (ctx) => …)] }`. Handler nhận `ctx.staff` (đã xác thực), `ctx.params`, `ctx.exec` (`waitUntil`).
2. Bảng mới → migration mới; module mới là chủ duy nhất của bảng đó.
3. Hành động nhật ký mới → thêm một dòng vào `src/shared/audit-actions.ts` (kèm nhãn tiếng Việt, nhóm). Không cần migration.
4. DTO trả cho giao diện → khai trong `src/shared/contracts.ts`; `web/` import từ đó.
5. Thêm một dòng vào mảng `modules` trong `src/index.ts`.
6. Luật thuần có test `node --test`; hành vi API có kịch bản trong `tests/e2e/`.

## Ứng dụng iPhone (PWA)

Giao diện tĩnh là PWA: `manifest` + icon + service worker (`web/sw/sw.ts` → `public/sw.js`). Quy tắc bất biến: `/api/*` không bao giờ qua cache của service worker (`src/shared/sw-policy.ts`, có test). Chi tiết, danh sách kiểm trên máy thật và cách tăng `CACHE_VERSION`: `docs/PWA-IPHONE.md`.
