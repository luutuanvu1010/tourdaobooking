# Nghiên cứu: vì sao thao tác và chuyển màn chậm — nguyên nhân gốc và giải pháp gốc

- **Nguồn:** chủ dự án, phiên chat 2026-10-02: *"tối ưu tốc độ, bộ nhớ đệm và khả năng phục vụ ở tốc độ cao nhất trên thiết bị di động cũng như bản desktop … tìm hiểu nguyên nhân Root … dựa vào toàn bộ mã nguồn của hệ thống, tài liệu chính thức của Cloudflare Workers"*.
- **Loại tài liệu:** nghiên cứu (mô tả, chưa chuẩn tắc). **Chưa sửa mã.** Mọi giải pháp dưới đây là đề xuất; mục nào chạm ADR đã duyệt, cấu hình Cloudflare, quyền hay dữ liệu thì cần chủ duyệt (CLAUDE.md §3) trước khi thi công.
- **Cách làm:** đọc mã ở `main` = `dfee4a8` (bản 1.76/1.77); hai trợ lý đọc độc lập (máy chủ, giao diện), người điều phối đọc lại các điểm chính trên mã thật; dựng `npm run build:web` và đo kích thước gói bằng metafile esbuild; đọc tài liệu chính thức Cloudflare (bản nguồn ở kho `cloudflare/cloudflare-docs`, nhánh `production` — trang `developers.cloudflare.com` bị chặn mạng từ môi trường này).
- **Chưa đo trên production / iPhone thật** (môi trường này không tới được `booking.tourdao.vn`). Số "chuyến đi tới cơ sở dữ liệu" là **đếm từ mã**; số mili-giây là **ước tính**, ghi rõ ở từng chỗ.
- **Cập nhật 2026-10-03 — số liệu chủ dự án cung cấp** (`npx wrangler d1 info tourdao-sales-db`, chủ tự chạy): `running_in_region` **APAC**; `read_replication.mode` **disabled**; `database_size` 3,21 MB; 24 giờ: `read_queries` 28 046, `write_queries` 489, **`rows_read` 3 595 230**, `rows_written` 867. Hệ quả ghi ở §1.4.

## 0. Kết luận một đoạn

Chậm có **một nguyên nhân gốc lớn** và **bốn nguyên nhân phụ**:

1. **(Gốc lớn — máy chủ) Mỗi thao tác là một chuỗi dài câu hỏi cơ sở dữ liệu NỐI ĐUÔI nhau, và mỗi câu là một chuyến đi xa.** Worker chạy ở trạm Cloudflare gần người dùng (Việt Nam), còn D1 chỉ có MỘT bản chính ở một vùng; không bật Smart Placement, không dùng bản sao đọc (read replica). Mã lại chờ từng câu một (cố ý tránh `db.batch()` vì D1 giả trong bài kiểm không có `batch()`). Trang chủ: ~23–29 chuyến nối đuôi; Chi tiết chuyến: ~18–22; Điều phối: ~11–14. Mỗi chuyến cộng nguyên độ trễ mạng Worker↔D1. (2026-10-03: bản chính ở **APAC** ⇒ ước ~0,5–1,5 s chờ D1 ở Trang chủ; đòn bẩy chắc nhất là gộp câu hỏi trong mã — §1.4.)
2. **(Giao diện — mới từ sáng 2/10) Mỗi trang bị chặn hiển thị bởi `/api/giao-dien.css`**, một yêu cầu phải đi tới Worker + D1 mỗi lần mở trang, trước khi vẽ được gì và trước khi mã trang được chạy.
3. **Mỗi trang gọi quá nhiều API "phụ"** (huy hiệu thanh bên gọi nguyên Bảng điều khiển + nguyên danh mục, chuông thông báo quét 30 ngày nhật ký, trợ lý, WebSocket) — mỗi lời gọi lại trả "phí nền" 2–3 chuyến D1, và D1 xử lý tuần tự nên chúng xếp hàng trước dữ liệu chính.
4. **Quay lại app / đổi tab = tải lại toàn bộ dữ liệu trang**, vì Bảng tin đóng kết nối còn khoẻ rồi phát `can-tai-lai`.
5. **Mã giao diện phình 7 lần** từ lần tối ưu 27/9 (0,67 MB → 4,9 MB, 33 gói): mỗi trang mang theo nguyên nhật ký thay đổi (~63 KB, lớn dần mỗi bản phát hành); CSS 315 KB chưa nén gọn. Sau mỗi lần triển khai, mỗi máy tải lại ~1,4 MB (nén) chen với dữ liệu.

## 1. Nguyên nhân gốc lớn: chuỗi câu hỏi D1 nối đuôi × khoảng cách Worker ↔ D1

### 1.1 Tài liệu Cloudflare nói gì

- **D1 chỉ có một bản chính:** *"When using D1 without read replication, D1 routes all queries (both read and write) to a specific database instance in one location in the world … D1 request latency is dependent on the physical proximity of a user to the primary database instance."* (D1 › Global read replication). Bản chính đặt *"close to where you issued the request to create a database"* (D1 › Data location) — **vị trí bản chính của `tourdao-sales-db` chưa ai ghi lại trong repo** (xem §6, việc chủ kiểm).
- **Worker mặc định chạy gần người dùng:** *"By default, Workers … run in a data center closest to where the request was received. If your Worker makes requests to back-end infrastructure such as databases … it may be more performant to run that Worker closer to your back-end than the end user."* Ví dụ của chính tài liệu: *"This application makes multiple round trips to a database … The latency from multiple round trips … adds up. By placing the Worker near the database, Cloudflare reduces the total request duration."* (Workers › Placement). Bật bằng `"placement": { "mode": "smart" }`; *"Smart Placement only affects the execution of fetch event handlers"*; *"Static assets are always served from the location nearest to the incoming request"*; kiểm bằng header `cf-placement` (`remote-XXX` / `local-XXX`); cần tới 15 phút phân tích sau triển khai; *"By default, 1% of requests are not routed with Smart Placement to serve as a baseline"*.
- **Gộp câu hỏi:** `D1Database::batch` *"can have a huge performance impact as it reduces latency from network round trips to D1"* — một lô = một chuyến (D1 › Workers Binding API).
- **Bản sao đọc:** cần Sessions API (`env.DB.withSession(...)`), *"otherwise all queries will continue to be executed only by the primary database"*; bản sao có ở ENAM, WNAM, WEUR, EEUR, **APAC**, OC; không tốn thêm tiền; ghi vẫn về bản chính; nhất quán tuần tự nhờ "bookmark" (D1 › Global read replication).
- **Lưu ý khi kết hợp:** *"If you are using Smart Placement in combination with `assets.run_worker_first`, … the entire Worker script is placed as a single unit"* (Static Assets › Worker script). Ở đây `run_worker_first` chỉ gồm `/api/*` nên trang tĩnh không đi qua Worker — không bị ảnh hưởng; mọi `/api/*` (kể cả WebSocket `/api/bang-tin`) sẽ chạy ở nơi được đặt.

### 1.2 Mã đang làm gì (đếm từ mã, `main` dfee4a8)

**Phí nền của MỌI API cần đăng nhập** (`src/shared/router.ts:349-357`):

| Bước | Bằng chứng | Chuyến D1 |
|---|---|---|
| Phiên + nhân viên (song song) | `src/modules/auth/index.ts:58` `Promise.all([findLiveSession, getActiveStaff])` | 1 |
| Ghi `last_seen_at` — **có `await`**, khi phiên rảnh > 5 phút | `auth/index.ts:60-62` | +1 (thỉnh thoảng; đúng lúc mở app sau khi để yên — mọi lời gọi song song của lần mở đều trả) |
| Kiểm chế độ bảo trì — **nối đuôi** sau bước trên, "không đệm" | `router.ts:357`, `maintenance/index.ts:35-44` | 1 |
| Lớp chống ghi trùng: tra vé — mọi POST có vé, kể cả POST CHỈ ĐỌC `/api/ledger/balances` | `router.ts:410,439`; `shared/lan-gui-ve.ts:85-88`; `LAN_GUI_MIEN` rỗng `shared/lan-gui-mien.ts:15` | +1 với POST |

⇒ **GET: 2 chuyến nối đuôi (3 khi ghi `last_seen`); POST: 3 (4).** `GET /api/auth/me` đọc lại `mnt_setting` lần nữa (`auth/index.ts:342`) ⇒ 3.

**Các đường nóng** (độ sâu nối đuôi, đã gồm phí nền):

| Đường | Độ sâu | Vì sao | Mức |
|---|---|---|---|
| `GET /api/orders/dashboard` | ~13–17 | `getDashboard` (`orders/repository.ts:671-737`): 3 nhánh ngày song song nhưng mỗi nhánh 6–8 câu nối đuôi (`:623,633,650` → `toSummaryDtos :406,410,422` → `summaryRows :384,391` → `getServicesForSubtotal :1130-1146`); sau đó 5–7 câu nối đuôi (`:688,698,699,707,711,712`) dù không phụ thuộc nhánh trên. `:698` đọc **mọi** đơn nháp/xác nhận, không `LIMIT`. Chú thích `:380`, `:1126-1128`: **cố ý không `batch()` vì D1 giả của `dashboard.test.ts` không có `batch()`** | CAO |
| Trang chủ điện thoại (`web/home.ts:651-660`) | ~23–29 qua 3 lượt HTTP | `/me` (3) → `dashboard` ∥ `unpaid-summary` (5–7, `billing/hoan-tat-repo.ts:65` đọc mọi đơn chưa thu đủ) → `POST /api/ledger/balances` (7–9) chờ xong dashboard | CAO |
| `GET /api/van-chuyen/chuyen/:id` | ~18–22 | `docNen`, `lichChungChang`, `hanhKhachChoChuyen`, `docChung`, `docNguCanh`, `docGoiBao`, `nhanNhanVien`, … nối đuôi (`van-chuyen/index.ts:945-952`, `dieu-phoi-route.ts:136-183`) | CAO NHẤT |
| `GET /api/van-chuyen/lich` (Điều phối) | ~11–14 | `tripsByDate` rồi `lichChungChang` rồi `dungLichNgay` nối đuôi dù hai câu đầu độc lập (`van-chuyen/index.ts:940-942`; `dieu-phoi-lenh.ts:388-417`) | CAO |
| `GET /api/thong-bao/tom-tat` — **mọi trang** gọi (`web/thong-bao-ui.ts:339`) và gọi lại ở mỗi sự kiện Bảng tin (`:232-237`) | 4–8 | `LIST_DON` (`thongbao/repository.ts:8-21`) quét 30 ngày `audit_log`, nối 5 view (có `v_dsp_first_handler` = `GROUP BY` toàn bảng), `EXISTS` tương quan, trả tới **3000 dòng** rồi lọc theo người ở JS | CAO |
| `GET /api/orders` | 7–10 | `listOrders` → `toSummaryDtos`/`summaryRows` (4–6) → `nhapKeToanCuaDon` (`orders/index.ts:650,656`); sau đó giao diện gọi thêm balances (7–9) + handlers (3) | VỪA |
| `GET /api/orders/:id` + 5 lời gọi kèm (`web/order.ts:875,915-935`) | 5 + 5×phí nền | Đơn nháp nạp **cả danh mục** để kiểm vài mã (`catalog/index.ts:24-27`) | VỪA |
| `GET /api/catalog/for-order` | 4 | **Câu `UPDATE` ở mọi lần GET** (`claimFirstSync`, `catalog/service.ts:58`, `catalog/repository.ts:89-91`) chạy trước 4 câu đọc | VỪA |
| `/api/van-chuyen/nhac-goi-khach` | 7 + N | N+1: `await isAssigned` trong vòng lặp (`goi-bao-lenh.ts:108-113`) | VỪA |
| `/cuoc-cua-toi` (tài xế) | ~10 + N×(1–3) | N+1: `docNguCanh` trong vòng lặp (`dieu-phoi-route.ts:228-235`) | VỪA |

**Ước tính (chưa đo):** nếu bản chính D1 ở Đông Nam Á (Singapore/HK — ~25–50 ms mỗi chuyến tính cả thực thi), Trang chủ tốn ~0,6–1,5 s chỉ để chờ D1; nếu bản chính ở Mỹ/châu Âu (vd từng tạo bằng máy ở nước ngoài — chưa kiểm), ~150–250 ms mỗi chuyến ⇒ 4–7 s. Đây là lý do số đo 27/9 trên Chrome giả lập (trễ cố định 150 ms/lượt HTTP) không phản ánh độ chậm thật: giả lập không mô phỏng chặng Worker↔D1.

**Hàng đợi:** D1 thực thi tuần tự trên một cơ sở dữ liệu. Một thay đổi đơn phát Bảng tin tới mọi tab đang mở; mỗi tab cùng lúc gọi lại `tom-tat` + dữ liệu trang ⇒ các câu xếp hàng (suy luận, chưa đo).

### 1.3 Giải pháp gốc (theo thứ tự lợi/công)

| # | Việc | Cơ chế | Lợi ước tính | Rủi ro / ai duyệt |
|---|---|---|---|---|
| S1 | **Bật Smart Placement** (`"placement": { "mode": "smart" }` trong `wrangler.jsonc`) | Worker chạy cạnh D1: người dùng trả MỘT chuyến xa, các chuyến D1 còn lại ngắn (vài ms) | Lớn nhất nếu D1 ở xa; không đổi mã; đảo ngược = gỡ một dòng | Cấu hình Cloudflare = việc lớn (triển khai) → chủ duyệt; kiểm `cf-placement` + biểu đồ "Request duration" trước/sau. Lưu ý: Durable Object `BangTin` cố định nơi tạo lần đầu, không bị ảnh hưởng; WebSocket đi qua Worker đã đặt |
| S2 | **Gộp câu đọc độc lập**: `db.batch([...])` cho nhóm SELECT độc lập; `Promise.all` cho các `await` độc lập (`dashboard`, `lich`, `chuyen/:id`, `toSummaryDtos`); bỏ hai vòng N+1 | Giảm độ sâu nối đuôi 13–22 → 3–5 | Lớn, ở mọi vị trí D1 | Cần sửa D1 giả trong bài kiểm (`dashboard.test.ts`) để có `batch()` — chính là nguyên nhân gốc của lối "cố ý không batch". Không đổi dữ liệu/quyền; thêm bài đếm số chuyến |
| S3 | **Rút phí nền:** chạy câu đọc `mnt_setting` SONG SONG với phiên + nhân viên (không đổi nghĩa); đưa ghi `last_seen_at` vào `ctx.waitUntil`; `/api/auth/me` dùng lại trạng thái bảo trì đã đọc; đổi `claimFirstSync` thành đọc trước, chỉ `UPDATE` khi `last_attempt_at IS NULL`; miễn vé chống ghi trùng cho POST chỉ đọc (`/api/ledger/balances` — thêm vào `LAN_GUI_MIEN` hoặc đổi thành GET) | GET 2 → 1 chuyến nối đuôi | Vừa, áp cho MỌI lời gọi | `last_seen` và miễn vé chạm ADR-0094/ADR-0075 → chủ duyệt; song song bảo trì không đổi nghĩa |
| S4 | **Làm nhẹ `tom-tat`:** lọc theo người ngay trong SQL, cửa sổ ngắn hơn/đếm thay vì trả 3000 dòng; hoặc bảng "hộp tin theo người" ghi lúc sự kiện | Câu nặng nhất chạy ở mọi trang | Vừa–lớn | Đụng logic thông báo (ADR-0034/0052) → đặc tả riêng |
| S5 | **Chỉ mục** (migration mới): `orders(status)` (một phần/ghép), `orders(staff_id, created_at)`, `audit_log` một phần cho luồng 30 ngày, `vc_trip` (viết lại `status='RUNNING' OR …` + chỉ mục); sau đó `PRAGMA optimize` như tài liệu D1 › Use indexes khuyên | Giảm quét bảng, chặn chậm dần khi dữ liệu lớn | Thấp hôm nay, tăng theo thời gian | Migration = việc lớn → người kiểm độc lập; xác nhận bằng `EXPLAIN QUERY PLAN` |
| S6 | **Bản sao đọc + Sessions API** (`withSession`, bookmark theo phiên để đọc-sau-ghi đúng) | Câu đọc phục vụ ở bản sao APAC gần nhất | ~~Chỉ đáng làm nếu S1 + S2 chưa đủ và bản chính ở xa~~ **Bỏ (2026-10-03):** bản chính đã ở APAC; bản sao gần Việt Nam nhất cũng là vùng APAC ⇒ gần như không lợi | — |

### 1.4 Cập nhật 2026-10-03 sau khi biết vị trí D1 (APAC)

- **Ước tính lại (chưa đo):** chặng Worker (trạm gần Việt Nam) ↔ bản chính APAC ước ~20–50 ms mỗi chuyến tính cả thực thi (tài liệu Cloudflare không công bố thành phố cụ thể của "APAC"). Trang chủ ~23–29 chuyến nối đuôi ⇒ **~0,5–1,5 s chỉ để chờ D1**; Chi tiết chuyến ~18–22 ⇒ ~0,4–1,1 s. Không còn kịch bản "4–7 s".
- **S2 (gộp / song song câu đọc) thành đòn bẩy CHẮC CHẮN nhất:** không phụ thuộc vị trí, không phụ thuộc Cloudflare chọn đặt hay không.
- **S1 (Smart Placement) hạ thành "thử, rẻ, có thể không có tác dụng":** tài liệu ghi *"Smart Placement only considers locations where the Worker has previously run"* và *"requires consistent traffic to the Worker from multiple locations to make a placement decision"*. Gần như toàn bộ lưu lượng đến từ trạm ở/gần Việt Nam ⇒ có thể nhận trạng thái `INSUFFICIENT_INVOCATIONS` và không chuyển gì (không hại, chỉ không lợi). Kiểm bằng header `cf-placement` hoặc API trạng thái. Placement Hints (`placement.region`) chỉ nhận vùng AWS/GCP/Azure — không có mã cho D1, không dùng được ở đây.
- **`rows_read` 3,6 triệu/ngày trên cơ sở dữ liệu 3,21 MB** (trung bình ~128 dòng mỗi câu đọc) ⇒ có câu đang quét rộng thay vì tra thẳng: khớp với `LIST_DON` của chuông (quét 30 ngày `audit_log`, nối view `GROUP BY` toàn bảng, gọi ở mọi trang — §1.2) và các bảng thiếu chỉ mục (S5). D1 thực thi tuần tự trên một cơ sở dữ liệu nên câu quét rộng làm các câu khác xếp hàng ⇒ **kéo S4 + S5 lên ngay sau Đợt 1**.
- **Đo tiếp (chủ tự chạy, chỉ đọc, thư mục dự án):** `npx wrangler d1 insights tourdao-sales-db --sort-by=reads --limit=10` và `npx wrangler d1 insights tourdao-sales-db --sort-by=time --limit=10` — mười câu đọc nhiều dòng nhất / tốn giờ nhất trong 24 giờ (lệnh "experimental" của wrangler 4.135; đã kiểm tham số trong mã wrangler, chưa chạy).

## 2. `/api/giao-dien.css` chặn hiển thị mọi trang (mới từ 2026-10-02 08:52)

- Mọi trang: `<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/api/giao-dien.css">` (vd `public/orders.html:2`), commit `0e4e024` "Mọi trang nạp /api/giao-dien.css ngay sau /app.css (Task 4, ADR-0087)".
- Service worker không phục vụ nó (`src/shared/sw-policy.ts` chỉ cho trang + tệp tĩnh); máy chủ trả `cache-control: no-cache` + ETag (`src/shared/http.ts:13-16`) và đọc D1 mỗi lần (`src/modules/giao-dien/index.ts:16-21`) ⇒ **mỗi lần mở trang phải chờ một lượt mạng tới Worker + một câu D1 trước khi vẽ**. Theo đặc tả HTML, stylesheet chặn bộ phân tích còn giữ lại cả `<script type="module">` (chạy sau khi CSS đã nạp) ⇒ `initShell()`, khung nhớ (ADR-0035), `/api/auth/me` và mọi lời gọi sớm (`goi-som`) đều bị đẩy lùi theo. Mạng đảo yếu: một yêu cầu kẹt = trang trắng nhiều giây.
- ADR-0087 điều 3 đã chấp nhận "mỗi lần mở trang thêm một yêu cầu nhỏ (phần lớn 304)" nhưng chưa tính tới việc nó **chặn hiển thị và chặn mã trang** — đi ngược ADR-0035 ("phần ít thay đổi nằm sẵn trên máy").
- **Giải pháp gốc (cần ADR mới sửa ADR-0087 điều 3 — chủ duyệt).** **Khuyến nghị (sửa 2026-10-03):** service worker phục vụ RIÊNG tệp giao diện theo kiểu "dùng ngay bản đang có, hỏi máy chủ ở nền" như các tệp khung (nội dung công khai, không dữ liệu cá nhân — nới bất biến "không cache `/api/*`" đúng MỘT đường, hoặc chuyển tệp ra đường ngoài `/api/` và thêm vào `run_worker_first`); khi Toàn quyền lưu giao diện, trạm Bảng tin phát một tin để các máy đang mở tải lại tệp màu; máy chủ đệm CSS theo `version` (Cache API hoặc bộ nhớ isolate) để không đọc D1. Hệ quả: máy khác thấy màu mới ở **lần chuyển trang kế tiếp** (máy đang mở: gần như ngay), không còn chờ mạng trước khi vẽ. Lần mở đầu tiên trên máy chưa từng có tệp: vẫn tải qua mạng như hôm nay.
  - (a) Chỉ dùng header HTTP `Cache-Control: max-age=300, stale-while-revalidate=…`: đơn giản, giữ đúng chữ ADR-0087 điều 3, nhưng **chưa chắc Safari trên iPhone hỗ trợ `stale-while-revalidate`** (chưa kiểm); nếu không, cứ mỗi 5 phút một lần mở trang lại phải chờ mạng, và màu mới tới máy khác chậm tới 5 phút.
  - (c) Nạp không chặn + dựng biến màu từ bản nhớ trên máy như khung nhớ — có thể chớp màu mặc định khi mở trang.

## 3. Mỗi trang gọi quá nhiều API phụ

- **Máy tính, MỌI trang, thanh bên** (`web/shell.ts:159,175,190`, `web/vc-dem.ts:9`): huy hiệu "Đơn hàng" gọi **nguyên** `/api/orders/dashboard` (độ sâu 13–17) chỉ để lấy `draftCount`; huy hiệu danh mục gọi **nguyên** `/api/catalog/admin` chỉ để đếm xung đột; cộng `/api/feedback/badge`, `/api/van-chuyen/sap-het-han`. Trang chủ máy tính gọi dashboard + catalog/admin **hai lần** (trang + thanh bên).
- **Mọi trang:** WebSocket Bảng tin mở mới (`web/bangtin.ts:20` — qua phí nền D1 + Durable Object), chuông `tom-tat` (§1.2), `/api/tro-ly/khung` (`web/tro-ly.ts:349`).
- Chỉ 4 trang dùng lời gọi sớm (`home`, `orders`, `order`, `order-form`); `parties` 3 lượt nối đuôi (`web/parties.ts:722-732`) dù danh sách không phụ thuộc `meta`.
- **Giải pháp gốc:** một route "số đếm" nhẹ trả mọi huy hiệu trong MỘT lần (hoặc đẩy số đếm qua Bảng tin), giữ trong `sessionStorage` vài chục giây giữa các trang; mở rộng `goi-som` cho mọi trang; không gọi dashboard/catalog đầy đủ cho huy hiệu.

## 4. Quay lại app / đổi tab = tải lại toàn bộ

- `visibilitychange → visible` gọi `noiNgay()` (`web/bangtin.ts:30-32`): đóng cả kết nối **còn khoẻ**, đặt `daHong = true`, mở lại; `onopen` thấy `daHong` ⇒ `can-tai-lai` (`web/bangtin-logic.ts:207-211,239-247`) ⇒ Đơn hàng, Trang chủ, Chi tiết đơn, Điều phối, Chi tiết chuyến và chuông đều tải lại toàn bộ (`orders.ts:234`, `home.ts:638`, `order.ts:954`, `dieu-phoi.ts:538`, `chuyen.ts:719`, `thong-bao-ui.ts:238`). Quay lại bằng nút lùi (bfcache, `pageshow` persisted) cũng vậy.
- **Giải pháp gốc:** khi hiện lại, gửi `ping` kiểm kết nối; chỉ nối lại + `can-tai-lai` khi kết nối thật sự chết hoặc trang ẩn quá N phút (vd 2 phút). Sâu hơn: trạm gửi số thứ tự sự kiện, máy khách chỉ tải lại khi có sự kiện bị lỡ. Chạm ADR-0022 → đặc tả nhỏ, chủ duyệt.

## 5. Mã giao diện phình và cách nạp sẵn

Đo bằng `npm run build:web` + metafile esbuild (2026-10-02):

| Đo | Giá trị |
|---|---|
| Tổng JS 33 trang | **4 932 376 B** (gzip ~1,36 MB) — đặc tả 2026-09-27 ghi 672 KB |
| Gói một trang | 99 KB (login) … 147 KB (orders), 149 KB (home), 206 KB (order-form), 244 KB (order), 261 KB (help) |
| Mã có trong **cả 33** gói | ~106 KB/gói, trong đó `src/shared/changelog.ts` **~63 KB** (43% gói Đơn hàng) |
| `public/app.css` | 314 855 B (gzip ~66 KB); chú thích ~65–82 KB; không thu gọn |

- **Vì sao nhật ký thay đổi vào mọi trang:** `src/shared/app-info.ts:6-15` lấy `APP_VERSION = CHANGELOG[0].version` ⇒ import cả mảng; `web/help-seen.ts:2-3` (được `web/shell.ts:8` import) dùng `APP_VERSION` ⇒ mọi trang. Chú thích `web/shell.ts:361` cho thấy từng cố tránh đúng việc này nhưng lọt qua đường `help-seen.ts`. Tệp lớn thêm mỗi bản phát hành (52 KB ngày 1/10 → 68 KB nguồn hôm nay) ⇒ **Nền tảng chậm dần theo thời gian**.
- **Nạp sẵn mỗi lần triển khai** (`web/sw/sw.ts:14`, `PRECACHE` ở `sw-policy.ts`): ~75 tệp, ~1,4 MB nén, `cache: "reload"`; ngày 2/10 có ≥ 3 lần triển khai ⇒ mỗi máy tải chừng ấy mỗi lần, chen với dữ liệu ở lần mở đầu sau triển khai. ADR-0035 ước 250 KB.
- **Service worker "dùng ngay, làm mới ở nền" cho mọi tệp khung ở MỌI lần chuyển trang** (`web/sw/sw.ts:99-110`): HTML, CSS, JS, phông đều phát một yêu cầu nền (phần lớn 304) và `cache.put` ghi lại — trong khi tên bộ nhớ đã theo `BUILD_ID` nên tệp khung bất biến trong một bản dựng.
- **Giải pháp gốc:**
  1. Đưa số phiên bản vào lúc dựng (`--define:__APP_VERSION__` như `__BUILD_ID__`) hoặc tệp hằng sinh tự động; `app-info.ts` không import `changelog.ts`; thêm bài kiểm "gói của mọi trang (trừ help) không chứa nhật ký thay đổi" + trần kích thước gói. Giảm ~63 KB/trang ngay, và chặn đà phình.
  2. Thu gọn CSS lúc dựng (`esbuild --minify` cho `app.css` ra `public/`), giữ chú thích ở nguồn.
  3. Xem lại quyết định "Lát 4" của đặc tả 2026-09-27 (tách mã chung `--splitting`): khi đó phần chung 47 KB; nay ~106 KB (còn ~43 KB sau khi bỏ nhật ký) — đo lại trên iPhone trước khi quyết.
  4. Service worker: tệp khung phục vụ thẳng từ bộ nhớ (cache-first) vì đã bất biến theo bản dựng; việc phát hiện bản mới đã có `/sw.js` `no-store`. Chạm ADR-0035 (cách bản mới đến máy) → việc lớn, chủ duyệt.

## 6. Nguyên nhân nhỏ hơn

- **Chuyển hướng thêm một trang** cho Đối tác, Thực tập, Tài xế, Nhân sự: mở app (`start_url` `/`) → tải `home.js` → chờ `/api/auth/me` → `location.replace` (`web/home.ts:616-622`, `src/shared/start-page.ts:53-59`); sau đăng nhập `next` mặc định `/` ⇒ đăng nhập → `/` → `/orders`. Giải pháp: quyết trang đầu từ khung nhớ trên máy (4 cờ đã có — ADR-0035 điều 3) trước khi chờ `/me`; hoặc đăng nhập trả thẳng trang đầu theo quyền.
- **Nút Trợ lý ép bố cục** ở mỗi lần cuộn và mỗi thay đổi DOM (`web/tro-ly.ts:324-337,358-365`: `MutationObserver(document.body, {subtree:true})` + `scroll` → `getBoundingClientRect` + `querySelectorAll`). Giải pháp: `IntersectionObserver`/`ResizeObserver` trên đúng thanh dính, không theo dõi cả `body`.
- **Danh mục:** gõ tìm dựng lại toàn bộ (bảng + thẻ) mỗi phím, không chờ (`web/catalog.ts:162-181,762`); Nhân sự dựng cả bảng lẫn thẻ (`web/staff.ts:250-254`).
- **iOS:** thanh tab cố định dùng `backdrop-filter: saturate(180%) blur(16px)` (`public/app.css` khối `#tabbar`) — tốn GPU khi cuộn trên máy cũ.
- **Khung chờ** chỉ có ở `index.html`, `orders.html`; các trang khác `<main>` trống tới khi có dữ liệu (cảm giác chậm).
- `dateTime()` tạo bộ định dạng mỗi lần gọi (`web/format.ts:21-22`) — nhỏ.

## 7. Thứ tự đề xuất

**Bước 0 — đo trước (tiêu chí nghiệm thu cần số gốc, P20):**
1. ~~Chủ kiểm vị trí bản chính D1~~ — xong 2026-10-03: APAC (§1.4).
2. Chủ chạy `wrangler d1 insights` (§1.4) để biết câu nào đọc nhiều dòng / tốn giờ nhất.
3. Thêm header `Server-Timing` cho mọi `/api/*` (tổng giờ + số câu D1 + giờ chờ D1) — xem được trong công cụ nhà phát triển và Workers Logs (`observability` đã bật). Không đổi hành vi.
4. Ghi số gốc: thời gian tới dữ liệu đầu của `/`, `/orders`, `/order`, `/dieu-phoi`, `/chuyen` trên iPhone thật (4G) và máy tính.

**Đợt 1 — nhanh, đảo ngược được (sửa 2026-10-03):** §2 (giao-dien.css không chặn trang), §5.1–5.2 (bỏ nhật ký khỏi gói, thu gọn CSS), §3 (route số đếm cho huy hiệu), §4 (không tải lại khi kết nối còn khoẻ), S3 (rút phí nền), S1 (Smart Placement — thử, đo bằng `cf-placement`, gỡ nếu không lợi).
**Đợt 2 — sửa truy vấn:** S2 (gộp/song song, sửa D1 giả để có `batch()`, bỏ N+1), S4 (`tom-tat`) và S5 (chỉ mục) — ưu tiên theo kết quả `d1 insights`; mở rộng `goi-som`, chuyển hướng trang đầu.
**Đợt 3 — cân nhắc sau khi đo lại:** tách mã chung, cache-first cho tệp khung. (S6 bản sao đọc: bỏ — §1.4.)

**Tiêu chí nghiệm thu đề xuất (kiểm được):**
- Độ sâu D1 nối đuôi (đếm bằng bài kiểm với D1 giả có đếm): GET bất kỳ ≤ 1 chuyến phí nền; `dashboard` ≤ 4; `chuyen/:id` ≤ 5; `lich` ≤ 4.
- Không gói trang nào (trừ `help.js`) chứa chữ của nhật ký thay đổi; gói Đơn hàng ≤ 90 KB.
- Trang đầu vẽ khung KHÔNG chờ yêu cầu `/api/*` nào (đo trong Chrome: phần tử thanh tab xuất hiện trước `responseEnd` của mọi `/api/*`).
- Đổi tab / quay lại app trong < 2 phút với kết nối khoẻ: 0 lời gọi dữ liệu mới.
- Sau Smart Placement: header `cf-placement: remote-…` và biểu đồ "Request duration" giảm so với 1% yêu cầu làm mốc.

## 8. Câu hỏi cho chủ (gom một lần)

1. ~~Vị trí cơ sở dữ liệu~~ — **đã trả lời 2026-10-03:** `running_in_region` APAC, `read_replication.mode` disabled (lệnh `wrangler d1 info` CÓ in vùng).
2. **Duyệt Đợt 1?** Gồm một thay đổi cấu hình Cloudflare (Smart Placement) và một ADR mới sửa ADR-0087 điều 3 (cách đệm `giao-dien.css`). Chủ hỏi thêm giải thích (2026-10-03) — đã giải thích trong chat, chờ quyết.
3. **Màu/phông công ty mới tới máy khác ở lần chuyển trang kế tiếp** (phương án khuyến nghị §2, sửa 2026-10-03; trước đó là "tối đa 5 phút") — chủ trả lời 2026-10-03: đổi màu không thường xuyên, "có thể xem xét".
4. Cho phép ghi `last_seen_at` ở nền (không chờ) và miễn vé chống ghi trùng cho lời gọi chỉ đọc `/api/ledger/balances`?

## 9. Nguồn

- Mã: `main` = `dfee4a8`. Các tệp:dòng ở trên.
- Cloudflare (bản nguồn `github.com/cloudflare/cloudflare-docs`, nhánh `production`, đọc 2026-10-02): `workers/configuration/placement.mdx`; `d1/best-practices/read-replication.mdx`; `d1/configuration/data-location.mdx`; `d1/worker-api/d1-database.mdx` (batch); `d1/best-practices/use-indexes.mdx` (`PRAGMA optimize`); `workers/static-assets/headers.mdx` (mặc định `Cache-Control: public, max-age=0, must-revalidate` + ETag); `workers/static-assets/routing/worker-script.mdx` (Smart Placement × `run_worker_first`); `durable-objects/reference/data-location.mdx`.
- Tài liệu dự án liên quan: `docs/superpowers/specs/2026-09-27-toi-uu-tai-trang.md`, ADR-0035, ADR-0087, ADR-0022, ADR-0094.
