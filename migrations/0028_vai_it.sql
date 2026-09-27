-- Migration 0028 — ADR-0042: thêm vai "IT" (nội bộ). Tài khoản chủ dự án (Toàn quyền — vai ẩn) mang vai này để người khác thấy "IT".
-- Bộ quyền mặc định (Quản trị + Toàn quyền) và luật "chỉ Toàn quyền gán" nằm ở src/shared/roles.ts; src/roles-schema.test.ts giữ hai nơi khớp nhau.
-- Chỉ THÊM một dòng danh mục, không đổi bảng, không đổi dữ liệu có sẵn.
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('IT', 'IT', 16, 'INTERNAL');
