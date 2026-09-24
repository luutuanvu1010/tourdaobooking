-- Migration 0024 — ADR-0018 (mô hình người – vai – quyền), GIAI ĐOẠN 1. CHỈ THÊM (expand): cột nhóm vai, 10 mã vai mới, mã quyền INTERN,
-- nhãn "Toàn quyền", bảng chỉnh quyền tay, view công bố nhóm vai đang mở, hai trigger luật cứng (LC-1, LC-3).
-- KHÔNG đổi quyền của tài khoản nào và KHÔNG gán vai cho ai: chuyển đổi ~30 tài khoản làm bằng màn quản trị sau khi chủ duyệt bảng đối chiếu
-- (đặc tả §14). Không gieo SĐT/tên thật ở đây.

-- ---- Danh mục vai (module parties) ----------------------------------------------------------------------------------------
-- Nhóm vai: INTERNAL / EXTERNAL / OTHER — tập đóng, ép bằng CHECK ở cột (ADR-0003 điều 3); mã (src/shared/roles.ts) dùng lại đúng ba giá trị này.
ALTER TABLE pty_role_type ADD COLUMN role_group TEXT NOT NULL DEFAULT 'OTHER' CHECK (role_group IN ('INTERNAL', 'EXTERNAL', 'OTHER'));
UPDATE pty_role_type SET role_group = 'INTERNAL', sort_order = 15 WHERE code = 'ACCOUNTANT';
-- Mã cũ mơ hồ (không nói nội bộ hay độc lập): ngưng dùng cho gán MỚI; dòng đang có giữ nguyên, đóng khi tài khoản được gán vai mới.
UPDATE pty_role_type SET active = 0 WHERE code IN ('STAFF', 'SALES', 'GUIDE', 'AGENT');
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES
  ('DIRECTOR', 'Giám đốc', 10, 'INTERNAL'),
  ('OPERATIONS_MANAGER', 'Điều hành chung', 11, 'INTERNAL'),
  ('GUIDE_INTERNAL', 'Hướng dẫn viên nội bộ', 12, 'INTERNAL'),
  ('SALES_STAFF', 'Nhân viên kinh doanh', 13, 'INTERNAL'),
  ('INTERN', 'Thực tập sinh', 14, 'INTERNAL'),
  ('TRAVEL_AGENCY', 'Công ty lữ hành', 20, 'EXTERNAL'),
  ('GUIDE_FREELANCE', 'Hướng dẫn viên độc lập', 21, 'EXTERNAL'),
  ('HOTEL_RECEPTION', 'Lễ tân khách sạn', 22, 'EXTERNAL'),
  ('TAXI_DRIVER', 'Tài xế taxi', 23, 'EXTERNAL'),
  ('COLLABORATOR', 'Cộng tác viên', 24, 'EXTERNAL');

-- View công bố của parties: nhóm (nội bộ/bên ngoài) của các vai ĐANG MỞ (valid_to_date IS NULL) của mỗi hồ sơ. Chỉ khoá + nhãn nhóm.
-- Trigger LC-1 của module staff đọc view này (cạnh staff → parties đã có).
CREATE VIEW v_pty_open_role_group AS
  SELECT DISTINCT r.party_id, t.role_group
  FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
  WHERE r.valid_to_date IS NULL AND t.role_group IN ('INTERNAL', 'EXTERNAL');

-- LC-3: một hồ sơ không giữ CÙNG LÚC vai nội bộ và vai bên ngoài đang mở. Chỉ xét dòng MỞ: đổi nhóm = đóng dòng cũ rồi mở dòng mới
-- (kể cả trong cùng ngày). Chèn mới và mở lại (UPDATE valid_to_date → NULL) đều bị chặn.
CREATE TRIGGER pty_party_role_group_conflict_ins BEFORE INSERT ON pty_party_role
WHEN NEW.valid_to_date IS NULL AND EXISTS (
  SELECT 1 FROM pty_role_type nt, pty_party_role o JOIN pty_role_type ot ON ot.code = o.role_type_code
  WHERE nt.code = NEW.role_type_code AND nt.role_group IN ('INTERNAL', 'EXTERNAL')
    AND o.party_id = NEW.party_id AND o.valid_to_date IS NULL
    AND ot.role_group IN ('INTERNAL', 'EXTERNAL') AND ot.role_group <> nt.role_group)
BEGIN SELECT RAISE(ABORT, 'party_role_group_conflict: một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài'); END;
CREATE TRIGGER pty_party_role_group_conflict_upd BEFORE UPDATE ON pty_party_role
WHEN NEW.valid_to_date IS NULL AND EXISTS (
  SELECT 1 FROM pty_role_type nt, pty_party_role o JOIN pty_role_type ot ON ot.code = o.role_type_code
  WHERE nt.code = NEW.role_type_code AND nt.role_group IN ('INTERNAL', 'EXTERNAL')
    AND o.id <> NEW.id AND o.party_id = NEW.party_id AND o.valid_to_date IS NULL
    AND ot.role_group IN ('INTERNAL', 'EXTERNAL') AND ot.role_group <> nt.role_group)
BEGIN SELECT RAISE(ABORT, 'party_role_group_conflict: một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài'); END;

-- ---- Quyền (module staff) ---------------------------------------------------------------------------------------------------
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('INTERN', 'Thực tập', 'Thực tập sinh: lập đơn, xem và sửa đơn của mình; không thấy đơn người khác, không quản trị (ADR-0018)', 7);
UPDATE stf_permission_type SET name = 'Toàn quyền' WHERE code = 'SUPER_ADMIN';

-- Chỉnh quyền tay so với bộ mặc định của vai (ADR-0018 điều 3): cộng (ADD) hoặc bớt (REMOVE) một mã quyền, bắt buộc lý do, có hiệu lực.
-- direction là tập đóng ('ADD'/'REMOVE'), ép bằng CHECK ở cột (ADR-0003 điều 3); mỗi (tài khoản, mã quyền) tối đa một dòng đang mở.
CREATE TABLE stf_permission_adjustment (
  id                   TEXT PRIMARY KEY,
  staff_id             TEXT NOT NULL REFERENCES staff(id),
  permission_type_code TEXT NOT NULL REFERENCES stf_permission_type(code),
  direction            TEXT NOT NULL CHECK (direction IN ('ADD', 'REMOVE')),
  reason               TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 200),
  valid_from_at        TEXT NOT NULL,
  valid_to_at          TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT
);
CREATE INDEX stf_permission_adjustment_staff_ix ON stf_permission_adjustment(staff_id);
CREATE UNIQUE INDEX stf_permission_adjustment_open_uq ON stf_permission_adjustment(staff_id, permission_type_code) WHERE valid_to_at IS NULL;

-- LC-1: tài khoản mà hồ sơ đang mở vai bên ngoài chỉ được giữ quyền Đối tác. Chặn ở câu CHÈN quyền (mọi đường ghi quyền đều chèn dòng mới).
-- Tên KHÔNG mang tiền tố stf_/staff_ dù đặt trên bảng stf_permission: src/migrations-n1.test.ts coi mọi trigger tên staff_%/stf_% là trigger "siết" B5,
-- bị cấm xuất hiện trước lần phát hành 2; trigger này không siết mã cũ (lúc phát hành chưa hồ sơ nào giữ vai bên ngoài đang mở nên vế WHEN chưa từng đúng),
-- nên đặt tiền tố lc1_ để không rơi vào khuôn dò tên đó.
CREATE TRIGGER lc1_stf_permission_external_partner_only BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND NEW.permission_type_code <> 'PARTNER' AND EXISTS (
  SELECT 1 FROM staff s JOIN v_pty_open_role_group g ON g.party_id = s.party_id
  WHERE s.id = NEW.staff_id AND g.role_group = 'EXTERNAL')
BEGIN SELECT RAISE(ABORT, 'lc1_external_account_permission: tài khoản có vai bên ngoài chỉ giữ quyền Đối tác'); END;
