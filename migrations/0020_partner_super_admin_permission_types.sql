-- Migration 0020 — ADR-0014 điều 1: thêm hai mã quyền app PARTNER (Đối tác) và SUPER_ADMIN (Super Admin), dùng lại nguyên
-- cơ chế quyền đa trị của ADR-0005 (stf_permission_type/stf_permission). CHỈ thêm dữ liệu, không đổi cấu trúc bảng.
-- Không gieo SĐT của chủ dự án ở đây (CLAUDE.md §10, bài học từ F-12): gán SUPER_ADMIN cho tài khoản chủ bằng SQL runbook lúc thi công, KHÔNG migration.
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('PARTNER', 'Đối tác', 'Tài khoản của người ngoài công ty (CTV, hướng dẫn viên/lái xe/lái cano bên ngoài, lễ tân khách sạn, công ty du lịch): chỉ thấy/sửa/xác nhận/huỷ đơn của chính mình', 5),
  ('SUPER_ADMIN', 'Super Admin', 'Vai trên Quản trị: làm được mọi thao tác, kể cả quản lý tài khoản Quản trị/Super Admin khác (ADR-0014 điều 8)', 6);
