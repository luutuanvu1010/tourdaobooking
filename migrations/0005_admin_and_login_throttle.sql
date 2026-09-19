-- 1) audit_log: cho phép ghi cả hành động không gắn với đơn (quản trị tài khoản, đồng bộ Sheet, ghi đè giá...).
--    SQLite không ALTER được CHECK / NOT NULL nên dựng lại bảng. Bảng chưa có bảng nào tham chiếu tới nó.
CREATE TABLE audit_log_new (
  id          TEXT PRIMARY KEY,
  order_id    TEXT REFERENCES orders(id),                 -- NULL khi hành động không thuộc một đơn
  staff_id    TEXT NOT NULL REFERENCES staff(id),         -- ai thao tác
  action      TEXT NOT NULL CHECK (action IN (
                'created', 'updated', 'confirmed', 'cancelled', 'exported_png', 'exported_pdf',
                'staff_created', 'staff_updated', 'staff_suspended', 'staff_reactivated', 'staff_role_changed',
                'pin_reset', 'pin_changed', 'login_unlocked', 'staff_synced',
                'catalog_synced', 'catalog_overridden', 'catalog_override_cleared', 'catalog_hidden', 'catalog_unhidden')),
  target_type TEXT CHECK (target_type IN ('order', 'staff', 'catalog')),
  target_id   TEXT,                                       -- id đơn / id nhân viên / mã dịch vụ
  detail      TEXT,                                       -- mô tả ngắn cho người đọc; TUYỆT ĐỐI không chứa PIN/bí mật
  created_at  TEXT NOT NULL
);
INSERT INTO audit_log_new (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
  SELECT id, order_id, staff_id, action, 'order', order_id, NULL, created_at FROM audit_log;
DROP TABLE audit_log;
ALTER TABLE audit_log_new RENAME TO audit_log;
CREATE INDEX idx_audit_order ON audit_log(order_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- 2) Phiên đăng nhập cũ mất hiệu lực khi đặt lại/đổi PIN: token phát hành trước mốc này (mili-giây Unix) bị từ chối.
ALTER TABLE staff ADD COLUMN credentials_changed_at INTEGER;

-- 3) Chống dò PIN: mỗi lần thử đăng nhập là một dòng (key = "phone:0xxxxxxxxx" hoặc "ip:<địa chỉ>"),
--    đếm trong cửa sổ trượt. Đăng nhập đúng thì xoá các dòng của key tương ứng.
CREATE TABLE login_attempt (
  id  TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  at  INTEGER NOT NULL                                    -- mili-giây Unix
);
CREATE INDEX idx_login_attempt_key_at ON login_attempt(key, at);
CREATE INDEX idx_login_attempt_at ON login_attempt(at);
