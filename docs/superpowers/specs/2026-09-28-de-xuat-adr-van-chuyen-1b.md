# Đề xuất ADR — Vận chuyển lượt 1b: chặng đưa đón, danh sách hành khách, chuyến xe, xuất bến, tài xế xem cuốc

- **Ngày:** 2026-09-28. **Vai:** người soạn thiết kế, chỉ viết tài liệu, không thi công. **Trạng thái:** **ĐỀ XUẤT — CHƯA DUYỆT, CHƯA CÓ NGƯỜI KIỂM ĐỘC LẬP.**
- **Số ADR:** chưa lấy. Văn bản gọi là **ADR-00xx-A** (lượt duyệt 1) và **ADR-00xx-B** (lượt duyệt 2); số chốt lúc chủ duyệt. Tệp này KHÔNG nằm trong `docs/adr/`, và KHÔNG giữ chỗ ở `docs/adr/README.md`.
- **Migration dự kiến** (chỉ để lập kế hoạch, không giữ chỗ):
  - `0034`: phía `orders`;
  - `0035`: chính sách Vận chuyển;
  - `0036`: chuyến xe.
  - Đã kiểm ngày 2026-09-28 bằng `git log --all --name-only -- migrations/`. Số lớn nhất đã commit trên mọi nhánh là `0033`. `0019` giữ cho B5, `0029` giữ cho Thông báo đính kèm.
  - Lệnh này **không thấy** tệp chưa commit ở worktree khác, nên kiểm lại lúc thi công.
- **Nguồn đã đọc:**
  - `CLAUDE.md` §2, §3, §9;
  - `docs/ARCHITECTURE.md` Phần I (điều 2, 3, 4, 5) và Phần II "Luật dữ liệu";
  - ADR-0040 (accepted);
  - `docs/adr/README.md`;
  - `2026-09-27-van-chuyen-design.md` + `2026-09-27-van-chuyen-ra-soat.md` (kể cả Phụ lục A–C và §6 "chủ đã quyết");
  - ADR-0001 (mục 7 và dòng 42), ADR-0006 (điều 1–8), ADR-0024 (điều 1, đề xuất `v_ord_order_state`), ADR-0030;
  - đặc tả Đơn tự do (Q-AA, ADR-0031 dự kiến);
  - `docs/quyen-hoan.json`;
  - nhật ký thi công 1a.
- **Mã đã tra (chỉ đọc):**
  - `src/modules/van-chuyen/`, `src/modules/orders/` (`repository.ts`, `money-adjustment.ts`, `pool.ts`, `index.ts`), `src/modules/parties/index.ts`;
  - `src/shared/permissions.ts`, `src/architecture.test.ts`;
  - `migrations/0008`, `0010`, `0014`, `0031`–`0033`.
- **Không xây trên lỗ an ninh đang hở:** `docs/quyen-hoan.json` mục `phat_hien` **rỗng** (kiểm 2026-09-28). Mục `thao_tac` còn 6 dòng (`task.progress`, `dispatch.guides.view`, `payment.*`, `invoice.*`); không dòng nào là ô mới của đề xuất này, xem §3.3 về `task.progress`.
- **XÂY TRÊN NỀN CHƯA CÓ (Hiến chương 5.13):** xem §1. Cả ba nền đều **chưa có** trong mã hôm nay. Đề xuất này nói rõ ai làm từng nền.

---

## 0. Điều chủ đã quyết — áp dụng, không hỏi lại

Nguồn: lời giao của điều phối ngày 2026-09-28 và `2026-09-27-van-chuyen-ra-soat.md` §6.

| # | Quyết định của chủ | Áp vào đề xuất ở |
|---|---|---|
| C1 | Lượt 1 = hồ sơ xe (xong 1a) + điều xe + tài xế xem lịch trên app. Tài xế là nhân viên có tài khoản, quyền `DRIVER`; 1b mở ô "xem cuốc xe của mình" | B3 |
| C2 | Việc chính: đón khách từ khách sạn hoặc nhà riêng tới bến tàu hoặc ga cáp treo; có chiều về | A1 (chiều đi/về), B1 (điểm dừng) |
| C3 | Lịch đón gắn vào đơn: một dịch vụ kèm đón, hoặc một đơn riêng "đưa đón sân bay" | A1 |
| C4 | Xe đang chạy trả lời được: có hợp lệ không; ai lái; đã đón khách nào; khởi hành từ đâu, dừng những điểm nào; đã kết thúc chưa, lúc mấy giờ | B1, B2 |
| C5 | Một xe không chạy hai chuyến cùng giờ; luôn có khoảng nghỉ (cấu hình) | B1 (L2), B2 |
| C6 | Chuyến gom khách nhiều đơn; tổng người ≤ số chỗ; số chỗ tính mọi người trên xe trừ tài xế; phân bổ TỪNG NGƯỜI; chặng có ngày và giờ hẹn riêng | A1, B1 |
| C7 | Danh sách hành khách: họ tên + năm sinh, gắn với đơn, là dòng nhẹ của đơn (không phải hồ sơ Bên). Văn phòng nhập khi lập đơn. Tài xế bổ sung lúc đón. Thêm người thì báo văn phòng. Thiếu danh sách thì chặn xuất bến | A2, B2, B3 |
| C8 | Bộ điều kiện xuất bến là dòng có ngày hiệu lực, kèm công tắc hợp đồng/danh sách; chỉ Toàn quyền sửa (`settings.ops`). Chuyến chụp bộ điều kiện đã dùng lúc xuất bến. Danh mục do Quản trị sửa (`admin.manage`) | B2 |
| C9 | Đủ điều kiện lái xét bằng giấy tờ (hạng bằng ↔ số khách tối đa không kể lái); văn phòng điều xe | B2, B3 |
| C10 | Chủ xe = hồ sơ công ty chủ (T2b, đã có) | không đổi |
| C11 | (ra-soát §6, chủ không phản đối) Đủ tên cho số khách đã đặt **lúc xuất bến**; tài xế sửa/bổ sung lúc đón; phân bổ từng người; giấy tờ không sửa đè | A2, B2 |
| C12 | (Q-AA, 26/9) Thêm tiền tố bảng `ord_` cho `orders` | A3 |

---

## 1. Ba nền chưa có (tra mã 2026-09-28)

| Nền | Hiện trạng thật | Ai làm |
|---|---|---|
| **N-a. "Số khách hiệu lực" một nguồn** | `orders/index.ts` **không** công bố hàm nào. Số khách sau xác nhận nằm trong `order_money_adjustment.after_json`; `parseAdjustmentAfter` (`orders/money-adjustment.ts`) chỉ dùng nội bộ `orders`. | Kế hoạch "dọn nền" (T1, chủ duyệt 27/9) đã nhận việc này là sản phẩm bắt buộc, nhưng **chưa có tệp kế hoạch** trong `docs/superpowers/plans/`. **Đề xuất:** quyết định A3 của lượt 1 mang việc này (lát T0). Nếu kế hoạch dọn nền làm trước thì A3 chỉ dẫn chiếu, không làm lại. |
| **N-b. Tiền tố bảng `ord_`** | `TABLE_PREFIX` ở `src/architecture.test.ts` **không có** `ord_` (chỉ có `VIEW_PREFIX.ord`). Chủ đã chốt Q-AA ngày 26/9, nhưng văn bản mang nó (ADR-0031 + T3b) **chưa soạn**; không có tệp ADR-0031. | **Đề xuất:** ADR-0031 được duyệt trước thì A3 bỏ câu này. Nếu không, **A3 mang câu sửa ADR-0002 điều 2** ("nguyên văn → mới") kèm T3b (khoá danh sách bảng `legacy`). Điều phối chọn thứ tự; không cần hỏi chủ, vì chủ đã chốt nội dung. |
| **N-c. Chặng đưa đón là thực thể** | Chỉ có `order_service.pickup_time` + `pickup_place` (chữ tự do, `migrations/0008`). Không có nơi trả, chiều về, ngày đón riêng, hay cờ "có hẹn đón" (ADR-0006 điều 6 đòi, chưa làm). | Quyết định A1. |

**Lưu ý về ADR-0006 điều 1 (id dịch vụ bền).** Đã kiểm: lưu nháp vẫn **xoá rồi chèn lại** dịch vụ (`orders/repository.ts:760-761`, `updateDraftOrder`). Vì vậy:
- Chặng gắn khoá ngoại tới `order_service`. Khi lưu nháp, chặng bị xoá và chèn lại **cùng lô**, và **trước** câu xoá dịch vụ.
- Hàng khách gắn theo **đơn** (`order_id`), không theo dịch vụ, nên không bị việc xoá–chèn dịch vụ làm hỏng.
- Vận chuyển **chỉ xếp chặng của đơn đã xác nhận** (L6). Từ lúc xác nhận, trigger `order_service_frozen_delete` (0008) đã khiến id dịch vụ bền. Như vậy không cần làm trước phần "so khớp theo id" của ADR-0006 điều 1.

---

## 2. Hai lượt duyệt, thứ tự

Mỗi lượt duyệt tối đa 3 quyết định chạm quyền hoặc dữ liệu, kèm trang ghép riêng (CLAUDE.md §9). Đề xuất có **sáu** quyết định nên tách hai lượt:

| Lượt | ADR | Quyết định | Module chủ |
|---|---|---|---|
| **Lượt duyệt 1** | ADR-00xx-A "Chặng đưa đón và danh sách hành khách trên đơn" | **A1** chặng đưa đón · **A2** danh sách hành khách (mở lại ADR-0001:42) · **A3** số khách hiệu lực công bố + tiền tố `ord_` + view trạng thái đơn | `orders` |
| **Lượt duyệt 2** | ADR-00xx-B "Vận chuyển lượt 1b: chuyến xe, xuất bến, tài xế xem cuốc" | **B1** chuyến + phân bổ từng người + máy trạng thái (thay ADR-0006 cho xe đường bộ) · **B2** cổng xuất bến + chính sách + bản chụp · **B3** ô quyền của chuyến + route tài xế | `van-chuyen` |

**Thứ tự:** lượt duyệt 1 → lượt duyệt 2 → thi công (T0/T1 phía `orders` song song với T2 chính sách, xem §7) → thi công chuyến → chủ vẽ giao diện trên Claude Design → thi công giao diện → người kiểm độc lập → phát hành.
- Lượt 2 **không duyệt trước** lượt 1, vì B1/B2 dựa vào hình dạng dữ liệu của A1–A3. Lượt 2 duyệt được ngay khi lượt 1 đã **duyệt** (hình dạng đã chốt), không phải chờ lượt 1 **thi công xong**.
- Chủ có thể nghe cả hai lượt trong **cùng một buổi**, nhưng phải là **hai lần bấm duyệt**, mỗi lần một trang ghép.

---

## 3. Lượt duyệt 1 — ADR-00xx-A (module `orders`)

**Loại:**
- **một chiều:** bảng `ord_*` và dữ liệu cá nhân của khách (họ tên, năm sinh) đã lưu;
- **hai chiều:** ô quyền và màn hình.

**Hiến chương áp:**
- 2.1 (khách lẻ không phải hồ sơ, vẫn đúng);
- 2.2 (chặng và hành khách là Thực thể);
- 5.1 (có lệch hẹp, §3.4);
- 5.3;
- 5.5 (không xoá cứng sau xác nhận);
- 5.12 (nhật ký không tên, không năm sinh);
- 5.13.

### A1. Chặng đưa đón (`ord_transfer_leg`) — một chỗ duy nhất cho "hẹn đón khách"

- **Bảng:** `ord_transfer_leg`, thuộc module `orders`. Mỗi dòng là **một lần hẹn đưa hoặc đón khách của một dịch vụ**. Cột:

  | Cột | Kiểu, ràng buộc | Nghĩa |
  |---|---|---|
  | `id` | TEXT PK | |
  | `order_id` | FK `orders` | |
  | `order_service_id` | FK `order_service`, `NO ACTION` | dịch vụ mà chặng phục vụ |
  | `direction` | `CHECK IN ('OUT','RETURN')`, tập đóng | chiều đi / chiều về |
  | `pickup_date` | TEXT `YYYY-MM-DD`, giờ VN | ngày đón **riêng** (C6). Đơn sân bay bay 00:40 thì đón 22:30 hôm trước |
  | `pickup_time` | TEXT `HH:MM`; NULL = có hẹn nhưng chưa chốt giờ | giờ hẹn đón |
  | `pickup_location_id` | FK `loc_location`, NULL được | nơi đón chuẩn |
  | `pickup_place` | TEXT, NULL được | nơi đón chữ tự do |
  | `dropoff_location_id` | FK `loc_location` | nơi trả chuẩn |
  | `dropoff_place` | TEXT | nơi trả chữ tự do |
  | `pax_override` | INTEGER, NULL = mọi khách của dịch vụ | *(chỉ khi Q6 chọn (a))* |
  | `closed_at`, `close_reason_code` | NULL = chặng còn hiệu lực | bỏ chặng sau xác nhận = **đóng dòng**, không xoá |
  | cột dấu vết, `updated_at` | | khoá lạc quan |

  - Ràng buộc nơi đón: `CHECK` đúng một trong hai cột `pickup_location_id` / `pickup_place` có giá trị. Nơi trả cũng vậy.
  - Nhà riêng giữ chữ (dữ liệu cá nhân). Khách sạn, sân bay, ga, bến dùng `loc_location` (ra-soát C9).
- **Có dòng chặng = "có hẹn đón".** Đây là cờ ADR-0006 điều 6 đòi. Không cần thêm cột cờ trên `order_service`.
- **Dữ liệu danh mục:** thêm loại điểm `HOTEL` (khách sạn), `AIRPORT` (sân bay), `CABLE_CAR` (ga cáp treo) vào `loc_location_type` bằng migration (bảng tra cứu, chỉ thêm).
- **Hai giờ, hai chỗ (giữ ADR-0006 điều 5):** giờ/nơi **hẹn với khách** nằm ở chặng (`orders`). Giờ/nơi **xe tới thực tế** nằm ở điểm dừng của chuyến (`van-chuyen`). Không chép qua lại.
- **Quan hệ với `order_service.pickup_time` / `pickup_place` cũ:** chờ chủ chọn, **câu hỏi Q4**.
  - Khuyến nghị: chặng là **nguồn thật duy nhất**, theo expand–contract hai lần phát hành.
  - Lần 1: thêm bảng, chép dữ liệu cũ thành chặng chiều đi, mọi màn đọc chặng.
  - Lần 2: ngừng ghi hai cột cũ, đưa vào `deprecatedColumns`.
  - Hai cột cũ đang được đọc ở khoảng 20 tệp (biên nhận, hàng chờ HDV `pool.ts`, form chuyến…). Đây là phần việc lớn nhất của lượt 1.
- **Bất biến hai lớp:**
  - **[CSDL]**
    - `CHECK` khuôn ngày giờ và "đúng một nơi";
    - trigger `order_id` của chặng = `order_id` của dịch vụ (khuôn `order_item_service_scope_*`, 0008);
    - trigger cấm xoá chặng khi đơn không còn nháp (khuôn `order_service_frozen_delete`);
    - đơn đã xác nhận thì chặng chỉ sửa **trường vận hành** (ngày, giờ, nơi). Không đổi `order_service_id`, không đổi `direction`.
    - sau xác nhận: **thêm** chặng mới được (thêm chiều về); **bỏ** chặng = đặt `closed_at` + lý do (danh sách đóng), không xoá. Chặng đang có người trên một chuyến chưa xuất bến mà bị đóng hoặc đổi ngày giờ → chuyến bị **giữ** (B2) tới khi văn phòng rút người ra hoặc xác nhận lại.
  - **[Máy chủ]**
    - ngày đón trong khoảng cho phép (luật đổi được, ở mã — Phần II);
    - `pax_override` ≤ số khách hiệu lực của dịch vụ (lệch 5.1, §3.4).
- **Route** (cổng `orders`, thân hỏi `can()`):
  - lập và sửa nháp đi kèm thân `POST/PUT /api/orders` hiện có (thêm mảng `legs`);
  - sau xác nhận: `PUT /api/orders/:id/legs/:legId` (sửa trường vận hành; ô `order.trip.edit` như "Sửa thông tin chuyến" hôm nay; nhật ký trước→sau, nơi chữ tự do che dãy số).
- **Ngày giờ:** `pickup_date` / `pickup_time` là giờ dân sự VN (`TEXT`). "Hôm nay" = `vnToday`. Đổi sang mốc máy dùng **một hàm có test** (`vnLocalToIso` đã có ở `src/shared/vn-date.ts`; thêm bản trả mili-giây), có ca 00:00–07:00 giờ VN.
- **Cửa một chiều:** mã `direction` (tập đóng); bỏ hai cột cũ ở lần phát hành 2 (một chiều sau khi dữ liệu đã chuyển).

### A2. Danh sách hành khách (`ord_passenger`) — dòng nhẹ của đơn, không phải hồ sơ Bên

- **Bảng:** `ord_passenger`, thuộc module `orders`. Cột:
  - `id`, `order_id` (FK);
  - `full_name` (TEXT 1–100);
  - `birth_year` (INTEGER 1900–2100; **bắt buộc** — luật vận tải cần "năm sinh");
  - `pax_code` (`adult/child/senior/infant`, NULL được);
  - `previous_id` (dòng này **thay** dòng nào);
  - `person_key` — **khoá bền của một người**: bằng `id` của dòng đầu tiên trong chuỗi, chép sang mọi dòng thay thế (trigger kiểm: dòng có `previous_id` thì `person_key` = `person_key` của dòng trước; dòng đầu thì `person_key` = `id`);
  - `voided_at`;
  - `source` `CHECK IN ('OFFICE','DRIVER')` — ai nhập (tập đóng);
  - cột dấu vết.
- **Chỉ-thêm sau xác nhận** (giống giấy tờ ở ADR-0040):
  - **sửa tên = dòng mới** trỏ `previous_id`;
  - nhập nhầm = `voided_at`;
  - trigger cấm `UPDATE` các cột nội dung và cấm `DELETE` khi đơn không còn nháp;
  - chỉ mục duy nhất "một dòng thay thế còn hiệu lực" (khuôn `pty_person_document_next_uq`).
  - **Phân bổ lên chuyến trỏ `person_key`** (người), không trỏ id dòng. Văn phòng sửa chính tả tên sau khi đã xếp chuyến thì phân bổ vẫn đúng người, không cần `orders` chạm bảng `vc_`.
  - **Bản chốt lúc xuất bến (B2) giải `person_key` ra dòng hiện hành** và lưu **id dòng đó**. Dòng đã dùng không bao giờ đổi, nên bản chốt giữ đúng tên lúc xuất bến, và **không chép họ tên sang bảng `vc_`**. Dữ liệu cá nhân ở một chỗ.
  - **Phân biệt hai việc tài xế làm sau xuất bến:**
    - *sửa tên cùng một người* (viết sai chính tả, thiếu năm sinh) = dòng mới **cùng** `person_key`; bản chốt đã lưu không đổi, sự kiện chuyến ghi "đã sửa 1 tên";
    - *đổi người* (khách A không đi, khách B đi thay) = chuỗi **mới** (`person_key` mới); phân bổ của A chuyển `NO_SHOW`, phân bổ của B là dòng mới `added_after_departure = 1`, bản chốt thêm một dòng cho B.
- **Đơn nháp:** danh sách xoá–chèn lại cùng lô khi lưu nháp, như dịch vụ. Không bảng nào tham chiếu hành khách của đơn nháp (L6 ở B1).
- **Luật "đủ tên" (C7, C11):** mỗi chặng trên một chuyến phải có đúng [số khách hiệu lực của dịch vụ, hoặc `pax_override`] người được phân bổ, mỗi người có họ tên + năm sinh. Kiểm ở **cổng xuất bến** (B2), không kiểm lúc lưu đơn. Đơn nháp và đơn đã xác nhận đều lưu được khi danh sách còn thiếu.
- **Mở lại phương án đã loại:** ADR-0001:42 ghi *"`order_traveller`… không tên… chưa ai cần"*.
  - **Nguyên văn → mới:** "Danh sách hành khách của đơn (`ord_passenger`): họ tên + năm sinh từng khách, là dòng nhẹ của đơn, **không** phải hồ sơ (ADR-0001 mục 7 giữ nguyên); lý do mở lại: luật vận tải hành khách theo hợp đồng đòi danh sách, và chủ quyết 2026-09-27/28."
  - **Nguồn thật khi lệch (N7):** **số khách hiệu lực** là nguồn thật của *số người*. Danh sách là nguồn thật của *ai là ai*. Danh sách nhiều người hơn số khách → máy gắn cờ cho văn phòng, không tự tăng số khách. Danh sách ít người hơn → cổng xuất bến chặn.
- **Dữ liệu cá nhân:**
  - nhật ký, Bảng tin, thông báo chỉ ghi **số lượng** ("thêm 2 khách"), không tên, không năm sinh (siết 5.12 theo ADR-0040 D2);
  - có hàng rào kiểm và dòng sổ hàng rào;
  - lưu ít nhất 3 năm, không xoá cứng.
- **Ô quyền:**

  | Ô | SALES | ACCOUNTING | ADMIN | FIELD | PARTNER | SUPER_ADMIN | INTERN | DRIVER |
  |---|---|---|---|---|---|---|---|---|
  | `order.passenger.write` **(mới)** — nhập/sửa danh sách trên đơn | ownOrAssigned | none | any | none | own | any | own | none |
  | xem danh sách = `contact.view` **(giữ ô, ghi rõ nghĩa mới)** | any | any | any | assigned | ownOrAssigned | any | own | none |

  - Ô mới mang giá trị bằng `order.modify`: ai lập/sửa đơn thì nhập được tên khách của đơn đó.
  - Xem danh sách dùng ô `contact.view`. Chú thích ô đã gồm "tên khách"; ADR phải ghi "nay gồm họ tên + năm sinh của từng hành khách".
  - Tài xế **không** đi qua các ô này. Tài xế ghi qua ô `trip.passenger.add` ở B3, bằng câu lệnh chưa chạy do `orders` cấp (Hiến chương 5.3).
- **Route** (cổng `orders`):
  - `GET /api/orders/:id/passengers`: hỏi `contact.view`;
  - `POST /api/orders/:id/passengers`: thêm, sửa bằng dòng mới, hoặc huỷ dòng; hỏi `order.passenger.write`, khoá lạc quan theo `orders.updated_at`;
  - đơn nháp đi kèm thân `POST/PUT /api/orders`.
- **Cửa một chiều:** dữ liệu cá nhân đã lưu, và nhật ký chỉ-thêm (lỡ ghi tên vào nhật ký thì không gỡ được — vì vậy phải có hàng rào **trước** khi phát hành).

### A3. `orders` công bố "số khách hiệu lực", tiền tố `ord_`, view trạng thái đơn

- **Hàm đọc công bố cho Vận chuyển** (danh sách trường được phép dựng **trong `orders`**, khuôn `pool.ts`, theo ra-soát C7):
  - `hanhKhachChoChuyen(db, legIds) → { legId, orderId, orderCode, serviceName, direction, pickupDate, pickupTime, noiDon, noiTra, soNguoi, nguoi: { personKey, rowId, fullName, birthYear }[] }[]` — nơi chữ tự do che dãy số; **không** tiền, ghi chú, người lập, SĐT;
  - `lienHeChoTaiXe(db, orderIds) → { orderId, tenLienHe, sdt }[]` — **chỉ khi Q3 chọn (a)**;
  - hai hàm **không tự kiểm quyền**. Người gọi (`van-chuyen`) kiểm ô `trip.*` trước.
  - **Lệch nhỏ khỏi ra-soát C7:** C7 muốn ô quyền nằm ở `orders`. Đề xuất đặt ô ở `van-chuyen`, vì phạm vi "tài xế của chuyến" là dữ liệu `vc_`; đặt ở `orders` sẽ phải tiêm ngược từ gốc lắp ráp. Bù lại có bài kiểm "mọi nơi gọi hai hàm này đứng sau `can(trip.*)`".
- **Hàm công bố** `soKhachHieuLuc(db, serviceIds) → Map<serviceId, PaxCounts>` ở `orders/index.ts`:
  - đọc số đã lưu, phủ dòng điều chỉnh gần nhất qua **đúng** `parseAdjustmentAfter` (một nguồn, bài học Đợt E);
  - có hàng rào "không module nào khác đọc `order_money_adjustment` hay `after_json`" (quét mã);
  - Vận chuyển gọi hàm này, **không** đọc view số khách.
- **Tiền tố `ord_`:** như N-b ở §1. Kèm T3b: khoá danh sách bảng `legacy` bằng bài kiểm, để bảng mới của `orders` không trốn tiền tố.
- **View trạng thái đơn** (cho trigger của `van-chuyen` kiểm "chỉ đơn đã xác nhận"):
  - ADR-0024 (điều 1–5 **còn proposed**) đã đề xuất `v_ord_order_state(id, status, delivered_at, completed_at)`. Hai cột mốc chưa tồn tại.
  - **Đề xuất:** 1b tạo view **tên khác, nhỏ hơn**: `v_ord_order_flag(id, is_confirmed, is_cancelled)` — chỉ khoá + cờ (Phần II quy tắc 4).
  - Thêm hai view **chỉ khoá + cờ**, để trigger `vc_` giữ L6, L7 ở tầng CSDL mà không đọc bảng `orders` (Hiến chương 5.3):
    - `v_ord_leg_key(id, order_id, order_service_id, is_open)`;
    - `v_ord_passenger_key(person_key, order_id, has_current_row)`.
  - Không chiếm tên của một ADR đang proposed. Khi ADR-0024 được duyệt, nó có thể nuốt view này (ghi ở ADR-0024).
- **Câu SQL mới của `orders` (Hiến chương 6.3):** `orders` còn LEGACY (không `defineSql`, không EXPLAIN).
  - Đề xuất: SQL chạm `ord_*` viết bằng `defineSql` trong tệp riêng (vd `orders/chang-hanh-khach-repo.ts`) và đưa tệp đó vào bài EXPLAIN.
  - Nếu bài kiểm không nhận module "nửa nghiêm" thì ghi **nợ có tên** ở `architecture.test.ts` kèm hạn, không để lặng.
- **Cửa:** hai chiều (hàm, view); tiền tố là một chiều (ADR-0002 điều 2).

### 3.3 `task.progress` và các ô đang hoãn

`task.progress` (hạn 30/11 ở `quyen-hoan.json`) là ô tiến độ nhiệm vụ `dsp_assignment` (HDV, cano). Đề xuất **không** dùng lại nó cho chuyến xe, vì dùng lại là đổi nghĩa ô đã duyệt (ADR-0019:61). Ô vẫn giữ hạn cũ. Chuyến xe có ô riêng `trip.progress` (B3).

### 3.4 Lệch có chủ ý 5.1 của lượt 1 (khuôn ADR-0029)

- **L-A1:**
  - **Phạm vi:** luật "`pax_override` ≤ số khách hiệu lực" và "danh sách nhiều hơn số khách thì gắn cờ".
  - **Vì sao chỉ ở mã:** sau khi sửa, số khách nằm trong JSON (`after_json`), trigger không đọc được.
  - **Điều kiện gỡ:** số khách hiệu lực thành **cột có kiểu** (kế hoạch dọn nền T1, hoặc ADR sổ công nợ).
  - **Lớp bù:** câu kiểm định kỳ ở `scripts/audit-checks.mjs`.

### 3.5 Trang ghép — lượt duyệt 1

| Hỏi | Trả lời |
|---|---|
| **(1) Bảng nào chứa loại thực thể nào?** | `ord_transfer_leg` (mới): chặng đưa đón của dịch vụ — **một loại**. `ord_passenger` (mới): hành khách của đơn — **một loại**, dữ liệu cá nhân (họ tên, năm sinh), không phải hồ sơ Bên; chuỗi phiên bản theo `person_key`. `order_service`: không thêm loại dòng; hai cột đón cũ ngừng ghi ở lần phát hành 2 (theo Q4). `loc_location_type`: thêm ba mã loại điểm. `audit_log`: hành động mới `order_leg_*`, `order_passenger_*`, **chỉ số lượng**. View mới `v_ord_order_flag`, `v_ord_leg_key`, `v_ord_passenger_key` (chỉ khoá + cờ). |
| **(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào?** | `order.modify` (nháp) và `order.trip.edit` (sau xác nhận) → `ord_transfer_leg`: **cùng loại dữ liệu** với hai cột đón cũ, không đổi nghĩa ô. `order.passenger.write` (mới) → `ord_passenger`. `contact.view` → đọc `ord_passenger` (nghĩa mở rộng có tên). `DRIVER` → **không** ô nào của `orders`; tài xế ghi `ord_passenger` chỉ qua `trip.passenger.add` (lượt 2), bằng câu do `orders` cấp. `party.*` → không chạm (hành khách không phải hồ sơ). |
| **(3) Cổng nào canh cửa nào?** | Route chặng và hành khách ở **cổng `orders`**, thân hỏi `can()` trước mọi truy vấn. `ORDERS_GATE` không có `DRIVER` (bài `cong-quyen.test.ts` giữ nguyên). Hàm `soKhachHieuLuc` và câu lệnh ghi hành khách công bố cho `van-chuyen` **không tự kiểm quyền**: nơi gọi phải kiểm trước — ghi ở chú thích + bài kiểm "mọi nơi gọi đều đứng sau `can()`". |

---

## 4. Lượt duyệt 2 — ADR-00xx-B (module `van-chuyen`)

**Loại:**
- **một chiều:** bảng `vc_trip*`, bản chụp xuất bến (lưu ít nhất 3 năm), nhật ký sự kiện chuyến;
- **hai chiều:** ô quyền, số liệu chính sách, màn hình.

**Hiến chương áp:**
- 2.2;
- 4.1 (trạng thái + nhật ký cùng lô);
- 5.1 (có lệch hẹp, §4.4);
- 5.2 (chính sách có ngày hiệu lực, không JSON);
- 5.3 (trigger chỉ đọc `vc_` hoặc view công bố);
- 5.5; 5.6 (chụp lúc xuất bến);
- **5.7 (giữ — lần áp đầu tiên)**;
- 5.8 (bước gắn vai trên đối tượng: tài xế **của chuyến này**);
- 5.12.

**Đồ thị:** thêm cạnh `van-chuyen → orders` (bổ sung ADR-0002 và `ALLOWED_DEPS`). Hôm nay chỉ có `van-chuyen → parties, audit`. Vẫn không module nào import `van-chuyen`.

### B1. Chuyến xe, điểm dừng, phân bổ từng người, máy trạng thái

**Thực thể** (bảng `vc_`):
- **`vc_trip`** — chuyến. Một chuyến **một chiều**; chiều về là chuyến khác.
  - `vehicle_id` (FK `vc_vehicle`);
  - `planned_date` (ngày dân sự VN);
  - `planned_start_ms`, `planned_end_ms` (INTEGER, mốc máy so sánh — Phần II);
  - `rest_minutes_snapshot` (khoảng nghỉ chụp lúc tạo);
  - `status`;
  - `departed_at`, `ended_at` (ISO UTC);
  - `departed_ms`, `ended_ms`;
  - `cancel_reason_code` (FK bảng tra cứu, danh sách đóng — ADR-0030 điều 2);
  - `version` (khoá lạc quan);
  - cột dấu vết.
  - `CHECK`: `planned_end_ms > planned_start_ms` và chênh ≤ 24 giờ (chuyến qua nửa đêm vẫn đúng).
- **`vc_trip_driver`** — ai lái, có hiệu lực: `trip_id`, `driver_party_id` (FK `pty_party`), `valid_from_at`, `valid_to_at`.
  - Chỉ mục duy nhất: **một tài xế đang mở mỗi chuyến**.
  - Đổi tài xế = đóng dòng cũ, mở dòng mới cùng lô. Lịch sử "ai lái" không bị ghi đè (ra-soát C4).
- **`vc_trip_stop`** — điểm dừng: `seq`, `kind` (`PICKUP/DROPOFF/DEPOT`), `location_id` hoặc `place_text`, `planned_time`, `status` (`PENDING/DONE/SKIPPED`), `done_at`, `skip_reason_code`.
- **`vc_trip_allocation`** — **một người trên một chuyến** (C6: phân bổ từng người):
  - `trip_id`;
  - **đúng một trong hai**:
    - `passenger_key` (= `ord_passenger.person_key`, khoá ngoại tới dòng đầu chuỗi; dòng này không bao giờ bị xoá sau xác nhận);
    - hoặc `crew_party_id` (FK `pty_party` — HDV, phụ xe đi kèm; C6 "mọi người trên xe");
  - `leg_id` (FK `ord_transfer_leg`, bắt buộc khi là hành khách);
  - `board_stop_id`, `alight_stop_id`;
  - `status` (`WAITING/BOARDED/NO_SHOW/TRANSFERRED`);
  - `added_after_departure` (0/1);
  - `valid_from_at`, `valid_to_at` (rút khỏi chuyến trước xuất bến = đóng dòng);
  - cột dấu vết.
- **`vc_trip_event`** — nhật ký sự kiện chuyến, chỉ-thêm:
  - `kind` (xuất bến, đã đón, vắng, trả, kết thúc, kết thúc gián đoạn, báo thêm khách…);
  - `request_id` **UNIQUE** (chống bấm lặp, mất sóng);
  - `server_at` + `client_at` (giờ máy tài xế báo, chỉ để tham khảo);
  - `actor_id`;
  - `count` (số người, **không tên**).

**Máy trạng thái** (tập đóng `CHECK`, định **trọn** từ đầu để khỏi dựng lại bảng — ra-soát B):
- Chuyến: `SCHEDULED → DEPARTED → ENDED | ENDED_INTERRUPTED`; `SCHEDULED → CANCELLED`.
  - Trigger chỉ đi tiến (khuôn `orders_status_transition`, 0017).
  - `ENDED`, `ENDED_INTERRUPTED`, `CANCELLED`: trigger cấm sửa và cấm xoá.
- Phân bổ: `WAITING → BOARDED | NO_SHOW`; `NO_SHOW → BOARDED` (đón muộn, bước lùi duy nhất); `WAITING | BOARDED → TRANSFERRED` (chuyển sang chuyến cứu hộ).
- Điểm dừng: `PENDING → DONE | SKIPPED` (có lý do).
- "Kết thúc" thường bị chặn khi còn điểm `PENDING`. "Kết thúc gián đoạn" (có lý do) chuyển các điểm còn chờ sang `SKIPPED` trong cùng lô.
- Giao diện 1b cho sự cố làm **tối giản**; trạng thái vẫn có sẵn trong CSDL.

**Luật và tầng giữ:**
- **[CSDL]** trigger chỉ đọc `vc_` hoặc view công bố; **[MC]** máy chủ; **[ĐK]** câu kiểm định kỳ.

| Mã | Luật | Tầng |
|---|---|---|
| L1 | **Sức chứa:** số dòng phân bổ đang mở (`valid_to_at IS NULL`), trạng thái `WAITING` hoặc `BOARDED` (hành khách + người đi kèm), của một chuyến ≤ `vc_vehicle.passenger_capacity`. `NO_SHOW` và `TRANSFERRED` **không** chiếm chỗ; đón muộn (`NO_SHOW → BOARDED`) bị kiểm lại. Phân bổ từng người nên luật này **thuần dữ liệu `vc_`**. Tính **tổng cả chuyến**, không theo từng đoạn (C6: "tổng số người ≤ số chỗ"). **Giảm số chỗ của xe** (`PUT /api/van-chuyen/xe/:id` của 1a) hoặc ngừng xe khi còn chuyến `SCHEDULED`/`DEPARTED` vượt số mới → 409 kèm danh sách chuyến (ra-soát A.16). | **[CSDL]** trigger INSERT/UPDATE phân bổ, UPDATE xe của chuyến, UPDATE `passenger_capacity`/`status` của `vc_vehicle`; **[MC]** báo trước bằng lời |
| L2 | **Không trùng giờ, đủ nghỉ:** không hai chuyến chưa huỷ của cùng một xe, hay cùng một tài xế đang mở, có khoảng `[start − nghỉ, end + nghỉ]` chồng nhau. `nghỉ = max(rest_minutes_snapshot của hai chuyến)`. | **[CSDL]** trigger INSERT/UPDATE `vc_trip` + INSERT `vc_trip_driver`; **[MC]** câu ghi có `NOT EXISTS` |
| L2b | **Một chuyến đang chạy mỗi xe**, và xuất bến chỉ khi chuyến trước của xe (hoặc của tài xế) đã kết thúc **đủ khoảng nghỉ tính từ `ended_ms` thật**. | **[CSDL]** chỉ mục duy nhất `(vehicle_id) WHERE status='DEPARTED'` + trigger |
| L6 | **Chỉ đơn đã xác nhận, chặng còn hiệu lực:** phân bổ hành khách chỉ khi đơn của chặng `is_confirmed = 1`, chưa huỷ, và chặng `is_open = 1`. Đơn bị huỷ hoặc chặng bị đóng **sau** khi xếp thì chuyến bị **giữ** tới khi gỡ ra. | **[CSDL]** trigger INSERT phân bổ đọc `v_ord_leg_key` + `v_ord_order_flag` (view công bố, 5.3); **[MC]**; giữ ở B2 |
| L7 | Người được phân bổ thuộc **đúng đơn** của chặng; một người (`passenger_key`) không mở hai lần trên cùng một chặng. | **[CSDL]** trigger so `v_ord_passenger_key.order_id` với `v_ord_leg_key.order_id` + chỉ mục duy nhất `(passenger_key, leg_id) WHERE valid_to_at IS NULL`; **[MC]** |
| L8 | **Giờ sự kiện do máy chủ ghi.** Lệnh tài xế mang `request_id`; gửi lặp trả lại kết quả cũ. | **[CSDL]** UNIQUE; **[MC]** |
| L10 | Không xoá chuyến, phân bổ, sự kiện; huỷ hoặc đóng dòng thay cho xoá. | **[CSDL]** trigger cấm DELETE |

- **Thay câu ADR đã duyệt (nguyên văn → mới):**
  - **ADR-0006 điều 2** (danh sách loại nhiệm vụ `PICKUP`, `DROPOFF`) và **điều 4** ("tài xế đón ở khách sạn") → *"Việc đưa đón bằng **xe đường bộ** là Chuyến xe của phân hệ Vận chuyển; `dsp_assignment` không nhận `PICKUP`/`DROPOFF` mới. `BOAT` và `HANDLE` giữ nguyên."* `PICKUP`/`DROPOFF` hiện chỉ là dòng gieo ở 0014, không có mã dùng (đã tra). Migration đặt hai mã này `active = 0` (bảng `dsp_task_kind` có cột `active`, `migrations/0014`:12); máy chủ từ chối gán mới loại đã ngưng.
  - **ADR-0006 điều 5**, vế "giờ điều xe = `dsp_assignment.scheduled_time` của nhiệm vụ `PICKUP`" → *"= `vc_trip_stop.planned_time` của điểm đón"*. Vế "giờ hẹn khách" đổi nguồn từ `order_service.pickup_*` sang `ord_transfer_leg` (A1).
  - **ADR-0006 điều 7**, vế "đã đón" ở `dsp_assignment.status_code` → với xe đường bộ, *"đã đón" = `vc_trip_allocation.status = BOARDED`*.
- **Cửa một chiều:** tiền tố và bảng `vc_trip*`; tập trạng thái đóng.

### B2. Cổng xuất bến, chính sách, bản chụp, "giữ"

**Chính sách** (dòng có ngày hiệu lực, **chỉ thêm**, khuôn `vc_expiry_policy`; chỉ Toàn quyền, `settings.ops` — C8):
- **`vc_departure_policy`:**
  - `require_manifest` (0/1, mặc định 1 — C7 "thiếu danh sách thì chặn");
  - `require_contract` (0/1, mặc định 0 — xem Q5);
  - `rest_minutes` (khoảng nghỉ; giả định gieo **30 phút**, sửa được);
  - `valid_from_at` UNIQUE.
- **`vc_departure_rule`** — "áp cho xe từ N người trở lên (N = 1 là mọi xe) → bắt buộc loại giấy tờ X còn hạn tới hết chuyến":
  - `min_capacity`;
  - `subject` `CHECK IN ('VEHICLE','DRIVER')`;
  - `vehicle_document_type_code` hoặc `person_document_type_code` (đúng một);
  - `valid_from_at`, `valid_to_at`.
  - Chỉ thêm và đóng hiệu lực, không sửa.
- **`vc_license_capacity`** — "hạng bằng → số khách tối đa không kể lái":
  - `license_class_code` (FK `pty_license_class` — bảng của `parties`; khoá ngoại tới khoá chính là cạnh `van-chuyen → parties` đã có);
  - `max_passengers` (NULL = không giới hạn);
  - `valid_from_at`.
  - Gieo theo bảng tra 27/9: B 8; D1 16; D2 29; D không giới hạn; B2 cũ 8; C cũ 8; D cũ 29; E cũ không giới hạn.
  - **Áp C8:** bảng này là **điều kiện xuất bến** (quyết định ai được lái xe nào), nên thuộc Toàn quyền (`settings.ops`), không thuộc danh mục của Quản trị. Danh mục **hạng** (tên hạng) vẫn do Quản trị sửa như ADR-0040 D2.
- **Sàn cứng trong mã** (không cấu hình tắt được — ra-soát A.10):
  - có xe đang dùng;
  - có đúng một tài xế;
  - tài xế có GPLX hiện hành, còn hạn tới `planned_end`, hạng đủ chở `passenger_capacity` của xe.
  - Chính sách rỗng hoặc hạng lạ → **chặn**, không đoán.
  - Cấm đặt hiệu lực lùi ngày.

**Cổng xuất bến** — một hàm thuần `kiemXuatBen(input) → { dat: boolean, lyDo: LyDoGiu[] }`, dùng chung cho màn điều xe (hiện lý do liên tục) và máy chủ:
1. sàn cứng ở trên;
2. mọi dòng `vc_departure_rule` hiệu lực áp cho xe:
   - giấy tờ xe (dòng hiện hành, còn hạn tới `planned_end`);
   - giấy tờ tài xế (đọc qua **hàm công bố của `parties`**, mở rộng từ `expiringDriverDocuments`: trả loại, hạng, hạn, **không số**);
3. `require_manifest`: mỗi chặng trên chuyến có đủ người được phân bổ = số khách hiệu lực (qua `soKhachHieuLuc`) hoặc `pax_override`, mỗi người có họ tên + năm sinh;
4. không đơn nào trên chuyến đã huỷ (`v_ord_order_flag`);
5. sức chứa (L1, kiểm lại);
6. nghỉ đủ tính từ `ended_ms` thật của chuyến trước (L2b);
7. `require_contract` = 1 → theo Q5.

**Bản chụp** (Hiến chương 5.6; mốc chụp = **lúc xuất bến**):
- **`vc_trip_departure_check`:**
  - một dòng đầu (chuyến, lúc, bản chính sách đã dùng, kết quả);
  - các dòng có kiểu (**không JSON** — 5.2), chụp **giá trị**:
    - biển số, `passenger_capacity`;
    - tài xế (`party_id`) + hạng + hạn GPLX (không số);
    - từng giấy tờ xe (loại, hạn, id dòng);
    - từng điều kiện đã áp (id dòng quy tắc);
    - `rest_minutes` đã dùng.
- **`vc_trip_manifest`** — bản chốt danh sách: mỗi người lúc xuất bến = `allocation_id` + `passenger_row_id` (dòng `ord_passenger` **hiện hành lúc xuất bến**, giải từ `person_key` qua `hanhKhachChoChuyen`; dòng bất biến, A2) hoặc `crew_party_id`.
  - Người thêm sau xuất bến là dòng mới, gắn cờ `added_after_departure`.
  - Không chép họ tên.
- Cả hai bảng chỉ-thêm, trigger cấm sửa và xoá, lưu ít nhất 3 năm.
- **[CSDL]:** trigger chặn `SCHEDULED → DEPARTED` khi không có dòng đầu `vc_trip_departure_check` với kết quả đạt của **chính lần xuất bến đó** (ghi cùng lô, trước câu đổi trạng thái — ra-soát H6).

**Giữ (Hiến chương 5.7, lần áp đầu tiên):**
- Chuyến không đạt cổng thì ở `SCHEDULED` và **hiện rõ lý do + ai phải xử lý**: văn phòng (thiếu tên, đơn huỷ, vượt chỗ), Quản trị (giấy tờ xe, giấy tờ tài xế), Toàn quyền (chính sách rỗng).
- Không có trạng thái "giữ" lưu riêng; giữ = kết quả của `kiemXuatBen` mỗi lần đọc.
- Kiểu `LyDoGiu { ma, loiNhan, aiXuLy }` đặt ở `src/shared/` làm **chỗ sống duy nhất** của khái niệm "giữ" (K9), để phần Hoàn tất dùng lại.

**Ngày giờ:**
- giờ dự kiến nhập theo giờ VN, đổi sang mili-giây bằng **một** hàm có test (ca 00:00–07:00 và qua nửa đêm);
- "còn hạn tới hết chuyến" so `expiry_date` (ngày VN) với **ngày VN của `planned_end_ms`**;
- sự kiện ghi `server_at` UTC.

**Cửa một chiều:** bản chụp và bản chốt danh sách (lưu chứng cứ pháp lý). Chính sách: hai chiều (thêm dòng mới).

### B3. Ô quyền của chuyến, route tài xế, danh sách trường được phép

**Ô mới** (cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER). Giá trị theo **khuyến nghị** của Q1, Q2; chủ chọn khác thì đổi:

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| `trip.view` — xem lịch xe, chuyến | any | any | any | none | none | any | none | **assigned** | DRIVER: chỉ chuyến mình đang lái (phạm vi do `van-chuyen` tự tính từ `vc_trip_driver` — dữ liệu của chính nó, không cần tiêm) |
| `trip.dispatch` — tạo/sửa/huỷ chuyến, xếp xe, tài xế, phân bổ | any | none | any | none | none | any | none | none | Q1 |
| `trip.progress` — xuất bến, đã đón, vắng, điểm xong, kết thúc (thường, gián đoạn) | any | none | any | none | none | any | none | **assigned** | Q2. Văn phòng bấm thay có ghi nhật ký |
| `trip.passenger.add` — bổ sung, thay tên tại chỗ; báo thêm người | any | none | any | none | none | any | none | **assigned** | C7. Ghi `ord_passenger` bằng câu do `orders` cấp, `source='DRIVER'` |
| cấu hình chính sách (B2) | — | — | — | — | — | — | — | — | dùng ô **`settings.ops`** có sẵn (chỉ Toàn quyền), không thêm ô |

- **Sửa ADR-0040 D3 (nguyên văn → mới):** *"Lượt 1b: mở ô 'xem cuốc xe của mình'"* → *"Lượt 1b: mở `trip.view` (assigned), `trip.passenger.add` (assigned) và — theo Q2 — `trip.progress` (assigned)"*.
- **Đây là NỚI hàng rào đã ghim** (Điều 9.4): bài ghim cả hàng `DRIVER` trong `src/shared/permissions.test.ts` phải đổi. Việc này cần chủ duyệt, và đi kèm một dòng mới ở `docs/SO-HANG-RAO.md` (bài ghim hàng `DRIVER` mới: đúng ba ô `assigned`, còn lại `none`).
- **Tài xế thêm người vượt số khách** (C7 "thêm người thì báo văn phòng"):
  - máy chủ **không** cho số tên vượt số khách hiệu lực;
  - tài xế bấm "Báo thêm khách" → sự kiện `EXTRA_PAX` (chỉ số lượng) hiện ở màn điều xe;
  - văn phòng tăng số khách bằng đường sửa đơn hiện có, rồi tài xế (hoặc văn phòng) nhập tên.
  - Sức chứa L1 vẫn chặn ở CSDL.
  - Thông báo đẩy cho văn phòng để lượt 2 (C1: thông báo thuộc lượt 2).

**Cổng:**
- Route văn phòng ở cổng **`office`** (`OFFICE_GATE` không có `DRIVER`, không có `FIELD`).
- Route tài xế ở cổng **`staff`**, thân hỏi `can(staff, "trip.…", { assigned })` **trước** mọi truy vấn khác, theo tiền lệ `GET /api/parties/documents/mine`.
- `DRIVER` vẫn không vào cổng `office`, `orders`, `admin`; bài `cong-quyen.test.ts:74` giữ nguyên.

**Route chính:**
- Văn phòng:
  - `GET /api/van-chuyen/lich?ngay=` — chặng chưa xếp + chuyến của ngày D;
  - `POST /api/van-chuyen/chuyen`;
  - `PUT /api/van-chuyen/chuyen/:id` (kèm `version`);
  - `POST /api/van-chuyen/chuyen/:id/phan-bo`;
  - `POST /api/van-chuyen/chuyen/:id/rut`;
  - `POST /api/van-chuyen/chuyen/:id/huy`;
  - `GET /api/van-chuyen/chuyen/:id` (kèm lý do giữ).
- Chính sách (`settings.ops`): `GET/POST /api/van-chuyen/dieu-kien`, `/api/van-chuyen/hang-bang`.
- Tài xế:
  - `GET /api/van-chuyen/cuoc-cua-toi?tu=&den=`;
  - `GET /api/van-chuyen/cuoc-cua-toi/:id`;
  - `POST …/xuat-ben`, `…/phan-bo/:aid/don`, `…/phan-bo/:aid/vang`, `…/diem/:sid/xong`, `…/ket-thuc`, `…/khach`, `…/bao-them-khach`.
  - Mọi lệnh mang `request_id`.
- **Chuyến không phải của mình → 404**, không phải 403, để không lộ chuyến có tồn tại (chống đổi id, IDOR).

**DTO danh sách trường được phép cho tài xế** (Hiến chương 4.4; khuôn `pool.ts`: dựng mới từng khoá, không trải đối tượng):
- được phép: biển số, giờ dự kiến, điểm dừng (tên nơi; nơi chữ tự do che dãy số), mã đơn, số người mỗi điểm, họ tên + năm sinh của người trên chuyến, trạng thái từng người;
- SĐT người liên hệ: theo **Q3**;
- **không có:** tiền, dịch vụ khác của đơn, ghi chú đơn, người lập, người phụ trách.
- **Hạn xem tên:** hết ngày VN của `ended_ms`. Sau đó tài xế chỉ còn thấy số người (ra-soát A.4).

**Hàng đợi ngoại tuyến:** 1b **không** làm. Mất sóng thì lệnh báo lỗi, tài xế bấm lại cùng `request_id`. Service worker vẫn không cache `/api/*` (luật hiện có).

### 4.4 Lệch có chủ ý 5.1 của lượt 2 (khuôn ADR-0029)

- **L-B1 — đủ tên so với số khách hiệu lực.**
  - **Vì sao chỉ ở mã:** số khách nằm trong JSON của `orders`; trigger `vc_` không đọc được.
  - **Lớp đã có:** máy chủ (`kiemXuatBen`); trigger bắt buộc có dòng chụp đạt; câu kiểm định kỳ "chuyến đã xuất bến mà bản chốt ít người hơn số khách hiệu lực".
  - **Điều kiện gỡ:** số khách hiệu lực thành cột có kiểu.
- **L-B2 — hạng và hạn GPLX của tài xế.**
  - **Vì sao chỉ ở mã:** Phần II quy tắc 4 cấm view mang hạng hoặc hạn (chỉ khoá + nhãn + cờ). ADR-0040 D1 đã chọn hàm công bố thay vì view.
  - **Lớp đã có:** máy chủ lúc xếp tài xế và lúc xuất bến; bản chụp lưu giá trị đã dùng; câu kiểm định kỳ "chuyến trong 48 giờ tới hoặc đang chạy có tài xế không đạt".
  - **Điều kiện gỡ:** một view cờ `v_pty_driver_eligible(party_id, license_class_code, valid_until)`, nếu chủ duyệt nới quy tắc 4 cho đúng trường hợp này. **Không** đề xuất ở 1b.
- **Không lệch:** sức chứa (L1), trùng giờ và nghỉ (L2, L2b), trạng thái chỉ đi tiến, không xoá, "chỉ đơn đã xác nhận" và "đúng đơn" (L6, L7 — qua view khoá + cờ). Tất cả có lớp CSDL.

### 4.5 Trang ghép — lượt duyệt 2

| Hỏi | Trả lời |
|---|---|
| **(1) Bảng nào chứa loại thực thể nào?** | `vc_trip`: chuyến (một chiều). `vc_trip_driver`: ai lái, có hiệu lực. `vc_trip_stop`: điểm dừng. `vc_trip_allocation`: **hai loại dòng** — hành khách (trỏ `person_key` của `ord_passenger` + `ord_transfer_leg`) **và** người đi kèm (trỏ `pty_party`: HDV, phụ xe); `CHECK` đúng một loại. `vc_trip_event`: sự kiện, chỉ-thêm, chỉ số lượng. `vc_trip_departure_check`, `vc_trip_manifest`: bản chụp, chỉ-thêm, 3 năm. `vc_departure_policy`, `vc_departure_rule`, `vc_license_capacity`: chính sách có hiệu lực. Bảng tra cứu lý do huỷ, lý do bỏ điểm. `ord_passenger` (bảng lượt 1): nhận thêm loại dòng `source='DRIVER'` (cùng thực thể, khác người nhập). `audit_log`: hành động `trip_*`, chỉ số lượng, không tên, năm sinh, số giấy tờ. |
| **(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào?** | `trip.dispatch` → `vc_trip`, `vc_trip_driver`, `vc_trip_stop`, `vc_trip_allocation` (cả hai loại dòng). `trip.progress` → `vc_trip.status`, `vc_trip_stop.status`, `vc_trip_allocation.status`, `vc_trip_event`, và **ghi** `vc_trip_departure_check` + `vc_trip_manifest` (xuất bến). `trip.passenger.add` → `ord_passenger` (chỉ đơn có chặng trên chuyến mình lái, chỉ trong ngày chuyến) + `vc_trip_allocation` (dòng hành khách của chính chuyến) + `vc_trip_event` (`EXTRA_PAX`). `trip.view` → đọc mọi bảng `vc_trip*`; DRIVER qua DTO hẹp. `settings.ops` → ba bảng chính sách. `vehicle.manage` (1a) → không đổi, **không** mở chuyến. `party.document.*` (1a) → không đổi; cổng xuất bến đọc giấy tờ qua hàm công bố, không qua ô. `contact.view` → không cho tài xế; SĐT theo Q3 là **ngoại lệ có tên** trong DTO. |
| **(3) Cổng nào canh cửa nào?** | Cổng `office`: route điều xe, lịch, chính sách (thân hỏi `trip.*` / `settings.ops`). Cổng `staff`: route tài xế (thân hỏi `trip.*` với `assigned`; ngoài phạm vi → 404). Cổng `orders`: không route mới ở lượt 2. **Cổng dữ liệu (CSDL):** L1, L2, L2b, L6, L10, trigger "không xuất bến khi thiếu dòng chụp đạt", trigger chỉ-thêm của bản chụp. **Cổng pháp lý:** `kiemXuatBen` (một hàm, máy chủ + màn hình). |

---

## 5. Câu hỏi cho chủ — gom một lần, lời thường

Chỉ gồm những điều vượt khung các quyết định ở §0. Mỗi câu có một khuyến nghị.

**Q1. Ai được xếp xe (tạo chuyến, chọn xe, tài xế, đưa khách lên chuyến), và ai được xem lịch xe?**
- (a) **Khuyến nghị:** Kinh doanh, Quản trị, Toàn quyền được xếp xe; Kế toán chỉ xem. Hướng dẫn viên và Đối tác không thấy lịch xe.
- (b) Chỉ Quản trị và Toàn quyền xếp xe; Kinh doanh, Kế toán chỉ xem.
- (c) Như (a), thêm: hướng dẫn viên đang phụ trách đơn thấy xe nào, tài xế nào đón khách của đơn mình (chỉ biển số, tên tài xế, giờ).

**Q2. Trên điện thoại, tài xế có tự bấm "Xuất bến", "Đã đón", "Khách vắng", "Kết thúc chuyến" không?** (Chủ đã duyệt 1b là "tài xế xem cuốc"; bấm là thêm quyền ghi.)
- (a) **Khuyến nghị:** Có. Giờ ghi theo máy chủ; văn phòng bấm thay được khi tài xế không bấm, có ghi lại ai bấm. Được: biết ngay xe đã chạy hay chưa, đã đón ai. Mất: tài xế có thêm quyền ghi.
- (b) Không. Chỉ văn phòng bấm; tài xế chỉ xem cuốc và bổ sung tên khách. Được: ít quyền cho tài xế. Mất: văn phòng phải gọi hỏi từng xe.

**Q3. Tài xế có thấy số điện thoại người liên hệ của đơn để gọi khách lúc đón không?**
- (a) **Khuyến nghị:** Có, nhưng chỉ trong ngày của chuyến, chỉ với đơn có khách trên chuyến mình lái; hết ngày thì ẩn.
- (b) Không. Tài xế gọi văn phòng, văn phòng gọi khách.

**Q4. Ô "giờ đón / nơi đón" hiện có trên từng dịch vụ của đơn xử lý thế nào khi có "chặng đưa đón" (có chiều đi, chiều về, nơi trả, ngày đón riêng)?**
- (a) **Khuyến nghị:** Chặng thay hẳn hai ô cũ. Đơn cũ được máy chuyển sang tự động. Màn lập đơn, biên nhận, hàng chờ nhận của hướng dẫn viên đều đọc chặng. Được: một chỗ ghi, không lệch. Mất: việc lớn nhất của lượt này, làm trong hai lần phát hành.
- (b) Gọn hơn: giờ đón và nơi đón **chiều đi** vẫn ở ô cũ của dịch vụ như hôm nay; "chặng" chỉ ghi phần mới (nơi trả, ngày đón nếu khác ngày đi, và chiều về). Được: ít màn phải sửa, làm trong một lần phát hành. Mất: một lịch đưa đón nằm hai chỗ (chiều đi ở dịch vụ, chiều về ở chặng); máy xếp xe phải đọc cả hai, về sau khó gộp.
- (c) Giữ song song: ô cũ là "giờ hẹn khách", chặng chép lại cho dịch vụ có xe công ty đón. Nhanh nhất, nhưng cùng một giờ đón nằm hai chỗ và dễ lệch (trái nguyên tắc "một nguồn"). Không khuyến nghị.

**Q5. "Hợp đồng vận chuyển" của chuyến (luật đòi với xe hợp đồng) làm lúc nào?**
- (a) **Khuyến nghị:** Lượt 1b chưa làm. Công tắc "phải có hợp đồng" để tắt, máy không cho bật tới khi có lượt riêng làm hợp đồng (có số, bên thuê, điểm được phép). Được: 1b gọn. Mất: tạm thời máy chưa kiểm hợp đồng.
- (b) Làm luôn trong 1b bản đơn giản (số hợp đồng + bên thuê + ngày). Thêm một quyết định dữ liệu nên phải thêm một lượt duyệt thứ ba.

**Q6. Chiều về có thể ít người hơn chiều đi không** (vd 2 khách ở lại đảo)?
- (a) **Khuyến nghị:** Có. Mỗi chặng mặc định "mọi khách của dịch vụ"; văn phòng sửa được số người của riêng chặng đó, không vượt số khách của đơn.
- (b) Không. Chặng luôn bằng số khách của dịch vụ; ai không về xe thì báo "vắng mặt" lúc đón.

---

## 6. Phụ thuộc

### 6.1 1b cần gì trước

| Cần | Từ đâu | Trạng thái 2026-09-28 |
|---|---|---|
| Tiền tố `ord_` + khoá danh sách `legacy` (T3b) | ADR-0031 (chưa soạn) **hoặc** A3 | chưa có |
| Hàm "số khách hiệu lực" | Kế hoạch dọn nền T1 (chưa có tệp) **hoặc** A3 | chưa có |
| Chặng đưa đón, danh sách hành khách | A1, A2 | chưa có |
| Tour Đảo là hồ sơ (chủ xe) | T2b | **đã lên production** (1.34) |
| Xe, giấy tờ xe, giấy tờ người, vai và quyền `DRIVER` | ADR-0040 (1a) | **đã lên production** (1.35) |
| Hàm công bố giấy tờ tài xế theo người (không số) | `parties` — mở rộng `expiringDriverDocuments` | phải thêm hàm "giấy tờ hiện hành của một tài xế" (lát T2) |
| `loc_location` có loại khách sạn, sân bay, ga cáp treo | A1 (migration `0034`) | chưa có |
| Đơn nào sửa `orders` song song | nhánh ADR-0030 / Đơn tự do (ADR-0031, 0032 dự kiến) cùng sửa `orders/repository.ts` | kiểm lúc thi công; A1/A2 đụng `updateDraftOrder` |

**Nợ từ 1a mang sang (không phải quyết định mới, ghi theo R23 nhật ký 1a):**
- `warnDays` cho giấy tờ người (cần móc tiêm từ gốc lắp ráp vì `parties` không đọc `vc_`);
- `documentCount` của xe;
- giao diện đổi mốc "sắp hết hạn" (route `POST /api/van-chuyen/nguong-het-han` đã có).

### 6.2 Lượt 2 và lượt 3 sẽ dựa vào gì của 1b

- **Lượt 2** (nhà xe đối tác, tài xế đối tác có tài khoản, báo bận, từ chối chuyến, thông báo):
  - dùng lại `vc_trip`, `vc_trip_driver` (có hiệu lực — đổi tài xế không mất lịch sử), máy trạng thái, cổng xuất bến, bản chụp;
  - ô `trip.*` thêm cột hoặc phạm vi cho tài xế đối tác;
  - phải sửa LC-1 (ADR-0018) và định nghĩa "nội bộ" của thông báo (ADR-0034 điều 6);
  - L2 (trùng giờ) mở rộng cho "khung không sẵn sàng" dùng chung cho xe và người;
  - sự kiện `EXTRA_PAX` của 1b là nguồn cho thông báo văn phòng;
  - hàng rào Bảng tin hôm nay chỉ thấy `/api/orders*`, phải mở cho `/api/van-chuyen/*`.
- **Lượt 3** (giá thuê, chi phí, công nợ nhà xe):
  - dựa vào bản chụp xuất bến: xe, chủ xe, số chỗ, giờ thật `departed_ms`/`ended_ms`;
  - dựa vào sự kiện kết thúc (thường, gián đoạn) và lý do huỷ chuyến (mốc huỷ).
  - 1b **đã** chụp chủ xe (`owner_party_id`) và loại kết thúc để lượt 3 có nguồn (ra-soát C10).
  - Không tính tiền ở 1b.

---

## 7. Chia lát thi công và tiêu chí nghiệm thu (kiểm bằng máy)

Mọi lát:
- viết test **đỏ trước, xanh sau**;
- chạy `npm test` + `npm run typecheck` (0 lỗi);
- lát chạm API hoặc migration chạy thêm `npm run test:e2e`;
- mỗi hàng rào mới có dòng `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên);
- là việc lớn, nên có người kiểm độc lập ở cuối mỗi lượt.

| Lát | Nội dung | Phụ thuộc | Song song? | Tiêu chí nghiệm thu (máy) |
|---|---|---|---|---|
| **T0** | `ord_` vào `TABLE_PREFIX` + khoá danh sách `legacy`; hàm `soKhachHieuLuc` công bố | lượt duyệt 1 | **song song với T2** | `node --test src/architecture.test.ts`: thêm bảng `order_x` không tiền tố → đỏ. `orders/soKhachHieuLuc.test.ts`: đơn có 2 dòng điều chỉnh → trả số của dòng gần nhất; `after_json` hỏng → số đã lưu. Quét mã: `grep -rn "after_json\|order_money_adjustment" src/modules --include=*.ts` ngoài `orders/` = 0 (thành bài kiểm). |
| **T1** | Migration `0034`: `ord_transfer_leg`, `ord_passenger`, `v_ord_order_flag`, ba loại điểm; route chặng và hành khách; chuyển dữ liệu đón cũ (theo Q4) | T0 | không | Test SQL (node:sqlite): xoá chặng hoặc hành khách của đơn đã xác nhận → `RAISE`; `UPDATE full_name` → `RAISE`; hai dòng thay thế cùng `previous_id` → UNIQUE; dòng thay thế mang `person_key` khác dòng trước → `RAISE`; xoá chặng đã xác nhận → `RAISE`, đóng chặng (`closed_at`) → được. e2e: lưu nháp hai lần giữ đủ chặng và khách; `GET passengers` với tài khoản chỉ-`DRIVER` → 403 (cổng `orders`). Bài "nhật ký không tên": dựng lệnh thêm khách "Nguyễn Văn A 1990" → mọi `audit_log.detail` không chứa "Nguyễn" hay "1990". `node scripts/audit-invariants.mjs --db local` thoát 0. `docs/data-dictionary.json` + `npm run dict`. |
| **T2** | Migration `0035`: ba bảng chính sách + gieo; route `settings.ops`; hàm công bố giấy tờ hiện hành của tài xế ở `parties` | lượt duyệt 2 (bảng `vc_` không cần `ord_`) | **song song với T0/T1** | Test SQL: `UPDATE`/`DELETE` chính sách → `RAISE`. Route: tài khoản Quản trị `POST /api/van-chuyen/dieu-kien` → 403; Toàn quyền → 201. Hiệu lực lùi ngày → 400. Hàm `parties` trả đối tượng **không** có khoá `number`, `numberKey`, `issuedPlace` (test liệt kê khoá). |
| **T3** | Migration `0036`: `vc_trip*`, trigger L1, L2, L2b, L6, L10, trigger xuất bến cần dòng chụp; hàm thuần `lichXe` (trùng giờ, nghỉ), `kiemXuatBen`, `LyDoGiu`; hàm giờ VN → mili-giây | T1, T2 | không | Test SQL: phân bổ người thứ (sức chứa + 1) → `RAISE`; hai chuyến cùng xe cách nhau < nghỉ → `RAISE`; `SCHEDULED → DEPARTED` không có dòng chụp → `RAISE`; `ENDED → SCHEDULED` → `RAISE`; phân bổ khách của đơn nháp hoặc đã huỷ → `RAISE`. `kiemXuatBen.test.ts`: bảng ca (thiếu tên, GPLX hết hạn trước `planned_end`, hạng B với xe 15 chỗ, chính sách rỗng, đơn đã huỷ) → đúng mã lý do. Giờ: `22:30` VN ngày D → mili-giây đúng; chuyến 23:00→01:00 hợp lệ; > 24 giờ → `RAISE`. |
| **T4** | Route văn phòng: lịch ngày D, tạo/sửa/huỷ chuyến, phân bổ, rút, xuất bến bấm thay; nhật ký cùng lô | T3 | **song song với T5** | e2e `van-chuyen-dieu-xe`: tạo chuyến → phân bổ đủ → xuất bến 200 + có dòng `vc_trip_departure_check`, `vc_trip_manifest`; thiếu tên → 409 kèm mã lý do; hai người sửa cùng `version` → một 409 `stale`. Kế toán `POST /chuyen` → 403 (theo Q1). |
| **T5** | Ô `trip.*` trong `MATRIX` + bài ghim hàng `DRIVER` mới; route tài xế; DTO danh sách trắng; hạn xem tên; `request_id` | T3 | **song song với T4** | `permissions.test.ts`: hàng `DRIVER` = đúng ba ô `assigned`, còn lại `none` (sửa cố ý → đỏ). `cong-quyen.test.ts:74` vẫn xanh. e2e `van-chuyen-tai-xe`: tài xế A `GET` chuyến của tài xế B → **404**; lệnh `don` gửi hai lần cùng `request_id` → một sự kiện; thêm tên vượt số khách → 409; `bao-them-khach` → sự kiện `EXTRA_PAX` không tên. `tai-xe-dto.test.ts`: đối tượng nguồn có tiền, ghi chú, SĐT → DTO không có các khoá đó (trừ SĐT nếu Q3 = a). Hết ngày `ended_ms` → DTO không còn `fullName`. |
| **T6** | Câu kiểm định kỳ (`scripts/audit-checks.mjs`): khách bị bỏ quên (chặng của đơn đã xác nhận chưa lên chuyến trước N giờ), chuyến 48 giờ tới không đạt, bản chốt ít hơn số khách hiệu lực (L-A1, L-B1, L-B2); sổ hàng rào; `SYSTEM-DESIGN.md`, `CHANGE-GUIDE.md` | T4, T5 | không | `node scripts/audit-invariants.mjs --db local` trên dữ liệu gieo lỗi cố ý → thoát 1, đúng mã; dữ liệu sạch → thoát 0. |
| **T7** | Giao diện theo bản vẽ Claude Design của chủ: màn "Lịch xe ngày D", chặng + hành khách trong form đơn, "Cuốc của tôi" của tài xế | T4, T5 + bản vẽ | phần form đơn làm được ngay sau T1 | Kịch bản Chrome từng màn (khuôn `web/CLAUDE.md`); ảnh bằng chứng ở `docs/evidence/`; tài khoản chỉ-`DRIVER` không thấy mục menu văn phòng. |

**Ước lượng:** 8 lát (T0–T7).
- Song song được: **T0 ∥ T2**, **T4 ∥ T5**. Phần form đơn của T7 có thể đi sớm sau T1.
- Đường găng: T0 → T1 → T3 → T4/T5 → T6 → T7.
- Lượt phát hành đề xuất:
  - **P1** = T0 + T1 (phía `orders`, cùng lần 1 của expand–contract Q4);
  - **P2** = T2 → T6 + phần máy chủ;
  - **P3** = T7 giao diện + lần 2 của expand–contract (ngừng ghi hai cột đón cũ).

---

## 8. Tự rà — chỗ mơ hồ, chỗ đụng ADR đã duyệt

**Đụng ADR đã duyệt** (nêu ra, **không** tự sửa; ADR mới ghi "nguyên văn → mới"):
1. **ADR-0001:42**: mở lại danh sách hành khách (A2).
2. **ADR-0002 điều 2**: thêm tiền tố `ord_`, **chỉ khi** ADR-0031 chưa mang nó (A3). Thêm cạnh `van-chuyen → orders` (B, bổ sung đồ thị).
3. **ADR-0006 điều 2, 4, 5, 7**: xe đường bộ chuyển sang Chuyến (B1). Điều 6 (cờ "có hẹn đón") được **thực hiện** bằng dòng chặng, không thay.
4. **ADR-0040 D3**: 1b mở thêm quyền ghi cho tài xế ngoài "xem cuốc" (B3). Đồng thời **nới** bài ghim hàng `DRIVER` (Điều 9.4, cần chủ duyệt).
5. **ADR-0019:61** (`task.progress`): **không** đổi; chuyến dùng ô mới (§3.3).
6. **ADR-0021** (một ngày cho cả đơn): không đụng. Ngày đón của chặng là ngày **hẹn đón**, không phải ngày khởi hành dịch vụ; chủ đã quyết "chặng có ngày riêng" (C6). ADR-A nên ghi một dòng làm rõ để người đọc ADR-0021 không hiểu nhầm.
7. **ADR-0024** (proposed): không chiếm tên `v_ord_order_state`; dùng `v_ord_order_flag` (A3). Đây là lựa chọn của người soạn, ghi rõ để người duyệt ADR-0024 biết.

**Chỗ mơ hồ, đã chọn giả định (ghi lại, người kiểm nên soi):**
- **G1.** "Đủ tên lúc xuất bến" (C11) và "tài xế bổ sung lúc đón" (C7): xe xuất bến ở bãi rồi mới tới khách sạn. Người soạn hiểu "bổ sung lúc đón" = **sửa, thay người** (dòng mới thay dòng cũ) và **thêm người phát sinh sau khi văn phòng tăng số khách**. Danh sách phải đủ cho số khách đã đặt **trước** khi xuất bến. Hiểu khác (chỉ cần đủ lúc đón) sẽ làm hỏng luật "thiếu danh sách thì chặn xuất bến" nên không chọn.
- **G2.** Bảng hạng → số khách thuộc Toàn quyền (`settings.ops`), vì nó là điều kiện xuất bến (C8). Tên hạng vẫn do Quản trị sửa (ADR-0040 D2).
- **G3.** Khoảng nghỉ gieo mặc định 30 phút (sửa được).
- **G4.** Sức chứa tính **tổng cả chuyến**, không theo đoạn (C6 nói "tổng số người"). Chặt hơn và giữ được ở CSDL. Chuyến trả rồi đón thêm giữa đường phải tách hai chuyến.
- **G5.** Trẻ sơ sinh (`infant`) tính một chỗ (quy định 27/9: "trẻ em mỗi em một người"). Số khách hiệu lực đã gồm cả bốn loại.
- **G6.** Người đi kèm (HDV, phụ xe) trên chuyến do văn phòng thêm; họ là hồ sơ (`pty_party`), không vào danh sách hành khách của đơn.
- **G7.** Trạng thái "giữ" không lưu riêng; tính lại mỗi lần đọc (5.7 không đòi lưu). Nếu Hoàn tất cần lưu thì ADR đó quyết.
- **G8.** Thông báo đẩy cho tài xế và văn phòng thuộc lượt 2 (C1). 1b chỉ ghi sự kiện và hiện trên màn.

**Rủi ro:**
- A1 + Q4(a) đụng khoảng 20 tệp đang đọc hai cột đón cũ, kể cả biên nhận và hàng chờ HDV. Dễ đụng nhánh ADR-0030 / Đơn tự do đang sửa `orders`.
- Pháp lý "ghép khách nhiều đơn vào một xe hợp đồng" (NĐ 158/2024 Đ7k3) chưa có người chuyên môn xác nhận (thiết kế §9). App vẫn hỗ trợ; Q5 để công tắc hợp đồng tắt.
- Lưu 3 năm: D1 Time Travel chỉ giữ khoảng 30 ngày. Cần xuất bản sao định kỳ, **để sau** (ra-soát A.4), ghi vào `docs/BACKLOG.md` khi duyệt.

**Số ADR — cảnh báo trùng:** `docs/adr/README.md` (trên nhánh này) ghi "số kế tiếp là 0046", nhưng nhánh `thong-bao-tat-dung-may` đã dùng **ADR-0046** (commit `88b09db`). Lúc duyệt phải chọn số sau mọi số đã dùng trên mọi nhánh, không lấy theo README.

**Chưa kiểm:**
- production (trạng thái D1 remote, đã có tài khoản tài xế nào chưa);
- tệp migration chưa commit ở các worktree khác;
- chưa chạy `npm test` (tài liệu thuần, không đổi mã);
- đề xuất này **chưa có người kiểm độc lập**.
