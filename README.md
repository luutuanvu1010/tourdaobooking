# tourdao-sales

Ứng dụng CRM nội bộ cho nhân viên Công ty TNHH Tour Đảo — tạo và xuất xác nhận đơn hàng để gửi khách qua Zalo. Tên miền đã chốt: `booking.tourdao.vn` (thay trang `fastbooking` hiện có; chưa cắt, chưa deploy — xem `docs/SPEC-tourdao-sales.md` §3).

Dự án này **độc lập hoàn toàn** với repo `tourdaovn` (website công khai) — khác Worker, khác D1, khác domain. Điểm chạm duy nhất: kế thừa giá trị design token (màu/font) từ `tourdaovn/src/styles/tokens.css` để đồng nhất thương hiệu, sao chép giá trị tại một thời điểm, không phụ thuộc runtime lẫn nhau.

## Bắt đầu ở đây

Đọc `docs/SPEC-tourdao-sales.md` trước khi viết bất kỳ dòng code nào. File đó là nguồn sự thật cho:
- Kiến trúc dữ liệu (D1 schema, bất biến)
- Kiến trúc hạ tầng (Cloudflare Workers + D1, TypeScript, không dùng React)
- Design system kế thừa
- Lộ trình module M1 → M5 (§6) — thi công tuần tự, mỗi module một artifact kiểm tra được, không nhảy cóc

## Kiến trúc: modular monolith

Một Worker, nhiều module độc lập trong `src/modules/<tên>/`. Mỗi module sở hữu route + bảng dữ liệu + logic của mình và chỉ lộ ra ngoài qua `index.ts`. **Module khác chỉ import từ `index.ts` của module đó**, không chạm file nội bộ (`repository.ts`, ...). Module khai route (phương thức + đường dẫn + mức truy cập `public`/`staff`/`admin`); router chung (`src/shared/router.ts`) lo 401/403/404/405, chặn ghi cross-site và bắt lỗi toàn cục. Module mới = thêm thư mục + thêm một dòng vào `src/index.ts`. Code dùng chung nằm ở `src/shared/` (kiểu API dùng chung với giao diện: `contracts.ts`; hành động nhật ký: `audit-actions.ts`). Luật phụ thuộc và cách thêm module: **`docs/ARCHITECTURE.md`**.

## Trạng thái hiện tại

- **Rà soát kiến trúc (2026-09-19):** router + bắt lỗi toàn cục + chống CSRF, hợp đồng kiểu dùng chung, một nguồn danh sách nhật ký, migration `0007` (nhật ký mở, `order_item.catalog_code`, TRIGGER bất biến tiền), e2e tự động. `0007` **chưa áp remote**. Xem `docs/AUDIT-FINDINGS.md`, `docs/REFACTOR-PLAN.md`.

- **M1 xong:** Wrangler project, D1 `tourdao-sales-db` (đủ 5 bảng §2.1, bảng `order` đặt tên `orders` vì ORDER là từ khoá SQL), đăng nhập SĐT+PIN (`/api/auth/login|me|logout`, cookie session ký HMAC).
- **M2 xong (2026-09-19):** module `orders` (`/api/orders`: tạo, sửa khi `draft`, chi tiết, danh sách + tìm kiếm/lọc/phân trang, đổi trạng thái), chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ (spec §2.4-5), module `audit` (nhật ký ghi cùng transaction; admin xem toàn hệ thống ở `/audit`), `requireStaff` dùng chung ở `auth`, UI thuần trong `public/` + `web/` (đăng nhập, danh sách, form, chi tiết). Chưa deploy.
- **M3 xong (2026-09-19):** danh mục dịch vụ đồng bộ từ Google Sheet về D1 (module `catalog`; Cron 15 phút + nút "Đồng bộ ngay" ở `/catalog`), Admin ghi đè giá/ẩn dịch vụ mà lần đồng bộ sau không đè mất (cảnh báo khi Sheet đổi giá sau ghi đè), chốt chặn khi Sheet trông như bị hỏng; form đơn có **chọn nhanh dịch vụ** — nhập số khách từng loại (người lớn/trẻ em/người cao tuổi/em bé) sinh tối đa 4 dòng, dịch vụ tính theo nhóm (`per5Pax`) nhập số khách và số lượng = `ceil(khách/5)` lượt (khớp `quote.ts` của booking tourdaovn). Sheet lỗi thì dùng bản đã lưu + cảnh báo, vẫn nhập tay được. Migration `0006` (đã áp lên D1 remote cùng 0005; **Worker chưa deploy**).
- **Bảng Admin (2026-09-19, làm trước M3 theo spec §2.4-6):** module `accounts` — quản lý nhân viên tại `/staff` (tạo, sửa, ngưng/kích hoạt, đổi vai trò, đặt lại PIN, mở khoá, **đồng bộ từ Google Sheet có xem trước**), đổi PIN cá nhân tại `/account`; **chống dò PIN** (5 lần sai/15 phút theo SĐT, 30/IP; đặt chỗ trước khi kiểm nên bắn song song cũng chỉ được 5 lần); đặt lại/đổi PIN thu hồi mọi phiên cũ; `audit_log` mở rộng ghi cả hành động quản trị (migration `0005`, đã áp lên D1 remote). ID hai Google Sheet nằm ở `vars` trong `wrangler.jsonc`.

Chạy local: tạo `.dev.vars` từ `.dev.vars.example`, `npm run db:migrate:local`, tạo nhân viên bằng `scripts/create-staff.mjs`, `npm run dev` (tự build JS từ `web/` sang `public/js/`).

Kiểm tra: `npm run typecheck`, `npm test` (luật thuần: `src/**/*.test.ts`), `npm run test:e2e` (API thật trên D1 local tạm, cần mạng để đọc Google Sheet — xem `tests/e2e/README.md`).

Cấu trúc UI: `web/*.ts` (TypeScript vanilla, esbuild bundle từng trang → `public/js/`, thư mục này gitignored) + `public/*.html`, `public/app.css`. Trang: `/` danh sách, `/login`, `/order-form[?id=]`, `/order?id=`. Ứng dụng iPhone (PWA "Tour Đảo Booking"): `public/manifest.webmanifest`, `public/icons/`, service worker `web/sw/sw.ts` → `public/sw.js` (gitignored), thanh tab dưới đáy ở ≤640px; `/api/*` không bao giờ qua cache của service worker, mã phiên bản cache do build chèn — xem `docs/PWA-IPHONE.md` (rà soát theo Hiến pháp tourdaovn: `docs/AUDIT-PWA-IPHONE.md`).

## Nạp nhân viên từ Google Sheet

Cách chính: nút "Đồng bộ danh sách từ Google Sheet…" ở `/staff`. Dự phòng bằng dòng lệnh (`scripts/import-staff.mjs`, dùng chung logic `src/modules/staff/sheet.ts`). Sheet chỉ là nguồn đề xuất — mọi tài khoản mới là `sales`, cấp `admin` ở bảng Admin; D1 là nguồn sự thật. Cột nhận: `Tên người dùng`, `Số điện thoại` (cột khác bị bỏ qua, kể cả `Vai trò`). SĐT đã có trong D1 thì bỏ qua; PIN sinh ngẫu nhiên, ghi vào file `*.local.txt` (gitignored).

```
node scripts/import-staff.mjs "https://docs.google.com/spreadsheets/d/<ID>/export?format=csv" --db local|remote
npx wrangler d1 execute tourdao-sales-db --local|--remote --file staff.local.sql
```

## Tài liệu khác

- `docs/ARCHITECTURE.md` — kiến trúc (1 trang): luật phụ thuộc, nơi đặt code, thêm module mới.
- `docs/PWA-IPHONE.md` — app iPhone (PWA): cách hoạt động, danh sách kiểm trên máy thật, dựng lại icon, đổi tên hiển thị.
- `docs/HANDOFF-M4.md` — trạng thái hiện tại, việc triển khai còn lại, việc tiếp theo (M4).
- `docs/AUDIT-BRIEF.md`, `docs/AUDIT-FINDINGS.md`, `docs/REFACTOR-PLAN.md` — rà soát kiến trúc 2026-09-19: giao việc, phát hiện, các bước đã làm.
- `tests/e2e/README.md` — bộ kiểm thử end-to-end trên D1 local.
