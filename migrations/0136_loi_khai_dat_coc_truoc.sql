-- ADR-0159 (chủ duyệt 2026-11-02): «Khách đặt cọc trước» trên đơn của đối tác. Chỉ THÊM một cột, ba trigger, và tạo lại trigger khoá Đã giao để phủ cột mới; không đụng ba cột cọc cũ (ADR-0026 đ9).
-- `declared_deposit` là LỜI KHAI của người lập khi đơn còn nháp: không vào sổ, không phải khoản thu. Khi đơn được xác nhận, CÙNG lô sinh khoản thu trả trước (billing);
-- sau xác nhận mọi nơi đọc từ sổ, không đọc cột này. Trần bằng trần số tiền của billing (10 tỷ đồng).
ALTER TABLE orders ADD COLUMN declared_deposit INTEGER NOT NULL DEFAULT 0 CHECK (declared_deposit >= 0 AND declared_deposit <= 10000000000);

-- Lớp CSDL của luật «lời khai không vượt tổng sau giảm» (ADR-0159 Đ1 mục 4): phủ mọi đường ghi vào đơn nháp — lưu, hạ tổng, và câu xác nhận (OLD còn 'draft').
-- Đơn đã xác nhận không xét: sửa số khách sau xác nhận làm tổng thấp hơn tiền đã thu là ca «khách trả dư» của sổ (ADR-0159 Hệ quả), cột lúc đó đã khoá.
CREATE TRIGGER orders_declared_deposit_within_total BEFORE UPDATE OF total, declared_deposit, status ON orders
WHEN OLD.status = 'draft' AND NEW.declared_deposit > NEW.total
BEGIN SELECT RAISE(ABORT, 'declared_deposit_exceeds_total: lời khai đặt cọc lớn hơn tổng đơn'); END;
CREATE TRIGGER orders_declared_deposit_within_total_insert BEFORE INSERT ON orders
WHEN NEW.declared_deposit > NEW.total
BEGIN SELECT RAISE(ABORT, 'declared_deposit_exceeds_total: lời khai đặt cọc lớn hơn tổng đơn'); END;

-- Khoá cột (ADR-0159 Đ1 mục 2): không đổi được khi đơn đã rời nháp hoặc đang chờ xác nhận.
CREATE TRIGGER orders_declared_deposit_locked BEFORE UPDATE OF declared_deposit ON orders
WHEN NEW.declared_deposit <> OLD.declared_deposit
  AND (OLD.status <> 'draft' OR EXISTS (SELECT 1 FROM ord_confirm_request y WHERE y.order_id = OLD.id AND y.decided_at IS NULL))
BEGIN SELECT RAISE(ABORT, 'declared_deposit_locked: lời khai đặt cọc đã khoá'); END;

-- Trigger khoá Đã giao phải liệt kê MỌI cột của orders (bài NT-R6, src/migrations-orders-da-giao.test.ts). Thân y hệt 0133, thêm đúng một cột declared_deposit.
DROP TRIGGER orders_delivered_lock;
CREATE TRIGGER orders_delivered_lock BEFORE UPDATE ON orders
WHEN OLD.delivered_at IS NOT NULL
  AND NOT (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL
    AND NEW.id IS OLD.id AND NEW.order_code IS OLD.order_code AND NEW.staff_id IS OLD.staff_id AND NEW.status IS OLD.status
    AND NEW.customer_name IS OLD.customer_name AND NEW.customer_phone IS OLD.customer_phone AND NEW.customer_email IS OLD.customer_email
    AND NEW.customer_note IS OLD.customer_note AND NEW.subtotal IS OLD.subtotal AND NEW.discount IS OLD.discount AND NEW.total IS OLD.total
    AND NEW.deposit_amount IS OLD.deposit_amount AND NEW.deposit_method IS OLD.deposit_method AND NEW.remaining_amount IS OLD.remaining_amount
    AND NEW.payment_note IS OLD.payment_note AND NEW.created_at IS OLD.created_at AND NEW.confirmed_at IS OLD.confirmed_at
    AND NEW.booker_party_id IS OLD.booker_party_id AND NEW.delivered_at IS OLD.delivered_at AND NEW.delivered_by IS OLD.delivered_by
    AND NEW.manifest_exempt IS OLD.manifest_exempt AND NEW.declared_deposit IS OLD.declared_deposit)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – đã thu đủ, không sửa được'); END;
