# Đề xuất ADR — Lượt D: Phụ thu mùa vụ (dòng cộng thêm do máy chủ sinh, theo ngày đi, theo dịch vụ hoặc nhóm, khác / miễn theo đối tác)

- **Trạng thái:** đề xuất, **chưa duyệt**. AI soạn, không tự duyệt (Hiến pháp N3). **Số ADR lấy lúc chép vào `docs/adr/`**; số migration lấy lúc thi công.
- **Ngày:** 2026-10-30. **Bản sửa 2** (cùng ngày) theo mục «Vòng 2» của `../KIEM-C-D/BAO-CAO.md`: R2-D1 (thứ tự cổng ở Còn vé), R2-D2 (ca PT-15), R2-D3 (thêm hai chỗ phải cộng), R2-D4 (viết rõ bài quét SQL); D không còn mục chặn. Cạnh `pricing → lich-mua` nay thuộc lượt **C1** (C bản sửa 2).
- **Bản sửa 1** (cùng ngày) theo `../KIEM-C-D/BAO-CAO.md`:
  - D-1, D-2 (chặn): đã sửa;
  - D-3…D-13 (nên sửa): đã sửa;
  - D-15, D-17, D-18 (ghi nhận): đã thêm câu.
- **Loại:** việc lớn — **TIỀN**, dữ liệu, quyền. Hồ sơ có ngày: duyệt xong thì không sửa tệp này.
- **Người soạn / vai:** lập kế hoạch (P15). Đọc mã ở worktree `.claude/worktrees/tinh-trang-ban`, nhánh `claude/tinh-trang-ban-va-phu-thu`, HEAD `a129d3d`.
- **Đi cùng:** `D-TRANG-GHEP.md` (bắt buộc); `D-CA-VANG-DE-XUAT.md` (ca tiền mẫu chủ xác nhận — P-5). **Dựa trên lượt C1** (`C-DE-XUAT-ADR.md`: mùa, khoảng đã xác nhận, «mùa thắng», cạnh `pricing → lich-mua`). Không phụ thuộc C2.
- **Chia lượt duyệt và điều kiện phát hành:**
  - lượt **D1** = Đ1, Đ2, Đ3 (bảng quy tắc; dòng trên đơn; cách tính) — 3 điều;
  - lượt **D2** = Đ4 (khác / miễn theo đối tác), Đ5 (hình chiếu tiền: sổ công nợ `gross_snapshot`, chia phần theo người bán) — 2 điều.
  - **Điều kiện phát hành (bắt buộc):** D1 và D2 **phát hành cùng một lần**. Hoặc, nếu D1 lên trước, không có quy tắc phụ thu nào được đặt cho mùa thật tới khi D2 lên. Lý do:
    - P-4 đã chốt «có đối tác sẽ được miễn»;
    - thiếu Đ5 thì sổ đại lý tính sai «giảm giá bên đặt chịu» (Đ5);
    - đơn đã xác nhận giữ phụ thu (G4, 0081) nên không sửa ngược được.
  - Cách đếm và phương án gộp: mục «Đếm» cuối tệp, câu D-Q10.
- **Quan hệ với ADR cũ:**
  - **giữ** ADR-0021, ADR-0077 (chụp lúc xác nhận; hiệu lực mức theo ngày xác nhận; phụ thu **không** vào nền hoa hồng — P-1), ADR-0133 (chia loại khách; em bé 0);
  - **giữ** ADR-0148 Đ3 (giá gốc không đổi nên không có «giá bán lẻ đã đổi»), **kèm điều kiện** cho người thi công 0148 Đ2/Đ3 (Đ2.8);
  - **theo khuôn** ADR-0147 và **phải phối hợp** với nó (cùng thêm «loại dòng» vào `order_item` — Đ2.1);
  - **giữ** ADR-0136 (cửa xác nhận), ADR-0146 (luật bán đứng đầu), lượt B (`congBanDuoc` đứng trước cổng phụ thu);
  - **giữ** ADR-0001 mục 4 (loại của bên đặt được làm đầu vào quy tắc giá — Đ4 không cần ngoại lệ có tên).
- **Không dùng «đặc điểm dịch vụ» của lượt A** làm phạm vi phụ thu ở lượt này (phạm vi chỉ dịch vụ hoặc nhóm). Nếu sau này phụ thu theo đặc điểm, phải xét lại ô gắn đặc điểm và việc chụp giá trị đặc điểm, như lượt A tự cảnh báo.
- **Hiến chương áp:** 2.2, 4.2, 4.4, 5.1, 5.4, 5.5, 5.6 (mốc chụp do ADR này đặt: **lúc xác nhận**), 5.7, 5.15, **5.17**.
- **Xây trên lỗ đang hở: TNV-G1, TNV-G3** (`docs/quyen-hoan.json`, HIGH, hạn 30/11; không mục nào có `xay_tren_cho_phep` cho phụ thu).
  - TNV-G1 (đơn huỷ còn tiền): dòng phụ thu vào tổng đơn và biên nhận.
  - TNV-G3 (sửa sai sau «Đã giao»): Đ5 đổi cách tính `gross_snapshot` trên chính phiếu «Đã giao» mà lệnh Thay lần thu của TNV-G3 xử lý.
  - Theo `CLAUDE.md` §3, đề xuất này **không được duyệt** trước khi hai lỗ được vá, hoặc chủ ghi «cho xây trên lỗ» kèm lý do cho **từng** mã. Câu D-Q8.

## Lời chủ (nguyên văn, không hỏi lại)

- Lượt 2 (30/10): «… 2- Phụ thu mùa vụ (seasonal pricing) theo 02 cách : giá tiền trên dịch vụ hoặc phần trăm trên dịch vụ.»
- Lượt 3 (30/10): «1- Đối tác không hưởng hoa hồng trên phụ thu. 2- Tùy theo , có dịch vụ phụ thu theo mỗi khách, có dịch vụ (ví dụ theo nhóm) thì phụ thu theo dịch vụ ví dụ như giá phòng khách sạn , 3- làm tròn lên tới 1,000đ, 4- Có cần phụ thu khác nhau theo loại đối tác, có đối tác sẽ được miễn phụ thu. 5- Trên bảng điều khiển của nền tảng. 6- như khuýen nghị. Tôi sẽ xác nhận các ca vàng tính tiền mẫu»
- Nguyên tắc (lượt 1): «… coi logic nghiệp vụ là dữ liệu nhé, tức phải nhập tay thủ công hoặc biến nó thành tùy chọn /thao tác trong bảng điều khiển chứ không được khóa cứng trong code (tôi cực kỳ tán thành ).»

**Đã chốt, áp không hỏi lại** (`00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-3-PHU-THU-VA-DAC-DIEM.md`, thắng tệp cũ: đã bỏ «giá mới hẳn» và «hoa hồng theo mùa bắt buộc»):
- phụ thu là **dòng cộng thêm**, giá gốc không đổi; **máy chủ sinh**, không ai sửa tay (kể cả Đối tác);
- xác định theo **ngày đi**;
- áp cho dịch vụ hoặc nhóm, dịch vụ thắng nhóm;
- hai mùa chồng chỉ áp **một** (ưu tiên cao thắng), không cộng dồn;
- P-1 đến P-5;
- G4 đơn đã xác nhận đổi ngày ⇒ giữ phụ thu cũ, báo người đổi;
- G5 dòng riêng trên biên nhận;
- G6 Kế toán, Quản trị, Toàn quyền đặt;
- GĐ-1 đến GĐ-4 áp, chủ sửa nếu sai.

## Hiện trạng (đã kiểm trong mã — tệp:dòng)

| # | Điều | Bằng chứng |
|---|---|---|
| H1 | Dòng tiền = `order_item` (`quantity × unit_price = line_total`), gắn `order_service`, mang `pax_code` (CHECK bốn loại) và `catalog_price`. **Không có cột «loại dòng»** | `migrations/0003_orders.sql:25-34`; `0007…:30-36`; `0008_order_service.sql:31-33` |
| H2 | Tạm tính phải = Σ `line_total` lúc xác nhận; tổng = tạm tính − giảm giá | `0081…` `orders_confirm_subtotal_matches`; `0007…` `orders_money_*` |
| H3 | Sau xác nhận, CSDL cấm thêm/sửa/xoá dòng tiền và đổi tạm tính, tổng | `0081…:7-22` |
| H4 | Dòng chỉ sinh ở máy chủ (`buildLines`); lưu nháp xoá–chèn lại mọi dòng | `src/shared/order-lines.ts:93-143`; `orders/repository.ts:957`, `:1014`, `:1051` |
| H5 | Dịch vụ nhóm (`perNPax`): **một** dòng, `quantity` = ⌈khách/N⌉, `pax_code = adult`, một ô số khách | `order-lines.ts:102-123` |
| H6 | **Mọi chỗ đọc `order_item` bằng SQL** | `orders/repository.ts:91` (`ITEM_SELECT` → DTO đơn, `findOrder` `:307`, `getStoredServices` `:345-357`), `:1262` (`getServicesForSubtotal`); `scripts/audit-checks.mjs:121-127` (`COT_DICH_VU` cho kiểm định kỳ), `:655-664` (tạm tính = Σ dòng — **đúng cả khi có phụ thu**) |
| H7 | **Cổng giá R2** (Đối tác, Thực tập): mọi dòng phải có `catalog_price` và `unit_price = catalog_price` | `price-guards.ts:110-111`, `:151-154`; lập/sửa `orders/index.ts:288`; xác nhận với dòng **đã lưu** `xac-nhan-chung.ts:91` |
| H8 | Ba cửa xác nhận dùng chung `kiemCongXacNhan` | `xac-nhan-chung.ts:83-115`. Gửi xác nhận có chốt riêng: `xac-nhan-route.ts:100-134`, `:118` |
| H9 | **Còn vé đổi được ngày đi** (`body.ngayDi`): cổng xét `order` ngày **cũ**, rồi trong cùng lô đổi `depart_date` và khoá tiền | `xac-nhan-route.ts:263-268`, `:309`, `:313-316`, `:329` |
| H10 | **Nền hoa hồng** = Σ `lineTotal` mọi dòng của dịch vụ; dịch vụ nhóm đếm Σ `quantity` mọi dòng | `tienChoHoaHong` `xac-nhan-chung.ts:55-59`, nơi gọi: `xac-nhan-chung.ts:111`, `orders/index.ts:310` (trần giảm giá lúc lập/sửa), `:754` (`phanThuongMaiCuaDon`), `:1635` (đổi bên đặt); `pricing/rules.ts:147-149`; kiểm định kỳ `scripts/audit-thuong-mai.mjs:45-53` (`tienDichVu`) |
| H11 | Hoa hồng, giá vốn, làm tròn: **một** tệp nguồn; hàng rào cấm phép nhân/chia 10000 hay biến `…Bp` ngoài tệp đó; danh sách ngoại lệ chỉ cho chỗ **không** phải công thức tiền | `src/shared/hoa-hong-dong.ts`; `src/hoa-hong-mot-nguon.test.ts:37` (`NGUON`), `:38-44` (`PHAN_VAN_DA_RA`, ghi «Chỗ nào thật sự tính … làm tròn tiền thì KHÔNG được thêm vào đây») |
| H12 | **Bản chụp giá của dịch vụ đã lưu** dựng từ dòng: gặp dòng thiếu `catalog_price` ⇒ trả null. Đơn giá thỏa thuận theo `pax_code` dựng bằng **ghi đè** | máy chủ: `snapshotService` `service-rules.ts:146-155` (dùng ở Q11 lưu nháp `:203`, `storedServiceLines` `:181`, `editablePaxCodesOf` `money-adjustment.ts:138-142`), `storedUnitPrices` `:162-169`. **Trình duyệt**: `snapshotItem` `src/shared/service-form.ts:140-150`, `draftFromDto` `:164-176` (`saved[it.paxCode] = it.unitPrice`, rồi `{ ...defaultPrices(liveItem), ...saved }`) |
| H13 | Tiền hiệu lực / phải thu: một đường | `money-adjustment.ts:186-199` (`effectiveService`, `effectiveSubtotal`), `:247` (`effectiveMoney`); bài `src/phai-thu-mot-ham.test.ts` |
| H14 | `PUT /api/orders/:id/trip` đổi ngày cả nháp lẫn đơn đã xác nhận, **không** đụng tiền | `orders/index.ts:1289-1344` |
| H15 | Sổ công nợ lúc «Đã giao»: `gross` = Σ thành tiền **dịch vụ**; giảm giá bên đặt chịu = `max(0, gross − phải thu)`; trigger (iv) đòi = `gross_snapshot − due_snapshot` | `billing/service.ts:334-339`, `:578`, `:587`; `migrations/0112_so_dai_ly_dot_2.sql:63-75` |
| H16 | Người thu nợ công ty đúng số đã thu; hoa hồng là dòng riêng | `billing/rules.ts:480-498`, `:674-692` |
| H17 | Biên nhận và trần «thu cho» nhà cung cấp chia theo người bán của dịch vụ; giảm giá trừ phần Tour Đảo trước (R-81) | `receipt/rules.ts:45`, `:117`; `billing/rules.ts:533-541`; `src/shared/chia-phan-nguoi-ban.ts` |
| H18 | Danh sách loại đối tác của giá: `prc_beneficiary_role` (khoá chính `role_type_code`, cờ `active` = đang hưởng hoa hồng) | `migrations/0090_so_dai_ly_dot_1.sql:18-25`; `0095…` (`is_partner_label`); `pricing/repository.ts:76`, `:86` |
| H19 | `partner.commission.view` (SALES, ACCOUNTING, ADMIN, SUPER_ADMIN), `partner.commission.write` (ACCOUNTING, ADMIN, SUPER_ADMIN); `order.create` gồm PARTNER, INTERN | `permissions.ts:161-162`, `:92` |
| H20 | ADR-0147, ADR-0148 Đ2/Đ3 **chưa thi công** | `ls migrations/` lớn nhất `0127`; `hoa-hong-dong.ts:6` |
| H21 | Hôm nay **không** có phụ thu trong mã. Cách văn phòng đang thu phụ thu Tết | **chưa kiểm** (D-Q7) |

## Tóm tắt cho chủ (lời thường)

1. Kế toán, Quản trị, Toàn quyền đặt **quy tắc phụ thu** trên màn hình. Mỗi quy tắc gồm: mùa nào; áp cho một dịch vụ hay cả nhóm; cách tính.
2. Ba cách tính:
   - **mỗi khách**: người lớn / trẻ em / người cao tuổi; em bé 0;
   - **mỗi đơn vị**: phòng / lượt / khách;
   - **phần trăm** trên giá dịch vụ: làm tròn lên tới 1.000 ₫ mỗi đơn vị.
3. Khi lưu đơn, máy **tự thêm dòng «Phụ thu <tên mùa>»** dưới dịch vụ. Không ai gõ hay sửa được, kể cả Đối tác. Giá dịch vụ giữ nguyên. Đối tác thấy số **dự kiến** ngay trên form.
4. Đơn **nháp** đổi ngày ⇒ phụ thu tính lại. Đơn **đã xác nhận** đổi ngày ⇒ giữ phụ thu cũ, Nền tảng báo người đổi. Người xét duyệt bấm «Còn vé» kèm đổi ngày mà phụ thu theo ngày mới khác ⇒ máy chặn, nói rõ số mới.
5. Hoa hồng và giá đại lý **chỉ tính trên giá dịch vụ**; phụ thu thuộc trọn công ty.
6. Đặt phụ thu khác hoặc **miễn** cho một loại đối tác hay một đối tác: **phải lên cùng lúc** với phần trên.
7. Chủ xác nhận **bộ ca tính tiền mẫu** (`D-CA-VANG-DE-XUAT.md`) **trước khi** viết mã.

## Quyết định — lượt D1

### Đ1 — Bảng quy tắc phụ thu và ai đặt (DỮ LIỆU + QUYỀN, phân hệ `pricing`)

1. **Bảng mới** tên tạm `prc_surcharge_rule`, **chỉ thêm**.
   - **Cột:**
     - `id`;
     - `season_code` (khoá ngoại tới `lm_season` của lượt C1 — cạnh `pricing → lich-mua`);
     - `scope` (`SERVICE` / `GROUP`) + `catalog_code` / `group_code` (đúng một có giá trị);
     - `method` (tập đóng ở mã: `MOI_KHACH`, `MOI_DON_VI`, `PHAN_TRAM`);
     - `amount_adult`, `amount_child`, `amount_senior` (cho `MOI_KHACH`); `amount_unit` (cho `MOI_DON_VI`); `rate_bp` (cho `PHAN_TRAM`, 1–10000);
     - `valid_from`, `valid_to`; `note`;
     - `created_at/by`; `ended_at/by/reason` (đặt một lần).
   - `CHECK` hình dạng theo `method`; số nguyên ≥ 0, ≤ `MAX_AMOUNT_VND`.
   - Trigger: cấm `DELETE`; cấm `UPDATE` trừ `ended_*` một lần. «Sửa» = kết thúc + thêm, một lô.
   - **Mùa là một cột riêng**, không phải dòng điều kiện (khoá, giá trị) như khuôn ADR-0147 Đ2. Mùa là trục **bắt buộc** của phụ thu, không phải điều kiện tuỳ chọn; cột có khoá ngoại thì CSDL canh được.
   - **Không có phạm vi «mọi dịch vụ»** [người soạn].
   - **Một quy tắc mỗi ô**: hai dòng hiệu lực cùng mùa, cùng phạm vi, cùng mã (và, ở D2, cùng đối tượng) có khoảng hiệu lực giao nhau ⇒ từ chối. Canh ở cả mã lẫn trigger.
2. **Hai trục thời gian** [người soạn, theo ADR-0077 điều 8, ADR-0147 Đ2]:
   - **mùa** xét theo **ngày đi**;
   - **hiệu lực quy tắc** xét theo **ngày tính** (hôm nay giờ VN lúc lưu nháp, lúc xem trước, lúc xác nhận).
3. **Ai ghi — thao tác mới** tên tạm `pricing.surcharge.write`, phạm vi `any` cho Kế toán, Quản trị, Toàn quyền (đúng G6). Là thao tác, không phải mã quyền mới. Lý do không dùng lại `partner.commission.write`: tên ô nói «hoa hồng».
   - **Đọc danh sách quy tắc + «Thử tính» trên màn quy tắc**: `partner.commission.view` (Bán hàng, Kế toán, Quản trị, Toàn quyền). **Đổi nghĩa ô** đó — trang ghép mục 2, câu D-Q9.
   - Đối tác, Thực tập, Hiện trường **không** đọc danh sách quy tắc (sau D2 danh sách có mức riêng của từng đối tác). Họ xem số **của chính đơn mình** qua Đ2.11.
   - Nhật ký: `surcharge_rule_added`, `surcharge_rule_ended`.
4. **Cảnh báo** [bề mặt]: quy tắc có mùa chưa có khoảng đã xác nhận trong 12 tháng tới.
5. **«Thử tính» trên màn quy tắc**: dịch vụ, ngày đi, số khách, (D2) bên đặt ⇒ quy tắc thắng và dòng sẽ sinh; **cùng** hàm với đơn thật.

### Đ2 — Dòng phụ thu trên đơn (DỮ LIỆU + TIỀN, phân hệ `orders`)

1. **Mô hình: dòng của `order_item`, tách ra ở MỘT chỗ — tầng đọc** [người soạn; sửa theo báo cáo kiểm D-2].
   - **Lưu**:
     - thêm cột `order_item.line_kind` (tên tạm; NULL = dòng dịch vụ như hôm nay; `PHU_THU`) và `order_item.surcharge_rule_id` (khoá ngoại `prc_surcharge_rule`, truy ngược — 4.2);
     - `service_id` = dịch vụ được phụ thu; `pax_code` = loại khách (dịch vụ nhóm: `adult`); `catalog_price` NULL;
     - `unit_price` = số mỗi đơn vị đã làm tròn; `quantity` = số đơn vị;
     - mô tả «Phụ thu <tên mùa> — <loại khách>».
     - Lý do ở trong `order_item`: tạm tính và tổng phải gồm phụ thu, và giữ nguyên các trigger tiền H2, H3.
   - **Tách ở tầng đọc**: hai chuỗi SQL đọc dòng của `orders` (H6: hằng `ITEM_SELECT` `repository.ts:91`, dùng ở `findOrder` và `getStoredServices`; câu của `getServicesForSubtotal` `:1262`) cộng `COT_DICH_VU` của kiểm định kỳ đọc thêm `line_kind`; **ba hàm chia** `groupItems` (`:283`), nhánh dòng của `getStoredServices` (`:347`), `buildSubtotalServices` (`:1227`) chia làm hai:
     - `items` **chỉ còn dòng dịch vụ** (giữ nguyên nghĩa cho mọi chỗ dùng hôm nay);
     - dòng phụ thu sang trường mới `phuThu[]` của `OrderServiceDto` (`src/shared/contracts.ts:252` khu vực DTO dòng), `StoredService` và `SubtotalServiceInput`.
     - Câu kiểm định kỳ `COT_DICH_VU` (`scripts/audit-checks.mjs:121-127`) cũng chỉ lấy dòng dịch vụ vào `items`.
     - Nhờ vậy những chỗ **không được thấy** phụ thu tự đúng, không phải sửa từng nơi: `snapshotService`, `storedUnitPrices`, `storedServiceLines`, `editablePaxCodesOf`, Q11 lưu nháp, `snapshotItem`/`draftFromDto` (trình duyệt), R2 tại xác nhận, `tienChoHoaHong` ở bốn nơi gọi, `soKhachTinhHoaHong`, `summarizeDeviations`, `tienDichVu` của kiểm định kỳ.
     - Bài quét SQL (mục 12 dưới đây) **chặn** mọi câu đọc `order_item` ngoài danh sách cho phép.
   - **Chỗ phải CỘNG thêm `phuThu`**, nêu đích danh:
     - tạm tính hiệu lực `effectiveService`/`effectiveSubtotal` (Đ2.6);
     - tổng của đơn ở `createOrder`/`updateDraftOrder`;
     - DTO và hiển thị trang đơn, biên nhận (`receipt/rules.ts:117`, `src/shared/order-confirmation.ts`);
     - **trang đơn `src/shared/order-view.ts:54-64`** (dựng `lines` và `subtotal` từng dịch vụ từ `items`) và `web/order-services.ts` vẽ từ đó — sau khi tách, nếu không cộng thì dòng phụ thu **biến khỏi trang đơn im lặng** trong khi tổng vẫn gồm phụ thu (R2-D3). Thêm bài khẳng định trang đơn có dòng phụ thu và tạm tính dịch vụ + phụ thu = tạm tính đơn;
     - **kiểm định kỳ `scripts/audit-thuong-mai.mjs:177`**: giảm giá hiệu lực = `effectiveMoney(Σ thanhTien dịch vụ, giảm)`; sau khi tách, Σ đó không còn là tạm tính của đơn ⇒ phải cộng `phuThu` (hoặc lấy tạm tính hiệu lực từ cùng đường `loadOrderView`). Không sửa thì lệch khi giảm giá > tiền dịch vụ (R-ORD-DC1, R3 lúc đổi bên đặt);
     - `gross_snapshot` và chia phần theo người bán (Đ5).
   - **Phối hợp ADR-0147**: phí đưa đón cũng là loại dòng mới của `order_item`. Hai ADR dùng **một** cột `line_kind` và **một** chỗ tách ở tầng đọc. ADR nào thi công trước tạo cột.
   - CSDL:
     - trigger hình dạng: `PHU_THU` ⇒ có mã quy tắc, có `service_id`, `catalog_price` NULL; dòng dịch vụ ⇒ không mã quy tắc;
     - tạo lại trigger khoá tiền 0081 phủ hai cột mới (chỉ siết).
2. **Sinh dòng — chỉ ở máy chủ, một đường.**
   - Hàm thuần mới `src/shared/phu-thu.ts` (tên tạm): dòng dịch vụ đã dựng + quy tắc thắng ⇒ dòng phụ thu. Phép tính tiền mỗi đơn vị **gọi** hàm ở `src/shared/hoa-hong-dong.ts` (Đ3.4) — **không** tự nhân/chia phần vạn.
   - `POST /api/orders` và `PUT /api/orders/:id`: sau `priceGuard` (R1, R2 trên dòng dịch vụ — `orders/index.ts:284-290`), sau luật bán / `congBanDuoc` của B, sau khi biết bên đặt ⇒ đọc quy tắc + khoảng mùa qua `pricing/index.ts` ⇒ sinh dòng ⇒ cộng vào tạm tính, tổng ⇒ ghi trong cùng lô (H4).
   - Thân request **không** chở được dòng phụ thu: `validateService` (`service-rules.ts:264`) chỉ nhận dịch vụ danh mục hoặc nhập tay; khoá lạ bỏ qua; Đối tác không nhập tay được (R1).
   - Bài quét mới: chỉ một tệp chèn dòng `PHU_THU`.
3. **Nháp và lúc xác nhận — chụp = dòng đã lưu, kiểm lại trước khi khoá.**
   - Mỗi lần lưu nháp: tính lại theo ngày đi + quy tắc hôm nay.
   - **Cổng phụ thu** — hàm tên tạm `kiemPhuThu(order, ngayDi?)`:
     - tính dòng **mong đợi** theo ngày đi + quy tắc hôm nay;
     - khác dòng đã lưu (mã quy tắc, loại khách, số lượng, đơn giá) ⇒ **409 `surcharge_changed`**, nêu số mới; **không ghi gì**.
   - **Đặt ở đâu:**
     - trong `kiemCongXacNhan` (phủ `/status`, Gửi đơn, Còn vé không đổi ngày), sau `congBanDuoc` (B) và sau R2 đã lọc;
     - **chốt riêng** ở Gửi xác nhận (H8), sau `congBanDuoc` của B ở cửa đó.
   - **Còn vé kèm `ngayDi`** (H9 — sửa theo D-1; thứ tự sửa theo R2-D1). Ở cửa `quyet-dinh`, thứ tự cổng:
     1. `congBanDuoc` của B (cả ngày đã lưu lẫn ngày mới) — **trước** chốt nhóm tắt (`:296`) và kiểm mốc (`:304`), đúng như B;
     2. chốt nhóm tắt đưa đón (`:296`);
     3. **`kiemPhuThu(order, ngayDi mới)`** — [người soạn] đặt **trước** kiểm mốc, cùng lý do B đặt cổng đóng bán trước mốc: không đẩy người xét duyệt đi «đặt gấp» cho một đơn mà rồi cũng bị chặn vì phụ thu;
     4. kiểm mốc (`:304`);
     5. `kiemCongXacNhan` (`:309`). Trong đó `kiemPhuThu` theo ngày đã lưu được **bỏ qua** khi có `ngayDi`, để không chặn nhầm theo ngày cũ [người soạn]. Cờ bỏ qua là **tham số tường minh** của `kiemCongXacNhan` (tên tạm `daKiemPhuThuNgayMoi`, mặc định sai); **chỉ cửa `quyet-dinh` truyền**, và chỉ khi bước 3 đã chạy. Bài kiểm: (i) gọi `kiemCongXacNhan` với cờ bật mà bước 3 chưa chạy ⇒ đỏ; (ii) bài quét: ngoài `xac-nhan-route.ts` cửa `quyet-dinh`, không nơi gọi nào truyền cờ này (không mở lối bỏ cổng ở cửa khác) — R3-D1;
     6. lô xác nhận đổi ngày (`:313-316`).

     Phụ thu mong đợi theo ngày mới khác dòng đã lưu ⇒ 409 `surcharge_changed`, không ghi gì, yêu cầu vẫn mở.
     - Việc này vẫn cần dù lượt B đã bỏ lối «Còn vé đổi ngày» cho đơn **bị đóng bán**: đơn không bị đóng vẫn đổi ngày ở Còn vé được.
     - Không có lối «Còn vé đổi ngày và tự tính lại phụ thu»: trong lô xác nhận tiền đã khoá (0081).
   - **Câu 409 theo cửa** (khuôn `cuaDuaDon: "xet-duyet"`, `xac-nhan-chung.ts:96`):
     - người lập / Gửi đơn / `/status`: «Phụ thu của đơn đã đổi (nay: Phụ thu Tết 250.000 ₫). Bấm Lưu để cập nhật rồi gửi lại.»
     - người xét duyệt (Còn vé): «Phụ thu theo ngày đi <ngày> là <số>, khác số trên đơn. Chọn Còn vé không đổi ngày, hoặc báo người lập Rút lại, sửa ngày và Lưu; hoặc chọn Hết vé / Huỷ.»
   - Câu D-Q6 (báo hay tự tính lại).
   - Lô xác nhận thắng ⇒ 0081 khoá dòng = bản chụp (5.6).
4. **Sau xác nhận.**
   - **Đổi ngày qua `PUT …/trip`** (H14): dòng phụ thu **giữ nguyên** (G4). Phản hồi kèm khối cảnh báo `canhBaoPhuThu` khi phụ thu theo ngày mới khác; nhật ký `order_trip_updated` ghi câu đó. Không đổi tiền.
   - **Sửa số khách** (`money-edit`, `handler-money-edit`): phụ thu tính lại theo **đơn giá đã chụp** × số đơn vị mới; không đọc quy tắc hiện hành; không làm tròn lại.
   - **Huỷ**: vùng TNV-G1.
5. **Cổng giá R2, R3** (`price-guards.ts`):
   - Lập/sửa: R2 chạy trên dòng `buildLines` **trước** khi có dòng phụ thu.
   - Xác nhận: `order.services[].items` (sau khi tách ở Đ2.1) **không** còn dòng phụ thu, nên `xac-nhan-chung.ts:91` không phải sửa câu chữ.
   - **Đỏ trước:** đơn Đối tác có phụ thu bấm Gửi đơn ⇒ 403 nếu dòng phụ thu lọt vào `items`.
   - Dòng phụ thu có cổng **riêng và chặt hơn** cho **mọi** tài khoản (Đ2.3). Không thân request nào đặt được đơn giá dòng phụ thu.
   - R3 giữ nguyên: trần = hoa hồng, không gồm phụ thu.
6. **Tiền hiệu lực** (H13) — sửa mô tả bẫy theo D-2:
   - `effectiveService`/`effectiveSubtotal` cộng hai phần: dịch vụ (đường cũ, qua `storedServiceLines` trên `items` chỉ còn dòng dịch vụ) **+** phụ thu (hàm mới: đơn giá đã chụp × số đơn vị theo số khách mới). `effectiveMoney` vẫn là hàm phải thu duy nhất.
   - **Hậu quả nếu không tách** (để người thi công biết bài đỏ thật):
     - (a) **máy chủ**: `snapshotService` gặp dòng `catalog_price` NULL ⇒ trả null.
       - Sửa số khách sau xác nhận bị **từ chối** («không sửa được qua đường này» — `service-rules.ts:183`).
       - HDV mất ô sửa số khách (`editablePaxCodesOf` rỗng).
       - Nháp mất bản chụp Q11 (`:203`) ⇒ đối chiếu lại giá danh mục hiện hành, có thể `catalog_changed` / `catalog_unavailable`.
     - (b) **trình duyệt**: `draftFromDto` ghi đè đơn giá của **mọi loại khách có dòng phụ thu** (`saved[paxCode]`, dòng phụ thu đứng sau theo `sort_order`) bằng số phụ thu, và `snapshotItem` null ⇒ thẻ dùng `{ ...defaultPrices(liveItem), ...saved }`.
       - Văn phòng mở lại nháp rồi Lưu ⇒ **đơn giá các loại khách đó của dịch vụ bị hạ thành số phụ thu, im lặng** (chỉ có nhãn «khác giá danh mục») — ví dụ PT-15: người lớn ← 100.000, trẻ em ← 50.000 (R3-D2).
       - Đối tác ⇒ 403 R2.
     - `storedUnitPrices` cũng ghi đè, nhưng không chạy tới vì (a) chặn trước.
7. **Hoa hồng, giá đại lý (P-1).** Bốn nơi gọi `tienChoHoaHong` (H10: `xac-nhan-chung.ts:111`, `orders/index.ts:310`, `:754`, `:1635`) và `tienDichVu` của kiểm định kỳ (`scripts/audit-thuong-mai.mjs:45-53`) nhận `items` đã tách ⇒ nền chỉ là dịch vụ.
   - Dịch vụ nhóm: số lượt **không** gồm dòng phụ thu.
   - `hoaHongDong`, `tinhDongDoiTac`, `giaVonDong`, `chonMuc` không đổi.
8. **Bẫy ADR-0148 Đ3 không xảy ra — có điều kiện.** Phụ thu không đổi `catalog_item`, không đổi `catalog_price` của dòng dịch vụ. Người thi công 0148 Đ2/Đ3 lấy giá danh mục từ `items` (đã tách), không đọc `order_item` thẳng.
9. **«Còn thu» và phải thu (GĐ-4).** Phải thu = `effectiveMoney(tạm tính gồm phụ thu)`.
   - Người thu, kể cả Đối tác là bên đặt, nợ công ty đúng số đã thu (H16).
   - Hoa hồng là dòng riêng tính trên dịch vụ ⇒ **phụ thu thuộc trọn công ty**, không cần loại dòng sổ mới.
   - Phần `gross_snapshot` và chia phần theo người bán thuộc **Đ5** (D2).
10. **Biên nhận, trang đơn (G5, 4.4).** Mỗi dòng phụ thu là một dòng riêng dưới dịch vụ, qua danh sách trắng `receipt/rules.ts:117` (thêm `laPhuThu` nếu cần kiểu chữ riêng). Biên nhận dựng ở trình duyệt (`src/shared/order-confirmation.ts:201-208`, `web/confirmation-image.ts`) hiện cùng dòng; tạm tính từng dịch vụ hiện **tách** «Dịch vụ … / Phụ thu …». Kịch bản Chrome theo `web/CLAUDE.md`.
11. **Xem trước trên form cho mọi người lập đơn, kể cả Đối tác, Thực tập** (sửa theo D-8):
    - route đọc tên tạm `POST /api/orders/xem-truoc-phu-thu`, cổng `orders`, ô **`order.create`** (có PARTNER, INTERN — H19);
    - nhận dịch vụ có mã + số khách + ngày đi (+ bên đặt; Đối tác bị ép bên đặt là chính mình như lập đơn — `benDatCuaToi`);
    - trả **chỉ** dòng phụ thu dự kiến của đầu vào đó; **không** ghi; **không** trả danh sách quy tắc hay mã quy tắc;
    - cùng hàm chọn + sinh dòng với lưu đơn.
    - Form hiện «Phụ thu (dự kiến)» và «Tổng (dự kiến)» từ route này; tạm tính tự cộng ở trình duyệt (`service-form.ts:290`) ghi rõ «chưa gồm phụ thu» cho tới khi có số máy chủ.
    - Không thêm ô quyền.
    - Ghi nhận (R2-D6): Thực tập **không** bị ép bên đặt (chỉ Đối tác — `benDatCuaToi`), nên xem trước được mức phụ thu riêng (D2) của bất kỳ bên đặt nào. Cùng thông tin này họ đã lấy được bằng cách lưu nháp với bên đặt đó; rủi ro không tăng. «Thực tập không đọc danh sách quy tắc» (Đ1.3) vẫn đúng theo nghĩa danh sách.

12. **Bài quét SQL «đọc `order_item` phải biết loại dòng»** (R2-D4) — khuôn `src/hoa-hong-mot-nguon.test.ts`:
    - Quét **mã chạy thật** (`src/**`, `web/**`, `scripts/**`, bỏ `*.test.ts`), tìm chuỗi SQL có `FROM order_item` / `JOIN order_item`.
    - **Danh sách cho phép theo TÊN HẰNG / vị trí đặt tên**, không theo cả tệp:
      - phải **chọn `line_kind`**: `ITEM_SELECT` (`orders/repository.ts`), câu của `getServicesForSubtotal` (đặt thành hằng có tên khi thi công), `COT_DICH_VU` (`scripts/audit-checks.mjs`);
      - **được phép không lọc** (tạm tính = Σ mọi dòng, đúng khi gồm phụ thu): hai câu `SUM(i.line_total)` của `scripts/audit-checks.mjs:655-664` (đặt tên hằng khi thi công);
      - xoá nháp `DELETE FROM order_item` (`repository.ts:1051`): ghi, không đọc — được phép.
    - Mọi chuỗi khác chạm `order_item` ⇒ bài đỏ; thêm chỗ mới = sửa danh sách, có người rà.
    - **Bài đơn vị cho ba hàm chia** (`groupItems`, nhánh dòng của `getStoredServices`, `buildSubtotalServices`): đầu vào có dòng `PHU_THU` ⇒ không bao giờ vào `items`, luôn vào `phuThu`.
    - **Giới hạn** (lưới chống nhầm/quên, không chống cố ý lách): không thấy SQL ghép từ nhiều mảnh chuỗi; bí danh bảng qua view mới tạo trong `migrations/` (view đọc `order_item` rồi mã đọc view); tên bảng viết qua biến. Người rà phải xem mọi migration tạo view chạm `order_item`.
    - Quan sát chặn thật một lần (cố ý thêm một câu `SELECT … FROM order_item` không chọn `line_kind` ⇒ đỏ ⇒ hoàn nguyên) rồi ghi `docs/SO-HANG-RAO.md` (P16).

### Đ3 — Cách tính (TIỀN)

1. **Đối tượng:** dịch vụ có mã danh mục. Dịch vụ nhập tay không có phụ thu máy sinh.
2. **Ngày đi** = `depart_date` của dịch vụ (đơn cũ lệch ngày: theo từng dịch vụ). Chưa có ngày ⇒ chưa tính.
3. **Quy tắc «áp được cho đơn này»** (định nghĩa — sửa theo D-10). Một dòng quy tắc áp được khi:
   - hiệu lực ở ngày tính;
   - chưa kết thúc;
   - phạm vi khớp dịch vụ (`SERVICE` đúng mã, hoặc `GROUP` đúng nhóm hiện hành — đọc `v_ctl_service_group` như `pricing/repository.ts:91`);
   - (D2) **đối tượng áp được cho bên đặt của đơn**: mọi bên đặt; hoặc loại mà bên đặt đang mang; hoặc chính hồ sơ bên đặt.
4. **Chọn quy tắc thắng** [người soạn]:
   1. Các mùa chứa ngày đi (khoảng đã xác nhận — lượt C1), xếp ưu tiên giảm dần.
   2. Mùa **đầu tiên có ít nhất một quy tắc áp được** (mục 3) là mùa thắng; dừng. Mùa có quy tắc nhưng không quy tắc nào áp được cho đơn này (ví dụ chỉ có dòng cho loại đối tác khác) **không** chặn mùa thấp hơn.
   3. Trong mùa thắng, (D2) đối tượng trước — hồ sơ > loại > mọi bên đặt — rồi phạm vi: dịch vụ > nhóm.
   4. Không mùa nào có quy tắc áp được ⇒ **không phụ thu** (không phải «thiếu cài đặt», không giữ đơn).

   Câu hỏi và ca vàng: D-Q3 (PT-06b), D-Q4 (PT-06c), D2-Q2 (PT-D2-03), D2-Q3 (PT-D2-06).
5. **Sinh dòng** (em bé không bao giờ có dòng):

| Phương pháp | Dịch vụ theo người | Dịch vụ theo nhóm / đơn vị |
|---|---|---|
| `MOI_KHACH` (NL/TE/NCT) | mỗi loại có khách: `quantity = n_loại`, `unit_price` = số của loại | một dòng, `quantity` = số khách, `unit_price` = số NL |
| `MOI_DON_VI` | mỗi dòng dịch vụ (trừ em bé): `quantity` = `quantity` dòng đó, `unit_price` = số | một dòng, `quantity` = số lượt/phòng |
| `PHAN_TRAM` | mỗi dòng dịch vụ (trừ em bé): `unit_price` = **làm tròn lên tới 1.000** của (giá cơ sở × `rate_bp` / 10.000) | như trái, mỗi lượt/phòng |

   - Với phần trăm, «mỗi khách» và «theo dịch vụ» cho cùng một số (D-Q2).
   - **Giá cơ sở** = **giá niêm yết chụp ở dòng** (`catalog_price`) [khuyến nghị — D-Q1].
   - **Làm tròn** theo từng đơn vị rồi nhân số lượng (GĐ-3): `⌈cơ_sở × rate_bp / 10.000.000⌉ × 1.000`. Sửa số khách không làm tròn lại.
   - **Chỗ đặt công thức — không nới hàng rào** (sửa theo D-5):
     - Phép «phần trăm → tiền mỗi đơn vị, làm tròn lên 1.000» là **một hàm mới trong `src/shared/hoa-hong-dong.ts`** (tệp `NGUON` của `src/hoa-hong-mot-nguon.test.ts`), tên tạm `phuThuMoiDonVi`.
     - `src/shared/phu-thu.ts` chỉ gọi hàm đó, không có phép nhân/chia phần vạn.
     - Hai luật làm tròn (hoa hồng: nửa lên tới đồng; phụ thu: lên tới 1.000) nằm cùng một tệp.
     - **Siết thêm** (được phép — Điều 9.4): đưa `phuThuMoiDonVi` vào bảng `GOI_HAM` của hàng rào, chỉ được gọi từ `phu-thu.ts`.
     - `PHAN_VAN_DA_RA` **không** đổi.
   - Thành tiền dòng = `thanhTienDong` (`order-lines.ts:81`). Dòng 0 không ghi.
6. **Sổ vàng (5.17, P-5):** `D-CA-VANG-DE-XUAT.md` → `golden/phu-thu-mua-vu.json` lúc thi công. Chủ xác nhận từng ca trước khi viết mã tiền; 100% ca đã xác nhận phải qua.

## Quyết định — lượt D2 (duyệt riêng, **phát hành cùng D1**)

### Đ4 — Phụ thu khác nhau / miễn theo loại đối tác và theo hồ sơ (DỮ LIỆU + TIỀN)

1. **Dữ liệu:** thêm cột vào `prc_surcharge_rule` bằng `ALTER TABLE ADD COLUMN`.
   - `target_role_code`: khoá ngoại `prc_beneficiary_role(role_type_code)`, như mức hoa hồng và ADR-0146.
   - `target_party_id`: khoá ngoại `pty_party`.
   - Nhiều nhất một trong hai có giá trị.
   - Thêm phương pháp **`MIEN`** (không cột số).
2. **Loại của bên đặt** (sửa mâu thuẫn D-9):
   - = các loại mà bên đặt đang mang (vai mở, đọc qua `v_pty_open_role`) **và có dòng trong `prc_beneficiary_role`**, **bất kể cờ `active`** (bật hay tắt «được hưởng hoa hồng»). Phụ thu không phải hoa hồng.
   - Loại đối tác **chưa có dòng** trong `prc_beneficiary_role` thì không đặt được phụ thu riêng / miễn (CSDL từ chối qua khoá ngoại). Mọi loại đối tác có dòng ở đó hay không: **chưa kiểm** trên dữ liệu thật.
   - Xét theo **bên đặt** (`orders.booker_party_id`), ai lập cũng vậy (GĐ-1).
3. **Thứ tự trong mùa thắng:** hồ sơ (dịch vụ > nhóm) > loại (dịch vụ > nhóm) > mọi bên đặt (dịch vụ > nhóm). Khuôn `chonMuc` (`pricing/rules.ts:94-132`). D2-Q2.
4. **Hai loại cùng bậc, khác số** ⇒ 409 `surcharge_conflict` ở lưu nháp, xem trước, xác nhận; cùng số thì không xung đột. D2-Q1.
5. **Đổi bên đặt:**
   - nháp ⇒ tính lại ở lần lưu;
   - đã xác nhận (`PUT …/booker`) ⇒ giữ phụ thu + cảnh báo;
   - gộp hồ sơ không đổi đơn đã xác nhận.
6. **Quyền:** cùng `pricing.surcharge.write`. Xem trước (Đ2.11) chỉ trả số của bên đặt của chính đơn đó; Đối tác bị ép bên đặt là chính mình, nên không dò được mức của đối tác khác.
7. **Nói một lần (P18):** người lập có thể chọn một bên đặt được miễn để khách không chịu phụ thu. Máy không ngăn; nhật ký ghi bên đặt.

### Đ5 — Hình chiếu tiền: sổ công nợ và chia phần theo người bán (TIỀN; `billing`, `receipt`, `orders` công bố) — tách khỏi Đ2 theo D-4

1. **`gross_snapshot` = tổng trước giảm giá của ĐƠN** (Σ thành tiền dịch vụ **+ Σ phụ thu**). **Đổi nghĩa cột sổ** `bil_posting.gross_snapshot`.
   - Sửa `thuongMaiCuaDon` (`billing/service.ts:334-339`).
   - `PhanThuongMai` (orders công bố, `phanThuongMaiCuaDon` `orders/index.ts:751`) mang thêm tổng phụ thu hiện hành (tên tạm `phuThu`).
   - `dichVu[].thanhTien` **giữ** nghĩa «thành tiền dịch vụ», dùng cho hoa hồng, giá vốn, kiểm VUOT (`billing/rules.ts:663`).
   - Không sửa thì «giảm giá bên đặt chịu» = `max(0, gross − phải thu)` (`:578`) hụt đúng số phụ thu. Trigger (iv) không bắt được, vì khi kết quả là 0 thì không có dòng nào để trigger xét. Ca PT-04b.
   - Trigger (iii), (iv) giữ nguyên chữ.
2. **Chia phần theo người bán** (biên nhận `chiaPhanBienNhan` `receipt/rules.ts:45`, trần «thu cho» `nhaCungCapCuaDon` `billing/rules.ts:533-541`):
   - phụ thu vào **phần Tour Đảo** [khuyến nghị, như phí đón — D-Q5];
   - cộng vào phần Tour Đảo **trước** khi trừ giảm giá; giảm giá trừ phần Tour Đảo trước (R-81). Ca PT-16;
   - hai đường **phải dùng cùng một phép** (Ruling R-154: trần «thu cho» bằng số biên nhận in) — cùng gọi `chiaPhanNguoiBan` với một «dòng phần Tour Đảo» chứa phụ thu.
3. **Giá vốn** nhà cung cấp tính trên thành tiền dịch vụ, không gồm phụ thu [D-Q5].
4. **Kiểm định kỳ:** thêm kiểm «`gross_snapshot` của phiếu Đã giao sau mốc phát hành = dịch vụ + phụ thu hiện hành lúc giao».

## Phương án bị bác

- **Đổi đơn giá dòng dịch vụ (giá mùa)**: chủ đã bỏ.
- **Phụ thu là «dịch vụ» riêng trong `order_service`**: sai bản thể; dính mọi luật của dịch vụ.
- **Bảng phụ thu ngoài `order_item`**: phải dựng lại trigger tạm tính / tổng.
- **Lọc dòng phụ thu ở từng chỗ dùng** (bản đầu): danh sách chỗ dùng dài, đã bỏ sót `draftFromDto`, `snapshotService`, `editablePaxCodesOf`, kiểm định kỳ (báo cáo kiểm D-2, D-6) — đúng khuôn lỗi «hai nơi hai luật» đã tái phát bốn lần (`money-adjustment.ts:144-153`). Tách một lần ở tầng đọc thì chỗ mới mặc định không thấy phụ thu.
- **Tự tính lại phụ thu trong lô xác nhận**: tiền đổi lặng lẽ lúc chốt (D-Q6).
- **Đặt công thức phụ thu ở tệp mới và thêm vào `PHAN_VAN_DA_RA`** (bản đầu): là **nới** hàng rào; danh sách đó chỉ dành cho chỗ không phải công thức tiền.
- **Đọc danh sách quy tắc để xem trước trên form**: lộ mức riêng của đối tác khác (sau D2) và không cho Đối tác/Thực tập xem.
- **Áp cho dịch vụ nhập tay; cộng dồn mùa; phạm vi «mọi dịch vụ»; dùng lại ô `partner.commission.write`.**
- **Phát hành D1 trước D2**: trái P-4 (đối tác được miễn bị thu) và để sổ đại lý sai (Đ5).

## Hệ quả (chỗ phải đổi khi thi công)

- **Migration** (số lấy lúc thi công; sau migration của lượt C1):
  - D1: `prc_surcharge_rule` + trigger; `order_item.line_kind`, `surcharge_rule_id` + trigger hình dạng; tạo lại trigger 0081.
  - D2: cột đích, `MIEN`.
  - `docs/data-dictionary.json` + `npm run dict`.
- **`pricing`**: hàm chọn quy tắc thuần (`rules.ts`); đọc quy tắc + khoảng mùa (`repository.ts`, view `v_lm_season_day_range`); route quy tắc, «Thử tính»; công bố hàm sinh dòng cho `orders` qua `index.ts`.
- **`src/shared/hoa-hong-dong.ts`**: hàm `phuThuMoiDonVi`. **`src/shared/phu-thu.ts`** (mới).
- **`orders`:**
  - tách ở tầng đọc: `repository.ts:91` `ITEM_SELECT`, `findOrder` `:307`, `getStoredServices` `:345-357`, `getServicesForSubtotal` `:1252-1262`;
  - DTO `src/shared/contracts.ts` (`OrderServiceDto.phuThu`);
  - sinh dòng ở `createOrder`/`updateDraftOrder` (`serviceInserts`);
  - `money-adjustment.ts:186-199` (cộng phụ thu);
  - `xac-nhan-chung.ts` (`kiemCongXacNhan` + `kiemPhuThu`);
  - `xac-nhan-route.ts` (chốt riêng Gửi xác nhận `:100-134`; Còn vé `ngayDi` trước `:309`);
  - `index.ts` (`PUT …/trip` cảnh báo; `PUT …/booker` (D2); route xem trước; `phanThuongMaiCuaDon` `:751` mang `phuThu` (D2/Đ5)).
- **Trình duyệt**: `src/shared/service-form.ts` (`draftFromDto`, `snapshotItem` đọc `items` đã tách — **không** đổi luật, chỉ thêm bài khẳng định không thấy phụ thu); `web/order-form.ts`, `web/service-card.ts` (dòng dự kiến); `src/shared/order-confirmation.ts`, `web/confirmation-image.ts`.
- **`billing`** (D2/Đ5): `thuongMaiCuaDon`, `nhaCungCapCuaDon`. **`receipt`**: `chiaPhanBienNhan` (Đ5), danh sách trắng dòng (D1).
- **Kiểm định kỳ**:
  - `scripts/audit-checks.mjs:121-127` (`COT_DICH_VU` chỉ dòng dịch vụ) — **không sửa thì R-BIL-2 / R-ORD-DC1 báo vi phạm giả và `audit-invariants --db remote` trong `npm run trien-khai` đỏ** (báo cáo kiểm D-6);
  - `scripts/audit-thuong-mai.mjs:45-53`;
  - thêm kiểm: dòng `PHU_THU` thiếu quy tắc; dòng `PHU_THU` của đơn đã xác nhận trỏ quy tắc đã kết thúc trước ngày xác nhận; (Đ5) `gross_snapshot`.
  - Bài `src/audit-invariants.test.ts` có ca phụ thu.
- **Tài liệu**: `docs/SYSTEM-DESIGN.md` §5, §6; `docs/CHANGE-GUIDE.md` (công thức «thêm loại dòng tiền»: tách ở tầng đọc, danh sách chỗ phải cộng).

## Tiêu chí nghiệm thu (viết trước; đỏ trước, xanh sau)

**D1**
1. Quy tắc nhóm `MOI_KHACH` mùa Tết, nháp ngày đi trong khoảng ⇒ dòng đúng PT-01; tạm tính, tổng gồm phụ thu. Ngoài mùa ⇒ không dòng.
2. Thân request có khoá lạ chứa số phụ thu, hoặc Đối tác thêm dịch vụ nhập tay «Phụ thu…» ⇒ số bị bỏ qua / 400 R1; không dòng `PHU_THU` nào ngoài số máy tính.
3. Đối tác Gửi đơn trên nháp có phụ thu ⇒ thành công. **Đỏ trước:** nếu dòng phụ thu lọt vào `items` ⇒ 403 «dùng đúng giá bán lẻ».
4. Hoa hồng `RATE` 10% = 10% × thành tiền **dịch vụ** (PT-04); `PER_PAX` của tour nhóm đếm lượt không gồm dòng phụ thu (PT-04c).
5. Biên nhận và trang đơn: mỗi dòng phụ thu là một dòng riêng dưới dịch vụ, có tên mùa.
6. Nháp đổi ngày bằng `PUT /api/orders/:id` ⇒ tính lại. Đổi ngày bằng `PUT …/trip` rồi xác nhận ⇒ 409 `surcharge_changed`, không ghi; Lưu lại rồi xác nhận ⇒ được. Gửi xác nhận trên nháp cũ ⇒ cùng 409, không mở yêu cầu.
7. **Còn vé kèm `ngayDi`** sang ngày có phụ thu khác ⇒ 409 `surcharge_changed`, câu cho người xét duyệt, yêu cầu vẫn mở, tổng không đổi (PT-14). Còn vé không đổi ngày ⇒ như hôm nay.
8. Nháp lưu trước khi Quản trị xác nhận khoảng Tết, xác nhận sau đó ⇒ 409 nêu số mới.
9. Đơn đã xác nhận đổi ngày sang ngoài mùa ⇒ tổng không đổi; phản hồi có cảnh báo; nhật ký có câu cảnh báo.
10. Hai bài đỏ trước, thay cho bài «`storedUnitPrices` ghi đè» của bản đầu:
    - (a) **sửa số khách sau xác nhận** trên đơn có phụ thu. Đỏ trước: bị từ chối «không sửa được qua đường này», HDV không có ô. Xanh: tính đúng PT-09, đơn giá dịch vụ giữ 1.050.000;
    - (b) **mở lại nháp có phụ thu trên form rồi Lưu không đổi gì** (bài thuần trên `draftFromDto` + thân gửi đi). Đỏ trước: đơn giá người lớn của dịch vụ thành số phụ thu. Xanh: thân gửi giữ 1.050.000, máy chủ trả đúng PT-15.
11. CSDL từ chối:
    - dòng `PHU_THU` thiếu mã quy tắc hoặc có `catalog_price`;
    - sửa / xoá dòng phụ thu sau xác nhận;
    - xoá / sửa số của `prc_surcharge_rule`;
    - hai quy tắc trùng ô cùng hiệu lực.
12. Quyền:
    - Kế toán, Quản trị, Toàn quyền ghi quy tắc ⇒ được, có nhật ký;
    - Bán hàng, Hiện trường, Đối tác, Thực tập, Tài xế, Nhân sự ⇒ 403;
    - Đối tác, Thực tập gọi route danh sách quy tắc ⇒ 403, nhưng gọi **xem trước** ⇒ 200 với đúng số của đơn mình, không có mã quy tắc trong phản hồi.
13. Hai mùa chồng ⇒ một phụ thu (PT-06); PT-06b, PT-06c theo câu trả lời D-Q3, D-Q4; dịch vụ thắng nhóm (PT-07).
14. Phần trăm làm tròn lên từng đơn vị (PT-02, PT-03b, PT-10).
15. Sổ vàng: 100% ca đã xác nhận qua; ca chờ ⇒ `todo` có tên; không xanh rỗng.
16. Hàng rào:
    - chèn dòng `PHU_THU` ở tệp khác ⇒ bài quét đỏ;
    - câu SQL mới đọc `order_item` ngoài danh sách cho phép, hoặc câu trong danh sách «phải chọn» mà không chọn `line_kind` ⇒ bài quét đỏ (Đ2.12);
    - bài đơn vị ba hàm chia: dòng `PHU_THU` không vào `items`;
    - trang đơn (`order-view.ts`) có dòng phụ thu; kiểm định kỳ `audit-thuong-mai.mjs:177` cộng phụ thu;
    - nhân/chia phần vạn ngoài `hoa-hong-dong.ts` ⇒ `hoa-hong-mot-nguon` đỏ;
    - gọi `phuThuMoiDonVi` ngoài `phu-thu.ts` ⇒ đỏ.
    - Quan sát chặn thật một lần, ghi `docs/SO-HANG-RAO.md` (P16).
17. Kiểm định kỳ trên CSDL thử có đơn có phụ thu đã «Đã giao» ⇒ R-BIL-2, R-ORD-DC1 **không** báo vi phạm (đỏ trước khi `COT_DICH_VU` chưa lọc).

**D2**
18. Loại Y `MIEN` cho nhóm trong Tết ⇒ đơn bên đặt loại Y (Đối tác tự lập **và** văn phòng lập hộ) không có dòng phụ thu (PT-D2-01).
19. Hồ sơ riêng thắng loại (PT-D2-02); miễn của loại ở nhóm thắng quy tắc dịch vụ cho mọi bên đặt (PT-D2-03).
20. Bên đặt mang hai loại khác mức ⇒ 409 `surcharge_conflict` ở lưu, xem trước, xác nhận (PT-D2-04).
21. Mùa ưu tiên cao chỉ có quy tắc cho loại khác ⇒ khách lẻ trả theo mùa thấp hơn (PT-D2-06).
22. Đổi bên đặt sau xác nhận sang bên được miễn ⇒ tổng không đổi, có cảnh báo (PT-D2-05).
23. Đối tác không đọc được dòng quy tắc của đối tác khác qua bất kỳ route nào.
24. (Đ5) «Đã giao» đơn đối tác giảm 100.000 có phụ thu 250.000 ⇒ `gross_snapshot` = dịch vụ + phụ thu; `GIAM_GIA_BEN_DAT` = 100.000 (PT-04b; đỏ trước với `gross` cũ = 0).
25. (Đ5) Dịch vụ do nhà cung cấp đứng tên bán: biên nhận và trần «thu cho» cùng ra phần Tour Đảo gồm phụ thu, phần nhà cung cấp không gồm (PT-13); giảm giá lớn hơn phụ thu (PT-16).

## Câu hỏi cho chủ (mỗi câu một khuyến nghị)

| # | Câu | Khuyến nghị |
|---|---|---|
| D-Q1 | Phần trăm tính trên giá niêm yết hay giá thỏa thuận? | **Giá niêm yết** (PT-10) |
| D-Q2 | Với phần trăm, «mỗi khách» và «theo dịch vụ» ra cùng số. Gộp thành một lựa chọn? | **Gộp** |
| D-Q3 | Hai mùa chồng, mùa ưu tiên cao **không có** quy tắc cho dịch vụ này: áp mùa thấp hơn hay không phụ thu? | **Áp mùa thấp hơn** (PT-06b) |
| D-Q4 | Quy tắc **nhóm** của mùa cao gặp quy tắc **dịch vụ** của mùa thấp? | **Mùa cao thắng** (PT-06c) |
| D-Q5 | Dịch vụ do nhà cung cấp đứng tên bán: phụ thu thuộc phần Tour Đảo, không vào giá vốn? | **Có** (PT-13, PT-16) |
| D-Q6 | Quy tắc / lịch / ngày đổi sau khi lưu nháp: lúc xác nhận báo «phụ thu đã đổi», hay tự tính lại? | **Báo, không tự đổi tiền** |
| D-Q7 | Hôm nay phụ thu Tết đang thu thế nào? | Cho biết; **trước khi bật**, văn phòng ngừng nhập tay phụ thu, chủ chạy một lệnh đếm chỉ đọc — tránh thu hai lần |
| D-Q8 | Lượt này xây trên **hai** lỗ đang hở: «đơn huỷ còn tiền» (TNV-G1) và «sửa sai sau Đã giao» (TNV-G3), hạn 30/11. Cho xây trên từng lỗ? Có đặt điều kiện «chỉ phát hành sau diễn tập khôi phục dữ liệu»? | **Cho xây trên cả hai, không phát hành trước khi TNV-G1 đóng**. **Có đặt** điều kiện diễn tập. Lần này khác phí đón (28/10, chủ không đặt điều kiện): Đ5 đổi nghĩa một **cột sổ** ở phiếu «Đã giao», giống sổ đại lý đợt 2 (18/10), lần đó chủ đã đặt điều kiện |
| D-Q9 | Ai đọc danh sách quy tắc phụ thu? | **Bán hàng, Kế toán, Quản trị, Toàn quyền**. Đối tác, Thực tập chỉ xem số dự kiến của chính đơn mình trên form |
| D-Q10 | Chia lượt duyệt: (a) D1 = 3 điều, D2 = 2 điều (miễn theo đối tác + sổ công nợ), **phát hành cùng lúc**; hay (b) duyệt gộp 5 điều, ghi «cho vượt trần» | **(a)** |
| D2-Q1 | Bên đặt mang hai loại có mức khác nhau: chặn cho tới khi sửa, hay tự lấy mức thấp hơn? | **Chặn và báo** |
| D2-Q2 | Loại được miễn ở cấp nhóm gặp quy tắc dịch vụ cho mọi bên đặt: miễn thắng? | **Miễn thắng** (PT-D2-03) |
| D2-Q3 | Mùa ưu tiên cao chỉ có quy tắc cho một loại đối tác khác bên đặt: bên đặt trả theo mùa thấp hơn hay không phụ thu? | **Theo mùa thấp hơn** (PT-D2-06) |

## Điều chưa chắc / chưa kiểm

- **Chưa kiểm** trên dữ liệu thật: cách thu phụ thu Tết hiện nay; đơn cũ lệch ngày; dịch vụ phòng dùng `perNPax`; mọi loại đối tác đã có dòng trong `prc_beneficiary_role` chưa.
- **Chưa tái hiện bằng bài thử** các hậu quả ở Đ2.6 (a), (b) và kiểm định kỳ: suy từ mã đã đọc (người kiểm độc lập cũng ghi là suy luận).
- Thứ tự cổng khi ADR-0146, ADR-0147 và lượt B cùng thi công: phụ thu đứng **sau** `congBanDuoc` ở mọi cửa; người thi công đối chiếu bốn văn bản.
- Tên của lượt B (`congBanDuoc`) lấy từ bản đọc 30/10, B đang sửa song song.
- Tên bảng, cột, thao tác, mã lỗi, route đều là **tên tạm**.

## Đếm quyết định chạm quyền / dữ liệu / tiền (`CLAUDE.md` §9, trần 3 mỗi lượt)

| Lượt | Điều | Chạm | Tính |
|---|---|---|:-:|
| D1 | Đ1 bảng quy tắc + thao tác mới `pricing.surcharge.write` (+ đổi nghĩa ô đọc `partner.commission.view`) | dữ liệu, quyền | ✔ |
| D1 | Đ2 dòng phụ thu trên đơn: loại dòng, tách ở tầng đọc, cổng xác nhận và Còn vé, R2 trên dòng dịch vụ, xem trước | dữ liệu, tiền | ✔ |
| D1 | Đ3 cách tính (chọn quy tắc, công thức, làm tròn) | tiền | ✔ |
| D2 | Đ4 khác / miễn theo loại và hồ sơ | dữ liệu, tiền | ✔ |
| D2 | Đ5 sổ công nợ (`gross_snapshot` đổi nghĩa) + chia phần theo người bán | tiền, dữ liệu sổ | ✔ |

- **D1 = 3** (đúng trần). **D2 = 2.** Gộp = 5.
- Nói rõ cho chủ (báo cáo kiểm D-4): bản đầu để đổi nghĩa `gross_snapshot` **trong** Đ2, khi đó D1 có 3 điều trên giấy nhưng thực chất là 4. Bản này tách nó thành Đ5 và đưa sang D2. Việc tách được vì D1 và D2 **bắt buộc phát hành cùng lúc**.
- Phương án khác: giữ Đ5 ở D1 (D1 = 4) với câu «cho vượt trần» của chủ, như tiền lệ ADR-0146. D-Q10.
- Đ1 và Đ2 vẫn gộp vài thay đổi nhỏ: đổi nghĩa ô đọc; R2 chỉ xét dòng dịch vụ. Người soạn coi đó là hệ quả trực tiếp của cùng điều. Chủ muốn tách thì mỗi cái thêm một điều.
