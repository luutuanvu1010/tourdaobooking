-- Migration 0189 — CHỤP GIÁ MÙA VỤ VÀO DÒNG ĐƠN (ADR-0229 Đ5, Đ10; chủ duyệt 2026-11-22). Module `orders`. Chỉ THÊM ba cột NULL được vào `order_item` + một trigger.
--   base_price        — giá sau ghi đè Quản trị, TRƯỚC mùa vụ (mỗi đơn vị).
--   seasonal_rule_id  — quy tắc `ctl_seasonal_price` đã áp (NULL = không quy tắc). Không khoá ngoại: bảng của module khác; giữ mã để đối chiếu.
--   seasonal_increase — số tăng MỖI ĐƠN VỊ = catalog_price − base_price (≥ 0). Phần tăng của dòng = số này × số lượng HIỆN HÀNH (tính ở mã, không lưu).
-- `catalog_price` từ nay là giá ĐÃ cộng mùa vụ. Dòng cũ và dòng nhập tay: ba cột NULL = «trước giá mùa vụ» (Đ10: số tăng trống tính 0).
-- Trigger 0081 (`order_item_frozen_update`) liệt kê cột tiền cũ theo TÊN, không tự phủ cột mới ⇒ thêm trigger khoá ba cột khi đơn không còn nháp. Chèn dòng vào đơn
-- không còn nháp đã bị `order_item_frozen_insert` (0081) chặn.
-- HOÀN TÁC: D1 không có bước "down". Cột NULL không đổi hành vi mã cũ.

ALTER TABLE order_item ADD COLUMN base_price INTEGER CHECK (base_price IS NULL OR (typeof(base_price) = 'integer' AND base_price >= 0));
ALTER TABLE order_item ADD COLUMN seasonal_rule_id TEXT;
ALTER TABLE order_item ADD COLUMN seasonal_increase INTEGER CHECK (seasonal_increase IS NULL OR (typeof(seasonal_increase) = 'integer' AND seasonal_increase >= 0));

CREATE TRIGGER order_item_seasonal_frozen BEFORE UPDATE OF base_price, seasonal_rule_id, seasonal_increase ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.base_price IS NOT OLD.base_price OR NEW.seasonal_rule_id IS NOT OLD.seasonal_rule_id OR NEW.seasonal_increase IS NOT OLD.seasonal_increase)
BEGIN SELECT RAISE(ABORT, 'order_money_frozen: đơn đã xác nhận / đã huỷ — bản chụp giá mùa vụ không đổi được'); END;
