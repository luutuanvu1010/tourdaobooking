# ADR-0076 — Nơi trả mặc định theo dịch vụ: một cột trên mẫu chặng `vc_leg_template`, form tự điền, người lập sửa được

- **Trạng thái:** **accepted** — chủ dự án 2026-10-01, hộp chọn lượt 2 câu Q-D: **"Quản trị cài ở Danh mục (Recommended)"**, được báo trước rằng chọn A là duyệt bản nháp này (`docs/superpowers/specs/2026-10-01-uu-tien-xe-chay-quyet-dinh.md`). Người kiểm độc lập: ĐẠT CÓ ĐIỀU KIỆN vòng 2 (ba mục chữ V6, T6, T7 đã sửa). **Đã thi công và lên production bản 1.53** (cột nằm trong cùng `CREATE TABLE` của `migrations/0059_mau_chang.sql` — nhánh "nếu `ALTER` → trigger" ở D1 không dùng tới).
- **Số hiệu:** 0076 — chốt 2026-10-01 (0071 HCNS, 0072 Giám đốc, 0073 trợ lý; 0074, 0075 đã có nhánh khác giữ).
- **Ngày:** 2026-10-01.
- **Loại:** bổ sung ADR-0054 D10.1–D10.2 (đã duyệt). Thay ba câu của ADR-0054 (bảng cột D10.1, bài khoá route form, nghĩa thân route ghi mẫu) — xem mục "Câu ADR bị thay". Phần cửa một chiều / hai chiều ở dưới.
- **Nguồn (lời chủ và Giám đốc, chuẩn — không hỏi lại):**
  - Chủ, 1/10, hộp chọn U2 (`docs/superpowers/specs/2026-10-01-uu-tien-xe-chay-quyet-dinh.md`): "Thêm cả các ô mới: … **nơi trả tự điền theo dịch vụ** (chưa có ADR — cần ADR mới)". Ví dụ đã nêu: tour đảo → "Cảng Cầu Đá"; người lập sửa được.
  - Giám đốc, phiếu 30/9, điều muốn sửa nhất (c): "Điểm đón khách nội thành Nha Trang, điểm trả theo gói dịch vụ". Đối chiếu ở `docs/superpowers/specs/2026-10-01-doi-chieu-phieu-giam-doc.md` §2.1(c), dòng B2 (`:87`, `:109`), câu 14 (`:169`). Câu 14 có phương án (a) do AI khuyến nghị: "thêm cột 'nơi trả mặc định' vào mẫu chặng theo dịch vụ (ADR-0054), Quản trị cài trong app".
  - Chủ, 30/9, ĐP10 = a "Trong app" (ADR-0054 D10.1): "cài trong app, màn Danh mục, có lịch sử (không phải cột Google Sheet)".
- **ADR liên quan:**
  - ADR-0054 D10.1 (bảng `vc_leg_template`), D10.2 (hàm `changMacDinh`, mẫu chỉ là gợi ý ở form, "máy chủ không tự tạo chặng").
  - ADR-0047 A1 (chặng `ord_transfer_leg`: nơi trả là điểm danh mục HOẶC chữ tự do, tối đa một).
  - ADR-0049 (cổng xuất bến, lý do giữ `CHUA_CO_NOI_TRA`).
  - ADR-0050 VK1-B (khoá so sánh nơi).
  - ADR-0024 lý do "tách `pricing` khỏi `catalog`" (`ADR-0024:89`: dữ liệu đặt trong `catalog` mất mỗi lần đồng bộ Sheet).
  - ADR-0002 (đồ thị module).
  - Hiến chương Phần I (đã duyệt): 2.2, 5.1, 5.5, 5.6, 5.13.
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 1/10 ở HEAD `8f647226`).
- **Xây trên nền chưa có (Hiến chương 5.13):** ADR-0054 đã duyệt nhưng **chưa thi công**. Trên `main` 1/10 không có bảng `vc_leg_template`, route `mau-chang`, hàm `changMacDinh` (kiểm bằng `grep -rn "vc_leg_template\|changMacDinh\|mau-chang" src migrations` → 0 kết quả). ADR này thi công **sau hoặc cùng** lát D10.1 của ADR-0054. Kế hoạch: `docs/superpowers/plans/2026-10-01-may-chu-o-moi-chang-ke-hoach.md`, Task 7.

---

## Tóm tắt cho chủ (lời thường)

1. Ở màn Danh mục, mỗi dịch vụ có đưa đón sẽ có thêm ô **"Nơi trả mặc định"**, chọn từ danh sách Địa điểm. Ví dụ: tour đảo → bến tàu Cầu Đá.
2. Ai cài: **Quản trị và Toàn quyền**, ngay trong app. Mỗi lần đổi là một bản mới, xem lại được lịch sử, như ô "Đưa đón mấy chiều" bạn đã duyệt ở ADR-0054.
3. Khi lập đơn, chọn dịch vụ thì form **tự điền** nơi trả của chiều đi. Nếu dịch vụ hai chiều, nơi đó cũng là **nơi đón** của chiều về. Người lập **sửa được** trước khi lưu.
4. Dịch vụ chưa cài ô này thì nơi trả **để trống** như hôm nay. Xe vẫn bị giữ tới khi có nơi trả, máy không đoán.
5. Đổi ô này **không đổi đơn đã lập**.
6. Google Sheet bảng giá **không** đổi. Đồng bộ Sheet không chạm ô này.
7. Phần "điểm đón **nội thành** Nha Trang" của Giám đốc **không** nằm trong ADR này. Khuyến nghị ghi vào sổ việc để sau. Lý do ở mục D6.
8. Không đụng tiền, không đụng dữ liệu cá nhân, không thêm quyền mới.
9. **Bạn cần quyết:** câu Q1 ở cuối tệp (2 phương án, có khuyến nghị).

---

## Hiện trạng (đo ngày 1/10 trên `main`, HEAD `8f647226`)

| Nơi | Hiện trạng | Nguồn |
|---|---|---|
| Nơi trả của chặng | `dropoff_location_id` (điểm danh mục) HOẶC `dropoff_place` (chữ), tối đa một; cả hai trống = chưa chốt | `migrations/0034_chang_dua_don.sql:18-29` |
| Kiểm chặng | `kiemChang` nhận nơi trả tuỳ chọn, không tự điền | `src/shared/chang-dua-don.ts:112-156` |
| Cổng xuất bến | chặng không có nơi trả → giữ `CHUA_CO_NOI_TRA` | `src/shared/dieu-phoi-kiem.ts:326` |
| Mẫu chặng theo dịch vụ | **chưa có bảng** (ADR-0054 đã duyệt, chưa thi công) | `grep` 0 kết quả |
| Nơi check-in của dịch vụ trên đơn | `order_service.checkin_place` (chữ). Migration `0034` đã **chép nó làm nơi trả** cho chặng chép từ dữ liệu cũ | `0034:47-62` (dòng "nơi trả = nơi check-in của dịch vụ nếu có") |
| Địa điểm gieo sẵn | 8 điểm, gồm "Bến tàu du lịch Nha Trang" (`PIER`) và "Bến cảng Vinpearl" (`PORT`). **Không có điểm tên "Cảng Cầu Đá"**. Dữ liệu thật trên production **chưa kiểm** | `migrations/0010_locations.sql:28-36` |
| Đồng bộ Sheet | `applySync` chỉ ghi `catalog_item`, không đụng bảng khác | `docs/CHANGE-GUIDE.md` công thức k; `src/modules/catalog/repository.ts` |

---

## Quyết định

### D1. Dữ liệu: một cột trên mẫu chặng, trỏ danh mục Địa điểm

- **Cột mới trên `vc_leg_template`** (module `van-chuyen`; bảng do ADR-0054 D10.1 tạo): `default_dropoff_location_id TEXT NULL REFERENCES loc_location(id)`.
  - Trỏ **điểm danh mục**, không nhận chữ tự do. Lý do:
    - một giá trị dùng cho rất nhiều đơn, nên phải là điểm có tên chuẩn;
    - điểm danh mục cho khoá nơi ổn định `L:<id>` (ADR-0050), xe ghép chặng của nhiều đơn về cùng một điểm trả;
    - ngưng điểm thì biết ngay (cờ `active`).
  - Khoá ngoại `NO ACTION`, khuôn `vc_trip_stop.location_id` (`0042:92`). `van-chuyen` đã có khoá ngoại tới `loc_location` (`0042`), nên **không thêm cạnh module mới**. Điểm có tồn tại không do CSDL chặn. Còn "đang dùng" thì route kiểm qua view công bố `v_loc_location_label`, khuôn `tenDiem` ở `orders`.
  - NULL = dịch vụ không có nơi trả mặc định.
- **Chỉ có nghĩa khi dịch vụ có đưa đón:** `default_dropoff_location_id IS NULL OR mode <> 'NONE'`.
  - Nếu cột vào **cùng** `CREATE TABLE` với bảng (hai lát gộp một migration): viết bằng `CHECK` bảng.
  - Nếu cột vào **sau** bằng `ALTER TABLE … ADD COLUMN`: SQLite không thêm `CHECK` nhiều cột bằng `ALTER` (`docs/CHANGE-GUIDE.md` công thức z bước 4). Khi đó dùng trigger `BEFORE INSERT`. Bảng chỉ-thêm nên không cần trigger `UPDATE`, vì trigger chỉ-thêm của ADR-0054 đã cấm `UPDATE`.
- **Lịch sử:** có sẵn. Bảng là chỉ-thêm, mỗi lần đổi là một dòng mới mang **đủ** `mode`, `return_time_hint`, `default_dropoff_location_id`. Dòng hiệu lực = dòng mới nhất đã tới (ADR-0054 D10.1). Không bảng riêng, không `valid_to`.
- **Một cột cho cả hai chiều** (không có cột "nơi đón mặc định chiều về"):
  - chiều **đi**: nơi trả = điểm mặc định;
  - chiều **về** (dịch vụ `ROUND_TRIP`): ADR-0054 D10.2 đã chốt "chặng về: nơi đón = nơi trả chiều đi, nơi trả = nơi đón chiều đi". Vì vậy nơi **đón** chiều về = điểm mặc định, nơi **trả** chiều về = nơi đón của khách (khách sạn, thường gõ tay), **không** lấy từ mẫu;
  - dịch vụ `ONE_WAY`: chỉ chặng đi có nơi trả mặc định.

### D2. Ai cài: Quản trị và Toàn quyền, trong app (ĐP10 = a)

- **Cùng route ghi mẫu của ADR-0054:** `POST /api/van-chuyen/mau-chang/:code` (cổng `admin`, `can(admin.manage)`). Thân thêm khoá `noiTraMacDinhId` (uuid hoặc `null`). Mỗi lần ghi là một bản đầy đủ: thân **vắng** khoá này thì máy chủ chép giá trị của bản hiện hành, khuôn "khoá vắng = giữ" (ADR-0047). **Trừ** khi bản mới có `mode = 'NONE'`: khi đó ghi `NULL`, vì chép sẽ vi phạm NT-D1 và trả 400 bất ngờ cho Quản trị đang tắt đưa đón. `null` tường minh = bỏ mặc định.
- **Kiểm lúc ghi (máy chủ):**
  - điểm phải đang dùng, đọc qua `v_loc_location_label.active = 1` (sai → 400, câu tiếng Việt);
  - `mode = 'NONE'` mà có điểm → 400 (lớp CSDL D1 là lưới thứ hai).
- **Nhật ký:** hành động có sẵn của ADR-0054 `transfer_template_set`. `detail` thêm "nơi trả mặc định <tên điểm cũ> → <tên điểm mới>" (tên điểm danh mục, không id). Không dữ liệu cá nhân.
- **`mode` và `returnTimeHint` vẫn bắt buộc** trong thân như ADR-0054 D10.1 (mỗi dòng là một bản đầy đủ). Thiếu `mode` → 400. `returnTimeHint` gửi `null` khi không gợi ý. Chỉ `noiTraMacDinhId` mới có luật "vắng = giữ" (để màn Danh mục cũ, chưa biết ô này, không vô tình xoá nơi trả).
- **Không thêm ô quyền.** Đọc lịch sử: `GET /api/van-chuyen/mau-chang/:code` (cổng `admin`).

### D3. Lúc nào máy điền: chỉ ở form, qua hàm thuần dùng chung — đã chốt ở ADR-0054 D10.2, áp dụng, không hỏi lại

- Hàm thuần `changMacDinh(mauChang, dichVu)` (`src/shared/`, ADR-0054 D10.2) nhận thêm `noiTraMacDinh: { id, ten } | null` từ mẫu và điền:
  - `dropoffLocationId` của chặng `OUT`;
  - `pickupLocationId` của chặng `RETURN`.
- Form gọi hàm này **khi người lập chọn dịch vụ**. Máy chủ **lưu đúng cái người lập gửi**, **không** tự điền nơi trả khi thân để trống. Lý do:
  1. ADR-0054 D10.2 đã chốt mẫu chặng chỉ là gợi ý ở form, máy chủ không tự tạo chặng ("tự tạo ở máy chủ thì chặng người lập đã bỏ sẽ bị tạo lại"). Nơi trả là một trường của chặng đó, cùng luật.
  2. Máy chủ không phân biệt được "người lập cố ý để trống" với "chưa điền". Tự điền ở máy chủ là ghi đè ý người lập.
  3. `orders` không được import `van-chuyen` (`src/CLAUDE.md`). Điền ở máy chủ phải tiêm qua gốc lắp ráp, thêm một đường phụ thuộc chỉ để làm điều (2) sai.
  4. Luật "dẫn xuất chỉ tính ở server" (`CLAUDE.md` §7) nói về **tiền**: không tin số tiền từ trình duyệt. Nơi trả gợi ý không phải số dẫn xuất. Sau khi lưu, nó là dữ liệu do người lập nhập, đi qua cùng `kiemChang` + `tenDiem` ở máy chủ như hôm nay.
- **Route đọc mẫu cho form** `GET /api/van-chuyen/mau-chang` (cổng `orders`, `can(order.create)` — ADR-0054) thêm **một** khoá mỗi dịch vụ: `noiTraMacDinh: { id, ten } | null`.
  - Điểm đã **ngưng** → trả `null`. Nếu trả, form sẽ gửi id điểm ngưng và `tenDiem` sẽ trả 400 "điểm không còn dùng".
  - Bài liệt kê khoá của route này (ADR-0054, mục hàng rào) thêm khoá `noiTraMacDinh`. Khoá vẫn không mang tên khách, năm sinh, tiền.

### D4. Người lập sửa đè được

- Trước khi lưu: người lập đổi sang điểm khác, gõ chữ tự do, hoặc xoá trống. Form không khoá ô.
- Sau khi lưu: nơi trả là dữ liệu chặng bình thường. Sửa theo đúng luật chặng hiện có:
  - đơn nháp: `PUT /api/orders/:id`, ô `order.modify`;
  - đơn đã xác nhận: `PUT /api/orders/:id/legs/:legId`, ô `order.trip.edit`, xét mốc 6 giờ như ADR-0049 D2 ("nơi trả" có trong bốn trường).
  - Không thêm quyền, không thêm đường ghi.
- Đổi mẫu **không** đổi chặng của đơn đã có (Hiến chương 5.6, ADR-0054 D10.2).

### D5. Dịch vụ không có mặc định → để trống; cổng xuất bến giữ nguyên

- Mẫu không có dòng nào, hoặc `default_dropoff_location_id IS NULL`: form để trống nơi trả như hôm nay.
- `CHUA_CO_NOI_TRA` (`src/shared/dieu-phoi-kiem.ts:326`) **không đổi**. Xe vẫn bị giữ tới khi chặng có nơi trả. Không có giá trị "đoán" ở máy chủ.

### D6. "Vùng nội thành Nha Trang" — không làm trong ADR này; khuyến nghị ghi BACKLOG

- Câu của Giám đốc có hai vế: (1) điểm trả theo gói dịch vụ — **ADR này**; (2) điểm đón "nội thành Nha Trang".
- Vế (2) có thể hiểu là:
  - (i) danh sách điểm đón giới hạn trong nội thành;
  - (ii) cờ "trong / ngoài nội thành" trên Địa điểm để tính phụ phí hoặc cảnh báo;
  - (iii) vùng địa lý để xếp xe theo khu.
  Mỗi cách đụng một chỗ khác (danh mục Địa điểm, tiền, xếp xe). Không cách nào bắt buộc để xe chạy được hôm nay.
- Chủ đã chọn 1/10: "trước hết làm những phần **bắt buộc để xe chạy**". Vì vậy **khuyến nghị:** ghi vế (2) vào `docs/BACKLOG.md` mục 15 (phiếu Giám đốc), kèm câu hỏi lại Giám đốc "nội thành dùng để làm gì". ADR này **không** sửa `docs/BACKLOG.md` (ngoài phạm vi tệp được giao); điều phối ghi khi chủ đồng ý.

### D7. Google Sheet và đồng bộ danh mục — không chạm

- Ô này **không** là cột Sheet (ĐP10 = a; lý do giống `ADR-0024:89`: dữ liệu đặt trong `catalog` mất mỗi lần đồng bộ).
- Đồng bộ 15 phút (`catalog/repository.ts` `applySync`) chỉ ghi `catalog_item` bằng `INSERT … ON CONFLICT DO UPDATE` / `UPDATE in_sheet = 0`, không đụng `vc_*`. `vc_leg_template.code` là **tham chiếu logic** (không khoá ngoại) tới mã dịch vụ (ADR-0054 D10.1). Dòng Sheet biến mất rồi quay lại thì mẫu vẫn còn.
- **Chưa kiểm:** mã dịch vụ có ổn định qua mỗi lần sửa Sheet không (cùng câu "Chưa kiểm" của ADR-0054).

---

## Bảng quyền (9 quyền) — không đổi ô nào, chỉ liệt kê ai chạm cột mới

Cột theo thứ tự `row(…)` ở `src/shared/permissions.ts`. Giá trị đo 1/10 tại `permissions.ts:76-78, :123`.

| Việc | SALES | ACCOUNTING | ADMIN | FIELD | PARTNER | SUPER_ADMIN | INTERN | DRIVER | DRIVER_PARTNER |
|---|---|---|---|---|---|---|---|---|---|
| Cài / đổi nơi trả mặc định (`admin.manage`) | — | — | ✔ | — | — | ✔ | — | — | — |
| Xem lịch sử mẫu ở màn Danh mục (cổng `admin`, `admin.manage`) | — | — | ✔ | — | — | ✔ | — | — | — |
| Nhận gợi ý ở form lập đơn (`order.create`) | ✔ | — | ✔ | — | ✔ | ✔ | ✔ | — | — |
| Sửa nơi trả trên đơn nháp (`order.modify`) | đơn mình / đang phụ trách | — | ✔ | — | đơn mình | ✔ | đơn mình | — | — |
| Sửa nơi trả sau xác nhận (`order.trip.edit`) | đơn mình / đang phụ trách | — | ✔ | — | — | ✔ | — | — | — |
| Thấy nơi trả của chặng (tài xế) | — | — | — | — | — | — | — | chuyến đang lái (đã có, ADR-0049 D3) | như DRIVER khi lượt 3 mở (ADR-0053) |

Không thêm, không đổi ô. Đối tác và Thực tập nhận **gợi ý** qua `order.create` như mọi khoá khác của mẫu (ADR-0054). Ô `money.view` không liên quan: mẫu không mang giá.

## Trang ghép (CLAUDE.md §9 — bảng dùng chung nhận dữ liệu mới)

1. **`vc_leg_template` chứa loại thực thể gì:** một loại duy nhất, "cách đưa đón mặc định của một dịch vụ", có lịch sử. Cột mới thêm thuộc tính "điểm trả mặc định" cho đúng loại đó, không thêm loại thực thể mới. Không chứa người, tiền, đơn.
2. **Dòng bản đồ quyền chạm bảng:** ghi = `admin.manage` (một dòng); đọc qua route form = `order.create` (chỉ khoá danh sách trắng). Không dòng nào khác.
3. **Cổng canh cửa:**
   - cổng `admin` cho đọc / ghi lịch sử;
   - cổng `orders` + `can(order.create)` cho route đọc của form;
   - khoá ngoại `loc_location` + kiểm `active` ở route ghi;
   - lớp `CHECK` / trigger "chỉ khi có đưa đón";
   - trigger chỉ-thêm (ADR-0054).
4. Lượt duyệt này có **1** quyết định chạm dữ liệu (cột mới). Không chạm quyền.

## Bất biến và hàng rào

| Mã | Luật | Lớp |
|---|---|---|
| NT-D1 | Có điểm mặc định ⇒ `mode <> 'NONE'` | `CHECK` (cùng `CREATE TABLE`) hoặc trigger `BEFORE INSERT` (nếu `ALTER`); route 400 |
| NT-D2 | Điểm mặc định tồn tại | khoá ngoại `loc_location` |
| NT-D3 | Điểm mặc định đang dùng lúc ghi | route (đọc `v_loc_location_label`) |
| NT-D4 | Mẫu hiện hành trỏ điểm **đã ngưng** | câu kiểm định kỳ mới ở `scripts/audit-checks.mjs` (mức `warn` — tình trạng nghiệp vụ hợp lệ, báo Quản trị cài lại); route form trả `null` |
| NT-D5 | Máy chủ không tự điền nơi trả | bài: lưu nháp chặng `OUT` không có nơi trả cho dịch vụ có mặc định → CSDL vẫn trống |
| NT-D6 | Đồng bộ Sheet không đổi mẫu | bài: gieo mẫu → `sync force` → dòng mẫu y nguyên (e2e `catalog.mjs`) |

Mỗi hàng rào mới có một dòng ở `docs/SO-HANG-RAO.md`, kèm ngày thấy chặn thật (sửa cố ý → đỏ → hoàn nguyên).

## Ví dụ

1. Quản trị cài dịch vụ `TD101` (tour 4 đảo): "Hai chiều", giờ về gợi ý 16:00, nơi trả mặc định "Bến tàu du lịch Nha Trang". Nhật ký: "Mẫu đưa đón TD101: hai chiều; giờ về 16:00; nơi trả mặc định (trống) → Bến tàu du lịch Nha Trang".
2. Bán hàng lập đơn, chọn `TD101`. Form tạo sẵn:
   - chặng đi: đón ở ô trống (người bán gõ "KS Mường Thanh"), trả ở "Bến tàu du lịch Nha Trang";
   - chặng về: đón ở "Bến tàu du lịch Nha Trang" lúc 16:00, trả ở "KS Mường Thanh".
   Người bán lưu. CSDL ghi đúng như thế.
3. Khách muốn xuống ở bến khác: người bán đổi nơi trả chiều đi thành "Bến cảng Vinpearl" trước khi lưu. Mẫu không đổi.
4. Hôm sau Quản trị đổi nơi trả mặc định của `TD101`. Đơn ở ví dụ 2 **không** đổi. Đơn lập sau đó nhận điểm mới.
5. Dịch vụ `MOTO01` không cài nơi trả. Form để trống, chuyến xe chở khách dịch vụ này bị giữ "Chưa có nơi trả" tới khi văn phòng điền.
6. Quản trị ngưng điểm "Bến tàu du lịch Nha Trang". Form lập đơn nhận `noiTraMacDinh: null` (ô trống). Kiểm định kỳ NT-D4 báo "mẫu TD101 trỏ điểm đã ngưng".

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0054 D10.1, bảng cột `vc_leg_template` | `id`, `code`, `mode`, `return_time_hint`, `valid_from_at`, bốn cột WHO | thêm `default_dropoff_location_id` (TEXT NULL, khoá ngoại `loc_location`; chỉ khi `mode <> 'NONE'` — ADR-0076 D1) |
| ADR-0054 "Hệ quả", hàng rào "bài liệt kê khoá của route đọc mẫu cho form (chỉ mã, chế độ, giờ gợi ý)" | "chỉ mã, chế độ, giờ gợi ý" | "chỉ mã, chế độ, giờ gợi ý, **nơi trả mặc định** (`{ id, ten }` hoặc `null` khi điểm đã ngưng)" |
| ADR-0054 "Hệ quả", route `POST /api/van-chuyen/mau-chang/:code` — "thêm bản mới" (thân là bản đầy đủ) | thân mang đủ `mode`, `returnTimeHint` | thân thêm `noiTraMacDinhId`. Khoá **vắng** = chép điểm của bản hiện hành, trừ khi `mode = 'NONE'` thì `NULL`. `mode`, `returnTimeHint` vẫn bắt buộc (D2) |
| ADR-0054 D10.2, `changMacDinh` | "chặng về: nơi đón = nơi trả chiều đi, nơi trả = nơi đón chiều đi" | **không đổi câu**. Hàm nhận thêm nơi trả mặc định để điền nơi trả chiều đi; chiều về tự đảo theo câu cũ |

## Cửa một chiều / hai chiều

- **Một chiều (nhẹ):** cột `default_dropoff_location_id` trên `vc_leg_template` sau khi có dòng mang giá trị (bảng chỉ-thêm, không xoá được cột theo luật migration).
- **Hai chiều:** form điền ở đâu, chiều về đảo ra sao (hàm thuần); nhãn màn hình; mức cảnh báo NT-D4.
- **Không một chiều nào về tiền, quyền hay dữ liệu cá nhân.**

## Phương án bị loại

- **Máy chủ tự điền nơi trả khi thân để trống:** xem D3, lý do 1–3.
- **Cột Google Sheet:** chủ chọn "trong app" (ĐP10 = a); Sheet sửa nhầm thì đổi cách lập đơn mà không biết ai đổi.
- **Bảng riêng `vc_dropoff_default` (code, location, valid_from):** thêm một bảng, một luật "bản hiện hành" thứ hai cho cùng một dịch vụ. Hai bảng mẫu có thể lệch lịch sử (mẫu nói "không đưa đón" mà bảng kia vẫn có điểm trả).
- **Cho phép chữ tự do làm mặc định:** mất khoá nơi ổn định, không biết khi điểm thôi dùng, dễ có nhiều cách viết cùng một bến.
- **Hai cột (nơi trả chiều đi + nơi đón chiều về):** ADR-0054 D10.2 đã chốt chiều về đảo nơi chiều đi. Không có ví dụ thật nào cần khác (**chưa kiểm** với Giám đốc). Thêm sau bằng ADR nếu cần.

## Tiêu chí nghiệm thu (kiểm bằng máy)

1. **SQL** (`node:sqlite`):
   - chèn dòng mẫu `mode = 'NONE'` có điểm → `RAISE` (lớp `CHECK` / trigger);
   - điểm không tồn tại → lỗi khoá ngoại;
   - `UPDATE` dòng mẫu vẫn `RAISE` (trigger chỉ-thêm của ADR-0054).
2. **Route ghi:**
   - Quản trị gửi điểm đang dùng → 201, lịch sử còn bản cũ;
   - điểm đã ngưng → 400; `mode = NONE` + điểm → 400;
   - Bán hàng → 403;
   - thân vắng `noiTraMacDinhId` → bản mới chép điểm của bản cũ;
   - thân vắng `noiTraMacDinhId` + chế độ mới "không đưa đón" → 201, bản mới **không** có điểm (không 400);
   - nhật ký có "nơi trả mặc định A → B" (tên, không id).
3. **Route form:**
   - trả `noiTraMacDinh` đúng `{ id, ten }`;
   - điểm đã ngưng → `null`;
   - bài liệt kê khoá xanh (chỉ mã, chế độ, giờ gợi ý, nơi trả mặc định).
4. **Hàm `changMacDinh` (bảng ca):**
   - hai chiều + điểm → chặng đi trả ở điểm, chặng về đón ở điểm;
   - một chiều → chỉ chặng đi;
   - không điểm → trống;
   - không đưa đón → 0 chặng.
5. **Máy chủ không tự điền:** lưu nháp chặng đi không nơi trả, cho dịch vụ có mặc định → chặng trong CSDL vẫn trống nơi trả (NT-D5).
6. **Đổi mẫu không đổi đơn cũ:** lập đơn, đổi mẫu, đọc lại đơn → nơi trả y nguyên.
7. **Sheet:** `sync force` sau khi gieo mẫu → mẫu y nguyên (NT-D6, e2e `catalog.mjs`).
8. **Kiểm định kỳ NT-D4:**
   - ca xanh (điểm đang dùng);
   - ca có cảnh báo (điểm đã ngưng);
   - dữ liệu khoẻ ⇒ 0.
   Bài ở `src/audit-invariants.test.ts`.
9. Lệnh: `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` (đủ bộ, đuôi `audit-invariants --strict`).

## Câu hỏi cho chủ (gom một lần)

**Q1. Nơi trả mặc định lấy từ đâu?**

- **A (khuyến nghị) — Ô mới "Nơi trả mặc định" trong mẫu đưa đón của dịch vụ:** Quản trị chọn một điểm trong danh sách Địa điểm, có lịch sử; form tự điền, người lập sửa được.
  - Được: đúng ý Giám đốc "điểm trả theo gói dịch vụ"; cài một lần, mọi đơn sau dùng; xe ghép chặng theo đúng điểm.
  - Mất: thêm một cột dữ liệu (nhỏ); Quản trị phải cài cho từng dịch vụ (dịch vụ chưa cài thì vẫn trống như hôm nay).
- **B — Không thêm dữ liệu:** form chép "nơi check-in" mà người bán đã gõ cho dịch vụ trên đơn sang nơi trả chiều đi. Migration `0034` đã làm đúng việc này cho chặng chép từ dữ liệu cũ.
  - Được: không thêm cột, không cần cài ở Danh mục.
  - Mất: người bán vẫn phải gõ check-in mỗi đơn (không "tự điền theo dịch vụ"); check-in là chữ tự do, nhiều cách viết, xe khó ghép; không đúng câu chủ chọn ở U2.

**Kèm (không phải câu hỏi mới, chỉ xin đồng ý):** vế "điểm đón nội thành Nha Trang" ghi vào sổ việc để sau, kèm câu hỏi lại Giám đốc "nội thành dùng để làm gì" (D6).

## Chưa kiểm

- Production có điểm "Cảng Cầu Đá" hay chỉ có "Bến tàu du lịch Nha Trang" (gieo ở `0010`). Không đọc D1 remote.
- Có dịch vụ nào cần nơi đón chiều về **khác** nơi trả chiều đi không (lý do loại "hai cột").
- Mã dịch vụ có ổn định qua mỗi lần sửa Sheet không (giống ADR-0054).
- Tệp này chưa có người kiểm độc lập.
