# Phụ lục A — Bản đồ mã cho đặc tả đợt 0b (29/10/2026)

> Hồ sơ có ngày. Phiên con chỉ đọc lập trên `main` 25f127d1 theo đề bài của Main session; không sửa tệp nào. Số dòng ghi ở đây là ảnh chụp ngày 29/10, kế hoạch thi công đọc lại mã trước khi dùng.

> **Đính chính 29/10 (QA1 lần 2 sửa lại lần 1):** mục 5 «@font-face dòng 8–25» là **đúng** — 17 khai báo (5 BVP + 12 phông tuỳ chọn, `pwa.mjs:59` cũng ghim 17) nằm ở `app.css:8–25`; dòng 414 chỉ là chú thích có chữ «@font-face». Mục 10: `shell.ts:418` chú thích «236px» là số cũ, token `--w-sidebar` hiện 248 px (`app.css:184`). Cỡ `public/js` không kiểm được trong worktree chưa dựng; số 101.700 byte lấy từ biên bản cổng phát hành đợt 0.

Kho: /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales, main = 25f127d1. Tôi chỉ đọc, không sửa tệp nào.

## 1. Cách dựng gói hiện nay
- `package.json:11`, script `build:web`, gồm 3 lệnh nối nhau:
  1. `node scripts/sinh-so-do-trang.mjs`
  2. `BUILD_ID=$(date +%Y%m%d%H%M%S)`
  3. `esbuild web/login.ts web/orders.ts … web/khong-co-trang.ts web/ngoai-mang.ts --bundle --format=esm --target=es2022 --minify --define:__BUILD_ID__=\"$BUILD_ID\" --define:__APP_VERSION__=\"$(node scripts/in-phien-ban.mjs version)\" --define:__APP_RELEASE_DATE__=\"$(node scripts/in-phien-ban.mjs date)\" --outdir=public/js`, rồi `esbuild web/sw/sw.ts --bundle --format=iife --target=es2022 --minify --define:__BUILD_ID__=… --outfile=public/sw.js`.
- Có **48 điểm vào** liệt kê tay (không tính sw). Có `--format=esm` nhưng **chưa có `--splitting`, chưa có chunk**. Đầu ra là `public/js/<tên>.js` nằm phẳng. `public/js` và `public/sw.js` bị `.gitignore` (dòng 7–8).
- `wrangler.jsonc:30` có `"build": { "command": "npm run build:web", "watch_dir": "web" }`.
- `scripts/sinh-so-do-trang.mjs` (263 dòng) **không sinh `<head>`**. Nó sinh kho tri thức cho trợ lý và ghi 2 tệp: `src/shared/so-do-trang.ts` và `src/shared/tro-ly-cau-truc.ts`.
  - Hàm chính: `dungSoDo` (≈dòng 126), `sinhTep`, `sinhTepCauTruc`, `ghiNeuKhac`, `ghiTatCa`.
  - Nó **đọc** `public/<trang>.html` để lấy `<title>X — Island Booking System</title>`, script `<script … type="module" … src="/js/X.js">` và h2/h3/nút. Danh sách trang lấy từ `PAGES`.
- Kích thước thô (`ls -l`, bản dựng 29/10 19:13):

| Gói | Byte |
|---|---:|
| `orders.js` | 101.700 |
| `login.js` | 83.965 |
| `home.js` (trang "/") | 115.906 |
| lớn nhất: `help.js` | 380.645 |
| tiếp theo: `order.js` | 330.369 |
| nhỏ nhất: `cho-xac-nhan.js` | 82.233 |

  - Ba gói nhỏ nhất tiếp theo: `tai-xe.js` 82.624, `ngoai-mang.js` 82.483, `khong-co-trang.js` 82.804.
  - Có tệp mồ côi `danh-muc-giay-to.js` (65.743 byte, dựng 28/9) vì build không dọn `outdir`.
  - Tổng thư mục ≈ 5,4 MB. `sw.js` 5.256 byte (chú thích ở `_headers` vẫn ghi "1,3 KB", đã cũ).

## 2. Phần dùng chung thực tế (đếm import trực tiếp trong 48 điểm vào)

| Module | Số điểm vào |
|---|---:|
| `web/shell.ts` | 46 (2 trang thiếu là `loai-giay-to-xe` và `loai-giay-to-nguoi`, nhưng vẫn kéo shell qua `danh-muc-giay-to-khoi.ts:11`, nên thực tế 48/48) |
| `web/api.ts` | 46 |
| `web/dom.ts` | 45 |
| `src/shared/permissions` | 38 |
| `src/shared/vn-date` | 25 |
| `web/giay-to-ui` | 22 |
| `web/icons.ts` | 21 |
| `web/bang-truot.ts` | 16 |
| `web/format` | 15 |
| `src/shared/contracts` | 13 |
| `web/dieu-phoi-ui` | 11 |
| `web/trang-thai-he-thong.ts`, `lam-moi-logic`, `src/shared/start-page` | 10 |
| `src/shared/muc-giao-dien` | 9 |

- `toast` và `dai` chỉ được 3 tệp trong `web/` nhập trực tiếp.
- Đếm kiểu này thấp hơn thực tế, vì `shell.ts:1–37` tự kéo theo: api, dom, icons, dai, format, bangtin, help-seen, phien-ban, khung-nho, vc-dem, pwa, thong-bao-ui, push-ui, tro-ly, muc-giao-dien, permissions, thanh-dinh-day, dai-chu, hai-lop-hien-thi. Vậy cả cụm này nằm trong **mọi** gói.
- Ngay `login.ts:5` cũng nhập `./shell` (để lấy `KHOA_NHAC_HAI_LOP`, `showError`).
- Gói nhỏ nhất ≈ 82 KB cho thấy phần chung thực tế khoảng 80 KB, lặp lại 48 lần.

## 3. Service worker
**`web/sw/sw.ts`**
- `install` (dòng 11–16): `caches.open(CACHE_NAME)` rồi `Promise.allSettled(PRECACHE.map(url => cache.add(new Request(url,{cache:"reload"}))))`, sau đó `skipWaiting()`.
- `activate` (18–25): xoá mọi cache có tên khác `CACHE_NAME`, rồi `clients.claim()`.
- `fetch` (27–31): nếu `routeFor(...) === "pass"` thì return, không gọi `respondWith`; ngược lại gọi `staleWhileRevalidate`.
- `push` (38–69) và `notificationclick` (71–97).
- **Chưa có `message`, chưa nghe postMessage.**
- `staleWhileRevalidate` (99–119): dùng chung cho HTML, JS, CSS, phông. Có cache thì trả ngay và làm mới ở nền; không có thì fetch. Mất mạng khi `mode==="navigate"` thì trả `/ngoai-mang` từ cache, không có nữa thì 503 chữ.
- `/api/*` không bao giờ đi qua SW ("pass").

**`src/shared/sw-policy.ts`**
- `CACHE_VERSION = __BUILD_ID__ ?? "dev"`, `CACHE_NAME = \`td-shell-${CACHE_VERSION}\`` (dòng 14–15).
- `PAGES` (dòng 18): **50 phần tử**, khớp 50 tệp `public/*.html`.
- `STATIC_FILE` (dòng 21): `/^\/(?:app\.css|giao-dien\.css|manifest\.webmanifest|js\/[A-Za-z0-9_-]+\.js|fonts\/[A-Za-z0-9_-]+\.woff2|icons\/[A-Za-z0-9_-]+\.png)$/`. Regex này **không nhận thư mục con** (ví dụ `js/chunks/`).
- `PRECACHE` (dòng 26–35): **108 mục, chép tay** = 50 trang + `/app.css`, `/giao-dien.css` + 5 phông Be Vietnam Pro (400–800) + **48 `/js/*.js`** + manifest + 2 icon.
- `routeFor` (40–45): chỉ GET, cùng gốc, nằm trong `PAGES` hoặc khớp `STATIC_FILE` thì là "shell"; còn lại "pass".
- `cacheKey` bỏ query/hash. `isCacheable` (56–59): từ chối `no-store`, chỉ nhận status 200, `type` "basic", không chuyển hướng, MIME là html/css/js/png/woff2/manifest.

**`src/shared/sw-policy.test.ts` khoá những gì**
- `/api` và mọi biến thể không vào cache (dòng 9, 17, 23); chỉ GET (29); khác gốc (33, 56, 64); `/sw.js` (37); Turnstile (45).
- `PAGES` deepEqual với `readdirSync(public/*.html)` (84).
- `PRECACHE` không trùng và đều là "shell" (115).
- Dòng 122: đọc `scripts["build:web"]`, regex `/web\/([A-Za-z0-9_-]+)\.ts/g`, rồi đòi mỗi `/js/<tên>.js` và mỗi `PAGES` phải nằm trong `PRECACHE`.
- `CACHE_NAME === "td-shell-dev"` (129); `giao-dien.css` (136); Hiến chương 5.22 (145); mọi lời gọi `isCacheable` trong `sw.ts` phải truyền `cacheControl` (160).

**ADR-0035** (accepted)
- Điều 1: nạp sẵn **mọi** trang và mọi JS ở lần cài mỗi bản dựng, dùng `cache:"reload"`, test giữ khớp `build:web`.
- Điều 2: dữ liệu gọi song song với `/api/auth/me`; `/api/*` không bao giờ vào cache.
- Điều 3: "bản nhớ khung" gồm chữ cái đầu tên và 4 cờ.
- Điều 4: không chuyển thành ứng dụng một trang.

**ADR-0150** (proposed 28/10): SW trả `/ngoai-mang` khi điều hướng mà hết bộ đệm và mất mạng; nếu thiếu cả trang đó thì 503 chữ. Không đổi điều 1–2 của ADR-0035; thêm `/ngoai-mang` vào nạp sẵn. Bài kiểm là `src/sw-ngoai-mang.test.ts` (đóng gói `sw.ts`, chạy trong `vm`).

## 4. HTML tĩnh
- 50 tệp. **48 tệp có `<head>` giống hệt nhau** (khác mỗi `<title>`), viết trên một dòng (dòng 2). Hai tệp chỉ chuyển hướng bằng `meta refresh`, không có JS: `home.html` → `/`, `danh-muc-giay-to.html` → `/loai-giay-to-nguoi`.
- Thứ tự `<head>`:
  - `<meta charset="utf-8">`
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">`
  - robots noindex, `<meta name="theme-color" content="#ffffff">`
  - Phần iOS: `apple-mobile-web-app-capable=yes`, `mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=default`, `apple-mobile-web-app-title="Island Booking"`
  - manifest, icon 192, `apple-touch-icon`
  - `<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/giao-dien.css">`, rồi `<title>`
- **Không có preload, modulepreload, prefetch hay speculationrules nào.**
- `<script type="module" src="/js/<tên>.js">` nằm cuối body. Riêng `index.html` dùng `home.js`, `404.html` dùng `khong-co-trang.js`.
- **HTML viết tay**: không script nào ghi `public/*.html`.
- Khung xương trong HTML: chỉ `index.html` (`#loading.skeleton-list` chứa `.dash-xuong*`, dòng 19–60) và `orders.html:14` (`.skeleton-list` với 2 `.skeleton-row`).
- `docs/CHANGE-GUIDE.md:198`, công thức c, cho trang mới:
  1. Chép nguyên `<head>` của `locations.html`, giữ `giao-dien.css` NGAY SAU `app.css`. Thân gồm `#topbar`, `#error`, script module. Không script inline.
  2. `initShell()`.
  3. Thêm vào `build:web`.
  4. Thêm vào `PAGES` và `PRECACHE` (cả trang lẫn js).
  5. Lối vào khai ở `muc-giao-dien.ts`.
  6. Quyền ở route.
  7. `pwa.mjs` không cần sửa.

## 5. Phông
- `public/fonts`:
  - be-vietnam-pro 400/500/600/700/800: 27.048 / 28.376 / 28.464 / 28.904 / 29.024 byte
  - lexend 400–700: ≈15,7–16,7 KB
  - noto-sans 400–700: ≈16,7–17,6 KB
  - nunito 400–700: ≈17,8–18,4 KB
  - thêm tệp OFL
- `public/app.css` dòng 8–25: **18 `@font-face`** (5 BVP + 4×3 phông tùy chọn), tất cả `font-display: swap`.
- `--font` và `--font-display` = "Be Vietnam Pro" (dòng 62–63).
- Token độ đậm (415–420): `--fw-regular:400`, `--fw-medium:500`, `--fw-semibold:500`, `--fw-bold:600`, `--fw-heavy:600`, `--fw-heading:600`. Ngoài ra `--fw-home-stat: min(calc(var(--fw-heavy)+100),800)` (dòng 477), tức 700 trên Trang chủ.
- Công ty có thể đổi sang Nunito, Lexend hoặc Noto qua `/giao-dien.css` (`src/shared/giao-dien.ts:12–13`).
- **Chưa trang nào preload phông.**

## 6. Thanh tab / thanh bên theo vai
- `src/shared/muc-giao-dien.ts`:
  - `TRANG` (58), `THANH_BEN` (180–215, 5 nhóm), `THANH_TAB` (224–238, 13 dòng). Thứ tự `THANH_TAB`: trangChu, trangTaiXe, donHang, taoDon, taiKhoan*, soCongNo*, danhBa*, thietLap, cuoc*, ban, gopY*, troGiup*, toi (* là có `chiKhi`).
  - `thanhTab(n: NguoiXem)` (393–396): lọc bằng `coHien`; nếu hơn 5 mục thì giữ 4 mục đầu cộng "Tôi".
  - Ngoài ra: `thanhBen(n, duong)` (333), `coKhungNho` (420), `NguoiXem = {staff}|{khungNho}` (33).
- Đường trang: trangTaiXe `/tai-xe`, cuoc `/cuoc`, ban `/ban`, thietLap `/thiet-lap`, toi `/account`, gopY `/feedback`, troGiup `/help`.
- `src/shared/start-page.ts:56` `homeRedirect(who)`:
  - `seesAllOrders` → null (ở lại "/")
  - `canAccessOrders` → `/orders`
  - `coCuocCuaToi` → `/cuoc`
  - `coPhanTaiXe` → `/tai-xe`
  - `account.view` → `/staff`
  - còn lại → null
- `GET /api/auth/me` (`src/modules/auth/index.ts:745–757`) trả `{ staff: StaffProfile{id, fullName, phone, partyId, permissions: PermissionCode[]}, maintenance, benDatCuaToi }` (`contracts.ts:20–29`, `:60`).
- Chỗ gọi: `web/shell.ts:483`, trong `initShell` (378+). Sau khi `/me` về, shell gọi `luuKhungNho`, `addNav`, `batDauBangTin`. **Đây là chỗ tự nhiên để gửi postMessage.**
- Đăng ký SW: `web/pwa.ts:7–13`, `register("/sw.js")` sau sự kiện `load`.

## 7. Khung xương hiện có
- Không có lớp `.skel*`. Các lớp thật:
  - `.skeleton-list`, `.skeleton-row` (`app.css:734–735`)
  - `.dash-xuong*` và `.dash-xg-*` của Trang chủ (1925–1931, 2033–2051, 2205–2207)
  - `.xuong` với `[data-khuon="so"|"vien"]` (4017–4019)
  - `.trang-thai-xuong` (4037)
- Token: `--skel-dong:16px`, `--skel-so:26px`, `--skel-vien:96px` (598–600); `--skel-sm/md/title/num/tag/time/money/pill` (452–459); `--skel-*-mt` (504–509).
- JS: `web/trang-thai-he-thong.ts:52–57` có `trangThaiHeThong("dang-tai", {khuon})` (`SO_DONG` dòng 32: danh-sach 6, chi-tiet 5, bieu-mau 5, bang-dieu-khien 4, thiet-lap 4). **Chưa trang nào gọi "dang-tai"**; chỉ `ngoai-mang.ts` gọi `"mat-mang-chua-nap"`.
  - Lệch nhỏ: hàm gán `data-khuon` bằng tên khuôn, còn CSS chỉ khai `"so"` và `"vien"`.
- Trang chủ (`home.ts:806, 871, 904, 930`) và Đơn hàng (`orders.ts:23, 169, 183, 197`) bật/tắt `#loading.hidden` trên khung xương có sẵn trong HTML.
- Nhiều trang khác chỉ hiện chữ "Đang tải…".

## 8. Bài kiểm liên quan
- **`src/goi-trang-nhe.test.ts`**
  - Lấy danh sách trang từ đoạn lệnh có chữ `"esbuild web/login.ts"` (dòng 15).
  - Dựng lại từng gói bằng `buildSync` với bundle, esm, minify, **không splitting**, mỗi trang một gói (31–39).
  - Chặn changelog: chỉ `web/help.ts` được kéo `src/shared/changelog.ts` (46); cấm nhập thẳng `app-info`/`changelog` (60).
  - `TRAN_ORDERS = 101_719` (dòng 29; nới ngày 29/10, đo được 101.619).
  - Lệnh trang phải có 2 `--define` (67).
- **`src/cau-hinh-toc-do.test.ts`**: JSON đọc được; `placement {mode:"smart"}`; `run_worker_first` deepEqual `["/api/*","/giao-dien.css","/__scheduled"]` (25f127d1 vừa thêm `/__scheduled`); không placement theo vùng.
- **`src/shared/tro-ly-cau-truc.test.ts:156`**: `build:web` phải khớp `/^node scripts\/sinh-so-do-trang\.mjs && BUILD_ID=\$\(date [^;&]*\) && esbuild /`.
- **`tests/e2e/pwa.mjs`**
  - manifest, icon, `theme_color == --c-status-bar`.
  - Phông: đúng 17 tệp; BVP phải nằm trong `PRECACHE`, phông tùy chọn không được.
  - `/sw.js` phải `no-store` và có mã bản dựng 14 chữ số.
  - Mọi trang trong `PAGES ∪ PRECACHE` trả 200 và qua `isCacheable`.
  - `NEEDLES` cho mọi trang (94–104), trong đó có chuỗi liền `'<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/giao-dien.css">'`.
  - **Dòng 116 đọc `/js/orders.js` để tìm chữ thương hiệu do shell dựng.**
  - Địa chỉ lạ phải trả 404 HTML có vỏ.
- **`src/giao-dien-the-link.test.ts`**: cùng chuỗi link liền ở mọi HTML.
- **`src/sw-ngoai-mang.test.ts`**: hành vi SW khi mất mạng (dòng 59 lấy `/js/xe.js`).
- **`src/muc-chup-bu.test.ts:37`**: `PRECACHE` phải có `/chup-bu` và `/js/chup-bu.js`.
- **`scripts/chay-test.mjs`**: bước 0 chạy `ghiTatCa()` của bộ sinh (đỏ nếu lỗi hoặc tệp sinh đổi); bước 1 chạy `src/**/*.test.ts` song song; bước 2 chạy riêng bài đo giờ của hook.
- **`src/release-lib.test.ts`**: giả lập lệnh `npm run build:web`.

## 9. Đo tốc độ
- `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/do-toc-do.mjs` dùng Chrome headless qua CDP.
- Điều kiện: 4G chậm (1,6 Mbit/s xuống, 750 kbit/s lên, trễ 150 ms; dòng 43), CPU chậm 4×, khổ **390×844** cho phần mở trang (108).
- Mỗi trang đo lượt LẠNH và NÓNG: TTFB, FCP, LCP, DCL, load, "khung xong", "nội dung xong" (yên 700 ms), CLS, TBT, có khung xương / "Đang tải", số byte theo loại, số lời gọi API.
- Chuyển trang đo ở 390 (thanh tab) và 1040×800 (thanh bên), kèm phản hồi chạm (149–177).
- Bộ dò khung xương nhận: `[class*=skeleton], [class*=khung-xuong], [aria-busy=true]`.
- Cờ: `--bo`, `--trang`, `--them`, `--chi-chuyen`, `--lap-chuyen`, `--hau-to`. Chưa có `--kho`.
- Kết quả ghi `so-lieu/toc-do[-tung-trang][hau-to].json`.
- `so-toc-do.mjs` so `2026-10-27…/so-lieu/toc-do.json` với số mới theo ngưỡng 5%, CLS ≤ 0,1, chuyển trang ≤ 101 ms.
- Bảng K trong `SO-SANH-TRUOC-SAU.md` mục 1:

| Chỉ số (390×844) | 27/10 | Mới |
|---|---:|---:|
| Trung vị FCP lạnh (45 trang) | 964 ms | 984 ms |
| Trung vị khung xong lạnh | 949 ms | 962 ms |
| Trang > 5% FCP | — | 4/45 |
| CLS `/thiet-lap` | — | 0,088 |
| CLS 404 | — | 0,051 |
| Chuyển 390 → `/orders` | 77 | 69/69/81 |
| Chuyển 390 → `/order-form` | 101 | 77/97/73 |
| Chuyển 1040 → `/orders` | 45 | 32/45/72 |
| Chuyển 1040 → `/` | 49 | 60/56/80 |
| Chạm | 10–13 ms | 10–19 ms |
| Nóng FCP | 36–120 ms | 36–120 ms |

  Kết luận ghi trong tài liệu: "nhanh lên thật" thuộc đợt 0b.

## 10. `wrangler.jsonc` và triển khai
- `compatibility_date: "2026-09-01"`.
- `assets: { directory:"./public", binding:"ASSETS", run_worker_first:["/api/*","/giao-dien.css","/__scheduled"], not_found_handling:"404-page" }` (dòng 29).
- `public/_headers` có CSP `script-src 'self'` và **chỉ đặt Cache-Control cho `/sw.js: no-store`**. JS và CSS dùng mặc định của Workers Assets (ETag hỏi lại; tôi chưa đo header thật). `/giao-dien.css` do Worker trả, có ETag và `no-cache` (`src/modules/giao-dien/index.ts:17`).
- `scripts/trien-khai.mjs` (15 dòng) gọi `trienKhai()` trong `scripts/release-lib.mjs:345`:
  - main sạch và bằng origin/main → `wrangler whoami` → cổng mốc tin đổi
  - cổng số phiên bản trước deploy bằng `scripts/kiem-phien-ban.mjs` (so `CHANGELOG[0].version` với `GET /api/auth/config`; mã 0 đạt, 1 chưa đạt, 2 không chạy được)
  - `npm test`, `typecheck`, `build:web` (dòng 477) → e2e → migration → `CI=1 npx wrangler deploy` → audit → cổng phiên bản sau deploy.
- Bước A.0 (`HANDOFF-N1.md:827`, CHANGE-GUIDE công thức t) là thêm mục nhật ký thay đổi trước mỗi lần deploy.

## 5 rủi ro kỹ thuật khi làm Đ1–Đ6
1. **Tên chunk băm và các danh sách tĩnh.**
   - `PRECACHE` chép tay; bài `sw-policy.test.ts:122` và `muc-chup-bu.test.ts:37` suy tên từ `build:web` bằng regex.
   - `STATIC_FILE` không nhận `js/chunks/`. Nếu để chunk phẳng (`js/chunk-HASH.js`) thì regex hiện có đã nhận.
   - Cần một tệp kê sinh lúc build. Nhưng `sw-policy.ts` lại nhập lúc test, khi `public/js` chưa có vì bị gitignore.
2. **Bài kiểm buộc chặt hình dạng lệnh build và gói.**
   - `goi-trang-nhe.test.ts` dựng từng trang **không splitting**: sau Đ1 nó vẫn đo ≈101 KB, nên phải đổi sang đo phần riêng qua `metafile` với splitting.
   - Regex `tro-ly-cau-truc.test.ts:156` và cách tìm chuỗi `"esbuild web/login.ts"` sẽ gãy nếu chuyển build sang một script riêng.
   - `pwa.mjs:116` tìm chữ thương hiệu trong `/js/orders.js`; sau tách, chữ đó nằm ở chunk chung.
3. **Cache khi đổi tên gói và lệch bản dựng.**
   - Mỗi build đổi `CACHE_NAME` và xoá cache cũ. Nhưng một trang HTML cũ còn trong cache (hoặc đang mở) sẽ trỏ tới chunk băm cũ.
   - Nếu chunk cũ chưa có trong cache thì `not_found_handling:"404-page"` trả `404.html` với status 404, `import` hỏng và trang trắng.
   - Build không dọn `public/js` (đã thấy `danh-muc-giay-to.js` mồ côi), nên chunk cũ sẽ tích lại và bị deploy kèm.
   - Đ3 nạp sẵn theo vai qua postMessage phải chống chạy chồng với `install`/`activate` và với `skipWaiting`.
4. **Chèn thẻ vào `<head>` của 48 tệp viết tay.**
   - `NEEDLES` của `pwa.mjs` và `giao-dien-the-link.test.ts` đòi chuỗi `app.css` và `giao-dien.css` **liền nhau**, nên `modulepreload`/`preload` phải đặt ngoài cặp này.
   - `sinh-so-do-trang.mjs` dò `<title>` và `<script type="module" src="/js/X.js">` bằng regex.
   - Preload phông BVP sẽ phí khi công ty chọn phông khác qua `giao-dien.css`. Cũng chưa chốt có cần 700 cho `--fw-home-stat` không.
   - CSP `script-src 'self'`: `<script type="speculationrules">` nội tuyến **có thể bị CSP chặn** nếu không có hash/nonce hoặc tệp ngoài (chưa rõ trình duyệt xử lý thế nào với CSP này; cần thử). Chặn được thì Đ4 không chạy và không báo lỗi.
5. **Khung xương tĩnh, trang tự vẽ và DOM giả.**
   - `initShell` dựng `#topbar`, thanh bên, thanh tab bằng JS và có nhánh "khung tạm" từ bản nhớ. Khung xương Đ6 cùng lưới phải khớp `has-sidebar`/`has-tabbar`, vốn chỉ gắn sau JS, nên dễ gây CLS.
   - Trang cũng phải thay hoặc gỡ khung xương khi lỗi hay mất mạng (`veThanNgoaiMang`).
   - `scripts/chup-muc-giao-dien.mjs` tự đóng gói `web/account.ts` (esm, không splitting), bọc thành hàm, chạy trên DOM giả "chỉ đủ" (`createElement`, `append`, `querySelectorAll` đơn giản). Nếu shell thêm `navigator.serviceWorker.controller.postMessage`, `document.startViewTransition`, đọc khung xương tĩnh hay bộ chọn phức tạp, DOM giả sẽ vỡ. Danh sách mô-đun thật `THAT` gồm những gì thì chưa rõ.
   - Bộ dò khung xương của `do-toc-do.mjs` chỉ nhận lớp chứa `skeleton`, `khung-xuong` hoặc `aria-busy=true`. Lớp mới tên `.xuong` hay `.skel-*` sẽ không được đếm, trừ khi có `aria-busy`.