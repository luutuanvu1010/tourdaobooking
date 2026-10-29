# Đặc tả đợt 0b — Khung tải: tách gói chung, nạp sẵn theo vai, tải trước, chuyển trang không chớp, khung xương tĩnh

> **bản 1 — 2026-10-29 — CHỜ QA1.** Hồ sơ có ngày. Thi công chỉ sau khi QA1 ĐẠT và chủ dự án duyệt; sau đó `writing-plans` → phiên Code riêng (subagent-driven) → QA2 → cổng phát hành đợt 0b (cùng nhịp đợt 0).

## 0. Tóm tắt và phạm vi

Đợt 0b là bước «khung tải» mà `LO-TRINH.md` mục 3 và `ADR-0143` (chủ duyệt 29/10, biên bản `../2026-10-28-dot-0-khung-chung/QUYET-DINH-MO-7C-VA-DOT-0B-2026-10-29.md`) đề ra: **làm trang mở nhanh và nhẹ hơn ở lần mở đầu, chuyển trang không chớp, không nhảy bố cục — không đổi màn nào, không đổi API, không đổi quyền.** Sau đợt này mỗi trang chỉ còn phần mã riêng của nó, phần dùng chung tải một lần; service worker nạp sẵn **khung + trang của vai** thay vì nạp sẵn cả 50 trang; mọi HTML khai sẵn tải trước; khung xương hiện ngay khi HTML tới.

**Số nền** (đo 29/10 trên `main` 25f127d1, phụ lục B): 48 gói JS phẳng tổng ≈ 5,4 MB thô, gói nhẹ nhất 82 KB vì chứa lặp cụm khung ≈ 80 KB; nạp sẵn lúc cài 108 mục; trung vị FCP lạnh 984 ms (390×844, 4G chậm, CPU ×4), nội dung lạnh 1,3–1,9 s; CLS lạnh > 0,1 ở 12/45 trang. Dựng thử có tách gói chung (phụ lục B): tổng 1.468.005 byte (−73 %), gói chung lớn nhất 156.973 byte thô / 47.692 nén dùng ở 48/48 trang, phần riêng `orders.js` 13.945 byte, 52 gói con.

**Trong phạm vi (8 khối):** G1 tách gói chung + tệp kê · G2 HTML sinh từ nguồn với `<head>` chung (tải trước gói và phông) · G3 nạp sẵn theo vai (thay điều 1 ADR-0035) · G4 Speculation Rules prefetch (thử, không chặn) · G5 View Transitions giữa tài liệu · G6 khung xương tĩnh + giữ chỗ khung · N1 ba nợ chuyển từ đợt 0 · D1 đo trước/sau, bài kiểm, tài liệu, nhật ký.

**Ngoài phạm vi (mục 10):** gộp lời gọi dữ liệu mỗi trang (đòn bẩy 7, cần ADR riêng); «lưu xong báo ngay» (đòn bẩy 8); `prerender`; thân 47 trang; khoá phóng `user-scalable=no` (chủ giữ 29/10); đổi mốc màn hình; đổi cách phục vụ `/api/*`; dark mode.

## 1. Nguồn sự thật và thứ tự ưu tiên khi lệch

1. `docs/adr/ADR-0143-khung-tai-tach-goi-chung-nap-san-theo-vai.md` (accepted 29/10) và biên bản `QUYET-DINH-MO-7C-VA-DOT-0B-2026-10-29.md`: đặc tả này **thu hẹp, không mở rộng** Đ0–Đ6.
2. `QUYET-DINH-CONG-1.md` (QĐ3: đo trước/sau bằng chính kịch bản Chặng 1; không gộp API) và `QUYET-DINH-CONG-PHAT-HANH-DOT-0-2026-10-29.md` (nợ chuyển tiếp).
3. Đặc tả này (mục 2 quyết định đã chốt → mục 4–9 khối → mục 11 tiêu chí).
4. `LO-TRINH.md` mục 3 (bảng đòn bẩy, số kỳ vọng) — chỉ để tham chiếu.
5. Mã hiện hành (`main` 25f127d1; phụ lục A). Lệch giữa đặc tả và mã: kế hoạch đọc mã rồi chốt theo mục 15; lệch giữa đặc tả và ADR: ADR thắng, ghi vào nhật ký thi công.

## 2. Quyết định đã chốt — không hỏi lại

| # | Quyết định | Lý do / nguồn |
|---|---|---|
| Q-1 | Gói con đặt **phẳng** trong `public/js/` với tên `chung-[hash].js` (`--chunk-names=chung-[hash]`), không thư mục `chunks/` như ADR gợi ý | `STATIC_FILE` của `sw-policy.ts` không nhận thư mục con; thu hẹp để không đổi ba lớp cache |
| Q-2 | Build sinh **tệp kê** `public/js/danh-sach-goi.json` từ `--metafile`: `{ buildId, trang: { "/orders": ["/js/orders.js", "/js/chung-…js", …] }, chung: [tên gói con dùng ≥ 2 trang] }`; mỗi trang ghi **bao đóng** (mọi gói nó nhập trực tiếp và gián tiếp, thứ tự lá trước). Service worker **nhúng** tệp kê lúc dựng `sw.js` (import JSON) → không chép tay `PRECACHE` nữa | ADR Đ1; 52 gói con với đồ thị sâu (phụ lục B) không chép tay được |
| Q-3 | HTML **sinh từ nguồn**: `web/html/<trang>.html` (chỉ `<title>` + thân) + `web/html/_head.html` (head chung) → `public/<trang>.html` (gitignore). Head chung = head hiện hành (giữ nguyên thứ tự, cặp `app.css` + `giao-dien.css` **liền nhau**) + `<link rel="modulepreload">` cho **toàn bộ bao đóng JS của trang** (từ tệp kê) + `<link rel="preload" as="font">` cho Be Vietnam Pro 400 / 500 / 600 | ADR Đ2 «không sửa tay 47 tệp»; tên gói băm theo nội dung nên head phải sinh |
| Q-4 | Toàn bộ dựng web gom về `scripts/dung-web.mjs`; `build:web` = `node scripts/dung-web.mjs`. Thứ tự: dọn `public/js/*.js` → esbuild 48 điểm vào (splitting, metafile) → sinh tệp kê → sinh HTML → `sinh-so-do-trang` → esbuild `sw.ts` (nhúng tệp kê). Danh sách điểm vào chuyển sang `scripts/diem-vao.mjs` (một nơi, bài kiểm đọc chung) | Hình dạng lệnh hiện bị hai bài kiểm khoá (`tro-ly-cau-truc.test.ts:156`, `goi-trang-nhe.test.ts:15`): đổi cả hai cho đọc từ `diem-vao.mjs` |
| Q-5 | **Ngân sách gói thay cho `TRAN_ORDERS`** (`src/goi-trang-nhe.test.ts` dựng lại có splitting + metafile vào thư mục tạm): (a) tổng JS thô 48 phần riêng + gói con ≤ **1.600.000** byte; (b) gói con lớn nhất ≤ **170.000** byte; (c) phần riêng `orders.js` ≤ **15.000** byte; (d) phần riêng `login.js` ≤ 15.000; (e) `src/shared/changelog.ts` **chỉ** nằm trong phần riêng `help.js`, không nằm trong gói con nào; (f) bao đóng JS của bất kỳ trang nào ≤ **24** tệp. Số (a)–(d) = số đo thử 29/10 + ≈ 8 %; kế hoạch đo lại trên mã thật và ghi số cuối | Biên bản cổng phát hành đợt 0: «định nghĩa lại thay vì nới» |
| Q-6 | **Vòng 1 (lúc cài SW)** nạp sẵn: `/`, `/login`, `/ngoai-mang`, `/404` + bao đóng JS của bốn trang đó (từ tệp kê) + `/app.css`, `/giao-dien.css`, `/manifest.webmanifest`, hai icon, phông Be Vietnam Pro **400 / 500 / 600** (700 và 800 không nạp sẵn). Mục tiêu ≤ 30 mục, ≤ 0,5 MB nén | ADR Đ3 vòng 1 |
| Q-7 | **Vòng 2 (theo vai)**: ngay sau `/api/auth/me` về (`web/shell.ts` `initShell`, chỗ gọi `luuKhungNho`), shell gửi `navigator.serviceWorker.controller?.postMessage({ loai: "nap-theo-vai", buildId, trang })` với `trang` = `homeRedirect(staff) ?? "/"` + mọi `duong` của `thanhTab(staff)` (hàm thuần `trangTheoVai(staff): string[]` ở `src/shared/nap-theo-vai.ts`, có bài kiểm 1024 tập quyền: kết quả ⊂ `PAGES`, không trùng, có mặt trong tệp kê). SW: `buildId` ≠ `CACHE_VERSION` → bỏ qua; chờ `activate` xong; `cache.add` **tuần tự** từng tệp chưa có (không `cache: "reload"`); không dùng `requestIdleCallback` (SW không có) | ADR Đ3 vòng 2 |
| Q-8 | **Vòng 3**: như nay («bản trên máy trước, hỏi lại ở nền»); trang chưa có bản → `/ngoai-mang` (ADR-0150) | ADR Đ3 vòng 3 |
| Q-9 | Dọn `public/js/*.js` và tệp kê trước mỗi lần dựng (xoá gói mồ côi như `danh-muc-giay-to.js` 28/9). `web/` **không có** `import()` động (đo 29/10), mọi gói con nạp tĩnh lúc mở trang, nên tab đang mở xuyên lần triển khai không cần cơ chế tải lại. Cửa sổ lệch còn lại: HTML cũ do SW cũ trả từ cache trong lúc SW mới đang cài (vài giây) vẫn lấy gói con cũ từ **cache cũ** (chưa bị xoá vì `activate` chưa chạy) — chấp nhận, không thêm cơ chế; `mat-mang-smoke` chạy lại để chứng minh | Rủi ro 3 phụ lục A; `web/shell.ts` không có `import(` |
| Q-10 | Tải trước phông chỉ BVP 400/500/600 có `crossorigin`; công ty chọn phông khác qua `/giao-dien.css` thì ba thẻ này thừa ≈ 84 KB — chấp nhận (công ty hiện dùng BVP) | ADR Đ2 |
| Q-11 | Speculation Rules bằng **tệp tĩnh** `public/speculation-rules.json` + header `Speculation-Rules: "/speculation-rules.json"` cho mọi HTML trong `public/_headers` (và `Content-Type: application/speculationrules+json` cho tệp đó); nội dung: `prefetch`, `where: { and: [{ href_matches: "/*" }, { not: { href_matches: "/api/*" } }] }`, `eagerness: "moderate"`; **không** `prerender`. Không dùng `<script type="speculationrules">` nội tuyến vì CSP `script-src 'self'`. Trình duyệt không hỗ trợ bỏ qua; kết quả thử ghi vào bằng chứng, **không chặn nghiệm thu** | ADR Đ4; `_headers` hiện CSP không nonce |
| Q-12 | View Transitions: `@view-transition { navigation: auto; }` trong `app.css` sau dấu mốc PWA; `view-transition-name: thanh-tren` cho `#topbar`, `thanh-tab` cho `#tabbar`, `thanh-ben` cho thanh bên; `::view-transition-old(root)`/`::view-transition-new(root)` thời lượng `var(--m-base)` (300 ms, `app.css:59`) với `var(--ease-out)` (`app.css:554`) — đúng tên ADR, không dùng `--t-vua`; `@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }`. Mỗi tên chỉ gán cho một phần tử trên trang (bài kiểm e2e đếm) | ADR Đ5 |
| Q-13 | Khung xương tĩnh theo **khuôn**: bảng `src/shared/khuon-trang.ts` (`KHUON: Record<đường, "danh-sach"\|"chi-tiet"\|"bieu-mau"\|"bang-dieu-khien"\|"thiet-lap"\|"khong">`, lấy từ `KIEM-KE.md` mục 5; `/login`, `/404`, `/ngoai-mang`, hai trang chuyển hướng = `khong`; bài kiểm: mọi `PAGES` có khuôn). Bộ sinh ghi `data-khuon="<khuôn>"` lên `<body>` của **mọi** trang — 6 trang đã tự khai `data-khuon="bieu-mau"` (`ban`, `chuyen-sua`, `chup-bu`, …) phải **khớp** bảng, lệch thì bộ sinh dừng — rồi chèn vào `<main>` (có sẵn ở cả 50 HTML) một `<div class="xuong-trang" data-xuong-tinh aria-hidden="true">` (CSS chọn theo `body[data-khuon=…] .xuong-trang`) lấy từ `web/html/_xuong/<khuon>.html` (bên trong dùng lớp `.xuong` đã có với `data-khuon="so"\|"vien"` cho từng mảnh; **không** đặt `.xuong` lên vỏ vì lớp đó là một mảnh, `app.css:4017`) (một mẫu mỗi khuôn, cùng lưới với thân thật: danh sách = ô tìm + 6 dòng; chi tiết = dải tóm tắt + 5 khối; biểu mẫu = 5 ô có nhãn; bảng điều khiển = 4 ô số + 1 khối; thiết lập = 4 dòng) và `aria-busy="true"` trên `main`. Trang chủ và Đơn hàng giữ `#loading` riêng (đã cùng lưới): nguồn ghi `data-xuong="rieng"` để bộ sinh bỏ qua | ADR Đ6; bộ dò của `do-toc-do.mjs` nhận `aria-busy=true` |
| Q-14 | Gỡ khung xương **tự động** ở shell: `MutationObserver` trên `main` (`childList`, bọc `typeof MutationObserver !== "undefined"` cho DOM giả), nút đầu tiên được thêm mà không phải `[data-xuong-tinh]` ⇒ gỡ khung xương + bỏ `aria-busy`; đồng thời `trangThaiToanTrang` và `veThanNgoaiMang` gỡ tường minh. Không sửa 46 tệp trang | Giữ phạm vi hẹp; R7 «vùng rỗng ẩn hẳn» |
| Q-15 | **Giữ chỗ khung từ HTML tĩnh**: nguồn HTML khai trên `<body>` thuộc tính mới `data-khung="co"` (mọi trang có khung) hoặc `"khong"` (login, ngoài mạng, 404, hai trang chuyển hướng); `data-tabbar="off"` giữ như nay (4 trang). `app.css` chừa trước **theo khổ màn** cho `body[data-khung="co"]`: chiều cao thanh trên (`--bar-h` + vùng an toàn), chỗ thanh tab ở ≤ 899 (trừ `data-tabbar="off"`), và cột thanh bên `--w-sidebar` ở ≥ 900 — các luật `body.has-sidebar …` ở khối ≥ 900 (`app.css:1313–1345`, `2246–2263`, `4061`) đổi bộ chọn thành `body:is(.has-sidebar, [data-khung="co"])`, `has-sidebar`/`has-tabbar` JS vẫn gắn như cũ. Nhánh mất mạng không có staff (`web/shell.ts:487`, lý do của ghi chú «không để lưới 236px trống») đặt thêm `body.dataset.khung = "khong"` để cột gập lại — một lần dịch trong trạng thái lỗi là chấp nhận được. Khung tạm từ bản nhớ (ADR-0035 điều 3) giữ nguyên, chỉ còn là nội dung của vùng đã chừa | CLS ≤ 0,1 mọi trang (tiêu chí 11.6); rủi ro 5 phụ lục A |
| Q-16 | N1 nợ đợt 0: (a) mã đơn bị cắt ở thanh trên 390 → Chi tiết đơn đặt tiêu đề thanh trên là «Đơn hàng», mã đầy đủ vẫn ở thẻ tóm tắt (không đổi luật «tiêu đề một dòng» của cổng 2b); (b) ba kiểu huy hiệu thanh bên (`sidebar-item-badge*`) đổi sang `.huy-hieu` v2 cỡ 12 px, một kiểu; (c) CLS Trang chủ / Đơn hàng → G6 + Q-15 | Biên bản cổng phát hành đợt 0, câu 3 |
| Q-17 | Đo trước/sau theo ADR mục «Cách đo»: chép `do-toc-do.mjs`, `so-toc-do.mjs`, `do-co-goi.sh` (bản 27/10 và 29/10) sang `docs/evidence/<ngày>-dot-0b-khung-tai/kich-ban/`, thêm `--kho 390\|1040` cho phần mở trang, bộ dò khung xương thêm `[data-xuong-tinh]`; «trước» = `main` ngay trước khi gộp 0b ở **cả hai khổ**; «sau» = nhánh 0b cùng phiên, cùng máy, máy rảnh (tải trung bình < 3). Kịch bản đã «kẹp» chờ cache ổn định giữa lượt lạnh và nóng (`do-toc-do.mjs:118`); sau 0b cache còn tăng ở vòng 2 sau đăng nhập, nên mốc chờ = số mục cache không đổi trong 2 s, ghi số mục đã vào cache vào bằng chứng | ADR «Cách đo» 1–3 |
| Q-18 | ADR-0035 điều 1 ghi «thay bởi ADR-0143 từ 0b» ở dòng trạng thái (không sửa nội dung); ADR-0150 giữ; `docs/CHANGE-GUIDE.md` công thức c cập nhật: trang mới = `web/html/<trang>.html` + `scripts/diem-vao.mjs` + `PAGES` + `KHUON` + lối vào `muc-giao-dien.ts`; `PRECACHE` không còn chép tay | ADR «Hệ quả» |
| Q-19 | Số phiên bản tạm 2.48 (kiểm lại ở A.0 lúc phát hành); không migration; cửa hai chiều: gỡ bằng một commit đảo + một lần triển khai | ADR «Loại/Cửa» |

## 3. Câu xin chủ

Không có. Ba điều chủ **cần biết** khi duyệt (không phải câu hỏi): (1) từ đợt này trang mới viết ở `web/html/`, `public/*.html` do máy sinh (công thức c đổi); (2) hệ quả mất mạng chủ đã nghe ở cổng 1: trang chưa từng mở và không thuộc thanh tab của vai sẽ hiện trang «Không có kết nối mạng» thay vì bản cũ; (3) ở cổng phát hành 0b chủ thử tay trên iPhone mục 8 `docs/PWA-IPHONE.md` (tắt app, bật tắt chế độ máy bay, mở lại: khung ≤ 1 s; bấm Đơn → Tôi không chớp).

## 4. G1 — Tách gói chung và tệp kê (Đ1)

- `scripts/diem-vao.mjs`: `export const DIEM_VAO = ["web/login.ts", …, "web/ngoai-mang.ts"]` (48 mục, thứ tự như `build:web` hôm nay); `export const COT_SW = "web/sw/sw.ts"`.
- `scripts/dung-web.mjs`: (1) xoá `public/js/*.js` và `public/js/danh-sach-goi.json`; (2) `esbuild.build({ entryPoints: DIEM_VAO, bundle, splitting: true, format: "esm", target: "es2022", minify, chunkNames: "chung-[hash]", outdir: "public/js", metafile: true, define: { __BUILD_ID__, __APP_VERSION__, __APP_RELEASE_DATE__ } })`; (3) `sinhDanhSachGoi(metafile)` → `public/js/danh-sach-goi.json` (Q-2; hàm thuần ở `scripts/danh-sach-goi-lib.mjs`, có bài kiểm với metafile mẫu: bao đóng đúng, không trùng, lá trước); (4) sinh HTML (G2); (5) `sinh-so-do-trang.mjs` (đọc `public/*.html` vừa sinh, giữ nguyên); (6) esbuild `sw.ts` iife, nhúng tệp kê bằng `import danhSach from "../../public/js/danh-sach-goi.json"` (esbuild `loader: json`).
- `src/shared/sw-policy.ts`: bỏ danh sách `/js/*.js` chép tay; `PRECACHE` thành hàm `precacheVong1(danhSach)` = `PAGES_VONG_1` (4 trang) ∪ bao đóng JS của chúng ∪ tĩnh (css, manifest, icon, 3 phông). `PAGES` giữ (bài so với `public/*.html` chuyển sang so với `web/html/*.html` + hai trang chuyển hướng). `STATIC_FILE` giữ (đã nhận `js/chung-….js` và `js/danh-sach-goi.json`? — **không**: tệp kê không cần vào cache, SW đã nhúng).
- Bài `sw-policy.test.ts`: thay đoạn đọc `build:web` bằng regex (dòng 122) bằng đọc `DIEM_VAO`; mọi điểm vào có trang tương ứng trong `PAGES`; bài mới dùng tệp kê mẫu `src/shared/__fixtures__/danh-sach-goi.json` (sinh một lần từ dựng thật, chép vào kho, có bài so «tệp mẫu lỗi thời» chỉ chạy khi `public/js/danh-sach-goi.json` tồn tại).
- `src/goi-trang-nhe.test.ts` theo Q-5 (dựng một lần cho cả 48 điểm vào vào `mkdtemp`, đọc metafile).

## 5. G2 — HTML sinh từ nguồn, `<head>` chung (Đ2)

- Di chuyển 50 tệp `public/*.html` → `web/html/*.html` (`git mv`, giữ lịch sử), rút phần head chung ra `web/html/_head.html`; nguồn trang chỉ còn `<title>`, thuộc tính `<body>` (nếu có: `data-tabbar`, `data-khuon`, `data-xuong`), thân. Hai trang chuyển hướng (`home.html`, `danh-muc-giay-to.html`) sinh nguyên văn.
- `scripts/sinh-html-lib.mjs` `sinhHtml({ nguon, head, danhSach, khuon, xuong })` (thuần, có bài kiểm): ghép head chung + `<title>` + modulepreload (bao đóng của trang, thứ tự tệp kê) + 3 preload phông + thân, chèn khung xương (G6). `public/*.html` vào `.gitignore`; `tests/e2e/pwa.mjs` `NEEDLES` và `src/giao-dien-the-link.test.ts` đọc `public/` sau khi dựng (giữ cặp link liền nhau), `src/shared/sw-policy.test.ts` so `PAGES` với `web/html`.
- `scripts/chay-test.mjs` bước 0 chạy thêm sinh HTML (nhanh, không cần esbuild? — cần tệp kê; nếu `public/js/danh-sach-goi.json` chưa có thì sinh HTML **không** modulepreload và bài kiểm liên quan bỏ qua có ghi; `npm run build:web` trước `npm test` là điều kiện đã có ở `trien-khai`).
- Bài kiểm (`src/html-sinh.test.ts`): mọi HTML sinh ra có đúng 3 preload phông, modulepreload đủ bao đóng, cặp `app.css`+`giao-dien.css` liền, `<title>` đúng, `data-khuon` khớp `KHUON`.

## 6. G3 — Nạp sẵn theo vai (Đ3; thay điều 1 ADR-0035)

- `web/sw/sw.ts`: `install` = `precacheVong1(danhSach)` với `cache: "reload"`; thêm `self.addEventListener("message", …)`: `loai === "nap-theo-vai"` và `buildId === CACHE_VERSION` ⇒ `napTheoVai(trang)`: với mỗi trang trong `trang` ∩ `PAGES`: trang + bao đóng JS (tệp kê) → `cache.match` chưa có thì `cache.add` tuần tự, lỗi từng tệp bỏ qua (`allSettled`), không chặn `fetch`. `activate` giữ (xoá cache khác tên).
- `src/shared/nap-theo-vai.ts`: `trangTheoVai(staff): readonly string[]` (Q-7); bài 1024 tập quyền + ca `khungNho` (không gửi gì).
- `web/shell.ts` `initShell`: sau `/api/auth/me` thành công và `luuKhungNho`: gửi message (bọc `typeof navigator !== "undefined" && navigator.serviceWorker?.controller`). Lần đăng nhập đầu sau cài: `controller` có thể `null` (SW vừa `claim`) → nghe `navigator.serviceWorker.ready` rồi gửi một lần.
- Bài `src/sw-nap-theo-vai.test.ts` (mẫu `src/sw-ngoai-mang.test.ts`, chạy `sw.ts` trong `vm` với tệp kê mẫu): (1) install chỉ thêm vòng 1 (≤ 30 mục); (2) message đúng buildId ⇒ cache có trang + JS của vai; sai buildId ⇒ không; (3) trang chưa nạp + mất mạng ⇒ `/ngoai-mang`; trang đã nạp theo vai + mất mạng ⇒ trả bản cache.
- ADR-0035 dòng trạng thái: «Điều 1 thay bởi ADR-0143 (đợt 0b, <ngày>)».

## 7. G4 — Speculation Rules (Đ4) · G5 — View Transitions (Đ5)

- G4 theo Q-11: tệp `public/speculation-rules.json`, hai khối trong `public/_headers` (`/*.html`? Workers Assets khớp đường không đuôi: dùng `/*` kèm điều kiện? — kế hoạch kiểm cú pháp `_headers`: header `Speculation-Rules` đặt cho `/*` là chấp nhận được vì tệp tĩnh khác bỏ qua header này). Kiểm: kịch bản Chrome đọc `performance.getEntriesByType("navigation")` + `document.prefetch`? — dùng `chrome://` không được; đo bằng CDP `Preload.*` nếu có, hoặc đếm yêu cầu `Sec-Purpose: prefetch` ở máy chủ thử (`may-chu.mjs` ghi log). Ghi kết quả «chạy / không chạy» vào bằng chứng, không chặn.
- G5 theo Q-12; bài e2e: mỗi `view-transition-name` xuất hiện ≤ 1 lần trong DOM mỗi trang (đọc qua kịch bản Chrome `dot-0b-smoke`); không lỗi console ở Chrome; Safari cũ bỏ qua.

## 8. G6 — Khung xương tĩnh và giữ chỗ khung (Đ6)

- Theo Q-13, Q-14, Q-15. CSS khung xương dùng ba token `--skel-dong` 16 / `--skel-so` 26 / `--skel-vien` 96 (đã có, `app.css` 598–600) và lớp `.xuong[data-khuon]` (mở rộng khối «Thành phần chung v2», chỉ token); không thêm `--skel-*` mới.
- Trang tự vẽ trước shell (`/help`, `<main data-ve-truoc-shell>`): bộ sinh vẫn chèn khung xương; trang gỡ khi vẽ xong qua cùng observer.
- `trangThaiHeThong("dang-tai")` (`web/trang-thai-he-thong.ts:52`) **không** dùng cho khung xương tĩnh (nó dựng bằng JS, đến muộn); giữ cho chỗ gọi tương lai, sửa lệch `data-khuon` (phụ lục A mục 7) trong D1.
- Giữ chỗ khung (Q-15): luật CSS theo `@media` ở các mốc 899/900 đã có; `body[data-khung="co"]` chừa chỗ thanh trên, thanh tab (≤ 899, trừ `data-tabbar="off"`) và cột thanh bên (≥ 900, lưới `grid-template-columns: var(--w-sidebar) minmax(0,1fr)` như `app.css:1319`); khi JS dựng xong khung thật, số đo không đổi → CLS 0 cho phần vỏ. Bài kiểm: Chrome chặn JS (`Network.setBlockedURLs` `*/js/*`) rồi đo `getBoundingClientRect` của `main` ở 390 và 1040, so với lúc JS chạy xong: lệch ≤ 1 px.

## 9. N1 — Nợ đợt 0 · D1 — Đo, bài kiểm, tài liệu

- N1 theo Q-16; bài: `src/thanh-tren-tieu-de.test.ts` (Chi tiết đơn `barTitle` = «Đơn hàng»), bài CSS đếm `sidebar-item-badge` = 0 sau dấu mốc PWA.
- D1: (1) bằng chứng `docs/evidence/<ngày>-dot-0b-khung-tai/` (README nêu khác biệt kịch bản, `so-lieu/toc-do-truoc-390.json`, `-1040`, `toc-do-sau-*`, `co-goi-truoc.txt`, `co-goi-sau.txt`, `nap-san-truoc.txt` (108 mục / byte nén), `nap-san-sau.txt`, bảng so sánh); (2) `dot-0b-smoke.mjs` (Chrome, AXE_JS): bước a) mọi HTML có modulepreload/preload; b) cài SW → đếm mục cache vòng 1 ≤ 30; c) đăng nhập Bán hàng → chờ ≤ 10 s → cache có `/orders`, `/order-form`, `/parties`, `/account` + JS; d) mất mạng: `/xe` (không thuộc vai) → trang ngoài mạng; `/orders` → mở được; e) khung xương tĩnh hiện trước JS (chặn JS bằng CDP `Network.setBlockedURLs` rồi chụp); f) view-transition-name ≤ 1/tên; g) 404 có vỏ, `/api/*` không vào cache; (3) chạy lại: `dot-0-smoke` (20 bước), `mat-mang-smoke` (sửa cho tệp kê), `trang-chu-smoke`, `tests/e2e -- pwa`, `sw-ngoai-mang.test`; (4) tài liệu: `web/CLAUDE.md` (dựng web, tệp kê, khung xương, nạp theo vai), `docs/CHANGE-GUIDE.md` công thức c, `docs/PWA-IPHONE.md` mục 8, `docs/SO-HANG-RAO.md` (ngân sách gói, tệp kê khớp build, danh sách theo vai), `docs/BACKLOG.md` §53 cập nhật nợ đã trả, ADR-0035 dòng trạng thái, ADR-0143 dòng «thi công đợt 0b <ngày>», nhật ký thay đổi 2.48 tạm, nhật ký thi công `docs/superpowers/plans/<ngày>-dot-0b-khung-tai-nhat-ky.md`.

## 10. Không làm trong đợt 0b

Gộp lời gọi API · «lưu xong báo ngay» · `prerender` · thân trang (Chặng 3) · khoá phóng · đổi mốc màn hình · đổi `/api/*` hay ba lớp cache (`isCacheable`) · đổi `CACHE_NAME` theo cách khác · bỏ bí danh token · dark mode · đổi phông mặc định · chuyển sang một trang duy nhất (ADR-0035 điều 4).

## 11. Tiêu chí nghiệm thu (mặc định KHÔNG ĐẠT nếu thiếu bằng chứng)

1. Nạp sẵn lúc cài ≤ 30 mục và ≤ 0,5 MB nén (`nap-san-sau.txt`; trước: 108 mục ≈ 1,9 MB).
2. Ngân sách gói Q-5 (a)–(f) xanh; tổng JS thô giảm ≥ 60 % so với 5,4 MB.
3. Mọi HTML sinh ra có đủ modulepreload bao đóng + 3 preload phông; cặp css liền nhau (bài G2).
4. Mở trang lạnh ở **390 và 1040**: FCP và «khung xong» không xấu đi > 10 % ở bất kỳ trang nào; **trung vị FCP lạnh giảm ≥ 150 ms** ở cả hai khổ so với «trước» đo cùng phiên.
5. Chuyển trang nóng: «khung xong» ≤ 100 ms; không chớp trắng (kiểm khung hình `do-toc-do.mjs`).
6. CLS lạnh ≤ 0,1 ở **mọi** trang (trước: 12/45 > 0,1; Trang chủ 0,322, `/orders` 0,094–0,168).
7. Bài kiểm: tệp kê khớp build; `trangTheoVai` 1024 tập ⊂ `PAGES`; ba lớp `sw-policy`; `pwa.mjs`; `sw-nap-theo-vai.test` ba ca; `sw-ngoai-mang.test`; DOM giả `scripts/chup-muc-giao-dien.mjs --so-sanh` chạy được.
8. `dot-0b-smoke` a)–g) xanh có axe; `dot-0-smoke` 20/20; `mat-mang-smoke` A/B/C.
9. `npm test`, `typecheck`, `build:web`, `test:e2e -- pwa` xanh; changelog chỉ trong `help.js`.
10. N1: mã đơn không bị cắt (ảnh 390 Chi tiết đơn); huy hiệu thanh bên một kiểu (ảnh 1040).
11. Speculation Rules: kết quả thử ghi (chạy / không), không chặn. View Transitions: không lỗi console Chrome; Safari 17 vẫn chuyển trang bình thường (kiểm tay).
12. Chủ thử tay iPhone mục 8 `PWA-IPHONE.md` tại cổng phát hành 0b.

## 12. Kiểm máy và kịch bản phải chạy lại
`npm test` (gồm bài mới G1/G2/G3/G6/N1) · `npm run typecheck` · `npm run build:web` · `npm run test:e2e -- pwa` · `dot-0b-smoke` · `dot-0-smoke` · `mat-mang-smoke` · `trang-chu-smoke` · `v1-dang-nhap` (bản chép) · `do-toc-do` trước/sau hai khổ · `do-co-goi`.

## 13. Cổng phát hành đợt 0b
Như đợt 0 (đặc tả đợt 0 mục 12): bản local `node scripts/dev-iphone.mjs` (7 tài khoản) + `wrangler dev` localhost để thử mất mạng; phiên kiểm độc lập lập `SO-SANH-TRUOC-SAU.md` theo bộ đo Chặng 1 + bảng K hai khổ; trang lời thường cho chủ (≤ 3 câu); chủ «duyệt» → `day-len` → `trien-khai`.

## 14. Chạm gì ngoài bề mặt — phải ghi rõ
Cách dựng (`build:web` → `dung-web.mjs`, `diem-vao.mjs`); `.gitignore` (+`public/*.html`; tệp kê đã nằm dưới `public/js` vốn bị bỏ qua); 50 tệp HTML đổi chỗ; `public/_headers` (+2 header); service worker (`message`, vòng 1 thu hẹp) — ADR-0035 điều 1 thay; `wrangler.jsonc` **không** đổi (`run_worker_first` giữ `/__scheduled`); không chạm API, quyền, D1, cách tính tiền.

## 15. Điểm còn mơ hồ — kế hoạch chốt bằng cách đọc mã (không hỏi chủ)
Đã chốt 29/10 khi soạn bản 1 (đọc mã): `<main>` có sẵn ở 50/50 HTML (Q-13); token chuyển động dùng `--m-base`/`--ease-out` đang có (Q-12); `web/` không có `import()` động (Q-9); `.gitignore` đã che `public/js` (mục 14). Còn lại:
1. `data-khuon="bieu-mau"` hiện ở `<body>` của 6 trang (đã chốt: Q-13 dùng chung thuộc tính này cho mọi trang); kế hoạch kiểm 6 trang ấy có đúng khuôn «biểu mẫu» theo `KIEM-KE.md` mục 5 không, và luật CSS nào đang bám `body[data-khuon="bieu-mau"]` để không đổi hành vi.
2. Khung xương tĩnh và khung tạm từ bản nhớ cùng tồn tại trong lúc chờ `/api/auth/me`: thứ tự gỡ (observer gỡ khi thân thật xuất hiện, không gỡ khi chỉ khung tạm thay đổi — khung tạm nằm ngoài `main`).
3. `pwa.mjs:116` tìm chữ thương hiệu trong `/js/orders.js` → đổi sang gói con chứa `shell.ts` (đọc từ tệp kê).
4. `muc-chup-bu.test.ts:37` đòi `/js/chup-bu.js` trong `PRECACHE` → đổi sang «có trong tệp kê».
5. Cú pháp `_headers` của Workers Assets cho header `Speculation-Rules` trên đường không đuôi.
6. `sinh-so-do-trang.mjs` đọc `public/*.html` (đã sinh) hay `web/html` — giữ đọc `public/` sau bước sinh.
7. Kịch bản `do-toc-do.mjs` «lạnh» có bản nhớ khung hay không (quyết CLS «trước» đo cái gì) — ghi rõ trong README bằng chứng, không đổi kịch bản.
8. Vòng 2 khi `controller` null ngay sau cài (Q-7) — thứ tự `ready` / `claim`.
9. Số cuối của ngân sách gói Q-5 sau khi dựng trên mã thật (ghi vào bài + SO-HANG-RAO).

## Phụ lục
- A — Bản đồ mã (phiên con chỉ đọc, 29/10, `main` 25f127d1): `PHU-LUC-A-BAN-DO-MA.md`.
- B — Dựng thử tách gói chung (29/10): `PHU-LUC-B-DUNG-THU-TACH-GOI.md`.
