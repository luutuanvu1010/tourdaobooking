# tourdao-sales

Ứng dụng CRM nội bộ của Công ty TNHH Tour Đảo: nhân viên lập đơn dịch vụ tour, ghi thông tin chuyến, xác nhận đơn; admin quản lý nhân viên, quyền, danh mục dịch vụ (đồng bộ Google Sheet), hồ sơ khách/đại lý và địa điểm. Chạy thật tại **`https://booking.tourdao.vn`** (Cloudflare Worker + D1 + Workers Assets), cài lên iPhone như một PWA ("Tour Đảo Booking").

Dự án **độc lập hoàn toàn** với repo `tourdaovn` (website công khai): khác Worker, khác D1, khác domain. Điểm chạm duy nhất: sao chép giá trị design token (màu/font) để đồng nhất thương hiệu.

## Bắt đầu ở đây

| Bạn muốn | Đọc |
|---|---|
| Làm việc trong repo này (quy tắc, lệnh, chỉ đường tới tài liệu đọc đúng lúc) | [`CLAUDE.md`](CLAUDE.md) |
| **Sửa/thêm gì đó nhanh** (công thức từng loại việc, bẫy) | [`docs/CHANGE-GUIDE.md`](docs/CHANGE-GUIDE.md) |
| Hiểu cả hệ thống (topology, luồng, API, quyền, dữ liệu, giao diện) | [`docs/SYSTEM-DESIGN.md`](docs/SYSTEM-DESIGN.md) |
| Luật kiến trúc (ranh giới module, dữ liệu, nơi đặt code) | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/adr/`](docs/adr/README.md) |
| Đặc tả nghiệp vụ và quyết định của chủ dự án | [`docs/SPEC-tourdao-sales.md`](docs/SPEC-tourdao-sales.md) |
| Bảng/cột/view | [`docs/DATA-DICTIONARY.md`](docs/DATA-DICTIONARY.md) (sinh từ `docs/data-dictionary.json`) |
| Triển khai production, áp migration, hoàn tác | [`docs/HANDOFF-N1.md`](docs/HANDOFF-N1.md) |
| App iPhone (PWA) | [`docs/PWA-IPHONE.md`](docs/PWA-IPHONE.md) |
| Bằng chứng giao diện (ảnh, axe, kịch bản Chrome) | [`docs/evidence/2026-09-20-a2/`](docs/evidence/2026-09-20-a2/README.md), [`docs/evidence/2026-09-21-v1-0/`](docs/evidence/2026-09-21-v1-0/README.md) (v1.0: màn đăng nhập) |

## Kiến trúc trong một đoạn

Một Worker, nhiều module độc lập trong `src/modules/<tên>/` (`accounts`, `audit`, `auth`, `catalog`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `orders`, `parties`, `staff`). Mỗi module sở hữu route + bảng + logic của mình và chỉ lộ ra qua `index.ts`; module khác chỉ import `index.ts`. Router chung (`src/shared/router.ts`) lo 401/403/404/405, chặn ghi cross-site (kiểm `Origin`) và bắt lỗi toàn cục. Luật thuần dùng chung giữa máy chủ và giao diện nằm ở `src/shared/`. Giao diện là TypeScript thuần (`web/*.ts` → esbuild → `public/js/`) trên HTML tĩnh `public/*.html`. Chi tiết: `docs/ARCHITECTURE.md` và `docs/SYSTEM-DESIGN.md`.

## Chạy local

```
cp .dev.vars.example .dev.vars        # điền SESSION_SECRET (≥ 32 ký tự)
npm install
npm run db:migrate:local
node scripts/create-staff.mjs "Họ tên" 09xxxxxxxx 123456 SALES,ADMIN > staff.local.sql   # cửa khẩn cấp: in SQL tạo tài khoản
npx wrangler d1 execute tourdao-sales-db --local --file staff.local.sql               # (staff.local.sql bị gitignore)
npm run dev                           # wrangler dev, tự build web/ → public/js/
```

Thử nhanh trên **D1 tạm** (không đụng dữ liệu thật; mạng LAN, dùng cho iPhone thật): `node scripts/dev-iphone.mjs`.

## Kiểm tra

```
npm run typecheck        # 0 lỗi (server, web/, web/sw/)
npm test                 # scripts/chay-test.mjs: bộ chính src/**/*.test.ts song song (trừ bài đo giờ của hook), rồi bài đo giờ chạy MỘT MÌNH; một bước đỏ ⇒ thoát ≠ 0
npm run test:e2e         # API thật trên D1 local tạm; CẦN MẠNG (đọc Google Sheet thật + xác minh Turnstile của Cloudflare) — tests/e2e/README.md
```

Kịch bản giao diện bằng Chrome thật nằm ở `docs/evidence/2026-09-20-a2/kich-ban/` (không trong CI).

## Nạp nhân viên từ Google Sheet

Cách chính: nút "Đồng bộ danh sách từ Google Sheet…" ở `/staff` (xem trước rồi áp dụng). Dự phòng bằng dòng lệnh (`scripts/import-staff.mjs`, dùng chung logic `src/modules/staff/sheet.ts`). Sheet chỉ là nguồn đề xuất — mọi tài khoản mới chỉ có quyền **Bán hàng (`SALES`)**; cấp thêm quyền ở `/staff`. D1 là nguồn sự thật. Cột nhận: `Tên người dùng`, `Số điện thoại`. SĐT đã có trong D1 thì bỏ qua; PIN sinh ngẫu nhiên, ghi vào tệp `*.local.txt` (gitignored).

```
node scripts/import-staff.mjs "https://docs.google.com/spreadsheets/d/<ID>/export?format=csv" --db local|remote
npx wrangler d1 execute tourdao-sales-db --local|--remote --file staff.local.sql
```

## Triển khai

Chỉ khi chủ dự án ra lệnh, theo runbook [`docs/HANDOFF-N1.md`](docs/HANDOFF-N1.md) (cổng chỉ-đọc, điểm khôi phục Time Travel, áp migration rồi `wrangler deploy` ngay, kiểm sau khi deploy). Cloudflare không nối GitHub: `git push` không tự deploy.
