# App iPhone (PWA) — "Island Booking System"

> Tên app đổi từ "Tour Đảo Booking" (tên ngắn "Tour Đảo") sang "Island Booking System" (tên ngắn "Island Booking") theo chủ dự án 2026-09-24. App đã cài trên iPhone giữ tên cũ dưới biểu tượng tới khi gỡ và cài lại.

Thiết kế: `docs/superpowers/specs/2026-09-19-iphone-pwa-design.md`. Kế hoạch thi công: `docs/superpowers/plans/2026-09-19-iphone-pwa.md`. Mockup: https://claude.ai/artifact/UJhmHqivTKaGVZr3m98Aoc

## Cách hoạt động

- `public/manifest.webmanifest` + `public/icons/*` + thẻ meta iOS trong mọi trang HTML (mọi trang trong `PAGES` của `src/shared/sw-policy.ts`; test đối chiếu `PAGES` với `public/*.html`) → Safari cho "Thêm vào Màn hình chính", app chạy toàn màn hình.
- `public/sw.js` (sinh từ `web/sw/sw.ts` bởi `npm run build:web`, gitignored): khung app (HTML/CSS/JS/icon) mở từ cache rồi tải bản mới ngầm. **`/api/*` không bao giờ qua cache.** Chính sách ở `src/shared/sw-policy.ts` (có test). Đăng ký từ `web/pwa.ts` (gọi trong `initShell()` và `login.ts`).
- **Tệp màu giao diện công ty (ADR-0102):** `/giao-dien.css` (do Worker dựng từ D1, ngoài `/api`) nằm trong `PRECACHE` và cùng cách "dùng ngay bản có sẵn, làm mới ở nền" như các tệp khung — trang không chờ mạng để vẽ; Toàn quyền đổi màu thì máy mình thấy ở lần chuyển trang kế tiếp (trang tự làm mới bản đệm khi bấm "Áp dụng"), máy khác sau một đến hai lần chuyển trang (bản đệm cũ được phục vụ trước, cập nhật ở nền). Đường cũ `/api/giao-dien.css` không bao giờ vào cache.
- **Mã phiên bản cache tự động:** `npm run build:web` chèn mã bản dựng (`--define:__BUILD_ID__`, dạng `AAAAMMDDGGPPSS`) vào `sw.js`, nên **mỗi lần build/deploy** service worker mới xoá cache cũ và khung không chạy lệch API sau deploy; không ai phải nhớ tăng tay (đã chứng minh qua hai lần "deploy" giả lập: `docs/evidence/2026-09-19-pwa/nang-cap-sw.json`). Khung stale-while-revalidate vẫn có thể chạy bản cũ ở đúng lần mở đầu tiên sau deploy, trước khi trình duyệt nhận service worker mới. **Tối ưu tải (2026-09-27):** lúc cài, service worker nạp sẵn MỌI trang và MỌI tệp JS (`PRECACHE`, có test đối chiếu `build:web`) bằng `cache: "reload"` (bỏ qua bộ nhớ HTTP để bản dựng mới không nhận nhầm tệp của bản cũ); lần hỏi lại ở nền của stale-while-revalidate là GET có điều kiện, thường nhận `304` không thân (đã đo trên production). Phần chờ còn lại là dữ liệu: bốn trang Đơn hàng, Trang chủ, Chi tiết đơn, Lập/Sửa đơn gửi lời gọi dữ liệu NGAY khi mã trang chạy, song song với `/api/auth/me` (`web/goi-som.ts`), vẫn chỉ dùng dữ liệu sau khi `initShell()` xong. Route chỉ dành cho một số vai (số liệu Trang chủ — `seesAll`; danh mục lập đơn — `canCreate`; khối "Cần xem lại" — quản trị) chỉ được gọi sớm khi bản nhớ khung nói máy này thuộc vai đó; chưa có bản nhớ thì gọi sau `initShell()` như cũ (tài khoản chỉ Đối tác không bao giờ gọi `/api/orders/dashboard` — `trang-chu-smoke.mjs` I-1). Dữ liệu `/api/*` vẫn không bao giờ vào cache. **Bản nhớ khung (ADR-0035 điều 3, chủ chọn Q1 = A):** `web/khung-nho.ts` lưu ở `localStorage` khoá `td-khung-v1` đúng 5 trường (chữ cái đầu tên + 4 cờ menu: quản trị / thấy mọi đơn / văn phòng / được lập đơn; test khoá danh sách trường) để `initShell()` vẽ thanh công việc, menu bên và thanh tab NGAY (đánh dấu `data-khung-tam`); `/api/auth/me` về thì gỡ khung tạm, vẽ khung thật trong cùng lượt chạy và ghi đè bản nhớ. Đăng xuất (`logout()`), hết phiên (`goLogin()`) và mở màn Đăng nhập (`web/login.ts`) đều xoá bản nhớ — máy dùng chung: người sau không thấy khung của người trước (kịch bản `trang-chu-smoke.mjs` I-1 bắt được khi chỉ xoá ở hai chỗ đầu). Trang chủ dùng cờ quản trị của bản nhớ để gửi sớm hai lời gọi của khối "Cần xem lại" (vẫn chỉ dùng khi quyền thật đồng ý). **Chuyển trang mượt (`@view-transition`) đã thử và BỎ (2026-09-27):** trang tự chuyển hướng lúc mở (đăng nhập, Trang chủ của Đối tác) làm Chrome in lỗi đỏ "Transition was aborted… ViewTransition opt-in disabled" do chính trình duyệt ghi (mã app không chặn được) → `v1-dang-nhap.mjs` bước f, g đỏ. **`/sw.js` phải là `Cache-Control: no-store`, KHÔNG phải `no-cache`** (`public/_headers`, `pwa.mjs` kiểm): `no-cache` vẫn cho trình duyệt giữ bản cũ và gửi `If-None-Match`, nên một ETag cũ (như `wrangler dev`, băm file một lần lúc khởi động) khiến nó nhận `304` và không bao giờ thấy service worker mới. Đã đo: kịch bản "build lại rồi cập nhật" trên một máy chủ **không đạt** với `no-cache` và **đạt** với `no-store` (`docs/evidence/2026-09-19-pwa/nang-cap-sw-mot-may-chu.txt`). Vì cách tắt khẩn cấp cũng đi qua `/sw.js`, đường này không được phép kẹt; mục "Sau khi deploy" bên dưới chỉ để xác nhận trên môi trường thật. **Tắt khẩn cấp** nếu một khung hỏng bị cache trên máy nhân viên: thay toàn bộ `web/sw/sw.ts` bằng bốn dòng `/// <reference lib="webworker" />`, `declare const self: ServiceWorkerGlobalScope;`, `void self.registration.unregister(); void caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k))));`, `export {};` rồi deploy (build sinh lại `public/sw.js`). Thiếu `export {};` thì tệp là *script* và `npm run typecheck` đỏ (`Cannot redeclare block-scoped variable 'self'`); trong đường khẩn cấp này `tests/e2e/pwa.mjs` cũng đỏ vì `sw.js` không còn tên cache và mã bản dựng. Cả hai không cản việc build và deploy (QA2 độc lập Q2-02: đoạn cũ thiếu `export {}` đã được kiểm là không biên dịch). Được vì `/sw.js` luôn `no-store`: trình duyệt nhận bản này ở lần mở kế tiếp và tự gỡ service worker cùng cache.
- Giao diện ≤640px: thanh đầu trang (nút "‹" ở trang con) + thanh tab dưới đáy do `web/shell.ts` dựng; cấu hình theo trang bằng `<body data-title data-back data-tabbar>`; `setBarTitle()` đổi tiêu đề sau khi tải (mã đơn, "Sửa đơn …"). SALES 4 tab (thêm "Trang chủ" từ Trang chủ mới), ADMIN 6 tab, kế toán 3 tab (không có "Tạo đơn"), tài khoản chỉ-`FIELD` 1 tab ("Tôi") — `THANH_TAB` của bảng mục `src/shared/muc-giao-dien.ts` (`web/shell.ts` vẽ); form lập đơn ẩn thanh tab. Máy tính (>640px) giữ nguyên thanh điều hướng cũ.
- Mất mạng: khung vẫn mở từ cache nhưng không có dữ liệu; `initShell()` hiện "Không có kết nối mạng…" ở `#error`, dựng thanh tab cơ bản (4 tab: Trang chủ, Đơn hàng, Tạo đơn, Tôi — vì chưa biết vai; `KHUNG_MAT_MANG` ở `src/shared/muc-giao-dien.ts`) để còn điều hướng, rồi dừng script trang (giữ lời gọi treo như `goLogin()`).
- **Bất biến `/api/*` không qua cache** giữ bằng hai lớp độc lập (`src/shared/sw-policy.ts`): danh sách cho phép đóng theo mặc định (chỉ các trang đúng `PAGES` và tệp tĩnh đúng mẫu mới vào cache; mọi đường dẫn khác, kể cả `//api/…`, đi thẳng ra mạng) và lớp chắn theo `content-type` (chỉ HTML/CSS/JS/PNG/manifest/font woff2; JSON không bao giờ được lưu). Lý do: router của Worker khớp đường dẫn bằng `split("/").filter(Boolean)` nên `//api/…` vẫn chạm API thật, và QA2 độc lập lần 1 (Q2-01) đã đo được bản dùng bộ lọc theo tiền tố `/api` lưu phản hồi phiên vào cache.

## Chưa làm (cố ý)

- Hướng dẫn cài cho nhân viên: chưa viết. App đã chạy trên `booking.tourdao.vn` từ 2026-09-19 (xem `docs/SPEC-tourdao-sales.md` §3) nên nhân viên cài được ngay từ địa chỉ này. App gắn với origin: máy nào từng cài từ `workers.dev` (nay đã tắt) thì phải xoá icon cũ, cài lại và đăng nhập lại.
- Chế độ offline thật (xem/lập đơn khi không có mạng).
- Logo trong giao diện đọc từ `company_profile.logo_url` (SPEC §2.4-2, M5): hiện đầu trang và trang đăng nhập dùng ảnh tĩnh `public/icons/logo-96.png` và `icon-192.png` (tạm, đã ghi nợ ở `docs/AUDIT-PWA-IPHONE.md` RS12); icon PWA vẫn phải là file tĩnh.
- Phiên vẫn 7 ngày cố định → nhân viên đăng nhập lại khoảng mỗi tuần; iOS còn tách cookie giữa Safari và app đã cài nên phải đăng nhập lại một lần khi cài.
- Trang admin (`/catalog`, `/staff`, `/audit`) trên điện thoại chỉ có khung chung mới; bảng bên trong vẫn cuộn ngang.

## Đã kiểm gì

Rà soát theo Hiến pháp/ràng buộc của tourdaovn: `docs/AUDIT-PWA-IPHONE.md`; bằng chứng (kết quả typecheck/test/e2e gắn mã băm, số đo, axe, nâng cấp service worker, ảnh chụp, kịch bản): `docs/evidence/2026-09-19-pwa/`. Quy tắc giữ khi sửa tiếp: **giá trị giao diện mới đi vào token ở `:root` của `app.css`, không viết cứng trong luật** (`pwa.mjs` quét khối PWA: màu hex, `rgb()/hsl()`, `px` trừ `1px`, `rem/em`; **không** bắt được tên màu như `red`, đơn vị `%`, `vw/vh/ch` hay `color-mix()`, nên nhớ tự kiểm khi viết CSS mới); tên hiển thị và màu theme chỉ có một nguồn (tên: manifest; màu `theme_color`/thẻ `theme-color`: token `--c-status-bar` — màu thanh trạng thái iPhone, hiện trắng; KHÔNG phải `--c-primary`), các bản sao phải khớp (`pwa.mjs` đối chiếu).

Tự động: `npm run typecheck`, `npm test` (gồm `sw-policy`), `npm run test:e2e` (kịch bản `pwa.mjs`: manifest, icon không alpha, `/sw.js` không cache, meta iOS trên mọi trang của `PAGES`, API `no-store`). Trên Chrome headless khổ 390×844 với `wrangler dev`: service worker đăng ký và điều khiển trang, cache không chứa mục nào của `/api`, khung mở được khi offline, tab và thanh đầu trang đúng cho nhân viên và admin, bản máy tính không đổi.

**Thử trên iPhone thật (2026-09-19):** chủ dự án đã thử và nhận xét bằng lời "nhìn ổn". **Chưa có kết quả từng mục** (không ảnh, không ghi chú, không ghi thử qua địa chỉ nào), nên danh sách dưới đây chưa được đánh dấu mục nào. Riêng mục 1 (nút "Lưu đơn nháp" và bàn phím) là mục rủi ro nhất: nếu chưa thử đúng thao tác đó thì vẫn còn mở. Vùng an toàn `env(safe-area-inset-*)` luôn bằng 0 ngoài thiết bị có tai thỏ nên Chrome headless không kiểm được.

## Danh sách kiểm trên iPhone thật

Xếp theo rủi ro: mục 1 là thứ Chrome headless không kiểm được và dễ hỏng nhất.

1. **Bàn phím:** mở app từ icon → `/order-form` → bấm vào ô "Tên khách" cho bàn phím hiện lên: nút "Lưu đơn nháp" (đang `position: sticky; bottom: 0`) còn thấy và bấm được không? iOS thu nhỏ vùng nhìn thấy mà không đổi khung bố cục nên nút có thể nằm sau bàn phím. Nếu bị che: đóng bàn phím rồi bấm được là chấp nhận được; nếu vẫn kẹt thì báo lại để đổi cách đặt nút.
2. Safari mở link → Chia sẻ → Thêm vào Màn hình chính: tên dưới icon là "Island Booking" (máy đã cài từ trước 24/9 còn "Tour Đảo" tới khi gỡ cài lại), icon là buồm vàng + thuyền xanh trên nền nâu đỏ, không có góc đen.
3. Mở từ icon: toàn màn hình, thanh trạng thái nền trắng (`theme_color` = `--c-status-bar`, `apple-mobile-web-app-status-bar-style` = `default`), chữ giờ/pin đọc được (kể cả ở màn hình đăng nhập).
4. Đăng nhập → thanh tab dưới đáy không đè lên thanh home; vào một đơn → nút "‹" quay lại danh sách; vuốt từ mép trái cũng quay lại.
5. Ô SĐT và ô tiền hiện bàn phím số.
6. Tắt hẳn app rồi mở lại: màn hình hiện gần như tức thì (khung từ cache), dữ liệu tải sau.
7. Tab Tôi → Đăng xuất về màn hình đăng nhập.

Bổ sung 27/10/2026 từ đánh giá UX tổng thể (`docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/LO-TRINH.md` mục 4; Chrome headless không đo được các mục này). Ghi "đạt / không" + ảnh vào `docs/evidence/<ngày>-iphone/`.

8. **Tốc độ cảm nhận:** tắt hẳn app, bật rồi tắt chế độ máy bay, mở lại từ icon: Trang chủ hiện khung trong ≤ 1 giây? Bấm tab "Đơn" rồi tab "Tôi": có chớp trắng giữa hai trang không?
9. **Vùng chạm bằng ngón cái:** ở Đơn hàng bấm được nút "Lọc" và chip "Xoá lọc" ngay lần đầu; ở Chi tiết đơn, nút "Xác nhận đơn" ở chân dính không bị thanh home đè.
10. **Bảng trượt:** mở "Sửa thông tin chuyến", kéo xuống để đóng; bàn phím hiện lên thì nút "Lưu" của bảng trượt còn thấy.
11. **Mất mạng giữa chừng:** đang điền Tạo đơn, bật chế độ máy bay, bấm "Lưu, chờ xác nhận": câu báo nói gì; dữ liệu đã gõ còn không sau khi có mạng lại.
12. **Không có quyền / không có trang:** dán địa chỉ `/audit` (tài khoản Bán hàng) và `/khong-co-trang-nay`: có về được trang đầu bằng một chạm không.
13. **Thanh dính đáy chồng nhau:** ở Chuyến của tôi (tài xế) và Hỗ trợ (ô trả lời) chỉ có một thanh dính dưới, không thanh nào đè thanh tab.
14. **Chữ và số:** ở Sổ công nợ và Hoa hồng, số tiền có dấu chấm ngăn nghìn, canh phải, không bị cắt "…" ở 390.
15. **Trang Hướng dẫn:** cuộn tới cuối mất bao lâu; có tìm được mục cần trong 10 giây không.

## Cách thử iPhone bằng D1 tạm (không đụng dữ liệu thật)

Chạy `node scripts/dev-iphone.mjs` từ thư mục gốc: dựng D1 **tạm** (mất khi thoát, không đụng dữ liệu thật), tạo hai tài khoản thử (admin, nhân viên) và in địa chỉ cùng SĐT/PIN.
- **Cùng Wi-Fi, không cần gì thêm:** mở địa chỉ `http://<IP-LAN>:8787` bằng Safari trên iPhone. Chưa phải HTTPS nên **không có service worker**; đủ để thử mục 1–5 của danh sách kiểm ở trên (bàn phím và nút Lưu, icon, thanh trạng thái, tai thỏ và thanh home, nút quay lại, bàn phím số). Đã kiểm trên máy: đăng nhập qua IP LAN chạy, cookie phiên không có cờ `Secure` nên dùng được trên `http`.
- **Có service worker (HTTPS tạm):** `node scripts/dev-iphone.mjs --tunnel` rồi mở địa chỉ `trycloudflare.com` mà wrangler in ra (dùng `wrangler dev --tunnel`, theo tài liệu của wrangler; **tôi chưa tự chạy thử cờ này** vì nó mở địa chỉ công khai ra Internet cho tới khi bạn thoát). Thử thêm mục 6 (mở lại tức thì) và offline.
- Thoát bằng Ctrl+C. Khi xong, ghi kết quả từng mục vào `docs/evidence/2026-09-19-pwa/` (ảnh chụp màn hình iPhone là bằng chứng E2).

## Sau khi deploy (xác nhận một lần trên môi trường thật; cấu trúc `no-store` đã chặn bẫy 304 nên đây chỉ là xác nhận)

**Đã làm lần deploy đầu (2026-09-19, `docs/evidence/2026-09-19-pwa/sau-deploy.txt`): điểm 2 và 3 đạt; điểm 1 đạt phần header (`/sw.js` là `no-store`), còn phần "tên cache đổi sau deploy có đổi mã" CHƯA quan sát** vì mới có một bản deploy: làm ở lần deploy tiếp theo. Mỗi lần deploy sau, chạy lại `kich-ban/kiem-tra-san-xuat.mjs`.

1. `curl -sI https://<địa-chỉ>/sw.js` phải có `Cache-Control: no-store`. Sau một lần deploy có đổi mã, mở app hai lần rồi chạy `caches.keys()`: tên cache phải đổi sang mã bản dựng mới. Nếu vẫn tên cũ thì trình duyệt không nhận service worker mới: dừng và báo.
2. Mở app, xem `Application → Service Workers` (Safari: Develop → Service Workers) hoặc chạy `caches.keys()`: chỉ một cache, tên `td-shell-<mã bản dựng>`, và không có mục nào của `/api`.
3. Kiểm `/manifest.webmanifest` trả `application/manifest+json` và ba icon trả `image/png`.

## Dựng lại icon

Nguồn: `Logo-Cty-Tour-Dao.png` 500×500 (Sanity của tourdaovn, project `pgedy374`): https://cdn.sanity.io/images/pgedy374/production/ee4443a89ddd67a2187a8c6b34d37f6f31678fe3-500x500.png
iOS tô đen vùng trong suốt và tự bo góc nên icon là hình vuông đặc, không alpha. Cắt buồm + thuyền (bỏ chữ "tourdao.vn", quá nhỏ ở cỡ icon), đặt giữa nền `#993333` (màu vòng tròn của logo); `PNG24:` ép RGB không alpha:

    magick logo500.png -crop 300x280+100+60 +repage -resize 348x mark.png
    magick -size 512x512 xc:"#993333" mark.png -gravity center -composite -alpha off PNG24:public/icons/icon-512.png
    magick public/icons/icon-512.png -resize 192x192 PNG24:public/icons/icon-192.png
    magick public/icons/icon-512.png -resize 180x180 PNG24:public/icons/apple-touch-icon.png
    magick public/icons/icon-512.png -resize 96x96 PNG24:public/icons/logo-96.png

## Đổi tên hiển thị

Tên nằm trong: `public/manifest.webmanifest` (`name`, `short_name`), `<title>` và `apple-mobile-web-app-title` của MỌI trang trong `PAGES` (gồm `/orders`, `/parties`, `/locations`, `/feedback`, `/home`, `/help`), `web/shell.ts` (brand), `public/login.html` (chỉ tiêu đề tab; `<h1>` là tên thương hiệu tĩnh "Tour Đảo Booking"), `tests/e2e/pwa.mjs`. Không đổi tên Worker/D1 `tourdao-sales`.
