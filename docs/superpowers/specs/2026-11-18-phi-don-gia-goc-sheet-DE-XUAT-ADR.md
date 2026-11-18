# Đề xuất ADR-0218 — Phí đưa đón do máy tính: giá gốc từ Sheet, giảm theo cấp, chương trình miễn phí; biên nhận khách lẻ gộp phí vào giá

- **Trạng thái:** **proposed** 2026-11-18, chờ chủ dự án duyệt. AI soạn, không tự duyệt (Hiến pháp N3). Duyệt xong, người chép đưa phần «Tóm tắt», «Quyết định», «Điều chủ cần biết» sang `docs/adr/ADR-0218-…md` giữ từng chữ.
- **Nguồn:** đặc tả ngắn `docs/superpowers/specs/2026-11-18-phi-don-gia-goc-sheet-design.md`, chủ duyệt 18/11, nguyên văn: «1, 2, 3 theo khuyến nghị, duyệt đặc tả, viết dễ hiểu». Mục 6 (biên nhận khách lẻ) chủ nói rõ ở tin nhắn sau, nguyên văn: «chỉ đổi cách hiển thị chứ không phỉa là không tính. Ví dụ: Giá vé là 1 triệu, phí đưa đón là 10,000 thì hiển thị 1,010,000đ, không hiển thị dòng phí đưa đón riêng lẻ để khách không cảm thấy là mắc». Lệch giữa đặc tả và văn bản này thì văn bản này thắng.
- **Số:** 0218 kiểm còn trống ngày 18/11 trên mọi nhánh của máy này (lớn nhất: 0217). Chưa kiểm GitHub sau lần lấy gần nhất.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). Thi công xong cần người kiểm độc lập chỉ đọc. **Cửa:** hai chiều mềm — bảng mới chỉ thêm; bảng phí theo khu vực và dữ liệu cũ không bị xoá.
- **Số quyết định chạm tiền, dữ liệu, quyền trong lượt duyệt:** 3 (Đ1–Đ3), đúng trần. Trang ghép ở cuối.
- **Xây trên lỗ đang hở:** không (sổ hạn hôm nay chỉ có HC-4.2, không chạm phí đưa đón).
- **Quan hệ với ADR cũ** (không sửa tệp ADR nào):
  - **thay** ADR-0214 Đ1 (danh sách cố định) và phần «văn phòng chọn mức» của Đ2; **giữ** ADR-0214 Đ2 phần «Đối tác gửi mức phí ⇒ 400» và Đ3 (cổng `transfer_fee_missing`, nhánh A của Gửi đơn, «ngày bắt đầu áp» làm công tắc).
  - **thay** ADR-0203 ĐB1 (bảng phí nhiều khoá, thứ tự chọn mức); **giữ** ADR-0203 ĐB2 phần tra cấp của bên đặt vào ngày xác nhận (kể cả ca «hai vai trò hai cấp» bị giữ), số khách tính tiền, chụp lúc xác nhận; **giữ** ĐB3 (dòng phí trong công nợ đại lý, biên nhận đối tác) và **bổ sung** cách in cho biên nhận khách lẻ (Đ3 dưới đây).
  - **giữ** ADR-0147 Đ1–Đ2 ở trạng thái ngưng dùng cho đơn như ADR-0214 đã đặt; **giữ** Đ3 phần còn lại. **giữ** ADR-0047 (chặng không mang tiền), ADR-0117 (cấp đại lý là dữ liệu Kế toán đặt, không tạo bộ cấp thứ hai), ADR-0201 (Sheet giữ gốc, Nền tảng giữ lớp riêng).
  - ADR-0152 Đ-2 chọn «không thêm cột Sheet» cho đặc điểm dịch vụ; văn bản này thêm hai cột cho riêng phí đưa đón theo lời chủ 18/11, không đổi luật của đặc điểm dịch vụ.

## Tóm tắt cho chủ (lời thường)
1. Máy tự tính phí đưa đón. Giá gốc lấy từ hai cột mới trên Sheet dịch vụ: «Phí đưa đón» (mỗi khách, đi chung) và «Phí đưa đón xe riêng» (cả chuyến).
2. Mỗi cấp đại lý có một mức giảm cho mỗi khách, áp chung mọi dịch vụ, chỉ cho đi chung. Kế toán nhập. Giảm quá giá gốc thì tính 0.
3. Toàn quyền và Quản trị mở được chương trình miễn phí đón cho một, nhiều hoặc tất cả dịch vụ, hoặc cho một vài đối tác, trong một khoảng **ngày đi**. Xe riêng chỉ được miễn khi tích «gồm xe riêng».
4. Văn phòng đổi được số máy tính trước khi xác nhận, bắt buộc ghi lý do. Đối tác không đổi được.
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
3. **Giá gốc từ Sheet.** `catalog` đọc thêm hai cột tuỳ chọn khi đồng bộ, lưu trong `catalog` và công bố qua một view `v_ctl_*` cho `pricing` đọc. Ô trống = chưa có giá; số 0 = miễn phí. Hai chặn khi đồng bộ:
   - thiếu hẳn cột (bị đổi tên, xoá) ⇒ **không ghi đè** giá đang có, báo lỗi đồng bộ;
   - giá gốc đi chung trên 500.000 đ hoặc xe riêng trên 5.000.000 đ ⇒ báo lỗi dòng đó, giữ số cũ.
4. **Mức giảm theo cấp.** Bảng mới chỉ thêm ở `pricing`: mã cấp (`prc_rate_tier` đang bật), số tiền giảm mỗi khách (số nguyên ≥ 0), `valid_from/to`, người ghi. Mỗi cấp tối đa một dòng hiệu lực tại một ngày. Ghi bằng ô hiện có `partner.commission.write` (Kế toán, Quản trị, Toàn quyền). Cấp của bên đặt tra như ADR-0203 ĐB2: khách lẻ và đối tác chưa có cấp ⇒ không giảm.
5. **Đổi số.** Người được đổi giữ nguyên như người được chọn ở ADR-0214 Đ2 (ghi được đơn nháp trong văn phòng, `order.modify`; người xác nhận ở Còn vé). Số 0–5.000.000 đ, lý do bắt buộc (không rỗng, có giới hạn độ dài). Đối tác gửi số ⇒ 400. Lưu trên dòng phí của đơn nháp (xoá–chèn lại khi lưu như mọi dòng tiền nháp). Lưu lại nháp không xoá số đã đổi; xoá lượt đón thì số đổi mất theo. Danh sách cố định của ADR-0214 bỏ.
6. **Chụp lúc xác nhận** (thêm vào phần chụp của ADR-0203 ĐB2): nguồn của số (đổi tay / chương trình / giá gốc), giá gốc đã dùng, mã cấp và mức giảm đã dùng, mã chương trình, số đổi tay, lý do, người đổi. Sau xác nhận phí không đổi khi Sheet, mức giảm, chương trình hay cấp đổi; sửa số khách thì tính lại theo đơn giá đã chụp (như cũ).
7. Một hàm duy nhất ở `pricing` tính phí cho cả lưu nháp, Thử tra (nếu giữ) và xác nhận (Hiến chương 5.4). Nhật ký đơn ghi lượt đón nào, số nào, nguồn nào, ai đổi; không ghi tên khách.

**Đ2 — Chương trình miễn phí đón (phân hệ `pricing`).**
1. Bảng mới chỉ thêm: tên chương trình, phạm vi, ngày đi từ – đến (theo giờ Việt Nam), cờ «gồm xe riêng» (mặc định không), người tạo, `valid_from/to` của chính dòng. Phạm vi là một trong ba: **tất cả dịch vụ**; **danh sách dịch vụ** (mã dịch vụ); **danh sách đối tác** (hồ sơ bên đặt). Danh sách nằm ở bảng con chỉ thêm.
2. **Khớp** khi: ngày đi của lượt đón nằm trong khoảng; và dịch vụ của lượt đón thuộc phạm vi, hoặc bên đặt của đơn thuộc phạm vi; và lượt đón đi chung, hoặc xe riêng với cờ «gồm xe riêng». Nhiều chương trình cùng khớp thì vẫn 0 đ, chụp mã chương trình tạo sớm nhất.
3. Ghi (tạo, kết thúc): ô hiện có `admin.manage` (Quản trị, Toàn quyền). Có hiệu lực ngay khi tạo. Kết thúc = đóng `valid_to` của dòng, không xoá; tạo nhầm thì kết thúc. Không sửa tại chỗ.
4. Chỉ ảnh hưởng đơn **chưa xác nhận** (đơn nháp tính lại ở lần lưu hoặc xác nhận kế tiếp). Đơn đã xác nhận giữ số đã chụp.
5. Đơn do thành viên của tổ chức đối tác đặt: chương trình theo đối tác khớp theo **bên đặt** ghi trên đơn. Chưa kiểm bên đặt của đơn thành viên là tổ chức hay cá nhân — người thi công kiểm và ghi vào kế hoạch trước khi viết mã phần này.

**Đ3 — Biên nhận khách lẻ gộp phí vào giá (phân hệ `receipt`, `src/shared/order-confirmation.ts`) và công tắc của Toàn quyền.**
1. **Khách lẻ** = đơn có bên đặt không phải đối tác, dù tài khoản nào lập. Áp cho biên nhận và ảnh xác nhận đơn gửi khách. Biên nhận mẫu đối tác (HD-02-DT), trang đơn văn phòng, phiếu công nợ, sổ sách không đổi: phí vẫn là dòng riêng.
2. **Tiền không đổi:** dòng phí vẫn nằm trong đơn; tạm tính, giảm giá, tổng, đã thu, còn lại, QR đọc đúng số như hôm nay. Gộp chỉ xảy ra ở lớp dựng nội dung gửi khách, không tạo đường tính tiền thứ hai (Hiến chương 5.4): số in ra phải cộng lại đúng tổng.
3. **Cách gộp** cho từng dịch vụ có lượt đón:
   - mọi lượt đón của dịch vụ là đi chung và mỗi lượt tính đúng bằng số khách tính tiền của dịch vụ ⇒ cộng tổng đơn giá phí mỗi khách (các chiều) vào đơn giá của từng dòng người lớn, trẻ em, người cao tuổi; dòng em bé giữ nguyên;
   - còn lại (có xe riêng; chiều về ít khách hơn; dịch vụ tính theo nhóm; dòng nhập tay; hay bất kỳ ca nào cộng vào đơn giá không ra đúng tổng) ⇒ dịch vụ in **một dòng trọn gói**: số khách và thành tiền đã gồm phí, không in đơn giá.
   - Dấu «giá khác giá công bố» xét trên đơn giá **trước** khi cộng phí.
   - Chữ «Phí đưa đón», khối phí đưa đón và chữ «(dự kiến)» của khối phí không xuất hiện trên bản gửi khách lẻ khi đang gộp.
4. **Công tắc** «Hiện riêng phí đưa đón trên biên nhận khách lẻ», mặc định **Tắt** (gộp). Bảng cài đặt mới chỉ thêm (một dòng hiệu lực), ghi bằng ô hiện có `settings.ops` (chỉ Toàn quyền), mỗi lần đổi ghi nhật ký. Chỉ đổi cách in nên áp cho mọi bản in sau lúc đổi, kể cả đơn đã xác nhận.

## Điều chủ cần biết
- **Phải kiểm trước khi thêm cột vào Sheet:** phần đặt tour của trang web công khai đọc cùng Sheet; chưa biết nó chịu được cột mới không. Thêm cột trước khi kiểm có thể làm hỏng trang đặt tour.
- **Ai sửa được Sheet là đổi được giá gốc phí đón**, và Nền tảng không lưu lịch sử giá trên Sheet (như giá dịch vụ hôm nay). Mỗi dòng phí ghi lại giá gốc đã dùng nên đơn nào cũng truy được.
- **Đổi cấp của một đại lý nay đổi luôn phí đón** của các đơn chưa xác nhận của họ. Màn Cấp độ đại lý cần câu nhắc lại (ADR-0214 đã tắt câu này); chữ do chủ chọn ở bước kế hoạch.
- **Khách lẻ thấy giá cao hơn giá công bố trên trang web** (vì đã cộng phí). Biên nhận không giải thích phần chênh; nhân viên cần biết để trả lời khách.
- **Phí vẫn chưa thu đồng nào** tới khi Quản trị đặt «ngày bắt đầu áp» (chưa kiểm lại trên bản chạy thật). Khuyến nghị: chưa đặt cho tới khi bản này lên, rồi xem danh sách «dịch vụ có đưa đón chưa có phí» trước khi bật.
- Màn bảng phí theo khu vực bị ẩn khỏi menu; dữ liệu để nguyên. Gỡ hẳn là việc sau.
- Sổ vàng phí đón phải viết lại theo luật này và được chủ hoặc Kế toán xác nhận đúng tới từng đồng trước khi viết mã (Hiến chương 5.17).

## Trang ghép (`CLAUDE.md` §9)
| Bảng | Chứa | Ai ghi | Ai đọc / đổi gì |
|---|---|---|---|
| Bảng chép Sheet của `catalog` (hoặc bảng riêng của `catalog`, người thi công chọn) | thêm hai giá gốc phí đón theo mã dịch vụ | chỉ lần đồng bộ Sheet | `pricing` qua view `v_ctl_*`; không vào danh mục lập đơn của Đối tác |
| Mức giảm theo cấp (mới, `pricing`) | một loại: mức giảm phí đón của một cấp | `partner.commission.write`: Kế toán, Quản trị, Toàn quyền | hàm tính phí; màn Hoa hồng đối tác hoặc màn phí đón |
| Chương trình miễn phí + bảng con phạm vi (mới, `pricing`) | một loại: chương trình miễn phí | `admin.manage`: Quản trị, Toàn quyền | hàm tính phí; tên chương trình chỉ hiện cho văn phòng |
| Cài đặt in biên nhận khách lẻ (mới) | một dòng công tắc | `settings.ops`: Toàn quyền | `receipt`, ảnh xác nhận đơn |
| `order_item` (dòng `TRANSFER_FEE`) | như Đợt C | máy chủ, trong lô lưu nháp / xác nhận | thêm trường chụp của Đ1.6; đọc như cũ bởi công nợ đại lý, hạn mức trả sau, biên nhận |
| `prc_rate_tier`, `prc_role_tier`, `prc_party_tier` | như cũ | như cũ | phí đón đọc lại cấp của bên đặt (như ADR-0203) |

- **Quyền:** không thêm ô, không đổi giá trị ô nào. Ba ô hiện có nhận thêm nghĩa: `partner.commission.write` nay đặt cả mức giảm phí đón; `admin.manage` nay mở chương trình miễn phí; `settings.ops` nay giữ công tắc biên nhận khách lẻ.
- **Cổng nào canh cửa nào:** `transfer_fee_missing` (409 ở `/status`, Gửi xác nhận, Còn vé; nhánh A ở Gửi đơn của Đối tác) thêm lý do «ô Sheet trống»; lý do «hai cấp» giữ. Đối tác gửi số phí: 400 như ADR-0214. Không thêm cổng mới.
- **Chỗ giao diện đổi nghĩa:** ô chọn phí ở biểu mẫu đơn và bảng Còn vé đổi từ «chọn mức» sang «số máy tính + nút đổi số có lý do»; màn Cấp độ đại lý — đổi cấp ảnh hưởng phí đón (câu nhắc bật lại); màn bảng phí theo khu vực ẩn khỏi menu; công tắc mới trên bảng điều khiển của Toàn quyền.

## Thi công và phát hành
- **Trước khi viết mã:** kiểm trang web công khai với cột mới; kiểm bên đặt của đơn thành viên tổ chức; viết lại `golden/phi-dua-don.json` (ít nhất: ca ví dụ 60.000 đ; khách lẻ; đối tác chưa có cấp; hai cấp; giảm quá giá gốc; ô trống; ô 0; xe riêng có và không có «gồm xe riêng»; chương trình theo dịch vụ, theo đối tác, ngoài khoảng ngày; đổi số; sửa số khách sau xác nhận; biên nhận khách lẻ gộp ca thường và ca trọn gói) và chờ chủ hoặc Kế toán xác nhận.
- **Vướng kỹ thuật đã thấy:** cột `order_item.fee_source` có ràng buộc chỉ nhận `BANG_PHI`, `CHON` (migration `0173`), và trigger kiểm dòng phí theo hai nguồn đó. SQLite không đổi được ràng buộc cột tại chỗ. Người thi công chọn trong kế hoạch: thêm cột nguồn mới, hoặc dựng lại bảng theo expand–contract; không lách bằng cách ghi nguồn cũ cho dòng mới.
- **Hai đợt:** Đợt 1 không sinh tiền — đọc hai cột Sheet, bảng mức giảm, bảng chương trình, công tắc, các màn nhập. Đợt 2 — tính phí trên đơn, chụp, biên nhận khách lẻ gộp. Phí chỉ sinh khi có «ngày bắt đầu áp».
- Số migration lấy lúc thi công. Chữ mới trên giao diện phải có trong `docs/BANG-THAM-CHIEU.md`; tên chưa có thì đưa 2–3 phương án cho chủ chọn ở bước kế hoạch.

## Tiêu chí nghiệm thu
- Tour A giá gốc 50.000, cấp 3 giảm 20.000, 2 người lớn + 1 em bé đi chung ⇒ 60.000 đ; khách lẻ ⇒ 100.000 đ; đối tác chưa có cấp ⇒ 100.000 đ. Cấp giảm 70.000 ⇒ 0 đ, không âm.
- Ô Sheet trống ⇒ `/status` 409 `transfer_fee_missing` nêu tên dịch vụ; Đối tác Gửi đơn ⇒ nhánh A. Ô có số ⇒ Đối tác Gửi đơn đi thẳng. Ô ghi 0 ⇒ 0 đ, không giữ.
- Đổi tên cột trên Sheet rồi đồng bộ ⇒ báo lỗi, giá gốc cũ còn nguyên. Ghi 600.000 vào cột đi chung ⇒ dòng đó báo lỗi, giữ số cũ.
- Chương trình «tour A, 1/12–31/12» ⇒ lượt đón đi chung tour A ngày 5/12 ra 0 đ, chụp mã chương trình; lượt đón ngày 2/1 tính tiền; lượt xe riêng tour A tính tiền trừ khi có «gồm xe riêng». Chương trình «đối tác X, 1/12–15/12» ⇒ đơn bên đặt X ra 0 đ, đối tác Y không đổi.
- Ô Sheet trống nhưng có chương trình khớp ⇒ 0 đ, không giữ.
- Tạo chương trình sau khi đơn đã xác nhận ⇒ phí đơn đó không đổi. Đổi Sheet, mức giảm, cấp sau xác nhận ⇒ không đổi.
- Văn phòng đổi số không có lý do ⇒ 400; có lý do ⇒ nhận, nhật ký ghi người, số cũ, số mới, lý do. Đối tác gửi số ⇒ 400.
- Bán hàng hoặc Kế toán tạo chương trình ⇒ 403; Quản trị ⇒ được. Bán hàng đặt mức giảm cấp ⇒ 403; Kế toán ⇒ được. Quản trị bấm công tắc biên nhận ⇒ 403; Toàn quyền ⇒ được, nhật ký ghi.
- Khách lẻ, người lớn 1.000.000 đ, phí 10.000 đ chỉ chiều đi, công tắc Tắt ⇒ biên nhận in người lớn 1.010.000 đ, không có chữ «Phí đưa đón», không có dấu «giá khác giá công bố»; tổng, còn lại, QR đúng bằng khi tách dòng. Bật công tắc ⇒ in lại dòng phí riêng, tổng không đổi. Khách lẻ xe riêng ⇒ một dòng trọn gói, các dòng cộng đúng tổng. Biên nhận đơn đối tác ⇒ vẫn có dòng phí riêng.
- Thử tra (nếu giữ) và đơn thật ra cùng số trong mọi ca sổ vàng.
