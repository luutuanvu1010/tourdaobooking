# ADR-0181 — Công nợ đại lý tính theo giá đại lý; đại lý nộp tiền có chứng từ, Kế toán xác nhận

- **Trạng thái:** **proposed** 2026-11-07. Chủ chốt hướng trong chat (phiên `claude/cong-no-0172-0173-372c0c`, hai hộp hỏi cùng ngày). Văn bản này chờ chủ duyệt; người soạn không tự duyệt (Hiến pháp N3).
- **Loại:** việc lớn (tiền, dữ liệu, quyền). **Cửa:** một chiều về số liệu (số nợ đại lý đã thấy đổi theo cách mới); hai chiều về mã.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1, Đ2, Đ3). Văn bản đi kèm ADR-0182 ở lượt duyệt **sau**; trang ghép ở cuối tệp này.
- **Xây trên lỗ đang hở:** `TNV-G1`, `HC-5.19` (như ADR-0172, ADR-0178). Chủ quyết lại có cho xây trên đó không.
- **Quan hệ với ADR cũ:**
  - **Sửa** ADR-0168 Đ2 mục 2: câu «Tính trên toàn bộ tiền phải thu, không trừ hoa hồng» bỏ; nợ tính theo Đ1 dưới đây.
  - **Sửa** ADR-0173 tiêu chí 5: hoa hồng được tính vào nợ ngay từ lúc xác nhận (qua giá đại lý), không chờ «thu đủ».
  - **Thay** ADR-0177 (proposed, chưa duyệt): câu hỏi «nợ có trừ hoa hồng không» nay trả lời là **có, từ đầu**. Đề nghị chủ đánh dấu 0177 là «bị thay bởi 0181».
  - **ADR-0178 Phần B** (Trả sau theo dịch vụ) trước chờ 0177, nay chờ văn bản này.
  - **Khớp** ADR-0079 (sổ đại lý): dòng «Giảm giá bên đặt chịu» là phần đại lý tự nhường cho khách, nên theo công thức mới giảm giá không làm đổi nợ. Đó đúng là nghĩa của dòng sổ ấy.
  - **Giữ** ADR-0168 phần còn lại (hạn mức, chặn khi quá hạn), ADR-0172, ADR-0173 phần còn lại, ADR-0090 (quyền tiền), ADR-0178 Phần A (công tắc).

## Bối cảnh

Hôm nay số nợ của đại lý đổi giữa chừng: trước «Xong và đủ tiền» là giá bán lẻ trừ giảm giá, sau đó là giá bán lẻ trừ hoa hồng. Hạn mức bị chiếm nhiều hơn số đại lý thật phải nộp. Chủ coi công nợ là phần «vô cùng quan trọng» và muốn **một cách tính** cho mọi nơi.

## Đ1 — Một cách tính công nợ cho mọi đơn đại lý

1. **Đơn đại lý** = bên đặt là hồ sơ đối tác, hoặc người lập là tài khoản chỉ mang quyền Đối tác. Đây chính là luật đang chọn mẫu biên nhận HD-02-DT (`mauBienNhan`), dùng lại, không viết luật thứ hai. Áp cho mọi đơn đại lý, Trả sau hay trả trước.
2. **Tổng công nợ** của đơn = Σ từng dòng dịch vụ (số lượng × giá đại lý). **Giá đại lý** của một dòng = thành tiền dòng − hoa hồng dòng, đọc từ **bản chụp lúc xác nhận** (cùng nguồn với khối «Phần đối tác»), không phải bảng giá mới. Hoa hồng lớn hơn thành tiền thì giá đại lý = 0.
3. **Dòng thiếu mức hoa hồng** lúc xác nhận: tính theo **giá bán lẻ** (chủ chọn). Khi Kế toán chụp bù hoặc ghi mức tay, nợ giảm theo.
4. **Sửa mức sau xác nhận** (ghi mức tay, chụp bù, điều chỉnh): nợ **đổi theo**. Nợ tăng làm vượt hạn mức thì không chặn, chỉ cảnh báo cho Kế toán (khuôn R-CRD-3 sẵn có) (chủ chọn).
5. **Giảm giá và đặt cọc không làm đổi Tổng công nợ.** Giảm giá là đại lý nhường hoa hồng của mình; tiền cọc nằm ở tay đại lý.
6. **Đã thu** = tổng các khoản **Tour Đảo thật sự đã nhận và Kế toán đã xác nhận**, gồm: (a) tiền khách trả thẳng cho Tour Đảo (thu hộ); (b) tiền đại lý nộp về theo Đ2. Khoản đại lý tự khai («Tôi thu»), dòng «Thu hộ đối tác» dự kiến trên biên nhận (ADR-0182) và khoản đang chờ đối chiếu **không** tính.
7. **Công nợ còn lại** = Tổng công nợ − Đã thu. Số âm nghĩa là Tour Đảo đang nợ đại lý (khách trả Tour Đảo nhiều hơn giá đại lý); màn hiện «Tour Đảo nợ đại lý …», không coi là nợ của đại lý.
8. **Hạn mức Trả sau** dùng đúng Công nợ còn lại của các đơn Trả sau (thay `noTheoDon` hiện nay). Đơn huỷ giữ luật ADR-0168 Đ3.
9. Một phần nghiệp vụ riêng **«Công nợ đại lý»** giữ công thức này ở đúng một chỗ, có bài kiểm canh; mọi màn (Hạn mức trả sau, Trả sau của tôi, chi tiết đơn, Sổ công nợ) chỉ gọi nó. Số tiền chỉ tính ở máy chủ.

## Đ2 — Đại lý nộp tiền có chứng từ, Kế toán xác nhận

1. Đại lý chuyển tiền cho Tour Đảo bên ngoài Nền tảng (chủ nói). Trong Nền tảng, đại lý ghi một **khoản nộp**: số tiền, ngày chuyển, đơn được trừ (một hoặc nhiều đơn), kèm **ảnh hoặc PDF biên lai**. Tệp theo khuôn ADR-0144 (loại, cỡ, số tệp mỗi giờ).
2. Khoản nộp ở trạng thái «Chờ Kế toán xác nhận», chưa tính vào Đã thu.
3. Kế toán đối chiếu sao kê ngân hàng ngoài phần mềm, rồi **xác nhận** (khoản vào Đã thu, sổ ghi dòng quyết toán như hiện nay) hoặc **từ chối có lý do** (đại lý thấy lý do). Người ghi và người xác nhận phải khác nhau, như luật sổ tiền hiện có.
4. Đã xác nhận rồi thì không sửa; ghi nhầm thì huỷ bằng dòng ngược lại qua yêu cầu điều chỉnh có người thứ hai duyệt (luật sổ sẵn có).

## Đ3 — Ô quyền mới

- `dai-ly.nop.ghi`: ghi khoản nộp và tải biên lai. Chỉ tài khoản Đối tác, chỉ cho đơn của chính hồ sơ mình.
- `dai-ly.nop.xac-nhan`: xác nhận / từ chối. Kế toán và Toàn quyền (khuôn quyền tiền ADR-0090). Quản trị không.
- Xem khoản nộp và biên lai: Kế toán, Toàn quyền, Quản trị (chỉ xem), và đại lý chủ khoản.
- Không nới ô nào sẵn có.

## Một luật cố định, không làm công tắc

Lúc hỏi, câu chọn có nói «khoản nào tính vào đã thu» sẽ là công tắc. Người soạn đề nghị **giữ cố định** điều này: nếu có công tắc, một lần bật nhầm cho tính khoản đại lý tự khai sẽ để đại lý tự xoá nợ của mình rồi đặt tiếp (ADR-0168 đã loại đường này). Công tắc duy nhất ở phần này là «đại lý được sửa tay dòng Thu hộ» (ADR-0182).

## Phương án đã loại

- **Giữ nợ theo giá bán lẻ, hoa hồng trả sau** (ADR-0168 cũ): số nợ đổi giữa chừng, hạn mức bị chiếm thừa. Chủ không chọn.
- **Công thức tự gõ trên màn hình:** gõ sai một dấu là sai nợ mọi đại lý, máy không kiểm trước được. Chủ không chọn.
- **Chặn xác nhận khi thiếu mức:** đơn có thể kẹt. Chủ không chọn.

## Hệ quả chủ cần biết

- Ngay lúc phát hành, nợ của các đơn đại lý cũ đổi sang cách mới (thường **giảm** đúng phần hoa hồng). Hạn mức khả dụng tăng theo.
- Đơn có dòng thiếu mức sẽ hiện nợ cao hơn thật cho tới khi Kế toán ghi mức.
- Khoản đại lý đã nộp mà chưa ghi trong Nền tảng sẽ không trừ nợ cho tới khi được ghi và xác nhận.
- **Chưa kiểm:** các đơn đại lý cũ trên production có bao nhiêu dòng thiếu bản chụp; báo cáo khoá tháng dùng số nợ nào.

## Trang ghép (Hiến pháp quy trình «bước ghép khi duyệt»)

1. **Bảng chạm:** sổ `bil_ledger_line` (thêm dòng quyết toán từ khoản nộp đã xác nhận, loại sẵn có); bảng mới của `billing` cho khoản nộp và tệp biên lai; đọc bản chụp hoa hồng của `orders` qua view công bố. Không thêm loại thực thể vào bảng dùng chung nào.
2. **Bản đồ quyền:** thêm `dai-ly.nop.ghi` (Đối tác, phạm vi hồ sơ mình), `dai-ly.nop.xac-nhan` (Kế toán, Toàn quyền); ô xem Hạn mức trả sau giữ nguyên nhưng con số đổi nghĩa.
3. **Cổng:** route ghi khoản nộp (cổng `orders`, kiểm hồ sơ chủ đơn), route xác nhận (cổng `office`, tách người). **Chỗ giao diện đổi nghĩa:** «Hạn mức trả sau», «Trả sau của tôi», chi tiết đơn: con số nợ nay là Công nợ còn lại theo Đ1.
