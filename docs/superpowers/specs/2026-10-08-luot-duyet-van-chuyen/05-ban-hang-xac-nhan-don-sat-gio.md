# ADR-0107 (số tạm, chốt khi gộp) — Bán hàng tự đóng dấu đặt gấp cho đơn sát giờ (câu Q-3 cũ)

> **Trạng thái:** **proposed**, vai soạn, 2026-10-08. Chủ chưa duyệt (Hiến pháp N3). **Thuộc lượt 8b**; tách khỏi tệp 02 theo quyết định của người điều phối để lượt 8a đúng ba quyết định. Thay **phần đặt gấp** của đề xuất ADR-0091 (chưa duyệt). Mốc đo mã: `claude/van-chuyen-goi-a-c` @ `809918d5`.
> **Phụ thuộc lượt 8a, chỉ ở nhãn:** đặt gấp **giữ danh sách lý do đặt gấp hiện có** (`LY_DO_DAT_GAP`, bốn lý do cố định trong mã, `src/shared/chang-dua-don.ts:32-37`), **khác** nhóm `PHA_LE` của `vc_reason` mà ADR-0104 dùng. Dấu mang nhãn "Điều chỉnh khẩn cấp" nếu ADR-0104 được duyệt, không thì giữ "Đặt gấp". Phần còn lại của tệp này áp dụng dù ADR-0104 có qua hay không.
> **Lời chủ 2026-10-02** (câu 5, lượt 3): *"cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"*.

## Cho chủ dự án

Hôm nay, đơn có chặng đón cách giờ hiện tại dưới 6 giờ chỉ xác nhận được khi Quản trị bấm "Đặt gấp"; vắng Quản trị thì đơn kẹt. Văn bản này có hai ý. Ý thứ nhất cho Bán hàng tự bấm "Đặt gấp", vẫn chọn một trong bốn lý do đặt gấp đang có như hôm nay, đúng điều bạn đã cho phép ngày 2/10. Theo đó, Bán hàng cũng được sửa giờ, nơi đón, hoặc thêm chặng cho đơn đã xác nhận sát giờ (đơn mình lập hoặc mình phụ trách), kèm một lý do đặt gấp. Ý thứ hai siết mọi người, kể cả Quản trị: ở mọi chỗ đóng được dấu, dấu chỉ đóng được khi chặng thật sự đang dưới mốc vào lúc bấm. Lý do là hôm nay dấu "Đặt gấp" đóng được từ nhiều ngày trước, rồi dấu đó cho bỏ qua mốc khi xếp xe, nên vô tình thành đường né mốc. Khi sửa giờ, máy xét giờ sớm hơn giữa giờ cũ và giờ mới, nên dời một chặng đang sát giờ ra xa vẫn kèm lý do đặt gấp như hôm nay. Dấu sẽ mang nhãn "Điều chỉnh khẩn cấp" nếu bạn duyệt tệp 02 ở lượt 8a, không thì vẫn là "Đặt gấp".

**Q-3.** Hai ý: (i) Bán hàng tự đóng dấu đặt gấp cho đơn sát giờ; (ii) siết mọi người, kể cả Quản trị, chỉ đóng được dấu khi chặng đang dưới mốc lúc bấm.
- (a) **Duyệt cả hai (khuyến nghị).** Đơn sát giờ không còn kẹt khi vắng Quản trị, và không ai né được mốc.
- (b) Chỉ duyệt (ii): siết mọi người nhưng không mở cho Bán hàng; đơn sát giờ vẫn cần Quản trị.
- (c) Không duyệt ý nào, giữ như hôm nay.

Không có phương án chỉ duyệt (i), vì mở cho Bán hàng mà không siết thì Bán hàng cũng có thêm đường né mốc như Quản trị hôm nay.

**Câu duyệt gợi ý:** "Duyệt ADR-0107: (i) Bán hàng tự đóng dấu đặt gấp, chọn một trong bốn lý do đặt gấp hiện có, kể cả khi sửa giờ, nơi đón hoặc thêm chặng cho đơn đã xác nhận sát giờ (đơn mình lập hoặc mình phụ trách); (ii) ở mọi chỗ đóng dấu, dấu chỉ đóng được khi chặng đang dưới mốc lúc bấm (khi sửa giờ thì xét giờ sớm hơn giữa cũ và mới), áp cho mọi người kể cả Quản trị; nhãn 'Điều chỉnh khẩn cấp' nếu ADR-0104 được duyệt, không thì giữ 'Đặt gấp'; Q-3 a."

---

## Phần kỹ thuật
- **Ô:** `order.leg.short_notice` SALES `none` → `any` (`src/shared/permissions.ts:83`). Ở nút Đặt gấp: mọi chặng của mọi đơn, kể cả đơn Bán hàng khác lập và đơn đối tác, như Quản trị hôm nay. Ở bốn lệnh sửa / thêm chặng: route còn hỏi `order.trip.edit` trước (`src/shared/permissions.ts:80`, SALES `ownOrAssigned`), nên Bán hàng chỉ sửa đơn mình lập hoặc mình phụ trách.
- **Năm cửa đóng dấu (ô `order.leg.short_notice` canh hai chỗ):**
  - route nút Đặt gấp `POST /api/orders/:id/legs/:legId/short-notice` (`src/modules/orders/index.ts:930-958`, hôm nay chỉ hỏi ô);
  - nhánh `datGap` của `xetDatGapSua` (`:94-103`): hỏi ô (`:99`) xong là ghi dấu mới ngay khi thân có khoá `datGap`, **không** xét mốc; cờ `duoiMoc` chỉ dùng khi thân **vắng** `datGap` (`:98`). Hàm này được gọi ở ba lệnh: sửa chặng `PUT …/legs/:legId` (qua `lenhSuaChang`, `:161`), `PUT …/trip` (`:850`), `POST …/legs` (`:881`). Nhánh `claude/van-chuyen-goi-a-c` (`e0b87fa2`) có thêm cửa thứ tư `POST …/legs/:legId/replace` (`src/modules/orders/index.ts:935, :951` ở nhánh đó).
  - Giao diện gửi `datGap` từ `web/trip-sheet.ts:134` và `web/sheet-dua-don.ts:93, :96`, chỉ sau khi máy chủ trả 409 `short_notice_required` (`web/trip-sheet.ts:150`, `web/sheet-dua-don.ts:119`), và chuỗi lệnh của bảng đưa đón chỉ gắn `datGap` cho đúng lệnh được gửi lại (`web/sheet-dua-don.ts:110`), nên điều kiện mới không đổi luồng giao diện.
- **Siết (Hướng A, người điều phối chốt):** điều kiện "chặng đang dưới mốc lúc gửi" đặt vào **chính** `xetDatGapSua`: thân có `datGap` mà `duoiMoc` sai → 409 (mã mới, đề xuất `short_notice_not_needed`, câu "Chặng chưa dưới mốc tối thiểu, không cần đặt gấp."). Route nút Đặt gấp đi qua **cùng** hàm, với `duoiMoc` tính trên giờ hiện tại của chặng. Một chỗ canh cả năm cửa, cho **mọi** người, mỗi cửa một bài kiểm.
  - `duoiMoc` của lệnh sửa lấy từ `duoiMocKhiSua` (`src/modules/orders/dat-gap.ts:58, :61-65`): xét **giờ sớm hơn** của cũ và mới (`xet(cu) || xet(moi)`). Vì vậy dời một chặng đang sát giờ ra xa vẫn đóng dấu được, và đó là đúng, vì bản thân việc dời đã là sửa dưới mốc.
  - Ở `:161` bỏ phần ép `!plan.value.chiOPhu &&`: hôm nay vô hại vì nhánh có `datGap` không đọc cờ, còn lệnh chỉ đổi ô phụ mà vắng `datGap` thì không gọi hàm (`:156`); khi cờ thành điều kiện thì phải tính trên giờ thật của chặng.
  - Lý do siết: dấu đặt gấp miễn mốc lúc xếp cho `XEP`, `DOI_DEN` (`src/shared/moc-toi-thieu.ts:67, :104`); đóng dấu trước vài ngày được thì bỏ qua mốc hoàn toàn (ADR-0091 đ2).
- **Lý do:** giữ `LY_DO_DAT_GAP` (`src/shared/chang-dua-don.ts:32-37`).
- **Nhãn:** nếu ADR-0104 được duyệt, "Đặt gấp — Quản trị đã duyệt" (`src/shared/dat-gap-hien-thi.ts:28`) đổi thành "Điều chỉnh khẩn cấp", người chỉ thấy cờ (Đối tác, HDV, Thực tập) thấy "Điều chỉnh khẩn cấp (văn phòng)"; không thì đổi thành "Đặt gấp" (bỏ chữ "Quản trị đã duyệt", vì Bán hàng cũng bấm được).
- **Giao diện:**
  - ẩn/hiện — nút đặt gấp hiện cho Bán hàng: `web/order-form.ts:599`, `web/order.ts:257, :930, :1065`;
  - chỉ đổi chữ — câu báo lỗi `src/modules/orders/index.ts:83` ("Chỉ Quản trị hoặc Toàn quyền được đặt gấp…" → "Bạn không có quyền đặt gấp chặng đưa đón.") và `:88` ("… chỉ Quản trị hoặc Toàn quyền sửa được, kèm lý do đặt gấp." → "… cần kèm lý do đặt gấp."), `web/dat-gap-ui.ts:101`, `src/shared/dat-gap-hien-thi.ts:59`, `src/shared/order-errors.ts:90`, `src/shared/huong-dan-ban-hang.ts:152-155`, `src/shared/huong-dan-doi-tac.ts:92`, `src/shared/tro-ly-cau-truc-ten.ts:75`.
- **Câu ADR bị thay:**
  - ADR-0049 `:161` (dòng **Đặt**): "**chỉ Quản trị, Toàn quyền** (ô mới `order.leg.short_notice`), kèm lý do" → "Bán hàng, Quản trị, Toàn quyền, kèm lý do, **chỉ khi chặng đang dưới mốc lúc gửi** (lệnh sửa: giờ sớm hơn của cũ và mới), ở mọi cửa đóng dấu (ADR-0107)";
  - ADR-0049 `:266` (câu thay cho ADR-0047 A1): "chỉ Quản trị, Toàn quyền sửa, kèm lý do đặt gấp" → "người sửa được chặng (Bán hàng: đơn mình lập hoặc phụ trách) sửa, kèm lý do đặt gấp (ADR-0107)";
  - ADR-0049 `:303`: "chỉ Quản trị, Toàn quyền; mọi đơn" → "Bán hàng, Quản trị, Toàn quyền; mọi đơn (ADR-0107)".
- **Ghép với ADR-0104 Đ1:** sau Q-3 a, Bán hàng vừa đóng được dấu đặt gấp vừa xếp được khách sát giờ bằng Điều chỉnh khẩn cấp. Hai đường đều đòi lý do nhưng **hai danh sách khác nhau** (đặt gấp: `LY_DO_DAT_GAP` cố định trong mã; xếp khẩn cấp: nhóm `PHA_LE` của `vc_reason`, Quản trị sửa được, `src/shared/dieu-phoi-kieu.ts:13-14`); không mở thêm quyền ngoài phạm vi chủ đã cho.
- **Cửa:** hai chiều (ô, điều kiện trong `xetDatGapSua`, chữ); không migration.
- **Bài kiểm:**
  - nút Đặt gấp: Bán hàng, chặng dưới mốc → 200; chặng còn trên mốc → 409 cho cả Quản trị; Kế toán → 403;
  - sửa chặng `PUT …/legs/:legId`: Bán hàng (đơn mình lập) dời giờ vào dưới mốc kèm `datGap` → 200; giờ cũ và mới đều trên mốc kèm `datGap` → 409; dời chặng đang dưới mốc ra xa kèm `datGap` → 200; chỉ đổi ô phụ trên chặng dưới mốc kèm `datGap` → 200, trên mốc → 409;
  - `PUT …/trip`: có chặng dưới mốc kèm `datGap` → 200; không chặng nào dưới mốc kèm `datGap` → 409;
  - `POST …/legs`: thêm chặng dưới mốc kèm `datGap` → 200; trên mốc kèm `datGap` → 409;
  - `POST …/legs/:legId/replace` (nhánh `claude/van-chuyen-goi-a-c`): như sửa chặng;
  - Bán hàng sửa chặng của đơn người khác mà không phụ trách → 403 (ô `order.trip.edit`, không đổi);
  - bài ghim ô (`src/shared/permissions.test.ts`).
- **Sổ dừng dây chuyền:** không mục HIGH nào thuộc vùng chặng đưa đón.
- **Chưa kiểm:** số lần Quản trị đã đóng dấu đặt gấp trước nhiều ngày trên production (đường né mốc có đang được dùng hay không).
