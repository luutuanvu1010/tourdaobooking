-- Migration 0095 — ADR-0117 lần 1. Cờ «loại đối tác» là sự thật của parties (phân loại); prc_beneficiary_role giữ chính sách (loại nào đang hưởng).
-- CHỈ THÊM: không sửa dòng dữ liệu nào, không dựng lại bảng. Năm dòng EXTERNAL gieo ở 0090 còn nguyên (trigger pricing chỉ chặn INSERT mới).
ALTER TABLE pty_role_type ADD COLUMN is_partner_label INTEGER NOT NULL DEFAULT 0 CHECK (is_partner_label IN (0, 1));

CREATE VIEW v_pty_role_type AS SELECT code, role_group, is_partner_label, active FROM pty_role_type;
CREATE VIEW v_pty_party_partner_label AS
  SELECT DISTINCT r.party_id FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
  WHERE r.valid_to_date IS NULL AND t.is_partner_label = 1;

-- Loại đối tác luôn nhóm OTHER (không sinh quyền) và bất biến một khi đã có hồ sơ dùng.
CREATE TRIGGER pty_role_type_partner_label_other BEFORE INSERT ON pty_role_type
WHEN NEW.is_partner_label = 1 AND NEW.role_group <> 'OTHER'
BEGIN SELECT RAISE(ABORT, 'partner_label_group: loại đối tác phải thuộc nhóm OTHER'); END;
CREATE TRIGGER pty_role_type_partner_label_immutable BEFORE UPDATE ON pty_role_type
WHEN (NEW.is_partner_label IS NOT OLD.is_partner_label OR NEW.role_group IS NOT OLD.role_group)
  AND ((NEW.is_partner_label = 1 AND NEW.role_group <> 'OTHER')
       OR EXISTS (SELECT 1 FROM pty_party_role r WHERE r.role_type_code = OLD.code))
BEGIN SELECT RAISE(ABORT, 'partner_label_immutable: không đổi nhóm hay cờ loại đối tác khi đã có hồ sơ dùng'); END;

-- Hồ sơ «nội bộ» (parties thấy được): vai nhóm INTERNAL, hoặc vai cũ STAFF/SALES (đã ngưng ở 0024, TẠM — bỏ khi dữ liệu cũ được dọn). Vế «có quyền nội bộ» ở stf_permission (dưới).
CREATE TRIGGER pty_party_role_partner_label_conflict_ins BEFORE INSERT ON pty_party_role
WHEN NEW.valid_to_date IS NULL AND (
  (EXISTS (SELECT 1 FROM pty_role_type nt WHERE nt.code = NEW.role_type_code AND nt.is_partner_label = 1)
   AND EXISTS (SELECT 1 FROM pty_party_role o JOIN pty_role_type ot ON ot.code = o.role_type_code
               WHERE o.party_id = NEW.party_id AND o.valid_to_date IS NULL AND (ot.role_group = 'INTERNAL' OR o.role_type_code IN ('STAFF', 'SALES'))))
  OR (EXISTS (SELECT 1 FROM pty_role_type nt WHERE nt.code = NEW.role_type_code AND (nt.role_group = 'INTERNAL' OR nt.code IN ('STAFF', 'SALES')))
   AND EXISTS (SELECT 1 FROM pty_party_role o JOIN pty_role_type ot ON ot.code = o.role_type_code
               WHERE o.party_id = NEW.party_id AND o.valid_to_date IS NULL AND ot.is_partner_label = 1)))
BEGIN SELECT RAISE(ABORT, 'party_role_partner_label_conflict: hồ sơ nội bộ không mang loại đối tác được hưởng hoa hồng'); END;
-- _upd: cùng thân; thêm `AND o.id <> NEW.id` ở các câu con (khuôn LC-3 ở 0024) để dòng đang sửa không tự đụng chính nó. Bắt «mở lại» (valid_to_date → NULL).
CREATE TRIGGER pty_party_role_partner_label_conflict_upd BEFORE UPDATE ON pty_party_role
WHEN NEW.valid_to_date IS NULL AND (
  (EXISTS (SELECT 1 FROM pty_role_type nt WHERE nt.code = NEW.role_type_code AND nt.is_partner_label = 1)
   AND EXISTS (SELECT 1 FROM pty_party_role o JOIN pty_role_type ot ON ot.code = o.role_type_code
               WHERE o.id <> NEW.id AND o.party_id = NEW.party_id AND o.valid_to_date IS NULL AND (ot.role_group = 'INTERNAL' OR o.role_type_code IN ('STAFF', 'SALES'))))
  OR (EXISTS (SELECT 1 FROM pty_role_type nt WHERE nt.code = NEW.role_type_code AND (nt.role_group = 'INTERNAL' OR nt.code IN ('STAFF', 'SALES')))
   AND EXISTS (SELECT 1 FROM pty_party_role o JOIN pty_role_type ot ON ot.code = o.role_type_code
               WHERE o.id <> NEW.id AND o.party_id = NEW.party_id AND o.valid_to_date IS NULL AND ot.is_partner_label = 1)))
BEGIN SELECT RAISE(ABORT, 'party_role_partner_label_conflict: hồ sơ nội bộ không mang loại đối tác được hưởng hoa hồng'); END;

-- pricing: chỉ vai EXTERNAL hoặc loại đối tác (OTHER có cờ) vào danh sách được hưởng. Năm dòng EXTERNAL gieo ở 0090 không bị ảnh hưởng (chỉ chặn INSERT mới).
CREATE TRIGGER prc_beneficiary_role_kind BEFORE INSERT ON prc_beneficiary_role
WHEN NOT EXISTS (SELECT 1 FROM v_pty_role_type t WHERE t.code = NEW.role_type_code
                 AND (t.role_group = 'EXTERNAL' OR (t.role_group = 'OTHER' AND t.is_partner_label = 1)))
BEGIN SELECT RAISE(ABORT, 'prc_beneficiary_kind: chỉ vai bên ngoài hoặc loại đối tác mới được hưởng hoa hồng'); END;

-- staff: tài khoản mà hồ sơ mang loại đối tác chỉ giữ quyền bên ngoài (đối xứng LC-1). Tên KHÔNG bắt đầu bằng stf_/staff_ (migrations-n1.test.ts).
CREATE TRIGGER adr0117_permission_partner_label_internal BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND NEW.permission_type_code NOT IN ('PARTNER', 'DRIVER_PARTNER') AND EXISTS (
  SELECT 1 FROM staff s JOIN v_pty_party_partner_label l ON l.party_id = s.party_id WHERE s.id = NEW.staff_id)
BEGIN SELECT RAISE(ABORT, 'permission_partner_label_conflict: hồ sơ mang loại đối tác không giữ quyền nội bộ'); END;
