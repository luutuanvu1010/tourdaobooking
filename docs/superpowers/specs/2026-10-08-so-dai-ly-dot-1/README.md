# Đặc tả: Sổ đại lý — đợt 1 (bảng mức hoa hồng, người bán, tự tính giá đại lý, khoá tháng)

- **Ngày:** 2026-10-08. **Người soạn:** AI (phiên lập kế hoạch, nhánh `claude/so-tien-luot-2-dai-ly`, dựng từ `main` @`43857d7a`).
- **Trạng thái:** **ĐÃ DUYỆT 2026-10-08** (chủ, chat: "Đồng ý cả ba khuyến nghị, làm tiếp" — ba điều A1–A3 theo khuyến nghị). Sau lời duyệt, người kiểm độc lập chỉ đọc (báo cáo cùng ngày: `kiem-doc-lap.md` cùng thư mục) tìm ra một câu sai sự thật ở Phần A và một hệ quả chưa nêu ở §7; **hai điểm này chờ chủ xác nhận lại** (khối "Chờ bạn xác nhận lại" cuối Phần A). Các sửa khác cùng ngày chỉ là sửa lỗi sự thật hoặc ghi rõ ruling kỹ thuật, không đổi quyết định đã duyệt.
- **Thi công quyết định đã duyệt:** ADR-0077 (toàn bộ), ADR-0078 **phần B1** (điều 1–6), ADR-0080 **phần D1** (điều 1–7). Câu kèm C1–C13 = A (`docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`). Nới ba hàng rào: C12 = A (`…/de-xuat-luat.md` mục 1–3). Trang ghép gốc: `…/trang-ghep.md`; phần đổi từ đó tới nay ghi ở §6 (cột `HR`), §3 (`bil_outside_refund`) và dòng "Lộ trình" của Phần A.
- **Loại việc:** việc lớn (dữ liệu, tiền, quyền, luật kiến trúc). Sau thi công bắt buộc có người kiểm độc lập chỉ đọc (CLAUDE.md §3).
- **Xây trên lỗ đang hở: TNV-G1, TNV-G3, TNV-G4, HC-4.2** (`docs/quyen-hoan.json`, mức HIGH, hạn 2026-10-31). Chủ cho phép ngày 2026-10-08 (chat, chọn "Cho phép, có ghi lý do"). Lý do: phần khoá tháng chỉ thêm một lớp chặn "tháng đã khoá thì không ghi thêm" lên các bảng tiền mà bốn lỗ này chạm (`bil_payment_receipt`, `bil_posting`, `bil_outside_refund`). Nó không đổi cách tính "phải thu", "còn lại", đảo, hoàn, điều chỉnh, và không dựa vào phần còn hở. Phần bảng mức và phần chụp không ghi dòng nào vào sổ tiền. Đợt 2 có ghi dòng sổ, nên phải hỏi lại riêng. **Lỗ HC-5.19** (chưa diễn tập khôi phục Time Travel, hạn 2026-10-31) cũng chạm đợt này: khoá tháng là thao tác một chiều, khoá nhầm thì chỉ còn đường khôi phục chưa từng diễn tập (§13).

---

## Phần A — Cho chủ dự án đọc (một trang)

**Đợt 1 làm gì.** Kế toán (cùng Quản trị, Toàn quyền) có hai bảng mới. Bảng thứ nhất là **mức hoa hồng**: đặt theo loại đối tác (công ty lữ hành, hướng dẫn viên tự do, lễ tân khách sạn, tài xế taxi, cộng tác viên), theo từng dịch vụ hoặc nhóm dịch vụ, và có mức riêng cho từng đại lý; mỗi mức tính bằng % hoặc bằng số tiền trên mỗi khách. Bảng thứ hai là **người bán** của từng dịch vụ: mặc định Tour Đảo bán mọi dịch vụ; dịch vụ nào do nhà cung cấp bán (ví dụ vé tắm bùn i-resort) thì ghi tên nhà cung cấp và tỷ lệ Tour Đảo mua lại (ví dụ 80%).

Khi một đơn được **xác nhận**, Nền tảng tự ghi lại mức đang áp dụng cho từng dịch vụ của đơn. Từ đó trang đơn hiện thêm khối **"Phần đối tác"**: hoa hồng từng dịch vụ và **giá đại lý** (thành tiền của dịch vụ trên đơn, trước giảm giá, trừ hoa hồng). Đơn chưa xác nhận thì khối này hiện số dự kiến theo bảng hôm nay. Kế toán đổi bảng sau đó thì đơn đã xác nhận vẫn giữ mức cũ. Ví dụ đã duyệt, đơn của đại lý A:

| Dịch vụ | Thành tiền | Mức được dùng | Hoa hồng | Giá đại lý |
|---|---|---|---|---|
| Vé Hòn Tằm | 2.000.000 | riêng đại lý A: 12% | 240.000 | 1.760.000 |
| Du thuyền | 3.000.000 | công ty lữ hành, nhóm Du thuyền: 15% | 450.000 | 2.550.000 |
| Tour đảo | 1.000.000 | công ty lữ hành, mọi dịch vụ: 10% | 100.000 | 900.000 |
| **Cộng** | **6.000.000** | | **790.000** | **5.210.000** |

Dịch vụ nào chưa có mức thì khối này ghi rõ "Thiếu mức — Kế toán xử lý", và Kế toán (hoặc Quản trị, Toàn quyền) ghi mức tay cho đúng dịch vụ đó, có lý do. Nền tảng **không bao giờ tự lấy 0%**. Đại lý mở đơn của mình chỉ thấy số tiền hoa hồng của mình, không thấy tỷ lệ %, giá mua của nhà cung cấp hay phần của người khác. Đơn đại lý tự lập từ nay ghi **bên đặt là chính đại lý**; tên và số điện thoại khách đi tour vẫn ghi như cũ, và biên nhận gửi khách vẫn in tên khách (không in tên đại lý). Đơn đại lý tự lập không còn tạo hồ sơ khách cho khách đi tour (tên, SĐT khách vẫn nằm trên đơn). Form lập đơn của nhân viên có thêm ô **"Đặt qua đối tác"** để chọn đại lý (kể cả công ty lữ hành) làm bên đặt mà không đè mất tên khách đi tour. Trang đơn đổi chữ "Hồ sơ khách" thành "Bên đặt (đối tác)" khi bên đặt là đối tác.

Kế toán còn có nút **"Khoá tháng"**: tháng đã khoá thì không ai ghi thêm khoản tiền nào có ngày thuộc tháng đó, kể cả Kế toán. Sai sót phát hiện sau thì ghi điều chỉnh vào tháng đang mở. Tháng đã khoá không mở lại được.

**Đợt 1 chưa làm.** Sổ chưa ghi đại lý nợ công ty hay công ty nợ đại lý, và đơn có bên đặt là đại lý chưa bấm được "Đã giao" (việc của đợt 2). **Sửa sau kiểm độc lập:** hôm nay đơn đại lý tự lập **vẫn bấm "Đã giao" được**, vì bên đặt của các đơn này đang ghi là khách đi tour (tính như khách lẻ, không hoa hồng). Chính đợt 1, khi ghi bên đặt là chính đại lý, mới làm các đơn này **bị giữ ở bước "Đã giao" (nên chưa "Hoàn thành" được) cho tới khi đợt 2 lên**. Bản trước của đoạn này viết như thể việc giữ đã có từ trước; câu đó sai, nên bạn chọn lại ở khối cuối Phần A. Quyết toán gộp tháng và mục "Sổ của tôi" cho đại lý là việc của đợt 3.

**Ba điều cần bạn quyết khi duyệt** (mỗi điều có khuyến nghị; đổi lại sau được):
1. **Làm tròn hoa hồng: làm tròn nửa lên, tính theo từng dịch vụ** (khuyến nghị). Ví dụ đã duyệt A-5: mức 12,5% trên 999.999đ ra 124.999,875đ, làm tròn thành **125.000đ**. Nếu làm tròn xuống thì ra 124.999đ. Ca đúng nửa đồng: 12,5% trên 1.000.004đ ra 125.000,5đ, làm tròn nửa lên thành **125.001đ**.
2. **Dịch vụ đưa đón không được ghi nhà cung cấp mua lại** (luật X3 đã chốt, để khỏi tính tiền xe hai lần). Tôi đề xuất hiểu "dịch vụ đưa đón" là **mọi dịch vụ trong nhóm "Thuê xe"** (các mã xe sân bay SB…); "Buýt City Tour" không tính là đưa đón (khuyến nghị). Lý do không dùng cách "dịch vụ nào có cài xe đón" (**sửa sau kiểm độc lập**, lý do cũ không kiểm được): bảng mức nằm ở phần giá, mà phần giá không được đọc dữ liệu của phần Vận chuyển (quyết định đã duyệt ADR-0078 điều 4, ADR-0040), nên chỉ dùng được nhóm dịch vụ. Đánh đổi: dịch vụ của nhà cung cấp có kèm xe Tour Đảo đưa đón vẫn tính tỷ lệ mua lại trên cả phần xe; luật chống tính tiền xe hai lần chỉ giữ được ở nhóm "Thuê xe".
3. **Màn hình:** tôi dựng theo khuôn các màn quản trị đang có, dùng hai nhãn **"Hoa hồng"** và **"Giá đại lý"**, rồi gửi ảnh chụp thật trên máy tính và điện thoại để bạn duyệt một lượt trước khi phát hành (khuyến nghị). Bạn đổi nhãn được khi xem ảnh.

**Lộ trình ba đợt** (bạn chốt ngày 8/10): đợt 1 là đặc tả này; **đợt 2** mở "Đã giao" cho đơn đại lý, sổ tự ghi ai nợ ai trên từng đơn, ghi được tiền khách trả cho đại lý hoặc tại quầy nhà cung cấp, biên nhận chia hai phần theo người bán, thêm giới hạn giảm giá của đại lý, và xử lý đơn cũ; **đợt 3** làm quyết toán gộp tháng và "Sổ của tôi" cho đại lý. Mỗi đợt có đặc tả, người kiểm độc lập và lần phát hành riêng. Lộ trình này thay câu "phát hành chung một bản" ở dòng 6 của ADR-0077, ADR-0078, ADR-0080 (lời chủ 8/10); hạn "khoá kỳ cùng bản với D4/D5" vẫn giữ vì khoá tháng lên ngay đợt 1.

**Chờ bạn xác nhận lại (sau kiểm độc lập 2026-10-08).** — **Chủ đã xác nhận 2026-10-08** (chat, cùng lượt duyệt kế hoạch thi công): điểm 1 = **(a) chấp nhận khoảng chờ**; điểm 2 = **đồng ý thu hẹp**. Kèm một sự thật kiểm cùng ngày: tài khoản chỉ gắn được hồ sơ cá nhân (`src/modules/staff/index.ts`), nên Đối tác tự lập đơn thì người hưởng là hồ sơ cá nhân của tài khoản; muốn hoa hồng cho công ty thì văn phòng lập hộ và chọn công ty làm bên đặt.
1. **Đơn đại lý tự lập trong khoảng giữa đợt 1 và đợt 2.** (a) Chấp nhận các đơn này bị giữ ở "Đã giao" tới đợt 2; đổi lại đại lý thấy ngay hoa hồng của mình trên đơn (khuyến nghị, vì hiện chỉ có dữ liệu thử). (b) Dời phần "bên đặt là chính đại lý" sang đợt 2: đơn đại lý tự lập chạy như hôm nay, tính như khách lẻ, chưa hiện hoa hồng; sang đợt 2 phải chuyển bên đặt cho các đơn này rồi chụp lại, đơn nào đã "Đã giao" thì chỉ trả hoa hồng được bằng phiếu điều chỉnh.
2. **Tài khoản vừa là đối tác vừa là nhân viên ("tài khoản lai").** Nền tảng không cho hồ sơ của loại tài khoản này mang vai được hưởng hoa hồng (luật LC-1 đang chạy), nên nếu áp nguyên chữ "bên đặt là chính tài khoản" thì không ai được hoa hồng mà tài khoản mất luôn cách gắn hồ sơ khách. Khuyến nghị: **chỉ ghi bên đặt là chính tài khoản khi hồ sơ của tài khoản đang mang vai được hưởng**; tài khoản khác giữ như hôm nay. Cách này hẹp hơn chữ của ADR-0077 điều 3 (i), nên cần bạn đồng ý.

---

## Phần B — Cho người thi công

### 1. Hiện trạng mã (mốc `main` @`43857d7a`)

- Chưa có gì của lượt 2: không `src/modules/pricing/`, không `ky-so`, không bảng `prc_*`/`ky_*`. `src/architecture.test.ts` đã khai sẵn cạnh `orders → pricing`, `pricing → parties, catalog, audit`, tiền tố `prc_`/`prc`. Chưa có `ctl` trong `VIEW_PREFIX`; chưa có `ky-so`.
- Xác nhận đơn: `confirmOrder` (`src/modules/orders/repository.ts`) gửi một `db.batch` gồm ba câu: điền ngày chặng, `UPDATE orders` sang `confirmed` (câu quyết định thắng thua), nhật ký. Chưa có chỗ nhận câu ngoài; tiền lệ là `createOrder(…, alsoCreate)`.
- Bên đặt: `resolveBooker` (`src/modules/orders/service.ts`) và giá trị ghi `BOOKER_VALUE` (`repository.ts`) chỉ nhận hồ sơ **cá nhân** đang hoạt động; hồ sơ tổ chức bị từ chối ("Chưa gắn được đại lý vào đơn ở bản này"). Đơn do tài khoản Đối tác lập ghi bên đặt là khách cuối do form gửi, hoặc trống. Đổi bên đặt sau xác nhận qua `PUT /api/orders/:id/booker` (ô `order.trip.edit`).
- "Đã giao" bị chặn khi bên đặt mở một vai nhóm `EXTERNAL`, ở hai lớp: `lyDoChuaGiaoDuoc` (`src/modules/billing/rules.ts`, mã `booker_partner`) và mệnh đề `NOT EXISTS (… v_pty_open_role_group … 'EXTERNAL')` trong `DAT_GIAO_DIEU_KIEN` (`src/modules/orders/hoan-tat-repo.ts`). **Đợt 1 giữ nguyên cả hai.**
- Năm mã vai được hưởng đã có trong `pty_role_type` (`migrations/0024`). View `v_pty_open_role_group` chỉ trả nhóm, không trả mã vai. Chưa có mã vai `SUPPLIER`.
- Nhóm dịch vụ: `ctl_group`, `ctl_service_group` (`migrations/0055`); nhóm hiện hành của một mã là dòng có `seq` lớn nhất. Chưa có view `v_ctl_*`. Mã xe sân bay `SB*` nằm trong nhóm `TXE` ("Thuê xe").
- Bảng tiền có `occurred_date`: `bil_payment_receipt`, `bil_posting` (`0045`), `bil_outside_refund` (`0079`), `vc_trip_cost_line` (`0073`). `bil_debt_line` theo ngày của phiếu.
- `van-chuyen` đã có hàm ngày ghi đảo `ngayGhiDao(goc, { homNay, kyDaKhoa? })` (`src/modules/van-chuyen/tien-xe.ts`, ADR-0095 Q2); đợt này chỉ cần truyền `kyDaKhoa` thật.
- R2/R3 (đối tác dùng giá danh mục, trần giảm giá = 0) khoá theo người thao tác (`src/modules/orders/price-guards.ts`). **Đợt 1 giữ nguyên**; trần theo hoa hồng là việc đợt 2 (ADR-0079 điều 9).
- `MA_QUYEN_TIEN` (ADR-0090) suy từ danh sách cố định `O_GHI_TIEN` (`src/shared/permissions.ts`).
- Số migration: lớn nhất trên `main` là `0088`; `0084`–`0086` và `0089` đang bị nhánh chưa gộp giữ ⇒ dự kiến **`0090`**, rà lại mọi nhánh ngay lúc tạo tệp (CLAUDE.md §10).

### 2. Phạm vi

**Trong đợt 1:**
1. Module `pricing` (STRICT): bảng mức hoa hồng, danh sách vai được hưởng, điều khoản cung ứng, luật thuần chọn mức / tính hoa hồng / tính giá vốn, route quản lý và thử tra.
2. Vai hồ sơ `SUPPLIER` ("Nhà cung cấp"); view công bố `v_pty_open_role`, `v_ctl_service_group`.
3. Bảng chụp `ord_service_terms` (module `orders`): chụp trong lô Xác nhận, chụp lại khi đổi bên đặt, ghi mức tay; route đọc phần thương mại; hàm công bố `phanThuongMaiCuaDon`.
4. Bên đặt theo C13 cho **đơn mới**: tài khoản Đối tác ⇒ bên đặt = hồ sơ của tài khoản; nhân viên chọn được hồ sơ tổ chức mang vai được hưởng.
5. Module `ky-so` + khoá tháng ở hai lớp cho bốn bảng tiền có ngày phát sinh; route khoá và xem tháng.
6. Ô quyền mới: `partner.commission.view`, `partner.commission.write`, `order.terms.view`, `order.terms.override`, `supply.terms.view`, `supply.terms.write`, `ledger.period.close`.
7. Kiểm định kỳ `R-PRC-1…5`, `R-ORD-T1`, `R-ORD-T2`, `R-KY-1`, `R-KY-2`.
8. Giao diện: màn "Hoa hồng đối tác", màn "Người bán dịch vụ", khối "Phần đối tác" trên trang đơn, hộp "Ghi mức tay", màn "Khoá tháng", đổi ô bên đặt ở form lập đơn.
9. Nới hàng rào kiến trúc (C12 mục 1–3), sổ hàng rào, tài liệu mô tả, mục nhật ký thay đổi.

**Để đợt 2** (ADR-0078 B2, ADR-0079): mở "Đã giao" cho đơn có người hưởng (đổi cả hai lớp), dòng sổ hoa hồng / giảm giá bên đặt chịu / giá vốn, trigger `terms_missing`, người thu `BOOKER`/`SUPPLIER`, biên nhận chia phần, trần giảm giá theo hoa hồng, chụp bù và danh sách "đơn cần chuyển bên đặt" cho đơn xác nhận trước đợt 1, `R-BIL-5`.
**Để đợt 3** (ADR-0080 D2, ADR-0081): phiếu bù trừ nhiều đơn, bảng kê tháng, "Sổ của tôi" cho đại lý.

### 3. Dữ liệu (một migration, chỉ thêm; số chốt lúc tạo tệp)

**`parties`:**
- `pty_role_type` thêm `SUPPLIER` ("Nhà cung cấp"), nhóm `OTHER`, `active = 1` (ADR-0078 điều 1).
- View `v_pty_open_role(party_id, role_type_code, role_group)`: vai có `valid_to_date IS NULL` (cùng nghĩa "đang mở" với `v_pty_open_role_group`), mọi nhóm. Không tên, không SĐT.

**`catalog`:**
- View `v_ctl_service_group(catalog_code, group_code)`: nhóm hiện hành của từng mã (dòng `seq` lớn nhất); `group_code` NULL = "Chưa phân loại".

**`pricing`:**
- `prc_beneficiary_role(role_type_code PK → pty_role_type, active, WHO)`: gieo `TRAVEL_AGENCY`, `GUIDE_FREELANCE`, `HOTEL_RECEPTION`, `TAXI_DRIVER`, `COLLABORATOR`, đều `active = 1` (C3 = A).
- `prc_commission_rule`: đúng ADR-0077 điều 4. Cột: `id`, `target_party_id` | `target_role_code` (`CHECK` đúng một), `scope` ∈ `SERVICE`/`GROUP`/`ALL` + `catalog_code` | `group_code` (`CHECK` khớp), `kind` ∈ `RATE`/`PER_PAX` + `rate_bp` (0…10000) | `per_pax_amount` (≥ 0) (`CHECK` đúng một), `valid_from_date`, `valid_to_date`, `note`, bốn cột WHO. Trigger: không `DELETE`; `UPDATE` chỉ được đóng hiệu lực (`valid_to_date` từ NULL thành một ngày ≥ `valid_from_date`, mọi cột khác giữ nguyên trừ `updated_*`); không hai dòng cùng (áp cho, phạm vi, mã) chồng khoảng hiệu lực; `target_party_id` phải đang mở ít nhất một vai đang bật trong `prc_beneficiary_role` (đọc `v_pty_open_role`); `target_role_code` phải thuộc danh sách đang bật.
- `prc_supply_term`: đúng ADR-0078 điều 2. Cột: `id`, `scope` + `catalog_code` | `group_code`, `seller_party_id` (bắt buộc), `supplier_party_id` + `cost_rate_bp` (0…10000; có ⇔ người bán ≠ công ty chủ; khi có thì `supplier_party_id = seller_party_id`), `valid_from_date`, `valid_to_date`, `note`, WHO. Trigger: không xoá, chỉ đóng, không chồng (cùng khuôn); người bán ≠ công ty chủ (đọc `v_pty_owner_company`) thì phải đang mở vai `SUPPLIER`; **phạm vi `ALL` chỉ được người bán = công ty chủ** (ruling AI: dòng "mọi dịch vụ" mang a% sẽ trùm cả dịch vụ đưa đón, trái X3); X3: dòng có a% không được trỏ tới nhóm `TXE` hay một mã đang thuộc nhóm `TXE` (đọc `v_ctl_service_group`) — điều A2 của Phần A, chủ quyết.
- Gieo một dòng `prc_supply_term`: `ALL`, người bán = công ty chủ (lấy từ `v_pty_owner_company`), `valid_from_date = '2025-01-01'` (mốc cố định sớm hơn mọi đơn — ADR-0078 điều 3).
- View công bố: `v_prc_commission_rule`, `v_prc_supply_term` (chỉ cột cần cho chọn mức, không ghi chú), `v_prc_beneficiary_role`.

**`orders`:**
- `ord_service_terms`: đúng ADR-0077 điều 8 + ADR-0078 điều 5. Cột: `id`, `order_id`, `order_service_id`, `beneficiary_party_id`, `commission_status` ∈ `NONE`/`SET`/`MISSING`, `missing_reason` ∈ `NO_RULE`/`RULE_CONFLICT`/`MANUAL_LINE`/`BOOKER_NOT_BENEFICIARY`/`NOT_CAPTURED` (có ⇔ `MISSING`), `commission_kind`, `commission_rate_bp` | `commission_per_pax` (đúng một khi `SET`), `commission_rule_id`, `supply_status` ∈ `SET`/`MISSING`, `seller_party_id`, `supplier_party_id`, `cost_rate_bp`, `supply_term_id`, `source` ∈ `AUTO`/`MANUAL`, `reason` (bắt buộc khi `MANUAL`), `supersedes_id` (`UNIQUE`), `captured_date`, WHO.
  Trigger: chỉ-thêm (chặn `UPDATE`/`DELETE`); `order_service_id` phải thuộc `order_id`; `supersedes_id` phải cùng `order_service_id`; mỗi dòng dịch vụ tối đa một bản hiện hành (dòng mới không `supersedes_id` chỉ khi dòng dịch vụ chưa có bản nào); chặn chèn khi đơn đã "Đã giao" (`orders.delivered_at`, khuôn `0044`); `AUTO` có `commission_rule_id` thì dòng mức đó phải hiệu lực ở `captured_date` (đọc `v_prc_commission_rule`), `supply_term_id` cũng vậy. Lớp CSDL này bắt trường hợp bảng mức vừa bị đóng giữa lúc đọc và lúc ghi: cả lô rơi, route trả 409 "Bảng mức vừa đổi — thử lại".
- View `v_ord_terms_missing(order_id)`: đơn còn bản hiện hành `MISSING` (hoa hồng hoặc người bán). Tạo ngay (ADR-0077), đợt 2 mới dùng trong trigger "Đã giao".
- **Sửa sau kiểm độc lập (N4):** mốc của `R-ORD-T1` neo vào **lúc áp migration**, không suy từ bản chụp đầu (cách cũ tự tắt khi mã chụp không chạy). Bảng `ord_audit_cutoff(code PK, cutoff_at, WHO)` chỉ-thêm, cùng khuôn `bil_audit_cutoff` (`0080`), gieo dòng `R-ORD-T1` = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`.

**`ky-so`:**
- `ky_period_close(period PK 'YYYY-MM', closed_at, closed_by, note, WHO)`, chỉ-thêm; trigger **liền kề** (bảng rỗng: tháng nào cũng được; có dòng: phải đúng tháng ngay sau tháng lớn nhất); chỉ đọc chính bảng này. View `v_ky_closed_period(period)`.

**Khoá tháng ở các module có bảng tiền:**
- `billing`: trigger `BEFORE INSERT` `*_period_closed` trên `bil_payment_receipt`, `bil_posting`, `bil_outside_refund`: `substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)` ⇒ `RAISE 'period_closed: …'`. `bil_outside_refund` có sau ADR-0080 nhưng thuộc "mọi bảng tiền có ngày phát sinh đang tồn tại" (ADR-0080 điều 3).
- `van-chuyen`: trigger cùng khuôn trên `vc_trip_cost_line`.

Mọi bảng / view mới vào `docs/data-dictionary.json` rồi `npm run dict`.

### 4. Luật thuần (`src/modules/pricing/rules.ts`, có `rules.test.ts` cạnh)

- **Người hưởng của đơn:** bên đặt mở ít nhất một vai đang bật trong danh sách ⇒ người hưởng = bên đặt, vai = các vai đó. Bên đặt mở vai nhóm `EXTERNAL` không thuộc danh sách (vd Tài xế đối tác) ⇒ mọi dòng `MISSING` / `BOOKER_NOT_BENEFICIARY`. Bên đặt nội bộ, khách lẻ, công ty chủ, hoặc trống ⇒ `NONE` (không phải thiếu).
- **`chonMuc`** (một hàm duy nhất): chỉ xét dòng hiệu lực ở ngày chụp (`valid_from_date ≤ ngày`, `valid_to_date` trống hoặc ≥ ngày); sáu bậc, bậc cụ thể nhất thắng: (1) đối tác + dịch vụ, (2) đối tác + nhóm, (3) đối tác + mọi dịch vụ, (4) vai + dịch vụ, (5) vai + nhóm, (6) vai + mọi dịch vụ. Hai vai cho hai mức khác nhau ở cùng bậc 4–6 ⇒ `MISSING`/`RULE_CONFLICT`. Không khớp ⇒ `MISSING`/`NO_RULE`. Dòng nhập tay (không mã danh mục) có người hưởng ⇒ `MISSING`/`MANUAL_LINE`. Dịch vụ "Chưa phân loại" chỉ khớp bậc dịch vụ hoặc mọi dịch vụ. Mức 0 ghi rõ là hợp lệ.
- **`chonDieuKhoan`:** `SERVICE` > `GROUP` > `ALL`, hiệu lực ở ngày chụp; dòng nhập tay luôn `MISSING` (A-14); không khớp ⇒ `MISSING`. Bên đặt cũng là nhà cung cấp của một dòng trên đơn ⇒ hoa hồng của dòng đó `MISSING`/`RULE_CONFLICT`.
- **`hoaHongDong`:** `RATE` ⇒ làm tròn tới đồng của `rate_bp × thành tiền dòng hiện hành trước giảm giá cấp đơn / 10000`, **nửa lên, theo dòng** (điều A1 của Phần A); `PER_PAX` ⇒ `per_pax_amount × số khách tính hoa hồng hiện hành` (người lớn + trẻ em + người cao tuổi, không em bé; dịch vụ tính theo lượt thì đếm lượt — H7). Số khách và thành tiền là số **hiện hành** sau điều chỉnh, mức là mức **đã chụp** (A-2).
- **`giaVonDong`:** cùng cách làm tròn, trên thành tiền trước giảm (H8 = A).
- **Giá đại lý** của một dòng = thành tiền trước giảm − hoa hồng (chỉ để hiển thị; không lưu).
- Thành tiền và số khách hiện hành của từng dòng lấy từ **một** hàm đang có của `orders` (kế hoạch chỉ đúng tên hàm), không viết công thức thứ hai.

### 5. Chụp vào đơn (module `orders`)

- **Lúc Xác nhận** (`POST /api/orders/:id/status` → `confirmed`): route đọc trước lô vai của bên đặt, bảng mức, điều khoản, nhóm dịch vụ hiện hành (qua `pricing/index.ts`, ngày = `vnToday()`), tính bản chụp từng dòng bằng luật §4, rồi gửi **trong cùng `db.batch`** với `confirmOrder`: các câu `INSERT ord_service_terms` chạy **sau** câu nhật ký `confirmed` và chỉ ghi khi câu `UPDATE orders` thắng. **Cách gác (sửa sau kiểm độc lập, N3):** nối chuỗi `changes() > 0` (CHANGE-GUIDE công thức f): `UPDATE orders` → nhật ký `confirmed` (`changes() > 0`) → mỗi câu chụp `INSERT … SELECT … WHERE changes() > 0` → nhật ký `order_terms_captured` (`changes() > 0`). **Không** đọc `audit_log` (sẽ phải nới hàng rào thứ tư) và **không** so `updated_at = at` (hai lệnh xác nhận đọc cùng mốc thì `nextStamp` trả cùng `at`, lệnh thua lọt qua lính gác). Câu quyết định thắng thua vẫn là `UPDATE orders`. Một câu chụp lỗi thì cả lô rơi và đơn không thành `confirmed` (tiêu chí 3). Nhật ký `order_terms_captured`: một dòng cho cả đơn.
- **Đổi bên đặt sau xác nhận** (`PUT /api/orders/:id/booker`): cùng lô với câu đổi bên đặt, chụp lại **mọi** dòng theo bên đặt mới và bảng ở ngày đổi (dòng mới trỏ `supersedes_id`), gác cùng cách nối chuỗi; nhật ký `order_terms_recaptured`. **Đơn chưa có bản chụp nào** (xác nhận trước đợt 1) thì đổi bên đặt **không chụp** — để chụp bù theo mức ngày xác nhận ở đợt 2 (C4 = A) không bị giành trước (ruling sau kiểm độc lập, N15).
- **Ghi mức tay** `POST /api/orders/:id/thuong-mai/:serviceId` (cổng `office`, ô `order.terms.override`): chỉ đơn đã xác nhận, chưa "Đã giao", **và dòng dịch vụ đã có bản chụp hiện hành** (đơn xác nhận trước đợt 1 ⇒ 409 "Đơn xác nhận trước khi có bảng mức — chờ chụp bù ở bản sau"; N15); thân gồm phần hoa hồng (kiểu + số) và/hoặc phần người bán (người bán, a% nếu nhà cung cấp); phần không gửi chép từ bản hiện hành; lý do bắt buộc (≥ 10 ký tự, khuôn `bil_adjustment_reason_length`); `source = MANUAL`, `supersedes_id` = bản hiện hành; nhật ký `order_terms_manual` (mức trước → sau, không tiền khách); `baoThayDoi` loại "tiền". Hai người ghi tay cùng lúc: `supersedes_id` `UNIQUE` chặn người sau ⇒ 409 "vừa đổi".
- **Nhật ký của phần này không lộ cho Đối tác** (ruling AI, giữ C9): lịch sử đơn (`GET /api/orders/:id`) lọc bỏ ba hành động `order_terms_*` khi người xem giữ quyền Đối tác, cùng khuôn lọc dòng "đã nhập phần mềm kế toán" (ADR-0060).
- **Tên nhật ký của bảng mức và điều khoản** (N14, theo ADR-0077 điều 12): `prc_commission_rule_added`, `prc_commission_rule_closed`, `prc_supply_term_added`, `prc_supply_term_closed`; khoá tháng: `ledger_period_closed`.
- **Không chụp lại** khi đổi số khách, sửa tiền qua dòng điều chỉnh, đổi giờ, đổi người phụ trách (ADR-0077 điều 9).
- Đơn xác nhận **trước** đợt 1 không có bản chụp: khối "Phần đối tác" ghi "Đơn xác nhận trước khi có bảng mức". Chụp bù là việc đợt 2.
- SQL `ord_service_terms` chỉ ở một tệp nửa nghiêm mới của `orders` (`defineSql`, EXPLAIN), thêm vào danh sách tệp nửa nghiêm ở `src/architecture.test.ts`.

### 6. Route đọc, quyền

**Route mới:**

| Route | Cổng | Ô hỏi trong thân |
|---|---|---|
| `GET /api/pricing/hoa-hong` | office | `partner.commission.view` |
| `POST /api/pricing/hoa-hong`, `POST /api/pricing/hoa-hong/:id/dong` | office | `partner.commission.write` |
| `GET /api/pricing/thu-tra?doiTac=&dichVu=&ngay=` (mức nào thắng, bậc mấy) | office | `partner.commission.view` |
| `GET /api/pricing/cung-ung` | office | `supply.terms.view` |
| `POST /api/pricing/cung-ung`, `POST /api/pricing/cung-ung/:id/dong` | office | `supply.terms.write` |
| `GET /api/orders/:id/thuong-mai` | orders | `order.view` (phạm vi đơn) → `order.terms.view`; khối a% / giá vốn thêm `supply.terms.view` |
| `POST /api/orders/:id/thuong-mai/:serviceId` | office | `order.terms.override` |
| `POST /api/ledger/ky/:period/khoa` (module `billing`) | office | `ledger.period.close` |
| `GET /api/ledger/ky` (tháng đã khoá, tháng khoá được kế tiếp, bảng kiểm trước khi khoá) | office | `ledger.view` phạm vi `any` |

**`GET /api/orders/:id/thuong-mai`** trả hai DTO danh sách trắng khác nhau:
- Văn phòng (`order.terms.view` không phải phạm vi `own` của Đối tác): người hưởng (tên), từng dòng: tên dịch vụ, thành tiền trước giảm, số khách tính, kiểu + mức (% hoặc đ/khách), hoa hồng, giá đại lý, người bán (tên), cờ thiếu + lý do + "Kế toán xử lý"; tổng. Khối người bán là nhà cung cấp kèm a% và giá vốn chỉ khi có `supply.terms.view`. Đơn nháp: cùng khuôn, cờ `duKien = true`, tính theo bảng hôm nay, không lưu.
- Đối tác (`own`): tên dịch vụ, thành tiền trước giảm, **số tiền** hoa hồng của mình, giá đại lý, tổng, cờ "đang chờ Công ty cài mức". **Không** tỷ lệ, không đ/khách, không `commission_rule_id`, không nguồn bản chụp, không người bán kèm a%, không giá vốn (C9 = A).
- Biên nhận (`ReceiptDto`) không đổi: không bao giờ có hoa hồng, tỷ lệ, giá vốn.

**Ô quyền** (10 cột, thứ tự `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR`):

| Ô | Giá trị |
|---|---|
| `partner.commission.view` | any, any, any, none, none, any, none, none, none, none |
| `partner.commission.write` | none, any, any, none, none, any, none, none, none, none |
| `order.terms.view` | any, any, any, assigned, own, any, own, none, none, none |
| `order.terms.override` | none, any, any, none, none, any, none, none, none, none |
| `supply.terms.view` | none, any, any, none, none, any, none, none, none, none |
| `supply.terms.write` | none, any, any, none, none, any, none, none, none, none |
| `ledger.period.close` | none, any, none, none, none, any, none, none, none, none |

- Cột `HR` = `none` ở mọi ô mới (ADR-0071: Nhân sự không chạm đơn, tiền). Các ADR 0077–0080 viết bảng 9 cột trước khi có `HR`; ghi ở đây là áp đúng ADR-0071, không phải quyết định mới.
- Bài khoá giá trị: `supply.terms.view` ⊆ `order.terms.view` ⊆ `money.view` ở mọi cột; `DRIVER`, `DRIVER_PARTNER`, `HR` = `none` ở cả bảy ô; mỗi ô có route hỏi nó trong cùng bản phát hành (không thêm mục hoãn).
- **Sửa sau kiểm độc lập (N6):** **không** thêm `ledger.period.close` vào `O_GHI_TIEN` ở đợt này. Danh sách bốn ô đó do ADR-0090 điều 0 ghim nguyên văn; thêm ô là đổi một ADR đã duyệt. Tập `MA_QUYEN_TIEN` đằng nào cũng không đổi (Kế toán, Toàn quyền đã có). Ghi thành đề xuất bổ sung ADR-0090 trong tệp đề xuất luật của đợt để chủ duyệt sau.

### 7. Bên đặt cho đơn mới (C13 = A, phần đơn mới)

- **Chủ đã xác nhận 2026-10-08** (khối cuối Phần A): điểm 1 = (a), điểm 2 = thu hẹp — áp đúng bản dưới đây.
- **Tài khoản giữ quyền Đối tác** (`holdsPartner`) **mà hồ sơ của tài khoản đang mở ít nhất một vai trong danh sách được hưởng** lập đơn hoặc lưu nháp: máy chủ đặt `booker_party_id = staff.partyId`, bỏ qua bên đặt trình duyệt gửi. Tài khoản Đối tác khác (kể cả tài khoản lai — LC-1 không cho hồ sơ của nó mang vai bên ngoài) giữ đúng hành vi hôm nay. `PUT /api/orders/:id/booker` không cần luật này: Đối tác không có ô `order.trip.edit` (403). Tên, SĐT khách đi tour vẫn vào các cột chụp `customer_*` của đơn như hôm nay. Tài khoản không gắn hồ sơ ⇒ 409 "Tài khoản đối tác chưa gắn hồ sơ — nhờ văn phòng". Form lập đơn của Đối tác thay ô chọn người đặt bằng dòng chỉ đọc "Bên đặt: <tên đối tác>".
- **Nhân viên lập hộ:** `resolveBooker` và `BOOKER_VALUE` nhận thêm hồ sơ **tổ chức** đang hoạt động **khi** hồ sơ đó mở ít nhất một vai trong danh sách được hưởng; tổ chức không mang vai đó ⇒ 400.
- **Giao diện chọn bên đặt (ruling AI):** ô "hồ sơ khách" hôm nay (`web/booker-picker.ts`) tra theo **SĐT khách** và tự điền tên khách vào `customer_name`, nên không dùng để chọn đại lý được (sẽ đè tên, SĐT khách đi tour bằng của đại lý, và biên nhận in tên đại lý). Thêm ô riêng **"Đặt qua đối tác"** ở form lập đơn và bảng đổi bên đặt (`web/booker-sheet.ts`): tìm theo tên trong các hồ sơ (cá nhân hoặc tổ chức) mang vai được hưởng; khi đã chọn thì ô tra hồ sơ khách ẩn đi, hai ô tên + SĐT khách vẫn là của khách đi tour; bỏ chọn thì trở lại như cũ. Ô tra hồ sơ khách theo SĐT giữ nguyên hành vi hôm nay. Thân yêu cầu vẫn dùng trường `bookerPartyId` sẵn có. `changeBooker` hôm nay ghi cùng lúc `customer_name`, `customer_phone` và bên đặt: giữ nguyên, vì hai ô khách luôn gửi kèm.
- **Những chỗ đọc `booker_party_id` và việc phải làm** (rà `grep` 2026-10-08 trên `src/`, `web/`, trừ tệp test):

| Chỗ đọc | Sau đợt 1 hiện gì | Việc |
|---|---|---|
| Biên nhận (`receipt/rules.ts`) | đọc `customer_name`, không đọc bên đặt | không đổi; bài kiểm: đơn Đối tác ⇒ biên nhận in tên khách |
| Trang đơn, dòng "Hồ sơ khách" (`web/order.ts`) | tên đại lý | đổi nhãn thành "Bên đặt (đối tác)" khi bên đặt mang vai được hưởng (cờ do máy chủ trả trong DTO đơn, không suy ở giao diện) |
| Form lập đơn, bảng đổi bên đặt (`web/order-form.ts`, `web/booker-sheet.ts`) | — | ô "Đặt qua đối tác" như trên; tài khoản Đối tác thấy dòng chỉ đọc |
| Chặn "Đã giao" (`orders/hoan-tat-repo.ts`, `billing/rules.ts`) | đơn đại lý mới bị chặn | giữ nguyên LUẬT tới đợt 2; **đổi chữ** câu báo mã `booker_partner` (N5) thành "Đơn của đối tác (có người hưởng hoa hồng) — chưa bấm Đã giao được cho tới bản cập nhật sổ đại lý." (câu cũ "cho tới khi có phần hoa hồng" sai sau đợt 1) |
| Form mở lại nháp (`web/order-form.ts`, chỗ nạp bên đặt đang lưu vào ô tra SĐT) | — | bên đặt đang lưu mang vai được hưởng ⇒ nạp vào ô "Đặt qua đối tác", không vào ô tra SĐT (cờ từ DTO đơn); ca trong kịch bản Chrome |
| Gộp hồ sơ trùng (`orders/nguoi-dat-gop-repo.ts`, ADR-0068) | đổi bên đặt của đơn chưa giao sang hồ sơ giữ lại | **chưa xử lý ở đợt 1:** bản chụp giữ `beneficiary_party_id` cũ; ghi rủi ro, đợt 2 quyết (chụp lại hoặc theo chuỗi gộp) |
| Đọc / sửa nháp, đổi bên đặt (`orders/index.ts`, `repository.ts`) | — | theo §5, §7 |

  Trợ lý, Bảng tin, thông báo, QR thanh toán không đọc bên đặt.
- Đơn mới có bên đặt là đối tác sẽ bị chặn "Đã giao" bởi luật hiện có cho tới đợt 2. Chấp nhận vì dữ liệu hiện tại là dữ liệu thử (lời chủ 2026-10-08).
- ~~Giả định của AI: tài khoản lai theo luật trên.~~ **Thay sau kiểm độc lập (N1):** LC-1 không cho hồ sơ của tài khoản lai mang vai bên ngoài, nên luật nguyên chữ chỉ làm hại; bản khuyến nghị (thu hẹp) ở gạch đầu của mục này, chờ chủ xác nhận (điểm 2).

### 8. Khoá tháng (ADR-0080 phần D1)

- Module `ky-so` (STRICT, chỉ phụ thuộc `audit`) công bố câu chưa chạy `khoaKyStatement` và hàm đọc `thangDaKhoa(db)`. Cạnh mới: `billing → ky-so`, `van-chuyen → ky-so`, `ky-so → audit`. Không cạnh `billing ↔ van-chuyen`.
- `POST /api/ledger/ky/:period/khoa`: kiểm ở mã: chỉ tháng đã qua theo `vnToday()` (tháng hiện tại hoặc tương lai ⇒ **400**, đúng ADR-0080 tiêu chí 3 — sửa sau kiểm độc lập N12); tháng đầu tiên được khoá phải ≤ tháng của dòng sổ `bil_` sớm nhất (⇒ 409); khoá trùng hoặc không liền kề ⇒ 409; cùng lô với nhật ký `ledger_period_closed`. Lớp CSDL: khoá chính + trigger liền kề + chặn sửa/xoá của `ky-so`, trigger `*_period_closed` của bốn bảng.
- **Mọi đường ghi tiền** (lần thu, phiếu, quyết toán, hoàn, điều chỉnh, thay lần thu, cọc và hoàn ngoài, chi phí xe thuê) kiểm trước và trả 409 tiếng Việt: "Tháng 10/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)". Lỗi trigger `period_closed:` (khoá giữa lúc kiểm và lúc ghi) cũng dịch thành đúng câu 409 đó, không bao giờ 500. Ở `billing`, ngày mặc định là `vnToday()` nên luồng thường không gặp lỗi này.
- **Sửa sau kiểm độc lập (N2) — chi phí xe thuê không dùng "hôm nay" làm mặc định**, nên câu "không bao giờ gặp" sai ở đây. Luật: dòng đảo (`ngayGhiDao`, ba nơi gọi) và ngày mặc định của dòng điều chỉnh (`ngayDieuChinhMacDinh`) nhận `kyDaKhoa` thật — tháng của ngày gốc / ngày mặc định đã khoá ⇒ dùng hôm nay (cùng tinh thần ADR-0080 điều 5, ADR-0095 Q2). Ngày người ghi tự chọn thuộc tháng đã khoá ⇒ 409. Chụp giá bảng / giá thoả thuận cho chuyến có ngày chạy thuộc tháng đã khoá (chuyến cũ còn "lập kế hoạch") ⇒ 409 cả lệnh, không đổi ngày. Kế hoạch có bảng "đường ghi → ngày lấy từ đâu → kiểm ở đâu → dịch lỗi ở đâu → bài kiểm" phủ mọi đường.
- Dòng đảo của `billing` mang ngày mới (ADR-0080 điều 5).
- Bảng kiểm trước khi khoá (không chặn, Kế toán quyết): khoản "Công ty thu – chuyển khoản" chờ xác nhận có ngày trong tháng; lần thu "chưa rõ người thu"; số dư từng bên cuối tháng. Mục "đơn Đã giao thiếu dòng giá vốn (R-BIL-2)" của ADR-0080 điều 4 **bỏ ở đợt 1** vì dòng giá vốn chưa có (đợt 2 thêm lại) — N13.
- Không khoá: đơn hàng, dòng điều chỉnh số khách, dấu "đã nhập phần mềm kế toán", bảng mức và điều khoản (ADR-0080 điều 7). Không có đường mở lại.

### 9. Kiểm định kỳ (`scripts/audit-checks.mjs`, bài ở `src/audit-invariants.test.ts`)

- `R-PRC-1` (lỗi): không hai dòng mức cùng (áp cho, phạm vi, mã) chồng hiệu lực. `R-PRC-2` (lỗi): mọi `target_role_code` thuộc danh sách đang bật. `R-PRC-3` (lỗi): dòng điều khoản có a% ⇔ người bán ≠ công ty chủ, và người bán đó mang vai `SUPPLIER`. `R-PRC-4` (lỗi): không dòng có a% cho nhóm / mã `TXE`. `R-PRC-5` (cảnh báo): dòng mức còn hiệu lực có `target_party_id` không còn mở vai được hưởng nào.
- `R-ORD-T1` (lỗi): mỗi dòng dịch vụ của đơn `confirmed` có `confirmed_at` **≥ mốc + 60 phút** có đúng một bản chụp hiện hành. **Mốc = `ord_audit_cutoff.cutoff_at` của dòng `R-ORD-T1`, tức lúc áp migration** (sửa sau kiểm độc lập N4; cách cũ "bản chụp AUTO đầu + 15 phút" tự tắt khi mã chụp không bao giờ chạy). 60 phút ân hạn che quãng migration → deploy của runbook (deploy chạy ngay sau migration) và lúc bản mới chưa lan tới mọi nơi (đã thấy ở 1.86). `R-ORD-T1w` (cảnh báo, kèm danh sách): đơn `confirmed` chưa "Đã giao", `confirmed_at` < mốc + 60 phút, thiếu bản chụp (đơn cũ — đợt 2 chụp bù). Bài kiểm có ca: đơn trước mốc thiếu chụp ⇒ cảnh báo; đơn trong ân hạn thiếu chụp ⇒ cảnh báo; đơn sau ân hạn thiếu chụp ⇒ lỗi; đơn sau ân hạn đủ chụp ⇒ xanh. Hệ quả vận hành ghi ở §13: hoàn tác Worker về bản cũ thì mọi đơn xác nhận trong lúc đó làm `R-ORD-T1` đỏ cho tới đợt 2 (đúng tín hiệu); khung thử / e2e chèn thẳng đơn `confirmed` bằng SQL phải chèn kèm bản chụp hoặc xác nhận qua route.
- `R-ORD-T2` (lỗi): bản chụp `MANUAL` có lý do; `SET` có đúng một trong tỷ lệ / đ mỗi khách.
- `R-KY-1` (lỗi): không dòng tiền nào thuộc tháng đã khoá có `created_at` sau `closed_at` của tháng đó. `R-KY-2` (lỗi): các tháng đã khoá liền nhau.

### 10. Nới hàng rào kiến trúc (C12 = A, chỉ đúng ba mục)

- `src/architecture.test.ts`: `ALLOWED_EDGES` thêm `ky-so: ["audit"]`, `billing` thêm `ky-so`, `van-chuyen` thêm `ky-so`; `STRICT` thêm `pricing`, `ky-so`; `TABLE_PREFIX` thêm `ky_`; `VIEW_PREFIX` thêm `ctl`, `ky`; danh sách view được đọc trong thân trigger `vc_` thêm `v_ky_closed_period`. Mỗi chú thích ghi "NỚI hàng rào đã duyệt (Điều 9.4) — chủ duyệt C12 2026-10-01, xem `…/de-xuat-luat.md`".
- Mỗi chỗ nới phải được thấy chặn thật một lần (sửa cố ý ⇒ đỏ ⇒ hoàn nguyên) và có dòng trong `docs/SO-HANG-RAO.md`, cùng các trigger mới của §3.
- `docs/ARCHITECTURE.md` dòng 5.14 của bảng thi hành là tài liệu chuẩn tắc: AI chỉ đề xuất diff (đặt ở `de-xuat-luat-dot-1.md` cùng thư mục khi thi công), chủ duyệt mới sửa.

### 11. Giao diện (luật ở `web/CLAUDE.md`)

- **Màn "Hoa hồng đối tác"** (Kế toán, Quản trị, Toàn quyền sửa; Bán hàng xem): danh sách mức đang hiệu lực và đã đóng, lọc theo vai / đối tác / dịch vụ; thêm mức; đóng mức (chọn ngày kết thúc); khung "Thử tra": chọn đối tác, dịch vụ, ngày ⇒ hiện mức thắng và bậc.
- **Màn "Người bán dịch vụ"**: danh sách điều khoản, thêm, đóng; nhà cung cấp chọn từ hồ sơ mang vai "Nhà cung cấp".
- **Trang đơn, khối "Phần đối tác"** (gọi `GET …/thuong-mai`): bảng như ví dụ Phần A; cờ thiếu mức màu cảnh báo; nút "Ghi mức tay" cho người có `order.terms.override`.
- **Màn "Khoá tháng"**: các tháng đã khoá, tháng khoá được kế tiếp, bảng kiểm, nút khoá có hộp xác nhận nói rõ "không mở lại được".
- **Form lập đơn**: ô bên đặt theo §7.
- Mọi chữ tiếng Việt có dấu; không lộ mã thô (`MISSING`, `RATE`…). Chạy kịch bản Chrome cho mỗi màn; ảnh thật hai hướng (máy tính, điện thoại) để chủ duyệt một lượt (điều A3).

### 12. Tiêu chí nghiệm thu (viết đỏ trước, xanh sau)

1. `chonMuc`: đủ sáu bậc; ranh ngày (= ngày bắt đầu, = ngày kết thúc); mức 0 ghi rõ; không khớp ⇒ `NO_RULE`; hai vai xung đột ⇒ `RULE_CONFLICT`; dòng nhập tay ⇒ `MANUAL_LINE`; bên đặt Tài xế đối tác ⇒ `BOOKER_NOT_BENEFICIARY`; khách lẻ ⇒ `NONE`.
2. Ví dụ A-1 (790.000 / 5.210.000), A-2 (150.000 rồi 200.000), A-3 (10% giữ nguyên sau đổi bảng), A-4 (thiếu ⇒ ghi tay 15% ⇒ 150.000), A-5 (125.000), B-3 (giá vốn 240.000 trên giá trước giảm) thành test, khớp từng đồng; thêm ca đúng nửa đồng 12,5% × 1.000.004 ⇒ 125.001 (N7).
3. Xác nhận đơn ⇒ mọi dòng có bản chụp trong cùng lô; làm hỏng cố ý câu chụp ⇒ đơn vẫn là nháp.
4. Trigger, mỗi cái thấy chặn thật một lần: sửa số / xoá dòng mức; chèn dòng chồng hiệu lực; mức riêng cho hồ sơ không mang vai được hưởng; điều khoản người bán ≠ công ty mà không vai `SUPPLIER`; a% khi người bán = công ty; a% cho nhóm `TXE`; dòng `ALL` mang nhà cung cấp; sửa / xoá bản chụp; hai bản hiện hành cho một dòng; chụp cho đơn đã "Đã giao"; chụp `AUTO` trỏ dòng mức hết hiệu lực; khoá tháng không liền kề; khoá trùng tháng; sửa / xoá dòng `ky_period_close`; ghi vào tháng đã khoá ở cả bốn bảng.
5. Đổi bên đặt sau xác nhận ⇒ mọi dòng có bản chụp mới theo bên đặt mới, bản cũ còn nguyên làm lịch sử.
6. Ghi mức tay: thiếu lý do ⇒ 400; đơn nháp ⇒ 409; đơn đã "Đã giao" ⇒ 409; Bán hàng, HDV, Đối tác ⇒ 403.
7. Quyền: bài tập con 1024 tập quyền cho bảy ô; Đối tác gọi phần thương mại đơn người khác ⇒ 404; `DRIVER`, `DRIVER_PARTNER`, `HR` ⇒ 403 ở mọi route mới; khoá ⊆ ở §6.
8. Bài **số lạ**: gieo `480.017` làm mức riêng của đối tác B và làm a% của một nhà cung cấp; tài khoản Đối tác A gọi mọi route nó vào được (kể cả phần thương mại đơn của chính A, biên nhận) ⇒ không thấy số đó; DTO Đối tác không có khoá tên `rate`, `perPax`, `cost`, `ruleId`.
9. Bên đặt: tài khoản Đối tác lập đơn mà trình duyệt gửi bên đặt khác ⇒ máy chủ ghi hồ sơ của tài khoản; nhân viên chọn tổ chức mang vai được hưởng ⇒ được; tổ chức không mang vai ⇒ 400; đơn có bên đặt là đại lý ⇒ biên nhận vẫn in tên khách đi tour, trang đơn hiện nhãn "Bên đặt (đối tác)".
10. Khoá tháng: khoá tháng hiện tại hoặc tương lai ⇒ 400; khoá tháng đầu sau tháng có dòng sổ sớm nhất ⇒ 409; Kế toán ghi lùi ngày vào tháng đã khoá ⇒ 409 câu tiếng Việt; đảo chi phí xe có dòng gốc ở tháng đã khoá ⇒ dòng đảo mang ngày hôm nay; điều chỉnh chi phí xe để ngày mặc định thuộc tháng đã khoá ⇒ dòng mang ngày hôm nay; Quản trị gọi khoá ⇒ 403.
11. Kiểm định kỳ: mỗi mã mới có ca đỏ và ca xanh trong `src/audit-invariants.test.ts`; `audit-invariants --db local` sau e2e xanh.
11b. **Sổ vàng:** tạo `golden/so-cong-no-luot-2.json` với các ca A-1…A-5, B-3, trạng thái `cho_xac_nhan`, thêm dòng ở `golden/README.md`. AI không tự đánh dấu ca nào đã xác nhận (N8). Câu trả lời của chủ cho điều A1 chỉ xác nhận cách làm tròn (ca A-5); các ca còn lại chờ chủ hoặc Kế toán xác nhận riêng. Test mã dùng thẳng số của ví dụ đã duyệt trong ADR, không phụ thuộc trạng thái sổ vàng.
11c. **Khoá tháng trong e2e:** tháng đã khoá không mở lại được, mà các kịch bản e2e dùng chung một D1 tạm. Kịch bản khoá tháng phải chạy trên D1 riêng của nó, hoặc chỉ khoá một tháng mà không kịch bản nào khác ghi vào (cùng khuôn bẫy "đừng đổi công ty chủ trong e2e chung").
12. `npm test`, `npm run typecheck`, `npm run test:e2e` xanh; kịch bản Chrome các màn ở §11 chạy được; người kiểm độc lập chỉ đọc ĐẠT.

### 13. Rủi ro phát hành (đưa vào runbook ở `docs/HANDOFF-N1.md` khi thi công)

- **Khoảng hở migration → deploy:** đơn xác nhận bằng mã cũ trong khoảng đó không có bản chụp; ân hạn 60 phút của `R-ORD-T1` (§9) để chúng ở mức cảnh báo, không làm đỏ bước `audit-invariants --db remote` của runbook. Trigger khoá tháng không ảnh hưởng vì chưa tháng nào khoá.
- **Hoàn tác Worker về bản cũ** sau khi đã áp migration: đơn xác nhận trong lúc chạy bản cũ không có bản chụp ⇒ `R-ORD-T1` đỏ cho tới đợt 2 (chụp bù). Đây là tín hiệu đúng; runbook ghi rõ để người chạy không hoảng.
- **Đổi công ty chủ** (ADR-0024 6.4): dòng điều khoản `ALL` gieo sẵn vẫn trỏ công ty cũ ⇒ `R-PRC-3` đỏ và bản chụp mới ghi người bán là công ty cũ. Khi đổi công ty chủ phải đóng dòng `ALL` cũ và mở dòng mới cho công ty mới (ghi vào bẫy của CHANGE-GUIDE; e2e chung không đổi công ty chủ — N17).
- **Khoá nhầm tháng** không mở lại được; đường cứu duy nhất là khôi phục Time Travel, chưa diễn tập (lỗ HC-5.19). Màn "Khoá tháng" có hộp xác nhận nói rõ điều này.
- **Nhánh `adr-0104-d2` (Vận chuyển)** đang sửa `van-chuyen` và các lô của `orders`, giữ migration `0089`. Nhánh nào gộp sau thì phải dựng lại trên `main` mới và chạy lại toàn bộ kiểm; kế hoạch ghi các tệp có thể đụng nhau.
- **Số migration:** rà lại ngay lúc tạo tệp.
- Bảo trì đang bật tới 10/10 (ghi chép 1.86); không phụ thuộc vào nó.

### 14. Giả định của AI và các điểm chưa chắc

- Bán hàng xem bảng mức (`partner.commission.view = any`): giả định bề mặt có sẵn từ ADR-0077.
- Phạm vi `ALL` của điều khoản chỉ cho người bán là công ty chủ (§3): ruling để giữ X3, đổi được bằng ADR.
- ~~Tài khoản lai theo luật Đối tác (§7).~~ Chờ chủ (khối cuối Phần A, điểm 2).
- Bỏ thêm `ledger.period.close` vào `O_GHI_TIEN` (§6, N6): đề xuất bổ sung ADR-0090 riêng.
- Ngày gieo dòng điều khoản `ALL` = `2025-01-01`.
- **Chưa kiểm:** mọi nơi gọi `ngayGhiDao` đã truyền đủ tham số; hồ sơ gắn tài khoản của các công ty lữ hành trên dữ liệu thử là hồ sơ tổ chức hay cá nhân (luật §7 đúng với cả hai).
