# ADR-0062 — Báo tin khi đơn đã xác nhận đổi giờ, nơi đón hoặc số khách: tới HDV phụ trách và người lập / phụ trách đơn, trong app và màn hình khoá

- **Trạng thái:** **accepted** — chủ dự án duyệt 2026-09-30 (hộp hỏi của phiên điều phối chung, lượt duyệt 1b): *"Duyệt, tin không ghi nơi đón mới"* — gồm gật rõ ba điểm của câu duyệt (nới `docs/ARCHITECTURE.md` Phần II §4 cho view `v_aud_order_change` có `detail`, chỉ `thongbao` đọc; ngoại lệ hẹp ADR-0034 điều 1 về khuôn `detail` của lần sửa số khách; khai trước `order_money_adjusted`). **Câu 3** = A: mọi ngày / giờ trên đơn (khởi hành, đón, check-in, chặng xe) + thêm chặng đón; đổi nơi không tiêu lượt (đổi nơi đón vẫn có tin); **câu 3b** = đổi giờ vì xe **có** tính lượt (áp ở ADR-0063). **Câu 5** = **Có** — Đối tác / Thực tập là người lập nhận tin này, chỉ đơn họ lập, ở chuông + màn hình khoá ⇒ mọi dòng "Chỉ khi câu 5 = Có" trong bài (Câu thay ADR-0014 điều 12, ADR-0022 Q-C, ADR-0034 điều 3; liên kết khi bấm) **có hiệu lực**; mặc định tạm "không nhận" bị thay. **Câu 6** = tin **không** ghi nơi đón mới (chỉ "đổi nơi đón"). Qua kiểm độc lập 3 vòng. AI ghi lại. Lịch sử soạn: Bản nháp của người soạn (phiên soạn ADR 2026-09-30), **đã sửa lần 1 theo báo cáo người kiểm độc lập** (2026-09-30); **sửa lần 2 theo điều phối**: đổi số từ nháp "0059" sang 0062 (0059–0061 đã được phiên khác dùng, chủ đã duyệt); **sửa lần 3 theo người kiểm độc lập vòng 2** (khai trước `order_money_adjusted`, thứ tự đoạn `detail`, luật an toàn hàm đọc, chiều phụ thuộc nhãn). Chủ dự án chưa duyệt; từ khi duyệt chỉ sửa dòng trạng thái.
- **Ngày:** 2026-09-30.
- **Thuộc gói:** lượt duyệt **1b** (trang ghép `trang-ghep-luot-1.md` cùng thư mục nháp). Duyệt riêng với ADR-0058 (lượt 1a) để giữ trần 3.
- **Nguồn (lời chủ, chuẩn — không hỏi lại):**
  - Báo cáo rà soát `docs/superpowers/specs/2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md` (nhánh `ra-soat-luong-giao-dien`), §1 mã **C1** (mức CAO) và §6 dòng 1.
  - Nguyên văn lựa chọn: **"Báo HDV + người lập đơn"** — HDV phụ trách và người lập / phụ trách đơn nhận tin; tài xế được báo riêng ở ADR-0052 D6.
  - Kênh (lời chủ chuyển qua điều phối 30/9): **tin trong app và thông báo trên màn hình khoá**.
- **Mốc mã:** mọi `tệp:dòng` đọc ở `origin/main` = `1db777f4` (bản 1.38). Các tệp trích dẫn không khác nhánh `giao-dien-sua-nho-1-39@824193f1`.
- **ADR liên quan:**
  - ADR-0022 (Bảng tin — **không đổi**);
  - ADR-0034 (hộp thông báo là hình chiếu nhật ký — **điều 1 bị bổ sung**; điều 3 có một câu đã cũ);
  - ADR-0036 và ADR-0039 (màn hình khoá, giờ yên lặng — **giữ**);
  - ADR-0045 (chỉ báo khi xác nhận — **giữ nguyên, không câu nào bị thay**, xem mục "Câu thay");
  - ADR-0046 (tắt đúng máy — **giữ**);
  - ADR-0052 D6 (tin chuyến, dòng MQ-07 — **bổ sung luật chống trùng**);
  - ADR-0014 điều 6 và 12 (HDV sửa số khách; báo CTV bằng chấm đếm);
  - ADR-0023 điều 8 (**proposed**, thông báo nổi khi HDV đổi số khách — **bị thay một phần**, xem "Câu thay");
  - ADR-0030 (người phụ trách, HDV xem đơn đang phụ trách);
  - ADR-0063 (dùng lại hằng "giờ" `TRUONG_GIO_TINH_LUOT` do ADR này định nghĩa ở Đ1; hành động `order_money_adjusted` của văn phòng — **ADR này khai sẵn** trong `src/shared/audit-actions.ts` và **liệt kê sẵn** trong tập nguồn + view `0047`, ADR-0063 là nơi đầu tiên ghi dòng; đoạn đuôi lượt đổi giờ) và ADR-0065 (đoạn "số khách đi xe", đi trong `trip_updated` hoặc dòng sửa số khách — hai hành động đã có trong tập nguồn) — hai ADR lượt 2, khi được duyệt thì khớp vào Đ1 **không cần sửa ADR này, không cần migration tạo lại view**.
- **Hiến chương Phần I (đã duyệt) áp:** 1.4 (hình chiếu không tạo sự thật), 4.1, K16, 5.3, 5.10, 5.12, 5.13, 5.16 (tin được phép lỡ).
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (đọc 2026-09-30 @`824193f1`).

---

## Tóm tắt cho chủ (lời thường)

1. Đơn **đã xác nhận** mà ai đó đổi **giờ** (ngày/giờ trên đơn — định nghĩa "giờ" dùng chung với hạn "2 lần đổi giờ", câu hỏi số 3 ở `cau-hoi-chu.md`), **nơi đón** hoặc **số khách** thì app gửi tin.
2. **Người nhận:** người lập đơn và người đang phụ trách đơn (thường là HDV). **Không** báo cho chính người vừa sửa.
3. **Nội dung** chỉ có mã đơn và phần đổi, ví dụ:
   - "Đơn TD-0123: giờ đón 07:00 → 06:30";
   - "Đơn TD-0123: đổi số khách (Tour 3 đảo: người lớn 4 → 3)".
   - Không SĐT, không tên khách, không tiền, không lời ghi chú tự do, không tên dịch vụ nhập tay (chỉ tên dịch vụ lấy từ danh mục).
4. Tin hiện ở **chuông thông báo** trong app và **gõ cửa màn hình khoá** như tin xác nhận đơn hôm nay. Mỗi lần sửa là một tin. Trên màn hình khoá, tin mới thay tin cũ nên không bị chồng nhiều dòng.
5. **Không có nút tắt riêng** cho loại tin này. Ai không muốn thông báo điện thoại thì tắt ở máy đó như hiện nay.
6. Tài xế **không** nhận tin này; họ nhận tin chuyến riêng (đã duyệt ở ADR-0052). Một lần sửa không làm một người nhận hai tin.
7. Cần một thay đổi dữ liệu nhỏ: thêm một "cửa sổ đọc" nhật ký cho phần thông báo. Không thêm bảng.

---

## Bối cảnh

- **Hôm nay không ai được báo khi đơn đã xác nhận đổi giờ / nơi đón / số khách.**
  - Hộp thông báo chỉ dựng tin từ sáu hành động: `created`, `order_claimed`, `order_handler_changed`, `confirmed`, `cancelled`, `order_cancelled_by_field` (`src/shared/thong-bao.ts:7`; view `v_aud_order_event`, `migrations/0025_thong_bao.sql:53-56`).
  - `loaiTinDon` trả `null` cho mọi hành động khác (`thong-bao.ts:23-34`).
  - Bảng tin phát `chuyen` / `tien` / `sua` nhưng không nổi (`src/shared/bang-tin.ts:105-111`), không gõ cửa màn hình khoá (`src/shared/web-push.ts:50-62`: `sua`, `chuyen`, `tien` → `null`).
- **Các đường ghi liên quan:**

  | Route | Nhật ký | Bảng tin | Ghi chú |
  |---|---|---|---|
  | `PUT /api/orders/:id/trip` (`src/modules/orders/index.ts:592`) | `trip_updated` | `chuyen` (`:626`) | nhận cả **đơn nháp** (chỉ chặn huỷ, `:598`); `detail` từ `describeTripChange`: ngày/giờ ghi "trước → sau", địa điểm chỉ ghi "đổi điểm đón" (`src/modules/orders/service-rules.ts:367-378`) |
  | `POST /api/orders/:id/legs` (`:633`) | `order_leg_added` | `chuyen` (`:653`) | đơn nháp → 409 (`:639`) |
  | `PUT /api/orders/:id/legs/:legId` (`:657`) | `order_leg_updated` | `chuyen` (`:678`) | đơn nháp → 409 (`:664`); `detail` từ `moTaChang` có **chữ nơi tự do** "nơi đón A → B" (chỉ che dãy ≥ 8 chữ số, `src/shared/chang-dua-don.ts:261-285`) |
  | `POST /api/orders/:id/legs/:legId/close` (`:682`) | `order_leg_closed` | `chuyen` (`:695`) | bỏ chặng, có lý do |
  | `POST /api/orders/:id/handler-money-edit` (`src/modules/dispatch/index.ts:229`) | `order_money_adjusted_by_field` | `tien` (`:247`) | HDV đang phụ trách (và Toàn quyền) sửa số khách đơn đã xác nhận. `detail` = **lý do người sửa tự gõ** (`src/modules/orders/repository.ts:1150`); số khách trước/sau nằm trong `order_money_adjustment.before_json/after_json` (`:1148`) |

- **Sắp có thêm đường đổi số khách:** chủ đã chọn C2 "Thêm Quản trị + Kế toán + người lập đơn" sửa số khách sau xác nhận (báo cáo §6 dòng 2; chủ chốt 30/9: làm **ngay sau** Sổ tiền lượt 1). Route văn phòng soạn ở **ADR-0063 D1** (lượt 2a), hành động nhật ký `order_money_adjusted`.
- **`PUT /trip` ghi đúng một dòng nhật ký:** `updateTrip` chỉ có **một** `auditStatement` (`trip_updated`); thao tác chặng trong cùng lệnh (`legOps`) đi bằng câu có lính gác, **không** ghi thêm `order_leg_updated` (`src/modules/orders/repository.ts:1164-1198`, câu nhật ký `:1180`).
- **Hàm viết `detail` hiện có** gồm cả phần đuôi "đặt gấp": `kemDatGap` (`src/modules/orders/index.ts:81`) nối đoạn `ghiDatGapNhatKy(…)` vào `detail` ở `:621` (`PUT /trip`), `:649` (thêm chặng), `:676` (sửa chặng).
- **Luật hộp thông báo đã có (tái dùng, không viết lại):**
  - không tự báo mình: `d.actorId === staff.id` bị bỏ (`thong-bao.ts:81`);
  - kèm tên người làm chỉ khi `can(người xem, "order.history.view", phạm vi đơn)` (`:98`);
  - Đối tác / Thực tập không nhận tin về đơn: `duocThayTinDon` (`bang-tin.ts:117-121`);
  - màn hình khoá tính người nhận bằng **chính** `locHopThongBao` (`web-push.ts:66-83`).
- **Màn hình khoá** hiện đúng câu của tin mới nhất chưa đọc trong "Của tôi" (`GET /api/thong-bao/moi-nhat`, `src/modules/thongbao/index.ts:98-103`). Service worker dùng **một** `tag: "thong-bao"` + `renotify` (`web/sw/sw.ts:60-66`), nên tin mới **thay** tin cũ trên màn hình khoá.
- **"HDV phụ trách"** = người phụ trách đơn (`dsp_assignment`, `task_kind_code = 'HANDLE'`). Ba loại việc khác `PICKUP`, `DROPOFF`, `BOAT` có trong bảng tra cứu (`migrations/0014_dispatch.sql:15-16`) nhưng chưa route nào dùng.
- **HDV hôm nay đã xem được lịch sử đơn mình phụ trách:** `order.history.view` của `FIELD` = `assigned` (`src/shared/permissions.ts:74`, ADR-0030 S23-3). Câu "Hướng dẫn viên hôm nay vì vậy không thấy tên kể cả đơn mình phụ trách" của ADR-0034 điều 3 **đã cũ**. Theo luật hiện hành, HDV sẽ thấy tên người sửa.
- **ADR-0052 D6 (accepted, chưa thi công):** `v_aud_trip_event` chưa có trên `main` (migration cuối là `0043`). Dòng MQ-07 báo "giờ hẹn chặng đổi khi đã xếp" (`order_leg_updated` của chặng có suất mở) tới người lập / phụ trách **qua `can(trip.call_ack, …)`** + tài xế. Cùng một dòng nhật ký có thể làm một người (Bán hàng lập đơn) đủ điều kiện nhận **cả** tin MQ-07 **và** tin của ADR này.

---

## Quyết định

### Đ1. Loại tin mới "đơn đổi sau xác nhận" — nguồn là nhật ký (khuôn ADR-0034 điều 1)

- **Loại tin** `doi_sau_xac_nhan` (thêm vào `LoaiTin`). **Không bảng mới**; tin là hình chiếu của `audit_log`, tính lúc đọc.
- **"Giờ" — hằng dùng chung, ADR NÀY định nghĩa** (lượt 1b duyệt và phát hành trước lượt 2a, nên hằng sinh ra cùng ADR này): `TRUONG_GIO_TINH_LUOT` ở `src/shared/` (tên đề xuất). Nội dung chủ chốt ở **câu 3 của `cau-hoi-chu.md`**:
  - **A (khuyến nghị):** dịch vụ — ngày khởi hành, giờ khởi hành, giờ đón (ô cũ ghi kép), ngày check-in, giờ check-in; chặng — ngày đón, giờ đón.
  - **B:** chỉ ngày/giờ đón (giờ đón của dịch vụ; ngày khởi hành coi như ngày đón của dịch vụ; ngày/giờ đón của chặng).
  - Phương án **C** của câu 3 (như A, thêm nơi đón / nơi trả vào **lượt**) chỉ đổi cách đếm của ADR-0063; với tin của ADR này C giống A (nơi đón vốn có tin riêng, nơi trả không có tin).
  - **Chiều phụ thuộc của nhãn (sửa theo người kiểm vòng 2):** bảng **nhãn** mọi trường thời gian (tên đề xuất `NHAN_TRUONG_THOI_GIAN`, gồm đủ năm trường của dịch vụ `departDate`, `departTime`, `pickupTime`, `checkinDate`, `checkinTime` và hai trường của chặng) đặt ở `src/shared/`; `TRUONG_GIO_TINH_LUOT` là **tập con** khoá của bảng đó (theo câu 3). `TRIP_VALUE_FIELDS` của module `orders` (`src/modules/orders/service-rules.ts:367-369`, hôm nay tự viết nhãn) **lấy nhãn từ** bảng ở `src/shared/`, **không** ngược lại (`src/shared/` không import `src/modules/` — `CLAUDE.md` §7). Bảng nhãn phải là **tập cha**: nếu chủ chọn B ở câu 3 (bỏ giờ khởi hành, check-in khỏi "giờ"), `describeTripChange` vẫn cần nhãn của cả năm trường để ghi nhật ký như hôm nay.
  - ADR-0063 D3.2 (lượt 2a) **dùng lại** hằng này để đếm lượt "đổi giờ" và chỉ thêm luật đếm riêng của nó (thêm chặng tính một lần, đóng chặng không tính, các loại trừ). Nếu 2a chưa duyệt, hằng vẫn đứng một mình cho tin. Không nơi nào khác được liệt kê trường "giờ" riêng; bài kiểm Đ1-a ép.
- **Hành động nguồn** (tập đóng, khai **một nơi** trong `src/shared/thong-bao.ts`). Tập đoạn nhận = **hằng "giờ"** ∪ **nơi đón** ∪ **số khách** ∪ thêm/bỏ chặng:
  - `trip_updated`, **chỉ khi** `detail` có một trong các đoạn sau:
    - đoạn "<nhãn> A → B" của một trường thuộc hằng "giờ" (nhãn lấy từ bảng nhãn ở `src/shared/` — cùng bảng mà `TRIP_VALUE_FIELDS` của `orders` đọc, xem trên);
    - "đổi điểm đón";
    - chữ cố định `"cập nhật chặng đưa đón"`. Route ghi chữ này khi `describeTripUpdates` trả `null` mà lệnh vẫn đổi chặng (`src/modules/orders/index.ts:605`). Đoạn này có tin với câu chung "Đơn <mã> vừa đổi chặng đưa đón" (Đ2), vì không phân biệt được đổi giờ, nơi đón hay nơi trả; chấp nhận báo thừa hơn bỏ sót;
    - **đoạn dành sẵn cho ADR-0065** (chỉ có mặt khi ADR-0065 được duyệt và thi công): "số khách đi xe A → B". Đổi `ride_pax` sau xác nhận đi qua `PUT /trip` (ADR-0065 D3) nên nằm trong **cùng** dòng `trip_updated`. Chọn cách này thay vì hành động riêng: một lệnh = một dòng nhật ký = một tin; cờ `doiSoKhach` giữ đúng nghĩa "ghi `order_money_adjustment`".
    - Mọi `trip_updated` khác (chỉ ghi chú, nơi check-in, và — nếu hằng "giờ" không gồm chúng — các trường thời gian ngoài hằng) **không** có tin;
  - `order_leg_updated`, **chỉ khi** đổi một trường chặng thuộc hằng "giờ" (ngày đón, giờ đón) hoặc nơi đón. Chỉ đổi nơi trả thì không có tin;
  - `order_leg_added`, `order_leg_closed`: thêm / bỏ một chặng đón. *Giả định người soạn, xem cuối tệp*;
  - **mọi hành động mang cờ `doiSoKhach: true`** ở `src/shared/audit-actions.ts`: `order_money_adjusted_by_field` (có dòng ghi từ hôm nay) và `order_money_adjusted` (văn phòng — ADR-0063 D1). Luật cờ (ép bằng bài kiểm, Đ1-a): **mọi hành động ghi dòng `order_money_adjustment` phải mang cờ `doiSoKhach`**, và mọi hành động mang cờ đều nằm trong tập nguồn.
  - **`order_money_adjusted` khai TRƯỚC (chọn cách (a) của người kiểm vòng 2):** khi thi công ADR này, `order_money_adjusted` được khai vào `src/shared/audit-actions.ts` kèm cờ `doiSoKhach` và có mặt trong tập nguồn + trong danh sách hành động của view `v_aud_order_change` (`0047`), dù chưa route nào ghi nó. ADR-0063 D1 chỉ là **nơi ghi đầu tiên**, không khai lại.
    - **Lý do chọn (a)** thay cho (b) "lát ADR-0063 kèm migration tạo lại view": view là cửa công bố (tạo lại = một chiều nhẹ, thêm một migration, thêm một chỗ phải khớp hằng); khai trước giữ đúng câu "duyệt lượt 2 sau không phải sửa ADR-0062", và bài 3 (view lọc **đúng** hằng tập nguồn) vẫn so với một hằng duy nhất.
    - **Luật thứ tự:** việc nào lên `main` trước (thi công ADR-0062 hay lát ADR-0063 D1) thì **khai** `order_money_adjusted` (kèm cờ); việc sau **dùng lại**, không khai lần hai (khoá trùng trong một object literal do typecheck báo; không có bài test riêng cho việc này).
    - **Nếu lượt 2a bị bác:** hành động khai sẵn là **chết nhưng vô hại** — không route nào ghi, view không bao giờ trả dòng của nó, không tin nào sinh ra. Muốn dọn thì gỡ khỏi hằng + migration mới tạo lại view (không bắt buộc).
  - **Không** gồm: `order_leg_short_notice` (đặt gấp), `passengers` (danh sách tên), `booker`, ghi chú, nơi check-in, nơi trả.
- **Đoạn đuôi không sinh tin:** hàm đọc bỏ qua (không đưa vào câu tin, không làm dòng thành tin) đoạn đuôi đặt gấp do `kemDatGap` nối (`index.ts:81`) và đoạn đuôi lượt đổi giờ " · tính 1 lượt đổi giờ" / " · đổi giờ (Toàn quyền, không tính lượt)" do ADR-0063 D3.5 nối. Hai hàm viết đó có mặt trong bài khứ hồi (Đ2).
- **"Sau xác nhận" tính, không đoán:** dòng nguồn chỉ thành tin khi đơn có dòng `confirmed` với `created_at` **nhỏ hơn** `created_at` của dòng nguồn.
  - **Đọc từ đâu:** dòng `confirmed` lấy qua view công bố **đã có** `v_aud_order_event` (đã chứa hành động `confirmed`, `migrations/0025_thong_bao.sql:53-56`), truy vấn **theo đúng các `order_id`** có dòng nguồn, **không** áp cửa sổ 30 ngày giữ tin cho câu này (đơn xác nhận 40 ngày trước, hôm nay đổi giờ vẫn phải có tin).
  - **Không** dùng trạng thái đơn lúc đọc: trạng thái hiện tại là `confirmed` sẽ biến mọi lần sửa lúc còn nháp thành tin sau khi đơn được xác nhận.
  - Lý do cần luật: `PUT /trip` nhận cả đơn nháp (`index.ts:598`); các route chặng và sửa số khách vốn chỉ nhận đơn đã xác nhận. Đơn nháp không sinh tin: ADR-0045 điều 1 giữ nguyên tinh thần.
- **Mốc bắt đầu:** chỉ dòng ghi **sau** thời điểm phát hành bản có ADR này (hằng trong mã). Tránh việc ngay sau triển khai "Của tôi" bật lên hàng loạt tin cũ trong 30 ngày giữ tin.
- **Đọc qua view công bố mới của `audit`** `v_aud_order_change` (id, `order_id`, `staff_id`, `action`, `detail`, `created_at`):
  - lọc `order_id IS NOT NULL` và đúng tập hành động nguồn — **gồm sẵn `order_money_adjusted`** (khai trước, xem trên), để lát ADR-0063 không phải tạo lại view;
  - `thongbao` (module nghiêm) đọc view này, không đọc `audit_log`;
  - **chỉ `thongbao` được đọc view này** (view có cột `detail`, là chữ nhật ký): bài kiến trúc mới — tên `v_aud_order_change` chỉ được xuất hiện trong SQL của `src/modules/thongbao/` (và migration tạo nó); module khác cần đọc thì phải có ADR. Không thu hẹp cột `detail` được vì hàm đọc cần nó để dựng câu tin; thay vào đó view chỉ lọc đúng tập hành động nguồn (bài 3);
  - **không** sửa `v_aud_order_event` (ADR-0034 điều 5 "không sửa view đang có").
  - Migration **`0047`** (bảng số: 0046 = ADR-0058, 0047 = ADR-0062, 0048 = ADR-0063, 0049 = ADR-0065; ADR-0054…0057 và ADR-0060, ADR-0061 (phiên Góp ý, mỗi ADR một migration) lấy số ≥ 0050). Lập kế hoạch vẫn quét lại mọi nhánh/worktree trước khi đặt tệp (`CLAUDE.md` §10).
- **Cùng lô = một tin:** các dòng nguồn cùng đơn, cùng người làm, cùng `created_at` (một lệnh ghi nhiều dòng) gộp thành **một** tin.

### Đ2. Nội dung tin — chỉ phần có khuôn do máy chủ viết; không bao giờ chữ tự do

- **Câu:**
  - có tên (khi người xem qua `order.history.view`): "<Tên người sửa> đổi đơn <mã>: <phần đổi>";
  - không tên: "Đơn <mã>: <phần đổi>".
- **<phần đổi>** dựng bằng **một hàm thuần** `phanDoiCuaTin(action, detail)` ở `src/shared/`. Hàm chỉ nhận các đoạn có khuôn cố định do máy chủ sinh:
  - "<nhãn trường giờ> A → B" cho mọi trường thuộc hằng "giờ" (vd `ngày đón A → B`, `giờ đón A → B`, `ngày khởi hành A → B`): giá trị ngày/giờ, không phải chữ tự do;
  - **"đổi nơi đón"**: **không** kèm chữ nơi, kể cả khi `detail` có (câu hỏi số 6 của `cau-hoi-chu.md`, khuyến nghị không);
  - "thêm chặng đón" / "bỏ chặng đón";
  - **số khách:** "đổi số khách (<tên dịch vụ>: người lớn 4 → 3, trẻ em 1 → 0)". Chỉ số người theo loại khách, không tiền;
  - **số khách đi xe** (khi ADR-0065 có mặt): "số khách đi xe 4 → 3".
- **Tên dịch vụ trong tin — chỉ tên từ danh mục:**
  - dịch vụ nhập tay có tên là **chữ người dùng gõ** (có thể chứa tên, SĐT khách). Hàm **viết** đoạn số khách chỉ ghi tên dịch vụ khi dịch vụ có mã danh mục (`SubtotalServiceInput.catalogCode` khác `null`, `src/modules/orders/money-adjustment.ts:150-157`); dịch vụ nhập tay ghi nhãn cố định "dịch vụ nhập tay". `before`/`after` chỉ có `serviceId` (`:235-239`) nên hàm viết nhận thêm danh sách dịch vụ của đơn (route đã đọc sẵn cho `planMoneyEdit`);
  - dòng `trip_updated` (`describeTripChange`, tiền tố `<tên dịch vụ>:`) và `order_leg_*` (`moTaChang`, "Chiều đi · <tên dịch vụ>") **đã** mang tên dịch vụ, kể cả tên nhập tay. Hàm **đọc** **bỏ** phần tên đó, chỉ giữ chiều ("Chiều đi" / "Chiều về") và phần đổi. Kết quả: tin đổi giờ / nơi không có tên dịch vụ; tin số khách có tên danh mục hoặc "dịch vụ nhập tay".
- **Việc kèm theo (đổi khuôn `detail`, chỉ cho dòng mới):**
  - `order_money_adjusted_by_field` hôm nay chỉ có lý do (`repository.ts:1150`). Đường ghi thêm **một đoạn đầu có khuôn** bắt đầu bằng **`"số khách: "`** (có dấu hai chấm), vd "số khách: Tour 3 đảo: người lớn 4 → 3", dựng từ `before`/`after` sẵn có bằng một hàm thuần; lý do đứng sau, tách bằng ký hiệu cố định " · lý do: ".
  - **Thứ tự đoạn cố định (khớp ADR-0065 D3):** `"số khách: …"` [` · số khách đi xe A → B` — chỉ khi máy tự hạ số khách đi xe, ADR-0065 câu 8 = A] ` · lý do: …`. **Lý do LUÔN ở cuối.** Hàm đọc cắt `detail` tại lần xuất hiện **đầu tiên** của `" · lý do: "` và bỏ toàn bộ phần sau (lý do của route HDV còn là chữ tự do).
  - **Tin có mang đoạn tự hạ:** câu tin đổi số khách **có** kèm "số khách đi xe A → B" khi dòng có đoạn này (vd "Đơn TD-0123: đổi số khách (Tour 3 đảo: người lớn 4 → 3) · số khách đi xe 4 → 3"). Lý do: đoạn "số khách đi xe A → B" đã là đoạn nhận ở Đ1 (dòng `trip_updated`); đọc nó ở cả hai hành động giữ **một** luật cho một đoạn, và HDV cần biết xe giữ bớt chỗ. *Giả định người soạn, đảo được* (bỏ = hàm đọc dừng sau đoạn "số khách: …"); chỉ có nghĩa khi câu 8 = A.
  - Cùng khuôn áp cho `order_money_adjusted` của văn phòng (ADR-0063 D1). Hai hành động dùng **cùng** hàm viết (tham số hành động của `insertMoneyAdjustment`, ADR-0063 D1.8).
  - **Tiền tố không lẫn nhau:** đoạn số khách dịch vụ bắt đầu bằng "số khách: " (dấu hai chấm ngay sau "khách"); đoạn của ADR-0065 bắt đầu bằng "số khách đi xe " (dấu cách). Hàm đọc so **nguyên tiền tố kể cả ký tự thứ chín**, không so "số khách"; bài khứ hồi có **ca chéo** (đoạn này không bị đọc thành đoạn kia).
  - Hàm đọc chỉ lấy các đoạn có khuôn đứng trước " · lý do: ", không bao giờ lấy lý do.
- **Luật an toàn của hàm đọc (bất biến, sửa theo người kiểm vòng 2):**
  - **Không tách theo ":"** (giờ "07:00" có dấu hai chấm) và không tin dấu ", " / " | " / " → " làm ranh giới khi chúng có thể nằm trong tên dịch vụ hay chữ nơi tự do. Hàm đọc khớp theo **ngữ pháp chặt**: nhãn cố định (bảng nhãn ở `src/shared/`, chữ cố định "đổi …", "thêm chặng đón", "bỏ chặng đón", "số khách: ", "số khách đi xe ") + **giá trị đã kiểm dạng**: ngày `YYYY-MM-DD`, giờ `HH:MM`, `(trống)`, số nguyên cho số khách.
  - Phần tên dịch vụ (tiền tố `<tên>: ` của `describeTripChange`, "Chiều đi · <tên>" của `moTaChang`) là chữ bất kỳ và **bị bỏ**. Nếu `detail` phân tích được theo **nhiều hơn một** cách (tên chứa ": ", " | ", " → " hay một nhãn trường), hoặc có phần không khớp ngữ pháp ⇒ dùng **câu chung** (Đ2 dưới) cho cả dòng.
  - **Không bao giờ** in ra một mẩu chữ thô của `detail`: câu tin chỉ ghép từ nhãn cố định + giá trị đã kiểm dạng + tên danh mục đã kiểm ở đường viết.
  - Chữ tự do (tên dịch vụ, chữ nơi) nuốt được mọi chuỗi, nên một đổi giờ **giả** nằm cạnh chữ tự do luôn cho **ít nhất hai** cách phân tích (chữ tự do nuốt nó, hoặc không) ⇒ câu chung; đổi giả không bao giờ lọt vào câu tin.
- **Vị trí cố định của các đoạn trong `detail` của `trip_updated`** (để phân tích được một cách):
  - `[các khúc dịch vụ "<tên>: <phần đổi>" nối bằng " | "]` rồi `[" | số khách đi xe A → B" — khi `ridePax` đổi, ADR-0065]` rồi các **đuôi** `" · đặt gấp: <nhãn cố định>"` (`kemDatGap`) và `" · tính 1 lượt đổi giờ"` / `" · đổi giờ (Toàn quyền, không tính lượt)"` (ADR-0063 D3.5), thứ tự hai đuôi không quan trọng.
  - Lệnh **chỉ** đổi `ridePax`: `detail` = `"số khách đi xe A → B"` (không khúc dịch vụ).
  - Hàm đọc: (1) bóc các đuôi đã biết ở **cuối**; (2) nhận đoạn "số khách đi xe A → B" **chỉ ở cuối** phần còn lại (sau " | " hoặc đứng một mình); (3) phân tích phần còn lại theo ngữ pháp khúc dịch vụ. Đoạn ở cuối không thể do tên dịch vụ giả ra, vì mọi khúc dịch vụ kết thúc bằng phần đổi có khuôn, không bằng tên.
  - Dòng cũ không có đoạn này ⇒ câu chung "Đơn <mã>: đổi số khách".
- **Một nguồn khuôn chữ:**
  - hàm viết (`describeTripChange`, `moTaChang`, hàm viết đoạn số khách, **`kemDatGap`** (`index.ts:81`), hàm viết đoạn đuôi lượt đổi giờ của ADR-0063, hàm viết đoạn "số khách đi xe" của ADR-0065 khi có) và hàm đọc `phanDoiCuaTin` có bài **khứ hồi**: mọi đầu ra của hàm viết đọc ra đúng phần đổi, và đoạn đuôi (đặt gấp, lượt đổi giờ) không lọt vào câu tin;
  - đổi chữ nhật ký mà quên hàm đọc ⇒ đỏ;
  - câu chung chỉ dùng cho dòng **đã qua** bộ lọc nguồn ở Đ1 mà không đọc được giá trị: chữ `"cập nhật chặng đưa đón"`, dòng đổi số khách cũ, `order_leg_added`/`order_leg_closed` thiếu đoạn nhận ra. Câu chung là "Đơn <mã> vừa đổi chặng đưa đón" / "… đổi số khách", **không** lộ chữ thô.
  - Dòng **không** qua bộ lọc nguồn thì không có tin: không có câu chung cho nó.
- **`detail` chỉ quyết CÓ tin hay không và CÂU tin; KHÔNG quyết AI nhận.** Người nhận tính từ khoá (người lập, người phụ trách), đúng khuôn ADR-0052 D6.1 "không đọc `detail` để tìm người nhận" và ADR-0030 điều 3.
- **Liên kết khi bấm:** như tin đơn hiện có (`thong-bao.ts:102`): văn phòng → trang đơn; còn lại → "Việc của tôi". Kế hoạch có thể mở trang đơn cho Đối tác / Thực tập nếu câu 5 = Có, vì họ xem được đơn của mình.

### Đ3. Người nhận — một hàm, tái dùng luật sẵn có

- **Ngăn "Của tôi":**
  - (a) **người lập đơn**;
  - (b) **người phụ trách hiện tại** nếu có tài khoản. Đây là "HDV phụ trách" khi người phụ trách là HDV; là nhân viên văn phòng nếu văn phòng phụ trách.
  - Tính bằng `nhanSuKien` với `handlerTruoc` = "không biết" (`bang-tin.ts:32`, `:61-72`), **bỏ nhãn `cho-nhan`** (đơn đã xác nhận, tin đổi không phải việc hàng chờ).
  - Ngăn "Tất cả": người có `order.view = any` thấy tin (nhãn `tat-ca`), **không** tính số đỏ, **không** gõ cửa. Khuôn mọi tin đơn khác.
- **Không báo chính người vừa sửa:** luật sẵn có `thong-bao.ts:81` (hộp) và `nguoiNhanDay` → `locHopThongBao` (màn hình khoá). Không viết luật mới.
- **Lọc "được thấy tin về đơn"** giữ `duocThayTinDon` (`bang-tin.ts:117-121`): văn phòng + HDV. **Đối tác / Thực tập là người lập: câu hỏi số 5 của `cau-hoi-chu.md`** (khuyến nghị: Có, chỉ đơn họ lập). Mặc định của bản nháp (khi chủ chưa trả lời) là **giữ luật hiện hành: không nhận**. Chọn Có thì phải thêm các dòng "Câu thay" đánh dấu "(chỉ khi câu 5 = Có)" ở dưới: ADR-0014 điều 12, ADR-0022 Q-C, ADR-0034 điều 3 và dòng "Liên quan" về ADR-0014 điều 12.
- **Tài xế không nhận tin loại này** (không `order.view`; ADR-0022 điều 3). Tin cho tài xế là việc của ADR-0052 D6.
- **Luật chống trùng với ADR-0052 D6 (MQ-07):**
  - **một dòng nhật ký → tối đa một tin cho mỗi người**, quyết trong **cùng một hàm chọn tin**;
  - người đủ điều kiện MQ-07 (chặng có suất mở, qua `trip.call_ack`) nhận tin MQ-07 (việc cần làm: gọi báo khách), **không** nhận thêm tin `doi_sau_xac_nhan` cho cùng dòng;
  - người còn lại (vd HDV phụ trách, không có `trip.view`) nhận tin `doi_sau_xac_nhan`.
  - Việc nào lên `main` **sau** thì cài luật này và bài kiểm "một dòng ≤ một tin mỗi người".

### Đ4. Kênh — trong app và màn hình khoá; không thông báo nổi mới; không gộp

- **Trong app:**
  - vào chuông / hộp thông báo, ngăn "Của tôi", tính số đỏ;
  - số đỏ tự cập nhật nhờ tín hiệu Bảng tin `chuyen` / `tien` sẵn có (ADR-0034 điều 10).
  - **Không** thêm thông báo nổi. `thongBaoNoi` giữ nguyên: `sua`/`chuyen`/`tien` không nổi (ADR-0022 TD-4); sự kiện Bảng tin giữ **đúng 5 khoá** (ADR-0022 điều 4).
- **Màn hình khoá:**
  - gõ cửa như tin xác nhận đơn (ADR-0036), qua `nguoiNhanDay` → `locHopThongBao`;
  - route đổi truyền cho `baoThayDoi` một **tham số nội bộ** (không đi vào sự kiện Bảng tin) mang hành động nhật ký + `detail` vừa ghi. Gốc lắp ráp dựng `DongDon` loại mới rồi gọi `dayGoCua` (khuôn `src/index.ts:62-90`);
  - chỉ gọi **sau** khi lô ghi thành công, bắn-và-quên (5.10, 5.16: được phép lỡ).
  - Câu trên màn hình khoá = câu trong hộp (`thongbao/index.ts:103`). Vì vậy luật "không chữ tự do" ở Đ2 áp cho cả hai.
- **Giờ yên lặng:** giữ ADR-0039 (22:00–06:00 hiện, không rung), như mọi tin. Tin loại này **không** phải tin "quan trọng". (Bản nháp trước có câu hỏi riêng về tin ban đêm; đã bỏ vì ADR-0039 đã duyệt trả lời nguyên tắc — CLAUDE.md §3 "không hỏi lại điều đã chốt".)
- **Không gộp** nhiều lần sửa liên tiếp ở máy chủ:
  - mỗi lệnh sửa (một lô) = một tin trong hộp, xem lại được từng bước;
  - trên màn hình khoá, `tag` chung (`sw.ts:64-65`) làm tin mới thay tin cũ, nên người nhận không bị chồng nhiều dòng.
  - Gộp theo khoảng thời gian cần hẹn giờ gửi (không có hàng đợi, ADR-0036 "Phương án bị loại": Queues) ⇒ không làm.

### Đ5. Ai tắt được

- **Không có công tắc riêng** cho loại tin này, ở người nhận cũng như người sửa (không có ô "sửa mà không báo").
- Người nhận tắt thông báo **điện thoại** bằng công tắc từng máy hiện có (ADR-0036 điều 1, ADR-0046). Tin trong hộp vẫn còn, vì hộp là hình chiếu nhật ký.
- Công tắc theo loại tin (vd "không báo tôi khi đổi số khách") là việc sau, cần bảng cài đặt theo người ⇒ ADR riêng.

### Đ6. Thứ tự với ADR-0052 D6

- **ADR này không phụ thuộc** D6: thi công và phát hành được trước. Không đụng `van-chuyen`, không đọc `vc_*`.
- Khi D6 thi công: hàm chọn tin phải gồm luật chống trùng Đ3. Kế hoạch D6 thêm một dòng tham chiếu ADR này.
- Nếu D6 lên trước: kế hoạch của ADR này cài luật chống trùng.

---

## Câu thay trong ADR cũ (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0034 điều 1 | "Nguồn: các hành động `created`, `order_claimed` (mới — điều 2), `order_handler_changed`, `confirmed`, `cancelled`, `order_cancelled_by_field`, đọc qua **view công bố** của module `audit` trong 30 ngày gần nhất. Không sửa lô ghi nào của `orders`." (đã bổ sung một lần bởi ADR-0052 D6.1) | bổ sung **nguồn thứ ba**: "tin **đơn đổi sau xác nhận** (ADR-0062 Đ1) đọc `v_aud_order_change` (có `detail`, chỉ tập hành động nguồn; chỉ `thongbao` đọc). **Một ngoại lệ hẹp** cho vế "không sửa lô ghi nào của `orders`": mọi hành động mang cờ `doiSoKhach` (`order_money_adjusted_by_field`, `order_money_adjusted`) ghi thêm đoạn đầu có khuôn 'số khách: …' trong `detail` (ADR-0062 Đ2) — không thêm câu ghi, không đổi bảng." |
| ADR-0034 điều 3 | "Hướng dẫn viên hôm nay vì vậy không thấy tên kể cả đơn mình phụ trách — chủ chọn giữ đợt này." | **Không thay bằng ADR này.** Câu đã cũ do ADR-0030 S23-3 (`order.history.view` của `FIELD` = `assigned`, `permissions.ts:74`). Ghi để điều phối đưa vào nợ tài liệu; ADR-0062 theo luật hiện hành (HDV thấy tên người sửa). |
| ADR-0045 | — | **Không câu nào bị thay.** ADR-0045 chỉ nói tin *lập đơn* / *chờ nhận* (điều 1–4), không cấm tin đổi sau xác nhận. Báo cáo rà soát (§6 dòng 1) ghi "thay câu 'chỉ báo khi xác nhận' của ADR-0045" là **chưa chính xác**: chỗ cần bổ sung là ADR-0034 điều 1. Tinh thần ADR-0045 điều 1 (đơn nháp không sinh tin) được giữ bằng luật "sau xác nhận" ở Đ1. |
| ADR-0052 D6.2 | "Nguyên tắc: **tin "cần xử lý" chỉ tới người có ô làm được việc đó.**" (bảng người nhận) | bổ sung dưới bảng: "Cùng một dòng nhật ký, mỗi người nhận tối đa **một** tin: người nhận tin MQ-07 không nhận thêm tin `doi_sau_xac_nhan` (ADR-0062 Đ3) cho dòng đó." |
| ADR-0022 | — | **Không đổi** (không loại sự kiện mới, không khoá mới, không thông báo nổi mới). |
| ADR-0036 / 0039 / 0046 | — | **Không đổi** (kênh, giờ yên lặng, công tắc từng máy dùng như cũ). |
| ADR-0014 điều 12 | "**Không làm** thông báo đẩy về điện thoại (PWA push) — việc lớn hơn nhiều, ngoài phạm vi ADR này." (báo CTV khi HDV sửa/huỷ đơn) | **Chỉ khi câu 5 = Có:** "Đối tác / Thực tập là người lập nhận tin `doi_sau_xac_nhan` trong hộp và màn hình khoá (ADR-0062); `duocThayTinDon` mở hẹp cho đúng loại tin này, chỉ đơn họ lập." Trả lời Không ⇒ không đổi. |
| ADR-0022 Q-C (trong "Trả lời của chủ") | "**Q-C:** đối tác chỉ làm mới màn hình + chấm đếm (giữ ADR-0014 điều 12), không thông báo nổi." | **Chỉ khi câu 5 = Có:** thêm "… không thông báo nổi. **Ngoại lệ (ADR-0062):** tin đơn đổi sau xác nhận của đơn đối tác lập vào hộp thông báo và màn hình khoá của đối tác; vẫn không thông báo nổi, sự kiện Bảng tin không đổi." |
| ADR-0034 điều 3 | "… cộng điều kiện "được thấy tin về đơn" tách từ `thongBaoNoi`, trừ tin do chính người xem làm." (và dòng "Liên quan": "**ADR-0014 điều 12**: giữ — Đối tác/Thực tập không nhận tin về đơn; chỉ nhận tin thủ công khi nhóm của họ được chọn.") | **Chỉ khi câu 5 = Có:** thêm sau "được thấy tin về đơn": "(riêng tin `doi_sau_xac_nhan` — ADR-0062 — điều kiện này mở cho Đối tác / Thực tập **là người lập** của đơn đó)"; dòng "Liên quan" về ADR-0014 điều 12 thêm "trừ tin `doi_sau_xac_nhan` (ADR-0062)". |
| ADR-0023 điều 8 (**proposed**, chưa duyệt — dòng trạng thái ADR-0023 chỉ ghi "accepted phần điều 1, 2, 4") | "**Thông báo nổi** (qua Bảng tin, ADR-0022) tới **người lập đơn** và **Kế toán** mỗi khi hướng dẫn viên đổi số khách/dịch vụ: "Đơn TD-0123: HDV đổi số khách (tăng 2)". …" | **Thay một phần** (phần đổi số khách): kênh = hộp thông báo + màn hình khoá (không thông báo nổi — ADR-0022 TD-4 giữ); người nhận "Của tôi" = người lập + người phụ trách theo lời chủ C1 30/9 ("Báo HDV + người lập đơn"). **Kế toán** không nhận ở "Của tôi", chỉ thấy ở ngăn "Tất cả" (có `order.view = any`). Phần "đổi dịch vụ" của điều 8 **không** thuộc ADR này (còn proposed cùng điều 3). |

## Hệ quả

- HDV biết ngay khi văn phòng đổi giờ / nơi đón / số khách của đơn mình đi. Người lập biết khi HDV sửa số khách. Đó là hai chiều của C1.
- **Dữ liệu:**
  - một view mới (`0047`);
  - khuôn chữ `detail` của hành động đổi số khách có thêm đoạn đầu. Khuôn này thành **hợp đồng** giữa hàm viết và hàm đọc, có bài khứ hồi canh.
  - Không bảng mới, không cột mới.
- **HDV xem được thêm giá trị cũ** ("07:00 → 06:30"), vốn đã có trong lịch sử đơn họ phụ trách (`order.history.view = assigned`). Không mở dữ liệu mới cho HDV.
- Lần sửa nhiều trường một lúc thành một tin dài hơn. Trên iPhone, câu dài bị cắt ở màn hình khoá; bấm vào đọc đủ.
- Dòng cũ trước mốc phát hành không sinh tin.
- **Nới luật kiến trúc (Phần II §4, `docs/ARCHITECTURE.md:185` — cửa đọc chéo "chỉ khoá + nhãn + cờ"):** `v_aud_order_change` có cột `detail`. Lý do: hàm đọc cần chữ để dựng câu; không có cách khác mà vẫn nêu được giá trị cũ → mới (ADR-0052 dòng 147 chọn "không `detail`" vì tin chuyến không cần giá trị). Hàng rào bù: bài "chỉ `thongbao` đọc view này" + luật an toàn của hàm đọc (chỉ đoạn khuôn máy viết). Nới này nằm trong câu duyệt lượt 1b (`trang-ghep-luot-1.md`), chủ gật rõ.
- **Đổi khuôn `detail` của `order_money_adjusted_by_field`** ("Khách báo thêm 1 người" → "số khách: … · lý do: …"):
  - `tests/e2e/dispatch.mjs:502` và `:510` đang khẳng định `detail` nguyên văn ⇒ sửa kỳ vọng trong cùng lát thi công;
  - `web/order.ts:320` hiện `detail` nguyên văn ở khối Lịch sử ⇒ chữ Lịch sử đổi theo (ghi một gạch nhật ký thay đổi).
- **Cờ `doiSoKhach` là trường MỚI của kiểu hành động** trong `src/shared/audit-actions.ts` (hôm nay mỗi hành động chỉ có `{label, group}`).
- **Việc lớn** (dữ liệu: view mới, hợp đồng nhật ký; quyền đọc tin) ⇒ sau thi công phải có **người kiểm độc lập chỉ đọc** (CLAUDE.md §3).
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` (thông báo), `docs/CHANGE-GUIDE.md` (thêm loại tin đơn), `docs/data-dictionary.json` + `npm run dict`.

## Cửa một chiều / hai chiều

- **Một chiều (nhẹ):** tên và cột của view `v_aud_order_change` (đã công bố thì chỉ thêm); khuôn đoạn đầu "số khách …" trong `detail` của dòng đã ghi.
- **Hai chiều:** tập hành động nguồn, câu tin, luật chống trùng, giờ yên lặng, người nhận (luật đọc, tính lúc đọc: đổi là có hiệu lực ngay cho cả tin cũ).
- Không cửa một chiều về tiền; không lộ dữ liệu cá nhân mới.

## Phương án bị loại

- **Sổ thông báo riêng ghi cùng lô:** ADR-0034 đã loại (hai nơi ghi một việc).
- **Hành động nhật ký riêng `order_changed_after_confirm` ghi thêm một dòng:** cùng một việc hai dòng nhật ký; phải sửa mọi lô ghi.
- **Tin không có giá trị ("Đơn X vừa đổi thông tin đón")** làm mặc định: chủ muốn biết giờ đổi thành gì (ví dụ của điều phối). Chỉ giữ làm câu dự phòng.
- **Hiện chữ nơi đón trong tin:** chữ tự do có thể chứa tên / địa chỉ nhà khách; màn hình khoá ai cũng đọc được (khuyến nghị câu 6 của `cau-hoi-chu.md`).
- **Thông báo nổi mới cho `chuyen`/`tien`:** Bảng tin chỉ có 5 khoá, không mang được phần đổi; hộp + số đỏ đã đủ "tin trong app".
- **Gộp theo khoảng thời gian ở máy chủ:** cần hẹn giờ gửi / hàng đợi; tag chung trên màn hình khoá đã tránh chồng tin.
- **Báo luôn tài xế ở đây:** trùng ADR-0052 D6.
- **Đọc `v_aud_order_event` rồi thêm cột `detail` vào đó:** sửa view đang dùng, trái ADR-0034 điều 5.

## Bài kiểm / hàng rào (mỗi hàng rào mới có dòng `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật)

1. **Bảng ca `locHopThongBao`** (`src/shared/thong-bao.test.ts`):
   - Bán hàng lập, HDV phụ trách, Quản trị đổi giờ đón đơn đã xác nhận → Bán hàng + HDV có tin "Của tôi", Quản trị không;
   - HDV sửa số khách → người lập có tin, HDV không;
   - cùng thao tác trên **đơn nháp** → không ai;
   - chỉ đổi ghi chú / nơi check-in / nơi trả → không ai;
   - chỉ đổi **giờ check-in** hoặc **giờ khởi hành** → theo câu 3: A (khuyến nghị) → có tin; B → không ai;
   - Kế toán (xem mọi đơn) → chỉ ngăn "Tất cả";
   - Đối tác lập đơn → theo câu 5 của `cau-hoi-chu.md`;
   - tài xế → không;
   - đơn sửa giờ **khi còn nháp**, sau đó mới xác nhận → dòng sửa lúc nháp **không** thành tin (dòng `confirmed` đến sau);
   - đơn xác nhận **hơn 30 ngày** trước, hôm nay đổi giờ → có tin (câu đọc `confirmed` không bị cửa sổ 30 ngày).
2. **Khứ hồi khuôn chữ:** mọi đầu ra của `describeTripChange`, `moTaChang`, hàm viết đoạn số khách, `kemDatGap`, hàm viết đoạn đuôi lượt đổi giờ (ADR-0063) và hàm viết đoạn "số khách đi xe" (ADR-0065, khi có) → `phanDoiCuaTin` đọc đúng. Ca riêng:
   - `trip_updated` với `detail = "cập nhật chặng đưa đón"` → có tin, câu chung;
   - `trip_updated` chỉ "đổi ghi chú" → không tin;
   - dòng có đuôi đặt gấp / "tính 1 lượt đổi giờ" → câu tin không chứa đuôi đó;
   - **ca chéo tiền tố:** "số khách: …" không đọc thành "số khách đi xe …" và ngược lại;
   - dịch vụ nhập tay tên "Anh Nam 0901234567" → tin số khách ghi "dịch vụ nhập tay"; tin đổi giờ của dịch vụ đó không chứa tên;
   - chữ nơi tự do, lý do, tên dịch vụ nhập tay, dãy số **không bao giờ** xuất hiện trong câu tin (quét bằng bộ ca có SĐT giả, tên giả);
   - **tên dịch vụ đối kháng** (thêm theo người kiểm vòng 2) — mỗi ca ghi rõ kết quả mong đợi:
     - tên chứa ":" (vd "Tour: đảo") và đổi giờ đón thật 07:00 → 06:30 → tin "giờ đón 07:00 → 06:30", không chứa "đảo";
     - tên chứa " | " và một đổi giờ giả (vd "Tour | giờ đón 01:00 → 02:00") → tin chỉ có đổi thật "giờ đón 07:00 → 06:30"; **không bao giờ** có "01:00 → 02:00";
     - tên chứa " → " hay chứa một nhãn trường khiến `detail` phân tích được nhiều cách → **câu chung** "Đơn <mã> vừa đổi chặng đưa đón", không in mẩu thô;
     - tên chứa " · lý do: " ở dòng số khách (tên danh mục lạ) → cắt sớm, phần trước không khớp ngữ pháp → câu chung "… đổi số khách";
     - lý do tự do chứa "số khách đi xe 1 → 9" → không vào câu tin (cắt tại " · lý do: " đầu tiên);
     - giá trị sai dạng (vd "giờ đón 7h → 6h30") → câu chung, không in giá trị;
     - **chữ nơi đón tự do** chứa ", giờ đón 01:00 → 02:00" (dòng `order_leg_updated` từ `moTaChang`, hoặc "đổi điểm đón" kèm đổi giờ thật) → tin chỉ "đổi nơi đón" (và đổi thật nếu có) **hoặc** câu chung; **không bao giờ** có "01:00 → 02:00";
     - tên dịch vụ bắt đầu bằng "số khách đi xe 1 → 9 | " kèm đổi giờ thật → không có "số khách đi xe 1 → 9" trong tin (đoạn này chỉ được nhận ở cuối);
   - **Khứ hồi đoạn "số khách đi xe"** (ADR-0065 bài 4c): lệnh chỉ đổi `ridePax` 4 → 3 → tin **thật** "Đơn <mã>: số khách đi xe 4 → 3", **không** câu chung; lệnh đổi giờ đón + `ridePax` + đặt gấp + tính lượt → tin có cả hai phần đổi, không có đuôi;
3. **Tập nguồn một nơi (Đ1-a):**
   - mọi hành động có cờ `doiSoKhach` ∈ tập nguồn; tập nguồn ⊂ `AUDIT_ACTIONS`;
   - **mọi hành động ghi `order_money_adjustment` mang cờ `doiSoKhach`**: tham số hành động của `insertMoneyAdjustment` có kiểu chỉ nhận hành động mang cờ (kiểu dẫn từ `AUDIT_ACTIONS`), cộng bài quét mã nguồn — mọi câu `INSERT INTO order_money_adjustment` trong mã chạy (loại trừ `*.test.ts` — 5 tệp test đang chèn thẳng để dựng dữ liệu) chỉ nằm trong `insertMoneyAdjustment` (thêm tạm một câu chèn thứ hai ở chỗ khác → đỏ);
   - nhãn trường giờ dùng trong hàm đọc lấy từ **đúng** hằng `TRUONG_GIO_TINH_LUOT` (không danh sách thứ hai; thêm tạm một mảng trường giờ riêng trong `thong-bao.ts` → đỏ);
   - view `v_aud_order_change` lọc **đúng** tập nguồn (so chuỗi SQL với hằng, khuôn `src/migrations-0025.test.ts`). Hằng so sánh là tập **đã khai** — gồm `order_money_adjusted` khai trước (Đ1) dù chưa có dòng ghi; bỏ nó khỏi view hoặc khỏi hằng → đỏ;
   - bảng nhãn trường thời gian ở `src/shared/` là tập cha của `TRUONG_GIO_TINH_LUOT`; `TRIP_VALUE_FIELDS` (`orders`) đọc nhãn từ bảng đó (viết lại một nhãn tay trong `service-rules.ts` → đỏ);
   - **chỉ `thongbao` đọc `v_aud_order_change`** (quét SQL mọi module; thêm tạm một câu đọc view ở `orders` → đỏ).
4. **Cùng lô một tin:** một lệnh sửa sinh hai dòng nhật ký cùng mốc → một tin.
5. **Chống trùng MQ-07** (bài chờ, cài khi D6 có mặt): một dòng `order_leg_updated` của chặng có suất mở → người lập (Bán hàng) nhận đúng một tin.
6. **Màn hình khoá:** `nguoiNhanDay` với `DongDon` loại mới trả đúng tập người nhận của bài 1; người sửa không có trong tập. Bài hàng rào hiện có của `baoThayDoi` (`src/shared/bang-tin.test.ts`) vẫn xanh; sự kiện Bảng tin vẫn đúng 5 khoá (`laSuKienHopLe`).
7. **Kiến trúc:** `thongbao` chỉ đọc view công bố (bài `EXPLAIN`); `v_aud_order_change` thuộc module `audit` trong sổ dữ liệu.
8. **e2e:** xác nhận đơn → HDV nhận → văn phòng đổi giờ đón → `GET /api/thong-bao` (`thongbao/index.ts:151`), ngăn "Của tôi" của HDV có câu "…giờ đón 07:00 → 06:30"; của văn phòng không có.
9. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`. Thử iPhone thật: màn hình khoá hiện đúng câu, không lộ chữ nơi.

## Câu hỏi còn mở (cho chủ — đã gom vào `cau-hoi-chu.md`, hỏi một lần)

- **Câu 3** — "giờ" gồm những gì (dùng chung với ADR-0063; quyết cả tin lẫn hạn 2 lần).
- **Câu 5** — Đối tác / Thực tập là người lập có nhận tin không (khuyến nghị: Có, chỉ đơn họ lập). Ghi chú: ADR-0014 điều 12 (accepted) hứa báo CTV bằng "chấm đếm, không đẩy" khi HDV sửa / huỷ đơn, nhưng tìm trong mã không thấy chấm đếm đó (chỉ có chấm Góp ý) — **chưa kiểm kỹ; có vẻ chưa thi công**.
- **Câu 6** — tin có ghi nơi đón mới không (khuyến nghị: không, chỉ ghi "đổi nơi đón").
- Đã bỏ câu "tin ban đêm có rung không": ADR-0039 (đã duyệt) trả lời rồi — giữ như mọi tin.

## Giả định người soạn tự áp (bề mặt, đổi lại được — ghi để chủ xem)

- *(Bỏ ở lần sửa 1:)* giả định cũ "giờ đón gồm cả ngày đón / ngày khởi hành" nay thay bằng hằng "giờ" dùng chung, chủ chốt ở câu 3.
- **Thêm / bỏ chặng đón có tin.** Hoàn tác: bỏ `order_leg_added` / `order_leg_closed` khỏi tập nguồn.
- **Tin đổi số khách có kèm phần "số khách đi xe A → B" khi máy tự hạ** (ADR-0065, chỉ khi câu 8 = A). Hoàn tác: hàm đọc dừng sau đoạn "số khách: …".
- **Khai trước hành động `order_money_adjusted`** (Đ1) dù lượt 2a chưa duyệt; bị bác thì hành động nằm chết, vô hại. Hoàn tác: gỡ khỏi hằng + migration tạo lại view.
- **Không gộp** nhiều lần sửa; một lô một tin. Hoàn tác: luật đọc.
- **Không công tắc theo loại tin.** Hoàn tác: ADR sau.
- Người xem mọi đơn thấy tin ở ngăn "Tất cả" (không số đỏ, không gõ cửa), như mọi tin đơn khác.

## Chưa kiểm

- *(Đã kiểm, lần sửa 1:)* `updateTrip` ghi **đúng một** dòng `trip_updated`; thao tác chặng trong cùng lệnh không ghi `order_leg_updated` riêng (`repository.ts:1178-1197`). Luật "cùng lô một tin" vẫn giữ cho an toàn.
- Hiệu năng câu đọc `confirmed` không giới hạn 30 ngày (chỉ theo các `order_id` có dòng nguồn): chưa đo.
- Hiệu năng: `v_aud_order_change` thêm dòng vào vòng lọc bằng JS của hộp (ADR-0034 "Hệ quả" đã hẹn đo). Chưa đo.
- iPhone cắt câu dài ở màn hình khoá bao nhiêu ký tự. Chưa thử.
- Bản nháp này **đã qua kiểm độc lập 2 vòng** (ĐẠT CÓ ĐIỀU KIỆN, các điều kiện đã sửa ở commit này); bản sửa theo vòng 2 **chưa được kiểm lại**.
