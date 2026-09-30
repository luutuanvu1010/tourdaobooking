# ADR-0047 — Chặng đưa đón và danh sách hành khách trên đơn; số khách hiệu lực công bố; tiền tố `ord_` (Vận chuyển 1b, lượt duyệt 1)

- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, 2026-09-28 khuya. **Bổ sung bởi ADR-0055** (duyệt 2026-09-30): `ord_transfer_leg` thêm `flight_code`. **Bổ sung bởi ADR-0056** (duyệt 2026-09-30): `ord_transfer_leg` thêm `exclusive_vehicle`, `min_vehicle_seats`; `hanhKhachChoChuyen` thêm hai cờ đó. **Bổ sung bởi ADR-0054** (duyệt 2026-09-30): chặng về có `pax_override` (≥ 1, chỉ văn phòng ghi, kể cả đơn nháp); form đơn tạo sẵn chặng theo mẫu dịch vụ (`vc_leg_template`).
  - Lượt duyệt 1 của đề xuất 1b (A1, A2, A3): nguyên văn **"Duyệt"**.
  - Q4 (ô giờ đón / nơi đón cũ): nguyên văn **"Chặng thay hẳn ô cũ"** — phương án (a), đã áp vào điều A1.
  - Nguồn: `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-1b.md` §3 (bản ở commit `17071b3`). Đề xuất đó **chưa qua người kiểm độc lập**.
  - Q1, Q2, Q3, Q5, Q6 thuộc lượt duyệt 2 (ADR Vận chuyển 1b phần chuyến xe), **chưa quyết**. Các chỗ ở đây phụ thuộc chúng đều ghi "chờ lượt 2".
- **Ngày:** 2026-09-28.
- **Loại:**
  - **một chiều:** tiền tố bảng `ord_` và chủ sở hữu bảng; bảng `ord_*` và dữ liệu cá nhân của khách (họ tên, năm sinh) đã lưu; tập đóng `direction`, `source`; bỏ hai cột đón cũ ở lần phát hành 2;
  - **hai chiều:** ô quyền, hàm và view công bố, màn hình.
- **Hiến chương áp** (`docs/ARCHITECTURE.md` Phần I, đã duyệt):
  - 2.1 (khách lẻ trong đoàn vẫn không phải hồ sơ);
  - 2.2 (chặng và hành khách là Thực thể);
  - 5.1 (lệch hẹp, điều L-A1);
  - 5.3 (trigger chỉ đọc bảng cùng module hoặc view công bố; module khác đọc qua view/hàm công bố);
  - 5.4 (một nguồn — áp cho số khách hiệu lực);
  - 5.5 (không xoá cứng sau xác nhận);
  - 5.12 (nhật ký không tên, không năm sinh);
  - 5.13 (nền trước — ADR này là nền của phần chuyến xe);
  - 6.3 (không thêm lệch cùng loại — câu SQL mới).
- **Liên quan:**
  - **ADR-0001** mục 7 và dòng 42 (danh sách khách đã loại): **mở lại**, xem "Câu ADR bị thay".
  - **ADR-0002** điều 2 (tiền tố bảng): **bổ sung** `ord_` (chủ đã chốt Q-AA 2026-09-26; ADR-0031 dự kiến mang nó nhưng chưa soạn, nên ADR này mang).
  - **ADR-0006** điều 5, 6: điều 5 đổi nguồn "giờ hẹn khách"; điều 6 (cờ "có hẹn đón") được **thực hiện**.
  - **ADR-0019** (bản đồ quyền là nguồn duy nhất): thêm ô `order.passenger.write`; ghi rõ nghĩa mở rộng của `contact.view`.
  - **ADR-0021** (một ngày cho cả đơn): không đổi. Ngày đón của chặng là ngày **hẹn đón**, không phải ngày khởi hành dịch vụ.
  - **ADR-0024** (điều 1–5 proposed, đề xuất `v_ord_order_state`): ADR này **không** dùng tên đó; view mới mang tên khác.
  - **ADR-0040** (Vận chuyển 1a): không đổi.
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` rỗng (kiểm 2026-09-28).

## Bối cảnh

Phần điều xe và chuyến xe của Vận chuyển (lượt 1b) đứng trên ba nền của `orders` còn thiếu (rà soát 2026-09-27 §1; tra mã 2026-09-28):
1. không có hàm công bố "số khách hiệu lực" — số khách sau khi sửa nằm trong `order_money_adjustment.after_json`, chỉ `orders` đọc được;
2. không có tiền tố bảng `ord_` (`TABLE_PREFIX` ở `src/architecture.test.ts`);
3. nhu cầu đưa đón chỉ là hai ô chữ `order_service.pickup_time` / `pickup_place` — không nơi trả, không chiều về, không ngày đón riêng, không cờ "có hẹn đón".

Chủ đã quyết (2026-09-27/28):
- lịch đón gắn vào đơn;
- danh sách hành khách (họ tên + năm sinh) là dòng nhẹ của đơn, không phải hồ sơ Bên;
- chặng có ngày và giờ hẹn riêng;
- đưa đón vừa là dịch vụ **độc lập** vừa là **thành phần** của dịch vụ khác, phục vụ bằng **một** khái niệm.

## Quyết định

### A1. Chặng đưa đón (`ord_transfer_leg`) — nguồn duy nhất cho "hẹn đưa, đón khách"

- **Bảng** `ord_transfer_leg`, module `orders`. Mỗi dòng là **một lần hẹn đưa hoặc đón khách của một dòng dịch vụ**.

  | Cột | Kiểu, ràng buộc | Nghĩa |
  |---|---|---|
  | `id` | TEXT PK | |
  | `order_id` | FK `orders` | |
  | `order_service_id` | FK `order_service`, `NO ACTION`, **bắt buộc** | dịch vụ mà chặng phục vụ |
  | `direction` | `CHECK IN ('OUT','RETURN')`, tập đóng | chiều đi / chiều về |
  | `pickup_date` | TEXT `YYYY-MM-DD`, giờ VN | ngày đón riêng (vd bay 00:40 thì đón 22:30 hôm trước) |
  | `pickup_time` | TEXT `HH:MM`; NULL = có hẹn nhưng chưa chốt giờ | giờ hẹn đón |
  | `pickup_location_id` / `pickup_place` | FK `loc_location` / TEXT, đúng một có giá trị | nơi đón |
  | `dropoff_location_id` / `dropoff_place` | FK `loc_location` / TEXT, **tối đa** một có giá trị; cả hai trống = nơi trả chưa chốt | nơi trả (trống được, để chép dữ liệu cũ không có nơi trả; cổng xuất bến ở lượt 2 đòi có) |
  | `closed_at`, `close_reason_code` | NULL = còn hiệu lực | bỏ chặng sau xác nhận = đóng dòng |
  | cột dấu vết, `updated_at` | | khoá lạc quan |

  - Khách sạn, sân bay, ga, bến dùng `loc_location`; nhà riêng giữ chữ (dữ liệu cá nhân).
  - **Số người của riêng chặng** (`pax_override`, chiều về ít người hơn): **chờ lượt 2** (Q6). Nếu chọn thì thêm bằng cột mới, chỉ thêm. Tới lúc đó số người của chặng = số khách hiệu lực của chính dịch vụ đó.
- **Một khái niệm cho cả hai trường hợp.** Chặng **luôn** gắn đúng một dòng dịch vụ. Không có bảng, route hay luật riêng cho "đưa đón độc lập".
  - **Thành phần:** dịch vụ "Vé Hòn Tằm" mang 1 chặng (khách sạn → cảng) hoặc 2 chặng (thêm cảng → khách sạn).
  - **Độc lập:** đơn chỉ có một dịch vụ "Đưa đón sân bay" — một mã danh mục như mọi dịch vụ khác, có giá riêng — mang 1 hoặc 2 chặng. Đơn này đi đúng đường lập, xác nhận, sửa, huỷ của mọi đơn.
  - Máy không rẽ nhánh theo loại dịch vụ. Chặng **không mang tiền**; giá đưa đón do danh mục quyết.
- **Có dòng chặng còn hiệu lực = "có hẹn đón"** (thực hiện ADR-0006 điều 6). Không thêm cột cờ trên `order_service`.
- **Chặng thay hẳn hai ô cũ** `order_service.pickup_time` / `pickup_place` (chủ chọn Q4 = (a)). Expand–contract hai lần phát hành:
  - **Lần 1:** thêm bảng; migration chép mỗi dịch vụ có giờ hoặc nơi đón cũ thành một chặng chiều đi (`pickup_date` = ngày khởi hành của dịch vụ; nơi đón chữ giữ nguyên; nơi trả = nơi check-in của dịch vụ nếu có, không thì để trống và gắn cờ cho văn phòng bổ sung). Mọi nơi đọc (form đơn, chi tiết đơn, biên nhận, hàng chờ HDV `pool.ts`, Trang chủ) chuyển sang đọc chặng. Mọi nơi ghi ghi chặng.
  - **Lần 2:** ngừng ghi hai cột cũ; đưa vào `deprecatedColumns`; bài kiểm "không mã nào đọc `pickup_time`/`pickup_place` của `order_service`".
  - Cách chép dữ liệu nơi trả còn trống là chi tiết của kế hoạch thi công, không đổi quyết định này.
- **Hai giờ, hai chỗ (giữ ADR-0006 điều 5):** giờ, nơi **hẹn với khách** nằm ở chặng (`orders`); giờ, nơi **xe tới thực tế** nằm ở điểm dừng của chuyến (`van-chuyen`, lượt 2). Không chép qua lại.
- **Danh mục điểm:** thêm loại `HOTEL` (khách sạn), `AIRPORT` (sân bay), `CABLE_CAR` (ga cáp treo) vào `loc_location_type` bằng migration (chỉ thêm).
- **Lưu nháp:** lưu nháp hôm nay xoá rồi chèn lại dịch vụ (`orders/repository.ts`, `updateDraftOrder`). Chặng của đơn nháp bị xoá và chèn lại **cùng lô, trước** câu xoá dịch vụ. Chỉ chặng của đơn đã xác nhận mới được Vận chuyển tham chiếu; từ lúc xác nhận, trigger `order_service_frozen_delete` (0008) đã làm id dịch vụ bền. Vì vậy không cần làm trước phần "so khớp theo id" của ADR-0006 điều 1.
- **Bất biến hai lớp (5.1):**
  - **[CSDL]:**
    - `CHECK` khuôn ngày giờ; nơi đón "đúng một", nơi trả "tối đa một";
    - trigger: `order_id` của chặng = `order_id` của dịch vụ (khuôn `order_item_service_scope_*`, 0008);
    - trigger: cấm xoá chặng khi đơn không còn nháp;
    - trigger: đơn không còn nháp thì không đổi `order_service_id`, `direction`, `order_id`.
  - **[Máy chủ]:** ngày đón trong khoảng cho phép (luật đổi được, ở mã — Phần II); lý do đóng chặng thuộc danh sách đóng.
  - Sau xác nhận: **thêm** chặng được (thêm chiều về); **sửa** trường vận hành (ngày, giờ, nơi) được; **bỏ** = đóng dòng có lý do.
- **Route** (cổng `orders`, thân hỏi `can()` trước mọi truy vấn):
  - lập và sửa nháp: thân `POST/PUT /api/orders` hiện có, thêm mảng `legs` (ô `order.create` / `order.modify`);
  - sau xác nhận: `POST /api/orders/:id/legs`, `PUT /api/orders/:id/legs/:legId`, `POST /api/orders/:id/legs/:legId/close` — ô `order.trip.edit` (cùng loại dữ liệu với "Sửa thông tin chuyến" hôm nay, không đổi nghĩa ô); nhật ký trước→sau, nơi chữ tự do che dãy số.
- **Ngày giờ:** `pickup_date`/`pickup_time` là giờ dân sự VN (`TEXT`). "Hôm nay" = `vnToday`. Đổi sang mốc máy bằng **một** hàm có test (mở rộng `vnLocalToIso` ở `src/shared/vn-date.ts`, thêm bản trả mili-giây), có ca 00:00–07:00 giờ VN.

### A2. Danh sách hành khách (`ord_passenger`) — dòng nhẹ của đơn, không phải hồ sơ Bên

- **Bảng** `ord_passenger`, module `orders`. Cột:
  - `id`, `order_id` (FK);
  - `full_name` (TEXT 1–100);
  - `birth_year` (INTEGER 1900–2100, **bắt buộc** — luật vận tải cần năm sinh);
  - `pax_code` (`adult/child/senior/infant`, NULL được);
  - `previous_id` (dòng này thay dòng nào);
  - `person_key` — **khoá bền của một người** = `id` của dòng đầu chuỗi, chép sang mọi dòng thay thế (trigger kiểm);
  - `voided_at`;
  - `source` `CHECK IN ('OFFICE','DRIVER')`, tập đóng. Giá trị `DRIVER` định sẵn để khỏi dựng lại bảng; **chỉ dùng khi ADR lượt 2 mở đường ghi cho tài xế**;
  - cột dấu vết.
- **Chỉ-thêm sau xác nhận** (khuôn giấy tờ ở ADR-0040):
  - sửa tên = dòng mới trỏ `previous_id`, cùng `person_key`;
  - nhập nhầm = `voided_at`;
  - trigger cấm `UPDATE` cột nội dung và cấm `DELETE` khi đơn không còn nháp;
  - chỉ mục duy nhất "một dòng thay thế còn hiệu lực" (khuôn `pty_person_document_next_uq`).
  - Module khác (Vận chuyển) tham chiếu **người** bằng `person_key`, và tham chiếu **một bản tên đã dùng** bằng `id` dòng — dòng đó không bao giờ đổi. Không chép họ tên sang bảng module khác.
- **Đơn nháp:** danh sách xoá–chèn lại cùng lô khi lưu nháp, như dịch vụ.
- **Luật "đủ tên":** đơn nháp và đơn đã xác nhận đều lưu được khi danh sách còn thiếu. Việc chặn khi thiếu tên thuộc cổng xuất bến của chuyến (lượt 2).
- **Nguồn thật khi lệch (N7):** **số khách hiệu lực** (A3) là nguồn thật của *số người*; danh sách là nguồn thật của *ai là ai*. Danh sách nhiều hơn số khách → máy gắn cờ cho văn phòng, không tự tăng số khách.
- **Dữ liệu cá nhân:**
  - nhật ký, Bảng tin, thông báo chỉ ghi **số lượng** ("thêm 2 khách"), không tên, không năm sinh (siết 5.12, như ADR-0040 D2);
  - có hàng rào kiểm + dòng `docs/SO-HANG-RAO.md` (quan sát chặn thật) **trước** khi phát hành;
  - lưu ít nhất 3 năm, không xoá cứng.
- **Ô quyền** (cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER):

  | Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER |
  |---|---|---|---|---|---|---|---|---|
  | `order.passenger.write` **(mới)** — nhập, sửa (dòng mới), huỷ dòng trong danh sách của đơn | ownOrAssigned | none | any | none | own | any | own | none |
  | `contact.view` **(giữ giá trị, mở rộng nghĩa)** — xem danh sách | any | any | any | assigned | ownOrAssigned | any | own | none |

  - `order.passenger.write` mang giá trị bằng `order.modify`: ai lập, sửa được đơn thì nhập được tên khách của đơn đó.
  - Chú thích ô `contact.view` ghi thêm: "nay gồm họ tên + năm sinh của từng hành khách" (ADR-0019 điều 2 dòng liên hệ khách).
  - Tài xế **không** đi qua hai ô này. Đường ghi của tài xế (nếu có) do ADR lượt 2 quyết.
- **Route** (cổng `orders`):
  - `GET /api/orders/:id/passengers` — hỏi `contact.view` theo phạm vi đơn;
  - `POST /api/orders/:id/passengers` — thêm, sửa bằng dòng mới, huỷ dòng; hỏi `order.passenger.write`; khoá lạc quan theo `orders.updated_at`;
  - đơn nháp: đi kèm thân `POST/PUT /api/orders`.

### A3. `orders` công bố số khách hiệu lực, hàm đọc hẹp, view khoá + cờ; tiền tố `ord_`

- **Hàm công bố `soKhachHieuLuc(db, serviceIds) → Map<serviceId, PaxCounts>`** ở `orders/index.ts`:
  - số đã lưu phủ dòng điều chỉnh gần nhất, qua **đúng** `parseAdjustmentAfter` (một nguồn — bài học Đợt E);
  - hàng rào quét mã: ngoài `src/modules/orders/`, không tệp nào đọc `order_money_adjustment` hay `after_json`.
  - Nếu kế hoạch "dọn nền" (T1) làm hàm này trước thì ADR này chỉ dẫn chiếu, không làm lại.
- **Hàm đọc hẹp cho Vận chuyển** (danh sách trường được phép dựng **trong `orders`**, khuôn `pool.ts`, Hiến chương 4.4):
  - `hanhKhachChoChuyen(db, legIds)` → mỗi chặng: id chặng, id đơn, mã đơn, tên dịch vụ, chiều, ngày giờ hẹn, nơi đón, nơi trả (chữ tự do che dãy số), số người, và từng người `{ personKey, rowId, fullName, birthYear }`. **Không** tiền, ghi chú, người lập, SĐT.
  - Hàm **không tự kiểm quyền**; mọi nơi gọi phải đứng sau `can()` (bài kiểm quét nơi gọi).
  - Hàm trả liên hệ (SĐT) cho tài xế: **chờ lượt 2** (Q3).
- **View công bố mới, chỉ khoá + cờ** (ADR-0002 điều 3; Phần II quy tắc 4) — cho trigger của module khác giữ luật ở tầng CSDL mà không đọc bảng `orders` (5.3):
  - `v_ord_order_flag(id, is_confirmed, is_cancelled)`;
  - `v_ord_leg_key(id, order_id, order_service_id, is_open)`;
  - `v_ord_passenger_key(person_key, order_id, has_current_row)`.
  - Không dùng tên `v_ord_order_state` của ADR-0024 (còn proposed). Khi ADR-0024 được duyệt, nó có thể nuốt `v_ord_order_flag` — ghi ở ADR-0024.
- **Tiền tố bảng `ord_`** cho module `orders` (Q-AA, chủ chốt 2026-09-26), kèm T3b: khoá danh sách bảng `legacy` bằng bài kiểm, để bảng mới của `orders` không trốn tiền tố. Bảng cũ (`orders`, `order_item`, `order_service`, `order_money_adjustment`) giữ tên.
- **Câu SQL mới của `orders` (Hiến chương 6.3):** `orders` còn LEGACY (không `defineSql`, không EXPLAIN). SQL chạm `ord_*` viết bằng `defineSql` trong tệp riêng và đưa tệp đó vào bài EXPLAIN. Nếu bài kiểm không nhận module "nửa nghiêm" thì ghi **nợ có tên, có hạn** ở `src/architecture.test.ts`, không để lặng.

### L-A1. Lệch có chủ ý 5.1 (khuôn ADR-0029)

- **Phạm vi:** "danh sách nhiều người hơn số khách hiệu lực thì gắn cờ" (và, nếu lượt 2 thêm `pax_override`, "số người của chặng ≤ số khách hiệu lực").
- **Vì sao chỉ ở mã:** sau khi sửa, số khách nằm trong JSON (`after_json`); trigger không đọc được.
- **Lớp bù:** câu kiểm định kỳ ở `scripts/audit-checks.mjs`.
- **Điều kiện gỡ:** số khách hiệu lực thành cột có kiểu (kế hoạch dọn nền T1, hoặc ADR sổ công nợ).

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

1. **ADR-0001, dòng 42 (phương án bị loại):**
   - *Nguyên văn:* "**Mỗi khách trong đoàn là một hồ sơ / bảng nối `order_traveller`**: A1 đã chốt khách theo số lượng theo loại (tối đa 50/dịch vụ, không tên); thêm bảng nối là đắt và chưa ai cần."
   - *Mới:* "Danh sách hành khách của đơn (`ord_passenger`, ADR-0047): họ tên + năm sinh từng khách, là dòng nhẹ của đơn, **không** phải hồ sơ — mục 7 ('khách lẻ trong đoàn không phải hồ sơ') giữ nguyên. Mở lại vì luật vận tải hành khách theo hợp đồng đòi danh sách, và chủ quyết 2026-09-27/28. Số khách theo loại vẫn là nguồn thật của số người."
2. **ADR-0002, điều 2:**
   - *Nguyên văn:* "`pty_` hồ sơ, `loc_` địa điểm, `dsp_` điều hành, `bil_` thu tiền–hoá đơn, `stf_` bảng mới của module staff."
   - *Mới:* thêm "`ord_` bảng mới của module orders (ADR-0047; Q-AA 2026-09-26)". Câu "bảng cũ giữ tên" giữ nguyên. (Nếu ADR-0031 sau này cũng ghi câu này thì hai văn bản cùng nghĩa, không mâu thuẫn.)
3. **ADR-0006, điều 5, vế "giờ và nơi hẹn với khách":**
   - *Nguyên văn:* "*giờ và nơi hẹn với khách* = `order_service.pickup_time` / `pickup_place` (A1: điều đã báo khách)" … "Câu 'khách có hẹn đón không, mấy giờ' đọc từ `order_service`".
   - *Mới:* "*giờ và nơi hẹn với khách* = chặng đưa đón `ord_transfer_leg` (ADR-0047)" … "Câu 'khách có hẹn đón không, mấy giờ' đọc từ chặng." Vế "giờ điều xe" của điều 5 thuộc ADR lượt 2.
4. **ADR-0006, điều 6** không bị thay mà được **thực hiện**: cờ "có hẹn đón" = có dòng chặng còn hiệu lực, không phải cột trên `order_service`.
5. **Đặc tả A1** (`docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md`, hai ô giờ đón / nơi đón trên từng dịch vụ): thay bằng chặng theo expand–contract (A1 ở trên).

## Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| **(1) Bảng nào chứa loại thực thể nào?** | `ord_transfer_leg` (mới): chặng đưa đón của **một dòng dịch vụ** — một loại, dùng chung cho dịch vụ đưa đón độc lập và đưa đón kèm dịch vụ khác. `ord_passenger` (mới): hành khách của đơn — một loại, dữ liệu cá nhân (họ tên, năm sinh), không phải hồ sơ Bên; chuỗi phiên bản theo `person_key`. `order_service`: không thêm loại dòng; hai cột đón cũ ngừng ghi ở lần phát hành 2. `loc_location_type`: thêm ba mã loại điểm. `audit_log`: hành động mới `order_leg_*`, `order_passenger_*`, **chỉ số lượng**. View mới `v_ord_order_flag`, `v_ord_leg_key`, `v_ord_passenger_key` (chỉ khoá + cờ). |
| **(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào?** | `order.create` / `order.modify` (nháp) và `order.trip.edit` (sau xác nhận) → `ord_transfer_leg`: **cùng loại dữ liệu** với hai ô đón cũ, không đổi nghĩa ô. `order.passenger.write` (mới) → `ord_passenger`. `contact.view` → đọc `ord_passenger` (nghĩa mở rộng có tên). `DRIVER` → **không** ô nào của ADR này. `party.*` → không chạm (hành khách không phải hồ sơ). |
| **(3) Cổng nào canh cửa nào?** | Route chặng và hành khách ở **cổng `orders`**, thân hỏi `can()` trước mọi truy vấn. `ORDERS_GATE` không có `DRIVER` (bài `src/shared/cong-quyen.test.ts` giữ nguyên). Hàm `soKhachHieuLuc`, `hanhKhachChoChuyen` công bố cho module khác **không tự kiểm quyền**: nơi gọi phải kiểm trước (chú thích + bài kiểm). **Cổng dữ liệu:** trigger phạm vi đơn, cấm xoá/sửa sau xác nhận, chỉ-thêm của hành khách. |

## Hệ quả

- **Dữ liệu:** migration chỉ thêm, số dự kiến **0034** (kiểm lại mọi nhánh lúc thi công; 0019 giữ cho B5, 0029 giữ cho Thông báo đính kèm). `docs/data-dictionary.json` + `npm run dict`.
- **Hàng rào mới** (mỗi cái một dòng sổ hàng rào, kèm ngày thấy chặn): trigger chặng và hành khách; bài "nhật ký không tên/năm sinh"; bài quét "chỉ `orders` đọc `after_json`"; bài "nơi gọi hàm công bố đứng sau `can()`"; `ord_` trong `TABLE_PREFIX` + khoá danh sách `legacy`; bài ghim ô `order.passenger.write`.
- **Việc lớn** (dữ liệu + quyền + dữ liệu cá nhân) ⇒ người kiểm độc lập ở cuối.
- **Phạm vi lớn nhất:** chuyển mọi nơi đọc hai ô đón cũ (khoảng 20 tệp: biên nhận, `pool.ts`, form chuyến…) sang chặng. Dễ va nhánh đang sửa `orders` (Đơn tự do / ADR-0031 dự kiến) — kiểm lúc thi công.
- **Thứ tự:** ADR lượt 2 (chuyến xe) duyệt được ngay sau ADR này; thi công phía `orders` (lát T0, T1 của đề xuất) chạy song song với lát chính sách của lượt 2.

## Phương án bị loại

- **Giữ hai ô đón cũ làm giờ hẹn chiều đi, chặng chỉ ghi phần mới** (Q4 (b)): một lịch đưa đón nằm hai chỗ; chủ chọn (a).
- **Giữ song song, chặng chép lại** (Q4 (c)): trái "một nguồn".
- **Hành khách là hồ sơ Bên:** trái ADR-0001 mục 7; đắt, trùng người.
- **Hai đường riêng cho đưa đón độc lập và đưa đón kèm dịch vụ:** chủ yêu cầu một khái niệm.
- **Dùng tên `v_ord_order_state`:** chiếm tên của ADR-0024 đang proposed.
