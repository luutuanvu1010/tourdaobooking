-- Migration 0170 — ADR-0209 (accepted 2026-11-15) Đ1: CẤP ĐỘ ĐẠI LÝ MẶC ĐỊNH cho đối tác tự đăng ký, module pricing. CHỈ THÊM: một bảng chính sách, bốn trigger; không đổi bảng, dòng nào đang có.
-- Số: ngày 15/11, lớn nhất ở mọi nhánh / worktree là 0169 (`0169_phi_don_tren_don.sql`, nhánh khác) ⇒ 0170.
-- Xây trên lỗ đang hở HC-5.19 (khoá `xay_tren_cho_phep_adr_0209_0210` ở docs/quyen-hoan.json): chỉ thêm bảng cài đặt, không gieo dòng nào (chưa đặt = theo cấp của vai trò như hôm nay).
-- Khuôn `ord_pickup_time_policy` (0157): đổi = chèn dòng mới; dòng hiệu lực của MỘT loại = `valid_from_at` lớn nhất ≤ lúc xét (UNIQUE theo loại + mốc nên không hoà; một đoạn câu dùng chung ở repository).
-- `tier_code` NULL = «Theo cấp của vai trò» (không đặt). Lô duyệt (ADR-0209 Đ3) đọc dòng hiệu lực để ghi MỘT dòng prc_party_tier, câu INSERT … SELECT … WHERE tự bỏ qua khi thiếu điều kiện.
-- Không dữ liệu cá nhân (mã loại, mã cấp, mốc giờ, id nhân viên).
CREATE TABLE prc_signup_tier_policy (
  id              TEXT PRIMARY KEY,
  role_type_code  TEXT NOT NULL REFERENCES prc_beneficiary_role(role_type_code),
  tier_code       TEXT REFERENCES prc_rate_tier(code),
  valid_from_at   TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  UNIQUE (role_type_code, valid_from_at)
);
CREATE TRIGGER prc_signup_tier_policy_no_update BEFORE UPDATE ON prc_signup_tier_policy
BEGIN SELECT RAISE(ABORT, 'prc_append_only: chính sách cấp cho đối tác tự đăng ký chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER prc_signup_tier_policy_no_delete BEFORE DELETE ON prc_signup_tier_policy
BEGIN SELECT RAISE(ABORT, 'prc_append_only: chính sách cấp cho đối tác tự đăng ký không xoá'); END;
-- Lúc ĐẶT: cấp phải đang bật (cùng câu báo với prc_role_tier_tier_ok); loại phải nằm trong danh sách được hưởng và đang bật (cùng câu báo với prc_role_tier_role_ok).
CREATE TRIGGER prc_signup_tier_policy_tier_ok BEFORE INSERT ON prc_signup_tier_policy
WHEN NEW.tier_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prc_rate_tier t WHERE t.code = NEW.tier_code AND t.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_tier_inactive: mức TA không tồn tại hoặc đã tắt'); END;
CREATE TRIGGER prc_signup_tier_policy_role_ok BEFORE INSERT ON prc_signup_tier_policy
WHEN NOT EXISTS (SELECT 1 FROM prc_beneficiary_role b WHERE b.role_type_code = NEW.role_type_code AND b.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_tier_target: loại này không nằm trong danh sách được hưởng hoặc đã tắt'); END;
