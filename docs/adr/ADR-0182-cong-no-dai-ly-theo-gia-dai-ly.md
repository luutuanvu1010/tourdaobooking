# ADR-0182 — Công nợ đại lý tính theo giá đại lý; đại lý nộp tiền có chứng từ, Kế toán xác nhận

- **Trạng thái:** **proposed** 2026-11-07. Chủ chốt hướng trong chat (phiên `claude/cong-no-0172-0173-372c0c`, ba hộp hỏi cùng ngày). Chờ chủ duyệt; người soạn không tự duyệt (Hiến pháp N3). Đã qua một vòng kiểm độc lập chỉ đọc (7/11), các lỗi sai sự thật đã sửa.
- **Sửa 2026-11-12, trước khi duyệt** (phiên `claude/partner-payment-system-e3f939`). Chủ nêu yêu cầu, nguyên văn: *«Cần tách biệt hóa đơn thanh toán của khách đối với đối tác và hóa đơn thanh toán của đối tác đối với công ty … Cần có 2 nút riêng biệt là : Tạo biên nhận cho khách , và ở một vị trí phù hợp là xem công nợ với công ty Tour đảo … Hóa đơn của đối tác gửi khách là mẫu 02, không có mã QR và/hoặc thông tin chuyển khoản (vì đối tác là người thu tiền từ khách) , nhưng hóa đơn của đối tác với công ty Tour Đảo thì luôn có mã QR để đối tác có thể trả từng đơn tương ứng … Sau khi đối tác khởi tạo đơn, thì cần đến bước bổ sung bằng chứng công việc (ở đây là cho phép đính kèm biên lai chuyển tiền của chính đơn hàng tương ứng để dễ trong việc kiểm soát)»*. Rồi chủ bấm «Đồng ý cả ba» cho hai khuyến nghị: (1) *«bỏ nút QR giá lẻ khỏi màn của đối tác; thay bằng nút "Xem công nợ với Tour Đảo" ngay trên đơn, mở ra phiếu theo giá đại lý có QR đúng số tiền đó; máy chủ tự tính số tiền»*; (2) *«sau khi lập đơn, đối tác bấm "Đã chuyển tiền" trên phiếu công nợ và kèm ảnh biên lai; khoản này chờ Kế toán xác nhận rồi mới trừ vào nợ»*. Phần sửa: Đ2 viết lại (hai phiếu, QR theo giá đại lý, khoản nộp theo từng đơn kèm biên lai bắt buộc), Đ3 thêm quyền xem phiếu, trang ghép cập nhật. Đ1 không đổi. Bản sửa đã qua hai vòng đọc chỉ đọc cùng ngày: người kiểm độc lập (4 phát hiện vừa, đã sửa) và chuyên gia SaaS duyệt văn phong, logic (2 phát hiện cao về cách ghi sổ ⇒ Đ2 mục 9 nay là câu hỏi chờ chủ; các phát hiện vừa đã sửa hoặc ghi ở «Hệ quả»). Hai vòng này đọc văn bản, không chạy mã.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). **Cửa:** một chiều về số liệu (số nợ đại lý đã hiện theo cách mới); hai chiều về mã.
- **Số quyết định chạm quyền/dữ liệu:** bản 7/11 đếm 3 trong một lượt; **từ bản sửa 12/11 trình hai lượt** như dòng dưới. ADR-0183 trình ở lượt riêng sau đó. Trang ghép ở cuối tệp.
  - **Đếm lại sau bản sửa 12/11** (phát hiện VỪA số 4 của vòng kiểm độc lập): Đ2 nay gói hai phần chạm tiền/dữ liệu khác nhau — (A) hai phiếu và QR (mục 1–3, không bảng mới, không dòng sổ mới) và (B) khoản nộp, bảng mới, cách ghi sổ mới, tách người (mục 4–10). Vì thế trình **hai lượt**: lượt «0182-A» = Đ1 + Đ2 phần A; lượt «0182-B» = Đ2 phần B + Đ3 + quyết định xây trên lỗ. Lượt B duyệt sau lượt A, và **chỉ trình sau khi chủ chọn cách ghi sổ ở Đ2 mục 9**.
- **Xây trên lỗi an toàn chưa sửa:** `TNV-G1` (tiền của đơn huỷ), `HC-5.19` (chưa diễn tập lấy lại dữ liệu) — như ADR-0172, ADR-0178. Chủ quyết lại có cho làm trên vùng đó không.
- **Quan hệ với ADR cũ:**
  - **Thay** ADR-0177 (**accepted** sáng 7/11, ở nhánh `claude/tra-sau-sau-kiem-7-11`, chưa nhập `main`). ADR-0177 cho nợ trừ hoa hồng **từ «Khách đã trả đủ»**; văn bản này trừ **từ lúc xác nhận**. Sau «Khách đã trả đủ» hai cách cho cùng một số. ADR đã duyệt không sửa; văn bản này thay nó khi được duyệt.
  - **Sửa** ADR-0168 Đ2 mục 2: bỏ câu «Tính trên toàn bộ tiền phải thu, không trừ hoa hồng».
  - **Sửa** ADR-0173 Đ3 mục 1 và tiêu chí 5 ở phần «đối trừ»: hoa hồng được trừ vào nợ ngay từ lúc xác nhận (qua giá đại lý). Phần «hoa hồng chưa vào kỳ trả cho đại lý khi đơn còn nợ» **giữ nguyên**.
  - **Quan hệ** với ADR-0181 của nhánh `claude/tra-sau-sau-kiem-7-11` (nhắc, nới hạn đơn đã xong còn nợ; gỡ vai thì hết hạn mức): cùng vùng công nợ, không chồng luật. Số «còn nợ» ở đó đọc theo Đ1 dưới đây. Đơn đã «Khách đã trả đủ» mà còn nợ vẫn được nhắc và dùng được «Ân hạn» theo ADR-0181; văn bản này không đổi điều đó.
  - **ADR-0178 Đ2** (Trả sau theo dịch vụ, đứng ngoài hạn mức): công nợ của các đơn đó cũng tính theo Đ1, nhưng **vẫn không** vào hạn mức như ADR-0178 đã chốt.
  - **Khớp** ADR-0079 (sổ đại lý): dòng «Giảm giá bên đặt chịu» là phần đại lý tự nhường cho khách. Theo công thức mới, giảm giá không làm đổi nợ, đúng nghĩa dòng sổ ấy.
  - **Đổi có chủ ý** ADR-0109 («phải thu không âm») ở riêng con số công nợ đại lý: Đ1 mục 7 cho phép số âm, tức Tour Đảo nợ đại lý. Phải thu của khách vẫn không âm.
  - **Giữ** ADR-0168 phần còn lại, ADR-0172, ADR-0090 (quyền tiền), ADR-0170 Đ2 mục 2 (tiền nhân viên cầm hộ), ADR-0178 Đ1 (công tắc).
  - (Sửa 12/11) **Siết** ADR-0108 đ3 (QR thanh toán): tài khoản Đối tác không còn nhận QR giá bán lẻ (Đ2 mục 3). Văn phòng giữ nguyên.
  - (Sửa 12/11) **Dùng lại khuôn** ADR-0196 (biên lai chuyển khoản bắt buộc, accepted 11/11) cho tệp biên lai của khoản nộp; **không gộp** hai đường (Đ2 mục 6).
  - (Sửa 12/11) **Ảnh hưởng** ADR-0183 Đ3 mục 4 (proposed; QR theo «Thu hộ đối tác còn lại»): sau Đ2 mục 3, luật QR đó chỉ còn áp cho **văn phòng**; đối tác không còn đường QR cho khách trả thẳng Công ty. Khi trình ADR-0183, người soạn phải sửa câu đó cho khớp.
  - (Sửa 12/11) **Liên quan** ADR-0198 (proposed 12/11: đối tác không thấy số hạn mức, đơn mới chọn sẵn Trả sau): trình riêng một lượt, không phụ thuộc văn bản này.

## Bối cảnh

Hôm nay số nợ của đại lý đổi giữa chừng. Trước «Khách đã trả đủ», nợ là giá bán lẻ trừ giảm giá; sau đó là giá bán lẻ trừ hoa hồng. Vì thế hạn mức bị chiếm nhiều hơn số đại lý thật phải nộp. Chủ coi công nợ là phần «vô cùng quan trọng» và muốn **một cách tính** dùng cho mọi nơi.

## Đ1 — Một cách tính công nợ cho mọi đơn đại lý

1. **Đơn đại lý** là đơn có bên đặt là hồ sơ đối tác, hoặc người lập là tài khoản chỉ mang quyền Đối tác. Đây đúng là luật đang chọn mẫu biên nhận HD-02-DT (`mauBienNhan`); dùng lại luật đó, không viết luật thứ hai. Áp cho mọi đơn đại lý, Trả sau hay trả trước.
2. **Tổng công nợ** của đơn = tổng mọi dòng dịch vụ (số lượng × giá đại lý). **Giá đại lý** của một dòng = thành tiền dòng − hoa hồng dòng, đọc từ **bản chụp lúc xác nhận** (`tinhDongDoiTac`, cùng nguồn với khối «Phần đối tác»). Không lập bảng giá mới. Hoa hồng lớn hơn thành tiền thì giá đại lý âm, **không kẹp về 0**, để khớp với sổ (sổ ghi hoa hồng theo số gốc).
3. **Dòng thiếu mức hoa hồng** lúc xác nhận: tính theo **giá bán lẻ** (chủ chọn). Khi Kế toán chụp bù hoặc ghi mức tay, nợ giảm theo.
4. **Sửa mức sau xác nhận** (ghi mức tay, chụp bù, điều chỉnh): nợ **đổi theo** (chủ chọn). Nếu nợ tăng làm vượt hạn mức thì máy không chặn, chỉ cảnh báo cho Kế toán (khuôn R-CRD-3 sẵn có, dựa vào người xem).
5. **Giảm giá và đặt cọc không làm đổi Tổng công nợ.** Giảm giá là đại lý nhường hoa hồng của mình; tiền cọc nằm ở tay đại lý.
6. **Đã thu** = tổng các khoản Tour Đảo thật sự đã nhận, gồm:
   - (a) tiền khách trả thẳng cho Tour Đảo (thu hộ), đã được Kế toán xác nhận nhận;
   - (b) tiền đại lý nộp về theo Đ2, đã được Kế toán xác nhận;
   - (c) tiền nhân viên Tour Đảo cầm hộ, tính như hôm nay (ADR-0170 Đ2 mục 2: tin nhân viên, không cần xác nhận).

   **Không** tính: khoản đại lý tự khai («Tôi thu»), dòng «Thu hộ đối tác» dự kiến trên biên nhận (ADR-0183), khoản đang chờ đối chiếu.
7. **Công nợ còn lại** = Tổng công nợ − Đã thu. Số âm nghĩa là Tour Đảo đang nợ đại lý (khách trả Tour Đảo nhiều hơn giá đại lý). Màn hiện «Tour Đảo nợ đại lý …» và không coi đó là nợ của đại lý.
8. **Hạn mức Trả sau** dùng Công nợ còn lại của các đơn Trả sau theo hạn mức, thay cách tính hiện nay (`noTheoDon`). Một đơn âm không bù cho đơn khác (giữ ADR-0168). Đơn huỷ giữ luật ADR-0168 Đ3.
9. Một phần nghiệp vụ riêng tên **«Công nợ đại lý»** giữ công thức này ở đúng một chỗ, có bài kiểm canh. Mọi màn (Hạn mức trả sau, Trả sau của tôi, chi tiết đơn, Sổ công nợ) chỉ gọi tới nó. Số tiền chỉ tính ở máy chủ.

## Đ2 — Hai phiếu cho mỗi đơn đại lý; đại lý nộp tiền theo từng đơn qua QR, kèm biên lai, Kế toán xác nhận

**Hai phiếu, hai nút riêng** (sửa 12/11):

1. **Biên nhận cho khách** (mẫu HD-02-DT, ADR-0183): giá bán lẻ, **không** mã QR, **không** số tài khoản hay thông tin chuyển khoản, vì đại lý là người thu tiền của khách. Hôm nay mẫu này đã như vậy (`src/shared/order-confirmation.ts`, `web/confirmation-image.ts` không vẽ QR hay số tài khoản); văn bản này **khoá** điều đó bằng bài kiểm: mô hình biên nhận mẫu đối tác không có khối hay dòng nào mang QR, số tài khoản, tên ngân hàng. Trên chi tiết đơn của tài khoản Đối tác, nút mở biên nhận đổi chữ thành **«Tạo biên nhận cho khách»** (chữ của chủ; hôm nay là «Xem ảnh gửi khách»). Văn phòng giữ chữ cũ.
2. **Phiếu công nợ với Tour Đảo** (tên chờ chủ chọn, xem «Chữ chờ chủ chọn»): mở bằng nút riêng **«Xem công nợ với Tour Đảo»** (chữ của chủ) ở thẻ Thanh toán của chi tiết đơn. Phiếu gồm: từng dòng dịch vụ theo **giá đại lý**, Tổng công nợ, Đã thu, Công nợ còn lại (đúng các số của Đ1, lấy từ phần «Công nợ đại lý», không tính lại ở trình duyệt), hạn trả nếu đơn Trả sau, và **mã QR** chuyển khoản vào tài khoản công ty với **số tiền = Công nợ còn lại**.
   - Số tiền trên QR do **máy chủ** tính; route QR của phiếu **không nhận** số tiền từ đường dẫn hay thân yêu cầu (khác route QR hiện có, vốn nhận `soTienRaw`).
   - Nội dung chuyển khoản theo khuôn đang có (`noiDungChuyenKhoan(maDon)`). Người thi công đề xuất trong kế hoạch có cần thêm dấu để Kế toán phân biệt tiền đại lý nộp với tiền khách trả thẳng hay không; không tự đổi nội dung của QR khách.
   - Công nợ còn lại ≤ 0 thì phiếu hiện số, không hiện QR. Số âm hiện «Tour Đảo nợ đại lý …» (Đ1 mục 7).
   - Chỉ đơn **đã xác nhận** có phiếu (Tổng công nợ đọc bản chụp lúc xác nhận; khớp ADR-0135 Đ8 về QR). Đơn nháp và đơn chờ xác nhận hiện câu «Phiếu công nợ có sau khi đơn được xác nhận.» (chữ chờ chủ chọn).
   - Phiếu có QR **bất kể** công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1): công tắc ấy nói về tiền **khách** vào tài khoản công ty; phiếu này là tiền **đại lý** nộp. Khi công tắc Bật và khách đã trả thẳng cho công ty, số đó đã vào Đã thu (Đ1 mục 6a) nên QR tự nhỏ lại.
   - **Khi phần A lên mà phần B chưa lên:** đại lý vẫn ghi «Tôi thu» khi nhận tiền khách như hôm nay; tiền đại lý chuyển theo QR của phiếu được Kế toán ghi bằng đường quyết toán đang có (`ghiQuyetToan`). Sổ không đổi, không trả hoa hồng hai lần (xem Đ2 mục 9).
   - Lưu / chia sẻ phiếu thành ảnh: được, theo khuôn lưu ảnh QR đang có. Phiếu **không** in trên biên nhận cho khách và không có trong «Xem ảnh gửi khách».
3. **Bỏ nút «QR thanh toán» khỏi màn của tài khoản Đối tác.** Nút này hôm nay tính theo **giá bán lẻ** còn lại (`conLai`) và trỏ vào tài khoản công ty, tức bảo đại lý trả nhiều hơn số thật phải nộp. Route `GET /api/orders/:id/qr-thanh-toan` trả «không có QR» khi người gọi là tài khoản Đối tác theo ADR-0196 mục 1 (máy chủ chặn, không chỉ ẩn nút). Văn phòng giữ nút này như hôm nay.

**Khoản nộp theo từng đơn:**

4. Đại lý chuyển tiền cho Tour Đảo bên ngoài Nền tảng (chủ nói), thường bằng QR của phiếu ở mục 2. Trong Nền tảng, đại lý bấm **«Đã chuyển tiền»** (chữ chờ chủ chọn) ngay trên phiếu và ghi một **khoản nộp**: số tiền (điền sẵn Công nợ còn lại, sửa được, phải > 0), ngày chuyển, kèm **đúng một ảnh hoặc PDF biên lai — bắt buộc**. Mỗi khoản nộp gắn **đúng một đơn** (sửa 12/11, thay «các đơn được trừ»: chủ nói «trả từng đơn tương ứng»).
   - **Trần chống khai trùng (máy chặn, không dựa vào người soát):** số tiền khoản nộp ≤ Công nợ còn lại − tổng khoản nộp đang chờ của đơn − tổng khoản «Công ty thu» đang chờ đối chiếu của đơn (kể cả khoản «Công ty thu, chuyển khoản» đối tác ghi theo ADR-0196). Vượt ⇒ 409, không ghi gì; câu báo nói đơn đã có khoản đang chờ Kế toán. Kế toán xác nhận cũng kiểm lại trần này với số đã xác nhận, nên một lần chuyển tiền khai ở hai đường không làm nợ bị trừ quá Tổng công nợ. Ở màn của Kế toán, khoản nộp và khoản «Công ty thu» đang chờ của cùng đơn hiện cạnh nhau. (Sửa sau vòng kiểm độc lập 12/11, phát hiện VỪA số 2.)
5. **Tệp biên lai dùng lại khuôn ADR-0196**, không dựng khuôn thứ hai: kiểm loại theo chữ ký thật, JPG/PNG/HEIC/PDF, tối đa 10 MB, trần `TEP_MOI_GIO`, thu nhỏ và bỏ thông tin ẩn trên máy người gửi, xem chỉ qua Worker có nhật ký trước, gỡ ảnh gửi nhầm chỉ Toàn quyền có lý do. Lưu ở **cùng kho R2 `BIEN_LAI`** với tiền tố khoá riêng; bảng ảnh mới của `billing` chép bộ cột và trigger của `bil_receipt_proof`, gắn với khoản nộp thay vì khoản thu. *Người soạn tự chọn, đảo ngược được ở kế hoạch:* thêm kho thứ ba thì cổng `npm run trien-khai` phải biết thêm một kho mà không thêm an toàn.
6. **Phân biệt với ADR-0196:** ADR-0196 gắn biên lai vào **khoản khách trả** cho Công ty (tính trên phải thu giá bán lẻ). Khoản nộp ở đây là tiền **đại lý** trả Công ty theo giá đại lý. Hai đường không gộp: gộp thì khoản đại lý nộp bị trừ vào phải thu của khách, và Công nợ còn lại theo Đ1 vẫn còn nguyên.

**Xác nhận** (giữ từ bản 7/11):

7. Khoản nộp ở trạng thái «Chờ Kế toán xác nhận» và chưa tính vào Đã thu. Phiếu hiện khoản đang chờ như một dòng riêng. **Khi đơn còn khoản đang chờ, số trên QR = Công nợ còn lại − tổng khoản đang chờ; bằng 0 thì ẩn QR** và phiếu hiện câu «Đơn đang có khoản chờ Kế toán xác nhận.» — cùng con số với trần ở mục 4, để đại lý mở lại phiếu không chuyển tiền lần hai. (Sửa sau vòng duyệt chuyên gia 12/11, phát hiện V1.)
8. Kế toán đối chiếu với sao kê ngân hàng ngoài phần mềm, rồi chọn một trong hai:
   - **xác nhận**: khoản vào Đã thu;
   - **từ chối có lý do**: đại lý thấy lý do.

   Người ghi và người xác nhận phải khác nhau. **Đây là luật mới cho đường này**: đường quyết toán hiện nay (`ghiQuyetToan`) chưa có luật tách người.
9. **Cách ghi sổ — CHƯA CHỐT, chờ chủ chọn trước khi trình phần B** (viết lại sau vòng duyệt chuyên gia 12/11, phát hiện C1, C2).
   - **Sổ hôm nay là mô hình gộp.** Đại lý ghi «Tôi thu» theo giá **bán lẻ** ⇒ dòng `HELD` (đại lý giữ hộ Tour Đảo toàn bộ tiền khách). Lúc «Đã giao» sổ ghi dòng `HOA_HONG` (Tour Đảo nợ đại lý tiền hoa hồng; `src/modules/billing/rules.ts`, dòng thương mại). Đại lý nộp ⇒ dòng `SETTLEMENT`, không quá số đang giữ (`settlement_exceeds_held`). Số dư = giữ hộ − hoa hồng − đã nộp. Cổng mở vé và «Khách đã trả đủ» đo theo **phải thu bán lẻ** (`thuDu`, `src/modules/ve-dien-tu/rules.ts`).
   - **Ca hỏng nếu nhận khoản nộp mà không có «Tôi thu»:** đơn Thanh toán ngay, giá lẻ 1.000.000 ₫, giá đại lý 800.000 ₫. Đại lý quét QR chuyển 800.000 ₫, Kế toán xác nhận ⇒ công nợ theo Đ1 bằng 0, nhưng phải thu bán lẻ vẫn còn 1.000.000 ₫ ⇒ **vé không mở, đơn không tới «Khách đã trả đủ»** (C1). Tới «Đã giao», sổ vẫn ghi `HOA_HONG` 200.000 ₫ cho đại lý ⇒ **Tour Đảo trả hoa hồng hai lần**, vì đại lý đã giữ phần đó khi chỉ nộp giá đại lý (C2).
   - **Phương án (b1) — khuyến nghị:** khoản nộp đi **đường sổ đang có**. Nếu đơn chưa có «Tôi thu» đủ phải thu, form «Đã chuyển tiền» ghi luôn «Khách đã trả đại lý» theo giá bán lẻ (đúng thực tế chủ tả: đại lý là người thu tiền khách) rồi mới ghi khoản nộp. Kế toán xác nhận ⇒ `SETTLEMENT`. Vé mở theo «Tôi thu» như hôm nay; số dư sau `HOA_HONG` khớp, không trả hai lần; `settlement_exceeds_held` không còn chặn vì giữ hộ ≥ giá đại lý. Không cần loại dòng sổ mới. Còn lại phải xây: bảng khoản nộp chờ xác nhận, bảng ảnh, luật tách người.
   - **Phương án (b2):** sổ ghi thẳng theo công nợ của đơn (bản 7/11). Phải đổi cổng mở vé, «Khách đã trả đủ», cổng huỷ, ân hạn, nhắc nợ (ADR-0181), chặn ngừng hồ sơ (ADR-0173 Đ3 mục 5) sang số nợ mới, **và** chặn dòng `HOA_HONG` cho đơn đại lý đã nộp theo giá đại lý. Rộng hơn nhiều, nhiều chỗ dễ lệch.
   - **Đơn Trả sau:** với (b1), vé đã mở trước theo luật Trả sau; khi khách trả, đại lý ghi «Tôi thu» như hôm nay. Số nợ dùng cho ân hạn và chặn huỷ (`traSau.no`, ADR-0168 Đ3 mục 3) phải đọc **Công nợ còn lại theo Đ1** — người thi công liệt kê mọi chỗ đọc `traSau.no` trong kế hoạch.
   - Chưa kiểm: đơn có đại lý ghi «Tôi thu» một phần rồi nộp; đường «Thu hộ» (khách trả thẳng Công ty) chạy với (b1) thế nào khi công tắc ADR-0178 Đ1 đang Bật.
10. Khoản đã xác nhận thì không sửa được. Nếu ghi nhầm, khoản đó được huỷ bằng một dòng ngược lại, qua yêu cầu điều chỉnh có người thứ hai duyệt (luật sổ sẵn có).

## Đ3 — Ô quyền mới

- `dai-ly.nop.ghi`: ghi khoản nộp và tải biên lai. Chỉ tài khoản Đối tác, chỉ cho đơn của chính hồ sơ mình.
- `dai-ly.nop.xac-nhan`: xác nhận hoặc từ chối khoản nộp. Dành cho Kế toán và Toàn quyền (khuôn quyền tiền ADR-0090). Quản trị không có ô này.
- Xem khoản nộp và biên lai: Kế toán, Toàn quyền, Quản trị (chỉ xem), và đại lý chủ khoản.
- **Xem phiếu công nợ với Tour Đảo** (Đ2 mục 2, kể cả QR của phiếu): cùng nhóm với dòng trên — Kế toán, Toàn quyền, Quản trị, và đại lý chủ đơn (phạm vi hồ sơ mình). Bán hàng, Hướng dẫn viên, Thực tập: không. *Người soạn tự chọn:* dùng chung một ô xem với khoản nộp thay vì thêm ô thứ tư; tên ô chốt ở kế hoạch.
- Không nới ô nào sẵn có. Đ2 mục 3 **siết** route QR hiện có với tài khoản Đối tác.

## Một luật cố định, không làm công tắc

Lúc hỏi, câu chọn có nói «khoản nào tính vào đã thu» sẽ là công tắc. Người soạn đề nghị **giữ cố định** điều này. Lý do: nếu có công tắc, chỉ một lần bật nhầm cho tính khoản đại lý tự khai là đại lý tự xoá được nợ của mình rồi đặt tiếp (ADR-0168 đã loại đường này). Ở phần việc này chỉ có một công tắc: «đại lý được sửa tay dòng Thu hộ» (ADR-0183).

## Phương án đã loại

- **Giữ ADR-0177** (chỉ trừ hoa hồng từ «Khách đã trả đủ»): số nợ đổi giữa chừng, hạn mức bị chiếm thừa trước bước đó. Chủ chọn cách mới.
- **Công thức tự gõ trên màn hình:** gõ sai một dấu là sai nợ của mọi đại lý, và máy không kiểm trước được. Chủ không chọn.
- **Chặn xác nhận khi thiếu mức:** đơn có thể kẹt lại. Chủ không chọn.

## Hệ quả chủ cần biết

- Ngay khi bản mới lên, các đơn của đại lý mà khách **chưa** trả đủ sẽ thấy số nợ giảm xuống, đúng bằng phần hoa hồng đại lý được hưởng (sau khi trừ phần đại lý đã giảm giá cho khách). Đơn **đã** xong giữ nguyên số nợ, vì mã hiện nay đã tính đúng như công thức mới.
- Hạn mức khả dụng tăng theo phần giảm đó.
- Đơn có dòng thiếu mức sẽ hiện nợ cao hơn thật cho tới khi Kế toán ghi mức.
- Khoản đại lý đã nộp mà chưa ghi trong Nền tảng sẽ không được trừ nợ cho tới khi đại lý ghi và Kế toán xác nhận.
- (Sửa 12/11) Đại lý **mất** nút «QR thanh toán» giá bán lẻ; nếu đại lý từng dùng nút đó để đưa khách quét trả thẳng cho công ty, nay khách không còn mã đó trên màn của đại lý. Văn phòng vẫn tạo được QR cho khách.
- (Sửa 12/11) Không gửi được biên lai thì không ghi được khoản nộp. Ảnh hỏng hay bị gỡ thì khoản vẫn còn, không gửi lại ảnh (giống ADR-0196 mục 11).
- (Sửa 12/11, duyệt chuyên gia V3) Mỗi khoản nộp gắn một đơn. Đại lý gộp mười đơn vào một lần chuyển thì phải ghi mười khoản và gửi cùng một ảnh mười lần, Kế toán khó khớp với sao kê; trần 20 ảnh mỗi giờ (`TEP_MOI_GIO`) có thể chặn đại lý lớn. Nên dặn đại lý chuyển riêng từng đơn; kế hoạch xét nâng trần cho bảng ảnh khoản nộp.
- (Sửa 12/11, duyệt chuyên gia V4) **Ngoài phạm vi văn bản này:** trả lại đại lý khi «Tour Đảo nợ đại lý» (số âm do sửa mức, giảm khách, chuyển dư, đơn huỷ sau khi đã nộp), và ca «tiền về ít hơn số khai» (phí ngân hàng, chuyển thiếu). Kế toán chỉ có xác nhận hoặc từ chối; các ca này xử lý bằng yêu cầu điều chỉnh có người thứ hai duyệt (ADR-0115). Đơn huỷ sau khi đã nộp thuộc vùng lỗi `TNV-G1`. Chuyển dư (ví dụ làm tròn lên) không khai được phần dư vì trần ở Đ2 mục 4.
- (Sửa 12/11, duyệt chuyên gia V5) Công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1): sau Đ2 mục 3, công tắc Bật chỉ còn tác dụng khi **văn phòng** tạo QR cho khách; đại lý không còn QR nào để đưa khách. Phiếu công nợ vẫn hiện QR cho chính đại lý, nên nếu văn phòng đã đưa QR cho khách thì có thể cả khách lẫn đại lý cùng trả — trần ở Đ2 mục 4 chặn phần khai trùng, nhưng tiền thừa đã chuyển thì theo dòng trên.
- **Chưa kiểm:**
  - số đơn đại lý cũ trên production thiếu bản chụp mức hoa hồng;
  - báo cáo khoá tháng sẽ dùng số nợ nào;
  - cách ghi sổ ở Đ2 mục 9;
  - đại lý hiện có dùng nút «QR thanh toán» trên production không (chưa có số liệu; nhật ký có ghi lượt mở QR thì đếm được bằng lệnh chỉ đọc).

## Chữ chờ chủ chọn (sửa 12/11; Hiến chương 5.27, ADR-0167)

Hai nút dùng **nguyên chữ chủ**: «Tạo biên nhận cho khách», «Xem công nợ với Tour Đảo». Các chữ dưới đây chưa có trong `docs/BANG-THAM-CHIEU.md`:

| Chỗ | Khuyến nghị | Phương án khác |
|---|---|---|
| Tên phiếu (Đ2 mục 2) | «Phiếu công nợ với Tour Đảo» | «Công nợ đơn này» |
| Nút ghi khoản nộp (Đ2 mục 4) | «Đã chuyển tiền» | «Gửi biên lai» |
| Tên khoản (Đ2 mục 4, 7) | «Khoản nộp» | «Lần chuyển tiền» |
| Câu khi đơn chưa xác nhận | «Phiếu công nợ có sau khi đơn được xác nhận.» | — |
| Nội dung chuyển khoản trên QR của phiếu (Đ2 mục 2; duyệt chuyên gia V2) | Thêm tiền tố riêng «DL» trước mã đơn, để Kế toán nhìn sao kê biết đây là tiền đại lý nộp, không phải tiền khách | Giữ y như QR của khách (mã đơn) |

## Trang ghép (quy trình «bước ghép khi duyệt»)

1. **Bảng chạm:**
   - sổ `bil_ledger_line`: dòng từ khoản nộp đã xác nhận (cách ghi chốt ở kế hoạch, Đ2 mục 9);
   - bảng mới của `billing` cho khoản nộp (gắn đúng một đơn) và bảng ảnh biên lai của khoản nộp (chép khuôn `bil_receipt_proof`); kho R2 `BIEN_LAI` dùng chung với ADR-0196, tiền tố khoá riêng;
   - đọc bản chụp hoa hồng của `orders` qua view công bố.

   Không thêm loại thực thể vào bảng dùng chung nào. `bil_receipt_proof` (ảnh của khoản **khách trả**) không nhận ảnh khoản nộp.
2. **Bản đồ quyền:**
   - thêm `dai-ly.nop.ghi` (Đối tác, phạm vi hồ sơ mình);
   - thêm `dai-ly.nop.xac-nhan` (Kế toán, Toàn quyền);
   - ô xem khoản nộp, biên lai và phiếu công nợ (Kế toán, Toàn quyền, Quản trị; Đối tác phạm vi mình);
   - ô xem Hạn mức trả sau giữ nguyên, nhưng con số hiển thị đổi nghĩa;
   - route QR hiện có (`qr-thanh-toan`) **siết**: tài khoản Đối tác nhận «không có QR».
3. **Cổng:**
   - route ghi khoản nộp: cổng `orders`, kiểm hồ sơ chủ đơn, kiểm tệp trước, một lô D1;
   - route phiếu công nợ và QR của phiếu: cổng `orders`, kiểm ô xem phiếu và hồ sơ chủ đơn; số tiền tính ở máy chủ;
   - route xem biên lai khoản nộp: qua Worker, nhật ký trước (khuôn ADR-0196 mục 6);
   - route xác nhận: cổng `office`, tách người ghi và người xác nhận.

   **Chỗ giao diện ẩn/hiện bị đổi nghĩa:** «Hạn mức trả sau», «Trả sau của tôi» và chi tiết đơn (con số nợ nay là Công nợ còn lại theo Đ1); thẻ Thanh toán của chi tiết đơn với tài khoản Đối tác: nút «QR thanh toán» biến mất, thêm nút «Xem công nợ với Tour Đảo», nút «Xem ảnh gửi khách» đổi chữ thành «Tạo biên nhận cho khách». Điều kiện hiện nút QR ở `web/order.ts` (đang dựa `t.kenhThu?.congTyThu`) phải thêm điều kiện «không phải tài khoản Đối tác».
