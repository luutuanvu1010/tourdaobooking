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

## Ruling / giả định (ghi theo thứ tự gặp)

(chưa có)

## Nợ / việc còn lại

(chưa có)
