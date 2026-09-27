-- Migration: hồ sơ công ty chủ — ADR-0024 điều 6 (accepted phần điều 6, chủ dự án duyệt ngày 28/9; bổ sung 6.1–6.6) và câu trả lời của chủ
-- cùng ngày cho 6.5 ("cho Super Admin đổi" — ADR-0043, cơ chế Y). Tour Đảo là MỘT hồ sơ tổ chức, đánh dấu bằng mã vai OWNER_COMPANY
-- ("Công ty chủ", nhóm OTHER — không sinh quyền). CHỈ THÊM. company_profile KHÔNG bị sửa/xoá (6.3: cột pháp lý thôi được đọc; thu hồi theo
-- expand–contract ở lần phát hành sau). Giá trị riêng của công ty CHÉP bằng INSERT … SELECT: tệp này không có SĐT/MST/email viết tay (luật ở
-- đầu migration partner_super_admin_permission_types và vai_quyen_mac_dinh; src/migrations-ho-so-cong-ty-chu.test.ts quét). id cố định giữa mọi
-- môi trường (tiền lệ migration locations), nhưng MÃ không dùng id: tra bằng mã vai qua hàm công bố ownerCompany của module parties.

-- Mã vai. active = 0 = "ngưng gán thường" (như các vai cũ ở migration vai_quyen_mac_dinh): ô "Thêm công việc" chung của Danh bạ không liệt kê;
-- lựa chọn đổi công ty chủ chỉ hiện riêng cho người có ô company.legal.write, trên hồ sơ tổ chức.
INSERT INTO pty_role_type (code, name, sort_order, active, role_group) VALUES ('OWNER_COMPANY', 'Công ty chủ', 30, 0, 'OTHER');

INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at)
SELECT '3277e384-f7c0-4e1c-b3bc-27a5653d6dbd', 'ORGANIZATION', 'Công ty TNHH Tour Đảo', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM company_profile WHERE id = 'default';

INSERT INTO pty_organization (party_id, legal_name, tax_code, address, invoice_email, created_at, updated_at)
SELECT '3277e384-f7c0-4e1c-b3bc-27a5653d6dbd', company_name, tax_code, address, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM company_profile WHERE id = 'default';

-- 6.1: Hotline (PHONE, chính) và Zalo (PHONE, phụ) phân biệt bằng nhãn; email là EMAIL. value = chữ đã cắt khoảng trắng hai đầu (như validateContact);
-- value_normalized theo đúng quy tắc normalizePhone (src/shared/phone.ts): bỏ khoảng trắng . - ( ), đổi +84… / 84 (11 chữ số) về 0… — bài kiểm so
-- từng dạng viết. Ngày dân sự theo giờ Việt Nam ('+7 hours', như migration staff_permissions_party; migration không gọi được vnToday).
INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
SELECT 'a3b56de6-578c-4176-8fab-6cf922567946', '3277e384-f7c0-4e1c-b3bc-27a5653d6dbd', 'PHONE', trim(v),
       CASE WHEN x LIKE '+84%' THEN '0' || substr(x, 4) WHEN x LIKE '84%' AND length(x) = 11 THEN '0' || substr(x, 3) ELSE x END,
       'Hotline', 1, date('now', '+7 hours'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (SELECT hotline AS v,
             replace(replace(replace(replace(replace(replace(replace(replace(hotline, ' ', ''), char(9), ''), char(10), ''), char(13), ''), '.', ''), '-', ''), '(', ''), ')', '') AS x
      FROM company_profile WHERE id = 'default' AND hotline IS NOT NULL AND trim(hotline) <> '');

INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
SELECT '7f18d0d6-3e5a-4d62-af2b-a527859e4496', '3277e384-f7c0-4e1c-b3bc-27a5653d6dbd', 'PHONE', trim(v),
       CASE WHEN x LIKE '+84%' THEN '0' || substr(x, 4) WHEN x LIKE '84%' AND length(x) = 11 THEN '0' || substr(x, 3) ELSE x END,
       'Zalo', 0, date('now', '+7 hours'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (SELECT zalo_number AS v,
             replace(replace(replace(replace(replace(replace(replace(replace(zalo_number, ' ', ''), char(9), ''), char(10), ''), char(13), ''), '.', ''), '-', ''), '(', ''), ')', '') AS x
      FROM company_profile WHERE id = 'default' AND zalo_number IS NOT NULL AND trim(zalo_number) <> '');

INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
SELECT '2f8cd753-d95c-4d72-a8b2-70920eaa53b4', '3277e384-f7c0-4e1c-b3bc-27a5653d6dbd', 'EMAIL', trim(email), lower(trim(email)), NULL, 1, date('now', '+7 hours'),
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM company_profile WHERE id = 'default' AND email IS NOT NULL AND trim(email) <> '';

-- Dòng vai "Công ty chủ": không gắn nơi; ngày dân sự theo giờ Việt Nam.
INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
SELECT '065ee11d-1585-48fc-a2d5-3a5997041db3', '3277e384-f7c0-4e1c-b3bc-27a5653d6dbd', 'OWNER_COMPANY', NULL, date('now', '+7 hours'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM company_profile WHERE id = 'default';

-- ---- 6.5 (ii) — cơ chế Y (chủ dự án trả lời ngày 28/9 "cho Super Admin đổi", ADR-0043): ĐÚNG MỘT công ty chủ, đổi được, không lúc nào trống.
-- KHÔNG dùng chỉ mục duy nhất một phần "một dòng mở": nó chặn chính việc đổi. Tên trigger bắt đầu bằng pty_ (không staff_/stf_:
-- src/migrations-n1.test.ts coi đó là trigger siết B5). Chỉ chặn đường qua ứng dụng và lỗi tay thường gặp; các cách sửa tay khác (đổi mã vai,
-- đổi hồ sơ, xoá dòng, chèn dòng đã đóng) KHÔNG chặn — câu hỏi Q1 của kế hoạch T2b, chủ giữ (a).

-- (a) "Đổi công ty chủ" = MỘT câu chèn dòng OWNER_COMPANY đang mở: trigger đóng mọi dòng OWNER_COMPANY đang mở KHÁC trong cùng câu lệnh.
-- valid_to_date là ngày CUỐI còn hiệu lực (bao gồm — như route "kết thúc vai" ghi hôm nay theo giờ Việt Nam và trigger chồng lấn so hai đầu):
-- dòng mới bắt đầu ngày D thì dòng cũ còn hiệu lực tới D − 1 (khuôn đổi vai tài khoản của module staff), nhưng không trước ngày bắt đầu của
-- chính nó (CHECK của bảng). Ghi người đổi = người tạo dòng mới.
CREATE TRIGGER pty_party_role_owner_company_switch AFTER INSERT ON pty_party_role
WHEN NEW.role_type_code = 'OWNER_COMPANY' AND NEW.valid_to_date IS NULL
BEGIN
  UPDATE pty_party_role
     SET valid_to_date = max(date(NEW.valid_from_date, '-1 day'), valid_from_date),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = NEW.created_by
   WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL AND id <> NEW.id;
END;

-- (b) Không đóng được dòng OWNER_COMPANY đang mở CUỐI CÙNG (không lúc nào trống). Trigger (a) đóng dòng cũ SAU khi dòng mới đã có, nên đổi vẫn qua.
CREATE TRIGGER pty_party_role_owner_company_keep_last BEFORE UPDATE OF valid_to_date ON pty_party_role
WHEN OLD.role_type_code = 'OWNER_COMPANY' AND OLD.valid_to_date IS NULL AND NEW.valid_to_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pty_party_role o WHERE o.role_type_code = 'OWNER_COMPANY' AND o.valid_to_date IS NULL AND o.id <> OLD.id)
BEGIN SELECT RAISE(ABORT, 'owner_company_last_open: không kết thúc được công ty chủ cuối cùng — muốn đổi thì gán công ty chủ cho hồ sơ khác'); END;

-- (c) Không mở lại dòng OWNER_COMPANY đã đóng: đổi lại = gán một dòng mới (lịch sử giữ nguyên).
CREATE TRIGGER pty_party_role_owner_company_no_reopen BEFORE UPDATE OF valid_to_date ON pty_party_role
WHEN OLD.role_type_code = 'OWNER_COMPANY' AND OLD.valid_to_date IS NOT NULL AND NEW.valid_to_date IS NULL
BEGIN SELECT RAISE(ABORT, 'owner_company_no_reopen: không mở lại dòng công ty chủ đã kết thúc — muốn đổi lại thì gán công ty chủ cho hồ sơ đó'); END;
