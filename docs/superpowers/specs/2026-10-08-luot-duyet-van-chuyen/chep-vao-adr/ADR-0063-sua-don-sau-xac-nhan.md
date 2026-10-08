# ADR-0063 — Sửa đơn sau xác nhận: văn phòng sửa số khách (D1); hạn "đổi giờ tối đa 2 lần mỗi đơn" (D3, còn proposed)

- **Trạng thái:** **accepted một phần** 2026-10-08: D1 (chủ, lượt 8a); phần đổi giờ tối đa 2 lần vẫn proposed. Chủ dự án trả lời câu hỏi chọn phương án của lượt duyệt 8a ngày 2026-10-08, nhãn đã chọn nguyên văn: **"Duyệt (Recommended)"**. Phương án này gồm lời xác nhận rằng mục sổ HC-4.2 "bút toán điều chỉnh phải có người duyệt" không áp cho việc sửa số khách trên đơn, và để phần "đổi giờ tối đa 2 lần" sang lượt sau. Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8a" (nhánh `claude/van-chuyen-goi-a-c` @ `4fd27fe1`). AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. D3 muốn có hiệu lực phải qua một lượt duyệt riêng.
- **Ngày:** 2026-09-30 (đề xuất); 2026-10-08 (D1 duyệt).
- **Văn bản trình duyệt:** bản tóm `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/01-tom-adr-0063-so-khach.md`; trang ghép `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/00-trang-ghep.md`. Đề xuất gốc (giữ nguyên, chứa đủ D3): `docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/ADR-0063-sua-don-sau-xac-nhan.md`.
- **Mốc đo mã:** `tệp:dòng` đo trên nhánh `claude/van-chuyen-goi-a-c` @ `809918d5` (như bản tóm), trừ chỗ ghi `@4fd27fe1`.
- **Sửa:** ADR-0061 điều 5 (không áp cho route D1); chữ ADR-0014 `:86` cho người phụ trách Bán hàng (xem "Câu ADR bị thay"). Không đổi ô quyền nào.
- **Xây trên lỗ đang hở:** không. HC-4.2: chủ xác nhận cách đọc hẹp trong câu duyệt (mục "HC-4.2"). TNV-G4: D1 không nằm trên phần còn mở (ADR-0092 Đ5d, Đ6, Đ6a), nhưng phải phát hành sau Sổ tiền (D1.15).
- **Cửa:** D1 hai chiều về route, chữ, danh sách mã lý do; một chiều nhẹ về dòng điều chỉnh tiền văn phòng đã ghi (chỉ-thêm) và khuôn `detail` "số khách: …" (hợp đồng với ADR-0062).

## Lời chủ dự án

- 2026-09-30, báo cáo rà soát giao diện §6, dòng "ai được sửa số khách": **"Thêm Quản trị + Kế toán + người lập đơn"**, mỗi lần sửa ghi lịch sử tiền.
- 2026-09-30, chốt thứ tự: **"Làm ngay SAU Sổ tiền"**.
- 2026-10-08, khi giao việc: *"Gửi bản tóm để duyệt"*.
- 2026-10-08, lượt duyệt 8a: **"Duyệt (Recommended)"** (xem dòng Trạng thái).

## Bối cảnh

- Hôm nay, sau khi đơn đã xác nhận, chỉ hướng dẫn viên đang phụ trách và Toàn quyền sửa được số khách: route `POST /api/orders/:id/handler-money-edit` (`src/modules/dispatch/index.ts:247`) chặn văn phòng ở `:256-257` (`narrowEligible`), chặn sau "Đã giao" ở `:258`, chặn sau ngày đi ở `:259` (trừ Toàn quyền).
- Ô `order.money.edit` (`src/shared/permissions.ts:95`): SALES `own`, ACCOUNTING `any`, ADMIN `any`, FIELD `assigned`, SUPER_ADMIN `any`, còn lại `none`. Ô đã đúng ý chủ; chỉ thiếu route.
- Sổ tiền lượt 1 (`0044`, `0045`) và lượt 2 (`0078`–`0083`) đã có trên `main`. `docs/quyen-hoan.json` (TNV-G1, TNV-G4) ghi phần `0078`–`0083` chưa lên production (chưa kiểm bằng lệnh).
- Khoá tiền đơn đã xác nhận (`migrations/0081_khoa_tien_don_xac_nhan.sql:3-4, 7-22`) khoá `order_item` và `orders.subtotal/discount/total`, **không** chặn `order_money_adjustment`, nên đường D1 hợp lệ.

## Quyết định

### D1. Văn phòng sửa số khách sau xác nhận — **accepted** 2026-10-08

1. **Route mới** `POST /api/orders/:id/money-edit` (tên đề xuất), module `orders`, cổng `office`.
2. **Ai:** thân route hỏi `can(staff, "order.money.edit", { ownerId })` và **không truyền `assigned`**. Bán hàng chỉ sửa đơn mình lập; Kế toán, Quản trị, Toàn quyền sửa mọi đơn. Hướng dẫn viên giữ route hẹp của mình (sửa tới hết ngày đi như cũ). Đối tác, Thực tập không sửa được, phải nhờ văn phòng.
3. **Không thêm, không đổi ô quyền.**
4. **Một luật tiền** (Hiến chương 5.4): dùng lại `planMoneyEdit` (`src/modules/orders/money-adjustment.ts:271`) và `insertMoneyAdjustment` (`src/modules/orders/repository.ts:1214`). Máy chủ tính theo đơn giá đã chốt lúc lập đơn; màn hình không gửi số tiền nào; giảm giá của đơn giữ nguyên.
5. **Phạm vi:** chỉ số khách theo loại (người lớn, trẻ em, người cao tuổi, em bé) của dịch vụ đã có trong đơn. Thêm hay bỏ dịch vụ không thuộc ADR này.
6. **Điều kiện:** đơn `confirmed`, chưa "Đã giao". Văn phòng sửa được cả sau ngày đi, tới khi "Đã giao". Lưới cuối: trigger `order_money_adjustment_delivered_lock_ins` (`migrations/0044_orders_da_giao.sql:73`).
7. **Lý do là mã đóng** theo ADR-0023 điều 4 (`docs/adr/ADR-0023-huong-dan-vien-thay-don-cho-nhan-va-sua-don-da-nhan.md:58`): "Khách thêm người", "Khách bớt người", "Đổi dịch vụ", "Khác". "Khác" không kèm ô chữ. Mã ngoài danh sách → 400; thân có chữ lý do tự do → 400, không lưu. Hằng đặt một nơi ở `src/shared/`. Nhật ký ghi nhãn cố định của mã, nên không bao giờ chứa số điện thoại.
8. **Lịch sử và nhật ký:**
   - mỗi lần sửa ghi một dòng `order_money_adjustment` chỉ-thêm (số khách trước → sau, tiền trước → sau), nối một-một với một dòng nhật ký cùng `id` (ADR-0007 điều 2; Hiến chương 5.5);
   - hành động nhật ký `order_money_adjusted` (văn phòng), tách khỏi `order_money_adjusted_by_field` (hướng dẫn viên); `insertMoneyAdjustment` nhận tham số hành động, kiểu chỉ nhận hành động mang cờ `doiSoKhach`;
   - hành động `order_money_adjusted` đã khai ở `src/shared/audit-actions.ts:40` @`4fd27fe1` (gói A3, ADR-0062), nhãn "Sửa số khách (văn phòng)", cờ `doiSoKhach`. Lát D1 không khai lại. Trên `main`: chưa kiểm.
9. **Khuôn `detail`** (ADR-0062 Đ2): "số khách: <dịch vụ>: người lớn A → B, … · lý do: <nhãn>". Dịch vụ có mã danh mục ghi tên, dịch vụ không mã ghi "dịch vụ nhập tay". Không tiền, không tên khách.
10. **Chống đua:** giữ `seq` duy nhất của `0021`; thua → 409 "Đơn vừa được người khác sửa".
11. **Trả dư:** khách bớt người sau khi đã trả trước thì sổ hiện "khách đã trả dư, chờ Kế toán hoàn" (`conLai`, `src/modules/billing/rules.ts:73-83`), không chặn thao tác (lời chủ 29/9).
12. **Tổng tiền âm: cảnh báo, không chặn.** Đơn có giảm giá lớn mà văn phòng bớt khách tới mức tiền dịch vụ nhỏ hơn số giảm giá thì tổng ra số âm (`effectiveMoney` = `subtotal − discount`, `money-adjustment.ts:227-228`), và sổ báo "dư chờ hoàn" lớn hơn số khách thật đã trả. Không chặn, vì khách bớt người là chuyện có thật, mà giảm giá không sửa được sau xác nhận (`migrations/0081_khoa_tien_don_xac_nhan.sql:3-4`); chặn tức là không ghi được thực tế (Hiến chương 5.9, `docs/ARCHITECTURE.md:107`; khuôn ADR-0079 `:75`). Cảnh báo hiện ở trang đơn và trong màn hoàn của Kế toán. Chặn trần "giảm giá ≤ tiền dịch vụ" là luật tiền mới, không thuộc ADR này.
13. **Hoa hồng** tính theo số khách mới, với mức đã chụp lúc xác nhận (ADR-0077 `:80`, `:83`); hoa hồng tụt dưới số giảm giá thì cảnh báo, không chặn (ADR-0079 `:75`). Dòng điều chỉnh số khách không khoá theo kỳ (ADR-0080 `:70`).
14. **Nhãn nút:** "Sửa số khách dịch vụ" (khác ô "Số khách đi xe" của ADR-0065 nếu ADR đó được duyệt).
15. **Phát hành sau Sổ tiền** (D2 của đề xuất gốc, lời chủ 30/9): không phát hành D1 trước khi phần Sổ tiền mà nó dựa vào đã lên production. Trước Sổ tiền, khách bớt người sau khi trả cọc sẽ ra "còn lại" âm.
16. **Nối ADR-0104 Đ2** (accepted cùng ngày): route D1 là một điểm gọi của "Đồng bộ chuyến theo đơn"; câu chuyến đi chung một lô với câu ghi điều chỉnh. Bài tĩnh "mọi route đổi số người phải gọi hàm đồng bộ" phủ route này.

### HC-4.2 — chủ xác nhận cách đọc hẹp

Câu duyệt của phương án chủ chọn có câu: *"Tôi xác nhận mục sổ 'bút toán điều chỉnh phải có người duyệt' (HC-4.2) không áp cho việc sửa số khách trên đơn."* Căn cứ và lập luận ngược chiều đã trình đủ ở bản tóm, mục C:
- chữ Hiến chương hệ thống 4.2 không ghi "khác người tạo"; phạm vi mục sổ là "bút toán điều chỉnh sổ tiền (công nợ, chi phí chuyến)";
- hướng dẫn viên đang phụ trách đã sửa số khách một mình qua route hẹp, ghi cùng bảng, mà mục sổ không coi đó là lỗ;
- ngược chiều: billing có đọc kết quả bảng này (`phaiThuNhieuDon`, `src/modules/billing/service.ts:217`; `src/modules/orders/hoan-tat.ts:8-17`), và `docs/ARCHITECTURE.md:145` xếp `order_money_adjustment` vào hàng 4.2 / 5.5.

Vì chủ đã xác nhận, D1 **không** mang dòng "xây trên lỗ đang hở: HC-4.2".

### D2. Thứ tự thi công

D1 là lát riêng, bắt đầu sau khi Sổ tiền đã gộp `main` (đã đạt). Điều còn giữ là điều kiện phát hành ở D1.15. Theo sổ thi công, A2 (thi công D1) bắt đầu sau lượt duyệt 8a.

### D3. Hạn "đổi giờ tối đa 2 lần mỗi đơn" — **vẫn proposed**

Không chép vào đây. Văn bản đầy đủ ở đề xuất gốc, mục D3, cùng hai câu chủ chưa trả lời: thế nào là "đổi giờ" (dùng chung với ADR-0062), và lần đổi trước ngày phát hành có tính không. Khi được duyệt thì ghi ở dòng trạng thái của ADR này hoặc ADR mới trỏ về.

## Chỗ lệch với mã hôm nay (đối chiếu @`809918d5`, bản tóm mục B)

- **Lý do mã đóng chưa thi công:** route hướng dẫn viên vẫn nhận chữ tự do, chỉ chặn dãy số dài (`money-adjustment.ts:79-100`); `EDIT_REASON_QUICK` chỉ có 3 nhãn điền nhanh (`src/shared/viec-cua-toi.ts:88`). Đổi route hướng dẫn viên sang mã lý do là việc của ADR-0023 (lượt D6); nên làm cùng lát để một luật lý do cho cả hai route.
- **Bán hàng phụ trách đơn người khác lập không sửa được** (ô `own`), lệch chữ ADR-0014 `:86` (cấp đầy đủ của người phụ trách Bán hàng có `order.money.edit`). Giữ `own` theo lời chủ 30/9 "người lập đơn".
- **Văn phòng rộng hơn hướng dẫn viên về thời gian:** hướng dẫn viên bị chặn sau ngày đi (`dispatch/index.ts:259`), văn phòng sửa tới "Đã giao".
- **Hướng dẫn trong Nền tảng** `src/shared/huong-dan-ban-hang.ts:146` ghi việc này "đang chờ làm"; sửa chữ khi thi công.
- **Tổng âm** (D1.12): mới đọc mã, chưa chạy thử.

## Câu ADR bị thay (nguyên văn → mới; không sửa tệp ADR cũ)

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0061 điều 5 (`docs/adr/ADR-0061-mo-lai-dich-vu-nhap-tay-noi-bo.md:38`) | "Route sửa sau xác nhận tương lai (C2) **phải** gọi `duocNhapTay` — bài tĩnh dưới đây canh." | "Không áp cho route D1 của ADR-0063: route chỉ ghi điều chỉnh số khách của dịch vụ đã có, không thêm, đổi tên hay đổi giá dịch vụ. Kế toán thêm dịch vụ nhập tay sau xác nhận là quyết định riêng sau; ô `order.service.manual` của Kế toán vẫn chưa có tác dụng." |
| ADR-0014 `:86` (cấp đầy đủ của người phụ trách `SALES`) | "… sửa số khách/dịch vụ/tiền sau xác nhận (`order.money.edit`)." | "… trừ sửa số khách sau xác nhận: Bán hàng chỉ sửa đơn mình lập (ô `own`, lời chủ 30/9; ADR-0063 D1)." |
| Chú thích mã `src/modules/dispatch/index.ts` (không phải ADR) | "… dành cho một route KHÁC, chưa làm …" | cập nhật khi thi công: "… dành cho route văn phòng `POST /api/orders/:id/money-edit` (ADR-0063 D1)". |

## Cửa một chiều / hai chiều

- **Một chiều (nhẹ):** dòng điều chỉnh tiền do văn phòng ghi (chỉ-thêm, như route hướng dẫn viên); khuôn `detail` "số khách: …" (hợp đồng với ADR-0062).
- **Hai chiều:** route; danh sách mã lý do (thêm mã = đổi hằng); nhãn, cảnh báo tổng âm.

## Hệ quả

- **Migration:** D1 không cần (hành động nhật ký không có `CHECK` từ `0007`).
- **Mã:** route mới; hằng mã lý do; tham số hành động của `insertMoneyAdjustment`; hàm viết đoạn "số khách: …"; cảnh báo tổng âm ở trang đơn và màn hoàn; nút "Sửa số khách dịch vụ".
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` §6, §7; `docs/CHANGE-GUIDE.md`; nhật ký thay đổi lời thường; hướng dẫn Bán hàng.
- **Việc lớn** (tiền + quyền): kế hoạch riêng, mỗi task đỏ → xanh, người kiểm độc lập chỉ-đọc. Sổ vàng (Hiến chương 5.17) cho các ca: giảm khách sau khi đã thu (ra số dư), tăng khách, dịch vụ nhập tay trong cùng đơn, tổng âm (có cảnh báo, không chặn); Kế toán xác nhận tới từng đồng.

## Bài kiểm / hàng rào (D1; mỗi rào: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày)

1. **Quyền (e2e):** Kế toán, Quản trị, Toàn quyền → 200; Bán hàng đơn mình lập → 200, đơn người khác (kể cả đang phụ trách) → 403; hướng dẫn viên, Đối tác, Thực tập → 403 ở cổng.
2. **Một luật tiền:** bài quét — route mới gọi `planMoneyEdit`, không tự tính (khuôn NT-R9); số tiền sau sửa bằng số route hướng dẫn viên cho cùng đầu vào.
3. **Lý do:** mã ngoài danh sách → 400; thân có chữ lý do tự do → 400 và không lưu; "Khác" không nhận chữ kèm; `detail` chỉ chứa nhãn cố định.
4. **Cờ `doiSoKhach`:** tham số hành động của `insertMoneyAdjustment` chỉ nhận hành động có cờ (`npm run typecheck` đỏ khi truyền hành động khác); câu `INSERT INTO order_money_adjustment` chỉ có trong `insertMoneyAdjustment`.
5. **Khuôn `detail`:** dòng mới của cả hai hành động bắt đầu bằng "số khách: …"; bài khứ hồi của ADR-0062 xanh.
6. **Sau "Đã giao":** route mới 409, và `INSERT order_money_adjustment` tay bị trigger chặn; thêm ca vào bảng ca của `src/modules/billing/sau-da-giao.test.ts`.
7. **Tổng âm:** bớt khách làm tổng âm → 200, phản hồi và trang đơn có cảnh báo; màn hoàn của Kế toán có cảnh báo.
8. **Đồng bộ chuyến (ADR-0104 Đ2):** bài tĩnh điểm gọi phủ route mới.
9. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.

## Chưa kiểm

- Ca tổng âm: chỉ đọc mã, chưa chạy thử.
- Trạng thái production của Sổ tiền: chỉ đọc sổ `docs/quyen-hoan.json`, chưa chạy lệnh chỉ-đọc.
- `order_money_adjusted` đã có trên `main` hay chưa: chưa kiểm (đã có @`4fd27fe1`).
- Các mục "Chưa kiểm" của đề xuất gốc còn nguyên (tên dịch vụ có mã danh mục có sửa được không).
