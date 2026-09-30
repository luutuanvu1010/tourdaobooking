# ĐỀ XUẤT ADR-0067 — Bộ lọc đơn: chọn từng người lập (danh sách người đã lập đơn cho người xem mọi đơn)

- **Trạng thái:** **ĐÃ DUYỆT 2026-09-30** — chủ dự án trả lời trong chat 30/9 (hộp hỏi, điều phối chép nguyên văn lựa chọn): *"Duyệt, thi công luôn"*; Câu 1 người đã nghỉ: *"Hiện, không đánh dấu"*; Câu 2 Đối tác: *"Chung, không nhãn"*; chấp nhận cách thử phá đổi tạm ô `money.view` trong bản đồ của khung thử (tiêu chí 8). Văn bản quyết định: `docs/adr/ADR-0067-loc-don-theo-nguoi-lap.md`. Số 0067 do điều phối chung cấp (0066 là Trợ lý AI). Người kiểm độc lập chỉ-đọc vòng 1: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo (VỪA-1, THẤP-1..3, hai lệch dòng) — bản sửa chưa được kiểm lại. AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2).
- **Ngày:** 2026-09-30.
- **Lời chủ (nguồn):** chat 30/9, hộp hỏi về bộ lọc danh sách đơn, ô "Người lập": *"Có, cho người xem mọi đơn"* — cho CHỌN TỪNG NHÂN VIÊN, áp cho người có `order.view` = any (Bán hàng, Kế toán, Quản trị, Toàn quyền).
- **Loại:** **hai chiều** — không bảng, không cột, không migration, không mã quyền mới, không ô quyền mới; rút lại = gỡ một route đọc và đổi ô chọn về hai lựa chọn cũ.
- **Sửa ADR:** không thay câu nào của ADR nào. Bổ sung cho bộ lọc đơn nhiều điều kiện (góp ý T4, bản 1.42 — `src/shared/loc-don.ts`).
- **Hiến chương áp:** 4.4 (hình chiếu có lọc: danh sách trường dựng mới — áp tinh thần cho phản hồi nội bộ), 5.3 (module sở hữu bảng; đọc xuyên module qua view công bố), 5.12 (không ghi nhật ký — route chỉ đọc).
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` `phat_hien` = `[]`, kiểm 30/9).
- **Trang ghép (CLAUDE.md §9):** không cần — một quyết định, không bảng dùng chung nhận loại dữ liệu mới.
- **Mã đo** trên `main` @ `5f6fcbc2` (bản 1.44).

## Tóm tắt (lời thường)
Ở màn Đơn hàng, ô "Người lập" hiện chỉ có "Mọi người / Đơn tôi lập". Đã duyệt: thêm một đường đọc nhỏ trả **danh sách những người đã từng lập đơn** (chỉ mã + tên, không SĐT, không vai), chỉ cho Bán hàng, Kế toán, Quản trị, Toàn quyền. Ô "Người lập" thành ô chọn có gõ tìm. Không lộ thêm gì: tên người lập những người này **đã thấy** trên từng thẻ đơn và đã tìm được bằng ô tìm kiếm.

## Bối cảnh (đo mã thật)
- **Máy chủ đã lọc được theo người lập:** `docLocDon` đọc `nguoiLap` (một mã, dạng `^[A-Za-z0-9-]{1,64}$`) — `src/shared/loc-don.ts:14-15`, `:41-43`; `listOrders` thêm `o.staff_id = ?` **AND** với phạm vi xem — `src/modules/orders/repository.ts:470-473`; phạm vi (own/assigned) đặt trước ở `:453-462`.
- **Màn chưa có nguồn danh sách:** `web/orders.ts:358-362` (chỉ "Mọi người" / "Đơn tôi lập"); bộ lọc màn giữ `cuaToi: boolean` — `src/shared/loc-don.ts:48-57`, `thamSoLocDon` đổi `cuaToi` thành `nguoiLap = toiId` — `:60-68`; nhớ bộ lọc của tài khoản khác thì tắt ô — `web/orders.ts:413`.
- **Không có API danh sách người cho Bán hàng/Kế toán:**
  - `GET /api/staff` — cổng `admin` + `admin.manage` (`src/modules/accounts/index.ts:331-337`), có SĐT.
  - `GET /api/dispatch/assignees` — cổng `office` nhưng thân đòi `dispatch.assign` với `ownerId` = mình (`src/modules/dispatch/index.ts:123-130`) ⇒ Kế toán 403 (ô `dispatch.assign` ACCOUNTING = none, `src/shared/permissions.ts:90`). Tập trả là **người giao việc được** (lọc `checkAssignee`: bỏ Đối tác, người không hoạt động…), kèm `roleLabel` — sai tập cho việc lọc người lập.
- **Tên người lập đã lộ sẵn cho đúng những người này:**
  - Thẻ đơn: `web/order-card.ts:176` ("Người lập: …", không điều kiện vai); chi tiết đơn: `web/order.ts:545` ("Lập … bởi …").
  - DTO danh sách có `staffName` (`src/shared/contracts.ts:224`, dựng ở `src/modules/orders/repository.ts:429`); **không** có `staffId` (cố ý hẹp).
  - Ô tìm kiếm tự do đã khớp tên người lập: `s.label LIKE ?` — `src/modules/orders/repository.ts:490`.
  - Tên lấy từ view công bố `v_stf_staff_label (id, label, active, party_id)` — `migrations/0012_staff_permissions_party.sql:38-40`; `orders` đã JOIN view này (`src/modules/orders/repository.ts:73-74`) ⇒ **không thêm cạnh xuyên module**.
- **Phạm vi "xem mọi đơn"** ở `GET /api/orders`: `can(order.view)` không ngữ cảnh, **kèm** `money.view` và `contact.view` không ngữ cảnh — `src/modules/orders/index.ts:479-486`. Ô `order.view` (`src/shared/permissions.ts:72`): SALES any, ACCOUNTING any, ADMIN any, FIELD assigned, PARTNER own, SUPER_ADMIN any, INTERN own, DRIVER none, DRIVER_PARTNER none. Cổng `orders` = SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN (`src/shared/permissions.ts:227`).
- **Bộ định tuyến lấy route KHỚP ĐẦU TIÊN theo thứ tự khai** (`src/shared/router.ts:208-213`, `match` ở `:118-133`): đường tĩnh `/api/orders/<chữ>` phải khai **trước** `/api/orders/:id` (khuôn sẵn: `dashboard` `:437`, `pool` `:451`, `moc-toi-thieu` `:463` đều trước `:id` ở `src/modules/orders/index.ts:541`).
- **Chi phí truy vấn:** câu `GROUP BY o.staff_id` quét **toàn bảng** `orders` (có chỉ mục `idx_orders_staff ON orders(staff_id)` — `migrations/0003_orders.sql:22` — nhưng vẫn đi qua mọi đơn). Chấp nhận được vì chỉ gọi **một lần khi mở bảng lọc lần đầu**, giữ kết quả trong trang (không gọi lại mỗi lần lọc). Chưa đo thời gian trên dữ liệu thật.
- **`orders` chưa là module "nghiêm":** còn trong danh sách ngoại lệ `LEGACY` (`src/architecture.test.ts:84-85`) — SQL của `orders` chưa đăng ký `defineSql`/bài `EXPLAIN`; câu mới theo khuôn hiện có của `orders/repository.ts`.
- **Quy mô:** bộ nhớ dự án ghi ~30 nhân viên + tới ~1000 tài khoản đối tác (ADR-0014). **Chưa đo** số người lập đơn thật trên production (người soạn không được đọc D1 remote).

## Các phương án

| | (a) Route đọc mới "người đã lập đơn" | (b) Thêm `staffId` vào DTO danh sách, dựng ở trình duyệt | (c1) Mở `/api/dispatch/assignees` cho Kế toán | (c2) Chỉ dùng ô tìm tự do `q` |
|---|---|---|---|---|
| Danh sách đầy đủ? | Có — mọi người đã lập ít nhất một đơn | **Không** — danh sách đơn phân trang (30, tối đa 100 — `src/modules/orders/index.ts:494`), ô chọn chỉ có người lập của trang đang tải | Sai tập: thiếu Đối tác, Thực tập, người đã nghỉ; thừa người chưa lập đơn nào | Có, nhưng không chính xác: `q` khớp cả tên khách, SĐT, mã đơn |
| Lộ thêm? | Không (xem mục Lộ tên) | Thêm `staffId` vào mọi thẻ (DTO cố ý hẹp) | `roleLabel` — lộ vai (Toàn quyền là vai ẩn, ADR-0042/0044); nới ô `dispatch.assign` cho Kế toán hoặc tách luật route | Không |
| Đụng module/quyền | `orders` thêm 1 route đọc, không ô quyền mới | `orders` đổi hợp đồng DTO | `dispatch` đổi luật route đã chốt ở ADR-0019 điều 2 | Không |
| Đáp ứng lời chủ "chọn từng nhân viên" | Có | Nửa vời | Sai người | Không |

**Chọn (a).** Lý do: là cách duy nhất cho danh sách **đúng và đủ**; dữ liệu trả về là **hình chiếu** của điều người xem đã thấy (không mở quyền mới); đặt ở module chủ bảng `orders`, đọc view đã dùng sẵn (5.3); không đổi luật đã chốt của `dispatch`.

## Quyết định
1. **Route đọc mới của `orders`** (tên tạm): `GET /api/orders/nguoi-lap`, cổng `orders`. Khai **trước** `GET /api/orders/:id` (router khớp đầu tiên).
2. **Hỏi quyền trong thân, TRƯỚC mọi truy vấn — y hệt nhánh "xem mọi đơn" của `GET /api/orders`:** `can(staff, "order.view")`, `can(staff, "money.view")`, `can(staff, "contact.view")`, cả ba **không truyền ngữ cảnh** ⇒ chỉ ô `any` qua. Sai một ⇒ 403 (cùng mã/câu với `FORBIDDEN_VIEW` của danh sách đơn).
   - Lý do chọn ba ô (không chỉ `order.view` như `/api/dispatch/handlers`): **tập người nhận danh sách phải bằng đúng tập người dùng được bộ lọc** "mọi người" của danh sách đơn. Hôm nay hai tập trùng nhau; ghép cứng bằng bài ghim (Hệ quả) để sau này đổi một bên thì bên kia đỏ. Chi phí: không có (ba ô đều any ở cùng bốn quyền).
3. **Danh sách trường dựng mới (danh sách trắng):** `{ nguoiLap: [{ id, ten, ganNhat }] }`.
   - `id` = `orders.staff_id`; `ten` = `v_stf_staff_label.label` (có thể là "(chưa có hồ sơ)" — nguyên văn như thẻ đơn).
   - Phản hồi thêm `ganNhat` (ngày dân sự VN của đơn gần nhất, `YYYY-MM-DD`) — chỉ để phân biệt tên trùng (A-7); không phải số liệu nhân sự mới (ngày lập đơn đã hiện trên thẻ đơn, `web/order-card.ts:177`).
   - Tập = **DISTINCT người lập của mọi đơn** (mọi trạng thái, kể cả nháp và đã huỷ — vì danh sách đơn của người xem mọi đơn cũng gồm các đơn đó).
   - Thứ tự: theo **đơn gần nhất của người đó, mới trước** (`MAX(o.created_at) DESC`), rồi theo tên. Người đang làm tự nổi lên đầu; người đã nghỉ tự chìm xuống — không cần cờ.
   - **Không bao giờ:** SĐT, email, trạng thái hoạt động/nghỉ (`active`), mã quyền, nhãn vai, `party_id`, số đơn, tiền.
4. **Không nhật ký** (route chỉ đọc, 5.12 không áp).
5. **Giao diện:** ô "Người lập" chỉ hiện khi `seesAllOrders(me)` (như nay, `web/orders.ts:359`). Lựa chọn: "Mọi người", "Đơn tôi lập" (lối tắt ở đầu = chính mình), rồi danh sách người lập **bỏ chính người đang xem** (đã có ở lối tắt; tránh hai dòng cho cùng một người). Vì danh sách có thể dài (đối tác), dùng **ô chọn có gõ tìm** (lọc tại chỗ theo tên, không dấu cũng khớp) — không dùng `<select>` trơn trên iPhone. Tải danh sách **khi mở bảng lọc** lần đầu (không chặn tải danh sách đơn).

## Lộ tên — phân tích
- **Nhân viên nội bộ:** tên đã hiện trên mọi thẻ đơn và chi tiết đơn cho bốn quyền này, và đã tìm được bằng ô tìm. Danh sách không thêm thông tin.
- **Tài khoản lai:** `can()` hợp các ô. SALES + FIELD ⇒ any ⇒ thấy (đúng, người này đã xem mọi đơn). FIELD + INTERN ⇒ assigned ∪ own ⇒ 403. SALES + PARTNER (còn gán được qua đường quản trị cũ — `src/shared/permissions.ts:248-254`) ⇒ thấy, nhất quán với việc tài khoản đó hôm nay đã xem được mọi đơn; ADR này không làm lỗ đó rộng hơn.
- **Nhân viên đã nghỉ:** vẫn có trong danh sách (đơn cũ của họ vẫn hiện, lọc được là có ích). Không kèm cờ "đã nghỉ": trạng thái tài khoản là thông tin nhân sự **mới** với Bán hàng/Kế toán (thẻ đơn không hiện). **Chủ chốt Câu 1 = A** ("Hiện, không đánh dấu").
- **Người lập là Đối tác:** Bán hàng hôm nay **đã thấy** tên tài khoản Đối tác trên thẻ đơn của đơn Đối tác lập (thẻ không phân biệt vai — `web/order-card.ts:176`; tên từ hồ sơ người của tài khoản, `v_stf_staff_label`). Danh sách chung không lộ thêm. Nhưng vì **không** kèm nhãn vai, người xem không phân biệt được ai là Đối tác trong danh sách. **Chủ chốt Câu 2 = A** ("Chung, không nhãn").
- **Toàn quyền (vai ẩn, ADR-0042/0044):** danh sách chỉ có tên, không vai ⇒ không lộ vai. Tên tài khoản của chủ hiện trong danh sách là **giới hạn đã được chấp nhận** ở ADR-0042 điều 4: *"tên tài khoản của chủ vẫn hiện ở đơn chủ lập/phụ trách"* (`docs/adr/ADR-0042-quan-tri-lay-lai-dang-nhap-cap-duoi-toan-quyen-la-vai-an.md:22`) — danh sách không lộ gì hơn.
- **Trùng tên / nhiều "(chưa có hồ sơ)":** hai người cùng tên, hoặc nhiều tài khoản chưa có hồ sơ cùng nhãn "(chưa có hồ sơ)", sẽ không phân biệt được nếu chỉ có tên. Cách hiện phân biệt đơn giản: **chỉ khi tên trùng** trong danh sách, kèm ngày đơn gần nhất của người đó (vd "Nguyễn Văn A · đơn gần nhất 28/09") — xem A-7.

## Bảng quyền (9 quyền app)

| Quyền | Gọi route | Căn cứ |
|---|---|---|
| SALES | **200** | `order.view`, `money.view`, `contact.view` đều any |
| ACCOUNTING | **200** | như trên |
| ADMIN | **200** | như trên |
| SUPER_ADMIN | **200** | như trên |
| FIELD (HDV) | 403 | `order.view` = assigned (không ngữ cảnh ⇒ sai) |
| PARTNER | 403 | `order.view` = own |
| INTERN | 403 | `order.view` = own |
| DRIVER | 403 ở cổng | không thuộc `ORDERS_GATE` |
| DRIVER_PARTNER | 403 ở cổng | không thuộc `ORDERS_GATE` |

Tài khoản lai: như mục "Lộ tên".

## Phương án bị loại (tóm tắt lý do)
- **(b)** danh sách thiếu (phân trang), nới DTO danh sách đơn vốn cố ý không có `staffId` (`src/shared/contracts.ts:224`).
- **(c1)** sai tập người, kèm nhãn vai (lộ vai ẩn), phải đổi luật route của `dispatch` đã chốt ở ADR-0019 điều 2.
- **(c2)** đã có sẵn nhưng không chính xác; giữ nguyên, không thay ô chọn.
- **Mở `/api/staff` cho người xem mọi đơn:** có SĐT, cổng quản trị; nới là ngược chiều mặc định từ chối.

## Hệ quả — mã, test, hàng rào
- **Không migration.** Một câu SQL mới trong `orders` (repository): `SELECT o.staff_id AS id, s.label AS ten, MAX(o.created_at) AS gan_nhat FROM orders o JOIN v_stf_staff_label s ON s.id = o.staff_id GROUP BY o.staff_id ORDER BY gan_nhat DESC, s.label` (dạng tạm; trả `id`, `ten`, `ganNhat` đổi sang ngày VN). `orders` còn ở `LEGACY` (`src/architecture.test.ts:84-85`) nên không bắt buộc `defineSql`; nếu phiên thi công chuyển `orders` sang STRICT thì câu này đi theo.
- **Hợp đồng:** `NguoiLapResponse { nguoiLap: { id: string; ten: string; ganNhat: string }[] }` trong `src/shared/contracts.ts` (khai từng khoá).
- **Phía màn (đổi hợp đồng thuần):** `LocDonMan.cuaToi: boolean` → `nguoiLap: string | null` (`src/shared/loc-don.ts:48-57`); `thamSoLocDon` gửi thẳng `nguoiLap`; bộ lọc nhớ cũ `cuaToi: true` phải đọc thành `nguoiLap = mã chính mình` (không làm mất bộ lọc đã nhớ); chip "đang lọc" cần tên — lấy từ danh sách, **thiếu tên** (danh sách chưa tải / id không còn) thì hiện "Người lập đã chọn", không hiện mã thô. Giữ luật `web/orders.ts:413` (bộ lọc nhớ của tài khoản khác: bỏ ô người lập khi người xem không xem mọi đơn; mở rộng: id nhớ khác chính mình mà người xem không xem mọi đơn ⇒ bỏ).
- **Test (đỏ trước, xanh sau):**
  - `src/shared/loc-don.test.ts`: chuyển đổi bộ lọc nhớ cũ; `thamSoLocDon` với `nguoiLap`; chip khi thiếu tên.
  - Route (test khung module orders): 9 quyền + lai (SALES+FIELD 200; FIELD+INTERN 403; DRIVER 403); danh sách chỉ có khoá `id`, `ten`, `ganNhat` (bài liệt kê khoá, không `phone`, `active`, `permissions`, `roleLabel`); người đã nghỉ có mặt; người chưa lập đơn không có mặt; 403 đứng trước mọi truy vấn.
  - **Bài ghim mới — bài HÀNH VI** (không sửa `GET /api/orders` hay dashboard; không tách hàm dùng chung): theo khuôn bài "cả 512 tập con quyền" hiện có (`src/shared/permissions.test.ts:273`), với **mọi tập con** của 9 mã quyền, gọi thật hai route trên khung thử của module `orders`: `GET /api/orders/nguoi-lap` trả 200 **⇔** `GET /api/orders` đi nhánh "xem mọi đơn" (`seesAll` — nhận diện bằng kết quả: thấy được đơn do người khác lập mà không phụ trách). So kết quả gọi thật, không so mã nguồn.
  - **Phạm vi không nới:** tài khoản Đối tác gọi `GET /api/orders?nguoiLap=<người khác>` ⇒ danh sách **rỗng** (phạm vi `own` ở `repository.ts:453-462` AND bộ lọc ở `:470-473`); HDV với `nguoiLap` bất kỳ chỉ ra đơn đang phụ trách.
  - e2e (tên tạm `tests/e2e/loc-nguoi-lap.mjs`): Bán hàng và Đối tác mỗi người lập một đơn → Kế toán gọi route thấy cả hai tên → lọc theo Đối tác ra đúng đơn đó; HDV, Thực tập gọi route ⇒ 403.
  - Kịch bản Chrome màn Đơn hàng: chọn một người từ ô gõ tìm → chip đúng tên → danh sách chỉ đơn người đó (tài khoản cần xem mở **sau cùng** — bẫy kho cookie chung).
- **Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md`:** bài ghim hành vi "route mới 200 ⇔ nhánh xem mọi đơn" (mọi tập con quyền) và bài liệt kê khoá DTO — ghi "chưa quan sát chặn" tới khi thi công sửa cố ý → đỏ → hoàn nguyên.
- **Hàng rào có sẵn phải xanh:** `src/permission-enforcement.test.ts` (không ô mới), `src/architecture.test.ts` (không cạnh mới).
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` §7 (route mới); `docs/CHANGE-GUIDE.md` (bộ lọc đơn); trợ giúp theo vai nếu có nhắc ô "Người lập".

## Tiêu chí nghiệm thu
1. Kế toán mở bảng lọc ở màn Đơn hàng ⇒ ô "Người lập" có "Mọi người", "Đơn tôi lập" và tên từng người đã lập đơn (kể cả Đối tác, người đã nghỉ); gõ vài chữ của tên (không dấu cũng được) thì lọc được danh sách.
2. Chọn một người ⇒ danh sách đơn chỉ còn đơn người đó lập; chip ghi đúng tên; bỏ chip ⇒ trở về mọi đơn.
3. Bán hàng, Quản trị, Toàn quyền: như 1–2. Tài khoản lai Bán hàng + HDV: như 1–2.
4. HDV, Đối tác, Thực tập: ô "Người lập" không hiện; gọi thẳng route ⇒ 403. Tài xế công ty, Tài xế đối tác gọi thẳng ⇒ 403.
5. Phản hồi route chỉ có khoá `id`, `ten`, `ganNhat` cho mỗi người (bài quét tự động): không SĐT, email, trạng thái nghỉ, vai.
6. Đối tác gọi `GET /api/orders?nguoiLap=<mã người khác>` ⇒ danh sách rỗng.
7. Bộ lọc "Đơn tôi lập" đã nhớ trên máy từ bản cũ ⇒ sau khi cập nhật vẫn lọc đúng đơn của chính mình.
8. Thử phá: bỏ tạm câu hỏi `money.view` khỏi route mới ⇒ bài ghim hành vi đỏ (quan sát chặn một lần, P16), rồi hoàn nguyên. *(Hôm nay ô `money.view` trùng `order.view` ở mọi mã nên để thấy đỏ, lúc thử phá kèm đổi tạm một ô `money.view` trong bản đồ của khung thử — ghi rõ cách làm vào sổ hàng rào. Chủ đã chấp nhận cách này 30/9.)*

## Điểm AI thêm ngoài lời chủ (chủ đã duyệt kèm — "Duyệt, thi công luôn")
- **A-1:** Danh sách chỉ gồm người **đã từng lập đơn** (không phải mọi tài khoản) — người chưa lập đơn thì lọc ra rỗng, vô ích.
- **A-2:** Chỉ trả **mã + tên** (+ ngày đơn gần nhất để phân biệt tên trùng, A-7); không nhãn vai (tránh lộ vai ẩn Toàn quyền, ADR-0042/0044), không trạng thái nghỉ.
- **A-3:** Xếp theo **đơn gần nhất** (mới trước) thay vì theo tên — người đang làm nổi lên đầu, người đã nghỉ chìm xuống mà không cần đánh dấu.
- **A-4:** Giữ lựa chọn "Đơn tôi lập" làm lối tắt ở đầu ô, và bỏ chính người đang xem khỏi danh sách bên dưới.
- **A-5:** Ô **gõ tìm** thay cho ô chọn trơn, vì số tài khoản Đối tác có thể lớn (chưa đo số thật).
- **A-6:** Cổng route = đúng ba câu hỏi quyền của nhánh "xem mọi đơn" (không chỉ `order.view`), ghép bằng bài ghim hành vi trên mọi tập con quyền.
- **A-7:** Tên trùng (kể cả nhiều "(chưa có hồ sơ)") ⇒ kèm ngày đơn gần nhất cạnh tên để phân biệt; tên không trùng thì chỉ hiện tên.

## Câu đã hỏi chủ (ĐÃ CHỐT 30/9: Câu 1 = A, Câu 2 = A)
**Câu 1 — Người đã nghỉ việc có hiện trong ô "Người lập" không, và có đánh dấu không?**
- **A — CHỦ CHỌN** ("Hiện, không đánh dấu"): tự xuống cuối danh sách (xếp theo đơn gần nhất). Lọc được đơn cũ của họ; không cho Bán hàng/Kế toán biết ai đã nghỉ.
- B: Hiện, tách nhóm "Đã nghỉ việc" ở cuối. Dễ nhìn hơn; nhưng Bán hàng/Kế toán thấy được ai đã nghỉ (thông tin nhân sự mới với họ).
- C: Ẩn người đã nghỉ. Danh sách gọn; nhưng không lọc được đơn cũ của họ (vẫn tìm bằng ô tìm kiếm được).

**Câu 2 — Tài khoản Đối tác có nằm chung trong ô "Người lập" không?**
- **A — CHỦ CHỌN** ("Chung, không nhãn"): Chung một danh sách, không nhãn. Tên Đối tác hôm nay đã hiện trên thẻ đơn cho Bán hàng/Kế toán, nên không lộ thêm; làm nhanh nhất.
- B: Tách nhóm "Đối tác" riêng. Dễ phân biệt; nhưng phải cho phần đơn hàng đọc thêm thông tin quyền của tài khoản (một đường đọc mới giữa hai phần của hệ thống — hôm nay phần đơn hàng không đọc quyền của ai) và lộ vai của từng người.
- C: Chỉ nhân viên nội bộ, bỏ Đối tác. Danh sách ngắn; nhưng không lọc được đơn do Đối tác lập — và cũng phải đọc thông tin quyền như B.
