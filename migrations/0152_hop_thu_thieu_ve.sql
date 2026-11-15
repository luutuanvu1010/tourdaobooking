-- Migration 0152 — ADR-0175 Đ1.5a: tin «thiếu vé» vào hộp thư.
-- View hộp thư của `audit` (nguồn: 0143) thêm hành động `ve_thieu`. Cùng cột, chỉ khoá. Dòng do kho vé ghi mỗi lần giữ vé xong mà dịch vụ còn thiếu (lúc xác nhận đơn,
-- cấp bằng tay, cấp bù khi lô vào kho): `target_type = 've'`, `target_id` = nguồn vé ('TOUR_DAO' | 'HANG_NGOAI') — hộp thư chọn người nhận theo khoá này
-- (vé Tour Đảo: người giữ `ve.phat-hanh`; vé hãng ngoài: người giữ `ve.kho.manage` — luật ở src/shared/thong-bao.ts `locHopThongBao`).
-- Không đổi dữ liệu, chỉ dựng lại view. HOÀN TÁC: dựng lại view đúng câu của 0143 (dòng `ve_thieu` đã ghi vẫn nằm ở `audit_log`, chỉ thôi hiện ở hộp thư).
DROP VIEW v_aud_ledger_event;
CREATE VIEW v_aud_ledger_event AS
  SELECT id, order_id, target_type, target_id, staff_id, action, created_at FROM audit_log
  WHERE action IN ('ledger_adjustment_requested', 'ledger_adjustment_approved', 'ledger_adjustment_rejected', 'ledger_adjustment_withdrawn', 'ledger_adjustment_affected',
    'attribution_requested', 'attribution_ruled', 'attribution_posted', 'attribution_reassigned', 'attribution_reversed', 'attribution_responded', 'ledger_receipt_collector_changed',
    'credit_due_soon_reminded', 'credit_overdue_reminded', 've_thieu');
