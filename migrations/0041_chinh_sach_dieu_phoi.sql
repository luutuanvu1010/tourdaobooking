-- Migration 0041 — ADR-0049 D2 (accepted 2026-09-29): CHÍNH SÁCH ĐIỀU PHỐI của phân hệ Vận chuyển, lát 1.1 (kế hoạch
-- docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md mục 1.3). Module van-chuyen (tiền tố vc_). CHỈ THÊM. Không dữ liệu cá nhân.
-- Bốn bảng, khuôn vc_expiry_policy (0033): chính sách có ngày hiệu lực (Hiến chương 5.2 — dòng hiệu lực = valid_from_at mới nhất ≤ bây giờ; đổi = chèn
-- dòng mới, máy chủ đặt valid_from_at = lúc ghi, không lùi ngày), điều kiện xuất bến theo cỡ xe (thêm và ĐÓNG hiệu lực một lần), bảng hạng bằng → số khách
-- (chỉ thêm), danh mục lý do (Quản trị sửa trong app — khuôn loc_location; khoá chính là mã; ngưng = active 0).
-- Trigger chỉ đọc bảng vc_ (Hiến chương 5.3). Khoá ngoại sang danh mục của parties (hạng bằng, loại giấy tờ của người) đi theo cạnh van-chuyen → parties
-- đã khai. Nhóm lý do là danh sách MỞ theo lượt (lượt 2 thêm nhóm) → kiểm ở MÃ (hằng NHOM_LY_DO, src/shared/dieu-phoi-kieu.ts), không CHECK liệt kê
-- (docs/ARCHITECTURE.md Phần II "Luật dữ liệu"; kế hoạch I7).

-- Chính sách điều phối (ADR-0049 D2 bảng "Chính sách"). Toàn quyền đổi (ô settings.ops). Một con số mốc cho cả lúc đặt và lúc xếp (chủ: "ghép điều kiện
-- chung"). require_contract KHOÁ Ở 0 tới khi có ADR hợp đồng (ĐP7): mở phải bằng migration mới + ADR — không ai bật được trong app.
CREATE TABLE vc_dispatch_policy (
  id                 TEXT PRIMARY KEY,
  min_lead_minutes   INTEGER NOT NULL CHECK (min_lead_minutes BETWEEN 0 AND 2880),   -- mốc tối thiểu (phút); 0 = tắt mốc (giả định G2 — cài đặt của Toàn quyền)
  warn_lead_minutes  INTEGER NOT NULL CHECK (warn_lead_minutes BETWEEN 0 AND 1440),  -- cảnh báo sát mốc (phút) trên lịch chung (MQ-04)
  rest_minutes       INTEGER NOT NULL CHECK (rest_minutes BETWEEN 0 AND 480),        -- khoảng nghỉ tối thiểu giữa hai chuyến (CH-02)
  require_manifest   INTEGER NOT NULL CHECK (require_manifest IN (0, 1)),           -- bắt đủ danh sách hành khách mới xuất bến
  require_contract   INTEGER NOT NULL DEFAULT 0 CHECK (require_contract = 0),       -- ĐP7: khoá ở CSDL
  valid_from_at      TEXT NOT NULL UNIQUE,
  created_at         TEXT NOT NULL,
  created_by         TEXT,
  updated_at         TEXT NOT NULL,
  updated_by         TEXT
);
INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, valid_from_at, created_at, updated_at) VALUES
  ('d53b6dd9-60e2-4644-8e63-9ca7dcff35d0', 360, 120, 30, 1, 0, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z');
CREATE TRIGGER vc_dispatch_policy_no_update BEFORE UPDATE ON vc_dispatch_policy
BEGIN SELECT RAISE(ABORT, 'vc_policy_append_only: chính sách điều phối chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER vc_dispatch_policy_no_delete BEFORE DELETE ON vc_dispatch_policy
BEGIN SELECT RAISE(ABORT, 'vc_policy_append_only: chính sách điều phối không xoá'); END;

-- Điều kiện xuất bến theo cỡ xe (thiết kế 1b B2, giữ nguyên): "xe từ min_capacity người trở lên → bắt buộc giấy tờ X của XE hoặc của TÀI XẾ còn hạn tới hết
-- chuyến". Đúng MỘT mã giấy tờ theo đối tượng. Toàn quyền thêm và đóng hiệu lực; không sửa nội dung, không mở lại, không xoá. Gieo: không dòng nào (G3 —
-- sàn cứng GPLX nằm trong mã). Đang hiệu lực = valid_from_at ≤ bây giờ và (valid_to_at trống hoặc > bây giờ).
CREATE TABLE vc_departure_rule (
  id                          TEXT PRIMARY KEY,
  min_capacity                INTEGER NOT NULL CHECK (min_capacity BETWEEN 1 AND 100),
  subject                     TEXT NOT NULL CHECK (subject IN ('VEHICLE', 'DRIVER')),
  vehicle_document_type_code  TEXT REFERENCES vc_vehicle_document_type(code),
  person_document_type_code   TEXT REFERENCES pty_person_document_type(code),
  valid_from_at               TEXT NOT NULL,
  valid_to_at                 TEXT,
  closed_by                   TEXT,                                                   -- ai đóng (cột WHO: không khoá ngoại)
  created_at                  TEXT NOT NULL,
  created_by                  TEXT,
  updated_at                  TEXT NOT NULL,
  updated_by                  TEXT,
  CHECK ((subject = 'VEHICLE' AND vehicle_document_type_code IS NOT NULL AND person_document_type_code IS NULL)
      OR (subject = 'DRIVER' AND person_document_type_code IS NOT NULL AND vehicle_document_type_code IS NULL)),
  CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  CHECK (valid_to_at IS NOT NULL OR closed_by IS NULL)
);
CREATE INDEX vc_departure_rule_open_ix ON vc_departure_rule(valid_to_at, min_capacity);
-- Chỉ một kiểu UPDATE hợp lệ: ĐÓNG (valid_to_at từ trống → có), không đổi cột nội dung nào. Đóng lần hai, mở lại, sửa nội dung → chặn.
CREATE TRIGGER vc_departure_rule_close_once BEFORE UPDATE ON vc_departure_rule
WHEN OLD.valid_to_at IS NOT NULL OR NEW.valid_to_at IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.min_capacity IS NOT OLD.min_capacity OR NEW.subject IS NOT OLD.subject
  OR NEW.vehicle_document_type_code IS NOT OLD.vehicle_document_type_code OR NEW.person_document_type_code IS NOT OLD.person_document_type_code
  OR NEW.valid_from_at IS NOT OLD.valid_from_at OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vc_departure_rule_close_once: điều kiện xuất bến chỉ đóng hiệu lực một lần, không sửa nội dung, không mở lại'); END;
CREATE TRIGGER vc_departure_rule_no_delete BEFORE DELETE ON vc_departure_rule
BEGIN SELECT RAISE(ABORT, 'vc_departure_rule_no_delete: điều kiện xuất bến không xoá — đóng hiệu lực'); END;

-- Hạng bằng lái → số khách tối đa KHÔNG kể lái (ADR-0049 D2; bảng tra 27/9, CHƯA có người chuyên môn kiểm). NULL = không giới hạn. Chỉ thêm: đổi = dòng mới
-- cùng hạng, mốc hiệu lực mới; dòng hiệu lực của một hạng = valid_from_at mới nhất ≤ bây giờ. Hạng không có dòng nào → máy CHẶN (không đoán).
CREATE TABLE vc_license_capacity (
  id                  TEXT PRIMARY KEY,
  license_class_code  TEXT NOT NULL REFERENCES pty_license_class(code),
  max_passengers      INTEGER CHECK (max_passengers IS NULL OR max_passengers BETWEEN 1 AND 100),
  valid_from_at       TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  UNIQUE (license_class_code, valid_from_at)
);
INSERT INTO vc_license_capacity (id, license_class_code, max_passengers, valid_from_at, created_at, updated_at) VALUES
  ('d5c82cc8-c693-4a18-8c38-ab38f6c20f53', 'B', 8, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('b7cb78f7-0536-4962-94b0-12b06513910e', 'D1', 16, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('69474950-e8e7-4dcf-a5e5-6f6e66af6616', 'D2', 29, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('d9ccd180-1319-420b-8b2e-b50add51d0a9', 'D', NULL, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('63a6f2c1-0502-485d-86e7-e1867e8d74fe', 'B2_OLD', 8, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('87333e8a-d112-426a-b535-cc4645ceca91', 'C_OLD', 8, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('f92b98a0-1964-45e1-8f56-e881e70f049a', 'D_OLD', 29, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('6e1049dd-62e4-4cbc-b32f-8e3fb90915b4', 'E_OLD', NULL, '2026-09-01T00:00:00.000Z', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z');
CREATE TRIGGER vc_license_capacity_no_update BEFORE UPDATE ON vc_license_capacity
BEGIN SELECT RAISE(ABORT, 'vc_policy_append_only: bảng hạng bằng chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER vc_license_capacity_no_delete BEFORE DELETE ON vc_license_capacity
BEGIN SELECT RAISE(ABORT, 'vc_policy_append_only: bảng hạng bằng không xoá'); END;

-- Danh mục lý do (CH-06), Quản trị sửa (ô admin.manage). Máy chỉ rẽ nhánh theo NHÓM, không theo từng lý do → lý do là dữ liệu (Hiến chương 2.2). Nhóm và mã
-- không đổi sau khi tạo (dòng sự kiện trỏ mã sẽ đọc nhóm); nhãn, thứ tự, đang dùng sửa được. Gieo theo giả định G4 (đổi được trong app); mỗi nhóm có "Khác".
-- BO_QUA_KHONG_CON_KHACH là mã HỆ THỐNG máy tự ghi khi điểm không còn suất (kế hoạch I20). Nhóm lượt 2 (BAO_HUY_DIEM, TU_CHOI_NHAN) chưa gieo.
CREATE TABLE vc_reason (
  code          TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 40),
  reason_group  TEXT NOT NULL CHECK (reason_group = upper(reason_group) AND length(reason_group) BETWEEN 2 AND 40),
  label         TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 80),
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('PHA_LE_SU_CO', 'PHA_LE', 'Sự cố vận hành', 1, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('PHA_LE_DON_GAP', 'PHA_LE', 'Đơn đặt gấp', 2, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('PHA_LE_KHAC', 'PHA_LE', 'Khác', 99, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('HUY_GOP_CHUYEN', 'HUY_CHUYEN', 'Gộp vào chuyến khác', 1, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('HUY_KHONG_CON_KHACH', 'HUY_CHUYEN', 'Không còn khách', 2, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('HUY_KHAC', 'HUY_CHUYEN', 'Khác', 99, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('GIAN_DOAN_XE_HONG', 'KET_THUC_GIAN_DOAN', 'Xe hỏng', 1, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('GIAN_DOAN_TAI_NAN', 'KET_THUC_GIAN_DOAN', 'Tai nạn', 2, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('GIAN_DOAN_KHAC', 'KET_THUC_GIAN_DOAN', 'Khác', 99, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('DOI_GIO_XE_TOI_SOM', 'DOI_GIO_XE', 'Xe tới sớm hơn giờ hẹn', 1, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('DOI_GIO_XE_KHAC', 'DOI_GIO_XE', 'Khác', 99, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('BO_QUA_KHONG_CON_KHACH', 'BO_QUA_DIEM', 'Không còn khách ở điểm', 1, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z'),
  ('BO_QUA_KHAC', 'BO_QUA_DIEM', 'Khác', 99, '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z');
CREATE TRIGGER vc_reason_no_delete BEFORE DELETE ON vc_reason
BEGIN SELECT RAISE(ABORT, 'vc_reason_no_delete: lý do không xoá — ngưng dùng'); END;
CREATE TRIGGER vc_reason_identity BEFORE UPDATE ON vc_reason
WHEN NEW.code IS NOT OLD.code OR NEW.reason_group IS NOT OLD.reason_group OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vc_reason_identity: không đổi mã, nhóm, mốc tạo của lý do'); END;
