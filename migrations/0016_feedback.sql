-- Migration 0016 — Góp ý / Báo lỗi (module feedback). Spec: docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md. Chỉ THÊM.
-- Số 0013–0015 chừa cho B5/v1.0; wrangler áp mọi file chưa áp nên khoảng trống không sao.

CREATE TABLE fbk_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO fbk_kind (code, name, sort_order) VALUES ('BUG', 'Báo lỗi', 1), ('IDEA', 'Đề xuất', 2), ('QUESTION', 'Câu hỏi', 3);

CREATE TABLE fbk_status (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO fbk_status (code, name, sort_order) VALUES
  ('NEW', 'Mới', 1), ('ACK', 'Đã tiếp nhận', 2), ('IN_PROGRESS', 'Đang xử lý', 3), ('DONE', 'Đã xong', 4), ('DECLINED', 'Từ chối', 5);

CREATE TABLE fbk_ticket (
  id                   TEXT PRIMARY KEY,
  seq                  INTEGER NOT NULL UNIQUE CHECK (seq >= 1),                          -- mã người đọc YC-0007 tính từ đây (feedbackCode)
  kind_code            TEXT NOT NULL REFERENCES fbk_kind(code),
  status_code          TEXT NOT NULL REFERENCES fbk_status(code),
  title                TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  context              TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(context) AND length(context) <= 2000),   -- do trình duyệt gửi: KHÔNG đáng tin, đã lọc khoá ở rules.ts
  submitter_id         TEXT NOT NULL,                                                     -- WHO: không khoá ngoại (ADR-0002/N1)
  assignee_id          TEXT,
  client_request_id    TEXT NOT NULL CHECK (length(client_request_id) = 36),              -- UUID do thiết bị sinh: chống gửi trùng khi mạng yếu
  resolved_in          TEXT CHECK (resolved_in IS NULL OR length(resolved_in) <= 40),     -- mã bản dựng đã sửa (tuỳ chọn)
  submitter_seen_at    TEXT,                                                              -- mốc người gửi đã xem lần cuối (chấm đỏ)
  admin_seen_at        TEXT,                                                              -- mốc admin đã xem lần cuối (dùng chung mọi admin ở v1)
  last_activity_at     TEXT NOT NULL,
  last_public_reply_at TEXT,                                                              -- phản hồi/đổi trạng thái người gửi thấy được
  notified_at          TEXT,                                                              -- NULL = chưa gửi được email cho admin
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT
);
CREATE UNIQUE INDEX fbk_ticket_request_uq ON fbk_ticket(submitter_id, client_request_id);
CREATE INDEX fbk_ticket_activity_ix ON fbk_ticket(last_activity_at DESC);
CREATE INDEX fbk_ticket_submitter_ix ON fbk_ticket(submitter_id, created_at);

CREATE TABLE fbk_message (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES fbk_ticket(id),
  author_id  TEXT NOT NULL,                                                               -- WHO: không khoá ngoại
  body       TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
  internal   INTEGER NOT NULL DEFAULT 0 CHECK (internal IN (0, 1)),                       -- 1 = ghi chú nội bộ, chỉ admin thấy
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE INDEX fbk_message_ticket_ix ON fbk_message(ticket_id, created_at);
CREATE INDEX fbk_message_author_ix ON fbk_message(author_id, created_at);
