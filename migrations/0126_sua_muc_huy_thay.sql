-- Migration 0126 — ADR-0148 Đ1 lượt 1 (chủ duyệt 2026-10-29): nút «Sửa» cho ba loại dòng có ngày ở trang Hoa hồng — mức (prc_commission_rule), gắn loại ↔ chính sách
-- (prc_role_tier), gắn đối tác ↔ chính sách (prc_party_tier). Kế hoạch docs/superpowers/plans/2026-10-29-sua-muc-luot-1-ke-hoach.md Task 1.
-- CHỈ THÊM cột + THAY trigger (không dựng lại bảng): voided_at / voided_by (dấu huỷ — dòng chưa có đơn nào chụp), replaces_id (dòng mới thay dòng nào), change_reason (lý do sửa).
-- Dòng đã huỷ: không bao giờ áp (view v_prc_commission_rule loại nó ⇒ trigger chụp của orders chặn), không tính chồng ngày, không đổi gì nữa. Ngoài huỷ, chỉ được ĐÓNG (đặt ngày
-- kết thúc) hoặc RÚT NGẮN ngày kết thúc; không sửa số, không xoá. «Đã có đơn chụp chưa» và «hôm nay» là luật MÁY CHỦ (pricing không đọc được orders; không date('now')).
-- Tệp KHÔNG tự mở/đóng giao dịch (khuôn 0097). Không `CASE … END)` trong trigger (bộ tách câu của wrangler — scripts/audit-checks.mjs R-ORD-T1).

-- 1. Gỡ trigger chụp + view đọc bảng mức (khuôn 0097 mục 5), rồi mới thêm cột.
DROP TRIGGER ord_service_terms_rule_valid;
DROP VIEW v_prc_commission_rule;

ALTER TABLE prc_commission_rule ADD COLUMN voided_at TEXT;
ALTER TABLE prc_commission_rule ADD COLUMN voided_by TEXT;
ALTER TABLE prc_commission_rule ADD COLUMN replaces_id TEXT REFERENCES prc_commission_rule(id);
ALTER TABLE prc_commission_rule ADD COLUMN change_reason TEXT CHECK (change_reason IS NULL OR length(trim(change_reason)) BETWEEN 10 AND 500);
ALTER TABLE prc_role_tier ADD COLUMN voided_at TEXT;
ALTER TABLE prc_role_tier ADD COLUMN voided_by TEXT;
ALTER TABLE prc_role_tier ADD COLUMN replaces_id TEXT REFERENCES prc_role_tier(id);
ALTER TABLE prc_role_tier ADD COLUMN change_reason TEXT CHECK (change_reason IS NULL OR length(trim(change_reason)) BETWEEN 10 AND 500);
ALTER TABLE prc_party_tier ADD COLUMN voided_at TEXT;
ALTER TABLE prc_party_tier ADD COLUMN voided_by TEXT;
ALTER TABLE prc_party_tier ADD COLUMN replaces_id TEXT REFERENCES prc_party_tier(id);
ALTER TABLE prc_party_tier ADD COLUMN change_reason TEXT CHECK (change_reason IS NULL OR length(trim(change_reason)) BETWEEN 10 AND 500);

-- 2. «Chỉ đóng» → ba việc được làm, mỗi lần một việc: (a) đặt ngày kết thúc, (b) rút ngắn ngày kết thúc (CHECK của bảng giữ ≥ ngày bắt đầu), (c) huỷ MỘT lần, phải có người huỷ,
-- không đổi ngày kết thúc cùng lúc. Dòng đã huỷ không đổi gì nữa. Mọi cột khác (kể cả replaces_id, change_reason) giữ nguyên. Cùng tiền tố lỗi `prc_append_only:` như trước.
DROP TRIGGER prc_commission_rule_close_only;
CREATE TRIGGER prc_commission_rule_close_only BEFORE UPDATE ON prc_commission_rule
WHEN OLD.voided_at IS NOT NULL OR NEW.id IS NOT OLD.id OR NEW.target_party_id IS NOT OLD.target_party_id
  OR NEW.target_role_code IS NOT OLD.target_role_code OR NEW.target_tier_code IS NOT OLD.target_tier_code OR NEW.scope IS NOT OLD.scope
  OR NEW.catalog_code IS NOT OLD.catalog_code OR NEW.group_code IS NOT OLD.group_code
  OR NEW.kind IS NOT OLD.kind OR NEW.rate_bp IS NOT OLD.rate_bp OR NEW.per_pax_amount IS NOT OLD.per_pax_amount OR NEW.valid_from_date IS NOT OLD.valid_from_date
  OR NEW.note IS NOT OLD.note OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.replaces_id IS NOT OLD.replaces_id OR NEW.change_reason IS NOT OLD.change_reason
  OR NOT ((NEW.voided_at IS NULL AND NEW.voided_by IS NULL AND NEW.valid_to_date IS NOT NULL AND (OLD.valid_to_date IS NULL OR NEW.valid_to_date < OLD.valid_to_date))
       OR (NEW.voided_at IS NOT NULL AND NEW.voided_by IS NOT NULL AND NEW.valid_to_date IS OLD.valid_to_date))
BEGIN SELECT RAISE(ABORT, 'prc_append_only: dòng mức chỉ được đóng, rút ngắn ngày kết thúc, hoặc huỷ một lần — sửa số thì thêm dòng mới'); END;
DROP TRIGGER prc_role_tier_close_only;
CREATE TRIGGER prc_role_tier_close_only BEFORE UPDATE ON prc_role_tier
WHEN OLD.voided_at IS NOT NULL OR NEW.id IS NOT OLD.id OR NEW.role_type_code IS NOT OLD.role_type_code
  OR NEW.tier_code IS NOT OLD.tier_code OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.replaces_id IS NOT OLD.replaces_id OR NEW.change_reason IS NOT OLD.change_reason
  OR NOT ((NEW.voided_at IS NULL AND NEW.voided_by IS NULL AND NEW.valid_to_date IS NOT NULL AND (OLD.valid_to_date IS NULL OR NEW.valid_to_date < OLD.valid_to_date))
       OR (NEW.voided_at IS NOT NULL AND NEW.voided_by IS NOT NULL AND NEW.valid_to_date IS OLD.valid_to_date))
BEGIN SELECT RAISE(ABORT, 'prc_append_only: gắn loại-mức chỉ được đóng, rút ngắn ngày kết thúc, hoặc huỷ một lần — đổi chính sách thì thêm gắn mới'); END;
DROP TRIGGER prc_party_tier_close_only;
CREATE TRIGGER prc_party_tier_close_only BEFORE UPDATE ON prc_party_tier
WHEN OLD.voided_at IS NOT NULL OR NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id
  OR NEW.tier_code IS NOT OLD.tier_code OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.replaces_id IS NOT OLD.replaces_id OR NEW.change_reason IS NOT OLD.change_reason
  OR NOT ((NEW.voided_at IS NULL AND NEW.voided_by IS NULL AND NEW.valid_to_date IS NOT NULL AND (OLD.valid_to_date IS NULL OR NEW.valid_to_date < OLD.valid_to_date))
       OR (NEW.voided_at IS NOT NULL AND NEW.voided_by IS NOT NULL AND NEW.valid_to_date IS OLD.valid_to_date))
BEGIN SELECT RAISE(ABORT, 'prc_append_only: gắn mức riêng chỉ được đóng, rút ngắn ngày kết thúc, hoặc huỷ một lần — đổi chính sách thì thêm gắn mới'); END;

-- 3. Chồng ngày: nguyên văn 0097 / 0096 / 0118, thêm `o.voided_at IS NULL` (dòng đã huỷ không giữ chỗ).
DROP TRIGGER prc_commission_rule_overlap;
CREATE TRIGGER prc_commission_rule_overlap BEFORE INSERT ON prc_commission_rule
WHEN EXISTS (SELECT 1 FROM prc_commission_rule o
  WHERE o.voided_at IS NULL AND IFNULL(o.target_party_id, '') = IFNULL(NEW.target_party_id, '') AND IFNULL(o.target_role_code, '') = IFNULL(NEW.target_role_code, '')
    AND IFNULL(o.target_tier_code, '') = IFNULL(NEW.target_tier_code, '')
    AND o.scope = NEW.scope AND IFNULL(o.catalog_code, '') = IFNULL(NEW.catalog_code, '') AND IFNULL(o.group_code, '') = IFNULL(NEW.group_code, '')
    AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_overlap: đã có mức cùng đối tượng, cùng phạm vi trong khoảng ngày này'); END;
DROP TRIGGER prc_role_tier_overlap;
CREATE TRIGGER prc_role_tier_overlap BEFORE INSERT ON prc_role_tier
WHEN EXISTS (SELECT 1 FROM prc_role_tier o WHERE o.voided_at IS NULL AND o.role_type_code = NEW.role_type_code
  AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_tier_overlap: loại này đã mang một mức trong khoảng ngày này'); END;
DROP TRIGGER prc_party_tier_overlap;
CREATE TRIGGER prc_party_tier_overlap BEFORE INSERT ON prc_party_tier
WHEN EXISTS (SELECT 1 FROM prc_party_tier o WHERE o.voided_at IS NULL AND o.party_id = NEW.party_id
  AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_party_tier_overlap: hồ sơ này đã có một mức riêng trong khoảng ngày này'); END;

-- 4. Dòng mới không mang dấu huỷ; dòng thay thế: có dòng cũ ⇔ có lý do; dòng cũ cùng đích + cùng phạm vi (mức) / cùng loại (gắn loại) / cùng hồ sơ (gắn đối tác), và đã huỷ
-- hoặc kết thúc TRƯỚC ngày bắt đầu mới (đường «sửa từ ngày»: lô đóng dòng cũ trước khi chèn dòng mới). Chính sách của gắn được đổi khi thay.
CREATE TRIGGER prc_commission_rule_born_clean BEFORE INSERT ON prc_commission_rule
WHEN NEW.voided_at IS NOT NULL OR NEW.voided_by IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'prc_born_voided: dòng mức mới không được mang dấu huỷ'); END;
CREATE TRIGGER prc_role_tier_born_clean BEFORE INSERT ON prc_role_tier
WHEN NEW.voided_at IS NOT NULL OR NEW.voided_by IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'prc_born_voided: gắn loại-mức mới không được mang dấu huỷ'); END;
CREATE TRIGGER prc_party_tier_born_clean BEFORE INSERT ON prc_party_tier
WHEN NEW.voided_at IS NOT NULL OR NEW.voided_by IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'prc_born_voided: gắn mức riêng mới không được mang dấu huỷ'); END;
CREATE TRIGGER prc_commission_rule_replaces_ok BEFORE INSERT ON prc_commission_rule
WHEN (NEW.replaces_id IS NULL) <> (NEW.change_reason IS NULL)
  OR (NEW.replaces_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prc_commission_rule o WHERE o.id = NEW.replaces_id
    AND o.target_party_id IS NEW.target_party_id AND o.target_role_code IS NEW.target_role_code AND o.target_tier_code IS NEW.target_tier_code
    AND o.scope = NEW.scope AND o.catalog_code IS NEW.catalog_code AND o.group_code IS NEW.group_code
    AND (o.voided_at IS NOT NULL OR o.valid_to_date < NEW.valid_from_date)))
BEGIN SELECT RAISE(ABORT, 'prc_replaces_mismatch: dòng thay thế phải trỏ dòng cùng đối tượng, cùng phạm vi, đã huỷ hoặc đã kết thúc trước, và phải có lý do'); END;
CREATE TRIGGER prc_role_tier_replaces_ok BEFORE INSERT ON prc_role_tier
WHEN (NEW.replaces_id IS NULL) <> (NEW.change_reason IS NULL)
  OR (NEW.replaces_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prc_role_tier o WHERE o.id = NEW.replaces_id AND o.role_type_code = NEW.role_type_code
    AND (o.voided_at IS NOT NULL OR o.valid_to_date < NEW.valid_from_date)))
BEGIN SELECT RAISE(ABORT, 'prc_replaces_mismatch: gắn thay thế phải trỏ gắn cùng loại, đã huỷ hoặc đã kết thúc trước, và phải có lý do'); END;
CREATE TRIGGER prc_party_tier_replaces_ok BEFORE INSERT ON prc_party_tier
WHEN (NEW.replaces_id IS NULL) <> (NEW.change_reason IS NULL)
  OR (NEW.replaces_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prc_party_tier o WHERE o.id = NEW.replaces_id AND o.party_id = NEW.party_id
    AND (o.voided_at IS NOT NULL OR o.valid_to_date < NEW.valid_from_date)))
BEGIN SELECT RAISE(ABORT, 'prc_replaces_mismatch: gắn thay thế phải trỏ gắn cùng hồ sơ, đã huỷ hoặc đã kết thúc trước, và phải có lý do'); END;

-- 5. View công bố: cùng cột, cùng thứ tự (0097), thêm `WHERE voided_at IS NULL`; trigger chụp của orders tạo lại NGUYÊN VĂN 0097 ⇒ bản chụp AUTO mới trỏ dòng đã huỷ bị chặn
-- (`terms_rule_stale`). `v_prc_commission_rule_pax` giữ nguyên: bản chụp chính trỏ dòng huỷ đã bị chặn trước câu chèn số theo loại.
CREATE VIEW v_prc_commission_rule AS
  SELECT id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, target_tier_code FROM prc_commission_rule
  WHERE voided_at IS NULL;
CREATE TRIGGER ord_service_terms_rule_valid BEFORE INSERT ON ord_service_terms
WHEN NEW.source = 'AUTO' AND NEW.commission_rule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_prc_commission_rule r
  WHERE r.id = NEW.commission_rule_id AND r.valid_from_date <= NEW.captured_date AND (r.valid_to_date IS NULL OR r.valid_to_date >= NEW.captured_date)
    AND r.kind = NEW.commission_kind AND r.rate_bp IS NEW.commission_rate_bp AND r.per_pax_amount IS NEW.commission_per_pax)
BEGIN SELECT RAISE(ABORT, 'terms_rule_stale: dòng mức không còn hiệu lực ở ngày chụp'); END;
