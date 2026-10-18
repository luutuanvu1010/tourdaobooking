# Đặc tả — Sổ đại lý đợt 2: đơn có người hưởng hoa hồng đi tới «Đã giao – đã thu đủ»

- **Trạng thái:** **chờ chủ duyệt** (lượt duyệt ở `trinh-chu.md`). Soạn 2026-10-18 bởi phiên lập kế hoạch; chưa ai thi công. Người kiểm độc lập đọc trước khi trình.
- **Nguồn đã duyệt (áp dụng, không hỏi lại):** ADR-0078 phần B2 (điều 7, 9, 10), ADR-0079 (toàn bộ), lời chủ C1–C13 = A (`docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`). Các ADR ra sau đã sửa câu của chúng: ADR-0088, 0089, 0092, 0109, 0115, 0117, 0120. **Mới:** ADR-0130 (đề xuất, `de-xuat-adr-khach-tra-ben-kia.md`) thay ADR-0078 điều 8 gạch 2 theo lời chủ 18/10.
- **Chia đợt (lời chủ 2026-10-08, không hỏi lại):** đợt 2 = ADR-0078 B2 + ADR-0079 (+ đơn cũ, trần giảm giá). Đợt 3 = ADR-0080 D2 + ADR-0081, khung kế hoạch ở `docs/superpowers/plans/2026-10-18-so-dai-ly-dot-3-khung.md`.
- **Xây trên lỗ đang hở:** TNV-G1, TNV-G3, TNV-G4, HC-4.2 (đều ở vùng `billing`, `docs/quyen-hoan.json`, hạn 2026-11-30). Phần chính của ba mục TNV đã vá trong mã; còn ca vàng chờ xác nhận và vài mảnh nhỏ. Đặc tả này **không được duyệt** nếu chủ chưa ghi lời cho phép có lý do (`trinh-chu.md`, quyết định 3).
- **Bằng chứng đo mã:** hai lượt đo chỉ-đọc ngày 2026-10-18 trên `main` = `cc003e02`. Tên tệp / hàm ở đặc tả này là tên **hôm nay**; số dòng ADR trích (đo 1/10) đã cũ.

## 1. Mục tiêu và không mục tiêu

**Mục tiêu.** Một đơn có bên đặt là đại lý (người hưởng hoa hồng — HDV độc lập, công ty lữ hành, lễ tân, taxi, cộng tác viên, loại đối tác tự thêm) đi được trọn đường: Xác nhận (đã chụp mức từ đợt 1) → ghi tiền khách trả, kể cả khách trả cho đại lý / tại quầy nhà cung cấp → **«Đã giao – đã thu đủ»** → sổ ghi ngay ai nợ ai (hoa hồng, giảm giá bên đặt chịu, giá vốn nhà cung cấp) → «Hoàn thành» từng đơn bằng nút nộp / trả từng đơn đã có.

**Không mục tiêu (đợt 3 hoặc việc khác):**
- quyết toán gộp nhiều đơn một phiếu hai chiều, bảng kê tháng (ADR-0080 D2);
- đại lý tự xem sổ của mình (ADR-0081);
- hoàn tiền / giảm trừ sau «Đã giao» (ADR-0116, còn bị chặn) và câu «hoa hồng có giảm theo không» (ADR chưa nói — ghi ở §7);
- nợ nhà xe vào sổ (C7 = A, tách riêng);
- đổi tên nhãn «Hoa hồng / Giá đại lý» (chủ chưa chọn tên, giữ nhãn hiện có).

**Phản mục tiêu** (làm thì coi như hỏng dù chạy được): đơn khách lẻ nào bị giữ thêm so với hôm nay; số hoa hồng tự lấy 0 khi thiếu mức; đối tác thấy tên người thu hay tiền người khác đang giữ; có một đường tính tiền thứ hai ngoài hàm duy nhất.

## 2. Các phần việc

Mỗi phần: quyết định gốc → hiện trạng đo được → việc phải làm. Tên tệp đầy đủ ở kế hoạch.

### P1. Mở «Đã giao» cho đơn có người hưởng (ADR-0079 điều 1, 5)
- **Hôm nay:** lý do giữ `booker_partner` trong `lyDoChuaGiaoDuoc` (`billing/rules.ts`). Lớp SQL `CO_NGUOI_HUONG` ở `orders/hoan-tat-repo.ts` (đã ghim vào bản chụp hiện hành từ bản vá 1.92, cộng vế dự phòng «bên đặt đang mang vai nhóm bên ngoài» cho đơn chưa chụp) nằm trong cả `GIAO_STATE` lẫn `DAT_GIAO_DIEU_KIEN`.
- **Làm:** bỏ `booker_partner`. Thêm ba lý do giữ: `terms_missing` (Kế toán), `booker_not_beneficiary` (Văn phòng / Kế toán), `terms_exceed_price` (Kế toán, xem P3). Ba lý do này đứng đúng chỗ cũ, tức sau «chưa tới ngày đi», trước «đang đối chiếu» (ADR-0120). Lớp 1 (câu ghi của `orders`) đổi thành: mọi dòng dịch vụ của đơn có bản chụp hiện hành và không bản nào `MISSING`. Lớp 2: trigger mới trên phiếu `DELIVERED` của `billing` đọc view công bố của `orders`.
- **Lệch cần biết:** view `v_ord_terms_missing` hôm nay chỉ liệt kê đơn có bản hiện hành `MISSING`, nên dòng **chưa có bản chụp nào** không lọt vào. Phải thêm view mới (hoặc mở rộng view) cho «thiếu bản chụp», nếu không lớp 2 bỏ sót nhóm b2 (P6).

### P2. Dòng thương mại ở phiếu «Đã giao» (ADR-0079 điều 2–4; C1 = A; ADR-0109)
- **Hôm nay:** `bil_debt_kind` chỉ có `HELD`, `SETTLEMENT`, `REFUND`. `sinhPhieuDaGiao()` trả mảng rỗng. Câu ghi dòng gán cứng `order_service_id = NULL`. Nguồn số đã có: `phanThuongMaiCuaDon` (`orders/index.ts`) cùng các hàm tính ở `src/shared/hoa-hong-dong.ts`.
- **Làm:** thêm ba loại dòng `HOA_HONG` (Tour Đảo → người hưởng, mỗi dòng dịch vụ có hoa hồng > 0), `GIAM_GIA_BEN_DAT` (người hưởng → Tour Đảo, số = **giảm giá hiệu lực** theo ADR-0109 = min(giảm giá, tạm tính), chỉ khi đơn có người hưởng và số > 0), `GIA_VON` (Tour Đảo → nhà cung cấp, mỗi dòng làm đại lý). `sinhPhieuDaGiao` thuần, nhận số. Lô «Đã giao» gọi `phanThuongMaiCuaDon` một lần rồi chèn các dòng vào cùng `db.batch()`. Dòng mang `order_service_id`.
- **Dùng lại, không tính lại:** «thu hộ» không đổi luật (ADR-0079 điều 3). Ai cầm tiền khách thì người đó có dòng giữ hộ nợ Tour Đảo. Không có dòng «HDV nợ đại lý».

### P3. Lưới CSDL cho số thương mại (ADR-0079 điều 6; C10 = A, lệch có tên L-C1)
- **Làm:** cột `gross_snapshot` trên `bil_posting`, chỉ cho phiếu `DELIVERED` mới; spike trên D1 local xem `ADD COLUMN` kèm `CHECK` được không, không được thì dùng trigger `BEFORE INSERT`. Trigger (i)–(iv) trên `bil_debt_line` đúng phạm vi ADR ghi: miễn dòng đảo, miễn phiếu điều chỉnh, miễn phiếu `DELIVERED` cũ. Route «Đã giao» kiểm trước bằng hàm duy nhất: tổng hoa hồng + giá vốn vượt giá bán, **hoặc một dòng vượt thành tiền của chính dòng đó** (phần chỉ ở mã), ⇒ lý do giữ `terms_exceed_price` bằng lời thường. Việc này cũng giải nợ `BL-SDL-GIA-DAI-LY-AM` ở bước «Đã giao»; màn đơn vẫn hiện số âm cho Kế toán thấy.
- **Sống chung với trigger đang có:** `reversal_match`, `trip_not_yet`, `settlement_no_flip`, `held_once`, `held_no_single_reversal`, `company_received_txn`, `adjustment_match`. Mỗi trigger mới phải có ca kiểm chứng tỏ không chặn nhầm đường đảo / điều chỉnh (tiêu chí 7 của ADR-0079).

### P4. Người thu là bên đặt / nhà cung cấp; khoản «khách trả bên kia» (ADR-0078 điều 7, 9; ADR-0130 đề xuất)
- **Hôm nay:** bảng `bil_collector_role` có `BOOKER` (bật) và `SUPPLIER` (**tắt**), nhưng cổng thật là `docLanThu` (`billing/service.ts`), và cổng này chỉ cho ra `COMPANY` / `STAFF`. Hằng `COLLECTOR_ROLES_GHI_MOI` là mã chết. `collected_for_party_id` luôn là công ty chủ (kiểm `R-BIL-S9`).
- **Làm:**
  - Tài khoản Đối tác ghi «tôi đã thu» ⇒ người thu `BOOKER` = hồ sơ của mình, nợ ngay. Hôm nay cổng lưu nhầm thành `STAFF`; sửa luôn.
  - Kế toán / Toàn quyền ghi thẳng `BOOKER` / `SUPPLIER` ⇒ nợ ngay.
  - Người khác có `payment.receive` khai ⇒ dấu `DECLARED`, không nợ, đơn chờ Kế toán (ADR-0130). Route «Bên kia đã nhận» (ô `ledger.write`) ghi dấu `CONFIRMED` cộng phiếu một dòng giữ hộ trong một lô.
  - Bật `SUPPLIER`; số của nó ≤ phần thành tiền chưa thu của các dòng thuộc nhà cung cấp đó.
  - `collected_for_party_id` = người bán của phần tiền. Đổi `R-BIL-S9`, thêm `R-BIL-12` theo ADR-0078.
  - Trigger mã giao dịch ngân hàng (0099) chỉ áp cho người thu Công ty.
- **Đơn đang đối chiếu:** đổi chữ câu giữ `reconciling` để nói đúng khoản đang chờ («khách trả cho <đại lý>» / «tại quầy <nhà cung cấp>»).

### P5. Biên nhận chia phần theo người bán (ADR-0078 điều 10)
- **Làm:** `ReceiptDto` thêm `phan[]` theo người bán. Danh sách trắng giữ nguyên: không a%, giá vốn, hoa hồng, tên người thu, hình thức thu. Mở rộng bài «số lạ» của biên nhận để gieo vào giá vốn và hoa hồng. Người bán từng dòng lấy qua `orders` (`receipt` không có cạnh tới `pricing`).

### P6. Đơn cũ khi bản lên (ADR-0079 điều 7; C4 = A)
- **(a) Đơn khách lẻ đã «Đã giao» trước bản này, có dòng làm đại lý:** Kế toán bổ sung giá vốn bằng **yêu cầu điều chỉnh có người thứ hai duyệt** (ADR-0115 đã đổi cách chạy). Mở `loaiDong` của đường điều chỉnh thêm ba loại mới. `R-BIL-2` / `R-BIL-5` chỉ cảnh báo với đơn trước mốc phát hành.
- **(b1) Đơn khách lẻ đã xác nhận, chưa giao, chưa có bản chụp** (xác nhận trước 12/10): chụp bù tự động lúc phát hành, hoa hồng `NONE`, người bán theo dòng điều khoản `ALL`. **Lựa chọn của tôi:** câu một lần trong migration (được Time Travel của `trien-khai` che), **loại ra** đơn có dịch vụ đang mang dòng điều khoản SERVICE / GROUP (tức có thể là dịch vụ nhà cung cấp bán). Đơn bị loại (gọi là b1x) đi đường (b2) để Kế toán chụp đúng người bán. Đây là **ngoại lệ duy nhất** của phản mục tiêu «không đơn khách lẻ nào bị giữ thêm»: các đơn b1x chờ Kế toán bấm «Chụp bù». Số đơn b1x được đếm và báo chủ trước khi phát hành. Chủ chạy câu đếm chỉ-đọc trước; nếu (b1) = 0 thì bỏ hẳn câu một lần. Câu một lần này phải lên **cùng bản** với luật «Đã giao» mới, vì lớp 1 đòi mọi dòng có bản chụp.
- **(b2) Đơn có người hưởng hoặc có dòng nhập tay, chưa có bản chụp:** bị giữ `terms_missing`. Kế toán bấm **«Chụp bù»** cho từng đơn hoặc cả danh sách, theo mức hiệu lực ở **ngày xác nhận** của đơn; có nhật ký. Ô: `order.terms.override`. Dùng **cùng** `chupDon` với lúc Xác nhận.
- **(c) Đơn nháp / chờ xác nhận:** không cần gì.

### P7. Trần giảm giá theo người hưởng (ADR-0079 điều 8, 9; C8 = A, C11 = A)
- **Hôm nay:** `PARTNER_DISCOUNT_CAP = 0`, xét theo **người thao tác** (`price-guards.ts`). Lúc Xác nhận, bước kiểm giá chạy **trước** bước tính bản chụp.
- **Làm:** đơn có người hưởng ⇒ trần = tổng hoa hồng của đơn, áp cho **mọi người** sửa đơn (kể cả Bán hàng, Quản trị). Nháp: tính theo bảng hôm nay, dòng thiếu mức tính 0. Xác nhận: theo bản chụp vừa tính trong cùng lô, nên phải đổi thứ tự (tính bản chụp trước, kiểm trần sau). Sau xác nhận, giảm số khách làm hoa hồng tụt dưới giảm giá: không chặn, màn đơn cảnh báo. Thực tập vẫn trần 0 (ADR-0100, giữ cái chặt hơn). Vế giá danh mục vẫn xét theo người thao tác. Kiểm định kỳ `R-ORD-DC1`.

### P8. Bịt hai chỗ lộ tên với tài khoản Đối tác (áp luật ADR-0081 điều 4 ngay đợt này)
- Mở «Đã giao» cho đơn đại lý thì hai chỗ sau bắt đầu hiện cho Đối tác:
  - câu lý do chưa hoàn thành «<tên> đang giữ <số>»;
  - `lanThu[].nguoiThu` (tên hồ sơ người thu) ở `GET /api/orders/:id/payments`.
- **Làm:** với tài khoản giữ quyền Đối tác (kể cả tài khoản lai), thay tên bằng lời chung («người thu khác»), không kèm số tiền của người khác. Thêm ca vào bài «số lạ» của đối tác.

### P9. Kiểm định kỳ, hàng rào, sổ vàng
- Bật `R-BIL-2`, `R-BIL-5` (cảnh báo trước mốc, lỗi sau mốc). Thêm kiểm «số dòng giảm giá bên đặt». ADR gọi nó là R-BIL-14, nhưng mã này **đã dùng** cho ADR-0115, nên **lựa chọn của tôi** là lấy mã trống kế tiếp (dự kiến `R-BIL-16`). Thêm `R-BIL-12`, `R-ORD-DC1`. Đưa `R-BIL-2` vào bảng kiểm trước khi khoá tháng.
- `R-BIL-13`: câu kiểm hôm nay chỉ cộng `HELD`, `SETTLEMENT`, còn trigger cộng mọi loại. **Lựa chọn của tôi:** câu kiểm cộng mọi loại như trigger, để hai lớp không lệch khi có ba loại mới.
- Hàng rào `BL-VA-RAO-K3` («một nguồn tính hoa hồng»: bắt biến bị bọc, `CAST` / `IFNULL` trong SQL) dựng **trước** mọi câu SQL mới ghi hoa hồng.
- Sổ vàng: thêm C-1…C-5 của ADR-0079 vào `golden/so-cong-no-luot-2.json` ở trạng thái `cho_xac_nhan`. Chạy SV-HT-01…05 trên mã sổ (hôm nay bị lọc bỏ). Luật lớp 1 «tổng thu = giá bán» của `so-vang.test.ts` vỡ khi có giảm giá bên đặt chịu; đổi sang công thức của `R-BIL-2`. Câu luật tương ứng ở `docs/ARCHITECTURE.md` chỉ được **đề xuất diff**, không tự sửa.
- **Gộp hồ sơ có bản chụp** (nợ `BL-SDL-DOT-2` (2), ADR-0117 điều 7): viết bài chạy thật. Nếu hành vi làm sai tiền thì **dừng, báo chủ, mở việc riêng**; không sửa trong đợt này.

## 3. Lựa chọn tôi tự quyết (đảo được, ghi để chủ soát)
1. b1 bằng câu một lần trong migration, loại đơn có dòng điều khoản SERVICE / GROUP (P6).
2. Đổi tên kiểm «số dòng giảm giá bên đặt» khỏi R-BIL-14 (trùng) sang mã trống kế tiếp (P9).
3. `R-BIL-13` cộng mọi loại dòng như trigger (P9).
4. Thực tập trên đơn có người hưởng giữ trần 0 (P7).
5. Hai chỗ lộ tên với Đối tác sửa ngay đợt 2, không chờ đợt 3 (P8).
6. Gộp hồ sơ có bản chụp: chỉ viết bài kiểm, sai thì dừng (P9).
7. Một lần phát hành cho cả đợt 2, migration dự kiến `0111`, bản dự kiến `2.18`. Cả hai số **tạm**: `0098` đang bị nhánh đưa đón (ADR-0118) chưa gộp giữ, nên kiểm lại ở `main` và mọi nhánh lúc gộp.
8. Đợt 2 lập kế hoạch đầy đủ; đợt 3 chỉ ở mức việc, chi tiết hoá sau khi đợt 2 vào bản chính, vì mã đợt 3 dựa vào các loại dòng của đợt 2.

## 4. Tiêu chí nghiệm thu (đỏ trước, xanh sau)
Gồm mọi tiêu chí 1–8 của ADR-0079, tiêu chí B2 của ADR-0078 (trừ 3b, đã thay bằng tiêu chí 1–5 của ADR-0130), cộng thêm:
1. Đơn đại lý ví dụ C-1 đi trọn đường trên e2e: xác nhận → đại lý tự ghi cọc 3.000.000 → HDV ghi 1.750.000 → «Đã giao» → số dư đúng từng đồng (đại lý nợ 2.750.000, HDV nợ 1.750.000) → nộp / trả từng đơn → «Hoàn thành».
2. Ca SV-HT-03 trên e2e: HDV khai «khách trả tại quầy i-resort 400.000» ⇒ «Đã giao» bị giữ «đang đối chiếu» ⇒ Kế toán «Bên kia đã nhận» ⇒ «Đã giao» được ⇒ Tour Đảo nợ i-resort 80.000.
3. Đơn khách lẻ thường (không người hưởng, đã có bản chụp `NONE`): «Đã giao» như hôm nay, không lý do giữ mới.
4. Tài khoản Đối tác: không thấy tên người thu, không thấy «<tên> đang giữ» trên mọi bề mặt của đơn mình (bài số lạ).
5. Mỗi hàng rào mới (trigger lớp 2, (i)–(iv), dấu đối chiếu, trần giảm giá) có dòng ở `docs/SO-HANG-RAO.md` kèm ngày **quan sát chặn thật** (sửa cố ý → đỏ → hoàn nguyên).
6. `npm test`, `typecheck`, e2e (`so-dai-ly`, `so-tien`, `nhap-tay-va-gia-doi-tac` đã sửa, kịch bản mới), `audit-invariants` local đều xanh; kịch bản Chrome và ảnh thật của các màn đổi (trang đơn, form lần thu, Việc của bạn của Kế toán, biên nhận).

## 5. Dữ liệu thật và thứ tự phát hành
Nền tảng đã mở cho người dùng thật: bảo trì tắt từ 18/10, theo `docs/HANDOFF-N1.md` (chưa kiểm lại bằng lệnh). Đợt 2 ghi một chiều lên đơn thật (bản chụp bù b1, dòng sổ mới). Trước khi phát hành, chủ chạy các câu **đếm chỉ-đọc** ở kế hoạch Task 0:
- số đơn nhóm a;
- số đơn nhóm b1 / b2;
- số đơn b1 có dịch vụ mang dòng điều khoản SERVICE / GROUP;
- số đơn có người hưởng đang chờ «Đã giao».

`trien-khai` lấy điểm Time Travel vì có migration. **HC-5.19 (chưa từng diễn tập khôi phục) đè thẳng lên lần này**: nếu phải lùi thì chỉ còn Time Travel, mà cách này chưa được thử. Khuyến nghị nằm ở `trinh-chu.md`.

## 6. Việc của Kế toán / chủ (song song với thi công)
- Xác nhận các ca vàng ở `phieu-ke-toan.md` (C-1…C-5, SV-HT-02, SV-HT-03). **Thiếu xác nhận thì mã sổ đợt 2 không được nhận** (Hiến chương 5.17; ADR-0079 «Hệ quả»).
- Trước ngày phát hành: cài mức cho mọi đơn đại lý đang chờ, lùi ngày hiệu lực nếu cần, để «Chụp bù» không ra «thiếu mức».

## 7. Điều chưa chắc
- **Hoa hồng khi hoàn tiền / giảm trừ sau «Đã giao»:** ADR-0116 chưa thi công, ADR không nói hoa hồng có giảm theo không. Ngoài đợt 2 vì hoàn sau «Đã giao» còn bị chặn (`HOAN_SAU_GIAO`). Phải quyết trước khi thi công ADR-0116.
- **Ví dụ D-3 của ADR-0080** (điều chỉnh «loại hoa hồng») nay đi qua yêu cầu có người duyệt (ADR-0115). Đợt 2 chỉ mở loại dòng cho đường điều chỉnh; ca D-3 thuộc đợt 3.
- **Lệch tìm thấy ngoài phạm vi (báo chủ một lần):** ADR-0099 (accepted 2026-10-03) đổi ô `payment.receive` của Bán hàng từ `own` sang `ownOrAssigned`. Bản đồ quyền hôm nay vẫn ghi `own`, cả ở mã lẫn bài ghim giá trị ô. Tôi không thấy dòng lệch có chủ ý nào ở `docs/SYSTEM-DESIGN.md` §16. Đặc tả này không đổi ô nào; việc kéo mã về ADR-0099 là một việc nhỏ riêng.
- Cách làm tròn hoa hồng (nửa lên, theo dòng) đã có từ đợt 1. Sổ vàng xác nhận số cuối.
