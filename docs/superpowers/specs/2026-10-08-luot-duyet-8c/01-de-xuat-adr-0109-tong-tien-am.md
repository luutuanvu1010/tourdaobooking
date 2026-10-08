# ADR-0109 (đề xuất) — Phải thu của đơn không xuống dưới 0 khi bớt khách làm tổng tiền âm

- **Trạng thái:** **proposed**, vai soạn, 2026-10-08. Chủ chưa duyệt (Hiến pháp N3). **Lượt 8c, tệp 01.**
- **Ngày:** 2026-10-08 (đề xuất).
- **Văn bản trình duyệt:** tệp này; trang ghép `docs/superpowers/specs/2026-10-08-luot-duyet-8c/00-trang-ghep.md`.
- **Số:** 0109 lấy từ dòng "số ADR mới kế tiếp" cuối `docs/adr/README.md` (0105–0107 đang chép từ lượt 8b; 0108 là VietQR ở nhánh `claude/ticket-sales-qr-payment-cf8e18`). `git log --all -S "ADR-0109"` chỉ gặp một câu nhắc trong hồ sơ lượt 8a (`2bd077f2`), không ADR nào dùng số này.
- **Mốc đo mã:** mọi `tệp:dòng` đo trên `luot-duyet-8c` @ `b8927c27` (bằng `claude/van-chuyen-goi-a-c` lúc soạn).
- **Sửa:** ADR-0063 D1.12 (vế "dư lớn hơn số khách đã trả"); ADR-0079 `:43`, `:57` (iv), `:75` (giảm giá bên đặt chịu = giảm giá hiệu lực). Bảng ở mục 5.
- **Xây trên lỗ đang hở:** không (mục 8).
- **Cửa:** hai chiều; không migration.

## Lời chủ dự án
- 2026-09-29: "Không chặn, chờ hoàn" — khách trả dư thành khoản chờ hoàn (chú thích `src/modules/billing/rules.ts:62`; ADR-0063 D1.11).
- 2026-10-08, lượt 8a, chủ chọn "Duyệt (Recommended)" cho câu duyệt có vế "tổng tiền âm thì cảnh báo, không chặn" (ADR-0063 D1.12; chú thích `src/shared/so-khach-van-phong.ts:50-51`).
- Hiến chương 5.9 (`docs/ARCHITECTURE.md:107`, chủ duyệt): khi đối tượng giảm giá trị sau khi đã thu tiền, không chặn thao tác phản ánh thực tế; phần dư thành khoản chờ hoàn.

## Cho chủ dự án

Ngày 8/10 bạn duyệt câu "tổng tiền âm thì cảnh báo, không chặn" cho việc văn phòng bớt khách. Lúc thi công, người làm phát hiện thêm một hệ quả: đơn như vậy bị kẹt luôn. Lấy ví dụ đơn 2 người lớn, mỗi người 500.000, giảm giá 800.000, khách đã trả 200.000. Khi bớt còn 1 người, máy tính "phải thu" thành âm 300.000, nên báo khách trả dư 500.000, nhiều hơn số khách thật đã trả. Kế toán chỉ hoàn được tối đa 200.000, vì máy không cho hoàn quá số đã nhận. Hoàn xong, máy vẫn báo còn dư 300.000, nên nút "Đã giao" bị chặn mãi. Hôm nay muốn gỡ chỉ còn cách tăng số khách trở lại, tức là ghi sai thực tế.

Tôi khuyến nghị đặt luật: phải thu của một đơn không bao giờ dưới 0. Với đơn ví dụ, phải thu thành 0 và khách trả dư đúng 200.000. Kế toán hoàn 200.000 là xong, sau đó đơn lên "Đã giao" được. Giảm giá vẫn lưu nguyên 800.000 như đã thoả thuận, nên nếu sau đó khách thêm người lại thì máy tự tính đúng. Trang đơn vẫn hiện câu cảnh báo, nhưng câu sẽ được viết lại cho đúng sự thật mới. Việc này không cần đổi cơ sở dữ liệu. Thật ra cơ sở dữ liệu hôm nay đã cấm sẵn chuyện "phải thu lúc Đã giao nhỏ hơn 0"; chỉ phần tính toán là chưa theo kịp.

Có ba cách:
1. **Phải thu tối thiểu bằng 0 (khuyến nghị).** Được: đơn gỡ được bằng một lần hoàn; trang đơn, biên nhận và doanh thu tuần không còn hiện số âm. Mất: phần giảm giá vượt tiền dịch vụ (300.000 ở ví dụ) coi như không dùng tới.
2. **Giảm giá tự co lại theo số khách** (khách còn một nửa thì giảm 400.000). Được: khách vẫn trả một phần (100.000). Mất: tiền của mọi đơn có giảm giá từng được sửa số khách đều đổi, kể cả đơn cũ. Cách này trái câu "giảm giá giữ nguyên" bạn vừa duyệt, và cần thêm một luật làm tròn.
3. **Giữ như hôm nay.** Đơn kẹt, không bao giờ lên "Đã giao" hay "Hoàn thành". Kế toán cũng không có đường tay nào để gỡ.

Nếu chọn cách 1, chỉ những đơn đang âm mới đổi số; đơn bình thường không đổi đồng nào. Đơn đã "Đã giao" không bị ảnh hưởng, vì đơn âm chưa từng lên "Đã giao" được. Trên biên nhận gửi khách, tôi giả định dòng "Giảm giá" hiện phần thực dùng (500.000 ở ví dụ) để ba dòng tạm tính, giảm giá, tổng cộng khớp nhau. Trang đơn nội bộ vẫn ghi giảm giá gốc kèm cảnh báo. Đây là chữ trên màn hình, bạn muốn khác thì đổi được.

Có một hệ quả cho đơn của đại lý mà bạn cần biết trước khi duyệt. Phần sổ hoa hồng và giảm giá của đại lý đã được duyệt ngày 1/10 nhưng chưa làm. Quyết định đó ghi rằng đại lý chịu đúng số giảm giá đã cho khách, kể cả khi bớt khách. Theo cách 1, với đơn tổng âm, đại lý chỉ chịu phần giảm giá thực dùng: ở ví dụ là 500.000 chứ không phải 800.000, tức đại lý nợ công ty ít hơn 300.000 so với chữ cũ. Lý do là nếu giữ 800.000 thì công ty thu của đại lý nhiều hơn cả giá dịch vụ, và sổ không cân. Hôm nay chưa có số nào đổi, vì phần đó chưa làm.

Việc này đụng tiền, nên sau khi thi công phải có người kiểm độc lập, và ca mẫu SV-SK-04 phải được Kế toán xác nhận lại theo đáp án mới. Đây cũng là một trong các điều đang chặn phát hành phần sửa số khách (A2).

**Câu duyệt gợi ý:** "Duyệt ADR-0109: phải thu của đơn không dưới 0, tính ở một hàm cho mọi màn; giảm giá giữ số đã ghi; trang đơn cảnh báo khi giảm giá lớn hơn tiền dịch vụ; đơn đại lý chịu phần giảm giá thực dùng; ca SV-SK-04 đổi đáp án theo."

---

## Phần kỹ thuật (cho người lập kế hoạch và người kiểm)

### 1. Hiện trạng mã
- **Phải thu công bố:** `effectiveMoney` = `subtotal − discount`, không kẹp (`src/modules/orders/money-adjustment.ts:227-229`). Chi tiết đơn đi qua `applyAdjustmentToOrder` (`:219`). Danh sách và doanh thu tuần đi qua `computeEffectiveMoney` (`src/modules/orders/repository.ts:1179-1197`; `toSummaryDtos` `:410-417`; cộng doanh thu tuần `:725-735`, cộng cả số âm).
- **Đường tính thứ hai:** `phaiThuCua` (`src/modules/orders/hoan-tat.ts:9-18`) tự trừ `effectiveSubtotal(...) - r.discount` ở `:15`, không gọi `effectiveMoney`. Hôm nay hai đường cho cùng số; kẹp ở một bên thì trang đơn và sổ lệch nhau (Hiến chương 5.4, `docs/ARCHITECTURE.md:97`). Đã tìm mọi chỗ trừ `discount` trong `src`, `web`, `scripts` (trừ bài kiểm): ngoài hai chỗ này chỉ còn phép tính lúc lập / lưu nháp (`src/modules/orders/rules.ts:176`, `src/shared/service-form.ts:411`), nơi giảm giá đã bị chặn ≤ tạm tính, và một kiểm dữ liệu đã lưu (`src/modules/orders/nguoi-dat-gop-repo.ts:10`). Hàng rào 5.4 hiện có (`src/buildlines-guard.test.ts`, `docs/SO-HANG-RAO.md:28`) chỉ canh `buildLines`, nên không bắt được chỗ `hoan-tat.ts:15`.
- **Còn lại / dư:** `conLai` (`src/modules/billing/rules.ts:73-83`) tính `conLai = max(0, phaiThu − daThu)` và `du = max(0, daThu − phaiThu)`. Phải thu âm làm `du` lớn hơn `daThu`.
- **Hoàn tối đa:** `ghiHoanKhach` chặn `so.value > daThu`, câu "Không hoàn quá số khách đã trả" (`src/modules/billing/service.ts:456-457`). Lưới CSDL: trigger `refund_exceeds_paid` (`migrations/0045_billing_so_cong_no.sql:216`).
- **Điều kiện "Đã giao":** `lyDoChuaGiaoDuoc` trả `overpaid` khi `du > 0` (`rules.ts:467`). `daGiao` (`service.ts:252`) ghi phiếu DELIVERED với `dueSnapshot: info.phaiThu` (`:278`), số này lấy từ `thongTinGiaoDon` → `phaiThuCua`, không qua `conLai`. CSDL có trigger `bil_posting_delivered_paid` đòi đã thu = `due_snapshot` (`0045:232-241`), và cột `due_snapshot` có `CHECK (due_snapshot IS NULL OR due_snapshot >= 0)` (`0045:103`). "Hoàn thành" kiểm đã thu = `due_snapshot` (`migrations/0083_bil_thay_lan_thu.sql:27-51`).
- **Nguồn của tổng âm:** lúc lập đơn đã chặn `discount > subtotal` (`src/modules/orders/rules.ts:175`); sau xác nhận cột tiền của đơn bị khoá (`migrations/0081_khoa_tien_don_xac_nhan.sql:20-22`). Vì vậy tổng âm chỉ sinh ra từ dòng điều chỉnh số khách, ở cả route văn phòng (ADR-0063 D1) lẫn route HDV `handler-money-edit` (`src/modules/dispatch/index.ts:247`). Kiểm toán 24/9 đã chứng minh ca này trên route HDV (DK-T2-02, `docs/AUDIT-2026-09-24-DIEM-KHUAT.md:177-190`); chưa thấy mục đó được đóng ở đâu.
- **Cảnh báo:** `canhBaoTongAm(total)` = câu `CAU_TONG_AM` khi `total < 0` (`src/shared/so-khach-van-phong.ts:49-55`). Câu này hiện ở phản hồi route (`src/modules/orders/index.ts:1087`, `:1096`), ở khối Thanh toán (`web/order.ts:456-457`) và ở dải báo sau khi lưu (`:1082`). Nút "Ghi hoàn cho khách" nằm ở khối Kế toán cùng trang (`web/order.ts:787-797`) và không lặp lại câu. ADR-0063 D1.12 hứa cảnh báo "trong màn hoàn của Kế toán"; tôi coi điều đó đã thoả vì hai khối ở cùng trang, nhưng chưa xem ảnh.
- **Bài khoá hiện trạng:** TC8 (`src/modules/orders/so-khach-van-phong-route.test.ts:311-328`, ghim dư 500.000) và "TC8 — HIỆN TRẠNG CHỜ CHỦ QUYẾT" (`:330-348`, ghim Đã giao trả 409).
- **Phương án (c) không có đường tay.** Hoàn bị trần ở số đã thu; chú thích bài `:331-333` ghi đường thoát duy nhất là tăng số khách lại cho tổng ≥ 0.

### 2. Quyết định đề xuất (phương án a)
1. **Phải thu hiện hành = `max(0, tạm tính hiện hành − giảm giá)`**, kẹp trong **một** hàm (`effectiveMoney`). `phaiThuCua` (`hoan-tat.ts:15`) đổi sang gọi hàm đó. Mọi bề mặt dùng số này: trang đơn, danh sách, doanh thu tuần, `conLai`, phiếu Đã giao (`due_snapshot`), biên nhận. Đây là biến thể "kẹp ở nguồn". Biến thể "chỉ kẹp phía sổ, trang đơn vẫn hiện số âm" bị loại vì sinh hai con số cho cùng một khái niệm (5.4).
2. **Giảm giá đã lưu không đổi** (`orders.discount`, khoá bởi `0081`). **Giảm giá hiệu lực** = `min(giảm giá, tạm tính hiện hành)` là số dẫn xuất, do cùng hàm trả về.
3. **Cảnh báo** đổi điều kiện từ `total < 0` sang `giảm giá > tạm tính hiện hành`, vì sau khi kẹp thì `total` không còn âm và câu cũ sẽ im lặng biến mất. Câu gợi ý: "Giảm giá (X) lớn hơn tiền dịch vụ sau khi bớt khách (Y) — phải thu tính bằng 0, phần giảm giá vượt (Z) không dùng tới. Khách đã trả bao nhiêu thì hoàn bấy nhiêu."
4. **Biên nhận gửi khách** (giả định bề mặt, đổi được): dòng "Giảm giá" (`src/shared/order-confirmation.ts:214-216`) hiện giảm giá hiệu lực, để tạm tính − giảm giá = tổng cộng.
5. **Đơn huỷ không đổi:** `conLai` đã trả 0/0 cho đơn huỷ (`rules.ts:76-80`).
6. **Không chặn thao tác** — giữ lời chủ 8/10 và phần "không chặn" của ADR-0063 D1.12.

### 3. So ba phương án

| | (a) kẹp ở 0 | (b) giảm giá co theo tỷ lệ | (c) giữ |
|---|---|---|---|
| SV-SK-04 sau khi sửa | phải thu 0; dư 200.000 | phải thu 100.000; dư 100.000 | phải thu −300.000; dư 500.000 |
| Lên "Đã giao" | sau khi hoàn 200.000 | sau khi hoàn 100.000 | không bao giờ |
| Đổi số đơn khác | chỉ đơn đang âm | mọi đơn có giảm giá đã sửa số khách. SV-SK-02: phải thu 2.000.000 → khoảng 1.938.462, cần luật làm tròn | không |
| Đơn đã "Đã giao" | không đổi (đơn âm chưa từng giao được) | đơn có giảm giá và từng sửa số khách: khối Thanh toán tính lại phải thu (`src/modules/billing/service.ts:170`, `:188`), nên lệch với `due_snapshot` đã chốt lúc giao, và đơn đã chốt hiện "Còn lại" hoặc "Khách trả dư" sai (ADR-0088 `:25`: phải thu của đơn đã giao = `due_snapshot`) | không đổi |
| Trái câu ADR đã duyệt | ADR-0063 D1.12 (vế "dư lớn hơn số đã trả"); ADR-0079 `:43`, `:75` | ADR-0063 D1.4 "giảm giá giữ nguyên" (`:32`) và D1.12; ADR-0079 `:43`, `:75` | không |
| Migration | không | không nếu tính lúc đọc; có nếu lưu giảm giá mới (cột tiền khoá `0081:20-22`; bảng điều chỉnh không có cột giảm giá `0021:5-13`) | không |

Biến thể (b) "giảm giá tối đa bằng tạm tính mới" ra **đúng số tiền như (a)**, vì `tạm tính − min(giảm giá, tạm tính) = max(0, tạm tính − giảm giá)`. Hai cách chỉ khác chữ trên biên nhận, đã gộp vào mục 2.4.

### 4. Số trên báo cáo và Sổ tiền đổi gì (phương án a)
- Trang chủ "Doanh thu tuần" (`repository.ts:725-735`): đơn tổng âm cộng 0 thay cho số âm.
- Danh sách đơn, Hôm nay (`repository.ts:417`): "Tổng cộng" 0.
- Khối Thanh toán (`GET /api/orders/:id/payments`): phải thu 0, dư bằng số đã thu.
- Ô "Còn thiếu tiền" (`src/modules/billing/index.ts:256`): không đổi, vì còn lại vốn đã là 0.
- Phiếu "Đã giao": `due_snapshot` = 0 (hôm nay không ghi được). I1 của ADR-0088 vẫn đúng.
- Sổ công nợ: không sinh dòng mới, ngoài dòng hoàn khách khi người trả không phải công ty (như mọi lần hoàn).
- **ADR-0079** (chưa thi công; `gross_snapshot`, `GIAM_GIA_BEN_DAT` chưa có trong mã): `:43` ghi dòng `GIAM_GIA_BEN_DAT` "đúng số giảm giá cấp đơn (`orders.discount`)", `:75` ghi khi giảm khách sau xác nhận thì dòng đó "vẫn ghi đúng số giảm giá", còn `:57` (iv) ghi "= `gross_snapshot` − `due_snapshot` đúng từng đồng". Trên đơn tổng âm có người hưởng, `:43`/`:75` và (iv) cho hai số khác nhau. ADR-0109 chốt theo (iv): đại lý chịu **giảm giá hiệu lực**, tức tối đa phần thực dùng. Giữ số đầy đủ thì sổ không cân: công ty thu của đại lý nhiều hơn giá dịch vụ, và luật cân đối R-BIL-2 (`ADR-0079:96`) sai. Ví dụ SV-SK-04 nếu là đơn đại lý: đại lý nợ 500.000 thay vì 800.000.
- **Không đổi số** (đã đọc): hoa hồng `RATE` tính trên thành tiền dòng **trước** giảm giá cấp đơn, `PER_PAX` theo số khách (ADR-0077 `:82-83`); giá vốn tính trước giảm giá (ADR-0078 `:58`); dòng điều chỉnh số khách không khoá theo kỳ (ADR-0080 `:70`). Dấu "đã nhập phần mềm kế toán" (ADR-0060, `src/modules/billing/nhap-ke-toan.ts`) không xuất số tiền nào.
- ADR-0081 (đại lý xem sổ, ô `giamGiaMinhChiu`): theo cùng số hiệu lực. Chưa kiểm phần này đã thi công tới đâu.
- ADR-0089 `:106` ("Cần chi hoàn" gồm trả dư của đơn không huỷ): mã hôm nay chỉ liệt khoản duyệt (`src/modules/billing/coc-repo.ts:109`), chưa thấy phần trả dư. Khi làm phần đó, (a) bảo đảm số trả dư không vượt tiền thật.

### 5. Câu ADR bị thay (nguyên văn → mới; không sửa thân ADR cũ)

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0063 D1.12 (`docs/adr/ADR-0063-sua-don-sau-xac-nhan.md:43`) | "… thì tổng ra số âm (`effectiveMoney` = `subtotal − discount`, …), và sổ báo "dư chờ hoàn" lớn hơn số khách thật đã trả." | "… thì phải thu bằng 0 (ADR-0109); dư chờ hoàn bằng đúng số khách đã trả. Không chặn; cảnh báo khi giảm giá lớn hơn tạm tính hiện hành." |
| ADR-0079 `:43` | "… đúng số giảm giá cấp đơn (`orders.discount`)" | "… đúng giảm giá hiệu lực = min(`orders.discount`, tạm tính hiện hành) (ADR-0109), tức `gross_snapshot − due_snapshot` như (iv)" |
| ADR-0079 `:57` (iv) | "(giảm giá cấp đơn là phần chênh duy nhất giữa hai số)" | "(giảm giá **hiệu lực** là phần chênh duy nhất — ADR-0109)" |
| ADR-0079 `:75` | "Dòng `GIAM_GIA_BEN_DAT` vẫn ghi đúng số giảm giá." | "Dòng `GIAM_GIA_BEN_DAT` ghi đúng giảm giá hiệu lực = min(giảm giá, tạm tính hiện hành) (ADR-0109); bằng số giảm giá khi tạm tính còn ≥ giảm giá." |

Không đổi: ADR-0063 D1.4 "giảm giá của đơn giữ nguyên" (`:32`) — đúng nguyên văn với (a).

### 6. Chữ, bài và sổ vàng phải sửa theo
- **V-3, V-5 của phiếu kiểm A2: chưa tìm thấy chữ.** Sổ chỉ ghi "V-3, V-5 sửa khi chủ quyết tổng âm" (`docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md:68`). Phiếu kiểm không có trong kho; `git log --all -S "V-5"` chỉ gặp commit ghi sổ `d70c7fde`. Điều phối đối chiếu hai mục đó với danh sách dưới.
- Chỗ trở thành sai nếu chọn (a):
  - `CAU_TONG_AM`, `canhBaoTongAm` (`src/shared/so-khach-van-phong.ts:49-55`) và bài `src/shared/so-khach-van-phong.test.ts:77-79`;
  - kiểu phản hồi `MoneyEditResponse` (`src/shared/contracts.ts:500-503`), route `src/modules/orders/index.ts:1087`, `:1096`, giao diện `web/order.ts:456-457`, `:1082`;
  - bài TC8 (`so-khach-van-phong-route.test.ts:311-328`) và TC8 HIỆN TRẠNG (`:330-348`), đảo thành "hoàn 200.000 rồi Đã giao trả 200";
  - sổ vàng `golden/sua-so-khach-van-phong.json`: `quy_uoc.phai_thu` (`:8`, đang ghi "có thể ÂM"), `quy_uoc.canh_bao_tong_am` (`:11`), ca SV-SK-04 (`:80-101`: `mo_ta`, `ghi_chu_cho_nguoi_xac_nhan`, `dap_an.sau`); bài `src/so-vang-sua-so-khach.test.ts:147`;
  - `docs/CHANGE-GUIDE.md:1075` (bẫy 64, đang cấm kẹp khi chưa có chủ duyệt);
  - `docs/SYSTEM-DESIGN.md:680` (thêm "phải thu ≥ 0");
  - kịch bản Chrome `docs/evidence/2026-10-08-a2-so-khach/kich-ban/sua-so-khach-smoke.mjs:110-127` (đang khoá "Tổng cộng −650.000").
- **SV-SK-04, đáp án mới theo (a):** `sau` = { tam_tinh 500.000, phai_thu 0, con_lai 0, du 200.000 }; `canh_bao_tong_am` true (giảm giá 800.000 > tạm tính 500.000); `truoc` giữ nguyên. Gợi ý thêm ca SV-SK-08: hoàn 200.000 → "Đã giao" được, `due_snapshot` 0. Theo (b): `sau` = {500.000, 100.000, 0, 100.000}, không cảnh báo, và SV-SK-02 đổi. Theo (c): giữ đáp án; ca không xác nhận được, đúng như ghi chú hiện có.

### 7. Cửa và migration
- **Hai chiều:** luật nằm ở mã, không ghi dữ liệu mới; đổi lại là sửa một hàm. **Không migration.**
- **Phát hành:** cùng A2 (đang chặn phát hành chờ câu này), sau Sổ tiền.

### Bài kiểm / hàng rào (mỗi rào: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày)
- **Việc lớn (tiền):** kế hoạch, mỗi task đỏ → xanh, người kiểm độc lập chỉ-đọc.
- **Nới rộng hàng rào 5.4:** bài tĩnh mới "một hàm phải thu" — ngoài `effectiveMoney` và hai chỗ lập / lưu nháp đã liệt kê ở mục 1, mã chạy thật không chỗ nào trừ `discount`. Quan sát chặn thật: khôi phục cố ý `- r.discount` ở `hoan-tat.ts:15` → đỏ → hoàn nguyên → xanh. Thêm một dòng sổ hàng rào cạnh dòng `buildlines-guard`.
- Bài hành vi: SV-SK-04 mới; "hoàn 200.000 rồi Đã giao trả 200, `due_snapshot` 0"; đơn tổng âm vẫn có câu cảnh báo (điều kiện mới); đơn huỷ không đổi số cọc; doanh thu tuần cộng 0 cho đơn âm.

### 8. Sổ dừng dây chuyền (`docs/quyen-hoan.json`)
- Không xây trên lỗ đang hở.
- TNV-G1 trích đúng `hoan-tat.ts:9-18`. (a) sửa hàm này, nhưng đơn huỷ đi nhánh huỷ của `conLai` (0/0) nên không đổi gì cho đơn huỷ.
- TNV-G4: (a) làm "dư ≤ đã thu" luôn đúng, cùng hướng với "hoàn ≤ người trả đang giữ". Phần còn mở (Đ5d, Đ6, Đ6a) không nằm trên đường này.
- HC-4.2: (a) không thêm bút toán điều chỉnh nào.

### 9. Chưa kiểm
- Production có đơn nào đang tổng âm không (route HDV có từ trước). Muốn biết phải chạy một bước đọc dùng chính hàm tính tiền, không viết lại bằng SQL.
- Chưa chạy thử (a) trên mã.
- ADR-0081 đã thi công tới đâu.
- Câu cảnh báo và nút hoàn đứng cạnh nhau thế nào trên màn hình (chưa xem ảnh).
