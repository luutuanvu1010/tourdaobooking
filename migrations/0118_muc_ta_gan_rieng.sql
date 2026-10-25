-- Migration 0118 — ADR-0138 (chủ duyệt 2026-10-24): mức TA gắn RIÊNG cho từng hồ sơ đối tác. CHỈ THÊM một bảng, theo khuôn prc_role_tier (0096).
-- Mỗi hồ sơ tối đa MỘT mức tại một ngày; chỉ gắn cho hồ sơ đang mở vai thuộc loại được hưởng (đọc view công bố v_pty_open_role, không JOIN bảng vai);
-- mức tắt không gắn mới; gắn chỉ đóng được một lần, đổi mức = đóng cũ mở mới; không xoá.

CREATE TABLE prc_party_tier (
  id              TEXT PRIMARY KEY,
  party_id        TEXT NOT NULL REFERENCES pty_party(id),
  tier_code       TEXT NOT NULL REFERENCES prc_rate_tier(code),
  valid_from_date TEXT NOT NULL,
  valid_to_date   TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
CREATE INDEX prc_party_tier_party_ix ON prc_party_tier(party_id);
CREATE INDEX prc_party_tier_tier_ix ON prc_party_tier(tier_code);
CREATE TRIGGER prc_party_tier_no_delete BEFORE DELETE ON prc_party_tier
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá gắn mức riêng — đóng hiệu lực'); END;
CREATE TRIGGER prc_party_tier_close_only BEFORE UPDATE ON prc_party_tier
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id
  OR NEW.tier_code IS NOT OLD.tier_code OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: gắn mức riêng chỉ được đóng một lần — đổi mức thì đóng gắn cũ, mở gắn mới'); END;
CREATE TRIGGER prc_party_tier_overlap BEFORE INSERT ON prc_party_tier
WHEN EXISTS (SELECT 1 FROM prc_party_tier o WHERE o.party_id = NEW.party_id
  AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_party_tier_overlap: hồ sơ này đã có một mức riêng trong khoảng ngày này'); END;
CREATE TRIGGER prc_party_tier_party_ok BEFORE INSERT ON prc_party_tier
WHEN NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1
  WHERE r.party_id = NEW.party_id)
BEGIN SELECT RAISE(ABORT, 'prc_target_not_beneficiary: hồ sơ này không mang loại được hưởng hoa hồng'); END;
CREATE TRIGGER prc_party_tier_tier_ok BEFORE INSERT ON prc_party_tier
WHEN NOT EXISTS (SELECT 1 FROM prc_rate_tier t WHERE t.code = NEW.tier_code AND t.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_tier_inactive: mức TA không tồn tại hoặc đã tắt'); END;
