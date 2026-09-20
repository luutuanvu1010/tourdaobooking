-- ============================================================================================================
-- N1 — Nền danh tính: DDL THAM CHIẾU (không phải migration).
-- Đặc tả: docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md. ADR: 0001, 0002, 0003, 0005, 0008.
-- Đã chạy thử trên SQLite trên schema thật (migrations 0001–0008) bằng docs/superpowers/specs/2026-09-20-n1-schema-verify.py.
-- Khi thi công, tách thành migration đánh số 0009…0013 (đặc tả N1 §9: 0009 = mục 0, 0010 = mục 1, 0011 = mục 2, 0012 = mục 3 + 4, 0013 = trigger 'siết'); id của dòng gieo (seed) sinh MỘT lần và cố định trong tệp migration.
-- Quy ước (ADR-0003): tiền tố module; bảng tra cứu khoá mã TEXT; cột WHO (created_by, updated_by) TEXT NULL KHÔNG khoá ngoại;
-- ngày dân sự *_date (YYYY-MM-DD giờ VN), thời điểm máy *_at (ISO-8601 UTC); không xoá cứng; NO ACTION mặc định; cấm CASCADE.
-- ============================================================================================================

-- ------------------------------------------------------------------------------------------------------------
-- 0. orders: view công bố nhãn đơn (module `orders` chủ sở hữu) — để `audit` bỏ JOIN thẳng bảng `orders` (ADR-0002 điều 6, điều 3)
-- ------------------------------------------------------------------------------------------------------------
CREATE VIEW v_ord_order_label AS
  SELECT id, order_code FROM orders;

-- ------------------------------------------------------------------------------------------------------------
-- 1. locations (module `locations`, lá của đồ thị) — ADR-0002, ADR-0008
-- ------------------------------------------------------------------------------------------------------------
CREATE TABLE loc_location_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO loc_location_type (code, name, sort_order) VALUES
  ('OFFICE', 'Văn phòng', 1), ('TICKET_COUNTER', 'Quầy vé', 2), ('PIER', 'Bến tàu', 3), ('PORT', 'Bến cảng', 4);

CREATE TABLE loc_location (
  id                 TEXT PRIMARY KEY,
  code               TEXT NOT NULL UNIQUE CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 40),
  name               TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  location_type_code TEXT NOT NULL REFERENCES loc_location_type(code),
  address            TEXT CHECK (address IS NULL OR length(address) <= 300),
  sort_order         INTEGER NOT NULL DEFAULT 0,
  active             INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at         TEXT NOT NULL,
  created_by         TEXT,
  updated_at         TEXT NOT NULL,
  updated_by         TEXT
);
CREATE INDEX loc_location_type_ix ON loc_location(location_type_code);

INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at)
SELECT lower(hex(randomblob(16))), v.code, v.name, v.type, v.ord, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
  SELECT 'VP_TRAN_PHU' AS code, 'Văn phòng Trần Phú' AS name, 'OFFICE' AS type, 1 AS ord UNION ALL
  SELECT 'VP_2_THANG_4', 'Văn phòng 2 tháng 4', 'OFFICE', 2 UNION ALL
  SELECT 'QUAY_VE_01', 'Quầy vé 01', 'TICKET_COUNTER', 3 UNION ALL
  SELECT 'QUAY_VE_02', 'Quầy vé 02', 'TICKET_COUNTER', 4 UNION ALL
  SELECT 'QUAY_VE_03', 'Quầy vé 03', 'TICKET_COUNTER', 5 UNION ALL
  SELECT 'QUAY_VE_04', 'Quầy vé 04', 'TICKET_COUNTER', 6 UNION ALL
  SELECT 'BEN_TAU_NHA_TRANG', 'Bến tàu du lịch Nha Trang', 'PIER', 7 UNION ALL
  SELECT 'CANG_VINPEARL', 'Bến cảng Vinpearl', 'PORT', 8
) v;

-- View công bố (ADR-0002 điều 3): khoá + nhãn + cờ trạng thái tối thiểu, chỉ đọc.
CREATE VIEW v_loc_location_label AS
  SELECT id, code, name, location_type_code, active FROM loc_location;

-- ------------------------------------------------------------------------------------------------------------
-- 2. parties (module `parties`, phụ thuộc `locations`) — ADR-0001, ADR-0008
-- ------------------------------------------------------------------------------------------------------------
CREATE TABLE pty_party (
  id           TEXT PRIMARY KEY,
  party_kind   TEXT NOT NULL CHECK (party_kind IN ('PERSON', 'ORGANIZATION')),          -- tập ĐÓNG (ADR-0003 điều 3)
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 200),      -- do module `parties` duy trì (PERSON: ghép từ pty_person)
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT
);
CREATE INDEX pty_party_name_ix ON pty_party(display_name COLLATE NOCASE);

CREATE TABLE pty_person (
  party_id    TEXT PRIMARY KEY REFERENCES pty_party(id),
  family_name TEXT CHECK (family_name IS NULL OR length(trim(family_name)) BETWEEN 1 AND 60),   -- họ
  middle_name TEXT CHECK (middle_name IS NULL OR length(trim(middle_name)) BETWEEN 1 AND 100),  -- tên đệm
  given_name  TEXT NOT NULL CHECK (length(trim(given_name)) BETWEEN 1 AND 60),                  -- tên (khoá sắp xếp kiểu Việt Nam)
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE INDEX pty_person_given_ix ON pty_person(given_name COLLATE NOCASE);

CREATE TABLE pty_organization (
  party_id      TEXT PRIMARY KEY REFERENCES pty_party(id),
  legal_name    TEXT CHECK (legal_name IS NULL OR length(trim(legal_name)) BETWEEN 1 AND 300),
  tax_code      TEXT CHECK (tax_code IS NULL OR length(tax_code) BETWEEN 10 AND 14),           -- mã số thuế (chuẩn hoá: chữ số, có thể có dấu '-')
  address       TEXT CHECK (address IS NULL OR length(address) <= 300),
  invoice_email TEXT CHECK (invoice_email IS NULL OR length(invoice_email) <= 200),
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);

CREATE TABLE pty_contact_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO pty_contact_kind (code, name, sort_order) VALUES ('PHONE', 'Số điện thoại', 1), ('EMAIL', 'Email', 2);

CREATE TABLE pty_contact_point (
  id                TEXT PRIMARY KEY,
  party_id          TEXT NOT NULL REFERENCES pty_party(id),
  contact_kind_code TEXT NOT NULL REFERENCES pty_contact_kind(code),
  value             TEXT NOT NULL CHECK (length(trim(value)) BETWEEN 1 AND 200),
  value_normalized  TEXT NOT NULL CHECK (length(value_normalized) BETWEEN 1 AND 200),
  label             TEXT CHECK (label IS NULL OR length(label) <= 50),                           -- ghi chú ngắn: "Zalo", "Hotline"…
  is_primary        INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  valid_from_date   TEXT NOT NULL CHECK (date(valid_from_date) = valid_from_date),
  valid_to_date     TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) = valid_to_date AND valid_to_date >= valid_from_date)),
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
CREATE INDEX pty_contact_party_ix  ON pty_contact_point(party_id);
CREATE INDEX pty_contact_lookup_ix ON pty_contact_point(contact_kind_code, value_normalized);     -- KHÔNG duy nhất (ADR-0001 mục 8)
CREATE UNIQUE INDEX pty_contact_primary_uq ON pty_contact_point(party_id, contact_kind_code)
  WHERE is_primary = 1 AND valid_to_date IS NULL;                                                  -- tối đa một liên hệ chính đang mở

CREATE TABLE pty_role_type (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO pty_role_type (code, name, sort_order) VALUES
  ('STAFF', 'Nhân sự', 1), ('SALES', 'Bán hàng', 2), ('ACCOUNTANT', 'Kế toán', 3), ('GUIDE', 'Hướng dẫn viên', 4),
  ('BOAT_CAPTAIN', 'Lái cano', 5), ('DRIVER', 'Tài xế', 6), ('AGENT', 'Đại lý', 7), ('CUSTOMER', 'Khách hàng', 8);

CREATE TABLE pty_party_role (
  id              TEXT PRIMARY KEY,
  party_id        TEXT NOT NULL REFERENCES pty_party(id),
  role_type_code  TEXT NOT NULL REFERENCES pty_role_type(code),
  location_id     TEXT REFERENCES loc_location(id),                                              -- ADR-0008: cạnh parties → locations
  valid_from_date TEXT NOT NULL CHECK (date(valid_from_date) = valid_from_date),
  valid_to_date   TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) = valid_to_date AND valid_to_date >= valid_from_date)),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
CREATE INDEX pty_party_role_party_ix ON pty_party_role(party_id);
CREATE INDEX pty_party_role_where_ix ON pty_party_role(role_type_code, location_id);
CREATE UNIQUE INDEX pty_party_role_open_uq ON pty_party_role(party_id, role_type_code, IFNULL(location_id, ''))
  WHERE valid_to_date IS NULL;                                                                    -- tối đa một dòng MỞ (ADR-0003 điều 7)
-- Chống chồng lấn khoảng ĐÃ ĐÓNG: bắt buộc trigger (chỉ mục có điều kiện không làm được).
CREATE TRIGGER pty_party_role_no_overlap_ins BEFORE INSERT ON pty_party_role
WHEN EXISTS (SELECT 1 FROM pty_party_role o
             WHERE o.party_id = NEW.party_id AND o.role_type_code = NEW.role_type_code AND IFNULL(o.location_id, '') = IFNULL(NEW.location_id, '')
               AND NOT (COALESCE(NEW.valid_to_date, '9999-12-31') < o.valid_from_date OR NEW.valid_from_date > COALESCE(o.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'party_role_overlap: vai trò cùng nơi bị chồng lấn thời gian'); END;
CREATE TRIGGER pty_party_role_no_overlap_upd BEFORE UPDATE ON pty_party_role
WHEN EXISTS (SELECT 1 FROM pty_party_role o
             WHERE o.id <> NEW.id AND o.party_id = NEW.party_id AND o.role_type_code = NEW.role_type_code AND IFNULL(o.location_id, '') = IFNULL(NEW.location_id, '')
               AND NOT (COALESCE(NEW.valid_to_date, '9999-12-31') < o.valid_from_date OR NEW.valid_from_date > COALESCE(o.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'party_role_overlap: vai trò cùng nơi bị chồng lấn thời gian'); END;

CREATE TABLE pty_relationship_type (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO pty_relationship_type (code, name, sort_order) VALUES ('CONTACT_OF', 'Người liên hệ của', 1);

CREATE TABLE pty_party_relationship (
  id                     TEXT PRIMARY KEY,
  from_party_id          TEXT NOT NULL REFERENCES pty_party(id),                                -- chủ thể (vd người liên hệ)
  to_party_id            TEXT NOT NULL REFERENCES pty_party(id),                                -- đối tượng (vd tổ chức/đại lý)
  relationship_type_code TEXT NOT NULL REFERENCES pty_relationship_type(code),
  valid_from_date        TEXT NOT NULL CHECK (date(valid_from_date) = valid_from_date),
  valid_to_date          TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) = valid_to_date AND valid_to_date >= valid_from_date)),
  created_at             TEXT NOT NULL,
  created_by             TEXT,
  updated_at             TEXT NOT NULL,
  updated_by             TEXT,
  CHECK (from_party_id <> to_party_id)
);
CREATE INDEX pty_relationship_to_ix ON pty_party_relationship(to_party_id);
CREATE UNIQUE INDEX pty_relationship_open_uq ON pty_party_relationship(from_party_id, to_party_id, relationship_type_code)
  WHERE valid_to_date IS NULL;
CREATE TRIGGER pty_relationship_no_overlap_ins BEFORE INSERT ON pty_party_relationship
WHEN EXISTS (SELECT 1 FROM pty_party_relationship o
             WHERE o.from_party_id = NEW.from_party_id AND o.to_party_id = NEW.to_party_id AND o.relationship_type_code = NEW.relationship_type_code
               AND NOT (COALESCE(NEW.valid_to_date, '9999-12-31') < o.valid_from_date OR NEW.valid_from_date > COALESCE(o.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'party_relationship_overlap: quan hệ bị chồng lấn thời gian'); END;
CREATE TRIGGER pty_relationship_no_overlap_upd BEFORE UPDATE ON pty_party_relationship
WHEN EXISTS (SELECT 1 FROM pty_party_relationship o
             WHERE o.id <> NEW.id AND o.from_party_id = NEW.from_party_id AND o.to_party_id = NEW.to_party_id AND o.relationship_type_code = NEW.relationship_type_code
               AND NOT (COALESCE(NEW.valid_to_date, '9999-12-31') < o.valid_from_date OR NEW.valid_from_date > COALESCE(o.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'party_relationship_overlap: quan hệ bị chồng lấn thời gian'); END;

-- `sort_key` = nhãn dùng để SẮP XẾP (quy tắc thứ tự tên kiểu Việt Nam nằm ở MỘT chỗ, do module chủ `parties` giữ): PERSON → tên, họ, đệm;
-- tổ chức → tên gọi. LEFT JOIN để một hồ sơ PERSON thiếu dòng pty_person (vi phạm R-N1-2) vẫn không làm rơi dòng.
CREATE VIEW v_pty_party_label AS
  SELECT p.id, p.display_name, p.party_kind, p.active,
         CASE p.party_kind
           WHEN 'PERSON' THEN COALESCE(trim(pe.given_name || ' ' || COALESCE(pe.family_name || ' ', '') || COALESCE(pe.middle_name, '')), p.display_name)
           ELSE p.display_name
         END AS sort_key
  FROM pty_party p LEFT JOIN pty_person pe ON pe.party_id = p.id;

-- ------------------------------------------------------------------------------------------------------------
-- 3. staff: quyền app đa trị + trỏ hồ sơ (module `staff`, phụ thuộc `parties`) — ADR-0005 (KHÔNG dựng lại `staff`)
-- ------------------------------------------------------------------------------------------------------------
CREATE TABLE stf_permission_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code)),
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('SALES', 'Bán hàng', 'Lập và sửa đơn của mình, ghi thu tiền cho đơn của mình', 1),
  ('ACCOUNTING', 'Kế toán', 'Ghi thu/hoàn tiền, sửa tiền sau xác nhận, đánh dấu hoá đơn', 2),
  ('ADMIN', 'Quản trị', 'Mọi thao tác; quản lý tài khoản, quyền, địa điểm, danh mục, hồ sơ', 3),
  ('FIELD', 'Thực hiện', 'Xem và cập nhật việc được giao; không thấy tiền', 4);

CREATE TABLE stf_permission (
  id                   TEXT PRIMARY KEY,
  staff_id             TEXT NOT NULL REFERENCES staff(id),
  permission_type_code TEXT NOT NULL REFERENCES stf_permission_type(code),
  valid_from_at        TEXT NOT NULL,
  valid_to_at          TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT
);
CREATE INDEX stf_permission_staff_ix ON stf_permission(staff_id);
CREATE UNIQUE INDEX stf_permission_open_uq ON stf_permission(staff_id, permission_type_code) WHERE valid_to_at IS NULL;

-- Bất biến "luôn còn ít nhất một quản trị viên hoạt động" — lưới cuối ở CSDL (câu UPDATE có điều kiện ở mã vẫn là lớp chính).
CREATE TRIGGER stf_permission_keep_admin_upd BEFORE UPDATE OF valid_to_at ON stf_permission
WHEN OLD.permission_type_code = 'ADMIN' AND OLD.valid_to_at IS NULL AND NEW.valid_to_at IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM stf_permission p JOIN staff s ON s.id = p.staff_id
                 WHERE p.permission_type_code = 'ADMIN' AND p.valid_to_at IS NULL AND p.id <> OLD.id AND s.active = 1)
BEGIN SELECT RAISE(ABORT, 'last_admin: phải còn ít nhất một quản trị viên hoạt động'); END;
CREATE TRIGGER staff_keep_admin_upd BEFORE UPDATE OF active ON staff
WHEN OLD.active = 1 AND NEW.active = 0
 AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = OLD.id AND p.permission_type_code = 'ADMIN' AND p.valid_to_at IS NULL)
 AND NOT EXISTS (SELECT 1 FROM stf_permission p JOIN staff s ON s.id = p.staff_id
                 WHERE p.permission_type_code = 'ADMIN' AND p.valid_to_at IS NULL AND s.id <> OLD.id AND s.active = 1)
BEGIN SELECT RAISE(ABORT, 'last_admin: phải còn ít nhất một quản trị viên hoạt động'); END;

-- Trỏ hồ sơ: thêm cột (KHÔNG dựng lại bảng). NOT NULL được thi hành bằng trigger sau khi backfill.
ALTER TABLE staff ADD COLUMN party_id TEXT REFERENCES pty_party(id);
CREATE UNIQUE INDEX staff_party_uq ON staff(party_id) WHERE party_id IS NOT NULL;                -- một hồ sơ tối đa một tài khoản

-- LEFT JOIN có chủ ý: tài khoản do mã cũ tạo trong khoảng giữa hai lần triển khai chưa có party_id; INNER JOIN sẽ làm biến mất
-- đơn của họ khỏi danh sách đơn và họ khỏi trang Nhân sự (đặc tả N1 §9). Nhãn dự phòng hiện rõ để quản trị viên thấy và xử lý.
CREATE VIEW v_stf_staff_label AS
  SELECT s.id, COALESCE(p.display_name, '(chưa có hồ sơ)') AS label, s.active, s.party_id
  FROM staff s LEFT JOIN pty_party p ON p.id = s.party_id;

-- ------------------------------------------------------------------------------------------------------------
-- 4. BACKFILL cho dữ liệu `staff` hiện có (chạy TRƯỚC khi tạo trigger bắt buộc party_id)
-- ------------------------------------------------------------------------------------------------------------
-- 4.1 Một hồ sơ PERSON cho mỗi tài khoản (id xác định: 'pty-' || staff.id; tên nguyên văn từ staff.full_name).
INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at)
SELECT 'pty-' || s.id, 'PERSON', trim(s.full_name), s.active, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM staff s;

-- 4.2 Tách họ / tên đệm / tên: tên = từ cuối; họ = từ đầu (nếu có ≥ 2 từ); tên đệm = phần giữa.
INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at)
SELECT 'pty-' || t.id,
       CASE WHEN instr(t.head, ' ') > 0 THEN substr(t.head, 1, instr(t.head, ' ') - 1) ELSE NULLIF(t.head, '') END,
       CASE WHEN instr(t.head, ' ') > 0 THEN NULLIF(trim(substr(t.head, instr(t.head, ' ') + 1)), '') END,
       t.given,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (SELECT s.id AS id,
             trim(substr(trim(s.full_name), length(rtrim(trim(s.full_name), replace(trim(s.full_name), ' ', ''))) + 1)) AS given,
             trim(rtrim(trim(s.full_name), replace(trim(s.full_name), ' ', ''))) AS head
      FROM staff s) t;

-- 4.3 Vai trò hồ sơ STAFF (không gắn nơi), hiệu lực từ ngày tạo tài khoản (giờ Việt Nam).
INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
SELECT 'ptr-' || s.id, 'pty-' || s.id, 'STAFF', NULL, date(s.created_at, '+7 hours'),
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM staff s;

-- 4.4 Quyền app: sales → SALES, admin → ADMIN (ADR-0005 bước 1; quản trị không cần kèm SALES — ADR-0007).
INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
SELECT 'stp-' || s.id, s.id, CASE s.role WHEN 'admin' THEN 'ADMIN' ELSE 'SALES' END,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM staff s;

-- 4.5 Trỏ tài khoản tới hồ sơ.
UPDATE staff SET party_id = 'pty-' || id WHERE party_id IS NULL;

-- 4.6 Bắt buộc party_id từ đây (ADR-0005 bước 2): trigger idiom của 0007 (SQLite không thêm NOT NULL bằng ADD COLUMN).
CREATE TRIGGER staff_party_required_ins BEFORE INSERT ON staff WHEN NEW.party_id IS NULL
BEGIN SELECT RAISE(ABORT, 'staff_party: tài khoản phải trỏ một hồ sơ'); END;
CREATE TRIGGER staff_party_required_upd BEFORE UPDATE ON staff WHEN NEW.party_id IS NULL
BEGIN SELECT RAISE(ABORT, 'staff_party: tài khoản phải trỏ một hồ sơ'); END;
