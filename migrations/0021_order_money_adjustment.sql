-- Dòng điều chỉnh số khách/tiền của đơn ĐÃ XÁC NHẬN, do người phụ trách cấp hẹp (FIELD) ghi qua route hẹp riêng (ADR-0014 điều 6).
-- KHÔNG sửa đè order_service/order_item/cột tiền của orders — bảng này CHỈ-THÊM, đứng CẠNH dữ liệu gốc.
-- Nối với audit_log qua id CHUNG (ADR-0007 điều 2: "audit_log giữ mục lục, bản ghi trước→sau giữ nội dung, hai bảng nối bằng audit_log.id,
-- không lặp nội dung") — vì vậy KHÔNG có cột staff_id/created_at/reason ở đây, lấy từ audit_log qua đúng id.
CREATE TABLE order_money_adjustment (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,
  before_json     TEXT NOT NULL,
  after_json      TEXT NOT NULL,
  subtotal_before INTEGER NOT NULL,
  subtotal_after  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_order_money_adjustment_seq ON order_money_adjustment(order_id, seq);

-- Chỉ-thêm: không sửa/xoá dòng điều chỉnh, kể cả bằng SQL chạy tay (lưới thứ hai, giống order_service_frozen_* của 0008).
CREATE TRIGGER order_money_adjustment_frozen_update BEFORE UPDATE ON order_money_adjustment
BEGIN SELECT RAISE(ABORT, 'append_only: dòng điều chỉnh không sửa được'); END;
CREATE TRIGGER order_money_adjustment_frozen_delete BEFORE DELETE ON order_money_adjustment
BEGIN SELECT RAISE(ABORT, 'append_only: dòng điều chỉnh không xoá được'); END;
