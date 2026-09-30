# Trang ghép — lượt duyệt A của Bảng điều phối chung (ADR-0052, ADR-0053, ADR-0054 — số tạm)

> **Lượt A đã duyệt đủ (2026-09-30):** A-1 + A-1b = `docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md`, A-2 = `docs/adr/ADR-0053-dieu-phoi-luot-3-tai-xe-doi-tac.md`, A-3 = `docs/adr/ADR-0054-dieu-phoi-luot-4-chieu-ve-theo-dich-vu.md`.

> **Câu hỏi của trang này ĐÃ ĐƯỢC CHỦ TRẢ LỜI 2026-09-30 — chọn khuyến nghị ở cả 7 câu.** Nguyên văn: `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`, mục "Trả lời lần 17". Các ADR vẫn chờ chủ duyệt theo lượt (A-1, A-1b, A-2, A-3).

- **Loại:** trang ghép bắt buộc theo `CLAUDE.md` §9 ("bước ghép khi duyệt", chủ duyệt 2026-09-24): lượt duyệt gồm ≥ 2 quyết định, và bảng dùng chung (`ord_passenger`, `vc_trip*`, `vc_unavailability`) nhận thêm loại người đọc/ghi. Không phải ADR; mô tả các đề xuất ghép lại.
- **Ngày:** 2026-09-30. AI soạn (vai lập kế hoạch). Người kiểm độc lập chỉ-đọc: 3 vòng, kết thúc ĐẠT; bản này chép lời chủ lần 17 và hệ quả ADR-0057 (đã duyệt, lần 19) — **chưa** kiểm lại phần chép này.
- **Ba đề xuất:**
  - `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-2.md` — **ADR-0052**: D4 chuyển điểm đón + máy tự xác nhận; D5 thêm điểm / báo huỷ khi xe chạy (LC-15 mới); D6 thông báo, Bảng tin chuyến; **D5c** cứu hộ (văn phòng bấm thay qua `trip.progress`); **D5b** tài xế ghi tên khách vào `ord_passenger`;
  - `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-3.md` — **ADR-0053**: D7 tài xế đối tác dùng app (**cửa một chiều**); D8 Từ chối chuyến; D9 Báo bận;
  - `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-4.md` — **ADR-0054**: D10 chiều về theo dịch vụ.

## 0. Cách duyệt — bốn lượt riêng (trần 3 của `CLAUDE.md` §9)

Gói A có **9 quyết định** chạm dữ liệu/quyền. Mỗi lượt duyệt tối đa **3** ⇒ chủ duyệt **bốn lượt**, theo thứ tự:

| Lượt | ADR (số tạm) | Quyết định | Điều kiện thứ tự | Câu hỏi |
|---|---|---|---|---|
| **A-1** | 0052 | D4 chuyển điểm đón + máy tự xác nhận; D5 thêm điểm / báo huỷ / đổi điểm theo đơn khi xe chạy (LC-15 mới); D6 thông báo, Bảng tin chuyến | mã ADR-0049 thi hành trước; các mục luật của ADR-0049 chủ đang xét lúc gộp mà bị bác thì phần dựa vào đó soạn lại | đã trả lời lần 17 |
| **A-1b** | 0052 (phần sau) | D5c cứu hộ (văn phòng bấm thay qua `trip.progress`; xe nhà xe phải có giá trước — ADR-0057); D5b tài xế ghi tên khách chưa có tên | **sau** A-1; lượt riêng | không có câu |
| **A-2** | 0053 | D7 tài xế đối tác dùng app (**cửa một chiều**) + siết tài xế công ty; D8 Từ chối; D9 Báo bận | **sau** A-1; ô `trip.passenger.add` của tài xế đối tác chỉ mở nếu A-1b đã duyệt; vế siết tài xế công ty (D7.2) thi hành được ngay trong lượt 1 ADR-0049 | đã trả lời lần 17 |
| **A-3** | 0054 | D10 chiều về theo dịch vụ (`vc_leg_template`, số người chặng về) | độc lập, duyệt lúc nào cũng được; thi công sau khi `0034` lên `main` | đã trả lời lần 17 |

**Nền chung:** cả ba xây trên ADR-0047, ADR-0049, ADR-0050, ADR-0051 **đã duyệt nhưng CHƯA gộp `main`, CHƯA phát hành** (nhánh `thi-cong-adr-0049-tiep`; `main` dừng ở migration `0039`; `0034`, `0035`, `0040`–`0043` chưa áp remote — kiểm chỉ-đọc 30/9). `docs/quyen-hoan.json` `phat_hien` = `[]` (kiểm 30/9) ⇒ **không xây trên lỗ đang hở**. Không lượt nào tự sinh tiền; A-1b và A-2 **chịu** luật giá của ADR-0057 (đã duyệt): xe nhà xe không xuất bến khi thiếu giá, không phá lệ, kể cả cứu hộ; Quản trị = Kế toán về tiền xe thuê.

---

## (1) Các bảng bị chạm chứa những loại thực thể nào (sau cả ba lượt)

| Bảng (chủ) | Loại thực thể / dòng | Ai đọc | Ai ghi | Đổi ở lượt |
|---|---|---|---|---|
| `ord_passenger` (`orders`, `0035`) | **một loại**: khách của một đơn (họ tên, năm sinh, loại tuổi), chuỗi sửa có hiệu lực; `source` ∈ {`OFFICE`, `DRIVER`} (`0035:19`) — **cùng thực thể, khác người nhập** | văn phòng (màn đơn, `order.view`); tài xế công ty **và (từ A-2) tài xế đối tác — người ngoài công ty** qua DTO chuyến, chỉ khách trên chuyến mình, chỉ trong khung (D7.2) | văn phòng qua `order.passenger.write`; **tài xế công ty (A-1b) và tài xế đối tác (A-2, nếu A-1b đã duyệt)** qua `trip.passenger.add` — **chỉ thêm người chưa có tên**, không sửa tên đã có (dòng `source = 'DRIVER'`, câu lệnh do `orders` cấp) | A-1b mở ghi cho tài xế công ty; **A-2 mở đọc (+ ghi) cho người ngoài** |
| `ord_transfer_leg` (`orders`, `0034`) | chặng đưa đón của một dịch vụ (`OUT`/`RETURN`); + cột đặt gấp (ADR-0049) | văn phòng; `van-chuyen` qua `lichChungChang` (không tên, không tiền); tài xế thấy nơi/giờ của chặng trên chuyến mình qua DTO | người sửa được đơn | **A-3**: + `pax_override` (chỉ `RETURN`, ≥ 1) |
| `vc_trip` | chuyến — một loại; xe công ty và xe nhà xe chung bảng | `trip.view` (văn phòng + Kế toán mọi chuyến; tài xế chuyến mình) | `trip.dispatch`, `trip.progress` | A-1: đọc thêm của tài xế khi chọn xe nhờ đón (4 khoá, ĐP9); A-2: người ngoài đọc chuyến mình + 4 khoá chuyến khác |
| `vc_trip_driver` | ai lái, có hiệu lực — **hồ sơ tài xế công ty hoặc tài xế đối tác** | như `vc_trip` | `trip.dispatch` (xếp, đổi); **A-2**: tài xế đối tác tự đóng dòng của mình (`REFUSED`) | A-2: + `refuse_reason_code`, `refuse_lead_minutes`, `refuse_until_ms` |
| `vc_trip_stop` | điểm đón / trả | như `vc_trip` | `trip.dispatch`, `trip.progress`; đề nghị chuyển | A-1: + `added_while_running`; `MOVED` bắt đầu dùng |
| `vc_trip_allocation` | **hai loại dòng**: suất khách (trỏ chặng + người) và suất người đi kèm (trỏ hồ sơ) | như `vc_trip` | `trip.dispatch`; lệnh tiến độ; đề nghị chuyển; gắn tên (`trip.passenger.add`) | A-1: + `transfer_id`, `office_cancel_*`; `TRANSFERRED` bắt đầu dùng; LC-15 nới |
| `vc_trip_event` | sự kiện có kiểu, 1-1 `audit_log`; chỉ số người | như `vc_trip` | mọi lệnh chuyến | A-1, A-2: + mã sự kiện (danh sách ở mã, `dieu-phoi-kieu.ts:34-39`) |
| `vc_trip_manifest` | danh sách người lúc xuất bến (trỏ dòng `ord_passenger`) + dòng thêm sau xuất bến | văn phòng; tài xế (trong khung) | xuất bến; nhận chuyển; thêm điểm | A-1: dòng thêm khi xe chạy; A-2: người ngoài đọc (trong khung) |
| `vc_transfer_request` (**mới**, A-1) | đề nghị chuyển, **hai loại phạm vi**: `STOP` (cụm đón chưa tới), `ONBOARD` (khách trên xe — cứu hộ) | tài xế nguồn/đích; văn phòng (`trip.view`) | tài xế (`trip.transfer`); văn phòng bấm thay **chỉ `ONBOARD`** (`trip.progress`); duyệt/bác (`trip.override`) | A-1 tạo; A-2 thêm người ngoài làm nguồn/đích |
| `vc_transfer_check` (**mới**, A-1) | kết quả từng luật của một lần xét, chỉ-thêm (`rule_tier` lõi/cấu hình) | như đề nghị | chỉ máy, trong lô Nhận/Duyệt | A-1 |
| `vc_unavailability` (**mới**; dùng chung với ADR Kernel lượt 2) | khung bận — **hai loại đối tượng**: `VEHICLE` (Kernel lượt 2), `DRIVER` (A-2) | xe: `trip.view`, `vehicle.manage`; **tài xế: `trip.dispatch` (không Kế toán)** + chính tài xế | xe: `vehicle.manage`; tài xế: chính tài xế đối tác (`unavailability.self`) | A-2 mở phần `DRIVER` (tạo bảng nếu Kernel chưa tạo) |
| `vc_dispatch_policy` | chính sách có ngày hiệu lực | `trip.view` | `settings.ops` (Toàn quyền) | A-1: + `accept_wait_minutes`, `auto_confirm_transfer`; A-2: + `refuse_lead_minutes` |
| `vc_reason` | danh mục lý do theo nhóm | theo màn | `admin.manage` | A-2: + nhóm `TU_CHOI_CHUYEN`, `BAN_TAI_XE` (Kernel: `BAN_XE`) |
| `vc_leg_appt_ack` (ADR-0051, `0043`) | mốc giờ hẹn đã biết / đã gọi | văn phòng (`trip.view`) | lô mở suất lần đầu (`XEP`); `trip.call_ack` | A-1: lô "thêm điểm khi xe chạy" phải ghi `XEP` (trigger `vc_trip_allocation_needs_appt` canh) |
| `vc_leg_template` (**mới**, A-3; module `van-chuyen` — Q-L4-A a) | mẫu chặng theo dịch vụ, chỉ-thêm, có hiệu lực, đủ bốn cột WHO; `code` = tham chiếu logic tới mã dịch vụ | màn Danh mục (cổng `admin`); form đơn qua route đọc mẫu (cổng `orders`, `order.create`) | `admin.manage` | A-3 |
| `stf_permission` (`staff`) | quyền của tài khoản — **không đổi dữ liệu, không thêm mã**. Điểm mới: tài khoản giữ `DRIVER_PARTNER` (người ngoài) nay **được đọc dữ liệu khách**. LC-1 (`0037:10-12`, `NOT IN ('PARTNER','DRIVER_PARTNER')`) và LC-1b (`0037:18-23`, `DRIVER_PARTNER` đứng một mình) **giữ nguyên** ⇒ người ngoài đọc khách **chỉ** qua 6 ô `trip.*`/`unavailability.self`, không kèm quyền nào khác | — | — | A-2 (nghĩa, không dữ liệu) |
| `audit_log` (+ view mới `v_aud_trip_event`) | + hành động chuyến, đề nghị, Từ chối, khung bận, mẫu chặng; **không** tên, năm sinh, SĐT, số giấy tờ | `thongbao` qua view (chỉ khoá) | các module qua `auditStatement` | A-1, A-2, A-3 |
| `ntf_*`, Bảng tin | **không** thêm dòng — tin chuyến là hình chiếu | — | — | A-1 |

---

## (2) Bản đồ quyền chạm các bảng này — đủ 9 cột

Cột theo `PERMISSION_CODES` (`src/shared/permissions.ts:5@thi-cong-adr-0049-tiep`): **SALES · ACC · ADMIN · FIELD · PARTNER · SA · INTERN · DRIVER · DRIVER_PARTNER**. Giá trị "trước" đọc ở nhánh `thi-cong-adr-0049-tiep` (dòng ghi trong ngoặc). **Đậm** = đổi.

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_PARTNER | Chạm bảng / áp cho loại nào | Lượt |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `trip.view` (:136) | any | any | any | none | none | any | none | assigned | none → **assigned** | mọi `vc_trip*`, đề nghị, manifest; lịch chung qua `lichChungChang`; liên hệ qua `lienHeChoTaiXe`. Tài xế: chuyến mình + **4 khoá** chuyến khác cùng ngày (ĐP9). Người nhận tin chuyến lọc qua ô này | A-2 |
| `trip.dispatch` (:137) | any | none | any | none | none | any | none | none | none | + **thêm điểm/suất và báo huỷ khi xe chạy** (A-1); + **xem khung bận tài xế** (A-2). Không rút/dời suất chuyến `RUNNING` | A-1, A-2 (nghĩa) |
| `trip.progress` (:142) | any | none | any | none | none | any | none | assigned | none → **assigned** | tiến độ suất/điểm/chuyến; + **văn phòng bấm thay gửi đề nghị cứu hộ `ONBOARD`** (A-1b, D5c) | A-1b (nghĩa), A-2 |
| `trip.override` (:138) | none | none | any | none | none | any | none | none | none | + **duyệt/bác đề nghị leo thang** (duyệt chỉ khi mọi luật hỏng là luật cấu hình); phá lệ mốc khi thêm chặng không "đặt gấp" vào xe đang chạy (như dòng "Xếp" của ADR-0049 D2) | A-1 (nghĩa) |
| `trip.call_ack` (:146) | ownOrAssigned | none | any | none | none | any | none | none | none | `vc_leg_appt_ack` — **không đổi** | — |
| **`trip.transfer`** (mới) | none | none | none | none | none | any | none | **assigned** | none → **assigned** | `vc_transfer_request` (gửi, rút, nhận, không nhận); lô xác nhận ghi suất, điểm, manifest. Route chốt "đang lái nguồn/đích" kể cả SA | A-1, A-2 |
| **`trip.passenger.add`** (mới) | **none** (ĐP13) | none | **none** (không có route văn phòng; Quản trị dùng `order.passenger.write`) | none | none | any | none | **assigned** | none → **assigned** | `ord_passenger` (`source = 'DRIVER'`) qua câu của `orders` + gắn tên vào **suất chưa tên**; chỉ đơn có khách trên chuyến mình, trong khung | A-1b, A-2 |
| **`trip.refuse`** (mới) | none | none | none | none | none | any | none | **none** (Q3 c) | **assigned** | đóng dòng `vc_trip_driver` của chính mình (`REFUSED`); route chốt "đang lái" kể cả SA | A-2 |
| **`unavailability.self`** (mới) | none | none | none | none | none | any | none | **none** (Q3 c) | **own** | `vc_unavailability` dòng `DRIVER` của chính mình | A-2 |
| `order.view` (:72) | any | any | any | assigned | own | any | own | none | none | đọc `ord_transfer_leg`, `ord_passenger` qua màn đơn (tên khách thêm cần `contact.view`) — **không đổi**; dòng `source = 'DRIVER'` do tài xế nhập hiện cho mọi người xem được đơn đó; A-3: thấy `pax_override` | — |
| `order.create` (:76) | any | none | any | none | any | any | any | none | none | tạo chặng, hành khách lúc lập đơn — **không đổi**; A-3: + đọc mẫu chặng (route cổng `orders`) cho form tạo sẵn chặng | A-3 (nghĩa) |
| `order.passenger.write` (:86) | ownOrAssigned | none | any | none | own | any | own | none | none | `ord_passenger` qua màn đơn — **không đổi** (ĐP13 a: Bán hàng không có đường vòng qua màn chuyến) | — |
| `order.modify` (:77) | ownOrAssigned | none | any | none | own | any | own | none | none | chặng khi đơn nháp; A-3: lưu nháp **chỉ chép lại** `pax_override` cũ, gửi giá trị khác → 403 (Q-L4-B a) | A-3 (nghĩa) |
| `order.trip.edit` (:78) | ownOrAssigned | none | any | none | none | any | none | none | none | chặng sau xác nhận; **A-3: ô duy nhất ghi `pax_override`, cả nháp (đường mới) lẫn đã xác nhận** (Q-L4-B a "Chỉ văn phòng") | A-3 (nghĩa) |
| `order.leg.short_notice` (:81) | none | none | any | none | none | any | none | none | none | cột đặt gấp của `ord_transfer_leg` — không đổi | — |
| `order.leg.short_notice.view` (:85) | any | any | any | none | none | any | none | none | none | xem đủ dấu đặt gấp trên `ord_transfer_leg` — không đổi; A-3 thêm cột vào cùng bảng, không đổi ai xem dấu đặt gấp | — |
| `contact.view` (:75) | any | any | any | assigned | ownOrAssigned | any | own | none | none | **không đổi**. SĐT người liên hệ tới tài xế là **ngoại lệ có tên** dưới `trip.view` + khung (ADR-0049 D3; A-2 D7.2 cho người ngoài) | — |
| `settings.ops` (:109) | none | none | none | none | none | any | none | none | none | `vc_dispatch_policy` + 3 cột mới | A-1, A-2 (nghĩa) |
| `admin.manage` (:100) | none | none | any | none | none | any | none | none | none | `vc_reason` + 2 nhóm; `vc_leg_template` | A-2, A-3 (nghĩa) |
| `vehicle.manage` (:131) | none | none | any | none | none | any | none | none | none | không đổi (khung bận xe: ADR Kernel lượt 2) | — |
| `party.document.view` (:122) | own | own | own | own | none | any | own | own | own | giấy tờ của chính mình (số che) — không đổi; DTO chuyến không mang số giấy tờ | — |

**Dòng riêng "áp cho `DRIVER_PARTNER`" — người ngoài công ty (A-2, cửa một chiều):**

| Dữ liệu | Áp cho `DRIVER_PARTNER`? | Điều kiện | Căn cứ |
|---|---|---|---|
| Họ tên, năm sinh khách trên chuyến mình | **có** | chuyến mình; (ngày chạy **và** ≥ hạn Từ chối) hoặc `RUNNING` | ĐP12 a ∩ Q1 a (D7.2) |
| Tên + SĐT người liên hệ đơn có khách trên chuyến | **có** | như trên | ĐP12 a ("cùng luật", gồm C3) |
| Ghi tên khách vào `ord_passenger` | **có** | như trên, chỉ đơn có khách trên chuyến mình | ĐP12 a + C15 |
| Mã đơn | **có** (nhãn) | chuyến mình | diễn giải ADR-0048 "không thấy đơn hàng" (G3-3) |
| Mã chuyến, **tên tài xế** (kể cả tài xế công ty), chỗ trống, điểm sắp tới của **xe khác** cùng ngày | **có** | khi chọn xe nhờ đón | ĐP9 a × ĐP11 a × ĐP12 a |
| Khách, số người, mã đơn của xe khác | **không** | — | ĐP9 a |
| Tiền (kể cả giá thuê chuyến mình), dịch vụ khác, ghi chú, người lập/phụ trách, bên đặt | **không bao giờ** | — | ADR-0048 D2; ADR-0049 D3 |
| Số giấy tờ đầy đủ | **không** | — | ADR-0040; ADR-0048 |
| Tin "Toàn công ty", tin đơn | **không** | `laNoiBo` giữ nguyên; không `order.view` | ADR-0048; ADR-0022 |
| Tin chuyến (xếp, gỡ, đổi giờ, đề nghị) | **có** | chuyến mình; qua `can(trip.view)` | ADR-0052 D6.2 |
| Khung bận của mình / của người khác | có / **không** (404) | — | D9.2 |

---

## (3) Cổng nào canh cửa nào

| Cửa | Cổng (ADR-0019; `permissions.ts:201-211`, `router.ts:228-237`) | Ô trong thân route (hỏi **trước** mọi truy vấn) | Lớp CSDL | Lượt |
|---|---|---|---|---|
| Màn tài xế: cuốc của tôi, tiến độ, gửi/nhận đề nghị, bổ sung tên, danh sách xe nhờ đón | `staff` (mọi tài khoản; `DRIVER_PARTNER` chỉ vào được cổng này) | `trip.view`/`trip.progress`/`trip.transfer`/`trip.passenger.add` với `assigned`; ngoài phạm vi → **404** | LC-01…LC-16 (ADR-0049), LC-14, LC-15 mới | A-1, A-2 |
| Từ chối chuyến | `staff` | `trip.refuse` + chốt "đang lái" (403 cả SA) | B8.1–B8.4 | A-2 |
| Báo bận của tôi | `staff` | `unavailability.self` (`ownerId` = chính mình) | B9.1, B9.2, B9.4 | A-2 |
| Bảng điều phối: thêm điểm, báo huỷ, xem đề nghị, xem khung bận tài xế | `office` (SALES, ACC, ADMIN, SA) | `trip.dispatch` / `trip.view` | LC-15 mới; B9.3 | A-1, A-2 |
| Bấm thay gửi đề nghị cứu hộ | `office` | `trip.progress`, **chỉ** `scope = 'ONBOARD'` | LC-14 | A-1b |
| Duyệt / bác đề nghị leo thang | `office` | `trip.override` | trigger `ESCALATED → CONFIRMED` (không có `KHONG_DAT` + `LOI`; có lý do) | A-1 |
| Chính sách (3 cột mới) | `office` | `settings.ops` | trigger chỉ-thêm (có sẵn) | A-1, A-2 |
| Danh mục lý do (2 nhóm mới); mẫu chặng dịch vụ | `admin` | `admin.manage` | trigger chỉ-thêm bảng mẫu chặng | A-2, A-3 |
| Đọc mẫu chặng cho form đơn | `orders` | `order.create` | — | A-3 |
| Lưu chặng (`pax_override`) | `orders` | `order.trip.edit` (cả nháp — đường mới; đã xác nhận); `order.modify` lưu nháp chỉ chép lại | `CHECK` `pax_override` | A-3 |
| Hộp thông báo, gõ cửa, Bảng tin | `staff` (có sẵn) | hàm thuần người nhận: `can(trip.view, …)` hiện hành + dòng lái có hiệu lực lúc sự kiện; nhãn `dieu-xe` = `trip.view` không ngữ cảnh | — | A-1 |
| Hợp đồng giữa các phần | — (không phải route) | hàm hẹp `orders` (`lichChungChang` :268, `hanhKhachChoChuyen` :193, `lienHeChoTaiXe` :319, **câu ghi hành khách của tài xế** mới) không tự kiểm quyền → bài quét "nơi gọi đứng sau `can()`"; hàm tiêm `ctx.baoThayDoiChuyen`, `ctx.chuyenLienQuan` (A-1); hàm khung `trongKhungXemKhach` (A-2) và `soNguoiChang` (A-3) là **một nguồn** | — | A-1…A-3 |

- `DRIVER`, `DRIVER_PARTNER` vẫn **không** vào `office`, `orders`, `admin` (`src/shared/cong-quyen.test.ts` giữ).
- Không cổng mới; không đổi danh sách mã của cổng nào; không cạnh module mới (`thongbao → audit` đã có — `src/architecture.test.ts:44`; `van-chuyen` không đọc `catalog` (Q-L4-A a), `orders` không import `van-chuyen`; vẫn không module nào import `van-chuyen` — `:735`).

---

## (4) Hệ quả chéo

**Giữa ba đề xuất**
1. **A-2 lật cột `DRIVER_PARTNER` của các ô A-1 tạo** (`trip.transfer`, `trip.passenger.add`) cùng hai ô ADR-0049. Nếu chủ duyệt A-1 mà **bác** A-2: tài xế đối tác vẫn không dùng app; chuyến xe nhà xe chạy bằng văn phòng bấm thay; cứu hộ bằng xe nhà xe đi đường lượt 1 (ADR-0052 D5c).
2. **Người nhận tin của A-1 lọc qua `can(trip.view)`** ⇒ trước A-2, người ngoài không nhận tin chuyến nào; sau A-2 tự nhận — không cần sửa luật người nhận.
3. **Tin Từ chối (A-2 D8)** dùng bảng người nhận của A-1 D6.2 (thêm một dòng: tới `trip.dispatch = any`).
4. **A-3 `soNguoiChang`** phải được dùng ở kiểm L-D1 khi **thêm suất vào xe đang chạy** (A-1 D5.1) và ở danh sách "thiếu/thừa suất". Nếu A-3 lên trước A-1: A-1 dùng luôn hàm này; nếu sau: A-3 sửa mọi nơi gọi (bài "một luật" bắt).
5. **Khung thấy khách (A-2 D7.2)** áp cho cả câu ghi tên của tài xế (A-1b D5b) — một hàm.

**Với ADR đã duyệt (chưa gộp `main`)**
6. **ADR-0049:** A-1 nới LC-15 và bài ghim hàng `DRIVER`; A-2 nới bài ghim hàng `DRIVER_PARTNER` (ADR-0048). Cả hai là **nới hàng rào** (Điều 9.4) — duyệt ADR là duyệt việc nới. Chủ đang xét **từng mục luật** của ADR-0049 lúc gộp; mục nào bị bác (vd bảy ô mới, nới bài ghim `DRIVER`) thì A-1/A-2 phải soạn lại phần dựa vào nó.
7. **ADR-0050 VK1-B:** "cập nhật điểm theo đơn" trên xe đang chạy — **được** (Q-L2-A a): cùng xe, suất đang chờ, điểm chưa tới (ADR-0052 D5.3a). VK1-A (giờ xảy ra khi bấm thay) không áp cho gửi đề nghị (đề nghị không có "giờ xảy ra" riêng).
8. **ADR-0051:** trigger `vc_trip_allocation_needs_appt` buộc lô A-1 D5.1 ghi mốc `XEP`; lô chuyển (`TRANSFERRED`) không chụp lại (`ADR-0051:149`); phần tin đẩy MQ-07 ADR-0051 hẹn "lượt 2 D6" → A-1 D6.2.
9. **ADR-0048:** LC-1, LC-1b, `EXTERNAL_PERMISSIONS`, `laNoiBo` **không đổi** (không mã quyền mới — `CLAUDE.md` §10 không kích hoạt). Chỉ đổi giá trị ô cột `DRIVER_PARTNER` + bài ghim.
10. **ADR-0047:** A-1b mở `source = 'DRIVER'` (A2); A-3 thêm `pax_override` (A1).
11. **ADR-0022, ADR-0034, ADR-0045:** A-1 thêm nguồn tin thứ hai và loại sự kiện Bảng tin `chuyen`; không đổi luật tin đơn; đơn nháp vẫn không sinh tin.
12. **ADR-0033:** không đổi (Q-L4-A a); form đọc mẫu qua route riêng `GET /api/van-chuyen/mau-chang`.
12b. **ADR-0049 D3 "trong ngày chạy" (Q-L3-B a):** A-2 **sửa hành vi** tài xế công ty — đang chạy chỉ mở danh sách khi đã xuất bến từ ngày chạy. Khuyến nghị thi hành ngay trong lượt 1 của ADR-0049 (chưa phát hành, là siết) sau khi chủ duyệt A-2; nếu chưa kịp thì ghi nợ có hạn.

**Với đề xuất khác đang soạn song song**
13. **Kernel lượt 2** (đề xuất ADR-0055 tạm, `2026-09-30-de-xuat-adr-kernel-luot-2.md` A1, lượt duyệt B; nguồn `2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-2.md` VK2-A — bảng này định trọn `subject` và **chặn ghi `DRIVER`** tới A-2; A-2 bỏ trigger chặn bằng migration mới): **một** bảng `vc_unavailability` (`subject` `VEHICLE`/`DRIVER`) và **một** hàm chồng giờ LC-03 cho cả xe và tài xế. Ai duyệt trước tạo bảng với đủ tập `subject`; điều phối chốt thứ tự lúc cấp số.
14. **ADR-0057 tiền xe thuê (ĐÃ DUYỆT, lần 19):** (a) **cứu hộ (A-1b D5c):** chuyến cứu hộ bằng xe nhà xe phải có giá bảng đã chụp hoặc giá thoả thuận (Quản trị / Kế toán / Toàn quyền nhập) **trước** xuất bến — không ngoại lệ, không phá lệ (`THIEU_GIA`); (b) **Từ chối → giao lại (A-2 D8.5a):** đổi xe / nhà xe / tuyến trước xuất bến thì lô đổi đảo nguồn giá cũ, chụp lại giá bảng; giá thoả thuận cũ phải nhập lại; chỉ đổi tài xế cùng nhà xe, cùng xe thì giá giữ nguyên; phí huỷ với nhà xe ghi tay (tiền Q7); (c) nhờ đón chéo không đổi tiền (theo chuyến); (d) **Quản trị = Kế toán** chỉ về các ô `transport.*` của ADR-0057 — **không** đổi ô chuyến: Kế toán vẫn `trip.view` (xem), không `trip.dispatch` (lời chủ Q1 ban đầu); tài xế đối tác không thấy số tiền nào.

**Migration** — mọi số **≥ 0044, lấy lúc thi công** sau khi liệt kê mọi nhánh và worktree chưa gộp (`docs/adr/README.md:77`; sổ tiền, Kernel lượt 2–3 có thể lấy trước). Thứ tự phụ thuộc: `0042`/`0043` (ADR-0049/0051) → A-1 → A-2; A-3 chỉ cần `0034`.

**Thứ tự thi công với ADR-0057:** phần "xe nhà xe phải có giá" dựa vào cổng `THIEU_GIA` và ô `transport.cost.*` của ADR-0057, mà các ô này **chỉ vào ở bản phát hành T2** của ADR-0057 (sau khi ADR-0049 lượt 1 gộp `main`). Nếu A-1b / A-2 phát hành **trước** T2 thì cổng giá chưa có ⇒ chuyến xe thuê chưa có đường nhập giá trong app. **Khuyến nghị: thi công A-1b và A-2 sau T2**; nếu buộc phải trước, điều phối ghi nợ có hạn và phần giá của D5c / D8.5a thi hành cùng T2. (Áp cho ADR-0052 D5c và ADR-0053 D8.5a.) Không sửa migration đã áp remote.

---

## (5) Câu hỏi — ĐÃ TRẢ LỜI (lần 17)

Chủ chọn khuyến nghị ở cả 7 câu ([HĐ] "Trả lời lần 17", 30/9 — nguyên văn nhãn):

| Mã | Chủ chọn | Vào quyết định |
|---|---|---|
| Q-L2-A | **"Có, có điều kiện"** | ADR-0052 D5.3a |
| Q-L2-B | **"Có; chỉ miễn khi xe nhận đang chạy"** | ADR-0052 D4.2 |
| Q-L3-A | **"Có cả hai"** | ADR-0053 D7.3 |
| Q-L3-B | **"Có, chỉ thấy trong ngày chạy"** | ADR-0053 D7.2 (sửa hành vi ADR-0049 D3) |
| Q-L3-C | **"Không"** | ADR-0053 B9.2 |
| Q-L4-A | **"Phần Vận chuyển"** | ADR-0054 D10.1 (`vc_leg_template`) |
| Q-L4-B | **"Chỉ văn phòng"** | ADR-0054 D10.3 |

**Không còn câu mở.** Còn lại chỉ là việc của chủ ngoài câu hỏi: duyệt bốn lượt; xác nhận đáp án bộ ca mẫu xe A/B trước lát 2.1; vẽ V4, V8–V11 (A-1), V15 (A-2), V12, V14 (A-3).

## (6) Điểm người kiểm độc lập nên soi

1. Trần 3: bốn lượt như mục 0.
2. **Khung thấy khách của người ngoài** (ADR-0053 D7.2) — cách đọc "giao" ĐP12 a ∩ Q1 a; ba ca giờ 06:00 / 14:00 / 23:30.
3. **Hạn Từ chối "khoá dính"** (ADR-0053 D8.2) — có kẽ nào mở lại Từ chối sau khi đã thấy khách.
4. **Ngoại lệ bấm thay cứu hộ qua `trip.progress`** (ADR-0052 D5c) — không thành đường văn phòng tự chuyển khách `STOP`.
5. Người nhận tin "cần xử lý": leo thang → `trip.override` (khác [TK] lát 2.3); MQ-07 → người qua `trip.call_ack`; mọi người nhận qua `trip.view` ⇒ Đối tác / HDV / Thực tập là người lập, phụ trách đơn **không** nhận tin chuyến (ADR-0052 D6.2).
5b. Miễn mốc 6 giờ khi chuyển điểm **chỉ khi xe đích đang chạy** (Q-L2-B a); văn phòng thêm khách vào xe đang chạy **vẫn** cần Quản trị phá lệ trừ chặng đặt gấp (ADR-0052 D5.1).
5c. Tài xế đối tác không thấy khách trước hạn Từ chối ở **mọi** nhánh (kể cả xuất bến sớm / xuất bến trong ngày trước hạn — ADR-0053 D7.2); hạn theo **cặp** (tài xế, chuyến), chỉ giảm (`vc_refuse_deadline`, D8.1–D8.2); tài xế công ty cùng hàm, không vế hạn (Q-L3-B a).
5d. `vc_leg_template` (Q-L4-A a); `pax_override` chỉ `order.trip.edit`, kể cả nháp (Q-L4-B a — đường mới).
5e. Hệ quả ADR-0057: giá xe cứu hộ nhà xe (ADR-0052 D5c), Từ chối → giao lại (ADR-0053 D8.5a).
6. `ord_passenger` nhận người ghi mới là **người ngoài** (A-2) — hàm câu ghi của `orders` và bài quét "sau `can()`" có phủ cột `DRIVER_PARTNER`.
7. Mã đơn trong DTO tài xế đối tác (G3-3).
8. LC-15 mới đủ chặt: văn phòng không rút/dời suất `RUNNING`; **bốn** đường mở/đóng suất có tên — (1) D5.1 thêm điểm/khách, (2) đề nghị chuyển `CONFIRMED` (kể cả cứu hộ `ONBOARD`), (3) Kết thúc gián đoạn, (4) cập nhật điểm theo đơn (đóng `STOP_CHANGED` → mở lại cùng chuyến, chặng, người → câu chốt cuối lô kiểm "một đóng ↔ một mở"; UNIQUE LC-01 buộc đóng trước mở; lưới thứ hai ở `audit-invariants`); báo huỷ chỉ đặt cờ.
9. `vc_unavailability` không thành hai bảng.

## (7) Chưa kiểm

- Mọi dòng `tệp:dòng` của mã đọc ở nhánh `thi-cong-adr-0049-tiep` ngày 30/9 (qua `git show`, không checkout); nhánh còn đổi thì số dòng lệch.
- Trạng thái production: chỉ dựa lần kiểm chỉ-đọc 30/9 do điều phối ghi ([HĐ] lần 15); phiên này **không** chạy lệnh remote nào.
- Số migration trên các nhánh `worktree-agent-*` chưa liệt kê hết.
- Không chạy test nào (chỉ soạn tài liệu).
