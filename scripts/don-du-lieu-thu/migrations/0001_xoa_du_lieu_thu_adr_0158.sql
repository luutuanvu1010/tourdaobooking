-- Xoá MỘT LẦN dữ liệu thử trước khi dùng thật (ADR-0158). Tệp SINH MÁY bằng sinh-tep-xoa.mjs; không sửa tay. Cách chạy: README.md cùng thư mục cha.
-- Chốt chặn: một loại có nhiều dòng hơn số chủ đã đếm thì CHECK hỏng và dừng trước mọi câu xoá.
DROP TABLE IF EXISTS tmp_chot_chan_xoa_thu;
CREATE TABLE tmp_chot_chan_xoa_thu (loai TEXT NOT NULL, so INTEGER NOT NULL, tran INTEGER NOT NULL, CHECK (so <= tran));
INSERT INTO tmp_chot_chan_xoa_thu SELECT 'don', count(*), 157 FROM orders;
INSERT INTO tmp_chot_chan_xoa_thu SELECT 'phieu_thu', count(*), 103 FROM bil_payment_receipt;
INSERT INTO tmp_chot_chan_xoa_thu SELECT 'chuyen', count(*), 15 FROM vc_trip;
INSERT INTO tmp_chot_chan_xoa_thu SELECT 've_da_cap', count(*), 0 FROM vdt_allocation;
INSERT INTO tmp_chot_chan_xoa_thu SELECT 'muc_hoa_hong', count(*), 104 FROM prc_commission_rule;
INSERT INTO tmp_chot_chan_xoa_thu SELECT 'cap', count(*), 7 FROM prc_rate_tier;
DROP TABLE tmp_chot_chan_xoa_thu;

PRAGMA defer_foreign_keys = ON;

-- Gỡ 47 trigger; đặt lại nguyên văn ở cuối tệp.
DROP TRIGGER audit_log_no_delete;
DROP TRIGGER bil_accounting_entry_no_delete;
DROP TRIGGER bil_adjustment_request_no_delete;
DROP TRIGGER bil_debt_line_no_delete;
DROP TRIGGER bil_deposit_approval_no_delete;
DROP TRIGGER bil_outside_refund_no_delete;
DROP TRIGGER bil_payment_receipt_no_delete;
DROP TRIGGER bil_posting_no_delete;
DROP TRIGGER bil_receipt_bank_txn_no_delete;
DROP TRIGGER bil_receipt_recon_no_delete;
DROP TRIGGER dsp_release_event_no_delete;
DROP TRIGGER ord_cancel_reason_no_delete;
DROP TRIGGER ord_confirm_request_no_delete;
DROP TRIGGER ord_passenger_delivered_lock_del;
DROP TRIGGER ord_passenger_no_delete;
DROP TRIGGER ord_service_terms_no_delete;
DROP TRIGGER ord_service_terms_pax_no_delete;
DROP TRIGGER ord_transfer_leg_delivered_lock_del;
DROP TRIGGER ord_transfer_leg_no_delete;
DROP TRIGGER order_item_delivered_lock_del;
DROP TRIGGER order_item_frozen_delete;
DROP TRIGGER order_money_adjustment_frozen_delete;
DROP TRIGGER order_service_delivered_lock_del;
DROP TRIGGER order_service_frozen_delete;
DROP TRIGGER orders_no_delete;
DROP TRIGGER prc_commission_rule_no_delete;
DROP TRIGGER prc_commission_rule_pax_no_delete;
DROP TRIGGER prc_party_tier_no_delete;
DROP TRIGGER prc_rate_tier_no_delete;
DROP TRIGGER prc_role_tier_no_delete;
DROP TRIGGER vc_leg_appt_ack_no_delete;
DROP TRIGGER vc_refuse_deadline_no_delete;
DROP TRIGGER vc_transfer_check_no_delete;
DROP TRIGGER vc_transfer_request_no_delete;
DROP TRIGGER vc_trip_allocation_no_delete;
DROP TRIGGER vc_trip_cost_line_no_delete;
DROP TRIGGER vc_trip_departure_check_item_no_delete;
DROP TRIGGER vc_trip_departure_check_no_delete;
DROP TRIGGER vc_trip_driver_no_delete;
DROP TRIGGER vc_trip_event_no_delete;
DROP TRIGGER vc_trip_manifest_no_delete;
DROP TRIGGER vc_trip_no_delete;
DROP TRIGGER vc_trip_stop_no_delete;
DROP TRIGGER vdt_allocation_no_delete;
DROP TRIGGER vdt_delivery_no_delete;
DROP TRIGGER vdt_guest_link_no_delete;
DROP TRIGGER vdt_ticket_opened_guard;

-- Vé đã mở ảnh có thể đã tới tay người khác: giữ dấu mở trước khi xoá phân bổ, để trigger chặn nhập lại vĩnh viễn (ADR-0158 Đ1 mục 4).
UPDATE vdt_ticket SET opened_at = (SELECT max(a.revealed_at) FROM vdt_allocation a WHERE a.ticket_id = vdt_ticket.id), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE opened_at IS NULL AND EXISTS (SELECT 1 FROM vdt_allocation a WHERE a.ticket_id = vdt_ticket.id AND a.revealed_at IS NOT NULL);
-- Vé đã cấp không về kho. Có purged_at thì việc định kỳ sẽ xoá ảnh trên kho sau hạn lưu.
UPDATE vdt_ticket SET status = 'VOID', purged_at = COALESCE(purged_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE status = 'ALLOCATED';

-- Vé hỗ trợ giữ lại, chỉ bỏ liên kết tới đơn sắp xoá, kể cả mã đơn trong ngữ cảnh mà màn vé đọc lại.
UPDATE fbk_ticket SET order_id = NULL, order_code = NULL WHERE order_id IS NOT NULL OR order_code IS NOT NULL;
UPDATE fbk_ticket SET context = json_remove(context, '$.orderCode') WHERE json_valid(context) AND json_extract(context, '$.orderCode') IS NOT NULL;

-- Con trước cha. Nhật ký chỉ xoá dòng gắn đơn và dòng cùng id với sự kiện chuyến (R-VC-6: hai bên đi đôi).
DELETE FROM audit_log WHERE order_id IS NOT NULL OR id IN (SELECT id FROM vc_trip_event);
DELETE FROM bil_accounting_entry;
DELETE FROM bil_debt_line;
DELETE FROM bil_outside_refund;
DELETE FROM bil_receipt_bank_txn;
DELETE FROM bil_receipt_recon;
DELETE FROM dsp_assignment;
DELETE FROM dsp_release_event;
DELETE FROM ord_cancel_reason;
DELETE FROM ord_confirm_request;
DELETE FROM ord_passenger;
DELETE FROM ord_service_terms_pax;
DELETE FROM ord_transfer_leg;
DELETE FROM order_item;
DELETE FROM order_money_adjustment;
DELETE FROM prc_commission_rule_pax;
DELETE FROM prc_party_tier;
DELETE FROM prc_role_tier;
DELETE FROM vc_leg_appt_ack;
DELETE FROM vc_refuse_deadline;
DELETE FROM vc_transfer_check;
DELETE FROM vc_trip_cost_line;
DELETE FROM vc_trip_departure_check_item;
DELETE FROM vc_trip_driver;
DELETE FROM vc_trip_event;
DELETE FROM vc_trip_manifest;
DELETE FROM vdt_delivery;
DELETE FROM vdt_guest_link;
DELETE FROM bil_payment_receipt;
DELETE FROM bil_posting;
DELETE FROM ord_service_terms;
DELETE FROM vc_trip_allocation;
DELETE FROM vc_trip_departure_check;
DELETE FROM vdt_allocation;
DELETE FROM bil_adjustment_request;
DELETE FROM bil_deposit_approval;
DELETE FROM order_service;
DELETE FROM prc_commission_rule;
DELETE FROM vc_transfer_request;
DELETE FROM orders;
DELETE FROM prc_rate_tier;
DELETE FROM vc_trip_stop;
DELETE FROM vc_trip;

-- Đặt lại trigger nguyên văn (bài src/don-du-lieu-thu.test.ts so với lược đồ trước đó).
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_append_only: nhật ký không được xoá'); END;
CREATE TRIGGER bil_accounting_entry_no_delete BEFORE DELETE ON bil_accounting_entry
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dấu nhập phần mềm kế toán không xoá được — bỏ dấu bằng dòng mới có lý do'); END;
CREATE TRIGGER bil_adjustment_request_no_delete BEFORE DELETE ON bil_adjustment_request
BEGIN SELECT RAISE(ABORT, 'bil_append_only: yêu cầu điều chỉnh không xoá được'); END;
CREATE TRIGGER bil_debt_line_no_delete BEFORE DELETE ON bil_debt_line
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dòng nợ không xoá được — sai thì ghi dòng đảo'); END;
CREATE TRIGGER bil_deposit_approval_no_delete BEFORE DELETE ON bil_deposit_approval
BEGIN SELECT RAISE(ABORT, 'bil_append_only: khoản duyệt không xoá được'); END;
CREATE TRIGGER bil_outside_refund_no_delete BEFORE DELETE ON bil_outside_refund
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dòng đã hoàn ngoài hệ thống không xoá được'); END;
CREATE TRIGGER bil_payment_receipt_no_delete BEFORE DELETE ON bil_payment_receipt
BEGIN SELECT RAISE(ABORT, 'bil_append_only: lần thu không xoá được — sai thì ghi dòng đảo'); END;
CREATE TRIGGER bil_posting_no_delete BEFORE DELETE ON bil_posting
BEGIN SELECT RAISE(ABORT, 'bil_append_only: phiếu sổ không xoá được'); END;
CREATE TRIGGER bil_receipt_bank_txn_no_delete BEFORE DELETE ON bil_receipt_bank_txn
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mã giao dịch đã gắn không xoá được'); END;
CREATE TRIGGER bil_receipt_recon_no_delete BEFORE DELETE ON bil_receipt_recon
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dấu đối chiếu không xoá được'); END;
CREATE TRIGGER dsp_release_event_no_delete BEFORE DELETE ON dsp_release_event
BEGIN SELECT RAISE(ABORT, 'dsp_release_event_append_only: sổ sự kiện phân công không xoá'); END;
CREATE TRIGGER ord_cancel_reason_no_delete BEFORE DELETE ON ord_cancel_reason
BEGIN SELECT RAISE(ABORT, 'ord_append_only: lý do huỷ không xoá được'); END;
CREATE TRIGGER ord_confirm_request_no_delete BEFORE DELETE ON ord_confirm_request
BEGIN SELECT RAISE(ABORT, 'ord_confirm_request_no_delete: yêu cầu xác nhận không xoá'); END;
CREATE TRIGGER ord_passenger_delivered_lock_del BEFORE DELETE ON ord_passenger
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không xoá hành khách'); END;
CREATE TRIGGER ord_passenger_no_delete BEFORE DELETE ON ord_passenger
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'passenger_frozen: đơn không còn nháp — nhập nhầm thì huỷ dòng'); END;
CREATE TRIGGER ord_service_terms_no_delete BEFORE DELETE ON ord_service_terms
BEGIN SELECT RAISE(ABORT, 'terms_append_only: bản chụp không xoá được'); END;
CREATE TRIGGER ord_service_terms_pax_no_delete BEFORE DELETE ON ord_service_terms_pax
BEGIN SELECT RAISE(ABORT, 'terms_append_only: bản chụp số theo loại không xoá được'); END;
CREATE TRIGGER ord_transfer_leg_delivered_lock_del BEFORE DELETE ON ord_transfer_leg
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không xoá chặng đưa đón'); END;
CREATE TRIGGER ord_transfer_leg_no_delete BEFORE DELETE ON ord_transfer_leg
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'leg_frozen: đơn không còn nháp — bỏ chặng thì đóng dòng'); END;
CREATE TRIGGER order_item_delivered_lock_del BEFORE DELETE ON order_item
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không xoá dòng tiền'); END;
CREATE TRIGGER order_item_frozen_delete BEFORE DELETE ON order_item
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_money_frozen: đơn đã xác nhận / đã huỷ — dòng tiền không đổi được'); END;
CREATE TRIGGER order_money_adjustment_frozen_delete BEFORE DELETE ON order_money_adjustment
BEGIN SELECT RAISE(ABORT, 'append_only: dòng điều chỉnh không xoá được'); END;
CREATE TRIGGER order_service_delivered_lock_del BEFORE DELETE ON order_service
WHEN (SELECT delivered_at FROM orders WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không xoá dịch vụ'); END;
CREATE TRIGGER order_service_frozen_delete BEFORE DELETE ON order_service
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: đơn không còn ở trạng thái nháp'); END;
CREATE TRIGGER orders_no_delete BEFORE DELETE ON orders
WHEN OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: đơn không còn ở trạng thái nháp — không xoá; huỷ đơn thì chuyển trạng thái Đã huỷ'); END;
CREATE TRIGGER prc_commission_rule_no_delete BEFORE DELETE ON prc_commission_rule
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá dòng mức — đóng hiệu lực'); END;
CREATE TRIGGER prc_commission_rule_pax_no_delete BEFORE DELETE ON prc_commission_rule_pax
BEGIN SELECT RAISE(ABORT, 'prc_append_only: số tiền theo loại không xoá được'); END;
CREATE TRIGGER prc_party_tier_no_delete BEFORE DELETE ON prc_party_tier
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá gắn mức riêng — đóng hiệu lực'); END;
CREATE TRIGGER prc_rate_tier_no_delete BEFORE DELETE ON prc_rate_tier
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá mức TA — tắt bằng active = 0'); END;
CREATE TRIGGER prc_role_tier_no_delete BEFORE DELETE ON prc_role_tier
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá gắn loại-mức — đóng hiệu lực'); END;
CREATE TRIGGER vc_leg_appt_ack_no_delete BEFORE DELETE ON vc_leg_appt_ack
BEGIN SELECT RAISE(ABORT, 'gb_append_only: mốc giờ hẹn chỉ thêm — không xoá'); END;
CREATE TRIGGER vc_refuse_deadline_no_delete BEFORE DELETE ON vc_refuse_deadline
BEGIN SELECT RAISE(ABORT, 'rd_no_delete: hạn từ chối không xoá'); END;
CREATE TRIGGER vc_transfer_check_no_delete BEFORE DELETE ON vc_transfer_check
BEGIN SELECT RAISE(ABORT, 'ck_append_only: dòng kiểm chuyển khách chỉ thêm'); END;
CREATE TRIGGER vc_transfer_request_no_delete BEFORE DELETE ON vc_transfer_request
BEGIN SELECT RAISE(ABORT, 'ck_append_only: đề nghị chuyển khách không xoá'); END;
CREATE TRIGGER vc_trip_allocation_no_delete BEFORE DELETE ON vc_trip_allocation
BEGIN SELECT RAISE(ABORT, 'lc04_no_delete: suất không xoá — đóng dòng'); END;
CREATE TRIGGER vc_trip_cost_line_no_delete BEFORE DELETE ON vc_trip_cost_line
BEGIN SELECT RAISE(ABORT, 'vc_cost_append_only: dòng chi phí không xoá'); END;
CREATE TRIGGER vc_trip_departure_check_item_no_delete BEFORE DELETE ON vc_trip_departure_check_item
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: dòng con bản chụp không xoá'); END;
CREATE TRIGGER vc_trip_departure_check_no_delete BEFORE DELETE ON vc_trip_departure_check
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: bản chụp điều kiện xuất bến không xoá'); END;
CREATE TRIGGER vc_trip_driver_no_delete BEFORE DELETE ON vc_trip_driver
BEGIN SELECT RAISE(ABORT, 'lc04_no_delete: dòng tài xế không xoá — đóng dòng'); END;
CREATE TRIGGER vc_trip_event_no_delete BEFORE DELETE ON vc_trip_event
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: sự kiện chuyến không xoá'); END;
CREATE TRIGGER vc_trip_manifest_no_delete BEFORE DELETE ON vc_trip_manifest
BEGIN SELECT RAISE(ABORT, 'vc_trip_append_only: bản chốt danh sách không xoá'); END;
CREATE TRIGGER vc_trip_no_delete BEFORE DELETE ON vc_trip
BEGIN SELECT RAISE(ABORT, 'lc04_no_delete: chuyến không xoá — huỷ chuyến'); END;
CREATE TRIGGER vc_trip_stop_no_delete BEFORE DELETE ON vc_trip_stop
BEGIN SELECT RAISE(ABORT, 'lc04_no_delete: điểm dừng không xoá — bỏ qua điểm'); END;
CREATE TRIGGER vdt_allocation_no_delete BEFORE DELETE ON vdt_allocation
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: phân bổ vé chỉ thêm'); END;
CREATE TRIGGER vdt_delivery_no_delete BEFORE DELETE ON vdt_delivery
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: lần giao vé chỉ thêm'); END;
CREATE TRIGGER vdt_guest_link_no_delete BEFORE DELETE ON vdt_guest_link
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: đường dẫn khách không xoá được — thu hồi'); END;
CREATE TRIGGER vdt_ticket_opened_guard BEFORE UPDATE OF opened_at, opened_by ON vdt_ticket
WHEN (NEW.opened_at IS NOT OLD.opened_at OR NEW.opened_by IS NOT OLD.opened_by)
  AND (OLD.opened_at IS NOT NULL OR NEW.opened_at IS NULL OR OLD.withdrawn_at IS NULL OR OLD.stored_at IS NULL
    OR EXISTS (SELECT 1 FROM vdt_ticket s WHERE s.withdrawn_at IS NULL AND s.ticket_code = OLD.ticket_code)
    OR EXISTS (SELECT 1 FROM vdt_ticket s WHERE s.withdrawn_at IS NULL AND s.content_hash = OLD.content_hash)
    OR EXISTS (SELECT 1 FROM vdt_ticket s WHERE s.withdrawn_at IS NULL AND (length(s.ticket_code) = 36 AND length(OLD.ticket_code) = 36 AND s.ticket_code NOT GLOB '*[^0-9]*' AND OLD.ticket_code NOT GLOB '*[^0-9]*' AND substr(s.ticket_code, -12) = substr(OLD.ticket_code, -12))))
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: dấu mở ảnh chỉ ghi một lần, chỉ cho vé đã rút không còn bản đang bán'); END;
