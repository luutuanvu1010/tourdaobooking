-- Module: staff — thời điểm đăng nhập thành công gần nhất của tài khoản (ISO UTC), để quản trị viên thấy ai đã đăng nhập bằng bản mới
-- (cột "Đăng nhập gần nhất" ở trang Nhân viên). CHỈ THÊM một cột NULLABLE (expand — không đổi/xoá gì đã có, hoàn tác an toàn bằng bản Worker cũ).
-- NULL = chưa đăng nhập kể từ khi có cột này. Chỉ `POST /api/auth/login` ghi; đổi PIN hay làm mới phiên thì không.
ALTER TABLE staff ADD COLUMN last_login_at TEXT;
