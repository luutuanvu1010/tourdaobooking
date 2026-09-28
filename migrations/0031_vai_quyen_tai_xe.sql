-- Migration 0031 — ADR-0040 D3 (accepted 2026-09-28; Ruling R1, R12 của điều phối): tài xế công ty là NHÂN VIÊN có tài khoản đăng nhập.
-- CHỈ THÊM hai dòng danh mục và ngưng gán mới một mã vai cũ; KHÔNG đổi quyền, vai, hồ sơ của ai. Không gieo SĐT/tên thật ở đây.
-- (1) Quyền app mới DRIVER ("Tài xế", module staff). Lượt 1a mọi ô nghiệp vụ = không — bản đồ ở src/shared/permissions.ts; src/roles-schema.test.ts
--     giữ nhãn ở đây khớp PERMISSION_LABEL.
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('DRIVER', 'Tài xế', 'Tài xế công ty (ADR-0040): đăng nhập, trang Tài khoản, nhận thông báo, xem giấy tờ của chính mình (số che); không thấy đơn, tiền, khách, danh mục giá, hồ sơ người khác', 8);
-- (2) Vai tài khoản nội bộ mới "Tài xế công ty" (module parties) — khuôn GUIDE_INTERNAL (0024). Bộ quyền mặc định (DRIVER) nằm ở src/shared/roles.ts.
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('DRIVER_INTERNAL', 'Tài xế công ty', 17, 'INTERNAL');
-- (3) Mã vai hồ sơ cũ DRIVER ("Tài xế", nhóm OTHER, 0011) không dùng cho tài xế công ty; ADR-0040 D3: "không gán mới", lượt 2 quyết. Ngưng như 0024 đã
--     làm với mã cũ mơ hồ; dòng vai đang có của các hồ sơ giữ nguyên. Máy chủ từ chối gán mới loại vai đã ngưng (route Danh bạ, Ruling R6).
UPDATE pty_role_type SET active = 0 WHERE code = 'DRIVER';
