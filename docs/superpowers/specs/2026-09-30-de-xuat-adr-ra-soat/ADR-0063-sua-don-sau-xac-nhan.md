# ADR-0063 — Sửa đơn sau xác nhận: văn phòng sửa số khách (lát riêng ngay sau Sổ tiền lượt 1) và hạn "2 lần đổi giờ mỗi đơn" có ghi chú bắt buộc

- **Trạng thái:** **proposed** (bản nháp của người soạn, 2026-09-30; **đã sửa lần 1 theo báo cáo người kiểm độc lập** cùng ngày; **sửa lần 2 theo điều phối**: đổi số từ nháp "0060" sang 0063 — số 0059–0061 đã được phiên khác dùng, chủ đã duyệt; ghi xung đột lời chủ về thứ tự C2 ↔ Sổ tiền; **sửa lần 3**: chủ đã chốt 30/9 "Làm ngay SAU Sổ tiền" — bỏ Task 7b; **sửa lần 4 theo người kiểm độc lập vòng 2**: `order_money_adjusted` do ADR-0062 khai trước, dòng câu thay cho ADR-0061, ghi rõ vế "kể cả Toàn quyền" là giả định; đã qua kiểm độc lập 2 vòng (ĐẠT CÓ ĐIỀU KIỆN, các điều kiện đã sửa ở commit này), bản sửa vòng 2 chưa được kiểm lại). AI không tự duyệt (Hiến pháp N3, Điều 7.2).
- **Ngày:** 2026-09-30.
- **Thuộc gói:** lượt duyệt **2a** (một mình ADR này — 2 quyết định chạm quyền/dữ liệu). ADR-0064 + ADR-0065 là lượt **2b**. Trang ghép: `trang-ghep-luot-2.md` phần 2a (cùng thư mục nháp).
- **Mốc đo mã:** mọi `tệp:dòng` đo trên `origin/main` = `1db777f4` (bản 1.38); các tệp trích dẫn không khác nhánh `giao-dien-sua-nho-1-39@824193f1`. Dòng `@<sha>` là đo trên commit khác, ghi rõ.
- **Nguồn (lời chủ, đã chốt 2026-09-30 — không hỏi lại):**
  - Báo cáo rà soát `docs/superpowers/specs/2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md` @`ra-soat-luong-giao-dien`: C2 (§1), V7 (§1), §6 dòng "ai được sửa số khách" (nguyên văn: **"Thêm Quản trị + Kế toán + người lập đơn" — mỗi lần sửa ghi lịch sử tiền; làm chung với Sổ tiền lượt 1**).
  - **Lời khác cùng ngày (phiên góp ý, điều phối chuyển lại):** chủ chọn làm C2 **SAU** Sổ tiền lượt 1; ADR-0061 accepted của phiên đó ghi Q-1 *"Giữ quyền sẵn, chờ việc C2"*. Hai lời vênh nhau về **thứ tự** (không vênh về ai được sửa).
  - **Lời chốt 30/9 (hộp hỏi của phiên điều phối chung):** **"Làm ngay SAU Sổ tiền"** ⇒ D2.
  - §6.1 V7 (nguyên văn ý): "Sau xác nhận thì Admin, Super Admin … và bán hàng được phép sửa giờ, và chỉ được sửa tối đa 2 lần, bắt buộc nêu ghi chú." Làm rõ: Bán hàng chỉ đơn mình lập / đang phụ trách; **2 lần MỖI ĐƠN**, lần của Quản trị cũng tính, Toàn quyền không giới hạn; bắt buộc ghi chú mỗi lần.
  - **Vế "ghi chú bắt buộc kể cả Toàn quyền" là GIẢ ĐỊNH của người soạn**, không phải lời chủ: lời chủ nói "bắt buộc nêu ghi chú", không nói riêng về Toàn quyền. Người soạn áp cho cả Toàn quyền vì câu của chủ không có ngoại lệ và ghi chú giúp đọc lại lý do đổi giờ. Đảo được: bỏ đòi ghi chú khi `counted = 0` (một nhánh ở route + nới `CHECK` cho dòng `counted = 0`).
- **ADR liên quan:** ADR-0007 (điều 1 bảng quyền; điều 2 "ba bất biến" của sửa sau xác nhận), ADR-0014 (HDV sửa số khách cấp hẹp), **ADR-0023 điều 4** (accepted — lý do chọn nhanh, "Khác" không kèm ô chữ theo ADR-0030 S23-9), ADR-0024/0025/0026 (Sổ tiền lượt 1, accepted 29/9), ADR-0047 A3 (tệp nửa nghiêm, nợ `DOC_AUDIT_LOG_WONGUARD`), ADR-0049 D2 (mốc 6 giờ, đặt gấp; I14, I18), ADR-0050 VK1-B, ADR-0051 ("Đã gọi báo", Q-GB-1), ADR-0054 D10.3 (`pax_override`), **ADR-0062** (lượt 1b — tin khi đơn đổi; dùng chung hằng "giờ" và cờ `doiSoKhach`), **ADR-0065** (lượt 2b — luật khi giảm số khách làm "số khách đi xe" vượt tổng), **ADR-0061** (accepted 30/9, phiên khác — mở lại dịch vụ nhập tay; điều 5: route sửa sau xác nhận của C2 "phải gọi `duocNhapTay`").
- **Hiến chương áp dụng (Phần I, đã duyệt):** 4.1 (trạng thái + nhật ký cùng lô), 5.1 (luật ở CSDL và mã), 5.2 (**lệch có chủ ý** L-V7-2, xem dưới — khai theo 6.1), 5.3 (module sở hữu bảng), 5.4 (một hàm tính tiền), 5.5 (chỉ-thêm), 5.9 (trả dư thành khoản chờ hoàn), 5.12 (nhật ký không SĐT), 5.13 (nền trước).
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (`docs/quyen-hoan.json:63`); ô dùng ở ADR này (`order.money.edit`, `order.trip.edit`) không nằm trong danh sách hoãn `thao_tac` (`:4-47`).
- **Xây trên nền chưa có (Hiến chương 5.13):** Sổ tiền lượt 1 **chưa gộp `main`** — nhánh `worktree-agent-aa1fab0316112d404` (người soạn đọc ở tip `94824374` = Task 0–6d; theo điều phối nay đã xong Task 0–11, đang chờ kiểm độc lập), có `0044_orders_da_giao` (`7621436e`), `0045_billing_so_cong_no` (`902fe4d3`), spike R1 (`ea69363b`, thông điệp commit: "RAISE của trigger ở câu thứ 3 làm cả lô D1 quay lại" — **chỉ đọc thông điệp, chưa đọc bài kiểm**). Phần C2 và bảng đếm của V7 đứng **sau** `0044`.

---

## Tóm tắt cho chủ (lời thường)

1. Sau khi đơn đã xác nhận, **Quản trị, Kế toán và Bán hàng lập đơn** sửa được số khách (hôm nay chỉ HDV phụ trách và Toàn quyền). Tiền do máy tính lại; mỗi lần sửa là một dòng lịch sử (trước → sau), không ghi đè. Lý do sửa **chọn từ danh sách** (Khách thêm người / Khách bớt người / Đổi dịch vụ / Khác), không gõ chữ — đúng luật đã duyệt ở ADR-0023.
2. Phần này **không được phát hành trước Sổ tiền lượt 1** (nếu không, khách bớt người sau khi đã trả sẽ ra số âm). Có Sổ tiền thì máy hiện "khách đã trả dư — chờ Kế toán hoàn"; sau "Đã giao" thì không sửa được nữa. Theo lời bạn chốt 30/9: làm thành **một đợt riêng ngay sau** Sổ tiền lượt 1.
3. Đổi **giờ** sau xác nhận: người sửa **không đổi** so với hôm nay (Bán hàng đơn mình/đang phụ trách, Quản trị, Toàn quyền). Mới: **mỗi đơn tối đa 2 lần**, lần của Quản trị cũng tính; Toàn quyền không giới hạn; **lần nào cũng phải ghi chú** (ghi chú là yêu cầu riêng của chủ, khác với lý do sửa số khách; riêng việc Toàn quyền cũng phải ghi chú là người soạn đề xuất, bạn bỏ được).
4. Hết 2 lần thì chỉ Toàn quyền đổi tiếp. Mốc 6 giờ / "Đặt gấp" giữ như cũ và kiểm **trước** bộ đếm.
5. "Giờ" gồm những trường nào — một định nghĩa **dùng chung** cho cả hạn 2 lần lẫn tin báo (ADR-0062): chủ chốt ở câu 3 của `cau-hoi-chu.md`.
6. Ghi chú có số điện thoại thì máy che số; ghi chú không vào nhật ký.

---

## Bối cảnh (hiện trạng đo trên `1db777f4`)

| Việc | Hiện trạng | Nguồn |
|---|---|---|
| Ô `order.money.edit` | SALES `own`, ACCOUNTING `any`, ADMIN `any`, FIELD `assigned`, SA `any`, còn lại `none` — **đã đúng ý chủ**, chỉ thiếu route | `src/shared/permissions.ts:88` |
| Route sửa số khách duy nhất | `POST /api/orders/:id/handler-money-edit` (module `dispatch`, cổng `staff`) **cố ý** chặn Kế toán/Quản trị: chỉ ô chính xác `assigned` + đang phụ trách, hoặc Toàn quyền | `src/modules/dispatch/index.ts:229-249`, chú thích `:234-237`, `:238-239` |
| Ghi dòng điều chỉnh | `insertMoneyAdjustment` chèn `order_money_adjustment` (chỉ-thêm, `seq` duy nhất — `0021`) + nhật ký với hành động **viết cứng** `"order_money_adjusted_by_field"`; `detail` = lý do **chữ tự do** | `src/modules/orders/repository.ts:1132-1158` (hành động viết cứng ở `:1150`); `src/modules/orders/money-adjustment.ts:86-87` |
| Lý do sửa số khách | ADR-0023 điều 4 (**accepted**) theo ADR-0030 S23-9: danh sách đóng "Khách thêm người", "Khách bớt người", "Đổi dịch vụ", "Khác" — **"Khác" không kèm ô chữ**; route nhận **mã lý do**, ngoài danh sách → 400. **Chưa thi công**: hôm nay route HDV vẫn nhận chữ tự do. `EDIT_REASON_QUICK` chỉ là **3 nhãn điền nhanh** vào ô chữ tự do (không có "Khác"), **không** phải danh sách đóng | `docs/adr/ADR-0023-*.md:58-61`; `docs/adr/ADR-0030-*.md:200`; `src/shared/viec-cua-toi.ts:88` (chú thích `:84-87`) |
| Luật thuần sửa số khách | `planMoneyEdit` (một chỗ) | `src/modules/orders/money-adjustment.ts:268` |
| "Còn lại" có thể âm (bớt người sau khi trả trước) | `effectiveMoney` = tổng − cọc | `src/modules/orders/money-adjustment.ts:223` |
| Ô `order.trip.edit` | SALES `ownOrAssigned`, ADMIN `any`, SA `any`, còn lại `none` — **đã đúng danh sách người của V7** | `src/shared/permissions.ts:78` |
| Route đổi giờ/nơi sau xác nhận | `PUT /api/orders/:id/trip` (`:592`), `POST /api/orders/:id/legs` (`:633`), `PUT /api/orders/:id/legs/:legId` (`:657`), `POST …/legs/:legId/close` (`:682`) — đều `can(order.trip.edit, { ownerId, assigned })` | `src/modules/orders/index.ts` |
| Trường thời gian | dịch vụ: `departDate`, `departTime`, `pickupTime`, `checkinDate`, `checkinTime` (`TRIP_VALUE_FIELDS`); chặng: `pickup_date`, `pickup_time` | `src/modules/orders/service-rules.ts:367-369`; `migrations/0034_chang_dua_don.sql:14-16` |
| Lô ghi của ba route đổi giờ | câu đầu tự quyết thắng/thua (khoá lạc quan) → `auditStatement(…, "changes() > 0")` → mọi câu sau mang lính gác `wonGuard(auditId)` = `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`. `updateTrip`, `addLeg` khoá theo `orders.updated_at`; `changeLeg` theo `updated_at` **của chặng** ⇒ hai lệnh sửa hai chặng khác nhau cùng thắng được | `src/modules/orders/repository.ts:1164-1198`, `:1242-1255`, `:1258-1288`; chú thích lô `:1236-1238` |
| Nợ đọc `audit_log` của tệp nửa nghiêm | danh sách tên câu có lính gác được phép đọc thẳng `audit_log`, hạn 2027-03-31 — **nới hàng rào đã duyệt 29/9** | `src/architecture.test.ts:118-131` (`DOC_AUDIT_LOG_WONGUARD`) |
| Mốc 6 giờ khi sửa | dưới mốc ⇒ chỉ Quản trị/Toàn quyền + `datGap` (I14) | `src/modules/orders/index.ts:606-619`, `:644-648`, `:671-675` |
| Sửa không đổi gì | `PUT /trip` trả sớm khi `moTa === null` (`:606`); sửa chặng trả sớm khi `detail === null` (`:670`) — không ghi, không tính lượt | `src/modules/orders/index.ts` |
| Khoá sau "Đã giao" (Sổ tiền) | trigger chặn `INSERT order_money_adjustment`, sửa `order_service`, `ord_transfer_leg`…; `orders_delivered_lock` **liệt kê từng cột** của `orders` | `migrations/0044_orders_da_giao.sql:38-46, 52-93` @`7621436e` |

---

## Quyết định

### D1. Văn phòng sửa số khách sau xác nhận (C2) — quyết định 1 của lượt 2a

1. **Route mới** `POST /api/orders/:id/money-edit` (tên đề xuất) ở module `orders`, **cổng `office`** (Bán hàng, Kế toán, Quản trị, Toàn quyền — `src/shared/permissions.ts:206`).
2. Thân route hỏi `can(staff, "order.money.edit", { ownerId: meta.staffId })` **không truyền `assigned`** ⇒ Bán hàng chỉ đơn **mình lập** (`own`), Kế toán/Quản trị/Toàn quyền mọi đơn. Không truyền `assigned` để HDV không có đường thứ hai (HDV giữ route hẹp).
   - **"Người lập đơn" = Bán hàng lập đơn** (không hỏi lại): báo cáo rà soát C2 nêu chỗ thiếu là "Bán hàng lập đơn, Quản trị, Kế toán không sửa được"; ADR-0014 bảng điều 2 (`docs/adr/ADR-0014-*.md:64`) đã chốt `order.money.edit` của Đối tác = `none`; ô của Thực tập cũng `none` (`permissions.ts:88`). Đối tác/Thực tập cần sửa thì nhờ văn phòng.
3. **Không thêm, không đổi ô nào.** Route này là đường đã dành sẵn cho ô `order.money.edit` của Kế toán/Quản trị (chú thích `dispatch/index.ts:234-237`: "dành cho một route KHÁC, chưa làm").
4. **Một luật:** dùng lại `planMoneyEdit` và `insertMoneyAdjustment` (Hiến chương 5.4). Route hẹp của HDV không đổi hành vi (trừ việc truyền hành động — D1.8).
5. **Phạm vi sửa:** chỉ số khách của dịch vụ đã có trong đơn (như route HDV). Thêm/bớt dịch vụ sau xác nhận **không** thuộc ADR này.
6. **Điều kiện:** đơn `confirmed`, chưa "Đã giao" (từ chối sớm bằng câu tiếng Việt + trigger `order_money_adjustment_delivered_lock_ins` của `0044` là lưới cuối). Đơn nháp đi qua form như hôm nay.
7. **Lý do — mã lý do theo ADR-0023 điều 4 (accepted), không chữ tự do:**
   - Hằng **một nơi** ở `src/shared/` (tên đề xuất `LY_DO_SUA_SO_KHACH`): `THEM_NGUOI` → "Khách thêm người", `BOT_NGUOI` → "Khách bớt người", `DOI_DICH_VU` → "Đổi dịch vụ", `KHAC` → "Khác". Chữ nhãn trùng ba nhãn điền nhanh `EDIT_REASON_QUICK` (`src/shared/viec-cua-toi.ts:88`) — chú thích `:84-87` đã hẹn "khi đổi sang mã lý do thì chữ không đổi"; kế hoạch cho `EDIT_REASON_QUICK` đọc từ hằng mới để khỏi hai danh sách.
   - Route nhận **mã**; mã ngoài danh sách → 400; thân có trường chữ lý do tự do → 400 (không lưu). "Khác" **không kèm ô chữ** (ADR-0030 S23-9).
   - Nhật ký ghi **nhãn** của mã (chữ cố định do máy chủ), nên không cần lọc SĐT.
   - Giữ nguyên danh sách bốn mục của ADR-0023 dù route này chỉ sửa số khách ("Đổi dịch vụ" vẫn có mặt): không tự cắt danh sách đã duyệt.
   - **Route HDV:** đổi sang mã lý do là việc của ADR-0023 (lượt D6), không thuộc ADR này. Đề xuất cho điều phối: làm trong **cùng lát** để một luật lý do cho cả hai route. Nếu chưa làm, route HDV còn ghi chữ tự do vào phần "lý do" của `detail`; hàm đọc tin (ADR-0062) **không bao giờ** lấy phần lý do, nên không lộ vào tin.
   - **Khác với ghi chú đổi giờ ở D3.4:** ghi chú đổi giờ là yêu cầu riêng của chủ cho V7 ("bắt buộc nêu ghi chú"), lưu trên bảng đếm, **không** vào nhật ký. Lý do sửa số khách là mã đóng, vào nhật ký. Hai thứ không gộp.
8. **"Lịch sử tiền" và nhật ký:**
   - Dòng `order_money_adjustment` chỉ-thêm (trước → sau, tổng trước → sau, `seq`) nối một-một với dòng nhật ký qua `id` (ADR-0007 điều 2; 5.5).
   - **Hành động mới** `order_money_adjusted` (văn phòng), tách khỏi `order_money_adjusted_by_field` để lịch sử nói rõ ai sửa. Hành động này **do ADR-0062 Đ1 khai trước** trong `src/shared/audit-actions.ts` kèm cờ `doiSoKhach: true` (và có sẵn trong view `v_aud_order_change` của `0047`); ADR này là **nơi ghi đầu tiên**, không khai lại. Luật thứ tự của ADR-0062 Đ1: nếu lát này lên `main` **trước** ADR-0062 thì lát này khai (kèm cờ, cùng cờ gắn cho `order_money_adjusted_by_field`), ADR-0062 dùng lại.
   - **`insertMoneyAdjustment` thêm tham số hành động** (hôm nay viết cứng `"order_money_adjusted_by_field"` ở `repository.ts:1150`). Kiểu tham số chỉ nhận hành động mang cờ `doiSoKhach` (kiểu dẫn từ `AUDIT_ACTIONS`). Route HDV truyền `order_money_adjusted_by_field`, route văn phòng truyền `order_money_adjusted`.
   - **`detail` có khuôn** (ADR-0062 Đ2): đoạn đầu `"số khách: <dịch vụ>: người lớn A → B, …"` dựng bằng một hàm thuần từ `before`/`after` (`AdjustmentEntry` = `serviceId`, `pax`, `unitPrices` — **không** có tên, `money-adjustment.ts:235-239`) **cộng danh sách dịch vụ của đơn** `SubtotalServiceInput` (có `id`, `catalogCode`, `name` — `money-adjustment.ts:150-157`; route đã đọc sẵn qua `getServicesForSubtotal` cho `planMoneyEdit`) để đổi `serviceId` → tên: có `catalogCode` thì ghi `name`, không có thì ghi "dịch vụ nhập tay". Chỉ số người theo loại khách, không tiền. Rồi `" · lý do: <nhãn>"`. Hàm viết này dùng chung cho cả hai hành động và nằm trong bài khứ hồi của ADR-0062.
   - Lượt 1 sổ công nợ **không** sinh dòng sổ khi sửa số khách (ADR-0026: lượt 1 không có dòng thương mại); số "phải thu / đã thu / dư chờ hoàn" do `billing` tính khi đọc.
9. **Chống đua:** giữ cơ chế `seq` duy nhất của `0021` (thua ⇒ 409 "Đơn vừa được người khác sửa"). Lô "Đã giao" đã canh `seq` điều chỉnh mới nhất (kế hoạch Sổ tiền §3.3 câu 3, R3) ⇒ sửa chen giữa làm "Đã giao" thua, không khoá đơn với số cũ.
10. **Bảng tin và tin báo:** báo Bảng tin `tien` sau khi lô ghi xong (như route HDV, `dispatch/index.ts:247`). **Tin trong hộp và màn hình khoá** tới HDV phụ trách / người lập: theo **ADR-0062** (lượt 1b) — hành động mới mang cờ `doiSoKhach` nên tự vào tập nguồn, không cần thêm gì ở ADR này.
11. **Giảm số khách làm "số khách đi xe" vượt tổng:** luật nằm ở **ADR-0065 D3** (lượt 2b) và áp trong **đường ghi chung** (`insertMoneyAdjustment` / `planMoneyEdit`) cho cả route văn phòng lẫn route HDV. ADR này không quyết; nếu ADR-0065 chưa duyệt thì chưa có cột, không có vấn đề.
12. **Nhãn nút:** "**Sửa số khách dịch vụ**" (khác nút / ô "Số khách đi xe" của ADR-0065), để không lẫn hai con số.

### D2. Thứ tự thi công: lát riêng ngay sau Sổ tiền lượt 1 (lời chủ chốt 30/9)

**Lời chủ:**
- trước (phiên rà soát giao diện, 30/9): "làm **chung** với Sổ tiền lượt 1";
- phiên góp ý cùng ngày: làm C2 **sau** Sổ tiền (ADR-0061 accepted, Q-1 "Giữ quyền sẵn, chờ việc C2");
- **chốt 30/9 (hộp hỏi của phiên điều phối chung): "Làm ngay SAU Sổ tiền".**

**Quyết định:** D1 là **lát riêng**, bắt đầu **ngay khi Sổ tiền lượt 1 đã gộp `main`**; **không** chèn task nào vào kế hoạch Sổ tiền (bỏ "Task 7b" của bản nháp trước). Điều cố định: C2 **không** được phát hành trước Sổ tiền — trước Sổ tiền, khách bớt người sau khi trả cọc sẽ ra "còn lại" âm (`money-adjustment.ts:223`). Lát riêng gồm:
- route + bài quyền + bài một luật tiền (khuôn NT-R9);
- **thêm ca** cho route mới vào bảng ca của bài NT-F7 / Task 6e của Sổ tiền (từ chối sau "Đã giao"); thiếu ca ⇒ bài đỏ;
- e2e trong `tests/e2e/so-tien.mjs`: Kế toán giảm người sau khi đã có lần thu ⇒ màn đơn "Khách đã trả dư X ₫ — chờ Kế toán hoàn" (NT-S5); Bán hàng không phải người lập ⇒ 403; HDV gọi route mới ⇒ 403 ở cổng; sau "Đã giao" ⇒ 409 + SQL tay bị trigger chặn;
- hàng rào Bảng tin (`src/bang-tin-guard.test.ts`) phủ route mới;
- giao diện nút "Sửa số khách dịch vụ";
- người kiểm độc lập riêng cho lát (việc lớn: tiền + quyền).

D3 (hạn 2 lần đổi giờ) cũng cần `0044` (cột `delivered_at`) ⇒ cùng điều kiện "sau khi Sổ tiền gộp `main`"; làm chung lát với D1 hoặc lát kế tiếp, điều phối quyết.

**Dịch vụ nhập tay (ADR-0061 accepted, phiên khác):** điều 5 của ADR đó viết: "Route sửa sau xác nhận tương lai (C2) **phải** gọi `duocNhapTay` — bài tĩnh dưới đây canh." ADR này đề xuất: **điều 5 không áp dụng cho route D1**, vì route chỉ ghi dòng điều chỉnh số khách của dịch vụ đã có, **không** thêm / đổi tên / đổi giá dịch vụ, không ghi `order_service`/`order_item` (D1.5) — cùng diện với route HDV mà ADR-0061 điều 5 đã để ngoài. Hệ quả: ô `order.service.manual` của Kế toán (ADR-0061 ghi "chưa có tác dụng … chờ việc C2") **vẫn chưa có tác dụng** sau lát này; Kế toán thêm dịch vụ nhập tay sau xác nhận là **quyết định riêng sau**. Đây là cách đọc lại một câu của ADR đã duyệt ⇒ ghi ở "Câu ADR bị thay" và nêu trong câu duyệt 2a để chủ gật rõ. Kế hoạch lát đối chiếu bài tĩnh của ADR-0061 (bài đó canh "route ghi dịch vụ gọi `priceGuard`"; route D1 không ghi dịch vụ). *Chưa kiểm* mã bài tĩnh đó (chưa thi công).

### D3. Hạn "2 lần đổi giờ mỗi đơn" sau xác nhận (V7) — quyết định 2 của lượt 2a

1. **Ai:** không đổi ô `order.trip.edit` (`permissions.ts:78`). Hướng dẫn viên, Đối tác, Thực tập, Kế toán vẫn không đổi được giờ sau xác nhận.
2. **"Giờ" — dùng lại hằng `TRUONG_GIO_TINH_LUOT` do ADR-0062 Đ1 định nghĩa** (lượt 1b, phát hành trước). Một hằng quyết **cả** lần nào tiêu lượt (ADR này) **và** đoạn nhật ký nào sinh tin (ADR-0062). Nội dung theo **câu 3 của `cau-hoi-chu.md`** (khuyến nghị A: dịch vụ — ngày/giờ khởi hành, giờ đón, ngày/giờ check-in; chặng — ngày/giờ đón). Nếu chủ chọn phương án C của câu 3, ADR này tính thêm đổi nơi đón / nơi trả vào lượt (một hằng thứ hai "nơi tính lượt", chỉ dùng cho đếm). ADR này chỉ thêm **luật đếm** riêng:
   - **thêm chặng mới** sau xác nhận tính một lần (chặn lối "bỏ chặng rồi thêm chặng giờ mới"); **đóng chặng** không tính.
   - **"Một lần"** = **một lệnh ghi thành công** trên đơn **đã xác nhận** mà đổi **ít nhất một trường thuộc hằng**, dù lệnh đó đổi bao nhiêu dịch vụ/chặng. Máy chủ quyết bằng **so giá trị cũ ↔ mới** của kế hoạch ghi (không đọc chữ nhật ký).
   - **Không tính:** đơn nháp; đổi nơi đón/nơi trả/nơi check-in/ghi chú không kèm đổi giờ; route "Đặt gấp" (`POST …/short-notice` — không đổi giờ); đổi `pax_override` (ADR-0054); đổi số khách (D1); đổi "số khách đi xe" (ADR-0065); lệnh không đổi gì (trả sớm ở `index.ts:606`, `:670`).
   - **Đổi giờ vì xe** (ADR-0051 Q-GB-1 chọn "sửa giờ trên đơn"): đi cùng route nên **tính lượt** theo bản nháp; chủ xác nhận ở câu 3 (vế b).
3. **Toàn quyền:** không giới hạn, nhưng lần sửa vẫn **ghi dòng** (`counted = 0`, không tính vào hạn).
4. **Ghi chú bắt buộc mỗi lần đổi giờ sau xác nhận** (lời chủ V7 "bắt buộc nêu ghi chú"; vế **kể cả Toàn quyền** là giả định người soạn, đảo được — xem dòng Nguồn): 1–200 ký tự, **che dãy số dài** bằng `maskLongDigits` (`src/shared/text-guards.ts:38`) trước khi lưu, lưu **trên dòng đếm**, **không** vào `audit_log` — khuôn `short_notice_note` của ADR-0049 D2/I18 (`docs/adr/ADR-0049-*.md:164`).
5. **Bộ đếm — bảng chỉ-thêm mới của `orders`** `ord_schedule_edit` (tên đề xuất):

   | Cột | Nghĩa |
   |---|---|
   | `id` | **trùng `id` dòng nhật ký của chính lệnh** (`trip_updated` / `order_leg_updated` / `order_leg_added`), nối một-một, khuôn `0021` |
   | `order_id` | FK `orders` |
   | `counted` | `CHECK (counted IN (0,1))` — 1 = tính vào hạn; 0 = lần của Toàn quyền |
   | `note` | ghi chú đã che, `CHECK (length(trim(note)) BETWEEN 1 AND 200)` |
   | `created_at`, `created_by`, `updated_at`, `updated_by` | bốn cột WHO (ADR-0003) |

   - **Nối nhật ký — chọn "trùng id", KHÔNG có hành động nhật ký riêng.** Lý do: một lệnh = một dòng nhật ký = một tin (ADR-0062 "cùng lô một tin" không phải gánh hai dòng); không cần khai thêm hành động và luật "hành động này không sinh tin". Trường nào đổi, trước → sau đã ở dòng nhật ký của lệnh; bảng này không lưu danh sách trường (tránh nhóm lặp — ADR-0003).
   - **Đoạn đuôi trên `detail`** của dòng nhật ký đó (hàm viết thuần, một nơi): `" · tính 1 lượt đổi giờ"` khi `counted = 1`, `" · đổi giờ (Toàn quyền, không tính lượt)"` khi `counted = 0`. **Không** ghi "lần n/2" vào nhật ký: n tính lúc đọc có thể sai khi hai lệnh đua (cả hai đọc thấy 0); số lần thật hiện trên trang đơn đếm từ bảng. Hàm đọc tin của ADR-0062 **bỏ qua** đoạn đuôi này; hàm viết nằm trong bài khứ hồi của ADR-0062.
   - Trigger chỉ-thêm (cấm `UPDATE`/`DELETE`).
   - **Chống đua ở CSDL:** trigger `BEFORE INSERT` `RAISE(ABORT, 'ord_schedule_limit: …')` khi `NEW.counted = 1` và đơn đã có **2** dòng `counted = 1`.
   - **Vị trí trong lô và điều kiện:**
     1. câu đầu tự quyết thắng/thua (khoá lạc quan — như hôm nay);
     2. `auditStatement(…, "changes() > 0")` — như hôm nay;
     3. **câu mới** `INSERT INTO ord_schedule_edit … SELECT … WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` — lính gác `wonGuard(auditId)`, đứng **ngay sau** câu nhật ký;
     4. các câu ghi giờ/chặng còn lại (đã có lính gác).
     - **Không** dùng `changes() > 0` cho câu mới: `changes()` chỉ thấy câu **liền trước**; đứng sau câu nhật ký thì nó nói về câu nhật ký, không phải câu khoá lạc quan. Lính gác theo `id` nhật ký là cách cả lô đang dùng.
     - Bên thua khoá lạc quan: không có dòng nhật ký ⇒ câu 3 chèn 0 dòng ⇒ trigger không chạy.
     - Trigger `RAISE` ⇒ **cả lô quay lại** (dựa vào R1 của Sổ tiền — spike `ea69363b`, **bài kiểm của ADR này phải tự chứng minh lại**). Lỗi bật ra từ `db.batch()`; route bắt lỗi có tiền tố `ord_schedule_limit` và trả **409 `het_luot_doi_gio`** (khuôn `isAdjustmentSeqCollision`, `repository.ts:1154`).
     - Hai lệnh sửa hai chặng khác nhau chạy song song (`changeLeg` khoá theo chặng) không vượt 2 được vì D1 ghi tuần tự từng lô và trigger đếm trong giao dịch.
   - **Nơi đặt SQL:** câu chèn có lính gác và câu đếm đọc trước (`orders.schedule_edit_insert_guarded`, `orders.schedule_edit_count` — tên đề xuất) đặt ở tệp **nửa nghiêm** `src/modules/orders/chang-hanh-khach-repo.ts` (đã trong `NUA_NGHIEM`, đăng ký `defineSql`, chịu bài `EXPLAIN`), **không** ở `repository.ts` LEGACY. `updateTrip`/`addLeg`/`changeLeg` chỉ gọi câu đã đăng ký, như chúng đang gọi `legInsertGuarded`.
   - **Nợ `DOC_AUDIT_LOG_WONGUARD`:** câu chèn có lính gác đọc thẳng `audit_log` ⇒ thêm tên `orders.schedule_edit_insert_guarded` vào danh sách nợ (`src/architecture.test.ts:124-131`, hạn giữ 2027-03-31). Danh sách này là **nới hàng rào đã duyệt 29/9**; thêm một tên là **nới thêm** (Điều 9.4) ⇒ nằm trong câu duyệt lượt 2a.
   - Trigger khoá sau "Đã giao" `ord_schedule_edit_delivered_lock_ins` (đọc `orders.delivered_at`, cùng module) — nhất quán với câu trả lời Q1 của Sổ tiền "khoá cả hai" bảng `ord_*`. Vì cần cột `delivered_at` ⇒ migration này đứng **sau `0044`**.
6. **Thứ tự kiểm ở route** (đổi giờ): 404 → 403 (`order.trip.edit`) → 409 đơn huỷ / đã giao → 400 thân → *(không đổi gì ⇒ trả sớm, không ghi, không tính)* → 400 thiếu ghi chú (khi lệnh có đổi trường thuộc hằng "giờ" trên đơn đã xác nhận) → mốc 6 giờ / `datGap` (I14, giữ nguyên) → **hết lượt** (409 `het_luot_doi_gio`: "Đơn này đã đổi giờ 2 lần — nhờ Toàn quyền nếu cần đổi tiếp") → ghi. Máy chủ đọc số lần trước để trả câu dễ hiểu; trigger là lưới chặn thật.
7. **Hiển thị:** trang đơn hiện "Đã đổi giờ 1/2 lần" (đếm từ bảng) + danh sách lần đổi (ai, lúc nào, ghi chú đã che) cho người có `order.history.view`. Hộp đổi giờ có ô ghi chú bắt buộc.
8. **Tương tác:**
   - **Mốc 6 giờ / Đặt gấp (ADR-0049 D2):** không đổi. Quản trị sửa dưới mốc kèm `datGap` ⇒ vẫn tính một lần.
   - **Chuyến đã xếp (ADR-0050 VK1-B):** đổi nơi ⇒ chuyến bị giữ như cũ; ADR này không đổi.
   - **"Đã gọi báo" (ADR-0051):** giờ hẹn đổi sau khi xếp ⇒ mục "Giờ hẹn đổi — gọi báo khách" như cũ. ADR-0051 Q-GB-1 chọn "sửa giờ trên đơn" ⇒ đổi giờ do xe cũng tiêu một lượt (câu 3 vế b).
   - **ADR-0047 Phần B** (chưa vẽ): nếu thêm trường giờ mới, thêm vào hằng "giờ" của ADR-0062 Đ1 trong cùng lát (đổi cả tin lẫn lượt).

---

## Lệch có chủ ý và nới hàng rào (khuôn ADR-0029; chỉ hợp lệ khi chủ duyệt — Hiến chương 6.1)

| Mã | Điều lệch | Phạm vi | Vì sao | Lớp bù | Điều kiện gỡ |
|---|---|---|---|---|---|
| **L-V7-1** (mới) | 5.1 (luật ở CSDL) | `counted = 0` chỉ cho lần của Toàn quyền — **chỉ canh ở mã** | Trigger của `orders` không được đọc bảng quyền của `staff` (5.3) | Máy chủ đặt `counted` từ phiên, không nhận từ trình duyệt; câu kiểm định kỳ: dòng `counted = 0` mà `created_by` không giữ `SUPER_ADMIN` **lúc kiểm** (chỉ báo) | `staff` công bố view quyền cho trigger (ADR riêng) |
| **L-V7-2** (mới) | **5.2** (điều hay đổi là dòng dữ liệu có ngày hiệu lực) | con số **2** nằm trong mã (hằng `src/shared/`) và trong trigger SQL | Chủ nói một con số cố định; chưa có bảng chính sách cho nó; dựng bảng cho một số là nặng | Hằng một nơi; bài so chuỗi: số trong trigger migration = hằng (sửa một bên → đỏ) | Chủ muốn đổi con số thường xuyên ⇒ bảng chính sách có ngày hiệu lực (khuôn `migrations/0041_chinh_sach_dieu_phoi.sql`), migration mới thay trigger |
| **N-V7-3** (nới hàng rào, Điều 9.4) | — | thêm `orders.schedule_edit_insert_guarded` vào nợ `DOC_AUDIT_LOG_WONGUARD` | Lô ghi của `orders` dùng lính gác đọc `audit_log`; câu mới phải theo cùng khuôn để cả lô quay lại đúng | Cùng hạn 2027-03-31; quá hạn → đỏ (cơ chế sẵn có) | Như nợ gốc: `orders` lên STRICT với lính gác qua view công bố của `audit` |

Phần còn lại có lớp CSDL: hạn 2 lần (trigger), chỉ-thêm, khoá sau "Đã giao", `CHECK` ghi chú; khoá sau "Đã giao" của điều chỉnh tiền (có sẵn ở `0044`).

## Cửa một chiều / hai chiều

- **Một chiều (nhẹ):** bảng `ord_schedule_edit` và dữ liệu của nó; dòng điều chỉnh tiền do văn phòng ghi (chỉ-thêm, như route HDV); khuôn `detail` "số khách: …" (hợp đồng với ADR-0062).
- **Hai chiều:** con số 2 (L-V7-2); nội dung hằng "giờ"; nhãn; danh sách mã lý do (thêm mã = đổi hằng).

## Hệ quả

- **Migration:** `0048_doi_gio_sau_xac_nhan.sql` — bảng + trigger chỉ-thêm + trigger hạn + trigger khoá sau "Đã giao". Bảng số: 0046 = ADR-0058, 0047 = ADR-0062, 0048 = ADR-0063, 0049 = ADR-0065; ADR-0054…0057 và ADR-0060, ADR-0061 (phiên Góp ý, mỗi ADR một migration) lấy số ≥ 0050. Lập kế hoạch vẫn quét mọi nhánh/worktree trước khi đặt tệp (`CLAUDE.md` §10). D1 **không** cần migration (hành động nhật ký không có `CHECK` từ `0007`).
- **Mã:** route mới (D1); hằng `LY_DO_SUA_SO_KHACH`, `TRUONG_GIO_TINH_LUOT`; `insertMoneyAdjustment` thêm tham số hành động; hàm viết đoạn "số khách: …" và đoạn đuôi lượt đổi giờ; ba route đổi giờ/chặng thêm câu chèn có lính gác vào lô + bắt lỗi `ord_schedule_limit`; `src/shared/audit-actions.ts`: dùng `order_money_adjusted` đã khai sẵn bởi ADR-0062 (chỉ khai ở đây nếu lát này lên `main` trước ADR-0062 — luật thứ tự ADR-0062 Đ1) và cờ `doiSoKhach` của `order_money_adjusted_by_field`; `src/architecture.test.ts` thêm một tên nợ; `docs/data-dictionary.json` + `npm run dict`.
- **Ô quyền:** không thêm, không đổi.
- **Bất biến `audit-invariants`:** "đơn có > 2 dòng `counted = 1`" (vi phạm); L-V7-1 (báo).
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` §6/§7, `docs/CHANGE-GUIDE.md`, nhật ký thay đổi lời thường.
- **Việc lớn** (dữ liệu + quyền + tiền) ⇒ người kiểm độc lập chỉ-đọc sau thi công.

## Bài kiểm / hàng rào (mỗi rào: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày)

1. **Quyền C2 (e2e):** Kế toán, Quản trị, Toàn quyền → 200; Bán hàng đơn mình lập → 200, đơn người khác (kể cả đang phụ trách) → 403; HDV, Đối tác, Thực tập → 403 ở cổng.
2. **Một luật tiền:** bài quét — route mới gọi `planMoneyEdit`, không tự tính (khuôn NT-R9); số tiền sau sửa bằng số route HDV cho cùng đầu vào.
3. **Lý do (ADR-0023 điều 4):** mã ngoài danh sách → 400; thân có chữ lý do tự do → 400 và không lưu; "Khác" không nhận chữ kèm; `detail` chỉ chứa nhãn cố định của mã.
4. **Cờ `doiSoKhach` (dùng chung ADR-0062):** mọi hành động ghi `order_money_adjustment` mang cờ — tham số hành động của `insertMoneyAdjustment` chỉ nhận kiểu hành động có cờ (`npm run typecheck` đỏ khi truyền hành động khác) **và** bài quét: câu `INSERT INTO order_money_adjustment` chỉ có trong `insertMoneyAdjustment` (thêm tạm câu chèn thứ hai → đỏ).
5. **Khuôn `detail`:** dòng mới của cả hai hành động bắt đầu bằng "số khách: …"; dịch vụ nhập tay ghi "dịch vụ nhập tay"; bài khứ hồi của ADR-0062 xanh.
6. **Sau "Đã giao":** route mới 409 + `INSERT order_money_adjustment` tay → `RAISE` (NT-F7, NT-D3 của Sổ tiền).
7. **Hạn 2 lần (SQL, `node:sqlite`):** chèn dòng `counted = 1` thứ ba → `RAISE`; `counted = 0` thứ ba → qua; `UPDATE`/`DELETE` → `RAISE`; chèn sau "Đã giao" → `RAISE`; số 2 trong trigger = hằng `src/shared/` (L-V7-2).
8. **Hạn 2 lần (e2e):** Bán hàng đổi giờ 2 lần → 200; lần 3 → 409 `het_luot_doi_gio` câu tiếng Việt; Quản trị lần 3 → 409; Toàn quyền → 200 (không tính); **hai lệnh sửa hai chặng song song khi còn 1 lượt → đúng một thắng**, bên thua không để lại dòng nhật ký, dòng đếm, hay đổi giờ.
9. **Cả lô huỷ:** lệnh đổi giờ khi hết lượt không để lại thay đổi nào ở `order_service`, `ord_transfer_leg`, `audit_log`.
10. **Ghi chú:** thiếu → 400; có SĐT → lưu đã che; `audit_log.detail` không chứa ghi chú.
11. **Không tính nhầm:** chỉ đổi nơi đón → không tăng đếm; "Đặt gấp" → không tăng; nháp → không tăng; lệnh không đổi gì → không tăng; thêm chặng sau xác nhận → tăng.
12. **Kiến trúc:** câu mới nằm trong `chang-hanh-khach-repo.ts` (`EXPLAIN` chỉ chạm bảng `orders`/`ord_*` + `audit_log` qua lính gác có tên nợ); bỏ tên khỏi `DOC_AUDIT_LOG_WONGUARD` → đỏ.
13. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.

## Phương án bị loại

- **Đếm từ `audit_log`:** bảng của module `audit`, `orders` không được đọc (5.3); đếm-rồi-ghi ở mã bị đua (`changeLeg` khoá theo chặng); nhật ký là dấu vết, không phải chỗ giữ luật.
- **Cột đếm trên `orders`:** mất lịch sử ghi chú; phải xoá/tạo lại trigger `orders_delivered_lock` vì nó liệt kê từng cột (`0044:38-46` @`7621436e`, bài NT-R6); cột đếm sửa đè trái 5.5.
- **Hành động nhật ký riêng `order_schedule_edited`** (bản nháp trước): hai dòng nhật ký cho một lệnh; ADR-0062 phải khai thêm luật "dòng này không sinh tin" để tránh tin đôi. Chọn "trùng id" gọn hơn.
- **Ghi "lần n/2" vào nhật ký:** n sai khi đua; số thật lấy từ bảng.
- **"Khác" kèm ô chữ tự do có chặn dãy số** (bản nháp trước): trái ADR-0023 điều 4 đã duyệt (S23-9).
- **Mở route hẹp của HDV cho văn phòng** (bỏ điều kiện `narrowEligible`): trộn hai phạm vi trên một route, đúng lỗ kiểm độc lập đã bắt (`dispatch/index.ts:234-237`).
- **Phát hành C2 trước Sổ tiền:** "còn lại" âm; trái cả hai lời chủ.
- **Hạn theo từng dịch vụ/chặng:** chủ nói "mỗi đơn".

## Câu ADR bị thay (nguyên văn → mới)

Không sửa tệp ADR cũ; `docs/adr/README.md` do điều phối cập nhật.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| Kế hoạch Sổ tiền (không phải ADR) | — | **Không sửa** (lời chủ chốt 30/9 "làm ngay SAU Sổ tiền"; D2). |
| ADR-0007 điều 1, dòng bảng (`docs/adr/ADR-0007-*.md:21`) | "\| Sửa **thông tin vận hành** sau xác nhận (ngày giờ, đón, check-in, ghi chú) \| của mình **hoặc đang được giao** \| — \| mọi đơn \| ◆ chỉ cập nhật trạng thái việc được giao (đã đón, giờ thực tế) \|" | giữ nguyên dòng, thêm chú dưới bảng: "Đổi **giờ** (hằng `TRUONG_GIO_TINH_LUOT`) sau xác nhận: tối đa **2 lần mỗi đơn** (lần của Quản trị cũng tính; Toàn quyền không giới hạn), **ghi chú bắt buộc mỗi lần** (ADR-0063 D3)." |
| ADR-0061 điều 5 (accepted, phiên Góp ý) | "Route sửa sau xác nhận tương lai (C2) **phải** gọi `duocNhapTay` — bài tĩnh dưới đây canh." | "ADR-0061 điều 5: **không áp dụng cho route D1** (ADR-0063), vì route chỉ ghi điều chỉnh số khách, không thêm/đổi dịch vụ; Kế toán thêm dịch vụ nhập tay sau xác nhận = quyết định riêng sau." |
| ADR-0061 bảng quyền, dòng ACCOUNTING; "Hệ quả" (ô có giá trị nhưng chưa có tác dụng) | "\| ACCOUNTING \| any \| **Chưa có tác dụng** — Kế toán không lập/sửa đơn; chủ chọn Q-1 "Giữ quyền sẵn, chờ việc C2" \|" và "Kế toán — chưa có tác dụng, chờ route C2" | giữ nguyên giá trị ô; thêm: "Route C2 (ADR-0063 D1) **không** bật ô này — vẫn chưa có tác dụng, chờ quyết định riêng về Kế toán thêm dịch vụ sau xác nhận." |
| Chú thích mã `src/modules/dispatch/index.ts:234-237` (không phải ADR) | "… ô order.money.edit của ACCOUNTING/ADMIN trong MATRIX là "any" (dành cho một route KHÁC, chưa làm — N3 …" | cập nhật khi thi công: "… dành cho route văn phòng `POST /api/orders/:id/money-edit` (ADR-0063 D1)". Giá trị ô không đổi. |

## Câu hỏi còn mở (đã gom vào `cau-hoi-chu.md`, hỏi một lần)

- **Câu 3** — "giờ" gồm những gì (dùng chung với ADR-0062: quyết cả hạn 2 lần lẫn tin), và vế b: đổi giờ vì xe có tính lượt không.
- **Câu 4** — lần đổi giờ trước ngày phát hành không tính (khuyến nghị: bộ đếm bắt đầu từ 0 khi phát hành; nhật ký cũ không có ghi chú, không tách được "đổi giờ" với "đổi nơi").

## Chưa kiểm

- Spike R1 (`ea69363b`) chỉ đọc thông điệp commit; chưa đọc bài kiểm.
- Người soạn không đọc sổ thi công của nhánh `worktree-agent-aa1fab0316112d404`; số Task đọc ở kế hoạch trên nhánh đó (Task 6 có 6a–6f, Task 7…12).
- Tên của dịch vụ **có mã danh mục** trên đơn (`SubtotalServiceInput.name`) có phải luôn là tên chụp từ danh mục, không người dùng sửa được không — chưa kiểm. Nếu sửa được, hàm viết đoạn số khách phải lấy tên từ danh mục theo mã thay vì từ đơn.
- Chưa kiểm `validateTripUpdate` có cho đổi `checkinDate` / `checkinTime` sau xác nhận không ảnh hưởng mốc 6 giờ.
- Số lệnh đổi giờ thật trên production mỗi đơn (để biết 2 lần có đủ không): **không biết**.

## Ghi chú từ người thi công Sổ tiền (30/9, qua phiên "phân tích góp ý" — đọc mã nhánh `worktree-agent-aa1fab0316112d404` @b494dee5, chỉ đọc)
- `insertMoneyAdjustment` viết cứng `"order_money_adjusted_by_field"` ở `src/modules/orders/repository.ts:1136` (trên nhánh Sổ tiền; `:1150` trên main 1.38); nơi gọi duy nhất `src/modules/orders/index.ts:374`.
- Thêm tham số hành động KHÔNG vướng Sổ tiền: `datGiaoStatement` so theo số thứ tự điều chỉnh; `hoan-tat.ts` đọc dòng điều chỉnh mới nhất bất kể hành động.
- Ràng buộc khi thi công lát ADR-0063 (sau khi Sổ tiền gộp main):
  - trigger của `0044` chặn chèn `order_money_adjustment` sau "Đã giao" ⇒ route văn phòng mới kiểm `DA_GIAO()` ngay sau kiểm quyền, và thêm dòng vào bảng CA/MIEN của `src/modules/billing/sau-da-giao.test.ts`;
  - tên hành động mới khai ở `src/shared/audit-actions.ts` (xem ADR-0062 F1: có thể đã khai sẵn);
  - `tests/e2e/dispatch.mjs` và `v1-nguoi-phu-trach.mjs` bước o khẳng định tên hành động hiện tại ⇒ giữ `order_money_adjusted_by_field` làm mặc định cho đường HDV.
- Số bản: Sổ tiền lấy 1.41, nhánh giao diện của phiên Góp ý lấy 1.42 (tạm).
