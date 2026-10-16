-- Migration 0099 — KHOẢN "CÔNG TY THU – CHUYỂN KHOẢN" DO NGƯỜI KHÔNG PHẢI KẾ TOÁN KHAI: ĐANG ĐỐI CHIẾU, KHÔNG TẠO NỢ (ADR-0120 Điều 1; thay điều H3 của ADR-0026). Module `billing`. Chỉ THÊM.
-- Vì sao cần bảng: luật mới không còn sinh dòng giữ hộ (HELD) cho khoản này, nên không còn dấu nào phân biệt "đang chờ Kế toán đối chiếu" với "Kế toán tự ghi" (cùng là
-- lần thu vai COMPANY, không dòng nợ). Hai view/trigger của 0079 và hàng rào R-BIL-D6b cũng cần dấu đó. Chủ dự án duyệt thêm migration này (chat 2026-10-15).
-- Phạm vi (chủ chốt 2026-10-15): CHỈ chuyển khoản. Tiền mặt ghi "Công ty thu" giữ luật H3 cũ (dòng giữ hộ trên người khai) và KHÔNG có dấu ở bảng này.
-- Dữ liệu cũ KHÔNG đổi: khoản đã khai trước ngày áp luật giữ dòng giữ hộ đang có và đi đường cũ (không có dòng trong bảng mới).
-- "Đang đối chiếu" = có dòng DECLARED mà chưa có dòng CONFIRMED (lần thu còn hiệu lực). "Công ty đã nhận" cho khoản MỚI ghi dòng CONFIRMED (kèm mã giao dịch của 0088),
-- không sinh dòng nợ nào. Câu lỗi có tiền tố mã — service dịch sang tiếng Việt. Thân trigger chỉ đọc bảng bil_ (ADR-0024 điều 5).

CREATE TABLE bil_receipt_recon (
  id            TEXT PRIMARY KEY,
  receipt_id    TEXT NOT NULL REFERENCES bil_payment_receipt(id),
  kind_code     TEXT NOT NULL CHECK (kind_code IN ('DECLARED', 'CONFIRMED')),
  -- Ngày dân sự (giờ VN): DECLARED = ngày khai (gốc tính "quá 3 ngày" nhắc Kế toán); CONFIRMED = ngày Kế toán xác nhận.
  occurred_date TEXT NOT NULL CHECK (date(occurred_date) IS occurred_date),
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT,
  UNIQUE (receipt_id, kind_code)
);
CREATE INDEX bil_receipt_recon_kind_ix ON bil_receipt_recon(kind_code, occurred_date);

-- Chỉ-thêm (khuôn 0045, 0079).
CREATE TRIGGER bil_receipt_recon_no_update BEFORE UPDATE ON bil_receipt_recon
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dấu đối chiếu không sửa được'); END;
CREATE TRIGGER bil_receipt_recon_no_delete BEFORE DELETE ON bil_receipt_recon
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dấu đối chiếu không xoá được'); END;

-- DECLARED chỉ gắn vào lần thu của khách, GỐC, người thu Công ty, CHUYỂN KHOẢN, không phải nửa thu của lệnh chuyển cọc.
CREATE TRIGGER bil_receipt_recon_declared BEFORE INSERT ON bil_receipt_recon
WHEN NEW.kind_code = 'DECLARED' AND NOT EXISTS (
  SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.kind_code = 'CUSTOMER_PAYMENT' AND r.reverses_id IS NULL AND r.transfer_of_id IS NULL
    AND r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER')
BEGIN SELECT RAISE(ABORT, 'recon_receipt_invalid: chỉ đánh dấu đối chiếu cho lần thu chuyển khoản “Công ty thu” của khách'); END;

-- CONFIRMED: phải có DECLARED, lần thu còn hiệu lực (chưa bị đảo); khoản chuyển khoản ghi TỪ mốc R-BIL-D6 của 0088 phải có mã giao dịch ngân hàng (lớp CSDL cho
-- đường xác nhận khoản MỚI — nơi trigger (e) của 0088 không với tới vì không có dòng giữ hộ để đảo).
CREATE TRIGGER bil_receipt_recon_confirmed BEFORE INSERT ON bil_receipt_recon
WHEN NEW.kind_code = 'CONFIRMED' AND (
  NOT EXISTS (SELECT 1 FROM bil_receipt_recon d WHERE d.receipt_id = NEW.receipt_id AND d.kind_code = 'DECLARED')
  OR EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = NEW.receipt_id))
BEGIN SELECT RAISE(ABORT, 'recon_not_declared: khoản này không còn chờ đối chiếu'); END;
CREATE TRIGGER bil_receipt_recon_confirmed_txn BEFORE INSERT ON bil_receipt_recon
WHEN NEW.kind_code = 'CONFIRMED'
  AND EXISTS (SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.method_code = 'BANK_TRANSFER'
    AND r.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'))
  AND NOT EXISTS (SELECT 1 FROM bil_receipt_bank_txn t WHERE t.receipt_id = NEW.receipt_id)
BEGIN SELECT RAISE(ABORT, 'bank_txn_required: xác nhận khoản chuyển khoản cần mã giao dịch ngân hàng'); END;

-- ADR-0120 Điều 1.2: đơn còn khoản đang đối chiếu thì CHƯA có phiếu "Đã giao" (lớp 2 — máy chủ kiểm trước bằng `lyDoChuaGiaoDuoc`, mã "reconciling").
CREATE TRIGGER bil_posting_delivered_reconciling BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'DELIVERED' AND EXISTS (
  SELECT 1 FROM bil_payment_receipt r JOIN bil_receipt_recon d ON d.receipt_id = r.id AND d.kind_code = 'DECLARED'
  WHERE r.order_id = NEW.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon c WHERE c.receipt_id = r.id AND c.kind_code = 'CONFIRMED'))
BEGIN SELECT RAISE(ABORT, 'delivered_reconciling: còn khoản chuyển khoản “Công ty thu” đang chờ Kế toán đối chiếu'); END;

-- View cọc và trigger đảo lần thu của 0079: "đang đối chiếu" nay gồm CẢ khoản mới (dấu DECLARED chưa có CONFIRMED) — theo đúng định nghĩa `khoanChoXacNhan` ở rules.ts.
DROP TRIGGER bil_payment_receipt_coc_reversal;
DROP VIEW v_bil_coc_don;
CREATE VIEW v_bil_coc_don AS
  SELECT t.order_id AS order_id,
         t.da_tra AS da_tra,
         t.dang_doi_chieu AS dang_doi_chieu,
         t.hoan_truoc_huy AS hoan_truoc_huy,
         t.duyet + t.ngoai AS da_duyet,
         t.chi + t.ngoai AS da_chi,
         t.chuyen AS da_chuyen,
         t.ngoai AS hoan_ngoai,
         t.da_tra - t.hoan_truoc_huy AS con_giu_luc_huy,
         t.da_tra - t.hoan_truoc_huy - t.chi - t.ngoai - t.chuyen AS con_giu,
         t.duyet - t.chi - t.chuyen AS cho_chi
  FROM (
    SELECT c.order_id AS order_id,
           SUM(c.tra) AS da_tra, SUM(c.doi_chieu) AS dang_doi_chieu, SUM(c.hoan_truoc) AS hoan_truoc_huy,
           SUM(c.duyet) AS duyet, SUM(c.chi) AS chi, SUM(c.chuyen) AS chuyen, SUM(c.ngoai) AS ngoai
    FROM (
      -- (a) lần thu còn hiệu lực: đã trả / đang đối chiếu
      SELECT r.order_id AS order_id,
             CASE WHEN r.collector_role_code = 'COMPANY' AND (EXISTS (
                    SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                      AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount) OR EXISTS (SELECT 1 FROM bil_receipt_recon dc WHERE dc.receipt_id = r.id AND dc.kind_code = 'DECLARED' AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon xc WHERE xc.receipt_id = r.id AND xc.kind_code = 'CONFIRMED'))) THEN 0 ELSE r.amount END AS tra,
             CASE WHEN r.collector_role_code = 'COMPANY' AND (EXISTS (
                    SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                      AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount) OR EXISTS (SELECT 1 FROM bil_receipt_recon dc WHERE dc.receipt_id = r.id AND dc.kind_code = 'DECLARED' AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon xc WHERE xc.receipt_id = r.id AND xc.kind_code = 'CONFIRMED'))) THEN r.amount ELSE 0 END AS doi_chieu,
             0 AS hoan_truoc, 0 AS duyet, 0 AS chi, 0 AS chuyen, 0 AS ngoai
      FROM bil_payment_receipt r
      WHERE r.kind_code = 'CUSTOMER_PAYMENT' AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
      UNION ALL
      -- (b)(c) lần trả lại khách còn hiệu lực: không khoản duyệt = hoàn trước huỷ; khoản REFUND = chi; khoản TRANSFER = chuyển
      SELECT r.order_id, 0, 0,
             CASE WHEN r.approval_id IS NULL THEN r.amount ELSE 0 END,
             0,
             CASE WHEN a.kind_code = 'REFUND' THEN r.amount ELSE 0 END,
             CASE WHEN a.kind_code = 'TRANSFER' THEN r.amount ELSE 0 END,
             0
      FROM bil_payment_receipt r LEFT JOIN bil_deposit_approval a ON a.id = r.approval_id
      WHERE r.kind_code = 'CUSTOMER_REFUND' AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
      UNION ALL
      -- (d) khoản duyệt: gốc cộng, huỷ duyệt trừ
      SELECT a.order_id, 0, 0, 0, CASE WHEN a.voids_id IS NULL THEN a.amount ELSE -a.amount END, 0, 0, 0
      FROM bil_deposit_approval a
      UNION ALL
      -- (e) hoàn ngoài hệ thống ĐÃ xác nhận
      SELECT g.order_id, 0, 0, 0, 0, 0, 0, g.amount
      FROM bil_outside_refund g
      WHERE g.kind_code = 'RECORD' AND EXISTS (SELECT 1 FROM bil_outside_refund c WHERE c.target_id = g.id AND c.kind_code = 'CONFIRM')
    ) c
    GROUP BY c.order_id
  ) t;

CREATE TRIGGER bil_payment_receipt_coc_reversal BEFORE INSERT ON bil_payment_receipt
WHEN NEW.reverses_id IS NOT NULL AND EXISTS (SELECT 1 FROM bil_deposit_approval a WHERE a.order_id = NEW.order_id)
  AND COALESCE((SELECT v.da_duyet FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0) > (
    COALESCE((SELECT v.con_giu_luc_huy FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0)
    - (SELECT CASE WHEN g.kind_code = 'CUSTOMER_PAYMENT' AND NOT (g.collector_role_code = 'COMPANY' AND (EXISTS (
                      SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = g.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                        AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount) OR EXISTS (SELECT 1 FROM bil_receipt_recon dc WHERE dc.receipt_id = g.id AND dc.kind_code = 'DECLARED' AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon xc WHERE xc.receipt_id = g.id AND xc.kind_code = 'CONFIRMED')))) THEN g.amount
                   WHEN g.kind_code = 'CUSTOMER_REFUND' AND g.approval_id IS NULL THEN -g.amount
                   ELSE 0 END
       FROM bil_payment_receipt g WHERE g.id = NEW.reverses_id))
BEGIN SELECT RAISE(ABORT, 'coc_paid_below_approved: đảo lần thu làm đã trả dưới tổng duyệt hoàn cọc'); END;
