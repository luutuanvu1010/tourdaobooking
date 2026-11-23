-- Migration 0186 — ADR-0230 (chủ duyệt 2026-11-22): Đ3 «Vé do ai phát» theo nhóm + Đ1 dấu «Trả sau theo dịch vụ» (thi công ADR-0178 Đ2).
-- Chỉ THÊM hai bảng (một của `catalog`, một của `billing`) + trigger + view + chỉ mục. Không đụng bảng `orders` (cột `credit_basis` ở migration 0187).
-- Số 0186–0187 do phiên điều phối giữ cho Việc 11 (21/11).
-- HOÀN TÁC: D1 không có bước "down". Bảng rỗng không ảnh hưởng mã cũ; muốn gỡ thì một migration SAU bỏ trigger / view / bảng khi còn rỗng.
-- KHÔNG gieo dòng nào: dấu Trả sau theo dịch vụ cần số giờ trả do chủ chọn (ADR-0230 Đ1 mục 6).

-- (1) «Vé do ai phát» theo NHÓM — khuôn `ctl_service_ticket_source` (0151): chỉ thêm, dòng hiệu lực của mỗi nhóm = `valid_from_at` lớn nhất.
-- Giá trị hiện hành của MỘT dịch vụ = dòng riêng của dịch vụ, không thì dòng của nhóm hiện tại, không thì Vé hãng ngoài (luật thuần `nguonVeCua`, src/shared/nguon-ve.ts).
CREATE TABLE ctl_group_ticket_source (
  id             TEXT PRIMARY KEY,
  group_code     TEXT NOT NULL REFERENCES ctl_group (code),
  source         TEXT NOT NULL CHECK (source IN ('HANG_NGOAI', 'TOUR_DAO')),
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (group_code, valid_from_at)
);
CREATE TRIGGER ctl_group_ticket_source_no_update BEFORE UPDATE ON ctl_group_ticket_source
BEGIN SELECT RAISE(ABORT, 'ctl_group_ticket_source_append_only: ô Vé do ai phát của nhóm chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ctl_group_ticket_source_no_delete BEFORE DELETE ON ctl_group_ticket_source
BEGIN SELECT RAISE(ABORT, 'ctl_group_ticket_source_append_only: ô Vé do ai phát của nhóm không xoá'); END;

CREATE VIEW v_ctl_group_ticket_source AS
  SELECT s.group_code, s.source FROM ctl_group_ticket_source s
  WHERE s.valid_from_at = (SELECT max(t.valid_from_at) FROM ctl_group_ticket_source t WHERE t.group_code = s.group_code);

-- (2) Dấu «Trả sau theo dịch vụ» — bảng cài đặt của `billing` (ADR-0178 Đ2 mục 1). Một dòng = nhóm hoặc dịch vụ có dấu, với số giờ trả (1..8760) và ân hạn (0..8760).
-- Hiệu lực bằng `valid_from` / `valid_to`: dòng mở = `valid_to IS NULL`, mỗi đích tối đa MỘT dòng mở. Đổi số giờ = đóng dòng mở + chèn dòng mới (một lô); gỡ dấu = đóng dòng mở.
-- Cấm xoá; chỉ một kiểu sửa là đặt `valid_to` (kèm `updated_at` / `updated_by`) MỘT lần. Mã nhóm / dịch vụ kiểm ở máy chủ (danh mục đồng bộ từ Sheet, không khoá ngoại).
CREATE TABLE bil_service_credit_rule (
  id           TEXT PRIMARY KEY,
  target_kind  TEXT NOT NULL CHECK (target_kind IN ('GROUP', 'SERVICE')),
  target_code  TEXT NOT NULL CHECK (length(target_code) BETWEEN 1 AND 100),
  due_hours    INTEGER NOT NULL CHECK (due_hours BETWEEN 1 AND 8760),
  grace_hours  INTEGER NOT NULL CHECK (grace_hours BETWEEN 0 AND 8760),
  valid_from   TEXT NOT NULL,
  valid_to     TEXT,
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT,
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE UNIQUE INDEX bil_service_credit_rule_one_open ON bil_service_credit_rule (target_kind, target_code) WHERE valid_to IS NULL;

CREATE TRIGGER bil_service_credit_rule_no_delete BEFORE DELETE ON bil_service_credit_rule
BEGIN SELECT RAISE(ABORT, 'bil_append_only: không xoá dấu Trả sau theo dịch vụ — gỡ dấu'); END;
CREATE TRIGGER bil_service_credit_rule_close_only BEFORE UPDATE ON bil_service_credit_rule
WHEN OLD.valid_to IS NOT NULL OR NEW.valid_to IS NULL OR NEW.id IS NOT OLD.id OR NEW.target_kind IS NOT OLD.target_kind OR NEW.target_code IS NOT OLD.target_code
  OR NEW.due_hours IS NOT OLD.due_hours OR NEW.grace_hours IS NOT OLD.grace_hours OR NEW.valid_from IS NOT OLD.valid_from
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dấu Trả sau theo dịch vụ chỉ được gỡ một lần'); END;

-- View công bố cho module khác (chỉ dòng mở): `orders` không đọc `bil_*` thẳng.
CREATE VIEW v_bil_service_credit_rule AS
  SELECT target_kind, target_code, due_hours, grace_hours, valid_from FROM bil_service_credit_rule WHERE valid_to IS NULL;
