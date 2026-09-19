# HANDOFF — bắt đầu M2 (CRUD đơn hàng)

Phiên mới: đọc `README.md`, `docs/SPEC-tourdao-sales.md`, rồi file này. Chỉ làm M2, không làm M3+ "cho tiện" (spec §6).

## Trạng thái sau M1 (2026-09-19)

- Thư mục không phải git repo. Chưa deploy Worker lên Cloudflare, chưa đặt `SESSION_SECRET` production.
- Cloudflare account: Lưu Tuấn Vũ (`381557e4e08091d31a3235baf2513df6`), wrangler 4.135 đã đăng nhập.
- D1 `tourdao-sales-db` (id `bcd4c0ac-7c97-4129-886f-380daecd58fc`), binding `DB`. Migration 0001–0004 đã áp lên **remote và local**: `staff`, `company_profile` (đã có dòng `default`), `orders`, `order_item`, `audit_log`.
- Bảng `order` của spec đặt tên **`orders`** (ORDER là từ khoá SQL).
- Remote có 1 admin thật: Lưu Tuấn Vũ, SĐT `0989929373` (PIN do chủ dự án giữ). Local có thêm 1 tài khoản test; nếu mất thì tạo lại bằng `scripts/create-staff.mjs`.
- `.dev.vars` (local, gitignored) chứa `SESSION_SECRET`; mẫu ở `.dev.vars.example`.

## Kiến trúc: modular monolith (chủ dự án yêu cầu)

- Một Worker, mỗi module ở `src/modules/<tên>/`, tự sở hữu route, bảng dữ liệu, logic. Lộ API ra ngoài **chỉ qua `index.ts`**; module khác không import file nội bộ.
- Module implement `AppModule { name, handle(request, env) → Response | null }` (`src/shared/http.ts`), đăng ký một dòng trong `src/index.ts`.
- Đã có: `auth` (`/api/auth/login|me|logout`, cookie `td_session` ký HMAC, 7 ngày), `staff` (`authenticate`, `getActiveStaff`, `hashPin`, chuẩn hoá SĐT).
- Chưa có module cho hướng dẫn viên; spec không có thực thể này. Chủ dự án muốn module riêng sau này, cần spec bổ sung trước.

## M2 — phạm vi

Module mới **`orders`** (thư mục `src/modules/orders/`), chưa đụng Google Sheet, chưa xuất file.

1. API: tạo, sửa (chỉ khi `draft`), xem chi tiết, danh sách (có tìm kiếm), đổi trạng thái.
2. Server tự tính `line_total = quantity × unit_price`, `subtotal`, `total = subtotal − discount`, `remaining_amount = total − deposit_amount`. Không tin số client gửi (§2.3). Tiền là số nguyên VNĐ, validate không âm, `discount ≤ subtotal`, `deposit ≤ total`.
3. `order_code` dạng `TD-YYYYMMDD-NNNN`, sinh ở server, duy nhất, an toàn khi nhiều người tạo cùng lúc (dùng UNIQUE + thử lại, hoặc đếm trong transaction/batch).
4. Trạng thái chỉ `draft → confirmed → cancelled` hoặc `draft → cancelled`; đặt `confirmed_at` khi xác nhận. Ghi `audit_log` cho `created`/`updated`/`confirmed`/`cancelled` (module `audit` hoặc hàm trong `orders`; cân nhắc tách module nhỏ vì bảng riêng).
5. Quyền xem: mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4). `sales` và `admin` như nhau ở M2.
6. Cần middleware xác thực dùng chung: hiện `/api/auth/me` tự đọc cookie. Tách hàm `requireStaff(request, env)` (nên đặt trong module `auth`, export qua `index.ts`) để `orders` gọi, không lặp code.
7. UI tối thiểu bằng HTML/CSS/TS thuần (không React), phục vụ qua Workers Assets: trang đăng nhập, danh sách đơn, form tạo/sửa, chi tiết. Token thị giác đầy đủ là M4, ở M2 chỉ cần dùng được và gọn.
8. Artifact kiểm tra: tạo 1 đơn thật qua UI, số liệu đúng bất biến §2.3, nhân viên khác xem được đơn.

Migration mới đánh số tiếp từ `0005_...` (không sửa 0001–0004 đã áp remote).

## Việc cần chú ý

- **Chưa chống dò PIN** (1 triệu tổ hợp). Đề xuất làm đầu M5, cần đổi schema hoặc dùng Cloudflare rate limiting.
- PBKDF2 giới hạn 100000 vòng lặp trong Workers; hash từ `scripts/create-staff.mjs` (Node) và Worker tương thích cùng định dạng `pbkdf2$sha256$iter$salt$hash`.
- Sau khi đổi `wrangler.jsonc` (thêm assets, binding) chạy `npm run types`.
- Kiểm tra: `npm run typecheck`, `npm run dev` rồi thử bằng curl/trình duyệt; `npm run db:migrate:local` trước, `db:migrate:remote` khi ổn.
- Tạo nhân viên: `node scripts/create-staff.mjs "Họ tên" <SĐT> <PIN 6 số> [sales|admin] > staff.local.sql`, rồi `wrangler d1 execute tourdao-sales-db --local|--remote --file staff.local.sql`, xoá file sau khi chạy.

## Còn mở ở checklist §5 (không chặn M2)

Logo, danh sách nhân viên thật, quyền DNS `tourdao.vn`, link/ID Google Sheet + tên cột + quyền đọc (chặn M3), ADR cho 3 quyết định một chiều (nên viết lúc bắt đầu M4).
