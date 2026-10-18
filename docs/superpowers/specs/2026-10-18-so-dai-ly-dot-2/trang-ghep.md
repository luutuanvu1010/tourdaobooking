# Trang ghép — Sổ đại lý đợt 2 (CLAUDE.md §9, bước ghép khi duyệt)

Đợt 2 cho năm bảng dùng chung nhận thêm loại dữ liệu mới. Lượt duyệt có hai quyết định chạm dữ liệu / quyền (đặc tả đợt 2, ADR-0130) cộng lời cho phép xây trên lỗ đang hở.

Trang này trả lời ba câu cho từng bảng:
1. bảng chứa những loại thực thể nào;
2. từng dòng bản đồ quyền chạm bảng áp cho loại nào;
3. cổng nào canh cửa nào, kể cả chỗ giao diện ẩn / hiện theo quyền.

Giá trị ô đọc từ `src/shared/permissions.ts` ngày 2026-10-18. Thứ tự cột: Bán hàng, Kế toán, Quản trị, HDV (FIELD), Đối tác, Toàn quyền, Thực tập, Tài xế, Tài xế đối tác, Nhân sự.

**Bản 2** (sau người kiểm độc lập vòng 1): thêm view / trigger cọc, danh sách chờ của Kế toán, bảng yêu cầu điều chỉnh, chỗ lộ đang có sẵn hôm nay và chỗ ẩn số dư nhà cung cấp; sửa câu R-BIL-13.

## 1. `bil_payment_receipt` — lần thu tiền khách

| | Hôm nay | Sau đợt 2 |
|---|---|---|
| (1) Thực thể | Lần thu của khách, lần đảo, nửa chuyển cọc. Người thu: Công ty, nhân viên (vai `STAFF`), «chưa rõ». «Thu cho ai» luôn là Tour Đảo | **Thêm** người thu là **bên đặt** (đại lý, HDV độc lập, CTV, lễ tân, taxi, công ty lữ hành, loại đối tác) và **nhà cung cấp** (hồ sơ không tài khoản). «Thu cho ai» = Tour Đảo **hoặc nhà cung cấp của một dòng trên đơn** |
| (2) Ô chạm bảng | `payment.receive` own · any · any · assigned · own · any · own · none · none · none | Ô không đổi. **Luật sau ô đổi:** ghi người thu `BOOKER` / `SUPPLIER` có hai mức. Người giữ `ledger.write` (Kế toán, Toàn quyền) ghi thẳng; người còn lại chỉ khai (ADR-0130). Đối tác bấm «Tôi thu» thành `BOOKER` **chỉ khi** hồ sơ của họ là bên đặt của một đơn có người hưởng; còn lại như hôm nay |
| | `money.view` (đọc) any · any · any · assigned · own · any · own · none · none · none | Không đổi ô. **Đối tác không còn thấy tên người thu khác** (P8 đặc tả) |
| (3) Cổng | `POST /api/orders/:id/payments` (cổng `orders` + `can(payment.receive)` + `docLanThu`) | Cùng route. Route gọi `phanThuongMaiCuaDon` sau `can(` rồi truyền xuống `docLanThu`. `docLanThu` nhận thêm hai lựa chọn người thu và kiểm: bên đặt của chính đơn (đơn phải có người hưởng); nhà cung cấp của một dòng trên đơn, số ≤ phần chưa thu. Đường «ghi lần thu kèm Đã giao» **từ chối** hai lựa chọn mới |
| Giao diện | Form ghi lần thu (`web/order.ts`): «Tôi thu» / «Công ty thu»; Kế toán chọn người | Thêm «Khách trả cho đại lý <tên bên đặt>» (chỉ hiện khi đơn có người hưởng), «Khách trả tại quầy <nhà cung cấp>» và ô «Phần tiền này cho» (chỉ khi đơn có dòng làm đại lý). Hai lựa chọn hiện với mọi người có ô ghi tiền; người không có `ledger.write` thấy câu «chờ Kế toán xác nhận» |

## 2. `bil_receipt_recon` — dấu «đang đối chiếu» (ADR-0120), và mọi chỗ đọc dấu này

| | Hôm nay | Sau đợt 2 |
|---|---|---|
| (1) Thực thể | Dấu cho khoản «Công ty thu – chuyển khoản» do người không phải Kế toán khai | **Thêm** dấu cho khoản «khách trả cho bên đặt / tại quầy nhà cung cấp» do người không phải Kế toán khai (cả tiền mặt lẫn chuyển khoản) |
| (2) Ô | Ghi dấu `DECLARED`: cùng ô `payment.receive` của lần thu. Ghi `CONFIRMED`: `ledger.write` none · any · none · none · none · any · none · none · none · none | Không đổi ô |
| (3) Cổng ghi | Route `POST /api/ledger/company-receipts/:receiptId/confirm` (cổng `office` + `can(ledger.write)`). Trigger `bil_receipt_recon_declared` chỉ nhận Công ty + chuyển khoản. Trigger `_confirmed_txn` đòi mã giao dịch | **Route mới** `POST /api/ledger/counterparty-receipts/:receiptId/confirm` (cùng cổng, cùng ô). Trigger `_declared` nhận thêm `BOOKER` / `SUPPLIER` (mọi hình thức). `_confirmed_txn` chỉ áp người thu Công ty. Trigger chặn «Đã giao» khi còn dấu chờ (`bil_posting_delivered_reconciling`) phủ cả loại mới |
| (3) Chỗ đọc | Bốn chỗ hiểu «đang đối chiếu» = chỉ người thu Công ty: câu `PENDING_COMPANY` (danh sách chờ + bộ đếm nhắc của Kế toán), `khoanMoiDoiChieu` / `canDoiChieu` (`billing/rules.ts`), view `v_bil_coc_don`, trigger cọc `bil_payment_receipt_coc_reversal` (0099) | **Cả bốn chỗ** nhận thêm `BOOKER` / `SUPPLIER`; view và trigger cọc tạo lại cùng tên trong migration `0111`. Bài kiểm hai nơi (mã ↔ SQL) có mẫu vai mới, để hai chỗ không lệch nhau |
| Giao diện | Ô «Chờ đối chiếu» trên «Việc của bạn» của Kế toán; màn đối chiếu | Cùng ô, cùng màn, thêm dòng loại mới ghi rõ «khách trả cho <đại lý>» / «tại quầy <nhà cung cấp>», nút «Bên kia đã nhận». HDV thấy trên đơn: «đang chờ Kế toán xác nhận với <bên kia>» |

## 3. `bil_posting` — phiếu sổ

| | Hôm nay | Sau đợt 2 |
|---|---|---|
| (1) Thực thể | Chín loại phiếu: RECEIPT, DELIVERED, COMPLETED, COMPANY_RECEIVED, SETTLEMENT, REFUND, ADJUSTMENT, REVERSAL, REPLACEMENT | **Thêm** phiếu «Bên kia đã nhận» (`COUNTERPARTY_CONFIRMED`, phiếu một đơn: trigger `bil_posting_order_required` đòi `order_id`). Phiếu `DELIVERED` mới mang thêm `gross_snapshot` |
| (2) Ô | Phiếu `DELIVERED`: `order.handover` none · none · any · assigned · none · any · none · none · none · none. Phiếu xác nhận: `ledger.write` | Không đổi ô. **Đổi nghĩa thật:** HDV bấm «Đã giao» nay **sinh dòng nợ cho người khác** (hoa hồng cho đại lý, giá vốn cho nhà cung cấp, giảm giá bên đặt chịu). Số do máy chủ tính từ bản chụp; người bấm không nhập số nào |
| (3) Cổng | `POST /api/orders/:id/delivered` (cổng `orders` + `can(order.handover)` + `lyDoChuaGiaoDuoc`) + câu ghi `DAT_GIAO_DIEU_KIEN` của `orders` + trigger `delivered_paid`, `delivered_reconciling`, `period_closed` | Bỏ chặn «có người hưởng». Thêm lý do giữ `terms_missing`, `booker_not_beneficiary`, `terms_exceed_price`. **Lớp 1:** câu ghi của `orders` đòi không dòng nào thiếu mức (`v_ord_terms_missing`) và không dòng nào chưa chụp (`v_ord_terms_uncaptured`, view mới). **Lớp 2:** trigger mới `bil_posting_delivered_terms` của `billing` đọc hai view công bố đó |
| Giao diện | Nút «Đã giao» trên trang đơn, ẩn / hiện theo `order.handover` và lý do giữ | Nút như cũ; câu lý do giữ mới nói ai xử lý (Kế toán / Văn phòng) |

## 4. `bil_debt_line` — dòng nợ

| | Hôm nay | Sau đợt 2 |
|---|---|---|
| (1) Thực thể | Ba loại: giữ hộ (người cầm tiền → Tour Đảo), quyết toán, hoàn. Các bên: Tour Đảo, nhân viên, (hiếm) đại lý tự ghi | **Thêm** ba loại: hoa hồng (Tour Đảo → **người hưởng**), giảm giá bên đặt chịu (**người hưởng** → Tour Đảo), giá vốn (Tour Đảo → **nhà cung cấp**). Bên mới thường xuyên: người hưởng, nhà cung cấp |
| (2) Ô đọc | `ledger.view` own · any · own · own · none · any · own · none · none · none | Không đổi ô. «own» = dòng mà một bên là hồ sơ của chính tài khoản. Nhân viên nội bộ không mang loại được hưởng (ADR-0117 điều 4), nên không nhân viên nào thấy dòng hoa hồng «của mình». Dòng giá vốn nằm trên hồ sơ nhà cung cấp (không tài khoản), nên chỉ Kế toán, Toàn quyền đọc qua sổ. Đối tác `none` → 403 ở `/api/ledger/mine` (giữ tới đợt 3) |
| (2) Đọc gián tiếp | Câu «<bên> đang giữ X» trong lý do chưa hoàn thành, trả cho mọi người có `money.view` | **Đổi:** người không có `supply.terms.view` (Bán hàng, HDV, Thực tập, Đối tác) không thấy số dư của nhà cung cấp, chỉ thấy «còn khoản giữa công ty và nhà cung cấp — Kế toán xử lý». Đối tác không thấy tiền người khác giữ |
| Ô ghi | Dòng sinh trong lô «Đã giao», lô xác nhận, quyết toán (`ledger.write`), điều chỉnh (mục 5) | Không đổi ô |
| (3) Cổng | Trigger: `reversal_match`, `trip_not_yet`, `settlement_no_flip`, `held_once`, `held_no_single_reversal`, `company_received_txn`, `adjustment_match`, khoá kỳ | Thêm chỉ mục duy nhất một phần + trigger (i)–(iv) (ADR-0079 điều 6). Kiểm định kỳ bật `R-BIL-2`, `R-BIL-5`, `R-BIL-12`, `R-BIL-16` (số dòng giảm giá bên đặt), `R-ORD-DC1`. **`R-BIL-13` giữ nguyên** (chỉ cộng giữ hộ + quyết toán), vì Tour Đảo nợ người hưởng là số âm hợp lệ |
| Giao diện | Không màn nào gọi `/api/ledger` hay `/mine` (đo 18/10); trang đơn có khối «Phần đối tác» (ô `order.terms.view`) | Khối «Phần đối tác» sau «Đã giao» đọc số đã ghi sổ. Đối tác nhận DTO hẹp như đợt 1 (chỉ số hoa hồng của mình) |

## 5. `bil_adjustment_request` — yêu cầu điều chỉnh có duyệt (ADR-0115)

| | Hôm nay | Sau đợt 2 |
|---|---|---|
| (1) Thực thể | Yêu cầu điều chỉnh dòng giữ hộ / quyết toán / hoàn | **Thêm** yêu cầu cho ba loại dòng mới. Dùng cho đơn cũ nhóm a (đã «Đã giao» mà thiếu giá vốn) và ví dụ D-3 |
| (2) Ô | Tạo: `ledger.write`. Duyệt: `ledger.adjust.approve` none · any · any · none · none · any · none · none · none · none | Không đổi ô. **Đổi nghĩa thật:** người giữ ô duyệt (kể cả Quản trị) nay duyệt được cả yêu cầu bổ sung giá vốn / hoa hồng, tức quyết định số tiền Tour Đảo nợ đại lý hay nhà cung cấp |
| (3) Cổng | `loaiDong` (`billing/dieu-chinh.ts`), trigger `adjustment_match`, `settlement_no_flip` | `loaiDong` nhận ba loại mới. Trigger không đổi. Ca «bổ sung giá vốn làm đổi dấu số dư cặp» phải chạy thử; bị chặn thì báo điều phối, không tự nới |
| Giao diện | Màn yêu cầu điều chỉnh của Kế toán | Ô chọn loại dòng thêm ba loại mới, nhãn tiếng Việt |

## 6. `ord_service_terms` — bản chụp mức (bảng của `orders`)

| | Hôm nay | Sau đợt 2 |
|---|---|---|
| (1) Thực thể | Bản chụp lúc Xác nhận, đổi bên đặt, ghi mức tay | **Thêm** bản chụp bù: tự động cho đơn khách lẻ cũ (b1, migration một lần, `source = 'AUTO'`) và do Kế toán bấm «Chụp bù» cho đơn có người hưởng / dòng nhập tay chưa có bản chụp nào (b2). Đơn đã có bản chụp mà thiếu mức (b3) chỉ ghi mức tay |
| (2) Ô | Ghi tay: `order.terms.override` none · any · any · none · none · any · none · none · none · none | «Chụp bù» dùng cùng ô `order.terms.override`; không ô mới. Nhật ký mới `ord_terms_backfilled`, ẩn khỏi lịch sử đơn của Đối tác |
| (3) Cổng | Trigger `_confirmed`, `_delivered`, `_term_valid`, `_rule_valid` | Không đổi trigger. Chụp bù phải có dòng mức / điều khoản còn hiệu lực ở ngày xác nhận (Kế toán lùi ngày nếu cần); đơn đã có bản chụp hoặc đã «Đã giao» ⇒ từ chối |
| Giao diện | Khối «Phần đối tác» có nút ghi mức tay | Thêm nút «Chụp bù» (ẩn / hiện theo `order.terms.override` và «đơn chưa có bản chụp nào»), và trang danh sách đơn chờ chụp bù cho Kế toán (menu Thiết lập) |

## 7. `orders.discount` — trần giảm giá (không đổi bảng, đổi luật)

- (1) Đơn có người hưởng và đơn không người hưởng.
- (2) Ô `order.create` any · none · any · none · any · any · any · none · none · none và `order.modify` ownOrAssigned · none · any · none · own · any · own · none · none · none. Ô không đổi.
- **Luật đổi:**
  - Đơn có người hưởng ⇒ trần = tổng hoa hồng, áp cho **mọi người** sửa đơn, kể cả Bán hàng và Quản trị. Thực tập vẫn 0.
  - Đơn không người hưởng ⇒ giữ như hôm nay: Đối tác (kể cả tài khoản lai) trần 0, Thực tập 0, còn lại không trần.
- (3) Cổng: `priceGuard` (lập / sửa nháp) và bước kiểm giá lúc Xác nhận. Lúc Xác nhận phải tính bản chụp **trước** khi kiểm trần. Sau Xác nhận, bớt khách làm hoa hồng < giảm giá thì không chặn, chỉ cảnh báo.
- Giao diện: form lập đơn hiện «Giảm tối đa X ₫ (bằng hoa hồng của đơn)» khi đơn có người hưởng; trang đơn cảnh báo khi giảm giá lớn hơn hoa hồng (sau khi bớt khách).

## 8. Chỗ ẩn / hiện bị đổi nghĩa (rà riêng)

- **Tên người thu:** `lanThu[].nguoiThu` ở `GET /api/orders/:id/payments` **hôm nay đã trả tên** người thu cho Đối tác (lộ sẵn, không phải do đợt 2). Đợt 2 vá luôn: Đối tác và tài khoản lai thấy «Người thu khác».
- **Câu «<bên> đang giữ X»:** sau đợt 2 câu này sẽ nêu cả người hưởng và nhà cung cấp. Ẩn tiền người khác giữ với Đối tác; ẩn số dư nhà cung cấp với người không có `supply.terms.view`, vì số đó suy ra được giá vốn.
- **Lựa chọn «khách trả cho đại lý»** chỉ có nghĩa trên đơn có người hưởng. Ẩn ở đơn khách lẻ, và máy chủ cũng từ chối.
- **«Việc của bạn» của Kế toán:** ô «chờ đối chiếu» đếm thêm loại mới. Ô của HDV không có gì mới.
- **Lịch sử đơn của Đối tác:** hai hành động nhật ký mới (`ord_terms_backfilled`, `ledger_counterparty_confirmed`) vào danh sách ẩn.
- **Biên nhận gửi khách:** thêm phần chia theo người bán; danh sách trắng không đổi (không a%, không giá vốn, không hoa hồng).
