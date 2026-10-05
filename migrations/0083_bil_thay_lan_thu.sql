-- Migration 0083 — "THAY LẦN THU" VÀ I1 MỌI LÚC SAU "ĐÃ GIAO" (ADR-0088 đ1, đ2, đ3, đ4 (iv), đ5, đ6, đ7 — TNV-G3 phần thi công được; đ9 phân định trách nhiệm
-- CHƯA làm ⇒ "giảm trừ đã phân định" = 0, phải thu hiện hành = `due_snapshot` của phiếu Đã giao). Module `billing`. Thân trigger chỉ đọc bảng bil_ (ADR-0024 đ5).
-- "Đã giao" ở đây = đơn ĐÃ CÓ phiếu DELIVERED (lô "Đã giao" chèn lần thu lúc giao TRƯỚC phiếu, nên không bị chặn).
-- Máy chủ kiểm trước (thay-lan-thu.ts, service.ts); đây là lớp 2. Đã thu ròng = cùng công thức trigger 0045 / 0082 (lần thu còn hiệu lực: thu cộng, trả trừ).

-- (1) Loại phiếu mới: phiếu ĐÁNH DẤU của một lô "Thay lần thu" (đ2 bước 3) — mang trigger kiểm I1.
INSERT INTO bil_posting_kind (code, name, sort_order, active) VALUES ('REPLACEMENT', 'Thay lần thu', 9, 1);

-- (2) Spike đ6 — dấu nối "thay cho": lần thu MỚI và dòng ĐẢO của một lô Thay mang id phiếu đánh dấu của lô (phiếu chèn SAU — không khoá ngoại). Nhờ dấu này
-- trigger phân biệt "đảo trong lô Thay" với "đảo đơn lẻ". NULL = mọi lần thu khác.
ALTER TABLE bil_payment_receipt ADD COLUMN replacement_id TEXT;

-- (3) đ3 + đ4 (iv): đơn đã Đã giao — KHÔNG đảo đơn lẻ một lần thu, KHÔNG ghi lần thu / lần trả lại khách mới, trừ khi thuộc một lô Thay ĐANG GHI (có dấu nối
-- mà phiếu đánh dấu CHƯA có — kiểm độc lập vòng 3: dấu nối của lô đã khép không dùng lại được; dòng đảo phải đi cùng ít nhất một lần thu mới cùng dấu, cùng
-- đơn — lô ghi lần thu mới TRƯỚC). Hoàn sau Đã giao chờ đ9 (phân định) — tới lúc đó bị chặn.
CREATE TRIGGER bil_receipt_after_delivered BEFORE INSERT ON bil_payment_receipt
WHEN EXISTS (SELECT 1 FROM bil_posting p WHERE p.order_id = NEW.order_id AND p.kind_code = 'DELIVERED')
  AND (NEW.replacement_id IS NULL
    OR EXISTS (SELECT 1 FROM bil_posting m WHERE m.id = NEW.replacement_id)
    OR (NEW.reverses_id IS NULL AND NEW.kind_code <> 'CUSTOMER_PAYMENT')
    OR (NEW.reverses_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM bil_payment_receipt n WHERE n.replacement_id = NEW.replacement_id AND n.order_id = NEW.order_id AND n.reverses_id IS NULL)))
BEGIN SELECT RAISE(ABORT, 'receipt_after_delivered: đơn đã Đã giao — chỉ sửa lần thu bằng lệnh Thay lần thu'); END;

-- (4) đ2: phiếu đánh dấu — phải có ít nhất một lần thu mới cùng dấu trên chính đơn; dòng đảo (N lần thu cũ) có thể 0 khi đơn ĐÃ Đã giao và đang lệch từ
-- trước (kiểm độc lập vòng 3 — mọi lần thu đã bị đảo trước bản vá: lô Thay N = 0 là đường ghi bù duy nhất, I1 ép đúng số); lý do ≥ 10 ký tự; đơn đã Đã giao
-- thì sau lô đã thu ròng = phải thu (`due_snapshot` − giảm trừ đã phân định; giảm trừ = 0 tới khi có đ9).
CREATE TRIGGER bil_posting_replacement_check BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'REPLACEMENT' AND (
  NEW.order_id IS NULL
  OR length(trim(COALESCE(NEW.reason, ''))) < 10
  OR NOT EXISTS (SELECT 1 FROM bil_payment_receipt n WHERE n.replacement_id = NEW.id AND n.order_id = NEW.order_id AND n.reverses_id IS NULL)
  OR (NOT EXISTS (SELECT 1 FROM bil_payment_receipt d WHERE d.replacement_id = NEW.id AND d.order_id = NEW.order_id AND d.reverses_id IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM bil_posting g WHERE g.order_id = NEW.order_id AND g.kind_code = 'DELIVERED'))
  OR EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.replacement_id = NEW.id AND x.order_id IS NOT NEW.order_id)
  OR EXISTS (
    SELECT 1 FROM bil_posting g WHERE g.order_id = NEW.order_id AND g.kind_code = 'DELIVERED'
      AND g.due_snapshot IS NOT COALESCE((
        SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
        WHERE r.order_id = NEW.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0)))
BEGIN SELECT RAISE(ABORT, 'replacement_i1: lô Thay lần thu không hợp lệ hoặc sau khi thay số đã thu khác phải thu của đơn'); END;

-- (5) đ5: Hoàn thành bị chặn khi I1 lệch (lớp CSDL). Trigger RIÊNG bên cạnh `bil_posting_completed_settled` (0045 — điều kiện người giữ tiền giữ nguyên),
-- không viết lại trigger cũ.
CREATE TRIGGER bil_posting_completed_due BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'COMPLETED' AND EXISTS (
  SELECT 1 FROM bil_posting g WHERE g.order_id = NEW.order_id AND g.kind_code = 'DELIVERED'
    AND g.due_snapshot IS NOT COALESCE((
      SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
      WHERE r.order_id = NEW.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0))
BEGIN SELECT RAISE(ABORT, 'completed_due_mismatch: số đã thu khác phải thu lúc Đã giao'); END;

-- (6) đ7: mốc của R-BIL-1 xét mọi lúc — đơn có lần thu / phiếu Đã giao ghi TỪ mốc mà lệch = LỖI; chỉ có dữ liệu cũ hơn mốc = cảnh báo kèm danh sách.
INSERT INTO bil_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-BIL-1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');
