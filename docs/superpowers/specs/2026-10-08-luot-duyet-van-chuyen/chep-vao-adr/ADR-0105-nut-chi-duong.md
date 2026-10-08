# ADR-0105 — Hai nút "Chỉ đường" (Google Maps, Apple Maps) trên màn tài xế

- **Trạng thái:** **accepted** 2026-10-08 — chủ dự án trả lời câu 1 và câu 2 của hộp hỏi lượt duyệt 8b: câu 1 chọn **"Duyệt, hai nút Google và Apple"**, tức **Q-1 = b** (khác khuyến nghị "Duyệt, chỉ Google Maps (Recommended)"); câu 2 chọn **"Có, trong khung giờ đã được phép (Recommended)"**, tức **Q-2 = a**. Nguyên văn câu hỏi và phương án ở mục "Lời chủ dự án". Câu 1 đã nói với chủ một lần (Hiến pháp P18) rủi ro một chiều của việc gửi điểm đến ra ngoài; chủ chấp nhận, nay bên thứ ba gồm cả Google lẫn Apple. Nút Apple chỉ hiện trên máy Apple, theo mô tả phương án chủ chọn "Thêm nút Apple Maps cho người dùng iPhone" (phán quyết G13); nới bài khoá DTO tài xế đúng một khoá nằm trong lời duyệt câu 1 (phán quyết G12). Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8b" (nhánh `claude/van-chuyen-goi-a-c` @ `19de847a`; phán quyết G12, G13 ở cùng sổ). Thân văn bản trình duyệt (tệp 03) viết theo Q-1 a; bản này viết lại mọi chỗ theo Q-1 b. AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-08.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/03-de-xuat-adr-nut-chi-duong.md`; trang ghép `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/00-trang-ghep.md` (hai hồ sơ có ngày, đóng băng).
- **Sửa:** ADR-0049 D3 (danh sách trường cho tài xế), ADR-0053 D7.2, D7.3 — từng câu ở mục "Câu ADR bị thay".
- **Mốc đo mã:** mọi `tệp:dòng` đo lại trên `claude/van-chuyen-goi-a-c` @ `19de847a` (văn bản trình duyệt đo @ `809918d5`; chỗ lệch ở mục "Chỗ văn bản trình duyệt lệch mã HEAD").
- **Xây trên lỗ đang hở:** không (mục "Sổ dừng dây chuyền").
- **Cửa:** xem mục "Cửa một chiều / hai chiều".

## Lời chủ dự án

- Nhiệm vụ gốc (2026-10-08): *"GPS & Bản đồ: Cho phép truyền địa chỉ/tọa độ ra dịch vụ bản đồ (Google/Apple Maps) làm nút 'Chỉ đường'…"*
- Chat 2026-10-08: làm *"Nút Chỉ đường trước"*; theo dõi vị trí xe theo thời gian thực viết ở văn bản sau.
- Lượt duyệt 8b, câu 1 (2026-10-08). Nguyên văn câu hỏi:

  > Lượt 8b, câu 1 — Bạn có duyệt nút "Chỉ đường" trên màn tài xế không? Tài xế bấm thì Google Maps mở sẵn điểm đến, chỉ trong ngày chạy; Nền tảng không gửi vị trí tài xế, không gửi tên hay số điện thoại khách. Nút này không phải theo dõi xe thời gian thực, phần đó để sau. Rủi ro một chiều: điểm đến thường là địa chỉ nhà riêng của khách, Google có thể giữ lại trong lịch sử tài khoản trên máy tài xế, đã gửi thì không thu lại được, và chưa ai kiểm việc này theo luật bảo vệ dữ liệu cá nhân.

  - Chủ chọn: **"Duyệt, hai nút Google và Apple"** — "Thêm nút Apple Maps cho người dùng iPhone; cùng rủi ro, màn hình đông nút hơn."
  - Khuyến nghị lúc hỏi (không chọn): "Duyệt, chỉ Google Maps (Recommended)" — "Một nút, dùng được cả iPhone lẫn Android, tài xế quen. Bạn chấp nhận rủi ro địa chỉ khách ra Google như mô tả."
  - Không chọn: "Chưa duyệt, kiểm luật trước" — "Hoãn nút này, nhờ người rành luật dữ liệu cá nhân xem trước rồi mới trình lại."
- Lượt duyệt 8b, câu 2 (2026-10-08). Nguyên văn câu hỏi:

  > Lượt 8b, câu 2 — Khi tài xế đối tác (nhà xe ngoài) bắt đầu dùng Nền tảng ở đợt sau, họ có thấy nút "Chỉ đường" không? (Nếu câu 1 chọn "Chưa duyệt" thì câu này để sau.)

  - Chủ chọn: **"Có, trong khung giờ đã được phép (Recommended)"** — "Chỉ trong khung giờ họ đã được xem tên khách, đúng luật bạn đã duyệt cho tài xế đối tác."
  - Không chọn: "Không, chỉ tài xế công ty" — "Tài xế đối tác tự tìm đường; địa chỉ khách ra ngoài ít hơn."

## Bối cảnh mã (đo @ `19de847a`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Điểm dừng | chỉ hai loại `PICKUP`, `DROPOFF`; đúng một nơi: điểm danh mục **hoặc** chữ tự do; chữ tự do 1–200 ký tự, lưu **đã che** dãy số; trạng thái `PENDING`, `ARRIVED`, `DONE`, `SKIPPED`, `MOVED` | `migrations/0042_chuyen_xe.sql:83, :91, :93, :97, :105` |
| Tên điểm cho tài xế | `tenNoi = location_name ?? maskLongDigits(place_text)` (che lại dãy ≥ 8 chữ số) | `src/modules/van-chuyen/dieu-phoi-dto.ts:30`; `src/shared/text-guards.ts:11` (`MIN_LONG_DIGIT_RUN = 8`) |
| Câu đọc điểm dừng | `LEFT JOIN v_loc_location_label` (view chỉ có `id, code, name, location_type_code, active`) | `src/modules/van-chuyen/chuyen-repo.ts:121-129` (JOIN `:126`); view `migrations/0010_locations.sql:39-40` |
| Địa chỉ danh mục | cột `loc_location.address` (≤ 300 ký tự); Quản trị sửa ở màn "Địa điểm"; tám dòng gieo **không** có địa chỉ | `migrations/0010_locations.sql:18, :28-36`; `web/locations.ts:77, :104` |
| DTO tài xế | `cuocChiTietDto` dựng từng khoá; phần tử `diem` có 10 khoá, không có địa chỉ; `hoTen`/`namSinh`, `lienHe` chỉ khi `trongNgay` | `src/modules/van-chuyen/tai-xe-dto.ts:37`, `diem` `:64-67`, `hoTen` `:71`, `lienHe` `:74-76`, `trongNgayChay` `:79` |
| Bài liệt kê khoá | `KHOA_DIEM` ghim đúng 10 khoá; `CAM_KHOA` cấm `placeKey`, `khoaNoi*`; hàm `ghim` so từng phần tử | `src/modules/van-chuyen/tai-xe-dto.test.ts:11, :17, :20-25` |
| Khung ngày chạy | `trongNgayChay` (hôm nay là ngày chạy, hoặc đang chạy và xuất bến từ ngày chạy) | `src/shared/dieu-phoi-kiem.ts:531-533` |
| Khung của tài xế đối tác | `trongKhungXemKhach` **chưa có trong mã** (tên đề xuất ở ADR-0053 D7.2; Đợt 6 chưa làm) | `docs/adr/ADR-0053-dieu-phoi-luot-3-tai-xe-doi-tac.md:55-63` |
| Tài xế được thấy | "điểm dừng (tên nơi; chữ tự do che dãy số)" **mọi lúc** | `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:234` |
| Trang tự cấm đọc vị trí | `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `Referrer-Policy: same-origin` | `public/_headers:12`, `:10` |
| CSP | không có `navigate-to`; `form-action 'self'` → nút phải là liên kết `<a>`, không phải form; `connect-src` không đổi | `public/_headers:8` |
| Khuôn liên kết ra ngoài có sẵn | `telHref` | `src/shared/viec-cua-toi.ts:79` |
| Cạnh module | `van-chuyen` được đọc `locations` | `src/architecture.test.ts:63` |
| Toạ độ | chưa có; chủ chọn "bảng phụ có kiểu" (câu 0.1), cần ADR nhỏ của `locations` | `docs/BACKLOG.md:199` (BL-VC-TOA-DO) |
| Migration lớn nhất | `0086_aud_order_change.sql` | `ls migrations` |

## Dạng liên kết của hai bản đồ (tra 2026-10-08)

| | Google Maps | Apple Maps |
|---|---|---|
| Liên kết | `https://www.google.com/maps/dir/?api=1&destination=<chuỗi đích đã mã hoá>&travelmode=driving` | `https://maps.apple.com/directions?destination=<chuỗi đích đã mã hoá>&mode=driving` |
| Nguồn (hạng [A]: đọc bản gốc ngày 2026-10-08 — tải trang thô rồi tìm đúng câu trích; trang Apple đọc qua tệp dữ liệu JSON của chính trang) | developers.google.com/maps/documentation/urls/get-started | developer.apple.com/documentation/mapkit/unified-map-urls ("Adopting unified Maps URLs"); support.apple.com/en-us/120585 ("Maps on the web is compatible with these web browsers", ngày đăng April 16, 2026) |
| Điểm xuất phát | không gửi. Tài liệu ghi: vắng `origin` thì bản đồ lấy điểm đầu phù hợp nhất, "such as device location, if available". Đó là việc giữa điện thoại và Google, ngoài Nền tảng | không gửi. Tài liệu ghi: vắng `source` thì Maps chỉ đường "from a person's current location". Đó là việc giữa điện thoại và Apple, ngoài Nền tảng |
| Khoá dịch vụ, tiền | tài liệu ghi "You don't need a Google API key to use Maps URLs". Không tốn tiền | tài liệu **không nêu** khoá hay phí; không có bước đăng ký nào trong tài liệu |
| iPhone | có ứng dụng Google Maps thì mở ứng dụng; không có thì mở Google Maps trong trình duyệt (tài liệu Google) | dạng `/directions` được tài liệu ghi cho **iOS 18.4 trở lên** (macOS 15.4, watchOS 11.4). iOS cũ hơn: **chưa kiểm** |
| Android | có ứng dụng Google Maps thì mở ứng dụng; không có hoặc bị tắt thì mở trình duyệt (tài liệu Google) | không có ứng dụng Apple Maps; nút Apple **không hiện** trên Android (Quyết định mục 1). Trang hỗ trợ Apple (đăng 2026-04-16) liệt kê trình duyệt di động cho "Maps on the web" nhưng không nêu tên Android; ADR này không dựa vào trang đó |
| Giới hạn độ dài | 2 048 ký tự cho cả liên kết | tài liệu không nêu: **chưa kiểm** |
| Nền tảng cài lên màn hình chính của iPhone | liên kết `target="_blank"` mở ứng dụng bản đồ hay Safari: **chưa kiểm** | như cột bên: **chưa kiểm** |

Dạng cũ `maps.apple.com/?daddr=…` chỉ thấy qua nguồn thứ cấp (tài liệu cũ của Apple nay chuyển về trang "unified Maps URLs"), nên không dùng làm căn cứ. Nếu người thi công thấy dạng `/directions` không chạy trên iPhone đời cũ mà tài xế đang dùng thì báo điều phối; đổi dạng liên kết là việc hai chiều, không cần ADR mới.

## Quyết định

1. **Hai nút** (Q-1 b):
   - Trên màn chuyến của tài xế (`/cuoc-chuyen`, `web/cuoc-chuyen.ts`), mỗi điểm `PICKUP` / `DROPOFF` chưa xong (trạng thái `PENDING` hoặc `ARRIVED`) có liên kết "Google Maps" và, trên máy Apple, liên kết "Apple Maps" đặt cạnh, chung nhãn nhóm "Chỉ đường".
   - Nút chỉ hiện ở điểm chưa xong của chuyến trong ngày chạy. Chuyến ở trạng thái nào thì hiện nút (`PLANNED` hay chỉ `RUNNING`; màn hiện có chỉ cho bấm điểm khi chuyến `RUNNING`, `web/cuoc-chuyen.ts:234`, `:299`) do kế hoạch chốt theo màn hiện có; đây là chữ bề mặt.
   - **Nút Google hiện trên mọi máy; nút Apple chỉ hiện trên máy Apple** (phán quyết G13), theo mô tả phương án chủ chọn: "Thêm nút Apple Maps cho người dùng iPhone". "Máy Apple" rộng hơn chữ "iPhone": gồm iPhone, iPad và máy Mac, vì cả ba có sẵn Apple Maps, và iPadOS có lúc tự báo mình là Mac (chuỗi nhận dạng trình duyệt ghi `Macintosh`) nên không tách chắc chắn được iPad khỏi Mac. Máy Android và máy khác (Windows…) không thấy nút Apple. Ẩn nút là bề mặt, đảo ngược được (hoàn tác: bỏ điều kiện ẩn).
   - Nhận biết máy Apple bằng một hàm thuần ở `src/shared/` nhận chuỗi nhận dạng trình duyệt (tên đề xuất `laMayApple(ua)`; khớp `iPhone`, `iPad`, `iPod`, `Macintosh`). Hàm không tự đọc `navigator`, để `node --test` kiểm được; màn hình truyền `navigator.userAgent` vào.
   - Liên kết mở `target="_blank"`, `rel="noreferrer noopener"`.
2. **Một chuỗi đích, hai liên kết, một hàm:**
   - Hai liên kết dựng **trong trình duyệt** từ **cùng một** chuỗi đích, bằng một hàm thuần ở `src/shared/` (tên đề xuất `lienKetChiDuong(chuoiDich)` → `{ google, apple } | null`), có `*.test.ts`.
   - Chỉ hàm này được viết hai địa chỉ gốc `www.google.com/maps/dir/` và `maps.apple.com/directions`; không chỗ nào khác tự dựng liên kết bản đồ.
   - Tham số duy nhất mang dữ liệu là `destination`. Không `origin`, `source`, `waypoint`; hai tham số cố định `api=1` (Google), `travelmode=driving` / `mode=driving`.
   - Chuỗi rỗng → `null` (không có nút). Liên kết Google dài hơn 2 048 ký tự sau mã hoá → `null` cho **cả hai** nút (không cắt chuỗi, vì địa chỉ cắt dở dẫn sai đường; hai nút cùng có hoặc cùng không). Đây là giả định bề mặt của người soạn: địa chỉ danh mục tới 300 ký tự, chữ tiếng Việt có dấu mã hoá thành 6–9 ký tự mỗi chữ, nên có thể vượt.
3. **Chuỗi đích** — chỉ một chuỗi, không gì khác:
   - điểm danh mục → `address` nếu có, ngược lại `name`;
   - chữ tự do → đúng `tenNoi` tài xế đang thấy (đã che), không bao giờ `place_key` hay `khoaNoi*`;
   - toạ độ: khi BL-VC-TOA-DO có ADR riêng thì ưu tiên toạ độ (ngoài phạm vi ADR này).
4. **Không gửi:**
   - vị trí tài xế: trang không đọc `geolocation`, giữ nguyên `public/_headers:12`. Ứng dụng bản đồ dùng vị trí điện thoại là việc giữa điện thoại và Google hoặc Apple, ngoài Nền tảng;
   - tên, năm sinh, SĐT, mã đơn, mã chuyến;
   - không khoá dịch vụ, không gọi từ máy chủ, không thêm `connect-src`, không nhúng bản đồ.
5. **Khoá DTO mới** (tên đề xuất `diaChiChiDuong`) — **một** khoá cho cả hai nút:
   - có mặt trên **mọi** phần tử `diem` khi `trongNgay`; vắng mặt (không phải chuỗi rỗng) ngoài khung, theo khuôn `hoTen`. Bài khoá giữ đúng dạng của văn bản trình duyệt: trong ngày chạy 10 + 1 khoá ở mọi điểm, ngoài ngày chạy 10 khoá. Nút chỉ hiện ở điểm chưa xong (mục 1) — đó là luật của màn hình, không phải của DTO;
   - không thêm vào DTO văn phòng (văn phòng tự xem địa chỉ trên đơn; phạm vi nhỏ nhất trước);
   - không thêm vào danh sách xe khác mà tài xế thấy khi nhờ đón (ADR-0052 D4.4).
6. **View công bố mới của `locations`** (tên đề xuất `v_loc_location_dia_chi`: `id, address, active`):
   - migration chỉ `CREATE VIEW`; không đổi `v_loc_location_label` vì nhiều module đọc view đó;
   - `chuyen-repo.ts` thêm `LEFT JOIN` view mới vào câu đọc điểm dừng;
   - cập nhật `docs/data-dictionary.json` (mục view, ví dụ `v_loc_location_label` ở `:592`) + `npm run dict`, bảng view `docs/SYSTEM-DESIGN.md:258`.
7. **Giao diện đơn:** ô điểm đón gõ tay có dòng nhắc "Chỉ ghi địa chỉ — không ghi tên, số điện thoại khách" (chữ, không phải luật máy; dựa vào kỷ luật).
8. **Tài xế đối tác (Q-2 a):** khi Đợt 6 mở, khoá `diaChiChiDuong` đi theo `trongKhungXemKhach` (ADR-0053 D7.2, tên đề xuất, chưa có trong mã) thay cho `trongNgayChay`, cùng chỗ với `hoTen`. Hôm nay tài xế đối tác chưa vào được route chuyến nào (ô `trip.view` của `DRIVER_PARTNER` là `none`, `src/shared/permissions.ts:187`), nên không có gì đổi cho họ trước Đợt 6.
9. **Ngoài phạm vi:** theo dõi vị trí xe thời gian thực, lưu toạ độ, ước giờ tới, nút cho văn phòng.

### Vì sao chặn theo ngày chạy dù tên nơi đã hiện mọi lúc
ADR-0049 `:234` cho tài xế thấy tên nơi, kể cả chữ tự do, **mọi lúc**; ADR này không đổi điều đó. Cổng ngày chạy chỉ giới hạn việc **gửi sang bên thứ ba** vào đúng ngày cần dẫn đường, theo tinh thần "hình chiếu có lọc" (Hiến chương 4.4, `docs/ARCHITECTURE.md:85`). Nó cũng tránh tài xế lỡ tay gửi địa chỉ của chuyến tuần sau.

## Hệ quả và rủi ro

- **Dữ liệu ra hai bên thứ ba (một chiều; chủ đã nghe và chấp nhận — Hiến pháp P18, không nhắc lại):** mỗi lần tài xế bấm, chuỗi đích (có khi là địa chỉ nhà riêng của khách, vì danh mục khách sạn còn trống theo báo cáo ngày 7/10 — chưa kiểm trên dữ liệu thật) đi tới Google hoặc Apple. Phía Google, lịch sử tìm kiếm trong tài khoản Google trên máy tài xế có thể giữ lại. Phía Apple, Apple lưu hay không, lưu bao lâu: **chưa kiểm**. Khi bản đồ mở trong trình duyệt (máy không có ứng dụng bản đồ), liên kết mang địa chỉ còn nằm trong lịch sử trình duyệt của máy tài xế. Nền tảng không xoá được những chỗ đó, và gỡ nút cũng không thu lại được.
- **Chữ tự do có SĐT viết tách nhóm:** `maskLongDigits` chỉ che dãy ≥ 8 chữ số; SĐT viết tách nhóm ngắn hơn 8 chữ số không bị che, nên có thể ra Google hoặc Apple. Lớp bù là dòng nhắc trên ô (mục 7) — dựa vào kỷ luật.
- **Quản trị nên nhập địa chỉ** cho các điểm hay dùng ở màn "Địa điểm"; điểm chưa có địa chỉ thì gửi tên điểm, bản đồ có thể tìm sai.
- **Migration:** một view (mục "Migration").
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` (bảng view, DTO tài xế), `docs/CHANGE-GUIDE.md`, `docs/data-dictionary.json` + `npm run dict`, hướng dẫn tài xế, nhật ký thay đổi lời thường.
- **Việc lớn** (dữ liệu cá nhân ra ngoài): kế hoạch riêng, mỗi task đỏ → xanh, người kiểm độc lập chỉ-đọc.

## Câu ADR bị thay / bổ sung (không sửa tệp ADR cũ)

Dòng trỏ ở dòng Trạng thái của từng ADR cũ: `dong-tro-adr-cu-8b.md` cùng thư mục.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 `:234` (danh sách trường cho tài xế, "Được") | "điểm dừng (tên nơi; chữ tự do che dãy số), giờ hẹn, giờ xe tới;" | giữ, + "**trong ngày chạy:** chuỗi đích chỉ đường của điểm (địa chỉ danh mục, không có thì tên điểm danh mục; chữ tự do: đúng tên nơi đã che), để mở Google Maps hoặc Apple Maps — ADR-0105" |
| ★ ADR-0049 `:239` ("trong ngày chạy") | "Ngoài khoảng đó các khoá tên, năm sinh, SĐT **vắng mặt** (không phải chuỗi rỗng)." | "Ngoài khoảng đó các khoá tên, năm sinh, SĐT và chuỗi đích chỉ đường (ADR-0105) **vắng mặt** (không phải chuỗi rỗng)." |
| ★ ADR-0053 `:55` (D7.2, tài xế đối tác thấy trong khung) | "tài xế đối tác thấy **họ tên + năm sinh khách, tên + SĐT người liên hệ** khi và chỉ khi …" | "… thấy **họ tên + năm sinh khách, tên + SĐT người liên hệ, chuỗi đích chỉ đường của điểm** (ADR-0105, Q-2 a) khi và chỉ khi …" |
| ADR-0053 `:69` (D7.3, tài xế đối tác "Thấy") | "như tài xế công ty ở ADR-0049 D3 (…) + khung D7.2 + …" | giữ, + "chuỗi đích chỉ đường chỉ trong khung D7.2 (ADR-0105, Q-2 a)" |

Dòng có dấu ★ là thêm so với văn bản trình duyệt: câu "vắng mặt ngoài khung" của hai ADR phải gồm khoá mới, nếu không hai ADR đã duyệt nói thiếu về khoá đó.

## Cửa một chiều / hai chiều

- **Một chiều:**
  - mỗi chuỗi đích đã gửi sang Google hoặc Apple (không thu lại; lịch sử tài khoản, lịch sử trình duyệt trên máy tài xế);
  - view công bố mới là hợp đồng giữa hai module (gỡ phải theo expand–contract).
- **Hai chiều:** hai nút, điều kiện ẩn nút Apple ngoài máy Apple, dạng liên kết của từng bản đồ, khoá DTO (bỏ được trong một lần phát hành), dòng nhắc, ngưỡng độ dài.

## Migration

Một tệp chỉ `CREATE VIEW v_loc_location_dia_chi`. Số = số lớn nhất trong `migrations/` + 1 lúc thi công (hôm nay lớn nhất `0086`, nên dự kiến `0087`). ADR-0104 Đ2 cũng cần một migration view (`v_aud_order_cmd`): mỗi tệp một số, quét mọi nhánh chưa gộp trước khi đặt số.

## Bài kiểm / hàng rào

Mỗi rào quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md`.

1. `src/modules/van-chuyen/tai-xe-dto.test.ts`: `KHOA_DIEM` trong ngày chạy = 10 khoá + `diaChiChiDuong` ở **mọi** điểm; ngoài ngày chạy giữ đúng 10 khoá. Đây là **nới có tên** bài ghim (Điều 9.4), đúng một khoá, chỉ trong ngày chạy, ghi lý do ADR-0105 ở chú thích. Căn cứ (phán quyết G12): câu 1 **không** có câu "đồng ý nới bài khoá" của câu duyệt gợi ý tệp 03, nhưng việc nới vẫn nằm trong lời duyệt vì hai lẽ. Thứ nhất, nút không thể có nếu chuỗi đích không tới được trình duyệt của tài xế. Thứ hai, rủi ro mà bài khoá canh (dữ liệu khách ra ngoài) chính là rủi ro câu 1 đã tả và chủ đã chấp nhận. Với chữ tự do, khoá mới chỉ lặp lại `tenNoi` tài xế đang thấy; dữ liệu mới duy nhất tới máy tài xế là địa chỉ của điểm danh mục (địa chỉ nơi kinh doanh). Hoàn tác: bỏ khoá khỏi DTO.
2. Bài mới: chuỗi đích của điểm chữ tự do chứa dãy ≥ 8 chữ số → đã che; không bao giờ trùng `place_key`; điểm danh mục có địa chỉ → địa chỉ, không có → tên.
3. Bài hàm thuần `lienKetChiDuong`:
   - hai liên kết giải mã ra **cùng** chuỗi đích;
   - mã hoá đúng chữ có dấu, dấu cách, `&`, `#`, `+`, `/`, `?`;
   - không có tham số điểm xuất phát (`origin`, `source`, `saddr`) hay điểm giữa;
   - chuỗi rỗng → `null`; chuỗi dài làm liên kết Google vượt 2 048 ký tự → `null` cho cả hai.
4. Bài hàm thuần nhận biết máy Apple (`laMayApple`, mục 1), mỗi ca một chuỗi nhận dạng trình duyệt mẫu: iPhone → đúng; iPad tự báo là Mac (`Macintosh`) → đúng; Android → sai; Windows → sai.
5. Bài tĩnh:
   - không tệp `web/` nào gọi `navigator.geolocation`; `public/_headers` vẫn có `geolocation=()`; `connect-src` không thêm miền bản đồ;
   - chuỗi `google.com/maps` và `maps.apple.com` chỉ xuất hiện trong hàm `lienKetChiDuong` (một chỗ dựng liên kết);
   - chỗ dựng liên kết bản đồ ở `web/` gán `rel="noreferrer noopener"`.
6. Bài ghim cột view `v_loc_location_dia_chi` = đúng `id, address, active`, theo khuôn bài ghim cột `v_loc_location_label` (`src/migrations-n1.test.ts:57-60`).
7. Kịch bản Chrome màn tài xế, kết quả theo chuỗi nhận dạng trình duyệt: Chrome trên máy Mac của người thi công báo `Macintosh` nên điểm chưa xong trong ngày chạy có cả hai nút; giả lập Android (ví dụ chế độ điện thoại của khung xem trước, chuỗi nhận dạng Android Chrome) chỉ thấy nút Google; điểm đã xong và chuyến hôm trước không thấy nút nào. Ảnh thật iPhone theo thói quen duyệt giao diện.
8. Thử tay trên máy thật, ghi kết quả vào sổ thi công: iPhone (Nền tảng cài lên màn hình chính) bấm từng nút — mở ứng dụng hay Safari; Android chỉ thấy nút Google, bấm thì mở Google Maps.
9. `npm test`, `npm run typecheck`, `npm run test:e2e`.

## Phương án bị loại

- **Một nút Google (Q-1 a, khuyến nghị lúc hỏi)** và **"Chưa duyệt, kiểm luật trước"** (phương án thứ ba của hộp hỏi): chủ chọn hai nút ngày 2026-10-08. **Chỉ Apple Maps** (Q-1 c của tệp 03) không đưa vào hộp hỏi.
- **Nút Apple trên mọi máy:** mô tả phương án chủ chọn nói nút Apple là "cho người dùng iPhone", và Apple Maps trên web chạy trên Android hay không chưa kiểm (phán quyết G13).
- **Gửi tên điểm** (không khoá DTO mới, không view mới, không nới bài khoá — nút dựng từ `tenNoi` tài xế đã có): bị loại vì địa chỉ chính xác hơn tên điểm; bản đồ tìm theo tên dễ ra sai nơi.
- **Gửi toạ độ:** chưa có dữ liệu toạ độ (BL-VC-TOA-DO).
- **Bản đồ nhúng trong Nền tảng** (Google Maps JavaScript API, MapKit JS): cần khoá, có thể tốn tiền, phải mở CSP `script-src`, và bên thứ ba thấy cả màn của tài xế.
- **Máy chủ tự gọi dịch vụ chỉ đường:** cần khoá, là bí mật (N10), và máy chủ thành bên chuyển dữ liệu khách.
- **Nút mọi lúc:** gửi địa chỉ ra ngoài sớm hơn ngày cần.
- **Đọc vị trí tài xế để tính đường:** chủ để việc theo dõi vị trí cho văn bản sau, và hiện trang tự cấm (`geolocation=()`).
- **Hai khoá DTO, mỗi bản đồ một khoá:** cùng một dữ liệu, nới bài khoá hai lần; liên kết dựng ở trình duyệt từ một chuỗi là đủ.

## Sổ dừng dây chuyền (`docs/quyen-hoan.json`, đọc 2026-10-08)

Các mục HIGH đang mở (TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2, HC-5.11) thuộc sổ tiền, sao lưu và tác vụ tự động; không mục nào thuộc vùng điểm dừng, DTO tài xế hay `locations`. Không xây trên lỗ đang hở.

## Sau khi chép (việc kế của điều phối, không thuộc bản chép này)

- Thêm hai dòng vào `RANG_BUOC_NGOAI.md`: dịch vụ bản đồ Google (Maps URLs nhận chuỗi đích, không khoá) và Apple (unified Maps URLs, iOS 18.4+; "Maps on the web" trên trình duyệt khác), kèm nguồn, ngày kiểm, hạn kiểm lại 3 tháng.

## Chỗ văn bản trình duyệt lệch mã HEAD (đo @ `19de847a`)

- `trongNgayChay` nay ở `src/shared/dieu-phoi-kiem.ts:531-533` (tệp 03 ghi `:480-482`).
- `public/_headers`: `Referrer-Policy` ở `:10`, `Permissions-Policy` ở `:12` (tệp 03 ghi hai dòng theo thứ tự ngược ở bảng hiện trạng; câu "giữ nguyên `:12`" vẫn đúng).
- Migration lớn nhất nay là `0086` (tệp 03 ghi `0083`).
- `docs/data-dictionary.json`: mục `v_loc_location_label` ở `:592` (tệp 03 ghi `:591`).
- Tệp 03 nói "chỉ gửi sang Google"; Q-1 b đổi thành Google hoặc Apple — mọi câu liên quan đã viết lại ở bản này.

## Chưa kiểm

- Apple: dạng `/directions` trên iOS cũ hơn 18.4; giới hạn độ dài liên kết; Apple lưu chuỗi đích hay không; Apple Maps có tiếng Việt, có phủ Việt Nam không.
- iPad đời mới gửi chuỗi nhận dạng `Macintosh`: người soạn dựa vào hiểu biết chung, chưa đo trên máy thật (bài 4 dùng chuỗi mẫu).
- Nền tảng cài lên màn hình chính iPhone: liên kết mở ứng dụng bản đồ hay Safari (cả hai nút).
- Production có bao nhiêu điểm danh mục đã có địa chỉ; tỉ lệ chặng dùng chữ tự do (báo cáo ERP C09, C10 chỉ đo trên dữ liệu thử).
- Vị thế pháp lý của việc gửi địa chỉ nhà khách sang Google và Apple theo luật bảo vệ dữ liệu cá nhân.
