-- Migration 0143 — ADR-0172 (hạn trả theo giờ, ân hạn, số gợi ý theo cấp, Quản trị đặt) và ADR-0173 (mức tối đa Quản trị được cấp, nới hạn, tin nhắc), cả hai chủ duyệt 2026-11-05.
-- Kế hoạch docs/superpowers/plans/2026-11-05-tra-sau-lam-het-no.md, mục «Đối chiếu ADR-0172, ADR-0173». Số 0143: 0142 đã thuộc nhánh «Có vé» (ADR-0174) chưa nhập.
-- CHỈ MỞ RỘNG (expand): GIỮ `bil_credit_limit.term_days` và `orders.credit_due_date`, mã mới vẫn ghi chúng (term_days = trần giờ/24 kẹp 1..365; credit_due_date = ngày VN của
-- hạn trả) để lùi về bản trước an toàn. Bỏ hai cột cũ ở một lần phát hành sau (ghi docs/HANDOFF-N1.md). Tệp KHÔNG tự mở/đóng giao dịch. Không `CASE … END)` trong trigger.

-- 1. Hạn mức: thời hạn trả và ân hạn theo GIỜ (ADR-0172 Đ3 mục 1; trần 365 ngày chặn nhập nhầm). Dòng cũ: thời hạn = số ngày × 24, ân hạn 0.
ALTER TABLE bil_credit_limit ADD COLUMN term_hours INTEGER CHECK (term_hours IS NULL OR term_hours BETWEEN 1 AND 8760);
ALTER TABLE bil_credit_limit ADD COLUMN grace_hours INTEGER NOT NULL DEFAULT 0 CHECK (grace_hours BETWEEN 0 AND 8760);
-- Khoá «chỉ đóng một lần» cũ chặn mọi UPDATE dòng đang mở nên phải gỡ TRƯỚC khi điền giờ cho dòng cũ, rồi dựng lại (mục dưới).
DROP TRIGGER bil_credit_limit_close_only;
UPDATE bil_credit_limit SET term_hours = term_days * 24 WHERE term_hours IS NULL;
-- Dòng MỚI phải có thời hạn giờ (cột thêm sau không đặt NOT NULL được vì dòng cũ — trigger canh thay).
CREATE TRIGGER bil_credit_limit_hours_required BEFORE INSERT ON bil_credit_limit
WHEN NEW.term_hours IS NULL
BEGIN SELECT RAISE(ABORT, 'bil_credit_hours_required: hạn mức trả sau phải có thời hạn trả theo giờ'); END;
-- Chỉ đóng được một lần: dựng lại, thêm hai cột mới vào tập cột bất biến.
CREATE TRIGGER bil_credit_limit_close_only BEFORE UPDATE ON bil_credit_limit
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id
  OR NEW.limit_amount IS NOT OLD.limit_amount OR NEW.term_days IS NOT OLD.term_days OR NEW.valid_from_date IS NOT OLD.valid_from_date
  OR NEW.reason IS NOT OLD.reason OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.term_hours IS NOT OLD.term_hours OR NEW.grace_hours IS NOT OLD.grace_hours
BEGIN SELECT RAISE(ABORT, 'bil_append_only: hạn mức trả sau chỉ được đóng một lần — đổi thì đóng dòng cũ, thêm dòng mới'); END;

-- 2. Mức tối đa Quản trị được cấp (ADR-0173 Đ1 mục 1): CHỈ THÊM, dòng hiệu lực = dòng có `created_at` lớn nhất (rowid phá hoà). Chưa có dòng nào ⇒ Quản trị không đặt được hạn mức.
CREATE TABLE bil_credit_setting (
  id                  TEXT PRIMARY KEY,
  admin_limit_ceiling INTEGER NOT NULL CHECK (admin_limit_ceiling > 0 AND admin_limit_ceiling <= 10000000000),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT
);
CREATE TRIGGER bil_credit_setting_no_update BEFORE UPDATE ON bil_credit_setting
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mức tối đa Quản trị được cấp chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER bil_credit_setting_no_delete BEFORE DELETE ON bil_credit_setting
BEGIN SELECT RAISE(ABORT, 'bil_append_only: không xoá mức tối đa Quản trị được cấp'); END;

-- 3. Số gợi ý theo cấp đại lý (ADR-0172 Đ2): chỉ để ĐIỀN SẴN bảng bật Trả sau, không cổng nào đọc (bài src/tra-sau-goi-y-khong-cong.test.ts). Một dòng mỗi cấp; đổi = sửa dòng.
CREATE TABLE bil_credit_tier_default (
  tier_code    TEXT PRIMARY KEY REFERENCES prc_rate_tier(code),
  limit_amount INTEGER NOT NULL CHECK (limit_amount > 0 AND limit_amount <= 10000000000),
  term_hours   INTEGER NOT NULL CHECK (term_hours BETWEEN 1 AND 8760),
  grace_hours  INTEGER NOT NULL CHECK (grace_hours BETWEEN 0 AND 8760),
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT
);
CREATE TRIGGER bil_credit_tier_default_no_delete BEFORE DELETE ON bil_credit_tier_default
BEGIN SELECT RAISE(ABORT, 'bil_append_only: không xoá số gợi ý theo cấp — sửa số'); END;

-- 4. Tin nhắc đã gửi (ADR-0173 Đ3 mục 2): mỗi đơn, mỗi loại, mỗi MỐC hạn trả gửi đúng một lần — khoá chính chặn lặp; nới hạn sinh mốc mới nên nhắc lại theo hạn mới.
--    Loại: TRUOC_HAN (6 giờ trước hạn trả) | QUA_HAN (sau hạn trả). Danh sách giá trị mở kiểm ở mã. Không sửa, không xoá.
CREATE TABLE bil_credit_reminder (
  order_id   TEXT NOT NULL,
  kind       TEXT NOT NULL,
  due_at     TEXT NOT NULL,
  party_id   TEXT NOT NULL REFERENCES pty_party(id),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (order_id, kind, due_at)
);
CREATE TRIGGER bil_credit_reminder_no_update BEFORE UPDATE ON bil_credit_reminder
BEGIN SELECT RAISE(ABORT, 'bil_append_only: tin nhắc trả sau đã gửi không sửa'); END;
CREATE TRIGGER bil_credit_reminder_no_delete BEFORE DELETE ON bil_credit_reminder
BEGIN SELECT RAISE(ABORT, 'bil_append_only: tin nhắc trả sau đã gửi không xoá'); END;

-- 5. orders: hai mốc giờ của đơn Trả sau (ADR-0172 Đ3 mục 2). Đơn cũ: hạn trả = 23:59:59.999 giờ VN của ngày hạn (đúng nghĩa cũ «quá hạn từ ngày hôm sau»), ân hạn 0.
ALTER TABLE orders ADD COLUMN credit_due_at TEXT;
ALTER TABLE orders ADD COLUMN credit_grace_until TEXT;
-- Gỡ khoá «Xong và đủ tiền» của 0141 TRƯỚC khi điền (kiểm độc lập 2026-11-06): khoá cũ chặn mọi sửa trên đơn đã giao nên đơn Trả sau cũ đã giao làm migration đỏ giữa chừng.
-- Khoá mới (thêm hai cột) dựng lại ở mục 7, vẫn trong cùng lần áp migration.
DROP TRIGGER orders_delivered_lock;
UPDATE orders SET credit_due_at = credit_due_date || 'T16:59:59.999Z', credit_grace_until = credit_due_date || 'T16:59:59.999Z'
  WHERE payment_term = 'CREDIT' AND credit_due_date IS NOT NULL;
-- Hai mốc chỉ đi về SAU, khoảng ân hạn của đơn giữ nguyên (ADR-0173 Đ1 mục 3: chỉ nới, không rút ngắn; số giờ ân hạn của đơn giữ nguyên). Lần chụp đầu (từ NULL) tự do.
CREATE TRIGGER orders_credit_due_forward_only BEFORE UPDATE OF credit_due_at, credit_grace_until ON orders
WHEN OLD.credit_due_at IS NOT NULL AND (NEW.credit_due_at IS NULL OR NEW.credit_grace_until IS NULL OR NEW.credit_due_at <= OLD.credit_due_at
  OR round((julianday(NEW.credit_grace_until) - julianday(NEW.credit_due_at)) * 86400000) <> round((julianday(OLD.credit_grace_until) - julianday(OLD.credit_due_at)) * 86400000))
BEGIN SELECT RAISE(ABORT, 'credit_due_forward_only: hạn trả chỉ lùi về sau, giữ nguyên số giờ ân hạn'); END;

-- 6. View công bố cho billing: thêm hai mốc giờ.
DROP VIEW v_ord_don_tra_sau;
CREATE VIEW v_ord_don_tra_sau AS
  SELECT id, order_code, booker_party_id, status, delivered_at, credit_due_date, credit_due_at, credit_grace_until FROM orders WHERE payment_term = 'CREDIT';

-- 7. Trigger khoá «Xong và đủ tiền» liệt kê MỌI cột của orders (bài NT-R6, src/migrations-orders-da-giao.test.ts). Thân y hệt 0141, thêm credit_due_at, credit_grace_until. (Bản cũ đã gỡ ở mục 5.)
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
    AND NEW.credit_due_at IS OLD.credit_due_at AND NEW.credit_grace_until IS OLD.credit_grace_until)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã tới bước Xong và đủ tiền, không sửa được'); END;

-- 8. View hộp thư của `audit` (nguồn: 0135): thêm hai tin nhắc hạn trả sau (ADR-0173 Đ3 mục 2). Cùng cột, chỉ khoá. Dòng do Cron ghi: một dòng cho MỖI tài khoản
--    của bên đặt (target_type 'staff') và, lúc quá hạn, một dòng cho Kế toán (target_type 'ledger'); bảng `bil_credit_reminder` chống gửi lặp.
DROP VIEW v_aud_ledger_event;
CREATE VIEW v_aud_ledger_event AS
  SELECT id, order_id, target_type, target_id, staff_id, action, created_at FROM audit_log
  WHERE action IN ('ledger_adjustment_requested', 'ledger_adjustment_approved', 'ledger_adjustment_rejected', 'ledger_adjustment_withdrawn', 'ledger_adjustment_affected',
    'attribution_requested', 'attribution_ruled', 'attribution_posted', 'attribution_reassigned', 'attribution_reversed', 'attribution_responded', 'ledger_receipt_collector_changed',
    'credit_due_soon_reminded', 'credit_overdue_reminded');
