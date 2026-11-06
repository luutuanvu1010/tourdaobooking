# Biên nhận cho đơn của đối tác (mẫu HD-02-DT) — đặc tả

- Ngày: 2026-11-06. Trạng thái: **chờ chủ duyệt**.
- Ảnh duyệt (dựng bằng bộ vẽ thật `web/confirmation-image.ts`, dữ liệu mẫu): `docs/evidence/2026-11-06-bien-nhan-doi-tac/so-sanh-mau-de-xuat.png` (trái: hiện tại; phải: mẫu mới).
- Cỡ việc: **việc lớn** (CLAUDE.md §3), vì đổi hợp đồng `ReceiptDto` (danh sách trắng ADR-0026 đ11) và đổi cách in tiền gửi khách. Thi công xong phải có người kiểm độc lập chỉ đọc.

## 1. Vì sao

Đối tác (đại lý, khách sạn, nơi gửi khách) gửi ảnh biên nhận cho khách của họ. Mẫu hiện tại là giấy tờ của công ty: tên pháp lý, mã số thuế, địa chỉ công ty, Tạm tính/Tổng cộng/Còn lại. Chủ muốn đơn đối tác có mẫu riêng, gọn như một phiếu dịch vụ: thương hiệu "Tour Đảo Nha Trang" và câu khẩu hiệu, thông tin khách, dịch vụ, giá công bố, số phải thu, ghi chú.

## 2. Quyết định của chủ (2026-11-06, hai lượt hỏi trong phiên)

| # | Câu | Chủ chọn |
|---|---|---|
| Q1 | «Phải thu» là số nào | **Khách còn phải trả**: tổng sau giảm giá, trừ phần khách đã trả trước. Đúng số `conLai` của billing hôm nay. Không in hoa hồng, không in giá đại lý. |
| Q2 | Áp cho đơn nào | **Đơn do tài khoản Đối tác lập, và cả đơn văn phòng lập «Qua đối tác»** (bên đặt là đối tác). Ai mở cũng ra cùng một mẫu. |
| Q3 | «Địa chỉ» lấy từ đâu | **Điểm đón của dịch vụ** (không thêm ô nhập, không migration). |
| Q4 | Phần đầu | **Khẩu hiệu thay phần pháp lý**: bỏ mã số thuế, địa chỉ công ty; giữ Hotline. |
| Q5 | Bố cục ảnh | Duyệt theo ảnh, sửa thêm: **bỏ logo**; đặt tên mẫu, in **mờ, nhỏ**: «HD-02-DT». |
| Q6 | Đơn «Qua đối tác» bị văn phòng sửa đơn giá | **In giá thật, đổi tên cột** thành «Đơn giá» cho dịch vụ có giá khác giá danh mục. |
| Q7 | Đơn đối tác bị huỷ | **Giữ nội dung thông báo huỷ như hôm nay, chỉ đổi phần đầu** sang khẩu hiệu. |

«Giá công bố» theo lời chủ ở ADR-0027: giá danh mục (giá bán lẻ).

## 3. Mẫu HD-02-DT, từ trên xuống

1. **Phần đầu** (không logo): dòng nhỏ mờ góc phải «Mẫu HD-02-DT»; «Tour Đảo Nha Trang» (chữ lớn); «Trải nghiệm biển đảo tuyệt vời tại Khánh Hòa»; «Hotline: <hotline công ty chủ>». Tên thương hiệu và khẩu hiệu là hằng số ở MỘT nơi (`src/shared/order-confirmation.ts`); Hotline vẫn đọc hồ sơ công ty chủ.
2. **Tiêu đề**: «XÁC NHẬN ĐƠN DỊCH VỤ» + huy hiệu trạng thái; Mã đơn, Ngày lập; dòng người phụ trách giữ đúng luật hiện nay (ba trạng thái, đối tác không thấy).
3. **Thông tin khách hàng**: Họ tên khách, Số điện thoại, Địa chỉ, Ghi chú (ghi chú khách của đơn). Dòng trống thì bỏ.
4. **Mỗi dịch vụ**: tên; Số lượng («2 người lớn, 1 trẻ em»); Khởi hành; Giờ đón (khi đã có); Khách có mặt (khi có, như hôm nay); bảng Loại khách | SL | **Giá công bố** | Thành tiền; «Cộng dịch vụ» khi có từ hai dòng tiền. Dịch vụ tính theo nhóm hoặc nhập tay: cột đầu giữ chữ «Mô tả» (dòng tiền không phải loại khách).
5. **Tổng**: «Tổng giá công bố» → «Giảm giá» (chỉ khi > 0) → «Giảm sau khi giao» (chỉ khi có, như hôm nay) → «Khách đã trả trước» (chỉ khi > 0) → **«Phải thu»** (nổi bật). Đơn nhiều người bán: giữ các dòng «Phần …» như hôm nay.
6. **Chân trang**: như hôm nay (điều khoản huỷ kèm đường dẫn, câu giảm sau khi giao, câu vai từng phần, lời cảm ơn, hotline).

Đơn huỷ: phần đầu như mục 1, phần còn lại đúng mẫu «THÔNG BÁO HUỶ ĐƠN DỊCH VỤ» hiện nay (Q7).

## 4. Luật dữ liệu

- **Đơn nào dùng HD-02-DT** — máy chủ quyết, trình duyệt không tự chọn theo người xem: bên đặt đang là đối tác (cờ `bookerLaDoiTac` sẵn có) **hoặc** người lập là tài khoản Đối tác thuần (giữ quyền Đối tác, mọi quyền đều là quyền bên ngoài — cùng điều kiện với công tắc ẩn thông tin khách `apCongTacAnKhach`). Tính lúc dựng biên nhận, không chụp vào đơn.
- `ReceiptDto` thêm (chép từng trường, không trải đối tượng): `mau` cho biết mẫu; mỗi dịch vụ một cờ «có dòng tiền khác giá danh mục» (dòng nhập tay, không có giá danh mục, cũng tính là khác). **Không** thêm giá danh mục, hoa hồng, giá đại lý vào DTO.
- **Địa chỉ**: các dịch vụ có điểm đón mà cùng một nơi → một dòng «Địa chỉ» ở khối khách. Khác nơi → khối khách không có dòng này, mỗi dịch vụ có dòng «Địa chỉ đón». Không dịch vụ nào có điểm đón → bỏ dòng.
- **Cột giá (Q6)**: dịch vụ có cờ khác giá → tiêu đề cột «Đơn giá», số in là đơn giá thật. Khi có ít nhất một dịch vụ như vậy, dòng tổng đầu ghi «Tạm tính» thay cho «Tổng giá công bố».
- Ẩn thông tin khách (ADR-0154) bật: in đúng tên, SĐT máy chủ đã lưu (của đối tác) — quyết định cũ, không đổi.
- Tiền: không tính thêm số nào. Mọi số lấy từ `ReceiptDto` hiện có (`subtotal`, `discount`, `giamTru`, `daTra`, `conLai`, `phan`).

## 5. Tiêu chí nghiệm thu (hành vi kiểm được)

1. Đơn tài khoản Đối tác thuần lập, đơn văn phòng lập có bên đặt là đối tác → biên nhận có `mau` HD-02-DT; đơn khách lẻ văn phòng lập → mẫu cũ, ảnh **giống từng byte** trước khi sửa.
2. Văn phòng và đối tác mở cùng một đơn đối tác → cùng mẫu.
3. Ảnh HD-02-DT không có logo, không có mã số thuế, địa chỉ công ty; có «Mẫu HD-02-DT», tên thương hiệu, khẩu hiệu, Hotline.
4. «Phải thu» = `conLai`; có trả trước thì có dòng «Khách đã trả trước»; không trả trước, không giảm giá thì không có hai dòng đó.
5. Đơn «Qua đối tác» có đơn giá bị sửa → cột của dịch vụ đó ghi «Đơn giá», dòng tổng đầu ghi «Tạm tính»; Tổng − Giảm giá − Giảm sau giao − Đã trả = Phải thu.
6. Địa chỉ: một nơi → khối khách; hai nơi → từng dịch vụ.
7. Đơn đối tác huỷ → phần đầu khẩu hiệu, thân giống thông báo huỷ cũ.
8. Bài kiểm danh sách trắng (`bien-nhan.test.ts`) vẫn xanh và có ca mới: DTO không chứa giá danh mục, hoa hồng, giá đại lý.

## 6. Ngoài phạm vi

Mẫu nội bộ (không đổi, không đặt mã); QR thanh toán; thêm ô «Địa chỉ khách» lúc lập đơn; chụp «đơn của đối tác» vào dữ liệu đơn.

## 7. Điều người soạn tự quyết (chủ xem khi duyệt)

- Giữ «Khởi hành», «Giờ đón», «Khách có mặt» dù chủ không liệt kê, vì thiếu ngày đi, nơi đến thì phiếu vô nghĩa (tour khách tự tới bến chỉ có dòng «Khách có mặt»). «Địa chỉ» vẫn chỉ lấy điểm đón, không lấy nơi khách có mặt.
- Không in email khách (chủ không liệt kê).
- Sau khi giao: dòng «Khách đã trả trước» đổi thành «Đã thu» như luật ADR-0089 đ3 hiện nay.
- Chữ in mã mẫu: «Mẫu HD-02-DT», góc phải trên, cỡ 11, màu chữ phụ.
- Dòng 0 ₫ (Giảm giá, Đã trả trước) không in.
- Đơn đổi bên đặt hoặc đối tác thôi vai sau khi lập: biên nhận đi theo hiện trạng lúc mở (không chụp lại).
- Tài khoản lai (vừa Bán hàng vừa Đối tác) lập đơn cho khách lẻ → mẫu cũ, vì đó là việc bán hàng; đơn họ lập cho chính hồ sơ đối tác của mình đã có bên đặt là đối tác nên vẫn ra HD-02-DT.
- Không cần ADR mới: chủ đã quyết từng điểm ở mục 2; danh sách trắng chỉ thêm cờ, không thêm số tiền hay dữ liệu nhạy cảm.

## 8. Để người thi công quyết

Tên trường trong DTO và cách đọc quyền người lập phía máy chủ (qua view công bố của module nhân viên, đúng luật ranh giới); cách bộ vẽ nhận "không logo" và "mã mẫu" (thêm trường vào khối phần đầu); cập nhật bài hướng dẫn đối tác «Gửi biên nhận cho khách», nhật ký thay đổi, mục «Giá công bố» trong `docs/BANG-THAM-CHIEU.md`; kịch bản Chrome `v1-xac-nhan-png.mjs` đang đỏ sẵn từ 27/10 — dựng dữ liệu lại hoặc viết kịch bản ảnh riêng cho mẫu này.
