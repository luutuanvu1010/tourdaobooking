-- Migration 0067 — ADR-0085 (accepted 2026-10-01): CHÍNH SÁCH ĐĂNG NHẬP theo quyền app. Mỗi quyền đặt được (9 mã, KHÔNG có SUPER_ADMIN — Toàn quyền và vai
-- IT luôn nhiều máy, khoá cứng) tối đa MỘT dòng hiện hành; multi = 1 là "Nhiều máy". Bảng trống = mọi quyền "Một máy" (hành vi bản 1.58).
-- Không xoá dòng: đổi chính sách = đóng dòng hiện hành (valid_to_at) rồi chèn dòng mới, cùng một lô. Chỉ module auth ghi bảng này.
CREATE TABLE aut_session_policy (
  id TEXT PRIMARY KEY,
  permission_code TEXT NOT NULL CHECK (permission_code IN ('SALES', 'ACCOUNTING', 'ADMIN', 'FIELD', 'PARTNER', 'INTERN', 'DRIVER', 'DRIVER_PARTNER', 'HR')),
  multi INTEGER NOT NULL CHECK (multi IN (0, 1)),
  valid_from_at TEXT NOT NULL,
  valid_to_at TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
-- Lưới khi hai Toàn quyền lưu cùng lúc: chỉ một dòng hiện hành mỗi quyền (câu chèn thứ hai vỡ UNIQUE → cả lô lùi → 409).
CREATE UNIQUE INDEX aut_session_policy_one_current ON aut_session_policy (permission_code) WHERE valid_to_at IS NULL;

-- View công bố của module staff (ADR-0002 điều 3) cho SQL "được nhiều máy" của auth (ADR-0085 Q1 điều 2). Chỉ khoá + mã, không tên, không SĐT.
-- (1) quyền app CÒN HIỆU LỰC của từng tài khoản (= quyền từ vai + chỉnh tay đã tính sẵn vào stf_permission).
CREATE VIEW v_stf_quyen_mo AS
  SELECT p.staff_id, p.permission_type_code AS permission_code
  FROM stf_permission p
  WHERE p.valid_to_at IS NULL;
-- (2) tài khoản LUÔN được nhiều máy, chính sách không đổi được: giữ Toàn quyền, hoặc vai IT đang mở. "Đang mở" = không gắn nơi và chưa đóng — CÙNG định nghĩa
-- với open_role_codes_for (parties) mà issueLoginSession dùng qua accountRoleCodesOf, để SQL và TypeScript (isSingleDevice) cho cùng kết quả.
-- Vai hồ sơ ở đây KHÔNG phải điều kiện cho phép thao tác: là lệch kế thừa có tên của ADR-0075 điều 3 (ADR-0085 Q1 điều 2), chỉ quyết số máy.
CREATE VIEW v_stf_nhieu_may_co_dinh AS
  SELECT p.staff_id FROM stf_permission p WHERE p.permission_type_code = 'SUPER_ADMIN' AND p.valid_to_at IS NULL
  UNION
  SELECT s.id FROM staff s JOIN pty_party_role r ON r.party_id = s.party_id
  WHERE r.role_type_code = 'IT' AND r.location_id IS NULL AND r.valid_to_date IS NULL;
