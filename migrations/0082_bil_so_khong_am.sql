-- Migration 0082 — SỔ TIỀN KHÔNG ÂM, PHẦN CÒN LẠI CỦA ADR-0092 THI CÔNG ĐƯỢC (TNV-G4: Đ1, Đ3, Đ4, Đ5c; R-BIL-8 ở đ8). Module `billing`. Chỉ THÊM trigger và một
-- dòng mốc — không đổi bảng, không đổi dữ liệu cũ. Thân trigger chỉ đọc bảng bil_ và view công bố `v_pty_owner_company` (ADR-0024 điều 5). Máy chủ kiểm trước
-- (service.ts — kiemDaoLanThu, kiemHoanNguoiGiu, HELD_DON_LE, LY_DO_DIEU_CHINH_TOI_THIEU); đây là lớp 2 cho lần ghi chen giữa và SQL chạy tay.
-- Đ5a/Đ5b (trần điều chỉnh) chỉ ở máy chủ — ADR không đòi lớp CSDL; Đ5d (tin báo), Đ6, Đ6a DỪNG chờ chủ (nhật ký thi công năm lỗi tiền).

-- Đ1 (A-B16, KT06): đảo một lần THU (không phải trả lại khách) không được làm đã thu RÒNG của đơn < 0. Đã thu ròng = cùng công thức trigger 0045
-- `bil_payment_receipt_refund_within_paid` (lần thu còn hiệu lực: thu cộng, trả lại khách trừ). Đảo trả lại khách làm đã thu tăng — không xét.
CREATE TRIGGER bil_receipt_reversal_net_paid BEFORE INSERT ON bil_payment_receipt
WHEN NEW.reverses_id IS NOT NULL
  AND (SELECT kind_code FROM bil_payment_receipt WHERE id = NEW.reverses_id) <> 'CUSTOMER_REFUND'
  -- chỉ đảo lần đầu một lần thu GỐC: đảo dòng đảo / đảo lần hai để `bil_reversal` và UNIQUE(reverses_id) báo lỗi của chúng
  AND (SELECT reverses_id FROM bil_payment_receipt WHERE id = NEW.reverses_id) IS NULL
  AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt d WHERE d.reverses_id = NEW.reverses_id)
  AND (SELECT amount FROM bil_payment_receipt WHERE id = NEW.reverses_id) > COALESCE((
    SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
    WHERE r.order_id = NEW.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0)
BEGIN SELECT RAISE(ABORT, 'net_paid_negative: đảo lần thu làm đã thu ròng của đơn âm — đảo lần hoàn khách trước'); END;

-- Đ3 (A-B7, KT09): lần trả lại khách do người KHÔNG phải công ty trả ≤ số người đó đang nợ công ty trên đơn (mọi dòng của cặp, kể cả dòng đảo). Áp cho mọi
-- đường ghi lần trả lại khách (hoàn khách, chi hoàn cọc, nửa chi của lệnh chuyển — ADR-0089 đ3b đã kiểm ở máy chủ). Dòng đảo (reverses_id) không xét.
CREATE TRIGGER bil_refund_within_held BEFORE INSERT ON bil_payment_receipt
WHEN NEW.kind_code = 'CUSTOMER_REFUND' AND NEW.reverses_id IS NULL
  AND EXISTS (SELECT 1 FROM v_pty_owner_company)  -- chưa có công ty chủ: không có khái niệm "đang giữ" (máy chủ trả 503 trước khi ghi)
  AND NEW.collector_party_id NOT IN (SELECT party_id FROM v_pty_owner_company)
  AND NEW.amount > COALESCE((
    SELECT SUM(CASE WHEN l.debtor_party_id = NEW.collector_party_id THEN l.amount ELSE -l.amount END) FROM bil_debt_line l
    WHERE l.order_id = NEW.order_id
      AND ((l.debtor_party_id = NEW.collector_party_id AND l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company))
        OR (l.creditor_party_id = NEW.collector_party_id AND l.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company)))), 0)
BEGIN SELECT RAISE(ABORT, 'refund_exceeds_held: số hoàn vượt số người trả đang giữ cho đơn'); END;

-- Đ4 (A-B7): không đảo RIÊNG dòng giữ hộ khi lần thu sinh ra nó còn hiệu lực. Đường hợp lệ: đảo lần thu (lô đảo chèn dòng đảo lần thu TRƯỚC dòng đảo giữ hộ —
-- service.ts `dao_lan_thu`, nên lúc dòng đảo giữ hộ vào thì lần thu đã bị đảo) hoặc "Công ty đã nhận" (phiếu COMPANY_RECEIVED — vẫn chịu điều kiện số dư
-- của 0080 `bil_debt_line_held_once`).
CREATE TRIGGER bil_held_no_single_reversal BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NOT NULL
  AND (SELECT kind_code FROM bil_debt_line WHERE id = NEW.reverses_line_id) = 'HELD'
  AND (SELECT reverses_line_id FROM bil_debt_line WHERE id = NEW.reverses_line_id) IS NULL  -- đảo dòng đảo: để `bil_reversal` báo
  AND (SELECT receipt_id FROM bil_debt_line WHERE id = NEW.reverses_line_id) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = (SELECT receipt_id FROM bil_debt_line WHERE id = NEW.reverses_line_id))
  AND (SELECT kind_code FROM bil_posting WHERE id = NEW.posting_id) IS NOT 'COMPANY_RECEIVED'
BEGIN SELECT RAISE(ABORT, 'held_single_reversal: không đảo riêng dòng giữ hộ khi lần thu còn hiệu lực'); END;

-- Đ5c (Q-A1): phiếu điều chỉnh có lý do ≥ 10 ký tự (0045 `bil_posting_reason_required` chỉ đòi không rỗng). Số 10 = LY_DO_DIEU_CHINH_TOI_THIEU (rules.ts).
CREATE TRIGGER bil_adjustment_reason_length BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'ADJUSTMENT' AND length(trim(COALESCE(NEW.reason, ''))) BETWEEN 1 AND 9  -- rỗng: để `bil_reason_required` báo
BEGIN SELECT RAISE(ABORT, 'bil_adjustment_reason_short: lý do điều chỉnh tối thiểu 10 ký tự'); END;

-- Đ8: mốc của R-BIL-8 (đã thu ròng ≥ 0) — đơn có lần thu ghi TỪ mốc mà đã thu ròng âm = LỖI; chỉ có lần thu cũ hơn mốc = cảnh báo (khuôn ADR-0088 đ7).
INSERT INTO bil_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-BIL-8', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');
