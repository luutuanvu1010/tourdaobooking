-- Migration 0187 — ADR-0230 (chủ duyệt 2026-11-22): mọi thay đổi trên bảng `orders` của Việc 11 gom MỘT tệp (ADR-0230 dòng «Số giữ trước»).
-- Phần A (Đ1 mục 3): cột `orders.credit_basis` — loại Trả sau chụp lúc xác nhận. Phần B (Đ2, «Trả lúc check-in»): người khác thêm vào CUỐI tệp này (chỗ đánh dấu bên dưới).
-- CHỈ MỞ RỘNG (expand): một cột, một trigger mới; TẠO LẠI (giữ tên) orders_delivered_lock (chép NGUYÊN thân 0184, thêm credit_basis ở cả hai trường hợp được phép — NT-R6)
-- và view v_ord_don_tra_sau (giữ mọi cột cũ, thêm credit_basis). Tệp KHÔNG tự mở/đóng giao dịch. Không `CASE … END)` trong thân trigger.
-- HOÀN TÁC: D1 không có bước "down"; mã cũ không đọc cột mới. Lùi bản mã an toàn: cột NULL / 'LIMIT' không làm mã cũ đổi hành vi.

-- ===== PHẦN A — loại Trả sau (ADR-0230 Đ1 mục 3) =====
-- 1. Cột. NULL = đơn Thanh toán ngay, hoặc đơn Trả sau còn nháp (loại chụp lúc xác nhận). 'LIMIT' = Trả sau theo hạn mức; 'SERVICE' = Trả sau theo dịch vụ.
ALTER TABLE orders ADD COLUMN credit_basis TEXT CHECK (credit_basis IS NULL OR credit_basis IN ('LIMIT', 'SERVICE'));

-- 2. Điền đơn cũ: mọi đơn Trả sau ĐÃ QUA NHÁP (xác nhận, huỷ, đã giao) là Trả sau theo hạn mức. Nháp Trả sau giữ NULL — lô xác nhận sẽ chụp loại thật (gắn 'LIMIT' cho nháp
-- thì trigger mục 3 chặn chụp 'SERVICE' về sau). Gỡ khoá «Khách đã trả đủ» của 0184 TRƯỚC khi điền (bài học 0143, kiểm độc lập 2026-11-06): khoá cũ không biết cột mới nên
-- chặn mọi UPDATE trên đơn đã giao ⇒ migration đỏ giữa chừng. Khoá mới (có credit_basis) dựng lại ở mục 4, vẫn trong cùng lần áp. Trigger mục 3 tạo SAU câu điền
-- (câu điền không chụp hạn trả nên trigger sẽ chặn nó). Các trigger BEFORE UPDATE ON orders khác (0007 tiền, 0008/0034 lúc chuyển sang xác nhận) không vướng: câu điền
-- không đổi tiền, không đổi trạng thái.
DROP TRIGGER orders_delivered_lock;
UPDATE orders SET credit_basis = 'LIMIT' WHERE payment_term = 'CREDIT' AND status <> 'draft';

-- 3. Cách đổi loại (khuôn orders_partner_cash_only_guard của 0184, nhưng điểm chụp là CÂU CHỤP HẠN TRẢ của lô xác nhận — câu đó chạy SAU câu đổi trạng thái trong cùng lô,
-- nên không dùng điều kiện «draft → confirmed»): NULL → giá trị CHỈ khi chính câu đó chụp hạn trả lần đầu (`credit_due_at` NULL → có) và đơn là Trả sau. Giá trị → giá trị
-- khác, hoặc → NULL: không bao giờ. Gắn loại cho đơn Thanh toán ngay: không bao giờ (hình thức đã khoá sau nháp — 0141).
CREATE TRIGGER orders_credit_basis_guard BEFORE UPDATE OF credit_basis ON orders
WHEN NEW.credit_basis IS NOT OLD.credit_basis
  AND (OLD.credit_basis IS NOT NULL
    OR NOT (OLD.credit_due_at IS NULL AND NEW.credit_due_at IS NOT NULL AND NEW.payment_term = 'CREDIT' AND OLD.status <> 'draft'))
BEGIN SELECT RAISE(ABORT, 'credit_basis_locked: loại trả sau chỉ chụp một lần lúc xác nhận, không đổi được'); END;

-- 4. Khoá «đơn đã xong» phủ MỌI cột (NT-R6, NT-R6b ở src/migrations-orders-da-giao.test.ts): chép NGUYÊN thân 0184, thêm credit_basis ở cả hai nhánh. (Bản cũ đã gỡ ở mục 2.)
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
    AND NEW.acting_party_id IS OLD.acting_party_id AND NEW.acting_link_kind IS OLD.acting_link_kind
    AND NEW.partner_cash_only IS OLD.partner_cash_only AND NEW.credit_basis IS OLD.credit_basis)
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
    AND NEW.acting_party_id IS OLD.acting_party_id AND NEW.acting_link_kind IS OLD.acting_link_kind
    AND NEW.partner_cash_only IS OLD.partner_cash_only AND NEW.credit_basis IS OLD.credit_basis)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã tới bước Khách đã trả đủ, không sửa được'); END;

-- 5. View công bố cho billing: giữ mọi cột cũ (0143), thêm credit_basis (nợ tách «theo hạn mức» / «theo dịch vụ» — ADR-0230 Đ1 mục 4).
DROP VIEW v_ord_don_tra_sau;
CREATE VIEW v_ord_don_tra_sau AS
  SELECT id, order_code, booker_party_id, status, delivered_at, credit_due_date, credit_due_at, credit_grace_until, credit_basis FROM orders WHERE payment_term = 'CREDIT';

-- ===== PHẦN B — «Trả lúc check-in» (ADR-0230 Đ2): người thi công phần B thêm từ đây. =====
