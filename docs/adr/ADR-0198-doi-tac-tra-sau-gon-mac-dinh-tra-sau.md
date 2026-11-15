# ADR-0198 — Đối tác thấy Trả sau ở dạng gọn, không số hạn mức; đơn mới của đối tác chọn sẵn «Trả sau»

- **Trạng thái:** **accepted** 2026-11-12 — chủ dự án, nguyên văn: *«Duyệt, chọn cách 1»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt hai lần đầu và chọn cách 1 cho phần nộp tiền chứ?», sau khi nhận trang trình `docs/superpowers/specs/2026-11-12-trinh-chu-thanh-toan-doi-tac.md` bản cuối ngày 12/11, có câu duyệt mẫu «Duyệt lần 1 và lần 2, chữ theo khuyến nghị»). Văn bản này là «lần duyệt 1». Chủ không sửa chữ nào, nên chữ ở bảng «Chữ chờ chủ chọn» dùng **khuyến nghị** (trang trình: «Bạn không sửa thì tôi dùng khuyến nghị»); chủ nói khác thì sửa bảng. Lịch sử soạn: **proposed** 2026-11-12. Chủ dự án nêu yêu cầu trong chat (phiên `claude/partner-payment-system-e3f939`), nguyên văn: *«Với đối tác được áp dụng công nợ (cho phép trả sau) thì không hiện hạn mức trả sau. Chỉ hiện rất đơn giản (mục đích là cho họ khởi tạo đơn, nhận vé rồi thanh toán (gần nghĩa với việc dời thời điểm thanh toán thêm một vài giờ, hơn là cho họ nợ) ; Đồng thời phương thức thanh toán mặc đinh của đối tác được áp dụng trả sau : là Trả sau, thay vì đang mặc định là Trả ngay»*. Ngay sau đó chủ bấm «Đồng ý cả ba» cho khuyến nghị: *«ẩn con số hạn mức ở mọi nơi đối tác thấy, chỉ hiện "Bạn được trả sau" kèm giờ hạn trả của từng đơn; đơn mới của đối tác được trả sau sẽ chọn sẵn "Trả sau"; khi bị khoá vì có đơn quá hạn thì nói lý do bằng lời thường, không hiện số»*. Lời đồng ý đó là đồng ý **hướng soạn**, chưa phải duyệt văn bản này; người soạn không tự duyệt (Hiến pháp N3).
- **Loại:** việc lớn (hiển thị tiền, giá trị mặc định của hình thức thanh toán). **Cửa:** hai chiều (giao diện và một câu báo lỗi; không migration, không đổi quyền, không đổi cách tính).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 2** (Đ1, Đ2). Trình riêng một lượt, **trước** bản sửa ADR-0182 (lượt đó đã đủ 3). Trang ghép ở cuối tệp.
- **Xây trên lỗi an toàn chưa sửa:** không. Không ghi dòng sổ, không thêm bảng, không đổi luật hạn mức ở máy chủ.
- **Quan hệ với ADR cũ:**
  - **Sửa** ADR-0173 Đ3 mục 3 (*«Xem đủ của mình: đại lý xem hạn mức, số đang nợ, còn được dùng, từng đơn nợ kèm hạn trả»*): đại lý **không** còn thấy hạn mức và «còn được dùng»; vẫn thấy số đang nợ và từng đơn nợ kèm hạn trả. Phần còn lại của ADR-0173 giữ nguyên.
  - **Giữ** ADR-0168 và ADR-0172: hạn mức vẫn có, vẫn do Quản trị/Toàn quyền đặt, máy chủ vẫn chặn vượt hạn mức và chặn khi có đơn quá hạn, đúng như hôm nay. Văn bản này chỉ đổi điều **đối tác nhìn thấy** và **lựa chọn sẵn**.
  - **Giữ** ADR-0197 (ô cọc của khách cho đơn Trả sau) và câu nhắc «cọc không làm giảm nợ với Công ty».
  - **Liên quan** bản sửa ADR-0182 (phiếu công nợ với Tour Đảo, biên lai nộp tiền): trình ở lượt sau, không phụ thuộc văn bản này.

## Bối cảnh

Chủ muốn Trả sau với đối tác mang nghĩa «nhận vé trước, trả tiền sau vài giờ», không phải «cho nợ». Hôm nay:

- Ô lập đơn hiện câu «Hạn mức khả dụng …» cạnh hai lựa chọn hình thức thanh toán (`cauChonTraSau`, `src/shared/han-muc-tra-sau-hien-thi.ts`).
- Mục «Trả sau của tôi» ở trang Tôi hiện «Đang nợ … · Hạn mức khả dụng …» (`web/tra-sau-cua-toi.ts`).
- Đơn mới luôn chọn sẵn «Thanh toán ngay» (`hinhThucMuon` khởi đầu là `"PREPAID"`, `web/order-form.ts`); `quyetHinhThuc` chỉ giữ «Trả sau» khi người dùng đã chọn từ trước.

Con số hạn mức làm đối tác hiểu đây là khoản được nợ, đúng điều chủ không muốn.

## Đ1 — Đối tác không thấy con số hạn mức

1. **Ai:** tài khoản giữ quyền Đối tác và không giữ quyền Kế toán (cùng cách nhận diện «đối tác» của ADR-0196 mục 1). Văn phòng (Kế toán, Quản trị, Toàn quyền, Bán hàng) **không đổi**: vẫn thấy hạn mức ở «Cấp độ đại lý», «Hạn mức trả sau» và ô lập đơn qua đối tác.
2. **Ô lập đơn:** khi bên đặt dùng được Trả sau, khối «Hình thức thanh toán» hiện câu ngắn **«Bạn được trả sau. Nhận vé trước, chuyển tiền cho Tour Đảo trong hạn trả.»** (chữ chờ chủ chọn, xem «Chữ chờ chủ chọn»), không kèm số tiền.
3. **Khi bị khoá vì có đơn quá hạn:** giữ câu khoá đang có (`CAU_KHOA_QUA_HAN`: «Bên đặt còn đơn trả sau quá hạn chưa thanh toán nên chưa đặt thêm đơn trả sau được.») — câu này không có số tiền.
4. **Khi lưu hay xác nhận bị máy chủ chặn vì vượt hạn mức:** hôm nay máy chủ trả câu có số (`kiemTraSau`, `src/shared/tra-sau.ts`: «… vượt hạn mức khả dụng của bên đặt là … (hạn mức …»). Khi **người gửi** là tài khoản Đối tác theo mục 1, máy chủ trả câu **không** số: «Đơn này vượt mức được trả sau. Chọn Thanh toán ngay, hoặc liên hệ Tour Đảo.» (chữ chờ chủ chọn). Mã lỗi giữ nguyên; câu cho văn phòng giữ nguyên. Đây là chỗ duy nhất văn bản này sửa ở máy chủ.
5. **«Trả sau của tôi»** (`web/tra-sau-cua-toi.ts`) hôm nay có **hai** dòng mang số hạn mức: dòng `cauHanMuc(r)` («50.000.000 ₫ · trả trong 36 giờ · ân hạn …», `src/shared/han-muc-tra-sau-hien-thi.ts`) và dòng «Đang nợ … · Hạn mức khả dụng …». Bỏ **cả hai** phần số hạn mức: dòng `cauHanMuc(r)` thay bằng câu không số «Bạn được trả sau, trả trong N giờ kể từ khi đơn được xác nhận, sau đó còn M giờ ân hạn.» (giữ số giờ, vì đó là hạn trả, không phải số tiền; không có ân hạn thì bỏ vế sau); dòng sau chỉ còn «Đang nợ …». Giữ từng đơn còn nợ kèm giờ hạn trả. (Sửa sau vòng kiểm độc lập 12/11, phát hiện VỪA số 1.)
6. **Chỉ ẩn trên màn hình, không phải bí mật.** Máy chủ vẫn trả các trường hạn mức (`hanMuc`, `conDuocDung`) cho đối tác như hôm nay (đối tác đã được xem theo ADR-0173), nên đối tác rành máy vẫn đọc được số qua công cụ của trình duyệt. *Người soạn tự chọn, đảo ngược được:* mục đích của chủ là gọn, không phải giấu; giữ API nguyên thì không đổi hợp đồng giữa các phần. Chủ muốn giấu hẳn thì nói, việc đó thành một quyết định riêng.
7. Các hàm thuần dựng chữ cho đối tác (câu ở ô lập đơn, hai dòng của «Trả sau của tôi», câu vượt hạn mức) có bài kiểm: **mọi** chữ trả về cho đối tác không chứa ký hiệu «₫» và không chứa số tiền. Bài phủ **cả** màn «Trả sau của tôi», không chỉ ô lập đơn.

## Đ2 — Đơn mới của đối tác chọn sẵn «Trả sau»

1. **Khi nào chọn sẵn:** lập **đơn mới** (chưa từng lưu), người lập là tài khoản Đối tác theo Đ1 mục 1, và bên đặt **dùng được** Trả sau ngay lúc đó (có hạn mức hiệu lực, không có đơn quá hạn: `c.hien && c.khoa === null`).
2. **Khi nào không:** nháp đã lưu giữ hình thức đã lưu; bên đặt không dùng được Trả sau thì chọn sẵn «Thanh toán ngay» như hôm nay, không hiện câu báo «chuyển về Thanh toán ngay» (người dùng chưa chọn gì).
3. **Văn phòng lập đơn qua đối tác:** giữ chọn sẵn «Thanh toán ngay». *Người soạn tự chọn, đảo ngược được:* chủ nói «phương thức mặc định **của đối tác**»; văn phòng đặt hộ thì nên chủ động chọn.
4. Đối tác vẫn đổi được sang «Thanh toán ngay» bằng một chạm. Máy chủ vẫn kiểm lại lúc lưu và lúc xác nhận (không đổi).
5. **Trả sau theo dịch vụ** (ADR-0178 Đ2, chưa thi công ở ô lập đơn): khi phần đó lên, đơn chỉ có dịch vụ được trả sau ngoài hạn mức cũng được chọn sẵn «Trả sau» theo cùng mục 1; người thi công ADR-0178 Đ2 sửa hàm chọn sẵn cho khớp.
6. Luật chọn sẵn là một hàm thuần (mở rộng `quyetHinhThuc` hoặc hàm mới cạnh nó), có bài kiểm cho bốn ca: đơn mới + dùng được → Trả sau; đơn mới + không dùng được → Thanh toán ngay, không câu báo; nháp đã lưu Thanh toán ngay → giữ; văn phòng lập → Thanh toán ngay.

## Chữ chờ chủ chọn (Hiến chương 5.27, ADR-0167)

Chưa có trong `docs/BANG-THAM-CHIEU.md`. Người soạn đưa khuyến nghị; chủ sửa được lúc duyệt.

| Chỗ | Khuyến nghị | Phương án khác |
|---|---|---|
| Câu ở ô lập đơn (Đ1.2) | «Bạn được trả sau. Nhận vé trước, chuyển tiền cho Tour Đảo trong hạn trả.» | «Được trả sau trong hạn trả.» |
| Câu khi vượt hạn mức (Đ1.4) | «Đơn này vượt mức được trả sau. Chọn Thanh toán ngay, hoặc liên hệ Tour Đảo.» | «Chưa trả sau được đơn này. Chọn Thanh toán ngay.» |

## Phương án đã loại

- **Bỏ hẳn hạn mức với đối tác** (cho trả sau không giới hạn): mất lớp chặn rủi ro mà ADR-0168 dựng; chủ chỉ yêu cầu không **hiện**.
- **Chọn sẵn Trả sau cho mọi đơn, kể cả văn phòng lập:** chủ chỉ nói «của đối tác».

## Hệ quả chủ cần biết

- Đối tác không còn biết mình còn bao nhiêu để trả sau. Khi chạm mức, họ chỉ thấy câu báo ở Đ1.4 và phải chọn Thanh toán ngay hoặc gọi Tour Đảo.
- Chọn sẵn «Trả sau» không xét đơn có vừa phần hạn mức còn lại không (đối tác lại không thấy số). Đơn lớn gần chạm mức sẽ bị chặn lúc lưu hoặc lúc xác nhận với câu ở Đ1.4, và đối tác phải chọn lại. *Người soạn tự chọn:* không đổi lựa chọn tự động theo tổng tiền đang gõ, vì ô tự nhảy qua lại giữa hai hình thức còn khó hiểu hơn.
- Đơn Trả sau đã mở vé mà còn nợ thì không huỷ được (ADR-0168 Đ3 mục 3). Chọn sẵn Trả sau sẽ làm tăng số đơn khách đổi ý mà văn phòng không tự huỷ ngay được.
- Đơn của đối tác sẽ ra Trả sau nhiều hơn, vì được chọn sẵn. Hạn trả theo giờ và ân hạn (ADR-0172) giữ nguyên, nên số đơn tới hạn mỗi ngày có thể tăng.
- **Chưa kiểm:** các chỗ khác (thông báo, email, Trợ lý) có nhắc số hạn mức cho đối tác không; người thi công dò `dongTien(` quanh chữ «hạn mức» trong mọi đường trả về cho đối tác và ghi kết quả vào nhật ký.

## Trang ghép (quy trình «bước ghép khi duyệt»)

1. **Bảng chạm:** không bảng nào. Không migration.
2. **Bản đồ quyền:** không đổi ô nào. Ô xem hạn mức của đối tác (phạm vi «own») giữ nguyên; chỉ màn hình không vẽ con số.
3. **Cổng:** không đổi route, không đổi điều kiện chặn. Máy chủ vẫn là cổng chặn vượt hạn mức và đơn quá hạn; chỉ câu báo khi người gửi là đối tác đổi chữ (Đ1.4).

   **Chỗ giao diện ẩn/hiện bị đổi nghĩa:** khối «Hình thức thanh toán» ở ô lập đơn (câu mới, lựa chọn sẵn mới cho đối tác); mục «Trả sau của tôi» ở trang Tôi (bỏ dòng số hạn mức và phần «Hạn mức khả dụng»); câu báo lỗi vượt hạn mức khi người nhận là đối tác.
