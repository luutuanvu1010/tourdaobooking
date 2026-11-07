# ADR-0182 — Công nợ đại lý tính theo giá đại lý; đại lý nộp tiền có chứng từ, Kế toán xác nhận

- **Trạng thái:** **proposed** 2026-11-07. Chủ chốt hướng trong chat (phiên `claude/cong-no-0172-0173-372c0c`, ba hộp hỏi cùng ngày). Chờ chủ duyệt; người soạn không tự duyệt (Hiến pháp N3). Đã qua một vòng kiểm độc lập chỉ đọc (7/11), các lỗi sai sự thật đã sửa.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). **Cửa:** một chiều về số liệu (số nợ đại lý đã hiện theo cách mới); hai chiều về mã.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1, Đ2, Đ3). ADR-0183 trình ở lượt **sau**. Trang ghép ở cuối tệp.
- **Xây trên lỗ đang hở:** `TNV-G1`, `HC-5.19` (như ADR-0172, ADR-0178). Chủ quyết lại có cho xây trên đó không.
- **Quan hệ với ADR cũ:**
  - **Thay** ADR-0177 (**accepted** sáng 7/11, ở nhánh `claude/tra-sau-sau-kiem-7-11`, chưa nhập `main`). ADR-0177 cho nợ trừ hoa hồng **từ «Khách đã trả đủ»**; văn bản này trừ **từ lúc xác nhận**. Sau «Khách đã trả đủ» hai cách cho cùng một số. ADR đã duyệt không sửa; văn bản này thay nó khi được duyệt.
  - **Sửa** ADR-0168 Đ2 mục 2: bỏ câu «Tính trên toàn bộ tiền phải thu, không trừ hoa hồng».
  - **Sửa** ADR-0173 Đ3 mục 1 và tiêu chí 5 ở phần «đối trừ»: hoa hồng được trừ vào nợ ngay từ lúc xác nhận (qua giá đại lý). Phần «hoa hồng chưa vào kỳ trả cho đại lý khi đơn còn nợ» **giữ nguyên**.
  - **Quan hệ** với ADR-0181 của nhánh `claude/tra-sau-sau-kiem-7-11` (nhắc, nới hạn đơn đã xong còn nợ; gỡ vai thì hết hạn mức): cùng vùng công nợ, không chồng luật. Số «còn nợ» ở đó đọc theo Đ1 dưới đây. Đơn đã «Khách đã trả đủ» mà còn nợ vẫn được nhắc và dùng được «Ân hạn» theo ADR-0181; văn bản này không đổi điều đó.
  - **ADR-0178 Đ2** (Trả sau theo dịch vụ, đứng ngoài hạn mức): công nợ của các đơn đó cũng tính theo Đ1, nhưng **vẫn không** vào hạn mức như ADR-0178 đã chốt.
  - **Khớp** ADR-0079 (sổ đại lý): dòng «Giảm giá bên đặt chịu» là phần đại lý tự nhường cho khách. Theo công thức mới, giảm giá không làm đổi nợ, đúng nghĩa dòng sổ ấy.
  - **Đổi có chủ ý** ADR-0109 («phải thu không âm») ở riêng con số công nợ đại lý: Đ1 mục 7 cho phép số âm, tức Tour Đảo nợ đại lý. Phải thu của khách vẫn không âm.
  - **Giữ** ADR-0168 phần còn lại, ADR-0172, ADR-0090 (quyền tiền), ADR-0170 Đ2 mục 2 (tiền nhân viên cầm hộ), ADR-0178 Đ1 (công tắc).

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

## Đ2 — Đại lý nộp tiền có chứng từ, Kế toán xác nhận

1. Đại lý chuyển tiền cho Tour Đảo bên ngoài Nền tảng (chủ nói). Trong Nền tảng, đại lý ghi một **khoản nộp**: số tiền, ngày chuyển, các đơn được trừ, kèm **ảnh hoặc PDF biên lai**. Tệp theo khuôn ADR-0144 (loại tệp, cỡ, số tệp mỗi giờ).
2. Khoản nộp ở trạng thái «Chờ Kế toán xác nhận» và chưa tính vào Đã thu.
3. Kế toán đối chiếu với sao kê ngân hàng ngoài phần mềm, rồi chọn một trong hai:
   - **xác nhận**: khoản vào Đã thu;
   - **từ chối có lý do**: đại lý thấy lý do.

   Người ghi và người xác nhận phải khác nhau. **Đây là luật mới cho đường này**: đường quyết toán hiện nay (`ghiQuyetToan`) chưa có luật tách người.
4. **Cách ghi sổ là việc phải xây mới.** Đường quyết toán hiện nay chỉ nhận số nộp nhỏ hơn hoặc bằng số đại lý đang giữ theo sổ (`settlement_exceeds_held`). Vì thế khoản đại lý nộp khi chưa ghi «Tôi thu» sẽ bị từ chối, dù công nợ theo Đ1 vẫn còn. Kế hoạch thi công phải chọn cách ghi để khoản đã xác nhận luôn trừ được vào công nợ theo Đ1. Đề xuất: sổ ghi theo công nợ của đơn, không theo số đang giữ. Đây là điểm chủ cần biết là chưa xây.
5. Khoản đã xác nhận thì không sửa được. Nếu ghi nhầm, khoản đó được huỷ bằng một dòng ngược lại, qua yêu cầu điều chỉnh có người thứ hai duyệt (luật sổ sẵn có).

## Đ3 — Ô quyền mới

- `dai-ly.nop.ghi`: ghi khoản nộp và tải biên lai. Chỉ tài khoản Đối tác, chỉ cho đơn của chính hồ sơ mình.
- `dai-ly.nop.xac-nhan`: xác nhận hoặc từ chối khoản nộp. Dành cho Kế toán và Toàn quyền (khuôn quyền tiền ADR-0090). Quản trị không có ô này.
- Xem khoản nộp và biên lai: Kế toán, Toàn quyền, Quản trị (chỉ xem), và đại lý chủ khoản.
- Không nới ô nào sẵn có.

## Một luật cố định, không làm công tắc

Lúc hỏi, câu chọn có nói «khoản nào tính vào đã thu» sẽ là công tắc. Người soạn đề nghị **giữ cố định** điều này. Lý do: nếu có công tắc, chỉ một lần bật nhầm cho tính khoản đại lý tự khai là đại lý tự xoá được nợ của mình rồi đặt tiếp (ADR-0168 đã loại đường này). Ở phần việc này chỉ có một công tắc: «đại lý được sửa tay dòng Thu hộ» (ADR-0183).

## Phương án đã loại

- **Giữ ADR-0177** (chỉ trừ hoa hồng từ «Khách đã trả đủ»): số nợ đổi giữa chừng, hạn mức bị chiếm thừa trước bước đó. Chủ chọn cách mới.
- **Công thức tự gõ trên màn hình:** gõ sai một dấu là sai nợ của mọi đại lý, và máy không kiểm trước được. Chủ không chọn.
- **Chặn xác nhận khi thiếu mức:** đơn có thể kẹt lại. Chủ không chọn.

## Hệ quả chủ cần biết

- Ngay lúc phát hành, đơn đại lý **chưa** «Khách đã trả đủ» sẽ giảm nợ một khoản bằng hoa hồng trừ giảm giá. Đơn **đã** xong giữ nguyên số nợ, vì mã hiện nay đã tính đúng như công thức mới.
- Hạn mức khả dụng tăng theo phần giảm đó.
- Đơn có dòng thiếu mức sẽ hiện nợ cao hơn thật cho tới khi Kế toán ghi mức.
- Khoản đại lý đã nộp mà chưa ghi trong Nền tảng sẽ không được trừ nợ cho tới khi đại lý ghi và Kế toán xác nhận.
- **Chưa kiểm:**
  - số đơn đại lý cũ trên production thiếu bản chụp mức hoa hồng;
  - báo cáo khoá tháng sẽ dùng số nợ nào;
  - cách ghi sổ ở Đ2 mục 4.

## Trang ghép (quy trình «bước ghép khi duyệt»)

1. **Bảng chạm:**
   - sổ `bil_ledger_line`: dòng từ khoản nộp đã xác nhận (cách ghi chốt ở kế hoạch, Đ2 mục 4);
   - bảng mới của `billing` cho khoản nộp và tệp biên lai;
   - đọc bản chụp hoa hồng của `orders` qua view công bố.

   Không thêm loại thực thể vào bảng dùng chung nào.
2. **Bản đồ quyền:**
   - thêm `dai-ly.nop.ghi` (Đối tác, phạm vi hồ sơ mình);
   - thêm `dai-ly.nop.xac-nhan` (Kế toán, Toàn quyền);
   - ô xem Hạn mức trả sau giữ nguyên, nhưng con số hiển thị đổi nghĩa.
3. **Cổng:**
   - route ghi khoản nộp: cổng `orders`, kiểm hồ sơ chủ đơn;
   - route xác nhận: cổng `office`, tách người ghi và người xác nhận.

   **Chỗ giao diện đổi nghĩa:** «Hạn mức trả sau», «Trả sau của tôi» và chi tiết đơn. Con số nợ ở cả ba chỗ nay là Công nợ còn lại theo Đ1.
