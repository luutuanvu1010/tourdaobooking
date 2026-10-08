# ADR-0105 (số tạm, chốt khi gộp) — Nút "Chỉ đường" trên màn tài xế

> **Trạng thái:** **proposed**, bản nháp của người soạn ngày 2026-10-08. Chủ chưa duyệt; AI không tự duyệt (Hiến pháp N3). Chủ duyệt rồi người điều phối mới chép vào `docs/adr/`.
> **Số tạm 0105, chốt khi gộp** (người điều phối chốt; tệp 02 lấy 0104). Kiểm ngày 8/10 sau khi tải mới mọi nhánh: tìm "ADR-0103" tới "ADR-0109" trong `docs/` của mọi nhánh cục bộ và `origin/main` chỉ gặp các tệp của thư mục này. **Thuộc lượt 8b.**
> **Mốc đo mã:** nhánh `claude/van-chuyen-goi-a-c` @ `809918d5`.
> **Lời chủ:**
> - Nhiệm vụ gốc: *"GPS & Bản đồ: Cho phép truyền địa chỉ/tọa độ ra dịch vụ bản đồ (Google/Apple Maps) làm nút 'Chỉ đường'…"*
> - Chat 2026-10-08: làm *"Nút Chỉ đường trước"*; theo dõi vị trí xe theo thời gian thực viết sau.
> **Nguồn:** `docs/superpowers/specs/2026-10-07-danh-gia-erp-van-chuyen-ban-hang.md` (C09, C10: danh mục khách sạn trống, điểm đón phần lớn là chữ tự do); `docs/BACKLOG.md:199` (BL-VC-TOA-DO).

## Cho chủ dự án

Văn bản này thêm nút "Chỉ đường" cạnh từng điểm đón, điểm trả trên màn chuyến của tài xế. Tài xế bấm thì điện thoại mở Google Maps, đã điền sẵn điểm đến, rồi Google Maps tự dẫn đường. Thứ duy nhất Nền tảng gửi sang Google là điểm đến: địa chỉ của điểm trong danh mục, hoặc dòng chữ điểm đón mà Bán hàng đã gõ trên đơn. Nền tảng không gửi vị trí của tài xế, không gửi tên hay số điện thoại khách, không cần khoá dịch vụ của Google và không tốn tiền. Bạn cần trả lời hai câu ở cuối rồi duyệt.

Nút chỉ hiện cho tài xế công ty, trên chuyến mình đang được xếp lái, và chỉ trong ngày chạy, tức cùng khung giờ tài xế được thấy tên khách và số điện thoại người liên hệ. Với điểm trong danh mục như văn phòng, bến tàu, sân bay hay khách sạn, Nền tảng gửi địa chỉ Quản trị đã nhập ở màn "Địa điểm"; điểm nào chưa có địa chỉ thì gửi tên điểm, nên Quản trị nên nhập địa chỉ cho các điểm hay dùng. Với điểm đón gõ tay, Nền tảng gửi đúng dòng chữ tài xế đang thấy, trong đó các dãy số dài đã bị che như hôm nay. Vì vậy Bán hàng nên chỉ ghi địa chỉ vào ô này, không ghi tên hay số điện thoại khách, và ô sẽ có dòng nhắc như vậy. Văn bản này không làm theo dõi vị trí xe; phần đó để văn bản sau. Hiện Nền tảng còn tự cấm trang đọc vị trí điện thoại, và nút này không đổi điều đó.

**Điều bạn cần biết (nói một lần — Hiến pháp P18).** Danh mục khách sạn hiện còn trống, nên phần lớn lần bấm sẽ gửi dòng chữ gõ tay, có khi là địa chỉ nhà riêng của khách. Google nhận địa chỉ đó, và lịch sử tìm kiếm trong tài khoản Google trên máy tài xế có thể giữ lại mà Nền tảng không xoá được. Địa chỉ đã gửi đi thì không thu lại được, dù sau này gỡ nút. Tôi chưa kiểm việc này đã khớp luật bảo vệ dữ liệu cá nhân hay chưa. Việc này đứng riêng, không phụ thuộc hai văn bản kia, nên tôi đề nghị duyệt ở lượt sau để không vượt trần ba quyết định mỗi lượt (xem trang ghép, tệp 00).

**Hai câu hỏi.**
- **Q-1.** Mở bằng bản đồ nào?
  - (a) **Chỉ Google Maps, một nút (khuyến nghị):** dùng được cả iPhone lẫn Android, tài xế quen; máy không cài ứng dụng thì mở trang web Google Maps.
  - (b) Hai nút Google Maps và Apple Maps.
  - (c) Chỉ Apple Maps.
- **Q-2.** Khi tài xế đối tác bắt đầu dùng Nền tảng (Đợt 6, chưa làm), họ có thấy nút này không?
  - (a) **Có, chỉ trong khung giờ họ đã được phép thấy tên khách (khuyến nghị):** cùng luật đã duyệt cho tài xế đối tác.
  - (b) Không, chỉ tài xế công ty.

**Câu duyệt gợi ý:** "Duyệt ADR-0105: nút Chỉ đường trên màn tài xế, chỉ gửi điểm đến sang Google Maps, chỉ trong ngày chạy, không gửi vị trí tài xế, không theo dõi thời gian thực; Q-1 a, Q-2 a. Tôi đồng ý nới bài khoá danh sách trường điểm dừng của tài xế để thêm đúng một trường địa chỉ chỉ đường trong ngày chạy. Tôi chấp nhận rủi ro một chiều: địa chỉ, có khi là nhà riêng của khách, gửi sang Google rồi thì không thu lại được, và việc này chưa được kiểm theo luật bảo vệ dữ liệu cá nhân."

---

## Phần kỹ thuật

### Hiện trạng (đo @ `809918d5`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Tên điểm cho tài xế | `tenNoi = location_name ?? maskLongDigits(place_text)` | `src/modules/van-chuyen/dieu-phoi-dto.ts:30`; che dãy ≥ 8 chữ số `src/shared/text-guards.ts` (`MIN_LONG_DIGIT_RUN`) |
| Câu đọc điểm dừng | `LEFT JOIN v_loc_location_label` (chỉ `id, code, name, location_type_code, active`) | `src/modules/van-chuyen/chuyen-repo.ts:121-128`; view `migrations/0010_locations.sql:39-40` |
| Địa chỉ danh mục | cột `loc_location.address` (≤ 300 ký tự), Quản trị sửa ở màn "Địa điểm"; gieo sẵn **không** có địa chỉ | `migrations/0010_locations.sql:18, :28-36`; `web/locations.ts:77, :104` |
| DTO tài xế | dựng từng khoá; khoá `diem` không có địa chỉ; tên, năm sinh, liên hệ chỉ khi `trongNgay` | `src/modules/van-chuyen/tai-xe-dto.ts:37, :64, :71, :79` |
| Bài liệt kê khoá | `KHOA_DIEM` ghim đúng 10 khoá; `CAM_KHOA` cấm `placeKey`, `khoaNoi*` | `src/modules/van-chuyen/tai-xe-dto.test.ts:11, :17` |
| Khung ngày chạy | `trongNgayChay` | `src/shared/dieu-phoi-kiem.ts:480-482` |
| Tài xế được thấy | "điểm dừng (tên nơi; chữ tự do che dãy số)" **mọi lúc** | `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:234` |
| Tài xế đối tác | thấy như tài xế công ty + khung D7.2; hiện mọi route trả 403 (Đợt 6 chưa làm, BL-VC-D6) | `docs/adr/ADR-0053-dieu-phoi-luot-3-tai-xe-doi-tac.md:54, :63, :69` |
| Trang tự cấm đọc vị trí | `Permissions-Policy: … geolocation=()`; `Referrer-Policy: same-origin` | `public/_headers:10, :12` |
| CSP | không có `navigate-to`; `form-action 'self'` → nút phải là liên kết `<a>`, không phải form | `public/_headers:8` |
| Khuôn liên kết ra ngoài có sẵn | `telHref` | `src/shared/viec-cua-toi.ts:79` |
| Cạnh module | `van-chuyen` được đọc `locations` | `src/architecture.test.ts:63` |
| Toạ độ | chủ chọn "bảng phụ có kiểu" (câu 0.1), cần ADR nhỏ của `locations` | `docs/BACKLOG.md:199` |

### Quyết định
1. **Nút:**
   - Trên màn chuyến của tài xế (`/cuoc-chuyen`, `web/cuoc-chuyen.ts`), mỗi điểm `PICKUP` / `DROPOFF` chưa xong một liên kết "Chỉ đường".
   - Liên kết mở `target="_blank"`, `rel="noreferrer noopener"`.
   - Đường dẫn dựng **trong trình duyệt** từ một chuỗi đích, bằng một hàm thuần ở `src/shared/` (tên đề xuất `lienKetChiDuong(diaChi)`), có `*.test.ts` (mã hoá ký tự, chuỗi rỗng → không có nút).
   - Dạng đường dẫn Google Maps "chỉ đường tới đích": người thi công **trích tài liệu chính thức của Google** (chưa kiểm).
2. **Dữ liệu đi ra** — chỉ một chuỗi đích, không gì khác:
   - điểm danh mục → `address` nếu có, ngược lại `name`;
   - chữ tự do → đúng `tenNoi` đã che (không bao giờ `place_text` thô, không bao giờ `place_key` / `khoaNoi*`);
   - toạ độ: khi BL-VC-TOA-DO có ADR riêng thì ưu tiên toạ độ (ngoài phạm vi ADR này).
3. **Không gửi:**
   - vị trí tài xế: trang không đọc `geolocation`, giữ nguyên `public/_headers:12`. Ứng dụng bản đồ dùng GPS của điện thoại là việc giữa điện thoại và Google, ngoài Nền tảng;
   - tên, năm sinh, SĐT, mã đơn, mã chuyến.
   - Không khoá API, không gọi từ máy chủ, không thêm `connect-src`.
4. **Khoá DTO mới** (tên đề xuất `diaChiChiDuong`) trong mỗi phần tử `diem`:
   - **chỉ có mặt khi `trongNgay`** (vắng mặt, không phải chuỗi rỗng, theo khuôn `hoTen`);
   - không thêm vào DTO văn phòng (văn phòng tự tra địa chỉ trên đơn; phạm vi nhỏ nhất trước).
5. **View công bố mới của `locations`** (tên đề xuất `v_loc_location_dia_chi`: `id, address, active`):
   - migration chỉ `CREATE VIEW`; không đổi view cũ, vì `v_loc_location_label` có nhiều module đọc;
   - `chuyen-repo.ts` thêm `LEFT JOIN` view mới;
   - cập nhật `docs/data-dictionary.json` (view đã được liệt kê, `:591`) + `npm run dict`, `docs/SYSTEM-DESIGN.md:258` (bảng view).
6. **Giao diện đơn:** ô điểm đón gõ tay có dòng nhắc "Chỉ ghi địa chỉ — không ghi tên, số điện thoại khách" (chữ, không phải luật máy).
7. **Tài xế đối tác (Q-2 a):** khi Đợt 6 mở, khoá `diaChiChiDuong` đi theo `trongKhungXemKhach` (ADR-0053 D7.2) thay cho `trongNgayChay`, cùng chỗ với `hoTen`.
8. **Ngoài phạm vi:** theo dõi vị trí thời gian thực, lưu toạ độ, ước giờ tới, nút cho văn phòng, Apple Maps (nếu Q-1 a).

### Vì sao chặn theo ngày chạy dù chữ tự do đã hiện mọi lúc
ADR-0049 `:234` cho tài xế thấy tên nơi, kể cả chữ tự do, **mọi lúc**; ADR này không đổi điều đó. Cổng ngày chạy chỉ giới hạn việc **gửi sang bên thứ ba** vào đúng ngày cần dẫn đường, theo tinh thần "hình chiếu có lọc" (Hiến chương 4.4, `docs/ARCHITECTURE.md:85`). Nó cũng tránh tài xế lỡ tay gửi địa chỉ của chuyến tuần sau.

### Câu ADR bị thay / bổ sung (không sửa tệp ADR cũ)

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 `:234` (danh sách trường cho tài xế, "Được") | "điểm dừng (tên nơi; chữ tự do che dãy số), giờ hẹn, giờ xe tới;" | + "**trong ngày chạy:** chuỗi đích chỉ đường của điểm (địa chỉ danh mục, hoặc tên nơi đã che) — ADR-0105" |
| ADR-0053 `:69` (D7.3, tài xế đối tác "Thấy") | "như tài xế công ty ở ADR-0049 D3 …" | + "chuỗi đích chỉ đường trong khung D7.2 (ADR-0105, Q-2 a)" |

### Cửa một chiều / hai chiều
- **Một chiều:**
  - mỗi địa chỉ đã gửi sang Google (không thu lại; lịch sử trong tài khoản Google của tài xế);
  - view công bố mới là hợp đồng giữa hai module (gỡ phải theo expand–contract).
- **Hai chiều:** nút, khoá DTO (bỏ được trong một lần phát hành), dòng nhắc, chọn bản đồ.

### Migration
Một tệp chỉ `CREATE VIEW v_loc_location_dia_chi`. Số = số lớn nhất trong `migrations/` + 1 lúc thi công (hôm nay lớn nhất `0083`). Nếu ADR-0104 Đ2 (view `v_aud_order_cmd`) thi công cùng đợt, mỗi tệp một số, cùng quét mọi nhánh.

### Bài kiểm / hàng rào
Mỗi rào quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md`.
1. `tai-xe-dto.test.ts`: `KHOA_DIEM` trong ngày chạy = 10 khoá + `diaChiChiDuong`; ngoài ngày chạy giữ đúng 10 khoá. Đây là **nới có tên** bài ghim, ghi lý do ADR-0105 ở chú thích (chủ đã đồng ý trong câu duyệt).
2. Bài mới: chuỗi đích của điểm chữ tự do chứa dãy ≥ 8 chữ số → đã che; không bao giờ trùng `place_key`.
3. Bài hàm thuần `lienKetChiDuong`: mã hoá, chuỗi rỗng.
4. Bài tĩnh: không tệp `web/` nào gọi `navigator.geolocation`, và `public/_headers` vẫn có `geolocation=()`.
5. Kịch bản Chrome màn tài xế: thấy nút trong ngày chạy, không thấy hôm trước (ảnh thật iPhone theo thói quen duyệt giao diện).
6. `npm test`, `npm run typecheck`, `npm run test:e2e`.

### Phương án bị loại
- **Gửi toạ độ:** chưa có dữ liệu toạ độ (BL-VC-TOA-DO).
- **Bản đồ nhúng trong Nền tảng** (Google Maps JavaScript API): cần khoá, tốn tiền, phải mở CSP `script-src`, và Google thấy cả màn của tài xế.
- **Máy chủ tự gọi dịch vụ chỉ đường:** cần khoá, là bí mật (N10), và máy chủ thành bên chuyển dữ liệu khách.
- **Nút mọi lúc:** gửi địa chỉ ra ngoài sớm hơn ngày cần.
- **Đọc vị trí tài xế để tính đường:** chủ để việc theo dõi vị trí cho văn bản sau, và hiện trang tự cấm (`geolocation=()`).

### Sổ dừng dây chuyền
`docs/quyen-hoan.json` không có mục HIGH nào thuộc vùng điểm dừng, DTO tài xế hay `locations`. Không xây trên lỗ đang hở.

### Chưa kiểm
- Dạng đường dẫn chính thức của Google Maps; cách iPhone mở liên kết ngoài từ Nền tảng cài lên màn hình chính (mở ứng dụng Google Maps hay Safari).
- Production có bao nhiêu điểm danh mục đã có địa chỉ; tỉ lệ chặng dùng chữ tự do (báo cáo ERP C09, C10 chỉ đo trên dữ liệu thử).
- Vị thế pháp lý của việc gửi địa chỉ nhà khách sang Google theo luật bảo vệ dữ liệu cá nhân.
