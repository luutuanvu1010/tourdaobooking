# ADR-0020 — Đơn mới chưa có người phụ trách cho tới khi có người bấm "Nhận"; hướng dẫn viên nội bộ nhận được đơn

- **Trạng thái:** **proposed** — AI soạn 2026-09-25 theo quyết định **Q7** của chủ dự án (phiên chat 2026-09-25, sau khi nghe ba phương án; ghi ở `docs/superpowers/plans/2026-09-24-hang-rao-quyen-va-va-lo-hong-ho-so.md` §10): *"đơn mới chưa có người phụ trách cho tới khi hướng dẫn viên Nhận"*, làm **sau** việc tách cổng và thi công ADR-0017. AI đã nhắc một lần rằng điều này đảo một điều vừa duyệt ngày 24/9 (P18); chủ đã nghe và vẫn quyết. AI **không tự duyệt** (N3, Điều 7.2). Sau khi accepted chỉ sửa dòng trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Lượt duyệt:** **trình ở lượt duyệt SAU, khi Phần B (ADR-0019) đã lên production** — không thuộc lượt duyệt của ADR-0019. Lý do: luật "dừng dây chuyền" (`CLAUDE.md` §3) — ADR này xây trên hai lỗ đang hở `money.view`, `contact.view`; đặc tả/kế hoạch chạm vùng đang hở không được duyệt trước khi lỗ được vá. Nội dung ở đây là bản nháp để chủ đọc trước, chưa xin duyệt.
- **Ngày:** 2026-09-25   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa hai chiều.** Chỉ đổi mã và test; không migration. Đơn đã có người phụ trách **giữ nguyên** (không gỡ ai). Quay lại cách cũ = một commit (đơn tạo trong thời gian áp dụng vẫn chưa có người cho tới khi có người nhận — không tự điền ngược).
- **Phụ thuộc (thứ tự bắt buộc):** chỉ phát hành **sau khi** ADR-0019 (tách cổng, route hỏi bảng) và ADR-0017 (hướng dẫn viên xem mọi đơn) **đã lên production** và hướng dẫn viên **đã bấm "Nhận" được** (ô `dispatch.claim` của `FIELD` = `any`, đặc tả mô hình vai §5 đã duyệt, Q9 của đặc tả). Lý do: nếu bỏ việc tự gắn trước, mọi đơn mới rơi vào hàng "chưa có người" mà hướng dẫn viên không mở được.
- **Xây trên lỗ đang hở: `money.view`, `contact.view` (vá ở Phần B)** (`docs/quyen-hoan.json`, hạn 2026-10-15 — ô chưa được máy chủ hỏi; "hướng dẫn viên không xem tiền" hôm nay chỉ được giữ gián tiếp bằng cổng). Hai lỗ này được **đóng ở bước ADR-0019**; ADR-0020 chỉ được phát hành sau bước đó (xem Phụ thuộc), nên không dựa vào lỗ nào lúc chạy thật.

## Sửa những câu nào của quyết định đã duyệt (nguyên văn → mới)

| Nguồn | Câu hiện hành | Sau ADR-0020 |
|---|---|---|
| **ADR-0009 điều 4**, câu đầu | "**Đơn mới**: người lập đơn được đặt làm người phụ trách mặc định trong cùng `db.batch()` tạo đơn (…)" | **Bỏ.** Đơn mới (mọi người lập) **không** có người phụ trách. Câu sau của điều 4 (backfill đơn cũ ở migration `dispatch`) là lịch sử, giữ nguyên. |
| **ADR-0014 điều 9**, vế đầu | "ADR-0009 điều 4 (…) **giữ nguyên cho `SALES`/`ADMIN`**" | Không còn "giữ nguyên" cho ai. Phần của `PARTNER` (chọn hướng dẫn viên hoặc để trống) — đã được ADR-0018 điều 9 thay bằng "đề xuất, không ràng buộc" — **không đổi** ở đây. |
| **ADR-0018 điều 7**, câu 2 | "Người lập nội bộ **mặc định tự nhận**; chọn người khác = **đề nghị** (…)" | Người lập nội bộ **không** tự nhận. Đơn chờ nhận như "đơn chung" (đặc tả mô hình vai §8 mục 3, đã duyệt). Người lập muốn lo đơn thì **bấm "Nhận"** như mọi người được nhận. Phần "chọn người khác = đề nghị" giữ nguyên (hiện thực ở giai đoạn 5 của mô hình vai; tới lúc đó "chọn người" vẫn có hiệu lực ngay như hôm nay). |
| **ADR-0018 điều 7**, câu 2 (vế sau) | "chưa ai nhận thì người lập vẫn phụ trách (chỉ đơn do nhân viên Tour Đảo lập)" | **Bỏ.** Chưa ai nhận thì đơn **chưa có người phụ trách**. |
| **ADR-0018 điều 7**, câu 4 (và đặc tả §1 tiêu chí 4, §8) | "**Kế toán và Thực tập sinh chỉ nhận đơn mình lập** hoặc đơn Giám đốc/Điều hành giao" | Phần "đơn mình lập" đi qua **tự nhận lúc lập** (đặc tả §8 mục 1), vì bảng đích cho hai mức này `dispatch.claim = none`. ADR-0020 bỏ tự nhận ⇒ **cơ chế đó không còn**. Hôm nay không ai bị ảnh hưởng (Kế toán không lập đơn; Thực tập chưa đủ điều kiện làm người phụ trách). **Việc mở cho giai đoạn 2 của mô hình vai** (không phải câu hỏi của lượt này): chọn giữa `dispatch.claim = own` cho Kế toán/Thực tập, hoặc chỉ nhận khi được giao. |
| **ADR-0018 phần Hệ quả**, dòng bài kiểm | "e2e `dispatch.mjs` (người phụ trách mặc định)" | Bài kiểm đảo theo **ADR-0020**: đơn mới không có người phụ trách. |
| **Đặc tả mô hình vai** (đã duyệt 24/9) §0 câu "Nội bộ lập đơn thì mặc định tự nhận"; §1 tiêu chí 4 "Nội bộ lập đơn → tự thành người nhận ngay (mốc tiếp nhận = lúc lập)"; §8 "Đơn do nội bộ lập" mục 1 (tự nhận) và câu cuối mục 2 ("Chưa ai nhận thì người lập vẫn là người nhận"); §19 "`defaultHandlerPartyId` (bản 1.5) mở rộng cho mọi vai nội bộ" | Các câu đó **không còn hiệu lực**. Mục 3 của §8 ("để chung") trở thành cách **mặc định** cho mọi đơn nội bộ. Đặc tả không sửa (đã duyệt); ADR này là nguồn mới hơn. |

**Không đổi:** LC-8 ("sau lần tiếp nhận đầu, đơn luôn có người phụ trách") — ADR-0020 chỉ đổi **trước** lần tiếp nhận đầu. ADR-0009 điều 1–3, 5–6. ADR-0017 điều 4 (hướng dẫn viên chỉ XEM; không lập, sửa nháp, xác nhận).

## Bối cảnh

Hôm nay (bản 1.9, `origin/main` `d981326`): nhân viên Bán hàng/Quản trị lập đơn thì **tự thành người phụ trách** (`defaultHandlerStatement` gộp vào lô tạo đơn); đơn Đối tác lập thì **để trống** từ bản 1.5. Chủ dự án báo sau phát hành 1.9: tạo đơn xong không thấy chỗ chọn hướng dẫn viên (vì đơn đã tự gắn người lập, nút là "Đổi người phụ trách" và bị hộp xác nhận che), và muốn **hướng dẫn viên là người nhận đơn**. Hôm nay hướng dẫn viên **không nhận được** đơn nào: ô `dispatch.claim` của `FIELD` = `none`, route nhận nằm sau cổng `office`, và hướng dẫn viên không mở được trang đơn — ba điều này được gỡ bởi ADR-0019 + ADR-0017 + ô `dispatch.claim` (đặc tả đã duyệt).

## Quyết định

1. **Đơn mới — do bất kỳ ai lập (nội bộ hay Đối tác) — không có người phụ trách** cho tới khi có người **bấm "Nhận"** hoặc được **giao**. Lô tạo đơn **không** còn câu gắn người phụ trách; đường tiêm `defaultHandlerStatement` (router, gốc lắp ráp, route lập đơn) **gỡ hẳn**, không để lại hàm trả `null`.
2. **Ai bấm "Nhận" được** (ô `dispatch.claim`, đơn đang chưa có người, nhận cho **chính mình**): **Hướng dẫn viên** (`FIELD`, mới), **Bán hàng** (`SALES`), **Quản trị** (`ADMIN`), **Toàn quyền** (`SUPER_ADMIN`) — kể cả chính người lập. **Không** nhận được: Kế toán, Thực tập, Đối tác (đặc tả mô hình vai §5, LC-1/LC-2). Người nhận vẫn phải qua luật "người được giao" hiện có (đang hoạt động, có hồ sơ, đủ cấp — `checkAssignee`).
3. **Ai giao được** (chọn người phụ trách cho đơn — ô `dispatch.assign`): **không đổi** so với hôm nay — người lập (Bán hàng), người đang phụ trách (Bán hàng), Quản trị, Toàn quyền. Giao **có hiệu lực ngay** như hôm nay; "đề nghị + bấm Nhận có hạn" là việc của giai đoạn 5 mô hình vai. Hướng dẫn viên **không** giao/đổi người phụ trách ở đợt này (đặc tả §5 cho `ownOrAssigned` nhưng theo nghĩa "đề nghị" — chờ giai đoạn 5).
4. **Người lập đơn vẫn làm được mọi việc của người lập** (ADR-0009 điều 1, ô `ownOrAssigned` phần "của mình"): sửa nháp, xác nhận, huỷ, sửa thông tin chuyến, xem lịch sử — dù chưa có ai nhận, và dù người khác đã nhận.
5. **Hướng dẫn viên đã nhận một đơn nháp** chỉ **xem** và làm những việc hẹp của người phụ trách cấp hẹp (sửa số khách sau xác nhận, huỷ đơn đã xác nhận kèm lý do — ADR-0014 điều 6/11). **Xác nhận** đơn vẫn do người lập hoặc Quản trị làm cho tới khi mô hình vai tách ô `order.confirm` (giai đoạn 2 của mô hình vai).
6. **Đơn Đối tác lập:** **không đổi** (đã không có người phụ trách từ bản 1.5).
7. **Đơn không ai nhận:** đây là "đơn chung" của đặc tả mô hình vai §8 mục 3 (đã duyệt) — **hạn nhận** 15 phút làm việc, khối "Chờ tiếp nhận" đỏ và báo đẩy (ADR-0018 điều 8) cần cài đặt vận hành và nơi lưu hạn, **thuộc giai đoạn 5 của mô hình vai, chưa có**. Cách xử lý trong khoảng giữa: **M1 — chủ đã trả lời A (2026-09-25)**: ô "Chưa phụ trách" trên Trang chủ đếm **cả đơn nháp lẫn đơn đã xác nhận** chưa có người, chữ phụ "Chờ người nhận"; không đặt hạn tạm.
8. **Đơn đã có** giữ nguyên người phụ trách hiện có; không có câu dữ liệu nào chạy trên đơn cũ.
9. **Biên nhận (ảnh xác nhận gửi khách)** — chủ chọn A (2026-09-25): dòng "Nhân viên phụ trách" **không còn lấy tên người lập làm dự phòng**. Chỉ khi máy chủ **xác nhận** đơn chưa có người phụ trách thì ghi **"Chưa có người phụ trách"**; có người nhận thì lần dựng ảnh sau hiện tên họ (ảnh dựng lại mỗi lần mở, không lưu). **Không tải được** tên (lỗi, hết giờ, 404) thì **bỏ hẳn dòng đó** — không đoán "chưa có người" lên giấy gửi khách (*giả định của AI, bề mặt, đảo ngược được — P8; chủ chỉ chọn cho trường hợp chưa ai nhận*). Vì vậy `loadHandlerName` ở `web/confirmation-dialog.ts` (hôm nay gộp mọi lỗi thành `null`) phải trả **ba trạng thái** như `web/order.ts:67-70` (`null` = chưa có người, `undefined` = chưa biết, chuỗi = tên); sửa `titleBlock` ở `src/shared/order-confirmation.ts`; test đỏ trước cho cả ba trạng thái. Trạng thái "chưa có / đã có người phụ trách" **suy ra** từ việc đơn có dòng `HANDLE` đang mở hay không — **không** thêm cột trạng thái riêng (một nguồn sự thật, không migration); chữ trên màn hình bằng tiếng Việt, không lộ mã kiểu `not-assigned`.
10. **"Cả hệ thống biết ngay" khi đơn được nhận/giao/đổi trạng thái** — chủ yêu cầu (2026-09-25) **không** hỏi lại theo chu kỳ mà dùng cơ chế **lắng nghe sự kiện, máy chủ chủ động báo** tới mọi màn hình đang mở, hiện thông báo cập nhật trên bảng điều khiển chung. Đây là quyết định kiến trúc riêng (thêm thành phần hạ tầng mới) nên **tách ra ADR riêng** (bản nghiên cứu: `docs/superpowers/specs/2026-09-25-thong-bao-tuc-thi-nghien-cuu.md`). ADR-0020 **không phụ thuộc** vào nó: thiếu thông báo tức thì thì người dùng vẫn thấy trạng thái mới khi mở lại trang; máy chủ vẫn chặn hai người cùng nhận một đơn.

## Lý do

- Đúng yêu cầu vận hành chủ nêu: người lập đơn (thường ở văn phòng) không phải người dẫn khách; để hướng dẫn viên chủ động nhận đơn.
- Tái dùng đúng luồng "đơn chung" đã duyệt (§8 mục 3) và ô `dispatch.claim` đã có — không thêm khái niệm mới, không migration.
- Bỏ hẳn đường tiêm thay vì để hàm trả `null`: một hàm "không làm gì" trên đường tạo đơn là chỗ để ai đó sau này bật lại lặng lẽ.

## Rủi ro đã nêu cho chủ dự án (ghi để sau này không ai nói "không biết")

- **Đơn có thể không ai lo** trong khoảng giữa lúc này và giai đoạn 5 (chưa có hạn, chưa có báo đẩy). Giảm nhẹ tuỳ câu trả lời M1.
- **Hướng dẫn viên nhận đơn nháp nhưng không xác nhận được**: người lập hoặc Quản trị phải xác nhận. Nếu người lập nghỉ, đơn nháp chờ Quản trị.
- **Thói quen cũ**: nhân viên Bán hàng quen "đơn mình lập là mình lo" — nay phải bấm "Nhận" (nói trong nhật ký thay đổi của lần phát hành).

## Phương án bị loại

- **Giữ tự gắn, chỉ làm danh sách chọn dễ thấy hơn (Q8).** Q8 vẫn làm (kế hoạch GĐ2), nhưng chủ muốn hướng dẫn viên là người nhận (Q7).
- **Bỏ tự gắn ngay, trước khi hướng dẫn viên mở được đơn.** Mọi đơn mới vào hàng "chưa có người" mà người được kỳ vọng nhận không thấy; chủ đã chọn "làm đúng thứ tự".
- **Chỉ bỏ tự gắn cho Bán hàng, giữ cho Quản trị.** Hai luật cho hai nhóm người lập, không có lý do nghiệp vụ.
- **Tự gắn người lập làm người phụ trách "tạm" rồi tự gỡ khi hướng dẫn viên nhận.** Trái LC-8 nếu làm như đổi người; và vẫn che nút "Nhận" (đơn có người rồi) — đúng điều chủ phàn nàn.

## Hệ quả

- **`src/modules/dispatch`:** gỡ `defaultHandlerStatement`, `defaultHandlerPartyId`; **`src/shared/router.ts`**, **`src/index.ts`**: gỡ `Ctx.defaultHandlerStatement` và `injected.defaultHandlerStatement`; **`src/modules/orders`**: route lập đơn không còn gộp câu đó.
- **`src/shared/permissions.ts`** (việc lớn): ô `dispatch.claim` của `FIELD` `none` → `any` — làm ở **bước trước** (cùng ADR-0017), không ở bước ADR-0020.
- **Bài kiểm đảo có chủ đích (đỏ → xanh):** `tests/e2e/dispatch.mjs` bước 1 ("đơn mới: người lập là người phụ trách") đảo thành "đơn mới không có dòng `HANDLE` nào"; các bước sau dựa vào "người lập là người phụ trách" thêm một lần **bấm Nhận** ngay sau khi tạo đơn; hàm `dropHandler` (đóng dòng bằng SQL để giả đơn chưa có người) không còn cần. Rà thêm: `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs`, `tests/e2e/orders.mjs` (người phụ trách khác người lập), `tests/e2e/permissions.mjs`, `src/modules/orders/dashboard.test.ts`.
- **Trang chủ:** ô "Chưa phụ trách" đếm cả đơn nháp (M1 = A); truy vấn ở `src/modules/orders/repository.ts` (đếm hôm nay chỉ đơn đã xác nhận) và `dashboard.test.ts` đổi theo, test đỏ trước.
- **Biên nhận:** điều 9 — `src/shared/order-confirmation.ts` (+ test), `docs/CHANGE-GUIDE.md` công thức p, `docs/SYSTEM-DESIGN.md` đoạn "Ảnh xác nhận đơn".
- **Nhật ký thay đổi** của lần phát hành nói bằng lời thường: "Đơn mới chưa có người phụ trách. Hướng dẫn viên (hoặc chính bạn) bấm Nhận để lo đơn."
- **Khoảng trống để lại cho mô hình vai:** Kế toán/Thực tập "nhận đơn mình lập" (ADR-0018 điều 7) mất đường thực hiện — xem bảng "Sửa những câu nào"; kế hoạch giai đoạn 2 của mô hình vai phải chọn cách.
- **Tiền điều kiện vận hành:** có ít nhất một tài khoản hướng dẫn viên **đang hoạt động, có hồ sơ** trên production (truy vấn chỉ đọc ở kế hoạch). Không có ⇒ không phát hành ADR-0020.
- Không migration. Không đổi quyền của tài khoản nào.

## Câu hỏi mở (trình cùng ADR này ở lượt duyệt sau — chưa hỏi chủ ở lượt ADR-0019)

> **Đã trả lời 2026-09-25:** M1 = **A** (xem điều 7). Giữ nguyên văn câu hỏi dưới đây làm lịch sử.

**M1 — Trong lúc chưa có "hạn nhận 15 phút" (giai đoạn 5 của mô hình vai), đơn không ai bấm Nhận thì sao?**
- **A (khuyến nghị):** không đặt hạn tạm; ô "Chưa phụ trách" trên Trang chủ đếm cả đơn nháp lẫn đơn đã xác nhận chưa có người (hôm nay chỉ đếm đơn đã xác nhận — `src/modules/orders/repository.ts:462`), chữ phụ "Chờ người nhận". Được: làm nhanh, ai cũng thấy số đơn chờ. Mất: không ai bị nhắc riêng.
- **B:** chưa bỏ việc tự gắn cho tới khi có hạn nhận thật. Được: không đơn nào vô chủ. Mất: hướng dẫn viên chưa là người nhận mặc định như chủ muốn.
- **C:** như A, thêm tô đỏ đơn chưa có người mà ngày đi là hôm nay hoặc ngày mai. Được: cảnh báo đúng chỗ gấp. Mất: thêm một ít việc, sẽ thay bằng hạn thật sau.
