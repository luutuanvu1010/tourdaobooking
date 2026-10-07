# Trang ghép — lượt duyệt Vận chuyển 2026-10-08

> **Hồ sơ có ngày 2026-10-08, vai soạn.** Bắt buộc theo `CLAUDE.md` §9 ("bước ghép khi duyệt"): lượt này có ≥ 2 quyết định, và bảng suất `vc_trip_allocation` nhận thêm một **người ghi** mới (máy, thay mặt người sửa đơn). Trang này ghép ba văn bản cùng thư mục:
> - `01-tom-adr-0063-so-khach.md` — ADR-0063 D1, văn phòng sửa số khách sau xác nhận;
> - `02-de-xuat-adr-dieu-chinh-khan-cap-va-dong-bo-chuyen.md` — ADR-0103 (số tạm), Đ1 Điều chỉnh khẩn cấp và Đ2 Đồng bộ chuyến theo đơn;
> - `03-de-xuat-adr-nut-chi-duong.md` — ADR-0104 (số tạm), nút Chỉ đường.
>
> Mọi `tệp:dòng` đo @ `809918d5`.

## Cho chủ dự án

Ba văn bản trong thư mục này chứa bốn quyết định đụng tới quyền hoặc dữ liệu, mà luật bạn duyệt ngày 24/9 chỉ cho tối đa ba quyết định như vậy trong một lượt duyệt. Vì thế tôi đề nghị chia làm hai lượt. Lượt thứ nhất gồm tệp 01 và 02, tức sửa số khách, Điều chỉnh khẩn cấp và Đồng bộ chuyến; ba việc này móc vào nhau, vì sửa số khách xong thì máy đồng bộ chuyến ngay. Lượt thứ hai là tệp 03, nút Chỉ đường; việc này đứng riêng nên duyệt sau cũng không chậm việc nào khác. Ghép ba văn bản lại, tôi không thấy lỗ nào mới, nhưng có bốn chỗ bạn nên biết, liệt kê dưới đây.

1. **Người không có quyền xếp xe vẫn làm ghế trên xe thay đổi.** Khi hướng dẫn viên, đối tác hay thực tập huỷ đơn hoặc bớt khách, máy trả ghế trên xe. Việc này cố ý (tệp 02), và máy chỉ chạm ghế của đúng đơn đó, không bao giờ đổi xe, tài xế hay giờ chạy.
2. **Hai người cùng sửa một chuyến đúng lúc.** Ví dụ Bán hàng đang Điều chỉnh khẩn cấp thì Kế toán sửa số khách của một đơn trên xe đó. Máy chỉ cho một người ghi trước; việc của người kia không ghi gì, và chuyến bị giữ như hôm nay để người xếp xe xem lại. Không có trường hợp ghi đè lẫn nhau.
3. **Một lần sửa đơn thành hai bước ghi.** Máy ghi đơn trước, sau đó mới ghi chuyến. Nếu bước sau hỏng, đơn vẫn đúng còn chuyến bị giữ. Luật nền đòi mỗi lệnh "tất cả hoặc không có gì", nên người kiểm độc lập phải xác nhận cách làm này khớp luật nền. Nếu không khớp thì phải dùng cách ghi chung một lần, phức tạp hơn.
4. **Địa chỉ nhà khách ra ngoài** qua nút Chỉ đường (tệp 03). Đây là chỗ duy nhất dữ liệu đi khỏi Nền tảng; tôi đã giới hạn trong ngày chạy.

Sổ "dừng dây chuyền" (danh sách lỗ an ninh đang mở có hạn vá) không có lỗ nào nằm dưới ba việc này, với điều kiện máy đồng bộ chuyến trong chính lần bấm của người, không chạy ngầm. Có hai lỗ đứng sát bên sổ tiền, đã ghi ở tệp 01.

**Câu duyệt gợi ý cho cách chia:** "Lượt này duyệt tệp 01 và 02; tệp 03 duyệt lượt sau." Nếu bạn muốn duyệt cả bốn quyết định một lần thì cần nói rõ là bạn cho phép vượt trần lần này.

---

## Phần kỹ thuật

### 1. Đếm quyết định chạm quyền / dữ liệu (trần 3 mỗi lượt — `CLAUDE.md` §9)

| # | Quyết định | Chạm | Tệp |
|---|---|---|---|
| 1 | ADR-0063 D1 — văn phòng sửa số khách sau xác nhận | quyền (route mới cho ô sẵn có), tiền, dữ liệu | 01 |
| 2 | ADR-0103 Đ1 — Điều chỉnh khẩn cấp (+ Q-3: Bán hàng đóng dấu đặt gấp) | quyền (ô mới, ô đổi nghĩa) | 02 |
| 3 | ADR-0103 Đ2 — Đồng bộ chuyến theo đơn | dữ liệu (máy ghi suất), quyền (ngoại lệ có tên) | 02 |
| 4 | ADR-0104 — nút Chỉ đường | dữ liệu (khoá DTO mới, view công bố mới, dữ liệu ra bên thứ ba) | 03 |

- **Đề nghị:** lượt 8a = #1–#3 (móc nhau qua hook đồng bộ ở route sửa số khách); lượt 8b = #4.
- **Đếm chặt:** nếu người kiểm đếm Q-3 của Đ1 là quyết định riêng (đổi ô `order.leg.short_notice`), thì lượt 8a thành 4. Khi đó chuyển Q-3 sang lượt 8b cùng tệp 03.

### 2. Bảng bị chạm và loại thực thể chứa trong đó

| Bảng (module chủ) | Chứa loại nào | Thay đổi của lượt |
|---|---|---|
| `order_money_adjustment` (orders, `migrations/0021_order_money_adjustment.sql:5`) | điều chỉnh sau xác nhận của **mọi loại đơn**: đơn Bán hàng lập, đơn Đối tác (đại lý) lập, đơn Thực tập lập | #1: thêm người ghi văn phòng (Kế toán, Quản trị mọi đơn; Bán hàng đơn mình lập). Đơn đối tác chỉ văn phòng sửa được (PARTNER `none`). |
| `ord_passenger` (orders, `0035:8`) | người đi thật: khách lẻ, khách đoàn — **dữ liệu cá nhân** | không ghi mới. #3 đọc danh sách qua view `v_ord_*` sẵn có để so khoá người. |
| `ord_transfer_leg` (orders, `0034:7`; cột `short_notice_*` `0040:8-11`) | chặng đưa đón của dịch vụ trong đơn | #2 (Q-3 a): Bán hàng ghi dấu đặt gấp; mọi người (cả Quản trị) chỉ ghi được khi chặng đang dưới mốc. |
| `vc_trip_allocation` (van-chuyen, `0042:121-135`) | suất `PASSENGER` (khách của chặng thuộc đơn — mọi loại đơn trên) và suất `CREW` (người đi kèm, gắn hồ sơ bên `crew_party_id`) | #2: Bán hàng ghi suất `PASSENGER` trong mốc. #3: **người ghi mới** — máy, thay mặt người sửa đơn (có thể là HDV, Đối tác, Thực tập, Kế toán): chỉ suất `PASSENGER` của chặng thuộc đúng đơn; **không đụng suất `CREW`**. Xe đang chạy: chỉ cột cờ `office_cancel_*` (`0076:23-26`). |
| `vc_trip` (van-chuyen) | chuyến | #2, #3: câu cổng `version` (ADR-0049 `:98-108`). |
| `vc_trip_event` (van-chuyen, `0042:153`) | sự kiện chuyến | #2: dùng cột `override_*` có sẵn. #3: loại mới `ALLOCATION_ORDER_SYNCED`. |
| `vc_trip_stop` (van-chuyen, `0042:87`) | điểm dừng; `place_text` có thể là **nhà riêng khách** | #4: chuỗi đích (đã che) ra DTO tài xế và ra Google. |
| `vc_reason` (van-chuyen, `0041:108`) | danh mục lý do — dữ liệu Quản trị sửa | #2: nhóm `PHA_LE` đổi nhãn giao diện. #3: thêm một mã hệ thống nhóm `BAO_HUY_DIEM`. |
| `loc_location` (locations, `0010:13-25`) qua view mới | văn phòng, quầy vé, bến tàu, bến cảng (`0010:10-11`), khách sạn, sân bay, ga cáp treo (`0034:37`) — **nơi kinh doanh, không phải nhà riêng** | #4: view công bố mới `id, address, active`. |
| `audit_log` (audit) | nhật ký | #1: hành động `order_money_adjusted`. #3: `trip_order_synced`, `staff_id` = người sửa đơn. |
| tin chuyến cho tài xế (`thongbao`, danh sách `src/shared/tin-chuyen.ts:8-12`) | tin tới tài xế `DRIVER` (sau này `DRIVER_PARTNER`) | #2, #3: thêm hành động. |

### 3. Dòng bản đồ quyền chạm các bảng trên, áp cho loại nào

| Ô (`src/shared/permissions.ts`) | Giá trị (SALES, ACC, ADMIN, FIELD, PARTNER, SA, INTERN, DRIVER, DRIVER_PARTNER, HR) | Đổi | Áp cho |
|---|---|---|---|
| `order.money.edit` `:95` | own, any, any, assigned, none, any, none, none, none, none | giá trị **không** đổi; #1 thêm route văn phòng; **nghĩa rộng ra** (#3): sửa xong kéo theo ghi suất | mọi đơn đã xác nhận, kể cả đơn đối tác (chỉ văn phòng) |
| `trip.urgent_adjust` (mới) | any, none, any, none, none, any, none, none, none, none | mới | lệnh xếp / rút / dời / thêm khi chạy, trên suất `PASSENGER` của **mọi đơn** — cùng phạm vi `trip.dispatch` hôm nay |
| `trip.override` `:189` | none, none, any, none, none, any, … | giá trị không đổi; **nghĩa hẹp lại**: đổi xe, đổi tài xế, huỷ chuyến còn khách (vượt mốc); khoảng nghỉ; cam kết | mọi chuyến |
| `order.leg.short_notice` `:83` (Q-3 a) | none → **any** cho SALES | đổi | **mọi chặng của mọi đơn** (cả đơn Bán hàng khác lập, đơn đối tác) — như Quản trị hôm nay; siết thêm "đang dưới mốc" cho mọi người |
| `trip.dispatch` `:188` | any, none, any, none, none, any, … | không đổi; nút "Cập nhật khách theo đơn" gỡ thêm được đơn huỷ, chặng đóng, thừa suất | mọi chuyến |
| `order.modify` `:79`, `order.passenger.write` `:88`, `order.cancel` `:96`, `order.trip.edit` `:80` | không đổi | **nghĩa rộng ra** (#3): huỷ đơn, đổi người, bỏ chặng, đổi số người chặng kéo theo ghi suất. PARTNER `own`, INTERN `own`, FIELD `assigned` (`order.cancel`) | suất của đúng đơn đó |
| `trip.view` / `trip.progress` (tài xế) | DRIVER `assigned`; DRIVER_PARTNER `none` (Đợt 6 chưa mở) | không đổi; DTO thêm khoá `diaChiChiDuong` trong ngày chạy (#4) | chuyến mình lái |

- **Ngoại lệ có tên (#3):** người không giữ `trip.dispatch` vẫn làm máy ghi suất. Đây là ghi **suy ra** từ lệnh đơn họ được phép làm, không phải quyền xếp xe. Bài kiểm: HDV gọi route xếp vẫn 403.
- **Hàng rào "mỗi ô phải được máy chủ hỏi"** (`src/permission-enforcement.test.ts:9-14`): ô mới phải có `can(…, "trip.urgent_adjust")` viết tường minh trong `src/modules/` (tệp 02 Đ1 mục 2). Không khai hoãn.
- Không thêm mã quyền, nên các bài "tập con quyền" và `EXTERNAL_PERMISSIONS` không đổi.

### 4. Cổng nào canh cửa nào (máy chủ + giao diện)

**Máy chủ**

| Cửa | Cổng hôm nay | Sau lượt |
|---|---|---|
| Lệnh xếp / rút / dời / đổi / huỷ chuyến có phá lệ (`src/modules/van-chuyen/index.ts:1124, 1197, 1230, 1277, 1325, 1348, 1373`) | `(phaLe ‖ nghiPhaLe ‖ camKetPhaLe) && !can(trip.override)` | cờ mốc hỏi theo `lopVuotMoc`: `trip.urgent_adjust` hoặc `trip.override`; khoảng nghỉ, cam kết vẫn `trip.override` |
| Đặt gấp (`src/modules/orders/index.ts:930-958`) | ô `order.leg.short_notice`; **không** kiểm đang dưới mốc | (Q-3 a) + kiểm dưới mốc lúc gửi |
| Route văn phòng sửa số khách (#1) | chưa có | `can(order.money.edit, { ownerId })`, không `assigned` |
| Hook đồng bộ trong 7 route ghi đơn (tệp 02 Đ2 mục 2) | — | không hỏi ô (ngoại lệ có tên); phạm vi = `orderId` của lệnh; câu cổng `version` |
| Lưới cuối trong CSDL | trigger LC-02 sức chứa, LC-15 xe đang chạy (`0076:58-80`), báo huỷ (`0076:46-54`) | **không đổi** — mọi đường mới đi dưới các trigger này |
| DTO tài xế (`src/modules/van-chuyen/tai-xe-dto.ts:37`) | dựng từng khoá; tên / năm sinh / liên hệ chỉ `trongNgay` | + `diaChiChiDuong` chỉ `trongNgay`; bài khoá `tai-xe-dto.test.ts:11` nới có tên |

**Giao diện — chỗ ẩn/hiện hoặc câu chữ bị đổi nghĩa**

| Chỗ | Hôm nay nói / làm | Phải đổi |
|---|---|---|
| `canQuyen` (`src/modules/van-chuyen/dieu-phoi-route.ts:96`) → mở hộp "Phá lệ" (`web/dieu-phoi-ui.ts:57-60`) | = `can(trip.override)` | = người gọi có **đủ** ô cho mọi luật đang thiếu: mốc theo lớp lệnh, khoảng nghỉ và cam kết cần `trip.override`. Bán hàng thiếu cả mốc lẫn khoảng nghỉ → không mở hộp. |
| `src/shared/ly-do-giu.ts:58-59` | `MOC_TOI_THIEU` "cần Quản trị phá lệ", `aiXuLy: "QUAN_TRI"` | "người xếp xe điều chỉnh khẩn cấp" (lệnh khách); giữ Quản trị cho `KHOANG_NGHI` |
| `src/shared/dieu-phoi-man.ts:118, :212` | "Cần Quản trị phá lệ" | theo lớp lệnh |
| `src/shared/dat-gap-hien-thi.ts:28, :59` (Q-3 a) | "Đặt gấp — Quản trị đã duyệt"; "Cần Quản trị duyệt đặt gấp" | "Điều chỉnh khẩn cấp"; nút hiện cho Bán hàng |
| `src/shared/order-errors.ts:90` | câu lỗi nhắc Quản trị | theo Q-3 |
| Hướng dẫn `huong-dan-ban-hang.ts:124, :152, :154, :210`; `huong-dan-doi-tac.ts:92` | mô tả "nhờ Quản trị" | viết lại cùng lần phát hành |
| Nhãn "Điều chỉnh khẩn cấp" trên lịch / chuyến / đơn | chưa có | mới; **không** vào DTO tài xế |
| `web/cuoc-chuyen.ts` (#4) | không có nút | nút hiện khi DTO có `diaChiChiDuong` |
| Ô điểm đón gõ tay trên đơn (#4) | không nhắc | dòng nhắc "chỉ ghi địa chỉ" |

### 5. Ghép lại có sinh lỗ không

| Tổ hợp | Rủi ro | Chặn bởi |
|---|---|---|
| #1 + #3: Kế toán bớt khách đơn đối tác → máy đóng suất trên xe ghép | ghi đúng ý; người sửa không có `trip.dispatch` | ngoại lệ có tên; phạm vi đúng đơn; nhật ký mang `staff_id` Kế toán |
| #2 + #3 cùng chuyến cùng lúc | ghi đè lẫn nhau | câu cổng `version`; bên thua không ghi, chuyến giữ (Hiến chương 5.7) |
| #2 RUT một khách vẫn còn trong đơn, rồi #3 chạy khi đơn đổi | máy mở lại suất vừa bị rút? | Không: luật (iv) (Q-2 a) chỉ mở thêm **đúng số người mà lệnh đơn đó vừa tăng** (`tangTheoChang`), không lấp phần thiếu có từ trước; khách bị rút vẫn ở trạng thái thiếu suất, chuyến **giữ `THIEU_SUAT`**. **Người lập kế hoạch phải viết bài cho ca này.** |
| #3 trên xe đang chạy | đóng suất trái LC-15 | chỉ đặt cờ `office_cancel_*`; trigger `0076` là lưới cuối |
| HDV / Đối tác huỷ đơn → #3 | leo thang quyền qua hook | hook không nhận tham số chuyến từ người gọi; không trả dữ liệu chuyến |
| #2 (Q-3 a) + mốc | Bán hàng đóng dấu đặt gấp sớm để né mốc | kiểm "đang dưới mốc lúc gửi" |
| #4 + tài xế đối tác (Đợt 6) | thấy địa chỉ nhà khách ngoài khung | khoá theo `trongKhungXemKhach` (ADR-0053 D7.2) |
| #4 + chữ tự do có SĐT | SĐT ra Google | `maskLongDigits` (≥ 8 chữ số); SĐT viết tách nhóm ngắn hơn 8 chữ số **không** bị che — chỉ có dòng nhắc (dựa vào kỷ luật) |
| #3 hai lô (đơn, rồi chuyến) | lệch Hiến chương 1.2 "một lô ghi nguyên khối" (`docs/ARCHITECTURE.md:25`) nếu đọc chặt | **chưa giải** — người kiểm độc lập và chủ xác nhận cách đọc; phương án chặt: câu chưa chạy chung lô (5.3) |

### 6. Sổ dừng dây chuyền (`docs/quyen-hoan.json`, đọc 2026-10-08)
- Mục HIGH đang mở:
  - TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2 (hạn 2026-10-31);
  - HC-5.11 (hạn 2026-11-15, tác vụ tự động không định danh).
- **#2, #3, #4: không xây trên lỗ đang hở.** Điều kiện của #3: chạy trong request của người, ghi `staff_id` người đó. Đổi sang chạy nền thì phải ghi "xây trên lỗ đang hở: HC-5.11".
- **#1:** đứng sát TNV-G4 (sổ thiếu ràng buộc) và HC-4.2 (điều chỉnh không có người duyệt thứ hai). Tệp 01 mục C ghi: không xây trực tiếp, nhưng cách đọc HC-4.2 cần người kiểm và chủ xác nhận.
- Mục hoãn `thao_tac` (`task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue`): không dùng.

### 7. Lời chủ mâu thuẫn với quyết định đã duyệt

| Lời chủ | Quyết định đã duyệt | Xử lý trong lượt |
|---|---|---|
| "Điều phối viên (Dispatcher) và Quản trị" | Nền tảng không có vai Điều phối viên; người giữ `trip.dispatch` là Bán hàng, Quản trị, Toàn quyền (`permissions.ts:188`) | đọc theo chat 8/10 "Bán hàng và Quản trị" |
| điều động / rút khách sát giờ cho người xếp xe | ADR-0049 `:29`, `:162`, `:200`, `:365` (ĐP3: chỉ Quản trị, Toàn quyền phá lệ) | thay bằng ADR-0103 Đ1 |
| (cùng ý, xe đang chạy) | ADR-0052 `:98` D5.1: thêm khách khi chạy, trong mốc, chỉ Quản trị, Toàn quyền | thay bằng ADR-0103 Đ1 |
| (Q-3, lời chủ 2/10 câu 5) | ADR-0049 `:161`: đặt gấp chỉ Quản trị, Toàn quyền | thay nếu Q-3 a |
| "lệnh máy tự động 'Đồng bộ chuyến theo đơn'… tự giải phóng/mở lại suất" | ADR-0050 `:219-221`, `:361` + Q-L1-2 (chủ chọn "Giữ chuyến tới khi cập nhật"); sổ hỏi đáp lần 16 R-P29 ("Giữ xe + nút cập nhật") | thay bằng ADR-0103 Đ2 cho huỷ / bớt / đổi người / bỏ chặng; đổi **nơi** vẫn giữ + nút |
| (cùng ý) | ADR-0049 `:129` LC-09 "Đơn huỷ sau khi xếp → giữ" | thay bằng ADR-0103 Đ2 |
| "lệnh máy **tự động**" | Hiến chương 5.11 (`docs/ARCHITECTURE.md:111`) — tác nhân tự động cần tài khoản riêng; Hiến chương đứng trên ADR | **không** làm tác nhân tự động: chạy trong lệnh của người. Nếu chủ muốn chạy nền thì cần sửa Hiến chương hoặc tài khoản máy riêng, và vướng HC-5.11. |
| "(lenhCapNhatKhach) để tự giải phóng… khi Bán hàng hủy/bớt khách" | không phải ADR mà là sự thật mã: `lenhCapNhatKhach` hôm nay **bỏ qua** đơn huỷ và chặng đóng (`dieu-phoi-lenh.ts:619`), không đóng suất thừa chưa tên | Đ2 mở rộng luật thuần, dùng chung cho nút tay |
| "bắt buộc chọn/**nhập** lý do" | không phải ADR: lựa chọn "Chưa làm" ô chữ tự do trong chuyến (BL-GHI-CHU-CHUYEN, `docs/BACKLOG.md:186`) | chỉ **chọn**; "nhập" để khi mở BL-GHI-CHU-CHUYEN |
| "truyền địa chỉ/**tọa độ**" | chưa có toạ độ; BL-VC-TOA-DO cần ADR nhỏ của `locations` (`docs/BACKLOG.md:199`) | ADR-0104 chỉ gửi địa chỉ / tên |
| Bán hàng "người lập" sửa số khách (tệp 01) | ADR-0014 `:86` liệt kê sửa số khách trong phần "người phụ trách cấp đầy đủ" | giữ lời chủ (`own`); nêu ở tệp 01 |

### 8. Chưa kiểm
- Toàn bộ là thiết kế trên giấy: chưa chạy mã, chưa thử tranh chấp đồng thời trên D1, chưa xem production.
- Thân ADR-0096, ADR-0097 (đón trước trả, cửa sổ xuất bến, sự kiện `CORRECTION`) chưa đối chiếu với Đ2.
- Hai việc đang thi công song song trên nhánh khác (C14 thay chặng một lô; N3, C38, C27) có thể dời số dòng các route đã trích.
