# Đặc tả: mục Hướng dẫn riêng, máy điền, máy canh (3/11/2026)

**Trạng thái:** chờ chủ duyệt. Hồ sơ có ngày; có gì mới thì viết bản mới. Tiếp nối `docs/superpowers/specs/2026-09-30-huong-dan-theo-vai.md`, xử lý `docs/BACKLOG.md` mục 32, đụng một phần mục 41.

## Chủ đã quyết (3/11)
- Tách «Hướng dẫn cho bạn» thành mục riêng tên «Hướng dẫn» của Hỗ trợ; không để chung với Nhật ký thay đổi.
- Hướng dẫn tự cập nhật theo cách «Máy điền, máy canh». Bố cục do Claude Design vẽ theo `PROMPT-CLAUDE-DESIGN.md` cùng thư mục.

## Vì sao
Hướng dẫn hiện không nhắc tới Kho vé, Cài đặt vé điện tử, Giao diện. Nhóm Bán hàng và Quản trị cộng Phần chung đã chạm trần 30 phút đọc (bài A4), nên không thêm bài được. Bài A2 chỉ canh tên nút, không biết bài đã lạc hậu về cách làm.

## Thiết kế
**Bài theo việc.** Thêm một loại nội dung mới bên cạnh tám nhóm theo vai, gồm:
- Phần viết tay: các bước, điều dễ sai, khi gặp sự cố, chưa làm được, không thể làm (cùng tập con markdown của `phanTich`).
- Khai báo cho máy: màn nào (khoá trong `TRANG`), ô quyền nào (`MATRIX`), hằng số giới hạn nào (nhập thẳng từ mã, ví dụ `TRAN_LO_MAC_DINH`), và các tệp mã bài dựa vào (neo).

**Máy điền.** Lúc dựng trang, máy tính từ khai báo: đường tới màn (nhãn ở `THANH_BEN`), các vai được dùng (`MATRIX` + `PERMISSION_LABEL`), các con số. Không ai gõ tay những thứ này vào chữ. Số 7 ngày của đường dẫn khách hiện viết thẳng trong `hanDuongDan` (module `ve-dien-tu`): tạo hằng mới ở `src/shared/` rồi cho `hanDuongDan` dùng, vì `src/shared/` không được nhập module. Máy điền chỉ in nhãn và giá trị, không in tên hằng hay mã quyền.

**Máy canh** (đều nằm trong `npm test`, nên `npm run day-len` chặn):
1. Mỗi bài có dấu vân của các tệp neo (bỏ chú thích) và của chính chữ bài, lưu ở một tệp JSON. Tệp neo đổi mà chưa xem lại bài ⇒ đỏ, câu báo nêu đúng bài và tệp. Xem lại xong chạy một lệnh để ghi dấu vân mới, kèm ngày và số bản; đó là nguồn của dòng «Cập nhật theo bản…».
2. Mọi mục ở `THANH_BEN` phải có một bài khai đúng màn đó, hoặc nhãn của nó xuất hiện nguyên văn trong chữ Hướng dẫn.
3. Tệp bài đặt tên `huong-dan-*` để không tự chứng minh chính nó ở bài A2; sửa A2 và A3 để duyệt cả danh sách bài mới, vì hôm nay chúng chỉ duyệt `HUONG_DAN`. Thêm bộ lọc tên kỹ thuật (`viPhamKyThuat`) như kho trợ lý.

Bài A4 giữ nguyên cho tám nhóm; bài theo việc không tính vào trần vì người đọc chỉ mở đúng bài cần.

**Ai thấy bài.** Bài khai ô quyền và hỏi bảng quyền, không hỏi tên vai. Ô có phạm vi (ví dụ Bán hàng chỉ giao vé của đơn mình phụ trách) vẫn tính là thấy bài, vì hỏi `can()` không kèm đơn cụ thể sẽ ra «không». Quản trị xem thêm được bài của vai khác như hiện nay.

**Nơi đặt.** Trang mới `/huong-dan` có gói mã riêng, dùng chung thanh thẻ với `/feedback`, vì đưa toàn bộ chữ vào gói của `/feedback` sẽ làm nặng màn Hỗ trợ. `/help` giữ địa chỉ cũ và chỉ còn Nhật ký thay đổi cùng chấm đỏ, nên chỗ cho phép nhập nhật ký ở `goi-trang-nhe.test.ts` không đổi. Trang mới khai đủ `PAGES`, `build:web`, `TRANG`, rồi sinh lại `so-do-trang.ts`.

**Chân menu (tạm, bản vẽ có thể đổi).** Mục đang tên «Hướng dẫn» trỏ `/help` đổi nhãn thành «Nhật ký thay đổi», giữ chấm đỏ; vào Hướng dẫn qua «Hỗ trợ». Bài `tro-ly-cau-truc.test.ts` đang ghim mục này sẽ sửa theo.

**Trần gói Đơn hàng.** Thêm một trang vào `TRANG` làm gói này lớn thêm khoảng 200 byte, mà trần `TRAN_ORDERS` chỉ còn dư khoảng 100 byte (chưa đo lần này). Nếu đỏ thì nới vừa đủ và ghi lý do cạnh trần; chủ duyệt đặc tả này là duyệt luôn lần nới đó.

**Trợ lý Mai.** Kho tri thức (`tro-ly.ts`) đọc thêm bài theo việc, kể cả phần máy điền. Mai không ẩn bài theo quyền mà chỉ ưu tiên theo vai như các đoạn hiện có; danh sách vai suy từ `MATRIX`.

## Làm theo thứ tự
1. **Phần lõi, không cần bản vẽ:** loại nội dung bài, máy điền, ba lớp máy canh, ba bài Kho vé, Cài đặt vé điện tử, Giao diện; đưa vào Mai. Chữ bài Kho vé lấy từ trang [Hướng dẫn Kho vé điện tử](https://claude.ai/artifact/PHRBHmAYD4FvqKmB9oQ9DP).
2. **Phần màn hình, sau khi chủ duyệt bản vẽ:** `/huong-dan`, thanh thẻ chung, tách `/help`, chân menu, kịch bản Chrome.
3. **Chuyển các mục cũ:** mục cũ trong tám nhóm chưa có neo nên chỉ được bài A2 canh tên nút, không hiện dòng «Cập nhật theo bản». Làm sau, từng nhóm; khi chưa xong không được nói toàn bộ Hướng dẫn đã tự cập nhật.

## Tiêu chí nghiệm thu
- Đổi `TRAN_LO_MAC_DINH` thì con số trong bài đổi theo mà không sửa chữ bài.
- Sửa cố ý một tệp neo ⇒ bài kiểm đỏ nêu tên bài; chạy lệnh xem lại ⇒ xanh; hoàn nguyên. Tương tự với một mục menu không có bài. Ghi ngày quan sát vào `docs/SO-HANG-RAO.md`.
- Tài khoản chỉ Tài xế không thấy bài Kho vé; Bán hàng thấy. Với câu hỏi về nhập lô vé, bộ chọn đoạn của Mai (`chonDoan`) đưa đoạn của bài Kho vé lên đầu.
- Ở `/help` không còn chữ hướng dẫn; ở `/huong-dan` không còn nhật ký; chấm đỏ vẫn hoạt động. Trang đọc được khi mất mạng sau lần mở đầu: `public/huong-dan.html` khai `data-ve-truoc-shell` như `/help`, thêm vào bài `thanh-dinh-day.test.ts`, và kiểm thật bằng kịch bản Chrome.

## Giới hạn phải nói thẳng
Máy canh chỉ bắt được «mã đổi mà chưa xem lại bài». Người hay AI vẫn có thể chạy lệnh xem lại mà không đọc, và đổi ở tệp ngoài neo thì máy không biết. Phần này dựa vào kỷ luật và người kiểm độc lập. Dấu vân theo cả tệp nên sửa nhỏ cũng đòi xem lại; chấp nhận vì mỗi bài chỉ neo vài tệp, và nếu quá phiền thì thu hẹp neo sau.

## Điều chưa chắc, để người thi công tự chốt
Tên lệnh xem lại; chỗ đặt tệp bài (mỗi bài một tệp ở `src/shared/`); cách trình bày chính thức theo bản vẽ. Kịch bản Chrome mới phải có dòng ở bảng của `web/CLAUDE.md`: đó là tệp luật nên chỉ đề xuất, chủ duyệt.
