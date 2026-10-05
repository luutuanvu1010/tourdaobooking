-- Migration 0073 — ADR-0057 T2 (accepted 2026-09-30, chủ lần 18 "chưa có giá thì không được chạy"): CHI PHÍ CHUYẾN XE THUÊ. CHỈ THÊM.
-- (1) vc_trip.rented: cờ xe thuê CHỤP lúc xếp / đổi xe (phân loại theo chủ chụp carrier_party_id); không đọc "công ty chủ hiện tại" lúc xuất bến (ADR-0043).
--     DEFAULT 0, KHÔNG backfill (Task 0 kế hoạch Đợt 4: chủ trả lời 2026-10-02 "Trống, hiện chỉ có nhà xe là chính cty Tour Đảo và 1 xe demo" ⇒ 0 chuyến xe thuê).
-- (2) vc_trip.route_code: nhãn tuyến để tra giá, đổi được khi PLANNED. (3) vc_trip_cost_line: chỉ-thêm, dấu có nghĩa (dòng đảo = số đối dấu gốc).
-- (4) thieu_gia: chuyến rented = 1 chỉ sang RUNNING khi có SNAPSHOT/AGREED chưa đảo — không ai phá lệ. (5) siết: không chèn chuyến khác PLANNED.
-- Trigger chỉ đọc bảng vc_ + v_pty_carrier, v_pty_owner_company (đã trong VIEW_CHO_TRIGGER_VC). ky-so (ADR-0080) chưa có trên main ⇒ chưa có trigger khoá kỳ.
ALTER TABLE vc_trip ADD COLUMN rented INTEGER NOT NULL DEFAULT 0 CHECK (rented IN (0, 1));
ALTER TABLE vc_trip ADD COLUMN route_code TEXT REFERENCES vc_route(code);

CREATE TRIGGER vc_trip_insert_planned BEFORE INSERT ON vc_trip
WHEN NEW.status <> 'PLANNED'
BEGIN SELECT RAISE(ABORT, 'vc_trip_insert_planned: chuyến mới phải ở trạng thái lập kế hoạch'); END;
CREATE TRIGGER vc_trip_rented_ins BEFORE INSERT ON vc_trip
WHEN NEW.rented IS NOT (CASE WHEN EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
                              AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id) THEN 1 ELSE 0 END)
BEGIN SELECT RAISE(ABORT, 'vc_rented_mismatch: cờ xe thuê phải khớp chủ xe lúc xếp'); END;
CREATE TRIGGER vc_trip_rented_change BEFORE UPDATE OF vehicle_id, carrier_party_id ON vc_trip
WHEN (NEW.vehicle_id IS NOT OLD.vehicle_id OR NEW.carrier_party_id IS NOT OLD.carrier_party_id)
  AND NEW.rented IS NOT (CASE WHEN EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id) THEN 0
                              WHEN EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id) THEN 1
                              ELSE NEW.rented END)
BEGIN SELECT RAISE(ABORT, 'vc_rented_change: cờ xe thuê phải khớp chủ xe mới'); END;
-- Bịt kẽ tái phân loại (ADR C2a): chỉ hạ 1 → 0 khi chủ xe mới là CÔNG TY CHỦ.
CREATE TRIGGER vc_trip_rented_lower BEFORE UPDATE OF rented ON vc_trip
WHEN OLD.rented = 1 AND NEW.rented = 0 AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id)
BEGIN SELECT RAISE(ABORT, 'vc_rented_lower: chuyến xe thuê chỉ thôi là xe thuê khi đổi sang xe công ty'); END;
CREATE TRIGGER vc_trip_rented_alone BEFORE UPDATE OF rented ON vc_trip
WHEN NEW.rented IS NOT OLD.rented AND NEW.vehicle_id IS OLD.vehicle_id AND NEW.carrier_party_id IS OLD.carrier_party_id
BEGIN SELECT RAISE(ABORT, 'vc_rented_alone: không đổi riêng cờ xe thuê'); END;
CREATE TRIGGER vc_trip_route_locked BEFORE UPDATE OF route_code ON vc_trip
WHEN NEW.route_code IS NOT OLD.route_code AND OLD.status <> 'PLANNED'
BEGIN SELECT RAISE(ABORT, 'vc_route_locked: chuyến đã chạy — không đổi tuyến'); END;

CREATE TABLE vc_trip_cost_line (
  id                           TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL REFERENCES vc_trip(id),
  carrier_party_id             TEXT NOT NULL REFERENCES pty_party(id),
  kind                         TEXT NOT NULL CHECK (kind IN ('SNAPSHOT', 'AGREED', 'ADJUSTMENT', 'REVERSAL')),
  amount                       INTEGER NOT NULL CHECK (amount = round(amount)),
  rate_id                      TEXT REFERENCES vc_rental_rate(id),
  route_code_snapshot          TEXT,
  vehicle_size_code_snapshot   TEXT,
  passenger_capacity_snapshot  INTEGER,
  unit_amount_snapshot         INTEGER,
  reason_code                  TEXT REFERENCES vc_reason(code),
  note                         TEXT CHECK (note IS NULL OR length(note) <= 300),
  reverses_id                  TEXT UNIQUE REFERENCES vc_trip_cost_line(id),
  occurred_date                TEXT NOT NULL CHECK (date(occurred_date) IS occurred_date),
  cmd_id                       TEXT NOT NULL CHECK (length(cmd_id) = 36),
  created_at                   TEXT NOT NULL,
  created_by                   TEXT,
  updated_at                   TEXT NOT NULL,
  updated_by                   TEXT,
  CHECK (kind <> 'SNAPSHOT' OR amount > 0),
  CHECK (kind <> 'AGREED' OR amount > 0),
  CHECK (kind <> 'ADJUSTMENT' OR amount <> 0),
  CHECK ((kind = 'SNAPSHOT') = (rate_id IS NOT NULL)),
  CHECK (kind <> 'SNAPSHOT' OR (passenger_capacity_snapshot IS NOT NULL AND unit_amount_snapshot = amount)),
  CHECK (kind = 'SNAPSHOT' OR reason_code IS NOT NULL),
  CHECK ((kind = 'REVERSAL') = (reverses_id IS NOT NULL))
);
CREATE INDEX vc_trip_cost_line_trip_ix ON vc_trip_cost_line(trip_id, created_at);
CREATE INDEX vc_trip_cost_line_date_ix ON vc_trip_cost_line(occurred_date);
CREATE TRIGGER vc_trip_cost_line_no_update BEFORE UPDATE ON vc_trip_cost_line
BEGIN SELECT RAISE(ABORT, 'vc_cost_append_only: dòng chi phí không sửa — ghi dòng đảo hoặc điều chỉnh'); END;
CREATE TRIGGER vc_trip_cost_line_no_delete BEFORE DELETE ON vc_trip_cost_line
BEGIN SELECT RAISE(ABORT, 'vc_cost_append_only: dòng chi phí không xoá'); END;
CREATE TRIGGER vc_trip_cost_line_reason BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.reason_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_reason r WHERE r.code = NEW.reason_code AND r.reason_group = 'CHI_PHI_XE')
BEGIN SELECT RAISE(ABORT, 'vc_cost_reason: lý do phải thuộc nhóm chi phí xe'); END;
CREATE TRIGGER vc_trip_cost_line_reversal BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind = 'REVERSAL' AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line g WHERE g.id = NEW.reverses_id AND g.trip_id = NEW.trip_id
  AND g.kind <> 'REVERSAL' AND g.amount = -NEW.amount AND g.carrier_party_id = NEW.carrier_party_id)
BEGIN SELECT RAISE(ABORT, 'vc_cost_reversal: dòng đảo phải đối dấu đúng dòng gốc cùng chuyến'); END;
-- MỘT trigger đếm chung hai loại nguồn giá (ADR C8).
CREATE TRIGGER vc_trip_cost_line_one_source BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind IN ('SNAPSHOT', 'AGREED') AND EXISTS (SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = NEW.trip_id AND l.kind IN ('SNAPSHOT', 'AGREED')
  AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))
BEGIN SELECT RAISE(ABORT, 'vc_cost_one_source: chuyến đã có giá — đảo giá cũ trước'); END;
CREATE TRIGGER vc_trip_cost_line_source_planned BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind IN ('SNAPSHOT', 'AGREED') AND (SELECT t.status FROM vc_trip t WHERE t.id = NEW.trip_id) IS NOT 'PLANNED'
BEGIN SELECT RAISE(ABORT, 'vc_cost_planned_only: chỉ đặt giá khi chuyến chưa xuất bến'); END;
CREATE TRIGGER vc_trip_cost_line_reverse_source_planned BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind = 'REVERSAL' AND (SELECT g.kind FROM vc_trip_cost_line g WHERE g.id = NEW.reverses_id) IN ('SNAPSHOT', 'AGREED')
  AND (SELECT t.status FROM vc_trip t WHERE t.id = NEW.trip_id) IS NOT 'PLANNED'
BEGIN SELECT RAISE(ABORT, 'vc_cost_planned_only: giá đã chụp không đảo được sau khi xe chạy — dùng điều chỉnh'); END;
-- Tổng ≥ 0 SAU MỌI DÒNG, không miễn dòng nào (ADR C8 — lô đảo âm trước, dương sau).
CREATE TRIGGER vc_trip_cost_line_total BEFORE INSERT ON vc_trip_cost_line
WHEN (SELECT COALESCE(sum(l.amount), 0) FROM vc_trip_cost_line l WHERE l.trip_id = NEW.trip_id) + NEW.amount < 0
BEGIN SELECT RAISE(ABORT, 'vc_cost_total_negative: tổng chi phí chuyến sẽ âm'); END;
-- Luật vai CHỈ cho SNAPSHOT / AGREED (đảo, điều chỉnh của nhà xe đã thôi vai luôn làm được).
CREATE TRIGGER vc_trip_cost_line_source_carrier BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind IN ('SNAPSHOT', 'AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip t WHERE t.id = NEW.trip_id AND t.rented = 1 AND t.carrier_party_id = NEW.carrier_party_id
  AND EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
  AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id))
BEGIN SELECT RAISE(ABORT, 'vc_cost_source_carrier: giá chỉ đặt cho chuyến xe thuê của nhà xe đang hợp tác'); END;
CREATE TRIGGER vc_trip_cost_line_snapshot_rate BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind = 'SNAPSHOT' AND NOT EXISTS (SELECT 1 FROM vc_rental_rate r WHERE r.id = NEW.rate_id AND r.carrier_party_id = NEW.carrier_party_id AND r.amount = NEW.amount)
BEGIN SELECT RAISE(ABORT, 'vc_cost_snapshot_rate: giá chụp phải đúng dòng giá của nhà xe'); END;
-- Cổng xuất bến lớp CSDL (khuôn vc_trip_running_requires_check, 0042:396). Chỉ đọc bảng vc_ của chính chuyến.
CREATE TRIGGER vc_trip_thieu_gia BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status = 'RUNNING' AND OLD.status = 'PLANNED' AND NEW.rented = 1 AND NOT EXISTS (
  SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = NEW.id AND l.kind IN ('SNAPSHOT', 'AGREED')
    AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))
BEGIN SELECT RAISE(ABORT, 'thieu_gia: chuyến xe thuê chưa có giá — không xuất bến'); END;

-- Lý do nhóm CHI_PHI_XE (mốc cố định — khuôn 0041:118). CPX_DOI_CHUYEN, CPX_HUY_CHUYEN là mã HỆ THỐNG (MA_LY_DO_HE_THONG — không ngưng được, route
-- điều chỉnh / đảo của Kế toán không nhận). Nhãn hai mã hệ thống theo đánh giá bản vẽ Đợt 4 (§4 mục 10) + Cần chủ 3 = A (dời ngày cũng tính lại).
INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('CPX_PHU_THU_CHO', 'CHI_PHI_XE', 'Phụ thu chờ thêm giờ', 1, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
  ('CPX_CAU_DUONG', 'CHI_PHI_XE', 'Phí cầu đường, bến bãi', 2, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
  ('CPX_HUY_MUON', 'CHI_PHI_XE', 'Phí huỷ muộn', 3, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
  ('CPX_NHAP_SAI', 'CHI_PHI_XE', 'Nhập sai', 4, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
  ('CPX_GIA_THOA_THUAN', 'CHI_PHI_XE', 'Giá thoả thuận trước', 5, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
  ('CPX_XE_HONG', 'CHI_PHI_XE', 'Xe hỏng giữa đường', 6, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'), -- ADR-0095 Q8 (vòng sửa 2, V10; sửa tại chỗ — 0073 CHƯA áp remote)
  ('CPX_DOI_CHUYEN', 'CHI_PHI_XE', 'Đảo do đổi chuyến (xe, nhà xe, tuyến hoặc ngày chạy)', 90, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
  ('CPX_HUY_CHUYEN', 'CHI_PHI_XE', 'Đảo do huỷ chuyến', 91, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'),
  ('CPX_KHAC', 'CHI_PHI_XE', 'Khác', 99, '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z');
