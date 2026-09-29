# Kế hoạch thi công — Sổ tiền lượt 1 (ADR-0024 điều 1–5, ADR-0025, ADR-0026)

- **Ngày:** 2026-09-29 · **Vai:** lập kế hoạch (không thi công — P15). Người thi công ở phiên khác; người kiểm độc lập chỉ-đọc ở phiên khác nữa (N8).
- **Nguồn chuẩn tắc (đã duyệt 2026-09-29, không hỏi lại):** ADR-0024 điều 1–5 (+ "Bổ sung khi duyệt"), ADR-0025, ADR-0026 (+ M1 = A, M2 "không chặn, chờ hoàn", ngày phát sinh ngay, khoá kỳ = lệch có chủ ý tới lượt 2); bản làm mới `docs/superpowers/specs/2026-09-29-so-tien-luot-1-lam-moi-ho-so-duyet.md` (bảng quyền 9 cột §2, hệ quả chéo 12–16 §3, rào §4.1); trang ghép `docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md` (bảng (3) "cổng nào canh cửa nào"); `golden/hoan-tat-cong-no.json` + `golden/README.md`; Hiến chương `docs/ARCHITECTURE.md` 5.3, 5.4, 5.13, 5.14, 5.17.
- **Loại việc:** việc lớn (dữ liệu + quyền + tiền + cửa một chiều). Mỗi task chạm dữ liệu/quyền/tiền xong phải qua người kiểm độc lập chỉ-đọc trước khi task sau dựa vào nó (gom kiểm được, nhưng không bỏ).
- **Mốc đo mã:** mọi `tệp:dòng` dưới đây đo trên `f18aa69` (nhánh `worktree-so-tien-luot-1`, = `main` `b300f40` + 3 commit tài liệu). **Phải đo lại sau khi ADR-0049 lượt 1 gộp `main`** (Task 0) — nhánh đó sửa `orders`, `dispatch`, thêm migration và hàng rào.
- **Ký hiệu:** `NT-x` = tiêu chí nghiệm thu; `Qx` = câu hỏi mở cho chủ (§6); "GĐ" = giả định bề mặt, đảo được.

## 1. Tiêu chí nghiệm thu (viết trước — hành vi kiểm được)

Gộp ADR-0024 "Hệ quả" (5 tiêu chí), ADR-0025 "Hệ quả" (9), ADR-0026 "Hệ quả" (9), bản làm mới §4.1, §4.2. Cột "Kiểm bằng": U = `npm test`, E = `npm run test:e2e`, A = `audit-invariants`, C = kịch bản Chrome, T = `npm run typecheck`.

### 1.1 Rào kiến trúc (mỗi rào phải thấy đỏ một lần rồi hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày — P16)

| Mã | Hành vi | Kiểm bằng | Nguồn |
|---|---|---|---|
| NT-R1 | `ALLOWED_EDGES` có `billing → orders, parties, staff, dispatch, audit`; `receipt → orders, billing, parties, company`; `orders → pricing`; `pricing → parties, catalog, audit`; bài "không vòng" xanh; thêm tạm cạnh `dispatch → billing` → đỏ (vòng) | U | ADR-0024 đ1–2 |
| NT-R2 | `billing` ở `STRICT`: mọi SQL của `billing` qua `defineSql` + EXPLAIN; chèn tạm một `db.prepare("SELECT 1 FROM orders")` vào `billing/repository.ts` → đỏ | U | §4.1 |
| NT-R3 | Hạng `KHONG_BANG = ["receipt"]`: không `.prepare(`/`.batch(`/`.exec(` ở mọi tệp `.ts` (trừ test) của `receipt`, không bảng/view nào trong sổ dữ liệu thuộc `receipt`; chèn tạm `.prepare(` vào `receipt` → đỏ | U | ADR-0024 đ1, Hệ quả (3) |
| NT-R4 | Không tệp nào của `src/modules/orders/` (kể cả test) nhắc `bil_` ngoài chú thích; chèn tạm chuỗi SQL `FROM bil_payment_receipt` vào `orders/repository.ts` → đỏ | U | ADR-0024 đ4, Hệ quả (4); §4.1 |
| NT-R5 | Luật thân trigger: mọi trigger trong schema (sau mọi migration) chỉ đọc bảng cùng module với bảng đặt trigger hoặc view công bố của module được phép phụ thuộc; cài tạm trigger trên `orders` đọc `bil_payment_receipt` → đỏ | U | ADR-0024 đ5, Hệ quả (2) |
| NT-R6 | Trigger khoá `orders` phủ **mọi** cột của `orders` (so `PRAGMA table_info(orders)` với thân trigger); thêm tạm một cột vào `orders` trong DB thử mà không thêm vào trigger → đỏ | U | ADR-0025 đ5 (lưới cho `ALTER` sau này) |
| NT-R7 | Hàng rào Bảng tin phủ route ghi đơn của `billing`; bỏ `baoThayDoi` khỏi route "Đã giao" hoặc "Hoàn thành" → đỏ | U | ADR-0025 đ8, NT 9 |
| NT-R8 | Hàng rào 1 (mỗi ô được máy chủ hỏi) xanh với 4 ô mới, không mục hoãn thừa; `payment.receive`, `payment.refund` không còn trong `docs/quyen-hoan.json` | U | ADR-0026 đ10, NT 9 |
| NT-R9 | Chỉ **một** hàm tính "còn lại/đã thu" (trong `billing/rules.ts`); ngoài danh sách cho phép, không tệp chạy thật nào đọc `deposit_amount`/`deposit_method`/`remaining_amount`/`depositAmount`/`remainingAmount` | U | ADR-0026 đ9, NT 6; Hiến chương 5.4 |

### 1.2 Dữ liệu (migration, trigger)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-D1 | Áp migration lên DB có đơn mẫu: số dòng và mọi giá trị cột cũ của `orders` không đổi; bốn cột mốc `NULL` | U (migration test) |
| NT-D2 | Tổng lần thu "chưa rõ" sau migration = tổng `deposit_amount > 0` cũ (kể cả đơn huỷ); mỗi đơn có cọc đúng một lần thu, hình thức = `deposit_method`, người thu `NULL`, vai "Chưa rõ" | U |
| NT-D3 | SQL chạy tay bị chặn khi `delivered_at` có: `UPDATE orders` (mọi cột, kể cả `status` → huỷ), `INSERT/UPDATE/DELETE` `order_service`, `order_item`; `INSERT order_money_adjustment`; `INSERT`/`UPDATE` dòng `HANDLE` của `dsp_assignment`. Cho phép đúng một lần đặt `completed_at/_by/updated_at` từ `NULL` | U |
| NT-D4 | `delivered_at` không đặt được khi `status ≠ 'confirmed'`; `completed_at` không đặt được khi `delivered_at IS NULL`; không đặt lại / xoá mốc | U |
| NT-D5 | `UPDATE`/`DELETE` trên `bil_payment_receipt`, `bil_posting`, `bil_debt_line` bị chặn; `amount ≤ 0` bị chặn; `debtor = creditor` bị chặn; dòng gốc đảo lần hai bị chặn (duy nhất `reverses_id`) | U |
| NT-D6 | `occurred_date` bắt buộc, dạng `YYYY-MM-DD` | U |
| NT-D7 | Thông báo lỗi trigger có tiền tố mã (`order_delivered: …`, `bil_append_only: …`); route dịch ra tiếng Việt, không lộ mã thô | U + E |

### 1.3 Quyền

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-Q1 | `MATRIX` đúng bảng 9 cột của bản làm mới §2 cho sáu ô; bài ghim nguyên dòng DRIVER, DRIVER_PARTNER, PARTNER cập nhật | U |
| NT-Q2 | "Đã giao": FIELD không phải người phụ trách → 403; Bán hàng đang phụ trách → 403; Quản trị/Toàn quyền → được | E |
| NT-Q3 | "Hoàn thành": Quản trị → 403; Kế toán/Toàn quyền → được | E |
| NT-Q4 | Ghi lần thu: người không phải Kế toán/Toàn quyền ghi người thu là người khác (không phải mình, không phải Công ty) → 400; Đối tác ghi cho đơn người khác → 403; Quản trị ghi hoàn khách → 403 | E |
| NT-Q5 | `GET /api/ledger`: chỉ `ledger.view = any`; `GET /api/ledger/mine` trả đúng hồ sơ của phiên, không tên/SĐT khách; Đối tác, Tài xế → 403 | E |

### 1.4 Luồng "Đã giao" / "Hoàn thành" (ADR-0025)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-F1 | Từ chối (câu tiếng Việt) khi: trước ngày đi muộn nhất (`vnToday`); đã thu < phải thu ("Còn thiếu X ₫…"); đã thu > phải thu ("Khách đã trả dư X ₫ — chờ Kế toán hoàn"); còn lần thu "chưa rõ"; bên đặt mang vai nhóm bên ngoài đang mở (M1 = A); đơn nháp/huỷ; đã "Đã giao" | E |
| NT-F2 | Thành công → `delivered_at` có; đúng **một** phiếu "Đã giao" (lượt 1 không dòng thương mại); lần thu nhập ở bước này (nếu có) được ghi; nhật ký `order_delivered` không có SĐT/số chi tiết; Bảng tin báo **sau** lô ghi | E |
| NT-F3 | Bấm lần hai → 409; hai người bấm cùng lúc → đúng một thắng, bên thua không để lại dòng sổ nào | E |
| NT-F4 | Người phụ trách bị đổi giữa lúc mở màn và lúc bấm → lô ghi không áp gì (không mốc, không phiếu, không nhật ký thắng) | E |
| NT-F5 | Số khách bị sửa (dòng điều chỉnh mới) giữa lúc máy chủ đọc và lúc ghi → lô thua (xem Rủi ro R3) | E |
| NT-F6 | Cố ý làm hỏng câu thứ 3 của lô (trigger `RAISE` tạm cài trên D1 local tạm bởi chính kịch bản e2e) → **không câu nào** được lưu | E |
| NT-F7 | Sau "Đã giao", **mọi** route ghi đơn của `orders` và `dispatch` (danh sách sinh từ router, không danh sách tay) từ chối sớm bằng câu tiếng Việt; **và** SQL chạy tay bị trigger chặn (NT-D3) | U + E |
| NT-F8 | "Hoàn thành": còn bên nợ công ty (kể cả "Công ty thu – CK" chưa xác nhận) → từ chối; sau khi Kế toán quyết toán/xác nhận → được; khoản công ty còn phải trả **không** chặn; nhật ký `order_completed` | E |
| NT-F9 | Nhãn "Đã giao – đã thu đủ", "Hoàn thành" ở danh sách, chi tiết, Trang chủ, biên nhận; không lộ `delivered`/`completed` | C |
| NT-F10 | Không gửi thông báo màn hình khoá cho hai bước này (ADR-0045; GĐ ở bản làm mới §3.14) | U (bài tĩnh: `billing` không import `thongbao`) |

### 1.5 Sổ công nợ (ADR-0026)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-S1 | HDV thu 1.000.000 tiền mặt → "Bạn đang giữ 1.000.000 ₫"; khai "Công ty thu – CK" 500.000 → vẫn giữ thêm 500.000 tới khi Kế toán bấm "Công ty đã nhận"; Kế toán ghi "đã nộp" → về 0 | E + U |
| NT-S2 | HDV A thu trước, đơn chuyển sang HDV B → A vẫn thấy nợ ở "Sổ của tôi" (mã đơn, ngày, loại, số tiền, số dư), không mở được đơn | E |
| NT-S3 | Ghi lần thu sau "Đã giao" → từ chối | E |
| NT-S4 | Điều chỉnh/đảo: lý do bắt buộc; dòng đảo cùng số, đổi chỗ hai bên, trỏ gốc | U + E |
| NT-S5 | Khách trả dư (bớt người sau khi trả trước): sửa số khách **không** bị chặn; màn đơn hiện "Khách đã trả dư X ₫ — chờ Kế toán hoàn"; Kế toán ghi hoàn → hết dư → "Đã giao" được | E |
| NT-S6 | Form lập đơn hai bước: đơn lưu xong mới gọi route ghi lần thu; lỗi bước hai → "Đơn đã lưu, chưa ghi được tiền trả trước — thử lại", đơn không mất | E + C |
| NT-S7 | Luật sinh dòng: sổ vàng SV-HT-06, SV-HT-07 + ca lượt 1 mới (trạng thái `cho_xac_nhan`) chạy trên **mã thật**; ca chưa xác nhận in "chưa áp dụng", không tính "đạt" | U |
| NT-S8 | Ngày phát sinh: mặc định `vnToday()`; Kế toán chọn được ngày khác cho phiếu mình ghi; người khác không chọn được | U + E |

### 1.6 Biên nhận, bất biến

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-B1 | `GET /api/orders/:id/receipt` (module `receipt`) trả `ReceiptDto` dựng ở máy chủ theo danh sách trắng; số lạ 480.017 đặt vào **mọi** ô bí mật của đơn/sổ không xuất hiện trong JSON; thêm tạm một trường giá vốn vào `ReceiptDto` → đỏ | U + E |
| NT-B2 | `web/` không còn gọi `buildConfirmation(OrderDetailDto…)`; ảnh xác nhận PNG vẽ từ `ReceiptDto` | U (quét) + C |
| NT-A1 | `audit-invariants` có `R-BIL-1`, `-3`, `-4`, `-6` (lượt 1) + `R-BIL-7` = dùng lại `R-PTY-1`; `R-BIL-2`, `-5` in "chưa áp dụng"; `completed_at` ⇒ `delivered_at`; `delivered_at` ⇒ `status='confirmed'`; cố ý chèn một dòng đảo sai số trên D1 local → thoát 1 | A + U |

## 2. Hiện trạng mã (đo trên `f18aa69`) — điểm lệch so với ADR soạn 25/9

| Điều ADR nói | Mã hôm nay | Hệ quả cho kế hoạch |
|---|---|---|
| ADR-0025 đ4: "sửa số khách có đổi `updated_at`, `orders/repository.ts:916`" | **Sai với mã hôm nay.** `insertMoneyAdjustment` (`src/modules/orders/repository.ts:972-997`) chỉ chèn `order_money_adjustment` + nhật ký, **không** chạm `orders.updated_at` | Khoá lạc quan theo `updated_at` không bắt được sửa số khách chen giữa. Câu `UPDATE orders` chưa chạy do `orders` cấp phải có thêm điều kiện số thứ tự điều chỉnh mới nhất = số máy chủ đã đọc (`orders` đọc bảng của chính nó — hợp lệ). NT-F5. **Người kiểm xem kỹ.** |
| ADR-0026 đ9 liệt kê 9 bề mặt đọc cọc | `grep` hôm nay thấy thêm: `src/modules/orders/index.ts:161-162` (`getMyAssignments` → `GET /api/dispatch/mine`), `src/shared/contracts.ts:483-486` (`MyAssignmentDto`), `src/shared/contracts.ts:326-335` + `src/modules/orders/repository.ts:518-594` (ô "Còn thiếu tiền" Trang chủ), `src/shared/service-form.ts:383-394` (`orderSummary`), `web/home.ts:74-79,138-139`, `web/viec-cua-toi.ts:508-509`; và test/kịch bản `tests/e2e/orders.mjs`, `tests/e2e/dispatch.mjs`, `tests/e2e/lib.mjs`, `tests/e2e/nhap-tay-va-gia-doi-tac.mjs`, `tests/audit/*.mjs` | Phạm vi Task 7/10 rộng hơn ADR ghi. `dispatch` cũng **không** đọc được `bil_` (thêm `dispatch → billing` = vòng) ⇒ "Việc của tôi" và ô Trang chủ lấy số qua route đọc gộp của `billing`. |
| `buildConfirmation` ở `src/shared/order-confirmation.ts:220` | Nay ở `:243`; hai nhãn cọc ở `:219-220`; người gọi duy nhất `web/confirmation-dialog.ts:116` | Task 8. |
| `effectiveMoney` `money-adjustment.ts:215-218` | Nay `:223-225` (`remainingAmount = total − depositAmount`, có thể âm); gọi ở `:215` | Task 7: bỏ tham số cọc; "còn lại" chuyển sang `billing`. |
| ADR-0024 đ5: "đã rà tay 23 trigger" | Hôm nay thêm trigger ở `0030`, `0032`, `0033`, `0037`, `0038`, `0039`; nhánh ADR-0049 thêm ~70 trigger (`0034`, `0035`, `0041`, `0042`, `0043`) | Bài NT-R5 chạy trên **toàn bộ** schema sau khi gộp ADR-0049; không dựa vào số 23. Đã xem nhanh `0042` trên nhánh `thi-cong-adr-0049-tiep`: trigger `vc_*` đọc `v_ord_leg_key`, `v_ord_order_flag`, `v_ord_passenger_key`, `v_ord_passenger_row` (view công bố) — dự kiến thoả; **chưa chạy bài máy**. |
| ADR-0025 đ5: khoá **năm** bảng | Nhánh ADR-0049 thêm hai bảng của `orders`: `ord_transfer_leg` (có trigger "đóng một lần" `ord_transfer_leg_closed`) và `ord_passenger`; thêm trigger `orders_confirm_requires_leg_date` trên `orders`, view `v_ord_order_flag (id, is_confirmed, is_cancelled)` | **Q1.** View `v_ord_order_state` vẫn thêm riêng (view là hợp đồng công bố, không sửa view cũ). |
| Route ghi đơn | `orders/index.ts:251, 292, 324, 345, 368` (tạo, sửa nháp, sửa chuyến, đổi người đặt, đổi trạng thái); `dispatch/index.ts:144, 204, 229` (đổi/nhận người phụ trách, HDV huỷ, HDV sửa số khách) | Danh sách **sinh từ router** (Task 6e), nhánh ADR-0049 sẽ thêm route. |
| Tự đóng phân công khi ngưng tài khoản | Không thấy: chỉ `dispatch/repository.ts:30-50` ghi `dsp_assignment` (chèn/đóng khi đổi người); không trigger nào ghi bảng này | Rủi ro R4 nhỏ hơn ADR lo; vẫn rà lại sau khi gộp ADR-0049. |
| `permissions.ts` | `payment.receive` `:85`, `payment.refund` `:86`; bài ghim `permissions.test.ts:28-29`, dòng DRIVER `:274-286`, DRIVER_PARTNER `:294-306`; ghim PARTNER ở `src/modules/orders/xem-don-theo-quyen.test.ts` | Task 4. |
| `ORDERS_GATE` | `permissions.ts:188` đã gồm FIELD | Route "Đã giao", ghi lần thu dùng cổng `orders` (trang ghép ghi `staff` — lúc đó FIELD chưa vào cổng). |
| `audit_log.order_id` | Cho phép `NULL` từ `0005` (có `target_type`, `target_id`); `auditStatement(db, entry, onlyIf?)` ở `src/modules/audit/index.ts:19` | Câu bảo vệ kiểu `wonGuard` dùng tham số `onlyIf`. |
| Kiểm `R-PTY-1` | `scripts/audit-checks.mjs:117-121` | `R-BIL-7` dùng lại. |
| Hàng rào Bảng tin | `src/bang-tin-guard.test.ts` `FILES` chỉ `orders/index.ts`, `dispatch/index.ts` | Thêm `billing/index.ts` (siết). |

## 3. Thiết kế chốt ở kế hoạch (ADR để "chốt ở kế hoạch")

Tên dưới đây là **tên thi công**; đổi tên trước khi migration áp remote là hai chiều.

### 3.1 Dữ liệu `orders` (migration A — số `≥ 0044`, lấy ở Task 0)

- `ALTER TABLE orders ADD COLUMN delivered_at TEXT`, `delivered_by TEXT`, `completed_at TEXT`, `completed_by TEXT` (WHO kiểu ADR-0003 đ6, không khoá ngoại). Không đụng `CHECK (status IN …)` (`migrations/0003_orders.sql:6`).
- `CREATE VIEW v_ord_order_state AS SELECT id, status, delivered_at, completed_at FROM orders`.
- Trigger (tên đề xuất, mỗi trigger một câu `RAISE`, mẫu `0017`, `0021`):
  - `orders_delivered_from_confirmed` — đặt `delivered_at` chỉ khi `OLD.status='confirmed' AND OLD.delivered_at IS NULL`.
  - `orders_completed_after_delivered` — đặt `completed_at` chỉ khi `OLD.delivered_at IS NOT NULL AND OLD.completed_at IS NULL`.
  - `orders_delivered_lock` — `BEFORE UPDATE ON orders WHEN OLD.delivered_at IS NOT NULL AND NOT (<đúng câu Hoàn thành>)`, trong đó "đúng câu Hoàn thành" = mọi cột khác `IS` giá trị cũ, `OLD.completed_at IS NULL`, `NEW.completed_at IS NOT NULL`. Liệt kê **mọi** cột ⇒ bài NT-R6 canh cột thêm sau.
  - `order_service_delivered_lock_{ins,upd,del}`, `order_item_delivered_lock_{ins,upd,del}`, `order_money_adjustment_delivered_lock_ins` — đọc `orders` (cùng module).
  - **Chờ Q1:** `ord_transfer_leg_*`, `ord_passenger_*` khoá sau "Đã giao" hay không.
- Trigger của `dispatch` (trong migration A, ghi rõ module ở chú thích): `dsp_assignment_delivered_lock_{ins,upd}` — dòng `HANDLE` của đơn có `v_ord_order_state.delivered_at IS NOT NULL` (đọc view công bố; cạnh `dispatch → orders` đã có).

### 3.2 Dữ liệu `billing` (migration B — số kế tiếp, cùng bản phát hành)

| Bảng | Cột chính | Ràng buộc |
|---|---|---|
| `bil_payment_method` (tra cứu) | `code` (`cash`, `bank_transfer`, `other` — trùng mã `deposit_method` cũ để chép 1:1), `name`, `sort_order`, `active` | tập mở, kiểm ở code |
| `bil_collector_role` | `COMPANY` Công ty, `STAFF` Nhân viên, `BOOKER` Bên đặt (người hưởng), `SUPPLIER` Nhà cung cấp (`active = 0` — lượt 2), `UNKNOWN` Chưa rõ (chỉ cọc cũ) | |
| `bil_receipt_kind` | `CUSTOMER_PAYMENT` thu của khách, `CUSTOMER_REFUND` trả lại khách | |
| `bil_receipt_stage` | `PREPAID` trả trước, `AT_DELIVERY` lúc "Đã giao" | |
| `bil_posting_kind` | `RECEIPT`, `DELIVERED`, `COMPANY_RECEIVED`, `SETTLEMENT`, `REFUND`, `ADJUSTMENT`, `REVERSAL` | |
| `bil_debt_kind` | `HELD` tiền đang giữ hộ, `SETTLEMENT` quyết toán, `REFUND` hoàn khách (lượt 2 thêm dòng) | |
| `bil_payment_receipt` | `id`, `order_id` → `orders`, `kind_code`, `amount INTEGER CHECK (amount > 0)`, `collector_party_id` → `pty_party` NULL, `collector_role_code`, `method_code`, `collected_for_party_id` → `pty_party`, `stage_code`, `occurred_date TEXT NOT NULL`, `reverses_id` → chính bảng, `UNIQUE`, `note`, 4 cột WHO | `CHECK ((collector_party_id IS NULL) = (collector_role_code = 'UNKNOWN'))`; khoá ngoại `NO ACTION` |
| `bil_posting` | `id`, `kind_code`, `order_id` NULL (phiếu nộp nhiều đơn), `reason`, `reverses_posting_id` UNIQUE NULL, `occurred_date`, 4 cột WHO | lý do bắt buộc với `ADJUSTMENT`/`REVERSAL` (trigger) |
| `bil_debt_line` | `id`, `posting_id`, `debtor_party_id`, `creditor_party_id`, `amount > 0`, `kind_code`, `order_id`, `order_service_id` NULL, `receipt_id` NULL, `reverses_line_id` UNIQUE NULL, 4 cột WHO | `CHECK (debtor_party_id <> creditor_party_id)` |

- Trigger chỉ-thêm `bil_*_no_update`, `bil_*_no_delete` cho ba bảng; trigger "dòng đảo khớp gốc" (cùng số, đổi chỗ) cho `bil_debt_line`, `bil_payment_receipt`.
- `updated_*` = `created_*` (lệch câu chữ ADR-0003 đ6 đã ghi ở ADR-0026 — bài kiểm đòi 4 cột).
- View công bố (chỉ khoá + số): `v_bil_order_paid (order_id, paid_net, unknown_count)`, `v_bil_party_balance (party_id, counterparty_id, order_id, balance)`. Tên chốt khi viết `docs/data-dictionary.json`.
- **Chuyển cọc cũ** (một lần, trong migration B, đọc cột `orders` — ghi rõ ở sổ dữ liệu là câu một lần): mỗi đơn `deposit_amount > 0` (kể cả huỷ) → một `bil_payment_receipt` `CUSTOMER_PAYMENT`, `PREPAID`, `UNKNOWN`, `method_code = deposit_method` (`NULL` → `other` — GĐ), `collected_for_party_id` = hồ sơ công ty chủ (đọc `v_pty_owner_company`), `created_by = 'he-thong'`, `occurred_date` = **Q3**. Có dòng nợ hay không: **không** (người thu chưa rõ ⇒ không biết ai nợ; Kế toán đảo rồi ghi lại đúng người thu — ADR-0026 đ9).
- `docs/data-dictionary.json`: mọi bảng/view mới, bốn cột mới, `deprecatedColumns` cho ba cột cọc ("không dùng nữa — xem ADR-0026") → `npm run dict`.

### 3.3 Lô ghi (một `db.batch()`, đúng chủ sở hữu — ADR-0024 đ4, ADR-0025 đ4)

**"Đã giao – đã thu đủ"** (`POST /api/orders/:id/delivered`, module `billing`, cổng `orders`):
1. Trước lô (đọc): `can(order.handover, { assigned: ctx.isAssigned })`; `orders` công bố "phải thu hiện hành" (`dueAmount` = hàm đã có `effectiveMoney` bỏ tham số cọc), `updated_at`, số thứ tự điều chỉnh mới nhất, ngày đi muộn nhất (`getDepartDates`, `repository.ts:254`), bên đặt; `billing` tự tính đã thu, lần thu "chưa rõ"; M1 qua `v_pty_open_role_group` (`migrations/0024:26`).
2. Câu 1 — **từ `dispatch/index.ts`**: `auditStatement(…, action 'order_delivered', onlyIf = "người gọi vẫn là HANDLE đang mở")` (với mức không phải FIELD: không điều kiện người phụ trách).
3. Câu 2 — **từ `orders/index.ts`** (chưa chạy): `UPDATE orders SET delivered_at=?, delivered_by=?, updated_at=? WHERE id=? AND status='confirmed' AND delivered_at IS NULL AND updated_at=? AND <seq điều chỉnh mới nhất = ?> AND EXISTS (SELECT 1 FROM audit_log WHERE id=?)`.
4. Câu 3.. — **của `billing`**: lần thu nhập ở bước này (nếu có), phiếu `DELIVERED`, dòng nợ `HELD` (nếu người thu không phải Công ty), mỗi câu `… WHERE EXISTS (SELECT 1 FROM v_ord_order_state WHERE id=? AND delivered_at=?)` với mốc do request sinh.
5. Sau lô: đọc `v_ord_order_state.delivered_at` = mốc của mình ⇒ thắng (200 + `baoThayDoi`); khác ⇒ 409, câu tiếng Việt.

**"Hoàn thành"** (`POST /api/orders/:id/completed`, cổng `office`): câu 1 của `billing` — nhật ký `order_completed` chỉ chèn khi `NOT EXISTS` bên nào có số dư nợ công ty > 0 trên đơn (đọc `bil_` của chính nó); câu 2 của `orders` — `UPDATE orders SET completed_at…, completed_by…, updated_at… WHERE … completed_at IS NULL AND delivered_at IS NOT NULL AND EXISTS (audit id)`; sau lô đọc lại.

**Ghi lần thu** (`POST /api/orders/:id/payments`, cổng `orders`): `can(payment.receive, { ownerId, assigned })`; người thu ∈ {chính mình, Công ty} trừ Kế toán/Toàn quyền; câu bảo vệ "đơn chưa Đã giao" = `WHERE EXISTS (SELECT 1 FROM v_ord_order_state WHERE id=? AND delivered_at IS NULL AND status <> 'cancelled')` (GĐ: không ghi thu mới trên đơn huỷ; hoàn cọc đơn huỷ đi đường hoàn khách).

### 3.4 Route (bảng (3) trang ghép, cập nhật)

| Route | Module | Cổng | Ô |
|---|---|---|---|
| `POST /api/orders/:id/delivered` | billing | orders | `order.handover` |
| `POST /api/orders/:id/completed` | billing | office | `order.complete` |
| `POST /api/orders/:id/payments` | billing | orders | `payment.receive` |
| `GET /api/orders/:id/payments` (đã thu, còn lại, dư chờ hoàn, lần thu, lý do đang giữ) | billing | orders | `order.view` + `money.view` |
| `POST /api/ledger/balances` (thân: danh sách id đơn; trả đã thu/còn lại cho **từng đơn người gọi được xem tiền**) — cho danh sách đơn, Trang chủ, "Việc của tôi" | billing | orders | `money.view` từng đơn (đơn không được xem → bỏ khỏi kết quả) |
| `GET /api/ledger/unpaid-summary` (ô "Còn thiếu tiền" Trang chủ) | billing | orders | như `money.view` của dashboard hôm nay |
| `POST /api/ledger/company-receipts/:receiptId/confirm` | billing | office | `ledger.write` |
| `POST /api/ledger/settlements` (nộp / trả, phân bổ theo đơn) | billing | office | `ledger.write` |
| `POST /api/ledger/refunds` | billing | office | `payment.refund` |
| `POST /api/ledger/adjustments` (điều chỉnh / đảo, lý do bắt buộc) | billing | office | `ledger.write` |
| `GET /api/ledger` | billing | office | `ledger.view` (`any`) |
| `GET /api/ledger/mine` | billing | staff | `ledger.view` (`own`) |
| `GET /api/orders/:id/receipt` | receipt | orders | `order.view` + `money.view` + `contact.view` |

- `POST /api/ledger/balances` là POST chỉ-đọc (thân chứa danh sách id) — **GĐ**, đổi sang `GET ?ids=` được; phải có trong `cua_ghi`? Không: nó hỏi `can()` trong thân nên qua hàng rào 2. Nếu thứ tự khai route đụng `/api/orders/:id` (bẫy trang chủ), khai route `billing` **trước** trong mảng `modules` hoặc dùng tiền tố `/api/ledger/…` như trên.
- Nhật ký mới ở `src/shared/audit-actions.ts` (nhãn tiếng Việt): `order_delivered`, `order_completed`, `payment_recorded`, `ledger_company_received`, `ledger_settlement`, `ledger_refund`, `ledger_adjustment`, `ledger_reversal`. Không ghi SĐT, không số tiền chi tiết trong `detail`.
- Bảng tin: `THAY_DOI` (`src/shared/bang-tin.ts:9`) thêm hai loại "chỉ làm mới" cho "Đã giao", "Hoàn thành" (ADR-0025 đ8 — GĐ); ghi lần thu cũng báo làm mới đơn.

## 4. Các task (thứ tự nền trước — Hiến chương 5.13)

Mỗi task: **đỏ trước** (viết test, chạy, thấy đỏ đúng lý do) → mã → **xanh** → `npm test` + `npm run typecheck` (0 lỗi) → commit nhỏ tiếng Việt. Chạm API/migration ⇒ thêm `npm run test:e2e` (cần mạng). Ghi sổ `docs/superpowers/plans/2026-09-29-so-tien-luot-1-thi-cong-nhat-ky.md` (ruling, nợ) — P19.

### Task 0 — Điều kiện bắt đầu (cổng, chưa thoả ngày 29/9)
- **Chưa thoả:** nhánh `thi-cong-adr-0049-tiep` / `thi-cong-adr-0049-song-song` **chưa gộp `main`** (kiểm `git branch --no-merged main` 29/9). Không thi công Task 1+ trước khi gộp (bản làm mới §3.13, "Bổ sung khi duyệt" của ba ADR).
- Việc: (a) worktree mới từ `main` sau khi gộp ADR-0049, gộp nhánh này vào (chỉ tài liệu); (b) đo lại mọi `tệp:dòng` ở §2, ghi chênh vào sổ thi công; (c) lấy số migration thật: `ls migrations` + `git log --all --name-only --diff-filter=A -- migrations` (hôm nay: `main` tới `0039`; nhánh chưa gộp có `0034`, `0035`, `0040`–`0043`; `0019` giữ chỗ B5; `0029` giữ chỗ ADR-0041) ⇒ dự kiến `0044`, `0045`; lấy số ADR thật nếu cần (≥ ADR-0052, `ADR-0051` ở `ghi-trang-thai-1-37`); (d) chạy nền: `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local` — ghi số xanh làm mốc; (e) Q1 đã trả lời trước Task 2, Q2 trước Task 7, Q3 trước Task 3.
- **Xong khi:** sổ thi công có mốc `main`, số migration, số đo lại, mốc test.

### Task 1 — Rào kiến trúc trước (siết, Điều 9.4 cho phép)
Tệp: `src/architecture.test.ts`, `docs/SO-HANG-RAO.md`.
- 1a `ALLOWED_EDGES` thêm `billing`, `receipt` (chú thích trỏ ADR-0024 đ2), `orders` thêm `pricing`, `pricing: ["parties", "catalog", "audit"]`; `TABLE_PREFIX`/`VIEW_PREFIX` thêm `prc_`/`prc`. **GĐ:** lượt 1 **chưa tạo** thư mục `src/modules/pricing/` (không có SQL ⇒ không vào được `STRICT` mà bài `:338-339` đòi đăng ký SQL); chỉ khai ranh giới; tạo thư mục + `STRICT` ở lượt 2. NT-R1.
- 1b Bài "orders không nhắc `bil_`" — khuôn `dispatchViewHits` (`architecture.test.ts:508-535`): tự kiểm bộ bắt trên đoạn mẫu + quét mọi `.ts` của `src/modules/orders/`. Đột biến: chèn chuỗi SQL `bil_` → đỏ → hoàn nguyên. NT-R4.
- 1c Hạng `KHONG_BANG` + bài (không `.prepare(`/`.batch(`/`.exec(`; không mục sổ dữ liệu thuộc `receipt`; không đồng thời ở `STRICT`/`LEGACY`/`KHONG_DB`); sửa bài `:435-446` nhận hạng mới. Đột biến ở Task 8 (khi có thư mục `receipt`). NT-R3.
- 1d Bài luật thân trigger — **cần thử trước (spike, ghi kết quả vào sổ thi công):** cách chính: với mỗi trigger ở `sqlite_master`, chạy trên `node:sqlite` một `EXPLAIN` của câu kích hoạt tối thiểu và đọc tập bảng/view bị mở (khuôn 8(b)); **chưa kiểm** EXPLAIN có lộ chương trình con của trigger trên Node 22 hay không. Cách dự phòng: tách thân trigger (`BEGIN…END`, vế `WHEN`) → thay `NEW.x`/`OLD.x` bằng hằng `NULL` → `EXPLAIN SELECT …` từng câu → đọc `OpenRead` theo `rootpage`, view mở bằng tên qua sổ. Có ca tự kiểm "đáp án biết trước" (3 trigger hiện có: `lc1_stf_permission_external_partner_only` → {`staff`, `v_pty_open_role_group`}; `orders_confirm_requires_trip` → {`order_service`}; `vc_vehicle_owner_ins` → {`v_pty_owner_company`, `v_pty_carrier`}). Đột biến: cài tạm trigger `orders` đọc `bil_payment_receipt` (trong DB thử của test, sau migration B) → đỏ. Nếu cả hai cách không đạt: dừng, báo điều phối (không hạ thành quét chuỗi mà không ghi "dựa vào kỷ luật"). NT-R5.
- 1e Bảng tin: `src/bang-tin-guard.test.ts` `FILES` thêm `modules/billing/index.ts` (đột biến ở Task 6b). NT-R7.
- Lệnh: `node --test src/architecture.test.ts`, `npm test`, `npm run typecheck`.
- **Xong khi:** mỗi rào 1b/1d có dòng `docs/SO-HANG-RAO.md` với ngày + phép đột biến + thông báo đỏ quan sát được; 1c/1e ghi "chờ đột biến ở Task 8/6b".

### Task 2 — Migration A: mốc và khoá trên `orders` (+ trigger của `dispatch`)
Tệp: `migrations/00NN_orders_da_giao.sql` (số từ Task 0), `src/migrations-orders-da-giao.test.ts` (mới), `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (`npm run dict`), `src/architecture.test.ts` (NT-R6).
- Đỏ trước: test migration (khuôn `src/migrations-0021.test.ts`, `node:sqlite`) cho NT-D1, NT-D3, NT-D4, NT-D7 và NT-R6 — đỏ vì chưa có tệp.
- Mã: như §3.1. Trigger `ord_transfer_leg`/`ord_passenger` **chỉ** theo trả lời Q1.
- Kiểm cả luồng hợp lệ không bị chặn: xác nhận, huỷ đơn chưa "Đã giao", sửa chuyến trước "Đã giao", đổi người phụ trách trước "Đã giao".
- Lệnh: `node --test src/migrations-orders-da-giao.test.ts`, `npm test`, `npm run typecheck`, `npm run db:migrate:local`, `npm run test:e2e` (hồi quy: mọi kịch bản cũ xanh), `node scripts/audit-invariants.mjs --db local`.
- **Xong khi:** xanh hết; bài NT-R5 (Task 1d) xanh với trigger mới; người kiểm độc lập đọc trigger.

### Task 3 — Migration B: sổ `billing` + chuyển cọc cũ
Tệp: `migrations/00NN+1_billing_so_cong_no.sql`, `src/migrations-billing.test.ts`, `docs/data-dictionary.json` (+ `npm run dict`).
- Đỏ trước: NT-D2, NT-D5, NT-D6; bài kiến trúc sẵn có (tiền tố `bil_` thuộc `billing`, đủ 4 cột WHO, cấm `CASCADE`, view `v_bil_*` đúng sổ) đỏ khi sổ dữ liệu chưa khai.
- Mã: §3.2. Câu chuyển cọc đặt **sau** `CREATE TABLE`, **trước** trigger chỉ-thêm (khuôn `0034`). `occurred_date` theo Q3.
- Thêm kiểm "thông tin" vào `scripts/audit-checks.mjs`: số đơn còn lần thu "chưa rõ" (việc Kế toán phải làm sau phát hành).
- Lệnh: như Task 2 + `node --test src/audit-invariants.test.ts`.
- **Xong khi:** xanh; migration test chứng minh tổng khớp trên dữ liệu mẫu có đơn huỷ có cọc, đơn cọc `NULL` hình thức.

### Task 4 — Quyền (việc lớn)
Tệp: `src/shared/permissions.ts` (`:59` chú thích, `:85-86`, thêm 4 ô), `src/shared/permissions.test.ts` (`:28-29`, dòng DRIVER `:274-286`, DRIVER_PARTNER `:294-306`), `src/modules/orders/xem-don-theo-quyen.test.ts` (ghim PARTNER), `docs/quyen-hoan.json`.
- Đỏ trước: bài ghim mang giá trị bảng 9 cột (bản làm mới §2) → đỏ.
- Mã: `order.handover`, `order.complete`, `ledger.view`, `ledger.write` mới; `payment.receive`, `payment.refund` đổi. Không thêm mã quyền ⇒ không đụng `EXTERNAL_PERMISSIONS`/LC-1.
- Hàng rào 1 sẽ đỏ vì 4 ô mới chưa có route: **thêm tạm** 4 mục vào `thao_tac` của `docs/quyen-hoan.json` (hạn = ngày dự kiến phát hành, người chịu trách nhiệm: chủ dự án); Task 6 gỡ (bài "hoãn thừa" buộc gỡ). `payment.receive`, `payment.refund` gỡ ở Task 6a/6d cùng commit với route.
- Chạy lại các bài "tập con quyền" (512 tập) — `npm test`.
- **Xong khi:** xanh; người kiểm độc lập đối chiếu `MATRIX` với bảng §2 từng ô.

### Task 5 — Luật thuần `billing` + sổ vàng
Tệp: `src/modules/billing/rules.ts` + `rules.test.ts`; `golden/hoan-tat-cong-no.json` (thêm ca), `src/so-vang.test.ts` (lớp 2: chạy trên mã thật).
- Hàm thuần (không I/O): `sinhDongLanThu` (ADR-0026 đ4 gạch 1–2), `sinhPhieuDaGiao` (lượt 1: không dòng thương mại), `sinhDongXacNhanCongTy`, `sinhDongQuyetToan`, `sinhDongHoanKhach`, `sinhDongDao`, `soDuTheoBen`, `conLai` (**hàm duy nhất** tính đã thu/còn lại/dư — NT-R9), `lyDoChuaGiaoDuoc` (thiếu, dư chờ hoàn, "chưa rõ", người hưởng, trước ngày đi — trả câu tiếng Việt + "ai phải xử lý": Kế toán/HDV, Hiến chương 5.7).
- Sổ vàng: thêm ca lượt 1 **ở trạng thái `cho_xac_nhan`** — HDV giữ tiền mặt rồi nộp; "Công ty thu – CK" do HDV khai chờ Kế toán xác nhận; khách trả dư chờ hoàn; cọc cũ "chưa rõ" bị đảo và ghi lại. AI **không** đổi sang `da_xac_nhan`. Lớp 2 in "chưa áp dụng: N ca chờ xác nhận" và **không** tính là đạt khi 0 ca đã xác nhận.
- Lệnh: `node --test src/modules/billing/rules.test.ts src/so-vang.test.ts`, `npm test`, `npm run typecheck`.
- **Xong khi:** xanh; ví dụ NT-S1 có test thuần.

### Task 6 — Route `billing` (việc lớn; mỗi mục một commit)
Tệp: `src/modules/billing/{index.ts,repository.ts,service.ts}`, `src/index.ts` (mảng `modules`), `src/architecture.test.ts` (`STRICT` thêm `billing` — NT-R2), `src/modules/orders/index.ts` (công bố: câu `UPDATE` chưa chạy "Đã giao"/"Hoàn thành", "phải thu hiện hành", mốc khoá lạc quan), `src/modules/dispatch/index.ts` (công bố câu bảo vệ người phụ trách), `src/shared/contracts.ts` (DTO mới), `src/shared/audit-actions.ts`, `src/shared/bang-tin.ts`, `src/route-access.test.ts` (ảnh chụp), `docs/quyen-hoan.json`, `tests/e2e/so-tien.mjs` (mới).
- 6a Ghi/đọc lần thu + `POST /api/ledger/balances` + `GET /api/ledger/unpaid-summary`; gỡ `payment.receive` khỏi hoãn. NT-Q4, NT-S3.
- 6b "Đã giao" (lô §3.3). E2e NT-Q2, NT-F1–F6 (F6: kịch bản tự cài trigger `RAISE` tạm trên D1 local tạm cho câu thứ 3, rồi gỡ — không móc thử nghiệm trong mã chạy thật). Đột biến hàng rào Bảng tin (NT-R7) → đỏ → hoàn nguyên → dòng `SO-HANG-RAO`.
- 6c "Hoàn thành". NT-Q3, NT-F8.
- 6d Sổ: xác nhận công ty đã nhận, nộp/trả, hoàn (gỡ `payment.refund` khỏi hoãn), điều chỉnh/đảo, `GET /api/ledger`, `GET /api/ledger/mine`. NT-Q5, NT-S1, S2, S4, S5, S8.
- 6e Từ chối sớm sau "Đã giao" ở mọi route ghi đơn của `orders` **và** `dispatch` (đọc `delivered_at`: `orders` từ bảng mình; `dispatch` qua `v_ord_order_state`). Bài U mới nạp module thật (khuôn `src/route-access.test.ts`), lọc route ghi có `/api/orders/:id`, so với bảng ca trong `tests/e2e/so-tien.mjs` — route mới không có ca → đỏ. NT-F7.
- 6f Gỡ 4 mục hoãn tạm của Task 4. NT-R8. Đột biến NT-R2 → dòng `SO-HANG-RAO`.
- Lệnh mỗi mục: `npm test`, `npm run typecheck`, `npm run db:migrate:local`, `npm run test:e2e -- so-tien` rồi `npm run test:e2e` đủ, `audit-invariants --db local`.
- **Xong khi:** e2e xanh đủ NT-F/NT-S/NT-Q; người kiểm độc lập đọc lô ghi và câu bảo vệ.

### Task 7 — Ngừng đọc ba cột cọc (phía máy chủ) — **cùng bản phát hành với Task 3** (ADR-0026 đ9)
Tệp: `src/modules/orders/rules.ts:31-33,120-145` (bỏ nhận cọc từ trình duyệt; ghi `deposit_amount=0`, `deposit_method=NULL`, `remaining_amount=total` cho đơn mới; đơn cũ giữ phép trừ theo `0007` — ca "tổng mới < cọc cũ" theo **Q2**), `src/modules/orders/repository.ts` (`:27-29,163-165,303,337-338,441-594,714-720,750-756,932-959`), `src/modules/orders/money-adjustment.ts:215,223-225`, `src/modules/orders/index.ts:137,161-162`, `src/shared/contracts.ts:194-196,216,263-264,326-335,461-486`, `src/shared/service-form.ts:383-394`, `src/shared/order-confirmation.ts:219-220` (thay ở Task 8); test/kịch bản cũ đọc cọc.
- Ô "Còn thiếu tiền" rời `getDashboard` sang `GET /api/ledger/unpaid-summary`; `MyAssignmentDto` bỏ `depositAmount`/`remainingAmount` (giữ `total`), "Việc của tôi" gọi `POST /api/ledger/balances`.
- Đỏ trước: bài U NT-R9 — quét `src/**`, `web/**` (trừ test) tìm năm tên; **danh sách cho phép chính xác**: câu `INSERT`/`UPDATE` trong `orders/repository.ts` ghi cột để thoả `0007`, và tệp migration B. Đỏ vì bề mặt còn đọc.
- Lệnh: `npm test`, `npm run typecheck`, `npm run test:e2e` (sửa kịch bản cũ theo số mới của `billing`).
- **Xong khi:** NT-R9 xanh; e2e cũ xanh với số lấy từ `billing`.

### Task 8 — Module `receipt` (hạng `KHONG_BANG`)
Tệp: `src/modules/receipt/index.ts`, `src/shared/contracts.ts` (`ReceiptDto` — danh sách trắng ADR-0026 đ11), `src/shared/order-confirmation.ts` (hàm vẽ nhận `ReceiptDto`, bỏ `buildConfirmation(order: OrderDetailDto…)` `:243`), `web/confirmation-dialog.ts:116`, `src/index.ts`, test `src/modules/receipt/*.test.ts`.
- `receipt` chuyển tay cầm `env.DB` cho hàm công bố của `orders`, `billing`, `parties` (`ownerCompany`), `company` — không tự có SQL.
- Đỏ trước: NT-B1 (số lạ 480.017 ở mọi ô bí mật + quét JSON; thêm tạm trường giá vốn → đỏ); đột biến NT-R3 (chèn `.prepare(`) → đỏ → dòng `SO-HANG-RAO`; bài quét NT-B2.
- Lệnh: `npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản `v1-xac-nhan-png.mjs` (bảng `web/CLAUDE.md`).
- **Xong khi:** xanh; người kiểm độc lập đọc danh sách trắng.

### Task 9 — Bất biến `R-BIL-*`
Tệp: `scripts/audit-checks.mjs` (sau `R-PTY-1` `:117-121`), `src/audit-invariants.test.ts`.
- `R-BIL-1`, `R-BIL-3` (lần thu + dòng nợ), `R-BIL-4`, `R-BIL-6`, hai bất biến mốc của ADR-0025 NT 8; `R-BIL-7` = ghi chú trỏ `R-PTY-1` (không kiểm trùng); `R-BIL-2`, `R-BIL-5` in "chưa áp dụng".
- Đỏ trước: test đơn vị cho từng câu SQL trên `node:sqlite`; trên D1 local: chèn dòng đảo sai số (tạm gỡ trigger trong DB tạm) → `audit-invariants --db local` thoát 1 → hoàn nguyên. NT-A1.
- **Xong khi:** xanh; dòng `SO-HANG-RAO` cho `R-BIL-*`.

### Task 10 — Giao diện
Tệp (dự kiến): `web/order.ts` (nút "Đã giao – đã thu đủ" cho người có ô, hộp xác nhận **chung với nút huỷ của HDV** — bản ghép (4) mục 10, hiện "Bạn đang giữ X ₫ của công ty"; nút "Hoàn thành"; khối lần thu; dòng "lý do đang giữ đơn + ai phải xử lý"), `web/order-form.ts` (bỏ ô cọc `:176-251,379-380`; bước hai ghi lần thu sau khi lưu, câu lỗi NT-S6; dùng `location.replace` như cũ), `web/order-card.ts:39-40,116,158`, `web/orders.ts:68-69`, `web/home.ts:74-79,138-139`, `web/viec-cua-toi.ts:508-509`, trang mới "Sổ của tôi" và "Sổ công nợ" (Kế toán) theo công thức c (`public/*.html`, `PAGES` ở `src/shared/sw-policy.ts`, `build:web`, `web/shell.ts`, `web/account.ts`), nhãn trạng thái ở mọi nơi hiển thị trạng thái (`src/shared/` nhãn chung — không chép tay).
- Luật: không `innerHTML`; token CSS ở `public/app.css`; ô gõ 16px; không lộ mã (`delivered`, `UNKNOWN`…); giao diện chỉ ẩn/hiện.
- Bố cục màn mới: **GĐ** theo khuôn thẻ sẵn có; bài học Đợt D — trước khi dựng, đưa chủ ảnh phác (hoặc chủ vẽ Claude Design) cho hai màn sổ mới; đây là chỗ nhìn thấy trên màn hình, **phải hỏi** (không chặn Task 1–9).
- Kịch bản Chrome: chạy lại ba `a2-smoke-*.mjs`, `v1-nguoi-phu-trach.mjs`, `v1-xac-nhan-png.mjs`, `trang-chu-smoke.mjs` (đếm mục thanh bên đổi — cập nhật số), `hdv-viec-cua-toi-smoke.mjs`, `doi-tac-lap-don-smoke.mjs`, `chon-hdv-lap-don-smoke.mjs`; kịch bản mới `so-tien-smoke.mjs` (390 + 1040) ở `docs/evidence/2026-09-29-so-tien-luot-1/kich-ban/` + thêm dòng vào bảng `web/CLAUDE.md` (**tệp luật — chỉ đề xuất**, Task 11). `npm run test:e2e -- pwa`.
- **Xong khi:** kịch bản xanh, ảnh bằng chứng ở `docs/evidence/`.

### Task 11 — Tài liệu mô tả + đề xuất luật + nhật ký thay đổi
- Mô tả (sửa cùng commit, không cần duyệt): `docs/SYSTEM-DESIGN.md` §5 (bảng mới), §6 (luồng hai bước), §7 (route), §8 (quyền), §17 dòng K13 (sổ tiền: từ "chưa có" sang "lượt 1"); `docs/CHANGE-GUIDE.md` (công thức mới "thêm loại dòng / hình thức thu = thêm dòng tra cứu + luật"; bảng §1; ma trận §3; bẫy: "orders không đọc bil_", "số còn lại chỉ ở billing", "trigger khoá liệt kê mọi cột"; §4 mục 32 đóng theo M2); `docs/data-dictionary.json` (đã ở Task 2–3).
- **Đề xuất luật (N9 — người thi công KHÔNG tự sửa):** tệp `docs/superpowers/plans/2026-09-29-so-tien-luot-1-de-xuat-luat.md` chứa diff cho `docs/ARCHITECTURE.md` (Phần I bảng thi hành dòng 5.3 — thêm rào trigger, `KHONG_BANG`; dòng 5.14 — "ngày phát sinh có từ lượt 1, khoá kỳ lệch có chủ ý tới lượt 2"; dòng 5.17 — lớp 2 chạy trên mã; Phần II danh sách module, hạng `KHONG_BANG`, luật trigger), `CLAUDE.md` §7 (nếu cần), `src/CLAUDE.md` (danh sách module, `billing` nghiêm, `receipt` KHONG_BANG), `web/CLAUDE.md` (dòng kịch bản Chrome). Chủ duyệt rồi mới áp.
- Nhật ký thay đổi lời thường (`src/shared/changelog.ts`, công thức t): "Hướng dẫn viên bấm 'Đã giao – đã thu đủ' sau chuyến; từ đó đơn không sửa được. Kế toán bấm 'Hoàn thành' khi tiền đã về công ty. Tiền trả trước ghi thành từng lần thu, có người thu."
- `docs/SPEC-tourdao-sales.md` §1: chỉ nếu mâu thuẫn (ADR-0004 đã mở).

### Task 12 — Kiểm độc lập + bàn giao triển khai
- Người kiểm độc lập chỉ-đọc (`nguoi-kiem-doc-lap`): đọc mã thật, chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --db local`, tự đột biến lại ít nhất NT-R4, NT-R5, NT-D3; đối chiếu từng NT ở §1 và từng ô bảng §2 bản làm mới. "Đạt" chỉ dựa trên báo cáo đó.
- Runbook (chủ tự chạy — `CLAUDE.md` §8; theo `docs/HANDOFF-N1.md` và `npm run trien-khai`): mục nhật ký thay đổi (A.0) → cổng chỉ-đọc → `kiem-phien-ban.mjs` ĐẠT → **điểm khôi phục Time Travel ghi TRƯỚC migration** (cửa một chiều: sau khi có dòng sổ/đơn "Đã giao" thật, lùi Worker không lùi dữ liệu) → test + typecheck + e2e xanh → migration A, B → `wrangler deploy` ngay → `audit-invariants --db remote` → `kiem-phien-ban.mjs --sau-deploy` → ghi trạng thái. AI chuẩn bị và đưa **nguyên lệnh**; không tự chạy lệnh ghi remote.
- Sau phát hành (việc người): Kế toán xử lý lần thu "chưa rõ" (số từ kiểm "thông tin" Task 3); báo nhân viên; thử iPhone thật; chủ/Kế toán xác nhận ca sổ vàng.

## 5. Rủi ro và điểm cần người kiểm xem kỹ

| # | Rủi ro | Cách chặn trong kế hoạch | Người kiểm xem |
|---|---|---|---|
| R1 | "Một câu hỏng thì cả lô D1 huỷ" **chưa kiểm** trên D1 thật | NT-F6 bằng trigger `RAISE` tạm trên D1 local tạm; nếu lô không huỷ trọn → dừng, báo chủ (thiết kế lô sai nền) | Kịch bản thật sự cài/gỡ trigger, và kiểm cả `audit_log`, `bil_*`, `orders` |
| R2 | Bài luật thân trigger (NT-R5) có thể không làm được bằng EXPLAIN trên Node 22 | Spike Task 1d, ca đáp án biết trước, cách dự phòng; không hạ cấp im lặng | Bài có tự kiểm bộ bắt; không "xanh vì rỗng" (đếm trigger > 0) |
| R3 | Khoá lạc quan theo `orders.updated_at` **không** bắt sửa số khách (mã hôm nay, §2) | Điều kiện số thứ tự điều chỉnh trong câu `UPDATE orders`; trigger cấm chèn điều chỉnh sau "Đã giao"; NT-F5 | Mọi đường đổi "phải thu" (sửa nháp, `handler-money-edit`, đổi dịch vụ) đều bị điều kiện bắt; rà thêm đường mới của ADR-0049 |
| R4 | Trigger khoá `dsp_assignment` chặn luồng tự đóng phân công (ngưng tài khoản, ADR-0049) | Hôm nay không thấy luồng tự đóng (§2); rà lại sau gộp ADR-0049; nếu có, luồng đó phải bỏ qua đơn đã "Đã giao" | `grep` mọi câu ghi `dsp_assignment` sau gộp |
| R5 | Trigger `orders_delivered_lock` liệt kê cột ⇒ cột thêm sau (của ADR-0049 hay lượt 2) lọt khoá | NT-R6 so `PRAGMA table_info` với thân trigger | Bài đỏ thật khi thêm cột thử |
| R6 | Đơn cũ đang "còn lại" âm (bớt người sau khi trả trước) | Sau migration là "dư chờ hoàn" (M2); không chặn sửa; Kế toán hoàn trước khi "Đã giao"; số đơn như vậy trên production **chưa kiểm** (AI không truy vấn remote) — thêm kiểm "thông tin" Task 3 | Màn đơn hiện đúng câu, không số âm |
| R7 | Xung đột ADR-0049 trên `orders`/`order_service`/`ord_*` và route Xác nhận (`orders/index.ts:368`) | Task 0 chờ gộp; Q1; chốt Xác nhận của ADR-0049 và điều kiện "Đã giao" ở hai route khác nhau — không viết đè | Trigger `orders_confirm_requires_leg_date` (nhánh 0049) vẫn chạy đúng cạnh trigger khoá |
| R8 | Chuyển cọc cũ là **một lần**, cửa một chiều | Migration test tổng khớp (NT-D2); Time Travel trước migration; `R-BIL-6` | Câu chuyển đọc đúng cả đơn huỷ, hình thức `NULL` |
| R9 | Danh sách/Trang chủ thêm một request `billing` (chậm, lệch nhau một nhịp) | Route đọc gộp một lần cho cả trang; nhãn số hiện "đang tải" (ADR-0035 khung) | Không bề mặt nào tự trừ ở trình duyệt |
| R10 | Đơn nháp cũ có cọc: bỏ ô cọc khỏi form ⇒ hạ tổng xuống dưới cọc cũ vướng trigger `0007` (`remaining ≥ 0`) → lỗi thô | Q2; tới lúc có trả lời, route trả câu tiếng Việt, không lỗi thô | Ca e2e cho đơn nháp cũ có cọc |
| R11 | Sổ vàng "xanh vì rỗng" | Lớp 2 in "chưa áp dụng"; nghiệm thu mã tiền chặn tới khi chủ/Kế toán xác nhận ca | `so-vang.test.ts` không đếm ca chờ là đạt |
| R12 | Lệch có chủ ý Hiến chương 5.14 (khoá kỳ) | Ghi ở đề xuất luật (Task 11) + `docs/SYSTEM-DESIGN.md` §16; hạn = cùng bản với lượt 2 | Không quên chép |

## 6. Câu hỏi còn mở cho chủ (gom một lần; mỗi câu chỉ chặn task ghi kèm)

- **Q1 — Hai bảng mới của đơn (chặng đưa đón `ord_transfer_leg`, danh sách hành khách `ord_passenger`, của ADR-0047/0049) có bị khoá sau "Đã giao" không?** ADR-0025 khoá "tất cả" nhưng soạn khi chưa có hai bảng này; Vận chuyển có thể còn cần đóng chặng / sửa hành khách sau chuyến. *Khuyến nghị A:* khoá cả hai như `order_service`, trừ đúng câu "đóng chặng" (`closed_at` từ `NULL`) nếu Vận chuyển cần — hỏi kèm có cần không. *B:* không khoá (Vận chuyển tự quản). Chặn: phần trigger của hai bảng ở Task 2.
- **Q2 — Đơn nháp cũ còn tiền cọc trên đơn** (cọc đã chuyển thành lần thu "chưa rõ"): khi sửa nháp làm tổng thấp hơn cọc cũ, cột cọc cũ làm cơ sở dữ liệu từ chối. *Khuyến nghị A:* khi sửa nháp, ghi cột cọc cũ về 0 (cột đã thôi mang nghĩa, số tiền đã nằm ở lần thu nên không mất; kiểm tổng khớp chỉ so lúc migration). *B:* giữ cột, từ chối bằng câu tiếng Việt (tạo ngõ cụt như M2 đã cảnh báo). Chạm dữ liệu ⇒ không tự chọn. Chặn: Task 7.
- **Q3 — "Ngày phát sinh" của các lần thu chuyển từ cọc cũ** là ngày nào? *Khuyến nghị A:* ngày tạo đơn theo giờ Việt Nam (gần nhất với lúc khách trả cọc). *B:* ngày chạy migration (theo chữ "mặc định = hôm nay" của bổ sung 5.14). Chạm dữ liệu tiền ⇒ không tự chọn. Chặn: Task 3.

**Việc chủ/Kế toán phải làm (không phải câu hỏi, chặn nghiệm thu mã tiền):** xác nhận con số SV-HT-06, SV-HT-07 và các ca lượt 1 Task 5 thêm; xem ảnh phác hai màn sổ mới (Task 10).

## 7. Giả định bề mặt (đảo được, ghi để chủ thấy)

- Chưa tạo thư mục `pricing` ở lượt 1 (chỉ khai ranh giới) — Task 1a.
- Mã tra cứu và tên bảng/view/route ở §3 (tên thi công).
- `POST /api/ledger/balances` thay vì `GET ?ids=`.
- Hình thức cọc cũ `NULL` → `other`.
- Không ghi lần thu mới trên đơn đã huỷ (hoàn đi đường hoàn khách).
- Bảng tin: hai loại "chỉ làm mới"; không thông báo màn hình khoá (từ ADR-0025 đ8 và bản làm mới §3.14).
- Bố cục hai màn sổ theo khuôn thẻ sẵn có — **nhưng hỏi ảnh phác trước khi dựng** (Task 10).

## 8. Điều chưa kiểm (lúc lập kế hoạch)

- Chưa chạy `npm test`/`typecheck`/e2e (vai lập kế hoạch; mốc sẽ lấy ở Task 0).
- Chưa kiểm D1 batch huỷ trọn lô (R1), chưa kiểm EXPLAIN thấy thân trigger trên Node 22 (R2).
- Số đơn có cọc, đơn "còn lại" âm, đơn nháp có cọc trên production: **không biết** (AI không truy vấn remote).
- Mã nhánh ADR-0049 chỉ xem lướt migration (`git show`), chưa đọc route/mã; mọi dòng ở §2 đo trước khi gộp.
- Chưa xác minh `ALTER TABLE … ADD COLUMN` với `CHECK` trên D1 (kế hoạch dùng trigger thay `CHECK` cho cột mốc).
