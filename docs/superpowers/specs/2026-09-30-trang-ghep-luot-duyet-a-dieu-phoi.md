# Trang ghép — lượt duyệt A của Bảng điều phối chung (ADR-0052, ADR-0053, ADR-0054 — số tạm)

- **Loại:** trang ghép bắt buộc theo `CLAUDE.md` §9 ("bước ghép khi duyệt", chủ duyệt 2026-09-24): lượt duyệt gồm ≥ 2 quyết định, và bảng dùng chung (`ord_passenger`, `vc_trip*`, `vc_unavailability`) nhận thêm loại người đọc/ghi. Không phải ADR; mô tả các đề xuất ghép lại.
- **Ngày:** 2026-09-30. AI soạn (vai lập kế hoạch). Chưa có người kiểm độc lập.
- **Ba đề xuất:**
  - `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-2.md` — **ADR-0052**: D4 chuyển điểm đón + máy tự xác nhận; D5 thêm điểm / báo huỷ khi xe chạy (LC-15 mới); D6 thông báo, Bảng tin chuyến; **D5c** cứu hộ (văn phòng bấm thay qua `trip.progress`); **D5b** tài xế ghi tên khách vào `ord_passenger`;
  - `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-3.md` — **ADR-0053**: D7 tài xế đối tác dùng app (**cửa một chiều**); D8 Từ chối chuyến; D9 Báo bận;
  - `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-4.md` — **ADR-0054**: D10 chiều về theo dịch vụ.

## 0. Cách duyệt — ba lượt, không phải một (trần 3 của `CLAUDE.md` §9)

Gói A có **9 quyết định** chạm dữ liệu/quyền (người kiểm độc lập V6: cứu hộ D5c và đường ghi tên của tài xế D5b là hai quyết định riêng). `CLAUDE.md` §9: mỗi lượt duyệt tối đa **3**. Vì vậy gói này là **một bộ hồ sơ để người kiểm xem một lần**, nhưng chủ duyệt **bốn lượt riêng**:

| Lượt | ADR | Quyết định | Duyệt khi | Câu chờ chủ |
|---|---|---|---|---|
| A-1 | 0052 | D4 (chuyển điểm), D5 (thêm điểm, báo huỷ, LC-15), D6 (thông báo) | sau khi các mục luật của ADR-0049 được chủ duyệt lúc gộp ([HĐ] lần 16 mục 1.1) | Q-L2-A, Q-L2-B |
| A-1b | 0052 (phần sau) | D5c (cứu hộ — bấm thay qua `trip.progress`), D5b (tài xế ghi tên khách) | sau A-1; **không** ghép sẵn với A-3 (D10 có thể tách thành hai quyết định theo Q-L4-A/B — đếm lại sau khi chủ trả lời) | không |
| A-2 | 0053 | D7, D8, D9 | **sau** A-1 (dùng ô và luật người nhận của 0052); ô `trip.passenger.add` của tài xế đối tác chỉ mở nếu A-1b đã duyệt | Q-L3-A, Q-L3-B, Q-L3-C |
| A-3 | 0054 | D10 | lúc nào cũng được (độc lập) | Q-L4-A, Q-L4-B |

**Nền chung:** cả ba xây trên ADR-0047, ADR-0049, ADR-0050, ADR-0051 **đã duyệt nhưng CHƯA gộp `main`, CHƯA phát hành** (nhánh `thi-cong-adr-0049-tiep`; `main` dừng ở migration `0039`; `0034`, `0035`, `0040`–`0043` chưa áp remote — kiểm chỉ-đọc 30/9). `docs/quyen-hoan.json` `phat_hien` = `[]` (kiểm 30/9) ⇒ **không xây trên lỗ đang hở**. Không lượt nào đụng tiền.

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
| bảng mẫu chặng (**mới**, A-3; **chủ và tên chờ Q-L4-A** — khuyến nghị `vc_leg_template` của `van-chuyen`; `catalog_` **không** phải tiền tố module hợp lệ) | mẫu chặng theo dịch vụ, chỉ-thêm, có hiệu lực, đủ bốn cột WHO; `code` = tham chiếu logic tới mã dịch vụ | màn Danh mục (cổng `admin`); form đơn qua route đọc mẫu (cổng `orders`, `order.create`) | `admin.manage` | A-3 |
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
| `order.modify` (:77) | ownOrAssigned | none | any | none | own | any | own | none | none | chặng khi đơn nháp; A-3: theo **Q-L4-B** — (a, khuyến nghị) chỉ chép lại `pax_override` cũ / (b) ghi được khi nháp | A-3 (theo Q-L4-B) |
| `order.trip.edit` (:78) | ownOrAssigned | none | any | none | none | any | none | none | none | chặng sau xác nhận; A-3: ghi `pax_override` sau xác nhận (cả hai phương án); (a) của Q-L4-B mở thêm đường ghi khi nháp | A-3 (nghĩa) |
| `order.leg.short_notice` (:81) | none | none | any | none | none | any | none | none | none | cột đặt gấp của `ord_transfer_leg` — không đổi | — |
| `order.leg.short_notice.view` (:85) | any | any | any | none | none | any | none | none | none | xem đủ dấu đặt gấp trên `ord_transfer_leg` — không đổi; A-3 thêm cột vào cùng bảng, không đổi ai xem dấu đặt gấp | — |
| `contact.view` (:75) | any | any | any | assigned | ownOrAssigned | any | own | none | none | **không đổi**. SĐT người liên hệ tới tài xế là **ngoại lệ có tên** dưới `trip.view` + khung (ADR-0049 D3; A-2 D7.2 cho người ngoài) | — |
| `settings.ops` (:109) | none | none | none | none | none | any | none | none | none | `vc_dispatch_policy` + 3 cột mới | A-1, A-2 (nghĩa) |
| `admin.manage` (:100) | none | none | any | none | none | any | none | none | none | `vc_reason` + 2 nhóm; bảng mẫu chặng (Q-L4-A) | A-2, A-3 (nghĩa) |
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
| Lưu chặng (`pax_override`) | `orders` | theo Q-L4-B: (a, khuyến nghị) chỉ `order.trip.edit` (cả nháp — đường mới); (b) `order.modify` (nháp) + `order.trip.edit` (đã xác nhận) | `CHECK` `pax_override` | A-3 |
| Hộp thông báo, gõ cửa, Bảng tin | `staff` (có sẵn) | hàm thuần người nhận: `can(trip.view, …)` hiện hành + dòng lái có hiệu lực lúc sự kiện; nhãn `dieu-xe` = `trip.view` không ngữ cảnh | — | A-1 |
| Hợp đồng giữa các phần | — (không phải route) | hàm hẹp `orders` (`lichChungChang` :268, `hanhKhachChoChuyen` :193, `lienHeChoTaiXe` :319, **câu ghi hành khách của tài xế** mới) không tự kiểm quyền → bài quét "nơi gọi đứng sau `can()`"; hàm tiêm `ctx.baoThayDoiChuyen`, `ctx.chuyenLienQuan` (A-1); hàm khung `trongKhungXemKhach` (A-2) và `soNguoiChang` (A-3) là **một nguồn** | — | A-1…A-3 |

- `DRIVER`, `DRIVER_PARTNER` vẫn **không** vào `office`, `orders`, `admin` (`src/shared/cong-quyen.test.ts` giữ).
- Không cổng mới; không đổi danh sách mã của cổng nào; không cạnh module mới (`thongbao → audit` đã có — `src/architecture.test.ts:44`; theo Q-L4-A (a) `van-chuyen` không đọc `catalog`, `orders` không import `van-chuyen`; vẫn không module nào import `van-chuyen` — `:735`).

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
7. **ADR-0050 VK1-B:** "cập nhật điểm theo đơn" trên xe đang chạy — A-1 giữ chặn tới khi chủ trả lời **Q-L2-A**. VK1-A (giờ xảy ra khi bấm thay) không áp cho gửi đề nghị (đề nghị không có "giờ xảy ra" riêng).
8. **ADR-0051:** trigger `vc_trip_allocation_needs_appt` buộc lô A-1 D5.1 ghi mốc `XEP`; lô chuyển (`TRANSFERRED`) không chụp lại (`ADR-0051:149`); phần tin đẩy MQ-07 ADR-0051 hẹn "lượt 2 D6" → A-1 D6.2.
9. **ADR-0048:** LC-1, LC-1b, `EXTERNAL_PERMISSIONS`, `laNoiBo` **không đổi** (không mã quyền mới — `CLAUDE.md` §10 không kích hoạt). Chỉ đổi giá trị ô cột `DRIVER_PARTNER` + bài ghim.
10. **ADR-0047:** A-1b mở `source = 'DRIVER'` (A2); A-3 thêm `pax_override` (A1).
11. **ADR-0022, ADR-0034, ADR-0045:** A-1 thêm nguồn tin thứ hai và loại sự kiện Bảng tin `chuyen`; không đổi luật tin đơn; đơn nháp vẫn không sinh tin.
12. **ADR-0033:** chỉ nếu Q-L4-A = (b): thêm trường `duaDon` (không tiền) vào DTO danh mục cho người lập đơn. Theo (a): không đổi.

**Với đề xuất khác đang soạn song song**
13. **Kernel lượt 2** (đề xuất ADR-0055 tạm, `2026-09-30-de-xuat-adr-kernel-luot-2.md` A1, lượt duyệt B; nguồn `2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-2.md` VK2-A — bảng này định trọn `subject` và **chặn ghi `DRIVER`** tới A-2; A-2 bỏ trigger chặn bằng migration mới): **một** bảng `vc_unavailability` (`subject` `VEHICLE`/`DRIVER`) và **một** hàm chồng giờ LC-03 cho cả xe và tài xế. Ai duyệt trước tạo bảng với đủ tập `subject`; điều phối chốt thứ tự lúc cấp số.
14. **Tiền xe thuê** (Q1–Q10 lần 16): Từ chối trước hạn không sinh phí ở lượt này; phí huỷ với nhà xe ghi tay (tiền Q7). Nhờ đón chéo không đổi tiền (tiền Q9 a: theo chuyến).

**Migration** — mọi số **≥ 0044, lấy lúc thi công** sau khi liệt kê mọi nhánh và worktree chưa gộp (`docs/adr/README.md:77`; sổ tiền, Kernel lượt 2–3 có thể lấy trước). Thứ tự phụ thuộc: `0042`/`0043` (ADR-0049/0051) → A-1 → A-2; A-3 chỉ cần `0034`. Không sửa migration đã áp remote.

---

## (5) Câu hỏi còn chờ chủ (gom một lần — lời thường, khuyến nghị đầu)

Chủ trả lời kiểu "Q-L2-A a, Q-L3-B a…". Câu nào chưa muốn trả lời thì bỏ qua — chỉ phần đó chờ.

**Q-L2-A (ADR-0052). Xe đang chạy, khách gọi báo đổi khách sạn đón (người bán đã sửa trên đơn). Văn phòng làm gì trên chuyến?**
- **(a) Cho văn phòng bấm "Cập nhật điểm theo đơn" (khuyến nghị)** — chỉ khách đang chờ, điểm chưa tới, cùng xe; tài xế nhận tin. Được: tài xế không tới nơi khách đã rời; danh sách đúng nơi thật. Mất: văn phòng làm được một việc "đổi" hẹp trên xe đang chạy.
- (b) Giữ chặn, máy chỉ báo đỏ, văn phòng gọi tài xế. Được: đúng chữ "văn phòng chỉ thêm". Mất: dữ liệu ghi sai nơi đón.

**Q-L2-B (ADR-0052). Tài xế nhờ chuyển khách sang một xe CHƯA chạy nhưng đã trong 6 giờ trước giờ chạy. Có cần Quản trị / Toàn quyền duyệt không?**
- **(a) Có — chỉ miễn khi xe nhận đang chạy (khuyến nghị).** Được: giữ nguyên luật 6 giờ bạn chọn (ĐP3). Mất: cứu hộ bằng xe mới xuất phát cần Quản trị bấm.
- (b) Không — miễn cho mọi lần chuyển giữa hai xe. Được: nhanh. Mất: có đường xếp khách vào xe chưa chạy trong 6 giờ mà không qua Quản trị.

**Q-L3-A (ADR-0053). Tài xế nhà xe đối tác có thấy MÃ ĐƠN và TÊN + SĐT NGƯỜI LIÊN HỆ của đơn (có khi là nhân viên đại lý, không phải khách) như tài xế công ty không?** (Không bao giờ thấy tiền hay chi tiết đơn; chỉ trong ngày chạy, sau hạn Từ chối.)
- **(a) Có, như tài xế công ty (khuyến nghị).** Được: tài xế tự gọi người liên hệ khi không thấy khách; khớp chữ "như tài xế công ty". Mất: người ngoài có số của nhân viên đại lý trong ngày chạy.
- (b) Chỉ tên + SĐT người liên hệ, không mã đơn. Được: kín hơn một chút. Mất: tài xế khó nói với văn phòng đơn nào.
- (c) Không liên hệ, không mã đơn — cần gọi thì gọi văn phòng. Được: kín nhất. Mất: văn phòng phải trực máy lúc đón.

**Q-L3-B (ADR-0053). Hôm nay tài xế công ty bấm "Xuất bến" từ tối hôm trước là thấy tên khách của chuyến sáng mai. Có siết lại như tài xế đối tác không?**
- **(a) Có — một luật chung: chỉ thấy khách trong ngày chạy, bấm Xuất bến sớm không mở sớm (khuyến nghị).** Được: một luật, không kẽ. Mất: chuyến rất sớm (vd 05:00) tài xế chỉ thấy danh sách từ 0 giờ.
- (b) Giữ như hiện tại (ADR-0049). Được: không đổi gì. Mất: kẽ còn đó với nhân viên.

**Q-L3-C (ADR-0053). Tài xế đối tác có được báo bận chồng lên chuyến đã được xếp cho họ không?**
- **(a) Không — phải Từ chối (nếu còn hạn) hoặc gọi văn phòng (khuyến nghị; cùng cách bạn chọn cho xe ở Q-L2-1).** Được: báo bận không thành đường né hạn Từ chối. Mất: tài xế ốm đột xuất phải gọi.
- (b) Cho ghi; chuyến bị giữ đỏ để văn phòng xếp người khác. Được: tài xế tự báo nhanh. Mất: né được hạn Từ chối.

**Q-L4-A (ADR-0054). Bảng "dịch vụ đưa đón mấy chiều" đặt ở phần nào của hệ thống?** (Màn hình vẫn nằm ở Danh mục như bạn chọn — đây chỉ là chỗ cất dữ liệu.)
- **(a) Trong phần Vận chuyển (khuyến nghị).** Được: không phải sửa luật kiến trúc; dùng khuôn bảng sẵn có. Mất: dữ liệu về dịch vụ nằm ở phần khác với danh mục giá.
- (b) Trong phần Danh mục, kèm sửa luật kiến trúc và nâng phần Danh mục lên luật chặt. Được: cùng chỗ với dịch vụ. Mất: thêm một việc sửa luật lớn hơn cả tính năng.

**Q-L4-B (ADR-0054). Khi đơn còn NHÁP, ai khai "số người chặng về"?** (Sau xác nhận: văn phòng — Bán hàng đơn mình, Quản trị, Toàn quyền.)
- **(a) Chỉ văn phòng, kể cả khi nháp (khuyến nghị — đúng lời bạn "văn phòng sửa số người chặng về").** Lưu ý: Đối tác tự xác nhận đơn của mình, nên nếu Đối tác khai số người về thì con số đó đi thẳng vào xe mà văn phòng không nhìn; sau khi xác nhận Đối tác cũng không sửa được nữa. Được: số chỗ trên xe luôn do văn phòng ghi. Mất: phải làm thêm một đường sửa; Đối tác có khách về ít người phải nhờ văn phòng.
- (b) Người lập đơn nháp, kể cả Đối tác, Thực tập với đơn của mình. Được: khai ngay lúc đặt, không thêm đường sửa. Mất: không đúng chữ "văn phòng sửa"; số người về do Đối tác khai vào xe mà văn phòng không duyệt.

## (6) Điểm người kiểm độc lập nên soi

1. Trần 3: đúng ba lượt riêng như mục 0; D6 là quyết định thứ ba của A-1.
2. **Khung thấy khách của người ngoài** (ADR-0053 D7.2) — cách đọc "giao" ĐP12 a ∩ Q1 a; ba ca giờ 06:00 / 14:00 / 23:30.
3. **Hạn Từ chối "khoá dính"** (ADR-0053 D8.2) — có kẽ nào mở lại Từ chối sau khi đã thấy khách.
4. **Ngoại lệ bấm thay cứu hộ qua `trip.progress`** (ADR-0052 D5c) — không thành đường văn phòng tự chuyển khách `STOP`.
5. Người nhận tin "cần xử lý": leo thang → `trip.override` (khác [TK] lát 2.3); MQ-07 → người qua `trip.call_ack`; mọi người nhận qua `trip.view` ⇒ Đối tác / HDV / Thực tập là người lập, phụ trách đơn **không** nhận tin chuyến (ADR-0052 D6.2).
5b. Miễn mốc 6 giờ khi chuyển điểm là **suy luận của thiết kế, chủ chưa chốt** → Q-L2-B (khuyến nghị: chỉ miễn khi xe đích đang chạy); văn phòng thêm khách vào xe đang chạy **vẫn** cần Quản trị phá lệ trừ chặng đặt gấp (ADR-0052 D5.1).
5c. Tài xế đối tác không thấy khách trước hạn Từ chối ở **mọi** nhánh (kể cả xuất bến sớm / xuất bến trong ngày trước hạn — ADR-0053 D7.2); hạn theo **cặp** (tài xế, chuyến), chỉ giảm (`vc_refuse_deadline`, D8.1–D8.2); tài xế công ty → Q-L3-B.
5d. Bảng mẫu chặng: `catalog_` không hợp lệ → Q-L4-A; ai ghi `pax_override` khi nháp → Q-L4-B.
6. `ord_passenger` nhận người ghi mới là **người ngoài** (A-2) — hàm câu ghi của `orders` và bài quét "sau `can()`" có phủ cột `DRIVER_PARTNER`.
7. Mã đơn trong DTO tài xế đối tác (G3-3).
8. LC-15 mới đủ chặt: văn phòng không rút/dời suất `RUNNING`; chỉ ba đường có tên.
9. `vc_unavailability` không thành hai bảng.

## (7) Chưa kiểm

- Mọi dòng `tệp:dòng` của mã đọc ở nhánh `thi-cong-adr-0049-tiep` ngày 30/9 (qua `git show`, không checkout); nhánh còn đổi thì số dòng lệch.
- Trạng thái production: chỉ dựa lần kiểm chỉ-đọc 30/9 do điều phối ghi ([HĐ] lần 15); phiên này **không** chạy lệnh remote nào.
- Số migration trên các nhánh `worktree-agent-*` chưa liệt kê hết.
- Không chạy test nào (chỉ soạn tài liệu).
