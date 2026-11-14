-- ADR-0147 Đ1 (kế hoạch Phí đưa đón, Đợt A, Task 1): «khu vực đón» của module locations. Bảng tra cứu loc_zone + cột loc_location.zone_code (trống = chưa xếp vùng)
-- + hai view công bố cho module khác đọc. Địa điểm hiện có để zone_code trống; view v_loc_location_zone quy trống về NGOAI_VUNG (thiếu vùng không bao giờ là «miễn phí»).
-- KHÔNG đổi v_loc_location_label (nhiều module đọc view đó; tiền lệ 0091): thêm view MỚI thay vì sửa view cũ.
-- Số 0164: main dừng ở 0162, nhánh ADR-0199 giữ 0163.
-- HOÀN TÁC: D1 không có bước «down». Muốn gỡ thì migration SAU: DROP VIEW hai view này; mã đọc view phải bỏ ở bản phát hành TRƯỚC (expand–contract hai lần phát hành);
-- cột zone_code và bảng loc_zone chỉ ngừng dùng, không xoá cứng. Áp migration TRƯỚC khi triển khai mã đọc view.
CREATE TABLE loc_zone (
  code TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

INSERT INTO loc_zone (code, name, sort_order, active, created_at, updated_at)
VALUES ('NGOAI_VUNG', 'Ngoài khu vực', 999, 1, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z');

ALTER TABLE loc_location ADD COLUMN zone_code TEXT REFERENCES loc_zone(code);

CREATE TRIGGER loc_zone_no_delete BEFORE DELETE ON loc_zone
BEGIN
  SELECT RAISE(ABORT, 'loc_zone_append_only: không xoá khu vực đón, chỉ ngưng dùng.');
END;

CREATE TRIGGER loc_zone_ngoai_vung_luon_bat BEFORE UPDATE OF active ON loc_zone
WHEN OLD.code = 'NGOAI_VUNG' AND NEW.active = 0
BEGIN
  SELECT RAISE(ABORT, 'loc_zone_ngoai_vung_luon_bat: khu vực NGOAI_VUNG luôn bật.');
END;

CREATE TRIGGER loc_zone_con_dia_diem BEFORE UPDATE OF active ON loc_zone
WHEN NEW.active = 0 AND EXISTS (SELECT 1 FROM loc_location WHERE zone_code = OLD.code)
BEGIN
  SELECT RAISE(ABORT, 'loc_zone_con_dia_diem: khu vực còn địa điểm, không ngưng được.');
END;

CREATE TRIGGER loc_location_zone_dang_bat_ins BEFORE INSERT ON loc_location
WHEN NEW.zone_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM loc_zone WHERE code = NEW.zone_code AND active = 1)
BEGIN
  SELECT RAISE(ABORT, 'loc_location_zone_dang_bat: khu vực đã ngưng, không gán cho địa điểm.');
END;

CREATE TRIGGER loc_location_zone_dang_bat_upd BEFORE UPDATE OF zone_code ON loc_location
WHEN NEW.zone_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM loc_zone WHERE code = NEW.zone_code AND active = 1)
BEGIN
  SELECT RAISE(ABORT, 'loc_location_zone_dang_bat: khu vực đã ngưng, không gán cho địa điểm.');
END;

CREATE VIEW v_loc_location_zone AS
  SELECT id AS location_id, COALESCE(zone_code, 'NGOAI_VUNG') AS zone_code FROM loc_location;

CREATE VIEW v_loc_zone_label AS
  SELECT code, name, active FROM loc_zone;
