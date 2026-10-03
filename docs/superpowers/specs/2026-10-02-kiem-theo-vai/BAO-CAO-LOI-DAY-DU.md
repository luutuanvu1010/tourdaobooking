# Báo cáo lỗi kiểm thử theo vai — Tour Đảo Booking

> Kiểm thử khám phá ngày **2/10/2026** trên mã `main` @ `dfee4a8c`. Mã này giống bản 1.76 đang chạy production, chỉ khác các tệp chữ trợ giúp (bản 1.77: `src/shared/huong-dan-*.ts`, `tro-ly-*.ts`), phân loại từ **Nghiêm trọng** đến **Ít nghiêm trọng**, đã qua một đợt **kiểm độc lập chỉ đọc mã** cho mọi lỗi nghiêm trọng và trung bình.

| | |
|---|---|
| Phương pháp | Ba người kiểm (trợ lý AI) đóng vai người dùng thật của 10 quyền, mỗi nhóm một bản chạy thử local riêng (D1 tạm, dữ liệu giả, không mạng ra ngoài, không đụng production). Thử qua API và qua Chromium ở khổ 390 và 1280 (320 với màn tài xế). |
| Số tình huống | 159 (47 Bán hàng · Đối tác, 49 văn phòng, 63 hiện trường) |
| Số lỗi mới | **78**: 1 nghiêm trọng, 26 trung bình, 51 ít nghiêm trọng (mức sau kiểm). Chưa tính khoảng 22 lần gặp lại lỗi đã có mã (Phụ lục A). |
| Mức người tìm gán → sau kiểm | Nghiêm trọng 4 → 1 · Trung bình 35 → 26 · Ít nghiêm trọng 39 → 51 |
| Kiểm độc lập | 39 lỗi (mọi lỗi nghiêm trọng và trung bình của người tìm), 43 lượt kiểm; lỗi nghiêm trọng có hai người, một người cố bác bỏ, một người dựng lại đường đi. **Không lỗi nào bị bác bỏ.** 13 lỗi được xác nhận đầy đủ, 26 lỗi xác nhận một phần (sai lệch về mức, nhãn "mới", hay tệp:dòng). 39 lỗi ít nghiêm trọng chưa có người kiểm độc lập. |
| Nguồn chi tiết | Bản đầy đủ: mỗi lỗi gồm báo cáo gốc của người tìm (bước tái hiện) và bằng chứng tệp:dòng của người kiểm, gộp trong một tệp. Ảnh chụp và kịch bản thử nằm ở thư mục tạm của phiên kiểm, **không** nằm trong kho; các đường dẫn ảnh trong thân lỗi chỉ để tham chiếu. |

## 1. Tóm tắt

Các cổng quyền chính đều chặn đúng (quyền tiền chỉ Toàn quyền, tài xế không xem được chuyến người khác, hai người bấm cùng lúc chỉ một người thành công). Kiểm độc lập xác nhận lỗi nặng nhất là **sổ tiền** (VP-01). Ba lỗi người tìm xếp "nghiêm trọng" ở luồng xe chạy (HT-24, HT-03, HT-01) bị cả hai người kiểm hạ xuống **trung bình** vì có đường vòng, nhưng vẫn đứng đầu nhóm trung bình. Điều đáng chú ý nhất của đợt kiểm: **21 lỗi** hoá ra một phần hoặc toàn bộ là **quyết định đã duyệt hoặc khoảng trống đã biết** (mã đúng với ADR, muốn đổi thì cần chủ quyết), không phải mã sai.

| Mức (sau kiểm) | Bán hàng · Thực tập · Đối tác | Kế toán · Quản trị · Toàn quyền · Nhân sự | Hướng dẫn viên · Tài xế · Điều phối | Tổng |
|---|---:|---:|---:|---:|
| **Nghiêm trọng** | 0 | 1 | 0 | **1** |
| **Trung bình** | 7 | 7 | 12 | **26** |
| **Ít nghiêm trọng** | 21 | 18 | 12 | **51** |
| Cộng | 28 | 26 | 24 | 78 |

### Lỗi nghiêm trọng

- [**VP-01**](#VP-01) — Sổ tiền trừ hai lần một khoản chuyển khoản. Kế toán thấy cùng lúc hai nút cho cùng một khoản ("Xác nhận đã nhận" và "Đã nộp về công ty"); nếu bấm "Đã nộp" trước rồi "Xác nhận" sau, sổ nhân viên bán hàng bị trừ hai lần và ra số âm, bộ kiểm dữ liệu vẫn báo đạt. Đã tái hiện độc lập hai lần (chạy thật và đọc mã). Hai người kiểm chia đôi về mức: một người giữ Nghiêm trọng, một người cho là Trung bình vì chỉ sai sổ nội bộ, cùng họ với TNV-G4 đã có hạn 31/10.

### Ba lỗi trung bình gần ngưỡng nghiêm trọng (luồng xe chạy)

- [**HT-24**](#HT-24) — Qua 0 giờ, chuyến đang chạy (còn khách trên xe) biến khỏi danh sách "Cuốc của tôi". Còn đường vòng: mở lại qua tin cũ hoặc văn phòng bấm thay.
- [**HT-03**](#HT-03) — Một chạm "Xuất bến" nhầm chuyến ngày khác: không hỏi lại, xe và tài xế bị khoá cho mọi chuyến khác. Đường vòng duy nhất là "Kết thúc gián đoạn" với lý do không đúng sự thật. Lệnh hoàn tác cần ADR vì đổi luật lõi "chỉ đi tiến".
- [**HT-01**](#HT-01) — Điểm trả khách có thể đứng trước điểm đón của chính họ mà chuyến vẫn báo "Đạt hết". Không chặn hẳn việc chính (tài xế đảo được, máy không cho "Đã trả" khi khách chưa lên xe).

### Bốn kiểu vấn đề lặp lại

- **Bấm nhầm không sửa được:** đã đón, khách đã huỷ, xuất bến, đã trả đều chốt ngay (HT-03, HT-04, HT-02). Một phần là luật lõi đã duyệt.
- **Tin báo không tới đúng người:** khách huỷ ngoài hiện trường không ai biết, HDV đi kèm không biết giờ và điểm hẹn, Kế toán không có tin về tiền (HT-10, HT-23, VP-11, HT-06).
- **Dữ liệu bẩn lọt vào:** SĐT sai độ dài, hồ sơ khách trùng khi Thực tập và Đối tác lập đơn, hai đại lý trùng mã số thuế, giá danh mục sai áp ngay (BH-02, BH-05, VP-08, VP-07). Đa số là khoảng trống đã biết hoặc đã hoãn.
- **Chữ và màn hình gây hiểu nhầm:** câu báo sai tình huống, nút "Hỗ trợ" che số tiền và nút "Kết thúc", ngày không có năm, Trang chủ đếm lẫn phạm vi (BH-10, VP-09, BH-23, VP-13, HT-22).

### Cần chủ dự án quyết

1. **VP-01** — có đưa vào sổ "dừng dây chuyền" (`docs/quyen-hoan.json`) với hạn riêng, hay gộp vào đợt sửa sổ tiền (F-03, TNV-G4, hạn 31/10). Người kiểm lưu ý ADR-0092 hiện chưa phủ đường "xác nhận sau nộp", cần bổ sung.
2. **BH-06** — Bán hàng là người phụ trách đơn của đồng nghiệp có được ghi tiền khách đưa không (ADR-0026 hiện ghi không).
3. **BH-08** — Thực tập có trần giá và mức giảm không. Người kiểm lưu ý hành vi này giống hệt vai Bán hàng, nên nếu siết thì phải hỏi chung cho mọi vai nội bộ.
4. **BH-09** — Đối tác còn được tự xác nhận đơn của mình không (ADR-0014 điều 6 hiện cho phép; đích ADR-0018 giai đoạn 2 thì không).
5. **HT-03, HT-04, HT-01, HT-06** — bốn lỗi chạm luật lõi chuyến (hoàn tác xuất bến, sửa kết quả khách, thứ tự điểm, lý do giữ chuyến): cần ADR do chủ duyệt, và chủ chọn thứ tự so với lộ trình Vận chuyển đang chạy (báo cáo này chưa đối chiếu lộ trình).

## 2. Cách xếp mức

- **Nghiêm trọng:** sai tiền, lộ hoặc mất dữ liệu, vượt quyền, hoặc chặn việc chính mà không có đường vòng.
- **Trung bình:** sai nghiệp vụ hoặc gây khó rõ rệt, thường có đường vòng nhưng tốn công hoặc dễ sai.
- **Ít nghiêm trọng:** trải nghiệm, chữ, bố cục, dữ liệu bẩn không gây hậu quả ngay.
- **Mức dùng để xếp là mức sau kiểm độc lập.** Khi người kiểm đề xuất mức khác người tìm, báo cáo theo người kiểm, ghi rõ mức người tìm gán. Riêng VP-01 hai người kiểm chia đôi nên giữ mức người tìm gán. Mười hai lỗi một người kiểm hạ từ Trung bình xuống Ít nghiêm trọng được gom thành một nhóm riêng ở đầu phần Ít nghiêm trọng để chủ xem lại, vì mỗi lỗi chỉ có một ý kiến độc lập.
- Trong cùng một mức, lỗi xếp theo tác động: tiền, rồi dữ liệu và quyền, rồi việc hiện trường, rồi tin báo, rồi trải nghiệm. Số thứ tự là thứ tự nên sửa, không phải mã phát hiện.
- Mã lỗi: `BH-` Bán hàng · Thực tập · Đối tác; `VP-` văn phòng; `HT-` hiện trường. Mục "Tình trạng" lấy từ kết luận của người kiểm. "Hướng xử lý" là tổng hợp của người lập báo cáo dựa trên ghi chú của người kiểm, không phải quyết định.
- Phần "Báo cáo gốc của người tìm" trong mỗi lỗi giữ nguyên văn người tìm, kể cả dòng "Mức" của họ; mức cuối cùng là mức ở dòng "Mức" phía trên.

---

## 3. NGHIÊM TRỌNG

<a id="VP-01"></a>
### 1. VP-01 · Màn đơn mời Kế toán trừ hai lần cùng một khoản chuyển khoản.

- **Vai:** Kế toán
- **Loại:** sai (sai tiền)
- **Mức:** Nghiêm trọng (giữ nguyên; hai người kiểm chia đôi: Nghiêm trọng / Trung bình)
- **Tình trạng:** Lỗi mã (giao diện dẫn tới, máy chủ không chặn); cùng họ TNV-G4
- **Hướng xử lý:** Sửa mã ở máy chủ và giao diện; bổ sung vào ADR-0092 / TNV-G4
- **Kiểm độc lập:** Xác nhận (2 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Màn đơn mời Kế toán trừ hai lần cùng một khoản chuyển khoản.** Bán hàng khai "Công ty thu – Chuyển khoản". Trang đơn của Kế toán hiện CÙNG LÚC hai nút cho cùng số tiền: "Xác nhận đã nhận" (trên dòng lần thu) và "Đã nộp về công ty" (khối Kế toán, kèm câu "Bán Hàng A đang giữ 300.000 ₫ của công ty", dù tiền đã vào tài khoản công ty). Bấm cả hai đều được → sổ trừ người khai hai lần.
- Tái hiện: (1) Bán hàng A lập đơn TOUR4D 900.000, ghi lần thu 300.000 CK "cong_ty", xác nhận đơn. (2) Kế toán mở đơn → thấy cả `xac-nhan-ck` và `da-nop` (ảnh `kt-d-o9-hai-nut.png`, danh sách nút in ra từ `kt-ui.mjs`: `xac-nhan-ck:Xác nhận đã nhận`, `da-nop:Đã nộp về công ty`). (3) Bấm "Đã nộp về công ty" → `POST /api/ledger/settlements` 201; rồi "Xác nhận đã nhận" → `POST /api/ledger/company-receipts/:id/confirm` 200.
- Thấy: `GET /api/ledger/mine` của Bán hàng A: `Lần thu +300.000 → Nộp/trả −300.000 → Công ty đã nhận −300.000`. Bán hàng A thật ra đang giữ 500.000 tiền mặt (đơn khác) nhưng sổ ghi 200.000; sau khi Kế toán hoàn 500.000 tiền mặt cho khách đơn huỷ qua tay Bán hàng A, sổ ghi **−300.000** (công ty "nợ" Bán hàng A 300.000 không có thật). `audit-invariants --db local` thoát 0, "Mọi bất biến đạt".
- Mong đợi: khoản "Công ty thu – CK" chỉ có một đường xử lý (xác nhận đã nhận); khối "đang giữ của công ty" không tính khoản CK chờ xác nhận, hoặc máy chủ chặn nộp vượt số người đó thật sự giữ cho đơn.
- Bằng chứng: `kt1.mjs`, `kt3.mjs`; mã `web/order.ts:521-561` (hai nút dựng độc lập), `src/modules/billing/service.ts:361-398` (nộp không đối chiếu khoản chờ xác nhận).
- MỚI về cơ chế (giao diện tự dẫn tới lỗi). Liên quan TNV-G4 (KT04 "nộp quá số đang giữ") và KT10 (bộ kiểm bất biến không thấy).
- Đề xuất: khoản CK chờ xác nhận không được tính vào "đang giữ của công ty"; máy chủ từ chối nộp khi số nộp của đơn vượt số giữ hộ tiền mặt thật.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *góc bác bỏ:* **Xác nhận**; mức đề xuất Nghiêm trọng (tiền). Sổ công nợ sai tiền (công ty "nợ" nhân viên 300.000 không có thật, hiện cả ở "Sổ của tôi" của người đó), do chính giao diện đặt sẵn hai nút cho cùng khoản, máy chủ, trigger và bộ kiểm bất biến đều không bắt, và giao diện không có đường sửa (chỉ sửa được qua API). Có giảm nhẹ: cần Kế toán bấm "Đã nộp" trước "Xác nhận" (bấm xác nhận trước thì nút nộp biến mất), chỉ sai sổ nội bộ, không ảnh hưởng số tiền khách; nên mức CAO ở mức thấp, cùng họ với TNV-G4 đã có hạn 31/10.
>   - *Chính xác hoá:* Mô tả lỗi đúng; chỉnh vài điểm: (1) Đề xuất "khối đang giữ không tính khoản CK chờ xác nhận" TRÁI thiết kế đã duyệt (ADR-0026 điều 4 gạch 2, H3; tiêu chí nghiệm thu số 2; bài lo-ghi.test.ts:250) — nên chỉ giữ vế thứ hai của đề xuất (máy chủ chặn) hoặc đổi cách trình bày/ràng buộc hai nút, không đổi nghĩa "đang giữ". (2) Câu "dù tiền đã vào tài khoản công ty" là suy diễn: hệ thống chưa biết điều đó cho tới khi Kế toán bấm xác nhận (H3 cố ý không tin lời người khai). (3) Phải nói rõ thứ tự: lỗi chỉ xảy ra khi bấm "Đã nộp" trước rồi "Xác nhận" sau; nếu xác nhận trước thì nút "Đã nộp" tự mất; báo cáo gốc viết "bấm cả hai đều được" là đúng cho thứ tự nộp-trước. (4) Tham chiếu mã: service.ts nên là 361-397 (không phải 398); và nên bổ sung service.ts:331-355 (`xacNhanCongTyNhan` không kiểm quyết toán đã ghi) là nửa còn lại của lỗi, vì đề xuất "chặn nộp vượt số giữ" một mình KHÔNG vá được (nộp 300.000 <= 300.000 vẫn hợp lệ, lỗi nảy sinh ở bước xác nhận sau đó). (5) Liên hệ: không chỉ TNV-G4/KT04, kế hoạch ADR-0092 hiện tại cũng chưa phủ đường "xác nhận sau nộp"; nên bổ sung vào ADR-0092 thay vì coi là đã nằm trong đợt sửa.
>   - *Hướng sửa gợi ý:* Vá ở máy chủ (hai lớp, máy chủ và trigger): chặn "Công ty đã nhận" khi số dư của người khai trên đơn đã xuống dưới số khoản đó (hoặc khi đã có dòng quyết toán che khoản), và chặn "nộp" vượt phần tiền mặt thật sự giữ hộ (không tính CK chờ xác nhận); thêm kiểm số dư âm vào audit-invariants (R-BIL-13) và thêm bài "nộp trước, xác nhận sau". Ở giao diện: khoản CK chờ xác nhận chỉ có đường "Xác nhận đã nhận", dòng "đang giữ" trừ phần đó khi dựng nút "Đã nộp về công ty". Gộp vào ADR-0092/TNV-G4 để người kiểm độc lập duyệt, chủ quyết có ghi mục riêng trong docs/quyen-hoan.json hay không.
>   - *Bằng chứng (tệp:dòng):* (1) Giao diện dựng hai nút độc lập cho cùng một khoản. web/order.ts:524-532 `nutKeToanLanThu`: hiện "Xác nhận đã nhận" khi `t.keToan!.choXacNhan.includes(l.id)`. web/order.ts:553-563 `khoiKeToan`: với MỖI phần tử `kt.dangGiu` dựng dòng `${d.ten} đang giữ ${vnd(d.soTien)} của công ty` kèm nút "Đã nộp về công ty" gọi `POST /api/ledger/settlements` với `soTien: d.soTien` (không điều kiện nào ẩn nút khi khoản đó là CK chờ xác nhận). (2) Máy chủ đưa khoản CK chờ xác nhận vào CẢ HAI danh sách: src/modules/billing/rules.ts:94-96 (`sinhDongLanThu`: người thu = Công ty, người ghi không phải Kế toán -> dòng HELD trên người khai); src/modules/billing/service.ts:168-173,195-196 (`dangGiu` = mọi bên có số dư > 0 theo `soDuTheoBen`; `choXacNhan` = lần thu COMPANY còn dòng HELD chưa đảo). Sau khi "nộp", dòng HELD vẫn chưa bị đảo nên nút "Xác nhận" vẫn còn. (3) Máy chủ không có chốt chặn: src/modules/billing/service.ts:361-397 `ghiQuyetToan` chỉ kiểm định dạng, không so với số dư; service.ts:331-355 `xacNhanCongTyNhan` chỉ kiểm dòng HELD chưa bị đảo, không so với các dòng quyết toán đã ghi. Trigger CSDL (migrations/0045_billing_so_cong_no.sql:195-255) chỉ kiểm dòng đảo khớp gốc (`bil_debt_line_reversal_match`) và chặn Hoàn thành khi số dư > 0 (`bil_posting_completed_settled`); không có trigger nào chặn quyết toán vượt số dư hay đảo làm số dư âm; migrations 0051..0074 không thêm trigger cho bil_debt_line. scripts/audit-checks.mjs chỉ có R-BIL-1, 3a, 3b, 4a, 4b, 6 (không kiểm số dư âm). (4) TỰ TÁI HIỆN bằng khung thử trong bộ nhớ (tests/audit/harness.mjs, SQLite thật, không mạng; tệp thử đặt ở thư mục scratchpad, không sửa repo): `node --test .../scratchpad/vp01.test.mjs` -> Bán hàng khai CK 300.000 "cong_ty" (201); GET payments của Kế toán: `dangGiu:[{An Bán, 300000}], choXacNhan:[1 id]`; POST settlements nop 300000 -> 201; GET lại: `dangGiu:[]` nhưng `choXacNhan` VẪN còn 1 id; POST company-receipts/:id/confirm -> 200; GET /api/ledger/mine của Bán hàng: `dangGiu:-300000`, các dòng "Lần thu +300.000 -> Nộp / trả -300.000 -> Công ty đã nhận -300.000"; tổng sổ theo đơn = -300000. Khớp từng số với báo cáo gốc. Cơ chế: dòng quyết toán đưa số dư người khai về 0, rồi dòng đảo của dòng HELD (sinhDongXacNhanCongTy = sinhDongDao, rules.ts:103-108) trừ thêm lần nữa. (5) Đường sửa: máy chủ có `ghiDieuChinh` (service.ts:453-522: dao_dong, dieu_chinh) nhưng web/ không gọi `dao_dong`/`dieu_chinh` ở đâu (grep trong web/ không có kết quả), trên giao diện chỉ có nút "Đảo" cả lần thu (order.ts:534-546) — đảo lần thu không sửa đúng lỗi này.
>   - *Rào chắn đã thấy:* Có vài quy tắc liên quan nhưng không đủ chặn: (a) ADR-0026 điều 4 gạch 2 và điều 5 + tiêu chí nghiệm thu số 2 (docs/adr/ADR-0026-...md:69,72,121): khoản "Công ty thu - CK" do người không phải Kế toán khai CỐ Ý vẫn tính là "đang giữ" tới khi Kế toán xác nhận; bài src/modules/billing/lo-ghi.test.ts:250 khoá hành vi đó. Tức "đang giữ" gồm CK chờ là thiết kế đã duyệt, nhưng thiết kế không nói Kế toán được vừa "nộp" vừa "xác nhận" cùng khoản. (b) Trigger bil_posting_completed_settled (0045:245-255) chỉ chặn số dư DƯƠNG, số dư âm lọt qua. (c) Bài lo-ghi.test.ts:259-262 và 379-382, tests/e2e/so-tien.mjs:101-104 chỉ kiểm thứ tự "xác nhận CK rồi nộp phần tiền mặt còn lại"; không có bài nào cho "nộp trước, xác nhận sau". (d) Đường vòng người dùng: bấm "Xác nhận đã nhận" TRƯỚC thì dòng "đang giữ" và nút "Đã nộp" biến mất, nên lỗi chỉ xảy ra khi bấm nộp trước. (e) Lỗi cùng gốc phía máy chủ đã nằm trong sổ dừng dây chuyền: docs/quyen-hoan.json:87-93 TNV-G4 (KT04 "nộp quá số đang giữ", KT10 bộ kiểm không thấy), hạn 2026-10-31, kế hoạch ADR-0092 (docs/superpowers/specs/2026-10-02-luot-duyet-2-sua-sai-sau-da-giao-va-so-khong-doi-dau.md:156-179) — nhưng kế hoạch đó chỉ ràng "nộp <= số đang nợ" và "quyết toán không đổi dấu"; với kịch bản này nộp 300.000 <= 300.000 vẫn qua, còn đường "Công ty đã nhận" (đảo dòng giữ hộ làm số dư âm) không bị ràng. Không tìm thấy rào chắn nào ngăn kịch bản này trong route, service, trigger, luật dùng chung hay giao diện.
> - *góc dựng đường đi:* **Xác nhận**; mức đề xuất Trung bình (tiền). Lỗi thật và giao diện tự dẫn tới (lần thu CK mặc định của Bán hàng nào cũng sinh cả hai nút), bộ kiểm không thấy; nhưng thiệt hại hiện chỉ là sổ nợ nội bộ ghi sai −300.000 chứ số khách đã trả, tiền thật và việc Hoàn thành không đổi; không có nút giao diện nào dùng số âm để chi tiền ("công ty trả" chỉ có qua API, web/order.ts:561 chỉ gửi chieu "nop"), và sổ chỉ-thêm sửa được bằng dòng đảo. Cần thao tác sai thứ tự của đúng hai vai tin cậy; nên gộp vào TNV-G4/ADR-0092 (đã HIGH, hạn 31/10) thay vì mở mục CAO riêng; nâng lên CAO nếu màn Sổ công nợ hoặc nút "công ty trả" được dựng trước khi vá.
>   - *Chính xác hoá:* Cơ chế gốc đúng. Cần sửa bốn điểm: (1) "Bấm cả hai đều được" chỉ đúng theo thứ tự Nộp → Xác nhận; thứ tự Xác nhận → Nộp giao diện tự chặn (khối "đang giữ" biến mất khi số dư về 0), chỉ lọt khi trang cũ để mở hoặc gọi API trực tiếp. (2) Câu "dù tiền đã vào tài khoản công ty" không chính xác: hệ thống chưa biết tiền đã vào hay chưa, đó chính là việc Kế toán đối chiếu rồi bấm "Xác nhận đã nhận"; câu "đang giữ" là đúng thiết kế H3 (ADR-0026 điều 4), có test ghim, chỉ gây hiểu nhầm với chuyển khoản. (3) "Mong đợi" thứ nhất (không tính CK chờ vào "đang giữ") MÂU THUẪN với H3 và trigger Hoàn thành (0045:243-255, bài lo-ghi.test.ts:244-267): làm vậy đơn sẽ Hoàn thành được khi CK chưa xác nhận. (4) Đề xuất thứ hai (máy chủ chặn nộp vượt số giữ) KHÔNG chặn được chuỗi này: Nộp 300.000 khi đang giữ 300.000 là hợp lệ, số dư âm chỉ phát sinh ở bước Xác nhận sau đó (dòng đảo HELD, service.ts:343-347). Cách tính "sổ ghi 200.000 thay vì 500.000" là tổng gộp mọi đơn của /api/ledger/mine (service.ts:537-543); trên từng đơn số dư vẫn đúng và không có màn giao diện nào gọi /api/ledger/mine hay /api/ledger (grep web/ public/ không thấy). Tham chiếu tệp:dòng của báo cáo gốc đúng (web/order.ts:521-561; service.ts:361-397, "398" chỉ thừa một dòng); `kt1.mjs`, `kt3.mjs` nằm ngoài repo nên không đối chiếu được.
>   - *Hướng sửa gợi ý:* Ở máy chủ: khi "Công ty đã nhận", chỉ cho đảo dòng giữ hộ nếu số dư của người khai trên đơn vẫn còn ít nhất bằng dòng đó (nếu đã bị nộp thì trả 409 "đã được ghi nộp, tải lại"), và khi nộp thì chỉ cho phần giữ hộ KHÔNG thuộc khoản CK đang chờ xác nhận; thêm cả hai điều này vào ADR-0092 (hiện điều 2 chỉ phủ dòng quyết toán) cùng một trigger canh dấu số dư và một kiểm R-BIL mới cho KT10. Ở giao diện: không hiện "Đã nộp về công ty" cho phần đang chờ xác nhận CK, và đổi chữ thành "Chờ Kế toán xác nhận công ty nhận" thay vì "đang giữ của công ty".
>   - *Bằng chứng (tệp:dòng):* Dựng lại đường đi theo mã thật (đọc mã, không chạy máy chủ): 1) Bán hàng khai lần thu: web/order.ts:622-629 (hình thức mặc định Chuyển khoản; ô người nhận có "Công ty (vào tài khoản công ty)"). Luật sinh dòng src/modules/billing/rules.ts:94-96: người thu = COMPANY mà người ghi không phải Kế toán ⇒ dòng HELD "người khai nợ công ty" 300.000 (đúng H3, ADR-0026 điều 4). 2) Kế toán mở đơn: src/modules/billing/service.ts:164-198 `tienCuaDon`: `soDu` (dòng 168) → `dangGiu` = mọi bên có số dư > 0 (dòng 195); `choXacNhan` = lần thu COMPANY còn dòng HELD chưa đảo (dòng 173). Hai danh sách được tính ĐỘC LẬP, không trừ nhau. 3) Giao diện dựng hai nút độc lập: web/order.ts:453 → `nutKeToanLanThu` (522-533) hiện "Xác nhận đã nhận" khi `choXacNhan.includes(l.id)`; web/order.ts:464 → `khoiKeToan` (551-565) hiện "${d.ten} đang giữ ${vnd(d.soTien)} của công ty" + nút "Đã nộp về công ty" (dòng 557-561). 4) Bấm "Đã nộp": web/order.ts:561 → POST /api/ledger/settlements (src/modules/billing/index.ts:198-204) → `ghiQuyetToan` service.ts:361-397. Chỉ kiểm dạng dữ liệu (363-384), KHÔNG so với số đang giữ; sinh dòng công ty→A 300.000 (rules.ts:111-113). Số dư A: 300.000 → 0. 5) Sau tải lại: `dangGiu` rỗng nhưng `choXacNhan` vẫn chứa lần thu (service.ts:173 không nhìn dòng SETTLEMENT) ⇒ nút "Xác nhận đã nhận" vẫn còn. 6) Bấm "Xác nhận đã nhận": web/order.ts:529 → POST …/confirm (index.ts:188-195) → `xacNhanCongTyNhan` service.ts:331-355. Chỉ kiểm vai COMPANY (334) và còn dòng HELD chưa đảo (336-337); sinh dòng đảo của HELD (rules.ts:103-108). Trigger migrations/0045_billing_so_cong_no.sql:203-208 chỉ kiểm "đảo khớp gốc"; UNIQUE reverses_line_id chỉ chặn xác nhận lần hai; toàn bộ trigger của 0045 (182-255) không có trigger nào canh dấu số dư. 7) Kết quả: tôi chạy `soDuTheoBen` thật (src/modules/billing/rules.ts:130-138) bằng một tệp tạm ngoài repo: sau lần thu = 300000; sau Đã nộp = 0; sau Xác nhận = -300000. Đúng "Lần thu +300.000 → Nộp/trả −300.000 → Công ty đã nhận −300.000" của báo cáo gốc. 8) Bộ kiểm không thấy: scripts/audit-checks.mjs chỉ có R-BIL-1, 3a, 3b, 4a, 4b, 6, S9, M1, M2 (+ghi chú 2, 5, 7), không có kiểm dấu số dư; khớp KT10 (docs/superpowers/specs/2026-10-02-luot-duyet-2-sua-sai-sau-da-giao-va-so-khong-doi-dau.md:165). Điều KHÔNG kiểm được: không chạy máy chủ/trình duyệt nên không tự xem ảnh `kt-d-o9-hai-nut.png` hay chạy `kt1.mjs`/`kt3.mjs` (nằm ngoài repo, thư mục tạm của phiên kiểm); việc hiện cùng lúc hai nút là suy từ mã (web/order.ts:453, 464), khớp bài lo-ghi.test.ts:366-377 (kt.keToan.dangGiu chứa 250.000 của Bán hàng và choXacNhan chứa đúng lần thu đó).
>   - *Rào chắn đã thấy:* Có rào nhưng không đủ chặn: (a) ADR-0026 điều 4 (H3) chủ ý tính khoản "Công ty thu – CK" chưa xác nhận là tiền người khai đang giữ, được ghim bằng test src/modules/billing/lo-ghi.test.ts:250 và :376 và trigger Hoàn thành migrations/0045_billing_so_cong_no.sql:243-255 (chặn Hoàn thành khi còn bên nợ công ty) — nên "đang giữ" hiện cho khoản CK chờ là ĐÚNG thiết kế, không phải lỗi hiển thị; (b) ghi sổ chỉ cho Kế toán/Toàn quyền: src/shared/permissions.ts:114 `ledger.write` (Quản trị, Bán hàng = none) và route cổng "office" (src/modules/billing/index.ts:188-204), nên người dùng thường không làm được; (c) thứ tự Xác nhận → Nộp được giao diện tự chặn: sau Xác nhận số dư về 0 nên khối "đang giữ" biến mất (service.ts:195); (d) UNIQUE reverses_line_id chặn xác nhận hai lần (service.ts:351); (e) sổ chỉ-thêm + nhật ký `ledger_settlement`, `ledger_company_received` (service.ts:346, 393) nên dấu vết còn, sửa được bằng dòng đảo; (f) tính "đã thu/còn lại" của đơn đi theo lần thu, không theo dòng nợ (rules.ts:65-74), nên số khách đã trả không sai; Hoàn thành mỗi đơn xét theo từng đơn (0045:245-255), nên đơn khác của A vẫn bị giữ đúng. ADR-0092 (nháp, tức TNV-G4, hạn 31/10) có điều 2 "nộp ≤ số đang nợ" nhưng chỉ nói về dòng quyết toán, không nói về dòng "Công ty đã nhận". Không có rào nào chặn chuỗi Nộp → Xác nhận.

---

## 4. TRUNG BÌNH

<a id="HT-24"></a>
### 2. HT-24 · Qua 0 giờ, chuyến ĐANG CHẠY (còn khách trên xe) biến mất khỏi "Cuốc của tôi"

- **Vai:** Tài xế công ty
- **Loại:** lỗi
- **Mức:** Trung bình (người tìm gán Nghiêm trọng, hạ sau kiểm độc lập)
- **Tình trạng:** Mới (lỗi lọc ở màn hình; máy chủ đã trả đủ chuyến)
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (2 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế công ty. **Mức:** CAO (tài xế không mở được chuyến đang chở khách để bấm "Đã trả" / "Kết thúc"; các chuyến sau bị giữ). **Loại:** lỗi.
- **Tái hiện:** tài xế Phan Văn Tài xuất bến CX-0210-03 (ngày chạy 02/10, 23:40) lúc 22:55, đón 2 khách, chưa trả. Lúc 00:01 ngày 03/10 mở `/cuoc`: "Hôm nay — Thứ Bảy 03/10: **Không có cuốc nào.**"; nhóm "Ngày mai" có CX-0410-02 và CX-0410-04 đều "Bị giữ — Xe trùng giờ với chuyến khác: CX-0210-03; Tài xế trùng giờ với chuyến khác: CX-0210-03 (văn phòng lo)". Trong khi đó API mà màn gọi (`GET /cuoc-cua-toi?tu=2026-10-03&den=2026-10-05`) **có** trả CX-0210-03 `RUNNING`; chi tiết chuyến vẫn đúng (`trongNgayChay: true`, còn tên + liên hệ — đúng Q-L3-B).
- **Mong đợi:** chuyến đang chạy luôn đứng đầu danh sách ("Đang chạy") bất kể ngày dự kiến.
- **Bằng chứng:** ảnh `tx2-cuoc-quadem.png`; `kiem-vai/ht/nuadem.out`; `src/shared/tien-do-man.ts:226` (`nhomCuoc` lọc theo `gioXuatBen.ngay` = hôm nay/mai/kia nên chuyến của hôm qua bị bỏ). Lối vào còn lại: bấm lại tin "Bạn được xếp lái…" cũ.
- **MỚI.** **Đề xuất:** thêm nhóm "Đang chạy" (mọi chuyến `RUNNING` trong kết quả) lên đầu `nhomCuoc`; bài thử với chuyến qua nửa đêm.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *góc bác bỏ:* **Xác nhận một phần**; mức đề xuất Trung bình (chặn việc). Lỗi thật, ảnh hưởng việc chính (tài xế không thấy chuyến đang chở khách trong danh sách sau 0 giờ; xe và tài xế bị giữ cho tới khi chuyến được kết thúc), nhưng có đường vòng (trang chi tiết còn mở được qua địa chỉ/tin cũ, văn phòng bấm thay được) và không mất tiền hay dữ liệu; gần ngưỡng CAO nếu chuyến đêm qua 0 giờ là phổ biến.
>   - *Chính xác hoá:* Sửa ba chỗ trong báo cáo gốc. (1) Mức: nên là TRUNG BÌNH, không phải CAO, vì có đường vòng nêu ở "rao_can_tim_thay" (cách nói "tài xế không mở được chuyến" là quá tay — chi tiết chuyến vẫn mở được qua địa chỉ trực tiếp hoặc tin cũ; chỉ danh sách "Cuốc của tôi" không hiện). (2) "Các chuyến sau bị giữ" không phải hậu quả của lỗi giao diện: đó là luật LC-03 có chủ ý (`src/shared/dieu-phoi-kiem.ts:408-410`, một xe/tài xế chỉ một chuyến đang chạy) và chỉ hết khi chuyến đang chạy được kết thúc; lỗi giao diện chỉ làm tài xế khó tự gỡ. Câu chữ "Xe/Tài xế trùng giờ với chuyến khác" ở các chuyến ngày 04/10 gây hiểu lầm (thực ra là "đang có chuyến khác chạy") nhưng là vấn đề chữ riêng, không thuộc HT-24. (3) Số dòng `src/shared/tien-do-man.ts:226` đúng với mã hiện tại (nhưng hàm `nhomCuoc` bắt đầu ở dòng 212; mã nằm trên nhánh `claude/kind-brahmagupta-05esk0`, đầu `1c3339eb`, chứ không phải `main @ dfee4a8c` như đầu báo cáo — hai tệp liên quan `tien-do-man.ts`, `web/cuoc.ts` không đổi gần đây theo `git log`). Phần tái hiện qua đồng hồ giả lúc 00:01 chỉ xem được khi chạy thật; tôi xác nhận bằng đọc mã + chạy luật thuần, và đối chiếu `nuadem.out`/ảnh do người tìm để lại, không tự chạy máy chủ.
>   - *Hướng sửa gợi ý:* Thêm nhóm "Đang chạy" ở đầu danh sách, lấy mọi chuyến trạng thái đang chạy máy chủ đã trả về bất kể ngày dự kiến, rồi loại khỏi ba nhóm ngày để khỏi hiện hai lần; thêm bài kiểm ca chuyến xuất bến hôm qua còn đang chạy sau 0 giờ, và cập nhật chú thích đầu `web/cuoc.ts` cùng `docs/VAN-CHUYEN.md` (hiện vẫn ghi "hôm nay + ngày mai").
>   - *Bằng chứng (tệp:dòng):* Lõi lỗi ĐÚNG như mô tả, tái hiện được bằng mã. (1) Máy chủ cố ý trả cả chuyến đang chạy ngoài khoảng ngày: `src/modules/van-chuyen/chuyen-repo.ts:526` có `AND (t.status = 'RUNNING' OR t.service_date BETWEEN ?2 AND ?3)`, chú thích dòng 520 "hoặc đang chạy"; route `src/modules/van-chuyen/index.ts:1191-1201` truyền thẳng kết quả, không lọc theo ngày. (2) Giao diện lại bỏ nó: `web/cuoc.ts:38` gọi `?tu=${homNay}&den=${addDays(homNay, 2)}` rồi `web/cuoc.ts:45` gọi `nhomCuoc(r.chuyen, homNay)`; `src/shared/tien-do-man.ts:226` `const theoNgay = (ngay) => ds.filter((c) => c.gioXuatBen.ngay === ngay)...` và dòng 227-231 chỉ trả đúng ba nhóm hôm nay/mai/kia, không có nhóm "Đang chạy" nào. Nhánh `moChay`/"Mở chuyến đang chạy" (dòng 223, `web/cuoc.ts:58`) chỉ có tác dụng khi chuyến rơi đúng ngày hôm nay/mai/kia. (3) Tự chạy lại phần luật thuần bằng một đoạn `node` ngoài cây (ghi ở thư mục tạm của phiên): `nhomCuoc([{ngày chạy 2026-10-02, 23:40, RUNNING}], "2026-10-03")` trả `[["Hôm nay",[]],["Ngày mai",[]],["Ngày kia",[]]]` — chuyến biến mất. (4) `node --test src/shared/tien-do-man.test.ts`: 16/16 xanh, tức là KHÔNG bài nào canh ca chuyến RUNNING của ngày hôm qua (bài `nhomCuoc` ở dòng 121-134 chỉ có ca cùng ngày; dòng 128-129 chỉ xác nhận "ngày sau nữa không hiện"). (5) Dữ liệu thật của người tìm còn trong thư mục tạm: `nuadem.out` ghi `TX2 list [["CX-0210-03","2026-10-02","RUNNING"],["CX-0410-02",...],...]` và `trongNgayChay true` có tên + liên hệ; ảnh `tx2-cuoc-quadem.png` cho thấy "Hôm nay — Không có cuốc nào", hai thẻ ngày 04/10 "Bị giữ". Khớp mã. (6) Ý định thiết kế là chuyến qua nửa đêm PHẢI còn thấy được: ADR-0049 dòng 239 và ADR-0053 D7.2/dòng 173 ("hoặc chuyến đang chạy đã xuất bến từ ngày chạy trở đi"), `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-3.md:219` (ca 00:30 ngày D+1 khi RUNNING → có), `src/shared/contracts.ts:1455`. Phần chi tiết chuyến đã làm đúng (không lọc ngày ở `GET /cuoc-cua-toi/:id`, `index.ts:1204-1216`, `trongNgayChay` ở `dieu-phoi-kiem.ts:442`); chỉ danh sách bỏ sót. Các thẻ "Bị giữ" kèm CX-0210-03 là do luật LC-03 có chủ ý (`src/shared/dieu-phoi-kiem.ts:408-410`: chuyến khác của cùng xe/tài xế đang RUNNING → TRUNG_GIO_XE/TAI_XE), chứ không phải hậu quả của việc ẩn danh sách.
>   - *Rào chắn đã thấy:* Không có rào nào ngăn lỗi ở danh sách, nhưng có các đường vòng: (a) Chi tiết chuyến vẫn mở được bằng địa chỉ trực tiếp `/cuoc-chuyen?id=` (`index.ts:1204-1216` không lọc ngày) — tài xế đang đứng sẵn ở trang đó sau khi Xuất bến thì không mất gì, vì trang không phụ thuộc ngày (`web/cuoc-chuyen.ts:28-29`); chỉ mất khi thoát ra / mở lại ứng dụng (ứng dụng mở đầu ở `/cuoc`). (b) Tin trong chuông "Bạn được xếp lái chuyến …" có `lienKet: /cuoc-chuyen?id=` (`src/shared/tin-chuyen.ts:52`), giữ 30 ngày (`src/shared/thong-bao.ts:9` `NGAY_GIU_TIN = 30`) — nhưng tài xế phải biết tìm lại tin cũ. (c) Văn phòng bấm thay đủ lệnh tiến độ cho chuyến đang chạy: `index.ts:1435-1568` (đã tới, đón, vắng, khách huỷ, trả, kết thúc, kết thúc gián đoạn, đổi thứ tự) — cần người thứ hai. (d) Không có cron tự kết thúc chuyến treo (`src/index.ts:204` chỉ đồng bộ danh mục). (e) Không có bài kiểm hay ghi chú "lệch có chủ ý" nào cho trường hợp này; `docs/VAN-CHUYEN.md` và `web/cuoc.ts:3` còn ghi "hôm nay + ngày mai" nên cũng không coi đây là thiết kế cố ý.
> - *góc dựng đường đi:* **Xác nhận**; mức đề xuất Trung bình (chặn việc). Kịch bản thật và có thể gặp với người dùng bình thường (đưa đón sân bay/chuyến tối xuất bến sau khoảng 22:00 rồi qua 0 giờ khi tài xế mở lại ứng dụng); nhưng không mất dữ liệu, không sai tiền, không lộ quyền, và có đường vòng (mở tin cũ, văn phòng bấm thay, giữ nguyên trang chuyến đang mở), nên là sai nghiệp vụ gây khó rõ rệt chứ chưa phải "chặn việc chính không có đường vòng" như mức CAO.
>   - *Chính xác hoá:* Cơ chế và tệp:dòng trong báo cáo gốc đúng (tien-do-man.ts:226 chính xác). Cần chỉnh ba điểm. (1) Câu "tài xế không mở được chuyến đang chở khách" nói quá: tài xế mất LỐI VÀO TỪ DANH SÁCH nhưng vẫn mở được qua liên kết trong tin cũ và văn phòng bấm thay được (báo cáo gốc chỉ nêu một lối là tin cũ, chưa nêu đường bấm thay của văn phòng). (2) "Các chuyến sau bị giữ" là hệ quả đúng luật LC-03 (xe/tài xế chỉ một chuyến đang chạy) chứ không phải lỗi riêng của danh sách; nó chỉ kéo dài chừng nào chuyến chưa được kết thúc, và việc không tìm thấy chuyến trong danh sách chính là lý do làm nó kéo dài. (3) Phần nguyên nhân nên ghi thêm: máy chủ ĐÃ trả chuyến RUNNING (chuyen-repo.ts:526) và DTO chỉ mang ngày dự kiến (tai-xe-dto.ts:22), lỗi nằm hoàn toàn ở phía lọc của `nhomCuoc`; tài liệu mô tả web/cuoc.ts:3-4 và docs/VAN-CHUYEN.md:241 không nhắc ca này. Mức CAO của người tìm nên hạ xuống TRUNG BÌNH. Kịch bản có một điều kiện: chuyến phải thật sự còn RUNNING sau 0 giờ.
>   - *Hướng sửa gợi ý:* Thêm nhóm "Đang chạy" ở đầu danh sách chứa mọi chuyến RUNNING trong phản hồi (không phụ thuộc ngày dự kiến) và không đưa lại chúng vào nhóm theo ngày; thêm bài thử luật thuần cho chuyến RUNNING có ngày dự kiến hôm qua và một bài e2e/Chrome qua nửa đêm.
>   - *Bằng chứng (tệp:dòng):* Đường đi dựng lại từ mã thật (bản đang chạy, cây sạch): (1) Điểm vào là tài xế mở trang /cuoc. Trang này là trang mở đầu của tài xế công ty (src/shared/start-page.ts:28,56 `homeRedirect` -> `TRANG_CUOC`) và là đích của tab/mục "Cuốc của tôi" (web/shell.ts:32,69,277); trang /tai-xe cũng chỉ trỏ về /cuoc (web/tai-xe.ts:23). (2) web/cuoc.ts:32,38 lấy `homNay = vnToday(new Date())` rồi gọi `GET /api/van-chuyen/cuoc-cua-toi?tu=<homNay>&den=<homNay+2>`. (3) Route src/modules/van-chuyen/index.ts:1191-1201 gọi `tripsCuaTaiXe`; câu SQL src/modules/van-chuyen/chuyen-repo.ts:524-527 chủ ý lấy `(t.status = 'RUNNING' OR t.service_date BETWEEN ?2 AND ?3)` (chú thích dòng 520: "hoặc đang chạy"), nên chuyến RUNNING của hôm qua VẪN nằm trong phản hồi. (4) DTO mỗi chuyến chỉ mang `gioXuatBen: gioVn(t.planned_start_ms)` tức NGÀY DỰ KIẾN (src/modules/van-chuyen/tai-xe-dto.ts:22). (5) web/cuoc.ts:45 gọi `nhomCuoc(r.chuyen, homNay)`; src/shared/tien-do-man.ts:212-231 chỉ dựng đúng ba nhóm, mỗi nhóm lọc bằng `theoNgay` tại dòng 226 `ds.filter((c) => c.gioXuatBen.ngay === ngay)` với ngay = hôm nay / mai / kia. Không có nhánh nào cho `trangThai === "RUNNING"` ngoài ba ngày đó (dòng 217 và 223 chỉ đặt chip/nút cho chuyến ĐÃ lọt vào nhóm). Chuyến dự kiến 02/10 xuất bến 22:55 mà lúc 00:01 ngày 03/10 `homNay` = 03/10 nên bị loại: "Hôm nay" hiện web/cuoc.ts:61 "Không có cuốc nào." (6) Tự chạy thử luật thuần: gọi `nhomCuoc` với một mục `{gioXuatBen:{ngay:"2026-10-02",gio:"23:40"}, trangThai:"RUNNING"}` và homNay "2026-10-03" cho kết quả `[["Hôm nay",[]],["Ngày mai",[]],["Ngày kia",[]]]` (chuyến biến mất). `node --test src/shared/tien-do-man.test.ts` xanh 16/16 nhưng bài nhomCuoc (dòng 121-134) chỉ có ca RUNNING CÙNG ngày (30/09), không có ca qua nửa đêm, nên lỗ này không bị bài nào bắt. (7) Chi tiết chuyến vẫn đúng như báo cáo: `GET /cuoc-cua-toi/:id` (index.ts:1204-1215) không lọc ngày và `trongNgayChay` (src/shared/dieu-phoi-kiem.ts:442-444) có vế "RUNNING và ngày VN của giờ xuất bến >= ngày chạy" chủ ý phủ chuyến qua nửa đêm; ADR-0053 dòng 57, 219, 222 ghi rõ ca "00:30 ngày D+1 khi RUNNING -> có tên". Tức máy chủ và ADR đã tính tới chuyến qua nửa đêm, chỉ riêng danh sách giao diện bỏ sót. (8) Về "các chuyến sau bị giữ": src/shared/dieu-phoi-kiem.ts:403-410 cho mọi chuyến PLANNED cùng xe hoặc cùng tài xế với một chuyến RUNNING lý do TRUNG_GIO_XE / TRUNG_GIO_TAI_XE bất kể giờ (đúng LC-03 trong ADR-0049 dòng 125: mỗi xe, mỗi tài xế chỉ một chuyến đang chạy). Lý do giữ sẽ tự hết khi chuyến RUNNING được kết thúc. Không thể kiểm bằng ảnh chụp hay chạy thật (không chạy máy chủ theo quy tắc), nhưng đường đi trên đủ để kết luận từ mã.
>   - *Rào chắn đã thấy:* Không có rào chắn nào chặn lỗi này ở danh sách. Có các đường vòng: (a) tin "Bạn được xếp lái …" và "Văn phòng vừa sửa …" mang liên kết `/cuoc-chuyen?id=<id>` (src/shared/tin-chuyen.ts:52,54), mở thẳng chi tiết chuyến, không lọc ngày; chưa kiểm được tin cũ còn nằm trong hộp thông báo bao lâu. (b) Trang /cuoc-chuyen?id=... đang mở sẵn không phụ thuộc danh sách (web/cuoc-chuyen.ts:28 đọc id từ URL), nên tài xế đang đứng trên trang chuyến lúc qua 0 giờ vẫn thao tác được; chỉ lúc mở lại ứng dụng (trang đầu là /cuoc) mới mất lối vào. (c) Văn phòng bấm thay bằng route cổng `office` có ô `trip.progress`: `POST /api/van-chuyen/chuyen/:id/ket-thuc`, `.../ket-thuc-gian-doan`, `.../phan-bo/:aid/tra`, `.../diem/:sid/da-toi` (index.ts:1435,1511,1530,1549). (d) Máy chủ đã cố ý trả chuyến RUNNING ngoài khoảng ngày (chuyen-repo.ts:526), chỉ phía hiển thị loại bỏ. (e) Không tìm thấy việc tự đóng chuyến RUNNING bị bỏ quên trong mã van-chuyen (không có cron/scheduled ở module này), nên chuyến không được tài xế kết thúc sẽ tiếp tục giữ xe và tài xế.

<a id="HT-03"></a>
### 3. HT-03 · Một chạm "Xuất bến" nhầm chuyến của 3 ngày sau: không hỏi lại, không sửa / huỷ được, khoá luôn xe + tài xế cho các…

- **Vai:** Tài xế công ty (+ Quản trị gỡ)
- **Loại:** lỗi / bất hợp lý
- **Mức:** Trung bình (người tìm gán Nghiêm trọng, hạ sau kiểm độc lập)
- **Tình trạng:** Mới (thiếu rào hỏi lại); "chỉ đi tiến" là luật lõi đã duyệt (LC-07)
- **Hướng xử lý:** Rào hỏi lại: sửa mã. Lệnh hoàn tác: cần ADR (đổi LC-07)
- **Kiểm độc lập:** Xác nhận một phần (2 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế công ty (+ Quản trị gỡ). **Mức:** CAO (chặn việc chính, dữ liệu sai). **Loại:** lỗi / bất hợp lý.
- **Tái hiện:** chuyến CX-0510-01 (ngày 05/10, hôm nay 02/10). Tài xế mở chuyến — nút đỏ to "Xuất bến" luôn bấm được, chỉ ghi "giờ ghi là lúc bấm (22:59)", không nhắc ngày chạy; bấm một lần (không hộp xác nhận) → 200 `RUNNING`. Còn bấm tiếp được "Đã tới" + "Đã đón" (200) ba ngày trước tour. Quản trị: `PUT /chuyen/:id` → 409 `xe_dang_chay`; `POST /chuyen/:id/huy` → 409 `xe_dang_chay`. Tài xế xuất bến chuyến hôm 04/10 (CX-0410-01) → 409 **"Xe trùng giờ với chuyến khác: CX-0510-01; Tài xế trùng giờ với chuyến khác: CX-0510-01"** (hai chuyến khác ngày). Đường gỡ duy nhất: "Kết thúc gián đoạn" với lý do Xe hỏng / Tai nạn / Khác → ghi nhận sai sự thật, khách về "Chưa xếp".
- **Mong đợi:** chặn hoặc hỏi lại khi xuất bến khác ngày chạy (hoặc quá sớm so với giờ dự kiến); văn phòng có lệnh "huỷ xuất bến nhầm" có lý do; câu báo "trùng giờ" không dùng cho chuyến khác ngày.
- **Bằng chứng:** `kiem-vai/ht/s22.mjs`, `s23.mjs`, `s24.mjs` (status như trên); trigger `vc_trip_driver_one_running` `migrations/0042_chuyen_xe.sql:383`; ảnh `tx-cuoc-T1.png` (nút Xuất bến ở chuyến ngày kia, "Đạt hết"). Hai lần bấm nhanh liên tiếp (dblclick) gửi **hai** lệnh với hai `requestId` khác nhau (lệnh 2 → 409 `da_xuat_ben`, vô hại) — `tx2-T9` log.
- **MỚI** (e2e `tai-xe-cuoc.mjs` cố ý coi "xuất bến sớm" là hợp lệ; chưa ai ghi hậu quả khoá xe/tài xế và không gỡ được).
- **Đề xuất:** hộp xác nhận "Xuất bến chuyến ngày dd/mm?" khi khác ngày chạy hoặc sớm hơn giờ dự kiến quá X phút; thêm lệnh văn phòng "Hoàn tác xuất bến" (khi chưa có tiến độ khách).

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *góc bác bỏ:* **Xác nhận một phần**; mức đề xuất Trung bình (chặn việc). Lỗi thật và thiếu rào (một chạm, không hỏi lại, không hoàn tác, khoá xe + tài xế), nhưng có đường vòng ngay lập tức là "Kết thúc gián đoạn" của tài xế hoặc văn phòng, không liên quan tiền, không lộ dữ liệu, không vượt quyền; cái giá là ghi nhận sai sự thật (lý do Xe hỏng/Tai nạn/Khác) và phải dựng lại chuyến, xếp lại khách. Không đạt ngưỡng CAO "không có đường vòng".
>   - *Chính xác hoá:* (1) "không nhắc ngày chạy" chưa chính xác: dòng đầu trang xuất bến có hiện ngày và giờ chuyến (web/cuoc-chuyen.ts:259, định dạng dd/mm HH:MM); chỉ dòng chân nút (:278) chỉ ghi giờ bấm. (2) "chuyến của 3 ngày sau" qua giao diện danh sách thì không tới được (danh sách dừng ở Ngày kia, tien-do-man.ts:212-231); chỉ tới được bằng đường dẫn trong tin xếp lái (tin-chuyen.ts:52) hoặc gõ địa chỉ; trong danh sách là sớm tối đa 2 ngày. (3) Mức CAO bị đánh giá quá: có đường vòng "Kết thúc gián đoạn" (chính báo cáo cũng nêu), nên hạ xuống TRUNG BÌNH. (4) Đề xuất "thêm lệnh Hoàn tác xuất bến" xung đột với bất biến đã duyệt LC-07 "trạng thái chỉ đi tiến" (ADR-0049:88,128; trigger 0042:440-443) — cần ADR mới do chủ duyệt, không phải sửa mã đơn thuần. (5) Câu "dữ liệu sai" chỉ đúng khi tài xế tiếp tục bấm Đã tới/Đã đón; riêng "Xuất bến" nhầm thì chỉ chuyến chuyển RUNNING và khoá xe/tài xế. Lần bấm đúp gửi hai lệnh khác requestId chưa kiểm được vì không chạy máy chủ.
>   - *Hướng sửa gợi ý:* Thêm rào ở cổng xuất bến dùng chung máy chủ và màn hình: chặn hoặc bắt xác nhận (hộp hỏi nêu rõ ngày chuyến) khi ngày hôm nay khác ngày chạy hoặc sớm hơn giờ dự kiến quá một ngưỡng; sửa câu báo "trùng giờ" để nói rõ chuyến đang chạy khác ngày. Muốn có lệnh "hoàn tác xuất bến" thì phải qua ADR mới sửa bất biến chỉ-đi-tiến; trước mắt có thể cho văn phòng một đường kết thúc nhầm với lý do riêng "Xuất bến nhầm" thay vì mượn Xe hỏng/Tai nạn/Khác.
>   - *Bằng chứng (tệp:dòng):* Cơ chế lỗi đúng như mô tả, đọc từ mã thật. (1) Không có cổng ngày/giờ khi xuất bến: `kiemXuatBen` (src/shared/dieu-phoi-kiem.ts:324-427) chỉ xét xe, tài xế, giấy tờ, suất, nơi trả, nghỉ, trùng chuyến đang chạy; không so `ngayChay` hay giờ dự kiến với "bây giờ". `kiemGioXayRa` (src/shared/gio-xay-ra.ts:68-113) không có mốc "xuất bến sớm nhất"; ADR-0053 D7.2 dòng 59 thừa nhận đúng điều này: "mã hôm nay không có mốc 'xuất bến sớm nhất'". Route tài xế `POST /api/van-chuyen/cuoc-cua-toi/:id/xuat-ben` (src/modules/van-chuyen/index.ts:1219-1239) và `lenhXuatBen` (dieu-phoi-tien-do.ts:59-114) chỉ kiểm `t.status === "PLANNED"` rồi chạy lô. (2) Không hỏi lại: web/cuoc-chuyen.ts:275-278 gắn thẳng `click` → `chay("xuat-ben", () => gui("xuat-ben"))`, không hộp xác nhận; dòng chân nút chỉ ghi `Bấm lúc xe lăn bánh — giờ ghi là lúc bấm (HH:MM)`; nút chỉ bị khoá khi `thieu.length > 0`. Bài e2e tests/e2e/tai-xe-cuoc.mjs:88-98 cố ý coi xuất bến sớm là hợp lệ (chỉ canh việc không lộ tên khách). (3) Không sửa/huỷ được: `khongConKeHoach` (dieu-phoi-lenh.ts:32-35) dùng cho `lenhHuy` (:264) trả 409 `xe_dang_chay` khi RUNNING; `kiemTaoSuaChuyen` dòng 104 (dieu-phoi-kiem.ts) chặn `CHUYEN_KHONG_CON_LEN_KE_HOACH` rồi `loiKiem` (dieu-phoi-route.ts:74) đổi thành `xe_dang_chay` cho `PUT /chuyen/:id`. Trigger `vc_trip_status_forward` (migrations/0042_chuyen_xe.sql:440-443) cấm RUNNING→PLANNED. (4) Khoá xe + tài xế: chỉ mục duy nhất `vc_trip_one_running_vehicle` (0042:61) và trigger `vc_trip_driver_one_running` (0042:383-389); ở tầng máy chủ, `TRIPS_TOUCHING` (chuyen-repo.ts:49) luôn kéo mọi chuyến RUNNING bất kể ngày, rồi `kiemXuatBen` dòng 408-410 đẩy `TRUNG_GIO_XE`/`TRUNG_GIO_TAI_XE` với chữ "Xe trùng giờ với chuyến khác" / "Tài xế trùng giờ với chuyến khác" (src/shared/ly-do-giu.ts:44-45) — không phân biệt chuyến khác ngày. (5) Đường gỡ duy nhất đúng như báo cáo: "Kết thúc gián đoạn" (tài xế route 28, văn phòng bấm thay route 38 index.ts:1549) với lý do chỉ gồm Xe hỏng/Tai nạn/Khác (migrations/0041_chinh_sach_dieu_phoi.sql:126-128); `loKetThucGianDoan` (dieu-phoi.ts:439-448) đóng suất `TRIP_INTERRUPTED`, bỏ điểm, đặt ENDED_INTERRUPTED. Điều không kiểm được vì cấm chạy máy chủ: các mã trạng thái HTTP thực tế (chỉ suy từ mã), lần bấm đúp gửi hai requestId.
>   - *Rào chắn đã thấy:* Không có rào chắn nào ngăn kịch bản. Chỉ có các yếu tố giảm nhẹ/ý đồ thiết kế: (a) Trang xuất bến của tài xế CÓ hiện ngày chuyến ở dòng đầu trang: web/cuoc-chuyen.ts:95 (tiêu đề `Xuất bến ${c.ma}`) và :259 (`${c.bienSo} · ${formatDm(c.gioBatDau.ngay)} ${c.gioBatDau.gio} · N khách`) — chỉ dòng chân nút (:278) không nhắc ngày. (b) Danh sách "Cuốc của tôi" chỉ có ba nhóm Hôm nay/Ngày mai/Ngày kia (src/shared/tien-do-man.ts:212-231; web/cuoc.ts không có nút Xuất bến), nên chuyến trước 3 ngày chỉ mở được qua đường dẫn trong tin "Bạn được xếp lái …" (src/shared/tin-chuyen.ts:52, lienKet `/cuoc-chuyen?id=`) hoặc gõ địa chỉ; trong danh sách là tối đa 2 ngày trước. (c) "Chỉ đi tiến" là bất biến có chủ ý: LC-07 ở ADR-0049:88,128 và trigger 0042:440-443, nên không có lệnh hoàn tác xuất bến. (d) Mở tên/SĐT khách đã được siết theo ngày chạy (`trongNgayChay`, dieu-phoi-kiem.ts:442-444; ADR-0053 D7.2) nên xuất bến sớm không làm lộ dữ liệu cá nhân. (e) Lối thoát luôn mở: tài xế hoặc văn phòng bấm "Kết thúc gián đoạn" không bị chặn giờ, giải phóng ngay xe/tài xế. Không ADR/đặc tả nào nói rằng "xuất bến khác ngày vẫn bình thường, khoá xe là chấp nhận được"; chỉ có thừa nhận thiếu mốc ở ADR-0053 dòng 59 và e2e coi xuất bến sớm là hợp lệ cho mục đích riêng tư.
> - *góc dựng đường đi:* **Xác nhận một phần**; mức đề xuất Trung bình (chặn việc). Cần một lần bấm nhầm nút lớn không có hộp xác nhận, nhưng không sai tiền, không lộ dữ liệu, và có đường vòng chính thức (Kết thúc gián đoạn do tài xế hoặc văn phòng bấm, khách về Chưa xếp, dựng lại chuyến mới). Hậu quả thật là khoá xe + tài xế cho mọi chuyến khác tới khi có người gỡ và ghi lý do sai sự thật, nên nặng hơn lỗi trải nghiệm nhưng chưa đủ "chặn việc chính không có đường vòng" của mức CAO.
>   - *Chính xác hoá:* (1) "không nhắc ngày chạy" chưa chính xác: dòng thông tin nhỏ trên cùng của màn có ngày dd/mm (web/cuoc-chuyen.ts:259) và thanh tiêu đề có mã chuyến; đúng là chỉ chân trang nút (:278) không nhắc ngày và không có cảnh báo hay hộp xác nhận. (2) "không gỡ được" và mức CAO là quá tay: gỡ được bằng "Kết thúc gián đoạn" (chính báo cáo gốc cũng nêu), chỉ là phải khai lý do không đúng (Xe hỏng/Tai nạn/Khác) và chuyến thành trạng thái cuối nên phải tạo chuyến mới, xếp lại khách; "không sửa / huỷ được" thì đúng. (3) Phạm vi khoá rộng hơn mô tả: không chỉ chuyến lân cận ngày mà MỌI chuyến cùng xe/tài xế đều bị chặn xuất bến vì `TRIPS_TOUCHING` lấy mọi chuyến RUNNING bất kể ngày (chuyen-repo.ts:49); kể cả chuyến ngày mai của chính tài xế đó, tức là có thể làm trễ một chuyến thật chứ không chỉ chuyến 04/10. (4) Báo cáo nên ghi rõ đường vào của chuyến cách 3 ngày: danh sách "Cuốc của tôi" chỉ hiện đến ngày kia (web/cuoc.ts:38), chuyến CX-0510-01 chỉ mở qua tin "Bạn được xếp lái" hoặc đường dẫn. (5) Nhãn "MỚI" chỉ đúng một phần: việc không có mốc xuất bến sớm nhất đã được ghi nhận ở ADR-0053:59 (như một sự thật, không phải quyết định chấp nhận); phần hậu quả khoá xe/tài xế và không có lệnh hoàn tác là mới. (6) Chi tiết hai lần bấm nhanh gửi hai requestId khác nhau khớp mã (web/dieu-phoi-ui.ts:22-31: `dangCho` chỉ được gán khi lỗi) và vô hại; không cần sửa.
>   - *Hướng sửa gợi ý:* Thêm cổng ngày/giờ ở luật dùng chung cho cả máy chủ lẫn màn hình: xuất bến sớm hơn giờ dự kiến quá một ngưỡng (hoặc khác ngày chạy) thì màn tài xế hỏi lại bằng hộp xác nhận ghi rõ ngày chạy, và máy chủ chỉ nhận khi có xác nhận (cần chủ chốt ngưỡng vì chạm luật lõi chuyến, ADR mới nếu đổi). Đồng thời nên cho văn phòng một lệnh "huỷ xuất bến nhầm" có lý do khi chưa có tiến độ khách (cần chủ duyệt vì đổi vòng đời chuyến), và đổi câu "trùng giờ" thành lời đúng sự thật khi chuyến gây chặn khác ngày.
>   - *Bằng chứng (tệp:dòng):* DỰNG LẠI ĐƯỜNG ĐI (đọc mã thật, nhánh hiện tại): 1) Điểm vào: văn phòng xếp tài xế vào chuyến vài ngày sau; tin "Bạn được xếp lái CX-…" có liên kết `/cuoc-chuyen?id=` (src/shared/tin-chuyen.ts:52). Danh sách "Cuốc của tôi" chỉ hiện hôm nay đến ngày kia (web/cuoc.ts:38 `den=addDays(homNay,2)`; src/shared/tien-do-man.ts:212-231), nên chuyến cách 3 ngày như CX-0510-01 chỉ mở được qua tin hoặc đường dẫn; chuyến ngày kia mở thẳng từ danh sách. 2) Màn chuyến chưa xuất bến: dòng nhỏ "biển số · dd/mm giờ · N khách" (web/cuoc-chuyen.ts:259), nút "Xuất bến" chỉ khoá khi còn thiếu điều kiện giấy tờ/danh sách (web/cuoc-chuyen.ts:275 `disabled: thieu.length > 0`), chân trang "Bấm lúc xe lăn bánh — giờ ghi là lúc bấm" (:278). Bấm là gửi ngay, không hộp xác nhận (:277 `click → chay("xuat-ben", () => gui("xuat-ben"))`). 3) Máy chủ: POST /api/van-chuyen/cuoc-cua-toi/:id/xuat-ben (src/modules/van-chuyen/index.ts:1219-1239) chỉ hỏi `trip.progress` + đang lái → `lenhXuatBen` (src/modules/van-chuyen/dieu-phoi-tien-do.ts:59-114). Các cổng: trạng thái PLANNED (:63), `kiemGioLenh` (:71), `kiemXuatBen` (:77). `kiemGioXayRa` (src/shared/gio-xay-ra.ts:68-113) không so giờ xuất bến với giờ/ngày chạy dự kiến; `kiemXuatBen` (src/shared/dieu-phoi-kiem.ts:324-427) cũng không so `ngayChay`. Tự chạy lại luật thuần trên bản sao test nằm ở thư mục tạm (không đụng repo): xuất bến sớm 3 ngày vẫn `dat === true`. 4) Hậu quả 1 (khoá sửa/huỷ): PUT chuyến → `kiemTaoSuaChuyen` đẩy lý do CHUYEN_KHONG_CON_LEN_KE_HOACH khi trạng thái ≠ PLANNED (src/shared/dieu-phoi-kiem.ts:104); huỷ → `khongConKeHoach` (src/modules/van-chuyen/dieu-phoi-lenh.ts:32-35, :262-265); cả hai đổi thành mã `xe_dang_chay` (src/modules/van-chuyen/dieu-phoi-route.ts:42, :74) — khớp 409 trong báo cáo gốc. Không có lệnh "hoàn tác xuất bến" nào (grep toàn repo chỉ thấy trong chính báo cáo lỗi). 5) Hậu quả 2 (khoá xe + tài xế): câu đọc chuyến khác `TRIPS_TOUCHING` lấy MỌI chuyến `RUNNING` bất kể ngày (src/modules/van-chuyen/chuyen-repo.ts:49); `kiemXuatBen` thấy chuyến RUNNING cùng xe/tài xế thì đẩy TRUNG_GIO_XE / TRUNG_GIO_TAI_XE (src/shared/dieu-phoi-kiem.ts:403-410), nhãn "Xe trùng giờ với chuyến khác" (src/shared/ly-do-giu.ts:44-45). Lưới thứ hai ở CSDL: trigger vc_trip_driver_one_running (migrations/0042_chuyen_xe.sql:383-389). Phép thử riêng (bản sao tạm): thêm một chuyến khác RUNNING cùng xe/tài xế cách 3 ngày vào `kiemXuatBen` → trả đúng "Xe trùng giờ với chuyến khác: CX-0510-01" và "Tài xế trùng giờ với chuyến khác: CX-0510-01", y hệt câu trong báo cáo gốc. 6) Đường gỡ: "Kết thúc gián đoạn" có cả ở màn tài xế (web/cuoc-chuyen.ts:124-125, :194-235) lẫn màn văn phòng bấm thay (web/chuyen.ts:307-323; route src/modules/van-chuyen/index.ts:1549-1557); lý do trong danh mục chỉ có Xe hỏng / Tai nạn / Khác (migrations/0041_chinh_sach_dieu_phoi.sql:126-128); lệnh đóng mọi suất còn chờ/đang trên xe (src/modules/van-chuyen/chuyen-repo.ts:506-511; lô ở dieu-phoi.ts:439-448) nên khách về "Chưa xếp", chuyến thành trạng thái cuối (ENDED_INTERRUPTED) và xe/tài xế được giải phóng. 7) "Đã tới"/"Đã đón" 3 ngày trước tour: `lenhDaToi`/`lenhSuat` (dieu-phoi-tien-do.ts:117-162) chỉ kiểm trạng thái, điểm đã tới và `kiemGioLenh`; không có vế giờ dự kiến — đúng như mô tả. Bài test nhanh đã chạy: `node --test` trên bản sao tạm của src/shared/dieu-phoi-kiem.test.ts kèm 2 ca thêm (39/39 xanh); `git status` sạch, không sửa repo.
>   - *Rào chắn đã thấy:* (a) Tên và SĐT khách KHÔNG lộ khi xuất bến sớm: `trongNgayChay` chỉ mở khi hôm nay là ngày chạy hoặc xuất bến vào/sau ngày chạy (src/shared/dieu-phoi-kiem.ts:442-444; áp ở index.ts:1210; e2e tests/e2e/tai-xe-cuoc.mjs:88-98 ghim điều này). (b) Máy chủ chặn xuất bến nếu xe/tài xế đang chạy chuyến khác (nên không có hai chuyến RUNNING song song, dữ liệu không hỏng). (c) Màn chuyến có hiện ngày dd/mm trong dòng thông tin nhỏ (web/cuoc-chuyen.ts:259) và mã chuyến trên thanh tiêu đề (:95); câu báo trùng giờ có nêu mã chuyến gây chặn nên văn phòng truy ra được thủ phạm. (d) Nhật ký ghi lệnh xuất bến và kết thúc gián đoạn (dieu-phoi.ts:350, :442) nên không mất dấu vết. (e) Kết thúc gián đoạn do chính tài xế hoặc văn phòng bấm được, một thao tác + chọn lý do. (f) Không rào nào chặn/hỏi lại theo ngày chạy hay giờ dự kiến; ADR-0053 chỉ chấp nhận "xuất bến sớm" vì lý do riêng tư (docs/adr/ADR-0053-dieu-phoi-luot-3-tai-xe-doi-tac.md:59, :220), không đặt ngưỡng sớm tối đa.

<a id="HT-01"></a>
### 4. HT-01 · Thứ tự điểm dừng tự dựng sai: điểm TRẢ chung đứng trước điểm ĐÓN của đơn xếp sau, mà chuyến vẫn "Đạt hết"

- **Vai:** Điều phối (Quản trị) → Tài xế công ty
- **Loại:** sai
- **Mức:** Trung bình (người tìm gán Nghiêm trọng, hạ sau kiểm độc lập)
- **Tình trạng:** Mới; bất biến mong muốn đã ghi ở rà soát 27/9 nhưng mã chưa cài
- **Hướng xử lý:** Chạm luật lõi chuyến: cần chủ / ADR
- **Kiểm độc lập:** Xác nhận một phần (2 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Điều phối (Quản trị) → Tài xế công ty. **Mức:** CAO (xe chạy đúng thứ tự trên màn sẽ bỏ khách / khách "xuống" trước khi "lên"; chặn việc chính). **Loại:** sai.
- **Mô tả:** Xếp hai đơn cùng nơi trả (Bến tàu) lên một xe trong một lần bấm: máy dựng điểm theo thứ tự gặp: 1 Đón Mường Thanh → **2 Trả Bến tàu (6 khách)** → 3 Đón Novotel. Hai khách Novotel có "điểm xuống" là điểm 2, đứng trước "điểm lên" là điểm 3. Không có cảnh báo; khối "Điều kiện xuất bến" ghi **"Đạt hết"**, dòng "Điểm khớp đơn ✓". Màn tài xế hiện y thứ tự đó. Thêm: máy cũng nhận lệnh đảo thứ tự (nút ↑↓ của tài xế / route `thu-tu`) đưa điểm trả lên trước điểm đón (200).
- **Tái hiện:** Bán hàng A lập TD-…0001 (4 khách, đón KS Mường Thanh 07:30 → Bến tàu); Bán hàng B lập TD-…0002 (2 khách, đón KS Novotel 07:45 → Bến tàu); xác nhận cả hai. Quản trị tạo chuyến 07:00–09:30, `POST /chuyen/:id/phan-bo` với `chang: [{O1 đi, 4}, {O2 đi, 2}]`. Mở `/chuyen?id=…` và `/cuoc-chuyen?id=…` (tài xế).
- **Thấy:** `diem = [1 PICKUP Mường Thanh 07:30, 2 DROPOFF Bến tàu, 3 PICKUP Novotel 07:45]`, `lyDoGiu: []`, `canhBao: []`. Đảo trả lên đầu: `POST /cuoc-cua-toi/:id/thu-tu` → 200, `[[1,"DROPOFF"],[2,"PICKUP"]]`.
- **Mong đợi:** điểm trả của mọi suất đứng sau điểm đón của suất đó (dựng đúng ngay, hoặc ít nhất giữ chuyến / cảnh báo "khách xuống trước khi lên"); lệnh đổi thứ tự vi phạm bị từ chối.
- **Bằng chứng:** ảnh `qt-chuyen-T1.png`, `tx-cuoc-T1.png`; mã `src/modules/van-chuyen/dieu-phoi-route.ts:107-116` (`diemChoKhoa`: điểm mới luôn `seq = max + 1`, dùng lại điểm trả cũ cùng khoá nơi), không có luật nào so `board.seq < alight.seq` (grep `src/shared/dieu-phoi-kiem.ts`, `dieu-phoi-tien-do.ts`).
- **MỚI** (khác "máy tự xếp thứ tự điểm đón" ở BACKLOG §15 câu 20 — đó là tối ưu tuyến; đây là thứ tự **vô lý** mà máy cho qua).
- **Đề xuất:** khi dựng/đổi thứ tự điểm, chèn điểm đón mới trước điểm trả đầu tiên của nó và thêm luật "điểm lên trước điểm xuống" vào kiểm xếp + kiểm xuất bến + route đổi thứ tự.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *góc bác bỏ:* **Xác nhận**; mức đề xuất Trung bình (dữ liệu). Lỗi thật và dễ gặp (hai đơn khác nơi đón, chung nơi trả — kiểu "khách sạn → bến tàu" — là ca thường ngày), máy còn báo "Đạt hết" nên không ai được cảnh báo; nhưng không sai tiền, không lộ/mất dữ liệu, không vượt quyền, và KHÔNG chặn hẳn việc chính vì tài xế vẫn bấm "Đã tới" theo thứ tự thực tế hoặc đảo bằng ↑↓, kết thúc chuyến bình thường. Hậu quả chủ yếu là kế hoạch/màn tài xế hiển thị vô lý và dễ nhầm; nên hạ từ CAO xuống TRUNG BÌNH.
>   - *Chính xác hoá:* (1) Mức: báo cáo gốc gán CAO với lý do "chặn việc chính"; mã cho thấy KHÔNG chặn — `lenhDaToi` không ép thứ tự seq và tài xế đảo được điểm PENDING; đề xuất hạ xuống TRUNG BÌNH. (2) Tệp:dòng: `diemChoKhoa` nằm ở src/modules/van-chuyen/dieu-phoi-route.ts:108-117 (báo cáo ghi 107-116, lệch 1 dòng). (3) Báo cáo ghi "grep src/shared/dieu-phoi-kiem.ts, dieu-phoi-tien-do.ts" — dieu-phoi-tien-do.ts nằm ở src/modules/van-chuyen/, không phải src/shared/. (4) Nên bổ sung bằng chứng mạnh hơn mà báo cáo bỏ sót: lỗi cũng xảy ra qua nhiều lần xếp riêng (điểm trả PENDING cũ được tái dùng), trigger CSDL cũng không chặn, và giao diện văn phòng không có chỗ sắp lại điểm TRƯỚC khi xuất bến (web/chuyen-sua.ts không gửi `diem`; nút ↑↓ chỉ khi RUNNING, web/chuyen.ts:275-277). (5) Báo cáo ghi mã @ dfee4a8c (1.77), đề bài ghi 1.76 — HEAD hiện chỉ thêm commit tài liệu nên mã liên quan giống nhau. Các số khác (seq 1/2/3, 6 khách, "Đạt hết") khớp với mã, không sai.
>   - *Hướng sửa gợi ý:* Khi dựng điểm (`diemChoKhoa`/xếp/dời/cập nhật điểm), chèn điểm đón trước điểm trả đầu tiên của chính suất đó, hoặc không tái dùng điểm trả có seq nhỏ hơn điểm đón; thêm một luật thuần "điểm lên đứng trước điểm xuống" dùng chung cho kiểm xếp, cổng xuất bến (lý do giữ mới) và `lenhDoiThuTu`/sửa chuyến (từ chối 409). Việc này chạm luật lõi chuyến và có thể cần trigger mới nên theo CLAUDE.md §3 phải qua chủ/ADR (bất biến đã nêu ở bản rà soát 2026-09-27 mục 14).
>   - *Bằng chứng (tệp:dòng):* Đã đọc mã thật, không bác bỏ được; cơ chế đúng như báo cáo. (1) src/modules/van-chuyen/dieu-phoi-route.ts:108-117 `diemChoKhoa`: tìm điểm PENDING cùng (loại, place_key) trong `stops` hoặc `moi` thì DÙNG LẠI id (dòng 111-112); không có thì tạo điểm mới với `seq = max + 1` (dòng 113). (2) src/modules/van-chuyen/dieu-phoi-lenh.ts:142-145 `lenhXepLo` gọi lần lượt, mỗi chặng: điểm đón rồi điểm trả (`diemChoKhoa(... "PICKUP" ...)` rồi `diemChoKhoa(... "DROPOFF" ...)`). Với hai chặng cùng nơi trả, khác nơi đón: chặng 1 tạo đón MT seq1 + trả BT seq2; chặng 2 tạo đón Novotel seq3 và TÁI DÙNG trả BT seq2 ⇒ điểm xuống (2) đứng trước điểm lên (3). Tôi chép nguyên văn logic dòng 108-117 sang một tệp mô phỏng ở thư mục tạm (không chạm repo) và chạy `node sim.mjs`: kết quả `lên seq 1 -> xuống seq 2 ok` và `lên seq 3 -> xuống seq 2 XUỐNG TRƯỚC KHI LÊN`. Lỗi cũng xảy ra khi xếp hai đơn ở hai lần bấm riêng (điểm trả PENDING cũ vẫn được tái dùng). (3) Không luật nào so thứ tự lên/xuống: src/shared/dieu-phoi-kiem.ts `kiemXep` (246) và `kiemXuatBen` (324-427) không có so `seq`; chỉ `noiLechCuaSuat` (281-286) so `placeKey` nên "Điểm khớp đơn" và "Đạt hết" vẫn đúng; src/shared/ly-do-giu.ts `MA_GIU` không có mã nào về thứ tự; `grep seq` trong src/shared/dieu-phoi-lich-chung.ts, gio-xay-ra.ts, dieu-phoi-gio.ts không ra gì. (4) Lệnh đổi thứ tự: src/modules/van-chuyen/dieu-phoi-tien-do.ts:210-232 `lenhDoiThuTu` chỉ kiểm điểm thuộc chuyến, trạng thái PENDING, không trùng seq (214-221), không kiểm lên<xuống ⇒ 200; phía giao diện src/shared/tien-do-man.ts:93-101 `thanDoiThuTu` chỉ hoán đổi hai điểm PENDING kề nhau; bài src/modules/van-chuyen/cuoc-cua-toi.test.ts:177-193 chỉ thử dời điểm trả từ seq 2 sang 7 (vẫn sau điểm đón), không có ca đưa điểm trả lên trước điểm đón. (5) Trigger CSDL: migrations/0042_chuyen_xe.sql:311-315 `vc_trip_allocation_stop_scope` chỉ kiểm điểm thuộc đúng chuyến + đúng loại; :542-544 `vc_trip_running_locked_stop_upd` chỉ khoá đổi seq của điểm ĐÃ tới; migrations 0043, 0059 không chạm. Không có trigger/CHECK nào so seq(điểm lên) < seq(điểm xuống). (6) Văn phòng không có đường sửa trước xuất bến trên giao diện: web/chuyen-sua.ts:183-196 không gửi `diem`; nút ↑↓ của văn phòng chỉ hiện khi RUNNING (web/chuyen.ts:275-277). Route sửa chuyến (dieu-phoi-lenh.ts:54-58, 77, 93) nhận `diem[].thuTu` nhưng cũng không kiểm lên<xuống. Chưa chạy lại e2e/D1 (cấm theo quy tắc phiên); phần khách Novotel 'điểm xuống 2, điểm lên 3' suy từ mã + mô phỏng, không phải chạy thật.
>   - *Rào chắn đã thấy:* Không có rào chắn nào chặn kịch bản. Các thứ đã tìm và không đủ chặn: (a) trigger LC-04 `vc_trip_allocation_stop_scope` (migrations/0042_chuyen_xe.sql:311) chỉ kiểm đúng chuyến + đúng loại điểm, không kiểm thứ tự; (b) `noiLechCuaSuat` (src/shared/dieu-phoi-kiem.ts:281) chỉ so khoá nơi; (c) cổng xuất bến `kiemXuatBen` không có lý do giữ về thứ tự; (d) `lenhDoiThuTu` không có kiểm lên<xuống. Không thấy ADR/đặc tả nào ghi đây là thiết kế cố ý; ngược lại docs/superpowers/specs/2026-09-27-van-chuyen-ra-soat.md:147 có ghi bất biến mong muốn "Giờ các điểm không giảm; điểm lên đứng trước điểm xuống [MC+CSDL][L1]" (lượt 1) nhưng mã chưa cài. BACKLOG §15 câu 20 / docs/superpowers/specs/2026-10-01-doi-chieu-phieu-giam-doc.md:23,85 chỉ nói "máy tự xếp thứ tự điểm đón" (tối ưu tuyến) chưa làm, mã hiện chỉ gắn điểm mới vào cuối (dieu-phoi-route.ts:107) — là bản tạm, không biện minh cho thứ tự xuống-trước-lên. Giảm nhẹ thực tế (không phải rào chắn): lệnh "Đã tới" không ép theo thứ tự seq (dieu-phoi-tien-do.ts:117-134; câu SQL STOP_DA_TOI ở chuyen-repo.ts:445-450 chỉ cần điểm PENDING và chuyến RUNNING) nên tài xế vẫn có thể bấm "Đã tới" điểm đón trước rồi mới điểm trả; tài xế (và văn phòng khi xe đang chạy) đảo được điểm PENDING bằng nút ↑↓.
> - *góc dựng đường đi:* **Xác nhận một phần**; mức đề xuất Trung bình (dữ liệu). Sai nghiệp vụ rõ rệt và dễ gặp (mọi chuyến ghép nhiều khách sạn → cùng một bến đều ra thứ tự này), nhưng không sai tiền, không lộ/mất dữ liệu, không chặn việc chính: chuyến vẫn xuất bến và kết thúc được, máy trạng thái chặn "trả trước khi đón" ở mức từng suất, và có đường vòng (↑↓ sau xuất bến). Mô tả "bỏ khách" là quá tay nên hạ từ CAO xuống TRUNG BÌNH.
>   - *Chính xác hoá:* (1) Hậu quả bị nói quá: "xe chạy đúng thứ tự trên màn sẽ bỏ khách / khách xuống trước khi lên" và "chặn việc chính" không đúng theo mã. Máy không cho ghi "đã trả" khi suất chưa BOARDED; hai khách Novotel vẫn được đón ở điểm 3 rồi thẻ điểm 2 hiện lại "Đã trả"; không kẹt, không mất khách. Hậu quả thật là tuyến hiển thị vô lý (tài xế phải tự đảo hoặc quay lại bến), giờ/điểm trả ghi nhận có thể lệch thực tế. (2) Phạm vi rộng hơn mô tả: không chỉ "trong một lần bấm" mà cả khi xếp từng đơn ở các lần gọi riêng (hàm cho cùng kết quả khi điểm cũ đã nằm ở DB); và diemChoKhoa còn được gọi ở lenhDoi (dieu-phoi-lenh.ts:244-245) và lệnh cập nhật khách theo đơn (dieu-phoi-lenh.ts:312-313) nên cùng lỗi ở hai luồng này. (3) Nhãn "MỚI": chỉ đúng cho phần tự dựng điểm; phần "đảo thứ tự được" đã được ghi nhận là chủ chưa quyết (docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:145, kèm khuyến nghị chặn) và có ghi chú trong cuoc-smoke.mjs:326. (4) Số dòng: diemChoKhoa nằm ở dieu-phoi-route.ts:108-117 (107 là dòng chú thích), không phải 107-116; `dieu-phoi-tien-do.ts` nằm ở src/modules/van-chuyen/, không phải src/shared/. (5) Bổ sung đường vòng báo cáo bỏ sót: có ↑↓ sau xuất bến; trước xuất bến thì giao diện không có cách đổi, chỉ API sửa chuyến có trường `diem`. Mã nguồn kiểm: nhánh claude/kind-brahmagupta-05esk0, báo cáo gốc ghi bản 1.77 @ dfee4a8c trong khi đề bài nói 1.76; phần đã đọc không có khác biệt ảnh hưởng.
>   - *Hướng sửa gợi ý:* Khi dựng điểm cho chặng, chèn điểm ĐÓN mới trước điểm TRẢ đầu tiên đang dùng chung của nhóm khách đó (hoặc dùng lại điểm trả chỉ khi nó đứng sau điểm đón của chặng), rồi thêm một luật thuần "điểm lên đứng trước điểm xuống của cùng một suất" dùng chung cho kiểm xếp, cổng xuất bến (hiện cảnh báo/giữ) và lệnh đổi thứ tự; việc chặn lệnh đổi thứ tự cần chủ quyết theo câu hỏi còn mở ở lộ trình 00:145. Có thể thêm cách đổi thứ tự điểm ở màn Sửa chuyến cho chuyến chưa chạy.
>   - *Bằng chứng (tệp:dòng):* Cơ chế đúng như mô tả, dựng lại theo mã thật. (1) Điểm vào: POST /api/van-chuyen/chuyen/:id/phan-bo, cổng office, cần can(trip.dispatch) (src/modules/van-chuyen/index.ts:1040-1041) gọi lenhXep (index.ts:1057). (2) lenhXepLo (src/modules/van-chuyen/dieu-phoi-lenh.ts:112) lặp từng chặng theo thứ tự trong thân (dieu-phoi-lenh.ts:142-145): với mỗi chặng gọi diemChoKhoa(... "PICKUP" ...) rồi diemChoKhoa(... "DROPOFF" ...). (3) diemChoKhoa (src/modules/van-chuyen/dieu-phoi-route.ts:108-117): dòng 111 dùng lại điểm cùng loại + cùng place_key nếu có (trả về id cũ); không thì dòng 113 gán `seq = max(seq hiện có, seq điểm mới) + 1`, tức luôn nối đuôi, không hề chèn đón-trước-trả. (4) Kết quả cho hai chặng cùng nơi trả: chặng 1 sinh điểm 1 ĐÓN + điểm 2 TRẢ; chặng 2 sinh điểm 3 ĐÓN, còn TRẢ dùng lại điểm 2. Tôi chạy thật hàm này (gói esbuild trong bộ nhớ, không ghi vào repo, git status sạch): in ra `['1 PICKUP muong-thanh','2 DROPOFF ben-tau','3 PICKUP novotel']`. Gọi tuần tự (lần 2 với điểm đã có ở DB, trạng thái PENDING) cho `['3 PICKUP novotel']` và điểm xuống dùng lại `s2`, nghĩa là KHÔNG chỉ "một lần bấm" mà bất kỳ lần xếp thêm chặng nào cũng ra kết quả này. (5) Không luật nào chặn/cảnh báo: kiemXep (dieu-phoi-lenh.ts:130-136) và kiemXuatBen (dieu-phoi-tien-do.ts:77-78) không so seq; bộ mã GIỮ src/shared/ly-do-giu.ts:18-62 không có mã nào về thứ tự điểm; "Điểm khớp đơn" chỉ là noiLechCuaSuat so khoá nơi (src/shared/dieu-phoi-kiem.ts:279-284, 384-387); trigger CSDL chỉ kiểm loại + chuyến của điểm (migrations/0042_chuyen_xe.sql:312-313), không so seq; audit-checks R-VC-9 chỉ bắt trùng seq, R-VC-16 chỉ bắt lệch nơi (scripts/audit-checks.mjs:450, 515-523). Nên "Đạt hết", `lyDoGiu: []`, `canhBao: []` là đúng. (6) Màn tài xế/văn phòng hiện đúng thứ tự seq: src/shared/tien-do-man.ts:137 `sort((a,b)=>a.thuTu-b.thuTu)`. (7) Lệnh đảo thứ tự: route tài xế index.ts:1389 và route văn phòng index.ts:1568 cùng gọi lenhDoiThuTu (src/modules/van-chuyen/dieu-phoi-tien-do.ts:210-232), chỉ kiểm điểm thuộc chuyến, còn PENDING, không trùng seq, không kiểm "đón trước trả" nên trả 200; chính kịch bản cũ ghi nhận điều này (docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs:326 "máy chủ KHÔNG cấm trả trước đón") và kế hoạch ghi là câu hỏi đã nêu với chủ nhưng chưa quyết (docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:145; viec-nho.md:1228). (8) Hậu quả thật theo mã: ở điểm TRẢ (seq 2) tài xế bấm "Đã trả" chỉ trả được suất BOARDED (src/modules/van-chuyen/dieu-phoi.ts:387 `DA_TRA.tu = ["BOARDED"]`; chuyen-repo.ts:428-435). Hai khách Novotel còn WAITING nên không bị đánh dấu "đã trả" khống; điểm 2 ở lại ARRIVED, không thành DONE vì còn suất WAITING có alight_stop = điểm 2 (chuyen-repo.ts:448-455). Sau khi đón Novotel (điểm 3) hai khách thành BOARDED, thẻ điểm 2 lại hiện "Đã trả" (tien-do-man.ts:148-152 traCho>0). Chuyến vẫn kết thúc bình thường, không kẹt, không mất khách khỏi dữ liệu; nhưng thứ tự tuyến trên màn là vô lý và máy không nói gì.
>   - *Rào chắn đã thấy:* Không có rào chắn ngăn việc dựng sai thứ tự hay báo cảnh báo. Có các rào chỉ giảm nhẹ hậu quả, không ngăn nguyên nhân: (a) máy trạng thái suất chỉ cho "Đã trả" khi suất đang BOARDED và điểm xuống đã tới (dieu-phoi.ts:387; chuyen-repo.ts:428-435; dieu-phoi-tien-do.ts:148), nên không thể ghi "đã trả" trước khi "đã đón"; (b) điểm trả không tự DONE khi còn suất chờ/đang trên xe xuống ở đó (chuyen-repo.ts:448-455), nên không khoá chuyến; (c) đường chỉnh sửa: sau khi xuất bến (chuyến RUNNING), tài xế (web/cuoc-chuyen.ts:165-174) và văn phòng (web/chuyen.ts:276-300, chỉ hiện khi RUNNING và điểm còn PENDING) có nút ↑↓ đổi chỗ hai điểm chưa tới liền kề (src/shared/tien-do-man.ts:93-101). Trước khi xuất bến (chuyến PLANNED) giao diện KHÔNG có cách đổi thứ tự điểm: web không gọi trường `diem` của sửa chuyến (src/shared/contracts.ts:1383, dieu-phoi-than.ts:70-80, dieu-phoi-lenh.ts:75-93 chỉ có ở API, grep web/*.ts không có chỗ gửi). Việc cấm đón-sau-trả khi đổi thứ tự là câu hỏi chủ chưa quyết (lộ trình 00:145), nên nửa "đảo thứ tự được" là điểm đã biết, không phải lỗi mới.

<a id="BH-08"></a>
### 5. BH-08 · Thực tập tự đặt giá tuỳ ý, giảm giá tuỳ ý rồi tự xác nhận

- **Vai:** Thực tập
- **Loại:** bất hợp lý theo thiết kế
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Rủi ro đã biết (ADR-0027); chưa có quyết định riêng cho Thực tập
- **Hướng xử lý:** Cần chủ quyết (áp chung mọi vai nội bộ)
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Thực tập. Mức: **TRUNG BÌNH** (tiền). Loại: bất hợp lý theo thiết kế. **TRÙNG (02/03 — "đơn 0 đồng tự xác nhận", chờ chủ quyết (iv))**, mở rộng sang Thực tập; liên quan ADR-0018 đ6 (tách `order.confirm`, chưa thi công).
- Tái hiện: `bh/a5.mjs` — Thực tập lập đơn TOUR4D đơn giá 100.000 (danh mục 450.000) → 201; đơn giảm 400.000/900.000 → 201; tự xác nhận đơn của mình → 200. Đối tác bị chặn cả hai (403), Thực tập thì không.
- Đề xuất: khi chủ quyết (iv), áp cùng trần giá/giảm giá cho Thực tập như Đối tác, hoặc bắt người khác duyệt.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (tiền). Là lỗ kiểm soát tiền thật (đơn giá và giảm giá tuỳ ý, tổng 0 đồng, tự xác nhận không ai duyệt), nhưng không tự gây mất tiền hay lộ dữ liệu: hành vi này giống Bán hàng/Quản trị đang được phép, có nhật ký "lệch giá danh mục" và văn phòng thấy đơn để rà lại. Là sai nghiệp vụ có đường vòng và có thể kiểm tra sau. Không có đường vượt quyền thật vì Thực tập chỉ thao tác trên đơn của mình.
>   - *Chính xác hoá:* Cần sửa ba điểm trong báo cáo gốc: (a) Gọi là "bất hợp lý theo thiết kế" chưa đủ chính xác. Hành vi đã được ghi thành rủi ro còn lại ở ADR-0027 dòng 38 ("Thực tập vẫn đặt được đơn giá thoả thuận và giảm giá như nhân viên nội bộ"). Nên nêu rõ đây là rủi ro đã biết nhưng chưa có quyết định chủ riêng cho Thực tập, không phải lỗi mới hoàn toàn. (b) Câu "TRÙNG (02/03 — đơn 0 đồng tự xác nhận, chờ chủ quyết (iv))" đúng ở phần tự xác nhận. Thực chất tự đặt giá và giảm giá của Thực tập giống hệt vai Bán hàng, nên nếu muốn siết thì phải hỏi chủ chung cho mọi vai nội bộ, không riêng Thực tập. (c) Phần "tự xác nhận đơn của mình" khớp luật đã duyệt (Q20: người lập nội bộ tự xác nhận đơn của chính mình, đặc tả 2026-09-24 dòng 83). Đừng gọi riêng nó là sai thiết kế. Còn lại đúng: các mã trạng thái, bốn mốc 201/201/200 và Đối tác 403 cả hai đều khớp kết quả tự tái hiện. Không tìm thấy `bh/a5.mjs` trong repo, nên bằng chứng tái hiện của tôi dựa vào khung thử `tests/audit/harness.mjs`, không phải kịch bản gốc.
>   - *Hướng sửa gợi ý:* Trình chủ quyết một lần (chạm quyền và tiền nên cần ADR): với Thực tập, hoặc bắt giá đúng giá danh mục và trần giảm giá như Đối tác, hoặc bắt đơn có người nội bộ khác xác nhận. Trong khi chờ, cân nhắc ghi giảm giá cấp đơn vào dòng nhật ký `created`/`confirmed` để dễ rà soát.
>   - *Bằng chứng (tệp:dòng):* Mã đúng như mô tả về hành vi, nhưng "thiết kế bất hợp lý" chỉ đúng một phần vì có ghi nhận chính thức. Đường đi từ điểm vào tới kết quả: 1. Cổng `orders` cho phép Thực tập (`src/shared/permissions.ts:269`, `ORDERS_GATE` có `INTERN`). Ô quyền: `order.create` INTERN=any (`permissions.ts:78`), `order.modify` INTERN=own (`permissions.ts:79`), `order.money.edit` INTERN=none (`permissions.ts:95`). 2. `POST /api/orders` (`src/modules/orders/index.ts:666-679`): hỏi `order.create`, gọi `validateOrder`, rồi `priceGuard`. - `validateOrder` nhận `unitPrices` do người gọi gửi lên làm "đơn giá đã thoả thuận" (`src/modules/orders/service-rules.ts:61`, `:186`). `catalogPrice` chỉ để truy vết lệch giá. - Giảm giá chỉ bị kiểm `discount <= subtotal` (`src/modules/orders/rules.ts:173-176`), nên tổng đơn có thể bằng 0. 3. `priceGuard` (`index.ts:181-188`) chỉ chặn giá và giảm giá khi `holdsPartner(staff)`, tức quyền có `PARTNER` (`src/shared/permissions.ts:298`). Hai điều kiện ở `index.ts:185-186` và `src/modules/orders/price-guards.ts:105-110` (R2: `retailPricesOnly`, R3: `PARTNER_DISCOUNT_CAP = 0`) không áp cho Thực tập. Chặn dịch vụ nhập tay (R1) có áp cho Thực tập (`price-guards.ts:37-42`, `lyDoKhongNhapTay`), nhưng đây là việc khác, không phải đặt giá trên dịch vụ danh mục. 4. `POST /api/orders/:id/status` → `confirmed` (`index.ts:979-1028`): chỉ hỏi `order.modify` với `ownerId` (`index.ts:987`). Thực tập là người lập nên qua. Dòng 999-1000 chỉ kiểm giá và giảm giá nếu `holdsPartner`. Không có điều kiện nào đòi người thứ hai hay đòi đơn có tiền. 5. Giao diện cũng không chặn: `web/order-form.ts:598` đặt `retailOnly = holdsPartner(staff)`. 6. Cơ sở dữ liệu chỉ có bất biến tổng và dòng (`migrations/0007_audit_open_actions_catalog_code_money_guards.sql:32-52`), không có trần giảm giá. Tự tái hiện bằng khung thử có sẵn trong repo (ứng dụng thật chạy trong tiến trình + SQLite dựng từ migrations, không mạng, không máy chủ). Dùng `tests/audit/harness.mjs`, kịch bản ở thư mục scratchpad, không sửa cây làm việc (`git status` sạch). Kết quả: - Thực tập, dịch vụ ZA1 có giá danh mục 500.000, gửi `unitPrices` 100.000: `POST /api/orders` trả 201, total=200000 (2 người lớn), draft. - Thực tập, giảm 1.000.000 trên tạm tính 1.000.000: 201, total=0. - Thực tập tự `POST /status {confirmed}` cho cả hai đơn: 200, status=confirmed (total=0 và total=200000). - Đối chứng, tài khoản Đối tác với hai thân tương tự: 403 "Tài khoản đối tác dùng đúng giá bán lẻ theo danh mục…" và 403 "Tài khoản đối tác chưa được giảm giá…". - Nhật ký đơn giá 100.000 có hai dòng `created` và `confirmed`, cùng chi tiết "lệch giá danh mục: ZA1 người lớn 500.000 ₫ → 100.000 ₫". Ngoài ra: `node --test src/modules/orders/price-guards.test.ts` đạt 17/17.
>   - *Rào chắn đã thấy:* Có rào nhưng không đủ chặn Thực tập: 1. R2/R3 (giá bán lẻ, trần giảm giá 0) chỉ áp cho `holdsPartner` (`price-guards.ts:105-110`, `index.ts:185-186`, `:999-1000`). Thực tập không bị. 2. R1 (chặn dịch vụ nhập tay) có áp cho Thực tập (`price-guards.ts:37-42`, bài `nhap-tay-route.test.ts:81`), nên Thực tập không tự tạo dịch vụ ngoài danh mục. Nhưng đặt đơn giá khác trên dịch vụ danh mục thì không bị. 3. Dấu vết: nhật ký ghi "lệch giá danh mục: mã loại-khách giá-danh-mục → giá-thoả-thuận" ở `created` và `confirmed` (`service-rules.ts:363-372`, `repository.ts:918`, `:974`, `index.ts:1001`). Chỉ truy vết, không chặn. Giảm giá cấp đơn không có dòng nhật ký riêng. 4. Ghi nhận chính thức: ADR-0027 mục "Hệ quả và rủi ro còn lại" (dòng 38) nêu "Tài khoản Thực tập vẫn đặt được đơn giá thoả thuận và giảm giá như nhân viên nội bộ (ngoài phạm vi hai phát hiện)". Đây là rủi ro được thừa nhận, không phải quyết định chủ chọn cho Thực tập. ADR-0018 điều 4 chỉ định "Thực tập" là mức mới, giai đoạn 1 "tạm hẹp" (`permissions.ts:63`), và điều 6 (tách `order.confirm`) chưa thi công. Đặc tả 2026-09-24 (`mo-hinh-nguoi-vai-quyen-design.md` dòng 83, 149) ghi Q20 "người lập nội bộ, kể cả Thực tập sinh, tự nhận và xác nhận đơn của chính mình", `order.confirm` INTERN=assigned. Việc tự xác nhận đơn của mình do đó đúng hướng đã duyệt, nhưng không có chỗ nào chốt "Thực tập tự đặt giá, giảm giá tuỳ ý". 5. Bài kiểm khoá hành vi này: `src/shared/permissions.test.ts:144-155` chỉ ghim INTERN lập và sửa đơn của mình, không ghim chuyện giá hay xác nhận. 6. Câu hỏi đang chờ chủ: quyết định (iv) ở `docs/superpowers/plans/2026-10-02-khac-phuc-audit-00-lo-trinh.md:74` ("đơn 0 đồng tự xác nhận (02/03): có cần người thứ hai không"). Không có rào nào về giá/giảm giá cho vai Thực tập.

<a id="VP-05"></a>
### 6. VP-05 · Form "Ghi lần thu" thiếu thứ Kế toán cần.

- **Vai:** Kế toán
- **Loại:** khó dùng
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Form "Ghi lần thu" thiếu thứ Kế toán cần.** (a) Không có ô ghi chú trên giao diện (`web/order.ts:621-670`); (b) người nhận chỉ có "Công ty" hoặc "Tôi thu", dù máy chủ cho Kế toán ghi thay người khác (`nguoiThu: {partyId}`), nên Kế toán không ghi được "HDV A đã thu tiền mặt"; (c) gọi API với ghi chú mã giao dịch ngân hàng ("Mã GD FT26275503581234", "VCB 512398761234") bị 400 "Ghi chú không được chứa số điện thoại / số tài khoản" vì chặn mọi dãy ≥ 8 chữ số; (d) "Công ty (vào tài khoản công ty)" vẫn hiện khi chọn Tiền mặt.
- Tái hiện: `kt2.mjs`; mở form trên đơn bất kỳ bằng tài khoản Kế toán.
- TRÙNG MỘT PHẦN: ADR-0092 (Đợt 2 (b)) đã có kế hoạch "mã giao dịch ngân hàng". (a), (b), (d) MỚI.
- Đề xuất: thêm ô ghi chú, cho Kế toán chọn người thu từ danh sách người đang giữ tiền, có trường riêng cho mã giao dịch ngân hàng.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (tiền). Chỉ ý (b) là sai nghiệp vụ thật: Kế toán không có đường trên giao diện để ghi "HDV A đã thu tiền mặt", và hai lựa chọn duy nhất đều ghi sai người giữ tiền; có đường vòng (HDV tự ghi, hoặc API) và giao diện Kế toán đang là bản tạm chờ vẽ lại. Ý (a), (c), (d) chỉ là thiếu tiện ích hoặc chữ, mức THẤP.
>   - *Chính xác hoá:* Câu "(a), (b), (d) MỚI" cần chỉnh. (c) không phải lỗi mới mà là hệ quả đã biết của luật 8 chữ số và đã có phương án chữa ở ADR-0092 điều 6 (KT02), chưa duyệt. Ngoài ra (c) chỉ xảy ra qua API gọi tay, vì giao diện không có ô ghi chú nên Kế toán không gặp nó khi bấm form. (d) là chữ, không phải logic: cặp "Công ty + Tiền mặt" được máy chủ và bài e2e cho phép, và nhãn "(vào tài khoản công ty)" là chữ có chủ ý của hướng dẫn HDV, chỉ gây lệch nghĩa khi chọn Tiền mặt. Phần (a) nên nói rõ thêm: ghi chú của lần thu không được hiện ở danh sách lần thu (web/order.ts:446-455), nên dù thêm ô nhập cũng cần hiện lại. Dòng tham chiếu "web/order.ts:621-670" đúng nhưng hàm kết thúc ở dòng 673. Mô tả "mã giao dịch ngân hàng bị chặn vì mọi dãy ≥ 8 chữ số" chính xác hơn là: sau khi bỏ khoảng trắng, dấu chấm, dấu gạch. Không kiểm lại được tệp bằng chứng kt2.mjs vì cấm chạy.
>   - *Hướng sửa gợi ý:* Khi chủ vẽ lại màn Kế toán, cho Kế toán chọn người thu từ danh sách người đang giữ tiền và thêm ô ghi chú (đồng thời hiện ghi chú trong danh sách lần thu). Duyệt và thi công ADR-0092 điều 6 để mã giao dịch ngân hàng có ô riêng, được miễn luật 8 chữ số. Có thể đổi nhãn ô người nhận để không gợi ý "vào tài khoản" khi hình thức là Tiền mặt.
>   - *Bằng chứng (tệp:dòng):* Cả bốn ý (a)–(d) đúng về hành vi mã, dựng được từ mã. (a) Form "Ghi lần thu" chỉ có 4 ô: số tiền, hình thức, người nhận, ngày phát sinh (chỉ Kế toán) tại web/order.ts:639-642. Thân gửi đi chỉ có soTien, hinhThuc, nguoiThu, ngayPhatSinh tại web/order.ts:654-659. Trong khi giao kèo có sẵn ghiChu (src/shared/contracts.ts:1627) và máy chủ nhận ghi chú ≤500 ký tự (src/modules/billing/service.ts:91-96). Grep "ghiChu" trong web/ không thấy chỗ nào gửi hay hiện ghi chú của lần thu. Danh sách lần thu ở web/order.ts:446-455 cũng không in ghi chú. (b) Ô người nhận chỉ có hai lựa chọn tĩnh, "Công ty (vào tài khoản công ty)" và "Tôi thu", tại web/order.ts:629; thân gửi đi chỉ nhận "toi" hoặc "cong_ty" tại :657. Máy chủ cho Kế toán ghi thay người khác bằng nguoiThu {partyId} (service.ts:74-85, câu 76 "Kế toán ghi thay người khác"; bài src/modules/billing/lo-ghi.test.ts:86 và :310 ghi 201), nhưng không có chỗ nào trong web/ gửi {partyId} cho lần thu (grep nguoiThu: chỉ web/order.ts:657 và web/order-form.ts:463). Hệ quả: nếu Kế toán chọn "Công ty" thì sinhDongLanThu trả rỗng (src/modules/billing/rules.ts:94-95), nên không có dòng giữ hộ trên HDV. Nếu chọn "Tôi thu" thì khoản giữ hộ dồn lên chính Kế toán (rules.ts:98-99). (c) Tôi chạy lại đúng biểu thức của service.ts:94 bằng node -e: "Mã GD FT26275503581234" cho true (bị chặn), "VCB 512398761234" cho true, "HDV A thu tiền mặt" cho false. Thông báo là "Ghi chú không được chứa số điện thoại / số tài khoản." (service.ts:94). Biểu thức bỏ khoảng trắng, dấu chấm, dấu gạch rồi chặn dãy ≥ 8 chữ số. (d) Hai ô select độc lập, không có trình nghe nào gắn hình thức với người nhận (web/order.ts:628-629), nên chọn Tiền mặt vẫn thấy "Công ty (vào tài khoản công ty)". Không chạy máy chủ, không chạy kịch bản kt2.mjs (cấm), nên không tái hiện được trên giao diện thật.
>   - *Rào chắn đã thấy:* (1) Luật chữ cố ý: ngưỡng "8 chữ số" là quyết định của chủ (Q-N) tại src/shared/text-guards.ts:2,10; chặn SĐT/số tài khoản trong chữ tự do. Việc nó chặn nhầm mã giao dịch ngân hàng đã được ghi là KT02 ở docs/superpowers/specs/2026-10-02-luot-duyet-2-sua-sai-sau-da-giao-va-so-khong-doi-dau.md:164, và ADR-0092 điều 6 (dòng 186-188) đã chốt cách chữa: ô mã giao dịch riêng, miễn luật 8 chữ số. ADR-0092 hiện chỉ là "proposed" (docs/adr/README.md:101), chưa duyệt, chưa thi công. (2) Giao diện Kế toán trên trang đơn được ghi rõ là "đặt TẠM", chờ chủ vẽ lại hai màn sổ trên Claude Design (web/order.ts:481-483; docs/superpowers/plans/2026-09-30-so-tien-luot-1-thi-cong-nhat-ky.md:139). Form "Ghi lần thu" ở web/order.ts:621 được thiết kế cho người bán/HDV với hai lựa chọn "Tôi thu" / "Công ty". Đoạn hướng dẫn HDV ở src/shared/huong-dan-hdv.ts:96 chính thức gán nhãn đúng cặp đó: "Tôi thu (tiền mặt bạn cầm)" hoặc "Công ty (vào tài khoản công ty)". Cặp "Công ty + Tiền mặt" là hợp lệ về nghiệp vụ: bài e2e tests/e2e/dispatch.mjs:969,1037 ghi CASH + cong_ty và nhận 201. (3) Đường vòng cho (b): HDV tự ghi "Tôi thu" (payment.receive của HDV là phạm vi assigned, src/shared/permissions.ts:103), hoặc Kế toán gọi API với {partyId}. (4) Cấp đơn đã có "Ghi chú thanh toán" (web/order.ts:440, ô paymentNote ở web/order-form.ts:351), nhưng Kế toán không sửa được đơn nên không dùng được. Không tìm thấy rào nào chặn hẳn (a) hay (b) trên giao diện.

<a id="VP-03"></a>
### 7. VP-03 · Sửa tài khoản không có khoá phiên bản; form cũ ghi đè SĐT đăng nhập mới mà không báo.

- **Vai:** Quản trị / Nhân sự
- **Loại:** sai (mất thay đổi)
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Cần migration mới (cột phiên bản)
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Sửa tài khoản không có khoá phiên bản; form cũ ghi đè SĐT đăng nhập mới mà không báo.** Form "Sửa" luôn gửi cả họ tên và SĐT (`web/staff.ts:216`), `PATCH /api/staff/:id` không đòi `expectedUpdatedAt`.
- Tái hiện (`race1.mjs`): Quản trị đổi SĐT tài khoản sang 0911000201 → 200; Nhân sự (đang mở form với số cũ) sửa tên và bấm lưu → 200; kết quả SĐT quay về 0911000101.
- Mong đợi: 409 "vừa có người sửa" như các màn Danh bạ, Địa điểm.
- Đề xuất: thêm mốc cập nhật vào PATCH và chỉ gửi trường thật sự đổi.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (dữ liệu). Sai nghiệp vụ trên dữ liệu danh tính: SĐT đăng nhập hoặc tên bị lùi về giá trị cũ mà không ai được báo, người vừa được cấp số mới có thể không đăng nhập được. Có đường vòng (sửa lại, nhật ký còn dấu vết) và không liên quan tiền hay lộ dữ liệu. Cửa sổ lỗi là mọi lúc kể từ lần nạp danh sách gần nhất, không chỉ vài giây khi hai người mở form cùng lúc, nên dễ xảy ra hơn mô tả "đua nhau".
>   - *Chính xác hoá:* Báo cáo gốc đúng về cơ chế và tệp:dòng `web/staff.ts:216`. Chỉ cần bổ sung ba điểm: (a) "mà không báo" chưa chính xác hẳn: máy chủ vẫn ghi nhật ký `staff_updated` "đổi SĐT đăng nhập" (`src/modules/accounts/index.ts:178`) và đóng kết nối của tài khoản đích (`index.ts:522`). Đúng là không báo người đã đổi SĐT hay người đang sửa. (b) Lỗi cũng áp cho HỌ TÊN, không chỉ SĐT: `index.ts:485-488` so tên với bản vừa đọc nên tên cũ cũng ghi đè tên mới. Cửa sổ lỗi là thời gian kể từ lần `load()` cuối của trang, không chỉ lúc mở form. (c) Đề xuất "thêm mốc cập nhật vào PATCH" không làm được ngay: bảng `staff` không có cột `updated_at` hay `version` (cột thêm về sau chỉ có `party_id`, `last_login_at`, `credentials_changed_at` — `migrations/0012`, `0015`, `0005`), và `StaffAccount`/`StaffAccountDto` (`src/shared/contracts.ts:26-40`) không có `updatedAt`. Làm khoá đúng nghĩa cần migration mới, tức việc chạm dữ liệu phải qua chủ duyệt (CLAUDE.md §3). Chưa kiểm được lúc nào `pty_party.updated_at` đủ dùng thay cho tên.
>   - *Hướng sửa gợi ý:* Sửa nhanh, không đụng cấu trúc dữ liệu: giao diện chỉ gửi trường thật sự khác với giá trị đang hiện (`web/staff.ts:216`), và máy chủ nhận kèm "giá trị cũ đã thấy" cho SĐT và tên rồi chỉ ghi khi giá trị hiện tại còn khớp, không khớp thì trả 409 "vừa có người sửa, tải lại". Muốn khoá phiên bản đúng nghĩa như Danh bạ thì phải thêm cột mốc cập nhật cho `staff` bằng migration mới, việc đó cần chủ duyệt. Nên thêm một ca kiểm đua vào bài kiểm của `PATCH /api/staff/:id`.
>   - *Bằng chứng (tệp:dòng):* Đã đọc mã thật, đường đi dựng lại được từ giao diện tới CSDL, không có chốt nào chặn. 1) Giao diện luôn gửi cả tên và SĐT lấy từ bản chụp cũ. `web/staff.ts:193-194` điền sẵn ô từ `s.fullName` và `s.phone`. Bản `s` đến từ `accounts`, chỉ nạp ở `load()` (`web/staff.ts:249-254`). Trang không có bảng tin hay tải lại tự động: grep `bangtin|stale|409|setInterval|visibilitychange` trong `web/staff.ts` không ra gì liên quan. Nút Lưu ở `web/staff.ts:216` gọi `api(`/api/staff/${s.id}`, { method: "PATCH", body: { fullName: name.value, phone: phone.value } })` vô điều kiện. Biến `doiTenSo` ở dòng 215 chỉ dùng cho câu báo lỗi, không lọc trường gửi đi. Phần vai ở dòng 189 thì được nạp mới khi mở form, nên riêng tên và SĐT bị lỗi thời. 2) Máy chủ so với bản VỪA ĐỌC, không so với bản người dùng đã thấy. `src/modules/accounts/index.ts:474-524`: dòng 478 đọc `t` mới từ CSDL. Dòng 490-497: `phone !== t.phone` đúng vì Quản trị đã đổi sang số mới, rồi `findStaffByPhone(db, phone)` trả null vì số cũ đã bỏ trống, nên `patch.phone = phone` (số cũ). Dòng 485-488 xử lý tên y hệt. Thân yêu cầu không có `expectedUpdatedAt` hay trường phiên bản nào (đọc cả khối 482-503). Dòng 515 gọi `db.batch(built.statements)`. 3) Câu ghi không có khoá lạc quan. `src/modules/staff/repository.ts:61-65`: `UPDATE staff SET phone = COALESCE(?2, phone), active = COALESCE(?3, active) WHERE id = ?1 AND (?4 = 0 OR ${OTHER_ADMIN(1)})`. Vị từ `OTHER_ADMIN` chỉ canh "còn quản trị viên khác" khi ngưng, không canh phiên bản. Tên: `renamePersonStatements` (`src/modules/parties/repository.ts:297-305`) cũng `WHERE id = ?1 AND (?5 = 0 OR changes() > 0)`, không so `updated_at`. Kết quả: SĐT và tên quay về giá trị cũ, trả 200. 4) Đối chứng với màn có khoá: `UPDATE_PARTY` ở `src/modules/parties/repository.ts:307-310` có `AND updated_at = ?6`, đúng như báo cáo nói về Danh bạ. `docs/SYSTEM-DESIGN.md:705` ghi `PUT /api/locations/:id` có khoá lạc quan. Còn `docs/SYSTEM-DESIGN.md:625` mô tả `PATCH /api/staff/:id` không nhắc khoá nào. 5) Bài kiểm hiện có không phủ ca này. `node --test src/modules/accounts/patch-staff.test.ts` cho 11/11 xanh. Tệp chỉ kiểm tính toàn khối của lô và câu chốt "còn quản trị viên khác", không có ca "form cũ ghi đè SĐT". Không có ca tương đương ở `tests/e2e/admin-race.mjs` mà tôi thấy trong phạm vi grep. Về chạy thật: tôi KHÔNG chạy `race1.mjs` (cần máy chủ, nằm ngoài quy tắc). Kết luận dựa hoàn toàn trên đọc mã; chuỗi 1 đến 3 kín nên đủ để xác nhận.
>   - *Rào chắn đã thấy:* Không có rào chắn nào chặn đúng kịch bản. Những thứ tìm thấy nhưng không đủ chặn: - `findStaffByPhone` → `PHONE_TAKEN` (`src/modules/accounts/index.ts:495`) chỉ chặn khi số cũ đã bị tài khoản KHÁC chiếm; số cũ vừa được bỏ trống thì qua. - Cột UNIQUE trên `staff.phone` (`migrations/0001_staff.sql:5`, bắt ở `index.ts:517`) chỉ chặn trùng số, không chặn quay lại số cũ. - `mayManage` và `account.edit` (`index.ts:476-481`) kiểm cấp bậc, không kiểm phiên bản. - Câu chốt `OTHER_ADMIN` (`staff/repository.ts:64`) chỉ liên quan ngưng quản trị viên cuối. - Có nhật ký `staff_updated` ghi "đổi SĐT đăng nhập" (`index.ts:178`) và `dongBangTin` đóng kết nối của tài khoản đích (`index.ts:522`), nên sự việc có để lại dấu vết cho người tra nhật ký, nhưng không báo cho người đã đổi SĐT, và không báo người đang sửa. - Không thấy ADR hay đặc tả nào chốt đây là thiết kế cố ý "ghi sau thắng". Đã grep `docs/adr` và `docs` với `khoá lạc quan`, `ghi đè`, `PATCH /api/staff/:id`: chỉ có ADR-0013:33, ADR-0046 và ADR-0071:29, đều nói về quyền và tắt thông báo, không về phiên bản. `docs/quyen-hoan.json` không có mục liên quan. Nguyên tắc chung đi ngược lại: `docs/CHANGE-GUIDE.md:158` và `docs/SYSTEM-DESIGN.md:1185` coi khoá lạc quan (409 `stale`) là chuẩn cho route sửa; ADR-0003 điều 6 là gốc.

<a id="BH-19"></a>
### 8. BH-19 · Đồng nghiệp "Nhận" đơn rồi sửa tên khách, số khách, tổng tiền; người lập chỉ được báo "vừa nhận đơn"

- **Vai:** Bán hàng
- **Loại:** —
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Hệ quả ADR-0009 và ADR-0020 (đã duyệt)
- **Hướng xử lý:** Cần ADR (chính sách "Nhận đơn", câu (viii))
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng. Mức: TRUNG BÌNH. **TRÙNG (KD05 — chờ chủ quyết (viii); ADR-0062 báo tin khi đơn đổi)**.
- Thấy: B `PUT /handler` lên đơn nháp của A → 200, rồi PUT đổi tên khách thành "Bị B đổi", 3 khách → 1, tổng 1.200.000 → 450.000 → 200; A chỉ có tin "Bán Hàng B vừa nhận đơn TD-20261002-0019" (`bh/a2.mjs`, `bh/a4.mjs`).

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (dữ liệu). Đây là sai nghiệp vụ và rủi ro toàn vẹn dữ liệu đơn nháp: một Bán hàng bất kỳ tự "Nhận" đơn nháp của đồng nghiệp rồi viết lại khách, số khách, tiền, thậm chí xác nhận hoặc huỷ, còn người lập chỉ thấy tin "vừa nhận" và không có giá trị cũ để đối chiếu. Có đường vòng và tác động giới hạn: chỉ đơn nháp, người lập tự lấy lại được bằng cách đổi người phụ trách, lịch sử có ghi tên người sửa, nội dung xác nhận về sau bị khoá. Không mất tiền thật, không lộ dữ liệu ra ngoài.
>   - *Chính xác hoá:* Phần mô tả hành vi (B Nhận, B sửa tên khách, số khách, tổng tiền, A chỉ có tin "vừa nhận đơn") khớp mã. Cần chỉnh ba điểm. (a) Đây KHÔNG phải lỗi lệch mã so với tài liệu chuẩn tắc. Nó là hệ quả trực tiếp của ADR-0009 điều 1 cộng ADR-0020 điều 2, đều accepted, và e2e đang khoá hành vi "người phụ trách sửa nháp đủ". Theo CLAUDE.md §2, mã đúng ADR thì không sửa mã. Chỉ có thể siết bằng ADR mới do chủ duyệt, vì chạm quyền và dữ liệu (CLAUDE.md §3). Câu hỏi chính sách đang chờ chủ ở mục (viii). (b) Câu "ADR-0062 báo tin khi đơn đổi" trong báo cáo gốc dễ gây hiểu nhầm là sẽ cứu được ca này. Thực tế có hai điều ngược lại. - ADR-0062 chưa thi công: `grep doi_sau_xac_nhan|v_aud_order_change` trong `src/` cho 0 kết quả, `HANH_DONG_TIN_DON` (`src/shared/thong-bao.ts:8`) chưa có loại tin đó, và migration cuối là 0075. - Kể cả khi thi công, ADR-0062 Đ1 ("Sau xác nhận tính, không đoán") và ADR-0045 cố ý không báo khi sửa đơn NHÁP. Vì vậy hành vi A không được báo khi B sửa nháp sẽ vẫn còn dù ADR-0062 đã lên. (c) Nên thêm hai chi tiết mà báo cáo gốc chưa nêu. - Nhật ký `updated` không lưu giá trị cũ của tên khách, số khách, tổng tiền (`repository.ts:974`; `service-rules.ts:363-372`). - Quyền của B không dừng ở sửa: B còn xác nhận và huỷ được đơn của A. Báo cáo gốc có ghi lệch kênh dẫn: tin "Bán Hàng B vừa nhận đơn" là loại "nhan" (`thong-bao.ts:47`), không phải tin chờ nhận.
>   - *Hướng sửa gợi ý:* Hướng sửa cần ADR mới do chủ duyệt: hoặc chỉ cho người lập hay Quản trị mới được giao đơn nháp (Bán hàng khác không tự Nhận đơn nháp của người khác), hoặc nhận được nhưng người nhận không sửa nội dung nháp của người lập. Dù chọn hướng nào, nên báo người lập khi nháp của mình bị sửa và ghi giá trị trước khi sửa (tên khách, số khách, tổng tiền) vào nhật ký `updated`; phần báo tin này nằm ngoài phạm vi ADR-0062 hiện tại nên cần quyết định riêng.
>   - *Bằng chứng (tệp:dòng):* Đường đi đọc từ mã thật, đủ để dựng lại không cần chạy máy chủ. (1) Bán hàng B thấy đơn nháp của A và có nút "Nhận phụ trách". SALES có `order.view` = any (`src/shared/permissions.ts:74`) và `dispatch.claim` = any (`permissions.ts:98`). Nút hiện khi `handler === null && can(staff,"dispatch.claim")` (`src/shared/handler-view.ts:52`), không xét trạng thái đơn; `web/order.ts:372` chỉ chặn khi đã "Đã giao". (2) `PUT /api/orders/:id/handler` (`src/modules/dispatch/index.ts:156-209`) cho B nhận đơn nháp của A. - `handlerChangeVerdict` trả "allow" vì `current === null && targetStaffId === who.id && can(who,"dispatch.claim")` (`src/modules/dispatch/rules.ts:104-107`). Tôi chạy thử hàm này và kết quả là `allow`. - Chốt Nhận ở `index.ts:177-181` chỉ chặn tài khoản lai Đối tác (`:178`), đơn đã huỷ (`:179`) và đơn đã qua ngày đi (`:180`). Không có chốt cho đơn nháp hay đơn của người khác lập. (3) Sau khi nhận, B sửa được cả nội dung đơn nháp. - Router `src/index.ts:64` tiêm `isAssigned = isOrderHandler(...)`. - `PUT /api/orders/:id` (`src/modules/orders/index.ts:727-781`) kiểm `can(staff,"order.modify",{ownerId: meta.staffId, assigned})` (`:732`). Ô `order.modify` của SALES là `ownOrAssigned` (`permissions.ts:79`). Tôi chạy thử: B chưa là người phụ trách thì `false`, đã là người phụ trách thì `true`. - Chỉ chặn khi đơn không còn nháp (`:734`, 409) hoặc đã giao (`:733`). - Thân yêu cầu đi qua `validateOrder` rồi `updateDraftOrder` (`src/modules/orders/repository.ts:938-985`). Câu `UPDATE orders SET customer_name, customer_phone, subtotal, discount, total, booker_party_id…` ghi đè tên khách, số khách, dịch vụ và tổng tiền. Máy chủ tính lại tiền từ dịch vụ, nên "1.200.000 → 450.000" là hệ quả bình thường của việc đổi số khách. - B còn xác nhận và huỷ được đơn của A qua `POST /api/orders/:id/status` (`index.ts:987`, cùng ô `order.modify`). (3b) Nhật ký không giữ giá trị cũ. Dòng `updated` có `detail = joinDetail(summarizeDeviations(...), booker.note, paxNote, ghiChuThem)` (`repository.ts:974`). `summarizeDeviations` chỉ ghi lệch giá danh mục (`src/modules/orders/service-rules.ts:363-372`). Tên khách, số khách và tổng tiền trước khi sửa không được lưu ở đâu. (4) A chỉ nhận đúng một tin: "vừa nhận đơn". - `loaiTinDon` (`src/shared/thong-bao.ts:31-42`): `order_claimed` → "nhan", câu "<tên> vừa nhận đơn <mã>" (`:47`). Hành động `updated` rơi vào `default: return null` (`:40`). - Tôi chạy thử: `loaiTinDon(updated)` = null, `loaiTinDon(order_claimed)` = "nhan". - Chú thích `thong-bao.ts:33` ghi rõ "ADR-0045: lưu NHÁP không báo ai". - `baoThayDoi({thayDoi:"sua"})` (`orders/index.ts:778`) chỉ làm mới màn hình, không tạo tin nổi hay gõ cửa màn hình khoá. (5) Đường khôi phục có sẵn. A (người lập) vẫn thấy dòng "Sửa đơn" kèm tên B, vì `order.history.view` là `ownOrAssigned` (`permissions.ts:76`). A cũng tự lấy lại đơn được: `can(A,"dispatch.assign",{ownerId:"A"})` = true theo thử của tôi, nên A đổi người phụ trách về mình. Nội dung cũ thì không phục hồi được từ hệ thống. Phần chỉ quan sát được khi chạy thật là các con số cụ thể của báo cáo gốc (tên "Bị B đổi", 3 → 1 khách, 1.200.000 → 450.000, mã đơn TD-20261002-0019). Tôi không kiểm các số đó, nhưng chúng khớp với cơ chế đọc từ mã.
>   - *Rào chắn đã thấy:* Không có rào chắn kỹ thuật nào chặn đường đi. Dưới đây là các quy tắc liên quan và thiết kế cố ý. 1. ADR-0009 điều 1 (accepted) đổi `order.modify` của SALES từ `own` sang `ownOrAssigned`, để người phụ trách "sửa được đơn (dịch vụ, số khách)". `docs/adr/ADR-0009-nguoi-phu-trach-duoc-sua-don.md:14`. 2. ADR-0020 điều 2 (accepted) cho Bán hàng "Nhận" đơn chưa có người, "kể cả chính người lập". `docs/adr/ADR-0020-don-moi-cho-huong-dan-vien-nhan.md:55`. Điều 7 (M1 = A) đếm cả đơn nháp là "chờ người nhận" (`:76`). Điều 5 chỉ hạn chế HDV ("chỉ xem") trên đơn nháp đã nhận (`:74`). Với Bán hàng thì không có hạn chế tương tự. 3. ADR-0030 S20-5 chỉ chốt Nhận với đơn huỷ, đã qua ngày đi, Đã giao. Không chốt đơn nháp. 4. e2e khoá hành vi này là đúng: `tests/e2e/orders.mjs:228-332` khẳng định "người phụ trách (khác người lập) sửa nháp đủ, xác nhận, sửa chuyến, huỷ". Ca đó người lập giao cho B, không phải B tự Nhận. Nhưng ô quyền và đường mã giống nhau. 5. Chốt "sau xác nhận": `PUT /api/orders/:id` trả 409 `not_editable` khi đơn không còn nháp (`orders/index.ts:734`). `handler-money-edit` chỉ dành cấp hẹp FIELD và Toàn quyền (`dispatch/index.ts:254-255`). Nên rủi ro bị giới hạn ở đơn nháp, trước khi xác nhận. 6. Lộ trình khắc phục đã ghi đây là câu hỏi chờ chủ: `docs/superpowers/plans/2026-10-02-khac-phuc-audit-00-lo-trinh.md:78`, "(viii) KD05 … Đúng ADR-0020, nhưng rủi ro; có siết không". Cũng ở `...-checklist.md:169` và `kiem-lai-ux.md:49` ("VẪN LỖI"). 7. ADR-0062 (accepted, "báo tin khi đơn đổi") không cứu được trường hợp này. Xem chinh_xac_hoa.

<a id="BH-02"></a>
### 9. BH-02 · SĐT khách trên đơn chấp nhận số sai độ dài, lệch luật SĐT của hồ sơ

- **Vai:** mọi người lập đơn
- **Loại:** sai
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Lệch có chủ đích đã ghi (đặc tả N2), nhưng luật rộng hơn mức cần
- **Hướng xử lý:** Cần chủ quyết (hợp đồng SĐT của API đơn)
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: mọi người lập đơn. Mức: **TRUNG BÌNH**. Loại: sai. **MỚI**.
- Mô tả: máy chủ nhận SĐT khách 8 số không có số 0 đầu (`12345678`), 9 số (`090512345`), 16 số (`0905123456789012`). Trong khi đó tra hồ sơ khách đòi "10 số, bắt đầu bằng 0 hoặc +84". Đơn lưu được với số không gọi được, và ô hồ sơ khách im lặng (không báo gì) nên không gắn được hồ sơ.
- Tái hiện: `POST /api/orders` với `customerPhone` = các giá trị trên.
- Thấy: 201 (TD-20261002-0006, -0007, -0008). `GET /api/parties/lookup?phone=909000111` → 400 "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84)". Giao diện: gõ `12345678` → khối hồ sơ khách không hiện câu nào (`pw/s8.mjs`).
- Mã: `src/modules/orders/rules.ts:90` `PHONE_RE = /^\+?[0-9][0-9 .\-]{6,18}[0-9]$/`.
- Đề xuất: dùng một luật SĐT chung (như module hồ sơ), cho phép khách nước ngoài bằng tiền tố + rõ ràng; báo ngay dưới ô khi số sai.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (dữ liệu). Số khách sai/thiếu chữ số (lỗi gõ thường gặp nhất là rơi một chữ số) vẫn lưu được và sau đó hiện ở thẻ đơn, `tel:` và các màn của HDV/tài xế, nên khó liên lạc khách và không gắn được hồ sơ; có đường vòng (sửa nháp, đổi khách sau xác nhận) nên không phải CAO. Không liên quan tiền hay lộ dữ liệu.
>   - *Chính xác hoá:* Phần đúng: mọi dữ kiện kỹ thuật (PHONE_RE tại rules.ts:90, ba giá trị 8/9/16 chữ số được nhận, lookup 400 đúng câu trích, khối hồ sơ khách im lặng) khớp mã. Các điểm cần chỉnh: (1) Việc luật SĐT trên đơn rộng hơn luật hồ sơ là lệch có chủ đích đã ghi ở spec N2 lát 1 §8 mục 1 (để nhận số khách nước ngoài); báo cáo gốc ghi "MỚI", "Loại: sai" mà không nhắc điều này. Lỗi thật chỉ là luật rộng QUÁ mức cần: không bắt buộc "+" cho số không phải Việt Nam và không có số chữ số tối thiểu (ví dụ "1-------8", "0000000000" vẫn qua). (2) Câu "ô hồ sơ khách im lặng" cũng là hành vi đã mô tả trong spec ("giao diện không gọi lookup"); chỗ thiếu là không có lời nhắc cho người dùng. (3) "Số không gọi được" là suy luận hợp lý, không chứng minh được bằng mã. Số hiệu đơn TD-20261002-0006/-0007/-0008 và câu trả lời 201 chỉ quan sát khi chạy thật, tôi không kiểm lại được (không chạy máy chủ). (4) Đề xuất "bằng tiền tố +" cũng chạm hợp đồng nhận SĐT của API đơn, nên cần chủ quyết (xem cách sửa). (5) Số dòng của báo cáo đúng (rules.ts:90); spec cũ còn ghi `rules.ts:39` đã lệch (nay là :90), không ảnh hưởng báo cáo này.
>   - *Hướng sửa gợi ý:* Siết luật SĐT trên đơn thành hai nhánh dùng chung một hàm thuần ở src/shared: số Việt Nam (không "+", hoặc +84) phải qua đúng chuẩn 10 số của `normalizePhone`; số nước ngoài chỉ nhận khi có "+" và mã nước khác 84, với số chữ số tối thiểu/tối đa hợp lý, và bỏ việc cho lặp dấu chấm/gạch. Đồng thời để ô hồ sơ khách hiện một dòng nhắc khi số không tra được. Việc này đổi quy tắc nhận đầu vào của API đơn và có thể làm lưu thất bại với đơn nháp cũ đang chứa số lạ, nên theo P8 cần hỏi chủ dự án trước khi làm (kèm rà các đơn nháp hiện có).
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả, đọc từ mã thật: 1. Điểm vào: trang lập đơn có ô `<input id="customerPhone" type="tel" inputmode="tel" maxlength="30" required>` (public/order-form.html:41). web/order-form.ts:336 chỉ kiểm "không rỗng" (`need("customerPhone", "Nhập số điện thoại khách.")`), không kiểm dạng số. web/order-form.ts:344 gửi nguyên chuỗi. 2. Máy chủ: `validateOrder` gọi `validateCustomer` (src/modules/orders/rules.ts:126, định nghĩa :110-118). Dòng 113 `text(b.customerPhone, ..., 30, true)`; dòng 115 chỉ gộp khoảng trắng; dòng 116 `if (!PHONE_RE.test(phoneValue)) return fail("Số điện thoại khách không hợp lệ.")`. Luật ở rules.ts:90: `PHONE_RE = /^\+?[0-9][0-9 .\-]{6,18}[0-9]$/` (tổng 8–20 ký tự, có thể thêm "+" ở đầu). Dòng 117 trả `phone: phoneValue` rồi lưu thẳng vào `orders.customer_phone` (rules.ts:188 → src/modules/orders/repository.ts:910, :970). Cùng luật dùng cho đổi khách `PUT /api/orders/:id/booker` (rules.ts:216). 3. Tự chạy lại: script Node (scratchpad/p.mjs) với đúng regex trên: "12345678" → true, "090512345" → true, "0905123456789012" → true. Cùng ba số qua `normalizePhone` (src/shared/phone.ts:3-8, chuẩn `/^0\d{9}$/` sau khi đổi +84/84) đều → null. Khớp mô tả của báo cáo gốc. 4. Luật hồ sơ chặt hơn: GET /api/parties/lookup chuẩn hoá bằng `normalizePhone`, sai thì 400 "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84)." (src/modules/parties/index.ts:527-528, đúng câu trích). Tạo hồ sơ mới cũng đòi số VN 10 số (src/shared/booker.ts:34-35). 5. Giao diện im lặng: web/booker-picker.ts:56-59 `if (!lookupReady(o.phone.value)) { replaceChildren(matches); return; }` — xoá khối kết quả, không in câu nào. `lookupReady` = `normalizePhone(phone) !== null` (src/shared/booker.ts:52). 6. Tôi cũng tìm thêm: PHONE_RE rộng hơn báo cáo nêu. Chạy thử: "1-------8", "1.......8", "0000000000", "0000000000000000000" đều được nhận (dấu chấm/gạch được lặp, không đòi số chữ số tối thiểu), tức một số chỉ có 2 chữ số vẫn qua. 7. Test bộ luật orders vẫn xanh: `node --test src/modules/orders/rules.test.ts` → 21 pass, 0 fail. Bài khoá hành vi hiện tại: rules.test.ts:85 (chỉ bắt "abc"), :166-169 (SĐT trên đơn "giữ nguyên bản gõ", không chuẩn hoá), :184. Không có bài nào kiểm độ dài tối thiểu.
>   - *Rào chắn đã thấy:* Không có rào chắn nào chặn ba số trong báo cáo. Chỉ có các quy tắc sau: - Khoảng độ dài 8–20 ký tự của PHONE_RE (src/modules/orders/rules.ts:90) và `maxLength 30` (public/order-form.html:41; máy chủ giới hạn 30 tại rules.ts:113): chỉ chặn số quá ngắn (<8 ký tự) hoặc có chữ cái. - Dấu hiệu THIẾT KẾ CỐ Ý cho việc hai luật lệch nhau (không bác bỏ được mô tả hành vi, nhưng làm yếu khung "sai/lệch"): docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md §8 mục 1 (dòng 120) ghi rõ "form đơn nhận SĐT rộng (PHONE_RE) nhưng tra cứu và liên hệ hồ sơ chỉ nhận số Việt Nam 10 số ... Với số nước ngoài: giao diện không gọi lookup, không tạo được hồ sơ kèm số → đơn không gắn ... Mở rộng chuẩn hoá số quốc tế là việc riêng"; câu hỏi A chủ đã chọn (a) "được lập đơn không gắn hồ sơ" (cùng tệp dòng 42-46 và khung quyết định dòng 28-31; ADR-0011 chép lại quyết định này); bình luận src/shared/booker.ts:51 và bài rules.test.ts:159-164 (số +1 bị từ chối khi TẠO HỒ SƠ nhưng vẫn là SĐT hợp lệ trên đơn). Spec ghi "đã thi công" nhưng chưa nói luật rộng này cho phép số 8/9 chữ số không có "+". - Đường vòng: đơn nháp sửa được; đơn đã xác nhận đổi khách được qua PUT /api/orders/:id/booker với quyền `order.trip.edit` (ADR-0011 điều 2). Không có kiểm tra nào ép người dùng nhận ra số sai, vì ô gõ không báo lỗi.

<a id="BH-07"></a>
### 10. BH-07 · Bán hàng không sửa được số khách/dịch vụ sau khi xác nhận: phải huỷ và lập đơn mới

- **Vai:** Bán hàng
- **Loại:** bất hợp lý theo thiết kế
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Đã biết (ADR-0063, đề xuất chờ duyệt)
- **Hướng xử lý:** Chờ duyệt ADR-0063
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng. Mức: **TRUNG BÌNH**. Loại: bất hợp lý theo thiết kế. **MỚI** ở góc vai Bán hàng; hậu quả tiền là **G1** (cọc kẹt ở đơn huỷ — ADR-0089 Task 9 "chuyển tiền sang đơn mới" chưa làm).
- Mô tả: khách thêm/bớt người sau khi xác nhận là việc hằng ngày. `PUT /api/orders/:id` trả 409 "…Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới." Route sửa tiền sau xác nhận (`handler-money-edit`) chỉ cho HDV phụ trách và Toàn quyền, dù bảng quyền ghi `order.money.edit` SALES = `own` (ô không có route nào hỏi).
- Tái hiện: `bh/a2.mjs` — đơn TD-20261002-0019 đã xác nhận, PUT đổi số khách.
- Thấy: 409 `not_editable`. Mã `src/modules/dispatch/index.ts:254-255`.
- Đề xuất: hoặc mở đường sửa có kiểm cho người lập, hoặc làm Task 9 trước để "huỷ rồi lập lại" chuyển được cọc.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (chặn việc). Việc hằng ngày của Bán hàng (đổi số khách sau xác nhận) không làm được trực tiếp nên gây khó rõ rệt, nhưng có đường vòng (HDV phụ trách, Toàn quyền, huỷ và lập lại kèm Kế toán hoàn cọc). Không sai tiền, không lộ dữ liệu; rủi ro tiền chỉ nằm ở cọc kẹt đơn huỷ (G1) và đã có kế hoạch riêng.
>   - *Chính xác hoá:* (1) Câu "MỚI ở góc vai Bán hàng" chưa chính xác: khoản này đã được ghi nhận từ trước, có ADR-0063 (proposed) và ADR-0062 dòng 58 nói rõ; nên gắn nhãn "đã biết, chờ duyệt ADR-0063" thay vì "mới". (2) Tham chiếu "Thấy: 409 `not_editable`. Mã `src/modules/dispatch/index.ts:254-255`" lẫn hai việc: 409 `not_editable` và câu "hãy huỷ và tạo đơn mới" nằm ở `src/modules/orders/index.ts:51` và `:734`; `dispatch/index.ts:254-255` là chốt 403 của route `handler-money-edit` (chỉ tới đó khi gọi đường HDV). (3) Mô tả hẹp: đây không chỉ là Bán hàng; Kế toán và Quản trị (ô `any`) cũng không sửa được số khách đơn đã xác nhận qua route nào (chỉ HDV phụ trách và Toàn quyền), điều ADR-0063 đã nêu. (4) Câu "ô không có route nào hỏi" đúng ở nghĩa hiệu lực: ô SALES=own không route nào dùng để cấp quyền; nhưng bài `src/permission-enforcement.test.ts:108` vẫn coi ô là "được đọc" vì `dispatch/index.ts:254` đọc `MATRIX["order.money.edit"]` để tìm mức "assigned". (5) Đề xuất "hoặc mở đường sửa có kiểm cho người lập, hoặc làm Task 9" thiếu phương án thứ ba đã có sẵn: duyệt ADR-0063 (chủ đã chốt thứ tự). Phần còn lại (đơn TD-20261002-0019, kết quả 409) chưa tái hiện lại vì không được chạy máy chủ; khớp với mã.
>   - *Hướng sửa gợi ý:* Đưa ADR-0063 D1 (route văn phòng sửa số khách cho Bán hàng lập đơn, Kế toán, Quản trị, Toàn quyền, dùng chung `planMoneyEdit`/`insertMoneyAdjustment`, có mã lý do) ra chủ duyệt rồi thi công, vì Sổ tiền lượt 1 đã lên. Trong lúc chờ, đổi câu 409 và dòng khoá trên chi tiết đơn để chỉ đường thật ("nhờ người phụ trách hoặc Quản trị") thay vì chỉ nói "huỷ và tạo đơn mới"; làm Task 9 để huỷ-lập-lại chuyển được cọc.
>   - *Bằng chứng (tệp:dòng):* Đường đi dựng lại từ mã thật. (1) Điểm vào PUT /api/orders/:id, `src/modules/orders/index.ts:727`: qua `can(staff,"order.modify",...)` (dòng 732) rồi gặp `if (meta.status !== "draft") return NOT_EDITABLE();` (dòng 734). `NOT_EDITABLE` định nghĩa ở `src/modules/orders/index.ts:51` = 409 `not_editable`, "Chỉ sửa được đơn đang chờ xác nhận. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới." Đúng nguyên văn trích trong BH-07. (2) Đường sửa sau xác nhận duy nhất: POST /api/orders/:id/handler-money-edit, `src/modules/dispatch/index.ts:245`. Dòng 254: `narrowEligible = assigned && staff.permissions.some((p) => MATRIX["order.money.edit"][p] === "assigned")`; dòng 255: `if (!narrowEligible && !hasPermission(staff,"SUPER_ADMIN")) return MONEY_EDIT_FORBIDDEN();` Chỉ ô "assigned" (FIELD) đang phụ trách và Toàn quyền qua được; Bán hàng (ô `own`), Kế toán, Quản trị (ô `any`) đều bị 403. Chú thích dòng 250-253 ghi rõ cố ý chặn ô `any`, vì ô đó "dành cho một route KHÁC, chưa làm". (3) Ma trận `src/shared/permissions.ts:95`: `"order.money.edit": row("own","any","any","assigned","none","any",...)` tức SALES=own, ACCOUNTING=any, ADMIN=any. `grep order.money.edit` trong `src/` và `web/` cho thấy không có route nào cấp quyền theo ô SALES/own hay ACCOUNTING/ADMIN any; chỉ `dispatch/index.ts:254` và `dispatch/rules.ts:60` đọc ô để tìm mức "assigned"; giao diện chỉ gọi route HDV (`web/viec-cua-toi.ts:204`). (4) Giao diện: `src/shared/order-view.ts:114` cho đơn đã xác nhận chỉ có `editTrip` và `cancel`, không có nút sửa số khách; `web/order.ts:788` cảnh báo trước khi xác nhận "dịch vụ, số khách và tiền sẽ bị khoá — chỉ còn sửa được thông tin chuyến". (5) Hậu quả tiền: `grep` "chuyển tiền sang đơn" trong `src/ web/ migrations/ scripts/ tests/` không ra gì; Task 9 vẫn chỉ là kế hoạch ở `docs/superpowers/plans/2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md:475`; ADR-0089 đ6 (`docs/adr/ADR-0089-...md:81`) đã duyệt nhưng chưa thi công. Bán hàng huỷ được đơn đã xác nhận (`orders/index.ts:987` hỏi `order.modify`), nên "huỷ rồi lập lại" làm được, nhưng cọc ở lại đơn huỷ. Chưa chạy test hay e2e: kết luận suy từ đọc mã.
>   - *Rào chắn đã thấy:* Không có rào chắn chặn đường sửa theo đúng nghĩa; chỉ có các quy tắc/tài liệu sau. (a) Khoá cố ý của đơn đã xác nhận: `orders/index.ts:734` và `dispatch/index.ts:250-255` (chặn ô `any` khỏi route hẹp của HDV). (b) Không phải thiết kế cố ý chặn Bán hàng: ADR-0007 (accepted 2026-09-20) điều "Phương án bị loại" (dòng 47) bác "Giữ khoá như A1 (đổi số khách/dịch vụ/tiền thì huỷ và lập đơn mới): chủ dự án đã quyết khác"; ADR-0009 dòng 14 và 24 giữ `order.money.edit` của SALES = `own` "chưa có cơ chế lý do + lịch sử". (c) Là khoản đã biết và đã lên kế hoạch, chưa thi công: ADR-0063 (`docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/ADR-0063-sua-don-sau-xac-nhan.md`, trạng thái proposed, lượt duyệt 2a, `docs/adr/README.md:93`) đề xuất route văn phòng `POST /api/orders/:id/money-edit` cho Bán hàng lập đơn, Kế toán, Quản trị, Toàn quyền; ADR-0062 dòng 58 ghi chủ chọn C2 và chốt 30/9 "làm ngay SAU Sổ tiền lượt 1"; Sổ tiền lượt 1 đã lên (commit `d5efcbbf`). `docs/SYSTEM-DESIGN.md:1129` cũng ghi phần "sửa sau xác nhận" cho SALES/ACCOUNTING/ADMIN "chưa làm". (d) Đường vòng hiện có: nhờ HDV đang phụ trách sửa (tới hết ngày đi, `dispatch/index.ts:257`), nhờ Toàn quyền, hoặc huỷ đơn rồi lập đơn mới và nhờ Kế toán hoàn cọc qua `POST /api/ledger/refunds` (`billing/index.ts:207`).

<a id="BH-06"></a>
### 11. BH-06 · Bán hàng là người phụ trách xác nhận được đơn nhưng không ghi được tiền khách đưa

- **Vai:** Bán hàng (người phụ trách đơn đồng nghiệp lập)
- **Loại:** bất hợp lý theo thiết kế
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mã đúng ADR-0026; mở rộng là quyết định mới của chủ
- **Hướng xử lý:** Cần ADR (quyền ghi thu)
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng (người phụ trách đơn đồng nghiệp lập). Mức: **TRUNG BÌNH**. Loại: bất hợp lý theo thiết kế. **MỚI**.
- Mô tả: A lập đơn, chọn B phụ trách. B xác nhận đơn được (200), sửa thông tin chuyến được, nhưng ghi lần thu (khách đặt cọc với B tại quầy) bị 403. HDV phụ trách thì ghi được.
- Tái hiện: `bh/a18.mjs` — TD-20261002-0029.
- Thấy: `B confirm (handler) => 200`; `B record payment as handler => 403 "Tài khoản này không được ghi tiền cho đơn này."`. Mã: `src/shared/permissions.ts` dòng `payment.receive`: SALES = `own` (không `ownOrAssigned`).
- Đề xuất: trình chủ quyết `payment.receive` của Bán hàng = `ownOrAssigned` (chạm quyền ⇒ cần ADR).

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (chặn việc). Không sai tiền, không lộ/mất dữ liệu, không vượt quyền (hành vi chặt hơn, không lỏng hơn); nhưng là một lỗ hổng năng lực nghiệp vụ thật: người phụ trách Bán hàng nhận cọc tại quầy không ghi được, buộc người lập/Kế toán/Quản trị ghi hộ — có thể ghi sai "người giữ tiền" hoặc chậm ghi, trong khi đơn bị khoá "Đã giao" nếu đã thu ≠ phải thu. Có đường vòng và giao diện chỉ ẩn nút (không báo lỗi), nên không lên CAO; mức TRUNG BÌNH là hợp lý, sát ranh THẤP nếu thực tế hiếm khi Bán hàng làm người phụ trách đơn của đồng nghiệp (tần suất đó không kiểm được từ mã).
>   - *Chính xác hoá:* Mô tả đúng về cơ chế và các mã trạng thái. Hiệu chỉnh nhỏ: (1) Câu "chạm quyền ⇒ cần ADR" đúng, nhưng nên ghi thêm rằng đây không phải mã lệch khỏi tài liệu chuẩn tắc — ADR-0026 đ10 (dòng 83) cố ý ghi SALES `own` (giữ) nên mã đúng ADR; việc mở rộng là quyết định mới của chủ (CLAUDE.md §2, §3: chạm quyền + tiền ⇒ ADR, không sửa mã trước). (2) Báo cáo gốc chỉ nêu 403 qua API; thực tế giao diện ẩn nút "Ghi lần thu" cho B (billing/index.ts:51 → web/order.ts:466), người dùng không gặp câu báo 403. (3) Dòng trích mã nên ghi cụ thể `src/shared/permissions.ts:103`. (4) Phần "Đề xuất: SALES = `ownOrAssigned`" chưa nêu hệ quả đi kèm: luật người thu (service.ts:67,76) khiến B ghi "người thu = chính mình" làm phát sinh dòng "tiền đang giữ hộ" nợ công ty ở sổ của B (ADR-0026 đ4) — phải được ADR cân nhắc, và bài ghim permissions.test.ts:43, SYSTEM-DESIGN.md:847, trang ghép ADR-0026 cần đổi cùng lúc.
>   - *Hướng sửa gợi ý:* Trình chủ quyết bằng ADR mới (chạm quyền + tiền): có cho Bán hàng đang phụ trách ghi lần thu hay không; nếu có thì đổi ô `payment.receive` của SALES sang `ownOrAssigned`, cập nhật bài ghim và tài liệu mô tả cùng commit, đồng thời nêu rõ luật người thu và sổ giữ hộ áp cho trường hợp này. Nếu chủ muốn giữ nguyên, ghi rõ vào tài liệu/Trợ giúp rằng "người phụ trách Bán hàng nhờ người lập hoặc Kế toán ghi lần thu" để nhân viên khỏi hiểu là lỗi.
>   - *Bằng chứng (tệp:dòng):* Đường đi dựng lại từ mã: (1) Điểm vào `POST /api/orders/:id/payments`, cổng "orders" — `src/modules/billing/index.ts:60`. (2) Lấy người lập đơn và cờ "đang phụ trách": `thongTinGiaoDon(env.DB, id)` trả `ownerId: row.staff_id` (`src/modules/orders/hoan-tat.ts:43`) cùng `isAssigned(id)` (billing/index.ts:63). (3) Cổng quyền `can(staff, "payment.receive", { ownerId: info.ownerId, assigned })` — billing/index.ts:65; sai thì trả `CANNOT_RECEIVE` = 403 "Tài khoản này không được ghi tiền cho đơn này." (billing/index.ts:20). (4) Ô `"payment.receive": row("own", "any", "any", "assigned", "own", "any", "own", ...)` — `src/shared/permissions.ts:103`; cột đầu là SALES = `own`. (5) `allows()` ở permissions.ts:226-240: `own` chỉ đúng khi `ctx.ownerId === whoId`, KHÔNG xét `ctx.assigned` (chỉ các ô `assigned` / `ownOrAssigned` mới xét). Bán hàng B là người phụ trách nhưng không phải người lập (ownerId = A) nên `can()` trả false và route trả 403. Tương phản trong cùng bản đồ: `order.modify` và `order.trip.edit` của SALES là `ownOrAssigned` (permissions.ts:79-80), route xác nhận hỏi `order.modify` với `assigned` (orders/index.ts:987) nên B xác nhận được (200), sửa chuyến được (orders/index.ts:789, 832…); `payment.receive` của FIELD là `assigned` (permissions.ts:103) nên HDV phụ trách ghi được — khớp đúng 3 vế của báo cáo gốc. Đã chạy `node --test src/shared/permissions.test.ts` → 28 đạt, 0 lỗi; bài này ghim đúng giá trị `"payment.receive": ["own","any","any","assigned","own","any","own","none","none","none"]` (permissions.test.ts:43). Bổ sung ngoài báo cáo gốc: giao diện KHÔNG hiện câu 403 cho B, vì `coTheGhiThu = can(payment.receive, scope)` (billing/index.ts:51) và nút "Ghi lần thu" chỉ hiện khi `t.coTheGhiThu` (web/order.ts:466) — B chỉ thấy mất nút.
>   - *Rào chắn đã thấy:* Không có rào chắn nào chặn hành vi này; ngược lại có quy định cố ý giữ nguyên. (a) ADR-0026 điều 10 (docs/adr/ADR-0026-so-cong-no-lan-thu-va-bien-nhan-danh-sach-trang.md, dòng 83): "`payment.receive`: `SALES` `own` (giữ), …, `FIELD` `none → assigned`, `PARTNER` `none → own`, `INTERN` `none → own`. Ba ô đổi chỉ để giữ năng lực hôm nay: ai đặt được tiền cọc trên form đơn của mình hôm nay thì ghi được lần thu trả trước trên đơn đó; HDV đang phụ trách ghi được tiền mình thu trước chuyến." Trang ghép docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md:37 ghi "own (giữ)". Bảng ADR-0007 điều 1 cũ cũng chỉ "thu: SALES của mình". (b) ADR-0009 điều 1 (dòng 14) chỉ đổi ba ô order.modify / order.history.view / dispatch.assign sang `ownOrAssigned` và nói rõ `order.money.edit` KHÔNG đổi — ô `payment.receive` ra đời sau (ADR-0026) và tôi không tìm thấy chữ nào trong ADR/đặc tả bàn riêng trường hợp "Bán hàng phụ trách đơn của người khác ghi tiền". Vậy đây là kết quả của việc ADR-0026 chỉ "giữ" ô cũ, không phải một quyết định có chủ đích loại người phụ trách Bán hàng. (c) Rào gần nhất là luật người thu: không phải Kế toán/Toàn quyền thì chỉ ghi người thu là chính mình hoặc Công ty (`src/modules/billing/service.ts:67,76`) — nghĩa là mở ô cho B còn kéo theo câu hỏi "tiền giữ hộ ghi cho ai". (d) Đường vòng sẵn có: người lập A (SALES `own`), Quản trị (`any`), Kế toán/Toàn quyền (`any`, Kế toán còn ghi được người thu là B qua `ledger.write`) ghi được. (e) Hàng rào test chỉ khoá giá trị ô (permissions.test.ts:43), không thi hành lại ý "đã duyệt phạm vi người phụ trách".

<a id="HT-05"></a>
### 12. HT-05 · "Sửa chuyến" không đổi được đồng thời xe + tài xế giữa xe công ty ↔ xe nhà xe: luôn 409 "tải lại rồi làm lại"

- **Vai:** Điều phối (Quản trị, Bán hàng)
- **Loại:** lỗi
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Điều phối (Quản trị, Bán hàng). **Mức:** TRUNG BÌNH (gần CAO: thay xe công ty hỏng bằng xe thuê ngoài là việc thường; chỉ còn đường huỷ chuyến + tạo lại + xếp lại). **Loại:** lỗi.
- **Tái hiện:** chuyến CX-0710-01 (xe công ty 79B-123.45 + Tài Xế Công Ty, ngoài vùng khoá). `PUT /api/van-chuyen/chuyen/:id` đổi sang xe nhà xe 79B-555.66 + Tài Xế Đối Tác (cặp hợp lệ — tạo chuyến mới với đúng cặp này 201) → **409 `trip_rule` "Chuyến vừa thay đổi hoặc lệnh vi phạm luật chuyến xe — tải lại rồi làm lại."** Chiều ngược (đối tác → công ty) cũng 409 y vậy. Đổi từng thứ một → 409 `cheo_xe_tai_xe` "Tài xế không thuộc chủ của xe này" ⇒ không có đường đi tới đích. Trong vùng khoá có phá lệ: y hệt.
- **Mong đợi:** 200, đổi cả hai trong một lệnh.
- **Giao diện:** màn "Sửa chuyến CX-0710-01" chọn 79B-555.66 + Tài Xế Đối Tác → "Lưu" → dòng đỏ "Chuyến vừa thay đổi hoặc lệnh vi phạm luật chuyến xe — tải lại rồi làm lại." (ảnh `qt-sua-T4-loi.png`). Làm theo câu báo (tải lại, chọn lại, lưu) vẫn y vậy.
- **Nguyên nhân (đọc mã):** lô `loSuaChuyen` (`src/modules/van-chuyen/dieu-phoi.ts:134-146`) cập nhật **xe trước**, đóng/mở dòng tài xế **sau**; trigger `vc_trip_vehicle_carrier_upd` (`migrations/0042_chuyen_xe.sql:508-517`) kiểm xe mới với dòng tài xế CŨ còn mở → ABORT; route đổi lỗi CSDL thành câu chung "tải lại".
- **MỚI.** **Đề xuất:** trong lô sửa, đóng dòng tài xế cũ trước khi đổi xe (hoặc đổi xe sau khi mở dòng tài xế mới) + bài e2e đổi cặp công ty ↔ nhà xe.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (chặn việc). Việc chính (thay xe công ty hỏng bằng xe nhà xe, hoặc ngược lại, trên chuyến chưa chạy) bị chặn hoàn toàn bằng 'Sửa chuyến', và câu báo 'tải lại rồi làm lại' dẫn sai hướng. Có đường vòng là huỷ chuyến rồi tạo lại và xếp lại khách, tốn công nhưng làm được, nên chưa lên CAO.
>   - *Chính xác hoá:* Báo cáo đúng về lỗi, nguyên nhân và đường đi. Có hai chỗ cần chỉnh: 1) Đề xuất 'đổi xe sau khi mở dòng tài xế mới' là SAI. Thử thật (ca 4) vẫn ABORT lc13_cross ở lệnh mở tài xế mới, vì trigger vc_trip_driver_carrier_ins (0042:500-507) đọc chủ xe chụp cũ của chuyến. Nếu mở tài xế mới khi chưa đóng dòng cũ thì còn vướng chỉ mục duy nhất vc_trip_driver_open_uq (0042:80). Chỉ thứ tự 'đóng lái cũ, rồi đổi xe và chủ xe, rồi mở lái mới' chạy được. 2) Tệp:dòng chỉnh lại: loSuaChuyen là dieu-phoi.ts:134-148 (báo cáo ghi 134-146). Nguyên nhân còn một mắt xích mà báo cáo chưa nêu là trigger chèn tài xế ở 0042:500-507. Câu báo 'cheo_xe_tai_xe' trong code là 'Tài xế không thuộc chủ của xe này.' (dieu-phoi-route.ts:40), báo cáo trích thiếu dấu chấm. Hai chỗ này không đổi kết luận. Mức 'gần CAO' trong báo cáo gốc: tôi giữ TRUNG BÌNH vì có đường vòng. Phần giao diện (ảnh, dòng đỏ trên màn) tôi không kiểm được, chỉ suy ra từ mã.
>   - *Hướng sửa gợi ý:* Trong lô sửa chuyến, khi đổi tài xế, đưa câu đóng dòng tài xế cũ lên TRƯỚC câu cập nhật xe và chủ xe, để trigger đổi xe không còn thấy tài xế cũ còn mở; câu mở tài xế mới giữ ở sau. Thêm ca kiểm cho cả hai chiều công ty và nhà xe (bài lô, e2e) và đối chiếu bài thu-tu-lo (src/modules/van-chuyen/thu-tu-lo.test.ts). Không sửa migration 0042 vì đã áp remote. Việc chạm logic lô điều phối nên đi qua người kiểm độc lập.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả, đã đọc mã và chạy lại bằng SQL thật: 1) Giao diện gửi cả hai trường trong một lệnh: web/chuyen-sua.ts:189-190 đặt b.xeId khi xe đổi và b.taiXePartyId khi tài xế đổi, rồi PUT /api/van-chuyen/chuyen/:id (web/chuyen-sua.ts:224-226). 2) Route PUT: src/modules/van-chuyen/index.ts:1011-1022 gọi lenhSuaChuyen. 3) Lớp luật thuần cho qua cặp mới. src/modules/van-chuyen/dieu-phoi-lenh.ts:63-70 gọi kiemTaoSuaChuyen với xe mới và tài xế mới. khongCheo (src/shared/dieu-phoi-kiem.ts:69-70, gọi ở :137) xét theo cặp MỚI nên đúng cặp thì không chặn. Dòng :51-53 chỉ chặn khi tài xế mới không có trong taiXeChoDieuPhoi. 4) Dựng lô: dieu-phoi-lenh.ts:89-96 gọi loSuaChuyen. Thứ tự câu lệnh ở src/modules/van-chuyen/dieu-phoi.ts:136-145 là: cổng, nhật ký, sự kiện, TRIP_UPDATE_PLAN (đặt vehicle_id và carrier_party_id, chuyen-repo.ts:323-329), rồi DRIVER_CLOSE (REASSIGNED), rồi DRIVER_INSERT. 5) Trigger vc_trip_vehicle_carrier_upd (migrations/0042_chuyen_xe.sql:508-517) chạy ngay ở câu UPDATE chuyến. Lúc đó dòng tài xế cũ vẫn mở (valid_to_at IS NULL) vì DRIVER_CLOSE đứng sau. - Công ty sang nhà xe: nhánh dòng 511-513 đúng, vì tài xế công ty cũ không có trong v_pty_carrier_driver của nhà xe mới. Kết quả ABORT 'lc13_cross: tài xế không thuộc chủ của xe mới'. - Nhà xe sang công ty: nhánh dòng 514-516 đúng, vì tài xế đối tác cũ có trong v_pty_carrier_driver. Kết quả ABORT cùng câu. 6) src/modules/van-chuyen/dieu-phoi-route.ts:97-101 bắt lỗi, rules.ts:153 có regex khớp 'lc1[0-6]_' và trả 409 trip_rule với câu CAU_LUAT_CHUYEN (rules.ts:149) 'Chuyến vừa thay đổi hoặc lệnh vi phạm luật chuyến xe — tải lại rồi làm lại.'. Làm theo câu này không đổi được gì. Tự dựng lại bằng node:sqlite, nạp toàn bộ migrations/*.sql (tệp tạm ngoài repo: /tmp/claude-0/-home-user-tourdaobooking/193aa37f-359e-58b0-a82b-73c46574fd0c/scratchpad/ht05.mjs; Node v22.22.0). Kết quả: - 1. công ty→nhà xe, thứ tự hiện tại (xe → đóng lái → mở lái): ABORT lc13_cross '...của xe mới'. - 2. nhà xe→công ty, thứ tự hiện tại: ABORT lc13_cross '...của xe mới'. - 3 và 3b. đóng lái cũ → đổi xe → mở lái mới: OK cả hai chiều. - 4. đóng lái → mở lái mới → đổi xe: ABORT lc13_cross '...của xe'. Mở lái mới trước khi đổi xe vẫn bị trigger vc_trip_driver_carrier_ins (0042:500-507) chặn vì chuyến còn mang chủ xe cũ. - 5a. chỉ đổi xe sang nhà xe, giữ tài xế công ty: ABORT. 5b. chỉ đổi tài xế sang tài xế nhà xe, giữ xe công ty: ABORT. Khớp với 'đổi từng thứ một thì không có đường đi'. - 6. đối chứng công ty→công ty đổi cả xe và tài xế theo thứ tự hiện tại: OK. Vậy lỗi chỉ ở nhánh chéo loại chủ. Test hiện có không phủ ca này. src/migrations-chuyen-xe.test.ts:609-613 và :627-628 chỉ thử từng thứ một ở mức SQL thẳng. Các PUT sửa chuyến trong src/modules/van-chuyen/dieu-phoi.test.ts:174,216,219,223 và tests/e2e/tin-chuyen.mjs:84 chỉ đổi tài xế trong cùng loại chủ. grep 'nhaXe|carrier' trong dieu-phoi.test.ts không có kết quả.
>   - *Rào chắn đã thấy:* Không có rào chắn nào ngăn lỗi. Chỉ tìm thấy các quy tắc sau, không quy tắc nào cho thấy đây là thiết kế cố ý: - Quy tắc 'không chéo xe và tài xế' (ADR-0048 Q6=(a), docs/adr/ADR-0048:63-67; ADR-0049 LC-13) cấm cặp lệch loại chủ. Nó không cấm đổi cả cặp sang cặp hợp lệ khác. ADR-0057 (docs/adr/ADR-0057:145) và ADR-0055:205 còn mô tả 'đổi xe sang xe nhà xe' và 'đổi sang xe công ty' là việc hợp lệ. - Lớp luật thuần cho qua cặp mới hợp lệ (dieu-phoi-kiem.ts:69-70, 137). Chỉ lớp CSDL chặn, do thứ tự câu lệnh. - rules.ts:146-148 ghi lớp CSDL chỉ là lưới thứ hai, 'chỉ tới đây khi lớp route bị vượt (hai người ghi cùng lúc)'. Ca này không phải đua, nên cho thấy đây là lỗi thứ tự, không phải thiết kế. - src/modules/van-chuyen/thu-tu-lo.test.ts:7-9 khoá thứ tự 'cổng, nhật ký, sau đó mọi câu mang lính gác dấu lệnh'. Nó không khoá thứ tự đóng lái so với đổi xe nên đổi thứ tự không vi phạm bài này. - Không có migration sau 0042 làm lại các trigger lc13_cross (grep migrations/ chỉ thấy 0042). - Đường vòng tồn tại: huỷ chuyến rồi tạo lại và xếp lại khách. Đây là đường vòng thủ công, không phải rào chắn.

<a id="HT-04"></a>
### 13. HT-04 · Bấm nhầm "Đã đón" / "Khách đã huỷ" không sửa lại được — kể cả văn phòng

- **Vai:** Tài xế công ty, Quản trị
- **Loại:** khó dùng / bất hợp lý
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Hệ quả luật lõi LC-07 (đã duyệt)
- **Hướng xử lý:** Cần ADR (đổi luật lõi LC-07)
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế công ty, Quản trị. **Mức:** TRUNG BÌNH (dữ liệu sai vĩnh viễn: khách vắng bị ghi đã đi). **Loại:** khó dùng / bất hợp lý.
- **Tái hiện:** chuyến đang chạy, khách Vũ Thị Mai đã "Đã đón". Tài xế `POST …/phan-bo/:aid/vang` → 409; `…/khach-huy` → 409; Quản trị `POST /chuyen/:id/phan-bo/:aid/vang` → 409 `suat_da_co_ket_qua` "Khách này đã có kết quả — không đổi được." Trên màn tài xế sau "Đã đón" không còn nút nào cho dòng khách đó; ba nút "Đã đón / Vắng / Khách đã huỷ" (90×44, 90×44, 126×44) nằm sát nhau, không hỏi lại.
- **Mong đợi:** có "Sửa" trong vài phút cho tài xế hoặc văn phòng sửa có lý do (như "Bỏ đánh dấu" của "Đã gọi báo").
- **Bằng chứng:** `kiem-vai/ht/t1.mjs`, `t2.mjs`; `src/modules/van-chuyen/dieu-phoi-tien-do.ts:145`; ảnh `tx-T2-sau-da-toi-don.png`.
- **MỚI** — tài liệu nguồn hướng dẫn `docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/tai-xe.md:8` ghi "Văn phòng sửa lại được đến đâu: **chưa kiểm**" — nay đã kiểm: **không sửa được**.
- **Đề xuất:** lệnh "sửa kết quả khách" cho văn phòng (ghi lý do, giữ nhật ký), hoặc cửa sổ hoàn tác ngắn cho tài xế.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (dữ liệu). Ghi chép sai về một khách (vắng bị ghi đã đón, hoặc khách thật bị ghi đã huỷ làm nhả chỗ trong phép đếm sức chứa) không ai sửa được kể cả Quản trị, và nút trên màn tài xế gửi ngay không hỏi lại; nhưng không động tiền, quyền hay dữ liệu cá nhân, lỗi chỉ phát sinh khi bấm nhầm, chuyến vẫn kết thúc thường bằng "Đã trả", và đây là hệ quả của luật lõi đã duyệt chứ không phải lỗi mã nên ở cận dưới của mức TRUNG BÌNH.
>   - *Chính xác hoá:* Phần đúng: mọi hành vi kỹ thuật (409 suat_da_co_ket_qua ở cả route tài xế lẫn văn phòng, câu chữ, không còn nút sau Đã đón / Khách đã huỷ, dẫn dieu-phoi-tien-do.ts:145, tài liệu nguồn tai-xe.md:8). Cần chỉnh: (1) Đây không phải lỗi hay "bất hợp lý" của mã mà là hệ quả của luật lõi LC-07 đã duyệt (ADR-0049, Hiến chương 5.1); dòng "MỚI ... Mong đợi: có Sửa" thực chất là đề xuất ĐỔI luật lõi, nên phải qua ADR chủ duyệt (CLAUDE.md §3: chạm bất biến thì dừng và hỏi), không phải sửa mã. (2) Báo cáo bỏ sót việc "Vắng" bấm nhầm sửa được bằng "Đã đón" (bước lùi duy nhất cố ý), nên tiêu đề "bấm nhầm không sửa lại được" chỉ đúng với Đã đón, Khách đã huỷ (và cả Đã trả, vốn là trạng thái cuối); câu "Văn phòng sửa lại được đến đâu ... không sửa được" đúng với hai kết quả này. (3) "Không hỏi lại" đúng cho màn tài xế (web/cuoc-chuyen.ts:177-191); màn văn phòng có một hộp khai giờ trước khi ghi (web/chuyen.ts:391-398) nhưng đó không phải hộp xác nhận. (4) Kích thước nút 90x44 / 126x44 và việc "sát nhau" chỉ thấy được khi chạy giao diện, tôi không kiểm được từ mã. (5) Tài liệu nguồn tai-xe.md:8 dẫn tien-do-man.ts:126 nhưng logic nút nằm ở tien-do-man.ts:146 (dòng đã lệch; không ảnh hưởng báo cáo HT-04). (6) Cụm "dữ liệu sai vĩnh viễn" hơi nặng lời: nhật ký chỉ-thêm là chủ ý (chứng cứ), chưa thấy mã nào tính tiền từ trạng thái suất (chỉ kiểm thấy thông báo cho trip_passenger_no_show ở src/modules/thongbao/index.ts:47,61; các đường đọc xuôi dòng khác tôi chưa duyệt hết).
>   - *Hướng sửa gợi ý:* Hướng an toàn trước mắt (chỉ bề mặt, đảo ngược được, không đụng LC-07): thêm bước xác nhận hoặc cửa sổ "hoàn tác" ngắn ở màn tài xế trước khi gửi lệnh Đã đón / Khách đã huỷ, và giãn khoảng cách ba nút. Nếu chủ muốn văn phòng sửa được kết quả sau khi ghi thì phải qua ADR sửa LC-07 (thêm bước đính chính có lý do, ghi sự kiện đính chính, kiểm lại sức chứa) — việc chạm bất biến dữ liệu nên dừng và hỏi chủ, không tự làm.
>   - *Bằng chứng (tệp:dòng):* Đường đi dựng lại từ mã. (1) Điểm vào: tài xế POST /api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/vang (src/modules/van-chuyen/index.ts:1284) hoặc /khach-huy (index.ts:1305); văn phòng bấm thay POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/vang (index.ts:1473) và /khach-huy (index.ts:1492). Hai bộ route gọi CHUNG lenhVang/lenhKhachHuy (src/modules/van-chuyen/dieu-phoi-tien-do.ts:164-165) -> lenhSuat (dieu-phoi-tien-do.ts:138). (2) Rào: dieu-phoi-tien-do.ts:144-145 `const k = LENH_SUAT[...]; if (!(k.tu).includes(a.status)) return loi409("suat_da_co_ket_qua")`; bảng LENH_SUAT ở src/modules/van-chuyen/dieu-phoi.ts:383-388: VANG.tu = ["WAITING"], KHACH_HUY.tu = ["WAITING"], DA_DON.tu = ["WAITING","NO_SHOW"], DA_TRA.tu = ["BOARDED"]. Suất đã BOARDED hoặc CANCELLED_AT_STOP không nằm trong `tu` của lệnh nào ngoài DA_TRA nên 409. (3) Câu chữ: src/modules/van-chuyen/dieu-phoi-route.ts:55 `suat_da_co_ket_qua: "Khách này đã có kết quả — không đổi được."` đúng nguyên văn báo cáo. (4) Lớp CSDL giữ lần nữa: câu ALLOC_TIEN_DO src/modules/van-chuyen/chuyen-repo.ts:428-436 (`status IN (SELECT value FROM json_each(?6))`) và trigger vc_trip_allocation_status_forward migrations/0042_chuyen_xe.sql:453-459 chỉ cho WAITING->BOARDED/NO_SHOW/CANCELLED_AT_STOP, NO_SHOW->BOARDED, BOARDED->DROPPED. (5) Giao diện: src/shared/tien-do-man.ts:146 `nut: ... WAITING ? ["don","vang","khach-huy"] : NO_SHOW ? ["don"] : []` nên sau Đã đón / Khách đã huỷ dòng khách không còn nút. Màn tài xế gửi lệnh thẳng, không hộp xác nhận: web/cuoc-chuyen.ts:177-191 (nhánh cuối `void chay(l.suatId, () => gui(...))`). Màn văn phòng chỉ mở hộp khai giờ (web/chuyen.ts:391-398), không có nút sửa. (6) Chuyến RUNNING khoá kế hoạch nên văn phòng không rút/đổi suất được (ADR-0049 LC-15, docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:133); đường duy nhất còn là "Kết thúc gián đoạn" (dieu-phoi-tien-do.ts:188-207). (7) Đã chạy: `node --test --test-name-pattern="TC-10 LC-07" src/migrations-chuyen-xe.test.ts` cho pass 1/1 (bài src/migrations-chuyen-xe.test.ts:438-451 khoá cứng BOARDED->WAITING phải RAISE lc07_forward). Bài src/modules/van-chuyen/cuoc-cua-toi.test.ts:121-122 khoá cứng "đón lại suất đã đón -> 409 suat_da_co_ket_qua". Tài liệu nguồn docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/tai-xe.md:8 đúng là ghi "Văn phòng sửa lại được đến đâu: chưa kiểm".
>   - *Rào chắn đã thấy:* Không có rào chặn việc "sửa" theo nghĩa lỗi mã, nhưng có luật cố ý đứng sau hành vi này: (a) LC-07 "Trạng thái chỉ đi tiến" trong ADR-0049 đã accepted (docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:119-128, "đổi bằng ADR; không ai phá lệ, kể cả Toàn quyền"); (b) Hiến chương 5.1 đã duyệt (docs/ARCHITECTURE.md:91) giữ "trạng thái chỉ đi tiến" ở cơ sở dữ liệu; (c) chính trigger ghi rõ bước lùi duy nhất được phép là NO_SHOW->BOARDED "đón muộn" (migrations/0042_chuyen_xe.sql:453; docs/superpowers/specs/2026-09-27-van-chuyen-ra-soat.md:122; docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:331,816-818), nghĩa là "Vắng" bấm nhầm CÓ sửa được bằng "Đã đón" (cả tài xế lẫn văn phòng, tien-do-man.ts:146); (d) các bài kiểm khoá hành vi (xem bằng chứng 7). Đối chiếu với "Bỏ đánh dấu" của "Đã gọi báo": đó là cờ nhắc, chủ chọn riêng ở ADR-0051 Q-GB-2 (docs/adr/ADR-0051-nhac-goi-bao-khach-gio-hen-doi.md:465), không phải máy trạng thái suất; chưa tìm thấy chỗ nào hỏi chủ về việc sửa "Đã đón"/"Khách đã huỷ" sau khi ghi (grep "bấm nhầm|hoàn tác|sửa kết quả" trong ADR-0049..0057, VAN-CHUYEN.md, BACKLOG.md không ra mục nào về suất).

<a id="HT-02"></a>
### 14. HT-02 · Tài xế bấm "Đã trả" ở điểm trả khi chưa đón ai: máy nhận, nhật ký "tới điểm trả" trước "tới điểm đón"; cả chuyến kết…

- **Vai:** Tài xế công ty
- **Loại:** sai / khó dùng
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế công ty. **Mức:** TRUNG BÌNH. **Loại:** sai / khó dùng.
- **Tái hiện (giao diện 390):** chuyến CX-0210-01 hẹn đón 23:40. Tài xế "Xuất bến" lúc 22:46 → ở thẻ điểm 2 (TRẢ) bấm **"Đã trả"** khi trên xe 0/16 → 200 (`…/diem/<điểm trả>/da-toi`), thẻ điểm trả thành "Đã tới 22:46". Sau đó "Đã tới" điểm đón 22:47, đón, trả, "Kết thúc chuyến" 22:48 — tất cả 200.
- **Thấy:** màn tài xế và nhật ký: "TRẢ — Đã tới 22:46" đứng trước "ĐÓN — Đã tới 22:47"; chuyến xong lúc 22:48, trước giờ hẹn 23:40.
- **Mong đợi:** nút "Đã trả" chỉ hiện / chỉ được nhận khi trên xe có khách xuống ở điểm đó; "Đã tới" điểm đón sớm hơn giờ hẹn quá xa thì hỏi lại.
- **Bằng chứng:** ảnh `tx-T2-sau-xuat-ben.png` (nút "Đã trả" có khi trên xe 0/16), `tx-T2-390-cuoi.png` (thứ tự giờ ngược).
- **MỚI.** **Đề xuất:** ẩn/khoá "Đã trả" khi không có suất nào đang trên xe xuống ở điểm này; máy chủ từ chối `da-toi` điểm trả khi chưa có suất BOARDED của điểm đó.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (dữ liệu). Máy chủ ghi giờ "tới điểm" sai thứ tự và sai thời điểm. Điểm đã ARRIVED thì không sửa lại được (`lenhDaToi` trả 409 `diem_da_toi`) và không đổi thứ tự được nữa (`lenhDoiThuTu` chỉ nhận điểm PENDING, dòng 217). Trạng thái khách, tiền và việc kết thúc chuyến không bị hỏng, đường nghiệp vụ vẫn đi tiếp được. Nên mức TRUNG BÌNH (sai dữ liệu tiến độ chuyến, có đường vòng), không đến CAO. Con số "kết thúc trước giờ hẹn 50 phút" phần lớn do người thử bấm liền trong hai phút, không phải rủi ro thực tế riêng; phần "bấm sớm" trùng gốc với HT-03.
>   - *Chính xác hoá:* Báo cáo gốc đúng về hành vi, nhưng có ba chỗ cần chỉnh. (1) Chữ "nhật ký 'tới điểm trả' trước 'tới điểm đón'" không chính xác về câu chữ. Dòng `audit_log` do `dieu-phoi-tien-do.ts:131` ghi là `"<mã chuyến>: tới điểm <seq> (<tên nơi>)"`, hành động `trip_stop_arrived` "Xe đã tới điểm" (`audit-actions.ts:116`), không nói đón hay trả. Nhãn ĐÓN/TRẢ chỉ xuất hiện trên thẻ điểm của màn tài xế (`nhanLoai`, `tien-do-man.ts:156`). Sự kiện `STOP_ARRIVED` trong dòng thời gian chỉ ghi "Đã tới điểm" kèm số điểm (`dongNhatKy`, `dieu-phoi-man.ts:332-337`). (2) "Mong đợi" ở báo cáo gốc ("Đã trả" chỉ hiện khi trên xe có khách xuống) quá chặt nếu áp nguyên văn. LC-16 đòi mọi điểm phải DONE/SKIPPED/MOVED mới kết thúc thường, mà `STOP_XONG_NEU_HET` (`chuyen-repo.ts:448-456`) chỉ chuyển điểm ARRIVED sang DONE. Một điểm TRẢ mà mọi khách ở đó đều Vắng/Khách huỷ vẫn phải được bấm "tới điểm" mới kết thúc thường được. Đó là lý do nút hiện cả khi điểm PENDING (`tien-do-man.ts:151`, nhánh `d.trangThai === "PENDING"`). Nếu ẩn hẳn nút thì tài xế bị dồn vào "Kết thúc gián đoạn" (ghi sai sự thật). Hướng sửa đúng là cho "tới điểm trả" khi không còn suất chờ lên xe có điểm xuống ở đó, chứ không phải khi trên xe có khách. (3) "Cả chuyến kết thúc trước giờ hẹn 50 phút" là hệ quả của việc người thử bấm một mạch trong vài phút. Hành vi mã có thật (không có luật nào so với giờ hẹn). Phần "Đã tới điểm đón sớm hơn giờ hẹn thì hỏi lại" là đề xuất tính năng mới, không phải lệch khỏi đặc tả nào đã duyệt, và trùng gốc với HT-03. Ngoài ra "MỚI" là đúng: grep không thấy mục nào trong BACKLOG hay đặc tả nói về việc này. HT-01 (thứ tự điểm tự dựng sai) là nguyên nhân khiến điểm TRẢ đứng trước điểm ĐÓN trên màn, và nên sửa cùng một lượt.
>   - *Hướng sửa gợi ý:* Ở máy chủ, lệnh "tới điểm" của điểm TRẢ phải bị từ chối bằng lời tiếng Việt khi còn suất WAITING chờ lên xe có điểm xuống ở đó (hoặc khi còn điểm ĐÓN đứng trước chưa tới), và giao diện ẩn/khoá nút cùng điều kiện đó qua một hàm thuần dùng chung trong `src/shared`. Vẫn cho "tới điểm" ở điểm TRẢ không còn ai phải trả (mọi khách Vắng/huỷ) để chuyến kết thúc thường được, đồng thời cân nhắc hỏi lại khi bấm "đã tới" điểm đón quá sớm so với giờ hẹn. Nên sửa chung với HT-01 và HT-03 vì cùng gốc: thiếu luật thứ tự và thời điểm ở lệnh tiến độ, khi đó cần thêm bài kiểm đỏ-trước-xanh-sau và dòng trong `docs/SO-HANG-RAO.md`. Việc này chạm hợp đồng giữa các phần (route, DTO), nên theo CLAUDE.md §3 cần chủ duyệt trước khi thi công.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả, đọc từ mã thật. (1) Giao diện: `src/shared/tien-do-man.ts:151` có `if (chay && !bo && d.loai === "DROPOFF" && (d.trangThai === "PENDING" || traCho.length > 0)) nut = { lenh: "tra-het", nhan: "Đã trả", ... }`. Nút "Đã trả" hiện ở mọi điểm TRẢ còn PENDING, kể cả khi `traCho` rỗng (không ai trên xe). Tôi chạy thử hàm thuần `buocDiem` với điểm 1 ĐÓN, điểm 2 TRẢ, một suất WAITING và chuyến RUNNING. Kết quả: `[{"so":"1","nut":"Đã tới"},{"so":"2","loai":"TRẢ","nut":"Đã trả","traCho":[]}]`. (2) Bấm nút: `web/cuoc-chuyen.ts:180-182` (`tra-het`) gửi `diem/<id>/da-toi` nếu điểm đang PENDING, rồi lặp qua `traCho` (rỗng nên không gửi lệnh nào khác). (3) Route `src/modules/van-chuyen/index.ts:1242-1260` (tài xế) và `:1435` (văn phòng) gọi `lenhDaToi`. (4) `src/modules/van-chuyen/dieu-phoi-tien-do.ts:117-134` chỉ kiểm: chuyến RUNNING (`dangChay`), điểm tồn tại, `s.status === PENDING` (409 `diem_da_toi` nếu khác) và `kiemGioLenh` (tài xế tự bấm thì xảy ra bằng ghi nhận nên qua). Không có dòng nào xét loại điểm (`s.kind`), thứ tự `seq`, hay còn suất WAITING chờ lên ở điểm này. (5) Câu SQL `STOP_DA_TOI` ở `src/modules/van-chuyen/chuyen-repo.ts:438-443` chỉ đòi `status = 'PENDING'` và chuyến RUNNING. Trigger `vc_trip_stop_status_forward` ở `migrations/0042_chuyen_xe.sql:446-452` chỉ đòi PENDING → ARRIVED, không có ràng buộc thứ tự giữa các điểm. (6) `kiemGioXayRa` (`src/shared/gio-xay-ra.ts:68-113`) chỉ so thứ tự giữa các sự kiện đã có (đã tới điểm trước đã đón/trả ở cùng điểm), không so thứ tự giữa điểm đón và điểm trả. (7) Việc chuyến "xong" sớm hơn giờ hẹn: `lenhKetThuc` (`dieu-phoi-tien-do.ts:169-185`) và `kiemKetThuc` (`src/shared/dieu-phoi-kiem.ts:431-435`) chỉ xét suất đã có kết quả và điểm đã DONE/SKIPPED/MOVED, không có luật nào so với giờ hẹn hay giờ dự kiến. Tôi không dựng lại được số giờ cụ thể 22:46/22:48 vì không chạy máy chủ. Trình tự trong mã không có chỗ nào chặn nên khớp báo cáo. Hai bài `node --test src/shared/tien-do-man.test.ts src/shared/gio-xay-ra.test.ts` pass 29/29. Không bài nào khoá hành vi điểm TRẢ PENDING mà 0 người trên xe: bài ở `tien-do-man.test.ts:77-90` chỉ khoá "Đã trả" khi CÓ khách BOARDED, bài ở `:92-99` chỉ khoá điểm đã ARRIVED mà hết khách thì không có nút.
>   - *Rào chắn đã thấy:* Có các rào liên quan nhưng không đủ chặn kịch bản này. (a) `ALLOC_TIEN_DO` (`chuyen-repo.ts:428-436`) và `lenhSuat` (`dieu-phoi-tien-do.ts:146-148`): "Đã đón" đòi điểm LÊN đã tới, "Đã trả" đòi điểm XUỐNG đã tới và suất đang BOARDED. Vì vậy trạng thái từng khách không bị hỏng, chỉ giờ "tới điểm" của điểm TRẢ bị ghi sớm. (b) `kiemGioXayRa` có vế GA-25 (`gio-xay-ra.ts:88-97`): giờ tới điểm trả ≤ giờ trả khách ở điểm đó, nhưng chỉ khi văn phòng khai giờ và so với sự kiện đã có, không so điểm đón. (c) `kiemKetThuc` / LC-16 (`dieu-phoi-kiem.ts:431`, `migrations/0042_chuyen_xe.sql:557-562`): chỉ kết thúc khi mọi điểm đã DONE/SKIPPED/MOVED và không còn suất WAITING/BOARDED. Rào này không chặn bấm lệch thứ tự. (d) Dấu hiệu thiết kế cố ý một phần: comment `tien-do-man.ts:122` ("Đã trả" = "tới điểm nếu chưa tới, rồi trả từng suất") và kế hoạch `docs/superpowers/plans/2026-09-29-adr-0049-giao-dien-nhat-ky.md:319` (+ Q-B-13 dòng 331) chủ đích gộp "tới điểm" và "trả khách" vào một nút ở điểm TRẢ. Không ADR hay đặc tả nào nói tài xế được bấm điểm không theo thứ tự; cũng không ADR nào cấm. Trong `docs/` không có mục "chấp nhận thứ tự bấm tuỳ ý" nào ở BACKLOG hay §16 `SYSTEM-DESIGN.md` (đã grep). ADR-0050 dòng 113-123 chỉ liệt kê các vế thứ tự giữa sự kiện (đã tới ≤ đã đón/trả cùng điểm; đã đón ≤ đã trả cùng suất), không có vế "điểm đón trước điểm trả". Không có luật máy chủ hay trigger nào kiểm thứ tự `seq` giữa các điểm khi ghi "đã tới". Không có hàng rào so "giờ bấm với giờ hẹn".

<a id="HT-08"></a>
### 15. HT-08 · Màn ghi "Điều kiện xuất bến: Đạt hết" nhưng bấm Xuất bến bị 409 "Chưa đủ thời gian nghỉ … Ai xử lý: Quản trị"

- **Vai:** Tài xế công ty, Điều phối
- **Loại:** sai / câu báo vô ích
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế công ty, Điều phối. **Mức:** TRUNG BÌNH. **Loại:** sai / câu báo vô ích.
- **Tái hiện:** tài xế Phan Văn Tài kết thúc gián đoạn CX-0210-02 lúc ~22:53; chuyến kế CX-0210-03 dự kiến 23:40. 22:55 mở chuyến: "Đạt hết — Đủ điều kiện xuất bến"; bấm "Xuất bến" → 409 `NGHI_THIEU` "Chưa đủ thời gian nghỉ sau chuyến trước: CX-0210-02 · Ai xử lý: Quản trị". Sau khi bị từ chối, màn vẫn "Đạt hết". Màn văn phòng `GET /chuyen/:id` cũng `lyDoGiu: []`.
- **Mong đợi:** hai màn báo trước "đủ nghỉ lúc HH:MM", câu từ chối nói giờ được xuất bến (chờ là xong, không phải việc của Quản trị).
- **Bằng chứng:** ảnh `tx2-T9-giu.png`, `tx2-T9-bam-xuat-ben.png`; `src/shared/dieu-phoi-kiem.ts:412` (so với giờ bấm thật, khác lúc tính "Đạt hết").
- **MỚI.** **Đề xuất:** tính dòng "Đủ giờ nghỉ" theo giờ hiện tại khi chuyến sắp chạy và hiện "được xuất bến từ HH:MM".

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (chặn việc). Màn báo "Đạt hết / Đủ điều kiện xuất bến" nhưng máy chủ từ chối trong khoảng `rest_minutes` phút (mặc định thử 30) sau khi chuyến trước kết thúc, lại chỉ sang "Quản trị" thay vì nói giờ được xuất bến. Không mất tiền hay dữ liệu và có đường vòng (chờ đủ nghỉ, hoặc Quản trị phá lệ nghỉ), nên không lên CAO; cũng không chỉ là chữ vì nó chặn việc chính tạm thời và nhắm đúng ca xe chạy nối chuyến.
>   - *Chính xác hoá:* Gần như đúng hoàn toàn; chỉ cần bổ sung ba điểm: (a) Dòng dẫn chứng `src/shared/dieu-phoi-kiem.ts:412` là chỗ so, nhưng nguyên nhân gốc là hai điểm gọi dùng mốc khác nhau: dieu-phoi-route.ts:191 (dự phóng = max(bây giờ, giờ bắt đầu), dùng cho cả DTO tài xế :217/:234 lẫn màn văn phòng :145) so với dieu-phoi-tien-do.ts:75 (giờ lúc bấm). Nên ghi cả hai tệp:dòng này. (b) "Màn văn phòng `lyDoGiu: []`" đúng, vì `chiTietChuyen` cũng đi qua `lyDoGiuDuPhong` (dieu-phoi-route.ts:145); kể cả nút "Xuất bến" bấm thay của văn phòng (route POST /chuyen/:id/xuat-ben, index.ts:1414-1424) cũng gặp 409 như vậy. Còn văn phòng có khai giờ xảy ra thì khoảng nghỉ đo theo giờ khai (I37) nên có thể thành công. (c) Phần "Ai xử lý: Quản trị" là ánh xạ cố ý, được bài ly-do-giu.test.ts:27 khoá, và Quản trị có thật đường phá lệ nghỉ; điều sai là dùng nhãn đó cho tình huống tự hết khi chờ, chứ không phải nhãn bịa. Báo cáo gốc nói "không phải việc của Quản trị" là đúng ở tình huống tái hiện nhưng chưa nêu việc Quản trị vẫn có đường gỡ. Số liệu "22:53 / 23:40 / 22:55" khớp luật thuần (kiểm lại bằng ca tái hiện). Không kiểm được ảnh chụp tx2-T9-giu.png / tx2-T9-bam-xuat-ben.png (không chạy được giao diện).
>   - *Hướng sửa gợi ý:* Khi chuyến sắp chạy và có thể bấm ngay bây giờ, dự phóng ở màn tài xế/chi tiết chuyến cần tính khoảng nghỉ theo giờ hiện tại (không chỉ giờ dự kiến), hoặc hiện dòng "được xuất bến từ HH:MM" để màn khớp với lúc bấm; giữ nguyên dự phóng theo giờ dự kiến cho lịch chung ngày khác (GA-11). Câu từ chối NGHI_THIEU nên nêu giờ sớm nhất được xuất bến và không chỉ sang Quản trị khi chỉ cần chờ; việc đổi chạm luật `ly-do-giu` và hợp đồng DTO nên đi qua chủ duyệt.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả, đọc từ mã thật: (1) HIỂN THỊ "Đạt hết". Màn tài xế GET /cuoc-cua-toi/:id gọi `cuocChiTiet` rồi `conThieu: lyDoGiuDuPhong(t, nc, c, bayGioMs)` (src/modules/van-chuyen/dieu-phoi-route.ts:217; danh sách cuốc ở :234). `lyDoGiuDuPhong` (:187-193) gọi `kiemXuatBen` với `bayGioMs: Math.max(bayGioMs, t.planned_start_ms), xuatBenMs: Math.max(bayGioMs, t.planned_start_ms)` (:191), tức giả định "xuất bến đúng giờ dự kiến", không phải giờ hiện tại. Màn văn phòng GET /chuyen/:id dùng cùng hàm (`chiTietChuyen`, dieu-phoi-route.ts:145, 164). Màn tài xế vẽ "Đạt hết" + "Đủ điều kiện xuất bến" khi `dieuKienConThieu` rỗng (web/cuoc-chuyen.ts:268, 272), và nút "Xuất bến" chỉ bị khoá khi `thieu.length > 0` (:275). Tại 22:55, chuyến CX-0210-03 dự kiến 23:40 thì xuatBenMs = 23:40. (2) LUẬT SO NGHỈ. src/shared/dieu-phoi-kiem.ts:411-412: với chuyến trước cùng xe/tài xế ở trạng thái ENDED hoặc ENDED_INTERRUPTED, `if (k.ketThucThatMs <= v.xuatBenMs && v.xuatBenMs - k.ketThucThatMs < c.nghiChup * PHUT) lyDo.push(lyDoGiu("NGHI_THIEU", k.ma))`. Với xuatBenMs = 23:40 và chuyến trước kết thúc 22:53 thì cách nhau 47 phút, đủ nghỉ (nghiChup = 30). (3) BẤM THẬT. POST /cuoc-cua-toi/:id/xuat-ben đặt `const bayGioMs = Date.now()` (src/modules/van-chuyen/index.ts:1226) rồi gọi `lenhXuatBen` (:1230). Hàm này đặt `xuatBenMs: x.ms` (src/modules/van-chuyen/dieu-phoi-tien-do.ts:75) với x.ms = giờ lúc bấm (dòng 35-36 cùng tệp, không khai giờ thì `Date.parse(l.lucIso)`), nên 22:55 − 22:53 = 2 phút, nhỏ hơn 30 phút, ra NGHI_THIEU. Dòng 78 trả `loi409("chua_du_dieu_kien_xuat_ben", kq.lyDo)`. (4) CÂU BÁO. Tiêu đề "Chuyến chưa đủ điều kiện xuất bến." (dieu-phoi-route.ts:49). Dòng lý do "Chưa đủ thời gian nghỉ sau chuyến trước: CX-0210-02" lấy từ src/shared/ly-do-giu.ts:57, với `aiXuLy: "QUAN_TRI"`. Giao diện ghép `${l.loiNhan} · Ai xử lý: ${l.aiXuLyNhan}` (web/dieu-phoi-ui.ts:60) và web/cuoc-chuyen.ts:67 hiện nó thành dải báo, nên đúng chuỗi báo cáo gốc nêu. (5) SAU KHI TỪ CHỐI. `chay()` bắt lỗi rồi `nap()` tải lại và `ve()` (web/cuoc-chuyen.ts:63-71). Tải lại vẫn tính theo (1) nên vẫn "Đạt hết". (6) TỰ TÁI HIỆN LUẬT THUẦN. Bản sao tạm trong scratchpad của src/shared/dieu-phoi-kiem.test.ts, thêm một ca: chuyến trước ENDED_INTERRUPTED kết thúc thật 22:53, chuyến sau dự kiến 23:40, nghiChup 30. Lệnh `node --test --test-name-pattern=HT-08 …/scratchpad/ht08.test.ts`, kết quả thật: `duPhong true []` (xuatBenMs = 23:40); `bam22:55 false [["NGHI_THIEU","Chưa đủ thời gian nghỉ sau chuyến trước: CX-3009-11","QUAN_TRI"]]`; `bam23:25 true`. Không sửa tệp nào trong repo.
>   - *Rào chắn đã thấy:* Không có rào nào chặn được sự lệch giữa lúc hiển thị và lúc bấm. Điều tìm thấy chỉ là các quy tắc/thiết kế liên quan: - Việc dùng "giờ xuất bến dự phóng" là cố ý nhưng cho lịch chung (GA-11): src/shared/dieu-phoi-lich-chung.ts:4-5 ("Nhờ vậy chuyến ngày mai không bị giữ 'nghỉ thiếu' chỉ vì chuyến trước vừa kết thúc"), :172-173; bài pin hành vi ở src/shared/dieu-phoi-lich-chung.test.ts:107-114; docs/superpowers/plans/2026-09-29-adr-0049-thi-cong-nhat-ky.md:148 ghi "tại lúc bấm xuất bến route gọi kiemXuatBen với bây giờ thật". Tức sự lệch giữa hai chỗ là hệ quả đã biết của GA-11, không thấy chỗ nào ghi nhận là hạn chế mà chủ đã chấp nhận cho màn tài xế. - Việc đo nghỉ từ giờ XẢY RA (không phải giờ bấm) là cố ý (I37): dieu-phoi-kiem.ts:11, 311-315; bài dieu-phoi-kiem.test.ts:373-382 và bam-thay.test.ts:155. Với tài xế tự bấm, giờ xảy ra = giờ bấm, nên từ chối lúc 22:55 là đúng luật. - "Ai xử lý: Quản trị" cho NGHI_THIEU là ánh xạ cố ý: ly-do-giu.ts:16, 54-57, bài ly-do-giu.test.ts:27. Quản trị thực sự có đường gỡ: sửa chuyến kèm `nghiPhaLe` cần ô `trip.override` (index.ts:1016, dieu-phoi-lenh.ts:69), và khi `c.nghiPhaLe` thì dòng 411 bỏ qua NGHI_THIEU. - Không thấy chỗ nào trong mã/docs tính hoặc hiện "đủ nghỉ lúc HH:MM" (grep "đủ nghỉ lúc|được xuất bến từ" rỗng). Không thấy ghi chú về điểm lệch này trong docs/VAN-CHUYEN.md hay ADR. Không thấy rào chặn xuất bến sớm hơn giờ chuyến dự kiến nên tài xế bấm sớm là khả dĩ.

<a id="HT-06"></a>
### 16. HT-06 · Đổi giờ đón sớm hơn giờ xuất bến sau khi đã xếp: chuyến vẫn "Đạt hết", tài xế không được báo

- **Vai:** Bán hàng → Điều phối → Tài xế
- **Loại:** sai nghiệp vụ
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Một phần theo thiết kế cảnh báo (MQ-04)
- **Hướng xử lý:** Cần ADR (bộ lý do giữ chuyến)
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Bán hàng → Điều phối → Tài xế. **Mức:** TRUNG BÌNH. **Loại:** sai nghiệp vụ.
- **Tái hiện:** chặng TD-…0001 đã xếp lên CX-0410-01 (07:00–09:30). Bán hàng `PUT /orders/:id/legs/:legId` đổi giờ đón 07:30 → **06:30** (200). Chuyến: `lyDoGiu: []`, chỉ `canhBao` "Giờ hẹn nằm ngoài khung giờ chuyến"; xuất bến vẫn được. Hộp thông báo tài xế: không có tin (chỉ "Bạn được xếp lái…"); màn "Cuốc của tôi" ghi chuyến **07:00** nhưng điểm 1 "HẸN 06:30".
- **Mong đợi:** giờ hẹn rơi trước giờ xuất bến → giữ chuyến (hoặc buộc văn phòng sửa giờ chuyến); tài xế nhận tin "giờ hẹn đổi" (ADR-0052 D6.2 dòng MQ-07 — đã duyệt).
- **Bằng chứng:** `kiem-vai/ht/s4.mjs`, `t4.mjs`; `src/shared/tin-chuyen.ts:7` (`HANH_DONG_TIN_CHUYEN` không có `order_leg_updated`); ảnh `tx-T1-sau-rut.png`, `qt-dieu-phoi-0410-b.png`.
- **TRÙNG một phần** (rà soát 1/10, mục 4 "báo tài xế…" — ADR-0052 D6) cho phần tin; **MỚI** cho phần "giờ hẹn trước giờ chuyến chỉ là cảnh báo, chuyến vẫn Đạt hết".
- **Đề xuất:** đưa `GIO_HEN_NGOAI_CHUYEN` (khi hẹn đón < giờ xuất bến) thành lý do giữ; làm nốt MQ-07.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (tin báo). Giữ mức TRUNG BÌNH, ở cận thấp. Đây là lỗ nghiệp vụ có thật: chuyến vẫn "Đạt hết" và tài xế không được báo, nên khách có thể bị đón trễ. Nhưng có đường vòng: văn phòng có cảnh báo và danh sách nhắc gọi khách, tài xế thấy giờ mới khi mở màn, và không liên quan tiền hay dữ liệu. Hai nửa của phát hiện là hoãn có ruling hoặc thiết kế "cảnh báo" đã duyệt, nên không phải lỗi mã.
>   - *Chính xác hoá:* 1) Câu đề xuất "đưa GIO_HEN_NGOAI_CHUYEN thành lý do giữ" lẫn hai nghĩa của cùng một mã. `GIO_HEN_NGOAI_CHUYEN` ĐÃ là một lý do giữ, nhưng nghĩa là "ngày đón dời ra ngoài ngày chạy" (src/shared/ly-do-giu.ts:37; src/modules/van-chuyen/dieu-phoi-doc.ts:102-106; src/shared/dieu-phoi-kiem.ts:367-368). Còn cảnh báo cùng tên là nghĩa "giờ trong ngày ngoài khung" (dieu-phoi-lich-chung.ts:121). Muốn giữ chuyến theo giờ hẹn sớm hơn giờ xuất bến thì phải thêm mã giữ mới, hoặc đổi nghĩa mã cũ; cả hai đều chạm bộ lý do giữ (ADR-0049 D2, Hiến chương 5.7) và ADR-0051:170, nên cần ADR do chủ duyệt, không phải sửa nhỏ. 2) Cảnh báo bắn ở CẢ HAI phía (`gio < batDauMs || gio > ketThucMs`, dieu-phoi-lich-chung.ts:121), không riêng "hẹn đón < giờ xuất bến". 3) Chữ "MỚI cho phần chỉ là cảnh báo" nên ghi thêm là đúng thiết kế MQ-04 (loại "cảnh báo"), không phải sót. 4) Chữ "TRÙNG một phần" nên ghi rõ MQ-07 đã bị tách có chủ ý theo ruling điều phối 2/10 (nhật ký Đợt 2 dòng 9), không phải quên. 5) Cảnh báo `GIO_HEN_NGOAI_CHUYEN` có trong DTO chi tiết chuyến (src/modules/van-chuyen/dieu-phoi-route.ts:151, :171). Nhưng màn Chi tiết chuyến KHÔNG vẽ nó: web/chuyen.ts:111-118 chỉ vẽ GIO_LAI_VUOT, CHUYEN_DAI_CAN_NGHI, NOI_HEN_KHAC_DIEM. Cảnh báo chỉ hiện ở cột "Cần xử lý" của /dieu-phoi. Chi tiết này làm nặng hơn câu "chuyến vẫn Đạt hết": người mở màn chi tiết chuyến không thấy dấu hiệu nào. 6) Bằng chứng `s4.mjs`, `t4.mjs` và ảnh tôi KHÔNG đọc; các số dòng khác trong báo cáo gốc (tin-chuyen.ts:7) đúng.
>   - *Hướng sửa gợi ý:* Trình chủ hai việc riêng, theo P8 vì chạm logic điều phối. (1) Chủ quyết có muốn giữ chuyến khi giờ hẹn đón sớm hơn giờ xuất bến hay chỉ cảnh báo. Nếu giữ thì cần mã giữ mới qua ADR, không đổi nghĩa mã cũ. (2) Làm lát MQ-07 đã hoãn: cho nhật ký sửa chặng có khoá chặng để đẩy tin "giờ hẹn đổi" tới tài xế đang chở chặng. Việc nhẹ làm ngay (bề mặt, hai chiều): vẽ cảnh báo `GIO_HEN_NGOAI_CHUYEN` ở màn Chi tiết chuyến, vì DTO đã có sẵn.
>   - *Bằng chứng (tệp:dòng):* Hành vi mô tả ĐÚNG với mã. Đường đi từ điểm vào tới kết quả: 1. Điểm vào: `PUT /api/orders/:id/legs/:legId` (src/modules/orders/index.ts:852-868). Chỉ kiểm ô `order.trip.edit` rồi `lenhSuaChang`/`planEditLeg` (src/modules/orders/service.ts:172-205, `kiemChang` kiểm ngày đón không đã qua). `orders` không import `van-chuyen` nên không có bước nào xét chuyến đang chở chặng. Route ghi nhật ký `order_leg_updated` (src/modules/orders/repository.ts:1354) và gọi `baoThayDoi({ orderId, thayDoi: "chuyen" })` (index.ts:866), chỉ là tin của ĐƠN. 2. Chuyến không bị giữ: `dungLichChung` gọi `kiemXuatBen` (src/shared/dieu-phoi-lich-chung.ts:158-176). `kiemXuatBen` (src/shared/dieu-phoi-kiem.ts:324-427) KHÔNG có luật nào so giờ hẹn của chặng với giờ chuyến. Chỉ có `CHUA_CO_GIO` khi giờ NULL (:376) và `NOI_HEN_DOI` khi khoá nơi lệch (:379-388). Vì vậy `lyDoGiu: []`, xuất bến vẫn được. 3. Chỉ có cảnh báo: dieu-phoi-lich-chung.ts:114-123 phát `GIO_HEN_NGOAI_CHUYEN` khi `gio < t.batDauMs || gio > t.ketThucMs` với chuyến `PLANNED`. Nhãn ở :62 là "Giờ hẹn nằm ngoài khung giờ chuyến", đúng chuỗi báo cáo trích. 4. Tôi tự chạy phép thử luật thuần (tệp tạm ngoài repo ở thư mục scratchpad, `node --test`): chuyến 07:00–09:30, chặng 2 khách đã xếp. Với giờ đón 07:30 thì `lyDoGiu=[]`, `canhBao=[]`. Với giờ đón 06:30 thì `lyDoGiu=[]`, `canhBao=[{"loai":"GIO_HEN_NGOAI_CHUYEN"…}]`. Kết quả 1/1 ok, trùng mô tả HT-06. Chỉ chạy luật thuần, không chạy HTTP. 5. Tài xế không có tin: `HANH_DONG_TIN_CHUYEN` chỉ gồm trip_created/edited/cancelled/ended_interrupted/passenger_no_show (src/shared/tin-chuyen.ts:7). View nguồn tin lọc `target_type='trip' AND action LIKE 'trip\_%'` (migrations/0070_tin_chuyen.sql:4-6). `order_leg_updated` thuộc đơn nên không bao giờ vào đường tin chuyến. Kiểm bằng grep: không có chỗ nào khác sinh tin chuyến từ sửa chặng. 6. Màn tài xế "chuyến 07:00 nhưng điểm 1 HẸN 06:30": giờ hẹn điểm đón đọc trực tiếp từ giờ hiện hành của chặng (src/modules/van-chuyen/dieu-phoi-dto.ts:111-126, chọn giờ sớm nhất). Màn dựng nhãn "ĐÓN · HẸN …" ở src/shared/tien-do-man.ts:127-131. Khớp mô tả.
>   - *Rào chắn đã thấy:* Không có rào chắn nào chặn được kết quả. Nhưng có nhiều dấu hiệu đây là chủ ý hoặc đã biết: (a) Phần "chỉ cảnh báo, không giữ" khớp thiết kế. MQ-04 xếp "giờ hẹn đổi sau khi xếp" vào loại "cảnh báo" (docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:395, :545). Nhật ký thi công ADR-0049 ghi GA-11: lượt 1 nhận ra giờ hẹn đổi bằng "giờ hẹn nằm ngoài khung giờ chuyến" (docs/superpowers/plans/2026-09-29-adr-0049-thi-cong-nhat-ky.md:148). Danh sách lý do giữ đã duyệt chỉ gồm "giờ hẹn nằm ngoài chuyến (ngày đón bị dời xa)" (docs/superpowers/specs/2026-09-29-bang-dieu-phoi-luot-1-man-hinh-can-ve.md:154), tức chỉ lệch NGÀY. (b) Phần "tài xế không nhận tin" là hoãn có ruling. MQ-07 nằm trong ADR-0052 D6.2 (docs/adr/ADR-0052-…:163), nhưng điều phối đã chốt "MQ-07 tách sang lát sau", vì nhật ký sửa chặng không có khoá chặng và không được đọc `detail`. Phần "sai thì tốn" ghi đúng kịch bản này: "giờ hẹn chặng đổi chưa có tin (văn phòng vẫn có danh sách Nhắc gọi báo khách)" (docs/superpowers/plans/2026-10-02-van-chuyen-dot-2-nhat-ky.md:9; kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-02-tin-bao-chuyen.md:44, :1259). Lộ trình cũng ghi tách MQ-07 sau Đợt 5 (…-00-lo-trinh.md:175). (c) ADR-0051 nói rõ tài xế "không thấy mục [Giờ hẹn đổi] nhưng vẫn thấy giờ hẹn mới trên màn của mình" (docs/adr/ADR-0051-…:62), và "Phần thông báo của MQ-07 vẫn thuộc lượt 2 D6" (:97). (d) Lưới an toàn hiện có cho văn phòng: người phụ trách đơn thấy mục "Giờ hẹn đổi — gọi báo khách" (src/shared/goi-bao.ts:12, dieu-phoi-man.ts:382). Người xếp xe thấy cảnh báo `GIO_HEN_NGOAI_CHUYEN` ở cột "Cần xử lý" của /dieu-phoi, vì không nằm trong `BO_QUA_CANH_BAO` (src/shared/dieu-phoi-man.ts:143, :183-192). (e) ADR-0051:170 ghi "Không mở rộng GIO_HEN_NGOAI_CHUYEN: khác nghĩa, khác người xử lý". Các điểm (a)–(e) giải thích vì sao đây là hành vi hiện hành, nhưng không phải rào chắn kỹ thuật.

<a id="HT-10"></a>
### 17. HT-10 · Tài xế bấm "Khách đã huỷ" tại điểm đón: không ai được báo, đơn giữ nguyên số khách và tiền

- **Vai:** Tài xế → Bán hàng / Kế toán
- **Loại:** sai nghiệp vụ
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Khoảng trống thiết kế (danh sách tin chuyến ADR-0052 D6.1)
- **Hướng xử lý:** Cần ADR (danh sách tin chuyến)
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế → Bán hàng / Kế toán. **Mức:** TRUNG BÌNH. **Loại:** sai nghiệp vụ.
- **Tái hiện:** CX-0210-03, đơn TD-…0005 (3 khách, 450.000₫). Tài xế: Đã tới → khách 1 "Đã đón", khách 2 **"Khách đã huỷ"**, khách 3 "Đã đón" (đều 200). Hộp thông báo Bán hàng A (người lập): không có tin (so với "Khách vắng" thì có tin "Có khách vắng ở chuyến…"). Đơn vẫn `confirmed`, 3 người lớn, tổng 450.000₫.
- **Mong đợi:** tin cho người lập/phụ trách như "khách vắng" (để xử lý huỷ / hoàn / điều chỉnh).
- **Bằng chứng:** `kiem-vai/ht/s29.mjs`; `src/shared/tin-chuyen.ts:7,40` (chỉ `trip_passenger_no_show`).
- **MỚI.** **Đề xuất:** thêm hành động "khách huỷ tại điểm" vào tin chuyến (cùng người nhận với "khách vắng").

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (tin báo). Sai nghiệp vụ có hậu quả tiền (đơn vẫn tính đủ khách, người lập không biết để xử lý huỷ/hoàn/điều chỉnh) và không nhất quán với "khách vắng" cùng loại; nhưng không mất/lộ dữ liệu, kết quả vẫn ghi nhật ký và hiện trên màn Điều phối nên có đường vòng thủ công (xem bảng điều phối, gọi tài xế). Giữ TRUNG BÌNH.
>   - *Chính xác hoá:* Đúng một phần: (1) Phần "không ai được báo" ĐÚNG. (2) Phần "đơn giữ nguyên số khách và tiền" là hành vi theo thiết kế, không phải lỗi mã: vận chuyển không được sửa đơn và đặc tả (bang-dieu-phoi-chung-design.md:810) giao việc tiền cho người phụ trách đơn ở màn đơn; phần này nên bỏ khỏi mô tả lỗi hoặc gộp vào "không có tin nên người phụ trách không biết để xử lý". (3) Dẫn chứng `src/shared/tin-chuyen.ts:7,40` lệch: dòng quyết định "khách vắng" là dòng 39 (dòng 40 chỉ là `return null;`); dòng 7 đúng. (4) Chữ "Mã kho: bản 1.77" khớp src/shared/changelog.ts:16; đề bài nhắc 1.76 chỉ là lệch số phiên bản, không ảnh hưởng kết luận (tin-chuyen.ts không đổi giữa hai bản trong lịch sử git đã xem). (5) Cần nói rõ đây là KHOẢNG TRỐNG thiết kế (danh sách tin chốt ở ADR-0052 D6.1 thiếu hành động này), không phải mã lệch khỏi ADR — nên khắc phục phải qua ADR/đặc tả chủ duyệt (danh sách D6.1 là "một chiều"), không tự sửa mã.
>   - *Hướng sửa gợi ý:* Qua ADR bổ sung được chủ duyệt (vì chạm danh sách tin chốt và bản đồ người nhận): thêm `trip_passenger_cancelled_at_stop` vào danh sách hành động sinh tin, một loại tin "khách huỷ tại điểm" cùng người nhận và cùng khuôn không tên/không SĐT như "khách vắng", kèm dữ kiện đơn của suất đó; việc điều chỉnh/hoàn tiền vẫn do người phụ trách đơn xử lý ở màn đơn, không để vận chuyển tự sửa đơn.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả, đã đọc mã thật: (1) Điểm vào: `POST /api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/khach-huy`, access "staff", khai ở src/modules/van-chuyen/index.ts:1305; bản văn phòng bấm thay ở index.ts:1492. (2) Route gọi `lenhKhachHuy` (index.ts:1314; định nghĩa src/modules/van-chuyen/dieu-phoi-tien-do.ts:165) → `loSuat` với `LENH_SUAT.KHACH_HUY = { moi: "CANCELLED_AT_STOP", tu: ["WAITING"], suKien: "PASSENGER_CANCELLED_AT_STOP", action: "trip_passenger_cancelled_at_stop" }` (src/modules/van-chuyen/dieu-phoi.ts:386, 402-410). Lô chỉ có 4 loại ghi: chuyển trạng thái suất, cổng tiến độ, nhật ký chuyến (`order_id` NULL), sự kiện `vc_trip_event`. Không có câu lệnh nào chạm bảng `ord_*`, và `orders` không import `van-chuyen`; grep `v_vc_|NO_SHOW|CANCELLED_AT_STOP` trong src/modules/orders (trừ test) trả 0 kết quả. (3) Sau lô thành công, route gọi `baoThayDoiChuyen` (index.ts:1316) → src/index.ts:104-119: nhánh "trạm" chỉ làm mới màn đang mở (Bảng tin, `thayDoi` = "tien_do" theo src/shared/tin-chuyen.ts:88); nhánh "đẩy" chỉ chạy khi `laHanhDongTinChuyen(dong.action)` (src/index.ts:118). (4) `HANH_DONG_TIN_CHUYEN = ["trip_created","trip_edited","trip_cancelled","trip_ended_interrupted","trip_passenger_no_show"]` (src/shared/tin-chuyen.ts:7) — KHÔNG có `trip_passenger_cancelled_at_stop`. (5) Hộp thông báo: câu SQL `LIST_TIN_CHUYEN` lọc `e.action IN (json_each(?2))` với đúng danh sách trên (src/modules/thongbao/repository.ts:192-195, 206) nên dòng nhật ký "khách đã huỷ" không được đọc ra. (6) Chỗ ra tin "khách vắng" duy nhất: `if (d.action === "trip_passenger_no_show" && d.don.some(x => x.ownerId === n.id || x.handlerStaffId === n.id)) return "khach_vang"` (tin-chuyen.ts:39); dữ kiện đơn của suất chỉ lấy cho `kind = 'PASSENGER_NO_SHOW'` (src/modules/van-chuyen/chuyen-repo.ts:685-688; thongbao/index.ts:47, 61). Vậy mô tả "không ai được báo" ĐÚNG ở mức hộp thông báo/đẩy điện thoại; cả chuỗi so sánh với "Khách vắng" (có tin, không có tin) khớp mã. Đã chạy `node --test src/shared/tin-chuyen.test.ts`: 14/14 xanh. Lưu ý bài tin-chuyen.test.ts:127-136 chỉ suy `coTin` từ chính `HANH_DONG_TIN_CHUYEN` nên không khoá cứng việc loại "khách huỷ" — không phải bằng chứng thiết kế cố ý.
>   - *Rào chắn đã thấy:* Không có rào chắn nào ngăn lỗ hổng tin báo; chỉ có các điểm sau (không đủ chặn): (a) Bảng tin làm mới màn Điều phối/Chi tiết chuyến đang mở của văn phòng (src/index.ts:117) — chỉ ai đang mở màn mới thấy, không phải thông báo; (b) văn phòng có quyền xem trip.view nên tự mở Điều phối xe thì thấy "Khách đã huỷ" (src/shared/tien-do-man.ts:105) — đường vòng thủ công; (c) thiết kế ghi rõ vận chuyển KHÔNG đổi đơn: docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:810 ("Việc tiền của đơn — không ở Vận chuyển; người phụ trách đơn xử lý ở màn đơn") và :803 — nên việc "đơn giữ nguyên 3 khách, 450.000₫" là THIẾT KẾ CỐ Ý, không phải lỗi; (d) ADR-0052 D6.1 (docs/adr/ADR-0052-…md:148) chốt danh sách hành động sinh tin "một chiều", có "khách vắng" mà không có "khách đã huỷ"; bảng D6.2 (dòng 154-163) cũng chỉ có hàng "khách vắng" cho người lập/phụ trách. Không thấy chỗ nào ADR/đặc tả ghi lý do LOẠI "khách đã huỷ" khỏi danh sách tin (grep toàn docs không có câu như vậy); đặc tả 5.7 (design:801-810) chỉ mô tả luồng văn phòng báo huỷ trước rồi tài xế ghi sau, tức mặc định văn phòng đã biết, chưa tính ca khách tự huỷ ngay tại điểm đón với tài xế. Còn một rào mềm: người dùng có thể gọi điện cho tài xế/khách ngoài hệ thống (không kiểm được bằng mã).

<a id="HT-13"></a>
### 18. HT-13 · HDV phụ trách được tăng số khách tại hiện trường nhưng không nhập được tên → chuyến bị giữ "thiếu tên"; câu 403 nói…

- **Vai:** Hướng dẫn viên
- **Loại:** bất hợp lý theo thiết kế / câu báo sai
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Hướng dẫn viên. **Mức:** TRUNG BÌNH. **Loại:** bất hợp lý theo thiết kế / câu báo sai.
- **Tái hiện:** HDV A (phụ trách TD-…0001, đã xếp xe) `POST /orders/:id/handler-money-edit` tăng 3 → 5 người lớn ("Khách báo thêm 2 người") → 200, tổng 1.650.000 → 2.550.000. Chuyến CX-0410-01 bị giữ `THIEU_SUAT` + `THIEU_TEN` "Ai xử lý: Văn phòng". HDV A thêm tên: `POST /orders/:id/passengers` → 403; sửa chặng: `PUT /orders/:id/legs/:legId` → 403 **"Chỉ người lập đơn, người phụ trách đơn hoặc quản trị viên mới được thay đổi đơn này."** (HDV A chính là người phụ trách). Không ai được báo đơn đổi số khách (tài xế, điều phối).
- **Mong đợi:** HDV phụ trách nhập được tên khách thêm tại chỗ (hoặc câu 403 nói đúng "Hướng dẫn viên không sửa…, nhờ văn phòng") và văn phòng nhận tin.
- **Bằng chứng:** `kiem-vai/ht/h1.mjs`, `h2.mjs`; `permissions.ts` `order.passenger.write` / `order.trip.edit` cột FIELD = none, `order.money.edit` FIELD = assigned.
- **MỚI** (phần "không ai được báo" TRÙNG G8 / KD08…; phần câu sai và lệch quyền MỚI). **Đề xuất:** sửa câu 403 theo vai; trình chủ mở `order.passenger.write` cho HDV phụ trách.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (chặn việc). Sai nghiệp vụ rõ rệt: người duy nhất biết "khách thêm 2 người" tại hiện trường lại không nhập được tên, và không ai được báo, nên chuyến bị giữ lặng lẽ; nhưng văn phòng (người lập đơn, Quản trị, Bán hàng phụ trách) vẫn nhập tên và bấm "Cập nhật khách theo đơn" để gỡ giữ được, không mất tiền hay dữ liệu, không vượt quyền.
>   - *Chính xác hoá:* Phần cốt lõi (HDV tăng số khách được, không nhập được tên, chuyến bị giữ THIEU_SUAT + THIEU_TEN "Văn phòng", không ai được báo) ĐÚNG theo mã. Cần chỉnh ba điểm: (1) Câu "người phụ trách đơn" là hằng FORBIDDEN dùng chung của nhóm route order.trip.edit (src/modules/orders/index.ts:44; dùng ở :789, :832, :858, :876, :960). Nó chỉ hiện khi gọi API trực tiếp; trên giao diện, HDV được hiện câu riêng ở src/shared/order-view.ts:96-103 và nút bị ẩn. Cũng đã có ghi nhận trước ở docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/ban-hang.md:30 (cùng câu trả về cho Thực tập, Đối tác). (2) PUT /orders/:id/legs/:legId KHÔNG phải đường để thêm tên khách (nó sửa trường chặng); đường nhập tên duy nhất là POST /passengers, và câu 403 của nó đã đúng ("Tài khoản này không được nhập danh sách hành khách của đơn này."). Nên mô tả "câu 403 sai" chỉ đúng với route sửa chặng, không đúng với đường nhập tên. (3) Mục "Bằng chứng" nên chỉ tệp:dòng thay vì chỉ tên ô: permissions.ts:80 (order.trip.edit), :88 (order.passenger.write), :95 (order.money.edit); luật ghép ở dispatch/index.ts:254 và dieu-phoi-kiem.ts:389-400. Phần "lệch quyền" là khoảng trống giữa hai ADR đã duyệt (ADR-0014 điều 6 và ADR-0047 A2), không phải mã lệch khỏi tài liệu chuẩn tắc; ADR-0062 (accepted) đã hứa tin cho HDV và người lập nhưng chưa thi công. Dù người lập đơn có nhận tin theo ADR-0062 hay không, HDV vẫn là người tự đổi nên sẽ không tự nhận tin của chính mình (src/shared/thong-bao.ts:89, "d.actorId === staff.id"), tức là tin chỉ tới người lập và văn phòng.
>   - *Hướng sửa gợi ý:* Trình chủ chọn một: (A) mở ô order.passenger.write cho HDV đang phụ trách (cần ADR mới, vì chạm quyền và dữ liệu cá nhân) hoặc chỉ cho phép HDV thêm tên cho phần số khách vừa tự tăng; hoặc (B) giữ nguyên quyền nhưng thi công ADR-0062 để báo văn phòng và người lập đơn ngay khi HDV đổi số khách, kèm câu ở phần sửa số khách của HDV nhắc "văn phòng sẽ bổ sung tên". Song song, đổi câu FORBIDDEN dùng chung theo vai (HDV: "Hướng dẫn viên không sửa phần này, nhờ văn phòng").
>   - *Bằng chứng (tệp:dòng):* Đường đi dựng lại từ mã (nhánh hiện tại, chỉ đọc). (1) Điểm vào: POST /api/orders/:id/handler-money-edit, cổng "staff" (src/modules/dispatch/index.ts:245). narrowEligible = đang phụ trách và ô MATRIX["order.money.edit"] = "assigned" (index.ts:254; ô FIELD = assigned ở src/shared/permissions.ts:95) → qua. Luật planMoneyEdit (src/modules/orders/money-adjustment.ts:271-298) chỉ cần lý do và đủ danh sách dịch vụ, KHÔNG có trần tăng/giảm → ghi dòng điều chỉnh, trả { ok: true }; 3 → 5 người lớn là hợp lệ. (2) Số khách hiệu lực đi tiếp sang điều phối: lichChungChang (src/modules/orders/index.ts:339-371) tính soNguoi qua effectivePax (đã phủ dòng điều chỉnh), còn nguoiCuaDon là khoá của danh sách hành khách hiện hành (không đổi). (3) Cổng xuất bến kiemXuatBen (src/shared/dieu-phoi-kiem.ts:389-400): suất mở 3 < soNguoi 5 → THIEU_SUAT; soTenThieu = max(5 − số tên, …) > 0 và chính sách mặc định require_manifest = 1 (migrations/0041_chinh_sach_dieu_phoi.sql:30-32) → THIEU_TEN. Cả hai mã có aiXuLy "VAN_PHONG" (src/shared/ly-do-giu.ts:20-21), nhãn "Văn phòng" (ly-do-giu.ts:11). Có lý do giữ thì kết quả "dat: ds.length === 0" là sai → chuyến không xuất bến được. (4) Không nhập được tên: ô order.passenger.write có FIELD = "none" (permissions.ts:88; ghim ở src/shared/permissions.test.ts:31; ADR-0047 A2 bảng ô quyền ghi rõ FIELD none). Route POST /api/orders/:id/passengers hỏi ô này trước khi đọc thân (orders/index.ts:939) → CANNOT_WRITE_PASSENGERS 403 "Tài khoản này không được nhập danh sách hành khách của đơn này." (index.ts:63). Tôi chạy can() thật cho tài khoản FIELD, assigned = true: order.passenger.write = false, order.trip.edit = false, order.modify = false, order.money.edit = true. node --test src/shared/permissions.test.ts: 28/28 xanh. (5) PUT /api/orders/:id/legs/:legId hỏi order.trip.edit (FIELD none) → FORBIDDEN (index.ts:858) với đúng câu trích trong báo cáo (hằng ở index.ts:44: "Chỉ người lập đơn, người phụ trách đơn hoặc quản trị viên mới được thay đổi đơn này."). (6) Không có tin: baoThayDoi({ thayDoi: "tien" }) (dispatch/index.ts:265) chỉ làm Bảng tin tải lại; hanhDongCuaThayDoi("tien") = null (src/shared/web-push.ts:62) nên không gõ cửa; loaiTinDon (src/shared/thong-bao.ts:31-41) và HANH_DONG_TIN_DON (thong-bao.ts:8) không có order_money_adjusted_by_field nên không thành tin trong hộp thông báo. ADR-0062 (accepted 30/9) đòi báo HDV và người lập khi đổi số khách nhưng chưa được thi công trong mã này.
>   - *Rào chắn đã thấy:* (a) Quyền FIELD = none ở order.passenger.write là thiết kế có chủ ý và được ghim bằng bài kiểm: ADR-0047 A2 (FIELD none, "mang giá trị bằng order.modify"), src/shared/permissions.ts:88, src/shared/permissions.test.ts:31. Vì vậy phần "lệch quyền" không phải lỗi mã, mà là khoảng trống thiết kế do hai quyết định đúng riêng lẻ (ADR-0014 điều 6 cho HDV tăng số khách; ADR-0047 không cho HDV nhập tên) ghép lại; chưa có ADR nào nói về tổ hợp này. (b) Điều 6 ADR-0047 chặn bằng cổng xuất bến chứ không chặn lúc lưu: "đơn ... lưu được khi danh sách còn thiếu", việc chặn thuộc cổng xuất bến — nên chuyến bị giữ là hành vi đúng thiết kế. (c) Giao diện HDV đã có câu riêng cho HDV, không dùng câu chung: src/shared/order-view.ts:96-103 (khongQuyenSuaText: "Hướng dẫn viên không sửa ... nhờ <người lập> hoặc văn phòng"); nút sửa chặng và sửa khách bị ẩn bằng suaChuyenDuoc / suaKhachDuoc (order-view.ts:126-137), nên trên giao diện thường HDV không chạm được các route đó. (d) Route nhập tên (POST /passengers) trả câu 403 đúng nghĩa (index.ts:63), không nhắc "người phụ trách đơn". (e) Phần "không ai được báo" đã có mục theo dõi: G8 (KD08, HD01) trong, và ADR-0062 / ADR-0065 đề xuất đã soạn sẵn cách báo. (f) Văn phòng vẫn thấy chuyến bị giữ trên bảng điều phối (mã THIEU_SUAT, THIEU_TEN nằm ở src/shared/dieu-phoi-man.ts:292-294) khi mở màn, nên có đường vòng thủ công. Không có rào nào chặn hay ngăn được chuỗi sự việc chính.

<a id="HT-09"></a>
### 19. HT-09 · Tách đoàn: máy tự chọn người ngẫu nhiên lên xe, không màn nào chọn được người

- **Vai:** Điều phối
- **Loại:** bất hợp lý theo thiết kế
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Điều phối. **Mức:** TRUNG BÌNH. **Loại:** bất hợp lý theo thiết kế.
- **Tái hiện:** đơn 20 khách ("Nhân Viên ABC 1…20"), xếp 16 vào xe 16 chỗ (`soSuat: 16`, không `personKeys`). Trên xe: khách số 3, 11, 18, 1, 8, 5, 6, 15, 4, 7, 12, 14, 10, 17, 13, 9 — thiếu 2, 16, 19, 20 (không theo thứ tự nhập).
- **Cùng gốc, chiều về ít người hơn:** Bán hàng đặt "số người chiều về" = 2 cho TD-…0001 (6 khách) → xếp chiều về 2 suất → máy tự gán tên "Trần Thị Lan", "Lê Văn Tuấn" (không ai chọn), chuyến "Đạt hết"; tài xế trong ngày chạy sẽ thấy hai tên này dù người về thật có thể khác (`kiem-vai/ht/s33.mjs`).
- **Mong đợi:** mặc định theo thứ tự danh sách (giữ gia đình / nhóm liền nhau) và có ô chọn người khi tách.
- **Bằng chứng:** `kiem-vai/ht/s19.mjs`; `src/shared/dieu-phoi-kiem.ts:190-198` ("không chọn thì máy chọn theo thứ tự personKey" — personKey là UUID); grep `personKeys` trong `web/` = rỗng.
- **MỚI.** **Đề xuất:** lấp theo thứ tự dòng hành khách (cột vị trí đã có từ 1.63) và thêm chọn người ở hộp "Xếp vào chuyến…".

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (dữ liệu). Sai nghiệp vụ rõ rệt: khi tách đoàn, danh sách người trên mỗi xe (và bản chốt danh sách khách lúc xuất bến, chỉ-thêm) là người do máy chọn theo UUID, tài xế điểm danh theo tên không khớp thực tế; không sai tiền, không lộ dữ liệu ngoài đơn, không vượt quyền. Đường vòng có nhưng nặng (không tách đoàn, hoặc tách thành hai đơn, hoặc gọi API gửi personKeys), nên giữ TRUNG BÌNH.
>   - *Chính xác hoá:* Đúng phần lõi; sai/lệch ở hai chi tiết. (1) "cột vị trí đã có từ 1.63" không đúng: không có cột vị trí nào (changelog 1.63 ghi "Không migration", src/shared/changelog.ts:152; migrations/0035 không có cột vị trí). Thứ tự nhập suy ra từ `ORDER BY created_at, rowid` ở src/modules/orders/chang-hanh-khach-repo.ts:410 và dongHienHanh; danh sách `nguoiCuaDon` đưa sang Vận chuyển ĐÃ theo thứ tự nhập (orders/index.ts:349,367). (2) Chỉ dòng gây lỗi là src/shared/dieu-phoi-kiem.ts:179 (`.sort()` trong `khoaNguoiRanh`), không phải dòng 190-198 (chú thích + `tenLucXep`, chỉ là nơi lấy `lap[i]`); nên ghi thêm bài khoá hành vi ở dieu-phoi-kiem.test.ts:403. Ghi chú thêm: lỗi còn ở cổng xuất bến (dieu-phoi-kiem.ts:393) và "Cập nhật khách theo đơn" (dieu-phoi-lenh.ts:359) vì dùng chung `khoaNguoiRanh`; "mong đợi: giữ gia đình/nhóm liền nhau" chỉ đạt khi đơn nhập tên theo thứ tự đó. Các câu "không màn nào chọn được người" và "chiều về: máy tự gán tên" đúng như mô tả; phần `s33.mjs` (ảnh chụp, Trần Thị Lan/Lê Văn Tuấn) tôi không chạy lại được (cần chạy máy chủ), nhưng cơ chế trong mã khớp.
>   - *Hướng sửa gợi ý:* Bỏ việc sắp theo khoá UUID để khoá rảnh giữ đúng thứ tự nhập (đã có sẵn ở `nguoiCuaDon`), rồi đổi bài khoá ở dieu-phoi-kiem.test.ts:403; sau đó thêm ô chọn người ở hộp "Xếp vào chuyến" (gửi `personKeys` mà máy chủ đã nhận). Vì chạm luật xếp/bản chốt khách của Vận chuyển nên theo CLAUDE.md §3 phải dừng hỏi chủ trước (chưa tự làm).
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả (đã dựng lại bằng mã thật): 1) Giao diện: web/dieu-phoi.ts:444-466 — hộp "Xếp vào chuyến" chỉ có ô số `dp-xep-so`; thân gửi `POST /api/van-chuyen/chuyen/:id/phan-bo` với `chang: [{ legId, soSuat: so }]`, KHÔNG có `personKeys`. Grep `personKeys|khoaNguoi|tenLucXep` trong web/ = rỗng. 2) Máy chủ nhận thân: src/modules/van-chuyen/dieu-phoi-than.ts:95,110-112 — API CÓ hỗ trợ `personKeys` (mặc định `[]`) nhưng chỉ khách API gọi tay mới gửi được. 3) src/modules/van-chuyen/dieu-phoi-lenh.ts:146-147 — `khoaNguoiRanh(...)` rồi `tenLucXep({ soSuat, personKeys, ranh })`; mỗi khoá thành một suất khách (dòng 148). 4) Đầu vào `nguoiCuaDon` ĐÃ đúng thứ tự nhập: src/modules/orders/chang-hanh-khach-repo.ts:410 `ORDER BY order_id, created_at, rowid` → src/shared/hanh-khach.ts:87-97 `dongHienHanh` giữ thứ tự xuất hiện → src/modules/orders/index.ts:349,367 `nguoiCuaDon`. 5) NHƯNG src/shared/dieu-phoi-kiem.ts:179 `return [...new Set(v.nguoiCuaDon)].filter((p) => !daDung.has(p)).sort();` — `.sort()` mặc định sắp theo chuỗi khoá người, làm mất thứ tự nhập. Khoá người = UUID ngẫu nhiên: src/modules/orders/repository.ts:866-867 (`id = p.id ?? crypto.randomUUID()`, `personKey: id`) và migrations/0035_hanh_khach.sql:5-6,16 (`person_key` = id dòng đầu chuỗi). 6) src/shared/dieu-phoi-kiem.ts:195-198 `tenLucXep` lấy `lap[i]` từ danh sách đã sắp theo UUID ⇒ khách lên xe là N khoá UUID nhỏ nhất, không liên quan thứ tự nhập. Chạy lại (hàm thuần, 20 UUID theo thứ tự nhập 1..20, soSuat 16, personKeys rỗng; đã xoá tệp thử): lần 1 lên xe 12,20,16,15,8,1,3,14,9,11,17,5,13,2,19,7, không lên 4,6,10,18; lần 2 lên 9,20,3,12,14,13,16,11,5,7,18,6,19,15,8,10, không lên 1,2,4,17. Mỗi lần một kết quả khác, không trùng 1..16 — khớp tái hiện của báo cáo gốc. `node --test --test-name-pattern=I19 src/shared/dieu-phoi-kiem.test.ts` = 4 pass (bài dieu-phoi-kiem.test.ts:401-403 khoá đúng hành vi sắp theo khoá: ["p3","p1","p2","p4"] → ["p1","p2","p3","p4"]). 7) Không có màn nào chọn người sau khi xếp: src/shared/dieu-phoi-man.ts:434-456 `nhomKhach` gom MỘT nhóm cho mỗi đơn-chặng (`khoa = legId`), `suatIds` là cả nhóm; web/chuyen.ts:489-490,609-614,641-647 "Rút khỏi xe" / "Chuyển sang xe khác" gửi nguyên `g.suatIds`. Rút rồi xếp lại không đổi được người vì khoá rảnh lại được lấy theo UUID nhỏ nhất. 8) Cùng gốc ở chiều về ít người: src/shared/so-nguoi-chang.ts:17 (`paxOverride` chỉ là SỐ, không có danh sách người về) + cùng đường xếp ở mục 3; ngoài ra cùng `khoaNguoiRanh` còn dùng ở cổng xuất bến (dieu-phoi-kiem.ts:393) và lệnh "Cập nhật khách theo đơn" (dieu-phoi-lenh.ts:359). Kết quả: danh sách tên trên xe (màn văn phòng, màn tài xế trong ngày chạy, bản chốt lúc xuất bến) gồm người do máy chọn theo UUID, văn phòng không chọn, không đổi được bằng giao diện.
>   - *Rào chắn đã thấy:* Không có rào chắn chặn được lỗi. Có hai thứ gần giống rào chắn nhưng không đủ: (a) API `phan-bo` nhận `personKeys` (dieu-phoi-than.ts:110-112) nên về mặt máy chủ chọn người được, nhưng giao diện không gửi; (b) rút/chuyển khách ở Chi tiết chuyến (web/chuyen.ts:609-649) chỉ theo cả nhóm đơn-chặng, không theo từng người. Đây là thiết kế có chủ ý ở mức kế hoạch: docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md:155 (I19) và :1965 (T-1) ghi "không chọn thì máy chọn theo thứ tự `personKey`", điều phối xác nhận R-P3, "không cần câu ADR mới"; docs/SYSTEM-DESIGN.md:770 ghi lại; nhật ký 10.32 (adr-0049-thi-cong-nhat-ky.md:612-615) nói "theo thứ tự khoá người". Không có ADR do chủ duyệt nào quyết "thứ tự UUID", và ADR-0049 điều 4/dòng 162 gọi xếp là lệnh đổi "ai đi xe nào" (hàm ý chọn người). Mục BACKLOG đã gạch "thứ tự ngẫu nhiên" (docs/BACKLOG.md:69, bản 1.63) chỉ sửa THỨ TỰ HIỂN THỊ trong nhóm, không sửa cách chọn ai lên xe.

<a id="VP-02"></a>
### 20. VP-02 · Bấm đúp "Tạo tài khoản" làm mất PIN của tài khoản vừa tạo.

- **Vai:** Nhân sự
- **Loại:** khó dùng (mất PIN)
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Bấm đúp "Tạo tài khoản" làm mất PIN của tài khoản vừa tạo.** Lần bấm 1 tạo tài khoản (201, PIN hiện), lần bấm 2 nhận phản hồi "đã ghi trước đó" (200 `da_ghi_truoc_do`), trang báo "Lần bấm trước đã được ghi" rồi tự tải lại sau 1,2 giây → bảng PIN biến mất. Nhân sự không có quyền đặt lại PIN (403 "Chỉ quản trị viên…"), phải nhờ Quản trị.
- Tái hiện: `pw/hr-ui2.mjs dbl 0911000102 "Trương Văn Hai"` (điện thoại 390): điền tên, SĐT, tick "Nhân viên kinh doanh", bấm đúp "Tạo tài khoản".
- Thấy: `RESP 201 {...pin}` rồi `RESP 200 {"da_ghi_truoc_do":true,"ket_qua":"/staff"}`; sau 2 giây không còn chữ "PIN chỉ hiển thị một lần" (ảnh `ns-m-tao-dbl.png`). Bấm một lần (`one`) thì PIN hiện bình thường. Cùng hiện tượng ở API `reset-pin` gửi lại cùng vé: lần 2 trả `{"da_ghi_truoc_do":true,"ket_qua":null}`, PIN mới đã đổi nhưng không hiện.
- Mong đợi: nút khoá ngay từ cú bấm đầu; hoặc phản hồi "đã ghi" không xoá màn đang hiện PIN.
- Bất hợp lý theo thiết kế một phần: ADR-0094 dòng 122–124 đã chấp nhận "gửi lặp không hiện lại PIN". Điểm MỚI: chỉ cần bấm đúp (không cần mất sóng) và PIN của lần ĐÚNG cũng bị xoá.
- Đề xuất: khoá nút trong lúc gửi ở `web/staff.ts`; với route có PIN thì phản hồi phát lại không tải lại trang.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (chặn việc). Nhân sự làm xong việc chính (tạo tài khoản) nhưng mất PIN duy nhất, buộc phải nhờ Quản trị hoặc Toàn quyền đặt lại, nên khó rõ rệt nhưng có đường vòng; không mất tiền, không lộ dữ liệu, không tạo trùng tài khoản. Ở mức thấp của TRUNG BÌNH vì cần bấm đúp trong lúc chờ phản hồi, và ADR-0094 đã chấp nhận một phần hệ quả này.
>   - *Chính xác hoá:* Mô tả cơ bản đúng. Cần chỉnh bốn điểm. (1) Lần bấm 2 thường nhận 409 `dang_xu_ly` trước (web/api.ts:128-131, chờ 1500 ms), rồi mới 200 `da_ghi_truoc_do`; báo cáo chỉ ghi 201 rồi 200. (2) Bảng PIN hiện được khoảng 1,5 + 1,2 giây trước khi trang tải lại, khớp việc "sau 2 giây không còn". (3) Phần `reset-pin` chỉ xảy ra khi gọi API gửi lại cùng vé; ở giao diện nút có `confirm()` nên bấm đúp khó xảy ra. Hệ quả đó đã nằm trong ADR-0094 dòng 121-124 (báo cáo viết đúng "dòng 122–124"). (4) Câu "bất hợp lý theo thiết kế một phần" nên nói chính xác hơn: thiết kế (đặc tả dòng 188) CHỦ Ý không khoá nút mà dựa vào vé dùng chung; ADR chấp nhận "gửi lặp không hiện lại PIN" khi phản hồi lần đầu bị mất, nhưng không lường tới trường hợp lần đầu đã hiện PIN rồi bị lần phát lại xoá. Số dòng ADR trỏ `index.ts:426, 456` nay là `:430, :460`, không ảnh hưởng kết luận.
>   - *Hướng sửa gợi ý:* Khoá nút "Tạo tài khoản" ngay từ lần bấm đầu cho tới khi có phản hồi, theo khuôn cờ `dangGui` đã dùng ở nhiều màn khác. Đồng thời nên để bước phát lại ở `web/api.ts` không tải lại trang khi chính trang này đang hiện kết quả của vé đó (hoặc với route trả PIN thì chỉ báo, không tải lại), để PIN của lần đúng không bị xoá; ADR-0093 (PIN tạm) cũng sẽ giải quyết tận gốc khi được duyệt.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả, đọc từ mã thật: 1) Form tạo tài khoản không khoá nút khi đang gửi. public/staff.html:19 có `<button class="btn btn-primary" type="submit">Tạo tài khoản</button>`. web/staff.ts:362-397 (handler submit) không đặt `disabled`, không có cờ kiểu `dangGui`. Nút `nutTao` (web/staff.ts:287-288) chỉ bị khoá theo điều kiện hồ sơ trùng (`capNhatNutTao`). Nhiều màn khác trong repo có cờ `dangGui` hoặc `disabled = true` khi gửi (web/chuyen-sua.ts:239-258, web/catalog.ts:276), màn này thì không. 2) Hai lần bấm dùng chung một vé. web/api.ts:121 gọi `vongDoiVe.moVe("POST", "/api/staff", thân)`. src/shared/lan-gui-ve.ts:101-112: dấu là SHA-256 của "phương thức + đường dẫn + thân", và `boNho.get(khoa)` được đọc SAU `await bam(...)`, nên hai lần gọi đồng thời nhận cùng một chuỗi vé. Tôi chạy mô phỏng riêng bằng chính mô-đun này: `cùng vé khi bấm đúp: true`. Sau `ketThuc(201)` ở lần 1, đối tượng vé của lần 2 vẫn giữ chuỗi vé để gửi lại. 3) Lần 1 thành công. src/modules/accounts/index.ts:430 và :460 trả 201 kèm `pin` và `location: "/staff"`. web/staff.ts:387 gọi `showSecrets(...)` hiện bảng PIN. Router ghi kết quả: src/shared/router.ts:476 `capNhat(res.status, maLoi, ketQuaDeLuu(location))`, nên `ket_qua = "/staff"` (khớp KET_QUA_RE ở src/shared/lan-gui-luat.ts:56). 4) Lần 2 nhận "đã ghi". src/shared/router.ts:429-433 (`traLoiVeCo`): vé đã có dòng ⇒ `thanPhatLai` (src/shared/lan-gui-luat.ts:43) trả 200 `{da_ghi_truoc_do:true, ket_qua:"/staff"}` kèm header `Idempotent-Replayed: true`. Nếu lần 2 tới khi lần 1 chưa ghi xong kết quả thì nhận 409 `dang_xu_ly`, chờ 1500 ms (web/api.ts:100, 128-131) rồi gửi lại cùng vé, kết cục vẫn là phát lại. 5) Giao diện xoá bảng PIN. web/api.ts:173 bắt phản hồi phát lại và trả `baoDaGhi(data.ket_qua)`. web/api.ts:104-113 hiện "Lần bấm trước đã được ghi." rồi sau 1200 ms `location.replace("/staff")` (safeNext cho "/staff" đi qua). Tải lại trang làm `secretEl` mất, PIN không còn. Luồng lần 1 vẫn kịp hiện PIN, rồi bảng bị xoá khi trang tải lại. 6) Nhân sự không tự lấy lại PIN. src/modules/accounts/index.ts:659-662: route `reset-pin` đòi `account.access.manage`. src/shared/permissions.ts:129: cột HR (cuối) là "none", trong khi `account.create` (:134) có HR "any". Nên người tạo (Nhân sự) phải nhờ Quản trị hoặc Toàn quyền đặt lại PIN. ADR-0094 dòng 124 đã ghi sự thật này. Tôi không chạy được trình duyệt, nên cảnh "bấm đúp trên màn hình 390" và ảnh `ns-m-tao-dbl.png` chưa tự quan sát. Phần còn lại là chuỗi suy ra từ mã, mô phỏng vé và các test sẵn có (src/lan-gui-hanh-vi.test.ts (e) chỉ kiểm không lộ PIN trong thân phát lại và chỉ có một tài khoản, không kiểm giao diện).
>   - *Rào chắn đã thấy:* Không có rào nào chặn được lỗi. Các quy tắc liên quan đã tìm thấy: (a) Lớp vé (ADR-0094 đ5, `web/api.ts` + `src/shared/lan-gui-ve.ts`) chống GHI TRÙNG: bấm đúp vẫn chỉ ra đúng 1 tài khoản. Đặc tả src/superpowers/specs/2026-10-02-lop-chong-ghi-trung-chung-de-xuat.md:188 nói rõ "Bấm hai lần liên tiếp (vé đang mở) cũng dùng chung vé, nên chống được bấm đúp mà không cần khoá nút", và ADR-0094 dòng 299 lấy "Bấm đúp ⇒ một đơn" làm tiêu chí. Vậy việc không khoá nút là có chủ ý, nhưng hệ quả với route trả PIN chưa được tính. (b) ADR-0094 dòng 121-124 ("Hệ quả của R2 đã biết"): chấp nhận "Gửi lặp những lệnh này không hiện lại PIN"; cách xử lý là bấm "Đặt lại PIN" lần nữa, hoặc nhờ Quản trị/Toàn quyền khi người tạo là Nhân sự; ADR-0093 (PIN tạm, trạng thái proposed, chưa duyệt) sẽ đổi chỗ này. ADR chỉ nói tới trường hợp phản hồi lần đầu bị mất, chưa nói tới việc phản hồi phát lại xoá PIN lần ĐÚNG đang hiện trên cùng trang. (c) Mật khẩu chỉ lưu băm nên không ai khác thấy được PIN; không lộ dữ liệu. (d) Với nút "Đặt lại PIN" ở giao diện (web/staff.ts:95-97, :150-152) có `confirm()` chặn trước khi gọi API, nên khó có hai lời gọi đồng thời; phần "reset-pin gửi lại cùng vé" ở báo cáo gốc chỉ tái hiện được bằng gọi API, và đúng là điều ADR-0094 dòng 122 đã chấp nhận.

<a id="VP-04"></a>
### 21. VP-04 · Lịch sử đơn và Nhật ký không cho truy vết tiền.

- **Vai:** Kế toán / Toàn quyền
- **Loại:** khó dùng (truy vết tiền)
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Một phần là quy ước đã duyệt (ADR-0025); lệnh nộp không vào Lịch sử đơn là mới
- **Hướng xử lý:** Phần lệnh nộp: sửa mã. Ghi số tiền vào nhật ký: cần chủ
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Lịch sử đơn và Nhật ký không cho truy vết tiền.** (a) Lệnh "Đã nộp về công ty" bấm từ trang đơn không hiện trong "Lịch sử" của đơn (nhật ký `ledger_settlement` ghi `order_id = NULL`, chỉ "nộp về công ty · 1 đơn"). (b) Các dòng "Ghi lần thu", "Ghi hoàn khách", "Ghi nộp / trả tiền", "Xác nhận công ty đã nhận" không có số tiền, không mã đơn (dòng nộp).
- Tái hiện: `kt1.mjs` rồi `h.mjs` — lịch sử đơn TD-20261002-0002 chỉ có `created, payment_recorded, confirmed, ledger_company_received, payment_recorded`; thiếu lệnh nộp. Nhật ký điện thoại (ảnh `tq-m-audit-viewport.png`) dòng "Ghi nộp / trả tiền — Quản Trị · nộp về công ty · 1 đơn".
- Mong đợi: mỗi lệnh tiền có dòng trên lịch sử đơn liên quan, kèm số tiền.
- Bằng chứng: `src/modules/billing/service.ts:393`.
- Đề xuất: ghi thêm một dòng nhật ký theo từng đơn được phân bổ, kèm số tiền (số tiền không phải dữ liệu cá nhân).

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (dữ liệu). Không sai số tiền và không mất dữ liệu (sổ vẫn giữ đủ dòng theo đơn), nhưng Kế toán không có đường nào trên giao diện để truy "đơn này đã nộp bao nhiêu, ai nộp, lúc nào"; đường vòng duy nhất là Nhật ký (chỉ Toàn quyền, không có mã đơn, không có số tiền) hoặc đọc thẳng cơ sở dữ liệu. Phần "không có số tiền trong nhật ký" là quy ước thiết kế đã ghi, nên không tính là lỗi.
>   - *Chính xác hoá:* Đúng: dòng `ledger_settlement` thực sự có `order_id = NULL` (service.ts:393, cả khi chỉ nộp một đơn), dẫn tới Lịch sử đơn thiếu lệnh nộp; dòng nộp trên Nhật ký không có mã đơn. Cần sửa/nuance trong báo cáo gốc: (1) "(b) không có số tiền" không phải sơ suất mà là quy ước đã ghi (ADR-0025 điều 4.3, audit-actions.ts:14 và :36, kế hoạch sổ tiền §3.4); đề xuất "ghi số tiền vào nhật ký" đảo một quy ước đã duyệt nên cần chủ quyết, không phải sửa lỗi thuần tuý. (2) Với "Ghi lần thu" và "Ghi hoàn khách", số tiền vẫn thấy được ngay ở danh sách lần thu trên trang đơn, nên câu "Lịch sử đơn và Nhật ký không cho truy vết tiền" quá rộng: thiếu vết chủ yếu ở lệnh nộp/trả (và "Xác nhận công ty đã nhận" không có số tiền riêng trong Lịch sử). (3) Nên nói rõ Kế toán không xem được trang Nhật ký (chỉ Toàn quyền, ADR-0038), nên với Kế toán lệnh nộp không còn dấu vết nào trên giao diện — điều này làm phát hiện nặng hơn báo cáo gốc nêu. (4) Bằng chứng nên ghi thêm `src/modules/audit/repository.ts:46-57` (lọc theo order_id) cùng `service.ts:393`; báo cáo gốc chỉ dẫn `service.ts:393`. Ngoài lề (Minor): bài `src/modules/billing/lo-ghi.test.ts:402` khẳng định "không nhật ký" cho `ledger_settlement` bằng cách đếm theo `order_id` (dòng 55) nên luôn trả 0 dù lệnh có ghi hay không — bài đó rỗng cho riêng hành động này.
>   - *Hướng sửa gợi ý:* Cho lệnh nộp/trả để lại vết theo từng đơn: ghi một dòng nhật ký gắn `order_id` cho mỗi đơn được phân bổ (hoặc ít nhất mã đơn trong `detail`), hoặc đưa các dòng nộp/trả của đơn (đọc từ sổ `bil_debt_line`, nơi số tiền vốn đã có) vào khối thanh toán của trang đơn để không phải đổi quy ước "nhật ký không ghi số tiền chi tiết". Nếu muốn ghi số tiền vào nhật ký thì phải để chủ duyệt (đảo quy ước ADR-0025/kế hoạch), và nên thêm bài kiểm đếm theo hành động thay vì theo `order_id` cho `ledger_settlement`.
>   - *Bằng chứng (tệp:dòng):* Phần (a) ĐÚNG. `src/modules/billing/service.ts:393`: lệnh nộp/trả ghi nhật ký `ledger_settlement` mà KHÔNG truyền `orderId` (chỉ `targetType: "party", targetId: b.partyId, detail: "nộp về công ty · N đơn"`). `src/modules/audit/index.ts:23` + `src/modules/audit/repository.ts:46-57`: Lịch sử đơn chỉ lấy `WHERE a.order_id = ?` nên dòng này không bao giờ hiện trên đơn. `web/order.ts:760-776` chỉ dựng khối "Lịch sử" từ danh sách đó. Ngoài Lịch sử, trang đơn cũng không có chỗ thứ hai cho lệnh nộp: `tienCuaDon` (`service.ts:164-199`) chỉ trả `lanThu` = các lần thu (`receiptsOfOrder`) và dùng dòng sổ `linesOfOrder` chỉ để tính số dư `dangGiu`; sau khi nộp thì dòng "đang giữ" ở khối Kế toán (`web/order.ts:551-565`) biến mất, không để lại vết. Màn Nhật ký (`web/audit.ts:36,53`) hiện `targetLabel` = tên người nộp (qua `v_pty_party_label`, `repository.ts:90-92`), không có đường dẫn tới đơn và không có mã đơn; trang này chỉ Toàn quyền xem được (`src/modules/audit/index.ts:31-32`, ADR-0038), Kế toán không vào được. `GET /api/ledger` (`service.ts:547-554`) chỉ trả số dư, không có dòng lệnh; `web/` không gọi route này. Kế toán không có màn nào xem được "đơn nào đã được nộp bao nhiêu". Phần (b): `ledger_company_received` (`service.ts:346`) và `ledger_refund` (`service.ts:429`) không có `detail`; `payment_recorded` (`service.ts:117`) chỉ có "trả trước" / "lúc Đã giao"; `ledger_settlement` không có số tiền — đều đúng như mô tả. Tôi chỉ đọc mã, không chạy máy chủ hay test mới.
>   - *Rào chắn đã thấy:* Không có rào nào chặn hiện tượng. Có HAI điểm làm giảm mức "không truy vết được": (1) Số tiền KHÔNG ghi trong `detail` nhật ký là quy ước có chủ ý, lặp lại ở nhiều nơi: ADR-0025 điều 4 mục 3 ("nhật ký audit_log (order_delivered, không ghi SĐT/số tiền chi tiết)", đã duyệt), `src/shared/audit-actions.ts:14` và `:36` (nhóm `ledger`: "`detail` KHÔNG số tiền chi tiết"), kế hoạch `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md:194` và `docs/superpowers/plans/2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md:295`. ADR-0026 không quy định riêng hình dạng nhật ký của lệnh nộp. Quy ước ghi "số tiền chi tiết", ADR-0025 chỉ nêu cho `order_delivered`, phần mở rộng sang `ledger_*` nằm ở kế hoạch và chú thích mã, chưa thấy lý do vì sao được ghi rõ ở đâu. (2) Lần thu và lần hoàn khách đã hiện ĐỦ số tiền, người thu, người ghi, lúc ghi trong danh sách "lần thu" của trang đơn (`service.ts:138-155`, `LanThuDto` ở `src/shared/contracts.ts:1572-1588`), nên với các lệnh đó số tiền vẫn truy được ở chỗ khác; riêng lệnh nộp thì không. Ngoài ra, thông tin gốc không mất: phiếu `bil_posting` mang `order_id` khi nộp một đơn (`service.ts:391`) và mỗi dòng `bil_debt_line` mang `order_id` (`service.ts:392`), "Sổ của tôi" (`soCuaToi`, `service.ts:532-544`) cho chính người nộp thấy mã đơn, loại "Nộp / trả", số tiền. Còn `contracts.ts:1614` ghi rõ khối Kế toán trên trang đơn là chỗ đặt TẠM, hai màn sổ riêng đang chờ chủ vẽ lại.

<a id="BH-04"></a>
### 22. BH-04 · Bị đăng nhập ở máy khác giữa lúc lập đơn ⇒ mất toàn bộ nội dung đang nhập

- **Vai:** Bán hàng (mọi vai lập đơn)
- **Loại:** lỗi/trải nghiệm kém
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng (mọi vai lập đơn). Mức: **TRUNG BÌNH** (mất dữ liệu chưa lưu, không mất dữ liệu đã lưu). Loại: lỗi/trải nghiệm kém. **MỚI**.
- Mô tả: luật một máy (ADR-0075) đá phiên cũ. Người đang điền dở đơn (dịch vụ, tên, SĐT, ghi chú dài) bấm "Lưu" → bị đưa về trang đăng nhập; đăng nhập lại thì về form TRỐNG.
- Tái hiện: context 1 đăng nhập Bán Hàng B, mở /order-form, chọn TOUR4D, nhập tên "Khách Đang Nhập Dở", SĐT, ghi chú; context 2 đăng nhập cùng tài khoản; quay lại context 1 bấm "Lưu, chờ xác nhận" → `/login?next=%2Forder-form` "Tài khoản vừa đăng nhập trên máy khác lúc 22:55" → đăng nhập lại.
- Thấy: `name= note=` (trống). Ảnh `37-kicked-before-save.png`, `38-kicked-save.png`, `39-after-relogin.png`. Script `pw/s19.mjs`.
- Mong đợi: giữ bản nháp form trên máy (bộ nhớ trình duyệt) và khôi phục sau khi đăng nhập lại; hoặc báo trước khi rời trang.
- Đề xuất: lưu tạm nội dung form (localStorage, có try/catch) mỗi lần đổi, khôi phục khi quay lại `next=/order-form`. Cùng rủi ro với phiên hết hạn (chưa thử).

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (trải nghiệm). Chỉ mất nội dung chưa lưu: đơn chưa tạo (401 trả về trước khi chạm cơ sở dữ liệu) nên không mất dữ liệu đã lưu, không sai tiền, không lộ dữ liệu. Có đường vòng là gõ lại. Nhưng đơn dài (nhiều dịch vụ, tên, SĐT, ghi chú) mất công, và kích hoạt dễ gặp vì luật một máy đá cả cặp iPhone ứng dụng cài và Safari. Không đủ mức CAO.
>   - *Chính xác hoá:* Báo cáo đúng về cơ chế và kết quả. Chỉ cần chỉnh một số chỗ: (1) Mất nội dung không chỉ xảy ra khi bấm "Lưu". Mọi lời gọi `api()` nhận 401 `unauthenticated` đều đưa về đăng nhập ngay, ví dụ ô SĐT khách tra hồ sơ khi đang gõ (`web/booker-picker.ts:62`, `GET /api/parties/lookup`). Người dùng có thể bị đưa đi giữa lúc đang gõ, trước khi bấm Lưu. (2) Ghi chú "cùng rủi ro với phiên hết hạn (chưa thử)": mã xác nhận là cùng đường. Phiên hết hạn tuyệt đối sau 7 ngày kể từ lúc phát hành, không trượt (`src/modules/auth/session.ts:4`, `:42`), nên xác suất gặp thấp hơn nhiều so với bị đá máy. Các lý do kết thúc phiên khác (đổi PIN, đặt lại PIN, ngưng tài khoản, bị IT gỡ) cũng đi đường này. (3) Phạm vi: lỗi áp cho cả sửa đơn nháp (`/order-form?id=`), vì form đó cũng không lưu tạm. Báo cáo gốc chỉ thử lập đơn mới. (4) Phiên bản: báo cáo ghi HEAD `dfee4a8c` bản 1.77, đề bài ghi 1.76. `src/shared/changelog.ts:16` ghi 1.77 và `git diff --stat dfee4a8c HEAD` chỉ khác các tệp tài liệu, nên mã giống nhau. Không ảnh hưởng kết luận. (5) Chữ "Mong đợi... hoặc báo trước khi rời trang": máy cũ không có sự kiện nào báo "sắp bị đá" vì Bảng tin đóng im lặng (`web/bangtin-logic.ts:235-236`). Báo trước chỉ làm được nếu thêm xử lý riêng cho mã đóng 4003.
>   - *Hướng sửa gợi ý:* Trước khi đưa về đăng nhập, lưu tạm nội dung form trên máy theo từng tài khoản, hạn ngắn, và xoá khi đăng xuất hoặc khi người đăng nhập kế tiếp khác người; sau đăng nhập, form tự khôi phục và hỏi người dùng có dùng lại không. Vì việc này đặt dữ liệu khách (tên, SĐT, ghi chú) lên thiết bị, cần chủ duyệt phạm vi và thời hạn lưu (có thể qua ADR ngắn) trước khi thi công. Có thể thêm dải báo sớm khi Bảng tin bị đóng vì "đăng nhập máy khác" để người dùng biết trước.
>   - *Bằng chứng (tệp:dòng):* Đường đi dựng lại từ mã (chỉ đọc, không chạy máy chủ hay trình duyệt): 1) Máy chủ đá phiên cũ. `src/modules/auth/index.ts:80-88` (`issueLoginSession`): tài khoản chịu luật một máy thì lô ghi chạy `endOtherSessionsStatement(..., "bi_thay", ...)` rồi chèn phiên mới. Điều 2 của ADR-0075 (`docs/adr/ADR-0075-phien-dang-nhap-mot-may.md:18`) mô tả đúng việc này. 2) Máy cũ chưa biết mình bị đá. Bảng tin của phiên cũ bị trạm đóng bằng mã 4003 (`src/modules/bangtin/tram.ts:100`, `src/modules/bangtin/index.ts:55`). Phía trình duyệt, `web/bangtin-logic.ts:235-236` chỉ gọi `matKetNoi` rồi nối lại, không đưa người dùng về trang đăng nhập và không báo gì. Người dùng vẫn ở trong form. 3) Lần gọi API kế tiếp mới lộ ra. `currentStaff` (`src/modules/auth/index.ts:52-62`) trả null vì dòng phiên đã kết thúc, nên `src/shared/router.ts:353-354` trả 401 `unauthenticated`. `web/api.ts:182` bắt đúng mã đó rồi gọi `goLogin()` (`web/api.ts:62-68`): hỏi lý do kết thúc phiên, xoá bản nhớ khung, rồi `location.replace('/login?next=' + đường dẫn hiện tại)` ở dòng 66. Trong form lập đơn, lời gọi đó là `api("/api/orders", { method: "POST", body: collect() })` ở `web/order-form.ts:444`. 4) Đăng nhập xong thì quay về form trắng. `web/login.ts:159` đọc `next`, `web/login.ts:206` (và các dòng 161, 242, 455) gọi `location.replace(next)`, tức tải lại hẳn `/order-form`. Form dựng mới từ đầu, `entries` rỗng. 5) Không có chỗ nào giữ nội dung form. - `grep localStorage|sessionStorage|beforeunload|pagehide` trong `web/order-form.ts` cho kết quả rỗng (chỉ có chữ "nháp" theo nghĩa đơn nháp trên máy chủ). - Các nơi dùng `localStorage` trong `web/` đều không chứa nội dung form: `catalog-picker.ts:34-57` chỉ nhớ chip lọc nhóm dịch vụ, `khung-nho.ts` chỉ nhớ chữ cái đầu và 4 cờ menu, `help-seen.ts`, `orders.ts` (bộ lọc), `tro-ly.ts` (vị trí khung). - Vé chống ghi trùng ADR-0094 giữ qua 401 nhưng chỉ lưu mã băm và vé, không lưu thân (`src/shared/lan-gui-ve.ts:7-8`, `:35-37`). Nó không giúp khôi phục nội dung. - `location.replace` làm Back/bfcache không đưa về trang cũ (`web/CLAUDE.md`, mục "Bẫy đã cắn thật"). 6) Phiên hết hạn đi cùng đường. `src/modules/auth/session.ts:4` đặt hạn 7 ngày và `:42` tính hạn tuyệt đối từ lúc phát hành. Hết hạn cũng làm `currentStaff` trả null, nên cũng ra 401 rồi `goLogin`. Điều này khớp ghi chú "cùng rủi ro với phiên hết hạn" của báo cáo gốc. Đổi PIN, đặt lại PIN, ngưng tài khoản, IT gỡ phiên (ADR-0075 điều 4) cũng đi đường này. Kết quả khớp quan sát của người thử: `name=` và `note=` trống sau khi đăng nhập lại. Không chạy được trình duyệt nên không tái hiện ảnh chụp và script `pw/s19.mjs` của báo cáo gốc. Kết luận dựa vào mã và vào tính tất định của luồng: trạng thái form chỉ nằm trong bộ nhớ trang và DOM.
>   - *Rào chắn đã thấy:* Không có rào nào chặn hoặc giữ lại nội dung form. Những thứ tìm thấy đều không đủ chặn: - `web/api.ts:182` chỉ đưa về đăng nhập, không lưu gì trước đó. - `web/api.ts:64` (`xoaKhungNho`) chủ động xoá bản nhớ khung khi hết phiên, vì máy có thể đổi người dùng (ADR-0035 điều 3, `docs/adr/ADR-0035-khung-app-nam-san-tren-may.md:15`). - Vé chống ghi trùng chỉ giữ mã băm (`src/shared/lan-gui-ve.ts:7-8`). - `web/order-form.ts` có dải báo khi đang sửa đơn nháp bị người khác đổi (khoảng dòng 660-668) và `docs/SYSTEM-DESIGN.md:1008` ghi "`/order-form` KHÔNG BAO GIỜ tự tải lại (sẽ xoá thứ đang nhập)". Đây là thiết kế chống mất nội dung khi Bảng tin có tin mới, không liên quan đến mất phiên. Dấu hiệu thiết kế cố ý: không thấy. ADR-0075, ADR-0094, `docs/SYSTEM-DESIGN.md` và `docs/CHANGE-GUIDE.md` không có chỗ nào quyết định bỏ hay giữ nháp form khi bị đá phiên. ADR-0075 còn tự ghi rằng ứng dụng đã cài và Safari trên cùng iPhone là hai máy nên đăng nhập Safari sẽ đá ứng dụng ra (`ADR-0075:35`), tức là kích hoạt dễ xảy ra trong dùng thật. Ràng buộc cần lưu ý cho hướng sửa: ADR-0035 điều 3 cấm bản nhớ khung lưu SĐT hoặc dữ liệu khách/đơn/tiền, và `web/api.ts:64` xoá bản nhớ vì máy có thể đổi người. Nên lưu nháp form lên máy là việc chạm dữ liệu khách trên thiết bị, phải hỏi chủ (CLAUDE.md §3, P8).

<a id="HT-23"></a>
### 23. HT-23 · Gắn HDV làm "người đi kèm" lên xe nhưng HDV không được báo, không thấy xe / giờ / điểm hẹn; suất người đi kèm không có…

- **Vai:** Điều phối → Hướng dẫn viên
- **Loại:** bất hợp lý
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Nợ có chủ ý của tính năng người đi kèm (1/10)
- **Hướng xử lý:** Cần chủ quyết (hoàn thiện tính năng)
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Điều phối → Hướng dẫn viên. **Mức:** TRUNG BÌNH. **Loại:** bất hợp lý.
- **Tái hiện:** Quản trị `POST /chuyen/CX-0410-01/phan-bo {nguoiDiKem: [HDV A]}` → 200, tải 6 → 7, suất CREW `diemLen: null, diemXuong: null`. Hộp thông báo HDV A: không có tin; HDV A `GET /van-chuyen/cuoc-cua-toi` → 403 "Tài khoản này không có cuốc xe."; `GET /van-chuyen/xe-cua-don/:id` → 403.
- **Mong đợi:** HDV được gắn lên xe nhận tin + thấy xe, tài xế, giờ, điểm lên.
- **Bằng chứng:** `kiem-vai/ht/s32.mjs`.
- **TRÙNG một phần** (ADR-0064 đề xuất "HDV thấy xe của đơn", rà soát 1/10 "Giới hạn theo quyền"); phần "gắn đi kèm mà không báo, không điểm lên" **MỚI**. **Đề xuất:** tin cho người đi kèm + DTO hẹp cho HDV về chuyến mình đi kèm.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (tin báo). Tính năng "gắn HDV đi kèm" vừa ra 1/10 làm nửa vòng: HDV bị xếp lên xe mà không có tin, không có màn để biết xe, giờ, điểm hẹn, nên việc báo hoàn toàn nằm ở văn phòng bằng cách ngoài hệ thống; có đường vòng (gọi/nhắn) và dữ liệu không lộ hay mất, nên không phải CAO. Không xuống THẤP vì đây là sai lệch nghiệp vụ thật (người được gắn không được báo), dù là nợ có chủ ý.
>   - *Chính xác hoá:* 1) Nhãn "bất hợp lý" và ngầm ý "lỗi" chưa đúng: HDV chưa được báo/chưa thấy chuyến là phạm vi hoãn có chủ ý, đã ghi (lời chủ 1/10 phương án A; test nguoi-di-kem.test.ts:55; ADR-0052:165). Nên ghi là "khoảng trống nghiệp vụ của tính năng mới / nợ có chủ ý", không phải mã sai hay lệch đặc tả. 2) "TRÙNG một phần ADR-0064" chưa chính xác: ADR-0064 (proposed) không nhắc người đi kèm; D2 chỉ cho HDV PHỤ TRÁCH ĐƠN xem biển số + tên tài xế trên trang đơn (không giờ, không điểm, không tin, D2.8 giữ không gửi tin chuyến cho HDV). Vì vậy dù ADR-0064 được duyệt thì HDV đi kèm vẫn không có tin, không giờ, không điểm hẹn. Toàn bộ phát hiện là MỚI, không chỉ phần "không báo, không điểm lên". 3) "suất CREW không có điểm lên" là thiết kế đã ghi (GA-43 + CHECK ở migration 0042:140-141 + dieu-phoi-lenh.ts:151), không phải lỗi dữ liệu; chỉ đúng nếu chủ muốn HDV có điểm hẹn riêng thì mới thành yêu cầu mới. 4) Đề xuất "tin cho người đi kèm + DTO hẹp cho HDV" không phải việc nhỏ: chạm quyền (trip.view hoặc ô mới cho FIELD, bản đồ quyền, cổng route, nhãn tin) và dữ liệu (DTO), lại trái chữ ADR-0052:165 đã duyệt; theo CLAUDE.md §3 và P8 phải qua ADR + chủ duyệt (kèm trang ghép), không sửa thẳng. Việc lớn nên cần người kiểm độc lập sau thi công. 5) Chi tiết nhỏ: `xe-cua-don` bị chặn ở cổng office (OFFICE_GATE không có FIELD, permissions.ts:264), không phải trong thân route; kết quả vẫn là 403 nên không đổi kết luận. Bằng chứng s32.mjs không có trong repo.
>   - *Hướng sửa gợi ý:* Chủ quyết trước (qua ADR mới hoặc bổ sung ADR-0064/0052): HDV đi kèm được biết những gì (tin "Bạn được xếp đi kèm chuyến …", giờ xuất bến, xe, tên tài xế, có điểm hẹn hay không), rồi mới thêm một ô quyền hẹp cho HDV chỉ trên chuyến mình đi kèm và một loại tin mới cho đúng người nhận; không mở rộng trip.view của FIELD. Trong lúc chờ, nên ghi rõ nợ này (và dòng hướng dẫn "văn phòng tự báo HDV") vào docs/VAN-CHUYEN.md hoặc backlog để người vận hành không tưởng hệ thống đã báo.
>   - *Bằng chứng (tệp:dòng):* Phần hành vi ĐÚNG như mô tả, dựng lại từ mã (không cần chạy máy chủ): 1) Điểm vào: POST /api/van-chuyen/chuyen/:id/phan-bo, cổng office, hỏi trip.dispatch (src/modules/van-chuyen/index.ts:1040-1041). Thân xếp nhận `nguoiDiKem` (dieu-phoi-than.ts:95,116). Máy chủ chỉ kiểm người đó là tài khoản FIELD đang hoạt động (index.ts:1052-1055, 409 `nguoi_di_kem_khong_hop_le`). Qua kiểm thì dieu-phoi-lenh.ts:151 mở suất loại CREW với `legId:null, personKey:null, boardStopId:null, alightStopId:null`. Suất người đi kèm cũng được đếm vào tải xe (dieu-phoi-lenh.ts:128 đếm mọi suất WAITING/BOARDED, tức 6→7 là đúng). 2) Không báo tin: sau lô thành công route gọi `baoThayDoiChuyen` (index.ts:1060) → src/index.ts:104-120. Người nhận chỉ gồm nhãn `dieu-xe` (văn phòng) cộng tài xế có dòng lái, tính bằng `taiXeNhanSuKien` (src/shared/tin-chuyen.ts:79-83: lọc theo `laiLucSuKien` VÀ `can(t,"trip.view",{assigned:true})`). Hộp thông báo dùng `loaiCho` (tin-chuyen.ts:28-41): dòng 37 `if (!can(n,"trip.view")) return null` với chú thích "DRIVER (assigned) / FIELD / PARTNER / INTERN / DRIVER_PARTNER dừng ở đây". Bản đồ quyền: `trip.view` của FIELD = none (src/shared/permissions.ts:169, cột 4). Hành động `trip_allocated` còn không nằm trong HANH_DONG_TIN_CHUYEN (tin-chuyen.ts:7), nên ngay cả tài xế cũng không nhận tin khi văn phòng xếp thêm người. Bài tin-chuyen.test.ts:54-59 khoá FIELD không nhận tin chuyến. 3) HDV không thấy chuyến: `GET /api/van-chuyen/cuoc-cua-toi` hỏi `can(staff,"trip.view",{assigned:true})` rồi trả `CAN_XEM_CUOC` = 403 "Tài khoản này không có cuốc xe." (index.ts:1191-1192, :85). Phần "assigned" của trip.view là "đang có dòng lái" nên HDV không bao giờ qua. `GET /api/van-chuyen/xe-cua-don/:orderId` ở cổng office (index.ts:1589) và OFFICE_GATE không có FIELD (permissions.ts:264), nên 403 ngay ở cổng. 4) Chạy lại: `node --test src/modules/van-chuyen/nguoi-di-kem.test.ts` cho 5/5 đạt. Bài ở dòng 55 khẳng định `GET /chuyen/:id` bằng FIELD → 403 ("HDV chưa thấy chuyến (ADR-0064 còn proposed)"). Không kiểm được: tệp bằng chứng `kiem-vai/ht/s32.mjs` không có trong repo (không tìm thấy bằng Glob), nên không đối chiếu được kết quả chạy thật.
>   - *Rào chắn đã thấy:* Không có rào chặn việc xảy ra (mã làm đúng như mô tả), nhưng có bằng chứng đây là PHẠM VI CỐ Ý HOÃN, không phải lỗi mã: - docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-01-viec-nho.md:8 và 2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:129,170: lời chủ 1/10 chọn phương án A "Chỉ hướng dẫn viên (Recommended)": tên hiện ở chi tiết chuyến văn phòng + màn tài xế; "hướng dẫn viên CHƯA thấy chuyến (không mở trip.view cho FIELD — ADR-0064 còn proposed)". Phương án C "để sau cùng ADR-0064" không được chọn. - src/modules/van-chuyen/nguoi-di-kem.test.ts:2 và :55 khoá hành vi "HDV KHÔNG thấy chuyến". - docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md:165 (đã duyệt): người nhận tin chuyến phải qua can(trip.view) lúc đọc; Hướng dẫn viên "không nhận tin chuyến nào ... đúng lời chủ Q1 'HDV, Đối tác không thấy lịch xe'". Điều này viết trước khi có tính năng người đi kèm nên chưa tính tới HDV đi kèm. - docs/superpowers/plans/2026-09-29-adr-0049-thi-cong-nhat-ky.md:474 (GA-43, bề mặt): "suất người đi kèm (CREW) không có điểm — đã đón / đã trả không đòi điểm đã tới". Mã khớp: migrations/0042_chuyen_xe.sql:140-141 (CHECK chỉ buộc board_stop_id cho PASSENGER), src/modules/van-chuyen/chuyen-repo.ts:425,434 (`kind = 'CREW' OR EXISTS ...`), dieu-phoi-gio.ts:89-93. - ADR-0064 (docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/ADR-0064-hdv-thay-ghi-chu-don.md, trạng thái proposed): CHỈ bàn HDV PHỤ TRÁCH ĐƠN thấy biển số + tên tài xế trên trang đơn (D2.5 cố ý bỏ giờ, số khách, trạng thái chuyến; D2.8 nói tin vẫn không gửi cho HDV). Không nhắc "người đi kèm" lần nào (grep không ra). - Đường vòng hiện có: văn phòng và tài xế đều thấy tên HDV đi kèm (chi tiết chuyến văn phòng, màn tài xế); văn phòng báo HDV bằng lời/điện thoại; nếu HDV cũng là người phụ trách đơn thì vẫn thấy chặng đón của đơn mình (giờ, nơi đón).

<a id="VP-10"></a>
### 24. VP-10 · Màn Đơn hàng không phục vụ đối chiếu.

- **Vai:** Kế toán
- **Loại:** khó dùng
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Màn Đơn hàng không phục vụ đối chiếu.** Lọc chỉ có ngày đi, dịch vụ, trạng thái, người lập, "đã/chưa nhập phần mềm kế toán". Không lọc theo "còn thu / đã đủ / dư", không lọc theo ngày thu tiền, không có dòng tổng, không có nút xuất dữ liệu.
- Tái hiện: `src/shared/loc-don.ts:29-47`; màn `/orders` của Kế toán.
- Liên quan G5/KT01 (không có màn sổ), nhưng phần lọc/tổng/xuất là MỚI.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (trải nghiệm). Đây là thiếu tính năng, không phải lỗi hay mất an toàn: không sai tiền, không lộ hay mất dữ liệu, không vượt quyền. Nhưng Kế toán phải đối chiếu từng thẻ, mỗi trang 30 đơn, không có tổng hay xuất tệp, nên gây khó rõ rệt cho việc chính. Việc vẫn làm được bằng đường vòng (lọc ngày đi, lọc chưa nhập phần mềm kế toán, xem số trên từng thẻ, ô tổng trên Trang chủ).
>   - *Chính xác hoá:* Mô tả đúng, chỉ cần bổ sung cho đủ: (a) Ô "đã/chưa nhập phần mềm kế toán" bắt buộc kèm Từ ngày và Đến ngày, tối đa 92 ngày (`loc-don.ts:68-74`, `orders/index.ts:615-619`). Báo cáo gốc không nêu. (b) "Không có dòng tổng" chỉ đúng với màn Đơn hàng. Trang chủ có tổng "Còn thiếu tiền" (`web/home.ts:94`), nhưng không đi theo bộ lọc. (c) "Không lọc theo ngày thu tiền" đúng cả ở tầng máy chủ: không route nào liệt kê lần thu theo ngày (`GET /api/ledger` không có tham số). (d) Tệp:dòng `src/shared/loc-don.ts:29-47` đúng nhưng chỉ là phần đọc tham số; danh sách điều kiện đầy đủ nằm thêm ở `loc-don.ts:19-25, 54-62` và `src/modules/orders/repository.ts:463-503`. (e) Câu "phần lọc/tổng/xuất là MỚI" đúng. Riêng ý "dư" có chồng một phần với "Màn sổ Kế toán" đã được duyệt (ADR-0089 điều (c), danh sách "Cần chi hoàn" gồm trả dư của đơn không huỷ), nên nên gộp theo dõi với G5/KT01 ở phần đó.
>   - *Hướng sửa gợi ý:* Thêm điều kiện lọc theo tiền (còn thu, đã đủ, dư) và theo ngày thu cho Kế toán, cùng dòng tổng của tập đã lọc và nút xuất tệp bảng tính. Phần lọc phải đi qua hàm tiêm của `billing` như dấu kế toán và cần ADR do chủ duyệt vì chạm hợp đồng giữa module và quyền xem tiền. Nên gộp vào "Màn sổ Kế toán" (ADR-0089 điều (c)) thay vì mở rộng thêm bộ lọc của `/orders`.
>   - *Bằng chứng (tệp:dòng):* Đã đọc mã thật ở nhánh hiện tại (HEAD 1c3339eb, cây làm việc sạch), không chạy máy chủ hay mạng. Bốn ý của báo cáo gốc đều đúng với mã. (1) Bộ lọc chỉ có năm điều kiện. `src/shared/loc-don.ts:19-25` (kiểu `LocDon`: `tu`, `den`, `dichVu`, `trangThai`, `nguoiLap`) cộng `loc-don.ts:54-62` (`LocDonMan` thêm `nhapKeToan: "da" | "chua" | null`). `docLocDon` ở `loc-don.ts:29-47` chỉ đọc đúng các tham số đó, tham số lạ bị bỏ qua. Phía SQL, `src/modules/orders/repository.ts:463-503` (`dieuKienDanhSach`) chỉ có `trangThai`, `nguoiLap`, `sv.depart_date >=/<=`, `sv.catalog_code`, cộng ô tìm `q`. Không có điều kiện nào về tiền còn thu, đã đủ hay dư, và không có điều kiện về ngày thu tiền. (2) Bảng lọc trên giao diện (`web/orders.ts:305-450`) chỉ dựng đúng các nhóm: Ngày đi, Trạng thái, Dịch vụ, Người lập, và ô "Nhập phần mềm kế toán (cần Từ ngày – Đến ngày)" (`web/orders.ts:379-387`, hiện cho người có `accounting.entry.view`). Không có nhóm nào về tiền. (3) Không có dòng tổng. `public/orders.html:15-23` chỉ có thanh công cụ, danh sách thẻ, nút "Tải thêm". Phản hồi `GET /api/orders` là `OrderListResponse { orders, hasMore }` (`src/shared/contracts.ts:465`), không có trường tổng. Số "Còn thu" chỉ hiện trên từng thẻ, điền bằng `fillTien` gọi `POST /api/ledger/balances` cho tối đa 30 đơn một trang (`web/orders.ts:113-122`, `web/order-card.ts:196-201`). (4) Không có nút xuất dữ liệu. Grep `createObjectURL|text/csv|download|toBlob` trong `web/`, `src/`, `public/*.html` chỉ ra việc tải ảnh PNG xác nhận gửi khách (`web/confirmation-dialog.ts:203-207`, `web/confirmation-image.ts:502`) và đọc CSV từ Sheet (`src/shared/sheets.ts:31`, `src/shared/csv.ts` là bộ đọc, không phải bộ ghi). Không có route hay nút nào xuất danh sách đơn hay sổ ra tệp. Phần "ngày thu tiền" cũng không có ở chỗ khác: `GET /api/orders/:id/payments` chỉ theo từng đơn (`src/modules/billing/index.ts:42`); `GET /api/ledger` (`billing/index.ts:182-185`, `soCongNo` ở `billing/service.ts:547-555`) chỉ trả số dư theo bên, khoản chờ xác nhận, lần thu chưa rõ người thu, không có lọc ngày; không trang web nào gọi nó (grep `api/ledger` trong `web/*.ts` chỉ thấy balances, unpaid-summary và các lệnh ghi). Đường vào đến kết quả: Kế toán mở `/orders` → `web/orders.ts:478-496` gọi `initShell()` rồi `load(true)` → `listUrl` (`web/orders.ts:55-60`) ghép tham số từ `thamSoLocDon` (`loc-don.ts:77-86`, đúng năm khoá) → `GET /api/orders` (`src/modules/orders/index.ts:587-660`) → `docLocDon` → `listOrders` với `dieuKienDanhSach` → trả mỗi trang tối đa 100 (giao diện xin 30) → `fillTien` điền "Còn thu / Đã trả" từng thẻ. Không bước nào có tổng, lọc tiền hay xuất.
>   - *Rào chắn đã thấy:* Không có rào chắn nào bác bỏ phát hiện. Những điều tìm thấy chỉ làm nhẹ mức độ, không làm sai mô tả: - Có đường vòng một phần: ô "Nhập phần mềm kế toán" (đã/chưa nhập; ADR-0060, `loc-don.ts:68-74`, `orders/index.ts:605-621`), nhưng bắt buộc kèm Từ ngày và Đến ngày, tối đa 92 ngày (`LOC_NHAP_TOI_DA_NGAY`). - Trang chủ có ô tổng "Còn thiếu tiền" (đếm + tổng) qua `GET /api/ledger/unpaid-summary` (`billing/index.ts:159-173`, `web/home.ts:94`). Đây là tổng toàn hệ thống, không đi cùng bộ lọc của màn Đơn hàng. - Mỗi thẻ đơn hiện "Còn thu" và "Đã trả" (`web/order-card.ts:196-201`), nên đối chiếu thủ công từng đơn vẫn làm được. Ô tìm `q` có sẵn. - Không thấy dấu hiệu đây là quyết định cố ý loại bỏ. Bộ lọc được dựng theo góp ý T4/YC-0008/YC-0012 (`docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md` §7.2, `docs/design/gop-y-2026-09-30/README.md`), vốn nhắm người bán, không bàn đối chiếu tiền. Không có ADR hay đặc tả nào ghi "không làm" lọc theo tiền, tổng hay xuất. ADR-0004 "Vẫn KHÔNG làm" chỉ loại hoá đơn điện tử, tính thuế, cổng thanh toán (`docs/adr/ADR-0026-so-cong-no-lan-thu-va-bien-nhan-danh-sach-trang.md:38`). - Có kế hoạch gần: ADR-0089 điều (c) và `docs/superpowers/specs/2026-10-02-luot-duyet-1-don-huy-va-quyen-tien.md:139-145` dự kiến "Màn sổ Kế toán" gồm danh sách "Cần chi hoàn" (có cả tiền trả dư của đơn không huỷ), "Đơn huỷ giữ cọc", "Đơn huỷ còn người giữ tiền", chỉ `ledger.view any`. Màn đó chưa có ("chủ thiết kế trên Claude Design"). Nó phủ một phần ý "dư", không phủ lọc theo ngày thu, dòng tổng hay xuất dữ liệu. - Ràng buộc kiến trúc làm việc sửa không đơn giản: `orders` không được đọc bảng `bil_` (ADR-0024 điều 4). Muốn lọc theo còn thu ở `GET /api/orders` phải tiêm một hàm đọc từ `billing` như `nhapKeToanCuaDon` (`billing/index.ts:232-236`).

<a id="VP-11"></a>
### 25. VP-11 · Hộp thông báo của Kế toán đầy tin bán hàng, không có tin về tiền.

- **Vai:** Kế toán
- **Loại:** khó dùng
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Yêu cầu mới, chưa được duyệt
- **Hướng xử lý:** Cần chủ duyệt yêu cầu
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Hộp thông báo của Kế toán đầy tin bán hàng, không có tin về tiền.** 14 tin đều là "vừa lập đơn mới / vừa xác nhận / vừa huỷ". Không có tin "khoản chuyển khoản chờ Kế toán xác nhận", "đơn huỷ còn tiền cọc".
- Tái hiện: `fb1.mjs` (`GET /api/thong-bao` của Kế toán).
- TRÙNG MỘT PHẦN: Đợt 1 Task 11 có tin "Đã duyệt hoàn cọc". Tin CK chờ xác nhận là MỚI.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (tin báo). Không sai tiền, không lộ/mất dữ liệu; là thiếu một kênh nhắc: Kế toán không có hàng đợi lẫn tin nào cho khoản chờ xác nhận (không có màn sổ), nên phải tự mở từng đơn, dễ sót việc đối soát tiền. Có đường vòng (trang đơn, ô "Còn thiếu tiền" ở Trang chủ, lọc danh sách đơn) nên không chặn việc chính. Bản chất là yêu cầu mới, chưa được duyệt, hơn là lỗi mã.
>   - *Chính xác hoá:* (1) "Hộp thông báo của Kế toán đầy tin bán hàng": 14 tin này nằm ở ngăn "Tất cả" (GET /api/thong-bao không tham số trả `tat-ca` mặc định, src/modules/thongbao/index.ts:195). Giao diện mở ở ngăn "Của tôi" (web/thong-bao-ui.ts:262) với lời chú "Tin công ty gửi bạn, đơn bạn lập hoặc phụ trách, đơn chờ nhận, chuyến xe liên quan tới bạn" (:33). Kế toán không lập hay phụ trách đơn nên không có tin đơn nào ở ngăn này; số đỏ trên chuông cũng không đếm chúng (thong-bao.ts:105 `cuaToi = chung.some(t => t !== "tat-ca")`; :150; chú thích web :34 "Số đỏ trên chuông không đếm ngăn này"). Nên mô tả đúng là: ngăn "Tất cả" đầy tin bán hàng, ngăn "Của tôi" (mặc định) thì trống tin về tiền và về đơn. (2) "TRÙNG MỘT PHẦN: Đợt 1 Task 11 có tin 'Đã duyệt hoàn cọc'": Task 11 mới là kế hoạch chưa thi công, và chỉ phủ "Đã duyệt hoàn cọc"; tin "đơn huỷ còn tiền cọc" (đơn huỷ chờ hoàn) không nằm trong Task 11. Phần "khoản CK chờ xác nhận" thì đúng là MỚI. (3) "Liên quan G5/KT01 (không có màn sổ)": đúng nhưng nên nói rõ, API GET /api/ledger có (billing/index.ts:182) mà không có màn nào dùng, nên tin nhắc càng là kênh duy nhất để Kế toán biết việc chờ. (4) Phần `fb1.mjs` không kiểm lại được vì chỉ đọc mã; kết luận nêu ở đây dựa trên mã và bài test luật thuần.
>   - *Hướng sửa gợi ý:* Qua ADR mới được chủ duyệt: thêm nguồn tin về tiền (khoản "Công ty thu – CK" chờ xác nhận, đơn huỷ còn cọc chờ hoàn) kèm luật người nhận theo ô quyền (`ledger.write`, Kế toán) vào "Của tôi" nhưng không đẩy màn hình khoá; việc này đổi view công bố `v_aud_order_event` nên cần migration và chủ duyệt, không tự làm. Song song nên có một danh sách "khoản chờ Kế toán xử lý" (màn sổ) để tin nhắc có chỗ dẫn tới.
>   - *Bằng chứng (tệp:dòng):* Phần ĐÚNG, dựng lại đường đi: (1) Nguồn tin về đơn chỉ gồm 6 hành động nhật ký, không có tiền: src/shared/thong-bao.ts:8 `HANH_DONG_TIN_DON = ["created","order_claimed","order_handler_changed","confirmed","cancelled","order_cancelled_by_field"]`; hàm `loaiTinDon` (thong-bao.ts:31-42) trả `null` cho mọi hành động khác (`default: return null`). (2) Chặn cả ở tầng CSDL: migrations/0025_thong_bao.sql:53-56, view `v_aud_order_event` chỉ cho đúng 6 hành động trên (`WHERE ... action IN ('created','order_claimed','order_handler_changed','confirmed','cancelled','order_cancelled_by_field')`); `listDon` (src/modules/thongbao/repository.ts:8-21) chỉ đọc view này. Nên `payment_recorded` (src/shared/audit-actions.ts:39, "Ghi lần thu") và `ledger_company_received` (audit-actions.ts:44) không bao giờ thành tin. (3) Kế toán chỉ khớp nhãn `tat-ca`: `nhanKetNoi` (src/shared/bang-tin.ts:55-61) cho `order.view = any` thành `tat-ca`; Kế toán không có `dispatch.claim` nên không có `cho-nhan`; `locHopThongBao` (thong-bao.ts:93-105) đổi `cho_nhan` thành `xac_nhan` cho người không nhận được đơn, và dòng 102 cắt tin `created` chỉ còn nhãn `tat-ca`. Kết quả là 3 loại tin lập đơn/xác nhận/huỷ mà báo cáo thấy. (4) Trạng thái "khoản chuyển khoản chờ Kế toán xác nhận" có thật: route POST /api/ledger/company-receipts/:receiptId/confirm (src/modules/billing/index.ts:188-196), nút ở web/order.ts:529. Không có hàng đợi/tin nào báo cho Kế toán biết có khoản chờ: GET /api/ledger (billing/index.ts:182-186) không được web/ gọi (grep `api/ledger` trong web/ chỉ thấy balances, unpaid-summary, company-receipts/confirm, adjustments). Hướng dẫn Kế toán tự ghi nhận (src/shared/huong-dan-ke-toan.ts:113 "Chưa có màn **Sổ công nợ** riêng; mọi việc làm ngay trên trang đơn"; :137 "Chuông ... báo khi có đơn mới, có người nhận đơn, đơn được xác nhận hay bị huỷ"). Chạy `node --test src/shared/thong-bao.test.ts`: 16/16 xanh, trong đó bài K1 (thong-bao.test.ts:32-36) khoá việc Kế toán thấy "Hùng vừa lập đơn mới ..." và bài :67 khoá việc Kế toán thấy việc xác nhận ở "Tất cả".
>   - *Rào chắn đã thấy:* Không có rào chắn kỹ thuật nào chặn kết quả (không có đường nào khác đẩy tin về tiền tới Kế toán). Có DẤU HIỆU THIẾT KẾ CỐ Ý cho từng nửa của mô tả: (a) Tin bán hàng ở hộp Kế toán là cố ý: ADR-0034 điều 3-4 (docs/adr/ADR-0034-thong-bao-he-thong-hop-thong-bao.md:23-24) và đặc tả docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md:180 ("Kế toán B thấy 'A vừa lập đơn mới DH-…' ở ngăn 'Tất cả', không ở 'Của tôi', số đỏ của B không tăng"). (b) Tin về tiền không vào hộp là quyết định ghi rõ: đặc tả :84 "Các hành động khác (`updated`, `trip_updated`, tiền…) không vào hộp"; ADR-0034 điều 1 liệt kê đúng 6 nguồn (dòng 21); ADR-0025 điều 8 (docs/adr/ADR-0025-hai-buoc-da-giao-va-hoan-thanh-khoa-don.md:71) cho hai lệnh tiền chỉ làm mới màn hình, không nổi; docs/superpowers/specs/2026-09-29-so-tien-luot-1-lam-moi-ho-so-duyet.md:40 ghi "giả định bề mặt, đảo được — một dòng nếu chủ muốn báo Kế toán". Đây là thiếu năng lực chưa được duyệt, không phải mã lệch đặc tả. Chưa có kế hoạch nào đã thi công lấp chỗ trống: Task 11 (tin "Đã duyệt hoàn cọc") mới là kế hoạch, ô checklist chưa tích (docs/superpowers/plans/2026-10-02-khac-phuc-audit-checklist.md:95), không có mã `deposit_refund_approved` nào trong src/ (chỉ có trong ADR/kế hoạch). Chính kế hoạch ghi (plans/2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md:502) rằng khuôn người nhận hôm nay không có luật "theo ô quyền" thì phải dừng báo điều phối.

<a id="VP-09"></a>
### 26. VP-09 · Danh sách đơn và Trang chủ ghép NGÀY ĐI với GIỜ ĐÓN của chặng, nên chặng đón tối hôm trước hiện sai ngày.

- **Vai:** mọi vai văn phòng
- **Loại:** sai hiển thị (giờ đón)
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Danh sách đơn: lỗi; Trang chủ: chủ đã duyệt
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Danh sách đơn và Trang chủ ghép NGÀY ĐI với GIỜ ĐÓN của chặng, nên chặng đón tối hôm trước hiện sai ngày.** Đơn ngày đi 03/10, chặng đón 02/10 lúc 23:55 → danh sách hiện "03/10 · 23:55"; Trang chủ xếp đơn này vào "Ngày mai (2)" trong khi xe phải đón tối nay.
- Tái hiện: `dg2.mjs` (đơn TD-20261002-0008, đơn nháp; công thức hiển thị không phân biệt nháp/đã xác nhận); `vp-crawl.mjs kt d /orders`, `qt d /`.
- Bằng chứng: `web/order-card.ts:96` `${dayMonth(o.departDate)} · ${o.pickupTime}`.
- Đề xuất: dùng ngày đón của chặng (`pickupDate`) khi có chặng.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Trung bình (trải nghiệm). Nhãn ngày đón sai trên thẻ danh sách và đầu trang đơn là sai thông tin nghiệp vụ, nhưng chỉ khi chặng đón khác ngày đi (hẹp, tối đa lùi 1 ngày với chiều đi), không mất tiền hay dữ liệu và có đường vòng: khối "Đưa đón" và Điều phối xe hiện đúng ngày. Mức TRUNG BÌNH giữ nguyên, không nâng thêm vì phần Trang chủ là quyết định chủ đã chấp nhận.
>   - *Chính xác hoá:* (1) Báo cáo gộp "Danh sách đơn và Trang chủ" làm một. Chỉ danh sách đơn (web/order-card.ts:96, cộng thêm web/order.ts:391 chưa được nêu) ghép NGÀY ĐI với giờ đón. Trang chủ không ghép chuỗi ngày–giờ: nó xếp đơn vào tab theo ngày đi (repository.ts:625-631) và chỉ hiện giờ (web/home.ts:123), và đây là hành vi chủ đã duyệt (Q3), không phải lỗi mã. (2) Báo cáo ghi tái hiện bằng đơn nháp TD-20261002-0008 nhưng nói "Trang chủ xếp đơn này vào Ngày mai (2)": đơn nháp không bao giờ vào Trang chủ (repository.ts:627 chỉ lấy `confirmed`), nên quan sát Trang chủ phải từ một đơn đã xác nhận khác, hoặc là suy ra. (3) Câu "xe phải đón tối nay" đúng nghiệp vụ, nhưng Điều phối xe đã xếp theo ngày đón thật nên việc điều xe không bị lệch, chỉ nhãn xem nhanh bị lệch. (4) Đường dẫn gợi ý "dùng `pickupDate` của chặng" cần mở rộng hợp đồng: `OrderSummaryTripDto` hiện không có `pickupDate`, nên không thể sửa chỉ ở giao diện. (5) Phát hiện liên quan chưa được báo cáo gốc nêu, mới chỉ grep: biên nhận gửi khách hiện cũng chỉ in "Khởi hành: <ngày đi>" và "Đón khách: <giờ> · <nơi>" không kèm ngày đón (src/shared/order-confirmation.ts:198; không có `pickupDate` trong tệp này hay src/modules/receipt/rules.ts), dù đặc tả docs/superpowers/specs/2026-09-29-adr-0047-man-hinh-can-ve.md:55 viết "Ngày đón khác ngày đi thì ghi thêm ngày". Chưa chạy thật để xác nhận, nên chỉ nên đưa vào đợt kiểm riêng.
>   - *Hướng sửa gợi ý:* Thêm ngày đón của chặng đi đầu vào dữ liệu tóm tắt đơn (cùng nguồn `chieuDiDau`), rồi để thẻ danh sách và đầu trang đơn hiện ngày đó, ít nhất khi nó khác ngày đi (ví dụ "02/10 · 23:55"). Cần chủ duyệt vì đổi hợp đồng giữa máy chủ và giao diện. Trang chủ giữ theo ngày đi (Q3), có thể thêm ghi chú nhỏ ngày đón khi khác ngày. Nên kiểm luôn biên nhận cho đồng bộ theo đặc tả đã duyệt.
>   - *Bằng chứng (tệp:dòng):* Đường đi cho phần ĐÚNG (thẻ danh sách đơn). (1) Máy chủ chỉ lấy GIỜ của chặng đi đầu, không lấy ngày: `chieuDiDau()` ở src/shared/chang-dua-don.ts:256-260 trả `{ pickupTime, pickupPlace }`, bỏ `pickupDate`. (2) Hợp đồng không có chỗ cho ngày đón: `OrderSummaryTripDto` ở src/shared/contracts.ts:262-266 chỉ có `departDate`, `pickupTime`, `pickupPlace`. `summarizeServices` (src/modules/orders/repository.ts:125) gán `departDate = order_service.depart_date`, còn `pickupTime` dẫn xuất từ chặng (repository.ts:256-259, 394). (3) Giao diện: web/orders.ts:93-94 truyền `departDate` và `pickupTime` vào `orderCard`; web/order-card.ts:96 ghép `${dayMonth(o.departDate)} · ${o.pickupTime}` → đơn đi 03/10 có chặng đón 02/10 23:55 hiện "03/10 · 23:55". (4) Chặng đón tối hôm trước hợp lệ: `NGAY_DON_TRUOC_NGAY_DI = 1` (chang-dua-don.ts:52; câu báo lỗi ở dòng 194 ghi rõ "sớm nhất 1 ngày trước, muộn nhất 7 ngày sau ngày đi"). Cùng công thức còn ở dải tóm tắt đầu trang đơn web/order.ts:391, báo cáo gốc không nêu. Phần Trang chủ chỉ đúng một nửa: máy chủ chọn đơn vào "Hôm nay / Ngày mai / Ngày kia" theo NGÀY ĐI (`chuyenDonTrongNgay`, repository.ts:625-631, `os.depart_date = ?1`), nên đơn đi 03/10 rơi vào "Ngày mai" khi hôm nay là 02/10 (getDashboard repository.ts:680-682); nhưng đây là Q3 do chủ duyệt (xem rào chắn). Đã chạy `node --test src/modules/orders/doc-chang.test.ts`: 4/4 xanh, ca "Chuyến đón hôm nay (Q3: theo ngày đi)" ghim đúng hành vi chọn theo ngày đi, giờ/nơi lấy từ chặng.
>   - *Rào chắn đã thấy:* (a) Phần Trang chủ là thiết kế cố ý, chủ đã trả lời: docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md:1243-1246 (Q3, phương án (a) "giữ theo ngày đi", ghi sẵn cái mất: "khách đón sân bay tối hôm trước hiện ở ngày đi, không ở tối hôm trước"); docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md:61 (chủ: "Đồng ý cả hai"); nhật ký docs/superpowers/plans/2026-09-29-adr-0047-thi-cong-nhat-ky.md:39; chú thích mã repository.ts:620; docs/SYSTEM-DESIGN.md:545 ("GIỮ chọn theo ngày đi (Q3)"). (b) Dòng thẻ đơn "giữ như hiện tại" nằm ở docs/superpowers/specs/2026-09-29-adr-0047-man-hinh-can-ve.md:58 — chỉ là chọn khuôn sẵn, không có chỗ nào cân nhắc riêng việc thẻ danh sách hiện ngày đi cạnh giờ của chặng nên chưa thể coi là quyết định của chủ cho thẻ. (c) Nơi hiển thị đúng ngày đón vẫn có: khối "Đưa đón" ở trang đơn dùng ngày của từng chặng (web/order.ts:180,188 `${ngay} · ${l.pickupTime}`); Điều phối xe lấy lịch theo ngày đón của chặng (src/modules/van-chuyen/dieu-phoi-lenh.ts:392, `c.pickupDate === ngay`; docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:145). (d) Trang chủ chỉ lấy đơn ĐÃ XÁC NHẬN (repository.ts:627 `o.status = 'confirmed'`) và không ghép ngày với giờ: `todayRow` (web/home.ts:123,142) chỉ hiện giờ, ngày nằm ở nhãn tab.

<a id="BH-03"></a>
### 27. BH-03 · Tìm đơn theo SĐT/tên lệch cách gõ (mở rộng mục 10)

- **Vai:** Bán hàng
- **Loại:** khó dùng
- **Mức:** Trung bình (giữ nguyên sau kiểm)
- **Tình trạng:** Mới + trùng một phần lỗi đã biết
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng. Mức: TRUNG BÌNH. Loại: khó dùng. **TRÙNG (10)**, thêm một chi tiết **MỚI**: kiểu bỏ dấu cũ/mới.
- Tái hiện: `GET /api/orders?q=…`.
- Thấy: `0912345678` ra đơn nhưng `0912 345 678` và `+84912345678` không ra; `905123456` không ra đơn lưu SĐT dạng `+84 905 123 456`/`0905.123.456`/`84 905 123 456`; `binh`/`tran van` không ra "Trần Văn Bình" (đã TRÙNG). Chi tiết mới: `Hoà` ra đơn tên "Hoà" nhưng `Hòa` (cách bỏ dấu phổ biến khác) **không ra** (`bh/a3.mjs`).
- Đề xuất: khi sửa mục 10, chuẩn hoá cả vị trí dấu thanh (hoà/hòa, thuý/thúy) và chỉ so chữ số cho SĐT.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Trung bình (trải nghiệm). Tìm không ra đơn làm nhân viên tưởng đơn chưa có (nguy cơ lập đơn trùng) nhưng không sai tiền, không lộ hay mất dữ liệu, và còn đường vòng (gõ đúng dạng, duyệt danh sách, bộ lọc). Nằm ở ranh giới TRUNG BÌNH/THẤP, giữ TRUNG BÌNH vì SĐT được phép lưu nhiều dạng nên lỗi tìm trượt xảy ra thường xuyên.
>   - *Chính xác hoá:* Mô tả đúng về hành vi; chỉ cần bổ sung và làm rõ: (a) báo cáo gốc không nêu tệp:dòng — bổ sung src/modules/orders/repository.ts:505-508 (LIKE thô), src/modules/orders/index.ts:628 (q chỉ trim), src/modules/orders/rules.ts:113-117 và :90 (SĐT lưu thô, cho phép khoảng trắng/chấm/gạch/+). (b) Báo cáo ghi mã HEAD dfee4a8c "bản 1.77" còn đợt kiểm này giao là bản 1.76; chưa đối chiếu, không ảnh hưởng kết luận vì đoạn mã không đổi. (c) "kiểu bỏ dấu cũ/mới" chính xác hơn là vị trí dấu thanh khác nhau (hoà/hòa, thuý/thúy) nên hai chuỗi khác điểm mã; tiêu chí nghiệm thu của G12 (lo-trinh.md:132) chỉ ghi "không dấu, +84, 6 số cuối" nên chưa phủ chi tiết MỚI này. (d) Chi tiết thêm tôi tự kiểm trên SQLite: LIKE chỉ bỏ phân biệt hoa/thường với ký tự ASCII nên "BÌNH" hay "HOÀ" (chữ hoa có dấu) cũng không ra "Bình"/"Hoà" — báo cáo gốc chưa nêu. (e) Phần đã TRÙNG mục 10 được xác nhận bằng lo-trinh.md:26, :132; nhưng các script bh/a3.mjs nằm ngoài repo nên tôi không chạy lại được, kết luận dựa trên mã và phép thử LIKE độc lập. Môi trường kiểm: node:sqlite trong Node 22 (không phải D1 thật; hành vi LIKE mặc định của SQLite giống nhau).
>   - *Hướng sửa gợi ý:* Chuẩn hoá cả hai phía khi tìm đơn: so tên/nhãn trên dạng đã bỏ dấu và gộp vị trí dấu thanh (dùng chung một hàm thuần với tìm người ở src/shared/assignee-pick.ts), còn SĐT thì so theo chuỗi chữ số đã đưa về một dạng (bỏ 0/84/+84 đầu), giống cách route hồ sơ khách. Vì SQLite không có hàm bỏ dấu nên cần cột khoá tìm điền khi ghi (chạm dữ liệu: cần migration mới, chủ duyệt theo CLAUDE.md §3) hoặc lọc phía ứng dụng trên tập đã giới hạn; nên thêm ca hoà/hòa, chữ hoa có dấu và 6 số cuối vào tiêu chí nghiệm thu G12.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả (đọc mã thật, nhánh hiện tại): 1) Giao diện không chuẩn hoá gì: web/orders.ts:57 `params.set("q", qInput.value.trim())`; ô tìm trên Trang chủ và thanh công việc chỉ `encodeURIComponent(value.trim())` rồi chuyển sang /orders?q= (web/home.ts:544, web/shell.ts:475). 2) Máy chủ: src/modules/orders/index.ts:628 `q: (url.searchParams.get("q") ?? "").trim().slice(0, 100)` — chỉ cắt khoảng trắng đầu/cuối, không bỏ dấu, không tách chữ số (khác route hồ sơ src/modules/parties/index.ts:565-571 vốn có `digits = q.replace(/\D/g, "")` và `phoneLike`). 3) SQL: src/modules/orders/repository.ts:505-508 `like = %${escapeLike(opts.q)}%` rồi `o.order_code LIKE ? ESCAPE '\\' OR o.customer_name LIKE ? ... OR o.customer_phone LIKE ? ... OR s.label LIKE ?` — so chuỗi con thô trên cột gốc; không có cột khoá tìm đã chuẩn hoá nào (grep search_key/phone_digits trong migrations và src: không có). 4) SĐT lưu thô: src/modules/orders/rules.ts:113-117 chỉ gộp nhiều khoảng trắng thành một (`replace(/\s+/g, " ")`), PHONE_RE ở rules.ts:90 cho phép cả khoảng trắng, dấu chấm, gạch ngang và tiền tố +. Vậy cột customer_phone chứa nhiều dạng khác nhau (0912345678, 0912 345 678, +84 905 123 456, 0905.123.456…), còn ô tìm so khớp chuỗi con đúng từng ký tự. Tự chạy lại hành vi LIKE của SQLite bằng node:sqlite trong bộ nhớ (không chạm repo): dữ liệu "Hoà"/0912345678, "Trần Văn Bình"/"+84 905 123 456", "Nguyễn Thuý"/"0905.123.456". Kết quả số dòng khớp: "Hoà"=1, "Hòa"=0, "0912345678"=1, "0912 345 678"=0, "+84912345678"=0, "905123456"=0, "binh"=0, "tran van"=0, "Bình"=1, "bình"=1, "BÌNH"=0, "HOÀ"=0, "Thuý"=1, "Thúy"=0. Tất cả khớp mô tả BH-03. Đã biết và có lịch sửa: docs/superpowers/plans/2026-10-02-khac-phuc-audit-00-lo-trinh.md:26 và :132 (mục 10 "tìm hụt khi gõ không dấu", gói G12, lượt 7, nghiệm thu "tìm không dấu, +84, 6 số cuối ra đúng đơn"); docs/superpowers/specs/2026-10-02-khac-phuc-audit-goc-va-phuong-an.md:61 gọi là "việc nhỏ". Chưa thi công. Bài test hiện có chỉ khoá trường hợp gõ đúng 10 chữ số liền (src/modules/orders/loc-don-route.test.ts:84, xem-don-theo-quyen.test.ts:326).
>   - *Rào chắn đã thấy:* Không có rào chắn nào chặn lỗi này. Không thấy ADR/đặc tả nào quyết định cố ý "tìm đơn chỉ so khớp chính xác ký tự" (grep ADR-0015, ADR-0067, đặc tả Đợt D, Trang chủ mới, phân tích góp ý: chỉ nói ô tìm dùng lại tham số q, ADR-0067 dòng 52 ghi "ô tìm tự do khớp cả tên khách, SĐT, mã đơn"). Ngược lại lộ trình khắc phục đã xếp việc này là khiếm khuyết cần sửa (G12, lượt 7). Chỉ có đường vòng: gõ đúng dạng đã lưu, gõ SĐT 10 số liền, hoặc duyệt danh sách và dùng bộ lọc ngày/trạng thái/dịch vụ/người lập. Ở nơi khác hệ thống đã có tiền lệ chuẩn hoá (src/shared/assignee-pick.ts:23-25 bỏ dấu cho tìm người; route hồ sơ khách tìm SĐT theo chữ số), nên chỉ riêng tìm đơn bị bỏ sót.

---

## 5. ÍT NGHIÊM TRỌNG

### Nhóm: Hạ từ Trung bình sau kiểm độc lập (chủ nên xem lại)

<a id="VP-07"></a>
#### 28. VP-07 · Ghi đè giá danh mục không trần, không xác nhận, áp ngay.

- **Vai:** Quản trị
- **Loại:** sai nghiệp vụ (tiền)
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Ghi đè giá danh mục không trần, không xác nhận, áp ngay.** `PATCH /api/catalog/XE16 {prices:{adult:4500000000}}` → 200; form lập đơn của Bán hàng (`/api/catalog/for-order`) lập tức thấy 4.500.000.000 ₫/người lớn. Giá 0 ₫ cũng nhận.
- Tái hiện: `cat1.mjs` (đã xoá ghi đè sau khi thử).
- Mong đợi: trần hợp lý hoặc hỏi lại khi giá lệch quá xa giá Sheet (ví dụ > 3 lần hoặc = 0).
- Đề xuất: thêm bước xác nhận khi giá mới lệch nhiều so với giá Sheet.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (tiền). Máy chủ chỉ làm đúng điều tài khoản Quản trị đã nhập, và hành động này có nhật ký trước→sau, đảo được tức thì, không đụng đơn đã lập; rủi ro thật chỉ là gõ nhầm số 0 trên giá rồi người lập đơn không để ý trong lúc giá sai còn hiệu lực. Đó là thiếu lưới an toàn cho lỗi gõ của người đáng tin, không phải sai tiền hay vượt quyền; có thể nâng lên TRUNG BÌNH nếu chủ coi giá niêm yết sai là rủi ro đáng chặn.
>   - *Chính xác hoá:* Có ba chỗ cần sửa chữ trong báo cáo gốc. (1) "không trần" chưa đúng: có trần 100 tỷ VNĐ (`MAX_AMOUNT_VND`, order-lines.ts:13, áp ở catalog/index.ts:84); điều đúng là không có trần hợp lý nghiệp vụ và không đối chiếu với giá Sheet — 4,5 tỷ (~5.294 lần giá Sheet ví dụ) vẫn qua. (2) "Giá 0 ₫ cũng nhận" đúng về hành vi nhưng 0 là giá hợp lệ ở nguồn (Sheet cũng nhận 0; thông lệ miễn phí em bé); chỉ nên cảnh báo khi giá hiệu lực 0 thay cho giá Sheet khác 0, không cấm. (3) "áp ngay" đúng (không đệm), nhưng nên ghi thêm các giảm nhẹ báo cáo bỏ sót: có nhật ký `catalog_overridden` với giá trước/sau và giá Sheet, bỏ ghi đè đảo được ngay, đơn đã lập không đổi vì lưu giá chốt. Tệp tái hiện `cat1.mjs` và việc "đã xoá ghi đè sau khi thử" không kiểm được từ mã.
>   - *Hướng sửa gợi ý:* Ở máy chủ, khi giá ghi đè lệch quá một ngưỡng so với giá Sheet (hoặc bằng 0 trong khi Sheet có giá) thì trả mã yêu cầu xác nhận, và chỉ ghi khi người gọi gửi cờ xác nhận rõ ràng; giao diện "Lưu ghi đè" hiện hộp xác nhận kèm giá cũ → giá mới. Ngưỡng và hành vi cần chủ chốt (chạm tiền và hợp đồng route), nên đi qua ADR hoặc dòng đặc tả, rồi thêm test cạnh `rules.test.ts` và ca e2e trong `tests/e2e/catalog.mjs`.
>   - *Bằng chứng (tệp:dòng):* Đường đi dựng lại từ mã (không chạy máy chủ): 1) Điểm vào: `PATCH /api/catalog/:code` khai cổng "admin" tại /home/user/tourdaobooking/src/modules/catalog/index.ts:302, chỉ hỏi `can(staff, "admin.manage")` (dòng 303; ma trận `src/shared/permissions.ts:125` = Quản trị và Toàn quyền). 2) Kiểm đầu vào `parsePatch` (index.ts:79-86): mỗi giá chỉ cần là số nguyên an toàn, `v >= 0` và `v <= MAX_PRICE`. `MAX_PRICE` là bí danh của `MAX_AMOUNT_VND = 100_000_000_000` (index.ts:11; `src/shared/order-lines.ts:13`, chú thích "chặn số phi lý, giữ mọi phép cộng/nhân trong số nguyên an toàn"). Vậy 4.500.000.000 (4,5 tỷ) và 0 đều qua. Không có phép so với giá Sheet nào (không so tỷ lệ, không cờ "đã xác nhận"). 3) Luật thuần `patchOverride` (src/modules/catalog/rules.ts:104-120) chỉ chụp `base` = giá Sheet lúc ghi đè đầu tiên (dòng 115) rồi ghi `next.prices[c] = v`; không có nhánh từ chối. `saveOverride` (src/modules/catalog/repository.ts:154-167) upsert `catalog_override` + dòng nhật ký trong một `db.batch` — ghi ngay, không bước hai. 4) Áp ngay: `GET /api/catalog/for-order` (index.ts:141-144) gọi `catalogForOrderForm` (index.ts:104-121) → `loadAll` → `toEffective` (rules.ts:133-136) → `applyOverride` (rules.ts:84-99) thay giá Sheet bằng giá ghi đè. Không thấy bộ nhớ đệm nào ở module catalog (grep "cache" trong src/modules/catalog/*.ts không có kết quả ngoài test). Máy chủ lập đơn cũng dùng giá hiệu lực này (`ctx.catalog.get(code)` ở src/modules/orders/service-rules.ts:202-205, `buildLines` ở dòng 207). 5) Giao diện Quản trị cũng không hỏi lại: nút "Lưu ghi đè" ở web/catalog.ts:447-469 gọi thẳng PATCH; `confirm(...)` chỉ có ở "Bỏ ghi đè" (web/catalog.ts:119, 160) và ở `sync_guard` (web/catalog.ts:751). Tự chạy lại một phép thử luật thuần (tệp tạm ở thư mục scratchpad, không nằm trong repo): `node --test .../scratchpad/vp07.test.ts` → pass. Xác nhận `patchOverride(sheet, null, {prices:{adult:4_500_000_000}})` rồi `applyOverride` cho giá hiệu lực 4.500.000.000 (gấp ~5.294 lần giá Sheet 850.000 trong ví dụ thử), `toEffective(...).visible === true`; và giá 0 cũng thành giá hiệu lực. Chưa tự gọi HTTP thật (đề bài cấm chạy máy chủ), nên mã 200 và con số 4,5 tỷ ở form Bán hàng là suy ra từ mã, khớp mô tả.
>   - *Rào chắn đã thấy:* Có rào một phần, không đủ chặn nhập sai chữ số: - Trần cứng 100 tỷ VNĐ ở parsePatch (src/modules/catalog/index.ts:84 ← src/shared/order-lines.ts:13) cộng ràng buộc số nguyên không âm; tuy nhiên đây là trần chống tràn số, không phải trần hợp lý nghiệp vụ. - Chỉ Quản trị / Toàn quyền gọi được (`admin.manage`, index.ts:303; permissions.ts:125). - Có nhật ký `catalog_overridden` ghi "giá … A → B (Sheet: C)" (index.ts:319-321; nhãn ở src/shared/audit-actions.ts:139) và đảo được bằng `DELETE /api/catalog/:code/override` (index.ts:344-351) hoặc nút "Bỏ ghi đè". - Màn Quản trị hiện dấu ✎ "Giá ghi đè bởi Admin" kèm "Sheet: <giá gốc>" cạnh giá (web/catalog.ts:87) — thấy lệch bằng mắt nhưng không chặn. - Đơn đã lập không bị ảnh hưởng: dòng tiền lưu giá đã chốt `order_item.unit_price/catalog_price` (docs/SPEC-tourdao-sales.md:167); dịch vụ đã lưu của chính đơn giữ bản chụp (service-rules.ts:195-197). - Rào khi giá đổi giữa lúc xem form và lúc lưu: `catalog_changed` (service-rules.ts:210-219) — không phải rào cho giá sai từ đầu. - Giá 0 hợp lệ ở nguồn: Sheet cũng nhận 0 (src/modules/catalog/sheet.ts:20-24, regex `\d{1,12}`) và `buildLines` cho phép đơn giá 0 (service-rules.ts:248). - Thiết kế cố ý: spec §2.4-6 (docs/SPEC-tourdao-sales.md:156, 165) chỉ nói "Admin có thể ghi đè giá/ẩn", không đòi trần hay bước xác nhận; không thấy ADR nào bàn về ngưỡng lệch. Cũng không có test nào khoá việc "không có trần/xác nhận" (tests/e2e/catalog.mjs:241-245 chỉ kiểm âm → 400, chuỗi → 400, loại khách lạ → 400, và 800.000 → 200).

<a id="BH-05"></a>
#### 29. BH-05 · Thực tập/Đối tác không tra được hồ sơ khách ⇒ mỗi lần "Tạo hồ sơ mới" là một hồ sơ trùng

- **Vai:** Thực tập, Đối tác
- **Loại:** sai (dữ liệu)
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Hệ quả quyết định đã duyệt (ADR-0014, ADR-0011); phần mới là hồ sơ trùng khi gửi hai đơn cùng khách
- **Hướng xử lý:** Cần chủ / ADR nếu muốn đổi
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Thực tập, Đối tác. Mức: **TRUNG BÌNH**. Loại: sai (dữ liệu). **MỚI** (mục 13 cũ là trùng do gửi lặp; đây là gốc khác). Phần Đối tác liên quan **G6 / DT02**.
- Mô tả: form gọi `GET /api/parties/lookup` mà hai vai này bị 403, nên hiện "Không tra được hồ sơ — vẫn lưu đơn được, chỉ chưa gắn khách." kèm nút "Tạo hồ sơ mới". Bấm nút đó với SĐT đã có hồ sơ sẽ tạo thêm hồ sơ khách mới mỗi lần.
- Tái hiện: Bán Hàng B tạo hồ sơ "Phạm Văn Cũ" 0909 000 111; Thực tập lập 2 đơn với `newBooker {fullName:"Phạm Văn Cũ", phone:"0909000111"}`.
- Thấy: 201 ×2, `bookerPartyId` khác nhau (3ccfd458…, 94b00eb1…); tra số 0909000111 ra 3 hồ sơ "Phạm Văn Cũ" (`bh/a14.mjs`). Giao diện: `pw/s20.mjs`, ảnh `40-tts-booker.png`, `40-dt-booker.png`.
- Đề xuất: với vai không được tra, máy chủ tự gắn hồ sơ trùng khớp tên+SĐT (hoặc không cho tạo mới, để văn phòng gắn sau); câu báo không nên nghe như lỗi.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (dữ liệu). Việc tạo hồ sơ khách trùng là hệ quả của quyết định đã duyệt (không cho Đối tác/Thực tập tra hồ sơ), phải do người dùng chủ động bấm, không mất tiền, không lộ hay mất dữ liệu, và Quản trị gộp được qua danh sách nghi trùng. Chỉ làm bẩn danh bạ và thêm việc dọn cho văn phòng, nên thấp hơn mức TRUNG BÌNH người tìm gán.
>   - *Chính xác hoá:* Cơ chế đúng, nhưng ba chỗ trong báo cáo gốc cần chỉnh: 1) "Loại: sai (dữ liệu)" và "MỚI" là nói quá. Việc Đối tác không tra được là quyết định của chủ (ADR-0014 dòng 19, 69, 77). Việc tạo hồ sơ mới khi lập đơn là ngoại lệ đã duyệt (ADR-0011 điều 1). ADR-0014 dòng 69 đã ghi sẵn "lập đơn vẫn tạo hồ sơ khách mới". Với Thực tập, ô `party.view` none nằm trong bảng đích của đặc tả mô hình vai. Kế hoạch docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/ban-hang.md:31 cũng đã ghi nhận hiện tượng "Thực tập không tra được hồ sơ" (ở đó ghi "Chưa kiểm"). Phần mới thật sự chỉ là hệ quả hồ sơ trùng khi gửi hai đơn cùng khách. 2) "Bấm nút đó… sẽ tạo thêm hồ sơ mới mỗi lần" thiếu điều kiện: chỉ khi người dùng chủ động bấm "Tạo hồ sơ mới". Không bấm thì đơn lưu "Chưa gắn hồ sơ khách" (web/booker-picker.ts:38). 3) Ghi "liên quan G6/DT02" dễ gây hiểu nhầm. G6 là gốc khác: đơn Đối tác tạo hồ sơ vai CUSTOMER thay vì quan hệ CUSTOMER_OF (src/modules/orders/service.ts:396, docs/superpowers/specs/2026-10-02-khac-phuc-audit-goc-va-phuong-an.md dòng 31, 52). G6 vẫn đúng nhưng không phải lý do tạo trùng. Báo cáo cũng thiếu tệp:dòng gốc. Các điểm cần dẫn: web/booker-picker.ts:62-65; src/modules/parties/index.ts:525-526; src/shared/permissions.ts:122 và :264; src/shared/router.ts:363; src/modules/orders/index.ts:685; src/modules/orders/service.ts:391-401; src/modules/parties/repository.ts:320-337. Dòng "src/modules/parties/index.ts:368" trong kế hoạch hướng dẫn theo vai đã cũ, nay là :525.
>   - *Hướng sửa gợi ý:* Không sửa mã trước khi chủ quyết, vì chạm quyền và dữ liệu (CLAUDE.md §3). Hướng đề xuất: ghi hệ quả "hồ sơ khách có thể trùng khi lập đơn bằng tài khoản không tra được" vào ADR-0014 hoặc đặc tả mô hình vai, và coi danh sách nghi trùng của Quản trị là đường dọn chính thức. Có thể đổi câu báo ở web/booker-picker.ts cho hợp vai (bỏ giọng "không tra được = lỗi"). Không nên cho máy chủ tự gắn hồ sơ khớp tên và SĐT như báo cáo đề xuất, vì đơn trả lại tên hồ sơ nên Đối tác dò được ai là khách của công ty, phạm vào quyết định "không tra được" của chủ. Nếu chủ muốn chặn hẳn thì cần ADR mới.
>   - *Bằng chứng (tệp:dòng):* Đã dựng lại đường đi từ điểm vào đến kết quả bằng mã thật (không chạy máy chủ, không gọi mạng). 1) Hai vai bị chặn tra hồ sơ. `GET /api/parties/lookup` khai cổng "office" (src/modules/parties/index.ts:525). Cổng "office" chỉ nhận SALES, ACCOUNTING, ADMIN, SUPER_ADMIN (src/shared/permissions.ts:264). Cổng này kiểm ở src/shared/router.ts:363 và trả 403 "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này." Thân route còn hỏi `can(staff,"party.view")` (index.ts:526). Ô `party.view` là none cho cả INTERN và PARTNER (permissions.ts:122, thứ tự cột SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN…). Tôi chạy thử `node -e` gọi `can()` và `isOffice()` thật: INTERN và PARTNER cho `party.view=false`, `isOffice=false`, `order.create=true`; SALES cho `party.view=true`. 2) Giao diện hiện câu báo và nút. web/booker-picker.ts:62 gọi `api('/api/parties/lookup?...')`. Lỗi 403 rơi vào `catch` (web/api.ts chỉ xử lý riêng 401 và 409 `dang_xu_ly`). Dòng 65 dựng đúng câu "Không tra được hồ sơ — vẫn lưu đơn được, chỉ chưa gắn khách." kèm `newButton()` ("Tạo hồ sơ mới", dòng 42). Bấm nút chỉ kiểm tên không rỗng (dòng 44) rồi `choose({kind:"new"})`. Khối này luôn gắn vào form (web/order-form.ts:59-60), không ẩn theo quyền. 3) Máy chủ nhận `newBooker` không hỏi quyền hồ sơ. `POST /api/orders` chỉ hỏi `can(staff,"order.create")` (src/modules/orders/index.ts:667), rồi `resolveBooker(...)` (index.ts:685). Nhánh `kind:"new"` ở src/modules/orders/service.ts:391-401 gọi `newPersonStatements` (src/modules/parties/repository.ts:320-337) để chèn hồ sơ cá nhân mới, SĐT chính và vai CUSTOMER cùng lô với đơn. Không có bước dò trùng SĐT hay tên nào ở đường ghi. Vì vậy mỗi lần gửi là một hồ sơ mới (id ngẫu nhiên `crypto.randomUUID()`), khớp mô tả "201 ×2, hai bookerPartyId khác nhau". 4) Phía văn phòng, tra sẽ liệt kê mọi hồ sơ cùng số (`findPartiesByPhone`, index.ts:529). Ba hồ sơ trùng sẽ hiện thành ba dòng. Điều này khớp "tra ra 3 hồ sơ". Tôi không tự chạy lại được kịch bản bh/a14.mjs hay pw/s20.mjs (cần máy chủ, mà đề bài cấm), nên các mã hồ sơ cụ thể (3ccfd458…, 94b00eb1…) và ảnh chưa kiểm. Cơ chế thì đọc mã đủ để kết luận.
>   - *Rào chắn đã thấy:* Không có rào nào chặn được việc tạo trùng. Nhưng có bốn điều khiến phát hiện này không phải "lỗi mã" thuần: (a) Thiết kế cố ý đã duyệt, phần không tra được. ADR-0014 dòng 19 ghi nguyên văn quyết định của chủ: "CTV không tra được hồ sơ khách theo SĐT". Bảng điều 2 dòng 69 ghi `party.view`/`party.write` của PARTNER là none và nói thêm "lập đơn vẫn tạo hồ sơ khách mới trong cùng batch qua ngoại lệ ADR-0011". Điều 3 (dòng 77) chặn thẳng ở mức route. Đặc tả docs/superpowers/specs/2026-09-22-tai-khoan-doi-tac-super-admin.md dòng 13 và tiêu chí 1 (dòng 37) bắt buộc việc tra này bị từ chối. Bài kiểm tests/audit/doi-tac.test.mjs ghim 403 cho PARTNER. Với Thực tập, đặc tả mô hình vai §5 (docs/superpowers/specs/2026-09-24-mo-hinh-nguoi-vai-quyen-design.md:165) ghi `party.view`/`party.write` = none cho cột INTERN; ADR-0018 điều 6 nói giai đoạn 1 INTERN "tạm hẹp". (b) Ngoại lệ tạo hồ sơ khi lập đơn đã duyệt. ADR-0011 điều 1 cho phép route đơn tạo hồ sơ cá nhân mới + vai CUSTOMER cùng lô với đơn, cho "người có quyền lập/sửa đơn đó" (gồm Thực tập, Đối tác). (c) Phải do người dùng chủ động bấm. Nếu không bấm "Tạo hồ sơ mới" thì đơn lưu với chip "Chưa gắn hồ sơ khách" (web/booker-picker.ts:38, `{kind:"none"}`), không sinh hồ sơ. (d) Có đường dọn. ADR-0068 có danh sách "Hồ sơ nghi trùng" (GET /api/parties/duplicates, `admin.manage`, src/modules/parties/index.ts:534; luật src/shared/ho-so-trung.ts `capNghiTrung` bắt cặp cùng SĐT và cùng tên, xếp cặp nhiều lý do lên đầu). Quản trị gộp được, và việc gộp ghi lại `orders.booker_party_id` (src/modules/orders/nguoi-dat-gop-repo.ts:21-23). Không mất dữ liệu. Căng thẳng chưa ai giải: ADR-0001 mục 8 viết giao diện "bắt buộc hiện danh sách hồ sơ trùng số… không tự tạo hồ sơ thứ hai âm thầm". Với Thực tập và Đối tác điều này không thực hiện được, và ADR-0014 không bàn hệ quả trùng. Đây là khoảng trống tài liệu, không phải mã lệch khỏi tài liệu.

<a id="VP-08"></a>
#### 30. VP-08 · Hai đại lý (tổ chức) cùng MST tạo được, không ai bắt, và không gộp được.

- **Vai:** Quản trị
- **Loại:** sai nghiệp vụ
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Khoảng trống đã hoãn (P-3 ngày 21/9, ADR-0068)
- **Hướng xử lý:** Cần chủ (đang hoãn)
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Hai đại lý (tổ chức) cùng MST tạo được, không ai bắt, và không gộp được.** Tạo "Đại lý Sao Biển" và "Sao Bien Travel" cùng MST 4201234567 → cả hai 201. `GET /api/parties/duplicates` không liệt kê cặp này (chỉ bắt theo tên/SĐT cá nhân). Gộp tổ chức bị chặn "chưa gộp được hồ sơ tổ chức".
- Tái hiện: `b3.mjs`.
- Đề xuất: cảnh báo trùng MST khi tạo, đưa MST vào danh sách trùng.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (dữ liệu). Không sai tiền, không mất hay lộ dữ liệu, không vượt quyền, không chặn việc chính. Hệ quả duy nhất là hồ sơ đại lý bị nhân đôi. MST khách chưa được dùng ở đâu (chưa có xuất hoá đơn theo tổ chức), và chủ đã hoãn có chủ ý. Có đường vòng là tắt hồ sơ trùng và cảnh báo SĐT. Nên coi là khoảng trống chức năng đã hoãn, không phải lỗi. Mức này sẽ lên TRUNG BÌNH khi có xuất hoá đơn hoặc công nợ theo đại lý, vì lúc đó lịch sử bị chia đôi và không gộp lại được.
>   - *Chính xác hoá:* Mô tả về hành vi đúng, nhưng cách gọi là "sai nghiệp vụ" và đề xuất chưa nêu bối cảnh, cần sửa như sau. (a) Phần "không gộp được" là phạm vi đã duyệt của ADR-0068, không phải lỗi. (b) Phần "không ai bắt trùng MST" là mục P-3 chủ đã hoãn ngày 2026-09-21, kèm điều kiện xem lại. (c) Báo cáo chưa nêu rằng tạo hồ sơ vẫn cảnh báo trùng SĐT cho tổ chức. (d) Báo cáo gốc chỉ trỏ `b3.mjs`, không có tệp:dòng; bằng chứng tệp:dòng đã bổ sung ở trên. (e) Phần "tên" trong câu "chỉ bắt theo tên/SĐT cá nhân" đúng, nhưng chính xác hơn là lọc `party_kind = 'PERSON'` ở `repository.ts:811-816`, nên tổ chức trùng tên cũng không được liệt kê. Không sai số liệu nào khác.
>   - *Hướng sửa gợi ý:* Không nên coi là lỗi cần vá ngay; hạ xuống mục nợ đã hoãn trong sổ P-3 và theo dõi cùng điều kiện "xuất hoá đơn / công nợ theo tổ chức". Nếu chủ muốn làm sớm thì cần ADR mới (chạm dữ liệu): thêm cảnh báo mềm khi tạo hoặc sửa tổ chức trùng MST đang dùng, đưa cặp trùng MST vào danh sách nghi trùng, và quyết định riêng về việc có mở gộp hồ sơ tổ chức hay không.
>   - *Bằng chứng (tệp:dòng):* Hành vi kỹ thuật đúng như mô tả, đọc từ mã (không chạy máy chủ). (1) Tạo hai tổ chức cùng MST không bị chặn. - Cột `tax_code` không có ràng buộc duy nhất: `migrations/0011_parties.sql:31` chỉ có CHECK độ dài 10–14. `grep tax` trên toàn bộ `migrations/` chỉ ra 0002, 0011, 0030 và không có chỉ mục nào trên `tax_code`. - Luật kiểm đầu vào `src/modules/parties/rules.ts:193-198` chỉ kiểm dạng số (`/^\d{10}(\d{3}|-\d{3})?$/`), không so với hồ sơ khác. - Route `POST /api/parties` ở `src/modules/parties/index.ts:881-898` gọi `validatePartyCreate`, rồi `newOrganizationStatements`, rồi `db.batch` và trả 201. Không có truy vấn tìm trùng nào. - Toàn bộ `src/` không có chỗ nào tra hồ sơ theo `tax_code` (grep). Màn tạo hồ sơ `web/parties.ts:143-185` chỉ cảnh báo trùng theo số điện thoại (`/api/parties/lookup?phone=`). (2) `GET /api/parties/duplicates` không liệt kê cặp tổ chức. - `src/modules/parties/index.ts:534-554` chỉ dùng `personsForMatch` và `openPersonPhones`. - Hai câu SQL nằm ở `src/modules/parties/repository.ts:811-816`. Cả hai đều có `p.party_kind = 'PERSON'`. - `capNghiTrung` (`src/shared/ho-so-trung.ts:24-57`) chỉ so tên đã chuẩn hoá, SĐT liên hệ và SĐT đăng nhập, không có MST. (3) Gộp tổ chức bị chặn đúng chữ trong báo cáo. - `src/modules/parties/gop.ts:49` có câu "Chỉ gộp được hai hồ sơ cá nhân (chưa gộp được hồ sơ tổ chức)." - Điều kiện chặn ở `gop.ts:91`: `if (a.kind !== "PERSON" || b.kind !== "PERSON") chan.push(chanCo("merge_not_person"))`. - Có bài khoá ở `src/modules/parties/gop-route.test.ts:157` và `gop.test.ts:98`. Cả hai điểm "không bắt trùng MST" và "không gộp được tổ chức" là quyết định có ghi nhận, không phải sót. - `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md:80`, `:193`, `:273` (mục P-3): "Trùng MST: HOÃN — chủ dự án (2026-09-21): CRM lập đơn, không xuất hoá đơn, MST không phải khoá nhận dạng. Xem lại nếu N3 xuất hoá đơn theo hồ sơ tổ chức". - `docs/superpowers/plans/2026-09-21-doi-chieu-oracle-tca-ke-hoach-hanh-dong.md:13`: chủ chốt "ok chốt", P-3 (MST) hoãn. - ADR-0068 (accepted 2026-10-01): `docs/adr/ADR-0068-gop-ho-so-ca-nhan.md:21` ghi "Không gộp được: người với tổ chức"; `:73` ghi "Tổ chức (đại lý, nhà xe) chưa gộp được". Đặc tả `docs/superpowers/specs/2026-09-30-gop-ho-so/dac-ta.md:16` liệt "gộp tổ chức" vào mục "Ngoài phạm vi".
>   - *Rào chắn đã thấy:* Không có rào chắn nào chặn tạo hoặc phát hiện trùng MST. Những gì tìm thấy là quyết định thiết kế cố ý và các rào một phần: - P-3 (trùng MST) được chủ hoãn 2026-09-21; điều kiện xem lại là "N3 xuất hoá đơn theo hồ sơ tổ chức". Tài liệu này là bản NHÁP của báo cáo đối chiếu, nhưng lời chủ được ghi lại cả ở kế hoạch hành động. - ADR-0068 đã duyệt loại tổ chức khỏi chức năng gộp; mã chặn `merge_not_person`. - Tạo hồ sơ vẫn cảnh báo trùng theo SĐT cho cả tổ chức: `GET /api/parties/lookup` không lọc theo loại hồ sơ, giao diện ở `web/parties.ts:166-181`. Vì vậy hai đại lý cùng SĐT vẫn được cảnh báo, chỉ riêng trùng MST thì không. - Đường vòng cho phần "không gộp được": tắt hồ sơ trùng bằng `PUT /api/parties/:id` với `active=false`, hoặc chọn đúng hồ sơ khi lập đơn. - Không có chỗ nào đọc MST của tổ chức khách để ra quyết định (ngoài MST công ty chủ). MST hiện chỉ là dữ liệu hiển thị và sửa trong hồ sơ.

<a id="VP-06"></a>
#### 31. VP-06 · Ngày phát sinh lần thu không có cận dưới, và màn đơn hiện ngày không có năm.

- **Vai:** Kế toán
- **Loại:** sai nghiệp vụ
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Ghi lùi ngày là tính năng cố ý; chờ khoá kỳ ADR-0080
- **Hướng xử lý:** Cần chủ chốt ngưỡng; thêm hiển thị năm: sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

**Ngày phát sinh lần thu không có cận dưới, và màn đơn hiện ngày không có năm.** Kế toán ghi lần thu ngày 2024-01-01 cho đơn lập 02/10/2026 → 201. Trên trang đơn dòng này hiện "01/01 · Trả trước — 1.000 ₫" (không năm), nên lẫn với 01/01/2027.
- Tái hiện: `kt2.mjs` ("KT thu old date o1" 201); ảnh `kt-m-order_id_75c139d8-….png`.
- Mong đợi: không trước ngày lập đơn (hoặc cảnh báo), ngày hiện có năm khi khác năm hiện tại.
- Đề xuất: kiểm `ngayPhatSinh ≥ ngày lập đơn − N ngày` ở máy chủ; hiển thị dd/mm/yyyy.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (trải nghiệm). Ngày phát sinh không tham gia phép tính tiền. `conLai`, số dư và các kiểm tra "đã thu đủ" không đọc ngày, nên không sai số tiền. Chỉ Kế toán/Toàn quyền, người đã được cấp quyền ghi sổ, ghi lùi ngày được, và có đường sửa bằng dòng đảo. Rủi ro lớn nhất (ghi vào tháng đã chốt) sẽ do khoá kỳ ADR-0080 xử lý. Phần còn lại là màn hình thiếu năm khiến Kế toán dễ đọc nhầm hoặc không thấy lỗi gõ nhầm năm, thuộc loại trải nghiệm.
>   - *Chính xác hoá:* Phần đúng: không có cận dưới, và màn đơn hiện ngày không có năm. Phần cần chỉnh: 1. "Sai nghiệp vụ" quá mạnh. Kế toán ghi lùi ngày là tính năng cố ý (ADR-0026, NT-S8, bài `lo-ghi.test.ts:95-102`). Việc thiếu cận dưới thuộc vùng chờ khoá kỳ ADR-0080 (đã duyệt, chưa thi công), không phải lỗ mới. 2. "Mong đợi: không trước ngày lập đơn" chưa chắc đúng nghiệp vụ. Khách có thể chuyển khoản cọc trước hôm nhân viên lập đơn, và đợt dữ liệu cũ (`0045:167-176`) cũng lấy ngày lập đơn làm ngày phát sinh. Báo cáo gốc đã ghi "− N ngày", nhưng N chưa có cơ sở trong đặc tả nào. Muốn chặn thì cần chủ chốt N, vì chạm luật tiền và dữ liệu. 3. Báo cáo không trỏ mã nguồn. Nơi đúng là `src/modules/billing/rules.ts:213-222`, `src/modules/billing/service.ts:89`, `web/order.ts:450` và `:630`, `web/format.ts:39-42`. 4. `dayMonth` được viết cho ngày đi tour gần hạn ("thao tác chuỗi thuần", `format.ts:38`). Dùng nó cho ngày phát sinh là sai chỗ, không phải lỗi của chính hàm.
>   - *Hướng sửa gợi ý:* Ưu tiên một: hiện ngày phát sinh đủ dd/mm/yyyy (hoặc thêm năm khi khác năm hiện tại) trên dòng lần thu, và thêm `max` là hôm nay cho ô ngày. Việc này chỉ đổi giao diện nên đảo ngược được. Ưu tiên hai: để cận dưới do khoá kỳ ADR-0080 đảm nhiệm; nếu chủ muốn thêm cảnh báo mềm (không chặn) khi ngày lùi quá N ngày so với ngày lập đơn thì cần chủ chốt N, vì chạm luật tiền.
>   - *Bằng chứng (tệp:dòng):* Hai hiện tượng được mã xác nhận đúng. Không thấy kết luận nào cần chạy máy thật. (1) Không có cận dưới cho ngày phát sinh: - Đường đi: nút "Ghi lần thu" ở `web/order.ts:622-673`. Ô ngày là `h("input", { type: "date" })` (dòng 630), không có `min`/`max`, và chỉ dựng khi `t.laKeToan`. Gửi `POST /api/orders/:id/payments` kèm `ngayPhatSinh` (dòng 658-660). - Máy chủ: `src/modules/billing/index.ts:60-66` gọi `ghiLanThu`. Hàm kiểm lần thu ở `src/modules/billing/service.ts:89` gọi `ngayPhatSinh({ chon: b.ngayPhatSinh, homNay: vnToday(new Date()), laKeToan: ai.laKeToan })`. `laKeToan = can(staff,"ledger.write")` (`index.ts:27-31`) gồm Kế toán và Toàn quyền. - Luật thuần `src/modules/billing/rules.ts:213-222` chỉ kiểm bốn điều: đúng dạng `YYYY-MM-DD`; là ngày có thật; người không phải Kế toán chỉ chọn được hôm nay (`:219`); không sau hôm nay (`:220`, "Ngày phát sinh không được sau hôm nay."). Không có điều nào chặn ngày quá khứ. - Tôi tự chạy hàm đó bằng node. Kết quả: `ngayPhatSinh({chon:"2024-01-01",homNay:"2026-10-02",laKeToan:true})` trả `{"ok":true,"value":"2024-01-01"}`. Với `1900-01-01` cũng `ok:true`. Không phải Kế toán thì bị từ chối ("Chỉ Kế toán chọn được ngày phát sinh khác hôm nay."). - Tầng CSDL cũng không chặn. `migrations/0045_billing_so_cong_no.sql:79` và `:100` chỉ có `CHECK (date(occurred_date) IS occurred_date)` (đúng định dạng). Không có trigger hay bảng khoá kỳ nào, và `grep` trong `src/` không thấy module `ky-so`. - Bài test hiện có `src/modules/billing/lo-ghi.test.ts:95-102` ("NT-S8") khoá đúng hành vi này: Kế toán ghi lùi 3 ngày được 201, chỉ HDV bị 400. (2) Ngày hiện không có năm: - `web/order.ts:450`: `` `${dayMonth(l.ngayPhatSinh)} · ${l.giaiDoan}` ``. - `web/format.ts:39-42`: `dayMonth` chỉ trả `${d}/${m}`. Với "2024-01-01" ra "01/01". Nhãn giai đoạn "Trả trước" lấy từ `service.ts:24`, nên dòng đúng như báo cáo: "01/01 · Trả trước — 1.000 ₫". - Trên màn đơn không có chỗ nào khác hiện năm cho dòng lần thu. `ghiLuc` (UTC) có trong DTO (`service.ts:153`) nhưng giao diện không vẽ. Không kiểm được: ảnh `kt-m-order_id_75c139d8-….png` và kịch bản `kt2.mjs` nằm ngoài repo. Tôi không gọi API thật vì luật không cho chạy máy chủ. Hành vi 201 suy ra từ mã và từ chạy hàm luật thuần.
>   - *Rào chắn đã thấy:* Chỉ có rào chắn một phía, không đủ chặn ngày lùi xa: - Rào "không sau hôm nay": `src/modules/billing/rules.ts:220`. - Rào "chỉ Kế toán/Toàn quyền chọn ngày khác hôm nay": `rules.ts:219`, ô quyền `ledger.write`. - Kiểm dạng và ngày có thật: `rules.ts:215-218`, kèm `CHECK` ở `migrations/0045_billing_so_cong_no.sql:79,100`. - Ngoài ra không có cận dưới ở mã, CSDL hay giao diện (ô `type="date"` không có `min`). Đây là thiết kế cố ý, nhưng chỉ ở vế "Kế toán được ghi ngày lùi": - `docs/adr/ADR-0026-so-cong-no-lan-thu-va-bien-nhan-danh-sach-trang.md:19-21` ghi "Kế toán chọn được ngày khác" và hoãn khoá kỳ sang lượt 2. - `docs/ARCHITECTURE.md:117` (Hiến chương 5.14) đòi tách ngày phát sinh khỏi thời điểm ghi và có khoá kỳ. - `docs/SYSTEM-DESIGN.md:660` mô tả "ngày khác hôm nay chỉ Kế toán / Toàn quyền". - Không có đặc tả nào đòi cận dưới "không trước ngày lập đơn". Rào chắn dự kiến nhưng chưa có mã: `docs/adr/ADR-0080-quyet-toan-thang-va-khoa-ky.md` (accepted 2026-10-01) điều 3, 4, 6. Khoá kỳ theo tháng bằng trigger, trả 409 "Tháng 10/2026 đã khoá sổ" khi Kế toán tự chọn ngày lùi vào tháng đã khoá. `src/` chưa có module `ky-so`, nên rào này chưa tồn tại ở bản 1.76. Đường sửa sai có sẵn: lần thu là bảng chỉ-thêm (trigger chặn sửa/xoá, `0045:182-186`). Kế toán sửa bằng dòng đảo qua `nutKeToanLanThu` (`web/order.ts:453`, `:452` hiện "(đã đảo)").

<a id="BH-09"></a>
#### 32. BH-09 · Đối tác tự xác nhận đơn mình lập (không có người của Tour Đảo nhận)

- **Vai:** Đối tác
- **Loại:** bất hợp lý theo thiết kế
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Đích ADR-0018 giai đoạn 2 chưa thi công (đã dự liệu)
- **Hướng xử lý:** Cần chủ quyết khi thi công ADR-0018
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Đối tác. Mức: **TRUNG BÌNH**. Loại: bất hợp lý theo thiết kế. **MỚI** (không thấy trong danh sách cũ; hướng sửa đã có ở ADR-0018 đ6–7 "Đối tác không bao giờ là người nhận", đặc tả 2026-09-24 dòng 404 ghi đảo bài ghim "PARTNER tự xác nhận").
- Tái hiện: `bh/a6.mjs` — Đối tác lập TD-20261002-0023, ghi 2 lần thu, `POST /status confirmed` → 200; đơn không có người phụ trách, ảnh "Xác nhận đơn dịch vụ – Đã xác nhận" tạo được ngay.
- Đề xuất: theo ADR-0018 giai đoạn 2, đơn Đối tác chờ người nội bộ nhận và xác nhận.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (trải nghiệm). Không mất tiền hay dữ liệu: Đối tác vẫn bị khoá ở giá bán lẻ, giảm giá 0 và mốc 6 giờ; văn phòng có đường vòng (nhận/giao người phụ trách rồi chăm đơn). Mã khớp các quyết định đã duyệt đang có hiệu lực (ADR-0014 đ6, ADR-0027), phần lệch chỉ là đích giai đoạn 2 của ADR-0018 chưa thi công, nên là việc đã biết cần chủ quyết khi thi công, không phải lỗi mới; nếu chủ coi đích ADR-0018 là luật đang áp thì nâng lên TRUNG BÌNH (sai quy trình nghiệp vụ, không sai tiền).
>   - *Chính xác hoá:* Phần đúng: Đối tác tự `POST /status confirmed` đơn mình lập → 200 khi đúng giá danh mục và không giảm giá; đơn không có người phụ trách; ảnh biên nhận dựng được (mã cho thấy đủ điều kiện). Phần cần sửa trong báo cáo gốc: (1) Nhãn "MỚI/không thấy trong danh sách cũ" chưa chính xác: điểm này đã được dự liệu ngay trong ADR-0018 (điều 6–7, mục Hệ quả dòng 78) và đặc tả 2026-09-24 (§5 dòng 149, §8 dòng 224, §19 dòng 404) như việc giai đoạn 2 chưa làm; chính báo cáo cũng trích các dòng này. (2) Nhãn "bất hợp lý theo thiết kế" nên đọc là "lệch đích thiết kế chưa thi công": hiện trạng khớp ADR-0014 điều 6 (accepted: CTV được xác nhận đơn của mình), ô `order.modify` PARTNER = own (permissions.ts:79) và ADR-0027 điều 2 (đã quy định riêng luật giá cho bước Đối tác xác nhận); e2e tests/e2e/nhap-tay-va-gia-doi-tac.mjs:232-233 ghim 200. Báo cáo gốc chưa nhắc ADR-0014 điều 6 và ADR-0027 là căn cứ cho hiện trạng. (3) "ảnh 'Xác nhận đơn dịch vụ – Đã xác nhận'" là ghép tiêu đề "XÁC NHẬN ĐƠN DỊCH VỤ" (order-confirmation.ts:177) với nhãn trạng thái, không phải một chuỗi duy nhất trong mã. (4) Đề xuất "đơn Đối tác chờ người nội bộ nhận và xác nhận" phụ thuộc cả `order.submit`/hạn nhận/đề nghị nhận của ADR-0018 (chưa có), không chỉ đổi một ô; việc "ghi 2 lần thu" nằm ngoài phạm vi BH-09 và tôi không kiểm.
>   - *Hướng sửa gợi ý:* Không vá lẻ: gộp vào thi công giai đoạn 2 của ADR-0018 (tách ô `order.confirm` với PARTNER = none, thêm `order.submit` "Gửi đơn hàng", luồng nhận đơn, rồi đảo bài ghim e2e có chủ đích) và chạy qua quy trình việc lớn có kiểm độc lập; nếu chủ muốn siết sớm hơn thì cần quyết định riêng (đổi một ô quyền là việc chạm quyền, phải hỏi chủ).
>   - *Bằng chứng (tệp:dòng):* Đường đi đọc từ mã thật (không chạy máy chủ): 1) Điểm vào: `POST /api/orders/:id/status` khai access "orders" tại src/modules/orders/index.ts:979. Thân nhận `to === "confirmed"` (:984). 2) Cổng quyền duy nhất: `can(staff, "order.modify", { ownerId: meta.staffId, assigned })` (:987). Ô PARTNER của `order.modify` là "own" tại src/shared/permissions.ts:79 (chú thích ngay dòng đó: "sửa, xác nhận, huỷ đơn (ADR-0009…; ADR-0014: PARTNER của mình)"). Đối tác là người lập (`meta.staffId`) nên qua cổng. Không có ô `order.confirm`: grep "order.confirm|order.submit|dispatch.accept" trong src/shared/permissions.ts không ra dòng nào. 3) Không đòi người phụ trách: `assigned` chỉ đi vào `can()`; không nhánh nào trong route (:979-1028) đòi `isAssigned` đúng. Khi lập đơn, người phụ trách chỉ có khi người lập chọn (`hasHandlerPick` + `can(staff,"dispatch.assign")`, :671, :693); Đối tác bị chặn chọn (CANNOT_PICK_HANDLER, ô `dispatch.assign` PARTNER = none, permissions.ts:155 theo đặc tả; mã :671). `checkAssignee` cũng từ chối tài khoản giữ PARTNER làm người phụ trách (src/modules/dispatch/rules.ts:59). Vậy đơn Đối tác có thể ở trạng thái xác nhận mà không có ai của Tour Đảo nhận. 4) Chặn duy nhất áp riêng cho Đối tác ở bước xác nhận là giá và giảm giá: `holdsPartner(staff) && !retailPricesOnly(...)` → 403 (:999) và `!discountWithinCap(order.discount, PARTNER_DISCOUNT_CAP)` → 403 (:1000; trần hôm nay = 0, price-guards.ts). Qua hai cổng này → `confirmOrder` (:1007; repository.ts:~995 batch `order_confirm` + nhật ký) → 200 và `baoThayDoi({thayDoi:"xac_nhan"})` (:1026). 5) Giao diện: nút "Xác nhận đơn" hiện theo `a.confirm` (web/order.ts:789), nút "Xem biên nhận" luôn hiện (web/order.ts:800); tiêu đề ảnh là "XÁC NHẬN ĐƠN DỊCH VỤ" (src/shared/order-confirmation.ts:177). 6) Đây là hành vi đang được ghim có chủ đích: tests/e2e/nhap-tay-va-gia-doi-tac.mjs:232-233 (`confirm(P, …)` của Đối tác → assert 200); ADR-0027 điều 2 (accepted 2026-09-26) quy định rõ giá/giảm giá của Đối tác "ở lập đơn, sửa đơn và xác nhận đơn"; ADR-0014 điều 6 (chủ trả lời câu 6): "CTV được sửa, xác nhận, huỷ đơn của chính mình". Mặt khác, đích thiết kế đúng như báo cáo trích: ADR-0018 điều 6 (docs/adr/ADR-0018…md:34) "Tách order.confirm… chỉ người nhận xác nhận" và điều 7 (:36) "Đối tác không bao giờ là người nhận"; đặc tả docs/superpowers/specs/2026-09-24-mo-hinh-nguoi-vai-quyen-design.md:149 (order.confirm PARTNER = none), :224 ("Đơn của đối tác luôn do Tour Đảo xác nhận"), :404 (test ghim "PARTNER tự xác nhận đơn" phải đảo). Mã chưa làm giai đoạn đó.
>   - *Rào chắn đã thấy:* Có rào chắn nhưng không đủ chặn đúng điều báo cáo nêu (đơn có người của Tour Đảo nhận). Rào đã tìm thấy: (a) R2: Đối tác chỉ xác nhận được khi mọi dòng đúng giá danh mục (src/modules/orders/index.ts:999, price-guards.ts); (b) R3: giảm giá đã lưu phải ≤ trần 0 (index.ts:1000); (c) `confirmGaps`/điều kiện SQL `order_confirm`: phải có dịch vụ, mỗi dịch vụ có ngày đi trong khoảng và ≥ 1 khách (chang-hanh-khach-repo.ts:~348-358; index.ts:1011-1015); (d) mốc 6 giờ: chặng đón dưới mốc phải do Quản trị/Toàn quyền "đặt gấp" (`order.leg.short_notice` PARTNER = none, permissions.ts:83; index.ts:1017-1021) nên Đối tác không tự vượt; (e) chỉ xác nhận đơn của chính mình (`order.modify` PARTNER = own). Không tìm thấy rào nào đòi người phụ trách trước khi xác nhận, và không có `order.confirm`/`order.submit`. Có dấu hiệu đây là hiện trạng chủ ý tạm thời: ADR-0014 điều 6 + ADR-0027 điều 2 + e2e ghim 200; ADR-0018 điều 6 ghi rõ "Giai đoạn 1 … không đổi ô nào của sáu mã cũ; các ô còn lại đổi ở giai đoạn 2" (dòng 34) và liệt kê "test ghim PARTNER tự xác nhận đơn" là bài phải đảo có chủ đích ở giai đoạn sau (dòng 78).

<a id="HT-14"></a>
#### 33. HT-14 · Kết thúc gián đoạn khi khách đã lên xe: khách quay về "Chưa xếp" ở điểm đón cũ, "đã đón" = 0

- **Vai:** Tài xế → Điều phối
- **Loại:** sai hiển thị nghiệp vụ
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Cố ý (ADR-0049); thiếu gợi ý hiển thị
- **Hướng xử lý:** Cần chủ quyết (luồng cứu hộ D5c)
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế → Điều phối. **Mức:** TRUNG BÌNH. **Loại:** sai hiển thị nghiệp vụ.
- **Tái hiện:** CX-0210-02 đang chạy, tài xế "Đã tới" + "Đã đón" 1/2 khách TD-…0004, rồi "Kết thúc gián đoạn — Xe hỏng" (200). Điều phối: tin "kết thúc giữa chừng — cần xếp xe cho khách còn lại" (đúng), nhưng chặng TD-…0004 hiện `Chưa xếp`, `soNguoi 2`, **`soDaDon 0`**, nơi đón "Văn phòng Trần Phú" — không cho biết 1 khách đang ngồi trên xe hỏng ngoài đường.
- **Mong đợi:** chặng ghi "1 khách đang trên xe gián đoạn CX-…" để xếp xe cứu tới đúng chỗ.
- **Bằng chứng:** `kiem-vai/ht/s11.mjs`.
- **TRÙNG một phần** (rà soát 1/10 mục 2 — cứu hộ ADR-0052 D5c chưa làm); phần số "đã đón = 0" **MỚI**. **Đề xuất:** giữ dấu "đã đón trên chuyến gián đoạn" trên chặng cho tới khi có cứu hộ.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (trải nghiệm). Số khách và trạng thái "Chưa xếp" đúng theo thiết kế đã duyệt; thứ thiếu chỉ là một dấu gợi ý (ai đang ngồi trên xe hỏng, cần gặp ở đâu), văn phòng vẫn có tin, nhật ký chuyến và cuộc gọi của tài xế làm đường vòng; không sai tiền, không mất hay lộ dữ liệu. Phần nặng thật (chưa có luồng cứu hộ) đã nằm ở nợ ADR-0052 D5c, không phải ở HT-14.
>   - *Chính xác hoá:* Mô tả đúng về hiện tượng nhưng gán nhãn "sai hiển thị nghiệp vụ" là quá tay: (1) "Chưa xếp" và soDaDon = 0 là hệ quả cố ý của việc đóng suất (ADR-0049 D, spec 2026-09-29 dòng 185/824, bài kiểm dieu-phoi-trang-thai.test.ts:67-68), không phải lỗi tính; số "soNguoi 2" vẫn đúng với số khách cần xe. (2) "Nơi đón 'Văn phòng Trần Phú'" là nơi đón của đơn (noiDon của chặng), không phải điểm của suất cũ; với khách thứ hai còn chờ ở đó thì nó vẫn đúng — chỉ riêng khách đã lên xe thì điểm này không phản ánh nơi xe hỏng. (3) Câu "không cho biết 1 khách đang ngồi trên xe" đúng ở bảng điều phối và thẻ chặng, nhưng chưa kể nhật ký/chi tiết chuyến hỏng vẫn còn sự kiện "Đã đón" kèm số người, và nhật ký audit ghi "N khách chưa xong" (dieu-phoi-tien-do.ts:203; N gộp cả đã lên xe lẫn còn chờ). (4) Nhận định "TRÙNG một phần cứu hộ D5c" đúng (không có mã cứu hộ), nhưng lưu ý kế hoạch cứu hộ hiện có (plans/2026-10-01-van-chuyen-con-lai-05…:444-446) cũng chưa gồm dấu "đang trên xe", nên làm xong cứu hộ theo kế hoạch đó vẫn không tự đóng HT-14. (5) Mức TRUNG BÌNH do người tìm gán nên hạ xuống THẤP.
>   - *Hướng sửa gợi ý:* Khi bấm kết thúc gián đoạn, giữ dấu "đã lên xe gián đoạn <mã chuyến>" (suy ra từ suất đóng TRIP_INTERRUPTED có trạng thái BOARDED) và hiện chip/dòng trên thẻ chặng ở cột "Chưa xếp" cùng số người đang trên xe tách khỏi số còn chờ; nhật ký và tin gián đoạn nên nêu hai con số riêng. Cần chủ duyệt vì chạm cách hiển thị trạng thái chặng và có thể chạm hợp đồng DTO; nên làm chung với lát cứu hộ ADR-0052 D5c.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả, đọc từ mã thật (không chạy máy chủ): 1) Điểm vào: POST /api/van-chuyen/cuoc-cua-toi/:id/ket-thuc-gian-doan (tài xế, src/modules/van-chuyen/index.ts:1368) hoặc /chuyen/:id/ket-thuc-gian-doan (văn phòng bấm thay, index.ts:1549) → lenhKetThucGianDoan (src/modules/van-chuyen/dieu-phoi-tien-do.ts:188-207). Hàm này chỉ đòi chuyến đang chạy và lý do thuộc nhóm KET_THUC_GIAN_DOAN; KHÔNG chặn khi đã có khách BOARDED. Nó chỉ đếm soDong = số suất mở có trạng thái WAITING hoặc BOARDED (dòng 200), không tách "đã lên xe" khỏi "còn chờ"; nhật ký ghi "… · N khách chưa xếp xong" (dòng 203). 2) Lô ghi: loKetThucGianDoan (src/modules/van-chuyen/dieu-phoi.ts:439-448) chạy ALLOCS_DONG_GIAN_DOAN (src/modules/van-chuyen/chuyen-repo.ts:506-511): UPDATE vc_trip_allocation SET valid_to_at = ?3, close_reason = 'TRIP_INTERRUPTED' … WHERE valid_to_at IS NULL AND status IN ('WAITING','BOARDED'). Tức suất của cả người đã lên xe lẫn người còn chờ đều bị ĐÓNG; điểm dừng chưa xong bị SKIPPED (STOPS_SKIP_ALL, chuyen-repo.ts:375-380). 3) Bảng điều phối: cờ "mo" của suất = (valid_to_at === null) (src/modules/van-chuyen/dieu-phoi-doc.ts:90). trangThaiChang (src/shared/dieu-phoi-trang-thai.ts:56) lọc theo s.mo nên tập `mo` rỗng; soDaDon chỉ đếm trong `mo` (dòng 58) = 0; `if (mo.length === 0) return ra("CHUA_XEP")` (dòng 78). DTO chặng (src/modules/van-chuyen/dieu-phoi-dto.ts:95-103) chép nguyên soNguoi, soDaDon=0; danh sách chuyến của chặng cũng chỉ lấy suất mở (dòng 96) nên chặng không còn liên kết tới chuyến hỏng. 4) Giao diện: cột "Chưa xếp" lấy changChuaXep (src/shared/dieu-phoi-man.ts:61-65) → thẻ theChang (web/dieu-phoi.ts:164-169) hiện "{maDon} · {conLai} khách" cùng noiDon của đơn (không phải điểm đón của suất), không có chip hay dòng nào nói chặng từng ở xe gián đoạn hoặc có người đang trên xe. 5) Tin văn phòng: src/shared/tin-chuyen.ts:38,56 sinh đúng câu "… kết thúc giữa chừng — cần xếp xe cho khách còn lại" như báo cáo gốc trích; người nhận là người có trip.dispatch. 6) Chi tiết chuyến hỏng: chỉ liệt kê suất mở (dieu-phoi-route.ts:170 và :216) nên sau gián đoạn danh sách suất rỗng; còn nhật ký sự kiện (nhatKyChuyenDto, dieu-phoi-dto.ts:153-165, có soNguoi) vẫn giữ sự kiện "Đã đón" và "Kết thúc gián đoạn" — người có mở chi tiết chuyến vẫn suy ra được. 7) Cứu hộ chưa có mã: grep "ONBOARD|vc_transfer_request" trong src/, migrations/, web/ trả 0 tệp; grep "cuu-ho" ngoài docs trả 0 tệp (khớp rà soát 1/10 mục 2, docs/superpowers/specs/2026-10-01-ra-soat-phan-he-van-chuyen.md:14). Đã chạy lại: node --test src/shared/dieu-phoi-trang-thai.test.ts → 4/4 xanh, trong đó bài ở dòng 62-68 khẳng định chặng có suất BOARDED + WAITING đã đóng ở chuyến ENDED_INTERRUPTED cho ra "CHUA_XEP". Không chạy được: kịch bản s11.mjs của người tìm (cần máy chủ + D1) nên không tự quan sát con số 200 / soDaDon thật; chỉ suy ra từ mã.
>   - *Rào chắn đã thấy:* Không có rào chắn nào ngăn hiện tượng; nhưng phần lớn nó là THIẾT KẾ CỐ Ý, không phải lỗi tính: - docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:185 và :824: suất đóng TRIP_INTERRUPTED, "chặng quay về 'chưa xếp'", văn phòng tự tạo chuyến cứu hộ mới. - docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:114 (đóng suất WAITING/BOARDED với TRIP_INTERRUPTED, đã duyệt) và ADR-0052 D5c dòng 133 ("chặng về 'chưa xếp' → văn phòng tạo chuyến cứu hộ mới"). - src/shared/dieu-phoi-trang-thai.ts:7 (chú thích "Xe gián đoạn: suất đã đóng → … quay về CHƯA XẾP") và bài dieu-phoi-trang-thai.test.ts:67-68 khoá đúng hành vi này. - Có bù phần nào: tin "kết thúc giữa chừng" (tin-chuyen.ts:56) và nhật ký chuyến hỏng còn sự kiện "Đã đón"/"Kết thúc gián đoạn" kèm số người (dieu-phoi-dto.ts:153-165). Không có rào nào cho phần "không phân biệt người đang trên xe hỏng với người còn chờ ở điểm đón": mã không lưu dấu đó trên chặng, còn kế hoạch cứu hộ (docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-05-xe-dang-chay.md:444-446) cũng chỉ dự kiến soKhachCanChuyen tổng, chưa có dấu "đang trên xe".

<a id="HT-07"></a>
#### 34. HT-07 · Trong ngày chạy, trước khi bấm "Xuất bến", màn tài xế giấu tên khách và SĐT liên hệ (máy chủ đã gửi)

- **Vai:** Tài xế công ty
- **Loại:** khó dùng
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Chủ ý của bản 1.39, có kịch bản Chrome ghim
- **Hướng xử lý:** Cần chủ quyết
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế công ty. **Mức:** TRUNG BÌNH (muốn gọi khách trước khi rời bãi phải bấm "Xuất bến" — đẩy tài xế xuất bến sớm, xem HT-03). **Loại:** khó dùng.
- **Tái hiện:** chuyến hôm nay CX-0210-01 (23:30), tài xế mở lúc 22:46: `GET /cuoc-cua-toi/:id` trả `trongNgayChay: true`, `suat[].hoTen`, `lienHe: [{tenLienHe, sdtLienHe: 0907555666}]`; màn chỉ hiện "3 khách", không tên, không số. Bấm "Xuất bến" xong mới hiện "Liên hệ: Hoàng Văn Nam 0907555666" + danh sách tên.
- **Mong đợi:** trong ngày chạy hiện liên hệ (bấm gọi) và danh sách tên ngay ở màn "Xuất bến".
- **Bằng chứng:** ảnh `tx-T2-truoc.png` vs `tx-T2-sau-xuat-ben.png`; `web/cuoc-chuyen.ts:98` (`PLANNED` → `veXuatBen`, không vẽ `lienHe`).
- **MỚI** (`docs/VAN-CHUYEN.md` §3.5 điểm 6 hứa "chỉ hiện trong ngày chạy", không nói phải xuất bến trước).
- **Đề xuất:** vẽ khối liên hệ + tên ở màn chưa xuất bến khi `lienHe` có trong DTO.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Ít nghiêm trọng (trải nghiệm). Dữ liệu không mất, không lộ thêm, không sai tiền; thông tin hiện ngay sau lệnh vốn dành cho lúc xe lăn bánh và còn đường vòng (gọi văn phòng). Tác hại "đẩy tài xế xuất bến sớm" là suy đoán chưa quan sát được (rủi ro thật của việc xuất bến sớm không hoàn tác thuộc HT-03/HT-04); chỉ nên nâng lên TRUNG BÌNH nếu có bằng chứng tài xế thực sự bấm sớm để lấy số.
>   - *Chính xác hoá:* (1) Nhãn "MỚI" chưa đúng hẳn: đây là lựa chọn có chủ ý của người thi công bản 1.39, đã ghi chú trong mã (`web/cuoc-chuyen.ts:261-263`) và được ghim bằng kịch bản Chrome (`cuoc-smoke.mjs:188-194`, commit 61736840); chỉ là chưa ai ghi nó thành điều cần chủ quyết. Lý do được viện (ADR-0053 D7.2) lại không đòi hỏi điều đó. (2) Dẫn chứng "`web/cuoc-chuyen.ts:98`" đúng nhưng nên bổ sung `:238-248` (`veDiemTruoc`, `suat: []`) và `:251-280` (`veXuatBen`) mới thấy trọn chỗ không vẽ; chỗ máy chủ gửi là `tai-xe-dto.ts:69,72-77` và `dieu-phoi-kiem.ts:442-444`. (3) Câu "đẩy tài xế xuất bến sớm — xem HT-03" là suy đoán, chưa có bằng chứng hành vi; ngoài ra `:275` còn khoá nút khi còn thiếu điều kiện, nên lúc chuyến đang bị giữ tài xế không có đường nào thấy tên/SĐT trên màn — báo cáo gốc chưa nêu. (4) Nơi không kiểm được: chưa chạy kịch bản Chrome/máy chủ (bị cấm chạy máy chủ, cổng 8801–8803), nên chỉ đối chiếu mã + bài kiểm DTO + nội dung kịch bản; chưa quan sát hành vi tài xế thật.
>   - *Hướng sửa gợi ý:* Vì chạm cách hiển thị dữ liệu cá nhân của khách và đang bị một kịch bản Chrome ghim, nên hỏi chủ một câu: trong ngày chạy, tài xế có được thấy danh sách tên và liên hệ (bấm gọi) ngay ở màn trước Xuất bến không. Nếu có: vẽ khối tên + liên hệ ở màn chưa xuất bến khi DTO có `lienHe`/`hoTen`, đổi lại kịch bản 3b, và sửa chú thích viện D7.2 cho đúng; nếu không: ghi quyết định đó vào `docs/VAN-CHUYEN.md` §3.5 điểm 6 để tài liệu hết mơ hồ.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả: 1) Máy chủ ĐÃ gửi. `src/shared/dieu-phoi-kiem.ts:442-444`: `trongNgayChay = ngayChay === homNay || (RUNNING && …)` — chỉ cần hôm nay là ngày chạy, KHÔNG đòi chuyến đã xuất bến. `src/modules/van-chuyen/tai-xe-dto.ts:69` đưa `hoTen/namSinh` vào từng suất khi `v.trongNgay`; `:72-74` đưa `lienHe: [{maDon, tenLienHe, sdtLienHe}]` khi `v.trongNgay && v.lienHe !== null`; `:77` `trongNgayChay: v.trongNgay`. Đường route: `src/modules/van-chuyen/dieu-phoi-route.ts:198-217` (GET chi tiết, `lienHe` truyền vào DTO, `trongNgay` tính ở đó); `:234` chuyến PLANNED vẫn dựng DTO đầy đủ. Tôi tự chạy `node --test src/modules/van-chuyen/tai-xe-dto.test.ts` → 7/7 xanh; bài TC-39 (`tai-xe-dto.test.ts:43-62`) GET `/cuoc-cua-toi/:id` khi chuyến còn PLANNED (dòng 48-52, trước lệnh xuất bến ở dòng 56) và khẳng định `trongNgayChay === true`, có `lienHe` = `[{tenLienHe:"Khách Liên Hệ Dò Tìm", sdtLienHe:"0912345678"}]` và `hoTen` của suất. 2) Giao diện không vẽ. `web/cuoc-chuyen.ts:98`: `if (c.trangThai === "PLANNED") return veXuatBen(dauMang);`. `veXuatBen` (`:251-280`) chỉ vẽ meta "biển số · ngày giờ · N khách" (`:259`), danh sách điểm qua `veDiemTruoc` (`:238-248`, truyền `suat: []` ở `:241`, mỗi điểm chỉ "N khách" ở `:245`), thẻ "Điều kiện xuất bến" và nút "Xuất bến". Không có lời gọi `lienHeCua` (định nghĩa `:157-162`, chỉ gọi trong `ve()` ở `:110`, nhánh chạy) và không đọc biến `lienHe` (`:33`, nạp ở `:54`) trong nhánh PLANNED. Tên khách chỉ vẽ ở `web/tien-do-ui.ts:178` qua `veDiemChay` của nhánh đang chạy (`web/cuoc-chuyen.ts:107-111`). `web/cuoc.ts` (danh sách cuốc) cũng không có hoTen/lienHe. 3) Sau khi bấm "Xuất bến": `:277` `gui("xuat-ben")` → `:46` `nap()` đọc lại GET → `:54` gán `lienHe` → `ve()` nhánh RUNNING → `veDiemChay` có tên + `lienHeCua` (`:161` "Liên hệ: <tên>" + `tel:`). Khớp mô tả "bấm Xuất bến xong mới hiện". 4) Nút khoá khi còn thiếu điều kiện: `:275` `disabled: thieu.length > 0` — lúc đó tài xế không có đường nào tới tên/SĐT trên màn (ngoài việc gọi văn phòng); báo cáo gốc chưa nêu. Bằng chứng kiểm lại bằng chính kịch bản Chrome của dự án (chỉ đọc, không chạy): `docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs:188-194` ghi rõ "chuyến HÔM NAY trước xuất bến — máy chủ ĐÃ gửi tên khách … nhưng danh sách điểm trước xuất bến KHÔNG vẽ tên / SĐT / liên hệ" và khẳng định `.dp-run-lien-he` = 0 trước xuất bến.
>   - *Rào chắn đã thấy:* Không có rào chắn kỹ thuật nào chặn việc hiện tên/SĐT trong ngày chạy trước khi xuất bến: dữ liệu đã nằm sẵn trong phản hồi, chỉ là giao diện không vẽ. Có dấu hiệu CỐ Ý ở cấp thi công, nhưng chưa phải quyết định của ADR hay chủ: (a) chú thích `web/cuoc-chuyen.ts:261-263` ("KHÔNG khách từng người (`suat: []`) … tên / SĐT khách vẫn chỉ trong ngày chạy (ADR-0053 D7.2)") và `:276`; (b) commit 61736840 (30/9, tên "kiểm chuyến HÔM NAY trước xuất bến không lộ tên / SĐT / liên hệ khách") + `cuoc-smoke.mjs:188-194`, đã quan sát đỏ rồi hoàn nguyên (P16) — tức hành vi này đang được GHIM bằng bài kiểm; (c) bản vẽ `docs/design/van-chuyen-dieu-phoi/project/06 Xuat ben.dc.html` (6b/6c) chỉ có điều kiện xuất bến, không có khối liên hệ; (d) lời chủ 30/9 trích ở `:261` chỉ liệt kê "điểm đón, ngày giờ đón, vị trí và số lượng khách", không nhắc tên/SĐT. Nhưng lý do được viện (ADR-0053 D7.2, `docs/adr/ADR-0053-…md:54-64`) KHÔNG đòi xuất bến trước: D7.2 và câu Q-L3-B định nghĩa "trong ngày chạy" theo NGÀY ("hôm nay là ngày chạy" HOẶC "đang chạy đã xuất bến từ ngày chạy"), chỉ chặn việc xuất bến sớm TRƯỚC ngày chạy mở tên (e2e `tests/e2e/tai-xe-cuoc.mjs:88-98`). `docs/VAN-CHUYEN.md:171` cũng chỉ nói "chỉ hiện trong ngày chạy", không nói phải xuất bến trước (dù câu "Bấm Xuất bến sớm … cũng không mở tên" có thể khiến người đọc ngầm hiểu Xuất bến là bước mở tên). Cũng không có ADR nào ghi "tên/SĐT chỉ sau Xuất bến". Đường vòng có sẵn: gọi văn phòng; hoặc bấm "Xuất bến" đúng lúc xe lăn bánh (`:278` "Bấm lúc xe lăn bánh") thì tên + liên hệ hiện ngay.

<a id="HT-12"></a>
#### 35. HT-12 · "Giờ hẹn đổi — gọi báo khách: Ai xử lý: Người phụ trách đơn", nhưng HDV phụ trách không thấy, không bấm được

- **Vai:** Điều phối, Hướng dẫn viên
- **Loại:** bất hợp lý theo thiết kế + chữ sai
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Một phần đã duyệt (ADR-0051, ADR-0052); phần nhãn là mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Điều phối, Hướng dẫn viên. **Mức:** TRUNG BÌNH. **Loại:** bất hợp lý theo thiết kế + chữ sai.
- **Tái hiện:** HDV A đang phụ trách TD-…0001; giờ đón đổi sau khi xếp. Bảng điều phối, cột "Cần xử lý": "Giờ hẹn đổi — gọi báo khách … Ai xử lý: Người phụ trách đơn". HDV A: `GET /api/van-chuyen/nhac-goi-khach` → 403; `POST /api/van-chuyen/chang/:legId/da-goi-bao` → 403 "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này." Bán hàng B (không liên quan) gọi cùng route → 403 "Chỉ người lập đơn, **người phụ trách đơn**, Quản trị, Toàn quyền ghi được 'đã gọi báo'." HDV A cũng không nhận tin giờ đổi.
- **Mong đợi:** nhãn "Ai xử lý" chỉ người làm được (người lập là văn phòng / Quản trị), hoặc mở "Đã gọi báo" + tin cho HDV phụ trách.
- **Bằng chứng:** ảnh `qt-dieu-phoi-0410-b.png`; `kiem-vai/ht/s27.mjs`; `src/shared/permissions.ts` dòng `trip.call_ack` (FIELD = none); ADR-0052 D6.2 ghi rõ HDV không nhận tin chuyến.
- **MỚI** (bất hợp lý theo thiết kế). **Đề xuất:** đổi nhãn theo người thật làm được, hoặc trình chủ mở ô cho HDV phụ trách.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (trải nghiệm). Việc HDV không thấy/không bấm là quyết định đã duyệt (ADR-0051 GB2, ADR-0052 D6.2, lời chủ Q1) và có test khoá; người lập hoặc Quản trị vẫn gọi báo được nên không chặn việc. Phần lỗi thật chỉ là nhãn cố định "Ai xử lý: Người phụ trách đơn" chỉ sai khi người phụ trách là HDV (người đó không thể làm), tức mức chữ/trải nghiệm chứ không sai tiền, lộ dữ liệu hay vượt quyền.
>   - *Chính xác hoá:* (1) "Bất hợp lý theo thiết kế" + "MỚI": chưa chính xác — trường hợp "người phụ trách đơn là HDV" đã được ADR-0052 D6.2 nêu rõ cho phần TIN, và việc chặn HDV ở cổng nằm ở ADR-0051:304 + bài TC-GB-6; báo cáo gốc chỉ đúng ở chỗ ADR-0051 không bàn nhãn "Ai xử lý" khi người phụ trách là HDV — đó mới là phần mới thật. (2) "HDV A cũng không nhận tin giờ đổi": đúng nhưng dễ hiểu nhầm là lỗi riêng của HDV — thực tế không ai (kể cả Bán hàng, tài xế) nhận tin giờ hẹn đổi vì MQ-07 chủ đã hoãn (tin-chuyen.ts:7). (3) "Chữ sai" ở câu 403 của Bán hàng B: câu ở index.ts:92 ĐÚNG với Bán hàng B (người phụ trách là Bán hàng thì làm được, test TC-GB-6 xác nhận); HDV không bao giờ nhận câu đó mà nhận câu của cổng (router.ts:363). Chỉ có nhãn "Người phụ trách đơn" trên thẻ là gây hiểu sai khi người phụ trách là HDV. (4) Mức "TRUNG BÌNH" nên hạ xuống THẤP. (5) Thiếu số dòng ở phần bằng chứng: `trip.call_ack` là permissions.ts:179; nhãn là goi-bao.ts:13. (6) Ca nặng nhất mà báo cáo chưa nêu: đơn do Đối tác/Thực tập lập (không qua cổng office) và do HDV phụ trách thì chỉ Quản trị/Toàn quyền bấm được "Đã gọi báo" — vẫn có đường vòng.
>   - *Hướng sửa gợi ý:* Khuyến nghị nhỏ, cần chủ duyệt vì đổi chữ chuẩn tắc ở ADR-0051:168: bỏ hằng "Người phụ trách đơn" cố định, đổi thành chữ nêu người THẬT làm được (ví dụ "Người lập đơn, người phụ trách hoặc Quản trị") hoặc tính theo vai khi người phụ trách là HDV; tin MQ-07 làm ở lát đã hẹn sau Đợt 5. Không nên mở `trip.call_ack` cho HDV: phải qua ADR mới vì phá bất biến ADR-0051 GB2 (không rộng hơn `order.trip.edit`) và lời chủ Q1.
>   - *Bằng chứng (tệp:dòng):* Phần ĐÚNG, đã dựng lại đường đi bằng mã thật. (1) Nhãn: src/shared/goi-bao.ts:12-13 có `NHAN_GIO_HEN_DOI = "Giờ hẹn đổi — gọi báo khách"` và `AI_XU_LY_GIO_HEN_DOI = "Người phụ trách đơn"` (hằng cố định). Điểm ra màn hình: src/shared/dieu-phoi-man.ts:384 (`aiXuLy: AI_XU_LY_GIO_HEN_DOI`) → web/dieu-phoi.ts:348 (`Ai xử lý: ${v.aiXuLy}`) trong cột "Cần xử lý". (2) HDV bị chặn ở cổng: cả 3 route nhắc/gọi báo khai cổng "office" (src/modules/van-chuyen/index.ts:1600, 1613, 1635); src/shared/router.ts:363 trả 403 "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này." khi `!isOffice(staff)`; OFFICE_GATE = SALES, ACCOUNTING, ADMIN, SUPER_ADMIN (src/shared/permissions.ts:264) — không có FIELD. (3) Ô quyền: src/shared/permissions.ts:179 `"trip.call_ack": row("ownOrAssigned","none","any","none","none","any",...)` — cột thứ 4 (FIELD) = none; HDV cũng không có `trip.view` (permissions.ts:169, FIELD = none) nên cũng không có `order.trip.edit` (permissions.ts:80, FIELD = none) hay `order.modify` (permissions.ts:79) để tự đổi giờ đón. (4) Câu 403 cho Bán hàng không liên quan: src/modules/van-chuyen/index.ts:92 `Chỉ người lập đơn, người phụ trách đơn, Quản trị, Toàn quyền ghi được "đã gọi báo".`; đường tới đó: index.ts:1614 qua (ownOrAssigned với assigned:true) → 1618 `can(..., {ownerId: chu.owner_id, assigned: await isAssigned(...)})` = false → CAN_GOI_BAO. Đúng như báo cáo. (5) HDV không nhận tin: src/shared/tin-chuyen.ts:37 `if (!can(n, "trip.view")) return null` (FIELD dừng ở đây) và ADR-0052 D6.2 (docs/adr/ADR-0052-...md, dòng ~163-167) viết thẳng: "người phụ trách đơn là HDV thì tin MQ-07 chỉ tới người lập (nếu là văn phòng) và tài xế". Tự chạy `node --test src/modules/van-chuyen/goi-bao.test.ts`: 11/11 xanh, trong đó TC-GB-6 (goi-bao.test.ts:135-158) khoá đúng: HDV/Đối tác/Thực tập/Tài xế → 403 ở cổng cho cả 3 route, người phụ trách Bán hàng (không phải người lập) → 200.
>   - *Rào chắn đã thấy:* Có — và chúng cho thấy phần "bất hợp lý theo thiết kế" thực ra là thiết kế có chủ ý, đã ghi và đã khoá bằng test: (a) ADR-0051 GB2 (docs/adr/ADR-0051-nhac-goi-bao-khach-gio-hen-doi.md:304): "Cổng: office ... HDV, Đối tác, Thực tập, Tài xế, Tài xế đối tác bị cổng chặn trước"; dòng 303: bài ghim `trip.call_ack` không rộng hơn `order.trip.edit` ("Người không được đổi giờ hẹn thì không được xác nhận đã báo giờ hẹn") — HDV không có `order.trip.edit` nên không thể được mở ô này mà không phá bất biến; dòng 584, 619 liệt kê HDV → 403 là ca kiểm thu. (b) Lời chủ Q1 (docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md:10): "HDV, Đối tác không thấy lịch xe"; C1 ở bang-dieu-phoi-chung-design.md:33. (c) ADR-0051:168 và :296 chốt nguyên văn nhãn "Ai xử lý: người phụ trách đơn" theo bản vẽ [BV]:59 (hằng một chỗ ở goi-bao.ts, màn không tự đặt chữ). (d) Tin "giờ hẹn đổi" (MQ-07) KHÔNG tồn tại cho BẤT KỲ AI: HANH_DONG_TIN_CHUYEN (src/shared/tin-chuyen.ts:7) chỉ có 5 hành động, không có hành động giờ hẹn; chủ đã chọn phương án (a) "tách MQ-07 sang lát sau" (docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-02-tin-bao-chuyen.md:44, :1259; docs/superpowers/plans/2026-10-02-van-chuyen-dot-2-nhat-ky.md:9). (e) Đường vòng có thật: người lập đơn (văn phòng) và Quản trị/Toàn quyền luôn bấm được (permissions.ts:179 ô "any" của ADMIN/SUPER_ADMIN); mọi người văn phòng vẫn THẤY thẻ trên bảng điều phối. Các rào này không chặn được lỗi nhãn còn lại (xem chinh_xac_hoa).

<a id="HT-11"></a>
#### 36. HT-11 · Người VỪA ĐƯỢC giao đơn nhận tin "… vừa giao đơn X cho người khác phụ trách"

- **Vai:** Quản trị giao → Hướng dẫn viên B
- **Loại:** sai chữ
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- **Vai:** Quản trị giao → Hướng dẫn viên B. **Mức:** TRUNG BÌNH (HDV hiểu là không phải việc mình). **Loại:** sai chữ.
- **Tái hiện:** Quản trị `PUT /api/orders/TD-…0007/handler {staffId: HDV B}` → 200. Hộp thông báo HDV B: `{"loai":"giao","cau":"Quản Trị vừa giao đơn TD-20261002-0007 cho người khác phụ trách","cuaToi":true,"lienKet":"/account"}`.
- **Mong đợi:** với người nhận mới: "Quản Trị vừa giao đơn X cho bạn"; với người bị đổi ra: "… giao cho người khác".
- **Bằng chứng:** `src/shared/thong-bao.ts:48` (một câu cho mọi người nhận).
- **MỚI** (khác HD01 — HD01 là người bị đổi ra không nhận tin).
- **Đề xuất:** chọn câu theo vai người nhận (người mới / người cũ / người lập).

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Ít nghiêm trọng (tin báo). Chỉ là câu chữ gây hiểu lầm; tin vẫn tới đúng người, vào ngăn "Của tôi" có số đỏ, bấm vào mở /account nơi đơn hiện ở "Việc của tôi", và thông báo nổi lúc đó dùng câu trung tính; không sai tiền, không lộ dữ liệu, không chặn việc. Mức TRUNG BÌNH của báo cáo gốc cao hơn thang (chữ/trải nghiệm = THẤP).
>   - *Chính xác hoá:* Báo cáo đúng về cơ chế, câu chữ và tệp:dòng (thong-bao.ts:48). Cần chỉnh/bổ sung: (1) Mức nên là THẤP, không phải TRUNG BÌNH (xem ly_do_muc). (2) "Một câu cho mọi người nhận" đúng, nhưng câu chỉ SAI với người được giao; với người lập và người xem ngăn Tất cả thì "cho người khác" là đúng nghĩa. (3) Phần "Mong đợi" nhánh "người bị đổi ra: giao cho người khác" hiện không thể xảy ra vì người cũ không nhận tin (ADR-0034 §4.2:97, thuộc HD01); nhánh có thể sửa ngay chỉ là "người mới" (người xem = người phụ trách hiện tại). (4) Lỗi lan sang tin màn hình khoá (web/sw/sw.ts:52,64) vì dùng cùng hàm lọc; thông báo nổi (bang-tin.ts:142) thì KHÔNG bị. (5) Bản thiết kế 2026-09-27 mục 4.1 viết rằng HDV không thấy tên người làm (`order.history.view` = none) đã cũ; từ ADR-0030 S23-3 FIELD có ô `assigned` (permissions.ts:76) nên HDV phụ trách thấy tên, đúng như ảnh chụp. (6) Loại lỗi "sai chữ" là chính xác; còn hạn chế khi sửa: nhật ký chỉ có người phụ trách HIỆN TẠI (view không có đích từng lần đổi), nên với đơn đổi nhiều lần, chỉ chắc chắn được cho dòng đổi gần nhất.
>   - *Hướng sửa gợi ý:* Trong hàm lọc hộp (src/shared/thong-bao.ts, chỗ chọn câu cho loại "giao"), khi người xem chính là người phụ trách hiện tại thì dùng câu nói thẳng với họ (ví dụ "… vừa giao đơn X cho bạn phụ trách"), còn người lập/người xem Tất cả giữ câu hiện nay; thêm một bài kiểm cho cả hai nhánh. Đây là sửa chữ (không đụng dữ liệu/quyền), nhưng nên ghi chú rằng dòng "giao" cũ của đơn đổi nhiều lần có thể bị gán nhầm "cho bạn" nếu người xem là người phụ trách hiện tại.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả (đọc mã + chạy lại luật thuần): 1) Điểm vào: `PUT /api/orders/:id/handler` ở src/modules/dispatch/index.ts:156. Dòng 189 `thayDoiCuaHandler` ra "giao" (đơn đã có người hoặc người gọi giao cho người khác); dòng 190-200 ghi một dòng nhật ký `order_handler_changed` (src/modules/dispatch/service.ts:53, `staff_id` = người giao) cùng lô với đổi người phụ trách; dòng 207 `baoThayDoi`. 2) Hộp thông báo đọc lại nhật ký: src/modules/thongbao/repository.ts:8-21 (LIST_DON) lấy dòng `order_handler_changed` từ view `v_aud_order_event` (migrations/0025_thong_bao.sql:53-56, chỉ có id, order_id, staff_id, action, created_at, KHÔNG có detail/đích) và ghép `h.staff_id AS handler_staff_id` từ `v_dsp_order_handler` = người phụ trách HIỆN TẠI; repository.ts:81 gán nó vào `DongDon.phuTrach`. 3) src/shared/thong-bao.ts:37 `loaiTinDon`: `order_handler_changed` (không cùng lô lập) -> "giao". Dòng 98 `nhanSuKien` gắn nhãn `nguoi:<người phụ trách sau>` nên HDV B (người mới) có nhãn trong `nhanKetNoi`; dòng 103-105 cho `cuaToi = true`; dòng 89 chỉ loại chính người làm. 4) Dòng 106: `coTen = tenNguoiLam !== null && can(staff, "order.history.view", {ownerId, assigned: phuTrach.staffId === staff.id})`; permissions.ts:76 cho FIELD ô `assigned` nên HDV phụ trách THẤY tên người giao. Dòng 109 chọn câu `CAU[loai].coTen(...)`, mà dòng 48 là: "`${t} vừa giao đơn ${m} cho người khác phụ trách`" — một câu cố định, không phụ thuộc người xem. Dòng 110: HDV -> lienKet "/account". 5) Tự chạy lại luật thuần bằng tập lệnh tạm ở scratchpad (không sửa repo): `node --experimental-strip-types .../ht11.mts` với một dòng `order_handler_changed` (người làm "Quản Trị", đơn TD-20261002-0007, người phụ trách hiện tại = hdvB). Kết quả thật: HDV B -> `[{"cau":"Quản Trị vừa giao đơn TD-20261002-0007 cho người khác phụ trách","cuaToi":true,"lienKet":"/account"}]` (khớp từng chữ với báo cáo gốc); Bán hàng người lập -> cùng câu, cuaToi true, lienKet /order?id=o1; Kế toán -> cùng câu, cuaToi false (ngăn Tất cả); HDV C không liên quan -> rỗng. 6) Tin màn hình khoá cũng mang câu sai: web/sw/sw.ts:48-66 gọi `/api/thong-bao/moi-nhat` rồi `showNotification(body: b.tin.cau)`, route ở src/modules/thongbao/index.ts:140 dùng cùng `locHopThongBao`. Riêng thông báo nổi (toast) dùng câu trung tính khác ở src/shared/bang-tin.ts:142 "Đơn X vừa đổi người phụ trách" nên không bị lỗi này (bang-tin.test.ts:296,327,334 khoá câu đó). 7) Không có bài kiểm nào khoá câu `coTen` của "giao" (grep "cho người khác|vừa giao đơn" trong src/tests/web chỉ ra thong-bao.ts:48 và một chú thích ở web/order.ts:314); thong-bao.test.ts:22 chỉ kiểm loại tin.
>   - *Rào chắn đã thấy:* Không có rào chắn nào làm câu đúng cho người được giao. Các quy tắc tìm thấy nhưng không chặn lỗi: (a) src/shared/thong-bao.ts:106 biết người xem là người phụ trách hiện tại (`assigned`) nhưng chỉ dùng để quyết hiện tên hay không, không dùng để chọn câu; (b) docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md:80 ghi MẪU câu chung "Lan vừa giao đơn DH-… cho người khác phụ trách" kèm "chữ cuối cùng duyệt ở bản mẫu"; bản mẫu docs/design/thong-bao-mockup/ban-mau-thong-bao.html:365 có đúng câu đó một kiểu cho mọi người xem; không ADR nào nêu chủ ý dùng câu này cho chính người được giao (ADR-0034 §4.2 dòng 97 còn nói rõ người mới phụ trách thấy tin, tức là họ vốn thuộc nhóm nhận); (c) bang-tin.ts:165-168 ghi chủ đã quyết giữ nguyên câu "giao" cho thông báo nổi ở lượt 1 và để "tách loại tin riêng cho người được giao" xét ở lượt 2 — đó là trì hoãn có chủ ý nhưng chỉ cho thông báo nổi (khung 5 khoá không biết người nhận), không áp cho hộp thông báo vì hộp dựng câu ở máy chủ cho từng người xem; (d) ADR-0034 §4.2 dòng 97: người bị chuyển khỏi đơn không nhận tin (có chủ ý, liên quan HD01 chứ không phải HT-11).

<a id="BH-17"></a>
#### 37. BH-17 · Người được chọn phụ trách lúc lập đơn không nhận tin "giao cho bạn"

- **Vai:** Bán hàng (và HDV) được chọn
- **Loại:** bất hợp lý theo thiết kế (mã ghi chủ ý "không bao giờ phát 'giao' cho đơn vừa lập" — `src/modules/orders/index
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Chủ đã chốt ở ADR-0045; còn câu chữ
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng (và HDV) được chọn. Mức: TRUNG BÌNH. Loại: bất hợp lý theo thiết kế (mã ghi chủ ý "không bao giờ phát 'giao' cho đơn vừa lập" — `src/modules/orders/index.ts` ~dòng 696). **MỚI** (HD01 cũ là HDV bị ĐỔI khỏi đơn).
- Thấy: A lập TD-20261002-0029 chọn B phụ trách; hộp tin của B chỉ có "Bán Hàng A vừa lập đơn mới TD-20261002-0029" với `cuaToi:false`, không có dòng nào nói B là người phụ trách (`bh/a19.mjs`).
- Đề xuất: tin cho người được chọn ghi rõ "bạn phụ trách đơn …" và đánh dấu là của mình.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (tin báo). Hành vi do chủ chốt trong ADR-0045 (nháp chưa là việc của ai), và người được chọn vẫn nhận tin "xác nhận" ở "Của tôi" khi đơn được xác nhận, cũng thấy đơn trong danh sách. Chỉ còn câu chữ chưa nói rõ "bạn phụ trách", và việc đó trùng với HT-11, nên đây là trải nghiệm, không phải sai nghiệp vụ hay chặn việc.
>   - *Chính xác hoá:* 1) Tiêu đề và đề xuất "không nhận tin" là quá tay: B vẫn nhận tin "xác nhận" (cuaToi:true) khi A xác nhận đơn. Chỉ lúc lưu nháp là không có tin ở "Của tôi", và đó là điều ADR-0045 (28/9, chủ duyệt) viết rõ (dòng 9 và 17). Báo cáo gốc gọi đây là "bất hợp lý theo thiết kế" mà không trích ADR-0045. 2) "(và HDV)": hộp tin mô tả ("lập đơn mới", cuaToi:false) chỉ đúng với Bán hàng. HDV được chọn lúc nháp không có tin nào, kể cả ở "Tất cả". 3) Tệp:dòng: ghi chú "không bao giờ phát 'giao'" nằm ở src/modules/orders/index.ts:696-697 (dòng 698 là lời gọi `baoThayDoi`), không phải "~696" chung chung. Nguyên nhân thật của việc mất tin giao nằm ở src/shared/thong-bao.ts:37 và src/modules/thongbao/repository.ts:12-13 (cờ cung_lo_lap), báo cáo gốc chưa nêu. 4) Phần câu "… giao cho người khác phụ trách" gửi nhầm cho người được giao (thong-bao.ts:48) là lỗi riêng, đã có ở HT-11; không thuộc BH-17 (BH-17 là ca lúc lập, không phát tin "giao").
>   - *Hướng sửa gợi ý:* Không đảo ADR-0045 (cần ADR mới do chủ duyệt, vì chạm luật báo tin). Nếu muốn cải thiện: khi đơn được xác nhận, tin cho người đang phụ trách ghi rõ "đơn bạn phụ trách", dùng chung cách tách câu theo người nhận của HT-11. Nếu chủ muốn báo ngay lúc nháp thì phải qua ADR mới sửa ADR-0045, vì khi đó ADR-0045 điều 1 bị đảo.
>   - *Bằng chứng (tệp:dòng):* Điều quan sát được là đúng mã. Đơn mới lập luôn ở trạng thái nháp (INSERT ... 'draft', src/modules/orders/repository.ts:904-907). Đường đi từ điểm vào tới kết quả: 1) POST /api/orders (src/modules/orders/index.ts:666). Dòng 693-695: nếu có chọn người, `newOrderHandler(pick.staffId)` trả câu lệnh mở dòng HANDLE và nhật ký `order_handler_changed`, gộp vào CÙNG lô với `createOrder`, nên cùng mốc `created_at` với dòng `created`. 2) Dòng 696-698: `baoThayDoi({ orderId: id, thayDoi: "tao" })`, kèm chú thích "Không bao giờ phát 'giao' cho đơn vừa lập". Ở src/index.ts:72-96, nhãn sự kiện gồm `nguoi:<B>` nên màn hình B chỉ được làm mới. Câu thông báo nổi không có loại "tao" (src/shared/bang-tin.ts:140-145), nên không hiện gì. 3) Hộp thông báo: src/modules/thongbao/repository.ts:12-13 tính cờ `cung_lo_lap` = dòng `order_handler_changed` cùng mốc với dòng `created`. src/shared/thong-bao.ts:37 `case "order_handler_changed": return d.cungLoLap ? null : "giao"`, nên dòng giao người lúc lập bị bỏ hẳn. 4) Dòng `created` còn lại thành tin "lap" (thong-bao.ts:35). Dòng 101-102 giữ lại chỉ nhãn `tat-ca` cho `created` ("nháp không vào Của tôi"), nên `cuaToi = false` (dòng 105). Câu "… vừa lập đơn mới …" lấy từ CAU.lap (dòng 45). Tôi tự chạy hàm thật `locHopThongBao` bằng một đoạn node chỉ đọc. Kết quả với B quyền SALES, ngăn "Tất cả" lúc nháp: `[{"loai":"lap","cau":"Bán Hàng A vừa lập đơn mới TD-20261002-0029","cuaToi":false}]`; ngăn "Của tôi": rỗng. Khớp hệt báo cáo gốc. Phần báo cáo gốc bỏ sót, cũng do tôi chạy: sau khi A bấm Xác nhận, B nhận tin `xac_nhan`, `cuaToi:true`, câu "Bán Hàng A vừa xác nhận đơn TD-20261002-0029". Cả B quyền SALES lẫn B quyền FIELD đều nhận (thong-bao.ts:38 kết hợp nhanSuKien trong bang-tin.ts:101-104 gắn `nguoi:<handlerSau>`). Với B là HDV (FIELD): lúc nháp không có tin nào, kể cả "lap" và kể cả ở ngăn "Tất cả". Lý do: FIELD không có nhãn `tat-ca` (bang-tin.ts:57) và dòng `created` bị lọc chỉ còn `tat-ca`.
>   - *Rào chắn đã thấy:* 1) ADR-0045 (accepted, chủ dự án nói trong chat 28/9/2026): docs/adr/ADR-0045-thong-bao-don-khi-xac-nhan.md:9 "Lưu nháp (created) không vào ngăn Của tôi của ai"; dòng 17 "Người được chọn phụ trách ngay lúc lập nháp cũng chỉ được báo khi đơn được xác nhận"; dòng 16 "nháp chưa là việc của ai". Đây là quyết định chủ đích của chủ, nêu đúng ca này. 2) Bài khoá luật: src/shared/thong-bao.test.ts:74-79 (biến `nhapCoTam`: nháp có người phụ trách là TAM, đã chọn lúc lập, nhưng LAN, VU, TAM đều không có tin nào ở "Của tôi") và dòng 23-24 (`order_handler_changed` cùng lô lập => `loaiTinDon` trả null). 3) ADR-0030 S20-4 (docs/adr/ADR-0030-…md:177): "Bảng tin phát `tao`, không phát `giao`". Dòng 226: nhắm thông báo riêng cho người nhận ("Q-F (b)") để ADR sau. 4) Chú thích src/shared/bang-tin.ts:166-168: tách loại tin riêng cho người được giao đã được hoãn có chủ ý sang "lượt 2". 5) Đường vòng: tin xác nhận tới B ở "Của tôi" với `cuaToi:true`. Ngoài ra B vẫn thấy đơn nháp qua danh sách (Bán hàng thấy mọi đơn theo orders/index.ts:591; HDV thấy đơn nháp mình phụ trách theo chú thích dòng 449-451) và qua sự kiện làm mới màn hình. Không có rào nào chặn việc bất hợp lý còn lại: tin xác nhận gửi B dùng câu chung, không nói "bạn phụ trách".

<a id="BH-10"></a>
#### 38. BH-10 · Bốn ô số ở Trang chủ: bấm ô nào cũng ra danh sách đơn chưa lọc; số đếm lẫn phạm vi

- **Vai:** Bán hàng (cả kiêm Quản trị)
- **Loại:** bất hợp lý theo thiết kế (đặc tả 2026-10-02 trang chủ ghi "Bấm một ô → danh sách Đơn hàng")
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Thiết kế cố ý có văn bản (đặc tả 23/9); thiếu tiện lợi
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận một phần (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng (cả kiêm Quản trị). Mức: TRUNG BÌNH. Loại: bất hợp lý theo thiết kế (đặc tả 2026-10-02 trang chủ ghi "Bấm một ô → danh sách Đơn hàng").
- Mô tả: "Chưa phụ trách 21", "Chờ xác nhận 19 – Cần xác nhận đơn", "Còn thiếu" đều mở `/orders` không lọc; bộ lọc cũng không có mục "chưa phụ trách". "Chờ xác nhận" đếm cả nháp của Thực tập (A không xác nhận được) mà dòng phụ ghi "Cần xác nhận đơn"; "Còn thiếu" là số toàn công ty nằm cạnh "Doanh thu **của tôi**" — Bán Hàng B chưa có đơn nào vẫn thấy "Còn thiếu 3,2tr – 3 đơn".
- Tái hiện: `pw/s17.mjs` (mọi ô → `/orders`); `bh/a13.mjs` (A và B cùng `draftCount 19`, `unpaid {count:3,total:3230000}`). Mã `web/home.ts:549-552` (`href: "/orders"` cố định).
- Đề xuất: mỗi ô mở danh sách đã lọc đúng tập nó đếm; ghi rõ "toàn công ty"/"của tôi".

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận một phần**; mức đề xuất Ít nghiêm trọng (trải nghiệm). Số đếm đúng, không sai tiền, không lộ hay mất dữ liệu, không vượt quyền (máy chủ chặn xác nhận đơn người khác); có đường vòng hai thao tác (lọc "Nháp" ở màn Đơn hàng). Đích bấm không lọc và việc bỏ nhãn "toàn công ty" là quyết định có ghi của chủ (23/9 mục 6) và đặc tả duyệt, nên đây là khó dùng/chữ gây hiểu nhầm (trải nghiệm), thấp hơn mức TRUNG BÌNH người tìm gán.
>   - *Chính xác hoá:* (1) Loại "bất hợp lý theo thiết kế" chưa chuẩn: đích "/orders" không lọc và việc không ghi "toàn công ty" là thiết kế cố ý có văn bản (đặc tả 23/9 §7, quyết định chủ số 6, bản vẽ 2/10 dòng 45) và có kịch bản Chrome ghim; đúng hơn là thiết kế chưa đủ tiện, một phần do điều kiện "chưa có bộ lọc" đã lỗi thời. (2) Báo cáo nói "mọi ô → /orders" nhưng chỉ nêu 3 ô; thực tế cả 4 ô (kể cả "Doanh thu của tôi") đều về /orders không lọc, và có hai chỗ trong mã (web/home.ts:70 máy tính, :552 điện thoại). (3) "Bộ lọc cũng không có mục chưa phụ trách" đúng, nhưng với "Chờ xác nhận" bộ lọc Nháp CÓ SẴN — chỉ là trang không nhận `?status=` từ URL (web/orders.ts:66 chỉ đọc `q`). (4) Câu "A không xác nhận được" chỉ đúng với tài khoản chỉ-Bán hàng; Quản trị/Toàn quyền xác nhận được mọi nháp nên số 19 đúng việc cần làm với họ. (5) Số liệu 19 / 3 đơn / 3.230.000 chưa tái hiện được vì cần chạy e2e (không được phép); chỉ chứng minh được bằng đọc mã rằng hai người Bán hàng cùng thấy một số.
>   - *Hướng sửa gợi ý:* Cho trang Đơn hàng nhận `?status=draft` từ URL rồi trỏ ô "Chờ xác nhận" tới đó; với "Chưa phụ trách" và "Còn thiếu" cần chủ duyệt thêm bộ lọc mới (chạm hợp đồng API `GET /api/orders`, nên phải hỏi chủ trước) hoặc tạm bỏ dòng phụ "Cần xác nhận đơn" cho người chỉ-Bán hàng; việc ghi lại nhãn "toàn công ty" phải để chủ quyết vì đảo quyết định số 6 ngày 23/9.
>   - *Bằng chứng (tệp:dòng):* Phần ĐÚNG (mã khớp mô tả): (1) Cả hai nơi dựng ô số đều cố định đích bấm là "/orders", không tham số: web/home.ts:552 (điện thoại, `oSo`: `{ class: "dash-so-o", href: "/orders" }`) và web/home.ts:70 (máy tính, `oSoMayTinh`: `href: "/orders"`) — báo cáo gốc chỉ nêu :549-552, bỏ sót :70. Kịch bản docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs:436 và :507 còn ghim `href === "/orders"`. (2) Trang Đơn hàng chỉ đọc `q` từ URL: web/orders.ts:66 `new URLSearchParams(location.search).get("q")`; không đọc `status`. Dù vậy máy chủ ĐÃ hiểu `status` (src/shared/loc-don.ts:35) và màn có ba nút Nháp/Đã xác nhận/Đã huỷ (web/orders.ts:332-337). Bộ lọc KHÔNG có "người phụ trách": src/shared/loc-don.ts:5 `"Người phụ trách" CHƯA có`; cũng không có lọc "còn thiếu tiền". (3) Số đếm toàn công ty: `draftCount` = `SELECT COUNT(*) FROM orders WHERE status = 'draft'` không lọc người lập (src/modules/orders/repository.ts:688); `unassignedCount` đếm mọi đơn nháp/đã xác nhận chưa có người (repository.ts:698-700); "Còn thiếu" = GET /api/ledger/unpaid-summary gọi `donDangThuTien(env.DB)` không truyền người xem (src/modules/billing/index.ts:157-172, chú thích dòng 157-158: "ba ô KHÔNG ngữ cảnh (xem được mọi đơn, mọi tiền)"). Chỉ "Doanh thu của tôi" lọc theo `staff_id` (repository.ts:708). Chính web/home.ts:85-86 ghi "Ba ô kia là số TOÀN CÔNG TY… 'Doanh thu của tôi' chỉ đơn người xem lập". Vậy Bán hàng B chưa có đơn nào vẫn thấy cùng `draftCount` và `unpaid` như A — mã cho kết quả đó (không chạy được e2e nên chưa tái hiện số 19 / 3,23tr). (4) Ô "Chờ xác nhận" gồm cả nháp của Thực tập mà dòng phụ ghi "Cần xác nhận đơn" (web/home.ts:96 và :568): quyền xác nhận là `order.modify` — SALES chỉ `ownOrAssigned` (src/shared/permissions.ts:79; route POST /api/orders/:id/status kiểm ở src/modules/orders/index.ts:987), nên Bán hàng không xác nhận được nháp của người khác chưa giao mình phụ trách; Quản trị/Toàn quyền (`any`) thì được.
>   - *Rào chắn đã thấy:* Có, và chúng làm yếu mô tả "bất hợp lý theo thiết kế": (a) Đặc tả máy tính 2/10 ghi thẳng "Bấm một ô → danh sách Đơn hàng" (docs/superpowers/specs/2026-10-02-trang-chu-may-tinh-lenh-claude-design.md:45); đây là lệnh thiết kế gửi Claude Design chứ không phải ADR, nhưng là bản vẽ chủ đã duyệt để dựng bản 1.73. (b) Đặc tả Trang chủ 23/9 cho phép đích không lọc: docs/superpowers/specs/2026-09-23-trang-chu-moi-design.md §3.2 và §7 dòng 68 "dẫn `/` (không lọc) nếu trang Đơn hàng chưa hỗ trợ đúng bộ lọc cần thiết… KHÔNG đổi API GET /api/orders để thêm bộ lọc mới". (c) Quyết định số 6 của chủ dự án 23/9 (docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md:57): bỏ hẳn nhãn "toàn công ty", "chấp nhận rủi ro nhỏ là nhân viên Bán hàng có thể tưởng 3 ô số… là của riêng mình" — đúng phần "ghi rõ toàn công ty/của tôi" của báo cáo gốc. (d) docs/SYSTEM-DESIGN.md:914 mô tả "ba ô số liệu toàn công ty" là thiết kế hiện hành. (e) Đường vòng: mở Đơn hàng rồi bật nút "Nháp"; mỗi thẻ đơn có chip "Chờ nhận" khi chưa có người (src/shared/handler-view.ts:7). Các rào này KHÔNG đủ chặn hoàn toàn: điều kiện "nếu trang Đơn hàng chưa hỗ trợ bộ lọc" chỉ còn đúng cho "Còn thiếu" và "Chưa phụ trách"; với "Chờ xác nhận" thì bộ lọc `status` đã có từ 30/9 nên điều kiện đã lỗi thời (chỉ thiếu việc đọc `?status=` ở web/orders.ts).

<a id="BH-01"></a>
#### 39. BH-01 · Tìm dịch vụ trong form lập đơn phải gõ đúng dấu

- **Vai:** Bán hàng, Thực tập, Đối tác (mọi người lập đơn)
- **Loại:** khó dùng
- **Mức:** Ít nghiêm trọng (người tìm gán Trung bình, hạ sau kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Sửa mã
- **Kiểm độc lập:** Xác nhận (1 người kiểm) · bằng chứng tệp:dòng ở ngay bên dưới

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng, Thực tập, Đối tác (mọi người lập đơn). Mức: **TRUNG BÌNH**. Loại: khó dùng. **MỚI** (mục 10 cũ nói về tìm ĐƠN, không phải tìm dịch vụ).
- Mô tả: ô "Chọn từ danh mục" chỉ so chữ thường, không bỏ dấu. Gõ "dao" hay "4 dao" không ra "Tour 4 đảo Nha Trang"; phải gõ "đảo". Nhân viên gõ nhanh trên điện thoại thường gõ không dấu.
- Tái hiện: /order-form → gõ `dao` vào ô tìm dịch vụ.
- Thấy: không có kết quả. Mong đợi: ra TOUR4D.
- Bằng chứng: script `pw/s4.mjs`: `dao => null`, `4 dao => null`, `đảo => TOUR4D`. Mã `src/shared/loc-danh-muc.ts:24-26` (`toLowerCase().includes`, không chuẩn hoá dấu).
- Đề xuất: so sánh trên chuỗi đã bỏ dấu (NFD + bỏ dấu, đ→d), dùng chung hàm với tìm đơn khi sửa mục 10.

> **Kết quả kiểm độc lập (đọc mã, chỉ đọc):**
> - *kiểm tổng hợp:* **Xác nhận**; mức đề xuất Ít nghiêm trọng (trải nghiệm). Không sai tiền, không mất hay lộ dữ liệu, không chặn việc lập đơn: nhân viên vẫn tìm được bằng mã dịch vụ, phần tên trước chữ có dấu, các chip lọc và ★ Hay dùng. Đây là khó dùng ở thao tác tìm kiếm (trải nghiệm), nên theo thang là THẤP chứ không phải TRUNG BÌNH như báo cáo gốc; chỉ đáng ưu tiên cao hơn nếu chủ quan sát nhân viên gõ không dấu thường xuyên trên điện thoại.
>   - *Chính xác hoá:* Mô tả và mã dẫn (src/shared/loc-danh-muc.ts:24-26) đúng. Các điểm cần chỉnh: (1) "Không có kết quả" có đường vòng nên mức TRUNG BÌNH là cao so với thang (đề xuất THẤP, loại trải nghiệm). (2) "TOUR4D" là mã trong danh mục Sheet thật của máy thử, tôi không xác minh được ngoại tuyến (bài test trong repo dùng mã mẫu TD101); phần này không ảnh hưởng kết luận. (3) Báo cáo nói mã "không chuẩn hoá dấu" nhưng chưa nêu cả dạng Unicode: ô tìm cũng không chuẩn hoá NFC/NFD (gõ "tour 4 đảo" dạng NFD cho kết quả trống). (4) Câu "Gõ 'dao' hay '4 dao' không ra" đúng, nhưng "tour 4" và "nha trang" vẫn ra, không phải mọi chuỗi không dấu đều trượt. (5) Đề xuất "dùng chung hàm với tìm đơn" cần lưu ý tìm đơn là SQL `LIKE` ở máy chủ (src/modules/orders/repository.ts:507) còn ô tìm dịch vụ là lọc phía trình duyệt trong tệp thuần; hai chỗ không dùng chung hàm được ngay, nhưng hàm bỏ dấu thuần đã có ở src/shared/assignee-pick.ts:23-25 để tái dùng cho phía trình duyệt. Báo cáo ghi HEAD dfee4a8c (1.77); cây hiện tại là 1c3339eb (chỉ thêm tài liệu), không đổi các tệp mã liên quan.
>   - *Hướng sửa gợi ý:* Đưa hàm bỏ dấu thuần (NFD, bỏ dấu kết hợp, đ→d, chữ thường) hiện có ở assignee-pick.ts vào một tệp dùng chung trong src/shared rồi cho locDanhMuc so khớp trên chuỗi đã bỏ dấu của cả ô gõ lẫn tên/mã dịch vụ, kèm ca test không dấu (dao, 4 dao, chuoi) và ca NFD. Việc này chỉ chạm bề mặt, đảo ngược được, chưa chạm dữ liệu/quyền/tiền nên không cần ADR; còn tìm đơn (SQL LIKE ở máy chủ) là việc riêng cần xử lý theo mục 10.
>   - *Bằng chứng (tệp:dòng):* Đường đi từ điểm vào tới kết quả: (1) /order-form dựng ô tìm `#catalog-q` (type=search, placeholder "Gõ tên hoặc mã dịch vụ…") ở web/catalog-picker.ts:65; (2) sự kiện `input`/`focus` gọi `render()` (web/catalog-picker.ts:190-191); (3) `render()` gọi `locTheoNhom(locDanhMuc(items, { kim: q.value, … }), …)` rồi `.slice(0, 40)` (web/catalog-picker.ts:157); (4) `locDanhMuc` (src/shared/loc-danh-muc.ts:24-26) làm `const kim = o.kim.trim().toLowerCase()` rồi loại dòng nào không thoả `c.name.toLowerCase().includes(kim) || c.code.toLowerCase().includes(kim)`. Không có `normalize`, không bỏ dấu, không có bí danh không dấu; DTO `CatalogServiceDto` (src/shared/contracts.ts:550-554) cũng không có trường từ khoá phụ. (5) Không dòng nào khớp → `found.length === 0` → hiện "Không tìm thấy dịch vụ." (web/catalog-picker.ts:185-186). Tự chạy lại luật thuần bằng `node` (không sửa tệp, kịch bản ở thư mục tạm của phiên) với danh mục mẫu [TOUR4D "Tour 4 đảo Nha Trang"; TTB03 "Phao chuối"; DD01 "Đưa đón sân bay"]: "dao" → (trống); "4 dao" → (trống); "đảo" → TOUR4D; "4 đảo" → TOUR4D; "tour" → TOUR4D; "tour 4" → TOUR4D; "tour 4 d" → (trống); "TOUR4D" → TOUR4D; "chuoi" → (trống); "chuối" → TTB03; "dua don" → (trống); "đưa đón" → DD01; "nha trang" → TOUR4D. Thêm: "tour 4 đảo" gõ ở dạng NFD (dấu tổ hợp rời) → (trống), tức không khớp cả khi chỉ khác dạng mã hoá Unicode. Bài test hiện có (src/shared/loc-danh-muc.test.ts:9-13) chỉ khoá hành vi "không phân biệt hoa thường", không có ca không dấu. Dự án đã có sẵn hàm bỏ dấu ở nơi khác: src/shared/assignee-pick.ts:23-25 (ô chọn người phụ trách, cùng form lập đơn) và web/sessions.ts:26; ADR-0067 dòng 31 và 68 viết rõ ô chọn người lập "không dấu cũng khớp" — tức không có tiền lệ cho việc bắt gõ đúng dấu. Docs/CHANGE-GUIDE.md:458 chỉ ghi "Tìm kiếm LIKE không bỏ dấu tiếng Việt" như một cái bẫy đã biết (nói về tìm đơn ở orders/repository.ts:507), không phải quyết định thiết kế.
>   - *Rào chắn đã thấy:* Không có rào chắn chặn được lỗi. Chỉ có các đường vòng một phần: (a) gõ theo mã dịch vụ (so khớp `c.code.toLowerCase()`, mã vốn không dấu) hoặc gõ phần đầu tên còn trước chữ có dấu ("tour", "tour 4", "nha trang" vẫn ra); (b) bỏ trống ô tìm và dùng ba nút "★ Hay dùng / Theo người / Giá theo nhóm" cùng chip nhóm dịch vụ (src/shared/loc-danh-muc.ts:27-29,57-61) để thu hẹp rồi cuộn danh sách (trần 40 kết quả, web/catalog-picker.ts:29,157); (c) ghim ★ dịch vụ hay dùng. Không tìm thấy ADR/đặc tả nào quyết định "ô tìm dịch vụ phải đúng dấu": ADR-0058 Đ8 và góp ý YC-0003 chỉ nói "lọc theo tên/mã" (ADR-0058 dòng 28, 201), không nói gì về dấu; web/CLAUDE.md và docs/SYSTEM-DESIGN.md:998-1001 cũng không có.

### Nhóm: Dữ liệu và riêng tư

<a id="BH-20"></a>
#### 40. BH-20 · Góp ý/Báo lỗi nhận nguyên SĐT khách trong nội dung (và gửi email trích đoạn)

- **Vai:** mọi vai
- **Loại:** bất hợp lý (riêng tư)
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Vai: mọi vai. Mức: THẤP. Loại: bất hợp lý (riêng tư). **MỚI**.
- Thấy: Thực tập gửi "…khách gọi 0977000111" → 201 YC-0001, nội dung lưu nguyên số; route gửi email kèm `excerpt` nội dung (`src/modules/feedback/index.ts:100`). Trong khi ghi chú lần thu chặn chuỗi ≥ 8 chữ số (`src/modules/billing/service.ts:94`). Chưa kiểm email thật (không có mạng).
- Đề xuất: che dãy số dài trong trích đoạn email, hoặc nhắc người gửi không ghi SĐT khách.

<a id="BH-21"></a>
#### 41. BH-21 · "Sử dụng thông tin của tôi" rồi "Tạo hồ sơ mới" tạo hồ sơ khách trùng với chính nhân viên

- **Vai:** Bán hàng
- **Loại:** sai dữ liệu
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng. Mức: THẤP. Loại: sai dữ liệu. **MỚI — có điều kiện**: hồ sơ nhân viên ở máy thử không mang SĐT (`primaryPhone: null`), chưa kiểm production có như vậy không.
- Thấy: bấm nút → tra SĐT 0910000001 → "Chưa có hồ sơ nào dùng số này. Tạo hồ sơ mới"; lập đơn với `newBooker` = chính mình → hồ sơ thứ hai "Bán Hàng A" vai CUSTOMER bên cạnh hồ sơ STAFF (`bh/a8.mjs`, `pw/s8.mjs`).
- Đề xuất: khi điền thông tin của chính mình, tự gắn hồ sơ nhân viên thay vì gợi ý tạo mới.

<a id="VP-22"></a>
#### 42. VP-22 · Đổi SĐT đăng nhập của tài khoản sang số đang thuộc hồ sơ khách khác (0906777888 của "Nguyễn Văn Tâm") → 200, không cảnh…

- **Vai:** Quản trị / Nhân sự
- **Loại:** không nhất quán
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Đổi SĐT đăng nhập của tài khoản sang số đang thuộc hồ sơ khách khác (0906777888 của "Nguyễn Văn Tâm") → 200, không cảnh báo. Lúc tạo tài khoản thì có kiểm "hồ sơ khớp". `au1.mjs` (đã trả lại số cũ).

<a id="VP-16"></a>
#### 43. VP-16 · Tạo được địa điểm thứ hai trùng tên "Bến tàu du lịch Nha Trang" (khác mã) → hai dòng giống hệt trong ô chọn. Ngưng địa…

- **Vai:** Quản trị
- **Loại:** sai nghiệp vụ nhẹ
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Tạo được địa điểm thứ hai trùng tên "Bến tàu du lịch Nha Trang" (khác mã) → hai dòng giống hệt trong ô chọn. Ngưng địa điểm đang là nơi trả của chặng trong đơn đã xác nhận → 200, không cảnh báo (`misc1.mjs`; đã ngưng và đổi tên bản trùng sau khi thử).

<a id="VP-17"></a>
#### 44. VP-17 · Chính sách điều phối nhận bộ số tự mâu thuẫn: "giờ lái tối đa một ngày" 60 phút nhỏ hơn "lái liên tục tối đa" 240 phút…

- **Vai:** Toàn quyền
- **Loại:** sai nghiệp vụ nhẹ
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Chính sách điều phối nhận bộ số tự mâu thuẫn: "giờ lái tối đa một ngày" 60 phút nhỏ hơn "lái liên tục tối đa" 240 phút (201); "cảnh báo sát mốc" 600 phút lớn hơn mốc tối thiểu 360 (201). `cs1.mjs`, đã trả lại số gốc.

<a id="VP-18"></a>
#### 45. VP-18 · Tên tài khoản "😀😀 123" và "A" đều tạo được (201).

- **Vai:** Nhân sự
- **Loại:** dữ liệu bẩn
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Tên tài khoản "😀😀 123" và "A" đều tạo được (201). `b3.mjs`.

<a id="VP-19"></a>
#### 46. VP-19 · (a) Nhân sự không có quyền xem Danh bạ, nên khi người mới đã có trong Danh bạ (từng là khách), giao diện chỉ cho "Vẫn…

- **Vai:** Nhân sự
- **Loại:** bất hợp lý theo thiết kế
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

(a) Nhân sự không có quyền xem Danh bạ, nên khi người mới đã có trong Danh bạ (từng là khách), giao diện chỉ cho "Vẫn tạo hồ sơ mới … sau đó nhờ Quản trị gộp" → chủ động sinh hồ sơ trùng (ADR-0071 3b). (b) Nhân sự không xem/ghi được giấy tờ CCCD, bằng lái của nhân viên, cũng không đặt lại PIN cho người mình vừa tạo (ADR-0071 1e).

<a id="VP-23"></a>
#### 47. VP-23 · Thêm CCCD hết hạn từ 2020 cho HDV → 201, không cảnh báo (). Câu 403 khi Kế toán mở giấy tờ người khác thì rõ; câu 403…

- **Vai:** Quản trị
- **Loại:** dữ liệu
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Thêm CCCD hết hạn từ 2020 cho HDV → 201, không cảnh báo (`doc1.mjs`). Câu 403 khi Kế toán mở giấy tờ người khác thì rõ; câu 403 của Nhân sự ("chỉ dùng cho việc được giao") thì không.

### Nhóm: Câu báo và tin báo sai hoặc gây hiểu nhầm

<a id="HT-16"></a>
#### 48. HT-16 · Câu báo sai khi "Đã trả" khách chưa đón: "Khách này đã có kết quả — không đổi được."

- **Vai:** Tài xế
- **Loại:** câu báo sai
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế. **Mức:** THẤP. **Loại:** câu báo sai.
- **Tái hiện:** khách `WAITING`, `POST …/phan-bo/:aid/tra` → 409 `suat_da_co_ket_qua`. **Mong đợi:** "Khách chưa lên xe — bấm Đã đón trước." **Bằng chứng:** `kiem-vai/ht/s16.mjs`; `dieu-phoi-tien-do.ts:145`. **MỚI.**

<a id="HT-17"></a>
#### 49. HT-17 · Tạo chuyến khi xe đang có lịch bận: tiêu đề lỗi "Xe trùng giờ với chuyến khác."

- **Vai:** Điều phối
- **Loại:** câu báo sai
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- **Vai:** Điều phối. **Mức:** THẤP. **Loại:** câu báo sai.
- **Tái hiện:** xe 79B-111.22 có lịch bận "Sửa chữa 06:00–18:00 05/10"; tạo chuyến 09:00 cùng ngày → 409 `trung_gio_xe` message "Xe trùng giờ với chuyến khác." (dòng chi tiết mới nói "lịch xe bận: Sửa chữa…"). Cùng kiểu ở HT-03 (chuyến khác ngày vẫn bị gọi "trùng giờ"). **Bằng chứng:** `kiem-vai/ht/s30.mjs`. **MỚI.** **Đề xuất:** tiêu đề "Xe đang bận (Sửa chữa) trong khung này".

<a id="HT-20"></a>
#### 50. HT-20 · Tin "Văn phòng vừa sửa chuyến … — mở để xem giờ, xe, điểm" bắn cả khi chỉ phá lệ khoảng nghỉ

- **Vai:** Tài xế
- **Loại:** trải nghiệm kém (tin nhiễu)
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế. **Mức:** THẤP. **Loại:** trải nghiệm kém (tin nhiễu).
- **Tái hiện:** Quản trị `PUT /chuyen/CX-0210-03` giữ nguyên xe, tài xế, giờ, chỉ thêm `nghiPhaLe` → tài xế nhận "Văn phòng vừa sửa chuyến CX-0210-03 ngày 02/10 — mở để xem giờ, xe, điểm". **Bằng chứng:** `kiem-vai/ht/s15.mjs`, `s17.mjs` (hộp thông báo tx2). **MỚI.**

<a id="HT-21"></a>
#### 51. HT-21 · Tin "Có đơn mới …, chưa có người phụ trách" gửi HDV mở ra "Không tìm thấy đơn."

- **Vai:** Hướng dẫn viên
- **Loại:** thiếu lối đi
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- **Vai:** Hướng dẫn viên. **Mức:** THẤP. **Loại:** thiếu lối đi.
- **Tái hiện:** HDV A bấm tin → `/order?id=<TD-…0001>` (chưa nhận) → màn "Không tìm thấy đơn. / Tải lại đơn" (4 lần 404 trong console). Muốn "Nhận" phải tự vào Tôi › Việc của tôi › Đơn chờ nhận.
- **Bằng chứng:** ảnh `hdv-don-chua-nhan.png`. **MỚI** (liên quan GD-D-01 "HDV không có tab Đơn hàng", nhưng đây là liên kết tin dẫn vào ngõ cụt). **Đề xuất:** tin `cho_nhan` cho người chỉ có `order.pool.view` trỏ về "Đơn chờ nhận".

<a id="BH-14"></a>
#### 52. BH-14 · Mở đơn người khác (Thực tập/Đối tác) báo "…mới được thay đổi đơn này" dù chỉ xem

- **Vai:** nhiều vai
- **Loại:** câu báo sai
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: câu báo sai. **MỚI**.
- Thấy: `GET /api/orders/<đơn của A>` bằng Thực tập/Đối tác → 403 "Chỉ người lập đơn, người phụ trách đơn hoặc quản trị viên mới được thay đổi đơn này." (`bh/a5.mjs`, `bh/a6.mjs`). Route xem dùng chung hằng FORBIDDEN của route ghi (`src/modules/orders/index.ts` ~dòng 715).
- Đề xuất: câu riêng cho xem: "Bạn chỉ xem được đơn do chính mình lập."

<a id="BH-15"></a>
#### 53. BH-15 · Thực tập bấm nhận đơn chính mình lập bị chặn bằng câu nói "người lập đơn … được"

- **Vai:** nhiều vai
- **Loại:** câu báo sai/tự mâu thuẫn
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: câu báo sai/tự mâu thuẫn. **MỚI**.
- Thấy: `PUT /api/orders/<đơn TT lập>/handler {staffId: chính mình}` → 403 "Chỉ người lập đơn, người phụ trách hiện tại hoặc quản trị viên mới được đổi người phụ trách…" — người gọi chính là người lập. Đặc tả 2026-09-24 Q20 lại nói Thực tập tự nhận đơn mình lập (chưa thi công). Giao diện Thực tập không có khối "Người phụ trách" nên đơn cứ "Chờ nhận" mà Thực tập không biết.
- Đề xuất: câu báo nói đúng lý do ("Thực tập chưa được nhận phụ trách — nhờ Bán hàng"), và cho Thực tập thấy trạng thái người phụ trách.

<a id="BH-16"></a>
#### 54. BH-16 · Sửa đơn đã huỷ báo như đơn "đã xác nhận"

- **Vai:** nhiều vai
- **Loại:** câu báo sai
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: câu báo sai. **MỚI**.
- Thấy: `PUT /api/orders/<đơn đã huỷ>` → 409 "Chỉ sửa được đơn đang chờ xác nhận. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới." (`bh/a15.mjs`, TD-20261002-0028).
- Đề xuất: câu riêng "Đơn đã huỷ, không sửa được." (như route hành khách đã có).

<a id="VP-20"></a>
#### 55. VP-20 · Tài khoản bị ngưng đăng nhập nhận "Số điện thoại hoặc mã PIN không đúng." (401) → người dùng tưởng nhập sai PIN và thử…

- **Vai:** mọi tài khoản
- **Loại:** khó dùng (chưa rõ có cố ý không)
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Tài khoản bị ngưng đăng nhập nhận "Số điện thoại hoặc mã PIN không đúng." (401) → người dùng tưởng nhập sai PIN và thử tiếp tới khi bị khoá. `ng1.mjs`.

<a id="VP-26"></a>
#### 56. VP-26 · Gộp hồ sơ khách vào hồ sơ nhân viên mình không quản lý được → "Tài khoản này không gộp được: …" ("Tài khoản này" ở đây…

- **Vai:** Quản trị
- **Loại:** chữ
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Gộp hồ sơ khách vào hồ sơ nhân viên mình không quản lý được → "Tài khoản này không gộp được: …" ("Tài khoản này" ở đây lại chỉ người đang thao tác). `pt3.mjs`.

<a id="BH-25"></a>
#### 57. BH-25 · Lỗi đồng bộ Sheet hiện cho Bán hàng kèm hướng dẫn chỉ quản trị làm được

- **Vai:** nhiều vai
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: trải nghiệm kém. **MỚI — có điều kiện** (chỉ khi đồng bộ lỗi; ở máy thử lỗi là do không có mạng, bản thân lỗi KHÔNG phải phát hiện).
- Thấy: form lập đơn hiện khung vàng "Chưa cập nhật được giá mới từ Google Sheet (Sheet không còn cho đọc công khai (hãy bật chia sẻ "Bất kỳ ai có đường liên kết – Người xem"))…" — người bán không làm được việc đó.
- Đề xuất: với người không quản trị danh mục chỉ ghi "Giá có thể chưa mới nhất — kiểm tra lại trước khi gửi khách".

<a id="BH-18"></a>
#### 58. BH-18 · Hộp thông báo của Bán hàng nhiều tin trùng/khó hiểu

- **Vai:** nhiều vai
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: trải nghiệm kém. **MỚI**.
- Thấy (`bh/a9.mjs`, `bh/a19.mjs`): mỗi đơn của người khác sinh hai tin "Có đơn mới X" và "Có đơn mới X, chưa có người phụ trách"; tin thứ hai thực ra phát lúc đơn được **xác nhận** (`src/shared/thong-bao.ts:38,46`) nhưng câu lại nói "đơn mới"; mọi Bán hàng nhận tin cả đơn nháp của Thực tập và tin huỷ đơn không liên quan.
- Đề xuất: gộp thành một tin, câu theo đúng sự kiện ("… vừa được xác nhận, chưa có người phụ trách").

### Nhóm: Bố cục và hiển thị

<a id="VP-13"></a>
#### 59. VP-13 · Nút nổi "Hỗ trợ" che số tiền và liên kết "Đảo" ở khối Thanh toán trên máy tính 1280. Trên điện thoại 390, nút này che…

- **Vai:** mọi vai
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Nút nổi "Hỗ trợ" che số tiền và liên kết "Đảo" ở khối Thanh toán trên máy tính 1280 (ảnh `kt-d-o9-hai-nut.png`, `kt-d-order_id_75c139d8-….png`). Trên điện thoại 390, nút này che dòng "Chỉnh riêng cho người này", còn thanh điều hướng dưới che nút "Tạo tài khoản" (ảnh `ns-m-tao-dbl.png`).

<a id="BH-23"></a>
#### 60. BH-23 · Nút nổi "Hỗ trợ" che nội dung

- **Vai:** nhiều vai
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: trải nghiệm kém. **MỚI**.
- Thấy: che dòng cuối hộp lỗi "Chưa lưu được — kiểm tra lại" ở form (`06-save-empty.png`), che số tiền thẻ đơn cuối màn danh sách (`30-orders-list.png`), che chữ khối phiên đăng nhập (`27-account.png`).
- Đề xuất: chừa đệm dưới bằng chiều cao nút, hoặc thu nhỏ nút khi cuộn.

<a id="HT-22"></a>
#### 61. HT-22 · Màn tài xế: nút nổi "Hỗ trợ" nằm sát "Kết thúc gián đoạn" ở đáy trang; khi chưa cuộn hết nó đè lên "Kết thúc chuyến"

- **Vai:** Tài xế
- **Loại:** trải nghiệm kém (dễ bấm nhầm ngoài hiện trường)
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế. **Mức:** THẤP. **Loại:** trải nghiệm kém (dễ bấm nhầm ngoài hiện trường).
- **Bằng chứng:** ảnh `tx-T2-sau-xuat-ben.png` (đè "Kết thúc chuyến"), `tx2-T9-cuoi-390.png` (sát "Kết thúc gián đoạn"). **MỚI.** **Đề xuất:** ẩn nút nổi ở màn chạy chuyến hoặc chừa lề đáy.

<a id="BH-12"></a>
#### 62. BH-12 · Thẻ đơn trên điện thoại cắt mất số khách

- **Vai:** mọi vai xem danh sách đơn
- **Loại:** trải nghiệm kém (iPhone)
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Vai: mọi vai xem danh sách đơn. Mức: THẤP. Loại: trải nghiệm kém (iPhone). **MỚI**.
- Thấy: ở 390px cột số khách bị cắt còn "1N", "2N", thẻ "3NL 1TE" chỉ còn dấu ":"; ở 375px biểu tượng số khách cũng mất. Ảnh `30-orders-list.png`, `41-dt-375-orders.png`.
- Đề xuất: cho số khách xuống dòng hoặc rút tên khách thay vì cắt số khách.

<a id="BH-22"></a>
#### 63. BH-22 · Bộ lọc đơn: ô "Đến ngày" tràn ra ngoài màn hình 390px

- **Vai:** nhiều vai
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: trải nghiệm kém. **MỚI** — thấy trên Chromium; chưa thử Safari iPhone thật (ô ngày iOS dựng khác).
- Ảnh `31-orders-filter.png`.

<a id="VP-14"></a>
#### 64. VP-14 · Nhật ký trên điện thoại 390: ô chọn "Mọi hành động" rộng 424 px làm trang kéo ngang (scrollWidth 440 > 390; pw/ tq…

- **Vai:** Toàn quyền
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Nhật ký trên điện thoại 390: ô chọn "Mọi hành động" rộng 424 px làm trang kéo ngang (scrollWidth 440 > 390; `pw/ovf.mjs tq /audit`, ảnh `tq-m-audit-viewport.png`). Trong danh sách hành động có mục "Máy dùng app bản cũ" (luật: dùng "Nền tảng", không dùng "app").

<a id="HT-19"></a>
#### 65. HT-19 · Bảng điều phối 1280: chuyến buổi tối nằm ngoài khung nhìn, không dấu hiệu cuộn; tiêu đề nhóm "NHÀ XE NHÀ XE HẢI ÂU"

- **Vai:** Điều phối
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- **Vai:** Điều phối. **Mức:** THẤP. **Loại:** trải nghiệm kém.
- **Tái hiện:** ngày 04/10 có 4 chuyến (04:30, 07:00, 21:30, 23:00). Dòng thời gian hiện thang 05–18, đầu khung ghi "4 chuyến" nhưng chỉ thấy 2 khối; khối 21:30 / 23:00 phải cuộn ngang trong khung `dp-tl-cuon` (scrollWidth 810 > 586), không có thanh cuộn hiện trong ảnh. Nhóm xe nhà xe hiện "NHÀ XE NHÀ XE HẢI ÂU" (nhãn nhóm + tên có sẵn chữ "Nhà xe").
- **Bằng chứng:** ảnh `qt-dieu-phoi-0410-b.png`. **MỚI.** **Đề xuất:** tự cuộn tới chuyến sớm nhất/đang chạy, mũi tên "còn N chuyến bên phải"; bỏ tiền tố khi tên đã có "Nhà xe".

<a id="VP-25"></a>
#### 66. VP-25 · Trên điện thoại, tiền viết tắt trộn đơn vị: "599k ₫", "2,3tr ₫" (Trang chủ, danh sách đơn), trong khi máy tính ghi đủ…

- **Vai:** Kế toán
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Trên điện thoại, tiền viết tắt trộn đơn vị: "599k ₫", "2,3tr ₫" (Trang chủ, danh sách đơn), trong khi máy tính ghi đủ "599.000 ₫".

<a id="VP-24"></a>
#### 67. VP-24 · Biên nhận (GET /api/orders/:id/receipt) chỉ có tổng "đã trả" và "còn lại", không liệt kê từng lần thu (ngày, hình thức)…

- **Vai:** Kế toán
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Biên nhận (`GET /api/orders/:id/receipt`) chỉ có tổng "đã trả" và "còn lại", không liệt kê từng lần thu (ngày, hình thức) → khách và Kế toán không đối chiếu được từng khoản.

<a id="HT-18"></a>
#### 68. HT-18 · "Bản chụp lúc xuất bến": hai dòng "Giấy tờ xe" không ghi loại; không ghi đã phá lệ khoảng nghỉ

- **Vai:** Điều phối
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- **Vai:** Điều phối. **Mức:** THẤP. **Loại:** trải nghiệm kém.
- **Tái hiện:** CX-0210-03 xuất bến sau khi Quản trị phá lệ khoảng nghỉ (`nghiPhaLe`). Khối bản chụp: "Đạt · 22:55 · 79B-678.90 · 29 chỗ · 3 khách · nghỉ 30 phút", rồi "Giấy tờ xe — hạn 06/11/2027" ×2 (không biết dòng nào là Kiểm định, dòng nào Bảo hiểm).
- **Bằng chứng:** ảnh `qt-T9-bam-thay.png`; `src/shared/dieu-phoi-man.ts:406` (`GIAY_TO_XE: "Giấy tờ xe"`). **MỚI.** **Đề xuất:** ghi tên loại giấy tờ và "phá lệ khoảng nghỉ: <lý do>".

<a id="HT-15"></a>
#### 69. HT-15 · "Cuốc của tôi" chỉ có Hôm nay / Ngày mai / Ngày kia, không xem trước hơn, không xem lại

- **Vai:** Tài xế công ty
- **Loại:** khó dùng
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- **Vai:** Tài xế công ty. **Mức:** THẤP. **Loại:** khó dùng.
- **Tái hiện:** tài xế có chuyến 05/10, 07/10, 08/10 (đã nhận tin "Bạn được xếp lái chuyến CX-0810-02 ngày 08/10"). Màn `/cuoc` chỉ ba nhóm tới 04/10, không nút chọn ngày, không ô nhập. API `GET /cuoc-cua-toi?tu=…&den=…` trả được cả 7 chuyến và lịch sử 30 ngày.
- **Bằng chứng:** ảnh `tx-cuoc2.png`; BUTTONS không có điều khiển ngày.
- **MỚI** (tài liệu `docs/VAN-CHUYEN.md` §3.5 còn ghi "hai nhóm" — tài liệu mô tả lệch mã). **Đề xuất:** thêm "Tuần này" / chọn ngày và "Đã chạy".

### Nhóm: Chữ, nhãn và lối đi

<a id="BH-11"></a>
#### 70. BH-11 · "Đang giữ đơn: Chưa tới ngày đi — bấm từ ngày đi trở đi. Ai xử lý: Hướng dẫn viên." hiện cho mọi đơn đã xác nhận, kể cả…

- **Vai:** Bán hàng, Đối tác
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Vai: Bán hàng, Đối tác. Mức: THẤP–TRUNG BÌNH. Loại: trải nghiệm kém. **MỚI**.
- Mô tả: câu nói về nút "Đã giao" (của HDV) nhưng hiện cho người không có nút; chữ "Đang giữ đơn" nghe như đơn bị treo/có vấn đề; "bấm" không nói bấm gì. Đối tác đọc câu này trên đơn của khách mình.
- Tái hiện: mở chi tiết đơn đã xác nhận (TD-20261002-0023 bằng Đối tác, TD-20261002-0001 bằng Bán hàng). `pw/s12.mjs`, ảnh `24-desk-receipt.png` (nền phải).
- Mã: `web/order.ts:458-462`, câu ở `src/modules/billing/rules.ts:179`.
- Đề xuất: chỉ hiện cho người có quyền bấm "Đã giao"; với người khác thì không hiện, hoặc viết "Chưa tới ngày đi — HDV sẽ chốt giao sau chuyến".

<a id="BH-13"></a>
#### 71. BH-13 · Gọi ngày đi là "Đón"/"ngày đón" kể cả khi đơn "Không đưa đón"

- **Vai:** mọi vai
- **Loại:** chữ khó hiểu
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Vai: mọi vai. Mức: THẤP. Loại: chữ khó hiểu. **MỚI**.
- Thấy: khối đầu chi tiết đơn ghi "ĐÓN 07/10" trong khi khối Đưa đón ghi "Không đưa đón"; danh sách đơn ghi "Chưa có ngày đón" cho đơn chưa có ngày đi. Ảnh `13-order-detail-top.png`; `pw/s16.mjs`.
- Đề xuất: đổi nhãn thành "Ngày đi".

<a id="BH-24"></a>
#### 72. BH-24 · Chữ: "app" trong câu chào trợ lý; ba kiểu ghi phiên bản; định dạng ngày lệch

- **Vai:** nhiều vai
- **Loại:** chữ
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: chữ. **MỚI**.
- Thấy: câu chào "…cần hỏi gì về cách dùng app…" (`src/shared/xung-ho.ts:40`, trái luật dùng "Nền tảng" chủ ra hôm nay); phiên bản ghi "V1.77" (đăng nhập), "Phiên bản 1.77" (Trợ giúp), "bản 20261002153934" (Góp ý); Góp ý ghi ngày "2/10/26" trong khi chỗ khác "02/10/2026".

<a id="BH-26"></a>
#### 73. BH-26 · Nhãn vai lệch: Bán hàng thấy nhóm "QUẢN TRỊ"; danh sách chọn người phụ trách gọi Toàn quyền và người kiêm Bán hàng là…

- **Vai:** nhiều vai
- **Loại:** chữ khó hiểu
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: chữ khó hiểu. **MỚI**.
- Thấy: thanh bên máy tính của Bán Hàng A có nhóm "QUẢN TRỊ → Vận chuyển, Điều phối xe" (`pw/s10.mjs`); `GET /api/dispatch/assignees`: "Toàn Quyền" `roleLabel: "Quản trị"`, "Bán Hàng Kiêm Quản Trị" `roleLabel: "Quản trị"` (`bh/a17.mjs`).

<a id="BH-27"></a>
#### 74. BH-27 · Thực tập/Đối tác mở thẳng /catalog hoặc /parties thấy đủ nút quản trị kèm câu cấm

- **Vai:** nhiều vai
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: trải nghiệm kém. **MỚI**. (Không có lối vào từ menu; chỉ khi gõ/nhận đường dẫn.)
- Thấy: /catalog hiện "Chỉ quản trị viên được vào trang này." cùng nút "Đồng bộ ngay từ Google Sheet" và các chip lọc; /parties hiện "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này." (câu dành cho HDV) cùng đủ bộ lọc. Ảnh `11-tts-catalog.png`, `11-dt-parties.png`.
- Đề xuất: trang không có quyền chỉ hiện một câu và nút về trang chủ.

<a id="BH-28"></a>
#### 75. BH-28 · Lưu nháp xong tự bật hộp "Xác nhận đơn để gửi khách"

- **Vai:** nhiều vai
- **Loại:** bất hợp lý theo thiết kế (đặc tả "Việc 2", `web/order-form
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

- Mức: THẤP. Loại: bất hợp lý theo thiết kế (đặc tả "Việc 2", `web/order-form.ts:470`).
- Thấy: vừa lưu đơn **nháp** đã bật hộp ảnh tiêu đề "XÁC NHẬN ĐƠN DỊCH VỤ" (nhãn "Chờ xác nhận") với nút "Tải ảnh PNG"; chính trang Trợ giúp khuyên "Nên gửi **sau** khi xác nhận". Ảnh `08-after-save.png`. Dễ gửi nhầm ảnh nháp cho khách.
- Đề xuất: chỉ tự bật sau khi xác nhận; với nháp đổi tiêu đề ảnh thành "BÁO GIÁ / ĐƠN CHỜ XÁC NHẬN".

<a id="VP-12"></a>
#### 76. VP-12 · Trang chủ của Kế toán hiện ô "Doanh thu của tôi 0 ₫", "Chờ xác nhận — Cần xác nhận đơn" (Kế toán không xác nhận được),…

- **Vai:** Kế toán
- **Loại:** bất hợp lý theo thiết kế
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Trang chủ của Kế toán hiện ô "Doanh thu của tôi 0 ₫", "Chờ xác nhận — Cần xác nhận đơn" (Kế toán không xác nhận được), "Chưa phụ trách". Thanh bên đặt "Đơn hàng" dưới đầu mục "BÁN HÀNG", "Điều phối xe" dưới "QUẢN TRỊ". Trang đơn luôn hiện câu "Chỉ Bán Hàng A … hoặc quản trị viên mới được sửa…" ở đầu. Ảnh `kt-d-root.png`, `kt-d-order_id_75c139d8-….png`.

<a id="VP-15"></a>
#### 77. VP-15 · Mở trang không có quyền bằng đường dẫn thì trang vẫn dựng đầy đủ rồi mới báo: /audit của Quản trị hiện cả ô lọc ~80…

- **Vai:** Quản trị / Nhân sự
- **Loại:** trải nghiệm kém
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Mở trang không có quyền bằng đường dẫn thì trang vẫn dựng đầy đủ rồi mới báo: `/audit` của Quản trị hiện cả ô lọc ~80 hành động và tiêu đề bảng; `/parties` của Nhân sự hiện ô Tìm, "+ Hồ sơ mới", danh sách nơi làm, kèm câu "Tài khoản này chỉ dùng cho việc được giao" (không đúng với Nhân sự). Chữ "Toàn quyền" lộ ở câu 403 tiền ("…người phụ trách hệ thống (Toàn quyền)…") và trang Phiên đăng nhập ("(IT, Toàn quyền)"), trong khi danh sách tài khoản che Toàn quyền thành "Quản trị" (ADR-0042).

<a id="VP-21"></a>
#### 78. VP-21 · Danh sách "Quản lý tài khoản" không có ô tìm, không lọc theo vai/trạng thái, không sắp theo tên.

- **Vai:** Quản trị / Nhân sự
- **Loại:** khó dùng
- **Mức:** Ít nghiêm trọng (người tìm gán; chưa kiểm độc lập)
- **Tình trạng:** Mới
- **Hướng xử lý:** Chưa đánh giá (chưa kiểm độc lập)
- **Kiểm độc lập:** Chưa kiểm độc lập

**Báo cáo gốc của người tìm:**

Danh sách "Quản lý tài khoản" không có ô tìm, không lọc theo vai/trạng thái, không sắp theo tên (ảnh `ns-d-staff.png`).

---

## Phụ lục A. Lỗi đã biết, gặp lại khi kiểm thử (không tính vào số lỗi mới)

**Bán hàng · Thực tập · Đối tác**

- **G1 / 09, 26**: danh sách đơn ghi "Còn thu 700k" cho đơn **đã huỷ** của Thực tập (đã thu 200.000); huỷ đơn đã xác nhận không cần lý do (Đợt 1 Task 6).
- **GD-B-01 (ADR-0065)**: đơn TOUR4D 2NL+1TE và VINWON 1NL hiện "Số khách 3 người lớn, 1 trẻ em", "Hành khách 0/3".
- **GD-D-02**: "Không thể chuyển đơn từ \"confirmed\" sang \"confirmed\"" / "\"cancelled\" sang \"cancelled\"".
- **05 / GD-R-08**: xác nhận đơn ngày đi đã qua báo "Chưa đủ thông tin chuyến…" (`past_date`).
- **02/03**: Bán hàng đặt đơn giá 0đ / 1đ, giảm bằng tạm tính → tổng 0đ, tự xác nhận 200.
- **G10**: hành khách "Bé Na" sinh 1950 gắn trẻ em, "Ông Ba" sinh 2026 gắn người lớn → 201.
- **G5**: Bán hàng/Thực tập có "Sổ của tôi" ở máy chủ (`/api/ledger/mine` → "đang giữ 500.000" cả khi khai "Công ty thu") nhưng không có màn nào hiện.
- **10**: tìm đơn không dấu / SĐT có khoảng trắng (xem BH-03).
- **KD05**: xem BH-19.

**Kế toán · Quản trị · Toàn quyền · Nhân sự**

- **TNV-G1**: đơn huỷ TD-20261002-0003 sau khi hoàn đủ 500.000 vẫn ghi "Còn thu 1.540.000 ₫" ở danh sách, trang đơn và biên nhận.
- **TNV-G4 / KT05**: đảo lần thu với lý do "x" → 201.
- **KT10**: `audit-invariants` thoát 0 khi sổ Bán hàng A −300.000.
- **G5 / KT01**: Kế toán không có màn sổ công nợ (`GET /api/ledger` chỉ gọi được qua API).
- **GD-P-01**: tạo tài khoản trả PIN về cho người tạo (Nhân sự thấy PIN).
- **GD-P-02**: CCCD trùng trả 409 `cccd_taken` "đã có ở một hồ sơ khác".
- **HD09 / QT03 (Đợt 4)**: Nhân sự ngưng Bán hàng B đang giữ 1.300.000 → 200, không cảnh báo; sổ vẫn treo tiền trên người đã ngưng.

**Hướng dẫn viên · Tài xế · Điều phối**

- Tài xế đối tác không thấy chuyến được xếp (trang chủ "Cuốc xe của bạn sẽ hiện ở đây", `/cuoc` 403 "Tài khoản này không có cuốc xe.") dù văn phòng xếp được họ vào CX-0710-02; ô chọn tài xế không nhắc điều này — **rà soát 1/10 mục 1** (ADR-0053 chưa thi công).
- Văn phòng sửa điểm đón khi xe đang chạy: "Cập nhật điểm theo đơn" 409 `xe_dang_chay`, tài xế vẫn đi điểm cũ (màn văn phòng có cảnh báo "gọi tài xế") — **rà soát 1/10 mục 2** (ADR-0052 D5).
- Huỷ đơn đã xếp xe: chuyến bị giữ "Có đơn đã huỷ…", không tự rút, tài xế không có tin — **BACKLOG §15 câu 9** (LC-09, cố ý).
- HDV không thấy xe / tài xế của đơn mình (`xe-cua-don` 403) — **ADR-0064 (đề xuất)**, rà soát 1/10 "Giới hạn theo quyền".
- "Việc của tôi" chỉ hiện giờ/điểm đón chiều đi (`pickupTime/pickupPlace` cũ), không chiều về, không nơi trả — rà soát 1/10 "Chờ chủ quyết: 'Việc của tôi' hiện chặng".
- Mất mạng: dòng "Mất mạng — 1 thao tác chưa gửi được", phải bấm lại tay — `docs/VAN-CHUYEN.md` §2.3/§3.5 điểm 7.
- Chuyến 14 giờ (06:00–20:00) tạo không cảnh báo giờ lái — **rà soát 1/10 mục 8** (ADR-0055 VK2-B).
- Ô chọn tài xế không hiện hạng bằng lái — **BACKLOG Q-B-7**; thẻ cuốc không có giờ kết thúc dự kiến — **Q-B-12**.
- Sửa số khách / chặng sau xác nhận không báo ai (HDV, tài xế, văn phòng) — **G8** (KD08, HD01…), Đợt 4.

## Phụ lục B. Điều đã kiểm và chạy đúng

**Kế toán · Quản trị · Toàn quyền · Nhân sự**

- ADR-0090: Quản trị đặt lại PIN Kế toán 403; Quản trị gán vai Kế toán / cộng quyền ACCOUNTING 403; Nhân sự tạo tài khoản Kế toán (cả đường vai lẫn đường cũ) 403; cờ "Đặt lại PIN" ẩn đúng ở dòng Kế toán.
- LC-4: Nhân sự tạo Giám đốc / Hành chính nhân sự, tự thêm vai 403. Quản trị sửa tài khoản Nhân sự / Toàn quyền 403. Tự ngưng mình 409.
- Quản trị tạo tài khoản 403 (ADR-0071). Quản trị đọc Góp ý của người khác 404; Quản trị gửi thông báo 403.
- Giấy tờ: chỉ Toàn quyền "xem đủ số" (Quản trị 403); nhật ký giấy tờ không chứa số; danh sách che số.
- Chống ghi trùng / đua: Kế toán + Toàn quyền cùng xác nhận một khoản CK → 200/409; cùng hoàn 500.000 song song → 201/400; dấu nhập phần mềm kế toán từ tab cũ → 409 `stale`.
- Đặt gấp: Kế toán 403, thiếu lý do 400; sửa giờ đón của nháp xoá dấu đặt gấp → xác nhận lại bị 409.
- Giao diện công ty: màu chữ trùng màu nền bị chặn (độ tương phản 1:1). Xe: số chỗ 0/500, biển số rác bị chặn; Kế toán thêm xe 403.
- Hoàn thành: chặn khi chưa Đã giao, và khi còn người giữ tiền; Quản trị bấm Đã giao kèm lần thu, Kế toán ghi nộp, Hoàn thành 200.

**Hướng dẫn viên · Tài xế · Điều phối**

Mốc 6 giờ chặn xác nhận + câu báo rõ, Bán hàng đặt gấp 403, Quản trị/Toàn quyền đặt gấp 200 (màn có hộp lý do); hạng bằng D1 không lái xe 29 chỗ; vùng khoá 6 giờ chặn đổi xe/tài xế (Bán hàng `canQuyen:false`, Quản trị cần phá lệ); giờ khai bấm thay: tương lai / lùi quá 180 phút / trước chuyến trước đều 409 có câu tiếng Việt; trùng xe, trùng tài xế, giờ kết thúc trước bắt đầu, vượt số chỗ (20/16) đều 409 rõ; hai văn phòng xếp cùng chặng đồng thời → một 200, một 409 "Xếp quá số khách của chặng 8/4"; tài xế khác / Bán hàng gọi route tài xế → 404/403; tài xế gọi route văn phòng, đơn, hành khách → 403; tài xế bị đổi ra nhận "Bạn không còn lái…" và 404 chuyến cũ; "Vắng/Đã đón" trước "Đã tới" → 409 "bấm Đã tới trước"; "Kết thúc chuyến" khi còn khách → 409 kèm gợi ý gián đoạn; kết thúc gián đoạn bắt chọn lý do, Quản trị nhận tin; khách vắng → tin cho người lập; tạo chuyến qua đêm bằng giao diện; khung bận xe chồng chuyến → 409 nêu đúng mã chuyến; màn tài xế 320/390 không tràn ngang; bảng điều phối trên điện thoại có tab Chưa xếp / Xe / Cần xử lý.

## Phụ lục C. Nghi ngờ chưa xác nhận và phần chưa kiểm được

**Nghi ngờ chưa xác nhận — Bán hàng · Thực tập · Đối tác**

- BH-04 có thể xảy ra cả khi phiên hết hạn tự nhiên (chưa chờ hết hạn để thử).
- Hộp `confirm()` gốc của trình duyệt khi xác nhận đơn: trên PWA iPhone có thể hiện tên miền ở đầu hộp — chưa thử máy thật.
- Ô ngày hiện "mm/dd/yyyy" trên Chromium headless dù đặt locale vi-VN — trên iPhone là bộ chọn ngày gốc, không coi là phát hiện.

**Nghi ngờ chưa xác nhận — Hướng dẫn viên · Tài xế · Điều phối**

- Định dạng ô ngày/giờ hiện kiểu Mỹ ("10/04/2026", "11:02 PM") trong ảnh — do trình duyệt thử chạy tiếng Anh; trên iPhone tiếng Việt chưa kiểm.
- Thanh cuộn ngang dòng thời gian (HT-19) trên macOS/iPad (thanh cuộn ẩn) — chưa kiểm máy thật; trên Chromium headless không thấy thanh cuộn.

**Chưa kiểm được — Bán hàng · Thực tập · Đối tác**

- Safari/iPhone thật, PWA đã cài, Face ID, thông báo đẩy, chia sẻ qua Zalo (không có thiết bị/mạng).
- Email Góp ý thật, đồng bộ Sheet (không có mạng — đúng như dặn).
- Chặng đưa đón đầy đủ qua giao diện (mốc 6 giờ, đặt gấp) — thuộc nhóm văn phòng; chỉ thử một chặng qua API.
- Huỷ đơn qua giao diện (hộp xác nhận, lý do) — phần tiền đã thuộc G1 nên không đi sâu.
- Hết hạn phiên tự nhiên; khoá đăng nhập sau nhiều lần sai (tránh khoá tài khoản dùng chung với nhóm khác).
- Trợ lý "Hỗ trợ" trả lời (máy thử trỏ cổng chết).

**Chưa kiểm được — Kế toán · Quản trị · Toàn quyền · Nhân sự**

- Đồng bộ Google Sheet (không có mạng), trợ lý AI (không có khoá), Face ID, thông báo đẩy lên điện thoại.
- Không bật chế độ bảo trì, không đổi công ty chủ, không đóng Hotline (theo dặn).
- Xuất dữ liệu: Nền tảng không có chức năng xuất nên không kiểm được (ghi ở VP-10).
- Luồng chuyến xe đầy đủ (xếp, xuất bến) với vai văn phòng: chỉ xem trang, chưa chạy trọn chuyến.
- Nghi ngờ, chưa xác nhận: lệnh "Ngưng/Mở lại" gửi `active: !s.active` theo danh sách đang hiển thị, có thể làm ngược ý khi danh sách cũ. Chỉ đọc mã (`web/staff.ts:120,175`), chưa tái hiện được tình huống hại.

**Chưa kiểm được — Hướng dẫn viên · Tài xế · Điều phối**

- iPhone / iPad thật, Face ID, thông báo đẩy (Web Push tắt ở máy thử), Bảng tin thời gian thực.
- Đồng bộ danh mục Google Sheet (không mạng — không phải phát hiện).
- Tiền xe thuê, Từ chối / Báo bận của tài xế đối tác, cứu hộ, nhờ xe khác đón (chưa có mã — ADR-0052/0053/0057).
- Giấy phép lái xe hết hạn giữa chừng; gia hạn giấy tờ xe qua màn (route chạy được theo e2e, không bấm màn).

Giới hạn của đợt kiểm độc lập: người kiểm chỉ đọc mã (không chạy máy chủ), nên những chi tiết chỉ quan sát khi chạy thật (số hiệu đơn, mã trạng thái lúc chạy, ảnh chụp) được ghi "không kiểm lại được" trong `KIEM-DOC-LAP.md`. Một số người kiểm lưu ý báo cáo gốc ghi mã `dfee4a8c` là bản 1.77 còn đề bài nói 1.76. Đã đối chiếu: giữa bản 1.76 đang chạy (`51d76648`) và `dfee4a8c` chỉ khác 10 tệp chữ trợ giúp và bài thử của chúng, nên các lỗi ở đây áp cho cả bản đang chạy.

## Phụ lục D. Bảng tra toàn bộ lỗi

| # | Mã | Mức (sau kiểm) | Mức người tìm gán | Vai | Tiêu đề | Kiểm độc lập |
|---:|---|---|---|---|---|---|
| 1 | [VP-01](#VP-01) | Nghiêm trọng | Nghiêm trọng | Kế toán | Màn đơn mời Kế toán trừ hai lần cùng một khoản chuyển khoản. | Xác nhận |
| 2 | [HT-24](#HT-24) | Trung bình | Nghiêm trọng | Tài xế công ty | Qua 0 giờ, chuyến ĐANG CHẠY (còn khách trên xe) biến mất khỏi "Cuốc của tôi" | Xác nhận một phần |
| 3 | [HT-03](#HT-03) | Trung bình | Nghiêm trọng | Tài xế công ty (+ Quản trị gỡ) | Một chạm "Xuất bến" nhầm chuyến của 3 ngày sau: không hỏi lại, không sửa / huỷ được, khoá luôn xe +… | Xác nhận một phần |
| 4 | [HT-01](#HT-01) | Trung bình | Nghiêm trọng | Điều phối (Quản trị) → Tài xế công ty | Thứ tự điểm dừng tự dựng sai: điểm TRẢ chung đứng trước điểm ĐÓN của đơn xếp sau, mà chuyến vẫn… | Xác nhận một phần |
| 5 | [BH-08](#BH-08) | Trung bình | Trung bình | Thực tập | Thực tập tự đặt giá tuỳ ý, giảm giá tuỳ ý rồi tự xác nhận | Xác nhận một phần |
| 6 | [VP-05](#VP-05) | Trung bình | Trung bình | Kế toán | Form "Ghi lần thu" thiếu thứ Kế toán cần. | Xác nhận một phần |
| 7 | [VP-03](#VP-03) | Trung bình | Trung bình | Quản trị / Nhân sự | Sửa tài khoản không có khoá phiên bản; form cũ ghi đè SĐT đăng nhập mới mà không báo. | Xác nhận |
| 8 | [BH-19](#BH-19) | Trung bình | Trung bình | Bán hàng | Đồng nghiệp "Nhận" đơn rồi sửa tên khách, số khách, tổng tiền; người lập chỉ được báo "vừa nhận đơn" | Xác nhận một phần |
| 9 | [BH-02](#BH-02) | Trung bình | Trung bình | mọi người lập đơn | SĐT khách trên đơn chấp nhận số sai độ dài, lệch luật SĐT của hồ sơ | Xác nhận một phần |
| 10 | [BH-07](#BH-07) | Trung bình | Trung bình | Bán hàng | Bán hàng không sửa được số khách/dịch vụ sau khi xác nhận: phải huỷ và lập đơn mới | Xác nhận một phần |
| 11 | [BH-06](#BH-06) | Trung bình | Trung bình | Bán hàng (người phụ trách đơn đồng nghiệp lập) | Bán hàng là người phụ trách xác nhận được đơn nhưng không ghi được tiền khách đưa | Xác nhận |
| 12 | [HT-05](#HT-05) | Trung bình | Trung bình | Điều phối (Quản trị, Bán hàng) | "Sửa chuyến" không đổi được đồng thời xe + tài xế giữa xe công ty ↔ xe nhà xe: luôn 409 "tải lại… | Xác nhận |
| 13 | [HT-04](#HT-04) | Trung bình | Trung bình | Tài xế công ty, Quản trị | Bấm nhầm "Đã đón" / "Khách đã huỷ" không sửa lại được — kể cả văn phòng | Xác nhận một phần |
| 14 | [HT-02](#HT-02) | Trung bình | Trung bình | Tài xế công ty | Tài xế bấm "Đã trả" ở điểm trả khi chưa đón ai: máy nhận, nhật ký "tới điểm trả" trước "tới điểm… | Xác nhận |
| 15 | [HT-08](#HT-08) | Trung bình | Trung bình | Tài xế công ty, Điều phối | Màn ghi "Điều kiện xuất bến: Đạt hết" nhưng bấm Xuất bến bị 409 "Chưa đủ thời gian nghỉ … Ai xử lý:… | Xác nhận |
| 16 | [HT-06](#HT-06) | Trung bình | Trung bình | Bán hàng → Điều phối → Tài xế | Đổi giờ đón sớm hơn giờ xuất bến sau khi đã xếp: chuyến vẫn "Đạt hết", tài xế không được báo | Xác nhận một phần |
| 17 | [HT-10](#HT-10) | Trung bình | Trung bình | Tài xế → Bán hàng / Kế toán | Tài xế bấm "Khách đã huỷ" tại điểm đón: không ai được báo, đơn giữ nguyên số khách và tiền | Xác nhận một phần |
| 18 | [HT-13](#HT-13) | Trung bình | Trung bình | Hướng dẫn viên | HDV phụ trách được tăng số khách tại hiện trường nhưng không nhập được tên → chuyến bị giữ "thiếu… | Xác nhận một phần |
| 19 | [HT-09](#HT-09) | Trung bình | Trung bình | Điều phối | Tách đoàn: máy tự chọn người ngẫu nhiên lên xe, không màn nào chọn được người | Xác nhận một phần |
| 20 | [VP-02](#VP-02) | Trung bình | Trung bình | Nhân sự | Bấm đúp "Tạo tài khoản" làm mất PIN của tài khoản vừa tạo. | Xác nhận |
| 21 | [VP-04](#VP-04) | Trung bình | Trung bình | Kế toán / Toàn quyền | Lịch sử đơn và Nhật ký không cho truy vết tiền. | Xác nhận một phần |
| 22 | [BH-04](#BH-04) | Trung bình | Trung bình | Bán hàng (mọi vai lập đơn) | Bị đăng nhập ở máy khác giữa lúc lập đơn ⇒ mất toàn bộ nội dung đang nhập | Xác nhận |
| 23 | [HT-23](#HT-23) | Trung bình | Trung bình | Điều phối → Hướng dẫn viên | Gắn HDV làm "người đi kèm" lên xe nhưng HDV không được báo, không thấy xe / giờ / điểm hẹn; suất… | Xác nhận một phần |
| 24 | [VP-10](#VP-10) | Trung bình | Trung bình | Kế toán | Màn Đơn hàng không phục vụ đối chiếu. | Xác nhận |
| 25 | [VP-11](#VP-11) | Trung bình | Trung bình | Kế toán | Hộp thông báo của Kế toán đầy tin bán hàng, không có tin về tiền. | Xác nhận một phần |
| 26 | [VP-09](#VP-09) | Trung bình | Trung bình | mọi vai văn phòng | Danh sách đơn và Trang chủ ghép NGÀY ĐI với GIỜ ĐÓN của chặng, nên chặng đón tối hôm trước hiện sai… | Xác nhận một phần |
| 27 | [BH-03](#BH-03) | Trung bình | Trung bình | Bán hàng | Tìm đơn theo SĐT/tên lệch cách gõ (mở rộng mục 10) | Xác nhận |
| 28 | [VP-07](#VP-07) | Ít nghiêm trọng | Trung bình | Quản trị | Ghi đè giá danh mục không trần, không xác nhận, áp ngay. | Xác nhận một phần |
| 29 | [BH-05](#BH-05) | Ít nghiêm trọng | Trung bình | Thực tập, Đối tác | Thực tập/Đối tác không tra được hồ sơ khách ⇒ mỗi lần "Tạo hồ sơ mới" là một hồ sơ trùng | Xác nhận một phần |
| 30 | [VP-08](#VP-08) | Ít nghiêm trọng | Trung bình | Quản trị | Hai đại lý (tổ chức) cùng MST tạo được, không ai bắt, và không gộp được. | Xác nhận một phần |
| 31 | [VP-06](#VP-06) | Ít nghiêm trọng | Trung bình | Kế toán | Ngày phát sinh lần thu không có cận dưới, và màn đơn hiện ngày không có năm. | Xác nhận một phần |
| 32 | [BH-09](#BH-09) | Ít nghiêm trọng | Trung bình | Đối tác | Đối tác tự xác nhận đơn mình lập (không có người của Tour Đảo nhận) | Xác nhận một phần |
| 33 | [HT-14](#HT-14) | Ít nghiêm trọng | Trung bình | Tài xế → Điều phối | Kết thúc gián đoạn khi khách đã lên xe: khách quay về "Chưa xếp" ở điểm đón cũ, "đã đón" = 0 | Xác nhận một phần |
| 34 | [HT-07](#HT-07) | Ít nghiêm trọng | Trung bình | Tài xế công ty | Trong ngày chạy, trước khi bấm "Xuất bến", màn tài xế giấu tên khách và SĐT liên hệ (máy chủ đã gửi) | Xác nhận |
| 35 | [HT-12](#HT-12) | Ít nghiêm trọng | Trung bình | Điều phối, Hướng dẫn viên | "Giờ hẹn đổi — gọi báo khách: Ai xử lý: Người phụ trách đơn", nhưng HDV phụ trách không thấy, không… | Xác nhận một phần |
| 36 | [HT-11](#HT-11) | Ít nghiêm trọng | Trung bình | Quản trị giao → Hướng dẫn viên B | Người VỪA ĐƯỢC giao đơn nhận tin "… vừa giao đơn X cho người khác phụ trách" | Xác nhận |
| 37 | [BH-17](#BH-17) | Ít nghiêm trọng | Trung bình | Bán hàng (và HDV) được chọn | Người được chọn phụ trách lúc lập đơn không nhận tin "giao cho bạn" | Xác nhận một phần |
| 38 | [BH-10](#BH-10) | Ít nghiêm trọng | Trung bình | Bán hàng (cả kiêm Quản trị) | Bốn ô số ở Trang chủ: bấm ô nào cũng ra danh sách đơn chưa lọc; số đếm lẫn phạm vi | Xác nhận một phần |
| 39 | [BH-01](#BH-01) | Ít nghiêm trọng | Trung bình | Bán hàng, Thực tập, Đối tác (mọi người lập đơn) | Tìm dịch vụ trong form lập đơn phải gõ đúng dấu | Xác nhận |
| 40 | [BH-20](#BH-20) | Ít nghiêm trọng | Ít nghiêm trọng | mọi vai | Góp ý/Báo lỗi nhận nguyên SĐT khách trong nội dung (và gửi email trích đoạn) | Chưa |
| 41 | [BH-21](#BH-21) | Ít nghiêm trọng | Ít nghiêm trọng | Bán hàng | "Sử dụng thông tin của tôi" rồi "Tạo hồ sơ mới" tạo hồ sơ khách trùng với chính nhân viên | Chưa |
| 42 | [VP-22](#VP-22) | Ít nghiêm trọng | Ít nghiêm trọng | Quản trị / Nhân sự | Đổi SĐT đăng nhập của tài khoản sang số đang thuộc hồ sơ khách khác (0906777888 của "Nguyễn Văn… | Chưa |
| 43 | [VP-16](#VP-16) | Ít nghiêm trọng | Ít nghiêm trọng | Quản trị | Tạo được địa điểm thứ hai trùng tên "Bến tàu du lịch Nha Trang" (khác mã) → hai dòng giống hệt… | Chưa |
| 44 | [VP-17](#VP-17) | Ít nghiêm trọng | Ít nghiêm trọng | Toàn quyền | Chính sách điều phối nhận bộ số tự mâu thuẫn: "giờ lái tối đa một ngày" 60 phút nhỏ hơn "lái liên… | Chưa |
| 45 | [VP-18](#VP-18) | Ít nghiêm trọng | Ít nghiêm trọng | Nhân sự | Tên tài khoản "😀😀 123" và "A" đều tạo được (201). | Chưa |
| 46 | [VP-19](#VP-19) | Ít nghiêm trọng | Ít nghiêm trọng | Nhân sự | (a) Nhân sự không có quyền xem Danh bạ, nên khi người mới đã có trong Danh bạ (từng là khách), giao… | Chưa |
| 47 | [VP-23](#VP-23) | Ít nghiêm trọng | Ít nghiêm trọng | Quản trị | Thêm CCCD hết hạn từ 2020 cho HDV → 201, không cảnh báo (). Câu 403 khi Kế toán mở giấy tờ người… | Chưa |
| 48 | [HT-16](#HT-16) | Ít nghiêm trọng | Ít nghiêm trọng | Tài xế | Câu báo sai khi "Đã trả" khách chưa đón: "Khách này đã có kết quả — không đổi được." | Chưa |
| 49 | [HT-17](#HT-17) | Ít nghiêm trọng | Ít nghiêm trọng | Điều phối | Tạo chuyến khi xe đang có lịch bận: tiêu đề lỗi "Xe trùng giờ với chuyến khác." | Chưa |
| 50 | [HT-20](#HT-20) | Ít nghiêm trọng | Ít nghiêm trọng | Tài xế | Tin "Văn phòng vừa sửa chuyến … — mở để xem giờ, xe, điểm" bắn cả khi chỉ phá lệ khoảng nghỉ | Chưa |
| 51 | [HT-21](#HT-21) | Ít nghiêm trọng | Ít nghiêm trọng | Hướng dẫn viên | Tin "Có đơn mới …, chưa có người phụ trách" gửi HDV mở ra "Không tìm thấy đơn." | Chưa |
| 52 | [BH-14](#BH-14) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Mở đơn người khác (Thực tập/Đối tác) báo "…mới được thay đổi đơn này" dù chỉ xem | Chưa |
| 53 | [BH-15](#BH-15) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Thực tập bấm nhận đơn chính mình lập bị chặn bằng câu nói "người lập đơn … được" | Chưa |
| 54 | [BH-16](#BH-16) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Sửa đơn đã huỷ báo như đơn "đã xác nhận" | Chưa |
| 55 | [VP-20](#VP-20) | Ít nghiêm trọng | Ít nghiêm trọng | mọi tài khoản | Tài khoản bị ngưng đăng nhập nhận "Số điện thoại hoặc mã PIN không đúng." (401) → người dùng tưởng… | Chưa |
| 56 | [VP-26](#VP-26) | Ít nghiêm trọng | Ít nghiêm trọng | Quản trị | Gộp hồ sơ khách vào hồ sơ nhân viên mình không quản lý được → "Tài khoản này không gộp được: …"… | Chưa |
| 57 | [BH-25](#BH-25) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Lỗi đồng bộ Sheet hiện cho Bán hàng kèm hướng dẫn chỉ quản trị làm được | Chưa |
| 58 | [BH-18](#BH-18) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Hộp thông báo của Bán hàng nhiều tin trùng/khó hiểu | Chưa |
| 59 | [VP-13](#VP-13) | Ít nghiêm trọng | Ít nghiêm trọng | mọi vai | Nút nổi "Hỗ trợ" che số tiền và liên kết "Đảo" ở khối Thanh toán trên máy tính 1280. Trên điện… | Chưa |
| 60 | [BH-23](#BH-23) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Nút nổi "Hỗ trợ" che nội dung | Chưa |
| 61 | [HT-22](#HT-22) | Ít nghiêm trọng | Ít nghiêm trọng | Tài xế | Màn tài xế: nút nổi "Hỗ trợ" nằm sát "Kết thúc gián đoạn" ở đáy trang; khi chưa cuộn hết nó đè lên… | Chưa |
| 62 | [BH-12](#BH-12) | Ít nghiêm trọng | Ít nghiêm trọng | mọi vai xem danh sách đơn | Thẻ đơn trên điện thoại cắt mất số khách | Chưa |
| 63 | [BH-22](#BH-22) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Bộ lọc đơn: ô "Đến ngày" tràn ra ngoài màn hình 390px | Chưa |
| 64 | [VP-14](#VP-14) | Ít nghiêm trọng | Ít nghiêm trọng | Toàn quyền | Nhật ký trên điện thoại 390: ô chọn "Mọi hành động" rộng 424 px làm trang kéo ngang (scrollWidth… | Chưa |
| 65 | [HT-19](#HT-19) | Ít nghiêm trọng | Ít nghiêm trọng | Điều phối | Bảng điều phối 1280: chuyến buổi tối nằm ngoài khung nhìn, không dấu hiệu cuộn; tiêu đề nhóm "NHÀ… | Chưa |
| 66 | [VP-25](#VP-25) | Ít nghiêm trọng | Ít nghiêm trọng | Kế toán | Trên điện thoại, tiền viết tắt trộn đơn vị: "599k ₫", "2,3tr ₫" (Trang chủ, danh sách đơn), trong… | Chưa |
| 67 | [VP-24](#VP-24) | Ít nghiêm trọng | Ít nghiêm trọng | Kế toán | Biên nhận (GET /api/orders/:id/receipt) chỉ có tổng "đã trả" và "còn lại", không liệt kê từng lần… | Chưa |
| 68 | [HT-18](#HT-18) | Ít nghiêm trọng | Ít nghiêm trọng | Điều phối | "Bản chụp lúc xuất bến": hai dòng "Giấy tờ xe" không ghi loại; không ghi đã phá lệ khoảng nghỉ | Chưa |
| 69 | [HT-15](#HT-15) | Ít nghiêm trọng | Ít nghiêm trọng | Tài xế công ty | "Cuốc của tôi" chỉ có Hôm nay / Ngày mai / Ngày kia, không xem trước hơn, không xem lại | Chưa |
| 70 | [BH-11](#BH-11) | Ít nghiêm trọng | Ít nghiêm trọng | Bán hàng, Đối tác | "Đang giữ đơn: Chưa tới ngày đi — bấm từ ngày đi trở đi. Ai xử lý: Hướng dẫn viên." hiện cho mọi… | Chưa |
| 71 | [BH-13](#BH-13) | Ít nghiêm trọng | Ít nghiêm trọng | mọi vai | Gọi ngày đi là "Đón"/"ngày đón" kể cả khi đơn "Không đưa đón" | Chưa |
| 72 | [BH-24](#BH-24) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Chữ: "app" trong câu chào trợ lý; ba kiểu ghi phiên bản; định dạng ngày lệch | Chưa |
| 73 | [BH-26](#BH-26) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Nhãn vai lệch: Bán hàng thấy nhóm "QUẢN TRỊ"; danh sách chọn người phụ trách gọi Toàn quyền và… | Chưa |
| 74 | [BH-27](#BH-27) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Thực tập/Đối tác mở thẳng /catalog hoặc /parties thấy đủ nút quản trị kèm câu cấm | Chưa |
| 75 | [BH-28](#BH-28) | Ít nghiêm trọng | Ít nghiêm trọng | nhiều vai | Lưu nháp xong tự bật hộp "Xác nhận đơn để gửi khách" | Chưa |
| 76 | [VP-12](#VP-12) | Ít nghiêm trọng | Ít nghiêm trọng | Kế toán | Trang chủ của Kế toán hiện ô "Doanh thu của tôi 0 ₫", "Chờ xác nhận — Cần xác nhận đơn" (Kế toán… | Chưa |
| 77 | [VP-15](#VP-15) | Ít nghiêm trọng | Ít nghiêm trọng | Quản trị / Nhân sự | Mở trang không có quyền bằng đường dẫn thì trang vẫn dựng đầy đủ rồi mới báo: /audit của Quản trị… | Chưa |
| 78 | [VP-21](#VP-21) | Ít nghiêm trọng | Ít nghiêm trọng | Quản trị / Nhân sự | Danh sách "Quản lý tài khoản" không có ô tìm, không lọc theo vai/trạng thái, không sắp theo tên. | Chưa |

