-- Migration 0071 — ADR-0055 VK2-A (khung bận của xe) + VK2-B B1 (hai con số giờ lái) (accepted 2026-09-30); hình bảng DÙNG CHUNG với ADR-0053 D9.1
-- (Báo bận của tài xế đối tác — Đợt 6). Module van-chuyen (tiền tố vc_). CHỈ THÊM. Không dữ liệu cá nhân (không cột ghi chú tự do — K12).
-- Kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-03-khung-ban-gio-lai.md, Task 1. Không sửa 0041/0042 (đã áp remote — L1).
-- Trigger CHỈ đọc bảng vc_ (Hiến chương 5.3). Câu báo mang tiền tố để máy chủ đổi mã: lc03_unavailable (→ trip_rule, rules.ts có sẵn),
-- unavailability_overlaps_trip / unavailability_driver_closed / unavailability_reason_group / vc_unavailability_append_only (→ loiRangBuocKhungBan).

-- Khung bận: subject định trọn MỘT lần (cửa một chiều); DRIVER bị chặn ghi bằng trigger tới ADR-0053 D9 (bỏ trigger bằng migration mới).
-- start_ms/end_ms để so (nửa mở [start, end)); start_at/end_at = ISO UTC của cùng mốc (khuôn toISOString, phút tròn — K3). version = khoá lạc quan (D9.1).
CREATE TABLE vc_unavailability (
  id               TEXT PRIMARY KEY,
  subject          TEXT NOT NULL CHECK (subject IN ('VEHICLE', 'DRIVER')),
  vehicle_id       TEXT REFERENCES vc_vehicle(id),
  driver_party_id  TEXT REFERENCES pty_party(id),
  start_ms         INTEGER NOT NULL CHECK (start_ms % 60000 = 0),
  end_ms           INTEGER NOT NULL CHECK (end_ms % 60000 = 0),
  start_at         TEXT NOT NULL,
  end_at           TEXT NOT NULL,
  reason_code      TEXT NOT NULL REFERENCES vc_reason(code),
  withdrawn_at     TEXT,
  withdrawn_by     TEXT,
  version          INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK (end_ms > start_ms),
  CHECK ((subject = 'VEHICLE' AND vehicle_id IS NOT NULL AND driver_party_id IS NULL)
      OR (subject = 'DRIVER' AND driver_party_id IS NOT NULL AND vehicle_id IS NULL)),
  CHECK (start_at = strftime('%Y-%m-%dT%H:%M:00.000Z', start_ms / 1000, 'unixepoch')),
  CHECK (end_at = strftime('%Y-%m-%dT%H:%M:00.000Z', end_ms / 1000, 'unixepoch')),
  CHECK ((withdrawn_at IS NULL) = (withdrawn_by IS NULL))
);
CREATE INDEX vc_unavailability_vehicle_ix ON vc_unavailability(vehicle_id, start_ms) WHERE subject = 'VEHICLE';
CREATE INDEX vc_unavailability_driver_ix ON vc_unavailability(driver_party_id, start_ms) WHERE subject = 'DRIVER';

-- Nhóm lý do mới BAN_XE (danh sách mở — kiểm ở MÃ NHOM_LY_DO). BAN_TAI_XE do ADR-0053 D9 gieo.
INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('BAN_XE_BAO_DUONG', 'BAN_XE', 'Bảo dưỡng', 1, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('BAN_XE_DANG_KIEM', 'BAN_XE', 'Đăng kiểm', 2, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('BAN_XE_SUA_CHUA', 'BAN_XE', 'Sửa chữa', 3, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('BAN_XE_KHAC', 'BAN_XE', 'Khác', 99, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');

-- Chỉ-thêm: không xoá; chèn phải là dòng MỞ, version 1; chỉ một kiểu UPDATE — rút MỘT lần (withdrawn_* trống → có, version + 1), không đổi nội dung.
CREATE TRIGGER vc_unavailability_no_delete BEFORE DELETE ON vc_unavailability
BEGIN SELECT RAISE(ABORT, 'vc_unavailability_append_only: khung bận không xoá — rút khung'); END;
CREATE TRIGGER vc_unavailability_insert_open BEFORE INSERT ON vc_unavailability
WHEN NEW.withdrawn_at IS NOT NULL OR NEW.version <> 1
BEGIN SELECT RAISE(ABORT, 'vc_unavailability_append_only: khung mới phải còn hiệu lực, phiên bản 1'); END;
CREATE TRIGGER vc_unavailability_withdraw_once BEFORE UPDATE ON vc_unavailability
WHEN OLD.withdrawn_at IS NOT NULL OR NEW.withdrawn_at IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.subject IS NOT OLD.subject OR NEW.vehicle_id IS NOT OLD.vehicle_id OR NEW.driver_party_id IS NOT OLD.driver_party_id
  OR NEW.start_ms IS NOT OLD.start_ms OR NEW.end_ms IS NOT OLD.end_ms OR NEW.start_at IS NOT OLD.start_at OR NEW.end_at IS NOT OLD.end_at
  OR NEW.reason_code IS NOT OLD.reason_code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.version IS NOT OLD.version + 1
BEGIN SELECT RAISE(ABORT, 'vc_unavailability_append_only: khung bận chỉ rút một lần, không sửa giờ, đối tượng, lý do'); END;
-- Chưa mở khung của tài xế (ADR-0055 A1, G-A3) — ADR-0053 D9 bỏ trigger này bằng migration mới.
CREATE TRIGGER vc_unavailability_driver_closed BEFORE INSERT ON vc_unavailability
WHEN NEW.subject = 'DRIVER'
BEGIN SELECT RAISE(ABORT, 'unavailability_driver_closed: chưa mở báo bận của tài xế'); END;
-- Lý do đúng nhóm theo đối tượng (D9.3 B9.1 — không viết được bằng CHECK vì phải đọc vc_reason).
CREATE TRIGGER vc_unavailability_reason_group BEFORE INSERT ON vc_unavailability
WHEN NOT EXISTS (SELECT 1 FROM vc_reason r WHERE r.code = NEW.reason_code
                  AND r.reason_group = CASE NEW.subject WHEN 'VEHICLE' THEN 'BAN_XE' ELSE 'BAN_TAI_XE' END)
BEGIN SELECT RAISE(ABORT, 'unavailability_reason_group: lý do không thuộc nhóm lý do bận'); END;
-- Q-L2-1 = a: không ghi khung chồng chuyến CHƯA huỷ, CHƯA kết thúc của xe (nửa mở, so với giờ kết thúc dự kiến — K8).
CREATE TRIGGER vc_unavailability_overlaps_trip BEFORE INSERT ON vc_unavailability
WHEN NEW.subject = 'VEHICLE' AND EXISTS (
  SELECT 1 FROM vc_trip t
   WHERE t.vehicle_id = NEW.vehicle_id AND t.status IN ('PLANNED', 'RUNNING')
     AND t.planned_start_ms < NEW.end_ms AND NEW.start_ms < t.planned_end_ms)
BEGIN SELECT RAISE(ABORT, 'unavailability_overlaps_trip: xe đang có chuyến trùng khung bận — dời hoặc đổi xe chuyến đó trước'); END;
-- LC-03 mở rộng (ADR-0055 A2 (i)): chuyến chưa huỷ không chồng khung bận còn hiệu lực của xe. Trigger MỚI, không sửa vc_trip_overlap_* của 0042.
CREATE TRIGGER vc_trip_unavailable_ins BEFORE INSERT ON vc_trip
WHEN NEW.status <> 'CANCELLED' AND EXISTS (
  SELECT 1 FROM vc_unavailability u
   WHERE u.subject = 'VEHICLE' AND u.vehicle_id = NEW.vehicle_id AND u.withdrawn_at IS NULL
     AND u.start_ms < NEW.planned_end_ms AND NEW.planned_start_ms < u.end_ms)
BEGIN SELECT RAISE(ABORT, 'lc03_unavailable: xe có lịch bận trùng giờ chuyến'); END;
CREATE TRIGGER vc_trip_unavailable_upd BEFORE UPDATE OF planned_start_ms, planned_end_ms, vehicle_id ON vc_trip
WHEN NEW.status <> 'CANCELLED'
  AND (NEW.planned_start_ms IS NOT OLD.planned_start_ms OR NEW.planned_end_ms IS NOT OLD.planned_end_ms OR NEW.vehicle_id IS NOT OLD.vehicle_id)
  AND EXISTS (
  SELECT 1 FROM vc_unavailability u
   WHERE u.subject = 'VEHICLE' AND u.vehicle_id = NEW.vehicle_id AND u.withdrawn_at IS NULL
     AND u.start_ms < NEW.planned_end_ms AND NEW.planned_start_ms < u.end_ms)
BEGIN SELECT RAISE(ABORT, 'lc03_unavailable: xe có lịch bận trùng giờ chuyến'); END;

-- VK2-B B1 đường (2) — 0041 đã áp remote: thêm cột có DEFAULT. LỆCH khuôn I43 có ghi (dòng chèn quên cột được điền mặc định thay vì bị chặn); bù bằng bài
-- "câu chèn chính sách liệt kê đủ cột" (src/modules/van-chuyen/chinh-sach.test.ts) và thân yêu cầu BẮT BUỘC hai số (kiemChinhSachMoi).
ALTER TABLE vc_dispatch_policy ADD COLUMN duty_day_max_minutes INTEGER NOT NULL DEFAULT 480 CHECK (duty_day_max_minutes BETWEEN 60 AND 1440);
ALTER TABLE vc_dispatch_policy ADD COLUMN trip_no_break_max_minutes INTEGER NOT NULL DEFAULT 240 CHECK (trip_no_break_max_minutes BETWEEN 30 AND 720);
