-- Migration 0080 — SỔ KHÔNG ĐỔI DẤU + MỘT DÒNG GIỮ HỘ TẤT TOÁN MỘT LẦN (ADR-0092 Đ2, Đ2b, đ8; TNV-VP01, phần KT04 của TNV-G4; kế hoạch
-- docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md §4 V2.4). Module `billing`. Chỉ THÊM trigger + một bảng mốc kiểm. Thân trigger
-- chỉ đọc bảng bil_ và view công bố `v_pty_owner_company` (cạnh billing → parties đã khai) — ADR-0024 điều 5. Máy chủ kiểm trước (service.ts); đây là lớp 2.
-- Câu báo lỗi có tiền tố mã (`settlement_sign_flip:` / `held_already_settled:`) — route dịch sang tiếng Việt.

-- (a) Dòng QUYẾT TOÁN gốc (nộp / trả / bù trừ) gắn đơn không làm số dư cặp (bên, công ty) trên đơn ĐỔI DẤU: nộp ≤ số bên đó đang nợ; trả ≤ số công ty đang
-- nợ bên đó (Đ2). "Bên" = phía KHÔNG phải công ty chủ. Không cấm số dư âm nói chung (công ty nợ đại lý / nhân viên ứng tiền là hợp lệ — ADR-0080 D-1).
CREATE TRIGGER bil_debt_line_settlement_no_flip BEFORE INSERT ON bil_debt_line
WHEN NEW.kind_code = 'SETTLEMENT' AND NEW.reverses_line_id IS NULL AND NEW.order_id IS NOT NULL
  AND (NEW.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) OR NEW.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company))
  AND (
    -- số dư hiện tại của bên với công ty trên đơn (dương = bên nợ công ty), nhân `dau`: nộp (công ty là bên nợ của dòng) = +1, trả = −1 ⇒ phải ≥ số của dòng
    SELECT COALESCE(SUM(CASE WHEN l.debtor_party_id = x.ben THEN l.amount ELSE -l.amount END), 0) * x.dau
    FROM (SELECT CASE WHEN NEW.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN NEW.creditor_party_id ELSE NEW.debtor_party_id END AS ben,
                 CASE WHEN NEW.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN NEW.debtor_party_id ELSE NEW.creditor_party_id END AS ct,
                 CASE WHEN NEW.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN 1 ELSE -1 END AS dau) x
    LEFT JOIN bil_debt_line l ON l.order_id = NEW.order_id
      AND ((l.debtor_party_id = x.ben AND l.creditor_party_id = x.ct) OR (l.debtor_party_id = x.ct AND l.creditor_party_id = x.ben))
  ) < NEW.amount
BEGIN SELECT RAISE(ABORT, 'settlement_sign_flip: nộp / trả vượt số đang nợ — số dư không được đổi dấu'); END;

-- (b) Dòng ĐẢO một dòng giữ hộ (HELD) — "Công ty đã nhận", đảo lần thu, đảo dòng — chỉ khi người giữ hộ còn nợ công ty trên đơn ≥ số của dòng gốc (Đ2b):
-- dòng giữ hộ đã được tất toán bằng "Nộp" thì không tất toán lần hai.
CREATE TRIGGER bil_debt_line_held_once BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NOT NULL AND NEW.kind_code = 'HELD' AND EXISTS (
  SELECT 1 FROM bil_debt_line g WHERE g.id = NEW.reverses_line_id AND g.order_id IS NOT NULL
    -- chỉ dòng giữ hộ GỐC chưa bị đảo (đảo lần hai / đảo dòng đảo để chỉ mục UNIQUE và trigger bil_reversal của 0045 báo đúng lỗi của chúng)
    AND g.reverses_line_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_debt_line x WHERE x.reverses_line_id = g.id)
    AND (SELECT COALESCE(SUM(CASE WHEN l.debtor_party_id = g.debtor_party_id THEN l.amount ELSE -l.amount END), 0) FROM bil_debt_line l
         WHERE l.order_id = g.order_id AND ((l.debtor_party_id = g.debtor_party_id AND l.creditor_party_id = g.creditor_party_id)
                                         OR (l.debtor_party_id = g.creditor_party_id AND l.creditor_party_id = g.debtor_party_id))) < g.amount)
BEGIN SELECT RAISE(ABORT, 'held_already_settled: dòng giữ hộ đã được tất toán (ghi nộp) — đảo lần nộp trước'); END;

-- Mốc của kiểm định kỳ (ADR-0092 đ8, khuôn ADR-0088 đ7 / ADR-0079 đ7a): vi phạm có dòng ghi TỪ mốc trở đi là LỖI; vi phạm cũ hơn mốc chỉ CẢNH BÁO kèm danh
-- sách (dữ liệu trước khi có trigger — Kế toán sửa bằng lệnh). Mốc = lúc áp migration này. Chỉ-thêm.
CREATE TABLE bil_audit_cutoff (
  code       TEXT PRIMARY KEY,
  cutoff_at  TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER bil_audit_cutoff_no_update BEFORE UPDATE ON bil_audit_cutoff
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mốc kiểm không sửa được'); END;
CREATE TRIGGER bil_audit_cutoff_no_delete BEFORE DELETE ON bil_audit_cutoff
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mốc kiểm không xoá được'); END;
INSERT INTO bil_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-BIL-13', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');
