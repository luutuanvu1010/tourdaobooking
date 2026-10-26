-- Migration 0119 — ADR-0136 (accepted 2026-10-25): BƯỚC XÁC NHẬN ĐƠN. Module orders. CHỈ THÊM (expand): ba bảng mới, không chạm bảng cũ.
-- Số: ngày 26/10, `main` có tới 0118; không nhánh (cục bộ lẫn xa) và không worktree nào giữ số ≥ 0119 ⇒ 0119.
-- Không đổi giá trị `orders.status` (CHECK ba giá trị từ 0003): «đang chờ xác nhận» = đơn `draft` có MỘT dòng `ord_confirm_request` còn mở.
-- Không dữ liệu cá nhân trong bảng nào (chỉ id nhân viên, mốc giờ, mã). Danh sách giá trị mở (scope, outcome, ticket) kiểm ở MÃ, không CHECK liệt kê.

-- 1) Yêu cầu xác nhận (Đ2). Mỗi đơn tối đa MỘT yêu cầu mở (`decided_at IS NULL`); khép đúng MỘT lần (UPDATE duy nhất: điền decided_at/decided_by/outcome và
--    ticket); không xoá. outcome ∈ XAC_NHAN | HUY | RUT_LAI; ticket ∈ CON_VE | HET_VE | HUY (NULL khi RUT_LAI) — kiểm ở mã (`KetQuaXacNhan`).
CREATE TABLE ord_confirm_request (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id),
  submitted_at  TEXT NOT NULL,                         -- lúc gửi (ISO UTC)
  submitted_by  TEXT NOT NULL,                         -- id nhân viên gửi
  deadline_at   TEXT NOT NULL,                         -- hạn 15 phút làm việc (ISO UTC; `hanXacNhan`)
  decided_at    TEXT,
  decided_by    TEXT,
  outcome       TEXT,
  ticket        TEXT,
  note          TEXT CHECK (note IS NULL OR length(note) <= 300),
  created_at    TEXT NOT NULL,
  created_by    TEXT,                                  -- cột WHO không khoá ngoại (ADR-0003)
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE UNIQUE INDEX ord_confirm_request_one_open ON ord_confirm_request(order_id) WHERE decided_at IS NULL;
CREATE INDEX ord_confirm_request_order ON ord_confirm_request(order_id, submitted_at);

CREATE TRIGGER ord_confirm_request_no_delete BEFORE DELETE ON ord_confirm_request
BEGIN SELECT RAISE(ABORT, 'ord_confirm_request_no_delete: yêu cầu xác nhận không xoá'); END;

CREATE TRIGGER ord_confirm_request_closed_final BEFORE UPDATE ON ord_confirm_request
WHEN OLD.decided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'ord_confirm_request_closed: yêu cầu đã khép, không sửa nữa'); END;

CREATE TRIGGER ord_confirm_request_immutable BEFORE UPDATE ON ord_confirm_request
WHEN NEW.id IS NOT OLD.id OR NEW.order_id IS NOT OLD.order_id OR NEW.submitted_at IS NOT OLD.submitted_at OR NEW.submitted_by IS NOT OLD.submitted_by
  OR NEW.deadline_at IS NOT OLD.deadline_at OR NEW.created_at IS NOT OLD.created_at
BEGIN SELECT RAISE(ABORT, 'ord_confirm_request_immutable: không sửa đơn, người gửi, hạn của yêu cầu'); END;

CREATE TRIGGER ord_confirm_request_close_complete BEFORE UPDATE ON ord_confirm_request
WHEN OLD.decided_at IS NULL AND (NEW.decided_at IS NULL OR NEW.decided_by IS NULL OR NEW.outcome IS NULL)
BEGIN SELECT RAISE(ABORT, 'ord_confirm_request_incomplete: khép yêu cầu phải có thời điểm, người quyết định và kết quả'); END;

CREATE TRIGGER ord_confirm_request_ticket_rule BEFORE UPDATE ON ord_confirm_request
WHEN OLD.decided_at IS NULL AND ((NEW.outcome = 'RUT_LAI' AND NEW.ticket IS NOT NULL) OR (NEW.outcome IS NOT NULL AND NEW.outcome <> 'RUT_LAI' AND NEW.ticket IS NULL))
BEGIN SELECT RAISE(ABORT, 'ord_confirm_request_ticket: rút lại không có kết quả vé; quyết định thì phải có'); END;

-- 2) Cờ «cần xác nhận» theo dịch vụ hoặc nhóm (Đ1) — khuôn `vc_leg_template` (0059): CHỈ THÊM, dòng hiệu lực của từng (scope, code) = dòng có `valid_from_at`
--    lớn nhất ≤ bây giờ. scope ∈ SERVICE (mã dịch vụ) | GROUP (mã nhóm) — kiểm ở mã. `required` 1 = cần, 0 = KHÔNG cần (ghi tường minh để dòng dịch vụ thắng dòng nhóm).
CREATE TABLE ord_service_confirm_flag (
  id             TEXT PRIMARY KEY,
  scope          TEXT NOT NULL,
  code           TEXT NOT NULL,
  required       INTEGER NOT NULL CHECK (required IN (0, 1)),
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (scope, code, valid_from_at)
);
CREATE TRIGGER ord_service_confirm_flag_no_update BEFORE UPDATE ON ord_service_confirm_flag
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: cờ cần xác nhận chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_service_confirm_flag_no_delete BEFORE DELETE ON ord_service_confirm_flag
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: cờ cần xác nhận không xoá'); END;

-- 3) Công tắc «nội bộ tự lập thì tự xác nhận» (Đ5) — khuôn `ord_manual_service_policy` (0052): đổi = chèn dòng mới; gieo 1 (bật).
CREATE TABLE ord_confirm_policy (
  id                     TEXT PRIMARY KEY,
  self_confirm_internal  INTEGER NOT NULL CHECK (self_confirm_internal IN (0, 1)),
  valid_from_at          TEXT NOT NULL UNIQUE,
  created_at             TEXT NOT NULL,
  created_by             TEXT,
  updated_at             TEXT NOT NULL,
  updated_by             TEXT
);
INSERT INTO ord_confirm_policy (id, self_confirm_internal, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0119', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_confirm_policy_no_update BEFORE UPDATE ON ord_confirm_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách xác nhận chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_confirm_policy_no_delete BEFORE DELETE ON ord_confirm_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách xác nhận không xoá'); END;
