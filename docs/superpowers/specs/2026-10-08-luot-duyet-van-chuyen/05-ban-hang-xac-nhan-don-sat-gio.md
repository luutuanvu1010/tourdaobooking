# ADR-0107 (số tạm, chốt khi gộp) — Bán hàng tự đóng dấu đặt gấp cho đơn sát giờ (câu Q-3 cũ)

> **Trạng thái:** **proposed**, vai soạn, 2026-10-08. Chủ chưa duyệt (Hiến pháp N3). **Thuộc lượt 8b**; tách khỏi tệp 02 theo quyết định của người điều phối để lượt 8a đúng ba quyết định. Thay **phần đặt gấp** của đề xuất ADR-0091 (chưa duyệt). Mốc đo mã: `claude/van-chuyen-goi-a-c` @ `809918d5`.
> **Lời chủ 2026-10-02** (câu 5, lượt 3): *"cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"*.

## Cho chủ dự án

Hôm nay, đơn có chặng đón cách giờ hiện tại dưới 6 giờ chỉ xác nhận được khi Quản trị bấm "Đặt gấp"; vắng Quản trị thì đơn kẹt. Văn bản này cho Bán hàng tự bấm, cùng danh sách lý do và cùng nhãn "Điều chỉnh khẩn cấp" như phần xếp xe sát giờ, đúng điều bạn đã cho phép ngày 2/10. Đồng thời nó siết cả Quản trị: chỉ bấm được khi chặng thật sự đang dưới mốc vào lúc bấm. Lý do là hôm nay dấu "Đặt gấp" đóng được từ nhiều ngày trước, rồi dấu đó cho bỏ qua mốc khi xếp xe, nên vô tình thành đường né mốc.

**Q-3.** Bán hàng có được tự đóng dấu đặt gấp cho đơn sát giờ không?
- (a) **Có, cùng danh sách lý do và cùng nhãn; chỉ khi chặng đang dưới mốc lúc bấm, áp cho cả Quản trị (khuyến nghị).**
- (b) Không, giữ Quản trị duyệt như hôm nay.

**Câu duyệt gợi ý:** "Duyệt ADR-0107: Bán hàng tự đóng dấu đặt gấp kèm lý do; dấu chỉ đóng được khi chặng đang dưới mốc lúc bấm, áp cho mọi người kể cả Quản trị; nhãn 'Điều chỉnh khẩn cấp'; Q-3 a."

---

## Phần kỹ thuật
- **Ô:** `order.leg.short_notice` SALES `none` → `any` (`src/shared/permissions.ts:83`). Áp cho mọi chặng của mọi đơn, kể cả đơn Bán hàng khác lập và đơn đối tác, như Quản trị hôm nay.
- **Siết route** `POST /api/orders/:id/legs/:legId/short-notice` (`src/modules/orders/index.ts:930-958`, hôm nay chỉ hỏi ô): thêm điều kiện "chặng đang dưới mốc lúc gửi" cho **mọi** người. Lý do: dấu đặt gấp miễn mốc lúc xếp cho `XEP`, `DOI_DEN` (`src/shared/moc-toi-thieu.ts:67, :104`); đóng dấu trước vài ngày được thì bỏ qua mốc hoàn toàn (ADR-0091 đ2).
- **Lý do:** giữ `LY_DO_DAT_GAP` (`src/shared/chang-dua-don.ts:32-37`).
- **Nhãn:** "Đặt gấp — Quản trị đã duyệt" (`src/shared/dat-gap-hien-thi.ts:28`) đổi thành "Điều chỉnh khẩn cấp"; người chỉ thấy cờ (Đối tác, HDV, Thực tập) thấy "Điều chỉnh khẩn cấp (văn phòng)".
- **Giao diện:**
  - ẩn/hiện — nút đặt gấp hiện cho Bán hàng: `web/order-form.ts:599`, `web/order.ts:257, :930, :1065`;
  - chỉ đổi chữ — `web/dat-gap-ui.ts:101`, `src/shared/dat-gap-hien-thi.ts:59`, `src/shared/order-errors.ts:90`, `src/shared/huong-dan-ban-hang.ts:152-155`, `src/shared/huong-dan-doi-tac.ts:92`, `src/shared/tro-ly-cau-truc-ten.ts:75`.
- **Câu ADR bị thay:** ADR-0049 `:161` (dòng **Đặt**): "**chỉ Quản trị, Toàn quyền** (ô mới `order.leg.short_notice`), kèm lý do" → "Bán hàng, Quản trị, Toàn quyền, kèm lý do, **chỉ khi chặng đang dưới mốc lúc gửi** (ADR-0107)".
- **Ghép với ADR-0104 Đ1:** sau Q-3 a, Bán hàng vừa đóng được dấu đặt gấp vừa xếp được khách sát giờ bằng Điều chỉnh khẩn cấp; hai đường cùng đòi lý do, cùng nhãn, nên không mở thêm quyền ngoài phạm vi chủ đã cho.
- **Cửa:** hai chiều (ô, điều kiện route, chữ); không migration.
- **Bài kiểm:**
  - Bán hàng đặt gấp chặng dưới mốc → 200;
  - chặng còn trên mốc → 409 cho cả Quản trị;
  - Kế toán → 403;
  - bài ghim ô (`src/shared/permissions.test.ts`).
- **Sổ dừng dây chuyền:** không mục HIGH nào thuộc vùng chặng đưa đón.
- **Chưa kiểm:** số lần Quản trị đã đóng dấu đặt gấp trước nhiều ngày trên production (đường né mốc có đang được dùng hay không).
