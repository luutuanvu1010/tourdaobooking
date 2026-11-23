# ADR-0218 — Phí đưa đón do máy tính: giá gốc từ Sheet, giảm theo cấp, chương trình miễn phí; biên nhận khách lẻ gộp phí vào giá

- **Trạng thái:** **accepted** 2026-11-18 — chủ dự án trong chat, nguyên văn: «Duyệt ADR-0218; HC-5.19 cho phép, có ghi lý do», sau khi nhận đề xuất `docs/superpowers/specs/2026-11-18-phi-don-gia-goc-sheet-DE-XUAT-ADR.md`. Trước đó cùng ngày chủ duyệt đặc tả ngắn `docs/superpowers/specs/2026-11-18-phi-don-gia-goc-sheet-design.md` («1, 2, 3 theo khuyến nghị, duyệt đặc tả, viết dễ hiểu») và sửa mục biên nhận khách lẻ («chỉ đổi cách hiển thị chứ không phỉa là không tính»). **Chưa có mã.**
  - AI soạn và chép, không tự duyệt (Hiến pháp N3). Bản chép giữ từng chữ phần «Tóm tắt», «Quyết định», «Điều chủ cần biết» của đề xuất. Trang ghép, mục thi công và tiêu chí nghiệm thu nằm ở đề xuất.
  - Hai con số trần người soạn đặt (500.000 đ mỗi khách đi chung, 5.000.000 đ cả chuyến xe riêng) được nêu ở đề xuất trong lúc trình, kèm câu «chủ xác nhận khi duyệt»; chủ duyệt không nói khác, người chép hiểu là chủ nhận hai số này. Chủ nói khác thì sửa bằng ADR mới.
  - Chủ được báo một lần (P18) rằng việc này xây trên lỗ HC-5.19 (chưa từng diễn tập khôi phục dữ liệu) và chọn «Cho phép, có ghi lý do». Lý do (đề xuất): Đợt 1 không sinh tiền; Đợt 2 chỉ sinh tiền sau khi Quản trị đặt «ngày bắt đầu áp»; bảng mới chỉ thêm, không sửa dữ liệu cũ. Không đặt điều kiện «chỉ phát hành sau diễn tập». Ghi ở `docs/quyen-hoan.json`, mục HC-5.19. **Không xây trên HC-4.2:** đổi số phí là đặt giá trước khi xác nhận đơn, không phải bút toán điều chỉnh sổ tiền.
- **Số:** 0218 kiểm còn trống ngày 18/11 trên mọi nhánh của máy này, các bản làm việc riêng và GitHub (lớn nhất khi đó: 0217).
- **Ngày:** 2026-11-18. **Loại:** việc lớn (tiền, dữ liệu, quyền) — thi công xong cần người kiểm độc lập chỉ đọc. **Cửa:** hai chiều mềm — bảng mới chỉ thêm; bảng phí theo khu vực và dữ liệu cũ không bị xoá.
- **Quan hệ với ADR cũ** (không sửa tệp ADR nào):
  - **thay** ADR-0214 Đ1 (danh sách cố định) và phần «văn phòng chọn mức» của Đ2; **giữ** ADR-0214 Đ2 phần «Đối tác gửi mức phí ⇒ 400» và Đ3 (cổng `transfer_fee_missing`, nhánh A của Gửi đơn, «ngày bắt đầu áp» làm công tắc — trước ngày đó mọi cổng mới của văn bản này cũng im lặng).
  - **thay** ADR-0203 ĐB1 (bảng phí nhiều khoá, thứ tự chọn mức). **Khôi phục** phần ADR-0203 ĐB2 mà ADR-0214 đã thay: tra cấp của bên đặt vào ngày xác nhận (kể cả ca «hai vai trò hai cấp» bị giữ) và chụp mã cấp. **Giữ** phần ĐB2 còn hiệu lực (số khách tính tiền, chụp lúc xác nhận). **Giữ** ĐB3 phần công nợ đại lý và biên nhận mẫu đối tác; **thay** ĐB3 phần biên nhận cho khách lẻ (Đ3 dưới đây bỏ dòng «Phí đưa đón», kể cả dòng «Miễn phí», trên bản gửi khách lẻ).
  - **giữ** ADR-0147 Đ1–Đ2 ở trạng thái ngưng dùng cho đơn như ADR-0214 đã đặt; **giữ** Đ3 phần còn lại. **giữ** ADR-0047 (chặng không mang tiền), ADR-0117 (cấp đại lý là dữ liệu Kế toán đặt, không tạo bộ cấp thứ hai).
  - **mở rộng** ADR-0201 Đ1.1: Sheet nay là nguồn thêm của hai giá gốc phí đón. **Giữ** điều ADR-0201 và ADR-0152 cùng giữ — không thêm cột vào bảng chép Sheet: giá gốc phí đón lưu ở **bảng riêng của `catalog`**. ADR-0152 Đ-2 («không thêm cột Sheet» cho đặc điểm dịch vụ) không đổi; lần này chủ chủ động thêm hai cột trên Sheet cho riêng phí đưa đón (lời chủ 18/11).

## Tóm tắt cho chủ (lời thường)
1. Máy tự tính phí đưa đón. Giá gốc lấy từ hai cột mới trên Sheet dịch vụ: «Phí đưa đón» (mỗi khách, đi chung) và «Phí đưa đón xe riêng» (cả chuyến).
2. Mỗi cấp đại lý có một mức giảm cho mỗi khách, áp chung mọi dịch vụ, chỉ cho đi chung. Kế toán nhập. Giảm quá giá gốc thì tính 0.
3. Toàn quyền và Quản trị mở được chương trình miễn phí đón cho một, nhiều hoặc tất cả dịch vụ, hoặc cho một vài đối tác, trong một khoảng **ngày đi**. Xe riêng chỉ được miễn khi tích «gồm xe riêng».
4. Văn phòng đổi được số máy tính trước khi xác nhận (kể cả người xác nhận ở bảng Còn vé), bắt buộc ghi lý do. Số đổi là giá mỗi khách (xe riêng: cả chuyến). Đối tác không đổi được.
5. Ô Sheet trống thì đơn bị giữ chờ xử lý, không tự hiểu là 0 đồng. Muốn miễn phí thì ghi 0. Đơn của Đối tác tính được phí thì đi thẳng, không phải chờ văn phòng như hiện nay.
6. Khách lẻ vẫn trả đủ phí, nhưng biên nhận gửi khách cộng phí vào giá dịch vụ, không in dòng «Phí đưa đón». Toàn quyền có công tắc để in lại dòng riêng.

## Quyết định

**Đ1 — Luật tính phí một lượt đón (phân hệ `pricing`, `catalog`, `orders`).**
1. **Thứ tự**, dừng ở bước đầu tiên ra kết quả:
   1. văn phòng đã đổi số (có lý do) ⇒ số đó;
   2. có chương trình miễn phí còn hiệu lực khớp lượt đón (Đ2) ⇒ 0 đ;
   3. còn lại ⇒ đi chung: `max(0, giá gốc − mức giảm của cấp)` × số khách tính tiền; xe riêng: giá gốc xe riêng × 1, không giảm theo cấp.
   Bước 1 và 2 ra số thì không cần giá gốc hay cấp, nên ô Sheet trống hoặc đối tác hai cấp không giữ đơn ở các lượt đó.
2. **Giữ đơn** (Hiến chương 5.7; cổng `transfer_fee_missing` của ADR-0214 Đ3, thêm lý do): ô giá gốc cần dùng đang trống; đối tác hai vai trò hai cấp mà chưa có cấp riêng. Không bao giờ lấy 0 cho ô trống.
3. **Giá gốc từ Sheet.** `catalog` đọc thêm hai cột tuỳ chọn khi đồng bộ, lưu ở một bảng riêng chỉ thêm của `catalog` và công bố qua một view `v_ctl_*` cho `pricing` đọc. Ô trống = chưa có giá; số 0 = miễn phí. Hai chặn khi đồng bộ (đều là việc mới phải làm — bộ đọc hiện tại coi cột vắng như ô trống, và một ô giá hỏng làm bỏ cả dòng dịch vụ):
   - thiếu hẳn cột (bị đổi tên, xoá) ⇒ **không ghi đè** giá gốc phí đón đang có, báo lỗi đồng bộ; phần còn lại của danh mục vẫn đồng bộ;
   - giá gốc đi chung trên 500.000 đ mỗi khách, hoặc xe riêng trên 5.000.000 đ cả chuyến *[trần xe riêng do người soạn đặt, chủ xác nhận khi duyệt]*, hoặc ô không phải số ⇒ báo lỗi ô đó, giữ giá gốc phí đón cũ của dịch vụ đó; **giá vé và các cột khác của dịch vụ vẫn cập nhật bình thường**.
4. **Mức giảm theo cấp.** Bảng mới chỉ thêm ở `pricing`: mã cấp (`prc_rate_tier` đang bật), số tiền giảm mỗi khách (số nguyên ≥ 0), `valid_from/to`, người ghi. Mỗi cấp tối đa một dòng hiệu lực tại một ngày. Ghi bằng ô hiện có `partner.commission.write` (Kế toán, Quản trị, Toàn quyền). Cấp của bên đặt tra như ADR-0203 ĐB2: khách lẻ và đối tác chưa có cấp ⇒ không giảm.
5. **Đổi số.**
   - **Ai:** người ghi được đơn nháp trong văn phòng (ô `order.modify`; Bán hàng chỉ trên đơn mình lập hoặc đang phụ trách) và người xác nhận ở Còn vé.
   - **Điểm mới so với ADR-0214:** ở Còn vé, người xác nhận được **đổi số của lượt đón đã có số** (máy luôn tính ra số). Hôm nay Còn vé chỉ nhận mức cho lượt đón chưa có mức và từ chối ghi đè (ruling P5/P6 của ADR-0214); chặn đó bỏ.
   - **Số đổi là đơn giá**: mỗi khách với đi chung, cả chuyến với xe riêng; thành tiền vẫn do máy nhân số khách. Đơn giá 0–5.000.000 đ; **0 được nhận** (miễn phí riêng cho đơn này). Trần áp lên đơn giá như hôm nay, nên thành tiền đi chung đông khách có thể vượt 5.000.000 đ.
   - Lý do bắt buộc (không rỗng, có giới hạn độ dài). Đối tác gửi số ⇒ 400.
   - Lưu trên dòng phí của đơn nháp (xoá–chèn lại khi lưu như mọi dòng tiền nháp). Lưu lại nháp không xoá số đã đổi; xoá lượt đón thì số đổi mất theo. Danh sách cố định của ADR-0214 bỏ.
6. **Chụp lúc xác nhận** (thêm vào phần chụp của ADR-0203 ĐB2): nguồn của số (đổi tay / chương trình / giá gốc), giá gốc đã dùng, mã cấp và mức giảm đã dùng, mã chương trình, số đổi tay, lý do, người đổi. Sau xác nhận phí không đổi khi Sheet, mức giảm, chương trình hay cấp đổi; sửa số khách thì tính lại theo đơn giá đã chụp (như cũ).
7. Một hàm duy nhất ở `pricing` tính phí cho cả lưu nháp, Thử tra (nếu giữ) và xác nhận (Hiến chương 5.4). Nhật ký đơn ghi lượt đón nào, số nào, nguồn nào, **tên chương trình** (nếu có), ai đổi; không ghi tên khách.
8. **Màn bật phí** (nơi đặt «ngày bắt đầu áp», dời sang màn phí đón mới) liệt kê các dịch vụ có đưa đón mà chưa có giá gốc phí đón. Chỉ nhắc, không chặn việc bật.

**Đ2 — Chương trình miễn phí đón (phân hệ `pricing`).**
1. Bảng mới chỉ thêm: tên chương trình, phạm vi, ngày đi từ – đến (theo giờ Việt Nam), cờ «gồm xe riêng» (mặc định không), người tạo, `valid_from/to` của chính dòng. Phạm vi là một trong ba: **tất cả dịch vụ**; **danh sách dịch vụ** (mã dịch vụ); **danh sách đối tác** (hồ sơ bên đặt). Danh sách nằm ở bảng con chỉ thêm.
2. **Khớp** khi: ngày đi của lượt đón nằm trong khoảng; và dịch vụ của lượt đón thuộc phạm vi, hoặc bên đặt của đơn thuộc phạm vi; và lượt đón đi chung, hoặc xe riêng với cờ «gồm xe riêng». Nhiều chương trình cùng khớp thì vẫn 0 đ, chụp mã chương trình tạo sớm nhất.
3. Ghi (tạo, kết thúc): ô hiện có `admin.manage` (Quản trị, Toàn quyền). Có hiệu lực ngay khi tạo. Kết thúc = đóng `valid_to` của dòng, không xoá; tạo nhầm thì kết thúc. Không sửa tại chỗ.
4. Chỉ ảnh hưởng đơn **chưa xác nhận** (đơn nháp tính lại ở lần lưu hoặc xác nhận kế tiếp). Đơn đã xác nhận giữ số đã chụp.
5. Đơn do thành viên của tổ chức đối tác đặt: chương trình theo đối tác khớp theo **bên đặt** ghi trên đơn. Chưa kiểm bên đặt của đơn thành viên là tổ chức hay cá nhân — người thi công kiểm và ghi vào kế hoạch trước khi viết mã phần này.

**Đ3 — Biên nhận khách lẻ gộp phí vào giá (phân hệ `receipt`, `src/shared/order-confirmation.ts`) và công tắc của Toàn quyền.**
1. **Khách lẻ** = đơn có biên nhận in **mẫu nội bộ** (máy hôm nay chọn mẫu nội bộ khi bên đặt không phải đối tác **và** người lập không phải tài khoản Đối tác thuần), dù nhân viên văn phòng nào lập. Áp cho biên nhận và ảnh xác nhận đơn gửi khách. Biên nhận mẫu đối tác (HD-02-DT), trang đơn văn phòng, phiếu công nợ, sổ sách không đổi: phí vẫn là dòng riêng.
2. **Tiền không đổi:** dòng phí vẫn nằm trong đơn; tạm tính, giảm giá, tổng, đã thu, còn lại, QR đọc đúng số như hôm nay. Gộp chỉ xảy ra ở lớp dựng nội dung gửi khách. Thành tiền mới của dòng in ra phải đi qua hàm tính thành tiền chung đang có (không viết phép nhân thứ hai — Hiến chương 5.4), và có bài kiểm: tổng các dòng in ra bằng tạm tính, tổng từng phần bằng số của phần đó.
3. **Cách gộp** cho từng dịch vụ có lượt đón:
   - dịch vụ thuộc **phần Tour Đảo**, mọi lượt đón của nó là đi chung và mỗi lượt tính đúng bằng số khách tính tiền của dịch vụ ⇒ cộng tổng đơn giá phí mỗi khách (các chiều) vào đơn giá của từng dòng người lớn, trẻ em, người cao tuổi; dòng em bé giữ nguyên;
   - dịch vụ thuộc phần Tour Đảo nhưng không chia đều được (có xe riêng; chiều về ít khách hơn; dịch vụ tính theo nhóm; dòng nhập tay; hay bất kỳ ca nào cộng vào đơn giá không ra đúng tổng) ⇒ dịch vụ in **một dòng trọn gói**: số khách và thành tiền đã gồm phí, không in đơn giá;
   - dịch vụ do **nhà cung cấp khác bán** (phần «trả tại quầy» trên biên nhận nhiều người bán): phí đưa đón là tiền của Tour Đảo, không được cộng vào phần của nhà cung cấp. Phí của các lượt đón này in ở phần Tour Đảo thành một dòng riêng mang tên dịch vụ (ví dụ «Tour B — đưa đón»). Đây là ngoại lệ hiếm, chủ biết khi duyệt.
   - Chữ «Phí đưa đón», khối phí đưa đón và chữ «(dự kiến)» của khối phí không xuất hiện trên bản gửi khách lẻ khi đang gộp. (Mẫu nội bộ không có dấu «giá khác giá công bố», nên không có gì phải tắt ở đây.)
4. **Công tắc** «Hiện riêng phí đưa đón trên biên nhận khách lẻ», mặc định **Tắt** (gộp). Bảng cài đặt mới chỉ thêm (một dòng hiệu lực), ghi bằng ô hiện có `settings.ops` (chỉ Toàn quyền), mỗi lần đổi ghi nhật ký. Chỉ đổi cách in nên áp cho mọi bản in sau lúc đổi, kể cả đơn đã xác nhận.

## Điều chủ cần biết
- **Phải kiểm trước khi thêm cột vào Sheet:** phần đặt tour của trang web công khai đọc cùng Sheet; chưa biết nó chịu được cột mới không. Thêm cột trước khi kiểm có thể làm hỏng trang đặt tour.
- **Ai sửa được Sheet là đổi được giá gốc phí đón**, và Nền tảng không lưu lịch sử giá trên Sheet (như giá dịch vụ hôm nay). Mỗi dòng phí ghi lại giá gốc đã dùng nên đơn nào cũng truy được.
- **Đổi cấp của một đại lý nay đổi luôn phí đón** của các đơn chưa xác nhận của họ. Màn Cấp độ đại lý cần câu nhắc lại (ADR-0214 đã tắt câu này); chữ do chủ chọn ở bước kế hoạch.
- **Khách lẻ thấy giá cao hơn giá công bố trên trang web** (vì đã cộng phí). Biên nhận không giải thích phần chênh; nhân viên cần biết để trả lời khách.
- **Đơn khách lẻ có dịch vụ do nhà cung cấp khác bán** vẫn thấy một dòng đưa đón ở phần Tour Đảo (Đ3.3), vì không được cộng tiền của Tour Đảo vào phần khách trả tại quầy.
- **Chương trình miễn phí theo đối tác có thể không áp cho đơn do thành viên của tổ chức đối tác đặt**, tuỳ đơn đó ghi bên đặt là tổ chức hay cá nhân — chưa kiểm (Đ2.5).
- **Hai con số người soạn đặt, chủ xác nhận khi duyệt:** trần giá gốc từ Sheet 500.000 đ mỗi khách (đi chung) và 5.000.000 đ cả chuyến (xe riêng).
- **Mức giảm theo cấp là quyền tiền «mềm»:** ô `partner.commission.write` không nằm trong nhóm ô ghi tiền được bài canh quyền tiền khoá, nên mở thêm nghĩa này không bị máy chặn; dựa vào trang ghép và người kiểm.
- **Phí vẫn chưa thu đồng nào** tới khi Quản trị đặt «ngày bắt đầu áp» (chưa kiểm lại trên bản chạy thật). Khuyến nghị: chưa đặt cho tới khi bản này lên, rồi xem danh sách «dịch vụ có đưa đón chưa có phí» trước khi bật.
- Màn bảng phí theo khu vực bị ẩn khỏi menu; dữ liệu để nguyên. Gỡ hẳn là việc sau.
- Sổ vàng phí đón phải viết lại theo luật này và được chủ hoặc Kế toán xác nhận đúng tới từng đồng trước khi viết mã (Hiến chương 5.17).
