-- Module: company — điền email công ty vào hồ sơ singleton (`company_profile`, id = 'default').
-- Migration 0002 gieo hồ sơ nhưng để `email` NULL; màn đăng nhập (GET /api/company) cần hiện email nên điền ở đây.
-- CHỈ DỮ LIỆU: không đổi cấu trúc (không ALTER/CREATE/DROP). `AND email IS NULL` để không ghi đè email đã có (chạy lại vẫn an toàn).
-- `updated_by` để NULL = hệ thống. Nhật ký (`audit_log`) không ghi email nên không có dòng nhật ký cho thay đổi này.
UPDATE company_profile
SET email = 'Tourdaotravel@gmail.com',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'default' AND email IS NULL;
