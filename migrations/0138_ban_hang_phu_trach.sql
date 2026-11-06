-- Migration 0138 — BÁN HÀNG PHỤ TRÁCH ĐƠN (ADR-0142; kế hoạch docs/superpowers/plans/2026-10-27-ban-hang-phu-trach-don.md, Task 2).
-- THÊM ba bảng của module dispatch (ô riêng cho Bán hàng phụ trách, lời mời có ưu tiên, chính sách giờ hành chính), ba view công bố `v_dsp_sales_*`, một view
-- của module audit (`v_aud_order_ban_hang`) và MỘT cột của orders (`sales_invitee_party_id`, người được mời ghi trên đơn nháp). Dựng lại DUY NHẤT trigger khoá Đã giao
-- của orders để phủ cột mới (bài NT-R6, src/migrations-orders-da-giao.test.ts). Không đụng `dsp_assignment`: Bán hàng phụ trách KHÔNG phải người phụ trách (HANDLE).
--
-- HOÀN TÁC (Down). D1 không có migration "down" và chạy CẢ tệp này khi áp, nên câu gỡ chỉ được nằm trong chú thích. Muốn gỡ thì viết một migration SAU, theo thứ tự:
--   1. DROP VIEW v_aud_order_ban_hang; DROP VIEW v_dsp_sales_policy_current; DROP VIEW v_dsp_sales_invite_open; DROP VIEW v_dsp_sales_owner;
--   2. DROP TABLE dsp_sales_policy; DROP TABLE dsp_sales_invite; DROP TABLE dsp_sales_owner;   -- MẤT dữ liệu Bán hàng phụ trách và lời mời (xuất ra trước nếu cần)
--   3. dựng lại orders_delivered_lock theo thân của 0136 (không có sales_invitee_party_id), rồi mới gỡ cột (ALTER TABLE orders DROP COLUMN sales_invitee_party_id).
-- Điều kiện an toàn: bản mã đang chạy trên production KHÔNG còn câu nào nhắc các bảng/view/cột này (quay về bản mã trước ADR-0142).

-- (1) Cột mới của orders: người được mời làm Bán hàng phụ trách, ghi khi lập đơn nháp; đơn chưa có lời mời thì NULL.
ALTER TABLE orders ADD COLUMN sales_invitee_party_id TEXT;

-- (2) Dòng Bán hàng phụ trách: ô riêng, mỗi đơn tối đa MỘT dòng mở. Đổi người = khép dòng cũ rồi mở dòng mới (khép đúng một lần, không xoá — Hiến chương 5.2).
CREATE TABLE dsp_sales_owner (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id),
  party_id      TEXT NOT NULL REFERENCES pty_party(id),
  valid_from_at TEXT NOT NULL,
  valid_to_at   TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),     -- NULL = đang mở
  created_at    TEXT NOT NULL,
  created_by    TEXT,                                                                  -- cột WHO: TEXT NULL, không khoá ngoại (ADR-0003 điều 6)
  updated_at    TEXT NOT NULL,
  updated_by    TEXT,
  closed_by     TEXT
);
CREATE INDEX dsp_sales_owner_order_ix ON dsp_sales_owner(order_id);
CREATE INDEX dsp_sales_owner_party_ix ON dsp_sales_owner(party_id);
CREATE UNIQUE INDEX dsp_sales_owner_open_uq ON dsp_sales_owner(order_id) WHERE valid_to_at IS NULL;
-- Không xoá. Sửa chỉ là KHÉP dòng mở: đặt valid_to_at (từ NULL, đúng một lần) cùng closed_by, updated_*; mọi trường gốc đứng yên.
CREATE TRIGGER dsp_sales_owner_no_delete BEFORE DELETE ON dsp_sales_owner
BEGIN SELECT RAISE(ABORT, 'dsp_sales_owner_no_delete: dòng Bán hàng phụ trách không xoá, chỉ khép'); END;
CREATE TRIGGER dsp_sales_owner_close_once BEFORE UPDATE ON dsp_sales_owner
WHEN OLD.valid_to_at IS NOT NULL OR NEW.valid_to_at IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.order_id IS NOT OLD.order_id OR NEW.party_id IS NOT OLD.party_id OR NEW.valid_from_at IS NOT OLD.valid_from_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'dsp_sales_owner_close_once: dòng Bán hàng phụ trách chỉ khép được một lần, không sửa trường gốc'); END;
-- Khoá Đã giao (khuôn 0044, đọc view công bố v_ord_order_state): đơn Đã giao không nhận, không khép dòng Bán hàng phụ trách.
CREATE TRIGGER dsp_sales_owner_delivered_lock_ins BEFORE INSERT ON dsp_sales_owner
WHEN (SELECT delivered_at FROM v_ord_order_state WHERE id = NEW.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không đổi / nhận Bán hàng phụ trách'); END;
CREATE TRIGGER dsp_sales_owner_delivered_lock_upd BEFORE UPDATE ON dsp_sales_owner
WHEN (SELECT delivered_at FROM v_ord_order_state WHERE id = OLD.order_id) IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – không đổi / nhận Bán hàng phụ trách'); END;

-- (3) Lời mời Bán hàng nhận đơn: người được mời có ưu tiên đến `priority_until_at`. Mỗi đơn tối đa MỘT lời mời mở; khép đúng một lần với kết quả thuộc tập đóng.
CREATE TABLE dsp_sales_invite (
  id               TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL REFERENCES orders(id),
  invitee_party_id TEXT NOT NULL REFERENCES pty_party(id),
  invited_by       TEXT,
  recorded_at      TEXT NOT NULL,                                                      -- lúc đơn được ghi nhận (gửi xác nhận / xác nhận) — gốc của đồng hồ ưu tiên
  priority_until_at TEXT NOT NULL,
  closed_at        TEXT,
  closed_by        TEXT,
  outcome          TEXT CHECK (outcome IN ('NHAN', 'TU_CHOI', 'NGUOI_KHAC', 'HUY_DON', 'RUT_LAI')),   -- tập đóng, gắn với mã (Hiến chương 2.2)
  created_at       TEXT NOT NULL,
  created_by       TEXT,                                                               -- cột WHO (bài ADR-0003 của architecture.test.ts): thêm so với danh sách cột của kế hoạch
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CONSTRAINT dsp_sales_invite_close_ck CHECK (
    (closed_at IS NULL AND closed_by IS NULL AND outcome IS NULL) OR (closed_at IS NOT NULL AND closed_by IS NOT NULL AND outcome IS NOT NULL))
);
CREATE INDEX dsp_sales_invite_order_ix ON dsp_sales_invite(order_id);
CREATE INDEX dsp_sales_invite_invitee_ix ON dsp_sales_invite(invitee_party_id);
CREATE UNIQUE INDEX dsp_sales_invite_open_uq ON dsp_sales_invite(order_id) WHERE closed_at IS NULL;
CREATE TRIGGER dsp_sales_invite_no_delete BEFORE DELETE ON dsp_sales_invite
BEGIN SELECT RAISE(ABORT, 'dsp_sales_invite_no_delete: lời mời không xoá, chỉ khép'); END;
CREATE TRIGGER dsp_sales_invite_close_once BEFORE UPDATE ON dsp_sales_invite
WHEN OLD.closed_at IS NOT NULL OR NEW.closed_at IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.order_id IS NOT OLD.order_id OR NEW.invitee_party_id IS NOT OLD.invitee_party_id OR NEW.invited_by IS NOT OLD.invited_by
  OR NEW.recorded_at IS NOT OLD.recorded_at OR NEW.priority_until_at IS NOT OLD.priority_until_at OR NEW.created_at IS NOT OLD.created_at
BEGIN SELECT RAISE(ABORT, 'dsp_sales_invite_close_once: lời mời chỉ khép được một lần, không sửa trường gốc'); END;

-- (4) Chính sách giờ hành chính — CHỈ THÊM, có hiệu lực (khuôn dsp_refuse_policy của 0117). Dòng đang dùng = valid_from_at lớn nhất.
CREATE TABLE dsp_sales_policy (
  id                TEXT PRIMARY KEY,
  valid_from_at     TEXT NOT NULL UNIQUE,
  priority_minutes  INTEGER NOT NULL CHECK (priority_minutes BETWEEN 1 AND 120),
  work_start_minute INTEGER NOT NULL,
  work_end_minute   INTEGER NOT NULL,
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,                                                     -- luôn bằng created_* (bảng chỉ thêm; khuôn dsp_refuse_policy) — bài ADR-0003 đòi đủ cột kiểm toán
  updated_by        TEXT,
  CONSTRAINT dsp_sales_policy_work_ck CHECK (work_start_minute >= 0 AND work_start_minute < work_end_minute AND work_end_minute <= 1440)
);
-- Gieo 15 phút ưu tiên, giờ hành chính 07:00–17:00 (phút 420–1020). created_at của dòng gieo = MỐC PHÁT HÀNH (lúc áp migration = lúc phát hành): đơn ghi nhận trước đó không vào thẻ cảnh báo.
INSERT INTO dsp_sales_policy (id, valid_from_at, priority_minutes, work_start_minute, work_end_minute, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-ban-hang', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 15, 420, 1020, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER dsp_sales_policy_no_update BEFORE UPDATE ON dsp_sales_policy
BEGIN SELECT RAISE(ABORT, 'dsp_sales_policy_append_only: chính sách Bán hàng phụ trách chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER dsp_sales_policy_no_delete BEFORE DELETE ON dsp_sales_policy
BEGIN SELECT RAISE(ABORT, 'dsp_sales_policy_append_only: chính sách Bán hàng phụ trách không xoá'); END;

-- (5) View công bố của dispatch (khuôn v_dsp_order_handler 0014): đọc hồ sơ/tài khoản CHỈ qua view của module chủ. LEFT JOIN tài khoản: người có thể chưa/không còn tài khoản.
CREATE VIEW v_dsp_sales_owner AS
  SELECT o.order_id AS order_id, s.id AS staff_id, o.party_id AS party_id, p.display_name AS name
  FROM dsp_sales_owner o
  JOIN v_pty_party_label p ON p.id = o.party_id
  LEFT JOIN v_stf_staff_label s ON s.party_id = o.party_id
  WHERE o.valid_to_at IS NULL;
CREATE VIEW v_dsp_sales_invite_open AS
  SELECT i.order_id AS order_id, s.id AS staff_id, i.invitee_party_id AS party_id, p.display_name AS name, i.recorded_at AS recorded_at, i.priority_until_at AS priority_until_at
  FROM dsp_sales_invite i
  JOIN v_pty_party_label p ON p.id = i.invitee_party_id
  LEFT JOIN v_stf_staff_label s ON s.party_id = i.invitee_party_id
  WHERE i.closed_at IS NULL;
CREATE VIEW v_dsp_sales_policy_current AS
  SELECT priority_minutes, work_start_minute, work_end_minute,
         (SELECT created_at FROM dsp_sales_policy WHERE id = 'gieo-ban-hang') AS release_cutoff_at
  FROM dsp_sales_policy
  ORDER BY valid_from_at DESC
  LIMIT 1;

-- (6) Module audit — HÌNH CHIẾU audit_log cho câu của dispatch nối vào lô lệnh đơn (khuôn v_aud_order_cmd của 0089): câu của dispatch gác bằng
-- `EXISTS (SELECT 1 FROM v_aud_order_ban_hang WHERE id = :auditIdDon AND order_id = :orderId)` — lệnh đơn thua lặng lẽ thì nhật ký không có ⇒ câu dispatch thua theo.
-- Chỉ khoá: không chi tiết, không người, không giờ. Tập hành động = HANH_DONG_GAC_BAN_HANG (src/shared/ban-hang-phu-trach.ts — bài so tập).
-- KHÔNG mở rộng v_aud_order_cmd (tập đó gắn với máy đồng bộ chuyến).
CREATE VIEW v_aud_order_ban_hang AS
  SELECT id, order_id FROM audit_log
   WHERE order_id IS NOT NULL
     AND action IN ('confirmed', 'order_confirm_requested', 'order_confirm_withdrawn', 'cancelled', 'order_cancelled_by_field');

-- (7) Trigger khoá Đã giao phải liệt kê MỌI cột của orders (bài NT-R6). Thân y hệt 0136, thêm đúng một cột sales_invitee_party_id.
DROP TRIGGER orders_delivered_lock;
CREATE TRIGGER orders_delivered_lock BEFORE UPDATE ON orders
WHEN OLD.delivered_at IS NOT NULL
  AND NOT (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL
    AND NEW.id IS OLD.id AND NEW.order_code IS OLD.order_code AND NEW.staff_id IS OLD.staff_id AND NEW.status IS OLD.status
    AND NEW.customer_name IS OLD.customer_name AND NEW.customer_phone IS OLD.customer_phone AND NEW.customer_email IS OLD.customer_email
    AND NEW.customer_note IS OLD.customer_note AND NEW.subtotal IS OLD.subtotal AND NEW.discount IS OLD.discount AND NEW.total IS OLD.total
    AND NEW.deposit_amount IS OLD.deposit_amount AND NEW.deposit_method IS OLD.deposit_method AND NEW.remaining_amount IS OLD.remaining_amount
    AND NEW.payment_note IS OLD.payment_note AND NEW.created_at IS OLD.created_at AND NEW.confirmed_at IS OLD.confirmed_at
    AND NEW.booker_party_id IS OLD.booker_party_id AND NEW.delivered_at IS OLD.delivered_at AND NEW.delivered_by IS OLD.delivered_by
    AND NEW.manifest_exempt IS OLD.manifest_exempt AND NEW.declared_deposit IS OLD.declared_deposit AND NEW.sales_invitee_party_id IS OLD.sales_invitee_party_id)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – đã thu đủ, không sửa được'); END;
