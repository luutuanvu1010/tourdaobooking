# ADR-0092: Sổ tiền không đổi dấu; một dòng giữ hộ tất toán một lần; điều chỉnh có kiểm soát; mã giao dịch ngân hàng

- **Trạng thái:** **accepted** — chủ dự án duyệt toàn văn trong chat 2026-10-03: *"1- duyệt"*. Đ2b, sửa Đ4 (VP-01, kiểm theo vai 2/10) duyệt trước đó cùng ngày (*"Duyệt A1, A2, A3"*, lượt V0-A, bản vá `docs/superpowers/specs/2026-10-03-v0-luot-duyet/A2-adr-0092-bo-sung-D2b.diff`). Q-A1, Q-A2 áp theo khuyến nghị (lời chủ 2/10 "đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa"); đ6a (CT3, CT4) có lời chủ 2/10. AI soạn và ghi lại, không tự duyệt. Văn bản trình duyệt và **trang ghép chung với ADR-0088**: `docs/superpowers/specs/2026-10-02-luot-duyet-2-sua-sai-sau-da-giao-va-so-khong-doi-dau.md`; trang ghép lượt V0-A: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/LUOT-A-TRANG-GHEP.md`. Phiếu kiểm độc lập như ADR-0088 và phiếu kiểm V0 (3/10). Xây trên lỗ đang hở: TNV-G4, TNV-VP01, F-03, F-02. Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-02 (soạn), 2026-10-03 (bổ sung Đ2b, duyệt)
- **Phạm vi:** module `billing` (`bil_debt_line`, `bil_payment_receipt`: trigger không đổi dấu, kiểm số ở nộp / trả / hoàn / điều chỉnh / "Công ty đã nhận", ô mã giao dịch ngân hàng), lớp luật trùng nghiệp vụ, `audit-invariants` R-BIL-8, R-BIL-13.

## Lời chủ dự án (nguyên văn)

> "1- duyệt" — trả lời câu "Duyệt toàn văn ADR-0088 và ADR-0092" (chat 2026-10-03, sau khi Đ2b/Đ4 của ADR-0092 đã duyệt cùng lượt V0-A).

> "1- A, 2-A, …" — VP-01: câu 1 = mục riêng `TNV-VP01` trong sổ dừng dây chuyền; câu 2 = "Xác nhận đã nhận bị 409 khi khoản đã nộp", giữ mô hình dòng đảo (chat 2026-10-03; nguyên văn đủ ở `docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` §8).

> CT3: "Có, chỉ cảnh báo (Recommended)"; CT4: "Người đang ghi, bắt nhập lý do (Recommended)" (chat 2026-10-02, đ6a).

## Bối cảnh (đã chạy thật)
- **KT06:** hoàn rồi đảo lần thu gốc làm đã thu **−100.000**, biên nhận đòi 300.000 cho đơn 200.000. Trigger "hoàn ≤ đã thu" chỉ chạy lúc hoàn (`0045:212-216`).
- **KT04:** nộp quá số đang giữ, hoặc nộp cho người không giữ, làm sổ âm; vẫn Hoàn thành. `service.ts:361-397` không so với số đang giữ.
- **KT05:** điều chỉnh xoá 100.000 tiền mặt Bán hàng đang cầm, lý do "."; điều chỉnh 5 tỷ trên đơn 200.000 vẫn qua. `docLyDo` (`service.ts:316-322`) chỉ đòi chuỗi khác rỗng.
- **KT09:** hoàn ghi người trả là người **không cầm** tiền → công ty nợ người đó.
- **KT06 phần đảo dòng:** đảo dòng giữ hộ khi lần thu còn hiệu lực → "thôi giữ" mà không ai xác nhận tiền đã về.
- **KT02:** hai người khai cùng **một** khoản chuyển khoản, cả hai được xác nhận → hoàn "dư" → công ty mất 100.000. Ghi chú chứa mã giao dịch bị chặn (`service.ts:94`).
- **KT10:** `audit-invariants` xanh trong khi có đã thu âm và số dư âm.
- **VP-01 (kiểm theo vai 2/10, tái hiện thật):** một dòng giữ hộ (`HELD`) của lần thu "Công ty thu – CK" bị tất toán **hai lần**: Kế toán bấm "Đã nộp" (dòng quyết toán, `service.ts:361-397`) rồi "Xác nhận đã nhận" (dòng đảo HELD, `service.ts:331-355`) → số dư người khai trên đơn **−1.000.000**; chiều ngược qua API cũng vậy. Đ2 bản 3.3 chỉ ràng dòng quyết toán, còn Đ4 kể "Công ty đã nhận" như một đường sửa được phép, nên bản 3.3 **vẫn để hở** ca này (`docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` §3.1).

## Quyết định
1. **Đã thu ròng của mỗi đơn ≥ 0 mọi lúc** (A-B16): "đảo một lần thu không được làm đã thu ròng < 0". Hai lớp: trigger trên dòng đảo và máy chủ.
2. **Dòng quyết toán không làm số dư đổi dấu** (A-B4). Dòng quyết toán gồm nộp, trả, bù trừ. Số dư là của cặp (bên, công ty) trên đơn.
   - **nộp** ≤ số bên đó **đang nợ** công ty trên đơn;
   - **trả** ≤ số công ty **đang nợ** bên đó trên đơn. Trong mã, "trả" là công ty trả bên đó (`service.ts:357-360`).
   - Hai lớp: trigger trên dòng quyết toán gốc và máy chủ.
   - Chỉ dòng gắn đơn; dòng gắn chuyến (ADR-0057) tính riêng.
   - **Không** cấm số dư âm nói chung, vì "công ty nợ bên đó" là hợp lệ (ADR-0080 D-1 `:114-116`).
   - **Thêm R-BIL-13** ở **mức lỗi**. R-BIL-13 đã được định nghĩa trong ADR-0080 (`:104`, mức cảnh báo) nhưng **chưa có mã**: `audit-checks.mjs` hôm nay chỉ có R-BIL-1..7. Không dùng R-BIL-9 của bản 1. R-BIL-13 đếm đổi dấu do **dòng quyết toán và dòng đảo giữ hộ** (Đ2b), không chỉ dòng quyết toán như chữ ADR-0080 `:104`.
2b. **Một dòng giữ hộ chỉ được tất toán một lần** (VP-01; lời chủ 3/10 câu 2 = A):
   - Một dòng giữ hộ (`HELD`) được tất toán **đúng một lần**, bằng **một trong hai** đường: "Công ty đã nhận" (dòng đảo của dòng HELD) **hoặc** dòng quyết toán "Nộp". Hai đường **loại trừ nhau**: tiền hoặc đã về tài khoản công ty, hoặc người khai nộp bù — không thể cả hai.
   - **Mọi** dòng đảo HELD thuộc phạm vi **"không đổi dấu"** của Đ2 — dòng đảo của "Công ty đã nhận" và dòng đảo HELD do lệnh "đảo lần thu" (`dao_lan_thu`, `service.ts:462-478`) sinh ra: sau khi cộng dòng đảo, số dư cặp (người khai, công ty) trên đơn không được đổi dấu. Vì vậy đảo một lần thu đã được nộp bù cũng bị 409, phải đảo lần nộp trước (cùng thứ tự "ghi mới trước, đảo sau" của 0088 đ2 / 0092 đ1).
   - Vì dòng "Nộp" không trỏ tới một dòng HELD cụ thể, luật "một lần" thi hành bằng **điều kiện số dư**: "Công ty đã nhận" chỉ được ghi khi số người khai **đang nợ** công ty trên đơn **≥** số tiền của dòng HELD; "Nộp" chỉ được ghi trong giới hạn Đ2 (≤ số đang nợ).
   - **Lệnh thứ hai bị từ chối 409 kèm câu chỉ đường** (tiếng Việt, không mã thô), ví dụ khi xác nhận sau nộp: "Khoản này đã được ghi nộp — nếu tiền cũng đã về tài khoản công ty thì đảo lần nộp trước rồi xác nhận."; khi nộp sau xác nhận: câu của Đ2 ("vượt số người này đang giữ cho đơn").
   - **Hai lớp:** máy chủ (`xacNhanCongTyNhan`, `ghiQuyetToan`) và trigger trên `bil_debt_line` (dòng đảo HELD và dòng quyết toán gốc). Trigger chỉ đọc bảng `bil_*` (Hiến chương 5.3).
   - **Một nguồn sự thật cho giao diện:** danh sách "chờ xác nhận" (`choXacNhan`) do máy chủ lọc theo **cùng** điều kiện số dư, nên nút "Xác nhận đã nhận" không hiện cho khoản đã được nộp; giao diện không tự ghép hai danh sách.
   - **Không đổi mô hình dòng:** dòng đảo HELD giữ nguyên là dòng đảo (không đổi thành dòng quyết toán — phương án B bị loại).
   - Sửa sai khi Kế toán bấm nhầm đường (chỉ-thêm, không xoá):
     - nhầm **"Nộp"** (tiền thật ra đã về tài khoản): đảo dòng quyết toán bằng lệnh điều chỉnh "đảo dòng" sẵn có (`service.ts:453-522`), rồi "Công ty đã nhận";
     - nhầm **"Công ty đã nhận"** (tiền chưa về, người khai nộp tiền mặt): hôm nay **không** đảo được dòng đảo (`service.ts:475` trả 409 "Không đảo dòng đảo"). Ghi điều chỉnh **tăng nợ** của người khai với công ty trên đơn (đ5b, lý do ≥ 10 ký tự, người bị đổi số dư nhận tin) bằng đúng số đó, rồi "Nộp". Không mở đường "đảo dòng đảo".
3. **Hoàn với người trả không phải công ty** (A-B7, KT09): số hoàn ≤ số người đó đang giữ trên đơn.
   - Lượt 1 (ADR-0089 đ3b) đã kiểm ở máy chủ; điều này thêm lớp CSDL.
   - **Không cho vượt.** Nhân viên thực tế ứng tiền túi trả khách thì Kế toán ghi hoàn với người trả là **Công ty**. Khoản công ty phải trả lại nhân viên ghi bằng điều chỉnh tăng nợ của công ty với người đó (đ5b), lý do "ứng tiền túi hoàn khách", rồi trả bằng lệnh "trả".
4. **Không đảo đơn lẻ dòng giữ hộ** khi lần thu sinh ra nó còn hiệu lực (A-B7). Muốn sửa thì đi đường đảo lần thu, "Thay lần thu" (ADR-0088) hoặc "Công ty đã nhận". **Ngoại lệ cho "Công ty đã nhận" (phiếu `COMPANY_RECEIVED`) vẫn giữ** — đó là đường tất toán chính của khoản chuyển khoản — **nhưng không còn vô điều kiện**: nó chịu điều kiện số dư của Đ2b. Bản 3.3 miễn vô điều kiện, chính chỗ đó để lọt VP-01.
5. **Điều chỉnh tiền** (Q-A1, khuyến nghị của phiếu A):
   - **(a)** điều chỉnh **giảm nợ** của một bên ≤ số bên đó đang nợ trên đơn, không đổi dấu;
   - **(b)** điều chỉnh **tăng nợ** ≤ max(phải thu, đã thu ròng) của đơn, để chặn gõ thừa số 0;
   - **(c)** lý do ≥ 10 ký tự;
   - **(d)** **người bị đổi số dư nhận một tin** (cần dòng ADR-0034 điều 1, 4 ở bảng "Thay câu nào"); nhật ký ghi số trước và sau;
   - **(e)** lượt này không làm luồng duyệt hai người.
6. **Mã giao dịch ngân hàng** (Q-A2; chỉnh theo khung Oracle — `2026-10-02-chong-trung-moi-lenh-ghi-theo-oracle.md` §2.3, §3.2):
   - một ô riêng trên lần thu chuyển khoản; Kế toán điền hoặc sửa lúc "Công ty đã nhận";
   - ô này **được miễn** luật chặn chuỗi ≥ 8 chữ số. Luật vẫn áp cho ghi chú và lý do;
   - **chặn** khi trùng (mã đã chuẩn hoá, **cùng đơn**) với một lần thu còn hiệu lực. Oracle Receivables chặn biên lai trùng số;
   - **cảnh báo** khi cùng mã ở **đơn khác**, kèm tổng số đã gắn mã đó, vì một lần chuyển có thể trả nhiều đơn. Kế toán bỏ qua được, **lý do bắt buộc**, ghi nhật ký;
   - khi xác nhận: **tổng các lần thu gắn cùng một mã ≤ số tiền thực chuyển** (Kế toán nhập theo sao kê). Vượt thì chặn.
6a. **Cảnh báo lần thu tiền mặt giống nhau** (CT3, CT4; **đã có lời chủ**, chat 2026-10-02, chủ chọn trên bảng hỏi):
   - CT3: *"Có, chỉ cảnh báo (Recommended)"*. Cùng đơn, cùng số tiền, cùng ngày thì cảnh báo "Có thể trùng với lần thu …: Xem bản cũ / Vẫn ghi" **trước khi ghi**. Không chặn, vì hai lần thu giống hệt nhau đôi khi là thật.
   - CT4: *"Người đang ghi, bắt nhập lý do (Recommended)"*. Ai đang ghi thì được bấm "Vẫn ghi", nhưng phải gõ lý do. Lý do và người bỏ qua vào nhật ký; Kế toán xem lại được.
   - Làm bằng **một dòng trong bảng luật trùng dùng chung** của lớp nghiệp vụ (`2026-10-02-lop-chong-ghi-trung-chung-de-xuat.md` §4), không vá riêng màn ghi lần thu. Lời chủ: *"chặn ghi trùng bằng giải pháp kỹ thuật, chứ không phải đi vá thế này"*.
   - Cảnh báo ở đ6 (cùng mã giao dịch, khác đơn) đi qua **cùng** bảng luật và **cùng** hộp thoại.
7. **Phí huỷ — bỏ khỏi ADR này.** Chủ đã trả lời Q-A3 ngày 2/10: khách huỷ thì mặc định **không hoàn cọc**, hoàn là tuỳ chọn có duyệt, hạn 60 ngày. Việc này nằm trọn ở **ADR-0089 bản 3 (lượt 1a)**; không cần loại ghi "phí huỷ" riêng.
8. **Bộ kiểm:**
   - **R-BIL-8**: đã thu ròng ≥ 0 mọi đơn;
   - R-BIL-13 lên mức lỗi (đ2), đếm cả dòng đảo giữ hộ (đ2b); bài kiểm có ca VP-01 (nộp rồi xác nhận → 1 vi phạm khi gỡ trigger) và ca âm hợp lệ (công ty nợ đại lý, nhân viên ứng tiền → 0);
   - cùng khuôn trước mốc cảnh báo, sau mốc lỗi (ADR-0088 đ7);
   - mỗi bất biến mới có một lần **quan sát chặn thật** (dữ liệu sai trên D1 tạm → đỏ → hoàn nguyên), ghi `docs/SO-HANG-RAO.md`.

## Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0080 điều 8 (`:76`) | "Không vượt… kiểm ở mã; kiểm định kỳ R-BIL-13" | thêm lớp CSDL; R-BIL-13 mức lỗi (đ2) |
| ADR-0080 điều 8 (`:77`) | "số chứng từ ngân hàng ghi ở ghi chú" | ô mã giao dịch riêng (đ6) |
| ADR-0026 đ5 (nộp, trả, hoàn do Kế toán ghi) | không ràng số | đ2, đ3 |
| ADR-0026 đ4 ("Công ty thu – CK" do người khác khai: Kế toán xác nhận = đảo dòng giữ hộ) | điều kiện duy nhất: dòng giữ hộ chưa bị đảo | + đ2b: chỉ khi người khai còn nợ trên đơn ≥ số dòng giữ hộ; loại trừ với "Nộp" |
| ADR-0080 `:104` (R-BIL-13 "đổi dấu do dòng `SETTLEMENT`") | chỉ dòng quyết toán | + dòng đảo giữ hộ (đ2b) |
| ADR-0026 điều chỉnh (phiếu ADJUSTMENT) | lý do bất kỳ, không trần | đ5 |
| Hiến chương 5.9 | "điều kiện và ô quyền quyết ở ADR sổ tiền" | phần đơn huỷ do ADR-0089 bản 3 quyết |
| ADR-0089 đ1 (lượt 1) | — | không còn liên quan: đ7 đã bỏ, ADR-0089 bản 3 tự xử lý cọc |
| ADR-0034 điều 1, 4 | — | + tin "điều chỉnh đổi số dư của bạn" (đ5d) |

## Câu hỏi mở — đã trả lời
- Q-A1 (trần điều chỉnh đ5), Q-A2 (ô mã giao dịch đ6): áp theo khuyến nghị (lời chủ 2/10). CT3, CT4: đ6a. Q-A3: chuyển sang ADR-0089 bản 3. Đ2b: lời chủ 3/10 "2-A".
