-- Migration 0011 — hồ sơ, liên hệ, vai trò, quan hệ (module parties). Đặc tả N1 (docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md), ADR-0001/0002/0003/0005/0008.
-- Nguồn: mục 2 của docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (bộ kiểm SQLite đã chạy). Chỉ THÊM — mã cũ vẫn chạy nguyên vẹn (expand–contract).

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
