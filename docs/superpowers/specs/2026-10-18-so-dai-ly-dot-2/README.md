# Đặc tả — Sổ đại lý đợt 2: đơn có người hưởng hoa hồng đi tới «Đã giao – đã thu đủ»

- **Trạng thái:** **đã duyệt** — chủ dự án, chat 2026-10-18: *«Tôi duyệt cả ba điều theo khuyến nghị: đặc tả + trang ghép, ADR-0130, cho xây đợt 2 trên năm lỗ đang hở, sửa hàng rào giữ hộ theo khuyến nghị; chỉ phát hành sau khi đã diễn tập khôi phục dữ liệu.»* Bản được duyệt là bản 2.1 (gồm P10). ADR-0130 trong câu duyệt là số tạm, ghi chính thức thành ADR-0132. **Điều kiện phát hành:** chỉ sau khi đã diễn tập khôi phục dữ liệu (HC-5.19). Soạn 2026-10-18 bởi phiên lập kế hoạch; chưa ai thi công. Bản 2: sửa theo báo cáo người kiểm độc lập vòng 1 (kết luận «chưa đủ», ba mục Chặn C1–C3, mười một mục Quan trọng); thay đổi so với bản 1 ghi ở cuối tệp.
- **Nguồn đã duyệt (áp dụng, không hỏi lại):** ADR-0078 phần B2 (điều 7, 9, 10) và điều 5 (dòng nhập tay), ADR-0079 (toàn bộ), ADR-0061 A-14, lời chủ C1–C13 = A (`docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`). Các ADR ra sau đã sửa câu của chúng: ADR-0088, 0092, 0109, 0115, 0117, 0120. **Mới:** ADR-0132 (**accepted** 2026-10-18, `docs/adr/ADR-0132-khach-tra-ben-kia-cho-ke-toan-xac-nhan.md`; bản đề xuất số tạm 0130 ở `de-xuat-adr-khach-tra-ben-kia.md`) thay ADR-0078 điều 8 gạch 2 theo lời chủ 18/10.
- **Chia đợt (lời chủ 2026-10-08, không hỏi lại):** đợt 2 = ADR-0078 B2 + ADR-0079 (+ đơn cũ, trần giảm giá). Đợt 3 = ADR-0080 D2 + ADR-0081, khung ở `docs/superpowers/plans/2026-10-18-so-dai-ly-dot-3-khung.md`.
- **Xây trên lỗ đang hở:** TNV-G1, TNV-G3, TNV-G4, HC-4.2, HC-5.19 (`docs/quyen-hoan.json`). Đợt 2 **chạm** các vùng đó:
  - hàm đọc lần thu `docLanThu` dùng chung với lệnh «Thay lần thu» (`billing/thay-lan-thu.ts`, TNV-G3);
  - loại dòng của đường điều chỉnh có người duyệt (TNV-G4, HC-4.2);
  - dấu đối chiếu chuyển khoản và view cọc đơn huỷ (TNV-G1, TNV-G4);
  - một lần ghi một chiều lên dữ liệu thật mà đường lùi duy nhất là điểm khôi phục chưa từng diễn tập (HC-5.19).

  Đợt 2 không nới luật nào của các lỗ đó, **trừ một chỗ phải chủ duyệt rõ** (P10): hàng rào «một dòng giữ hộ chỉ tất toán một lần» của TNV-G4 chỉ cộng lại đúng ba loại dòng nó vốn canh, để dòng hoa hồng / giá vốn không làm nó chặn nhầm. Trên mọi dữ liệu hôm nay nó chạy y hệt. Mọi hàng rào cũ khác giữ nguyên và có bài kiểm lại. Đặc tả này không được duyệt nếu chủ chưa ghi lời cho phép **nêu rõ đợt 2**, có lý do (`trinh-chu.md`, quyết định 3). Các dòng cho phép đang có ở sổ hoãn chỉ viết cho đặc tả QR ngày 8/10, không áp cho đợt này.
- **Bằng chứng đo mã:** hai lượt đo chỉ-đọc ngày 2026-10-18 trên `main` = `cc003e02`, cộng báo cáo người kiểm vòng 1. Tên tệp / hàm ở đây là tên **hôm nay**; số dòng ADR trích (đo 1/10) đã cũ.

## 1. Mục tiêu và không mục tiêu

**Mục tiêu.** Một đơn có bên đặt là đại lý (người hưởng hoa hồng — HDV độc lập, công ty lữ hành, lễ tân, taxi, cộng tác viên, loại đối tác tự thêm) đi được trọn đường:
1. Xác nhận (đã chụp mức từ đợt 1).
2. Ghi tiền khách trả, kể cả khách trả cho đại lý / tại quầy nhà cung cấp.
3. **«Đã giao – đã thu đủ»** → sổ ghi ngay ai nợ ai: hoa hồng, giảm giá bên đặt chịu, giá vốn nhà cung cấp.
4. «Hoàn thành» từng đơn bằng nút nộp / trả từng đơn đã có.

**Không mục tiêu (đợt 3 hoặc việc khác):** quyết toán gộp nhiều đơn một phiếu, bảng kê tháng (ADR-0080 D2); đại lý tự xem sổ (ADR-0081); hoàn tiền / giảm trừ sau «Đã giao» (ADR-0116, còn bị chặn), cùng câu «hoa hồng có giảm theo không» (§7); nợ nhà xe (C7 = A); đổi tên nhãn «Hoa hồng / Giá đại lý» (chủ chưa chọn tên).

**Phản mục tiêu** (làm thì coi như hỏng dù chạy được):
- Đơn khách lẻ bị giữ thêm, **ngoài** trường hợp đã duyệt ở ADR-0078 điều 5 / A-14 (dòng nhập tay, xem P6).
- Số hoa hồng tự lấy 0 khi thiếu mức.
- Đối tác thấy tên người thu hay tiền người khác đang giữ; người không có ô xem điều khoản cung ứng suy ra được giá vốn.
- Có một đường tính tiền thứ hai ngoài hàm duy nhất.

## 2. Các phần việc

Mỗi phần nêu: quyết định gốc → hiện trạng → việc phải làm. Tên tệp đầy đủ ở kế hoạch.

### P1. Mở «Đã giao» cho đơn có người hưởng (ADR-0079 điều 1, 5)
- **Hôm nay:**
  - Đơn có người hưởng bị giữ bằng lý do `booker_partner` trong `lyDoChuaGiaoDuoc` (`billing/rules.ts`).
  - Lớp SQL `CO_NGUOI_HUONG` ở `orders/hoan-tat-repo.ts` (bản chụp hiện hành mang người hưởng, cộng vế dự phòng «bên đặt đang mang vai nhóm bên ngoài») nằm trong `GIAO_STATE` và `DAT_GIAO_DIEU_KIEN`.
- **Làm:**
  - Bỏ `booker_partner`.
  - Thêm `terms_missing` (Kế toán), `booker_not_beneficiary` (Văn phòng / Kế toán), `terms_exceed_price` (Kế toán), đặt sau «chưa tới ngày đi», trước «đang đối chiếu».
  - Lớp 1 (câu ghi của `orders`): mọi dòng dịch vụ có bản chụp hiện hành và không bản nào `MISSING` (đúng chữ ADR-0079 điều 5).
  - Lớp 2: trigger mới trên phiếu `DELIVERED` của `billing` đọc view công bố của `orders`.
- **Lệch cần biết:** view `v_ord_terms_missing` hôm nay không liệt kê dòng **chưa có bản chụp nào**, nên cần thêm view «chưa chụp».

### P2. Dòng thương mại ở phiếu «Đã giao» (ADR-0079 điều 2–4; C1 = A; ADR-0109)
- **Hôm nay:**
  - `bil_debt_kind` chỉ có `HELD`, `SETTLEMENT`, `REFUND`.
  - `sinhPhieuDaGiao()` trả rỗng.
  - Câu ghi dòng gán cứng `order_service_id = NULL`.
  - Nguồn số đã có: hàm công bố `phanThuongMaiCuaDon` của `orders` (thành tiền hiện hành, đã áp điều chỉnh số khách) cùng `src/shared/hoa-hong-dong.ts`.
- **Làm:** ba loại dòng mới.
  - `HOA_HONG` (Tour Đảo → người hưởng, mỗi dòng dịch vụ có hoa hồng > 0).
  - `GIAM_GIA_BEN_DAT` (người hưởng → Tour Đảo, số = **giảm giá hiệu lực** = tổng thành tiền trước giảm − phải thu đã chụp; đúng nghĩa ADR-0109 mà không tính `min()` lần hai).
  - `GIA_VON` (Tour Đảo → nhà cung cấp, mỗi dòng làm đại lý).
- **Ràng buộc kiến trúc:** `phanThuongMaiCuaDon` chỉ được gọi trong thân route, sau `can(` (hàng rào `src/orders-cong-bo.test.ts`). Vì vậy route «Đã giao» (và route ghi lần thu, cần phần chưa thu của nhà cung cấp) gọi nó rồi **truyền dữ liệu xuống** `service.ts` của `billing`. Kiểu dữ liệu mới của `billing` không được đặt ở chỗ mà `orders` phải import (`orders` không import `billing`).
- **Không đổi:** «thu hộ» (ADR-0079 điều 3). Ai cầm tiền khách thì có dòng giữ hộ nợ Tour Đảo.

### P3. Lưới CSDL cho số thương mại (ADR-0079 điều 6; C10 = A, lệch có tên L-C1)
- **Làm:**
  - Cột `gross_snapshot` cho phiếu `DELIVERED` mới. Chạy thử trước cách khai `CHECK`; không được thì dùng trigger `BEFORE INSERT`.
  - Trigger (i)–(iv) trên `bil_debt_line` đúng phạm vi ADR: miễn dòng đảo, phiếu điều chỉnh, phiếu `DELIVERED` cũ.
  - Route «Đã giao» kiểm trước bằng hàm duy nhất. Tổng hoa hồng + giá vốn vượt giá bán, hoặc một dòng vượt thành tiền của chính dòng đó, thì giữ lại với lý do `terms_exceed_price` bằng lời thường. Việc này giải nợ `BL-SDL-GIA-DAI-LY-AM` ở bước «Đã giao».
- **Sống chung với trigger đang có:** `reversal_match`, `trip_not_yet`, `settlement_no_flip`, `held_once`, `held_no_single_reversal`, `company_received_txn`, `adjustment_match`, `bil_posting_order_required` (phải nhận loại phiếu mới). Mỗi trigger mới có ca chứng tỏ không chặn nhầm đường đảo / điều chỉnh.

### P4. Người thu là bên đặt / nhà cung cấp; khoản «khách trả bên kia» (ADR-0078 điều 7, 9; ADR-0132)
- **Hôm nay:**
  - `bil_collector_role` có `BOOKER` (bật), `SUPPLIER` (tắt). Nhưng cổng thật `docLanThu` (`billing/service.ts`) chỉ cho ra `COMPANY` / `STAFF`; Đối tác ghi «tôi» bị lưu thành `STAFF`.
  - `collected_for_party_id` luôn là công ty chủ.
  - Mọi chỗ «đang đối chiếu» chỉ nhận người thu Công ty:
    - câu `PENDING_COMPANY` (`billing/repository.ts`, nguồn danh sách và bộ đếm nhắc);
    - `khoanMoiDoiChieu`, `canDoiChieu` (`billing/rules.ts`);
    - «Công ty đã nhận»;
    - nhánh khoản cũ của `PENDING_COMPANY` không kiểm số dư ròng như `khoanChoXacNhan`, nên danh sách chờ và màn đơn có thể lệch nhau.
    - `v_bil_coc_don` và trigger `bil_payment_receipt_coc_reversal` (migration 0099).
- **Làm:**
  - **Đối tác** ghi «tôi»: nếu hồ sơ của họ là **bên đặt của chính đơn** và đơn có người hưởng ⇒ người thu `BOOKER`, nợ ngay. Còn lại giữ như hôm nay.
  - **Kế toán / Toàn quyền** ghi thẳng `BOOKER` / `SUPPLIER` ⇒ nợ ngay. Chọn một hồ sơ: là bên đặt **của đơn có người hưởng** ⇒ `BOOKER`; là nhà cung cấp của một dòng trên đơn ⇒ `SUPPLIER`, số ≤ phần chưa thu của dòng đó; còn lại ⇒ như hôm nay (`STAFF` / `COMPANY`). Đơn khách lẻ: chọn hồ sơ khách **không** thành `BOOKER`.
  - **Người khác có `payment.receive`** khai ⇒ dấu `DECLARED`, không nợ, đơn chờ Kế toán (ADR-0132). Kế toán bấm «Bên kia đã nhận» (ô `ledger.write`) ⇒ dấu `CONFIRMED` + phiếu một dòng giữ hộ, trong một lô.
  - **Mọi chỗ «đang đối chiếu» kể trên** nhận thêm hai vai mới: danh sách, bộ đếm, nhắc quá 3 ngày, view cọc, trigger cọc. Lần thu `BOOKER` / `SUPPLIER` đã `CONFIRMED`, hoặc do Đối tác / Kế toán ghi thẳng (nợ ngay), **không** là đang đối chiếu. Nhánh khoản cũ của `PENDING_COMPANY` kiểm số dư như `khoanChoXacNhan`. Thêm bài đối chiếu hai nơi (mã ↔ SQL) có các mẫu đó.
  - **Bật `SUPPLIER`**; số của nó ≤ phần thành tiền chưa thu của các dòng thuộc nhà cung cấp đó.
  - **«Thu cho ai»:** mặc định Tour Đảo. Người thu `SUPPLIER` ⇒ luôn là nhà cung cấp đó. Người ghi chọn được nhà cung cấp của một dòng trên đơn khi khách trả trước phần đó, bằng ô chọn trên form lần thu, chỉ hiện khi đơn có dòng làm đại lý. Đổi `R-BIL-S9`, thêm `R-BIL-12` theo ADR-0078.
  - **Trigger mã giao dịch ngân hàng (0099)** chỉ áp cho người thu Công ty.
  - **Lần thu kèm «Đã giao»** (một bước) **không** nhận hai lựa chọn mới (400): lời khai cần Kế toán xác nhận trước.
  - **Câu giữ «đang đối chiếu»** nói đúng khoản đang chờ («khách trả cho <đại lý>» / «tại quầy <nhà cung cấp>»). Với Đối tác, câu không nêu tên nhà cung cấp hay người khai.
  - **«Thay lần thu»** (chỉ Kế toán / Toàn quyền) đọc lần thu mới bằng cùng `docLanThu`, nên route của nó cũng nhận phần thương mại; lựa chọn `BOOKER` / `SUPPLIER` ở đây ghi thẳng, không sinh lời khai.

### P5. Biên nhận chia phần theo người bán (ADR-0078 điều 10)
`ReceiptDto` thêm `phan[]`, mỗi người bán một phần. Đơn chỉ có một người bán thì chỉ có một phần. Danh sách trắng giữ nguyên: không a%, giá vốn, hoa hồng, tên người thu, hình thức thu. Ví dụ B-4 và B-5 của ADR-0078 thành bài kiểm. Bài «số lạ» của biên nhận gieo thêm vào giá vốn và hoa hồng.

### P6. Đơn cũ khi bản lên (ADR-0079 điều 7; C4 = A; ADR-0078 điều 5)
- **(a) Đơn đã «Đã giao» trước bản này, có dòng làm đại lý:**
  - Kế toán bổ sung giá vốn bằng **yêu cầu điều chỉnh có người thứ hai duyệt** (ADR-0115). Đường điều chỉnh nhận thêm ba loại dòng mới.
  - Ví dụ D-3 của ADR-0080 («đại lý → Tour Đảo 20.000 loại hoa hồng») chạy được ở đợt 2.
  - Có ca kiểm cho «bổ sung giá vốn khi nhà cung cấp đang giữ tiền khách», vì luật «điều chỉnh không đổi dấu số dư» (ADR-0092) có thể chặn.
  - `R-BIL-2` / `R-BIL-5` chỉ cảnh báo với đơn trước mốc phát hành.
- **(b1) Đơn khách lẻ đã xác nhận, chưa giao, chưa có bản chụp** (xác nhận trước 12/10):
  - Chụp bù tự động lúc phát hành, **đúng chữ ADR-0079 điều 7b1**: hoa hồng `NONE`, người bán theo dòng điều khoản `ALL` có hiệu lực ngày xác nhận (`prc-st-goc-all`, từ 2025-01-01), `source = AUTO`.
  - Làm bằng câu một lần trong migration `0112`, cùng bản với luật «Đã giao» mới (lớp 1 đòi mọi dòng có bản chụp). Không đơn khách lẻ nào bị giữ thêm.
  - Đơn trong nhóm này có dịch vụ mà nay Kế toán đã khai do nhà cung cấp bán (gọi là b1x) sẽ nhận người bán Tour Đảo, giống mọi đơn trước 12/10. Câu đếm liệt kê các đơn đó cho Kế toán, để sau «Đã giao» Kế toán bổ sung giá vốn bằng đường (a).
  - `orders.confirmed_at` có thể trống; khi đó lấy ngày tạo đơn. Ngày lấy theo giờ Việt Nam.
  - (b1) = 0 thì bỏ tệp `0112`.
- **(b2) Đơn có người hưởng hoặc có dòng nhập tay, chưa có bản chụp:** bị giữ `terms_missing`. Kế toán bấm **«Chụp bù»** cho từng đơn hoặc cả danh sách, theo mức hiệu lực ở **ngày xác nhận**; có nhật ký. Ô `order.terms.override`. Dùng **cùng** `chupDon` với lúc Xác nhận. Nếu một dòng sẽ ra thiếu mức thì **từ chối cả đơn, không ghi gì**, nêu dịch vụ thiếu, vì bản chụp thiếu mức đóng băng và đơn sẽ thành (b3). Dòng nhập tay không có mức để chụp, nên đơn có dòng nhập tay đi đường ghi mức tay.
- **(b3) Đơn đã có bản chụp mà một dòng thiếu mức** (xác nhận sau 12/10): bản chụp đã đóng băng (ADR-0077 điều 9). **«Chụp bù» không áp**, và cài mức mới cũng không gỡ được. Kế toán **ghi mức tay** cho dòng đó, có lý do. Câu lý do giữ phải nói đúng việc cần làm cho từng trường hợp.
- **Hệ quả đã duyệt, phải nói với người dùng:** đơn **khách lẻ** có **dịch vụ nhập tay** nay bị giữ ở «Đã giao» cho tới khi Kế toán ghi tay «dòng này Tour Đảo bán» (ADR-0078 điều 5, A-14; ADR ghi rõ «không tự đổi»). Hôm nay các đơn này qua được. Câu đếm ở Task 0 đếm nhóm này.
- **(c) Đơn nháp / chờ xác nhận:** không cần gì.

### P7. Trần giảm giá theo người hưởng (ADR-0079 điều 8, 9; C8 = A, C11 = A)
- **Hôm nay:** `PARTNER_DISCOUNT_CAP = 0`, xét theo **người thao tác**. Lúc Xác nhận, bước kiểm giá chạy trước bước tính bản chụp.
- **Làm:**
  - Đơn **có** người hưởng ⇒ trần = tổng hoa hồng của đơn, áp cho mọi người sửa đơn (kể cả Bán hàng, Quản trị). Thực tập vẫn 0.
  - Đơn **không** người hưởng ⇒ **giữ nguyên như hôm nay**: Đối tác (kể cả tài khoản lai) trần 0, Thực tập 0, còn lại không trần (ADR-0079: «đơn khách lẻ không đổi»; giữ vá DK-T3-01).
  - Nháp: tính theo bảng hôm nay, dòng thiếu mức tính 0.
  - Xác nhận: tính bản chụp trước, kiểm trần sau.
  - Sau xác nhận, bớt khách làm hoa hồng tụt dưới giảm giá thì không chặn, màn đơn cảnh báo.
  - **Đổi bên đặt sau xác nhận** (route đổi bên đặt chụp lại mức; giảm giá đã khoá từ migration 0081): nếu bên đặt mới làm đơn có người hưởng mà giảm giá > tổng hoa hồng mới ⇒ từ chối đổi, nói rõ hai số. Không có chặn này thì R-ORD-DC1 (lỗi sau mốc) sẽ báo lỗi vĩnh viễn mà không có đường sửa.
  - Vế giá danh mục vẫn theo người thao tác.
  - Cảnh báo phải đi qua hàm phải thu duy nhất (hàng rào `src/phai-thu-mot-ham.test.ts`).
  - Ví dụ B-5 (giảm 150.000 > hoa hồng 100.000 ⇒ từ chối) và C-5 thành bài kiểm.

### P8. Chặn lộ dữ liệu khi đơn đại lý bắt đầu qua «Đã giao» (áp luật ADR-0081 điều 4 và ô `supply.terms.view`)
- **Hôm nay đã lộ sẵn:** `lanThu[].nguoiThu` ở `GET /api/orders/:id/payments` trả **tên** người thu cho Đối tác.
- **Sau đợt 2 sẽ lộ thêm**, vì câu «<bên> đang giữ X» trong lý do chưa hoàn thành trả cho mọi người có `money.view`:
  - tiền người khác đang giữ, với Đối tác;
  - **giá vốn**, với người không có `supply.terms.view` (Bán hàng, HDV, Thực tập, Đối tác). Ví dụ «i-resort đang giữ 120.000» cho thấy giá vốn 480.000.
- **Làm:**
  - Với tài khoản giữ quyền Đối tác (kể cả lai): tên người thu khác hiện là «Người thu khác»; câu chưa hoàn thành không kèm tên, không kèm số của người khác.
  - Với người không có `supply.terms.view`: không thấy số dư của nhà cung cấp, chỉ thấy «còn khoản giữa công ty và nhà cung cấp — Kế toán xử lý».
  - Bài «số lạ» phủ cả hai.

### P9. Kiểm định kỳ, hàng rào, sổ vàng
- **Bật** `R-BIL-2`, `R-BIL-5` (cảnh báo trước mốc, lỗi sau mốc). `R-BIL-5` giữ **nghĩa đã đăng ký** «mỗi dòng dịch vụ của đơn đã giao có người bán» (ADR-0078, `scripts/audit-checks.mjs`); thiếu giá vốn là việc của `R-BIL-2`.
- **Thêm** kiểm «số dòng giảm giá bên đặt»: ADR gọi R-BIL-14, nhưng mã này đã dùng cho ADR-0115, nên lấy mã trống `R-BIL-16`. Thêm `R-BIL-12`. Thêm `R-ORD-DC1`: cảnh báo trước mốc, **lỗi** sau mốc (ADR-0079 điều 9, C11 = A).
- **Bảng kiểm trước khoá tháng:** đưa `R-BIL-2` vào.
- **`R-BIL-13` giữ nguyên** (chỉ cộng giữ hộ + quyết toán). Đổi sang cộng mọi loại thì báo nhầm ở ca hợp lệ, vì Tour Đảo nợ người hưởng là số âm hợp lệ (ADR-0092).
- **Hàng rào `BL-VA-RAO-K3`** dựng **trước** mọi câu SQL mới ghi hoa hồng.
- **Sổ vàng:** thêm C-1…C-5 vào `golden/so-cong-no-luot-2.json`, trạng thái `cho_xac_nhan`. Chạy SV-HT-01…05 trên mã sổ. Đổi luật lớp 1 «tổng thu = giá bán» sang công thức của R-BIL-2. Câu luật ở `docs/ARCHITECTURE.md` chỉ **đề xuất diff**.
- **Gộp hồ sơ có bản chụp** (`BL-SDL-DOT-2` (2)): viết bài chạy thật. Tiền sai thì **dừng, báo chủ, mở việc riêng**.
- **Mọi hàng rào mới** (trigger, trần giảm giá, bài số lạ biên nhận và đối tác) có bước quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên).

### P10. Hàng rào «một dòng giữ hộ chỉ tất toán một lần» không đếm dòng thương mại (TNV-G4, ADR-0092 Đ2b — **chủ duyệt ở quyết định 3**)
- **Hôm nay:** trigger `bil_debt_line_held_once` (migration 0080) chặn đảo một dòng giữ hộ khi người giữ hộ còn nợ công ty trên đơn ít hơn số của dòng đó, để khoản đã «Nộp» không bị tất toán lần hai (ca KT04). Nó cộng **mọi** dòng của cặp. Hàm `soDuCap` dùng trong `khoanChoXacNhan` và «Công ty đã nhận» (`billing/service.ts`) cộng giống vậy. Hôm nay chỉ có ba loại dòng (giữ hộ, quyết toán, hoàn) nên không sao.
- **Sau đợt 2 sẽ chặn nhầm** (người kiểm vòng 2 tái hiện ở mức trigger): khi cặp có dòng hoa hồng / giảm giá bên đặt / giá vốn, số «còn nợ» bị kéo xuống dù khoản giữ hộ chưa ai nộp.
  - **Thay lần thu sau «Đã giao»** mà đổi người thu khỏi đại lý (C-1: đại lý giữ 3.000.000, ròng 2.750.000 < 3.000.000) hoặc khỏi quầy nhà cung cấp (SV-HT-03: giữ 400.000, giá vốn 480.000, ròng −80.000) ⇒ cả lô bị từ chối.
  - **«Công ty đã nhận»** cho khoản tiền mặt «Công ty thu» mà chính tài khoản đại lý khai (luật H3; khoản này không chặn «Đã giao») ⇒ bị chặn sau «Đã giao»; màn đơn còn thôi coi nó là khoản chờ.
  - Đường vòng duy nhất là hai ba yêu cầu điều chỉnh nối nhau (điều chỉnh không được đổi dấu số dư, nên không đi một bước được), mà lần thu vẫn ghi sai người thu.
- **Làm (khuyến nghị):** trigger, `khoanChoXacNhan` và kiểm trước của «Công ty đã nhận» chỉ cộng `HELD`, `SETTLEMENT`, `REFUND` — đúng ba loại nó vốn canh. `settlement_no_flip`, đường điều chỉnh và `soDuCap` ở các chỗ khác giữ cộng mọi loại (đó là số nợ ròng thật). Trigger tạo lại cùng tên trong `0111`. Bài kiểm:
  - KT04 vẫn chặn: giữ hộ 3.000.000 → «Nộp» 3.000.000 → đảo dòng giữ hộ ⇒ bị chặn; cặp có hoa hồng (C-1) → «Nộp» đủ số ròng 2.750.000 → đảo dòng giữ hộ ⇒ vẫn bị chặn;
  - C-1 và SV-HT-03 đổi người thu bằng «Thay lần thu» sau «Đã giao» ⇒ được; số dư đại lý sau đó −250.000 (Tour Đảo nợ đại lý hoa hồng trừ giảm giá);
  - bài hai nơi (trigger ↔ hàm TS) cùng một tập loại dòng; bước quan sát chặn thật.
- **Phương án giữ nguyên trigger:** không đụng hàng rào nào, nhưng với đơn đại lý, Kế toán mất «Thay lần thu» đổi người thu và «Công ty đã nhận» cho khoản đại lý tự khai; sửa bằng nhiều yêu cầu điều chỉnh, lần thu vẫn ghi sai người.

## 3. Lựa chọn tôi tự quyết (đảo được, ghi để chủ soát)
1. Đổi tên kiểm «số dòng giảm giá bên đặt» sang `R-BIL-16` vì R-BIL-14 đã dùng.
2. Lần thu kèm «Đã giao» không nhận hai lựa chọn người thu mới.
3. Hai chỗ lộ dữ liệu (P8) sửa ngay đợt 2, không chờ đợt 3. Đây là siết thêm, không nới quyền nào.
4. Gộp hồ sơ có bản chụp: chỉ viết bài kiểm, sai thì dừng.
5. Một lần phát hành cho cả đợt 2. Migration dự kiến `0111` (và `0112` nếu có b1), bản dự kiến `2.18`; cả hai số **tạm** (`0098` đang bị nhánh đưa đón giữ).
6. Đợt 2 lập kế hoạch đầy đủ; đợt 3 chỉ ở mức việc, chi tiết hoá sau khi đợt 2 vào bản chính.
7. «Chụp bù» từ chối cả đơn khi còn dòng sẽ ra thiếu mức (P6 b2), thay vì ghi bản thiếu mức rồi đóng băng.
8. Đổi bên đặt sau xác nhận bị chặn khi giảm giá vượt hoa hồng mới (P7). Đây là áp C8 = A cho thêm một đường, siết chứ không nới.

## 4. Tiêu chí nghiệm thu (đỏ trước, xanh sau)
Gồm tiêu chí 1–8 của ADR-0079, tiêu chí của ADR-0078 B2 (trừ 3b, thay bằng tiêu chí 1–5 của ADR-0132), cộng thêm:
1. Ví dụ C-1 trên e2e: xác nhận → đại lý tự ghi cọc 3.000.000 → HDV ghi 1.750.000 → «Đã giao» → đại lý nợ 2.750.000, HDV nợ 1.750.000 → nộp / trả từng đơn → «Hoàn thành».
2. Ca SV-HT-03 trên e2e: HDV khai «khách trả tại quầy i-resort 400.000» ⇒ đơn hiện trong ô «chờ đối chiếu» của Kế toán và bị giữ «đang đối chiếu» ⇒ Kế toán «Bên kia đã nhận» ⇒ «Đã giao» ⇒ Tour Đảo nợ i-resort 80.000.
3. Đơn khách lẻ thường (bản chụp `NONE`, không dòng nhập tay): «Đã giao» như hôm nay.
4. Đối tác không thấy tên người thu và câu «<tên> đang giữ»; Bán hàng / HDV không thấy số dư nhà cung cấp (bài số lạ).
5. Mỗi hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
6. `npm test`, `typecheck`, e2e (`so-dai-ly`, `so-tien`, `coc-don-huy`, `nhap-tay-va-gia-doi-tac`, kịch bản mới), `audit-invariants` local xanh; kịch bản Chrome và ảnh thật các màn đổi.

## 5. Dữ liệu thật, thứ tự phát hành, đường lùi
- **Dữ liệu thật:** Nền tảng đã mở cho người dùng (bảo trì tắt 18/10 theo `docs/HANDOFF-N1.md`, chưa kiểm lại bằng lệnh). Đợt 2 ghi một chiều lên đơn thật: bản chụp bù b1 và dòng sổ mới.
- **Trước khi phát hành, chủ chạy câu đếm chỉ-đọc:** nhóm a; b1 / b1x / b2; đơn có người hưởng chờ «Đã giao»; đơn khách lẻ có dòng nhập tay đang chờ «Đã giao».
- **Điểm khôi phục:** `trien-khai` lấy điểm Time Travel vì có migration. **Khuyến nghị phát hành chỉ sau khi diễn tập khôi phục xong** (HC-5.19, hạn 5/11).
- **Sau khi phát hành, chủ chạy câu đếm thứ hai:** số bản chụp mang dấu của `0112` (`created_by = 'he-thong:0112'`; cột chữ tự do, không khoá ngoại) phải bằng số **dòng dịch vụ** của các đơn b1 đã đếm trước. Câu đếm trước phát hành vì vậy đếm cả số đơn lẫn số dòng dịch vụ. Dấu này tách bản chụp bù khỏi bản chụp của các đơn xác nhận bình thường sau giờ phát hành. Sau đó chạy `audit-invariants --db remote`. Lệch thì dừng, báo.
- **Đường lùi:** lùi Worker về bản trước bằng `wrangler rollback` **không** gỡ trigger của `0111`. Khi đó bản cũ vẫn chặn đơn đại lý như hôm nay, nhưng đơn khách lẻ có dòng nhập tay sẽ gặp lỗi chưa dịch ở «Đã giao». Runbook ghi cách xử lý: hoặc chấp nhận tạm, hoặc thêm migration mới bỏ trigger lớp 2. Không sửa tệp đã áp.

## 6. Việc của Kế toán / chủ (song song với thi công)
- Xác nhận các tình huống ở `phieu-ke-toan.md`. Thiếu xác nhận thì mã sổ đợt 2 không được nhận (Hiến chương 5.17).
- Trước ngày phát hành (công cụ ghi mức tay đã có từ đợt 1):
  - cài mức hoa hồng (lùi ngày hiệu lực nếu cần) cho đơn đại lý **chưa có bản chụp**, để «Chụp bù» ra đủ mức;
  - với đơn đại lý **đã có bản chụp thiếu mức** (b3), ghi mức tay từng dòng;
  - với đơn khách lẻ có dòng nhập tay đang chờ «Đã giao», ghi tay «dòng này Tour Đảo bán».
- Sau phát hành: bổ sung giá vốn cho các đơn b1x khi chúng đã «Đã giao» (đường điều chỉnh có duyệt).

## 7. Điều chưa chắc
- **Hoa hồng khi hoàn tiền / giảm trừ sau «Đã giao»:** ADR không nói. Phải quyết trước khi thi công ADR-0116 (hoàn sau «Đã giao» hôm nay còn bị chặn).
- **Ngoài phạm vi, đã có trong việc tồn:** ADR-0099 (accepted 2026-10-03) đổi ô `payment.receive` của Bán hàng sang `ownOrAssigned`; bản đồ quyền hôm nay vẫn ghi `own`. Việc này đã ghi ở `docs/BACKLOG.md` (BL-QUYEN-BH06, «đã duyệt, chưa làm»), không thuộc đợt 2.
- Chưa kiểm: lịch sử đơn của Đối tác có hiện hai hành động nhật ký mới (chụp bù, bên kia đã nhận) không; kế hoạch giao người thi công kiểm và ẩn theo danh sách hiện có.

## Thay đổi so với bản 1 (theo người kiểm vòng 1)
- C1: viết lại lý do «xây trên», thêm HC-5.19, dòng cho phép phải nêu đợt 2.
- C2: b1 theo đúng chữ ADR (không còn loại b1x); nói rõ đơn khách lẻ có dòng nhập tay bị giữ (đã duyệt) và đếm.
- C3: mọi chỗ «đang đối chiếu» nhận vai mới.
- Q1: tôn trọng ba hàng rào kiến trúc.
- Q2: R-BIL-13 giữ nguyên.
- Q3: giữ trần Đối tác trên đơn khách lẻ.
- Q4: chặn lộ giá vốn.
- Q5: tách trường hợp b3.
- Q6: thêm B-5.
- Q8: R-ORD-DC1 lỗi sau mốc.
- Q9: nêu điều kiện «tôi» = bên đặt, «thu cho ai», lần thu kèm «Đã giao».
- Q11: câu đếm sau phát hành và đường lùi.

## Thay đổi bản 2.1 (theo người kiểm vòng 2)
- I-1: thêm P10 (hàng rào «giữ hộ tất toán một lần» không đếm dòng thương mại), đưa vào quyết định 3; «Thay lần thu» vào phạm vi.
- I-2: câu đếm sau phát hành đếm theo dòng dịch vụ, bản chụp bù có dấu riêng.
- I-3: nhánh Kế toán chọn hồ sơ: `BOOKER` chỉ trên đơn có người hưởng; `SUPPLIER` có trần phần chưa thu.
- I-4: R-BIL-5 giữ nghĩa đã đăng ký; đổi bên đặt sau xác nhận bị chặn khi giảm giá vượt hoa hồng mới.
- Nhỏ: «Chụp bù» từ chối khi còn thiếu mức; thời điểm ghi mức tay chốt trước phát hành; ADR-0099 trỏ về BL-QUYEN-BH06; câu «đang đối chiếu» không lộ tên với Đối tác.
