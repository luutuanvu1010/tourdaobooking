# Trang ghép — lượt duyệt Vận chuyển 2026-10-08 (lượt 8a và 8b)

> **Hồ sơ có ngày 2026-10-08, vai soạn, vòng 2** (đã sửa theo phiếu kiểm độc lập và quyết định của người điều phối). Bắt buộc theo `CLAUDE.md` §9 ("bước ghép khi duyệt"): lượt có ≥ 2 quyết định, và bảng suất `vc_trip_allocation` nhận thêm một **người ghi** mới (máy, thay mặt người sửa đơn). Trang này ghép năm văn bản cùng thư mục:
> - lượt **8a**:
>   - `01-tom-adr-0063-so-khach.md` — ADR-0063 D1, văn phòng sửa số khách sau xác nhận;
>   - `02-de-xuat-adr-dieu-chinh-khan-cap-va-dong-bo-chuyen.md` — ADR-0104 (số tạm), Đ1 Điều chỉnh khẩn cấp và Đ2 Đồng bộ chuyến theo đơn;
> - lượt **8b**:
>   - `03-de-xuat-adr-nut-chi-duong.md` — ADR-0105 (số tạm), nút Chỉ đường;
>   - `04-moc-chup-khoang-nghi.md` — ADR-0106 (số tạm), mốc chụp khoảng nghỉ (N3);
>   - `05-ban-hang-xac-nhan-don-sat-gio.md` — ADR-0107 (số tạm), Bán hàng tự đóng dấu đặt gấp (câu Q-3 cũ).
>
> Mọi số ADR là số tạm, chốt khi gộp. Mọi `tệp:dòng` đo @ `809918d5`, trừ chỗ ghi rõ nhánh khác.

## Cho chủ dự án

Năm văn bản trong thư mục này chứa sáu quyết định đụng tới quyền hoặc dữ liệu, mà luật bạn duyệt ngày 24/9 chỉ cho tối đa ba quyết định như vậy trong một lượt duyệt. Vì thế tôi chia làm hai lượt, mỗi lượt đúng ba quyết định. Lượt 8a gồm sửa số khách (tệp 01), Điều chỉnh khẩn cấp và Đồng bộ chuyến (tệp 02); ba việc này móc vào nhau, vì sửa số khách xong thì máy đồng bộ chuyến ngay. Lượt 8b gồm nút Chỉ đường (tệp 03), mốc chụp khoảng nghỉ (tệp 04) và việc cho Bán hàng tự duyệt đơn đặt sát giờ (tệp 05); hai việc đầu đứng riêng hẳn, còn tệp 05 chỉ mượn nhãn "Điều chỉnh khẩn cấp" của lượt 8a (nếu lượt 8a không qua thì giữ nhãn "Đặt gấp"), nên duyệt sau không làm chậm lượt 8a. Ghép lại, tôi không thấy lỗ nào mới, nhưng có những chỗ bạn nên biết:

1. **Người không có quyền xếp xe vẫn làm ghế trên xe thay đổi.** Khi hướng dẫn viên, đối tác hay thực tập huỷ đơn hoặc bớt khách, máy trả ghế trên xe. Việc này cố ý, và máy chỉ chạm ghế của đúng đơn đó, không bao giờ đổi xe, tài xế hay giờ chạy.
2. **Hai người cùng đụng một chuyến đúng lúc.** Nếu cả hai đều đang xếp xe, máy chỉ ghi cho người bấm trước, người kia được báo bấm lại. Nếu một người đang sửa đơn (máy đồng bộ chuyến theo), phần sửa đơn của người đó vẫn được lưu, chỉ phần chuyến bị bỏ qua và chuyến bị giữ để người xếp xe xem lại. Không có trường hợp ghi đè lẫn nhau.
3. **Sửa đơn và sửa chuyến ghi chung một lần**, đúng luật nền "tất cả hoặc không có gì". Muốn vậy, một bài kiểm tự động về thứ tự ghi phải được nới có tên cho kiểu ghi này, nên câu duyệt của tệp 02 có ghi điều đó.
4. **Xe đang chạy thì máy không tự ghi gì.** Máy chỉ nhắc văn phòng bấm "Báo huỷ" như hôm nay, vì luật xe đang chạy chỉ cho làm từng khách bằng tay.
5. **Chữ "Phá lệ" vẫn còn** cho đổi xe, đổi tài xế, huỷ chuyến còn khách, khoảng nghỉ và cam kết xe riêng, là việc riêng của Quản trị (nếu bạn chọn Q-1 a). Điều này không trái lời bạn "không dùng xin phá lệ", vì không còn nút xin hay bước chờ duyệt nào: ai có quyền thì tự làm, ai không có thì không thấy nút.
6. **Địa chỉ nhà khách có thể ra ngoài** qua nút Chỉ đường (lượt 8b). Đây là chỗ duy nhất dữ liệu đi khỏi Nền tảng; tôi đã giới hạn trong ngày chạy, và câu duyệt của tệp 03 ghi rõ bạn chấp nhận rủi ro này.

Sổ "dừng dây chuyền" (danh sách lỗ an ninh đang mở có hạn vá) không có lỗ nào nằm dưới các việc này, với điều kiện máy đồng bộ chuyến trong chính lần bấm của người. Riêng việc sửa số khách (tệp 01) đứng sát mục "bút toán điều chỉnh phải có người duyệt". Tôi đọc mục đó là không áp cho số khách trên đơn, và câu duyệt của tệp 01 có một câu để chính bạn xác nhận; nếu bạn không xác nhận, tệp 01 phải chờ vá mục đó hoặc bạn gia hạn.

**Câu duyệt gợi ý cho cách chia:** "Lượt 8a duyệt tệp 01 và 02; lượt 8b gồm tệp 03, 04, 05 duyệt sau."

---

## Phần kỹ thuật

### 1. Đếm quyết định chạm quyền / dữ liệu (trần 3 mỗi lượt — `CLAUDE.md` §9)

| Lượt | # | Quyết định | Chạm | Tệp |
|---|---|---|---|---|
| 8a | 1 | ADR-0063 D1 — văn phòng sửa số khách sau xác nhận | quyền (route mới cho ô sẵn có), tiền, dữ liệu | 01 |
| 8a | 2 | ADR-0104 Đ1 — Điều chỉnh khẩn cấp (lệnh khách trên chuyến) | quyền (ô mới, ô đổi nghĩa) | 02 |
| 8a | 3 | ADR-0104 Đ2 — Đồng bộ chuyến theo đơn | dữ liệu (máy ghi suất, view công bố mới), quyền (ngoại lệ có tên) | 02 |
| 8b | 4 | ADR-0105 — nút Chỉ đường | dữ liệu (khoá DTO mới, view công bố mới, dữ liệu ra bên thứ ba) | 03 |
| 8b | 5 | ADR-0106 — mốc chụp khoảng nghỉ (N3) | dữ liệu (mốc chụp chính sách, Hiến chương 5.6) | 04 |
| 8b | 6 | ADR-0107 — Bán hàng tự đóng dấu đặt gấp (Q-3 cũ) | quyền (`order.leg.short_notice`), siết route | 05 |

### 2. Bảng bị chạm và loại thực thể chứa trong đó

| Bảng (module chủ) | Chứa loại nào | Thay đổi |
|---|---|---|
| `order_money_adjustment` (orders, `migrations/0021_order_money_adjustment.sql:5`) | điều chỉnh sau xác nhận của **mọi loại đơn**: đơn Bán hàng lập, đơn Đối tác (đại lý) lập, đơn Thực tập lập | #1: thêm người ghi văn phòng (Kế toán, Quản trị mọi đơn; Bán hàng đơn mình lập). Đơn đối tác chỉ văn phòng sửa được (PARTNER `none`). |
| `ord_passenger` (orders, `0035:8`) | người đi thật: khách lẻ, khách đoàn — **dữ liệu cá nhân** | không ghi mới. #3 đọc danh sách qua view `v_ord_*` sẵn có để so khoá người. |
| `ord_transfer_leg` (orders, `0034:7`; cột `short_notice_*` `0040:8-11`) | chặng đưa đón của dịch vụ trong đơn | #6: Bán hàng ghi dấu đặt gấp; mọi người chỉ ghi được khi chặng đang dưới mốc. |
| `vc_trip_allocation` (van-chuyen, `0042:121-135`) | suất `PASSENGER` (khách của chặng thuộc đơn — mọi loại đơn trên) và suất `CREW` (người đi kèm, gắn hồ sơ bên `crew_party_id`) | #2: Bán hàng ghi suất `PASSENGER` trong mốc. #3: **người ghi mới** — máy, thay mặt người sửa đơn (có thể là HDV, Đối tác, Thực tập, Kế toán): chỉ suất `PASSENGER` của chặng thuộc đúng đơn, chỉ chuyến `PLANNED`; **không đụng suất `CREW`**, **không** đụng cột `office_cancel_*` (phiếu C1). |
| `vc_leg_appt_ack` (van-chuyen, `migrations/0043_nhac_goi_bao.sql:14`) | mốc giờ hẹn của chặng (`XEP`, `DA_GOI`, `BO_DANH_DAU`) — không tên, không SĐT | #2: lệnh xếp khẩn cấp lần đầu chụp `XEP` như hôm nay. #3: không ghi (chặng đã có mốc khi mở thêm suất; trigger `vc_trip_allocation_needs_appt` `:79-81` là lưới). |
| `vc_trip` (van-chuyen) | chuyến | #2, #3: câu cổng `version`; #3 thêm điều kiện `status = 'PLANNED'` và dấu thắng của lệnh đơn. #5: `rest_minutes_snapshot` chụp lại theo mốc. |
| `vc_trip_event` (van-chuyen, `0042:153`) | sự kiện chuyến | #2: dùng cột `override_*` có sẵn. #3: loại mới `ALLOCATION_ORDER_SYNCED`, mỗi chuyến một mã lệnh. |
| `vc_trip_stop` (van-chuyen, `0042:87`) | điểm dừng; `place_text` có thể là **nhà riêng khách** | #3: bỏ điểm hết khách. #4: chuỗi đích (đã che) ra DTO tài xế và ra Google. |
| `vc_reason` (van-chuyen, `0041:108`) | danh mục lý do — dữ liệu Quản trị sửa | #2: nhãn nhóm `PHA_LE` trên giao diện đổi thành "Điều chỉnh khẩn cấp, phá lệ". Không thêm mã mới. |
| `loc_location` (locations, `0010:13-25`) qua view mới | văn phòng, quầy vé, bến tàu, bến cảng (`0010:10-11`), khách sạn, sân bay, ga cáp treo (`0034:37`) — **nơi kinh doanh, không phải nhà riêng** | #4: view công bố mới `id, address, active`. |
| `audit_log` (audit) qua view mới `v_aud_order_cmd` | nhật ký; view chỉ lộ `id, order_id, action` của bảy hành động đơn | #1: hành động `order_money_adjusted` (khai ở ADR-0062, gói A3). #3: `trip_order_synced`, `staff_id` = người sửa đơn; `van-chuyen` đọc view để biết lệnh đơn đã thắng. |
| tin chuyến cho tài xế (`thongbao`, danh sách `src/shared/tin-chuyen.ts:8-12`) | tin tới tài xế `DRIVER` (sau này `DRIVER_PARTNER`) | #2, #3: thêm hành động. |

### 3. Dòng bản đồ quyền chạm các bảng trên, áp cho loại nào

| Ô (`src/shared/permissions.ts`) | Giá trị (SALES, ACC, ADMIN, FIELD, PARTNER, SA, INTERN, DRIVER, DRIVER_PARTNER, HR) | Đổi | Áp cho |
|---|---|---|---|
| `order.money.edit` `:95` | own, any, any, assigned, none, any, none, none, none, none | giá trị **không** đổi; #1 thêm route văn phòng; **nghĩa rộng ra** (#3): sửa xong kéo theo ghi suất | mọi đơn đã xác nhận, kể cả đơn đối tác (chỉ văn phòng) |
| `trip.urgent_adjust` (mới, 8a) | any, none, any, none, none, any, none, none, none, none | mới | lệnh xếp / rút / dời / thêm khi chạy, trên suất `PASSENGER` của **mọi đơn** — cùng phạm vi `trip.dispatch` hôm nay |
| `trip.override` `:189` | none, none, any, none, none, any, … | giá trị không đổi; **nghĩa hẹp lại**: đổi xe, đổi tài xế, huỷ chuyến còn khách (vượt mốc); khoảng nghỉ; cam kết | mọi chuyến |
| `trip.dispatch` `:188` | any, none, any, none, none, any, … | không đổi; nút "Cập nhật khách theo đơn" gỡ thêm được đơn huỷ, chặng đóng, thừa suất | mọi chuyến |
| `order.modify` `:79`, `order.passenger.write` `:88`, `order.cancel` `:96`, `order.trip.edit` `:80` | không đổi | **nghĩa rộng ra** (#3): huỷ đơn, đổi người, bỏ / thay chặng, đổi số người kéo theo ghi suất. PARTNER `own`, INTERN `own`, FIELD `assigned` (`order.cancel`) | suất của đúng đơn đó |
| `order.leg.short_notice` `:83` (8b, #6) | none → **any** cho SALES | đổi | **mọi chặng của mọi đơn**, như Quản trị hôm nay; siết thêm "đang dưới mốc" cho mọi người |
| `trip.view` / `trip.progress` (tài xế) | DRIVER `assigned`; DRIVER_PARTNER `none` (Đợt 6 chưa mở) | không đổi; DTO thêm khoá `diaChiChiDuong` trong ngày chạy (8b, #4) | chuyến mình lái |

- **Ngoại lệ có tên (#3):** người không giữ `trip.dispatch` vẫn làm máy ghi suất. Đây là ghi **suy ra** từ lệnh đơn họ được phép làm, không phải quyền xếp xe. Bài kiểm: HDV gọi route xếp vẫn 403.
- **Hàng rào "mỗi ô phải được máy chủ hỏi"** (`src/permission-enforcement.test.ts:9-14`): ô mới phải có `can(…, "trip.urgent_adjust")` viết tường minh trong `src/modules/`. Không khai hoãn.
- Thi công ô mới phải sửa `src/shared/permissions.test.ts:95` (bảng ADR trong bài) và `src/shared/tro-ly-cau-truc.test.ts:38-39` (mọi ô có tên trong `TEN_THAO_TAC`).
- Không thêm mã quyền, nên các bài "tập con quyền" và `EXTERNAL_PERMISSIONS` không đổi.

### 4. Cổng nào canh cửa nào (máy chủ + giao diện)

**Máy chủ**

| Cửa | Cổng hôm nay | Sau lượt |
|---|---|---|
| Lệnh xếp / rút / dời / đổi / huỷ chuyến có phá lệ (`src/modules/van-chuyen/index.ts:1124, 1197, 1230, 1277, 1325, 1348, 1373`) | `(phaLe ‖ nghiPhaLe ‖ camKetPhaLe) && !can(trip.override)` | (8a) cờ mốc hỏi theo `lopVuotMoc`: `trip.urgent_adjust` hoặc `trip.override`; khoảng nghỉ, cam kết vẫn `trip.override` |
| Route văn phòng sửa số khách (#1) | chưa có | `can(order.money.edit, { ownerId })`, không `assigned` |
| Hook đồng bộ trong tám route ghi đơn (tệp 02 Đ2 mục 4, gồm C14 `replace`) | — | không hỏi ô (ngoại lệ có tên); phạm vi = `orderId`; câu cổng mỗi chuyến: `version` + `status = 'PLANNED'` + `EXISTS (SELECT 1 FROM v_aud_order_cmd WHERE id = :auditIdDon)`; trần 74 câu phần chuyến |
| Bài thứ tự lô (`src/modules/van-chuyen/thu-tu-lo.test.ts:4, :12-13`) | cổng chuyến đứng đầu lô | ngoại lệ có tên cho lô chung đơn + chuyến (nới — chủ duyệt trong câu duyệt tệp 02) |
| Đặt gấp (`src/modules/orders/index.ts:930-958`) | ô `order.leg.short_notice`; **không** kiểm đang dưới mốc | (8b) + kiểm dưới mốc lúc gửi |
| Lưới cuối trong CSDL | trigger LC-02 sức chứa, LC-15 xe đang chạy (`0076:58-80`), báo huỷ (`0076:46-54`), mốc giờ hẹn (`0043:79-81`) | **không đổi** — mọi đường mới đi dưới các trigger này |
| DTO tài xế (`src/modules/van-chuyen/tai-xe-dto.ts:37`) | dựng từng khoá; tên / năm sinh / liên hệ chỉ `trongNgay` | (8b) + `diaChiChiDuong` chỉ `trongNgay`; bài khoá `tai-xe-dto.test.ts:11` nới có tên |

**Giao diện — ẩn/hiện (đổi điều kiện hiện nút hay dòng khoá)**

| Chỗ | Hôm nay | Sau | Lượt |
|---|---|---|---|
| `canQuyen` (`src/modules/van-chuyen/dieu-phoi-route.ts:96`) → mở hộp xác nhận (`web/dieu-phoi-ui.ts:57-62`, dòng "Cần Quản trị phá lệ." `:62`) | = `can(trip.override)` | = người gọi có **đủ** ô cho mọi luật đang thiếu: mốc theo lớp lệnh, khoảng nghỉ và cam kết cần `trip.override`. Bán hàng thiếu cả mốc lẫn khoảng nghỉ → không mở hộp | 8a |
| Chi tiết chuyến `web/chuyen.ts:44-45` (`coPhaLe`), dùng ở `:121` (dải khoá), `:685` (chọn chặng bị khoá), `:763` (nút rút / chuyển trong vùng khoá), `:772` (dòng khoá) | nút chỉ hiện cho `trip.override` | lệnh khách hiện theo `trip.urgent_adjust` | 8a |
| Thêm khách khi xe chạy `web/chuyen.ts:657-660` (`KHOA_THEM_DIEM`) | Bán hàng thấy dòng khoá "cần Quản trị phá lệ" | Bán hàng thêm được (lớp khẩn cấp), dòng khoá bỏ | 8a |
| Bảng điều phối `web/dieu-phoi.ts:47` (`co.phaLe`), dùng ở `:438` | ghi chú vùng khoá theo `trip.override` | theo `trip.urgent_adjust` | 8a |
| Dòng khoá màn điều phối `src/shared/dieu-phoi-man.ts:118, :138, :212` | quyết theo `co.phaLe` | theo lớp lệnh | 8a |
| Sửa chuyến `web/chuyen-sua.ts:181`, nút `:294` "Phá lệ và lưu" | đổi xe / tài xế cần Quản trị phá lệ | **không đổi** (Q-1 a) | — |
| Nút đặt gấp `web/order-form.ts:599`, `web/order.ts:257, :930, :1065` | chỉ Quản trị, Toàn quyền thấy | Bán hàng thấy; chỉ bật khi chặng đang dưới mốc | 8b |
| `web/cuoc-chuyen.ts` | không có nút | nút Chỉ đường hiện khi DTO có `diaChiChiDuong` | 8b |

**Giao diện — chỉ đổi chữ**

| Chỗ | Chữ hôm nay | Chữ sau | Lượt |
|---|---|---|---|
| Hộp xác nhận `web/dieu-phoi-ui.ts:120, :126, :127` | "Lý do phá lệ", tiêu đề "Phá lệ", "Việc phá lệ ghi vào nhật ký…" | lớp khẩn cấp: "Điều chỉnh khẩn cấp"; lớp Quản trị giữ "Phá lệ" | 8a |
| Nút `web/chuyen.ts:739, :896, :928`; `web/dieu-phoi.ts:503` | "Phá lệ và thêm / rút / chuyển / xếp" | "Điều chỉnh khẩn cấp và …" khi chỉ thiếu mốc | 8a |
| Nút `web/chuyen.ts:966` | "Phá lệ và huỷ" (huỷ chuyến còn khách) | không đổi (Q-1 a) | — |
| Nhãn nhóm lý do `src/shared/dieu-phoi-kieu.ts:19` | "Phá lệ" | "Điều chỉnh khẩn cấp, phá lệ" | 8a |
| `src/shared/ly-do-giu.ts:58-59` | `MOC_TOI_THIEU` "cần Quản trị phá lệ", `aiXuLy: "QUAN_TRI"` | "người xếp xe điều chỉnh khẩn cấp" (lệnh khách); giữ Quản trị cho `KHOANG_NGHI` | 8a |
| Hướng dẫn `src/shared/huong-dan-ban-hang.ts:124, :126, :142` | "cần Quản trị", "nhờ Quản trị" | viết lại cùng lần phát hành | 8a |
| `src/shared/huong-dan-ban-hang.ts:146` | sửa số khách "đang chờ làm" | mô tả nút mới | 8a (#1) |
| Tên ô cho trợ lý Mai `src/shared/tro-ly-cau-truc-ten.ts:124-125` | "phá lệ khi điều xe … mốc tối thiểu, khoảng nghỉ" | thêm mục `trip.urgent_adjust`; bỏ "mốc" lệnh khách khỏi `trip.override` | 8a |
| Nhãn "Điều chỉnh khẩn cấp" trên lịch / chi tiết chuyến | chưa có | mới, chỉ từ sự kiện lệnh khách; **không** dán lên đổi xe / tài xế của Quản trị; **không** vào DTO tài xế | 8a |
| Phản hồi lệnh đơn + màn "Xe đang chạy" | — | câu nhắc "văn phòng bấm Báo huỷ" khi đơn có khách trên xe đang chạy | 8a |
| `src/shared/dat-gap-hien-thi.ts:28, :59`; `web/dat-gap-ui.ts:101`; `src/shared/order-errors.ts:90`; `huong-dan-ban-hang.ts:152-155`; `huong-dan-doi-tac.ts:92`; `tro-ly-cau-truc-ten.ts:75` | "Quản trị đã duyệt", "Cần Quản trị duyệt đặt gấp" | "Điều chỉnh khẩn cấp" | 8b |
| Ô điểm đón gõ tay trên đơn | không nhắc | dòng nhắc "chỉ ghi địa chỉ" | 8b |

### 5. Ghép lại có sinh lỗ không

| Tổ hợp | Rủi ro | Chặn bởi |
|---|---|---|
| #1 + #3: Kế toán bớt khách đơn đối tác → máy đóng suất trên xe ghép | ghi đúng ý; người sửa không có `trip.dispatch` | ngoại lệ có tên; phạm vi đúng đơn; nhật ký mang `staff_id` Kế toán |
| #2 + #3 cùng chuyến cùng lúc | ghi đè lẫn nhau | câu cổng `version`. Lệnh xếp thua → cả lệnh xếp không ghi, 409, người bấm lại. Đồng bộ thua → phần đơn vẫn ghi, phần chuyến bỏ, chuyến giữ (Hiến chương 5.7) |
| Lệnh đơn thua cổng của đơn | ghế bị đóng cho đơn không hề bị huỷ | câu cổng chuyến hỏi `v_aud_order_cmd` (tệp 02 Đ2 mục 2, phương án a) |
| #2 RUT một khách vẫn còn trong đơn, rồi #3 chạy khi đơn đổi | máy mở lại suất vừa bị rút? | Không: luật (iv) chỉ mở thêm **đúng số người lệnh đơn đó vừa tăng**; khách bị rút vẫn thiếu suất, chuyến giữ `THIEU_SUAT`. **Người lập kế hoạch phải viết bài cho ca này** |
| #3 trên xe đang chạy | đóng suất hay đặt cờ trái LC-15 / D5.2 | máy không ghi gì, chỉ nhắc Báo huỷ; trigger `0076` là lưới cuối |
| HDV / Đối tác huỷ đơn → #3 | leo thang quyền qua hook | hook không nhận tham số chuyến từ người gọi; không trả dữ liệu chuyến |
| Đơn đoàn lớn → #3 | lô quá dài | trần 74 câu phần chuyến; vượt thì chỉ báo |
| #6 + mốc | đóng dấu đặt gấp sớm để né mốc | kiểm "đang dưới mốc lúc gửi" cho mọi người |
| #6 + #2 | Bán hàng vừa đóng dấu vừa xếp khẩn cấp | cùng lý do, cùng nhãn; không mở quyền ngoài lời chủ 2/10 |
| #4 + tài xế đối tác (Đợt 6) | thấy địa chỉ nhà khách ngoài khung | khoá theo `trongKhungXemKhach` (ADR-0053 D7.2) |
| #4 + chữ tự do có SĐT | SĐT ra Google | `maskLongDigits` (≥ 8 chữ số); SĐT viết tách nhóm ngắn hơn 8 chữ số **không** bị che — chỉ có dòng nhắc (dựa vào kỷ luật) |
| #5 + #2 | đổi giờ khẩn cấp làm khoảng nghỉ lệch | #5 chỉ áp cho lệnh sửa chuyến; lệnh khách không chụp lại khoảng nghỉ |

### 6. Sổ dừng dây chuyền (`docs/quyen-hoan.json`, đọc 2026-10-08)
- Mục HIGH đang mở:
  - TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2 (hạn 2026-10-31);
  - HC-5.11 (hạn 2026-11-15, tác vụ tự động không định danh).
- **#2–#6: không xây trên lỗ đang hở.** Điều kiện của #3: chạy trong lô lệnh của người, ghi `staff_id` người đó. Đổi sang chạy nền thì phải ghi "xây trên lỗ đang hở: HC-5.11".
- **#1:** đứng sát TNV-G4 và HC-4.2. Tệp 01 mục C giữ cách đọc hẹp HC-4.2:
  - chữ gốc Hiến chương hệ thống 4.2 (`HIEN-CHUONG-HE-THONG.md:62`) không ghi "khác người tạo";
  - phạm vi chữ của mục sổ là sổ công nợ và chi phí chuyến;
  - HDV đã sửa một mình qua `handler-money-edit`.
  - Tệp 01 cũng ghi rõ lập luận ngược chiều: billing đọc phải thu tính từ dòng điều chỉnh; `docs/ARCHITECTURE.md:145` xếp bảng này vào hàng 4.2 / 5.5.
  - Chủ tự xác nhận cách đọc trong câu duyệt tệp 01. Không xác nhận → #1 mang dòng "xây trên lỗ đang hở: HC-4.2" và rời lượt 8a.
- Mục hoãn `thao_tac` (`task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue`): không dùng.

### 7. Lời chủ mâu thuẫn với quyết định đã duyệt

| Lời chủ | Quyết định đã duyệt | Xử lý trong lượt |
|---|---|---|
| "Điều phối viên (Dispatcher) và Quản trị" | Nền tảng không có vai Điều phối viên; người giữ `trip.dispatch` là Bán hàng, Quản trị, Toàn quyền (`permissions.ts:188`) | đọc theo chat 8/10 "Bán hàng và Quản trị" |
| điều động / rút khách sát giờ cho người xếp xe | ADR-0049 `:29`, `:162`, `:200`, `:365` (ĐP3: chỉ Quản trị, Toàn quyền phá lệ) | thay bằng ADR-0104 Đ1 |
| (cùng ý, xe đang chạy) | ADR-0052 `:98` D5.1: thêm khách khi chạy, trong mốc, chỉ Quản trị, Toàn quyền | thay bằng ADR-0104 Đ1 |
| (Q-3, lời chủ 2/10 câu 5) | ADR-0049 `:161`: đặt gấp chỉ Quản trị, Toàn quyền | lượt 8b, ADR-0107 (tệp 05) |
| "lệnh máy tự động 'Đồng bộ chuyến theo đơn'… tự giải phóng/mở lại suất" | ADR-0050 `:219-221`, `:361` + Q-L1-2 (chủ chọn "Giữ chuyến tới khi cập nhật"); sổ hỏi đáp lần 16 R-P29 ("Giữ xe + nút cập nhật") | thay bằng ADR-0104 Đ2 cho huỷ / bớt / thêm / đổi người / bỏ chặng trên xe chưa chạy; đổi **nơi** vẫn giữ + nút |
| (cùng ý) | ADR-0049 `:129` LC-09 "Đơn huỷ sau khi xếp → giữ" | thay bằng ADR-0104 Đ2; xe đang chạy chỉ nhắc Báo huỷ (ADR-0052 D5.2 không đổi) |
| "lệnh máy **tự động**" | Hiến chương 5.11 (`docs/ARCHITECTURE.md:111`) — tác nhân tự động cần tài khoản riêng; Hiến chương đứng trên ADR | **không** làm tác nhân tự động: chạy trong lô lệnh của người. Nếu chủ muốn chạy nền thì cần sửa Hiến chương hoặc tài khoản máy riêng, và vướng HC-5.11 |
| "(lenhCapNhatKhach) để tự giải phóng… khi Bán hàng hủy/bớt khách" | không phải ADR mà là sự thật mã: `lenhCapNhatKhach` hôm nay **bỏ qua** đơn huỷ và chặng đóng (`dieu-phoi-lenh.ts:619`), không đóng suất thừa chưa tên | Đ2 mở rộng luật thuần, dùng chung cho nút tay |
| "bắt buộc chọn/**nhập** lý do" | không phải ADR: lựa chọn "Chưa làm" ô chữ tự do trong chuyến (BL-GHI-CHU-CHUYEN, `docs/BACKLOG.md:186`) | chỉ **chọn**; "nhập" để khi mở BL-GHI-CHU-CHUYEN |
| "truyền địa chỉ/**tọa độ**" | chưa có toạ độ; BL-VC-TOA-DO cần ADR nhỏ của `locations` (`docs/BACKLOG.md:199`) | ADR-0105 chỉ gửi địa chỉ / tên |
| Bán hàng "người lập" sửa số khách (tệp 01) | ADR-0014 `:86` liệt kê sửa số khách trong phần "người phụ trách cấp đầy đủ" | giữ lời chủ (`own`); nêu ở tệp 01 |

### 8. Chưa kiểm
- Toàn bộ là thiết kế trên giấy: chưa chạy mã, chưa thử tranh chấp đồng thời trên D1, chưa xem production.
- Thử nghiệm "đọc `v_aud_*` từ `van-chuyen` thì bài kiến trúc xanh" là của người kiểm; người soạn chưa tự chạy.
- Giới hạn số câu mỗi lần gọi D1 theo gói hiện hành (trần 74 lấy theo lô lớn nhất đang có, không theo giới hạn của Cloudflare).
- Thân ADR-0096, ADR-0097 (đón trước trả, cửa sổ xuất bến, sự kiện `CORRECTION`) chưa đối chiếu với Đ2.
- Các việc đang thi công song song trên nhánh khác (C14 thay chặng; A3 tin đơn đổi; N3, C38, C27) có thể dời số dòng các route đã trích.
