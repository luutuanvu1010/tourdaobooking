> **Nguyên văn báo cáo của agent QA độc lập (lần 2), lưu nguyên vẹn, không chỉnh sửa nội dung.** Cùng agent QA đã soát lần 1 (`QA2-doc-lap-lan-1.md`), được tiếp tục để xác nhận các bản sửa; không phải người thi công. Bản được soát: `84718a3`. Kết quả: **ĐẠT**. Chủ dự án chưa ký. Hai phát hiện SỬA ở cuối được xử lý ở commit sau (xem `docs/AUDIT-PWA-IPHONE.md`); các commit sau `84718a3` chỉ đổi tài liệu, bằng chứng và một dòng test.

Kết quả: ĐẠT — bản `84718a3`, 2026-09-19 ~17:50 (đo từ ~17:25).

| Tiêu chí | | Bằng chứng (E1) |
|---|---|---|
| **G1** Bất biến `/api/*` | **PASS** | Chrome, đã đăng nhập, `controller=true`: fetch GET/HEAD/OPTIONS/Range × `//api/auth/me`, `///api/orders`, `/%61pi/auth/me`, `/API/auth/me`, `/api;x/orders`, `/api/../api/auth/me`, `/app.css/../api/auth/me` + điều hướng thật 5 biến thể (`//api/auth/me` vẫn trả `200/application/json`) → sau đăng xuất `caches.keys()` = 1 cache, **14 mục**, đường dẫn đúng bộ nạp sẵn, 0 URL chứa `api`, 0 thân có `"staff"/"orders"/"customerPhone"`; content-type đã lưu chỉ `text/html, text/css, text/javascript, image/png, application/manifest+json` (chứng dương: đủ 14 mục → danh sách cho phép không tắt cache) |
| **G2** Cổng máy | **PASS** | `npm ci` → 0 vulnerabilities; `npm run typecheck` → không lỗi; `npm test` → `# tests 58 / # pass 58 / # fail 0`; `npm run test:e2e` → `E2E: 6/6 kịch bản xanh` (có mạng, `catalog` đọc Sheet thật) |
| **G3** Không hồi quy | **PASS** | 390×844 và 1280×800, mỗi cỡ một ngữ cảnh riêng: đăng nhập→`/`; danh sách 2 dòng; tạo đơn → `TD-20260919-0002`/`-0003`, chuyển thẳng `/order?id=…`, `error=null`; chi tiết có `Sửa/Xác nhận đơn/Huỷ đơn`; sửa nháp lưu lại `error=null`; đổi PIN `ok=true`, đăng xuất→`/login`, đăng nhập lại bằng PIN mới→`/`; duyệt đủ 8 trang: **0** lỗi console/CSP (chỉ 1 `ERR_INTERNET_DISCONNECTED` do tôi cố ý ngắt mạng) |
| **G4** Bốn bản sửa | **PASS** | Q2-02: dán đúng 4 dòng ở `docs/PWA-IPHONE.md:9` → `npm run typecheck` **XANH**, `build:web` ra `sw.js` = `self.registration.unregister();caches.keys().then(…caches.delete…)` (đã hoàn tác). Q2-03: `color:red;padding:10%;width:30vw` → quét trả `[]` (đúng như `docs/PWA-IPHONE.md:24` khai "không bắt được"), `#abcdef;7px;2rem` → `["#abcdef","7px","2rem"]` đỏ. Q2-04: mất mạng → `{"tabbar":true,"display":"flex","tabs":["Đơn hàng","Đơn mới","Tôi"]}`. Q2-01: xem G1 |
| **G5** Đổi tên | **PASS** | manifest `name:"Tour Đảo Booking"`, `short_name:"Tour Đảo"`; 8 `<title>… — Tour Đảo Booking`; `login.html <h1>Tour Đảo Booking`; `web/shell.ts:69` `"Tour Đảo "+<span>Booking`; `web/order.ts:16` `${orderCode} — Tour Đảo Booking`; grep còn đúng 1 dòng là chuỗi bên trong khẳng định `tests/e2e/pwa.mjs:93`, không phải tên trong sản phẩm |
| **G6** Phạm vi/an toàn | **PASS** | `git diff --stat 9286a10..HEAD`: `package.json` 2 +/2 −, `package-lock.json` **không có trong diff**; `wrangler.jsonc` không có `routes`/`custom_domain`/`booking`; `git diff 118be35..HEAD -- public/_headers` **rỗng**; `git ls-files` không có `.dev.vars/.env/*.local.sql`; mọi đường dẫn trong diff thuộc repo này |
| **G7** Trợ năng | **PASS** | axe-core 8 trang điện thoại: **0 critical/serious**. Còn: `empty-table-header` (minor) ở `/catalog`, `/staff` — có sẵn từ trước nhánh; `page-has-heading-one` (moderate) chỉ ở `/order` **không có `?id=`** — `/order?id=…` thật trả `[]` và có 1 `h1` |

**Phát hiện mới**

1. **SỬA** — `tests/e2e/pwa.mjs:93` chỉ chặn chuỗi `"Tour Đảo Sales"`; sau lần đổi tên này, một chỗ sót `"Tour Đảo Desk"` sẽ không bị cổng nào bắt. Tái hiện: `grep -n "Tour Đảo Desk" tests/e2e/pwa.mjs` → rỗng.
2. **SỬA** — `/order` không kèm `?id=` nằm trong `PRECACHE` (`src/shared/sw-policy.ts:26`) nhưng không có `h1` nào (h1 do JS dựng sau khi tải đơn), nên axe báo `page-has-heading-one` mức moderate; gốc có sẵn từ trước nhánh (`git show 9286a10:public/order.html | grep -c "<h1"` → 0), nhưng nhánh làm URL trần này thành một trang được cache. Tái hiện: mở `http://localhost:8891/order` rồi chạy axe.

Đủ điều kiện gộp về mặt QA.

---
(Dọn dẹp: `wrangler dev`/`workerd` đã tắt, `.dev.vars`, `.wrangler`, `qa2.local.sql` đã xoá, mọi thử nghiệm phá đã hoàn tác — `git status --short` rỗng, `HEAD` = `84718a3`. Không chạm tourdaovn/fastbooking, không commit/push/deploy, không đụng D1 remote.)
