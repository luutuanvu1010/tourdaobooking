-- Migration 0088 — MÃ GIAO DỊCH NGÂN HÀNG CỦA LẦN THU (ADR-0092 Đ6 + ADR-0108 đ4: T1, T2, T4, C1; đặc tả docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md
-- §5, §6). Module `billing`. Chỉ THÊM. Máy chủ kiểm trước (billing/ma-giao-dich.ts, service.ts, thay-lan-thu.ts); đây là lớp 2. "Còn hiệu lực" = vị từ `hieuLuc`
-- của billing/rules.ts: không phải dòng đảo và chưa bị đảo — dòng nối của lần thu đã đảo TỰ RƠI khỏi mọi phép kiểm. Câu lỗi có tiền tố mã — route dịch.

-- Bảng nối lần thu ↔ mã giao dịch (+ số tiền thực chuyển theo sao kê — T2). Một lần thu tối đa một mã. Không cột sửa, không dòng thay thế.
CREATE TABLE bil_receipt_bank_txn (
  id                 TEXT PRIMARY KEY,
  receipt_id         TEXT NOT NULL UNIQUE REFERENCES bil_payment_receipt(id),
  txn_code           TEXT NOT NULL CHECK (length(txn_code) BETWEEN 4 AND 40 AND txn_code NOT GLOB '*[^A-Z0-9]*'),
  transferred_amount INTEGER NOT NULL CHECK (transferred_amount > 0),
  created_at         TEXT NOT NULL,
  created_by         TEXT,
  updated_at         TEXT NOT NULL,
  updated_by         TEXT
);
CREATE INDEX bil_receipt_bank_txn_code_ix ON bil_receipt_bank_txn(txn_code);
CREATE TRIGGER bil_receipt_bank_txn_no_update BEFORE UPDATE ON bil_receipt_bank_txn
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mã giao dịch đã gắn không sửa được — sửa bằng Đảo / Thay lần thu'); END;
CREATE TRIGGER bil_receipt_bank_txn_no_delete BEFORE DELETE ON bil_receipt_bank_txn
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mã giao dịch đã gắn không xoá được'); END;

-- (a) Chỉ gắn vào lần thu của khách, GỐC, còn hiệu lực, người thu Công ty, chuyển khoản, không phải nửa thu của lệnh chuyển cọc.
CREATE TRIGGER bil_receipt_bank_txn_receipt BEFORE INSERT ON bil_receipt_bank_txn
WHEN NOT EXISTS (
  SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.kind_code = 'CUSTOMER_PAYMENT' AND r.reverses_id IS NULL AND r.transfer_of_id IS NULL
    AND r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER' AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
BEGIN SELECT RAISE(ABORT, 'bank_txn_receipt_invalid: chỉ gắn mã cho lần thu chuyển khoản – Công ty thu còn hiệu lực'); END;

-- (b) Trùng mã cùng đơn: cùng mã đã gắn một lần thu còn hiệu lực của cùng đơn.
CREATE TRIGGER bil_receipt_bank_txn_duplicate BEFORE INSERT ON bil_receipt_bank_txn
WHEN EXISTS (
  SELECT 1 FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
  WHERE t.txn_code = NEW.txn_code AND r.order_id = (SELECT order_id FROM bil_payment_receipt WHERE id = NEW.receipt_id)
    AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
BEGIN SELECT RAISE(ABORT, 'bank_txn_duplicate: mã giao dịch đã gắn với một lần thu khác của đơn này'); END;

-- (c) T2: mọi dòng còn hiệu lực của cùng mã ghi CÙNG một số thực chuyển.
CREATE TRIGGER bil_receipt_bank_txn_amount_mismatch BEFORE INSERT ON bil_receipt_bank_txn
WHEN EXISTS (
  SELECT 1 FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
  WHERE t.txn_code = NEW.txn_code AND t.transferred_amount <> NEW.transferred_amount
    AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
BEGIN SELECT RAISE(ABORT, 'bank_txn_amount_mismatch: số tiền thực chuyển khác số đã ghi cho mã này'); END;

-- (d) Tổng các lần thu còn hiệu lực gắn cùng mã (mọi đơn) + lần thu đang gắn ≤ số thực chuyển.
CREATE TRIGGER bil_receipt_bank_txn_over BEFORE INSERT ON bil_receipt_bank_txn
WHEN (SELECT COALESCE(SUM(r.amount), 0) FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
      WHERE t.txn_code = NEW.txn_code AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
   + (SELECT amount FROM bil_payment_receipt WHERE id = NEW.receipt_id) > NEW.transferred_amount
BEGIN SELECT RAISE(ABORT, 'bank_txn_over: tổng các lần thu gắn mã vượt số tiền thực chuyển'); END;

-- (e) C1 đường 1 — "Công ty đã nhận": dòng đảo giữ hộ thuộc phiếu COMPANY_RECEIVED của lần thu chuyển khoản – Công ty thu GHI TỪ mốc phải có mã. Phiếu
-- COMPANY_RECEIVED đứng ĐẦU lô và không trỏ lần thu, nên lớp chặn gắn vào DÒNG sổ (mang receipt_id); máy chủ chèn dòng nối TRƯỚC phiếu.
CREATE TRIGGER bil_debt_line_company_received_txn BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NOT NULL AND NEW.receipt_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM bil_posting p WHERE p.id = NEW.posting_id AND p.kind_code = 'COMPANY_RECEIVED')
  AND EXISTS (SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER'
    AND r.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'))
  AND NOT EXISTS (SELECT 1 FROM bil_receipt_bank_txn t WHERE t.receipt_id = NEW.receipt_id)
BEGIN SELECT RAISE(ABORT, 'bank_txn_required: xác nhận khoản chuyển khoản cần mã giao dịch ngân hàng'); END;

-- (f) C1 đường 3 — "Thay lần thu": phiếu đánh dấu REPLACEMENT (chèn CUỐI lô) — mọi lần thu MỚI chuyển khoản – Công ty thu của lô phải có mã. Máy chủ chèn
-- dòng nối SAU dòng đảo của lần thu cũ (nên dùng lại cùng mã không bị luật (b) chặn) và TRƯỚC phiếu này.
CREATE TRIGGER bil_posting_replacement_txn BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'REPLACEMENT' AND EXISTS (
  SELECT 1 FROM bil_payment_receipt n WHERE n.replacement_id = NEW.id AND n.reverses_id IS NULL AND n.kind_code = 'CUSTOMER_PAYMENT'
    AND n.collector_role_code = 'COMPANY' AND n.method_code = 'BANK_TRANSFER'
    AND n.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6')
    AND NOT EXISTS (SELECT 1 FROM bil_receipt_bank_txn t WHERE t.receipt_id = n.id))
BEGIN SELECT RAISE(ABORT, 'bank_txn_required: lần thu chuyển khoản mới trong lệnh Thay cần mã giao dịch ngân hàng'); END;

-- Đường 2 (Kế toán / Toàn quyền tự ghi lần thu trước Đã giao) KHÔNG có phiếu để gắn trigger: "bắt buộc mã" ở đó CHỈ máy chủ; lưới thứ hai là R-BIL-D6b
-- của scripts/audit-checks.mjs (khai ở docs/SO-HANG-RAO.md — dựa vào kỷ luật ở lớp CSDL).

-- C1: mốc cắt cứng — lần thu ghi TỪ mốc mới bị đòi mã; dòng cũ không đòi bổ sung. Cũng là mốc của R-BIL-D6a/D6b. Chỉ-thêm.
INSERT INTO bil_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-BIL-D6', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');
