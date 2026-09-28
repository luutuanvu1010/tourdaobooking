-- Migration 0027 — ADR-0038: view công bố "tài khoản đang giữ Toàn quyền" (quyền SUPER_ADMIN còn hiệu lực).
-- Chỉ thêm một VIEW, không đổi bảng, không đổi dữ liệu. Module audit đọc view này để giấu thao tác im lặng của Toàn quyền khỏi người không phải
-- Toàn quyền ở GET /api/audit (đọc xuyên module chỉ qua view v_<tiền tố>_*, ADR-0002). Quyết theo quyền HIỆN TẠI của người làm.
CREATE VIEW v_stf_toan_quyen AS
  SELECT DISTINCT p.staff_id
  FROM stf_permission p
  WHERE p.permission_type_code = 'SUPER_ADMIN' AND p.valid_to_at IS NULL;
