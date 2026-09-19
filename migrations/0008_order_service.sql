-- Thông tin chuyến đi theo từng dịch vụ trong đơn (docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md §3).
-- Cửa MỘT CHIỀU (schema order). Chỉ thêm bảng/cột/trigger; không sửa bảng đã có dữ liệu.

-- 1) Một dịch vụ trong đơn: số khách theo loại + thông tin chuyến. Tiền vẫn ở order_item.
--    CHECK chỉ cho bất biến không đổi (khuôn dạng ngày/giờ, số khách >= 0); trần 50 khách nằm ở code (MAX_GUESTS_PER_SERVICE).
CREATE TABLE order_service (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  catalog_code  TEXT,                 -- NULL = nhập tay; không FK (như order_item.catalog_code)
  name          TEXT NOT NULL,        -- chụp lúc lập đơn
  unit          TEXT NOT NULL,        -- chuỗi đơn vị của Sheet lúc lập đơn ('perPax', 'per5Pax'…); 'manual' = nhập tay
  pax_adult     INTEGER NOT NULL DEFAULT 0 CHECK (pax_adult  >= 0),  -- dịch vụ tính "số khách": lưu ở đây
  pax_child     INTEGER NOT NULL DEFAULT 0 CHECK (pax_child  >= 0),
  pax_senior    INTEGER NOT NULL DEFAULT 0 CHECK (pax_senior >= 0),
  pax_infant    INTEGER NOT NULL DEFAULT 0 CHECK (pax_infant >= 0),
  depart_date   TEXT CHECK (date(depart_date) IS depart_date),       -- YYYY-MM-DD, giờ Việt Nam
  depart_time   TEXT CHECK (depart_time  IS NULL OR depart_time  GLOB '[01][0-9]:[0-5][0-9]' OR depart_time  GLOB '2[0-3]:[0-5][0-9]'),
  pickup_time   TEXT CHECK (pickup_time  IS NULL OR pickup_time  GLOB '[01][0-9]:[0-5][0-9]' OR pickup_time  GLOB '2[0-3]:[0-5][0-9]'),
  pickup_place  TEXT,
  checkin_date  TEXT CHECK (date(checkin_date) IS checkin_date),     -- NULL = cùng ngày khởi hành (không lưu trùng)
  checkin_time  TEXT CHECK (checkin_time IS NULL OR checkin_time GLOB '[01][0-9]:[0-5][0-9]' OR checkin_time GLOB '2[0-3]:[0-5][0-9]'),
  checkin_place TEXT,
  note          TEXT
);
CREATE INDEX idx_order_service_order  ON order_service(order_id);
CREATE INDEX idx_order_service_depart ON order_service(depart_date);

-- 2) Dòng tiền trỏ về dịch vụ của nó. `catalog_price` = giá danh mục hiệu lực lúc lập dòng (NULL = nhập tay) để lệch giá
--    còn truy được về sau; `pax_code` = loại khách của dòng (NULL = nhập tay). Cột thêm sau, mặc định NULL nên SQLite cho phép REFERENCES.
ALTER TABLE order_item ADD COLUMN service_id TEXT REFERENCES order_service(id);
ALTER TABLE order_item ADD COLUMN catalog_price INTEGER;
ALTER TABLE order_item ADD COLUMN pax_code TEXT CHECK (pax_code IN ('adult', 'child', 'senior', 'infant'));
CREATE INDEX idx_order_item_service ON order_item(service_id);

-- 3) Đơn cũ: mỗi dòng tiền cũ thành một dịch vụ nhập tay (khách = 0, chưa có thông tin chuyến), dùng lại id của dòng làm id dịch vụ.
--    PHẢI chạy trước các trigger bên dưới (đơn đã xác nhận/huỷ sẽ bị trigger chặn chèn dịch vụ).
INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit)
  SELECT id, order_id, sort_order, NULL, description, 'manual' FROM order_item WHERE service_id IS NULL;
UPDATE order_item SET service_id = id WHERE service_id IS NULL;

-- 4) Lưới SQL thứ hai (mẫu 0007): luật chính ở orders/rules.ts + câu UPDATE có điều kiện; đây là chốt cuối nếu một đường code quên.
CREATE TRIGGER order_item_service_scope_insert BEFORE INSERT ON order_item
WHEN NEW.service_id IS NOT NULL AND (SELECT order_id FROM order_service WHERE id = NEW.service_id) IS NOT NEW.order_id
BEGIN SELECT RAISE(ABORT, 'service_scope: service_id thuộc đơn khác'); END;

CREATE TRIGGER order_item_service_scope_update BEFORE UPDATE ON order_item
WHEN NEW.service_id IS NOT NULL AND (SELECT order_id FROM order_service WHERE id = NEW.service_id) IS NOT NEW.order_id
BEGIN SELECT RAISE(ABORT, 'service_scope: service_id thuộc đơn khác'); END;

-- Đơn không còn nháp: không thêm/xoá dịch vụ, không đổi thành phần (dịch vụ, số khách). Trường vận hành (ngày giờ, đón, check-in, ghi chú) vẫn sửa được (Q9).
CREATE TRIGGER order_service_frozen_insert BEFORE INSERT ON order_service
WHEN (SELECT status FROM orders WHERE id = NEW.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: đơn không còn ở trạng thái nháp'); END;

CREATE TRIGGER order_service_frozen_delete BEFORE DELETE ON order_service
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: đơn không còn ở trạng thái nháp'); END;

CREATE TRIGGER order_service_frozen_update BEFORE UPDATE ON order_service
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.order_id IS NOT OLD.order_id OR NEW.sort_order IS NOT OLD.sort_order
    OR NEW.catalog_code IS NOT OLD.catalog_code OR NEW.name IS NOT OLD.name OR NEW.unit IS NOT OLD.unit
    OR NEW.pax_adult IS NOT OLD.pax_adult OR NEW.pax_child IS NOT OLD.pax_child
    OR NEW.pax_senior IS NOT OLD.pax_senior OR NEW.pax_infant IS NOT OLD.pax_infant)
BEGIN SELECT RAISE(ABORT, 'order_frozen: đơn không còn ở trạng thái nháp'); END;

CREATE TRIGGER order_service_confirmed_keeps_date BEFORE UPDATE ON order_service
WHEN NEW.depart_date IS NULL AND (SELECT status FROM orders WHERE id = OLD.order_id) = 'confirmed'
BEGIN SELECT RAISE(ABORT, 'incomplete_trip: đơn đã xác nhận phải có ngày khởi hành'); END;

-- Chỉ LÚC chuyển sang xác nhận (không chặn các cập nhật sau đó, kể cả đơn cũ đã xác nhận từ trước migration này):
-- có ít nhất một dịch vụ, mọi dịch vụ có ngày khởi hành và >= 1 khách. Khoảng ngày (không quá khứ, <= 365 ngày) là luật đổi được → nằm ở code.
CREATE TRIGGER orders_confirm_requires_trip BEFORE UPDATE ON orders
WHEN NEW.status = 'confirmed' AND OLD.status <> 'confirmed'
  AND (NOT EXISTS (SELECT 1 FROM order_service WHERE order_id = NEW.id)
    OR EXISTS (SELECT 1 FROM order_service WHERE order_id = NEW.id
               AND (depart_date IS NULL OR pax_adult + pax_child + pax_senior + pax_infant < 1)))
BEGIN SELECT RAISE(ABORT, 'incomplete_trip: đơn thiếu ngày khởi hành hoặc số khách'); END;
