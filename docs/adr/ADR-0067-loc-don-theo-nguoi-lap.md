# ADR-0067 — Bộ lọc đơn: chọn từng người lập, cho người xem được mọi đơn

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 (hộp hỏi; điều phối chung chép nguyên văn lựa chọn): *"Duyệt, thi công luôn"*; Câu 1 (người đã nghỉ việc): *"Hiện, không đánh dấu"*; Câu 2 (tài khoản Đối tác): *"Chung, không nhãn"*; chấp nhận cách thử phá bài ghim bằng đổi tạm ô `money.view` trong bản đồ của khung thử. Nguyên tắc chủ chốt trước đó (hộp hỏi bộ lọc đơn, 30/9): *"Có, cho người xem mọi đơn"*. Hồ sơ trình: `docs/superpowers/specs/2026-09-30-de-xuat-adr-0067-nguoi-lap.md`. Người kiểm độc lập chỉ-đọc vòng 1: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo (bản sửa chưa được kiểm lại). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-30.
- **Loại:** **hai chiều** — không bảng, không cột, không migration, không mã quyền, không ô quyền mới; rút lại = gỡ một route đọc và đưa ô "Người lập" về hai lựa chọn cũ.
- **Sửa ADR:** không thay câu nào. Bổ sung cho bộ lọc đơn nhiều điều kiện (góp ý T4, bản 1.42 — `src/shared/loc-don.ts`).
- **Hiến chương áp:** 4.4 (danh sách trường dựng mới), 5.3 (module chủ bảng; đọc xuyên module qua view công bố), 5.12 (route chỉ đọc — không nhật ký).
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` `phat_hien` = `[]`, kiểm 30/9).
- **Mã đo** trên `main` @ `5f6fcbc2` (bản 1.44).
- **Điểm chi tiết do AI thêm, chủ đã duyệt kèm:** A-1 … A-7 (hồ sơ trình, mục "Điểm AI thêm").

## Tóm tắt (lời thường)
Bán hàng, Kế toán, Quản trị, Toàn quyền lọc được danh sách đơn theo **từng người lập**. Ô "Người lập" có "Mọi người", "Đơn tôi lập", rồi tên những người đã từng lập đơn — kể cả Đối tác và người đã nghỉ, không nhãn, không đánh dấu; gõ tên để tìm. Không lộ thêm gì: tên người lập những người này đã thấy trên từng thẻ đơn. Hướng dẫn viên, Đối tác, Thực tập, Tài xế không có ô này.

## Bối cảnh
- Máy chủ đã lọc được theo người lập (`nguoiLap` — `src/shared/loc-don.ts:41-43`; `src/modules/orders/repository.ts:470-473`, AND với phạm vi xem ở `:453-462`). Màn chỉ có "Mọi người / Đơn tôi lập" (`web/orders.ts:358-362`) vì Bán hàng/Kế toán không có nguồn danh sách người: `GET /api/staff` chỉ quản trị và có SĐT (`src/modules/accounts/index.ts:331-337`); `GET /api/dispatch/assignees` đòi `dispatch.assign` (Kế toán 403) và trả sai tập (người giao việc được, kèm nhãn vai — `src/modules/dispatch/index.ts:123-130`).
- Tên người lập đã hiện cho đúng bốn quyền này: thẻ đơn `web/order-card.ts:176`, chi tiết đơn `web/order.ts:545`, ô tìm khớp tên người lập `src/modules/orders/repository.ts:490`. Tên đến từ view công bố `v_stf_staff_label` (`migrations/0012_staff_permissions_party.sql:38-40`) mà `orders` đã JOIN (`repository.ts:73-74`).
- Nhánh "xem mọi đơn" của `GET /api/orders` hỏi `order.view`, `money.view`, `contact.view` không ngữ cảnh (`src/modules/orders/index.ts:479-486`).
- Router lấy route khớp đầu tiên theo thứ tự khai (`src/shared/router.ts:208-213`).
- `orders` còn ở `LEGACY` (`src/architecture.test.ts:84-85`).

## Quyết định
1. **Route đọc mới của `orders`:** `GET /api/orders/nguoi-lap` (tên tạm), cổng `orders`, khai **trước** `GET /api/orders/:id`.
2. **Hỏi quyền trong thân, trước mọi truy vấn, y hệt nhánh "xem mọi đơn":** `can(staff, "order.view")`, `can(staff, "money.view")`, `can(staff, "contact.view")`, cả ba không ngữ cảnh. Sai một ⇒ 403 (cùng mã/câu với danh sách đơn). Lý do: tập người nhận danh sách phải bằng đúng tập người dùng được bộ lọc "mọi người".
3. **Danh sách trường dựng mới:** `{ nguoiLap: [{ id, ten, ganNhat }] }`.
   - `id` = `orders.staff_id`; `ten` = `v_stf_staff_label.label` (nguyên văn như thẻ đơn, kể cả "(chưa có hồ sơ)"); `ganNhat` = ngày dân sự VN của đơn gần nhất (chỉ để phân biệt tên trùng).
   - Tập = mọi người đã lập ít nhất một đơn (mọi trạng thái). **Người đã nghỉ việc có mặt, không đánh dấu** (chủ, Câu 1). **Đối tác chung một danh sách, không nhãn** (chủ, Câu 2).
   - Thứ tự: đơn gần nhất mới trước, rồi theo tên.
   - **Không bao giờ:** SĐT, email, trạng thái hoạt động/nghỉ, mã quyền, nhãn vai, `party_id`, số đơn, tiền.
4. **Không nhật ký** (chỉ đọc).
5. **Giao diện:** ô chỉ hiện khi `seesAllOrders(me)`. Lựa chọn: "Mọi người", "Đơn tôi lập" (lối tắt), rồi danh sách **bỏ chính người đang xem**. Ô chọn có gõ tìm (không dấu cũng khớp). Tên trùng ⇒ kèm "đơn gần nhất dd/mm" cạnh tên. Tải danh sách một lần khi mở bảng lọc lần đầu, giữ trong trang. Chip "đang lọc" hiện tên; thiếu tên thì "Người lập đã chọn", không hiện mã thô.

## Bảng quyền (9 quyền app)

| Quyền | Gọi route / có ô "Người lập" | Căn cứ |
|---|---|---|
| SALES | Có (200) | `order.view`, `money.view`, `contact.view` đều any |
| ACCOUNTING | Có (200) | như trên |
| ADMIN | Có (200) | như trên |
| SUPER_ADMIN | Có (200) | như trên |
| FIELD (HDV) | **Không** (403) | `order.view` = assigned |
| PARTNER | **Không** (403) | `order.view` = own |
| INTERN | **Không** (403) | `order.view` = own |
| DRIVER | **Không** (403 ở cổng) | không thuộc `ORDERS_GATE` |
| DRIVER_PARTNER | **Không** (403 ở cổng) | không thuộc `ORDERS_GATE` |

Tài khoản lai: `can()` hợp các ô — SALES + FIELD thấy; FIELD + INTERN không. **Chấp nhận có chủ ý:** SALES + PARTNER (còn gán được qua đường quản trị cũ — `src/shared/permissions.ts:248-254`) thấy, nhất quán với việc tài khoản đó hôm nay đã xem được mọi đơn; ADR này không làm lỗ đó rộng hơn. Tên tài khoản của chủ (Toàn quyền, vai ẩn) có trong danh sách — giới hạn đã chấp nhận ở ADR-0042 điều 4 (`docs/adr/ADR-0042-quan-tri-lay-lai-dang-nhap-cap-duoi-toan-quyen-la-vai-an.md:22`); danh sách không có vai nên không lộ vai.

## Phương án bị loại
- **(b) Thêm `staffId` vào DTO danh sách, dựng ở trình duyệt:** danh sách đơn phân trang (`src/modules/orders/index.ts:494`) ⇒ ô chọn chỉ có người lập của trang đang tải; nới DTO vốn cố ý hẹp (`src/shared/contracts.ts:224`).
- **(c1) Mở `/api/dispatch/assignees` cho Kế toán:** sai tập người, kèm nhãn vai (lộ vai ẩn), đổi luật route đã chốt ở ADR-0019 điều 2.
- **(c2) Chỉ dùng ô tìm tự do:** đã có nhưng khớp cả tên khách, SĐT, mã đơn — giữ nguyên, không thay ô chọn.
- **Mở `GET /api/staff`:** có SĐT, cổng quản trị — ngược chiều mặc định từ chối.

## Hệ quả — mã, test, hàng rào
- **Không migration.** Một câu SQL mới trong `orders/repository.ts`: `orders` JOIN `v_stf_staff_label`, `GROUP BY o.staff_id`, `MAX(o.created_at)` (quét toàn bảng, gọi một lần khi mở bảng lọc; chưa đo trên dữ liệu thật). `orders` ở `LEGACY` ⇒ không bắt buộc `defineSql`.
- **Hợp đồng:** `NguoiLapResponse` trong `src/shared/contracts.ts`; `LocDonMan.cuaToi` → `nguoiLap: string | null` (`src/shared/loc-don.ts:48-57`), bộ lọc nhớ cũ `cuaToi: true` đọc thành mã chính mình; giữ luật `web/orders.ts:413`.
- **Test (đỏ trước, xanh sau):**
  - `src/shared/loc-don.test.ts`: chuyển bộ lọc nhớ cũ; `thamSoLocDon` với `nguoiLap`; chip khi thiếu tên.
  - Route: 9 quyền + lai; bài liệt kê khoá (`id`, `ten`, `ganNhat` — không `phone`, `active`, `permissions`, `roleLabel`); người đã nghỉ có mặt; người chưa lập đơn vắng; 403 trước mọi truy vấn.
  - **Bài ghim hành vi mới** (không sửa `GET /api/orders` hay dashboard): theo khuôn "cả 512 tập con quyền" (`src/shared/permissions.test.ts:273`), với mọi tập con gọi thật hai route: `GET /api/orders/nguoi-lap` 200 ⇔ `GET /api/orders` đi nhánh xem mọi đơn.
  - Phạm vi không nới: Đối tác gọi `GET /api/orders?nguoiLap=<người khác>` ⇒ rỗng.
  - e2e (tên tạm `tests/e2e/loc-nguoi-lap.mjs`); kịch bản Chrome màn Đơn hàng (tài khoản cần xem mở sau cùng).
- **Hàng rào mới** ghi dòng ở `docs/SO-HANG-RAO.md`: bài ghim hành vi và bài liệt kê khoá — "chưa quan sát chặn" tới khi sửa cố ý → đỏ → hoàn nguyên.
- Tài liệu mô tả: `docs/SYSTEM-DESIGN.md` §7; `docs/CHANGE-GUIDE.md` (bộ lọc đơn); trợ giúp theo vai nếu nhắc ô "Người lập".

## Tiêu chí nghiệm thu
1. Kế toán mở bảng lọc ⇒ ô "Người lập" có "Mọi người", "Đơn tôi lập" và tên từng người đã lập đơn (kể cả Đối tác, người đã nghỉ — không nhãn, không đánh dấu); gõ vài chữ (không dấu cũng được) thì lọc được.
2. Chọn một người ⇒ chỉ còn đơn người đó lập; chip đúng tên; bỏ chip ⇒ trở về mọi đơn.
3. Bán hàng, Quản trị, Toàn quyền, tài khoản lai Bán hàng + HDV: như 1–2.
4. HDV, Đối tác, Thực tập: không có ô; gọi thẳng route ⇒ 403. Tài xế công ty, Tài xế đối tác ⇒ 403.
5. Phản hồi chỉ có khoá `id`, `ten`, `ganNhat` (bài quét tự động).
6. Đối tác gọi `GET /api/orders?nguoiLap=<mã người khác>` ⇒ rỗng.
7. Bộ lọc "Đơn tôi lập" đã nhớ từ bản cũ ⇒ sau cập nhật vẫn lọc đúng đơn của chính mình.
8. Thử phá: bỏ tạm câu hỏi `money.view` khỏi route mới **kèm** đổi tạm một ô `money.view` trong bản đồ của khung thử ⇒ bài ghim hành vi đỏ (P16), rồi hoàn nguyên; ghi cách làm vào sổ hàng rào.
