-- Migration 0184 — ADR-0225 Đ2 (Việc 5 (b2), kế hoạch 16 việc 21/11/2026): «đơn đối tác chỉ thu hộ tiền mặt». Số 0184 giữ trước trong brief của phiên điều phối.
-- CHỈ MỞ RỘNG (expand): một cột dấu trên orders, một view công bố, hai trigger mới; TẠO LẠI (giữ tên) orders_delivered_lock (chép NGUYÊN thân 0175, thêm cột mới ở cả hai
-- trường hợp được phép — NT-R6). Không sửa dòng dữ liệu cũ nào: mọi đơn đang có mang NULL; đơn ĐÃ xác nhận không bao giờ được gắn dấu về sau (trigger mục 2).
-- Tệp KHÔNG tự mở/đóng giao dịch. Không `CASE … END)` trong thân trigger. Thân trigger chỉ đọc bảng cùng module hoặc view công bố.

-- 1. Dấu trên đơn. NULL = đơn không theo luật (mọi đơn xác nhận trước ngày áp). 1 = đơn đối tác: lúc xác nhận, đơn do tài khoản giữ quyền Đối tác lập
-- (company_collects_snapshot IS NOT NULL) HOẶC bên đặt đang mang vai được hưởng hoa hồng. 0 = đơn xác nhận sau ngày áp nhưng không phải đơn đối tác.
-- Ghi ở câu xác nhận (order_confirm) và chụp lại ở «Đổi khách» của đơn đã xác nhận (changeBooker). Máy chủ tính; CSDL chỉ canh cách đổi.
ALTER TABLE orders ADD COLUMN partner_cash_only INTEGER CHECK (partner_cash_only IS NULL OR partner_cash_only IN (0, 1));

-- 2. Cách đổi dấu: NULL → giá trị CHỈ trong chính câu xác nhận (draft → confirmed); giá trị → NULL không bao giờ. 0 ↔ 1 được (đổi bên đặt sau xác nhận).
CREATE TRIGGER orders_partner_cash_only_guard BEFORE UPDATE OF partner_cash_only ON orders
WHEN (OLD.partner_cash_only IS NULL AND NEW.partner_cash_only IS NOT NULL AND NOT (OLD.status = 'draft' AND NEW.status = 'confirmed'))
  OR (OLD.partner_cash_only IS NOT NULL AND NEW.partner_cash_only IS NULL)
BEGIN SELECT RAISE(ABORT, 'partner_cash_only_locked: dấu «đơn đối tác chỉ thu hộ tiền mặt» chỉ gắn lúc xác nhận, không gỡ được'); END;

-- 3. View công bố cho billing (khuôn v_ord_kenh_thu của 0144): chỉ khoá + dấu.
CREATE VIEW v_ord_thu_ho_tien_mat AS SELECT id, partner_cash_only FROM orders;

-- 4. Lớp CSDL của cổng (máy chủ kiểm trước lô trong kiemNguoiThuKenh, billing/kenh-thu.ts): ở đơn mang dấu 1, khoản KHÁCH TRẢ MỚI (CUSTOMER_PAYMENT, không đảo,
-- không phải nửa thu của lệnh chuyển cọc) mà người thu là phía Tour Đảo (COMPANY, STAFF) phải là tiền mặt. Khách trả thẳng đối tác (BOOKER) hoặc tại quầy nhà cung cấp
-- (SUPPLIER), tiền ra (CUSTOMER_REFUND), dòng đảo và lệnh chuyển cọc miễn. Người thu vai STAFF là chính hồ sơ của TÀI KHOẢN ĐỐI TÁC đã lập đơn (đối tác không hưởng hoa hồng
-- ghi «Tôi thu»: tiền vào tay đối tác, không vào Tour Đảo) cũng miễn — đọc qua v_ord_kenh_thu, v_stf_staff_label như trigger 0144. RAISE huỷ cả lô.
CREATE TRIGGER bil_receipt_partner_cash_only BEFORE INSERT ON bil_payment_receipt
WHEN NEW.kind_code = 'CUSTOMER_PAYMENT' AND NEW.reverses_id IS NULL AND NEW.transfer_of_id IS NULL
  AND NEW.collector_role_code IN ('COMPANY', 'STAFF') AND NEW.method_code IS NOT 'CASH'
  AND EXISTS (SELECT 1 FROM v_ord_thu_ho_tien_mat k WHERE k.id = NEW.order_id AND k.partner_cash_only = 1)
  AND NOT (NEW.collector_role_code = 'STAFF' AND EXISTS (SELECT 1 FROM v_ord_kenh_thu c WHERE c.id = NEW.order_id AND c.company_collects_snapshot IS NOT NULL
    AND NEW.collector_party_id IS (SELECT s.party_id FROM v_stf_staff_label s WHERE s.id = c.staff_id)))
BEGIN SELECT RAISE(ABORT, 'partner_cash_only: đơn của đối tác chỉ nhận khoản thu hộ bằng tiền mặt'); END;

-- 5. Khoá «đơn đã xong» phủ MỌI cột (NT-R6, NT-R6b ở src/migrations-orders-da-giao.test.ts): chép NGUYÊN thân 0175, thêm partner_cash_only.
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
    AND NEW.acting_party_id IS OLD.acting_party_id AND NEW.acting_link_kind IS OLD.acting_link_kind
    AND NEW.partner_cash_only IS OLD.partner_cash_only)
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
    AND NEW.partner_cash_only IS OLD.partner_cash_only)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã tới bước Khách đã trả đủ, không sửa được'); END;
