# Luồng việc theo vai — Phần 1: Bán hàng phụ trách đơn (thiết kế, 27/10/2026)

**Trạng thái:** **ĐÃ DUYỆT** — chủ dự án 2026-10-27, nguyên văn: «Duyệt Phần 1 theo mọi khuyến nghị của người soạn, kể cả Q1: Quản trị và Toàn quyền nhận thay được bất cứ lúc nào, kể cả trong 15 phút của X.» Quyết định chép thành `docs/adr/ADR-0142-ban-hang-phu-trach-don.md`. Từ đây là hồ sơ có ngày: không sửa cho khớp hiện trạng; điều mới ghi ở bản mới trỏ về đây. Chưa có mã. Phần 2 (HDV nhận / từ chối khi được giao, «Chờ HDV nhận đơn») và Phần 3 (vai Điều phối xe, tài xế nhận / huỷ chuyến) thiết kế sau, mỗi phần một lượt duyệt riêng.

**Nguồn lời chủ:** cuộc trò chuyện 27/10/2026 (sau khi bản 2.36 lên production). Lời chủ được đánh dấu **[chủ]**; điều người soạn tự quyết đánh dấu **[người soạn]** và gom ở mục A.4 để chủ soát.

---

## A. Trang cho chủ dự án (đọc trang này là đủ để duyệt)

### A.1 Việc này để làm gì
Mỗi đơn phải có **một Bán hàng chịu trách nhiệm**, và không đơn nào bị bỏ quên quá 15 phút trong giờ hành chính. Người lập đơn và Bán hàng phụ trách được báo mỗi khi đơn đổi trạng thái. **[chủ]**

### A.2 Luồng, như chủ đã chốt
1. Ai cũng lập đơn được: nhân viên, Thực tập, Đối tác. Lúc lập, người lập **mời** được một Bán hàng trong danh sách chỉ có Bán hàng, hoặc để trống. **[chủ]**
2. Bán hàng được mời (gọi là X) nhận tin kèm hai nút **Nhận** và **Từ chối**. Trong **15 phút đầu** chỉ X nhận được. X từ chối, hoặc hết 15 phút mà X chưa bấm, thì đơn chuyển sang **chờ Bán hàng nhận**: Bán hàng nào nhận trước thì người đó phụ trách. **[chủ]**
3. Đơn có dịch vụ cần kiểm (hoặc có chặng đón dưới 6 giờ chưa đặt gấp) thì vẫn chờ xác nhận như bản 2.36, nhưng **chỉ Bán hàng, Quản trị, Toàn quyền** xác nhận được, và **ai xác nhận thì người đó phụ trách**. Với đơn này, bấm Nhận cũng là xác nhận. Kế toán và HDV thôi xác nhận. **[chủ]**
4. Đơn không cần kiểm thì được xác nhận ngay khi người lập bấm nút cuối, như hôm nay; đơn chưa có Bán hàng phụ trách thì chờ Bán hàng nhận. **[chủ]**
5. Đồng hồ 15 phút **chỉ chạy trong 7h–17h, mọi ngày** (đơn lập lúc 16h55 thì tới khoảng 7h10 sáng hôm sau mới hết hạn). Đồng hồ này thay cách tính «bỏ 22h–6h» của bản 2.36. **[chủ]**
6. Hết 15 phút mà đơn chưa có Bán hàng phụ trách: Trang chủ của Quản trị, Bán hàng, Toàn quyền, Kế toán và **người lập** hiện thẻ cảnh báo. Thẻ gộp cả đơn chờ xác nhận lẫn đơn chờ Bán hàng nhận. **[chủ]**
7. Bán hàng phụ trách và người lập được báo khi: có người nhận phụ trách, X từ chối, HDV nhận, đơn bị huỷ, đơn hoàn tất. **[chủ; «X từ chối» là người soạn thêm]**

### A.3 Ba quyết định cần bạn duyệt (chạm dữ liệu và quyền)

| # | Quyết định | Được | Mất / rủi ro | Khuyến nghị |
|---|---|---|---|---|
| QĐ1 | **Thêm một ô riêng «Bán hàng phụ trách»** trên mỗi đơn, tách khỏi ô «người phụ trách» hôm nay. Ô hôm nay giữ nguyên (HDV vẫn bấm Nhận như cũ); Phần 2 sẽ biến nó thành ô HDV. Bán hàng phụ trách được: sửa đơn, xem lịch sử, sửa thông tin chuyến, sửa danh sách hành khách, giao HDV, bấm «Đã gọi báo» giờ hẹn. **Không** được việc gì về tiền. | Phần 1 lên production một mình được; hàng chờ nhận của HDV không bị ảnh hưởng. | Từ bản này tới Phần 2, một đơn có hai chỗ ghi tên người. Màn hình phải ghi rõ «Bán hàng:» và «HDV:». | Đồng ý. Nếu dùng chung một ô thì Bán hàng chiếm ô trước, HDV không nhận được đơn nào cho tới khi Phần 2 xong. |
| QĐ2 | **Đổi quyền:** (a) chỉ Bán hàng, Quản trị, Toàn quyền xác nhận đơn cần kiểm; (b) Thực tập và Đối tác được mời Bán hàng lúc lập đơn; danh sách họ thấy chỉ có **tên** Bán hàng, không SĐT; (c) chỉ tài khoản có quyền Bán hàng có tên trong danh sách mời; người giữ ô Bán hàng phụ trách là Bán hàng, hoặc Quản trị / Toàn quyền khi chính họ bấm nhận hay xác nhận; Quản trị, Toàn quyền đổi người được; (d) Quản trị, Toàn quyền nhận thay được cả trong 15 phút của X (câu Q1 ở A.5). | Đúng ý bạn: Bán hàng là người chốt đơn. | Kế toán mất nút «Còn vé / Hết vé» của bản 2.36; Kế toán và HDV không còn mở được đơn đang chờ xác nhận (Kế toán chỉ thấy con số trên thẻ cảnh báo). Khoảng 1.000 tài khoản Đối tác sẽ thấy tên các Bán hàng (hôm nay họ không thấy danh sách nhân viên nào). | Đồng ý, chỉ hiện tên. |
| QĐ3 | **Lời mời là một bản ghi có hạn:** ghi ai mời ai, lúc nào, hết ưu tiên lúc nào (tính theo đồng hồ 7h–17h), kết quả Nhận / Từ chối / Hết hạn. Không xoá; mỗi lần mời là một dòng mới. | Biết chắc ai đã nhận việc; hết hạn tự mở cho người khác mà không cần ai bấm. | Thêm bảng mới (một lần đổi cấu trúc dữ liệu). | Đồng ý. |

Thẻ cảnh báo, danh sách thông báo và chữ hiện trên màn hình là phần **hiển thị**, không đổi quyền hay dữ liệu, nên đi cùng lượt này mà không tính vào ba quyết định.

### A.4 Điều người soạn tự quyết — bạn soát giúp
- Người lập là Bán hàng **tự chọn chính mình** thì thành người phụ trách ngay, không phải tự bấm Nhận.
- Hệ quả của luật «15 phút đầu chỉ X»: Bán hàng lập đơn rồi mời đồng nghiệp X thì chính mình **không** tự xác nhận được trong 15 phút đó.
- Bán hàng từ chối lời mời **không giới hạn số lần** (khác luật hạn mức của HDV).
- Sau khi đã nhận, Bán hàng **không tự trả lại** đơn; muốn đổi người thì Quản trị hoặc Toàn quyền đổi.
- **Đơn cũ** (lập trước bản này) không được ghi thêm Bán hàng phụ trách và không tính vào thẻ cảnh báo, để thẻ không ngập đơn cũ ngay ngày đầu.
- Trên màn hình không dùng chữ «tự do» (chữ này đang có nghĩa khác trong tài liệu cũ); dùng «Chờ Bán hàng nhận». Phần 2 sẽ có «Chờ HDV nhận».
- Sau khi đơn đã gửi, người lập **không đổi lời mời**; X từ chối thì đơn chờ Bán hàng nhận. Riêng đơn cần kiểm, người lập Rút lại thì lời mời cũ khép; gửi lại là một lời mời mới với 15 phút mới.
- Khi đơn rơi vào «Chờ Bán hàng nhận» (không mời ai, hoặc X từ chối), Bán hàng, Quản trị, Toàn quyền thấy tin trên Bảng tin trong Nền tảng, **không** báo đẩy lên điện thoại, để 30 người không bị báo cho mỗi đơn.
- Thẻ cảnh báo của Kế toán chỉ liệt kê đơn **đã xác nhận**; đơn còn chờ xác nhận chỉ hiện thành con số, vì đơn nháp vẫn riêng tư như bản 2.36.
- Thẻ cảnh báo bỏ đơn đã qua ngày đi, đã giao hoặc đã hoàn thành, để thẻ không giữ đơn không xử lý được.
- Bán hàng phụ trách được: sửa đơn, xem lịch sử, sửa thông tin chuyến, sửa danh sách hành khách, giao HDV, bấm «Đã gọi báo» giờ hẹn cho khách. **Không** được bất cứ việc gì về tiền, không huỷ thay HDV.
- Đơn cũ không hiện dòng «Chờ Bán hàng nhận» và không có nút Nhận; Quản trị muốn thì tự gán. Yêu cầu xác nhận mở trước bản này mà bấm Còn vé sau bản này thì người bấm vẫn thành người phụ trách.
- Đơn cần kiểm có mời X: tin «có đơn chờ xác nhận» chỉ gửi X trong 15 phút ưu tiên, không gửi cả văn phòng như bản 2.36.
- Khối chọn người phụ trách ở form hôm nay đổi tên thành «Hướng dẫn viên» và chỉ liệt kê HDV, để không lẫn với khối mời Bán hàng.
- Lỗi «tin chờ xác nhận không vào hộp thông báo» được sửa thành **việc riêng nhỏ**, không chờ bản thiết kế này.

### A.5 Câu hỏi còn mở (một câu) — **ĐÃ TRẢ LỜI 27/10: theo khuyến nghị** (Quản trị, Toàn quyền nhận thay hoặc xác nhận thay bất cứ lúc nào)
**Q1 — Ai được nhận thay trong 15 phút của X?** Đồng hồ chỉ chạy trong 7h–17h, nên 15 phút ưu tiên của X có thể kéo qua đêm. Ví dụ: đơn đón gấp gửi lúc 18h cho chuyến 23h thì tới 7h15 sáng hôm sau người khác mới nhận được, trong khi chuyến đã chạy. **Khuyến nghị:** Quản trị và Toàn quyền nhận thay hoặc xác nhận thay được **bất cứ lúc nào**, kể cả trong 15 phút của X và ngoài 7h–17h; X được báo là đã có người nhận thay. Bán hàng khác và chính người lập vẫn phải chờ hết 15 phút. Cách khác là giữ đúng «chỉ X»: đơn gấp ngoài giờ có thể bị trễ.

---

## B. Thiết kế chi tiết (cho người lập kế hoạch thi công)

### B.1 Hiện trạng (đọc mã ngày 27/10, `main` = `b7881474`, production 2.36)
- **Một ô người phụ trách mỗi đơn**: dòng `HANDLE` của `dsp_assignment` (`migrations/0014_dispatch.sql`), chỉ mục duy nhất `dsp_assignment_handler_open_uq` (một dòng mở mỗi đơn); đổi người = đóng dòng cũ + mở dòng mới cùng lô. Người được giữ ô: qua `checkAssignee` (`src/modules/dispatch/rules.ts`) — Bán hàng, Quản trị, Toàn quyền, HDV; loại Kế toán, Thực tập, Đối tác và tài khoản lai có Đối tác. Người giữ ô được coi là «được giao» (gốc lắp ráp tiêm `ctx.isAssigned` từ `isOrderHandler` ở `src/index.ts`; route chuyển kết quả vào `can()` thành `assigned`; câu `IS_HANDLER` bỏ qua đơn nháp — ADR-0135 Đ5; `ctx.isAssigned` còn được `billing`, `receipt`, `van-chuyen` dùng) cho các ô `ownOrAssigned`/`assigned`. Giao diện ghi mọi người giữ ô là «HDV: <tên>» (`handlerText`, `src/shared/handler-view.ts`), kể cả nhân viên Bán hàng.
- **Chọn lúc lập** (ADR-0020 đ1, ADR-0030 S20-4): `handlerStaffId` ở `POST /api/orders` mở thẳng dòng `HANDLE` trong lô tạo đơn; chỉ ai có `dispatch.assign` trên đơn của mình (Bán hàng, Quản trị, Toàn quyền) — Thực tập, Đối tác nhận 403. Bảng chọn `GET /api/dispatch/assignees` gom nhóm HDV → Bán hàng → Quản trị.
- **Hàng chờ nhận** `GET /api/orders/pool`: chỉ đơn `confirmed`, chưa có `HANDLE`, chưa huỷ, chưa qua ngày đi; ô `order.pool.view` = HDV, Toàn quyền. Bán hàng nhận bằng `PUT /api/orders/:id/handler` (`dispatch.claim`).
- **Bước xác nhận 2.36** (ADR-0136, migration 0119): «chờ xác nhận» = đơn `draft` + dòng `ord_confirm_request` mở. Cần xác nhận khi `canXacNhan` (`src/shared/xac-nhan-don.ts`): dịch vụ / nhóm có cờ, hoặc chặng dưới mốc chưa đặt gấp (mốc đọc từ chính sách tiêm, hôm nay 360 phút). Hạn `hanXacNhan`: 15 phút, bỏ 22:00–06:00. Người quyết: ô `order.confirm.review` (Bán hàng, Kế toán, Quản trị, HDV, Toàn quyền) + `duocQuyetDinh` (người lập nội bộ tự quyết khi công tắc `self_confirm_internal` bật — đang bật). Còn vé = lô xác nhận hiện có; Hết vé = huỷ. **Người quyết không thành người phụ trách.** Thẻ «Đơn chờ xác nhận»: `src/shared/viec-cua-ban.ts`, `web/home.ts`, trang `web/cho-xac-nhan.ts`, API `GET /api/orders/cho-xac-nhan`.
- **Trạng thái đơn**: `draft`, `confirmed`, `cancelled`; «Đã giao», «Hoàn thành» suy từ `delivered_at`, `completed_at`. Hoàn thành do Kế toán / Toàn quyền bấm (`POST /api/orders/:id/completed`, nhật ký `order_completed`).
- **Thông báo** (Bảng tin `src/shared/bang-tin.ts`, hộp thư `v_aud_order_event`, báo đẩy `src/shared/web-push.ts` + `src/modules/thongbao`): xác nhận / huỷ báo người lập + người phụ trách; nhận / đổi người báo người lập + người mới; Từ chối chỉ nổi trên Bảng tin; Hoàn thành chỉ làm mới màn hình. Hộp thư chỉ nhận 6 hành động (`migrations/0025_thong_bao.sql`, bài ghim `src/migrations-0025.test.ts`); thêm hành động phải có **migration mới** định nghĩa lại view (không sửa view cũ — ADR-0034 đ5, ADR-0062).
- **Chưa có khái niệm «lời mời / chờ người được giao bấm nhận»** ở đâu trong Nền tảng.

### B.2 Từ ngữ
- **Bán hàng phụ trách** *(mới)*: người văn phòng chịu trách nhiệm đơn. Một người mỗi đơn, có thể trống.
- **Người phụ trách** *(ô hôm nay)*: giữ nguyên ở Phần 1. Phần 2 sẽ biến nó thành «HDV phụ trách».
- **Lúc ghi nhận**: lúc đơn rời nháp riêng tư — lúc xác nhận (đơn không cần kiểm, kể cả nhánh B của Gửi đơn) hoặc lúc mở yêu cầu xác nhận (Gửi xác nhận, nhánh A của Gửi đơn). Nháp đang soạn không mời ai và không có đồng hồ (ADR-0135: nháp chỉ người lập thấy).
- **Lời mời**: người lập chọn sẵn Bán hàng X. **Thời gian ưu tiên**: 15 phút giờ hành chính kể từ lúc ghi nhận, chỉ X nhận được.
- **Chờ Bán hàng nhận**: đơn đã ghi nhận, chưa huỷ, chưa có Bán hàng phụ trách, và không còn trong thời gian ưu tiên của ai.
- **Phút giờ hành chính**: phút nằm trong 07:00–17:00 giờ Việt Nam, mọi ngày trong tuần.

### B.3 Luật
- **L1 — Mời lúc lập.** Form lập và sửa nháp có ô tuỳ chọn «Bán hàng phụ trách», cho **mọi** người giữ `order.create` (kể cả Thực tập, Đối tác). Người được mời phải đang hoạt động, có hồ sơ, giữ quyền Bán hàng, không giữ quyền Đối tác. Sai thì 400, không lưu (như `invalid_assignee` hôm nay). Danh sách để mời chỉ trả **mã + tên**, không SĐT, không email. Lời mời chỉ có hiệu lực từ lúc ghi nhận. Sau lúc ghi nhận, người lập không đổi lời mời. Riêng đơn cần kiểm, Rút lại sẽ khép lời mời đang mở và đơn về nháp sửa được; gửi lại là một lúc ghi nhận mới, một dòng lời mời mới (X có thể đổi), 15 phút mới [người soạn]. Mỗi đơn có tối đa một lời mời mở.
- **L2 — X trả lời.** Trong thời gian ưu tiên, X bấm:
  - **Nhận**: với đơn không cần kiểm, mở ô Bán hàng phụ trách cho X. Với đơn cần kiểm, chạy đúng lô «Còn vé» của ADR-0136 và **trong cùng lô** mở ô cho X. X vẫn chọn được Hết vé hoặc Huỷ như người xác nhận.
  - **Từ chối**: lời mời khép kết quả Từ chối; đơn sang Chờ Bán hàng nhận; người lập được báo.

  Hết thời gian ưu tiên thì máy không ghi gì; trạng thái tính theo giờ khi đọc. X vẫn nhận được như mọi Bán hàng khác. Lời mời cũng khép khi người khác nhận, khi đơn huỷ, hoặc khi người lập Rút lại yêu cầu xác nhận. Mỗi lời mời khép đúng một lần, không xoá.
- **L3 — Tự mời mình.** Người lập giữ quyền Bán hàng và chọn chính mình:
  - đơn không cần kiểm: thành Bán hàng phụ trách ngay lúc ghi nhận;
  - đơn cần kiểm: tự quyết theo công tắc tự xác nhận như hôm nay, và Còn vé thì thành người phụ trách. [người soạn]
- **L4 — Nhận khi đơn đang Chờ Bán hàng nhận.** Bán hàng (không giữ quyền Đối tác), Quản trị, Toàn quyền bấm **Nhận phụ trách**. Đơn cần kiểm thì nút này là quyết định Còn vé, kèm Hết vé / Huỷ như hôm nay. Hai người bấm cùng lúc thì đúng một người thắng, người kia nhận 409 kèm câu tiếng Việt. Đơn huỷ hoặc đã qua ngày đi thì không nhận được (chốt như Nhận của ô hôm nay). **Trong thời gian ưu tiên của X**, người khác bấm sẽ nhận 409 «Đơn đang chờ <X> trả lời, còn N phút». Luật này áp cả người lập đã mời X: người lập không tự quyết chen trong thời gian ưu tiên. **Ngoại lệ (Q1, chủ duyệt 27/10):** Quản trị và Toàn quyền nhận phụ trách hoặc quyết định (Còn vé / Hết vé / Huỷ) được **bất cứ lúc nào**, kể cả trong thời gian ưu tiên của X và ngoài 07:00–17:00. Khi đó lời mời của X khép kết quả «người khác nhận», và X được báo trên Bảng tin. Ngoại lệ xét theo quyền Quản trị / Toàn quyền của người bấm. Tài khoản lai Bán hàng + Quản trị được hưởng; tài khoản giữ quyền Đối tác thì không, như mọi cổng nhận.

  Người giữ ô có thể là: tài khoản giữ quyền Bán hàng (không giữ quyền Đối tác), hoặc Quản trị / Toàn quyền khi chính họ bấm Nhận phụ trách hay Còn vé. Danh sách để mời (L1) chỉ có người giữ quyền Bán hàng.
- **L5 — Ai xác nhận đơn cần kiểm.** Ô `order.confirm.review` còn Bán hàng, Quản trị, Toàn quyền; Kế toán và HDV đổi thành `none`. `duocQuyetDinh` thêm điều kiện thời gian ưu tiên của L2/L4. Còn vé ⇒ người bấm thành Bán hàng phụ trách, cùng lô với xác nhận. Đơn chỉ cần kiểm vì chặng dưới mốc vẫn theo luật Đặt gấp hiện có (ADR-0049, ADR-0107).
- **L6 — Ô Bán hàng phụ trách.** Một dòng mở mỗi đơn, chặn ở **cả** cơ sở dữ liệu lẫn mã (Hiến chương 5.1). Đổi người = đóng dòng cũ + mở dòng mới cùng lô; không xoá, không sửa đè (5.5). Bán hàng không tự trả lại; Quản trị và Toàn quyền đổi hoặc bỏ trống được [người soạn]. Người đang giữ ô được coi là «được giao» chỉ ở **danh sách trắng** sau:
  - `order.modify`, `order.history.view`, `order.trip.edit`, `order.passenger.write`;
  - `dispatch.assign` (với Bán hàng);
  - `trip.call_ack` («Đã gọi báo» giờ hẹn).

  Làm bằng một cờ tiêm **riêng** từ gốc lắp ráp, **không** nới `isOrderHandler`. Lý do: `ctx.isAssigned` còn mở các ô tiền và các ô `assigned` của HDV ở `billing`, `receipt`, `dispatch.refuse`. Nếu nới nó, tài khoản lai Bán hàng + HDV sẽ hưởng luôn ô tiền. Như hôm nay, cờ không áp cho đơn nháp. Nhờ `dispatch.assign`, Bán hàng phụ trách giao được người phụ trách / HDV, đúng bước 3 của chủ. Ô này **không** mở `order.money.edit`, `order.cancel`, `order.handover`, `payment.receive`, `dispatch.refuse`, hay bất kỳ ô nào ngoài danh sách trắng. Đơn đã Đã giao: khoá đổi người như dòng `HANDLE` (trigger của migration 0044).
- **L7 — Đồng hồ giờ hành chính.** Một hàm thuần `cong N phút giờ hành chính(mốc)` thay `hanXacNhan`, dùng cho ba chỗ: hạn ưu tiên của lời mời, hạn của yêu cầu xác nhận (thay ADR-0136 Đ9), và mốc hiện thẻ cảnh báo. Ba con số 15, 07:00, 17:00 nằm ở **một** dòng chính sách chỉ thêm, chỉ `settings.ops` đổi (Hiến chương 5.2), không viết cứng rải rác.
- **L8 — Thẻ cảnh báo «Đơn chưa có Bán hàng phụ trách».** Đơn vào thẻ khi đủ cả năm điều kiện:
  - chưa huỷ, chưa qua ngày đi (`tripDeparted`), chưa Đã giao, chưa Hoàn thành;
  - lúc ghi nhận từ **mốc phát hành** trở đi (đơn cũ không vào thẻ, cũng không ghi bù — L10);
  - chưa có dòng Bán hàng phụ trách mở;
  - đã qua 15 phút giờ hành chính;
  - kể cả đơn đang chờ xác nhận.

  Ai thấy thẻ: Bán hàng, Quản trị, Toàn quyền thấy mọi đơn như vậy. Kế toán thấy mọi đơn **đã xác nhận** như vậy; đơn đang chờ xác nhận chỉ hiện thành **con số**, không mã đơn, không mở được. Lý do: Kế toán mất ô `order.confirm.review`, nên theo ADR-0135 Đ1 không còn đọc được nháp đang chờ; không nới riêng cho Kế toán. Người lập (kể cả Đối tác, Thực tập) chỉ thấy đơn của mình, với chữ kiểu «đang chờ văn phòng nhận». Thẻ có ở Trang chủ trên cả điện thoại và máy tính. Kế toán và người lập chỉ xem, không có nút Nhận. Thẻ không gửi báo đẩy.
- **L9 — Thông báo** (sau lô ghi, không bao giờ trong lô — Hiến chương 5.10):

  | Sự kiện | Người nhận | Kênh |
  |---|---|---|
  | Lời mời có hiệu lực (lúc ghi nhận) | X | hộp thư + báo đẩy + Bảng tin |
  | Có Bán hàng phụ trách (X nhận, người khác nhận, Còn vé) | người lập; X nếu người khác nhận thay | hộp thư + báo đẩy; X chỉ Bảng tin |
  | X từ chối | người lập | hộp thư + Bảng tin |
  | Đơn rơi vào Chờ Bán hàng nhận (lúc ghi nhận mà không mời ai, hoặc X từ chối) | nhóm Bán hàng, Quản trị, Toàn quyền | **chỉ Bảng tin**, không báo đẩy [người soạn]; hết 15 phút của X thì không có tin, chỉ có thẻ |
  | Người phụ trách / HDV nhận hoặc được giao (ô hôm nay) | **thêm** Bán hàng phụ trách vào danh sách nhận hiện có | như hôm nay |
  | Đơn bị huỷ (mọi đường, kể cả Hết vé, HDV huỷ) | **thêm** Bán hàng phụ trách | như hôm nay |
  | Hoàn thành (`order_completed`) | Bán hàng phụ trách + người lập | hộp thư + Bảng tin (mới) |
  | Gửi yêu cầu xác nhận | có X: **chỉ X** trong thời gian ưu tiên; không có X: mọi người giữ ô như ADR-0136 Đ10 | như hôm nay |

  Đối tác và Thực tập nhận vào hộp thư, không có tin nổi, như hôm nay. Mỗi hành động mới vào hộp thư cần migration mới định nghĩa lại `v_aud_order_event` và sửa bài ghim. Lỗi hộp thư thiếu `order_confirm_requested` là **việc sửa riêng, có thể lên trước**; khi đó Phần 1 xây trên bản đã sửa.
- **L10 — Đơn cũ.** «Đơn cũ» là đơn có lúc ghi nhận trước mốc phát hành. Máy không tự ghi bù Bán hàng phụ trách cho đơn cũ. Đơn cũ không hiện chip Chờ Bán hàng nhận, không có nút Nhận phụ trách, không vào thẻ. Quản trị / Toàn quyền vẫn **Đổi Bán hàng** để gán được. Riêng yêu cầu xác nhận mở trước mốc mà được bấm Còn vé sau mốc: người bấm thành Bán hàng phụ trách (L5), vì đó là một hành động sau mốc, không phải ghi bù. Người thi công chọn cách lưu mốc phát hành (dòng chính sách hoặc hằng trong migration).
- **L11 — Giao diện.** Phải có **ảnh thật hai khổ để chủ duyệt** trước khi gộp vào bản chính.
  - Form lập đơn: khối mời «Bán hàng phụ trách» cho mọi người lập. Khối chọn người phụ trách hôm nay (chỉ người có `dispatch.assign`) đổi tên «Hướng dẫn viên», danh sách chỉ hiện người giữ quyền HDV. Đây chỉ là đổi giao diện; luật máy chủ của ô đó đổi ở Phần 2.
  - Trang đơn và thẻ đơn có dòng «Bán hàng: <tên>», hoặc chip «Chờ Bán hàng nhận», hoặc «Đang mời <X> · còn N phút». Nút Nhận / Từ chối chỉ X thấy; Nhận phụ trách cho Bán hàng, Quản trị, Toàn quyền khi đơn đang chờ; Đổi Bán hàng cho Quản trị, Toàn quyền.
  - Thẻ «Đơn chờ xác nhận» của 2.36 nay chỉ còn người xác nhận được thấy.
  - Khối người phụ trách hôm nay trên trang đơn (nút Nhận của `handlerControls` cho ô `HANDLE`) giữ nguyên hành vi ở Phần 1, nhưng đổi nhãn thành «Hướng dẫn viên» / «Nhận làm HDV». Mục đích là không trùng chữ với nút «Nhận phụ trách» của ô Bán hàng. Ai được bấm ô đó đổi ở Phần 2 [người soạn].
  - Không dùng chữ «tự do» trên màn hình.

### B.4 Câu của ADR đã duyệt bị thay hoặc bổ sung (ADR mới phải ghi rõ — Hiến chương 6.1)
- **ADR-0136**:
  - Đ4: Kế toán và HDV thành `none`.
  - Đ5: thêm thời gian ưu tiên của X, áp cả người lập.
  - Đ6: **chữ phải đổi**, bỏ «kể cả HDV chưa phụ trách». Dòng quan hệ của ADR-0136 từng thay một phần ADR-0023 đ1 và ADR-0030 S23-1/S23-4 để HDV đọc được đơn chờ; phần thay đó **đảo lại**, tức HDV quay về chỉ đọc đơn mình phụ trách và hàng chờ nhận.
  - Đ7: Còn vé thêm câu mở ô Bán hàng phụ trách.
  - Đ8: phần của Kế toán (sửa tiền đơn đang chờ) mất chỗ dùng vì Kế toán không còn đọc được đơn chờ. Đ8 chưa có mã; câu Q1 cũ (Task 3.3b, hướng 1 hay hướng 2) vẫn chờ chủ, nay chỉ còn Quản trị / Toàn quyền.
  - Đ9: đồng hồ 07–17 thay «bỏ 22–06». Người thấy quá hạn đổi từ «người giữ ô» sang năm nhóm của L8.
  - Đ10: tin lúc gửi chỉ tới X khi có lời mời.
  - Đ13.4 và câu (c) của phần Bối cảnh («không thêm dữ liệu mới»): đơn của Đối tác nay có thêm lời mời và ô Bán hàng phụ trách; hai câu báo của Gửi đơn giữ nguyên.
- **ADR-0020 đ1 / ADR-0030 S20-4**: thêm lời mời Bán hàng cho mọi người lập. Câu «Thực tập, Đối tác không chọn được» chỉ còn áp cho ô người phụ trách hôm nay.
- **ADR-0020 đ3**: người giao người phụ trách nay gồm cả Bán hàng phụ trách (qua `dispatch.assign`, L6).
- **Giữ nguyên:**
  - ADR-0020 đ2 (ai Nhận ô hôm nay);
  - ADR-0032 (hạn mức từ chối chỉ áp HDV, không áp lời mời Bán hàng);
  - ADR-0135 Đ5 (quyền «được giao» không áp nháp);
  - ADR-0136 Đ13 (Gửi đơn, hai câu báo).

### B.5 Hiến chương áp
- 2.2: Bán hàng phụ trách là vai theo ngữ cảnh trên đơn.
- 5.8: Nhận / Từ chối xét theo vai trên chính đơn.
- K9: luồng có hạn.
- 5.1: một dòng mở ở cả cơ sở dữ liệu lẫn mã.
- 5.5: đóng dòng, không xoá.
- 5.2: con số ở dòng chính sách.
- 5.10 / 5.16: lời mời là trạng thái bền trong cơ sở dữ liệu, hiện ở trang đơn và Trang chủ, nên báo đẩy thất lạc không làm mất việc.

Không có lệch có chủ ý.

### B.6 Lỗ đang hở
Không xây trên mục nào của `docs/quyen-hoan.json`. Với TNV-G1 (đơn huỷ còn tiền): Hết vé chỉ áp cho đơn có yêu cầu xác nhận mở. Máy chủ không mở yêu cầu khi đơn đã có khoản thu, và nháp không ghi được khoản thu (ADR-0135, ADR-0136). Vì vậy Phần 1 không mở đường mới tới đơn huỷ còn tiền.

### B.7 Không làm, và điều coi là thất bại
**Không làm ở Phần 1:**
- ô HDV riêng có nhận / từ chối, và «Chờ HDV nhận đơn» (Phần 2);
- vai Điều phối xe (Phần 3);
- mọi việc tiền;
- mời lại sau khi X từ chối;
- hạn mức từ chối cho Bán hàng;
- đổi nhãn «Chờ xác nhận» của đơn nháp (nhãn này trùng chữ với dải chờ xác nhận — ghi nợ);
- sửa lỗi hộp thư (việc riêng).

**Thất bại dù chạy đúng mã:**
- đơn đứng tên một người chưa bấm Nhận;
- Đối tác thấy thông tin nhân viên ngoài tên;
- thẻ cảnh báo ngập đơn cũ;
- HDV mất hàng chờ nhận;
- có người nhận chen trong thời gian ưu tiên của X;
- Kế toán còn nút Còn vé.

### B.8 Để lại cho người thi công
- Hình bảng: khuyến nghị **bảng riêng** do `dispatch` sở hữu cho ô Bán hàng phụ trách và cho lời mời, không thêm loại vào `dsp_assignment`. Nếu thêm loại vào `dsp_assignment`, mọi câu đọc bảng đó và view `v_dsp_*`, `IS_HANDLER` phải lọc loại, kèm bài kiểm bắt câu thiếu lọc.
- Tên bảng, route, tên ô quyền mới. Dự kiến ba ô:
  - nhận ô Bán hàng: Bán hàng, Quản trị, Toàn quyền;
  - đổi ô Bán hàng: Quản trị, Toàn quyền;
  - xem danh sách tên Bán hàng để mời: mọi người giữ `order.create`.
- Đường đưa câu mở ô từ `dispatch` vào lô Còn vé của `orders`: tiêm từ gốc lắp ráp, vì `orders` không import `dispatch`.
- Cách lưu mốc phát hành; chữ báo đẩy; bố cục màn hình (theo ảnh chủ duyệt).
- Đây là **việc lớn** (dữ liệu + quyền): sau thi công phải có người kiểm độc lập chỉ đọc. Chạy e2e. `npm test` và e2e chạy **một lần ở cuối**.

### B.9 Trang ghép (CLAUDE.md §9)
1. **Bảng chứa gì.**
   - `dsp_assignment`: vẫn chỉ ô người phụ trách (`HANDLE`) nếu theo khuyến nghị bảng riêng.
   - Bảng ô Bán hàng: chỉ một loại.
   - Bảng lời mời: chỉ lời mời Bán hàng.
   - `ord_confirm_request`: không đổi hình, chỉ đổi hạn (L7).
2. **Dòng quyền chạm các bảng này.**
   - `order.confirm.review` (đổi).
   - Ba ô mới (B.8).
   - Các ô `ownOrAssigned` / `assigned` của người phụ trách: nay «được giao» gồm cả Bán hàng phụ trách (L6). Riêng Bán hàng, `order.view` và `contact.view` đã là `any` nên không nới đọc.
   - Kế toán (`order.view` `any`) chỉ đọc đơn **đã xác nhận** trên thẻ cảnh báo. Đơn chờ xác nhận chỉ là con số. Kế toán **mất** quyền đọc đơn chờ mà ADR-0136 Đ6 từng cho; HDV cũng mất.
   - Đối tác và Thực tập chỉ thấy đơn của mình (`own`). Điểm mới duy nhất ra ngoài là danh sách **tên** Bán hàng.
3. **Cổng canh cửa.**
   - **Máy chủ:**
     - lập / sửa nháp (kiểm người được mời);
     - Nhận / Từ chối lời mời (chỉ X, trong hạn, đơn đã ghi nhận);
     - quyết định (`quyet-dinh`, thêm thời gian ưu tiên);
     - nhận ô Bán hàng (chặn trong hạn của X, đơn huỷ, đơn qua ngày đi, tài khoản lai);
     - đổi ô;
     - danh sách tên Bán hàng;
     - thẻ cảnh báo (lọc theo người xem);
     - `isOrderHandler` / `ctx.assigned` mở rộng.
   - **Giao diện (chỗ ẩn/hiện đổi nghĩa):**
     - `handlerControls` phải hiểu «được giao» mới;
     - khối mời ở form (mọi người lập);
     - nút Nhận / Từ chối (chỉ X);
     - nút Nhận phụ trách;
     - nút Đổi;
     - thẻ cảnh báo (năm nhóm);
     - thẻ «Đơn chờ xác nhận» (Kế toán và HDV mất thẻ).

### B.10 Tiêu chí nghiệm thu (bài đỏ trước, xanh sau)
1. Đối tác lập đơn không cần kiểm, mời X, bấm Gửi đơn: đơn xác nhận; X có lời mời; Bán hàng Y bấm Nhận trong 15 phút ⇒ 409; X bấm Nhận ⇒ X là Bán hàng phụ trách; người lập nhận tin.
2. Như ca 1 nhưng X Từ chối ⇒ đơn Chờ Bán hàng nhận; Y nhận được ngay; người lập nhận tin X từ chối.
3. Đơn cần kiểm, mời X: chỉ X quyết được trong hạn; X Còn vé ⇒ đơn xác nhận **và** X là Bán hàng phụ trách trong **cùng một lô** (lô hỏng giữa chừng ⇒ không có gì được ghi).
4. Kế toán, HDV gọi `quyet-dinh` ⇒ 403. Kế toán vẫn thấy thẻ cảnh báo, không có nút Nhận.
5. Đồng hồ: ghi nhận 16:55 ⇒ hạn 07:10 hôm sau; ghi nhận 06:00 ⇒ hạn 07:15; ghi nhận 10:00 ⇒ hạn 10:15. Ba chỗ dùng (lời mời, yêu cầu xác nhận, thẻ) cùng một hàm.
6. Hai Bán hàng bấm Nhận cùng lúc sau hạn ⇒ đúng một người thắng; cơ sở dữ liệu không bao giờ có hai dòng mở cho một đơn.
7. Đơn lập trước mốc phát hành không vào thẻ cảnh báo.
8. Bán hàng phụ trách sửa được đơn (`order.modify`) và giao HDV (`dispatch.assign`), nhưng không sửa tiền qua `order.money.edit`. Trên đơn nháp, lời mời không cho X quyền gì.
9. Danh sách tên Bán hàng gọi bằng phiên Đối tác: chỉ có mã + tên; không có tài khoản lai, không có người đã nghỉ.
10. Hoàn thành đơn ⇒ Bán hàng phụ trách và người lập có tin trong hộp thư.
11. HDV vẫn thấy hàng chờ nhận và Nhận được đơn như trước bản này. HDV mở đơn đang chờ xác nhận (không phụ trách) ⇒ 404.
12. Thẻ cảnh báo của Kế toán: đơn chờ xác nhận chỉ là con số, không có mã đơn. Đơn đã qua ngày đi, Đã giao hoặc Hoàn thành không vào thẻ của ai.
13. Tài khoản lai Bán hàng + HDV đang là Bán hàng phụ trách (không giữ ô người phụ trách) ⇒ không ghi được khoản thu, không Đã giao, không sửa tiền theo phạm vi «được giao».
14. Rút lại rồi gửi lại ⇒ lời mời cũ khép, lời mời mới mở với 15 phút mới; không bao giờ có hai lời mời mở cho một đơn.
