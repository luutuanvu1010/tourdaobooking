# Đợt D — Khung điều hướng dọc + Trang chủ đúng bản mẫu + đổi trang mặc định — đặc tả

> Đặc tả con của `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md`. Quyết định kiến trúc: **ADR-0015** (`docs/adr/ADR-0015-khung-dieu-huong-doc.md`, trạng thái `proposed` — **chủ dự án phải duyệt trước khi thi công Task 4/5**). Quyết định của chủ dự án: `docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md` mục A và B. Nguồn thẩm quyền về hình dáng: `docs/design/mockup-by-ClaudeDesign/00 Trang chu v2.dc.html` + ảnh chụp mockup chủ dự án gửi 2026-09-23.

## 1. Vì sao có đợt này

Trang chủ mới đã lên production 2026-09-23 nhưng chủ dự án xem kết quả và kết luận lệch mockup quá nhiều. Đối chiếu từng khối cho thấy: trong 6 khối nhìn thấy của mockup, **3 khối biến mất hoàn toàn**, và **chỉ 1 trong 3 là do chủ dự án chốt bỏ**. Hai chỗ còn làm **sai chính đặc tả của dự án**. Chi tiết ở `…-trang-chu-moi-quyet-dinh.md` mục "Quyết định BỔ SUNG".

## 2. Phạm vi

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Thanh bên dọc cho máy tính (cả 12 trang) | Đổi thanh tab điện thoại (giữ nguyên) |
| Hoàn thiện Trang chủ đúng mockup (nội dung + bố cục + khổ điện thoại) | Restyle lại 11 trang kia (chỉ chỉnh cho vừa khung mới) |
| Biểu đồ cột 7 ngày | Đổi bản đồ quyền (`permissions.ts`) — ADR-0015 không đụng |
| Khối "Cần xem lại" | Thêm bộ lọc cho trang Đơn hàng (ô số liệu vẫn dẫn về danh sách không lọc) |
| Đổi trang mặc định `/` → Trang chủ, Đơn hàng → `/orders` | Đổi schema, migration |

## 3. Từng khối của mockup — cần gì, dữ liệu ở đâu

### 3.1 Thanh bên dọc (máy tính ≥900px)

Rộng 236px (`--w-sidebar` mới), nền `--c-primary-strong`, cao hết màn hình, không cuộn ngang.

- **Đầu thanh:** logo 30px bo tròn + "Tour Đảo **Booking**" (chữ "Booking" nhạt hơn), gạch dưới mảnh `rgba(255,255,255,.12)`.
- **Ba nhóm**, mỗi nhóm có tiêu đề chữ nhỏ viết hoa giãn chữ:
  - **BÁN HÀNG**: Trang chủ · Đơn hàng `[42]` · Lập đơn mới · Hồ sơ
  - **QUẢN TRỊ**: Dịch vụ & giá `[1]` · Nhân viên · Địa điểm · Nhật ký
  - **TÔI**: Tài khoản · Góp ý / Báo lỗi `[2]`
- Mục đang mở: nền `rgba(255,255,255,.14)`, chữ trắng đậm. Mục khác: chữ `--c-band-muted`.
- Mỗi mục có icon 18px — **4 icon còn thiếu** (`contact-card`, `pin`, `history`, `chat`) lấy đúng SVG trong mockup, thêm vào `web/icons.ts` (quyết định chủ dự án mục 8 đã cho phép).
- **Chân thanh:** avatar tròn (chữ cái đầu tên) + tên + vai, gạch trên mảnh.
- **Mục nào hiện cho ai**: giữ nguyên luật hiện có — `isOffice` cho nhóm Bán hàng, `hasPermission(staff,"ADMIN")` cho nhóm Quản trị, `can(staff,"order.create")` cho "Lập đơn mới". Nhóm nào rỗng thì ẩn cả tiêu đề nhóm.

**Huy hiệu số đếm — nguồn dữ liệu (đã tra):**

| Huy hiệu | Nguồn | Trạng thái |
|---|---|---|
| Góp ý `[2]` | `GET /api/feedback/badge` → `mine + queue` | **ĐÃ CÓ** (`web/shell.ts` đang dùng) |
| Đơn hàng `[42]` | `GET /api/orders` trả `{orders, hasMore}` — **KHÔNG có tổng số** | **CHƯA CÓ** → xem §7 mục 1 |
| Dịch vụ & giá `[1]` | `GET /api/catalog/admin` → `items[].conflicts[]` (đếm dịch vụ có xung đột giá Sheet) — nhưng route là `access: "admin"` | **CÓ nhưng chỉ admin** → xem §7 mục 2 |

### 3.2 Thanh công việc trên (máy tính)

Thay `nav.topnav` hiện tại. Gồm: breadcrumb tên trang (chữ thường, không phải H1 to) · ô tìm kiếm "Tìm mã đơn, tên khách, SĐT…" · nút đỏ "Lập đơn mới" góc phải.

- Ô tìm kiếm: bấm Enter → chuyển sang `/orders?q=…`. Không tự làm bộ tìm kiếm mới — dùng lại tham số `q` mà `GET /api/orders` đã hỗ trợ.
- Nút "Lập đơn mới": chỉ hiện khi `can(staff,"order.create")`.
- Ở điện thoại thanh này giữ như hiện tại, thêm avatar chữ cái đầu bên phải (mockup có).

### 3.3 Trang chủ — nội dung (khác hiện tại)

| Mục | Hiện tại | Phải thành |
|---|---|---|
| Tiêu đề trang | H1 "Trang chủ" to, xanh, trong nội dung | Bỏ — tên trang nằm ở breadcrumb thanh trên |
| Nhãn "Số liệu toàn công ty" | Có (mockup không có) | Bỏ |
| "· toàn công ty" ở đầu mục danh sách | Có (mockup không có) | Bỏ |
| Chip "Đang ở chế độ bảo trì" | Nối tiếp sau ngày | Đẩy sang **phải cùng dòng** với dòng chào |
| Ô số liệu "Đơn nháp" — dòng phụ | "Cần xác nhận đơn" | "**N đơn đón trong 24 giờ tới**" (cần số liệu mới, §7 mục 3) |
| Ô "Còn thiếu tiền" — dòng phụ | "1 đơn · sớm nhất đón 28/09" | Giữ (khớp mockup "3 đơn · đơn sớm nhất đón 21/09") |
| "Chuyến đón hôm nay" | Không có liên kết | Thêm "**Xem tất cả**" góc phải (điện thoại: "Tất cả"), dẫn `/orders` |
| Doanh thu của tôi | Chỉ số tổng | Thêm **biểu đồ cột 7 ngày** (T2…CN) |
| "Cần xem lại" | Không có | Thêm khối (§3.5) |

**Từng dòng "Chuyến đón hôm nay"** — mockup máy tính: `giờ | tên · số khách / SĐT · dịch vụ · nơi đón | tiền`. Bản hiện tại dời nơi đón xuống dưới cột giờ vì **lý do dữ liệu đúng**: giờ đón và nơi đón cùng đến từ "dịch vụ quyết định hôm nay", còn `serviceNames[0]` có thể là dịch vụ khác. **Giữ nguyên tắc này**, nhưng trình bày lại cho gần mockup: mockup **điện thoại** đã gợi ý cách đúng — `KS Havana · Vinpearl 1 ngày` (nơi đón **trước**, tên dịch vụ sau). Dùng thứ tự đó cho cả hai khổ: nơi đón đứng cạnh giờ về mặt ngữ nghĩa, tên dịch vụ đứng sau, không gợi ý quan hệ một-một.

### 3.4 Biểu đồ cột 7 ngày

7 cột (T2…CN), cột của ngày có doanh thu cao tô đậm `--c-primary`, còn lại nhạt. Nhãn trục dưới. Không thư viện ngoài — dựng bằng `h()` + CSS (chiều cao theo %), đúng luật không thêm dependency.

**Dữ liệu cần thêm** vào `GET /api/orders/dashboard`: `revenueWeek.daily: { date: string; total: number }[]` (7 phần tử, T2→CN, ngày không có đơn thì `total: 0`). Tính cùng truy vấn doanh thu tuần đang có, nhóm theo ngày — **vẫn dùng số hiện hành sau điều chỉnh** (bài học Đợt B).

### 3.5 Khối "Cần xem lại"

Mockup có 2 dòng, mỗi dòng: icon cảnh báo + tiêu đề + dòng phụ.
1. **"Sheet đã đổi giá CANO_RIENG"** — `2.400.000 → 2.600.000 đ · giá ghi đè vẫn đang bán`. Nguồn: `GET /api/catalog/admin` → `items[].conflicts[]`. **Chỉ admin gọi được.**
2. **"2 góp ý mới chưa trả lời"** — `GY-0042 báo lỗi · GY-0041 đề xuất`. Nguồn: `GET /api/feedback/badge` cho số; muốn hiện **mã yêu cầu** thì cần thêm dữ liệu (badge hiện chỉ trả số).

→ Xem §7 mục 2 và 4.

### 3.6 Khổ điện thoại (390px) — bám đúng mockup

- Đầu trang: logo + **tên trang** ("Trang chủ") + **avatar chữ cái đầu** bên phải.
- Dòng chào 2 dòng: "Chào Huy" / "21/09 · 8 chuyến đón hôm nay".
- **Lưới 2×2 đủ 4 ô**: Còn thiếu · Đơn nháp · Chưa phụ trách · **Doanh thu của tôi**. Ô doanh thu nằm TRONG lưới, không tách thẻ riêng. *(Đặc tả `…-trang-chu-moi-design.md` §3 đã bắt điều này, mã làm khác — đây là sửa lỗi, không phải yêu cầu mới.)*
- **Nhãn rút gọn**: "CÒN THIẾU" / "ĐƠN NHÁP" / "CHƯA PHỤ TRÁCH" / "DOANH THU CỦA TÔI".
- **Tiền rút gọn**: `8,78tr ₫`, `900k` (không phải `8.780.000 ₫`).
- Dòng phụ rút gọn: "3 đơn" / "2 đón trong 24h" / "Cần gán" / "Tuần này · 11 đơn".
- Danh sách chuyến: giờ 44px | tên·khách / nơi đón · dịch vụ | tiền rút gọn.
- Biểu đồ và "Cần xem lại": xếp một cột dưới danh sách chuyến.

## 4. Đổi trang mặc định

**Phương án chọn (ADR-0015 điều 4):** đổi tên tệp tĩnh.

| Bước | Từ | Thành |
|---|---|---|
| Tệp | `public/index.html` (Đơn hàng) | `public/orders.html` |
| Tệp | `public/home.html` (Trang chủ) | `public/index.html` |
| Script build | `web/orders.ts` → `public/js/orders.js` | không đổi |
| Điều hướng | `href="/"` = Đơn hàng | `href="/orders"` = Đơn hàng; `href="/"` = Trang chủ |

**Phải sửa theo:**
1. `src/shared/sw-policy.ts`: `PAGES` thêm `/orders` (giữ `/home` nếu làm chuyển hướng); `PRECACHE` thêm `/js/home.js`.
2. `web/shell.ts`: mọi `href="/"` trỏ Đơn hàng → `/orders`; hàm `active` của tab/mục.
3. `web/home.ts`: 3 ô số liệu đang dẫn `/` → `/orders`.
4. **11 kịch bản Chrome** mở `/` để vào Đơn hàng → `/orders`: `2026-09-19-pwa/` (`kiem-tra-giao-dien`, `do-luong`, `kiem-tra-nang-cap-sw`, `kiem-tra-nang-cap-sw-mot-may-chu`), `2026-09-20-a2/` (`a2-evidence`, `a2-smoke-form`), `2026-09-21-v1-0/` (`v1-bao-tri`, `v1-dang-nhap`, `v1-nguoi-phu-trach`, `v1-xac-nhan-png`), `2026-09-23-trang-chu-moi/` (`trang-chu-smoke`).
5. `tests/e2e/pwa.mjs`: đối chiếu `PAGES` với tệp HTML thật — tự khớp sau khi đổi tên.
6. `manifest.webmanifest`: **không đổi** (`start_url: "/"` vẫn đúng).
7. `web/CLAUDE.md` bảng kịch bản (tệp luật — chủ duyệt).

**`/home` sau khi đổi:** giữ `public/home.html` là một trang chuyển hướng nhẹ (`<meta http-equiv="refresh" content="0;url=/">` hoặc `location.replace("/")`) cho ai đã lưu liên kết trong 1 ngày qua. Rẻ, gỡ được sau vài tuần.

## 5. Ràng buộc (giữ nguyên từ các đợt trước)

- Tiếng Việt có dấu đầy đủ; không lộ chữ Anh.
- Không `innerHTML`; DOM dựng bằng `h()`.
- CSS sau mốc PWA chỉ dùng token; token mới khai ở `:root` nhóm "Riêng của Tour Đảo Booking".
- Bố cục nhiều cột giữ **DOM phẳng đúng thứ tự đọc điện thoại**, dùng `grid-column` (bài học Đợt C).
- Tiền dùng **số hiện hành sau điều chỉnh** (bài học Đợt B).
- Không đổi bản đồ quyền, không đổi schema, không thêm dependency.

## 6. Tiêu chí nghiệm thu

1. Ảnh chụp Trang chủ ở 1040px và 390px **đặt cạnh ảnh mockup**, người kiểm xác nhận bằng mắt từng khối khớp (không chỉ đọc mã).
2. 12 trang mở được, không tràn ngang, ở cả 2 khổ.
3. `/` ra Trang chủ; `/orders` ra Đơn hàng; `/home` chuyển về `/`.
4. Toàn bộ kịch bản Chrome (7 bộ) thoát mã 0.
5. `npm test`, `npm run typecheck`, `npm run test:e2e` đầy đủ + `audit-invariants` xanh.
6. Huy hiệu số đếm: hoặc có số thật, hoặc không vẽ — không có số giả.

## 7. Cần chủ dự án chốt TRƯỚC khi thi công (gom một chỗ)

1. **Huy hiệu "42" trên mục Đơn hàng:** chưa có API đếm tổng số đơn. Chọn: (a) thêm `totalCount` vào `GET /api/orders` hoặc vào `dashboard`, (b) đếm "đơn cần chú ý" (nháp + chưa phụ trách) thay vì tổng, hay (c) **không vẽ huy hiệu này**.
2. **Huy hiệu "1" trên Dịch vụ & giá + dòng "Sheet đã đổi giá" trong "Cần xem lại":** dữ liệu chỉ admin gọi được (`/api/catalog/admin`). Chọn: (a) chỉ admin thấy, người khác không thấy huy hiệu/dòng đó, (b) thêm số đếm vào `GET /api/orders/dashboard` cho mọi người văn phòng, hay (c) bỏ.
3. **Dòng phụ ô "Đơn nháp" = "N đơn đón trong 24 giờ tới":** cần thêm một số đếm vào API. Làm hay giữ chữ chung chung hiện tại?
4. **Dòng "2 góp ý mới chưa trả lời" trong "Cần xem lại":** mockup hiện cả **mã yêu cầu** (GY-0042, GY-0041). API badge hiện chỉ trả số. Làm đầy đủ (thêm dữ liệu) hay chỉ hiện số?
5. **Thời điểm deploy:** đổi trang mặc định là thay đổi nhân viên thấy ngay khi mở app. Deploy trong cửa sổ bảo trì và báo trước cho nhân viên?
6. **ADR-0015 duyệt chưa?** Task 4 và Task 5 không được bắt đầu khi ADR còn `proposed`.

## 8. Rủi ro đã biết

- **`web/shell.ts` là khung của cả 12 trang** — hỏng ở đây là hỏng toàn app. Giảm rủi ro: làm Task 4 riêng một commit, chạy lại **toàn bộ** kịch bản Chrome trước khi sang Task 5.
- **Đổi `/` làm 11 kịch bản Chrome hỏng cùng lúc** — nếu sửa vội sẽ không phân biệt được "kịch bản hỏng do đổi địa chỉ" với "trang thật hỏng". Giảm rủi ro: Task 5 sửa kịch bản TRƯỚC, chạy từng bộ, rồi mới đổi tên tệp.
- **Service worker cache `/`**: lần mở đầu sau deploy có thể ra bản cũ. Không tránh được; ghi vào runbook để không tưởng là lỗi.
- **Chưa ai xem Trang chủ trên iPhone thật** (nợ từ đợt trước, vẫn còn).
