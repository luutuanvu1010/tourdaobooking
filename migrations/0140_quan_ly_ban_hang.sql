-- Migration 0140 — ADR-0169 Đ1 (chủ duyệt 2026-11-05): vai «Quản lý bán hàng». CHỈ THÊM ba dòng danh mục; KHÔNG đổi quyền, vai, hồ sơ của ai.
-- SALES_MANAGER là quyền NỘI BỘ: trigger LC-1 (0037) tự chặn trên tài khoản có vai bên ngoài, không cần tạo lại trigger. Ô quyền ở src/shared/permissions.ts.
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('SALES_MANAGER', 'Quản lý bán hàng', 'Quản lý bán hàng (ADR-0169): bật, tắt cần kiểm vé; Ngừng bán, Mở bán lại. Đi cùng quyền Bán hàng.', 11);
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('SALES_MANAGER', 'Quản lý bán hàng', 19, 'INTERNAL');
-- Công tắc trợ lý theo mã quyền: mã thiếu dòng = tắt; gieo BẬT như mọi mã khác (khuôn 0057).
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0140-SALES_MANAGER', 'SALES_MANAGER', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
