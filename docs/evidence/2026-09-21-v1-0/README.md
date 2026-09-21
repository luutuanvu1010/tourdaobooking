# Bằng chứng: bản v1.0 (2026-09-21)

Bằng chứng nghiệm thu của các việc trong kế hoạch `docs/superpowers/plans/2026-09-21-v1-0-thi-cong.md` (đặc tả `docs/superpowers/specs/2026-09-21-v1-0-dang-nhap-xac-nhan-phu-trach-design.md`). Mỗi task ghi thêm một mục vào tệp này. Đo trên `wrangler dev` cục bộ với D1 tạm, bằng Chrome headless — **không phải** iPhone thật, không phải khoá/widget Turnstile thật, không phải Workers Assets thật.

## Task 3 — Màn đăng nhập: thông tin công ty, số phiên bản, widget Turnstile

**Mã được đo:** commit của Task 3 (kế sau `03db793`). Kịch bản: `kich-ban/v1-dang-nhap.mjs` — chạy từ GỐC repo, cần **mạng** (widget tải script từ `challenges.cloudflare.com`, máy chủ gọi siteverify), chỉ dùng **khoá thử chính thức của Cloudflare** (site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`; luôn đạt, phát token giả `XXXX.DUMMY.TOKEN.XXXX`) — không có khoá thật, không tạo gì trên Cloudflare:

```
npm run build:web && AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs
```

(`axe-core` lấy bằng `npm pack axe-core` **ngoài repo**; `ONLY=a,b` chạy vài bước; `OUT=…` đổi thư mục ghi. Dựa trên `startEnv({ turnstile: true })` của `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`; `startEnv()` không tham số vẫn chạy Turnstile TẮT nên ba `a2-smoke-*.mjs` không đổi.)

### Kết quả (lần chạy cuối: `dang-nhap-chay-cuoi.txt`, **11 dòng ✓, 0 ✗**)

Hai máy chủ nối tiếp: **A** = Turnstile BẬT bằng khoá thử; **B** = Turnstile TẮT (bước f — không giả lập được: máy chủ đang đòi token thì đăng nhập không kèm token luôn 403).

| Bước | Chứng minh gì | Số liệu/quan sát |
|---|---|---|
| a | Khối công ty hiện đủ 6 mục đúng chữ: tên app "Tour Đảo Booking" (h1 + `<title>`), "Phiên bản 1.0 · ngày 21 tháng 9 năm 2026", "CÔNG TY TNHH TOUR ĐẢO", "Địa chỉ: 19 Đường B2, Khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, Tỉnh Khánh Hoà", "Email: Tourdaotravel@gmail.com", "MST: 4201969169" — đối chiếu với chính dòng `company_profile` trong D1 (đúng như dữ liệu, viết hoa như DB) | |
| b | Header CSP của `/login` có `https://challenges.cloudflare.com` ở `script-src`, `frame-src`, `connect-src` (và `script-src` vẫn không `unsafe-inline`); widget hiện, tự đạt; nút khoá tới khi có token (dãy trạng thái nút `[khoá, mở]`, và mỗi lần MỞ ô token đã có giá trị); đăng nhập qua widget, thân yêu cầu mang đúng `turnstileToken` của widget | widget rộng 316 px ở 390 px; token `XXXX.DUMMY.TOKEN.XXXX` |
| c | Sai PIN → lỗi của máy chủ ("Số điện thoại hoặc mã PIN không đúng.") hiện và **còn hiện** khi token mới về; `turnstile.reset` được gọi đúng 1 lần; ô token bị xoá rồi điền lại; nút `[khoá, mở, khoá, mở]` — không có lúc nào mở khi chưa có token; đăng nhập lại đúng được, cả hai lần đều kèm token | |
| d | 403 `turnstile_failed` **thật** (gỡ token khỏi yêu cầu, máy chủ tự trả) và 503 `turnstile_unavailable` (giả lập): chữ của máy chủ hiện **nguyên văn** ở `#error` (đọc từ `src/modules/auth/turnstile.ts`, đối chiếu chữ đặc tả); sau mỗi lần widget reset (đếm 1 rồi 2) và có token mới, nút mở lại; trả `fetch` thật → gửi lại thành công, lỗi cũ được xoá khi gửi | |
| e | API công ty chặn mạng / 500 / 404 / chậm 5 giây → vẫn đăng nhập qua widget, khối công ty ẩn (không rò chữ), dòng phiên bản còn (hằng trong mã); chậm thì khối hiện khi API về. API cấu hình chặn / 500 → không widget, không script/yêu cầu nào tới Cloudflare, nút không kẹt, máy chủ (đang bật Turnstile) từ chối thì chữ của máy chủ hiện; cấu hình chậm 5 giây → nút tự mở sau **3095 ms** (hạn chờ 3 giây), widget dựng khi cấu hình về muộn rồi khoá nút tới khi có token | |
| f | Máy chủ không khoá: `GET /api/auth/config` = `{ turnstileSiteKey: null }`, khung widget ẩn, không script Cloudflare, **0 yêu cầu** tới Cloudflare, đăng nhập bình thường, thân đăng nhập không có `turnstileToken`, sai PIN không phải chờ token | |
| g | Không có vi phạm CSP và không có lỗi console ở mọi trang đã theo dõi (chỉ còn dòng mạng đã biết: `GET /api/auth/me` = 401 khi dò phiên có sẵn, và các lần đăng nhập lỗi cố ý); trang b đã tải `api.js` của Cloudflare thật (bằng chứng không rỗng) | |
| h | axe-core **0 vi phạm ở MỌI mức** (không chỉ critical/serious) ở 390, 375, 320, 1040 (widget đã đạt), 390 ở trạng thái lỗi sai PIN, và 390 không widget (máy chủ B) — 6 trạng thái, `ket-qua-dang-nhap.json` khoá `axe` | axe không nhìn vào bên trong khung widget của Cloudflare (bên thứ ba) |
| i | Vùng chạm ≥ 44 px (nút, ô gõ, liên kết), ô gõ ≥ 16 px, không tràn ngang, widget nằm trọn trong thẻ — ở 390, 375, 320, 1040, 390 lỗi, 390 không widget | widget: 316 px (390, cỡ "flexible"), 311 px (375, "flexible"), 256×147 px (320, rơi về "compact"), 300 px (1040) |
| j | Service worker THẬT (không bypass): sau khi tải lại dưới sự kiểm soát của service worker, `caches` có 20 mục, đều cùng nguồn, **không** mục nào của Cloudflare hay `/api/*`, khung đăng nhập (`/login`, `/js/login.js`) có trong cache | cộng 4 test mới ở `src/shared/sw-policy.test.ts` |
| k | Widget không dựng được — script Cloudflare bị chặn (bằng `Network.setBlockedURLs`), và khoá site sai (cấu hình bị đổi): thông báo tiếng Việt "Chưa tải được bước xác minh người thật. Kiểm tra kết nối mạng rồi bấm “Thử lại”." + nút "Thử lại", nút Đăng nhập khoá (không có nút khoá mà không lời giải thích); bỏ chặn rồi bấm "Thử lại" → widget dựng, lỗi và nút Thử lại biến mất, đăng nhập được | |

### Đỏ trước, xanh sau

`dang-nhap-do-truoc-khi-sua.txt`: (1) kịch bản trên mã cũ (HEAD `03db793`) → **10 ✗ / 0 ✓**; (2) mã mới nhưng CSP cũ → `a`, `f` xanh, `b` đỏ (header thiếu Cloudflare), `c` đỏ (trình duyệt chặn script của widget); (3) hai đột biến trên mã mới (bỏ `resetWidget()` ở nhánh lỗi; bỏ điều kiện khoá nút theo token) → `b` và `c` đỏ đúng chỗ. Bước k được thêm SAU lần chạy đỏ đầu tiên (nên không có dòng ✗ tương ứng trong tệp đó; trên mã cũ nó hiển nhiên đỏ vì chưa có widget lẫn nút Thử lại). Test `sw-policy` mới **xanh ngay khi viết** (hành vi đã đúng: chỉ cache cùng nguồn) — đây là bài kiểm mô tả hành vi; đột biến bỏ kiểm nguồn trong `routeFor` làm test "khác nguồn thì pass kể cả khi đường dẫn trông giống tệp của khung app" đỏ, khôi phục thì xanh.

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

**Đọc ảnh thế nào:** dải chữ đỏ trong khung widget ("Chỉ để kiểm tra. Nếu nhìn thấy, hãy báo cáo cho chủ sở hữu trang") do **khoá thử** của Cloudflare tự vẽ, không phải của app — widget thật không có dải này (và cao 65 px thay vì 72 px của khoá thử). Không ảnh nào chụp chủ đề tối (app chỉ có chủ đề sáng, xem "Chưa kiểm").

### Điều học được khi làm (ghi để người sau khỏi vấp)

1. **`id="turnstile"` làm hỏng widget:** phần tử có `id` trở thành thuộc tính `window.<id>`, che `window.turnstile` của Cloudflare; `if (window.turnstile)` đúng khi script chưa tải. Khung widget vì thế có id `turnstile-widget`.
2. **`turnstile.ready()` ném lỗi** ("Remove async/defer from the Turnstile api.js script tag…") khi script nạp kiểu `async`/động. Trang gọi `turnstile.render` sau sự kiện `load` của script, không dùng `ready`.
3. **Khung (iframe) của widget nằm trong shadow root ĐÓNG:** `document.querySelector('… iframe')` không thấy. Kịch bản nhận biết widget qua ô ẩn `cf-turnstile-response` (Cloudflare tự thêm) và khối bọc có kích thước.
4. **Token của khoá thử luôn là `XXXX.DUMMY.TOKEN.XXXX`:** không phân biệt "token mới" bằng giá trị; kịch bản chứng minh reset bằng đếm lời gọi `turnstile.reset`, ô token bị xoá rồi điền lại, và dãy trạng thái nút.
5. **Widget "flexible" rộng tối thiểu 300 px:** ở 375 px lòng thẻ chỉ 295 px nên bớt lề trong thẻ ở khổ ≤ 400 px (`@media` ở `public/app.css`); ở 320 px widget rơi về "compact".
6. Vi phạm CSP KHÔNG đi qua `console.error` mà qua miền `Log` của CDP — `a2-cdp.mjs` nay có thêm `logEntries`, `requests`, `failed` (không đổi hành vi `consoleErrors` nên ba `a2-smoke-*.mjs` giữ nguyên).
7. `style-src`/`img-src` **không** phải nới: widget chạy và không có vi phạm CSP chỉ với `script-src`, `frame-src`, `connect-src` (bước g).

### Chưa kiểm

- **iPhone thật** (Safari/PWA đã cài lên màn hình chính): bố cục 390/375 chỉ đo bằng Chrome headless giả lập khổ; WebKit có thể xử lý shadow root đóng, `frame-src`, cỡ widget khác.
- **Widget Turnstile với khoá THẬT**: chế độ managed thật (có thể hiện thử thách tương tác — nút khoá tới khi giải xong, chưa thấy trên khoá thử), kiểm tên miền `booking.tourdao.vn` phía Cloudflare, ảnh hưởng của `Referrer-Policy: same-origin` lên khung widget, widget cao 65 px thay vì 72 px, kích thước ở khổ hẹp khi dải thử biến mất.
- **Bàn phím iOS và tự điền mật khẩu** (iCloud Keychain/trình quản lý mật khẩu điền SĐT + PIN): chưa biết widget/nút khoá có tương tác gì với tự điền; ô PIN vẫn `type=password`, `inputmode=numeric`.
- **Chủ đề tối của hệ điều hành:** widget dùng `theme: "auto"` (theo hệ thống, đúng đặc tả) nhưng app chỉ có giao diện sáng — widget tối trên thẻ trắng chưa ai nhìn.
- **Trình chặn quảng cáo/mạng chặn `challenges.cloudflare.com`** (tiện ích trình duyệt, DNS công ty): đường "Chưa tải được bước xác minh… Thử lại" được thử bằng chặn URL của CDP (bước k), không bằng tiện ích/DNS thật; nhánh `error-callback` của widget (lỗi giữa chừng khi widget đã dựng) chưa có cách giả lập với khoá thử nên chưa chạy.
- **Production/Workers Assets:** header CSP chỉ xác nhận qua `wrangler dev`; sau deploy phải xem lại header của `/login` (checklist triển khai) — cùng với `GET /api/auth/config` khác `null`.
- **Ký thị giác** của chủ dự án cho màn đăng nhập mới: chưa có.
