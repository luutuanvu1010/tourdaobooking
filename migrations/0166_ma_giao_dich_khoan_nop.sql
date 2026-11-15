-- Migration 0166 — MÃ GIAO DỊCH NGÂN HÀNG CỦA KHOẢN NỘP ĐẠI LÝ + KHOẢN NỘP ĐÃ XÁC NHẬN KHÔNG LỆCH SỔ (kiểm toán 14/11: một lần chuyển có thể được xác nhận cho hai đơn; băm ảnh chỉ lưu;
-- huỷ lẻ dòng SETTLEMENT của khoản nộp đã xác nhận làm sổ đảo mà khoản vẫn CONFIRMED). Module `billing`. Chỉ THÊM — không sửa 0088, 0159.
-- Khuôn: 0088 (bil_receipt_bank_txn). "Còn hiệu lực" của lần thu = vị từ `hieuLuc` (không phải dòng đảo, chưa bị đảo); của khoản nộp = trạng thái KHÁC REJECTED
-- (khoản chờ chỉ có dòng mã trong lô xác nhận đang chạy — lô chạy cùng giao dịch nên không để lại khoản chờ có mã). Câu lỗi có tiền tố mã — máy chủ dịch.

-- Bảng nối khoản nộp ↔ mã giao dịch (+ số thực chuyển theo sao kê). Một khoản nộp tối đa một mã. Không cột sửa, không dòng thay thế.
CREATE TABLE bil_remittance_bank_txn (
  id                 TEXT PRIMARY KEY,
  remittance_id      TEXT NOT NULL UNIQUE REFERENCES bil_agent_remittance(id),
  txn_code           TEXT NOT NULL CHECK (length(txn_code) BETWEEN 4 AND 40 AND txn_code NOT GLOB '*[^A-Z0-9]*'),
  transferred_amount INTEGER NOT NULL CHECK (transferred_amount > 0),
  created_at         TEXT NOT NULL,
  created_by         TEXT,
  updated_at         TEXT NOT NULL,
  updated_by         TEXT
);
CREATE INDEX bil_remittance_bank_txn_code_ix ON bil_remittance_bank_txn(txn_code);
CREATE TRIGGER bil_remittance_bank_txn_no_update BEFORE UPDATE ON bil_remittance_bank_txn
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mã giao dịch của khoản nộp đã gắn không sửa được'); END;
CREATE TRIGGER bil_remittance_bank_txn_no_delete BEFORE DELETE ON bil_remittance_bank_txn
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mã giao dịch của khoản nộp đã gắn không xoá được'); END;
-- Chặn INSERT OR REPLACE lách «chỉ-thêm» (REPLACE xoá dòng cũ mà không chạy trigger xoá) — khuôn 0159.
CREATE TRIGGER bil_remittance_bank_txn_no_replace BEFORE INSERT ON bil_remittance_bank_txn
WHEN EXISTS (SELECT 1 FROM bil_remittance_bank_txn t WHERE t.id = NEW.id OR t.remittance_id = NEW.remittance_id)
BEGIN SELECT RAISE(ABORT, 'bank_txn_no_replace: mã hoặc khoản nộp đã có dòng mã giao dịch'); END;

-- (i) Chỉ gắn cho khoản nộp ĐANG CHỜ. Thứ tự lô xác nhận: phiếu → dòng sổ → DÒNG MÃ → khoản sang CONFIRMED, nên ở lúc chèn dòng mã khoản vẫn là PENDING.
CREATE TRIGGER bil_remittance_bank_txn_remittance BEFORE INSERT ON bil_remittance_bank_txn
WHEN NOT EXISTS (SELECT 1 FROM bil_agent_remittance a WHERE a.id = NEW.remittance_id AND a.status_code = 'PENDING')
BEGIN SELECT RAISE(ABORT, 'bank_txn_remittance_invalid: chỉ gắn mã cho khoản nộp đang chờ xác nhận'); END;

-- (ii) Mọi dòng còn hiệu lực của cùng mã — ở CẢ HAI bảng — ghi CÙNG một số thực chuyển.
CREATE TRIGGER bil_remittance_bank_txn_amount_mismatch BEFORE INSERT ON bil_remittance_bank_txn
WHEN EXISTS (
    SELECT 1 FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
    WHERE t.txn_code = NEW.txn_code AND t.transferred_amount <> NEW.transferred_amount
      AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
  OR EXISTS (
    SELECT 1 FROM bil_remittance_bank_txn t JOIN bil_agent_remittance a ON a.id = t.remittance_id
    WHERE t.txn_code = NEW.txn_code AND t.transferred_amount <> NEW.transferred_amount AND a.status_code <> 'REJECTED')
BEGIN SELECT RAISE(ABORT, 'bank_txn_amount_mismatch: số tiền thực chuyển khác số đã ghi cho mã này'); END;

-- (iii) Tổng (lần thu còn hiệu lực gắn mã + khoản nộp không bị từ chối gắn mã + khoản đang gắn) ≤ số thực chuyển.
CREATE TRIGGER bil_remittance_bank_txn_over BEFORE INSERT ON bil_remittance_bank_txn
WHEN (SELECT COALESCE(SUM(r.amount), 0) FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
      WHERE t.txn_code = NEW.txn_code AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
   + (SELECT COALESCE(SUM(a.amount), 0) FROM bil_remittance_bank_txn t JOIN bil_agent_remittance a ON a.id = t.remittance_id
      WHERE t.txn_code = NEW.txn_code AND a.status_code <> 'REJECTED')
   + COALESCE((SELECT amount FROM bil_agent_remittance WHERE id = NEW.remittance_id), 0) > NEW.transferred_amount
BEGIN SELECT RAISE(ABORT, 'bank_txn_over: tổng các khoản gắn mã vượt số tiền thực chuyển'); END;

-- Đối xứng: một lần thu «Công ty thu» gắn mã cũng tính khoản nộp đã gắn cùng mã (0088 chỉ nhìn lần thu). Trigger MỚI, tên khác — 0088 giữ nguyên.
CREATE TRIGGER bil_receipt_bank_txn_remittance_mismatch BEFORE INSERT ON bil_receipt_bank_txn
WHEN EXISTS (
  SELECT 1 FROM bil_remittance_bank_txn t JOIN bil_agent_remittance a ON a.id = t.remittance_id
  WHERE t.txn_code = NEW.txn_code AND t.transferred_amount <> NEW.transferred_amount AND a.status_code <> 'REJECTED')
BEGIN SELECT RAISE(ABORT, 'bank_txn_amount_mismatch: số tiền thực chuyển khác số đã ghi cho mã này'); END;
CREATE TRIGGER bil_receipt_bank_txn_remittance_over BEFORE INSERT ON bil_receipt_bank_txn
WHEN (SELECT COALESCE(SUM(r.amount), 0) FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
      WHERE t.txn_code = NEW.txn_code AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
   + (SELECT COALESCE(SUM(a.amount), 0) FROM bil_remittance_bank_txn t JOIN bil_agent_remittance a ON a.id = t.remittance_id
      WHERE t.txn_code = NEW.txn_code AND a.status_code <> 'REJECTED')
   + COALESCE((SELECT amount FROM bil_payment_receipt WHERE id = NEW.receipt_id), 0) > NEW.transferred_amount
BEGIN SELECT RAISE(ABORT, 'bank_txn_over: tổng các khoản gắn mã vượt số tiền thực chuyển'); END;

-- Bắt buộc mã: khoản nộp sang CONFIRMED mà chưa có dòng mã ⇒ chặn. Khoản đã CONFIRMED trước migration không bao giờ bị UPDATE lại (trigger `remittance_decided` của 0159) nên không bị đòi bổ sung.
CREATE TRIGGER bil_agent_remittance_txn_required BEFORE UPDATE OF status_code ON bil_agent_remittance
WHEN NEW.status_code = 'CONFIRMED' AND OLD.status_code = 'PENDING' AND NOT EXISTS (SELECT 1 FROM bil_remittance_bank_txn t WHERE t.remittance_id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'bank_txn_required: xác nhận khoản nộp cần mã giao dịch ngân hàng'); END;

-- Khoản nộp đã xác nhận không lệch sổ: không dòng ĐẢO nào trỏ vào dòng của phiếu SETTLEMENT mà một khoản nộp CONFIRMED đang trỏ. Đã lần mọi nơi chèn dòng đảo (`sinhDongDao`):
-- «huỷ khoản thu», «Thay lần thu», «Công ty đã nhận» chỉ đảo dòng mang receipt_id của lần thu (dòng quyết toán khoản nộp không mang receipt_id); điều chỉnh có duyệt và huỷ đơn
-- không sinh dòng đảo. Chỉ còn lệnh «huỷ dòng sổ» (`dao_dong`) — nó cũng bị máy chủ chặn trước bằng câu tiếng Việt.
CREATE TRIGGER bil_debt_line_remittance_no_reversal BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM bil_debt_line o JOIN bil_agent_remittance a ON a.posting_id = o.posting_id
  WHERE o.id = NEW.reverses_line_id AND a.status_code = 'CONFIRMED')
BEGIN SELECT RAISE(ABORT, 'remittance_line_no_reversal: dòng thuộc khoản nộp đã xác nhận không huỷ riêng được'); END;

-- Chỉ mục cho cờ «biên lai trùng ảnh» (so băm ảnh còn giữ, chỉ trong câu đọc của người có quyền xác nhận). Bảng ảnh biên lai khoản thu (bil_receipt_proof) không thêm chỉ mục: nhỏ, và bài 0158 khoá đúng danh sách chỉ mục của nó.
CREATE INDEX bil_remittance_proof_hash_ix ON bil_remittance_proof(content_hash) WHERE content_hash IS NOT NULL;

-- Mốc cắt cho kiểm định kỳ R-BIL-NP1, R-BIL-NP2 (khuôn 0088): khoản nộp xác nhận TỪ mốc mới bị đòi; khoản cũ hơn mốc không đòi bổ sung. Chỉ-thêm.
INSERT INTO bil_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-BIL-NP', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');
