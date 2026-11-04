-- Migration 0139 — ADR-0168 (chủ duyệt 2026-11-05): thanh toán Trả sau theo hạn mức riêng của đối tác. Kế hoạch docs/superpowers/plans/2026-11-05-tra-sau-han-muc-ke-hoach.md Task 1.
-- (Số 0138 đã có ở nhánh chưa nhập claude/dispatch-pickup-order-display-1da7b5 nên dùng 0139; wrangler theo dõi theo TÊN đầy đủ.)
-- CHỈ THÊM: bảng hạn mức chỉ-thêm (billing), dòng phiên bản chống ghi trùng (billing), hai cột của orders, view công bố, và tạo lại trigger khoá Đã giao để phủ hai cột mới.
-- Tệp KHÔNG tự mở/đóng giao dịch. Không `CASE … END)` trong trigger (bộ tách câu của wrangler — scripts/audit-checks.mjs R-ORD-T1).

-- 1. Hạn mức trả sau của từng hồ sơ đối tác (khuôn prc_party_tier, 0118). Mỗi hồ sơ tối đa MỘT dòng hiệu lực tại một ngày; chỉ gắn cho hồ sơ mang loại được hưởng;
--    đổi hoặc ngừng = đóng dòng cũ (valid_to_date) rồi thêm dòng mới; không xoá; chỉ đóng được một lần. valid_to_date được phép bằng NGÀY TRƯỚC valid_from_date
--    (dòng đóng ngay trong ngày bắt đầu: đổi hoặc ngừng cùng ngày) — khoảng rỗng, không bao giờ hiệu lực, không tính chồng ngày.
CREATE TABLE bil_credit_limit (
  id              TEXT PRIMARY KEY,
  party_id        TEXT NOT NULL REFERENCES pty_party(id),
  limit_amount    INTEGER NOT NULL CHECK (limit_amount > 0 AND limit_amount <= 10000000000),
  term_days       INTEGER NOT NULL CHECK (term_days BETWEEN 1 AND 365),
  valid_from_date TEXT NOT NULL,
  valid_to_date   TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= date(valid_from_date, '-1 day')),
  reason          TEXT CHECK (reason IS NULL OR length(trim(reason)) BETWEEN 1 AND 500),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
CREATE INDEX bil_credit_limit_party_ix ON bil_credit_limit(party_id);
CREATE TRIGGER bil_credit_limit_no_delete BEFORE DELETE ON bil_credit_limit
BEGIN SELECT RAISE(ABORT, 'bil_append_only: không xoá hạn mức trả sau — đóng hiệu lực'); END;
CREATE TRIGGER bil_credit_limit_close_only BEFORE UPDATE ON bil_credit_limit
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id
  OR NEW.limit_amount IS NOT OLD.limit_amount OR NEW.term_days IS NOT OLD.term_days OR NEW.valid_from_date IS NOT OLD.valid_from_date
  OR NEW.reason IS NOT OLD.reason OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'bil_append_only: hạn mức trả sau chỉ được đóng một lần — đổi thì đóng dòng cũ, thêm dòng mới'); END;
CREATE TRIGGER bil_credit_limit_overlap BEFORE INSERT ON bil_credit_limit
WHEN EXISTS (SELECT 1 FROM bil_credit_limit o WHERE o.party_id = NEW.party_id
  AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'bil_credit_limit_overlap: hồ sơ này đã có một hạn mức trả sau trong khoảng ngày này'); END;
-- «Loại đối tác» = vai bên ngoài hoặc loại đối tác (cùng định nghĩa với prc_beneficiary_role_kind, 0095), đọc hai view công bố của parties — billing không phụ thuộc pricing.
CREATE TRIGGER bil_credit_limit_party_ok BEFORE INSERT ON bil_credit_limit
WHEN NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_pty_role_type t ON t.code = r.role_type_code
                 WHERE r.party_id = NEW.party_id AND (t.role_group = 'EXTERNAL' OR (t.role_group = 'OTHER' AND t.is_partner_label = 1)))
BEGIN SELECT RAISE(ABORT, 'bil_credit_not_beneficiary: hồ sơ này không mang loại đối tác được hưởng, không cấp hạn mức trả sau'); END;

-- 2. Dòng phiên bản của từng bên đặt (ADR-0168 Đ2 mục 4): lệnh làm tăng nợ đọc phiên bản, tính, rồi trong lô có câu `UPDATE … SET version = <đã đọc> + 1, updated_at = …`;
--    sai phiên bản thì trigger huỷ cả lô (tiền tố `credit_version_stale`, máy chủ dịch thành 409).
CREATE TABLE bil_credit_guard (
  party_id   TEXT PRIMARY KEY REFERENCES pty_party(id),
  version    INTEGER NOT NULL CHECK (version >= 0),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER bil_credit_guard_version BEFORE UPDATE ON bil_credit_guard
WHEN NEW.version <> OLD.version + 1
BEGIN SELECT RAISE(ABORT, 'credit_version_stale: hạn mức vừa thay đổi, mở lại đơn rồi thử lại'); END;
CREATE TRIGGER bil_credit_guard_no_delete BEFORE DELETE ON bil_credit_guard
BEGIN SELECT RAISE(ABORT, 'bil_append_only: không xoá dòng phiên bản hạn mức'); END;

-- 3. orders: hình thức thanh toán và hạn trả (chụp lúc xác nhận). Đơn cũ đều PREPAID, hạn trả NULL.
ALTER TABLE orders ADD COLUMN payment_term TEXT NOT NULL DEFAULT 'PREPAID' CHECK (payment_term IN ('PREPAID', 'CREDIT'));
ALTER TABLE orders ADD COLUMN credit_due_date TEXT;
-- Hình thức chỉ đổi được khi đơn còn nháp (đơn chờ duyệt vẫn là nháp); sau đó khoá (ADR-0168 Đ2 mục 1, đặc tả «Giả định»).
CREATE TRIGGER orders_payment_term_locked BEFORE UPDATE OF payment_term ON orders
WHEN NEW.payment_term <> OLD.payment_term AND OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'payment_term_locked: hình thức thanh toán chỉ đổi được khi đơn còn nháp'); END;

-- 4. View công bố cho module khác (chỉ đọc): đơn Trả sau.
CREATE VIEW v_ord_don_tra_sau AS
  SELECT id, order_code, booker_party_id, status, delivered_at, credit_due_date FROM orders WHERE payment_term = 'CREDIT';

-- 5. Trigger khoá Đã giao phải liệt kê MỌI cột của orders (bài NT-R6, src/migrations-orders-da-giao.test.ts). Thân y hệt 0136, thêm payment_term và credit_due_date.
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
    AND NEW.manifest_exempt IS OLD.manifest_exempt AND NEW.declared_deposit IS OLD.declared_deposit
    AND NEW.payment_term IS OLD.payment_term AND NEW.credit_due_date IS OLD.credit_due_date)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – đã thu đủ, không sửa được'); END;
