# App iPhone (PWA) — "Tour Đảo Desk"

Thiết kế: `docs/superpowers/specs/2026-09-19-iphone-pwa-design.md`. Kế hoạch thi công: `docs/superpowers/plans/2026-09-19-iphone-pwa.md`. Mockup: https://claude.ai/artifact/UJhmHqivTKaGVZr3m98Aoc

## Cách hoạt động

- `public/manifest.webmanifest` + `public/icons/*` + thẻ meta iOS trong 8 trang HTML → Safari cho "Thêm vào Màn hình chính", app chạy toàn màn hình.
- `public/sw.js` (sinh từ `web/sw/sw.ts` bởi `npm run build:web`, gitignored): khung app (HTML/CSS/JS/icon) mở từ cache rồi tải bản mới ngầm. **`/api/*` không bao giờ qua cache.** Chính sách ở `src/shared/sw-policy.ts` (có test). Đăng ký từ `web/pwa.ts` (gọi trong `initShell()` và `login.ts`).
- Sau mỗi lần deploy, lần mở đầu vẫn chạy khung cũ, lần sau là khung mới. **Nếu một lần deploy đổi API không tương thích, tăng `CACHE_VERSION` trong `src/shared/sw-policy.ts` ngay trong lần deploy đó** (cache cũ bị xoá, khung phải tải lại). **Tắt khẩn cấp** nếu một khung hỏng bị cache trên máy nhân viên: thay toàn bộ `web/sw/sw.ts` bằng `declare const self: ServiceWorkerGlobalScope; void self.registration.unregister(); void caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k))));` rồi deploy (build sinh lại `public/sw.js`). Được vì `/sw.js` luôn `no-cache`: trình duyệt nhận bản này ở lần mở kế tiếp và tự gỡ service worker cùng cache.
- Giao diện ≤640px: thanh đầu trang (nút "‹" ở trang con) + thanh tab dưới đáy do `web/shell.ts` dựng; cấu hình theo trang bằng `<body data-title data-back data-tabbar>`; `setBarTitle()` đổi tiêu đề sau khi tải (mã đơn, "Sửa đơn …"). Nhân viên 3 tab, admin 5 tab; form lập đơn ẩn thanh tab. Máy tính (>640px) giữ nguyên thanh điều hướng cũ.
- Mất mạng: khung vẫn mở từ cache nhưng không có dữ liệu; `initShell()` hiện "Không có kết nối mạng…" ở `#error` rồi dừng script trang (giữ lời gọi treo như `goLogin()`).

## Chưa làm (cố ý)

- Hướng dẫn cài cho nhân viên: chờ chốt tên miền (`sales.tourdao.vn`). App gắn với origin: đổi tên miền thì phải cài và đăng nhập lại.
- Chế độ offline thật (xem/lập đơn khi không có mạng).
- Phiên vẫn 7 ngày cố định → nhân viên đăng nhập lại khoảng mỗi tuần; iOS còn tách cookie giữa Safari và app đã cài nên phải đăng nhập lại một lần khi cài.
- Trang admin (`/catalog`, `/staff`, `/audit`) trên điện thoại chỉ có khung chung mới; bảng bên trong vẫn cuộn ngang.

## Đã kiểm gì

Rà soát theo Hiến pháp/ràng buộc của tourdaovn: `docs/AUDIT-PWA-IPHONE.md`; bằng chứng (số đo, axe, ảnh chụp, kịch bản): `docs/evidence/2026-09-19-pwa/`. Quy tắc giữ khi sửa tiếp: **giá trị giao diện mới đi vào token ở `:root` của `app.css`, không viết cứng trong luật** (`pwa.mjs` quét khối PWA); tên hiển thị và màu theme chỉ có một nguồn (manifest, token `--c-primary`), các bản sao phải khớp (`pwa.mjs` đối chiếu).

Tự động: `npm run typecheck`, `npm test` (gồm `sw-policy`), `npm run test:e2e` (kịch bản `pwa.mjs`: manifest, icon không alpha, `/sw.js` không cache, meta iOS trên 8 trang, API `no-store`). Trên Chrome headless khổ 390×844 với `wrangler dev`: service worker đăng ký và điều khiển trang, cache không chứa mục nào của `/api`, khung mở được khi offline, tab và thanh đầu trang đúng cho nhân viên và admin, bản máy tính không đổi.

**Chưa kiểm trên iPhone thật** (vùng an toàn `env(safe-area-inset-*)` luôn bằng 0 ngoài thiết bị có tai thỏ):

## Danh sách kiểm trên iPhone thật

Xếp theo rủi ro: mục 1 là thứ Chrome headless không kiểm được và dễ hỏng nhất.

1. **Bàn phím:** mở app từ icon → `/order-form` → bấm vào ô "Tên khách" cho bàn phím hiện lên: nút "Lưu đơn nháp" (đang `position: sticky; bottom: 0`) còn thấy và bấm được không? iOS thu nhỏ vùng nhìn thấy mà không đổi khung bố cục nên nút có thể nằm sau bàn phím. Nếu bị che: đóng bàn phím rồi bấm được là chấp nhận được; nếu vẫn kẹt thì báo lại để đổi cách đặt nút.
2. Safari mở link → Chia sẻ → Thêm vào Màn hình chính: tên dưới icon là "Tour Đảo", icon là buồm vàng + thuyền xanh trên nền nâu đỏ, không có góc đen.
3. Mở từ icon: toàn màn hình, thanh trạng thái có nền navy, chữ giờ/pin đọc được (kể cả ở màn hình đăng nhập).
4. Đăng nhập → thanh tab dưới đáy không đè lên thanh home; vào một đơn → nút "‹" quay lại danh sách; vuốt từ mép trái cũng quay lại.
5. Ô SĐT và ô tiền hiện bàn phím số.
6. Tắt hẳn app rồi mở lại: màn hình hiện gần như tức thì (khung từ cache), dữ liệu tải sau.
7. Tab Tôi → Đăng xuất về màn hình đăng nhập.

## Dựng lại icon

Nguồn: `Logo-Cty-Tour-Dao.png` 500×500 (Sanity của tourdaovn, project `pgedy374`): https://cdn.sanity.io/images/pgedy374/production/ee4443a89ddd67a2187a8c6b34d37f6f31678fe3-500x500.png
iOS tô đen vùng trong suốt và tự bo góc nên icon là hình vuông đặc, không alpha. Cắt buồm + thuyền (bỏ chữ "tourdao.vn", quá nhỏ ở cỡ icon), đặt giữa nền `#993333` (màu vòng tròn của logo); `PNG24:` ép RGB không alpha:

    magick logo500.png -crop 300x280+100+60 +repage -resize 348x mark.png
    magick -size 512x512 xc:"#993333" mark.png -gravity center -composite -alpha off PNG24:public/icons/icon-512.png
    magick public/icons/icon-512.png -resize 192x192 PNG24:public/icons/icon-192.png
    magick public/icons/icon-512.png -resize 180x180 PNG24:public/icons/apple-touch-icon.png
    magick public/icons/icon-512.png -resize 96x96 PNG24:public/icons/logo-96.png

## Đổi tên hiển thị

Tên nằm trong: `public/manifest.webmanifest` (`name`, `short_name`), `<title>` và `apple-mobile-web-app-title` của 8 trang, `web/shell.ts` (brand), `public/login.html` (h1), `tests/e2e/pwa.mjs`. Không đổi tên Worker/D1 `tourdao-sales`.
