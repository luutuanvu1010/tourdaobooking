-- Migration 0032 — ADR-0040 D2 (accepted 2026-09-28): giấy tờ của NGƯỜI ở hồ sơ người (module parties). CHỈ THÊM. Không gieo dữ liệu cá nhân nào.
-- Ba bảng: danh mục loại giấy tờ của người + danh mục hạng giấy phép lái xe (Quản trị sửa trong app — khuôn loc_location: dấu vết, active, khoá lạc quan
-- updated_at, nhật ký cùng lô; khoá chính là mã) và giấy tờ của người.
-- Gia hạn = THÊM dòng mới trỏ previous_id về dòng cũ (không sửa đè); sửa sai = sửa DÒNG HIỆN HÀNH có lý do (danh sách đóng ở src/shared/giay-to.ts);
-- nhập nhầm cả dòng = đặt voided_at (không xoá). "Hiện hành" = chưa huỷ và không có dòng nối tiếp CHƯA huỷ.
-- Mã loại 'CCCD' và 'GPLX' là mã CỐ ĐỊNH (CHECK/trigger dưới đây và mã nguồn dựa vào chúng; đổi bằng ADR). Trigger chỉ đọc bảng của chính module
-- (Hiến chương 5.3); tên bắt đầu pty_ (không staff_/stf_ — src/migrations-n1.test.ts coi đó là trigger siết B5).

CREATE TABLE pty_person_document_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  has_expiry  INTEGER NOT NULL DEFAULT 1 CHECK (has_expiry IN (0, 1)),    -- 0: loại này không có ngày hết hạn; 1: có (để trống = không hạn)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO pty_person_document_type (code, name, has_expiry, sort_order, created_at, updated_at) VALUES
  ('CCCD', 'Căn cước công dân (CCCD)', 1, 1, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('GPLX', 'Giấy phép lái xe', 1, 2, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('HEALTH_CHECK', 'Khám sức khoẻ', 1, 3, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('TRANSPORT_TRAINING', 'Tập huấn nghiệp vụ vận tải', 1, 4, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');

-- Hạng giấy phép lái xe (ADR-0040 D2). Nghĩa của hạng (chở tối đa bao nhiêu khách) là luật của Vận chuyển, lượt 1b — KHÔNG ở đây.
-- Hạng cũ mang đuôi _OLD: hạng D mới và hạng D cũ khác nghĩa.
CREATE TABLE pty_license_class (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 1 AND 20),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO pty_license_class (code, name, sort_order, created_at, updated_at) VALUES
  ('B', 'Hạng B', 1, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('D1', 'Hạng D1', 2, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('D2', 'Hạng D2', 3, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('D', 'Hạng D', 4, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('B2_OLD', 'Hạng B2 (mẫu cũ)', 5, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('C_OLD', 'Hạng C (mẫu cũ)', 6, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('D_OLD', 'Hạng D (mẫu cũ)', 7, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('E_OLD', 'Hạng E (mẫu cũ)', 8, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');

-- Giấy tờ của người. Chỉ hồ sơ CÁ NHÂN (khoá ngoại tới pty_person). number_key = số đã chuẩn hoá (chữ HOA, bỏ khoảng trắng . - /) do máy chủ tính
-- (src/modules/parties/giay-to.ts). Số và nơi cấp là dữ liệu cá nhân: KHÔNG BAO GIỜ vào nhật ký, Bảng tin, thông báo (ADR-0040 D2).
CREATE TABLE pty_person_document (
  id                  TEXT PRIMARY KEY,
  party_id            TEXT NOT NULL REFERENCES pty_person(party_id),
  document_type_code  TEXT NOT NULL REFERENCES pty_person_document_type(code),
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 40),
  number_key          TEXT CHECK (number_key IS NULL OR (number_key = upper(number_key) AND length(number_key) BETWEEN 1 AND 40)),
  license_class_code  TEXT REFERENCES pty_license_class(code),
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) = issued_date),
  issued_place        TEXT CHECK (issued_place IS NULL OR length(trim(issued_place)) BETWEEN 1 AND 200),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) = expiry_date),     -- NULL = không hạn
  previous_id         TEXT REFERENCES pty_person_document(id),                                  -- dòng này GIA HẠN dòng nào
  voided_at           TEXT,                                                                      -- huỷ dòng nhập nhầm (không xoá)
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK ((document_number IS NULL) = (number_key IS NULL)),
  CHECK (document_number IS NOT NULL OR document_type_code NOT IN ('CCCD', 'GPLX')),
  CHECK ((document_type_code = 'GPLX') = (license_class_code IS NOT NULL)),                     -- hạng chỉ và bắt buộc với GPLX
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK (previous_id IS NULL OR previous_id <> id)
);
CREATE INDEX pty_person_document_party_ix ON pty_person_document(party_id);
CREATE INDEX pty_person_document_number_ix ON pty_person_document(document_type_code, number_key);
-- Một dòng có tối đa MỘT dòng gia hạn còn hiệu lực (không tách nhánh). Dòng gia hạn nhập nhầm bị huỷ thì dòng trước gia hạn lại được.
CREATE UNIQUE INDEX pty_person_document_next_uq ON pty_person_document(previous_id) WHERE previous_id IS NOT NULL AND voided_at IS NULL;

-- Không xoá (Hiến chương 5.5): nhập nhầm thì huỷ dòng.
CREATE TRIGGER pty_person_document_no_delete BEFORE DELETE ON pty_person_document
BEGIN SELECT RAISE(ABORT, 'person_document_no_delete: giấy tờ không xoá — nhập nhầm thì huỷ dòng'); END;
-- Không sửa đè giấy tờ đã có dòng gia hạn (ADR-0040 D1, D2).
CREATE TRIGGER pty_person_document_superseded BEFORE UPDATE ON pty_person_document
WHEN EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_superseded: giấy tờ đã có dòng gia hạn — không sửa đè'); END;
-- Dòng đã huỷ không sửa được (kể cả bỏ huỷ).
CREATE TRIGGER pty_person_document_voided BEFORE UPDATE ON pty_person_document
WHEN OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'person_document_voided: dòng đã huỷ — không sửa'); END;
-- Không chuyển giấy tờ sang người khác, không đổi loại, không đổi dòng trước, không đổi mốc tạo.
CREATE TRIGGER pty_person_document_identity BEFORE UPDATE ON pty_person_document
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.previous_id IS NOT OLD.previous_id OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'person_document_identity: không đổi người, loại, dòng trước, mốc tạo'); END;
-- Gia hạn nối đúng người, đúng loại, dòng trước chưa huỷ.
CREATE TRIGGER pty_person_document_renew_ins BEFORE INSERT ON pty_person_document
WHEN NEW.previous_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM pty_person_document p
  WHERE p.id = NEW.previous_id AND p.party_id = NEW.party_id AND p.document_type_code = NEW.document_type_code AND p.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_renew_mismatch: dòng gia hạn phải nối dòng chưa huỷ của cùng người, cùng loại'); END;
-- Một số CCCD thuộc đúng MỘT người (ADR-0040 D2; khuôn pty_party_role_group_conflict_ins của 0024). So party_id KHÁC nhau — không UNIQUE(loại, số)
-- phẳng, vì CCCD giữ số qua các lần cấp của CHÍNH người đó. Dòng đã huỷ không tính (nhập nhầm người thì huỷ rồi nhập lại cho đúng người).
CREATE TRIGGER pty_person_document_cccd_one_person_ins BEFORE INSERT ON pty_person_document
WHEN NEW.document_type_code = 'CCCD' AND NEW.voided_at IS NULL AND EXISTS (
  SELECT 1 FROM pty_person_document o
  WHERE o.document_type_code = 'CCCD' AND o.number_key = NEW.number_key AND o.party_id <> NEW.party_id AND o.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_cccd_other_person: số CCCD này đã thuộc một hồ sơ khác'); END;
CREATE TRIGGER pty_person_document_cccd_one_person_upd BEFORE UPDATE OF number_key ON pty_person_document
WHEN NEW.document_type_code = 'CCCD' AND NEW.voided_at IS NULL AND EXISTS (
  SELECT 1 FROM pty_person_document o
  WHERE o.id <> NEW.id AND o.document_type_code = 'CCCD' AND o.number_key = NEW.number_key AND o.party_id <> NEW.party_id AND o.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_cccd_other_person: số CCCD này đã thuộc một hồ sơ khác'); END;
