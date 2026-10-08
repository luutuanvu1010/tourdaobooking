# Bản tóm ADR-0063 D1 — văn phòng sửa số khách sau xác nhận (lượt duyệt 2026-10-08)

> **Hồ sơ có ngày 2026-10-08, vai soạn** (không thi công, không tự duyệt — Hiến pháp N3). Đề xuất gốc giữ nguyên: `docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/ADR-0063-sua-don-sau-xac-nhan.md`. Bản này chỉ tóm phần **D1** và ghi chỗ lệch với mã hôm nay. Mọi `tệp:dòng` đo trên nhánh `claude/van-chuyen-goi-a-c` @ `809918d5` (chứa `main` @ `4d98a205`). Lời chủ 2026-10-08: *"Gửi bản tóm để duyệt"*.

## Cho chủ dự án

Hôm nay, sau khi đơn đã xác nhận, chỉ hướng dẫn viên đang phụ trách đơn và Toàn quyền sửa được số khách; Bán hàng, Kế toán và Quản trị đều bị từ chối, dù hai quyết định bạn đã duyệt trước đây cho họ quyền này. Phần này mở đường cho văn phòng bằng một nút "Sửa số khách dịch vụ" trên trang đơn: máy tự tính lại tiền và mỗi lần sửa để lại một dòng lịch sử. Bạn chỉ duyệt phần này ở lượt này, còn phần "đổi giờ tối đa 2 lần" để lượt sau.

**Ai được sửa.** Kế toán và Quản trị sửa được mọi đơn, Bán hàng sửa được đơn do chính mình lập, Toàn quyền vẫn như hôm nay. Hướng dẫn viên giữ nút riêng ở "Việc của tôi" và vẫn sửa được tới hết ngày đi như cũ. Đối tác và Thực tập không sửa được nên phải nhờ văn phòng. Văn phòng sửa được cả sau ngày đi, cho tới khi đơn đã "Đã giao".

**Sửa gì.** Chỉ sửa số khách theo từng loại (người lớn, trẻ em, người cao tuổi, em bé) của những dịch vụ đã có trong đơn. Việc thêm hay bỏ dịch vụ không nằm trong lượt này. Một quyết định cũ về dịch vụ nhập tay có ghi rằng mọi đường sửa đơn sau xác nhận phải qua bước kiểm "có được thêm dịch vụ nhập tay không"; nút mới không thêm dịch vụ nào nên bước kiểm đó không áp, và câu duyệt ghi rõ điều này.

**Tiền tính thế nào.** Máy chủ tự tính lại theo đơn giá đã chốt lúc lập đơn, còn màn hình không gửi con số tiền nào. Giảm giá của đơn giữ nguyên. Nếu khách bớt người sau khi đã trả trước, sổ tiền hiện "khách đã trả dư, chờ Kế toán hoàn" và không chặn thao tác, đúng lời bạn ngày 29/9. Hoa hồng đại lý tính theo số khách mới, với mức hoa hồng đã chụp lúc xác nhận.

**Dấu vết.** Mỗi lần sửa ghi thêm một dòng không sửa được, gồm số khách trước → sau và tiền trước → sau, nối với một dòng nhật ký cùng mã. Lý do được chọn từ danh sách (Khách thêm người, Khách bớt người, Đổi dịch vụ, Khác) chứ không gõ chữ, vì vậy nhật ký không bao giờ chứa số điện thoại.

**Chuyến xe đã xếp.** Hôm nay, đổi số khách làm chuyến bị "giữ" vì thiếu hoặc thừa ghế, cho tới khi người xếp xe xử lý tay; trong 6 giờ trước giờ chạy thì còn phải nhờ Quản trị. Nếu bạn duyệt cùng lượt việc "Đồng bộ chuyến theo đơn" (tệp 02), thì khi văn phòng bớt khách, máy tự trả ghế thừa trên xe chưa chạy. Khi thêm khách thì tuỳ câu Q-2 của tệp 02. Nếu không duyệt tệp 02 thì việc sửa số khách vẫn chạy được, chỉ là chuyến xe còn bị giữ như hôm nay.

**Không nằm trong lượt này: "đổi giờ tối đa 2 lần mỗi đơn".** Phần này cần thêm một bảng đếm mới và một luật đếm, lại còn hai câu bạn chưa trả lời (thế nào là "đổi giờ"; lần đổi trước ngày phát hành có tính không), nên để lượt sau.

**Điều bạn nên biết trước khi duyệt.** Tôi đã đối chiếu đề xuất ngày 30/9 với mã hôm nay và các quyết định sổ tiền duyệt sau đó; không quyết định nào cấm hay đổi việc này. Có bốn điều cần nói rõ:
1. Nếu đơn có giảm giá lớn và văn phòng bớt khách tới mức tiền dịch vụ nhỏ hơn số giảm giá, tổng tiền của đơn ra số âm, và sổ sẽ báo khoản "dư chờ hoàn" lớn hơn số khách thật đã trả. Tôi không đề nghị chặn, vì khách bớt người là chuyện có thật, mà giảm giá thì không sửa được sau xác nhận, nên chặn tức là không ghi được thực tế. Tôi đề nghị máy hiện cảnh báo rõ để Kế toán xem lại trước khi hoàn, giống cách bạn đã chọn khi hoa hồng tụt dưới số giảm giá. Tôi chưa chạy thử ca này.
2. Bán hàng đang phụ trách một đơn do người khác lập sẽ không sửa được số khách, đúng lời bạn ngày 30/9 là "người lập đơn". Trong khi đó, một câu trong quyết định cũ về quyền lại xếp việc sửa số khách vào phần của "người phụ trách cấp đầy đủ". Tôi giữ theo lời bạn; nếu bạn muốn mở thêm cho người phụ trách thì chỉ cần nói.
3. Sổ lỗ đang mở có một mục nói "bút toán điều chỉnh sổ tiền phải có người duyệt". Tôi đọc mục đó là nói về các sổ công nợ và chi phí chuyến, không nói về việc sửa số khách trên đơn; bằng chứng là hướng dẫn viên vẫn đang sửa số khách một mình mà sổ không ghi đó là lỗ. Nhưng đây là cách đọc của tôi, nên câu duyệt có một câu để chính bạn xác nhận. Nếu bạn đọc khác, việc này phải chờ vá mục đó (hạn 31/10) hoặc bạn gia hạn.
4. Việc này đụng tiền và quyền, nên sau khi thi công phải có người kiểm độc lập, và phải có bộ ca mẫu đúng tới từng đồng để Kế toán xác nhận.

**Câu duyệt gợi ý:** "Duyệt D1 của ADR-0063: Kế toán, Quản trị sửa số khách mọi đơn đã xác nhận, Bán hàng sửa đơn mình lập; máy tính tiền; lý do chọn từ danh sách; tổng tiền âm thì cảnh báo, không chặn; đây không phải đường thêm dịch vụ nhập tay; phần đổi giờ 2 lần để lượt sau. Tôi xác nhận mục sổ 'bút toán điều chỉnh phải có người duyệt' (HC-4.2) không áp cho việc sửa số khách trên đơn."

---

## Phần kỹ thuật (cho người lập kế hoạch và người kiểm)

### A. Nội dung D1 được duyệt (tóm từ đề xuất gốc, không đổi nghĩa)
- Route mới `POST /api/orders/:id/money-edit` (tên đề xuất) ở module `orders`, cổng `office`; thân route hỏi `can(staff, "order.money.edit", { ownerId })` **không truyền `assigned`** (đề xuất D1.1–D1.2).
- Không thêm, không đổi ô quyền: ô `order.money.edit` = SALES `own`, ACCOUNTING `any`, ADMIN `any`, FIELD `assigned`, SA `any`, còn lại `none` (`src/shared/permissions.ts:95`).
- Một luật tiền: dùng lại `planMoneyEdit` (`src/modules/orders/money-adjustment.ts:271`) và `insertMoneyAdjustment` (`src/modules/orders/repository.ts:1214`), Hiến chương 5.4.
- Điều kiện: đơn `confirmed`, chưa "Đã giao"; trigger `order_money_adjustment_delivered_lock_ins` (`migrations/0044_orders_da_giao.sql:73`) là lưới cuối.
- Lý do: mã đóng theo ADR-0023 điều 4 (`docs/adr/ADR-0023-huong-dan-vien-thay-don-cho-nhan-va-sua-don-da-nhan.md:58`), "Khác" không kèm ô chữ; nhật ký ghi nhãn của mã.
- Hành động nhật ký mới `order_money_adjusted` (văn phòng), tách khỏi `order_money_adjusted_by_field`; `insertMoneyAdjustment` nhận tham số hành động.

### B. Đối chiếu đề xuất (đo trên `1db777f4`) với mã @ `809918d5`

| # | Điểm | Đề xuất ghi | Hôm nay | Hệ quả |
|---|---|---|---|---|
| B1 | Route HDV | `dispatch/index.ts:229-249` | `src/modules/dispatch/index.ts:247`; chặn văn phòng ở `:256-257` (`narrowEligible`); "Đã giao" `:258`; qua ngày đi `:259` | chỉ lệch số dòng |
| B2 | Ô quyền | `permissions.ts:88`, `:78` | `order.money.edit` `:95`, `order.trip.edit` `:80`; giá trị không đổi | chỉ lệch số dòng |
| B3 | Hành động viết cứng | `repository.ts:1150` | `src/modules/orders/repository.ts:1232` | chỉ lệch số dòng |
| B4 | `order_money_adjusted` "do ADR-0062 khai trước" | — | **đúng như đề xuất**: ADR-0062 (accepted) `docs/adr/ADR-0062-bao-tin-khi-don-doi-sau-xac-nhan.md:21` khai sẵn hành động này; gói A3 đang thi công phần khai đó (nhánh `a3-tin-don-doi`, `src/shared/audit-actions.ts:40` ở nhánh đó: nhãn "Sửa số khách (văn phòng)", cờ `doiSoKhach`). Trên `809918d5` chưa có (`audit-actions.ts:36` chỉ có `order_money_adjusted_by_field`) | lát D1 **không khai lại**; dùng hành động của A3, thi công sau khi A3 gộp |
| B5 | Lý do mã đóng (ADR-0023 điều 4) | chưa thi công | vẫn chưa: `parseMoneyEditInput` nhận chữ tự do, chặn dãy số dài (`money-adjustment.ts:79-100`); `EDIT_REASON_QUICK` chỉ 3 nhãn (`src/shared/viec-cua-toi.ts:88`) | như đề xuất |
| B6 | Nền Sổ tiền (D2: "lát riêng ngay sau Sổ tiền lượt 1") | Sổ tiền chưa gộp | `0044`, `0045` và `0078`–`0083` đã có trên `main`; `docs/quyen-hoan.json` (mục TNV-G1, TNV-G4) ghi phần `0078`–`0083` "CHƯA lên production" — **chưa kiểm bằng lệnh** | điều kiện "sau khi gộp `main`" đã đạt; điều kiện "không phát hành trước Sổ tiền" vẫn phải giữ lúc triển khai |
| B7 | Khoá tiền đơn đã xác nhận | — | `migrations/0081_khoa_tien_don_xac_nhan.sql:3-4, 7-22` khoá `order_item` và `orders.subtotal/discount/total`, **không** chặn `order_money_adjustment` | đường D1 vẫn hợp lệ |
| B8 | "Dư chờ hoàn" | khuôn NT-S5 | `conLai` (`src/modules/billing/rules.ts:73-83`): đơn chưa huỷ `du = max(0, daThu − phaiThu)`; ADR-0089 `:106`: "Cần chi hoàn" gồm "trả dư của đơn không huỷ" | khớp lời chủ 29/9 "Không chặn, chờ hoàn" (chú thích `rules.ts:62`) |
| B9 | **Tổng âm** | không nói | `effectiveMoney` = `subtotal − discount`, không chặn (`money-adjustment.ts:227-228`); `buildLines` chỉ bắt mỗi dịch vụ ≥ 1 khách (`src/shared/order-lines.ts:93-140`); `conLai` với `phaiThu` âm làm `du` phồng (gồm cả tiền khách chưa trả); giảm giá **không** sửa được sau xác nhận (`migrations/0081_khoa_tien_don_xac_nhan.sql:3-4`) | **chưa chạy thử.** Khuyến nghị **cảnh báo, không chặn** (Hiến chương 5.9 `docs/ARCHITECTURE.md:107` "không chặn thao tác phản ánh thực tế"; khuôn ADR-0079 `:75` "không chặn, cảnh báo"): việc bớt khách là thật, chỉ con số âm là hệ quả của giảm giá không sửa được, nên chặn = không ghi được thực tế. Cảnh báo ở trang đơn và trong màn hoàn của Kế toán. Việc chặn trần giảm giá ≤ tiền dịch vụ (đổi `effectiveMoney`) là luật tiền mới, không thuộc lượt này |
| B10 | Hoa hồng | — | ADR-0077 `:80` (không chụp lại khi đổi số khách), `:83` (`PER_PAX` theo số khách hiện hành); ADR-0079 `:75` (giảm khách làm hoa hồng < giảm giá: không chặn, cảnh báo) | khớp |
| B11 | Khoá kỳ | — | ADR-0080 `:70`: dòng điều chỉnh số khách "không phải sổ", không khoá theo kỳ | khớp |
| B12 | Số migration | D3 dùng `0048` | `0046`–`0049` đã bỏ giữ chỗ (`docs/adr/README.md:127`); lớn nhất hiện `0083` (main và mọi nhánh đã xem) | D1 không cần migration; D3 (lượt sau) lấy số lúc thi công |
| B13 | Người phụ trách Bán hàng | "người lập đơn = Bán hàng lập đơn" | ADR-0014 `:86` liệt kê `order.money.edit` trong "cấp đầy đủ" của người phụ trách SALES; ô SALES là `own` (`permissions.ts:95`); báo cáo ERP C02 ghi Bán hàng phụ trách cũng bị từ chối (đọc mã) | lệch chữ ADR-0014 ↔ ô; giữ `own` theo lời chủ 30/9, nêu ở mục "Điều bạn nên biết" số 2 |
| B14 | Văn phòng sau ngày đi | D1.6: chặn sau "Đã giao" | route HDV chặn sau ngày đi trừ Toàn quyền (`dispatch/index.ts:259`) | văn phòng rộng hơn HDV về thời gian — đã nói với chủ ở mục "Ai được sửa" |
| B15 | ADR-0061 điều 5 | đề xuất đọc lại là "không áp cho route D1" | `docs/adr/ADR-0061-mo-lai-dich-vu-nhap-tay-noi-bo.md:38` nguyên văn "Route sửa sau xác nhận tương lai (C2) **phải** gọi `duocNhapTay`" | cách đọc lại nằm trong câu duyệt ("không phải đường thêm dịch vụ nhập tay") |
| B16 | Hướng dẫn trong Nền tảng | — | `src/shared/huong-dan-ban-hang.ts:146` ghi việc này "đang chờ làm" | sửa chữ khi thi công |

### C. Sổ dừng dây chuyền (`docs/quyen-hoan.json`)
- Không có mục HIGH nào nói về sửa số khách. Mục gần nhất:
  - **TNV-G4** (sổ tiền thiếu ràng buộc, hạn 2026-10-31);
  - **HC-4.2** (bút toán điều chỉnh sổ tiền chưa có người duyệt khác người tạo, hạn 2026-10-31).
- **HC-4.2 — cách đọc hẹp: không xây trên lỗ này. Chủ tự xác nhận trong câu duyệt.**
  - Chữ gốc Hiến chương hệ thống 4.2 (`/Users/tuanbao/Documents/Projects/HIEN-CHUONG-HE-THONG.md:62`, lối tắt về kho luật gốc): "Bút toán do người lập được coi là một sự kiện khi có chứng từ, người duyệt và nhật ký". Câu này **không** ghi "khác người tạo"; chữ "khác người tạo" là của mục sổ HC-4.2.
  - Phạm vi chính mục sổ ghi: "Bút toán điều chỉnh sổ tiền (công nợ, chi phí chuyến)", phần thiếu là ADR-0092 Đ3, Đ4, Đ5a–c. Tờ khai `docs/kernel-18.md:25` gắn nợ này vào hàng "Hình chiếu tiền (sổ)" (`bil_posting`, `bil_debt_line`, `vc_trip_cost_line`).
  - Đường sẵn có: HDV đang phụ trách **đã** sửa số khách một mình qua `POST /api/orders/:id/handler-money-edit` (`src/modules/dispatch/index.ts:247`), ghi cùng bảng `order_money_adjustment`, mà mục sổ không liệt kê đường này là lỗ. D1 chỉ thêm người làm cùng việc.
  - Lập luận **ngược chiều**, phải nói rõ:
    - billing **có** đọc kết quả của bảng này: `tienNhieuDon` gọi `phaiThuNhieuDon` (`src/modules/billing/service.ts:217`), và "phải thu" tính từ dòng điều chỉnh gần nhất (`src/modules/orders/hoan-tat.ts:8-17`). Sửa số khách vì vậy đổi phải thu, tức công nợ của khách;
    - `docs/ARCHITECTURE.md:145` xếp `order_money_adjustment` vào hàng đối chiếu "4.2 / 5.5 Chỉ-thêm, đảo";
    - ADR-0080 `:70` chỉ nói dòng điều chỉnh "không phải sổ" **trong danh sách "Không khoá" kỳ**, không nói gì về người duyệt, nên không đỡ được cách đọc hẹp.
  - Kết luận: cách đọc hẹp đứng được nhờ phạm vi chữ của mục sổ và tiền lệ HDV, không nhờ "billing không đọc". Đây là quyết định của chủ, nên câu duyệt có câu chủ tự xác nhận. Chủ không xác nhận → D1 mang dòng "xây trên lỗ đang hở: HC-4.2" và chờ vá hoặc gia hạn.
- **TNV-G4: không xây trên lỗ này.**
  - Phần mã của TNV-G4 đã có trên `main` (migration `0080`, `0082`; ADR-0092 Đ1–Đ5c), nhưng chưa lên production.
  - Phần còn mở là Đ5d (tin báo người bị đổi số dư), Đ6 (mã giao dịch ngân hàng) và Đ6a (cảnh báo trùng), đều không nằm trên đường D1.
  - D1 làm đường "khách trả dư → chờ hoàn" hay gặp hơn. Đường hoàn chịu trần "hoàn ≤ người trả đang giữ" (ADR-0092, theo mục sổ TNV-G4); đơn huỷ thì thêm luật hoàn hai lớp của ADR-0089.
  - Vì vậy D1 phải **phát hành sau** Sổ tiền (mục B6).

### D. Nối với tệp 02 (Đồng bộ chuyến theo đơn)
- Nếu ADR-0104 Đ2 (tệp 02, số tạm) được duyệt, route D1 là một **điểm gọi** của hàm tiêm đồng bộ: route lấy câu chưa chạy từ hook rồi gộp vào CÙNG lô ghi điều chỉnh (tệp 02 Đ2 mục 1–2). Bài tĩnh "mọi route đổi số người phải gọi hook" phủ route này.
- Nếu Đ2 không được duyệt, chuyến giữ `THIEU_SUAT` hoặc `THUA_SUAT` như hôm nay (`src/shared/dieu-phoi-kiem.ts:424-425`).

### E. Việc lớn, kiểm
- Đụng tiền và quyền nên đây là **việc lớn**: kế hoạch riêng, mỗi task đỏ → xanh, có người kiểm độc lập chỉ-đọc.
- Cần sổ vàng (Hiến chương 5.17) cho các ca: giảm khách sau khi đã thu (ra số dư), tăng khách, dịch vụ nhập tay trong cùng đơn, và tổng âm (có cảnh báo, không chặn).
- Bài tĩnh "một luật tiền" (khuôn NT-R9) và bài quyền như đề xuất mục "Bài kiểm" 1–6.

### F. Chưa kiểm
- Ca tổng âm (B9): chỉ đọc mã, chưa chạy thử.
- Trạng thái production của Sổ tiền: chỉ đọc sổ `quyen-hoan.json`, chưa chạy lệnh chỉ-đọc.
- Chủ chưa xác nhận cách đọc hẹp HC-4.2 (câu cuối của câu duyệt).
- Các mục "Chưa kiểm" của đề xuất gốc vẫn còn nguyên (spike R1, tên dịch vụ có mã danh mục có sửa được không).
