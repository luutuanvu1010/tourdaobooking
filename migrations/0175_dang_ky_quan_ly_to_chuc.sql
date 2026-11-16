-- Migration 0175 — ADR-0213 Đ1, Đ2, Đ3.5–Đ3.6, Đ6 (bảng yêu cầu), Đ9 (chủ duyệt 2026-11-16): mốc B1 đợt 2 đăng ký đối tác, Task 9. Số 0175: mốc A (0174) đã đóng băng.
-- CHỈ THÊM dòng danh mục, cột, chỉ mục, view, bảng, trigger; TẠO LẠI (giữ tên) trigger lc1c của staff và orders_delivered_lock (chép thân 0146, thêm hai cột mới).
-- Không sửa dòng dữ liệu cũ nào. Thân trigger chỉ đọc bảng cùng module hoặc view công bố (Hiến chương 5.3). Mỗi trigger một câu RAISE, câu báo có tiền tố mã.
-- «Đang mở» = valid_to_date IS NULL (cùng cách v_pty_open_role, LC-1, DRIVES_FOR). Tệp KHÔNG tự mở/đóng giao dịch. Không `CASE … END)` trong thân trigger.

-- ===== parties: hai loại liên kết người → tổ chức (Đ2.1). Tên đã duyệt: «Người quản lý của», «Thành viên của». ======================================
INSERT INTO pty_relationship_type (code, name, sort_order) VALUES ('MANAGER_OF', 'Người quản lý của', 4);
INSERT INTO pty_relationship_type (code, name, sort_order) VALUES ('MEMBER_OF', 'Thành viên của', 5);
-- Đ2.4: tham chiếu LOGIC tới dòng MANAGER_OF thay thế (không khoá ngoại — D1 kiểm khoá ngoại ngay lúc ghi, dòng được trỏ chưa có). Lưới: R-TC-2.
ALTER TABLE pty_party_relationship ADD COLUMN replaced_by_id TEXT;
-- Ruling R5 (kế hoạch): trạng thái thư báo người quản lý cũ trên dòng MANAGER_OF vừa đóng (Hiến chương 5.16). Rỗng = không có thư.
ALTER TABLE pty_party_relationship ADD COLUMN notice_state TEXT CHECK (notice_state IS NULL OR notice_state IN ('CHO', 'DA_GUI', 'KHONG_EMAIL'));
-- Đ2.2: đúng một người quản lý ĐANG MỞ cho mỗi tổ chức.
CREATE UNIQUE INDEX pty_relationship_one_manager_uq ON pty_party_relationship(to_party_id) WHERE relationship_type_code = 'MANAGER_OF' AND valid_to_date IS NULL;
-- Đ2.3 (khuôn pty_relationship_drives_for_*): đầu TỪ là hồ sơ cá nhân.
CREATE TRIGGER pty_relationship_org_link_person BEFORE INSERT ON pty_party_relationship
WHEN NEW.relationship_type_code IN ('MANAGER_OF', 'MEMBER_OF')
  AND NOT EXISTS (SELECT 1 FROM pty_party p WHERE p.id = NEW.from_party_id AND p.party_kind = 'PERSON')
BEGIN SELECT RAISE(ABORT, 'pty_relationship_org_link_person: người quản lý hoặc thành viên của tổ chức phải là hồ sơ cá nhân'); END;
-- Đ2.3: đầu TỚI là hồ sơ tổ chức đang mở vai được hưởng = vai nhóm bên ngoài hoặc loại đối tác (khuôn bil_credit_limit_party_ok, 0141; không đọc prc_*).
CREATE TRIGGER pty_relationship_org_link_org BEFORE INSERT ON pty_party_relationship
WHEN NEW.relationship_type_code IN ('MANAGER_OF', 'MEMBER_OF')
  AND NOT EXISTS (SELECT 1 FROM pty_party p JOIN v_pty_open_role r ON r.party_id = p.id JOIN v_pty_role_type t ON t.code = r.role_type_code
                  WHERE p.id = NEW.to_party_id AND p.party_kind = 'ORGANIZATION' AND (t.role_group = 'EXTERNAL' OR (t.role_group = 'OTHER' AND t.is_partner_label = 1)))
BEGIN SELECT RAISE(ABORT, 'pty_relationship_org_link_org: liên kết phải trỏ tới hồ sơ tổ chức đang mang vai đối tác'); END;
-- Đ2.3: không vừa quản lý vừa thành viên của cùng tổ chức. CHỈ dòng đang mở (PF16): lô chuyển trong ngày đóng dòng cũ trước khi chèn dòng mới.
CREATE TRIGGER pty_relationship_org_link_not_both BEFORE INSERT ON pty_party_relationship
WHEN NEW.relationship_type_code IN ('MANAGER_OF', 'MEMBER_OF') AND NEW.valid_to_date IS NULL
  AND EXISTS (SELECT 1 FROM pty_party_relationship o
              WHERE o.from_party_id = NEW.from_party_id AND o.to_party_id = NEW.to_party_id AND o.valid_to_date IS NULL
                AND o.relationship_type_code IN ('MANAGER_OF', 'MEMBER_OF') AND o.relationship_type_code <> NEW.relationship_type_code)
BEGIN SELECT RAISE(ABORT, 'pty_relationship_org_link_not_both: một người không vừa là người quản lý vừa là thành viên của cùng tổ chức'); END;
-- Đ2.4: đóng MANAGER_OF đang mở khi tổ chức còn thành viên đang mở thì bắt buộc replaced_by_id (lô «chuyển»). Trỏ đúng dòng có thật: R-TC-2.
CREATE TRIGGER pty_relationship_manager_close_needs_replacement BEFORE UPDATE ON pty_party_relationship
WHEN OLD.relationship_type_code = 'MANAGER_OF' AND OLD.valid_to_date IS NULL AND NEW.valid_to_date IS NOT NULL AND NEW.replaced_by_id IS NULL
  AND EXISTS (SELECT 1 FROM pty_party_relationship m WHERE m.to_party_id = OLD.to_party_id AND m.relationship_type_code = 'MEMBER_OF' AND m.valid_to_date IS NULL)
BEGIN SELECT RAISE(ABORT, 'pty_relationship_manager_close_needs_replacement: tổ chức còn thành viên — phải giao người quản lý mới trong cùng lệnh'); END;
-- View công bố liên kết (Đ3.2, Đ9): chỉ dòng ĐANG MỞ, chỉ khoá. kind ∈ MANAGER, MEMBER.
CREATE VIEW v_pty_org_link AS
  SELECT r.id AS relationship_id, r.from_party_id AS person_party_id, r.to_party_id AS org_party_id,
         CASE r.relationship_type_code WHEN 'MANAGER_OF' THEN 'MANAGER' ELSE 'MEMBER' END AS kind, r.valid_from_date
  FROM pty_party_relationship r
  WHERE r.relationship_type_code IN ('MANAGER_OF', 'MEMBER_OF') AND r.valid_to_date IS NULL;

-- Đ6: yêu cầu chuyển quyền quản lý do người quản lý gửi, chờ văn phòng. Chỉ thêm; trạng thái một chiều MO → DA_XU_LY | DA_HUY (một lần, kèm người và giờ đóng).
-- requested_by_staff_id, closed_by: mã tài khoản, KHÔNG khoá ngoại sang staff (parties không phụ thuộc staff — như created_by).
CREATE TABLE pty_org_transfer_request (
  id                       TEXT PRIMARY KEY,
  org_party_id             TEXT NOT NULL REFERENCES pty_party(id),
  requested_by_staff_id    TEXT NOT NULL,
  proposed_person_party_id TEXT NOT NULL REFERENCES pty_party(id),
  status                   TEXT NOT NULL CHECK (status IN ('MO', 'DA_XU_LY', 'DA_HUY')),
  created_at               TEXT NOT NULL,
  created_by               TEXT,
  updated_at               TEXT NOT NULL,
  updated_by               TEXT,
  closed_at                TEXT,
  closed_by                TEXT
);
CREATE INDEX pty_org_transfer_request_org_ix ON pty_org_transfer_request(org_party_id, status);
CREATE TRIGGER pty_org_transfer_request_insert_open BEFORE INSERT ON pty_org_transfer_request
WHEN NEW.status <> 'MO' OR NEW.closed_at IS NOT NULL OR NEW.closed_by IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'pty_org_transfer_request_insert_open: yêu cầu chuyển quyền mới phải ở trạng thái đang mở'); END;
CREATE TRIGGER pty_org_transfer_request_close_once BEFORE UPDATE ON pty_org_transfer_request
WHEN OLD.status <> 'MO' OR NEW.id IS NOT OLD.id OR NEW.org_party_id IS NOT OLD.org_party_id OR NEW.requested_by_staff_id IS NOT OLD.requested_by_staff_id
  OR NEW.proposed_person_party_id IS NOT OLD.proposed_person_party_id OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'pty_org_transfer_request_close_once: yêu cầu chuyển quyền chỉ đóng một lần, không sửa nội dung'); END;
CREATE TRIGGER pty_org_transfer_request_close_shape BEFORE UPDATE ON pty_org_transfer_request
WHEN NEW.status NOT IN ('DA_XU_LY', 'DA_HUY') OR NEW.closed_at IS NULL OR NEW.closed_by IS NULL
BEGIN SELECT RAISE(ABORT, 'pty_org_transfer_request_close_shape: đóng yêu cầu phải sang Đã xử lý hoặc Đã huỷ, kèm người và giờ đóng'); END;
CREATE TRIGGER pty_org_transfer_request_no_delete BEFORE DELETE ON pty_org_transfer_request
BEGIN SELECT RAISE(ABORT, 'pty_org_transfer_request_no_delete: không xoá yêu cầu chuyển quyền'); END;

-- ===== staff: LC-1c TẠO LẠI (giữ tên — nhật ký lỗi, sổ hàng rào, bài kiểm trỏ theo tên; không sửa 0149) + trigger anh em lc1d (Đ9) ======================
-- Vế mới: hồ sơ có liên kết đang mở (v_pty_org_link) tới tổ chức mang vai nhóm bên ngoài hoặc loại đối tác (cùng định nghĩa Đ2.3). CÙNG điều kiện với R-LC-1c
-- (scripts/audit-checks.mjs) và câu đọc của chủ (scripts/cau-doc-doi-tac-thieu-vai-tro.mjs) — bài đối chiếu ba nơi H4 ở src/audit-invariants.test.ts.
DROP TRIGGER lc1c_stf_permission_partner_needs_role;
CREATE TRIGGER lc1c_stf_permission_partner_needs_role BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND NEW.permission_type_code = 'PARTNER'
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_open_role_group g ON g.party_id = s.party_id WHERE s.id = NEW.staff_id AND g.role_group = 'EXTERNAL')
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_party_partner_label l ON l.party_id = s.party_id WHERE s.id = NEW.staff_id)
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_org_link k ON k.person_party_id = s.party_id JOIN v_pty_open_role r ON r.party_id = k.org_party_id
                  JOIN v_pty_role_type t ON t.code = r.role_type_code
                  WHERE s.id = NEW.staff_id AND (t.role_group = 'EXTERNAL' OR (t.role_group = 'OTHER' AND t.is_partner_label = 1)))
BEGIN SELECT RAISE(ABORT, 'lc1c_partner_needs_role: tài khoản Đối tác phải có hồ sơ mang vai trò đối tác'); END;
-- lc1d: hồ sơ KHÔNG vai nhóm bên ngoài, KHÔNG loại đối tác nhưng CÓ liên kết đang mở ⇒ tài khoản chỉ giữ quyền Đối tác (LC-1 và trigger nhãn không bắt ca này).
-- Chỉ canh INSERT như LC-1, LC-1b, LC-1c; lưới cho liên kết mở SAU khi cấp quyền: R-TC-3.
CREATE TRIGGER lc1d_stf_permission_link_only_partner BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND NEW.permission_type_code <> 'PARTNER'
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_open_role_group g ON g.party_id = s.party_id WHERE s.id = NEW.staff_id AND g.role_group = 'EXTERNAL')
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_party_partner_label l ON l.party_id = s.party_id WHERE s.id = NEW.staff_id)
  AND EXISTS (SELECT 1 FROM staff s JOIN v_pty_org_link k ON k.person_party_id = s.party_id WHERE s.id = NEW.staff_id)
BEGIN SELECT RAISE(ABORT, 'lc1d_link_only_partner: tài khoản của người làm việc cho tổ chức chỉ giữ quyền Đối tác'); END;

-- ===== audit: thao tác thay mặt (Đ3.5). Chỉ mã hồ sơ. Dòng gắn đơn điền từ v_ord_order_acting (Ruling R3, PF18 — Task 11 nối hàm ghi). ===================
ALTER TABLE audit_log ADD COLUMN acting_party_id TEXT;

-- ===== orders: tư cách của đơn (Đ3.6 — thuộc tính của đơn), ghi trong câu INSERT INTO orders lúc lập ============================================
-- acting_party_id: hồ sơ của tư cách; NULL = đơn văn phòng hoặc lập trước B1. Mọi câu chèn orders đều ghi tên cột (kiểm 16/11) nên mã cũ lùi được an toàn.
ALTER TABLE orders ADD COLUMN acting_party_id TEXT;
ALTER TABLE orders ADD COLUMN acting_link_kind TEXT CHECK (acting_link_kind IS NULL OR acting_link_kind IN ('CA_NHAN', 'MANAGER', 'MEMBER'));
-- PF10: không bao giờ đổi sang giá trị khác; chỉ được về NULL CẢ HAI trong cùng câu («Đổi khách» — PUT …/booker, Task 11).
CREATE TRIGGER orders_acting_immutable BEFORE UPDATE OF acting_party_id, acting_link_kind ON orders
WHEN (NEW.acting_party_id IS NOT OLD.acting_party_id OR NEW.acting_link_kind IS NOT OLD.acting_link_kind)
  AND NOT (NEW.acting_party_id IS NULL AND NEW.acting_link_kind IS NULL)
BEGIN SELECT RAISE(ABORT, 'orders_acting_immutable: tư cách của đơn chỉ ghi lúc lập, chỉ được xoá cả hai cùng lúc khi đổi khách'); END;
-- PF8: module audit đọc tư cách của đơn qua view này, không FROM orders.
CREATE VIEW v_ord_order_acting AS SELECT o.id AS order_id, o.acting_party_id FROM orders o;
-- Khoá «đơn đã xong» phủ MỌI cột (NT-R6, NT-R6b ở src/migrations-orders-da-giao.test.ts): chép NGUYÊN thân 0146, thêm hai cột acting_* ở cả hai trường hợp được phép.
DROP TRIGGER orders_delivered_lock;
CREATE TRIGGER orders_delivered_lock BEFORE UPDATE ON orders
WHEN OLD.delivered_at IS NOT NULL
  AND NOT (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL
    AND NEW.id IS OLD.id AND NEW.order_code IS OLD.order_code AND NEW.staff_id IS OLD.staff_id AND NEW.status IS OLD.status
    AND NEW.customer_name IS OLD.customer_name AND NEW.customer_phone IS OLD.customer_phone AND NEW.customer_email IS OLD.customer_email
    AND NEW.customer_note IS OLD.customer_note AND NEW.subtotal IS OLD.subtotal AND NEW.discount IS OLD.discount AND NEW.total IS OLD.total
    AND NEW.deposit_amount IS OLD.deposit_amount AND NEW.deposit_method IS OLD.deposit_method AND NEW.remaining_amount IS OLD.remaining_amount
    AND NEW.payment_note IS OLD.payment_note AND NEW.created_at IS OLD.created_at AND NEW.confirmed_at IS OLD.confirmed_at
    AND NEW.booker_party_id IS OLD.booker_party_id AND NEW.delivered_at IS OLD.delivered_at AND NEW.delivered_by IS OLD.delivered_by
    AND NEW.manifest_exempt IS OLD.manifest_exempt AND NEW.declared_deposit IS OLD.declared_deposit AND NEW.sales_invitee_party_id IS OLD.sales_invitee_party_id
    AND NEW.payment_term IS OLD.payment_term AND NEW.credit_due_date IS OLD.credit_due_date
    AND NEW.credit_due_at IS OLD.credit_due_at AND NEW.credit_grace_until IS OLD.credit_grace_until
    AND NEW.company_collects_snapshot IS OLD.company_collects_snapshot
    AND NEW.acting_party_id IS OLD.acting_party_id AND NEW.acting_link_kind IS OLD.acting_link_kind)
  AND NOT (OLD.payment_term = 'CREDIT' AND NEW.credit_due_at IS NOT NULL AND NEW.credit_due_at IS NOT OLD.credit_due_at
    AND NEW.id IS OLD.id AND NEW.order_code IS OLD.order_code AND NEW.staff_id IS OLD.staff_id AND NEW.status IS OLD.status
    AND NEW.customer_name IS OLD.customer_name AND NEW.customer_phone IS OLD.customer_phone AND NEW.customer_email IS OLD.customer_email
    AND NEW.customer_note IS OLD.customer_note AND NEW.subtotal IS OLD.subtotal AND NEW.discount IS OLD.discount AND NEW.total IS OLD.total
    AND NEW.deposit_amount IS OLD.deposit_amount AND NEW.deposit_method IS OLD.deposit_method AND NEW.remaining_amount IS OLD.remaining_amount
    AND NEW.payment_note IS OLD.payment_note AND NEW.created_at IS OLD.created_at AND NEW.confirmed_at IS OLD.confirmed_at
    AND NEW.booker_party_id IS OLD.booker_party_id AND NEW.delivered_at IS OLD.delivered_at AND NEW.delivered_by IS OLD.delivered_by
    AND NEW.completed_at IS OLD.completed_at AND NEW.completed_by IS OLD.completed_by
    AND NEW.manifest_exempt IS OLD.manifest_exempt AND NEW.declared_deposit IS OLD.declared_deposit AND NEW.sales_invitee_party_id IS OLD.sales_invitee_party_id
    AND NEW.payment_term IS OLD.payment_term
    AND NEW.company_collects_snapshot IS OLD.company_collects_snapshot
    AND NEW.acting_party_id IS OLD.acting_party_id AND NEW.acting_link_kind IS OLD.acting_link_kind)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã tới bước Khách đã trả đủ, không sửa được'); END;
