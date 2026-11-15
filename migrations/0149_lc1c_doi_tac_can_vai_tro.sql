-- Migration 0149 — ADR-0185 Đ2 (a) mục 3 (chủ duyệt 2026-11-08): LC-1c, lớp CSDL cho phát hiện T-01 — mở dòng quyền Đối tác (PARTNER) mà hồ sơ của tài khoản
-- KHÔNG mở vai nhóm bên ngoài VÀ KHÔNG mang vai trò do Kế toán thêm thì từ chối. Đọc qua view công bố của parties như LC-1 (0037). CHỈ THÊM một trigger;
-- không sửa dòng nào đang có (tài khoản kiểu cũ đã có giữ nguyên — chủ soát theo Đ3 mục 1; R-LC-1c ở scripts/audit-checks.mjs là lưới cho dữ liệu đó).
-- Trigger chỉ canh lúc MỞ quyền: vai trò bị đóng về sau thì không thấy — cổng `congDoiTacChuaCoVaiTro` (orders, Đ1) là lưới cuối.
-- Chỉ BEFORE INSERT, như LC-1 và LC-1b (mã không bao giờ đổi mã quyền hay mở lại dòng quyền): UPDATE gõ tay đổi mã sang PARTNER hoặc mở lại dòng PARTNER
-- đã đóng không bị chặn ở đây — R-LC-1c là lưới thứ hai cho dữ liệu đó.
-- Cùng điều kiện với R-LC-1c và câu đọc của chủ (scripts/cau-doc-doi-tac-thieu-vai-tro.mjs); bài đối chiếu ba nơi theo hành vi ở src/audit-invariants.test.ts.
-- Ca lọt có ghi (kế hoạch K5): hồ sơ chỉ mang vai Tài xế đối tác (nhóm bên ngoài) — tới được bằng SQL tay; cổng Đ1 vẫn bắt vì xét theo người hưởng.
CREATE TRIGGER lc1c_stf_permission_partner_needs_role BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND NEW.permission_type_code = 'PARTNER'
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_open_role_group g ON g.party_id = s.party_id WHERE s.id = NEW.staff_id AND g.role_group = 'EXTERNAL')
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_party_partner_label l ON l.party_id = s.party_id WHERE s.id = NEW.staff_id)
BEGIN SELECT RAISE(ABORT, 'lc1c_partner_needs_role: tài khoản Đối tác phải có hồ sơ mang vai trò đối tác'); END;
