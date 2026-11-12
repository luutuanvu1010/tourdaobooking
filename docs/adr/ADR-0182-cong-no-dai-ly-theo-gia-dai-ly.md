# ADR-0182 — Công nợ đại lý tính theo giá đại lý; đại lý nộp tiền có chứng từ, Kế toán xác nhận

- **Trạng thái — duyệt từng phần (12/11):**
  - **Phần A (Đ1; Đ2 mục 1–3): accepted 2026-11-12** — chủ dự án, nguyên văn: *«Duyệt, chọn cách 1»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt hai lần đầu và chọn cách 1 cho phần nộp tiền chứ?», sau khi nhận trang trình `docs/superpowers/specs/2026-11-12-trinh-chu-thanh-toan-doi-tac.md` bản cuối ngày 12/11, câu duyệt mẫu «Duyệt lần 1 và lần 2, chữ theo khuyến nghị. Phần nộp tiền chọn cách 1»). Đây là «lần duyệt 2». Chữ ở bảng «Chữ chờ chủ chọn» dùng **khuyến nghị**, kể cả tiền tố «DL» của nội dung chuyển khoản.
  - **Cách ghi sổ (Đ2 mục 9): chủ chọn phương án (b1)** («cách 1» ở trang trình) cùng lời trên.
  - **Phần B (Đ2 mục 4–13; Đ3): accepted 2026-11-13** — chủ dự án, nguyên văn: *«Duyệt, phát hành ngay»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt lần 3 và phát hành khi nào?», sau khi nhận trang trình `docs/superpowers/specs/2026-11-13-trinh-chu-nop-tien-dai-ly.md` bản sửa sau vòng kiểm độc lập, lần lưu `dda0e034a`, câu duyệt mẫu «Duyệt lần 3 theo khuyến nghị. Cho phép xây trên hai lỗi, có lý do. Phát hành sau diễn tập 25/11», kèm lời dặn «Nếu muốn phát hành ngay khi làm xong, không chờ diễn tập, bạn thay câu cuối bằng "Phát hành trước diễn tập"»). Người chép (AI) hiểu lời duyệt gồm: ba quyết định B1, B2, B3 theo khuyến nghị; chữ theo khuyến nghị; giả định «sau Gửi đơn = khi đơn đã xác nhận» (Đ2 mục 11) giữ nguyên; **cho phép xây trên `TNV-G1` và `HC-5.19`, có lý do**; **phát hành ngay khi xong, KHÔNG chờ diễn tập** (người soạn đã khuyến nghị chờ diễn tập một lần trong tin trả lời; chủ chọn khác). Chủ nói khác thì sửa dòng này. Ghi kèm ở `docs/quyen-hoan.json`, khoá `xay_tren_cho_phep_adr_0182_b` ở hai mục `TNV-G1` và `HC-5.19`.
  - **Phần A đã lên production bản 2.96 ngày 2026-11-13** (kiểm bằng GET công khai `/api/auth/config`).
  - **Sửa phần B 2026-11-13, trước lần duyệt 3** (phiên `claude/partner-payment-system-e3f939`). Chủ dự án, nguyên văn: *«làm nốt phần đại lý bấm Đã chuyển tiền và kèm biên lai , bước này nên ở sau bước gửi đơn (để ưu tiên việc gửi đơn hàng, và coi phần bổ sung biên lai là bước sau»*. Phần sửa:
    - Đ2 mục 9 chỉ giữ (b1), viết đủ cách ghi; (b2) chuyển xuống «Phương án đã loại».
    - Thêm mục 11 (bước gửi biên lai đứng sau Gửi đơn, theo lời chủ), mục 12 (cổng mở vé của đơn đối tác theo giá đại lý — **sửa ADR-0170 Đ2**), mục 13 (chặn ghi trùng giữa khoản nộp và quyết toán của Kế toán).
    - Lý do thêm mục 12: người soạn đọc lại mã ngày 13/11 và thấy câu «Vé mở theo "Tôi thu" như hôm nay» ở bản 12/11 **sai**. Với đơn do tài khoản Đối tác lập, cổng vé chỉ tính tiền **đã về công ty** (`tienDonVe`, `soChuaVeCongTy`, ADR-0170 Đ2): đại lý ghi «Tôi thu» 1.000.000 ₫ rồi nộp 800.000 ₫ giá đại lý thì còn 200.000 ₫ «ở tay đối tác», vé vẫn không mở. Không sửa cổng này thì (b1) vẫn mang lỗi C1.
  - **Điều kiện trước khi thi công phần A — chủ đã cho phép 2026-11-12:** Đ1 đổi con số nợ mà luật đơn huỷ còn nợ (ADR-0168 Đ3) và hạn mức đang đọc, tức chạm vùng lỗi `TNV-G1`. Chủ được hỏi, nguyên văn câu hỏi: «Bạn cho làm phần A dù lỗi tiền đơn huỷ chưa sửa xong chứ?», kèm lời báo một lần (P18) rằng cách tính nợ mới đổi đúng con số luật đơn huỷ còn nợ đang dùng. Chủ trả lời, nguyên văn: *«Cho phép, có lý do»*. Lý do người soạn ghi: phần A không có migration, không thêm loại dòng sổ, không ghi dòng sổ mới, không nới luật đơn huỷ còn nợ (đơn còn nợ > 0 vẫn bị chặn như cũ); chỉ đổi con số đầu vào. Điều phải biết: nợ tính theo giá đại lý nhỏ hơn giá lẻ, nên hạn mức Trả sau của đại lý còn trống nhiều hơn hôm nay. Điều kiện phát hành: người soạn KHÔNG đặt điều kiện «chờ diễn tập» vì phần A không đổi dữ liệu đang có (giả định của người soạn; chủ nói khác thì thêm). Phần còn lại của lỗi giữ hạn cũ. Ghi kèm ở `docs/quyen-hoan.json` mục `TNV-G1`, khoá `xay_tren_cho_phep_adr_0182`.
- **Lịch sử soạn:** **proposed** 2026-11-07. Chủ chốt hướng trong chat (phiên `claude/cong-no-0172-0173-372c0c`, ba hộp hỏi cùng ngày). Chờ chủ duyệt; người soạn không tự duyệt (Hiến pháp N3). Đã qua một vòng kiểm độc lập chỉ đọc (7/11), các lỗi sai sự thật đã sửa.
- **Sửa 2026-11-12, trước khi duyệt** (phiên `claude/partner-payment-system-e3f939`). Chủ nêu yêu cầu, nguyên văn: *«Cần tách biệt hóa đơn thanh toán của khách đối với đối tác và hóa đơn thanh toán của đối tác đối với công ty … Cần có 2 nút riêng biệt là : Tạo biên nhận cho khách , và ở một vị trí phù hợp là xem công nợ với công ty Tour đảo … Hóa đơn của đối tác gửi khách là mẫu 02, không có mã QR và/hoặc thông tin chuyển khoản (vì đối tác là người thu tiền từ khách) , nhưng hóa đơn của đối tác với công ty Tour Đảo thì luôn có mã QR để đối tác có thể trả từng đơn tương ứng … Sau khi đối tác khởi tạo đơn, thì cần đến bước bổ sung bằng chứng công việc (ở đây là cho phép đính kèm biên lai chuyển tiền của chính đơn hàng tương ứng để dễ trong việc kiểm soát)»*. Rồi chủ bấm «Đồng ý cả ba» cho hai khuyến nghị: (1) *«bỏ nút QR giá lẻ khỏi màn của đối tác; thay bằng nút "Xem công nợ với Tour Đảo" ngay trên đơn, mở ra phiếu theo giá đại lý có QR đúng số tiền đó; máy chủ tự tính số tiền»*; (2) *«sau khi lập đơn, đối tác bấm "Đã chuyển tiền" trên phiếu công nợ và kèm ảnh biên lai; khoản này chờ Kế toán xác nhận rồi mới trừ vào nợ»*. Phần sửa: Đ2 viết lại (hai phiếu, QR theo giá đại lý, khoản nộp theo từng đơn kèm biên lai bắt buộc), Đ3 thêm quyền xem phiếu, trang ghép cập nhật. Đ1 không đổi. Bản sửa đã qua hai vòng đọc chỉ đọc cùng ngày: người kiểm độc lập (4 phát hiện vừa, đã sửa) và chuyên gia SaaS duyệt văn phong, logic (2 phát hiện cao về cách ghi sổ ⇒ Đ2 mục 9 nay là câu hỏi chờ chủ; các phát hiện vừa đã sửa hoặc ghi ở «Hệ quả»). Hai vòng này đọc văn bản, không chạy mã.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). **Cửa:** một chiều về số liệu (số nợ đại lý đã hiện theo cách mới); hai chiều về mã.
- **Số quyết định chạm quyền/dữ liệu:** bản 7/11 đếm 3 trong một lượt; **từ bản sửa 12/11 trình hai lượt** như dòng dưới. ADR-0183 trình ở lượt riêng sau đó. Trang ghép ở cuối tệp.
  - **Đếm lại sau bản sửa 12/11** (phát hiện VỪA số 4 của vòng kiểm độc lập): Đ2 nay gói hai phần chạm tiền/dữ liệu khác nhau — (A) hai phiếu và QR (mục 1–3, không bảng mới, không dòng sổ mới) và (B) khoản nộp, bảng mới, cách ghi sổ mới, tách người (mục 4–10). Vì thế trình **hai lượt**: lượt «0182-A» = Đ1 + Đ2 phần A; lượt «0182-B» = Đ2 phần B + Đ3 + quyết định xây trên lỗ. Lượt B duyệt sau lượt A, và **chỉ trình sau khi chủ chọn cách ghi sổ ở Đ2 mục 9**.
  - **Đếm lượt 0182-B sau bản sửa 13/11 — ba quyết định:** (B1) khoản nộp theo từng đơn + biên lai + ghi sổ (b1) + Kế toán xác nhận + chặn ghi trùng, gửi sau Gửi đơn (Đ2 mục 4–11, 13; migration hai bảng mới); (B2) cổng mở vé của đơn đối tác lập theo giá đại lý (Đ2 mục 12, sửa ADR-0170 Đ2 mục 1 — chỗ nới duy nhất); (B3) ô quyền mới (Đ3). Câu cho phép xây trên lỗi và điều kiện phát hành là **điều kiện kèm theo**, không phải quyết định thiết kế (như cách trình ADR-0196). Sửa khe hoa hồng của phần A là sửa mã cho khớp Đ1 mục 4 đã duyệt, không đếm. B1 gộp cả các chặn ghi trùng (siết route quyết toán sẵn có và đường «Công ty thu» của Đối tác): người soạn coi đó là một khối với khoản nộp, vì chỉ có nghĩa khi có khoản nộp; tách ra thì thành bốn.
- **Xây trên lỗi an toàn chưa sửa:** `TNV-G1` (tiền của đơn huỷ), `HC-5.19` (chưa diễn tập lấy lại dữ liệu) — như ADR-0172, ADR-0178. Chủ quyết lại có cho làm trên vùng đó không. Phần A đã có lời cho phép riêng (dòng Trạng thái). Phần B có migration (hai bảng mới) nên chạm `HC-5.19`; Đ2 mục 12 để phần hoa hồng ở tay đại lý trước «Đã giao» nên chạm `TNV-G1` khi đơn huỷ. Khác ADR-0196, phần B có **một chỗ nới thật** (Đ2 mục 12: vé mở khi đủ giá đại lý), còn lại chỉ thêm bảng hoặc siết. Câu hỏi cho chủ ở lần duyệt 3: có cho xây không, và **phát hành trước hay sau diễn tập 25/11** (lời «Diễn tập sau cùng» của ADR-0196 không áp sang đây).
- **Quan hệ với ADR cũ:**
  - **Thay** ADR-0177 (**accepted** sáng 7/11, ở nhánh `claude/tra-sau-sau-kiem-7-11`, chưa nhập `main`). ADR-0177 cho nợ trừ hoa hồng **từ «Khách đã trả đủ»**; văn bản này trừ **từ lúc xác nhận**. Sau «Khách đã trả đủ» hai cách cho cùng một số. ADR đã duyệt không sửa; văn bản này thay nó khi được duyệt.
  - **Sửa** ADR-0168 Đ2 mục 2: bỏ câu «Tính trên toàn bộ tiền phải thu, không trừ hoa hồng».
  - **Sửa** ADR-0173 Đ3 mục 1 và tiêu chí 5 ở phần «đối trừ»: hoa hồng được trừ vào nợ ngay từ lúc xác nhận (qua giá đại lý). Phần «hoa hồng chưa vào kỳ trả cho đại lý khi đơn còn nợ» **giữ nguyên**.
  - **Quan hệ** với ADR-0181 của nhánh `claude/tra-sau-sau-kiem-7-11` (nhắc, nới hạn đơn đã xong còn nợ; gỡ vai thì hết hạn mức): cùng vùng công nợ, không chồng luật. Số «còn nợ» ở đó đọc theo Đ1 dưới đây. Đơn đã «Khách đã trả đủ» mà còn nợ vẫn được nhắc và dùng được «Ân hạn» theo ADR-0181; văn bản này không đổi điều đó.
  - **ADR-0178 Đ2** (Trả sau theo dịch vụ, đứng ngoài hạn mức): công nợ của các đơn đó cũng tính theo Đ1, nhưng **vẫn không** vào hạn mức như ADR-0178 đã chốt.
  - **Khớp** ADR-0079 (sổ đại lý): dòng «Giảm giá bên đặt chịu» là phần đại lý tự nhường cho khách. Theo công thức mới, giảm giá không làm đổi nợ, đúng nghĩa dòng sổ ấy.
  - **Đổi có chủ ý** ADR-0109 («phải thu không âm») ở riêng con số công nợ đại lý: Đ1 mục 7 cho phép số âm, tức Tour Đảo nợ đại lý. Phải thu của khách vẫn không âm.
  - **Giữ** ADR-0168 phần còn lại, ADR-0172, ADR-0090 (quyền tiền), ADR-0170 Đ2 mục 2 (tiền nhân viên cầm hộ), ADR-0178 Đ1 (công tắc).
  - (Sửa 13/11, phần B) **Sửa** ADR-0170 Đ2 mục 1 cho đơn Thanh toán ngay do tài khoản Đối tác lập: cổng mở vé tính theo giá đại lý (Đ2 mục 12). Đơn của nhân viên văn phòng và ADR-0170 Đ2 mục 2–5, Đ3 giữ nguyên.
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
9. **Cách ghi sổ — (b1), chủ chọn ngày 12/11** («Duyệt, chọn cách 1»). Viết đủ ngày 13/11 sau khi đọc mã; (b2) chuyển xuống «Phương án đã loại».
   - **Sổ hôm nay là mô hình gộp.** Đại lý ghi «Tôi thu» theo giá **bán lẻ** ⇒ dòng `HELD` (đại lý giữ hộ Tour Đảo toàn bộ tiền khách; người thu `BOOKER`, sinh nợ ngay, không dấu chờ — `docLanThu`, `cauLanThu`). Lúc «Đã giao» sổ ghi dòng `HOA_HONG` (Tour Đảo nợ đại lý tiền hoa hồng). Đại lý nộp ⇒ dòng `SETTLEMENT`, không quá số đang giữ (`settlement_exceeds_held`). Số dư = giữ hộ − hoa hồng − đã nộp.
   - **Lý do không nhận khoản nộp khi chưa có «Tôi thu»:** đơn Thanh toán ngay, giá lẻ 1.000.000 ₫, giá đại lý 800.000 ₫. Nếu chỉ ghi khoản nộp 800.000 ₫ thì phải thu bán lẻ vẫn còn nguyên, đơn không tới «Khách đã trả đủ» (C1), và tới «Đã giao» sổ vẫn ghi `HOA_HONG` 200.000 ₫ cho đại lý, tức Tour Đảo trả hoa hồng hai lần (C2).
   - **Bước 1 — «Khách đã trả đại lý» ghi kèm, cùng một lô với khoản nộp.** Form «Đã chuyển tiền» hiện một dòng có số tiền: «Khách đã trả bạn **X ₫**», với X = phần **phải thu bán lẻ còn lại** của đơn lúc gửi (phải thu − mọi khoản thu đang hiệu lực, **kể cả** khoản đang chờ đối chiếu và khoản khách trả thẳng Công ty). Vì vậy:
     - đại lý đã ghi «Tôi thu» một phần thì máy chỉ ghi phần còn thiếu;
     - công tắc ADR-0178 Đ1 đang Bật và khách đã trả thẳng Công ty (đã hay chưa xác nhận) thì phần đó đã bị trừ khỏi X, không tính hai lần;
     - X = 0 thì không ghi thêm khoản thu nào.

     Khoản thu này đi đúng đường «Tôi thu» hôm nay (người thu là chính đại lý, `BOOKER`, `HELD` ngay), dùng lại `docLanThu`/`cauLanThu`, không viết đường thứ hai. Khoản thu, khoản nộp, ảnh biên lai và nhật ký nằm trong **một** `db.batch`: một câu hỏng thì không ghi gì.
   - **Bước 2 — Kế toán xác nhận khoản nộp ⇒ `SETTLEMENT`**, sinh dòng bằng đúng hàm của đường quyết toán «nộp về công ty» (`sinhDongQuyetToan`), kiểm bằng `kiemQuyetToan` trên số dư của đại lý với công ty ở đơn đó (`soDuCap`), và vẫn qua trigger `settlement_exceeds_held` / `settlement_sign_flip`. **Không thêm loại dòng sổ mới.** Từ chối thì không có dòng sổ nào; khoản «Khách đã trả đại lý» ở bước 1 vẫn giữ, vì đó là lời khai tiền khách đã ở tay đại lý (đúng thực tế), không phụ thuộc lần chuyển tiền.
   - **Kết quả trên sổ** (ví dụ trên): giữ hộ 1.000.000 − nộp 800.000 = đại lý còn giữ 200.000; tới «Đã giao» sổ ghi `HOA_HONG` 200.000 ⇒ số dư 0. Không trả hoa hồng hai lần; `settlement_exceeds_held` không chặn vì giữ hộ ≥ giá đại lý.
   - **Đơn Trả sau:** vé đã mở theo luật Trả sau. Đại lý chuyển tiền thì cũng qua bước 1: dòng «Khách đã trả bạn X ₫» là lời khai bắt buộc. Nếu khách chưa trả mà đại lý muốn nộp trước, đại lý vẫn phải khai dòng này; đó là hệ quả của mô hình gộp (sổ không có chỗ cho tiền đại lý tự ứng). Ghi ở «Hệ quả». Số nợ dùng cho ân hạn và chặn huỷ đọc Công nợ còn lại theo Đ1 (đã làm ở phần A).
10. Khoản đã xác nhận thì không sửa được. Nếu ghi nhầm, khoản đó được huỷ bằng một dòng ngược lại, qua yêu cầu điều chỉnh có người thứ hai duyệt (luật sổ sẵn có).
11. **Gửi biên lai là bước SAU Gửi đơn** (lời chủ 13/11: *«để ưu tiên việc gửi đơn hàng, và coi phần bổ sung biên lai là bước sau»*):
    - Form lập đơn và nút «Gửi đơn» **không** có ô biên lai, không có ô chuyển tiền, không chặn hay hỏi gì về tiền nộp. Gửi đơn không phụ thuộc phần B.
    - Nút «Đã chuyển tiền» chỉ có trên phiếu công nợ ở chi tiết đơn, nên chỉ có khi đơn **đang ở trạng thái đã xác nhận** (Đ2 mục 2, Tổng công nợ đọc bản chụp lúc xác nhận — chưa xác nhận thì chưa có con số để kiểm trần ở mục 4). Đơn huỷ không có phiếu (mã phần A đã chặn); khoản nộp đang chờ mà đơn bị huỷ thì Kế toán từ chối.
    - Theo ADR-0136 Đ13.4 có hai nhánh sau «Gửi đơn» (sửa sau vòng kiểm độc lập 13/11, VỪA-1). **Nhánh B** (không có dịch vụ cần xác nhận, không chặng dưới mốc, đủ giờ đón): đơn được xác nhận ngay trong lần gửi, nên phiếu và nút «Đã chuyển tiền» có ngay. **Nhánh A**: đơn chờ văn phòng; có phiếu sau khi văn phòng xác nhận («Hết vé» thì đơn huỷ, không có phiếu).
    - Để đại lý không quên bước sau, màn báo gửi đơn xong có một câu nhắc theo nhánh (chữ chờ chủ chọn): nhánh B «Đơn đã được xác nhận. Bạn có thể chuyển tiền và gửi biên lai ở mục Xem công nợ với Tour Đảo.»; nhánh A «Đơn đang chờ xác nhận. Khi được xác nhận, bạn chuyển tiền và gửi biên lai ở mục Xem công nợ với Tour Đảo.» Danh sách việc của đại lý (nếu Nền tảng đang có chỗ đó cho Đối tác) hiện các đơn đã xác nhận, Công nợ còn lại > 0, chưa có khoản nộp đang chờ, kèm nút mở phiếu. Câu nhắc và danh sách chỉ nhắc, không chặn.
    - *Giả định của người soạn, chủ sửa được trong câu duyệt:* «sau bước gửi đơn» hiểu là «sau khi gửi, và khi đơn đã xác nhận». Phương án khác: cho gửi biên lai cả lúc đơn nhánh A còn chờ văn phòng — khi đó máy chưa có giá đại lý chốt để kiểm trần chống khai trùng, nên người soạn không khuyến nghị.
    - **Phạm vi của phần B** (sửa sau vòng kiểm độc lập 13/11, VỪA-3): chỉ đơn **có phiếu** theo mã phần A — đơn đại lý (`laDonDaiLy`) mà bên đặt là chính hồ sơ của tài khoản đang xem. Tài khoản Đối tác mà hồ sơ không phải bên đặt được hưởng, hoặc tài khoản lai: không có phiếu, nên không có nút «Đã chuyển tiền», và **giữ cổng vé cùng cách ghi như hôm nay** (Đ2 mục 12 không áp). Có bài kiểm cho ca này.
12. **Cổng mở vé của đơn đối tác lập tính theo giá đại lý** (sửa ADR-0170 Đ2 mục 1, chỉ cho đơn Thanh toán ngay do tài khoản giữ quyền Đối tác lập **và có phiếu** theo phạm vi ở mục 11; đơn Đối tác không có phiếu giữ cổng cũ; ADR đã duyệt không sửa chữ, văn bản này thay điều đó khi được duyệt):
    - Hôm nay: vé mở khi tiền **đã về công ty** ≥ phải thu **bán lẻ**. Đại lý nộp giá đại lý thì phần hoa hồng còn «ở tay đối tác», vé không bao giờ mở (lỗi C1 vẫn còn dù ghi sổ theo (b1)).
    - Mới: vé mở khi **cả hai** đúng: (i) khách đã trả đủ theo sổ — tổng khoản thu khách đang hiệu lực ≥ phải thu bán lẻ (`thuDu` trên số chưa trừ phần ở tay đối tác); và (ii) **Công nợ còn lại theo Đ1 ≤ 0**, chỉ tính khoản Tour Đảo đã nhận và **đã** được Kế toán xác nhận (khoản nộp đang chờ, khoản «Công ty thu» đang chờ đối chiếu không tính — giữ tinh thần ADR-0170).
    - Đại lý nộp đủ giá bán lẻ như hôm nay vẫn mở được (Đã thu ≥ giá đại lý). Đơn của nhân viên văn phòng không đổi. Đơn Trả sau không đổi (ADR-0168 Đ3 mục 1).
    - Đặt trong **hàm duy nhất** quyết định vé (`tienDonVe` của `billing`), lấy Công nợ còn lại từ **một chỗ** đã có của phần A (`src/modules/billing/cong-no-dai-ly.ts`); không viết công thức thứ hai. Câu báo cho đối tác khi còn khoản chờ giữ chữ ADR-0170 Đ2 mục 5.
    - Điều phải biết: vé mở **sớm hơn** hôm nay — khi Tour Đảo đã nhận đủ giá đại lý, thay vì đủ giá bán lẻ. Phần hoa hồng ở lại tay đại lý trước khi «Đã giao». Đơn huỷ sau đó thì số đại lý còn giữ vẫn hiện trên sổ là nợ của đại lý (không mất dấu), nhưng nằm trong vùng lỗi `TNV-G1`.
13. **Chặn ghi trùng một lần chuyển tiền ở hai đường:** đại lý ghi khoản nộp (đang chờ), rồi Kế toán lại ghi chính lần chuyển đó bằng đường quyết toán (`ghiQuyetToan`, chiều «nộp»), rồi xác nhận khoản nộp ⇒ trừ hai lần. Chặn bằng hai lớp, máy kiểm:
    - `ghiQuyetToan` chiều «nộp» cho một đơn **đang có khoản nộp chờ xác nhận** của chính người nộp ⇒ 409 «Đơn này đang có khoản nộp chờ xác nhận. Xác nhận hoặc từ chối khoản đó trước.» (chữ chờ chủ chọn).
    - Lúc xác nhận, máy kiểm lại trần: số khoản nộp ≤ số dư đại lý đang giữ ở đơn (`kiemQuyetToan`) **và** ≤ Công nợ còn lại tại lúc xác nhận **và** đơn không còn khoản «Công ty thu» đang chờ đối chiếu. Vượt hoặc còn khoản chờ ⇒ 409, khoản nộp vẫn ở trạng thái chờ; Kế toán xử lý khoản «Công ty thu» trước, hoặc từ chối khoản nộp có lý do.
    - Chiều ngược lại (sửa sau vòng kiểm độc lập 13/11, VỪA-4b): tài khoản Đối tác khai «Công ty thu» (kể cả chuyển khoản theo ADR-0196) cho đơn **đang có khoản nộp chờ xác nhận** ⇒ 409. Một lần tiền chỉ khai được ở một đường.
    - **Bấm hai lần / hai thẻ trình duyệt** (VỪA-4a): cơ sở dữ liệu chỉ cho **một khoản nộp đang chờ** trên mỗi đơn (chỉ mục duy nhất một phần trên bảng khoản nộp). Câu chèn khoản nộp đứng **đầu** lô; vi phạm thì cả lô dừng (kể cả khoản «Khách đã trả đại lý» ghi kèm), trả 409. Khoản thu ghi kèm cũng đi qua lính gác «chưa Khách đã trả đủ» (`receiptBeforeDeliveredStatement`) như `ghiLanThu`: lính gác không chèn thì các câu sau không chạy. Khi đơn đã «Khách đã trả đủ» thì X luôn = 0 nên không có khoản thu ghi kèm.

    **Sửa cùng đợt, không phải quyết định mới:** khe phần A do người kiểm ghi (mức vừa): Kế toán sửa tay dòng hoa hồng sau «Khách đã trả đủ» thì Công nợ còn lại chưa đổi theo. Đ1 mục 4 đã chốt «sửa mức sau xác nhận thì nợ đổi theo», nên đây là mã lệch văn bản, người thi công sửa mã cho khớp Đ1 mục 4 và thêm bài kiểm.

## Đ3 — Ô quyền mới

- `dai-ly.nop.ghi`: ghi khoản nộp và tải biên lai. Chỉ tài khoản Đối tác, chỉ cho đơn của chính hồ sơ mình.
- `dai-ly.nop.xac-nhan`: xác nhận hoặc từ chối khoản nộp. Dành cho Kế toán và Toàn quyền (khuôn quyền tiền ADR-0090). Quản trị không có ô này.
- Xem khoản nộp và biên lai: Kế toán, Toàn quyền, Quản trị (chỉ xem), và đại lý chủ khoản.
- **Xem phiếu công nợ với Tour Đảo** (Đ2 mục 2, kể cả QR của phiếu): **giữ nguyên như phần A đã chạy** (bản 2.96): ô sẵn có `credit.limit.view` / `credit.own.view` (`xemDuocPhieuCongNo`, `src/shared/cong-no-dai-ly.ts`). Phần B không đổi cổng phiếu. (Sửa sau vòng kiểm độc lập 13/11, VỪA-2: bản 12/11 nói dùng ô mới chung với khoản nộp, nhưng phần A đã thi công bằng ô sẵn có.)
- Không nới ô nào sẵn có. Đ2 mục 3 **siết** route QR hiện có với tài khoản Đối tác.

## Một luật cố định, không làm công tắc

Lúc hỏi, câu chọn có nói «khoản nào tính vào đã thu» sẽ là công tắc. Người soạn đề nghị **giữ cố định** điều này. Lý do: nếu có công tắc, chỉ một lần bật nhầm cho tính khoản đại lý tự khai là đại lý tự xoá được nợ của mình rồi đặt tiếp (ADR-0168 đã loại đường này). Ở phần việc này chỉ có một công tắc: «đại lý được sửa tay dòng Thu hộ» (ADR-0183).

## Phương án đã loại

- **Giữ ADR-0177** (chỉ trừ hoa hồng từ «Khách đã trả đủ»): số nợ đổi giữa chừng, hạn mức bị chiếm thừa trước bước đó. Chủ chọn cách mới.
- **Công thức tự gõ trên màn hình:** gõ sai một dấu là sai nợ của mọi đại lý, và máy không kiểm trước được. Chủ không chọn.
- **Chặn xác nhận khi thiếu mức:** đơn có thể kẹt lại. Chủ không chọn.
- **(b2) Sổ ghi thẳng theo công nợ của đơn** (bản 7/11, loại 12/11 khi chủ chọn (b1)): phải đổi cổng mở vé, «Khách đã trả đủ», cổng huỷ, ân hạn, nhắc nợ (ADR-0181), chặn ngừng hồ sơ (ADR-0173 Đ3 mục 5) sang số nợ mới, **và** chặn dòng `HOA_HONG` cho đơn đại lý đã nộp theo giá đại lý. Rộng hơn nhiều, nhiều chỗ dễ lệch.
- **Cho gửi biên lai ngay khi đơn còn chờ xác nhận** (13/11): chưa có giá đại lý chốt để kiểm trần chống khai trùng (Đ2 mục 11).

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
- (Sửa 13/11) Đơn Thanh toán ngay của đại lý sẽ **mở vé sớm hơn**: khi Tour Đảo đã nhận và xác nhận đủ giá đại lý, thay vì đủ giá bán lẻ. Vé vẫn chờ Kế toán xác nhận khoản nộp, nên đại lý trả trước sẽ thấy vé mở sau khi Kế toán bấm xác nhận, không phải ngay lúc gửi biên lai.
- (Sửa 13/11) Đại lý muốn nộp tiền trước khi khách trả (đơn Trả sau) vẫn phải khai «Khách đã trả bạn X ₫». Sổ hôm nay không có chỗ cho tiền đại lý tự ứng.
- (Sửa 13/11) Kế toán không ghi được quyết toán «nộp» cho đơn đang có khoản nộp chờ xác nhận của chính đại lý đó (Đ2 mục 13); phải xác nhận hoặc từ chối khoản đó trước. Mỗi đơn chỉ có một khoản nộp đang chờ cùng lúc.
- (Sửa 13/11) Kế toán từ chối khoản nộp thì dòng «Khách đã trả bạn X ₫» ghi kèm **vẫn giữ**: sổ vẫn ghi đại lý đang giữ tiền khách.
- (Sửa 13/11, kiểm độc lập N1) Đ1 mục 5 ngầm giả định giảm giá ≤ hoa hồng. Lúc lập đơn máy đã chặn (`discount_exceeds_commission`), nhưng nếu Kế toán hạ mức hoa hồng sau xác nhận xuống dưới số giảm giá thì phải thu của khách thấp hơn giá đại lý: đại lý nộp đủ giá đại lý sẽ vướng `settlement_exceeds_held`, vé không mở. Xử lý bằng yêu cầu điều chỉnh có người thứ hai duyệt.
- **Chưa kiểm:**
  - số đơn đại lý cũ trên production thiếu bản chụp mức hoa hồng;
  - báo cáo khoá tháng sẽ dùng số nợ nào;
  - Nền tảng hiện có danh sách việc cho tài khoản Đối tác không (Đ2 mục 11; không có thì chỉ giữ câu nhắc ở màn gửi đơn, việc dựng danh sách mới để sau);
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
| (13/11) Dòng khai trong form «Đã chuyển tiền» (Đ2 mục 9) | «Khách đã trả bạn X ₫» | «Bạn đã thu của khách X ₫» |
| (13/11) Câu nhắc ở màn gửi đơn xong, nhánh B (Đ2 mục 11) | «Đơn đã được xác nhận. Bạn có thể chuyển tiền và gửi biên lai ở mục Xem công nợ với Tour Đảo.» | — |
| (13/11) Câu nhắc ở màn gửi đơn xong, nhánh A (Đ2 mục 11) | «Đơn đang chờ xác nhận. Khi được xác nhận, bạn chuyển tiền và gửi biên lai ở mục Xem công nợ với Tour Đảo.» | — |
| (13/11) Câu chặn quyết toán trùng (Đ2 mục 13) | «Đơn này đang có khoản nộp chờ xác nhận. Xác nhận hoặc từ chối khoản đó trước.» | — |

## Trang ghép (quy trình «bước ghép khi duyệt»)

1. **Bảng chạm:**
   - sổ `bil_ledger_line`: dòng `SETTLEMENT` từ khoản nộp đã xác nhận, cùng hàm với quyết toán «nộp» (Đ2 mục 9) — **không thêm loại dòng mới**;
   - `bil_payment_receipt` + `bil_ledger_line`: khoản «Khách đã trả đại lý» ghi kèm (`BOOKER`, `HELD`), đi đường «Tôi thu» sẵn có, không thêm loại thực thể;
   - bảng mới của `billing` cho khoản nộp (gắn đúng một đơn) và bảng ảnh biên lai của khoản nộp (chép khuôn `bil_receipt_proof`); kho R2 `BIEN_LAI` dùng chung với ADR-0196, tiền tố khoá riêng;
   - đọc bản chụp hoa hồng của `orders` qua view công bố.

   Không thêm loại thực thể vào bảng dùng chung nào. `bil_receipt_proof` (ảnh của khoản **khách trả**) không nhận ảnh khoản nộp.
2. **Bản đồ quyền:**
   - thêm `dai-ly.nop.ghi` (Đối tác, phạm vi hồ sơ mình);
   - thêm `dai-ly.nop.xac-nhan` (Kế toán, Toàn quyền);
   - ô xem khoản nộp và biên lai (Kế toán, Toàn quyền, Quản trị; Đối tác phạm vi mình); phiếu công nợ giữ ô sẵn có của phần A (`credit.limit.view` / `credit.own.view`), không đổi;
   - ô xem Hạn mức trả sau giữ nguyên, nhưng con số hiển thị đổi nghĩa;
   - route QR hiện có (`qr-thanh-toan`) **siết**: tài khoản Đối tác nhận «không có QR».
3. **Cổng:**
   - route ghi khoản nộp: cổng `orders`, kiểm hồ sơ chủ đơn, kiểm tệp trước, một lô D1;
   - route phiếu công nợ và QR của phiếu: cổng `orders`, kiểm ô xem phiếu và hồ sơ chủ đơn; số tiền tính ở máy chủ;
   - route xem biên lai khoản nộp: qua Worker, nhật ký trước (khuôn ADR-0196 mục 6);
   - route xác nhận: cổng `office`, tách người ghi và người xác nhận; kiểm lại trần (Đ2 mục 13);
   - route quyết toán sẵn có (`POST /api/ledger/settlements`, chiều «nộp»): **siết** — 409 khi đơn có khoản nộp chờ xác nhận của chính người nộp (Đ2 mục 13);
   - cổng mở vé (`tienDonVe`, gốc lắp ráp tiêm vào `ve-dien-tu`): đơn Thanh toán ngay do Đối tác lập đổi điều kiện theo Đ2 mục 12 — đây là chỗ **nới** duy nhất của phần B (vé mở khi đủ giá đại lý thay vì đủ giá bán lẻ), chủ duyệt riêng; đơn văn phòng và đơn Trả sau không đổi.

   **Chỗ giao diện ẩn/hiện bị đổi nghĩa:** «Hạn mức trả sau», «Trả sau của tôi» và chi tiết đơn (con số nợ nay là Công nợ còn lại theo Đ1); thẻ Thanh toán của chi tiết đơn với tài khoản Đối tác: nút «QR thanh toán» biến mất, thêm nút «Xem công nợ với Tour Đảo», nút «Xem ảnh gửi khách» đổi chữ thành «Tạo biên nhận cho khách». Điều kiện hiện nút QR ở `web/order.ts` (đang dựa `t.kenhThu?.congTyThu`) phải thêm điều kiện «không phải tài khoản Đối tác».
