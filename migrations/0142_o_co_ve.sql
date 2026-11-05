-- ADR-0174: ô «Có vé» theo dịch vụ hoặc nhóm. Khuôn `ord_service_confirm_flag` (0119): CHỈ THÊM, dòng hiệu lực của từng (scope, code) = dòng có `valid_from_at` lớn nhất.
-- scope: SERVICE (mã dịch vụ) | GROUP (mã nhóm). has_ticket: 1 = Có vé, 0 = Không vé (ghi tường minh để dòng dịch vụ thắng nhóm). Luật xét ở src/shared/co-ve.ts.
CREATE TABLE ctl_service_ticket_flag (
  id             TEXT PRIMARY KEY,
  scope          TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP')),
  code           TEXT NOT NULL,
  has_ticket     INTEGER NOT NULL CHECK (has_ticket IN (0, 1)),
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (scope, code, valid_from_at)
);
CREATE TRIGGER ctl_service_ticket_flag_no_update BEFORE UPDATE ON ctl_service_ticket_flag
BEGIN SELECT RAISE(ABORT, 'ctl_service_ticket_flag_append_only: ô Có vé chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ctl_service_ticket_flag_no_delete BEFORE DELETE ON ctl_service_ticket_flag
BEGIN SELECT RAISE(ABORT, 'ctl_service_ticket_flag_append_only: ô Có vé không xoá'); END;

-- View công bố: giá trị hiện hành của từng ô.
CREATE VIEW v_ctl_service_ticket_flag AS
  SELECT f.scope, f.code, f.has_ticket FROM ctl_service_ticket_flag f
  WHERE f.valid_from_at = (SELECT max(g.valid_from_at) FROM ctl_service_ticket_flag g WHERE g.scope = f.scope AND g.code = f.code);

-- ADR-0174 Đ5: giá trị ban đầu. Mã đang có lô chờ hoặc đang hoạt động là Có vé, để cảnh báo đúng không mất ngày đầu. Lô VOID không tính: lô từng cấp không bao giờ thành VOID.
INSERT INTO ctl_service_ticket_flag (id, scope, code, has_ticket, valid_from_at, created_at, created_by, updated_at, updated_by)
  SELECT lower(hex(randomblob(16))), 'SERVICE', m.catalog_code, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
  FROM (SELECT DISTINCT catalog_code FROM vdt_batch WHERE status IN ('PENDING', 'ACTIVE')) m;
