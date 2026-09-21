# Bằng chứng: bản v1.0 (2026-09-21)

Bằng chứng nghiệm thu của các việc trong kế hoạch `docs/superpowers/plans/2026-09-21-v1-0-thi-cong.md` (đặc tả `docs/superpowers/specs/2026-09-21-v1-0-dang-nhap-xac-nhan-phu-trach-design.md`). Mỗi task ghi thêm một mục vào tệp này. Đo trên `wrangler dev` cục bộ với D1 tạm, bằng Chrome headless — **không phải** iPhone thật, không phải khoá/widget Turnstile thật, không phải Workers Assets thật.

## Task 3 — Màn đăng nhập: thông tin công ty, số phiên bản, widget Turnstile

> **Cập nhật 2026-09-21 (sau rà soát Task 3, nhóm sửa phía web — commit của Task 8 kế tiếp):** `web/login.ts` và `public/app.css` đã đổi (tự phục hồi khi cấu hình lỗi, chữ chờ nạp script, `theme: "light"`, ghi mã lỗi widget); kịch bản `v1-dang-nhap.mjs` thêm bốn bước **l, o, m, n** và một khẳng định ở bước k; số liệu, ảnh và `ket-qua-dang-nhap.json` bên dưới là của lần chạy cuối SAU các sửa này (`dang-nhap-chay-cuoi.txt`, **15 dòng ✓**). Bằng chứng đỏ của các sửa: `dang-nhap-do-truoc-khi-sua-web.txt`. Phần "Mã được đo" ngay dưới là của lần đo đầu (HEAD `fbb2b26`).

**Mã được đo:** HEAD `fbb2b26` (cha `3a66912`; mã `web/login.ts`, `public/login.html`, `public/app.css`, `public/_headers` đúng như trong commit đó — commit kế sau chỉ sửa tài liệu). Số liệu dưới đây và `ket-qua-dang-nhap.json` là của cùng MỘT lần chạy (lần chạy cuối, `dang-nhap-chay-cuoi.txt`). Kịch bản: `kich-ban/v1-dang-nhap.mjs` — chạy từ GỐC repo, cần **mạng** (widget tải script từ `challenges.cloudflare.com`, máy chủ gọi siteverify), chỉ dùng **khoá thử chính thức của Cloudflare** (site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`; luôn đạt, phát token giả `XXXX.DUMMY.TOKEN.XXXX`) — không có khoá thật, không tạo gì trên Cloudflare:

```
npm run build:web && AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs
```

(`axe-core` lấy bằng `npm pack axe-core` **ngoài repo**; `ONLY=a,b` chạy vài bước; `OUT=…` đổi thư mục ghi. Dựa trên `startEnv({ turnstile: true })` của `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`; `startEnv()` không tham số vẫn chạy Turnstile TẮT nên ba `a2-smoke-*.mjs` không đổi.)

### Kết quả (lần chạy cuối: `dang-nhap-chay-cuoi.txt`, **15 dòng ✓, 0 ✗**)

Hai máy chủ nối tiếp: **A** = Turnstile BẬT bằng khoá thử; **B** = Turnstile TẮT (bước f — không giả lập được: máy chủ đang đòi token thì đăng nhập không kèm token luôn 403).

| Bước | Chứng minh gì | Số liệu/quan sát |
|---|---|---|
| a | Khối công ty hiện đủ 6 mục đúng chữ: tên app "Tour Đảo Booking" (h1 + `<title>`), "Phiên bản 1.0 · ngày 21 tháng 9 năm 2026", "CÔNG TY TNHH TOUR ĐẢO", "Địa chỉ: 19 Đường B2, Khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, Tỉnh Khánh Hoà", "Email: Tourdaotravel@gmail.com", "MST: 4201969169" — đối chiếu với chính dòng `company_profile` trong D1 (đúng như dữ liệu, viết hoa như DB) | |
| b | Header CSP của `/login` có `https://challenges.cloudflare.com` ở `script-src`, `frame-src`, `connect-src` (và `script-src` vẫn không `unsafe-inline`); widget hiện, tự đạt; nút khoá tới khi có token (dãy trạng thái nút `[khoá, mở]`, và mỗi lần MỞ ô token đã có giá trị); đăng nhập qua widget, thân yêu cầu mang đúng `turnstileToken` của widget | widget rộng 316 px ở 390 px; token `XXXX.DUMMY.TOKEN.XXXX` |
| c | Sai PIN → lỗi của máy chủ ("Số điện thoại hoặc mã PIN không đúng.") hiện và **còn hiện** khi token mới về; `turnstile.reset` được gọi đúng 1 lần; ô token bị xoá rồi điền lại; nút `[khoá, mở, khoá, mở]` — không có lúc nào mở khi chưa có token; đăng nhập lại đúng được, cả hai lần đều kèm token | |
| d | 403 `turnstile_failed` **thật** (gỡ token khỏi yêu cầu, máy chủ tự trả) và 503 `turnstile_unavailable` (giả lập): chữ của máy chủ hiện **nguyên văn** ở `#error` (đọc từ `src/modules/auth/turnstile.ts`, đối chiếu chữ đặc tả); sau mỗi lần widget reset (đếm 1 rồi 2) và có token mới, nút mở lại; trả `fetch` thật → gửi lại thành công, lỗi cũ được xoá khi gửi | |
| e | API công ty chặn mạng / 500 / 404 / chậm 5 giây → vẫn đăng nhập qua widget, khối công ty ẩn (không rò chữ), dòng phiên bản còn (hằng trong mã); chậm thì khối hiện khi API về. API cấu hình chặn / 500 → không widget, không script/yêu cầu nào tới Cloudflare, nút không kẹt, máy chủ (đang bật Turnstile) từ chối thì chữ của máy chủ hiện; cấu hình chậm 5 giây → nút tự mở sau **3075 ms** (hạn chờ 3 giây), widget dựng khi cấu hình về muộn rồi khoá nút tới khi có token | |
| f | Máy chủ không khoá: `GET /api/auth/config` = `{ turnstileSiteKey: null }`, khung widget ẩn, không script Cloudflare, **0 yêu cầu** tới Cloudflare, đăng nhập bình thường, thân đăng nhập không có `turnstileToken`, sai PIN không phải chờ token | |
| g | Không có vi phạm CSP và không có lỗi console ở mọi trang đã theo dõi (chỉ còn dòng mạng đã biết: `GET /api/auth/me` = 401 khi dò phiên có sẵn, và các lần đăng nhập lỗi cố ý); trang b đã tải `api.js` của Cloudflare thật (bằng chứng không rỗng) | |
| h | axe-core **0 vi phạm ở MỌI mức** (không chỉ critical/serious) ở 390, 375, 320, 1040 (widget đã đạt), 390 ở trạng thái lỗi sai PIN, và 390 không widget (máy chủ B) — 6 trạng thái, `ket-qua-dang-nhap.json` khoá `axe` | axe không nhìn vào bên trong khung widget của Cloudflare (bên thứ ba) |
| i | Vùng chạm ≥ 44 px (nút, ô gõ, liên kết), ô gõ ≥ 16 px, không tràn ngang, widget nằm trọn trong thẻ — ở 390, 375, 320, 1040, 390 lỗi, 390 không widget | widget: 316 px (390, cỡ "flexible"), 311 px (375, "flexible"), 256×147 px (320, rơi về "compact"), 300 px (1040) |
| j | Service worker THẬT (không bypass): sau khi tải lại dưới sự kiểm soát của service worker, `caches` có 20 mục, đều cùng nguồn, **không** mục nào của Cloudflare hay `/api/*`, khung đăng nhập (`/login`, `/js/login.js`) có trong cache | cộng 4 test mới ở `src/shared/sw-policy.test.ts` |
| k | Widget không dựng được — script Cloudflare bị chặn (bằng `Network.setBlockedURLs`), và khoá site sai (cấu hình bị đổi): thông báo tiếng Việt "Chưa tải được bước xác minh người thật. Kiểm tra kết nối mạng rồi bấm “Thử lại”." + nút "Thử lại", nút Đăng nhập khoá (không có nút khoá mà không lời giải thích); bỏ chặn rồi bấm "Thử lại" → widget dựng, lỗi và nút Thử lại biến mất, đăng nhập được; khung giữ chỗ ẩn và KHÔNG còn chữ "Đang tải xác minh…" khi script không tải được | |
| l | **Cấu hình lỗi lúc mở trang khi máy chủ ĐANG đòi token** (giả lập `GET /api/auth/config` = 500 bằng cờ `window.__cfgFail`): nút Đăng nhập vẫn mở, không widget; sau đó đăng nhập → máy chủ trả 403 THẬT (thiếu token) và chữ của máy chủ hiện; trang **hỏi lại cấu hình** (số lần có hạn, rồi DỪNG — không lặp vô hạn, không giữ nút); cấu hình ổn lại → lần 403 kế tiếp lấy lại khoá site, dựng widget, tự đạt (mỗi lần nút MỞ ô token đã có giá trị), đăng nhập thành công kèm token của widget | trước sửa: sau 403 trang không hỏi lại (`siteKey` kẹt `null`) nên 403 mãi |
| o | Cấu hình lỗi ở lần hỏi đầu rồi ổn lại NGAY: lần hỏi lại lúc mở trang (giãn cách 1,5 giây rồi 4 giây, chạy nền) dựng widget mà chưa ai bấm đăng nhập (0 yêu cầu đăng nhập); nút mở ngay sau lần lỗi đầu (không giữ tới hết hạn chờ), rồi khoá tới khi có token: dãy `[khoá, mở, khoá, mở]` | 2 lần hỏi |
| m | Trong lúc chờ nạp script Turnstile (script bị TRỄ 4 giây có kiểm soát): khung giữ chỗ hiện đúng MỘT đoạn `<p role="status">` "Đang tải xác minh…", cao ≥ 60 px, nút Đăng nhập khoá; axe 0 vi phạm, vùng chạm ≥ 44 px, ô gõ ≥ 16 px, không tràn ngang; widget dựng xong → chữ chờ biến mất (0 đoạn `<p>` trong khung) | ảnh `dang-nhap-dang-tai-xac-minh-390.png` |
| n | Widget dựng với **`theme: "light"`** (cùng `language: "vi-vn"`, `size: "flexible"`, khoá site thử); giả lập Cloudflare gọi `error-callback("300030")`: callback vẫn trả `true`, thông báo tiếng Việt "Bước xác minh người thật gặp sự cố…" + nút Thử lại + nút Đăng nhập khoá, và ĐÚNG MỘT `console.warn` mang mã `300030`, không lộ khoá site/secret/token | mã lỗi trước đây bị nuốt vì callback trả `true` |

### Đỏ trước, xanh sau

`dang-nhap-do-truoc-khi-sua.txt`: (1) kịch bản trên mã cũ (HEAD `03db793`) → **10 ✗ / 0 ✓**; (2) mã mới nhưng CSP cũ → `a`, `f` xanh, `b` đỏ (header thiếu Cloudflare), `c` đỏ (trình duyệt chặn script của widget); (3) hai đột biến trên mã mới (bỏ `resetWidget()` ở nhánh lỗi; bỏ điều kiện khoá nút theo token) → `b` và `c` đỏ đúng chỗ. Bước k được thêm SAU lần chạy đỏ đầu tiên (nên không có dòng ✗ tương ứng trong tệp đó; trên mã cũ nó hiển nhiên đỏ vì chưa có widget lẫn nút Thử lại). Test `sw-policy` mới **xanh ngay khi viết** (hành vi đã đúng: chỉ cache cùng nguồn) — đây là bài kiểm mô tả hành vi; đột biến bỏ kiểm nguồn trong `routeFor` làm test "khác nguồn thì pass kể cả khi đường dẫn trông giống tệp của khung app" đỏ, khôi phục thì xanh.

**Nhóm sửa phía web (sau rà soát):** `dang-nhap-do-truoc-khi-sua-web.txt` — chạy `ONLY=k,l,o,m,n` trên mã cũ (`web/login.ts`, `public/app.css` của HEAD `cc13546`): **4 ✗ / 1 ✓** — l đỏ (sau 403 trang không hỏi lại cấu hình), o đỏ (không hỏi lại lúc mở trang, widget không bao giờ hiện), m đỏ (khung chờ trống: chữ `""`), n đỏ (`theme` còn `"auto"`); k xanh vì hành vi cũ đã đúng (chỉ thêm khẳng định). Sau khi sửa: cả kịch bản **15 ✓ / 0 ✗**. Đột biến trên mã mới (hoàn nguyên sau mỗi lần): vòng hỏi lại cấu hình không giới hạn số lần → l ✗ ("hết số lần thử thì dừng": 8 ≠ 5); giữ nút Đăng nhập tới hết vòng hỏi lại (`ready = answered`) → o ✗ (nút không mở ngay sau lần lỗi đầu). Bước l lần chạy đầu vấp hai chỗ của chính kịch bản, đã sửa: đếm "lần MỞ nút đều đã có token" phải chỉ xét đuôi dãy (các lần mở TRƯỚC khi có khoá thì chưa có widget), và các dòng 403 của máy chủ ở trang l là lỗi mạng cố ý. Lần đầu bước n đỏ SAI lý do (móc `window.turnstile` bằng `defineProperty` làm `api.js` báo "Turnstile already has been loaded" và widget không dựng) — kịch bản nay móc bằng sự kiện `load` ở giai đoạn bắt trên `document` (xem "Điều học được").

### Ảnh (`anh/`, 1x)

| Ảnh | Trạng thái |
|---|---|
| `dang-nhap-390.png` | 390×844: widget "Thành công!" (tiếng Việt), khối công ty + phiên bản |
| `dang-nhap-1040.png` | máy tính 1040×800 |
| `dang-nhap-loi-390.png` | sai PIN: alert lỗi, widget đã reset và đạt lại |
| `dang-nhap-turnstile-loi-390.png` | 403 `turnstile_failed` của máy chủ hiện ở `#error` |
| `dang-nhap-khong-widget-390.png` | máy chủ không có khoá: không widget, đăng nhập bình thường |
| `dang-nhap-320.png` | khổ hẹp nhất (iPhone cũ 320 px): widget cỡ "compact" |
| `dang-nhap-khong-tai-duoc-widget-390.png` | script Cloudflare bị chặn: thông báo + nút "Thử lại", nút Đăng nhập khoá, khung giữ chỗ đã thu lại |
| `dang-nhap-dang-tai-xac-minh-390.png` | script Cloudflare đang được nạp (trễ có kiểm soát): khung giữ chỗ có chữ "Đang tải xác minh…", nút Đăng nhập khoá |

**Đọc ảnh thế nào:** dải chữ đỏ trong khung widget ("Chỉ để kiểm tra. Nếu nhìn thấy, hãy báo cáo cho chủ sở hữu trang") do **khoá thử** của Cloudflare tự vẽ, không phải của app — widget thật không có dải này (và cao 65 px thay vì 72 px của khoá thử). Không ảnh nào chụp chủ đề tối (app chỉ có chủ đề sáng, xem "Chưa kiểm").

### Điều học được khi làm (ghi để người sau khỏi vấp)

1. **`id="turnstile"` làm hỏng widget:** phần tử có `id` trở thành thuộc tính `window.<id>`, che `window.turnstile` của Cloudflare; `if (window.turnstile)` đúng khi script chưa tải. Khung widget vì thế có id `turnstile-widget`.
2. **`turnstile.ready()` ném lỗi** ("Remove async/defer from the Turnstile api.js script tag…") khi script nạp kiểu `async`/động. Trang gọi `turnstile.render` sau sự kiện `load` của script, không dùng `ready`.
3. **Khung (iframe) của widget nằm trong shadow root ĐÓNG:** `document.querySelector('… iframe')` không thấy. Kịch bản nhận biết widget qua ô ẩn `cf-turnstile-response` (Cloudflare tự thêm) và khối bọc có kích thước.
4. **Token của khoá thử luôn là `XXXX.DUMMY.TOKEN.XXXX`:** không phân biệt "token mới" bằng giá trị; kịch bản chứng minh reset bằng đếm lời gọi `turnstile.reset`, ô token bị xoá rồi điền lại, và dãy trạng thái nút.
5. **Widget "flexible" rộng tối thiểu 300 px:** ở 375 px lòng thẻ chỉ 295 px nên bớt lề trong thẻ ở khổ ≤ 400 px (`@media` ở `public/app.css`); ở 320 px widget rơi về "compact".
6. Vi phạm CSP KHÔNG đi qua `console.error` mà qua miền `Log` của CDP — `a2-cdp.mjs` nay có thêm `logEntries`, `requests`, `failed` (không đổi hành vi `consoleErrors` nên ba `a2-smoke-*.mjs` giữ nguyên).
7. `style-src`/`img-src` **không** phải nới: widget chạy và không có vi phạm CSP chỉ với `script-src`, `frame-src`, `connect-src` (bước g).
8. **Không định nghĩa sẵn thuộc tính `window.turnstile` trong kịch bản** (để móc `render`): `api.js` thấy nó đã tồn tại là báo "Turnstile already has been loaded" và không dựng widget. Móc bằng `document.addEventListener('load', …, true)` (giai đoạn bắt): `document` nằm TRƯỚC thẻ script trong đường truyền sự kiện `load` nên chạy trước trình nghe của trang, tức trước lần `render` đầu (Window bị loại khỏi đường truyền của sự kiện `load` nên không dùng được).
9. **`error-callback` trả `true` = "đã xử lý" thì Cloudflare KHÔNG ghi mã lỗi ra console** — lần deploy khoá thật đầu tiên mà khoá sai tên miền (mã kiểu `110200`) sẽ chỉ có thông báo chung. Trang nay tự `console.warn("Turnstile báo lỗi, mã:", <mã>)`.
10. **`GET /api/auth/config` chỉ hỏi một lần là bẫy:** lỗi mạng chập chờn lúc mở làm `siteKey` kẹt `null`; khi máy chủ đã bật Turnstile thì MỌI lần đăng nhập 403 mãi mà PWA iPhone không có nút tải lại. Cách chữa: hỏi lại nền vài lần giãn cách (không giữ nút) và sau mỗi 403/503 `turnstile_*` khi chưa có khoá. Vòng hỏi lại chỉ chạy MỘT vòng cùng lúc, có hạn số lần.
11. Trễ script Cloudflare có kiểm soát trong kịch bản: ghi đè bộ đặt `HTMLScriptElement.prototype.src` để hoãn việc gán `src` (thẻ script đã gắn vào `<head>` nhưng chưa có nguồn) — không dùng giả lập mạng chậm vì nó làm chậm cả trang lẫn API.

### Chưa kiểm

- **iPhone thật** (Safari/PWA đã cài lên màn hình chính): bố cục 390/375 chỉ đo bằng Chrome headless giả lập khổ; WebKit có thể xử lý shadow root đóng, `frame-src`, cỡ widget khác.
- **Widget Turnstile với khoá THẬT**: chế độ managed thật (có thể hiện thử thách tương tác — nút khoá tới khi giải xong, chưa thấy trên khoá thử), kiểm tên miền `booking.tourdao.vn` phía Cloudflare, ảnh hưởng của `Referrer-Policy: same-origin` lên khung widget, widget cao 65 px thay vì 72 px, kích thước ở khổ hẹp khi dải thử biến mất.
- **Bàn phím iOS và tự điền mật khẩu** (iCloud Keychain/trình quản lý mật khẩu điền SĐT + PIN): chưa biết widget/nút khoá có tương tác gì với tự điền; ô PIN vẫn `type=password`, `inputmode=numeric`.
- **Chủ đề tối của hệ điều hành:** widget nay dùng `theme: "light"` (app chỉ có giao diện sáng; **lệch có chủ ý so với đặc tả "chủ đề theo hệ thống"** — chủ dự án/rà soát duyệt ở đợt sửa web). Kịch bản chỉ khẳng định tuỳ chọn truyền cho `render`; chưa nhìn widget trên iPhone bật chế độ tối bằng khoá thật.
- **Trình chặn quảng cáo/mạng chặn `challenges.cloudflare.com`** (tiện ích trình duyệt, DNS công ty): đường "Chưa tải được bước xác minh… Thử lại" được thử bằng chặn URL của CDP (bước k), không bằng tiện ích/DNS thật; nhánh `error-callback` của widget được thử bằng cách GỌI callback đã đưa cho `render` (bước n) với mã giả `300030`, không phải lỗi thật của Cloudflare; mã lỗi thật và chữ trên khung widget khi lỗi (Cloudflare tự vẽ) chưa thấy.
- **Production/Workers Assets:** header CSP chỉ xác nhận qua `wrangler dev`; sau deploy phải xem lại header của `/login` (checklist triển khai) — cùng với `GET /api/auth/config` khác `null`.
- **Ký thị giác** của chủ dự án cho màn đăng nhập mới: chưa có.

## Task 10 — Ảnh xác nhận đơn (PNG) + hộp thoại + nối vào luồng lập đơn

**Mã được đo:** các tệp `web/confirmation-image.ts`, `web/confirmation-dialog.ts`, `web/order.ts`, `web/order-form.ts`, `public/order.html`, `public/app.css`, `src/shared/order-confirmation.ts`, `src/shared/text-wrap.ts` đúng như trong hai commit của Task 10 (phần thuần `7d9133b`, phần giao diện commit kế sau). Số liệu dưới đây và `ket-qua-xac-nhan-png.json` là của cùng MỘT lần chạy cuối (`xac-nhan-png-chay-cuoi.txt`). Kịch bản: `kich-ban/v1-xac-nhan-png.mjs` — chạy từ GỐC repo; **không cần mạng ngoài** (danh mục giả do `a2-cdp.mjs` chèn vào D1 tạm, phông tự lưu trữ; Turnstile tắt):

```
npm run build:web && AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-xac-nhan-png.mjs
```

(`ONLY=a,b` chạy vài bước — nhiều bước dùng chung đơn tạo ở bước a nên tự tạo lại khi cần; `OUT=…` đổi thư mục ghi. Kịch bản dùng `esbuild` (đã có ở devDependencies) để đóng gói bộ vẽ + mô hình thuần thành một script nạp vào trang qua CDP — chỉ là công cụ kiểm, không phải mã chạy thật. `Runtime.evaluate` không bị CSP chặn; ngược lại CSP `connect-src` KHÔNG cho `fetch("blob:…")` — đúng ý, app chỉ dùng `<img>`/`<a download>` — nên kịch bản lấy `Blob` thẳng từ nơi tạo `blob:` URL và thử "còn tải được không" bằng thẻ ảnh.)

### Kết quả (**11 dòng ✓, 0 ✗**)

| Bước | Chứng minh gì | Số liệu/quan sát |
|---|---|---|
| a | Tạo đơn BẰNG GIAO DIỆN (dịch vụ theo người có thông tin chuyến + dịch vụ nhập tay) → có lần điều hướng `/order?id=…&moi=1`, hộp thoại tự mở đúng một lần, ảnh hiện, URL đã bỏ `moi` | ảnh tạo qua giao diện: 1440×2628, 68 khối chữ |
| b | PNG: chữ ký `89504e47…`, giải mã được, rộng ≥ 1440, cao khớp bố cục; KHÔNG trống (3–60% điểm ảnh không trắng); dải đầu trang đúng `--c-primary`; MỌI khối chữ có mực đúng màu trong đúng vùng; lề trái/phải và đáy trắng; không hai khối chữ chồng nhau; Tổng cộng/Còn lại nổi bật bằng `--c-accent`; mực nằm trên đỉnh chữ hoa của tiêu đề (dấu Á, Ậ… được vẽ); hai họ phông tập con tiếng Việt đã nạp; ảnh của hộp thoại GIỐNG HỆT từng byte bản dựng từ mô hình kỳ vọng và KHÁC bản dựng với tên phụ trách khác (đối chứng) | |
| c | `<a download="xac-nhan-<mã>.png">` đúng tên tệp, `blob:` URL nạp được như ảnh (≥ 1440) lúc mở; sau khi đóng MỌI `blob:` URL đã tạo đều bị thu hồi và không còn nạp được | |
| d | Nút "Chia sẻ": không có khi `canShare` trả `false` hoặc không tồn tại; có khi `canShare({ files:[png] })` đúng; bấm → `navigator.share` nhận đúng một tệp `image/png` tên `xac-nhan-<mã>.png` (> 10 KB); `AbortError` (người dùng huỷ) im lặng; lỗi khác báo tiếng Việt chỉ sang "Tải ảnh PNG" | |
| e | Tải lại trang không bật lại hộp thoại (URL `?id=…` sạch); mở đơn không kèm `moi` không tự bật; SỬA đơn nháp → trang đơn không có `moi`, không hộp thoại; nút "Xác nhận gửi khách" luôn có | |
| f | Đơn nháp / đã xác nhận / đã huỷ mở lại bằng nút: chữ "Chờ xác nhận"/"Đã xác nhận"/"Đã huỷ", màu huy hiệu trên ảnh = token `--c-sand-soft`/`--c-green-soft`/`--c-surface-alt` (ba màu khác nhau), ảnh = bản dựng kỳ vọng; SALES khác và kế toán cũng có nút và mở được | |
| g | Tên người phụ trách: API trả tên → in tên (ảnh khác ảnh dùng tên người lập); API 404/500/lỗi mạng/không có người/treo → tên người lập, ảnh vẫn ra | thời gian bấm → ảnh hiện: 102–107 ms; API treo: 3066 ms (hạn 3 giây, không chặn thêm) |
| h | Đơn cỡ tối đa (20 dịch vụ, 50 dòng tiền, tên 100+ ký tự liền, tiền 100.000.000.000 ₫, ghi chú 12 dòng) và tiền rộng quá cột (9.000.000.000.000.000 ₫): không lỗi, 0 chữ tràn lề, 0 chữ chồng nhau, mọi chữ có mực, đúng giới hạn diện tích canvas | cỡ tối đa: cao 14.587 px CSS → độ phân giải hạ còn 1,25 → 900×18.234 (16,41 MP ≤ 16,78 MP), 4,1 MB, 854 khối chữ; tiền rộng: bảng chuyển hai hàng, 1440×7882 |
| i | Vẽ lỗi: công ty lỗi 500, phông từ chối, phông treo (không bao giờ trả lời), `toBlob` trả `null`, `getContext` trả `null` → `role=alert` tiếng Việt có dấu, không lộ chữ kỹ thuật, có nút "Thử lại", không ảnh, nút Tải ẩn, không kẹt "Đang tạo"; Thử lại ra ảnh; Esc đóng được cả sau lỗi lẫn giữa lúc đang tạo | phông treo: lỗi sau hạn 10 giây |
| j | Hộp thoại: `role=dialog`, `aria-modal`, tên = "Xác nhận đơn để gửi khách", 4 phần tử nền `inert` (hộp thoại không), `body.sheet-open`, focus trong hộp thoại; Esc / chạm nền / ✕ đóng, gỡ `inert`, trả focus về nút mở; axe-core **0 vi phạm (mọi mức)** ở 390, 1040 và trạng thái lỗi; vùng chạm ≥ 44 px; không tràn ngang; console/CSP sạch ở mọi trang đã theo dõi | |
| k | Ba ảnh mẫu qua đúng đường giao diện + ba ảnh chụp; chiều cao tăng theo nội dung | 1 dịch vụ 1440×2268; 4 dịch vụ 1440×4046; 8 dịch vụ 1440×9226 (13,3 MP); dựng ≤ 106 ms sau khi bấm (độ phân giải đo 100 ms, phông đã nạp, Chrome headless trên máy dev) |

### Đỏ trước, xanh sau

- Phần thuần: `order-confirmation.test.ts` 20 test, **6 đỏ** trước khi sửa (3 vì nhãn `subtotal`, 3 vì làm sạch chuỗi) → 20/20; `text-wrap.test.ts` **9/10 đỏ** với bản nháp trả nguyên chuỗi → 11/11 (test thứ 11 — cắt sau dấu gạch nối — đỏ khi đặt `BREAK_AFTER` rỗng). Đột biến: bỏ U+202E khỏi dải bidi → 2 test làm sạch đỏ; đổi `<=` thành `<` ở phép vừa dòng → 2 test ngắt dòng đỏ.
- Kịch bản Chrome trên mã cũ (không có `web/confirmation-*.ts`): `xac-nhan-png-do-truoc-khi-lam.txt` → **11 ✗ / 0 ✓**. Sau khi làm: **11 ✓** (`xac-nhan-png-chay-cuoi.txt`).
- Đột biến trên mã mới (hoàn nguyên sau mỗi lần): bỏ `URL.revokeObjectURL` → c ✗; bỏ `history.replaceState` → a, e ✗; tô chữ nổi bật bằng màu thường → b ✗; bỏ hạn 3 giây của API phụ trách → g ✗ (treo); bỏ giới hạn diện tích canvas → h ✗ (42 MP); bỏ ngắt cứng từ dài → h, k ✗ (chữ tràn lề).
- Hai lỗi thật tìm thấy nhờ kịch bản, đã sửa: (1) canvas ở độ phân giải LẺ (đơn dài → 1,75) cao hơn bố cục tới 1 điểm ảnh, hàng cuối chưa được tô nền nên phép dò "canvas trống" báo lỗi giả → nền nay phủ hết canvas; (2) axe bắt `scrollable-region-focusable` (vùng xem trước cuộn được mà không có phần tử nhận focus) → vùng cuộn nhận `tabindex=0` kèm `role=region` và nhãn.
- Hồi quy: `npm test` 350/350 (gồm 14 test mới của Task 10: 3 ở `order-confirmation.test.ts`, 11 ở `text-wrap.test.ts`; ba test cũ của `order-confirmation` được sửa theo nhãn `subtotal`), `npm run typecheck` 0 lỗi, `npm run test:e2e -- pwa` 5 ✓, ba kịch bản A2 chạy lại (vì sửa `web/order-form.ts` và `web/order.ts`, KHÔNG sửa kịch bản nào): `a2-smoke-form` 21 ✓, `a2-smoke-order` 10 ✓, `a2-smoke-sheet` 13 ✓.

### Ảnh (`anh/`)

| Ảnh | Nội dung |
|---|---|
| `xac-nhan-mau-1-mot-dich-vu.png` | 1440×2268: một dịch vụ theo người (2 người lớn + 1 trẻ em, đủ thông tin chuyến), đặt cọc |
| `xac-nhan-mau-2-nhieu-dich-vu.png` | 1440×4046: bốn dịch vụ (ba từ danh mục, một nhập tay nhiều dòng), giảm giá, ghi chú khách hai dòng |
| `xac-nhan-mau-3-don-dai.png` | 1440×9226: tám dịch vụ, tên và nơi đón 90+ ký tự liền không dấu cách (ngắt sau dấu gạch nối), email dài ngắt cứng, ghi chú năm dòng |
| `xac-nhan-hop-thoai-390.png`, `xac-nhan-hop-thoai-1040.png` | hộp thoại ở khổ iPhone 390×844 và máy tính 1040×800 (khung nhìn cố định) |
| `xac-nhan-trang-don-390.png` | trang đơn đã xác nhận với nút "Xác nhận gửi khách" ở hàng riêng dưới ba nút hành động |

**Đọc ảnh thế nào:** dữ liệu trong ảnh mẫu là dữ liệu THỬ (tên khách, SĐT 0903 111 222, danh mục giả); đầu ảnh là dữ liệu công ty thật của `company_profile`. "₫" trông như "đ" gạch chân — đó là hình chữ ₫ của phông Nunito. Ảnh xem trước trong hộp thoại thu nhỏ theo bề rộng khung (chữ nhỏ trên điện thoại); ảnh tải về vẫn 1440 px.

### Điều học được khi làm

1. **Phông chia hai tập con theo `unicode-range`** (`latin-viet` và `vietnamese`; `₫` U+20AB, `Đ` và mọi dấu U+1EA0–1EF9 chỉ nằm ở tập tiếng Việt): `document.fonts.load('16px "Nunito"')` không kèm chữ mẫu chỉ nạp tập latin, ảnh vẽ chữ Việt bằng phông dự phòng và đo sai. Bộ vẽ truyền chính chữ của mô hình làm mẫu, cho mọi họ × độ đậm, rồi mới đo. (Kịch bản không tái hiện được lỗi này vì trang đơn đã hiển thị chữ Việt nên tập con đã nạp sẵn — lưới bảo vệ nằm ở mã và ở kiểm "tập tiếng Việt đã nạp" của bước b.)
2. **Canvas quá lớn không báo lỗi:** iOS Safari lặng lẽ trả ảnh trong suốt khi diện tích > 2²⁴ điểm ảnh. Bộ vẽ hạ độ phân giải theo bước 0,25 và dò hai góc ảnh sau khi vẽ (nền đã phủ kín nên phải đặc), báo lỗi thay vì đưa ảnh trống cho khách.
3. **`document.fonts.load` kèm chữ mẫu + `fontBoundingBox`** (đường cơ sở tính từ số đo phông, không từ chuỗi) giữ dấu tiếng Việt không bị cắt và chữ không nhảy giữa các dòng có/không có dấu.
4. **Ranh giới ngắt dòng:** chữ dài không dấu cách ngắt cứng theo CỤM ký tự (dấu gõ rời không tách khỏi chữ gốc), ưu tiên ngay sau dấu gạch nối/chấm; `NBSP` không phải chỗ ngắt. Tiền không đi qua bộ ngắt dòng: cột đo theo chuỗi dài nhất của mọi dịch vụ.
5. `axe` chạy giữa lúc khung mở chạy hiệu ứng mờ (≥ 641 px) đo tương phản sai; kịch bản chờ hiệu ứng xong.

### Lệch so với brief/spec (có chủ ý)

- Nút "Xác nhận gửi khách" nằm ở `#send` (mới, trong `public/order.html`), **ngoài** `#actions`: giữ nguyên bộ nút theo trạng thái/quyền và các phép kiểm của ba kịch bản A2 (chúng khẳng định đúng danh sách nút trong `#actions`), đồng thời ở điện thoại nút có hàng riêng thay vì bốn nút chen một hàng. Nút hiện cho MỌI người xem được đơn (kể cả kế toán và SALES khác): ảnh chỉ in lại dữ liệu họ đã thấy.
- Đơn quá cao (> ~5.800 px CSS) ra ảnh RỘNG DƯỚI 1440 (hạ độ phân giải để khỏi vượt giới hạn canvas iOS): đơn thử cỡ tối đa (20 dịch vụ, chữ rất dài) còn 900 px ngang. Ba ảnh mẫu đều ≥ 1440.
- `ServiceBlock.subtotal` thành `{ label, value } | null` (Task 9 để `string | null`); thêm `src/shared/text-wrap.ts` (+ test) cho phần ngắt dòng thuần.
- Đơn nháp chưa có ngày khởi hành → dịch vụ đó KHÔNG có dòng "Khởi hành" trên ảnh (chấp nhận theo ruling; trang đơn vẫn cảnh báo). Chân trang chỉ nêu hotline (không có số Zalo riêng, theo ruling Task 1). `exported_png` không được ghi vào nhật ký (ảnh không đi qua máy chủ).

### Chưa kiểm

- **iPhone thật / WebKit:** canvas 2D (giới hạn diện tích 2²⁴ chỉ dựa vào tài liệu, chưa thử vượt trên iOS), `TextMetrics.fontBoundingBoxAscent` và `Intl.Segmenter` (có dự phòng), `navigator.share({ files })` với bảng chia sẻ thật → Zalo, `<a download>` với `blob:` URL trong PWA đã cài lên màn hình chính (iOS có thể mở ảnh trong trình xem thay vì lưu tệp — khi đó "Chia sẻ" là đường chính).
- **Phông tải chậm / ngoại tuyến:** bước i giả lập phông từ chối và phông treo (chạm hạn 10 giây → lỗi + Thử lại), không phải mạng chậm thật; phông vốn nằm trong `PRECACHE` của service worker nên trường hợp thật hiếm.
- **Tên người phụ trách khi API `dispatch` có mặt trong bản deploy thật:** kịch bản dùng cả điểm cuối thật của mã máy chủ trong nhánh (`GET /api/dispatch/handlers`, tên mặc định = người lập) lẫn API giả lập trả tên khác; giao diện người phụ trách (đổi người) là Task 8 — Task 8 phải kiểm tên mới hiện lên ảnh. **(Đã kiểm ở Task 8: bước c của `v1-nguoi-phu-trach.mjs`, ảnh sau khi đổi người giống từng byte bản dựng từ tên người mới.)**
- Máy yếu bộ nhớ với ảnh rất cao (9000+ điểm ảnh, 2 MB); chủ đề tối/cỡ chữ hệ thống lớn (ảnh dựng độc lập với chủ đề); **ký thị giác** của chủ dự án cho ảnh mẫu và hộp thoại: chưa có.

## Task 8 — Giao diện người phụ trách (danh sách + trang đơn + bảng chọn)

**Mã được đo:** `web/orders.ts`, `web/order.ts`, `web/handler-sheet.ts` (mới), `web/order-form.ts` (một câu), `public/app.css` (khối cuối, sau `.confirm-*`), `src/shared/handler-view.ts` (+ test, mới) đúng như trong commit của Task 8. Số liệu dưới đây và `ket-qua-nguoi-phu-trach.json` là của cùng MỘT lần chạy cuối (`nguoi-phu-trach-chay-cuoi.txt`). Kịch bản: `kich-ban/v1-nguoi-phu-trach.mjs` — chạy từ GỐC repo; **không cần mạng ngoài** (danh mục giả, phông tự lưu trữ, Turnstile tắt):

```
npm run build:web && AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs
```

(`ONLY=a,b` chạy vài bước — các bước dùng chung đơn tạo ở bước a nên tự tạo lại khi cần; `OUT=…` đổi thư mục ghi. Kịch bản tự tạo thêm tài khoản SALES thứ ba "Sales Ba" (và "Sales Tư", cho ngưng giữa chừng) bằng `scripts/staff-lib.mjs`; đơn "chưa có người phụ trách" dựng bằng cách đóng dòng `HANDLE` bằng SQL trên D1 tạm. **Mọi trang Chrome dùng CHUNG một kho cookie**: trang của tài khoản nào phải là trang mở SAU CÙNG thì thao tác bằng chuột mới đi bằng phiên của tài khoản đó — kịch bản đã vấp đúng chỗ này ở bước f.)

### Kết quả (**12 dòng ✓, 0 ✗**)

| Bước | Chứng minh gì | Số liệu/quan sát |
|---|---|---|
| a | A lập đơn BẰNG GIAO DIỆN (form → `/order?id=…&moi=1`); danh sách hiện "Phụ trách: <tên>" ở mọi thẻ ở 390 VÀ 1040 (không chip ở đơn đã có người, dòng nằm gọn trong thẻ, không tràn); đúng **một** lời gọi `GET /api/dispatch/handlers` cho cả trang và `orderIds` = đúng các mã đơn đang hiện | 1 lời gọi ở mỗi khổ |
| b | A mở bảng chọn (tên "Đổi người phụ trách"), chọn B → "Lưu" mở chỉ khi đã chọn; lưu xong bảng đóng, trang đơn tải lại thấy B, banner thông tin "Đã đổi người phụ trách sang Sales Hai.", A vẫn có nút đổi (người lập giữ quyền), focus về nút đổi mới dựng; danh sách và nhật ký ("Đổi người phụ trách") thấy B; đúng một PUT, thân chỉ có `staffId` | |
| c | Ảnh PNG "Xác nhận gửi khách" mở SAU khi đổi: GIỐNG từng byte bản dựng từ tên "Sales Hai" và KHÁC bản dựng từ tên người lập cũ | `loadHandlerName` (Task 10) không nhớ đệm nên đúng ngay |
| d | B (không phải người lập) mở đơn NHÁP: đủ ba nút Sửa/Xác nhận/Huỷ theo `canModify` của máy chủ, "Đổi người phụ trách" (không có "Nhận phụ trách"), xem được nhật ký; bấm Sửa → form mở được (không bị khoá), đổi ghi chú, lưu → PUT thành công, người lập không đổi | |
| e | C (SALES khác, đơn đã có người): không nút đổi/nhận, không Sửa/Xác nhận/Huỷ, câu giải thích quyền kể cả người phụ trách; kế toán không nút nào; quản trị đổi được (không nhận); người lập giữ Sửa/Xác nhận/Huỷ và nút đổi sau khi đã giao lại; "Xác nhận gửi khách" vẫn có cho mọi người | |
| f | Đơn CHƯA có người (đóng dòng `HANDLE` bằng SQL): chip "Chưa có người phụ trách" ở danh sách (390, 1040; chỉ đúng một chip) và ở trang đơn; C chỉ thấy "Nhận phụ trách"; người lập và quản trị thấy "Chọn người phụ trách" + "Nhận phụ trách"; kế toán không nút; C bấm nhận → khối hiện "Sales Ba", banner "Bạn đã nhận phụ trách đơn này.", hết nút nhận, có nút đổi và **Sửa/Xác nhận/Huỷ** (canModify), focus sang nút đổi; PUT gửi đúng `staffId` của C | |
| g | Bảng chọn: `role=dialog`, `aria-modal`, tên từ `aria-labelledby`, MỌI phần tử nền `inert` (bảng thì không), `body.sheet-open`, focus trong bảng; danh sách = đúng thứ tự và đủ người của `GET /api/dispatch/assignees` (không có kế toán); người đang phụ trách bị khoá + chip "Đang phụ trách"; Esc / chạm nền / ✕ đều đóng, gỡ `inert`, trả focus về nút đổi. **Khoá khi đang lưu** (PUT bị giữ lại để đo): nút "Đang lưu…" bị khoá, cả danh sách bị khoá, focus không rơi ra ngoài, Esc/chạm nền/✕ KHÔNG đóng, bấm đúp chỉ gửi **một** PUT; thả ra → đóng, đơn tải lại. Lỗi tải danh sách (500 giả lập) → thông báo tiếng Việt (không lộ chữ kỹ thuật) + "Thử lại", Lưu khoá; Thử lại ra danh sách | |
| h | Đổi song song: **409 `no_change`** (giữa lúc A mở bảng, quản trị đã giao đúng người A định chọn) → bảng đóng, đơn tải lại, banner "Người này đang phụ trách đơn rồi. Đã tải lại đơn."; **409 `stale`** (C mở đơn chưa có người, người lập giao cho B trước khi C bấm nhận) → "Đơn này vừa có người khác nhận phụ trách. Đã tải lại đơn.", hết nút nhận; **403** (B đang phụ trách và mở bảng, quản trị giao cho C, B chọn người khác) → "Bạn không còn quyền đổi người phụ trách của đơn này. Đã tải lại đơn.", B mất nút đổi và quyền sửa; **400 `invalid_assignee`** (người được chọn vừa nghỉ) → bảng GIỮ MỞ, hiện chữ của máy chủ, danh sách làm mới (không còn người đó), lựa chọn cũ bị bỏ, máy chủ không đổi gì | 409 `stale` thật giữa hai máy chủ là điều kiện đua trong một câu lệnh — không dựng được từ giao diện (đã kiểm ở `tests/e2e/dispatch.mjs`) |
| i | Lời gọi `handlers` lỗi — chặn mạng (`Network.setBlockedURLs`), 500, thiếu khoá (`{handlers:{}}`): danh sách VẪN hiện (≥ 3 đơn), dòng người phụ trách ẩn, **không chip, không chữ "Chưa có người phụ trách" ở bất kỳ đâu**, không banner lỗi. Trang đơn (A): đơn dựng đủ, nút Sửa/Xác nhận/Huỷ vẫn có, khối hiện "Chưa tải được người phụ trách." + "Thử lại" và KHÔNG nút đổi/nhận; bỏ chặn rồi Thử lại → ra tên và nút. Trang đơn (C, đơn thật sự chưa có người) khi lỗi: KHÔNG mời "Nhận phụ trách" | |
| j | axe-core **0 vi phạm (mọi mức)** ở 16 trạng thái (8 trạng thái × 390 và 1040): danh sách (có chip), trang đơn (có nút đổi), trang đơn chưa có người (hai nút), bảng chọn mở đã chọn một người, bảng chọn lỗi tải, bảng chọn đang tải, trang đơn chưa biết người phụ trách, danh sách khi handlers lỗi; vùng chạm (nút, radio, thẻ đơn) ≥ 44 px; không tràn ngang (trang lẫn bảng) | |
| k | Ảnh 390×844 và 1040×800 (11 ảnh, xem dưới) | |
| l | Console/CSP sạch ở **40** trang đã theo dõi (chỉ trừ các dòng mạng cố ý: PUT 4xx của các cuộc đua, yêu cầu bị chặn) | |

### Đỏ trước, xanh sau

- Phần thuần `src/shared/handler-view.ts` (ai thấy nút nào, câu báo lỗi): `handler-view.test.ts` 9 test, **đỏ** trước khi có mô-đun (`ERR_MODULE_NOT_FOUND`) → 9/9; đột biến: bỏ `assigned:` khỏi `can()` → 1 test đỏ; bỏ điều kiện `handler === null` của nút nhận → 2 test đỏ.
- Kịch bản Chrome trên mã cũ (chưa có giao diện người phụ trách): `nguoi-phu-trach-do-truoc-khi-lam.txt` → **12 ✗ / 0 ✓**. Sau khi làm: **12 ✓** (`nguoi-phu-trach-chay-cuoi.txt`).
- Đột biến trên mã mới, hoàn nguyên sau mỗi lần: hiện chip khi lời gọi handlers lỗi → bước i ✗ ("Chưa có người phụ trách" xuất hiện); cho đóng bảng khi đang lưu → bước g ✗; không tải lại sau 409 khi nhận đơn → bước h ✗.
- Ba phát hiện khi chạy lần đầu (hai lỗi của CHÍNH kịch bản, một lỗi thật của CSS), đã sửa: (1) chờ `[role=alert]` khớp cả banner đang ẩn → chờ `:not([hidden])`; (2) trang của tài khoản khác mở giữa chừng đè cookie của trang C (kho cookie chung) → 403 giả; (3) axe/đo bắt lỗi thật của CSS: ô radio phủ vùng đệm của hàng (không tính viền) chỉ cao 42 px → hàng cao `--row-h` (48 px).
- Hồi quy: `npm test` 363/363 (gồm 9 test mới), `npm run typecheck` 0 lỗi, `npm run test:e2e -- pwa` 5 ✓ (khối CSS sau dấu mốc PWA chỉ token), ba kịch bản A2 chạy lại vì sửa `web/order.ts`/`web/order-form.ts`: `a2-smoke-form` 21 ✓, `a2-smoke-order` 10 ✓ (**đã đổi một khẳng định chữ**, xem "Lệch"), `a2-smoke-sheet` 13 ✓; `v1-xac-nhan-png.mjs` 11 ✓ (vì sửa `web/order.ts`).

### Ảnh (`anh/`, 1x)

| Ảnh | Nội dung |
|---|---|
| `nguoi-phu-trach-danh-sach-390.png`, `…-1040.png` | danh sách đơn: "Phụ trách: Sales Một" ở thẻ đã có người, chip "Chưa có người phụ trách" ở thẻ chưa có |
| `nguoi-phu-trach-danh-sach-chip-390.png`, `…-1040.png` | danh sách xem bởi C (SALES khác): đơn chưa có người lên đầu |
| `nguoi-phu-trach-trang-don-390.png`, `…-1040.png` | trang đơn nháp của A: khối "Người phụ trách" (Sales Hai) + nút "Đổi người phụ trách" |
| `nguoi-phu-trach-bang-chon-390.png`, `…-1040.png` | bảng chọn: người đang phụ trách bị khoá + chip, một người đã chọn, "Lưu người phụ trách" |
| `nguoi-phu-trach-chua-co-nguoi-390.png` | trang đơn của C: chip + nút "Nhận phụ trách", câu giải thích quyền |
| `nguoi-phu-trach-tai-lai-390.png` | sau 409 `stale` khi nhận: banner cảnh báo "Đơn này vừa có người khác nhận phụ trách. Đã tải lại đơn." (vòng focus ở tiêu đề khối vì không còn nút nào) |
| `nguoi-phu-trach-loi-handlers-390.png` | lời gọi handlers lỗi: đơn vẫn dựng, khối "Chưa tải được người phụ trách." + "Thử lại" |
| `xac-nhan-trang-don-390.png` (của Task 10, chụp lại) | trang đơn đã xác nhận nay có thêm khối "Người phụ trách" |

Các ảnh trên đã được xem bằng mắt (danh sách, trang đơn, bảng chọn 390 và 1040, chưa có người, tải lại, lỗi handlers): chữ đủ dấu, không tràn, vùng chạm đủ lớn.

### Điều học được khi làm

1. **Đơn chưa có người phụ trách là trạng thái CÓ THẬT** (đơn của tài khoản chưa có hồ sơ lúc áp `0014`, hoặc đóng bằng SQL): giao diện phân biệt BA trạng thái — chưa biết (lời gọi lỗi → ẩn dòng, không nút) · `null` (chip + "Nhận phụ trách") · có tên. Nếu gộp "chưa biết" vào `null`, một lần mạng chập chờn làm mọi đơn hiện chip sai và mời nhận đơn đã có người.
2. **Ô chọn dùng radio gốc** (không tự vẽ danh sách nút): bàn phím (mũi tên) và trình đọc màn hình miễn phí; ô radio thật phủ cả hàng bằng `position: absolute; inset: 0; opacity: 0` để cả hàng là vùng chạm, vòng focus vẽ trên dấu tròn (`input:focus-visible + .pick-mark`). Ô radio phủ vùng đệm chứ không phủ viền — hàng phải cao hơn vùng chạm tối thiểu một chút.
3. **`stale` không đến được từ bảng chọn:** `PUT` đọc lại người phụ trách hiện tại NGAY trong yêu cầu và đóng dòng theo chính người vừa đọc, nên đổi sau lưng giao diện ra 200 (người khác), 409 `no_change` (cùng người) hoặc 403 (mất quyền) — chỉ "nhận đơn vừa có người" mới ra 409 `stale` xác định được từ giao diện. Ba đường đều xử lý cùng một cách: bảng đóng, tải lại đơn, một banner tiếng Việt.
4. **Không tự tính lại quyền sửa đơn ở client:** Sửa/Xác nhận/Huỷ vẫn theo `canModify` của máy chủ (đã tính `assigned`); chỉ hai nút đổi/nhận dùng `can()` với `assigned: handler.staffId === staff.id`. Khối người phụ trách tải song song với đơn nhưng lỗi riêng: đơn luôn hiện.

### Lệch so với brief/spec (có chủ ý)

- **Danh sách không có "bảng máy tính" riêng:** trang danh sách vốn là một dòng thẻ (`.order-row`) ở mọi khổ; dòng "Phụ trách" nằm trong đúng thẻ đó nên có ở cả điện thoại lẫn máy tính (chứng minh ở 390 và 1040). Tài liệu ghi "bảng máy tính" — cần sửa thành "thẻ ở mọi khổ".
- **Nút đổi/nhận nằm trong khối "Người phụ trách" (trong `#order`), NGOÀI `#actions`:** ba kịch bản A2 khẳng định đúng danh sách nút của `#actions`; cùng lý do như nút "Xác nhận gửi khách" của Task 10.
- **Chưa biết người phụ trách → KHÔNG nút đổi/nhận, chỉ "Thử lại"** (brief chỉ nói ẩn nút theo `can()`): hiện "Nhận phụ trách" khi không biết đơn đã có người là khẳng định điều chưa biết; ẩn nút đổi chỉ tạm thiếu một đường. Ghi ở `handlerControls`.
- **Nhãn nút giao là "Chọn người phụ trách" khi đơn chưa có người** (và "Đổi người phụ trách" khi đã có) — người lập/quản trị thấy cả hai nút "Chọn…" và "Nhận…" ở đơn chưa có người.
- **Thêm `src/shared/handler-view.ts` (+ test)** ngoài danh sách tệp của brief: hàm thuần `handlerControls`/`handlerFailure`/`handlerSaved` (cùng khuôn `order-view.ts`/`order-errors.ts`) để "ai thấy nút nào" và câu báo lỗi có test đỏ→xanh, không chép luật vào `web/`.
- **Đã đổi CÂU giải thích quyền ở `web/order.ts`** ("Chỉ <người lập> (người lập đơn), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này.") **và khẳng định chữ tương ứng trong `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs`** (một dòng, ngoài thư mục bằng chứng của v1.0): câu cũ nói sai (người phụ trách cũng sửa được) và hiện ngay cạnh khối "Người phụ trách" mới. Cùng sửa câu ở `web/order-form.ts` (~dòng 305; không script nào khẳng định chữ đó).
- Bảng chọn đóng và tải lại ngay khi 409/403 (banner ở trang đơn), không giữ bảng mở kèm nút "Tải lại đơn" như `trip-sheet` — vì bảng này không có dữ liệu người dùng gõ để mất; riêng 400 `invalid_assignee` thì giữ bảng mở và làm mới danh sách.

### Chưa kiểm

- **iPhone thật / WebKit:** bảng trượt từ đáy với radio phủ `opacity: 0`, `:has()` (chỉ để tô hàng đã chọn, thiếu cũng không hỏng), cuộn trong bảng khi danh sách dài, bàn phím iOS; ký thị giác của chủ dự án cho khối và bảng: chưa có.
- **Danh sách theo chiều dọc dài:** kịch bản chỉ có ≤ 15 đơn trong D1 tạm; chưa thử trang 30 đơn đầy đủ, nút "Tải thêm" (trang thứ hai gọi `handlers` riêng cho các thẻ mới), cuộn dài trên điện thoại, hay giới hạn 100 mã của máy chủ (mỗi trang chỉ 30).
- **Người phụ trách đã nghỉ:** đơn mà người phụ trách đã bị ngưng tài khoản vẫn hiện tên họ (`staffId` còn, không đăng nhập được); giao diện chưa được thử với ca này, và với người phụ trách là hồ sơ CHƯA có tài khoản (`staffId: null` — hàm thuần đã có test, chưa có ca Chrome). Cảnh báo cho quản trị về đơn có người phụ trách đã nghỉ là việc của kiểm toán (`R-DSP-2`), không có ở giao diện.
- **Đơn ĐÃ HUỶ và đơn đã xác nhận:** khối và nút hiển thị như đơn nháp (máy chủ cho đổi/nhận cả hai — ghi ở báo cáo Task 6+7); chỉ đơn đã xác nhận được chụp (`xac-nhan-trang-don-390.png`), chưa có kịch bản đổi người trên đơn đã xác nhận/huỷ.
- Bàn phím thật (mũi tên đổi lựa chọn, Tab qua bảng) và trình đọc màn hình (VoiceOver): chỉ có axe, `role`/`aria` và thứ tự focus đo bằng mã, chưa nghe thử.
