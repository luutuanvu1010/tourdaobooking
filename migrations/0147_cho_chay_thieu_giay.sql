-- Migration 0147 — ADR-0184: cho xe thiếu (hoặc hết hạn) giấy tờ vẫn xuất bến khi Quản trị / Toàn quyền đã «Cho chạy dù thiếu giấy tờ» cho đúng chuyến đó.
-- Chỉ THÊM: một bảng dòng cho phép, một cột ở dòng con bản chụp, các trigger, ba lý do. Không dựng lại bảng nào, không đổi cột `ket_qua`
-- (phán quyết P1: không thêm giá trị DAT_PHA_LE — bản chụp vẫn ĐẠT, dòng con DIEU_KIEN trỏ dòng cho phép). Lệnh ghi và luật ở máy chủ: việc 2, 3.

-- Dòng cho phép: MỖI LOẠI GIẤY MỘT DÒNG, gắn chuyến + xe, CHỈ THÊM. cmd_id = dấu lệnh của lô cho phép. KHÔNG có cột số giấy tờ (ADR-0040).
-- expiry_date = hạn của dòng giấy gần nhất nếu có (NULL = xe chưa có giấy). note = ghi chú tự do của Quản trị — KHÔNG vào nhật ký (phán quyết P5).
CREATE TABLE vc_trip_departure_waiver (
  id                  TEXT PRIMARY KEY,
  trip_id             TEXT NOT NULL REFERENCES vc_trip(id),
  cmd_id              TEXT NOT NULL CHECK (length(cmd_id) = 36),
  vehicle_id          TEXT NOT NULL REFERENCES vc_vehicle(id),
  document_type_code  TEXT NOT NULL REFERENCES vc_vehicle_document_type(code),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) IS expiry_date),
  reason_code         TEXT REFERENCES vc_reason(code),
  note                TEXT CHECK (note IS NULL OR length(trim(note)) BETWEEN 10 AND 200),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT
);
CREATE INDEX vc_trip_departure_waiver_trip_ix ON vc_trip_departure_waiver(trip_id);

CREATE TRIGGER vc_trip_departure_waiver_no_delete BEFORE DELETE ON vc_trip_departure_waiver
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: dòng cho phép chạy thiếu giấy tờ không xoá'); END;
CREATE TRIGGER vc_trip_departure_waiver_no_update BEFORE UPDATE ON vc_trip_departure_waiver
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: dòng cho phép chạy thiếu giấy tờ không sửa'); END;

-- Chỉ cấp cho chuyến CHƯA chạy.
CREATE TRIGGER vc_trip_departure_waiver_trip_planned BEFORE INSERT ON vc_trip_departure_waiver
WHEN NOT EXISTS (SELECT 1 FROM vc_trip t WHERE t.id = NEW.trip_id AND t.status = 'PLANNED')
BEGIN SELECT RAISE(ABORT, 'waiver_trip_not_planned: chỉ cho chạy thiếu giấy tờ khi chuyến chưa chạy'); END;
-- Đúng xe HIỆN TẠI của chuyến (đổi xe thì dòng của xe cũ không áp cho xe mới).
CREATE TRIGGER vc_trip_departure_waiver_vehicle BEFORE INSERT ON vc_trip_departure_waiver
WHEN NEW.vehicle_id IS NOT (SELECT t.vehicle_id FROM vc_trip t WHERE t.id = NEW.trip_id)
BEGIN SELECT RAISE(ABORT, 'waiver_vehicle_mismatch: dòng cho phép phải ghi đúng xe hiện tại của chuyến'); END;
-- Lý do (nếu có) đúng nhóm — không viết được bằng CHECK vì phải đọc vc_reason (khuôn vc_unavailability_reason_group).
CREATE TRIGGER vc_trip_departure_waiver_reason_group BEFORE INSERT ON vc_trip_departure_waiver
WHEN NEW.reason_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_reason r WHERE r.code = NEW.reason_code AND r.reason_group = 'CHO_CHAY_THIEU_GIAY')
BEGIN SELECT RAISE(ABORT, 'waiver_reason_group: lý do không thuộc nhóm lý do cho chạy thiếu giấy tờ'); END;
-- (created_by NULL = hệ thống: coi như không phải Toàn quyền.) Quản trị bắt buộc có lý do; Toàn quyền (có trong v_stf_toan_quyen) được bỏ trống. Xét quyền THẬT của người ghi.
CREATE TRIGGER vc_trip_departure_waiver_reason_required BEFORE INSERT ON vc_trip_departure_waiver
WHEN NEW.reason_code IS NULL AND NOT EXISTS (SELECT 1 FROM v_stf_toan_quyen q WHERE q.staff_id = NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'waiver_reason_required: Quản trị phải chọn lý do khi cho chạy thiếu giấy tờ'); END;
-- Kiểm định và Bảo hiểm trách nhiệm dân sự: chỉ Toàn quyền (chủ chọn D1=b, D2).
CREATE TRIGGER vc_trip_departure_waiver_toan_quyen_only BEFORE INSERT ON vc_trip_departure_waiver
WHEN NEW.document_type_code IN ('INSPECTION', 'TPL_INSURANCE') AND NOT EXISTS (SELECT 1 FROM v_stf_toan_quyen q WHERE q.staff_id = NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'waiver_toan_quyen_only: Kiểm định và Bảo hiểm chỉ Toàn quyền cho chạy thiếu giấy tờ'); END;

-- Dòng con bản chụp trỏ dòng cho phép. Cột thêm với NULL mặc định (SQLite cho REFERENCES khi ADD COLUMN nếu mặc định NULL).
ALTER TABLE vc_trip_departure_check_item ADD COLUMN waiver_id TEXT REFERENCES vc_trip_departure_waiver(id);
CREATE INDEX vc_trip_departure_check_item_waiver_ix ON vc_trip_departure_check_item(waiver_id);

-- waiver_id chỉ ở dòng DIEU_KIEN.
CREATE TRIGGER vc_trip_departure_check_item_waiver_kind BEFORE INSERT ON vc_trip_departure_check_item
WHEN NEW.waiver_id IS NOT NULL AND NEW.item_kind <> 'DIEU_KIEN'
BEGIN SELECT RAISE(ABORT, 'waiver_item_kind: chỉ dòng điều kiện mới được trỏ dòng cho phép'); END;
-- Hôm nay bản chụp ĐẠT không bao giờ có dòng DIEU_KIEN (có dòng đó ⇔ có lý do giữ ⇔ không đạt). Từ nay: dòng DIEU_KIEN dưới bản chụp ĐẠT phải trỏ dòng cho
-- phép khớp CHUYẾN, XE (của bản chụp cha), LOẠI GIẤY, và điều kiện phải là điều kiện của XE (giấy tài xế không cho qua). LC-05 (0042) không đổi.
CREATE TRIGGER vc_trip_departure_check_item_waiver_required BEFORE INSERT ON vc_trip_departure_check_item
WHEN NEW.item_kind = 'DIEU_KIEN'
  AND (SELECT c.ket_qua FROM vc_trip_departure_check c WHERE c.id = NEW.check_id) = 'DAT'
  AND NOT EXISTS (
    SELECT 1 FROM vc_trip_departure_waiver w
      JOIN vc_trip_departure_check c ON c.id = NEW.check_id
      JOIN vc_departure_rule r ON r.id = NEW.rule_id
     WHERE w.id = NEW.waiver_id AND w.trip_id = c.trip_id AND w.vehicle_id = c.vehicle_id
       AND w.document_type_code = NEW.document_type_code AND r.subject = 'VEHICLE' AND r.vehicle_document_type_code = NEW.document_type_code)
BEGIN SELECT RAISE(ABORT, 'lc05_thieu_giay_chua_cho_phep: bản chụp đạt chỉ có dòng điều kiện khi đã có dòng cho phép chạy thiếu giấy tờ khớp chuyến, xe, loại giấy'); END;
-- Dùng một lần: dòng cho phép đã được bản chụp KHÁC dùng thì không dùng lại (cùng bản chụp có nhiều dòng điều kiện cùng loại giấy vẫn qua).
CREATE TRIGGER vc_trip_departure_check_item_waiver_once BEFORE INSERT ON vc_trip_departure_check_item
WHEN NEW.waiver_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM vc_trip_departure_check_item i WHERE i.waiver_id = NEW.waiver_id AND i.check_id <> NEW.check_id)
BEGIN SELECT RAISE(ABORT, 'waiver_da_dung: dòng cho phép đã dùng ở một lần xuất bến khác'); END;

INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('THIEU_GIAY_GIA_HAN', 'CHO_CHAY_THIEU_GIAY', 'Giấy đang gia hạn', 1, '2026-11-07T00:00:00.000Z', '2026-11-07T00:00:00.000Z'),
  ('THIEU_GIAY_XE_THAY', 'CHO_CHAY_THIEU_GIAY', 'Xe thay thế khẩn cấp', 2, '2026-11-07T00:00:00.000Z', '2026-11-07T00:00:00.000Z'),
  ('THIEU_GIAY_KHAC', 'CHO_CHAY_THIEU_GIAY', 'Khác', 99, '2026-11-07T00:00:00.000Z', '2026-11-07T00:00:00.000Z');
