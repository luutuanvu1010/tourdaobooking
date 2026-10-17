-- Migration 0107 — ADR-0125 (accepted 2026-10-16) đ5: người xác minh hồ sơ (lát H-4 Gói 2). CHỈ THÊM. Module audit (view + chỉ mục) và parties (một trigger).
-- KHÔNG bảng mới, KHÔNG cột mới, KHÔNG gieo, KHÔNG mở loại nối ảnh SELF_SUBMISSION (ruling R4 kế hoạch 2026-10-17-goi-2-h4-xac-minh).
-- v_aud_cham_tai_khoan = hình chiếu audit_log CHỈ KHOÁ (khuôn v_aud_account_event 0075): ai (actor_id) đã TẠO hay CHẠM QUYỀN TRUY CẬP tài khoản nào (account_id), tầng, lúc.
-- Danh sách hành động khớp TỪNG CHỮ với hằng CHAM_TAI_KHOAN (src/modules/audit/cham-tai-khoan.ts) — bài cham-tai-khoan.test.ts đối chiếu. Đổi danh sách = migration MỚI
-- tạo lại view (DROP VIEW + CREATE VIEW) + sửa hằng cùng commit. Dòng không có người làm (đồng bộ Sheet, staff_id NULL) không vào view (ADR-0125 đ5 "giới hạn nói thẳng").
-- staff_updated chỉ vào khi chi tiết chứa chữ của hằng CHI_TIET_DOI_SDT (đổi SĐT đăng nhập) — accounts ghi chữ đó bằng chính hằng ấy.
CREATE INDEX idx_audit_target ON audit_log(target_type, target_id, staff_id);

CREATE VIEW v_aud_cham_tai_khoan AS
  SELECT staff_id AS actor_id, target_id AS account_id,
         CASE WHEN action = 'staff_created' THEN 'TAO'
              WHEN action IN ('pin_reset', 'mfa_reset', 'mfa_grace_reopened', 'mfa_exception_set') THEN 'VINH_VIEN'
              ELSE 'CUA_SO_30' END AS loai,
         created_at AS at
  FROM audit_log
  WHERE target_type = 'staff' AND target_id IS NOT NULL AND staff_id IS NOT NULL
    AND (action IN ('staff_created', 'pin_reset', 'mfa_reset', 'mfa_grace_reopened', 'mfa_exception_set',
                    'passkey_removed', 'login_unlocked', 'permission_changed', 'account_roles_changed', 'staff_role_changed', 'staff_reactivated')
         OR (action = 'staff_updated' AND instr(COALESCE(detail, ''), 'đổi SĐT đăng nhập') > 0));

-- Vế (a) của ADR-0125 đ5 ở lớp CSDL (lớp chính: lính gác trong câu ghi của parties). Vế (b)(c) KHÔNG ở trigger: trigger chỉ đọc bảng pty_* (khuôn 0105).
CREATE TRIGGER pty_self_submission_decider_not_author BEFORE UPDATE ON pty_self_submission
WHEN NEW.status IN ('DA_CHAP_NHAN', 'TU_CHOI') AND NEW.decided_by IS OLD.created_by
BEGIN SELECT RAISE(ABORT, 'self_submission_decider_is_author: người xác minh phải khác người khai'); END;
