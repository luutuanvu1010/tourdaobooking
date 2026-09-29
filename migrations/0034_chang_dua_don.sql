-- Migration 0034 — CHẶNG ĐƯA ĐÓN (ADR-0047 A1, accepted 2026-09-28; module orders; kế hoạch docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md mục
-- 1.1, 1.5, 1.6). Chỉ THÊM (expand, phát hành 1): bảng `ord_transfer_leg` + chỉ mục; ba loại điểm mới; CHÉP giờ/nơi đón cũ của `order_service` thành
-- chặng chiều đi; trigger. Hai cột cũ `order_service.pickup_time/pickup_place` KHÔNG bị đụng (mã phát hành 1 ghi kép — Ruling R3; phát hành 2 mới ngừng).
-- Chặng = một lần hẹn đưa HOẶC đón khách của MỘT dòng dịch vụ. Không mang tiền. Nguồn duy nhất của "hẹn đưa, đón khách" (thực hiện ADR-0006 điều 6:
-- có dòng chặng còn hiệu lực = "có hẹn đón").

CREATE TABLE ord_transfer_leg (
  id                  TEXT PRIMARY KEY,
  order_id            TEXT NOT NULL REFERENCES orders(id),
  order_service_id    TEXT NOT NULL REFERENCES order_service(id),
  direction           TEXT NOT NULL CHECK (direction IN ('OUT', 'RETURN')),
  -- Ngày đón dân sự giờ VN; trống CHỈ khi đơn còn nháp và dịch vụ chưa có ngày đi (Ruling R4a — trigger `ord_transfer_leg_date_*` giữ phần "đơn không nháp").
  pickup_date         TEXT CHECK (pickup_date IS NULL OR date(pickup_date) IS pickup_date),
  -- Giờ đón HH:MM; NULL = có hẹn nhưng chưa chốt giờ.
  pickup_time         TEXT CHECK (pickup_time IS NULL OR pickup_time GLOB '[01][0-9]:[0-5][0-9]' OR pickup_time GLOB '2[0-3]:[0-5][0-9]'),
  pickup_location_id  TEXT REFERENCES loc_location(id),
  pickup_place        TEXT CHECK (pickup_place IS NULL OR length(trim(pickup_place)) BETWEEN 1 AND 200),
  dropoff_location_id TEXT REFERENCES loc_location(id),
  dropoff_place       TEXT CHECK (dropoff_place IS NULL OR length(trim(dropoff_place)) BETWEEN 1 AND 200),
  -- NULL = còn hiệu lực. Bỏ chặng sau xác nhận = đóng dòng có lý do (danh sách đóng ở mã — Ruling R6, không CHECK liệt kê).
  closed_at           TEXT,
  close_reason_code   TEXT,
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  -- Nơi đón ĐÚNG MỘT (điểm danh mục hoặc chữ tự do); nơi trả TỐI ĐA MỘT (cả hai trống = nơi trả chưa chốt); đóng ⇔ có lý do.
  CHECK ((pickup_location_id IS NULL) <> (pickup_place IS NULL)),
  CHECK (dropoff_location_id IS NULL OR dropoff_place IS NULL),
  CHECK ((closed_at IS NULL) = (close_reason_code IS NULL))
);
CREATE INDEX ord_transfer_leg_order_ix ON ord_transfer_leg(order_id);
CREATE INDEX ord_transfer_leg_service_ix ON ord_transfer_leg(order_service_id);
CREATE INDEX ord_transfer_leg_date_ix ON ord_transfer_leg(pickup_date);

-- Ba loại điểm mới cho nơi đón/trả (ADR-0047 A1) — chỉ thêm dòng, nối thứ tự sau PORT (4). Khuôn 0010.
INSERT INTO loc_location_type (code, name, sort_order) VALUES ('HOTEL', 'Khách sạn', 5), ('AIRPORT', 'Sân bay', 6), ('CABLE_CAR', 'Ga cáp treo', 7);

-- CHÉP dữ liệu đón cũ (kế hoạch mục 1.6) — chạy SAU CREATE TABLE, TRƯỚC các trigger (trigger không chặn câu chép). Nguồn: MỌI dịch vụ có giờ đón HOẶC nơi
-- đón khác rỗng, MỌI trạng thái đơn (kể cả đã huỷ — lịch sử). Mỗi dịch vụ → ĐÚNG MỘT chặng chiều đi:
--   id: 36 ký tự khuôn 8-4-4-4-12 chữ hex thường (khớp UUID_RE của src/shared/http.ts — route sửa/đóng chặng nhận được :legId của chặng chép);
--   ngày đón = ngày đi của dịch vụ (có thể trống với đơn nháp/huỷ chưa có ngày — R4a); giờ đón như cũ; nơi đón = chữ cũ đã cắt khoảng trắng;
--   dịch vụ có giờ mà KHÔNG có nơi đón → nơi đón '(chưa ghi nơi đón)' (câu hỏi Q1, mặc định (a) — GIẢ ĐỊNH chờ chủ chạy truy vấn đếm; hằng
--   NOI_DON_CHUA_GHI ở src/shared/chang-dua-don.ts; kiểm định kỳ R-ORD-12 liệt kê chặng mở còn chữ này);
--   nơi trả = nơi check-in của dịch vụ nếu có, không thì để trống (nơi trả chưa chốt — kiểm định kỳ R-ORD-8);
--   created_at = updated_at = mốc migration cố định; created_by NULL (hệ thống).
INSERT INTO ord_transfer_leg (
  id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, dropoff_place,
  closed_at, close_reason_code, created_at, created_by, updated_at, updated_by
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
  s.order_id, s.id, 'OUT', s.depart_date, s.pickup_time, NULL,
  COALESCE(NULLIF(trim(s.pickup_place), ''), '(chưa ghi nơi đón)'),
  NULL, NULLIF(trim(s.checkin_place), ''),
  NULL, NULL, '2026-09-29T00:00:00.000Z', NULL, '2026-09-29T00:00:00.000Z', NULL
FROM order_service s
WHERE s.pickup_time IS NOT NULL OR NULLIF(trim(s.pickup_place), '') IS NOT NULL;

-- Phạm vi đơn: `order_id` của chặng = `order_id` của dịch vụ (khuôn order_item_service_scope_*, 0008).
CREATE TRIGGER ord_transfer_leg_scope_ins BEFORE INSERT ON ord_transfer_leg
WHEN (SELECT order_id FROM order_service WHERE id = NEW.order_service_id) IS NOT NEW.order_id
BEGIN SELECT RAISE(ABORT, 'leg_scope: dịch vụ thuộc đơn khác'); END;
CREATE TRIGGER ord_transfer_leg_scope_upd BEFORE UPDATE ON ord_transfer_leg
WHEN (SELECT order_id FROM order_service WHERE id = NEW.order_service_id) IS NOT NEW.order_id
BEGIN SELECT RAISE(ABORT, 'leg_scope: dịch vụ thuộc đơn khác'); END;

-- Không xoá cứng sau xác nhận (Hiến chương 5.5). Đơn NHÁP: lưu nháp xoá–chèn lại chặng cùng lô (ADR-0047 A1; lệch có chủ ý hẹp — chủ trả lời Q0
-- 2026-09-29 "Cách 1: chỉ giữ bản cuối"; ngoại lệ có tên XOA_CUNG_NHAP ở src/architecture.test.ts).
CREATE TRIGGER ord_transfer_leg_no_delete BEFORE DELETE ON ord_transfer_leg
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'leg_frozen: đơn không còn nháp — bỏ chặng thì đóng dòng'); END;

-- Danh tính chặng bền từ lúc xác nhận: không đổi đơn, dịch vụ, chiều, mốc tạo (Vận chuyển tham chiếu chặng của đơn đã xác nhận).
CREATE TRIGGER ord_transfer_leg_identity BEFORE UPDATE ON ord_transfer_leg
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.id IS NOT OLD.id OR NEW.order_id IS NOT OLD.order_id OR NEW.order_service_id IS NOT OLD.order_service_id OR NEW.direction IS NOT OLD.direction
    OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by)
BEGIN SELECT RAISE(ABORT, 'leg_identity: không đổi đơn, dịch vụ, chiều của chặng'); END;

-- SIẾT thêm ngoài bốn trigger ADR liệt kê (kế hoạch mục 16 điểm 2): chặng đã đóng không sửa, không mở lại.
CREATE TRIGGER ord_transfer_leg_closed BEFORE UPDATE ON ord_transfer_leg
WHEN OLD.closed_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'leg_closed: chặng đã đóng — không sửa, không mở lại'); END;

-- SIẾT: đơn không còn nháp thì chặng CÒN MỞ phải có ngày đón (Ruling R4d — lưới; máy chủ tự điền trước).
CREATE TRIGGER ord_transfer_leg_date_ins BEFORE INSERT ON ord_transfer_leg
WHEN NEW.pickup_date IS NULL AND NEW.closed_at IS NULL AND (SELECT status FROM orders WHERE id = NEW.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'leg_date: chặng của đơn đã xác nhận phải có ngày đón'); END;
CREATE TRIGGER ord_transfer_leg_date_upd BEFORE UPDATE ON ord_transfer_leg
WHEN NEW.pickup_date IS NULL AND NEW.closed_at IS NULL AND (SELECT status FROM orders WHERE id = NEW.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'leg_date: chặng của đơn đã xác nhận phải có ngày đón'); END;

-- Lưới ở LÚC xác nhận (khuôn orders_confirm_requires_trip, 0008): còn chặng mở thiếu ngày đón thì không xác nhận được. Máy chủ điền ngày đi vào chặng
-- thiếu ngày TRONG CÙNG LÔ, trước câu đổi trạng thái (Ruling R4c) — người dùng không gặp lỗi này.
CREATE TRIGGER orders_confirm_requires_leg_date BEFORE UPDATE ON orders
WHEN NEW.status = 'confirmed' AND OLD.status <> 'confirmed'
  AND EXISTS (SELECT 1 FROM ord_transfer_leg WHERE order_id = NEW.id AND closed_at IS NULL AND pickup_date IS NULL)
BEGIN SELECT RAISE(ABORT, 'incomplete_trip: chặng đưa đón thiếu ngày đón'); END;
