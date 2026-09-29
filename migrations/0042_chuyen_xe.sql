-- Migration 0042 — ADR-0049 D1, D2 (accepted 2026-09-29) + ADR-0050 VK1-A, VK1-B (accepted 2026-09-29): LÕI CHUYẾN XE của phân hệ Vận chuyển, lát 1.2
-- (kế hoạch docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md mục 1.3, 1.4, 0.2). Module van-chuyen (tiền tố vc_). CHỈ THÊM. Không dữ liệu cá nhân:
-- suất trỏ KHOÁ người (passenger_key = person_key của ord_passenger), bản chốt trỏ ID dòng hành khách đã dùng — không chép họ tên, năm sinh, SĐT.
-- Chuyến = kế hoạch + thực thi, MỘT thực thể. Ai lái, khách nào ở xe nào = DÒNG CÓ HIỆU LỰC (đóng dòng, không xoá, không ghi đè). Sự kiện, bản chụp điều
-- kiện xuất bến, bản chốt danh sách: CHỈ THÊM. Luật lõi LC-01…LC-16 giữ Ở ĐÂY (lớp CSDL) và ở máy chủ (luật thuần src/shared/dieu-phoi-*.ts).
-- Trigger CHỈ đọc bảng vc_ và sáu view công bố (Hiến chương 5.3): v_ord_leg_key, v_ord_order_flag, v_ord_passenger_key (orders — 0035),
-- v_pty_carrier_driver, v_pty_carrier, v_pty_owner_company (parties — 0038). Bài src/architecture.test.ts khoá tập tên này.
-- Câu báo mang tiền tố để máy chủ đổi thành mã lỗi (loiRangBuocChuyen, src/modules/van-chuyen/rules.ts): lc01_ … lc16_, vk1a_ (giờ xảy ra), vc_trip_append_only.
-- Giờ: *_at là chuỗi ISO UTC ĐÚNG khuôn toISOString() (máy chủ lấy MỘT mốc giờ mỗi request — kế hoạch I33, thử thật A0 bước 14); *_ms là mili-giây.
-- departed_*, ended_* của chuyến, arrived_at / done_at của điểm = giờ XẢY RA (chép đúng cặp occurred_* của sự kiện cùng lô — ADR-0050 VK1-A).
-- Loại sự kiện (vc_trip_event.kind) kiểm ở MÃ (hằng LOAI_SU_KIEN_CHUYEN — lượt 2 thêm loại; Phần II "Luật dữ liệu"; kế hoạch I7); máy trạng thái kiểm ở CHECK.

-- ---------------------------------------------------------------------------------------------------------------------------------------------------------
-- Chuyến. version = khoá lạc quan; last_cmd_id = DẤU LỆNH (id riêng của request = id sự kiện = id dòng audit_log) — mọi câu ghi sau câu cổng của một lô mang
-- EXISTS (… last_cmd_id = <dấu của lô>) nên bên thua không lọt (ADR-0049 D1 "Thứ tự lô"). earliest_start_ms = KHOÁ DÍNH mốc lúc xếp (R-P6 + R-P7): giờ xuất
-- bến dự kiến sớm nhất khi chuyến đã vào vùng khoá; máy chủ tính bằng batDauSomNhatSauDoiGio (src/shared/moc-toi-thieu.ts) — không chép luật vào SQL.
-- carrier_party_id = chủ xe CHỤP lúc xếp (kể cả khi chủ là công ty) — trigger giữ bằng chủ hiện tại của xe lúc ghi.
CREATE TABLE vc_trip (
  id                         TEXT PRIMARY KEY,
  code                       TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 3 AND 30),
  vehicle_id                 TEXT NOT NULL REFERENCES vc_vehicle(id),
  carrier_party_id           TEXT NOT NULL REFERENCES pty_party(id),
  service_date               TEXT NOT NULL CHECK (date(service_date) IS service_date),
  planned_start_ms           INTEGER NOT NULL,
  planned_end_ms             INTEGER NOT NULL,
  earliest_start_ms          INTEGER NOT NULL,
  rest_minutes_snapshot      INTEGER NOT NULL CHECK (rest_minutes_snapshot BETWEEN 0 AND 480),
  rest_override_reason_code  TEXT REFERENCES vc_reason(code),
  status                     TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'RUNNING', 'ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')),
  departed_at                TEXT,
  departed_ms                INTEGER,
  ended_at                   TEXT,
  ended_ms                   INTEGER,
  cancel_reason_code         TEXT REFERENCES vc_reason(code),
  end_reason_code            TEXT REFERENCES vc_reason(code),
  version                    INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  last_cmd_id                TEXT NOT NULL CHECK (length(last_cmd_id) = 36),
  created_at                 TEXT NOT NULL,
  created_by                 TEXT,
  updated_at                 TEXT NOT NULL,
  updated_by                 TEXT,
  UNIQUE (service_date, code),
  CHECK (planned_end_ms > planned_start_ms AND planned_end_ms - planned_start_ms <= 86400000),
  -- Một nguồn cho ngày chạy (kế hoạch I10): ngày VN của giờ bắt đầu dự kiến (Việt Nam không đổi giờ mùa).
  CHECK (service_date IS date(planned_start_ms / 1000, 'unixepoch', '+7 hours')),
  CHECK (earliest_start_ms <= planned_start_ms),
  CHECK ((departed_at IS NULL) = (departed_ms IS NULL)),
  CHECK ((ended_at IS NULL) = (ended_ms IS NULL)),
  -- Trạng thái nhất quán với cột giờ / lý do (vế trái luôn khác NULL vì status NOT NULL — không mắc bẫy NULL của CHECK).
  CHECK (status NOT IN ('PLANNED', 'CANCELLED') OR (departed_at IS NULL AND ended_at IS NULL)),
  CHECK (status <> 'RUNNING' OR (departed_at IS NOT NULL AND ended_at IS NULL)),
  CHECK (status NOT IN ('ENDED', 'ENDED_INTERRUPTED') OR (departed_at IS NOT NULL AND ended_at IS NOT NULL)),
  CHECK (status <> 'CANCELLED' OR cancel_reason_code IS NOT NULL),
  CHECK (status <> 'ENDED_INTERRUPTED' OR end_reason_code IS NOT NULL),
  -- ADR-0050 VK1-A: kết thúc (giờ xảy ra) không sớm hơn xuất bến (giờ xảy ra).
  CHECK (ended_ms IS NULL OR departed_ms IS NULL OR ended_ms >= departed_ms)
);
CREATE INDEX vc_trip_vehicle_ix ON vc_trip(vehicle_id, planned_start_ms);
CREATE INDEX vc_trip_date_ix ON vc_trip(service_date);
-- LC-03: mỗi xe chỉ MỘT chuyến đang chạy.
CREATE UNIQUE INDEX vc_trip_one_running_vehicle ON vc_trip(vehicle_id) WHERE status = 'RUNNING';

-- Ai lái — dòng có hiệu lực; một dòng MỞ mỗi chuyến. Đổi tài xế = đóng dòng cũ (REASSIGNED) + mở dòng mới.
CREATE TABLE vc_trip_driver (
  id               TEXT PRIMARY KEY,
  trip_id          TEXT NOT NULL REFERENCES vc_trip(id),
  driver_party_id  TEXT NOT NULL REFERENCES pty_party(id),
  valid_from_at    TEXT NOT NULL,
  valid_to_at      TEXT,
  close_reason     TEXT CHECK (close_reason IS NULL OR close_reason IN ('REASSIGNED', 'TRIP_CANCELLED', 'REFUSED')),
  closed_by        TEXT,
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK ((valid_to_at IS NULL) = (close_reason IS NULL)),
  CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  CHECK (valid_to_at IS NOT NULL OR closed_by IS NULL)
);
CREATE UNIQUE INDEX vc_trip_driver_open_uq ON vc_trip_driver(trip_id) WHERE valid_to_at IS NULL;
CREATE INDEX vc_trip_driver_party_ix ON vc_trip_driver(driver_party_id);

-- Điểm dừng. Đúng MỘT nơi: điểm danh mục (location_id) HOẶC chữ tự do (place_text — chữ ĐÃ CHE dãy số, chỉ để hiển thị). place_key = KHOÁ SO SÁNH NƠI
-- (ADR-0050 VK1-B; kế hoạch I39, I40): 'L:' || location_id, hoặc 'T:' + 64 hex thường SHA-256 của chữ CHƯA che đã chuẩn hoá (do orders tính —
-- src/shared/khoa-noi.ts). KHÔNG BAO GIỜ hiển thị. planned_date + planned_time = giờ xe tới ghi đè (cả hai NULL = theo giờ hẹn sớm nhất tại điểm — kế hoạch
-- I9). Không UNIQUE (trip_id, seq): đổi thứ tự trong một câu sẽ vấp giữa chừng — câu kiểm R-VC-9 bắt trùng.
CREATE TABLE vc_trip_stop (
  id                TEXT PRIMARY KEY,
  trip_id           TEXT NOT NULL REFERENCES vc_trip(id),
  seq               INTEGER NOT NULL CHECK (seq BETWEEN 1 AND 500),
  kind              TEXT NOT NULL CHECK (kind IN ('PICKUP', 'DROPOFF')),
  location_id       TEXT REFERENCES loc_location(id),
  place_text        TEXT CHECK (place_text IS NULL OR length(trim(place_text)) BETWEEN 1 AND 200),
  place_key         TEXT NOT NULL,
  planned_date      TEXT CHECK (planned_date IS NULL OR date(planned_date) IS planned_date),
  planned_time      TEXT CHECK (planned_time IS NULL OR planned_time GLOB '[01][0-9]:[0-5][0-9]' OR planned_time GLOB '2[0-3]:[0-5][0-9]'),
  status            TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ARRIVED', 'DONE', 'SKIPPED', 'MOVED')),
  arrived_at        TEXT,
  done_at           TEXT,
  skip_reason_code  TEXT REFERENCES vc_reason(code),
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT,
  CHECK ((location_id IS NULL) <> (place_text IS NULL)),
  -- Khuôn khoá nơi (ADR-0050 VK1-B): điểm danh mục ⇒ 'L:' || id; chữ tự do ⇒ 'T:' + đúng 64 ký tự hex thường.
  CHECK (location_id IS NULL OR place_key = 'L:' || location_id),
  CHECK (location_id IS NOT NULL OR (place_key GLOB 'T:*' AND length(place_key) = 66 AND substr(place_key, 3) NOT GLOB '*[^0-9a-f]*')),
  CHECK ((planned_date IS NULL) = (planned_time IS NULL)),
  CHECK (status <> 'SKIPPED' OR skip_reason_code IS NOT NULL),
  CHECK (status NOT IN ('ARRIVED', 'DONE') OR arrived_at IS NOT NULL),
  CHECK (status <> 'DONE' OR done_at IS NOT NULL)
);
CREATE INDEX vc_trip_stop_trip_ix ON vc_trip_stop(trip_id, seq);

-- SUẤT: một người trên một chuyến, có hiệu lực. passenger_key = person_key của ord_passenger (khoá NGƯỜI, không đổi qua các lần sửa tên); NULL = chưa có
-- tên, đặt MỘT lần. leg_id / passenger_key KHÔNG khai REFERENCES sang bảng của orders (GA-34 — câu hỏi điều phối A12): SQLite quét BẢNG CON khi orders
-- xoá / chèn nhiều dòng vào bảng cha, làm câu SQL của orders "đọc" bảng vc_ (bài EXPLAIN ranh giới). Toàn vẹn giữ bằng trigger LC-09 / LC-10 (đọc view công
-- bố lúc mở suất / gắn tên) + trigger ord_*_no_delete có sẵn (chặng, hành khách của đơn đã xác nhận không xoá được). Rời chuyến = đóng dòng (close_reason), không đổi trạng thái. Điểm lên / xuống của suất CỐ ĐỊNH (đổi điểm = đóng STOP_CHANGED + mở suất
-- mới — ADR-0050 VK1-B, bản soi K-03 (b)); alight_stop_id NULL khi chặng chưa chốt nơi trả (cổng xuất bến giữ chuyến).
CREATE TABLE vc_trip_allocation (
  id                     TEXT PRIMARY KEY,
  trip_id                TEXT NOT NULL REFERENCES vc_trip(id),
  kind                   TEXT NOT NULL CHECK (kind IN ('PASSENGER', 'CREW')),
  leg_id                 TEXT,
  passenger_key          TEXT,
  crew_party_id          TEXT REFERENCES pty_party(id),
  board_stop_id          TEXT REFERENCES vc_trip_stop(id),
  alight_stop_id         TEXT REFERENCES vc_trip_stop(id),
  status                 TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'BOARDED', 'NO_SHOW', 'CANCELLED_AT_STOP', 'DROPPED')),
  valid_from_at          TEXT NOT NULL,
  valid_to_at            TEXT,
  close_reason           TEXT CHECK (close_reason IS NULL OR close_reason IN ('MOVED', 'REMOVED', 'TRIP_CANCELLED', 'TRIP_INTERRUPTED', 'TRANSFERRED', 'STOP_CHANGED')),
  closed_by              TEXT,
  added_after_departure  INTEGER NOT NULL DEFAULT 0 CHECK (added_after_departure IN (0, 1)),
  created_at             TEXT NOT NULL,
  created_by             TEXT,
  updated_at             TEXT NOT NULL,
  updated_by             TEXT,
  CHECK (kind <> 'PASSENGER' OR (leg_id IS NOT NULL AND crew_party_id IS NULL AND board_stop_id IS NOT NULL)),
  CHECK (kind <> 'CREW' OR (crew_party_id IS NOT NULL AND leg_id IS NULL AND passenger_key IS NULL)),
  CHECK ((valid_to_at IS NULL) = (close_reason IS NULL)),
  CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  CHECK (valid_to_at IS NOT NULL OR closed_by IS NULL)
);
-- LC-01: mỗi người (có tên) của một chặng ở ĐÚNG MỘT suất mở.
CREATE UNIQUE INDEX vc_trip_allocation_person_open_uq ON vc_trip_allocation(leg_id, passenger_key) WHERE valid_to_at IS NULL AND passenger_key IS NOT NULL;
CREATE INDEX vc_trip_allocation_trip_ix ON vc_trip_allocation(trip_id);
CREATE INDEX vc_trip_allocation_leg_ix ON vc_trip_allocation(leg_id);

-- SỰ KIỆN có kiểu, CÙNG id với dòng audit_log (nối một-một, KHÔNG khoá ngoại — khuôn 0021) = dấu lệnh. CHỈ THÊM. count = số người (không tên).
-- ADR-0050 VK1-A: giờ GHI NHẬN = created_at (máy chủ); giờ XẢY RA = occurred_* (= ghi nhận, trừ văn phòng bấm thay khai trong khoảng kẹp — kiemGioXayRa).
CREATE TABLE vc_trip_event (
  id                    TEXT PRIMARY KEY CHECK (length(id) = 36),
  trip_id               TEXT NOT NULL REFERENCES vc_trip(id),
  related_trip_id       TEXT REFERENCES vc_trip(id),
  kind                  TEXT NOT NULL CHECK (kind = upper(kind) AND length(kind) BETWEEN 3 AND 40),
  stop_id               TEXT REFERENCES vc_trip_stop(id),
  allocation_id         TEXT REFERENCES vc_trip_allocation(id),
  count                 INTEGER CHECK (count IS NULL OR count BETWEEN 0 AND 1000),
  request_id            TEXT NOT NULL UNIQUE CHECK (length(request_id) = 36),
  client_at             TEXT,
  decided_mode          TEXT NOT NULL CHECK (decided_mode IN ('NGUOI', 'MAY')),
  override_rule_code    TEXT CHECK (override_rule_code IS NULL OR (override_rule_code = upper(override_rule_code) AND length(override_rule_code) BETWEEN 2 AND 40)),
  override_reason_code  TEXT REFERENCES vc_reason(code),
  policy_id             TEXT REFERENCES vc_dispatch_policy(id),
  occurred_at           TEXT NOT NULL,
  occurred_ms           INTEGER NOT NULL,
  occurred_source       TEXT NOT NULL CHECK (occurred_source IN ('MAY_CHU', 'VAN_PHONG_KHAI')),
  created_at            TEXT NOT NULL,
  created_by            TEXT,
  updated_at            TEXT NOT NULL,
  updated_by            TEXT,
  CHECK (related_trip_id IS NULL OR related_trip_id <> trip_id),
  CHECK ((override_rule_code IS NULL) = (override_reason_code IS NULL)),
  -- ADR-0050 VK1-A: giờ xảy ra không sau giờ ghi nhận; máy chủ tự ghi ⇒ hai giờ BẰNG nhau (so chuỗi đúng khuôn toISOString — I33).
  CHECK (occurred_at <= created_at),
  CHECK (occurred_source <> 'MAY_CHU' OR occurred_at = created_at),
  CHECK (occurred_source <> 'VAN_PHONG_KHAI' OR policy_id IS NOT NULL)
);
CREATE INDEX vc_trip_event_trip_ix ON vc_trip_event(trip_id, created_at);
CREATE INDEX vc_trip_event_related_ix ON vc_trip_event(related_trip_id);

-- BẢN CHỤP điều kiện xuất bến (một dòng mỗi lần kiểm + dòng con), CHỈ THÊM. cmd_id = dấu lệnh của lô xuất bến (LC-05). Chép biển số, số chỗ, hạng, hạn —
-- KHÔNG số giấy tờ, không nơi cấp.
CREATE TABLE vc_trip_departure_check (
  id                  TEXT PRIMARY KEY,
  trip_id             TEXT NOT NULL REFERENCES vc_trip(id),
  cmd_id              TEXT NOT NULL CHECK (length(cmd_id) = 36),
  policy_id           TEXT NOT NULL REFERENCES vc_dispatch_policy(id),
  ket_qua             TEXT NOT NULL CHECK (ket_qua IN ('DAT', 'KHONG_DAT')),
  vehicle_id          TEXT NOT NULL REFERENCES vc_vehicle(id),
  plate_number        TEXT NOT NULL CHECK (length(trim(plate_number)) BETWEEN 4 AND 20),
  passenger_capacity  INTEGER NOT NULL CHECK (passenger_capacity BETWEEN 1 AND 100),
  owner_party_id      TEXT NOT NULL REFERENCES pty_party(id),
  driver_party_id     TEXT NOT NULL REFERENCES pty_party(id),
  rest_minutes_used   INTEGER NOT NULL CHECK (rest_minutes_used BETWEEN 0 AND 480),
  checked_at          TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT
);
CREATE INDEX vc_trip_departure_check_trip_ix ON vc_trip_departure_check(trip_id, cmd_id);
CREATE TABLE vc_trip_departure_check_item (
  id                   TEXT PRIMARY KEY,
  check_id             TEXT NOT NULL REFERENCES vc_trip_departure_check(id),
  item_kind            TEXT NOT NULL CHECK (item_kind IN ('GPLX', 'GIAY_TO_XE', 'GIAY_TO_NGUOI', 'DIEU_KIEN')),
  vehicle_document_id  TEXT REFERENCES vc_vehicle_document(id),
  person_document_id   TEXT REFERENCES pty_person_document(id),
  document_type_code   TEXT CHECK (document_type_code IS NULL OR (document_type_code = upper(document_type_code) AND length(document_type_code) BETWEEN 2 AND 30)),
  license_class_code   TEXT,
  expiry_date          TEXT CHECK (expiry_date IS NULL OR date(expiry_date) IS expiry_date),
  rule_id              TEXT REFERENCES vc_departure_rule(id),
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT,
  CHECK (item_kind <> 'GPLX' OR (person_document_id IS NOT NULL AND vehicle_document_id IS NULL AND license_class_code IS NOT NULL)),
  CHECK (item_kind <> 'GIAY_TO_XE' OR (vehicle_document_id IS NOT NULL AND person_document_id IS NULL)),
  CHECK (item_kind <> 'GIAY_TO_NGUOI' OR (person_document_id IS NOT NULL AND vehicle_document_id IS NULL)),
  CHECK (item_kind <> 'DIEU_KIEN' OR (rule_id IS NOT NULL AND vehicle_document_id IS NULL AND person_document_id IS NULL))
);
CREATE INDEX vc_trip_departure_check_item_check_ix ON vc_trip_departure_check_item(check_id);

-- BẢN CHỐT danh sách hành khách lúc xuất bến, CHỈ THÊM: trỏ ID DÒNG hành khách ĐÃ DÙNG (không phải person_key) — tên sửa sau này không đổi bản chốt.
-- passenger_row_id KHÔNG khai REFERENCES (GA-34, như suất): máy chủ lấy id từ hanhKhachChoChuyen cùng lô; câu kiểm định kỳ R-VC-10 bắt dòng lạ / khác đơn.
-- Không chép họ tên. check_id NULL chỉ cho dòng thêm sau xuất bến (lượt 2).
CREATE TABLE vc_trip_manifest (
  id                     TEXT PRIMARY KEY,
  trip_id                TEXT NOT NULL REFERENCES vc_trip(id),
  check_id               TEXT REFERENCES vc_trip_departure_check(id),
  allocation_id          TEXT NOT NULL REFERENCES vc_trip_allocation(id),
  passenger_row_id       TEXT,
  crew_party_id          TEXT REFERENCES pty_party(id),
  added_after_departure  INTEGER NOT NULL DEFAULT 0 CHECK (added_after_departure IN (0, 1)),
  created_at             TEXT NOT NULL,
  created_by             TEXT,
  updated_at             TEXT NOT NULL,
  updated_by             TEXT,
  CHECK ((passenger_row_id IS NULL) <> (crew_party_id IS NULL)),
  CHECK ((check_id IS NULL) = (added_after_departure = 1))
);
CREATE INDEX vc_trip_manifest_trip_ix ON vc_trip_manifest(trip_id);

-- View công bố CHỈ KHOÁ của orders cho bản chốt (R-P19 — chủ chốt 29/9, Trả lời lần 13: "Bỏ móc nối cứng" sang bảng ord_*; toàn vẹn thay khoá ngoại do trigger
-- đọc VIEW, không đọc bảng ord_): mỗi dòng hành khách — id dòng, khoá người, đơn, còn là dòng hiện hành không. KHÔNG tên, KHÔNG năm sinh (khuôn 0035).
CREATE VIEW v_ord_passenger_row AS
  SELECT p.id AS id, p.person_key AS person_key, p.order_id AS order_id,
         (p.voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL)) AS is_current
  FROM ord_passenger p;

-- =========================================================================================================================================================
-- LC-04 — không xoá; không sửa nội dung; chỉ đóng dòng, gắn tên, đổi trạng thái đi tiến.
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_no_delete BEFORE DELETE ON vc_trip
BEGIN SELECT RAISE(ABORT, 'lc04_no_delete: chuyến không xoá — huỷ chuyến'); END;
CREATE TRIGGER vc_trip_driver_no_delete BEFORE DELETE ON vc_trip_driver
BEGIN SELECT RAISE(ABORT, 'lc04_no_delete: dòng tài xế không xoá — đóng dòng'); END;
CREATE TRIGGER vc_trip_stop_no_delete BEFORE DELETE ON vc_trip_stop
BEGIN SELECT RAISE(ABORT, 'lc04_no_delete: điểm dừng không xoá — bỏ qua điểm'); END;
CREATE TRIGGER vc_trip_allocation_no_delete BEFORE DELETE ON vc_trip_allocation
BEGIN SELECT RAISE(ABORT, 'lc04_no_delete: suất không xoá — đóng dòng'); END;
CREATE TRIGGER vc_trip_event_no_delete BEFORE DELETE ON vc_trip_event
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: sự kiện chuyến không xoá'); END;
CREATE TRIGGER vc_trip_event_no_update BEFORE UPDATE ON vc_trip_event
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: sự kiện chuyến không sửa'); END;
CREATE TRIGGER vc_trip_departure_check_no_delete BEFORE DELETE ON vc_trip_departure_check
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: bản chụp điều kiện xuất bến không xoá'); END;
CREATE TRIGGER vc_trip_departure_check_no_update BEFORE UPDATE ON vc_trip_departure_check
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: bản chụp điều kiện xuất bến không sửa'); END;
CREATE TRIGGER vc_trip_departure_check_item_no_delete BEFORE DELETE ON vc_trip_departure_check_item
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: dòng con bản chụp không xoá'); END;
CREATE TRIGGER vc_trip_departure_check_item_no_update BEFORE UPDATE ON vc_trip_departure_check_item
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: dòng con bản chụp không sửa'); END;
CREATE TRIGGER vc_trip_manifest_no_delete BEFORE DELETE ON vc_trip_manifest
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: bản chốt danh sách không xoá'); END;
CREATE TRIGGER vc_trip_manifest_no_update BEFORE UPDATE ON vc_trip_manifest
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: bản chốt danh sách không sửa'); END;

CREATE TRIGGER vc_trip_identity BEFORE UPDATE ON vc_trip
WHEN NEW.id IS NOT OLD.id OR NEW.code IS NOT OLD.code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'lc04_identity: không đổi mã, mốc tạo của chuyến'); END;
-- Dòng tài xế: chỉ một kiểu UPDATE hợp lệ — ĐÓNG một lần (valid_to_at trống → có), không đổi nội dung.
CREATE TRIGGER vc_trip_driver_close_once BEFORE UPDATE ON vc_trip_driver
WHEN OLD.valid_to_at IS NOT NULL OR NEW.valid_to_at IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.trip_id IS NOT OLD.trip_id OR NEW.driver_party_id IS NOT OLD.driver_party_id OR NEW.valid_from_at IS NOT OLD.valid_from_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'lc04_close_once: dòng tài xế chỉ đóng một lần, không sửa nội dung'); END;
-- Điểm dừng: không đổi chuyến, loại, nơi, khoá nơi (ADR-0050 VK1-B — đổi nơi = điểm MỚI).
CREATE TRIGGER vc_trip_stop_identity BEFORE UPDATE ON vc_trip_stop
WHEN NEW.id IS NOT OLD.id OR NEW.trip_id IS NOT OLD.trip_id OR NEW.kind IS NOT OLD.kind OR NEW.location_id IS NOT OLD.location_id
  OR NEW.place_text IS NOT OLD.place_text OR NEW.place_key IS NOT OLD.place_key OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'lc04_identity: không đổi chuyến, loại, nơi, khoá nơi của điểm dừng'); END;
-- Suất: không đổi chuyến, loại, chặng, người đi kèm, điểm lên, điểm xuống (cấm hẳn — bản soi K-03 (b), kế hoạch I41), mốc mở, cờ thêm sau xuất bến.
CREATE TRIGGER vc_trip_allocation_identity BEFORE UPDATE ON vc_trip_allocation
WHEN NEW.id IS NOT OLD.id OR NEW.trip_id IS NOT OLD.trip_id OR NEW.kind IS NOT OLD.kind OR NEW.leg_id IS NOT OLD.leg_id
  OR NEW.crew_party_id IS NOT OLD.crew_party_id OR NEW.board_stop_id IS NOT OLD.board_stop_id OR NEW.alight_stop_id IS NOT OLD.alight_stop_id
  OR NEW.valid_from_at IS NOT OLD.valid_from_at OR NEW.added_after_departure IS NOT OLD.added_after_departure
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'lc04_identity: không đổi chuyến, chặng, điểm lên / xuống của suất — đổi điểm thì đóng suất và mở suất mới'); END;
-- Suất đã đóng: không sửa gì nữa (kể cả mở lại).
CREATE TRIGGER vc_trip_allocation_close_once BEFORE UPDATE ON vc_trip_allocation
WHEN OLD.valid_to_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'lc04_close_once: suất đã đóng — không sửa, không mở lại'); END;
-- Gắn tên MỘT lần: passenger_key chỉ đặt từ NULL.
CREATE TRIGGER vc_trip_allocation_name_once BEFORE UPDATE OF passenger_key ON vc_trip_allocation
WHEN OLD.passenger_key IS NOT NULL AND NEW.passenger_key IS NOT OLD.passenger_key
BEGIN SELECT RAISE(ABORT, 'lc04_name_once: suất đã gắn tên — không đổi người'); END;
-- Điểm lên / xuống của suất thuộc CHÍNH chuyến của suất, đúng loại (điểm lên = PICKUP, điểm xuống = DROPOFF).
CREATE TRIGGER vc_trip_allocation_stop_scope BEFORE INSERT ON vc_trip_allocation
WHEN (NEW.board_stop_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_trip_stop s WHERE s.id = NEW.board_stop_id AND s.trip_id = NEW.trip_id AND s.kind = 'PICKUP'))
  OR (NEW.alight_stop_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_trip_stop s WHERE s.id = NEW.alight_stop_id AND s.trip_id = NEW.trip_id AND s.kind = 'DROPOFF'))
BEGIN SELECT RAISE(ABORT, 'lc04_stop_scope: điểm lên / xuống phải thuộc chính chuyến của suất, đúng loại'); END;

-- =========================================================================================================================================================
-- LC-02 — tổng suất WAITING + BOARDED (khách + người đi kèm) ≤ số chỗ của xe, MỌI lúc. Mỗi suất MỘT câu INSERT (trigger theo dòng thấy suất vừa chèn).
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_allocation_capacity_ins BEFORE INSERT ON vc_trip_allocation
WHEN NEW.valid_to_at IS NULL AND NEW.status IN ('WAITING', 'BOARDED')
  AND (SELECT count(*) FROM vc_trip_allocation a WHERE a.trip_id = NEW.trip_id AND a.valid_to_at IS NULL AND a.status IN ('WAITING', 'BOARDED')) + 1
    > (SELECT v.passenger_capacity FROM vc_trip t JOIN vc_vehicle v ON v.id = t.vehicle_id WHERE t.id = NEW.trip_id)
BEGIN SELECT RAISE(ABORT, 'lc02_capacity: vượt số chỗ của xe'); END;
-- Bước lùi duy nhất NO_SHOW → BOARDED (đón muộn) cũng chiếm lại chỗ.
CREATE TRIGGER vc_trip_allocation_capacity_upd BEFORE UPDATE OF status ON vc_trip_allocation
WHEN OLD.status = 'NO_SHOW' AND NEW.status = 'BOARDED' AND NEW.valid_to_at IS NULL
  AND (SELECT count(*) FROM vc_trip_allocation a WHERE a.trip_id = NEW.trip_id AND a.valid_to_at IS NULL AND a.status IN ('WAITING', 'BOARDED') AND a.id <> NEW.id) + 1
    > (SELECT v.passenger_capacity FROM vc_trip t JOIN vc_vehicle v ON v.id = t.vehicle_id WHERE t.id = NEW.trip_id)
BEGIN SELECT RAISE(ABORT, 'lc02_capacity: vượt số chỗ của xe'); END;
-- Đổi xe của chuyến sang xe ít chỗ hơn tải hiện tại.
CREATE TRIGGER vc_trip_vehicle_capacity BEFORE UPDATE OF vehicle_id ON vc_trip
WHEN NEW.vehicle_id IS NOT OLD.vehicle_id
  AND (SELECT count(*) FROM vc_trip_allocation a WHERE a.trip_id = NEW.id AND a.valid_to_at IS NULL AND a.status IN ('WAITING', 'BOARDED'))
    > (SELECT passenger_capacity FROM vc_vehicle WHERE id = NEW.vehicle_id)
BEGIN SELECT RAISE(ABORT, 'lc02_capacity: xe mới ít chỗ hơn số người đã xếp'); END;
-- Trên bảng xe (của chính module): giảm số chỗ dưới tải của một chuyến chưa kết thúc.
CREATE TRIGGER vc_vehicle_trip_capacity BEFORE UPDATE OF passenger_capacity ON vc_vehicle
WHEN NEW.passenger_capacity < OLD.passenger_capacity
  AND EXISTS (SELECT 1 FROM vc_trip t WHERE t.vehicle_id = NEW.id AND t.status IN ('PLANNED', 'RUNNING')
    AND (SELECT count(*) FROM vc_trip_allocation a WHERE a.trip_id = t.id AND a.valid_to_at IS NULL AND a.status IN ('WAITING', 'BOARDED')) > NEW.passenger_capacity)
BEGIN SELECT RAISE(ABORT, 'lc02_capacity: xe còn chuyến chưa kết thúc chở nhiều người hơn số chỗ mới'); END;
-- Ngừng dùng xe còn chuyến chưa kết thúc. (Bảo dưỡng KHÔNG bị chặn ở đây — chuyến bị GIỮ ở cổng xuất bến, kế hoạch mục 4 điểm 17.)
CREATE TRIGGER vc_vehicle_trip_retire BEFORE UPDATE OF status ON vc_vehicle
WHEN NEW.status = 'retired' AND OLD.status <> 'retired'
  AND EXISTS (SELECT 1 FROM vc_trip t WHERE t.vehicle_id = NEW.id AND t.status IN ('PLANNED', 'RUNNING'))
BEGIN SELECT RAISE(ABORT, 'lc02_capacity: xe còn chuyến chưa kết thúc — không ngừng dùng được'); END;

-- =========================================================================================================================================================
-- LC-03 — xe và tài xế không chồng giờ (khoảng nửa mở [planned_start_ms, COALESCE(ended_ms, planned_end_ms)), chuyến huỷ không tính — kế hoạch I22);
-- mỗi xe, mỗi tài xế chỉ một chuyến đang chạy.
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_overlap_ins BEFORE INSERT ON vc_trip
WHEN NEW.status <> 'CANCELLED' AND EXISTS (
  SELECT 1 FROM vc_trip o
   WHERE o.vehicle_id = NEW.vehicle_id AND o.status <> 'CANCELLED'
     AND o.planned_start_ms < NEW.planned_end_ms AND NEW.planned_start_ms < COALESCE(o.ended_ms, o.planned_end_ms))
BEGIN SELECT RAISE(ABORT, 'lc03_overlap: xe đã có chuyến trùng giờ'); END;
-- Đổi giờ / đổi xe: xét XE và — bản soi K-03 (a) — TÀI XẾ ĐANG MỞ của chính chuyến (đổi giờ T2 mà chồng T1 cùng tài xế → chặn).
CREATE TRIGGER vc_trip_overlap_upd BEFORE UPDATE OF planned_start_ms, planned_end_ms, vehicle_id ON vc_trip
WHEN NEW.status <> 'CANCELLED'
  AND (NEW.planned_start_ms IS NOT OLD.planned_start_ms OR NEW.planned_end_ms IS NOT OLD.planned_end_ms OR NEW.vehicle_id IS NOT OLD.vehicle_id)
  AND (EXISTS (
        SELECT 1 FROM vc_trip o
         WHERE o.id <> NEW.id AND o.vehicle_id = NEW.vehicle_id AND o.status <> 'CANCELLED'
           AND o.planned_start_ms < NEW.planned_end_ms AND NEW.planned_start_ms < COALESCE(o.ended_ms, o.planned_end_ms))
    OR EXISTS (
        SELECT 1 FROM vc_trip_driver d
          JOIN vc_trip_driver d2 ON d2.driver_party_id = d.driver_party_id AND d2.valid_to_at IS NULL AND d2.trip_id <> NEW.id
          JOIN vc_trip o ON o.id = d2.trip_id
         WHERE d.trip_id = NEW.id AND d.valid_to_at IS NULL AND o.status <> 'CANCELLED'
           AND o.planned_start_ms < NEW.planned_end_ms AND NEW.planned_start_ms < COALESCE(o.ended_ms, o.planned_end_ms)))
BEGIN SELECT RAISE(ABORT, 'lc03_overlap: xe hoặc tài xế đã có chuyến trùng giờ'); END;
-- Gán tài xế: tài xế không có chuyến khác (chưa huỷ, dòng lái đang mở) chồng giờ.
CREATE TRIGGER vc_trip_driver_overlap_ins BEFORE INSERT ON vc_trip_driver
WHEN NEW.valid_to_at IS NULL AND EXISTS (
  SELECT 1 FROM vc_trip t
    JOIN vc_trip_driver d2 ON d2.driver_party_id = NEW.driver_party_id AND d2.valid_to_at IS NULL AND d2.trip_id <> NEW.trip_id
    JOIN vc_trip o ON o.id = d2.trip_id
   WHERE t.id = NEW.trip_id AND o.status <> 'CANCELLED'
     AND o.planned_start_ms < t.planned_end_ms AND t.planned_start_ms < COALESCE(o.ended_ms, o.planned_end_ms))
BEGIN SELECT RAISE(ABORT, 'lc03_overlap: tài xế đã có chuyến trùng giờ'); END;
-- Mỗi tài xế chỉ một chuyến đang chạy (chỉ mục của xe ở trên).
CREATE TRIGGER vc_trip_driver_one_running BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status = 'RUNNING' AND OLD.status <> 'RUNNING' AND EXISTS (
  SELECT 1 FROM vc_trip_driver d
    JOIN vc_trip_driver d2 ON d2.driver_party_id = d.driver_party_id AND d2.valid_to_at IS NULL AND d2.trip_id <> NEW.id
    JOIN vc_trip o ON o.id = d2.trip_id AND o.status = 'RUNNING'
   WHERE d.trip_id = NEW.id AND d.valid_to_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'lc03_overlap: tài xế đang chạy chuyến khác'); END;

-- =========================================================================================================================================================
-- LC-05 — chỉ xuất bến khi có dòng kiểm điều kiện ĐẠT mang DẤU LỆNH HIỆN HÀNH (dòng của lô trước không tính).
-- ADR-0050 VK1-A — xuất bến (giờ XẢY RA) không sớm hơn giờ GHI NHẬN của mọi sự kiện trước của chuyến (vế 5: không sớm hơn lần sửa kế hoạch cuối); sự kiện
-- mang dấu lệnh hiện hành (chính lô xuất bến) không tự chặn mình. "Sự kiện của chuyến" gồm cả sự kiện DỜI khách VÀO chuyến (related_trip_id).
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_running_requires_check BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status = 'RUNNING' AND OLD.status = 'PLANNED' AND NOT EXISTS (
  SELECT 1 FROM vc_trip_departure_check c WHERE c.trip_id = NEW.id AND c.ket_qua = 'DAT' AND c.cmd_id = NEW.last_cmd_id)
BEGIN SELECT RAISE(ABORT, 'lc05_departure_check: chưa có kết quả kiểm điều kiện xuất bến đạt của lệnh này'); END;
CREATE TRIGGER vc_trip_departed_after_plan BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status = 'RUNNING' AND OLD.status = 'PLANNED'
  AND NEW.departed_at < (SELECT max(e.created_at) FROM vc_trip_event e WHERE (e.trip_id = NEW.id OR e.related_trip_id = NEW.id) AND e.id <> NEW.last_cmd_id)
BEGIN SELECT RAISE(ABORT, 'vk1a_departed_before_plan: giờ xuất bến sớm hơn lần sửa kế hoạch cuối của chuyến'); END;
-- ADR-0050 VK1-A (kế hoạch I36): sau xuất bến, MỌI sự kiện mới của chuyến có giờ xảy ra ≥ giờ xuất bến (sự kiện kế hoạch: xảy ra = ghi nhận ≥ xuất bến).
CREATE TRIGGER vc_trip_event_after_departure BEFORE INSERT ON vc_trip_event
WHEN NEW.occurred_ms < (SELECT t.departed_ms FROM vc_trip t WHERE t.id = NEW.trip_id)
BEGIN SELECT RAISE(ABORT, 'vk1a_before_departure: giờ xảy ra sớm hơn giờ xuất bến của chuyến'); END;

-- =========================================================================================================================================================
-- LC-06 — chuyến đã kết thúc hay huỷ: không sửa (cả dòng tài xế, điểm, suất, sự kiện mới).
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_final_frozen BEFORE UPDATE ON vc_trip
WHEN OLD.status IN ('ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')
BEGIN SELECT RAISE(ABORT, 'lc06_final: chuyến đã kết thúc hoặc huỷ — không sửa'); END;
CREATE TRIGGER vc_trip_driver_trip_final_ins BEFORE INSERT ON vc_trip_driver
WHEN (SELECT status FROM vc_trip WHERE id = NEW.trip_id) IN ('ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')
BEGIN SELECT RAISE(ABORT, 'lc06_final: chuyến đã kết thúc hoặc huỷ — không sửa'); END;
CREATE TRIGGER vc_trip_driver_trip_final_upd BEFORE UPDATE ON vc_trip_driver
WHEN (SELECT status FROM vc_trip WHERE id = OLD.trip_id) IN ('ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')
BEGIN SELECT RAISE(ABORT, 'lc06_final: chuyến đã kết thúc hoặc huỷ — không sửa'); END;
CREATE TRIGGER vc_trip_stop_trip_final_ins BEFORE INSERT ON vc_trip_stop
WHEN (SELECT status FROM vc_trip WHERE id = NEW.trip_id) IN ('ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')
BEGIN SELECT RAISE(ABORT, 'lc06_final: chuyến đã kết thúc hoặc huỷ — không sửa'); END;
CREATE TRIGGER vc_trip_stop_trip_final_upd BEFORE UPDATE ON vc_trip_stop
WHEN (SELECT status FROM vc_trip WHERE id = OLD.trip_id) IN ('ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')
BEGIN SELECT RAISE(ABORT, 'lc06_final: chuyến đã kết thúc hoặc huỷ — không sửa'); END;
CREATE TRIGGER vc_trip_allocation_trip_final_ins BEFORE INSERT ON vc_trip_allocation
WHEN (SELECT status FROM vc_trip WHERE id = NEW.trip_id) IN ('ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')
BEGIN SELECT RAISE(ABORT, 'lc06_final: chuyến đã kết thúc hoặc huỷ — không sửa'); END;
CREATE TRIGGER vc_trip_allocation_trip_final_upd BEFORE UPDATE ON vc_trip_allocation
WHEN (SELECT status FROM vc_trip WHERE id = OLD.trip_id) IN ('ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')
BEGIN SELECT RAISE(ABORT, 'lc06_final: chuyến đã kết thúc hoặc huỷ — không sửa'); END;
CREATE TRIGGER vc_trip_event_trip_final BEFORE INSERT ON vc_trip_event
WHEN (SELECT status FROM vc_trip WHERE id = NEW.trip_id) IN ('ENDED', 'ENDED_INTERRUPTED', 'CANCELLED')
BEGIN SELECT RAISE(ABORT, 'lc06_final: chuyến đã kết thúc hoặc huỷ — không ghi sự kiện mới'); END;

-- =========================================================================================================================================================
-- LC-07 — trạng thái chỉ đi tiến.
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_status_forward BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status IS NOT OLD.status
  AND NOT ((OLD.status = 'PLANNED' AND NEW.status IN ('RUNNING', 'CANCELLED')) OR (OLD.status = 'RUNNING' AND NEW.status IN ('ENDED', 'ENDED_INTERRUPTED')))
BEGIN SELECT RAISE(ABORT, 'lc07_forward: trạng thái chuyến chỉ đi tiến'); END;
-- Điểm: PENDING → ARRIVED → DONE; PENDING → SKIPPED; PENDING → MOVED (lượt 2); ARRIVED → SKIPPED CHỈ trong lô "Kết thúc gián đoạn" (sự kiện mang dấu
-- lệnh hiện hành của chuyến có kind = 'ENDED_INTERRUPTED').
CREATE TRIGGER vc_trip_stop_status_forward BEFORE UPDATE OF status ON vc_trip_stop
WHEN NEW.status IS NOT OLD.status
  AND NOT ((OLD.status = 'PENDING' AND NEW.status IN ('ARRIVED', 'SKIPPED', 'MOVED'))
        OR (OLD.status = 'ARRIVED' AND NEW.status = 'DONE')
        OR (OLD.status = 'ARRIVED' AND NEW.status = 'SKIPPED' AND EXISTS (
              SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id WHERE t.id = NEW.trip_id AND e.kind = 'ENDED_INTERRUPTED')))
BEGIN SELECT RAISE(ABORT, 'lc07_forward: trạng thái điểm dừng chỉ đi tiến'); END;
-- Suất: WAITING → BOARDED → DROPPED; WAITING → NO_SHOW → BOARDED (đón muộn — bước lùi duy nhất); WAITING → CANCELLED_AT_STOP.
CREATE TRIGGER vc_trip_allocation_status_forward BEFORE UPDATE OF status ON vc_trip_allocation
WHEN NEW.status IS NOT OLD.status
  AND NOT ((OLD.status = 'WAITING' AND NEW.status IN ('BOARDED', 'NO_SHOW', 'CANCELLED_AT_STOP'))
        OR (OLD.status = 'NO_SHOW' AND NEW.status = 'BOARDED')
        OR (OLD.status = 'BOARDED' AND NEW.status = 'DROPPED'))
BEGIN SELECT RAISE(ABORT, 'lc07_forward: trạng thái suất chỉ đi tiến'); END;

-- =========================================================================================================================================================
-- LC-09 — chỉ chặng CÒN HIỆU LỰC của đơn ĐÃ XÁC NHẬN, CHƯA HUỶ mới lên xe (đọc view công bố của orders). Đơn huỷ SAU khi xếp → máy chủ GIỮ chuyến.
-- LC-10 — người gắn vào suất thuộc ĐÚNG đơn của chặng và còn dòng hiện hành.
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_allocation_leg_open BEFORE INSERT ON vc_trip_allocation
WHEN NEW.kind = 'PASSENGER' AND NOT EXISTS (
  SELECT 1 FROM v_ord_leg_key k JOIN v_ord_order_flag f ON f.id = k.order_id
   WHERE k.id = NEW.leg_id AND k.is_open = 1 AND f.is_confirmed = 1 AND f.is_cancelled = 0)
BEGIN SELECT RAISE(ABORT, 'lc09_leg: chặng không còn hiệu lực hoặc đơn chưa xác nhận / đã huỷ'); END;
CREATE TRIGGER vc_trip_allocation_person_order_ins BEFORE INSERT ON vc_trip_allocation
WHEN NEW.passenger_key IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM v_ord_passenger_key p JOIN v_ord_leg_key k ON k.id = NEW.leg_id
   WHERE p.person_key = NEW.passenger_key AND p.order_id = k.order_id AND p.has_current_row = 1)
BEGIN SELECT RAISE(ABORT, 'lc10_person: người không thuộc đơn của chặng hoặc không còn dòng hiện hành'); END;
CREATE TRIGGER vc_trip_allocation_person_order_upd BEFORE UPDATE OF passenger_key ON vc_trip_allocation
WHEN NEW.passenger_key IS NOT NULL AND NEW.passenger_key IS NOT OLD.passenger_key AND NOT EXISTS (
  SELECT 1 FROM v_ord_passenger_key p JOIN v_ord_leg_key k ON k.id = NEW.leg_id
   WHERE p.person_key = NEW.passenger_key AND p.order_id = k.order_id AND p.has_current_row = 1)
BEGIN SELECT RAISE(ABORT, 'lc10_person: người không thuộc đơn của chặng hoặc không còn dòng hiện hành'); END;

-- R-P19 (chủ chốt 29/9, Trả lời lần 13): bản chốt trỏ DÒNG HIỆN HÀNH của đúng người của suất, thuộc đúng đơn của chặng, cùng chuyến với suất (thay khoá ngoại
-- sang ord_passenger — đọc view công bố v_ord_passenger_row + v_ord_leg_key). Dòng người đi kèm (crew_party_id) chỉ cần cùng chuyến với suất CREW.
CREATE TRIGGER vc_trip_manifest_scope BEFORE INSERT ON vc_trip_manifest
WHEN NOT EXISTS (SELECT 1 FROM vc_trip_allocation a WHERE a.id = NEW.allocation_id AND a.trip_id = NEW.trip_id)
  OR (NEW.passenger_row_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM vc_trip_allocation a JOIN v_ord_leg_key k ON k.id = a.leg_id JOIN v_ord_passenger_row r ON r.id = NEW.passenger_row_id
         WHERE a.id = NEW.allocation_id AND a.kind = 'PASSENGER' AND r.person_key = a.passenger_key AND r.order_id = k.order_id AND r.is_current = 1))
  OR (NEW.crew_party_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM vc_trip_allocation a WHERE a.id = NEW.allocation_id AND a.kind = 'CREW' AND a.crew_party_id = NEW.crew_party_id))
BEGIN SELECT RAISE(ABORT, 'lc10_manifest: bản chốt phải trỏ dòng hiện hành của đúng người, đúng đơn, đúng chuyến của suất'); END;

-- =========================================================================================================================================================
-- LC-13 — không chéo xe ↔ tài xế (kế hoạch I21; đọc view công bố HIỆN TẠI của parties — "vào ngày chạy" giữ bằng kiemXuatBen + R-VC-8):
--   xe của nhà xe X ⇒ (X, tài xế) có trong v_pty_carrier_driver; xe KHÔNG thuộc nhà xe nào (công ty, kể cả công ty chủ cũ) ⇒ tài xế không thuộc nhà xe nào.
-- "Tài xế công ty đang mở vai" chỉ máy chủ giữ (taiXeChoDieuPhoi — R-P8). carrier_party_id của chuyến = chủ hiện tại của xe lúc ghi.
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_carrier_ins BEFORE INSERT ON vc_trip
WHEN NEW.carrier_party_id IS NOT (SELECT owner_party_id FROM vc_vehicle WHERE id = NEW.vehicle_id)
BEGIN SELECT RAISE(ABORT, 'lc13_carrier: chủ xe chụp của chuyến phải là chủ hiện tại của xe'); END;
CREATE TRIGGER vc_trip_driver_carrier_ins BEFORE INSERT ON vc_trip_driver
WHEN NEW.valid_to_at IS NULL AND (
  (EXISTS (SELECT 1 FROM vc_trip t JOIN v_pty_carrier c ON c.party_id = t.carrier_party_id WHERE t.id = NEW.trip_id)
    AND NOT EXISTS (SELECT 1 FROM vc_trip t JOIN v_pty_carrier_driver cd ON cd.carrier_party_id = t.carrier_party_id
                     WHERE t.id = NEW.trip_id AND cd.driver_party_id = NEW.driver_party_id))
  OR (NOT EXISTS (SELECT 1 FROM vc_trip t JOIN v_pty_carrier c ON c.party_id = t.carrier_party_id WHERE t.id = NEW.trip_id)
    AND EXISTS (SELECT 1 FROM v_pty_carrier_driver cd WHERE cd.driver_party_id = NEW.driver_party_id)))
BEGIN SELECT RAISE(ABORT, 'lc13_cross: tài xế không thuộc chủ của xe'); END;
CREATE TRIGGER vc_trip_vehicle_carrier_upd BEFORE UPDATE OF vehicle_id, carrier_party_id ON vc_trip
WHEN (NEW.vehicle_id IS NOT OLD.vehicle_id OR NEW.carrier_party_id IS NOT OLD.carrier_party_id) AND (
  NEW.carrier_party_id IS NOT (SELECT owner_party_id FROM vc_vehicle WHERE id = NEW.vehicle_id)
  OR (EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
    AND EXISTS (SELECT 1 FROM vc_trip_driver d WHERE d.trip_id = NEW.id AND d.valid_to_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM v_pty_carrier_driver cd WHERE cd.carrier_party_id = NEW.carrier_party_id AND cd.driver_party_id = d.driver_party_id)))
  OR (NOT EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
    AND EXISTS (SELECT 1 FROM vc_trip_driver d JOIN v_pty_carrier_driver cd ON cd.driver_party_id = d.driver_party_id
                 WHERE d.trip_id = NEW.id AND d.valid_to_at IS NULL)))
BEGIN SELECT RAISE(ABORT, 'lc13_cross: tài xế không thuộc chủ của xe mới'); END;
-- Trên bảng xe: đổi chủ xe khi xe còn chuyến chưa kết thúc → chặn (chủ chụp của chuyến sẽ lệch).
CREATE TRIGGER vc_vehicle_trip_owner_upd BEFORE UPDATE OF owner_party_id ON vc_vehicle
WHEN NEW.owner_party_id IS NOT OLD.owner_party_id
  AND EXISTS (SELECT 1 FROM vc_trip t WHERE t.vehicle_id = NEW.id AND t.status IN ('PLANNED', 'RUNNING'))
BEGIN SELECT RAISE(ABORT, 'lc13_owner: xe còn chuyến chưa kết thúc — không đổi chủ xe'); END;

-- =========================================================================================================================================================
-- LC-15 — chuyến ĐANG CHẠY: cấm mở / đóng suất, thêm điểm, đổi xe, đổi / thêm tài xế, đổi thứ tự / giờ xe tới của điểm đã tới. Chỉ cho: trạng thái tiến độ;
-- đổi seq / giờ xe tới của điểm PENDING; gắn passenger_key một lần. NGOẠI LỆ DUY NHẤT: đóng suất với TRIP_INTERRUPTED khi sự kiện mang dấu lệnh HIỆN HÀNH
-- của chuyến là ENDED_INTERRUPTED (chỉ đúng trong chính lô "Kết thúc gián đoạn" — khuôn LC-05; [TK] §2.1a câu 4).
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_running_locked_alloc_ins BEFORE INSERT ON vc_trip_allocation
WHEN (SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING'
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không xếp thêm'); END;
CREATE TRIGGER vc_trip_running_locked_alloc_close BEFORE UPDATE OF valid_to_at ON vc_trip_allocation
WHEN OLD.valid_to_at IS NULL AND NEW.valid_to_at IS NOT NULL
  AND (SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING'
  AND NOT (NEW.close_reason = 'TRIP_INTERRUPTED' AND EXISTS (
    SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
     WHERE t.id = NEW.trip_id AND t.status = 'RUNNING' AND e.kind = 'ENDED_INTERRUPTED'))
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không rút khách'); END;
CREATE TRIGGER vc_trip_running_locked_stop_ins BEFORE INSERT ON vc_trip_stop
WHEN (SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING'
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không thêm điểm'); END;
CREATE TRIGGER vc_trip_running_locked_stop_upd BEFORE UPDATE OF seq, planned_date, planned_time ON vc_trip_stop
WHEN OLD.status <> 'PENDING' AND (SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING'
  AND (NEW.seq IS NOT OLD.seq OR NEW.planned_date IS NOT OLD.planned_date OR NEW.planned_time IS NOT OLD.planned_time)
BEGIN SELECT RAISE(ABORT, 'lc15_running: điểm đã tới — không đổi thứ tự, giờ xe tới'); END;
CREATE TRIGGER vc_trip_running_locked_vehicle BEFORE UPDATE OF vehicle_id ON vc_trip
WHEN OLD.status = 'RUNNING' AND NEW.vehicle_id IS NOT OLD.vehicle_id
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không đổi xe'); END;
CREATE TRIGGER vc_trip_running_locked_driver_ins BEFORE INSERT ON vc_trip_driver
WHEN (SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING'
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không đổi tài xế'); END;
CREATE TRIGGER vc_trip_running_locked_driver_upd BEFORE UPDATE ON vc_trip_driver
WHEN (SELECT status FROM vc_trip WHERE id = OLD.trip_id) = 'RUNNING'
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không đổi tài xế'); END;

-- =========================================================================================================================================================
-- LC-16 — chỉ kết thúc (thường hay gián đoạn) khi không còn suất mở WAITING / BOARDED và không còn điểm PENDING / ARRIVED.
-- =========================================================================================================================================================
CREATE TRIGGER vc_trip_end_requires_settled BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status IN ('ENDED', 'ENDED_INTERRUPTED') AND OLD.status = 'RUNNING' AND (
  EXISTS (SELECT 1 FROM vc_trip_allocation a WHERE a.trip_id = NEW.id AND a.valid_to_at IS NULL AND a.status IN ('WAITING', 'BOARDED'))
  OR EXISTS (SELECT 1 FROM vc_trip_stop s WHERE s.trip_id = NEW.id AND s.status IN ('PENDING', 'ARRIVED')))
BEGIN SELECT RAISE(ABORT, 'lc16_unsettled: còn khách hoặc điểm chưa xong'); END;
