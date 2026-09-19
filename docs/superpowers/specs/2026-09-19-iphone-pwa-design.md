# Thiết kế: app iPhone bằng PWA — "Tour Đảo Desk"

Ngày 2026-09-19 (bản 2, sau rà soát theo Hiến pháp/ràng buộc của tourdaovn: `docs/AUDIT-PWA-IPHONE.md`). Chủ dự án đã duyệt hướng (PWA) và mockup: https://claude.ai/artifact/UJhmHqivTKaGVZr3m98Aoc. **Chờ chủ dự án duyệt:** tên hiển thị "Tour Đảo Desk" (đề xuất của AI, Q5).

## Mục tiêu

Nhân viên mở link bằng Safari, bấm "Thêm vào Màn hình chính" và dùng như một app: có icon riêng, chạy toàn màn hình, mở màn hình gần như tức thì. Không App Store, không tài khoản Apple.

**Ngoài phạm vi (cố ý):** chế độ offline thật (mất mạng thì mở được khung nhưng không có dữ liệu; `initShell()` báo "Không có kết nối mạng…" ở `#error` rồi dừng script trang, giữ lời gọi treo như `goLogin()`); hướng dẫn cài cho nhân viên (chờ chốt tên miền `sales.tourdao.vn`, vì app gắn với origin, đổi tên miền là phải cài và đăng nhập lại); gia hạn phiên tự động (phiên vẫn 7 ngày cố định); dựng lại trang admin (`/catalog`, `/staff`, `/audit`) cho điện thoại ngoài khung chung; đổi tên Worker/D1 (`tourdao-sales` là định danh deploy).

## Quyết định

| Chủ đề | Chọn | Lý do |
|---|---|---|
| Tên hiển thị | "Tour Đảo Desk"; nhãn dưới icon "Tour Đảo" | iOS cắt nhãn quá ~12 ký tự. Đổi tên = thay chuỗi trong UI và manifest. |
| Icon | Buồm + thuyền của logo thật, trên nền vuông đặc `#993333`, không kênh trong suốt | iOS tô đen vùng trong suốt và tự bo góc. Nguồn: `Logo-Cty-Tour-Dao.png` 500×500 (Sanity của tourdaovn, project `pgedy374`). |
| Thanh trạng thái | `black-translucent`, dải navy đệm theo `safe-area-inset-top` trên mọi trang | Navy tràn sát mép; thiếu dải này chữ trắng của thanh trạng thái biến mất trên trang đăng nhập. |
| Service worker | stale-while-revalidate cho khung (HTML/CSS/JS/icon); `/api/*` không bao giờ qua cache | JS build ra không có hash trong tên nên cache-first sẽ giữ bản cũ mãi. `/api/*` có dữ liệu khách và phiên. |
| Điều hướng điện thoại (≤640px) | Thanh tab dưới đáy + thanh đầu trang mỏng có nút "‹" ở trang con | App toàn màn hình không có nút Back của trình duyệt. |
| Form lập đơn | Ẩn thanh tab; nút "Lưu đơn nháp" dính đáy | Tránh hai thanh dưới chồng nhau và chiếm hơn 18% màn hình. |
| Máy tính (>640px) | Giữ nguyên thanh điều hướng hiện tại | Không đổi trải nghiệm đang chạy. |

## Bản ghi quyết định (P5, Điều 7.2)

| # | Quyết định | Cửa | Phương án bị loại | Ai duyệt |
|---|---|---|---|---|
| Q1 | Làm PWA (Thêm vào Màn hình chính từ Safari), không App Store | Hai chiều: gỡ manifest và service worker là quay về web thường (service worker đã cài trên máy tự gỡ nhờ cách tắt khẩn cấp ở `docs/PWA-IPHONE.md`) | **Capacitor** (cần Apple Developer 99 USD/năm, mỗi bản qua Apple duyệt, vỏ mỏng bọc web dễ bị từ chối); **SwiftUI** (viết lại toàn bộ, trái yêu cầu "nhanh nhất" và trái quyết định không dùng framework ở SPEC) | Chủ dự án, 2026-09-19 |
| Q2 | Service worker stale-while-revalidate cho khung; `/api/*` không bao giờ qua cache; **mã phiên bản cache do build chèn** (mỗi build/deploy xoá cache cũ, không có bước "nhớ tăng tay") | Hai chiều | **Cache-first** (JS build ra không có hash trong tên nên giữ bản cũ mãi); **nạp sẵn theo hash từng file** (thêm bước build, phức tạp hơn, trái P11); **network-first** (mất lợi ích tốc độ); **`CACHE_VERSION` tăng tay** (đã thay: ràng buộc chỉ dựa vào kỷ luật của người là ràng buộc rỗng, Hiến pháp §8.2) | Chủ dự án (duyệt thiết kế), 2026-09-19 |
| Q3 | Điều hướng kiểu app ở ≤640px: thanh tab dưới đáy + nút "‹" ở trang con; form lập đơn ẩn thanh tab | Hai chiều (CSS và `web/shell.ts`) | Giữ thanh liên kết trên cùng (5–7 liên kết vỡ hàng ở 390px); menu hamburger (nhiều lần chạm hơn) | Chủ dự án qua mockup, 2026-09-19 |
| Q4 | Icon dựng từ logo thật của tourdaovn (Sanity project `pgedy374`), nền vuông đặc `#993333`; logo và màu là **kế thừa có ngày, sao chép, không import lúc chạy** (N4, cùng cách `app.css` đã khai báo với token) | Hai chiều | Dùng `favicon.svg` dự phòng navy của tourdaovn (không phải logo thật); icon có nền trong suốt (iOS tô đen góc) | Chủ dự án chỉ nguồn logo, 2026-09-19 |
| Q5 | Tên hiển thị "Tour Đảo Desk", nhãn dưới icon "Tour Đảo" (iOS cắt nhãn quá ~12 ký tự) | Hai chiều (5 chỗ, một commit) | Giữ "Tour Đảo Sales" | **Đề xuất của AI, CHỜ chủ dự án duyệt** (khẩu vị và bề mặt thuộc chủ dự án, Điều 7.1, P8) |
| Q6 | Lấy thêm hai đề xuất trong mockup: bảng dịch vụ ở chi tiết đơn thành khối xếp dọc; logo ở đầu trang và trang đăng nhập | Hai chiều | Giữ bảng cuộn ngang; không logo (đúng nguyên văn SPEC §2.4-2: v1 chạy wordmark chữ, logo lắp sau qua `company_profile.logo_url`). **Nợ:** logo tĩnh ở đầu trang và đăng nhập là tạm; khi M5 có `company_profile.logo_url` thì hai chỗ này đọc từ đó (icon PWA vẫn tĩnh vì manifest không đọc được cấu hình động) | Chủ dự án duyệt mockup, 2026-09-19 |
| Q7 | Mất mạng: khung mở từ cache và báo "Không có kết nối mạng…", chưa làm offline thật | Hai chiều | Để trang trống không lời giải thích (đã quan sát, tệ hơn trang lỗi của Safari trước PWA) | Bổ sung khi kiểm trên trình duyệt (RS5); nhỏ, thuộc bề mặt, ghi để chủ dự án rà |
| Q8 | Không thêm dependency; kiểm giao diện bằng Chrome headless cài tạm ngoài repo (`docs/evidence/2026-09-19-pwa/kich-ban/`) | Hai chiều | Thêm `puppeteer-core` vào `devDependencies` (dependency mới cần quyết định, `CLAUDE.md` §8 của tourdaovn) | Chủ dự án không phải quyết (không đổi phụ thuộc) |
| Q9 | `theme-color` (manifest và 8 trang) = `--c-primary` navy; thanh trạng thái iOS `black-translucent` với dải navy đệm phía trên. Nguyên tắc lấy từ `QĐ-2026-08-22-01` (A7) của tourdaovn: theme-color là **màu sát thanh địa chỉ/trạng thái**; ở tourdaovn đó là nền trắng của header (`--c-surface`), ở Desk là navy của thanh đầu trang, nên nguyên tắc giống và giá trị khác. `#993333` của nền icon là **màu của tài sản logo**, không phải màu giao diện. Icon theo quy ước của tourdaovn: ảnh raster vuông, apple-touch-icon PNG 180 px (iOS không đọc SVG). Nguồn dùng `Logo-Cty-Tour-Dao.png` 500×500 chứ không phải trường `favicon` (250×250 trong dữ liệu, dưới sàn 512 px mà chính tourdaovn đặt ra) | Hai chiều | `theme-color` = màu nền trang (đẹp với tab Safari nhưng lệch thanh đầu trang navy); dùng trường `favicon` 250×250 (mờ khi phóng lên 512 px) | Chủ dự án duyệt mockup (thanh trạng thái navy), 2026-09-19 |

## Ánh xạ màn hình ↔ dữ liệu (P2, N1)

Mọi màn hình là màn hình đã chạy; nhánh này chỉ tổ chức lại bề mặt và **không thêm trường dữ liệu, bảng hay API nào**.

| Màn hình (điện thoại) | Dữ liệu (hợp đồng `src/shared/contracts.ts`) |
|---|---|
| Danh sách đơn (`/`) | `OrderSummaryDto`: `orderCode`, `status`, `customerName`, `customerPhone`, `createdAt`, `staffName`, `total`, `remainingAmount` |
| Chi tiết đơn (`/order`) | `OrderDetailDto` (`items[]`: `description`, `detail`, `quantity`, `unitPrice`, `lineTotal`; khách, tiền, cọc, ghi chú), lịch sử `AuditEntryDto`, `canModify` |
| Lập/sửa đơn (`/order-form`) | `OrderInput` (khách, `items[]`, `discount`, `depositAmount`, `depositMethod`, `paymentNote`); số dẫn xuất chỉ hiện xem trước, máy chủ tính lại (§2.3) |
| Tôi (`/account`) | `StaffProfile`: `fullName`, `phone`, `role`; đổi PIN qua `/api/account/change-pin` |
| Thanh tab | `StaffProfile.role` quyết định 3 hay 5 tab (không có dữ liệu riêng) |
| Đăng nhập (`/login`) | `phone`, `pin` (không đổi) |

## Thành phần

**Khung PWA**
- `public/manifest.webmanifest`: `name` "Tour Đảo Desk", `short_name` "Tour Đảo", `display: standalone`, `start_url: /`, `theme_color` và `background_color` navy/trắng, icon 192 và 512.
- `public/icons/`: `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `logo-96.png` (logo nhỏ cho thanh đầu trang).
- Cả 8 trang HTML: `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, `link rel=manifest`, `link rel=apple-touch-icon`, tiêu đề mới. CSP hiện tại (`default-src 'self'`) đã bao phủ worker và manifest cùng origin nên không sửa.
- `public/_headers`: `/sw.js` là `Cache-Control: no-store` (không phải `no-cache`: `no-cache` vẫn cho trình duyệt giữ bản cũ và gửi `If-None-Match`, một ETag cũ làm nó nhận `304` và không thấy service worker mới, và cách tắt khẩn cấp cũng đi qua `/sw.js`).

**Service worker**
- `src/shared/sw-policy.ts`: hàm thuần, có test: `routeFor(method, url, origin)` trả `"pass"` (không đụng: khác origin, không phải GET, `/api/*`, `/sw.js`) hoặc `"shell"`; `cacheKey(url)` chuẩn hoá về `origin + pathname` (bỏ query để `/order?id=…` không sinh vô số mục cache); `isCacheable(response)` chỉ nhận 200, cùng origin, không chuyển hướng.
- `web/sw/sw.ts` (+ `tsconfig.json` riêng, lib WebWorker) build bằng esbuild ra `public/sw.js` (gitignored như `public/js`). `install`: nạp sẵn các trang lõi, lỗi một mục không làm hỏng cả lần cài. `activate`: xoá cache có tên khác `CACHE_NAME`, `clients.claim()`. `fetch`: `pass` thì thoát sớm, không gọi `respondWith`; `shell` thì trả từ cache rồi tải bản mới ngầm phía sau; chưa có cache và mất mạng thì trả 503 dạng văn bản.
- `CACHE_VERSION` = mã bản dựng do `npm run build:web` chèn (`--define:__BUILD_ID__`, `AAAAMMDDGGPPSS`; ngoài bản build là `dev`): mỗi lần build/deploy service worker mới xoá cache cũ. Sau deploy, chỉ lần mở đầu tiên (trước khi trình duyệt nhận service worker mới) còn chạy khung cũ. Xác nhận trên môi trường thật ở `docs/PWA-IPHONE.md`, mục "Sau khi deploy".
- `web/pwa.ts`: `registerServiceWorker()`, gọi từ `initShell()` và `login.ts` (không script inline vì CSP).

**Giao diện điện thoại**
- `web/shell.ts`: dựng một topbar dùng chung cho cả hai cỡ màn hình (logo + tên, nút "‹", tiêu đề, liên kết, người dùng) và thanh tab; CSS quyết định cái nào hiện. Cấu hình theo trang qua thuộc tính `<body data-title data-back data-tabbar>`. `setBarTitle()` cho trang đổi tiêu đề sau khi tải (`order.ts` đặt mã đơn, `order-form.ts` đặt "Sửa đơn …"). Nút "‹": có lịch sử thì `history.back()`, không thì về `data-back`. Mất mạng (khung mở từ cache): `initShell()` báo "Không có kết nối mạng…" ở `#error` rồi giữ lời gọi treo (Q7).
- Thanh tab: nhân viên 3 tab (Đơn hàng, Đơn mới, Tôi); admin 5 tab (thêm Dịch vụ, Nhân viên). `/order` thuộc tab Đơn hàng, `/audit` thuộc tab Tôi.
- `web/icons.ts`: biểu tượng SVG dựng bằng `createElementNS` (repo cấm `innerHTML`).
- `public/account.html` + `web/account.ts`: thành trang "Tôi": thẻ hồ sơ (tên, SĐT, vai), thẻ liên kết (Nhật ký cho admin, Đăng xuất), rồi form đổi PIN như cũ. `logout()` dùng chung với topbar máy tính.
- `public/app.css`: khối `@media (max-width: 640px)`: topbar dính đầu trang có đệm `safe-area-inset-top`, thanh tab cố định đáy có đệm `safe-area-inset-bottom`, nút ≥44px, thanh nút form dính đáy có nền, bảng dịch vụ trong chi tiết đơn thành khối xếp dọc (chỉ bằng CSS, không đổi DOM), ô tìm kiếm cùng hàng với bộ lọc, ẩn `h1` trùng với tiêu đề trên thanh đầu trang (chỉ ẩn khỏi mắt, không `display:none`, để trình đọc màn hình còn tiêu đề cấp 1), ẩn nút "+ Đơn mới" trong toolbar và nút "Quay lại" trong form. **Giá trị giao diện đi vào token riêng của Desk ở `:root`** (`--tap-min`, `--bar-h`, `--tabbar-h`, `--tab-icon`, `--fs-tab`, `--row-h`, `--avatar`, `--logo-bar`, `--logo-login`, `--radius-icon`, `--c-on-dark`), không viết cứng trong luật; `pwa.mjs` quét khối PWA của `app.css` (từ dấu mốc `app iPhone (PWA)` đến cuối file).
- Trang đăng nhập: dải navy `safe-area-inset-top`, logo trên tiêu đề, tên mới.
- Ô tìm đơn: gợi ý rút gọn "Tìm mã đơn, tên, SĐT…".

## Kiểm chứng

- Tự động: `npm run typecheck`, `npm test` (thêm test `sw-policy`: `/api/*`, khác origin, không phải GET, `/sw.js` đều `pass`; chuẩn hoá khoá cache; điều kiện cache), `npm run test:e2e` (thêm `pwa.mjs`: manifest phục vụ đúng content-type và đúng nội dung, `/sw.js` không cache, icon đúng kích thước và không kênh trong suốt, cả 8 trang có đủ thẻ meta iOS, tên và màu theme nhất quán với manifest và token `--c-primary`, khối PWA của `app.css` không viết cứng màu/px, một phản hồi `/api/*` có `cache-control: no-store`).
- Trên Chrome headless với `wrangler dev` (bằng chứng ở `docs/evidence/2026-09-19-pwa/`): service worker đăng ký, cache có đúng khung, `/api/*` không nằm trong cache, mở được khi offline, ảnh chụp khổ 390px, axe-core (0 lỗi critical/serious), thời gian mở màn hình trên 4G giả lập (Ngưỡng của SPEC: TTI di động 4G dưới 2 giây; đo được 717 ms lần đầu nguội, 31 ms khung và 350 ms dữ liệu khi mở lại có service worker).
- Chỉ kiểm được trên iPhone thật (danh sách trong `docs/PWA-IPHONE.md`): Thêm vào Màn hình chính, hình icon sau khi iOS bo góc, thanh trạng thái, vuốt cạnh để quay lại, tai thỏ và thanh home.

## Rủi ro đã biết

- Phiên 7 ngày cố định và iOS tách cookie giữa Safari với app đã cài: nhân viên đăng nhập lại một lần khi cài, rồi khoảng mỗi tuần.
- Khung stale-while-revalidate có thể chạy bản cũ ở đúng lần mở đầu tiên sau deploy (mã bản dựng tự đổi nên không cần nhớ tăng tay). Rủi ro còn lại: chưa kiểm được trên Workers Assets thật (chỉ trên `wrangler dev`); kiểm ngay sau lần deploy đầu tiên.
- Trang admin trên điện thoại vẫn là bảng cuộn ngang, chỉ được khung chung mới.
