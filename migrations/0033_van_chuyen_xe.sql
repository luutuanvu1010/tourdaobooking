-- Migration 0033 — ADR-0040 D1 (accepted 2026-09-28): phân hệ Vận chuyển, lượt 1a — module van-chuyen (tiền tố vc_). CHỈ THÊM.
-- Xe (thực thể có vòng đời), giấy tờ xe (do bên ngoài cấp; gia hạn = dòng mới, không sửa đè), danh mục loại giấy tờ xe (Quản trị sửa trong app — khuôn
-- loc_location: dấu vết, active, khoá lạc quan, nhật ký cùng lô; khoá chính là mã), chính sách ngưỡng "sắp hết hạn" (dòng có ngày hiệu lực, CHỈ THÊM —
-- Hiến chương 5.2; chỉ Toàn quyền đổi, ô settings.ops). Trigger chỉ đọc bảng vc_ (Hiến chương 5.3). Không có dữ liệu cá nhân nào ở đây.

CREATE TABLE vc_vehicle_document_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  has_expiry  INTEGER NOT NULL DEFAULT 1 CHECK (has_expiry IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
-- Giá trị mặc định: dữ liệu tra ngày 27/9 (thiết kế §10), sửa được trong app.
INSERT INTO vc_vehicle_document_type (code, name, has_expiry, sort_order, created_at, updated_at) VALUES
  ('REGISTRATION', 'Đăng ký xe', 0, 1, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('INSPECTION', 'Kiểm định', 1, 2, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('TPL_INSURANCE', 'Bảo hiểm trách nhiệm dân sự', 1, 3, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('CONTRACT_BADGE', 'Phù hiệu xe hợp đồng', 1, 4, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('TRIP_MONITOR', 'Giám sát hành trình', 1, 5, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('DRIVER_CAMERA', 'Camera người lái', 1, 6, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');

-- Xe. Biển số: duy nhất trong các xe CHƯA NGỪNG (xe bảo dưỡng vẫn giữ biển); số khung: định danh bền (máy chủ bắt buộc — câu hỏi Q2; cột để NULL được
-- để đổi luật không phải dựng lại bảng). passenger_capacity = số người được chở KHÔNG kể tài xế (giấy cũ ghi 16 chỗ thì nhập 15). Chủ xe = khoá tới
-- hồ sơ (lượt 1a: hồ sơ công ty chủ lúc thêm xe; đổi công ty chủ sau này KHÔNG tự đổi chủ xe — ADR-0040 D1). Trạng thái: tập ĐÓNG (đổi bằng ADR).
CREATE TABLE vc_vehicle (
  id                  TEXT PRIMARY KEY,
  plate_number        TEXT NOT NULL CHECK (length(trim(plate_number)) BETWEEN 4 AND 20),
  plate_key           TEXT NOT NULL CHECK (plate_key = upper(plate_key) AND length(plate_key) BETWEEN 4 AND 20),
  chassis_number      TEXT CHECK (chassis_number IS NULL OR length(trim(chassis_number)) BETWEEN 5 AND 30),
  chassis_key         TEXT CHECK (chassis_key IS NULL OR (chassis_key = upper(chassis_key) AND length(chassis_key) BETWEEN 5 AND 30)),
  name                TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  model_year          INTEGER CHECK (model_year IS NULL OR model_year BETWEEN 1950 AND 2100),
  passenger_capacity  INTEGER NOT NULL CHECK (passenger_capacity BETWEEN 1 AND 100),
  owner_party_id      TEXT NOT NULL REFERENCES pty_party(id),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  valid_from_date     TEXT NOT NULL CHECK (date(valid_from_date) = valid_from_date),
  valid_to_date       TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) = valid_to_date AND valid_to_date >= valid_from_date)),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK ((chassis_number IS NULL) = (chassis_key IS NULL)),
  CHECK ((status = 'retired') = (valid_to_date IS NOT NULL))
);
-- Biển số duy nhất trong xe CHƯA NGỪNG. "Dùng lại xe" (Ngừng → Đang dùng) cũng vấp chỉ mục này nếu biển đã thuộc xe khác chưa ngừng — lớp CSDL; máy chủ
-- còn kiểm trước khi ghi (lớp route, mã lỗi khác — Ruling R15 điểm 1 của điều phối).
CREATE UNIQUE INDEX vc_vehicle_plate_open_uq ON vc_vehicle(plate_key) WHERE status <> 'retired';
CREATE UNIQUE INDEX vc_vehicle_chassis_uq ON vc_vehicle(chassis_key) WHERE chassis_key IS NOT NULL;
CREATE INDEX vc_vehicle_owner_ix ON vc_vehicle(owner_party_id);
CREATE TRIGGER vc_vehicle_no_delete BEFORE DELETE ON vc_vehicle
BEGIN SELECT RAISE(ABORT, 'vehicle_no_delete: xe không xoá — chuyển sang Ngừng dùng'); END;

-- Giấy tờ xe. Số không che (không phải dữ liệu cá nhân — ADR-0040 D2 chỉ nói giấy tờ của người). Cùng khuôn gia hạn / huỷ dòng như giấy tờ của người.
CREATE TABLE vc_vehicle_document (
  id                  TEXT PRIMARY KEY,
  vehicle_id          TEXT NOT NULL REFERENCES vc_vehicle(id),
  document_type_code  TEXT NOT NULL REFERENCES vc_vehicle_document_type(code),
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 60),
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) = issued_date),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) = expiry_date),
  previous_id         TEXT REFERENCES vc_vehicle_document(id),
  voided_at           TEXT,
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK (previous_id IS NULL OR previous_id <> id)
);
CREATE INDEX vc_vehicle_document_vehicle_ix ON vc_vehicle_document(vehicle_id);
CREATE UNIQUE INDEX vc_vehicle_document_next_uq ON vc_vehicle_document(previous_id) WHERE previous_id IS NOT NULL AND voided_at IS NULL;
CREATE TRIGGER vc_vehicle_document_no_delete BEFORE DELETE ON vc_vehicle_document
BEGIN SELECT RAISE(ABORT, 'vehicle_document_no_delete: giấy tờ xe không xoá — nhập nhầm thì huỷ dòng'); END;
CREATE TRIGGER vc_vehicle_document_superseded BEFORE UPDATE ON vc_vehicle_document
WHEN EXISTS (SELECT 1 FROM vc_vehicle_document n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'vehicle_document_superseded: giấy tờ đã có dòng gia hạn — không sửa đè'); END;
CREATE TRIGGER vc_vehicle_document_voided BEFORE UPDATE ON vc_vehicle_document
WHEN OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'vehicle_document_voided: dòng đã huỷ — không sửa'); END;
CREATE TRIGGER vc_vehicle_document_identity BEFORE UPDATE ON vc_vehicle_document
WHEN NEW.id IS NOT OLD.id OR NEW.vehicle_id IS NOT OLD.vehicle_id OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.previous_id IS NOT OLD.previous_id OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vehicle_document_identity: không đổi xe, loại, dòng trước, mốc tạo'); END;
CREATE TRIGGER vc_vehicle_document_renew_ins BEFORE INSERT ON vc_vehicle_document
WHEN NEW.previous_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM vc_vehicle_document p
  WHERE p.id = NEW.previous_id AND p.vehicle_id = NEW.vehicle_id AND p.document_type_code = NEW.document_type_code AND p.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'vehicle_document_renew_mismatch: dòng gia hạn phải nối dòng chưa huỷ của cùng xe, cùng loại'); END;

-- Ngưỡng "sắp hết hạn" (số ngày) — chính sách có ngày hiệu lực (ADR-0040 D1; Hiến chương 5.2). Dòng hiệu lực = valid_from_at mới nhất ≤ bây giờ.
-- CHỈ THÊM: đổi = chèn dòng mới (máy chủ đặt valid_from_at = bây giờ, không lùi); không sửa, không xoá.
CREATE TABLE vc_expiry_policy (
  id             TEXT PRIMARY KEY,
  warn_days      INTEGER NOT NULL CHECK (warn_days BETWEEN 1 AND 365),
  valid_from_at  TEXT NOT NULL UNIQUE,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
INSERT INTO vc_expiry_policy (id, warn_days, valid_from_at, created_at, updated_at) VALUES
  ('5d6f216c-d03c-4d0a-a669-736e33dae350', 30, '2026-09-01T00:00:00.000Z', '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');
CREATE TRIGGER vc_expiry_policy_no_update BEFORE UPDATE ON vc_expiry_policy
BEGIN SELECT RAISE(ABORT, 'expiry_policy_append_only: chính sách chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER vc_expiry_policy_no_delete BEFORE DELETE ON vc_expiry_policy
BEGIN SELECT RAISE(ABORT, 'expiry_policy_append_only: chính sách không xoá'); END;
