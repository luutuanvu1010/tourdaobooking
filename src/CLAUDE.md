# src/CLAUDE.md — luật máy chủ và luật thuần

> Chỉ thêm ràng buộc cho `src/`, không nới `CLAUDE.md` gốc. Kiểm bằng máy: `src/architecture.test.ts` (chạy trong `npm test`). Luật đầy đủ: `docs/ARCHITECTURE.md`; công thức từng loại việc: `docs/CHANGE-GUIDE.md`.

## Cấu trúc
- `src/index.ts` gốc lắp ráp (mảng `modules`, router, Cron). `src/modules/<tên>/`: `accounts`, `audit`, `auth`, `catalog`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `orders`, `parties`, `staff`.
- Trong một module: `index.ts` = API công khai (route khai bằng `route(method, path, access, handler)`); `rules.ts` = luật thuần (không I/O, có `*.test.ts` cạnh); `repository.ts` = SQL; `service.ts` = điều phối nhiều bước có I/O.
- `src/shared/` = logic **thuần** dùng chung server ↔ `web/` (router, http, contracts/DTO, permissions, trip-*, service-form, order-*, handler-view, text-wrap, sw-policy…). **Không** import `src/modules/`. Import nhau **kèm đuôi `.ts`** (để `node --test` chạy trực tiếp). Ngoại lệ duy nhất, có ghi ở `docs/ARCHITECTURE.md`: `router.ts` dòng import type `./contracts` không đuôi (tệp chỉ chạy trong Worker).
- Luật dùng ở cả server và giao diện = **một** tệp thuần trong `src/shared/`. Không chép tay sang `web/`.

## Ranh giới module (N7: một nguồn sự thật)
- Module khác chỉ import qua `index.ts`; **chỉ module chủ ghi bảng của mình**; muốn ghi cùng giao dịch thì nhận **câu lệnh D1 chưa chạy** từ `index.ts` của module chủ rồi gộp vào một `db.batch()`.
- Đọc xuyên module **chỉ qua view công bố** `v_<tiền tố>_*` (chỉ đọc, chỉ khoá + nhãn). Không JOIN thẳng bảng của module khác.
- **Module "nghiêm"** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`): SQL đi qua `defineSql`, câu tĩnh (`src/shared/sql-registry.ts`), `architecture.test.ts` ép đầy đủ. Module cũ (`accounts`, `audit`, `catalog`, `orders`) ở `LEGACY`: ngoại lệ có hạn, đừng coi là mẫu.
- `orders` **KHÔNG** import `dispatch`: "đang là người phụ trách" và "mở người phụ trách do người lập chọn cho đơn mới" (đơn mới không bao giờ tự gắn người lập — ADR-0030 S20-4) do gốc lắp ráp tiêm vào `ctx` (`ctx.isAssigned`, `ctx.newOrderHandler`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
- Thêm module: khai cạnh ở `ALLOWED_EDGES`, đưa vào `STRICT` hoặc `LEGACY` (kèm lý do), thêm bảng/view vào `docs/data-dictionary.json` rồi `npm run dict`, thêm dòng vào mảng `modules`. Công thức: `docs/ARCHITECTURE.md` mục "Thêm một module mới" và `docs/CHANGE-GUIDE.md` công thức b.

## Quyền và bảo mật
- Mặc định từ chối. Route khai `access: "public" | "staff" | "office" | "orders" | "admin"` (`"orders"` — ADR-0014: văn phòng HOẶC tài khoản Đối tác, dùng cho route `/api/orders*`); bản đồ quyền → thao tác ở **một** nơi: `src/shared/permissions.ts` (`can(staff, op, ctx)`). Giao diện chỉ ẩn/hiện; máy chủ luôn kiểm lại.
- Vai trò hồ sơ (HDV, tài xế…) **không bao giờ** là điều kiện cho phép (`architecture.test.ts` bắt mọi tệp ngoài `parties` nhắc `pty_party_role`).
- Nhật ký (`audit_log`): hành động khai ở `src/shared/audit-actions.ts` (có nhãn tiếng Việt); **không ghi SĐT/email/MST**. `staff_updated` (`src/modules/accounts/index.ts`, route `PATCH /api/staff/:id`) từng ghi SĐT; đã sửa 2026-09-21 (chỉ ghi "đổi SĐT đăng nhập"), test ở `patch-staff.test.ts`. Nhật ký cũ trên production vẫn còn số (chỉ-thêm) — đừng lặp lại kiểu cũ.

## Dữ liệu
- Tiền `INTEGER` VNĐ; số dẫn xuất (`line_total`, `subtotal`, `total`, `remaining_amount`) chỉ tính ở server. Ngày/giờ dân sự theo giờ VN (`vnToday(new Date())` truyền vào SQL làm tham số, **không** `date('now')`); dấu thời gian `TEXT` ISO UTC.
- Tên bảng số ít (trừ `orders`); bảng mới có tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_`, `mnt_`, `fbk_`, `aut_`, sau này `bil_`); tra cứu dùng khoá mã `TEXT code`. Danh sách giá trị mở kiểm ở **code**, không `CHECK` liệt kê. Không xoá cứng: `valid_from/to` hoặc `active = 0`; khoá ngoại `NO ACTION`.
- Ghi nhiều bảng sau một `UPDATE` điều kiện: dùng khoá lạc quan `updated_at` + `wonGuard` (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`), không so mốc thời gian để suy ra ai thắng.
- Cột chết `staff.role` và `staff.full_name`: đọc quyền/tên từ `stf_permission`/hồ sơ (`v_stf_staff_label`).

## Migration
Chỉ thêm tệp mới, không sửa tệp đã áp remote; đổi phá vỡ theo expand–contract trong **hai** lần phát hành. Kiểm số migration ở mọi nhánh chưa gộp trước khi đặt số (xem `CLAUDE.md` §10).

## Kiểm thử
Sửa hành vi → test đỏ trước, xanh sau. Luật thuần: `*.test.ts` cạnh tệp. Bất biến dữ liệu: `scripts/audit-checks.mjs` (mã `R-N1-*`, `R-DSP-*`; test ở `src/audit-invariants.test.ts`). `npm run typecheck` không phủ tệp test — tự đọc lại tệp test mới. Tệp thuần dùng cả ở giao diện (`src/shared/order-confirmation.ts`, `text-wrap.ts`, `handler-view.ts`…): sửa chúng thì cũng chạy lại kịch bản Chrome tương ứng ở bảng trong `web/CLAUDE.md`.
