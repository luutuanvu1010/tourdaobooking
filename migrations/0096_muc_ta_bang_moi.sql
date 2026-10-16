-- Migration 0096 — ADR-0117 lần 2 (mức TA dùng chung), Task 1: hai bảng mới. CHỈ THÊM: không động tới bảng cũ (prc_commission_rule dựng lại ở 0097).
-- Mức TA = tên do Kế toán đặt (TA1, TA2…); mỗi loại hồ sơ mang tối đa MỘT mức tại một ngày; dòng hoa hồng gắn vào mức (đích thứ ba, 0097).

CREATE TABLE prc_rate_tier (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  name_key   TEXT NOT NULL UNIQUE,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER prc_rate_tier_no_delete BEFORE DELETE ON prc_rate_tier
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá mức TA — tắt bằng active = 0'); END;
CREATE TRIGGER prc_rate_tier_update_scope BEFORE UPDATE ON prc_rate_tier
WHEN NEW.code IS NOT OLD.code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: mức TA chỉ đổi được tên, khoá tên, active và người/giờ cập nhật'); END;

CREATE TABLE prc_role_tier (
  id              TEXT PRIMARY KEY,
  role_type_code  TEXT NOT NULL REFERENCES prc_beneficiary_role(role_type_code),
  tier_code       TEXT NOT NULL REFERENCES prc_rate_tier(code),
  valid_from_date TEXT NOT NULL,
  valid_to_date   TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
CREATE INDEX prc_role_tier_role_ix ON prc_role_tier(role_type_code);
CREATE INDEX prc_role_tier_tier_ix ON prc_role_tier(tier_code);
CREATE TRIGGER prc_role_tier_no_delete BEFORE DELETE ON prc_role_tier
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá gắn loại-mức — đóng hiệu lực'); END;
CREATE TRIGGER prc_role_tier_close_only BEFORE UPDATE ON prc_role_tier
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.role_type_code IS NOT OLD.role_type_code
  OR NEW.tier_code IS NOT OLD.tier_code OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: gắn loại-mức chỉ được đóng một lần — đổi mức thì đóng gắn cũ, mở gắn mới'); END;
CREATE TRIGGER prc_role_tier_overlap BEFORE INSERT ON prc_role_tier
WHEN EXISTS (SELECT 1 FROM prc_role_tier o WHERE o.role_type_code = NEW.role_type_code
  AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_tier_overlap: loại này đã mang một mức trong khoảng ngày này'); END;
-- Loại phải nằm trong danh sách được hưởng và còn bật (gồm cả năm loại cũ nhóm EXTERNAL gieo ở 0090: «Chuyển từ hôm nay» của ADR).
CREATE TRIGGER prc_role_tier_role_ok BEFORE INSERT ON prc_role_tier
WHEN NOT EXISTS (SELECT 1 FROM prc_beneficiary_role b WHERE b.role_type_code = NEW.role_type_code AND b.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_tier_target: loại này không nằm trong danh sách được hưởng hoặc đã tắt'); END;
CREATE TRIGGER prc_role_tier_tier_ok BEFORE INSERT ON prc_role_tier
WHEN NOT EXISTS (SELECT 1 FROM prc_rate_tier t WHERE t.code = NEW.tier_code AND t.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_tier_inactive: mức TA không tồn tại hoặc đã tắt'); END;
