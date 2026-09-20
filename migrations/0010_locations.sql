-- Migration 0010 — địa điểm (module locations). Đặc tả N1 (docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md), ADR-0001/0002/0003/0005/0008.
-- Nguồn: mục 1 của docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (bộ kiểm SQLite đã chạy). Chỉ THÊM — mã cũ vẫn chạy nguyên vẹn (expand–contract).

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

INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES
  ('d4b573d1-872e-411c-a648-2695c53b0997', 'VP_TRAN_PHU', 'Văn phòng Trần Phú', 'OFFICE', 1, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('3e0c3a7a-d489-4c43-8d05-8dd9a1e4ed12', 'VP_2_THANG_4', 'Văn phòng 2 tháng 4', 'OFFICE', 2, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('6f335462-244c-497f-b689-f46d25278fff', 'QUAY_VE_01', 'Quầy vé 01', 'TICKET_COUNTER', 3, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('8f62bcba-f659-479e-be86-089f63c3f597', 'QUAY_VE_02', 'Quầy vé 02', 'TICKET_COUNTER', 4, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('2e863e6c-fdb5-4907-be7d-496fac57bf3a', 'QUAY_VE_03', 'Quầy vé 03', 'TICKET_COUNTER', 5, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('47e10502-9ed5-4bcb-a433-a830f8ba69ee', 'QUAY_VE_04', 'Quầy vé 04', 'TICKET_COUNTER', 6, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('a941dd7d-faab-4098-9ab9-1df7fa6dd551', 'BEN_TAU_NHA_TRANG', 'Bến tàu du lịch Nha Trang', 'PIER', 7, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('ec67ff94-bb00-4546-842a-aedb5f916b0a', 'CANG_VINPEARL', 'Bến cảng Vinpearl', 'PORT', 8, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z');

-- View công bố (ADR-0002 điều 3): khoá + nhãn + cờ trạng thái tối thiểu, chỉ đọc.
CREATE VIEW v_loc_location_label AS
  SELECT id, code, name, location_type_code, active FROM loc_location;
