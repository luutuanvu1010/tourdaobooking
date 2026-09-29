-- Migration 0037 — ADR-0048 D2 (accepted 2026-09-28): quyền app "Tài xế đối tác" (DRIVER_PARTNER), vai tài khoản bên ngoài "Tài xế đối tác" (DRIVER_EXTERNAL),
-- LC-1 mới (tài khoản có vai bên ngoài chỉ giữ quyền BÊN NGOÀI = Đối tác hoặc Tài xế đối tác), LC-1b (Tài xế đối tác không giữ quyền nào khác — Q4 = (a)).
-- CHỈ THÊM hai dòng danh mục + đổi thân một trigger + thêm một trigger; KHÔNG đổi quyền, vai, hồ sơ của ai. Không gieo SĐT/tên thật.
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('DRIVER_PARTNER', 'Tài xế đối tác', 'Tài xế của nhà xe đối tác (ADR-0048): đăng nhập, trang Tài khoản, thông báo gửi cho mình, giấy tờ của chính mình (số che); không thấy đơn, tiền, khách, danh mục giá, hồ sơ người khác; không nhận tin Toàn công ty', 9);
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('DRIVER_EXTERNAL', 'Tài xế đối tác', 25, 'EXTERNAL');
-- LC-1 (ADR-0048 B2.1): BỎ rồi TẠO LẠI với tập mới — GIỮ TÊN cũ (ADR ghi "tạo lại"; nhật ký lỗi, sổ hàng rào, bài kiểm cũ trỏ theo tên). Nghĩa nay:
-- "tài khoản có vai bên ngoài đang mở chỉ giữ quyền bên ngoài" — tập {PARTNER, DRIVER_PARTNER} = EXTERNAL_PERMISSIONS của src/shared/permissions.ts
-- (src/migrations-tai-xe-doi-tac.test.ts đối chiếu hai nơi theo hành vi). Không sửa tệp 0024.
DROP TRIGGER lc1_stf_permission_external_partner_only;
CREATE TRIGGER lc1_stf_permission_external_partner_only BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND NEW.permission_type_code NOT IN ('PARTNER', 'DRIVER_PARTNER') AND EXISTS (
  SELECT 1 FROM staff s JOIN v_pty_open_role_group g ON g.party_id = s.party_id
  WHERE s.id = NEW.staff_id AND g.role_group = 'EXTERNAL')
BEGIN SELECT RAISE(ABORT, 'lc1_external_account_permission: tài khoản có vai bên ngoài chỉ giữ quyền bên ngoài (Đối tác hoặc Tài xế đối tác)'); END;
-- LC-1b (ADR-0048 B2.2): tài khoản giữ DRIVER_PARTNER không giữ quyền nào khác — hai chiều, CHỈ đếm dòng đang mở. Lô đổi quyền phải đóng dòng cũ TRƯỚC,
-- mở dòng mới SAU (setPermissionStatements đã xếp như vậy). Chỉ canh INSERT: mã không bao giờ mở lại dòng quyền (lưới thứ hai: R-LC-1b).
CREATE TRIGGER lc1b_stf_permission_driver_partner_alone BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND EXISTS (
  SELECT 1 FROM stf_permission o
  WHERE o.staff_id = NEW.staff_id AND o.valid_to_at IS NULL AND o.permission_type_code <> NEW.permission_type_code
    AND 'DRIVER_PARTNER' IN (o.permission_type_code, NEW.permission_type_code))
BEGIN SELECT RAISE(ABORT, 'lc1b_driver_partner_alone: tài khoản Tài xế đối tác không giữ quyền nào khác'); END;
