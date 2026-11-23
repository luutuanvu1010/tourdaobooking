# Đề xuất ADR-0218 — Phí đưa đón do máy tính: giá gốc từ Sheet, giảm theo cấp, chương trình miễn phí; biên nhận khách lẻ gộp phí vào giá

- **Trạng thái:** **proposed** 2026-11-18, chờ chủ dự án duyệt. AI soạn, không tự duyệt (Hiến pháp N3). Duyệt xong, người chép đưa phần «Tóm tắt», «Quyết định», «Điều chủ cần biết» sang `docs/adr/ADR-0218-…md` giữ từng chữ.
- **Nguồn:** đặc tả ngắn `docs/superpowers/specs/2026-11-18-phi-don-gia-goc-sheet-design.md`, chủ duyệt 18/11, nguyên văn: «1, 2, 3 theo khuyến nghị, duyệt đặc tả, viết dễ hiểu». Mục 6 (biên nhận khách lẻ) chủ nói rõ ở tin nhắn sau, nguyên văn: «chỉ đổi cách hiển thị chứ không phỉa là không tính. Ví dụ: Giá vé là 1 triệu, phí đưa đón là 10,000 thì hiển thị 1,010,000đ, không hiển thị dòng phí đưa đón riêng lẻ để khách không cảm thấy là mắc». Lệch giữa đặc tả và văn bản này thì văn bản này thắng.
- **Số:** 0218 — thư mục `docs/adr/` của các nhánh trên máy này lớn nhất là 0217 (kiểm 18/11 bằng `git ls-tree`). Chưa kiểm GitHub sau lần lấy gần nhất; người chép kiểm lại trước khi chép.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). Thi công xong cần người kiểm độc lập chỉ đọc. **Cửa:** hai chiều mềm — bảng mới chỉ thêm; bảng phí theo khu vực và dữ liệu cũ không bị xoá.
- **Số quyết định chạm tiền, dữ liệu, quyền trong lượt duyệt:** 3 nhóm (Đ1–Đ3), đúng trần. Mỗi nhóm gom nhiều điểm như ADR-0203, ADR-0214 đã làm; chủ muốn thì tách Đ1 làm hai lượt duyệt. Trang ghép ở cuối.
- **Xây trên lỗ đang hở: HC-5.19** (HIGH, hạn 2026-12-31 — chưa từng diễn tập khôi phục dữ liệu). Văn bản này sinh dòng tiền trên đơn và thêm bảng mới, nên chạm vùng mục này canh. Chủ chọn một trong hai khi duyệt: «Cho phép, có ghi lý do» (lý do đề xuất: Đợt 1 không sinh tiền; Đợt 2 chỉ sinh tiền sau khi Quản trị đặt «ngày bắt đầu áp»; bảng chỉ thêm, không sửa dữ liệu cũ) hoặc «chỉ phát hành Đợt 2 sau diễn tập khôi phục». **Không xây trên HC-4.2:** đổi số phí ở đây là đặt giá trước khi xác nhận đơn (như giảm giá), không phải bút toán điều chỉnh sổ tiền.
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

## Trang ghép (`CLAUDE.md` §9)
| Bảng | Chứa | Ai ghi | Ai đọc / đổi gì |
|---|---|---|---|
| Giá gốc phí đón (mới, bảng riêng của `catalog`; không thêm cột vào bảng chép Sheet) | một loại: hai giá gốc phí đón theo mã dịch vụ | chỉ lần đồng bộ Sheet | `pricing` qua view `v_ctl_*`; không vào danh mục lập đơn của Đối tác |
| Mức giảm theo cấp (mới, `pricing`) | một loại: mức giảm phí đón của một cấp | `partner.commission.write`: Kế toán, Quản trị, Toàn quyền | hàm tính phí; màn Hoa hồng đối tác hoặc màn phí đón |
| Chương trình miễn phí + bảng con phạm vi (mới, `pricing`) | một loại: chương trình miễn phí | `admin.manage`: Quản trị, Toàn quyền | hàm tính phí; tên chương trình chỉ hiện cho văn phòng |
| Cài đặt in biên nhận khách lẻ (mới) | một dòng công tắc | `settings.ops`: Toàn quyền | `receipt`, ảnh xác nhận đơn |
| `order_item` (dòng `TRANSFER_FEE`) | như Đợt C | máy chủ, trong lô lưu nháp / xác nhận | thêm trường chụp của Đ1.6; đọc như cũ bởi công nợ đại lý, hạn mức trả sau, biên nhận |
| `prc_rate_tier`, `prc_role_tier`, `prc_party_tier` | như cũ | như cũ | phí đón đọc lại cấp của bên đặt (như ADR-0203) |

- **Quyền:** không thêm ô, không đổi giá trị ô nào. Ba ô hiện có nhận thêm nghĩa: `partner.commission.write` nay đặt cả mức giảm phí đón; `admin.manage` nay mở chương trình miễn phí; `settings.ops` nay giữ công tắc biên nhận khách lẻ.
- **Cổng nào canh cửa nào:** `transfer_fee_missing` (409 ở `/status`, Gửi xác nhận, Còn vé; nhánh A ở Gửi đơn của Đối tác) thêm lý do «ô Sheet trống»; lý do «hai cấp» giữ. Đối tác gửi số phí: 400 như ADR-0214. Không thêm cổng mới.
- **Chỗ giao diện đổi nghĩa:** ô chọn phí ở biểu mẫu đơn và bảng Còn vé đổi từ «chọn mức» sang «số máy tính + nút đổi số có lý do» (ở Còn vé nay đổi được cả lượt đón đã có số); màn Cấp độ đại lý — đổi cấp ảnh hưởng phí đón (câu nhắc bật lại); màn bảng phí theo khu vực ẩn khỏi menu; công tắc mới trên bảng điều khiển của Toàn quyền.

## Thi công và phát hành
- **Trước khi viết mã:** kiểm trang web công khai với cột mới; kiểm bên đặt của đơn thành viên tổ chức; viết lại `golden/phi-dua-don.json` (ít nhất: ca ví dụ 60.000 đ; khách lẻ; đối tác chưa có cấp; hai cấp; giảm quá giá gốc; ô trống; ô 0; xe riêng có và không có «gồm xe riêng»; chương trình theo dịch vụ, theo đối tác, ngoài khoảng ngày; đổi số; sửa số khách sau xác nhận; biên nhận khách lẻ gộp ca thường và ca trọn gói) và chờ chủ hoặc Kế toán xác nhận.
- **Vướng kỹ thuật đã thấy:** cột `order_item.fee_source` có ràng buộc chỉ nhận `BANG_PHI`, `CHON` (migration `0173`); các trigger dòng phí kiểm theo hai nguồn đó (nguồn khác `CHON` thì đòi `fee_rule_id`, `fee_zone_code`; `SO_KHAC` đòi đơn giá ≥ 1, trong khi đổi số về 0 nay hợp lệ). SQLite không đổi được ràng buộc cột tại chỗ. Người thi công chọn trong kế hoạch: thêm cột nguồn mới, hoặc dựng lại bảng theo expand–contract — và **dựng lại cả các trigger dòng phí**; không lách bằng cách ghi nguồn cũ cho dòng mới.
- **Hàm tính hiện có** trả «đại lý hai cấp» cho mọi lượt đón ngay khi bên đặt có hai cấp; luật mới chỉ tra cấp ở bước 3, nên phải tách nhánh để lượt đón có chương trình miễn phí hay số đổi tay không bị giữ.
- **Hai đợt:** Đợt 1 không sinh tiền — đọc hai cột Sheet, bảng mức giảm, bảng chương trình, công tắc, các màn nhập, danh sách «dịch vụ có đưa đón chưa có phí» trên màn bật phí. Đợt 2 — tính phí trên đơn, chụp, đổi số ở Còn vé, biên nhận khách lẻ gộp. Phí chỉ sinh khi có «ngày bắt đầu áp». Đợt 2 phát hành theo lựa chọn của chủ về HC-5.19 ở đầu văn bản.
- Số migration lấy lúc thi công. Chữ mới trên giao diện phải có trong `docs/BANG-THAM-CHIEU.md`; tên chưa có thì đưa 2–3 phương án cho chủ chọn ở bước kế hoạch.

## Tiêu chí nghiệm thu
- Tour A giá gốc 50.000, cấp 3 giảm 20.000, 2 người lớn + 1 em bé đi chung ⇒ 60.000 đ; khách lẻ ⇒ 100.000 đ; đối tác chưa có cấp ⇒ 100.000 đ. Cấp giảm 70.000 ⇒ 0 đ, không âm.
- Ô Sheet trống ⇒ `/status` 409 `transfer_fee_missing` nêu tên dịch vụ; Đối tác Gửi đơn ⇒ nhánh A. Ô có số ⇒ Đối tác Gửi đơn đi thẳng. Ô ghi 0 ⇒ 0 đ, không giữ.
- Đổi tên cột trên Sheet rồi đồng bộ ⇒ báo lỗi, giá gốc phí đón cũ còn nguyên, giá vé vẫn cập nhật. Ghi 600.000 vào cột đi chung ⇒ ô đó báo lỗi, giữ giá gốc phí đón cũ, giá vé của dịch vụ đó vẫn cập nhật.
- Màn bật phí liệt kê đúng các dịch vụ có đưa đón mà ô Sheet trống.
- Chương trình «tour A, 1/12–31/12» ⇒ lượt đón đi chung tour A ngày 5/12 ra 0 đ, chụp mã chương trình, nhật ký ghi tên chương trình; đơn đại lý in «Phí đưa đón — Miễn phí» trên biên nhận mẫu đối tác; lượt đón ngày 2/1 tính tiền; lượt xe riêng tour A tính tiền trừ khi có «gồm xe riêng». Chương trình «đối tác X, 1/12–15/12» ⇒ đơn bên đặt X ra 0 đ, đối tác Y không đổi.
- Ô Sheet trống nhưng có chương trình khớp ⇒ 0 đ, không giữ.
- Tạo chương trình sau khi đơn đã xác nhận ⇒ phí đơn đó không đổi. Đổi Sheet, mức giảm, cấp sau xác nhận ⇒ không đổi.
- Văn phòng đổi đơn giá 30.000 → 80.000 mỗi khách không có lý do ⇒ 400; có lý do ⇒ nhận, thành tiền = 80.000 × số khách, nhật ký ghi người, số cũ, số mới, lý do. Đổi về 0 có lý do ⇒ nhận. Người xác nhận ở Còn vé đổi số của lượt đón đã có số ⇒ nhận. Đối tác gửi số ⇒ 400.
- Trước «ngày bắt đầu áp»: ô Sheet trống không chặn xác nhận, đơn không có dòng phí.
- Bán hàng hoặc Kế toán tạo chương trình ⇒ 403; Quản trị ⇒ được. Bán hàng đặt mức giảm cấp ⇒ 403; Kế toán ⇒ được. Quản trị bấm công tắc biên nhận ⇒ 403; Toàn quyền ⇒ được, nhật ký ghi.
- Khách lẻ, người lớn 1.000.000 đ, phí 10.000 đ chỉ chiều đi, công tắc Tắt ⇒ biên nhận in người lớn 1.010.000 đ, không có chữ «Phí đưa đón»; tổng, còn lại, QR đúng bằng khi tách dòng. Đơn khách lẻ có thêm dịch vụ do nhà cung cấp khác bán ⇒ tổng từng phần đúng, phí của dịch vụ đó in ở phần Tour Đảo. Bật công tắc ⇒ in lại dòng phí riêng, tổng không đổi. Khách lẻ xe riêng ⇒ một dòng trọn gói, các dòng cộng đúng tổng. Biên nhận đơn đối tác ⇒ vẫn có dòng phí riêng.
- Thử tra (nếu giữ) và đơn thật ra cùng số trong mọi ca sổ vàng.

## Soát trước khi trình
Một người đọc độc lập chỉ đọc đã soát bản đầu ngày 18/11, đối chiếu mã và ADR thật. Bảy chỗ sai hoặc thiếu đã sửa trong bản này: lỗ HC-5.19 bị ghi «không»; cách gọi quan hệ với ADR-0203 (khôi phục ĐB2, thay một phần ĐB3) và ADR-0201; quyền đổi số ở Còn vé là điểm mới; đơn vị của số đổi; biên nhận nhiều người bán; định nghĩa khách lẻ theo mẫu in; các điểm đặc tả có mà bản đầu làm rơi (danh sách dịch vụ chưa có phí, tên chương trình trong nhật ký, trần xe riêng, ô giá hỏng không được làm bỏ cả dòng dịch vụ). Lỗi nhỏ còn lại đã đưa vào mục «Thi công».

## Cách duyệt
Chủ trả lời một câu, ví dụ: «Duyệt ADR-0218; HC-5.19 cho phép, có ghi lý do» hoặc «Duyệt ADR-0218; Đợt 2 chỉ phát hành sau diễn tập khôi phục».
