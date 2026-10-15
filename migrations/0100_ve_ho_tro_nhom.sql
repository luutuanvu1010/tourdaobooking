-- Migration 0100 — Vé hỗ trợ đợt 1 (ADR-0119). Spec: docs/superpowers/specs/2026-10-14-ve-ho-tro-design.md. Chỉ THÊM; không sửa 0016_*.
-- Phiếu và tin cũ vào nhóm Kỹ thuật bằng GIÁ TRỊ MẶC ĐỊNH HẰNG (ADD COLUMN NOT NULL của SQLite chỉ nhận mặc định là hằng), không viết lại dòng nào.
-- Cột team_id KHÔNG dùng REFERENCES trong ADD COLUMN (SQLite buộc mặc định NULL khi có khoá ngoại); toàn vẹn do trigger dưới đây giữ.

CREATE TABLE fbk_team (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE CHECK (code = upper(code) AND length(code) BETWEEN 1 AND 40),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 300),
  sensitive   INTEGER NOT NULL DEFAULT 0 CHECK (sensitive IN (0, 1)),   -- 1 = tiêu đề/nội dung không ra nhật ký và email chung (ADR-0119 điều 4)
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO fbk_team (id, code, name, description, sensitive, sort_order, created_at, updated_at) VALUES
  ('fbk-team-ky-thuat', 'KY_THUAT',  'Kỹ thuật',  'Lỗi và đề xuất về Nền tảng',                  0, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
  ('fbk-team-ke-toan',  'KE_TOAN',   'Kế toán',   'Thu chi, công nợ, hoá đơn',                    1, 2, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
  ('fbk-team-nhan-su',  'NHAN_SU',   'Nhân sự',   'Tài khoản, hồ sơ nhân viên, chế độ',           1, 3, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
  ('fbk-team-dieu-hanh','DIEU_HANH', 'Điều hành', 'Điều xe, lịch chuyến, việc vận hành hằng ngày', 0, 4, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z');

CREATE TABLE fbk_team_member (
  id            TEXT PRIMARY KEY,
  team_id       TEXT NOT NULL REFERENCES fbk_team(id),
  staff_id      TEXT NOT NULL,                                          -- WHO: không khoá ngoại (ADR-0002/N1)
  role          TEXT NOT NULL CHECK (role IN ('LEAD', 'MEMBER')),
  valid_from_at TEXT NOT NULL,
  valid_to_at   TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE UNIQUE INDEX fbk_team_member_open_uq ON fbk_team_member(team_id, staff_id) WHERE valid_to_at IS NULL;
CREATE INDEX fbk_team_member_staff_ix ON fbk_team_member(staff_id) WHERE valid_to_at IS NULL;

ALTER TABLE fbk_ticket  ADD COLUMN team_id TEXT NOT NULL DEFAULT 'fbk-team-ky-thuat';
ALTER TABLE fbk_message ADD COLUMN team_id TEXT NOT NULL DEFAULT 'fbk-team-ky-thuat';   -- nhóm đã viết tin; chỉ có nghĩa với ghi chú nội bộ
CREATE INDEX fbk_ticket_team_ix ON fbk_ticket(team_id, last_activity_at DESC);

CREATE TRIGGER fbk_ticket_team_ins BEFORE INSERT ON fbk_ticket
WHEN NOT EXISTS (SELECT 1 FROM fbk_team WHERE id = NEW.team_id)
BEGIN SELECT RAISE(ABORT, 'Phiếu phải thuộc một nhóm hỗ trợ có thật.'); END;
CREATE TRIGGER fbk_ticket_team_upd BEFORE UPDATE OF team_id ON fbk_ticket
WHEN NOT EXISTS (SELECT 1 FROM fbk_team WHERE id = NEW.team_id)
BEGIN SELECT RAISE(ABORT, 'Phiếu phải thuộc một nhóm hỗ trợ có thật.'); END;
CREATE TRIGGER fbk_message_team_ins BEFORE INSERT ON fbk_message
WHEN NOT EXISTS (SELECT 1 FROM fbk_team WHERE id = NEW.team_id)
BEGIN SELECT RAISE(ABORT, 'Tin phải gắn với một nhóm hỗ trợ có thật.'); END;

CREATE TABLE fbk_ticket_event (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES fbk_ticket(id),
  type       TEXT NOT NULL CHECK (type IN ('TEAM_CHANGED', 'ASSIGNED', 'CLAIMED')),
  from_value TEXT,
  to_value   TEXT,
  actor_id   TEXT NOT NULL,
  at         TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),   -- cột kiểm toán ADR-0003; có mặc định để lệnh ghi không phải điền
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT
);
CREATE INDEX fbk_ticket_event_ticket_ix ON fbk_ticket_event(ticket_id, at);
CREATE TRIGGER fbk_ticket_event_no_upd BEFORE UPDATE ON fbk_ticket_event BEGIN SELECT RAISE(ABORT, 'Sự kiện phiếu chỉ thêm, không sửa.'); END;
CREATE TRIGGER fbk_ticket_event_no_del BEFORE DELETE ON fbk_ticket_event BEGIN SELECT RAISE(ABORT, 'Sự kiện phiếu chỉ thêm, không xoá.'); END;

-- Mốc đã xem RIÊNG từng người (thay admin_seen_at dùng chung; cột cũ thành cột chết từ 0100, gỡ ở lần phát hành sau).
CREATE TABLE fbk_ticket_read (
  ticket_id TEXT NOT NULL REFERENCES fbk_ticket(id),
  staff_id  TEXT NOT NULL,
  seen_at   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),   -- cột kiểm toán ADR-0003; có mặc định để lệnh ghi không phải điền
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT,
  PRIMARY KEY (ticket_id, staff_id)
);
CREATE INDEX fbk_ticket_read_staff_ix ON fbk_ticket_read(staff_id);
