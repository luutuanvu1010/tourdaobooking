# Khoá tiền của đơn đã xác nhận ở hai lớp (mã + cơ sở dữ liệu)

> Ngày 2026-09-22. Trạng thái: **bản thảo chờ chủ dự án duyệt** (câu hỏi ở §6), chưa có mã. Chưa qua kiểm độc lập.
> Nguồn: kiểm toán kiến trúc `docs/AUDIT-2026-09-22-KIEN-TRUC.md` F-03 (việc sửa số 2 của §22); chủ dự án đồng ý thứ tự ba việc sửa ngày 2026-09-22.
> Bằng chứng: `tests/audit/redteam.test.mjs` D1 (thêm dòng tiền vào đơn đã xác nhận → CSDL cho qua), D2 (sửa tổng tiền đơn đã xác nhận → cho qua), D5 (câu kiểm đề xuất bắt được D1).
> Nguyên tắc chạm: P21 (mọi kiểm soát trọng yếu có ≥ 2 lớp), P10 (toàn vẹn hơn tính năng), ADR-0003 (toàn vẹn ở CSDL).
> Loại việc: **việc lớn** (tiền + dữ liệu: trigger mới) → thi công xong phải có người kiểm độc lập chỉ-đọc.
> Thử sơ bộ lúc soạn (người soạn, chưa kiểm độc lập): khối SQL ở §3 bước B, áp trên cả ứng dụng nạp lên SQLite (bộ khung `tests/audit/harness.mjs`) → lưu nháp (xoá rồi chèn lại dòng tiền), xác nhận, `PUT /trip`, `PUT /booker`, huỷ đều 200; mọi INSERT, UPDATE, DELETE dòng tiền và UPDATE cột tiền của đơn đã xác nhận hoặc đã huỷ đều bị chặn `order_frozen`; `SET subtotal = subtotal` đi qua. Ba câu `R-ORD-*` ở bước A trả 0 trên dữ liệu API tạo và bắt được đơn bị xoá dòng tiền. Đây chỉ là thử sơ bộ, **không thay** tiêu chí nghiệm thu §4.

## 1. Vấn đề

Luật "đơn đã xác nhận thì không đổi dịch vụ, số khách, tiền" hiện được giữ như sau:

| Phần của đơn | Lớp 1: mã (route chỉ sửa đơn nháp) | Lớp 2: cơ sở dữ liệu |
|---|---|---|
| Dịch vụ, số khách (`order_service`) | có | **có** (trigger `order_service_frozen_*`, 0008) |
| Dòng tiền (`order_item`) | có | **không** |
| Tạm tính, giảm giá, tổng, cọc, còn lại (`orders`) | có | chỉ kiểm **số học** (0007), **không** chặn sửa sau xác nhận |
| Tạm tính = tổng các dòng tiền | có (máy chủ tính) | **không ai kiểm**: 0007 ghi rõ trigger không diễn đạt được, vì dòng tiền được chèn sau đơn trong cùng batch; `audit-invariants` cũng không kiểm |

Hôm nay không có đường nào trong ứng dụng sửa được tiền của đơn đã xác nhận. Lỗ chỉ mở với SQL chạy tay và với **mã viết sau**. Đúng mã viết sau là thứ sắp tới: N3 thêm "sửa tiền sau xác nhận" (`order.money.edit`, ADR-0007) và sổ thu tiền (ADR-0004). Lớp 2 phải đứng sẵn trước khi lớp 1 thay đổi.

## 2. Hành vi mong muốn (lời thường)

- Đơn **đã xác nhận hoặc đã huỷ**: không thêm, bớt hay sửa được dòng tiền nào, và không đổi được tạm tính, giảm giá, tổng, cọc, hình thức cọc hay còn lại. Chặn cả khi sửa bằng SQL chạy tay.
- Những gì hôm nay làm được với đơn đã xác nhận **vẫn làm được**: sửa thông tin chuyến, đổi khách, đổi người phụ trách, huỷ đơn.
- Mỗi lần kiểm dữ liệu (trước và sau mỗi lần triển khai) báo đỏ nếu có đơn nào có **tạm tính khác tổng các dòng tiền**.

## 3. Thiết kế kỹ thuật (quyết định của người soạn, để lập kế hoạch)

Hai bước, **bước A làm trước và độc lập**: A chỉ đọc, không đổi hành vi, và cho biết dữ liệu thật có sạch không trước khi làm bước B.

### Bước A — kiểm trên dữ liệu (không đổi mã ứng dụng)

Thêm vào `scripts/audit-checks.mjs` (câu `R-ORD-1` đã chạy thật trong `tests/audit/redteam.test.mjs` với tên `MONEY_SUM_CHECK`):

| Mã | Kiểm | SQL (đếm dòng vi phạm) |
|---|---|---|
| `R-ORD-1` | tạm tính = Σ thành tiền các dòng | `SELECT count(*) FROM orders o WHERE o.subtotal IS NOT (SELECT COALESCE(sum(line_total), 0) FROM order_item i WHERE i.order_id = o.id)` |
| `R-ORD-2` | mọi dòng tiền thuộc một dịch vụ của chính đơn đó | `SELECT count(*) FROM order_item i LEFT JOIN order_service s ON s.id = i.service_id WHERE s.id IS NULL OR s.order_id IS NOT i.order_id` |
| `R-ORD-3` | đơn đã xác nhận có ≥ 1 dịch vụ và ≥ 1 dòng tiền | `SELECT count(*) FROM orders o WHERE o.status = 'confirmed' AND (NOT EXISTS (SELECT 1 FROM order_service WHERE order_id = o.id) OR NOT EXISTS (SELECT 1 FROM order_item WHERE order_id = o.id))` |

- Mức ban đầu: `warn-unless-strict`. **Chủ dự án chạy một lần trên production** (chỉ đọc): `node scripts/audit-invariants.mjs --db remote`. Đơn cũ trước migration 0008 có thể lệch; chưa ai kiểm, đây là lần đầu.
  - Nếu 0 vi phạm → nâng lên `fail`.
  - Nếu có vi phạm → dừng, trình danh sách mã đơn cho chủ quyết (sửa tay theo runbook hay chấp nhận dữ liệu cũ). **Không tự sửa dữ liệu thật.**
- `src/audit-invariants.test.ts` chạy các câu mới trên schema đầy đủ, theo khuôn hiện có.

### Bước B — trigger ở cơ sở dữ liệu (migration mới, chỉ thêm)

Số hiệu lấy lúc thi công (xem đặc tả chống gửi trùng §3; `0019` đang giữ cho B5).

```sql
-- Dòng tiền của đơn không còn nháp: không thêm, không sửa, không xoá.
CREATE TRIGGER order_item_frozen_insert BEFORE INSERT ON order_item
WHEN (SELECT status FROM orders WHERE id = NEW.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: dòng tiền của đơn không còn nháp'); END;
CREATE TRIGGER order_item_frozen_update BEFORE UPDATE ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: dòng tiền của đơn không còn nháp'); END;
CREATE TRIGGER order_item_frozen_delete BEFORE DELETE ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: dòng tiền của đơn không còn nháp'); END;

-- Tiền trên đơn không còn nháp: không đổi. Chỉ chặn khi GIÁ TRỊ đổi (câu SET giữ nguyên giá trị vẫn đi qua).
CREATE TRIGGER orders_money_frozen BEFORE UPDATE ON orders
WHEN OLD.status <> 'draft'
  AND (NEW.subtotal IS NOT OLD.subtotal OR NEW.discount IS NOT OLD.discount OR NEW.total IS NOT OLD.total
    OR NEW.deposit_amount IS NOT OLD.deposit_amount OR NEW.deposit_method IS NOT OLD.deposit_method
    OR NEW.remaining_amount IS NOT OLD.remaining_amount)
BEGIN SELECT RAISE(ABORT, 'order_frozen: tiền của đơn không còn nháp'); END;
```

- **Không cần tách hai lần phát hành.** Không đường mã nào hôm nay ghi những thứ này khi đơn không còn nháp (đã đọc: `updateDraftOrder` có `WHERE status = 'draft'`; `updateTrip` và `changeBooker` không đụng cột tiền hay `order_item`; `confirmOrder` và `cancelOrder` chỉ đổi `status/updated_at/confirmed_at`). Worker cũ và mới đều chạy được với trigger này. Bẫy của B5 ở CLAUDE.md §10 không áp dụng, vì B5 siết điều mà mã cũ còn vi phạm.
- **Lúc xác nhận:** `OLD.status = 'draft'` nên câu xác nhận đi qua.
- **Xoá đơn đã xác nhận** (không có route nào): cascade sang `order_item` nay cũng bị chặn. Đây đúng là điều ARCHITECTURE "Luật dữ liệu" đòi.
- Bài kiểm mới `src/migrations-<số>.test.ts` (khuôn `src/migrations-0017.test.ts`), và chuyển ca D1/D2 của `tests/audit/` thành test hồi quy khẳng định **bị chặn**.
- Cập nhật cùng commit: `docs/ARCHITECTURE.md` "Luật dữ liệu" (thêm một dòng về trigger mới), `docs/SYSTEM-DESIGN.md` §5 "Bất biến do SQL giữ", `docs/CHANGE-GUIDE.md` (bẫy: N3 muốn đổi tiền sau xác nhận phải đi qua §6 câu 1, không gỡ trigger).

## 4. Tiêu chí nghiệm thu (viết trước khi làm, kiểm được)

**Bước A**
1. `R-ORD-1..3` trả 0 trên dữ liệu do API tạo (e2e) và trên schema rỗng.
2. Chèn tay một dòng tiền lệch vào D1 tạm → `R-ORD-1` báo đúng 1 đơn; `audit-invariants --strict` thoát 1.
3. Kết quả chạy trên production được ghi (chỉ số đếm, không in dữ liệu khách) vào `docs/HANDOFF-N1.md`.

**Bước B**
4. Với đơn **đã xác nhận** và **đã huỷ**: INSERT, UPDATE, DELETE `order_item` bằng SQL → đều bị chặn với lỗi `order_frozen`; UPDATE bất kỳ cột tiền nào của `orders` → bị chặn.
5. Với đơn **nháp**: sửa đơn qua API (xoá rồi chèn lại dịch vụ và dòng tiền) vẫn chạy như hôm nay.
6. Đơn đã xác nhận: `PUT /trip`, `PUT /booker`, `PUT /handler`, huỷ đơn → vẫn 200, và kiểm e2e đủ các ca `trip.mjs`, `booker.mjs`, `dispatch.mjs`, `orders.mjs`.
7. `UPDATE orders SET subtotal = subtotal WHERE status = 'confirmed'` (giá trị không đổi) → đi qua.
8. Quan sát trigger chặn thật một lần (P16): tạm bỏ `WHEN` → test đỏ → hoàn nguyên.
9. `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --strict` xanh.

## 5. Giả định và giới hạn chấp nhận (chủ sửa nếu sai)

1. Hôm nay **không có** nhu cầu ghi thêm tiền cọc sau khi đã xác nhận đơn trong ứng dụng. Mã hiện tại vốn không cho, nên trigger không lấy mất gì (xem câu hỏi 2).
2. Trigger chặn tai nạn, **không chặn người cố ý có quyền quản trị D1** (người đó gỡ được trigger). Giống 0017.
3. Bước A có thể phát hiện lệch ở đơn cũ. Việc sửa dữ liệu thật (nếu có) là quyết định riêng của chủ, không nằm trong việc này.

## 6. Câu hỏi cho chủ dự án

1. **Sau này (N3), khi kế toán cần sửa tiền của đơn đã xác nhận thì làm thế nào?** Đây là quyết định kiến trúc, cần ghi thành ADR lúc làm N3; hỏi bây giờ để khỏi phải gỡ khoá sau này.
   (a) **Không sửa đè; ghi một dòng "điều chỉnh" riêng**, kèm lý do, người làm, số trước và sau. Tổng đúng của đơn = tổng gốc + các điều chỉnh. **Khuyến nghị**: giữ được lịch sử, đúng cách ngành kế toán làm, và khoá này giữ nguyên mãi.
   (b) Cho sửa đè, kèm nhật ký trước và sau: đơn giản hơn, nhưng N3 phải gỡ hoặc nới khoá này.

   **Cập nhật 2026-09-22 (nhánh `kiem-toan-doi-tac`, vai soạn):** câu hỏi này đã có quyết định — `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` điều 6, chọn **phương án (a)**, **đã accepted** (chủ dự án duyệt 2026-09-22), do nhu cầu cụ thể xuất hiện sớm hơn dự tính: hướng dẫn viên nội bộ cần sửa số khách/dịch vụ/tiền của đơn do cộng tác viên lập, sau khi đã xác nhận, và huỷ đơn kèm lý do (ADR-0014 điều 11) — khoá ở tài liệu này (bước B, trigger `order_item_frozen_*`/`orders_money_frozen`) **giữ nguyên as-is**, không đổi thiết kế: huỷ đơn không chạm cột tiền, khớp đúng nguyên tắc của ADR-0014 điều 11.
2. **Hiện có lúc nào nhân viên cần sửa tiền cọc sau khi đã xác nhận đơn không?** Ví dụ khách chuyển khoản cọc sau. Nếu **có**, hôm nay họ làm bằng cách nào (huỷ rồi lập lại, hay ghi ngoài hệ thống)? Câu trả lời không đổi việc này (mã hiện tại vốn không cho sửa), nhưng quyết định N3 cần làm gấp đến đâu.
3. **Đồng ý bạn tự chạy lệnh kiểm chỉ-đọc ở bước A trên production không?** Hướng dẫn từng bước sẽ có trong kế hoạch thi công.

## 7. Ngoài phạm vi

Sổ thu tiền và điều chỉnh tiền (N3); gỡ ba cột cọc (ADR-0004); sửa dữ liệu cũ nếu bước A phát hiện lệch.
