# ADR-0142 — Bán hàng phụ trách đơn: ô riêng, lời mời có 15 phút ưu tiên (giờ hành chính 07–17), ai xác nhận người đó phụ trách

- **Trạng thái:** **accepted** 2026-10-27 — chủ dự án trong chat, nguyên văn: «Duyệt Phần 1 theo mọi khuyến nghị của người soạn, kể cả Q1: Quản trị và Toàn quyền nhận thay được bất cứ lúc nào, kể cả trong 15 phút của X.»
- **Ngày:** 2026-10-27.
- **Loại:** việc lớn (dữ liệu + quyền). **Cửa:** một chiều phần dữ liệu (bảng mới, chỉ thêm); phần quyền hai chiều.
- **Nguồn:** thiết kế `docs/superpowers/specs/2026-10-27-ban-hang-phu-trach-don-design.md` (mục A là phần chủ duyệt; mục B là luật chi tiết L1–L11, trang ghép B.9, tiêu chí B.10). ADR này chỉ chép **quyết định**; chi tiết thi hành theo thiết kế đó.
- **Số:** 0142. Lúc cấp số, 0141 là số lớn nhất ở mọi nhánh và worktree (27/10). 0140 vẫn để trống theo dòng giữ chỗ ở `README.md`.
- **Sửa/bổ sung:** sửa ADR-0136 Đ4, Đ5, Đ6, Đ7, Đ8 (phần Kế toán), Đ9, Đ10, Đ13.4 và câu (c) phần Bối cảnh. Bổ sung ADR-0020 đ1, đ3 và ADR-0030 S20-4. Giữ nguyên ADR-0020 đ2, ADR-0032, ADR-0135 Đ5, ADR-0136 Đ13 (trừ phần ghi trên). Danh sách câu: thiết kế mục B.4.
- **Xây trên lỗ đang hở:** không. Không mục nào của `docs/quyen-hoan.json` (27/10) nằm ở vùng này. Với TNV-G1: Hết vé chỉ áp đơn có yêu cầu xác nhận mở, mà yêu cầu không mở được khi đơn đã có khoản thu.
- **Hiến chương áp:** 2.2, 5.1, 5.2, 5.5, 5.8, 5.10, 5.16, K9. Không lệch có chủ ý.

## Bối cảnh
Chủ dự án 27/10 mô tả luồng đơn theo vai. Mỗi đơn có một Bán hàng chịu trách nhiệm. Người lập mời được một Bán hàng. Đơn có dịch vụ cần kiểm thì Bán hàng xác nhận, và ai xác nhận người đó phụ trách. Quá 15 phút (trong 7h–17h) mà chưa ai phụ trách thì cảnh báo ở Trang chủ. Đổi trạng thái thì báo Bán hàng phụ trách và người lập.

Hôm nay mỗi đơn chỉ có **một** ô người phụ trách (`dsp_assignment` `HANDLE`), dùng chung cho HDV, Bán hàng, Quản trị. Người xác nhận theo ADR-0136 không thành người phụ trách. Đây là Phần 1 của ba phần. Phần 2 (ô HDV nhận / từ chối, «Chờ HDV nhận đơn») và Phần 3 (Điều phối xe, tài xế nhận / huỷ) có ADR riêng.

## Quyết định
1. **QĐ1 — Ô «Bán hàng phụ trách» riêng.**
   - Mỗi đơn có thêm một ô Bán hàng phụ trách, tách khỏi ô người phụ trách (`HANDLE`) hôm nay.
   - Một dòng mở mỗi đơn, chặn ở cả cơ sở dữ liệu lẫn mã. Đổi người = đóng dòng cũ + mở dòng mới cùng lô; không xoá.
   - Ô `HANDLE` giữ nguyên hành vi ở Phần 1, nên HDV vẫn nhận đơn như cũ.
   - Người giữ ô được coi là «được giao» **chỉ** ở danh sách trắng: `order.modify`, `order.history.view`, `order.trip.edit`, `order.passenger.write`, `dispatch.assign` (với Bán hàng), `trip.call_ack`.
     - Làm bằng cờ tiêm riêng từ gốc lắp ráp, **không** nới `isOrderHandler`.
     - Không áp cho đơn nháp.
     - Không mở bất kỳ ô tiền nào: `order.money.edit`, `order.handover`, `payment.receive`, cũng không mở `order.cancel`, `dispatch.refuse`.
   - Bán hàng không tự trả lại ô. Quản trị và Toàn quyền đổi hoặc bỏ trống được.
   - Đơn đã Đã giao thì khoá đổi người, như `HANDLE`.
2. **QĐ2 — Quyền.**
   - (a) `order.confirm.review` còn Bán hàng, Quản trị, Toàn quyền; Kế toán và HDV thành `none`. Hệ quả: Kế toán và HDV không còn đọc được đơn đang chờ xác nhận. ADR-0136 Đ6 bỏ «kể cả HDV chưa phụ trách», và phần ADR-0136 thay ADR-0023 đ1 / ADR-0030 S23-1, S23-4 đảo lại.
   - (b) Mọi người giữ `order.create` mời được một Bán hàng lúc lập, kể cả Thực tập và Đối tác. Danh sách để mời chỉ có **mã + tên** của tài khoản đang hoạt động, có hồ sơ, giữ quyền Bán hàng, không giữ quyền Đối tác.
   - (c) Người giữ ô là Bán hàng (không giữ quyền Đối tác), hoặc Quản trị / Toàn quyền khi chính họ bấm Nhận phụ trách hay Còn vé.
   - (d) **Quản trị và Toàn quyền nhận thay hoặc quyết định thay bất cứ lúc nào**, kể cả trong thời gian ưu tiên của người được mời và ngoài 07:00–17:00. Người được mời được báo.
   - Ô quyền mới (tên đặt lúc thi công):
     - nhận ô Bán hàng: Bán hàng, Quản trị, Toàn quyền;
     - đổi ô Bán hàng: Quản trị, Toàn quyền;
     - xem danh sách tên Bán hàng để mời: theo `order.create`.
3. **QĐ3 — Lời mời là bản ghi có hạn.**
   - Mỗi lời mời là một dòng chỉ thêm: ai mời ai, lúc ghi nhận, hạn ưu tiên. Dòng khép đúng một lần với kết quả Nhận / Từ chối / người khác nhận / đơn huỷ / Rút lại. Mỗi đơn có tối đa một lời mời mở.
   - Lời mời có hiệu lực từ **lúc ghi nhận**: lúc xác nhận với đơn không cần kiểm (kể cả nhánh B của Gửi đơn), lúc mở yêu cầu xác nhận với đơn cần kiểm. Nháp đang soạn không mời ai.
   - Trong **15 phút giờ hành chính**, chỉ người được mời (X) nhận được, trừ Quản trị / Toàn quyền theo QĐ2(d). Với đơn cần kiểm, bấm Nhận = Còn vé + mở ô cho X **trong cùng một lô**.
   - X từ chối hoặc hết hạn thì đơn sang «Chờ Bán hàng nhận». Hết hạn không cần ghi gì; trạng thái tính theo giờ lúc đọc.
   - Người lập đã mời X cũng phải chờ hết 15 phút mới tự quyết được.
   - Rút lại (đơn cần kiểm) khép lời mời; gửi lại là lời mời mới với 15 phút mới.
4. **Đ4 — Ai xác nhận người đó phụ trách.** Còn vé (ADR-0136 Đ7) thêm câu mở ô Bán hàng phụ trách cho người bấm, cùng lô với xác nhận. Đơn chỉ cần kiểm vì chặng dưới mốc vẫn theo luật Đặt gấp hiện có.
5. **Đ5 — Đồng hồ giờ hành chính.**
   - Một hàm thuần cộng phút chỉ tính trong 07:00–17:00 giờ Việt Nam, mọi ngày.
   - Thay luật «bỏ 22:00–06:00» của ADR-0136 Đ9. Dùng cho hạn ưu tiên lời mời, hạn yêu cầu xác nhận và mốc thẻ cảnh báo.
   - Ba con số 15, 07:00, 17:00 nằm ở một dòng chính sách chỉ thêm, chỉ `settings.ops` đổi.
6. **Đ6 — Thẻ cảnh báo «Đơn chưa có Bán hàng phụ trách»** (hiển thị).
   - Đơn vào thẻ khi: đã ghi nhận từ mốc phát hành, chưa huỷ, chưa qua ngày đi, chưa Đã giao / Hoàn thành, chưa có Bán hàng phụ trách, đã qua 15 phút giờ hành chính.
   - Người thấy: Bán hàng, Quản trị, Toàn quyền thấy mọi đơn. Kế toán thấy đơn đã xác nhận, còn đơn chờ xác nhận chỉ là con số. Người lập thấy đơn của mình.
   - Không báo đẩy.
7. **Đ7 — Thông báo** (hiển thị; sau lô ghi). Bảng sự kiện ở thiết kế L9:
   - lời mời → X;
   - có Bán hàng phụ trách → người lập;
   - X từ chối → người lập;
   - đơn vào Chờ Bán hàng nhận → Bảng tin của Bán hàng / Quản trị / Toàn quyền, không báo đẩy;
   - HDV nhận / được giao, huỷ, Hoàn thành → thêm Bán hàng phụ trách;
   - gửi yêu cầu xác nhận khi có X → chỉ X trong hạn ưu tiên.

   Hành động mới vào hộp thư bằng migration mới định nghĩa lại `v_aud_order_event`.
8. **Đ8 — Đơn cũ.**
   - Đơn có lúc ghi nhận trước mốc phát hành không được tự ghi bù, không có chip / nút Nhận, không vào thẻ.
   - Quản trị / Toàn quyền vẫn gán được bằng Đổi.
   - Yêu cầu mở trước mốc mà được bấm Còn vé sau mốc thì người bấm thành người phụ trách.

## Phương án bị bác
- **Dùng chung ô `HANDLE`:** Bán hàng chiếm ô trong 15 phút, HDV hết đơn để nhận cho tới khi xong Phần 2.
- **Thêm loại mới vào `dsp_assignment`:** mọi câu đọc bảng và view `v_dsp_*` phải lọc loại; sót một câu là Bán hàng phụ trách hưởng quyền của người phụ trách (kiểu lỗ F-01). Người thi công chỉ được chọn cách này khi kèm bài kiểm bắt câu thiếu lọc.
- **Nới `isOrderHandler`:** tài khoản lai Bán hàng + HDV đang là Bán hàng phụ trách sẽ hưởng ô tiền `assigned` ở `billing` và `receipt`.
- **Chọn sẵn = gán luôn, X trả lại được:** đơn có thể đứng tên người không biết mình được giao; thẻ cảnh báo không bắt được.
- **Giữ «chỉ X» tuyệt đối trong 15 phút:** đơn gấp gửi ngoài giờ bị trễ tới sáng hôm sau (chủ chọn ngoại lệ Q1).

## Tiêu chí nghiệm thu
Theo thiết kế mục B.10 (14 ca), cộng thêm:
- Quản trị bấm Nhận phụ trách trong 15 phút của X ⇒ thành công. Lời mời của X khép «người khác nhận»; X có tin trên Bảng tin.
- Bán hàng khác bấm trong 15 phút của X ⇒ 409.

## Hệ quả
- Migration mới: hai bảng của `dispatch` (ô Bán hàng, lời mời) có trigger chỉ thêm và một dòng mở; dòng chính sách giờ hành chính; view hộp thư định nghĩa lại. Số migration cấp lúc thi công, sau khi kiểm mọi nhánh.
- `src/shared/permissions.ts`: hàng `order.confirm.review`, ba ô mới, `TEN_THAO_TAC`, bài ghim hàng, `tests/e2e/permissions.mjs`.
- Gốc lắp ráp: cờ «là Bán hàng phụ trách» tiêm riêng; câu mở ô tiêm vào lô Còn vé của `orders`.
- Giao diện:
  - form lập đơn: khối mời Bán hàng; khối người phụ trách cũ đổi tên «Hướng dẫn viên»;
  - trang đơn và thẻ đơn: dòng Bán hàng, nút Nhận / Từ chối / Nhận phụ trách / Đổi;
  - Trang chủ: thẻ cảnh báo.
  - Phải có ảnh thật hai khổ để chủ duyệt trước khi gộp.
- Trợ giúp theo vai (Bán hàng, Đối tác, Kế toán, HDV) và `docs/SYSTEM-DESIGN.md` §6, §7, §15, `docs/data-dictionary.json`.
- Nợ ghi nhận: nhãn «Chờ xác nhận» của đơn nháp trùng chữ với dải chờ xác nhận (không sửa ở đây).
