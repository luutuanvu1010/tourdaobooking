# ADR-0143 — Khung tải: tách gói chung, nạp sẵn theo vai, tải trước và chuyển trang không chớp (sửa điều 1 của ADR-0035)

- **Trạng thái:** **proposed** — AI soạn 2026-10-27 theo quyết định 3 tại cổng 1 của đợt đánh giá UX tổng thể (`docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/QUYET-DINH-CONG-1.md`): chủ dự án **chỉ cho phép soạn ADR và đo**, chưa cho thi công. Thi công đợt 0 chỉ bắt đầu sau khi chủ duyệt ADR này bằng một câu riêng.
- **Ngày:** 2026-10-27.
- **Loại:** cách phát hành và service worker (việc lớn: chạm mọi trang). **Cửa:** hai chiều — không migration, không đổi API, quyền, dữ liệu hay cách tính tiền; gỡ bằng một commit đảo và một lần triển khai (service worker `no-store`, máy nhận bản gỡ ở lần mở kế tiếp, như ADR-0035).
- **Nguồn:** phát hiện H-GOI, H-TOC-DO, H-TAI-RONG, H-MAT-MANG, H-PHONG (`PHU-LUC-PHAT-HIEN.md`); đòn bẩy 1–6 ở `LO-TRINH.md` mục 3; số đo `KIEM-KE.md` mục 3 và 8, `docs/evidence/2026-10-27-danh-gia-ux-tong-the/so-lieu/toc-do.json`, `co-goi.txt`.
- **Số:** 0143 — 0141 là số lớn nhất trên `main` ngày 27/10; 0142 đang dùng ở nhánh `claude/luong-viec-theo-vai-phan-1` (chưa gộp); 0140 giữ cho nháp «đại lý tổ chức nhiều nhân viên».
- **Sửa / bổ sung:** thay **điều 1** của ADR-0035 (nạp sẵn *mọi* trang → nạp sẵn *theo vai*); giữ nguyên điều 2 (dữ liệu gọi song song, `/api/*` không vào cache), điều 3 (bản nhớ khung) và điều 4 (**không** chuyển thành một trang duy nhất). Bổ sung mục 8 danh sách thử tay ở `docs/PWA-IPHONE.md`. Không chạm ADR-0022 (Bảng tin), ADR-0034 (Thông báo).
- **Không nằm trong ADR này:** gộp lời gọi dữ liệu mỗi trang (đòn bẩy 7) và «lưu xong báo ngay, đồng bộ sau» (đòn bẩy 8) — hai việc này chạm API và luật nghiệp vụ, cần ADR riêng nếu chủ muốn; quyết định 3 tại cổng 1 nói rõ không gồm.

## Bối cảnh

Đo ngày 27/10/2026 trên Chrome giả lập 4G chậm + CPU chậm 4×, khổ 390×844, 45 trang, ba trạng thái dữ liệu (`KIEM-KE.md` mục 8):

- Mở lần đầu (lạnh): khung vẽ ở 920–1.308 ms nhưng **nội dung thật xong ở 1.110–2.011 ms, 0/45 trang đạt ngân sách 1 s** của đề bài. Mở lại (nóng): 203–938 ms, 45/45 đạt.
- Chuyển trang (nóng): vẽ 45–101 ms (đạt ≤ 300) nhưng nội dung 420–894 ms. Phản hồi chạm 10–13 ms (đạt). TBT ≈ 0 ở 44/45 trang: **CPU không phải nút thắt**.
- CLS lạnh > 0,1 ở 12/45 trang (Tôi 1,28; Chính sách điều phối 0,91; Hướng dẫn 0,80; Giao diện 0,79; Dịch vụ 0,67…) vì chỉ Trang chủ và Đơn hàng có khung xương; 7 trang chỉ có chữ «Đang tải», 36 trang không có gì.
- Nguyên nhân nằm ở **cách đóng gói và nạp sẵn** (`KIEM-KE.md` mục 3, H-GOI): mỗi trang là một gói JS riêng chứa lặp lại toàn bộ khung chung (`shell.ts`, `api.ts`, `dom.ts`, biểu tượng) — nhẹ nhất 77 KB thô / 25 KB nén, nặng nhất 365 KB / 85 KB, tổng 45 gói ≈ 5,1 MB thô; `app.css` 426 KB / 90 KB nén nạp ở cả 47 trang; service worker nạp sẵn **102 mục ≈ 1,9 MB nén** ngay lần mở đầu (`PRECACHE`, `src/shared/sw-policy.ts`), ước ≈ 10 s nền trên 4G chậm; không trang nào có `preload`, `modulepreload`, `prefetch`, Speculation Rules; `app.css` không có View Transitions. Gói `orders.js` 96.683 byte vượt trần 96.000 của ràng buộc 683 byte. Bốn họ phông khai 18 `@font-face` nhưng chỉ Be Vietnam Pro được nạp sẵn (H-PHONG).
- ADR-0035 (27/9) chọn nạp sẵn mọi trang khi app còn 14 trang (≈ 250 KB); nay 47 trang, cách đó làm lần mở đầu nặng gấp 7–8 lần và không giúp trang đang mở nhanh hơn.

Kiến trúc «mỗi trang một HTML, HTML + CSS + TypeScript thuần, không framework» **không phải** chỗ chậm và không đổi (ràng buộc PROMPT mục 5, quyết định (8) cổng 1).

## Quyết định (đề xuất)

**Đ0 — Bất biến giữ nguyên.** Dữ liệu `/api/*` không bao giờ vào cache của service worker (ba lớp ở `sw-policy.ts`); máy chủ quyết mọi quyền; `theme_color` = `--c-status-bar`; trang mới «đủ bộ» theo `docs/CHANGE-GUIDE.md` công thức c; không framework, không dependency lúc chạy (esbuild là công cụ dựng đã có); không chuyển thành một trang duy nhất (ADR-0035 điều 4).

**Đ1 — Tách gói chung bằng esbuild `--splitting --format=esm`.** `build:web` dựng 45 điểm vào như nay nhưng cho esbuild tách phần dùng chung (`web/shell.ts`, `web/api.ts`, `web/dom.ts`, `web/icons.ts`, `src/shared/*` mà nhiều trang cùng nhập) thành gói chung trong `public/js/chunks/` (tên băm theo nội dung). Mỗi trang còn phần riêng của nó; trình duyệt tải gói chung một lần và dùng lại cho mọi trang. Build ghi **danh sách tệp JS thật** ra một tệp kê (`public/js/manifest.json` hoặc tương đương) để `sw-policy.ts` và bài kiểm `PRECACHE` đọc, thay vì chép tay tên 45 gói; mẫu `STATIC_FILE` mở thêm thư mục `js/chunks/`. Ràng buộc «`web/orders.ts` không quá 96.000 byte» giữ nguyên và áp cho **gói riêng** `orders.js` sau khi tách (hiện 96.683 → dự kiến xuống dưới trần); bằng chứng ghi thêm tổng (riêng + chung) để chủ thấy số thật.

**Đ2 — Tải trước gói chung và phông.** Mỗi HTML trong `public/` có `<link rel="modulepreload">` cho gói chung và `<link rel="preload" as="font" type="font/woff2" crossorigin>` cho các tệp Be Vietnam Pro mà token độ đậm đang dùng (400, 500, 600 sau QĐ2). Phần `<head>` chung do script dựng (`scripts/sinh-so-do-trang.mjs` đã chạy đầu `build:web`, hoặc một script sinh `<head>` kế bên), không sửa tay 47 tệp; bài kiểm đối chiếu mọi HTML có đủ hai thẻ.

**Đ3 — Nạp sẵn theo vai thay cho nạp sẵn mọi trang (thay điều 1 ADR-0035).** Ba vòng:
1. *Lúc cài service worker:* chỉ khung — `app.css`, `giao-dien.css`, phông đang dùng, `manifest.webmanifest`, icon, gói chung, trang `/login`, `/` và gói riêng của hai trang đó. Ước ≈ 0,4 MB nén thay vì 1,9 MB.
2. *Sau khi `/api/auth/me` về:* trang gửi cho service worker (qua `postMessage`) danh sách trang của vai — trang đầu theo vai (`homeRedirect`, `src/shared/start-page.ts`) và các mục `THANH_TAB` của vai (`src/shared/muc-giao-dien.ts`) — service worker nạp sẵn các trang + gói riêng đó **khi rảnh**; danh sách suy từ mã một nơi, có bài kiểm «mọi trang trong `THANH_TAB` của mọi bộ quyền đều có trong danh sách nạp theo vai».
3. *Các trang còn lại:* vào cache ở lần mở đầu như hiện nay («bản trên máy trước, hỏi lại ở nền», `web/sw/sw.ts`); không nạp sẵn.

**Hệ quả khi mất mạng — chủ dự án đã nghe và vẫn chọn cả gói (QĐ3 cổng 1):** trang **chưa từng mở và không thuộc vòng 2** của vai sẽ **không** có bản trên máy; mất mạng thì Nền tảng hiện **trang mất mạng chung** (vỏ + dải «Đang ngoài mạng» + nút «Thử lại», theo thành phần DaiTren/TrangThaiRong của bộ v2) thay vì bản cũ như hôm nay. Trang đã nạp sẵn theo vai hoặc đã mở ít nhất một lần vẫn mở được ngoài mạng như trước. Đổi quyền hay đổi `THANH_TAB` thì lần đăng nhập kế tiếp nạp bổ sung; cache cũ bị xoá theo `CACHE_VERSION` mỗi bản dựng như nay.

**Đ4 — Speculation Rules cho mục thanh tab và thanh bên.** Một `<script type="speculationrules">` trong `<head>` chung: `prefetch` các liên kết cùng gốc của thanh tab / thanh bên với `eagerness: moderate` (khi rê hay chạm xuống). **Không bật `prerender`** mặc định: trang đang gọi `/api/*` lúc khởi động (kể cả nối Bảng tin, ghi nhật ký) nên dựng trước sẽ tạo lời gọi trùng và sai số đếm; chỉ thử `prerender` trong đợt đo nếu có cách chặn lời gọi API cho tới khi trang thật sự hiện (`document.prerendering`), và ghi kết quả. Chỉ Chrome/Edge; Safari iOS bỏ qua an toàn.

**Đ5 — View Transitions giữa tài liệu.** `@view-transition { navigation: auto }` trong `app.css`, `view-transition-name` cho thanh trên, thanh tab, thanh bên để ba vùng đứng yên khi chuyển trang; thời lượng `--m-base`, đường cong `--ease-out`; `prefers-reduced-motion` tắt. Safari 18+ và Chrome; nơi khác bỏ qua, không lỗi.

**Đ6 — Khung xương nằm sẵn trong HTML tĩnh.** Mỗi khuôn trang (danh sách, chi tiết, biểu mẫu, bảng điều khiển, thiết lập) có khung xương **cùng lưới với nội dung thật** viết thẳng trong HTML, hiện ngay khi HTML tới (không chờ JS), dùng ba token `skel-dong` / `skel-so` / `skel-vien` của bộ v2; mất mạng thì khung xương dừng, nhường chỗ cho dải mất mạng. Hình dáng cụ thể lấy từ bản vẽ khung chung (cổng 2b); ADR này chỉ quyết «khung xương là một phần của khung tải».

## Cách đo trước / sau (bắt buộc, cùng một phiên thi công, cùng máy)

1. **Kịch bản:** dùng đúng `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/do-toc-do.mjs` và `do-co-goi.sh`. Vì `do-toc-do.mjs` chỉ đo mở trang ở **390×844** (chuyển trang đã đo cả 390 và 1040), đợt thi công **chép** kịch bản sang thư mục bằng chứng mới `docs/evidence/<ngày>-khung-tai/kich-ban/` và thêm tham số `--kho 390|1040` cho phần mở trang; **không sửa** bản gốc (hồ sơ có ngày); README bằng chứng trỏ về bản gốc và nêu khác biệt.
2. **Điều kiện:** cùng máy chủ thử (`may-chu.mjs`, kho D1 tạm trạng thái NHIỀU của đợt 27/10 hoặc gieo lại bằng `gieo-du-lieu.mjs`), cùng mạng 4G chậm + CPU chậm 4×, chạy khi máy rảnh; mỗi khổ đo lạnh / chờ nạp sẵn / nóng, 45 trang, bộ Toàn quyền + Tài xế đối tác như lần trước.
3. **«Trước»:** chạy trên `main` ngay trước khi gộp đợt 0, ở **cả 390 lẫn 1040** (lần 27/10 chỉ có 390). **«Sau»:** chạy trên nhánh đợt 0 trong cùng phiên. Ghi hai tệp `toc-do-truoc-<khổ>.json`, `toc-do-sau-<khổ>.json`, `co-goi-truoc.txt`, `co-goi-sau.txt` và một bảng so sánh trong README bằng chứng.
4. **Chỉ tiêu nghiệm thu** (đạt hết mới mở QA2):
   - Nạp sẵn lúc cài ≤ 0,5 MB nén và ≤ 30 mục (từ 1,9 MB / 102 mục); thời gian nạp sẵn trên 4G chậm giảm tương ứng.
   - Tổng 45 gói riêng giảm ≥ 60 % so với 5,1 MB thô; gói riêng `orders.js` ≤ 96.000 byte.
   - Mọi HTML có `modulepreload` + `preload` phông (bài kiểm đếm).
   - Mở trang lạnh: FCP và «nội dung xong» **không xấu đi ở bất kỳ trang nào** (ngưỡng sai số 10 %); trung vị FCP lạnh giảm ≥ 150 ms ở cả 390 và 1040. Không đặt mốc «nội dung ≤ 1 s» cho đợt này vì chưa gộp lời gọi API.
   - Chuyển trang nóng: «khung xong» ≤ 100 ms; không chớp trắng giữa hai trang (kiểm bằng khung hình ở `do-toc-do.mjs` hoặc quay màn hình).
   - CLS lạnh ≤ 0,1 ở **mọi** trang (từ 12/45 trang > 0,1).
   - Bài kiểm xanh: `PRECACHE`/danh sách theo vai khớp build; ba lớp `sw-policy.ts`; `tests/e2e/pwa.mjs` (`theme_color`); bài mới «trang chưa nạp sẵn + mất mạng → trang mất mạng chung có nút Thử lại; trang đã nạp sẵn → mở được».
   - Chủ thử tay trên iPhone mục 8 ở `docs/PWA-IPHONE.md` (tắt app, bật tắt chế độ máy bay, mở lại: khung ≤ 1 s; bấm Đơn → Tôi không chớp).

## Hệ quả

- Lần mở đầu sau mỗi lần triển khai nhẹ đi khoảng 4–5 lần; mỗi lần bấm chỉ tải phần riêng của trang (gói chung đã có) rồi chờ dữ liệu.
- Một trang chưa mở bao giờ, không thuộc thanh tab của vai, sẽ không mở được ngoài mạng (xem Đ3). Trang chủ, trang đầu theo vai và năm mục thanh tab vẫn mở được.
- Tên gói băm theo nội dung: `sw-policy.ts` và bài kiểm đọc danh sách từ tệp kê do build sinh; thêm trang mới vẫn theo công thức c (`PAGES`, HTML, điểm vào `build:web`) và tự vào danh sách theo vai nếu có trong `THANH_TAB`.
- Speculation Rules và View Transitions chỉ có ở trình duyệt hỗ trợ; không hỗ trợ thì hành vi như hôm nay.
- Chưa chạm số lời gọi API mỗi trang (Trang chủ, Tôi 14; Chi tiết đơn 12; Tạo đơn 10): phần «nội dung xong» lạnh sẽ còn trên 1 s ở các trang này cho tới khi có ADR gộp lời gọi (nếu chủ muốn).
