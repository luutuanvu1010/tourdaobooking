-- Migration 0038 — ADR-0048 D1 (accepted 2026-09-28): nhà xe đối tác (vai hồ sơ CARRIER, nhóm OTHER — không sinh quyền, không gắn tài khoản: Q5 = (a)),
-- quan hệ "Tài xế của" (DRIVES_FOR, người → nhà xe), ba view công bố CHỈ KHOÁ của parties, hai trigger giữ đầu quan hệ (B1.2). CHỈ THÊM.
-- "Đang mở" = valid_to_date IS NULL (cùng cách LC-1/LC-3 và v_pty_open_role_group). Vai là điều kiện DỮ LIỆU (chủ xe, người lái), KHÔNG phải điều kiện cho phép.
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('CARRIER', 'Nhà xe đối tác', 31, 'OTHER');
INSERT INTO pty_relationship_type (code, name, sort_order) VALUES ('DRIVES_FOR', 'Tài xế của', 2);
-- Công ty chủ đang hiệu lực (ADR-0024 điều 6) — cho trigger chủ xe của van-chuyen (B1.1). Chỉ khoá.
CREATE VIEW v_pty_owner_company AS
  SELECT DISTINCT party_id FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL;
-- Hồ sơ đang mở vai Nhà xe đối tác (bất kỳ nơi nào). Chỉ khoá.
CREATE VIEW v_pty_carrier AS
  SELECT DISTINCT party_id FROM pty_party_role WHERE role_type_code = 'CARRIER' AND valid_to_date IS NULL;
-- LUẬT "tài xế T thuộc nhà xe X" — công bố MỘT lần (ADR-0048 D1): T = X (nhà xe CÁ NHÂN tự lái; bảng quan hệ cấm nối hồ sơ với chính nó) HOẶC T có
-- quan hệ "Tài xế của" đang mở tới X; X phải đang mở vai Nhà xe (nhà xe thôi hợp tác thì không còn tài xế nào "thuộc" — quan hệ không tự đóng).
-- HIỆN TẠI, không theo ngày: lượt 1b cần "vào ngày chạy" thì đổi hợp đồng view bằng migration của 1b.
CREATE VIEW v_pty_carrier_driver AS
  SELECT c.party_id AS carrier_party_id, c.party_id AS driver_party_id
    FROM v_pty_carrier c JOIN pty_party p ON p.id = c.party_id WHERE p.party_kind = 'PERSON'
  UNION
  SELECT r.to_party_id, r.from_party_id
    FROM pty_party_relationship r JOIN v_pty_carrier c ON c.party_id = r.to_party_id
   WHERE r.relationship_type_code = 'DRIVES_FOR' AND r.valid_to_date IS NULL;
-- B1.2 (hai trigger, mỗi trigger một câu RAISE — mỗi hàng rào một phép đột biến): đầu TỪ là hồ sơ cá nhân; đầu TỚI đang mở vai Nhà xe lúc mở quan hệ.
CREATE TRIGGER pty_relationship_drives_for_person BEFORE INSERT ON pty_party_relationship
WHEN NEW.relationship_type_code = 'DRIVES_FOR'
  AND NOT EXISTS (SELECT 1 FROM pty_party p WHERE p.id = NEW.from_party_id AND p.party_kind = 'PERSON')
BEGIN SELECT RAISE(ABORT, 'party_relationship_drives_for_person: quan hệ Tài xế của phải đi từ hồ sơ cá nhân'); END;
CREATE TRIGGER pty_relationship_drives_for_carrier BEFORE INSERT ON pty_party_relationship
WHEN NEW.relationship_type_code = 'DRIVES_FOR'
  AND NOT EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.to_party_id)
BEGIN SELECT RAISE(ABORT, 'party_relationship_drives_for_carrier: quan hệ Tài xế của phải trỏ tới hồ sơ đang là nhà xe đối tác'); END;
