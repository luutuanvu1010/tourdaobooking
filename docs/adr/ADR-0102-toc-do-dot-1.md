# ADR-0102 — Tốc độ đợt 1: tệp màu không chặn trang, gói giao diện gọn, bớt chặng chờ, quay lại app không tải lại, Smart Placement

- **Trạng thái:** **accepted** 2026-10-05 — chủ dự án trả lời trong chat 2026-10-05 "Ok làm A) Duyệt cả 6 việc", sau khi đọc bản giải thích từng việc (hộp hỏi 2026-10-03 nêu rõ hai việc cần duyệt riêng: cấu hình Cloudflare và cách tải tệp màu; chủ chấp nhận việc đổi màu công ty chỉ tới máy khác ở lần chuyển trang kế tiếp: "việc đổi màu là không thường xuyên nên có thể xem xét"). Soạn bởi AI theo lệnh chủ; AI không tự quyết.
- **Ngày:** 2026-10-05.
- **Căn cứ:** `docs/superpowers/specs/2026-10-02-toc-do-nguyen-nhan-goc.md` (nguyên nhân gốc, số đo, trích tài liệu Cloudflare); số liệu D1 của chủ ngày 2026-10-03 (`wrangler d1 info`: `running_in_region` APAC, `read_replication.mode` disabled).
- **Sửa:** ADR-0087 điều 3 (cách nạp tệp màu) và dòng hệ quả "(−) Mỗi lần mở trang thêm một yêu cầu nhỏ"; ADR-0022 điều 7 (hành vi khi hiện lại trang); ADR-0075 điều 9 (`last_seen_at` ghi ở nền). Không đổi bảng, không đổi quyền, không đổi bản đồ quyền của route nào đang có.
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` không có phát hiện HIGH mở nào chạm vùng này).
- **Cửa:** hai chiều (mọi thay đổi gỡ được bằng một commit; Smart Placement gỡ bằng xoá một dòng cấu hình).

## Bối cảnh

Nghiên cứu 2026-10-02 tìm nguyên nhân chậm khi bấm và chuyển màn. Đợt 1 gồm sáu việc nhanh, đảo ngược được; việc truy vấn nặng (gộp / song song câu D1 của Trang chủ, Chi tiết chuyến, Điều phối, chuông thông báo, chỉ mục) để đợt 2.

## Quyết định

1. **Tệp màu giao diện công ty ở `/giao-dien.css`, ngoài `/api`, do service worker nạp sẵn và phục vụ "dùng ngay bản có sẵn, làm mới ở nền".** Trước đó mọi trang nạp `/api/giao-dien.css` bằng thẻ `link` chặn hiển thị: mỗi lần mở trang phải chờ mạng + Worker + một câu D1 trước khi vẽ, và trình duyệt còn giữ lại mã trang tới khi có tệp. Đường cũ `/api/giao-dien.css` giữ cùng thân (cho trang đã đệm trước khi đổi). Bất biến "`/api/*` không bao giờ vào cache của service worker" **không đổi** (vì tệp ra khỏi `/api`; bài `src/shared/sw-policy.test.ts` ghim cả hai chiều). Worker chạy trước cho đường này (`assets.run_worker_first` thêm `/giao-dien.css`). Hệ quả với chủ: đổi màu / phông công ty có hiệu lực ở **lần chuyển trang kế tiếp** của máy khác (không phải tức thì); máy chưa từng có tệp vẫn tải qua mạng như cũ.
2. **Giao diện không nhập nhật ký thay đổi trừ trang Trợ giúp.** Số phiên bản, ngày phát hành, tên ứng dụng của các trang khác lấy từ `web/phien-ban.ts`: hai giá trị đầu do bước đóng gói chèn (`--define`) từ mục đầu nhật ký qua `scripts/in-phien-ban.mjs` — vẫn MỘT nguồn; tên ứng dụng là bản sao có bài ép trùng. Luật so sánh phiên bản tách ra `src/shared/phien-ban.ts`. Gói Đơn hàng 153 KB → 86 KB; tổng 4,9 MB → 3,25 MB. Bài `src/goi-trang-nhe.test.ts` đỏ nếu trang nào ngoài Trợ giúp kéo nhật ký vào gói hoặc gói Đơn hàng vượt 95 KB.
3. **Huy hiệu thanh bên lấy bằng route đếm nhẹ:** `GET /api/orders/dem-nhap` (số đơn nháp; một câu D1) thay cho tải nguyên `GET /api/orders/dashboard`; `GET /api/catalog/dem-xung-dot` (số dịch vụ lệch giá Sheet) thay cho tải nguyên `GET /api/catalog/admin`. Mỗi route do module chủ giữ, **cùng cổng và cùng ô quyền** với route nặng (không mở thêm cửa — bài kiểm ép cùng mã trạng thái cho mọi loại tài khoản). Không gộp một route chung vì `orders` không được đọc `catalog` (ranh giới module).
4. **Hiện lại ứng dụng chỉ kiểm kết nối, không đóng-mở lại cái còn khoẻ.** `visibilitychange → visible` gọi `hienLai()`: gõ cửa (ping) kiểm; có pong trong 3 giây thì giữ nguyên, không tải lại; không pong, `send` lỗi, chưa có kết nối sống, hoặc đã ẩn từ 2 phút trở lên thì nối lại và phát `can-tai-lai` như trước. Tin tới qua kết nối đang mở nên không lỡ gì. Có mạng lại (`online`) và khôi phục từ bộ nhớ chuyển trang (`pageshow persisted`) vẫn nối lại ngay.
5. **Bớt một chặng chờ ở mọi lời gọi API cần đăng nhập:** phiên, nhân viên và trạng thái chế độ bảo trì được hỏi CÙNG LÚC (chữ ký cookie sai vẫn bị loại trước mọi truy vấn); quyết định chặn vẫn theo QUYỀN của phiên, xét sau khi phiên + nhân viên hợp lệ. Ghi `last_seen_at` (khi phiên rảnh > 5 phút) chuyển sang `waitUntil` — câu có điều kiện `last_seen_at < ?` nên chậm hay lặp vô hại; phiên đã bị lưới `credentials_changed_at` giết vẫn không bao giờ tới đó. `GET /api/auth/me` dùng lại trạng thái bảo trì đã đọc. Router chỉ chuyển trạng thái đó (kiểu mờ `baoTri`), không biết module `maintenance`.
6. **Bật Smart Placement** (`"placement": { "mode": "smart" }`): Cloudflare tự đặt Worker gần cơ sở dữ liệu (APAC) nếu đo thấy nhanh hơn; không đủ lưu lượng từ nhiều nơi thì giữ nguyên. Chỉ ảnh hưởng `fetch`; không ảnh hưởng Cron, Durable Object, tệp tĩnh. Không dùng `placement.region`/`host` (D1 không có mã vùng AWS/GCP/Azure).

## Trang ghép (CLAUDE.md §9 — bước ghép khi duyệt)

1. **Bảng nào chứa loại thực thể nào:** không thêm bảng, cột, migration; không thêm loại dữ liệu mới vào bảng dùng chung.
2. **Dòng bản đồ quyền chạm bảng này:** không đổi `src/shared/permissions.ts`. Hai route mới dùng đúng các ô sẵn có — `dem-nhap`: `order.view` + `money.view` + `contact.view` (cổng `orders`, như dashboard); `dem-xung-dot`: `admin.manage` (cổng `admin`, như `catalog/admin`). `/giao-dien.css` công khai có chủ ý (như ADR-0087).
3. **Cổng nào canh cửa nào, kể cả chỗ giao diện ẩn/hiện:** máy chủ canh hai route đếm; giao diện chỉ GỌI huy hiệu khi đã biết người dùng thuộc nhóm thấy mục đó (`seesAll` / `admin`) — logic ẩn/hiện huy hiệu trong `web/shell.ts` không đổi, chỉ đổi route nó gọi. Đệm của service worker: chỉ `/giao-dien.css` (công khai, không dữ liệu cá nhân) được thêm; `/api/*` vẫn "pass".

## Hệ quả

- (+) Trang không còn chờ một lượt mạng + D1 để vẽ; gói mỗi trang nhẹ hơn; quay lại app không tải lại cả dữ liệu; thanh bên bớt ~15 câu D1 ở mỗi trang máy tính; mọi lời gọi bớt một chặng D1.
- (−) Đổi màu công ty tới máy khác chậm tới lần chuyển trang kế tiếp.
- (−) Quay lại app sau khi mất đồng bộ không phát hiện được bằng ping (vd máy chủ phát tin nhưng khung không tới trong lúc kết nối nửa chết) chỉ được sửa ở lần ping định kỳ 50 giây hoặc lần hiện lại sau 2 phút — chấp nhận (cùng mức tin cậy với ping định kỳ vốn có).
- (−) Số phiên bản ở giao diện nay phụ thuộc bước đóng gói (`build:web`); chạy tệp giao diện ngoài bản dựng (bài kiểm bằng node) thấy "0.0".
- (−) Smart Placement có thể không đổi gì (xem trạng thái `INSUFFICIENT_INVOCATIONS` ở tài liệu Cloudflare) — hiệu quả thật chỉ biết sau triển khai.

## Ngoài phạm vi (ghi để không bị hiểu là đã làm)

- Gộp / chạy song song các câu D1 của Trang chủ, Chi tiết chuyến, Điều phối; làm nhẹ chuông thông báo; chỉ mục D1 — đợt 2.
- Thu gọn `public/app.css` ở bước đóng gói: đã cân nhắc và bỏ (lợi nhỏ — trình duyệt bỏ qua chú thích khi đọc, tệp đã nằm sẵn trên máy — mà phải đổi liên kết ở 33 trang và bài quét token).
- Phát tin Bảng tin khi Toàn quyền đổi màu: không làm (đã chấp nhận hiệu lực ở lần chuyển trang kế tiếp).
- Bản sao đọc D1 (read replica): bỏ — bản chính đã ở APAC.
- Lệnh triển khai và kiểm sau triển khai (`cf-placement`, biểu đồ Request duration): chủ chạy theo `docs/HANDOFF-N1.md`.
