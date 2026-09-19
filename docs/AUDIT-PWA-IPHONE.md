# Rà soát nhánh PWA iPhone theo Hiến pháp và ràng buộc của tourdaovn

Ngày 2026-09-19. Nhánh `worktree-pwa-iphone`. Yêu cầu của chủ dự án: rà xem nhánh có đúng triết lý và quy tắc quy định trong dự án `tourdaovn` không.

> **Cập nhật sau QA độc lập lần 1 (`docs/evidence/2026-09-19-pwa/QA2-doc-lap-lan-1.md`, nguyên văn): KHÔNG ĐẠT, 1 mục CHẶN đã được sửa và chưa có QA lần 2.** Xem mục "Kết quả QA độc lập lần 1 và xử lý" bên dưới. Phần còn lại của tài liệu này vẫn là bản tự rà viết TRƯỚC QA; các phát hiện của QA mà bản tự rà bỏ sót chứng minh đúng điều nó cảnh báo: tự rà chỉ đi đường thuận.
>
> **Tình trạng của bản tự rà: TỰ RÀ, CHƯA ĐỘC LẬP.** Người thi công cũng là người rà (kèm hai agent chỉ đọc tài liệu và trích quy tắc). `playbook/GOVERNANCE.md` §4.3–4.4 đòi QA1 (mockup) và QA2 (phát hành) do **agent QA độc lập, không phải agent đã soạn artifact**, và chủ dự án duyệt báo cáo; §5.3: bằng chứng tự khai (E3) đơn độc không bao giờ đủ. Vì vậy tài liệu này **không phải** báo cáo QA1/QA2; nó gom bằng chứng E1 (máy chạy, máy kiểm) và E2 (ảnh chụp, người kiểm) để phiên QA độc lập và chủ dự án dùng.

**Căn cứ đã đọc:** `tourdaovn/CLAUDE.md`; `playbook/CONSTITUTION.md` v2.2.0 (P1–P13, N1–N7, §5.8, §6, §7, §8); `playbook/GOVERNANCE.md` §4–5; `docs/core-specs/04-CONSTRAINTS.md` (§2, §3, §4); `docs/DECISIONS.md` (khuôn bản ghi, `QĐ-2026-08-22-01` về `theme-color`); `src/layouts/BaseLayout.astro` (favicon, apple-touch-icon). Phía `tourdao-sales`: `SPEC-tourdao-sales.md`, `ARCHITECTURE.md`, `AUDIT-BRIEF/FINDINGS.md`, `REFACTOR-PLAN.md`, `HANDOFF-M2/M4.md`. Không tài liệu nào của `tourdaovn` nhắc tới `tourdao-sales`, PWA, service worker hay manifest, nên áp dụng **khung chung**; các giá trị riêng của tourdaovn (ngưỡng Lighthouse, thang cỡ chữ) chỉ dùng để đối chiếu, không coi là luật của Desk.

**Bằng chứng** (`docs/evidence/2026-09-19-pwa/`, ghi mã băm): `kiem-tra-may.txt` (typecheck, 55 test, e2e 6/6, gắn HEAD `37d5c71`), `ket-qua-do.json` (axe và thời gian mở), `nang-cap-sw.json` (service worker tự đổi cache qua hai lần deploy giả lập), `kiem-tra-giao-dien.txt`, `anh/`, `kich-ban/`.

## Kết quả QA độc lập lần 1 và xử lý

Agent QA độc lập (Opus 5, worktree riêng, bản `118be35`) chạy lại typecheck, 55 test, e2e 6/6, axe và các phép đo của bản tự rà: **mọi con số khớp** (thời gian mở lệch dưới 1,5%). Kết quả **KHÔNG ĐẠT** vì một phát hiện mà tự rà không thể thấy.

| ID | Phát hiện | Mức | Xử lý |
|---|---|---|---|
| Q2-01 | Router của Worker khớp đường dẫn bằng `split("/").filter(Boolean)` nên `//api/auth/me` vẫn trả JSON phiên thật; bộ lọc theo tiền tố `/api` của service worker phân loại nó là "shell" và **cache phản hồi phiên, còn sống sau đăng xuất**. Đã tái hiện độc lập (`routeFor("//api/auth/me")` → `shell`) | **CHẶN** | **Đã sửa** (`d2bdd67`): `routeFor` đảo sang danh sách cho phép đóng theo mặc định (8 trang + tệp tĩnh đúng mẫu; mọi thứ khác là "pass"), thêm lớp chắn thứ hai theo `content-type` (JSON không bao giờ vào cache), test cho `//api`, `///api`, `%61pi`, `/API`, dấu chấm; test đối chiếu danh sách trang với `public/*.html`; e2e kiểm content-type thật của khung. **Chưa QA lần 2** |
| Q2-02 | Đoạn mã tắt khẩn cấp trong tài liệu không biên dịch (thiếu `export {}`) | SỬA | Đã sửa đoạn mẫu và ghi rõ hai bài kiểm sẽ đỏ trong đường khẩn cấp (`docs/PWA-IPHONE.md`) |
| Q2-03 | Phép quét "không viết cứng" lọt tên màu, `%`, `vw/vh/ch`, `color-mix()` | SỬA | Chọn thu hẹp lời khai cho đúng phạm vi thật thay vì mở rộng thêm (`docs/PWA-IPHONE.md`) |
| Q2-04 | Mất mạng: `initShell()` dừng trước khi dựng thanh tab nên không còn điều hướng | SỬA | Đã sửa: dựng thanh tab cơ bản (3 tab) trước khi dừng; spec Q7 cập nhật. **Chưa chạy lại trên trình duyệt** (chỉ typecheck) |
| Q2-05 | Mã bản dựng là giờ, không phải băm nội dung: build không đổi mã vẫn xoá cache của mọi người | GHI | **Không đổi**: chấp nhận đánh đổi vì đơn giản (P11); deploy hiếm, cái giá là một lần mở nguội |
| Q2-06 | `wrangler dev` giữ ETag cũ của `/sw.js`; `no-store` chặn đúng bẫy | GHI | Đã khớp lời khai |
| Q2-07 | Nút "‹" dùng `history.back()`; lịch sử "bẩn" có thể về sai nơi trong chế độ toàn màn hình | HỎI | Chờ chủ dự án. Đề xuất nhỏ: `location.replace` sau khi lưu đơn để form không nằm trong lịch sử |
| Q2-08 | Nút "Lưu đơn nháp" `sticky` dưới bàn phím iOS | HỎI | Chờ thử trên iPhone thật |
| Q2-09 | Tên "Tour Đảo Desk" chưa được duyệt | HỎI | Chờ chủ dự án |

Vì mã đã đổi sau khi bằng chứng ở `docs/evidence/2026-09-19-pwa/` được ghi, phần bằng chứng đó gắn với mã `37d5c71` và **không còn là bằng chứng của mã hiện tại** cho những phần nó đo (thời gian mở, axe, ảnh chụp): các thay đổi sau đó (allowlist, thanh tab khi mất mạng) không đụng đường hiển thị bình thường nhưng chưa được đo lại. `kiem-tra-may.txt` được làm mới theo mã mới.

## Đã sửa trong lúc rà (bản rà này không chỉ báo cáo)

Người thi công sửa mã ngay khi tìm ra lỗi. Đó là quyết định phạm vi của người thi công (`CLAUDE.md` §8: giữ thay đổi nhỏ, đúng phạm vi), chủ dự án chưa duyệt từng mục. **Nói nếu muốn hoàn tác mục nào.** Toàn bộ thay đổi mã: `git diff aab077b..HEAD -- public web src tests package.json` (`aab077b` là commit cuối trước khi bắt đầu rà).

| # | Việc đã sửa | Vì sao | Commit |
|---|---|---|---|
| 1 | `h1` ẩn khỏi mắt thay vì `display:none` | axe `page-has-heading-one` (RS4) | `06a1989` |
| 2 | Giá trị giao diện của khối PWA đi vào token Desk; e2e quét màu, `px`, `rem/em`, `rgb()/hsl()` | RS1 | `ae374f1`, `37d5c71` |
| 3 | Bỏ 2 `style=` nội tuyến ở `account.html`; nhãn tab 11px lên 12px | RS16, RS18 | `ec614f6` |
| 4 | Mã phiên bản cache do build chèn (`package.json`: thêm `--define:__BUILD_ID__` vào lệnh build service worker), thay cho "tăng tay". **Đổi hành vi:** mỗi lần deploy xoá cache khung của mọi người dùng, nên lần mở đầu tiên sau mỗi deploy chậm hơn (cỡ lần đầu nguội, khoảng 718 ms trong phép đo) | RS13 | `ec614f6` |
| 5 | `/sw.js` từ `no-cache` sang `no-store` | RS13 | `37d5c71` |
| 6 | e2e đối chiếu tên với manifest và màu theme với token `--c-primary` | RS2 | `e801041` |

## Phát hiện và xử lý

| Mã | Điều khoản | Phát hiện | Xử lý | Bằng chứng |
|---|---|---|---|---|
| RS1 | P6, N7; `CLAUDE.md` §8 luật cứng 1 (giá trị giao diện vào token) | Khối CSS PWA viết cứng 44/48/52/56/36/72px, cỡ chữ 11px, 22,37%, `#fff` | Chuyển thành token riêng của Desk ở `:root` (chú thích rõ là không kế thừa từ tourdaovn); `pwa.mjs` quét khối PWA, không được còn màu hex, `rgb()/hsl()`, `px`, `rem/em` (ngoại lệ có lý do: điểm gãy `@media`, viền 1px). **Bản quét đầu chỉ bắt hex và `px` nên đã bỏ sót ba cỡ chữ `rem` viết cứng (`1.1rem` ×2, `1.125rem`) trong khối mà tài liệu này từng xác nhận là sạch**; mở rộng phép quét mới lộ ra, rồi đưa vào token. Lưu ý: luật này là của tourdaovn, SPEC của Desk chỉ đòi token khai ở §4; áp dụng theo yêu cầu của chủ dự án. tourdaovn tự ghi chưa có token 44px (DR-094), Desk đặt `--tap-min` | `ae374f1`, `37d5c71`; phép quét đã thử làm đỏ bằng `10px, #abc`, và bằng `1.1rem, 1.125rem` khi mở rộng |
| RS2 | P6, N7 | Tên hiển thị nhân bản ở manifest, 8 `<title>`, `apple-mobile-web-app-title`, h1 đăng nhập, brand trong `web/shell.ts`; màu theme nhân bản ở manifest và 8 thẻ `theme-color` | Bản sao là tất yếu (HTML tĩnh và JSON không import được CSS) nên đặt cổng máy: `pwa.mjs` lấy `manifest.name/short_name` và token `--c-primary` làm gốc rồi đối chiếu mọi bản sao | `e801041`; đã thử làm lệch `#0c4a6e` → `#0c4a6f`, test đỏ |
| RS3 | §6.2 (ngưỡng phải là số), §8.2 | Yêu cầu "nhanh nhất" chưa có con số; SPEC §3 đặt ngưỡng TTI di động 4G dưới 2 giây | Đo bằng Chrome headless trên 4G giả lập. Bảng dưới. Đạt | `ket-qua-do.json` |
| RS4 | §6.1 (khả năng tiếp cận) | axe: 0 lỗi critical/serious. Nhánh gây ra 1 lỗi mức vừa: ẩn `h1` bằng `display:none` làm 6 trang mất tiêu đề cấp 1 (`page-has-heading-one`) | Đổi sang kiểu ẩn-khỏi-mắt, `h1` còn trong cây truy cập. Còn 2 lỗi nhỏ `empty-table-header` (cột thao tác `<th></th>` ở `/catalog`, `/staff`) có sẵn từ trước nhánh | `06a1989`; `ket-qua-do.json` |
| RS5 | P4 (spec là nguồn sự thật) | Drift: thông báo mất mạng ở `initShell()` thêm khi kiểm trên trình duyệt, chưa có trong spec | Cập nhật spec (Q7, mục Thành phần) | spec PWA bản 2 |
| RS6 | P5, N3, Điều 7 | Các quyết định chỉ nằm trong hội thoại và bộ nhớ, thiếu "phương án bị loại" và phân loại cửa | Bảng Q1–Q9 trong spec PWA và đồng bộ vào SPEC gốc §2.4-7, §7, lịch sử (RS15). Tên "Tour Đảo Desk" ghi là **đề xuất của AI chờ chủ dự án duyệt** (Điều 7.1, P8) | spec PWA, `SPEC-tourdao-sales.md` |
| RS7 | P2, N1 (bề mặt không đi trước cấu trúc) | Mockup dựng khi chưa có bảng ánh xạ giao diện–dữ liệu riêng cho điện thoại. Nhưng SPEC dòng 3 nói §2 (kiến trúc dữ liệu) đã duyệt và mở phiên thực thi, và mọi màn hình đã chạy; nhánh chỉ tổ chức lại bề mặt, không thêm trường dữ liệu nào | Bổ sung bảng ánh xạ vào spec PWA. Điều kiện N1 (đã có cấu trúc dữ liệu được duyệt) được đáp ứng; thứ tự "mockup rồi mới có bảng" là sai lệch nhẹ, đã ghi. N1 thuộc hạng có điều kiện (§5.8), không có dữ liệu nào bị uốn theo giao diện nên không cần Nợ hiến pháp | spec PWA |
| RS8 | N4 (ranh giới giữa các dự án) | SPEC dòng 4 khai điểm chạm duy nhất với tourdaovn là giá trị token; nhánh đưa logo (lấy từ Sanity của tourdaovn, project `pgedy374`) vào `public/icons/` | Khai báo thêm điểm chạm "tài sản logo, sao chép một lần, không đọc Sanity lúc chạy" ở dòng 4 và §2.4-7 của SPEC (chủ dự án là người chỉ nguồn logo). `#993333` là màu của tài sản, không phải màu giao diện | `SPEC-tourdao-sales.md`, Q4/Q9 |
| RS9 | `CLAUDE.md` §8 (không thêm dependency hay pattern mới nếu chưa có quyết định) | Không thêm dependency (`package.json` chỉ đổi hai dòng script, lockfile không đổi). Pattern mới là service worker | Đã được chủ dự án duyệt (Q1, Q2) và ghi | `git diff main..HEAD -- package.json package-lock.json` |
| RS10 | 04-CONSTRAINTS §4 (bảo mật); SPEC/AUDIT-FINDINGS A14 | `/api/*` mang dữ liệu khách và phiên: không được vào cache | Ba lớp kiểm: hàm thuần `routeFor` có test; e2e xác nhận API `no-store`; đo trên trình duyệt thấy 0 mục `/api` trong cache. Không `innerHTML`, không `console.*`, không bí mật được theo dõi, CSP không đổi | `sw-policy.test.ts`, `pwa.mjs`, `ket-qua-do.json` |
| RS11 | N2, N6 (cổng trước phát hành) | Nhánh chưa được gộp hay deploy | Giữ nguyên: chủ dự án quyết định gộp và deploy | — |
| RS12 | P6, N7; SPEC §2.4-2 và §5: logo công ty đến sau qua màn hình cài đặt (`company_profile.logo_url`), v1 chạy wordmark chữ | Logo tĩnh ở đầu trang và đăng nhập, sau M5 sẽ có hai nguồn | Tách hai vai. **Icon PWA** buộc là file tĩnh (manifest không đọc được cấu hình động) nên giữ. **Logo ở đầu trang và đăng nhập** là tạm (chủ dự án duyệt qua mockup, Q6), ghi nợ: khi M5 có `company_profile.logo_url` hai chỗ này đọc từ đó | Q4, Q6 |
| RS13 | §8.2 (ràng buộc thiếu cách máy kiểm là ràng buộc rỗng); rủi ro "khung cũ chạy với API mới" | Bản đầu cần người **nhớ tăng `CACHE_VERSION` bằng tay** khi deploy đổi API: chỉ là kỷ luật của con người | Mã phiên bản cache do `npm run build:web` chèn (`--define:__BUILD_ID__`), mỗi build/deploy tự xoá cache cũ; chứng minh bằng hai lần "deploy" giả lập trên trình duyệt (cache bản A bị xoá, bản B thay thế, app chạy bình thường). **Bẫy đã đo rồi đã sửa:** với `/sw.js` là `Cache-Control: no-cache`, kịch bản build-rồi-cập-nhật trên một máy chủ KHÔNG đạt (`wrangler dev` giữ ETag cũ, trình duyệt gửi `If-None-Match` và nhận 304, không thấy bản mới). Đổi sang `no-store` (không còn bản lưu để gửi điều kiện) thì đạt. Điều này quan trọng vì cách tắt khẩn cấp cũng đi qua `/sw.js`. **Còn lại chưa kiểm được:** Workers Assets thật (chỉ kiểm được trên `wrangler dev`); có bước xác nhận "Sau khi deploy" trong `docs/PWA-IPHONE.md` | `ec614f6`, `37d5c71`, `nang-cap-sw.json`, `nang-cap-sw-mot-may-chu.txt` |
| RS14 | GOVERNANCE §4.3–4.4, §5.3 | Chưa chạy QA1/QA2 độc lập; bằng chứng hiện có là E1 và E2 do chính người thi công tạo | Ghi rõ ở đầu tài liệu này. **Cần chủ dự án quyết** ai chạy QA độc lập | — |
| RS15 | P4, SPEC §7 dòng cuối (spec–code phải đồng bộ), AUDIT-FINDINGS A18 | Quyết định PWA nằm ngoài chỗ ghi của dự án (§2.4, §6, §7, lịch sử), lộ trình M1–M5 không có PWA | Đã đồng bộ `SPEC-tourdao-sales.md`: §2.4-7, §3 (static assets), §6 (dòng PWA), §7 (ba dòng), lịch sử, dòng 4. Thứ tự P3 ("mỗi module gộp xong mới mở module sau"): PWA làm xen giữa M3 và M4 theo yêu cầu của chủ dự án, ghi ở §6 | `SPEC-tourdao-sales.md` |
| RS16 | AUDIT-FINDINGS A14 (CSP `style-src 'unsafe-inline'` vì còn `style=`; muốn bỏ thì chuyển sang class) | Nhánh thêm 2 thuộc tính `style=` ở `account.html` | Thay bằng class `.narrow` + token `--w-narrow`, bỏ luôn `style=` có sẵn của form; CSP không đổi. Kiểm không có lỗi console/CSP trên đủ 8 trang (kịch bản duyệt, không bỏ qua CSP) | `ec614f6`, `kiem-tra-giao-dien.txt` |
| RS17 | 04-CONSTRAINTS §3 (Lighthouse perf ≥ 90, a11y ≥ 95 đo mobile) | Ngưỡng này là của **site tourdaovn**, gắn với "bộ trang đại diện" của site; SPEC của Desk đặt ngưỡng riêng (TTI 4G dưới 2 giây). Trang Desk cần đăng nhập nên Lighthouse chỉ đo được trang đăng nhập, không đại diện | Không áp Lighthouse; dùng axe (0 critical/serious) và phép đo TTI theo SPEC. Nếu chủ dự án muốn Lighthouse cho Desk thì cần khai bộ trang đại diện | RS3, RS4 |
| RS18 | Thang chữ của tourdaovn tự mâu thuẫn (08: sàn 11px; 07: nhãn 12px; chữ giao diện ≥ 15px) | Nhãn thanh tab 11px | Nâng lên 12px (`--fs-xs` của tourdaovn), thỏa cả sàn 11px lẫn mức nhãn 12px; nhãn điều hướng nhỏ kiểu iOS được chấp nhận vì `app.css` sẵn có đã dùng chữ dưới 15px (`.muted`, nhãn form) | `ec614f6` |

## Số đo (RS3)

Trung vị 5 lần, milli-giây từ lúc bắt đầu điều hướng, 4G giả lập (RTT 150 ms, 1,6 Mbps, CPU chậm 4 lần). "Khung" = thanh đầu trang hiện; "dữ liệu" = dòng đơn đầu tiên hiện.

| Tình huống | Khung | FCP | Dữ liệu |
|---|---|---|---|
| A. Lần đầu, nguội (chưa cache, chưa service worker) | 391 | 428 | 718 |
| B. Mở lại, KHÔNG service worker | 341 | 336 | 655 |
| C. Mở lại, CÓ service worker | 35 | 48 | 354 |

Mở lại nhanh hơn khoảng 10 lần ở phần khung và khoảng 1,8 lần ở phần dữ liệu. Cả ba dưới ngưỡng 2 giây của SPEC. **Hạn chế:** localhost với băng thông và độ trễ giả lập; chưa phải mạng thật đến Cloudflare, chưa phải iPhone thật.

Phần dữ liệu còn lại ở tình huống C (355 ms) gần như là hai lời gọi API nối tiếp (`/api/auth/me` rồi `/api/orders`). Chạy song song sẽ bớt khoảng một vòng RTT. Việc này ngoài phạm vi spec đã duyệt nên **không làm**, chỉ ghi làm đề xuất chờ duyệt.

## Cần chủ dự án quyết

1. **Tên hiển thị "Tour Đảo Desk"** (đề xuất của AI): giữ hay đổi. Đổi là 5 chỗ ghi ở `docs/PWA-IPHONE.md` và một commit; `pwa.mjs` bắt sót.
2. **Ai chạy QA độc lập** (RS14) trước khi gộp; và có cần báo cáo QA1 cho mockup không.
3. **Ghi quyết định ở đâu.** tourdaovn dùng `DECISIONS.md` và ADR; `tourdao-sales` ghi ở SPEC §2.4/§7/lịch sử và hẹn ADR "viết ở đầu M4" (SPEC §5, chưa có tệp ADR nào). PWA là cửa hai chiều nên đang ghi ở SPEC §7; nếu chủ dự án muốn theo đúng khuôn tourdaovn ("cách phát hành", "vận hành lâu dài" cần ADR) thì phải mở thư mục ADR cho Desk.
4. **Chạy `/api/auth/me` và `/api/orders` song song** để bớt thêm khoảng một vòng RTT khi mở danh sách (ngoài spec đã duyệt).

## Chưa kiểm được và nợ đã ghi

- **Chưa kiểm trên iPhone thật:** thêm vào Màn hình chính, icon sau khi iOS bo góc, thanh trạng thái, tai thỏ và thanh home, và rủi ro lớn nhất là nút "Lưu đơn nháp" `sticky` bị bàn phím iOS che (`docs/PWA-IPHONE.md`). **Chưa kiểm việc nhận service worker mới trên Workers Assets thật** (mới kiểm trên `wrangler dev` với `no-store`, RS13).
- **Nợ có sẵn từ trước, không thuộc nhánh này:** `empty-table-header` (nhỏ) ở `/catalog`, `/staff`; nhiều màu và cỡ chữ viết cứng ngoài khối PWA trong `app.css`; token sao chép từ tourdaovn theo ngày; `docs/HANDOFF-M4.md` dòng 7 và `README.md` dòng 21, 25 còn ghi "chưa deploy", "0007 chưa áp remote" trong khi đã deploy (bộ nhớ dự án ghi 2026-09-19), và `README.md` dòng 3 nói chạy tại `sales.tourdao.vn` trong khi tên miền thuộc M5. Tôi không sửa các dòng này vì phiên kia cũng sửa `HANDOFF-M4.md` và `README.md` trong kế hoạch của họ.
- **Chênh so với mockup:** ở chi tiết đơn, các nút hành động nằm trên huy hiệu trạng thái (do thứ tự DOM hiện có), mockup đặt sau; mockup trên Claude Design vẫn ghi "Tour Đảo Sales" ở vài chỗ và chưa cập nhật theo nhánh.
- **Rủi ro đã ghi:** phiên 7 ngày cố định; trang admin trên điện thoại vẫn là bảng cuộn ngang; chế độ offline thật chưa làm.

## Dự báo xung đột khi gộp với nhánh `worktree-thong-tin-chuyen-di`

Nhánh của phiên kia hiện chỉ có spec và kế hoạch (chưa có mã). Kế hoạch A1 của họ sẽ sửa `tests/e2e/run.mjs` (dòng `const ALL`), `tests/e2e/README.md`, `docs/ARCHITECTURE.md` và `docs/SPEC-tourdao-sales.md`; **cả bốn file cũng bị nhánh này sửa**. Xung đột chỉ là cơ học: `ALL` phải chứa cả `pwa` lẫn `trip`; bảng kịch bản có cả hai dòng; `ARCHITECTURE.md` giữ cả hai mục cuối; `SPEC-tourdao-sales.md` giữ cả hai bộ thay đổi ở §2.4, §6, §7 và lịch sử. Các file giao diện (`web/order.ts`, `web/order-form.ts`, `public/order*.html`) hiện chưa nằm trong kế hoạch của họ.
