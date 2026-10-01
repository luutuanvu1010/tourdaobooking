-- Migration 0057 — ADR-0071 điều 1a (accepted 2026-10-01): vai "Hành chính nhân sự" nhập tài khoản.
-- CHỈ THÊM ba dòng danh mục; KHÔNG đổi quyền, vai, hồ sơ của ai. Không gieo SĐT/tên thật ở đây.
-- (1) Quyền app mới HR ("Nhân sự", module staff): tạo / xem / sửa tài khoản; không đơn, tiền, Danh bạ, danh mục, địa điểm, hỗ trợ đăng nhập. Bản đồ ở
--     src/shared/permissions.ts; src/roles-schema.test.ts giữ nhãn ở đây khớp PERMISSION_LABEL. HR là quyền NỘI BỘ: trigger LC-1 (0037, NOT IN
--     ('PARTNER', 'DRIVER_PARTNER')) tự chặn HR trên tài khoản có vai bên ngoài — không cần tạo lại trigger.
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('HR', 'Nhân sự', 'Hành chính nhân sự (ADR-0071): tạo tài khoản mọi loại, xem danh sách Quản lý tài khoản, sửa tên/SĐT, ngưng/mở lại, gán vai thường cho tài khoản cấp dưới; không thấy đơn, tiền, Danh bạ, danh mục, địa điểm; không đặt lại PIN / mở khoá / gỡ Face ID', 10);
-- (2) Vai tài khoản nội bộ mới "Hành chính nhân sự" (module parties) — khuôn DRIVER_INTERNAL (0031). Bộ quyền mặc định (HR), "chỉ Toàn quyền gán" nằm ở
--     src/shared/roles.ts.
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('HR_STAFF', 'Hành chính nhân sự', 18, 'INTERNAL');
-- (3) Công tắc trợ lý Hỗ trợ theo mã quyền (module tro-ly, ADR-0069 điều 3): 0054 gieo BẬT cho mọi mã quyền đang có; mã thiếu dòng = tắt. Gieo BẬT cho mã
--     mới như mọi mã khác (ô assistant.ask của HR = any) — Toàn quyền tắt được ở trang Trợ lý Hỗ trợ.
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0057-HR', 'HR', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
