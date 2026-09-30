-- Migration 0044 — MỐC "ĐÃ GIAO – ĐÃ THU ĐỦ" và "HOÀN THÀNH" trên đơn + KHOÁ ĐƠN sau "Đã giao" (sổ tiền lượt 1: ADR-0024 điều 3, ADR-0025 điều 5;
-- kế hoạch docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md §3.1, Task 2). Chỉ THÊM: bốn cột trên `orders` (không đụng CHECK status của 0003,
-- không dựng lại bảng — ADR-0003 điều 10), một view công bố, trigger. Dữ liệu cũ không đổi (bốn cột mới NULL).
-- Trạng thái HIỂN THỊ suy ra, không lưu: confirmed + delivered_at ⇒ "Đã giao – đã thu đủ"; + completed_at ⇒ "Hoàn thành" (ADR-0024 điều 3).
-- Mọi câu báo lỗi có tiền tố mã (`order_delivered:` / `order_completed:`) — route dịch ra tiếng Việt, không lộ mã thô (ADR-0025 điều 5).
-- Luật thân trigger (ADR-0024 điều 5): trigger của `orders` chỉ đọc bảng của `orders`; trigger của `dispatch` (cuối tệp) chỉ đọc view công bố của `orders`.

ALTER TABLE orders ADD COLUMN delivered_at TEXT;  -- lúc bấm "Đã giao – đã thu đủ" (UTC ISO); từ mốc này đơn bị khoá
ALTER TABLE orders ADD COLUMN delivered_by TEXT;  -- người bấm (cột WHO: TEXT, không khoá ngoại — ADR-0003 điều 6)
ALTER TABLE orders ADD COLUMN completed_at TEXT;  -- lúc Kế toán/Toàn quyền bấm "Hoàn thành"
ALTER TABLE orders ADD COLUMN completed_by TEXT;

-- View công bố (ADR-0024 điều 3): chỉ khoá + cờ trạng thái tối thiểu. `billing`, `dispatch` đọc trạng thái đơn qua view này.
CREATE VIEW v_ord_order_state AS SELECT id, status, delivered_at, completed_at FROM orders;

-- Đơn mới không bao giờ mang sẵn mốc (mốc chỉ đặt bằng hai bước của billing).
CREATE TRIGGER orders_milestone_insert BEFORE INSERT ON orders
WHEN NEW.delivered_at IS NOT NULL OR NEW.delivered_by IS NOT NULL OR NEW.completed_at IS NOT NULL OR NEW.completed_by IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn mới không được mang sẵn mốc Đã giao / Hoàn thành'); END;

-- "Đã giao" chỉ đặt MỘT lần, từ đơn ĐÃ XÁC NHẬN (không nhảy cóc, không đặt lại, không xoá mốc); mốc và người bấm đi cùng nhau.
CREATE TRIGGER orders_delivered_from_confirmed BEFORE UPDATE OF delivered_at, delivered_by ON orders
WHEN (NEW.delivered_at IS NOT OLD.delivered_at OR NEW.delivered_by IS NOT OLD.delivered_by)
  AND NOT (OLD.delivered_at IS NULL AND OLD.delivered_by IS NULL AND OLD.status = 'confirmed' AND NEW.status = 'confirmed'
           AND NEW.delivered_at IS NOT NULL AND NEW.delivered_by IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'order_delivered: mốc Đã giao chỉ đặt một lần, từ đơn đã xác nhận'); END;

-- "Hoàn thành" chỉ đặt MỘT lần, sau "Đã giao".
CREATE TRIGGER orders_completed_after_delivered BEFORE UPDATE OF completed_at, completed_by ON orders
WHEN (NEW.completed_at IS NOT OLD.completed_at OR NEW.completed_by IS NOT OLD.completed_by)
  AND NOT (OLD.completed_at IS NULL AND OLD.completed_by IS NULL AND OLD.delivered_at IS NOT NULL
           AND NEW.completed_at IS NOT NULL AND NEW.completed_by IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'order_completed: mốc Hoàn thành chỉ đặt một lần, sau Đã giao'); END;

-- KHOÁ: đơn đã "Đã giao" — mọi UPDATE bị chặn TRỪ đúng câu "Hoàn thành" (đặt completed_at/completed_by/updated_at từ NULL, MỌI cột khác giữ nguyên).
-- Liệt kê MỌI cột của `orders`: thêm cột sau này mà quên thêm vào đây thì bài src/migrations-orders-da-giao.test.ts (NT-R6) đỏ (thử đổi từng cột trong câu
-- Hoàn thành). Không huỷ được (status không đổi), không sửa tiền/khách/người đặt.
CREATE TRIGGER orders_delivered_lock BEFORE UPDATE ON orders
WHEN OLD.delivered_at IS NOT NULL
  AND NOT (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL
    AND NEW.id IS OLD.id AND NEW.order_code IS OLD.order_code AND NEW.staff_id IS OLD.staff_id AND NEW.status IS OLD.status
    AND NEW.customer_name IS OLD.customer_name AND NEW.customer_phone IS OLD.customer_phone AND NEW.customer_email IS OLD.customer_email
    AND NEW.customer_note IS OLD.customer_note AND NEW.subtotal IS OLD.subtotal AND NEW.discount IS OLD.discount AND NEW.total IS OLD.total
    AND NEW.deposit_amount IS OLD.deposit_amount AND NEW.deposit_method IS OLD.deposit_method AND NEW.remaining_amount IS OLD.remaining_amount
    AND NEW.payment_note IS OLD.payment_note AND NEW.created_at IS OLD.created_at AND NEW.confirmed_at IS OLD.confirmed_at
    AND NEW.booker_party_id IS OLD.booker_party_id AND NEW.delivered_at IS OLD.delivered_at AND NEW.delivered_by IS OLD.delivered_by)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – đã thu đủ, không sửa được'); END;

-- Dịch vụ, dòng tiền, dòng điều chỉnh, chặng đưa đón, hành khách của đơn đã "Đã giao": chặn thêm/sửa/xoá — kể cả trường vận hành (khác 0008 chỉ khoá
-- thành phần). Q1 (chủ trả lời 2026-09-30 "Khoá cả hai"): chặng + hành khách khoá như dịch vụ; không cần ngoại lệ "đóng chặng" (van-chuyen không ghi bảng
-- ord_*, đóng chặng chỉ qua route của orders — đã rà 30/9, sổ thi công Task 0).
CREATE TRIGGER order_service_delivered_lock_ins BEFORE INSERT ON order_service
WHEN (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không thêm dịch vụ'); END;
CREATE TRIGGER order_service_delivered_lock_upd BEFORE UPDATE ON order_service
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL OR (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không sửa dịch vụ'); END;
CREATE TRIGGER order_service_delivered_lock_del BEFORE DELETE ON order_service
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không xoá dịch vụ'); END;

CREATE TRIGGER order_item_delivered_lock_ins BEFORE INSERT ON order_item
WHEN (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không thêm dòng tiền'); END;
CREATE TRIGGER order_item_delivered_lock_upd BEFORE UPDATE ON order_item
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL OR (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không sửa dòng tiền'); END;
CREATE TRIGGER order_item_delivered_lock_del BEFORE DELETE ON order_item
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không xoá dòng tiền'); END;

-- 0021 đã chặn sửa/xoá dòng điều chỉnh; thêm: chặn CHÈN sau "Đã giao" (ADR-0025 điều 5).
CREATE TRIGGER order_money_adjustment_delivered_lock_ins BEFORE INSERT ON order_money_adjustment
WHEN (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không điều chỉnh số khách/tiền'); END;

CREATE TRIGGER ord_transfer_leg_delivered_lock_ins BEFORE INSERT ON ord_transfer_leg
WHEN (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không thêm chặng đưa đón'); END;
CREATE TRIGGER ord_transfer_leg_delivered_lock_upd BEFORE UPDATE ON ord_transfer_leg
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL OR (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không sửa chặng đưa đón'); END;
CREATE TRIGGER ord_transfer_leg_delivered_lock_del BEFORE DELETE ON ord_transfer_leg
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không xoá chặng đưa đón'); END;

CREATE TRIGGER ord_passenger_delivered_lock_ins BEFORE INSERT ON ord_passenger
WHEN (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không thêm hành khách'); END;
CREATE TRIGGER ord_passenger_delivered_lock_upd BEFORE UPDATE ON ord_passenger
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL OR (SELECT delivered_at FROM orders WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không sửa hành khách'); END;
CREATE TRIGGER ord_passenger_delivered_lock_del BEFORE DELETE ON ord_passenger
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không xoá hành khách'); END;

-- Module DISPATCH (ADR-0025 điều 5, ADR-0024 điều 5 — đặt trong migration này vì đi cùng bản phát hành): đơn đã "Đã giao" không chèn dòng phân công mới
-- (mọi loại việc — chữ ADR "chặn chèn dòng mới") và không đổi / đóng dòng người phụ trách (`HANDLE`). Đọc view công bố v_ord_order_state (cạnh dispatch →
-- orders đã có). Không luồng nào tự đóng phân công hôm nay (rà 30/9 — R4).
CREATE TRIGGER dsp_assignment_delivered_lock_ins BEFORE INSERT ON dsp_assignment
WHEN (SELECT delivered_at FROM v_ord_order_state WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không đổi / nhận người phụ trách'); END;
CREATE TRIGGER dsp_assignment_delivered_lock_upd BEFORE UPDATE ON dsp_assignment
WHEN OLD.task_kind_code = 'HANDLE' AND (SELECT delivered_at FROM v_ord_order_state WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không đổi / nhận người phụ trách'); END;
