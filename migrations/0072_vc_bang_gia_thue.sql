-- Migration 0072 — ADR-0057 T1 (accepted 2026-09-30): BẢNG GIÁ THUÊ XE theo nhà xe, trong module van-chuyen (chủ chọn Tiền Q2 a). CHỈ THÊM.
-- ADR-0095 Q3 (vòng sửa 2 — B): mỗi dòng giá theo CẢ tuyến LẪN cỡ xe (bỏ giá "chỉ tuyến" / "chỉ cỡ").
-- Tuyến = NHÃN để tra giá (không phải lộ trình; không khoá tới loc_location — giả định G-T1). Cỡ xe = khoảng số khách KHÔNG kể tài xế, máy suy từ
-- vc_vehicle.passenger_capacity (chủ chọn Q-T1 lần 17). Dòng giá CHỈ-THÊM: đổi giá = đóng dòng cũ + thêm dòng mới (một lô). valid_to_date TÍNH CẢ NGÀY ĐÓ.
-- Trigger chỉ đọc bảng vc_ + view công bố v_pty_carrier (Hiến chương 5.3; src/architecture.test.ts VIEW_CHO_TRIGGER_VC). Mã lỗi: vc_route_, vc_size_, vc_rate_.
CREATE TABLE vc_route (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE TRIGGER vc_route_no_delete BEFORE DELETE ON vc_route
BEGIN SELECT RAISE(ABORT, 'vc_route_no_delete: tuyến không xoá — ngưng dùng'); END;
CREATE TRIGGER vc_route_identity BEFORE UPDATE ON vc_route
WHEN NEW.code IS NOT OLD.code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vc_route_identity: không đổi mã, mốc tạo của tuyến'); END;

CREATE TABLE vc_vehicle_size (
  code            TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 20),
  label           TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 60),
  min_passengers  INTEGER NOT NULL CHECK (min_passengers BETWEEN 1 AND 100),
  max_passengers  INTEGER NOT NULL CHECK (max_passengers BETWEEN 1 AND 100),
  active          INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  CHECK (max_passengers >= min_passengers)
);
CREATE TRIGGER vc_vehicle_size_no_delete BEFORE DELETE ON vc_vehicle_size
BEGIN SELECT RAISE(ABORT, 'vc_size_no_delete: cỡ xe không xoá — ngưng dùng'); END;
CREATE TRIGGER vc_vehicle_size_identity BEFORE UPDATE ON vc_vehicle_size
WHEN NEW.code IS NOT OLD.code OR NEW.min_passengers IS NOT OLD.min_passengers OR NEW.max_passengers IS NOT OLD.max_passengers
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vc_size_identity: không đổi mã, khoảng số khách của cỡ xe — thêm cỡ mới, ngưng cỡ cũ'); END;
CREATE TRIGGER vc_vehicle_size_overlap_ins BEFORE INSERT ON vc_vehicle_size
WHEN NEW.active = 1 AND EXISTS (SELECT 1 FROM vc_vehicle_size s WHERE s.active = 1 AND s.min_passengers <= NEW.max_passengers AND NEW.min_passengers <= s.max_passengers)
BEGIN SELECT RAISE(ABORT, 'vc_size_overlap: khoảng số khách chồng với cỡ xe đang dùng'); END;
CREATE TRIGGER vc_vehicle_size_overlap_upd BEFORE UPDATE OF active ON vc_vehicle_size
WHEN NEW.active = 1 AND OLD.active = 0 AND EXISTS (
  SELECT 1 FROM vc_vehicle_size s WHERE s.code <> NEW.code AND s.active = 1 AND s.min_passengers <= NEW.max_passengers AND NEW.min_passengers <= s.max_passengers)
BEGIN SELECT RAISE(ABORT, 'vc_size_overlap: khoảng số khách chồng với cỡ xe đang dùng'); END;

CREATE TABLE vc_rental_rate (
  id                 TEXT PRIMARY KEY,
  carrier_party_id   TEXT NOT NULL REFERENCES pty_party(id),
  route_code         TEXT NOT NULL REFERENCES vc_route(code),
  vehicle_size_code  TEXT NOT NULL REFERENCES vc_vehicle_size(code),
  unit               TEXT NOT NULL DEFAULT 'PER_TRIP' CHECK (unit IN ('PER_TRIP')),
  amount             INTEGER NOT NULL CHECK (amount > 0 AND amount = round(amount)),
  valid_from_date    TEXT NOT NULL CHECK (date(valid_from_date) IS valid_from_date),
  valid_to_date      TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) IS valid_to_date AND valid_to_date >= valid_from_date)),
  note               TEXT CHECK (note IS NULL OR length(note) <= 200),
  replaces_id        TEXT REFERENCES vc_rental_rate(id),
  created_at         TEXT NOT NULL,
  created_by         TEXT,
  updated_at         TEXT NOT NULL,
  updated_by         TEXT,
  -- Vòng sửa 2 (B — ADR-0095 Q3, sửa tại chỗ khi 0072 CHƯA áp remote): giá luôn theo CẢ tuyến LẪN cỡ xe — hai cột bắt buộc (NOT NULL ở trên). Lớp máy
  -- chủ: "Cần chọn cả tuyến và cỡ xe"; luật chọn `chonDongGiaThue` chỉ còn khớp đủ hai.
  CHECK (length(route_code) > 0 AND length(vehicle_size_code) > 0)
);
CREATE INDEX vc_rental_rate_carrier_ix ON vc_rental_rate(carrier_party_id, valid_from_date);
CREATE TRIGGER vc_rental_rate_no_delete BEFORE DELETE ON vc_rental_rate
BEGIN SELECT RAISE(ABORT, 'vc_rate_append_only: dòng giá không xoá'); END;
-- Chỉ một kiểu UPDATE: đặt valid_to_date MỘT lần (trống → có); updated_* được đổi theo.
CREATE TRIGGER vc_rental_rate_close_once BEFORE UPDATE ON vc_rental_rate
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.carrier_party_id IS NOT OLD.carrier_party_id OR NEW.route_code IS NOT OLD.route_code
  OR NEW.vehicle_size_code IS NOT OLD.vehicle_size_code OR NEW.unit IS NOT OLD.unit OR NEW.amount IS NOT OLD.amount
  OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.note IS NOT OLD.note OR NEW.replaces_id IS NOT OLD.replaces_id
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vc_rate_append_only: dòng giá chỉ đóng một lần, không sửa tiền / khoá / ngày bắt đầu'); END;
-- Khuôn pty_party_role_overlap (0011:97-104): khoá so bằng IS (hai cột nay NOT NULL — IS ≡ =); khoảng mở = '9999-12-31'.
CREATE TRIGGER vc_rental_rate_overlap BEFORE INSERT ON vc_rental_rate
WHEN EXISTS (SELECT 1 FROM vc_rental_rate r WHERE r.carrier_party_id = NEW.carrier_party_id AND r.route_code IS NEW.route_code
  AND r.vehicle_size_code IS NEW.vehicle_size_code
  AND r.valid_from_date <= COALESCE(NEW.valid_to_date, '9999-12-31') AND NEW.valid_from_date <= COALESCE(r.valid_to_date, '9999-12-31'))
BEGIN SELECT RAISE(ABORT, 'vc_rate_overlap: nhà xe đã có giá cùng tuyến, cùng cỡ trong khoảng ngày này'); END;
-- CHỈ lúc THÊM: view phản ánh HIỆN TẠI — đóng dòng của nhà xe đã thôi vai phải luôn làm được.
CREATE TRIGGER vc_rental_rate_carrier BEFORE INSERT ON vc_rental_rate
WHEN NOT EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
BEGIN SELECT RAISE(ABORT, 'vc_rate_carrier: chỉ thêm giá cho nhà xe đang hợp tác'); END;
