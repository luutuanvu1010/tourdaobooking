-- Migration 0144 — ADR-0178 Phần A, Đ1 mục 1–2: công tắc «Khách của đối tác trả cho Công ty» và dấu chụp lúc lập đơn của tài khoản Đối tác. Kế hoạch Task A1.
-- Số 0144: 0142 thuộc nhánh «Có vé» (ADR-0174), 0143 là Trả sau theo giờ; người nhập sau đổi số theo docs/adr/README.md. CHỈ MỞ RỘNG (expand). Tệp KHÔNG tự mở/đóng giao dịch.
-- Không `CASE … END)` trong trigger.

-- 1. Công tắc chung của Nền tảng (CHỈ THÊM; hiệu lực = dòng đang mở tại thời điểm hỏi). Không có dòng nào ⇒ Bật (1), đúng như trước khi có công tắc.
CREATE TABLE bil_partner_channel_setting (
  id                TEXT PRIMARY KEY,
  company_collects  INTEGER NOT NULL CHECK (company_collects IN (0, 1)),
  valid_from        TEXT NOT NULL,
  valid_to          TEXT,
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
CREATE TRIGGER bil_partner_channel_setting_no_delete BEFORE DELETE ON bil_partner_channel_setting
BEGIN SELECT RAISE(ABORT, 'bil_append_only: công tắc Khách của đối tác trả cho Công ty chỉ thêm dòng mới, không xoá'); END;
-- Chỉ được ĐÓNG một lần (đặt valid_to từ NULL, kèm updated_*); mọi cột khác bất biến.
CREATE TRIGGER bil_partner_channel_setting_close_only BEFORE UPDATE ON bil_partner_channel_setting
WHEN OLD.valid_to IS NOT NULL OR NEW.valid_to IS NULL OR NEW.id IS NOT OLD.id OR NEW.company_collects IS NOT OLD.company_collects
  OR NEW.valid_from IS NOT OLD.valid_from OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'bil_append_only: công tắc chỉ được đóng một lần — đổi thì đóng dòng cũ, thêm dòng mới'); END;

-- 2. Dấu trên đơn: trạng thái công tắc lúc LẬP đơn của tài khoản Đối tác (NULL = đơn không do tài khoản Đối tác lập). Ghi một lần, CSDL cấm đổi.
ALTER TABLE orders ADD COLUMN company_collects_snapshot INTEGER CHECK (company_collects_snapshot IS NULL OR company_collects_snapshot IN (0, 1));
-- Chặn cả NULL → 0/1 (đơn cũ không được gắn dấu về sau); ghi lại đúng giá trị cũ không lỗi.
CREATE TRIGGER orders_company_collects_locked BEFORE UPDATE OF company_collects_snapshot ON orders
WHEN OLD.company_collects_snapshot IS NOT NEW.company_collects_snapshot
BEGIN SELECT RAISE(ABORT, 'company_collects_locked: dấu Khách của đối tác trả cho Công ty chụp một lần lúc lập đơn, không đổi'); END;

-- 3. View công bố cho billing (A3 dùng để kiểm người thu): người lập + dấu.
CREATE VIEW v_ord_kenh_thu AS SELECT id, staff_id, company_collects_snapshot FROM orders;

-- 4. Khoá «Xong và đủ tiền» dựng lại: thân y hệt 0143, thêm company_collects_snapshot vào danh sách cột (bài NT-R6, src/migrations-orders-da-giao.test.ts).
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
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã tới bước Xong và đủ tiền, không sửa được'); END;

-- 5. Lớp CSDL của cổng người thu (ADR-0178 Đ1 mục 3; Task A3): đơn mang dấu Tắt (0) chỉ nhận khoản KHÁCH TRẢ MỚI (CUSTOMER_PAYMENT, không phải dòng đảo) có người thu =
-- hồ sơ của tài khoản đã lập đơn. Người lập chưa gắn hồ sơ (hoặc không còn nhãn) ⇒ so với NULL ⇒ mọi khoản bị chặn. Tiền ra (CUSTOMER_REFUND) và dòng đảo
-- (reverses_id ≠ NULL, chép người thu của dòng gốc) miễn. Đọc qua view công bố (v_ord_kenh_thu, v_stf_staff_label), không đọc bảng orders/staff thô.
-- Máy chủ kiểm trước lô (`kiemNguoiThuKenh`, billing/kenh-thu.ts); trigger là lớp sau: RAISE huỷ cả lô.
CREATE TRIGGER bil_receipt_partner_channel BEFORE INSERT ON bil_payment_receipt
WHEN NEW.kind_code = 'CUSTOMER_PAYMENT' AND NEW.reverses_id IS NULL
  AND EXISTS (SELECT 1 FROM v_ord_kenh_thu k WHERE k.id = NEW.order_id AND k.company_collects_snapshot = 0
    AND (NEW.collector_party_id IS NULL OR NEW.collector_party_id IS NOT (SELECT s.party_id FROM v_stf_staff_label s WHERE s.id = k.staff_id)))
BEGIN SELECT RAISE(ABORT, 'partner_channel_collector: đơn này chỉ nhận tiền khách trả cho đối tác đã lập đơn'); END;
