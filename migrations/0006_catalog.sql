-- 1) audit_log: staff_id cho phép NULL = hành động do hệ thống tự làm (Cron kéo Sheet dịch vụ). Dựng lại bảng như 0005.
CREATE TABLE audit_log_new (
  id          TEXT PRIMARY KEY,
  order_id    TEXT REFERENCES orders(id),
  staff_id    TEXT REFERENCES staff(id),                  -- NULL = hệ thống tự động
  action      TEXT NOT NULL CHECK (action IN (
                'created', 'updated', 'confirmed', 'cancelled', 'exported_png', 'exported_pdf',
                'staff_created', 'staff_updated', 'staff_suspended', 'staff_reactivated', 'staff_role_changed',
                'pin_reset', 'pin_changed', 'login_unlocked', 'staff_synced',
                'catalog_synced', 'catalog_overridden', 'catalog_override_cleared', 'catalog_hidden', 'catalog_unhidden')),
  target_type TEXT CHECK (target_type IN ('order', 'staff', 'catalog')),
  target_id   TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL
);
INSERT INTO audit_log_new (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
  SELECT id, order_id, staff_id, action, target_type, target_id, detail, created_at FROM audit_log;
DROP TABLE audit_log;
ALTER TABLE audit_log_new RENAME TO audit_log;
CREATE INDEX idx_audit_order ON audit_log(order_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- 2) Bản sao danh mục dịch vụ kéo từ Google Sheet (spec §2.4-6). Chỉ các cột cần cho đơn; KHÔNG có Khoá giá / Đường dẫn / Ghi chú nội bộ.
--    Giá là số nguyên VNĐ; NULL = loại khách đó không có giá. `unit` giữ nguyên chuỗi của Sheet (perPax, per5Pax…).
CREATE TABLE catalog_item (
  code          TEXT PRIMARY KEY,                          -- "Mã tour"
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL,
  price_adult   INTEGER NOT NULL CHECK (price_adult >= 0),
  price_child   INTEGER CHECK (price_child >= 0),
  price_senior  INTEGER CHECK (price_senior >= 0),
  price_infant  INTEGER CHECK (price_infant >= 0),
  note_child    TEXT,
  note_senior   TEXT,
  note_infant   TEXT,
  sheet_row     INTEGER,
  in_sheet      INTEGER NOT NULL DEFAULT 1 CHECK (in_sheet IN (0, 1)),  -- 0 = đã biến mất khỏi Sheet (chỉ ẩn, không xoá)
  first_seen_at TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- 3) Ghi đè có chủ đích của Admin. Lần kéo sau KHÔNG đè lên đây. `base_json` = giá của Sheet lúc ghi đè,
--    để biết về sau Sheet có đổi giá hay không (cảnh báo xung đột).
CREATE TABLE catalog_override (
  code       TEXT PRIMARY KEY REFERENCES catalog_item(code),
  hidden     INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  prices_json TEXT,                                        -- {"adult":800000,"child":560000} chỉ các loại khách được ghi đè
  base_json   TEXT,                                        -- {"adult":850000,"child":595000} giá Sheet tại thời điểm ghi đè
  updated_by  TEXT REFERENCES staff(id),
  updated_at  TEXT NOT NULL
);

-- 4) Trạng thái lần kéo gần nhất (đúng một dòng).
CREATE TABLE catalog_sync (
  id              TEXT PRIMARY KEY CHECK (id = 'default'),
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_error_code TEXT,
  last_error      TEXT,
  item_count      INTEGER,
  problems_json   TEXT
);
INSERT INTO catalog_sync (id) VALUES ('default');
