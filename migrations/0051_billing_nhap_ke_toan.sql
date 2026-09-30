-- Migration 0051 (billing) — DẤU "ĐÃ NHẬP PHẦN MỀM KẾ TOÁN" + "SỐ HOÁ ĐƠN ĐÃ NHẬP" trên đơn (ADR-0060 điều 1, accepted 2026-09-30).
-- Số 0051 do phiên điều phối chung cấp (sửa cấp số 30/9: 0050 đã dùng cho 0050_tro_ly.sql trên main).
-- Chỉ THÊM. Bảng CHỈ-THÊM: đánh dấu / bỏ dấu / sửa số = thêm dòng mới; trạng thái hiện tại của một đơn = dòng có rowid LỚN NHẤT của đơn đó
-- (không xếp theo created_at — hai lần ghi cùng mili-giây; tiền lệ R-BIL-1). Không tiền, không trạng thái hoá đơn của ADR-0004.
-- Không "trường mở rộng tự do" (Hiến chương 5.2): hai trường có kiểu, có CHECK. Khoá ngoại NO ACTION. 4 cột dấu vết (updated_* = created_*, như ADR-0026).
-- Trigger chỉ đọc chính bảng này (ADR-0024 điều 5).
CREATE TABLE bil_accounting_entry (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders(id),
  -- 1 = đánh dấu đã nhập phần mềm kế toán; 0 = bỏ dấu.
  entered        INTEGER NOT NULL CHECK (entered IN (0, 1)),
  -- "Số hoá đơn đã nhập" = số tham chiếu trong phần mềm kế toán ngoài, chỉ để tra cứu (ADR-0060 điều 6).
  invoice_number TEXT CHECK (invoice_number IS NULL OR length(trim(invoice_number)) BETWEEN 1 AND 50),
  -- Bắt buộc khi bỏ dấu (A-4); bỏ dấu thì không kèm số.
  reason         TEXT,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  CHECK (entered = 1 OR (reason IS NOT NULL AND length(trim(reason)) > 0 AND invoice_number IS NULL))
);
CREATE INDEX bil_accounting_entry_order_ix ON bil_accounting_entry(order_id);

CREATE TRIGGER bil_accounting_entry_no_update BEFORE UPDATE ON bil_accounting_entry
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dấu nhập phần mềm kế toán không sửa được — ghi dòng mới'); END;
CREATE TRIGGER bil_accounting_entry_no_delete BEFORE DELETE ON bil_accounting_entry
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dấu nhập phần mềm kế toán không xoá được — bỏ dấu bằng dòng mới có lý do'); END;
