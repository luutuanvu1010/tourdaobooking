# Rà soát nhánh PWA iPhone theo Hiến pháp và ràng buộc của tourdaovn

Ngày 2026-09-19. Nhánh `worktree-pwa-iphone`. Yêu cầu của chủ dự án: rà xem nhánh có đúng triết lý và quy tắc quy định trong dự án `tourdaovn` không.

**Căn cứ đã đọc:** `tourdaovn/CLAUDE.md`; `playbook/CONSTITUTION.md` v2.2.0 (P1–P13, N1–N7, §5.8, §6, §7, §8); `docs/core-specs/04-CONSTRAINTS.md` (§2 điều cấm, §3 ngưỡng số, §4 bảo mật); `docs/DECISIONS.md` (khuôn bản ghi). Không tài liệu nào của `tourdaovn` nhắc tới `tourdao-sales`, PWA, service worker hay manifest, nên áp dụng **khung chung**, không có luật riêng cho ứng dụng này.

**Cách xét:** mỗi phát hiện ghi điều khoản, sự thật quan sát được, cách xử lý và bằng chứng. Bằng chứng là artifact lưu trong repo (Hiến pháp §8.2, mặc định của cổng là từ chối), không phải lời khai. Thư mục bằng chứng: `docs/evidence/2026-09-19-pwa/` (kết quả đo, kết quả kiểm giao diện, ảnh chụp, hai kịch bản).

## Phát hiện và xử lý

| Mã | Điều khoản | Phát hiện | Xử lý | Bằng chứng |
|---|---|---|---|---|
| RS1 | P6, N7; `CLAUDE.md` §8 luật cứng 1 (giá trị giao diện đi vào token) | Khối CSS PWA viết cứng 44/48/52/56/36/72px, 11px, 22,37%, `#fff` | Chuyển thành token riêng của Desk ở `:root` (chú thích rõ là không kế thừa từ tourdaovn); `pwa.mjs` quét khối PWA, không được còn màu hex hay `px` (ngoại lệ có lý do: điểm gãy `@media` và viền 1px) | `ae374f1`; phép quét đã thử làm đỏ bằng `10px, #abc` rồi gỡ |
| RS2 | P6, N7 | Tên hiển thị nhân bản ở manifest, 8 `<title>`, `apple-mobile-web-app-title`, h1 đăng nhập, brand trong `web/shell.ts`; màu theme nhân bản ở manifest và 8 thẻ `theme-color` | Bản sao là tất yếu (HTML tĩnh và JSON không import được CSS) nên đặt cổng máy: `pwa.mjs` lấy `manifest.name/short_name` và token `--c-primary` làm gốc rồi đối chiếu mọi bản sao | `e801041`; đã thử làm lệch `#0c4a6e` → `#0c4a6f` và test đỏ |
| RS3 | §6.2 (ngưỡng phải là số), §8.2 | Yêu cầu "nhanh nhất" chưa có con số nào; spec dự án đặt ngưỡng TTI di động 4G dưới 2 giây | Đo trên Chrome headless, 4G giả lập (RTT 150 ms, 1,6 Mbps, CPU chậm 4 lần), trung vị 5 lần. Xem bảng dưới. Kết luận: đạt | `ket-qua-do.json` |
| RS4 | §6.1 (khả năng tiếp cận) | axe: 0 lỗi critical/serious. Nhánh gây ra 1 lỗi mức vừa: ẩn `h1` bằng `display:none` làm 6 trang mất tiêu đề cấp 1 (`page-has-heading-one`) | Đổi sang kiểu ẩn-khỏi-mắt, `h1` còn trong cây truy cập | `06a1989`; axe chạy lại sạch |
| RS5 | P4 (spec là nguồn sự thật) | Drift: thông báo "Không có kết nối mạng…" ở `initShell()` được thêm khi kiểm trên trình duyệt nhưng chưa có trong spec | Cập nhật spec cho khớp (mục Thành phần và Ngoài phạm vi) | spec bản 2 |
| RS6 | P5, N3, Điều 7 | Các quyết định (PWA thay vì native, stale-while-revalidate, điều hướng, icon, tên) chỉ nằm trong hội thoại và bộ nhớ, chưa có bản ghi có "phương án bị loại" và phân loại cửa một/hai chiều | Thêm bảng Q1–Q8 vào spec; tên "Tour Đảo Desk" ghi là **đề xuất của AI chờ chủ dự án duyệt** (Điều 7.1: khẩu vị và bề mặt thuộc chủ dự án, P8) | spec bản 2 |
| RS7 | P2, N1 (bề mặt không đi trước cấu trúc) | Mockup dựng trước khi có bảng ánh xạ giao diện–dữ liệu. Nhưng cấu trúc đã có: các màn hình và DTO đã chạy, mockup chỉ tổ chức lại bề mặt, không thêm trường dữ liệu nào | Bổ sung bảng ánh xạ vào spec; ghi nhận thứ tự đã đảo nhẹ. N1 thuộc hạng có điều kiện (§5.8); không có dữ liệu nào bị uốn theo giao diện nên không cần Nợ hiến pháp | spec bản 2 |
| RS8 | N4 (ranh giới giữa các dự án) | Logo và màu lấy từ tourdaovn (Sanity project `pgedy374`) đưa vào `public/icons/` | Khai báo là kế thừa có ngày, sao chép, không import lúc chạy (cùng cách `app.css` đã khai báo với token); nguồn và công thức dựng ghi trong `docs/PWA-IPHONE.md` | Q4 trong spec |
| RS9 | `CLAUDE.md` §8 (không thêm dependency hay pattern mới nếu chưa có quyết định) | Không thêm dependency: `package.json` chỉ đổi hai dòng script, `package-lock.json` không đổi. Pattern mới là service worker | Đã được chủ dự án duyệt (Q1, Q2) và ghi | `git diff main..HEAD -- package.json package-lock.json` |
| RS10 | 04-CONSTRAINTS §4 (bảo mật) | `/api/*` mang dữ liệu khách và phiên: không được lưu trong cache | Ba lớp kiểm: hàm thuần `routeFor` có test; e2e xác nhận API `no-store`; đo trên trình duyệt thấy 0 mục `/api` trong cache. Không `innerHTML`, không `console.*`, không bí mật được theo dõi, CSP không đổi | `sw-policy.test.ts`, `pwa.mjs`, `ket-qua-do.json` |
| RS11 | N2, N6 (cổng trước phát hành) | Nhánh chưa được gộp hay deploy | Giữ nguyên: chủ dự án quyết định gộp và deploy. QA2 tương đương: typecheck, 55 test đơn vị, e2e 6/6, bằng chứng thư mục này | — |

## Số đo (RS3)

Trung vị 5 lần, milli-giây từ lúc bắt đầu điều hướng, 4G giả lập. "Khung" = thanh đầu trang hiện; "dữ liệu" = dòng đơn đầu tiên hiện.

| Tình huống | Khung | FCP | Dữ liệu |
|---|---|---|---|
| A. Lần đầu, nguội (chưa cache, chưa service worker) | 396 | 428 | 717 |
| B. Mở lại, KHÔNG service worker | 340 | 336 | 654 |
| C. Mở lại, CÓ service worker | 31 | 36 | 350 |

Mở lại nhanh hơn khoảng 11 lần ở phần khung và khoảng 1,9 lần ở phần dữ liệu. Cả ba đều dưới ngưỡng 2 giây của spec. **Hạn chế của phép đo:** localhost với băng thông và độ trễ giả lập, chưa phải mạng thật đến Cloudflare và chưa phải iPhone thật.

Còn lại 350 ms ở tình huống C gần như là hai lời gọi API nối tiếp (`/api/auth/me` rồi `/api/orders`). Chạy song song hai lời gọi sẽ bớt khoảng một vòng RTT. Việc này ngoài phạm vi spec đã duyệt nên **không làm**, chỉ ghi lại làm đề xuất chờ chủ dự án duyệt.

## Chưa kiểm được và nợ đã ghi

- **Chưa kiểm trên iPhone thật:** thêm vào Màn hình chính, icon sau khi iOS bo góc, thanh trạng thái, tai thỏ và thanh home, và rủi ro lớn nhất là nút "Lưu đơn nháp" `sticky` bị bàn phím iOS che (danh sách kiểm ở `docs/PWA-IPHONE.md`).
- **Tên "Tour Đảo Desk" chưa được chủ dự án duyệt.** Đổi tên là 5 chỗ và một commit.
- **Nợ có sẵn từ trước, không thuộc nhánh này:** `empty-table-header` (mức nhỏ) ở `/catalog` và `/staff` do cột thao tác có `<th></th>`; nhiều màu và cỡ chữ viết cứng ngoài khối PWA trong `app.css`; token sao chép từ tourdaovn theo ngày.
- **Chênh so với mockup:** ở chi tiết đơn, các nút hành động nằm trên huy hiệu trạng thái (do thứ tự DOM hiện có), mockup đặt sau.
- **Rủi ro đã ghi:** phiên 7 ngày cố định; trang admin trên điện thoại vẫn là bảng cuộn ngang; chế độ offline thật chưa làm.

## Dự báo xung đột khi gộp với nhánh `worktree-thong-tin-chuyen-di`

Nhánh của phiên kia hiện chỉ có spec và kế hoạch (chưa có mã). Kế hoạch A1 của họ sẽ sửa `tests/e2e/run.mjs` (dòng `const ALL`), `tests/e2e/README.md`, `docs/ARCHITECTURE.md` và `docs/SPEC-tourdao-sales.md`; hai chỗ đầu và chỗ ba trùng với nhánh này. Xung đột chỉ là cơ học: `ALL` phải chứa cả `pwa` lẫn `trip`, bảng kịch bản có cả hai dòng, hai mục cuối `ARCHITECTURE.md` giữ cả hai. Các file giao diện (`web/order.ts`, `web/order-form.ts`, `public/order*.html`) hiện chưa nằm trong kế hoạch của họ.
