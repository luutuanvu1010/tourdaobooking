# ADR-0142 — Bán hàng phụ trách đơn: ô riêng, lời mời có 15 phút ưu tiên (giờ hành chính 07–17), ai xác nhận người đó phụ trách

- **Trạng thái:** **accepted** 2026-10-27 — chủ dự án trong chat, nguyên văn: «Duyệt Phần 1 theo mọi khuyến nghị của người soạn, kể cả Q1: Quản trị và Toàn quyền nhận thay được bất cứ lúc nào, kể cả trong 15 phút của X.» Sau khi người kiểm độc lập soát bản chép (27/10, «đạt có điều kiện»), chủ trả lời thêm hai câu (hộp chọn, cùng ngày):
  - «Chưa cho huỷ» — Bán hàng phụ trách chưa được huỷ đơn đã xác nhận;
  - «Chỉ hiện tên» — Đối tác, Thực tập thấy tên Bán hàng phụ trách trên đơn của chính mình.
- **Ngày:** 2026-10-27.
- **Loại:** việc lớn (dữ liệu + quyền). **Cửa:** một chiều phần dữ liệu (bảng mới, chỉ thêm; cột mới trên `orders`); phần quyền hai chiều.
- **Nguồn:** thiết kế `docs/superpowers/specs/2026-10-27-ban-hang-phu-trach-don-design.md`. Mục A là phần chủ duyệt; mục B là luật chi tiết L1–L11, trang ghép B.9 và tiêu chí B.10. Khi ADR này và bản thiết kế lệch nhau, **ADR thắng**. Chỗ đã biết: B.9 ghi «`isOrderHandler` / `ctx.assigned` mở rộng» là sai, theo QĐ1 thì không nới; L6 có `order.modify` trong danh sách trắng nhưng QĐ1 đã bỏ theo lời chủ «Chưa cho huỷ».
- **Số:** 0142. Lúc cấp số (27/10), 0141 là số lớn nhất ở mọi nhánh và worktree; 0140 vẫn để trống theo dòng giữ chỗ ở `README.md`.
- **Sửa / bổ sung:**
  - **ADR-0136:**
    - Đ4, Đ5, Đ6, Đ7, Đ8 (phần Kế toán), Đ9, Đ10, Đ13.4;
    - câu (c) và câu «mọi vai nội bộ xác nhận được» ở phần Bối cảnh;
    - lý do của phương án bị bác «dùng `order.modify`»;
    - tiêu chí nghiệm thu 8 (Kế toán sửa giá đơn đang chờ rồi Còn vé): không còn làm được.
  - **Đảo lại** phần ADR-0136 đã thay của ADR-0023 đ1 và ADR-0030 S23-1, S23-4: HDV hết đọc đơn đang chờ xác nhận.
  - **Bổ sung:** ADR-0020 đ1, đ3; ADR-0030 S20-4; ADR-0022 điều 3 (người nhận tin có thêm Bán hàng phụ trách); ADR-0034 đ1 (hành động mới trong hộp thư).
  - **Giữ nguyên:**
    - ADR-0019 điều 2: danh sách người phụ trách (`GET /api/dispatch/handlers`) vẫn 403 với Đối tác, Thực tập;
    - ADR-0020 đ2;
    - ADR-0032: Bán hàng từ chối lời mời không có hạn mức;
    - ADR-0131 đ3: tin gửi Đối tác, Thực tập không kèm tên người làm;
    - ADR-0135 Đ5;
    - ADR-0136 Đ13, trừ phần đã nêu ở trên.
  - **Phụ thuộc:** định nghĩa lại view `v_aud_order_event` dựa vào dòng làm rõ ADR-0136 Đ10 / ADR-0034 đ5 («không sửa view đang có» hiểu là không sửa tệp migration cũ, view mới bằng migration mới). Dòng này do phiên «sửa hộp thông báo thiếu tin chờ xác nhận» trình chủ cùng ngày. Chưa được duyệt thì Đ7 chưa thi công.
- **Xây trên lỗ đang hở:** không. Không mục nào của `docs/quyen-hoan.json` (27/10) nằm ở vùng này. Riêng TNV-G1 (đơn huỷ còn tiền):
  - Bán hàng phụ trách **không** có quyền huỷ (QĐ1, lời chủ «Chưa cho huỷ»), nên Phần 1 không thêm người huỷ mới;
  - Hết vé chỉ áp đơn có yêu cầu xác nhận mở, mà yêu cầu không mở được khi đơn đã có khoản thu.

  Mở quyền huỷ cho Bán hàng phụ trách phải chờ TNV-G1 đóng, bằng ADR mới.
- **Hiến chương áp:** 2.2, 5.1, 5.2, 5.3, 5.5, 5.8, 5.10, 5.16, 5.20, K9. Không lệch có chủ ý.

## Bối cảnh
Chủ dự án 27/10 mô tả luồng đơn theo vai:
- mỗi đơn có một Bán hàng chịu trách nhiệm;
- người lập mời được một Bán hàng;
- đơn có dịch vụ cần kiểm thì Bán hàng xác nhận, ai xác nhận người đó phụ trách;
- quá 15 phút (trong 7h–17h) mà chưa ai phụ trách thì cảnh báo ở Trang chủ;
- đổi trạng thái thì báo Bán hàng phụ trách và người lập.

Hôm nay mỗi đơn chỉ có **một** ô người phụ trách (`dsp_assignment` `HANDLE`), dùng chung cho HDV, Bán hàng và Quản trị. Người xác nhận theo ADR-0136 không thành người phụ trách.

Đây là Phần 1 của ba phần. Phần 2 (ô HDV nhận / từ chối, «Chờ HDV nhận đơn») và Phần 3 (Điều phối xe, tài xế nhận / huỷ) có ADR riêng.

## Quyết định
1. **QĐ1 — Ô «Bán hàng phụ trách» riêng.**
   - Mỗi đơn có thêm một ô Bán hàng phụ trách, tách khỏi ô người phụ trách (`HANDLE`) hôm nay.
   - Một dòng mở mỗi đơn, chặn ở cả cơ sở dữ liệu lẫn mã. Đổi người = đóng dòng cũ + mở dòng mới cùng lô; không xoá.
   - Ô `HANDLE` giữ nguyên hành vi ở Phần 1: HDV vẫn nhận đơn như cũ.
   - **Danh sách trắng:** người giữ ô được coi là «được giao» **chỉ** ở `order.history.view`, `order.trip.edit`, `order.passenger.write`, `dispatch.assign` (với Bán hàng) và `trip.call_ack`.
     - Danh sách **không có** `order.modify`. Ô này trên đơn đã xác nhận chính là quyền huỷ (`POST /api/orders/:id/status`), và chủ đã chọn «Chưa cho huỷ».
     - Làm bằng cờ tiêm riêng từ gốc lắp ráp, **không** nới `isOrderHandler`. Không áp cho đơn nháp.
     - Không mở bất kỳ ô tiền nào (`order.money.edit`, `order.handover`, `payment.receive`), cũng không mở `order.cancel`, `dispatch.refuse`.
   - Bán hàng không tự trả lại ô. Quản trị và Toàn quyền đổi hoặc bỏ trống được, nhưng chỉ trên đơn đã xác nhận; đơn nháp nhận 409.
   - Đổi người thì lời mời đang mở khép với kết quả «người khác nhận».
   - Đơn đã Đã giao thì khoá đổi người, như `HANDLE`.
2. **QĐ2 — Quyền.**
   - (a) `order.confirm.review` còn Bán hàng, Quản trị, Toàn quyền; Kế toán và HDV thành `none`.
     - Hệ quả: Kế toán và HDV không còn đọc được đơn đang chờ xác nhận.
     - ADR-0136 Đ6 bỏ «kể cả HDV chưa phụ trách».
   - (b) Mọi người giữ `order.create` mời được một Bán hàng lúc lập, kể cả Thực tập và Đối tác.
     - Danh sách để mời gồm tài khoản đang hoạt động, có hồ sơ, giữ quyền Bán hàng, không giữ quyền Đối tác.
     - Máy chủ trả **mã tài khoản + tên** (mã để chọn); màn hình chỉ hiện tên.
   - (c) Người giữ ô là Bán hàng (không giữ quyền Đối tác), hoặc Quản trị / Toàn quyền khi chính họ bấm Nhận phụ trách hay Còn vé.
   - (d) **Quản trị và Toàn quyền nhận thay hoặc quyết định thay bất cứ lúc nào**, kể cả trong thời gian ưu tiên của người được mời và ngoài 07:00–17:00.
     - Người được mời được báo.
     - Tài khoản giữ quyền Đối tác không hưởng ngoại lệ này.
   - (e) Đối tác, Thực tập thấy **tên** Bán hàng phụ trách (không SĐT) trên đơn của chính mình (lời chủ «Chỉ hiện tên»). Họ vẫn không thấy tên HDV / người phụ trách (ADR-0019 điều 2).
   - Ô quyền mới (tên đặt lúc thi công):
     - nhận ô Bán hàng: Bán hàng, Quản trị, Toàn quyền;
     - đổi ô Bán hàng: Quản trị, Toàn quyền;
     - xem danh sách Bán hàng để mời: theo `order.create`.
3. **QĐ3 — Lời mời là bản ghi có hạn.**
   - **Dòng lời mời:**
     - Mỗi lời mời là một dòng chỉ thêm, ghi ai mời ai, lúc ghi nhận và hạn ưu tiên.
     - Dòng khép đúng một lần với một trong năm kết quả: Nhận / Từ chối / người khác nhận / đơn huỷ / Rút lại.
     - «Hết hạn» không phải kết quả ghi xuống: đó là trạng thái tính theo giờ lúc đọc.
     - Mỗi đơn có tối đa một lời mời mở.
   - **Ý định mời trên đơn nháp** nằm ở một cột mới của `orders`, do `orders` ghi. Dòng lời mời chỉ có từ **lúc ghi nhận**:
     - đơn không cần kiểm: lúc xác nhận, kể cả nhánh B của Gửi đơn;
     - đơn cần kiểm: lúc mở yêu cầu xác nhận.

     Đến lúc ghi nhận, máy chủ kiểm lại người được mời. Người đó không còn hợp lệ thì không mời, đơn chờ Bán hàng nhận và người lập được báo.
   - **Tự mời chính mình:**
     - người lập là Bán hàng tự mời mình, đơn không cần kiểm: thành Bán hàng phụ trách ngay lúc ghi nhận;
     - đơn cần kiểm: người đó tự quyết theo công tắc tự xác nhận như hôm nay.
   - **Thời gian ưu tiên:** trong **15 phút giờ hành chính**, chỉ người được mời (X) nhận được, trừ Quản trị / Toàn quyền theo QĐ2(d).
     - Với đơn cần kiểm, X bấm Nhận nghĩa là Còn vé, đồng thời mở ô cho X, **trong cùng một lô**.
     - Người lập đã mời X cũng phải chờ hết 15 phút mới tự quyết được.
   - **Sau thời gian ưu tiên:** X từ chối hoặc hết hạn thì đơn sang «Chờ Bán hàng nhận». Bán hàng từ chối không giới hạn số lần.
   - **Rút lại** (đơn cần kiểm) khép lời mời; gửi lại là một lời mời mới, với 15 phút mới.
4. **Đ4 — Ai xác nhận người đó phụ trách.**
   - Còn vé (ADR-0136 Đ7) thêm câu mở ô Bán hàng phụ trách cho người bấm, cùng lô với xác nhận.
   - Câu mở là lệnh chèn thường: ô đã có người thì cả lô hỏng, đơn vẫn chờ. Vì vậy Đổi bị chặn trên đơn nháp (QĐ1).
   - Đơn chỉ cần kiểm vì có chặng dưới mốc thì vẫn theo luật Đặt gấp hiện có.
5. **Đ5 — Đồng hồ giờ hành chính.**
   - Một hàm thuần cộng phút, chỉ tính các phút trong 07:00–17:00 giờ Việt Nam, mọi ngày. Hàm này thay luật «bỏ 22:00–06:00» của ADR-0136 Đ9.
   - Dùng cho ba chỗ: hạn ưu tiên của lời mời, hạn của yêu cầu xác nhận, và mốc hiện thẻ cảnh báo. Số «còn N phút» hiện cho người dùng cũng tính bằng phút giờ hành chính.
   - Ba con số 15, 07:00, 17:00 nằm ở một dòng chính sách chỉ thêm. Chỉ người giữ `settings.ops` thêm được dòng mới, qua API, chưa có giao diện.
   - **Mốc phát hành** = lúc có dòng chính sách đầu tiên. Thêm dòng mới không làm đổi mốc này.
6. **Đ6 — Thẻ cảnh báo «Đơn chưa có Bán hàng phụ trách»** (hiển thị).
   - **Đơn vào thẻ khi đủ cả sáu điều kiện:**
     - đã ghi nhận từ mốc phát hành;
     - chưa huỷ;
     - chưa qua ngày đi;
     - chưa Đã giao, chưa Hoàn thành;
     - chưa có Bán hàng phụ trách;
     - đã qua 15 phút giờ hành chính.
   - **Ai thấy:**
     - Bán hàng, Quản trị, Toàn quyền thấy mọi đơn;
     - Kế toán thấy đơn đã xác nhận, còn đơn chờ xác nhận chỉ là con số;
     - người lập thấy đơn của mình.
   - Không báo đẩy.
   - Thẻ «Đơn chưa có người phụ trách» cũ (ô `HANDLE`) đổi nhãn thành «Đơn chưa có HDV nhận», để không trùng tên.
7. **Đ7 — Thông báo** (hiển thị; gửi sau lô ghi). Bảng sự kiện đầy đủ ở thiết kế L9:
   - lời mời → X;
   - có Bán hàng phụ trách → người lập;
   - X từ chối → người lập;
   - đơn vào «Chờ Bán hàng nhận» → Bảng tin của Bán hàng / Quản trị / Toàn quyền, không báo đẩy;
   - HDV nhận / được giao, đơn huỷ → thêm Bán hàng phụ trách vào người nhận hiện có;
   - **Hoàn thành → Bán hàng phụ trách và người lập** (hôm nay Hoàn thành chưa báo ai);
   - Đổi Bán hàng → người mới, người cũ, người lập;
   - gửi yêu cầu xác nhận khi có X → chỉ X trong thời gian ưu tiên.

   Tin gửi Đối tác, Thực tập không kèm tên người làm (ADR-0131 đ3). Hành động mới vào hộp thư bằng migration mới định nghĩa lại `v_aud_order_event`, theo phụ thuộc ở phần đầu.
8. **Đ8 — Đơn cũ.**
   - Đơn ghi nhận trước mốc phát hành thì không được tự ghi bù, không có chip / nút Nhận, không vào thẻ. Quản trị / Toàn quyền vẫn gán được bằng Đổi.
   - Yêu cầu xác nhận mở trước mốc mà được bấm Còn vé sau mốc thì người bấm thành Bán hàng phụ trách.
9. **Đ9 — Giữ nguyên ở Phần 1, ghi nợ cho Phần 2:**
   - ảnh «XÁC NHẬN ĐƠN DỊCH VỤ» gửi khách vẫn in người phụ trách từ ô `HANDLE`;
   - khối người phụ trách ở form lập đơn đổi tên «Hướng dẫn viên» và chỉ liệt kê người có quyền HDV (chỉ đổi giao diện).

## Phương án bị bác
- **Dùng chung ô `HANDLE`:** Bán hàng chiếm ô trong 15 phút, HDV hết đơn để nhận cho tới khi xong Phần 2.
- **Thêm loại mới vào `dsp_assignment`:** mọi câu đọc bảng và view `v_dsp_*` phải lọc theo loại; sót một câu là Bán hàng phụ trách hưởng quyền của người phụ trách (kiểu lỗ F-01).
- **Nới `isOrderHandler`:** tài khoản lai Bán hàng + HDV đang là Bán hàng phụ trách sẽ hưởng các ô tiền phạm vi `assigned` ở `billing` và `receipt`.
- **Cho Bán hàng phụ trách huỷ đơn ngay ở Phần 1:** thêm người huỷ mới trong khi TNV-G1 còn mở (chủ chọn «Chưa cho huỷ»).
- **Chọn sẵn = gán luôn, X trả lại được:** đơn có thể đứng tên một người không biết mình được giao, và thẻ cảnh báo không bắt được.
- **Giữ «chỉ X» tuyệt đối trong 15 phút:** đơn gấp gửi ngoài giờ sẽ trễ tới sáng hôm sau (chủ chọn ngoại lệ Q1).

## Tiêu chí nghiệm thu
Theo thiết kế mục B.10 (14 ca), trừ phần nói Bán hàng phụ trách «sửa được đơn (`order.modify`)» ở ca 8, vì QĐ1 thay nội dung đó. Cộng thêm:
- Quản trị bấm Nhận phụ trách trong 15 phút của X ⇒ thành công. Lời mời của X khép với kết quả «người khác nhận»; X có tin trên Bảng tin.
- Bán hàng khác bấm trong 15 phút của X ⇒ 409.
- Bán hàng phụ trách (không phải người lập, không giữ `HANDLE`) gọi `POST /api/orders/:id/status` huỷ ⇒ 403.
- Đối tác mở đơn của mình ⇒ thấy tên Bán hàng phụ trách; gọi `GET /api/dispatch/handlers` ⇒ vẫn 403.

## Hệ quả
- **Migration mới:**
  - hai bảng của `dispatch` (ô Bán hàng, lời mời), có trigger chỉ thêm và một dòng mở;
  - một bảng chính sách giờ hành chính;
  - view `v_dsp_sales_owner`, view lời mời mở, view chính sách hiện hành;
  - cột `orders.sales_invitee_party_id`, kèm dựng lại trigger khoá Đã giao `orders_delivered_lock` (bài NT-R6);
  - view hộp thư định nghĩa lại.

  Số migration cấp lúc thi công, sau khi kiểm mọi nhánh; 0120 đã được nhánh sửa hộp thư lấy.
- **`src/shared/permissions.ts`:** hàng `order.confirm.review`, ba ô mới, `TEN_THAO_TAC`, các bài ghim hàng, `tests/e2e/permissions.mjs`.
- **Gốc lắp ráp:** cờ «là Bán hàng phụ trách» tiêm riêng; câu mở ô tiêm vào lô Còn vé của `orders`.
- **Giao diện:**
  - form lập đơn: khối mời Bán hàng, và khối cũ đổi tên;
  - trang đơn và thẻ đơn: dòng Bán hàng, các nút Nhận / Từ chối / Nhận phụ trách / Đổi;
  - Trang chủ: thẻ cảnh báo, và thẻ cũ đổi nhãn.

  Phải có ảnh thật hai khổ để chủ duyệt trước khi gộp.
- **Tài liệu:** Trợ giúp theo vai (Bán hàng, Đối tác, Kế toán, HDV), `docs/SYSTEM-DESIGN.md` §6, §7, §15, `docs/data-dictionary.json`.
- **Nợ ghi nhận:**
  - nhãn «Chờ xác nhận» của đơn nháp trùng chữ với dải chờ xác nhận;
  - ảnh gửi khách (Đ9);
  - quyền huỷ của Bán hàng phụ trách, mở sau khi TNV-G1 đóng.
