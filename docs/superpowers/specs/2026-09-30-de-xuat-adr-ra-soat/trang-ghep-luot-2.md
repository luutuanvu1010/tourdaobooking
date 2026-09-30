# Trang ghép — lượt duyệt 2a (ADR-0063) và 2b (ADR-0064, ADR-0065)

- **Ngày:** 2026-09-30 · **Vai:** người soạn (bản nháp; **đã sửa lần 1 theo báo cáo người kiểm độc lập** cùng ngày).
- **Luật:** `CLAUDE.md` §9 "Bước ghép khi duyệt" — lượt có ≥ 2 quyết định, hoặc bảng dùng chung nhận thêm loại dữ liệu mới, phải có trang ghép: (1) bảng chứa loại thực thể nào; (2) dòng quyền nào chạm bảng, áp cho loại nào; (3) cổng nào canh cửa nào. Tối đa **3** quyết định chạm quyền/dữ liệu mỗi lượt.
- **Mốc đo mã:** `origin/main` = `1db777f4` (tệp máy chủ trích dẫn không khác `824193f1`). **Xây trên lỗ đang hở:** không có (`docs/quyen-hoan.json:63` `phat_hien` = `[]`).

## 0. Đếm trần 3 — theo QUYẾT ĐỊNH (như lượt 1), chia 2a / 2b

| Lượt | ADR | Quyết định chạm quyền / dữ liệu | Số |
|---|---|---|---|
| **2a** | ADR-0063 | (1) route văn phòng sửa số khách sau xác nhận: thêm người ghi `order_money_adjustment` (Kế toán, Quản trị, Bán hàng người lập), hành động nhật ký mới có cờ `doiSoKhach`, lý do bằng mã (D1); (2) hạn 2 lần đổi giờ: bảng mới `ord_schedule_edit` + trigger hạn/chỉ-thêm/khoá sau "Đã giao", ghi chú bắt buộc (D3) | **2** |
| **2b** | ADR-0064 | (3) `customerNote` vào DTO "Việc của tôi" của HDV (D1); (4) HDV phụ trách thấy biển số + tên tài xế của đơn mình: **bổ sung ADR-0059** (accepted) — ô quyền mới `order.vehicle.view`, route `xe-cua-don` đổi cổng `office` → `orders`, DTO hẹp cho HDV (D2; lời chủ chốt 30/9 "Thêm HDV phụ trách, làm sau ADR-0059") | **2** |
| **2b** | ADR-0065 | (5) cột `orders.ride_pax` gồm ai ghi, khi nào, và luật tự hạ khi số khách dịch vụ giảm (D1–D3) | **1** |
| | | **Cộng 2b** | **3** |

- 2a tách riêng vì chạm **tiền** và gắn lịch thi công Sổ tiền lượt 1; duyệt 2a không chờ 2b.
- 2b dựa trên 2a ở **một** chỗ: luật tự hạ `ride_pax` (ADR-0065) đặt trong `insertMoneyAdjustment` mà ADR-0063 thêm tham số hành động. Duyệt 2b trước 2a vẫn được; thi công ADR-0065 thì sau ADR-0063 D1.
- Cả hai lượt nối với lượt 1b (ADR-0062) qua hằng "giờ" dùng chung (câu 3) và cờ `doiSoKhach`; ADR-0062 đã dành sẵn chỗ, không phải sửa.

---

## Phần 2a — ADR-0063

### (1) Bảng nào chứa loại thực thể nào

| Bảng (module) | Chứa | Đổi ở lượt này |
|---|---|---|
| `order_money_adjustment` (`orders`) | dòng điều chỉnh số khách sau xác nhận (chỉ-thêm, `seq` duy nhất) | **thêm người ghi**: văn phòng (Kế toán, Quản trị, Bán hàng người lập) qua route mới — D1. Loại dòng **không đổi** |
| **`ord_schedule_edit`** (`orders`, **mới**) | một dòng mỗi lệnh đổi giờ thành công trên đơn đã xác nhận: `counted` (tính hay không), ghi chú đã che, bốn cột WHO. `id` **trùng** `id` dòng nhật ký của lệnh; **không** lưu danh sách trường đổi (đã ở dòng nhật ký) | **bảng mới** — D3. Chỉ-thêm; hạn 2 dòng `counted = 1`; khoá sau "Đã giao" |
| `order_service`, `ord_transfer_leg` (`orders`) | dịch vụ, chặng | **không đổi cột**; ba route đổi giờ thêm câu chèn có lính gác vào lô |
| `audit_log` (`audit`) | nhật ký chỉ-thêm | **+ hành động** `order_money_adjusted` (văn phòng sửa số khách, cờ `doiSoKhach`); gắn cờ `doiSoKhach` cho `order_money_adjusted_by_field`; `detail` của hai hành động có đoạn đầu "số khách: …" + nhãn mã lý do. Dòng đổi giờ: **không** thêm hành động — dòng `trip_updated` / `order_leg_updated` / `order_leg_added` của lệnh có thêm đoạn đuôi "tính 1 lượt đổi giờ" / "đổi giờ (Toàn quyền, không tính lượt)". Không SĐT, không ghi chú đổi giờ |

Không bảng nào nhận **loại người** mới.

### (2) Dòng quyền nào chạm bảng nào, áp cho ai

Cột theo thứ tự `PERMISSION_CODES` (`src/shared/permissions.ts:5`).

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_P | Chạm | Đổi |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `order.money.edit` (`:88`) | own | any | any | assigned | none | any | none | none | none | `order_money_adjustment` | **giá trị giữ**; thêm route văn phòng. Route văn phòng không truyền `assigned` ⇒ HDV chỉ dùng route hẹp cũ |
| `order.trip.edit` (`:78`) | ownOrAssigned | none | any | none | none | any | none | none | none | `order_service` (giờ), `ord_transfer_leg`, **`ord_schedule_edit`** | **giá trị giữ**; thêm hạn 2 lần/đơn (SA không tính — L-V7-1) + ghi chú bắt buộc |
| `order.leg.short_notice` (`:81`) | none | none | any | none | none | any | none | none | none | — | giữ; lần sửa kèm đặt gấp vẫn tính lượt |
| `order.history.view` (`:74`) | ownOrAssigned | any | any | assigned | own | any | own | none | none | đọc danh sách lần đổi giờ (ghi chú đã che) trên trang đơn | giữ |

### (3) Cổng nào canh cửa nào

| Cửa | Cổng router | Hỏi trong thân (thứ tự) | Lưới CSDL |
|---|---|---|---|
| `POST /api/orders/:id/money-edit` (mới, `orders`) | `office` | `can(order.money.edit, {ownerId})` → đơn `confirmed`, chưa "Đã giao" → **mã lý do** trong danh sách đóng (ADR-0023 điều 4; ngoài danh sách / chữ tự do → 400) → `planMoneyEdit` | `seq` duy nhất (`0021`); `order_money_adjustment_delivered_lock_ins` (`0044` @`7621436e`) |
| `POST /api/orders/:id/handler-money-edit` (`dispatch`) | `staff` | không đổi (`dispatch/index.ts:238-239`); chỉ truyền hành động cho `insertMoneyAdjustment` | như trên |
| `PUT /api/orders/:id/trip`, `POST …/legs`, `PUT …/legs/:legId` (`orders`) | `orders` | `can(order.trip.edit, {ownerId, assigned})` → huỷ/đã giao → thân → *(không đổi gì ⇒ trả sớm)* → ghi chú (khi đổi trường thuộc hằng "giờ") → mốc 6 giờ / `datGap` (I14) → hết lượt (409) | lô: câu đầu khoá lạc quan → nhật ký `changes() > 0` → **chèn `ord_schedule_edit` có lính gác `wonGuard`** → câu còn lại; trigger hạn `RAISE` ⇒ cả lô quay lại ⇒ 409 `het_luot_doi_gio` |
| `POST …/legs/:legId/close` | `orders` | không đổi; **không** tính lượt | — |

### Câu duyệt 2a cho chủ (lời thường)

> **Bạn có duyệt lượt 2a (ADR-0063, hai quyết định) không?**
> 1. **Sửa số khách sau xác nhận:** Kế toán, Quản trị, Bán hàng lập đơn sửa được số khách; lý do chọn từ danh sách (không gõ chữ); mỗi lần là một dòng lịch sử; làm thành **đợt riêng ngay sau** Sổ tiền lượt 1 (đúng lời bạn chốt 30/9).
> 2. **Đổi giờ sau xác nhận:** người sửa giữ như hôm nay; **mỗi đơn tối đa 2 lần** (Quản trị cũng tính, Toàn quyền không giới hạn), **lần nào cũng ghi chú**.
>
> **Duyệt lượt này cũng là gật đầu rõ cho ba điểm lệch / nới** (mỗi điểm cần chủ đồng ý, Hiến chương 6.1 và Hiến pháp Điều 9.4):
> - **L-V7-1:** "lần của Toàn quyền không tính" chỉ được máy chủ canh (cơ sở dữ liệu không tự biết ai là Toàn quyền); có câu kiểm định kỳ báo nếu lệch.
> - **L-V7-2:** con số **2** nằm trong mã (không phải bảng cài đặt có ngày hiệu lực như Hiến chương 5.2 muốn). Muốn đổi số thì cần một bản phát hành; muốn đổi thường xuyên thì làm bảng cài đặt sau.
> - **Nới hàng rào:** thêm một câu vào danh sách nợ "được đọc thẳng nhật ký trong lô ghi" (đã duyệt 29/9, hạn 2027-03-31) để cả lô đổi giờ quay lại đúng khi hết lượt.
>
> Kèm hai câu ở `cau-hoi-chu.md`: **câu 3** ("giờ" gồm những gì, dùng chung với tin báo; và đổi giờ vì xe có tính lượt không), **câu 4** (lần đổi trước ngày phát hành không tính).

---

## Phần 2b — ADR-0064, ADR-0065

### (1) Bảng nào chứa loại thực thể nào

| Bảng (module) | Chứa | Đổi ở lượt này |
|---|---|---|
| `orders` (`orders`) | một dòng mỗi đơn | **+ cột `ride_pax`** (số khách đi xe; `NULL` = theo gợi ý) — ADR-0065. Không mang tiền. Trigger khoá sau "Đã giao" (`0044`) tạo lại có thêm cột. Ghi ở: câu đầu `updateTrip` (đơn đã xác nhận), lưu nháp, và **tự hạ** trong lô `insertMoneyAdjustment` khi số khách dịch vụ giảm (câu 8) |
| `ord_transfer_leg` (`orders`) | chặng đưa đón | **không đổi cột**; số người chặng tính qua `soNguoiChang` (ADR-0054 + ADR-0065, câu 7) |
| `audit_log` (`audit`) | nhật ký chỉ-thêm | không thêm hành động; đoạn "số khách đi xe A → B" vào dòng `updated` (nháp), `trip_updated` (đã xác nhận — sinh tin theo ADR-0062), hoặc dòng sửa số khách (khi tự hạ) |
| `vc_trip`, `vc_trip_driver`, `vc_trip_allocation`, `vc_vehicle` (`van-chuyen`) | chuyến, dòng lái, suất khách, xe (công ty + nhà xe) | **không đổi**; cách đọc của ADR-0059 (route `xe-cua-don`) nay có thêm người đọc: HDV đang phụ trách đơn, chỉ biển số + tên tài xế — ADR-0064 D2; suất nối về đơn qua view công bố `v_ord_leg_key` |
| (DTO, không bảng) `MyAssignmentDto` | thẻ "Việc của tôi" của HDV | **+ `customerNote`** — ADR-0064 D1 (sau Sổ tiền Task 7) |

Không bảng nào nhận **loại người** mới (không đụng `parties`, `staff`, `stf_permission`).

### (2) Dòng quyền nào chạm bảng nào, áp cho ai

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_P | Chạm | Đổi |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `order.trip.edit` (`:78`) | ownOrAssigned | none | any | none | none | any | none | none | none | `orders.ride_pax` | **giá trị giữ**; là ô ghi `ride_pax` (nháp và đã xác nhận — khuôn ADR-0054 D10.3) |
| `order.modify` (`:77`) | ownOrAssigned | none | any | none | own | any | own | none | none | `orders` (nháp) | **giá trị giữ**; người chỉ có ô này lưu nháp thì `ride_pax` được chép lại, gửi khác → 403 |
| `order.money.edit` (`:88`) | own | any | any | assigned | none | any | none | none | none | `orders.ride_pax` **chỉ gián tiếp** (tự hạ khi giảm số khách dịch vụ, câu 8 = A) | **giá trị giữ**; Kế toán / HDV **không** ghi `ride_pax` trực tiếp (câu 8) |
| `order.view` / `contact.view` / `money.view` (`:72`, `:75`, `:73`) | — | — | — | assigned | — | — | — | — | — | DTO "Việc của tôi" | **giá trị giữ**; `customerNote` đi qua hai ô đã có (ADR-0064 D1) |
| `trip.view` (`:136`) | any | any | any | none | none | any | none | assigned | none | lịch chung | **giữ** — cố ý **không** mở cho FIELD (lời chủ Q1) |
| **`order.vehicle.view`** (mới) | **any** | **any** | **any** | **assigned** | **none** | **any** | **none** | **none** | **none** | đọc `vc_*` qua route `xe-cua-don` (ADR-0059) | **ô mới** (ADR-0064 D2) — thay cặp `trip.view` + `order.view` không ngữ cảnh của ADR-0059; bốn ô `any` trùng tập người ADR-0059 đã duyệt, mới duy nhất FIELD `assigned` |

Không thêm mã quyền ⇒ không đụng `EXTERNAL_PERMISSIONS`, trigger LC-1. Bài "tập con quyền" chạy lại (thêm một ô).

### (3) Cổng nào canh cửa nào

| Cửa | Cổng router | Hỏi trong thân (thứ tự) | Lưới CSDL |
|---|---|---|---|
| `PUT /api/orders/:id` (nháp, có `ridePax`) | `orders` | `can(order.modify)` → `ridePax` khác bản cũ thì thêm `can(order.trip.edit, {ownerId, assigned})`, sai → 403 → `1 ≤ ridePax ≤ tổng` (L-R2) | `CHECK ride_pax ≥ 1`; khoá sau "Đã giao" (trigger `orders_delivered_lock` tạo lại) |
| `PUT /api/orders/:id/trip` (đã xác nhận, có `ridePax`) | `orders` | như phần 2a; lệnh **chỉ** đổi `ridePax` không bị trả sớm, không tính lượt, không đòi ghi chú / `datGap` | như trên |
| `POST /api/orders/:id/money-edit`, `POST …/handler-money-edit` | như 2a | như 2a; nếu `ride_pax` cố định > tổng mới ⇒ tự hạ cùng lô (câu 8 = A) | như 2a + `CHECK ride_pax ≥ 1` |
| `GET /api/dispatch/mine` (`dispatch`) | `staff` | `contact.view` + `money.view` (`assigned`) — không đổi; thêm `customerNote` | — |
| `GET /api/van-chuyen/xe-cua-don/:orderId` (của ADR-0059, `van-chuyen`) | **`orders`** (trước: `office`) | `findOrderOwner` → `ctx.isAssigned` → `can(order.view, {ownerId, assigned})` sai = **404** → `can(order.vehicle.view, {assigned})` sai = 403 → truy vấn `vc_*` + `v_ord_leg_key`; DTO đầy đủ cho văn phòng, DTO hẹp (biển số + tên tài xế) cho HDV phụ trách | — (chỉ đọc) |
| DTO tài xế (`van-chuyen/tai-xe-dto.ts`) | `staff` | không đổi | bài khoá `tai-xe-dto.test.ts:15` cấm `customerNote` |

### Câu duyệt 2b cho chủ (lời thường)

> **Bạn có duyệt lượt 2b (ADR-0064 và ADR-0065, ba quyết định) không?**
> 1. **HDV thấy ghi chú đơn** ở "Việc của tôi" (tài xế không).
> 2. **HDV đang phụ trách thấy biển số + tên tài xế** của đơn mình trên trang đơn, kèm dòng "Có thể thay đổi" — đúng lời bạn chốt 30/9, làm bằng cách mở thêm chỗ đã có ở ADR-0059 (thêm một quyền xem, không làm chỗ thứ hai); không lịch xe, không SĐT tài xế; làm sau ADR-0059.
> 3. **Số khách đi xe:** ô riêng trên đơn, điền sẵn số đông nhất, Bán hàng / Quản trị sửa; đầu trang đơn và xe dùng số này; tiền không đổi; đổi sau xác nhận thì HDV và người lập nhận tin; giảm số khách dịch vụ làm vượt thì máy tự hạ.
>
> **Duyệt lượt này cũng là gật đầu rõ cho lệch L-R2:** luật "số khách đi xe không lớn hơn tổng khách" chỉ canh ở máy chủ (cơ sở dữ liệu không tự so được vì số khách sau khi sửa nằm trong bản ghi lịch sử), có câu kiểm định kỳ báo nếu lệch.
>
> Kèm hai câu ở `cau-hoi-chu.md`: **câu 7** (xe tính số người từng chặng; không sửa ô thì lưu trống), **câu 8** (Kế toán có sửa số khách đi xe không; tự hạ khi vượt).

---

## Thứ tự phụ thuộc

1. **Sổ tiền lượt 1** (theo điều phối: đã xong Task 0–11, đang chờ kiểm độc lập; `0044`/`0045`) → **ADR-0063** (D1 và D3): **lát riêng ngay sau khi Sổ tiền gộp `main`** (lời chủ chốt 30/9; không chèn task vào Sổ tiền); bảng ca của bài 6e phải có ca route mới.
2. `0044` trên `main` → migration **ADR-0063 D3** (`0048`, bảng đếm cần `delivered_at`) và **ADR-0065** (`0049`, tạo lại `orders_delivered_lock`).
3. **ADR-0063 D1** → **ADR-0065** (luật tự hạ nằm trong `insertMoneyAdjustment`).
4. **ADR-0054 D10.3** (`pax_override`, `soNguoiChang`) → **ADR-0065** (cùng lát hoặc sau).
5. **Sổ tiền Task 7** (sửa `MyAssignmentDto`, `getMyAssignments`) → **ADR-0064 D1** (khuyến nghị làm sau khi Sổ tiền gộp `main`). **ADR-0059** (accepted, nhánh `worktree-phan-tich-gop-y`) → **ADR-0064 D2** (sửa route đã có).
6. **ADR-0047 Phần B** (chủ vẽ màn chặng, ô nơi trả): nên vẽ cùng ô "Số khách đi xe" (ADR-0065); trường giờ mới của Phần B phải vào hằng "giờ" (ADR-0062 Đ1; ADR-0063 D3.2 dùng lại).
7. **ADR-0062** (lượt 1b) → tin cho `order_money_adjusted` và "số khách đi xe" (không bắt buộc thứ tự: thiếu ADR-0062 thì chỉ chưa có tin).
8. **Số migration:** 0046 = ADR-0058, 0047 = ADR-0062, **0048 = ADR-0063** (`0048_doi_gio_sau_xac_nhan.sql`), **0049 = ADR-0065** (`0049_so_khach_di_xe.sql`); ADR-0054…0057 lấy số ≥ 0050. Điều phối vẫn quét mọi nhánh/worktree lúc lập kế hoạch. Số ADR 0058 và 0062–0065 **chưa có** trong bảng giữ chỗ của `docs/adr/README.md` — điều phối ghi vào khi nhận bản nháp.
