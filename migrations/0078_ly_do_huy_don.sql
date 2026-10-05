-- Migration 0078 — LÝ DO HUỶ ĐƠN bắt buộc, chia nhóm (ADR-0089 đ8, X-2, X-3; kế hoạch docs/superpowers/plans/2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md
-- §3.1, Task 5). Module `orders` (tiền tố ord_). Chỉ THÊM: một bảng chỉ-thêm, một view công bố, trigger; gieo một dòng "chưa kết luận" cho MỌI đơn huỷ cũ.
-- Mọi giá trị cột của `orders` KHÔNG đổi. Danh sách mã lý do / nhóm là danh sách mở kiểm ở MÃ (`src/shared/ly-do-huy.ts`), không CHECK liệt kê.
-- Câu báo lỗi có tiền tố mã (`cancel_reason_required:` …) — route dịch sang tiếng Việt, không lộ mã thô.

-- Một dòng lý do cho mỗi lần huỷ; dòng PHÂN LOẠI (Quản trị/Toàn quyền đổi "chưa kết luận" sang nhóm khác) trỏ dòng gốc bằng `reclassifies_id`.
-- Dòng HIỆN HÀNH của đơn = dòng không bị dòng nào trỏ tới. Chỉ-thêm: không sửa, không xoá (ADR-0003 điều 8).
CREATE TABLE ord_cancel_reason (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id),
  reason_code     TEXT NOT NULL,
  -- KHACH_HUY | CONG_TY_HUY | LAP_LAI | CHUA_KET_LUAN (kiểm ở mã).
  group_code      TEXT NOT NULL,
  -- Ghi chú của lý do "Khác" / lý do phân loại — đã qua `hasLongDigitRun` ở máy chủ (không SĐT).
  note            TEXT CHECK (note IS NULL OR length(note) <= 300),
  -- Ngày huỷ (ngày dân sự giờ VN, máy chủ truyền) — mốc hạn hoàn cọc khi đơn chưa có ngày đi (ADR-0089 đ5).
  cancelled_date  TEXT NOT NULL CHECK (date(cancelled_date) IS cancelled_date),
  reclassifies_id TEXT UNIQUE REFERENCES ord_cancel_reason(id),
  -- 1 = đơn huỷ TRƯỚC khi có lý do bắt buộc (gieo ở cuối tệp này) — phạm vi của dòng "đã hoàn ngoài hệ thống" (X-3).
  legacy          INTEGER NOT NULL DEFAULT 0 CHECK (legacy IN (0, 1)),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  CHECK (reason_code <> 'OTHER' OR note IS NOT NULL)
);
CREATE INDEX ord_cancel_reason_order_ix ON ord_cancel_reason(order_id);
-- Mỗi đơn đúng MỘT dòng gốc (lần huỷ); dòng phân loại nối tiếp (reclassifies_id UNIQUE ⇒ chuỗi thẳng).
CREATE UNIQUE INDEX ord_cancel_reason_one_first ON ord_cancel_reason(order_id) WHERE reclassifies_id IS NULL;

CREATE TRIGGER ord_cancel_reason_no_update BEFORE UPDATE ON ord_cancel_reason
BEGIN SELECT RAISE(ABORT, 'ord_append_only: lý do huỷ không sửa được — phân loại bằng dòng mới'); END;
CREATE TRIGGER ord_cancel_reason_no_delete BEFORE DELETE ON ord_cancel_reason
BEGIN SELECT RAISE(ABORT, 'ord_append_only: lý do huỷ không xoá được'); END;

-- Dòng phân loại (NT-L6, X-2): chỉ trỏ dòng "chưa kết luận" của CÙNG đơn, đang hiện hành; không đổi sang "chưa kết luận"; giữ nguyên ngày huỷ và cờ legacy.
CREATE TRIGGER ord_cancel_reason_reclassify BEFORE INSERT ON ord_cancel_reason
WHEN NEW.reclassifies_id IS NOT NULL AND (
  NEW.group_code = 'CHUA_KET_LUAN'
  OR NOT EXISTS (SELECT 1 FROM ord_cancel_reason g WHERE g.id = NEW.reclassifies_id AND g.order_id = NEW.order_id AND g.group_code = 'CHUA_KET_LUAN'
                 AND g.cancelled_date = NEW.cancelled_date AND g.legacy = NEW.legacy))
BEGIN SELECT RAISE(ABORT, 'cancel_reclassify_invalid: chỉ phân loại dòng "chưa kết luận" của cùng đơn sang nhóm khác'); END;

-- Đơn chỉ chuyển sang "huỷ" khi đã có dòng lý do (đ8 — H-C6). Câu chèn lý do đứng TRƯỚC câu đổi trạng thái trong cùng lô (cùng điều kiện khoá lạc quan).
CREATE TRIGGER orders_cancel_requires_reason BEFORE UPDATE OF status ON orders
WHEN NEW.status = 'cancelled' AND OLD.status IS NOT 'cancelled'
  AND NOT EXISTS (SELECT 1 FROM ord_cancel_reason r WHERE r.order_id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'cancel_reason_required: đơn huỷ phải có lý do huỷ'); END;

-- View công bố (đọc xuyên module chỉ qua view — `billing` đọc nhóm + hạn của đơn huỷ). Chỉ khoá + mã, không tên khách, không ghi chú.
-- `refund_deadline` (ADR-0089 đ5) = ngày khởi hành muộn nhất + 60 ngày; đơn chưa có ngày đi nào thì ngày huỷ + 60 — cùng định nghĩa `hanHoanCoc`
-- (src/modules/billing/rules.ts; bài đối chiếu hai nơi ở src/migrations-ly-do-huy.test.ts).
CREATE VIEW v_ord_cancel_state AS
  SELECT r.order_id AS order_id, r.group_code AS group_code, r.reason_code AS reason_code, r.cancelled_date AS cancelled_date, r.legacy AS legacy,
         (SELECT MAX(s.depart_date) FROM order_service s WHERE s.order_id = r.order_id) AS depart_last_date,
         date(COALESCE((SELECT MAX(s.depart_date) FROM order_service s WHERE s.order_id = r.order_id), r.cancelled_date), '+60 days') AS refund_deadline
  FROM ord_cancel_reason r
  WHERE NOT EXISTS (SELECT 1 FROM ord_cancel_reason x WHERE x.reclassifies_id = r.id);

-- Gieo MỘT LẦN (NT-L7): mọi đơn đang huỷ nhận một dòng "chưa kết luận", mã LEGACY, legacy = 1, người ghi 'he-thong'. Ngày huỷ = ngày VN của dòng nhật ký
-- huỷ mới nhất ('cancelled' / 'order_cancelled_by_field'); không có nhật ký thì ngày VN của `orders.updated_at`. Đổi mốc ĐÃ LƯU (UTC ISO) sang ngày VN
-- bằng '+7 hours' (khuôn 0045) — không dùng date('now').
INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
  o.id, 'LEGACY', 'CHUA_KET_LUAN', NULL,
  date(COALESCE((SELECT MAX(a.created_at) FROM audit_log a WHERE a.order_id = o.id AND a.action IN ('cancelled', 'order_cancelled_by_field')), o.updated_at), '+7 hours'),
  NULL, 1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong'
FROM orders o
WHERE o.status = 'cancelled';
