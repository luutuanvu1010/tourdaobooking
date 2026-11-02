-- Migration 0135 — PHÂN ĐỊNH TRÁCH NHIỆM VÀ HOÀN TIỀN SAU "ĐÃ GIAO" (ADR-0116 thi hành ADR-0088 đ9; TNV-G3). Module `billing`; thêm hai view công bố của `parties`, tạo lại view
-- hộp thư của `audit`. Chỉ-thêm. Thân trigger chỉ đọc bảng bil_ và view công bố (ADR-0024 đ5). Máy chủ kiểm trước (billing/phan-dinh.ts, thay-lan-thu.ts); đây là lớp 2.
-- Chuỗi của một khoản: REQUEST (đề nghị) → RULING (phân định) → POSTED (ghi sổ một lô; dòng này mới làm "giảm trừ") → REASSIGNED (đổi bên chịu qua RULING mới) / REVERSAL (đảo) / RESPONSE (bên chịu phản hồi).
-- Dòng cũ không bao giờ sửa. Câu RAISE có tiền tố mã để route dịch sang tiếng Việt.

-- (1) Loại phiếu và loại dòng nợ mới. Dòng nợ ATTRIBUTION = "bên chịu → công ty", GẮN THEO ĐƠN (ADR-0088 bảng "Thay câu nào"); là NỢ, không phải tiền đang giữ.
INSERT INTO bil_posting_kind (code, name, sort_order, active) VALUES ('ATTRIBUTION', 'Phân định trách nhiệm', 10, 1);
INSERT INTO bil_debt_kind (code, name, sort_order, active) VALUES ('ATTRIBUTION', 'Nợ theo phân định trách nhiệm', 10, 1);

-- (2) Hai view của `parties` — điều kiện DỮ LIỆU về bên chịu (không phải điều kiện cho phép; không ai được thêm quyền nhờ view này). Chỉ khoá.
-- "Khách thuần": đang mở vai Khách hàng và không mở vai nào khác ⇒ không bao giờ là bên chịu (ADR-0116 đ3, H2).
CREATE VIEW v_pty_khach_thuan AS
  SELECT DISTINCT r.party_id FROM pty_party_role r
  WHERE r.role_type_code = 'CUSTOMER' AND r.valid_to_date IS NULL
    AND NOT EXISTS (SELECT 1 FROM pty_party_role x WHERE x.party_id = r.party_id AND x.role_type_code <> 'CUSTOMER' AND x.valid_to_date IS NULL);
-- Hồ sơ đang mở ít nhất một vai không phải Khách hàng (nhà xe, nhà cung cấp, đại lý, nhân sự…). Máy chủ dùng cùng "có tài khoản" để nhận "hồ sơ có thật có thể chịu trách nhiệm".
CREATE VIEW v_pty_co_vai_khac_khach AS
  SELECT DISTINCT party_id FROM pty_party_role WHERE role_type_code <> 'CUSTOMER' AND valid_to_date IS NULL;

-- (3) Bảng chuỗi phân định.
CREATE TABLE bil_attribution (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id),
  step_code       TEXT NOT NULL CHECK (step_code IN ('REQUEST', 'RULING', 'POSTED', 'REASSIGNED', 'REVERSAL', 'RESPONSE')),
  -- Dòng trước trong chuỗi: RULING → REQUEST (phân định đầu) hoặc POSTED / REASSIGNED (đổi bên chịu); POSTED, REASSIGNED → RULING; REVERSAL, RESPONSE → POSTED gốc.
  target_id       TEXT REFERENCES bil_attribution(id),
  -- Dòng POSTED gốc của khoản (NULL ở REQUEST, phân định đầu và chính POSTED).
  root_id         TEXT REFERENCES bil_attribution(id),
  case_code       TEXT CHECK (case_code IS NULL OR case_code IN ('T4', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11')),
  liable_party_id TEXT REFERENCES pty_party(id),
  amount          INTEGER CHECK (amount IS NULL OR amount > 0),
  money_out       INTEGER CHECK (money_out IS NULL OR money_out IN (0, 1)),
  reason          TEXT CHECK (reason IS NULL OR length(reason) <= 500),
  -- Phiếu ATTRIBUTION của lô (phiếu chèn SAU dòng này — không khoá ngoại, cùng khuôn `replacement_id`).
  posting_id      TEXT,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
CREATE INDEX bil_attribution_order_ix ON bil_attribution(order_id);
CREATE INDEX bil_attribution_root_ix ON bil_attribution(root_id);
-- Mỗi đề nghị đúng MỘT phân định; mỗi phân định đúng MỘT lần ghi; mỗi lần ghi tối đa một phân định đổi bên chịu đang mở.
CREATE UNIQUE INDEX bil_attribution_one_child ON bil_attribution(target_id) WHERE step_code IN ('RULING', 'POSTED', 'REASSIGNED');

CREATE TRIGGER bil_attribution_no_update BEFORE UPDATE ON bil_attribution BEGIN SELECT RAISE(ABORT, 'bil_append_only: bil_attribution chỉ thêm'); END;
CREATE TRIGGER bil_attribution_no_delete BEFORE DELETE ON bil_attribution BEGIN SELECT RAISE(ABORT, 'bil_append_only: bil_attribution chỉ thêm'); END;

-- (4) MỘT nguồn "phải thu hiện hành" của đơn đã Đã giao (Hiến chương 5.4; ADR-0088 đ1): `due_snapshot` − Σ POSTED + Σ REVERSAL. Trigger, kiểm định kỳ R-BIL-1 và hàm `phaiThuHienHanh` đều đọc view này.
CREATE VIEW v_bil_phai_thu_hien_hanh AS
  SELECT p.order_id, p.due_snapshot,
    COALESCE((SELECT SUM(CASE a.step_code WHEN 'POSTED' THEN a.amount ELSE -a.amount END) FROM bil_attribution a WHERE a.order_id = p.order_id AND a.step_code IN ('POSTED', 'REVERSAL')), 0) AS giam_tru,
    p.due_snapshot - COALESCE((SELECT SUM(CASE a.step_code WHEN 'POSTED' THEN a.amount ELSE -a.amount END) FROM bil_attribution a WHERE a.order_id = p.order_id AND a.step_code IN ('POSTED', 'REVERSAL')), 0) AS phai_thu
  FROM bil_posting p WHERE p.kind_code = 'DELIVERED';

-- (5) Luật từng bước.
CREATE TRIGGER bil_attribution_request_check BEFORE INSERT ON bil_attribution
WHEN NEW.step_code = 'REQUEST' AND (
  NEW.target_id IS NOT NULL OR NEW.root_id IS NOT NULL OR NEW.amount IS NULL OR length(trim(COALESCE(NEW.reason, ''))) < 10
  OR NOT EXISTS (SELECT 1 FROM bil_posting p WHERE p.order_id = NEW.order_id AND p.kind_code = 'DELIVERED'))
BEGIN SELECT RAISE(ABORT, 'attribution_request_invalid: đề nghị phải trên đơn đã Đã giao, có số tiền và lý do từ 10 ký tự'); END;

CREATE TRIGGER bil_attribution_ruling_check BEFORE INSERT ON bil_attribution
WHEN NEW.step_code = 'RULING' AND (
  NEW.case_code IS NULL OR NEW.liable_party_id IS NULL OR NEW.amount IS NULL OR NEW.money_out IS NULL OR length(trim(COALESCE(NEW.reason, ''))) < 10
  OR NOT EXISTS (SELECT 1 FROM bil_attribution t WHERE t.id = NEW.target_id AND t.order_id = NEW.order_id AND t.step_code IN ('REQUEST', 'POSTED', 'REASSIGNED'))
  -- T10 (bất khả kháng), T11 (chưa rõ): bên chịu là công ty chủ; các trường hợp khác: không phải công ty chủ. Không bao giờ là khách thuần; hồ sơ phải đang hoạt động.
  OR (NEW.case_code IN ('T10', 'T11')) <> (NEW.liable_party_id IN (SELECT party_id FROM v_pty_owner_company))
  OR NEW.liable_party_id IN (SELECT party_id FROM v_pty_khach_thuan)
  OR NOT EXISTS (SELECT 1 FROM v_pty_party_label l WHERE l.id = NEW.liable_party_id AND l.active = 1)
  -- T4: khách thật sự chưa trả ⇒ không có tiền ra.
  OR (NEW.case_code = 'T4' AND NEW.money_out = 1)
  -- Phân định đầu: root trống. Đổi bên chịu: không tiền ra, đúng số còn hiệu lực của khoản gốc, root đúng khoản.
  OR (EXISTS (SELECT 1 FROM bil_attribution t WHERE t.id = NEW.target_id AND t.step_code = 'REQUEST') AND NEW.root_id IS NOT NULL)
  OR (EXISTS (SELECT 1 FROM bil_attribution t WHERE t.id = NEW.target_id AND t.step_code <> 'REQUEST') AND (
    NEW.money_out <> 0
    OR NEW.root_id IS NOT (SELECT COALESCE(t.root_id, t.id) FROM bil_attribution t WHERE t.id = NEW.target_id)
    OR NEW.amount <> (SELECT g.amount - COALESCE((SELECT SUM(d.amount) FROM bil_attribution d WHERE d.root_id = g.id AND d.step_code = 'REVERSAL'), 0) FROM bil_attribution g WHERE g.id = NEW.root_id))))
BEGIN SELECT RAISE(ABORT, 'attribution_ruling_invalid: phân định thiếu thông tin, sai bên chịu hoặc sai số của khoản'); END;

-- POSTED: đúng theo phân định đầu; cộng dồn giảm trừ không vượt phải thu lúc giao (phải thu hiện hành không âm).
CREATE TRIGGER bil_attribution_posted_check BEFORE INSERT ON bil_attribution
WHEN NEW.step_code = 'POSTED' AND (
  NEW.posting_id IS NULL OR NEW.root_id IS NOT NULL
  OR NOT EXISTS (
    SELECT 1 FROM bil_attribution r JOIN bil_attribution q ON q.id = r.target_id
    WHERE r.id = NEW.target_id AND r.step_code = 'RULING' AND q.step_code = 'REQUEST' AND r.order_id = NEW.order_id AND r.amount = NEW.amount
      AND r.liable_party_id IS NEW.liable_party_id AND r.case_code IS NEW.case_code AND r.money_out IS NEW.money_out))
BEGIN SELECT RAISE(ABORT, 'attribution_post_invalid: lần ghi phải đúng theo phân định'); END;
CREATE TRIGGER bil_attribution_over_due BEFORE INSERT ON bil_attribution
WHEN NEW.step_code = 'POSTED' AND NEW.amount > COALESCE((SELECT v.phai_thu FROM v_bil_phai_thu_hien_hanh v WHERE v.order_id = NEW.order_id), 0)
BEGIN SELECT RAISE(ABORT, 'attribution_over_due: giảm trừ cộng dồn vượt phải thu của đơn'); END;

CREATE TRIGGER bil_attribution_reassigned_check BEFORE INSERT ON bil_attribution
WHEN NEW.step_code = 'REASSIGNED' AND (
  NEW.posting_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM bil_attribution r JOIN bil_attribution t ON t.id = r.target_id
    WHERE r.id = NEW.target_id AND r.step_code = 'RULING' AND t.step_code IN ('POSTED', 'REASSIGNED') AND r.order_id = NEW.order_id AND r.amount = NEW.amount
      AND r.liable_party_id IS NEW.liable_party_id AND r.case_code IS NEW.case_code AND r.root_id IS NEW.root_id)
  -- số của khoản có thể đã giảm (đảo một phần) sau lúc phân định đổi bên chịu
  OR NEW.amount <> (SELECT g.amount - COALESCE((SELECT SUM(d.amount) FROM bil_attribution d WHERE d.root_id = g.id AND d.step_code = 'REVERSAL'), 0) FROM bil_attribution g WHERE g.id = NEW.root_id))
BEGIN SELECT RAISE(ABORT, 'attribution_post_invalid: lần đổi bên chịu phải đúng theo phân định và đúng số còn hiệu lực'); END;

-- Người ghi ≠ người phân định (ADR-0116 đ3; khuôn bil_payment_receipt_coc_same_person). Đảo: khác người đã phân định khoản gốc.
CREATE TRIGGER bil_attribution_same_person BEFORE INSERT ON bil_attribution
WHEN (NEW.step_code IN ('POSTED', 'REASSIGNED') AND NEW.created_by IS (SELECT r.created_by FROM bil_attribution r WHERE r.id = NEW.target_id))
  OR (NEW.step_code = 'REVERSAL' AND NEW.created_by IS (SELECT r.created_by FROM bil_attribution g JOIN bil_attribution r ON r.id = g.target_id WHERE g.id = NEW.root_id))
BEGIN SELECT RAISE(ABORT, 'attribution_same_person: người ghi phải khác người phân định'); END;

CREATE TRIGGER bil_attribution_reversal_check BEFORE INSERT ON bil_attribution
WHEN NEW.step_code = 'REVERSAL' AND (
  NEW.posting_id IS NULL OR NEW.amount IS NULL OR length(trim(COALESCE(NEW.reason, ''))) < 10 OR NEW.target_id IS NOT NEW.root_id
  OR NOT EXISTS (SELECT 1 FROM bil_attribution g WHERE g.id = NEW.root_id AND g.step_code = 'POSTED' AND g.order_id = NEW.order_id)
  OR NEW.amount > (SELECT g.amount - COALESCE((SELECT SUM(d.amount) FROM bil_attribution d WHERE d.root_id = g.id AND d.step_code = 'REVERSAL'), 0) FROM bil_attribution g WHERE g.id = NEW.root_id))
BEGIN SELECT RAISE(ABORT, 'attribution_reversal_invalid: đảo phải đúng khoản đã ghi, có lý do và không vượt số còn hiệu lực'); END;

CREATE TRIGGER bil_attribution_response_check BEFORE INSERT ON bil_attribution
WHEN NEW.step_code = 'RESPONSE' AND (
  length(trim(COALESCE(NEW.reason, ''))) = 0 OR NEW.target_id IS NOT NEW.root_id
  OR NOT EXISTS (SELECT 1 FROM bil_attribution g WHERE g.id = NEW.root_id AND g.step_code = 'POSTED' AND g.order_id = NEW.order_id))
BEGIN SELECT RAISE(ABORT, 'attribution_response_invalid: phản hồi phải có nội dung và trỏ đúng khoản'); END;

-- (6) Lần trả khách thuộc một phân định. ĐÚNG số giảm trừ của lô; dùng một lần; chỉ trong lô đang ghi (phiếu chưa chèn).
ALTER TABLE bil_payment_receipt ADD COLUMN attribution_id TEXT REFERENCES bil_attribution(id);
CREATE UNIQUE INDEX bil_payment_receipt_attribution_once ON bil_payment_receipt(attribution_id) WHERE attribution_id IS NOT NULL;
CREATE TRIGGER bil_receipt_attribution_match BEFORE INSERT ON bil_payment_receipt
WHEN NEW.attribution_id IS NOT NULL AND (
  NEW.kind_code <> 'CUSTOMER_REFUND' OR NEW.reverses_id IS NOT NULL OR NEW.replacement_id IS NOT NULL
  OR NOT EXISTS (
    SELECT 1 FROM bil_attribution a WHERE a.id = NEW.attribution_id AND a.step_code = 'POSTED' AND a.money_out = 1 AND a.order_id = NEW.order_id AND a.amount = NEW.amount
      AND NOT EXISTS (SELECT 1 FROM bil_posting m WHERE m.id = a.posting_id)))
BEGIN SELECT RAISE(ABORT, 'attribution_refund_invalid: lần trả khách phải đúng số của lần ghi phân định đang ghi'); END;

-- Tạo lại (nguồn: 0083) — đổi DUY NHẤT: lần thu mang `attribution_id` không qua luật này (đã do bil_receipt_attribution_match canh). Không có `attribution_id`: y như cũ.
DROP TRIGGER bil_receipt_after_delivered;
CREATE TRIGGER bil_receipt_after_delivered BEFORE INSERT ON bil_payment_receipt
WHEN NEW.attribution_id IS NULL AND EXISTS (SELECT 1 FROM bil_posting p WHERE p.order_id = NEW.order_id AND p.kind_code = 'DELIVERED')
  AND (NEW.replacement_id IS NULL
    OR EXISTS (SELECT 1 FROM bil_posting m WHERE m.id = NEW.replacement_id)
    OR (NEW.reverses_id IS NULL AND NEW.kind_code <> 'CUSTOMER_PAYMENT')
    OR (NEW.reverses_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM bil_payment_receipt n WHERE n.replacement_id = NEW.replacement_id AND n.order_id = NEW.order_id AND n.reverses_id IS NULL)))
BEGIN SELECT RAISE(ABORT, 'receipt_after_delivered: đơn đã Đã giao — chỉ sửa lần thu bằng lệnh Thay lần thu'); END;

-- Tạo lại (nguồn: 0082) — đổi DUY NHẤT: số "đang giữ" không tính dòng ATTRIBUTION (khoản nợ theo phân định không phải tiền mặt người đó cầm).
DROP TRIGGER bil_refund_within_held;
CREATE TRIGGER bil_refund_within_held BEFORE INSERT ON bil_payment_receipt
WHEN NEW.kind_code = 'CUSTOMER_REFUND' AND NEW.reverses_id IS NULL
  AND EXISTS (SELECT 1 FROM v_pty_owner_company)
  AND NEW.collector_party_id NOT IN (SELECT party_id FROM v_pty_owner_company)
  AND NEW.amount > COALESCE((
    SELECT SUM(CASE WHEN l.debtor_party_id = NEW.collector_party_id THEN l.amount ELSE -l.amount END) FROM bil_debt_line l
    WHERE l.order_id = NEW.order_id AND l.kind_code <> 'ATTRIBUTION'
      AND ((l.debtor_party_id = NEW.collector_party_id AND l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company))
        OR (l.creditor_party_id = NEW.collector_party_id AND l.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company)))), 0)
BEGIN SELECT RAISE(ABORT, 'refund_exceeds_held: số hoàn vượt số người trả đang giữ cho đơn'); END;

-- (7) Phiếu ATTRIBUTION: chèn SAU dòng chuỗi và lần trả khách của lô; kiểm I1 (đã thu ròng = phải thu hiện hành, đã tính cả dòng vừa chèn).
CREATE TRIGGER bil_posting_attribution_check BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'ATTRIBUTION' AND (
  NEW.order_id IS NULL OR length(trim(COALESCE(NEW.reason, ''))) < 10
  OR NOT EXISTS (SELECT 1 FROM bil_attribution a WHERE a.posting_id = NEW.id AND a.order_id = NEW.order_id AND a.step_code IN ('POSTED', 'REASSIGNED', 'REVERSAL'))
  OR EXISTS (SELECT 1 FROM bil_attribution a WHERE a.posting_id = NEW.id AND a.money_out = 1
             AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt r WHERE r.attribution_id = a.id))
  OR EXISTS (
    SELECT 1 FROM v_bil_phai_thu_hien_hanh v WHERE v.order_id = NEW.order_id
      AND v.phai_thu IS NOT COALESCE((
        SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
        WHERE r.order_id = NEW.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0)))
BEGIN SELECT RAISE(ABORT, 'attribution_i1: sau lần ghi số đã thu phải bằng phải thu của đơn trừ giảm trừ đã phân định — sửa khoản thu trước'); END;

-- Dòng nợ ATTRIBUTION chỉ đi với phiếu ATTRIBUTION đúng số; phiếu ATTRIBUTION không mang dòng loại khác. Một phía là công ty chủ. Không đảo qua `reverses_line_id` (đổi bên chịu / đảo là dòng ngược chiều trong lô mới).
CREATE TRIGGER bil_debt_line_attribution_match BEFORE INSERT ON bil_debt_line
WHEN (NEW.kind_code = 'ATTRIBUTION' AND (
    NEW.order_id IS NULL OR NEW.reverses_line_id IS NOT NULL
    OR (SELECT kind_code FROM bil_posting WHERE id = NEW.posting_id) IS NOT 'ATTRIBUTION'
    OR NOT EXISTS (SELECT 1 FROM bil_attribution a WHERE a.posting_id = NEW.posting_id AND a.order_id = NEW.order_id AND a.amount = NEW.amount)
    OR NOT (NEW.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company) OR NEW.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company))))
  OR (NEW.kind_code <> 'ATTRIBUTION' AND (SELECT kind_code FROM bil_posting WHERE id = NEW.posting_id) IS 'ATTRIBUTION')
BEGIN SELECT RAISE(ABORT, 'attribution_line_invalid: dòng nợ phân định phải đúng phiếu, đúng số và giữa bên chịu với công ty'); END;

-- (8) Tạo lại (nguồn: 0083) — phải thu = view (thay `due_snapshot` thuần). Mọi điều kiện khác giữ nguyên chữ.
DROP TRIGGER bil_posting_replacement_check;
CREATE TRIGGER bil_posting_replacement_check BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'REPLACEMENT' AND (
  NEW.order_id IS NULL
  OR length(trim(COALESCE(NEW.reason, ''))) < 10
  OR NOT EXISTS (SELECT 1 FROM bil_payment_receipt n WHERE n.replacement_id = NEW.id AND n.order_id = NEW.order_id AND n.reverses_id IS NULL)
  OR (NOT EXISTS (SELECT 1 FROM bil_payment_receipt d WHERE d.replacement_id = NEW.id AND d.order_id = NEW.order_id AND d.reverses_id IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM bil_posting g WHERE g.order_id = NEW.order_id AND g.kind_code = 'DELIVERED'))
  OR EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.replacement_id = NEW.id AND x.order_id IS NOT NEW.order_id)
  OR EXISTS (
    SELECT 1 FROM v_bil_phai_thu_hien_hanh g WHERE g.order_id = NEW.order_id
      AND g.phai_thu IS NOT COALESCE((
        SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
        WHERE r.order_id = NEW.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0)))
BEGIN SELECT RAISE(ABORT, 'replacement_i1: lô Thay lần thu không hợp lệ hoặc sau khi thay số đã thu khác phải thu của đơn'); END;

DROP TRIGGER bil_posting_completed_due;
CREATE TRIGGER bil_posting_completed_due BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'COMPLETED' AND EXISTS (
  SELECT 1 FROM v_bil_phai_thu_hien_hanh g WHERE g.order_id = NEW.order_id
    AND g.phai_thu IS NOT COALESCE((
      SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
      WHERE r.order_id = NEW.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0))
BEGIN SELECT RAISE(ABORT, 'completed_due_mismatch: số đã thu khác phải thu lúc Đã giao'); END;

-- Tạo lại (nguồn: 0045) — đổi DUY NHẤT: bỏ dòng ATTRIBUTION khỏi "còn người nợ công ty": khoản nợ theo phân định không chặn Hoàn thành (ADR-0088 đ2: "món nợ mới hiện ở Sổ của tôi"), tiền đang giữ vẫn chặn.
DROP TRIGGER bil_posting_completed_settled;
CREATE TRIGGER bil_posting_completed_settled BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'COMPLETED' AND EXISTS (
  SELECT 1 FROM (
    SELECT CASE WHEN l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN l.debtor_party_id ELSE l.creditor_party_id END AS ben,
           SUM(CASE WHEN l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN l.amount ELSE -l.amount END) AS no_cong_ty
    FROM bil_debt_line l
    WHERE l.order_id = NEW.order_id AND l.kind_code <> 'ATTRIBUTION'
      AND (l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) OR l.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company))
    GROUP BY ben
  ) WHERE no_cong_ty > 0)
BEGIN SELECT RAISE(ABORT, 'completed_unsettled: còn người đang giữ tiền của công ty vì đơn này'); END;

-- (9) View hộp thư của `audit` (nguồn: 0094): thêm tin phân định và tin người thu của "Sửa khoản thu đã ghi" (ADR-0088 đ2, đ9). Cùng cột, chỉ khoá.
DROP VIEW v_aud_ledger_event;
CREATE VIEW v_aud_ledger_event AS
  SELECT id, order_id, target_type, target_id, staff_id, action, created_at FROM audit_log
  WHERE action IN ('ledger_adjustment_requested', 'ledger_adjustment_approved', 'ledger_adjustment_rejected', 'ledger_adjustment_withdrawn', 'ledger_adjustment_affected',
    'attribution_requested', 'attribution_ruled', 'attribution_posted', 'attribution_responded', 'ledger_receipt_collector_changed');
