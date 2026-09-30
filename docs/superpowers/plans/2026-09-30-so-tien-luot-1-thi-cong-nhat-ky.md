# Sổ thi công — Sổ tiền lượt 1 (ADR-0024 đ1–5, ADR-0025, ADR-0026, ADR-0057 T3)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md` (đã duyệt; Q1–Q4 chủ trả lời 30/9 — không hỏi lại).
- **Vai phiên này:** NGƯỜI THI CÔNG (không tự nghiệm thu — N8). Task 12 (kiểm độc lập) do điều phối giao người khác.
- **Nhánh:** `worktree-agent-aa1fab0316112d404` (worktree `.claude/worktrees/agent-aa1fab0316112d404`), tách từ `main` `836c8247`.
- **Bổ sung của điều phối (chủ duyệt 30/9, YC-0001/0002) cho Task 10:** form tạo đơn — phần Thanh toán đứng TRƯỚC Thông tin khách hàng; hình thức thu mặc định Chuyển khoản; giữ nút "Sử dụng thông tin của tôi" (không điền sẵn). Chữ "Đã cọc" sót ở `web/viec-cua-toi.ts:508` xử lý trong Task 7/10.
- **Phạm vi lượt này:** Task 0 → 9; phần Task 10 trên màn CÓ SẴN; hai màn sổ MỚI chỉ ảnh phác HTML tĩnh ở `docs/evidence/2026-09-29-so-tien-luot-1/anh-phac/`; Task 11 phần tài liệu mô tả + nhật ký thay đổi. KHÔNG Task 12.

## Task 0 — Điều kiện bắt đầu (30/9)

- **Mốc `main`:** `836c8247` (bản 1.38 đã lên production, migration `0001`–`0043`).
- **Số migration:** `git log --all --name-only --diff-filter=A -- migrations` → số lớn nhất mọi ref là `0043_nhac_goi_bao.sql`; `git branch -a --no-merged main` (15 nhánh) và `git worktree list` (15 worktree) không nhánh nào có `0044+`. ⇒ **migration A = `0044`, migration B = `0045`**.
- **Mốc test (máy rảnh, trước khi sửa):** `npm test` 1872/1872 + bài đo giờ 1/1 xanh; `npm run typecheck` 0 lỗi; `npm run test:e2e` — xem dòng "Mốc e2e" dưới.
- **Đo lại tệp:dòng (kế hoạch đo trên `f18aa69`):**
  - `effectiveMoney` `src/modules/orders/money-adjustment.ts:223-225` (gọi ở `:215`) — khớp kế hoạch.
  - `insertMoneyAdjustment` `src/modules/orders/repository.ts:1132-1157` — **đã kiểm lại: KHÔNG chạm `orders.updated_at`** (chỉ chèn `order_money_adjustment` + nhật ký). R3 của kế hoạch vẫn đúng ⇒ câu `UPDATE orders` "Đã giao" phải kèm điều kiện số thứ tự điều chỉnh mới nhất.
  - `getDepartDates` `repository.ts:334`; cột cọc trong `repository.ts`: `:34-36` (kiểu dòng), `:170-172` (DTO), `:403`, `:425-426` (danh sách), `:524-627` (ô "Còn thiếu tiền" Trang chủ), `:655-665` (doanh thu tuần), `:857-863` (INSERT tạo đơn), `:908-914` (UPDATE sửa nháp), `:1092-1119` (`computeEffectiveMoney`).
  - `rules.ts:17` (`DEPOSIT_METHODS`), `:33-35`, `:183-208` (đọc cọc từ trình duyệt).
  - `orders/index.ts`: `getMyAssignments` `:377-413` (cọc ở `:394-395`); route ghi: `POST /api/orders` `:495`, `PUT /api/orders/:id` `:548`, `PUT …/trip` `:592`, `POST …/legs` `:633`, `PUT …/legs/:legId` `:657`, `POST …/legs/:legId/close` `:682`, `POST …/legs/:legId/short-notice` `:702`, `POST …/passengers` `:744`, `PUT …/booker` `:764`, `POST …/status` `:787`.
  - `dispatch/index.ts`: `PUT /api/orders/:id/handler` `:144`, `POST …/handler-cancel` `:204`, `POST …/handler-money-edit` `:229`; `GET /api/dispatch/mine` `:129`.
  - `src/shared/contracts.ts`: `DepositMethod` `:130`, `OrderDetailDto` cọc `:201-203`, `OrderSummaryDto` `:223`, `OrderInput` `:278-279`, `MyAssignmentDto` `:594-597`.
  - `src/shared/service-form.ts:383-394` (`orderSummary`); `src/shared/order-confirmation.ts:219-220` (nhãn cọc).
  - `web/`: `order-form.ts:215-291, 437-438`; `order-card.ts:39-40, 116, 158`; `orders.ts:68-69`; `order.ts:257, 310-311`; `home.ts:138-139`; `viec-cua-toi.ts:508-509`; `format.ts:24` (`METHOD_LABEL`); `api.ts:14`.
  - `architecture.test.ts`: hạng module `:508-519` (kế hoạch ghi `:435-446` — đã dời); `KHONG_DB` `:81`, `:526-541`; bộ bắt `dispatchViewHits` `:589-618`; bài trigger `vc_` bằng quét chuỗi `:752-774` (giữ nguyên — gỡ là nới rào).
  - Schema hiện hành: **135 trigger**; `orders` 19 cột (`id … confirmed_at, booker_party_id`).
- **Ruling Q1 (chủ "Khoá cả hai", kèm ngoại lệ "đóng chặng nếu Vận chuyển cần"):** đã xác minh — chỉ `src/modules/orders/chang-hanh-khach-repo.ts` ghi `ord_transfer_leg`/`ord_passenger`; `van-chuyen` không ghi bảng `ord_*` (module nghiêm, EXPLAIN chặn). Đóng chặng chỉ qua route `orders` (`POST …/legs/:legId/close`) vốn bị từ chối sau "Đã giao". ⇒ **Không cần ngoại lệ**; khoá cả hai bảng không chừa câu nào.
- **R4:** chỉ `dispatch/repository.ts` ghi `dsp_assignment` (không trigger nào ghi bảng này; không luồng tự đóng khi ngưng tài khoản) ⇒ trigger khoá `dsp_assignment` không chặn luồng nào có sẵn.
- **Mốc e2e (30/9, trước khi sửa):** `npm run test:e2e` → `E2E: 1/30 kịch bản LỖI` — đỏ duy nhất `catalog` (`tests/e2e/catalog.mjs:169`: `900000 !== 850000` — kịch bản đọc Google Sheet THẬT, giá TDMCT1 trên Sheet đổi giữa lần chạy; không do nhánh này). Mọi kịch bản khác + `audit-invariants` xanh.

## Spike (làm TRƯỚC Task 2 theo lời khuyên rà soát — nền của C1/V1 và NT-R5)

- **R1 — ĐẠT trên D1 local (miniflare, `wrangler dev --local`), 30/9.** Ca R1 của `tests/e2e/so-tien.mjs`: kịch bản tự cài trigger `e2e_spike_r1` (`BEFORE INSERT ON audit_log … RAISE`) nhắm câu THỨ BA của lô đổi người phụ trách (`PUT /api/orders/:id/handler`: đóng dòng cũ → mở dòng mới → nhật ký) ⇒ 500, dòng `dsp_assignment` y nguyên (câu 1, 2 không lưu), không dòng nhật ký; gỡ trigger rồi làm lại cùng lệnh ⇒ 200 (ca không đỏ vì lệnh sai). Lệnh: `npm run test:e2e -- so-tien` → `E2E: 2/2 kịch bản xanh`. **Chỉ chứng minh trên D1 local**; D1 production chưa kiểm (AI không chạy remote) — cùng giả định với mọi lô `db.batch()` hiện có.
- **R2 — EXPLAIN của Node 22 (`node:sqlite`) CÓ lộ chương trình con của trigger.** Thử trên CSDL tạm: `EXPLAIN UPDATE a SET x = 1` với trigger `BEFORE UPDATE OF x ON a WHEN EXISTS (SELECT 1 FROM b …) BEGIN … FROM v_view … END` in `Program` rồi `OpenRead b`, `OpenRead v_view` ⇒ dùng "cách chính" của Task 1d (không cần cách dự phòng tách thân trigger).

## Task 1 — Rào kiến trúc (xong 30/9)

- 1a `ALLOWED_EDGES`: `billing → orders, parties, staff, dispatch, audit`; `receipt → orders, billing, parties, company`; `pricing → parties, catalog, audit`; `orders` thêm `pricing`; `TABLE_PREFIX`/`VIEW_PREFIX` thêm `prc_`/`prc`. `pricing` chưa có thư mục (GĐ kế hoạch). Đột biến `dispatch → billing` → đỏ "vòng phụ thuộc: billing → dispatch → billing".
- 1b bài "orders không nhắc `bil_`" — đột biến → đỏ `src/modules/orders/repository.ts:1314`.
- 1c hạng `KHONG_BANG = ["receipt"]` + bài quét + bài phân hạng — **đột biến chờ Task 8** (thư mục `receipt` chưa có; bài bỏ qua thư mục vắng, vẫn đối chiếu sổ dữ liệu).
- 1d luật thân trigger bằng EXPLAIN (spike R2) — 135 trigger hiện có đều thoả; ba ca đáp án biết trước khớp ĐÚNG kế hoạch. **Chênh:** CSDL ranh giới của bài này TẮT khoá ngoại — bật thì SQLite sinh lượt quét bảng con khi có trigger (INSERT `orders` "đọc" `dsp_assignment`, `audit_log`) làm báo nhầm 5 trigger. Đột biến trigger `orders` đọc `pty_party` → đỏ; đột biến với `bil_payment_receipt` làm lại sau migration `0045`.
- 1e (hàng rào Bảng tin phủ `billing/index.ts`) **dời sang Task 6** — tệp chưa tồn tại; bài đọc tệp cố định, thêm tên tệp vắng sẽ ném lỗi (không được làm bài bỏ qua tệp vắng = nới).
- Dòng `docs/SO-HANG-RAO.md`: 4 dòng mới (NT-R1, R3, R4, R5).
- Kiểm: `npm test` 1878/1878 + 1/1; `npm run typecheck` 0.

## Task 2 — Migration `0044_orders_da_giao.sql` (xong 30/9)

- Bốn cột mốc `delivered_at/_by`, `completed_at/_by`; view `v_ord_order_state (id, status, delivered_at, completed_at)` (+ sổ dữ liệu, `npm run dict`).
- 19 trigger: `orders_milestone_insert` (đơn mới không mang sẵn mốc — **thêm so với kế hoạch**: không có nó thì `INSERT orders` kèm mốc lách được khoá), `orders_delivered_from_confirmed`, `orders_completed_after_delivered`, `orders_delivered_lock` (liệt kê mọi cột), khoá thêm/sửa/xoá cho `order_service`, `order_item`, `ord_transfer_leg`, `ord_passenger` (Q1), chèn `order_money_adjustment`; `dsp_assignment_delivered_lock_{ins,upd}` (module dispatch, đọc `v_ord_order_state`).
- **Chênh (theo ADR, chặt hơn kế hoạch):** kế hoạch §3.1 ghi khoá "dòng `HANDLE`" cho cả chèn lẫn sửa `dsp_assignment`; ADR-0025 đ5 ghi "chặn **chèn dòng mới** và đổi dòng `HANDLE`" ⇒ chèn: chặn MỌI loại việc; sửa: chỉ dòng `HANDLE`. Hôm nay chỉ có loại `HANDLE` nên không khác hành vi.
- Mốc và người bấm đi cùng nhau (trigger đòi `delivered_by`/`completed_by` khác NULL cùng lúc đặt mốc) — GĐ bề mặt dữ liệu, chặt hơn.
- NT-R6 kiểm bằng HÀNH VI (thử đổi từng cột của `PRAGMA table_info(orders)` trong câu Hoàn thành), không đọc chữ thân trigger; tự kiểm: thêm cột tạm trong CSDL thử → báo đúng cột lọt.
- Test `src/migrations-orders-da-giao.test.ts` 8 bài: đỏ 8/8 khi chưa có tệp → xanh 8/8. `npm test` 1886/1886 + 1/1; typecheck 0; bài luật thân trigger xanh với 19 trigger mới.

## Task 3 — Migration `0045_billing_so_cong_no.sql` (xong 30/9)

- 6 bảng tra cứu, 3 bảng chỉ-thêm (`bil_payment_receipt`, `bil_posting`, `bil_debt_line` — có `trip_id` + hai CHECK của ADR-0057 T3), 2 view (`v_bil_order_paid`, `v_bil_party_balance`), 14 trigger, 2 chỉ mục duy nhất một phần (mỗi đơn ≤ 1 phiếu Đã giao / Hoàn thành — lưới cho R-BIL-4, **thêm so với kế hoạch**).
- **Ruling mã tra cứu:** mã VIẾT HOA (`CASH`, `BANK_TRANSFER`, `OTHER`) theo khuôn bảng tra cứu của repo (`CHECK (code = upper(code))`) và chữ "OTHER" của câu trả lời Q3; câu chuyển cọc chép `upper(deposit_method)` (kế hoạch §3.2 ghi "trùng mã deposit_method cũ" — chép 1:1 qua `upper()`).
- Chuyển cọc (Q3): ngày = `date(created_at, '+7 hours')` (bài biên 17:30Z → hôm sau; 16:59:59Z → cùng ngày); hình thức NULL → `OTHER`; thu cho = `v_pty_owner_company` (vắng → NOT NULL chặn cả migration — có bài); `created_by = 'he-thong'`; `created_at` = mốc cố định `2026-09-30T00:00:00.000Z`.
- Phiếu RECEIPT chỉ tạo khi lần thu có dòng nợ (người thu không phải Công ty do Kế toán ghi) — GĐ bề mặt thi công; lần thu luôn truy được qua `receipt_id` của dòng nợ.
- Sổ dữ liệu: module `billing`, 9 bảng + 2 view, `deprecatedColumns` ba cột cọc của `orders`; thêm trường `note` (tuỳ chọn) vào bảng của sổ và bộ sinh `scripts/data-dictionary-lib.mjs` in nó (tài liệu mô tả) để ghi "câu một lần chép cọc cũ".
- Kiểm "thông tin" mới ở `scripts/audit-checks.mjs` (mức `warn`): số đơn còn lần thu người thu chưa rõ.
- Test `src/migrations-billing.test.ts` 13 bài: đỏ 13/13 khi chưa có tệp → xanh. Bài "không id cứng" bắt id công ty chủ viết cứng trong test lúc đầu — đã đổi sang đọc `v_pty_owner_company`.
- `npm test` 1899/1899 + 1/1; typecheck 0.

## Task 4 — Quyền (xong 30/9, chỉ đổi GIÁ TRỊ hai ô)

- `payment.receive`: FIELD none → assigned, PARTNER none → own, INTERN none → own (SALES own, ACC/ADMIN/SA any, DRIVER/DRIVER_PARTNER none giữ).
- `payment.refund`: ADMIN any → none (ACC, SA any; còn lại none).
- Bài ghim đổi TRƯỚC (đỏ 3 bài) rồi mới đổi `MATRIX` (xanh): `src/shared/permissions.test.ts` (dòng ghim + thêm `payment.refund` vào `ADMIN_NONE_OPS` — bài "ADMIN làm mọi thao tác trừ…" đỏ đúng lý do), `src/modules/orders/xem-don-theo-quyen.test.ts` (ghim hàng PARTNER). Hàng DRIVER/DRIVER_PARTNER vốn đã `none` hai ô này.
- Bốn ô mới (`order.handover`, `order.complete`, `ledger.view`, `ledger.write`) vào `MATRIX` CÙNG commit với route hỏi nó (Task 6); hai mục hoãn `payment.*` ở `docs/quyen-hoan.json` gỡ cùng route.
- Không mã quyền mới ⇒ không đụng `EXTERNAL_PERMISSIONS`/LC-1. `npm test` 1899/1899.

## Task 5 — Luật thuần billing + sổ vàng (xong 30/9)

- `src/modules/billing/rules.ts`: `conLai` (HÀM DUY NHẤT đã thu / còn lại / dư / chưa rõ — NT-R9), `hieuLuc`, `sinhDongLanThu`, `sinhDongXacNhanCongTy`, `sinhDongQuyetToan`, `sinhDongHoanKhach`, `sinhDongDao`, `sinhPhieuDaGiao` (lượt 1 rỗng), `soDuTheoBen`, `lyDoChuaGiaoDuoc` (thứ tự cố định + "ai xử lý" — Hiến chương 5.7), `lyDoChuaHoanThanh`, `ngayPhatSinh` (NT-S8), `dong` (định dạng tiền không phụ thuộc máy).
- **GĐ bề mặt:** ngày phát sinh không được SAU hôm nay (kể cả Kế toán); hoàn khách do nhân viên trả bằng tiền đang giữ ⇒ dòng *hoàn khách* công ty → người trả (bù giữ hộ); công ty tự trả ⇒ không dòng.
- `rules.test.ts` 11 bài (có bài ĐỐI CHIẾU `conLai` ↔ view `v_bil_order_paid` ↔ trigger `bil_posting_delivered_paid` trên cùng dữ liệu). **Ghi thật:** tệp luật và tệp test viết cùng lượt (module mới) — không có lần chạy "đỏ vì thiếu hàm" riêng; đỏ-trước của luật tiền nằm ở trigger (Task 3) và sổ vàng.
- Sổ vàng: **định dạng mới** `golden/so-cong-no-luot-1.json` (chuỗi sự kiện — theo phân tích góp ý §1 "mở rộng định dạng trước khi thêm ca") với 4 ca lượt 1 ở `cho_xac_nhan` (SV-SC-01 giữ tiền mặt rồi nộp; -02 "Công ty thu – CK" chờ xác nhận; -03 trả dư chờ hoàn; -04 cọc cũ chưa rõ bị đảo rồi ghi lại). `src/so-vang.test.ts` thêm LỚP 2 chạy trên `rules.ts`: chạy SV-HT-06, SV-HT-07 (đã xác nhận 30/9) → khớp; in "chưa áp dụng 4 ca". Đã thử một lần (bản sao tạm, hoàn nguyên) đổi 4 ca sang "đã xác nhận" → mã khớp đáp án — KHÔNG phải xác nhận, chủ/Kế toán phải xem.
- Khung module: `src/modules/billing/repository.ts` (mọi SQL của Task 6, `defineSql`, EXPLAIN xanh) + `STRICT`; `index.ts` rỗng (bài `route-access`/`tai-xe-cong` đòi thư mục module có `index.ts`); `src/modules/orders/hoan-tat-repo.ts` (NỬA NGHIÊM — câu mốc Đã giao/Hoàn thành + đọc trạng thái) + `hoan-tat.ts` (phải thu hiện hành) — **tệp mới thay vì sửa `orders/repository.ts`** để tránh đụng phiên song song đang sửa `listOrders`.
- NT-R2 thấy đỏ thật (dòng SO-HANG-RAO). `npm test` 1912/1912 + 1/1; typecheck 0.

## Task 6a–6d — Route billing (xong 30/9, MỘT commit — chênh: kế hoạch ghi mỗi mục một commit; gộp vì bốn mục cùng tệp `index.ts`/`service.ts`, tách hunk tốn công mà không thêm an toàn)

- 12 route (bảng §3.4): `GET|POST /api/orders/:id/payments`, `POST /api/orders/:id/delivered`, `POST /api/orders/:id/completed`, `POST /api/ledger/balances`, `GET /api/ledger/unpaid-summary`, `GET /api/ledger/mine` (cổng staff), `GET /api/ledger`, `POST /api/ledger/company-receipts/:receiptId/confirm`, `POST /api/ledger/settlements`, `POST /api/ledger/refunds`, `POST /api/ledger/adjustments`.
- Bốn ô mới vào `MATRIX` cùng commit với route hỏi nó (`order.handover`, `order.complete`, `ledger.view`, `ledger.write`) + bài ghim hàng DRIVER / DRIVER_PARTNER / PARTNER; gỡ hai mục hoãn `payment.receive`, `payment.refund` ở `docs/quyen-hoan.json` (NT-R8 xanh: không mục hoãn thừa).
- **Ruling "Kế toán" ở lần thu:** "người không phải Kế toán/Toàn quyền" (ADR-0026 đ2) đọc bằng ô `ledger.write` (Kế toán, Toàn quyền = any) — một nơi là MATRIX, không so mã quyền tay.
- Câu bảo vệ người phụ trách chỉ gắn khi người gọi được phép NHỜ đang phụ trách (`!can(staff, "order.handover")` không ngữ cảnh) — Quản trị/Toàn quyền không cần.
- Lô "Đã giao": `[guard dispatch] → UPDATE orders (updated_at + seq điều chỉnh + ngày đi muộn nhất + không dịch vụ thiếu ngày + M1) [AND changes() > 0] → [lần thu AT_DELIVERY + nhật ký payment_recorded + phiếu RECEIPT + dòng giữ hộ] → phiếu DELIVERED (due_snapshot) → nhật ký order_delivered (changes() > 0)`. Lô "Hoàn thành": `UPDATE orders → phiếu COMPLETED → nhật ký`.
- **Chênh (kế hoạch để ở e2e):** NT-F3 (đua), F4, F5, F6, F6b, F8, Q2–Q5, S1–S5, S8, S9 chạy ở `src/modules/billing/lo-ghi.test.ts` trên KHUNG THỬ (`tests/audit/harness.mjs` — ứng dụng thật + SQLite thật, lô = giao dịch) — xen kẽ "người khác ghi giữa lúc đọc và lúc ghi" làm TẤT ĐỊNH bằng cách bọc `env.DB.batch`; e2e không làm được tất định. e2e `so-tien.mjs` giữ ca R1 (D1 thật) + luồng chính (Task 6 bổ sung dưới).
- **GĐ bề mặt:** "Công ty trả" ở nộp/trả ghi dòng *quyết toán* người đó → công ty; điều chỉnh tự do: Kế toán chọn hai bên + loại dòng (HELD/SETTLEMENT/REFUND); hoàn khách không được quá số đã thu; ghi chú/lý do chặn dãy ≥ 8 chữ số (SĐT/số tài khoản).
- Bảng tin: hai khoá mới `chot_giao`, `hoan_thanh` (chỉ làm mới màn hình, không gõ cửa — `web-push.ts` map null); route sổ cũng báo `tien` cho đơn liên quan.
- Đột biến đã thấy đỏ: Bảng tin (NT-R7), câu bảo vệ (NT-F4), trigger Đã giao trong lô (NT-F6b) — dòng SO-HANG-RAO. `npm test` 1929/1929 + 1/1; typecheck 0.

## Task 6e + 7 + 8 + phần Task 10 trên màn cũ (xong 30/9, MỘT commit — chênh: kế hoạch tách commit; gộp vì bỏ ba trường cọc khỏi `OrderDto` làm máy chủ, `web/` và e2e phải đổi CÙNG lúc mới xanh)

- **6e (NT-F7):** 9 route ghi của `orders` + 3 route của `dispatch` trả 409 `order_delivered` ("Đơn đã giao – đã thu đủ, không sửa được nữa") SAU kiểm quyền; chi tiết đơn trả `canModify && !deliveredAt`. Bài `src/modules/billing/sau-da-giao.test.ts`: danh sách route ghi SINH từ module thật = bảng CA ∪ MIEN. Đỏ thật: dòng SO-HANG-RAO.
- **7 (NT-R9, Q2):** `OrderDto`/`OrderSummaryDto`/`MyAssignmentDto`/`DashboardResponse` bỏ cọc / còn lại / `unpaid`; thêm `deliveredAt`/`completedAt`. Thân đơn còn `depositAmount > 0` (trang cũ trong bộ nhớ đệm) → 409 `client_outdated`. Đơn mới ghi 0 / NULL / total (thoả trigger 0007). Lưu nháp: tổng < cọc cũ → cọc về 0 + câu nhật ký ghi số cọc cũ (Q2; `src/modules/orders/coc-cu-nhap.test.ts`). Hàng rào `src/coc-cu-khong-doc.test.ts` (7 mục cho phép). `trangThaiHienThi` ở `src/shared/order-status-label.ts` (nhãn "Đã giao – đã thu đủ", "Hoàn thành").
- **8 (NT-B1, NT-R3):** module `receipt` (KHONG_BANG) — `GET /api/orders/:id/receipt`, `dungBienNhan` danh sách trắng; `buildConfirmation` nhận `ReceiptDto`. Đã trả / còn lại lấy từ billing.
- **10 (màn cũ):** form lập đơn — mục Thanh toán ĐỨNG TRƯỚC Khách hàng (YC-0001), hình thức mặc định Chuyển khoản, giữ nút "Sử dụng thông tin của tôi" (không điền sẵn); tiền trả trước = lần thu ghi ở BƯỚC HAI sau khi lưu đơn (`POST /payments`), lỗi bước hai → chi tiết đơn hiện dải "chưa ghi được tiền trả trước" (`?thutruoc=loi`). Chi tiết đơn: thẻ tiền (phải thu / đã thu / còn lại từ billing), nút "Đã giao – đã thu đủ" / "Hoàn thành" theo `quyenGiao`/`quyenHoanThanh`, lý do chưa giao được, ô ghi lần thu. Danh sách / Trang chủ / Việc của tôi: số đã thu / còn lại qua `POST /api/ledger/balances`, "chưa thu" qua `GET /api/ledger/unpaid-summary`. Chữ "Đã cọc" ở `web/viec-cua-toi.ts` (YC-0002) → "Đã thu" từ billing.
- e2e: `orders.mjs` (trả trước = lần thu, còn lại qua billing), `dispatch.mjs` (MyAssignment chỉ `total`; D5 + G ghi lần thu 300.000 rồi kiểm `conLai` ở chi tiết + danh sách + HDV). `redteam` R8 nay ĐẠT.
- `npm test` 1936/1936 + 1/1; typecheck 0; `build:web` được.

## Task 9 — Bất biến R-BIL-* (xong 30/9)

- `scripts/audit-checks.mjs` sau `R-PTY-1`: `R-BIL-1`, `R-BIL-3a` (lần thu), `R-BIL-3b` (dòng nợ), `R-BIL-4a` (Đã giao ⇔ đúng một phiếu), `R-BIL-4b` (Hoàn thành ⇔ đúng một phiếu), `R-BIL-6`, `R-BIL-S9` (NT-S9), `R-BIL-M1` (Hoàn thành ⇒ Đã giao), `R-BIL-M2` (Đã giao ⇒ `confirmed`) — mọi kiểm mức `fail`. Danh sách `GHI_CHU` mới (không phải câu kiểm): `R-BIL-2`, `R-BIL-5` "chưa áp dụng", `R-BIL-7` = `R-PTY-1`; `audit-invariants.mjs` in dòng `·` cho chúng (không in "đạt").
- **Chênh kế hoạch §3.2:** R-BIL-1 xếp "tạo trước phiếu" theo `created_at ≤` thay vì `rowid` — rowid của hai bảng khác nhau (`bil_payment_receipt`, `bil_posting`) không so được với nhau; lô Đã giao ghi mọi câu với CÙNG một giờ máy chủ (`service.ts:daGiao`), nên "≤" gồm lần thu cùng lô.
- NT-S9 so với MỌI hồ sơ từng giữ vai công ty chủ (đổi công ty chủ không làm lần thu cũ thành vi phạm).
- Đỏ trước: 9 bài mới `src/audit-invariants.test.ts` đỏ 9/9 khi chưa có kiểm → xanh 83/83. Đột biến trên D1 local tạm: dòng SO-HANG-RAO.

## Task 11 — Tài liệu mô tả + đề xuất luật + nhật ký thay đổi (xong 30/9)

- `docs/SYSTEM-DESIGN.md` §5 (trigger 0044/0045, bảng migration), §6 (m) luồng tiền, §7 (13 route), §8 (sáu ô), §14, §16 (lệch 5.14 có chủ ý tới lượt 2), §17 K13; `docs/CHANGE-GUIDE.md` công thức z4 + bẫy 55 + bảng §1.
- Đề xuất luật (chưa áp — N9): `docs/superpowers/plans/2026-09-29-so-tien-luot-1-de-xuat-luat.md` (ARCHITECTURE 5.3/5.14/5.17 + Phần II, `src/CLAUDE.md`, `CLAUDE.md` §7/§10, `web/CLAUDE.md`).
- Ảnh phác TĨNH hai màn sổ mới: `docs/evidence/2026-09-29-so-tien-luot-1/anh-phac/{so-cua-toi,so-cong-no}.html` — chờ chủ xem, CHƯA dựng màn thật.
- Nhật ký thay đổi: mục **1.41** (điều phối 30/9: production 1.40; ban đầu 1.39, đổi sau khi gộp main); bài ghim dòng phiên bản `src/shared/app-info.test.ts`.

## Gộp origin/main 3d0d2fe5 (1.39 phông chữ + 1.40 giao diện nhỏ) — theo điều phối 30/9, KHÔNG push

- Xung đột giải cộng dồn (commit `c10747fe`): nhật ký 1.41 / 1.40 / 1.39; form lập đơn giữ đếm dịch vụ của 1.39, thanh đáy hiện "Trả trước" thay "Còn lại" tự trừ; "Việc của tôi" giữ nhãn 1.40 "Thanh toán trước / Còn lại" nhưng SỐ lấy từ billing (giả định bề mặt: "Thanh toán trước" = đã thu của billing), giữ "Xem đơn" + nhóm "Đã đi tour", bỏ liên kết riêng "Thu tiền · Đã giao" (cùng đích với "Xem đơn"); trang đơn: câu khoá theo quyền sửa chuyến (1.39) + câu khoá sau Đã giao.

## Kiểm cuối (30/9)

- `npm test` 1954/1954 + 1/1 (bài đo giờ riêng); `npm run typecheck` 0 lỗi; `build:web` được.
- `npm run test:e2e` ĐỦ BỘ trên commit gộp `c10747fe`: **31/31 xanh**, `audit-invariants --strict` đuôi e2e "Mọi bất biến đạt, 6 cảnh báo". (Lần trước gộp, `6c72bb16`: 31/31.) Sau `c10747fe` chỉ đổi `web/order.ts` (giao diện) + kịch bản Chrome — e2e không phủ `web/`, không chạy lại.
- `npm run db:migrate:local` (D1 local của worktree, áp tới 0045) → `node scripts/audit-invariants.mjs --db local` thoát **1**: DUY NHẤT `R-N1-5` (D1 local của worktree trống, không có quản trị viên); 9 kiểm `R-BIL-*` ✓.
- Kịch bản Chrome (chạy lần lượt, sau e2e): `so-tien-smoke` (mới) 3/3; `a2-smoke-form` 25 ✓; `a2-smoke-order` 11 ✓; `a2-smoke-sheet` 14 ✓; `hdv-viec-cua-toi-smoke` 11 ✓; `v1-nguoi-phu-trach` 17/17; `doi-tac-lap-don-smoke` 6 ✓; `chon-hdv-lap-don-smoke` 13 ✓; `trang-chu-smoke` 41 ✓; `help-smoke` 5 ✓ (lần đầu bước c đỏ "trang Tôi phải được phục hồi từ bộ đệm lùi/tiến" — chạy lại xanh, chập chờn bộ đệm trình duyệt); `v1-xac-nhan-png` 12/13 — bước **b đỏ**: "hai họ phông (tập con tiếng Việt) phải đã nạp: []" — khẳng định còn đòi phông Nunito, bản 1.39 (main) đã đổi sang một phông Be Vietnam Pro mà KHÔNG sửa kịch bản này (dòng khẳng định giống hệt trên `origin/main`) ⇒ nhiều khả năng đỏ sẵn từ 1.39, CHƯA kiểm trên main.
- Sửa nhờ kịch bản Chrome: (1) sau Đã giao khối "Người phụ trách" vẫn hiện nút đổi / nhận (máy chủ sẽ 409) → ẩn; (2) danh sách lần thu dùng lớp `.history` trùng khối Lịch sử (người không xem được lịch sử vẫn "thấy" `.history`) → lớp riêng `.pay-list`.
- Người kiểm độc lập: **CHƯA** (Task 12 ngoài phạm vi giao) — việc tiền / dữ liệu / quyền này chưa được coi là "đạt".

## Sửa theo kiểm độc lập (Task 12 — "ĐẠT CÓ ĐIỀU KIỆN", không CAO) + thao tác Kế toán đặt tạm (điều phối 30/9)

- **V-2** (`b16022b9`): mọi kịch bản `docs/evidence/**` không còn gửi cọc > 0 trong thân đơn (quét lại toàn thư mục: 0 chỗ). `v1-xac-nhan-png` dùng khoá `traTruoc` → `create` ghi lần thu bằng route; `a2-evidence` như vậy + ô `prepaidAmount`; `kiem-tra-giao-dien` ghi lần thu sau khi lập; `lo-hong` bỏ hẳn (ca H* không phụ thuộc tiền). `dp-lib`, `dat-gap-smoke`, `bang-tin-smoke`, `dot-a-smoke`: chỉ gửi `depositAmount: 0` hoặc không gửi — máy chủ nhận.
- **v1-xac-nhan-png bước b** chạy trên nhánh (`1793c619`) VÀ trên bản sao `origin/main` `3a39b5a7` (git archive ra `/tmp`, build:web): **cả hai đỏ đúng một bước b** "hai họ phông (tập con tiếng Việt) phải đã nạp: []", 12 bước còn lại xanh ⇒ đỏ SẴN từ main (bản 1.39 đổi phông), không do sổ tiền.
- **T-1** (`4d8b0f99`): `src/shared/router.ts` bắt chung lỗi có tiền tố `order_delivered:` / `order_completed:` → 409 `order_delivered` câu cố định tiếng Việt (log `warn` `order_delivered_race`). Bài router đỏ trước; ca đua thật trên khung thử (`sau-da-giao.test.ts` "T-1"); đột biến tắt nhánh → `expected 409 actual 500` → hoàn nguyên.
- **T-2** (`81e94da5`): "Việc của tôi" nhãn "Đã thu" (số đã thu của billing); kịch bản HDV sửa theo; nhật ký 1.41 thêm một dòng.
- **T-3** (`00cda4fc`): trigger mới `bil_payment_receipt_refund_within_paid` trong **0045** (sửa tại chỗ — chưa áp remote, cùng nhánh); `ghiHoanKhach` dịch `refund_exceeds_paid` → 409. Ca đua hai Kế toán ở `lo-ghi.test.ts` "T-3" đỏ trước (`expected 409 actual 201`) → xanh; bài migration mới "T-3". **Bẫy:** D1 local của worktree đã áp 0045 cũ — `db:migrate:local` KHÔNG áp lại (wrangler theo tên tệp); e2e dùng D1 tạm nên đúng. Dọn: xoá `.wrangler/state/v3/d1` rồi migrate lại.
- **T-4** (`c482b284`): gộp hai dòng KHONG_BANG ở SO-HANG-RAO (giữ ngày quan sát).
- **T-5** (`196007a0`): `tests/e2e/so-tien.mjs` đếm nhật ký trên D1 thật: `order_delivered` 1, `order_completed` 1, `payment_recorded` = 2 = số lần thu.
- **Thao tác Kế toán đặt TẠM trên trang đơn** (`1793c619`, điều phối 30/9 — chủ sẽ vẽ lại hai màn sổ trên Claude Design): trong khung Thanh toán, CHỈ khi máy chủ gửi khối mới `keToan` của `GET /api/orders/:id/payments` (chỉ `laKeToan` = ô `ledger.write`): mỗi lần thu "Xác nhận đã nhận" (CK chờ xác nhận) và "Đảo" (bắt buộc lý do, gồm lần thu "chưa rõ"); "X đang giữ Y ₫ … Đã nộp về công ty" (settlements, phân bổ đúng đơn này); "Ghi hoàn cho khách" khi dư. Không thêm route / quyền / migration — chỉ thêm TRƯỜNG `keToan` vào phản hồi có sẵn (lý do: không có cách nào khác biết ai giữ bao nhiêu VÌ ĐƠN NÀY và lần thu nào chờ xác nhận). Xác nhận tại chỗ, bấm hai lần mới ghi (không `confirm()`). Bài `lo-ghi` đỏ trước → xanh.

### Kiểm sau sửa (30/9)
- `npm test` 1959/1959 + 1/1; typecheck 0; build:web được.
- `npm run test:e2e` đủ bộ trên `1793c619`: **31/31**, audit `--strict` đuôi: "Mọi bất biến đạt, 6 cảnh báo".
- Chrome: `so-tien-smoke` 4/4 (thêm bước Kế toán 390: xác nhận CK, Đảo đòi lý do, ghi hoàn 150.000, ghi đã nộp; Bán hàng / Quản trị không thấy nút); `hdv-viec-cua-toi-smoke` 10/10 bước; `a2-smoke-order` 11 ✓; `v1-xac-nhan-png` 12/13 (bước b đỏ sẵn từ main — trên).
- Ảnh / kết quả do các kịch bản cũ ghi lại đã hoàn nguyên (không đổi bằng chứng lịch sử).

## Ruling / giả định (ghi theo thứ tự gặp)

- R-1 (bề mặt): mã hình thức thu viết HOA (`CASH`/`BANK_TRANSFER`/`OTHER`) như bảng tra 0045; cọc cũ chữ thường đổi bằng `upper()` lúc chuyển.
- R-2: khoá `dsp_assignment` sau Đã giao áp MỌI loại việc (đúng chữ ADR-0025 đ4), không riêng HANDLE.
- R-3: không cần ngoại lệ Q1 cho `van-chuyen` — module đó không ghi bảng `ord_*`.
- R-4: không có đường tự đóng đơn nào (R4 của kế hoạch) — không phải chặn thêm.
- R-5: ca đua (NT-F3/F4/F6b…) chạy trên khung thử thay e2e (tất định); D1 thật chỉ ca R1.
- R-9: trường `keToan` của `GET /api/orders/:id/payments` — quyết định tạm của điều phối 30/9 cho thao tác Kế toán trên trang đơn; gỡ khi dựng hai màn sổ theo bản vẽ Claude Design của chủ. (Kiểm độc lập vòng 2 đạt có điều kiện; điều phối chấp nhận.)
- R-8: "Việc của tôi" dùng nhãn 1.40 "Thanh toán trước / Còn lại" với số đã thu của billing (bề mặt, đảo ngược được).
- R-7: R-BIL-1 so "tại mốc" bằng `created_at ≤` (xem Task 9).
- R-6: tiền trả trước ở form lập đơn = hai bước (lưu đơn rồi ghi lần thu), không gộp vào `POST /api/orders` — giữ `orders` không biết `bil_` (NT-R1).

## Nợ / việc còn lại

- N-1: ĐÃ SỬA (T-1).
- N-2 (ĐÃ SỬA — V-2): kịch bản Chrome NGOÀI danh sách chạy lại vẫn gửi cọc > 0 trong thân đơn → sẽ gặp 409 `client_outdated`: `docs/evidence/2026-09-24-lo-hong-ho-so/kich-ban/lo-hong.mjs:21`, `docs/evidence/2026-09-19-pwa/kich-ban/kiem-tra-giao-dien.mjs:59`, `docs/evidence/2026-09-20-a2/kich-ban/a2-evidence.mjs:162`.
- N-3: `v1-xac-nhan-png` bước b (phông Nunito) — ĐÃ XÁC NHẬN đỏ sẵn trên origin/main `3a39b5a7`; phiên phông chữ sửa khẳng định.
- N-4: hai màn "Sổ của tôi" / "Sổ công nợ" chưa dựng — chủ sẽ vẽ lại trên Claude Design; thao tác Kế toán tạm ở trang đơn.
- N-5: Task 12 (kiểm độc lập + runbook triển khai) chưa làm.
- Kiểm độc lập vòng 2 (V-B): thêm ca 403 Quản trị / Bán hàng cho `settlements` và `company-receipts/:id/confirm` + ca tài khoản lai (Bán hàng + Đối tác) `keToan = null` (`lo-ghi.test.ts` "V-B"). Xanh ngay (hành vi đã đúng) — đột biến bỏ cổng `ledger.write` ở `settlements` → `expected 403 actual 201` → hoàn nguyên.
