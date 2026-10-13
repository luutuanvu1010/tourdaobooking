-- Migration 0094 — ĐIỀU CHỈNH CÔNG NỢ CẦN NGƯỜI THỨ HAI DUYỆT (ADR-0115 đợt 1; đóng phần công nợ của mục HC-4.2 và mã C-2). Module `billing`. Chỉ THÊM: một bảng yêu cầu,
-- một cột `request_id` ở phiếu sổ, các trigger, một dòng mốc kiểm định kỳ và một view công bố của `audit` cho tin báo. Không sửa dữ liệu cũ; phiếu ADJUSTMENT
-- cũ (không có yêu cầu) giữ nguyên, không đòi duyệt lại — trigger chỉ chặn dòng MỚI, mốc R-BIL-14 chỉ để kiểm định kỳ.
-- Thân trigger chỉ đọc bảng bil_ (ADR-0024 điều 5). Trần cộng dồn (đặc tả mục 7 — LỆCH CÓ CHỦ Ý chủ đã duyệt) KHÔNG có lớp CSDL: phải thu nằm ở `orders`; máy chủ kiểm
-- cả lúc tạo lẫn lúc duyệt (rules.ts `kiemDieuChinh`, MỘT hàm), lô duyệt kèm lính gác tổng, và kiểm định kỳ R-BIL-15 là lưới thứ hai.
-- Câu báo lỗi có tiền tố mã (`adjreq_*:` / `adjustment_*:`) — service dịch sang tiếng Việt.

-- Bảng yêu cầu — CHỈ-THÊM (khuôn bil_outside_refund của 0079): dòng REQUEST (người tạo khai hai bên, loại dòng, số tiền, lý do, ngày phát sinh) và dòng quyết định
-- APPROVE / REJECT / WITHDRAW trỏ về dòng REQUEST bằng `target_id` UNIQUE — mỗi yêu cầu đúng MỘT quyết định. Hết hạn KHÔNG có dòng: tính lúc đọc (created_at + 7 ngày).
--  - direction: hướng lúc đánh giá — REQUEST = lúc tạo, APPROVE = lúc duyệt (kiểm lại theo số dư lúc đó, Đ5a); INCREASE = tăng nợ (tính vào trần cộng dồn),
--    DECREASE = giảm nợ.
--  - cap_snapshot: dòng APPROVE tăng nợ chụp trần (max(phải thu, đã thu ròng)) của đơn LÚC DUYỆT — Hiến chương 5.6 (bản chụp, không phải nguồn tính thứ hai);
--    kiểm định kỳ R-BIL-15 so tổng điều chỉnh tăng nợ còn hiệu lực với bản chụp.
CREATE TABLE bil_adjustment_request (
  id                TEXT PRIMARY KEY,
  kind_code         TEXT NOT NULL CHECK (kind_code IN ('REQUEST', 'APPROVE', 'REJECT', 'WITHDRAW')),
  order_id          TEXT NOT NULL REFERENCES orders(id),
  debtor_party_id   TEXT REFERENCES pty_party(id),
  creditor_party_id TEXT REFERENCES pty_party(id),
  amount            INTEGER CHECK (amount IS NULL OR amount > 0),
  line_kind_code    TEXT REFERENCES bil_debt_kind(code),
  occurred_date     TEXT CHECK (occurred_date IS NULL OR date(occurred_date) IS occurred_date),
  direction         TEXT CHECK (direction IS NULL OR direction IN ('INCREASE', 'DECREASE')),
  cap_snapshot      INTEGER CHECK (cap_snapshot IS NULL OR cap_snapshot >= 0),
  reason            TEXT CHECK (reason IS NULL OR (length(trim(reason)) > 0 AND length(reason) <= 500)),
  target_id         TEXT UNIQUE REFERENCES bil_adjustment_request(id),
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT,
  -- Mọi dòng có người làm (NULL sẽ phá phép so "khác người tạo" bằng IS).
  CHECK (created_by IS NOT NULL),
  CHECK ((kind_code = 'REQUEST') = (target_id IS NULL)),
  CHECK (kind_code <> 'REQUEST' OR (debtor_party_id IS NOT NULL AND creditor_party_id IS NOT NULL AND amount IS NOT NULL AND line_kind_code IS NOT NULL
    AND occurred_date IS NOT NULL AND direction IS NOT NULL AND reason IS NOT NULL AND cap_snapshot IS NULL)),
  CHECK (kind_code = 'REQUEST' OR (debtor_party_id IS NULL AND creditor_party_id IS NULL AND amount IS NULL AND line_kind_code IS NULL AND occurred_date IS NULL)),
  CHECK (debtor_party_id IS NULL OR debtor_party_id <> creditor_party_id),
  CHECK ((kind_code = 'APPROVE') = (direction IS NOT NULL) OR kind_code = 'REQUEST'),
  CHECK (kind_code = 'APPROVE' OR cap_snapshot IS NULL),
  CHECK (kind_code <> 'REJECT' OR reason IS NOT NULL)
);
CREATE INDEX bil_adjustment_request_order_ix ON bil_adjustment_request(order_id);
CREATE INDEX bil_adjustment_request_creator_ix ON bil_adjustment_request(created_by);

-- Phiếu ADJUSTMENT trỏ yêu cầu đã duyệt của nó; mỗi yêu cầu sinh tối đa MỘT phiếu.
ALTER TABLE bil_posting ADD COLUMN request_id TEXT REFERENCES bil_adjustment_request(id);
CREATE UNIQUE INDEX bil_posting_request_uq ON bil_posting(request_id) WHERE request_id IS NOT NULL;

-- Chỉ-thêm (khuôn 0045 / 0079).
CREATE TRIGGER bil_adjustment_request_no_update BEFORE UPDATE ON bil_adjustment_request
BEGIN SELECT RAISE(ABORT, 'bil_append_only: yêu cầu điều chỉnh không sửa được — rút hoặc tạo lại bằng dòng mới'); END;
CREATE TRIGGER bil_adjustment_request_no_delete BEFORE DELETE ON bil_adjustment_request
BEGIN SELECT RAISE(ABORT, 'bil_append_only: yêu cầu điều chỉnh không xoá được'); END;

-- Lý do của yêu cầu ≥ 10 ký tự (cùng số với ADR-0092 Đ5c / LY_DO_DIEU_CHINH_TOI_THIEU). Thiếu lý do: để CHECK báo.
CREATE TRIGGER bil_adjustment_request_reason_short BEFORE INSERT ON bil_adjustment_request
WHEN NEW.kind_code = 'REQUEST' AND NEW.reason IS NOT NULL AND length(trim(NEW.reason)) < 10
BEGIN SELECT RAISE(ABORT, 'adjreq_reason_short: lý do điều chỉnh tối thiểu 10 ký tự'); END;

-- Quyết định phải trỏ dòng REQUEST của CÙNG đơn.
CREATE TRIGGER bil_adjustment_request_match BEFORE INSERT ON bil_adjustment_request
WHEN NEW.kind_code <> 'REQUEST'
  AND NOT EXISTS (SELECT 1 FROM bil_adjustment_request g WHERE g.id = NEW.target_id AND g.kind_code = 'REQUEST' AND g.order_id = NEW.order_id)
BEGIN SELECT RAISE(ABORT, 'adjreq_mismatch: quyết định phải trỏ yêu cầu của cùng đơn'); END;

-- Người duyệt / từ chối ≠ người tạo (so theo tài khoản — ADR-0115 điều 1; Hiến chương hệ thống 4.2).
CREATE TRIGGER bil_adjustment_request_same_person BEFORE INSERT ON bil_adjustment_request
WHEN NEW.kind_code IN ('APPROVE', 'REJECT') AND EXISTS (SELECT 1 FROM bil_adjustment_request g WHERE g.id = NEW.target_id AND g.created_by IS NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'adjreq_same_person: người tạo không tự duyệt / từ chối yêu cầu của mình'); END;

-- Chỉ người tạo mới rút (nghịch đảo của luật trên).
CREATE TRIGGER bil_adjustment_request_withdraw_by_creator BEFORE INSERT ON bil_adjustment_request
WHEN NEW.kind_code = 'WITHDRAW' AND EXISTS (SELECT 1 FROM bil_adjustment_request g WHERE g.id = NEW.target_id AND g.created_by IS NOT NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'adjreq_not_creator: chỉ người tạo mới rút được yêu cầu'); END;

-- Hết hạn: quá 7 ngày kể từ lúc tạo thì không duyệt được (số 7 = HAN_YEU_CAU_NGAY ở rules.ts; không có tự duyệt).
CREATE TRIGGER bil_adjustment_request_expired BEFORE INSERT ON bil_adjustment_request
WHEN NEW.kind_code = 'APPROVE'
  AND julianday(NEW.created_at) - julianday((SELECT g.created_at FROM bil_adjustment_request g WHERE g.id = NEW.target_id)) > 7
BEGIN SELECT RAISE(ABORT, 'adjreq_expired: yêu cầu đã quá 7 ngày — người tạo tạo lại'); END;

-- Phiếu ADJUSTMENT chỉ khi yêu cầu ĐÃ DUYỆT (dòng APPROVE trỏ tới), đúng đơn, đúng ngày phát sinh; người ghi phiếu = người duyệt, KHÁC người tạo.
-- Lý do rỗng / ngắn: để `bil_reason_required` (0045) và `bil_adjustment_reason_short` (0082) báo câu của chúng (cùng khuôn "rỗng: để … báo" của 0082).
CREATE TRIGGER bil_posting_adjustment_approved BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'ADJUSTMENT' AND length(trim(COALESCE(NEW.reason, ''))) >= 10 AND NOT EXISTS (
  SELECT 1 FROM bil_adjustment_request q JOIN bil_adjustment_request a ON a.target_id = q.id AND a.kind_code = 'APPROVE'
  WHERE q.id = NEW.request_id AND q.kind_code = 'REQUEST' AND q.order_id IS NEW.order_id AND q.occurred_date IS NEW.occurred_date
    AND a.created_by IS NEW.created_by AND q.created_by IS NOT NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'adjustment_needs_approval: phiếu điều chỉnh cần một yêu cầu đã được người khác duyệt'); END;

-- `request_id` chỉ dành cho phiếu ADJUSTMENT.
CREATE TRIGGER bil_posting_adjustment_request_only BEFORE INSERT ON bil_posting
WHEN NEW.kind_code <> 'ADJUSTMENT' AND NEW.request_id IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'adjustment_request_only: chỉ phiếu điều chỉnh mới mang yêu cầu'); END;

-- Dòng nợ của phiếu ADJUSTMENT = đúng dòng yêu cầu đã duyệt đã khai (hai bên, số tiền, loại dòng, đơn); phiếu có đúng MỘT dòng, không dòng đảo —
-- yêu cầu nhỏ đã duyệt không mang theo dòng lớn gõ tay.
CREATE TRIGGER bil_debt_line_adjustment_match BEFORE INSERT ON bil_debt_line
WHEN (SELECT p.kind_code FROM bil_posting p WHERE p.id = NEW.posting_id) = 'ADJUSTMENT'
  AND (NEW.reverses_line_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM bil_debt_line x WHERE x.posting_id = NEW.posting_id)
    OR NOT EXISTS (SELECT 1 FROM bil_posting p JOIN bil_adjustment_request q ON q.id = p.request_id
         WHERE p.id = NEW.posting_id AND q.debtor_party_id = NEW.debtor_party_id AND q.creditor_party_id = NEW.creditor_party_id
           AND q.amount = NEW.amount AND q.line_kind_code = NEW.kind_code AND q.order_id IS NEW.order_id))
BEGIN SELECT RAISE(ABORT, 'adjustment_line_mismatch: dòng nợ của phiếu điều chỉnh phải đúng yêu cầu đã duyệt'); END;

-- Mốc của kiểm định kỳ R-BIL-14 / R-BIL-15 (khuôn bil_audit_cutoff 0080): phiếu ADJUSTMENT ghi TỪ mốc mà thiếu yêu cầu đã duyệt = LỖI; phiếu cũ hơn mốc được miễn. Chỉ-thêm.
INSERT INTO bil_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-BIL-14', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');

-- View công bố của `audit` cho tin báo ADR-0034 (khuôn v_aud_account_event 0075): CHỈ KHOÁ — không detail. `target_type`/`target_id` là khoá NGƯỜI NHẬN:
-- yêu cầu mới = target ('ledger', mã yêu cầu; người nhận tính lúc đọc theo ô duyệt); quyết định / "đổi số dư của bạn" = target ('staff', mã tài khoản người nhận).
CREATE VIEW v_aud_ledger_event AS
  SELECT id, order_id, target_type, target_id, staff_id, action, created_at FROM audit_log
  WHERE action IN ('ledger_adjustment_requested', 'ledger_adjustment_approved', 'ledger_adjustment_rejected', 'ledger_adjustment_withdrawn', 'ledger_adjustment_affected');
