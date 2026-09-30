# ADR-0060 — Dấu "đã nhập phần mềm kế toán" + "Số hoá đơn đã nhập" trên đơn: bảng nhỏ chỉ-thêm của `billing`, ô ghi chỉ Kế toán + Toàn quyền

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 (hộp hỏi gom; điều phối chuyển lại nguyên văn): *"Duyệt cả ba, kèm 14 điểm chi tiết"* (ADR-0059, ADR-0060, ADR-0061 cùng điểm A-1…A-14 của hồ sơ trình); Q-2 *"Không"* (Đối tác không thấy dấu kế toán / số hoá đơn); Q-1 *"Giữ quyền sẵn, chờ việc C2"*. Nguyên tắc chủ đã chốt trước đó (góp ý người dùng, C4 lượt 2 + lượt 3): *"bảng nhỏ riêng của Kế toán (không dùng 'trường mở rộng tự do' — Hiến chương 5.2)"*; *"Kế toán + Toàn quyền; người khác chỉ xem"*. Hồ sơ trình + trang ghép: `docs/superpowers/specs/2026-09-30-de-xuat-adr-gop-y-d1-d3.md` (D2). Người kiểm độc lập chỉ-đọc hai vòng: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo cả hai vòng (bản sửa vòng 2 chưa được kiểm lại). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-30.
- **Loại:** **một chiều** ở phần bảng (tiền tố `bil_`, bảng chỉ-thêm có dữ liệu thì không gỡ được mà không dựng lại); hai ô quyền mới là hai chiều.
- **Sửa ADR:** **bổ sung** ADR-0024 (thêm một bảng vào danh sách bảng của `billing`); **không** sửa ADR-0004 (luồng yêu cầu xuất hoá đơn giữ nguyên).
- **Hiến chương áp:** 5.2, 5.3, 5.5, 5.12, 5.13.
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` `phat_hien` = `[]`, kiểm 30/9; ô `invoice.*` hoãn tới 2026-12-31 không được dùng).
- **Xây trên nền chưa gộp (5.13) — điều kiện bắt đầu thi công:** sổ tiền lượt 1 đã gộp `main` (module `billing`, hạng nghiêm, `STRICT`, cạnh `billing → orders, parties, staff, dispatch, audit` — ADR-0024 điều 2; kế hoạch `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md`).
- **Mã đo** trên `main` @ `836c8247` (bản 1.38).
- **Điểm chi tiết do AI thêm, chủ đã duyệt kèm:** A-3 (chỉ đánh dấu khi đơn đã xác nhận), A-4 (bỏ dấu phải có lý do), A-5 (ô xem riêng), A-6 (lọc bắt buộc kèm khoảng ngày), A-7 (Kế toán xem các lần đánh dấu trước), A-12 (nhãn trên thẻ danh sách đơn), A-13 (ô xem cho HDV đơn phụ trách, Thực tập đơn mình lập).

## Tóm tắt (lời thường)
Kế toán (và Toàn quyền) bấm một dấu "đã nhập phần mềm kế toán" trên đơn, kèm ô "Số hoá đơn đã nhập". Lưu ở một bảng nhỏ riêng của phần sổ tiền, **chỉ ghi thêm** (bỏ dấu, sửa số = thêm dòng mới; bỏ dấu phải ghi lý do). Người trong công ty xem được đơn thì thấy dấu; Đối tác không thấy. Văn phòng lọc được danh sách đơn "đã nhập / chưa nhập" trong một khoảng ngày. Đây là việc nội bộ Kế toán, **không** thay luồng "yêu cầu xuất hoá đơn" đã duyệt từ trước. Làm sau sổ tiền.

## Bối cảnh
- Góp ý YC-0011: Kế toán muốn đánh dấu đơn "đã nhập phần mềm kế toán" và ghi số hoá đơn đã nhập, để khỏi nhập trùng / sót.
- ADR-0004 (b) đã duyệt luồng **"yêu cầu xuất hoá đơn"** (chưa yêu cầu / cần xuất / đã xuất; Kế toán ghi số hoá đơn, ngày, người) — **chưa thi công**; ô `invoice.request`, `invoice.issue` (`src/shared/permissions.ts:95-96`) chưa có route, đang ở sổ hoãn `docs/quyen-hoan.json` (hạn 2026-12-31).
- ADR-0024 điều 4: `orders` **không bao giờ** đọc bảng `bil_`; màn đơn lấy số của `billing` qua route của `billing`.

## Quyết định
1. **Bảng mới** (tên tạm) `bil_accounting_entry` — module `billing`, **chỉ-thêm**:
   - `id` TEXT PK; `order_id` TEXT NOT NULL REFERENCES `orders(id)` (cạnh `billing → orders` đã có; `NO ACTION`, không `CASCADE`);
   - `entered` INTEGER NOT NULL `CHECK (entered IN (0, 1))` — 1 = đánh dấu đã nhập, 0 = bỏ dấu;
   - `invoice_number` TEXT NULL `CHECK (invoice_number IS NULL OR length(trim(invoice_number)) BETWEEN 1 AND 50)` — "Số hoá đơn đã nhập";
   - `reason` TEXT NULL — **bắt buộc khi bỏ dấu** (A-4): `CHECK (entered = 1 OR (reason IS NOT NULL AND length(trim(reason)) > 0 AND invoice_number IS NULL))`;
   - 4 cột dấu vết `created_at`, `created_by`, `updated_at`, `updated_by` (`updated_*` = `created_*`, như ADR-0026);
   - trigger `bil_accounting_entry_no_update`, `bil_accounting_entry_no_delete` (thông báo có tiền tố `bil_append_only:`);
   - chỉ mục `(order_id)`.
   - **Trạng thái hiện tại** của một đơn = dòng có `rowid` lớn nhất của đơn đó (không xếp theo `created_at` — hai lần ghi cùng mili-giây; tiền lệ R-BIL-1 của kế hoạch sổ tiền §3.2). Sửa số hoá đơn = thêm dòng `entered = 1` với số mới.
   - Không có "trường mở rộng tự do": hai trường có kiểu, có `CHECK` (Hiến chương 5.2).
2. **Ô ghi mới** (tên tạm) `accounting.entry.mark` — **không** dùng lại `invoice.issue`:
   - `invoice.issue` có Quản trị = `any` (`permissions.ts:96`), trái lời chủ ("Kế toán + Toàn quyền");
   - một mã một nghĩa (R-K1): `invoice.issue` là "đánh dấu hoá đơn đã xuất" của ADR-0004, việc khác;
   - `invoice.*` giữ nguyên trong `docs/quyen-hoan.json`, không đổi hạn.
3. **Route ghi** (module `billing`, cổng `office`): `POST /api/orders/:id/nhap-ke-toan` (tên tạm), thân `{ daNhap: boolean, soHoaDon?: string, lyDo?: string, truocDo: string | null }`.
   - `can(staff, "accounting.entry.mark")` (ô `any`, không phạm vi đơn).
   - **Đánh dấu** chỉ khi đơn `confirmed` (A-3; đọc `v_ord_order_state` — view của sổ tiền); **bỏ dấu** được ở mọi trạng thái (đơn huỷ sau khi đã nhập ⇒ Kế toán bỏ dấu kèm lý do).
   - **Chạy được sau "Đã giao" và sau "Hoàn thành"** — Kế toán thường nhập sau khi đơn xong. Route này thuộc `billing` nên **không** nằm trong danh sách "mọi route ghi của `orders`/`dispatch` từ chối sau Đã giao" (NT-F7 của kế hoạch sổ tiền); bảng ca của bài NT-F7 ghi rõ route này là "được phép sau Đã giao".
   - Khoá lạc quan: `truocDo` = id dòng hiện tại người dùng thấy (null = chưa có dòng); câu `INSERT … SELECT … WHERE (id dòng rowid lớn nhất của đơn) IS ?` ⇒ thua thì 409 `stale`.
   - Gửi trùng trạng thái (đã nhập, cùng số) ⇒ 200, không thêm dòng.
   - Nhật ký cùng lô: `order_accounting_entry_marked` / `order_accounting_entry_unmarked` (gắn `order_id`), detail = trạng thái + số hoá đơn + lý do. Không SĐT/email/MST (5.12).
   - **Đường lộ của dòng nhật ký gắn đơn:** (i) hình chiếu thông báo `v_aud_order_event` là **danh sách hành động cho phép** (`migrations/0025_thong_bao.sql:53-56`) ⇒ hành động mới **không** vào hộp thông báo; (ii) lịch sử đơn (`getAuditTrail` + `lichSuTheoVai`, `src/modules/orders/index.ts:544`) hiện mọi hành động gắn đơn cho người có `order.history.view` (`permissions.ts:74`) ⇒ `lichSuTheoVai` **bỏ** hai hành động này khi người xem **không** qua `can(accounting.entry.view, { ownerId, assigned })`. Luật theo **ô quyền**, không theo danh tính "Đối tác" — khuôn `order.leg.short_notice.view` / `xemDuDatGap` (`src/modules/orders/index.ts:80`).
   - **Hàng rào Bảng tin:** kế hoạch sổ tiền thêm `billing/index.ts` vào bài `src/bang-tin-guard.test.ts` (NT-R7) ⇒ route này **gọi `baoThayDoi`** với loại thay đổi **không gõ cửa điện thoại** (ADR-0045; khuôn NT-F10) — loại cụ thể chốt ở kế hoạch. Không xin miễn trừ `MIEN`.
4. **Ô xem mới** (tên tạm) `accounting.entry.view` (A-5; tiền lệ ô xem riêng `order.leg.short_notice.view`, `permissions.ts:85`) — MỘT ô quyết cả ba đường đọc: chi tiết đơn, nhãn/lọc ở danh sách, dòng nhật ký trong lịch sử đơn. Giá trị: SALES any · ACCOUNTING any · ADMIN any · FIELD assigned · **PARTNER none** (Q-2 "Không") · SUPER_ADMIN any · INTERN own · DRIVER none · DRIVER_PARTNER none (A-13; các cột ngoài PARTNER = đúng `order.view`, `permissions.ts:72`). Bài ghim: ô này không rộng hơn `order.view` ở mọi cột.
   - **Tài khoản lai SALES + PARTNER:** `can()` hợp các ô ⇒ ô SALES = any cho qua ⇒ **thấy** dấu. Chấp nhận có chủ ý, nhất quán ADR-0059; test ghi rõ ca này.
   - **Đọc trên chi tiết đơn:** route `billing` `GET /api/orders/:id/nhap-ke-toan` (cổng `orders`): hỏi `can(order.view, scope)` rồi `can(accounting.entry.view, scope)` (`scope = { ownerId, assigned }`); sai ô xem ⇒ 403; trả trạng thái hiện tại (daNhap, soHoaDon, lúc, tên người bấm) và — chỉ cho người có `accounting.entry.mark` — các dòng trước đó (A-7).
5. **Lọc và gắn nhãn ở danh sách đơn** (`GET /api/orders`, module `orders`, `src/modules/orders/index.ts:458`): `orders` không đọc `bil_` ⇒ gốc lắp ráp tiêm **một hàm đọc** của `billing`, khuôn `ordersWithHandler(orderIds)` (`src/shared/router.ts:56`): `ctx.nhapKeToanCuaDon(orderIds)` ⇒ tập id **trong danh sách truyền vào** có trạng thái hiện tại `entered = 1`.
   - **Gắn nhãn thẻ đơn** (A-12): gọi với id của trang đang xem; nhãn chỉ hiện khi người xem qua `can(accounting.entry.view, { ownerId, assigned })` với đơn đó. **Điều kiện thi công:** với ô `assigned` (HDV), `assigned` lấy từ tập đơn đang phụ trách lấy **một lần** mỗi request (`ctx.myHandledOrderIds`, `src/shared/router.ts:61`) — không gọi `ctx.isAssigned` cho từng đơn.
   - **Lọc `nhapKeToan=da|chua` — điều kiện thi công bắt buộc:** (1) chỉ nhận khi kèm **khoảng ngày đi** của bộ lọc nhiều điều kiện (`tu`/`den`), khoảng tối đa chốt ở kế hoạch (gợi ý ≤ 92 ngày); thiếu khoảng ⇒ 400 (A-6); (2) `orders` lấy **tập đơn ứng viên** trong khoảng ngày (cùng mọi điều kiện lọc và phạm vi xem theo vai), gọi `nhapKeToanCuaDon(ứng viên)`, rồi lọc + phân trang trên tập đã lọc — không dùng `NOT IN` một tập tăng mãi; (3) **trước khi viết mã**, đo giới hạn tham số / độ dài câu của **Cloudflare D1** và số đơn thật trong khoảng tối đa trên dữ liệu thử; ghi số đo vào kế hoạch; vượt ngưỡng ⇒ dừng, hỏi điều phối; (4) **tham số lọc chỉ dành cho người có ô `accounting.entry.view` = `any`** (hỏi không ngữ cảnh — hôm nay Bán hàng, Kế toán, Quản trị, Toàn quyền); HDV, Thực tập gửi tham số ⇒ 403 — họ chỉ thấy nhãn trên thẻ đơn của mình.
   - Đây là tiêm **hàm đọc tập id**, được ADR-0020 (S20-13: "hàm công bố … hoặc tiêm qua `ctx`") cho phép; **không** phải tiêm câu lệnh ghi (ADR-0024 "Phương án bị loại").
   - **Vì sao ở đây phải tiêm mà ADR-0059 thì không:** lọc phải nằm trong truy vấn phân trang của `orders` — trình duyệt không lọc sau được mà vẫn đúng trang. ADR-0059 chỉ là một lần đọc thêm cho một đơn đã mở, trình duyệt ghép được.
   - Bộ lọc này ghép vào bộ lọc nhiều điều kiện của đợt giao diện G1; ai gộp sau thì gộp lại, không viết đè. Bài kiểm canh cỡ tập ứng viên (đỏ khi vượt ngưỡng đo được).
6. **Quan hệ với ADR-0004 (yêu cầu xuất hoá đơn):** đây là **cờ nội bộ của Kế toán** ("tôi đã nhập đơn này vào phần mềm kế toán bên ngoài, số chứng từ/hoá đơn ở đó là …"). Nó **không** thay, không tạo, không chuyển trạng thái của luồng ADR-0004. Để tránh hai nguồn sự thật:
   - "Số hoá đơn đã nhập" ở đây = **số tham chiếu trong phần mềm kế toán ngoài**, chỉ để tra cứu;
   - khi luồng ADR-0004 được thi công, **luồng đó là nguồn sự thật về việc đã xuất hoá đơn**; máy **không** tự chép số giữa hai nơi. Màn hình lúc đó hiện cả hai và cảnh báo khi hai số khác nhau (quyết định chi tiết thuộc ADR của luồng hoá đơn).

## Bảng quyền (9 quyền app)

| Quyền | Ghi dấu / số (`accounting.entry.mark`, mới) | Thấy dấu (`accounting.entry.view`, mới) |
|---|---|---|
| SALES | none | any |
| ACCOUNTING | **any** | any |
| ADMIN | none (lời chủ: chỉ Kế toán + Toàn quyền) | any |
| SUPER_ADMIN | **any** | any |
| FIELD (HDV) | none | assigned (đơn đang phụ trách) |
| PARTNER | none | **none** (Q-2 "Không") |
| INTERN | none | own (đơn của mình) |
| DRIVER | none | none |
| DRIVER_PARTNER | none | none |

Tài khoản lai SALES + PARTNER: ghi không được; **thấy** dấu (hợp ô SALES). Hai **ô thao tác** mới (không phải mã quyền mới) ⇒ không đụng `EXTERNAL_PERMISSIONS`, trigger LC-1, không nhân đôi bài "tập con quyền".

## Phương án bị loại
- **Trường mở rộng tự do (flexfield / JSON trên `orders`):** Hiến chương 5.2 cấm; chủ đã chọn theo luật.
- **Cột trên `orders`:** `orders` không phải chủ của dữ liệu Kế toán; sửa đè cột mất dấu vết (5.5); `billing` ghi bảng `orders` trái ADR-0002 điều 3.
- **Dùng lại `invoice.issue` / bảng `bil_invoice_request` của ADR-0004:** khác nghĩa, khác người được ghi (Quản trị); làm luồng hoá đơn đầy đủ trước chỉ để có một dấu là nở phạm vi.
- **Bảng có hiệu lực `valid_from/to` + sửa dòng:** phải `UPDATE` đóng dòng cũ; bảng chỉ-thêm "dòng mới nhất thắng" đơn giản hơn.
- **Lọc danh sách bằng route riêng của `billing`** (màn "Đơn chưa nhập" tách riêng): trùng bộ lọc và phạm vi xem theo vai của `orders` ở module khác. Giữ làm lối dự phòng nếu tập ứng viên quá lớn.

## Hệ quả — migration, route, test, hàng rào
- **Migration** (một tệp; số lấy lúc thi công, sau `0044`/`0045` của sổ tiền và sau số của ADR-0058): bảng + hai trigger chỉ-thêm + chỉ mục. `docs/data-dictionary.json` + `npm run dict`.
- **Route:** `POST /api/orders/:id/nhap-ke-toan`, `GET /api/orders/:id/nhap-ke-toan` (module `billing`); tham số `nhapKeToan` của `GET /api/orders` (bắt buộc kèm khoảng ngày); một hàm tiêm mới `nhapKeToanCuaDon` ở `src/shared/router.ts` + `src/index.ts`; hai ô mới `accounting.entry.mark`, `accounting.entry.view`. Hành động nhật ký mới ở `src/shared/audit-actions.ts`.
- **Test:**
  - Migration: `UPDATE`/`DELETE` bị chặn; `CHECK` bỏ dấu thiếu lý do, số hoá đơn rỗng/quá dài bị chặn.
  - Route: 9 quyền + lai (ADMIN+ACCOUNTING ghi được; ADMIN một mình 403; SALES+PARTNER ghi 403 nhưng xem được dấu và dòng nhật ký; PARTNER+FIELD xem theo ô FIELD `assigned`); `lichSuTheoVai` bỏ `order_accounting_entry_*` với người không qua ô xem (PARTNER một mình không thấy); lọc thiếu khoảng ngày ⇒ 400; HDV/Thực tập gửi tham số lọc ⇒ 403; đơn nháp ⇒ 409; đơn đã "Đã giao"/"Hoàn thành" ⇒ ghi được; chạy đua `truocDo` ⇒ một bên 409.
  - Bài NT-R4 của sổ tiền ("`orders` không nhắc `bil_`") vẫn xanh.
  - e2e: Kế toán đánh dấu → danh sách lọc "chưa nhập" không còn đơn đó; bỏ dấu có lý do → quay lại.
  - Bài bản đồ quyền (`src/shared/permissions.test.ts`): ghim hai hàng mới; ghim "`accounting.entry.view` không rộng hơn `order.view`".
- **Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md`:** trigger chỉ-thêm `bil_accounting_entry_*`; ô ghi không có Quản trị (bài ghim); ô xem không rộng hơn `order.view` — ghi "chưa quan sát chặn" tới lúc thi công quan sát đỏ thật.
- Kiểm định kỳ (tuỳ chọn, mức `warn`): `R-BIL-AE1` — đơn nháp có dòng `entered = 1` (bắt SQL chạy tay).

## Tiêu chí nghiệm thu
1. Kế toán đánh dấu đơn đã xác nhận, nhập số "HD-000123" ⇒ người qua ô `accounting.entry.view` với đơn đó thấy "Đã nhập phần mềm kế toán · HD-000123" trên chi tiết, thẻ danh sách và lịch sử đơn; tài khoản chỉ-Đối tác không thấy ở cả ba chỗ; tài khoản lai SALES + PARTNER thấy.
2. Quản trị, Bán hàng, HDV gọi route ghi ⇒ 403.
3. Bỏ dấu không lý do ⇒ 400; có lý do ⇒ dòng mới, dấu mất, dòng cũ vẫn còn (Kế toán xem được).
4. `UPDATE bil_accounting_entry …` chạy tay ⇒ bị trigger chặn.
5. `GET /api/orders?nhapKeToan=chua` thiếu `tu`/`den` ⇒ 400; kèm khoảng ngày chứa đơn vừa đánh dấu ⇒ không trả đơn đó; `=da` trả đúng đơn đó; phạm vi xem theo vai không đổi.
6. Sau "Hoàn thành", Kế toán vẫn đánh dấu được.
