-- Rà soát kiến trúc 2026-09-19 (docs/AUDIT-FINDINGS.md A1, A3, A4). Gộp các thay đổi schema một chiều vào một migration.

-- 1) audit_log: bỏ CHECK liệt kê `action` và `target_type`. Danh sách hợp lệ nay có MỘT nguồn ở code
--    (src/shared/audit-actions.ts) nên thêm hành động/đối tượng mới không còn phải dựng lại bảng. Đây là lần dựng lại cuối.
--    Bảng không bị bảng nào tham chiếu nên dựng lại an toàn (như 0005, 0006).
CREATE TABLE audit_log_new (
  id          TEXT PRIMARY KEY,
  order_id    TEXT REFERENCES orders(id),                 -- NULL khi hành động không thuộc một đơn
  staff_id    TEXT REFERENCES staff(id),                  -- NULL = hệ thống tự động
  action      TEXT NOT NULL,                              -- kiểm ở code: isAuditAction()
  target_type TEXT,                                       -- 'order' | 'staff' | 'catalog' | … (kiểm ở code)
  target_id   TEXT,
  detail      TEXT,                                       -- TUYỆT ĐỐI không chứa PIN/bí mật
  created_at  TEXT NOT NULL
);
INSERT INTO audit_log_new (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
  SELECT id, order_id, staff_id, action, target_type, target_id, detail, created_at FROM audit_log;
DROP TABLE audit_log;
ALTER TABLE audit_log_new RENAME TO audit_log;
CREATE INDEX idx_audit_order ON audit_log(order_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- 2) order_item: dịch vụ nguồn trong danh mục (mã tour). NULL = dòng nhập tay. Cố ý KHÔNG có FK:
--    nhập tay luôn phải chạy được, danh mục chỉ là cách điền nhanh (spec §2.5); giá trên dòng vẫn là giá đã chốt lúc lập đơn.
ALTER TABLE order_item ADD COLUMN catalog_code TEXT;

-- 3) Bất biến tiền §2.3 giữ cả trong SQL (lưới cuối nếu một đường code sau này quên orders/rules.ts).
--    Dùng TRIGGER thay vì CHECK để không phải dựng lại `orders`/`order_item` (bị order_item + audit_log tham chiếu).
--    `subtotal = tổng line_total` không kiểm ở đây: dòng được chèn SAU đơn trong cùng batch.
CREATE TRIGGER order_item_money_insert BEFORE INSERT ON order_item
WHEN NEW.line_total IS NOT NEW.quantity * NEW.unit_price
BEGIN SELECT RAISE(ABORT, 'money_invariant: line_total = quantity * unit_price'); END;

CREATE TRIGGER order_item_money_update BEFORE UPDATE ON order_item
WHEN NEW.line_total IS NOT NEW.quantity * NEW.unit_price
BEGIN SELECT RAISE(ABORT, 'money_invariant: line_total = quantity * unit_price'); END;

CREATE TRIGGER orders_money_insert BEFORE INSERT ON orders
WHEN NEW.subtotal < 0 OR NEW.discount < 0 OR NEW.deposit_amount < 0
  OR NEW.total IS NOT NEW.subtotal - NEW.discount
  OR NEW.remaining_amount IS NOT NEW.total - NEW.deposit_amount
  OR NEW.remaining_amount < 0
  OR (NEW.deposit_amount > 0 AND NEW.deposit_method IS NULL)
BEGIN SELECT RAISE(ABORT, 'money_invariant: total/remaining_amount/deposit'); END;

CREATE TRIGGER orders_money_update BEFORE UPDATE ON orders
WHEN NEW.subtotal < 0 OR NEW.discount < 0 OR NEW.deposit_amount < 0
  OR NEW.total IS NOT NEW.subtotal - NEW.discount
  OR NEW.remaining_amount IS NOT NEW.total - NEW.deposit_amount
  OR NEW.remaining_amount < 0
  OR (NEW.deposit_amount > 0 AND NEW.deposit_method IS NULL)
BEGIN SELECT RAISE(ABORT, 'money_invariant: total/remaining_amount/deposit'); END;
