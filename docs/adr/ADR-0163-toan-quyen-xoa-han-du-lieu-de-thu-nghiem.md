# ADR-0163 — Toàn quyền xoá hẳn dữ liệu để thử nghiệm

- **Trạng thái:** **proposed, TẠM GÁC** 2026-11-04. Chủ, nguyên văn: *«ok tạm chưa xóa dữ liệu trong Production, mà cho ẩn»*; thay bằng [ADR-0164](ADR-0164-toan-quyen-an-du-lieu-vo-hieu-hoa-va-co-lap.md) và [ADR-0165](ADR-0165-an-don-co-tien-bang-dao-tien.md). Việc sửa Hiến pháp chưa làm; ghi ở `docs/BACKLOG.md` mục 63. Nội dung dưới đây giữ làm tư liệu khi mở lại: quyết định này **bị Hiến pháp chặn tới khi kho luật gốc sửa** (mục dưới), và chưa rõ hạng tuyệt đối có sửa được không. Lời chủ trước đó, nguyên văn: *«tạo 1 quyết định mới cho phép toàn quyền có thể xóa bất kỳ dữ liệu nào, lý do là để thử nghiệm»*; rồi *«Vậy thì cả 2, vừa cho phép xóa ở bản thật, vừa tạo 1 bản hoàn toàn độc lập là Development (staging)…»*; sau khi được báo Hiến pháp chặn, chủ chọn *«Sửa Hiến pháp ở kho luật gốc»*.
- **Điều chặn:** Hiến pháp 5.8 xếp N5 áp trên dữ liệu đã phát hành vào hạng tuyệt đối, nguyên văn *«không bao giờ bẻ, kể cả chủ dự án»*. Bản kho luật gốc của N5 ghi thêm: cái đã phát hành ra thực tế thì không sửa lại quá khứ. Xoá sổ tiền, kỳ đã khoá và nhật ký của bản chính thức đang dùng chính là việc đó. Một ADR hay một điều ở Phần I không mở được, vì tầng dự án không được nới tầng trên (Hiến pháp 9.7). Đường duy nhất là sửa Hiến pháp theo Điều 9 (ít nhất 7 ngày cân nhắc, tăng số phiên bản chính, vượt ngưỡng bánh cóc 9.4) rồi nâng bản ghim của dự án.
- **Cửa:** quyền này là hai chiều (hết hạn hoặc tắt được). **Mỗi lần xoá là một chiều.**
- **Loại:** việc lớn (dữ liệu, quyền, tiền, luật).
- **Số quyết định chạm quyền/dữ liệu:** khi trình lại sẽ tính riêng; ghép với [ADR-0162](ADR-0162-ban-development-doc-lap-va-mot-lenh-len-chinh-thuc.md) ở `docs/superpowers/specs/2026-11-04-trang-ghep-ban-development-va-xoa-du-lieu.md`.
- **Xây trên lỗ đang hở: HC-5.19** (chưa từng diễn tập khôi phục, mà khôi phục là đường lui duy nhất của việc xoá); **HC-4.2, TNV-G1, TNV-G3, TNV-G4** (sổ tiền, vì xoá chạm chính sổ đó). Theo `CLAUDE.md` §3, ADR này không được duyệt trước khi từng lỗ được vá, hoặc chủ chọn «Cho phép, có ghi lý do» cho từng mã ở `docs/quyen-hoan.json`.
- **Lệch có chủ ý** (Hiến chương hệ thống 6.2, chỉ hợp lệ khi chủ duyệt, sau khi Hiến pháp đã sửa): **điều 5.5** («Không xoá cứng», «Không xoá dây chuyền», sổ và nhật ký chỉ-thêm), **4.2a** (sửa sai tiền theo mốc chốt), **5.1** (tiền đã chốt không đổi, giữ ở tầng lưu trữ), **5.14** (khoá kỳ), **dòng 12 và 13 của Kernel 18**, vì chủ cần dọn dữ liệu thử trên bản chính thức trong giai đoạn thử nghiệm.
- **Phần I của Hiến chương dự án:** 4.2, 5.5, 5.14 và 5.24 phải có ngoại lệ có tên. Đề xuất điều **5.27** đã rút khỏi nhánh (commit `1b7e2d59`, hoàn lại ở `ee7342fd`) vì chưa được phép; lấy lại khi Hiến pháp đã sửa.
- **Quan hệ với quyết định khác:** [ADR-0158](ADR-0158-xoa-mot-lan-du-lieu-thu-truoc-khi-dung-that.md) giữ nguyên là hồ sơ của một lần dọn dữ liệu thử trước khi dùng thật, không làm tiền lệ cho dữ liệu đã dùng thật. ADR-0002 (chỉ module chủ ghi bảng của mình) giữ nguyên, xem Đ5.

## Bối cảnh

Chủ thử nghiệm trên bản chính thức và cần xoá được dữ liệu sinh ra từ việc thử. Hôm nay không có đường nào làm việc đó trên giao diện: lần dọn 2/11 phải viết tệp riêng và chủ tự chạy. Theo ghi nhớ phiên (không có trong tài liệu), lần bàn 31/10 về nút xoá đơn chưa thành quyết định; ngày 4/11 chủ chọn xoá hẳn.

Trong lúc chờ, thử nghiệm đi được trên bản Development: dữ liệu ở đó không phát hành, và có lệnh làm mới về trạng thái sạch (ADR-0162 Đ2).

## Đ1 — Ai

Chỉ Toàn quyền, qua thao tác mới `data.hard_delete` (mọi quyền khác là `none`), do máy chủ thi hành. Mọi lần xoá phải xác nhận lại danh tính ngay trước khi chạy; hôm nay chưa thấy cơ chế sẵn có cho việc này, kế hoạch thi công phải chốt.

## Đ2 — Xoá được gì

**Mọi dữ liệu:** đơn, sổ tiền, kỳ đã khoá, chuyến, vé, hồ sơ, tài khoản, danh mục, chính sách, nhật ký và tệp đính kèm.

**Không xoá được** (đề xuất của người soạn; chủ xem lại khi duyệt):

1. Sổ xoá ở Đ4, vì thiếu nó thì không còn biết ai đã xoá.
2. Tài khoản Toàn quyền đang bấm và hồ sơ công ty chủ, vì thiếu chúng Nền tảng không dùng được.
3. Cấu trúc và bảng mã hệ thống (bảng, trigger, mã quyền, mã trạng thái), vì đó là một phần của chương trình, không phải dữ liệu.

## Đ3 — Xoá kéo theo

Dòng nào có dòng khác phụ thuộc thì các dòng đó bị xoá cùng, trong **một lô**: hoặc xong hết, hoặc không xoá gì. Sau khi xoá, dữ liệu còn lại vẫn phải đạt `audit-invariants`, không để lại dòng mồ côi hay sổ lệch một vế; một lần xoá không giữ được điều này thì bị từ chối. Đây chỉ là điều kiện toàn vẹn của phần còn lại, **không thay cho việc sửa N5**.

## Đ4 — Sổ xoá

Mỗi lần xoá ghi một dòng vào một sổ mới, trong cùng lô: ai, lúc nào, lý do, loại dữ liệu, mã bản ghi, số dòng đã xoá theo từng bảng. Sổ chỉ mang mã, không mang nội dung bị xoá (theo cách của điều 5.24), và chỉ Toàn quyền đọc được. Sổ không sửa, không xoá được, kể cả bằng chính đường xoá này.

## Đ5 — Mọi đường khác vẫn bị chặn

- Các trigger chặn xoá chỉ nhường khi có «vé xoá» ghi trong cùng lô với câu xoá, và vé bị huỷ ở cuối lô. Xoá bằng đường khác trong mã, hay gõ SQL tay mà không có vé, vẫn bị từ chối.
- Việc này cần **một migration mới** thay khoảng 100 trigger trên khoảng 100 bảng, vì migration đã áp không được sửa, kèm bài chứng minh cấu trúc trước và sau chỉ khác điều kiện nhường vé. Migration đi lên cả bản chính thức, nên chỉ được phát hành sau khi Hiến pháp đã sửa và chủ đã duyệt.
- Mỗi module tự khai câu xoá của mình qua `index.ts`; một lệnh ở gốc lắp ráp ghép chúng thành một lô. Với các module cũ còn ngoại lệ kiến trúc, kế hoạch thi công phải nói rõ cách làm.
- Màn hình làm theo thứ tự: chọn bản ghi → xem trước toàn bộ phần sẽ bị xoá kèm số đếm → nhập lý do → gõ lại mã bản ghi → xác nhận lại danh tính. Số đếm đổi sau lúc xem trước thì từ chối (đề xuất của người soạn).

## Đ6 — Có hạn, vì lý do là thử nghiệm

Trên bản chính thức, quyền này mặc định **tắt** và hết hiệu lực từ **2026-12-31** (đề xuất của người soạn; chủ ghi ngày khác khi duyệt được). Hết hạn thì máy chủ từ chối, không cần phát hành gì. Gia hạn phải có chủ duyệt và ghi lý do. Trên Development (ADR-0162) không có hạn.

## Đ7 — Thứ tự

1. Sửa Hiến pháp ở kho luật gốc, rồi nâng bản ghim của dự án lên bản đó. **Tới lúc này ADR này mới trình duyệt được**, kèm điều 5.27.
2. Dựng xong ADR-0162, rồi xây và thử tính năng này trên Development trước.
3. Chỉ lên bản chính thức sau khi đã diễn tập khôi phục đạt (HC-5.19), vì đó là đường lui duy nhất. Nếu chủ muốn lên trước diễn tập thì ghi lý do vào `docs/quyen-hoan.json`.

## Hệ quả chủ cần biết

- **Xoá là mất.** Đường lui duy nhất là điểm khôi phục của D1, đưa **cả** cơ sở dữ liệu về lúc đó nên mất mọi dữ liệu mới sau đó, và chỉ còn trong thời hạn Time Travel (chưa kiểm số ngày với gói hiện dùng). Tệp trong kho thì theo hiểu biết của người soạn không có điểm khôi phục (chưa kiểm với tài liệu Cloudflare).
- **Xoá chạm tiền thì số đã báo không còn khớp**, kể cả kỳ đã khoá sổ. **Chưa kiểm:** nghĩa vụ lưu giữ sổ kế toán và chứng từ theo pháp luật; cần kế toán hoặc luật sư xác nhận trước khi xoá trên dữ liệu thật (điều 5.24 đang ghi đây là phần pháp luật bắt giữ).
- **Xoá nhật ký thì mất dấu vết việc cũ**, chỉ sổ xoá còn lại.
- Một phiên Toàn quyền bị lộ có thể gây thiệt hại lớn; Đ1, Đ5 và Đ6 giảm rủi ro này chứ không xoá hết.
- Tin, thông báo và đường dẫn đã gửi khách có thể trỏ tới bản ghi không còn. Mã đơn có thể đánh số trùng với đơn đã xoá cùng ngày (như đã ghi ở ADR-0158).

## Việc kèm khi thi công

Migration thay trigger ở Đ5; điều 5.27 ở Phần I; `CLAUDE.md` §7; tờ khai `docs/kernel-18.md` dòng 12 và 13 (cột lệch có ADR); `docs/SO-HANG-RAO.md`; `docs/data-dictionary.json`; bản đồ quyền và bài ghim quyền; rà các bài `src/migrations-*.test.ts` đang nói về chặn xoá.

## Tiêu chí nghiệm thu

1. Mọi quyền trừ Toàn quyền gọi route xoá đều bị từ chối.
2. `DELETE` trên một bảng có chặn, không có vé xoá, bị từ chối ở cơ sở dữ liệu (quan sát chặn thật, ghi sổ hàng rào).
3. Xoá một đơn có sổ tiền và chuyến: `audit-invariants` vẫn đạt, sổ xoá có đúng một dòng với số đếm khớp.
4. Sổ xoá không sửa, không xoá được kể cả khi có vé xoá. Sổ không chứa tên, số điện thoại hay nội dung bản ghi.
5. Một câu trong lô hỏng thì không dòng nào bị xoá.
6. Sau ngày hết hạn, hoặc khi đang tắt, route từ chối trên bản chính thức.
