# ADR-0131 — Nhật ký kiểm toán: chỉ Toàn quyền đọc đủ; người khác thấy lịch sử đơn không có tên người làm

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-18: *"duyêt, thực thi kếh oạch"* (nguyên văn), sau khi chọn hướng *"ok theo khuyến nghị"* (cách "chia hai lớp"). Văn bản đề xuất: `docs/superpowers/specs/2026-10-18-thu-hep-doc-nhat-ky/ADR-0131-nhap.md` (đóng băng); trang ghép `docs/superpowers/specs/2026-10-18-thu-hep-doc-nhat-ky/TRANG-GHEP.md`.
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Trước khi trình, một người đọc thử (chỉ đọc) đã đối chiếu văn bản với mã; người kiểm độc lập đọc sau khi thi công. Số 0131 vì 0130 đang được một bản sửa khác giữ (bảng từ giao diện, chưa nhập).
- **Ngày:** 2026-10-18.
- **Loại:** việc lớn (quyền). **Hai chiều**: chỉ đổi mã, không đổi dữ liệu, không migration; gỡ bằng một commit. Cần người kiểm độc lập.
- **Quan hệ với ADR cũ:**
  - **thay một phần** ADR-0007 đ1, dòng "nhật ký/lịch sử sửa đơn": phần *nhật ký* của Bán hàng, Kế toán, Quản trị nay là lớp không tên (đ2);
  - **thay một phần** ADR-0034 điều 3: "tin kèm tên người làm chỉ khi `can(người xem, order.history.view, phạm vi đơn)`" → nay khi `can(audit.view)` và không giữ quyền Đối tác (đ3); vế "ai thấy tin" giữ nguyên;
  - **thay một phần** ADR-0062: tin đổi kèm tên khi `can(order.history.view)` → nay như trên (đ3);
  - ADR-0115 đ5 (ai nhận tin điều chỉnh công nợ) **không đổi**; tên trong câu của tin này không do ADR nào quy định (chỉ chú thích mã) — nay theo đ3;
  - **mở rộng nghĩa** ô `audit.view` của ADR-0038 đ6: từ "xem trang Nhật ký" thành "đọc nhật ký kiểm toán đầy đủ" (giá trị ô không đổi: chỉ Toàn quyền);
  - **khép** câu bỏ ngỏ của bản vá D-1 (13/10, `src/shared/lich-su-doi-tac.ts`): "có ẩn tên nhân viên với Đối tác hay không là quyết định của chủ" — nay ẩn.
  - **Không đổi:** phạm vi ô `order.history.view` (ADR-0009, ADR-0014, ADR-0023, ADR-0030 S23-3); lịch sử số khách (ADR-0114 D2, không chứa tên); trang Nhật ký (ADR-0038, ADR-0042); danh sách Đối tác của D-1.
- **Xây trên lỗ đang hở:** không có.
- **Hiến chương áp:** K12, 5.8, 5.12.

## Bối cảnh
Chủ dự án 2026-10-18: *"thu hẹp cơ chế đọc Audit Trail (log) chỉ dành cho Toàn quyền, thay vì tất cả đều đọc được"*. Nghiên cứu cùng ngày: trang Nhật ký toàn hệ thống **đã** chỉ Toàn quyền (ADR-0038 đ6). Nội dung nhật ký còn tới người khác qua ba đường:
(1) khối "Lịch sử" ở chi tiết đơn, ô `order.history.view` — Bán hàng đơn của mình hoặc đang phụ trách, Kế toán và Quản trị mọi đơn, Hướng dẫn viên đơn đang phụ trách, Đối tác và Thực tập đơn của mình;
(2) tên người làm trong tin đơn và tin "đơn đổi sau xác nhận" (cùng ô);
(3) tên người làm trong tin điều chỉnh công nợ (không qua ô nào về nhật ký).
Các ADR cũ mở khối Lịch sử vì nghiệp vụ: Kế toán đối chiếu tiền, Hướng dẫn viên xem đơn mình phụ trách đã đổi gì, Bán hàng theo dõi đơn của mình. Chủ chọn cách hai lớp để giữ các nhu cầu đó.

**Nói thẳng hệ quả:** với danh sách ở đ2, nhân viên nội bộ vẫn thấy mọi dòng của đơn như hôm nay. Thay đổi thật với họ chỉ có hai: **không còn tên người làm** (kể cả trong chữ của dòng "tự nhận phụ trách"), và **loại dòng mới thêm sau này mặc định ẩn** cho tới khi được xếp loại. Nhóm "dấu vết thuần kiểm toán" (xuất ảnh, xuất PDF) hôm nay rỗng trên thực tế: không còn chỗ nào trong mã ghi hai dòng này. Với Đối tác: danh sách D-1 giữ nguyên, nay thêm bỏ tên.

## Nguyên tắc
Nhật ký kiểm toán trả lời "**ai** đã làm gì, lúc nào". Lớp người khác thấy chỉ trả lời "**đơn đã đổi gì**, lúc nào" — không bao giờ cho biết ai bấm.

## Quyết định
1. **Hai lớp, không thêm ô mới.** Lớp đầy đủ (mọi dòng nhật ký của đơn, nguyên văn, có tên người làm) chỉ cho người qua ô `audit.view` — hôm nay chỉ Toàn quyền. Người qua `order.history.view` mà không qua `audit.view` nhận **lớp rút gọn**. Phạm vi `order.history.view` không đổi: ai đang thấy khối Lịch sử vẫn thấy khối, chỉ khác nội dung. Tài khoản giữ quyền Đối tác, kể cả lai với Toàn quyền, vẫn theo luật "có quyền Đối tác là áp" (danh sách Đối tác, nay không tên).
2. **Lớp rút gọn = danh sách cho phép, không tên người làm.**
   - a. **Máy chủ không gửi** tên hay mã người làm của bất kỳ dòng nào trong lớp rút gọn (không chỉ giao diện giấu). Trường tên mang một nhãn trung tính cố định để bản giao diện cũ còn lưu trên máy không in "null"; người thi công chọn nhãn và ghi lại.
   - b. Mỗi loại hành động nằm ở đúng một trong hai danh sách: **cho thấy** (kèm cách giữ chữ chi tiết) hoặc **ẩn**. Loại mới chưa xếp thì `npm run typecheck` đỏ (khuôn D-1). Danh sách nội bộ, theo nhóm (mã ở trang ghép mục 4):
     - **Đơn đổi gì** — lập, sửa, chuyến, chặng, khách, xác nhận, huỷ, phân loại lý do huỷ, sửa số khách, ghi lần thu, đã giao, hoàn thành, đổi người phụ trách, nhận đơn, đổi khách: **cho thấy**.
     - **Tiền của đơn trong sổ** — công ty đã nhận, hoàn khách, điều chỉnh sổ và yêu cầu điều chỉnh, đảo sổ, thay lần thu, cọc đơn huỷ, gắn mã ngân hàng, mức hoa hồng của đơn: **cho thấy**, như hôm nay (người không qua ô xem tiền đã không mở được đơn). *AI quyết, ghi lại:* không gác thêm nhóm này bằng ô `ledger.view` — làm vậy Quản trị (ô `ledger.view` phạm vi "của mình") mất các dòng đang thấy, và Bán hàng, Hướng dẫn viên, Thực tập mất lịch sử mức hoa hồng dù ô `order.terms.view` cho họ xem mức đó. Chủ muốn hẹp hơn thì mở lượt riêng.
     - **Dấu vết thuần kiểm toán** — xuất ảnh, xuất PDF: **ẩn** (hôm nay không còn chỗ ghi; xếp ẩn để đóng mặc định).
     - Dòng đánh dấu nhập phần mềm kế toán: giữ luật ô `accounting.entry.view` (ADR-0060), không tên.
   - c. **Chữ chi tiết không nêu người bấm.** Đã rà từng khuôn chữ (trang ghép mục 4): không khuôn nào ghi tên người duyệt, người thu hay người đề nghị. Chỉ dòng **"tự nhận phụ trách đơn"** luôn ghi tên chính người bấm → lớp rút gọn **bỏ chữ** của dòng này (giữ dòng). Tên là *dữ liệu của đơn* được giữ: người phụ trách cũ/mới ở dòng "đổi người phụ trách" (dòng không nói ai bấm, dù đôi khi đoán được), tên hồ sơ bên đặt ở dòng lập / sửa / đổi khách (khi người lập là Đối tác, tên này trùng người lập — vốn đã hiện ở đầu trang đơn). Chữ tự gõ (lý do, nơi đón, tên dịch vụ nhập tay) giữ nguyên; tên người chỉ lọt vào đó nếu chính người gõ viết ra.
3. **Thông báo: tên người làm chỉ cho Toàn quyền.** Tin đơn (lập, xác nhận, huỷ, giao, nhận…), tin "đơn đổi sau xác nhận" và tin điều chỉnh công nợ: câu có tên chỉ khi người nhận qua `audit.view` **và** không giữ quyền Đối tác (cùng luật "có quyền Đối tác là áp" như đ1, để tài khoản lai Toàn quyền + Đối tác không thấy tên ở thông báo trong khi lịch sử đơn của họ không tên — AI quyết, ghi lại); người khác nhận câu không tên (tin đơn và tin đổi đã có khuôn không tên; tin điều chỉnh công nợ chưa có — người thi công viết thêm, thay chữ dự phòng "Có người"). Nội dung đổi (giờ cũ → mới…) giữ như ADR-0062. Thông báo đẩy lên điện thoại không mang chữ (máy nhận hỏi lại máy chủ qua cùng hàm chọn tin), nên đổi một chỗ là đủ. Câu "… giao đơn X cho bạn phụ trách" của bản 2.17 sẽ thành câu không tên với người không phải Toàn quyền.

## Ngoài phạm vi
- Trang Nhật ký: đã chỉ Toàn quyền.
- Người lập đơn, người phụ trách, người thu tiền, người tạo / người duyệt yêu cầu điều chỉnh, **người duyệt đặt gấp** (khối đặt gấp, ô `order.leg.short_notice.view`) và **người duyệt hoàn / chuyển cọc** (khối cọc của trang đơn): dữ liệu của chính đơn hay quy trình duyệt (bảng nghiệp vụ, không đọc từ nhật ký), cần cho việc tách nhiệm vụ. Hệ quả nói thẳng: lịch sử đơn giấu người duyệt ở dòng đặt gấp và dòng duyệt cọc, nhưng cùng trang vẫn hiện người đó ở khối nghiệp vụ.
- **Nhật ký chuyến xe** (bảng riêng của Vận chuyển, hiện tên người bấm cho người điều phối và tài xế): chủ muốn thu hẹp thì mở lượt riêng.
- Tín hiệu "bạn đã tạo / hỗ trợ đăng nhập tài khoản này" ở hàng chờ xác minh (ADR-0125): luật tách nhiệm vụ, chỉ trả kết luận.
- Sổ phiên đăng nhập, lịch sử giấy tờ, lịch sử nhóm dịch vụ, lịch sử hỏi đáp trợ lý: không đọc `audit_log` hoặc đã chỉ Toàn quyền.

## Phương án đã loại
- Thu hẹp hẳn `order.history.view` về Toàn quyền: mất ba nhu cầu nghiệp vụ ở Bối cảnh.
- Chỉ giấu tên, không danh sách cho phép: loại dòng mới tự lộ (bài học D-1).
- Thêm ô mới cho lớp đầy đủ: trùng nghĩa `audit.view`, thêm một dòng bản đồ không cần.

## Tiêu chí nghiệm thu
1. Với Bán hàng, Kế toán, Quản trị, Hướng dẫn viên, Đối tác, Thực tập (đơn trong phạm vi): `GET /api/orders/:id` vẫn có khối lịch sử; gieo một người làm có tên độc nhất (không phải người lập, không phải người phụ trách), cho người đó làm việc mà dữ liệu nghiệp vụ không lưu tên (sửa chuyến, sửa số khách văn phòng — không ghi lần thu, không duyệt cọc, không duyệt đặt gấp) → tên và mã của người đó **không xuất hiện ở đâu** trong phản hồi (trường tên, trường mã, chữ chi tiết).
2. Toàn quyền (không giữ quyền Đối tác) mở cùng đơn: đủ dòng, có tên, nguyên văn như hôm nay.
3. Dòng "tự nhận phụ trách đơn" tới người không qua `audit.view` không có chữ chi tiết; dòng xuất ảnh/PDF (gieo thẳng vào bảng) không tới họ.
4. Thêm một hành động vào `AUDIT_ACTIONS` mà không xếp vào danh sách nội bộ → `npm run typecheck` đỏ; quan sát chặn thật một lần (P16) và ghi dòng ở `docs/SO-HANG-RAO.md`.
5. `GET /api/thong-bao`, `/tom-tat`, `/moi-nhat`: người không qua `audit.view` nhận câu không tên ở ba loại tin, tên gieo không xuất hiện trong phản hồi; Toàn quyền nhận câu có tên.
6. Giao diện bản cũ còn lưu trên máy không in "null"/"undefined" ở khối Lịch sử.
7. Trang Nhật ký không đổi (bài cũ xanh). Chữ hướng dẫn Kế toán, Bán hàng và kho tri thức trợ lý không còn hứa "ai sửa".
