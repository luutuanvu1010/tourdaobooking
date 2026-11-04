# ADR-0163 — Toàn quyền xoá hẳn dữ liệu để thử nghiệm

- **Trạng thái:** **proposed** 2026-11-04, chờ chủ dự án duyệt. Lời chủ, nguyên văn: *«tạo 1 quyết định mới cho phép toàn quyền có thể xóa bất kỳ dữ liệu nào, lý do là để thử nghiệm»*; rồi, sau khi nghe cảnh báo về luật gốc và dữ liệu thật: *«Vậy thì cả 2, vừa cho phép xóa ở bản thật, vừa tạo 1 bản hoàn toàn độc lập là Development (staging)…»*.
- **Cửa:** quyền này là hai chiều (hết hạn hoặc tắt được). **Mỗi lần xoá là một chiều.**
- **Loại:** việc lớn (dữ liệu, quyền, tiền, luật).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 2** (cùng [ADR-0162](ADR-0162-ban-development-doc-lap-va-mot-lenh-len-chinh-thuc.md)). Trang ghép: `docs/superpowers/specs/2026-11-04-trang-ghep-ban-development-va-xoa-du-lieu.md`.
- **Xây trên lỗ đang hở: HC-5.19** (chưa từng diễn tập khôi phục, mà khôi phục là đường lui duy nhất của việc xoá); **HC-4.2, TNV-G1, TNV-G3, TNV-G4** (sổ tiền, vì xoá chạm chính sổ đó). Đ7 đặt điều kiện cho HC-5.19.
- **Lệch có chủ ý** (Hiến chương hệ thống 6.2): **điều 5.5** («Không xoá cứng», «Không xoá dây chuyền», sổ và nhật ký chỉ-thêm), **điều 4.2a** (sửa sai tiền theo mốc chốt), **dòng 12 và 13 của Kernel 18**, vì chủ cần dọn sạch dữ liệu thử trên bản chính thức trong giai đoạn thử nghiệm. Lệch chỉ hợp lệ khi chủ duyệt, và chỉ trong hạn ở Đ6.
- **Sửa Phần I của Hiến chương dự án** (chủ duyệt mới có hiệu lực, Điều 6.4): thêm điều **5.27** làm ngoại lệ có tên; 4.2, 5.5, 5.24 và mục dữ liệu ở Phần II trỏ về đó. Bản đề xuất nằm trong cùng nhánh này.
- **Quan hệ với quyết định khác:** [ADR-0158](ADR-0158-xoa-mot-lan-du-lieu-thu-truoc-khi-dung-that.md) giữ nguyên là hồ sơ của một lần dọn; quyết định này là lựa chọn mới của chủ, không lấy ADR-0158 làm tiền lệ. Luật ở ADR-0002 (chỉ module chủ ghi bảng của mình) và Hiến pháp N5 giữ nguyên, xem Đ3 và Đ5.

## Bối cảnh

Chủ thử nghiệm trên bản chính thức và cần xoá được dữ liệu sinh ra từ việc thử. Hôm nay không có đường nào làm việc đó trên giao diện: lần dọn 2/11 phải viết tệp riêng và chủ tự chạy. Lần bàn 31/10 về nút xoá đơn chưa thành quyết định; ngày 4/11 chủ chọn xoá hẳn.

## Đ1 — Ai

Chỉ Toàn quyền, qua thao tác mới `data.hard_delete` (mọi quyền khác là `none`), do máy chủ thi hành. Mọi lần xoá phải xác nhận lại danh tính ngay trước khi chạy.

## Đ2 — Xoá được gì

**Mọi dữ liệu:** đơn, sổ tiền, kỳ đã khoá, chuyến, vé, hồ sơ, tài khoản, danh mục, chính sách, nhật ký và tệp đính kèm.

**Không xoá được** (đề xuất của người soạn; chủ xem lại khi duyệt):

1. Sổ xoá ở Đ4, vì thiếu nó thì không còn biết ai đã xoá.
2. Tài khoản Toàn quyền đang bấm và hồ sơ công ty chủ, vì thiếu chúng Nền tảng không dùng được.
3. Cấu trúc và bảng mã hệ thống (bảng, trigger, mã quyền, mã trạng thái), vì đó là một phần của chương trình, không phải dữ liệu.

## Đ3 — Xoá kéo theo

Dòng nào có dòng khác phụ thuộc thì các dòng đó bị xoá cùng, trong **một lô**: hoặc xong hết, hoặc không xoá gì. Sau khi xoá, dữ liệu còn lại vẫn phải đạt `audit-invariants`, không để lại dòng mồ côi hay sổ lệch một vế (Hiến pháp N5). Một lần xoá mà không giữ được điều này thì bị từ chối.

## Đ4 — Sổ xoá

Mỗi lần xoá ghi một dòng vào một sổ mới, trong cùng lô: ai, lúc nào, lý do, loại dữ liệu, mã bản ghi, số dòng đã xoá theo từng bảng. Sổ chỉ mang mã, không mang nội dung bị xoá (theo cách của điều 5.24), và chỉ Toàn quyền đọc được. Sổ không sửa, không xoá được, kể cả bằng chính đường xoá này.

## Đ5 — Mọi đường khác vẫn bị chặn

- Các trigger chặn xoá **không bị gỡ**. Chúng chỉ nhường khi có «vé xoá» ghi trong cùng lô với câu xoá, và vé bị huỷ ở cuối lô. Xoá bằng đường khác trong mã, hay gõ SQL tay mà không có vé, vẫn bị từ chối.
- Mỗi module tự khai câu xoá của mình qua `index.ts`; một lệnh ở gốc lắp ráp ghép chúng thành một lô, nên ADR-0002 vẫn đúng.
- Màn hình làm theo thứ tự: chọn bản ghi → xem trước toàn bộ phần sẽ bị xoá kèm số đếm → nhập lý do → gõ lại mã bản ghi → xác nhận lại danh tính. Số đếm đổi sau lúc xem trước thì từ chối.

## Đ6 — Có hạn, vì lý do là thử nghiệm

Trên bản chính thức, quyền này mặc định **tắt** và hết hiệu lực từ **2026-12-31** (đề xuất; chủ ghi ngày khác khi duyệt được). Hết hạn thì máy chủ từ chối, không cần phát hành gì. Gia hạn phải có chủ duyệt và ghi lý do. Trên Development (ADR-0162) không có hạn.

## Đ7 — Thứ tự phát hành

1. Dựng xong ADR-0162, rồi xây và thử tính năng này trên Development trước.
2. Chỉ lên bản chính thức sau khi đã diễn tập khôi phục đạt (HC-5.19), vì đó là đường lui duy nhất. Nếu chủ muốn lên trước diễn tập thì ghi lý do vào `docs/quyen-hoan.json`.

## Hệ quả chủ cần biết

- **Xoá là mất.** Đường lui duy nhất là điểm khôi phục của D1, đưa **cả** cơ sở dữ liệu về lúc đó nên mất mọi dữ liệu mới sau đó, và chỉ còn trong thời hạn Time Travel. **Tệp trong kho không có điểm khôi phục.**
- **Xoá chạm tiền thì số đã báo không còn khớp**, kể cả kỳ đã khoá sổ. **Chưa kiểm:** nghĩa vụ lưu giữ sổ kế toán và chứng từ theo pháp luật; cần kế toán hoặc luật sư xác nhận trước khi xoá trên dữ liệu thật (điều 5.24 đang ghi đây là phần pháp luật bắt giữ).
- **Xoá nhật ký thì mất dấu vết việc cũ**, chỉ sổ xoá còn lại.
- Một phiên Toàn quyền bị lộ có thể gây thiệt hại lớn; Đ1, Đ5 và Đ6 giảm rủi ro này chứ không xoá hết.
- Tin, thông báo và đường dẫn đã gửi khách có thể trỏ tới bản ghi không còn. Mã đơn có thể đánh số trùng với đơn đã xoá cùng ngày (như đã ghi ở ADR-0158).

## Việc kèm khi thi công

`CLAUDE.md` §7, tờ khai `docs/kernel-18.md` dòng 12 và 13 (cột lệch có ADR), `docs/SO-HANG-RAO.md`, `docs/data-dictionary.json`, bản đồ quyền và bài ghim quyền.

## Tiêu chí nghiệm thu

1. Mọi quyền trừ Toàn quyền gọi route xoá đều bị từ chối.
2. `DELETE` trên một bảng có chặn, không có vé xoá, bị từ chối ở cơ sở dữ liệu (quan sát chặn thật, ghi sổ hàng rào).
3. Xoá một đơn có sổ tiền và chuyến: `audit-invariants` vẫn đạt, sổ xoá có đúng một dòng với số đếm khớp.
4. Sổ xoá không sửa, không xoá được kể cả khi có vé xoá. Sổ không chứa tên, số điện thoại hay nội dung bản ghi.
5. Một câu trong lô hỏng thì không dòng nào bị xoá.
6. Sau ngày hết hạn, hoặc khi đang tắt, route từ chối trên bản chính thức.
