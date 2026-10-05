-- Migration 0081 — KHOÁ TIỀN ĐƠN ĐÃ XÁC NHẬN Ở CSDL (F-03 / GD-B-02; Hiến chương 5.1 "bất biến ở CSDL và ở mã", 5.4 "một luật một nơi"; kiểm toán 22/9 F-03:
-- "khoá tiền của đơn đã xác nhận chỉ nằm ở mã; CSDL chỉ khoá từ lúc Đã giao"). Module `orders`. Chỉ THÊM trigger — không đổi bảng, không đổi dữ liệu.
-- Mã đã chặn đủ (dòng tiền chỉ ghi khi lập / lưu NHÁP — `createOrder`, `updateDraftOrder`; sửa số khách sau xác nhận đi qua dòng điều chỉnh chỉ-thêm
-- `order_money_adjustment`, không sửa đè). Đây là lưới thứ hai cho SQL chạy tay và mã viết sau. Thân trigger chỉ đọc bảng của orders (ADR-0024 điều 5).

-- (1) Đơn không còn nháp: không thêm / sửa / xoá DÒNG TIỀN (đơn giá, số lượng, thành tiền) — cùng khuôn order_service_frozen_* của 0008.
CREATE TRIGGER order_item_frozen_insert BEFORE INSERT ON order_item
WHEN (SELECT status FROM orders WHERE id = NEW.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_money_frozen: đơn đã xác nhận / đã huỷ — dòng tiền không đổi được'); END;
CREATE TRIGGER order_item_frozen_update BEFORE UPDATE ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.order_id IS NOT OLD.order_id OR NEW.service_id IS NOT OLD.service_id OR NEW.quantity IS NOT OLD.quantity OR NEW.unit_price IS NOT OLD.unit_price
    OR NEW.line_total IS NOT OLD.line_total OR NEW.catalog_price IS NOT OLD.catalog_price OR NEW.pax_code IS NOT OLD.pax_code)
BEGIN SELECT RAISE(ABORT, 'order_money_frozen: đơn đã xác nhận / đã huỷ — dòng tiền không đổi được'); END;
CREATE TRIGGER order_item_frozen_delete BEFORE DELETE ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_money_frozen: đơn đã xác nhận / đã huỷ — dòng tiền không đổi được'); END;

-- (2) Đơn không còn nháp: tạm tính / giảm giá / tổng không đổi (số khách hiện hành đi qua dòng điều chỉnh, không sửa cột tiền).
CREATE TRIGGER orders_money_frozen BEFORE UPDATE OF subtotal, discount, total ON orders
WHEN OLD.status <> 'draft' AND (NEW.subtotal IS NOT OLD.subtotal OR NEW.discount IS NOT OLD.discount OR NEW.total IS NOT OLD.total)
BEGIN SELECT RAISE(ABORT, 'order_money_frozen: đơn đã xác nhận / đã huỷ — tạm tính, giảm giá, tổng không đổi được'); END;

-- (3) LÚC xác nhận: tạm tính đã lưu = Σ thành tiền các dòng (subtotal = Σ line_total — lưới của bất biến tiền; 0007 đã ép line_total = quantity × unit_price
-- và total = subtotal − discount). Chỉ ở bước chuyển trạng thái (không chặn cập nhật sau đó của đơn cũ).
CREATE TRIGGER orders_confirm_subtotal_matches BEFORE UPDATE OF status ON orders
WHEN NEW.status = 'confirmed' AND OLD.status <> 'confirmed'
  AND NEW.subtotal IS NOT (SELECT COALESCE(SUM(i.line_total), 0) FROM order_item i WHERE i.order_id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'order_subtotal_mismatch: tạm tính của đơn khác tổng thành tiền các dòng'); END;
-- Giới hạn có chủ ý: đơn CHÈN THẲNG ở trạng thái khác nháp (mã không làm — `createOrder` luôn chèn 'draft'; chỉ SQL tay) không qua (3). Không thêm trigger
-- chặn vì 25 bài thử hiện có dựng đơn như vậy; lưới là R-ORD-15 (xét mọi đơn hết nháp, mốc theo COALESCE(confirmed_at, created_at)).
