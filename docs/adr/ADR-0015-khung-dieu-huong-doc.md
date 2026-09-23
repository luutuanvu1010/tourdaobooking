# ADR-0015 — Khung điều hướng dọc (thanh bên) thay thanh ngang; Trang chủ thành trang mặc định

- **Trạng thái:** **proposed** (AI soạn 2026-09-23, chờ chủ dự án duyệt). Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-23   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa hai chiều** về mã (gỡ được bằng một commit, không đụng dữ liệu/schema/quyền), nhưng **một chiều về thói quen người dùng và địa chỉ đã lưu** (đổi `/` đổi cả biểu tượng PWA đã cài trên iPhone của nhân viên)
- **Liên quan:** đặc tả thiết kế lại giao diện `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` §6 (khung trang dùng chung), §16 mục 3 (số đo khung đã chốt: thanh đầu 60px, nội dung 1200px, mốc 900px); quyết định chủ dự án `docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md` mục A và B (2026-09-23 chiều); mockup `docs/design/mockup-by-ClaudeDesign/00 Trang chu v2.dc.html`; ADR-0007/0009/0014 (bản đồ quyền quyết định mục nào hiện cho ai)

## Bối cảnh

App hiện dùng **thanh điều hướng ngang** (`#topbar` + `nav.topnav`, `web/shell.ts`) cho máy tính và **thanh tab dưới đáy** (`#tabbar`) cho điện thoại. Khung này dùng chung cho cả 12 trang và đã qua ba đợt restyle (Bước 1, Đợt A/B/C), đã lên production 2026-09-22 và 2026-09-23.

Bản thiết kế `00 Trang chu v2.dc.html` — chủ dự án đã chọn phương án này, không phải phương án lưới icon — vẽ một kiến trúc điều hướng **khác hẳn**: thanh bên dọc rộng 236px, nền `--c-primary-strong`, chia ba nhóm (BÁN HÀNG / QUẢN TRỊ / TÔI), mỗi mục có icon 18px, huy hiệu số đếm bên phải (42 đơn, 1 dịch vụ đổi giá, 2 góp ý), và chân thanh có avatar + tên + vai người đăng nhập. Thanh trên của vùng làm việc chỉ còn breadcrumb tên trang + ô tìm kiếm + nút đỏ "Lập đơn mới".

Khi thi công Trang chủ mới (2026-09-23 sáng), AI đã tự quyết **không dựng thanh bên** với lý do "đổi điều hướng toàn app là việc lớn hơn phạm vi thêm một trang", và chủ dự án khi đó đồng ý hoãn. Sau khi xem kết quả thật, chủ dự án kết luận trang lệch mockup quá nhiều và **đảo quyết định**: làm đúng bản mẫu, kể cả thanh bên dọc; đồng thời Trang chủ phải là trang mặc định khi mở app.

Đây là quyết định kiến trúc giao diện chạm cả 12 trang và PWA, nên theo `CLAUDE.md` §3 (N3) phải có ADR do chủ dự án duyệt, không nhét vào kế hoạch của một trang.

## Quyết định

1. **Máy tính (≥900px): thanh bên dọc thay thanh ngang.** `web/shell.ts` dựng `<nav id="sidebar">` rộng `--w-sidebar` (236px) thay cho `nav.topnav` bên trong `#topbar`. Ba nhóm đúng mockup; mục nào hiện cho ai vẫn do bản đồ quyền quyết định (`isOffice`, `hasPermission(staff,"ADMIN")`, `can(staff,"order.create")`) — **ADR này không đổi một ô nào của bản đồ quyền**.
2. **Điện thoại (<900px): giữ nguyên thanh tab dưới đáy đang chạy.** Mockup ghi "sidebar thành tab bar" và bản thân mockup điện thoại không vẽ thanh bên. Giữ `#tabbar` hiện có là cách rẻ nhất, đúng mockup, và không đụng đến thứ nhân viên đang dùng hằng ngày trên iPhone. Thanh đầu trang điện thoại bổ sung avatar chữ cái đầu (mockup có) bên phải.
3. **`#topbar` ở máy tính thu lại thành thanh công việc**: breadcrumb tên trang (thay tiêu đề H1 to trong nội dung), ô tìm kiếm, nút "Lập đơn mới". Ô tìm kiếm và nút chỉ hiện với người có quyền tương ứng.
4. **Trang mặc định `/` đổi thành Trang chủ**, trang Đơn hàng dời sang `/orders`. Thực hiện bằng **đổi tên tệp tĩnh** (`public/index.html` → `public/orders.html`, `public/home.html` → `public/index.html`), vì `/` do Workers Assets ánh xạ thẳng `public/index.html` (`wrangler.jsonc`, `"assets": {"directory": "./public"}`) và **không có mã router nào cho `/`**. Giữ `/home` như một địa chỉ chuyển hướng nhẹ về `/` cho ai đã lưu liên kết.
5. **Huy hiệu số đếm trên thanh bên chỉ hiện khi đã có nguồn dữ liệu thật.** Góp ý đã có (`GET /api/feedback/badge`). Số đơn (42) và số dịch vụ đổi giá (1) chưa có API đếm — hoặc bổ sung trong đợt này, hoặc **không vẽ huy hiệu rỗng**; tuyệt đối không hiện số giả cho khớp mockup.

## Lý do

- Mockup là tài sản thiết kế **chủ dự án đã duyệt**; ba đợt trước đều lấy nó làm chuẩn. Giữ thanh ngang trong khi mockup vẽ thanh bên khiến trang chủ trông "chưa làm xong" dù mọi số liệu đều đúng — đúng phản ứng của chủ dự án.
- Thanh ngang hiện đã quá tải: admin có 9 mục, nhãn xuống 2 dòng ở khổ hẹp (thấy rõ trong ảnh bằng chứng `trang-chu-may-tinh.png`). Thanh bên dọc giải quyết luôn vấn đề này và còn chỗ cho huy hiệu số đếm.
- Giữ nguyên thanh tab điện thoại là điểm dừng an toàn: phần lớn nhân viên dùng iPhone, và đó là bề mặt đã được kiểm nhiều vòng (Đợt C đo tab bar 59px/72px). Đổi cả hai cùng lúc nhân đôi rủi ro mà không được gì thêm.
- Đổi `/` bằng đổi tên tệp tĩnh là cách ít mã nhất: không thêm route, không thêm chuyển hướng ở Worker, không đụng `wrangler.jsonc`.

## Phương án bị loại

- **Giữ thanh ngang, chỉ bổ sung nội dung còn thiếu của Trang chủ.** Rẻ hơn nhiều, nhưng không đạt điều chủ dự án yêu cầu sau khi đã xem kết quả; dáng vẻ tổng thể vẫn khác mockup.
- **Dựng thanh bên cho CẢ điện thoại (ngăn kéo trượt).** Mockup không vẽ; thêm một bề mặt tương tác mới phải kiểm lại từ đầu trên 12 trang; nhân viên đang quen thanh tab.
- **Chuyển hướng `/` → `/home` ở Worker thay vì đổi tên tệp.** Workers Assets phục vụ tệp tĩnh trước khi tới mã Worker (trừ khi bật `run_worker_first`), nên phải đổi cấu hình `wrangler.jsonc` — rủi ro cao hơn hẳn việc đổi tên hai tệp, và thêm một lần chuyển hướng cho mọi lần mở app.
- **Để Trang chủ ở `/home` và chỉ đổi liên kết trong app.** Không đạt yêu cầu "mở app là vào Trang chủ": biểu tượng PWA đã cài trên iPhone có `start_url: "/"`, vẫn mở ra trang Đơn hàng.
- **Vẽ huy hiệu số đếm bằng số giả cho giống mockup.** Vi phạm nguyên tắc không bịa dữ liệu; số sai còn tệ hơn không có số.

## Hệ quả

- **`web/shell.ts` viết lại phần điều hướng** — tệp khung dùng chung của cả 12 trang. Mọi trang đều phải chạy lại kịch bản Chrome.
- **CSS bố cục của cả 12 trang đổi**: nội dung nay nằm bên phải thanh bên 236px ở máy tính, `main` không còn căn giữa theo `--w-main` như cũ.
- **11 kịch bản Chrome đang mở `/` để vào trang Đơn hàng** phải sửa sang `/orders` (`docs/evidence/2026-09-19-pwa/` ×4, `2026-09-20-a2/` ×2, `2026-09-21-v1-0/` ×4, `2026-09-23-trang-chu-moi/` ×1).
- **`src/shared/sw-policy.ts`**: `PAGES` thêm `/orders`; `PRECACHE` đổi `/js/orders.js` sang nạp sẵn cả Trang chủ.
- **`manifest.webmanifest`** giữ `start_url: "/"` — không đổi, vì `/` vẫn phục vụ, nay ra Trang chủ. Máy đã cài biểu tượng **không phải cài lại**.
- **Người dùng thấy trang khác khi mở app.** Cần báo trước cho nhân viên; nên deploy trong cửa sổ bảo trì.
- Service worker đang cache `/` (đã precache). `CACHE_VERSION` do build tự chèn nên sẽ đổi khi deploy, cache cũ bị xoá — nhưng lần mở đầu tiên sau deploy vẫn có thể thấy bản cũ nếu service worker chưa kịp thay. Không có cách tránh, chỉ cần biết trước.
- Bảng "sửa tệp nào → chạy kịch bản nào" ở `web/CLAUDE.md` phải cập nhật (tệp luật — chủ duyệt).
