-- Migration 0179 — DÒNG PHÍ ĐƯA ĐÓN NGUỒN MỚI «MÁY TÍNH» (ADR-0218, Đợt 2 Task 6). Module orders.
-- Dòng phí do máy tính mang `fee_calc_source` ('DOI_TAY' = văn phòng đổi số có lý do, 'CHUONG_TRINH' = chương trình miễn phí, 'GIA_GOC' = giá gốc Sheet trừ mức giảm theo cấp)
-- cùng các cột chụp lúc xác nhận: giá gốc đã dùng, mức giảm đã dùng, mã + tên chương trình, lý do và người đổi. Mã cấp dùng lại `fee_tier_code`, kiểu dùng lại `fee_kind`, số người chiều về dùng lại `fee_return_pax`.
-- Không dựng lại `order_item`. Dòng mới để `fee_source`, `fee_choice`, `fee_rule_id`, `fee_zone_code` TRỐNG. Dòng cũ (BANG_PHI / CHON) không đổi và vẫn qua trigger y như trước (số 0179: 0178 lớn nhất trên mọi nhánh, kiểm 18/11).
-- Tạo lại ba trigger của 0173 (DROP rồi CREATE; tệp 0173 không sửa): nhánh thứ ba cho nguồn mới; khoá cột chụp thêm bảy cột mới. Trần đổi tay 5.000.000 đ nằm ở đây (lưới thứ hai) và ở `TRAN_MUC_PHI_DON` (src/shared/phi-don-gia-goc.ts).
-- Dòng phí không mang dữ liệu cá nhân: chỉ mã, số, lý do đổi (văn phòng nhập, không bắt tên khách).

ALTER TABLE order_item ADD COLUMN fee_calc_source TEXT CHECK (fee_calc_source IN ('DOI_TAY', 'CHUONG_TRINH', 'GIA_GOC'));
ALTER TABLE order_item ADD COLUMN fee_base_price INTEGER CHECK (fee_base_price IS NULL OR fee_base_price >= 0);
ALTER TABLE order_item ADD COLUMN fee_tier_discount INTEGER CHECK (fee_tier_discount IS NULL OR fee_tier_discount >= 0);
ALTER TABLE order_item ADD COLUMN fee_program_id TEXT;
ALTER TABLE order_item ADD COLUMN fee_program_name TEXT;
ALTER TABLE order_item ADD COLUMN fee_override_reason TEXT;
ALTER TABLE order_item ADD COLUMN fee_override_by TEXT;

DROP TRIGGER order_item_line_kind_insert;
DROP TRIGGER order_item_line_kind_update;
DROP TRIGGER order_item_fee_frozen_update;

-- Hình dạng dòng. Dòng phí (TRANSFER_FEE): không dính dịch vụ / danh mục / loại khách; có chặng và kiểu. Rồi MỘT trong hai nhánh:
--  · `fee_calc_source` có (nguồn mới): fee_source, fee_choice, fee_rule_id, fee_zone_code trống; DOI_TAY ⇒ lý do không rỗng ≤ 300 ký tự, có người đổi, đơn giá 0–5.000.000;
--    CHUONG_TRINH ⇒ có mã chương trình, đơn giá 0; GIA_GOC ⇒ có giá gốc, đơn giá = max(0, giá gốc − mức giảm) khi PER_PAX, = giá gốc khi PER_TRIP.
--  · `fee_calc_source` trống (dòng cũ): luật 0173 giữ nguyên, và mọi cột chụp mới phải trống.
-- Dòng dịch vụ (SERVICE): mọi cột phí, kể cả cột mới, đều trống.
CREATE TRIGGER order_item_line_kind_insert BEFORE INSERT ON order_item
WHEN (NEW.line_kind = 'TRANSFER_FEE' AND (NEW.service_id IS NOT NULL OR NEW.catalog_code IS NOT NULL OR NEW.catalog_price IS NOT NULL OR NEW.pax_code IS NOT NULL
        OR NEW.transfer_leg_id IS NULL OR NEW.fee_kind IS NULL
        OR (NEW.fee_calc_source IS NOT NULL AND (NEW.fee_source IS NOT NULL OR NEW.fee_choice IS NOT NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_zone_code IS NOT NULL
              OR (NEW.fee_calc_source = 'DOI_TAY' AND (NEW.fee_override_reason IS NULL OR length(trim(NEW.fee_override_reason)) = 0 OR length(NEW.fee_override_reason) > 300
                    OR NEW.fee_override_by IS NULL OR NEW.unit_price < 0 OR NEW.unit_price > 5000000))
              OR (NEW.fee_calc_source = 'CHUONG_TRINH' AND (NEW.fee_program_id IS NULL OR NEW.unit_price <> 0))
              OR (NEW.fee_calc_source = 'GIA_GOC' AND (NEW.fee_base_price IS NULL
                    OR (NEW.fee_kind = 'PER_PAX' AND NEW.unit_price <> max(0, NEW.fee_base_price - coalesce(NEW.fee_tier_discount, 0)))
                    OR (NEW.fee_kind = 'PER_TRIP' AND NEW.unit_price <> NEW.fee_base_price)))))
        OR (NEW.fee_calc_source IS NULL AND (NEW.fee_base_price IS NOT NULL OR NEW.fee_tier_discount IS NOT NULL OR NEW.fee_program_id IS NOT NULL OR NEW.fee_program_name IS NOT NULL
              OR NEW.fee_override_reason IS NOT NULL OR NEW.fee_override_by IS NOT NULL
              OR (NEW.fee_source IS 'CHON' AND (NEW.fee_choice IS NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL
                    OR (NEW.fee_choice = 'DANH_SACH' AND NEW.unit_price NOT IN (0, 5000, 10000, 15000, 20000, 30000, 50000, 100000))
                    OR (NEW.fee_choice = 'SO_KHAC' AND (NEW.unit_price < 1 OR NEW.unit_price > 5000000))))
              OR (NEW.fee_source IS NOT 'CHON' AND (NEW.fee_choice IS NOT NULL OR NEW.fee_rule_id IS NULL OR NEW.fee_zone_code IS NULL))))))
  OR (NEW.line_kind = 'SERVICE' AND (NEW.transfer_leg_id IS NOT NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_kind IS NOT NULL
        OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL OR NEW.fee_return_pax IS NOT NULL
        OR NEW.fee_source IS NOT NULL OR NEW.fee_choice IS NOT NULL
        OR NEW.fee_calc_source IS NOT NULL OR NEW.fee_base_price IS NOT NULL OR NEW.fee_tier_discount IS NOT NULL OR NEW.fee_program_id IS NOT NULL
        OR NEW.fee_program_name IS NOT NULL OR NEW.fee_override_reason IS NOT NULL OR NEW.fee_override_by IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'order_item_line_kind: dòng phí đưa đón và dòng dịch vụ không lẫn cột của nhau'); END;
CREATE TRIGGER order_item_line_kind_update BEFORE UPDATE ON order_item
WHEN (NEW.line_kind = 'TRANSFER_FEE' AND (NEW.service_id IS NOT NULL OR NEW.catalog_code IS NOT NULL OR NEW.catalog_price IS NOT NULL OR NEW.pax_code IS NOT NULL
        OR NEW.transfer_leg_id IS NULL OR NEW.fee_kind IS NULL
        OR (NEW.fee_calc_source IS NOT NULL AND (NEW.fee_source IS NOT NULL OR NEW.fee_choice IS NOT NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_zone_code IS NOT NULL
              OR (NEW.fee_calc_source = 'DOI_TAY' AND (NEW.fee_override_reason IS NULL OR length(trim(NEW.fee_override_reason)) = 0 OR length(NEW.fee_override_reason) > 300
                    OR NEW.fee_override_by IS NULL OR NEW.unit_price < 0 OR NEW.unit_price > 5000000))
              OR (NEW.fee_calc_source = 'CHUONG_TRINH' AND (NEW.fee_program_id IS NULL OR NEW.unit_price <> 0))
              OR (NEW.fee_calc_source = 'GIA_GOC' AND (NEW.fee_base_price IS NULL
                    OR (NEW.fee_kind = 'PER_PAX' AND NEW.unit_price <> max(0, NEW.fee_base_price - coalesce(NEW.fee_tier_discount, 0)))
                    OR (NEW.fee_kind = 'PER_TRIP' AND NEW.unit_price <> NEW.fee_base_price)))))
        OR (NEW.fee_calc_source IS NULL AND (NEW.fee_base_price IS NOT NULL OR NEW.fee_tier_discount IS NOT NULL OR NEW.fee_program_id IS NOT NULL OR NEW.fee_program_name IS NOT NULL
              OR NEW.fee_override_reason IS NOT NULL OR NEW.fee_override_by IS NOT NULL
              OR (NEW.fee_source IS 'CHON' AND (NEW.fee_choice IS NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL
                    OR (NEW.fee_choice = 'DANH_SACH' AND NEW.unit_price NOT IN (0, 5000, 10000, 15000, 20000, 30000, 50000, 100000))
                    OR (NEW.fee_choice = 'SO_KHAC' AND (NEW.unit_price < 1 OR NEW.unit_price > 5000000))))
              OR (NEW.fee_source IS NOT 'CHON' AND (NEW.fee_choice IS NOT NULL OR NEW.fee_rule_id IS NULL OR NEW.fee_zone_code IS NULL))))))
  OR (NEW.line_kind = 'SERVICE' AND (NEW.transfer_leg_id IS NOT NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_kind IS NOT NULL
        OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL OR NEW.fee_return_pax IS NOT NULL
        OR NEW.fee_source IS NOT NULL OR NEW.fee_choice IS NOT NULL
        OR NEW.fee_calc_source IS NOT NULL OR NEW.fee_base_price IS NOT NULL OR NEW.fee_tier_discount IS NOT NULL OR NEW.fee_program_id IS NOT NULL
        OR NEW.fee_program_name IS NOT NULL OR NEW.fee_override_reason IS NOT NULL OR NEW.fee_override_by IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'order_item_line_kind: dòng phí đưa đón và dòng dịch vụ không lẫn cột của nhau'); END;

-- Đơn không còn nháp: bản chụp phí không đổi, nay gồm cả nguồn tính và bảy cột chụp mới.
CREATE TRIGGER order_item_fee_frozen_update BEFORE UPDATE ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.line_kind IS NOT OLD.line_kind OR NEW.transfer_leg_id IS NOT OLD.transfer_leg_id OR NEW.fee_rule_id IS NOT OLD.fee_rule_id
    OR NEW.fee_kind IS NOT OLD.fee_kind OR NEW.fee_zone_code IS NOT OLD.fee_zone_code OR NEW.fee_tier_code IS NOT OLD.fee_tier_code
    OR NEW.fee_return_pax IS NOT OLD.fee_return_pax OR NEW.fee_source IS NOT OLD.fee_source OR NEW.fee_choice IS NOT OLD.fee_choice
    OR NEW.fee_calc_source IS NOT OLD.fee_calc_source OR NEW.fee_base_price IS NOT OLD.fee_base_price OR NEW.fee_tier_discount IS NOT OLD.fee_tier_discount
    OR NEW.fee_program_id IS NOT OLD.fee_program_id OR NEW.fee_program_name IS NOT OLD.fee_program_name
    OR NEW.fee_override_reason IS NOT OLD.fee_override_reason OR NEW.fee_override_by IS NOT OLD.fee_override_by)
BEGIN SELECT RAISE(ABORT, 'order_fee_frozen: đơn đã xác nhận / đã huỷ — bản chụp phí đưa đón không đổi được'); END;
