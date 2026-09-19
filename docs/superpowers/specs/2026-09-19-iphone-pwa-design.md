# Thiết kế: app iPhone bằng PWA — "Tour Đảo Desk"

Ngày 2026-09-19. Chủ dự án đã duyệt hướng (PWA) và mockup: https://claude.ai/artifact/UJhmHqivTKaGVZr3m98Aoc

## Mục tiêu

Nhân viên mở link bằng Safari, bấm "Thêm vào Màn hình chính" và dùng như một app: có icon riêng, chạy toàn màn hình, mở màn hình gần như tức thì. Không App Store, không tài khoản Apple.

**Ngoài phạm vi (cố ý):** chế độ offline (mất mạng thì mở được khung nhưng không có dữ liệu); hướng dẫn cài cho nhân viên (chờ chốt tên miền `sales.tourdao.vn`, vì app gắn với origin, đổi tên miền là phải cài và đăng nhập lại); gia hạn phiên tự động (phiên vẫn 7 ngày cố định); dựng lại trang admin (`/catalog`, `/staff`, `/audit`) cho điện thoại ngoài khung chung; đổi tên Worker/D1 (`tourdao-sales` là định danh deploy).

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

## Thành phần

**Khung PWA**
- `public/manifest.webmanifest`: `name` "Tour Đảo Desk", `short_name` "Tour Đảo", `display: standalone`, `start_url: /`, `theme_color` và `background_color` navy/trắng, icon 192 và 512.
- `public/icons/`: `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `logo-96.png` (logo nhỏ cho thanh đầu trang).
- Cả 8 trang HTML: `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, `link rel=manifest`, `link rel=apple-touch-icon`, tiêu đề mới. CSP hiện tại (`default-src 'self'`) đã bao phủ worker và manifest cùng origin nên không sửa.
- `public/_headers`: `/sw.js` không cache (`Cache-Control: no-cache`).

**Service worker**
- `src/shared/sw-policy.ts`: hàm thuần, có test: `routeFor(method, url, origin)` trả `"pass"` (không đụng: khác origin, không phải GET, `/api/*`, `/sw.js`) hoặc `"shell"`; `cacheKey(url)` chuẩn hoá về `origin + pathname` (bỏ query để `/order?id=…` không sinh vô số mục cache); `isCacheable(response)` chỉ nhận 200, cùng origin, không chuyển hướng.
- `web/sw/sw.ts` (+ `tsconfig.json` riêng, lib WebWorker) build bằng esbuild ra `public/sw.js` (gitignored như `public/js`). `install`: nạp sẵn các trang lõi, lỗi một mục không làm hỏng cả lần cài. `activate`: xoá cache có tên khác `CACHE_NAME`, `clients.claim()`. `fetch`: `pass` thì thoát sớm, không gọi `respondWith`; `shell` thì trả từ cache rồi tải bản mới ngầm phía sau; chưa có cache và mất mạng thì trả 503 dạng văn bản.
- `CACHE_VERSION` tăng tay khi một lần deploy đổi API không tương thích (xoá cache cũ để bắt buộc tải mới). Sau mỗi deploy, lần mở đầu vẫn chạy khung cũ, lần sau là khung mới.
- `web/pwa.ts`: `registerServiceWorker()`, gọi từ `initShell()` và `login.ts` (không script inline vì CSP).

**Giao diện điện thoại**
- `web/shell.ts`: dựng một topbar dùng chung cho cả hai cỡ màn hình (logo + tên, nút "‹", tiêu đề, liên kết, người dùng) và thanh tab; CSS quyết định cái nào hiện. Cấu hình theo trang qua thuộc tính `<body data-title data-back data-tabbar>`. `setBarTitle()` cho trang đổi tiêu đề sau khi tải (`order.ts` đặt mã đơn, `order-form.ts` đặt "Sửa đơn …"). Nút "‹": có lịch sử thì `history.back()`, không thì về `data-back`.
- Thanh tab: nhân viên 3 tab (Đơn hàng, Đơn mới, Tôi); admin 5 tab (thêm Dịch vụ, Nhân viên). `/order` thuộc tab Đơn hàng, `/audit` thuộc tab Tôi.
- `web/icons.ts`: biểu tượng SVG dựng bằng `createElementNS` (repo cấm `innerHTML`).
- `public/account.html` + `web/account.ts`: thành trang "Tôi": thẻ hồ sơ (tên, SĐT, vai), thẻ liên kết (Nhật ký cho admin, Đăng xuất), rồi form đổi PIN như cũ. `logout()` dùng chung với topbar máy tính.
- `public/app.css`: khối `@media (max-width: 640px)`: topbar dính đầu trang có đệm `safe-area-inset-top`, thanh tab cố định đáy có đệm `safe-area-inset-bottom`, nút ≥44px, thanh nút form dính đáy có nền, bảng dịch vụ trong chi tiết đơn thành khối xếp dọc (chỉ bằng CSS, không đổi DOM), ô tìm kiếm cùng hàng với bộ lọc, ẩn `h1` trùng với tiêu đề trên thanh đầu trang, ẩn nút "+ Đơn mới" trong toolbar và nút "Quay lại" trong form.
- Trang đăng nhập: dải navy `safe-area-inset-top`, logo trên tiêu đề, tên mới.
- Ô tìm đơn: gợi ý rút gọn "Tìm mã đơn, tên, SĐT…".

## Kiểm chứng

- Tự động: `npm run typecheck`, `npm test` (thêm test `sw-policy`: `/api/*`, khác origin, không phải GET, `/sw.js` đều `pass`; chuẩn hoá khoá cache; điều kiện cache), `npm run test:e2e` (thêm `pwa.mjs`: manifest phục vụ đúng content-type và đúng nội dung, `/sw.js` không cache, icon đúng kích thước và không kênh trong suốt, cả 8 trang có đủ thẻ meta iOS, một phản hồi `/api/*` có `cache-control: no-store`).
- Trên Chrome với `wrangler dev`: service worker đăng ký, cache có đúng khung, `/api/*` không nằm trong cache, chụp khổ 390px các màn hình.
- Chỉ kiểm được trên iPhone thật (danh sách trong `docs/PWA-IPHONE.md`): Thêm vào Màn hình chính, hình icon sau khi iOS bo góc, thanh trạng thái, vuốt cạnh để quay lại, tai thỏ và thanh home.

## Rủi ro đã biết

- Phiên 7 ngày cố định và iOS tách cookie giữa Safari với app đã cài: nhân viên đăng nhập lại một lần khi cài, rồi khoảng mỗi tuần.
- Khung stale-while-revalidate có thể chạy lệch một lần deploy. Nếu đổi API không tương thích, tăng `CACHE_VERSION` trong cùng lần deploy.
- Trang admin trên điện thoại vẫn là bảng cuộn ngang, chỉ được khung chung mới.
