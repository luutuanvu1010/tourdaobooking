PRAGMA defer_foreign_keys = ON;
-- Migration 0097 — ADR-0117 lần 2 (mức TA dùng chung), Task 2: dựng lại prc_commission_rule thêm đích thứ ba target_tier_code (khoá ngoại prc_rate_tier, 0096).
-- Đúng một trong ba đích (hồ sơ / vai / mức). Mã dòng và mọi cột cũ giữ nguyên; bản chụp ord_service_terms vẫn trỏ được mọi commission_rule_id.
-- Tệp KHÔNG tự mở/đóng giao dịch: D1 local từ chối câu mở giao dịch trơn, còn wrangler chạy cả tệp trong một db.batch (Bước 0 bậc b). Bài node:sqlite tự bọc giao dịch quanh tệp.
-- Trình tự theo ADR-0003 điều 10: gỡ view + trigger nhắc bảng → chép bản sao → tạo bảng mới rỗng → DROP bảng cũ → đổi tên → nạp lại (danh sách cột tường minh) → DROP bản sao
-- → tạo lại chỉ mục, trigger, view. Bài src/migrations-dung-lai-muc.test.ts so toàn bộ sqlite_master trước/sau (N-20).

-- 1. Gỡ view và trigger của bảng chụp đọc view đó (đổi tên bảng sẽ báo lỗi nếu còn view trỏ bảng đã DROP).
DROP VIEW v_prc_commission_rule;
DROP TRIGGER ord_service_terms_rule_valid;

-- 2. Bản sao, bảng mới rỗng, đổi tên, nạp lại, bỏ bản sao.
CREATE TABLE prc_commission_rule_copy AS SELECT * FROM prc_commission_rule;
CREATE TABLE prc_commission_rule_new (
  id               TEXT PRIMARY KEY,
  target_party_id  TEXT REFERENCES pty_party(id),
  target_role_code TEXT REFERENCES prc_beneficiary_role(role_type_code),
  scope            TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP', 'ALL')),
  catalog_code     TEXT,
  group_code       TEXT REFERENCES ctl_group(code),
  kind             TEXT NOT NULL CHECK (kind IN ('RATE', 'PER_PAX')),
  rate_bp          INTEGER CHECK (rate_bp BETWEEN 0 AND 10000),
  per_pax_amount   INTEGER CHECK (per_pax_amount >= 0),
  valid_from_date  TEXT NOT NULL,
  valid_to_date    TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date),
  note             TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  target_tier_code TEXT REFERENCES prc_rate_tier(code),
  CHECK ((target_party_id IS NOT NULL) + (target_role_code IS NOT NULL) + (target_tier_code IS NOT NULL) = 1),
  CHECK ((scope = 'SERVICE' AND catalog_code IS NOT NULL AND group_code IS NULL) OR (scope = 'GROUP' AND group_code IS NOT NULL AND catalog_code IS NULL)
         OR (scope = 'ALL' AND catalog_code IS NULL AND group_code IS NULL)),
  CHECK ((kind = 'RATE' AND rate_bp IS NOT NULL AND per_pax_amount IS NULL) OR (kind = 'PER_PAX' AND per_pax_amount IS NOT NULL AND rate_bp IS NULL))
);
DROP TABLE prc_commission_rule;
ALTER TABLE prc_commission_rule_new RENAME TO prc_commission_rule;
INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
    created_at, created_by, updated_at, updated_by)
  SELECT id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
    created_at, created_by, updated_at, updated_by
  FROM prc_commission_rule_copy;
DROP TABLE prc_commission_rule_copy;

-- 3. Chỉ mục: hai chỉ mục cũ (mất khi DROP) + chỉ mục đích mức.
CREATE INDEX prc_commission_rule_party_ix ON prc_commission_rule(target_party_id);
CREATE INDEX prc_commission_rule_role_ix ON prc_commission_rule(target_role_code);
CREATE INDEX prc_commission_rule_tier_ix ON prc_commission_rule(target_tier_code);

-- 4. Trigger: no_delete, target_party, target_role nguyên văn 0090; close_only và overlap viết lại có target_tier_code; thêm target_tier.
CREATE TRIGGER prc_commission_rule_no_delete BEFORE DELETE ON prc_commission_rule
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá dòng mức — đóng hiệu lực'); END;
CREATE TRIGGER prc_commission_rule_close_only BEFORE UPDATE ON prc_commission_rule
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.target_party_id IS NOT OLD.target_party_id
  OR NEW.target_role_code IS NOT OLD.target_role_code OR NEW.target_tier_code IS NOT OLD.target_tier_code OR NEW.scope IS NOT OLD.scope
  OR NEW.catalog_code IS NOT OLD.catalog_code OR NEW.group_code IS NOT OLD.group_code
  OR NEW.kind IS NOT OLD.kind OR NEW.rate_bp IS NOT OLD.rate_bp OR NEW.per_pax_amount IS NOT OLD.per_pax_amount OR NEW.valid_from_date IS NOT OLD.valid_from_date
  OR NEW.note IS NOT OLD.note OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: dòng mức chỉ được đóng một lần — đổi mức thì đóng dòng cũ, thêm dòng mới'); END;
-- Khoá chồng ngày = (hồ sơ, vai, MỨC, phạm vi, mã, nhóm): thiếu mức thì mọi dòng đích mức coi là cùng đích — hai mức khác nhau không cùng có được dòng «mọi dịch vụ».
CREATE TRIGGER prc_commission_rule_overlap BEFORE INSERT ON prc_commission_rule
WHEN EXISTS (SELECT 1 FROM prc_commission_rule o
  WHERE IFNULL(o.target_party_id, '') = IFNULL(NEW.target_party_id, '') AND IFNULL(o.target_role_code, '') = IFNULL(NEW.target_role_code, '')
    AND IFNULL(o.target_tier_code, '') = IFNULL(NEW.target_tier_code, '')
    AND o.scope = NEW.scope AND IFNULL(o.catalog_code, '') = IFNULL(NEW.catalog_code, '') AND IFNULL(o.group_code, '') = IFNULL(NEW.group_code, '')
    AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_overlap: đã có mức cùng đối tượng, cùng phạm vi trong khoảng ngày này'); END;
CREATE TRIGGER prc_commission_rule_target_party BEFORE INSERT ON prc_commission_rule
WHEN NEW.target_party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1
  WHERE r.party_id = NEW.target_party_id)
BEGIN SELECT RAISE(ABORT, 'prc_target_not_beneficiary: hồ sơ này không mang vai được hưởng hoa hồng'); END;
CREATE TRIGGER prc_commission_rule_target_role BEFORE INSERT ON prc_commission_rule
WHEN NEW.target_role_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prc_beneficiary_role b WHERE b.role_type_code = NEW.target_role_code AND b.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_role_not_beneficiary: vai này không nằm trong danh sách được hưởng'); END;
-- Dòng mới cho mức không tồn tại hoặc đã tắt bị chặn (cùng câu báo với prc_role_tier_tier_ok); dòng đang có của mức vừa tắt vẫn giữ (R-PRC-2 báo).
CREATE TRIGGER prc_commission_rule_target_tier BEFORE INSERT ON prc_commission_rule
WHEN NEW.target_tier_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prc_rate_tier t WHERE t.code = NEW.target_tier_code AND t.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_tier_inactive: mức TA không tồn tại hoặc đã tắt'); END;

-- 5. View công bố (cột mới ở CUỐI — người đọc cũ theo tên cột không lệch) và trigger của bảng chụp nguyên văn 0090.
CREATE VIEW v_prc_commission_rule AS
  SELECT id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, target_tier_code FROM prc_commission_rule;
CREATE TRIGGER ord_service_terms_rule_valid BEFORE INSERT ON ord_service_terms
WHEN NEW.source = 'AUTO' AND NEW.commission_rule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_prc_commission_rule r
  WHERE r.id = NEW.commission_rule_id AND r.valid_from_date <= NEW.captured_date AND (r.valid_to_date IS NULL OR r.valid_to_date >= NEW.captured_date)
    AND r.kind = NEW.commission_kind AND r.rate_bp IS NEW.commission_rate_bp AND r.per_pax_amount IS NEW.commission_per_pax)
BEGIN SELECT RAISE(ABORT, 'terms_rule_stale: dòng mức không còn hiệu lực ở ngày chụp'); END;
