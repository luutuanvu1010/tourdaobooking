-- Migration 0169 — PHÍ ĐƯA ĐÓN TRÊN ĐƠN (Đợt C, Task 1; ADR-0147, ADR-0203; thiết kế docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu-design.md §5, §7). Module orders.
-- CHỈ THÊM (expand): sáu cột mới của `order_item` (loại dòng + bản chụp phí), hai trigger kiểm tính nhất quán, một trigger SIẾT khoá cột chụp sau khi đơn hết nháp,
-- một chỉ mục duy nhất một phần, một bảng đổ + trigger «chốt lô xác nhận», một cờ mới của `ord_confirm_request`. Không đổi dữ liệu cũ (mọi dòng cũ = 'SERVICE').
-- Số: 0167–0168 do nhánh khác giữ (kiểm mọi nhánh 15/11) ⇒ 0169. Trigger 0081 KHÔNG bị nới: các trigger ở đây chỉ siết thêm.
-- Dòng phí không mang dữ liệu cá nhân: chỉ mã luật, mã vùng, mã cấp, số.

-- Lưu ý: `fee_rule_id` KHÔNG có REFERENCES. Khoá ngoại từ bảng của orders sang bảng của pricing làm câu chèn của pricing phải quét `order_item` (bài ranh giới
-- ADR-0002 điều 8(b) bắt) và chưa có cạnh toàn vẹn được duyệt. An toàn vẫn giữ: dòng mức của pricing chỉ-thêm, trigger `prc_transfer_fee_rule_no_delete` cấm xoá (0165); R-ORD-PD-1 kiểm mã mức còn tồn tại.

-- 1) Loại dòng: dịch vụ (mọi dòng cũ) hoặc phí đưa đón. Bản chụp phí nằm NGAY trên dòng (không tra lại bảng phí khi xem đơn cũ).
ALTER TABLE order_item ADD COLUMN line_kind TEXT NOT NULL DEFAULT 'SERVICE' CHECK (line_kind IN ('SERVICE', 'TRANSFER_FEE'));
ALTER TABLE order_item ADD COLUMN transfer_leg_id TEXT REFERENCES ord_transfer_leg(id);
ALTER TABLE order_item ADD COLUMN fee_rule_id TEXT;
ALTER TABLE order_item ADD COLUMN fee_kind TEXT CHECK (fee_kind IN ('PER_PAX', 'PER_TRIP'));
ALTER TABLE order_item ADD COLUMN fee_zone_code TEXT;
-- Trống = mức phí không có cấp.
ALTER TABLE order_item ADD COLUMN fee_tier_code TEXT;
-- Số người chiều về (`pax_override`) lúc tính; trống = theo số khách của dịch vụ.
ALTER TABLE order_item ADD COLUMN fee_return_pax INTEGER;

-- 2) Mỗi chặng đưa đón có TỐI ĐA MỘT dòng phí.
CREATE UNIQUE INDEX uq_order_item_fee_leg ON order_item(transfer_leg_id) WHERE line_kind = 'TRANSFER_FEE';

-- 3) Nhất quán theo loại dòng (chèn và sửa). Dòng phí: không dính dịch vụ / danh mục / loại khách; phải có chặng, mức, kiểu, vùng. Dòng dịch vụ: sáu cột phí đều trống.
CREATE TRIGGER order_item_line_kind_insert BEFORE INSERT ON order_item
WHEN (NEW.line_kind = 'TRANSFER_FEE' AND (NEW.service_id IS NOT NULL OR NEW.catalog_code IS NOT NULL OR NEW.catalog_price IS NOT NULL OR NEW.pax_code IS NOT NULL
        OR NEW.transfer_leg_id IS NULL OR NEW.fee_rule_id IS NULL OR NEW.fee_kind IS NULL OR NEW.fee_zone_code IS NULL))
  OR (NEW.line_kind = 'SERVICE' AND (NEW.transfer_leg_id IS NOT NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_kind IS NOT NULL
        OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL OR NEW.fee_return_pax IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'order_item_line_kind: dòng phí đưa đón và dòng dịch vụ không lẫn cột của nhau'); END;
CREATE TRIGGER order_item_line_kind_update BEFORE UPDATE ON order_item
WHEN (NEW.line_kind = 'TRANSFER_FEE' AND (NEW.service_id IS NOT NULL OR NEW.catalog_code IS NOT NULL OR NEW.catalog_price IS NOT NULL OR NEW.pax_code IS NOT NULL
        OR NEW.transfer_leg_id IS NULL OR NEW.fee_rule_id IS NULL OR NEW.fee_kind IS NULL OR NEW.fee_zone_code IS NULL))
  OR (NEW.line_kind = 'SERVICE' AND (NEW.transfer_leg_id IS NOT NULL OR NEW.fee_rule_id IS NOT NULL OR NEW.fee_kind IS NOT NULL
        OR NEW.fee_zone_code IS NOT NULL OR NEW.fee_tier_code IS NOT NULL OR NEW.fee_return_pax IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'order_item_line_kind: dòng phí đưa đón và dòng dịch vụ không lẫn cột của nhau'); END;

-- 4) Đơn không còn nháp: bản chụp phí không đổi. 0081 chỉ khoá cột tiền; bản chụp (loại dòng, chặng, mức, kiểu, vùng, cấp, số người chiều về) là căn cứ của tiền nên khoá cùng.
CREATE TRIGGER order_item_fee_frozen_update BEFORE UPDATE ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.line_kind IS NOT OLD.line_kind OR NEW.transfer_leg_id IS NOT OLD.transfer_leg_id OR NEW.fee_rule_id IS NOT OLD.fee_rule_id
    OR NEW.fee_kind IS NOT OLD.fee_kind OR NEW.fee_zone_code IS NOT OLD.fee_zone_code OR NEW.fee_tier_code IS NOT OLD.fee_tier_code
    OR NEW.fee_return_pax IS NOT OLD.fee_return_pax)
BEGIN SELECT RAISE(ABORT, 'order_fee_frozen: đơn đã xác nhận / đã huỷ — bản chụp phí đưa đón không đổi được'); END;

-- 5) CHỐT LÔ XÁC NHẬN (dùng ở Task 4). Khuôn «INSTEAD OF trên view» bị bài ADR-0002 điều 3 cấm, nên dùng BẢNG ĐỔ: `ord_xac_nhan_phi_gac` KHÔNG BAO GIỜ lưu dòng.
--    Đặt MỘT câu `INSERT INTO ord_xac_nhan_phi_gac (order_id) VALUES (?)` ngay sau câu chuyển đơn sang 'confirmed' trong cùng `db.batch`: nếu câu chuyển trạng thái không khớp dòng nào
--    (đơn đã bị người khác đổi) thì đơn chưa ở 'confirmed' ⇒ trigger ném lỗi ⇒ CẢ LÔ hoàn tác, kể cả các dòng phí đã chụp trước đó. Khi đơn đã 'confirmed' thì trigger bỏ qua dòng
--    chèn (RAISE IGNORE) ⇒ không lưu gì, lô đi tiếp.
CREATE TABLE ord_xac_nhan_phi_gac (
  order_id   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT
);
CREATE TRIGGER ord_xac_nhan_phi_gac_chot BEFORE INSERT ON ord_xac_nhan_phi_gac
BEGIN
  SELECT CASE WHEN (SELECT status FROM orders WHERE id = NEW.order_id) IS 'confirmed' THEN RAISE(IGNORE)
    ELSE RAISE(ABORT, 'transfer_fee_confirm_lost: đơn không còn ở trạng thái nháp để xác nhận — huỷ cả lô') END;
END;

-- 6) Cờ «thiếu phí đưa đón» của yêu cầu xác nhận: máy chủ chụp một lần lúc Gửi đơn; 1 = có chặng chưa tính được phí lúc gửi; 0 = như hôm nay (mọi yêu cầu cũ). Không đổi sau khi chèn (khuôn 0133).
ALTER TABLE ord_confirm_request ADD COLUMN transfer_fee_missing INTEGER NOT NULL DEFAULT 0 CHECK (transfer_fee_missing IN (0, 1));
CREATE TRIGGER ord_confirm_request_transfer_fee_missing_immutable BEFORE UPDATE ON ord_confirm_request
WHEN NEW.transfer_fee_missing IS NOT OLD.transfer_fee_missing
BEGIN SELECT RAISE(ABORT, 'ord_confirm_request_immutable: không sửa cờ thiếu phí đưa đón của yêu cầu'); END;
