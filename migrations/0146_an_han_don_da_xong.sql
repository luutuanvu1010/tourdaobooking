-- Migration 0146 — ADR-0181 Đ1: «Ân hạn» được trên đơn Trả sau đã tới bước «Khách đã trả đủ» (tên cũ «Xong và đủ tiền») mà còn nợ (đối tác ghi đủ tiền, chưa nộp — ADR-0177). Ngoại lệ CÓ TÊN duy nhất của khoá
-- «đơn đã xong» (ADR-0025 H6): chỉ ba cột hạn trả (`credit_due_at`, `credit_grace_until`, `credit_due_date`) cùng giờ sửa `updated_at` được đổi; mọi cột khác vẫn khoá.
-- Số 0146: 0145 thuộc nhánh khác chưa gộp (claude/multi-role-admin-view-8030d2). Không đổi dữ liệu, chỉ tạo lại trigger. Tệp KHÔNG tự mở/đóng giao dịch. Không `CASE … END)` trong trigger.
--
-- Trường hợp được phép mới (thêm vào trường hợp «Hoàn thành» cũ, giữ nguyên trường hợp cũ):
--   * đơn Trả sau (`payment_term = 'CREDIT'`), hạn trả THẬT SỰ đổi sang một mốc khác NULL — câu chỉ đổi `credit_due_date` hay chỉ đổi `updated_at` vẫn bị chặn
--     (trigger `orders_credit_due_forward_only` của 0143 chỉ chạy khi `credit_due_at`/`credit_grace_until` nằm trong câu, nên điều kiện «hạn trả đổi» bắt nó chạy);
--   * MỌI cột còn lại bằng nhau, kể cả `completed_at`, `completed_by` (không gộp được với câu «Hoàn thành»).
-- `orders_credit_due_forward_only` (0143) vẫn canh: hạn chỉ lùi về sau, giữ nguyên số giờ ân hạn. Bài: src/migrations-orders-da-giao.test.ts (NT-R6, NT-R6b), src/tra-sau-don-da-xong.test.ts.
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
    AND NEW.company_collects_snapshot IS OLD.company_collects_snapshot)
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
    AND NEW.company_collects_snapshot IS OLD.company_collects_snapshot)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã tới bước Khách đã trả đủ, không sửa được'); END;
