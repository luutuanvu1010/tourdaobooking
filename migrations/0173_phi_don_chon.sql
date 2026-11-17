-- Migration 0173 — PHÍ ĐƯA ĐÓN DO VĂN PHÒNG CHỌN (ADR-0214, Task 1; đặc tả docs/superpowers/specs/2026-11-16-phi-don-nhan-vien-chon.md). Module orders.
-- Hai cột mới của `order_item` nói mức phí do đâu mà có: `fee_source` ('BANG_PHI' = bảng phí của Đợt C, 'CHON' = văn phòng chọn) và `fee_choice` ('DANH_SACH' = một mức trong danh sách, 'SO_KHAC' = số gõ tay).
-- Dòng cũ có `fee_source` trống: coi như BANG_PHI (luật 0169 giữ nguyên). Không đổi dữ liệu cũ. Số 0173: main đang ở 0172 (kiểm nhánh chưa gộp 16/11).
-- Tạo lại ba trigger của 0169 (DROP rồi CREATE; tệp 0169 không sửa): hai trigger hình dạng dòng và trigger khoá cột chụp. Chỉ SIẾT thêm; trigger 0081 không đổi.
-- DANH SÁCH MỨC (0, 5.000, 10.000, 15.000, 20.000, 30.000, 50.000, 100.000 đ) và TRẦN «số khác» 5.000.000 đ nằm ở `src/shared/phi-don-chon.ts` (DANH_SACH_PHI_DON, TRAN_PHI_DON) VÀ ở trigger dưới đây (lưới thứ hai):
-- đổi một giá trị thì phải có migration mới tạo lại trigger (chấp nhận được: danh sách đổi hiếm, chủ duyệt qua ADR); bài src/migrations-phi-don-chon.test.ts so hai nơi với nhau.
-- Dòng phí không mang dữ liệu cá nhân: chỉ mã, số.

ALTER TABLE order_item ADD COLUMN fee_source TEXT CHECK (fee_source IN ('BANG_PHI', 'CHON'));
ALTER TABLE order_item ADD COLUMN fee_choice TEXT CHECK (fee_choice IN ('DANH_SACH', 'SO_KHAC'));

DROP TRIGGER order_item_line_kind_insert;
DROP TRIGGER order_item_line_kind_update;
DROP TRIGGER order_item_fee_frozen_update;

-- Dòng phí (TRANSFER_FEE), mọi nguồn: không dính dịch vụ / danh mục / loại khách; phải có chặng và kiểu.
--  · CHON: phải có fee_choice; mã mức, vùng, cấp đều trống (không tra bảng phí); DANH_SACH ⇒ đơn giá thuộc danh sách; SO_KHAC ⇒ đơn giá 1–5.000.000; fee_source trống thì KHÔNG được mang fee_choice.
--  · BANG_PHI hoặc trống (dòng cũ): luật 0169 (mã mức, kiểu, vùng bắt buộc) và không có fee_choice.
-- Dòng dịch vụ (SERVICE): mọi cột phí, kể cả fee_source và fee_choice, đều trống.
CREATE TRIGGER order_item_line_kind_insert BEFORE INSERT ON order_item
WHEN (NEW.line_kind = 'TRANSFER_FEE' AND (NEW.service_id IS NOT NULL OR NEW.catalog_code IS NOT NULL OR NEW.catalog_price IS NOT NULL OR NEW.pax_code IS NOT NULL
        OR NEW.transfer_leg_id IS NULL OR NEW.fee_kind IS NULL
        OR (NEW.fee_source IS 'CHON' AND (NEW.fee_choice IS NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL
              OR (NEW.fee_choice = 'DANH_SACH' AND NEW.unit_price NOT IN (0, 5000, 10000, 15000, 20000, 30000, 50000, 100000))
              OR (NEW.fee_choice = 'SO_KHAC' AND (NEW.unit_price < 1 OR NEW.unit_price > 5000000))))
        OR (NEW.fee_source IS NOT 'CHON' AND (NEW.fee_choice IS NOT NULL OR NEW.fee_rule_id IS NULL OR NEW.fee_zone_code IS NULL))))
  OR (NEW.line_kind = 'SERVICE' AND (NEW.transfer_leg_id IS NOT NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_kind IS NOT NULL
        OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL OR NEW.fee_return_pax IS NOT NULL
        OR NEW.fee_source IS NOT NULL OR NEW.fee_choice IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'order_item_line_kind: dòng phí đưa đón và dòng dịch vụ không lẫn cột của nhau'); END;
CREATE TRIGGER order_item_line_kind_update BEFORE UPDATE ON order_item
WHEN (NEW.line_kind = 'TRANSFER_FEE' AND (NEW.service_id IS NOT NULL OR NEW.catalog_code IS NOT NULL OR NEW.catalog_price IS NOT NULL OR NEW.pax_code IS NOT NULL
        OR NEW.transfer_leg_id IS NULL OR NEW.fee_kind IS NULL
        OR (NEW.fee_source IS 'CHON' AND (NEW.fee_choice IS NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL
              OR (NEW.fee_choice = 'DANH_SACH' AND NEW.unit_price NOT IN (0, 5000, 10000, 15000, 20000, 30000, 50000, 100000))
              OR (NEW.fee_choice = 'SO_KHAC' AND (NEW.unit_price < 1 OR NEW.unit_price > 5000000))))
        OR (NEW.fee_source IS NOT 'CHON' AND (NEW.fee_choice IS NOT NULL OR NEW.fee_rule_id IS NULL OR NEW.fee_zone_code IS NULL))))
  OR (NEW.line_kind = 'SERVICE' AND (NEW.transfer_leg_id IS NOT NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_kind IS NOT NULL
        OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL OR NEW.fee_return_pax IS NOT NULL
        OR NEW.fee_source IS NOT NULL OR NEW.fee_choice IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'order_item_line_kind: dòng phí đưa đón và dòng dịch vụ không lẫn cột của nhau'); END;

-- Đơn không còn nháp: bản chụp phí không đổi, nay gồm cả nguồn và kiểu chọn (dòng cũ fee_source trống ⇒ đổi sang giá trị khác cũng bị chặn).
CREATE TRIGGER order_item_fee_frozen_update BEFORE UPDATE ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.line_kind IS NOT OLD.line_kind OR NEW.transfer_leg_id IS NOT OLD.transfer_leg_id OR NEW.fee_rule_id IS NOT OLD.fee_rule_id
    OR NEW.fee_kind IS NOT OLD.fee_kind OR NEW.fee_zone_code IS NOT OLD.fee_zone_code OR NEW.fee_tier_code IS NOT OLD.fee_tier_code
    OR NEW.fee_return_pax IS NOT OLD.fee_return_pax OR NEW.fee_source IS NOT OLD.fee_source OR NEW.fee_choice IS NOT OLD.fee_choice)
BEGIN SELECT RAISE(ABORT, 'order_fee_frozen: đơn đã xác nhận / đã huỷ — bản chụp phí đưa đón không đổi được'); END;
