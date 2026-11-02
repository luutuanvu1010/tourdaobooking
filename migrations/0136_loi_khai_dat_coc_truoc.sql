-- ADR-0159 (chủ duyệt 2026-11-02): «Khách đặt cọc trước» trên đơn của đối tác. Chỉ THÊM một cột và ba trigger; không đụng ba cột cọc cũ (ADR-0026 đ9).
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
