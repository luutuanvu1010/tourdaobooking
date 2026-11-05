# ADR-0170 — Đối tác xem và gửi vé điện tử của đơn mình lập

- **Trạng thái:** **accepted** 2026-11-05 — chủ dự án trong chat, nguyên văn: *«Duyệt, đối tác tự mở»*, trả lời câu hỏi duyệt ADR-0170 và chọn ai mở vé đơn Trả sau (chọn (a) ở Đ2 mục 6). Trước khi duyệt, chủ đã được báo: đối tác nộp tiền về công ty rồi mới mở được vé, Kế toán thêm việc xác nhận, vé đã mở không lấy lại được, phải nới trần gói trang Đơn hàng, thi công sau nhánh Trả sau. Người kiểm độc lập đọc hai vòng; bản cuối (sửa sau vòng hai) chưa được đọc lại. Chưa có mã.
- **Loại:** việc lớn (quyền, tiền ở mức đọc, luồng huỷ). **Cửa:** hai chiều về mã; vé đối tác đã mở thì không lấy lại được.
- **Số:** 0170 kiểm còn trống ngày 5/11 trên `main` và mọi nhánh trong máy (0168 ở nhánh Trả sau, 0169 ở nhánh Quản lý bán hàng).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt:** 3 (Đ1, Đ2, Đ3), đúng trần `CLAUDE.md` §9. Trang ghép: `docs/superpowers/specs/2026-11-05-trang-ghep-doi-tac-xem-ve.md`.
- **Xây trên lỗ đang hở:** `BL-DC-HUY-GHI-TAY`, `BL-DC-CHUYEN-CONG-TY-GIU` (`docs/BACKLOG.md`, chủ quyết «Để nguyên, ghi sổ việc» 3/11). Hai đường đó chỉ Kế toán đi được, đối tác không tự gây ra, nhưng khi đối tác tự mở vé thì sai sót của hai đường đó thành mất vé ngay.
- **Quan hệ với ADR cũ:** **nới** ADR-0153 Đ3 (cột «Khác» của `ve.cap.send`, thêm Đối tác phạm vi đơn của mình). **Mở rộng** ADR-0159 Đ2 mục 2 từ khoản khai đặt cọc sang mọi khoản đối tác tự ghi, bỏ câu «các khoản thu khác giữ quy tắc cũ» cho riêng các khoản này. **Mở rộng** ADR-0168 Đ3 mục 3 (chặn huỷ) sang đơn trả trước, chỉ với người giữ quyền Đối tác. **Giữ** ADR-0153 Đ1 mục 6 (vé đã lộ không về kho), ADR-0136 Đ13.5, ADR-0089 đ8.

## Bối cảnh

Đối tác lập đơn nhưng không thấy khối «Vé điện tử»: sáu route vé mở cho cổng văn phòng, cột Đối tác của `ve.cap.send` là `none`, và màn đơn ẩn khối khi nhận 403 (`web/ve-don.ts`). Đặc tả «Đặt vé của đối tác» cũng không nói gì về việc này. Lời chủ 4/11 (`docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md`): *«Hình thức thanh toán mặc định dành cho tất cả TA là trả trước, tức công ty nhận đủ tiền rồi mới trả vé.»*

**Không thể chỉ mở quyền.** Đã chạy thử 5/11 trên mã `f379a4de`, khung thử cục bộ qua API thật (SQLite tạm, không phải production; tệp thử đã xoá), tài khoản chỉ giữ quyền Đối tác, đơn tự lập, 600.000 ₫:

| Đối tác tự ghi `POST /api/orders/:id/payments`, tiền mặt, với | Mã trả về | Khoản thu | `thuDu` sau khi ghi |
|---|---|---|---|
| `nguoiThu: "toi"` | 201 | vai `BOOKER` | **true** |
| `nguoiThu: "cong_ty"` | 201 | vai `COMPANY`, tiền mặt: dòng giữ hộ trên người khai, không có dấu `DECLARED` | **true** |
| `nguoiThu: "ben_dat"` | 201 | vai `BOOKER` | **true** |

Người kiểm độc lập chạy lại trên `bf66c33d`, thêm: chuyển khoản «Công ty thu» (dấu `DECLARED`), hình thức khác «Công ty thu», chuyển khoản `toi`, và Kế toán sửa khoản `toi` mà người thu vẫn là đối tác (khoản mới mang tên Kế toán, dòng giữ hộ vẫn trên đối tác): đều `thuDu` true. Văn phòng ghi `ben_dat` trên đơn đối tác (lời khai, chưa ai xác nhận) cũng `thuDu` true.

Cũng khung thử đó: đối tác gọi `POST /api/orders/:id/status` `cancelled` có lý do trên đơn đã xác nhận của mình trả 200, đơn thành huỷ. `POST …/rut-xac-nhan` trên đơn đã xác nhận trả 409, không phải đường này. Nên nếu chỉ thêm quyền, đối tác tự ghi đã thu, tự mở vé, rồi tự huỷ đơn; công ty mất vé mà không có đồng nào, và mọi đối tác thành trả sau không hạn mức, vượt rào ADR-0168.

Hiện nay nhân viên cũng thấy các đơn này là «thu đủ» và mở được vé: Đ2 chặn luôn đường đó.

## Đ1 — Đối tác xem và gửi vé của đơn mình lập

1. `ve.cap.send`, cột `PARTNER`: `none` → `own`. Phạm vi là `orders.staff_id`, tức đơn do chính tài khoản lập. Đơn văn phòng lập hộ thì không, kể cả khi đối tác là bên đặt.
2. `ve.kho.manage` không đổi: đối tác không vào kho, không nhập lô, không thấy thống kê.
3. Sáu route đổi cổng từ `office` sang `orders`: `GET /api/ve/don/:orderId`, `GET /api/ve/anh/:allocationId`, `POST /api/ve/giao`, `POST /api/ve/cap`, `POST /api/ve/duong-dan`, `POST /api/ve/duong-dan/:id/thu-hoi`. Năm route sau vẫn hỏi `can(ve.cap.send)` nên `FIELD`, `INTERN` vẫn 403.
4. **`GET /api/ve/don/:orderId` phải thêm câu chặn:** cổng `orders` cho `FIELD`, `INTERN` đi qua, và route này chỉ hỏi `order.view`. Thêm điều kiện `isOffice(staff) || can(staff, "ve.cap.send", …)` để hai vai đó không thấy thêm gì. Có bài ghim.
5. Giao diện: khối vé dùng lại, không thêm trang. Với người giữ quyền Đối tác, ẩn câu «Nhập thêm vé vào kho rồi bấm Cấp vé» vì họ không có kho, thay bằng «Còn thiếu vé. Bấm Cấp vé; nếu vẫn thiếu, báo văn phòng.» *(Tự quyết, bề mặt, chủ sửa được.)*
6. **Cấp vé đi kèm** *(tự quyết của người soạn, chủ đọc)*: nút này chỉ chạy lại đúng hàm tự giữ chỗ sau xác nhận, chạy lại không giữ thừa, chỉ cho đơn đã xác nhận. Tách riêng cần thêm một ô quyền mà không giảm rủi ro nào.

## Đ2 — Đối tác tự mở vé khi nào

1. **Đơn trả trước do tài khoản giữ quyền Đối tác lập:** số tính để mở vé chỉ gồm tiền đã về công ty. Không tính:
   - khoản người thu là chính người lập đơn (`toi`, `ben_dat`) mà số dư với công ty chưa về 0, tính như `soKhaiChuaNop` (ADR-0159);
   - **mọi** khoản nằm trong `khoanChoXacNhan` đang có: «Công ty thu» không phải chuyển khoản (dòng giữ hộ chưa tất toán), «Công ty thu» chuyển khoản, và lời khai khách trả cho bên đặt hoặc quầy nhà cung cấp (dấu `DECLARED` chưa có `CONFIRMED`).
2. **Tiêu chí là tình trạng của tiền, không phải ai ghi khoản.** Không dùng `bil_payment_receipt.created_by`, vì Kế toán sửa khoản thì người ghi đổi thành Kế toán trong khi dòng giữ hộ vẫn nằm trên đối tác (`ghiThayLanThu`). Áp cho **mọi người xem**: Quản trị, Toàn quyền mở đơn đó cũng thấy chưa mở được. Đơn do nhân viên văn phòng lập giữ quy tắc cũ, nên luồng Bán hàng không đổi. Kế toán tự ghi «Công ty thu» không sinh chờ xác nhận, nên tính ngay: đó chính là xác nhận. Tiền nhân viên công ty cầm hộ (người thu khác người lập đơn) vẫn tính là đã về, **có chủ ý**: tin nhân viên, và đối tác không tự tạo được ca này.
3. «Người lập giữ quyền Đối tác» đọc lúc xét, qua view công bố của `staff`, gồm cả tài khoản lai. Đọc không được thì coi là chưa mở.
4. Đặt vào **hàm duy nhất quyết định vé có mở được** (`tienDonVe` của `billing`, và `veMoDuoc` của ADR-0168 khi nhánh đó nhập), không đổi nghĩa của `thuDu` và không đổi số «đã thu» hiển thị ở nơi khác. Dùng chung một hàm với «số đã về công ty» của ADR-0168 Đ2 mục 2, không viết hai bản.
5. `tienDonVe` trả thêm phần chờ xác nhận để nói đúng câu. Câu cho đối tác, đề xuất: «Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.» Câu cho nhân viên giữ như hiện nay («Đang chờ đối tác nộp tiền về công ty…»). Chữ mới phải vào `docs/BANG-THAM-CHIEU.md`.
6. **Đơn trả sau (`CREDIT`), chủ đã chọn (a) 2026-11-05:** ADR-0168 chỉ nói vé mở được, chưa nói ai mở.
   - **(a) Đã chọn:** đối tác tự mở trong hạn mức, cùng cổng ADR-0168. Hạn mức đã là trần rủi ro chủ tự đặt, và mục đích của Trả sau là đối tác nhận vé trước.
   - (b) Không chọn: chỉ văn phòng mở; đối tác thấy số vé, chờ văn phòng gửi.

## Đ3 — Đối tác không tự huỷ đơn đã có vé mở

1. Ở **mọi đường huỷ**: `POST /api/orders/:id/status` nhánh `cancelled` và `POST /api/orders/:id/handler-cancel`. Người bấm giữ quyền Đối tác, đơn có ít nhất một vé `revealed_at` khác null, thì 409 với câu «Đơn đã mở vé nên bạn không tự huỷ được. Liên hệ văn phòng.»
2. Văn phòng huỷ như cũ; vé đã lộ vẫn vô hiệu và cảnh báo theo ADR-0153. Đơn chưa mở vé đối tác huỷ như cũ.
3. `orders` và `dispatch` không đọc bảng `vdt_`: gốc lắp ráp tiêm hàm hỏi «đơn có vé đã mở không», theo khuôn `ctx.traVeKhiHuy`. Nhánh Trả sau đã có `veDaMoCuaDon`; dùng lại. Hàm trả `null` (không đọc được) thì **chặn**.
4. Giao diện ẩn nút Huỷ cần một cờ «đơn có vé đã mở» trong dữ liệu đơn; cờ này là phần thêm vào hợp đồng giữa `orders` và gốc lắp ráp. Máy chủ vẫn là nơi chặn.

## Thứ tự thi công

Nhập nhánh ADR-0168 (`claude/partner-type-ta-oracle-18-efd687`) trước, vì nhánh đó viết lại đúng cổng vé ở `src/modules/ve-dien-tu/index.ts` và `web/ve-don.ts`. ADR-0169 thêm cột thứ 11 cho `row()`, mặc định `none`: sửa dòng `ve.cap.send` sẽ chạm cùng tệp nhưng không đổi nghĩa. Không có migration. Đ1 không được phát hành trước Đ2 và Đ3; cả ba lên cùng một bản. **Cần nới trần gói trang Đơn hàng** (`src/goi-trang-nhe.test.ts`, hiện dư 14 byte): `web/ve-don.ts` nằm trong gói đó và Đ1, Đ3 đều thêm mã. Duyệt ADR này là duyệt nới, con số đo thật lúc thi công và báo chủ; giữ phần tăng tối thiểu.

## Tiêu chí nghiệm thu

1. Tài khoản chỉ Đối tác, đơn tự lập, công ty đã nhận đủ (Kế toán ghi): thấy khối vé; mở, tải, gửi, tạo và thu hồi đường dẫn được; có nhật ký.
2. Đơn của đối tác khác, đơn văn phòng lập: 404/403 ở cả sáu route; không đọc kho.
3. Đối tác tự ghi đủ tiền theo cả ba cách trong bảng trên, **cộng** «Công ty thu» chuyển khoản, **cộng** ca Kế toán sửa khoản của đối tác mà tiền vẫn ở tay đối tác, **cộng** lời khai khách trả cho bên đặt do văn phòng ghi: `GET /api/ve/don/:orderId` trả chưa mở được, `/anh`, `/giao`, `/duong-dan` đều 403, **kể cả nhân viên gọi**. Kế toán xác nhận hoặc đối tác nộp xong: mở.
4. Bán hàng lập đơn, tự ghi «Tôi thu»: vẫn mở như cũ.
5. Đối tác đã mở vé gọi huỷ ở cả hai đường: 409, đơn giữ nguyên, sổ không đổi. Chưa mở vé: huỷ được. Quản trị huỷ đơn đã mở vé: được.
6. `FIELD`, `INTERN` có đơn của mình hoặc đang phụ trách: `GET /api/ve/don/:orderId` vẫn 403, như trước.
7. Đối tác không gọi được `/api/ve/kho`, `/api/ve/lo*`, `/api/ve/cai-dat`.
8. Bài ghim hàng `ve.cap.send`, bài `PARTNER` 403 ở `xem-giao-ve.test.ts`, `route-access` đổi có chủ ý. Đ2 và Đ3 có dòng trong `docs/SO-HANG-RAO.md`, đã quan sát chặn thật.
9. Thử iPhone thật bằng tài khoản đối tác: gửi nhiều ảnh sang Zalo. Đến nay chưa thử bằng bất kỳ tài khoản nào.

## Hệ quả

- **Đối tác bị chậm hơn:** khách trả tiền mặt cho đối tác thì đối tác phải nộp về công ty rồi mới mở được vé. Đúng lời chủ 4/11, nhưng đối tác sẽ thấy khác. Muốn nhận vé trước thì đi Trả sau theo hạn mức.
- **Việc của Kế toán tăng:** mỗi khoản đối tác khai cần xác nhận thì vé mới mở. Khách tới cổng mà Kế toán chưa xác nhận sẽ kẹt. Chưa đo số lượng.
- **Rủi ro còn lại:** đối tác giữ được ảnh vé vĩnh viễn sau khi mở. Công ty không thu hồi được, chỉ biết qua nhật ký và đường dẫn mở bao nhiêu lần.
- **Khoá chặt có chủ ý:** `soKhaiChuaNop` tính số dư mọi loại dòng của đơn, nên nếu đơn có khoản phân định trách nhiệm đối tác phải trả thì vé chờ cả khoản đó (đọc mã, chưa chạy thử). Hoa hồng cấn trừ không gây khoá. Người kiểm không tìm ra ca nào khoá vĩnh viễn sau khi đã nộp đủ.
- **Bán hàng phụ trách (ADR-0142) không mở được vé đơn của đối tác:** ô `ve.cap.send` không nằm trong danh sách quyền được giao. Với đơn đối tác, chỉ người lập, Quản trị, Toàn quyền mở được. Có từ trước, ADR này không đổi.
- **Cách đã bàn và bỏ:** chặn theo người xem (chỉ đối tác bị chặn): nhân viên vẫn mở được đơn đối tác tự ghi. Chặn theo người ghi khoản: Kế toán sửa khoản là mất dấu. Không chặn huỷ: đối tác mở vé rồi huỷ thì công ty chịu.
- **Chưa kiểm:** đường dẫn khách có tự thu hồi khi đơn huỷ không (ADR-0168 cũng ghi chưa kiểm); dữ liệu production hiện có khoản đối tác tự ghi nào không (đã xoá dữ liệu thử 2/11, nên nhiều khả năng ít).
